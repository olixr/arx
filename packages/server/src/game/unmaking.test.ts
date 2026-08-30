import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { InvSlot, ItemRoll, RarityTier } from '@arx/shared';
import { ENCHANT_DEFS, ITEMS, unmakingOf } from '@arx/content';
import { emptyInventory, addItem, countItem } from './inventory.js';
import { planUnmaking } from './unmaking.js';

const anyGear = (): string => {
  for (const [id, def] of ITEMS) if (def.gear) return id;
  throw new Error('no gear in the item table');
};
const roll = (rar: RarityTier, over: Partial<ItemRoll> = {}): ItemRoll => ({
  rar,
  seed: 1,
  ...over,
});
/** Two enchants of DIFFERENT schools whose unmaking pays essence back. */
const twoSchools = (): [string, string] => {
  const paying = ENCHANT_DEFS.filter((e) =>
    unmakingOf(anyGear(), roll('epic', { ench: e.id }))!.yields.length > 1,
  );
  const a = paying[0]!;
  const b = paying.find((e) => e.element !== a.element)!;
  return [a.id, b.id];
};

test('a batch pays exactly the sum of its pieces, merged by item', () => {
  const gear = anyGear();
  const inv = emptyInventory();
  addItem(inv, gear, 1, roll('rare'));
  addItem(inv, gear, 1, roll('epic', { ench: twoSchools()[0] }));
  const one = unmakingOf(gear, roll('rare'))!;
  const two = unmakingOf(gear, roll('epic', { ench: twoSchools()[0] }))!;

  const plan = planUnmaking(inv, [0, 1]);
  assert.ok(plan.ok);
  assert.equal(plan.xp, one.xp + two.xp);
  const want = new Map<string, number>();
  for (const y of [...one.yields, ...two.yields]) {
    want.set(y.item, (want.get(y.item) ?? 0) + y.qty);
  }
  assert.equal(plan.yields.length, want.size, 'same-item lines merge');
  for (const y of plan.yields) assert.equal(y.qty, want.get(y.item));
});

test('ALL OR NOTHING: one hot piece refuses the whole batch by name', () => {
  const gear = anyGear();
  const inv = emptyInventory();
  addItem(inv, gear, 1, roll('common'));
  addItem(inv, gear, 1, roll('common'), true); // stolen
  const plan = planUnmaking(inv, [0, 1]);
  assert.ok(!plan.ok);
  assert.equal(plan.reason, 'stolen');
  assert.ok(plan.name, 'the refusal names its piece');
});

test('a slot with no Arx refuses the batch; an EMPTY slot is only a stale bench', () => {
  const gear = anyGear();
  const inv = emptyInventory();
  addItem(inv, gear, 1, roll('common'));
  addItem(inv, 'coins', 5);
  assert.equal(planUnmaking(inv, [0, 1]).ok, false);
  // A slot that emptied between bench and wire is skipped, not punished.
  const stale = planUnmaking(inv, [0, 27]);
  assert.ok(stale.ok);
  assert.equal(stale.pieces.length, 1);
  // A batch of only stale slots has nothing to do.
  const nothing = planUnmaking(inv, [26, 27]);
  assert.ok(!nothing.ok && nothing.reason === 'nothing');
});

test('THE FREED SLOTS COUNT: a full pack breaks a piece whose slot catches the yield', () => {
  // The old door proved space against the pack as it stood and refused
  // this exact, entirely reasonable act.
  const gear = anyGear();
  const inv = emptyInventory();
  addItem(inv, gear, 1, roll('common'));
  for (let i = 1; i < inv.length; i++) inv[i] = { item: gear, qty: 1, roll: roll('common') };
  assert.equal(inv.some((s) => s === null), false, 'the pack is full');
  const plan = planUnmaking(inv, [0]);
  assert.ok(plan.ok, 'the broken piece frees the room its dust needs');
});

test('the simulation refuses when the yields truly cannot land', () => {
  // One free slot, one broken piece, but the piece is deepened across
  // two schools: dust + two essences want more room than it frees.
  // The OLD per-yield check blessed this and silently lost a yield;
  // the plan refuses whole and nothing is destroyed.
  const gear = anyGear();
  const [wardId, artId] = twoSchools();
  const inv = emptyInventory();
  addItem(inv, gear, 1, roll('epic', { ench: wardId, deep: true, ench2: artId }));
  for (let i = 1; i < inv.length; i++) inv[i] = { item: 'dungeon_key', qty: 1 };
  const plan = planUnmaking(inv, [0]);
  assert.ok(!plan.ok && plan.reason === 'full');
});

test('the plan never touches the real pack', () => {
  const gear = anyGear();
  const inv: InvSlot[] = emptyInventory();
  addItem(inv, gear, 1, roll('rare', { ench: twoSchools()[0] }));
  const before = JSON.stringify(inv);
  planUnmaking(inv, [0]);
  assert.equal(JSON.stringify(inv), before, 'planning is read-only');
  assert.equal(countItem(inv, gear), 1);
});

test('the moment of light speaks one school or stays arcane', () => {
  const gear = anyGear();
  const [a, b] = twoSchools();
  const inv = emptyInventory();
  addItem(inv, gear, 1, roll('epic', { ench: a }));
  addItem(inv, gear, 1, roll('epic', { ench: a }));
  addItem(inv, gear, 1, roll('epic', { ench: b }));
  const agree = planUnmaking(inv, [0, 1]);
  assert.ok(agree.ok);
  assert.notEqual(agree.element, 'arcane');
  const mixed = planUnmaking(inv, [0, 2]);
  assert.ok(mixed.ok);
  assert.equal(mixed.element, 'arcane');
});

test('a piece named twice in a direct call still breaks once', () => {
  const gear = anyGear();
  const inv = emptyInventory();
  addItem(inv, gear, 1, roll('rare'));
  const plan = planUnmaking(inv, [0, 0]);
  assert.ok(plan.ok);
  assert.equal(plan.pieces.length, 1);
  assert.equal(plan.xp, unmakingOf(gear, roll('rare'))!.xp);
});
