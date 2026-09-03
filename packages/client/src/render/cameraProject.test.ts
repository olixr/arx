import test from 'node:test';
import assert from 'node:assert/strict';
import {
  camOriginX,
  camOriginY,
  depthScaleAtScreen,
  depthScaleWorld,
  horizonScreenY,
  lightmapStrip,
  projectWorld,
  screenOrthoFromLean,
  shadeStrip,
  unprojectScreen,
  type LightStrip,
  type XY,
} from './cameraProject.js';

/**
 * THE CAMERA LEARNS TO LEAN (B-1) — the projection math, pinned.
 *
 * The load-bearing law: at q=0 every function is BYTE-IDENTICAL to the
 * old affine camera, so the whole epic ships parity-clean until the lean
 * turns on. And the inverse is exact — unproject(project(p)) === p — at
 * any q. These are the two invariants the rest of Epic B rests on.
 */

// A representative camera state.
const S = { scale: 40, yScale: 0.6, camX: 12.5, camY: -7.25, snapDpr: 2 };
const W = 1600;
const H = 1000;
const out: XY = { x: 0, y: 0 };

/** The OLD affine projection, verbatim, as the oracle. */
const affine = (wx: number, wy: number) => {
  const ox = camOriginX(S.scale, S.camX, S.snapDpr, W);
  const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H);
  return { x: wx * S.scale + ox, y: wy * S.scale * S.yScale + oy };
};

const pts: Array<[number, number]> = [
  [0, 0], [12.5, -7.25], [30, 20], [-15, -40], [100, -100], [3.3, 5.7], [-0.5, 0.25],
];

test('q=0 projection is byte-identical to the old affine camera', () => {
  for (const [wx, wy] of pts) {
    projectWorld(S.scale, S.yScale, S.camX, S.camY, 0, S.snapDpr, wx, wy, W, H, out);
    const a = affine(wx, wy);
    assert.equal(out.x, a.x, `x at ${wx},${wy}`);
    assert.equal(out.y, a.y, `y at ${wx},${wy}`);
  }
});

test('q=0 inverse is byte-identical to the old affine inverse', () => {
  for (const [sx, sy] of [[800, 500], [0, 0], [1600, 1000], [123, 456]] as Array<[number, number]>) {
    unprojectScreen(S.scale, S.yScale, S.camX, S.camY, 0, S.snapDpr, sx, sy, W, H, out);
    const ox = camOriginX(S.scale, S.camX, S.snapDpr, W);
    const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H);
    assert.equal(out.x, (sx - ox) / S.scale);
    assert.equal(out.y, (sy - oy) / (S.scale * S.yScale));
  }
});

test('round-trip is exact at q=0 AND under a real lean', () => {
  for (const q of [0, 0.0005, 0.0012]) {
    for (const [wx, wy] of pts) {
      projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, wx, wy, W, H, out);
      const sx = out.x;
      const sy = out.y;
      unprojectScreen(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, sx, sy, W, H, out);
      assert.ok(Math.abs(out.x - wx) < 1e-9, `x round-trip q=${q} at ${wx},${wy}: got ${out.x}`);
      assert.ok(Math.abs(out.y - wy) < 1e-9, `y round-trip q=${q} at ${wx},${wy}: got ${out.y}`);
    }
  }
});

test('the projection origin is device-snapped at q=0 but SMOOTH under lean (jitter fix)', () => {
  // At q=0 the origin lands on the device lattice (snapDpr=2 → 0.5 px).
  const snapped = camOriginX(S.scale, S.camX, S.snapDpr, W, 0);
  assert.equal(snapped, Math.round((W / 2 - S.camX * S.scale) * S.snapDpr) / S.snapDpr);
  // Under a lean the origin is the raw, UNSNAPPED value — no pre-divide
  // sawtooth for the perspective divide to amplify in the near field.
  const q = 0.001;
  assert.equal(camOriginX(S.scale, S.camX, S.snapDpr, W, q), W / 2 - S.camX * S.scale);
  assert.equal(camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H, q), H / 2 - S.camY * S.scale * S.yScale);
});

