import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseKneeSign, LegSolver } from './rig.js';

/**
 * The knee rule under test: the pole is ANATOMICAL — knees bend with
 * the body's FACING, never with the travel direction. Side-on, both
 * knees bow toward the facing; front/back-on the flexion is edge-on to
 * the camera and a gentle down/outward preference takes over. Because
 * facing decides alone, the choice is deterministic from the pose —
 * approach history can never leave a leg in a stale sideways bend.
 */

/** Knee offset direction for a leg given the hip→foot screen vector. */
function kneeDir(
  ex: number,
  ey: number,
  fx: number,
  fy: number,
  sideSgn: number,
  memory = 0,
): { x: number; y: number; sign: number } {
  const d = Math.hypot(ex, ey) || 1;
  const cx = -ey / d;
  const cy = ex / d;
  const sign = chooseKneeSign(cx, cy, fx, fy, sideSgn, memory);
  return { x: cx * sign, y: cy * sign, sign };
}

test('facing right: both knees bow rightward, for any foot placement', () => {
  // Trailing foot (behind the hip) and leading foot (ahead of it).
  for (const [ex, ey] of [[-0.3, 0.35], [0.3, 0.35], [-0.1, 0.4], [0.2, 0.28]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, 1, 0, side);
      assert.ok(
        k.x > 0,
        `foot(${ex},${ey}) side ${side}: knee dir (${k.x.toFixed(2)},${k.y.toFixed(2)}) must bow with the facing`,
      );
    }
  }
});

test('facing left mirrors: both knees bow leftward', () => {
  for (const [ex, ey] of [[-0.3, 0.35], [0.3, 0.35]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, -1, 0, side);
      assert.ok(k.x < 0, `knee must bow with the leftward facing (got x=${k.x.toFixed(2)})`);
    }
  }
});

test('BACKPEDAL: knees follow the facing, not the travel', () => {
  // Facing right while the feet stride left — the exact aim-vs-move
  // split of mouse-look and twin-stick play. The old travel-pole bent
  // these knees leftward: a broken, inverted leg.
  for (const [ex, ey] of [[-0.3, 0.35], [0.3, 0.35]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, 1, 0, side);
      assert.ok(k.x > 0, `backpedal knee must stay with the facing (got x=${k.x.toFixed(2)})`);
    }
  }
});

test('facing down: knees bow downward, never inverted', () => {
  for (const [ex, ey] of [[-0.15, 0.25], [0.15, 0.25], [-0.15, 0.45], [0.15, 0.45]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, 0, 1, side);
      assert.ok(k.y > 0, `knee must bow down-screen facing the camera (got y=${k.y.toFixed(2)})`);
    }
  }
});

test('facing up: knees never jut sharply up toward the torso', () => {
  for (const [ex, ey] of [[-0.15, 0.25], [0.15, 0.25]] as const) {
    for (const side of [-1, 1]) {
      const k = kneeDir(ex, ey, 0, -1, side);
      assert.ok(k.y > -0.2, `back-facing knee juts up (y=${k.y.toFixed(2)})`);
    }
  }
});

test('the choice is deterministic from the pose — no approach-history residue', () => {
  // Same facing + same foot must give the same knee whatever direction
  // the character arrived from (memory only smooths borderline calls).
  const a = kneeDir(0.15, 0.35, 0, 1, 1, 1);
  const b = kneeDir(0.15, 0.35, 0, 1, 1, -1);
  assert.equal(a.sign, b.sign, 'a decisive facing must override any stale memory');
});

test('hysteresis holds a borderline choice steady', () => {
  // Facing right with the chord perpendicular nearly orthogonal to the
  // pole: |score| lands inside the band, so memory rules.
  const first = chooseKneeSign(0.1, 0.995, 1, 0, 1, -1);
  assert.equal(first, -1, 'weak signal must not flip the standing choice');
  const strong = chooseKneeSign(0.9, 0.436, 1, 0, 1, -1);
  assert.equal(strong, 1, 'a decisive signal must overturn memory');
});

test('solver reports travel + gait blend: strong when running, off at rest', () => {
  const solver = new LegSolver();
  let pose = solver.update(0, 0, 0, 1 / 60);
  for (let t = 0; t < 1; t += 1 / 60) pose = solver.update(5 * t, 0, 0, 1 / 60);
  assert.ok(pose.poleStrength > 0.9, `running strength ${pose.poleStrength.toFixed(2)}`);
  assert.ok(pose.poleX > 0.9, 'travel points along the run');
  assert.ok(pose.runF > 0.9, `full tilt must read as sprint (runF ${pose.runF.toFixed(2)})`);
  for (let t = 0; t < 1; t += 1 / 60) pose = solver.update(5, 0, 0, 1 / 60);
  assert.ok(pose.poleStrength < 0.2, `resting strength ${pose.poleStrength.toFixed(2)}`);
  assert.ok(pose.runF < 0.1, `resting runF ${pose.runF.toFixed(2)}`);
});
