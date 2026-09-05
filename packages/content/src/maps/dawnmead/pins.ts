/**
 * DAWNMEAD UNDER SIEGE (band 6) — THE SACRED PINS.
 *
 * Every coordinate a test, a route head, a routine or the plan's §7.1
 * keep-list nails to the ground, written once so twenty-four district
 * modules argue with a constant instead of a memory. This file and
 * ctx.ts are FROZEN by the block-out brief (band6/blockout.md): a lane
 * that needs a pin moved asks the brief, never edits here.
 *
 * Coordinates are LOCAL (0..191, 0..223); world = local + (-160,-64).
 * Posts are tile-centred floats (x.5); directions are radians as the
 * routine JSON writes them: 0 east, PI/2 south, PI west, -PI/2 north.
 */
import { Tile } from '@arx/shared';

/** The rect (geography.ts DAWNMEAD_RECT; chunk-aligned; centre = anchor). */
export const RECT = { x: -160, y: -64, w: 192, h: 224 } as const;
export const ORIGIN = { x: -160, y: -64 } as const;
export const WIDTH = 192;
export const HEIGHT = 224;
/** The danger anchor, local (96,112) = world (-64,48), safeR 64. */
export const ANCHOR = { x: 96, y: 112, safeR: 64 } as const;
/** The spawn: world (-81.5,48.5); tile (78,112) must be walkable StoneFloor. */
export const SPAWN = { x: 78.5, y: 112.5, tile: { x: 78, y: 112 } } as const;
/** worldgen.test pins Tile.Well at world (-46,44). */
export const WELL = { x: 114, y: 108 } as const;

// ---------------------------------------------------------------------
// THE WAKING RING — identical inside eight tiles.
// ---------------------------------------------------------------------
/** Seven PillarStones: N NW NE SW SE W E. */
export const STONES: ReadonlyArray<readonly [number, number]> = [
  [78, 108], [74, 110], [82, 109], [74, 115], [81, 116], [72, 112], [85, 113],
];
export const FALLEN_ROCKS: ReadonlyArray<readonly [number, number]> = [[68, 118], [89, 106]];
export const RING_PAD = {
  cx: 78.5, cy: 112.5, rx: 7.5, ry: 6,
  bites: [[72, 108], [85, 109], [71, 116], [86, 117], [77, 106], [80, 119], [87, 111]],
} as const;
export const RING_LAMPS: ReadonlyArray<readonly [number, number]> = [[88, 109], [88, 115]];
/** Chebyshev 8 of any stone: the golden box (inclusive). */
export const RING_BOX = { x0: 64, y0: 100, x1: 93, y1: 124, w: 30, h: 25 } as const;

// ---------------------------------------------------------------------
// ROUTE HEADS, LANE, WATER (geography.ts agreement; content.test).
// ---------------------------------------------------------------------
/** Path rows 111..113, x86..191; (191,111..113) Path; (191,112) reachable. */
export const LANE_ROWS = { y0: 111, y1: 113, x0: 86, x1: 191 } as const;
export const ROUTE_HEADS = {
  lane: { x: 191, y: 112 },
  huntersTrail: { x: 60, y: 0 },
  oldRoad: { x: 108, y: 223 },
} as const;
/** The lane breathes: no edge wood where |y-112| <= 4 and x >= 66. */
export const LANE_BAND = { dy: 4, xMin: 66 } as const;
export const BRIDGE = { x0: 157, x1: 163, y0: 110, y1: 114 } as const;
export const FORD = { y0: 148, y1: 151 } as const;
/** The pier stops mid-channel: Dock x154..159 y46, head (158..159, 45 and 47); never x >= 161. */
export const PIER = { dockX0: 154, dockX1: 159, y: 46, headX0: 158, headX1: 159, neverX: 161 } as const;
export const BROOK = { north: { y: 0, cx: 162 }, south: { y: 223, cx: 158 } } as const;

