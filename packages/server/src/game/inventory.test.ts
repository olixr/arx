import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addItem, bestTool, countItem, emptyInventory, hasSpaceFor, removeItem, takeSlot } from './inventory.js';

test('stackables merge into one slot', () => {
  const inv = emptyInventory();
  assert.equal(addItem(inv, 'coins', 10), 10);
  assert.equal(addItem(inv, 'coins', 15), 15);
  assert.equal(countItem(inv, 'coins'), 25);
  assert.equal(inv.filter(Boolean).length, 1);
});

test('non-stackables take one slot each and respect capacity', () => {
  const inv = emptyInventory();
  assert.equal(addItem(inv, 'log', 28), 28);
  assert.equal(addItem(inv, 'log', 1), 0, 'inventory full');
  assert.ok(!hasSpaceFor(inv, 'log'));
  assert.ok(!hasSpaceFor(inv, 'coins'));
});

test('stackable fits when its stack exists even if slots are full', () => {
  const inv = emptyInventory();
  addItem(inv, 'coins', 5);
  addItem(inv, 'log', 27);
  assert.ok(hasSpaceFor(inv, 'coins'));
  assert.equal(addItem(inv, 'coins', 5), 5);
});

test('removeItem clears emptied slots', () => {
  const inv = emptyInventory();
  addItem(inv, 'log', 3);
  assert.equal(removeItem(inv, 'log', 2), 2);
  assert.equal(countItem(inv, 'log'), 1);
  assert.equal(removeItem(inv, 'log', 5), 1, 'removes what exists');
  assert.equal(countItem(inv, 'log'), 0);
});

test('bestTool finds the strongest carried tool', () => {
  const inv = emptyInventory();
  assert.equal(bestTool(inv, 'axe'), null);
  addItem(inv, 'bronze_axe', 1);
  assert.equal(bestTool(inv, 'axe')?.item, 'bronze_axe');
  assert.equal(bestTool(inv, 'pickaxe'), null);
});

test('unknown items are rejected', () => {
  const inv = emptyInventory();
  assert.equal(addItem(inv, 'nonsense_item', 1), 0);
});

test('THE STOLEN FACET: stolen stacks apart from honest goods', () => {
  const inv = emptyInventory();
  assert.equal(addItem(inv, 'twine', 3), 3);
  assert.equal(addItem(inv, 'twine', 2, undefined, true), 2);
  const filled = inv.filter(Boolean);
  assert.equal(filled.length, 2, 'a stolen loaf never hides in an honest pile');
  assert.ok(filled.some((s) => s!.stolen === true && s!.qty === 2));
  assert.ok(filled.some((s) => !s!.stolen && s!.qty === 3));
});

test('NO LAUNDERING: id-addressed verbs never see stolen slots', () => {
  const inv = emptyInventory();
  addItem(inv, 'twine', 2, undefined, true);
  addItem(inv, 'twine', 3);
  // countItem answers honest goods only, and removeItem takes only them.
  assert.equal(countItem(inv, 'twine'), 3);
  assert.equal(removeItem(inv, 'twine', 5), 3, 'the stolen stack is invisible');
  const left = inv.filter(Boolean);
  assert.equal(left.length, 1);
  assert.equal(left[0]!.stolen, true);
  assert.equal(left[0]!.qty, 2);
});

test('takeSlot carries the facet out with the goods', () => {
  const inv = emptyInventory();
  addItem(inv, 'twine', 2, undefined, true);
  const idx = inv.findIndex((s) => s !== null);
  const taken = takeSlot(inv, idx, 1);
  assert.ok(taken);
  assert.equal(taken.stolen, true);
  const clean = emptyInventory();
  addItem(clean, 'twine', 2);
  const cidx = clean.findIndex((s) => s !== null);
  assert.equal(takeSlot(clean, cidx, 1)?.stolen, undefined);
});

test('INSTANCE LAW: siblings placed together never share one roll object', () => {
  // Shop buy qty>1, merged ground piles, and craft qty>1 all hand ONE
  // roll to addItem. Each filled slot must get its own copy, or a
  // later bond/oil/deepen on one twin silently enchants the other.
  const inv = emptyInventory();
  const roll = { rar: 'rare' as const, seed: 7 };
  assert.equal(addItem(inv, 'log', 2, roll), 2);
  const [a, b] = inv.filter(Boolean);
  assert.ok(a?.roll && b?.roll);
  assert.notEqual(a.roll, b.roll, 'two slots, two roll objects');
  (a.roll as { ench?: string }).ench = 'keen_edge';
  assert.equal((b.roll as { ench?: string }).ench, undefined, 'the twin is untouched');
  assert.notEqual(a.roll, roll, 'the caller keeps its own object too');
});

test('hasSpaceFor honors the theft facet exactly as addItem does', () => {
  // A full pack whose only same-id stack is STOLEN offers no home to
  // honest goods — addItem would refuse the merge, so the space check
  // must refuse it first (unmake/craft yields die otherwise).
  const inv = emptyInventory();
  addItem(inv, 'twine', 2, undefined, true);
  addItem(inv, 'log', 27);
  assert.equal(hasSpaceFor(inv, 'twine'), false, 'the hot stack is no home for honest twine');
  assert.equal(hasSpaceFor(inv, 'twine', true), true, 'more hot twine still merges');
  assert.equal(addItem(inv, 'twine', 1), 0, 'and addItem agrees');
});
