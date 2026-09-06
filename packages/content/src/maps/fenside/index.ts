/**
 * THE FEN WAIST (contested lands, band 7) — THE COMPOSITION (L1 FRAME).
 *
 * The thin authored band around the First Road's one crossing of the
 * channel, 148 tiles from Dawnmead's gate (docs/contested-lands-plan.md
 * §3.1; band7 rulings R2, R3, R4): the tier-2 cairn at its west edge,
 * the Company's bar on the road's west approach, Brede's mark-post in
 * the water, the Charter's dike line driven into the channel below the
 * deck with the Company's rags meeting it, and the causeway head under
 * canvas on the west bank north of the road. A SMALL AUTHORED ZONE on
 * the Dawnmead module pattern COPIED: the ctx, the pins, the lints,
 * one scene module per scene, a sentence above every placement. The
 * road bed, the shallows and the shoulders are in it and only a zone
 * may author beside them; the bodies of the bar and the crofts are
 * the two pinned POIs either side of it, whose footprints the rect
 * was measured to stay clear of.
 *
 * THE ORDER, which is the whole law of this file:
 *   makeCtx → ground (G1-G5) → the cairn and the bar → the dike line →
 *   the head (with the warded chest) → people → the deferred details →
 *   the sign flush (no board here) → growth 'wild' → build.
 *
 * LAWS THIS FRAME KEEPS:
 * - The base is TILE_SKIP; the border ring publishes no edge profile.
 * - The bed stays TILE_SKIP but the two BAR_GAP cells (the north post
 *   and the stepped tooth), and the gap (129,88) is walkable and the
 *   only passable cell in its column between the teeth (lint.gapOpen).
 * - Every authored shoulder cell is listed with its reason.
 * - No board: one Signpost per eyeful, and the neighbours' boards
 *   stand 68 west and 30 east.
 * - The chest is bound to the bar's site id and the camp's own table
 *   (0.2 G): one clear opens both boxes.
 * - growth 'wild'; byte-identical across builds (fenRng is pure).
 */
import { TILE_SKIP, type Tile } from '@arx/shared';
import { ZoneBuilder } from '../builder.js';
import type { ZoneDef } from '../types.js';
import { bar } from './bar.js';
import { makeCtx, type FenRegistry } from './ctx.js';
import { dike } from './dike.js';
import { ground } from './ground.js';
import { head } from './head.js';
import { people } from './people.js';
import { ORIGIN, PINS } from './pins.js';

/**
 * Build the fen waist and hand back the scenes' registry with it, for
 * the lints (fenside.test) and the block-out shots.
 */
export function buildFensideWithRegistry(): { zone: ZoneDef; registry: FenRegistry } {
  // G0 THE BASE — 24x25 at world (118,76), transparent: the channel,
  // the deck, the shoulders and the fen's forest show through until a
  // scene authors a cell.
  const b = new ZoneBuilder('fenside', 'The Fen Waist', { x: ORIGIN.x, y: ORIGIN.y }, PINS.WIDTH, PINS.HEIGHT, TILE_SKIP as unknown as Tile);
  const { ctx, registry } = makeCtx(b);

  // THE GROUND FIRST (G1-G5), then the scenes west to east, then the
  // one body.
  ground(ctx);
  bar(ctx);
  dike(ctx);
  head(ctx);
  people(ctx);

  // The deferred details land over the props; the sign flush stands
  // for the pattern (no board is queued here).
  for (const d of registry.details) b.setDetail(d.x - ORIGIN.x, d.y - ORIGIN.y, d.d);
  for (const s of registry.signs) b.sign(s.x - ORIGIN.x, s.y - ORIGIN.y, s.title, [...s.lines], s.tile);

  // G-3: authored wilderness, untended.
  b.growth('wild');
  return { zone: b.build(), registry };
}

/** The zone alone: the shape every registry and test consumes. */
export function buildFenside(): ZoneDef {
  return buildFensideWithRegistry().zone;
}
