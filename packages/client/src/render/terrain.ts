import {
  CHEST_TILES,
  CHUNK_SIZE,
  Detail,
  GARRISON_TILES,
  Tile,
  WALL_RUN_TILES,
  awningInfo,
  diagWallInfo,
  wallHungInfo,
  hashCoords,
  isFishingTile,
  nearestFloorTile,
  tileDef,
  valueNoise,
} from '@arx/shared';
import { chamferRect, facetCircle } from './shapes.js';
import { shade } from './rig.js';
import { DYE_SWATCHES } from './icons.js';
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
    // Dungeon flagstones: hand-laid masonry in the dark band — the
    // flagstone wobble (tight, deliberate) in cave-depth tones, so a
    // built room reads man-made against the raw cave around it.
    match: (t) => t === Tile.DungeonFloor,
    color: (_t, tx, ty) => patch('#514b58', '#4c4653', tx, ty, 47),
    wobble: 0.11,
    band: 'rgba(16, 12, 24, 0.32)',
    fringe: false,
  },
  {
    // Cave rubble: collapsed scree spilling across the corridors —
    // fully organic patches, a shade lighter than the rock they broke
    // from, painted over both cave floor and flagstone.
    match: (t) => t === Tile.CaveRubble,
    color: (_t, tx, ty) => patch('#544e5f', '#4f4959', tx, ty, 49),
    wobble: 0.18,
    band: 'rgba(18, 14, 28, 0.3)',
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
    match: (t) => t === Tile.Water || isFishingTile(t),
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
  Tile.TreePine,
  Tile.Stump,
  Tile.Fence,
  Tile.FenceDiagNE,
  Tile.FenceDiagNW,
  Tile.FenceGate,
  Tile.FenceGateShut,
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
    t === Tile.CrackedCaveWall ||
    t === Tile.CaveFloor ||
    t === Tile.DungeonFloor ||
    t === Tile.CaveRubble ||
    t === Tile.PortalDown ||
    t === Tile.PortalUp
  );
}

// ---------------------------------------------------------------- baking

/** Effective ground for blob purposes: objects show what's under them. */
function effectiveGround(ground: GroundSampler): GroundSampler {
  // Per-bake memos: one axis flood per span, one underground verdict
  // per deck tile (the apron test needs the axis).
  const deckAxisMemo = new Map<number, boolean>();
  const deckUnderMemo = new Map<number, number>();
  const g = (tx: number, ty: number): number => {
    const t = ground(tx, ty);
    if (t === undefined) return Tile.Grass;
    // Raised decks: the SKIN under a dock or bridge is whatever the
    // structure actually spans — water over the pool, the BANK at the
    // road aprons (a ramp is bank-first: even a diagonal lick of
    // water two cells off may not paint a phantom pool under a deck
    // that pours onto dry road) — so organic contours, depth bands
    // and shorelines all flow beneath the boards; the deck itself is
    // painted raised, by drawDocks or drawBridges.
    if (isDeckGround(t) && isDeckTile(ground, tx, ty)) {
      const key = packDeck(tx, ty);
      let u = deckUnderMemo.get(key);
      if (u === undefined) {
        let bankFirst = false;
        if (t === Tile.Bridge) {
          let vert = deckAxisMemo.get(key);
          if (vert === undefined) vert = deckWalkIsVertical(ground, tx, ty, deckAxisMemo);
          bankFirst = bridgeApronAt(ground, tx, ty, vert) !== 'none';
        }
        u = deckUnderGround(ground, tx, ty, bankFirst);
        deckUnderMemo.set(key, u);
      }
      return u;
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
      t === Tile.Sawhorse ||
      t === Tile.BeastPen ||
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
    if (t === Tile.WallStone || t === Tile.WallStoneWindow) {
      // Dungeon masonry stands ON the dungeon's own floor: probe the
      // corridor beside the wall so its base sliver never prints
      // surface flagstone in the dark band.
      const sT = ground(tx, ty + 1);
      if (sT === Tile.DungeonFloor || sT === Tile.CaveRubble || sT === Tile.CaveFloor) return sT;
      const nT = ground(tx, ty - 1);
      if (nT === Tile.DungeonFloor || nT === Tile.CaveRubble || nT === Tile.CaveFloor) return nT;
      return Tile.StoneFloor;
    }
    if (t === Tile.CaveWall || t === Tile.CrackedCaveWall) return Tile.CaveFloor;
    // Garrison masonry stands in open country, not in a room: the
    // ground beneath continues whichever walkable terrain the curtain
    // fronts (south first — that side's base sliver is the visible
    // one), so a rampart crossing meadow, road, and sand never prints
    // interior flooring at its foot. The gate carries the same law:
    // the road marches THROUGH the passage; dressed flags only when
    // no open ground answers.
    if (
      t === Tile.WallGarrison ||
      t === Tile.GateGarrison ||
      t === Tile.GateGarrisonShut
    ) {
      // A garrison-family neighbour is masonry, not ground — a gate
      // tile inside a merged run must never lend its own skin. Side
      // gates (N-S curtains) find their road on the E/W flanks. A
      // Ramp is stair masonry, not ground either: a gate at a stair
      // crown carries its terrace's paving, not a ramp sliver.
      const pick = (tt: Tile | undefined): Tile | null =>
        tt !== undefined && !tileDef(tt).solid && !GARRISON_TILES.has(tt) && tt !== Tile.Ramp
          ? tt
          : null;
      return (
        pick(ground(tx, ty + 1)) ??
        pick(ground(tx, ty - 1)) ??
        pick(ground(tx + 1, ty)) ??
        pick(ground(tx - 1, ty)) ??
        Tile.StoneFloor
      );
    }
    // THE PORCH: the yard continues under the lifted deck — the
    // garrison-gate pick, south first (that side's base sliver shows
    // beneath the fascia); deck kin never lend a skin.
    if (t === Tile.PorchDeck) {
      const pick = (tt: Tile | undefined): Tile | null =>
        tt !== undefined && !tileDef(tt).solid && tt !== Tile.PorchDeck && tt !== Tile.Ramp
          ? tt
          : null;
      return (
        pick(ground(tx, ty + 1)) ??
        pick(ground(tx + 1, ty)) ??
        pick(ground(tx - 1, ty)) ??
        pick(ground(tx, ty - 1)) ??
        Tile.Grass
      );
    }
    // An awning is cloth OVERHEAD: the street runs on beneath it —
    // the garrison-gate law's pick, south first (that side's base
    // sliver is the visible one), flanks next. A run-mate is canopy,
    // not ground, and never lends a skin.
    if (awningInfo(t) !== null) {
      const pick = (tt: Tile | undefined): Tile | null =>
        tt !== undefined && !tileDef(tt).solid && awningInfo(tt) === null && tt !== Tile.Ramp
          ? tt
          : null;
      return (
        pick(ground(tx, ty + 1)) ??
        pick(ground(tx + 1, ty)) ??
        pick(ground(tx - 1, ty)) ??
        pick(ground(tx, ty - 1)) ??
        Tile.Grass
      );
    }
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
      t === Tile.TimberPost ||
      t === Tile.RailWood
    ) {
      return nearestFloor(ground, tx, ty);
    }
    // Props stand ON a floor, they aren't ground materials themselves.
    if (t >= Tile.Barrel && t <= Tile.Basin) return nearestFloor(ground, tx, ty);
    // Dungeon props stand on whichever floor the corridor carries
    // (nearestFloor knows DungeonFloor/CaveRubble/CaveFloor).
    if (
      t === Tile.Stalagmite ||
      t === Tile.BonePile ||
      t === Tile.Brazier ||
      t === Tile.GlowShroom
    ) {
      return nearestFloor(ground, tx, ty);
    }
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

/**
 * TIME-SLICED CHUNK BAKING. A full chunk bake costs 10-40ms — far past
 * any 120fps frame budget, so it must never run whole inside a frame.
 * startChunkBake paints the cheap meadow base synchronously (~0.1ms, a
 * usable placeholder) and returns a job whose remaining steps — one
 * material layer per step, the elev mask + planks, the per-tile detail
 * pass in row bands, docks last — each fit a small slice of a frame.
 * The renderer advances jobs against a per-frame time budget and blits
 * the canvas at whatever completeness it has: brand-new ground sweeps
 * its detail in over a few frames instead of hitching one.
 *
 * Step ORDER is the paint order of the old monolithic bake, so a
 * finished job is pixel-identical to bakeChunk's output. Partial
 * states are always "lower passes complete, higher passes absent" —
 * never residue that a later pass fails to cover.
 */
export interface ChunkBakeJob {
  canvas: HTMLCanvasElement;
  /** Remaining paint steps; each sized to fit a slice of frame budget. */
  steps: Array<() => void>;
  next: number;
}

/** Advance a sliced bake by one step; true when the bake is complete. */
export function stepChunkBake(job: ChunkBakeJob): boolean {
  const s = job.steps[job.next];
  if (s !== undefined) {
    s();
    job.next++;
  }
  return job.next >= job.steps.length;
}

/** Rows of the per-tile detail pass per step — the heaviest pass. */
const DETAIL_STEP_ROWS = 5;

export function startChunkBake(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  woodSkin?: WoodSkinSampler,
): ChunkBakeJob {
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
  // Painted synchronously — it is the placeholder a brand-new in-view
  // chunk shows while its remaining steps stream in.
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
  // Raised/sunken regions darken in the placeholder too — a fresh
  // mountain chunk must never flash meadow-green while its layers
  // stream in. The 2b step repeats this AFTER the skins, restoring
  // the real paint order.
  fillMask(ctx, (tx, ty) => elev(tx, ty) !== 0, baseX, baseY, px, '#282334');

  const steps: Array<() => void> = [];

  // 2. Material skins, lowest to highest, contoured on the dual grid —
  // one layer per step. The halo index is shared by every layer step.
  let idx: Int8Array | null = null;
  for (let li = 0; li < BLOB_LAYERS.length; li++) {
    steps.push(() => {
      idx ??= computeLayerIdx(g, baseX, baseY);
      paintLayerSkin(ctx, idx, li, baseX, baseY, px);
    });
  }

  steps.push(() => {
    // 2b. Ground under raised OR sunken terrain: the lifted surfaces
    // and cliff faces cover almost all of it, but any sliver that
    // survives a seam must read as shadowed rock — never sunny grass
    // peeking out from inside a mountain, and a pit mouth reads as
    // darkness before its floor paints over it.
    fillMask(ctx, (tx, ty) => elev(tx, ty) !== 0, baseX, baseY, px, '#282334');

    // 3. Wood-floor plank seams (subtle, flat).
    drawPlanks(ctx, g, baseX, baseY, px, woodSkin);
  });

  // 4. Baked micro-details (static ones only; swaying ones are live).
  // One tile of margin so flecks straddling a chunk edge reach into
  // the gutter — the neighbor bakes the identical fleck at the same
  // world position, so both sides agree. Sliced in row bands.
  for (let r0 = -1; r0 <= CHUNK_SIZE; r0 += DETAIL_STEP_ROWS) {
    const r1 = Math.min(r0 + DETAIL_STEP_ROWS - 1, CHUNK_SIZE);
    steps.push(() => {
      for (let ly = r0; ly <= r1; ly++) {
        for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
          const tx = baseX + lx;
          const ty = baseY + ly;
          // Raised/sunken tiles' details belong to their lifted layer.
          if (elev(tx, ty) !== 0) continue;
          drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px, detail, g);
        }
      }
    });
  }

  // 5. Raised decks: docks and bridges over the water painted LAST,
  // so the deck's lifted top (which reaches into the north neighbor's
  // cell) covers that neighbor's water details instead of wearing
  // them. Ground-level decks only — a deck on a terrace paints into
  // its own elevated layer (bakeElevated), which blits over these
  // rows shifted; painting it here too would bury it.
  const groundDeck = (tx: number, ty: number): boolean => elev(tx, ty) === 0;
  steps.push(() => drawDocks(ctx, ground, baseX, baseY, px, groundDeck));
  steps.push(() => drawBridges(ctx, ground, baseX, baseY, px, groundDeck));
  steps.push(() => drawPorchDecks(ctx, ground, baseX, baseY, px, woodSkin, groundDeck));

  return { canvas, steps, next: 0 };
}

/** The one-shot bake: start + run every step. Output is identical to
 *  the sliced path — this is the sliced path, run to completion. */
