import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEV_H, solveLiftedY } from './elevPick.js';
import { depthScaleWorld, projectWorld, unprojectScreen, type XY } from './cameraProject.js';

const YS = 0.6; // the camera pitch squash

/** The invariant every accepted pick must satisfy: its own lift
 *  projects it back onto the clicked pixel. */
const consistent = (y: number, flatY: number, liftAt: (wy: number) => number): boolean =>
  Math.abs(y - liftAt(y) / YS - flatY) < 1e-3;

test('flat world: the solve is the identity', () => {
  assert.ok(Math.abs(solveLiftedY(12.5, YS, () => 0) - 12.5) < 1e-4);
});

test('uniform plateau: click lands one lift-shift south of the flat inverse', () => {
  const y = solveLiftedY(19, YS, () => ELEV_H);
  assert.ok(Math.abs(y - (19 + ELEV_H / YS)) < 1e-4);
});

test('mesa top hides the ground behind it: highest surface wins', () => {
  // Plateau (+1) south of wy=10, flat strip north of it. Both the
  // plateau top and the strip project onto the same pixel — the
  // plateau band paints over the strip, so the pick must take it.
  const liftAt = (wy: number): number => (wy >= 10 ? ELEV_H : 0);
  const y = solveLiftedY(9, YS, liftAt);
  assert.ok(Math.abs(y - (9 + ELEV_H / YS)) < 1e-4);
});

test('pit floor: negative lift pulls the pick north', () => {
  // Dell (−1) between wy 5 and 15; a click that flat-inverts to 8
  // is really the pit floor at 8 − 2.25.
  const liftAt = (wy: number): number => (wy >= 5 && wy < 15 ? -ELEV_H : 0);
  const y = solveLiftedY(8, YS, liftAt);
  assert.ok(Math.abs(y - (8 - ELEV_H / YS)) < 1e-4);
});

test('one-tile ramp, low mouth south: mid-flight click resolves on the tread', () => {
  // renderLift geometry: plateau (+1) north of wy=20, the Ramp tile
  // spans [20,21), grade south of 21. Lift slides ELEV_H→0 across the
  // single tile — the steep case (|lift′|/yScale = 2.25) that a
  // fixed-point solver cannot handle.
  const liftAt = (wy: number): number =>
    wy < 20 ? ELEV_H : wy < 21 ? ELEV_H * (21 - wy) : 0;
  const flatY = 20.9; // a pixel inside the flight's screen band
  const y = solveLiftedY(flatY, YS, liftAt);
  assert.ok(consistent(y, flatY, liftAt));
  assert.ok(y >= 20 && y < 21, `expected a tread pick, got ${y}`);
  assert.ok(liftAt(y) > 0.01 && liftAt(y) < ELEV_H - 0.01);
});

test('one-tile ramp, low mouth north: the screen fold resolves to the top surface', () => {
  // Lift RISES southward across the flight: ground, flight, and the
  // plateau south of it can all project onto one pixel. The visible
  // one is the southernmost (painted last) = largest lift.
  const liftAt = (wy: number): number =>
    wy < 20 ? 0 : wy < 21 ? ELEV_H * (wy - 20) : ELEV_H;
  const flatY = 19.5;
  const y = solveLiftedY(flatY, YS, liftAt);
  assert.ok(consistent(y, flatY, liftAt));
  assert.ok(
    Math.abs(y - (flatY + ELEV_H / YS)) < 1e-3,
    `expected the plateau surface, got ${y}`,
  );
});

test('dock deck: the small DOCK_LIFT-style offset is honored exactly', () => {
  const DECK = 0.22;
  const y = solveLiftedY(30, YS, () => DECK);
  assert.ok(Math.abs(y - (30 + DECK / YS)) < 1e-4);
});

test('cliff face: no surface answers, the flat inverse is the fallback', () => {
  // Mesa north of wy=20, ground south. Flat rows [20−2.25, 20) show
  // only the vertical face: mesa-top candidates land south of the
  // crown, ground candidates land on the mesa — no root anywhere.
  const liftAt = (wy: number): number => (wy < 20 ? ELEV_H : 0);
  assert.equal(solveLiftedY(19, YS, liftAt), 19);
});

// ── THE CAMERA LEARNS TO LEAN: the lift inversion rides depthScale ──

// A lean camera whose ortho origin lands on the pixel lattice (no
// snap rounding), so a forward→inverse round-trip is machine-exact.
const CAM = { scale: 40, yScale: YS, camX: 0, camY: 15, snap: 1, w: 1200, h: 800 };
const A = CAM.scale * CAM.yScale; // camY*A = 360, h/2 = 400 → oy = 40 (integer)

/** Screen-y the renderer draws a lifted ground point at world-depth wy:
 *  the flat-plane projection minus the DEPTH-SCALED lift (the forward
 *  model pickWorld must invert). */
