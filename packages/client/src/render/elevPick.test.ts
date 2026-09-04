import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEV_H, solveLiftedY } from './elevPick.js';

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
