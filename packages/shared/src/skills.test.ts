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
    assert.equal(combatLevel({ vitality: xp, defence: xp, melee: xp }), lvl);
  }
});

test('combatLevel: only the best offense counts', () => {
  const xp = xpForLevel(60);
  const one = combatLevel({ melee: xp });
  const three = combatLevel({ melee: xp, archery: xp, magic: xp });
  assert.equal(one, three);
});

test('combatLevel: a pure skiller stays near 1', () => {
  assert.equal(combatLevel({ mining: xpForLevel(99), cooking: xpForLevel(99) }), 1);
});
