/**
 * THE CAMERA LEARNS TO LEAN (Epic B, band B-1) — the ground-plane
 * projection, as pure arithmetic.
 *
 * Today's camera is pitched ORTHOGRAPHIC: a world point maps to screen
 * affinely, `x = wx·scale + ox`, `y = wy·scale·yScale + oy`, and the
 * relationship inverts by division. Epic B makes it a PERSPECTIVE
 * camera: the ground plane recedes toward a horizon and things scale
 * with depth. The transform is a 3×3 homography of the plane, tuned by
 * a single lean parameter `q`:
 *
 *   ortho:  sx0 = wx·scale + ox            (today's affine — the reference)
 *           sy0 = wy·scale·yScale + oy
 *   lean:   w   = 1 − q·(sy0 − cy)          (cy = h/2, the camera's look-at row)
 *           sx  = cx + (sx0 − cx)/w
 *           sy  = cy + (sy0 − cy)/w
 *           depthScale = 1/w
 *
 * The camera always centres its look-at (`worldToScreen(camX,camY)` is
 * exactly the viewport centre by the origin definitions), so the
 * perspective is anchored there: `(cx,cy) = (w/2, h/2)`, `depthScale`
 * is camera-relative, and the horizon is the fixed screen row
 * `cy − 1/q` (kept above the viewport for a moderate lean).
 *
 * THE INVARIANT: at **q = 0** the divide vanishes and every function
 * here returns EXACTLY the old affine value (a fast-path short-circuit,
 * not a limit) — so the whole epic ships byte-identical until the lean
 * is deliberately turned on. The inverse is an exact closed form (no
 * root-find): `unproject(project(p)) === p`, proven in the tests.
 *
 * Pure and primitive-argument (no object allocation) so the per-tile /
 * per-particle hot paths keep their alloc-free discipline, and the math
 * is pinned by node tests rather than by eye.
 */

/** Floor on the perspective divisor: points at or past the near
 *  singularity (below the camera, toward the horizon-of-the-underside)
 *  are clamped instead of blowing up or flipping sign. Never reached at
 *  q=0, and off-screen for a moderate clamped q. */
const MIN_W = 0.04;

export interface XY {
  x: number;
  y: number;
}

/** Round a CSS coordinate onto the device-pixel lattice (Camera.snapPx). */
export function snapCam(v: number, snapDpr: number): number {
  return Math.round(v * snapDpr) / snapDpr;
}

export function camOriginX(scale: number, camX: number, snapDpr: number, w: number): number {
  return snapCam(w / 2 - camX * scale, snapDpr);
}

export function camOriginY(scale: number, yScale: number, camY: number, snapDpr: number, h: number): number {
  return snapCam(h / 2 - camY * scale * yScale, snapDpr);
}

/**
 * World → screen, into `out` (alloc-free). At q=0 this is the exact
 * affine projection; at q>0 it applies the perspective divide about the
 * viewport centre.
 */
export function projectWorld(
  scale: number,
  yScale: number,
  camX: number,
  camY: number,
  q: number,
  snapDpr: number,
  wx: number,
  wy: number,
  w: number,
  h: number,
  out: XY,
): XY {
  const ox = camOriginX(scale, camX, snapDpr, w);
  const oy = camOriginY(scale, yScale, camY, snapDpr, h);
  const sx0 = wx * scale + ox;
  const sy0 = wy * scale * yScale + oy;
  if (q === 0) {
    out.x = sx0;
    out.y = sy0;
    return out;
  }
  const cx = w / 2;
  const cy = h / 2;
  const wdiv = Math.max(MIN_W, 1 - q * (sy0 - cy));
  out.x = cx + (sx0 - cx) / wdiv;
  out.y = cy + (sy0 - cy) / wdiv;
  return out;
}

/**
 * The local size multiplier at world-depth `wy` — the factor every
 * billboard scale, elevation lift, and shadow radius rides. Camera-
 * relative: 1 at the look-at row, <1 farther (up-screen), >1 nearer.
 * At q=0 it is exactly 1.
 */
export function depthScaleWorld(scale: number, yScale: number, camY: number, q: number, wy: number): number {
  if (q === 0) return 1;
  const wdiv = Math.max(MIN_W, 1 - q * (wy - camY) * scale * yScale);
  return 1 / wdiv;
}

/**
 * Screen → world, into `out` (the exact inverse of projectWorld). The
 * perspective un-divide is a closed form: with `dy = sy − cy`,
 * `sy0 − cy = dy / (1 + q·dy)`. At q=0 it is the old affine inverse.
 */
export function unprojectScreen(
  scale: number,
  yScale: number,
  camX: number,
  camY: number,
  q: number,
  snapDpr: number,
  sx: number,
  sy: number,
  w: number,
  h: number,
  out: XY,
): XY {
  let sx0 = sx;
  let sy0 = sy;
  if (q !== 0) {
    const cx = w / 2;
    const cy = h / 2;
    const dy = sy - cy;
    const u = dy / (1 + q * dy); // = sy0 − cy
    sy0 = cy + u;
    const wdiv = Math.max(MIN_W, 1 - q * u);
    sx0 = cx + (sx - cx) * wdiv;
  }
  const ox = camOriginX(scale, camX, snapDpr, w);
  const oy = camOriginY(scale, yScale, camY, snapDpr, h);
  out.x = (sx0 - ox) / scale;
  out.y = (sy0 - oy) / (scale * yScale);
  return out;
}

/**
 * The screen row the horizon sits on (where depthScale → 0). For q>0 it
 * is `h/2 − 1/q`; for q≤0 there is no horizon (returns −Infinity). Used
 * to clamp the lean so the horizon stays above the viewport.
 */
export function horizonScreenY(q: number, h: number): number {
  if (q <= 0) return -Infinity;
  return h / 2 - 1 / q;
}
