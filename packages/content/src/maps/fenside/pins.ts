/**
 * THE FEN WAIST (contested lands, band 7) — THE SACRED PINS.
 *
 * Every coordinate the brief nails to the ground around the ford,
 * written once so the scene modules argue with a constant instead of
 * a memory. Coordinates are WORLD tiles (the brief's own frame); the
 * ctx converts to the zone's local frame exactly once.
 *
 * THE RECT (rulings R2, brief 0.2 K, MEASURED; fix pass 1 widened it
 * west and south): origin (118,76), 24 x 25, so x 118..141 and
 * y 76..100. The east edge follows the crofts' pinned footprint by
 * the pad law: the 24x16 core pinned at (160,94) stands at nudge 0
 * with footprint x 148..171, y 86..101 (seed 24601), and the server's
 * scan refuses any zone rect whose east edge plus AUTHORED_ZONE_PAD 6
 * reaches x 148 (intersectsZones is strict on both edges), so
 * x1 = 141. That edge is short of x 150, which by 0.2 K puts THE
 * CAUSEWAY HEAD on the WEST bank north of the road at the ford's
 * north-west corner (plan-life's layout, §2.5 W). The WEST edge moved
 * from x 124 to x 118 so the tier-2 cairn can stand five tiles before
 * the bar's counter instead of two beside it (the proof read it as
 * bar clutter); the long dry now ends at x 118. The SOUTH edge moved
 * from y 94 to y 100 so the shoulder's treeline can be felled to the
 * bar's own clearing (worldgen's oaks at y 94..97 painted over the
 * south post, the teeth and the gap from the west at every frame);
 * the bar's scanned footprint (22x14 at (126,109): x 115..136,
 * y 102..115) stands ONE row south of the rect under THE AUTHORED HUG,
 * which the bar's site row alone declares (`hug: true`; server
 * pois.ts findAuthoredAnchor tries a hugging pin with no pad, only
 * the strict no-overlap edge, and every other pin keeps the pad, fix
 * pass 2). The border ring is TILE_SKIP by
 * construction, so the authorable interior is x 119..140, y 77..99.
 *
 * THE CROSSING as worldgen lays it at this seed: the channel runs
 * north to south at x 132..137 (widening to 139..143 south of the
 * road); the road crosses it on a BRIDGE deck at (135..139, 83..86),
 * which is the bed and stays TILE_SKIP. The mark-post and the dike's
 * far stake stand in the water either side of it.
 */
import { Tile } from '@arx/shared';
import { ROAD_ROUTES } from '../../geography.js';

export const RECT = { x: 118, y: 76, w: 24, h: 25 } as const;
export const ORIGIN = { x: 118, y: 76 } as const;
export const WIDTH = 24;
export const HEIGHT = 25;
export const AUTHORABLE = { x0: 119, y0: 77, x1: 140, y1: 99 } as const;

/** The First Road's route points, read from the plan (never typed twice). */
export const CARVE_PTS: ReadonlyArray<{ x: number; y: number }> =
  ROAD_ROUTES.find((r) => r.id === 'first_road')?.pts ?? [];

// ---------------------------------------------------------------------
// THE TIER-2 CAIRN (§2.3): the threshold marked with a cairn and nothing
// else. Fix pass 1 stood it at the rect's new west edge on the north
// shoulder, (119,89): the proof's (125,86) was two tiles from the cage
// and read as the bar's clutter; here it stands alone on open shoulder
// grass (worldgen's treeline is west and north of it, never south),
// seven tiles before the cage comes into the eyeful, 3.99 from the
// carve, listed. The tier-2 line crosses the road about x 124; the
// cairn stands within five of it, on tier-2 ground (dangerAt).
// ---------------------------------------------------------------------
export const CAIRN = [119, 89] as const;

