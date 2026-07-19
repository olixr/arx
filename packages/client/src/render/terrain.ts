import {
  CHUNK_SIZE,
  Detail,
  Tile,
  hashCoords,
  valueNoise,
} from '@devcraft/shared';
import { chamferRect, facetCircle } from './shapes.js';

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
    match: (t) => t === Tile.Water || t === Tile.FishingSpot,
    color: () => '#4979b8',
    wobble: 0.14,
    // The live shoreline pass draws the waterline — no baked band.
    band: null,
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

/** Layer index of the water skin — the live shoreline follows it. */
const WATER_LI = BLOB_LAYERS.findIndex((l) => l.match(Tile.Water));

const GRASS_LIKE = new Set<number>([
  Tile.Grass,
  Tile.GrassTall,
  Tile.Tree,
  Tile.TreeOak,
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
      t === Tile.Alembic
    ) {
      return nearestFloor(ground, tx, ty);
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
  drawPlanks(ctx, g, baseX, baseY, px);

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
      drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px);
    }
  }

  return canvas;
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
): void {
  const hg = hashCoords(83, tx, ty);
  const gx = lx * px;
  const gy = ly * px;
  // Tilled soil overrides any old grass detail (a plot dug over a
  // flowered meadow must not keep phantom blooms) and gets furrows.
  if (m === Tile.Tilled) {
    d = Detail.None;
    // Three worked furrow rows, slightly ragged, plus a couple clods.
    ctx.fillStyle = 'rgba(32, 22, 13, 0.35)';
    for (let r = 0; r < 3; r++) {
      const fy = gy + px * (0.2 + r * 0.28) + ((hg >> (r * 3)) % 3 - 1) * px * 0.02;
      ctx.fillRect(gx + px * 0.06, fy, px * 0.88, Math.max(1, px * 0.07));
    }
    ctx.fillStyle = 'rgba(150, 116, 76, 0.5)';
    for (let k = 0; k < 2; k++) {
      const hh = hashCoords(191 + k, tx, ty);
      ctx.fillRect(
        gx + (0.12 + (hh % 70) / 100) * px,
        gy + (0.1 + ((hh >> 7) % 75) / 100) * px,
        px * 0.07,
        px * 0.05,
      );
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
        // A woven rug: border, field, and a diamond motif — palette
        // hash-picked so a town's rugs aren't uniforms.
        const pal = RUG_PALETTES[hashCoords(211, tx, ty) % RUG_PALETTES.length]!;
        ctx.fillStyle = pal[0];
        ctx.beginPath();
        chamferRect(ctx, gx + px * 0.07, gy + px * 0.09, px * 0.86, px * 0.82, px * 0.05);
        ctx.fill();
        ctx.fillStyle = pal[1];
        ctx.beginPath();
        chamferRect(ctx, gx + px * 0.16, gy + px * 0.18, px * 0.68, px * 0.64, px * 0.04);
        ctx.fill();
        ctx.fillStyle = pal[0];
        const dx0 = gx + px * 0.5;
        const dy0 = gy + px * 0.5;
        ctx.beginPath();
        ctx.moveTo(dx0, dy0 - px * 0.14);
        ctx.lineTo(dx0 + px * 0.17, dy0);
        ctx.lineTo(dx0, dy0 + px * 0.14);
        ctx.lineTo(dx0 - px * 0.17, dy0);
        ctx.closePath();
        ctx.fill();
      } else if (d === Detail.RugRound) {
        const pal = RUG_PALETTES[hashCoords(223, tx, ty) % RUG_PALETTES.length]!;
        ctx.fillStyle = pal[0];
        ctx.beginPath();
        facetCircle(ctx, gx + px * 0.5, gy + px * 0.5, px * 0.44, 8, 0.2);
        ctx.fill();
        ctx.fillStyle = pal[1];
        ctx.beginPath();
        facetCircle(ctx, gx + px * 0.5, gy + px * 0.5, px * 0.3, 8, 0.2);
        ctx.fill();
      } else if (d === Detail.Doormat) {
        // A worn coir mat with weave lines.
        ctx.fillStyle = '#a08a5a';
        ctx.beginPath();
        chamferRect(ctx, gx + px * 0.16, gy + px * 0.26, px * 0.68, px * 0.48, px * 0.04);
        ctx.fill();
        ctx.strokeStyle = 'rgba(94, 74, 40, 0.5)';
        ctx.lineWidth = Math.max(1, px * 0.03);
        for (const fy of [0.4, 0.52, 0.64]) {
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.22, gy + px * fy);
          ctx.lineTo(gx + px * 0.78, gy + px * fy);
          ctx.stroke();
        }
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

/** Rug colorways: [border, field] — deep, cloth-dyed, never neon. */
const RUG_PALETTES: ReadonlyArray<readonly [string, string]> = [
  ['#6e3440', '#96586a'],
  ['#35526e', '#54789c'],
  ['#44603a', '#67875a'],
  ['#6e5a2e', '#9c8452'],
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
      drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px);
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
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) {
    const t = ground(tx + dx, ty + dy);
    if (t === Tile.WoodFloor || t === Tile.StoneFloor || t === Tile.CaveFloor || t === Tile.Dirt) {
      return t;
    }
  }
  return Tile.Grass;
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

function drawPlanks(
  ctx: CanvasRenderingContext2D,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  ctx.strokeStyle = 'rgba(58, 40, 22, 0.25)';
  ctx.lineWidth = Math.max(1, px * 0.04);
  // One tile of margin fills the gutter (see bakeGutter).
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const t = g(baseX + lx, baseY + ly);
      if (t !== Tile.WoodFloor && t !== Tile.Bridge) continue;
      const y = ly * px + px * (0.33 + (hashCoords(43, baseX + lx, baseY + ly) % 3) * 0.17);
      ctx.beginPath();
      ctx.moveTo(lx * px, y);
      ctx.lineTo(lx * px + px, y);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------ live decorations

/**
 * The breeze layer: drifting water glints, pulsing ripples, shoreline
 * foam and portal swirls. Drawn every frame over the baked ground.
 * (Grass and flowers have their own system — see grass.ts.)
 */
export function drawLiveGround(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  timeMs: number,
): void {
  const t = timeMs / 1000;
  drawShorelines(ctx, ground, bounds, worldToScreen, s, t);
  for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
    for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
      const tile = ground(tx, ty);
      if (tile === undefined) continue;
      const h = hashCoords(59, tx, ty);

      // Grass and flowers live in the bespoke GrassSystem (grass.ts) —
      // this layer keeps the water, portals, and shorelines breathing.
      if (tile === Tile.Water || tile === Tile.WaterDeep) {
        if (h % 6 === 0) {
          // Drifting glint: a short dash that slides and fades.
          const phase = (t * 0.35 + (h % 100) / 100) % 1;
          const gx = tx + ((h >> 4) % 60) / 100 + phase * 0.35;
          const gy = ty + ((h >> 9) % 60) / 100 + 0.2;
          const p = worldToScreen(gx, gy);
          ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.5;
          ctx.strokeStyle = '#cfe3f7';
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + s * 0.22, p.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (tile === Tile.FishingSpot) {
        const p = worldToScreen(tx + 0.5, ty + 0.5);
        for (let ring = 0; ring < 2; ring++) {
          const phase = (t * 0.6 + ring * 0.5) % 1;
          ctx.globalAlpha = (1 - phase) * 0.6;
          ctx.strokeStyle = '#dcebfb';
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          ctx.arc(p.x, p.y, (0.1 + phase * 0.34) * s, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (tile === Tile.PortalDown || tile === Tile.PortalUp) {
        drawPortal(ctx, tx, ty, tile === Tile.PortalUp, worldToScreen, s, t);
      }
    }
  }
}

/** Water tiles that share a shoreline (no foam between each other). */
function isWaterTile(t: number | undefined): boolean {
  return t === Tile.Water || t === Tile.WaterDeep || t === Tile.FishingSpot;
}

/**
 * Shoreline dressing: a dark waterline plus slow-breathing foam dashes
 * that slide along the shore. Traces the SAME organic curves as the
 * baked water skin (shared boundaryCurvesFor geometry), so the line
 * hugs the painted meander exactly — never a straight ghost of it.
 */
function drawShorelines(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
): void {
  const wob = BLOB_LAYERS[WATER_LI]!.wobble;
  ctx.lineCap = 'round';
  for (let j = bounds.minTy; j <= bounds.maxTy + 1; j++) {
    for (let i = bounds.minTx; i <= bounds.maxTx + 1; i++) {
      const mask =
        (isWaterTile(ground(i - 1, j - 1)) ? 1 : 0) |
        (isWaterTile(ground(i, j - 1)) ? 2 : 0) |
        (isWaterTile(ground(i, j)) ? 4 : 0) |
        (isWaterTile(ground(i - 1, j)) ? 8 : 0);
      if (mask === 0 || mask === 15) continue;
      const bnds = boundaryCurvesFor(WATER_LI, wob, i, j, mask);
      for (let k = 0; k < bnds.length; k++) {
        const bnd = bnds[k]!;
        // Sample the quadratic into a short screen polyline.
        const STEPS = 6;
        const pts: Array<{ x: number; y: number }> = [];
        for (let n = 0; n <= STEPS; n++) {
          const p = qpoint(bnd, n / STEPS);
          pts.push(worldToScreen(p[0], p[1]));
        }
        // Waterline: constant dark edge along the visual shore.
        ctx.strokeStyle = 'rgba(26, 48, 96, 0.32)';
        ctx.lineWidth = Math.max(1.5, s * 0.055);
        ctx.beginPath();
        ctx.moveTo(pts[0]!.x, pts[0]!.y);
        for (let n = 1; n <= STEPS; n++) ctx.lineTo(pts[n]!.x, pts[n]!.y);
        ctx.stroke();
        // Foam: a dash sliding along the curve, breathing in and out.
        const hh = hashCoords(71 + k, i, j);
        const alpha = Math.sin(((t * 0.45 + (hh % 40) / 40) % 1) * Math.PI);
        if (alpha < 0.12) continue;
        const u = (t * 0.1 + (hh % 100) / 100) % 0.75;
        ctx.strokeStyle = '#dcebfb';
        ctx.lineWidth = Math.max(1.5, s * 0.05);
        ctx.globalAlpha = alpha * 0.65;
        ctx.beginPath();
        for (let n = 0; n <= 4; n++) {
          const p = qpoint(bnd, u + (n / 4) * 0.25);
          const sp = worldToScreen(p[0], p[1]);
          if (n === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.lineCap = 'butt';
}


function drawPortal(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  up: boolean,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
): void {
  const p = worldToScreen(tx + 0.5, ty + 0.5);
  const base = up ? '#b8a5e8' : '#7a68b0';
  // Dark pool.
  ctx.fillStyle = up ? 'rgba(65, 56, 98, 0.9)' : 'rgba(26, 22, 38, 0.9)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s * 0.4, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotating spiral arms.
  ctx.strokeStyle = base;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    const a0 = t * 1.4 + (arm * Math.PI * 2) / 3;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const f = i / 8;
      const ang = a0 + f * 2.2;
      const rad = (0.06 + f * 0.28) * s;
      const x = p.x + Math.cos(ang) * rad;
      const y = p.y + Math.sin(ang) * rad * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Center glow dot.
  ctx.fillStyle = '#efe3ff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, s * 0.05 + Math.sin(t * 3) * s * 0.015, 0, Math.PI * 2);
  ctx.fill();
}
