/**
 * THE STANDING COURSE (contested lands, band 9e) — course.ts. The
 * three thin frames between the Sett's lip and the Drowned Meadow:
 * the brush's callers, one per frame, each laying its part of ONE
 * polyline under ONE counter (pins.COURSE_PTS, pins.COURSE_LAW).
 *
 * SENTENCE (the Course's): the Marl set a course of dry stone from the
 * quarry's lip to the one crossing they own and on to the corner of
 * the meadow the wall keeps dry, a stile every twelve and a stone hung
 * true every forty, and what they set holds.
 *
 * THE CURATION LAW on the Course: a line of set stone across open
 * ground with a silhouette where the line breaks for the water and
 * NOTHING else authored; no board (the count is spoken at the lip),
 * no lamp, no cairn, no wear (nobody walks beside a wall; the sheep
 * stand on the meadow's strip and the crofters come from the west).
 * THE TRUNK LAW: the polyline bends for worldgen's trunks and never
 * fells one (the brush throws on a ford cell that is not water;
 * lint.noFelling refuses any authored cell over a trunk, a bush, a
 * prop or a rise); the trunks that crown the wall from the south are
 * RECORDED in pins.CROWNED as a WATCH and the proof lane shoots them.
 */
import { Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';
import { ford } from './ford.js';

function layRun(ctx: SettCtx, id: 'course_a' | 'course_b' | 'course_c', extra: { plumbAt?: ReadonlyArray<readonly [number, number]>; wet?: ReadonlyArray<readonly [number, number]> } = {}): number {
  const { pins, frame } = ctx;
  const pts = pins.COURSE_PTS[id];
  const next = ctx.course(pts, { start: frame.COURSE_START, ...extra });
  const want = pins.COURSE_TILES_PER_FRAME[id];
  if (next !== frame.COURSE_START + want) {
    throw new Error(`${id}: the run laid ${next - frame.COURSE_START} tiles, not ${want}`);
  }
  // Every seam cell of the frame carries the run (the next frame picks
  // it up with no hole: lint.seamJoined walks the whole line).
  for (const [x, y] of frame.SEAM) {
    const t = ctx.get(x, y);
    if (t !== Tile.CourseWall && t !== Tile.CourseStile && t !== Tile.PlumbStone) throw new Error(`${id}: the seam (${x},${y}) carries no course tile`);
  }
  return next;
}

/**
 * COURSE_A — THE BELT RUN. SENTENCE: the head run leaves the lip and
 * the wood refuses the row (three trunks stand on y 267 west of the
 * seam), so the Marl set the line north along the wood's own edge,
 * turned it west where the trunks thin and north again toward the
 * water; the fortieth stone from the gap stands on the straight at
 * (148,248).
 */
export function courseA(ctx: SettCtx): void {
  ctx.box(141, 239, 149, 267, 'course_a: THE BELT RUN');
  layRun(ctx, 'course_a');
}

/**
 * COURSE_B — THE BANK RUN and THE FORD. SENTENCE: the line runs the
 * brook's east bank on the sand itself, a wall between the water and
 * the wood, to the one place the Marl set stones in the bed; the bank
 * stones stand where the line breaks for the water (ford.ts).
 */
export function courseB(ctx: SettCtx): void {
  const { FORD } = ctx.pins;
  ctx.box(134, 205, 143, 236, 'course_b: THE BANK RUN and THE FORD');
  layRun(ctx, 'course_b', { plumbAt: [FORD.EAST_STONE, FORD.WEST_STONE], wet: FORD.WET });
  ford(ctx);
}

/**
 * COURSE_C — THE STRIP RUN. SENTENCE: over the ford the line keeps its
 * row across the open grass and into the wood, and where two trunks
 * stand on the row it steps north one and goes on; the wood was there
 * first and the Dolmen fell no wood.
 */
export function courseC(ctx: SettCtx): void {
  ctx.box(85, 205, 131, 208, 'course_c: THE STRIP RUN');
  layRun(ctx, 'course_c');
  // THE STEP. SENTENCE: the bend is the trunks' sentence, not the
  // Marl's; both stand one row south of the row the line left.
  const { CROWNED } = ctx.pins;
  for (const { cell, trunk } of CROWNED.course_c) {
    if (ctx.fieldFree(trunk[0], trunk[1])) throw new Error(`course_c: (${trunk[0]},${trunk[1]}) is no trunk; the WATCH for (${cell[0]},${cell[1]}) is stale`);
  }
}
