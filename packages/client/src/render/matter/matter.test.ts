import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MATTER } from './index.js';
import { Particles, PARTICLE_CAP, EMITTER_CAP } from '../particles.js';
import type { MatterCtx } from './types.js';

/** Deterministic PRNG — deployments must not depend on luck to obey laws. */
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

const TEN = ['fire', 'smoke', 'dust', 'frost', 'venom', 'storm', 'blood', 'radiance', 'shadow', 'water'];

test('the registry holds exactly the ten mastered materials', () => {
  assert.deepEqual(Object.keys(MATTER).sort(), [...TEN].sort());
  for (const id of TEN) {
    assert.equal(MATTER[id]!.id, id, `${id} knows its own name`);
  }
});

test('every material speaks at least three deployments', () => {
  for (const [id, mat] of Object.entries(MATTER)) {
    const n = Object.keys(mat.deployments).length;
    assert.ok(n >= 3, `${id} has only ${n} deployments`);
  }
});

test('palettes are identities: five stops each, no two materials share a fingerprint', () => {
  const seen = new Map<string, string>();
  for (const [id, mat] of Object.entries(MATTER)) {
    assert.equal(mat.palette.length, 5, `${id} palette must carry five stops`);
    for (const c of mat.palette) {
      assert.match(c, /^#[0-9a-f]{6}$/i, `${id} palette color ${c} is not a hex`);
    }
    const fp = mat.palette.join(',');
    assert.ok(!seen.has(fp), `${id} shares its exact palette with ${seen.get(fp)}`);
    seen.set(fp, id);
  }
});

test('every deployment casts clean: no throw, bounded spawn, bounded emitters', () => {
  for (const [id, mat] of Object.entries(MATTER)) {
    for (const [dep, fn] of Object.entries(mat.deployments)) {
      const ps = new Particles(mulberry32(7));
      const glows: number[] = [];
      const c: MatterCtx = { particles: ps, glow: (_x, _y, _r, _rgb, a) => glows.push(a) };
      fn(c, 5, 5, { x2: 7, y2: 4, dir: 0.4 });
      // One-shot budget: ≤ 60 grains on the first frame at scale 1.
      assert.ok(ps.count() <= 60, `${id}.${dep} spawns ${ps.count()} grains at once`);
      assert.ok(ps.emitterCount() <= 3, `${id}.${dep} runs ${ps.emitterCount()} emitters`);
      // Run its whole life: nothing may leak past the caps or linger.
      for (let i = 0; i < 900; i++) ps.update(0.016); // 14.4s ≫ any dur
      assert.equal(ps.emitterCount(), 0, `${id}.${dep} leaked a live emitter`);
      assert.ok(ps.count() < PARTICLE_CAP, `${id}.${dep} pinned the pool`);
      // Glow discipline: quiet accents, never floodlights.
      for (const a of glows) assert.ok(a <= 0.4, `${id}.${dep} glow alpha ${a} > 0.4`);
    }
  }
});

test('a deployment at scale 3 still respects the one-shot budget law', () => {
  for (const [id, mat] of Object.entries(MATTER)) {
    for (const [dep, fn] of Object.entries(mat.deployments)) {
      const ps = new Particles(mulberry32(11));
      fn({ particles: ps }, 5, 5, { scale: 3, x2: 7, y2: 4 });
      assert.ok(ps.count() <= 180, `${id}.${dep} at scale 3 spawns ${ps.count()}`);
    }
  }
});

test('shadow never glows — its voice is the deliberate absence', () => {
  let glowed = false;
  const ps = new Particles(mulberry32(3));
  const c: MatterCtx = { particles: ps, glow: () => { glowed = true; } };
  for (const fn of Object.values(MATTER.shadow!.deployments)) {
    fn(c, 5, 5, { x2: 7, y2: 4 });
  }
  assert.equal(glowed, false);
});

test('blood never glows either — weight and consequence, no light', () => {
  let glowed = false;
  const ps = new Particles(mulberry32(4));
  const c: MatterCtx = { particles: ps, glow: () => { glowed = true; } };
  for (const fn of Object.values(MATTER.blood!.deployments)) {
    fn(c, 5, 5, { x2: 7, y2: 4, dir: 1 });
  }
  assert.equal(glowed, false);
});

test('sustained deployments return their emitter handle for steering', () => {
  // One per material where the design promises a handle.
  const sustained: Array<[string, string]> = [
    ['fire', 'plume'], ['smoke', 'veil'], ['dust', 'billow'],
    ['frost', 'fog'], ['venom', 'cloud'], ['storm', 'charge'],
    ['blood', 'drip'], ['radiance', 'halo'], ['shadow', 'veil'],
    ['water', 'rain'],
  ];
  for (const [id, dep] of sustained) {
    const ps = new Particles(mulberry32(5));
    const h = MATTER[id]!.deployments[dep]!({ particles: ps }, 0, 0);
    assert.ok(h && typeof h.stop === 'function', `${id}.${dep} returned no handle`);
  }
});

test('emitter storms from repeated casts stay inside the emitter cap', () => {
  const ps = new Particles(mulberry32(9));
  const c: MatterCtx = { particles: ps };
  for (let i = 0; i < 40; i++) {
    MATTER.fire!.deployments.plume!(c, i, 0);
    MATTER.venom!.deployments.cloud!(c, i, 1);
  }
  assert.ok(ps.emitterCount() <= EMITTER_CAP);
});
