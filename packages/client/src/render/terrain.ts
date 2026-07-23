import {
  CHEST_TILES,
  CHUNK_SIZE,
  Detail,
  Tile,
  diagWallInfo,
  hashCoords,
  nearestFloorTile,
  tileDef,
  valueNoise,
} from '@devcraft/shared';
import { chamferRect, facetCircle } from './shapes.js';
import type { WoodSkin } from './woodSkins.js';

/**
 * ORGANIC terrain rendering. Tiles are authored on a grid but the grid
 * must disappear on screen: material regions are contoured on the dual
 * grid (marching squares over tile corners), then every edge crossing
 * slides along its edge by a deterministic world-keyed hash and every
 * boundary run bows into a quadratic curve. Nature never cuts a 45°
 * chamfer — roads wander, meadows bite into sand, shorelines meander.
 * Masonry still may: layers with wobble 0 keep ruler-straight cuts
 * (stone plazas, wood floors), so man-made ground reads deliberate
 * while wild ground flows.
 *
 * Where two materials meet they BLEND, the way hand-drawn transition
 * tiles do: a worn shade band just inside the edge, grass tufts
 * overhanging the boundary, and crumbs of the material scattered out
 * onto the turf. Ground shading comes from low-frequency noise — big
 * soft meadows, no checkerboard.
 *
 * All jitter is keyed on WORLD tile coordinates, so the same curve
 * falls out of every chunk bake, every resolution tier, and the live
 * shoreline pass — geometry agrees everywhere by construction.
 */

export type GroundSampler = (tx: number, ty: number) => number | undefined;
export type DetailSampler = (tx: number, ty: number) => number;
export type ElevSampler = (tx: number, ty: number) => number;

// ---------------------------------------------------------------- palette

const GRASS_TONES = ['#5c8941', '#588440', '#608e45', '#55813e'];
const CAVE_TONES = ['#5a5468', '#554f62', '#5f5870'];

interface BlobLayer {
  /** Does this ground id belong to the layer? */
  match: (t: number) => boolean;
  color: (t: number, tx: number, ty: number) => string;
  /**
   * Contour wobble amplitude in tiles. 0 = ruler-straight 45° cuts
   * (masonry: cut stone, laid planks); >0 = organic meander (nature).
   */
  wobble: number;
  /** Worn shade band just inside the region edge, or null for none. */
  band: string | null;
  /** Turf creeps over this material's edge where it borders grass. */
  fringe: boolean;
}

/** Region-scale two-tone variation — smooth patches, never per-tile. */
function patch(base: string, alt: string, tx: number, ty: number, salt: number): string {
  return valueNoise(salt, tx * 0.09, ty * 0.09) > 0.55 ? alt : base;
}

/** Painted lowest → highest; later layers' rounding overlaps earlier. */
const BLOB_LAYERS: BlobLayer[] = [
  {
    match: (t) => t === Tile.Dirt,
    color: (_t, tx, ty) => patch('#96744c', '#8f6e47', tx, ty, 31),
    wobble: 0.22,
    band: 'rgba(70, 50, 30, 0.3)',
    fringe: true,
  },
  {
    // Tilled garden soil: dug by hand — near-straight edges, a deep
    // worked-earth band. All crop stages resolve to this material.
    match: (t) => t === Tile.Tilled,
    color: (_t, tx, ty) => patch('#6b4f33', '#654a30', tx, ty, 43),
    wobble: 0.08,
    band: 'rgba(38, 26, 16, 0.4)',
    fringe: true,
  },
  {
    match: (t) => t === Tile.Swamp,
    color: () => '#556b3e',
    wobble: 0.24,
    band: 'rgba(30, 42, 24, 0.35)',
    fringe: true,
  },
  {
    match: (t) => t === Tile.Path,
    color: (_t, tx, ty) => patch('#c2a26e', '#bc9d69', tx, ty, 33),
    wobble: 0.2,
    band: 'rgba(105, 78, 44, 0.3)',
    fringe: true,
  },
  {
    match: (t) => t === Tile.Sand,
    color: (_t, tx, ty) => patch('#ddc98d', '#d6c286', tx, ty, 35),
    wobble: 0.2,
    band: 'rgba(158, 128, 74, 0.32)',
    fringe: true,
  },
  {
    // Hand-laid flagstone: a light wobble — tighter than wild ground,
    // looser than a laser cut.
    match: (t) => t === Tile.StoneFloor,
    color: (_t, tx, ty) => patch('#a09aa8', '#99939f', tx, ty, 37),
    wobble: 0.11,
    band: 'rgba(40, 34, 56, 0.28)',
    fringe: true,
  },
  {
    match: (t) => t === Tile.WoodFloor || t === Tile.Bridge,
    color: (_t, tx, ty) => patch('#a87e46', '#a37943', tx, ty, 39),
    wobble: 0,
    band: 'rgba(58, 40, 22, 0.3)',
    fringe: false,
  },
  {
    match: (t) => t === Tile.CaveFloor || t === Tile.PortalDown || t === Tile.PortalUp,
    color: (_t, tx, ty) => patch(CAVE_TONES[0]!, CAVE_TONES[1]!, tx, ty, 41),
    wobble: 0.18,
    band: 'rgba(18, 14, 28, 0.35)',
    fringe: false,
  },
  {
    match: (t) => t === Tile.Snow,
    color: () => '#e9edf3',
    wobble: 0.22,
    band: 'rgba(150, 166, 200, 0.3)',
    fringe: true,
  },
  {
    // Knee-deep shallows: the sunlit wading rim of every water body.
    // Lighter and greener than open water so "walkable" reads at a
    // glance; the live shoreline draws its waterline — no baked band.
    match: (t) => t === Tile.WaterShallow,
    color: (_t, tx, ty) => patch('#649cc0', '#5f96ba', tx, ty, 45),
    wobble: 0.14,
    band: null,
    fringe: false,
  },
  {
    // Open water. Its band is the DEPTH SHELF — the underwater shade
    // step where the wadeable rim drops away into swimming water.
    match: (t) => t === Tile.Water || t === Tile.FishingSpot,
    color: () => '#4979b8',
    wobble: 0.14,
    band: 'rgba(24, 44, 84, 0.3)',
    fringe: false,
  },
  {
    match: (t) => t === Tile.WaterDeep,
    color: () => '#3a629e',
    wobble: 0.2,
    band: 'rgba(24, 42, 80, 0.4)',
    fringe: false,
  },
];

/**
 * Layer index of the OUTERMOST water skin (the shallows) — the live
 * shoreline traces this layer's organic contour, which is the true
 * land|water boundary now that every body of water wears a wading rim.
 */
const WATER_LI = BLOB_LAYERS.findIndex((l) => l.match(Tile.WaterShallow));

const GRASS_LIKE = new Set<number>([
  Tile.Grass,
  Tile.GrassTall,
  Tile.Tree,
  Tile.TreeOak,
  Tile.TreeWillow,
  Tile.TreeYew,
  Tile.Stump,
  Tile.Fence,
  Tile.Campfire,
  Tile.BerryBush,
  Tile.FibrePlant,
  Tile.WildSagewort,
  Tile.WildMoonbell,
]);

/**
 * The soil family: a tilled plot and every crop growth stage share ONE
 * ground material, so a field contours as a single dug bed — no seams
 * between a plot and the plant standing in it.
 */
export const SOIL_TILES = new Set<number>([
  Tile.Tilled,
  Tile.CropSprout,
  Tile.CarrotMid,
  Tile.CarrotRipe,
  Tile.SagewortMid,
  Tile.SagewortRipe,
  Tile.SunflowerMid,
  Tile.SunflowerRipe,
  Tile.WheatMid,
  Tile.WheatRipe,
  Tile.CottonMid,
  Tile.CottonRipe,
  Tile.MoonbellMid,
  Tile.MoonbellRipe,
]);

const ROCKY = new Set<number>([
  Tile.Rock,
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockSilver,
  Tile.RockMithril,
  Tile.RockAdamant,
  Tile.RockObsidian,
  Tile.RockStarfall,
  Tile.RockDepleted,
]);

/** What lies visually beneath objects that sit on the ground. */
function isCaveGround(t: number | undefined): boolean {
  return (
    t === Tile.CaveWall ||
    t === Tile.CaveFloor ||
    t === Tile.PortalDown ||
    t === Tile.PortalUp
  );
}

// ---------------------------------------------------------------- baking

/** Effective ground for blob purposes: objects show what's under them. */
function effectiveGround(ground: GroundSampler): GroundSampler {
  const g = (tx: number, ty: number): number => {
    const t = ground(tx, ty);
    if (t === undefined) return Tile.Grass;
    // Docks: the SKIN under a deck is the water it spans — organic
    // contours, depth bands and shorelines all flow beneath the
    // boards; the deck itself is painted by drawDocks, raised.
    if (t === Tile.Bridge && isDockTile(ground, tx, ty)) {
      return dockUnderWater(ground, tx, ty);
    }
    if (GRASS_LIKE.has(t)) return Tile.Grass;
    if (SOIL_TILES.has(t)) return Tile.Tilled;
    if (ROCKY.has(t)) {
      // Rocks sit on whatever region they're in.
      return isCaveGround(ground(tx, ty + 1)) || isCaveGround(ground(tx, ty - 1))
        ? Tile.CaveFloor
        : neighborsStone(ground, tx, ty)
          ? Tile.StoneFloor
          : Tile.Grass;
    }
    if (t === Tile.Furnace || t === Tile.Anvil) {
      return isCaveGround(ground(tx, ty + 1)) ? Tile.CaveFloor : nearestFloor(ground, tx, ty);
    }
    if (
      t === Tile.Workbench ||
      t === Tile.BankChest ||
      t === Tile.ShopCounter ||
      t === Tile.LampPost ||
      t === Tile.Alembic ||
      t === Tile.TanningRack ||
      t === Tile.Loom ||
      t === Tile.CarvingBench ||
      t === Tile.EnchantingTable ||
      CHEST_TILES.has(t)
    ) {
      return nearestFloor(ground, tx, ty);
    }
    // A 45° wall corner: the crown and face cover the MASS triangle,
    // but the OPEN triangle always faces the exterior — the ground
    // under it is whatever the exterior-side diagonal neighbour
    // carries, so terrain skins flow beneath the cut instead of
    // leaving a bald patch of base meadow.
    const dw = diagWallInfo(t);
    if (dw) {
      const [dx, dy] =
        dw.mass === 'NE' ? [-1, 1] : dw.mass === 'NW' ? [1, 1] : dw.mass === 'SE' ? [-1, -1] : [1, -1];
      const nt = ground(tx + dx, ty + dy);
      return nt === undefined || tileDef(nt).solid ? Tile.Grass : nt;
    }
    // Floors run UNDER walls: the prism covers its own tile, and the
    // floor skin meeting the wall base edge-on leaves no gap to peek
    // through beside it.
    if (t === Tile.WallWood || t === Tile.WallWoodWindow) return Tile.WoodFloor;
    if (t === Tile.WallStone || t === Tile.WallStoneWindow) return Tile.StoneFloor;
    if (t === Tile.CaveWall) return Tile.CaveFloor;
    // Walk-through structure: the ground continues under the frame —
    // a doorway's threshold carries the room's floor to the outside.
    if (
      t === Tile.DoorwayWood ||
      t === Tile.DoorwayStone ||
      t === Tile.DoorwayWoodWide ||
      t === Tile.DoorwayStoneWide ||
      // Shut doors keep their threshold floor — the leaf swings over
      // the same ground the open doorway carries.
      t === Tile.DoorwayWoodShut ||
      t === Tile.DoorwayStoneShut ||
      t === Tile.DoorwayWoodWideShut ||
      t === Tile.DoorwayStoneWideShut ||
      t === Tile.ArchStone ||
      t === Tile.PillarStone ||
      t === Tile.RailWood
    ) {
      return nearestFloor(ground, tx, ty);
    }
    // Props stand ON a floor, they aren't ground materials themselves.
    if (t >= Tile.Barrel && t <= Tile.Basin) return nearestFloor(ground, tx, ty);
    // Stairs read as stone; the bespoke step prop draws over it.
    if (t === Tile.Ramp) return Tile.StoneFloor;
    if (t === Tile.Cliff) return Tile.StoneFloor;
    return t;
  };
  return g;
}

/**
 * GUTTER LAW: chunk bakes carry a margin of real neighbor content on
 * every side, and the renderer blits from the inset source rect.
 * Scaled drawImage filtering samples beyond the source rect at its
 * edges — against a bare canvas edge that blend pulls in TRANSPARENT
 * pixels and paints a hairline dark seam along every chunk boundary.
 * With a gutter the kernel lands on true world content instead. The
 * painters already draw world-keyed content past the chunk bounds
 * (the canvas merely clipped it), so the gutter costs only pixels.
 */
export function bakeGutter(px: number): number {
  return Math.max(4, px >> 3);
}

