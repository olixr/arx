/**
 * THE FEN WAIST (contested lands, band 7) — people.ts.
 *
 * THE TWO BODIES THE ZONE PLACES (Ansel, band 7; Garrow, band 9e).
 * This is the one module that calls b.actor, and it runs LAST, after
 * every scene has kept its post open.
 * Every other body on the east is a POI's: Brede and his crew muster
 * on the bar's garrison rows, Hale, Halvor, Ingram, the two crofters,
 * the two skral and the watch stand on the crofts' actor rows (L2,
 * L3). No spawn clusters: the shore rows are worldgen's.
 *
 * THE POST IS THE ORIGIN: the placement is pins.POSTS verbatim, so the
 * body's tile and its routine's offsets argue with one constant.
 * bar.ts registered the seat through ctx.post for the occlusion lint;
 * the lint reads actorSpawns besides; nothing is registered twice.
 */
import type { FenCtx } from './ctx.js';

export function people(ctx: FenCtx): void {
  const { b, pins } = ctx;
  const { ORIGIN } = pins;
  // ANSEL THE DROVER, roped at the ankle to a cage he is not in,
  // because a man let out to sit is a better sign than a man in a
  // box: the wayside sit beside the cage, facing south to the road,
  // all day and all night, with a morning walk to nowhere
  // (`drover_held`, L2). The def `charter_drover` is L2's; the server
  // warns once and stands the seat mute until it lands.
  const p = pins.POSTS.charter_drover;
  b.actor(p.slug, p.x - ORIGIN.x, p.y - ORIGIN.y, p.dir, p.routine);
  // GARROW THE CARTER BOSS (band 9e): the stone yard's one body, on
  // the swamp rim east of the canvas, facing the counter and never
  // the bank; his sit and his walk are `garrow_yard`'s (L3). The def
  // `charter_garrow` is L3's; the server warns once and stands the
  // post mute until it lands.
  const g = pins.POSTS.charter_garrow;
  b.actor(g.slug, g.x - ORIGIN.x, g.y - ORIGIN.y, g.dir, g.routine);
}
