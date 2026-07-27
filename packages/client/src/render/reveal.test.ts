import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAYER4,
  BODY_H,
  VEIL_MAX,
  bayerAlpha,
  emberEase,
  frontEase,
  smoothstep01,
  veilResidual,
  wallCover,
} from './reveal.js';

// ---------------------------------------------------------------- dither

test('bayer matrix is a permutation of 0..15 (every density step exists)', () => {
  const seen = new Set<number>();
  for (const row of BAYER4) for (const v of row) seen.add(v);
  assert.equal(seen.size, 16);
  for (let i = 0; i < 16; i++) assert.ok(seen.has(i), `missing threshold ${i}`);
});

test('bayer alphas stay strictly inside (0,1) — no fully open or dead cell', () => {
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const a = bayerAlpha(i, j);
      assert.ok(a > 0 && a < 1, `cell ${i},${j} alpha ${a}`);
    }
  }
});

test('adjacent bayer cells never share a density (the pattern reads as weave, not blocks)', () => {
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      assert.notEqual(BAYER4[j]![i], BAYER4[j]![(i + 1) & 3]);
      assert.notEqual(BAYER4[j]![i], BAYER4[(j + 1) & 3]![i]);
    }
  }
});

// ---------------------------------------------------------------- fronting

test('a tree north of the body (drawn behind it) never veils', () => {
  assert.equal(frontEase(-0.5), 0);
  assert.equal(frontEase(-0.16), 0);
});

test('a tree clearly south of the body veils at full strength', () => {
  assert.equal(frontEase(0.6), 1);
  assert.equal(frontEase(3), 1);
});

test('front candidacy eases — no binary pop as you strafe past a trunk row', () => {
  const a = frontEase(0.0);
  const b = frontEase(0.25);
  assert.ok(a > 0 && a < 1, `at own row: ${a}`);
  assert.ok(b > a && b < 1, `mid-ease monotonic: ${b} > ${a}`);
});

// ---------------------------------------------------------------- wall cover

const YS = 0.6; // camera yScale
const WALL_H = 2.05;
const WALL_STUB = 0.62;

test('a full wall one row south hides the body completely', () => {
  // Body at row center, wall tile on the next row: base = ty+1 → dy 1.5.
  const k = wallCover(WALL_H, 1.5, 0.2, YS);
  assert.ok(k > 0.95, `expected full cover, got ${k}`);
});

test('a veil-sunken stub never arms the ember (the two reveals cannot fight)', () => {
  assert.equal(wallCover(WALL_STUB, 1.5, 0.0, YS), 0);
});

test('a wall far enough south that the head clears it gives no cover', () => {
  // dy 2.9: crown overlap < 45% of the body — readable, no ember.
  assert.equal(wallCover(WALL_H, 2.9, 0.0, YS), 0);
});

test('a wall a full tile to the side gives no cover', () => {
  assert.equal(wallCover(WALL_H, 1.5, 1.1, YS), 0);
});

test('cover fades smoothly with sideways offset — walk out from behind a wall', () => {
  const c0 = wallCover(WALL_H, 1.5, 0.3, YS);
  const c1 = wallCover(WALL_H, 1.5, 0.7, YS);
  const c2 = wallCover(WALL_H, 1.5, 0.95, YS);
  assert.ok(c0 > c1 && c1 > c2 && c2 > 0, `${c0} > ${c1} > ${c2} > 0`);
});

test('a wall never covers a body standing south of it', () => {
  assert.equal(wallCover(WALL_H, -0.5, 0.0, YS), 0);
  assert.equal(wallCover(WALL_H, 0, 0.0, YS), 0);
});

test('cover is judged against the body, not the wall: taller walls hide sooner', () => {
  const story = wallCover(WALL_H, 2.4, 0, YS);
  const tall = wallCover(WALL_H + 0.8, 2.4, 0, YS);
  assert.ok(tall > story, `${tall} > ${story}`);
});

// ---------------------------------------------------------------- residual

test('an open veil window damps the ember but never kills it in deep cover', () => {
  const r = veilResidual(1);
  assert.ok(r > 0.2 && r < 0.6, `full-front residual ${r}`);
  assert.ok(veilResidual(0.4) < 0.4, 'partial cover is also damped');
  assert.equal(veilResidual(0), 0);
});

test('residual never exceeds the raw cover (the veil only ever helps)', () => {
  for (let e = 0; e <= 1.001; e += 0.1) {
    assert.ok(veilResidual(e) <= e + 1e-9);
  }
});

test('ember brightness: mid cover (deep forest residual) stays clearly lit', () => {
  // veilResidual(1) ≈ 0.4 is the deep-forest steady state — the live
  // calibration verdict: it must land near 2/3, not smoothstep's 0.35.
  const mid = emberEase(veilResidual(1));
  assert.ok(mid > 0.55 && mid < 0.8, `mid-cover ember ${mid}`);
  assert.equal(emberEase(0), 0);
  assert.equal(emberEase(1), 1);
  assert.ok(emberEase(0.2) < mid);
});

// ---------------------------------------------------------------- misc

test('smoothstep01 clamps and eases', () => {
  assert.equal(smoothstep01(-1), 0);
  assert.equal(smoothstep01(2), 1);
  assert.equal(smoothstep01(0.5), 0.5);
  assert.ok(smoothstep01(0.25) < 0.25);
});

test('sanity: VEIL_MAX leaves the canopy present (never a full erase)', () => {
  assert.ok(VEIL_MAX < 0.85 && VEIL_MAX > 0.4);
  assert.ok(BODY_H > 1 && BODY_H < 1.3);
});