export function bakeChunk(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  woodSkin?: WoodSkinSampler,
): HTMLCanvasElement {
  const G = bakeGutter(px);
  const canvas = document.createElement('canvas');
  canvas.width = CHUNK_SIZE * px + G * 2;
  canvas.height = CHUNK_SIZE * px + G * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(G, G);
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  const g = effectiveGround(ground);

  // 1. Meadow base: large soft noise patches, no per-tile checker.
  const cell = Math.max(4, Math.floor(px / 4));
  for (let y = -G; y < CHUNK_SIZE * px + G; y += cell) {
    for (let x = -G; x < CHUNK_SIZE * px + G; x += cell) {
      ctx.fillStyle = meadowTone(baseX + x / px, baseY + y / px);
      ctx.fillRect(x, y, cell, cell);
    }
  }
  // Dark band chunks get a cave-rock base instead.
  if (baseY >= 512) {
    ctx.fillStyle = '#2e2938';
    ctx.fillRect(-G, -G, canvas.width, canvas.height);
  }

  // 2. Material skins, lowest to highest, contoured on the dual grid.
  drawLayerSkins(ctx, g, baseX, baseY, px);

  // 2b. Ground under raised OR sunken terrain: the lifted surfaces and
  // cliff faces cover almost all of it, but any sliver that survives a
  // seam must read as shadowed rock — never sunny grass peeking out
  // from inside a mountain, and a pit mouth reads as darkness before
  // its floor paints over it.
  fillMask(
    ctx,
    (tx, ty) => elev(tx, ty) !== 0,
    baseX,
    baseY,
    px,
    '#282334',
  );

  // 3. Wood-floor plank seams (subtle, flat).
  drawPlanks(ctx, g, baseX, baseY, px, woodSkin);

  // 4. Baked micro-details (static ones only; swaying ones are live).
  // One tile of margin so flecks straddling a chunk edge reach into
  // the gutter — the neighbor bakes the identical fleck at the same
  // world position, so both sides agree.
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      // Raised/sunken tiles' details belong to their lifted layer.
      if (elev(tx, ty) !== 0) continue;
      drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px, detail, g);
    }
  }

  // 5. Docks: raised decks over the water painted LAST, so the deck's
  // lifted top (which reaches into the north neighbor's cell) covers
  // that neighbor's water details instead of wearing them.
  drawDocks(ctx, ground, baseX, baseY, px);

  return canvas;
}

/** Weathered board tones for dock decks — hash-dealt per board. */
const DOCK_TONES = ['#9c7a4a', '#92714a', '#a5834f', '#8a683c'];

/**
 * THE DOCK PASS. Every dock tile paints, bottom to top:
 *
 *   standing shadow on the water south of it (the mass hangs OVER the
 *   surface) → paired PILES driven into the water with FLAT-law
 *   waterline collars → the south FASCIA (the deck's visible
 *   thickness: side-on board, joist shade at the foot, catch-light on
 *   the lip) → the plank DECK riding DOCK_LIFT above the ground, with
 *   boards running ACROSS the walk direction and tones keyed by row
 *   alone so a two-tile-wide jetty reads as continuous boards, never
 *   tiles → a perimeter stroke on EXPOSED edges only (the
 *   architecture outline law — no seams inside a run).
 *
 * Connectivity is by raw Bridge neighbors, so runs merge; everything
 * is world-keyed, so chunk seams and resolution tiers agree.
 */
function drawDocks(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  const liftB = Math.round((DOCK_LIFT / FLAT) * px);
  const seam = Math.max(1, px * 0.02);
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      if (!isDockTile(ground, tx, ty)) continue;
      const gx = lx * px;
      const gy = ly * px;
      const hasN = ground(tx, ty - 1) === Tile.Bridge;
      const hasS = ground(tx, ty + 1) === Tile.Bridge;
      const hasE = ground(tx + 1, ty) === Tile.Bridge;
      const hasW = ground(tx - 1, ty) === Tile.Bridge;
      const southWater = isWaterTile(ground(tx, ty + 1));

      // Standing shadow: two stepped bands, flat-art AO.
      if (!hasS) {
        ctx.fillStyle = 'rgba(20, 34, 62, 0.26)';
        ctx.fillRect(gx, gy + px, px, px * 0.2);
        ctx.fillStyle = 'rgba(20, 34, 62, 0.12)';
        ctx.fillRect(gx, gy + px + px * 0.2, px, px * 0.18);
      }
      // Root contact shadow: where the deck steps up off dry land, a
      // thin shade at the threshold grounds the structure on the shore.
      const northT = ground(tx, ty - 1);
      if (!hasN && northT !== undefined && !isWaterTile(northT)) {
        ctx.fillStyle = 'rgba(30, 22, 12, 0.22)';
        ctx.fillRect(gx, gy - liftB - px * 0.05, px, px * 0.05);
      }

      // Piles: the legs the whole structure stands on.
      if (!hasS && southWater) {
        for (const fpos of [0.18, 0.82]) {
          const pxl = gx + fpos * px - px * 0.055;
          const pw = px * 0.11;
          const top = gy + px - liftB * 0.25;
          const bot = gy + px + px * 0.14;
          ctx.fillStyle = '#4e3a22';
          ctx.fillRect(pxl, top, pw, bot - top);
          ctx.fillStyle = '#77593a'; // sun-law lit west edge
          ctx.fillRect(pxl, top, Math.max(1, pw * 0.3), bot - top);
          ctx.strokeStyle = 'rgba(226, 240, 251, 0.5)';
          ctx.lineWidth = Math.max(1.2, px * 0.03);
          ctx.beginPath();
          ctx.ellipse(pxl + pw / 2, bot, pw * 0.85, pw * 0.85 * FLAT, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // South fascia: the deck's thickness made visible.
      if (!hasS) {
        ctx.fillStyle = '#6d5130';
        ctx.fillRect(gx, gy + px - liftB, px, liftB);
        const joist = Math.max(1.5, liftB * 0.22);
        ctx.fillStyle = 'rgba(30, 19, 9, 0.45)';
        ctx.fillRect(gx, gy + px - joist, px, joist);
        ctx.fillStyle = 'rgba(214, 178, 120, 0.28)';
        ctx.fillRect(gx, gy + px - liftB, px, Math.max(1, px * 0.02));
      }

      // The deck itself, lifted. Dark underlay first — the gaps
      // between boards read as shadowed seams.
      const dy0 = gy - liftB;
      const vertRun = hasN || hasS || (!hasE && !hasW);
      ctx.fillStyle = '#5a4326';
      ctx.fillRect(gx, dy0, px, px);
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        const hh = vertRun ? hashCoords(137, ty * 8 + r, 0) : hashCoords(139, tx * 8 + r, 0);
        ctx.fillStyle = DOCK_TONES[hh % 4]!;
        if (vertRun) ctx.fillRect(gx, dy0 + (r / rows) * px, px, px / rows - seam);
        else ctx.fillRect(gx + (r / rows) * px, dy0, px / rows - seam, px);
      }
      // Staggered butt joints where boards meet along a run.
      ctx.fillStyle = 'rgba(40, 26, 14, 0.5)';
      for (let r = 0; r < rows; r++) {
        const hh = hashCoords(141, (vertRun ? ty : tx) * 8 + r, vertRun ? tx : ty);
        if (hh % 3 !== 0) continue;
        const at = 0.25 + ((hh >>> 4) % 50) / 100;
        if (vertRun) ctx.fillRect(gx + at * px, dy0 + (r / rows) * px, seam, px / rows - seam);
        else ctx.fillRect(gx + (r / rows) * px, dy0 + at * px, px / rows - seam, seam);
      }

      // Perimeter stroke, exposed edges only.
      ctx.strokeStyle = 'rgba(42, 28, 14, 0.85)';
      ctx.lineWidth = Math.max(1.5, px * 0.045);
      ctx.beginPath();
      if (!hasN) {
        ctx.moveTo(gx, dy0);
        ctx.lineTo(gx + px, dy0);
      }
      if (!hasS) {
        ctx.moveTo(gx, dy0 + px);
        ctx.lineTo(gx + px, dy0 + px);
      }
      if (!hasW) {
        ctx.moveTo(gx, dy0);
        ctx.lineTo(gx, dy0 + px);
      }
      if (!hasE) {
        ctx.moveTo(gx + px, dy0);
        ctx.lineTo(gx + px, dy0 + px);
      }
      ctx.stroke();
    }
  }
}

/**
 * Material grain + static micro-props for one tile: sparse deterministic
 * flecks so the ground carries the same detail density as the props
 * above it. Shared by the base and lifted-terrain bakes.
 */
