/**
 * Height of ONE terrain elevation level, in tiles of screen rise.
 * Deliberately shorter than a story wall: a cliff STEP is a landform
 * increment (levels stack to any height), masonry is a built story.
 * Everything derives from this one number — lifted ground bands, cliff
 * faces, stair treads, and the rise of anything standing up there.
 */
export declare const ELEV_H = 1.35;
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
export declare function solveLiftedY(flatY: number, yScale: number, liftAt: (wy: number) => number, lean?: PickLean): number;
//# sourceMappingURL=elevPick.d.ts.map