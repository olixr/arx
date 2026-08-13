/**
 * THE BELT's resolver contract: the pin is a preference, the fallback
 * is the heartiest meal, tonics without a heal are pinned-only, and a
 * famine never clears the pin.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { InvSlot } from '@arx/shared';
import { beltEligible, resolveBelt } from './beltSlot.js';

const slot = (item: string, qty = 1): InvSlot => ({ item, qty });

describe('beltEligible', () => {
  it('accepts meals and tonics, refuses gear, mats, and worked vials', () => {
    assert.ok(beltEligible('trout')); // heals
    assert.ok(beltEligible('moonlit_salve')); // buff only
    assert.ok(beltEligible('farmhouse_ale')); // heals + buff
    assert.ok(!beltEligible('log')); // material
    assert.ok(!beltEligible('nope_not_an_item'));
  });
});

describe('resolveBelt', () => {
  it('serves the pinned item wherever it sits, counting every stack', () => {
    const inv = [slot('log'), slot('trout', 3), null, slot('trout', 2), slot('salmon', 5)];
    const pick = resolveBelt(inv, 'trout');
    assert.ok(pick);
    assert.equal(pick.slot, 1);
    assert.equal(pick.item, 'trout');
    assert.equal(pick.qty, 5);
    assert.equal(pick.fallback, false);
  });

  it('falls forward to the heartiest meal when the pin ran dry', () => {
    const inv = [slot('trout', 2), slot('salmon', 1), slot('log')];
    const pick = resolveBelt(inv, 'glimmerfish');
    assert.ok(pick);
    assert.equal(pick.item, 'salmon'); // heals 13 beats trout's 4
    assert.equal(pick.fallback, true);
  });

  it('picks the heartiest meal with no pin at all, lowest slot on ties', () => {
    const inv = [slot('salmon', 1), slot('trout', 4), slot('salmon', 2)];
    const pick = resolveBelt(inv, null);
    assert.ok(pick);
    assert.equal(pick.slot, 0);
    assert.equal(pick.item, 'salmon');
    assert.equal(pick.qty, 3);
    assert.equal(pick.fallback, false);
  });

  it('never auto-picks a healless tonic, but serves one pinned', () => {
    const inv = [slot('moonlit_salve', 2)];
    assert.equal(resolveBelt(inv, null), null);
    const pick = resolveBelt(inv, 'moonlit_salve');
    assert.ok(pick);
    assert.equal(pick.item, 'moonlit_salve');
  });

  it('an empty pack is an empty belt, pinned or not', () => {
    assert.equal(resolveBelt([], 'trout'), null);
    assert.equal(resolveBelt([null, null], null), null);
  });

  it('a pin that names gear or nonsense is ignored, not served', () => {
    const inv = [slot('log', 1), slot('trout', 1)];
    const pick = resolveBelt(inv, 'log');
    assert.ok(pick);
    assert.equal(pick.item, 'trout');
  });
});
