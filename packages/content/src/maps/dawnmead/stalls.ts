/**
 * DAWNMEAD UNDER SIEGE (band 6) — stalls.ts [L4 EAST].
 *
 * Sorrel's drover yard: down by the water where the beasts drink; the
 * one stall door every tamed friend walks through first; and this
 * year where the carts break.
 *
 * SCENES / BOXES (brief §3; the nested lean-to box is cut out of the
 * yard's so the pair are disjoint, and both start at x139 because the
 * Common's box (L3) reaches x138):
 *   D13 THE TACK LEAN-TO AND THE BROKEN CART (139,63)-(158,68)
 *   D13 SORREL'S YARD (139,69)-(158,89): rails with the south rail at
 *   y86 (J5), the troughs, the sign
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G24 water way through the yard (x147-148 y60..69 and y88..110),
 *   G26 yard (x140..155 y70..85) + the keeper's gap (146..147,78)
 * GROUND ADDED HERE (inside the yard's own box): the south mouth's
 *   trodden tiles (147..148,86..87), the water way's two rows the
 *   brief's G24 names but ground.ts stops short of.
 * SIGNS IT QUEUES (strings FINAL in pins.SIGN_LEDGER):
 *   none: THE STALLS (149,89) is CUT by FIX PASS 1 (defect 2: one
 *   col from OTTERY'S WORKS in the true 48x45 eyeful); Sorrel's rails
 *   and the beasts at them speak; "Speak soft." is her bark.
 * CAST HOOKS (kept open; people.ts places the body):
 *   Sorrel post (144.5,74.5) / loop (147,78) (147,84) / trough stand
 *   (142,84); the north gap (147..148,69) and the south mouth
 *   (145..148,86); her night path north (147,69) (147,60); BrokenCart
 *   (151,64) off the way.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands; gates authored open (ruling Kit 14: a RailWood run with a
 * one-tile gap, never a FenceGate); wear is a wobbling one-wide Dirt
 * line or an ellipse, never a rectangle; one Signpost per eyeful.
 * Never b.sign / b.actor / b.npcSpawn / b.scatter* / b.spawn / b.raise
 * / b.stairs, or b.setDetail on open ground. CONTENT BOUNDARY holds;
 * no dashes in any player-facing string.
 */
import { Detail, Tile, awningTile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function stalls(ctx: DawnCtx): void {
  const { b } = ctx;

  ctx.box(139, 63, 158, 68, 'D13 THE TACK LEAN-TO AND THE BROKEN CART');
  ctx.box(139, 69, 158, 89, "D13 SORREL'S YARD");

  // ================================================================
  // D13 THE DROVER YARD (south rail y86, J5).
  // SENTENCE: down by the water where the beasts drink; the one stall
  // door every tamed friend walks through first; and this year where
  // the carts break.
  // ================================================================
  // The rail ring x139..156 y69..86 with its gates authored OPEN as
  // one-tile gaps in the run: the north gate (147..148,69) where the
  // water way comes in from Weir's (PIN stop (147,69)); the south
  // mouth (145..148,86) where it goes out to the lane; and the east
  // gap (156,77..80) where the beasts go down to the shallows to
  // drink. The ground under every gap is the ground it always was.
  ctx.pen(139, 69, 18, 18, {
    rail: Tile.RailWood,
    gaps: [
      { side: 'n', at: 8 }, { side: 'n', at: 9 },
      { side: 's', at: 6 }, { side: 's', at: 7 }, { side: 's', at: 8 }, { side: 's', at: 9 },
      { side: 'e', at: 8 }, { side: 'e', at: 9 }, { side: 'e', at: 10 }, { side: 'e', at: 11 },
    ],
  });
  // The cross rail at y78 splits the yard into the beasts' pen north
  // and the working half south; the keeper's gap (146..147,78) is
  // Sorrel's own door between them (PIN stop (147,78); G26 laid it).
  for (let x = 140; x <= 155; x++) {
    if (x === 146 || x === 147) continue;
    b.set(x, 78, Tile.RailWood);
  }
  // The south mouth's two trodden rows (147..148,86..87): the water way
  // walks through the yard and out to the lane on one line of dirt;
  // ground.ts's G24 stops at y88 and the yard's fill at y85, so the
  // mouth's own two rows are laid here, inside this box.
  for (const [x, y] of [[147, 86], [148, 86], [147, 87], [148, 87]] as const) b.set(x, y, Tile.Dirt);

  // The BeastPen (PIN singleton): the stall door every tamed friend in
  // the world walks through first.
  b.set(143, 73, Tile.BeastPen);
  ctx.station(143, 73);
  // Two feed troughs at the pen's north rail, one for each kind of
  // mouth she keeps.
  b.set(141, 71, Tile.FeedTrough).set(153, 71, Tile.FeedTrough);
  // The water trough at the working half's south-west corner (PIN loop
  // target; the stand (142,84) stays open dirt beside it).
  b.set(141, 84, Tile.WaterTrough);
  // The gnaw trough: the salt lick the cows walk from the Common for.
  b.set(151, 74, Tile.GnawTrough);
  // The beast nest in the working half: straw where a sick one lies.
  b.set(150, 82, Tile.BeastNest);
  // Hay bales against the south-east rail, this year's second cutting.
  b.set(154, 83, Tile.HayBale).set(155, 84, Tile.HayBale);
  // Straw trodden into the dirt where the beasts stand longest.
  ctx.detail(145, 75, Detail.Straw);
  ctx.detail(152, 79, Detail.Straw);
  ctx.detail(142, 81, Detail.Straw);
  ctx.detail(148, 85, Detail.Straw);
  // Sorrel's post (PIN) in the pen facing west, talking to the animals
  // more than the owners.
  ctx.post(144, 74);

  // SIGN: none. THE STALLS board (149,89) is CUT (FIX PASS 1, defect
  // 2): it stood one col and twenty rows from OTTERY'S WORKS, one
  // eyeful at the shipped camera; the rails and the beasts at them are
  // the sign, and "Sorrel's yard. Speak soft." is her bark.

  // ================================================================
  // D13 THE TACK LEAN-TO AND THE BROKEN CART.
  // SENTENCE: the yard's head: a stub wall, a board roof, the rail a
  // buyer ties to, a third post now for the carts that come off the
  // road, and the cart whose axle went at her gate, dragged off the
  // way and being fixed because nobody asked her to.
  // ================================================================
  // The stub wall the tack hangs on (a WALL_RUN member: no sign here).
  b.set(144, 66, Tile.WallWood).set(145, 66, Tile.WallWood).set(146, 66, Tile.WallWood);
  // The board roof under it (host law: the tile north of every awning
  // is the stub wall), in the drover's woad.
  b.set(144, 67, awningTile('board', 2)).set(145, 67, awningTile('board', 2)).set(146, 67, awningTile('board', 2));
  // The tool rack under the roof and the crate of tack beside it.
  b.set(144, 68, Tile.ToolRack).set(146, 68, Tile.Crate);
  // The two hitching posts a buyer ties to, and NEW the third, for the
  // carts that come off the road and cannot go on.
  b.set(150, 67, Tile.HitchingPost).set(152, 67, Tile.HitchingPost);
  b.set(154, 67, Tile.HitchingPost);
  // NEW: the cart whose axle went at her gate, dragged onto the water
  // way's east shoulder (three cols off x147-148 and off her night path
  // north) and being fixed; the ONE broken cart of the yard.
  b.set(151, 64, Tile.BrokenCart);
  // NEW: the litter outside the north gate where its load spilled and
  // was not all picked up.
  b.set(149, 68, Tile.FieldLitter);
}
