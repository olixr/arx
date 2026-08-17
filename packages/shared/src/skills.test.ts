import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combatLevel, levelForXp, xpForLevel, MAX_LEVEL } from './skills.js';

test('xp curve matches RuneScape landmarks', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 83);
  assert.equal(xpForLevel(10), 1154);
  assert.equal(xpForLevel(50), 101333);
  assert.equal(xpForLevel(99), 13034431);
});

test('levelForXp inverts xpForLevel', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    assert.equal(levelForXp(xpForLevel(lvl)), lvl);
    if (lvl > 1) assert.equal(levelForXp(xpForLevel(lvl) - 1), lvl - 1);
  }
});

test('xp beyond 99 stays 99', () => {
  assert.equal(levelForXp(200_000_000), 99);
});

test('combatLevel: a fresh character is level 1', () => {
  assert.equal(combatLevel({}), 1);
});

test('combatLevel: all three pillars at L sit at combat level L', () => {
  for (const lvl of [10, 40, 99]) {
    const xp = xpForLevel(lvl);
    assert.equal(combatLevel({ vitality: xp, defence: xp, onehand: xp }), lvl);
  }
});

test('combatLevel: only the best offense counts', () => {
  const xp = xpForLevel(60);
  const one = combatLevel({ onehand: xp });
  const three = combatLevel({ onehand: xp, archery: xp, arx: xp });
  assert.equal(one, three);
});

test('combatLevel: a pure skiller stays near 1', () => {
  assert.equal(combatLevel({ mining: xpForLevel(99), cooking: xpForLevel(99) }), 1);
});

// ------------------------------------------------------ THE FOCUS LAW

import {
  FOCUS_BASE,
  FOCUS_MILESTONES,
  callingCost,
  focusBudget,
  focusCostForSeat,
  xpForLevel as xpFor,
} from './skills.js';

test('focusBudget v2: base 2, +1 per skill at each quartile (25/50/75/99)', () => {
  // THE WIDER LADDER's one number move (callings-v2 Phase 4, green-lit):
  // the founding 50/99 milestones keep their seats inside the curve.
  assert.deepEqual([...FOCUS_MILESTONES], [25, 50, 75, 99]);
  assert.equal(focusBudget({}), FOCUS_BASE);
  assert.equal(focusBudget({ onehand: xpFor(24) }), FOCUS_BASE, 'one shy pays nothing');
  assert.equal(focusBudget({ onehand: xpFor(25) }), FOCUS_BASE + 1);
  assert.equal(focusBudget({ onehand: xpFor(50) }), FOCUS_BASE + 2);
  assert.equal(focusBudget({ onehand: xpFor(75) }), FOCUS_BASE + 3);
  assert.equal(focusBudget({ onehand: xpFor(99) }), FOCUS_BASE + 4, 'mastery pays all four');
  assert.equal(
    focusBudget({ onehand: xpFor(50), mining: xpFor(50), cooking: xpFor(99) }),
    FOCUS_BASE + 8,
    'breadth and depth both pay',
  );
  // The ceiling: 25 skills at 99 → 2 + 100.
  const all: Record<string, number> = {};
  for (let i = 0; i < 25; i++) all[`s${i}`] = xpFor(99);
  assert.equal(focusBudget(all), 102);
});

test('THE SEAT BANDS + RANK IS A CHOICE YOU AFFORD', () => {
  assert.equal(focusCostForSeat(10), 1);
  assert.equal(focusCostForSeat(39), 1);
  assert.equal(focusCostForSeat(40), 2);
  assert.equal(focusCostForSeat(79), 2);
  assert.equal(focusCostForSeat(80), 3);
  assert.equal(focusCostForSeat(99), 3);
  // Rank I holds the seat price; each rank past I holds one more.
  assert.equal(callingCost(2, 1), 2);
  assert.equal(callingCost(2, 2), 3);
  assert.equal(callingCost(2, 4), 5);
  assert.equal(callingCost(1, 0), 1, 'a nonsense rank floors at the seat price');
});

test('THE WIDER LADDER takes nothing away: the v2 budget dominates the founding curve everywhere', () => {
  // Every pre-Phase-4 answer is Rank I at a seat under 80 (its price
  // unchanged), so no login sanitize can ever drop a founding answer:
  // the new curve is >= the old (2 + 1@50 + 1@99) at every level.
  const old = (lvl: number): number => 2 + (lvl >= 50 ? 1 : 0) + (lvl >= 99 ? 1 : 0);
  for (let lvl = 1; lvl <= 99; lvl++) {
    assert.ok(focusBudget({ onehand: xpFor(lvl) }) >= old(lvl), `level ${lvl} lost budget`);
  }
});