// ---------------------------------------------------------------------
// THE BAR SCENE (§2.4): the posts, the teeth, the counter, the cage.
// At x 129 the bed is rows 87..89; the gap is (129,88) and stays the road.
// ---------------------------------------------------------------------
export const TIMBER_POSTS: ReadonlyArray<readonly [number, number]> = [[129, 87], [129, 90]];
export const TEETH: ReadonlyArray<readonly [number, number]> = [[129, 86], [129, 89], [129, 91]];
/** The warden's gap: one tile of road between the teeth, never authored. */
export const GAP = [129, 88] as const;
/** The only cells within ROAD_HALF the zone may author: the north post and the stepped tooth. */
export const BAR_GAP: ReadonlyArray<readonly [number, number]> = [[129, 87], [129, 89]];
/**
 * The counter that was a table, and the board of receipts beside it.
 * The brief's layout W put it on the south shoulder at (129,92); the
 * block-out shot showed worldgen's treeline at y 92..95 painting over
 * everything south of the bed at the true frame, so the counter stands
 * on the NORTH shoulder beside the cage, where the eye lands from the
 * bed: cage, drover, table, board in one row, the posts south-east.
 */
export const COUNTER = { table: [127, 84], board: [128, 84] } as const;
/** The cage, and the drover roped beside it facing the road. */
export const CAGE = [126, 84] as const;
export const DROVER_SEAT = [126, 85] as const;
/**
 * Brede's mark-post in the water at the ford's north lip, beside the
 * deck. Fix pass 1 moved it one column east, (136,83) to (137,83): in
 * the tilted frame a post two rows south of a stake in the same
 * column stacked into one silhouette with it (the stake at (136,81));
 * at x 137 it stands in front of a low rail, and the stake stands
 * clear beside it. Still water (the channel is x 136..137 at y 83).
 */
export const MARK_POST = [137, 83] as const;
/**
 * The Company's rag line, from the bar's shoulder to the ford's north
 * lip: the last rag stands in the shallows one tile from the
 * Charter's rail (the two claims touching, in one eyeful from the
 * deck). It left the south shoulder with the dike line (below).
 */
export const RAGS: ReadonlyArray<readonly [number, number]> = [[132, 84], [134, 83], [135, 82]];
/** G1 the trodden ground under the cage and under the counter. */
export const CAGE_WEAR = { cx: 126.5, cy: 84.5, rx: 1.9, ry: 1.6 } as const;
export const COUNTER_WEAR = { cx: 128, cy: 84.5, rx: 1.9, ry: 1.3 } as const;
/**
 * THE FELLING south of the bar (the occlusion law at the true frame):
 * the crew cut the shoulder's treeline from the post line to the water
 * for the sight line between the camp's track and the gap, and for the
 * fire. Trees only; the grass keeps its kind; the bed is never touched.
 */
export const BAR_FELL = { x0: 126, y0: 90, x1: 139, y1: 99 } as const;
/** THE FELLING at the head: the Charter cleared the bank around its canvas (the oak at (128,82) hid the pennant and the pallets). */
export const HEAD_FELL = { x0: 125, y0: 77, x1: 133, y1: 82 } as const;
/**
 * THE FELLING at the head, the south rows (fix pass 1): the oak at
 * (129,83) on the north shoulder stood between the eye and the
 * counter, and painted its crown over the pallets and the pennant
 * from the bed. The Charter cleared its approach to the road.
 */
export const HEAD_FELL_SOUTH = { x0: 126, y0: 83, x1: 131, y1: 84 } as const;
/** G2 the shoulders worn to Dirt three tiles either side of the post line. */
export const POST_LINE_SHOULDERS = { x0: 126, y0: 84, x1: 131, y1: 92 } as const;
/**
 * THE CREW'S STANDS (fix pass 1): the archer's cell on the south
 * shoulder and the picket's on the north, one west of the teeth
 * either side of the gap, worn to Dirt whatever the hash says (a body
 * that stands all day wears its patch). The bar def's `at` rows post
 * the bodies here (first_road_bar.json, prefab-local to the pin).
 */
export const CREW_STANDS: ReadonlyArray<readonly [number, number]> = [[128, 91], [128, 86]];

