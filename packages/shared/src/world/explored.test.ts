import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EXPLORE_CELL,
  EXPLORE_REGION,
  ExploredMask,
  REGION_BYTES,
  REGION_CELLS,
  REVEAL_RADIUS,
  b64ToU8,
  regionKey,
  u8ToB64,
} from './explored.js';

test('bit layout: one marked tile lights exactly its cell', () => {
  const m = new ExploredMask();
  m.markDisc(10, 6, 0.1);
  // tile (10,6) -> cell (2,1) -> region (0,0), idx = 1*64+2 = 66
  const bytes = m.regionBytes(0, 0);
  assert.ok(bytes);
  const setBits: number[] = [];
  for (let i = 0; i < REGION_BYTES * 8; i++) {
    if (bytes![i >> 3]! & (1 << (i & 7))) setBits.push(i);
  }
  assert.deepEqual(setBits, [1 * REGION_CELLS + 2]);
  assert.ok(m.isRevealed(10, 6));
  assert.ok(m.isRevealed(8, 4)); // same 4x4 cell
  assert.ok(!m.isRevealed(12, 6)); // next cell east
  assert.ok(m.cellRevealed(2, 1));
});

test('disc determinism: two masks walking the same track mark identical bytes', () => {
  const a = new ExploredMask();
  const b = new ExploredMask();
  const track: [number, number][] = [];
  for (let i = 0; i < 60; i++) track.push([i * 3.7 - 40, Math.sin(i * 0.35) * 45 + i]);
  for (const [x, y] of track) a.markDisc(x, y);
  // b walks the same track sampled in a different order and cadence
  for (let i = track.length - 1; i >= 0; i--) b.markDisc(track[i]![0], track[i]![1]);
  const keys = [...a.regionKeys()].sort();
  assert.deepEqual([...b.regionKeys()].sort(), keys);
  for (const key of keys) {
    const [rx, ry] = key.split(',').map(Number) as [number, number];
    assert.deepEqual(b.regionBytes(rx, ry), a.regionBytes(rx, ry), `region ${key}`);
  }
});

test('disc respects the radius at cell centers', () => {
  const m = new ExploredMask();
  m.markDisc(0, 0);
  // A cell whose center is well inside the radius is lit
  assert.ok(m.isRevealed(REVEAL_RADIUS - 6, 0));
  // A cell whose center is well outside stays dark
  assert.ok(!m.isRevealed(REVEAL_RADIUS + EXPLORE_CELL * 2, 0));
  assert.ok(!m.isRevealed(0, -(REVEAL_RADIUS + EXPLORE_CELL * 2)));
});

test('region boundaries: a disc astride the seam dirties both regions', () => {
  const m = new ExploredMask();
  const dirty = m.markDisc(EXPLORE_REGION, 40); // x=256 sits on the 0|1 region seam
  assert.ok(dirty.includes(regionKey(0, 0)), 'west region dirty');
  assert.ok(dirty.includes(regionKey(1, 0)), 'east region dirty');
  assert.ok(m.isRevealed(EXPLORE_REGION - 2, 40));
  assert.ok(m.isRevealed(EXPLORE_REGION + 2, 40));
  // Negative coordinates land in negative regions, no off-by-one at 0
  const d2 = m.markDisc(-EXPLORE_REGION - 10, -10);
  assert.ok(d2.includes(regionKey(-2, -1)) || d2.includes(regionKey(-1, -1)));
  assert.ok(m.isRevealed(-EXPLORE_REGION - 10, -10));
});

test('re-marking charted ground reports no dirty regions', () => {
  const m = new ExploredMask();
  const first = m.markDisc(100, 100);
  assert.ok(first.length > 0);
  const again = m.markDisc(100, 100);
  assert.deepEqual(again, []);
});

// THE WORLDS APART: persistence is the PLANE'S law now — one mask
// charts one plane, and scratch planes simply never touch the DB.
// The old persistRegion/dropDungeonBand y-band gates are gone.

test('b64 roundtrip, all byte values, both paddings', () => {
  const full = new Uint8Array(256);
  for (let i = 0; i < 256; i++) full[i] = i;
  assert.deepEqual(b64ToU8(u8ToB64(full)), full);
  for (const len of [0, 1, 2, 3, 4, 5, REGION_BYTES]) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = (i * 37 + 11) & 0xff;
    const b64 = u8ToB64(bytes);
    assert.equal(b64.length % 4, 0, `padded length for ${len}`);
    assert.deepEqual(b64ToU8(b64), bytes, `roundtrip len ${len}`);
  }
});

test('region bytes survive a wire roundtrip through loadRegion', () => {
  const a = new ExploredMask();
  a.markDisc(500, -300);
  const b = new ExploredMask();
  for (const key of a.regionKeys()) {
    const [rx, ry] = key.split(',').map(Number) as [number, number];
    b.loadRegion(rx, ry, b64ToU8(u8ToB64(a.regionBytes(rx, ry)!)));
  }
  for (const key of a.regionKeys()) {
    const [rx, ry] = key.split(',').map(Number) as [number, number];
    assert.deepEqual(b.regionBytes(rx, ry), a.regionBytes(rx, ry));
  }
});
