import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Debris, DEBRIS_CAP, type DebrisChunk } from './debris.js';

/** Deterministic PRNG so break-up laws are pinnable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NO_WALLS = () => false;

const chunksOf = (d: Debris): DebrisChunk[] => [...d.chunks()];

test('chunks burst WITH the blow: every velocity lies in the impact cone', () => {
  const d = new Debris();
  d.smash(5, 5, 0, 'barrel', mulberry32(7));
  const chunks = chunksOf(d);
  assert.ok(chunks.length >= 8, 'a barrel gives up a real handful');
  for (const c of chunks) {
    // vy is depth-compressed at spawn; undo it for the true heading.
    const ang = Math.atan2(c.vy / 0.8, c.vx);
    assert.ok(Math.abs(ang) < 0.7, `chunk heading ${ang} escapes the cone`);
    assert.ok(c.vz > 0, 'burst matter goes up before it comes down');
  }
});

test('debris never crosses a wall — it thuds and stays on this side', () => {
  const d = new Debris();
  const wallAt2 = (x: number) => x >= 2;
  d.smash(0.5, 0.5, 0, 'crate', mulberry32(11));
  for (let i = 0; i < 250; i++) d.update(0.016, (x) => wallAt2(x));
  for (const c of chunksOf(d)) {
    assert.ok(c.x < 2, `chunk at x=${c.x} passed the wall`);
  }
});

test('every chunk lands, settles, and eventually clears itself', () => {
  const d = new Debris();
  d.smash(5, 5, Math.PI / 3, 'table', mulberry32(3));
  for (let i = 0; i < 250; i++) d.update(0.016, NO_WALLS); // 4s
  const alive = chunksOf(d);
  assert.ok(alive.length > 0, 'table wreckage lingers past the bounces');
  for (const c of alive) {
    assert.equal(c.z, 0, 'grounded');
    assert.ok(c.settled, 'settled');
  }
  for (let i = 0; i < 400; i++) d.update(0.016, NO_WALLS); // +6.4s > maxLife
  assert.equal(chunksOf(d).length, 0, 'the mess politely leaves');
});

test('the pool is capped — a rampage can never grow the draw bill', () => {
  const d = new Debris();
  for (let i = 0; i < 40; i++) d.smash(i, i, 0, 'goods', mulberry32(i));
  assert.ok(chunksOf(d).length <= DEBRIS_CAP);
});

test('no two breakages match: different rolls, different wreckage', () => {
  const a = new Debris();
  const b = new Debris();
  a.smash(0, 0, 0, 'barrel', mulberry32(1));
  b.smash(0, 0, 0, 'barrel', mulberry32(2));
  const sig = (d: Debris) => chunksOf(d).map((c) => `${c.len.toFixed(3)}:${c.rot.toFixed(3)}`);
  assert.notDeepEqual(sig(a), sig(b));
});

test('a crack chips small and brief — never a full burst', () => {
  const d = new Debris();
  d.chip(5, 5, 0, 'table', mulberry32(9));
  const chips = chunksOf(d);
  assert.ok(chips.length >= 2 && chips.length <= 4, 'a handful, not a burst');
  for (const c of chips) {
    assert.ok(c.len <= 0.17, 'chips are small');
    assert.ok(c.maxLife < 4, 'chips clear fast');
    const ang = Math.atan2(c.vy / 0.8, c.vx);
    assert.ok(Math.abs(ang) < 0.6, 'chips fly with the blow');
  }
});

test('THE TIMBER LAW: lumber breaks ALONG the lie and stays near it', () => {
  const d = new Debris();
  const bark = { base: '#6b4a2c', lit: '#8a6a45', dark: '#4a3420' };
  // Lie heading east: dx=1, dy=0, reach 3 tiles.
  d.timber(10, 10, 1, 0, 3, bark, mulberry32(13));
  const chunks = chunksOf(d);
  assert.ok(chunks.length >= 5, 'a real trunk gives up a real row of lumber');
  const rounds = chunks.filter((c) => c.round);
  assert.ok(rounds.length >= 2, 'the buck saws at least two rounds');
  for (const r of rounds) assert.equal(r.stripe, bark.lit, 'rounds carry lit end grain');
  for (const c of chunks) {
    assert.ok(c.x >= 10 && c.x <= 10 + 3.2, `chunk at x=${c.x} left the trunk line`);
    assert.ok(Math.abs(c.y - 10) < 0.6, 'lumber spawns ON the lie, not around it');
    assert.ok(c.z < 0.3, 'the trunk lies LOW — it breaks low');
    assert.ok(c.vz > 0, 'the pop is UP off the break line');
    assert.ok(Math.hypot(c.vx, c.vy) < 2.2, 'lumber is heavy: it thuds, never sails');
  }
});

test('the canopy bursts in its own leaves and clears before the lumber', () => {
  const d = new Debris();
  const leaves: [string, string, string] = ['#2a5f30', '#3d8542', '#58ab55'];
  d.canopyBurst(5, 5, leaves, 1.4, mulberry32(21));
  const mats = chunksOf(d);
  assert.ok(mats.length >= 10, 'a broad crown sheds a real storm');
  const palette = new Set([leaves[0], leaves[1], leaves[2]]);
  for (const c of mats) {
    assert.ok(c.round, 'leaf mats are tufts, never slabs');
    assert.ok(c.maxLife < 4.6, 'litter leaves before lumber');
    const base = c.color;
    // Every mat speaks the species palette (base tones or their shades).
    assert.ok(typeof base === 'string' && base.startsWith('#'));
  }
  assert.ok(
    mats.some((c) => palette.has(c.color)),
    'the species light bands survive into the burst',
  );
});

test('each kind breaks along its own joinery', () => {
  const colors = (kind: Parameters<Debris['smash']>[3]) => {
    const d = new Debris();
    d.smash(0, 0, 0, kind, mulberry32(5));
    return new Set(chunksOf(d).map((c) => c.color));
  };
  // Barrels shed iron hoops; chairs are all wood (and maybe cushion).
  assert.ok(colors('barrel').has('#3a3444'), 'barrel hoops are iron');
  assert.ok(!colors('chair').has('#3a3444'), 'chairs own no ironwork');
});
