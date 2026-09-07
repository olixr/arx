/**
 * THE STANDING COURSE (contested lands, band 9e) — ford.ts. S9 THE
 * FORD OF SET STONES (inside frame COURSE_B).
 *
 * SENTENCE (the scene's): the Marl set stones in the brook's bed so
 * the water runs shallow over them; a set stone in the water is the
 * one crossing the Dolmen own.
 *
 * PRIMARY the four set stones under the water: the brush laid them
 * (course.ts, `wet`) as WaterShallow over the brook's own water cells
 * at y 207, counted 88..91, walkable, each with Detail.FordStone in
 * its bed (the slab the bake paints under the water's wash; the fix
 * pass, after the first cut's four bare water cells read as a paler
 * band of brook): the water runs shallow over them and a body wades
 * the crossing. SECONDARY the two bank stones,
 * PlumbStones the brush laid as LISTED silhouettes: east on the sand
 * one south of the turn (never at the corner), west on the grass
 * where the run goes on. TERTIARY nothing: the brook's own sand banks
 * are the ground and no wear is added (nobody stands here; the
 * carter's road is forty tiles north). This module only PROVES what
 * the brush laid, so the ford's sentence sits in one place.
 */
import { Detail, Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function ford(ctx: SettCtx): void {
  const { FORD } = ctx.pins;
  for (const [x, y] of FORD.WET) {
    if (ctx.get(x, y) !== Tile.WaterShallow) throw new Error(`ford: (${x},${y}) is not a set stone under the water`);
    if (ctx.detailAt(x, y) !== Detail.FordStone) throw new Error(`ford: (${x},${y}) carries no set slab in its bed`);
  }
  for (const [x, y] of [FORD.EAST_STONE, FORD.WEST_STONE]) {
    if (ctx.get(x, y) !== Tile.PlumbStone) throw new Error(`ford: no bank stone at (${x},${y})`);
    ctx.occluder(x, y);
  }
  if (ctx.get(FORD.TURN[0], FORD.TURN[1]) !== Tile.CourseWall) throw new Error('ford: the turn is not a course wall');
}