function fwdScreenY(q: number, wy: number, lift: number): number {
  const out: XY = { x: 0, y: 0 };
  projectWorld(CAM.scale, CAM.yScale, CAM.camX, CAM.camY, q, CAM.snap, 0, wy, CAM.w, CAM.h, out);
  const ds = depthScaleWorld(CAM.scale, CAM.yScale, CAM.camY, q, wy);
  return out.y - lift * CAM.scale * ds;
}

/** The flat-plane world row the pixel unprojects to (pickWorld's flatY). */
function flatOf(q: number, sy: number): number {
  const out: XY = { x: 0, y: 0 };
  unprojectScreen(CAM.scale, CAM.yScale, CAM.camX, CAM.camY, q, CAM.snap, 0, sy, CAM.w, CAM.h, out);
  return out.y;
}

const lean = (q: number): { q: number; scale: number; camY: number } => ({
  q,
  scale: CAM.scale,
  camY: CAM.camY,
});

test('lean off (q=0): the depth-scaled solve is byte-identical to the ortho solve', () => {
  const cases: Array<(wy: number) => number> = [
    () => 0,
    () => ELEV_H,
    () => -ELEV_H,
    (wy) => (wy >= 10 ? ELEV_H : 0),
    (wy) => (wy < 20 ? ELEV_H : wy < 21 ? ELEV_H * (21 - wy) : 0),
  ];
  for (const liftAt of cases) {
    for (const flatY of [8, 9, 12.5, 19, 20.9, 30]) {
      const ortho = solveLiftedY(flatY, YS, liftAt);
      const withLean = solveLiftedY(flatY, YS, liftAt, lean(0));
      assert.equal(withLean, ortho, `q=0 must match ortho at flatY=${flatY}`);
    }
  }
});

test('lean on: a lifted plateau click round-trips to the correct world row', () => {
  const q = 0.0015;
  // +1 plateau everywhere; a surface point at wy=22 (lift ELEV_H).
  const liftAt = (): number => ELEV_H;
  const wy = 22;
  const sy = fwdScreenY(q, wy, ELEV_H);
  const flatY = flatOf(q, sy);
  const got = solveLiftedY(flatY, YS, liftAt, lean(q));
  assert.ok(Math.abs(got - wy) < 1e-3, `expected wy≈${wy}, got ${got}`);
});

test('lean on: the ortho inverse mis-picks; the depth-scaled inverse nails the tile', () => {
  // A plateau (+1) occupies tiles wy≥20; ground south of it. Click the
  // edge tile of the plateau at wy=20.5. Under lean the ortho solve
  // (no depthScale) lands on the WRONG tile; the depth-scaled solve
  // recovers the true tile.
  const q = 0.0022;
  const liftAt = (w: number): number => (w >= 20 ? ELEV_H : 0);
  const wy = 20.5;
  const sy = fwdScreenY(q, wy, ELEV_H);
  const flatY = flatOf(q, sy);

  const orthoWrong = solveLiftedY(flatY, YS, liftAt); // the pre-fix behavior
  const fixed = solveLiftedY(flatY, YS, liftAt, lean(q));

  assert.ok(Math.abs(fixed - wy) < 1e-3, `depth-scaled must recover wy≈${wy}, got ${fixed}`);
  assert.equal(Math.floor(fixed), 20, 'depth-scaled picks tile row 20');
  // The bug: the ortho inverse over-shifts the lift and picks a
  // different tile than the one drawn under the cursor.
  assert.ok(
    Math.abs(orthoWrong - wy) > 0.1,
    `ortho inverse should mis-pick under lean, got ${orthoWrong}`,
  );
});

test('lean on: a ramp tread round-trips (steep |lift′| — no fixed-point)', () => {
  const q = 0.0018;
  // Plateau north of wy=20, one-tile ramp [20,21), ground south.
  const liftAt = (w: number): number => (w < 20 ? ELEV_H : w < 21 ? ELEV_H * (21 - w) : 0);
  const wy = 20.4; // mid-tread
  const lift = liftAt(wy);
  const sy = fwdScreenY(q, wy, lift);
  const flatY = flatOf(q, sy);
  const got = solveLiftedY(flatY, YS, liftAt, lean(q));
  assert.ok(got >= 20 && got < 21, `expected a tread pick, got ${got}`);
  assert.ok(Math.abs(got - wy) < 1e-2, `expected wy≈${wy}, got ${got}`);
});

test('lean on: a dell floor (negative lift) round-trips', () => {
  const q = 0.0015;
  const liftAt = (w: number): number => (w >= 5 && w < 15 ? -ELEV_H : 0);
  const wy = 9;
  const sy = fwdScreenY(q, wy, -ELEV_H);
  const flatY = flatOf(q, sy);
  const got = solveLiftedY(flatY, YS, liftAt, lean(q));
  assert.ok(Math.abs(got - wy) < 1e-3, `expected wy≈${wy}, got ${got}`);
});