function drawTileDetail(
  ctx: CanvasRenderingContext2D,
  m: number,
  d: number,
  tx: number,
  ty: number,
  lx: number,
  ly: number,
  px: number,
  dAt?: (x: number, y: number) => number,
  gAt?: (x: number, y: number) => number | undefined,
): void {
  const hg = hashCoords(83, tx, ty);
  const gx = lx * px;
  const gy = ly * px;
  // Tilled soil overrides any old grass detail (a plot dug over a
  // flowered meadow must not keep phantom blooms) and gets furrows.
  if (m === Tile.Tilled) {
    d = Detail.None;
    // Hand-dug furrow courses running east-west: broken runs of dark
    // groove dashes with the odd sunlit crumb on the ridge shoulder —
    // worked earth, never planks (continuous full-width bands with a
    // hard highlight read as decking; measured and rejected). Course
    // lines sit at fixed tile fractions so a plot reads as continuous
    // rows, but every dash wobbles and the runs stay ragged.
    const soilW = gAt !== undefined && gAt(tx - 1, ty) === Tile.Tilled;
    const soilE = gAt !== undefined && gAt(tx + 1, ty) === Tile.Tilled;
    const minX = gx + (soilW ? -px * 0.05 : px * 0.07);
    const maxX = gx + px - (soilE ? -px * 0.05 : px * 0.07);
    for (let r = 0; r < 3; r++) {
      const baseY = gy + px * (0.16 + r * 0.3);
      for (let seg = 0; seg < 4; seg++) {
        const hh = hashCoords(97 + r * 7 + seg, tx, ty);
        let sx = gx + (seg / 4) * px - px * 0.04;
        const sw = px * (0.2 + (hh % 5) * 0.032);
        let ex = sx + sw;
        sx = Math.max(minX, sx);
        ex = Math.min(maxX, ex);
        if (ex <= sx) continue;
        const sy = baseY + (((hh >> 4) % 5) - 2) * px * 0.014;
        ctx.fillStyle = 'rgba(30, 20, 11, 0.42)';
        ctx.fillRect(sx, sy, ex - sx, Math.max(1.5, px * 0.075));
        if ((hh & 3) === 0) {
          ctx.fillStyle = 'rgba(196, 152, 100, 0.3)';
          ctx.fillRect(sx + (ex - sx) * 0.2, sy - px * 0.05, (ex - sx) * 0.4, Math.max(1, px * 0.035));
        }
      }
    }
    // Turned clods: chunky lumps with a dark seat and a sunlit cap —
    // the spade's leavings, scattered off the course lines.
    for (let k = 0; k < 3; k++) {
      const hh = hashCoords(191 + k, tx, ty);
      const cx = gx + (0.08 + (hh % 78) / 100) * px;
      const cy = gy + (0.06 + ((hh >> 7) % 80) / 100) * px;
      const cw = px * (0.05 + ((hh >> 3) % 4) * 0.013);
      ctx.fillStyle = 'rgba(30, 20, 11, 0.5)';
      ctx.fillRect(cx - cw * 0.14, cy + cw * 0.28, cw * 1.25, cw * 0.7);
      ctx.fillStyle = hh & 1 ? '#8a6a45' : '#7d5f3d';
      ctx.fillRect(cx, cy, cw, cw * 0.78);
      ctx.fillStyle = 'rgba(214, 175, 122, 0.4)';
      ctx.fillRect(cx + cw * 0.1, cy, cw * 0.55, cw * 0.24);
    }
    // The odd pale stone the spade turned up.
    if (hg % 5 === 0) {
      const hh = hashCoords(211, tx, ty);
      ctx.fillStyle = '#8d867c';
      ctx.fillRect(
        gx + (0.15 + (hh % 60) / 100) * px,
        gy + (0.12 + ((hh >> 6) % 65) / 100) * px,
        px * 0.055,
        px * 0.04,
      );
    }
  }
      if (m === Tile.WaterShallow) {
        // The sandbed shows through: pale submerged flecks and the odd
        // sunken stone. Seeing the bottom IS the walkability cue — deep
        // water stays featureless. Lift-only (floor law): bed detail is
        // never darker than the water or it reads as holes.
        const n = 2 + (hg % 3);
        for (let k = 0; k < n; k++) {
          const hh = hashCoords(223 + k, tx, ty);
          const sx = gx + ((hh % 90) / 100) * px;
          const sy = gy + (((hh >>> 7) % 90) / 100) * px;
          ctx.fillStyle = hh & 1 ? 'rgba(219, 229, 210, 0.14)' : 'rgba(168, 200, 214, 0.2)';
          ctx.fillRect(sx, sy, Math.max(1, px * 0.06), Math.max(1, px * 0.045));
        }
        if (hg % 4 === 0) {
          const hh = hashCoords(227, tx, ty);
          const sx = gx + (0.12 + (hh % 70) / 100) * px;
          const sy = gy + (0.12 + ((hh >>> 6) % 70) / 100) * px;
          const w = px * (0.09 + ((hh >>> 3) % 3) * 0.02);
          // A drowned pebble: pale slate, a wet-light cap.
          ctx.fillStyle = '#79a7c4';
          ctx.beginPath();
          ctx.ellipse(sx, sy, w, w * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(200, 221, 230, 0.5)';
          ctx.beginPath();
          ctx.ellipse(sx - w * 0.15, sy - w * 0.2, w * 0.5, w * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (m === Tile.Grass || m === Tile.GrassTall) {
        // Baked turf stubble: static vertical flecks, dark and sunlit,
        // so the ground under the live blades reads as dense mown grass
        // instead of flat paint. Costs nothing — baked once per chunk.
        const n = 3 + (hg % 3);
        for (let k = 0; k < n; k++) {
          const hh = hashCoords(101 + k, tx, ty);
          const sx = gx + ((hh % 88) / 100) * px;
          const sy = gy + (((hh >> 7) % 88) / 100) * px;
          const stub = px * (0.05 + ((hh >> 3) % 4) * 0.014);
          // Floor law: turf detail is never DARKER than the ground —
          // dark flecks read as holes. Two grades of lighter green only.
          ctx.fillStyle = hh & 1 ? 'rgba(148, 178, 96, 0.18)' : 'rgba(215, 227, 140, 0.15)';
          ctx.fillRect(sx, sy - stub, Math.max(1, px * 0.045), stub);
        }
      }
      if (m === Tile.StoneFloor && hg % 3 === 0) {
        ctx.fillStyle = 'rgba(28, 24, 42, 0.09)';
        ctx.fillRect(gx + ((hg >> 3) % 60) / 100 * px, gy + ((hg >> 8) % 60) / 100 * px, px * 0.16, px * 0.05);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(gx + ((hg >> 5) % 60) / 100 * px, gy + ((hg >> 11) % 60) / 100 * px, px * 0.1, px * 0.04);
      } else if (m === Tile.Path) {
        if (hg % 4 === 0) {
          ctx.fillStyle = 'rgba(94, 70, 40, 0.18)';
          for (let k = 0; k < 2; k++) {
            const hh = hashCoords(89 + k, tx, ty);
            ctx.fillRect(gx + (hh % 70) / 100 * px, gy + ((hh >> 7) % 70) / 100 * px, px * 0.06, px * 0.05);
          }
        }
        // Weeds breaking through the packed dirt: a road that gets
        // walked, not printed. Sparse opaque tufts, never at the same
        // spot twice.
        if (hg % 7 === 2) {
          const hh = hashCoords(163, tx, ty);
          const wx0 = gx + (0.15 + (hh % 60) / 100) * px;
          const wy0 = gy + (0.2 + ((hh >> 7) % 60) / 100) * px;
          const tone = meadowTone(tx, ty);
          for (let bl = 0; bl < 2 + (hh % 2); bl++) {
            const hb = hashCoords(167 + bl, tx, ty);
            const bx = wx0 + ((hb % 100) / 100 - 0.5) * px * 0.16;
            const lean = (((hb >> 5) % 100) / 100 - 0.5) * 0.6;
            const tall = px * (0.08 + ((hb >> 9) % 100) / 100 * 0.06);
            ctx.fillStyle = hb & 1 ? tone : '#79a556';
            ctx.beginPath();
            ctx.moveTo(bx - px * 0.024, wy0);
            ctx.lineTo(bx + px * 0.024, wy0);
            ctx.lineTo(bx + lean * tall, wy0 - tall);
            ctx.closePath();
            ctx.fill();
          }
        }
        // The odd embedded stone worn smooth by feet.
        if (hg % 9 === 4) {
          const hh = hashCoords(173, tx, ty);
          ctx.fillStyle = hh & 1 ? '#ab9a76' : '#9f8e6c';
          const sx = gx + (0.2 + (hh % 55) / 100) * px;
          const sy = gy + (0.2 + ((hh >> 6) % 55) / 100) * px;
          const r = px * (0.035 + ((hh >> 11) % 3) * 0.012);
          ctx.beginPath();
          ctx.ellipse(sx, sy, r * 1.3, r, ((hh >> 3) % 7) * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (m === Tile.Sand && hg % 3 === 0) {
        ctx.fillStyle = 'rgba(150, 116, 62, 0.2)';
        for (let k = 0; k < 3; k++) {
          const hh = hashCoords(97 + k, tx, ty);
          ctx.fillRect(gx + (hh % 80) / 100 * px, gy + ((hh >> 7) % 80) / 100 * px, px * 0.04, px * 0.04);
        }
      } else if (m === Tile.CaveFloor && hg % 5 === 0) {
        ctx.strokeStyle = 'rgba(20, 16, 32, 0.22)';
        ctx.lineWidth = Math.max(1, px * 0.03);
        ctx.beginPath();
        ctx.moveTo(gx + (hg % 50) / 100 * px, gy + ((hg >> 6) % 60) / 100 * px);
        ctx.lineTo(gx + ((hg % 50) + 30) / 100 * px, gy + (((hg >> 6) % 60) + 25) / 100 * px);
        ctx.stroke();
      }
      // Moss creeping between flagstones — old towns, not showrooms.
      if (m === Tile.StoneFloor && hg % 11 === 5) {
        const hh = hashCoords(179, tx, ty);
        ctx.fillStyle = 'rgba(96, 138, 70, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
          gx + (0.2 + (hh % 60) / 100) * px,
          gy + (0.2 + ((hh >> 6) % 60) / 100) * px,
          px * (0.05 + ((hh >> 11) % 3) * 0.02),
          px * 0.04,
          ((hh >> 3) % 7) * 0.45,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      if (d === Detail.Pebbles) {
        // Angular stone chips, rotated apart so they never tile.
        const h = hashCoords(29, tx, ty);
        ctx.fillStyle = '#8b8494';
        for (const [ox, oy, pw, rot] of [
          [0.4, 0.55, 0.16, 0.4],
          [0.62, 0.38, 0.11, -0.5],
        ] as const) {
          ctx.save();
          ctx.translate(lx * px + px * ox, ly * px + px * oy);
          ctx.rotate(rot + (h % 7) * 0.1);
          ctx.beginPath();
          chamferRect(ctx, (-pw / 2) * px, (-pw * 0.4) * px, pw * px, pw * 0.8 * px, pw * px * 0.3);
          ctx.fill();
          ctx.restore();
        }
      } else if (d === Detail.Mushroom) {
        // Trapezoid cap — a faceted little roof.
        const mx = lx * px + px * 0.5;
        const my = ly * px + px * 0.55;
        ctx.fillStyle = '#efe3c2';
        ctx.fillRect(mx - px * 0.035, my - px * 0.02, px * 0.07, px * 0.14);
        ctx.fillStyle = '#c65b52';
        ctx.beginPath();
        ctx.moveTo(mx - px * 0.13, my - px * 0.02);
        ctx.lineTo(mx - px * 0.07, my - px * 0.11);
        ctx.lineTo(mx + px * 0.07, my - px * 0.11);
        ctx.lineTo(mx + px * 0.13, my - px * 0.02);
        ctx.closePath();
        ctx.fill();
      } else if (d === Detail.Rug) {
        // A woven rug: bound border with selvedge ticks, knotted
        // fringe off the two loom ends, and a hash-dealt motif —
        // medallion, kilim bands, or diamond lattice — so a town's
        // rugs read as sisters from one loom, never uniforms.
        // MERGE LAW: adjacent Rug tiles weave into ONE great hall rug
        // — border/fringe only on free edges, pattern and palette
        // keyed to the block's NW anchor so every tile agrees.
        const isRug = (x: number, y: number) => dAt?.(x, y) === Detail.Rug;
        const jn = isRug(tx, ty - 1);
        const je = isRug(tx + 1, ty);
        const js = isRug(tx, ty + 1);
        const jw = isRug(tx - 1, ty);
        if (jn || je || js || jw) {
          let ax = tx;
          while (isRug(ax - 1, ty)) ax--;
          let ay = ty;
          while (isRug(tx, ay - 1)) ay--;
          const ha = hashCoords(211, ax, ay);
          const [bord, field, accent] = RUG_PALETTES[ha % RUG_PALETTES.length]!;
          const x0 = gx + (jw ? 0 : px * 0.06);
          const x1 = gx + (je ? px : px * 0.94);
          const y0 = gy + (jn ? 0 : px * 0.09);
          const y1 = gy + (js ? px : px * 0.91);
          if (!js) {
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(x0 + px * 0.01, y1, x1 - x0 - px * 0.02, px * 0.025);
          }
          ctx.fillStyle = bord;
          ctx.beginPath();
          chamferRect(ctx, x0, y0, x1 - x0, y1 - y0, [
            jn || jw ? 0 : px * 0.045,
            jn || je ? 0 : px * 0.045,
            js || je ? 0 : px * 0.045,
            js || jw ? 0 : px * 0.045,
          ]);
          ctx.fill();
          // Field runs through joined edges; the border band survives
          // only on the rug's true rim.
          ctx.fillStyle = field;
          ctx.fillRect(
            jw ? gx : x0 + px * 0.09,
            jn ? gy : y0 + px * 0.085,
            (je ? gx + px : x1 - px * 0.09) - (jw ? gx : x0 + px * 0.09),
            (js ? gy + px : y1 - px * 0.085) - (jn ? gy : y0 + px * 0.085),
          );
          // Pattern that repeats per tile so neighbors join: kilim
          // bands or a diamond lattice, dealt by the anchor.
          if (ha & 4) {
            ctx.fillStyle = accent;
            ctx.fillRect(x0 + (jw ? 0 : px * 0.11), gy + px * 0.24, (x1 - x0) - (jw ? 0 : px * 0.11) - (je ? 0 : px * 0.11), px * 0.07);
            ctx.fillRect(x0 + (jw ? 0 : px * 0.11), gy + px * 0.69, (x1 - x0) - (jw ? 0 : px * 0.11) - (je ? 0 : px * 0.11), px * 0.07);
            ctx.fillStyle = bord;
            ctx.fillRect(x0 + (jw ? 0 : px * 0.11), gy + px * 0.42, (x1 - x0) - (jw ? 0 : px * 0.11) - (je ? 0 : px * 0.11), px * 0.16);
            ctx.fillStyle = accent;
            for (let k = 0; k < 3; k++) {
              const tx2 = gx + px * (0.14 + k * 0.3);
              ctx.beginPath();
              ctx.moveTo(tx2, gy + px * 0.55);
              ctx.lineTo(tx2 + px * 0.07, gy + px * 0.45);
              ctx.lineTo(tx2 + px * 0.14, gy + px * 0.55);
              ctx.closePath();
              ctx.fill();
            }
          } else {
            for (let r2 = 0; r2 < 2; r2++) {
              for (let c3 = 0; c3 < 2; c3++) {
                const dx0 = gx + px * (0.28 + c3 * 0.44);
                const dy0 = gy + px * (0.3 + r2 * 0.4);
                ctx.fillStyle = (r2 + c3 + tx + ty) % 2 === 0 ? accent : bord;
                ctx.beginPath();
                ctx.moveTo(dx0, dy0 - px * 0.085);
                ctx.lineTo(dx0 + px * 0.11, dy0);
                ctx.lineTo(dx0, dy0 + px * 0.085);
                ctx.lineTo(dx0 - px * 0.11, dy0);
                ctx.closePath();
                ctx.fill();
              }
            }
          }
          // Weave sheen carried across the whole cloth.
          ctx.fillStyle = 'rgba(240, 232, 210, 0.05)';
          for (let k = 0; k < 4; k++) {
            ctx.fillRect(x0 + px * 0.03, gy + px * (0.14 + k * 0.22), x1 - x0 - px * 0.06, px * 0.014);
          }
          // Selvedge ticks on free N/S rims, fringe off free E/W ends.
          ctx.fillStyle = 'rgba(240, 232, 210, 0.26)';
          for (let k = 0; k < 5; k++) {
            const fx2 = gx + px * (0.12 + k * 0.19);
            if (!jn) ctx.fillRect(fx2, y0 + px * 0.026, px * 0.05, px * 0.022);
            if (!js) ctx.fillRect(fx2, y1 - px * 0.048, px * 0.05, px * 0.022);
          }
          ctx.fillStyle = '#d8c9a0';
          for (let k = 0; k < 7; k++) {
            const fy2 = gy + px * (0.08 + k * 0.13);
            if (!jw) ctx.fillRect(x0 - px * 0.05, fy2, px * 0.05, px * 0.024);
            if (!je) ctx.fillRect(x1, fy2 + px * 0.012, px * 0.05, px * 0.024);
          }
          return;
        }
        const hh = hashCoords(211, tx, ty);
        const [bord, field, accent] = RUG_PALETTES[hh % RUG_PALETTES.length]!;
        const rx = gx + px * 0.06;
        const ry = gy + px * 0.09;
        const rw = px * 0.88;
        const rh = px * 0.82;
        // A whisper of ground shadow seats the cloth on the boards.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
        ctx.fillRect(rx + px * 0.01, ry + rh, rw - px * 0.02, px * 0.025);
        ctx.fillStyle = bord;
        ctx.beginPath();
        chamferRect(ctx, rx, ry, rw, rh, px * 0.045);
        ctx.fill();
        // Selvedge ticks worked along the long edges.
        ctx.fillStyle = 'rgba(240, 232, 210, 0.26)';
        for (let k = 0; k < 6; k++) {
          ctx.fillRect(rx + rw * (0.12 + k * 0.15), ry + px * 0.026, px * 0.05, px * 0.022);
          ctx.fillRect(rx + rw * (0.12 + k * 0.15), ry + rh - px * 0.048, px * 0.05, px * 0.022);
        }
        ctx.fillStyle = field;
        ctx.beginPath();
        chamferRect(ctx, rx + px * 0.09, ry + px * 0.095, rw - px * 0.18, rh - px * 0.19, px * 0.035);
        ctx.fill();
        const cx = rx + rw / 2;
        const cy = ry + rh / 2;
        const motif = (hh >> 4) % 3;
        if (motif === 0) {
          // Stepped medallion with corner blocks.
          const diamond = (r: number, tone: string) => {
            ctx.fillStyle = tone;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * 1.3, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r * 1.3, cy);
            ctx.closePath();
            ctx.fill();
          };
          diamond(px * 0.2, bord);
          diamond(px * 0.13, accent);
          diamond(px * 0.05, field);
          ctx.fillStyle = accent;
          for (const [ox, oy] of [
            [0.14, 0.16],
            [0.78, 0.16],
            [0.14, 0.72],
            [0.78, 0.72],
          ] as const) {
            ctx.fillRect(rx + rw * ox, ry + rh * oy, px * 0.07, px * 0.07);
          }
        } else if (motif === 1) {
          // Kilim bands: flat stripes, teeth on the center one.
          ctx.fillStyle = accent;
          ctx.fillRect(rx + px * 0.11, cy - px * 0.2, rw - px * 0.22, px * 0.075);
          ctx.fillRect(rx + px * 0.11, cy + px * 0.125, rw - px * 0.22, px * 0.075);
          ctx.fillStyle = bord;
          ctx.fillRect(rx + px * 0.11, cy - px * 0.055, rw - px * 0.22, px * 0.11);
          ctx.fillStyle = accent;
          for (let k = 0; k < 5; k++) {
            const tx2 = rx + rw * (0.16 + k * 0.155);
            ctx.beginPath();
            ctx.moveTo(tx2, cy + px * 0.045);
            ctx.lineTo(tx2 + px * 0.05, cy - px * 0.045);
            ctx.lineTo(tx2 + px * 0.1, cy + px * 0.045);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // A quiet lattice of small diamonds.
          for (let r2 = 0; r2 < 2; r2++) {
            for (let c3 = 0; c3 < 3; c3++) {
              const dx0 = rx + rw * (0.26 + c3 * 0.24);
              const dy0 = ry + rh * (0.34 + r2 * 0.32);
              ctx.fillStyle = (r2 + c3) % 2 === 0 ? accent : bord;
              ctx.beginPath();
              ctx.moveTo(dx0, dy0 - px * 0.075);
              ctx.lineTo(dx0 + px * 0.095, dy0);
              ctx.lineTo(dx0, dy0 + px * 0.075);
              ctx.lineTo(dx0 - px * 0.095, dy0);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
        // Weave sheen: faint weft lines carried across everything.
        ctx.fillStyle = 'rgba(240, 232, 210, 0.05)';
        for (let k = 0; k < 4; k++) {
          ctx.fillRect(rx + px * 0.05, ry + rh * (0.18 + k * 0.21), rw - px * 0.1, px * 0.014);
        }
        // Knotted fringe off the loom ends.
        ctx.fillStyle = '#d8c9a0';
        for (let k = 0; k < 7; k++) {
          const fy2 = ry + rh * (0.05 + k * 0.14);
          ctx.fillRect(rx - px * 0.05, fy2, px * 0.05, px * 0.024);
          ctx.fillRect(rx + rw, fy2 + px * 0.012, px * 0.05, px * 0.024);
        }
      } else if (d === Detail.RugRound) {
        // A round hearth rug: bound rim, stitched spoke ring, and an
        // eight-point compass star at the heart.
        const hh = hashCoords(223, tx, ty);
        const [bord, field, accent] = RUG_PALETTES[hh % RUG_PALETTES.length]!;
        const cx = gx + px * 0.5;
        const cy = gy + px * 0.5;
        ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + px * 0.43, px * 0.36, px * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bord;
        ctx.beginPath();
        facetCircle(ctx, cx, cy, px * 0.45, 10, 0.2);
        ctx.fill();
        ctx.fillStyle = field;
        ctx.beginPath();
        facetCircle(ctx, cx, cy, px * 0.355, 10, 0.2);
        ctx.fill();
        // Radial stitch ticks around the binding.
        ctx.fillStyle = 'rgba(240, 232, 210, 0.28)';
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + 0.31;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * px * 0.4, cy + Math.sin(a) * px * 0.4);
          ctx.rotate(a);
          ctx.fillRect(-px * 0.032, -px * 0.012, px * 0.064, px * 0.024);
          ctx.restore();
        }
        // The eight-point star, long arms on the cardinals.
        ctx.fillStyle = accent;
        for (const [rot, arm] of [
          [0, 0.24],
          [Math.PI / 4, 0.155],
        ] as const) {
          for (let k = 0; k < 4; k++) {
            const a = rot + (k * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * px * arm, cy + Math.sin(a) * px * arm);
            ctx.lineTo(cx + Math.cos(a + 2.1) * px * 0.055, cy + Math.sin(a + 2.1) * px * 0.055);
            ctx.lineTo(cx + Math.cos(a - 2.1) * px * 0.055, cy + Math.sin(a - 2.1) * px * 0.055);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.fillStyle = bord;
        ctx.beginPath();
        facetCircle(ctx, cx, cy, px * 0.045, 6, 0.3);
        ctx.fill();
      } else if (d === Detail.Doormat) {
        // A bound coir mat: woven crosshatch inside a stitched edge,
        // its middle scuffed pale by every boot that ever crossed it.
        const mx = gx + px * 0.14;
        const my = gy + px * 0.24;
        const mw = px * 0.72;
        const mh = px * 0.52;
        ctx.fillStyle = 'rgba(18, 12, 26, 0.14)';
        ctx.fillRect(mx + px * 0.01, my + mh, mw - px * 0.02, px * 0.02);
        ctx.fillStyle = '#87713e';
        ctx.beginPath();
        chamferRect(ctx, mx, my, mw, mh, px * 0.035);
        ctx.fill();
        ctx.fillStyle = '#b09a64';
        ctx.fillRect(mx + px * 0.045, my + px * 0.045, mw - px * 0.09, mh - px * 0.09);
        // The weave: soft coir courses, not a grate.
        ctx.strokeStyle = 'rgba(94, 74, 40, 0.28)';
        ctx.lineWidth = Math.max(1, px * 0.02);
        for (const fy of [0.4, 0.52, 0.64] as const) {
          ctx.beginPath();
          ctx.moveTo(mx + px * 0.05, gy + px * fy);
          ctx.lineTo(mx + mw - px * 0.05, gy + px * fy);
          ctx.stroke();
        }
        for (let k = 0; k < 4; k++) {
          const vx = mx + px * (0.14 + k * 0.15);
          ctx.beginPath();
          ctx.moveTo(vx, my + px * 0.06);
          ctx.lineTo(vx, my + mh - px * 0.06);
          ctx.stroke();
        }
        // Boot-worn pale patch, off-centre toward the door.
        ctx.fillStyle = 'rgba(240, 232, 210, 0.16)';
        ctx.beginPath();
        ctx.ellipse(mx + mw * 0.52, my + mh * 0.48, mw * 0.26, mh * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (d === Detail.Sawdust) {
        // Workshop grime: pale shaving flecks drifted into a patch.
        ctx.fillStyle = 'rgba(216, 192, 142, 0.4)';
        for (let k = 0; k < 6; k++) {
          const hh = hashCoords(227 + k, tx, ty);
          ctx.fillRect(
            gx + (0.1 + (hh % 75) / 100) * px,
            gy + (0.1 + ((hh >> 7) % 75) / 100) * px,
            px * (0.05 + ((hh >> 3) % 3) * 0.02),
            px * 0.04,
          );
        }
      } else if (d === Detail.Straw) {
        // Scattered straw: short angled stalks, stable-floor yellow.
        for (let k = 0; k < 5; k++) {
          const hh = hashCoords(229 + k, tx, ty);
          ctx.fillStyle = hh & 1 ? '#d9b95c' : '#c4a34a';
          ctx.save();
          ctx.translate(gx + (0.12 + (hh % 70) / 100) * px, gy + (0.15 + ((hh >> 7) % 70) / 100) * px);
          ctx.rotate((((hh >> 4) % 100) / 100 - 0.5) * 1.6);
          ctx.fillRect(-px * 0.09, -px * 0.015, px * 0.18, px * 0.03);
          ctx.restore();
        }
      }
}

/** Rug colorways: [border, field, accent] — deep, cloth-dyed, never neon. */
const RUG_PALETTES: ReadonlyArray<readonly [string, string, string]> = [
  ['#6e3440', '#96586a', '#d8a054'],
  ['#35526e', '#54789c', '#c9b26e'],
  ['#44603a', '#67875a', '#c47f4a'],
  ['#6e5a2e', '#9c8452', '#8a3d3d'],
  ['#5a3a62', '#7e5a88', '#c9962e'],
  ['#704038', '#9c6450', '#d8c9a0'],
];

/**
 * Bake the LIFTED terrain surface of one chunk at one elevation level:
 * every tile at `level` or higher (ramps excluded — they get bespoke
 * stair props) painted with the full material-skin pipeline, clipped to
 * a marching-squares contour so the plateau top has the same crisp
 * 45°-cut coastline as every other material — then finished with a
 * sunlit brink line along the rim. The renderer draws this canvas
 * shifted UP by level·ELEV_H and y-sorted, which is what makes the
 * plateau a solid mass you can walk behind.
 */
export interface ElevatedBake {
  canvas: HTMLCanvasElement;
  /** Chunk rows (local ly) containing any lifted content at this level. */
  rows: boolean[];
}

export function bakeElevated(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  level: number,
): ElevatedBake | null {
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;
  // Ramps count as mass, matching the cliff-face contour EXACTLY: the
  // flight repaints its own tile top-to-base after this band, so the
  // crown never shows through — but the shared silhouette means no
  // pinched notch above a stair, and the crown edge lands flush on the
  // faces beside it.
  const member = (tx: number, ty: number): boolean => elev(tx, ty) >= level;

  const rows: boolean[] = new Array(CHUNK_SIZE).fill(false);
  let any = false;
  if (level > 0) {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        if (member(baseX + lx, baseY + ly)) {
          rows[ly] = true;
          any = true;
        }
      }
    }
  } else {
    // LEVELS ≤ 0 — the pit law. Membership (elev >= level) covers
    // nearly the whole chunk, but the flat base blit already paints
    // everything far from a pit; emitting rows there would turn all
    // ordinary ground into per-row draw items. So a row participates
    // only near a sunken tile: the pit rows themselves (the floor and
    // the annulus whose crown contour rims the hole) plus SINK_SPILL
    // rows south — a floor at −2 draws shifted 2·ELEV_H down-screen,
    // and the level-0 rows south of the pit must repaint over that
    // spill or the hole would smear across flat ground. The scan uses
    // the world-space sampler: a pit hugging the chunk's north seam
    // still claims this chunk's spill rows.
    const SINK_SPILL = 6;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      let near = false;
      for (let wy = baseY + ly - SINK_SPILL; wy <= baseY + ly + 1 && !near; wy++) {
        for (let lx = -1; lx <= CHUNK_SIZE && !near; lx++) {
          if (elev(baseX + lx, wy) < 0) near = true;
        }
      }
      if (near) {
        rows[ly] = true;
        any = true;
      }
    }
  }
  if (!any) return null;

  // Same gutter as the base bake (see bakeGutter): the row-slice blits
  // sample real content instead of a transparent canvas edge. The
  // crown contour cells already reach half a tile past the chunk, so
  // the margin content exists without widening any contour loop.
  const G = bakeGutter(px);
  const canvas = document.createElement('canvas');
  canvas.width = CHUNK_SIZE * px + G * 2;
  canvas.height = CHUNK_SIZE * px + G * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(G, G);

  // The plateau-top silhouette, contoured between tile centers.
  // Cells touching a stair of THIS level turn with square corners
  // (quadrant rects) — a beveled crown would overhang the flight's
  // column with no face beneath it. Must match collectCliffFaces.
  const ownRamp = (tx: number, ty: number): boolean =>
    ground(tx, ty) === Tile.Ramp && elev(tx, ty) === level;
  const nearStair = (i: number, j: number): boolean =>
    ownRamp(baseX + i - 1, baseY + j - 1) ||
    ownRamp(baseX + i, baseY + j - 1) ||
    ownRamp(baseX + i, baseY + j) ||
    ownRamp(baseX + i - 1, baseY + j);
  const path = new Path2D();
  const maskAt = (i: number, j: number): number =>
    (member(baseX + i - 1, baseY + j - 1) ? 1 : 0) |
    (member(baseX + i, baseY + j - 1) ? 2 : 0) |
    (member(baseX + i, baseY + j) ? 4 : 0) |
    (member(baseX + i - 1, baseY + j) ? 8 : 0);
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask = maskAt(i, j);
      if (mask === 0) continue;
      if (nearStair(i, j)) maskQuadrants(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
      else maskPolygon(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
    }
  }

  // Cliff crowns and stairs read as the surface they carry.
  const gInner = (tx: number, ty: number): number | undefined => {
    const t = ground(tx, ty);
    if (t === Tile.Cliff || t === Tile.Ramp) {
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]] as const) {
        const t2 = ground(tx + dx, ty + dy);
        if (
          t2 !== undefined &&
          t2 !== Tile.Cliff &&
          t2 !== Tile.Ramp &&
          elev(tx + dx, ty + dy) >= level
        ) {
          return t2;
        }
      }
      return Tile.StoneFloor;
    }
    return t;
  };
  const g = effectiveGround(gInner);

  ctx.save();
  ctx.clip(path);

  // Meadow base under the skins, same recipe as the ground floor.
  const cell = Math.max(4, Math.floor(px / 4));
  for (let y = -G; y < CHUNK_SIZE * px + G; y += cell) {
    for (let x = -G; x < CHUNK_SIZE * px + G; x += cell) {
      ctx.fillStyle = meadowTone(baseX + x / px, baseY + y / px);
      ctx.fillRect(x, y, cell, cell);
    }
  }
  drawLayerSkins(ctx, g, baseX, baseY, px);
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      if (!member(tx, ty)) continue;
      drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px, detail, g);
    }
  }
  ctx.restore();

  // The rim SHOULDER: a chunky bordered edge along the whole crown
  // contour — the exposed-rock lip every classic cliff tileset gives
  // its edges. This is what makes a level change read as a ledge on
  // ALL sides, including the north back edge and east/west edges that
  // are edge-on to the camera (where the wall face itself is nearly
  // invisible). Layered strokes clipped to the crown: only the inner
  // half of each stroke shows, so the band sits entirely on top.
  const rim = new Path2D();
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask = maskAt(i, j);
      if (mask === 0 || mask === 15) continue;
      const segs = nearStair(i, j) ? contourSegsSquare(mask) : contourSegs(mask);
      for (const [x0, y0, x1, y1] of segs) {
        rim.moveTo((i + x0) * px, (j + y0) * px);
        rim.lineTo((i + x1) * px, (j + y1) * px);
      }
    }
  }
  ctx.save();
  ctx.clip(path);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Soft shade band fading in from the edge (inner ~0.26 tile).
  ctx.strokeStyle = 'rgba(45, 38, 58, 0.18)';
  ctx.lineWidth = px * 0.52;
  ctx.stroke(rim);
  // Rock shoulder: the worn stone border itself (inner ~0.16 tile).
  ctx.strokeStyle = 'rgba(74, 67, 88, 0.5)';
  ctx.lineWidth = px * 0.32;
  ctx.stroke(rim);
  // Dark crease just inside the lip (inner ~0.08 tile).
  ctx.strokeStyle = 'rgba(28, 22, 40, 0.35)';
  ctx.lineWidth = px * 0.16;
  ctx.stroke(rim);
  // Sunlit lip at the very edge.
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.3)';
  ctx.lineWidth = Math.max(2, px * 0.07);
  ctx.stroke(rim);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.restore();

  return { canvas, rows };
}

/**
 * Contour segments of a marching-squares cell in cell-local units
 * (edge midpoints at ±0.5 around the cell center at 0,0).
 */
function contourSegs(mask: number): Array<[number, number, number, number]> {
  const T: [number, number] = [0, -0.5];
  const R: [number, number] = [0.5, 0];
  const B: [number, number] = [0, 0.5];
  const L: [number, number] = [-0.5, 0];
  const seg = (a: [number, number], b: [number, number]): [number, number, number, number] =>
    [a[0], a[1], b[0], b[1]];
  switch (mask) {
    case 1: case 14: return [seg(T, L)];
    case 2: case 13: return [seg(T, R)];
    case 4: case 11: return [seg(R, B)];
    case 8: case 7: return [seg(L, B)];
    case 3: case 12: return [seg(L, R)];
    case 6: case 9: return [seg(T, B)];
    case 5: return [seg(T, R), seg(B, L)];
    default: return [seg(T, L), seg(R, B)]; // 10
  }
}

/**
 * Square-corner contour of a marching-squares cell: a boundary piece
 * exists wherever two adjacent quadrants differ in membership. Cell-
 * local units matching contourSegs (center at 0,0, edge midpoints ±0.5).
 */
function contourSegsSquare(mask: number): Array<[number, number, number, number]> {
  const bit = (b: number): boolean => (mask & b) !== 0;
  const out: Array<[number, number, number, number]> = [];
  if (bit(1) !== bit(2)) out.push([0, -0.5, 0, 0]);
  if (bit(8) !== bit(4)) out.push([0, 0, 0, 0.5]);
  if (bit(1) !== bit(8)) out.push([-0.5, 0, 0, 0]);
  if (bit(2) !== bit(4)) out.push([0, 0, 0.5, 0]);
  return out;
}

/**
 * Square-corner variant of maskPolygon: one quadrant rect per set
 * corner bit. Used for cells touching a stair, where a beveled corner
 * would encroach on the flight's column.
 */
function maskQuadrants(
  ctx: CanvasRenderingContext2D | Path2D,
  mask: number,
  x0: number,
  y0: number,
  size: number,
): void {
  const m = size / 2;
  if (mask & 1) ctx.rect(x0, y0, m, m);
  if (mask & 2) ctx.rect(x0 + m, y0, m, m);
  if (mask & 4) ctx.rect(x0 + m, y0 + m, m, m);
  if (mask & 8) ctx.rect(x0, y0 + m, m, m);
}

/** Fill the marching-squares union of `member` tiles with one color. */
function fillMask(
  ctx: CanvasRenderingContext2D,
  member: (tx: number, ty: number) => boolean,
  baseX: number,
  baseY: number,
  px: number,
  color: string,
): void {
  const path = new Path2D();
  let any = false;
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask =
        (member(baseX + i - 1, baseY + j - 1) ? 1 : 0) |
        (member(baseX + i, baseY + j - 1) ? 2 : 0) |
        (member(baseX + i, baseY + j) ? 4 : 0) |
        (member(baseX + i - 1, baseY + j) ? 8 : 0);
      if (mask === 0) continue;
      any = true;
      maskPolygon(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
    }
  }
  if (!any) return;
  ctx.fillStyle = color;
  ctx.fill(path);
}

