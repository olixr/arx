/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — stones.ts.
 *
 * THE THREE GREY POINTS and THE ROOT (brief §2.6). Where the roots
 * went grey, and nowhere else north of the brook: by the road, at the
 * corner, where the wood gives out. Each stone stands in a RING of
 * three dead trees, a shape worldgen never deals (its old-wood snags
 * are singletons at 0.3 %), so the shape says authored and the
 * sentence says dying; the bruise (Detail.BlightVeins) lies on the
 * stone's cell and its four sides and never elsewhere. Their light is
 * the cold swell, ungated, day and night (lights.ts owns the row):
 * from the junction at 21:00 three cold blue points across the road
 * and the thread invisible except where it is grey.
 *
 * THE ROOT past the end stone is the one thing on this ground nobody
 * has a sentence for, on purpose (plan §1 law 3): the sentinels have
 * a fact about it and it is not an explanation.
 *
 * PRIMARY: the stones, the root. SECONDARY: the rings, the bruise.
 * BOARD: none. LIGHTS: the three swells. EMPTY: the tarn's shore.
 */
import { Detail, Tile } from '@arx/shared';
import type { WardCtx } from './ctx.js';

export function stones(ctx: WardCtx): void {
  const { pins } = ctx;
  for (const s of pins.STONES) {
    // The stone's box is its ring's reach less the lot's edge (the
    // corner ring's west dead stands two from the stone, one from the
    // rope's box; the boxes stay disjoint and the ring is the lint's).
    ctx.box(s.at[0] - 2, s.at[1] - 2, s.at[0] + 2, s.at[1] + 2, `stones: THE ${s.id.toUpperCase()} STONE`);
    // PRIMARY: the grey point with its ring. SENTENCE: pins.STONES[].why.
    ctx.ring(s.at, s.ring);
  }

  // PRIMARY: the root, two tiles past the end stone, in open glade.
  // SENTENCE: nobody explains it. No row, no sign, no line. The bruise
  // lies on it as on a stone (the lint reads CreepRoot as a gloom tile).
  const [rx, ry] = pins.ROOT;
  ctx.put(rx, ry, Tile.CreepRoot);
  ctx.detail(rx, ry, Detail.BlightVeins);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (ctx.authorable(rx + dx, ry + dy) && !ctx.onBed(rx + dx, ry + dy)) ctx.detail(rx + dx, ry + dy, Detail.BlightVeins);
  }
}
