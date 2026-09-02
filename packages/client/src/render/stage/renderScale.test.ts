import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_CAP_CSS_PX, isStageResTier, stageRenderScale } from './renderScale.js';

/**
 * THE RENDER SCALE (A2) policy, pinned. The one law that must never
 * break: render scale 1 (full dpr) is byte-identical to pre-A2, so the
 * parity oracle (which runs at a small fixed window) is never touched.
 */

test('full tier never caps, on any window or dpr', () => {
  assert.equal(stageRenderScale(5120, 2880, 2, 'full'), 1);
  assert.equal(stageRenderScale(5120, 2880, 3, 'full'), 1);
  assert.equal(stageRenderScale(800, 600, 2, 'full'), 1);
});

test('a non-HiDPI display (dpr <= 1) is never capped', () => {
  assert.equal(stageRenderScale(5120, 2880, 1, 'auto'), 1);
  assert.equal(stageRenderScale(5120, 2880, 1, 'balanced'), 1);
  assert.equal(stageRenderScale(5120, 2880, 0.9, 'auto'), 1);
});

test('auto leaves small and medium windows at native dpr', () => {
  // 1920×1080 = 2.07M < 3.5M threshold.
  assert.equal(stageRenderScale(1920, 1080, 2, 'auto'), 1);
  // 1440×900 = 1.30M.
  assert.equal(stageRenderScale(1440, 900, 2, 'auto'), 1);
  // Just under the threshold stays native; exactly at it caps (strict <).
  assert.equal(stageRenderScale(STAGE_CAP_CSS_PX - 1, 1, 2, 'auto'), 1);
  assert.equal(stageRenderScale(STAGE_CAP_CSS_PX, 1, 2, 'auto'), 0.75);
});

test('auto caps a maximized Retina window to effective dpr 1.5', () => {
  // 2560×1440 = 3.69M > 3.5M, dpr 2 → cap 1.5 → scale 0.75.
  assert.equal(stageRenderScale(2560, 1440, 2, 'auto'), 0.75);
  // dpr 3 huge window → 1.5/3 = 0.5.
  assert.equal(stageRenderScale(2560, 1440, 3, 'auto'), 0.5);
});

test('balanced caps on ANY HiDPI window, to effective dpr 1.25', () => {
  assert.equal(stageRenderScale(1280, 720, 2, 'balanced'), 1.25 / 2);
  assert.equal(stageRenderScale(2560, 1440, 2, 'balanced'), 0.625);
  // A dpr already at or below the cap is left alone.
  assert.equal(stageRenderScale(2560, 1440, 1.2, 'balanced'), 1);
});

test('effective dpr never exceeds the cap and scale never exceeds 1', () => {
  for (const dpr of [1.25, 1.5, 2, 2.5, 3]) {
    const s = stageRenderScale(4000, 3000, dpr, 'auto');
    assert.ok(s <= 1 && s > 0);
    assert.ok(dpr * s <= 1.5 + 1e-9, `eff dpr ${dpr * s} within 1.5`);
  }
});

test('isStageResTier guards persisted/user input', () => {
  assert.ok(isStageResTier('auto'));
  assert.ok(isStageResTier('full'));
  assert.ok(isStageResTier('balanced'));
  assert.ok(!isStageResTier('ultra'));
  assert.ok(!isStageResTier(null));
  assert.ok(!isStageResTier(undefined));
});
