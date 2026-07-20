import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DROP_MERGE_RADIUS, canMergeDrop, type DropLike } from './drops.js';

const bones = (over: Partial<DropLike> = {}): DropLike => ({
  item: 'bones',
  ownerEid: null,
  ...over,
});

test('twin drops merge: same item, no rolls, both unowned', () => {
  assert.equal(canMergeDrop(bones(), 'bones', undefined, null, undefined), true);
});

test('different items never merge', () => {
  assert.equal(canMergeDrop(bones(), 'feather', undefined, null, undefined), false);
});

test('kill loot merges only for the same claim holder', () => {
  const mine = bones({ ownerEid: 7 });
  assert.equal(canMergeDrop(mine, 'bones', undefined, 7, undefined), true);
  assert.equal(canMergeDrop(mine, 'bones', undefined, 9, undefined), false);
  // A free bag never folds into a claimed pile (nor the reverse) —
  // merging across claims would transfer or launder the loot lock.
  assert.equal(canMergeDrop(mine, 'bones', undefined, null, undefined), false);
  assert.equal(canMergeDrop(bones(), 'bones', undefined, 7, undefined), false);
});

test('rolled instances merge only when the roll is identical', () => {
  const sword = bones({ item: 'bronze_sword', roll: { rar: 'rare', seed: 41 } });
  assert.equal(
    canMergeDrop(sword, 'bronze_sword', { rar: 'rare', seed: 41 }, null, undefined),
    true,
  );
  assert.equal(
    canMergeDrop(sword, 'bronze_sword', { rar: 'rare', seed: 42 }, null, undefined),
    false,
  );
  assert.equal(canMergeDrop(sword, 'bronze_sword', undefined, null, undefined), false);
});

test('an enchant on the roll keeps instances apart', () => {
  const kindled = bones({
    item: 'bronze_sword',
    roll: { rar: 'common', seed: 0, ench: 'kindled_edge' },
  });
  assert.equal(
    canMergeDrop(kindled, 'bronze_sword', { rar: 'common', seed: 0 }, null, undefined),
    false,
  );
  assert.equal(
    canMergeDrop(
      kindled,
      'bronze_sword',
      { rar: 'common', seed: 0, ench: 'kindled_edge' },
      null,
      undefined,
    ),
    true,
  );
});

test('xp-bearing drops (laid eggs) never merge', () => {
  const egg = bones({ item: 'egg', xpOnPickup: { skill: 'farming', xp: 4 } });
  assert.equal(canMergeDrop(egg, 'egg', undefined, null, undefined), false);
  assert.equal(
    canMergeDrop(bones({ item: 'egg' }), 'egg', undefined, null, { skill: 'farming', xp: 4 }),
    false,
  );
});

test('merge radius is a local law, not a room-wide one', () => {
  assert.ok(DROP_MERGE_RADIUS >= 0.8 && DROP_MERGE_RADIUS <= 1.5);
});
