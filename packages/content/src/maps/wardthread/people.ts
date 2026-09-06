/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — people.ts.
 *
 * THE THREE BODIES AND THE ONE ROW THE ZONE PLACES. This is the one
 * module that calls b.actor and b.npcSpawn, and it runs LAST, after
 * every scene has kept its post open. Every other body north is a
 * POI's: Torsten, the sentinels, the keeper and the watch stand on
 * the fork rest's actor rows (L2's `at` posts); the gnolls and the
 * struck line muster on the husk's garrison; Hollowhowl's pack on the
 * den's.
 *
 * THE POST IS THE ORIGIN: each placement is pins.POSTS verbatim, so
 * the body's tile and its routine's offsets argue with one constant.
 * The defs `charter_bodil` (protection added) and `charter_feller`
 * (new, pooled) and the routines `bodil_cut` / `feller_cut` are L2's;
 * the server warns once and stands each body mute until they land.
 *
 * THE WOLVES ON THE LINE (0.2 L; A7's passthrough): wolf x2, tribe
 * predators, hours 19-06, seated on the south leg, walking it past
 * the head stone to the corner and back. `evencourt|predators`
 * neutral (shipped) is what lets the sentinels not care; the rest's
 * watch is fifteen off and never sees them; with the trail's five
 * they are Torsten's seven, and the count is true on the ground.
 */
import type { WardCtx } from './ctx.js';

export function people(ctx: WardCtx): void {
  const { b, pins } = ctx;
  const { ORIGIN } = ctx.frame;
  const local = (x: number, y: number): [number, number] => [x - ORIGIN.x + 0.5, y - ORIGIN.y + 0.5];

  // BODIL at the sawhorse's south cell facing north into the work:
  // her tree credits fork B's `licence` stage; her nights are the Bed
  // under the canvas (SLEEPER STAYS IN BED for the named body).
  const bodil = pins.POSTS.charter_bodil;
  b.actor(bodil.slug, ...local(bodil.x, bodil.y), bodil.dir, bodil.routine);
  ctx.post(bodil.x, bodil.y);

  // THE FELLERS: one at the cut face facing east into the standing
  // wood, one at the second trunk facing east along it. Two bodies of
  // one pooled def, each on its own routine (THE POST IS THE ORIGIN:
  // two posts, two bed offsets), each with a Bed at the camp.
  for (const f of [pins.POSTS.feller_face, pins.POSTS.feller_trunk]) {
    b.actor(f.slug, ...local(f.x, f.y), f.dir, f.routine);
    ctx.post(f.x, f.y);
  }

  // THE WOLVES ON THE LINE: the one spawn row, through the passthrough.
  const w = pins.WOLF_ROW;
  // THE COUNTED PACK: the row is passive (pins.WOLF_ROW says why).
  b.npcSpawn(w.npc, w.seat[0] - ORIGIN.x, w.seat[1] - ORIGIN.y, w.radius, w.count, {
    tribe: w.tribe,
    passive: w.passive,
    hours: { from: w.hours.from, to: w.hours.to },
    patrol: w.patrol.map((p) => ({ x: p.x - ORIGIN.x, y: p.y - ORIGIN.y, dwell: p.dwell })),
  });
}