function neighborsStone(ground: GroundSampler, tx: number, ty: number): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (ground(tx + dx, ty + dy) === Tile.StoneFloor) return true;
  }
  return false;
}

function nearestFloor(ground: GroundSampler, tx: number, ty: number): number {
  // The law lives in shared/tiles now: the server reveals THIS floor
  // when a prop standing here is smashed, so bake and reveal agree.
  return nearestFloorTile(ground, tx, ty);
}

/** Which skin layer a tile belongs to, or -1 for the grass base. */
function layerIndexOf(t: number): number {
  for (let i = 0; i < BLOB_LAYERS.length; i++) {
    if (BLOB_LAYERS[i]!.match(t)) return i;
  }
  return -1;
}

// ------------------------------------------------- organic contours

type Pt = [number, number];

/**
 * One boundary run through a dual cell: a quadratic curve from a to b
 * with control point c, all in WORLD tile coordinates. `ox, oy` is the
 * unit outward direction (away from the material), `pair` identifies
 * which edge pair the run connects (stable hash key), and `I, J` are
 * the dual cell's world coordinates.
 */
interface Bnd {
  ax: number; ay: number;
  cx: number; cy: number;
  bx: number; by: number;
  ox: number; oy: number;
  pair: number;
  I: number; J: number;
}

