import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addItem, bestTool, countItem, emptyInventory, hasSpaceFor, removeItem } from './inventory.js';

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
