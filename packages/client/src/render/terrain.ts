import {
  ART_SUN_X,
  ART_SUN_Y,
  CHEST_TILES,
  COURSE_TILES,
  DYE_COUNT,
  CHUNK_SIZE,
  Detail,
  GARRISON_TILES,
  HEDGE_TILES,
  IRON_FENCE_TILES,
  PALISADE_TILES,
  RUIN_WALL_TILES,
  Tile,
  WALL_RUN_TILES,
  awningInfo,
  diagWallInfo,
  wallHungInfo,
  hashCoords,
  isFishingTile,
  nearestFloorTile,
  tileDef,
  isScarredTile,
  valueNoise,
} from '@arx/shared';
import { chamferRect, facetCircle } from './shapes.js';
import { shade } from './tint.js';
import {
  BAND_HELD,
  BAND_TAKEN,
  BAND_TOUCHED,
  CHANNEL_FEED_RANGE,
  HALO_CELLS,
  HALO_N,
  band,
} from '@arx/content';
import { allocSpectrumHalo, spectrumHalo, spectrumHaloSig, spectrumSig } from './fold.js';
import {
  BANK_FACE_FOLD,
  DIRT_FOLD,
  DUNGEON_FOLD,
  FOLD_ALT_SALT,
  FOLD_AUTUMN,
  FOLD_HELD_SALT,
  FOLD_BLIGHT,
  FOLD_BURN,
  FOLD_NONE,
  FOLD_SPRING,
  FRINGE_ALT,
  MARK_INK,
  MATERIAL_MARK_INK,
  PATH_FOLD,
  RUBBLE_FOLD,
  SAND_FOLD,
  SHALLOWS_FOLD,
  SNOW_FOLD,
  STONE_FOLD,
  STUBBLE_INK,
  STUBBLE_INK_COLD,
  SUBSTRATE_FOLD,
  SWAMP_FOLD,
  TILLED_FOLD,
  foldLaneSeed,
  washAltKey,
  washKey,
  type FoldRunInk,
  type MaterialFold,
} from './foldSkins.js';
import { farmPlots, wellNearClient } from '../game/farmCare.js';
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
  /**
   * THE LAYER SEED. The stable salt of every contour hash this layer
   * rolls — edge crossings, control-point bows, the swell field, the
   * alt-patch sub-lanes (seed + 64 / + 96). It is NOT the array index:
   * the array is the PAINT order (lowest → highest) and may gain a
   * layer mid-list (AshGround after Dirt) without re-rolling a single
   * shipped road or shore. Seeds are unique, never reused, and live
   * below 64 so no sub-lane can collide with a layer's own lane; a new
   * layer takes the next unused value, never an insertion's index.
   * Pinned by terrain.seed.test.ts (op-stream golden).
   */
  seed: number;
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
  /**
   * Region-scale two-tone variation, painted as ORGANIC sub-patches
   * through the same dual-grid contour machinery as the region itself.
   * (The old per-tile threshold printed the tone change as rectangular
   * steps on the tile grid — the plaza patchwork artifact.) `freq` and
   * `thresh` default to the meadow-scale 0.09 / 0.55.
   */
  alt?: { color: string; salt: number; freq?: number; thresh?: number };
  /**
   * A second, BROADER wash on top — weathering zones spanning many
   * tiles. This is how large man-made sheets (plazas, dungeon halls)
   * stay abstract-minimal and still read as worked ground: big soft
   * tonal shapes, the meadow's own language spoken in stone — never
   * per-stone texture (tiling was tried and rejected: without the
   * outline shader it reads as noise against this style).
   */
  alt2?: { color: string; salt: number; freq?: number; thresh?: number };
  /**
   * Sun-side lit lip: a thin bright stroke inside edges whose outward
   * normal faces the western sun — the same sun-law every wall and
   * pile in the world already obeys. Ground that catches the light at
   * its edges stops reading as a flat sticker.
   */
  lip?: string;
  /** Material interior dressing painted inside the region contour. */
  interior?: 'sand' | 'snow';
  /**
   * THE LADEN EDGE (snow): no worn dirt band — a cool inner shade, a
   * bright crest, and a white thickness fascia + soft cast shadow on
   * south-facing edges, so the blanket visibly SITS ON the ground.
   */
  laden?: boolean;
  /**
   * THE BANK HAS A BODY (the water family's edge): the land does not
   * end at a 90° color cliff — camera-facing runs show the cut earthen
   * bank FACE descending to the surface (tinted by the land material
   * it cuts through), every shoreline run wears a submerged sandy bed
   * margin fading into the shallow tone (the ground visibly slopes
   * UNDER the water), and the sun-law shades the water where the bank
   * stands between it and the western sun.
   */
  bank?: boolean;
  /**
   * Feathered depth shelf: the band strokes as a soft multi-step
   * gradient instead of one hard line — open water dissolving into the
   * deep, never a drawn ring.
   */
  feather?: boolean;
  /**
   * THE MATERIALS FOLD (THE LIVING GROUND, LG-2): the layer's keys
   * per look under the spectrum field — the hem pair the region fill
   * reads per dual cell, the taken / held keys the in-region isoband
   * paints on the isoline, the run inks the worn band and the lip take
   * at a run's midpoint. Absent = the material holds under every look
   * (open water, planks, the underground's own floor): foldable false.
   * Every read is guarded on the bake's view being non-null, so a
   * chunk with no stroke in reach paints this layer byte for byte as
   * it always did. Keys live in foldSkins.ts.
   */
  fold?: MaterialFold;
}

/** Painted lowest → highest; later layers' rounding overlaps earlier. */
const BLOB_LAYERS: BlobLayer[] = [
  {
    seed: 0,
    match: (t) => t === Tile.Dirt,
    color: () => '#96744c',
    alt: { color: '#8f6e47', salt: 31 },
    wobble: 0.22,
    band: 'rgba(70, 50, 30, 0.3)',
    lip: 'rgba(228, 196, 148, 0.32)',
    fringe: true,
    fold: DIRT_FOLD,
  },
  {
    // Tilled garden soil: dug by hand — near-straight edges, a deep
    // worked-earth band. All crop stages resolve to this material.
    seed: 1,
    match: (t) => t === Tile.Tilled,
    color: () => '#6b4f33',
    alt: { color: '#654a30', salt: 43 },
    wobble: 0.08,
    band: 'rgba(38, 26, 16, 0.4)',
    fringe: true,
    fold: TILLED_FOLD,
  },
  {
    seed: 2,
    match: (t) => t === Tile.Swamp,
    color: () => '#556b3e',
    alt: { color: '#4f6539', salt: 51 },
    wobble: 0.24,
    band: 'rgba(30, 42, 24, 0.35)',
    fringe: true,
    fold: SWAMP_FOLD,
  },
  {
    seed: 3,
    match: (t) => t === Tile.Path,
    color: () => '#c2a26e',
    alt: { color: '#bc9d69', salt: 33 },
    wobble: 0.2,
    band: 'rgba(105, 78, 44, 0.3)',
    lip: 'rgba(240, 216, 170, 0.34)',
    fringe: true,
    fold: PATH_FOLD,
  },
  {
    seed: 4,
    match: (t) => t === Tile.Sand,
    color: () => '#ddc98d',
    alt: { color: '#d6c286', salt: 35 },
    wobble: 0.2,
    band: 'rgba(158, 128, 74, 0.32)',
    lip: 'rgba(248, 234, 192, 0.4)',
    interior: 'sand',
    fringe: true,
    fold: SAND_FOLD,
  },
  {
    // Hand-laid flagstone: a light wobble — tighter than wild ground,
    // looser than a laser cut.
    seed: 5,
    match: (t) => t === Tile.StoneFloor,
    color: () => '#a09aa8',
    alt: { color: '#99939f', salt: 37 },
    alt2: { color: '#a9a3b1', salt: 61, freq: 0.032, thresh: 0.56 },
    wobble: 0.11,
    band: 'rgba(40, 34, 56, 0.28)',
    lip: 'rgba(214, 212, 224, 0.4)',
    fringe: true,
    fold: STONE_FOLD,
  },
  {
    seed: 6,
    match: (t) => t === Tile.WoodFloor || t === Tile.Bridge,
    color: () => '#a87e46',
    wobble: 0,
    band: 'rgba(58, 40, 22, 0.3)',
    fringe: false,
    // foldable: false — laid planks are planks under any sky.
  },
  {
    seed: 7,
    match: (t) => t === Tile.CaveFloor || t === Tile.PortalDown || t === Tile.PortalUp,
    color: () => CAVE_TONES[0]!,
    alt: { color: CAVE_TONES[1]!, salt: 41 },
    wobble: 0.18,
    band: 'rgba(18, 14, 28, 0.35)',
    fringe: false,
    // foldable: false — the underground's own floor; the plane gate
    // keeps every underground chunk unfolded regardless.
  },
  {
    // Dungeon flagstones: hand-laid masonry in the dark band — the
    // flagstone wobble (tight, deliberate) in cave-depth tones, so a
    // built room reads man-made against the raw cave around it.
    seed: 8,
    match: (t) => t === Tile.DungeonFloor,
    color: () => '#514b58',
    alt: { color: '#4c4653', salt: 47 },
    alt2: { color: '#585260', salt: 63, freq: 0.032, thresh: 0.56 },
    wobble: 0.11,
    band: 'rgba(16, 12, 24, 0.32)',
    fringe: false,
    fold: DUNGEON_FOLD,
  },
  {
    // Cave rubble: collapsed scree spilling across the corridors —
    // fully organic patches, a shade lighter than the rock they broke
    // from, painted over both cave floor and flagstone.
    seed: 9,
    match: (t) => t === Tile.CaveRubble,
    color: () => '#544e5f',
    alt: { color: '#4f4959', salt: 49 },
    wobble: 0.18,
    band: 'rgba(18, 14, 28, 0.3)',
    fringe: false,
    fold: RUBBLE_FOLD,
  },
  {
    seed: 10,
    match: (t) => t === Tile.Snow,
    color: () => '#e9edf3',
    alt: { color: '#e0e6ef', salt: 57 },
    wobble: 0.22,
    band: null,
    interior: 'snow',
    laden: true,
    fringe: true,
    fold: SNOW_FOLD,
  },
  {
    // Knee-deep shallows: the sunlit wading rim of every water body.
    // Lighter and greener than open water so "walkable" reads at a
    // glance; the live shoreline draws its waterline — no baked band.
    seed: 11,
    match: (t) => t === Tile.WaterShallow,
    color: () => '#649cc0',
    alt: { color: '#5f96ba', salt: 45 },
    wobble: 0.14,
    band: null,
    bank: true,
    fringe: false,
    fold: SHALLOWS_FOLD,
  },
  {
    // Open water. Its band is the DEPTH SHELF — the underwater shade
    // step where the wadeable rim drops away into swimming water,
    // feathered so the drop reads as dissolving depth, not a drawn
    // ring.
    seed: 12,
    match: (t) => t === Tile.Water || isFishingTile(t),
    color: () => '#4979b8',
    alt: { color: '#4574b2', salt: 53 },
    wobble: 0.14,
    band: 'rgba(24, 44, 84, 0.3)',
    feather: true,
    fringe: false,
    // foldable: false — open water is water (the bank face and the
    // shallows' scum carry the fold to the shore, never past it).
  },
  {
    seed: 13,
    match: (t) => t === Tile.WaterDeep,
    color: () => '#3a629e',
    alt: { color: '#375d97', salt: 55 },
    wobble: 0.2,
    band: 'rgba(24, 42, 80, 0.4)',
    feather: true,
    fringe: false,
    // foldable: false.
  },
];

/**
 * Layer index of the OUTERMOST water skin (the shallows) — the live
 * shoreline traces this layer's organic contour, which is the true
 * land|water boundary now that every body of water wears a wading rim.
 */
const WATER_LI = BLOB_LAYERS.findIndex((l) => l.match(Tile.WaterShallow));

/**
 * A CONTOUR LANE: everything the organic-boundary machinery needs to
 * know about the region it is tracing. `seed` salts every hash (the
 * layer's own `seed`, or seed + 64 / + 96 for its alt-patch sub-
 * contours); `water` halves the independent per-edge jitter (THE
 * CHANNEL WARP carries the water family's meander coherently). The
 * array index never reaches a hash from here on — paint order and
 * hash identity are two different facts.
 */
interface ContourLane {
  seed: number;
  water: boolean;
}

/** One lane per layer, in paint order — built once, alloc-free after. */
const LAYER_LANES: readonly ContourLane[] = BLOB_LAYERS.map((l, i) => ({
  seed: l.seed,
  water: i >= WATER_LI,
}));
const WATER_LANE = LAYER_LANES[WATER_LI]!;

/** Every BlobLayer's seed, in paint order (test pin; see BlobLayer.seed). */
export function blobLayerSeeds(): number[] {
  return BLOB_LAYERS.map((l) => l.seed);
}

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
  // THE CLIPPED GREEN: a hedgerow grows FROM the meadow — the grass
  // contour runs beneath it like beneath the fence.
  Tile.Hedge,
  Tile.HedgeDiagNE,
  Tile.HedgeDiagNW,
  Tile.HedgeGate,
  Tile.HedgeGateShut,
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
  // THE FULL FIELD (Phase 2): the wave's tilled-bed tiles — one
  // worked-earth contour under the whole field, frame included.
  Tile.GrowingFrame,
  Tile.PotatoMid,
  Tile.PotatoRipe,
  Tile.OnionMid,
  Tile.OnionRipe,
  Tile.CabbageMid,
  Tile.CabbageRipe,
  Tile.PumpkinMid,
  Tile.PumpkinRipe,
  Tile.BarleyMid,
  Tile.BarleyRipe,
  Tile.RedrootMid,
  Tile.RedrootRipe,
  Tile.KingsquashMid,
  Tile.KingsquashRipe,
  Tile.BittercressMid,
  Tile.BittercressRipe,
  Tile.SilverleafMid,
  Tile.SilverleafRipe,
  Tile.DuskthornMid,
  Tile.DuskthornRipe,
  Tile.DawnveilMid,
  Tile.DawnveilRipe,
  Tile.AdderstongueMid,
  Tile.AdderstongueRipe,
  Tile.AppleTreeMid,
  Tile.AppleTreeRipe,
  Tile.BrambleMid,
  Tile.BrambleRipe,
  Tile.PlumTreeMid,
  Tile.PlumTreeRipe,
  Tile.MirefigMid,
  Tile.MirefigRipe,
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

/**
 * THE PROP STANDS IN WATER (contested lands band 7, site-grammar G-2;
 * R7: drowned rows must READ drowned). The amphibious set: props an
 * author may write INTO a WaterShallow run — the drowned croft rows'
 * fences and scarecrow, the Charter's dike stakes and the Company's
 * rag stakes in the channel, the sluice and its strung twin, the
 * mark-post, a rail, the skral kit's dugout, totem, weir panels,
 * keep-pool and reed shelter, the irrigation trench, a felled log in
 * the shallows. Every one of these falls through nearestFloor (whose
 * fallback is Grass: WATER IS NOT A FLOOR) or GRASS_LIKE (the fence
 * family), so before G-2 a fence written into a pond baked a green
 * square in the water. Now, for exactly this set, `wetUnderGround`
 * reads the cardinal ring first: run-mates (any other member of the
 * set) are skipped as deck tiles are skipped under a bridge, and if
 * the water in the ring is at least the land, the prop stands in
 * that water (the most common depth wins) and the pool's own contour
 * runs beneath it. A dry ring falls through to the family's shipped
 * underlay untouched (a fence on a lawn is still on a lawn), which
 * is what keeps every existing bake byte-identical: only a prop with
 * water beside it changes. The model is deckUnderGround (below).
 */
export const WET_STANDERS: ReadonlySet<number> = new Set<number>([
  Tile.Fence,
  Tile.FenceBroken,
  Tile.Scarecrow,
  Tile.CharterPost,
  Tile.RedRagStake,
  Tile.SluiceGate,
  Tile.SluiceGateStrung,
  Tile.TimberPost,
  Tile.RailWood,
  Tile.Dugout,
  Tile.TideTotem,
  Tile.WeirPanels,
  Tile.KeepPool,
  Tile.ReedShelter,
  Tile.IrrigationChannel,
  Tile.FelledLog,
  // THE STANDING COURSE (contested lands band 9d, E3; rulings R-D):
  // the Dolmen's dry stone stands in the wet by its own sentence — the
  // Sinter's ninth course and Drusa's cell on the Sett's authored wet
  // floor, the Course's last courses in the Drowned Meadow's sheet
  // and the ford's bank stones (9e). Without the row a CourseWall
  // written into WaterShallow baked a green square in the water.
  Tile.CourseWall,
  Tile.CourseStile,
  Tile.CorbelCell,
  Tile.PlumbStone,
]);

/**
 * The water a wet-standing prop stands in, or null when the ring is
 * dry (or unknowable) and the family's own underlay should decide.
 * Cardinal ring first; when every cardinal is a run-mate or unknown
 * (a fence mid-run across a pond), the diagonals decide; still
 * nothing, null. Ties go to the water: a stake with pond on two sides
 * and bank on two is a stake in the shallows.
 */
export function wetUnderGround(ground: GroundSampler, tx: number, ty: number): number | null {
  const rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [[1, 0], [-1, 0], [0, 1], [0, -1]],
    [[1, 1], [-1, 1], [1, -1], [-1, -1]],
  ];
  for (const ring of rings) {
    let shallow = 0;
    let water = 0;
    let deep = 0;
    let land = 0;
    for (const [dx, dy] of ring) {
      const t = ground(tx + dx, ty + dy);
      if (t === undefined || WET_STANDERS.has(t)) continue;
      if (t === Tile.WaterShallow) shallow++;
      else if (t === Tile.Water || isFishingTile(t)) water++;
      else if (t === Tile.WaterDeep) deep++;
      else land++;
    }
    const wet = shallow + water + deep;
    if (wet === 0 && land === 0) continue;
    if (wet === 0 || wet < land) return null;
    if (deep >= water && deep >= shallow) return Tile.WaterDeep;
    if (water >= shallow) return Tile.Water;
    return Tile.WaterShallow;
  }
  return null;
}

