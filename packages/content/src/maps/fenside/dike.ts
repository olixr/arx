/**
 * THE FEN WAIST (contested lands, band 7) — dike.ts.
 *
 * THE DIKE LINE (brief §2.5; box (132,81)-(140,81)): the Charter's
 * stakes and rails driven across the channel at the crossing's
 * upstream lip, two rows above the deck, from the head's bank to the
 * far bank; the Company's rag line (bar.ts) runs up the shoulder to
 * meet it at the water. Everybody sees the line; nobody sees it
 * planted (plan §1 law 1). Why the upstream lip and not the brief's
 * downstream side: pins.ts, THE DIKE LINE.
 *
 * The line runs from the bank at (133,81) through the channel (the
 * middle stake stands in the water) to the far bank at (139,81): not
 * a dike yet, the promise of one, and the whole crossing staked.
 * Ingram's morning walk (L2's routine) stops at pins.LINE_END_STAND
 * and pins.LINE_MIDDLE_STAND (the field's own bank and shallows).
 *
 * GROUND (ground.ts): none of its own; the bank and the water are
 * worldgen's under the stakes (G-2 bakes the water beneath the wet ones).
 * SIGN: none. CAST HOOKS: Ingram's stops (a POI body; the zone places nobody here).
 * EMPTY: the channel north of the line to the rect's top (the shoal's
 * bank: shore rows and nothing authored).
 */
import { Tile } from '@arx/shared';
import type { FenCtx } from './ctx.js';

export function dike(ctx: FenCtx): void {
  const { pins } = ctx;
  ctx.box(132, 81, 140, 81, 'dike: THE DIKE LINE');

  // PRIMARY: the dike's line, CharterPost every third cell with Fence
  // between, driven from bank to bank through the channel. SENTENCE:
  // staked and fenced to hold the spoil; the Charter's rail at (135,81)
  // stands one tile from the Company's last rag at (135,82) in the
  // shallows: the two claims touching, in one eyeful from the deck at
  // zoom 1.3, with Brede's mark-post beside them.
  ctx.stakeLine(pins.DIKE_LINE, Tile.CharterPost, 3, Tile.Fence);
}