export function bakeChunk(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  woodSkin?: WoodSkinSampler,
): HTMLCanvasElement {
  const job = startChunkBake(ground, detail, elev, cx, cy, px, woodSkin);
  while (!stepChunkBake(job)) {
    /* run to completion */
  }
  return job.canvas;
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
 * Connectivity is by raw deck-family neighbors, so runs merge (a dock
 * butting a bridge keeps its boards open); everything is world-keyed,
 * so chunk seams and resolution tiers agree.
 */
/**
 * THE PORCH — the deck ashore. Boards ride paintDeckBoards' porch
 * family at DOCK_LIFT; THE DECK TAKES THE HOUSE'S WOOD (the connected
 * patch probes for an adjoining wall run and wears that building's
 * floor tones — one skin per patch, cached per bake); the dressing is
 * BLOCKY per the masterwork laws: rim-joist fascia with squared
 * footing blocks, a full-width tread step onto walkable ground, and
 * the architecture ring struck at bake time on exposed edges only.
 */
function drawPorchDecks(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
  skinAt?: WoodSkinSampler,
  include?: (tx: number, ty: number) => boolean,
): void {
  const liftB = Math.round((DOCK_LIFT / FLAT) * px);
  // One skin per connected patch: flood (capped) looking for a wall.
  const patchSkin = new Map<string, readonly string[] | null>();
  const skinFor = (sx: number, sy: number): readonly string[] | null => {
    const rootKey = `${sx},${sy}`;
    const hit = patchSkin.get(rootKey);
    if (hit !== undefined) return hit;
    let found: readonly string[] | null = null;
    const seen = new Set<string>([rootKey]);
    const queue: Array<[number, number]> = [[sx, sy]];
    const members: string[] = [rootKey];
    while (queue.length > 0 && seen.size <= 64) {
      const [qx, qy] = queue.pop()!;
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]] as const) {
        const nx = qx + dx;
        const ny = qy + dy;
        const nt = ground(nx, ny);
        if (found === null && nt !== undefined && WALL_RUN_TILES.includes(nt as Tile)) {
          found = skinAt ? skinAt(nx, ny).floorTones : null;
        }
        const key = `${nx},${ny}`;
        if (nt === Tile.PorchDeck && !seen.has(key)) {
          seen.add(key);
          members.push(key);
          queue.push([nx, ny]);
        }
      }
    }
    for (const m of members) patchSkin.set(m, found);
    return found;
  };
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      if (!isPorchSurface(ground, tx, ty)) continue;
      if (include && !include(tx, ty)) continue;
      const gx = lx * px;
      const gy = ly * px;
      const hasN = isPorchSurface(ground, tx, ty - 1);
      const hasS = isPorchSurface(ground, tx, ty + 1);
      const hasE = isPorchSurface(ground, tx + 1, ty);
      const hasW = isPorchSurface(ground, tx - 1, ty);
      const tones = skinFor(tx, ty) ?? undefined;
      const fasciaBase = tones ? tones[3]! : '#856a44';
      // Standing shadow on the land south of the deck: flat-art AO.
      if (!hasS) {
        ctx.fillStyle = 'rgba(30, 22, 12, 0.2)';
        ctx.fillRect(gx, gy + px, px, px * 0.16);
        ctx.fillStyle = 'rgba(30, 22, 12, 0.1)';
        ctx.fillRect(gx, gy + px + px * 0.16, px, px * 0.14);
      }
      // Root shade where the deck meets its house or the yard north.
      if (!hasN) {
        ctx.fillStyle = 'rgba(30, 22, 12, 0.24)';
        ctx.fillRect(gx, gy - liftB - px * 0.045, px, px * 0.045);
      }
      // The boards, in the house's own wood when a wall adjoins.
      paintDeckBoards(ctx, tx, ty, gx, gy, px, liftB, 'porch', false, tones);
      // South fascia: the rim joist that makes the lift honest, with
      // squared footing blocks carrying it to the ground.
      if (!hasS) {
        const fy = gy + px - liftB;
        ctx.fillStyle = shade(fasciaBase, -26);
        ctx.fillRect(gx, fy, px, liftB);
        ctx.fillStyle = shade(fasciaBase, -8);
        ctx.fillRect(gx, fy, px, Math.max(1.5, liftB * 0.24));
        ctx.fillStyle = 'rgba(24, 15, 6, 0.35)';
        ctx.fillRect(gx, fy + liftB - Math.max(1.5, liftB * 0.18), px, Math.max(1.5, liftB * 0.18));
        for (const fpos of [0.16, 0.84] as const) {
          const bw = px * 0.12;
          const bx = gx + fpos * px - bw / 2;
          ctx.fillStyle = shade(fasciaBase, -34);
          ctx.fillRect(bx, gy + px - Math.max(1.5, liftB * 0.2), bw, Math.max(2, liftB * 0.2) + px * 0.05);
        }
      }
      // The tread step: a full-width squared course where the deck
      // opens onto walkable ground (the porch invites the yard in).
      const southT = ground(tx, ty + 1);
      if (!hasS && southT !== undefined && !tileDef(southT).solid && southT !== Tile.PorchDeck) {
        const sw = px * 0.56;
        const sx2 = gx + (px - sw) / 2;
        const stepH = Math.max(2, liftB * 0.5);
        ctx.fillStyle = shade(fasciaBase, -30);
        ctx.fillRect(sx2, gy + px, sw, stepH);
        ctx.fillStyle = tones ? tones[0]! : '#997a50';
        ctx.fillRect(sx2, gy + px - Math.max(1.5, px * 0.02), sw, Math.max(2, px * 0.035));
        beginDeckOutline(ctx, px);
        ctx.strokeRect(sx2, gy + px - Math.max(1.5, px * 0.02), sw, stepH + Math.max(1.5, px * 0.02));
      }
      // THE RING at bake time, exposed edges only (the deck-outline
      // law): lifted top edge, side verticals, fascia foot and caps.
      beginDeckOutline(ctx, px);
      ctx.beginPath();
      const topY = gy - liftB;
      if (!hasN) {
        ctx.moveTo(gx, topY);
        ctx.lineTo(gx + px, topY);
      }
      if (!hasW) {
        ctx.moveTo(gx, topY);
        ctx.lineTo(gx, gy + px - (hasS ? liftB : 0));
      }
      if (!hasE) {
        ctx.moveTo(gx + px, topY);
        ctx.lineTo(gx + px, gy + px - (hasS ? liftB : 0));
      }
      if (!hasS) {
        ctx.moveTo(gx, gy + px);
        ctx.lineTo(gx + px, gy + px);
      }
      ctx.stroke();
    }
  }
}

