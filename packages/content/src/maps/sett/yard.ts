/**
 * THE SETT (contested lands, band 9d) — yard.ts. S6 THE WEIGHT-YARD
 * (the −1 ring, west).
 *
 * SENTENCE (the scene's): the Gossan keep the weight where the ring
 * is widest and the sun is last, walled square with the stile as its
 * one door, because a count is kept inside a wall.
 *
 * PRIMARY the cart BESIDE its short wall (never merged, 9b R-1); the
 * row of the taken. SECONDARY Vorl's north course with THE STILE as
 * the yard's one door; the south course; P2. TERTIARY Chalkline C2
 * (the wall for the forty, chalked and not set: the one honest bid,
 * on the ground); one rubble; Vorl and the two weightkeepers
 * (people.ts). The tape moved the two courses' ends to the rim and C2
 * one row north (pins.ts says why); lint.yardSealed proves the door.
 */
import { Detail, Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function yard(ctx: SettCtx): void {
  const { pins } = ctx;
  const { YARD } = pins;
  ctx.box(154, 287, 164, 300, 'yard: THE WEIGHT-YARD');

  // VORL'S NORTH COURSE and THE STILE. SENTENCE: one stone sets a
  // step; set it and pass. The stile is the yard's one door and the
  // wall runs rim to rim either side of it.
  for (let x = YARD.NORTH_COURSE.x0; x <= YARD.NORTH_COURSE.x1; x++) {
    const stile = x === YARD.VS[0];
    ctx.put(x, YARD.NORTH_COURSE.y, stile ? Tile.CourseStile : Tile.CourseWall);
  }
  // THE SOUTH COURSE. SENTENCE: a count is kept inside a wall, and the
  // wall closes on the south as it does on the north.
  for (let x = YARD.SOUTH_COURSE.x0; x <= YARD.SOUTH_COURSE.x1; x++) ctx.put(x, YARD.SOUTH_COURSE.y, Tile.CourseWall);

  // THE CART BESIDE ITS WALL. SENTENCE: they took the whole stone cart
  // and built a wall beside it; the cart stands where it was put down,
  // its shafts on their own open foot.
  ctx.put(YARD.CART[0], YARD.CART[1], Tile.BrokenCart);
  for (let x = YARD.CART_WALL.x0; x <= YARD.CART_WALL.x1; x++) ctx.put(x, YARD.CART_WALL.y, Tile.CourseWall);

  // THE ROW OF THE TAKEN. SENTENCE: a post line unpicked and two
  // Returner stakes pulled, laid in a row at one-tile pitch like the
  // dead, because that is how a Dolmen lays a thing it has taken.
  for (const [x, y] of YARD.CHARTER_POSTS) ctx.put(x, y, Tile.CharterPost);
  for (const [x, y] of YARD.PIT_LAMPS) ctx.put(x, y, Tile.PitLampDark);

  // P2. SENTENCE: the yard's own stone, hung true, in the corner the
  // sun reaches last.
  ctx.put(YARD.P2[0], YARD.P2[1], Tile.PlumbStone);

  // C2. SENTENCE: a wall for forty, chalked at the cart wall's foot and
  // not set; the one honest bid on the table, on the ground.
  for (const [x, y] of YARD.C2) ctx.detail(x, y, Detail.Chalkline);

  // THE RUBBLE. SENTENCE: one heap in the yard's south-west, the
  // weight's own spoil.
  ctx.rubble(YARD.RUBBLE[0], YARD.RUBBLE[1]);
}
