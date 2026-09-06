/**
 * THE SETT (contested lands, band 9d) — rimset.ts. S2 THE RIM-SET (the
 * −1 ring, north): the Marl's two cells and the dead-row.
 *
 * SENTENCE (the scene's): the Marl came up first and set nearest the
 * way out; their cells face the stairs so a stone coming down is seen
 * before it lands.
 *
 * PRIMARY M1 and M2, corbel cells (FADE_TALL, light-blocking: each is
 * registered as an occluder and no post stands in its south shadow).
 * SECONDARY the dead-row (CourseWall x5) with P1 at its head: a Course
 * is also a grave-row; the row is short because eleven winters is a
 * short count; the laid course to the core steps (ground.ts) with C4
 * chalked at its end. TERTIARY the two setters (people.ts); the foot
 * apron and the two worn lines (ground.ts); the crown spoil; the west
 * foot's rubble; E2 THE WEST TONGUE (the mask's, pins.ts).
 */
import { Detail, Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function rimset(ctx: SettCtx): void {
  const { pins } = ctx;
  const { RIMSET } = pins;
  ctx.box(155, 270, 186, 283, 'rimset: THE RIM-SET');

  // M1 and M2. SENTENCE: two cells, one each side of the way down,
  // both with their doors to the stairs.
  for (const [x, y] of [RIMSET.M1, RIMSET.M2]) {
    ctx.put(x, y, Tile.CorbelCell);
    ctx.occluder(x, y);
  }

  // THE DEAD-ROW. SENTENCE: the dead are laid in a course and
  // dry-stoned over; the row is five long and the stone at its head is
  // hung true.
  for (let x = RIMSET.DEADROW.x0; x <= RIMSET.DEADROW.x1; x++) ctx.put(x, RIMSET.DEADROW.y, Tile.CourseWall);
  ctx.put(RIMSET.P1[0], RIMSET.P1[1], Tile.PlumbStone);

  // C4. SENTENCE: the laid course stops three short of the crown; the
  // three are chalked and not set, because the count of stones has
  // not come back.
  for (const [x, y] of RIMSET.C4) ctx.detail(x, y, Detail.Chalkline);

  // THE CROWN SPOIL. SENTENCE: what came off the core's north face
  // when the Marl cut the steps, tipped beside the crown and left.
  for (const [x, y] of RIMSET.CROWN_SPOIL) ctx.put(x, y, Tile.SpoilHeap);

  // THE WEST FOOT. SENTENCE: the west rim sheds and nobody clears the
  // west, where nobody walks; the rubble runs to the dead-row.
  for (const [x, y] of RIMSET.WEST_FOOT) ctx.rubble(x, y);
}