// ---------------------------------------------------------------------
// THE DIKE LINE (§2.5): the Charter's stakes and rails driven across
// the channel at the crossing's UPSTREAM lip, two rows above the deck,
// from the head's bank to the far bank. THE BLOCK-OUT MOVED IT: the
// brief drew it on the downstream side at y 91, and the pass-2 shots
// (ford-north-south-noon-z20) showed worldgen's treeline at y 94..97
// (the pad's ground, outside the rect, nobody's to fell) painting six
// rows north at the 0.6 frame, over everything south of the bed; on
// the upstream lip nothing tall stands between the line and the eye,
// the whole crossing fits the rect, and the line now REACHES the far
// bank instead of stopping at its first wet stake. The brief's east
// end (146,89) was outside the measured rect either way.
// ---------------------------------------------------------------------
export const DIKE_LINE: ReadonlyArray<readonly [number, number]> = [[133, 81], [139, 81]];
export const STAKES: ReadonlyArray<readonly [number, number]> = [[133, 81], [136, 81], [139, 81]];
export const FENCES: ReadonlyArray<readonly [number, number]> = [[134, 81], [135, 81], [137, 81], [138, 81]];
/**
 * Ingram's stands for his morning walk (L2 reads these): the line's
 * west end from the bank's grass, and its middle from the shallows
 * south of the far rail (WaterShallow is walkable; the channel's deep
 * water is not). Neither cell is authored: the field's own ground.
 */
export const LINE_END_STAND = [133, 82] as const;
export const LINE_MIDDLE_STAND = [138, 82] as const;

// ---------------------------------------------------------------------
// THE CAUSEWAY HEAD, layout W (§2.5): the west bank north of the road
// at the ford's north-west corner. The bank here is forest to x 131
// with the channel's swamp rim at x 132..133; every cell below is dry
// ground or the rim, none in the water.
// ---------------------------------------------------------------------
export const HEAD_COUNTER = [131, 80] as const;
/** The canvas north of the counter; its skirt reaches WEST (E5's FOOTPRINT map) and (130,78) stays open. */
export const HEAD_LEANTO = [131, 78] as const;
export const HEAD_LEANTO_FOOT = [130, 78] as const;
export const HEAD_FLOOR: ReadonlyArray<readonly [number, number]> = [[129, 80], [130, 80], [129, 81], [130, 81]];
export const HEAD_LANTERNS: ReadonlyArray<readonly [number, number]> = [[129, 82], [133, 80]];
export const HEAD_BANNER = [128, 79] as const;
export const HEAD_CRATE = [128, 81] as const;
export const HEAD_BARRELS = [132, 80] as const;
/** The levy's coin box west of the canvas's skirt on the apron, under the spoil, warded by the bar (0.2 G). */
export const HEAD_CHEST = [129, 78] as const;
export const HEAD_SPOIL: ReadonlyArray<readonly [number, number]> = [[129, 77], [130, 77]];
/**
 * THE CARTER'S STAND (band 9e): the one cell of the swamp rim east of
 * the canvas trodden to Dirt under Garrow's boots, where the spoil
 * bank meets the water. His sit one south (garrow_yard) stays the
 * rim's own swamp. The routine sweep (worldFit) measures a body from
 * an authored stand; nothing else moves for him.
 */
export const GARROW_STAND = [132, 78] as const;
/** The clerk's stand behind the counter and the road's cell before it: both kept open. */
export const HEAD_STAND = [131, 79] as const;
export const HEAD_CUSTOMER = [131, 81] as const;
export const HEAD_MOUTH = [131, 82] as const;
export const HEAD_APRON = { cx: 129.8, cy: 79.6, rx: 2.6, ry: 2.9 } as const;
export const HEAD_APPROACH: ReadonlyArray<readonly [number, number]> = [[131, 83], [131, 81]];

// ---------------------------------------------------------------------
// THE SHOULDER (the carve law): every authored cell within ROAD_SHOULDER
// lies in one of these rects, each with its reason; nothing authored
// lies within ROAD_HALF but BAR_GAP.
// ---------------------------------------------------------------------
export type Rect4 = readonly [number, number, number, number];
export const SHOULDER_LISTED: ReadonlyArray<{ rect: Rect4; why: string }> = [
  { rect: [119, 89, 119, 89], why: 'the tier-2 cairn on the north shoulder at the rect\'s west edge, alone' },
  { rect: [125, 83, 131, 99], why: 'the bar scene: the cage and the drover, the counter beside them, the posts and the teeth on both shoulders, the shoulders worn at the post line, the head\'s approach felled, and the treeline felled south of the bar to the crew\'s own clearing' },
  { rect: [132, 88, 140, 99], why: 'the rag line and the dike line on the south shoulder below the crossing, and the felled treeline behind them to the crew\'s clearing' },
  { rect: [132, 81, 140, 84], why: 'the ford\'s north lip: the dike line across the channel, the Company\'s rags to the water and the mark-post' },
  { rect: [128, 82, 133, 83], why: 'the head\'s approach from the north shoulder and its south lantern' },
];
export const BED_EXEMPT: ReadonlyArray<readonly [number, number]> = BAR_GAP;

