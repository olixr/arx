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
  // A typoed dial never sits in the doc pretending to steer.
  const res = validateFrontier({ ...AUTHORED_FRONTIER, emberLingerMinutes: 5 });
  assert.ok(!res.ok && res.errors.some((e) => e.includes("unknown dial 'emberLingerMinutes'")));
  // A missing dial is an undefined law.
  const partial: Record<string, unknown> = { ...AUTHORED_FRONTIER };
  delete partial.calmMs;
  assert.ok(!validateFrontier(partial).ok);
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
