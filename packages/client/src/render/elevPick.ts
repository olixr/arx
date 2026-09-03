/**
 * Height of ONE terrain elevation level, in tiles of screen rise.
 * Deliberately shorter than a story wall: a cliff STEP is a landform
 * increment (levels stack to any height), masonry is a built story.
 * Everything derives from this one number — lifted ground bands, cliff
 * faces, stair treads, and the rise of anything standing up there.
 */
export const ELEV_H = 1.35;

/**
 * THE CAMERA LEARNS TO LEAN (Epic B): the perspective parameters the
 * lift-inversion needs to match the forward draw under lean. `q` is the
 * lean strength, `scale` px-per-tile, `camY` the look-at world row. At
 * q=0 the solve short-circuits to the old affine form and this is
 * unused — pass `undefined` (or a q=0 lean) for byte-identical picking.
 */
export interface PickLean {
  q: number;
  scale: number;
  camY: number;
}

/**
 * The screen→world elevation solve, pure for testing: the exact
 * inverse of the lifted projection's y.
 *
 * ORTHO (q=0): a lifted surface point draws up-screen by lift·scale px,
 * i.e. its flat-equivalent row is wy − liftAt(wy)/yScale (screen lift →
 * world-y divides out the pitch squash, the projAirWorldY law). So
 * every surface visible at the clicked pixel is a root of
 *
 *     g(wy) = wy − liftAt(wy)/yScale − flatY
 *
 * LEAN (q>0): the renderer draws a lifted ground point at world-depth
 * wy at screen-y  P(wy) − lift(wy)·scale·depthScale(wy), where
 * P(wy) = cy + (wy−camY)·A·depthScale(wy) is the flat-plane projection
 * (A = scale·yScale) and depthScale(wy) = 1/(1 − q·(wy−camY)·A). Since
 * P(wy)'s own perspective divisor equals depthScale(wy)'s, inverting the
 * click (flatY = the exact flat-plane unprojection of the pixel)
 * collapses to a clean closed form: the surface at wy lands on the pixel
 * iff
 *
 *     flatY = camY + ((wy−camY)·yScale − lift) / (yScale·(1 − q·scale·lift))
 *
 * so g(wy) subtracts that from flatY. At q=0 the divisor is 1 and this
 * is IDENTICAL to the ortho g above → byte-identical picking. (Verified
 * against projectWorld/unprojectScreen to machine precision in the test.)
 *
 * Roots are found by scanning the reachable window (lift is bounded by
 * the −2..+3 level range plus deck lift; under lean the window widens by
 * the depth-dependent shift the lift picks up) and bisecting each sign
 * change. NOT fixed-point iteration: a one-tile ramp flight has
 * |lift′|/yScale = 2.25 > 1, exactly where iteration diverges. Terrain
 * pieces (plateaus, ramp flights, dock aprons) are ≥1 tile wide and
 * linear within, so a 0.25-tile scan step brackets every crossing. A
 * cliff seam DISCONTINUITY can bracket like a root but leaves a
 * residual — only a candidate that projects back onto the pixel (same
 * depth-scaled g) is accepted. Among true roots, the LARGEST lift wins:
 * plateau bands and level-0 ground paint over whatever projects behind
 * them, so the highest surface is the one actually visible. A click on a
 * bare cliff FACE has no root at all and falls back to flatY, which
 * names the face's own tile column — the honest answer.
 */
export function solveLiftedY(
  flatY: number,
  yScale: number,
  liftAt: (wy: number) => number,
  lean?: PickLean,
): number {
  const q = lean && lean.q !== 0 ? lean.q : 0;
  const scale = lean ? lean.scale : 0;
  const camY = lean ? lean.camY : 0;
  // g(wy): world-y residual between the surface's back-projected flat
  // row and the clicked flat row. q=0 → the exact old affine form.
  const g =
    q === 0
      ? (wy: number): number => wy - liftAt(wy) / yScale - flatY
      : (wy: number): number => {
          const lift = liftAt(wy);
          // Divisor of the closed-form inverse; clamp like projectWorld's
          // MIN_W so a lift reaching past the near singularity can neither
          // blow up nor flip sign.
          const denom = Math.max(0.04, 1 - q * scale * lift);
          return camY + ((wy - camY) * yScale - lift) / (yScale * denom) - flatY;
        };
  let lo = flatY - (2 * ELEV_H) / yScale - 0.5;
  let hi = flatY + (3 * ELEV_H + 0.3) / yScale + 0.5;
  if (q !== 0) {
    // A lifted surface's true world row is
    //   wy = flatY + lift/yScale − (flatY−camY)·q·scale·lift,
    // so under lean it shifts by up to |(flatY−camY)·q·scale|·maxLift
    // beyond the ortho window. Widen by that (0 at q=0 → window
    // unchanged, picking byte-identical).
    const leanMargin = Math.abs((flatY - camY) * q * scale) * (3 * ELEV_H + 0.5);
    lo -= leanMargin;
    hi += leanMargin;
  }
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
      // Accept only a candidate that back-projects onto the pixel — the
      // SAME depth-scaled g, so a lean root is not rejected as a seam.
      // At q=0 |g(root)| ≡ |root − lift/yScale − flatY|, unchanged.
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