const rnd01 = (seed: number, x: number, y: number): number =>
  hashCoords(seed, x, y) / 4294967296;

/**
 * Where the contour crosses a dual-cell edge, as a param 0..1 along
 * the edge. Keyed on the edge's world identity so the two cells
 * sharing the edge (and every chunk/tier/live pass) agree exactly.
 */
function crossT(li: number, wob: number, kx: number, ky: number, vert: number): number {
  if (wob === 0) return 0.5;
  return 0.5 + (rnd01(7717 + li * 131 + vert * 67, kx, ky) - 0.5) * 2 * wob;
}

/** Crossing point on one edge of dual cell (I, J). 0=T 1=R 2=B 3=L. */
function edgeCross(li: number, wob: number, I: number, J: number, edge: number): Pt {
  switch (edge) {
    case 0: return [I - 0.5 + crossT(li, wob, I - 1, J - 1, 0), J - 0.5];
    case 1: return [I + 0.5, J - 0.5 + crossT(li, wob, I, J - 1, 1)];
    case 2: return [I - 0.5 + crossT(li, wob, I - 1, J, 0), J + 0.5];
    default: return [I - 0.5, J - 0.5 + crossT(li, wob, I - 1, J - 1, 1)];
  }
}

/** Edge pairs: 0=T·L 1=T·R 2=R·B 3=B·L 4=L·R 5=T·B. */
function bndCurve(
  li: number,
  wob: number,
  I: number,
  J: number,
  pair: number,
  a: Pt,
  b: Pt,
  ox: number,
  oy: number,
): Bnd {
  let cx = (a[0] + b[0]) / 2;
  let cy = (a[1] + b[1]) / 2;
  if (wob > 0) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const d = (rnd01(8117 + li * 131 + pair * 29, I, J) - 0.5) * 2 * wob * len;
    cx += (-dy / len) * d;
    cy += (dx / len) * d;
  }
  return { ax: a[0], ay: a[1], cx, cy, bx: b[0], by: b[1], ox, oy, pair, I, J };
}

const RT2 = Math.SQRT1_2;

/**
 * The boundary runs of a marching-squares dual cell in world coords —
 * the single source of truth shared by the baked fills, the worn-edge
 * bands, the turf fringe, and the live shoreline.
 */
function boundaryCurvesFor(li: number, wob: number, I: number, J: number, mask: number): Bnd[] {
  if (mask === 0 || mask === 15) return [];
  const cT = edgeCross(li, wob, I, J, 0);
  const cR = edgeCross(li, wob, I, J, 1);
  const cB = edgeCross(li, wob, I, J, 2);
  const cL = edgeCross(li, wob, I, J, 3);
  const b = (pair: number, a: Pt, z: Pt, ox: number, oy: number): Bnd =>
    bndCurve(li, wob, I, J, pair, a, z, ox, oy);
  switch (mask) {
    case 1: return [b(0, cT, cL, RT2, RT2)];
    case 14: return [b(0, cT, cL, -RT2, -RT2)];
    case 2: return [b(1, cT, cR, -RT2, RT2)];
    case 13: return [b(1, cT, cR, RT2, -RT2)];
    case 4: return [b(2, cR, cB, -RT2, -RT2)];
    case 11: return [b(2, cR, cB, RT2, RT2)];
    case 8: return [b(3, cB, cL, RT2, -RT2)];
    case 7: return [b(3, cB, cL, -RT2, RT2)];
    case 3: return [b(4, cL, cR, 0, 1)];
    case 12: return [b(4, cL, cR, 0, -1)];
    case 9: return [b(5, cT, cB, 1, 0)];
    case 6: return [b(5, cT, cB, -1, 0)];
    // Diagonal bands: two runs, each facing its own excluded corner.
    case 5: return [b(1, cT, cR, RT2, -RT2), b(3, cB, cL, -RT2, RT2)];
    default: return [b(2, cR, cB, RT2, RT2), b(0, cT, cL, -RT2, -RT2)]; // 10
  }
}

/** Point on a boundary run's quadratic at param t. */
function qpoint(b: Bnd, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * b.ax + 2 * u * t * b.cx + t * t * b.bx,
    u * u * b.ay + 2 * u * t * b.cy + t * t * b.by,
  ];
}

/**
 * The filled region of a dual cell with organic boundaries. Cell edges
 * stay straight (interior — adjacent cells overlap seamlessly); the
 * boundary runs curve through the shared Bnd geometry.
 */
function organicCellPath(
  path: Path2D,
  li: number,
  wob: number,
  I: number,
  J: number,
  mask: number,
  bnds: Bnd[],
  toX: (wx: number) => number,
  toY: (wy: number) => number,
): void {
  const x0 = toX(I - 0.5);
  const y0 = toY(J - 0.5);
  const x1 = toX(I + 0.5);
  const y1 = toY(J + 0.5);
  if (mask === 15) {
    path.rect(x0, y0, x1 - x0, y1 - y0);
    return;
  }
  const cT = edgeCross(li, wob, I, J, 0);
  const cR = edgeCross(li, wob, I, J, 1);
  const cB = edgeCross(li, wob, I, J, 2);
  const cL = edgeCross(li, wob, I, J, 3);
  const M = (p: Pt): void => path.moveTo(toX(p[0]), toY(p[1]));
  const L = (p: Pt): void => path.lineTo(toX(p[0]), toY(p[1]));
  const Lc = (x: number, y: number): void => path.lineTo(x, y);
  // Quadratic to `end` through the stored control point — direction-
  // independent, so fill and band strokes trace identical geometry.
  const Q = (k: number, end: Pt): void => {
    const bd = bnds[k]!;
    path.quadraticCurveTo(toX(bd.cx), toY(bd.cy), toX(end[0]), toY(end[1]));
  };
  switch (mask) {
    case 1: M(cT); Q(0, cL); Lc(x0, y0); break;
    case 2: M(cT); Lc(x1, y0); L(cR); Q(0, cT); break;
    case 4: M(cR); Lc(x1, y1); L(cB); Q(0, cR); break;
    case 8: M(cL); Lc(x0, y1); L(cB); Q(0, cL); break;
    case 3: M(cL); Lc(x0, y0); Lc(x1, y0); L(cR); Q(0, cL); break;
    case 12: M(cL); Q(0, cR); Lc(x1, y1); Lc(x0, y1); break;
    case 9: M(cT); Q(0, cB); Lc(x0, y1); Lc(x0, y0); break;
    case 6: M(cT); Lc(x1, y0); Lc(x1, y1); L(cB); Q(0, cT); break;
    case 7: M(cL); Lc(x0, y0); Lc(x1, y0); Lc(x1, y1); L(cB); Q(0, cL); break;
    case 11: M(cR); Q(0, cB); Lc(x0, y1); Lc(x0, y0); Lc(x1, y0); L(cR); break;
    case 13: M(cT); Q(0, cR); Lc(x1, y1); Lc(x0, y1); Lc(x0, y0); L(cT); break;
    case 14: M(cT); Lc(x1, y0); Lc(x1, y1); Lc(x0, y1); L(cL); Q(0, cT); break;
    case 5: M(cT); Q(0, cR); Lc(x1, y1); L(cB); Q(1, cL); Lc(x0, y0); break;
    default: M(cR); Q(0, cB); Lc(x0, y1); L(cL); Q(1, cT); Lc(x1, y0); break; // 10
  }
  path.closePath();
}

