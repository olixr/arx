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

/**
 * THE ORIGIN LEANS SMOOTH (jitter fix). At **q = 0** the projection
 * origin is rounded onto the device-pixel lattice, exactly as before —
 * the ortho camera wants its origin snapped so hard-edged art lands on
 * whole device pixels (byte-identical, the sacred invariant). But under
 * a lean (q ≠ 0) that pre-divide snap is WRONG: during a smooth pan
 * `w/2 − camX·scale` slides continuously while the snapped value steps
 * in a ±0.5 device-px sawtooth, and `projectWorld` then feeds that
 * residual through the perspective divide where `1/wdiv` AMPLIFIES it in
 * the near field — the live-drawn character re-rasterizes at a wobbling
 * sub-pixel offset and its vector silhouette edge-crawls (jitters). So
 * at q ≠ 0 we return the UNSNAPPED origin, making `worldToScreen` a
 * smooth continuous function of camX with no sawtooth to amplify. The
 * ground doesn't need the snap (it samples a bilinear-smoothed
 * trapezoid), and the exact inverse `unprojectScreen` uses the same
 * gated origin so the round-trip stays exact at any q.
 */
export function camOriginX(scale: number, camX: number, snapDpr: number, w: number, q = 0): number {
  const raw = w / 2 - camX * scale;
  return q !== 0 ? raw : snapCam(raw, snapDpr);
}

