import test from 'node:test';
import assert from 'node:assert/strict';
import { leanBudgetMult } from './leanBudget.js';

// The B-2 reference lean and the frustum far-reach multiple the renderer
// passes (kept in sync with renderer.ts PERSP_LEAN_REF / FRUSTUM_FAR_MULT).
const REF = 0.0016;
const FAR = 5;

test('lean budget multiplier', async (t) => {
  await t.test('q=0 is exactly 1 — the byte-identical ortho invariant', () => {
    assert.equal(leanBudgetMult(0, REF, FAR), 1);
  });

  await t.test('a negative q is also 1 (never scales down)', () => {
    assert.equal(leanBudgetMult(-0.001, REF, FAR), 1);
  });

  await t.test('the reference lean reaches the full far multiple', () => {
    assert.equal(leanBudgetMult(REF, REF, FAR), FAR);
  });

  await t.test('it ramps linearly between ortho and the reference', () => {
    // Half the reference lean → halfway from 1 to FAR.
    assert.equal(leanBudgetMult(REF / 2, REF, FAR), 1 + (FAR - 1) * 0.5);
  });

  await t.test('a grazing lean past the reference is HARD-clamped at the far multiple', () => {
    assert.equal(leanBudgetMult(REF * 100, REF, FAR), FAR);
  });

  await t.test('the multiplier is monotonic in q', () => {
    let prev = leanBudgetMult(0, REF, FAR);
    for (let q = 0; q <= REF; q += REF / 20) {
      const m = leanBudgetMult(q, REF, FAR);
      assert.ok(m >= prev, `mult must not decrease as q grows (q=${q})`);
      assert.ok(m >= 1 && m <= FAR, `mult stays within [1, FAR] (q=${q})`);
      prev = m;
    }
  });

  await t.test('a zero reference lean degrades safely to 1', () => {
    assert.equal(leanBudgetMult(0.001, 0, FAR), 1);
  });

  // B6: the arrival budget is now keyed to LEAN_ARRIVAL_MULT (3), not the
  // grazing-lean cull ceiling FRUSTUM_FAR_MULT (5), so the per-frame mint
  // budget tracks the frustum's HONEST reach (~2.77× ortho at the shipping
  // lean) instead of over-provisioning ~4.25× against a 2.77× reach.
  const ARRIVAL = 3.5;
  const REACH = 2.77; // MEASURED frustum reach at the shipping lean (renderer probe).
  await t.test('B6 arrival mult at the shipping lean stays just above the real reach, well under the old ~4.25', () => {
    const shipping = 0.0013;
    const b6 = leanBudgetMult(shipping, REF, ARRIVAL);
    const old = leanBudgetMult(shipping, REF, FAR);
    // Ramp = 0.0013/0.0016 = 0.8125 -> 1 + (3.5-1)*0.8125 = 3.03125.
    assert.ok(Math.abs(b6 - 3.03125) < 1e-9, `expected ~3.031, got ${b6}`);
    assert.ok(b6 < old, 'B6 mints less per leaning frame than the old FRUSTUM_FAR_MULT-keyed ramp');
    assert.ok(b6 > REACH, 'still outpaces the measured frustum reach so a fast pan fills whole');
  });
});
