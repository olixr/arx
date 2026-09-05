import test from 'node:test';
import assert from 'node:assert/strict';
import { DOOR_CLOSE_MS, DOOR_OPEN_MS, DOOR_SHAKE_MS, DoorEases, DoorLeafRegistry, growEase, leafCorners, leafDir, type DoorLeaf } from './doors.js';

const REF = { page: 0, u0: 0, v0: 0, u1: 1, v1: 1, w: 32, h: 72 };

const leaf = (over: Partial<DoorLeaf> = {}): DoorLeaf => ({
  key: '3,4',
  hx: 3.15,
  hy: 0,
  hz: 4.8,
  sx: 1,
  sz: 0,
  ox: 0,
  oz: -1,
  w: 0.68,
  h: 1.5,
  open: false,
  ref: REF,
  ...over,
});

// ------------------------------------------------------- the clock

test('growEase is the 2D curve: 0 at rest, overshoots past 1 mid-fling, settles at 1', () => {
  assert.ok(Math.abs(growEase(0)) < 1e-9);
  assert.equal(growEase(1), 1);
  assert.ok(growEase(0.6) > 1.02, 'the fling overshoots');
  assert.ok(growEase(0.95) < 1.01 && growEase(0.95) > 0.99, 'and settles');
});

test('DoorEases: opening takes 520 ms on the overshoot, closing 380 ms sober, a shake holds posture', () => {
  const e = new DoorEases();
  const t0 = 1000;
  assert.equal(e.openness('k', false, t0), 0);
  assert.equal(e.openness('k', true, t0), 1);
  e.add('k', 'open', t0);
  assert.ok(Math.abs(e.openness('k', true, t0)) < 1e-9, 'starts shut');
  assert.ok(e.openness('k', true, t0 + DOOR_OPEN_MS * 0.6) > 1, 'flings past the rest');
  assert.ok(e.hot('k', t0 + DOOR_OPEN_MS - 1));
  assert.equal(e.openness('k', true, t0 + DOOR_OPEN_MS), 1);
  assert.equal(e.size, 0, 'a finished ease is dropped');
  e.add('k', 'close', t0);
  assert.ok(Math.abs(e.openness('k', false, t0) - 1) < 1e-9, 'starts open');
  const mid = e.openness('k', false, t0 + DOOR_CLOSE_MS * 0.25);
  assert.ok(mid > 0 && mid < 1);
  assert.equal(e.openness('k', false, t0 + DOOR_CLOSE_MS), 0);
  e.add('k', 'shake', t0);
  assert.equal(e.openness('k', true, t0 + 10), 1, 'a shake never moves the leaf');
  assert.notEqual(e.shake('k', t0 + 40), 0);
  assert.equal(e.shake('k', t0 + DOOR_SHAKE_MS), 0);
  assert.equal(e.size, 0);
});

test('DoorEases sweeps stale keys past 32 entries', () => {
  const e = new DoorEases();
  for (let i = 0; i < 40; i++) e.add(`d${i}`, 'open', i * 10);
  assert.ok(e.size <= 40);
  e.add('late', 'open', 100000);
  assert.ok(e.size < 40, 'old eases were swept');
});

// ----------------------------------------------------- the leaf law

test('leafDir sweeps from the shut direction to the open one through a quarter turn', () => {
  const l = leaf();
  const d = { x: 0, z: 0 };
  leafDir(l, 0, d);
  assert.deepEqual([d.x, d.z], [1, 0]);
  leafDir(l, 1, d);
  assert.ok(Math.abs(d.x) < 1e-9 && Math.abs(d.z + 1) < 1e-9);
  leafDir(l, 0.5, d);
  assert.ok(d.x > 0 && d.z < 0, 'half open points between');
});

