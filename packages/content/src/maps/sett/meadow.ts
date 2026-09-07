/**
 * THE STANDING COURSE (contested lands, band 9e) — meadow.ts. S10 THE
 * LAST COURSES and SARSEN'S CORNER (frame MEADOW; brief §1.2, §2).
 *
 * SENTENCE (the scene's): Sarsen stands where the Course ends in the
 * meadow's sheet because the crofters walk here and the small diggers
 * restack the cairn here every night.
 *
 * GROUND FIRST: the two sheets (WaterShallow, the patch's own small
 * sheet; band 10 owns the belt's), the wall's row IN the south sheet
 * so the last courses stand with their feet in the water, THE DRY
 * STRIP between them worn Dirt (the sheep's ground). Then PRIMARY the
 * last courses (the brush, counter 147..165) and the sheet; SECONDARY
 * the END stone, the cairn, the counter's own stile at (74,206);
 * TERTIARY Sarsen and the sheep (people.ts), nothing else. No board
 * (the count is spoken), no lamp, no timber, no wear but the strip
 * and Sarsen's own two cells.
 */
import { Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function meadow(ctx: SettCtx): void {
  const { pins, frame, wear } = ctx;
  const { MEADOW_SCENE: M, POSTS_MEADOW } = pins;
  ctx.box(60, 200, 83, 212, 'meadow: THE LAST COURSES and SARSEN\'S CORNER');

  // G1 THE SHEETS. SENTENCE: the meadow drowned when the ground went
  // soft, and the water stands in two sheets either side of the one
  // strip the wall keeps dry. The north band's edges are ragged all
  // round; the south band holds its north edge whole because the last
  // courses stand on it with their feet in the water.
  ctx.sheet(M.NORTH_BAND.x0, M.NORTH_BAND.y0, M.NORTH_BAND.x1, M.NORTH_BAND.y1);
  ctx.sheet(M.SOUTH_BAND.x0, M.SOUTH_BAND.y0, M.SOUTH_BAND.x1, M.SOUTH_BAND.y1, ['n']);
  // SENTENCE: every last course stands with its feet in the water,
  // whatever the rag said about the band's east corner.
  for (let x = M.WALL_ROW.x0; x <= M.WALL_ROW.x1; x++) ctx.wetCell(x, M.WALL_ROW.y);
  // SENTENCE: the cairn is half in the sheet by adjacency, whatever
  // the ragged edge said about its one cell.
  ctx.wetCell(M.CAIRN_WATER[0], M.CAIRN_WATER[1]);

  // G2 THE DRY STRIP. SENTENCE: the only dry ground in the Drowned
  // Meadow; the sheep stand on it and the crofters call it the Course.
  // Worn ragged, never a rectangle; the worldgen trunk on it stands.
  wear.rect(M.STRIP.x0, M.STRIP.y0, M.STRIP.x1, M.STRIP.y1);
  for (const [x, y] of [M.CAIRN_STOP, [POSTS_MEADOW.dolmen_sarsen.x, POSTS_MEADOW.dolmen_sarsen.y]] as const) ctx.put(x, y, Tile.Dirt);

  // THE LAST COURSES. SENTENCE: the Course ends here, in the sheet,
  // with its feet in the water; the count runs to the END stone.
  const next = ctx.course(pins.COURSE_PTS.meadow, { start: frame.COURSE_START, plumbAt: [M.END] });
  if (next !== pins.COURSE_END_COUNT) throw new Error(`meadow: the counter ends at ${next}, not ${pins.COURSE_END_COUNT}`);
  if (ctx.get(M.END[0], M.END[1]) !== Tile.PlumbStone) throw new Error('meadow: no END stone');
  ctx.occluder(M.END[0], M.END[1]);
  if (ctx.get(frame.SEAM[0]![0], frame.SEAM[0]![1]) !== Tile.CourseWall) throw new Error('meadow: the seam carries no course wall');

  // THE CAIRN. SENTENCE: the small diggers stack it every night with
  // one stone wrong and Sarsen sets it right every morning; neither
  // has said anything about it. FieldCairn always: the beat is his
  // walk and his line, never a tile that moves for everyone.
  ctx.put(M.CAIRN[0], M.CAIRN[1], Tile.FieldCairn);
}
