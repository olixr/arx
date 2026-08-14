import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORED_FRONTIER,
  FRONTIER,
  emberLingerFor,
  replaceFrontier,
  validateFrontier,
  type FrontierDef,
} from './frontier.js';

/**
 * THE WEATHER's laws, pinned (living-frontier Phase 6): the dial table
 * is a live content doc — one validator refusing anything that could
 * hang the clockwork, one in-place swap every consumer reads at call
 * time, and the shipped seed forever valid under its own law.
 */

test('the shipped weather satisfies its own law', () => {
  const res = validateFrontier(AUTHORED_FRONTIER);
  assert.ok(res.ok, !res.ok ? res.errors.join(' | ') : '');
  // The normalized def round-trips the authored values exactly.
  if (res.ok) assert.deepEqual(res.def, AUTHORED_FRONTIER);
});

test('the validator refuses the dishonest weather, by name', () => {
  const bad = (patch: Partial<Record<keyof FrontierDef, unknown>>, needle: string): void => {
    const res = validateFrontier({ ...AUTHORED_FRONTIER, ...patch });
    assert.ok(!res.ok, `expected rejection for ${needle}`);
    assert.ok(
      res.errors.some((e) => e.includes(needle)),
      `errors mention ${needle}: ${res.errors.join(' | ')}`,
    );
  };
  bad({ tickTicks: 0 }, 'tickTicks');
  bad({ tickTicks: 300.5 }, 'integer');
  bad({ emberLingerMs: [120_000, 60_000] }, 'min must not exceed max');
  bad({ emberLingerMs: 'soon' }, '[min, max]');
  bad({ raidChance: 1.5 }, 'raidChance');
  bad({ dignityTiles: 'far' }, 'dignityTiles');
  // The cross-laws, each in its own words:
  bad({ satelliteStage: 3, stageMax: 2 }, 'satellites need a rung to stand on');
  bad({ marchTiles: 50, watchTiles: 96 }, 'word travels farther than sight');
  bad(
    { raidLossCooldownMs: 60 * 3_600_000, raidCooldownMs: 48 * 3_600_000 },
    'the SHORTER mercy',
  );
  bad({ claimReach: 10, claimR: 24 }, 'never shrinks it');
  bad({ wildBudgetBase: 3.5 }, 'wildBudgetBase');
  bad({ wildKnotProbes: 0 }, 'wildKnotProbes');
  bad({ trailReach: 8 }, 'trailReach');
  // A typoed dial never sits in the doc pretending to steer.
  const res = validateFrontier({ ...AUTHORED_FRONTIER, emberLingerMinutes: 5 });
  assert.ok(!res.ok && res.errors.some((e) => e.includes("unknown dial 'emberLingerMinutes'")));
  // THE BACKFILL LAW: an ABSENT dial adopts the shipped default — a
  // doc the Studio saved before the dial existed keeps its edits when
  // the table grows. Absence is forgiven for scalars and bands alike…
  const partial: Record<string, unknown> = { ...AUTHORED_FRONTIER };
  delete partial.calmMs;
  delete partial.creepMs;
  const filled = validateFrontier(partial);
  assert.ok(filled.ok, 'an old doc must survive a grown table');
  if (filled.ok) {
    assert.equal(filled.def.calmMs, AUTHORED_FRONTIER.calmMs);
    assert.deepEqual(filled.def.creepMs, [...AUTHORED_FRONTIER.creepMs]);
  }
  // …but a dial that is PRESENT and malformed is still refused.
  bad({ calmMs: 'soon' }, 'calmMs');
});

test('replaceFrontier swaps in place — same object, new weather, live jitters', () => {
  const before = emberLingerFor(1337, 5, 5, 0);
  assert.ok(before >= AUTHORED_FRONTIER.emberLingerMs[0]);
  const identity = FRONTIER;
  try {
    replaceFrontier({
      ...AUTHORED_FRONTIER,
      emberLingerMs: [1_000_000, 1_000_000],
    });
    // Identity stable (the live-registry law) …
    assert.equal(FRONTIER, identity);
    // … the field moved …
    assert.deepEqual(FRONTIER.emberLingerMs, [1_000_000, 1_000_000]);
    // … and the jitter helpers read the NEW band at call time.
    assert.equal(emberLingerFor(1337, 5, 5, 0), 1_000_000);
    // The swap deep-copied the tuples — mutating the source is inert.
    const src: FrontierDef = { ...AUTHORED_FRONTIER, emberLingerMs: [5_000_000, 5_000_000] };
    replaceFrontier(src);
    (src.emberLingerMs as [number, number])[0] = 7;
    assert.equal(FRONTIER.emberLingerMs[0], 5_000_000);
  } finally {
    replaceFrontier({ ...AUTHORED_FRONTIER });
  }
  assert.equal(emberLingerFor(1337, 5, 5, 0), before);
});

test('the capital dials refuse out-of-law values by name (strongholds Phase 6)', () => {
  const bad1 = { ...AUTHORED_FRONTIER, strongholdEmberMs: [1000, 500] as [number, number] };
  const r1 = validateFrontier(bad1);
  assert.ok(!r1.ok && r1.errors.some((e) => e.includes('strongholdEmberMs')));
  const bad2 = { ...AUTHORED_FRONTIER, capitalTierFloor: 2 };
  const r2 = validateFrontier(bad2);
  assert.ok(!r2.ok && r2.errors.some((e) => e.includes('capitalTierFloor')));
  const bad3 = { ...AUTHORED_FRONTIER, capitalRoughMax: 0.9 };
  const r3 = validateFrontier(bad3);
  assert.ok(!r3.ok && r3.errors.some((e) => e.includes('capitalRoughMax')));
  // The cross-law: a capital is savored longer than a hold.
  const bad4 = {
    ...AUTHORED_FRONTIER,
    strongholdEmberMs: [60_000, 90_000] as [number, number],
  };
  const r4 = validateFrontier(bad4);
  assert.ok(!r4.ok && r4.errors.some((e) => e.includes('savored longer than a hold')));
});
