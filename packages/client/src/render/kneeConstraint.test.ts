import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseKneeSign, LegSolver } from './rig.js';

/**
 * The knee rule under test: while running, both knees bow toward the
 * travel direction — a knee bent against the run is an inverted leg.
 */

/** Knee offset direction for a leg given the hip→foot screen vector. */
function kneeDir(
  ex: number,
  ey: number,
  poleX: number,
  poleY: number,
  strength: number,
  sideSgn: number,
  memory = 0,
): { x: number; y: number; sign: number } {
  const d = Math.hypot(ex, ey) || 1;
  const cx = -ey / d;
  const cy = ex / d;
  const sign = chooseKneeSign(cx, cy, poleX, poleY, strength, sideSgn, memory);
  return { x: cx * sign, y: cy * sign, sign };
}

test('running right: both knees bow rightward, for any foot placement', () => {
  // Trailing foot (behind the hip) and leading foot (ahead of it).
  for (const [ex, ey] of [[-0.3, 0.35], [0.3, 0.35], [-0.1, 0.4], [0.2, 0.28]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, 1, 0, 1, side);
      assert.ok(
        k.x > 0,
        `foot(${ex},${ey}) side ${side}: knee dir (${k.x.toFixed(2)},${k.y.toFixed(2)}) must point with travel`,
      );
    }
  }
});

test('running left mirrors: both knees bow leftward', () => {
  for (const [ex, ey] of [[-0.3, 0.35], [0.3, 0.35]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, -1, 0, 1, side);
      assert.ok(k.x < 0, `knee must bow with leftward travel (got x=${k.x.toFixed(2)})`);
    }
  }
});

test('running down: knees bow downward (toward travel), never inverted', () => {
  for (const [ex, ey] of [[-0.15, 0.25], [0.15, 0.25], [-0.15, 0.45], [0.15, 0.45]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, 0, 1, 1, side);
      assert.ok(k.y > 0, `knee must bow with downward travel (got y=${k.y.toFixed(2)})`);
    }
  }
});

test('idle keeps the natural rule: knees up-ish or outward, sides may differ', () => {
  // Left leg with foot below-left, right leg with foot below-right.
  const left = kneeDir(-0.1, 0.4, 0, 0, 0, -1);
  const right = kneeDir(0.1, 0.4, 0, 0, 0, 1);
  assert.ok(left.y <= 0.2, 'idle knee does not point sharply down');
  assert.ok(right.y <= 0.2, 'idle knee does not point sharply down');
});

test('hysteresis holds a borderline choice steady', () => {
  // Perpendicular nearly orthogonal to the pole: weak signal.
  const first = chooseKneeSign(0.05, 0.999, 1, 0, 1, 1, 0);
  const held = chooseKneeSign(-0.05, 0.999, 1, 0, 1, 1, first);
  assert.equal(held, first, 'weak opposite signal must not flip the knee');
});

test('solver reports the pole: strong when running, off at rest', () => {
  const solver = new LegSolver();
  let pose = solver.update(0, 0, 0, 1 / 60);
  for (let t = 0; t < 1; t += 1 / 60) pose = solver.update(5 * t, 0, 0, 1 / 60);
  assert.ok(pose.poleStrength > 0.9, `running pole ${pose.poleStrength.toFixed(2)}`);
  assert.ok(pose.poleX > 0.9, 'pole points along travel');
  for (let t = 0; t < 1; t += 1 / 60) pose = solver.update(5, 0, 0, 1 / 60);
  assert.ok(pose.poleStrength < 0.2, `resting pole ${pose.poleStrength.toFixed(2)}`);
});
