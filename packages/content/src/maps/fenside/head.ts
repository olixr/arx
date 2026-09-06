/**
 * THE FEN WAIST (contested lands, band 7) — head.ts.
 *
 * THE CAUSEWAY HEAD, layout W (brief §2.5, chosen by 0.2 K's
 * measurement: the rect's east edge is x 141, short of 150, so the
 * head stands on the WEST bank north of the road at the ford's
 * north-west corner; boxes (127,77)-(133,80) and (128,81)-(131,82),
 * the yard and its approach). The Charter's counter
 * under canvas, the pallets the levy book stays dry on, the lantern
 * pair, the weld pennant, the corn and the oil, the coin box, and the
 * spoil bank marching east to the water.
 *
 * Two cells moved off the brief's letter by the real bank (pins.ts):
 * the barrels from (133,79), a shallows cell, to (132,80) beside the
 * counter; the chest from (132,78), the swamp rim, to (129,78) on the
 * apron west of the canvas's skirt (the LeanTo reaches west, E5, so
 * (130,78) is its open foot); the spoil heaps from the water at
 * (134,78)/(135,80) to the bank's apron at (129,77)/(130,77),
 * marching east to the rim.
 *
 * GROUND (ground.ts): G5 the apron and the approach.
 * SIGN: none at the head. THE WATER MARK is the mark-post (R2).
 * CAST HOOKS: none placed here; Ingram (a POI body at the crofts)
 * walks to pins.HEAD_CUSTOMER each morning (L2's routine).
 * LIGHTS: the lantern pair, prop-glow; if it burns at noon it is gated
 * like the brazier (E6, L6's).
 * E5: the LeanTo's second foot (130,78), its west skirt, stays open.
 * THE FELLING (pins.HEAD_FELL): the oaks around the canvas, (128,82)
 * above all, painted over the pennant and the pallets at the true
 * frame; the Charter cleared its bank, and the grass is the bank's own.
 * EMPTY: the crossing itself; the far bank between the water and the
 * crofts' pad.
 */
import { Tile, bannerStandTile } from '@arx/shared';
import type { FenCtx } from './ctx.js';

export function head(ctx: FenCtx): void {
  const { pins } = ctx;
  ctx.box(127, 77, 133, 80, 'head: THE CAUSEWAY HEAD');
  ctx.box(128, 81, 131, 82, 'head: THE APPROACH');

  // PRIMARY: the counter. SENTENCE: the counter is where the terms are
  // and Ingram did not write them.
  ctx.put(pins.HEAD_COUNTER[0], pins.HEAD_COUNTER[1], Tile.Counter);
  ctx.station(pins.HEAD_COUNTER[0], pins.HEAD_COUNTER[1]);

  // PRIMARY: the canvas north of the counter, open south. SENTENCE:
  // a Charter man works under canvas at the ford and sleeps at the
  // crofts; the levy book comes in out of the rain here.
  ctx.put(pins.HEAD_LEANTO[0], pins.HEAD_LEANTO[1], Tile.LeanTo);

  // SECONDARY: the pallets, WoodFloor on Dirt one row back from the
  // rim (G-5 avoided: pallets over water have no legs). SENTENCE: boards
  // laid so the levy book stays dry.
  for (const [x, y] of pins.HEAD_FLOOR) ctx.put(x, y, Tile.WoodFloor);

  // SECONDARY: the lantern pair. SENTENCE: the Charter lighting what it
  // bills, the only warm light between the gate lamps and Hale's.
  for (const [x, y] of pins.HEAD_LANTERNS) ctx.put(x, y, Tile.StreetLantern);

  // SECONDARY: the pennant, weld and never madder (J10). SENTENCE: whose
  // ground you are on at a glance.
  ctx.put(pins.HEAD_BANNER[0], pins.HEAD_BANNER[1], bannerStandTile(pins.DYE_FORDGATE));

  // SECONDARY: the corn and the oil. SENTENCE: the crate stack is corn
  // taken off the pallets at the ford price, the barrels the oil the
  // order refused.
  ctx.put(pins.HEAD_CRATE[0], pins.HEAD_CRATE[1], Tile.CrateGoods);
  ctx.put(pins.HEAD_BARRELS[0], pins.HEAD_BARRELS[1], Tile.BarrelStack);

  // SECONDARY: the coin box, warded by the bar (0.2 G). SENTENCE: the
  // levy's coin box, under the Company's eye like everything at this
  // ford; it opens for the one character who broke the crew, and for
  // nobody else while they stand.
  ctx.chest(pins.HEAD_CHEST[0], pins.HEAD_CHEST[1], pins.CHEST_BINDING.table, pins.CHEST_BINDING.wardedBy);

  // SECONDARY: the spoil bank marching east toward the water. SENTENCE:
  // the dike's digging, piled where the water can see it. The Course's
  // forty stones are in it and the ledger says "field" (T50, never
  // spoken here).
  for (const [x, y] of pins.HEAD_SPOIL) ctx.put(x, y, Tile.SpoilHeap);
}
