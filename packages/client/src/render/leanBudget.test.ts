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
});
