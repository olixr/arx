import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PACK_RALLY_RANGE } from './npcs.js';
import {
  WILD_KNOT_SPREAD,
  WILD_KNOT_SPREAD_MAX,
  WILD_ROSTER,
  composeKnot,
  pickWild,
  wildCandidates,
  wildEntryErrors,
  wildRosterErrors,
  type WildEntry,
} from './wilds.js';

/** An entry's kinds, lead included — the roster's face, not its plumbing. */
const kinds = (e: WildEntry): string[] => [e.npc, ...(e.lead ? [e.lead.npc] : [])];

test('the wild roster names only real beasts with sane ranges', () => {
  assert.deepEqual(wildRosterErrors(), []);
  assert.ok(WILD_ROSTER.length >= 10, 'the wilds feel empty');
});

test('daylight meadow at tier 1 is gentle; tier-5 midnight is not', () => {
  const noonMeadow = wildCandidates(1, 'grass', 12);
  assert.ok(
    noonMeadow.some((e) => kinds(e).includes('stag')),
    'no stag at noon',
  );
  assert.ok(!noonMeadow.some((e) => kinds(e).includes('dire_wolf')), 'a dire wolf at tier 1 noon');
  assert.ok(!noonMeadow.some((e) => e.npc === 'cave_bat'), 'bats at noon');

  const midnightDeep = wildCandidates(5, 'forest', 0.5);
  assert.ok(
    midnightDeep.some((e) => kinds(e).includes('dire_wolf')),
    'no dire wolf in the deep dark',
  );
  assert.ok(midnightDeep.some((e) => e.npc === 'troll'), 'no troll in the deep dark');
  assert.ok(!midnightDeep.some((e) => kinds(e).includes('stag')), 'a stag browsing at midnight');

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

// -------------------------------------------------- THE KNOT LAW

test('every knot answers as a pack: spreads sit inside rally range', () => {
  // The law's whole point — a knot's far edge still hears the anchor's
  // cry, so NpcDef.pack + rallyPack wake without any new AI.
  assert.ok(WILD_KNOT_SPREAD <= WILD_KNOT_SPREAD_MAX);
  assert.ok(WILD_KNOT_SPREAD_MAX < PACK_RALLY_RANGE, 'the pin IS the point');
  for (const e of WILD_ROSTER) {
    assert.ok((e.spread ?? WILD_KNOT_SPREAD) <= WILD_KNOT_SPREAD_MAX, `${e.npc} spread too wide`);
  }
});

test('the wilds actually herd now: knot bands ship on the social kinds', () => {
  const banded = WILD_ROSTER.filter((e) => e.band && e.band[1] > 1);
  assert.ok(banded.length >= 6, `only ${banded.length} group entries — the wilds went solitary`);
  assert.ok(
    WILD_ROSTER.some((e) => e.npc === 'wolf' && e.band && e.band[1] >= 3),
    'wolves lost their packs',
  );
  assert.ok(
    WILD_ROSTER.some((e) => e.npc === 'hind' && e.lead?.npc === 'stag'),
    'the herd lost its stag',
  );
});

test('composeKnot: the band sizes it, the roll walks the band, the lead goes first', () => {
  const herd: WildEntry = {
    npc: 'hind',
    weight: 1,
    tiers: [1, 3],
    biomes: ['grass'],
    band: [2, 4],
    lead: { npc: 'stag' },
  };
  // Roll 0 → smallest band + lead; roll ~1 → largest band + lead.
  const small = composeKnot(herd, 0, 99);
  assert.deepEqual(
    small.map((b) => b.npc),
    ['stag', 'hind', 'hind'],
  );
  assert.ok(small[0]!.lead && !small[1]!.lead);
  const large = composeKnot(herd, 0.9999, 99);
  assert.equal(large.length, 5);
  assert.equal(large.filter((b) => b.lead).length, 1);
  // Every roll lands inside the band (+1 for the lead).
  for (let i = 0; i < 100; i++) {
    const n = composeKnot(herd, i / 100, 99).length;
    assert.ok(n >= 3 && n <= 5, `knot of ${n} escaped the band`);
  }
});

test('composeKnot: the cap truncates from the tail — a lone lead reads true', () => {
  const herd: WildEntry = {
    npc: 'hind',
    weight: 1,
    tiers: [1, 3],
    biomes: ['grass'],
    band: [3, 3],
    lead: { npc: 'stag' },
  };
  // cap 1 → the stag browses alone, never a lone straggler hind.
  assert.deepEqual(
    composeKnot(herd, 0.5, 1).map((b) => b.npc),
    ['stag'],
  );
  assert.equal(composeKnot(herd, 0.5, 2).length, 2);
  // A dead budget deals nobody.
  assert.deepEqual(composeKnot(herd, 0.5, 0), []);
  // No band, no lead → the old solitary contract, unchanged.
  const lone: WildEntry = { npc: 'bear', weight: 1, tiers: [3, 5], biomes: ['forest'] };
  assert.deepEqual(composeKnot(lone, 0.7, 99), [{ npc: 'bear', lead: false }]);
});

test('the roster vets its knots: bad bands, wide spreads, phantom leads', () => {
  // Refusal by class against the REAL gate (wildEntryErrors is what
  // wildRosterErrors runs over the shipped roster).
  const base: WildEntry = { npc: 'rat', weight: 1, tiers: [1, 2], biomes: ['grass'] };
  const errsFor = (patch: Partial<WildEntry>): string[] =>
    wildEntryErrors({ ...base, ...patch }, 'e');
  assert.ok(errsFor({ band: [0, 2] }).some((m) => m.includes('band')));
  assert.ok(errsFor({ band: [3, 2] }).some((m) => m.includes('band')));
  assert.ok(errsFor({ band: [1, 2.5] as [number, number] }).some((m) => m.includes('band')));
  assert.ok(errsFor({ spread: PACK_RALLY_RANGE }).some((m) => m.includes('THE KNOT LAW')));
  assert.ok(errsFor({ spread: 0 }).some((m) => m.includes('THE KNOT LAW')));
  assert.ok(errsFor({ lead: { npc: 'stag' } }).some((m) => m.includes('needs a band')));
  assert.ok(errsFor({ band: [2, 3], lead: { npc: 'ghost_elk' } }).some((m) => m.includes('unknown lead')));
  assert.ok(errsFor({ habitat: 'Bad Slug' }).some((m) => m.includes('habitat')));
  assert.deepEqual(errsFor({ band: [1, 2], spread: 2, habitat: 'warren' }), []);
});