/** The meadow's noise-driven grass tone at a world position. */
function meadowTone(wx: number, wy: number): string {
  const n =
    valueNoise(1234, wx * 0.055, wy * 0.055) * 0.7 +
    valueNoise(777, wx * 0.021, wy * 0.021) * 0.3;
  const idx = n < 0.38 ? 3 : n < 0.52 ? 1 : n < 0.72 ? 0 : 2;
  return GRASS_TONES[idx]!;
}

/**
 * Turf fringe where a material borders grass: tufts of blades leaning
 * over the boundary from the grass side, plus crumbs of the material
 * scattered out onto the turf — the two-way blend hand-drawn
 * transition tiles get for free.
 */
function drawGrassFringe(
  ctx: CanvasRenderingContext2D,
  bnd: Bnd,
  matColor: string,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
  px: number,
): void {
  const seed = 9313 + bnd.pair * 17;
  for (let k = 0; k < 3; k++) {
    const h = hashCoords(seed + k * 293, bnd.I, bnd.J);
    if (h % 100 < 42) continue;
    const t = 0.16 + k * 0.32 + ((h >> 6) % 100) / 100 * 0.18;
    const p = qpoint(bnd, Math.min(0.92, t));
    // Tuft roots just INSIDE the material so blades overhang the edge.
    const rx = p[0] - bnd.ox * 0.055;
    const ry = p[1] - bnd.oy * 0.055;
    const blades = 2 + ((h >> 9) % 3);
    const tone = meadowTone(rx, ry);
    for (let bl = 0; bl < blades; bl++) {
      const hb = hashCoords(seed + k * 293 + 31 * (bl + 1), bnd.I, bnd.J);
      const bx = toX(rx) + ((hb % 100) / 100 - 0.5) * px * 0.22;
      const by = toY(ry) + (((hb >> 7) % 100) / 100 - 0.5) * px * 0.1;
      const lean = (((hb >> 3) % 100) / 100 - 0.5) * 0.7;
      const tall = px * (0.1 + ((hb >> 11) % 100) / 100 * 0.09);
      const w = px * 0.05;
      ctx.fillStyle = hb & 1 ? tone : '#79a556';
      ctx.beginPath();
      ctx.moveTo(bx - w / 2, by);
      ctx.lineTo(bx + w / 2, by);
      ctx.lineTo(bx + lean * tall, by - tall);
      ctx.closePath();
      ctx.fill();
    }
    // Material crumbs spilling outward onto the grass.
    if ((h >> 4) % 3 !== 0) {
      ctx.fillStyle = matColor;
      const crumbs = 2 + ((h >> 13) % 2);
      for (let c = 0; c < crumbs; c++) {
        const hc = hashCoords(seed + k * 293 + 71 * (c + 1), bnd.I, bnd.J);
        const d = 0.07 + ((hc % 100) / 100) * 0.2;
        const along = (((hc >> 7) % 100) / 100 - 0.5) * 0.24;
        const sx = toX(p[0] + bnd.ox * d - bnd.oy * along);
        const sy = toY(p[1] + bnd.oy * d + bnd.ox * along);
        const r = px * (0.028 + ((hc >> 13) % 3) * 0.011);
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
    }
  }
}

/**
 * DUAL-GRID MARCHING SQUARES — the terrain skin.
 *
 * Regions are contoured from the corners BETWEEN tiles: each dual cell
 * (a square spanning four tile centers) looks at which of its corner
 * tiles belong to the layer and draws one of 16 polygons. Diagonal
 * steps in the tile data become clean 45° edges instead of staircases,
 * straight edges stay straight, and the grid disappears while the
 * geometry stays deliberately blocky.
 *
 * Layer membership is CUMULATIVE: a layer counts every tile whose
 * material paints ABOVE it as its own, so lower materials extend under
 * higher ones and the base can never peek through a boundary. Painted
 * lowest → highest, higher skins cover the underlap.
 */
function drawLayerSkins(
  ctx: CanvasRenderingContext2D,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  // Precompute the layer index of every tile touching this chunk once.
  const N = CHUNK_SIZE + 2;
  const idx = new Int8Array(N * N);
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      idx[lx + 1 + (ly + 1) * N] = layerIndexOf(g(baseX + lx, baseY + ly) ?? Tile.Grass);
    }
  }
  const at = (lx: number, ly: number): number => idx[lx + 1 + (ly + 1) * N]!;

  const toX = (wx: number): number => (wx - baseX) * px;
  const toY = (wy: number): number => (wy - baseY) * px;

  for (let li = 0; li < BLOB_LAYERS.length; li++) {
    const layer = BLOB_LAYERS[li]!;
    const wob = layer.wobble;
    const region = new Path2D();
    const bands = new Path2D();
    let hasBands = false;
    const fringe: Array<{ bnd: Bnd; color: string }> = [];
    for (let j = 0; j <= CHUNK_SIZE; j++) {
      for (let i = 0; i <= CHUNK_SIZE; i++) {
        // Corner tiles of this dual cell.
        const tl = at(i - 1, j - 1);
        const tr = at(i, j - 1);
        const br = at(i, j);
        const bl = at(i - 1, j);
        const mask =
          (tl >= li && tl !== -1 ? 1 : 0) |
          (tr >= li && tr !== -1 ? 2 : 0) |
          (br >= li && br !== -1 ? 4 : 0) |
          (bl >= li && bl !== -1 ? 8 : 0);
        if (mask === 0) continue;
        // Color from a corner that is truly of this layer if possible
        // (members-by-underlap sit above and will repaint themselves).
        let ctx2 = -1;
        let cty = -1;
        if (tl === li) { ctx2 = i - 1; cty = j - 1; }
        else if (tr === li) { ctx2 = i; cty = j - 1; }
        else if (bl === li) { ctx2 = i - 1; cty = j; }
        else if (br === li) { ctx2 = i; cty = j; }
        else { ctx2 = i; cty = j; }
        const I = baseX + i;
        const J = baseY + j;
        const bnds = boundaryCurvesFor(li, wob, I, J, mask);
        const cell = new Path2D();
        organicCellPath(cell, li, wob, I, J, mask, bnds, toX, toY);
        const col = layer.color(0, baseX + ctx2, baseY + cty);
        ctx.fillStyle = col;
        ctx.fill(cell);
        // Hairline same-color stroke kills antialiasing seams between
        // adjacent cells of one region.
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.8;
        ctx.stroke(cell);
        region.addPath(cell);
        for (const b of bnds) {
          bands.moveTo(toX(b.ax), toY(b.ay));
          bands.quadraticCurveTo(toX(b.cx), toY(b.cy), toX(b.bx), toY(b.by));
          hasBands = true;
          // Turf fringe wherever the outside of this run is base grass.
          if (layer.fringe && (tl === -1 || tr === -1 || br === -1 || bl === -1)) {
            fringe.push({ bnd: b, color: col });
          }
        }
      }
    }
    // Worn shade band settling the material into its edge: two strokes
    // clipped to the region so only the inner half shows.
    if (layer.band && hasBands) {
      ctx.save();
      ctx.clip(region);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = layer.band;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = px * 0.34;
      ctx.stroke(bands);
      ctx.globalAlpha = 1;
      ctx.lineWidth = px * 0.15;
      ctx.stroke(bands);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.restore();
    }
    for (const f of fringe) drawGrassFringe(ctx, f.bnd, f.color, toX, toY, px);
  }
}

/**
 * The 16 marching-squares cases as polygon subpaths. Corner bits:
 * TL=1, TR=2, BR=4, BL=8. Diagonal pairs draw a CONNECTED band so
 * touching-at-a-corner regions read as one flow, never a pinch.
 */
function maskPolygon(
  ctx: CanvasRenderingContext2D | Path2D,
  mask: number,
  x0: number,
  y0: number,
  size: number,
): void {
  const m = size / 2;
  const x1 = x0 + size;
  const y1 = y0 + size;
  const poly = (pts: number[][]): void => {
    ctx.moveTo(pts[0]![0]!, pts[0]![1]!);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k]![0]!, pts[k]![1]!);
    ctx.closePath();
  };
  switch (mask) {
    case 15: ctx.rect(x0, y0, size, size); break;
    case 1: poly([[x0, y0], [x0 + m, y0], [x0, y0 + m]]); break;
    case 2: poly([[x0 + m, y0], [x1, y0], [x1, y0 + m]]); break;
    case 4: poly([[x1, y0 + m], [x1, y1], [x0 + m, y1]]); break;
    case 8: poly([[x0, y0 + m], [x0 + m, y1], [x0, y1]]); break;
    case 3: ctx.rect(x0, y0, size, m); break;
    case 12: ctx.rect(x0, y0 + m, size, m); break;
    case 9: ctx.rect(x0, y0, m, size); break;
    case 6: ctx.rect(x0 + m, y0, m, size); break;
    case 7: poly([[x0, y0], [x1, y0], [x1, y1], [x0 + m, y1], [x0, y0 + m]]); break;
    case 11: poly([[x0, y0], [x1, y0], [x1, y0 + m], [x0 + m, y1], [x0, y1]]); break;
    case 13: poly([[x0, y0], [x0 + m, y0], [x1, y0 + m], [x1, y1], [x0, y1]]); break;
    case 14: poly([[x0 + m, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0 + m]]); break;
    case 5: poly([[x0, y0], [x0 + m, y0], [x1, y0 + m], [x1, y1], [x0 + m, y1], [x0, y0 + m]]); break;
    case 10: poly([[x0 + m, y0], [x1, y0], [x1, y0 + m], [x0 + m, y1], [x0, y1], [x0, y0 + m]]); break;
  }
}

/** Warm board tones — one per plank by world hash, kept close: a laid
 *  floor is one lumber order, not a patchwork. Bridges and any floor
 *  without a building keep this neutral order; a building's floor is
 *  cut from its own wood skin instead. */
const PLANK_TONES = ['#a87e46', '#a37842', '#ad834a', '#9f7440'];

/** Resolves the wood skin a building floor tile is cut from. */
export type WoodSkinSampler = (tx: number, ty: number) => WoodSkin;

/**
 * RUNNING-BOND PLANK FLOOR: boards are big flat rectangles — a few
 * courses per tile, several tiles long, each course offset a full
 * tile from the one above so joints stagger diagonally like laid
 * floorboards, never the half-brick bond of masonry. Every board
 * picks its own tone by world hash so the floor reads as individual
 * lumber; butt joints get a dark seam, a lit end-grain sliver and a
 * peg pair; depth is one lit edge and one shadow bed per course.
 * WOOD SKINS: a WoodFloor tile inside a building is cut from that
 * building's wood — its own tone family AND its own milling: pine is
 * knotty and milled narrow (4 courses/tile), walnut lays long clear
 * boards (4 tiles), weathered spruce is checked and sun-bleached.
 * Bridge tiles always keep the neutral town lumber. All geometry is
 * world-keyed, so a chunk seam can never break a board, and edges
 * that meet another material get their own worn shading (the opaque
 * boards paint over the contour band).
 */
function drawPlanks(
  ctx: CanvasRenderingContext2D,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
  woodSkin?: WoodSkinSampler,
): void {
  const isPlank = (t: number | undefined): boolean => t === Tile.WoodFloor || t === Tile.Bridge;
  const jointW = Math.max(1, px * 0.035);
  // One tile of margin fills the gutter (see bakeGutter).
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      const t = g(tx, ty);
      if (!isPlank(t)) continue;
      const skin = t === Tile.WoodFloor && woodSkin ? woodSkin(tx, ty) : null;
      const tones = skin ? skin.floorTones : PLANK_TONES;
      const rows = skin ? skin.rowsPerTile : 3;
      const len = skin ? skin.boardLen : 3;
      const gx = lx * px;
      const gy = ly * px;
      const rowH = px / rows;
      for (let r = 0; r < rows; r++) {
        const row = ty * rows + r;
        // Each course shifts one tile from the last (diagonal
        // stagger); negative-x modulo keeps west-of-origin floors on
        // the same boards.
        const off = ((row % len) + len) % len;
        const pid = Math.floor((tx + off) / len);
        const y0 = gy + r * rowH;
        const h1 = hashCoords(217, pid, row);
        ctx.fillStyle = tones[(h1 >>> 2) % tones.length]!;
        ctx.fillRect(gx, y0, px, rowH);
        // The course's depth read: lit top edge, shadow bed beneath.
        ctx.fillStyle = 'rgba(255, 235, 200, 0.08)';
        ctx.fillRect(gx, y0, px, Math.max(1, px * 0.025));
        ctx.fillStyle = 'rgba(56, 38, 20, 0.4)';
        ctx.fillRect(gx, y0 + rowH - Math.max(1, px * 0.03), px, Math.max(1, px * 0.03));
        // The tile that starts a board owns its butt joint; a hashed
        // nudge keeps ends hand-laid, never gridded.
        if ((((tx + off) % len) + len) % len === 0) {
          const jx = gx + ((hashCoords(223, tx, row) % 14) / 100) * px;
          ctx.fillStyle = 'rgba(50, 34, 18, 0.55)';
          ctx.fillRect(jx, y0, jointW, rowH);
          ctx.fillStyle = 'rgba(255, 235, 200, 0.09)';
          ctx.fillRect(jx + jointW, y0, px * 0.03, rowH);
          ctx.fillStyle = 'rgba(45, 30, 16, 0.5)';
          ctx.fillRect(jx + px * 0.09, y0 + rowH * 0.22, px * 0.035, px * 0.035);
          ctx.fillRect(jx + px * 0.09, y0 + rowH * 0.62, px * 0.035, px * 0.035);
        }
        // Sparse grain tick; knots at the wood's own rate — pine is
        // busy with them, walnut nearly clear.
        if ((h1 & 15) === 5) {
          ctx.fillStyle = 'rgba(56, 38, 20, 0.18)';
          ctx.fillRect(gx + (((h1 >>> 5) % 55) / 100) * px, y0 + rowH * 0.45, px * 0.3, Math.max(1, px * 0.02));
        }
        const knotMod = skin ? Math.max(5, Math.round(13 / skin.knotK)) : 13;
        if (hashCoords(229, tx, row) % knotMod === 4) {
          ctx.fillStyle = 'rgba(90, 62, 32, 0.6)';
          ctx.beginPath();
          ctx.ellipse(gx + (0.25 + (h1 % 50) / 100) * px, y0 + rowH * 0.5, px * 0.035, px * 0.025, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Seasoning: short cross-grain checks off a board edge, and —
        // on the heavily weathered woods — a sun-bleached wash.
        if (skin && hashCoords(233, tx, row) % 100 < 7 * skin.checkK) {
          const h2 = hashCoords(239, tx, row);
          ctx.fillStyle = 'rgba(56, 38, 20, 0.35)';
          ctx.fillRect(
            gx + ((h2 % 80) / 100) * px,
            (h2 & 1) === 0 ? y0 : y0 + rowH * 0.62,
            Math.max(1, px * 0.02),
            rowH * 0.38,
          );
        }
        if (skin && skin.checkK >= 2 && h1 % 23 === 7) {
          ctx.fillStyle = 'rgba(255, 240, 214, 0.07)';
          ctx.fillRect(gx + (((h1 >>> 7) % 40) / 100) * px, y0, px * 0.6, rowH);
        }
      }
      // Worn shading where the boards end against another material.
      const edge = Math.max(1, px * 0.14);
      ctx.fillStyle = 'rgba(58, 40, 22, 0.3)';
      if (!isPlank(g(tx, ty - 1))) ctx.fillRect(gx, gy, px, edge);
      if (!isPlank(g(tx, ty + 1))) ctx.fillRect(gx, gy + px - edge, px, edge);
      if (!isPlank(g(tx - 1, ty))) ctx.fillRect(gx, gy, edge, px);
      if (!isPlank(g(tx + 1, ty))) ctx.fillRect(gx + px - edge, gy, edge, px);
    }
  }
}

