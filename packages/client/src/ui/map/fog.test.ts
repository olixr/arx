import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExploredMask, REGION_CELLS } from '@arx/shared';
import { maskBitsToAlpha } from './fog.js';

test('maskBitsToAlpha lights exactly the charted cells', () => {
  const mask = new ExploredMask();
  mask.markDisc(10, 6, 0.1); // one cell: (2,1)
  mask.markDisc(400, 30, 0.1); // out of region (0,0) — must not appear
  const bytes = mask.regionBytes(0, 0)!;
  const out = new Uint8ClampedArray(REGION_CELLS * REGION_CELLS * 4);
  maskBitsToAlpha(bytes, out);
  let lit = 0;
  for (let i = 0; i < REGION_CELLS * REGION_CELLS; i++) {
    if (out[i * 4 + 3] === 255) lit++;
    else assert.equal(out[i * 4 + 3], 0);
  }
  assert.equal(lit, 1);
  assert.equal(out[(1 * REGION_CELLS + 2) * 4 + 3], 255);
});

test('maskBitsToAlpha matches a walked disc bit for bit', () => {
  const mask = new ExploredMask();
  mask.markDisc(128, 128);
  const bytes = mask.regionBytes(0, 0)!;
  const out = new Uint8ClampedArray(REGION_CELLS * REGION_CELLS * 4);
  maskBitsToAlpha(bytes, out);
  for (let cy = 0; cy < REGION_CELLS; cy++) {
    for (let cx = 0; cx < REGION_CELLS; cx++) {
      const expected = mask.cellRevealed(cx, cy) ? 255 : 0;
      assert.equal(out[(cy * REGION_CELLS + cx) * 4 + 3], expected, `cell ${cx},${cy}`);
    }
  }
});
