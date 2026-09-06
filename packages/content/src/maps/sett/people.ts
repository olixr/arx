/**
 * THE SETT (contested lands, band 9d) — people.ts.
 *
 * THE ELEVEN BODIES AND THE ONE ROW THE ZONE PLACES (brief §4; R-F:
 * twelve bodies, mostly holdfast, guard temperament that never
 * initiates, ONE loop). This is the one module that calls b.actor and
 * b.npcSpawn, and it runs LAST, after every scene has kept its post
 * open.
 *
 * THE POST IS THE ORIGIN: each placement is pins.POSTS verbatim, so
 * the body's tile and its routine's offsets argue with one constant;
 * every row carries an authored `dir` (a wander's walk-in facing
 * becomes the rest anchor, so a post never faces the bowl on its
 * own). No beds: the Dolmen own no timber; the cells are their houses
 * and have no door; every body stands day and night at its post but
 * for its one slot. The named defs `dolmen_ammat`, `dolmen_drusa`,
 * `dolmen_durrow` and the mouth `dolmen_vorl`, and the routine
 * `dolmen_wet`, are L3's; the server warns once and stands each body
 * mute until they land. The pooled four (`dolmen_setter`,
 * `dolmen_wetsetter`, `dolmen_firekeeper`, `dolmen_weightkeeper`) and
 * `dolmen_set` are 9c's and stand now.
 *
 * VORL'S ROW (R-C, E1): the one spawn row, through the builder's
 * passthrough: the champion at his own level, named, mouthed, tribe
 * dolmen, passive, on a vigil post. Never crowned.
 */
import type { SettCtx } from './ctx.js';

export function people(ctx: SettCtx): void {
  const { b, pins } = ctx;
  const { ORIGIN } = ctx.frame;
  const local = (x: number, y: number): [number, number] => [x - ORIGIN.x + 0.5, y - ORIGIN.y + 0.5];

  // The eleven, in the table's order: the three named, then the
  // pooled pairs set by set (the lip, the wet, the shelf, the yard).
  for (const p of Object.values(pins.POSTS)) {
    b.actor(p.slug, ...local(p.x, p.y), p.dir, p.routine);
    ctx.post(p.x, p.y);
  }

  // VORL FULLWEIGHT in the yard's middle, the cart at his back and the
  // row at his feet.
  const v = pins.VORL_ROW;
  b.npcSpawn(v.npc, v.seat[0] - ORIGIN.x, v.seat[1] - ORIGIN.y, v.radius, v.count, {
    level: v.level,
    name: v.name,
    mouth: v.mouth,
    tribe: v.tribe,
    passive: v.passive,
    post: { kind: v.post.kind, x: v.post.x - ORIGIN.x, y: v.post.y - ORIGIN.y, dir: v.post.dir },
  });
  ctx.post(v.seat[0], v.seat[1]);
}
