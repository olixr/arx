/**
 * THE SETT (contested lands, band 9d) — head.ts. S1 THE HEAD (the
 * lip, level 0).
 *
 * SENTENCE (the scene's): the Marl set the Course's head where the
 * ground first holds above the bowl, and the stake man took forty off
 * it because it was the nearest kerb to his track.
 *
 * PRIMARY the head run (the brush from the gap west to the seam, the
 * counter at 0 on the gap: a stile at twelve, the seam cell under THE
 * SEAM EXEMPTION); the gap itself; the stair crown (ground.ts).
 * SECONDARY P0 the threshold PlumbStone one east of the crown (the
 * base tier-3 line is the lip itself, so the threshold mark and the
 * Course's head are one prop, R-A); the stile at (157,267).
 * TERTIARY Chalkline C1 north of the wall beside the gap (where the
 * forty will go back); DragFurrow x2 (the track's last two wheel
 * marks); Ammat (people.ts).
 */
import { Detail, Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function head(ctx: SettCtx): void {
  const { pins } = ctx;
  const { HEAD, SEAM } = pins;
  ctx.box(150, 266, 176, 267, 'head: THE HEAD');

  // THE HEAD RUN and THE NORTH GAP. SENTENCE: a course should stand
  // at the gap and does not; the stake man's forty came off the north
  // end and the run west of it is what he left. The counter starts on
  // the gap and leaves the frame at 20 for 9e's COURSE_A.
  const next = ctx.course(HEAD.RUN_PTS, { start: ctx.frame.COURSE_START });
  if (next !== ctx.frame.COURSE_START + HEAD.RUN_TILES) {
    throw new Error(`head: the run laid ${next - ctx.frame.COURSE_START} tiles, not ${HEAD.RUN_TILES}`);
  }
  if (ctx.get(HEAD.GAP[0], HEAD.GAP[1]) !== Tile.CourseStile) throw new Error('head: the gap is not a stile');
  if (ctx.get(SEAM[0], SEAM[1]) !== Tile.CourseWall) throw new Error('head: the seam cell is not a course wall');

  // P0 THE THRESHOLD. SENTENCE: the head's stone marks where the
  // Course begins and where the country past the lamps begins, and
  // those are the same place.
  ctx.put(HEAD.P0[0], HEAD.P0[1], Tile.PlumbStone);

  // C1. SENTENCE: the chalk says where the forty go back; nobody has
  // set a stone on it in a year.
  for (const [x, y] of HEAD.C1) ctx.detail(x, y, Detail.Chalkline);

  // THE FURROWS. SENTENCE: the stone track's last two wheel marks,
  // and nothing more; the track to the ford stays unauthored.
  for (const [x, y] of HEAD.FURROWS) ctx.detail(x, y, Detail.DragFurrow);
}
