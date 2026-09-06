/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — line.ts.
 *
 * THE LINE (brief §2.6): the Court's word strung across a wood that
 * heats a village, as an L on the two sides an axe comes from — the
 * SOUTH LEG along y -184 from the head stone by the junction west to
 * the corner, and the WEST LEG up x -150 to where the wood gives out.
 * The water keeps the third side and the glade the fourth. 28 tiles of
 * WardThread, walkable, with NO light by law (lights.ts refuses the
 * thread a row); every tile is a knot and a chip, and the painter
 * draws wands only at the two ends and the turn (owed F2, A5), which
 * is why the brush refuses a diagonal step and lint.oneLine pins
 * exactly two ends. Stepping over is free; the deliberate cut is the
 * evencourt deed (0.2 S), never a swing.
 *
 * GROUND: nothing under it (G5). SIGN: none — the Court letters
 * nothing. LIGHTS: none on the line. CAST HOOKS: the wolves' row walks
 * the south leg (people.ts). EMPTY: the stand's interior east of the
 * west leg, which is the wood fork B fells.
 */
import type { WardCtx } from './ctx.js';

export function line(ctx: WardCtx): void {
  const { pins } = ctx;
  // The line owns no scene box: it is the seam every other scene
  // abuts (the stones' boxes sit on it, the cut's face stops one tile
  // from it), and a seam declared as a box overlaps everything.

  // PRIMARY: the thread. SENTENCE: strung where the road can see it
  // and where the axe comes from, and nowhere the water or the glade
  // already keeps; the head stone's tile is the east end's neighbour,
  // the corner stone's the turn's, and the end stone's the last knot's.
  ctx.thread(pins.LINE_PTS);
}
