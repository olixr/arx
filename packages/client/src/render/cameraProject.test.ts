import test from 'node:test';
import assert from 'node:assert/strict';
import {
  camOriginX,
  camOriginY,
  depthScaleWorld,
  horizonScreenY,
  projectWorld,
  unprojectScreen,
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