test('leafCorners writes hinge-base, free-base, free-top, hinge-top', () => {
  const l = leaf();
  const p = new Float32Array(12);
  leafCorners(l, 0, p, 0, { x: 0, z: 0 });
  assert.deepEqual([...p.slice(0, 3)].map((v) => +v.toFixed(3)), [3.15, 0, 4.8]);
  assert.deepEqual([...p.slice(3, 6)].map((v) => +v.toFixed(3)), [3.83, 0, 4.8]);
  assert.deepEqual([...p.slice(6, 9)].map((v) => +v.toFixed(3)), [3.83, 1.5, 4.8]);
  assert.deepEqual([...p.slice(9, 12)].map((v) => +v.toFixed(3)), [3.15, 1.5, 4.8]);
  leafCorners(l, 1, p, 0, { x: 0, z: 0 });
  assert.ok(Math.abs(p[5]! - (4.8 - 0.68)) < 1e-5, 'open: the free edge swung north');
});

// ----------------------------------------------------- the registry

test('the registry eases only a door whose posture CHANGED across rebuilds', () => {
  const r = new DoorLeafRegistry();
  r.setChunk(1, [leaf({ open: false })], 0);
  assert.equal(r.eases.size, 0, 'first sight: no ease');
  assert.equal(r.count, 1);
  const v = r.version;
  r.setChunk(1, [leaf({ open: false })], 100);
  assert.equal(r.eases.size, 0, 'an unchanged rebuild is silent');
  assert.ok(r.version > v, 'but the set was replaced');
  r.setChunk(1, [leaf({ open: true })], 200);
  assert.equal(r.eases.size, 1, 'the flip kicks an ease');
  assert.ok(r.eases.openness('3,4', true, 200) < 0.01, 'from shut');
  assert.equal(r.eases.openness('3,4', true, 200 + DOOR_OPEN_MS), 1, 'to open');
});

test('the registry drops evicted chunks under prune and forgets on clear', () => {
  const r = new DoorLeafRegistry();
  r.setChunk(1, [leaf({ key: 'a' })], 0);
  r.setChunk(2, [leaf({ key: 'b' })], 0);
  assert.equal(r.count, 2);
  r.prune((k) => k === 2);
  assert.equal(r.count, 1);
  assert.equal([...r.states()][0]!.leaf.key, 'b');
  r.setChunk(2, [], 0);
  assert.equal(r.count, 0, 'an empty registration clears the chunk');
  r.clear();
  r.setChunk(1, [leaf({ key: 'a', open: true })], 0);
  assert.equal(r.eases.size, 0, 'posture memory was forgotten with clear');
});

test('THE POSTURE MAP FORGETS WHAT LEFT: a rebuild without a door drops its memory; dropChunk drops the chunk\'s', () => {
  const r = new DoorLeafRegistry();
  r.setChunk(1, [leaf({ key: 'a' }), leaf({ key: 'b' })], 0);
  r.setChunk(2, [leaf({ key: 'c' })], 0);
  assert.equal(r.postures, 3);
  // A rebuild of chunk 1 that lists only 'a': 'b' is forgotten, 'a' is kept (a flip would still ease).
  r.setChunk(1, [leaf({ key: 'a', open: true })], 10);
  assert.equal(r.postures, 2);
  assert.ok(r.eases.hot('a', 11), 'a flipped door still eases across the rebuild');
  // An emptied chunk (no doors at all) still registers — and forgets.
  r.setChunk(1, [], 20);
  assert.equal(r.postures, 1);
  assert.equal(r.count, 1);
  // A true eviction drops the posture with the leaves.
  r.dropChunk(2);
  assert.equal(r.postures, 0);
  assert.equal(r.count, 0);
  // prune walks the live map, deleting as it goes.
  r.setChunk(3, [leaf({ key: 'd' })], 30);
  r.setChunk(4, [leaf({ key: 'e' })], 30);
  r.prune((k) => k === 4);
  assert.equal(r.postures, 1);
  assert.equal([...r.states()][0]!.leaf.key, 'e');
});