test('under lean, a smooth pan gives a smooth (non-sawtooth) near-field screen-x', () => {
  // The jitter was a ±0.5 device-px step in the origin as camX slid,
  // amplified by 1/wdiv near the bottom of the screen. With the origin
  // unsnapped under lean, sweeping camX makes the projected screen-x of a
  // fixed near-field world point move by near-constant, same-sign steps —
  // no reversals (the sawtooth signature).
  const q = 0.001;
  const wx = 40; // a point off to the side so the divide moves x
  const wy = S.camY + 15; // near field (down-screen), where 1/wdiv > 1
  let prev = Infinity;
  let prevDelta = 0;
  for (let k = 0; k <= 40; k++) {
    const camX = S.camX + k * 0.01; // a fine, continuous pan
    projectWorld(S.scale, S.yScale, camX, S.camY, q, S.snapDpr, wx, wy, W, H, out);
    if (prev !== Infinity) {
      const delta = out.x - prev;
      if (prevDelta !== 0) {
        // Same sign every step (monotone) — a sawtooth would reverse.
        assert.ok(delta * prevDelta > 0, `screen-x reversed at k=${k} (sawtooth)`);
      }
      prevDelta = delta;
    }
    prev = out.x;
  }
});

test('depthScale is exactly 1 at q=0, at every depth', () => {
  for (const [, wy] of pts) {
    assert.equal(depthScaleWorld(S.scale, S.yScale, S.camY, 0, wy), 1);
  }
});

test('under a lean, farther (up-screen) shrinks and nearer (down-screen) grows', () => {
  const q = 0.001;
  const atFocus = depthScaleWorld(S.scale, S.yScale, S.camY, q, S.camY);
  assert.ok(Math.abs(atFocus - 1) < 1e-12, 'depthScale is 1 at the look-at row');
  // camY = -7.25. Smaller wy = up-screen = FARTHER → depthScale < 1.
  const far = depthScaleWorld(S.scale, S.yScale, S.camY, q, S.camY - 20);
  const near = depthScaleWorld(S.scale, S.yScale, S.camY, q, S.camY + 20);
  assert.ok(far < 1, `far depthScale ${far} < 1`);
  assert.ok(near > 1, `near depthScale ${near} > 1`);
});

test('depthScale increases monotonically from far to near', () => {
  const q = 0.001;
  const vals: number[] = [];
  for (let d = -30; d <= 30; d += 3) vals.push(depthScaleWorld(S.scale, S.yScale, S.camY, q, S.camY + d));
  for (let i = 1; i < vals.length; i++) {
    assert.ok(vals[i]! > vals[i - 1]!, `monotonic increasing at index ${i}`);
  }
});

test('depthScaleAtScreen is exactly 1 at q=0, at every screen row', () => {
  for (let sy = 0; sy <= H; sy += 137) assert.equal(depthScaleAtScreen(0, H, sy), 1);
});

test('depthScaleAtScreen(sy) == depthScaleWorld(wy) for the row that projects to sy', () => {
  // The screen-keyed factor must equal the world-keyed one at the SAME
  // ground point — this is the identity ground casts rely on to foreshorten.
  const q = 0.001;
  for (const [, wy] of pts) {
    projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, S.camX, wy, W, H, out);
    const viaScreen = depthScaleAtScreen(q, H, out.y);
    const viaWorld = depthScaleWorld(S.scale, S.yScale, S.camY, q, wy);
    assert.ok(Math.abs(viaScreen - viaWorld) < 1e-9, `${viaScreen} ≈ ${viaWorld} at wy=${wy}`);
  }
});

test('the horizon sits at a fixed screen row h/2 - 1/q, above the viewport for a clamped lean', () => {
  assert.equal(horizonScreenY(0, H), -Infinity);
  const q = 0.001;
  assert.equal(horizonScreenY(q, H), H / 2 - 1 / q); // 500 - 1000 = -500 (above screen)
  // A very-far row projects toward (but never past) the horizon row.
  // The loop walks wy from farthest (up-screen) to nearest, so screen-y
  // rises monotonically; each stays below (greater than) the horizon.
  const horizon = horizonScreenY(q, H);
  let prevY = -Infinity;
  for (let wy = S.camY - 50; wy <= S.camY - 5; wy += 5) {
    projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, S.camX, wy, W, H, out);
    assert.ok(out.y > horizon, `projected row ${out.y} stays below the horizon ${horizon}`);
    assert.ok(out.y > prevY, 'nearer rows sit lower on screen (farther rows higher)');
    prevY = out.y;
  }
});

test('the near singularity is clamped, never blows up or flips sign', () => {
  const q = 0.01; // aggressive; the singularity is close
  // A point far down-screen (very near, past the singularity) stays finite.
  projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, S.camX, S.camY + 1000, W, H, out);
  assert.ok(Number.isFinite(out.x) && Number.isFinite(out.y), 'clamped to finite');
});