// ---------------------------------------------------------------------
// SINGLETONS, ORE, THE TEACHING GROUND (content.test counts).
// ---------------------------------------------------------------------
export const SINGLETONS = {
  Campfire: { x: 129, y: 144 },
  Workbench: { x: 139, y: 98 },
  ChestWood: { x: 147, y: 164 },
  Furnace: { x: 151, y: 97 },
  Anvil: { x: 152, y: 100 },
  CookPot: { x: 131, y: 128 },
  BeastPen: { x: 143, y: 73 },
  /** Ruling Kit 12: the tally stall is the ONE MarketStall. */
  MarketStall: { x: 129, y: 106 },
} as const;
export const ORE = {
  copper: [[14, 208], [25, 206]],
  tin: [[18, 212], [30, 214]],
} as const;
export const TEACHING = {
  berryBushMin: 6,
  fishingSpotMin: 3,
  targetDummyMin: 4,
  berryBushes: [[152, 120], [149, 126], [154, 131], [150, 136], [153, 141], [147, 133], [151, 146], [154, 92]],
  fibrePlants: [[148, 122], [152, 138], [146, 143]],
  fishingSpots: [[161, 20], [159, 62], [161, 128], [159, 190]],
} as const;
/** Re-pinned sums (sheep 3 -> 5: three on the Common, two in the pen). */
export const NPC_SUMS = { chicken: 5, cow: 2, sheep: 5, rat: 7, mudcrab: 5, catMin: 1 } as const;
/** The clusters people.ts writes (local centres; ruling 8 moved rat knot 3 to the breach apron). */
export const NPC_CLUSTERS: ReadonlyArray<{ npc: string; x: number; y: number; r: number; n: number; why: string }> = [
  { npc: 'chicken', x: 107.5, y: 56.5, r: 4, n: 5, why: 'the coop' },
  { npc: 'cat', x: 118.5, y: 52.5, r: 2.5, n: 1, why: 'the farm cat in the kitchen strip' },
  { npc: 'cat', x: 136.5, y: 166.5, r: 3, n: 1, why: 'the working cat on the granary meadow' },
  { npc: 'cow', x: 106.5, y: 74.5, r: 4, n: 2, why: "Brammel's cows, west of the Common" },
  { npc: 'sheep', x: 128.5, y: 74.5, r: 4, n: 3, why: "the crofters' three ewes, east of the Common" },
  { npc: 'sheep', x: 105.5, y: 87.5, r: 1, n: 2, why: 'the two in the borrowed pen' },
  { npc: 'rat', x: 147.5, y: 166.5, r: 3, n: 3, why: 'the ruin floor by the chest' },
  { npc: 'rat', x: 141.5, y: 176.5, r: 3, n: 2, why: 'the meadow' },
  { npc: 'rat', x: 142.5, y: 172.5, r: 2, n: 2, why: 'the breach apron (ruling 8)' },
  { npc: 'mudcrab', x: 174.5, y: 44.5, r: 4, n: 3, why: 'the crab bank, warm pool' },
  { npc: 'mudcrab', x: 180.5, y: 60.5, r: 3, n: 2, why: 'the crab bank, cold pool' },
];

// ---------------------------------------------------------------------
// KEEP_OUT (edge-wood exclusion; the shipped nineteen verbatim, never shrunk).
// ---------------------------------------------------------------------
export type Rect4 = readonly [number, number, number, number];
export const KEEP_OUT_BASE: ReadonlyArray<Rect4> = [
  [70, 88, 100, 140],   // the Ring and the keeper's way
  [80, 76, 112, 108],   // the cottage row
  [104, 100, 160, 128], // the green, the inn's forecourt, the works
  [92, 10, 145, 70],    // the farmstead and its fields
  [88, 60, 145, 92],    // the common pasture
  [40, 24, 100, 80],    // the orchard and its walk
  [54, 0, 66, 30],      // the hunters' trail
  [92, 20, 100, 60],    // the orchard walk
  [80, 114, 115, 200],  // the muster court, the pell yard, the lodge
  [36, 148, 90, 192],   // the long butts and the fletcher's shed
  [38, 186, 96, 220],   // the spark circle
  [0, 112, 44, 224],    // the copse and the crag
  [134, 24, 162, 96],   // the fishery and the drover yard
  [134, 112, 165, 192], // the berry banks and the granary
  [162, 20, 191, 80],   // the crab bank
  [162, 100, 191, 126], // the road gate
  [102, 112, 114, 224], // the old-road spur
  [106, 190, 140, 220], // the south meadow
  [30, 130, 42, 160],   // the copse road
];

