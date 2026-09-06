/**
 * THE ASHLAMP (contested lands, band 7) — THE SACRED PINS.
 *
 * Every coordinate the brief nails to the ground for the scar at the
 * lake's south tip, written once so the scene modules argue with a
 * constant instead of a memory. Coordinates are WORLD tiles (the
 * brief's own frame: the gate is (32,48), the First Road turns east
 * at (44,96)); the ctx converts to the zone's local frame exactly once.
 *
 * THE RECT (rulings R1): origin (48,92), 23 x 19, so x 48..70 and
 * y 92..110. The west edge stands 17 tiles east of Dawnmead's rect
 * (which ends at x 31) and never under x 40; the border ring is
 * TILE_SKIP by construction (lint.skipRing), so the outermost
 * authorable cells are x 49..69, y 93..109.
 *
 * THE CARVE is never typed here: the First Road's polyline is read
 * from geography (ROAD_ROUTES 'first_road') and its wandered surface
 * is asked through roadDistanceAt with the shipped seed, so the zone
 * and worldgen can never disagree about where the bed lies.
 */
import { Tile } from '@arx/shared';
import { ROAD_ROUTES } from '../../geography.js';

/** The rect, world tiles (geography.ts planned row 'ashlamp' mirrors it). */
export const RECT = { x: 48, y: 92, w: 23, h: 19 } as const;
export const ORIGIN = { x: 48, y: 92 } as const;
export const WIDTH = 23;
export const HEIGHT = 19;
/** The authorable interior (the border ring stays TILE_SKIP). */
export const AUTHORABLE = { x0: 49, y0: 93, x1: 69, y1: 109 } as const;

/** The First Road's route points, read from the plan (never typed twice). */
export const CARVE_PTS: ReadonlyArray<{ x: number; y: number }> =
  ROAD_ROUTES.find((r) => r.id === 'first_road')?.pts ?? [];

// ---------------------------------------------------------------------
// THE SHELL (§2.1): the waystation that stopped being a room.
// ---------------------------------------------------------------------
/** RuinWallStone ring x 54..60, y 93..97; three breaches N, W, E. */
export const SHELL = { x0: 54, y0: 93, x1: 60, y1: 97 } as const;
export const BREACHES: ReadonlyArray<readonly [number, number]> = [
  [57, 93], // north: the way the fire came in, or did not
  [54, 95], // west: the way the ash went out
  [60, 95], // east: the way to the stake
];
/** The floor inside the walls: Dirt under Detail.Ash (J14). */
export const FLOOR = { x0: 55, y0: 94, x1: 59, y1: 96 } as const;
/** The order's lamp, cold in its socket: LampPostDark, no light row. */
export const LAMP = [56, 94] as const;
/**
 * The one ember bed that still smokes, on the room's NORTH row (fix
 * pass 1): at (58,96) it stood in the row directly north of the south
 * wall, and from the tilted frame the wall's face hid the pan whole by
 * day (only the dusk plume rose past it). On the north row the pan
 * stands on bare dirt inside the ash floor, beside the fallen beam,
 * with two open rows between it and the wall.
 */
export const EMBER = [58, 94] as const;
/** The charred beams where the roof went. */
export const BEAMS: ReadonlyArray<readonly [number, number]> = [[59, 94], [55, 96]];
/** The ash heap shovelled out the west breach. */
export const ASH_HEAP = [53, 95] as const;
/** Brede's stake east of the east breach (R12: a plain TrophyStake). */
export const STAKE = [62, 95] as const;
/**
 * THE ASH RING: two tiles out from the walls on the flanks, rows
 * 93..97 only (row 92 is the border, rows 98..99 are the carve), so
 * the columns x 52..53 and x 61..62; ragged on the zone hash.
 */
export const ASH_RING_COLS: ReadonlyArray<number> = [52, 53, 61, 62];
export const ASH_RING_ROWS = { y0: 93, y1: 97 } as const;
/** The rim the tufts hash over: one column out from the ring. */
export const TUFT_RIM: ReadonlyArray<readonly [number, number]> = [
  [51, 93], [51, 94], [63, 93], [63, 94], [63, 95], [63, 96],
];

