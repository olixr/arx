/**
 * THE SETT (contested lands, band 9d) — THE SACRED PINS.
 *
 * Every coordinate the brief nails to the Sett's ground, written once
 * so the scene modules argue with a constant instead of a memory.
 * Coordinates are WORLD tiles at seed 24601 (band9d/blockout.md §1-§4,
 * rulings R-A..R-H; y grows south; N = −π/2, S = +π/2, E = 0, W = π);
 * the ctx converts to the frame's local grid exactly once. ONE MODULE,
 * MANY FRAMES (the wardthread pattern, §3.1): 9d builds the SETT frame;
 * 9e adds COURSE_A, COURSE_B, COURSE_C and MEADOW to the same module
 * with the same brush and the same counter (their origins are 9e's
 * L1's to write, measured against the shoal's booted seat under the
 * pad law; the four ids are declared EMPTY below on purpose).
 *
 * THE TAPE (band9d/l1/probe.out: generateChunk's own levels at the
 * shipped seed, the rim by the builder's 8-neighbour law): where the
 * brief's letter and the ground disagreed the ground won and the
 * reason stands beside the constant. The bowl (level<0) is x 154..195,
 * y 269..334; the −1 ring is 1,532 tiles (1,535 with E1), the −2 core
 * 325 tiles at x 164..187, y 286..302; the level-0 rim is 220 cells
 * (217 of them worldgen's own Cliff; the three others are E1's and
 * the flight's flanks); the −1/−2 rim is 86 cells (all worldgen's own
 * Cliff). Zero worldgen water in the bowl (R-B): the Sinter's wet
 * floor is authored. THE SHAPE IS READ, NOT DRAWN.
 */
import { Tile } from '@arx/shared';

