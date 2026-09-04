/**
 * Height of ONE terrain elevation level, in tiles of screen rise.
 * Deliberately shorter than a story wall: a cliff STEP is a landform
 * increment (levels stack to any height), masonry is a built story.
 * Everything derives from this one number — lifted ground bands, cliff
 * faces, stair treads, and the rise of anything standing up there.
 */
export const ELEV_H = 1.35;

/**
 * The screen→world elevation solve, pure for testing: the exact
 * inverse of the lifted projection's y.
 *
 * A lifted surface point draws up-screen by lift·scale px, i.e. its
 * flat-equivalent row is wy − liftAt(wy)/yScale (screen lift → world-y
 * divides out the pitch squash, the projAirWorldY law). So every surface
 * visible at the clicked pixel is a root of
 *
 *     g(wy) = wy − liftAt(wy)/yScale − flatY
 *
 * Roots are found by scanning the reachable window (lift is bounded by
 * the −2..+3 level range plus deck lift) and bisecting each sign
 * change. NOT fixed-point iteration: a one-tile ramp flight has
 * |lift′|/yScale = 2.25 > 1, exactly where iteration diverges. Terrain
 * pieces (plateaus, ramp flights, dock aprons) are ≥1 tile wide and
 * linear within, so a 0.25-tile scan step brackets every crossing. A
 * cliff seam DISCONTINUITY can bracket like a root but leaves a
 * residual — only a candidate that projects back onto the pixel is
 * accepted. Among true roots, the LARGEST lift wins:
 * plateau bands and level-0 ground paint over whatever projects behind
 * them, so the highest surface is the one actually visible. A click on a
 * bare cliff FACE has no root at all and falls back to flatY, which
 * names the face's own tile column — the honest answer.
 */
export function solveLiftedY(
  flatY: number,
  yScale: number,
  liftAt: (wy: number) => number,
): number {
  // g(wy): world-y residual between the surface's back-projected flat
  // row and the clicked flat row.
  const g = (wy: number): number => wy - liftAt(wy) / yScale - flatY;
  const lo = flatY - (2 * ELEV_H) / yScale - 0.5;
  const hi = flatY + (3 * ELEV_H + 0.3) / yScale + 0.5;
  const STEP = 0.25;
  let bestY = flatY;
  let bestLift = -Infinity;
  let prevY = lo;
  let prevG = g(lo);
  for (let wy = lo + STEP; wy <= hi + 1e-9; wy += STEP) {
    const curG = g(wy);
    if (prevG * curG <= 0) {
      let a = prevY;
      let b = wy;
      let ga = prevG;
      for (let i = 0; i < 20; i++) {
        const m = (a + b) / 2;
        const gm = g(m);
        if (ga * gm <= 0) {
          b = m;
        } else {
          a = m;
          ga = gm;
        }
      }
      const root = (a + b) / 2;
      const lift = liftAt(root);
      // Accept only a candidate that back-projects onto the pixel.
      if (Math.abs(g(root)) < 1e-3 && lift > bestLift) {
        bestLift = lift;
        bestY = root;
      }
    }
    prevY = wy;
    prevG = curG;
  }
  return bestY;
}
