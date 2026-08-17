import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { arrangeLoot, onwardSummary, type GroundLoot } from './groundList.js';
import type { EntityId, ItemRoll } from '@arx/shared';

/**
 * THE RARITY LEDGER + ONWARD, pinned pure (looting v2). The component
 * around them is DOM; the ORDER of the ground list and the choice of
 * the next stop are laws, and laws get tests.
 */

const drop = (eid: number, over: Partial<GroundLoot> = {}): GroundLoot => ({
  eid: eid as EntityId,
  x: 0,
  y: 0,
  d: 1,
  itemId: 'bones',
  qty: 1,
  ...over,
});

const roll = (rar: ItemRoll['rar']): ItemRoll => ({ rar, seed: 1 });

describe('arrangeLoot — THE RARITY LEDGER', () => {
  it('reads best-first: rarity band descending', () => {
    const sticky = new Map<EntityId, number>();
    const out = arrangeLoot(
      [
        drop(1),
        drop(2, { roll: roll('legendary') }),
        drop(3, { roll: roll('rare') }),
        drop(4, { roll: roll('uncommon') }),
      ],
      sticky,
    );
    assert.deepEqual(
      out.map((l) => l.eid),
      [2, 3, 4, 1],
    );
  });

  it('keeps sticky first-seen order inside a band', () => {
    const sticky = new Map<EntityId, number>();
    arrangeLoot([drop(7), drop(5), drop(9)], sticky);
    // A later refresh presents the same piles in a different array
    // order — the ledger must not care.
    const out = arrangeLoot([drop(9), drop(7), drop(5)], sticky);
    assert.deepEqual(
      out.map((l) => l.eid),
      [7, 5, 9],
      'first-seen rank holds, whatever order the census walks',
    );
  });

  it('a newcomer enters its band without reshuffling the seated', () => {
    const sticky = new Map<EntityId, number>();
    arrangeLoot([drop(1), drop(2, { roll: roll('rare') })], sticky);
    const out = arrangeLoot(
      [drop(1), drop(2, { roll: roll('rare') }), drop(3), drop(4, { roll: roll('rare') })],
      sticky,
    );
    assert.deepEqual(
      out.map((l) => l.eid),
      [2, 4, 1, 3],
      'rare band leads, each band appends its newcomer at the tail',
    );
  });

  it('survivors never reorder when one is taken', () => {
    const sticky = new Map<EntityId, number>();
    arrangeLoot([drop(1), drop(2), drop(3)], sticky);
    const out = arrangeLoot([drop(1), drop(3)], sticky);
    assert.deepEqual(
      out.map((l) => l.eid),
      [1, 3],
    );
  });
});

describe('onwardSummary — THE HAND MOVES ON', () => {
  it('offers nothing when the horizon is bare', () => {
    assert.equal(onwardSummary([]), null);
  });

  it('the nearest far pile carries the walk; the count tells the rest', () => {
    const out = onwardSummary([
      drop(11, { d: 6.2 }),
      drop(12, { d: 3.4 }),
      drop(13, { d: 7.9 }),
    ]);
    assert.deepEqual(out, { eid: 12, count: 3, dist: 3.4 });
  });
});
