import test from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE } from '@arx/shared';
import { liftedRowSpan } from './terrain.js';

/**
 * THE LIFTED LAYER PAYS FOR ITS ROWS (B2) — the row-span math, pinned.
 *
 * The load-bearing invariant: the renderer samples each occupied level
 * across its ±1-padded, [0,CHUNK-1]-clamped band rows, at
 * `sy = gut + (r - rowOrigin)*px`. Every such sampled row MUST fall
 * inside the tight canvas [rowOrigin, rowOrigin+rowCount-1], or the blit
 * reads past the canvas (transparent → a missing terrace slice). These
 * tests prove that holds at every edge, and that full occupancy is
 * byte-identical to the old full-height canvas.
 */

const rowsAt = (...on: number[]): boolean[] => {
  const a = new Array(CHUNK_SIZE).fill(false);
  for (const r of on) a[r] = true;
  return a;
};

/** The rows the renderer will actually sample for these scan rows:
 *  each true row's ±1 pad, clamped. */
const sampledRows = (rows: boolean[]): number[] => {
  const out = new Set<number>();
  for (let r = 0; r < CHUNK_SIZE; r++) {
    if (!rows[r]) continue;
    out.add(Math.max(0, r - 1));
    out.add(r);
    out.add(Math.min(CHUNK_SIZE - 1, r + 1));
  }
  return [...out];
};

test('a single mid-chunk row: origin backs off one, height buckets to 8', () => {
  const { rowOrigin, rowCount } = liftedRowSpan(rowsAt(15));
  assert.equal(rowOrigin, 14); // 15 - 1 pad
  assert.equal(rowCount, 8); // span 3 (14..16) → bucketed to 8
});

test('full occupancy is the full canvas — byte-identical to pre-B2', () => {
  const all = new Array(CHUNK_SIZE).fill(true);
  const { rowOrigin, rowCount } = liftedRowSpan(all);
  assert.equal(rowOrigin, 0);
  assert.equal(rowCount, CHUNK_SIZE);
});

test('rowCount never exceeds CHUNK_SIZE and is a multiple of the bucket (unless clamped)', () => {
  for (let first = 0; first < CHUNK_SIZE; first++) {
    for (let last = first; last < CHUNK_SIZE; last++) {
      const { rowCount } = liftedRowSpan(rowsAt(first, last));
      assert.ok(rowCount <= CHUNK_SIZE, `rowCount ${rowCount} <= ${CHUNK_SIZE}`);
      assert.ok(rowCount > 0);
      assert.ok(rowCount % 8 === 0 || rowCount === CHUNK_SIZE, `rowCount ${rowCount} bucketed`);
    }
  }
});

test('THE INVARIANT: every sampled row fits inside [rowOrigin, rowOrigin+rowCount-1]', () => {
  // Exhaustive over all [first,last] pairs, plus scattered patterns.
  const cases: boolean[][] = [];
  for (let first = 0; first < CHUNK_SIZE; first++)
    for (let last = first; last < CHUNK_SIZE; last++) cases.push(rowsAt(first, last));
  cases.push(rowsAt(0));
  cases.push(rowsAt(CHUNK_SIZE - 1));
  cases.push(rowsAt(0, CHUNK_SIZE - 1));
  cases.push(rowsAt(3, 4, 5, 20, 21));
  for (const rows of cases) {
    const { rowOrigin, rowCount } = liftedRowSpan(rows);
    const top = rowOrigin;
    const bot = rowOrigin + rowCount - 1;
    for (const r of sampledRows(rows)) {
      assert.ok(r >= top && r <= bot, `sampled row ${r} outside canvas [${top},${bot}]`);
    }
  }
});

test('edge rows: origin clamps at 0 and the span never runs off the top', () => {
  const lo = liftedRowSpan(rowsAt(0));
  assert.equal(lo.rowOrigin, 0);
  assert.ok(sampledRows(rowsAt(0)).every((r) => r < lo.rowCount));

  const hi = liftedRowSpan(rowsAt(CHUNK_SIZE - 1));
  // last row 31 → rowOrigin 30, sampled {30,31} fit in a bucketed span.
  assert.ok(sampledRows(rowsAt(CHUNK_SIZE - 1)).every((r) => r >= hi.rowOrigin && r <= hi.rowOrigin + hi.rowCount - 1));
});

test('an empty scan is defensively full-height (callers gate, but no crash)', () => {
  const { rowOrigin, rowCount } = liftedRowSpan(new Array(CHUNK_SIZE).fill(false));
  assert.equal(rowOrigin, 0);
  assert.equal(rowCount, CHUNK_SIZE);
});
