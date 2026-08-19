import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAND_BUDGET_BYTES,
  BAND_ONE_MAX_BYTES,
  BAND_RELIEF_BYTES,
  BandVerdict,
  POOL_MAX_BYTES,
  POOL_MAX_SLOTS,
  POOL_SLOT_MAX_BYTES,
  admitBand,
  bandSweepNeeded,
  bandSweepRelieved,
  planBandSweep,
  poolAdmits,
  type BandSweepEntry,
} from './bandBudget.js';

const MB = 1048576;

function band(key: string, used: number, cx = 0, cy = 0): BandSweepEntry {
  return { key, used, cx, cy };
}

test('band admission', async (t) => {
  await t.test('an ordinary band on an empty ledger is admitted', () => {
    assert.equal(admitBand(0, 2 * MB), BandVerdict.Admit);
  });

  await t.test('ONE BAND IS NEVER A BUDGET — the per-band ceiling wins first', () => {
    // The 11MB cave row that started all this: refused on an empty
    // ledger, where a plain budget check would have waved it through.
    assert.equal(admitBand(0, 11 * MB), BandVerdict.TooBig);
    assert.equal(admitBand(0, BAND_ONE_MAX_BYTES + 1), BandVerdict.TooBig);
    assert.equal(admitBand(0, BAND_ONE_MAX_BYTES), BandVerdict.Admit);
  });

  await t.test('the ledger is a ceiling, not a hope', () => {
    assert.equal(admitBand(BAND_BUDGET_BYTES - 2 * MB, 2 * MB), BandVerdict.Admit);
    assert.equal(admitBand(BAND_BUDGET_BYTES - 2 * MB + 1, 2 * MB), BandVerdict.Full);
  });

  await t.test('a full ledger declines rather than overdrawing', () => {
    // The whole point: the answer is "draw live", never "bake now and
    // let the sweep sort it out" — that shape allocated 193MB a frame.
    assert.equal(admitBand(BAND_BUDGET_BYTES, 1), BandVerdict.Full);
  });
});

test('band sweep', async (t) => {
  await t.test('runs at relief, so the gate keeps its headroom', () => {
    assert.equal(bandSweepNeeded(10, BAND_RELIEF_BYTES), false);
    assert.equal(bandSweepNeeded(10, BAND_RELIEF_BYTES + 1), true);
    // A sweep that waited for the ceiling would leave the gate no room
    // to admit the ground being walked onto.
    assert.ok(BAND_RELIEF_BYTES < BAND_BUDGET_BYTES);
  });

  await t.test('count alone can trigger it', () => {
    assert.equal(bandSweepNeeded(241, 0), true);
    assert.equal(bandSweepRelieved(201, 0), false);
    assert.equal(bandSweepRelieved(200, BAND_RELIEF_BYTES), true);
  });

  await t.test('A BAND THIS FRAME NEEDED IS NOT COLD', () => {
    const plan = planBandSweep([band('hot', 100), band('cold', 40)], 100, 0, 0);
    assert.deepEqual(plan, ['cold']);
  });

  await t.test('a wholly hot cache plans nothing — and that is the answer', () => {
    // The view's own working set IS the budget. The surplus already
    // went live at the gate; taking any of this back would only be
    // re-baked next frame, which is exactly the storm.
    const all = [band('a', 7), band('b', 7), band('c', 7)];
    assert.deepEqual(planBandSweep(all, 7, 0, 0), []);
  });

  await t.test('distant before near, coldest first within each', () => {
    const entries = [
      band('near-warm', 90, 0, 0),
      band('far-warm', 95, 9, 0),
      band('near-cold', 10, 0, 0),
      band('far-cold', 20, 0, 9),
    ];
    assert.deepEqual(planBandSweep(entries, 100, 0, 0), [
      'far-cold',
      'far-warm',
      'near-cold',
      'near-warm',
    ]);
  });

  await t.test('the distance rule reads chunk coords, and 4 chunks is near', () => {
    const entries = [band('edge', 1, 4, 4), band('past', 1, 5, 0)];
    assert.deepEqual(planBandSweep(entries, 9, 0, 0), ['past', 'edge']);
  });
});

test('canvas pool', async (t) => {
  await t.test('A POOL IS BYTES, NOT SLOTS', () => {
    // An empty pool by count, already full by bytes: the slot-only
    // rule parked 369MB of cave-row bands here.
    assert.equal(poolAdmits(1, POOL_MAX_BYTES, 1024), false);
    assert.equal(poolAdmits(1, 0, 1024), true);
  });

  await t.test('a canvas too big to be worth parking goes to GC', () => {
    assert.equal(poolAdmits(0, 0, POOL_SLOT_MAX_BYTES + 1), false);
    assert.equal(poolAdmits(0, 0, POOL_SLOT_MAX_BYTES), true);
  });

  await t.test('the slot count still holds', () => {
    assert.equal(poolAdmits(POOL_MAX_SLOTS, 0, 1024), false);
    assert.equal(poolAdmits(POOL_MAX_SLOTS - 1, 0, 1024), true);
  });

  await t.test('the pool can never outgrow the band budget it feeds', () => {
    assert.ok(POOL_MAX_BYTES <= BAND_BUDGET_BYTES);
    assert.ok(POOL_SLOT_MAX_BYTES <= BAND_ONE_MAX_BYTES);
  });
});
