import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAYER4,
  BODY_H,
  FADE_ALPHA,
  bayerAlpha,
  emberEase,
  smoothstep01,
  stackCover,
  wallCover,
} from './reveal.js';

// ------------------------------------------------------------ presence floor

test('the presence floor keeps every faded occluder clearly visible', () => {
  // Below ~0.25 trunks vanish ("invisible walls" verdict); above
  // ~0.45 the body stops reading through a single canopy.
  assert.ok(FADE_ALPHA >= 0.25 && FADE_ALPHA <= 0.45, `${FADE_ALPHA}`);
});

test('stack shade rises with core depth and summons the ember by ~3 canopies', () => {
  assert.equal(stackCover(0), 0);
  let prev = 0;
  for (let m = 1; m <= 6; m++) {
    const c = stackCover(m);
    assert.ok(c > prev && c < 1, `m=${m}: ${c}`);
    prev = c;
  }
  // One tree = a light confirmation, never a blazing beacon.
  assert.ok(emberEase(stackCover(1)) < 0.6, `single-tree ember ${emberEase(stackCover(1))}`);
  // Three stacked canopies = the ember fully lit through the shade.
  assert.ok(emberEase(stackCover(3)) > 0.9, `3-stack ember ${emberEase(stackCover(3))}`);
});

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

// ---------------------------------------------------------------- ember

test('ember brightness: partial wall cover stays clearly lit, endpoints exact', () => {
  assert.equal(emberEase(0), 0);
  assert.equal(emberEase(1), 1);
  assert.ok(emberEase(0.5) > 0.55, `half cover ${emberEase(0.5)}`);
  assert.ok(emberEase(0.2) < emberEase(0.5));
});

// ---------------------------------------------------------------- misc

test('smoothstep01 clamps and eases', () => {
  assert.equal(smoothstep01(-1), 0);
  assert.equal(smoothstep01(2), 1);
  assert.equal(smoothstep01(0.5), 0.5);
  assert.ok(smoothstep01(0.25) < 0.25);
});

test('sanity: the body stays the unit of measure', () => {
  assert.ok(BODY_H > 1 && BODY_H < 1.3);
});
