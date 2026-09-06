/**
 * THE SETT (contested lands, band 9d) — shelf.ts. S7 THE HEARTH-CELLS
 * (the −1 ring, east): the Culm's shelf, the set's only lights.
 *
 * SENTENCE (the scene's): the Culm keep the shelf the morning sun
 * reaches first and burn stone there because a hearth on the east
 * shelf is seen from the stairs and from nowhere topside.
 *
 * PRIMARY K1 and K2, corbel cells. SECONDARY EmberBed B1 and B2, each
 * in its ash (ground.ts lays the pan on the cardinals), flame-gated by
 * the shipped row, lit from dusk: the set's only lights
 * (lint.lightsCensus). TERTIARY three rubble (the seam's own, brought
 * up); Durrow and the two firekeepers (people.ts). No Chalkline: the
 * Culm burn; they do not set courses.
 */
import { Tile } from '@arx/shared';
import type { SettCtx } from './ctx.js';

export function shelf(ctx: SettCtx): void {
  const { pins } = ctx;
  const { SHELF } = pins;
  ctx.box(187, 287, 195, 300, 'shelf: THE HEARTH-CELLS');

  // K1 and K2. SENTENCE: two cells on the warm shelf with their doors
  // to the bowl.
  for (const [x, y] of [SHELF.K1, SHELF.K2]) {
    ctx.put(x, y, Tile.CorbelCell);
    ctx.occluder(x, y);
  }

  // B1 and B2. SENTENCE: wood burns out, stone burns on; two beds of
  // black stone from the seam, lit at dusk and never fed at dawn.
  for (const [x, y] of [SHELF.B1, SHELF.B2]) ctx.put(x, y, Tile.EmberBed);

  // THE RUBBLE. SENTENCE: the seam's own rubble, brought up with the
  // black stone and left at the rim's foot.
  for (const [x, y] of SHELF.RUBBLE) ctx.rubble(x, y);
}