function drawDocks(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
  include?: (tx: number, ty: number) => boolean,
): void {
  const liftB = Math.round((DOCK_LIFT / FLAT) * px);
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      const gx = lx * px;
      const gy = ly * px;
      if (!isDockTile(ground, tx, ty)) {
        // 45° notch fills owned by this pass (deckFillAt).
        const f = deckFillAt(ground, tx, ty);
        if (f !== null && f.family === 'dock' && (!include || include(tx, ty))) {
          drawDeckFill(ctx, ground, f, tx, ty, gx, gy, px);
        }
        continue;
      }
      if (include && !include(tx, ty)) continue;
      // Raw deck-family neighbors decide board direction; EXPOSURE
      // (fascia, shadow, strokes) also honors a notch fill welded to
      // the edge — a covered edge is interior, never a face.
      const deckN = isDeckGround(ground(tx, ty - 1));
      const deckS = isDeckGround(ground(tx, ty + 1));
      const deckE = isDeckGround(ground(tx + 1, ty));
      const deckW = isDeckGround(ground(tx - 1, ty));
      const hasN = deckN || fillCoversEdge(ground, tx, ty - 1, 'S');
      const hasS = deckS || fillCoversEdge(ground, tx, ty + 1, 'N');
      const hasE = deckE || fillCoversEdge(ground, tx + 1, ty, 'W');
      const hasW = deckW || fillCoversEdge(ground, tx - 1, ty, 'E');
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

      // The deck itself, lifted — the floor-law course painter.
      const dy0 = gy - liftB;
      const vertRun = deckN || deckS || (!deckE && !deckW);
      paintDeckBoards(ctx, tx, ty, gx, gy, px, liftB, 'dock', vertRun);

      // Silhouette ring, exposed edges only (the outline-shader law:
      // the same struct ink walls and props wear, baked once). The
      // south face closes at its FOOT too, and the fascia's ends cap
      // wherever the neighbor doesn't hang a matching face.
      beginDeckOutline(ctx, px);
      ctx.beginPath();
      if (!hasN) {
        ctx.moveTo(gx, dy0);
        ctx.lineTo(gx + px, dy0);
      }
      if (!hasS) {
        ctx.moveTo(gx, dy0 + px);
        ctx.lineTo(gx + px, dy0 + px);
        ctx.moveTo(gx, gy + px);
        ctx.lineTo(gx + px, gy + px);
        if (!southExposed(ground, tx - 1, ty) && deckFillAt(ground, tx - 1, ty)?.legs !== 'NE') {
          ctx.moveTo(gx, dy0 + px);
          ctx.lineTo(gx, gy + px);
        }
        if (!southExposed(ground, tx + 1, ty) && deckFillAt(ground, tx + 1, ty)?.legs !== 'NW') {
          ctx.moveTo(gx + px, dy0 + px);
          ctx.lineTo(gx + px, gy + px);
        }
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

/** Does the deck tile at (x,y) hang an exposed south face? Feeds the
 *  fascia end-cap law: a rim's end only caps where no neighbor face
 *  (straight or 45° fill fascia) carries the line onward. */
function southExposed(ground: GroundSampler, x: number, y: number): boolean {
  return (
    isDeckTile(ground, x, y) &&
    !isDeckGround(ground(x, y + 1)) &&
    !fillCoversEdge(ground, x, y + 1, 'N')
  );
}

/** Bridge carpentry tones — rim joists, piles, sills. The crossing is
 *  TIMBER through and through (the old pale stone kit read as concrete
 *  slabs stuck onto a boardwalk — user-rejected). */
const BRIDGE_TIMBER = {
  /** Rim joist: the deck's visible thickness, one weathered board. */
  rim: '#5c4527',
  /** Pile body driven into the water, and its sun-law lit west edge. */
  pile: '#4a3620',
  pileLit: '#6d5233',
  /** Cross-brace between a pile pair. */
  brace: '#3f2d18',
  /** Sill plank across a land entrance — warmer, boot-worn. */
  sill: '#7b5d38',
};

/** Board tones for bridge decks — a touch greyer than dock lumber:
 *  a public crossing weathered by every boot in town. */
const BRIDGE_TONES = ['#997a50', '#8e7049', '#a28356', '#856a44'];

/** The world's outline ink — MUST equal Renderer.STRUCT_OUTLINE. The
 *  decks wear the same bold dark edge as walls, props and entities
 *  (the outline "shader"), stroked at BAKE time on exposed silhouette
 *  edges only, so the ring costs nothing per frame. */

/**
 * THE PORCH (exterior decor Phase 3): a lifted deck on dry land — the
 * dock's stance without the water gate. THE CARRIED DECK rule: porch
 * furniture (rails, posts, lamps, and the prop family) laid ON the
 * deck replaces the tile, but the boards must run beneath it — any
 * such tile with a PorchDeck cardinal neighbour keeps its decking and
 * its lift. The renderer's porchAt mirrors this exactly.
 */
export function porchCarries(t: number | undefined): boolean {
  if (t === undefined) return false;
  return (
    t === Tile.RailWood ||
    t === Tile.TimberPost ||
    t === Tile.LampPost ||
    (t >= Tile.Barrel && t <= Tile.Basin)
  );
}

export function isPorchSurface(ground: GroundSampler, tx: number, ty: number): boolean {
  const t = ground(tx, ty);
  if (t === Tile.PorchDeck) return true;
  if (!porchCarries(t)) return false;
  return (
    ground(tx, ty - 1) === Tile.PorchDeck ||
    ground(tx, ty + 1) === Tile.PorchDeck ||
    ground(tx + 1, ty) === Tile.PorchDeck ||
    ground(tx - 1, ty) === Tile.PorchDeck
  );
}

const STRUCT_INK = '#241a2e';

/** Arm the bake context for a deck silhouette stroke. */
function beginDeckOutline(ctx: CanvasRenderingContext2D, px: number): void {
  ctx.strokeStyle = STRUCT_INK;
  ctx.lineWidth = Math.max(1.5, px * 0.055);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

/**
 * THE FLOOR LAW (bridge rework round 5). Deck boards lie in HORIZONTAL
 * courses on EVERY span axis. In this oblique projection a horizontal
 * course always reads as a floor plane seen from the tilted bird's
 * eye; the old across-the-walk stripes turned every E-W span into
 * full-height vertical strips — the exact visual grammar of board-and-
 * batten SIDING, so whole crossings read as plank walls (user-rejected
 * with screenshots). The walk axis now speaks only through joint
 * rhythm (long planks run an E-W walk; cross-boards on a N-S span
 * break in a brick bond), kerbs, rails and thresholds.
 *
 * The 2.5D hand: course heights FORESHORTEN (far/north courses run a
 * touch shallower than near ones — one tile reads as a tilted plane,
 * not graph paper), and interior course seams ride a slow world-x
 * sine so the planking sits slightly askew, hand-laid. The wobble is
 * pinned to ZERO at the tile-edge courses, so exposed deck edges stay
 * flush with fascia and neighbors by construction. Everything is
 * world-keyed: rows, segments, joints and pips continue unbroken
 * across tiles, chunk seams and resolution tiers.
 */
function paintDeckBoards(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  gx: number,
  gy: number,
  px: number,
  liftB: number,
  family: 'bridge' | 'dock' | 'porch',
  vertRun: boolean,
  tonesOverride?: readonly string[],
): void {
  const seam = Math.max(1, px * 0.02);
  const dy0 = gy - liftB;
  const tones =
    tonesOverride ?? (family === 'bridge' ? BRIDGE_TONES : DOCK_TONES);
  ctx.fillStyle = family === 'bridge' ? '#54402a' : family === 'porch' ? '#574128' : '#5a4326';
  ctx.fillRect(gx, dy0, px, px);
  const ROWS = 5;
  // Foreshortened course grid: cumulative fractions on a mild power
  // curve — ~25% relative depth gain from the far course to the near.
  const frac = (r: number): number => Math.pow(r / ROWS, 1.09);
  const wobAt = (r: number, wx: number): number => {
    const f = frac(r);
    // sin(πf) envelope pins the tile-edge seams straight.
    return px * 0.014 * Math.sin(wx * 1.9 + (ty * ROWS + r) * 2.17) * Math.sin(Math.PI * f);
  };
  const yT = (r: number, wx: number): number => dy0 + frac(r) * px + wobAt(r, wx);
  for (let r = 0; r < ROWS; r++) {
    const rowW = ty * ROWS + r;
    const hL = hashCoords(163, rowW, 0);
    // Long planks run an E-W walk; a N-S span's cross-boards break in
    // a brick bond (alternating half-tile offsets, jittered) so a two-
    // wide crossing never collapses to one straight seam.
    const len = vertRun ? 1 : 1.5 + (hL % 3) * 0.35;
    const phase = vertRun
      ? (rowW % 2) * 0.5 + ((hL >>> 4) % 13) / 100
      : (((hL >>> 4) % 97) / 97) * len;
    let u0 = tx;
    const si0 = Math.floor((tx + phase) / len);
    const si1 = Math.floor((tx + 1 + phase) / len);
    for (let si = si0; si <= si1; si++) {
      const segEnd = (si + 1) * len - phase;
      const u1 = Math.min(tx + 1, segEnd);
      if (u1 - u0 > 0.01) {
        const x0 = gx + (u0 - tx) * px;
        const x1 = gx + (u1 - tx) * px;
        ctx.fillStyle = tones[hashCoords(165, rowW, si) % 4]!;
        ctx.beginPath();
        ctx.moveTo(x0, yT(r, u0));
        ctx.lineTo(x1, yT(r, u1));
        ctx.lineTo(x1, yT(r + 1, u1) - seam);
        ctx.lineTo(x0, yT(r + 1, u0) - seam);
        ctx.closePath();
        ctx.fill();
      }
      // Butt joint at the segment boundary: a dark seam with a hint of
      // hand-sawn lean.
      if (segEnd > tx + 0.02 && segEnd < tx + 0.98) {
        const xj = gx + (segEnd - tx) * px;
        const lean = ((hashCoords(167, rowW, si) % 5) - 2) * px * 0.008;
        ctx.strokeStyle = 'rgba(40, 26, 14, 0.55)';
        ctx.lineWidth = Math.max(1, px * 0.022);
        ctx.beginPath();
        ctx.moveTo(xj + lean, yT(r, segEnd) + seam * 0.5);
        ctx.lineTo(xj - lean, yT(r + 1, segEnd) - seam * 1.2);
        ctx.stroke();
      }
      u0 = u1;
    }
    // Nail pips over the joist stations and the odd grain tick — kept
    // sparse; the blit squash flattens anything busier into noise.
    const hN = hashCoords(169, rowW, tx);
    if (hN % 3 === 0) {
      const fx = 0.22 + ((hN >>> 3) % 2) * 0.56 + ((hN >>> 5) % 13) / 100;
      const ny = (yT(r, tx + fx) + yT(r + 1, tx + fx)) / 2;
      const np = Math.max(1, px * 0.02);
      ctx.fillStyle = 'rgba(30, 20, 10, 0.4)';
      ctx.fillRect(gx + fx * px - np / 2, ny - np / 2, np, np);
    }
    if (hN % 7 === 3) {
      const fx0 = ((hN >>> 6) % 60) / 100;
      const fw = 0.14 + ((hN >>> 9) % 20) / 100;
      const fy = 0.3 + ((hN >>> 11) % 40) / 100;
      const gy0 = yT(r, tx + fx0) + (frac(r + 1) - frac(r)) * px * fy;
      ctx.strokeStyle = 'rgba(46, 30, 16, 0.3)';
      ctx.lineWidth = Math.max(1, px * 0.014);
      ctx.beginPath();
      ctx.moveTo(gx + fx0 * px, gy0);
      ctx.lineTo(gx + Math.min(fx0 + fw, 1) * px, gy0);
      ctx.stroke();
    }
  }
}

/**
 * THE BRIDGE PASS. A bridge is the dock's opposite statement: not
 * suspended over the water but SEATED INTO both banks. Every tile
 * paints, bottom to top:
 *
 *   standing shadow on the water south of the span → chunky STONE
 *   PIERS at full-height south water edges with waterline collars →
 *   the south face: over water a stone FASCIA with a chamfered ARCH
 *   shadow sprung between the piers; at a land threshold two STONE
 *   STEP courses → the plank deck (boards run ACROSS the walk axis,
 *   one span-wide verdict) with dark KERB stringers along the sides
 *   and a stone threshold course across every land entrance →
 *   perimeter strokes on exposed edges, never across a ramp mouth.
 *
 * APRONS RAMP (bridgeApronAt): the walk-end tiles shear their whole
 * deck kit from grade up to the full lift inside one canvas
 * transform, and a west/east ramp grows a WING WALL — the sloping
 * stone flank that seats the crossing into the bank. renderLift
 * interpolates the identical slope, so bodies walk up the ramp.
 *
 * The hip-height rails along the sides are NOT baked — the renderer
 * emits them as y-sorted items (slope-aware on aprons) so bodies
 * walk behind them.
 */
function drawBridges(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
  include?: (tx: number, ty: number) => boolean,
): void {
  const liftB = Math.round((DOCK_LIFT / FLAT) * px);
  const isLand = (t: number | undefined): boolean =>
    t !== undefined && !isDeckGround(t) && !isWaterTile(t);
  // One walk-axis flood per span, shared by every member tile.
  const axisMemo = new Map<number, boolean>();
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      const gx = lx * px;
      const gy = ly * px;
      if (!isBridgeTile(ground, tx, ty)) {
        // 45° notch fills owned by this pass (deckFillAt).
        const f = deckFillAt(ground, tx, ty);
        if (f !== null && f.family === 'bridge' && (!include || include(tx, ty))) {
          drawDeckFill(ctx, ground, f, tx, ty, gx, gy, px, axisMemo);
        }
        continue;
      }
      if (include && !include(tx, ty)) continue;
      const nT = ground(tx, ty - 1);
      const sT = ground(tx, ty + 1);
      const eT = ground(tx + 1, ty);
      const wT = ground(tx - 1, ty);
      // Raw deck-family neighbors keep the land/apron laws honest;
      // EXPOSURE (fascia, piers, kerbs, strokes) also honors a notch
      // fill welded to the edge — a covered edge is interior.
      const deckN = isDeckGround(nT);
      const deckS = isDeckGround(sT);
      const deckE = isDeckGround(eT);
      const deckW = isDeckGround(wT);
      const hasN = deckN || fillCoversEdge(ground, tx, ty - 1, 'S');
      const hasS = deckS || fillCoversEdge(ground, tx, ty + 1, 'N');
      const hasE = deckE || fillCoversEdge(ground, tx + 1, ty, 'W');
      const hasW = deckW || fillCoversEdge(ground, tx - 1, ty, 'E');
      const landN = !deckN && isLand(nT);
      const landS = !deckS && isLand(sT);
      const landE = !deckE && isLand(eT);
      const landW = !deckW && isLand(wT);
      const waterS = isWaterTile(sT);

      // Walk axis + apron first — the whole tile's geometry hangs on
      // them. One axis verdict per span (memoized flood); the apron
      // is the walk-end tile that ramps down to grade.
      let vertRun = axisMemo.get(packDeck(tx, ty)); // true = walk runs N-S
      if (vertRun === undefined) vertRun = deckWalkIsVertical(ground, tx, ty, axisMemo);
      const apron = bridgeApronAt(ground, tx, ty, vertRun);
      const dy0 = gy - liftB;

      // Standing shadow: the span's mass hangs over the water — a
      // ramp's shadow thins with its falling height.
      if (!hasS && waterS && apron !== 'S') {
        const shA = apron === 'W' || apron === 'E' ? 0.6 : 1;
        ctx.fillStyle = `rgba(20, 34, 62, ${0.26 * shA})`;
        ctx.fillRect(gx, gy + px, px, px * 0.2);
        ctx.fillStyle = `rgba(20, 34, 62, ${0.12 * shA})`;
        ctx.fillRect(gx, gy + px + px * 0.2, px, px * 0.18);
      }

      // Timber pile pairs: the legs the full-height span stands on (a
      // ramp's mass is its raked stringer — no legs). A north apron's
      // south edge is at full lift, so it keeps its piles. An X of
      // cross-bracing ties each pair — the carpentry that sells a
      // standing trestle.
      if (!hasS && waterS && (apron === 'none' || apron === 'N')) {
        const pw = px * 0.13;
        const top = gy + px - liftB * 0.3;
        const bot = gy + px + px * 0.16;
        const c0 = gx + 0.18 * px;
        const c1 = gx + 0.82 * px;
        ctx.strokeStyle = BRIDGE_TIMBER.brace;
        ctx.lineWidth = Math.max(1.2, px * 0.032);
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(c0 + pw * 0.3, gy + px - liftB * 0.05);
        ctx.lineTo(c1 - pw * 0.3, bot - px * 0.02);
        ctx.moveTo(c1 - pw * 0.3, gy + px - liftB * 0.05);
        ctx.lineTo(c0 + pw * 0.3, bot - px * 0.02);
        ctx.stroke();
        ctx.globalAlpha = 1;
        for (const cx0 of [c0, c1]) {
          const pxl = cx0 - pw / 2;
          ctx.fillStyle = BRIDGE_TIMBER.pile;
          ctx.fillRect(pxl, top, pw, bot - top);
          ctx.fillStyle = BRIDGE_TIMBER.pileLit; // sun-law lit west edge
          ctx.fillRect(pxl, top, Math.max(1, pw * 0.32), bot - top);
          ctx.strokeStyle = 'rgba(226, 240, 251, 0.5)';
          ctx.lineWidth = Math.max(1.2, px * 0.03);
          ctx.beginPath();
          ctx.ellipse(pxl + pw / 2, bot, pw * 0.8, pw * 0.8 * FLAT, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // The south face of the full-height span (west/east ramps grow
      // wing walls after the deck instead; a south ramp pours flush
      // onto the bank and needs only its seat shadow).
      if (apron === 'S') {
        ctx.fillStyle = 'rgba(30, 22, 12, 0.2)';
        ctx.fillRect(gx, gy + px, px, px * 0.05);
      }
      if (!hasS && (apron === 'none' || apron === 'N')) {
        // Rim joist: the deck's visible timber thickness — a weathered
        // board hung under the south edge, over water and land alike.
        ctx.fillStyle = BRIDGE_TIMBER.rim;
        ctx.fillRect(gx, gy + px - liftB, px, liftB);
        // Catch-light lip, the under-deck shadow foot, and support
        // ticks tying the rim to its pile stations.
        ctx.fillStyle = 'rgba(222, 184, 122, 0.32)';
        ctx.fillRect(gx, gy + px - liftB, px, Math.max(1, px * 0.02));
        ctx.fillStyle = 'rgba(20, 14, 7, 0.42)';
        ctx.fillRect(gx, gy + px - Math.max(1.5, liftB * 0.16), px, Math.max(1.5, liftB * 0.16));
        if (waterS) {
          ctx.fillStyle = 'rgba(24, 16, 8, 0.28)';
          for (const fpos of [0.18, 0.82]) {
            ctx.fillRect(gx + fpos * px - px * 0.02, gy + px - liftB, px * 0.04, liftB);
          }
        }
        // A rim joint where the world says the board breaks.
        const hj = hashCoords(171, tx, ty);
        if (hj % 3 === 0) {
          const fx = 0.2 + ((hj >>> 4) % 60) / 100;
          ctx.fillStyle = 'rgba(30, 20, 10, 0.35)';
          ctx.fillRect(gx + fx * px, gy + px - liftB, Math.max(1, px * 0.02), liftB);
        }
        if (landS) {
          // The seat shadow on the bank: the mass presses into land.
          ctx.fillStyle = 'rgba(30, 22, 12, 0.2)';
          ctx.fillRect(gx, gy + px, px, px * 0.07);
        }
        // Silhouette foot: the rim closes at its bottom edge, capped
        // at either end unless a neighbor face (straight rim or a 45°
        // fill fascia) carries the line onward — no more floating rim
        // ends at the bank junctions.
        beginDeckOutline(ctx, px);
        ctx.beginPath();
        ctx.moveTo(gx, gy + px);
        ctx.lineTo(gx + px, gy + px);
        if (!southExposed(ground, tx - 1, ty) && deckFillAt(ground, tx - 1, ty)?.legs !== 'NE') {
          ctx.moveTo(gx, gy + px - liftB);
          ctx.lineTo(gx, gy + px);
        }
        if (!southExposed(ground, tx + 1, ty) && deckFillAt(ground, tx + 1, ty)?.legs !== 'NW') {
          ctx.moveTo(gx + px, gy + px - liftB);
          ctx.lineTo(gx + px, gy + px);
        }
        ctx.stroke();
      }

      // THE RAMP TRANSFORM: aprons draw the same flat deck kit and
      // the canvas does the sloping — west/east ramps shear, north/
      // south ramps stretch — so boards, kerbs, thresholds, contact
      // shade and strokes all ride one surface.
      ctx.save();
      if (apron === 'W') {
        ctx.translate(gx, 0);
        ctx.transform(1, -liftB / px, 0, 1, 0, liftB);
        ctx.translate(-gx, 0);
      } else if (apron === 'E') {
        ctx.translate(gx, 0);
        ctx.transform(1, liftB / px, 0, 1, 0, 0);
        ctx.translate(-gx, 0);
      } else if (apron === 'N') {
        ctx.translate(0, dy0 + liftB);
        ctx.scale(1, 1 - liftB / px);
        ctx.translate(0, -dy0);
      } else if (apron === 'S') {
        ctx.translate(0, dy0);
        ctx.scale(1, 1 + liftB / px);
        ctx.translate(0, -dy0);
      }

      // Contact shade where the deck meets the north bank — drawn in
      // the ramp frame so it hugs a sloping seam too.
      if (landN) {
        ctx.fillStyle = 'rgba(30, 22, 12, 0.22)';
        ctx.fillRect(gx, dy0 - px * 0.05, px, px * 0.05);
      }

      paintDeckBoards(ctx, tx, ty, gx, gy, px, liftB, 'bridge', vertRun);

      // Sides vs ends, by the span's walk axis: the SIDES (the edges
      // a rail runs along) are perpendicular to the walk; the ENDS
      // carry the entrances. Kerbs dress every exposed side — over
      // water AND over the bank aprons, so the parapet line runs the
      // whole span; thresholds and newels only ever face the walk.
      const kerbN = !hasN && !vertRun;
      const kerbS = !hasS && !vertRun;
      const kerbW = !hasW && vertRun;
      const kerbE = !hasE && vertRun;
      const thN = landN && vertRun;
      const thS = landS && vertRun;
      const thW = landW && !vertRun;
      const thE = landE && !vertRun;

      // Kerb stringers: the dark curb the rails bolt to, with a lit
      // inner line to pop it off the boards.
      const kerb = Math.max(1.5, px * 0.085);
      const lit = Math.max(1, px * 0.015);
      ctx.fillStyle = '#63492c';
      if (kerbN) ctx.fillRect(gx, dy0, px, kerb);
      if (kerbS) ctx.fillRect(gx, dy0 + px - kerb, px, kerb);
      if (kerbW) ctx.fillRect(gx, dy0, kerb, px);
      if (kerbE) ctx.fillRect(gx + px - kerb, dy0, kerb, px);
      ctx.fillStyle = 'rgba(214, 178, 120, 0.25)';
      if (kerbN) ctx.fillRect(gx, dy0 + kerb, px, lit);
      if (kerbS) ctx.fillRect(gx, dy0 + px - kerb - lit, px, lit);
      if (kerbW) ctx.fillRect(gx + kerb, dy0, lit, px);
      if (kerbE) ctx.fillRect(gx + px - kerb - lit, dy0, lit, px);

      // Land entrances: a proud SILL PLANK across the walk — a warmer,
      // boot-worn board that seats the crossing onto the bank. The
      // rail end posts finish the entrance; no masonry furniture.
      const th = Math.max(2, px * 0.11);
      const joint = Math.max(1, px * 0.02);
      const lip = Math.max(1, px * 0.018);
      ctx.fillStyle = BRIDGE_TIMBER.sill;
      if (thN) ctx.fillRect(gx, dy0, px, th);
      if (thS) ctx.fillRect(gx, dy0 + px - th, px, th);
      if (thW) ctx.fillRect(gx, dy0, th, px);
      if (thE) ctx.fillRect(gx + px - th, dy0, th, px);
      // The sill's lit face toward the walker, then the seam shadow
      // where the deck boards butt against it.
      ctx.fillStyle = 'rgba(224, 186, 124, 0.3)';
      if (thN) ctx.fillRect(gx, dy0, px, lip);
      if (thS) ctx.fillRect(gx, dy0 + px - th, px, lip);
      if (thW) ctx.fillRect(gx, dy0, lip, px);
      if (thE) ctx.fillRect(gx + px - th, dy0, lip, px);
      ctx.fillStyle = 'rgba(30, 24, 14, 0.35)';
      if (thN) ctx.fillRect(gx, dy0 + th, px, joint);
      if (thS) ctx.fillRect(gx, dy0 + px - th - joint, px, joint);
      if (thW) ctx.fillRect(gx + th, dy0, joint, px);
      if (thE) ctx.fillRect(gx + px - th - joint, dy0, joint, px);

      // Perimeter ring, exposed edges only (the outline-shader law —
      // struct ink, baked once) — but NEVER across a ramp mouth: the
      // road runs straight onto the boards, and a dark line there
      // would cut the seam the whole apron exists to erase.
      beginDeckOutline(ctx, px);
      ctx.beginPath();
      if (!hasN && apron !== 'N') {
        ctx.moveTo(gx, dy0);
        ctx.lineTo(gx + px, dy0);
      }
      if (!hasS && apron !== 'S') {
        ctx.moveTo(gx, dy0 + px);
        ctx.lineTo(gx + px, dy0 + px);
      }
      if (!hasW && apron !== 'W') {
        ctx.moveTo(gx, dy0);
        ctx.lineTo(gx, dy0 + px);
      }
      if (!hasE && apron !== 'E') {
        ctx.moveTo(gx + px, dy0);
        ctx.lineTo(gx + px, dy0 + px);
      }
      ctx.stroke();
      ctx.restore();

      // RAKED STRINGER: a west/east ramp shows its flank — the sloping
      // timber that carries the deck from the bank up to full lift,
      // from the falling south edge down to the ground line.
      if ((apron === 'W' || apron === 'E') && !hasS) {
        const hiX = apron === 'W' ? gx + px : gx;
        const loX = apron === 'W' ? gx : gx + px;
        ctx.fillStyle = BRIDGE_TIMBER.rim;
        ctx.beginPath();
        ctx.moveTo(loX, gy + px);
        ctx.lineTo(hiX, gy + px - liftB);
        ctx.lineTo(hiX, gy + px);
        ctx.closePath();
        ctx.fill();
        // Catch-light along the raked top edge, and the seat shadow.
        ctx.strokeStyle = 'rgba(222, 184, 122, 0.3)';
        ctx.lineWidth = Math.max(1, px * 0.02);
        ctx.beginPath();
        ctx.moveTo(loX, gy + px);
        ctx.lineTo(hiX, gy + px - liftB);
        ctx.stroke();
        ctx.fillStyle = 'rgba(30, 22, 12, 0.2)';
        ctx.fillRect(gx, gy + px, px, px * 0.05);
      }
    }
  }
}

/**
 * ONE 45° NOTCH FILL (deckFillAt): the lifted half-tile deck triangle
 * a stair-step notch grows. The two legs lie flush on the deck-
 * neighbor edges (interior — those neighbors suppress their own edge
 * kit there), the hypotenuse is the exposed 45° edge. The triangle
 * rides DOCK_LIFT like every deck; a south-facing hypotenuse hangs
 * the family's fascia (stone for a bridge, plank for a dock) with a
 * standing shadow on the water and one pier/pile at its midpoint, so
 * the diagonal edge carries the same weight as the straight runs.
 * Paint order mirrors the tile painters: shadow → leg → face → boards
 * → kerb → perimeter stroke.
 */
function drawDeckFill(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  fill: DeckFill,
  tx: number,
  ty: number,
  gx: number,
  gy: number,
  px: number,
  axisMemo?: Map<number, boolean>,
): void {
  const liftB = Math.round((DOCK_LIFT / FLAT) * px);
  const { legs, family, bank } = fill;
  const bridge = family === 'bridge';
  const southFacing = legs[0] === 'N'; // hypotenuse faces the camera
  // The hypotenuse runs corner to corner: NE/SW-leg fills span the
  // main diagonal (NW->SE corner), NW/SE-leg fills the anti-diagonal.
  const diagMain = legs === 'NE' || legs === 'SW';
  const ax0 = diagMain ? gx : gx + px;
  const bx0 = diagMain ? gx + px : gx;
  // Ground-line hyp (a..b) and lifted hyp (deck height): both hyp
  // orientations start on the tile's top row and end on its bottom.
  const ayG = gy;
  const byG = gy + px;
  const ayL = ayG - liftB;
  const byL = byG - liftB;
  // The solid triangle's third corner (lifted), per legs.
  const cx =
    legs === 'NE' ? gx + px
    : legs === 'NW' ? gx
    : legs === 'SE' ? gx + px
    : gx;
  const cy = (legs === 'NE' || legs === 'NW' ? gy : gy + px) - liftB;
  const triPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(ax0, ayL);
    ctx.lineTo(bx0, byL);
    ctx.lineTo(cx, cy);
    ctx.closePath();
  };
  // Interior perpendicular of the hyp (unit, bake space, y down) —
  // points from the hyp toward the solid corner.
  const q = Math.SQRT1_2;
  const ux = (legs === 'NE' || legs === 'SE' ? 1 : -1) * q;
  const uy = (legs === 'SE' || legs === 'SW' ? 1 : -1) * q;

  // Below a camera-facing hyp: over water, the same two stepped AO
  // bands as the straight south edges plus a driven pile; on a BANK
  // fill only the thin contact shade — the wedge presses into land,
  // nothing stands in water.
  if (southFacing) {
    const band = (y0: number, y1: number, style: string): void => {
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.moveTo(ax0, ayG + y0);
      ctx.lineTo(bx0, byG + y0);
      ctx.lineTo(bx0, byG + y1);
      ctx.lineTo(ax0, ayG + y1);
      ctx.closePath();
      ctx.fill();
    };
    if (bank) {
      band(0, px * 0.07, 'rgba(30, 22, 12, 0.2)');
    } else {
      band(0, px * 0.2, 'rgba(20, 34, 62, 0.26)');
      band(px * 0.2, px * 0.38, 'rgba(20, 34, 62, 0.12)');

      // One leg at the hyp midpoint: a driven timber pile for either
      // family — the diagonal stands on the water like every straight
      // bay does.
      const mx = (ax0 + bx0) / 2;
      const myG = (ayG + byG) / 2;
      const pw = bridge ? px * 0.13 : px * 0.11;
      const pxl = mx - pw / 2;
      const top = myG - liftB * (bridge ? 0.3 : 0.25);
      const bot = myG + px * (bridge ? 0.16 : 0.14);
      ctx.fillStyle = bridge ? BRIDGE_TIMBER.pile : '#4e3a22';
      ctx.fillRect(pxl, top, pw, bot - top);
      ctx.fillStyle = bridge ? BRIDGE_TIMBER.pileLit : '#77593a'; // sun-law lit west edge
      ctx.fillRect(pxl, top, Math.max(1, pw * (bridge ? 0.32 : 0.3)), bot - top);
      ctx.strokeStyle = 'rgba(226, 240, 251, 0.5)';
      ctx.lineWidth = Math.max(1.2, px * 0.03);
      ctx.beginPath();
      ctx.ellipse(mx, bot, pw * 0.8, pw * 0.8 * FLAT, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // The face under the hyp: deck thickness made visible, sheared
    // along the diagonal — the family's timber rim, wearing the same
    // dressing lines as the straight bays.
    const face = (yTop: number, yBot: number, style: string): void => {
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.moveTo(ax0, ayL + yTop);
      ctx.lineTo(bx0, byL + yTop);
      ctx.lineTo(bx0, byL + yBot);
      ctx.lineTo(ax0, ayL + yBot);
      ctx.closePath();
      ctx.fill();
    };
    face(0, liftB, bridge ? BRIDGE_TIMBER.rim : '#6d5130');
    if (bridge) {
      face(0, Math.max(1, px * 0.02), 'rgba(222, 184, 122, 0.32)');
      face(liftB - Math.max(1.5, liftB * 0.16), liftB, 'rgba(20, 14, 7, 0.42)');
    } else {
      face(liftB - Math.max(1.5, liftB * 0.22), liftB, 'rgba(30, 19, 9, 0.45)');
      face(0, Math.max(1, px * 0.02), 'rgba(214, 178, 120, 0.28)');
    }
  }

  // The boards, clipped to the lifted triangle. Direction and tones
  // come from the span the fill welds into — the bridge asks the
  // axis flood of its leg neighbor, the dock replays the neighbor's
  // own per-tile rule — and the row hashes key on the same axes as
  // the tile painters, so strips continue across the seam.
  let vertRun: boolean;
  const nx = tx;
  const ny = legs[0] === 'N' ? ty - 1 : ty + 1;
  if (bridge) {
    let vr = axisMemo?.get(packDeck(nx, ny));
    if (vr === undefined) vr = deckWalkIsVertical(ground, nx, ny, axisMemo);
    vertRun = vr;
  } else {
    const dN = isDeckGround(ground(nx, ny - 1));
    const dS = isDeckGround(ground(nx, ny + 1));
    const dE = isDeckGround(ground(nx + 1, ny));
    const dW = isDeckGround(ground(nx - 1, ny));
    vertRun = dN || dS || (!dE && !dW);
  }
  ctx.save();
  triPath();
  ctx.clip();
  paintDeckBoards(ctx, tx, ty, gx, gy, px, liftB, family, vertRun);

  // Kerb stringer along the hyp (bridge only) — the dark curb the
  // rail bolts to, with its lit inner pop, still inside the clip so
  // only the deck-side half of each stroke survives.
  if (bridge) {
    const kerb = Math.max(1.5, px * 0.085);
    const lit = Math.max(1, px * 0.015);
    ctx.strokeStyle = '#63492c';
    ctx.lineWidth = kerb * 2;
    ctx.beginPath();
    ctx.moveTo(ax0, ayL);
    ctx.lineTo(bx0, byL);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214, 178, 120, 0.25)';
    ctx.lineWidth = lit;
    ctx.beginPath();
    ctx.moveTo(ax0 + ux * (kerb + lit), ayL + uy * (kerb + lit));
    ctx.lineTo(bx0 + ux * (kerb + lit), byL + uy * (kerb + lit));
    ctx.stroke();
  }
  ctx.restore();

  // Silhouette ring on the exposed hyp (the outline-shader law) —
  // unclipped, like every straight deck edge. A camera-facing fascia
  // closes at its foot along the ground diagonal and caps its high
  // end, where the face hangs past the last straight rim.
  beginDeckOutline(ctx, px);
  ctx.beginPath();
  ctx.moveTo(ax0, ayL);
  ctx.lineTo(bx0, byL);
  if (southFacing) {
    ctx.moveTo(ax0, ayG);
    ctx.lineTo(bx0, byG);
    ctx.moveTo(ax0, ayL);
    ctx.lineTo(ax0, ayG);
  }
  ctx.stroke();
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
      } else if (
        (m === Tile.CaveFloor || m === Tile.DungeonFloor || m === Tile.CaveRubble) &&
        hg % 5 === 0
      ) {
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
        // THE ONE-LOOM LAW: a rectangular block of Rug tiles is ONE
        // cloth — every member computes the block's full extent and
        // paints the ENTIRE grand composition (house outline, bound
        // border, guard pinlines, block-scale medallion or diamond
        // chain) clipped to its own square, so the great rug assembles
        // seamlessly from identical geometry. Non-rectangular patches
        // fall back to the seamed per-tile weave, border surviving on
        // free edges only.
        const isRug = (x: number, y: number) => dAt?.(x, y) === Detail.Rug;
        const jn = isRug(tx, ty - 1);
        const je = isRug(tx + 1, ty);
        const js = isRug(tx, ty + 1);
        const jw = isRug(tx - 1, ty);
        if (jn || je || js || jw) {
          let ax = tx;
          while (isRug(ax - 1, ty)) ax--;
          let ex = tx;
          while (isRug(ex + 1, ty)) ex++;
          let ay = ty;
          while (isRug(tx, ay - 1)) ay--;
          let ey = ty;
          while (isRug(tx, ey + 1)) ey++;
          let rect = ex - ax < 15 && ey - ay < 15;
          for (let y2 = ay; rect && y2 <= ey; y2++)
            for (let x2 = ax; rect && x2 <= ex; x2++) if (!isRug(x2, y2)) rect = false;
          const ha = hashCoords(211, ax, ay);
          const [bord, field, accent] = RUG_PALETTES[ha % RUG_PALETTES.length]!;
          if (rect) {
            // The whole cloth in this tile's bake space; the clip grows
            // past our square only on FREE rims (outline + fringe live
            // there — no neighbour will ever draw them).
            const rx = gx - (tx - ax) * px + px * 0.07;
            const ry = gy - (ty - ay) * px + px * 0.09;
            const rw = (ex - ax + 1) * px - px * 0.14;
            const rh = (ey - ay + 1) * px - px * 0.18;
            ctx.save();
            ctx.beginPath();
            ctx.rect(
              gx - (jw ? 0 : px * 0.16),
              gy - (jn ? 0 : px * 0.16),
              px + (jw ? 0 : px * 0.16) + (je ? 0 : px * 0.16),
              px + (jn ? 0 : px * 0.16) + (js ? 0 : px * 0.16),
            );
            ctx.clip();
            const diamond = (dx: number, dy: number, r: number, el: number, tone: string): void => {
              ctx.fillStyle = tone;
              ctx.beginPath();
              ctx.moveTo(dx, dy - r);
              ctx.lineTo(dx + r * el, dy);
              ctx.lineTo(dx, dy + r);
              ctx.lineTo(dx - r * el, dy);
              ctx.closePath();
              ctx.fill();
            };
            // Seat the cloth: a whisper of shadow off the south hem.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(rx + px * 0.01, ry + rh, rw - px * 0.02, px * 0.03);
            // THE HOUSE OUTLINE: the bound dark edge every prop wears.
            ctx.fillStyle = '#241a2e';
            ctx.beginPath();
            chamferRect(ctx, rx - px * 0.035, ry - px * 0.035, rw + px * 0.07, rh + px * 0.07, px * 0.085);
            ctx.fill();
            // Bound border band.
            ctx.fillStyle = bord;
            ctx.beginPath();
            chamferRect(ctx, rx, ry, rw, rh, px * 0.055);
            ctx.fill();
            // Guard pinlines riding just inside every rim.
            ctx.fillStyle = 'rgba(240, 232, 210, 0.3)';
            ctx.fillRect(rx + px * 0.045, ry + px * 0.045, rw - px * 0.09, px * 0.022);
            ctx.fillRect(rx + px * 0.045, ry + rh - px * 0.067, rw - px * 0.09, px * 0.022);
            ctx.fillRect(rx + px * 0.045, ry + px * 0.045, px * 0.022, rh - px * 0.09);
            ctx.fillRect(rx + rw - px * 0.067, ry + px * 0.045, px * 0.022, rh - px * 0.09);
            const bw2 = px * 0.17;
            // Diamond beads pacing the long border bands.
            for (let xx = rx + px * 0.34; xx < rx + rw - px * 0.28; xx += px * 0.31) {
              diamond(xx, ry + bw2 * 0.52, px * 0.036, 1.2, accent);
              diamond(xx, ry + rh - bw2 * 0.52, px * 0.036, 1.2, accent);
            }
            // Corner blocks where the border bands meet.
            ctx.fillStyle = accent;
            for (const [ox, oy] of [
              [bw2 * 0.52, bw2 * 0.52],
              [rw - bw2 * 0.52, bw2 * 0.52],
              [bw2 * 0.52, rh - bw2 * 0.52],
              [rw - bw2 * 0.52, rh - bw2 * 0.52],
            ] as const) {
              ctx.fillRect(rx + ox - px * 0.048, ry + oy - px * 0.048, px * 0.096, px * 0.096);
            }
            // The field.
            const fx0 = rx + bw2;
            const fy0 = ry + bw2;
            const fw = rw - bw2 * 2;
            const fh = rh - bw2 * 2;
            ctx.fillStyle = field;
            ctx.fillRect(fx0, fy0, fw, fh);
            // A dark settling line where field meets border.
            ctx.strokeStyle = 'rgba(18, 12, 26, 0.22)';
            ctx.lineWidth = Math.max(1, px * 0.018);
            ctx.strokeRect(fx0, fy0, fw, fh);
            const cx = rx + rw / 2;
            const cy = ry + rh / 2;
            const short = Math.min(fw, fh);
            if (Math.max(fw, fh) > short * 1.9) {
              // A long cloth: a diamond chain walks the runner's spine,
              // linked by its warp thread.
              const horiz = fw >= fh;
              const span = horiz ? fw : fh;
              ctx.fillStyle = accent;
              if (horiz) ctx.fillRect(fx0 + px * 0.06, cy - px * 0.011, fw - px * 0.12, px * 0.022);
              else ctx.fillRect(cx - px * 0.011, fy0 + px * 0.06, px * 0.022, fh - px * 0.12);
              const n = Math.max(2, Math.round(span / (short * 0.85)));
              for (let k = 0; k < n; k++) {
                const t2 = (k + 0.5) / n;
                const mx = horiz ? fx0 + fw * t2 : cx;
                const my = horiz ? cy : fy0 + fh * t2;
                diamond(mx, my, short * 0.21, 1.25, k % 2 === 0 ? accent : bord);
                diamond(mx, my, short * 0.105, 1.25, k % 2 === 0 ? bord : field);
                diamond(mx, my, short * 0.04, 1.25, accent);
              }
            } else {
              // The grand medallion: stepped diamonds at the heart,
              // gusset diamonds answering from the field's corners.
              ctx.save();
              ctx.beginPath();
              ctx.rect(fx0, fy0, fw, fh);
              ctx.clip();
              for (const [gx2, gy2] of [
                [fx0, fy0],
                [fx0 + fw, fy0],
                [fx0, fy0 + fh],
                [fx0 + fw, fy0 + fh],
              ] as const) {
                diamond(gx2, gy2, short * 0.2, 1.3, bord);
                diamond(gx2, gy2, short * 0.11, 1.3, accent);
              }
              ctx.restore();
              diamond(cx, cy, short * 0.34, 1.3, bord);
              diamond(cx, cy, short * 0.26, 1.3, accent);
              diamond(cx, cy, short * 0.165, 1.3, field);
              diamond(cx, cy, short * 0.065, 1.3, accent);
            }
            // Weave sheen: faint weft lines carried across the cloth.
            ctx.fillStyle = 'rgba(240, 232, 210, 0.05)';
            for (let yy = ry + px * 0.12; yy < ry + rh - px * 0.05; yy += px * 0.22)
              ctx.fillRect(rx + px * 0.04, yy, rw - px * 0.08, px * 0.016);
            // Knotted fringe off the two loom ends, past the outline.
            ctx.fillStyle = '#d8c9a0';
            for (let yy = ry + px * 0.06; yy < ry + rh - px * 0.04; yy += px * 0.13) {
              ctx.fillRect(rx - px * 0.088, yy, px * 0.05, px * 0.024);
              ctx.fillRect(rx + rw + px * 0.038, yy + px * 0.012, px * 0.05, px * 0.024);
            }
            ctx.restore();
            return;
          }
          const x0 = gx + (jw ? 0 : px * 0.06);
          const x1 = gx + (je ? px : px * 0.94);
          const y0 = gy + (jn ? 0 : px * 0.09);
          const y1 = gy + (js ? px : px * 0.91);
          if (!js) {
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(x0 + px * 0.01, y1, x1 - x0 - px * 0.02, px * 0.025);
          }
          // THE HOUSE OUTLINE on the cloth's free rim only — joined
          // edges stay bare so the patch reads as one seamed cloth.
          ctx.fillStyle = '#241a2e';
          ctx.beginPath();
          chamferRect(
            ctx,
            x0 - (jw ? 0 : px * 0.03),
            y0 - (jn ? 0 : px * 0.03),
            x1 - x0 + (jw ? 0 : px * 0.03) + (je ? 0 : px * 0.03),
            y1 - y0 + (jn ? 0 : px * 0.03) + (js ? 0 : px * 0.03),
            [
              jn || jw ? 0 : px * 0.06,
              jn || je ? 0 : px * 0.06,
              js || je ? 0 : px * 0.06,
              js || jw ? 0 : px * 0.06,
            ],
          );
          ctx.fill();
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
        // THE HOUSE OUTLINE: the bound dark edge every prop wears.
        ctx.fillStyle = '#241a2e';
        ctx.beginPath();
        chamferRect(ctx, rx - px * 0.03, ry - px * 0.03, rw + px * 0.06, rh + px * 0.06, px * 0.06);
        ctx.fill();
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
        // THE HOUSE OUTLINE ringing the bound rim.
        ctx.fillStyle = '#241a2e';
        ctx.beginPath();
        facetCircle(ctx, cx, cy, px * 0.478, 10, 0.2);
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
      } else if (d === Detail.CarpetRoyal || d === Detail.CarpetMoon) {
        // FITTED VELVET: the state carpet. Braid, outline, and mitered
        // corners live only on FREE edges — the field knits seamlessly
        // through joined ones, so runs lay processional runners and
        // blocks carpet whole state rooms. The diagonal nap sheen is
        // keyed to (x − y) in bake space: chunk offsets are whole
        // multiples of the stripe period, so the pile catches light
        // continuously across every border by construction.
        const moon = d === Detail.CarpetMoon;
        const isC = (x: number, y: number) => dAt?.(x, y) === d;
        const jn = isC(tx, ty - 1);
        const je = isC(tx + 1, ty);
        const js = isC(tx, ty + 1);
        const jw = isC(tx - 1, ty);
        const field = moon ? '#3f5580' : '#7e1f2e';
        const braid = moon ? '#b4c0d6' : '#c9962e';
        const ins = px * 0.05; // free-edge inset off the skirting
        const o = px * 0.03; // house-outline weight
        const bw = px * 0.105; // outline + braid band depth
        const x0 = gx + (jw ? 0 : ins);
        const x1 = gx + px - (je ? 0 : ins);
        const y0 = gy + (jn ? 0 : ins);
        const y1 = gy + px - (js ? 0 : ins);
        // Seat the cloth off a free south hem.
        if (!js) {
          ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
          ctx.fillRect(x0 + px * 0.01, y1, x1 - x0 - px * 0.02, px * 0.025);
        }
        // THE HOUSE OUTLINE, free rim only; joined edges meet flush.
        ctx.fillStyle = '#241a2e';
        ctx.beginPath();
        chamferRect(ctx, x0, y0, x1 - x0, y1 - y0, [
          jn || jw ? 0 : px * 0.05,
          jn || je ? 0 : px * 0.05,
          js || je ? 0 : px * 0.05,
          js || jw ? 0 : px * 0.05,
        ]);
        ctx.fill();
        // The metal braid band inside the outline.
        ctx.fillStyle = braid;
        ctx.fillRect(
          x0 + (jw ? 0 : o),
          y0 + (jn ? 0 : o),
          x1 - x0 - (jw ? 0 : o) - (je ? 0 : o),
          y1 - y0 - (jn ? 0 : o) - (js ? 0 : o),
        );
        // The velvet field.
        const fx0 = x0 + (jw ? 0 : bw);
        const fx1 = x1 - (je ? 0 : bw);
        const fy0 = y0 + (jn ? 0 : bw);
        const fy1 = y1 - (js ? 0 : bw);
        ctx.fillStyle = field;
        ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
        // Nap sheen: 45° pile stripes catching the light, with a
        // fainter crushed counter-stripe between — clipped to the
        // field so the braid stays struck metal.
        ctx.save();
        ctx.beginPath();
        ctx.rect(fx0, fy0, fx1 - fx0, fy1 - fy0);
        ctx.clip();
        const step = px / 3;
        const u0 = Math.floor((gx - gy - px) / step) * step;
        const stripe = (off: number, w: number, tone: string): void => {
          ctx.fillStyle = tone;
          for (let u = u0; u < gx + px - gy + step; u += step) {
            ctx.beginPath();
            ctx.moveTo(u + off + gy - 1, gy - 1);
            ctx.lineTo(u + off + gy - 1 + w, gy - 1);
            ctx.lineTo(u + off + gy + px + 1 + w, gy + px + 1);
            ctx.lineTo(u + off + gy + px + 1, gy + px + 1);
            ctx.closePath();
            ctx.fill();
          }
        };
        stripe(0, px * 0.06, moon ? 'rgba(214, 228, 248, 0.06)' : 'rgba(255, 214, 170, 0.07)');
        stripe(step * 0.5, px * 0.05, 'rgba(18, 12, 26, 0.05)');
        // The odd crush-mark where feet have turned the pile.
        if (hg % 3 === 0) {
          const hh = hashCoords(233, tx, ty);
          ctx.fillStyle = 'rgba(18, 12, 26, 0.06)';
          ctx.beginPath();
          ctx.ellipse(
            gx + (0.25 + (hh % 50) / 100) * px,
            gy + (0.25 + ((hh >> 6) % 50) / 100) * px,
            px * 0.16,
            px * 0.1,
            ((hh >> 3) % 7) * 0.45,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
        // A gold pinline echoing the braid just inside the field, and
        // a braid knot at each free edge's midpoint — tailor's work.
        ctx.fillStyle = moon ? 'rgba(180, 192, 214, 0.5)' : 'rgba(201, 150, 46, 0.5)';
        const g2 = px * 0.045;
        if (!jn) ctx.fillRect(fx0 + g2, fy0 + g2, fx1 - fx0 - g2 * 2, px * 0.018);
        if (!js) ctx.fillRect(fx0 + g2, fy1 - g2 - px * 0.018, fx1 - fx0 - g2 * 2, px * 0.018);
        if (!jw) ctx.fillRect(fx0 + g2, fy0 + g2, px * 0.018, fy1 - fy0 - g2 * 2);
        if (!je) ctx.fillRect(fx1 - g2 - px * 0.018, fy0 + g2, px * 0.018, fy1 - fy0 - g2 * 2);
        ctx.fillStyle = moon ? '#dae4f2' : '#e0b84a';
        const knot = (kx: number, ky: number): void => {
          ctx.beginPath();
          ctx.moveTo(kx, ky - px * 0.026);
          ctx.lineTo(kx + px * 0.026, ky);
          ctx.lineTo(kx, ky + px * 0.026);
          ctx.lineTo(kx - px * 0.026, ky);
          ctx.closePath();
          ctx.fill();
        };
        if (!jn) knot(gx + px * 0.5, y0 + o + (bw - o) * 0.5);
        if (!js) knot(gx + px * 0.5, y1 - o - (bw - o) * 0.5);
        if (!jw) knot(x0 + o + (bw - o) * 0.5, gy + px * 0.5);
        if (!je) knot(x1 - o - (bw - o) * 0.5, gy + px * 0.5);
        // Mitered braid seams where two free edges meet at a corner.
        ctx.strokeStyle = 'rgba(18, 12, 26, 0.35)';
        ctx.lineWidth = Math.max(1, px * 0.016);
        const miter = (mx: number, my: number, dx: number, dy: number): void => {
          ctx.beginPath();
          ctx.moveTo(mx + dx * px * 0.04, my + dy * px * 0.04);
          ctx.lineTo(mx + dx * bw, my + dy * bw);
          ctx.stroke();
        };
        if (!jn && !jw) miter(x0, y0, 1, 1);
        if (!jn && !je) miter(x1, y0, -1, 1);
        if (!js && !jw) miter(x0, y1, 1, -1);
        if (!js && !je) miter(x1, y1, -1, -1);
      } else if (
        d === Detail.BannerCrown ||
        d === Detail.BannerMoon ||
        d === Detail.Tapestry
      ) {
        // WALL-HUNG cloth is painted by the wall painters onto the
        // south face — in game the ground under a wall is never seen,
        // so this glyph exists for the Studio's flat map view only:
        // authors see at a glance where cloth hangs.
        const tap = d === Detail.Tapestry;
        const crown = d === Detail.BannerCrown;
        const cloth = tap ? '#6e3440' : crown ? '#7a2430' : '#5a6f9c';
        const trim = crown ? '#c9962e' : '#b4c0d2';
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(gx + px * 0.14, gy + px * 0.16, px * 0.72, px * 0.06);
        ctx.fillStyle = cloth;
        if (tap) {
          ctx.fillRect(gx + px * 0.2, gy + px * 0.22, px * 0.6, px * 0.56);
          ctx.fillStyle = trim;
          ctx.fillRect(gx + px * 0.2, gy + px * 0.7, px * 0.6, px * 0.05);
        } else {
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.3, gy + px * 0.22);
          ctx.lineTo(gx + px * 0.7, gy + px * 0.22);
          ctx.lineTo(gx + px * 0.7, gy + px * 0.72);
          ctx.lineTo(gx + px * 0.5, gy + px * 0.6);
          ctx.lineTo(gx + px * 0.3, gy + px * 0.72);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = trim;
          ctx.fillRect(gx + px * 0.3, gy + px * 0.28, px * 0.4, px * 0.05);
        }
      } else if (wallHungInfo(d) !== null) {
        // Player hangings — Studio-only glyphs like the royals above:
        // the ground under a wall is never seen in game, but authors
        // must see at a glance what hangs where, in what color.
        const info = wallHungInfo(d)!;
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(gx + px * 0.14, gy + px * 0.16, px * 0.72, px * 0.06);
        if (info.kind === 'banner') {
          ctx.fillStyle = DYE_SWATCHES[info.dye ?? 0]!;
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.32, gy + px * 0.22);
          ctx.lineTo(gx + px * 0.68, gy + px * 0.22);
          ctx.lineTo(gx + px * 0.68, gy + px * 0.7);
          ctx.lineTo(gx + px * 0.5, gy + px * 0.58);
          ctx.lineTo(gx + px * 0.32, gy + px * 0.7);
          ctx.closePath();
          ctx.fill();
        } else if (info.kind === 'pennant') {
          ctx.fillStyle = DYE_SWATCHES[info.dye ?? 0]!;
          for (let k = 0; k < 3; k++) {
            const fx = gx + px * (0.24 + k * 0.22);
            ctx.beginPath();
            ctx.moveTo(fx, gy + px * 0.24);
            ctx.lineTo(fx + px * 0.14, gy + px * 0.24);
            ctx.lineTo(fx + px * 0.07, gy + px * 0.44);
            ctx.closePath();
            ctx.fill();
          }
        } else if (info.kind === 'sign') {
          ctx.fillStyle = '#8a6534';
          ctx.fillRect(gx + px * 0.3, gy + px * 0.3, px * 0.4, px * 0.32);
          ctx.fillStyle = '#e8dcc4';
          ctx.fillRect(gx + px * 0.4, gy + px * 0.38, px * 0.2, px * 0.16);
        } else if (info.kind === 'trellis') {
          ctx.strokeStyle = info.species === 1 ? '#a8433a' : '#3f7a48';
          ctx.lineWidth = px * 0.05;
          ctx.strokeRect(gx + px * 0.28, gy + px * 0.24, px * 0.44, px * 0.5);
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.28, gy + px * 0.24);
          ctx.lineTo(gx + px * 0.72, gy + px * 0.74);
          ctx.moveTo(gx + px * 0.72, gy + px * 0.24);
          ctx.lineTo(gx + px * 0.28, gy + px * 0.74);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#a8814c';
          ctx.beginPath();
          ctx.ellipse(gx + px * 0.5, gy + px * 0.46, px * 0.18, px * 0.12, 0, 0, Math.PI);
          ctx.fill();
          ctx.fillStyle = '#d977a8';
          ctx.beginPath();
          ctx.arc(gx + px * 0.44, gy + px * 0.36, px * 0.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e8c06a';
          ctx.beginPath();
          ctx.arc(gx + px * 0.56, gy + px * 0.34, px * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
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
    // A row participates only near a tile of EXACTLY this level (±1
    // row for the half-tile contour bleed). Membership alone would
    // also emit rows across every higher plateau — but that flattened
    // copy is erased below, so those rows would blit nothing and the
    // face curtains they used to hide behind now sort earlier anyway.
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      scan: for (let wy = baseY + ly - 1; wy <= baseY + ly + 1; wy++) {
        for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
          if (elev(baseX + lx, wy) === level) {
            rows[ly] = true;
            any = true;
            break scan;
          }
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

  // THE HIGHER MASS IS NOT THIS LAYER'S TO PAINT: membership
  // (elev >= level) keeps the marching-squares silhouette seamless at
  // every level boundary, but it also painted a FLATTENED copy of
  // every higher plateau into this layer. That copy only ever looked
  // right because cliff faces sorted at their base row and repainted
  // over it; faces now sort at their visual top (THE FACE LOSES EVERY
  // CONTEST), so the copy surfaced as borrowed ground drawn over the
  // stone. Erase everything strictly inside the level+1 mass — the
  // erase contour is EXACTLY the level+1 silhouette (same marching
  // squares, same stair squaring), so the cut lands on the very line
  // the face curtain hangs from and no hairline can open at the seam.
  // Decks draw after this on purpose: a lifted top may honestly
  // overhang the cell north of it.
  const memberUp = (tx: number, ty: number): boolean => elev(tx, ty) >= level + 1;
  const rampUp = (tx: number, ty: number): boolean =>
    ground(tx, ty) === Tile.Ramp && elev(tx, ty) === level + 1;
  const nearStairUp = (i: number, j: number): boolean =>
    rampUp(baseX + i - 1, baseY + j - 1) ||
    rampUp(baseX + i, baseY + j - 1) ||
    rampUp(baseX + i, baseY + j) ||
    rampUp(baseX + i - 1, baseY + j);
  const maskUpAt = (i: number, j: number): number =>
    (memberUp(baseX + i - 1, baseY + j - 1) ? 1 : 0) |
    (memberUp(baseX + i, baseY + j - 1) ? 2 : 0) |
    (memberUp(baseX + i, baseY + j) ? 4 : 0) |
    (memberUp(baseX + i - 1, baseY + j) ? 8 : 0);
  const erase = new Path2D();
  let anyUp = false;
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask = maskUpAt(i, j);
      if (mask === 0) continue;
      anyUp = true;
      if (nearStairUp(i, j)) maskQuadrants(erase, mask, (i - 0.5) * px, (j - 0.5) * px, px);
      else maskPolygon(erase, mask, (i - 0.5) * px, (j - 0.5) * px, px);
    }
  }
  if (anyUp) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill(erase);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Raised decks on THIS terrace: the same dock and bridge passes as
  // the ground floor, drawn unclipped (a lifted top reaches into the
  // cell north of the deck) and gated to tiles of exactly this level,
  // so a lower span in the same chunk never paints into a layer that
  // blits shifted.
  const deckHere = (tx: number, ty: number): boolean => elev(tx, ty) === level;
  drawDocks(ctx, ground, baseX, baseY, px, deckHere);
  drawBridges(ctx, ground, baseX, baseY, px, deckHere);
  drawPorchDecks(ctx, ground, baseX, baseY, px, undefined, deckHere);

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
/** The layer index of every tile touching this chunk (34² halo grid). */
function computeLayerIdx(g: GroundSampler, baseX: number, baseY: number): Int8Array {
  const N = CHUNK_SIZE + 2;
  const idx = new Int8Array(N * N);
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      idx[lx + 1 + (ly + 1) * N] = layerIndexOf(g(baseX + lx, baseY + ly) ?? Tile.Grass);
    }
  }
  return idx;
}

function drawLayerSkins(
  ctx: CanvasRenderingContext2D,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  const idx = computeLayerIdx(g, baseX, baseY);
  for (let li = 0; li < BLOB_LAYERS.length; li++) {
    paintLayerSkin(ctx, idx, li, baseX, baseY, px);
  }
}

/**
 * ONE material layer's contoured skin — the body of the old per-layer
 * loop, split out so the sliced chunk bake can spend one layer per
 * step (see startChunkBake). Layers paint lowest → highest, each an
 * independent opaque pass, so a partially-skinned chunk on screen for
 * a frame is just "the higher materials arrive next frame".
 */
function paintLayerSkin(
  ctx: CanvasRenderingContext2D,
  idx: Int8Array,
  li: number,
  baseX: number,
  baseY: number,
  px: number,
): void {
  const N = CHUNK_SIZE + 2;
  const at = (lx: number, ly: number): number => idx[lx + 1 + (ly + 1) * N]!;

  const toX = (wx: number): number => (wx - baseX) * px;
  const toY = (wy: number): number => (wy - baseY) * px;

  {
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
  const isPlank = (t: number | undefined): boolean =>
    t === Tile.WoodFloor || t === Tile.Bridge || t === Tile.Dock;
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
 * RAISED DECKS. Two structures stride over the water, and they are
 * NOT the same build:
 *
 *   DOCK (Tile.Dock) — the exposed jetty: a plank deck suspended on
 *   driven wooden piles, deliberately reading as "placed over" the
 *   water. Painted by drawDocks.
 *
 *   BRIDGE (Tile.Bridge) — the seated crossing: the same raised walk,
 *   but SEATED INTO both banks — stone abutment steps at every land
 *   threshold, chunky stone piers with an arched fascia over the
 *   water, kerbed board edges, and hip-height rails along every edge
 *   that faces water (the rails are live renderer items so bodies
 *   sort against them). Painted by drawBridges.
 *
 * Both share the deck mechanics: the ground under them is painted as
 * real water (skin, contours and depth all run beneath the boards)
 * and the deck rides DOCK_LIFT tiles of SCREEN height above the
 * surface — renderLift lifts every body standing on one by the same
 * amount, so feet and boards agree by construction. Bake-space
 * vertical offsets must divide by FLAT (the bake squashes at blit
 * time; screen height does not).
 */
export const DOCK_LIFT = 0.22;

/** Deck-family ground: the two raised-walk tiles. */
export function isDeckGround(t: number | undefined): boolean {
  return t === Tile.Bridge || t === Tile.Dock;
}

/** Any water within Chebyshev distance 2. The radius-2 scan keeps a
 *  whole span uniform (interior tiles of a 2-wide run don't all touch
 *  water) so the lift never dips mid-run. */
function waterNear2(ground: GroundSampler, tx: number, ty: number): boolean {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (isWaterTile(ground(tx + dx, ty + dy))) return true;
    }
  }
  return false;
}

/** Dock tile near water — a raised jetty deck. */
export function isDockTile(ground: GroundSampler, tx: number, ty: number): boolean {
  return ground(tx, ty) === Tile.Dock && waterNear2(ground, tx, ty);
}

/** Bridge tile near water — a raised, seated crossing. */
export function isBridgeTile(ground: GroundSampler, tx: number, ty: number): boolean {
  return ground(tx, ty) === Tile.Bridge && waterNear2(ground, tx, ty);
}

/** Either raised deck — everything the water must flow quietly under. */
export function isDeckTile(ground: GroundSampler, tx: number, ty: number): boolean {
  return isDeckGround(ground(tx, ty)) && waterNear2(ground, tx, ty);
}

/** A notch fill's orientation: which two adjacent tile edges the
 *  half-tile deck triangle spans (the diag-wall suffix convention —
 *  the named corner is the SOLID one, the hypotenuse faces away). */
export type DeckFillLegs = 'NE' | 'NW' | 'SE' | 'SW';

export interface DeckFill {
  legs: DeckFillLegs;
  /** Which painter owns the fill — bridge wins a mixed junction. */
  family: 'bridge' | 'dock';
  /** True when the notch is walkable BANK, not water: the crossing's
   *  corner chamfers onto the land — same triangle, land dressing
   *  (contact shade instead of water AO, no pile, no rail). */
  bank: boolean;
}

/**
 * THE 45° NOTCH-FILL LAW. A stair-stepped span (a diagonal worldgen
 * road crossing, an angled jetty) exposes inner corners: water tiles
 * hugged by deck on exactly two ADJACENT sides. Each such notch grows
 * a lifted half-tile deck TRIANGLE spanning those two edges, so the
 * staircase reads as a clean 45° crossing — the same chamfer language
 * as the diagonal walls, with no new tiles and no data changes (the
 * notch tile stays water: solid, unwalkable, pure visual). The gate
 * is deliberately narrow: three deck sides is an authored inlet (a
 * boat slip must not seal over), opposite sides are a deliberate gap,
 * a FishingSpot must never be boarded over, and fills never chain off
 * other fills (legs demand real deck tiles).
 */
export function deckFillAt(ground: GroundSampler, tx: number, ty: number): DeckFill | null {
  const t = ground(tx, ty);
  if (t === undefined || isFishingTile(t) || isDeckGround(t)) return null;
  const water = isWaterTile(t);
  // A land notch may chamfer too (THE BANK CHAMFER below) — but only
  // over bare walkable ground; anything solid or built stays square.
  if (!water && tileDef(t).solid) return null;
  const nT = ground(tx, ty - 1);
  const sT = ground(tx, ty + 1);
  const eT = ground(tx + 1, ty);
  const wT = ground(tx - 1, ty);
  const n = isDeckGround(nT);
  const s = isDeckGround(sT);
  const e = isDeckGround(eT);
  const w = isDeckGround(wT);
  if ((n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0) !== 2) return null;
  const legs: DeckFillLegs | null =
    n && e ? 'NE'
    : n && w ? 'NW'
    : s && e ? 'SE'
    : s && w ? 'SW'
    : null;
  if (legs === null) return null;
  if (!water) {
    // THE BANK CHAMFER (round 6, user showed square-cornered land
    // transitions): a stair-step corner that lands on the BANK grows
    // the same 45° triangle, so the crossing chamfers onto the sand
    // exactly as it chamfers over the water. Both legs must be truly
    // LIFTED decks, and neither may be a RAMPING apron — a sloped leg
    // would tear against the fill's full-height triangle, so those
    // entrances keep their square sill.
    const dn = legs[0] === 'N' ? -1 : 1;
    const de = legs[1] === 'E' ? 1 : -1;
    if (!isDeckTile(ground, tx, ty + dn) || !isDeckTile(ground, tx + de, ty)) return null;
    const ramps = (x: number, y: number): boolean =>
      ground(x, y) === Tile.Bridge &&
      bridgeApronAt(ground, x, y, deckWalkIsVertical(ground, x, y)) !== 'none';
    if (ramps(tx, ty + dn) || ramps(tx + de, ty)) return null;
  }
  const a = legs[0] === 'N' ? nT : sT;
  const b = legs[1] === 'E' ? eT : wT;
  return {
    legs,
    family: a === Tile.Bridge || b === Tile.Bridge ? 'bridge' : 'dock',
    bank: !water,
  };
}

/** Does a notch fill at (x,y) cover that tile's given edge? The two
 *  leg edges are interior deck — every painter treats them exactly
 *  like a deck neighbor (no fascia, no kerb, no stroke, no rail, no
 *  lap line), so the fill welds seamlessly into the span. */
export function fillCoversEdge(
  ground: GroundSampler,
  x: number,
  y: number,
  edge: 'N' | 'S' | 'E' | 'W',
): boolean {
  const f = deckFillAt(ground, x, y);
  return f !== null && (f.legs[0] === edge || f.legs[1] === edge);
}

/** World-keyed map key for deck-span memoization. */
const packDeck = (x: number, y: number): number => x * 100000 + y;

/**
 * The walk axis of a whole connected deck span, decided ONCE for the
 * span so every member tile lays its boards, kerbs and rails the same
 * way (a per-tile guess splits a wobbly-banked crossing into mixed
 * directions): flood the deck region (4-way, capped), count exposed
 * edges that meet water on each axis — a river runs past the SIDES —
 * and fall back to the region's long axis when the water reads
 * ambiguous. Returns true when the walk runs N-S. `out` collects the
 * verdict for every member tile so callers memoize one flood per span.
 */
export function deckWalkIsVertical(
  ground: GroundSampler,
  tx: number,
  ty: number,
  out?: Map<number, boolean>,
): boolean {
  const seen = new Set<number>([packDeck(tx, ty)]);
  const queue: Array<[number, number]> = [[tx, ty]];
  const tiles: Array<[number, number]> = [];
  let waterNS = 0;
  let waterEW = 0;
  let minX = tx;
  let maxX = tx;
  let minY = ty;
  let maxY = ty;
  // Generous: the cap exists only as a runaway guard. If a real span
  // ever exceeded it, tiles could flood DIFFERENT subsets and reach
  // different verdicts — mixed boards and torn lift profiles — so the
  // cap must sit far above any span worldgen or a map can lay down.
  const CAP = 1024;
  while (queue.length > 0 && tiles.length < CAP) {
    const [x, y] = queue.pop()!;
    tiles.push([x, y]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const t = ground(x + dx, y + dy);
      if (isDeckGround(t)) {
        const k = packDeck(x + dx, y + dy);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push([x + dx, y + dy]);
        }
      } else if (isWaterTile(t)) {
        if (dy !== 0) waterNS++;
        else waterEW++;
      }
    }
  }
  const vert = waterEW !== waterNS ? waterEW > waterNS : maxY - minY > maxX - minX;
  if (out) for (const [x, y] of tiles) out.set(packDeck(x, y), vert);
  return vert;
}

/** Which way a bridge tile ramps: the LAND side of an apron, or
 *  'none' for a full-height tile. */
export type BridgeApron = 'none' | 'W' | 'E' | 'N' | 'S';

/** The per-tile ramp candidacy: land beyond the walk edge, deck
 *  continuing on the opposite side. The RUN LAW below decides whether
 *  a candidate may actually ramp. */
function apronCandidate(
  ground: GroundSampler,
  tx: number,
  ty: number,
  walkVert: boolean,
): BridgeApron {
  const isLand = (t: number | undefined): boolean =>
    t !== undefined && !isDeckGround(t) && !isWaterTile(t);
  if (walkVert) {
    const nT = ground(tx, ty - 1);
    const sT = ground(tx, ty + 1);
    if (isLand(nT) && isDeckGround(sT)) return 'N';
    if (isLand(sT) && isDeckGround(nT)) return 'S';
  } else {
    const wT = ground(tx - 1, ty);
    const eT = ground(tx + 1, ty);
    if (isLand(wT) && isDeckGround(eT)) return 'W';
    if (isLand(eT) && isDeckGround(wT)) return 'E';
  }
  return 'none';
}

/**
 * THE APRON LAW. An apron is the span's last tile before a walk-end
 * bank: its deck RAMPS from grade at the land edge up to DOCK_LIFT at
 * the deck side, exactly like the Ramp tile's flight — the road pours
 * onto the bridge with no step, no floating threshold, no water
 * peeking out under a hovering end. The bake shears the apron's deck
 * kit along this slope and renderLift interpolates the same slope
 * under every body, so feet and boards agree by construction.
 *
 * THE RUN LAW: a candidate only ramps if its ENTIRE cross-axis run of
 * deck tiles carries the SAME candidacy — one row sloping beside a
 * row still at full height tears the deck open along their shared
 * edge (the exact seam artifact on ragged spans). Any run member with
 * a different verdict — a row that continues further, a dock tile
 * that can never slope, a row ending over water — flattens the whole
 * run, and those ends wear the flat threshold kit instead. Seams are
 * impossible by construction: lift profile is uniform per run.
 */
export function bridgeApronAt(
  ground: GroundSampler,
  tx: number,
  ty: number,
  walkVert: boolean,
): BridgeApron {
  const cand = apronCandidate(ground, tx, ty, walkVert);
  if (cand === 'none') return 'none';
  if (ground(tx, ty) !== Tile.Bridge) return 'none';
  const cdx = walkVert ? 1 : 0;
  const cdy = walkVert ? 0 : 1;
  for (const sgn of [1, -1]) {
    for (let i = 1; i <= 16; i++) {
      const x = tx + cdx * i * sgn;
      const y = ty + cdy * i * sgn;
      const t = ground(x, y);
      if (!isDeckGround(t)) break;
      if (t !== Tile.Bridge) return 'none'; // a dock in the run never slopes
      if (apronCandidate(ground, x, y, walkVert) !== cand) return 'none';
    }
  }
  return cand;
}

/**
 * The ground that continues under a deck tile. Over the span it is
 * the water itself (most common depth among the neighbors, so the
 * pool keeps its own color beneath the boards) — but at the BANK
 * APRONS, where no water touches the ring, it is the bank (most
 * common walkable land neighbor). The old default-to-shallow here
 * painted phantom pools under every bridge end — water peeking out
 * around a deck that stands on dry road. Never default to water.
 */
function deckUnderGround(
  ground: GroundSampler,
  tx: number,
  ty: number,
  bankFirst = false,
): number {
  for (const r of [1, 2]) {
    let shallow = 0;
    let water = 0;
    let deep = 0;
    const land = new Map<number, number>();
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const t = ground(tx + dx, ty + dy);
        if (t === undefined || isDeckGround(t)) continue;
        if (t === Tile.WaterShallow) shallow++;
        else if (t === Tile.Water || isFishingTile(t)) water++;
        else if (t === Tile.WaterDeep) deep++;
        else if (!tileDef(t).solid) land.set(t, (land.get(t) ?? 0) + 1);
      }
    }
    let best = -1;
    let bestT = -1;
    let landTotal = 0;
    for (const [t, n] of land) {
      landTotal += n;
      if (n > best) {
        best = n;
        bestT = t;
      }
    }
    // A ramp apron is BANK-FIRST: any walkable land in the ring wins
    // over water, so the ground pours under the ramp mouth unbroken.
    // Everywhere else the MAJORITY decides — a flat walk-end with one
    // diagonal lick of water two banks over must still read as bank,
    // never as a phantom pool peeking around the deck.
    if (bankFirst && bestT >= 0) return bestT;
    const waterTotal = deep + water + shallow;
    if (waterTotal >= landTotal && waterTotal > 0) {
      if (deep >= water && deep >= shallow) return Tile.WaterDeep;
      if (water >= shallow) return Tile.Water;
      return Tile.WaterShallow;
    }
    if (bestT >= 0) return bestT;
    if (waterTotal > 0) {
      if (deep >= water && deep >= shallow) return Tile.WaterDeep;
      if (water >= shallow) return Tile.Water;
      return Tile.WaterShallow;
    }
  }
  return Tile.Grass;
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
      // A dock's or bridge's lifted deck reaches into the cell NORTH
      // of it — no glitter may paint over those boards (the deck is
      // baked; the breeze layer is live and would land on top). A
      // notch fill's triangle counts as deck the same way, and a
      // fill's own cell wears boards, so it never sparkles either.
      const southIsDeck =
        isDeckGround(ground(tx, ty + 1)) || fillCoversEdge(ground, tx, ty + 1, 'N');

      if (tile === Tile.Water || tile === Tile.WaterDeep) {
        // Calm water still reads as water — the field shapes glitter,
        // it never kills it.
        const act = 0.5 + 0.5 * liveliness(tx, ty, t);
        const selfFill = deckFillAt(ground, tx, ty) !== null;
        if (h % 6 === 0 && !southIsDeck && !selfFill) {
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
          !selfFill &&
          isOpenWater(ground(tx + 1, ty)) &&
          deckFillAt(ground, tx + 1, ty) === null &&
          isOpenWater(ground(tx + 2, ty)) &&
          deckFillAt(ground, tx + 2, ty) === null
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
        const selfFill = deckFillAt(ground, tx, ty) !== null;
        // Caustic dapples: broken rings of sunlight wobbling on the
        // sandbed — the shallows' own signature. FLAT-squashed: light
        // lying on a tilted surface, never a top-down bubble.
        if (fx.full && h % 5 === 0 && !southIsDeck && !selfFill) {
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
        if (h % 13 === 0 && !southIsDeck && !selfFill) {
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
      } else if (isFishingTile(tile)) {
        // Rise rings: FLAT-squashed, staggered so the pair never pulses
        // in lockstep. Every tier of the fishing ladder speaks this
        // dialect; each adds one quiet accent so an angler reads the
        // water at a glance without a tooltip.
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
        if (tile === Tile.PikeHole) {
          // Stillwater reeds at the rim — the pike's cover. Two blades,
          // hash-leaned so no two holes match.
          const path = bk.stroke('#3e6b3a', 0.05, 0.75 * tones.dim);
          if (path) {
            for (let blade = 0; blade < 2; blade++) {
              const bx = tx + 0.22 + blade * 0.5 + ((h >>> (3 + blade * 4)) % 20) / 100;
              const lean = (((h >>> (6 + blade * 3)) % 21) - 10) / 60;
              const base = worldToScreen(bx, ty + 0.82);
              const tip = worldToScreen(bx + lean, ty + 0.82 - 0.34);
              path.moveTo(base.x, base.y);
              path.lineTo(tip.x, tip.y);
            }
          }
        } else if (tile === Tile.EelRun) {
          // A dark body under the surface: one slow S-curve sliding
          // around the rings, phase-locked to the tile's own hash.
          const sw = (t * 0.25 + (h % 47) / 47) % 1;
          const a0 = sw * Math.PI * 2;
          ctx.globalAlpha = 0.4 * tones.dim;
          ctx.strokeStyle = '#1e3350';
          ctx.lineWidth = Math.max(1.5, s * 0.06);
          ctx.beginPath();
          const rr = 0.3 * s;
          for (let seg = 0; seg <= 6; seg++) {
            const a = a0 + seg * 0.22;
            const wob = Math.sin(seg * 1.6 + t * 2) * 0.05 * s;
            const x = p.x + Math.cos(a) * (rr + wob);
            const y = p.y + Math.sin(a) * (rr + wob) * FLAT;
            if (seg === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (tile === Tile.SalmonRun) {
          // The leap: a silver flash arcing out of the rings every few
          // seconds — visible from a screen away, gone before it lands.
          const phase = (t * 0.22 + (h % 31) / 31) % 1;
          if (phase < 0.18) {
            const k = phase / 0.18;
            const arc = Math.sin(k * Math.PI);
            ctx.globalAlpha = arc * 0.85 * tones.dim;
            ctx.strokeStyle = '#d6e4f0';
            ctx.lineWidth = Math.max(1.5, s * 0.06);
            ctx.beginPath();
            const lx0 = p.x + (k - 0.5) * 0.5 * s;
            const ly0 = p.y - arc * 0.3 * s;
            ctx.moveTo(lx0 - s * 0.09, ly0 + s * 0.03);
            ctx.quadraticCurveTo(lx0, ly0 - s * 0.05, lx0 + s * 0.09, ly0 + s * 0.03);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        } else if (tile === Tile.GlimmerShoal) {
          // The shoal glimmers: three staggered twinkles riding their
          // own phases — the only fishing water that shines at night.
          for (let tw = 0; tw < 3; tw++) {
            const phase = (t * 0.5 + ((h >>> (tw * 5)) % 29) / 29) % 1;
            const a = Math.sin(phase * Math.PI);
            if (a <= 0.05) continue;
            const gx = tx + 0.2 + ((h >>> (2 + tw * 6)) % 60) / 100;
            const gy = ty + 0.2 + ((h >>> (7 + tw * 4)) % 60) / 100;
            const g = worldToScreen(gx, gy);
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = '#cfe2ff';
            ctx.lineWidth = Math.max(1, s * 0.03);
            const gr = 0.05 * s * (0.7 + a * 0.6);
            ctx.beginPath();
            ctx.moveTo(g.x - gr, g.y);
            ctx.lineTo(g.x + gr, g.y);
            ctx.moveTo(g.x, g.y - gr * FLAT);
            ctx.lineTo(g.x, g.y + gr * FLAT);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      } else if (isDeckGround(tile)) {
        // The deck's live waterline: the surface visibly LAPS against
        // the structure — breathing white lines hug every deck edge
        // that meets water, and the piles/piers nurse slow ripple
        // collars. All positions sample JUST OUTSIDE the deck tile
        // (the tile itself is lifted by renderLift; the water is not).
        if (fx.full && isDeckTile(ground, tx, ty)) {
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
          // A notch fill welded to an edge makes it interior — the
          // water laps against the fill's hypotenuse, not the seam.
          if (isWaterTile(ground(tx - 1, ty)) && !fillCoversEdge(ground, tx - 1, ty, 'E')) {
            lap(tx - 0.02, ty + 0.12, tx - 0.02, ty + 0.88);
          }
          if (isWaterTile(ground(tx + 1, ty)) && !fillCoversEdge(ground, tx + 1, ty, 'W')) {
            lap(tx + 1.02, ty + 0.12, tx + 1.02, ty + 0.88);
          }
          if (isWaterTile(ground(tx, ty + 1)) && !fillCoversEdge(ground, tx, ty + 1, 'N')) {
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
  return t === Tile.Water || t === Tile.WaterDeep || isFishingTile(t);
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
export function isWaterTile(t: number | undefined): boolean {
  return (
    t === Tile.Water ||
    t === Tile.WaterDeep ||
    t === Tile.WaterShallow ||
    isFishingTile(t)
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
      // Deck cells get NO shoreline: the water slides quietly under
      // a raised dock or bridge — foam ringing a deck would paint it
      // back into a flat peninsula (piles carry their own ripples).
      // The skip reaches ONE RING past the dual cell: a set wave
      // slides in from over half a tile offshore, so a run in the
      // NEXT cell still pushes its crest and spray out past a deck
      // edge (the torn white sliver at every bank junction). Water
      // calming beside the structure reads right anyway.
      let nearDeck = false;
      for (let dy = -2; dy <= 1 && !nearDeck; dy++) {
        for (let dx = -2; dx <= 1 && !nearDeck; dx++) {
          if (isDeckGround(ground(i + dx, j + dy))) nearDeck = true;
        }
      }
      if (nearDeck) continue;
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


