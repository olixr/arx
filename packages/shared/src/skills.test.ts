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

import { FOCUS_BASE, focusBudget, xpForLevel as xpFor } from './skills.js';

test('focusBudget: base 2, +1 per skill at 50, +1 more at 99', () => {
  assert.equal(focusBudget({}), FOCUS_BASE);
  assert.equal(focusBudget({ onehand: xpFor(49) }), FOCUS_BASE, 'one shy pays nothing');
  assert.equal(focusBudget({ onehand: xpFor(50) }), FOCUS_BASE + 1);
  assert.equal(focusBudget({ onehand: xpFor(99) }), FOCUS_BASE + 2, 'mastery pays twice');
  assert.equal(
    focusBudget({ onehand: xpFor(50), mining: xpFor(50), cooking: xpFor(99) }),
    FOCUS_BASE + 4,
    'breadth and depth both pay',
  );
});

// --------------------------------------------------- THE ARX WIELDING LAW

import {
  COMBAT_SCHOOL_IDS,
  SKILL_IDS,
  isSkillId,
  resolveSkillId,
  skillName,
} from './skills.js';

test('arx is the caster school, and magic is retired', () => {
  assert.ok(SKILL_IDS.includes('arx'), 'arx sits in the roster');
  assert.ok(isSkillId('arx'));
  assert.ok(!isSkillId('magic'), 'the old id is gone from the roster');
  assert.ok(COMBAT_SCHOOL_IDS.includes('arx'), 'it still echoes into combat');
});

test('arx wears its spoken name; plain ids speak for themselves', () => {
  assert.equal(skillName('arx'), 'Arx Wielding');
  assert.equal(skillName('mining'), 'mining', 'no name, no map row');
  assert.equal(skillName('shield'), 'Shield', 'hidden skills keep their own name');
});

test('retired ids resolve forever — Studio-owned rows never reseed', () => {
  assert.equal(resolveSkillId('magic'), 'arx');
  assert.equal(resolveSkillId('melee'), 'onehand');
  assert.equal(resolveSkillId('arx'), 'arx', 'a live id passes through');
  assert.equal(resolveSkillId('sorcery'), null, 'an unknown id is refused, not guessed');
});
