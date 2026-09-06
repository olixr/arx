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
 * short count. TERTIARY the two setters (people.ts); the foot apron
 * and the three lines (ground.ts).
 */
import { Tile } from '@arx/shared';
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
}
