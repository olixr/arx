import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBO_STAGES,
  DRAW_FULL_TICKS,
  chargedShot,
  drawCharge,
  isDrawSlowed,
  nextComboStage,
} from './combat.js';
import { InputButton } from './input.js';

test('draw charge ramps 0→1 and clamps at full', () => {
  assert.equal(drawCharge(0), 0);
  assert.equal(drawCharge(DRAW_FULL_TICKS), 1);
  assert.equal(drawCharge(DRAW_FULL_TICKS * 3), 1);
  const half = drawCharge(DRAW_FULL_TICKS / 2);
  assert.ok(half > 0.4 && half < 0.6);
});

test('charged shot scales damage, speed, and range monotonically', () => {
  const weak = chargedShot(0, 10, 14, 7);
  const full = chargedShot(1, 10, 14, 7);
  assert.ok(weak.maxHit < full.maxHit);
  assert.ok(weak.speed < full.speed);
  assert.ok(weak.range < full.range);
  assert.equal(full.maxHit, 10, 'full draw delivers the whole hit');
  assert.ok(weak.maxHit >= 1, 'a loosed arrow always threatens');
});

test('draw slow-down applies only to a held bow', () => {
  const held = { buttons: InputButton.Attack };
  const idle = { buttons: 0 };
  assert.ok(isDrawSlowed(held, 'archery'));
  assert.ok(!isDrawSlowed(idle, 'archery'));
  assert.ok(!isDrawSlowed(held, 'melee'));
  assert.ok(!isDrawSlowed(held, null));
});

test('combo chain advances inside grace, finisher wraps, gap resets', () => {
  assert.equal(nextComboStage(0, true), 1);
  assert.equal(nextComboStage(1, true), 2);
  assert.equal(nextComboStage(2, true), 0, 'finisher always resets');
  assert.equal(nextComboStage(1, false), 0, 'a pause drops the string');
  assert.ok(COMBO_STAGES === 3);
});