// ---------------------------------------------------------------------
// THE VERGE (§2.1): the stalled Charter wain and the dead tree.
// THE BLOCK-OUT MOVED THE WAIN to the east leg's NORTH shoulder, under
// the oaks at y 97: the brief's south-shoulder cells (63..65,107) lie
// six rows north of worldgen's oaks at y 110..112, and at the 0.6
// frame a canopy paints six rows north of its trunk, so the cart was
// buried whole (proof shot ashlamp-wain-noon-z20, pass 2). Those oaks
// stand outside the rect and nobody may fell them; the north shoulder
// has the road south of it and nothing tall for six rows.
// ---------------------------------------------------------------------
/** BelongingsCart with its second foot WEST (E5's FOOTPRINT map: the shafts), the goods east of it. */
export const WAIN = { cart: [67, 98], foot: [66, 98], goods: [68, 98] } as const;
/** Margit's tally board, propped by the wain, its face to the road. */
export const LECTERN = [65, 98] as const;
/** The trodden patch under the wain: an ellipse on the hash, never a ruled yard (fix pass 2). */
export const WAIN_PATCH = { cx: 66.5, cy: 98.5, rx: 3, ry: 1.2 } as const;
/** The two oaks the wain stands under, authored so no forest law can fell them (verge.ts says why). */
export const WAIN_OAKS: ReadonlyArray<readonly [number, number]> = [[65, 97], [66, 97]];
/** The one snag on the skyline, lateral to the road. */
export const DEAD_TREE = [68, 94] as const;
/**
 * THE SNAG'S CLEARING (fix pass 1): worldgen's oaks south of the snag
 * at (66..69, 95..97) and its neighbours on its own row painted their
 * crowns over it at every frame (a canopy reaches six or seven rows
 * north of its trunk), so the one silhouette between the scar and the
 * waist was buried whole. The dead tree stands in a felled pocket from
 * the ash ring's rim (x 63) to the rect's east edge (x 69 is the last
 * authorable column; the oaks at x 70 are the border's and stand); the
 * grass is the field's own. The pocket's row into the oaks' line at
 * y 97 keeps the two oaks the wain pulled in under, (65,97) and (66,97).
 */
export const DEAD_TREE_FELL = { x0: 63, y0: 93, x1: 69, y1: 96 } as const;
/**
 * The pocket's one row into the oaks' line: the wain stands UNDER the
 * oaks at y 97 (that is its sentence, and the oaks at x 63..66 keep
 * it), but the oak at (69,97) stood one column east of the snag and
 * painted its crown over it; that one and its neighbours east of the
 * cart come down, the cart's own canopy stays.
 */
export const DEAD_TREE_FELL_ROW: ReadonlyArray<{ x0: number; y0: number; x1: number; y1: number }> = [
  { x0: 63, y0: 97, x1: 64, y1: 97 },
  { x0: 67, y0: 97, x1: 69, y1: 97 },
];

// ---------------------------------------------------------------------
// THE WEAR (§2.1 G3).
// ---------------------------------------------------------------------
export const WEST_BREACH_WEAR = { cx: 53, cy: 95, rx: 1.3, ry: 1.3 } as const;
export const WEST_LINE: ReadonlyArray<readonly [number, number]> = [[52, 99], [53, 96]];
export const SIGN_LINE: ReadonlyArray<readonly [number, number]> = [[61, 101], [61, 99]];

// ---------------------------------------------------------------------
// THE SHOULDER (the carve law): every authored cell within
// ROAD_SHOULDER 4.5 of the bed must lie in one of these rects, each
// with its reason; nothing authored ever lies within ROAD_HALF 1.6.
// ---------------------------------------------------------------------
export type Rect4 = readonly [number, number, number, number];
export const SHOULDER_LISTED: ReadonlyArray<{ rect: Rect4; why: string }> = [
  { rect: [52, 93, 62, 97], why: 'the shell, its ash ring and the west breach wear stand on the north shoulder where the road turns east' },
  { rect: [61, 98, 61, 99], why: 'the board at the shoulder\'s edge, facing the bed it names' },
  { rect: [63, 97, 69, 99], why: 'the wain, the tally board and the trodden patch on the east leg\'s north shoulder, under the oaks' },
];
/** Cells within ROAD_HALF the zone may author: none at the Ashlamp. */
export const BED_EXEMPT: ReadonlyArray<readonly [number, number]> = [];

// ---------------------------------------------------------------------
// THE BOARD (J16: one Signpost per eyeful; the crofts' board is 68 east).
// ---------------------------------------------------------------------
export const SIGN_LEDGER = {
  ashlamp: { x: 61, y: 99, title: 'THE ASHLAMP.', lines: ['Struck.'], tile: Tile.Signpost },
} as const;

/** The flood's entry for the reachability lint: a bed cell inside the rect. */
export const FLOOD_FROM = [52, 99] as const;

/** The whole ledger as one frozen object (ctx.pins). */
export const PINS = {
  RECT, ORIGIN, WIDTH, HEIGHT, AUTHORABLE, CARVE_PTS,
  SHELL, BREACHES, FLOOR, LAMP, EMBER, BEAMS, ASH_HEAP, STAKE, ASH_RING_COLS, ASH_RING_ROWS, TUFT_RIM,
  WAIN, LECTERN, WAIN_PATCH, WAIN_OAKS, DEAD_TREE, DEAD_TREE_FELL, DEAD_TREE_FELL_ROW,
  WEST_BREACH_WEAR, WEST_LINE, SIGN_LINE,
  SHOULDER_LISTED, BED_EXEMPT, SIGN_LEDGER, FLOOD_FROM,
} as const;
export type Pins = typeof PINS;
