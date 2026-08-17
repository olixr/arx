import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { InvSlot } from '@arx/shared';
import {
  DEATH_SPILL_TTL_MS,
  DROP_MERGE_RADIUS,
  canMergeDrop,
  spillInventory,
  type DropLike,
} from './drops.js';

const NOW = 1_000_000;

const bones = (over: Partial<DropLike> = {}): DropLike => ({
  item: 'bones',
  ownerEid: null,
  ownerUntil: 0,
  ...over,
});

test('twin drops merge: same item, no rolls, both unowned', () => {
  assert.equal(canMergeDrop(bones(), bones(), NOW), true);
});

test('different items never merge', () => {
  assert.equal(canMergeDrop(bones(), bones({ item: 'feather' }), NOW), false);
});

test('kill loot merges only for the same LIVE claim holder', () => {
  const mine = bones({ ownerEid: 7, ownerUntil: NOW + 30_000 });
  assert.equal(canMergeDrop(mine, bones({ ownerEid: 7, ownerUntil: NOW + 30_000 }), NOW), true);
  assert.equal(canMergeDrop(mine, bones({ ownerEid: 9, ownerUntil: NOW + 30_000 }), NOW), false);
  // A free bag never folds into a LIVE-claimed pile (nor the reverse) —
  // merging across live claims would transfer or launder the loot lock.
  assert.equal(canMergeDrop(mine, bones(), NOW), false);
  assert.equal(canMergeDrop(bones(), mine, NOW), false);
});

test('THE PATIENT PILE: lapsed claims fold across owners', () => {
  const yesterdays = bones({ ownerEid: 7, ownerUntil: NOW - 1 });
  // Two expired claims from different killers tidy into one pile.
  assert.equal(canMergeDrop(yesterdays, bones({ ownerEid: 9, ownerUntil: NOW - 1 }), NOW), true);
  // A free bag joins a lapsed pile, and the reverse.
  assert.equal(canMergeDrop(yesterdays, bones(), NOW), true);
  assert.equal(canMergeDrop(bones(), yesterdays, NOW), true);
  // But one LIVE claim on either side still splits — the lock holds
  // until its last millisecond.
  assert.equal(
    canMergeDrop(yesterdays, bones({ ownerEid: 9, ownerUntil: NOW + 1 }), NOW),
    false,
  );
  assert.equal(
    canMergeDrop(bones({ ownerEid: 9, ownerUntil: NOW + 1 }), yesterdays, NOW),
    false,
  );
});

test('rolled instances merge only when the roll is identical', () => {
  const sword = bones({ item: 'bronze_sword', roll: { rar: 'rare', seed: 41 } });
  assert.equal(
    canMergeDrop(sword, bones({ item: 'bronze_sword', roll: { rar: 'rare', seed: 41 } }), NOW),
    true,
  );
  assert.equal(
    canMergeDrop(sword, bones({ item: 'bronze_sword', roll: { rar: 'rare', seed: 42 } }), NOW),
    false,
  );
  assert.equal(canMergeDrop(sword, bones({ item: 'bronze_sword' }), NOW), false);
});

test('an enchant on the roll keeps instances apart', () => {
  const kindled = bones({
    item: 'bronze_sword',
    roll: { rar: 'common', seed: 0, ench: 'kindled_edge' },
  });
  assert.equal(
    canMergeDrop(kindled, bones({ item: 'bronze_sword', roll: { rar: 'common', seed: 0 } }), NOW),
    false,
  );
  assert.equal(
    canMergeDrop(
      kindled,
      bones({ item: 'bronze_sword', roll: { rar: 'common', seed: 0, ench: 'kindled_edge' } }),
      NOW,
    ),
    true,
  );
});

test('xp-bearing drops (laid eggs) never merge', () => {
  const egg = bones({ item: 'egg', xpOnPickup: { skill: 'farming', xp: 4 } });
  assert.equal(canMergeDrop(egg, bones({ item: 'egg' }), NOW), false);
  assert.equal(canMergeDrop(bones({ item: 'egg' }), egg, NOW), false);
});

test('merge radius is a local law, not a room-wide one', () => {
  assert.ok(DROP_MERGE_RADIUS >= 0.8 && DROP_MERGE_RADIUS <= 1.5);
});

test('THE PACK SPILLS: every carried slot empties into parcels', () => {
  const slots: InvSlot[] = [
    { item: 'bones', qty: 3 },
    null,
    { item: 'bronze_sword', qty: 1, roll: { rar: 'rare', seed: 41 } },
    { item: 'bread', qty: 2, stolen: true },
    null,
  ];
  const parcels = spillInventory(slots);
  assert.deepEqual(parcels, [
    { item: 'bones', qty: 3 },
    { item: 'bronze_sword', qty: 1, roll: { rar: 'rare', seed: 41 } },
    { item: 'bread', qty: 2, stolen: true },
  ]);
  // The pack is empty after the fall — the slots clear in place.
  assert.ok(slots.every((s) => s === null));
});

test('an empty pack spills nothing', () => {
  const slots: InvSlot[] = [null, null];
  assert.deepEqual(spillInventory(slots), []);
});

test('spilled instance rolls and theft facets survive the fall whole', () => {
  const roll = { rar: 'legendary' as const, seed: 7, ench: 'kindled_edge' };
  const [parcel] = spillInventory([{ item: 'bronze_sword', qty: 1, roll, stolen: true }]);
  assert.deepEqual(parcel?.roll, roll);
  assert.equal(parcel?.stolen, true);
});

test('the spill outlives the walk back: ten to fifteen minutes', () => {
  assert.ok(DEATH_SPILL_TTL_MS >= 10 * 60_000 && DEATH_SPILL_TTL_MS <= 15 * 60_000);
});

test('THE STOLEN FACET: provenance splits piles', () => {
  assert.equal(canMergeDrop(bones(), bones({ stolen: true }), NOW), false);
  assert.equal(canMergeDrop(bones({ stolen: true }), bones(), NOW), false);
  assert.equal(canMergeDrop(bones({ stolen: true }), bones({ stolen: true }), NOW), true);
});
