import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBehind, sneakDetectionFactor, SNEAK_FACTOR } from './sneak.js';
import { InputButton, sanitizeInputFrame } from './input.js';

test('detection factor: shrinks with level, clamped at the master floor', () => {
  assert.equal(sneakDetectionFactor(1), 0.85);
  assert.ok(sneakDetectionFactor(50) < sneakDetectionFactor(10));
  assert.ok(Math.abs(sneakDetectionFactor(99) - 0.15) < 1e-9);
  assert.equal(sneakDetectionFactor(200), 0.15); // over-cap stays floored
});

test('isBehind: the rear cone follows the target facing', () => {
  // Target at origin facing +x: attacker directly behind (-x) backstabs.
  assert.ok(isBehind(-1, 0, 0, 0, 0));
  // Attacker dead ahead does not.
  assert.ok(!isBehind(1, 0, 0, 0, 0));
  // Perpendicular flank (90° off the back) is outside the 120° cone.
  assert.ok(!isBehind(0, 1, 0, 0, 0));
  // 30° off dead-behind is inside the cone.
  const a = Math.PI - Math.PI / 6;
  assert.ok(isBehind(Math.cos(a), Math.sin(a), 0, 0, 0));
  // Same geometry, target facing -y.
  assert.ok(isBehind(0, 1, 0, 0, -Math.PI / 2));
});

test('sanitize clamps sneak-flagged frames to sneak speed', () => {
  const fast = sanitizeInputFrame({ seq: 1, mx: 1, my: 0, aim: 0, buttons: InputButton.Sneak });
  assert.ok(Math.abs(Math.hypot(fast.mx, fast.my) - SNEAK_FACTOR) < 1e-9);
  // Without the bit, full tilt passes untouched.
  const run = sanitizeInputFrame({ seq: 2, mx: 1, my: 0, aim: 0, buttons: 0 });
  assert.equal(run.mx, 1);
  // Honest sneak frames (already scaled) pass through exactly.
  const honest = sanitizeInputFrame({ seq: 3, mx: 0.3, my: 0.2, aim: 0, buttons: InputButton.Sneak });
  assert.equal(honest.mx, 0.3);
  assert.equal(honest.my, 0.2);
});