// ---------------------------------------------------------------------
// DYES (ruling 10): never madder on any faction stand.
// ---------------------------------------------------------------------
export const DYE_FORDGATE = 3;   // weld: the Charter, the fordgate, the tally
export const DYE_WAYKEEPERS = 2; // woad: Hale's order keeps the lamps
export const DYE_CROWN = 6;      // ochre: the wards' Crown colour (already pinned)

// ---------------------------------------------------------------------
// THE CAST (post-is-the-origin; the sixteen shipped posts do not move).
// ---------------------------------------------------------------------
export interface Post {
  slug: string;
  x: number;
  y: number;
  dir: number;
  routine: string;
}
const E = 0;
const S = Math.PI / 2;
const Wd = Math.PI;
const N = -Math.PI / 2;
export const POSTS = {
  keeper_wren: { slug: 'keeper_wren', x: 92.5, y: 110.5, dir: Wd, routine: 'wren_hours' },
  yardmaster_halla: { slug: 'yardmaster_halla', x: 93.5, y: 162.5, dir: N, routine: 'halla_rounds' },
  fletcher_rill: { slug: 'fletcher_rill', x: 48.5, y: 160.5, dir: E, routine: 'rill_hours' },
  sparkwright_varn: { slug: 'sparkwright_varn', x: 74.5, y: 198.5, dir: S, routine: 'varn_hours' },
  forester_alder: { slug: 'forester_alder', x: 33.5, y: 159.5, dir: Wd, routine: 'alder_hours' },
  cook_berrit: { slug: 'cook_berrit', x: 131.5, y: 129.5, dir: N, routine: 'berrit_hours' },
  wright_ottery: { slug: 'wright_ottery', x: 139.5, y: 99.5, dir: N, routine: 'ottery_hours' },
  innkeep_gilly: { slug: 'innkeep_gilly', x: 116.5, y: 88.5, dir: S, routine: 'gilly_hours' },
  angler_weir: { slug: 'angler_weir', x: 156.5, y: 46.5, dir: S, routine: 'weir_hours' },
  farmer_brammel: { slug: 'farmer_brammel', x: 112.5, y: 26.5, dir: S, routine: 'brammel_hours' },
  drover_sorrel: { slug: 'drover_sorrel', x: 144.5, y: 74.5, dir: Wd, routine: 'sorrel_hours' },
  twin_tansy: { slug: 'twin_tansy', x: 118.5, y: 111.5, dir: E, routine: 'tansy_scamp' },
  twin_wick: { slug: 'twin_wick', x: 128.5, y: 115.5, dir: Wd, routine: 'wick_scamp' },
  dawnmead_ward_day: { slug: 'dawnmead_ward', x: 151.5, y: 112.5, dir: E, routine: 'dawn_ward_day' },
  dawnmead_ward_night: { slug: 'dawnmead_ward', x: 122.5, y: 114.5, dir: S, routine: 'dawn_ward_night' },
  dawnmead_ward_dusk: { slug: 'dawnmead_ward', x: 134.5, y: 154.5, dir: S, routine: 'dawn_ward_dusk' },
  // The seven new bodies (brief §5; people.ts places them last).
  dawnmead_ward_muster: { slug: 'dawnmead_ward', x: 98.5, y: 120.5, dir: S, routine: 'dawn_ward_muster' },
  charter_margit: { slug: 'charter_margit', x: 129.5, y: 107.5, dir: S, routine: 'margit_hours' },
  returner_hilde: { slug: 'returner_hilde', x: 83.5, y: 91.5, dir: S, routine: 'hilde_hours' },
  fenside_crofter_row: { slug: 'fenside_crofter', x: 166.5, y: 107.5, dir: S, routine: 'crofter_row' },
  fenside_crofter_pen: { slug: 'fenside_crofter', x: 105.5, y: 91.5, dir: N, routine: 'crofter_pen' },
  fenside_crofter_gate: { slug: 'fenside_crofter', x: 94.5, y: 74.5, dir: E, routine: 'crofter_gate' },
  waykeeper_leif: { slug: 'waykeeper_leif', x: 186.5, y: 109.5, dir: Wd, routine: 'leif_gate' },
} as const satisfies Record<string, Post>;
export type PostKey = keyof typeof POSTS;
/** The counts content.test pins once people.ts lands. */
export const CAST_COUNTS = { actors: 23, wards: 4, routines: 23 } as const;

