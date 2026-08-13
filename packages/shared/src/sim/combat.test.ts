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
  const { SNAP_CHAIN, advanceCombo, freshCombo } = await import('./combat.js');
  const track = freshCombo();
  // Taps in rhythm: each swing stamps a grace window the next lands in.
  const tap = (now: number) => {
    const stage = advanceCombo(track, 'shortbow', now, SNAP_CHAIN);
    track.graceUntilTick = now + 16;
    return stage;
  };
  assert.equal(tap(0), 0);
  assert.equal(tap(10), 1);
  assert.equal(tap(20), SNAP_CHAIN - 1, 'third tap reaches the fan stage');
  assert.equal(tap(30), 0, 'fan resets the chain');
  assert.equal(tap(100), 0, 'dropping the rhythm resets');
});

// ------------------------------------------------- the one rhythm engine

test('ONE RHYTHM: the string advances inside grace and dies outside it', async () => {
  const { advanceCombo, freshCombo, COMBO_STAGES } = await import('./combat.js');
  const track = freshCombo();
  const swing = (now: number) => {
    const stage = advanceCombo(track, 'falchion', now);
    track.graceUntilTick = now + 20;
    return stage;
  };
  assert.equal(swing(0), 0, 'first swing opens the string');
  assert.equal(swing(10), 1);
  assert.equal(swing(20), COMBO_STAGES - 1, 'third beat is the finisher');
  assert.equal(swing(30), 0, 'the finisher always resets');
  assert.equal(swing(40), 1);
  assert.equal(swing(61), 0, 'one tick past grace drops the string');
});

test('ONE RHYTHM: the string belongs to the weapon that started it', async () => {
  const { advanceCombo, freshCombo } = await import('./combat.js');
  const track = freshCombo();
  advanceCombo(track, 'falchion', 0);
  track.graceUntilTick = 100;
  advanceCombo(track, 'falchion', 10);
  track.graceUntilTick = 100;
  assert.equal(track.stage, 1, 'two sword swings deep');
  // The old bug, pinned dead: swapping to a greatsword mid-string used
  // to land an instant x3.0 finisher. A new weapon starts a NEW string.
  assert.equal(
    advanceCombo(track, 'doom_greatsword', 20),
    0,
    'a swapped-in weapon never inherits the string',
  );
  assert.equal(track.weaponId, 'doom_greatsword', 'the new weapon owns the track');
});

test('ONE RHYTHM: reset drops the string entirely', async () => {
  const { advanceCombo, freshCombo, resetCombo } = await import('./combat.js');
  const track = freshCombo();
  advanceCombo(track, 'falchion', 0);
  track.graceUntilTick = 100;
  advanceCombo(track, 'falchion', 10);
  track.graceUntilTick = 100;
  resetCombo(track);
  assert.equal(track.weaponId, null, 'no weapon owns a dropped string');
  assert.equal(
    advanceCombo(track, 'falchion', 12),
    0,
    'the same weapon starts over after a reset',
  );
});

test('ONE RHYTHM: agrees with the legacy stage law under the same inputs', async () => {
  // The refactor's identity proof: for every (prevStage, withinGrace)
  // the engine plays the exact stage nextComboStage played — the four
  // private copies collapsed into ComboTrack without a beat moving.
  const { advanceCombo, nextComboStage, COMBO_STAGES } = await import('./combat.js');
  for (let prev = 0; prev < COMBO_STAGES; prev++) {
    for (const within of [true, false]) {
      const track = { stage: prev, graceUntilTick: within ? 10 : 0, weaponId: 'falchion', run: 1 };
      assert.equal(
        advanceCombo(track, 'falchion', 5),
        nextComboStage(prev, within),
        `prev=${prev} within=${within}`,
      );
    }
  }
});

test('THE RUN: counts unbroken rhythm across wraps, dies with the string', async () => {
  const { advanceCombo, freshCombo, resetCombo } = await import('./combat.js');
  const track = freshCombo();
  const swing = (now: number) => {
    advanceCombo(track, 'falchion', now);
    track.graceUntilTick = now + 20;
  };
  swing(0);
  swing(10);
  swing(20); // finisher
  swing(30); // wraps into the next opener — the run flows through
  assert.equal(track.run, 4, 'the wrap keeps the run alive');
  swing(100); // rest past grace
  assert.equal(track.run, 1, 'a dropped string starts the run over');
  resetCombo(track);
  assert.equal(track.run, 0, 'a reset kills the run outright');
});

test('THE HELD INTENT: the buffer arms only in the tail of recovery', async () => {
  const { armBuffer, ATTACK_BUFFER_TICKS, BUFFER_FIRE_SLACK_TICKS } = await import('./combat.js');
  assert.equal(armBuffer(0, 100), 0, 'a free hand needs no buffer — the swing just goes');
  assert.equal(armBuffer(-3, 100), 0, 'past-ready is a free hand too');
  assert.equal(
    armBuffer(ATTACK_BUFFER_TICKS + 1, 100),
    0,
    'a press too early to buffer dies unarmed',
  );
  const armed = armBuffer(5, 100);
  assert.equal(armed, 100 + 5 + BUFFER_FIRE_SLACK_TICKS, 'fires at ready, expires on the slack');
  assert.ok(
    armBuffer(ATTACK_BUFFER_TICKS, 100) > 0,
    'the whole authored window arms',
  );
});

test('the mirror helpers agree with the lane constants forever', async () => {
  const {
    finisherRecoveryMult,
    comboGraceTicksFor,
    FINISHER_RECOVERY_MULT,
    TWOHAND_FINISHER_RECOVERY_MULT,
    HEAVY_BOLT_RECOVERY_MULT,
    COMBO_GRACE_TICKS,
    TWOHAND_COMBO_GRACE_TICKS,
  } = await import('./combat.js');
  // The client swing mirror predicts with these helpers while the
  // server lanes read the constants directly — pinned equal so the
  // two can never drift apart.
  assert.equal(finisherRecoveryMult('onehand'), FINISHER_RECOVERY_MULT);
  assert.equal(finisherRecoveryMult('twohand'), TWOHAND_FINISHER_RECOVERY_MULT);
  assert.equal(finisherRecoveryMult('arx'), HEAVY_BOLT_RECOVERY_MULT);
  assert.equal(comboGraceTicksFor('onehand'), COMBO_GRACE_TICKS);
  assert.equal(comboGraceTicksFor('twohand'), TWOHAND_COMBO_GRACE_TICKS);
  assert.equal(comboGraceTicksFor('arx'), COMBO_GRACE_TICKS);
});

test('THE STRIKE CLOCK: every pose hold outlives its choreography', async () => {
  const { STRIKE_CLOCKS } = await import('./combat.js');
  const { TICK_MS } = await import('../constants.js');
  for (const [school, clocks] of Object.entries(STRIKE_CLOCKS)) {
    for (const [beat, clock] of Object.entries(clocks)) {
      assert.ok(
        clock.holdTicks * TICK_MS >= clock.ms,
        `${school}.${beat}: pose hold ${clock.holdTicks}t must outlive ${clock.ms}ms`,
      );
    }
  }
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
