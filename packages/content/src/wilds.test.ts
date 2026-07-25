import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WILD_ROSTER, pickWild, wildCandidates, wildRosterErrors } from './wilds.js';

test('the wild roster names only real beasts with sane ranges', () => {
  assert.deepEqual(wildRosterErrors(), []);
  assert.ok(WILD_ROSTER.length >= 10, 'the wilds feel empty');
});

test('daylight meadow at tier 1 is gentle; tier-5 midnight is not', () => {
  const noonMeadow = wildCandidates(1, 'grass', 12);
  assert.ok(noonMeadow.some((e) => e.npc === 'stag'), 'no stag at noon');
  assert.ok(!noonMeadow.some((e) => e.npc === 'dire_wolf'), 'a dire wolf at tier 1 noon');
  assert.ok(!noonMeadow.some((e) => e.npc === 'cave_bat'), 'bats at noon');

  const midnightDeep = wildCandidates(5, 'forest', 0.5);
  assert.ok(midnightDeep.some((e) => e.npc === 'dire_wolf'), 'no dire wolf in the deep dark');
  assert.ok(midnightDeep.some((e) => e.npc === 'troll'), 'no troll in the deep dark');
  assert.ok(!midnightDeep.some((e) => e.npc === 'stag'), 'a stag browsing at midnight');

  // The night shift raises the count: same spot, more teeth after dusk.
  const dayForest3 = wildCandidates(3, 'forest', 12);
  const nightForest3 = wildCandidates(3, 'forest', 23);
  assert.ok(
    nightForest3.length > dayForest3.length,
    `night should out-muster day (${nightForest3.length} vs ${dayForest3.length})`,
  );
});

test('midnight wrap: 20.5→5.5 covers 23h and 4h but not noon', () => {
  for (const h of [23, 4, 0]) {
    assert.ok(
      wildCandidates(4, 'grass', h).some((e) => e.npc === 'worg'),
      `no night worg at hour ${h}`,
    );
  }
  assert.ok(!wildCandidates(4, 'grass', 12).some((e) => e.npc === 'worg'), 'a night worg at noon');
});

test('the weighted pick is exhaustive and proportional-ish', () => {
  const pool = wildCandidates(2, 'forest', 12);
  assert.ok(pool.length >= 2);
  const seen = new Map<string, number>();
  for (let i = 0; i < 1000; i++) {
    const e = pickWild(pool, (i + 0.5) / 1000);
    assert.ok(e, 'pick returned null over a non-empty pool');
    seen.set(e!.npc, (seen.get(e!.npc) ?? 0) + 1);
  }
  // Every candidate occurs, and counts order like the weights.
  for (const e of pool) assert.ok((seen.get(e.npc) ?? 0) > 0, `${e.npc} never picked`);
  assert.equal(pickWild([], 0.5), null);
});
