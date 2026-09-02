import test from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE } from '@arx/shared';
import { FRINGE_TILES, bakeGutter, fringeStrips } from './terrain.js';

/**
 * THE FRINGE RE-BAKE's strip arithmetic, pinned. Disjointness is
 * load-bearing (translucent detail/crumb content must never composite
 * twice at a corner), coverage is correctness (every pixel a changed
 * neighbor can influence must fall in a strip), and the interior must
 * stay untouched (that is the entire economy).
 */
test('fringeStrips', async (t) => {
  const px = 32;
  const G = bakeGutter(px);
  const span = CHUNK_SIZE * px;
  const D = FRINGE_TILES * px;
  const inAny = (rects: Array<[number, number, number, number]>, x: number, y: number): number =>
    rects.reduce(
      (n, [rx, ry, rw, rh]) => n + (x >= rx && x < rx + rw && y >= ry && y < ry + rh ? 1 : 0),
      0,
    );

  await t.test('disjoint for every mask', () => {
    for (let mask = 1; mask <= 15; mask++) {
      const rects = fringeStrips(mask, px, G);
      // Sample the whole padded plane on a half-tile lattice.
      for (let y = -G; y < span + G; y += px / 2) {
        for (let x = -G; x < span + G; x += px / 2) {
          assert.ok(inAny(rects, x, y) <= 1, `mask ${mask}: (${x},${y}) covered twice`);
        }
      }
    }
  });

  await t.test('each edge covers its reach, gutter included', () => {
    const cases: Array<[number, (x: number, y: number) => boolean]> = [
      [1, (_x, y) => y < D], // N
      [2, (_x, y) => y >= span - D], // S
      [4, (x) => x < D], // W
      [8, (x) => x >= span - D], // E
    ];
    for (const [mask, inside] of cases) {
      const rects = fringeStrips(mask, px, G);
      for (let y = -G; y < span + G; y += px / 4) {
        for (let x = -G; x < span + G; x += px / 4) {
          const want = inside(x, y) ? 1 : 0;
          assert.equal(inAny(rects, x, y), want, `mask ${mask}: (${x},${y})`);
        }
      }
    }
  });

  await t.test('corner masks cover the corner block once', () => {
    const rects = fringeStrips(1 | 8, px, G); // N + E
    assert.equal(inAny(rects, span - 1, 1), 1, 'corner covered');
    assert.equal(inAny(rects, span - D / 2, D / 2), 1, 'corner interior once');
    assert.equal(inAny(rects, span / 2, span / 2), 0, 'chunk interior untouched');
  });

  await t.test('the full ring never touches the interior', () => {
    const rects = fringeStrips(15, px, G);
    for (let y = D; y < span - D; y += px) {
      for (let x = D; x < span - D; x += px) {
        assert.equal(inAny(rects, x, y), 0, `interior (${x},${y})`);
      }
    }
    assert.equal(inAny(rects, -G, -G), 1, 'gutter corner covered');
    assert.equal(inAny(rects, span + G - 1, span + G - 1), 1, 'far gutter corner covered');
  });
});
