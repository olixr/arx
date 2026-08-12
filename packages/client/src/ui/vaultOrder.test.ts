/**
 * THE VAULT'S SHELVING ORDER — held to account without a DOM.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { itemDef } from '@arx/content';
import { orderVault, pileWorth } from './vaultOrder.js';

/** Pick real content ids for each family so the test never drifts. */
const GEAR = 'bronze_sword';
const FOOD = (() => {
  const hit = ['bread', 'cooked_trout', 'apple'].find((id) => itemDef(id)?.heals);
  if (!hit) throw new Error('no healing item found for the food seat');
  return hit;
})();
const MAT = 'log';

describe('orderVault', () => {
  it('kind walks coins, gear, food, then materials', () => {
    assert.ok(itemDef(GEAR)?.equipSlot, 'gear seat must be equippable');
    const out = orderVault(
      [
        [MAT, 10],
        [FOOD, 3],
        ['coins', 500],
        [GEAR, 1],
      ],
      'kind',
    ).map(([id]) => id);
    assert.deepEqual(out, ['coins', GEAR, FOOD, MAT]);
  });

  it('kind breaks family ties alphabetically by display name', () => {
    const a = itemDef(MAT)?.name ?? MAT;
    const other = 'iron_ore';
    const b = itemDef(other)?.name ?? other;
    const out = orderVault(
      [
        [MAT, 1],
        [other, 1],
      ],
      'kind',
    ).map(([id]) => id);
    const wanted = a.localeCompare(b) <= 0 ? [MAT, other] : [other, MAT];
    assert.deepEqual(out, wanted);
  });

  it('worth ranks piles by vendor value times count, richest first', () => {
    const out = orderVault(
      [
        [MAT, 1], // small pile
        ['coins', 1000], // value 1 × 1000
        [MAT, 500], // big pile of the same material
      ],
      'worth',
    );
    const worths = out.map(([id, q]) => pileWorth(id, q));
    const sorted = [...worths].sort((x, y) => y - x);
    assert.deepEqual(worths, sorted);
    assert.ok(worths[0]! > 0);
  });

  it('qty puts the deepest pile first; az reads display names', () => {
    const qty = orderVault(
      [
        [MAT, 2],
        [FOOD, 9],
      ],
      'qty',
    ).map(([id]) => id);
    assert.deepEqual(qty, [FOOD, MAT]);

    const az = orderVault(
      [
        [MAT, 1],
        [FOOD, 1],
      ],
      'az',
    ).map(([id]) => id);
    const names = az.map((id) => itemDef(id)?.name ?? id);
    assert.deepEqual(
      names,
      [...names].sort((x, y) => x.localeCompare(y)),
    );
  });

  it('does not mutate the caller entries', () => {
    const input: Array<[string, number]> = [
      [FOOD, 1],
      ['coins', 2],
    ];
    const before = JSON.stringify(input);
    orderVault(input, 'kind');
    assert.equal(JSON.stringify(input), before);
  });
});