export interface BedPin {
  /** Head tile (north). */
  head: readonly [number, number];
  /** Foot tile: the lie target. */
  foot: readonly [number, number];
  /** A walkable cardinal stand for the foot. */
  stand: readonly [number, number];
}
/** Every body's bed (head north; foot is the lie tile). Leif has none inside the rect. */
export const BEDS = {
  keeper_wren: { head: [96, 100], foot: [96, 101], stand: [96, 102] },
  yardmaster_halla: { head: [97, 177], foot: [97, 178], stand: [98, 178] },
  fletcher_rill: { head: [47, 175], foot: [47, 176], stand: [48, 176] },
  sparkwright_varn: { head: [43, 195], foot: [43, 196], stand: [44, 196] },
  forester_alder: { head: [21, 157], foot: [21, 158], stand: [22, 158] },
  cook_berrit: { head: [113, 127], foot: [113, 128], stand: [114, 128] },
  wright_ottery: { head: [139, 91], foot: [139, 92], stand: [139, 93] },
  innkeep_gilly: { head: [113, 99], foot: [113, 100], stand: [113, 101] },
  angler_weir: { head: [141, 33], foot: [141, 34], stand: [141, 35] },
  farmer_brammel: { head: [101, 35], foot: [101, 36], stand: [102, 36] },
  drover_sorrel: { head: [112, 35], foot: [112, 36], stand: [113, 36] },
  twin_tansy: { head: [104, 35], foot: [104, 36], stand: [105, 36] },
  twin_wick: { head: [107, 35], foot: [107, 36], stand: [108, 36] },
  dawnmead_ward_day: { head: [106, 180], foot: [106, 181], stand: [105, 181] },   // THE HOT BUNK
  dawnmead_ward_night: { head: [100, 177], foot: [100, 178], stand: [101, 178] },
  dawnmead_ward_dusk: { head: [103, 177], foot: [103, 178], stand: [102, 178] },
  dawnmead_ward_muster: { head: [104, 184], foot: [104, 185], stand: [103, 185] }, // THE FIFTH BUNK
  charter_margit: { head: [83, 84], foot: [83, 85], stand: [83, 86] },              // Hilde's second bed (ruling 5)
  returner_hilde: { head: [80, 84], foot: [80, 85], stand: [80, 86] },
  fenside_crofter_row: { head: [97, 86], foot: [97, 87], stand: [97, 88] },        // the crowded roof
  fenside_crofter_pen: { head: [99, 86], foot: [99, 87], stand: [99, 88] },
  fenside_crofter_gate: { head: [95, 86], foot: [95, 87], stand: [95, 88] },
} as const satisfies Record<string, BedPin>;
/** The four claimable guest beds in the inn's wing (the waker's; Steinar is not this band's). */
export const GUEST_BEDS: ReadonlyArray<BedPin> = [
  { head: [125, 88], foot: [125, 89], stand: [126, 89] },
  { head: [128, 88], foot: [128, 89], stand: [127, 89] },
  { head: [125, 92], foot: [125, 93], stand: [126, 93] },
  { head: [128, 92], foot: [128, 93], stand: [127, 93] },
];

/**
 * Routine stops that pin ground OUTSIDE a post's own yard (pins.md §6):
 * every one stays open ground (or a door) in the rebuild.
 */
export const OPEN_STOPS: ReadonlyArray<readonly [number, number]> = [
  [107, 46], [107, 45],                       // the farm door and hall floor
  [120, 66], [120, 47], [120, 74], [120, 106], // the Common's north gate and the homestead way
  [147, 69], [147, 60], [147, 78], [147, 84], [142, 84], // the drover yard's gaps and the trough stand
  [102, 176], [102, 177], [102, 175],         // the lodge door, floor, apron
  [107, 121], [107, 156], [107, 162], [107, 174], // the spur
  [106, 112], [137, 112], [151, 112], [107, 120], // the lane and the proving way's mouth
  [52, 168], [52, 174],                       // Rill's home gate and shed door
  [60, 199], [53, 199],                       // Varn's way and door
  [29, 160], [27, 160],                       // Alder's door
  [152, 45], [151, 42], [150, 36], [149, 36], // Weir's night path and door
  [122, 131], [119, 131], [118, 131],         // Berrit's door
  [142, 97], [142, 96], [142, 95],            // Ottery's door
  [118, 90], [113, 98], [113, 101],           // Gilly's bar aisle
  [93, 108], [93, 109], [91, 110], [92, 111], // Wren's door, porch, lane
  [88, 157], [98, 157], [93, 171], [93, 172], // Halla's pell line and yard exit
  [112, 32], [97, 74], [96, 74],              // Brammel's field gate and his added Common stand
  [102, 140], [102, 141], [103, 141], [104, 141], // Halla's knoll stand and the three stairs
  [91, 151], [92, 151], [91, 143], [103, 143], [103, 142], // her path to the knoll
];

