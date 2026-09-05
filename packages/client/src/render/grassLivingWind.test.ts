import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUST_TUNE,
  COLOR_NOISE_TUNE,
  grassGustGlsl,
  grassGustMirror,
  grassColorNoiseGlsl,
  grassColorNoiseMirror,
} from './grassGpu.js';
import { grassShadowVertSrc } from './grassGpuShadow.js';

/**
 * THE LIVING WIND + THE PAINTED FIELD — the grass color+wind pass.
 *
 * The blade and cast shaders share the same extra wind (grassGust) and the
 * blades sample the same field colour drift (grassColorNoise). These pin the
 * pure helpers so the GLSL and the JS mirrors — and the tuning constants they
 * are templated from — cannot silently drift.
 */

test('grassGustGlsl is templated from GUST_TUNE (GLSL cannot drift from the mirror)', () => {
  const src = grassGustGlsl();
  assert.match(src, /vec2 grassGust\(vec2 w, float t, float phase\)/);
  for (const v of Object.values(GUST_TUNE)) {
    assert.ok(src.includes(`${v}`), `GUST_TUNE value ${v} embedded in GLSL`);
  }
  // It rides the shared wind axis (WX/WY), not a private copy.
  assert.match(src, /w\.x \* 0\.94 \+ w\.y \* 0\.34/);
});

test('the travelling gust wave is a real wave: the envelope swells and lulls across the field and in time', () => {
  // At a fixed time, sweeping ALONG the wind axis must trace the full
  // envelope (a lull below base and a crest above) — that is the moving band.
  let min = Infinity;
  let max = -Infinity;
  for (let d = 0; d < 400; d++) {
    const wx = d * 0.5;
    const wy = d * 0.18;
    const { env } = grassGustMirror(wx, wy, 3.0, 0.5);
    if (env < min) min = env;
    if (env > max) max = env;
  }
  assert.ok(min < GUST_TUNE.gustBase - 0.1, `envelope lulls below base, min ${min}`);
  assert.ok(max > GUST_TUNE.gustBase + 0.1, `envelope crests above base, max ${max}`);
  assert.ok(min > 0, `a lull still breathes (env > 0), min ${min}`);

  // The wave TRAVELS: at a fixed point the envelope changes with time.
  const a = grassGustMirror(10, 4, 0.0, 0.5).env;
  const b = grassGustMirror(10, 4, 1.3, 0.5).env;
  assert.ok(Math.abs(a - b) > 1e-3, 'the gust envelope moves in time at a fixed point');
});

test('per-blade turbulence decorrelates neighbours (different phase ⇒ different sway)', () => {
  const t = 2.4;
  const a = grassGustMirror(5, 5, t, 0.10).turb;
  const b = grassGustMirror(5, 5, t, 0.63).turb;
  assert.ok(Math.abs(a - b) > 1e-4, 'blades of different phase do not move in lockstep');
  // Idle keeps the field alive even with zero traveling contribution.
  assert.ok(GUST_TUNE.idleAmp > 0, 'a gentle idle sway is always present');
});

test('grassColorNoiseGlsl is templated from COLOR_NOISE_TUNE', () => {
  const src = grassColorNoiseGlsl();
  assert.match(src, /vec2 grassColorNoise\(vec2 w\)/);
  for (const v of Object.values(COLOR_NOISE_TUNE)) {
    assert.ok(src.includes(`${v}`), `COLOR_NOISE_TUNE value ${v} embedded in GLSL`);
  }
});

test('the field colour drift is low-frequency, bounded, and value/hue are decorrelated', () => {
  let vMin = Infinity;
  let vMax = -Infinity;
  let hMin = Infinity;
  let hMax = -Infinity;
  let aligned = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const wx = (i * 13.7) % 300 - 150;
    const wy = (i * 7.1) % 300 - 150;
    const { value, hue } = grassColorNoiseMirror(wx, wy);
    vMin = Math.min(vMin, value);
    vMax = Math.max(vMax, value);
    hMin = Math.min(hMin, hue);
    hMax = Math.max(hMax, hue);
    // Both are sums of two unit sines → bounded by 1.0 in magnitude.
    assert.ok(Math.abs(value) <= 1.0 + 1e-9, `value bounded, got ${value}`);
    assert.ok(Math.abs(hue) <= 1.0 + 1e-9, `hue bounded, got ${hue}`);
    if (Math.sign(value) === Math.sign(hue)) aligned++;
  }
  // The field actually varies (patches lighter/darker, warmer/cooler).
  assert.ok(vMax - vMin > 1.0, 'value drift spans a real range');
  assert.ok(hMax - hMin > 1.0, 'hue drift spans a real range');
  // Decorrelated: value and hue do NOT share sign everywhere (they ride
  // different wavelengths), so warmth and brightness move independently.
  const alignedFrac = aligned / N;
  assert.ok(alignedFrac > 0.2 && alignedFrac < 0.8, `value/hue decorrelated, aligned=${alignedFrac}`);
});

test('the cast shader shares the SAME living wind (no private gust that could drift)', () => {
  const src = grassShadowVertSrc();
  assert.match(src, /vec2 grassGust\(vec2 w, float t, float phase\)/);
  assert.match(src, /grassGust\(iRoot, uTime, iShape\.w\)/);
  // The blade and cast both scale lean by the taller-sway-more mass.
  assert.match(src, /wind\.x \* gust\.x/);
});
