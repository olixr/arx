/**
 * THE SETT (contested lands, band 9d) — wetfloor.ts. S5 THE WET FLOOR
 * (the −2 core, south).
 *
 * SENTENCE (the scene's): the Sinter moved for water that came up
 * under them and set where the wet stands on the Sett's floor; they
 * stop at the ninth course.
 *
 * PRIMARY the water (ground.ts: 61 cells, the water IS the ground).
 * SECONDARY the ninth course, CourseWall x9 standing IN the water
 * (WET_STANDERS, E3: the bake reads the water's contour under it);
 * Drusa's cell, a CorbelCell with water south and west of it and Dirt
 * north: half in the wet. TERTIARY two rubble on the dry floor; the
 * Sinter's spoil heap and E3 their tongue (the mask's) at the west
 * face; the ledge at the south-west foot; Drusa and the two
 * wetsetters (people.ts).
 */
import { Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function wetfloor(ctx: SettCtx): void {
  const { pins } = ctx;
  const { WETFLOOR } = pins;
  ctx.box(165, 296, 186, 301, 'wetfloor: THE WET FLOOR');
  ctx.box(165, 287, 170, 295, 'wetfloor: THE SINTER\'S CUT');

  // THE NINTH COURSE. SENTENCE: four courses wet from the bottom row,
  // the top row last; the ninth is the last dry one and they stop at
  // it. The nine stand in the water with their feet in it.
  for (let x = WETFLOOR.NINTH.x0; x <= WETFLOOR.NINTH.x1; x++) {
    if (ctx.get(x, WETFLOOR.NINTH.y) !== Tile.WaterShallow) throw new Error(`wetfloor: (${x},${WETFLOOR.NINTH.y}) is not water under the ninth course`);
    ctx.put(x, WETFLOOR.NINTH.y, Tile.CourseWall);
  }

  // DRUSA'S CELL. SENTENCE: the one Sinter who comes up to say a thing
  // keeps a cell with its back to the wet and its door to the dry.
  const [dx, dy] = WETFLOOR.DRUSA_CELL;
  if (ctx.get(dx, dy) !== Tile.WaterShallow) throw new Error('wetfloor: Drusa\'s cell wants water under it (half in the wet)');
  ctx.put(dx, dy, Tile.CorbelCell);
  ctx.occluder(dx, dy);

  // THE RUBBLE. SENTENCE: the seam's spoil the Sinter set aside on the
  // dry floor, two heaps, nothing rolled.
  for (const [x, y] of WETFLOOR.RUBBLE) ctx.rubble(x, y);

  // THE SINTER'S SPOIL. SENTENCE: they dug for the water and the
  // barrow stopped here, at the west face beside their tongue; the
  // heap is where it tipped.
  ctx.put(WETFLOOR.SPOIL[0], WETFLOOR.SPOIL[1], Tile.SpoilHeap);

  // THE LEDGE. SENTENCE: a bench of the floor's own rock the water did
  // not reach, at the south-west foot; nobody cut it because nobody
  // needed to.
  for (const [x, y] of WETFLOOR.LEDGE) ctx.put(x, y, Tile.Rock);
}
