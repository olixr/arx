import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SWING_MULT_MAX,
  SWING_MULT_MIN,
  buffArmor,
  buffCritPct,
  buffDmgMult,
  buffGatherSpeed,
  buffLifesteal,
  buffReflectFrac,
  buffRegenPer4s,
  buffSpeedMult,
  restack,
  swingCooldown,
  swingMult,
  type BuffLike,
} from './buffForge.js';

/**
 * THE BUFF FORGE (status-book-plan.md Phase 2), pinned:
 *
 * - THE DECLARED TABLE holds: crit additive, dmgMult additive-of-
 *   excess, speed multiplicative, armor sum, reflect/lifesteal max,
 *   regen/gather best-of — the exact rules the read sites folded
 *   before the forge (byte-identical proof rides the live suites;
 *   this file pins the table itself).
 * - STACKS deepen additive and multiplicative rules and are IGNORED
 *   by max/best rules, by law.
 * - THE SWING CHANNEL: gear × buffs, band-clamped — no assembly of
 *   sources escapes the band; the choreography floor binds the haste
 *   and never the weapon; mult 1 is byte-identical.
 */

const buff = (over: Partial<BuffLike> = {}): BuffLike => ({
  speedMult: 1,
  attackSpeedMult: 1,
  armor: 0,
  reflectFrac: 0,
  gatherSpeed: 1,
  regenPer4s: 0,
  meleeLifesteal: 0,
  critPct: 0,
  dmgMult: 1,
  ...over,
});

test('the table: crit adds, dmgMult adds its excess, speed multiplies', () => {
  const buffs = [buff({ critPct: 10, dmgMult: 1.1, speedMult: 1.2 }), buff({ critPct: 5, dmgMult: 1.05, speedMult: 1.1 })];
  assert.equal(buffCritPct(buffs), 15);
  assert.ok(Math.abs(buffDmgMult(buffs) - 1.15) < 1e-9, 'surges add, never compound');
  assert.ok(Math.abs(buffSpeedMult(buffs) - 1.32) < 1e-9, 'strides multiply');
});

test('the table: armor sums; reflect, lifesteal, regen, gather take the best', () => {
  const buffs = [
    buff({ armor: 4, reflectFrac: 0.3, meleeLifesteal: 0.35, regenPer4s: 2, gatherSpeed: 1.2 }),
    buff({ armor: 8, reflectFrac: 0.6, meleeLifesteal: 0.2, regenPer4s: 5, gatherSpeed: 1.1 }),
  ];
  assert.equal(buffArmor(buffs), 12);
  assert.equal(buffReflectFrac(buffs), 0.6);
  assert.equal(buffLifesteal(buffs), 0.35);
  assert.equal(buffRegenPer4s(buffs), 5);
  assert.equal(buffGatherSpeed(buffs), 1.2);
});

test('stacks deepen additive rules and are ignored by the best-of rules', () => {
  const stacked = [buff({ critPct: 4, armor: 3, regenPer4s: 6, reflectFrac: 0.2, stacks: 3 })];
  assert.equal(buffCritPct(stacked), 12, 'additive × stacks');
  assert.equal(buffArmor(stacked), 9, 'sum × stacks');
  assert.equal(buffRegenPer4s(stacked), 6, 'best-of ignores the count');
  assert.equal(buffReflectFrac(stacked), 0.2, 'max ignores the count');
  const multStacked = [buff({ speedMult: 1.1, dmgMult: 1.05, stacks: 2 })];
  assert.ok(Math.abs(buffSpeedMult(multStacked) - 1.21) < 1e-9, 'multiplicative ^ stacks');
  assert.ok(Math.abs(buffDmgMult(multStacked) - 1.1) < 1e-9, 'excess × stacks');
});

test('an empty row folds to the trained baseline everywhere', () => {
  assert.equal(buffCritPct([]), 0);
  assert.equal(buffDmgMult([]), 1);
  assert.equal(buffSpeedMult([]), 1);
  assert.equal(buffArmor([]), 0);
  assert.equal(swingMult(1, []), 1);
});

// ------------------------------------------------- THE SWING CHANNEL

test('the swing channel folds gear with buffs and the band is engine law', () => {
  assert.ok(Math.abs(swingMult(1.1, [buff({ attackSpeedMult: 1.2 })]) - 1.32) < 1e-9);
  assert.equal(swingMult(1.4, [buff({ attackSpeedMult: 1.4 })]), SWING_MULT_MAX, 'no assembly escapes the top');
  assert.equal(swingMult(0.5, [buff({ attackSpeedMult: 0.8 })]), SWING_MULT_MIN, 'or the floor');
  assert.ok(
    Math.abs(swingMult(1, [buff({ attackSpeedMult: 1.1, stacks: 2 })]) - 1.21) < 1e-9,
    'a stacking quickening deepens per stack',
  );
});

test('swingCooldown: mult 1 is byte-identical, haste rounds honestly, slows stretch', () => {
  assert.equal(swingCooldown(14, 1), 14);
  assert.equal(swingCooldown(14, 1, 6), 14, 'the floor never binds the unhastened weapon');
  assert.equal(swingCooldown(14, 1.4), 10);
  assert.equal(swingCooldown(14, 0.7), 20, 'a slow stretches the recovery');
  assert.equal(swingCooldown(1, 1.5), 1, 'never below one tick');
});

test('THE CHOREOGRAPHY FLOOR binds the haste, never the weapon', () => {
  // Hasted below the pose hold: the floor stops it.
  assert.equal(swingCooldown(9, 1.5, 8), 8, 'haste stops at the hold');
  // A base already under the floor keeps its own law — the floor
  // denies the haste, not the weapon's native cadence.
  assert.equal(swingCooldown(5, 1.5, 8), 5);
  assert.equal(swingCooldown(5, 1, 8), 5, 'and unhastened it is untouched');
});

// ------------------------------------------------------- THE RESTACK

test('restack climbs to the buff\'s own max and refreshes the clock by max', () => {
  const b = { stacks: undefined as number | undefined, maxStacks: 3, untilTick: 100 };
  assert.equal(restack(b, 80), 2, 'an uncounted buff was one stack');
  assert.equal(b.untilTick, 100, 'a shorter landing never shortens');
  assert.equal(restack(b, 200), 3);
  assert.equal(restack(b, 250), 3, 'the max holds');
  assert.equal(b.untilTick, 250, 'the clock refreshes upward');
});

test('restack without a declared max is refresh-only — one stack forever', () => {
  const b = { stacks: undefined as number | undefined, untilTick: 50 };
  assert.equal(restack(b, 90), 1);
  assert.equal(b.untilTick, 90);
});