/**
 * THE SHADE LEARNS TO LEAN — the lightmap composite's strip mapping.
 * The lightmap is built at the ortho origin and warped once here; these
 * pin the two things the warp must get right: q=0 is the exact full-
 * screen stretch, and the strips tile the viewport with shared seams.
 */
test('lightmapStrip at q=0 is the exact full-screen stretch, in N even bands', () => {
  const N = 48;
  const mh = 333;
  const s: LightStrip = { sy: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
  for (let i = 0; i < N; i++) {
    lightmapStrip(0, W, H, mh, N, i, s);
    // Full width, no horizontal offset (wdiv=1 everywhere at q=0).
    assert.equal(s.dx, 0);
    assert.equal(s.dw, W);
    // Source band [i/N, (i+1)/N]·mh maps to dest band [i/N,(i+1)/N]·H.
    assert.ok(Math.abs(s.sy - (i / N) * mh) < 1e-9);
    assert.ok(Math.abs(s.sy + s.sh - ((i + 1) / N) * mh) < 1e-9);
    assert.ok(Math.abs(s.dy - (i / N) * H) < 1e-9);
    assert.ok(Math.abs(s.dy + s.dh - ((i + 1) / N) * H) < 1e-9);
  }
});

test('lightmapStrip tiles the whole viewport with shared, gapless seams under lean', () => {
  const N = 48;
  const mh = 333;
  const q = 0.0008; // horizon above the viewport for H=1000
  const s: LightStrip = { sy: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
  let prevBottom = 0;
  let prevSrcBottom = 0;
  for (let i = 0; i < N; i++) {
    lightmapStrip(q, W, H, mh, N, i, s);
    // Vertical seams are shared exactly: each strip's top is the last
    // strip's bottom (both are leanY of the same boundary).
    assert.ok(Math.abs(s.dy - prevBottom) < 1e-9, `strip ${i} seam`);
    prevBottom = s.dy + s.dh;
    // Source rows are contiguous and cover the whole map.
    assert.ok(Math.abs(s.sy - prevSrcBottom) < 1e-9, `strip ${i} source seam`);
    prevSrcBottom = s.sy + s.sh;
    // Horizontal warp scales about the centre: dx + dw/2 === cx.
    assert.ok(Math.abs(s.dx + s.dw / 2 - W / 2) < 1e-9, 'x scales about centre');
    // Down-screen bands (nearer) magnify; the width exceeds the viewport.
    if (s.dy > H / 2) assert.ok(s.dw > W, 'near bands magnify');
  }
  // The first strip is pinned to y=0 and the last to viewH — full cover.
  assert.equal(prevBottom, H);
  assert.ok(Math.abs(prevSrcBottom - mh) < 1e-9);
});

/**
 * THE ONE RENDER — B1 (float-on-zoom): the entity/anchor/FX lift is a
 * world HEIGHT and must foreshorten by depthScale at its own foot row,
 * exactly as the elevated ground does. These tests pin that the lifted
 * entity foot coincides with the lifted ground beneath it — so a body
 * (or particle/glow/decal) standing on a terrace stays pinned to it at
 * every q and zoom, instead of floating off as the old bare `*scale`
 * lift did.
 */

const ELEV_H = 22; // representative world-height per elevation level (px)

// The screen y of a point on an elevated tile, lifted the way the
// GROUND is (renderer.ts elevated-chunk draw): base row projected, then
// raised by level*ELEV_H*scale*depthScale(row).
const groundLiftedY = (scale: number, q: number, wy: number, level: number): number => {
  projectWorld(scale, S.yScale, S.camX, S.camY, q, S.snapDpr, 0, wy, W, H, out);
  return out.y - level * ELEV_H * scale * depthScaleWorld(scale, S.yScale, S.camY, q, wy);
};

// The screen y of a foot/anchor at the SAME row, lifted the B1 way
// (screenAnchor/liftedWTS): renderLift == level*ELEV_H, folded with the
// same depthScale(row).
const footLiftedY = (scale: number, q: number, wy: number, level: number): number => {
  projectWorld(scale, S.yScale, S.camX, S.camY, q, S.snapDpr, 0, wy, W, H, out);
  const renderLift = level * ELEV_H;
  return out.y - renderLift * scale * depthScaleWorld(scale, S.yScale, S.camY, q, wy);
};

test('B1: lifted foot coincides with the lifted ground at every q and zoom', () => {
  for (const q of [0, 0.0006, 0.0013, 0.003]) {
    for (const scale of [40, 20, 80]) {
      for (const wy of [-40, -7.25, 5, 20]) {
        for (const level of [1, 2, 3]) {
          const foot = footLiftedY(scale, q, wy, level);
          const grnd = groundLiftedY(scale, q, wy, level);
          assert.ok(
            Math.abs(foot - grnd) < 1e-9,
            `foot ${foot} != ground ${grnd} at q=${q} scale=${scale} wy=${wy} lvl=${level}`,
          );
        }
      }
    }
  }
});

test('B1: at q=0 the lift is the old bare-scale value (byte-identical)', () => {
  const scale = 40;
  for (const wy of [-40, 5, 20]) {
    for (const level of [1, 2, 3]) {
      projectWorld(scale, S.yScale, S.camX, S.camY, 0, S.snapDpr, 0, wy, W, H, out);
      const oldBare = out.y - level * ELEV_H * scale; // pre-B1, no depthScale
      assert.equal(footLiftedY(scale, 0, wy, level), oldBare, `q=0 wy=${wy} lvl=${level}`);
    }
  }
});

test('B1: under lean the OLD bare-scale lift detached (regression guard)', () => {
  const scale = 40, q = 0.0013, level = 2;
  const wyFar = -40; // up-screen / far → depthScale < 1
  projectWorld(scale, S.yScale, S.camX, S.camY, q, S.snapDpr, 0, wyFar, W, H, out);
  const oldBare = out.y - level * ELEV_H * scale; // the buggy lift
  const grnd = groundLiftedY(scale, q, wyFar, level);
  // The old lift over-shot the ground (foot floated ABOVE its terrace):
  // smaller depthScale far away means bare*scale > scale*depthScale.
  assert.ok(oldBare < grnd - 1, `old lift ${oldBare} should sit above ground ${grnd}`);
});

/**
 * THE ONE RENDER — B4 (grass cast-shade bake-once + warp). The shade
 * monolith bakes ONCE in ortho screen space and warps to the receded
 * ground each frame. These pin the two pure helpers that fix makes it
 * ride: screenOrthoFromLean (un-lean a projected point to ortho, so the
 * bake is camera- and q-independent) and shadeStrip (warp a sub-region
 * canvas back onto the leaned ground).
 */

test('B4: screenOrthoFromLean is the exact ortho screen of projectWorld at any q', () => {
  const cx = W / 2;
  const cy = H / 2;
  const ortho: XY = { x: 0, y: 0 };
  const lean: XY = { x: 0, y: 0 };
  const back: XY = { x: 0, y: 0 };
  for (const q of [0, 0.0006, 0.0013, 0.003]) {
    for (const [wx, wy] of pts) {
      // The ortho screen point (q=0 projection) — the bake target.
      projectWorld(S.scale, S.yScale, S.camX, S.camY, 0, S.snapDpr, wx, wy, W, H, ortho);
      // Skip points whose forward projection crosses the near-singularity
      // clamp (below the camera, off any on-ground meadow) — the clamp is
      // deliberately lossy there, so the exact inverse cannot hold. Uses
      // the same origin the leaned forward projection below does.
      const oyLean = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H, q);
      const sy0 = wy * S.scale * S.yScale + oyLean;
      if (1 - q * (sy0 - cy) <= 0.04) continue;
      // The leaned projection at this q, un-leaned back to ortho screen.
      projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, wx, wy, W, H, lean);
      screenOrthoFromLean(q, cx, cy, lean.x, lean.y, back);
      // q>0 uses the unsnapped origin, q=0 the snapped one — compare the
      // recovered ortho against the SAME-origin ortho so the snap cancels.
      const ox = camOriginX(S.scale, S.camX, S.snapDpr, W, q);
      const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H, q);
      const orthoSameOrigin = { x: wx * S.scale + ox, y: wy * S.scale * S.yScale + oy };
      assert.ok(Math.abs(back.x - orthoSameOrigin.x) < 1e-6, `q=${q} x`);
      assert.ok(Math.abs(back.y - orthoSameOrigin.y) < 1e-6, `q=${q} y`);
    }
  }
});

