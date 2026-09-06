/**
 * THE ASHLAMP (contested lands, band 7) — verge.ts.
 *
 * THE VERGE (brief §2.1; boxes (64,98)-(69,99) and (63,93)-(69,97)):
 * the stalled Charter wain on the east leg's north shoulder under the
 * oaks (pins.ts says why it left the south shoulder) with Margit's
 * tally board propped against it, and the one dead tree lateral to
 * the road. Everything else east of the wain is EMPTY ON PURPOSE: the
 * long dry begins at the rect's edge and carries nothing for 54 tiles.
 *
 * GROUND (ground.ts): G3 the trodden patch under the wain.
 * SIGN: none (the shell's board is 8 tiles north; one per eyeful).
 * CAST HOOKS: none.
 * E5: the cart's second foot (66,98), its shafts to the west, is kept
 * open ground — never a solid tile, a route or a routine waypoint.
 */
import { Tile } from '@arx/shared';
import type { AshCtx } from './ctx.js';

export function verge(ctx: AshCtx): void {
  const { pins } = ctx;
  ctx.box(64, 98, 69, 99, 'verge: THE STALLED CHARTER WAIN');
  ctx.box(63, 93, 69, 97, 'verge: THE DEAD TREE');

  // ================================================================
  // SECONDARY: the stalled Charter wain. SENTENCE: the cart that turned
  // at the fen waist and did not turn far. Under tarp because the
  // carter meant to come back, and the road has not dried. One of
  // Margit's four. One of Leif's three.
  // ================================================================
  const w = pins.WAIN;
  ctx.put(w.cart[0], w.cart[1], Tile.BelongingsCart);
  // The second foot (E5): open trodden ground where the shafts reach.
  ctx.put(w.foot[0], w.foot[1], Tile.Dirt);
  ctx.put(w.goods[0], w.goods[1], Tile.CrateGoods);

  // SECONDARY: Margit's tally board, propped by the wain, its face
  // south to the road. SENTENCE: the Charter's number, posted where
  // the carts turned so anyone can argue with it.
  ctx.put(pins.LECTERN[0], pins.LECTERN[1], Tile.Lectern);

  // ================================================================
  // TERTIARY: one dead tree, lateral to the road. SENTENCE: the one
  // snag on the skyline between the scar and the waist (A5's timber
  // law is band 10's). The living wood around it is felled first
  // (pins.DEAD_TREE_FELL): a snag inside a canopy is no silhouette,
  // and the fire that took the waystation took the trees beside it.
  // ================================================================
  const df = pins.DEAD_TREE_FELL;
  ctx.fell(df.x0, df.y0, df.x1, df.y1);
  // The oaks east of the cart on the wain's own row come down too;
  // the cart keeps the ones it pulled in under (pins.DEAD_TREE_FELL_ROW).
  for (const dr of pins.DEAD_TREE_FELL_ROW) ctx.fell(dr.x0, dr.y0, dr.x1, dr.y1);
  // The two oaks the wain pulled in under are the SCENE'S, not the
  // field's: THE WOOD LEARNS TO BREATHE (3af57ada) thins and weeds the
  // worldgen forest, and a sentence that leans on a worldgen trunk dies
  // with the next forest law. SENTENCE: the drover pulled the wain off
  // the road under the only two crowns that stood close enough together
  // to keep the rain off the tarp.
  for (const [ox, oy] of pins.WAIN_OAKS) ctx.put(ox, oy, Tile.TreeOak);
  ctx.deadTree(pins.DEAD_TREE[0], pins.DEAD_TREE[1]);
}