export function camOriginY(scale: number, yScale: number, camY: number, snapDpr: number, h: number, q = 0): number {
  const raw = h / 2 - camY * scale * yScale;
  return q !== 0 ? raw : snapCam(raw, snapDpr);
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
  const ox = camOriginX(scale, camX, snapDpr, w, q);
  const oy = camOriginY(scale, yScale, camY, snapDpr, h, q);
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
 * The local size multiplier at a leaned SCREEN row `sy` — the same
 * factor `depthScaleWorld` gives, but keyed to a point already projected
 * to screen space rather than to its world row. Ground cast-shadows (and
 * any world offset extruded from an already-leaned base) foreshorten by
 * this, so they shrink with the receding ground instead of standing at
 * their ortho length and detaching from the caster.
 *
 * It is the exact composition `depthScaleWorld(unproject(sy))`: from the
 * inverse (unprojectScreen), the ortho row offset of `sy` is
 * `u = dy/(1 + q·dy)` with `dy = sy − cy`, and the scale is the same
 * `1/(1 − q·u)` projectWorld would apply there. At q=0 it is exactly 1
 * (fast-path short-circuit), so a caller multiplying by it is byte-
 * identical to the ortho frame. Pure and alloc-free.
 */
export function depthScaleAtScreen(q: number, h: number, sy: number): number {
  if (q === 0) return 1;
  const cy = h / 2;
  const dy = sy - cy;
  // Clamp the un-divide denominator so a base at/above the horizon
  // (never reached by on-ground casts at a moderate lean) can neither
  // blow up nor flip sign.
  const u = dy / Math.max(MIN_W, 1 + q * dy);
  return 1 / Math.max(MIN_W, 1 - q * u);
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
  const ox = camOriginX(scale, camX, snapDpr, w, q);
  const oy = camOriginY(scale, yScale, camY, snapDpr, h, q);
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

/** One strip of THE SHADE LEARNS TO LEAN: source rect in the ortho
 *  lightmap and destination rect on the leaned screen. */
export interface LightStrip {
  /** Source top row / height, in map pixels. */
  sy: number;
  sh: number;
  /** Destination rect, in CSS screen pixels. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * THE SHADE LEARNS TO LEAN: map strip `i` of an ortho lightmap (built at
 * the ortho origin, `mh` map-rows tall covering the full screen height)
 * to its leaned screen band under lean `q`, into `out` (alloc-free).
 *
 * The lightmap holds the scene at ORTHO screen positions; the full
 * homography is applied here, once, at composite. A source row maps to
 * ortho screen-y `oy = (row/mh)·viewH`; the homography warps ONLY in y
 * for the band edges (`sy = cy + (oy−cy)/wdiv`, `wdiv = 1 − q·(oy−cy)`),
 * and within the band scales x uniformly about `cx` by `1/wdiv` at the
 * band centre. Adjacent strips compute a shared boundary the same way,
 * so vertical seams are exact; the map is blurred (the tilt-shift law)
 * so the per-strip horizontal-scale step is invisible at a modest count.
 * The first strip is stretched up to y=0 and the last down to viewH so
 * the composite still covers the whole viewport.
 */
export function lightmapStrip(
  q: number,
  viewW: number,
  viewH: number,
  mh: number,
  strips: number,
  i: number,
  out: LightStrip,
): LightStrip {
  const cx = viewW / 2;
  const cy = viewH / 2;
  const f0 = i / strips;
  const f1 = (i + 1) / strips;
  // Ortho screen-y of the band's top/bottom (source → full-screen stretch).
  const oy0 = f0 * viewH;
  const oy1 = f1 * viewH;
  const leanY = (oy: number): number => {
    const wdiv = Math.max(MIN_W, 1 - q * (oy - cy));
    return cy + (oy - cy) / wdiv;
  };
  let dTop = i === 0 ? 0 : leanY(oy0);
  const dBot = i === strips - 1 ? viewH : leanY(oy1);
  // Horizontal scale about cx from the band centre's divisor.
  const wdivC = Math.max(MIN_W, 1 - q * ((oy0 + oy1) / 2 - cy));
  out.sy = f0 * mh;
  out.sh = f1 * mh - f0 * mh;
  out.dx = cx - cx / wdivC;
  out.dw = viewW / wdivC;
  out.dy = dTop;
  out.dh = dBot - dTop;
  return out;
}

/**
 * THE SHADE BAKES ONCE (Epic1 B4): the screen-only inverse of the lean
 * homography — map a LEANED screen point back to the ORTHO screen point
 * it came from, WITHOUT the round-trip through world space. It is the
 * screen half of `unprojectScreen`: with `dy = sy − cy`, the ortho row
 * offset is `u = dy/(1 + q·dy)` and the ortho x un-scales about `cx` by
 * the same `wdiv` the forward divide applied. At q=0 it is the identity
 * (fast-path short-circuit) so a caller stays byte-identical to ortho.
 *
 * The grass cast-shade bakes its calm monolith in ORTHO screen space
 * (camera-independent, pan-corrected by a translate, `q`-independent —
 * `screenOrthoFromLean(projectWorld(p)) === orthoScreen(p)` for ANY q),
 * then warps it to the receded ground each frame via `shadeStrip`. Pure
 * and alloc-free (writes `out`).
 */
export function screenOrthoFromLean(
  q: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  out: XY,
): XY {
  if (q === 0) {
    out.x = sx;
    out.y = sy;
    return out;
  }
  const dy = sy - cy;
  const u = dy / (1 + q * dy);
  const wdiv = Math.max(MIN_W, 1 - q * u);
  out.x = cx + (sx - cx) * wdiv;
  out.y = cy + u;
  return out;
}

/**
 * THE SHADE LEARNS TO LEAN, for a SUB-REGION (Epic1 B4). Strip `i` of an
 * ORTHO-baked canvas covering the CSS-screen rect `[rectX,rectY,rectW,
 * rectH]` (its `srcH` source device-rows tall) mapped to its leaned
 * screen band under lean `q`. The generalization of `lightmapStrip` off
 * the full screen: the vertical band edges warp by the ground homography
 * (`sy = cy + (oy−cy)/wdiv`, `wdiv = 1 − q·(oy−cy)`) and the band's width
 * scales uniformly about `cx` by `1/wdiv` at the band centre — so the
 * cast-shade recedes with the ground it lies on. Unlike `lightmapStrip`
 * (which stretches its first/last strip to cover the whole viewport), a
 * sub-region maps its own extent exactly: no full-screen clamp. With
 * `rectX=rectY=0, rectW=viewW, rectH=viewH, srcH=mh` the interior strips
 * are identical to `lightmapStrip` (pinned by test). Pure, writes `out`.
 */
export function shadeStrip(
  q: number,
  cx: number,
  cy: number,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  srcH: number,
  strips: number,
  i: number,
  out: LightStrip,
): LightStrip {
  const f0 = i / strips;
  const f1 = (i + 1) / strips;
  const oy0 = rectY + f0 * rectH;
  const oy1 = rectY + f1 * rectH;
  const leanY = (oy: number): number => {
    const wdiv = Math.max(MIN_W, 1 - q * (oy - cy));
    return cy + (oy - cy) / wdiv;
  };
  const wdivC = Math.max(MIN_W, 1 - q * ((oy0 + oy1) / 2 - cy));
  out.sy = f0 * srcH;
  out.sh = (f1 - f0) * srcH;
  out.dx = cx + (rectX - cx) / wdivC;
  out.dw = rectW / wdivC;
  out.dy = leanY(oy0);
  out.dh = leanY(oy1) - leanY(oy0);
  return out;
}