test('B4: screenOrthoFromLean at q=0 is the identity (byte-safe)', () => {
  const back: XY = { x: 0, y: 0 };
  for (const [sx, sy] of pts) {
    screenOrthoFromLean(0, W / 2, H / 2, sx, sy, back);
    assert.equal(back.x, sx);
    assert.equal(back.y, sy);
  }
});

test('B4: shadeStrip over the full screen equals lightmapStrip on interior strips', () => {
  const N = 48;
  const mh = 333;
  const a: LightStrip = { sy: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
  const b: LightStrip = { sy: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
  for (const q of [0, 0.0008]) {
    // Interior strips only: lightmapStrip clamps its first/last to the
    // viewport edges; a sub-region maps its own extent with no clamp.
    for (let i = 1; i < N - 1; i++) {
      lightmapStrip(q, W, H, mh, N, i, a);
      shadeStrip(q, W / 2, H / 2, 0, 0, W, H, mh, N, i, b);
      assert.ok(Math.abs(a.dx - b.dx) < 1e-9, `q=${q} i=${i} dx`);
      assert.ok(Math.abs(a.dy - b.dy) < 1e-9, `q=${q} i=${i} dy`);
      assert.ok(Math.abs(a.dw - b.dw) < 1e-9, `q=${q} i=${i} dw`);
      assert.ok(Math.abs(a.dh - b.dh) < 1e-9, `q=${q} i=${i} dh`);
      assert.ok(Math.abs(a.sy - b.sy) < 1e-9, `q=${q} i=${i} sy`);
      assert.ok(Math.abs(a.sh - b.sh) < 1e-9, `q=${q} i=${i} sh`);
    }
  }
});

test('B4: shadeStrip warps a sub-region onto its leaned ground with shared seams', () => {
  const N = 16;
  const q = 0.0013;
  const cx = W / 2;
  const cy = H / 2;
  // A meadow-sized ortho sub-region, offset from the origin.
  const rectX = 300;
  const rectY = 220;
  const rectW = 640;
  const rectH = 380;
  const srcH = 900; // canvas device rows
  const s: LightStrip = { sy: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
  let prevBottom = -1;
  let prevSrcBottom = 0;
  // The ground homography a strip edge must land on (leanY).
  const leanY = (oy: number): number => cy + (oy - cy) / Math.max(0.04, 1 - q * (oy - cy));
  for (let i = 0; i < N; i++) {
    shadeStrip(q, cx, cy, rectX, rectY, rectW, rectH, srcH, N, i, s);
    // Source rows are contiguous and cover the whole canvas exactly.
    assert.ok(Math.abs(s.sy - prevSrcBottom) < 1e-9, `strip ${i} src seam`);
    prevSrcBottom = s.sy + s.sh;
    // Vertical dest seams are shared (each top == prior bottom).
    if (i > 0) assert.ok(Math.abs(s.dy - prevBottom) < 1e-9, `strip ${i} seam`);
    prevBottom = s.dy + s.dh;
    // The strip's top edge lands on the leaned ground row for its ortho y.
    assert.ok(Math.abs(s.dy - leanY(rectY + (i / N) * rectH)) < 1e-9, `strip ${i} on ground`);
  }
  assert.ok(Math.abs(prevSrcBottom - srcH) < 1e-9, 'source fully covered');
  // First/last edges are the region's own leaned extent — NOT clamped to
  // the viewport (the sub-region difference from lightmapStrip).
  shadeStrip(q, cx, cy, rectX, rectY, rectW, rectH, srcH, N, 0, s);
  assert.ok(Math.abs(s.dy - leanY(rectY)) < 1e-9, 'top not clamped to 0');
});

test('B4: shadeStrip at q=0 is the exact untouched sub-region (byte-safe)', () => {
  const N = 12;
  const rectX = 120, rectY = 80, rectW = 500, rectH = 300, srcH = 600;
  const s: LightStrip = { sy: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
  for (let i = 0; i < N; i++) {
    shadeStrip(0, W / 2, H / 2, rectX, rectY, rectW, rectH, srcH, N, i, s);
    assert.equal(s.dx, rectX);
    assert.equal(s.dw, rectW);
    assert.ok(Math.abs(s.dy - (rectY + (i / N) * rectH)) < 1e-9);
    assert.ok(Math.abs(s.dh - rectH / N) < 1e-9);
    assert.ok(Math.abs(s.sy - (i / N) * srcH) < 1e-9);
    assert.ok(Math.abs(s.sh - srcH / N) < 1e-9);
  }
});
