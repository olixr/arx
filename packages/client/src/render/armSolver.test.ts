import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveArm } from './rig.js';

const L = 0.17;

test('elbow lands on the preferred side of the shoulder→hand line', () => {
  // Hand below-right of the shoulder; prefer the elbow downward.
  const down = solveArm(0, 0, 0.2, 0.1, L, 0, 1);
  const up = solveArm(0, 0, 0.2, 0.1, L, 0, -1);
  assert.ok(down.ky > up.ky, 'preference flips the elbow side');
  assert.ok(down.ky > 0.05, 'downward preference puts the elbow below');
});

test('segment lengths hold through the solve', () => {
  const { ex, ey, kx, ky } = solveArm(0, 0, 0.15, 0.18, L, 0, 1);
  const upper = Math.hypot(kx, ky);
  const fore = Math.hypot(ex - kx, ey - ky);
  assert.ok(Math.abs(upper - L) < 1e-9, `upper arm stays bone-length (${upper})`);
  assert.ok(Math.abs(fore - L) < 1e-9, `forearm stays bone-length (${fore})`);
});

test('an out-of-reach hand is clamped, never stretched', () => {
  const { ex, ey } = solveArm(0, 0, 5, 5, L, 0, 1);
  const d = Math.hypot(ex, ey);
  assert.ok(d <= L * 2 * 1.08 + 1e-9, `hand clamped into reach (${d})`);
  // Still points at the target.
  assert.ok(Math.abs(ex - ey) < 1e-9, 'clamp preserves direction');
});

test('a straight-arm reach keeps a stable elbow (no NaN, on the line)', () => {
  const r = solveArm(0, 0, L * 2 * 1.08, 0, L, 0, 1);
  assert.ok(Number.isFinite(r.kx + r.ky), 'no NaN at full extension');
  assert.ok(Math.abs(r.ky) < 0.02, 'elbow sits on the arm line when straight');
});
