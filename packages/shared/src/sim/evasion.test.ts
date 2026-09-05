import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVADE_CAP_PCT,
  LEATHER_EVADE_PER_PIECE,
  SNEAK_EVADE_PER_LEVEL,
  WOLF_REFLEXES_PCT,
  describeEvade,
  evadeChancePct,
  rollSlip,
  type EvadeInputs,
} from './evasion.js';

/**
 * THE SLIPPED BLOW, pinned:
 * - the lanes SUM (worn + leather + trained + buffs), then the cap
 *   closes at EVADE_CAP_PCT;
 * - THE FEET ARE THE SLIP: stone feet slip nothing, a chill scales,
 *   a planted (seated / mounted) body never slips;
 * - the roll reads a [0,1) sample so both outcomes are provable.
 */

const free = (over: Partial<EvadeInputs> = {}): EvadeInputs => ({
  buffPct: 0,
  wolfReflexes: false,
  leatherPieces: 0,
  sneakLevel: 0,
  moveFactor: 1,
  planted: false,
  ...over,
});

test('a bare body slips nothing', () => {
  assert.equal(evadeChancePct(free()), 0);
  assert.equal(describeEvade(0), 'no blows slip');
});

test('the lanes sum: worn, leather, trained, buffs', () => {
  const pct = evadeChancePct(
    free({ wolfReflexes: true, leatherPieces: 5, sneakLevel: 40, buffPct: 3 }),
  );
  const want = WOLF_REFLEXES_PCT + 5 * LEATHER_EVADE_PER_PIECE + 40 * SNEAK_EVADE_PER_LEVEL + 3;
  assert.ok(Math.abs(pct - want) < 1e-9, `${pct} vs ${want}`);
  assert.equal(describeEvade(pct), `${Math.round(want)}% of blows slip`);
});

test('the cap closes: no assembly slips more than half the blows', () => {
  const pct = evadeChancePct(
    free({ wolfReflexes: true, leatherPieces: 5, sneakLevel: 99, buffPct: 80 }),
  );
  assert.equal(pct, EVADE_CAP_PCT);
});

test('THE FEET ARE THE SLIP: stone feet slip nothing, a chill slips slower, a planted body never slips', () => {
  const nimble = free({ wolfReflexes: true, leatherPieces: 5 });
  const full = evadeChancePct(nimble);
  assert.equal(evadeChancePct({ ...nimble, moveFactor: 0 }), 0, 'a hold');
  assert.ok(Math.abs(evadeChancePct({ ...nimble, moveFactor: 0.5 }) - full / 2) < 1e-9, 'a chill');
  assert.equal(evadeChancePct({ ...nimble, planted: true }), 0, 'seated or in the saddle');
});

test('negative lanes never add and a move factor never exceeds 1', () => {
  assert.equal(evadeChancePct(free({ buffPct: -20, leatherPieces: -3, sneakLevel: -9 })), 0);
  const capped = evadeChancePct(free({ wolfReflexes: true, moveFactor: 4 }));
  assert.equal(capped, WOLF_REFLEXES_PCT, 'the feet scale down, never up');
});

test('the roll reads its sample: under the chance slips, at or over lands', () => {
  assert.equal(rollSlip(25, () => 0.249), true);
  assert.equal(rollSlip(25, () => 0.25), false);
  assert.equal(rollSlip(0, () => 0), false, 'no chance never rolls');
  assert.equal(rollSlip(EVADE_CAP_PCT, () => 0.4999), true);
  assert.equal(rollSlip(EVADE_CAP_PCT, () => 0.5), false);
});