// ---------------------------------------------------------------------
// AWNING HOST PAIRS (the tile north of every awning is a wall).
// ---------------------------------------------------------------------
export const AWNING_HOSTS: ReadonlyArray<{ x: number; y: number; shape: 'shed' | 'board' | 'bowed'; dye: number; scene: string }> = [
  { x: 142, y: 41, shape: 'shed', dye: 7, scene: "Weir's south wall" },
  { x: 143, y: 41, shape: 'shed', dye: 7, scene: "Weir's south wall" },
  { x: 124, y: 47, shape: 'board', dye: 6, scene: 'the barn front' },
  { x: 125, y: 47, shape: 'board', dye: 6, scene: 'the barn front' },
  { x: 133, y: 47, shape: 'board', dye: 6, scene: 'the barn front' },
  { x: 134, y: 47, shape: 'board', dye: 6, scene: 'the barn front' },
  { x: 144, y: 67, shape: 'board', dye: 2, scene: 'the tack lean-to' },
  { x: 145, y: 67, shape: 'board', dye: 2, scene: 'the tack lean-to' },
  { x: 146, y: 67, shape: 'board', dye: 2, scene: 'the tack lean-to' },
  { x: 146, y: 97, shape: 'board', dye: 6, scene: "Ottery's room" },
  { x: 147, y: 97, shape: 'board', dye: 6, scene: "Ottery's room" },
  { x: 152, y: 97, shape: 'shed', dye: 1, scene: 'the forge wall' },
  { x: 154, y: 97, shape: 'shed', dye: 1, scene: 'the forge wall' },
  { x: 118, y: 103, shape: 'shed', dye: 3, scene: 'the inn frontage' },
  { x: 119, y: 103, shape: 'shed', dye: 3, scene: 'the inn frontage' },
  { x: 122, y: 103, shape: 'shed', dye: 3, scene: 'the inn frontage' },
  { x: 123, y: 103, shape: 'shed', dye: 3, scene: 'the inn frontage' },
  { x: 30, y: 152, shape: 'board', dye: 6, scene: 'the log yard stub' },
  { x: 45, y: 157, shape: 'bowed', dye: 4, scene: 'the butts shelter' },
  { x: 44, y: 159, shape: 'bowed', dye: 4, scene: 'the butts shelter' },
  // FIX PASS 1 (defect 3): the chart stepped four rows south, y118 -> y122.
  { x: 103, y: 122, shape: 'board', dye: 7, scene: "Halla's chart (charcoal, a tarred board)" },
  { x: 104, y: 122, shape: 'board', dye: 7, scene: "Halla's chart" },
  { x: 105, y: 122, shape: 'board', dye: 7, scene: "Halla's chart" },
];

// ---------------------------------------------------------------------
// THE SIGN LEDGER (brief §7.2, strings FINAL; no dashes; title <= 26,
// line <= 34, <= 4 lines). Lanes queue these through ctx.sign; the
// pair law (one Signpost per eyeful) is measured by lint.ts.
//
// FIX PASS 1 (proof pass 1+2 defect 2): the eyeful is 48x45 tiles at
// the shipped camera (yScale 0.6, zoom 1), not the brief's 48x27, so
// the pair law is |dx| <= 24 AND |dy| <= 22 and eight pairs that were
// clean under 13 rows shared a frame. Re-measured clean under 22:
//   CUT  THE COOP (108,63), THE STALLS (149,89), THE LONG TABLE (120,138):
//        the rails and the hens, Sorrel's rails, the hall and the pot
//        speak for themselves; their lines are the dialogue band's barks.
//   MOVED THE ORCHARD (98,45) -> (90,28) two rows north of the hedge's
//        north run by the trail; THE MUSTER LINE (99,124) -> (95,124)
//        (25 cols from DAWNMEAD); THE OLD ROAD (110,168) -> (112,171)
//        (23 rows from THE PELL YARD); THE OLD GRANARY (136,152) ->
//        (137,152) (25 cols from THE OLD ROAD).
// Every remaining pair: nearest other Signpost is > 24 cols OR > 22 rows.
// ---------------------------------------------------------------------
export interface SignPin {
  x: number;
  y: number;
  tile: Tile;
  title: string;
  lines: readonly string[];
  lane: string;
}
const post = (x: number, y: number, title: string, lines: readonly string[], lane: string): SignPin =>
  ({ x, y, tile: Tile.Signpost, title, lines, lane });