// ---------------------------------------------------------------------
// DYES (J10, fixed for good): the Charter wears weld, the Crown ochre,
// nobody madder. The head's pennant is the Charter's.
// ---------------------------------------------------------------------
export const DYE_FORDGATE = 3; // weld: the Charter, the fordgate, the levy

// ---------------------------------------------------------------------
// THE CAST (post-is-the-origin): the one zone body.
// ---------------------------------------------------------------------
const S = Math.PI / 2;
const W = Math.PI;
export interface Post {
  slug: string;
  x: number;
  y: number;
  dir: number;
  routine: string;
}
export const POSTS = {
  // Ansel the drover, let out to sit beside the cage where the road
  // can see him, facing south to the bed; `drover_held` (L2) is the
  // all-day wayside sit with a morning walk to nowhere.
  charter_drover: { slug: 'charter_drover', x: 126.5, y: 85.5, dir: S, routine: 'drover_held' },
  // GARROW THE CARTER BOSS (band 9e, plan §11.6, brief §5.6): the
  // Charter's stone yard is the spoil bank at the causeway head, and
  // its boss stands on the swamp rim east of the canvas at (132,78),
  // the cell the brief's chest gave up to the water, facing WEST at
  // the counter and never at the bank ("He does not look at the
  // bank"). No cell moves for him: the rim is worldgen's own swamp,
  // walkable, trodden to Dirt at his stand alone (GARROW_STAND) so
  // the routine sweep has a cell to measure him from; the barrels two
  // south are no tall prop (the occlusion lint's set) and the lean-to
  // is west. His
  // day is `garrow_yard` (9e's L3): the post all day, a wayside sit
  // one south on the same rim 21:30-05:00 (the bank he will not look
  // at, at his back), a one-tile wander at first light.
  charter_garrow: { slug: 'charter_garrow', x: 132.5, y: 78.5, dir: W, routine: 'garrow_yard' },
} as const satisfies Record<string, Post>;

/** THE ZONE'S WARDED CHEST (0.2 G): the levy's coin box, the bar's ward, the camp's table. */
export const CHEST_BINDING = { table: 'chest_pit_takings', wardedBy: 'first_road_toll' } as const;

/** No board here: THE ASHLAMP is 68 tiles west, the crofts' board 30 east. */
export const SIGN_LEDGER = {} as const;

/** The flood's entry for the reachability lint: a bed cell inside the rect, west of the bar. */
export const FLOOD_FROM = [126, 88] as const;

export const PINS = {
  RECT, ORIGIN, WIDTH, HEIGHT, AUTHORABLE, CARVE_PTS,
  CAIRN,
  TIMBER_POSTS, TEETH, GAP, BAR_GAP, COUNTER, CAGE, DROVER_SEAT, MARK_POST, RAGS,
  CAGE_WEAR, COUNTER_WEAR, POST_LINE_SHOULDERS, CREW_STANDS, BAR_FELL, HEAD_FELL, HEAD_FELL_SOUTH,
  DIKE_LINE, STAKES, FENCES, LINE_END_STAND, LINE_MIDDLE_STAND,
  HEAD_COUNTER, HEAD_LEANTO, HEAD_LEANTO_FOOT, HEAD_FLOOR, HEAD_LANTERNS, HEAD_BANNER, HEAD_CRATE,
  HEAD_BARRELS, HEAD_CHEST, HEAD_SPOIL, GARROW_STAND, HEAD_STAND, HEAD_CUSTOMER, HEAD_MOUTH, HEAD_APRON, HEAD_APPROACH,
  SHOULDER_LISTED, BED_EXEMPT, DYE_FORDGATE, POSTS, CHEST_BINDING, SIGN_LEDGER, FLOOD_FROM,
} as const;
export type Pins = typeof PINS;
export { Tile };