/** Effective ground for blob purposes: objects show what's under them. */
function effectiveGround(ground: GroundSampler): GroundSampler {
  // Per-bake memos: one axis flood per span, one underground verdict
  // per deck tile (the apron test needs the axis).
  const deckAxisMemo = new Map<number, boolean>();
  const deckUnderMemo = new Map<number, number>();
  const g = (tx: number, ty: number): number => {
    const t = ground(tx, ty);
    if (t === undefined) return Tile.Grass;
    // THE PROP STANDS IN WATER (G-2): the amphibious set reads its
    // ring before any family branch can hand it a lawn.
    if (WET_STANDERS.has(t)) {
      const wet = wetUnderGround(ground, tx, ty);
      if (wet !== null) return wet;
    }
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
      t === Tile.CompostBin ||
      t === Tile.Well ||
      t === Tile.MushroomLog ||
      t === Tile.MushroomLogSeeded ||
      t === Tile.PalegillMid ||
      t === Tile.PalegillRipe ||
      t === Tile.Windmill ||
      t === Tile.ButterChurn ||
      t === Tile.FruitPress ||
      t === Tile.BrewKeg ||
      t === Tile.Smoker ||
      t === Tile.DryingRack ||
      t === Tile.Apiary ||
      t === Tile.FeedTrough ||
      t === Tile.Scarecrow ||
      t === Tile.HayBale ||
      t === Tile.Silo ||
      t === Tile.Dovecote ||
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
    // War-camp props stand on the camp's trampled ground the same way.
    if (t >= Tile.StandingTorch && t <= Tile.HideFrame) return nearestFloor(ground, tx, ty);
    // The strays that fell past every family branch and paved their
    // own grass diamond onto any floor: the dyed banner pole (the
    // classic pole rides the Barrel..Basin band), the irrigation
    // trench (cut INTO whatever field or yard holds it), and the
    // herbalist's late shelf. None of them paves.
    if (
      (t >= Tile.BannerPoleDyed && t < Tile.BannerPoleDyed + DYE_COUNT) ||
      t === Tile.IrrigationChannel ||
      t === Tile.HerbPlanter ||
      t === Tile.TiedParcels
    ) {
      return nearestFloor(ground, tx, ty);
    }
    // Elven props (crafted AND imbued) stand on whatever fine floor
    // the fair house laid.
    if (t >= Tile.ArcaneBeacon && t <= Tile.RunePillar) return nearestFloor(ground, tx, ty);
    // THE LONG DARK FURNISHED: dungeon props stand on whatever the
    // dark laid down — flagstone, raw cave floor, or rubble.
    if (t >= Tile.MossBarrel && t <= Tile.IronGrate) return nearestFloor(ground, tx, ty);
    // THE BANKS GET THEIR GOODS: shore props stand on whatever bank
    // the tide left — sand, trampled dirt, or meadow.
    if (t >= Tile.FishRack && t <= Tile.TideChimes) return nearestFloor(ground, tx, ty);
    // THE TOWN KEEPS ITS DAY: street furniture stands on whatever
    // the town paved — flagstone, path, or the green.
    if (t >= Tile.TownFountain && t <= Tile.StoneBench) return nearestFloor(ground, tx, ty);
    // THE TRADES KEEP SHOP: workshop gear stands on the shop floor
    // or the yard the trade tramples — never its own material.
    if (t >= Tile.QuenchTrough && t <= Tile.DisplayTable) return nearestFloor(ground, tx, ty);
    // THE COMMONS: the general shelf stands on whatever the scene
    // laid — boards, flags, path, green, or the shore's own sand.
    if (t >= Tile.CandleStand && t <= Tile.BeachedSkiff) return nearestFloor(ground, tx, ty);
    // THE WARREN AND THE LEGION: the camps' life stands on the same
    // trampled ground the first war-camp shelf stands on.
    if (t >= Tile.BoneMidden && t <= Tile.GnawTrough) return nearestFloor(ground, tx, ty);
    // THE LOG YARD: the mill timber stands on the yard it serves —
    // never its own material. (462 ChoppingBlock RETIRED — the range
    // re-anchored on the surviving log family.)
    if (t >= Tile.FelledLog && t <= Tile.LogPileEndOn) return nearestFloor(ground, tx, ty);
    // THE KEPT FLAME (+ THE BOLD WICK): a candle court stands on
    // whatever the room laid — boards, flags, or the green; wax
    // never paves.
    if (t >= Tile.CandleCluster && t <= Tile.TripleCandlesOut) return nearestFloor(ground, tx, ty);
    // THE KNIGHT'S KEEPING: armory stands keep the garrison's floor
    // under them — flags, boards, or the drill yard's dirt (the
    // standard's whole dye band rides the same branch).
    if (t >= Tile.ArmorStand && t < Tile.BannerStand + DYE_COUNT) return nearestFloor(ground, tx, ty);
    // The palisade stands in open country like the garrison curtain:
    // whatever walkable terrain fronts it continues beneath (south
    // first — that side's base sliver shows), and a family member
    // never lends its own skin. Camps ring meadow, trail, and dirt;
    // dressed flags would read as town masonry.
    if (PALISADE_TILES.has(t)) {
      const pick = (tt: Tile | undefined): Tile | null =>
        tt !== undefined && !tileDef(tt).solid && !PALISADE_TILES.has(tt) && tt !== Tile.Ramp
          ? tt
          : null;
      return (
        pick(ground(tx, ty + 1)) ??
        pick(ground(tx, ty - 1)) ??
        pick(ground(tx + 1, ty)) ??
        pick(ground(tx - 1, ty)) ??
        Tile.Dirt
      );
    }
    // The hedge stands in the garden the same way — whatever ground
    // fronts it continues beneath, and a run-mate never lends its own
    // skin. The open-air fallback is GRASS, never the camp's dirt: a
    // hedge is planted in living earth.
    if (HEDGE_TILES.has(t)) {
      const pick = (tt: Tile | undefined): Tile | null =>
        tt !== undefined && !tileDef(tt).solid && !HEDGE_TILES.has(tt) && tt !== Tile.Ramp
          ? tt
          : null;
      return (
        pick(ground(tx, ty + 1)) ??
        pick(ground(tx, ty - 1)) ??
        pick(ground(tx + 1, ty)) ??
        pick(ground(tx - 1, ty)) ??
        Tile.Grass
      );
    }
    // THE IRON REST: the railing stands where the smith set it —
    // whatever walkable ground fronts it continues beneath (south
    // first — the curb's base sliver shows), and a family member
    // never lends its own skin. The open-air fallback is GRASS: a
    // graveyard is a lawn kept quiet, never a camp's mud.
    if (IRON_FENCE_TILES.has(t)) {
      const pick = (tt: Tile | undefined): Tile | null =>
        tt !== undefined && !tileDef(tt).solid && !IRON_FENCE_TILES.has(tt) && tt !== Tile.Ramp
          ? tt
          : null;
      return (
        pick(ground(tx, ty + 1)) ??
        pick(ground(tx, ty - 1)) ??
        pick(ground(tx + 1, ty)) ??
        pick(ground(tx - 1, ty)) ??
        Tile.Grass
      );
    }
    // The graveyard's stones stand on the yard's own ground — turf,
    // path, or bare earth; carved granite never paves its plot.
    if (t >= Tile.Gravestone && t <= Tile.MournerStatue) return nearestFloor(ground, tx, ty);
    // THE SCARRED LAND (the band anchored on living endpoints,
    // Tile.RuinWallStone..Tile.SluiceGateStrung, and the band 8 clamp
    // isScarredTile names past it; the dead hedge left through the
    // hedge branch above). Per-family fronting:
    if (isScarredTile(t)) {
      const front = (fallback: Tile): Tile => {
        // Whatever walkable ground fronts the piece continues beneath
        // it (south first — that side's base sliver shows); a family
        // member never lends its own skin; ramps never pave.
        const pick = (tt: Tile | undefined): Tile | null =>
          tt !== undefined && !tileDef(tt).solid && !isScarredTile(tt) && tt !== Tile.Ramp
            ? tt
            : null;
        return (
          pick(ground(tx, ty + 1)) ??
          pick(ground(tx, ty - 1)) ??
          pick(ground(tx + 1, ty)) ??
          pick(ground(tx - 1, ty)) ??
          fallback
        );
      };
      // A. the cold hearth: a shell keeps its floor — the ruin walls
      // and what fell inside them stand on the boards or flags the
      // house laid (nearestFloor), and a shell with no floor left
      // stands on the open ground.
      // THE FOOT STANDS ON WHAT FRONTS IT (K1 polish): a ruin wall
      // shows the ground south of its foot — the tile's south sliver
      // under an E-W course, the whole open square around a N-S
      // band's free south end. nearestFloor alone painted that
      // square in the HOUSE's boards (the floor lay east of the
      // band), a darker brown plate past the post foot against the
      // lane — so whatever walkable open ground fronts the wall to
      // the SOUTH continues beneath it first, and the house floor
      // only where nothing walkable fronts it (an interior run, a
      // run-mate south). Same seam law as every fence and hedge.
      // THE STANDING COURSE (band 9b) keeps the same fronting law:
      // the Dolmen's wall and stile stand on whatever open ground
      // fronts them (the Course crosses meadow and marl alike).
      if (RUIN_WALL_TILES.has(t) || COURSE_TILES.has(t)) {
        const south = ground(tx, ty + 1);
        if (south !== undefined && !tileDef(south).solid && !isScarredTile(south) && south !== Tile.Ramp) {
          return south;
        }
        return nearestFloor(ground, tx, ty);
      }
      if (t >= Tile.CharredBeam && t <= Tile.ChimneyStack) {
        return nearestFloor(ground, tx, ty);
      }
      // The clamp (band 8) is family A by voice but stands in a
      // charcoal yard, never in a shell: the trodden ground that
      // fronts it continues beneath, dirt where nothing does — a
      // burner's yard is raked bare, and the painter lays its own
      // ash apron over whatever that is.
      if (t === Tile.SmolderHeap) return front(Tile.Dirt);
      // THE STANDING COURSE (band 9b): a set floor is bared — the cell
      // stands on trodden dirt; the plumb stone is planted on the verge
      // where the Course crosses a threshold, so grass continues.
      if (t === Tile.CorbelCell) return front(Tile.Dirt);
      if (t === Tile.PlumbStone) return front(Tile.Grass);
      // B. the field after: trampled ground — the field's own skin
      // continues; open-country fallback is DIRT (a fight tramples).
      if (t >= Tile.BrokenCart && t <= Tile.BeastBones) return front(Tile.Dirt);
      // C. the stripped land: the stump, the snag and the spoil stand
      // in the country that was cut — grass continues beneath.
      if (t >= Tile.CharredStump && t <= Tile.SpoilHeap) return front(Tile.Grass);
      // D. the gloom: the ground under it is DIRT by default — blight
      // kills the green; the pool and the row sit in it.
      if (t >= Tile.GloomStone && t <= Tile.CropBlighted) return front(Tile.Dirt);
      // E. the marks stand on the road or the verge they claim.
      if (t >= Tile.CharterPost && t <= Tile.PitLampDark) return nearestFloor(ground, tx, ty);
      // F. the displaced camp on whatever they found — a camp
      // tramples, so the fallback is dirt.
      if (t >= Tile.LeanTo && t <= Tile.FieldCot) return front(Tile.Dirt);
      // G. the states keep the living prop's ground: the broken fence
      // takes EXACTLY the living fence's underlay (GRASS_LIKE gives
      // every Fence tile Grass unconditionally — fronting from a
      // walkable neighbour put a dirt cell between two grass cells at
      // the one tile the eye is drawn to); the burnt post, the fouled
      // well, the dark lamp and the gates stand on the yard the living
      // prop stood on.
      if (t === Tile.FenceBroken) return Tile.Grass;
      return nearestFloor(ground, tx, ty);
    }
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
  /** THE STRIP PAINTS ASIDE's scratch canvas (fringe jobs only) —
   *  the caller pools it when the job completes or dies. */
  fringeScratch?: HTMLCanvasElement;
  /**
   * THE LIVING GROUND's cache words (plan §12.2): the reach sig this
   * job was built against (0 = no stroke in reach = today's paint,
   * byte for byte) and the FIELD-AWARE hash of the halo it actually
   * painted (0 when the halo was all zero). The renderer keys its
   * BakedChunk on both: a reach change re-bakes only if the painted
   * words moved.
   */
  spectrumSig: number;
  spectrumHaloSig: number;
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

/**
 * THE CHUNK CANVAS IS BORROWED, NOT MINTED.
 *
 * A chunk bake is the largest single allocation the client makes —
 * (32*px + 2*gutter)^2 * 4 bytes: 4.3MB at px=32, 17MB at the hi-res
 * tier — and it was minted fresh every time, then dropped un-pooled
 * when the entry was replaced or evicted. Measured over five minutes
 * of travel that is 1.1GB from the base bake and 443MB from the
 * elevated one: 65% of ALL canvas bytes the client allocates, from
 * 1.5% of its canvas calls.
 *
 * Every chunk canvas of a given tier is EXACTLY the same size, which
 * makes them the one lane where reuse needs no fit search and can
 * never waste a byte — hand the bake a retired canvas and it is
 * already the right shape.
 *
 * A borrowed canvas carries two obligations a fresh one does not, and
 * both are load-bearing: it still holds the PREVIOUS chunk's pixels,
 * so it must be cleared or the old ground shows through wherever the
 * new bake paints nothing; and it still carries the previous bake's
 * gutter translate, so the transform must be reset before this one is
 * applied or every step lands a gutter further out. Setting `width`
 * would do both, but only by reallocating the backing store — the
 * exact cost we are here to avoid — so when the size already matches
 * we clear and reset by hand.
 */
function bakeCanvasFor(
  px: number,
  reuse?: HTMLCanvasElement | null,
  rows: number = CHUNK_SIZE,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const G = bakeGutter(px);
  // Width is always the full chunk (row slices blit full width); height
  // is the row span — a lifted level covering `rows` of CHUNK_SIZE rows
  // (B2) pays only for those, the base bake passing the default full
  // height (byte-identical to before).
  const w = CHUNK_SIZE * px + G * 2;
  const h = rows * px + G * 2;
  let canvas: HTMLCanvasElement;
  if (reuse && reuse.width === w && reuse.height === h) {
    canvas = reuse;
    const c = canvas.getContext('2d')!;
    // THE POOLED CANVAS FORGETS ITS PAST (fringe round's discovery):
    // a pooled ctx keeps the dead bake's lineCap/join/dash/alpha —
    // and the scramble probe PROVED skin strokes consume inherited
    // stroke state (12.5k px moved under a scrambled cap/join/dash).
    // Until now every bake's output depended on which pooled canvas
    // it drew — a determinism lottery. reset() clears state AND
    // pixels without reallocating; the manual fallback covers old
    // engines.
    if (typeof c.reset === 'function') {
      c.reset();
    } else {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, w, h);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.setLineDash([]);
      c.lineDashOffset = 0;
      c.lineCap = 'butt';
      c.lineJoin = 'miter';
      c.miterLimit = 10;
    }
  } else {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(G, G);
  return { canvas, ctx };
}

/**
 * THE FRINGE RE-BAKE (foundation audit's charted lever). A neighbor
 * arrival can only change a chunk's painted pixels within a border
 * fringe — the blob halo reaches 2 rings, the detail pass 1 tile,
 * deck lookahead a hair more — yet a fringe bump used to re-run all
 * ~29 sliced steps over the whole canvas, and one arrival bumps up
 * to 8 neighbors. A fringe job instead COPIES the prior bake whole,
 * CLEARS the affected border strips, and re-runs every step CLIPPED
 * to them (loops narrowed where they dominate). Determinism makes
 * this pixel-exact: the strip is wide enough (FRINGE_TILES = reach 3
 * + 1 paint bleed) that every pixel at a strip boundary depends only
 * on unchanged data, strips sit on tile boundaries (integer px — the
 * clip edge is crisp, no partial coverage), and the cleared strip
 * recomposes from the base up in the full bake's own step order.
 * scripts/probes/fringe-seam.mjs is the proof, and its gate is
 * STRUCTURAL — the measured truth about this GPU canvas, in order
 * of discovery: (1) identical op streams on identical canvases are
 * BYTE-EXACT (the null cases pin it; a no-narrowing fringe measured
 * zero differing bytes). (2) clip() re-rounds AA coverage on
 * interior pixels — which is why the strips paint ASIDE, never
 * under a clip. (3) ANY op-stream change re-rolls scattered AA edge
 * pixels across the whole canvas, magnitude scaling with the stream
 * delta (one mutated tile ±14; the narrowed meadow's absent
 * thousands of fills ±27) — but every such pixel is a legitimate
 * roll of the same content, landing as SINGLES and short boundary
 * chains. A real defect is a CONTIGUOUS region. The gate therefore
 * bounds the largest 4-connected cluster of >8-delta pixels (24)
 * plus a hard per-channel cap (48); measured: honest clusters 0-17,
 * canaries 28-2507.
 */
export interface FringeSpec {
  /** Edge mask: 1 = N, 2 = S, 4 = W, 8 = E — the sides changed
   *  neighbor data reaches in from. */
  mask: number;
  /** The prior COMPLETE bake of the same data at the same tier —
   *  copied whole; the strips are overwritten at completion. */
  copyFrom: HTMLCanvasElement;
  /** Pooled canvas for the strip scratch (see THE STRIP PAINTS
   *  ASIDE), or null to mint one. The job returns it via
   *  ChunkBakeJob.fringeScratch for the caller to recycle. */
  scratch?: HTMLCanvasElement | null;
}

/** Strip depth in tiles: neighbor-data reach (3 — THE BUMP IS
 *  EARNED's own constant) + 1 tile of paint bleed, so clip-boundary
 *  pixels depend only on unchanged data. */
export const FRINGE_TILES = 4;

/**
 * The affected strips as DISJOINT rects in bake-ctx coordinates
 * (post gutter-translate: the chunk spans [0, CHUNK*px), the gutter
 * [-G, 0) and [CHUNK*px, CHUNK*px+G)). Disjointness is load-bearing:
 * strips clear once and every repaint pass visits a pixel once —
 * translucent content (detail flecks, skin crumbs) is not
 * double-composited at corners. N/S strips take the full width;
 * W/E strips take only the rows between them.
 */
export function fringeStrips(
  mask: number,
  px: number,
  G: number,
): Array<[number, number, number, number]> {
  const span = CHUNK_SIZE * px;
  const D = FRINGE_TILES * px;
  const rects: Array<[number, number, number, number]> = [];
  const n = (mask & 1) !== 0;
  const s = (mask & 2) !== 0;
  const midY0 = n ? D : -G;
  const midY1 = s ? span - D : span + G;
  if (n) rects.push([-G, -G, span + G * 2, D + G]);
  if (s) rects.push([-G, span - D, span + G * 2, D + G]);
  if ((mask & 4) !== 0 && midY1 > midY0) rects.push([-G, midY0, D + G, midY1 - midY0]);
  if ((mask & 8) !== 0 && midY1 > midY0) rects.push([span - D, midY0, D + G, midY1 - midY0]);
  return rects;
}

export function startChunkBake(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  woodSkin?: WoodSkinSampler,
  live = true,
  reuse?: HTMLCanvasElement | null,
  fringe?: FringeSpec,
): ChunkBakeJob {
  const G = bakeGutter(px);
  const { canvas, ctx: mainCtx } = bakeCanvasFor(px, reuse);
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  const g = effectiveGround(ground);

  const steps: Array<() => void> = [];
  const darkBand = baseY >= 512;
  // Step 0 — THE HALO (THE LIVING GROUND, LG-1): the chunk's read of
  // the spectrum field, built beside the layer index when anything
  // reaches the chunk; null (and never built) at sig 0. Every fold
  // branch below is guarded on `fold === null` → today's code.
  const { sig: foldSig, view: fold } = foldForBake(cx, cy);

  // THE STRIP PAINTS ASIDE (the fringe mechanism). Clipping was the
  // obvious shape and it CANNOT be byte-exact: this browser rounds
  // antialiased coverage differently through a clip mask (measured:
  // ±1-per-channel on ~0.4% of strip pixels — scattered AA edges of
  // skin blobs and flecks; plain fills exact). So no clip anywhere:
  // fringe steps paint a SCRATCH chunk canvas at the very same
  // device coordinates (same integer translate — identical
  // rasterization by construction), and one final step clears the
  // strip rects on the real canvas and copies them across (both ops
  // proven byte-exact by the null cases). Steps run in the full
  // bake's own order from the same default state, so inter-step
  // context leakage — whatever it may be — is identical too. The
  // skins deliberately run WHOLE: their worn-band strokes and crumb
  // runs phase along multi-cell boundary paths, and truncating a
  // run shifts everything downstream of the cut; meadow and detail
  // are per-cell/per-tile and narrow safely.
  const fRects = fringe ? fringeStrips(fringe.mask, px, G) : null;
  let fTileMask: Uint8Array | null = null; // tiles -1..CHUNK per axis, grown 1
  let fringeScratch: HTMLCanvasElement | undefined;
  let ctx = mainCtx;
  if (fringe && fRects) {
    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.drawImage(fringe.copyFrom, 0, 0);
    mainCtx.restore();
    const sc = bakeCanvasFor(px, fringe.scratch ?? null);
    fringeScratch = sc.canvas;
    ctx = sc.ctx;
    // THE SCRATCH WEARS THE SAME COAT: seed it with the base too and
    // clear only the strips. The GPU canvas rasterizes big skin
    // region paths content-sensitively — with TRANSPARENT
    // out-of-strip texels underneath, skin-boundary AA inside the
    // strip moved by up to 27; with the base's opaque pixels there
    // (never copied back, so correctness owes them nothing), the
    // divergence collapses into the ordinary op-stream class, and
    // the meadow can narrow again — it is HALF the bake (1.6-1.8ms
    // of 3.4 measured per-step).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fringe.copyFrom, 0, 0);
    ctx.restore();
    for (const [rx, ry, rw, rh] of fRects) ctx.clearRect(rx, ry, rw, rh);
    const TS = CHUNK_SIZE + 2;
    fTileMask = new Uint8Array(TS * TS);
    for (const [rx, ry, rw, rh] of fRects) {
      // Detail reach 3: most flecks stay within their tile, but the
      // long ornaments (snow drift streaks, shore scatter) paint up
      // to ~3 tiles from their anchor — the seam battery measured
      // maxd 15-27 of missing streak ink at growth 1 on snow/coast/
      // forest strips, and clean at 3.
      const tx0 = Math.max(-1, Math.floor(rx / px) - 3);
      const tx1 = Math.min(CHUNK_SIZE, Math.ceil((rx + rw) / px) + 2);
      const ty0 = Math.max(-1, Math.floor(ry / px) - 3);
      const ty1 = Math.min(CHUNK_SIZE, Math.ceil((ry + rh) / px) + 2);
      for (let ty = ty0; ty <= ty1; ty++)
        for (let tx = tx0; tx <= tx1; tx++) fTileMask[tx + 1 + (ty + 1) * TS] = 1;
    }
  }
  const add = (fn: () => void): void => {
    steps.push(fn);
  };

  // 1. Meadow base: large soft noise patches, no per-tile checker.
  // THE PROLOGUE JOINS THE QUEUE: the fine pass is ~17k fillRects with
  // two noise samples each — far too dear to run synchronously once
  // per job start (a border crossing starts many jobs in one frame).
  // Live jobs paint a COARSE placeholder now (one cell per tile, same
  // tones — a usable stand-in at ~1/16 the cost) and the fine pass
  // repaints over it in row-band steps. Replacement jobs build behind
  // the old blit, so they defer even the placeholder to the steps.
  const cell = Math.max(4, Math.floor(px / 4));
  const paintMeadow = (
    y0: number,
    y1: number,
    x0 = -G,
    x1 = CHUNK_SIZE * px + G,
  ): void => {
    // Cells snap to the -G lattice so a narrowed range paints the
    // SAME cells (same tones at the same corners) the full pass
    // would — a free-running start would shift every sample point.
    const xs = -G + Math.floor((x0 + G) / cell) * cell;
    const ys = -G + Math.floor((y0 + G) / cell) * cell;
    // Step 1 — THE SUBSTRATE FOLDS: the four-tone table is chosen by
    // the field at the cell's centre (half a cell past the corner the
    // noise samples), so the band step lands on the isoline.
    const half = cell / 2 / px;
    for (let y = ys; y < y1; y += cell) {
      for (let x = xs; x < x1; x += cell) {
        ctx.fillStyle = meadowToneFold(fold, baseX, baseY, baseX + x / px, baseY + y / px, half);
        ctx.fillRect(x, y, cell, cell);
      }
    }
  };
  const paintBase = (): void => {
    if (darkBand) {
      // Dark band chunks get a cave-rock base instead of the meadow.
      ctx.fillStyle = '#2e2938';
      ctx.fillRect(-G, -G, canvas.width, canvas.height);
    }
    // Raised/sunken regions darken in the placeholder too — a fresh
    // mountain chunk must never flash meadow-green while its layers
    // stream in. The 2b step repeats this AFTER the skins, restoring
    // the real paint order.
    fillMask(ctx, (tx, ty) => elev(tx, ty) !== 0, baseX, baseY, px, '#282334');
  };
  if (live && !darkBand) {
    // The coarse placeholder folds too (a folded chunk never flashes
    // summer-green while its fine pass streams in).
    const coarse = Math.max(cell, px);
    const halfC = coarse / 2 / px;
    for (let y = -G; y < CHUNK_SIZE * px + G; y += coarse) {
      for (let x = -G; x < CHUNK_SIZE * px + G; x += coarse) {
        ctx.fillStyle = meadowToneFold(fold, baseX, baseY, baseX + x / px, baseY + y / px, halfC);
        ctx.fillRect(x, y, coarse, coarse);
      }
    }
  }
  if (live) paintBase();
  if (!darkBand) {
    // The fine meadow pass, split into four row bands per the budget.
    // Each band re-darkens its own rows immediately (clipped fillMask)
    // so a mountain chunk never flashes meadow-green between steps.
    const span = CHUNK_SIZE * px + G * 2;
    const band = Math.ceil(span / 4 / cell) * cell;
    for (let y0 = -G; y0 < CHUNK_SIZE * px + G; y0 += band) {
      const y1 = Math.min(y0 + band, CHUNK_SIZE * px + G);
      add(() => {
        if (fRects !== null) {
          // Narrowed per disjoint rect (THE SCRATCH WEARS THE SAME
          // COAT makes this safe — see the fringe init above).
          for (const [rx, ry, rw, rh] of fRects) {
            const by0 = Math.max(y0, ry);
            const by1 = Math.min(y1, ry + rh);
            if (by1 > by0) paintMeadow(by0, by1, rx, rx + rw);
          }
        } else {
          paintMeadow(y0, y1);
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(-G, y0, CHUNK_SIZE * px + G * 2, y1 - y0);
        ctx.clip();
        fillMask(ctx, (tx, ty) => elev(tx, ty) !== 0, baseX, baseY, px, '#282334');
        ctx.restore();
      });
    }
    // Step 2 — THE WASH: one sliced step per (look, band) present,
    // over the folded meadow and under every skin (a road through a
    // blighted wood covers it exactly as it covers the meadow). Runs
    // WHOLE in a fringe job — see paintFoldWash. Absent at sig 0, so
    // an unfolded chunk's step count is what it always was.
    if (fold !== null) {
      for (const [look, b] of foldWashPasses(fold)) {
        add(() => {
          paintFoldWash(ctx, fold, look, b, baseX, baseY, px);
        });
      }
    }
  }
  // Restore the placeholder order over the fine repaint (and paint it
  // at all, for replacement jobs that skipped the synchronous pass).
  add(paintBase);

  // 2. Material skins, lowest to highest, contoured on the dual grid —
  // one layer per step. The halo index is shared by every layer step.
  if ((globalThis as unknown as { FRINGE_SCRAMBLE?: boolean }).FRINGE_SCRAMBLE) {
    // DEV (seam bisect): scramble carry-over ctx state before the
    // skins — a painter that draws without setting its own style
    // shows up as a diff against an unscrambled full bake.
    steps.push(() => {
      ctx.fillStyle = '#ff00ff';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3.7;
      ctx.setLineDash([5, 3]);
      ctx.lineDashOffset = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
    });
  }
  let idx: Int8Array | null = null;
  for (let li = 0; li < BLOB_LAYERS.length; li++) {
    add(() => {
      idx ??= computeLayerIdx(g, baseX, baseY);
      paintLayerSkin(ctx, idx, li, baseX, baseY, px, g, fold);
    });
  }

  add(() => {
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
  const TS = CHUNK_SIZE + 2;
  for (let r0 = -1; r0 <= CHUNK_SIZE; r0 += DETAIL_STEP_ROWS) {
    const r1 = Math.min(r0 + DETAIL_STEP_ROWS - 1, CHUNK_SIZE);
    add(() => {
      for (let ly = r0; ly <= r1; ly++) {
        for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
          // Fringe: only tiles whose paint can reach a strip (the
          // detail margin is 1 tile; the mask is grown by it).
          if (fTileMask !== null && fTileMask[lx + 1 + (ly + 1) * TS] === 0) continue;
          const tx = baseX + lx;
          const ty = baseY + ly;
          // Raised/sunken tiles' details belong to their lifted layer.
          if (elev(tx, ty) !== 0) continue;
          drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px, detail, g, ground, fold);
        }
      }
    });
  }

  // 5. Raised decks: docks and bridges over the water painted LAST,
  // so the deck's lifted top (which reaches into the north neighbor's
  // cell) covers that neighbor's water details instead of wearing
  // them. Ground-level decks only — a deck on a terrace paints into
  // its own elevated layer (bakeElevated), which blits over these
  // rows shifted; painting it here too would bury it. (Fringe: the
  // scans stay whole — a run's board tones are row-keyed and world-
  // keyed, so the clip alone keeps them exact; the scan is ~1k tile
  // reads, not a paint cost.)
  const groundDeck = (tx: number, ty: number): boolean => elev(tx, ty) === 0;
  add(() => drawDocks(ctx, ground, baseX, baseY, px, groundDeck));
  add(() => drawBridges(ctx, ground, baseX, baseY, px, groundDeck));
  add(() => drawPorchDecks(ctx, ground, baseX, baseY, px, woodSkin, groundDeck));
  if (fRects !== null && fringeScratch !== undefined) {
    const sc = fringeScratch;
    steps.push(() => {
      // THE STRIP COMES HOME: clear each strip on the real canvas and
      // copy the scratch's identical-coordinates content across —
      // integer offsets, no filtering, byte-exact.
      mainCtx.save();
      mainCtx.setTransform(1, 0, 0, 1, 0, 0);
      for (const [rx, ry, rw, rh] of fRects) {
        mainCtx.clearRect(rx + G, ry + G, rw, rh);
        mainCtx.drawImage(sc, rx + G, ry + G, rw, rh, rx + G, ry + G, rw, rh);
      }
      mainCtx.restore();
    });
  }
  // THE HALO GOES HOME: a folded job returns its borrowed halo in its
  // last step (a job that dies mid-flight just drops it to the GC).
  if (fold !== null) steps.push(() => releaseFoldView(fold));

  return {
    canvas,
    steps,
    next: 0,
    fringeScratch,
    spectrumSig: foldSig,
    spectrumHaloSig: fold === null ? 0 : fold.sig,
  };
}

/** The one-shot bake: start + run every step. Output is identical to
 *  the sliced path — this is the sliced path, run to completion. */
/**
 * THE GLYPH IS THE AUTHOR'S (floor-banner artifact fix): wall-hung
 * details bake a flat marker glyph into the ground so Studio authors
 * see what hangs where — but in GAME that ground is only ever hidden
 * under a wall's paint, and any orphaned hanging (authored on a
 * non-wall tile) leaked its glyph onto walkable ground as a 'floor
 * banner' the player could stand on. The glyph now bakes ONLY through
 * this synchronous editor door; the game's sliced bake never sets it.
 */
let studioBake = false;

export function bakeChunk(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  woodSkin?: WoodSkinSampler,
): HTMLCanvasElement {
  studioBake = true;
  try {
    const job = startChunkBake(ground, detail, elev, cx, cy, px, woodSkin);
    while (!stepChunkBake(job)) {
      /* run to completion */
    }
    return job.canvas;
  } finally {
    studioBake = false;
  }
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
      // The boards, in the house's own wood when a wall adjoins. The
      // joint rhythm follows THE ARM LAW measured on the porch's own
      // surface, so a walkway wing turns its bond at the corner.
      const porchArm = (ax: number, ay: number): boolean => {
        const CAP = 12;
        let rx = 1;
        let ry = 1;
        for (let i = 1; i <= CAP && isPorchSurface(ground, ax - i, ay); i++) rx++;
        for (let i = 1; i <= CAP && isPorchSurface(ground, ax + i, ay); i++) rx++;
        for (let i = 1; i <= CAP && isPorchSurface(ground, ax, ay - i); i++) ry++;
        for (let i = 1; i <= CAP && isPorchSurface(ground, ax, ay + i); i++) ry++;
        if (ry !== rx) return ry > rx;
        return false; // a square porch keeps the long-plank read
      };
      const armV = porchArm(tx, ty);
      paintDeckBoards(ctx, tx, ty, gx, gy, px, liftB, 'porch', armV, tones);
      const dy0 = gy - liftB;
      // The wall's shadow skirt: the porch floor must never fuse into
      // the siding's plank courses (one brown field, no plane).
      const northTile = ground(tx, ty - 1);
      if (!hasN && northTile !== undefined && WALL_RUN_TILES.includes(northTile as Tile)) {
        paintDeckWallSkirt(ctx, gx, dy0, px);
      }
      // Rim boards edge-on at the open sides, and header beams where
      // an adjoining porch arm turns its rhythm.
      if (!hasW) paintDeckSideFascia(ctx, gx, gy, px, liftB, 'porch', true, !hasS, fasciaBase);
      if (!hasE) paintDeckSideFascia(ctx, gx, gy, px, liftB, 'porch', false, !hasS, fasciaBase);
      if (isPorchSurface(ground, tx - 1, ty) && porchArm(tx - 1, ty) !== armV) {
        paintHeaderBeam(ctx, gx, dy0, px, fasciaBase, true);
      }
      if (isPorchSurface(ground, tx, ty - 1) && porchArm(tx, ty - 1) !== armV) {
        paintHeaderBeam(ctx, gx, dy0, px, fasciaBase, false);
      }
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
      const sideFoot = gy + px - (hasS ? liftB : 0);
      if (!hasW) {
        ctx.moveTo(gx, topY);
        ctx.lineTo(gx, sideFoot);
      }
      if (!hasE) {
        ctx.moveTo(gx + px, topY);
        ctx.lineTo(gx + px, sideFoot);
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
          paintDeckPile(
            ctx,
            gx + fpos * px,
            gy + px - liftB * 0.25,
            px,
            px * 0.11,
            hashCoords(149, tx * 2 + (fpos > 0.5 ? 1 : 0), ty),
            '#4e3a22',
            '#77593a',
          );
        }
      }

      // SIDE LEGS + EDGE SHADE (round 7): a long run's west/east edges
      // over open water carried no structure at all, so a whole pier
      // read as a plank mat laid flat on the surface. Each water-facing
      // side edge hangs ONE pile half-proud of the boards (the deck
      // overhang covers its inner half when the boards paint over it)
      // with its waterline collar, and lays a soft AO band on the water
      // hugging the edge — the overhang's standing shadow, the same
      // dark the south faces cast.
      const sideWaterW = !hasW && isWaterTile(ground(tx - 1, ty));
      const sideWaterE = !hasE && isWaterTile(ground(tx + 1, ty));
      for (const side of [sideWaterW ? -1 : 0, sideWaterE ? 1 : 0]) {
        if (side === 0) continue;
        const edgeX = side < 0 ? gx : gx + px;
        ctx.fillStyle = 'rgba(20, 34, 62, 0.2)';
        ctx.fillRect(side < 0 ? edgeX - px * 0.12 : edgeX, gy, px * 0.12, px);
        ctx.fillStyle = 'rgba(20, 34, 62, 0.09)';
        ctx.fillRect(side < 0 ? edgeX - px * 0.21 : edgeX + px * 0.12, gy, px * 0.09, px);
        // The pile: world-keyed row so a 2-tile bay never doubles up.
        if (hashCoords(151, tx * (side + 2), ty) % 2 === 0) {
          paintDeckPile(
            ctx,
            edgeX,
            gy + 0.55 * px - liftB * 0.22,
            px,
            px * 0.1,
            hashCoords(151, tx * (side + 2), ty) >>> 3,
            '#4e3a22',
            '#77593a',
          );
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

      // The deck itself, lifted — the floor-law course painter. Board
      // rhythm follows THE ARM LAW: the arm this tile sits in, so an
      // L-shaped quay turns its rhythm at the corner it actually has.
      const dy0 = gy - liftB;
      const vertRun = deckArmVertical(ground, tx, ty);
      paintDeckBoards(ctx, tx, ty, gx, gy, px, liftB, 'dock', vertRun);
      // The wall's shadow skirt: a deck butting a building keeps its
      // floor plane instead of fusing into the siding.
      if (!hasN && northT !== undefined && WALL_RUN_TILES.includes(northT as Tile)) {
        paintDeckWallSkirt(ctx, gx, dy0, px);
      }
      // Rim boards on the side edges, then the header beams where a
      // neighboring arm's rhythm (or family) turns.
      if (!hasW) paintDeckSideFascia(ctx, gx, gy, px, liftB, 'dock', true, !hasS);
      if (!hasE) paintDeckSideFascia(ctx, gx, gy, px, liftB, 'dock', false, !hasS);
      paintDeckSeams(ctx, ground, tx, ty, gx, gy, px, liftB, 'dock', vertRun);

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
        // The deck-top south edge is a top-plane silhouette: always baked.
        ctx.moveTo(gx, dy0 + px);
        ctx.lineTo(gx + px, dy0 + px);
        // The south FACE's foot + end verticals.
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
    // THE CARRIED SHEAF (contested lands, band 7 fix pass 1): a hay
    // bale on porch boards keeps the deck beneath it, so the drowned
    // crofts' green corn can stand on its stilted pallets and read as
    // corn (the sketch carried crates for want of this one line). The
    // renderer's porchAt mirrors it exactly.
    t === Tile.HayBale ||
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

/** The deck family a raw tile belongs to (rhythm/seam bookkeeping). */
function deckFamilyOf(t: number | undefined): 'bridge' | 'dock' | null {
  if (t === Tile.Bridge) return 'bridge';
  if (t === Tile.Dock) return 'dock';
  return null;
}

/** A family's rim-timber tone — the wood every edge kit cuts from. */
function deckRimTone(family: 'bridge' | 'dock' | 'porch', override?: string): string {
  if (override !== undefined) return override;
  return family === 'bridge' ? BRIDGE_TIMBER.rim : '#6d5130';
}

/**
 * THE HEADER BEAM (deck platform rework): wherever two deck tiles of
 * DIFFERENT board rhythm or different family share an edge, a proud
 * breaker beam runs the joint — the perpendicular course a carpenter
 * lays where two plank fields meet. The old build butted the fields
 * raw and every L-junction read as a paste-up seam. Each tile owns
 * its own WEST and NORTH edges (one owner per edge, no double paint;
 * the bake pad rows repaint border beams into both chunk canvases so
 * seams agree across chunks by construction).
 */
function paintHeaderBeam(
  ctx: CanvasRenderingContext2D,
  gx: number,
  dy0: number,
  px: number,
  tone: string,
  vertical: boolean,
): void {
  const bw = Math.max(2, px * 0.1);
  const lip = Math.max(1, px * 0.02);
  const np = Math.max(1, px * 0.022);
  ctx.fillStyle = shade(tone, -6);
  if (vertical) {
    ctx.fillRect(gx - bw / 2, dy0, bw, px);
    ctx.fillStyle = 'rgba(224, 186, 124, 0.28)'; // sun-law lit west arris
    ctx.fillRect(gx - bw / 2, dy0, lip, px);
    ctx.fillStyle = 'rgba(24, 15, 6, 0.4)'; // shade foot east
    ctx.fillRect(gx + bw / 2 - lip, dy0, lip, px);
    // Peg pips where the beam is trenailed to the joists.
    ctx.fillStyle = 'rgba(30, 20, 10, 0.42)';
    for (const f of [0.22, 0.78]) {
      ctx.fillRect(gx - np / 2, dy0 + f * px - np / 2, np, np);
    }
  } else {
    ctx.fillRect(gx, dy0 - bw / 2, px, bw);
    ctx.fillStyle = 'rgba(224, 186, 124, 0.28)'; // lit top arris
    ctx.fillRect(gx, dy0 - bw / 2, px, lip);
    ctx.fillStyle = 'rgba(24, 15, 6, 0.4)';
    ctx.fillRect(gx, dy0 + bw / 2 - lip, px, lip);
    ctx.fillStyle = 'rgba(30, 20, 10, 0.42)';
    for (const f of [0.22, 0.78]) {
      ctx.fillRect(gx + f * px - np / 2, dy0 - np / 2, np, np);
    }
  }
}

function paintDeckSeams(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  tx: number,
  ty: number,
  gx: number,
  gy: number,
  px: number,
  liftB: number,
  family: 'bridge' | 'dock',
  myVert: boolean,
): void {
  const dy0 = gy - liftB;
  const tone = deckRimTone(family);
  // TWO KINDS OF JOINT: a rhythm turn INSIDE one family is carpentry
  // and wears the proud header beam; a FAMILY joint (a dock platform
  // hung flush on a bridge's flank) is two structures meeting and
  // wears THE LEDGER SEAM — a shadow gap, not furniture. The beam's
  // lit arris at a family joint floated as a bright hairline through
  // the night bake (the user's brown-line report): bright lines on a
  // flush floor read as artifacts; dark seams read as depth.
  const wFam = deckFamilyOf(ground(tx - 1, ty));
  if (wFam !== null) {
    if (wFam !== family) paintLedgerSeam(ctx, gx, dy0, px, true);
    else if (deckArmVertical(ground, tx - 1, ty) !== myVert) {
      paintHeaderBeam(ctx, gx, dy0, px, tone, true);
    }
  }
  const nFam = deckFamilyOf(ground(tx, ty - 1));
  if (nFam !== null) {
    if (nFam !== family) paintLedgerSeam(ctx, gx, dy0, px, false);
    else if (deckArmVertical(ground, tx, ty - 1) !== myVert) {
      paintHeaderBeam(ctx, gx, dy0, px, tone, false);
    }
  }
}

/**
 * THE LEDGER SEAM: the thin dark gap where one deck family's ledger
 * meets another's rim — quiet at noon, quiet at midnight. No body,
 * no arris, no pips: the tone families on either side already tell
 * the story; the seam only keeps the butt from reading as a paste-up.
 */
function paintLedgerSeam(
  ctx: CanvasRenderingContext2D,
  gx: number,
  dy0: number,
  px: number,
  vertical: boolean,
): void {
  const w = Math.max(1, px * 0.024);
  ctx.fillStyle = 'rgba(22, 14, 7, 0.42)';
  if (vertical) ctx.fillRect(gx - w / 2, dy0, w, px);
  else ctx.fillRect(gx, dy0 - w / 2, px, w);
}

/**
 * THE EDGE HAS A BODY (deck platform rework): every exposed WEST or
 * EAST deck edge wears its rim board seen edge-on — a narrow timber
 * sliver, sun-law lit on the west flank and shadowed on the east,
 * with a seam shadow against the field boards. The old build ended
 * side edges in a bare ink line, and a whole pier read as a plank
 * mat laid flat on the water. When the south face is exposed too,
 * the sliver runs on down the fascia band and the corner reads as
 * the structure's corner leg.
 */
export function paintDeckSideFascia(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  px: number,
  liftB: number,
  family: 'bridge' | 'dock' | 'porch',
  west: boolean,
  hasS: boolean,
  tone?: string,
): void {
  const dy0 = gy - liftB;
  const ew = Math.max(2, px * 0.06);
  const base = deckRimTone(family, tone);
  const h = px + (hasS ? liftB : 0);
  const x0 = west ? gx : gx + px - ew;
  ctx.fillStyle = west ? shade(base, 12) : shade(base, -16);
  ctx.fillRect(x0, dy0, ew, h);
  // The seam shadow where the rim meets the field boards.
  const seamW = Math.max(1, px * 0.016);
  ctx.fillStyle = 'rgba(24, 15, 6, 0.32)';
  ctx.fillRect(west ? x0 + ew - seamW : x0, dy0, seamW, h);
  // A catch-light arris on the outer edge of the lit flank.
  if (west) {
    ctx.fillStyle = 'rgba(224, 186, 124, 0.26)';
    ctx.fillRect(x0, dy0, seamW, h);
  }
}

/**
 * THE WALL CASTS ON THE BOARDS: where a deck run butts a building's
 * wall band, a firm shadow skirt falls across the boards at the wall
 * foot — without it the wall's plank courses and the deck's plank
 * courses fuse into one continuous brown field and the floor loses
 * its plane (the porch-against-siding read the studio rejected).
 */
export function paintDeckWallSkirt(
  ctx: CanvasRenderingContext2D,
  gx: number,
  dy0: number,
  px: number,
): void {
  ctx.fillStyle = 'rgba(20, 14, 8, 0.26)';
  ctx.fillRect(gx, dy0, px, px * 0.12);
  ctx.fillStyle = 'rgba(20, 14, 8, 0.45)';
  ctx.fillRect(gx, dy0, px, Math.max(1.5, px * 0.03));
}

/**
 * ONE DRIVEN PILE, honestly seated (deck platform rework): seat
 * shadow on the water, the leg driven visibly DEEP (hash-varied so a
 * colonnade never reads machine-stamped), sun-law lit west face, and
 * a TIGHT waterline collar hugging the leg. The old build cut the leg
 * at a stub and rang it with a wide bright ellipse — from most banks
 * the deck overhang hid the stub and a row of floating white washers
 * marched across the water.
 */
export function paintDeckPile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  px: number,
  pw: number,
  seed: number,
  body: string,
  lit: string,
): void {
  const bot = top + px * (0.34 + (seed % 3) * 0.045);
  // Seat shadow: the water darkens where the leg stands in it.
  ctx.fillStyle = 'rgba(20, 34, 62, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, bot, pw * 1.1, pw * 1.1 * FLAT, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.fillRect(cx - pw / 2, top, pw, bot - top);
  ctx.fillStyle = lit; // sun-law lit west edge
  ctx.fillRect(cx - pw / 2, top, Math.max(1, pw * 0.3), bot - top);
  // The waterline collar, tight to the leg.
  ctx.strokeStyle = 'rgba(226, 240, 251, 0.38)';
  ctx.lineWidth = Math.max(1, px * 0.022);
  ctx.beginPath();
  ctx.ellipse(cx, bot, pw * 0.62, pw * 0.62 * FLAT, 0, 0, Math.PI * 2);
  ctx.stroke();
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
          drawDeckFill(ctx, ground, f, tx, ty, gx, gy, px);
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
        const braceBot = gy + px + px * 0.3;
        const c0 = gx + 0.18 * px;
        const c1 = gx + 0.82 * px;
        ctx.strokeStyle = BRIDGE_TIMBER.brace;
        ctx.lineWidth = Math.max(1.2, px * 0.032);
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(c0 + pw * 0.3, gy + px - liftB * 0.05);
        ctx.lineTo(c1 - pw * 0.3, braceBot - px * 0.06);
        ctx.moveTo(c1 - pw * 0.3, gy + px - liftB * 0.05);
        ctx.lineTo(c0 + pw * 0.3, braceBot - px * 0.06);
        ctx.stroke();
        ctx.globalAlpha = 1;
        for (const cx0 of [c0, c1]) {
          paintDeckPile(
            ctx,
            cx0,
            top,
            px,
            pw,
            hashCoords(153, tx * 2 + (cx0 > gx + px / 2 ? 1 : 0), ty),
            BRIDGE_TIMBER.pile,
            BRIDGE_TIMBER.pileLit,
          );
        }
      }

      // SIDE EDGE SHADE (round 7): the span's west/east edges over
      // water lay the same soft AO band the south faces cast, so a
      // long crossing's flanks sit IN the water instead of on it.
      // Aprons skip it — a ramp's falling edge meets the bank, not
      // the surface.
      if (apron === 'none' || apron === 'N' || apron === 'S') {
        for (const side of [
          !hasW && isWaterTile(wT) ? -1 : 0,
          !hasE && isWaterTile(eT) ? 1 : 0,
        ]) {
          if (side === 0) continue;
          const edgeX = side < 0 ? gx : gx + px;
          ctx.fillStyle = 'rgba(20, 34, 62, 0.2)';
          ctx.fillRect(side < 0 ? edgeX - px * 0.12 : edgeX, gy, px * 0.12, px);
          ctx.fillStyle = 'rgba(20, 34, 62, 0.09)';
          ctx.fillRect(side < 0 ? edgeX - px * 0.21 : edgeX + px * 0.12, gy, px * 0.09, px);
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

      // Board rhythm follows THE ARM LAW (appearance); the walk-axis
      // flood keeps ruling aprons, kerbs, thresholds and rails.
      const armVert = deckArmVertical(ground, tx, ty);
      paintDeckBoards(ctx, tx, ty, gx, gy, px, liftB, 'bridge', armVert);
      // The wall's shadow skirt where a crossing butts a building.
      if (!hasN && nT !== undefined && WALL_RUN_TILES.includes(nT as Tile)) {
        paintDeckWallSkirt(ctx, gx, dy0, px);
      }
      paintDeckSeams(ctx, ground, tx, ty, gx, gy, px, liftB, 'bridge', armVert);

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

      // Step faces on a ragged span — the W/E edges an E-W walk
      // exposes over water, which carry neither kerb nor threshold —
      // wear the rim board edge-on like every dock side (THE EDGE HAS
      // A BODY); a bare ink line there read as a torn mat. On a ramp the
      // fascia is sheared inside the apron transform (it rides the ground
      // quad).
      if (!hasW && !kerbW && !thW && apron !== 'W') {
        paintDeckSideFascia(ctx, gx, gy, px, liftB, 'bridge', true, !hasS);
      }
      if (!hasE && !kerbE && !thE && apron !== 'E') {
        paintDeckSideFascia(ctx, gx, gy, px, liftB, 'bridge', false, !hasS);
      }

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
      const top = myG - liftB * (bridge ? 0.3 : 0.25);
      paintDeckPile(
        ctx,
        mx,
        top,
        px,
        pw,
        hashCoords(157, tx, ty),
        bridge ? BRIDGE_TIMBER.pile : '#4e3a22',
        bridge ? BRIDGE_TIMBER.pileLit : '#77593a',
      );
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

  // The boards, clipped to the lifted triangle. Rhythm comes from THE
  // ARM LAW read at the leg neighbor the fill welds into, and the row
  // hashes key on the same axes as the tile painters, so strips
  // continue across the seam for either family.
  const nx = tx;
  const ny = legs[0] === 'N' ? ty - 1 : ty + 1;
  const vertRun = deckArmVertical(ground, nx, ny);
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
  // The face's foot along the ground diagonal and its high-end cap are
  // the vertical fascia's own ring.
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
/**
 * Step 5 — THE FOUR FIELD MARKS, dealt off the field as their own
 * coverage: leaf litter under the turn, frost pools under the cold,
 * soot smuts and charcoal chips under burn, grey rings under blight.
 * Every mark draws iff its own hash byte falls under the tile's
 * weight, so the density IS the gradient (THE MARKS CARRY THE
 * GRADIENT, THE WASHES CARRY THE SHAPE). Fills only — ellipses and
 * rects, no transforms — the bake is one canvas both backends blit.
 * Spring deals no mark: the flush is the blades' and the flowers'
 * (LG-3); here the substrate carries it. `w` is 0..255.
 */
function drawFieldMarks(
  ctx: CanvasRenderingContext2D,
  look: number,
  w: number,
  tx: number,
  ty: number,
  gx: number,
  gy: number,
  px: number,
): void {
  switch (look) {
    case FOLD_AUTUMN: {
      if (w >= BAND_HELD) {
        // THE COLD: a soft blue pool where the turf dips, rime on the
        // crowns — the snow blanket's own two marks, before the snow.
        const hp = hashCoords(2801, tx, ty);
        if ((hp & 255) < (w - 200) * 4) {
          ctx.fillStyle = MARK_INK.frostPool;
          ctx.beginPath();
          ctx.ellipse(
            gx + (0.2 + ((hp >>> 8) % 60) / 100) * px,
            gy + (0.2 + ((hp >>> 15) % 60) / 100) * px,
            px * (0.13 + ((hp >>> 22) % 3) * 0.04),
            px * 0.085,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        for (let k = 0; k < 3; k++) {
          const hr = hashCoords(2807 + k, tx, ty);
          if ((hr & 255) * 3 >= (w - 190) * 8) continue;
          ctx.fillStyle = MARK_INK.frostRime;
          const r = Math.max(1, px * 0.03);
          ctx.fillRect(gx + ((hr >>> 8) % 90) / 100 * px, gy + ((hr >>> 15) % 90) / 100 * px, r * 1.6, r);
        }
      } else {
        // LEAF LITTER: up to three chips, each a squared quad (BLOCK
        // LAW) with its seat shade a step down-sun, russet to gold,
        // the count dealt against the weight.
        for (let k = 0; k < 3; k++) {
          const hl = hashCoords(2803 + k, tx, ty);
          if ((hl & 255) * 2 >= w) continue;
          const cx = gx + (0.08 + ((hl >>> 8) % 84) / 100) * px;
          const cy = gy + (0.08 + ((hl >>> 15) % 84) / 100) * px;
          const lw = Math.max(1, px * (0.075 + ((hl >>> 22) % 3) * 0.02));
          const lh = Math.max(1, lw * (0.55 + ((hl >>> 25) % 3) * 0.12));
          ctx.fillStyle = MARK_INK.leafSeat;
          ctx.fillRect(cx + lw * 0.2, cy + lh * 0.45, lw, lh);
          ctx.fillStyle = MARK_INK.leaf[(hl >>> 4) & 3]!;
          ctx.fillRect(cx, cy, lw, lh);
        }
      }
      break;
    }
    case FOLD_BURN: {
      // SOOT SMUTS: one soft dark settle where the ash blew — broad
      // and faint, a squared smudge (a dense small dot read as a
      // pebble field).
      {
        const hs = hashCoords(2811, tx, ty);
        if ((hs & 255) * 2 < w) {
          const sw = px * (0.3 + ((hs >>> 12) % 4) * 0.07);
          ctx.fillStyle = MARK_INK.smut;
          ctx.fillRect(
            gx + (0.05 + ((hs >>> 8) % 60) / 100) * px,
            gy + (0.1 + ((hs >>> 18) % 70) / 100) * px,
            sw,
            sw * 0.5,
          );
        }
      }
      // CHARCOAL CHIPS: a char body with its lit top plane (BLOCK
      // LAW: one lit facet, depth as a value step), more where held.
      const chips = w >= BAND_HELD ? 3 : 2;
      for (let k = 0; k < chips; k++) {
        const hc = hashCoords(2821 + k, tx, ty);
        if ((hc & 255) * 5 >= w * 2) continue;
        const cw = px * (0.04 + ((hc >>> 10) % 3) * 0.012);
        const ch = cw * 0.7;
        const x = gx + (0.06 + ((hc >>> 8) % 86) / 100) * px;
        const y = gy + (0.06 + ((hc >>> 16) % 86) / 100) * px;
        ctx.fillStyle = MARK_INK.charcoal[(hc >>> 4) & 1]!;
        ctx.fillRect(x, y, cw, ch);
        ctx.fillStyle = MARK_INK.charcoalCap;
        ctx.fillRect(x, y, cw, Math.max(1, ch * 0.3));
      }
      break;
    }
    case FOLD_BLIGHT: {
      // GREY RINGS: a pale dead rim around a bruised centre — the
      // sickness comes up from the roots in rings, never in blots.
      // Squared (BLOCK LAW): the rim is a quad, the core a quad inset.
      const hr = hashCoords(2831, tx, ty);
      if ((hr & 255) * 4 < w * 2) {
        const rw = px * (0.22 + ((hr >>> 10) % 4) * 0.05);
        const rh = rw * 0.62;
        const cx = gx + (0.1 + ((hr >>> 14) % 60) / 100) * px;
        const cy = gy + (0.1 + ((hr >>> 21) % 60) / 100) * px;
        ctx.fillStyle = MARK_INK.ringRim;
        ctx.fillRect(cx, cy, rw, rh);
        ctx.fillStyle = MARK_INK.ringCore;
        ctx.fillRect(cx + rw * 0.25, cy + rh * 0.25, rw * 0.5, rh * 0.5);
      }
      if (w >= BAND_TAKEN) {
        const h2 = hashCoords(2837, tx, ty);
        if ((h2 & 255) * 10 < (w - 100) * 4) {
          const rw = px * (0.12 + ((h2 >>> 10) % 3) * 0.03);
          ctx.fillStyle = MARK_INK.ringRim;
          ctx.fillRect(gx + (0.1 + ((h2 >>> 14) % 80) / 100) * px, gy + (0.1 + ((h2 >>> 21) % 80) / 100) * px, rw, rw * 0.62);
        }
      }
      break;
    }
    default:
      break;
  }
}

/** The materials that deal field marks (Snow and the water family never do). */
const FOLD_MARK_TILES = new Set<number>([
  Tile.Dirt,
  Tile.Path,
  Tile.Tilled,
  Tile.Swamp,
  Tile.Sand,
  Tile.StoneFloor,
  Tile.DungeonFloor,
  Tile.CaveRubble,
]);

/**
 * Step 5 on the materials (THE MATERIALS FOLD): the four field marks
 * re-dealt for worked ground — sparser than the meadow's (a road is
 * swept by feet; a flagstone holds less than turf) and on their own
 * hash lanes so a chip on the road never twins a chip on the verge.
 * Every mark is a squared quad (BLOCK LAW); every count is dealt
 * hash-vs-weight, so the marks carry the gradient across the hem.
 */
function drawMaterialMarks(
  ctx: CanvasRenderingContext2D,
  look: number,
  w: number,
  m: number,
  tx: number,
  ty: number,
  gx: number,
  gy: number,
  px: number,
): void {
  const earth = m === Tile.Dirt || m === Tile.Tilled || m === Tile.Path;
  switch (look) {
    case FOLD_AUTUMN: {
      if (w >= BAND_HELD) {
        // THE FROZEN RUT (earth only): one long low frost pool lying
        // in the wheel line — E-W or N-S by the hash, since the road
        // runs either way — with a rime sliver on its sun edge.
        if (earth) {
          const hp = hashCoords(2851, tx, ty);
          if ((hp & 255) < (w - 200) * 3) {
            const along = (hp >>> 8) & 1;
            const len = px * (0.42 + ((hp >>> 10) % 4) * 0.08);
            const wid = px * 0.07;
            const x = gx + (along ? 0.06 + ((hp >>> 14) % 40) / 100 : 0.15 + ((hp >>> 14) % 70) / 100) * px;
            const y = gy + (along ? 0.15 + ((hp >>> 20) % 70) / 100 : 0.06 + ((hp >>> 20) % 40) / 100) * px;
            ctx.fillStyle = MATERIAL_MARK_INK.rut;
            if (along) ctx.fillRect(x, y, len, wid);
            else ctx.fillRect(x, y, wid, len);
            ctx.fillStyle = MATERIAL_MARK_INK.rutRime;
            const rime = Math.max(1, px * 0.02);
            if (along) ctx.fillRect(x, y, len, rime);
            else ctx.fillRect(x, y, rime, len);
          }
        }
        // RIME on every worked ground: two flecks at most.
        for (let k = 0; k < 2; k++) {
          const hr = hashCoords(2857 + k, tx, ty);
          if ((hr & 255) * 4 >= (w - 190) * 8) continue;
          ctx.fillStyle = MARK_INK.frostRime;
          const r = Math.max(1, px * 0.03);
          ctx.fillRect(gx + ((hr >>> 8) % 90) / 100 * px, gy + ((hr >>> 15) % 90) / 100 * px, r * 1.6, r);
        }
      } else if (m !== Tile.Sand) {
        // LEAF CHIPS blown onto the road and the flags (the strand
        // keeps none: the wind takes them off the sand): two at most,
        // each with its seat shade a step down-sun.
        for (let k = 0; k < 2; k++) {
          const hl = hashCoords(2863 + k, tx, ty);
          if ((hl & 255) * 3 >= w) continue;
          const cx = gx + (0.08 + ((hl >>> 8) % 84) / 100) * px;
          const cy = gy + (0.08 + ((hl >>> 15) % 84) / 100) * px;
          const lw = Math.max(1, px * (0.07 + ((hl >>> 22) % 3) * 0.02));
          const lh = Math.max(1, lw * (0.55 + ((hl >>> 25) % 3) * 0.12));
          ctx.fillStyle = MARK_INK.leafSeat;
          ctx.fillRect(cx + lw * 0.2, cy + lh * 0.45, lw, lh);
          ctx.fillStyle = MARK_INK.leaf[(hl >>> 4) & 3]!;
          ctx.fillRect(cx, cy, lw, lh);
        }
      }
      break;
    }
    case FOLD_BURN: {
      // SOOT SMUT: the settle where the ash blew, a squared smudge.
      const hs = hashCoords(2869, tx, ty);
      if ((hs & 255) * 3 < w) {
        const sw = px * (0.26 + ((hs >>> 12) % 4) * 0.06);
        ctx.fillStyle = MARK_INK.smut;
        ctx.fillRect(
          gx + (0.05 + ((hs >>> 8) % 64) / 100) * px,
          gy + (0.1 + ((hs >>> 18) % 70) / 100) * px,
          sw,
          sw * 0.5,
        );
      }
      // A CHARCOAL CHIP in the earth (the flags and the strand hold
      // none — a chip on stone reads as a pebble): body + lit cap.
      if (earth) {
        const hc = hashCoords(2879, tx, ty);
        if ((hc & 255) * 5 < w * 2) {
          const cw = px * (0.04 + ((hc >>> 10) % 3) * 0.012);
          const ch = cw * 0.7;
          const x = gx + (0.06 + ((hc >>> 8) % 86) / 100) * px;
          const y = gy + (0.06 + ((hc >>> 16) % 86) / 100) * px;
          ctx.fillStyle = MARK_INK.charcoal[(hc >>> 4) & 1]!;
          ctx.fillRect(x, y, cw, ch);
          ctx.fillStyle = MARK_INK.charcoalCap;
          ctx.fillRect(x, y, cw, Math.max(1, ch * 0.3));
        }
      }
      break;
    }
    case FOLD_BLIGHT: {
      // A GREY RING in the worked earth only (the sickness comes up
      // through soil, never through laid stone), at taken and past.
      if ((earth || m === Tile.Swamp) && w >= BAND_TAKEN) {
        const hr = hashCoords(2887, tx, ty);
        if ((hr & 255) * 8 < (w - 100) * 2) {
          const rw = px * (0.18 + ((hr >>> 10) % 4) * 0.05);
          const rh = rw * 0.62;
          const cx = gx + (0.1 + ((hr >>> 14) % 60) / 100) * px;
          const cy = gy + (0.1 + ((hr >>> 21) % 60) / 100) * px;
          ctx.fillStyle = MARK_INK.ringRim;
          ctx.fillRect(cx, cy, rw, rh);
          ctx.fillStyle = MARK_INK.ringCore;
          ctx.fillRect(cx + rw * 0.25, cy + rh * 0.25, rw * 0.5, rh * 0.5);
        }
      }
      break;
    }
    default:
      break;
  }
}

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
  // The RAW authored ground, pre-underlay: a tile whose material
  // resolves to the surrounding floor (the irrigation trench cut
  // into a stone yard) still needs its own detail painted, and its
  // run-connectivity read, from what the map actually says.
  rawAt?: (x: number, y: number) => number | undefined,
  // THE LIVING GROUND's view of this chunk (null = no stroke in reach
  // = today's marks). The tile's own halo sample folds the stubble
  // and deals the four field marks (step 5).
  fold: FoldView | null = null,
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
    // THE LIVING SOIL: the plot wears its care on the ground. Facts
    // come from the one care mirror; each is its own quiet layer so
    // a fully tended bed reads rich without shouting.
    const care = farmPlots.get(`${tx},${ty}`);
    if (care) {
      if (care.soil > 0) {
        // Worked compost: dark loam mottles between the courses; rich
        // ground adds the bin's warm crumbs.
        for (let k = 0; k < 4; k++) {
          const hh = hashCoords(241 + k, tx, ty);
          ctx.fillStyle = `rgba(30, 22, 14, ${care.soil >= 2 ? 0.5 : 0.34})`;
          ctx.beginPath();
          ctx.ellipse(
            gx + (0.1 + (hh % 74) / 100) * px,
            gy + (0.1 + ((hh >> 6) % 74) / 100) * px,
            px * (0.06 + ((hh >> 3) % 3) * 0.02),
            px * 0.045,
            0, 0, Math.PI * 2,
          );
          ctx.fill();
        }
        if (care.soil >= 2) {
          const hh = hashCoords(251, tx, ty);
          ctx.fillStyle = 'rgba(214, 178, 108, 0.4)';
          ctx.fillRect(gx + (0.2 + (hh % 50) / 100) * px, gy + (0.2 + ((hh >> 5) % 55) / 100) * px, px * 0.045, px * 0.03);
          ctx.fillRect(gx + (0.55 - (hh % 30) / 100) * px, gy + (0.6 - ((hh >> 7) % 30) / 100) * px, px * 0.04, px * 0.028);
        }
      }
      if (care.m) {
        // The mulch blanket: pale straw dashes ringing the stems.
        ctx.fillStyle = 'rgba(201, 174, 106, 0.62)';
        for (let k = 0; k < 7; k++) {
          const hh = hashCoords(263 + k, tx, ty);
          const ang = (k / 7) * Math.PI * 2 + (hh % 10) * 0.05;
          const rr = px * (0.3 + ((hh >> 4) % 5) * 0.014);
          const sx = gx + px * 0.5 + Math.cos(ang) * rr;
          const sy = gy + px * 0.5 + Math.sin(ang) * rr * 0.78;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(ang + Math.PI / 2 + ((hh >> 6) % 5) * 0.1);
          ctx.fillRect(-px * 0.05, -px * 0.014, px * 0.1, px * 0.028);
          ctx.restore();
        }
      }
      if (care.wet) {
        // Slaked earth: a dark wash over the whole worked square and
        // two low sheen catches where the water stands.
        ctx.fillStyle = 'rgba(34, 24, 16, 0.26)';
        ctx.fillRect(gx, gy, px, px);
        ctx.fillStyle = 'rgba(178, 200, 224, 0.14)';
        const hh = hashCoords(271, tx, ty);
        ctx.fillRect(gx + (0.14 + (hh % 40) / 100) * px, gy + (0.3 + ((hh >> 5) % 40) / 100) * px, px * 0.2, px * 0.035);
        ctx.fillRect(gx + (0.5 + ((hh >> 3) % 30) / 100) * px, gy + (0.12 + ((hh >> 8) % 40) / 100) * px, px * 0.14, px * 0.03);
      }
    }
  }
  const rawHere = rawAt !== undefined ? rawAt(tx, ty) : undefined;
  if (m === Tile.IrrigationChannel || rawHere === Tile.IrrigationChannel) {
    d = Detail.None;
    // THE FED CHANNEL: a board-lined trench. Runs join across
    // adjacent channel tiles (the fence-connectivity idea spoken in
    // earthworks); a well within feed range fills it with standing
    // water, otherwise the bottom lies dry and cracked. Bake-time
    // truth — the well set lives client-side and a well raised or
    // razed re-bakes the neighborhood like any patch.
    // THE TILTED TRENCH: the cut obeys the bird's-eye — the far
    // inner wall shows as a shadowed board face below the far bank
    // (north on a level run, west on a falling one), the water
    // stands sunk beneath it, the near bank bites a hair over the
    // bed, and an open end is carpentered shut with a cap board
    // between two corner posts. No trench ends mid-air.
    const nAt = rawAt ?? gAt;
    const chanN = nAt !== undefined && nAt(tx, ty - 1) === Tile.IrrigationChannel;
    const chanS = nAt !== undefined && nAt(tx, ty + 1) === Tile.IrrigationChannel;
    const chanW = nAt !== undefined && nAt(tx - 1, ty) === Tile.IrrigationChannel;
    const chanE = nAt !== undefined && nAt(tx + 1, ty) === Tile.IrrigationChannel;
    // Orientation: default east-west; a north-south neighbor with no
    // east-west one turns the run.
    const ns = (chanN || chanS) && !(chanW || chanE);
    const fed = wellNearClient(tx, ty, CHANNEL_FEED_RANGE);
    const inset = px * 0.26;
    const bd = px * 0.055;
    const wall = px * 0.085;
    const bx0 = ns ? gx + inset : chanW ? gx : gx + px * 0.1;
    const bx1 = ns ? gx + px - inset : chanE ? gx + px : gx + px * 0.9;
    const by0 = ns ? (chanN ? gy : gy + px * 0.1) : gy + inset;
    const by1 = ns ? (chanS ? gy + px : gy + px * 0.9) : gy + px - inset;
    // The cut: dark trench bed.
    ctx.fillStyle = 'rgba(26, 18, 11, 0.82)';
    ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    // Bed content sits below the far inner wall.
    const wx0 = ns ? bx0 + wall : bx0;
    const wy0 = ns ? by0 : by0 + wall;
    if (fed) {
      // Standing water with two pale catches of sky, sunk beneath
      // the far wall, and a deep-shade seam right under it where the
      // wall meets its own reflection.
      ctx.fillStyle = '#35597e';
      ctx.fillRect(wx0 + px * 0.02, wy0 + px * 0.02, bx1 - wx0 - px * 0.04, by1 - wy0 - px * 0.04);
      ctx.fillStyle = 'rgba(16, 24, 40, 0.5)';
      if (ns) ctx.fillRect(wx0 + px * 0.02, wy0 + px * 0.02, px * 0.05, by1 - wy0 - px * 0.04);
      else ctx.fillRect(wx0 + px * 0.02, wy0 + px * 0.02, bx1 - wx0 - px * 0.04, px * 0.05);
      ctx.fillStyle = 'rgba(160, 196, 232, 0.4)';
      const hh = hashCoords(281, tx, ty);
      if (ns) {
        ctx.fillRect(wx0 + px * 0.06, gy + (0.15 + (hh % 50) / 100) * px, px * 0.05, px * 0.16);
        ctx.fillRect(bx1 - px * 0.11, gy + (0.5 + ((hh >> 5) % 30) / 100) * px, px * 0.04, px * 0.12);
      } else {
        ctx.fillRect(gx + (0.15 + (hh % 50) / 100) * px, wy0 + px * 0.06, px * 0.16, px * 0.05);
        ctx.fillRect(gx + (0.5 + ((hh >> 5) % 30) / 100) * px, by1 - px * 0.11, px * 0.12, px * 0.04);
      }
    } else {
      // Dry bed: cracked earth plates waiting on a well.
      ctx.fillStyle = 'rgba(150, 116, 76, 0.55)';
      const hh = hashCoords(283, tx, ty);
      for (let k = 0; k < 3; k++) {
        const cx = wx0 + (0.12 + ((hh >> (k * 4)) % 60) / 100) * (bx1 - wx0);
        const cy = wy0 + (0.1 + ((hh >> (k * 3 + 2)) % 62) / 100) * (by1 - wy0);
        ctx.fillRect(cx, cy, px * 0.07, px * 0.05);
      }
      ctx.strokeStyle = 'rgba(26, 18, 11, 0.6)';
      ctx.lineWidth = Math.max(1, px * 0.014);
      ctx.beginPath();
      ctx.moveTo(wx0 + (bx1 - wx0) * 0.3, wy0 + (by1 - wy0) * 0.2);
      ctx.lineTo(wx0 + (bx1 - wx0) * 0.5, wy0 + (by1 - wy0) * 0.7);
      ctx.lineTo(wx0 + (bx1 - wx0) * 0.75, wy0 + (by1 - wy0) * 0.45);
      ctx.stroke();
    }
    // The far inner wall: a board face in its own shadow, laid over
    // the bed so depth reads before water does.
    ctx.fillStyle = '#4a3319';
    if (ns) ctx.fillRect(bx0, by0, wall, by1 - by0);
    else ctx.fillRect(bx0, by0, bx1 - bx0, wall);
    // Board lining along both banks — sky on the top faces, and the
    // near board overlaps the cut by a hair so the bank reads as a
    // lip standing over the water, not a frame around a picture.
    ctx.fillStyle = '#8a6234';
    if (ns) {
      ctx.fillRect(bx0 - bd, by0, bd, by1 - by0);
      ctx.fillRect(bx1 - px * 0.012, by0, bd + px * 0.012, by1 - by0);
      ctx.fillStyle = 'rgba(214, 175, 122, 0.5)';
      ctx.fillRect(bx0 - bd, by0, px * 0.02, by1 - by0);
      ctx.fillRect(bx1 - px * 0.012, by0, px * 0.02, by1 - by0);
    } else {
      ctx.fillRect(bx0, by0 - bd, bx1 - bx0, bd);
      ctx.fillRect(bx0, by1 - px * 0.012, bx1 - bx0, bd + px * 0.012);
      ctx.fillStyle = 'rgba(214, 175, 122, 0.5)';
      ctx.fillRect(bx0, by0 - bd, bx1 - bx0, px * 0.02);
      ctx.fillRect(bx0, by1 - px * 0.012, bx1 - bx0, px * 0.02);
    }
    // Open ends get a cap board between corner posts; a continuing
    // run keeps its mouth open into the neighbor tile.
    const post = px * 0.09;
    const capAt = (cx: number, cy: number, w: number, h: number) => {
      ctx.fillStyle = '#7a5427';
      ctx.fillRect(cx, cy, w, h);
      ctx.fillStyle = 'rgba(214, 175, 122, 0.45)';
      if (w > h) ctx.fillRect(cx, cy, w, px * 0.018);
      else ctx.fillRect(cx, cy, px * 0.018, h);
    };
    const postAt = (cx: number, cy: number) => {
      ctx.fillStyle = '#5e401f';
      ctx.fillRect(cx - post / 2, cy - post / 2, post, post);
      ctx.fillStyle = 'rgba(222, 186, 132, 0.55)';
      ctx.fillRect(cx - post / 2, cy - post / 2, post, px * 0.022);
    };
    if (ns) {
      if (!chanN) {
        capAt(bx0 - bd, by0 - bd, bx1 - bx0 + bd * 2, bd);
        postAt(bx0 - bd / 2, by0);
        postAt(bx1 + bd / 2, by0);
      }
      if (!chanS) {
        capAt(bx0 - bd, by1, bx1 - bx0 + bd * 2, bd);
        postAt(bx0 - bd / 2, by1);
        postAt(bx1 + bd / 2, by1);
      }
    } else {
      if (!chanW) {
        capAt(bx0 - bd, by0 - bd, bd, by1 - by0 + bd * 2);
        postAt(bx0, by0 - bd / 2);
        postAt(bx0, by1 + bd / 2);
      }
      if (!chanE) {
        capAt(bx1, by0 - bd, bd, by1 - by0 + bd * 2);
        postAt(bx1, by0 - bd / 2);
        postAt(bx1, by1 + bd / 2);
      }
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
        // NEAR SNOW the snow contour overhangs half a tile into this
        // one: flecks landing under the blanket are buried (never green
        // ticks poking through white), and the survivors go frosted.
        const snowN = gAt !== undefined && gAt(tx, ty - 1) === Tile.Snow;
        const snowS = gAt !== undefined && gAt(tx, ty + 1) === Tile.Snow;
        const snowW = gAt !== undefined && gAt(tx - 1, ty) === Tile.Snow;
        const snowE = gAt !== undefined && gAt(tx + 1, ty) === Tile.Snow;
        const nearSnow = snowN || snowS || snowW || snowE;
        // Stubble density drifts at meadow scale — lush reaches thick
        // with it, worn ground nearly bare (an even per-tile count
        // reads as carpet tiling from a distance).
        const lush = valueNoise(907, tx * 0.04, ty * 0.04);
        const n = Math.max(0, Math.round((2 + (hg % 3)) * (0.3 + 1.2 * lush)));
        // Step 5 — THE MARKS. The tile's own field sample: its look
        // after precedence and its weight 0..255. Everything below
        // deals HASH-VS-WEIGHT (a fleck folds when its hash byte falls
        // under the weight), so the change is a dither across the hem
        // and never a step — THE HAND NEVER REPEATS ITSELF, and THE
        // MARKS CARRY THE GRADIENT.
        let fLook = FOLD_NONE;
        let fW = 0;
        if (fold !== null) {
          const pk = foldTileAt(fold, lx, ly);
          fLook = pk & 7;
          fW = pk >> 3;
        }
        const fCold = fLook === FOLD_AUTUMN && fW >= BAND_HELD;
        const fThin = fLook === FOLD_BLIGHT || fLook === FOLD_BURN;
        for (let k = 0; k < n; k++) {
          const hh = hashCoords(101 + k, tx, ty);
          const fx = (hh % 88) / 100;
          const fy = ((hh >> 7) % 88) / 100;
          if (
            (snowN && fy < 0.4) ||
            (snowS && fy > 0.6) ||
            (snowW && fx < 0.4) ||
            (snowE && fx > 0.6)
          ) {
            continue;
          }
          // Sick or scorched turf goes bare from the roots: the count
          // thins hash-vs-weight (two thirds gone at full weight; a
          // third already at the touched hem, so the touched band
          // reads by its stubble as well as its key).
          if (fThin && ((hh >>> 17) & 255) * 3 < fW * 2) continue;
          const sx = gx + fx * px;
          const sy = gy + fy * px;
          const stub = px * (0.05 + ((hh >> 3) % 4) * 0.014);
          // Floor law: turf detail is never DARKER than the ground —
          // dark flecks read as holes. Two grades of lighter green only.
          // A folded fleck takes its look's pair (the cold takes the
          // snow rim's): which flecks fold is the hash against the weight.
          const folded = fLook !== FOLD_NONE && ((hh >>> 19) & 255) < fW;
          ctx.fillStyle = nearSnow || (folded && fCold)
            ? (hh & 1 ? STUBBLE_INK_COLD[0] : STUBBLE_INK_COLD[1])
            : folded
              ? (hh & 1 ? STUBBLE_INK[fLook]![0] : STUBBLE_INK[fLook]![1])
              : (hh & 1 ? 'rgba(148, 178, 96, 0.18)' : 'rgba(215, 227, 140, 0.15)');
          ctx.fillRect(sx, sy - stub, Math.max(1, px * 0.045), stub);
        }
        if (fLook !== FOLD_NONE && !nearSnow) drawFieldMarks(ctx, fLook, fW, tx, ty, gx, gy, px);
      }
      if (m === Tile.Snow) {
        // THE SPARKLE: sun on fresh crystal — pinpoint glints and the
        // rare four-point star, GATHERED where the drift field crests
        // (fresh crystal catches light on exposed crowns; packed
        // hollows stay matte — an even sprinkle reads as a pattern).
        const crest = valueNoise(2749, tx * 0.02, ty * 0.02);
        const n = crest > 0.55 ? 1 + (hg % 3) : hg % 4 === 0 ? 1 : 0;
        for (let k = 0; k < n; k++) {
          const hh = hashCoords(2767 + k, tx, ty);
          const sx = gx + ((hh % 90) / 100) * px;
          const sy = gy + (((hh >> 7) % 90) / 100) * px;
          ctx.fillStyle = hh & 1 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(214, 228, 248, 0.5)';
          const r = Math.max(1, px * 0.028);
          ctx.fillRect(sx, sy, r, r);
        }
        if (crest > 0.55 && hg % 7 === 3) {
          const hh = hashCoords(2777, tx, ty);
          const sx = gx + (0.12 + (hh % 72) / 100) * px;
          const sy = gy + (0.12 + ((hh >> 6) % 72) / 100) * px;
          const arm = px * 0.05;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = Math.max(1, px * 0.018);
          ctx.beginPath();
          ctx.moveTo(sx - arm, sy);
          ctx.lineTo(sx + arm, sy);
          ctx.moveTo(sx, sy - arm * 0.6);
          ctx.lineTo(sx, sy + arm * 0.6);
          ctx.stroke();
        }
        // A soft blue pool where the blanket dips — the HOLLOWS of the
        // same field the sparkle crests ride: light on the crowns,
        // shadow gathering low, one relief read across the whole field.
        if (crest < 0.5 && hg % 5 === 2) {
          const hh = hashCoords(2789, tx, ty);
          ctx.fillStyle = 'rgba(158, 174, 208, 0.14)';
          ctx.beginPath();
          ctx.ellipse(
            gx + (0.2 + (hh % 60) / 100) * px,
            gy + (0.2 + ((hh >> 6) % 60) / 100) * px,
            px * (0.14 + ((hh >> 11) % 3) * 0.04),
            px * 0.09,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
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
          // Step 4 — the weeds fold with the meadow they broke out of
          // (the noise keeps its corner sample; the field reads the
          // tile's centre).
          const tone = meadowToneFold(fold, tx - lx, ty - ly, tx, ty, 0.5);
          let weedAlt = '#79a556';
          let weedThin = 0;
          if (fold !== null) {
            const pk = foldTileAt(fold, lx, ly);
            const look = pk & 7;
            if (look !== FOLD_NONE) {
              weedAlt = FRINGE_ALT[look]![band(pk >> 3) - 1]!;
              if (look === FOLD_BLIGHT || look === FOLD_BURN) weedThin = pk >> 3;
            }
          }
          for (let bl = 0; bl < 2 + (hh % 2); bl++) {
            const hb = hashCoords(167 + bl, tx, ty);
            if (weedThin !== 0 && ((hb >>> 13) & 255) * 3 < weedThin * 2) continue;
            const bx = wx0 + ((hb % 100) / 100 - 0.5) * px * 0.16;
            const lean = (((hb >> 5) % 100) / 100 - 0.5) * 0.6;
            const tall = px * (0.08 + ((hb >> 9) % 100) / 100 * 0.06);
            ctx.fillStyle = hb & 1 ? tone : weedAlt;
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
      } else if (m === Tile.Sand) {
        // Shell-grit drifts: the tide sorts its leavings into patches,
        // so speck density rides a slow field — banks of grit, clean
        // sweeps between (a flat per-tile chance read as a pattern).
        const drift = valueNoise(2761, tx * 0.05, ty * 0.05);
        const n = drift > 0.6 ? 2 + (hg % 4) : drift > 0.45 && hg % 3 === 0 ? 1 + (hg % 2) : 0;
        ctx.fillStyle = 'rgba(150, 116, 62, 0.2)';
        for (let k = 0; k < n; k++) {
          const hh = hashCoords(97 + k, tx, ty);
          const sw = px * (0.03 + ((hh >> 3) % 3) * 0.012);
          ctx.fillRect(gx + (hh % 80) / 100 * px, gy + ((hh >> 7) % 80) / 100 * px, sw, sw * 0.8);
        }
        // The odd pale shell fleck riding a grit bank.
        if (drift > 0.6 && hg % 11 === 4) {
          const hh = hashCoords(2771, tx, ty);
          ctx.fillStyle = 'rgba(248, 240, 214, 0.5)';
          ctx.fillRect(
            gx + (0.15 + (hh % 65) / 100) * px,
            gy + (0.15 + ((hh >> 6) % 65) / 100) * px,
            px * 0.05,
            px * 0.035,
          );
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
      // THE MATERIAL MARKS (THE MATERIALS FOLD, plan §12.4's ground-
      // layer column): leaf chips on the road under the turn, frozen
      // ruts and rime under the cold, soot on any ground under burn,
      // rings in the worked earth under blight — the tile's own field
      // sample, hash-vs-weight, half the meadow's density, own lanes.
      if (fold !== null && FOLD_MARK_TILES.has(m)) {
        const pk = foldTileAt(fold, lx, ly);
        if (pk !== 0) drawMaterialMarks(ctx, pk & 7, pk >> 3, m, tx, ty, gx, gy, px);
      }
      if (d === Detail.Pebbles) {
        // Angular stone chips. THE SCATTER IS THE HAND'S: the first
        // cut stamped the SAME two-chip pair at fixed tile offsets
        // (only rotation varied) — at scale every pebble patch read as
        // the identical purple twin-dot motif (user-caught pattern).
        // Now the hash deals everything: how many, where, how big,
        // which grey — no two patches are sisters.
        const h = hashCoords(29, tx, ty);
        const n = 1 + (h % 3);
        for (let k = 0; k < n; k++) {
          const hp = hashCoords(31 + k * 47, tx, ty);
          const ox = 0.12 + ((hp % 76) / 100);
          const oy = 0.12 + (((hp >> 7) % 76) / 100);
          const pw = 0.06 + ((hp >> 3) % 5) * 0.022;
          const rot = (((hp >> 11) % 100) / 100) * 3.1;
          ctx.fillStyle =
            (hp & 3) === 0 ? '#948da1' : (hp & 3) === 1 ? '#7f7889' : '#8b8494';
          ctx.save();
          ctx.translate(lx * px + px * ox, ly * px + px * oy);
          ctx.rotate(rot);
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
      } else if (d === Detail.LeafLitter) {
        // THE FOREST FLOOR (worldgen forest.ts) — fallen leaves under a
        // crown. Two registers so the tile reads at EVERY zoom: a drift
        // (an irregular translucent blotch that shifts the turf's tone
        // to floor-brown — neighbouring litter tiles merge into one
        // continuous floor under the elders) and, on it, four to seven
        // chips dealt by hash (count, seat, size, turn, hue), seats
        // running edge to edge so drifts straddle borders. Each chip is
        // a filled lozenge with a seat seam and a pale midrib — wide
        // enough to hold tone at street zoom (the fish law).
        const h = hashCoords(419, tx, ty);
        {
          const cx0 = lx * px + (0.3 + ((h >>> 3) % 40) / 100) * px;
          const cy0 = ly * px + (0.3 + ((h >>> 9) % 40) / 100) * px;
          const rr = px * (0.5 + ((h >>> 15) % 5) * 0.05);
          ctx.fillStyle = 'rgba(112, 78, 40, 0.30)';
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const hk = hashCoords(421 + k, tx, ty);
            const a = (k / 8) * Math.PI * 2;
            const r = rr * (0.7 + (hk % 40) / 100);
            const x = cx0 + Math.cos(a) * r * 1.15;
            const y = cy0 + Math.sin(a) * r * 0.8;
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
        const n = 4 + (h % 4);
        for (let k = 0; k < n; k++) {
          const hp = hashCoords(431 + k * 53, tx, ty);
          const ox = ((hp % 100) / 100) * px;
          const oy = (((hp >>> 7) % 100) / 100) * px;
          const w = px * (0.17 + ((hp >>> 3) % 5) * 0.02);
          const rot = (((hp >>> 14) % 100) / 100) * Math.PI;
          const hue = (hp >>> 20) & 3;
          const fill =
            hue === 0 ? '#a8683a' : hue === 1 ? '#bd8c3c' : hue === 2 ? '#8c5a2e' : '#cfa14a';
          ctx.save();
          ctx.translate(lx * px + ox, ly * px + oy);
          ctx.rotate(rot);
          ctx.fillStyle = 'rgba(46, 34, 20, 0.32)';
          ctx.beginPath();
          ctx.ellipse(px * 0.012, px * 0.024, w * 0.52, w * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.moveTo(-w * 0.5, 0);
          ctx.quadraticCurveTo(0, -w * 0.36, w * 0.5, 0);
          ctx.quadraticCurveTo(0, w * 0.36, -w * 0.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 236, 190, 0.5)';
          ctx.lineWidth = Math.max(1, px * 0.02);
          ctx.beginPath();
          ctx.moveTo(-w * 0.38, 0);
          ctx.lineTo(w * 0.36, 0);
          ctx.stroke();
          ctx.restore();
        }
      } else if (d === Detail.Bracken) {
        // THE FOREST FLOOR — bracken in a canopy gap. A dark seat under
        // the root, then three or four fronds fanning up and out: each
        // a bowed stem (real width, never a hairline) carrying
        // alternating FILLED leaflets that shorten toward the tip —
        // dark green low, lit green at the tip. Fans and lengths ride
        // the hash so a bracken bank reads as many plants, not a stamp.
        const h = hashCoords(443, tx, ty);
        const rx = lx * px + (0.3 + ((h % 40) / 100)) * px;
        const ry = ly * px + (0.55 + (((h >>> 6) % 35) / 100)) * px;
        ctx.fillStyle = 'rgba(30, 48, 24, 0.30)';
        ctx.beginPath();
        ctx.ellipse(rx, ry + px * 0.02, px * 0.3, px * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        const fronds = 3 + ((h >>> 12) % 2);
        for (let f = 0; f < fronds; f++) {
          const hf = hashCoords(457 + f * 61, tx, ty);
          // Fan: −165°..−15° from the root, spread by hash.
          const ang = -Math.PI * (0.08 + ((f + 0.5) / fronds) * 0.84 + (((hf % 100) / 100) - 0.5) * 0.12);
          const len = px * (0.6 + ((hf >>> 7) % 6) * 0.05);
          const bow = (((hf >>> 11) & 1) ? 1 : -1) * len * 0.18;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const cx2 = rx + cosA * len * 0.5 - sinA * bow;
          const cy2 = ry + sinA * len * 0.5 + cosA * bow;
          const tipX = rx + cosA * len;
          const tipY = ry + sinA * len;
          const pinnae = 6 + ((hf >>> 14) % 3);
          for (let i = 1; i <= pinnae; i++) {
            const t = i / (pinnae + 1);
            const mt = 1 - t;
            const sx = mt * mt * rx + 2 * mt * t * cx2 + t * t * tipX;
            const sy = mt * mt * ry + 2 * mt * t * cy2 + t * t * tipY;
            const side = i & 1 ? 1 : -1;
            const pl = len * (0.36 - t * 0.24);
            const pw = px * 0.09;
            // Leaflet sweeps forward along the stem as it leaves it.
            const ex = sx + (-sinA * side * 0.85 + cosA * 0.5) * pl;
            const ey = sy + (cosA * side * 0.85 + sinA * 0.5) * pl;
            ctx.fillStyle = t < 0.4 ? '#3f6d2d' : t < 0.75 ? '#5c9a37' : '#8cbf47';
            ctx.beginPath();
            ctx.moveTo(sx + cosA * pw, sy + sinA * pw);
            ctx.lineTo(ex, ey);
            ctx.lineTo(sx - cosA * pw, sy - sinA * pw);
            ctx.closePath();
            ctx.fill();
          }
          ctx.strokeStyle = '#2f5222';
          ctx.lineWidth = Math.max(1.5, px * 0.06);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.quadraticCurveTo(cx2, cy2, tipX, tipY);
          ctx.stroke();
        }
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
        studioBake &&
        (d === Detail.BannerCrown ||
          d === Detail.BannerMoon ||
          d === Detail.Tapestry)
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
      } else if (studioBake && wallHungInfo(d) !== null) {
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
            const fx = gx + px * (0.2 + k * 0.22);
            const len = k === 1 ? 0.52 : 0.4;
            ctx.beginPath();
            ctx.moveTo(fx, gy + px * 0.22);
            ctx.lineTo(fx + px * 0.16, gy + px * 0.22);
            ctx.lineTo(fx + px * 0.08, gy + px * (0.22 + len));
            ctx.closePath();
            ctx.fill();
          }
        } else if (info.kind === 'sign') {
          ctx.fillStyle = '#8a6534';
          ctx.fillRect(gx + px * 0.3, gy + px * 0.3, px * 0.4, px * 0.32);
          ctx.fillStyle = '#e8dcc4';
          ctx.fillRect(gx + px * 0.4, gy + px * 0.38, px * 0.2, px * 0.16);
        } else if (info.kind === 'trellis') {
          ctx.strokeStyle = info.species === 1 ? '#97322f' : '#3f7a48';
          ctx.lineWidth = px * 0.05;
          ctx.strokeRect(gx + px * 0.28, gy + px * 0.24, px * 0.44, px * 0.5);
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.28, gy + px * 0.24);
          ctx.lineTo(gx + px * 0.72, gy + px * 0.74);
          ctx.moveTo(gx + px * 0.72, gy + px * 0.24);
          ctx.lineTo(gx + px * 0.28, gy + px * 0.74);
          ctx.stroke();
        } else if (info.kind === 'arms') {
          // THE KNIGHT'S KEEPING: crossed steel over a shield blot —
          // one glyph for every mounted form; the form reads on hover.
          ctx.strokeStyle = '#aeb6c6';
          ctx.lineWidth = px * 0.07;
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.3, gy + px * 0.26);
          ctx.lineTo(gx + px * 0.7, gy + px * 0.68);
          ctx.moveTo(gx + px * 0.7, gy + px * 0.26);
          ctx.lineTo(gx + px * 0.3, gy + px * 0.68);
          ctx.stroke();
          if (info.form === 0 || info.form === 3) {
            ctx.fillStyle = info.form === 3 ? '#c9962e' : '#7a2430';
            ctx.beginPath();
            ctx.moveTo(gx + px * 0.4, gy + px * 0.36);
            ctx.lineTo(gx + px * 0.6, gy + px * 0.36);
            ctx.lineTo(gx + px * 0.5, gy + px * 0.6);
            ctx.closePath();
            ctx.fill();
          }
        } else if (info.kind === 'greatbanner') {
          // The great cloth: a wide drop with the dovetail bitten out.
          ctx.fillStyle = DYE_SWATCHES[info.dye ?? 0]!;
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.26, gy + px * 0.22);
          ctx.lineTo(gx + px * 0.74, gy + px * 0.22);
          ctx.lineTo(gx + px * 0.74, gy + px * 0.78);
          ctx.lineTo(gx + px * 0.62, gy + px * 0.66);
          ctx.lineTo(gx + px * 0.5, gy + px * 0.78);
          ctx.lineTo(gx + px * 0.38, gy + px * 0.66);
          ctx.lineTo(gx + px * 0.26, gy + px * 0.78);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#c9962e';
          ctx.fillRect(gx + px * 0.44, gy + px * 0.36, px * 0.12, px * 0.14);
        } else if (info.kind === 'drape') {
          // The long fall: a floor-length column cinched at the waist.
          ctx.fillStyle = DYE_SWATCHES[info.dye ?? 0]!;
          ctx.beginPath();
          ctx.moveTo(gx + px * 0.36, gy + px * 0.2);
          ctx.lineTo(gx + px * 0.64, gy + px * 0.2);
          ctx.lineTo(gx + px * 0.6, gy + px * 0.48);
          ctx.lineTo(gx + px * 0.68, gy + px * 0.82);
          ctx.lineTo(gx + px * 0.32, gy + px * 0.82);
          ctx.lineTo(gx + px * 0.4, gy + px * 0.48);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#c9962e';
          ctx.fillRect(gx + px * 0.38, gy + px * 0.46, px * 0.24, px * 0.05);
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
      // THE SCARRED LAND's six floor Details — first passes (K0 THE
      // SHEET); each family's phase recuts its own. All squared fills
      // in value steps (FLAT FORGE), hash-dealt by h >>> k, no strokes,
      // no transforms — a ground bake is a quad's texture and must
      // read the same off the canvas oracle and the GL stage.
      } else if (d === Detail.Ash) {
        // THE ASH LIES SOFT (contested lands band 7, owed E3 / D1): the
        // second pass on THE COLD HEARTH's ash pan (K1). The first pass
        // laid ONE flat grey pan per tile, inset on its free sides, and
        // a floor of them read as flagstones: every tile the same
        // value, every seam a grid line, the sacking row's pan a grey
        // flag on the meadow. Ash is not a flag. It is a GRAIN: a field
        // of small squared flakes whose presence, size and value ride
        // a slow WORLD-keyed noise (the flake lattice, its deal and the
        // swell are all keyed to the world cell of each flake, never to
        // the tile), so one grain runs across every tile edge without a
        // seam; thick where the spill lay deep, thinning to nothing at
        // the rim so the tile's own ground (the shell's dirt, the pan's
        // grass) shows through between the last flakes; and the rim is
        // where the hash says the last flake fell, never a straight
        // edge. Value planes only (FLAT FORGE): a packed-wet seat one
        // step SE under the deep grain, the grey grain in three alpha
        // steps, the dry pale plates lit toward the west sun, the
        // clinker (the black that did not burn) with one lit facet, and
        // the blown flakes past the rim. Min feature 0.03s; fills only,
        // no strokes, no transforms — a ground bake is a quad's texture
        // and must read the same off the canvas oracle and the GL stage.
        const hh = hashCoords(231, tx, ty);
        const ashAt = (ox: number, oy: number): boolean => dAt !== undefined && dAt(tx + ox, ty + oy) === Detail.Ash;
        const jW = ashAt(-1, 0);
        const jE = ashAt(1, 0);
        const jN = ashAt(0, -1);
        const jS = ashAt(0, 1);
        const jNW = ashAt(-1, -1);
        const jNE = ashAt(1, -1);
        const jSW = ashAt(-1, 1);
        const jSE = ashAt(1, 1);
        // How far (u, v) in the tile lies from the spill's rim: joined
        // sides count as far; a bare diagonal is a corner rim too, so
        // the grain thins into an outside corner the way the neighbour
        // thins toward its own free side (no step along the shared
        // edge). 0 at the rim, up to 1 deep inside.
        const rimAt = (u: number, v: number): number => {
          let e = 1;
          if (!jW) e = Math.min(e, u);
          if (!jE) e = Math.min(e, 1 - u);
          if (!jN) e = Math.min(e, v);
          if (!jS) e = Math.min(e, 1 - v);
          if (!jNW) e = Math.min(e, Math.max(u, v));
          if (!jNE) e = Math.min(e, Math.max(1 - u, v));
          if (!jSW) e = Math.min(e, Math.max(u, 1 - v));
          if (!jSE) e = Math.min(e, Math.max(1 - u, 1 - v));
          return e;
        };
        // The depth of the spill at a world point: the rim distance
        // scaled by the slow swell (how full the pan is here), ragged
        // by a noise a third of a tile long. Below 0.06 no flake lies.
        const depthAt = (u: number, v: number): number => {
          const wx = tx + u;
          const wy = ty + v;
          const swell = valueNoise(0x0a5, wx * 0.9 + 3.7, wy * 0.9 + 1.9);
          const rag = valueNoise(0x0a9, wx * 3.3, wy * 3.3);
          return rimAt(u, v) * (0.7 + 0.6 * swell) + (rag - 0.5) * 0.36;
        };
        // THE GRAIN: a G×G lattice of flakes per tile, each keyed to
        // its world lattice cell (tx·G + i, ty·G + j) so the lattices of
        // neighbouring tiles interlock at the edge.
        const G = 7;
        const cell = px / G;
        const tones = ['rgba(141, 138, 144, ', 'rgba(152, 149, 156, ', 'rgba(128, 125, 133, '];
        for (let j = 0; j < G; j++) {
          for (let i = 0; i < G; i++) {
            const u = (i + 0.5) / G;
            const v = (j + 0.5) / G;
            const depth = depthAt(u, v);
            if (depth < 0.06) continue;
            const hk = hashCoords(293, tx * G + i, ty * G + j);
            const fw = cell * (0.82 + ((hk >>> 3) % 5) * 0.1);
            const fhh = cell * (0.82 + ((hk >>> 7) % 5) * 0.1);
            const fx = gx + (i + 0.5) * cell - fw * 0.5 + (((hk >>> 11) % 7) - 3) * cell * 0.09;
            const fy = gy + (j + 0.5) * cell - fhh * 0.5 + (((hk >>> 15) % 7) - 3) * cell * 0.09;
            // Three alpha steps by depth; one deep flake in four sits
            // on a packed-wet seat one step SE (away from the west
            // sun) — every flake seated read as cobbles, not ash.
            if (depth > 0.3 && ((hk >>> 23) & 3) === 0) {
              ctx.fillStyle = 'rgba(72, 68, 76, 0.3)';
              ctx.fillRect(fx + px * 0.025, fy + px * 0.025, fw, fhh);
            }
            const a = depth > 0.3 ? 0.62 : depth > 0.16 ? 0.44 : 0.26;
            ctx.fillStyle = `${tones[(hk >>> 19) % 3]}${a})`;
            ctx.fillRect(fx, fy, fw, fhh);
          }
        }
        // The dry pale ash: two dealt plates (a third where the noise
        // says the spill dried), each a step up, their lit corner a
        // step up again toward the west sun, only where the grain is
        // deep enough to carry them.
        const dry = valueNoise(0x0a7, tx * 0.31 + 7.3, ty * 0.31 + 2.1);
        const plates = 2 + (dry > 0.62 ? 1 : 0);
        for (let k = 0; k < plates; k++) {
          const hk = hashCoords(301 + k, tx, ty);
          const plw = px * (0.14 + ((hk >>> 2) % 5) * 0.04);
          const plh = px * (0.11 + ((hk >>> 6) % 5) * 0.04);
          const pu = 0.08 + 0.84 * (((hk >>> 10) % 71) / 70);
          const pv = 0.08 + 0.84 * (((hk >>> 17) % 67) / 66);
          if (depthAt(pu, pv) < 0.22) continue;
          const plx = gx + px * pu - plw * 0.5;
          const ply = gy + px * pv - plh * 0.5;
          ctx.fillStyle = `rgba(186, 184, 190, ${(0.3 + dry * 0.2).toFixed(3)})`;
          ctx.fillRect(plx, ply, plw, plh);
          ctx.fillStyle = 'rgba(214, 212, 216, 0.28)';
          ctx.fillRect(plx, ply, Math.max(px * 0.03, plw * 0.5), Math.max(px * 0.03, plh * 0.45));
        }
        // The clinker: 3–6 squared black blocks, one lit facet each
        // (a thin lighter cap on the top and west edges — depth as a
        // value step). Sizes 0.06–0.12 so the 0.03s cap stays a cap;
        // a block deals itself only into the deep grain.
        const nClink = 3 + ((hh >>> 14) % 4);
        for (let k = 0; k < nClink; k++) {
          const hk = hashCoords(233 + k, tx, ty);
          const cw = px * (0.06 + ((hk >>> 3) % 4) * 0.02);
          const chh = cw * (0.7 + ((hk >>> 9) % 3) * 0.15);
          const cu = 0.06 + 0.88 * (((hk >>> 12) % 97) / 96);
          const cv = 0.06 + 0.88 * (((hk >>> 19) % 89) / 88);
          if (depthAt(cu, cv) < 0.16) continue;
          const cx = gx + px * cu - cw * 0.5;
          const cy = gy + px * cv - chh * 0.5;
          ctx.fillStyle = (hk & 1) === 0 ? '#2a2529' : '#37313a';
          ctx.fillRect(cx, cy, cw, chh);
          ctx.fillStyle = (hk & 1) === 0 ? '#4a444c' : '#57505c';
          ctx.fillRect(cx, cy, cw, Math.max(1, px * 0.03));
          ctx.fillRect(cx, cy, Math.max(1, px * 0.03), chh);
          // The odd clinker still carries a dead ember — a warm-grey
          // fleck, never a light (the EmberBed owns the glow).
          if (((hk >>> 26) & 7) === 0) {
            ctx.fillStyle = '#6b4a3c';
            ctx.fillRect(cx + cw * 0.3, cy + chh * 0.35, Math.max(1, px * 0.03), Math.max(1, px * 0.03));
          }
        }
        // The blown flakes: pale grains carried past the rim onto the
        // bare ground, dealt per free side, thinning outward in two
        // alpha steps. A joined side gets none — the grain continues.
        for (let k = 0; k < 8; k++) {
          const hk = hashCoords(281 + k, tx, ty);
          const side = (hk >>> 2) & 3;
          if (side === 0 && jW) continue;
          if (side === 1 && jE) continue;
          if (side === 2 && jN) continue;
          if (side === 3 && jS) continue;
          const along = 0.05 + 0.9 * (((hk >>> 6) % 83) / 82);
          const out = 0.04 + ((hk >>> 13) % 4) * 0.035;
          ctx.fillStyle = `rgba(200, 198, 204, ${out > 0.1 ? 0.16 : 0.3})`;
          const fs = px * 0.045;
          if (side === 0) ctx.fillRect(gx - px * out - fs, gy + px * along, fs, fs * 0.8);
          else if (side === 1) ctx.fillRect(gx + px * (1 + out), gy + px * along, fs, fs * 0.8);
          else if (side === 2) ctx.fillRect(gx + px * along, gy - px * out - fs * 0.8, fs, fs * 0.8);
          else ctx.fillRect(gx + px * along, gy + px * (1 + out), fs, fs * 0.8);
        }
      } else if (d === Detail.Bones) {
        // THE COLD HEARTH's bone litter (K1): three to five slivers of
        // old bone in the dungeon bone inks and one jaw, hash-dealt
        // so no two tiles lay the same bones. A sliver is a squared
        // bar with a knob at one end (the joint), a lit top face one
        // value step up (west sun) and a pressed shadow step under
        // its east/south edge — depth as value, never a stroke. The
        // jaw is a squared block with two tooth squares under its
        // lit face. Bone is pale on purpose (the MournerStatue law:
        // pale reads as bone, dark reads as a ghost). Min feature
        // 0.03s; fills only.
        // BODY-RULER: a long bone is a shin (0.28..0.44 tiles — a
        // quarter to a third of the rig), the jaw a hand's span; the
        // first cut's 0.16..0.28 slivers read as crumbs at one tile.
        const hh = hashCoords(239, tx, ty);
        const n = 3 + ((hh >>> 1) % 3);
        const lit = '#e4dcc4';
        const bone = '#cfc7ae';
        const dim = '#b5ac91';
        const press = 'rgba(30, 24, 26, 0.22)';
        for (let k = 0; k < n; k++) {
          const hk = hashCoords(241 + k, tx, ty);
          const long = ((hk >>> 12) & 1) === 0;
          const len = px * (0.28 + ((hk >>> 14) % 5) * 0.04);
          const thick = px * (0.08 + ((hk >>> 17) & 1) * 0.02);
          const bw = long ? len : thick;
          const bh = long ? thick : len;
          const sx = gx + px * 0.08 + (px * 0.84 - bw) * (((hk >>> 4) % 89) / 88);
          const sy = gy + px * 0.1 + (px * 0.8 - bh) * (((hk >>> 19) % 83) / 82);
          // Pressed seat, one step SE (away from the west sun).
          ctx.fillStyle = press;
          ctx.fillRect(sx + px * 0.02, sy + px * 0.025, bw, bh);
          // The shaft: dim body, lit top face.
          ctx.fillStyle = dim;
          ctx.fillRect(sx, sy, bw, bh);
          ctx.fillStyle = bone;
          if (long) ctx.fillRect(sx, sy, bw, Math.max(1, bh * 0.5));
          else ctx.fillRect(sx, sy, Math.max(1, bw * 0.5), bh);
          // The knob — the joint end, a square a step wider than
          // the shaft, hashed to either end; its own lit face.
          const knob = thick * 1.7;
          const atEnd = ((hk >>> 24) & 1) === 1;
          const kx = long ? (atEnd ? sx + bw - knob : sx) : sx - (knob - bw) * 0.5;
          const ky = long ? sy - (knob - bh) * 0.5 : atEnd ? sy + bh - knob : sy;
          ctx.fillStyle = dim;
          ctx.fillRect(kx, ky, knob, knob);
          ctx.fillStyle = bone;
          ctx.fillRect(kx, ky, knob, Math.max(1, knob * 0.5));
          ctx.fillStyle = lit;
          ctx.fillRect(kx, ky, Math.max(1, knob * 0.45), Math.max(1, knob * 0.3));
        }
        // The jaw: one squared block, its lit face on top, two tooth
        // squares hanging under the face; dealt to the south half so
        // it sits in front of the slivers.
        const jw = px * (0.3 + ((hh >>> 6) % 3) * 0.03);
        const jh = px * 0.14;
        const jx = gx + px * 0.1 + (px * 0.8 - jw) * (((hh >>> 9) % 71) / 70);
        const jy = gy + px * (0.5 + ((hh >>> 16) % 5) * 0.06);
        ctx.fillStyle = press;
        ctx.fillRect(jx + px * 0.02, jy + px * 0.03, jw, jh + px * 0.04);
        ctx.fillStyle = dim;
        ctx.fillRect(jx, jy, jw, jh);
        ctx.fillStyle = bone;
        ctx.fillRect(jx, jy, jw, jh * 0.5);
        ctx.fillStyle = lit;
        ctx.fillRect(jx, jy, jw * 0.4, jh * 0.3);
        // The teeth: two squares (a third on a hashed jaw), a step
        // paler than the bone so they read as the jaw's own edge.
        ctx.fillStyle = lit;
        const tooth = Math.max(1, px * 0.045);
        ctx.fillRect(jx + jw * 0.18, jy + jh, tooth, tooth);
        ctx.fillRect(jx + jw * 0.62, jy + jh, tooth, tooth);
        if (((hh >>> 22) & 1) === 0) ctx.fillRect(jx + jw * 0.4, jy + jh, tooth, tooth);
      } else if (d === Detail.DragFurrow) {
        // THE DRAG (K3 recut): two dark bands running north-south (a
        // felled trunk, a cart, a spoil sled) — each broken into three
        // or four hashed SEGMENTS with gaps where the load lifted or
        // the ground held, never two full-height bars — and a lit
        // ridge between them where the earth was thrown up. On dirt
        // the ridge is skipped: thrown dirt on dirt is no lighter.
        // Fills only; min feature 0.03s.
        const hh = hashCoords(243, tx, ty);
        const off = ((hh % 7) - 3) * px * 0.02;
        const dark = 'rgba(28, 20, 30, 0.42)';
        const deep = 'rgba(20, 14, 22, 0.3)';
        const bandW = px * 0.11;
        for (let bnd = 0; bnd < 2; bnd++) {
          const bx = gx + px * (bnd === 0 ? 0.27 : 0.62) + off;
          const hb = hashCoords(245 + bnd, tx, ty);
          const segs = 3 + (hb & 1);
          let y = gy - px * 0.02 + ((hb >>> 1) % 5) * px * 0.02;
          for (let k = 0; k < segs && y < gy + px; k++) {
            const hk = hashCoords(249 + k, tx + bnd * 7, ty);
            const len = px * (0.14 + ((hk >>> 2) % 5) * 0.04);
            const gap = px * (0.03 + ((hk >>> 6) % 3) * 0.02);
            const wob = (((hk >>> 9) % 3) - 1) * px * 0.012;
            ctx.fillStyle = dark;
            ctx.fillRect(bx + wob, y, bandW, Math.min(len, gy + px - y));
            // The deeper groove along the segment's east half.
            ctx.fillStyle = deep;
            ctx.fillRect(bx + wob + bandW * 0.5, y + px * 0.02, bandW * 0.5, Math.max(1, Math.min(len, gy + px - y) - px * 0.04));
            y += len + gap;
          }
        }
        if (m !== Tile.Dirt) {
          // The thrown ridge: a lit run between the bands, itself
          // broken in two by a hashed gap.
          ctx.fillStyle = 'rgba(214, 200, 176, 0.14)';
          const rx = gx + px * 0.45 + off;
          const cut = gy + px * (0.35 + ((hh >>> 4) % 4) * 0.08);
          ctx.fillRect(rx, gy, px * 0.1, Math.max(1, cut - gy - px * 0.04));
          ctx.fillRect(rx + px * 0.01, cut + px * 0.04, px * 0.1, Math.max(1, gy + px - cut - px * 0.04));
        }
      } else if (d === Detail.Chalkline) {
        // THE SETTER'S MARK (band 9b, THE STANDING COURSE): one chalk
        // line snapped on bare ground where a course will go — the one
        // drawing the Dolmen make, one line, never two crossing. A
        // Detail carries no axis, so the bar reads its cardinal
        // neighbours through dAt (the ash bake's idiom): E-W if a
        // chalk line lies east or west, N-S if north or south, hashed
        // when lone; with kin on BOTH axes the tile draws ONE axis by
        // hash, so a tee or a cross of chalk tiles can never draw two
        // bars on one tile ("never a lattice" is the brush's law, not
        // hope). The bar's cross-axis position is the tile's CENTRE
        // LINE on every tile, so it meets its neighbour at the seam to
        // the pixel; the ragged wobble (up to 0.012s) and the segment
        // breaks live mid-tile, never at the seam (the ash grain's seam
        // law). A lone tile draws 0.6 of the tile with a built end each
        // side; an end tile runs from its shared seam to a built end.
        // Segments 4..6 of 0.10..0.28s with 0.03..0.05s gaps, the last
        // absorbing the remainder to the seam; two values alternate;
        // a few chalk dust flecks (0.03s squares) thrown to one side
        // where the cord slapped. Fills only, min feature 0.03s, no
        // strokes, no transforms — a ground bake is a quad's texture
        // and must read the same off the canvas oracle and the GL
        // stage. Never a ruled stripe, never a rune.
        const hh = hashCoords(257, tx, ty);
        const chalkAt = (ox: number, oy: number): boolean => dAt !== undefined && dAt(tx + ox, ty + oy) === Detail.Chalkline;
        const kW = chalkAt(-1, 0);
        const kE = chalkAt(1, 0);
        const kN = chalkAt(0, -1);
        const kS = chalkAt(0, 1);
        const ewKin = kW || kE;
        const nsKin = kN || kS;
        const ew = ewKin && nsKin ? ((hh >>> 3) & 1) === 0 : ewKin ? true : nsKin ? false : ((hh >>> 3) & 1) === 0;
        // Along the axis: [a0, a1] in tile fractions — a shared seam
        // is 0 or 1, a built end 0.2 or 0.8.
        const joinLo = ew ? kW : kN;
        const joinHi = ew ? kE : kS;
        const a0 = joinLo ? 0 : 0.2;
        const a1 = joinHi ? 1 : 0.8;
        const barW = px * 0.035;
        const mid = px * 0.5;
        // The bar's two values (0.55 / 0.32 in the first cut read as
        // three hairline dashes at 1.3 on the museum's dirt).
        const bar = 'rgba(245, 241, 232, 0.70)';
        const barSoft = 'rgba(245, 241, 232, 0.45)';
        const dust = 'rgba(245, 241, 232, 0.28)';
        const segs = 4 + ((hh >>> 5) % 3);
        let a = a0;
        for (let k = 0; k < segs && a < a1 - 1e-6; k++) {
          const hk = hashCoords(261 + k, tx, ty);
          let len = 0.1 + ((hk >>> 2) % 10) * 0.02;
          const gap = 0.03 + ((hk >>> 6) % 3) * 0.01;
          // The last segment absorbs the remainder (a tail under 0.06
          // folds in): the line reaches the seam whole.
          if (k === segs - 1 || a + len + gap + 0.06 > a1) len = a1 - a;
          const atSeam = (a === 0 && joinLo) || (a + len >= 1 - 1e-6 && joinHi);
          // Mid-tile segments wobble off the centre line and vary in
          // width by segment (the ragged edge); a seam segment holds
          // the canonical bar so the neighbour meets it to the pixel.
          const wob = atSeam ? 0 : (((hk >>> 9) % 5) - 2) * px * 0.006;
          const w = atSeam ? barW : px * (0.03 + ((hk >>> 12) % 4) * 0.005);
          ctx.fillStyle = k & 1 ? barSoft : bar;
          if (ew) ctx.fillRect(gx + a * px, gy + mid - w * 0.5 + wob, len * px, w);
          else ctx.fillRect(gx + mid - w * 0.5 + wob, gy + a * px, w, len * px);
          a += len + gap;
        }
        // The dust: three to five flecks on the side the cord slapped.
        const side = ((hh >>> 8) & 1) === 0 ? -1 : 1;
        const flecks = 3 + ((hh >>> 10) % 3);
        ctx.fillStyle = dust;
        for (let k = 0; k < flecks; k++) {
          const hf = hashCoords(271 + k, tx, ty);
          const along = a0 + 0.06 + ((hf >>> 2) % 16) / 16 * (a1 - a0 - 0.12);
          const off = mid + side * px * (0.05 + ((hf >>> 7) % 4) * 0.02);
          const sz = px * 0.03;
          if (ew) ctx.fillRect(gx + along * px - sz * 0.5, gy + off - sz * 0.5, sz, sz);
          else ctx.fillRect(gx + off - sz * 0.5, gy + along * px - sz * 0.5, sz, sz);
        }
      } else if (d === Detail.BlightVeins) {
        // THE VEINS (K4 recut): the ground the gloom stone and the
        // creep root sicken — a bruised core with a pale dead rim (the
        // blight's own grey-ring mark, plan §12.4) and three or four
        // veins radiating off it, each a run of four to five stepped
        // squares that SHRINK and darken toward the tip (depth as
        // value steps, never a stroke). Fills only; min feature 0.03s.
        const hh = hashCoords(247, tx, ty);
        const n = 3 + (hh & 1);
        const cx = gx + px * (0.38 + ((hh >>> 2) % 5) * 0.06);
        const cy = gy + px * (0.38 + ((hh >>> 6) % 5) * 0.06);
        // The rim first, the core over it.
        ctx.fillStyle = 'rgba(168, 168, 178, 0.22)';
        ctx.fillRect(cx - px * 0.16, cy - px * 0.12, px * 0.32, px * 0.24);
        ctx.fillStyle = 'rgba(52, 38, 66, 0.5)';
        ctx.fillRect(cx - px * 0.1, cy - px * 0.075, px * 0.2, px * 0.15);
        for (let k = 0; k < n; k++) {
          const hk = hashCoords(251 + k, tx, ty);
          // The vein's heading: one of eight compass runs, hashed,
          // with a per-step jog so no vein is a ruler line.
          const dir = (hk >>> 3) & 7;
          const dxs = [1, 1, 0, -1, -1, -1, 0, 1][dir]!;
          const dys = [0, 1, 1, 1, 0, -1, -1, -1][dir]!;
          const steps = 4 + ((hk >>> 6) & 1);
          let vx = cx + dxs * px * 0.14;
          let vy = cy + dys * px * 0.1;
          for (let j = 0; j < steps; j++) {
            const sz = px * (0.085 - j * 0.012);
            const a = 0.36 + j * 0.05;
            ctx.fillStyle = `rgba(26, 18, 34, ${a.toFixed(2)})`;
            ctx.fillRect(vx - sz * 0.5, vy - sz * 0.35, sz, sz * 0.7);
            const jog = ((((hk >>> (9 + j * 2)) & 3) - 1.5) * px * 0.03);
            vx += dxs * px * 0.09 + (dys !== 0 ? jog : 0);
            vy += dys * px * 0.07 + (dxs !== 0 ? jog : 0);
            if (vx < gx + px * 0.02 || vx > gx + px * 0.98 || vy < gy + px * 0.02 || vy > gy + px * 0.98) break;
          }
        }
      } else if (d === Detail.DarkSpill) {
        // THE SPILL (K3 recut): blood-dark by VALUE, never red (the
        // content boundary is a palette law too). The first cut was one
        // filled rectangle at α .72 with a rim rectangle — the black
        // box. Now a CLUSTER of four to six hashed stepped squares
        // (≥ 0.03s) at a soaked-in α ≈ .4, two of them darker cores, and
        // the dry pale rim as separate paler squares along the west and
        // north of the cluster — where it dried first, toward the sun.
        // Fills only.
        const hh = hashCoords(257, tx, ty);
        const n = 4 + ((hh >>> 1) % 3);
        const cx = gx + px * (0.4 + ((hh >>> 3) % 5) * 0.05);
        const cy = gy + px * (0.42 + ((hh >>> 7) % 5) * 0.05);
        let minX = cx;
        let minY = cy;
        const blots: Array<[number, number, number, number]> = [];
        for (let k = 0; k < n; k++) {
          const hk = hashCoords(259 + k, tx, ty);
          const bw = px * (0.14 + ((hk >>> 2) % 5) * 0.04);
          const bh = bw * (0.6 + ((hk >>> 6) % 3) * 0.12);
          const bx = cx + (((hk >>> 9) % 41) - 20) * px * 0.012;
          const by = cy + (((hk >>> 15) % 33) - 16) * px * 0.011;
          blots.push([bx - bw * 0.5, by - bh * 0.5, bw, bh]);
          if (bx - bw * 0.5 < minX) minX = bx - bw * 0.5;
          if (by - bh * 0.5 < minY) minY = by - bh * 0.5;
        }
        // The dry rim: paler squares hugging the west and north edges.
        ctx.fillStyle = 'rgba(150, 132, 112, 0.22)';
        for (let k = 0; k < 3; k++) {
          const hr = hashCoords(271 + k, tx, ty);
          const rs = px * (0.06 + ((hr >>> 2) % 3) * 0.02);
          if ((hr & 1) === 0) ctx.fillRect(minX - rs * 0.6, cy - px * 0.14 + ((hr >>> 5) % 6) * px * 0.05, rs, rs * 0.8);
          else ctx.fillRect(cx - px * 0.16 + ((hr >>> 5) % 6) * px * 0.05, minY - rs * 0.6, rs * 1.1, rs * 0.7);
        }
        ctx.fillStyle = 'rgba(16, 10, 18, 0.4)';
        for (const [bx, by, bw, bh] of blots) ctx.fillRect(bx, by, bw, bh);
        // Two darker cores where it pooled deepest.
        ctx.fillStyle = 'rgba(16, 10, 18, 0.3)';
        for (let k = 0; k < 2 && k < blots.length; k++) {
          const [bx, by, bw, bh] = blots[(hh >>> (11 + k * 3)) % blots.length]!;
          ctx.fillRect(bx + bw * 0.25, by + bh * 0.25, Math.max(px * 0.03, bw * 0.5), Math.max(px * 0.03, bh * 0.5));
        }
      } else if (d === Detail.Mudcrack) {
        // THE DRAINED POND (K4 recut): dry plate seams — an IRREGULAR
        // grid of squared plates (two to four per axis, each row and
        // column a hashed width) with dark seams between, every plate
        // showing one lit north-west facet and a curled corner on the
        // hashed few (a paler square at the plate's south-east — the
        // clay lifts as it dries). The first cut was an even grid of
        // equal plates. Fills only; min feature 0.03s.
        const hh = hashCoords(263, tx, ty);
        ctx.fillStyle = 'rgba(40, 32, 30, 0.55)';
        ctx.fillRect(gx + px * 0.04, gy + px * 0.04, px * 0.92, px * 0.92);
        const cols = 2 + (hh % 3);
        const rows = 2 + ((hh >>> 2) % 3);
        // Hashed column and row widths, normalised to the plate field.
        const cw: number[] = [];
        const rh: number[] = [];
        let cwSum = 0;
        let rhSum = 0;
        for (let c = 0; c < cols; c++) {
          const v = 0.6 + ((hashCoords(277 + c, tx, ty) >>> 4) % 9) * 0.1;
          cw.push(v);
          cwSum += v;
        }
        for (let r = 0; r < rows; r++) {
          const v = 0.6 + ((hashCoords(283 + r, tx, ty) >>> 4) % 9) * 0.1;
          rh.push(v);
          rhSum += v;
        }
        const field = px * 0.92;
        const seam = px * 0.035;
        let py0 = gy + px * 0.04;
        for (let r = 0; r < rows; r++) {
          const ph = (field * rh[r]!) / rhSum;
          let px0 = gx + px * 0.04;
          for (let c = 0; c < cols; c++) {
            const pw = (field * cw[c]!) / cwSum;
            const hk = hashCoords(269 + r * 5 + c, tx, ty);
            const x = px0 + seam * 0.5;
            const y = py0 + seam * 0.5;
            const w = pw - seam;
            const h = ph - seam;
            ctx.fillStyle = (hk & 1) === 0 ? '#8a7a66' : '#7f7060';
            ctx.fillRect(x, y, w, h);
            // The lit facet: the plate's north-west edge toward the sun.
            ctx.fillStyle = '#9a8a74';
            ctx.fillRect(x, y, w, Math.max(1, px * 0.03));
            ctx.fillRect(x, y, Math.max(1, px * 0.03), h);
            // A curled corner on the hashed few: the south-east lifts.
            if (((hk >>> 3) & 3) === 0) {
              ctx.fillStyle = '#a4937c';
              const cs = Math.max(px * 0.03, Math.min(w, h) * 0.3);
              ctx.fillRect(x + w - cs, y + h - cs, cs, cs);
            }
            px0 += pw;
          }
          py0 += ph;
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
  /** THE LIFTED LAYER PAYS FOR ITS ROWS (B2): the tight canvas covers
   *  only [rowOrigin ..], with painting shifted up by rowOrigin·px — a
   *  consumer must sample row r at `sy = gut + (r - rowOrigin)·px`, not
   *  the pre-B2 `gut + r·px`. Carried here so the one-shot bake can
   *  never hand back a shifted canvas without the offset to read it. */
  rowOrigin: number;
}

/**
 * A sliced elevated-level bake: same shape as ChunkBakeJob so the
 * renderer's budget loop advances it with stepChunkBake. One level
 * used to bake atomically (10-40ms — a guaranteed hitch on any
 * terraced chunk); now the silhouette, each material layer, each
 * detail band, the rim, and the erase pass are separate steps.
 */
export interface ElevatedBakeJob extends ChunkBakeJob {
  rows: boolean[];
  /** THE LIFTED LAYER PAYS FOR ITS ROWS (B2): the chunk row this
   *  level's tight canvas begins at. The canvas covers only the
   *  occupied (±1-padded) row span, and every paint was shifted up by
   *  rowOrigin·px, so the draw samples `sy = gut + (r - rowOrigin)·px`. */
  rowOrigin: number;
}

/** How tall a lifted level's tight canvas must be (B2), and where it
 *  begins, given the per-row occupancy scan.
 *
 *  The renderer draws each band ±1-padded and clamped to [0, CHUNK-1]
 *  (advanceChunkPending), so the canvas must cover [firstRow-1 ..
 *  lastRow+1]. The height is then bucketed UP to a multiple of `bucket`
 *  rows so the byte-bounded chunk pool sees only a handful of lifted
 *  shapes and retired canvases still find reuse — the extra rows sit
 *  unused below the sampled span (the draw only reads rowOrigin..lastRow
 *  +1). Returns a full-height span if the level somehow has no rows
 *  (defensive; callers gate on `any`). */
export function liftedRowSpan(
  rows: readonly boolean[],
  chunkSize: number = CHUNK_SIZE,
  bucket = 8,
): { rowOrigin: number; rowCount: number } {
  let firstRow = -1;
  let lastRow = -1;
  for (let r = 0; r < chunkSize; r++) {
    if (!rows[r]) continue;
    if (firstRow < 0) firstRow = r;
    lastRow = r;
  }
  if (firstRow < 0) return { rowOrigin: 0, rowCount: chunkSize };
  const rowOrigin = Math.max(0, firstRow - 1);
  const rowEnd = Math.min(chunkSize - 1, lastRow + 1);
  const rowCount = Math.min(chunkSize, Math.ceil((rowEnd - rowOrigin + 1) / bucket) * bucket);
  return { rowOrigin, rowCount };
}

export function startElevatedBake(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  level: number,
  takeCanvas?: (rows: number) => HTMLCanvasElement | null | undefined,
): ElevatedBakeJob | null {
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

  // THE LIFTED LAYER PAYS FOR ITS ROWS (B2): this level's content lives
  // only in the scanned rows; the tight canvas covers just the ±1-
  // padded span (see liftedRowSpan) and every painter's Y comes from
  // the single ctx translate (proven), so one extra `-rowOrigin·px`
  // shift relocates the whole bake.
  const { rowOrigin, rowCount } = liftedRowSpan(rows);

  // Same gutter as the base bake (see bakeGutter): the row-slice blits
  // sample real content instead of a transparent canvas edge. The
  // crown contour cells already reach half a tile past the chunk, so
  // the margin content exists without widening any contour loop.
  const G = bakeGutter(px);
  const reuse = takeCanvas ? takeCanvas(rowCount) : null;
  const { canvas, ctx } = bakeCanvasFor(px, reuse, rowCount);
  // Shift every painter up by the row origin — composes with
  // bakeCanvasFor's translate(G,G) into translate(G, G - rowOrigin·px),
  // and survives every sliced step (nothing re-transforms the ctx).
  if (rowOrigin > 0) ctx.translate(0, -rowOrigin * px);

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

  const steps: Array<() => void> = [];
  // Step 6 — elevated layers run the same fold closures (the halo is
  // the chunk's, so a terrace folds exactly as the ground beneath it).
  const { sig: foldSig, view: fold } = foldForBake(cx, cy);

  // Silhouette build — a pure Path2D construction pass.
  steps.push(() => {
    for (let j = 0; j <= CHUNK_SIZE; j++) {
      for (let i = 0; i <= CHUNK_SIZE; i++) {
        const mask = maskAt(i, j);
        if (mask === 0) continue;
        if (nearStair(i, j)) maskQuadrants(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
        else maskPolygon(path, mask, (i - 0.5) * px, (j - 0.5) * px, px);
      }
    }
  });

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

  // Every paint step clips to the crown silhouette independently —
  // the clip cannot persist across budget slices.
  const clipped = (paint: () => void): (() => void) => {
    return () => {
      ctx.save();
      ctx.clip(path);
      paint();
      ctx.restore();
    };
  };

  // Meadow base under the skins, same recipe as the ground floor.
  steps.push(
    clipped(() => {
      const cell = Math.max(4, Math.floor(px / 4));
      const half = cell / 2 / px;
      for (let y = -G; y < CHUNK_SIZE * px + G; y += cell) {
        for (let x = -G; x < CHUNK_SIZE * px + G; x += cell) {
          ctx.fillStyle = meadowToneFold(fold, baseX, baseY, baseX + x / px, baseY + y / px, half);
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }),
  );
  // The wash on the terrace, clipped to the crown like every step.
  if (fold !== null) {
    for (const [look, b] of foldWashPasses(fold)) {
      steps.push(
        clipped(() => {
          paintFoldWash(ctx, fold, look, b, baseX, baseY, px);
        }),
      );
    }
  }
  // One material layer per step, sharing the halo index.
  let idx: Int8Array | null = null;
  for (let li = 0; li < BLOB_LAYERS.length; li++) {
    steps.push(
      clipped(() => {
        idx ??= computeLayerIdx(g, baseX, baseY);
        paintLayerSkin(ctx, idx, li, baseX, baseY, px, g, fold);
      }),
    );
  }
  // Per-tile details of member tiles, in row bands.
  for (let r0 = -1; r0 <= CHUNK_SIZE; r0 += DETAIL_STEP_ROWS) {
    const r1 = Math.min(r0 + DETAIL_STEP_ROWS - 1, CHUNK_SIZE);
    steps.push(
      clipped(() => {
        for (let ly = r0; ly <= r1; ly++) {
          for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
            const tx = baseX + lx;
            const ty = baseY + ly;
            if (!member(tx, ty)) continue;
            drawTileDetail(ctx, g(tx, ty) ?? Tile.Grass, detail(tx, ty), tx, ty, lx, ly, px, detail, g, ground, fold);
          }
        }
      }),
    );
  }

  // The rim SHOULDER: a chunky bordered edge along the whole crown
  // contour — the exposed-rock lip every classic cliff tileset gives
  // its edges. This is what makes a level change read as a ledge on
  // ALL sides, including the north back edge and east/west edges that
  // are edge-on to the camera (where the wall face itself is nearly
  // invisible). Layered strokes clipped to the crown: only the inner
  // half of each stroke shows, so the band sits entirely on top.
  steps.push(() => {
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
  });

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
  steps.push(() => {
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
  });
  if (fold !== null) steps.push(() => releaseFoldView(fold));

  return {
    canvas,
    rows,
    steps,
    next: 0,
    rowOrigin,
    spectrumSig: foldSig,
    spectrumHaloSig: fold === null ? 0 : fold.sig,
  };
}

/** The one-shot elevated bake: start + run every step. Output is
 *  identical to the sliced path — this IS the sliced path, run whole. */
export function bakeElevated(
  ground: GroundSampler,
  detail: DetailSampler,
  elev: ElevSampler,
  cx: number,
  cy: number,
  px: number,
  level: number,
): ElevatedBake | null {
  const job = startElevatedBake(ground, detail, elev, cx, cy, px, level);
  if (!job) return null;
  while (!stepChunkBake(job)) {
    /* run to completion */
  }
  return { canvas: job.canvas, rows: job.rows, rowOrigin: job.rowOrigin };
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
 * THE SWELL FIELD — the second octave of every organic boundary. The
 * per-edge hash alone wiggles at exactly one tile's wavelength, which
 * reads as a uniform worm crawling around every region. This slow
 * world noise swells and calms that jitter over ~10-tile stretches, so
 * a shoreline carries long meanders with quiet reaches between the
 * choppy ones — coastline, not corrugation. Pure function of world
 * position (+ the lane's seed), so bakes, tiers, and the live shoreline
 * agree by construction.
 */
function edgeSwell(seed: number, wx: number, wy: number): number {
  return 0.45 + 1.1 * valueNoise(6151 + seed * 97, wx * 0.031, wy * 0.031);
}

/**
 * THE CHANNEL WARP — the water family's meander, and the death of the
 * pinch point. Per-edge hash jitter is INDEPENDENT per bank: on a one-
 * or two-tile river the two banks routinely bowed inward at the same
 * spot and strangled the channel into a wasp waist (worst under
 * bridges, where the pinch met the deck). Organic boundaries instead
 * ride ONE smooth world-space displacement field: every point of every
 * organic contour (shoreline, depth shelves, land layers, the live
 * surf, the reflection clip — all through the shared edgeCross/
 * bndCurve geometry) shifts by the SAME local vector, so opposing
 * banks sway together and the channel keeps its breadth by
 * construction while the whole ribbon meanders. One field for ALL
 * layers (no per-lane seed) is load-bearing twice over: the depth
 * shelves swing with their shoreline, and the land layers' underlap
 * contours stay covered under the water skin (a water-only warp
 * exposed them as dark lobes along the banks).
 */
const WARP_AMP = 0.26;
function warpX(wx: number, wy: number): number {
  return (valueNoise(9161, wx * 0.05, wy * 0.05) - 0.5) * 2 * WARP_AMP;
}
function warpY(wx: number, wy: number): number {
  return (valueNoise(9227, wx * 0.05, wy * 0.05) - 0.5) * 2 * WARP_AMP;
}

/**
 * Where the contour crosses a dual-cell edge, as a param 0..1 along
 * the edge. Keyed on the edge's world identity so the two cells
 * sharing the edge (and every chunk/tier/live pass) agree exactly.
 */
function crossT(lane: ContourLane, wob: number, kx: number, ky: number, vert: number): number {
  if (wob === 0) return 0.5;
  // Water halves its independent jitter — the channel warp carries the
  // meander coherently, and uncorrelated crossings are what pinched
  // narrow channels shut.
  const amp =
    wob *
    edgeSwell(lane.seed, kx + (vert === 0 ? 0.5 : 0), ky + (vert === 1 ? 0.5 : 0)) *
    (lane.water ? 0.5 : 1);
  return 0.5 + (rnd01(7717 + lane.seed * 131 + vert * 67, kx, ky) - 0.5) * 2 * Math.min(0.42, amp);
}

/** Crossing point on one edge of dual cell (I, J). 0=T 1=R 2=B 3=L.
 *  Water-family crossings then ride the channel warp — a pure world
 *  function, so the two cells sharing the edge (and every chunk, tier
 *  and live pass) still agree on the displaced point exactly. */
function edgeCross(lane: ContourLane, wob: number, I: number, J: number, edge: number): Pt {
  let p: Pt;
  switch (edge) {
    case 0: p = [I - 0.5 + crossT(lane, wob, I - 1, J - 1, 0), J - 0.5]; break;
    case 1: p = [I + 0.5, J - 0.5 + crossT(lane, wob, I, J - 1, 1)]; break;
    case 2: p = [I - 0.5 + crossT(lane, wob, I - 1, J, 0), J + 0.5]; break;
    default: p = [I - 0.5, J - 0.5 + crossT(lane, wob, I - 1, J - 1, 1)]; break;
  }
  // EVERY organic boundary rides the ONE warp field (masonry, wob 0,
  // stays ruler-straight). One field for all layers is load-bearing:
  // every layer's boundary point shifts by the SAME world vector, so
  // inter-layer alignment is preserved exactly — warping water alone
  // exposed the land layers' underlap contours (dark fill-and-band
  // lobes poking out from under the shoreline).
  if (wob > 0) {
    p = [p[0] + warpX(p[0], p[1]), p[1] + warpY(p[0], p[1])];
  }
  return p;
}

/** Edge pairs: 0=T·L 1=T·R 2=R·B 3=B·L 4=L·R 5=T·B. */
function bndCurve(
  lane: ContourLane,
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
    // The control point rides the swell field too (sampled at the run
    // midpoint), so bows deepen exactly where the crossings roughen.
    // Water runs bow HALF as hard: their long meander is the coherent
    // channel warp — independent per-run bows are exactly the motion
    // that pinched opposing banks together (see THE CHANNEL WARP).
    const amp =
      Math.min(0.42, wob * edgeSwell(lane.seed, cx, cy)) * (lane.water ? 0.5 : 1);
    const d = (rnd01(8117 + lane.seed * 131 + pair * 29, I, J) - 0.5) * 2 * amp * len;
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
function boundaryCurvesFor(lane: ContourLane, wob: number, I: number, J: number, mask: number): Bnd[] {
  if (mask === 0 || mask === 15) return [];
  const cT = edgeCross(lane, wob, I, J, 0);
  const cR = edgeCross(lane, wob, I, J, 1);
  const cB = edgeCross(lane, wob, I, J, 2);
  const cL = edgeCross(lane, wob, I, J, 3);
  return boundaryCurvesFrom(lane, wob, I, J, mask, cT, cR, cB, cL);
}

/**
 * The runs of a dual cell from FOUR GIVEN edge crossings — the body
 * of boundaryCurvesFor, split out so a contour whose crossings come
 * from somewhere other than the hash (THE WEIGHTED CROSSING of the
 * living ground's wash) shares the very same run geometry, bows and
 * outward normals. Byte-identical for the hashed callers: the four
 * crossings were computed in the same order before the split.
 */
function boundaryCurvesFrom(
  lane: ContourLane,
  wob: number,
  I: number,
  J: number,
  mask: number,
  cT: Pt,
  cR: Pt,
  cB: Pt,
  cL: Pt,
): Bnd[] {
  const b = (pair: number, a: Pt, z: Pt, ox: number, oy: number): Bnd =>
    bndCurve(lane, wob, I, J, pair, a, z, ox, oy);
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
  lane: ContourLane,
  wob: number,
  I: number,
  J: number,
  mask: number,
  bnds: Bnd[],
  toX: (wx: number) => number,
  toY: (wy: number) => number,
): void {
  if (mask === 15) {
    const x0 = toX(I - 0.5);
    const y0 = toY(J - 0.5);
    const x1 = toX(I + 0.5);
    const y1 = toY(J + 0.5);
    path.rect(x0, y0, x1 - x0, y1 - y0);
    return;
  }
  const cT = edgeCross(lane, wob, I, J, 0);
  const cR = edgeCross(lane, wob, I, J, 1);
  const cB = edgeCross(lane, wob, I, J, 2);
  const cL = edgeCross(lane, wob, I, J, 3);
  organicCellPathFrom(path, I, J, mask, bnds, cT, cR, cB, cL, toX, toY);
}

/**
 * The cell polygon from FOUR GIVEN crossings (organicCellPath's body,
 * split out for THE WEIGHTED CROSSING — see boundaryCurvesFrom). The
 * full cell (mask 15) never reaches here: it needs no crossings.
 */
function organicCellPathFrom(
  path: Path2D,
  I: number,
  J: number,
  mask: number,
  bnds: Bnd[],
  cT: Pt,
  cR: Pt,
  cB: Pt,
  cL: Pt,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
): void {
  const x0 = toX(I - 0.5);
  const y0 = toY(J - 0.5);
  const x1 = toX(I + 0.5);
  const y1 = toY(J + 0.5);
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

/** The meadow's four-way tone INDEX at a world position — the noise
 *  picks which of the four; the fold (below) picks the four. */
function meadowToneIdx(wx: number, wy: number): number {
  const n =
    valueNoise(1234, wx * 0.055, wy * 0.055) * 0.7 +
    valueNoise(777, wx * 0.021, wy * 0.021) * 0.3;
  return n < 0.38 ? 3 : n < 0.52 ? 1 : n < 0.72 ? 0 : 2;
}

/** The meadow's noise-driven grass tone at a world position. */
function meadowTone(wx: number, wy: number): string {
  return GRASS_TONES[meadowToneIdx(wx, wy)]!;
}

// ------------------------------------------------ THE FOLD (LG-1)
// THE SUBSTRATE FOLDS (docs/contested-lands-plan.md §12.3 canvas
// steps 0-2, 4-5). Everything from here to drawGrassFringe is the
// living ground's painter side: the halo (step 0), the folded
// substrate (1), the wash (2), and the doors the fringe (4) and the
// marks (5) read. Every branch is guarded by `fold === null` → today's
// code, and the sig-0 fast path never builds a view at all, so parity
// at zero strokes is structural (terrain.seed.test.ts's golden).
//
// NO CLOCK REACHES A PAINTED VALUE: nothing in this section reads
// Date, performance or Math.random (terrain.fold.test.ts lints the
// section). The field arrives quantised (Int16 words, integer band
// thresholds); the only arithmetic added here is IEEE add/mul/div on
// those words, so two clients bake the same picture.

/**
 * THE FOLD GATE. The renderer latches this once per frame from the
 * plane and the LIVING_GROUND_OFF flag (drawGroundChunks): an
 * underground plane never builds a halo — gated on the PLANE, not on
 * the stale `baseY >= 512` dark-band constant (a latent planes bug
 * the plan files, not fixed here). Default on, so the Studio's
 * synchronous bakeChunk and the tests fold without a renderer.
 */
let foldEnabled = true;
export function setFoldEnabled(on: boolean): void {
  foldEnabled = on;
}

/** The chunk's reach sig under the gate: 0 = today's paint. */
export function foldSigFor(cx: number, cy: number): number {
  return foldEnabled ? spectrumSig(cx, cy) : 0;
}

/** THE HALO IS BORROWED: 36²×4 Int16 words (~10 KB), pooled; a job
 *  returns its halo in its last step, a job that dies just drops it. */
const HALO_POOL: Int16Array[] = [];
function takeHalo(): Int16Array {
  return HALO_POOL.pop() ?? allocSpectrumHalo();
}
function returnHalo(h: Int16Array): void {
  if (HALO_POOL.length < 8) HALO_POOL.push(h);
}

/**
 * THE FIELD-AWARE KEY (plan §12.2): the hash of the halo this chunk
 * would paint right now. The renderer asks only when the reach sig
 * moved — a registry swap that left every sample where it was hashes
 * the same and is NOT a re-bake. 0 when nothing reaches.
 */
export function foldHaloSigFor(cx: number, cy: number): number {
  if (foldSigFor(cx, cy) === 0) return 0;
  const h = takeHalo();
  const sig = spectrumHalo(cx * CHUNK_SIZE, cy * CHUNK_SIZE, h) ? spectrumHaloSig(h) : 0;
  returnHalo(h);
  return sig;
}

/**
 * THE VIEW: a chunk bake's read of the field. The halo's words, the
 * per-corner LOOK after precedence, a bitmask of the looks present
 * (which wash passes to run), and the halo's hash (the job's key).
 */
interface FoldView {
  halo: Int16Array;
  /** Per halo cell: FOLD_NONE | AUTUMN | SPRING | BLIGHT | BURN. */
  look: Uint8Array;
  /** Per halo cell: `(band << 3) | look` — the substrate's word. */
  bl: Uint8Array;
  /** Per halo cell: 1 when the corner's word cannot move under the
   *  hem dither on ANY axis — four stable corners sharing one word
   *  make a paint cell that word without a lerp (most of a chunk). */
  stable: Uint8Array;
  /** `1 << look` for every look at any corner of the halo. */
  present: number;
  sig: number;
  /** The taken isoband's region per look (band 2's step) and the held
   *  isoband's region (band 3's step) — the weighted-crossing contours
   *  that clip the lobes, and that THE MATERIALS FOLD re-fills. */
  washRegion: Array<Path2D | null>;
  washHeldRegion: Array<Path2D | null>;
  /** The touched contour per look, traced LAZILY (undefined = not yet)
   *  by the first material that needs it for its hem fill; a meadow-
   *  only chunk never pays for it. */
  washTouched: Array<Path2D | null | undefined>;
  /** The taken lobes' union per look and the held lobes' union per
   *  look — kept so THE MATERIALS FOLD re-keys the very same shapes
   *  inside every layer's region (one contour across a road edge,
   *  never a jog). */
  washAlt: Array<Path2D | null>;
  washHeld: Array<Path2D | null>;
}

/**
 * THE HEM CRUMBLES (the recut of THE HEM DITHERS). A band step printed
 * exactly on the isoline is a hard line, so the substrate decides its
 * table on the field PLUS a per-cell hash jitter — but the first cut
 * jittered a flat ±26 u8, and on a soft hem (r 40, soft .6 → a 24-tile
 * hem at ~10 u8 per tile) that was ±2.5 TILES: the step printed as a
 * five-tile stair of quarter-tile squares, the art director's
 * "speckled edge". The jitter is now scaled to each axis's LOCAL
 * GRADIENT so a step never moves more than FOLD_CRUMB tiles: a narrow
 * fringe of crumbs along an isoline the field's own 22-tile grain
 * already rags — crumbs, never a dither cloud, and the three bands
 * read as three nested organic shapes. FOLD_DITHER stays as the CAP
 * the jitter can never exceed; the corner stability test in
 * buildFoldView reasons about that cap. Hashed on a 1/8-tile lattice
 * every tier's paint cells sit on, so chunks agree.
 */
const FOLD_DITHER = 26;
const FOLD_CRUMB = 0.35;
const FOLD_NEAR = BAND_TOUCHED - FOLD_DITHER;

/**
 * PRECEDENCE AT A POINT — THE STRONGEST CLAIM WINS, and burn over
 * blight over season breaks the tie (ash covers sickness covers the
 * calendar). Band-major, not axis-major: the plan's bare rule let a
 * TOUCHED blight hem print itself over a TAKEN autumn as a gap ring
 * of grey-green between the straw and the bruise (the lab's HEM
 * block caught it); a weak claim now yields to a strong one and shows
 * only once it is as strong. Decided PER CORNER, never per chunk — a
 * per-chunk winner is not a function of world position and prints a
 * seam wherever the winner flips at a chunk border. Where two looks
 * meet, each band's contour interpolates toward the other's true
 * weight and the higher look paints later: two sources disagreeing
 * at a hem is a real hem.
 *
 * Returns `(w << 6) | (band << 3) | look`, 0 for summer; `w` is the
 * winning look's magnitude (the spring look reads the season word
 * negated).
 */
function resolveLook(season: number, blight: number, burn: number): number {
  const bu = band(burn);
  const bb = band(blight);
  const bs = band(season);
  if (bu > 0 && bu >= bb && bu >= bs) return (burn << 6) | (bu << 3) | FOLD_BURN;
  if (bb > 0 && bb >= bs) return (blight << 6) | (bb << 3) | FOLD_BLIGHT;
  if (bs > 0) {
    return season > 0 ? (season << 6) | (bs << 3) | FOLD_AUTUMN : (-season << 6) | (bs << 3) | FOLD_SPRING;
  }
  return 0;
}

/** The tie-break rank of a look's axis (burn > blight > season). */
function lookRank(look: number): number {
  return look === FOLD_BURN ? 3 : look === FOLD_BLIGHT ? 2 : look === FOLD_NONE ? 0 : 1;
}

/** A look's signed-corrected weight at halo cell `i` (0..255; the
 *  spring look reads the season word negated). Reads THE TRUE word of
 *  the look's axis whatever look won the corner — the interpolation
 *  into a neighbour of another look must see where this field really
 *  falls, not a precedence-zeroed step. */
function lookWeight(halo: Int16Array, look: number, i: number): number {
  switch (look) {
    case FOLD_AUTUMN: return halo[i]!;
    case FOLD_SPRING: return -halo[i]!;
    case FOLD_BLIGHT: return halo[i + HALO_CELLS]!;
    case FOLD_BURN: return halo[i + 2 * HALO_CELLS]!;
    default: return 0;
  }
}

/** Step 0 — THE HALO, built beside computeLayerIdx. Null when no word
 *  is non-zero (the painter then takes today's code path throughout). */
function buildFoldView(baseX: number, baseY: number): FoldView | null {
  const halo = takeHalo();
  if (!spectrumHalo(baseX, baseY, halo)) {
    returnHalo(halo);
    return null;
  }
  const look = new Uint8Array(HALO_CELLS);
  const bl = new Uint8Array(HALO_CELLS);
  const stable = new Uint8Array(HALO_CELLS);
  let present = 0;
  for (let i = 0; i < HALO_CELLS; i++) {
    const s = halo[i]!;
    const b = halo[i + HALO_CELLS]!;
    const u = halo[i + 2 * HALO_CELLS]!;
    const pk = resolveLook(s, b, u);
    const lk = pk & 7;
    look[i] = lk;
    bl[i] = pk & 63;
    present |= 1 << lk;
    // Stability under the hem dither: the winner's own band holds at
    // w ± J, and no other axis can reach the winner's band (or tie it
    // with a higher rank) at m + J. Summer is stable when every axis
    // sits below touched − J.
    const m = s < 0 ? -s : s;
    if (pk === 0) {
      stable[i] = m < FOLD_NEAR && b < FOLD_NEAR && u < FOLD_NEAR ? 1 : 0;
      continue;
    }
    const bd = (pk >> 3) & 7;
    const w = pk >> 6;
    let ok = band(w - FOLD_DITHER) === bd && band(w + FOLD_DITHER) === bd;
    if (ok) {
      const rank = lookRank(lk);
      const beats = (mag: number, r: number): boolean => {
        const bb = band(mag + FOLD_DITHER);
        return bb > bd || (bb === bd && r > rank);
      };
      if (lk !== FOLD_BURN && beats(u, 3)) ok = false;
      if (lk !== FOLD_BLIGHT && beats(b, 2)) ok = false;
      if (lk !== FOLD_AUTUMN && lk !== FOLD_SPRING && beats(m, 1)) ok = false;
    }
    stable[i] = ok ? 1 : 0;
  }
  return {
    halo,
    look,
    bl,
    stable,
    present,
    sig: spectrumHaloSig(halo),
    washRegion: [null, null, null, null, null],
    washHeldRegion: [null, null, null, null, null],
    washTouched: [undefined, undefined, undefined, undefined, undefined],
    washAlt: [null, null, null, null, null],
    washHeld: [null, null, null, null, null],
  };
}

function releaseFoldView(view: FoldView | null): void {
  if (view !== null) returnHalo(view.halo);
}

/** The halo cell of chunk-local tile (lx, ly), −2..33 on each axis. */
function haloCell(lx: number, ly: number): number {
  return lx + 2 + (ly + 2) * HALO_N;
}

/** The look and weight of THE TILE at (lx, ly), packed `(w << 3) | look`
 *  — the marks read their own tile's sample, no interpolation. */
function foldTileAt(view: FoldView, lx: number, ly: number): number {
  const i = haloCell(lx, ly);
  const look = view.look[i]!;
  if (look === FOLD_NONE) return 0;
  return (lookWeight(view.halo, look, i) << 3) | look;
}

/**
 * THE FIELD BETWEEN THE CORNERS: the look and weight at a continuous
 * world point, bilinear between the four tile-centre samples around
 * it, precedence applied to the interpolated words — so the substrate's
 * band step lands on the isoline, never on the dual grid, and agrees
 * exactly with the wash's crossing along every cell edge (bilinear
 * restricted to an edge IS the linear crossing). Packed `(w << 3) |
 * look`, 0 for summer. Alloc-free.
 */
function foldSampleAt(view: FoldView, baseX: number, baseY: number, wx: number, wy: number): number {
  const ux = wx - 0.5 - baseX;
  const uy = wy - 0.5 - baseY;
  let x0 = Math.floor(ux);
  let y0 = Math.floor(uy);
  if (x0 < -2) x0 = -2;
  else if (x0 > CHUNK_SIZE) x0 = CHUNK_SIZE;
  if (y0 < -2) y0 = -2;
  else if (y0 > CHUNK_SIZE) y0 = CHUNK_SIZE;
  let fx = ux - x0;
  let fy = uy - y0;
  if (fx < 0) fx = 0;
  else if (fx > 1) fx = 1;
  if (fy < 0) fy = 0;
  else if (fy > 1) fy = 1;
  const h = view.halo;
  const i00 = haloCell(x0, y0);
  const i10 = i00 + 1;
  const i01 = i00 + HALO_N;
  const i11 = i01 + 1;
  const lerp = (o: number): number => {
    const top = h[i00 + o]! + (h[i10 + o]! - h[i00 + o]!) * fx;
    const bot = h[i01 + o]! + (h[i11 + o]! - h[i01 + o]!) * fx;
    return Math.round(top + (bot - top) * fy);
  };
  const pk = resolveLook(lerp(0), lerp(HALO_CELLS), lerp(2 * HALO_CELLS));
  if (pk === 0) return 0;
  return ((pk >> 6) << 3) | (pk & 7);
}

/**
 * The substrate's read of a paint cell: the look and BAND at a world
 * point, packed `(band << 3) | look`, 0 for summer. Bilinear like
 * foldSampleAt, with two things the substrate wants that the fringe
 * does not: THE HEM DITHERS (every axis reads ±FOLD_DITHER by the
 * cell's hash before precedence and banding), and a fast path — a
 * cell whose four corners are all far from the touched threshold is
 * summer without a lerp, which is most of a partly-folded chunk.
 */
function foldBandAt(view: FoldView, baseX: number, baseY: number, wx: number, wy: number): number {
  const ux = wx - 0.5 - baseX;
  const uy = wy - 0.5 - baseY;
  let x0 = Math.floor(ux);
  let y0 = Math.floor(uy);
  if (x0 < -2) x0 = -2;
  else if (x0 > CHUNK_SIZE) x0 = CHUNK_SIZE;
  if (y0 < -2) y0 = -2;
  else if (y0 > CHUNK_SIZE) y0 = CHUNK_SIZE;
  const i00 = haloCell(x0, y0);
  const i10 = i00 + 1;
  const i01 = i00 + HALO_N;
  const i11 = i01 + 1;
  // THE FAST PATH: four stable corners sharing one word — the interior
  // of a band, or open summer — decide the cell without a lerp or a
  // hash. Only true hem cells pay the slow path below.
  const bl = view.bl;
  const st = view.stable;
  const w00 = bl[i00]!;
  if (
    (st[i00]! & st[i10]! & st[i01]! & st[i11]!) === 1 &&
    bl[i10] === w00 && bl[i01] === w00 && bl[i11] === w00
  ) {
    return w00;
  }
  let fx = ux - x0;
  let fy = uy - y0;
  if (fx < 0) fx = 0;
  else if (fx > 1) fx = 1;
  if (fy < 0) fy = 0;
  else if (fy > 1) fy = 1;
  const h = view.halo;
  const lerp = (o: number): number => {
    const top = h[i00 + o]! + (h[i10 + o]! - h[i00 + o]!) * fx;
    const bot = h[i01 + o]! + (h[i11 + o]! - h[i01 + o]!) * fx;
    return Math.round(top + (bot - top) * fy);
  };
  // The crumb: one hash per 1/8-tile lattice cell, −1..1, scaled to
  // each axis's own gradient across the cell so the jitter is at most
  // FOLD_CRUMB tiles (and never past the ±FOLD_DITHER cap).
  const hj = hashCoords(2843, Math.floor(wx * 8 + 0.5), Math.floor(wy * 8 + 0.5));
  const j01 = (((hj >>> 8) & 1023) - 511.5) / 511.5;
  const crumb = (o: number): number => {
    const a = h[i00 + o]!;
    let gx = h[i10 + o]! - a;
    let gy = h[i01 + o]! - a;
    if (gx < 0) gx = -gx;
    if (gy < 0) gy = -gy;
    const j = Math.round(j01 * FOLD_CRUMB * (gx > gy ? gx : gy));
    return j > FOLD_DITHER ? FOLD_DITHER : j < -FOLD_DITHER ? -FOLD_DITHER : j;
  };
  let s = lerp(0);
  const js = crumb(0);
  s = s > 0 ? s + js : s < 0 ? s - js : s;
  const pk = resolveLook(s, lerp(HALO_CELLS) + crumb(HALO_CELLS), lerp(2 * HALO_CELLS) + crumb(2 * HALO_CELLS));
  return pk & 63;
}

/**
 * Step 1 — THE SUBSTRATE. meadowTone's noise picks which of the four
 * tones; with a view, the four are chosen from SUBSTRATE_FOLD by the
 * band of the field at the paint cell's CENTRE (`half` = half a cell
 * in tiles; the noise keeps sampling the corner it always did). Null
 * view → GRASS_TONES, byte for byte.
 */
function meadowToneFold(
  view: FoldView | null,
  baseX: number,
  baseY: number,
  wx: number,
  wy: number,
  half: number,
): string {
  const idx = meadowToneIdx(wx, wy);
  if (view === null) return GRASS_TONES[idx]!;
  const pk = foldBandAt(view, baseX, baseY, wx + half, wy + half);
  const look = pk & 7;
  if (look === FOLD_NONE) return GRASS_TONES[idx]!;
  return SUBSTRATE_FOLD[look]![(pk >> 3) - 1]![idx]!;
}

/**
 * THE WEIGHTED CROSSING: where the isoline of `thr` crosses an edge
 * whose corner weights are wA → wB, as a param along the edge. Pure
 * interpolation — the field's own grain already rags the hem, and a
 * hash wobble on top would pull the contour OFF the isoline the
 * substrate steps on. Clamped away from the corners so a corner that
 * is barely a member still gets a run to draw, and so a neighbour
 * that lost precedence (a true weight past the threshold, another
 * look winning) lands the crossing near itself: the two looks' washes
 * overlap there and the higher one paints on top — no gap, no seam.
 * Exported for the shared-corner proof.
 */
export function foldCrossT(wA: number, wB: number, thr: number): number {
  const d = wB - wA;
  const t = d === 0 ? 0.5 : (thr - wA) / d;
  return t < 0.08 ? 0.08 : t > 0.92 ? 0.92 : t;
}

/**
 * The wash's contour wobble (a nature lane: the bows breathe). The
 * LOBES roll their own: the sub-lane halves every wobble (the water
 * law), so .6 lands their bows at .3 — the one-tile cells bow into
 * lobes, never 45° facets.
 */
const WASH_WOB = 0.24;
const WASH_LOBE_WOB = 0.6;

/**
 * Where the wash of `look` crosses the edge between halo cells iA and
 * iB, as a param A→B. Exactly one end is a member (marching squares
 * asks only for transition edges). Two cases:
 *  - the other end is summer, this look, or holds this look's weight
 *    below the threshold: THE ISOLINE, foldCrossT on the look's own
 *    weights;
 *  - the other end holds this look at or past the threshold but
 *    ANOTHER look won it (THE STRONGEST CLAIM WINS): THE CLAIM FLIPS
 *    somewhere along the edge — found by bisecting resolveLook over
 *    the linearly interpolated words (eight halvings, 1/256 of a
 *    tile; pure integer-word arithmetic, so both chunks sharing the
 *    edge land the same point). A clamped isoline here printed the
 *    hem between two looks as a cell-grid line (the lab's HEM block).
 */
function foldCrossOnEdge(view: FoldView, look: number, thr: number, iA: number, iB: number): number {
  const h = view.halo;
  const wA = lookWeight(h, look, iA);
  const wB = lookWeight(h, look, iB);
  const memA = view.look[iA] === look && wA >= thr;
  const memB = view.look[iB] === look && wB >= thr;
  if (memA === memB) return 0.5;
  const iP = memA ? iA : iB;
  const iQ = memA ? iB : iA;
  const wP = memA ? wA : wB;
  const wQ = memA ? wB : wA;
  const lq = view.look[iQ]!;
  let t: number;
  if (lq === look || lq === FOLD_NONE || wQ < thr) {
    t = foldCrossT(wP, wQ, thr);
  } else {
    const sP = h[iP]!;
    const bP = h[iP + HALO_CELLS]!;
    const uP = h[iP + 2 * HALO_CELLS]!;
    const sQ = h[iQ]!;
    const bQ = h[iQ + HALO_CELLS]!;
    const uQ = h[iQ + 2 * HALO_CELLS]!;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 8; k++) {
      const m = (lo + hi) / 2;
      const pk = resolveLook(
        Math.round(sP + (sQ - sP) * m),
        Math.round(bP + (bQ - bP) * m),
        Math.round(uP + (uQ - uP) * m),
      );
      if ((pk & 7) === look) lo = m;
      else hi = m;
    }
    t = (lo + hi) / 2;
    if (t < 0.08) t = 0.08;
    else if (t > 0.92) t = 0.92;
  }
  return memA ? t : 1 - t;
}

/** Crossing point of the wash on one edge of dual cell (I, J) — the
 *  corners are tile centres, so the halo's own words are the vertex
 *  weights. Rides the ONE warp field like every organic edge. */
function foldEdgeCross(
  view: FoldView,
  look: number,
  thr: number,
  baseX: number,
  baseY: number,
  I: number,
  J: number,
  edge: number,
): Pt {
  const i = I - baseX;
  const j = J - baseY;
  const c = (lx: number, ly: number): number => haloCell(lx, ly);
  let p: Pt;
  switch (edge) {
    case 0: p = [I - 0.5 + foldCrossOnEdge(view, look, thr, c(i - 1, j - 1), c(i, j - 1)), J - 0.5]; break;
    case 1: p = [I + 0.5, J - 0.5 + foldCrossOnEdge(view, look, thr, c(i, j - 1), c(i, j))]; break;
    case 2: p = [I - 0.5 + foldCrossOnEdge(view, look, thr, c(i - 1, j), c(i, j)), J + 0.5]; break;
    default: p = [I - 0.5, J - 0.5 + foldCrossOnEdge(view, look, thr, c(i - 1, j - 1), c(i - 1, j))]; break;
  }
  return [p[0] + warpX(p[0], p[1]), p[1] + warpY(p[0], p[1])];
}

/** The wash passes, lowest look first: the calendar, then sickness, then ash. */
const WASH_ORDER: readonly number[] = [FOLD_AUTUMN, FOLD_SPRING, FOLD_BLIGHT, FOLD_BURN];
const WASH_BANDS: readonly number[] = [2, 3];

/** Which (look, band) wash passes a view needs — one sliced step each. */
function foldWashPasses(view: FoldView): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const look of WASH_ORDER) {
    if ((view.present & (1 << look)) === 0) continue;
    for (const b of WASH_BANDS) out.push([look, b]);
  }
  return out;
}

/**
 * THE ISOBAND: the region of every dual cell where `look` holds at or
 * past `thr`, contoured by THE WEIGHTED CROSSING (foldEdgeCross) on
 * the wash's lane with the meadow's bows, joined into ONE path (the
 * union under the nonzero rule has no interior seams). Null when no
 * corner is a member. Shared by the touched, taken and held bands.
 */
function traceFoldRegion(
  view: FoldView,
  look: number,
  thr: number,
  baseX: number,
  baseY: number,
  px: number,
  lane: ContourLane,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
): Path2D | null {
  const member = (lx: number, ly: number): boolean => {
    const i = haloCell(lx, ly);
    return view.look[i] === look && lookWeight(view.halo, look, i) >= thr;
  };
  const region = new Path2D();
  let any = false;
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask =
        (member(i - 1, j - 1) ? 1 : 0) |
        (member(i, j - 1) ? 2 : 0) |
        (member(i, j) ? 4 : 0) |
        (member(i - 1, j) ? 8 : 0);
      if (mask === 0) continue;
      any = true;
      const I = baseX + i;
      const J = baseY + j;
      if (mask === 15) {
        region.rect(toX(I - 0.5), toY(J - 0.5), px, px);
        continue;
      }
      const cT = foldEdgeCross(view, look, thr, baseX, baseY, I, J, 0);
      const cR = foldEdgeCross(view, look, thr, baseX, baseY, I, J, 1);
      const cB = foldEdgeCross(view, look, thr, baseX, baseY, I, J, 2);
      const cL = foldEdgeCross(view, look, thr, baseX, baseY, I, J, 3);
      const bnds = boundaryCurvesFrom(lane, WASH_WOB, I, J, mask, cT, cR, cB, cL);
      organicCellPathFrom(region, I, J, mask, bnds, cT, cR, cB, cL, toX, toY);
    }
  }
  return any ? region : null;
}

/** The touched contour of a look, traced once per bake on demand (THE MATERIALS FOLD's hem clip). */
function foldTouchedRegion(
  view: FoldView,
  look: number,
  baseX: number,
  baseY: number,
  px: number,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
): Path2D | null {
  const have = view.washTouched[look];
  if (have !== undefined) return have;
  const lane: ContourLane = { seed: foldLaneSeed(look, 1), water: false };
  const region = traceFoldRegion(view, look, BAND_TOUCHED, baseX, baseY, px, lane, toX, toY);
  view.washTouched[look] = region;
  return region;
}

/**
 * THE LOBE FIELD: two octaves of value noise — broad (≈ 14 tiles, the
 * weathering-zone scale) with a mid octave (≈ 6 tiles) at six tenths
 * ragging it — so a lobe is a large soft shape with an organic edge,
 * and the field meanders at two scales. 0..1. The octaves are kept
 * SHORT of the country's own scale on purpose: a 22-tile broad octave
 * let a whole r-12 disc sit in one trough of the field and deal no
 * lobe at all (the lab's disc did exactly that).
 */
function foldLobeField(salt: number, wx: number, wy: number): number {
  return (valueNoise(salt, wx * 0.07, wy * 0.07) + 0.6 * valueNoise(salt + 1, wx * 0.16, wy * 0.16)) / 1.6;
}

/**
 * The lobe threshold at a corner's weight: coverage FOLLOWS THE FIELD
 * — about a fifth of the band at its outer edge, half of it at its
 * inner — so the lobes thicken toward the heart and THE MARKS CARRY
 * THE GRADIENT is spoken by the washes too.
 */
function foldLobeThresh(w: number, lo: number, hi: number): number {
  const t = (w - lo) / (hi - lo);
  return 0.62 - 0.16 * (t < 0 ? 0 : t > 1 ? 1 : t);
}

/**
 * Step 2 — THE WASH, one (look, band) per call, two bands (the touched
 * band is the hem the folded substrate and the marks carry; its
 * contour is traced only for a material's hem, on demand).
 *
 * THE RECUT (the art director's four points): the wash paints NO flat
 * fill on the meadow. The first cut filled the taken isoband with the
 * band's base key over the folded substrate and the country read as
 * one flat tinted circle; the substrate already carries each band's
 * four-tone grain, stepping on the isoline (foldBandAt), so the
 * isoband's contour is kept only as the CLIP for the lobes. TAKEN
 * (band 2) traces the taken isoline and deals the taken lobes inside
 * it — the two-octave lobe field against a weight-driven threshold,
 * bowed on the lobe wobble — as one union (fill + hairline once).
 * HELD (band 3) traces the HELD ISOLINE with the same weighted
 * crossing (never a hashed carve — that was the faceted polygon) and
 * deals the held lobes inside it, darker, over the taken lobes: the
 * heart reads as a deepening mottle inside three nested organic
 * shapes, never as rings.
 *
 * Runs WHOLE in a fringe job (never strip-narrowed: its runs phase
 * along multi-cell paths exactly like the skins'). Bands paint lowest
 * first, looks in WASH_ORDER, so burn covers blight covers the
 * calendar. Returns whether anything painted.
 */
function paintFoldWash(
  ctx: CanvasRenderingContext2D,
  view: FoldView,
  look: number,
  bandNo: number,
  baseX: number,
  baseY: number,
  px: number,
): boolean {
  const toX = (wx: number): number => (wx - baseX) * px;
  const toY = (wy: number): number => (wy - baseY) * px;
  const lane: ContourLane = { seed: foldLaneSeed(look, bandNo), water: false };
  const held = bandNo === 3;
  const thr = held ? BAND_HELD : BAND_TAKEN;
  const region = traceFoldRegion(view, look, thr, baseX, baseY, px, lane, toX, toY);
  if (held) view.washHeldRegion[look] = region;
  else view.washRegion[look] = region;
  if (region === null) return false;
  const member = (lx: number, ly: number): boolean => {
    const i = haloCell(lx, ly);
    return view.look[i] === look && lookWeight(view.halo, look, i) >= thr;
  };
  const hi = held ? 255 : BAND_HELD;
  const salt = held ? FOLD_HELD_SALT[look]! : FOLD_ALT_SALT[look]!;
  const test = (wx: number, wy: number, lx: number, ly: number): boolean =>
    foldLobeField(salt, wx, wy) > foldLobeThresh(lookWeight(view.halo, look, haloCell(lx, ly)), thr, hi);
  const lobes = paintAltPatches(
    ctx,
    region,
    { color: washAltKey(look, bandNo), salt, test },
    member,
    lane,
    held ? 0 : 64,
    WASH_LOBE_WOB,
    baseX,
    baseY,
    px,
    toX,
    toY,
    true,
  );
  if (held) view.washHeld[look] = lobes;
  else view.washAlt[look] = lobes;
  return true;
}

// ---------------------------------------------- THE MATERIALS FOLD (LG-2)
// Plan §12.3 step 3. Three doors into paintLayerSkin, every one of them
// guarded on the view: the touched contour filled with the hem key
// inside the region (THE HEM), the isobands re-keyed and clipped
// inside the region (THE WASH), and the run inks read at a run's
// midpoint (THE RUNS). The wash traces no new contour — it re-fills
// the very paths the meadow's wash kept on the view, so the contour
// runs across a road edge as one line and costs fills, not a
// marching-squares pass; the hem's touched contour is traced once per
// look per bake, by the first material that asks.

/**
 * THE HEM's read of a dual cell — the alt sub-patch's key door: the
 * look's hem pair wherever the cell's band is ≥ touched (the crumb
 * jitter is ≤ a third of a tile now, so a sparse patch cannot form a
 * checker). Packed as [fill, alt] — null means "the material holds"
 * (no fold, summer, or a look this material does not answer). The
 * FILL no longer reads this per cell: it fills the touched contour
 * (paintLayerHem).
 */
function foldHemAt(
  layer: BlobLayer,
  view: FoldView | null,
  baseX: number,
  baseY: number,
  I: number,
  J: number,
): readonly [string, string] | null {
  if (view === null || layer.fold === undefined) return null;
  const pk = foldBandAt(view, baseX, baseY, I, J);
  if (pk === 0) return null;
  return layer.fold.hem[pk & 7] ?? null;
}

/**
 * THE RUNS' read at a run's midpoint: the look and band there, UNdithered
 * (a stroke is a tile long; a tile-scale dither on an ink is noise, not
 * a hem). Packed `(band << 3) | look`, 0 for summer or below taken.
 */
function foldRunAt(view: FoldView, baseX: number, baseY: number, wx: number, wy: number): number {
  const pk = foldSampleAt(view, baseX, baseY, wx, wy);
  if (pk === 0) return 0;
  const bd = band(pk >> 3);
  return bd < 2 ? 0 : (bd << 3) | (pk & 7);
}

/** The run ink a layer answers with at a midpoint word (see foldRunAt). */
function foldRunInk(layer: BlobLayer, word: number): FoldRunInk | null {
  if (word === 0 || layer.fold?.run === undefined) return null;
  const pair = layer.fold.run[word & 7];
  return pair === null || pair === undefined ? null : pair[(word >> 3) - 2]!;
}

/** Fill + hairline in one key (the skins' own seam-killing recipe). */
function fillHairline(ctx: CanvasRenderingContext2D, path: Path2D, key: string): void {
  ctx.fillStyle = key;
  ctx.fill(path);
  ctx.strokeStyle = key;
  ctx.lineWidth = 0.8;
  ctx.stroke(path);
}

/**
 * THE HEM inside a layer: for every look the material answers with a
 * hem pair, the TOUCHED contour (traced on demand, kept on the view)
 * filled with the hem key, clipped inside the layer's region — painted
 * right after the region's own fill and before its alt patches, so
 * the touched band on a road is one organic shape a clear step from
 * the road, never a per-cell read.
 */
function paintLayerHem(
  ctx: CanvasRenderingContext2D,
  layer: BlobLayer,
  view: FoldView,
  region: Path2D,
  baseX: number,
  baseY: number,
  px: number,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
): void {
  const fold = layer.fold;
  if (fold === undefined) return;
  let clipped = false;
  for (const look of WASH_ORDER) {
    const hem = fold.hem[look];
    if (hem === null || hem === undefined) continue;
    if ((view.present & (1 << look)) === 0) continue;
    const touched = foldTouchedRegion(view, look, baseX, baseY, px, toX, toY);
    if (touched === null) continue;
    if (!clipped) {
      ctx.save();
      ctx.clip(region);
      clipped = true;
    }
    fillHairline(ctx, touched, hem[0]);
  }
  if (clipped) ctx.restore();
}

/**
 * THE WASH inside a layer: for every look whose isobands the view
 * kept, re-fill the taken region with the material's taken key (fill
 * + hairline), the taken lobes with its lobe key clipped inside the
 * taken region, and the held lobes with its held key clipped inside
 * the held region — all clipped inside the layer's region, in
 * WASH_ORDER so burn covers blight covers the calendar. A null key
 * skips that fill (sand under the cold rimes in lobes and never
 * re-fills; the shallows scum in lobes and never re-fill): the road
 * through a blighted wood wears its own greyed keys IN LOBES.
 */
function paintLayerFold(
  ctx: CanvasRenderingContext2D,
  layer: BlobLayer,
  view: FoldView,
  region: Path2D,
): void {
  const fold = layer.fold;
  if (fold === undefined) return;
  let clipped = false;
  for (const look of WASH_ORDER) {
    const keys = fold.wash[look];
    if (keys === null || keys === undefined) continue;
    const taken = view.washRegion[look];
    if (taken === null || taken === undefined) continue;
    if (!clipped) {
      ctx.save();
      ctx.clip(region);
      clipped = true;
    }
    if (keys[0] !== null) fillHairline(ctx, taken, keys[0]);
    const lobes = view.washAlt[look];
    if (keys[1] !== null && lobes !== null && lobes !== undefined) {
      ctx.save();
      ctx.clip(taken);
      fillHairline(ctx, lobes, keys[1]);
      ctx.restore();
    }
    const heldRegion = view.washHeldRegion[look];
    const heldLobes = view.washHeld[look];
    if (keys[2] !== null && heldRegion !== null && heldRegion !== undefined && heldLobes !== null && heldLobes !== undefined) {
      ctx.save();
      ctx.clip(heldRegion);
      fillHairline(ctx, heldLobes, keys[2]);
      ctx.restore();
    }
  }
  if (clipped) ctx.restore();
}

/** Every layer's fold in paint order (test pin): its seed, its base key, which tiles it claims, and its fold (null = holds). */
export function blobLayerFolds(): Array<{
  seed: number;
  base: string;
  match: (t: number) => boolean;
  fold: MaterialFold | null;
}> {
  return BLOB_LAYERS.map((l) => ({ seed: l.seed, base: l.color(0, 0, 0), match: l.match, fold: l.fold ?? null }));
}

/**
 * THE FOLD OF A BAKE: what startChunkBake and startElevatedBake share
 * — the gate, the sig, the view (built eagerly when anything reaches:
 * the placeholder folds too), and the wash passes as sliced steps.
 */
function foldForBake(cx: number, cy: number): { sig: number; view: FoldView | null } {
  const sig = foldSigFor(cx, cy);
  const view = sig === 0 ? null : buildFoldView(cx * CHUNK_SIZE, cy * CHUNK_SIZE);
  return { sig, view };
}
// ------------------------------------------------ END OF THE FOLD

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
  laden = false,
  fold: FoldView | null = null,
  baseX = 0,
  baseY = 0,
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
    // At a snow rim the tufts are frost-kissed: pale sage, not summer
    // green — cold bleeds into the meadow instead of butting it.
    // Step 4 — THE FRINGE FOLDS: the tuft reads the substrate's own
    // folded tone at its root and the look's accent beside it; blight
    // and burn thin the blades hash-vs-weight (a tuft on sick ground
    // is a thinner tuft, never a missing one).
    const tone = laden ? '#93ae90' : meadowToneFold(fold, baseX, baseY, rx, ry, 0);
    let toneAlt = laden ? '#b4c8ae' : '#79a556';
    let thin = 0;
    if (fold !== null && !laden) {
      const pk = foldSampleAt(fold, baseX, baseY, rx, ry);
      const look = pk & 7;
      if (look !== FOLD_NONE) {
        const w = pk >> 3;
        toneAlt = FRINGE_ALT[look]![band(w) - 1]!;
        if (look === FOLD_BLIGHT || look === FOLD_BURN) thin = w;
      }
    }
    for (let bl = 0; bl < blades; bl++) {
      const hb = hashCoords(seed + k * 293 + 31 * (bl + 1), bnd.I, bnd.J);
      if (thin !== 0 && ((hb >>> 13) & 255) * 5 < thin * 3) continue;
      const bx = toX(rx) + ((hb % 100) / 100 - 0.5) * px * 0.22;
      const by = toY(ry) + (((hb >> 7) % 100) / 100 - 0.5) * px * 0.1;
      const lean = (((hb >> 3) % 100) / 100 - 0.5) * 0.7;
      const tall = px * (0.1 + ((hb >> 11) % 100) / 100 * 0.09);
      const w = px * 0.05;
      ctx.fillStyle = hb & 1 ? tone : toneAlt;
      ctx.beginPath();
      ctx.moveTo(bx - w / 2, by);
      ctx.lineTo(bx + w / 2, by);
      ctx.lineTo(bx + lean * tall, by - tall);
      ctx.closePath();
      ctx.fill();
    }
    if (laden) {
      // Snow spills as DOLLOPS, never confetti: one soft lobe tossed
      // past the rim, seated in its own blue shade.
      if ((h >> 4) % 2 === 0) {
        const hc = hashCoords(seed + k * 293 + 71, bnd.I, bnd.J);
        const d = 0.1 + ((hc % 100) / 100) * 0.16;
        const along = (((hc >> 7) % 100) / 100 - 0.5) * 0.3;
        const sx = toX(p[0] + bnd.ox * d - bnd.oy * along);
        const sy = toY(p[1] + bnd.oy * d + bnd.ox * along);
        const r = px * (0.07 + ((hc >> 13) % 3) * 0.02);
        ctx.fillStyle = 'rgba(60, 72, 108, 0.16)';
        ctx.beginPath();
        ctx.ellipse(sx + r * 0.18, sy + r * 0.3, r, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eef2f8';
        ctx.beginPath();
        ctx.ellipse(sx, sy, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if ((h >> 4) % 3 !== 0) {
      // Material crumbs spilling outward onto the grass.
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
/** The layer index of every tile touching this chunk (36² halo grid —
 *  two rings, so the adjacency-underlap test never leaves the array). */
function computeLayerIdx(g: GroundSampler, baseX: number, baseY: number): Int8Array {
  const N = CHUNK_SIZE + 4;
  const idx = new Int8Array(N * N);
  for (let ly = -2; ly <= CHUNK_SIZE + 1; ly++) {
    for (let lx = -2; lx <= CHUNK_SIZE + 1; lx++) {
      idx[lx + 2 + (ly + 2) * N] = layerIndexOf(g(baseX + lx, baseY + ly) ?? Tile.Grass);
    }
  }
  return idx;
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
  g: GroundSampler,
  fold: FoldView | null = null,
): void {
  const N = CHUNK_SIZE + 4;
  const at = (lx: number, ly: number): number => idx[lx + 2 + (ly + 2) * N]!;

  const toX = (wx: number): number => (wx - baseX) * px;
  const toY = (wy: number): number => (wy - baseY) * px;

  {
    const layer = BLOB_LAYERS[li]!;
    const lane = LAYER_LANES[li]!;
    const wob = layer.wobble;
    const region = new Path2D();
    const runs: Array<{ bnd: Bnd; lone: boolean }> = [];
    const fringe: Array<{ bnd: Bnd; color: string }> = [];
    // THE UNDERLAP IS A NEIGHBOR'S COURTESY, NOT A BLANKET: layer li
    // extends under a HIGHER material's tile only where a true li tile
    // actually adjoins it (8-neighborhood) — that seal is the whole
    // point of underlap (no base peeking between two skins). The old
    // cumulative rule made every higher tile a member of EVERY lower
    // layer, so a lone snow patch in open grassland wore dirt, sand,
    // flagstone, cave and dungeon floor blobs beneath it — ten phantom
    // skins, and whichever contour lobed past the snow's printed its
    // color and worn band as a dark ring around the drift (the
    // longstanding "snow wears a black rim" artifact).
    const memberAt = (lx: number, ly: number): boolean => {
      const lt = at(lx, ly);
      if (lt === li) return true;
      if (lt < li || lt === -1) return false;
      // THE WATER FAMILY KEEPS FULL UNDERLAP: the live shoreline traces
      // the shallows layer's contour as THE land|water boundary (see
      // WATER_LI) — every deeper water tile must stay a member of every
      // shallower water layer so foam always hugs the painted edge.
      if (li >= WATER_LI) return true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx !== 0 || dy !== 0) && at(lx + dx, ly + dy) === li) return true;
        }
      }
      return false;
    };
    // THE LONE TILE: a single tile of a material is a worn spot in the
    // ground, not a walled island — its runs thin the band and skip
    // the crumb scatter. Keyed on the WORLD sampler so both chunks
    // sharing a halo tile reach the same verdict.
    const memberOf = (wx: number, wy: number): boolean => {
      const lt = layerIndexOf(g(wx, wy) ?? Tile.Grass);
      return lt >= li && lt !== -1;
    };
    // THE FOLD PAYS ONLY WHERE THE LAYER STANDS: a layer with no cell in
    // this chunk (most layers, most chunks) must not pay the wash re-fill
    // against an empty clip — three path fills per absent layer per
    // folded chunk, caught by the strip-job proof. Fold-only: the
    // zero-stroke op stream is untouched.
    let anyCell = false;
    const loneMemo = new Map<number, boolean>();
    const isLone = (wx: number, wy: number): boolean => {
      const key = wx * 131072 + wy;
      let v = loneMemo.get(key);
      if (v === undefined) {
        v =
          !memberOf(wx, wy - 1) &&
          !memberOf(wx, wy + 1) &&
          !memberOf(wx - 1, wy) &&
          !memberOf(wx + 1, wy);
        loneMemo.set(key, v);
      }
      return v;
    };
    for (let j = 0; j <= CHUNK_SIZE; j++) {
      for (let i = 0; i <= CHUNK_SIZE; i++) {
        // Corner tiles of this dual cell.
        const tl = at(i - 1, j - 1);
        const tr = at(i, j - 1);
        const br = at(i, j);
        const bl = at(i - 1, j);
        const mask =
          (memberAt(i - 1, j - 1) ? 1 : 0) |
          (memberAt(i, j - 1) ? 2 : 0) |
          (memberAt(i, j) ? 4 : 0) |
          (memberAt(i - 1, j) ? 8 : 0);
        if (mask === 0) continue;
        anyCell = true;
        const I = baseX + i;
        const J = baseY + j;
        const bnds = boundaryCurvesFor(lane, wob, I, J, mask);
        const cell = new Path2D();
        organicCellPath(cell, lane, wob, I, J, mask, bnds, toX, toY);
        const col = layer.color(0, I, J);
        ctx.fillStyle = col;
        ctx.fill(cell);
        // Hairline same-color stroke kills antialiasing seams between
        // adjacent cells of one region.
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.8;
        ctx.stroke(cell);
        region.addPath(cell);
        // THE PHANTOM BOUNDARY STAYS BARE: a cell with no TRUE li
        // corner is pure underlap sealing a seam beneath a higher
        // skin — its contour is not this material's visible edge, so
        // it takes no worn band, no lip, no fringe (only the fill).
        const hasTrue = tl === li || tr === li || br === li || bl === li;
        if (!hasTrue) continue;
        // A one-member cell may belong to a lone tile; find that tile.
        let lone = false;
        if (mask === 1 || mask === 2 || mask === 4 || mask === 8) {
          const wx = mask === 1 || mask === 8 ? I - 1 : I;
          const wy = mask === 1 || mask === 2 ? J - 1 : J;
          lone = isLone(wx, wy);
        }
        for (const b of bnds) {
          runs.push({ bnd: b, lone });
          // Turf fringe wherever the outside of this run is base grass.
          if (layer.fringe && (tl === -1 || tr === -1 || br === -1 || bl === -1)) {
            fringe.push({ bnd: b, color: col });
          }
        }
      }
    }

    // THE HEM (THE MATERIALS FOLD): the touched contour filled with the
    // look's hem key inside the region, under the alt patches.
    if (fold !== null && anyCell) paintLayerHem(ctx, layer, fold, region, baseX, baseY, px, toX, toY);

    // Region-scale two-tone drift, contoured through the same organic
    // machinery as the region itself (a distinct hash lane keeps the
    // sub-patch meander uncorrelated with the material's own edge).
    // The broader alt2 wash paints after, overlapping — big soft
    // weathering zones over the mid-scale patches.
    const altBase = (lx: number, ly: number): boolean => {
      const lt = at(lx, ly);
      return !(lt < li || lt === -1);
    };
    if (layer.alt) {
      // THE HEM's alt: the sub-patch takes the look's alt key wherever
      // its cell is in the hem (undefined = today's key, byte for byte).
      const altKey = layer.alt.color;
      const altAt =
        fold !== null && layer.fold !== undefined
          ? (I: number, J: number): string => {
              const hem = foldHemAt(layer, fold, baseX, baseY, I, J);
              return hem === null ? altKey : hem[1];
            }
          : undefined;
      paintAltPatches(ctx, region, layer.alt, altBase, lane, 64, layer.wobble, baseX, baseY, px, toX, toY, false, altAt);
    }
    if (layer.alt2) {
      paintAltPatches(ctx, region, layer.alt2, altBase, lane, 96, layer.wobble, baseX, baseY, px, toX, toY);
    }
    // THE WASH inside the material (THE MATERIALS FOLD): the isoband
    // re-keyed with this layer's own taken / held keys, clipped to the
    // region, under the interior dressing and the worn band.
    if (fold !== null && anyCell) paintLayerFold(ctx, layer, fold, region);

    // Material interiors: the dressing that makes a plaza read as laid
    // flags and a snowfield as wind-worked drifts, not blank fill.
    if (layer.interior !== undefined) {
      paintLayerInterior(ctx, region, layer.interior, li, at, baseX, baseY, px, toX, toY);
    }

    // Worn shade band settling the material into its edge — stroked
    // per run now, so width and weight breathe along the boundary
    // (swell field) and obey the sun-law: heavier in the shade, and a
    // lit lip where an edge faces the western sun.
    if (
      runs.length > 0 &&
      (layer.band !== null || layer.lip !== undefined || layer.laden || layer.bank)
    ) {
      ctx.save();
      ctx.clip(region);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const { bnd, lone } of runs) {
        const mid = qpoint(bnd, 0.5);
        const sw = Math.max(0, Math.min(1, (edgeSwell(lane.seed, mid[0], mid[1]) - 0.45) / 1.1));
        // THE RUNS (THE MATERIALS FOLD): the worn band, the lip, the
        // laden shade and crest, and the bank face take the look's ink
        // at the run's MIDPOINT, so a stroke never changes colour
        // mid-run; a look with no ink for this layer holds the layer's
        // own. The fold re-inks strokes and never adds one.
        const fw = fold !== null && layer.fold !== undefined ? foldRunAt(fold, baseX, baseY, mid[0], mid[1]) : 0;
        const ink = foldRunInk(layer, fw);
        const bandInk = ink?.band ?? layer.band;
        const lipInk = ink?.lip ?? layer.lip;
        const sunDot = bnd.ox * ART_SUN_X + bnd.oy * ART_SUN_Y;
        const p = new Path2D();
        p.moveTo(toX(bnd.ax), toY(bnd.ay));
        p.quadraticCurveTo(toX(bnd.cx), toY(bnd.cy), toX(bnd.bx), toY(bnd.by));
        if (layer.band !== null) {
          const weight = (lone ? 0.55 : 1) * (0.7 + 0.6 * sw) * (1 - 0.38 * Math.max(0, sunDot));
          ctx.strokeStyle = bandInk ?? layer.band;
          if (layer.feather) {
            // THE DEPTH DISSOLVES: the shelf between water depths is a
            // soft three-step feather — a wide faint settling, a mid
            // step, a narrow seat at the contour. Open water slides
            // into the deep; nothing draws a ring on the surface.
            ctx.globalAlpha = Math.min(1, 0.2 * weight);
            ctx.lineWidth = px * 0.62 * (0.75 + 0.5 * sw);
            ctx.stroke(p);
            ctx.globalAlpha = Math.min(1, 0.3 * weight);
            ctx.lineWidth = px * 0.36 * (0.75 + 0.5 * sw);
            ctx.stroke(p);
            ctx.globalAlpha = Math.min(1, 0.42 * weight);
            ctx.lineWidth = px * 0.16 * (0.78 + 0.44 * sw);
            ctx.stroke(p);
          } else {
            ctx.globalAlpha = Math.min(1, 0.45 * weight);
            ctx.lineWidth = px * 0.34 * (0.72 + 0.55 * sw);
            ctx.stroke(p);
            ctx.globalAlpha = Math.min(1, weight);
            ctx.lineWidth = px * 0.15 * (0.78 + 0.44 * sw);
            ctx.stroke(p);
          }
        }
        if (layer.bank) {
          // THE BANK HAS A BODY. The shoreline is a cross-section, not
          // a color cliff: (a) a submerged sandy bed margin hugs every
          // shoreline run — the ground sloping on down under the
          // surface, warm through knee-deep water and fading into the
          // shallow tone; (b) camera-facing runs (land NORTH of the
          // water) show the cut bank FACE itself descending to the
          // waterline, tinted by the land material it cuts through,
          // with its soft depth shade below; (c) where the bank stands
          // between the water and the western sun, the water at its
          // foot sits in shade. All strokes clip inside the water
          // region — the land side stays untouched.
          // The face tint samples the land at THREE points along the
          // run and takes the ends' agreement over the middle — a
          // single stray tile (one path tile, one snow lick) no longer
          // flips a whole run's face to a contrasting bar between two
          // earth runs.
          const sampleLand = (tt: number): number | undefined => {
            const q = qpoint(bnd, tt);
            return g(
              Math.floor(q[0] + bnd.ox * 0.75),
              Math.floor(q[1] + bnd.oy * 0.75),
            );
          };
          const lEnds = sampleLand(0.15);
          const landT = lEnds !== undefined && lEnds === sampleLand(0.85) ? lEnds : sampleLand(0.5);
          const th = lone ? 0.6 : 1;
          // (a) the drowned bed margin. Where the bank FACE owns the
          // edge (camera-facing runs) the margin steps well back —
          // its pale line peeking from under the dark cut read as a
          // stray highlight, and the face + foot shadow carry that
          // edge on their own.
          const faceness = Math.max(0, -bnd.oy);
          // A NARROW channel (no water 1.4 tiles in from this run)
          // quiets its margin: on a one-tile creek both banks' margins
          // overlap and the whole channel silts up cream — the margin
          // is a broad-shore instrument.
          const inW = g(
            Math.floor(mid[0] - bnd.ox * 1.4),
            Math.floor(mid[1] - bnd.oy * 1.4),
          );
          const bedTh = th * (1 - 0.6 * faceness) * (isWaterTile(inW) ? 1 : 0.45);
          ctx.strokeStyle = '#c9cfa2';
          ctx.globalAlpha = 0.22 * bedTh;
          ctx.lineWidth = px * 0.52 * (0.8 + 0.4 * sw);
          ctx.stroke(p);
          ctx.strokeStyle = '#dade9f';
          ctx.globalAlpha = 0.3 * bedTh;
          ctx.lineWidth = px * 0.26 * (0.8 + 0.4 * sw);
          ctx.stroke(p);
          // (b) the visible bank face, camera-facing runs only. Both
          // strokes ride the run path itself (the region clip keeps
          // the inner half) — offset polylines tore visible joints
          // between adjacent runs; on-path strokes share their
          // endpoints exactly, so the face runs continuous.
          if (bnd.oy < -0.35) {
            // Tints stay CLOSE IN VALUE — the face is one continuous
            // cut of ground, and a pale segment beside a dark one
            // reads as a broken white bar, not a material change.
            const face =
              landT === Tile.Sand
                ? '#8a6f47'
                : landT === Tile.Snow
                  ? '#8695ac'
                  : landT === Tile.StoneFloor ||
                      landT === Tile.CaveFloor ||
                      landT === Tile.DungeonFloor
                    ? '#5a5464'
                    : '#5f4a33';
            ctx.strokeStyle = 'rgba(18, 34, 68, 0.3)';
            ctx.globalAlpha = 1;
            ctx.lineWidth = px * 0.44;
            ctx.stroke(p);
            // Under a fold the face re-tints at [taken, held] (icy pale,
            // bruised, char) and stays close in value; a snow land keeps
            // its own face, which is already the cold's.
            const faceFold =
              fw !== 0 && landT !== Tile.Snow ? (BANK_FACE_FOLD[fw & 7]?.[(fw >> 3) - 2] ?? null) : null;
            ctx.strokeStyle = faceFold ?? face;
            ctx.globalAlpha = 0.92;
            ctx.lineWidth = px * 0.19;
            ctx.stroke(p);
          }
          // (c) sun-law: the bank's shadow lies on the water at its
          // western foot.
          if (sunDot > 0.25) {
            ctx.strokeStyle = 'rgba(20, 38, 76, 0.24)';
            ctx.globalAlpha = Math.min(1, (sunDot - 0.1) * 1.1) * th;
            ctx.lineWidth = px * 0.3;
            ctx.stroke(p);
          }
          ctx.globalAlpha = 1;
        }
        if (layer.laden) {
          // Cool blue settling shade instead of a dirt band — snow
          // shadows itself, it never wears mud. (Under burn the ink is
          // the look's: a sooted blanket settles ash-warm.)
          ctx.strokeStyle = ink?.laden ?? 'rgba(126, 146, 188, 0.3)';
          ctx.globalAlpha = 0.6 + 0.4 * sw;
          ctx.lineWidth = px * 0.38 * (0.75 + 0.5 * sw);
          ctx.stroke(p);
          // The crest catching the sun on lit edges.
          if (sunDot > 0.2) {
            ctx.strokeStyle = ink?.crest ?? 'rgba(255, 255, 255, 0.55)';
            ctx.globalAlpha = Math.min(1, sunDot);
            ctx.lineWidth = px * 0.08;
            ctx.stroke(p);
          }
        }
        if (layer.lip !== undefined && sunDot > 0.25) {
          ctx.strokeStyle = lipInk ?? layer.lip;
          ctx.globalAlpha = Math.min(1, (sunDot - 0.1) * 1.1);
          ctx.lineWidth = px * 0.07;
          ctx.stroke(p);
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.restore();
    }

    // THE LADEN EDGE, outside the region: on south-facing runs the
    // blanket shows its thickness — a white fascia sliver riding just
    // past the contour with a soft cast shadow beneath it, so snow
    // visibly SITS ON the ground it covers instead of being a decal.
    if (layer.laden) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const { bnd } of runs) {
        if (bnd.oy < 0.35) continue;
        const shadow = new Path2D();
        emitOffsetRun(shadow, bnd, 0.1, toX, toY);
        ctx.strokeStyle = 'rgba(44, 54, 86, 0.2)';
        ctx.lineWidth = px * 0.16;
        ctx.stroke(shadow);
        const fascia = new Path2D();
        emitOffsetRun(fascia, bnd, 0.025, toX, toY);
        ctx.strokeStyle = '#f7fafe';
        ctx.lineWidth = px * 0.1;
        ctx.stroke(fascia);
      }
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    for (const f of fringe) {
      drawGrassFringe(ctx, f.bnd, f.color, toX, toY, px, layer.laden === true, fold, baseX, baseY);
    }
  }
}

// The paint sun (see the pile painters' "sun-law lit west edge"):
// west with a whisper of north. Ground edges read against it exactly
// like walls and piles do — lit lips face it, worn shade gathers away
// from it. Named ONCE in shared (ART_SUN_X/ART_SUN_Y, daylight.ts) —
// local copies are banned (lighting v4 law #5).

/** A boundary run's polyline pushed along its outward normal by `d`. */
function emitOffsetRun(
  path: Path2D,
  b: Bnd,
  d: number,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
): void {
  for (let n = 0; n <= 6; n++) {
    const p = qpoint(b, n / 6);
    const x = toX(p[0] + b.ox * d);
    const y = toY(p[1] + b.oy * d);
    if (n === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
}

/**
 * Two-tone drift INSIDE a material region as organic sub-patches: the
 * same low-frequency field the old per-tile threshold sampled, but
 * contoured on the dual grid with its own hash lane — tone changes
 * meander like everything else instead of printing rectangular steps
 * on the tile grid (the plaza-patchwork artifact, retired).
 */
function paintAltPatches(
  ctx: CanvasRenderingContext2D,
  region: Path2D,
  alt: {
    color: string;
    salt: number;
    freq?: number;
    thresh?: number;
    /** THE LIVING GROUND's lobes: a membership test that replaces the
     *  single-octave noise-vs-threshold read (the two-octave lobe
     *  field against a weight-driven threshold). Absent for every
     *  layer: byte for byte the noise read. */
    test?: (wx: number, wy: number, lx: number, ly: number) => boolean;
  },
  base: (lx: number, ly: number) => boolean,
  lane: ContourLane,
  laneSalt: number,
  wobble: number,
  baseX: number,
  baseY: number,
  px: number,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
  // THE LIVING GROUND's wash unions its sub-patch cells into one path
  // and fills + strokes once (the nonzero union has no interior seam);
  // the layers keep their per-cell fill-and-stroke, byte for byte.
  merged = false,
  // THE MATERIALS FOLD: a per-cell key for the per-cell branch (the
  // layer's alt patch reads its folded alt key wherever the dual cell
  // is in the hem); absent = `alt.color` everywhere, byte for byte.
  colorAt?: (I: number, J: number) => string,
): Path2D | null {
  // The sub-contour's own hash lane: the layer's seed shifted by the
  // wash's salt (64 for alt, 96 for alt2), so the patch meander is
  // uncorrelated with the material's own edge — and pinned to the seed,
  // not the array index, so a layer inserted below never re-rolls it.
  // Sub-lanes have ALWAYS ridden the water half-jitter (the shifted
  // index landed past WATER_LI for every layer); kept so, byte for byte.
  const subLane: ContourLane = { seed: lane.seed + laneSalt, water: true };
  const wob = Math.max(0.18, wobble);
  const freq = alt.freq ?? 0.09;
  const thresh = alt.thresh ?? 0.55;
  // `base` is the region's own membership (a layer: every tile at or
  // above it in the paint order; the living ground's wash: every
  // corner of the band) — the noise field then carves the sub-patch
  // out of it.
  // THE CORNER IS READ ONCE: every dual cell asks its four corners, so
  // an unmemoised read costs four noise samples per corner — a pure
  // memo (0 unasked, 1 out, 2 in) over the halo grid quarters that,
  // for the layers and the living ground's wash alike, and changes no
  // op (the golden pins it).
  const memoN = CHUNK_SIZE + 4;
  const memo = new Uint8Array(memoN * memoN);
  const test = alt.test;
  const memberAt = (lx: number, ly: number): boolean => {
    const k = lx + 2 + (ly + 2) * memoN;
    let v = memo[k]!;
    if (v === 0) {
      v =
        base(lx, ly) &&
        (test === undefined
          ? valueNoise(alt.salt, (baseX + lx) * freq, (baseY + ly) * freq) > thresh
          : test(baseX + lx, baseY + ly, lx, ly))
          ? 2
          : 1;
      memo[k] = v;
    }
    return v === 2;
  };
  ctx.save();
  ctx.clip(region);
  const union = merged ? new Path2D() : null;
  let any = false;
  for (let j = 0; j <= CHUNK_SIZE; j++) {
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const mask =
        (memberAt(i - 1, j - 1) ? 1 : 0) |
        (memberAt(i, j - 1) ? 2 : 0) |
        (memberAt(i, j) ? 4 : 0) |
        (memberAt(i - 1, j) ? 8 : 0);
      if (mask === 0) continue;
      const I = baseX + i;
      const J = baseY + j;
      const bnds = boundaryCurvesFor(subLane, wob, I, J, mask);
      if (union !== null) {
        organicCellPath(union, subLane, wob, I, J, mask, bnds, toX, toY);
        any = true;
        continue;
      }
      const cell = new Path2D();
      organicCellPath(cell, subLane, wob, I, J, mask, bnds, toX, toY);
      const key = colorAt === undefined ? alt.color : colorAt(I, J);
      ctx.fillStyle = key;
      ctx.fill(cell);
      ctx.strokeStyle = key;
      ctx.lineWidth = 0.8;
      ctx.stroke(cell);
    }
  }
  if (union !== null && any) {
    ctx.fillStyle = alt.color;
    ctx.fill(union);
    ctx.strokeStyle = alt.color;
    ctx.lineWidth = 0.8;
    ctx.stroke(union);
  }
  ctx.restore();
  return union !== null && any ? union : null;
}

/** Dispatch a material's interior dressing, clipped to its region. */
function paintLayerInterior(
  ctx: CanvasRenderingContext2D,
  region: Path2D,
  kind: 'sand' | 'snow',
  li: number,
  at: (lx: number, ly: number) => number,
  baseX: number,
  baseY: number,
  px: number,
  _toX: (wx: number) => number,
  _toY: (wy: number) => number,
): void {
  const memberAt = (lx: number, ly: number): boolean => at(lx, ly) === li;
  ctx.save();
  ctx.clip(region);
  if (kind === 'sand') {
    paintSandRipples(ctx, memberAt, baseX, baseY, px);
  } else {
    paintSnowDrifts(ctx, memberAt, baseX, baseY, px);
  }
  ctx.restore();
}

/**
 * WIND-RIPPLED SAND: long low-contrast crescents combed by a slowly
 * turning direction field, each with a sunlit crest echo. THE WIND
 * WORKS IN TRAINS: a slow coverage field gathers the ripples into
 * combed patches with smooth-swept reaches between — a flat per-tile
 * chance scattered one ripple everywhere at even density, and even
 * density IS a pattern (user-caught). Inside a train the comb tightens
 * (angles cohere, a second parallel crest often rides beside the
 * first); out in the reaches only the stray ripple survives.
 */
function paintSandRipples(
  ctx: CanvasRenderingContext2D,
  memberAt: (lx: number, ly: number) => boolean,
  baseX: number,
  baseY: number,
  px: number,
): void {
  ctx.lineCap = 'round';
  for (let ly = -2; ly <= CHUNK_SIZE + 1; ly++) {
    for (let lx = -2; lx <= CHUNK_SIZE + 1; lx++) {
      if (!memberAt(lx, ly)) continue;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const h = hashCoords(2731, wx, wy);
      // The train field: high = combed patch, low = swept smooth.
      const train = valueNoise(2743, wx * 0.045, wy * 0.045);
      const chance = train > 0.62 ? 80 : train > 0.48 ? 30 : 4;
      if (h % 100 >= chance) continue;
      const inTrain = train > 0.62;
      // Angles cohere inside a train (the wind combed one way there);
      // stray ripples in the reaches wander more.
      const ang =
        -0.35 +
        (valueNoise(2741, wx * 0.024, wy * 0.024) - 0.5) * (inTrain ? 0.7 : 1.3);
      const len = (0.4 + ((h >> 5) % 70) / 100 + (inTrain ? 0.25 : 0)) * px;
      const cxp = (lx + 0.15 + ((h >> 7) % 70) / 100) * px;
      const cyp = (ly + 0.15 + ((h >> 12) % 70) / 100) * px;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang) * 0.65; // the tilted camera squashes y
      const bow = (((h >> 3) % 20) - 10) / 10 * px * 0.09;
      const draw = (ox: number, oy: number, tone: string, w: number): void => {
        ctx.strokeStyle = tone;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(cxp - dx * len * 0.5 + ox, cyp - dy * len * 0.5 + oy);
        ctx.quadraticCurveTo(
          cxp - dy * bow + ox,
          cyp + dx * bow + oy,
          cxp + dx * len * 0.5 + ox,
          cyp + dy * len * 0.5 + oy,
        );
        ctx.stroke();
      };
      // Shade trough first, then the crest catching the western sun.
      draw(0, 0, 'rgba(158, 128, 74, 0.16)', Math.max(1, px * 0.04));
      draw(-px * 0.03, -px * 0.028, 'rgba(248, 236, 198, 0.2)', Math.max(1, px * 0.032));
      // A parallel companion crest inside a train — ripples march in
      // ranks, never alone.
      if (inTrain && (h & 4) !== 0) {
        const pox = -dy * px * 0.16;
        const poy = dx * px * 0.16 * 0.65;
        draw(pox, poy, 'rgba(158, 128, 74, 0.12)', Math.max(1, px * 0.036));
        draw(pox - px * 0.03, poy - px * 0.028, 'rgba(248, 236, 198, 0.15)', Math.max(1, px * 0.03));
      }
    }
  }
  ctx.lineCap = 'butt';
}

/**
 * THE LADEN FIELD: sastrugi — wind-carved drift lines riding one slow
 * world wind, each a blue trough with a white crest offset toward the
 * sun. With the sparkle pass in drawTileDetail this is what turns the
 * flat white sheet into weather.
 */
function paintSnowDrifts(
  ctx: CanvasRenderingContext2D,
  memberAt: (lx: number, ly: number) => boolean,
  baseX: number,
  baseY: number,
  px: number,
): void {
  ctx.lineCap = 'round';
  for (let ly = -2; ly <= CHUNK_SIZE + 1; ly++) {
    for (let lx = -2; lx <= CHUNK_SIZE + 1; lx++) {
      if (!memberAt(lx, ly)) continue;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const h = hashCoords(2753, wx, wy);
      // Sastrugi gather where the wind field crests — carved ridges in
      // ranks on the exposed reaches, calm hollows nearly bare.
      const crest = valueNoise(2749, wx * 0.02, wy * 0.02);
      if (h % 100 >= (crest > 0.55 ? 48 : 10)) continue;
      const ang = -0.3 + (crest - 0.5) * 0.7;
      const len = (0.8 + ((h >> 5) % 70) / 100) * px;
      const cxp = (lx + 0.1 + ((h >> 8) % 80) / 100) * px;
      const cyp = (ly + 0.1 + ((h >> 13) % 80) / 100) * px;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang) * 0.6;
      const bow = (((h >> 3) % 20) - 10) / 10 * px * 0.12;
      const draw = (ox: number, oy: number, tone: string, w: number): void => {
        ctx.strokeStyle = tone;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(cxp - dx * len * 0.5 + ox, cyp - dy * len * 0.5 + oy);
        ctx.quadraticCurveTo(
          cxp - dy * bow + ox,
          cyp + dx * bow + oy,
          cxp + dx * len * 0.5 + ox,
          cyp + dy * len * 0.5 + oy,
        );
        ctx.stroke();
      };
      draw(0, 0, 'rgba(148, 164, 200, 0.26)', Math.max(1, px * 0.05));
      draw(-px * 0.035, -px * 0.03, 'rgba(255, 255, 255, 0.5)', Math.max(1, px * 0.036));
    }
  }
  ctx.lineCap = 'butt';
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

/**
 * THE STRUCTURE LAW (deck platform rework): the deck gate is decided
 * for the WHOLE CONNECTED structure, never per tile. The old per-tile
 * radius test SPLIT one authored crossing mid-span: the water rows
 * lifted into deck while the bank-approach rows fell out of the law
 * and rendered as flat blob-layer road boards — a second plank field
 * at a second scale with a grass seam between the two (the user's
 * screenshot wound). One flood per structure: if ANY member tile has
 * water within Chebyshev 2, EVERY member is lifted deck; a corduroy
 * road far from open water stays flat end to end.
 *
 * Memo discipline: samplers are per-frame closures, so the memo keys
 * on WORLD coords with a 5-second full flush (the channelAt pattern)
 * — deterministic recompute self-heals plane switches and map edits,
 * and the per-frame live path (deckFillAt probes) stays one map-get.
 */
let deckLiftMemo = new Map<number, boolean>();
let deckLiftFlushAt = 0;

function deckStructureLifted(ground: GroundSampler, tx: number, ty: number): boolean {
  const now = performance.now();
  if (now - deckLiftFlushAt > 5000) {
    deckLiftMemo = new Map();
    deckLiftFlushAt = now;
  }
  const hit = deckLiftMemo.get(packDeck(tx, ty));
  if (hit !== undefined) return hit;
  const seen = new Set<number>([packDeck(tx, ty)]);
  const queue: Array<[number, number]> = [[tx, ty]];
  const tiles: Array<[number, number]> = [];
  let lifted = false;
  // Generous cap, same reasoning as the axis flood: a capped flood
  // gives different tiles different subsets and mixed verdicts.
  const CAP = 4096;
  while (queue.length > 0 && tiles.length < CAP) {
    const [x, y] = queue.pop()!;
    tiles.push([x, y]);
    if (!lifted && waterNear2(ground, x, y)) lifted = true;
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const k = packDeck(x + dx, y + dy);
      if (!seen.has(k) && isDeckGround(ground(x + dx, y + dy))) {
        seen.add(k);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  for (const [x, y] of tiles) deckLiftMemo.set(packDeck(x, y), lifted);
  return lifted;
}

/** Dock tile of a water-touching structure — a raised jetty deck. */
export function isDockTile(ground: GroundSampler, tx: number, ty: number): boolean {
  return ground(tx, ty) === Tile.Dock && deckStructureLifted(ground, tx, ty);
}

/** Bridge tile of a water-touching structure — a raised, seated crossing. */
export function isBridgeTile(ground: GroundSampler, tx: number, ty: number): boolean {
  return ground(tx, ty) === Tile.Bridge && deckStructureLifted(ground, tx, ty);
}

/** Either raised deck — everything the water must flow quietly under. */
export function isDeckTile(ground: GroundSampler, tx: number, ty: number): boolean {
  return isDeckGround(ground(tx, ty)) && deckStructureLifted(ground, tx, ty);
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
  const dn = legs[0] === 'N' ? -1 : 1;
  const de = legs[1] === 'E' ? 1 : -1;
  if (!water) {
    // THE BANK CHAMFER (round 6, user showed square-cornered land
    // transitions): a stair-step corner that lands on the BANK grows
    // the same 45° triangle, so the crossing chamfers onto the sand
    // exactly as it chamfers over the water. Both legs must be truly
    // LIFTED decks.
    if (!isDeckTile(ground, tx, ty + dn) || !isDeckTile(ground, tx + de, ty)) return null;
  }
  // NEITHER leg may be a RAMPING apron — water and bank alike (round
  // 7, the Amberford landing): a sloping leg tears against the fill's
  // full-height triangle, and the fill's full-lift diagonal rail hangs
  // as a floating hook beside the falling parapet. Those corners keep
  // their honest square notch. An apron needs a bank BESIDE the leg,
  // so a leg with no land neighbor skips the span flood outright —
  // deckFillAt runs per water tile per frame in the live layer, and
  // mid-water notches must stay cheap.
  const nearLand = (x: number, y: number): boolean => {
    for (const [ddx, ddy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const t2 = ground(x + ddx, y + ddy);
      if (t2 !== undefined && !isDeckGround(t2) && !isWaterTile(t2)) return true;
    }
    return false;
  };
  const ramps = (x: number, y: number): boolean =>
    ground(x, y) === Tile.Bridge &&
    nearLand(x, y) &&
    bridgeApronAt(ground, x, y, deckWalkIsVertical(ground, x, y)) !== 'none';
  if (ramps(tx, ty + dn) || ramps(tx + de, ty)) return null;
  const a = legs[0] === 'N' ? nT : sT;
  return {
    legs,
    // THE FILL WEARS THE FIELD IT CONTINUES: board rhythm is read
    // from the N/S leg (drawDeckFill's `ny`), so the family follows
    // the SAME leg. The old any-bridge rule dressed a dock platform's
    // corner in bridge grey with a kerb stringer wherever the other
    // leg happened to be a bridge — twin wedges of one notch in two
    // different lumbers (the mess at the bridge-dock junction).
    family: a === Tile.Bridge ? 'bridge' : 'dock',
    bank: !water,
  };
}

/**
 * THE FILL IS REAL GROUND (bridge rework round 7). A notch fill's
 * triangle is a standing surface, not paint: anything with feet — the
 * player wading a shallow notch, a pet, a drop — that stands INSIDE
 * the triangle stands ON the deck (renderLift lifts it, the wade
 * dressing stays off, footsteps sound wood). The fill's cell can be
 * WALKABLE (WaterShallow, or bare land under a bank chamfer), so the
 * old "pure visual" reading left bodies sunk to the shins in painted
 * boards. Point-in-triangle by the legs' named solid corner; the
 * hypotenuse itself counts as deck (feet on the arris stand proud).
 */
export function fillContains(legs: DeckFillLegs, tx: number, ty: number, x: number, y: number): boolean {
  const u = x - tx;
  const v = y - ty;
  switch (legs) {
    case 'NE':
      return v <= u;
    case 'SW':
      return v >= u;
    case 'NW':
      return u + v <= 1;
    case 'SE':
      return u + v >= 1;
  }
}

/**
 * THE MIRROR STOPS AT THE STRUCTURE (round 7). The reflection pass
 * clips to the raw water region — but the lifted decks PAINT into
 * water cells: a fill's triangle and fascia live on a water tile, and
 * every deck tile's lifted boards reach DOCK_LIFT/FLAT world-rows into
 * the cell north of it (plus the organic water contour can wobble into
 * the deck cell's own fascia). Reflections composited over those
 * pixels lay a ghost body across planks and rim joists. This returns
 * the deck-COVERED area as disjoint world-space rects (one shape per
 * cell column, bands tiled so vertically adjacent decks never
 * overlap — the renderer subtracts them from the clip with an
 * even-odd path, where any overlap would flip back to a leak).
 */
export function deckCoverRects(
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
): Array<{ x: number; y: number; w: number; h: number }> {
  const L = DOCK_LIFT / FLAT;
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let y = bounds.minTy - 1; y <= bounds.maxTy + 1; y++) {
    for (let x = bounds.minTx - 1; x <= bounds.maxTx + 1; x++) {
      if (isDeckTile(ground, x, y)) {
        // The tile's full painted footprint: lifted boards (reaching
        // L into the north cell) down through its fascia at the cell
        // foot. When the north neighbor is deck (its own rect) or a
        // fill (its full cell), that band is already owned — start at
        // the shared edge instead so the shapes stay disjoint.
        const y0 =
          isDeckTile(ground, x, y - 1) || deckFillAt(ground, x, y - 1) !== null ? y : y - L;
        rects.push({ x, y: y0, w: 1, h: y + 1 - y0 });
        continue;
      }
      const f = deckFillAt(ground, x, y);
      if (f !== null) {
        // The fill's own cell: triangle + (south-facing) fascia band —
        // the full cell is deck-owned for the mirror's purposes; the
        // open sliver under the hypotenuse is the price of a clip that
        // can never lay a body across the boards.
        rects.push({ x, y, w: 1, h: 1 });
        // The lifted triangle's top band pokes L into the cell north;
        // covered already when that cell is deck (its rect) or a fill
        // (its full cell) — otherwise it needs its own band.
        if (!isDeckTile(ground, x, y - 1) && deckFillAt(ground, x, y - 1) === null) {
          rects.push({ x, y: y - L, w: 1, h: L });
        }
      }
    }
  }
  return rects;
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

/**
 * THE ARM LAW (deck platform rework). Board JOINT RHYTHM follows the
 * ARM a tile sits in, measured on the spot: the contiguous deck run
 * through the tile along each axis (capped). A long N-S arm breaks
 * its boards in the brick bond, a long E-W arm runs long planks —
 * and an L- or T-shaped complex resolves ARM BY ARM instead of
 * flipping per tile (the old per-tile guess butted the two rhythms
 * mid-run with no seam at all). Where two arms genuinely meet, the
 * rhythm verdicts disagree across one shared edge — and that edge is
 * exactly where the painters lay a HEADER BEAM, so every rhythm
 * change in the world is carpentry, never an accident.
 *
 * This is the APPEARANCE axis only. The WALK axis (aprons, kerbs,
 * thresholds, rails) stays with deckWalkIsVertical's span flood —
 * a span keeps one walk even where its board rhythm turns a corner.
 */
export function deckArmVertical(ground: GroundSampler, tx: number, ty: number): boolean {
  const CAP = 12;
  let rx = 1;
  let ry = 1;
  for (let i = 1; i <= CAP && isDeckGround(ground(tx - i, ty)); i++) rx++;
  for (let i = 1; i <= CAP && isDeckGround(ground(tx + i, ty)); i++) rx++;
  for (let i = 1; i <= CAP && isDeckGround(ground(tx, ty - i)); i++) ry++;
  for (let i = 1; i <= CAP && isDeckGround(ground(tx, ty + i)); i++) ry++;
  if (ry !== rx) return ry > rx;
  // A TIE IS A BAY, NOT AN ARM (the dock-junction seam): only a run
  // that is strictly longer N-S earns the brick bond. The old
  // tie-breaker sided with any N/S neighbor, so a chunky platform's
  // interior columns flipped vertical one by one — header beams and
  // a rhythm change cutting across ONE continuous floor, the exact
  // mid-deck seam the user photographed. A square bay lays the long
  // planks like the field around it.
  return false;
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

/**
 * THE CURRENT KNOWS ITS COURSE — the channel field. Every water tile
 * reads its own body of water: rays walk the water mask along the four
 * grid axes to find the channel's long axis (the direction of greatest
 * clearance), its breadth (the least), and whether this is moving
 * water at all. Narrow water is a RIVER — its surface life runs along
 * the channel, downstream; broad water is a POND — its surface is
 * still. Axes blend through the angle-doubling trick so the flow
 * direction turns smoothly around bends instead of snapping between
 * the eight compass steps. Downstream sign is a fixed world
 * convention (rivers here run broadly east-southeast): the eye needs
 * one coherent direction per channel, and a screen never shows enough
 * river for the convention to contradict itself.
 */
interface Channel {
  /** Unit flow direction (meaningless for ponds). */
  fx: number;
  fy: number;
  /** True for broad/stagnant water — no current. */
  pond: boolean;
}

const CHAN_R = 7;
const chanMemo = new Map<number, Channel>();
let chanFlushAt = 0;

function channelAt(ground: GroundSampler, tx: number, ty: number, now: number): Channel {
  // Periodic full flush instead of sampler-identity keying: samplers
  // are per-frame closures, and the channel is deterministic from the
  // world — a stale entry after a map edit or plane switch heals
  // within seconds.
  if (now - chanFlushAt > 5) {
    chanFlushAt = now;
    chanMemo.clear();
  }
  const key = tx * 131071 + ty;
  const hit = chanMemo.get(key);
  if (hit) return hit;
  const reach = (dx: number, dy: number): number => {
    for (let i = 1; i <= CHAN_R; i++) {
      if (!isWaterTile(ground(tx + dx * i, ty + dy * i))) return i - 1;
    }
    return CHAN_R;
  };
  const spanH = reach(1, 0) + reach(-1, 0);
  const spanV = reach(0, 1) + reach(0, -1);
  const spanD1 = reach(1, -1) + reach(-1, 1); // NE–SW
  const spanD2 = reach(1, 1) + reach(-1, -1); // SE–NW
  const breadth = Math.min(spanH, spanV, spanD1, spanD2) + 1;
  const maxSpan = Math.max(spanH, spanV, spanD1, spanD2);
  // Broad in every direction (or open lake past the ray horizon) =
  // still water. Rivers are decisively longer than they are wide.
  const pond = breadth >= 5 || maxSpan < breadth * 2;
  let fxv = 1;
  let fyv = 0;
  if (!pond) {
    // Blend the axes in doubled-angle space, weighted by span² so the
    // dominant direction leads but bends turn smoothly.
    let cx = 0;
    let cy = 0;
    const axes: Array<[number, number]> = [
      [spanH * spanH, 0], // θ=0
      [spanV * spanV, Math.PI], // θ=π/2 doubled
      [spanD1 * spanD1, -Math.PI / 2], // θ=-π/4 doubled
      [spanD2 * spanD2, Math.PI / 2], // θ=π/4 doubled
    ];
    for (const [w2, a2] of axes) {
      cx += w2 * Math.cos(a2);
      cy += w2 * Math.sin(a2);
    }
    const theta = Math.atan2(cy, cx) / 2;
    fxv = Math.cos(theta);
    fyv = Math.sin(theta);
    // Downstream convention: east-southeast-ish, one sign per axis.
    if (fxv * 1 + fyv * 0.4 < 0) {
      fxv = -fxv;
      fyv = -fyv;
    }
  }
  const ch: Channel = { fx: fxv, fy: fyv, pond };
  chanMemo.set(key, ch);
  return ch;
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
/**
 * THE WET LEDGER — the live-water pass, compiled. The breeze layer only
 * ever dresses the water family and the decks it laps against, yet the
 * scan paid sampler calls for every meadow tile in view (and the
 * shoreline march paid four corner reads per dual cell). A caller that
 * already holds a tile snapshot (the renderer's frame grid) compiles
 * these lists in one linear typed-array pass and hands them in; the
 * passes then visit only tiles that can possibly speak. The lists are
 * BUILT FRESH each frame from the same snapshot the samplers read, so
 * there is nothing to invalidate — and every caller without lists (the
 * elevated bands' single-row calls, the editor, bakes) keeps the plain
 * scan, which remains the always-correct fallback.
 *
 * Packing: (tx + 0x8000) << 16 | (ty + 0x8000), row-major append — the
 * exact visit order of the scans they replace, so bucket insertion
 * order (draw order) is preserved by construction.
 */
export interface WetLists {
  /** Wet tiles (water family or deck) inside the pass bounds. */
  tiles: number[];
  /** Dual cells with at least one water-family corner (bounds+1 grid). */
  cells: number[];
}

/** Unpack helpers shared by the list consumers. The x shift is
 *  UNSIGNED: for tx ≥ 0 the packed int32 wraps negative, and a signed
 *  shift would sign-extend it into garbage coordinates — silently
 *  dropping every wet tile in the eastern half of the world. */
const wetX = (packed: number): number => (packed >>> 16) - 0x8000;
const wetY = (packed: number): number => (packed & 0xffff) - 0x8000;

/** Wet class per tile id: 1 = water family, 2 = deck. Table-backed so
 *  a frame-grid compile pays one u8 read per tile, not two predicate
 *  calls. Sized past every authored tile id; grown on demand. */
let WET_CLASS = new Uint8Array(0);
export function wetClassOf(t: number): number {
  if (t >= WET_CLASS.length) {
    const next = new Uint8Array(Math.max(2048, t + 1));
    for (let id = 0; id < next.length; id++) {
      next[id] = (isWaterTile(id) ? 1 : 0) | (isDeckGround(id) ? 2 : 0);
    }
    WET_CLASS = next;
  }
  return WET_CLASS[t]!;
}

export function drawLiveGround(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  timeMs: number,
  fx: WaterFx = WATER_FX_DEFAULT,
  wet?: WetLists,
): void {
  const t = timeMs / 1000;
  const bk = new WaterBuckets();
  const tones = waterTones(fx.moonlit);
  // The shoreline runs first so its dark waterline buckets flush under
  // the foam and glitter (map insertion order is draw order).
  drawShorelines(bk, ground, bounds, worldToScreen, s, t, fx, tones, wet?.cells);
  const glintScale = fx.moonlit ? 0.3 : 0.5;
  const wetTiles = wet?.tiles;
  const nWet = wetTiles ? wetTiles.length : 0;
  // One loop, two drivers: the compiled list when the caller brought
  // one, the plain bounds scan otherwise. Same visit order either way.
  let li = 0;
  let scanTx = bounds.minTx;
  let scanTy = bounds.minTy;
  for (;;) {
    let tx: number;
    let ty: number;
    if (wetTiles) {
      if (li >= nWet) break;
      const packed = wetTiles[li++]!;
      tx = wetX(packed);
      ty = wetY(packed);
    } else {
      if (scanTy > bounds.maxTy) break;
      tx = scanTx;
      ty = scanTy;
      if (++scanTx > bounds.maxTx) {
        scanTx = bounds.minTx;
        scanTy++;
      }
    }
    {
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
        // THE CURRENT AND THE CALM: what rides this surface depends on
        // what this water IS. A river's open water carries flow
        // streaks sliding downstream along its own channel axis (the
        // old swell bands drifted east regardless of the river's
        // course — a north-running river wore sideways waves); a
        // pond's open water keeps the slow drifting swell, plus the
        // occasional stillness ring spreading and dying.
        if (fx.full && !southIsDeck && !selfFill) {
          const ch = channelAt(ground, tx, ty, t);
          const okFlow = (x: number, y: number): boolean =>
            isWaterTile(ground(x, y)) &&
            !isDeckGround(ground(x, y + 1)) &&
            deckFillAt(ground, x, y) === null;
          if (!ch.pond) {
            const ix = Math.round(ch.fx);
            const iy = Math.round(ch.fy);
            if (h % 3 === 0 && okFlow(tx + ix, ty + iy) && okFlow(tx - ix, ty - iy)) {
              // The flow streak: an elongated current line, bowed a
              // whisper off-axis, born upstream and dying downstream.
              const cyc = 2.2 + (((h >>> 7) % 100) / 100) * 1.8;
              const phase = (t / cyc + (h % 97) / 97) % 1;
              const alpha =
                Math.sin(phase * Math.PI) * 0.38 * (0.35 + 0.65 * act) * tones.dim;
              const tone = tile === Tile.WaterDeep ? '#4a76ad' : '#5c8ac2';
              const path = bk.stroke(tone, 0.05, alpha);
              if (path) {
                const cxp = tx + 0.5 + (((h >>> 4) % 60) - 30) / 100;
                const cyp = ty + 0.5 + (((h >>> 9) % 60) - 30) / 100;
                const d = (phase - 0.5) * 1.2;
                const len = 0.35 + ((h >>> 6) % 30) / 100;
                const x0 = cxp + ch.fx * (d - len);
                const y0 = cyp + ch.fy * (d - len);
                const x1 = cxp + ch.fx * (d + len);
                const y1 = cyp + ch.fy * (d + len);
                const bow = (((h >>> 11) % 20) - 10) / 90;
                const a = worldToScreen(x0, y0);
                const c = worldToScreen(
                  (x0 + x1) / 2 - ch.fy * bow,
                  (y0 + y1) / 2 + ch.fx * bow,
                );
                const b = worldToScreen(x1, y1);
                path.moveTo(a.x, a.y);
                path.quadraticCurveTo(c.x, c.y, b.x, b.y);
              }
            }
            // A lively reach tosses the odd white riffle crest — a
            // short bright fleck riding the current.
            if (h % 11 === 3 && act > 0.5 && okFlow(tx + ix, ty + iy)) {
              const phase = (t * 0.45 + (h % 53) / 53) % 1;
              const alpha = Math.sin(phase * Math.PI) * 0.5 * tones.dim;
              const path = bk.stroke(tones.crest, 0.045, alpha);
              if (path) {
                const bx = tx + 0.3 + ((h >>> 5) % 40) / 100 + ch.fx * phase * 0.6;
                const by = ty + 0.3 + ((h >>> 10) % 40) / 100 + ch.fy * phase * 0.6;
                const a = worldToScreen(bx, by);
                const b = worldToScreen(bx + ch.fx * 0.16, by + ch.fy * 0.16);
                path.moveTo(a.x, a.y);
                path.lineTo(b.x, b.y);
              }
            }
          } else {
            // Pond swell: slow, faintly bowed drift. Hosts still need
            // two open-water tiles east so a band never slides ashore.
            if (
              h % 5 === 0 &&
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
                // An echo band trailing half the swells: pairs and
                // lone bands mixed break the one-stroke-per-tile
                // rhythm.
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
            // The stillness ring: something touched the surface — a
            // slow circle spreads and dies. Rare, unhurried, the
            // pond's way of breaking up a broad sheet without waves.
            if (h % 19 === 5) {
              const cyc = 6 + ((h >>> 5) % 50) / 10;
              const phase = (t / cyc + (h % 89) / 89) % 1;
              if (phase < 0.45) {
                const k = phase / 0.45;
                const alpha = (1 - k) * 0.3 * (0.4 + 0.6 * act) * tones.dim;
                const path = bk.stroke(tones.glint, 0.035, alpha);
                if (path) {
                  const p = worldToScreen(
                    tx + 0.2 + ((h >>> 4) % 60) / 100,
                    ty + 0.25 + ((h >>> 9) % 55) / 100,
                  );
                  const r = (0.08 + k * 0.42) * s;
                  path.moveTo(p.x + r, p.y);
                  path.ellipse(p.x, p.y, r, r * FLAT, 0, 0, Math.PI * 2);
                }
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
        // A shallow RIVER still runs: most worldgen streams are
        // wadeable bank to bank, and a current that stopped at the
        // shallows line would leave them dead. Same flow streak as
        // open water, a shade lighter and quieter.
        if (fx.full && !southIsDeck && !selfFill && h % 4 === 1) {
          const ch = channelAt(ground, tx, ty, t);
          if (!ch.pond) {
            const ix = Math.round(ch.fx);
            const iy = Math.round(ch.fy);
            const okFlow = (x: number, y: number): boolean =>
              isWaterTile(ground(x, y)) &&
              !isDeckGround(ground(x, y + 1)) &&
              deckFillAt(ground, x, y) === null;
            if (okFlow(tx + ix, ty + iy) && okFlow(tx - ix, ty - iy)) {
              const cyc = 2.4 + (((h >>> 7) % 100) / 100) * 1.8;
              const phase = (t / cyc + (h % 97) / 97) % 1;
              const alpha =
                Math.sin(phase * Math.PI) * 0.3 * (0.35 + 0.65 * act) * tones.dim;
              const path = bk.stroke('#7fb0d3', 0.045, alpha);
              if (path) {
                const cxp = tx + 0.5 + (((h >>> 4) % 60) - 30) / 100;
                const cyp = ty + 0.5 + (((h >>> 9) % 60) - 30) / 100;
                const d = (phase - 0.5) * 1.2;
                const len = 0.3 + ((h >>> 6) % 30) / 100;
                const bow = (((h >>> 11) % 20) - 10) / 90;
                const x0 = cxp + ch.fx * (d - len);
                const y0 = cyp + ch.fy * (d - len);
                const x1 = cxp + ch.fx * (d + len);
                const y1 = cyp + ch.fy * (d + len);
                const a = worldToScreen(x0, y0);
                const c = worldToScreen(
                  (x0 + x1) / 2 - ch.fy * bow,
                  (y0 + y1) / 2 + ch.fx * bow,
                );
                const b = worldToScreen(x1, y1);
                path.moveTo(a.x, a.y);
                path.quadraticCurveTo(c.x, c.y, b.x, b.y);
              }
            }
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
  cells?: number[],
): Path2D | null {
  const wob = BLOB_LAYERS[WATER_LI]!.wobble;
  const id = (v: number): number => v;
  let path: Path2D | null = null;
  // The compiled wet-cell list (see WetLists) covers exactly the cells
  // with a water corner — the ones this scan keeps; the plain march
  // stands for every caller without a snapshot.
  const nCells = cells ? cells.length : 0;
  let li = 0;
  let scanI = bounds.minTx;
  let scanJ = bounds.minTy;
  for (;;) {
    let i: number;
    let j: number;
    if (cells) {
      if (li >= nCells) break;
      const packed = cells[li++]!;
      i = wetX(packed);
      j = wetY(packed);
    } else {
      if (scanJ > bounds.maxTy + 1) break;
      i = scanI;
      j = scanJ;
      if (++scanI > bounds.maxTx + 1) {
        scanI = bounds.minTx;
        scanJ++;
      }
    }
    {
      const mask =
        (isWaterTile(ground(i - 1, j - 1)) ? 1 : 0) |
        (isWaterTile(ground(i, j - 1)) ? 2 : 0) |
        (isWaterTile(ground(i, j)) ? 4 : 0) |
        (isWaterTile(ground(i - 1, j)) ? 8 : 0);
      if (mask === 0) continue;
      path ??= new Path2D();
      const bnds = mask === 15 ? [] : boundaryCurvesFor(WATER_LANE, wob, i, j, mask);
      organicCellPath(path, WATER_LANE, wob, i, j, mask, bnds, id, id);
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
  cells?: number[],
): void {
  const wob = BLOB_LAYERS[WATER_LI]!.wobble;
  const STEPS = 6;
  // List-driven when the caller compiled one (see WetLists), plain
  // dual-cell march otherwise — identical visit order.
  const nCells = cells ? cells.length : 0;
  let li = 0;
  let scanI = bounds.minTx;
  let scanJ = bounds.minTy;
  for (;;) {
    let i: number;
    let j: number;
    if (cells) {
      if (li >= nCells) break;
      const packed = cells[li++]!;
      i = wetX(packed);
      j = wetY(packed);
    } else {
      if (scanJ > bounds.maxTy + 1) break;
      i = scanI;
      j = scanJ;
      if (++scanI > bounds.maxTx + 1) {
        scanI = bounds.minTx;
        scanJ++;
      }
    }
    {
      const c00 = ground(i - 1, j - 1);
      const c10 = ground(i, j - 1);
      const c11 = ground(i, j);
      const c01 = ground(i - 1, j);
      const mask =
        (isWaterTile(c00) ? 1 : 0) |
        (isWaterTile(c10) ? 2 : 0) |
        (isWaterTile(c11) ? 4 : 0) |
        (isWaterTile(c01) ? 8 : 0);
      if (mask === 0 || mask === 15) continue;
      // Deck cells get NO shoreline: the water slides quietly under
      // a raised dock or bridge — foam ringing a deck would paint it
      // back into a flat peninsula (piles carry their own ripples).
      // The skip reaches ONE RING past the dual cell: a set wave
      // slides in from over half a tile offshore, so a run in the
      // NEXT cell still pushes its crest and spray out past a deck
      // edge (the torn white sliver at every bank junction). Water
      // calming beside the structure reads right anyway. Probed only
      // AFTER the mask gate — the 16-sample ring on every dry meadow
      // cell was a measured frame cost, and a cell with no waterline
      // never needed the answer.
      let nearDeck = false;
      for (let dy = -2; dy <= 1 && !nearDeck; dy++) {
        for (let dx = -2; dx <= 1 && !nearDeck; dx++) {
          if (isDeckGround(ground(i + dx, j + dy))) nearDeck = true;
        }
      }
      if (nearDeck) continue;
      const bnds = boundaryCurvesFor(WATER_LANE, wob, i, j, mask);
      for (let k = 0; k < bnds.length; k++) {
        const bnd = bnds[k]!;
        // The run's world polyline, sampled once and re-used by every
        // layer; `emit` re-projects it offset along the outward normal
        // (d > 0 pushes OFFSHORE, d < 0 onto the land).
        const wpts: Pt[] = [];
        for (let n = 0; n <= STEPS; n++) wpts.push(qpoint(bnd, n / STEPS));
        // THE SURF MEETS THE FOOT OF THE BANK. On a camera-facing run
        // (land north of the water) the painted contour is the TOP LIP
        // of the cut bank face — the actual water surface meets that
        // face a face-height LOWER on screen. Every live element of
        // the shoreline (lap, foam, crest, break, spray, backwash,
        // wet mark) anchors to this SURFLINE, a pure screen-space drop
        // scaled by how camera-facing the run is: south runs (no
        // visible face) keep the contour exactly, side runs barely
        // move, north runs lap against the base of the earth. Without
        // this, chunky white foam stamped ACROSS the dark bank face —
        // disconnected bright pills on the top shore of every pool.
        const drop = Math.max(0, -bnd.oy) * 0.19 * s;
        const emit = (path: Path2D, d: number, from = 0, to = STEPS): void => {
          for (let n = from; n <= to; n++) {
            const p = worldToScreen(wpts[n]![0] - bnd.ox * d, wpts[n]![1] - bnd.oy * d);
            if (n === from) path.moveTo(p.x, p.y + drop);
            else path.lineTo(p.x, p.y + drop);
          }
        };
        const hh = hashCoords(71 + k, i, j);
        const act = liveliness(bnd.ax, bnd.ay, t);

        // THE LAP (both modes): the dark waterline, breathing — water
        // meeting land, not inked outline. At a bank face this is the
        // shadow seated under the cut: a touch heavier there.
        const lap = 0.5 + 0.5 * Math.sin(t * 0.8 + (hh % 63) / 10);
        const faceness = Math.max(0, -bnd.oy);
        const wl = bk.stroke(
          '#1a3060',
          lap > 0.5 ? 0.06 : 0.05,
          0.26 + lap * 0.12 + faceness * 0.1,
        );
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
              if (n === 0) path.moveTo(p.x, p.y + drop);
              else path.lineTo(p.x, p.y + drop);
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
                // surface — tossed at the surfline, never up the face.
                fill.rect(p.x, p.y + drop, r, r * FLAT);
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


