import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelForXp, xpForLevel, MAX_LEVEL } from './skills.js';

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