const shingle = (x: number, y: number, title: string, lines: readonly string[], lane: string): SignPin =>
  ({ x, y, tile: Tile.HangingSign, title, lines, lane });
export const SIGN_LEDGER = {
  hobbs_cousins_roof: post(53, 109, "HOBB'S COUSIN'S ROOF", ['Went up in the spring.', 'Nobody agrees how.'], 'ring'),
  keepers_house: shingle(100, 110, "THE KEEPER'S HOUSE", ['Wren keeps the Ring.', 'Knock, or wait on the step.'], 'keepers'),
  dawnmead: post(120, 110, 'DAWNMEAD', [
    'The village that raises wakers.',
    'Carts turned, fen waist: four.',
    'Lamps out past the gate: two.',
    'Signed for the Charter.',
  ], 'green'),
  five_stones: shingle(116, 104, 'THE FIVE STONES', ['Beds for wakers.', 'Claim one. Come back to it.'], 'inn'),
  brammels_field: post(117, 30, "BRAMMEL'S FIELD", ['Six beds, three crops,', 'one man who wants rain.'], 'farmstead'),
  common: post(95, 79, 'THE COMMON', ['Cows west, sheep east,', 'and the gate stays open.'], 'common'),
  orchard: post(90, 28, 'THE ORCHARD', ["Windfalls are anybody's.", 'Shake nothing. Ask Alder.'], 'orchard'),
  hunters_trail: post(62, 28, "HUNTERS' TRAIL", ['No lamps this way.', 'Wolves den in the north wood.'], 'orchard'),
  weirs_reach: post(140, 55, "WEIR'S REACH", ['Rod, line and patience.', 'Mostly patience.'], 'waterside'),
  otterys_works: post(148, 109, "OTTERY'S WORKS", ['Bench, saw, forge.', 'Make your first thing.'], 'works'),
  muster_line: post(95, 124, 'THE MUSTER LINE', [
    'Bridge by day, green by night.',
    'The line, seven to seven.',
    'Fires this spring: one.',
    'That is one too many.',
  ], 'muster'),
  long_butts: post(69, 148, 'THE LONG BUTTS', ['Loose only EAST.', 'Walk the lane, never the line.'], 'butts'),
  pell_yard: post(94, 148, 'THE PELL YARD', ['Wood first, then steel.', 'Again. Better.'], 'pell'),
  lodge: shingle(94, 175, 'THE LODGE', ['Halla and the wards.', 'Knock loud; they sleep in shifts.'], 'pell'),
  rills_shed: shingle(59, 173, "RILL'S SHED", ['Staves, feathers, glue.', 'Ask before you take a bow.'], 'butts'),
  spark_circle: post(78, 194, 'THE SPARK CIRCLE', ['Stand outside the stones', 'until Varn says otherwise.'], 'spark'),
  varns_door: shingle(56, 202, "VARN'S DOOR", ['Old Varn, Sparkwright.', 'He was saying something.'], 'spark'),
  old_road: post(112, 171, 'THE OLD ROAD', ['Kingsdelf, forty stones and one.', 'Dark past the third.', 'Ask at the Stone.'], 'oldRoad'),
  copse: post(38, 152, 'THE COPSE', ['Take the marked ones.', 'A stand outlives its keeper.'], 'copse'),
  scrap_crag: post(22, 204, 'THE SCRAP CRAG', ['Copper and tin, honest seams.', "Ottery's furnace is hungry."], 'copse'),
  old_granary: post(137, 152, 'THE OLD GRANARY', ['Rats took the roof', 'year before last.', 'Back early this year.'], 'granary'),
  crab_bank: post(176, 70, 'THE CRAB BANK', ['Mudcrabs sun on the sand.', 'They pinch. Pinch first.'], 'waterside'),
  first_road: post(182, 116, 'THE FIRST ROAD', ['Amberford, a day east.', 'Lamps to the fen waist.', 'Then ask Hale.'], 'gate'),
} as const satisfies Record<string, SignPin>;
export type SignKey = keyof typeof SIGN_LEDGER;

