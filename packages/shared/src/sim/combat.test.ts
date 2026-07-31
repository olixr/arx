import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_SKILLS, SKILL_IDS, isHiddenSkill } from '../skills.js';
import {
  COMBO_STAGES,
  DRAW_FULL_TICKS,
  OFFHAND_DMG_BASE,
  offhandDamageFactor,
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
  assert.ok(!isDrawSlowed(held, 'onehand'));
  assert.ok(!isDrawSlowed(held, null));
});

test('combo chain advances inside grace, finisher wraps, gap resets', () => {
  assert.equal(nextComboStage(0, true), 1);
  assert.equal(nextComboStage(1, true), 2);
  assert.equal(nextComboStage(2, true), 0, 'finisher always resets');
  assert.equal(nextComboStage(1, false), 0, 'a pause drops the string');
  assert.ok(COMBO_STAGES === 3);
});

test('snap shots are weak, short, and never zero', async () => {
  const { snapShot } = await import('./combat.js');
  const s = snapShot(6, 16, 7);
  assert.ok(s.maxHit >= 1 && s.maxHit < 6, 'weaker than a full arrow');
  assert.ok(s.range < 7 * 0.6, 'short reach');
  assert.equal(snapShot(1, 16, 7).maxHit, 1, 'floor at 1');
});

test('snap rhythm chains to the fan on the third, gap resets', async () => {
  const { SNAP_CHAIN, nextSnapStage } = await import('./combat.js');
  let stage = 0;
  stage = nextSnapStage(stage, true);
  stage = nextSnapStage(stage, true);
  assert.equal(stage, SNAP_CHAIN - 1, 'third tap reaches the fan stage');
  assert.equal(nextSnapStage(stage, true), 0, 'fan resets the chain');
  assert.equal(nextSnapStage(1, false), 0, 'dropping the rhythm resets');
});

test('heavy bolt laws: big, slow, splashy', async () => {
  const { HEAVY_BOLT_MULT, HEAVY_BOLT_RECOVERY_MULT, HEAVY_BOLT_SPLASH } = await import(
    './combat.js'
  );
  assert.ok(HEAVY_BOLT_MULT >= 1.5, 'the payoff beat must hit hard');
  assert.ok(HEAVY_BOLT_RECOVERY_MULT > 1, 'and cost recovery');
  assert.ok(HEAVY_BOLT_SPLASH > 0, 'and splash');
});

test('dual wield: offhand factor starts clumsy, climbs monotonically, never mirrors', () => {
  assert.equal(offhandDamageFactor(1), OFFHAND_DMG_BASE);
  let prev = 0;
  for (let lvl = 1; lvl <= 99; lvl++) {
    const f = offhandDamageFactor(lvl);
    assert.ok(f >= prev, 'factor never regresses');
    assert.ok(f < 1, 'the off hand never out-hits the main');
    prev = f;
  }
  assert.ok(offhandDamageFactor(99) >= 0.8, 'mastery should nearly mirror the main hand');
  // Below level 1 (undiscovered edge) clamps to the base.
  assert.equal(offhandDamageFactor(0), OFFHAND_DMG_BASE);
});

test('hidden skills are real skills and never leak into the visible roster by default', () => {
  for (const id of Object.keys(HIDDEN_SKILLS)) {
    assert.ok((SKILL_IDS as readonly string[]).includes(id), `${id} not a SkillId`);
  }
  assert.ok(isHiddenSkill('dualwield'));
  assert.ok(!isHiddenSkill('onehand'));
});