// ------------------------------------------------------ live decorations

/**
 * Live-water options, threaded from the renderer each frame. `full`
 * gates the ENHANCEMENT layer (swells, caustics, rolling foam) — the
 * base water (baked skins, waterline, glints, fishing rings) never
 * turns off, so switching to basic only quiets the surface, it never
 * breaks it. `moonlit` silvers and dims the glitter after dark.
 */
export interface WaterFx {
  full: boolean;
  moonlit: boolean;
}

const WATER_FX_DEFAULT: WaterFx = { full: true, moonlit: false };

/** Quantization step for live-water alphas (~6 visible grades). */
const WB_ALPHA_UNIT = 0.07;

/**
 * THE FLAT LAW: a circle lying ON the water surface must project at
 * the camera's pitch — every ring, dapple and ripple here is an
 * ellipse squashed by yScale (0.6). A round ring says "straight down",
 * and this camera never looks straight down.
 */
const FLAT = 0.6;

/**
 * DOCKS. A Bridge tile near water is a DOCK: the ground under it is
 * painted as real water (the skin, contours and depth all run beneath
 * the boards) and a raised plank deck stands over it on driven piles.
 * The deck rides DOCK_LIFT tiles of SCREEN height above the surface —
 * renderLift lifts every body standing on one by the same amount, so
 * feet and boards agree by construction. Bake-space vertical offsets
 * must divide by FLAT (the bake squashes at blit time; screen height
 * does not).
 */
export const DOCK_LIFT = 0.22;

/** Bridge with any water within Chebyshev distance 2 — a dock. The
 *  radius-2 scan keeps a whole jetty uniform (interior tiles of a
 *  2-wide run don't all touch water) so the lift never dips mid-run. */
export function isDockTile(ground: GroundSampler, tx: number, ty: number): boolean {
  if (ground(tx, ty) !== Tile.Bridge) return false;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (isWaterTile(ground(tx + dx, ty + dy))) return true;
    }
  }
  return false;
}

/** The water that continues under a dock: the most common depth among
 *  the 8 neighbors, so the pool keeps its own color beneath the boards. */
function dockUnderWater(ground: GroundSampler, tx: number, ty: number): number {
  let shallow = 0;
  let water = 0;
  let deep = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const t = ground(tx + dx, ty + dy);
      if (t === Tile.WaterShallow) shallow++;
      else if (t === Tile.Water || t === Tile.FishingSpot) water++;
      else if (t === Tile.WaterDeep) deep++;
    }
  }
  if (deep > 0 && deep >= water && deep >= shallow) return Tile.WaterDeep;
  if (water > 0 && water >= shallow) return Tile.Water;
  return Tile.WaterShallow;
}

interface WBucket {
  tone: string;
  w: number;
  q: number;
  path: Path2D;
}

/**
 * Path2D batcher for the whole live-water pass: every glint, swell,
 * crest, foam dash, spray fleck and wet-sand band lands in a
 * (tone, width, alpha-step) bucket, and the entire surface strokes in
 * a couple dozen calls — never one per effect (the Path2D color-bucket
 * law, see grass.ts).
 */
class WaterBuckets {
  private readonly map = new Map<string, WBucket>();

  /** A stroke path for (tone, width, alpha) — null when the quantized
   *  alpha rounds to invisible, so callers skip the geometry work too. */
  stroke(tone: string, w: number, alpha: number): Path2D | null {
    const q = Math.min(14, Math.round(alpha / WB_ALPHA_UNIT));
    if (q <= 0) return null;
    const key = `${tone}|${w}|${q}`;
    let b = this.map.get(key);
    if (!b) {
      b = { tone, w, q, path: new Path2D() };
      this.map.set(key, b);
    }
    return b.path;
  }

  /** A fill path (spray flecks) — width −1 marks fills. */
  fill(tone: string, alpha: number): Path2D | null {
    return this.stroke(tone, -1, alpha);
  }

  flush(ctx: CanvasRenderingContext2D, s: number): void {
    if (this.map.size === 0) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of this.map.values()) {
      ctx.globalAlpha = Math.min(1, b.q * WB_ALPHA_UNIT);
      if (b.w < 0) {
        ctx.fillStyle = b.tone;
        ctx.fill(b.path);
      } else {
        ctx.strokeStyle = b.tone;
        ctx.lineWidth = Math.max(1.5, s * b.w);
        ctx.stroke(b.path);
      }
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }
}

/**
 * THE CALM/SURF FIELD: one long-wavelength noise, drifting slowly with
 * time, decides how lively every stretch of water is. Glints, swells,
 * caustics and the shoreline surf all scale by it — busy water wanders
 * across calm water, no two screenfuls glitter alike, and nothing
 * pulses on a visible tile grid. This field is the anti-repetition
 * law: any new water effect must ride it, not a per-tile clock alone.
 */
function liveliness(wx: number, wy: number, t: number): number {
  // Drift fast enough that a becalmed cove livens within ~half a
  // minute — variation must read as weather, not as dead zones.
  return valueNoise(9911, wx * 0.045 + t * 0.02, wy * 0.045);
}

/** The live-water palette, day and moonlit. */
function waterTones(moonlit: boolean) {
  return moonlit
    ? { foam: '#d4e0f2', crest: '#9db3d4', wash: '#a9bcd8', glint: '#ccd8ef', dim: 0.55 }
    : { foam: '#f2f8fd', crest: '#b8d8ea', wash: '#c6ddf0', glint: '#cfe3f7', dim: 1 };
}

/**
 * The breeze layer: drifting water glints, swell bands, shallow-water
 * caustics, the surf shoreline and portal swirls. Drawn every frame
 * over the baked ground. (Grass and flowers live in grass.ts.)
 */