// ---------------------------------------------------------------------
// THE RING BOX GOLDEN — ground and detail of (64,100)-(93,124), 750
// cells each, row-major from (64,100), dumped ONCE from the shipped
// build (main 59b67011, dawnmead.ts at 1327 lines). index.ts stamps it
// after scatter and again after the edge woods; lint.ringBoxDiff proves
// the built box equals it cell for cell. NEVER regenerate by hand.
// ---------------------------------------------------------------------
const GOLDEN_GROUND: readonly number[] = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 342, 1, 11, 9, 9, 9, 9, 9,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 342, 1, 11, 84, 9, 9, 9, 84,
  1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 342, 461, 60, 9, 9, 9, 83, 83,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 342, 1, 11, 9, 9, 9, 84, 9,
  1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 342, 1, 11, 90, 9, 9, 9, 9,
  1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 342, 1, 11, 9, 9, 9, 9, 9,
  1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 342, 1, 11, 85, 9, 9, 9, 9,
  2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 1, 1, 1, 1, 342, 287, 11, 9, 9, 9, 9, 9,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 64, 8, 8, 8, 8, 8, 1, 1, 1, 1, 11, 11, 60, 11, 11, 62,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 64, 8, 8, 1, 1, 1, 39, 94, 156, 84, 155, 155,
  1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 64, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 2, 1, 1, 1, 1, 1, 1, 3,
  1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 1, 4, 4, 4, 4, 4, 4,
  1, 1, 1, 1, 1, 1, 1, 1, 64, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 4, 4, 4,
  1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 64, 4, 4, 4, 4, 4, 4, 4, 4,
  1, 2, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 1, 1, 1, 1, 2, 1, 1,
  1, 1, 1, 1, 1, 1, 2, 1, 8, 8, 64, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 1, 39, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 2, 1, 8, 8, 8, 8, 8, 8, 8, 8, 64, 8, 8, 8, 1, 1, 1, 2, 1, 1, 1, 1, 1,
  1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 39, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 13, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 1, 1, 1, 1, 1, 2, 1, 1, 1, 3, 3, 3,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 3, 3, 3, 393,
  12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 96, 3, 3, 3,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3,
  2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 3, 3, 3, 3, 3, 479, 3,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3, 85, 3, 3, 3, 3, 3, 3,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 85, 3, 3, 3, 3, 3, 3,
];
const GOLDEN_DETAIL: readonly number[] = [
  0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 112, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5,
  0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 1, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7,
  0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0,
  0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 1, 0, 2,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
  2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

export const RING_BOX_GOLDEN: { readonly ground: Uint16Array; readonly detail: Uint16Array } = {
  ground: Uint16Array.from(GOLDEN_GROUND),
  detail: Uint16Array.from(GOLDEN_DETAIL),
};

/** The whole ledger as one frozen object (ctx.pins). */
export const PINS = {
  RECT, ORIGIN, WIDTH, HEIGHT, ANCHOR, SPAWN, WELL,
  STONES, FALLEN_ROCKS, RING_PAD, RING_LAMPS, RING_BOX,
  LANE_ROWS, ROUTE_HEADS, LANE_BAND, BRIDGE, FORD, PIER, BROOK,
  SINGLETONS, ORE, TEACHING, NPC_SUMS, NPC_CLUSTERS,
  KEEP_OUT_BASE,
  DYE_FORDGATE, DYE_WAYKEEPERS, DYE_CROWN,
  POSTS, CAST_COUNTS, BEDS, GUEST_BEDS, OPEN_STOPS, AWNING_HOSTS,
  SIGN_LEDGER,
  RING_BOX_GOLDEN,
} as const;
export type Pins = typeof PINS;
