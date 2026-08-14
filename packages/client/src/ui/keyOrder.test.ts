/**
 * THE KEY RING'S FILING ORDER — held to account without a DOM.
 *
 * Every derived fact (name, sigil, theme, tier, power, worn uses)
 * comes pure from the roll, so the whole screen's brain is testable
 * here: filing, filtering, searching, and all five orders.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dungeonSpecFromRoll, keyUsesForTier } from '@arx/shared';
import type { ItemRoll } from '@arx/shared';
import { fileKeys, filterKeys, orderKeys, type RingKey } from './keyOrder.js';

let nextId = 1;
function key(rar: ItemRoll['rar'], seed: number, pwr?: number, uses?: number): RingKey {
  const roll: ItemRoll = { rar, seed };
  if (pwr !== undefined) roll.pwr = pwr;
  if (uses !== undefined) roll.uses = uses;
  return { id: nextId++, roll };
}

describe('fileKeys', () => {
  it('derives spec and uses from the roll, absent uses reads whole', () => {
    const filed = fileKeys([key('rare', 77, 31), key('common', 5, undefined, 1)]);
    assert.equal(filed[0]!.spec.tier, 'rare');
    assert.equal(filed[0]!.spec.power, 31);
    assert.equal(filed[0]!.usesLeft, keyUsesForTier('rare')); // legacy grace: absent = full
    assert.equal(filed[0]!.usesMax, keyUsesForTier('rare'));
    assert.equal(filed[1]!.usesLeft, 1); // stamped wear rides the roll
    assert.equal(filed[0]!.spec.name, dungeonSpecFromRoll(filed[0]!.roll).name);
  });
});

describe('orderKeys', () => {
  it('power leads strongest-first, ties broken by name', () => {
    const filed = fileKeys([key('common', 1, 5), key('epic', 2, 48), key('rare', 3, 30)]);
    const out = orderKeys(filed, 'power');
    assert.deepEqual(
      out.map((k) => k.spec.power),
      [48, 30, 5],
    );
  });

  it('tier walks the ladder top-down, power inside a rung', () => {
    const filed = fileKeys([key('common', 1, 9), key('legendary', 2, 68), key('common', 3, 4)]);
    const out = orderKeys(filed, 'tier');
    assert.equal(out[0]!.spec.tier, 'legendary');
    assert.deepEqual(
      out.slice(1).map((k) => k.spec.power),
      [9, 4],
    );
  });

  it('newest leads with the highest ring id', () => {
    const a = key('common', 1);
    const b = key('common', 2);
    const out = orderKeys(fileKeys([a, b]), 'newest');
    assert.equal(out[0]!.id, b.id);
  });

  it('uses ranks the freshest wards first', () => {
    const filed = fileKeys([key('common', 1, 5, 0), key('common', 2, 5, 2), key('common', 3, 5, 1)]);
    const out = orderKeys(filed, 'uses');
    assert.deepEqual(
      out.map((k) => k.usesLeft),
      [2, 1, 0],
    );
  });

  it('does not mutate its input', () => {
    const filed = fileKeys([key('common', 1, 9), key('epic', 2, 48)]);
    const before = filed.map((k) => k.id);
    orderKeys(filed, 'power');
    assert.deepEqual(
      filed.map((k) => k.id),
      before,
    );
  });
});

describe('filterKeys', () => {
  it('tier rail and theme both narrow', () => {
    const filed = fileKeys([key('common', 1), key('rare', 2), key('rare', 3)]);
    assert.equal(filterKeys(filed, 'rare', 'all', '').length, 2);
    const theme = filed[0]!.spec.theme;
    const byTheme = filterKeys(filed, 'all', theme, '');
    assert.ok(byTheme.every((k) => k.spec.theme === theme));
  });

  it('search answers name, sigil, theme, and tier words', () => {
    const filed = fileKeys([key('epic', 42, 50)]);
    const k = filed[0]!;
    // A word from the middle of the derived name (skip "The").
    const nameWord = k.spec.name.split(' ')[1]!.toLowerCase().slice(0, 4);
    assert.equal(filterKeys(filed, 'all', 'all', nameWord).length, 1);
    assert.equal(filterKeys(filed, 'all', 'all', k.spec.sigil.toLowerCase()).length, 1);
    assert.equal(filterKeys(filed, 'all', 'all', 'epic').length, 1);
    assert.equal(filterKeys(filed, 'all', 'all', 'zzzz-never').length, 0);
  });
});
