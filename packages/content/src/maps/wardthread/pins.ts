/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — THE SACRED PINS.
 *
 * Every coordinate the brief nails to the north's ground, written
 * once so the scene modules argue with a constant instead of a
 * memory. Coordinates are WORLD tiles at seed 24601 (the brief's own
 * frame, band8/blockout.md §1-§2); the ctx converts to each zone's
 * local frame exactly once. ONE MODULE, THREE ZONES (brief 0.2 V):
 * `wardthread` (the dying stand's thread and Bodil's cut, north of
 * the High Road at the fork), `picket` (Torsten's slate on the
 * hunters' trail's east shoulder) and `turnoff` (the cairn that fell
 * where the order's path to its first tower left the road). None is
 * a core; each is TILE_SKIP everywhere it does not author.
 *
 * THE TAPE (band8/l1/tape.txt, trees.txt, trees2.txt): every cell
 * below was measured against the WANDERED carve (roadHitAt at the
 * shipped seed, never the polyline's letter), worldgen's actual
 * trunks (TREE_TILES on the generated chunk, not the canopy class)
 * and the tier ring (192 from the settled anchor (-64,48)). Where
 * the brief's letter and the tape disagreed, the tape won and the
 * reason stands beside the constant: the rag, the bench, two rect
 * growths and every fell pocket are the tape's.
 */
import { Tile } from '@arx/shared';
import { ROAD_ROUTES } from '../../geography.js';

export type Pt = readonly [number, number];
export type Rect4 = readonly [number, number, number, number];
export interface Box4 {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A zone's frame: its rect, its authorable interior (the border ring excluded) and its bed law. */
export interface Frame {
  id: 'wardthread' | 'picket' | 'turnoff';
  name: string;
  RECT: { x: number; y: number; w: number; h: number };
  ORIGIN: { x: number; y: number };
  WIDTH: number;
  HEIGHT: number;
  AUTHORABLE: { x0: number; y0: number; x1: number; y1: number };
}

const frame = (
  id: Frame['id'],
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
): Frame => ({
  id,
  name,
  RECT: { x, y, w, h },
  ORIGIN: { x, y },
  WIDTH: w,
  HEIGHT: h,
  AUTHORABLE: { x0: x + 1, y0: y + 1, x1: x + w - 2, y1: y + h - 2 },
});

// ---------------------------------------------------------------------
// THE THREE RECTS.
//
// WARDTHREAD (brief §2.6 drew x -164..-133, y -203..-181; GROWN by the
// tape): origin (-164,-203), 37 x 25, so x -164..-128 and y -203..-179.
// The growth is the occlusion law at the true frame: worldgen's
// trunks south of the thread's south leg at (-145,-183), (-142,-183),
// (-140,-183), (-137,-182), (-135,-181) and east of the head stone at
// (-132,-181), (-134,-184), (-133,-186), (-130,-185), (-129,-183)
// paint their crowns seven rows north, over the head stone and the
// thread that is the whole picture from the junction. A border ring
// is TILE_SKIP by law and cannot be felled, so the rect grew SOUTH to
// the road's own shoulder (y -179; the bed at x -164..-160 runs y
// -181..-178 and stays the field's) and EAST to x -128 (the tarn's
// rim), and the fell pockets below reach the trunks. THE PAD LAW
// holds at the PIN, which is where the scan's first probe asks it:
// the fork rest's row pins (-146,-168), whose 22x8 footprint is
// x -157..-136, y -172..-165, and AUTHORED_ZONE_PAD 6 above it ends
// at y -178, one row short of the rect's bottom (a 26th row was tried
// and refused by lint.padClear); at the booted anchor (-150,-165) the
// footprint (x -161..-140, y -169..-162) stands ten rows off. No pin
// says `hug`.
//
// PICKET (brief §2.3 drew 24 x 24; GROWN south by two rows): origin
// (-131,-140), 24 x 26, so x -131..-108 and y -140..-115. Worldgen's
// trunks at (-118,-122), (-116,-119), (-114,-117) and (-116,-115)
// stand on the wood's east edge south of the slate and the bench and
// paint over them; the rect's south border moved to y -115 so the
// pocket could fell the first three, and the fourth stands on the
// border where its crown stops one row short of the bench (the bench
// itself moved one row north for that margin, below). The trail's
// bed and its border ring stay TILE_SKIP.
//
// TURNOFF (brief §2.8, as drawn): origin (-80,-182), 14 x 16, so
// x -80..-67 and y -182..-167. Open grass; no trunk stands in it.
// ---------------------------------------------------------------------
export const WARDTHREAD = frame('wardthread', 'The Ward Line', -164, -203, 37, 25);
export const PICKET = frame('picket', 'The Picket', -131, -140, 24, 26);
export const TURNOFF = frame('turnoff', 'The Turn', -80, -182, 14, 16);

/** The two carves, READ from the plan (never typed twice): the trail for the picket, the road for the rest. */
export const TRAIL_PTS: ReadonlyArray<{ x: number; y: number }> =
  ROAD_ROUTES.find((r) => r.id === 'hunters_trail')?.pts ?? [];
export const HIGH_ROAD_PTS: ReadonlyArray<{ x: number; y: number }> =
  ROAD_ROUTES.find((r) => r.id === 'high_road')?.pts ?? [];

// =====================================================================
// THE WARD LINE (§2.6)
// =====================================================================

/**
 * THE LINE as an ORTHOGONAL polyline: the south leg along y -184 from
 * the head stone's east neighbour west to the corner, then the west
 * leg up x -150 to where the wood gives out. 28 tiles; the ctx brush
 * `thread` refuses a diagonal step (lint.oneLine pins two ends).
 */
export const LINE_PTS: ReadonlyArray<Pt> = [[-136, -184], [-150, -184], [-150, -197]];
export const LINE_TILES = 28;

/**
 * THE THREE GREY POINTS with their dead rings (three DeadTree within
 * two of each stone: lint.snagRing). Measured: the head stone is
 * 7.62 from the wandered carve and 24.2 from the haven's centre; the
 * corner stone 5.48 and 19.0; the end stone stands five rows into
 * the glade (the west leg's column reads core wood to y -190, fringe
 * to -192, damp glade from -193), which is "where the wood gives out"
 * on this column. Nothing stands inside the haven's 18 (the nearest
 * thread tile, (-149,-184), is 19.0: lint.stonesOutsideHaven).
 */
export const STONES: ReadonlyArray<{ id: 'head' | 'corner' | 'end'; at: Pt; ring: ReadonlyArray<Pt>; why: string }> = [
  {
    id: 'head',
    at: [-135, -184],
    ring: [[-136, -186], [-134, -186], [-135, -182]],
    why: 'by the road: the one you see from the junction before anyone explains it',
  },
  {
    // The brief's third dead stood at (-154,-184), three west of the
    // stone and outside its own ring law (lint.snagRing: within two);
    // it stands at (-153,-184), two west, and the ring closes.
    id: 'corner',
    at: [-151, -184],
    ring: [[-152, -186], [-153, -184], [-149, -186]],
    why: 'at the turn, one west of the corner tile',
  },
  {
    id: 'end',
    at: [-150, -198],
    ring: [[-152, -199], [-148, -200], [-151, -196]],
    why: 'where the wood gives out',
  },
];
/** THE ROOT, two tiles past the end stone in open glade. No row, no sign, no line. */
export const ROOT: Pt = [-150, -200];

/**
 * THE STONES' CLEARINGS (the trunk law, the tape): worldgen stood a
 * living trunk one tile east of the head stone at (-134,-184), one
 * south-west at (-137,-182), and beside the corner at (-152,-184) and
 * (-150,-183); a grey point with a living tree on its shoulder is not
 * a grey point. Within two of each stone nothing living stands: the
 * ring's dead are what stood there. Trees only fall; the grass keeps
 * its kind; the bed and the border are refused.
 */
export const STONE_CLEARINGS: ReadonlyArray<Box4> = STONES.map((s) => ({
  x0: s.at[0] - 2,
  y0: s.at[1] - 2,
  x1: s.at[0] + 2,
  y1: s.at[1] + 2,
}));

/**
 * THE REST'S FIREWOOD (the trunk law, the tape): the keeper cuts the
 * rest's fire from the verge across the road, between the road's
 * shoulder and the Court's thread, and stops at the thread like
 * everyone. Nothing tall stands between the junction and the head
 * stone, which is why the stone is the first thing seen from the
 * road and why the south leg reads as ONE line from it. Trunks
 * felled here at this seed: (-145,-183), (-142,-183), (-140,-183),
 * (-137,-182), (-135,-181), (-132,-181), (-129,-183). Trees only.
 */
export const FIREWOOD_FELL: Box4 = { x0: -146, y0: -183, x1: -129, y1: -180 };

// =====================================================================
// THE LICENSED CUT (§2.7): Bodil's lot x -160..-151, y -194..-185.
// =====================================================================

/** THE LOT POST at the yard's road-side corner: ochre stake, brass plate, lot forty one. */
export const LOT_POST: Pt = [-158, -186];
/** THE ROPE, on rails along the road side. A knucklebone is spoken of; never drawn (R12). */
export const ROPE: ReadonlyArray<Pt> = [[-157, -186], [-156, -186], [-155, -186], [-154, -186]];
/** THE CUT FACE: cut to the thread, one tile from it. */
export const FACE_STUMPS: ReadonlyArray<Pt> = [[-152, -187], [-151, -189], [-152, -191], [-151, -193]];
/** PAST THE THREAD: two cut past it and dragged back across it. */
export const PAST_STUMPS: ReadonlyArray<Pt> = [[-148, -188], [-147, -191]];
/** The drag furrows, crossing the thread tiles at (-150,-188) and (-150,-191); the thread stays whole. */
export const FURROWS: ReadonlyArray<Pt> = [[-149, -188], [-150, -188], [-151, -188], [-149, -191], [-150, -191]];
export const SAWHORSE: Pt = [-153, -189];
export const TRUNKS: ReadonlyArray<Pt> = [[-153, -191], [-152, -193]];
export const RACK: Pt = [-156, -187];
/**
 * THE CAMP. The canvas's second foot is WEST (E5's FOOTPRINT map:
 * LeanTo reaches dx -1), so (-160,-190) is its open foot and is worn
 * to Dirt whatever the hash says; the brief's letter put the foot
 * east, which the shared map refutes. Bodil's Bed stands under the
 * canvas's south side (the Ingram precedent). THE FELLERS' BEDS (band
 * 8 fix pass, the brief's own fallback in 0.2 K): the two Bedrolls
 * were declared wayside lies, and the seating audit found both
 * fellers sitting on bare ground beside them — tiles.ts knows no seat
 * kind for a Bedroll, so a lie stop aimed at one stands the body up.
 * Two Beds stand where the rolls lay, one per feller, each the night
 * stop of its own routine (feller_cut for the face, feller_trunk_cut
 * for the trunk: THE POST IS THE ORIGIN, so two posts need two
 * offsets), and SLEEPER STAYS IN BED holds for all three. The wains
 * brought the frames up on their first run; a Charter crew does not
 * sleep on the damp glade.
 */
export const CAMP = {
  leanTo: [-159, -190] as Pt,
  leanToFoot: [-160, -190] as Pt,
  bed: [-159, -191] as Pt,
  /** The trunk feller's bed (west) and the face feller's (east). */
  beds: [[-157, -191], [-155, -192]] as ReadonlyArray<Pt>,
  fire: [-155, -190] as Pt,
  /** One clamp of their own, banked under turf; its ash on the four neighbours (K1: the bed sits IN the ash). */
  ember: [-159, -194] as Pt,
} as const;
/** THE SNAGS somebody takes, at the cut's north edge. Nobody is authored taking them (0.2 L). */
export const CUT_SNAGS: ReadonlyArray<Pt> = [[-152, -195], [-156, -199]];
/** G3 the yard: a Dirt ellipse under the camp and the face. */
export const YARD = { cx: -156, cy: -190, rx: 4, ry: 4 } as const;
/**
 * G3 the wains' turn: a worn line from the road's north shoulder to
 * the lot post. (-158,-183) is 3.80 from the carve (listed); the
 * brush stops at the shoulder's edge and never paints the bed.
 */
export const APPROACH: ReadonlyArray<Pt> = [[-158, -183], [-158, -186]];
/**
 * G3 the fellers' walk: a worn line from the cut face west to the
 * fire's east cell. The face feller's stand is boxed by a stump, the thread and
 * the field's own cells, so the way to his bed and the fire is worn
 * by the zone (a dozen trips a day wear a line), and the sweep can
 * read it (routines/worldFit.test.ts).
 */
export const FACE_WALK: ReadonlyArray<Pt> = [[-151, -190], [-154, -190]];
/**
 * THE LOT (the trunk law): the crew cleared its lot; the cut face is
 * the stumps and the lot behind them holds no standing trunk. One
 * worldgen tree stood in it at this seed, (-160,-194). Trees only.
 */
export const LOT_FELL: Box4 = { x0: -160, y0: -194, x1: -151, y1: -185 };
/**
 * THE WAINS' APPROACH (the trunk law, the tape): worldgen's trunks at
 * (-155,-184) and (-152,-184) stood between the road and the rope and
 * painted over the lot post, the rope and the rack from the bed; the
 * crew cleared the lot's road side to the shoulder for the wains that
 * turn at the fork. Trees only; the shoulder's grass keeps its kind.
 */
export const APPROACH_FELL: Box4 = { x0: -161, y0: -185, x1: -147, y1: -182 };

// ---------------------------------------------------------------------
// THE CAST (post-is-the-origin; the zone's three bodies and one row).
// ---------------------------------------------------------------------
const E = 0;
const N = -Math.PI / 2;
export interface Post {
  slug: string;
  x: number;
  y: number;
  dir: number;
  routine: string;
}
export const POSTS = {
  /**
   * Bodil at (-153,-188), the sawhorse's SOUTH cell (y grows south:
   * -188 lies below -189), facing NORTH into the work. The brief's
   * letter said "north of the sawhorse, facing south", which on this
   * axis faces her away from her own bench; the post is the brief's,
   * the facing is the work's. `bodil_cut` is L2's.
   */
  charter_bodil: { slug: 'charter_bodil', x: -153, y: -188, dir: N, routine: 'bodil_cut' },
  /** A feller at the cut face facing east into the standing wood; `feller_cut` is L2's (his bed at (-155,-192): offset (-4,-2)). */
  feller_face: { slug: 'charter_feller', x: -151, y: -190, dir: E, routine: 'feller_cut' },
  /** A feller at the second trunk, which lies one east of him at (-152,-193): he faces it. His own routine (band 8 fix pass): the bed at (-157,-191) is offset (-4,2) from THIS post. */
  feller_trunk: { slug: 'charter_feller', x: -153, y: -193, dir: E, routine: 'feller_trunk_cut' },
} as const satisfies Record<string, Post>;

/**
 * THE WOLVES ON THE LINE (0.2 L): one ZoneSpawn row through the A7
 * passthrough, wolf x2, tribe predators, hours 19-06, seated on the
 * south leg and walking it past the head stone and back to the
 * corner. Measured: the loop's nearest approach to the crew's
 * beds is (-146,-184) at 12.0; to Torsten's `at` post (-149,-165)
 * 19.2; to the sentinels' 16.3 and 17.0; to the footprint's north
 * edge 15 (lint.loopClear: ≥ 12 from every `at` post, ≥ 9 from the
 * edge). THE COUNTED PACK (band 8 fix pass): the row is `passive`.
 * The live audit stood a walker at the head stone from 19:33 and the
 * pair, dwelling one tile from the stand rect, bit them eight times
 * in two game hours; a wolf's aggro reaches six and the stand rect
 * is seven wide, so no loop that passes the head stone can keep a
 * wolf out of reach of the stander, and the offer's "they will not
 * stop" needs the engine's word. A passive body never opens on a
 * player; a blow still answers, and Sorrel's pelts still fall.
 */
export const WOLF_ROW = {
  npc: 'wolf',
  seat: [-141, -184] as Pt,
  radius: 2,
  count: 2,
  tribe: 'predators',
  passive: true,
  hours: { from: 19, to: 6 },
  patrol: [
    { x: -136, y: -184, dwell: 15 },
    { x: -146, y: -184, dwell: 10 },
  ],
} as const;
/**
 * The fork rest's scanned footprint at the booted anchor: the 22x8
 * shelf (the sketch itself since the band 8 fix pass) blitted at
 * (-150 - 11, -165 - 4). For loopClear. (A ninth row was tried so the
 * clearing could reach the oak at the mouth and slid the golden
 * anchor a row north; the def's clearing 4 reaches it instead.)
 */
export const FORK_FOOTPRINT: Rect4 = [-161, -169, -140, -162];
/**
 * The three `at` posts of the fork rest, DERIVED from the footprint's
 * origin and the def's prefab-local offsets (fork_waystation.json:
 * Torsten dx 12 dy 4, the sentinels dx 14 dy 1 and dx 16 dy 2), so
 * the world cells here can never be a column off the composed
 * ground (the review's finding 8: composePoi blits the shelf at x
 * -161, so the posts are (-149,-165), (-147,-168), (-145,-167)).
 */
export const AT_POSTS: ReadonlyArray<Pt> = ([[12, 4], [14, 1], [16, 2]] as const).map(
  ([dx, dy]): Pt => [FORK_FOOTPRINT[0] + dx, FORK_FOOTPRINT[1] + dy],
);
/** The haven: fork_rest's centre and safeR (fork_waystation.json). */
export const HAVEN = { x: -150, y: -165, r: 18 } as const;

/**
 * THE SHOULDER (the carve law): every authored cell within
 * ROAD_SHOULDER lies in one of these rects, each with its reason;
 * nothing authored lies within the bed (no exemption this band).
 */
export const WARDTHREAD_SHOULDER_LISTED: ReadonlyArray<{ rect: Rect4; why: string }> = [
  { rect: [-160, -183, -156, -183], why: 'the wains\' turn: the worn line from the road\'s north shoulder to the lot post' },
  { rect: [-161, -185, -147, -182], why: 'the wains\' approach: the lot\'s road side cleared to the shoulder (trees only)' },
  { rect: [-146, -183, -129, -180], why: 'the rest\'s firewood: the verge between the road and the thread\'s south leg, cut by the keeper (trees only)' },
];
/** The flood's entry for the reachability lint: a shoulder cell inside the rect, west of the lot post. */
export const WARDTHREAD_FLOOD_FROM: Pt = [-158, -183];

// =====================================================================
// THE PICKET (§2.3)
// =====================================================================

/** THE TWO LAMPS on the trail's east shoulder, flanking the post: 4.22 and 2.22 from the wandered carve. */
export const LAMPS: ReadonlyArray<Pt> = [[-120, -130], [-120, -121]];
/** THE SLATE, facing west to the scuff; its west cell is Torsten's chalking stand (L2's 06:00 stop). */
export const SLATE: Pt = [-117, -126];
export const SLATE_STAND: Pt = [-118, -126];
/** THE BELL on its post. */
export const BELL: Pt = [-116, -129];
/**
 * THE BENCH nobody sits on, facing west. The brief drew it at
 * (-116,-123); the tape found worldgen's oak at (-116,-115) on the
 * rect's south border (unfellable by law), and the noon shot
 * (band8-l1/picket-noon) measured its crown reaching EIGHT rows north
 * to y -123, so the bench stands two rows north of the letter, one
 * south-east of the slate, with a row to spare. Its west cell is the
 * cardinal stand (the slate's south cell, open Dirt, never tall).
 */
export const BENCH: Pt = [-116, -125];
export const BENCH_STAND: Pt = [-117, -125];
/** THE FOUR MOUNDS in a row hugging the scuff north of the post, on bare grass (the Company dug in a hurry). */
export const MOUNDS: ReadonlyArray<Pt> = [[-120, -133], [-121, -135], [-122, -137], [-123, -139]];
/**
 * THE RAG, ON THE 192 RING BY THE TAPE. The brief put it "at the row's
 * north head, about (-124,-140)" and said the lane places it within
 * two of the ring; the tape reads the ring at 197.3 there and at
 * 192.0 at (-122,-135), beside the second mound on the scuff side
 * (3.38 from the carve, listed). The stake marks the threshold, not
 * the row's end: it stands where the tier-2 line crosses the trail,
 * where a walker coming up reads it before the mounds (§13.1 law 5:
 * a stake and nothing more).
 */
export const RAG: Pt = [-122, -135];
/** The tier ring: 192 from the settled anchor (-64,48); the rag within 2 (lint.thresholdStake). */
export const THRESHOLD = { x: -64, y: 48, r: 192, tol: 2 } as const;
/** The three TOWN_SPAWNS wolf pins (npcs.ts): the tutorial's matriarch ground, untouched. */
export const WOLF_PINS: ReadonlyArray<Pt> = [[-96, -76], [-124, -80], [-110, -86]];
/**
 * WOLF CLEAR: the dire wolf roams eight tiles from its pin; every
 * authored cell of the picket stands at least 30 from every pin,
 * which is the roam plus a screen's height (EYEFUL_DY 22) — the
 * picket is never in the same eyeful as the matriarch's ground. The
 * brief's 40 was measured at the post's centre alone (40.8 holds and
 * is pinned too); its own north lamp stands 36.4 and its bench 37.5.
 * Measured minimum after the fells: (-114,-117) at 31.3.
 */
export const WOLF_CLEAR = 30;
export const WOLF_CLEAR_CENTRE = 40;
/** G1 the trodden ground under the post: twenty two years of one man standing. */
export const POST_WEAR = { cx: -118, cy: -126, rx: 3, ry: 4 } as const;
/** G2 the worn line from the east shoulder to the slate's stand. */
export const SLATE_LINE: ReadonlyArray<Pt> = [[-121, -126], [-118, -126]];
/** G4 GrassTall tufts hashed east of the post where nobody walks. */
export const TUFTS = { cx: -112, cy: -126, rx: 3, ry: 5, density: 0.3 } as const;
/**
 * THE MOUNDS' ROW (the trunk law, the tape): a worldgen trunk stood
 * at (-122,-138) between the third mound and the fourth and painted
 * over the row's north end; the Company dug its row where it dug and
 * the trunk in its line came down. The oak under the second mound is
 * the mound's now. Trees only.
 */
export const MOUND_ROW_FELL: Box4 = { x0: -124, y0: -139, x1: -119, y1: -132 };
/**
 * THE SOUTH POCKET (the trunk law, the tape): the wood's east edge
 * comes back south of the post at (-118,-122), (-116,-119) and
 * (-114,-117), and their crowns painted over the slate's stand and
 * the bench; the order felled the last trunks between its post and
 * the trail's climb so the slate reads from the bed and the lamps are
 * seen from below. Trees only; the grass is the field's own.
 */
export const SOUTH_POCKET_FELL: Box4 = { x0: -119, y0: -125, x1: -113, y1: -116 };
export const PICKET_SHOULDER_LISTED: ReadonlyArray<{ rect: Rect4; why: string }> = [
  { rect: [-121, -131, -119, -120], why: 'the two lamps on the east shoulder and the trodden ground under the post where Torsten steps off the scuff' },
  { rect: [-124, -140, -119, -132], why: 'the graves\' row hugging the scuff, the rag on the ring, and the row\'s felled trunk' },
  { rect: [-119, -125, -117, -116], why: 'the south pocket\'s felled trunk nearest the scuff' },
];
/** The picket's one board: THE TALLY, moved verbatim from fork_waystation.signs[1]. */
export const SIGN_LEDGER = {
  tally: {
    at: SLATE,
    title: 'THE TALLY',
    lines: ['gnolls eleven. wolves seven', 'ours three', 'the three has a line through it'],
  },
} as const;
/** The flood's entry for the picket: the bed cell nearest the slate. */
export const PICKET_FLOOD_FROM: Pt = [-123, -126];

// =====================================================================
// THE TURN (§2.8): two tiles and nothing else.
// =====================================================================

/** CairnFallen on the High Road's north shoulder, 3.84 from the wandered carve (listed). */
export const CAIRN: Pt = [-73, -172];
/** DeadTree eleven rows north of the bed, lateral to an east-west walker; the open cold is grass, not old wood. */
export const TURN_SNAG: Pt = [-70, -179];
export const TURNOFF_SHOULDER_LISTED: ReadonlyArray<{ rect: Rect4; why: string }> = [
  { rect: [-73, -172, -73, -172], why: 'the cairn that fell, on the north shoulder where the order\'s path left the road' },
];
export const TURNOFF_FLOOD_FROM: Pt = [-73, -169];

export const PINS = {
  WARDTHREAD, PICKET, TURNOFF, TRAIL_PTS, HIGH_ROAD_PTS,
  LINE_PTS, LINE_TILES, STONES, ROOT, STONE_CLEARINGS, FIREWOOD_FELL,
  LOT_POST, ROPE, FACE_STUMPS, PAST_STUMPS, FURROWS, SAWHORSE, TRUNKS, RACK, CAMP, CUT_SNAGS, YARD, APPROACH, FACE_WALK,
  LOT_FELL, APPROACH_FELL, POSTS, WOLF_ROW, AT_POSTS, FORK_FOOTPRINT, HAVEN,
  WARDTHREAD_SHOULDER_LISTED, WARDTHREAD_FLOOD_FROM,
  LAMPS, SLATE, SLATE_STAND, BELL, BENCH, BENCH_STAND, MOUNDS, RAG, THRESHOLD, WOLF_PINS, WOLF_CLEAR, WOLF_CLEAR_CENTRE,
  POST_WEAR, SLATE_LINE, TUFTS, MOUND_ROW_FELL, SOUTH_POCKET_FELL, PICKET_SHOULDER_LISTED, SIGN_LEDGER, PICKET_FLOOD_FROM,
  CAIRN, TURN_SNAG, TURNOFF_SHOULDER_LISTED, TURNOFF_FLOOD_FROM,
} as const;
export type Pins = typeof PINS;
export { Tile };