export function drawLiveGround(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  timeMs: number,
  fx: WaterFx = WATER_FX_DEFAULT,
): void {
  const t = timeMs / 1000;
  const bk = new WaterBuckets();
  const tones = waterTones(fx.moonlit);
  // The shoreline runs first so its dark waterline buckets flush under
  // the foam and glitter (map insertion order is draw order).
  drawShorelines(bk, ground, bounds, worldToScreen, s, t, fx, tones);
  const glintScale = fx.moonlit ? 0.3 : 0.5;
  for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
    for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
      const tile = ground(tx, ty);
      if (tile === undefined) continue;
      const h = hashCoords(59, tx, ty);

      // Grass and flowers live in the bespoke GrassSystem (grass.ts) —
      // this layer keeps the water, portals, and shorelines breathing.
      // A dock's lifted deck reaches into the cell NORTH of it — no
      // glitter may paint over those boards (the deck is baked; the
      // breeze layer is live and would land on top).
      const southIsDeck = ground(tx, ty + 1) === Tile.Bridge;

      if (tile === Tile.Water || tile === Tile.WaterDeep) {
        // Calm water still reads as water — the field shapes glitter,
        // it never kills it.
        const act = 0.5 + 0.5 * liveliness(tx, ty, t);
        if (h % 6 === 0 && !southIsDeck) {
          // Drifting glint: a short dash that slides and fades, scaled
          // by the calm/surf field so still coves barely sparkle.
          const phase = (t * 0.35 + (h % 100) / 100) % 1;
          const alpha = Math.sin(phase * Math.PI) * glintScale * act;
          const path = bk.stroke(tones.glint, 0.05, alpha);
          if (path) {
            const gx = tx + ((h >>> 4) % 60) / 100 + phase * 0.35;
            const gy = ty + ((h >>> 9) % 60) / 100 + 0.2;
            const p = worldToScreen(gx, gy);
            path.moveTo(p.x, p.y);
            path.lineTo(p.x + s * (0.16 + ((h >>> 13) % 4) * 0.04), p.y);
          }
        }
        // Swell bands: long, faintly bowed light strokes riding east
        // across open water. Lift-only — one step lighter than the
        // base, never darker (a dark band reads as a hole). Hosts need
        // two water tiles east so a band never slides ashore.
        if (
          fx.full &&
          h % 5 === 0 &&
          !southIsDeck &&
          isOpenWater(ground(tx + 1, ty)) &&
          isOpenWater(ground(tx + 2, ty))
        ) {
          const phase = (t * 0.05 + (h % 89) / 89) % 1;
          const alpha = Math.sin(phase * Math.PI) * 0.34 * act * tones.dim;
          const tone = tile === Tile.WaterDeep ? '#4a76ad' : '#5c8ac2';
          const path = bk.stroke(tone, 0.055, alpha);
          if (path) {
            const x0 = tx + ((h >>> 4) % 40) / 100 + phase * 0.9;
            const y0 = ty + 0.12 + ((h >>> 9) % 72) / 100;
            const len = 0.9 + (((h >>> 6) % 50) / 50) * 0.9;
            const bow = (((h >>> 11) % 40) / 40 - 0.5) * 0.24;
            const a = worldToScreen(x0, y0);
            const c = worldToScreen(x0 + len * 0.5, y0 + bow);
            const b = worldToScreen(x0 + len, y0);
            path.moveTo(a.x, a.y);
            path.quadraticCurveTo(c.x, c.y, b.x, b.y);
            // An echo band trailing half the swells: pairs and lone
            // bands mixed break the one-stroke-per-tile rhythm.
            if (h & 2) {
              const e = bk.stroke(tone, 0.055, alpha * 0.55);
              if (e) {
                const a2 = worldToScreen(x0 + 0.18, y0 + 0.16);
                const b2 = worldToScreen(x0 + 0.18 + len * 0.7, y0 + 0.16);
                e.moveTo(a2.x, a2.y);
                e.quadraticCurveTo(
                  (a2.x + b2.x) / 2,
                  worldToScreen(0, y0 + 0.16 + bow * 0.7).y,
                  b2.x,
                  b2.y,
                );
              }
            }
          }
        }
      } else if (tile === Tile.WaterShallow) {
        const act = 0.35 + 0.65 * liveliness(tx, ty, t);
        // Caustic dapples: broken rings of sunlight wobbling on the
        // sandbed — the shallows' own signature. FLAT-squashed: light
        // lying on a tilted surface, never a top-down bubble.
        if (fx.full && h % 5 === 0 && !southIsDeck) {
          const phase = (t * 0.2 + (h % 83) / 83) % 1;
          const alpha = Math.sin(phase * Math.PI) * (fx.moonlit ? 0.16 : 0.3) * act;
          const path = bk.stroke('#93c4da', 0.035, alpha);
          if (path) {
            const cx = tx + 0.14 + ((h >>> 4) % 70) / 100;
            const cy = ty + 0.14 + ((h >>> 9) % 70) / 100;
            const p = worldToScreen(cx, cy);
            const r = (0.09 + (((h >>> 5) % 40) / 40) * 0.1) * s;
            const a0 = ((h >>> 7) % 63) / 10;
            path.moveTo(p.x + Math.cos(a0) * r, p.y + Math.sin(a0) * r * FLAT);
            path.ellipse(p.x, p.y, r, r * FLAT, 0, a0, a0 + 2.1);
            const a1 = a0 + Math.PI;
            path.moveTo(p.x + Math.cos(a1) * r * 1.25, p.y + Math.sin(a1) * r * 1.25 * FLAT);
            path.ellipse(p.x, p.y, r * 1.25, r * 1.25 * FLAT, 0, a1, a1 + 1.5);
          }
        }
        // A rare, quiet glint — the shallows glitter less than open
        // water, and that difference IS the depth read.
        if (h % 13 === 0 && !southIsDeck) {
          const phase = (t * 0.3 + (h % 100) / 100) % 1;
          const alpha = Math.sin(phase * Math.PI) * glintScale * 0.6 * act;
          const path = bk.stroke(tones.glint, 0.045, alpha);
          if (path) {
            const p = worldToScreen(
              tx + ((h >>> 4) % 70) / 100,
              ty + ((h >>> 9) % 70) / 100 + 0.15,
            );
            path.moveTo(p.x, p.y);
            path.lineTo(p.x + s * 0.16, p.y);
          }
        }
      } else if (tile === Tile.FishingSpot) {
        // Rise rings: FLAT-squashed, staggered so the pair never pulses
        // in lockstep.
        const p = worldToScreen(tx + 0.5, ty + 0.5);
        for (let ring = 0; ring < 2; ring++) {
          const phase = (t * 0.6 + ring * 0.37 + (h % 10) / 10) % 1;
          ctx.globalAlpha = (1 - phase) * 0.6 * tones.dim;
          ctx.strokeStyle = tones.foam;
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          const r = (0.1 + phase * 0.34) * s;
          ctx.ellipse(p.x, p.y, r, r * FLAT, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (tile === Tile.Bridge) {
        // The dock's live waterline: the surface visibly LAPS against
        // the structure — breathing white lines hug every deck edge
        // that meets water, and the piles nurse slow ripple collars.
        // All positions sample JUST OUTSIDE the dock tile (the dock
        // tile itself is lifted by renderLift; the water is not).
        if (fx.full && isDockTile(ground, tx, ty)) {
          const hd = hashCoords(163, tx, ty);
          const lapA = (0.16 + 0.14 * Math.sin(t * 0.9 + (hd % 63) / 10)) * tones.dim;
          const lap = (x0: number, y0: number, x1: number, y1: number): void => {
            const path = bk.stroke(tones.foam, 0.035, lapA);
            if (!path) return;
            const a = worldToScreen(x0, y0);
            const b = worldToScreen(x1, y1);
            path.moveTo(a.x, a.y);
            path.lineTo(b.x, b.y);
          };
          if (isWaterTile(ground(tx - 1, ty))) lap(tx - 0.02, ty + 0.12, tx - 0.02, ty + 0.88);
          if (isWaterTile(ground(tx + 1, ty))) lap(tx + 1.02, ty + 0.12, tx + 1.02, ty + 0.88);
          if (isWaterTile(ground(tx, ty + 1))) {
            lap(tx + 0.1, ty + 1.04, tx + 0.9, ty + 1.04);
            // Pile ripple collars, phase-desynced per pile.
            for (const fpos of [0.18, 0.82]) {
              const hp = hashCoords(157 + Math.round(fpos * 100), tx, ty);
              const phase = (t * 0.45 + (hp % 89) / 89) % 1;
              const alpha = (1 - phase) * 0.3 * tones.dim;
              const path = bk.stroke(tones.glint, 0.03, alpha);
              if (path) {
                const p = worldToScreen(tx + fpos, ty + 1.14);
                const r = (0.06 + phase * 0.12) * s;
                path.moveTo(p.x + r, p.y);
                path.ellipse(p.x, p.y, r, r * FLAT, 0, 0, Math.PI * 2);
              }
            }
          }
        }
      }
      // (Portals are no longer painted here: the Riftgate's blight
      // apron must smother the meadow, so it draws AFTER the grass
      // under-pass — see renderer.drawPortalGrounds / portal.ts.)
    }
  }
  bk.flush(ctx, s);
}

/** Open (non-wadeable) water — the only surface swell bands ride. */
function isOpenWater(t: number | undefined): boolean {
  return t === Tile.Water || t === Tile.WaterDeep || t === Tile.FishingSpot;
}

/**
 * The visible water region as ONE Path2D in WORLD tile coordinates:
 * interior dual cells as rects, boundary cells through the same organic
 * contour geometry as the baked skin — so a reflection clipped by this
 * path ends exactly at the painted meander, never at a tile edge. The
 * renderer's reflection pass applies it under the camera's affine
 * transform. Returns null when no water is in view.
 */
export function waterRegionPath(
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
): Path2D | null {
  const wob = BLOB_LAYERS[WATER_LI]!.wobble;
  const id = (v: number): number => v;
  let path: Path2D | null = null;
  for (let j = bounds.minTy; j <= bounds.maxTy + 1; j++) {
    for (let i = bounds.minTx; i <= bounds.maxTx + 1; i++) {
      const mask =
        (isWaterTile(ground(i - 1, j - 1)) ? 1 : 0) |
        (isWaterTile(ground(i, j - 1)) ? 2 : 0) |
        (isWaterTile(ground(i, j)) ? 4 : 0) |
        (isWaterTile(ground(i - 1, j)) ? 8 : 0);
      if (mask === 0) continue;
      path ??= new Path2D();
      const bnds = mask === 15 ? [] : boundaryCurvesFor(WATER_LI, wob, i, j, mask);
      organicCellPath(path, WATER_LI, wob, i, j, mask, bnds, id, id);
    }
  }
  return path;
}

/** Water tiles that share a shoreline (no foam between each other). */
function isWaterTile(t: number | undefined): boolean {
  return (
    t === Tile.Water ||
    t === Tile.WaterDeep ||
    t === Tile.WaterShallow ||
    t === Tile.FishingSpot
  );
}

/**
 * THE SURF SHORELINE. Every boundary run traces the SAME organic curve
 * as the baked water skin (shared boundaryCurvesFor geometry), and each
 * run lives its own wave cycle, desynchronized by hash and throttled by
 * the calm/surf field:
 *
 *   crest slides IN from open water (offset along the run's outward
 *   normal, so the approach is perpendicular — real waves come TO the
 *   shore, not along it) → whitens as it arrives → BREAKS into chunky
 *   foam dashes and tossed spray at the waterline → a wide backwash
 *   sheet recedes → the sand at the line stays dark and damp, drying
 *   until the next set.
 *
 * Calm stretches (low liveliness) skip the surf entirely and keep the
 * quiet lapping waterline — a coast reads as coves and breaks, never
 * as one synchronized machine. Everything lands in the shared
 * WaterBuckets, so the whole coast is still a handful of strokes.
 */
function drawShorelines(
  bk: WaterBuckets,
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
  fx: WaterFx,
  tones: ReturnType<typeof waterTones>,
): void {
  const wob = BLOB_LAYERS[WATER_LI]!.wobble;
  const STEPS = 6;
  for (let j = bounds.minTy; j <= bounds.maxTy + 1; j++) {
    for (let i = bounds.minTx; i <= bounds.maxTx + 1; i++) {
      const c00 = ground(i - 1, j - 1);
      const c10 = ground(i, j - 1);
      const c11 = ground(i, j);
      const c01 = ground(i - 1, j);
      // Dock cells get NO shoreline: the water slides quietly under
      // the raised deck — foam ringing a dock would paint it back
      // into a flat peninsula (piles carry their own ripples).
      if (
        (c00 === Tile.Bridge && isDockTile(ground, i - 1, j - 1)) ||
        (c10 === Tile.Bridge && isDockTile(ground, i, j - 1)) ||
        (c11 === Tile.Bridge && isDockTile(ground, i, j)) ||
        (c01 === Tile.Bridge && isDockTile(ground, i - 1, j))
      ) {
        continue;
      }
      const mask =
        (isWaterTile(c00) ? 1 : 0) |
        (isWaterTile(c10) ? 2 : 0) |
        (isWaterTile(c11) ? 4 : 0) |
        (isWaterTile(c01) ? 8 : 0);
      if (mask === 0 || mask === 15) continue;
      const bnds = boundaryCurvesFor(WATER_LI, wob, i, j, mask);
      for (let k = 0; k < bnds.length; k++) {
        const bnd = bnds[k]!;
        // The run's world polyline, sampled once and re-used by every
        // layer; `emit` re-projects it offset along the outward normal
        // (d > 0 pushes OFFSHORE, d < 0 onto the land).
        const wpts: Pt[] = [];
        for (let n = 0; n <= STEPS; n++) wpts.push(qpoint(bnd, n / STEPS));
        const emit = (path: Path2D, d: number, from = 0, to = STEPS): void => {
          for (let n = from; n <= to; n++) {
            const p = worldToScreen(wpts[n]![0] - bnd.ox * d, wpts[n]![1] - bnd.oy * d);
            if (n === from) path.moveTo(p.x, p.y);
            else path.lineTo(p.x, p.y);
          }
        };
        const hh = hashCoords(71 + k, i, j);
        const act = liveliness(bnd.ax, bnd.ay, t);

        // THE LAP (both modes): the dark waterline, breathing — water
        // meeting land, not inked outline.
        const lap = 0.5 + 0.5 * Math.sin(t * 0.8 + (hh % 63) / 10);
        const wl = bk.stroke('#1a3060', lap > 0.5 ? 0.06 : 0.05, 0.26 + lap * 0.12);
        if (wl) emit(wl, 0);

        // Ambient foam dash gliding smoothly along the shore (both
        // modes) — sampled at fractional curve params, not the cached
        // polyline, so the slide never steps.
        const fA = Math.sin(((t * 0.45 + (hh % 40) / 40) % 1) * Math.PI);
        if (fA > 0.12) {
          const u = (t * 0.1 + (hh % 100) / 100) % 0.75;
          const path = bk.stroke(tones.foam, 0.05, fA * 0.6 * (0.4 + 0.6 * act) * tones.dim);
          if (path) {
            for (let n = 0; n <= 4; n++) {
              const wp = qpoint(bnd, u + (n / 4) * 0.25);
              const p = worldToScreen(wp[0] - bnd.ox * 0.015, wp[1] - bnd.oy * 0.015);
              if (n === 0) path.moveTo(p.x, p.y);
              else path.lineTo(p.x, p.y);
            }
          }
        }

        if (!fx.full) continue;

        // THE SET WAVE — throttled by the calm/surf field: dead-calm
        // stretches keep their lap alone, everything else gets sets.
        if (act < 0.12) continue;
        const period = 3.4 + (((hh >>> 3) % 100) / 100) * 2.2;
        const cycle = Math.floor(t / period + (hh % 997) / 997);
        // Waves arrive in SETS: each cycle rolls its own weight, so a
        // shore alternates heavy breakers and gentle washes instead of
        // metronoming one identical wave.
        const setK = 0.55 + 0.45 * ((hashCoords(hh & 0xffff, cycle, i) % 100) / 100);
        const strength = (0.3 + 0.7 * act) * setK * tones.dim;
        const u = (t / period + (hh % 997) / 997) % 1;

        // Crest rolling in: offset shrinks toward the shore, the line
        // brightens and whitens as it comes. A thin dark accent trails
        // just offshore of the light line — the wave's FACE, the one
        // stroke that makes the crest read as a moving ridge instead
        // of a drifting highlight.
        if (u < 0.8) {
          const uu = u / 0.8;
          const d = 0.55 * (1 - uu) + 0.02;
          const tone = uu > 0.5 ? tones.foam : tones.crest;
          const path = bk.stroke(tone, uu > 0.5 ? 0.065 : 0.05, strength * (0.1 + 0.55 * uu * uu));
          if (path) emit(path, d);
          if (uu > 0.35) {
            const face = bk.stroke('#1a3060', 0.045, strength * 0.3 * uu);
            if (face) emit(face, d + 0.055);
          }
        }

        // The break: chunky white dashes at the line — chisel-cut foam,
        // three ragged pieces, never one smooth arc.
        const db = (u - 0.8 + 1) % 1;
        if (db < 0.28) {
          const path = bk.stroke(tones.foam, 0.08, strength * 0.95 * (1 - db / 0.28));
          if (path) {
            for (let seg = 0; seg < 3; seg++) {
              if (((hh >>> (seg + 5)) & 3) === 0) continue; // ragged gaps
              emit(path, 0.02, seg * 2, Math.min(seg * 2 + 2, STEPS));
            }
          }
          // Spray tossed past the line at the moment of the break.
          if (db < 0.1) {
            const fill = bk.fill(tones.foam, strength * 0.6 * (1 - db / 0.1));
            if (fill) {
              for (let sp = 0; sp < 3; sp++) {
                const w = wpts[1 + sp * 2]!;
                const jx = (((hh >>> (sp * 3 + 2)) % 20) - 10) / 160;
                const d = -0.04 - ((hh >>> (sp * 2 + 7)) % 12) / 160;
                const p = worldToScreen(w[0] - bnd.ox * d + jx, w[1] - bnd.oy * d);
                const r = (0.028 + ((hh >>> (sp + 9)) % 3) * 0.012) * s;
                // FLAT-squashed fleck, like everything lying on the
                // surface.
                fill.rect(p.x, p.y, r, r * FLAT);
              }
            }
          }
        }

        // Backwash: a wide pale sheet sliding back out.
        if (db >= 0.06 && db < 0.44) {
          const uw = (db - 0.06) / 0.38;
          const path = bk.stroke(tones.wash, 0.09, strength * 0.22 * (1 - uw));
          if (path) emit(path, 0.04 + uw * 0.34);
        }

        // Wet sand: the land side of the line stays dark and damp
        // after each wave, drying until the next — only over sand.
        if (db < 0.6) {
          const mid = wpts[3]!;
          const landTile = ground(
            Math.floor(mid[0] + bnd.ox * 0.6),
            Math.floor(mid[1] + bnd.oy * 0.6),
          );
          if (landTile === Tile.Sand) {
            const path = bk.stroke('#6e5432', 0.09, 0.32 * (1 - db / 0.6) * strength);
            if (path) emit(path, -0.08);
          }
        }
      }
    }
  }
}