export type Pt = readonly [number, number];
export type Rect4 = readonly [number, number, number, number];
export interface Box4 {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A listed level EDIT over the read mask, each with its sentence (the knoll's own idiom). */
export interface Edit {
  cells: ReadonlyArray<Pt>;
  level: number;
  why: string;
}

export type FrameId = 'sett' | 'course_a' | 'course_b' | 'course_c' | 'meadow';

/**
 * A zone's frame: its rect, its authorable interior (the border ring
 * excluded, except the listed SEAM cells), its level EDITS and the
 * Course counter's value at its first laid tile.
 */
export interface Frame {
  id: FrameId;
  name: string;
  RECT: { x: number; y: number; w: number; h: number };
  ORIGIN: { x: number; y: number };
  WIDTH: number;
  HEIGHT: number;
  AUTHORABLE: { x0: number; y0: number; x1: number; y1: number };
  EDITS: ReadonlyArray<Edit>;
  /** THE SEAM EXEMPTION (§3.3): the border cells this frame authors so the next frame picks the run up with no hole. */
  SEAM: ReadonlyArray<Pt>;
  /** The Course counter (a stile every twelve, a stone every forty, from the north gap) at this frame's first tile. */
  COURSE_START: number;
}

const frame = (
  id: FrameId,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  edits: ReadonlyArray<Edit>,
  seam: ReadonlyArray<Pt>,
  courseStart: number,
): Frame => ({
  id,
  name,
  RECT: { x, y, w, h },
  ORIGIN: { x, y },
  WIDTH: w,
  HEIGHT: h,
  AUTHORABLE: { x0: x + 1, y0: y + 1, x1: x + w - 2, y1: y + h - 2 },
  EDITS: edits,
  SEAM: seam,
  COURSE_START: courseStart,
});

// ---------------------------------------------------------------------
// THE RECT (R-B): origin (150,265), 50 x 74, so x 150..199 and y
// 265..338. The builder's flat two-tile apron law puts the smallest
// lawful rect at x 152..197, y 267..336 round the bowl (x 154..195,
// y 269..334) and its rim ring (x 153..196, y 268..335); this rect
// keeps two of slack on every side. Base TILE_SKIP everywhere the
// bowl is not: the thinned belt north of the lip, the east meadow
// (the 9a proof spot (201,292) stays outside by construction) and the
// forest show through. Nothing is authored north of y 266 (§13.1:
// no rect north of y 255 until the shoal's seat is read).
// ---------------------------------------------------------------------

/**
 * E1 THE LIP: (172..174, 269) sunk to −1. Worldgen's rim at y 269
 * runs x 160..163 and x 172..175 with the −1 floor between at x
 * 164..171; the north flight at (171..173,268) needs its south row
 * at −1 under all three treads and both mouth diagonals at −1 (the
 * straight-edge law), so the three rim cells east of the floor come
 * down one level and the flight reads straight. E2: none at the
 * core steps (the core's north edge at y 286 spans x 170..179 and
 * the flight at (174..176,285) passes every predicate as found).
 * E3: the south gully is KEPT sunk as worldgen has it (R-B: the
 * ground wins; the rect's height was spent on it anyway).
 */
export const E1_THE_LIP: Edit = {
  cells: [[172, 269], [173, 269], [174, 269]],
  level: -1,
  why: 'E1 THE LIP: the three rim cells under the north flight come down to −1 so the flight reads straight',
};

/**
 * E2 THE WEST TONGUE (the floor pass): (157..159, 274) RAISED to 0. A
 * quarry is not a bowl; where the rock ran hard the Marl cut round it
 * and left a tongue of the lip standing into the ring, a cut face
 * three long with its foot in the floor. It joins worldgen's own rim
 * at (156,274) so the fence reads as one rock; nothing stands behind
 * it (the floor is open on three sides) and the north flight stays
 * the only gap.
 */
export const E2_THE_WEST_TONGUE: Edit = {
  cells: [[157, 274], [158, 274], [159, 274]],
  level: 0,
  why: 'E2 THE WEST TONGUE: three ring cells left standing at the lip\'s level, a cut face the Marl quarried round',
};

/**
 * E3 THE SINTER'S TONGUE: (164..166, 294) RAISED to −1. The Sinter cut
 * the core's west face round a hard tongue and it stands into the −2
 * floor, joined to the core's own rim at (163,294); the floor is open
 * north, east and south of it and the core steps stay the only way
 * down.
 */
export const E3_THE_SINTER_TONGUE: Edit = {
  cells: [[164, 294], [165, 294], [166, 294]],
  level: -1,
  why: 'E3 THE SINTER\'S TONGUE: three core cells left standing at the ring\'s level, a cut face the Sinter quarried round',
};

/** THE SEAM CELL (§3.3): the one outer-ring cell the Sett authors, CourseWall, so 9e\'s COURSE_A picks the run up at (149,267). */
export const SEAM: Pt = [150, 267];

export const SETT = frame('sett', 'The Sett', 150, 265, 50, 74, [E1_THE_LIP, E2_THE_WEST_TONGUE, E3_THE_SINTER_TONGUE], [SEAM], 0);

// ---------------------------------------------------------------------
// THE COURSE FRAMES (band 9e L1; brief §6.0; rulings R-B, R-G; the
// 9d handoff §C.1). MEASURED, NOT COPIED: every origin below was
// written after the shoal's seat was read off 9d's boot log and the
// ground was probed at the shipped seed (band9e/l1/probe.out and
// route.out carry the tape).
//
// THE SHOAL'S SEAT (9d's boot log, verbatim: "[poi] authored site
// 'amberfen_shoal' (skral_village) stands at 203,184 — tier 1"; the
// prefab poi_skral_village_longbanks 60x46; blit top-left = anchor −
// floor(size/2) → footprint x 173..232, y 161..206; AUTHORED_ZONE_PAD
// 6 → every frame keeps its cells OUTSIDE x 167..238, y 155..212).
// The four rects' greatest x is 149; the pad's least is 167: eighteen
// clear at the nearest, filed in sett.test as THE SEAT PIN.
//
// THE HONEST LINE (the ground refused the brief's letter twice, and
// the ground won): the brief drew "west along y 267 then north-west
// to the bank"; worldgen stands three trunks ON that row at (142,267),
// (144,267) and (146,267), so the run leaves the row after two tiles
// and goes NORTH along the wood's edge at x 148 (the belt's last
// free column before the Sett's rect, every cell grass at this seed),
// turns west at y 244 for six tiles and north again at x 142, where
// the brook's east bank is two to four tiles off. The bank run in B
// is the sand itself: x 142 is the east bank's own sand from y 226 to
// y 207 and is trunk-free the whole way (no B trunk stands on x 142).
// THE ONE CROSSING is at y 207 (four water cells 138..141; the row
// at y 206 carries a worldgen fishing spot at (141,206) and y 210 one
// at (141,210); y 207 is the first clean row south of the shoal's
// pad), the east bank stone one south of the turn on the sand at
// (142,208), the west bank stone on the grass at (137,207). West of
// the brook the run keeps y 207 across eighteen tiles of open grass
// and into the forest strip until two trunks stand on the row at
// (100,207) and (97,207): the line steps north ONE row at x 101 (its
// only bend in the strip, the trunks' own sentence) and runs y 206
// to the meadow's corner. Every cell of the polyline is worldgen
// grass, tall grass or sand (the ford's four are the brook's own
// water): THE TRUNK LAW at the brush (lint.noFelling) — the Dolmen
// fell no wood, and no fell pocket is opened for the Course.
//
// THE COUNTER (one constant, COURSE_LAW, read by every frame's brush):
// a stile every twelve, a stone every forty, from the north gap; the
// Sett's head run leaves it at 20; A at 57; B at 97; C at 147; the
// meadow's END stone is 165: ONE HUNDRED AND SIXTY-SIX TILES from the
// gap to the END (R-B's 150..170; one water crossing).
//
// THE FRAMES ABUT (no rect overlaps another; each seam is one cell on
// a border, exempt under §3.3): A's east ring x 149 beside the Sett's
// seam (150,267); A's north ring y 238 under B's south ring y 237 at
// x 142; B's west ring x 133 beside C's east ring x 132 at y 207;
// C's west ring x 84 beside MEADOW's east ring x 83 at y 206. The
// brief's candidates (A (129,238) 21x33, B (133,204) 15x34, C
// (84,198) 54x13, MEADOW (57,190) 27x25) were sketches: B and C
// overlapped each other by 5x7 and C's x 84..137 did not reach the
// water; each rect below is cut to its run (THE CURATION LAW: a line
// of set stone across open ground and NOTHING else authored).
// ---------------------------------------------------------------------

/**
 * COURSE_A: origin (140,238), 10x31, so x 140..149 and y 238..268
 * (cells [1,1] and [1,2]). THE BELT RUN: two tiles west from the
 * Sett's seam, north along the wood's edge at x 148, west along y 244,
 * north at x 142 to B. Seams: (149,267) east (the Sett's (150,267)
 * beside it), (142,238) north (B's (142,237) above it).
 */
export const COURSE_A = frame('course_a', 'The Standing Course', 140, 238, 10, 31, [], [[149, 267], [142, 238]], 20);
/**
 * COURSE_B: origin (133,204), 12x34, so x 133..144 and y 204..237
 * (cell [1,1]; the pad's least x is 167). THE BANK RUN north along the
 * sand at x 142 to the turn at (142,207), THE FORD west across the
 * brook's four water cells, and four tiles of grass to the west seam.
 * Seams: (142,237) south, (133,207) west (C's (132,207) beside it).
 */
export const COURSE_B = frame('course_b', 'The Standing Course', 133, 204, 12, 34, [], [[142, 237], [133, 207]], 57);
/**
 * COURSE_C: origin (84,204), 49x6, so x 84..132 and y 204..209 (cells
 * [1,1] and [0,1]; never north of y 198). THE STRIP RUN west along
 * y 207 over the open grass and into the wood, one step north at x
 * 101 for the two trunks on the row, then y 206 to the meadow's
 * corner. Seams: (132,207) east, (84,206) west (MEADOW's (83,206)).
 */
export const COURSE_C = frame('course_c', 'The Standing Course', 84, 204, 49, 6, [], [[132, 207], [84, 206]], 97);
/**
 * MEADOW: origin (57,198), 27x17, so x 57..83 and y 198..214 (cell
 * [0,1], no core). SARSEN'S PATCH at the Drowned Meadow's south-east
 * corner: the two sheets, the dry strip, the last courses with their
 * feet in the south sheet, the END stone, the cairn, Sarsen and the
 * sheep. The brief's candidate stood at y 190; nothing is authored
 * north of y 200, so the rect is cut to the scene. Seam: (83,206).
 */
export const MEADOW = frame('meadow', 'The Drowned Meadow', 57, 198, 27, 17, [], [[83, 206]], 147);

/** THE FRAMES SHAPE, all five filled (9d's four EMPTY ids are written). */
export const FRAMES: Readonly<Record<FrameId, Frame>> = { sett: SETT, course_a: COURSE_A, course_b: COURSE_B, course_c: COURSE_C, meadow: MEADOW };
/** The four Course frames in the counter's order (the Sett's head run is first). */
export const COURSE_FRAMES: ReadonlyArray<Frame> = [COURSE_A, COURSE_B, COURSE_C, MEADOW];

/**
 * THE SEAT PIN: the shoal's booted footprint padded by AUTHORED_ZONE_PAD
 * (9d's proof.md / shoal-seat.txt; unchanged across the 9c, L3 and L5
 * boots). No 9e frame cell may stand inside it; sett.test asserts it
 * and files the nearest gap.
 */
export const SHOAL_SEAT = {
  anchor: [203, 184] as Pt,
  prefab: 'poi_skral_village_longbanks',
  footprint: { x0: 173, y0: 161, x1: 232, y1: 206 } as Box4,
  pad: 6,
  padded: { x0: 167, y0: 155, x1: 238, y1: 212 } as Box4,
  bootLine: "[poi] authored site 'amberfen_shoal' (skral_village) stands at 203,184 — tier 1",
} as const;

// =====================================================================
// THE ELEVATION: two flights, six treads (the only gaps in the fence).
// =====================================================================

/** THE NORTH ENTRY: three treads on the level-0 rim at y 268; crown row (170..174,267) level 0, mouths (171..173,269) −1 after E1. */
export const STAIRS_NORTH: ReadonlyArray<Pt> = [[171, 268], [172, 268], [173, 268]];
/** THE CORE STEPS: three treads on the −1 rim at y 285; mouths (174..176,286) −2; no edit. */
export const STAIRS_CORE: ReadonlyArray<Pt> = [[174, 285], [175, 285], [176, 285]];
export const STAIRS: ReadonlyArray<Pt> = [...STAIRS_NORTH, ...STAIRS_CORE];
/** THE REACH ANCHOR (R-D, E2): the approach cell on the lip; never a spawn. */
export const REACH_FROM: Pt = [172, 266];

// =====================================================================
// S1 THE HEAD (the lip, level 0, y 266..267)
// =====================================================================

export const HEAD = {
  /** The approach Dirt on the lip: the last cell of the walk before the crown. */
  APPROACH: [172, 266] as Pt,
  /** The stair crown: Dirt (170..174, 267), the flight's own row. */
  CROWN: { y: 267, x0: 170, x1: 174 },
  /**
   * P0 THE THRESHOLD PLUMBSTONE at (175,267), one east of the crown:
   * the base tier-3 line (dist 320 from the anchor (−64,48)) crosses
   * x=172 at y≈264, which is the lip itself, so the threshold mark and
   * the Course's head are ONE prop (R-A).
   */
  P0: [175, 267] as Pt,
  /** THE NORTH GAP: CourseStile at (169,267), one west of the crown, where a course should stand and does not (the forty came off the north end). */
  GAP: [169, 267] as Pt,
  /**
   * THE HEAD RUN, laid by the brush from the gap west to the seam cell
   * with the counter at 0 on the gap: CourseWall (168..158,267), the
   * stile at (157,267) (twelve from the gap), CourseWall (156..151,267)
   * and the seam (150,267) under THE SEAM EXEMPTION. Twenty tiles;
   * the counter leaves the frame at 20.
   */
  RUN_PTS: [[169, 267], [150, 267]] as ReadonlyArray<Pt>,
  RUN_TILES: 20,
  /** Chalkline C1 on the bare cells north of the wall beside the gap: where the forty will go back. Dirt under it (a detail needs painted ground). */
  C1: [[166, 266], [167, 266], [168, 266]] as ReadonlyArray<Pt>,
  /** DragFurrow x2: the stone track's last two wheel marks and nothing more (the track to the ford runs 170 tiles over unauthored ground). */
  FURROWS: [[171, 266], [172, 266]] as ReadonlyArray<Pt>,
  /**
   * Worldgen trunks that stand south of the head run at this seed and
   * paint north over it: (155,268), (151,269), (153,269). RECORDED,
   * NOT FELLED: the Dolmen fell no wood and no fell pocket is opened
   * for the Course (§2, §10); the proof lane shoots the run as it
   * stands and moves nothing.
   */
  TRUNKS_SOUTH_OF_RUN: [[155, 268], [151, 269], [153, 269]] as ReadonlyArray<Pt>,
} as const;

// =====================================================================
// S2 THE RIM-SET (−1 north): the Marl's cells, the foot, the lines, the dead-row
// =====================================================================

export const RIMSET = {
  /** The stair-foot apron: a Dirt ellipse under the north flight's mouth. */
  FOOT: { cx: 172, cy: 271, rx: 2.5, ry: 1.5 },
  /**
   * The two desire lines from the foot, ORTHOGONAL polylines the wear
   * brush wobbles and breaks (THE FLOOR PASS: feet on rock wear a
   * broken one-wide trail, never a ribbon; WEAR says how): WEST to the
   * yard's stile (ending on the cell north of VS; the line rounds the
   * dead-row's east end by two and turns west along y 286), EAST to
   * the shelf's mouth (rounding the core's rim by one row: at y
   * 286..288 the rim stands at x 180..186). The third way, to the core
   * steps, is not worn: it is LAID (below).
   */
  LINES: {
    WEST: [[172, 272], [164, 272], [164, 286], [160, 286]] as ReadonlyArray<Pt>,
    EAST: [[172, 272], [176, 272], [176, 281], [187, 281], [187, 288], [189, 288]] as ReadonlyArray<Pt>,
  },
  /** THE WEAR: the trail brush's wobble and its break, the same for every worn line in the bowl. */
  WEAR: { wobble: 0.15, gap: 0.3 },
  /**
   * THE LAID COURSE (the floor pass): the way from the foot to the core
   * steps is the one way down to the floor and the Marl SET it, a
   * course of stone laid flat (StoneFloor, one wide, the brush's
   * wobble) from the foot's south edge to three short of the crown
   * apron. The last three are C4, chalked and not set.
   */
  LAID: [[172, 273], [172, 278], [175, 278], [175, 280]] as ReadonlyArray<Pt>,
  /**
   * Chalkline C4 (moved from the south ring, where it lay under the
   * core's south face and read from nowhere): the laid course's next
   * three, chalked toward the crown and not set, because the count of
   * stones has not come back. Beside a laid course is where a chalk
   * line is legible at zoom 1.3.
   */
  C4: [[175, 281], [175, 282], [175, 283]] as ReadonlyArray<Pt>,
  /**
   * THE CROWN SPOIL: what came off the core's north face when the Marl
   * cut the steps, thrown up beside the crown where the barrow tipped
   * (two heaps, west of the apron, off the laid course's wobble).
   */
  CROWN_SPOIL: [[169, 283], [170, 283]] as ReadonlyArray<Pt>,
  /**
   * THE WEST FOOT: rubble along the foot of the west rim, a wobbling
   * one-wide run from below the tongue to the dead-row: the rim sheds
   * and nobody clears the west, where nobody walks.
   */
  WEST_FOOT: [[155, 277], [155, 278], [156, 279], [155, 280], [155, 281]] as ReadonlyArray<Pt>,
  /** M1 and M2: the Marl's two corbel cells, facing the stairs so a stone coming down is seen before it lands. */
  M1: [166, 276] as Pt,
  M2: [180, 277] as Pt,
  /** Every cell's Dirt apron: r 1.5 round the cell. */
  CELL_APRON_R: 1.5,
  /** A post in the open wears a ragged ellipse r 1 (the centre and what the hash keeps of its cardinals). */
  POST_APRON_R: 1,
  /** THE DEAD-ROW: CourseWall (158..162,282), a Course is also a grave-row; short because eleven winters is a short count. */
  DEADROW: { y: 282, x0: 158, x1: 162 },
  /** P1 at the dead-row's head. */
  P1: [163, 282] as Pt,
} as const;

// =====================================================================
// S3 THE CORE STEPS
// =====================================================================

export const CORE_STEPS = {
  /** Crown apron Dirt (173..177,284) on the −1 side; mouth apron Dirt (173..177,286) on the −2 side. */
  CROWN_APRON: { y: 284, x0: 173, x1: 177 },
  MOUTH_APRON: { y: 286, x0: 173, x1: 177 },
} as const;

// =====================================================================
// S4 THE PLUG (−2)
// =====================================================================

export const PLUG = {
  /** The corbelled dome over the sealed hole, on bare CaveFloor. */
  DOME: [175, 291] as Pt,
  /** THE WALK: Dirt on the BORDER cells of x 171..179 x y 287..295 (Chebyshev 4 from the dome). */
  WALK: { x0: 171, y0: 287, x1: 179, y1: 295 } as Box4,
  /** The ring's inside (Chebyshev ≤ 3): nobody's post, waypoint or wander radius enters it ("they have never stood on it since"). */
  INSIDE_R: 3,
} as const;

// =====================================================================
// S5 THE WET FLOOR (−2 south): the Sinter's water, the ninth course, Drusa's cell
// =====================================================================

export const WETFLOOR = {
  /** Authored WaterShallow on the core's south half, 61 cells, every one at −2 (a floor tile is never a rim). */
  ROWS: [
    { y: 297, x0: 169, x1: 182 },
    { y: 298, x0: 169, x1: 183 },
    { y: 299, x0: 170, x1: 182 },
    { y: 300, x0: 171, x1: 181 },
    { y: 301, x0: 173, x1: 180 },
  ] as ReadonlyArray<{ y: number; x0: number; x1: number }>,
  CELLS: 61,
  /** THE NINTH COURSE: CourseWall x9 at (170..178,298), standing IN the water (WET_STANDERS, E3). */
  NINTH: { y: 298, x0: 170, x1: 178 },
  /** Drusa's cell: CorbelCell at (182,297), water south and west of it, Dirt north: half in the wet. */
  DRUSA_CELL: [182, 297] as Pt,
  DRUSA_DIRT: [182, 296] as Pt,
  /** The Dirt edge along the water's north bank. */
  EDGE: { y: 296, x0: 169, x1: 183 },
  /** Two rubble on the dry floor: the seam's spoil the Sinter set aside. */
  RUBBLE: [[168, 290], [184, 293]] as ReadonlyArray<Pt>,
  /** THE SINTER'S SPOIL: one heap where the barrow stopped when they dug for the water, beside their rubble at (168,290). */
  SPOIL: [167, 289] as Pt,
  /** THE LEDGE: two cells of uncut rock at the foot of the core's south-west face, a bench the water did not reach (never beside the water: (170,300) lies between). */
  LEDGE: [[168, 300], [169, 300]] as ReadonlyArray<Pt>,
} as const;

// =====================================================================
// S6 THE WEIGHT-YARD (−1 west): the Gossan's walled square with one door
// =====================================================================

/**
 * THE TAPE ON THE YARD. The brief drew the north course at x 156..163
 * and the south course at x 156..163 with "usable x 155..163, y
 * 287..300; the core's rim cells at x 164/165 fence themselves". The
 * ground reads: at y 287 the outer rim stands at x 154 and the core's
 * rim at x 165, so (155,287) and (164,287) are open floor; at y 300
 * the outer rim stands at x 153 and the core's rim at x 165, so
 * (154,300) and (164,300) are open floor. A wall that stops one short
 * of the rim is a yard with three doors, and the sentence is ONE door
 * (the stile), so the north course runs x 155..164 (the stile still
 * at 160) and the south course x 154..164, each end on the last floor
 * cell before Cliff. lint.yardSealed proves it. The core's rim
 * wanders x 163..165 between; C2 moved one row north off it (below).
 */
export const YARD = {
  /** Vorl's north course with THE STILE (VS) as its one door: CourseWall (155..159,287), CourseStile (160,287), CourseWall (161..164,287). */
  NORTH_COURSE: { y: 287, x0: 155, x1: 164 },
  VS: [160, 287] as Pt,
  /** The south course: CourseWall (154..164,300). */
  SOUTH_COURSE: { y: 300, x0: 154, x1: 164 },
  /** THE CART: BrokenCart at (159,291), its second foot (158,291) open Dirt (FOOTPRINT dx −1); the short wall it stands BESIDE, never merged (9b R-1). */
  CART: [159, 291] as Pt,
  CART_FOOT: [158, 291] as Pt,
  CART_WALL: { y: 291, x0: 160, x1: 162 },
  /** THE ROW OF THE TAKEN on a Dirt strip: CharterPost x4 (a post line unpicked) and PitLampDark x2 (two Returner stakes pulled), at one-tile pitch like the Road Row's graves. */
  ROW_STRIP: { y: 296, x0: 156, x1: 161 },
  CHARTER_POSTS: [[156, 296], [157, 296], [158, 296], [159, 296]] as ReadonlyArray<Pt>,
  PIT_LAMPS: [[160, 296], [161, 296]] as ReadonlyArray<Pt>,
  /** P2 in the yard's north-west. */
  P2: [157, 289] as Pt,
  /**
   * Chalkline C2: the wall for the forty, chalked and not set (the one
   * honest bid, on the ground). The brief drew it on (161..163,293);
   * (163,293) was the core's own rim (Cliff) at this seed, so the line
   * stands one row north on (161..163,292), at the cart wall's foot.
   * E3's tongue now shelters (163,293) (floor again); the line stays
   * at the wall's foot, where a chalk line is legible (the floor pass).
   */
  C2: [[161, 292], [162, 292], [163, 292]] as ReadonlyArray<Pt>,
  RUBBLE: [155, 299] as Pt,
  /** The yard's interior for lint.yardSealed: every floor cell between the two courses and the rims. */
  INTERIOR: { x0: 154, y0: 288, x1: 164, y1: 299 } as Box4,
} as const;

// =====================================================================
// S7 THE HEARTH-CELLS (−1 east): the Culm's shelf, the only lights
// =====================================================================

export const SHELF = {
  K1: [191, 289] as Pt,
  K2: [192, 296] as Pt,
  /** EmberBed B1 and B2, each IN its ash (K1 as the Ashlamp fixed it: the bed's own cell carries no ash; its cardinals do). Flame-gated by the shipped row, lit from dusk. */
  B1: [189, 291] as Pt,
  B2: [190, 297] as Pt,
  /**
   * The seam's own rubble, brought up. The brief's middle piece at
   * (188,294) is the core's rim (Cliff) at this seed; it stands at
   * (189,295), at the rim's foot between the two hearths.
   */
  RUBBLE: [[193, 292], [189, 295], [193, 299]] as ReadonlyArray<Pt>,
  /**
   * THE SEAM (the floor pass): the black stone the Culm burn shows in
   * the core's east face on both sides of the rim: two cells on the −2
   * floor at the face's foot (the Sinter's rubble at (184,293) is its
   * spoil) and one on the shelf at the rim's foot beside the Culm's
   * rubble, where Durrow faces it. RockCoal, the shipped coal rock:
   * the quarry's honest wealth, left showing.
   */
  SEAM_CORE: [[187, 291], [187, 292]] as ReadonlyArray<Pt>,
  SEAM_SHELF: [189, 293] as Pt,
} as const;

// =====================================================================
// S8 THE SOUTH RING and THE GULLY: empty on purpose
// =====================================================================

export const SOUTH = {
  /** Three rubble by hand (the `course` vocab's weights, no roll). Nothing else to y 334 but the foot run. */
  RUBBLE: [[170, 306], [181, 309], [176, 318]] as ReadonlyArray<Pt>,
  /**
   * THE SOUTH FOOT: rubble along the foot of the core's south face
   * (the rim at y 303, x 174..181), a broken one-wide run either side
   * of it: the face sheds south, where nobody set anything. C4 stood
   * here and moved to the laid course (RIMSET.C4).
   */
  FOOT: [[172, 303], [173, 303], [177, 304], [178, 304], [182, 303]] as ReadonlyArray<Pt>,
} as const;

// =====================================================================
// THE CAST (§4; THE POST IS THE ORIGIN: every placement is this table verbatim)
// =====================================================================

const E = 0;
const S = Math.PI / 2;
const W = Math.PI;
const N = -Math.PI / 2;
export interface Post {
  slug: string;
  x: number;
  y: number;
  dir: number;
  routine: string;
}
export const POSTS = {
  /** Ammat, coursemother of the Marl: on the Course at the north end where the forty came off, counting everything that comes down the walk. */
  dolmen_ammat: { slug: 'dolmen_ammat', x: 168, y: 266, dir: S, routine: 'dolmen_set' },
  /** Drusa of the Sinter: on the Dirt at the water's edge facing the ninth course; `dolmen_wet` (L3) is the one loop, the slowest walk in the game. */
  dolmen_drusa: { slug: 'dolmen_drusa', x: 180, y: 296, dir: W, routine: 'dolmen_wet' },
  /**
   * Durrow of the Culm: between the two hearths facing the bowl, so the
   * cart going by on the lip is seen and cursed. The brief posted him at
   * (189,293), two rows south of B1 on its column: his body painted over
   * the bed by day and over its glow at night (L4). He stands one east
   * and one south, (190,294): still between the beds, on no ash, off
   * B1's column and three north of B2 (lint: no post on the two rows
   * south of a hearth).
   */
  dolmen_durrow: { slug: 'dolmen_durrow', x: 190, y: 294, dir: W, routine: 'dolmen_set' },
  /** The setter who keeps the north lip, at the foot apron looking at the ground. */
  setter_a: { slug: 'dolmen_setter', x: 169, y: 273, dir: S, routine: 'dolmen_set' },
  /** The setter at the dead-row's head, setting back what moves on the grave-row. */
  setter_b: { slug: 'dolmen_setter', x: 163, y: 281, dir: W, routine: 'dolmen_set' },
  /** A wetsetter in the water south of the ninth course, counting the courses under the water from the south. */
  wetsetter_a: { slug: 'dolmen_wetsetter', x: 172, y: 299, dir: N, routine: 'dolmen_set' },
  /** The same, from the east. */
  wetsetter_b: { slug: 'dolmen_wetsetter', x: 179, y: 300, dir: W, routine: 'dolmen_set' },
  /** Keeps the north hearth. */
  firekeeper_a: { slug: 'dolmen_firekeeper', x: 190, y: 290, dir: S, routine: 'dolmen_set' },
  /** Keeps the south hearth. */
  firekeeper_b: { slug: 'dolmen_firekeeper', x: 191, y: 298, dir: N, routine: 'dolmen_set' },
  /** Keeps the row. */
  weightkeeper_a: { slug: 'dolmen_weightkeeper', x: 157, y: 294, dir: E, routine: 'dolmen_set' },
  /** Keeps the cart. */
  weightkeeper_b: { slug: 'dolmen_weightkeeper', x: 162, y: 298, dir: W, routine: 'dolmen_set' },
} as const satisfies Record<string, Post>;

/**
 * VORL FULLWEIGHT, champion of the Gossan: ONE SPAWN ROW through
 * VORL'S DOOR (R-C, E1): the champion body at its own level 14 (the
 * scale is the identity with the name applied), named, speaking
 * through the mouth `dolmen_vorl` (THE MOUTH ON THE ROW: barks and
 * examine resolve through the shipped talk path; L3 writes the def),
 * tribe dolmen said explicitly (the wolves' `predators` idiom),
 * passive (he never opens; a blow still answers: "the set answers"),
 * on a vigil post in the yard's middle facing east across the yard
 * with the cart at his back and the row at his feet. No crown (a
 * forge would only warn: no pool, no kit).
 */
export const VORL_ROW = {
  npc: 'dolmen_champion',
  seat: [160, 293] as Pt,
  radius: 0,
  count: 1,
  level: 14,
  name: 'Vorl Fullweight',
  mouth: 'dolmen_vorl',
  tribe: 'dolmen',
  passive: true,
  post: { kind: 'vigil', x: 160, y: 293, dir: E },
} as const;

/** ONE LOOP (R-F): the routines that walk a `path`; exactly one body in the Sett carries one. */
export const LOOPS: ReadonlyArray<string> = ['dolmen_wet'];

// =====================================================================
// THE COURSE'S LAW and THE SERVER'S ROSTER
// =====================================================================

/** A stile every twelve, a stone every forty, the counter from the north gap. */
export const COURSE_LAW = { stileEvery: 12, plumbEvery: 40 } as const;
/**
 * THE SERVER'S ROSTER (THE STILE VERB reads it, server/game/courseStile.ts):
 * the stiles a stone may be set in. ONE entry in 9e: the north gap. Vorl's
 * stile and every crossing stile on the Course stay crossings.
 */
export const COURSE_GAPS: ReadonlyArray<Pt> = [HEAD.GAP];

// =====================================================================
// THE COURSE (9e): the polyline per frame, the ford, the meadow's end
// =====================================================================

/**
 * THE POLYLINES, ORTHOGONAL (a diagonal step throws; the line is one
 * line). Each frame's first point is its own seam cell where the run
 * enters and its last point the seam where it leaves (the meadow's
 * last point is the END stone). Every cell was probed free at the
 * shipped seed (route.out): grass, tall grass or sand, the ford's
 * four the brook's water.
 */
export const COURSE_PTS: Readonly<Record<Exclude<FrameId, 'sett'>, ReadonlyArray<Pt>>> = {
  /** THE BELT RUN: two west off the seam; north along the wood's edge (x 148, y 267→244); west six (y 244); north to B (x 142). 37 tiles, 20..56. */
  course_a: [[149, 267], [148, 267], [148, 244], [142, 244], [142, 238]],
  /** THE BANK RUN north on the sand (x 142, y 237→207); THE FORD west along y 207 to the west seam. 40 tiles, 57..96. */
  course_b: [[142, 237], [142, 207], [133, 207]],
  /** THE STRIP RUN west along y 207 to x 101; one step north for the two trunks on the row; west along y 206 to the meadow. 50 tiles, 97..146. */
  course_c: [[132, 207], [101, 207], [101, 206], [84, 206]],
  /** THE LAST COURSES west along y 206 with their feet in the south sheet, to the END stone. 19 tiles, 147..165. */
  meadow: [[83, 206], [65, 206]],
};
/** Tiles the brush lays per frame (the counter's arithmetic: 37 + 40 + 50 + 19 after the head run's 20 = 166). */
export const COURSE_TILES_PER_FRAME = { course_a: 37, course_b: 40, course_c: 50, meadow: 19 } as const;
/** The counter after the END stone: 166 tiles from the gap (R-B: 150..170; one crossing). */
export const COURSE_END_COUNT = 166;

/**
 * S9 THE FORD OF SET STONES (in COURSE_B). SENTENCE: the Marl set
 * stones in the brook's bed so the water runs shallow over them; a
 * set stone in the water is the one crossing the Dolmen own. The four
 * water cells of y 207 (worldgen Water at 139..140, WaterShallow at
 * 138 and 141) are laid as WaterShallow UNDER the counter (88..91:
 * set stones the water runs over; walkable), each with Detail.FordStone
 * in its bed so the slab reads through the water (the fix pass: bare
 * WaterShallow read as a paler band of brook); a bank stone stands on
 * each side, LISTED silhouettes whatever the counter says: east on
 * the sand at (142,208), one south of the turn (never at the corner),
 * counter 86; west on the grass at (137,207), counter 92. The line
 * breaks ONCE, here, for its two silhouettes.
 */
export const FORD = {
  ROW: 207,
  WET: [[141, 207], [140, 207], [139, 207], [138, 207]] as ReadonlyArray<Pt>,
  EAST_STONE: [142, 208] as Pt,
  WEST_STONE: [137, 207] as Pt,
  /** The turn from the bank run into the crossing: CourseWall on the sand, water to its west. */
  TURN: [142, 207] as Pt,
} as const;

/**
 * S10 THE LAST COURSES and SARSEN'S CORNER (frame MEADOW; brief §1.2).
 * SENTENCE (the scene's): Sarsen stands where the Course ends in the
 * meadow's sheet because the crofters walk here and the small diggers
 * restack the cairn here every night.
 *
 * The patch authors ITS OWN small sheet (band 10 owns the belt's):
 * the north band (62..80, 200..202) and the south band (60..82,
 * 206..212), the wall's own row INCLUDED so the last courses stand
 * with their feet in the water (the ninth course's idiom; E3 bakes
 * them over the water's contour). THE DRY STRIP y 203..205 between
 * them is the ground the Course keeps dry: Dirt worn ragged (the
 * sheep stand on it; the crofters say their sheep stand ON the Course
 * and mean this strip). A worldgen trunk stands on the strip at
 * (76,203) and the sheet's edges skip a fibre plant at (63,206), a
 * trunk at (61,208), a fibre plant at (81,212) and a sapling at
 * (80,201): authored trunks only; the brushes paint round them.
 * THE END PLUMBSTONE at (65,206) (counter 165, listed): the Course's
 * last stone, water west and south of it. THE CAIRN: FieldCairn at
 * (68,203) on the strip's north row with water at (68,202) (forced
 * whatever the sheet's ragged edge says): half in the sheet by
 * adjacency; FieldCairn always (a nightly swap would move a tile for
 * everyone; the beat is Sarsen's dawn walk and his line). The
 * counter's own stile lands at (74,206) (156) and its stone at
 * (70,206) (160): the brief's (78,206) was a guess at the count.
 */
export const MEADOW_SCENE = {
  NORTH_BAND: { x0: 62, y0: 200, x1: 80, y1: 202 } as Box4,
  SOUTH_BAND: { x0: 60, y0: 206, x1: 82, y1: 212 } as Box4,
  STRIP: { x0: 66, y0: 203, x1: 82, y1: 205 } as Box4,
  /** The wall's row: every cell under the last courses is water first. */
  WALL_ROW: { y: 206, x0: 65, x1: 82 },
  END: [65, 206] as Pt,
  CAIRN: [68, 203] as Pt,
  CAIRN_WATER: [68, 202] as Pt,
  /** Sarsen's dawn stop, the cell south of the cairn where he sets its one wrong stone right (routine sarsen_cairn, L3's). */
  CAIRN_STOP: [68, 204] as Pt,
  /** The strip's trunk, worldgen's own, left standing: the sheep shelter under it. */
  STRIP_TRUNK: [76, 203] as Pt,
} as const;

/**
 * THE CAST OF THE MEADOW (brief §4, the 9e rows). Sarsen, young for a
 * Marl: on the dry strip facing north at his cairn and the crofts'
 * way, the first Dolmen a player meets. The def `dolmen_sarsen` and
 * the routine `sarsen_cairn` (post 1.2; 05:30-06:30 a walk once to
 * the cairn's south cell, 120 s facing N, and home; 15-16 wander r2)
 * are L3's; the server warns once and stands him mute until they
 * land. THE POST IS THE ORIGIN.
 */
export const POSTS_MEADOW = {
  dolmen_sarsen: { slug: 'dolmen_sarsen', x: 70, y: 204, dir: N, routine: 'sarsen_cairn' },
} as const satisfies Record<string, Post>;
/**
 * THE SHEEP: one spawn row, sheep x7, seat (76,204) r 1 on the dry
 * strip, hours 18→7, passive: six ewes and the lamb, counted on at
 * dusk and off at dawn (the count is true on the ground or the line
 * is not said). The one row on the Course that keeps hours. The
 * radius is the LEASH (the server's scatter and wander both read it):
 * r 1 keeps every sheep on the strip's three rows y 203..205; the
 * first cut's r 3 stood one in the north sheet at dusk (the fix
 * pass), and "the sheep stand on it" is the line's own claim.
 */
export const SHEEP_ROW = {
  npc: 'sheep',
  seat: [76, 204] as Pt,
  radius: 1,
  count: 7,
  hours: { from: 18, to: 7 },
  passive: true,
} as const;

/**
 * WATCH (the proof lane shoots these; nothing moves for them): the
 * worldgen trunks that stand one or two rows SOUTH of a Course cell
 * and paint their crowns north over the wall at the true frame.
 * RECORDED, NOT FELLED (the Dolmen fell no wood; brief §10: if a run
 * cannot be seen at all the bend moves, never the tree). sett.test
 * derives the same list from the ground and pins it here.
 */
export const CROWNED: Readonly<Record<Exclude<FrameId, 'sett'>, ReadonlyArray<{ cell: Pt; trunk: Pt }>>> = {
  course_a: [
    { cell: [149, 267], trunk: [149, 268] },
    { cell: [144, 244], trunk: [144, 246] },
  ],
  course_b: [],
  course_c: [
    { cell: [106, 207], trunk: [106, 209] },
    { cell: [104, 207], trunk: [104, 209] },
    { cell: [100, 206], trunk: [100, 207] },
    { cell: [97, 206], trunk: [97, 207] },
  ],
  meadow: [],
};

/** KEEP_OUT for the Course frames: cells that hold only their listed tiles (TILE_SKIP always lawful). */
export const KEEP_OUT_FRAMES: Readonly<Record<Exclude<FrameId, 'sett'>, ReadonlyArray<KeepOut>>> = {
  course_a: [],
  course_b: [
    { cells: FORD.WET, allow: [Tile.WaterShallow], why: 'the crossing: set stone under the water, never a wall across the brook' },
    { cells: [FORD.EAST_STONE, FORD.WEST_STONE], allow: [Tile.PlumbStone], why: 'a bank stone on each side of the ford' },
  ],
  course_c: [],
  meadow: [
    { cells: [[68, 204], [70, 204]], allow: [Tile.Dirt], why: 'Sarsen\'s stand and his dawn stop: worn Dirt, never a solid' },
    { cells: [[68, 202]], allow: [Tile.WaterShallow], why: 'the cairn is half in the sheet by adjacency' },
    { cells: [[68, 203]], allow: [Tile.FieldCairn], why: 'the cairn, FieldCairn always' },
    { cells: [[65, 206]], allow: [Tile.PlumbStone], why: 'the END stone' },
  ],
};
/** No light and none of the taken on the Course (lint.lightsCensus, lint.noTimber). */
export const LIGHTS_CENSUS_FRAMES = { emberBeds: 0, pitLampsDark: 0 } as const;
export const TAKEN_FRAMES = { brokenCarts: 0, charterPosts: 0, pitLampsDark: 0 } as const;

// =====================================================================
// KEEP_OUT (§3.3): cells the zone never authors past the listed tile.
// =====================================================================

export interface KeepOut {
  cells: ReadonlyArray<Pt>;
  /** The tiles that may stand there (TILE_SKIP is always lawful on the ring). */
  allow: ReadonlyArray<number>;
  why: string;
}
const row = (y: number, x0: number, x1: number): Pt[] => {
  const out: Pt[] = [];
  for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
};
const boxBorder = (b: Box4): Pt[] => {
  const out: Pt[] = [];
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
    if (x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1) out.push([x, y]);
  }
  return out;
};
const boxInside = (b: Box4): Pt[] => {
  const out: Pt[] = [];
  for (let y = b.y0 + 1; y <= b.y1 - 1; y++) for (let x = b.x0 + 1; x <= b.x1 - 1; x++) out.push([x, y]);
  return out;
};
export const KEEP_OUT: ReadonlyArray<KeepOut> = [
  { cells: [...row(267, 170, 174), [172, 266]], allow: [Tile.Dirt], why: 'the stair crown and the approach: Dirt only' },
  { cells: row(269, 171, 173), allow: [Tile.CaveFloor, Tile.Dirt], why: 'the north flight\'s mouth: floor only' },
  { cells: [...row(284, 173, 177), ...row(286, 173, 177)], allow: [Tile.Dirt], why: 'the core steps\' crown and mouth aprons: Dirt only' },
  { cells: boxBorder(PLUG.WALK), allow: [Tile.Dirt, Tile.CaveFloor], why: 'the Plug\'s walk: Dirt worn in a broken ring on the floor, never crossed by a solid' },
  { cells: boxInside(PLUG.WALK).filter(([x, y]) => x !== PLUG.DOME[0] || y !== PLUG.DOME[1]), allow: [Tile.CaveFloor], why: 'inside the walk: bare CaveFloor; the dome alone stands there' },
  { cells: [YARD.CART_FOOT], allow: [Tile.Dirt], why: 'the cart\'s second foot: open Dirt, not a route, not a waypoint' },
  { cells: [[155, 296], [162, 296]], allow: [Tile.CaveFloor, Tile.Dirt], why: 'the row strip\'s two open ends' },
  { cells: WETFLOOR.ROWS.flatMap((r) => row(r.y, r.x0, r.x1)), allow: [Tile.WaterShallow, Tile.CourseWall, Tile.CorbelCell], why: 'the water\'s cells: nothing solid but the ninth course and Drusa\'s cell' },
];

/** LIGHTS census (lint.lightsCensus): the two hearths are the set\'s only lights; a dark lamp carries no light row. */
export const LIGHTS_CENSUS = { emberBeds: 2, pitLampsDark: 2 } as const;
/** NO TIMBER (lint.noTimber): the listed exceptions are THE TAKEN. */
export const TAKEN = { brokenCarts: 1, charterPosts: 4, pitLampsDark: 2 } as const;

export const PINS = {
  SETT, FRAMES, E1_THE_LIP, E2_THE_WEST_TONGUE, E3_THE_SINTER_TONGUE, SEAM, STAIRS_NORTH, STAIRS_CORE, STAIRS, REACH_FROM,
  HEAD, RIMSET, CORE_STEPS, PLUG, WETFLOOR, YARD, SHELF, SOUTH,
  POSTS, VORL_ROW, LOOPS, COURSE_LAW, COURSE_GAPS, KEEP_OUT, LIGHTS_CENSUS, TAKEN,
  // 9e: the Course frames and the meadow.
  COURSE_A, COURSE_B, COURSE_C, MEADOW, COURSE_FRAMES, SHOAL_SEAT, COURSE_PTS, COURSE_TILES_PER_FRAME, COURSE_END_COUNT,
  FORD, MEADOW_SCENE, POSTS_MEADOW, SHEEP_ROW, CROWNED, KEEP_OUT_FRAMES, LIGHTS_CENSUS_FRAMES, TAKEN_FRAMES,
} as const;
export type Pins = typeof PINS;
export { Tile };
