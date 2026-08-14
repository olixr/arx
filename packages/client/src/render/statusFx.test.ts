import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_BIT,
  STATUS_AMBIENCE_MASK,
  AFFLICTION_STACKS_SHIFT,
} from '@arx/shared';
import { StatusEdges, LANDINGS, STATUS_INK, STATUS_VIGNETTE_RGB, statusLanding } from './statusFx.js';
import { Particles } from './particles.js';
import type { MatterCtx } from './matter/types.js';

/** Deterministic PRNG (the matter.test.ts precedent). */
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

const stacked = (bits: number, n: number): number => bits | (n << AFFLICTION_STACKS_SHIFT);

test('first sight is silent: a body walks on carrying old news', () => {
  const edges = new StatusEdges();
  edges.sweep();
  const got = edges.observe(7, STATUS_BIT.burn | STATUS_BIT.venom);
  assert.deepEqual(got, []);
});

test('a rising bit lands; steady bits stay quiet; expiry is silent', () => {
  const edges = new StatusEdges();
  edges.sweep();
  edges.observe(7, 0);
  edges.sweep();
  assert.deepEqual(edges.observe(7, STATUS_BIT.burn), [{ status: 'burn', kind: 'land' }]);
  edges.sweep();
  assert.deepEqual(edges.observe(7, STATUS_BIT.burn), []);
  edges.sweep();
  assert.deepEqual(edges.observe(7, 0), []);
  // The land after a clean clear speaks again.
  edges.sweep();
  assert.deepEqual(edges.observe(7, STATUS_BIT.burn), [{ status: 'burn', kind: 'land' }]);
});

test('two states landing together both speak, priority order held', () => {
  const edges = new StatusEdges();
  edges.sweep();
  edges.observe(3, 0);
  edges.sweep();
  const got = edges.observe(3, STATUS_BIT.burn | STATUS_BIT.sunder);
  assert.deepEqual(got, [
    { status: 'sunder', kind: 'land' },
    { status: 'burn', kind: 'land' },
  ]);
});

test('a stale body (culled away) re-enters silently', () => {
  const edges = new StatusEdges();
  edges.sweep();
  edges.observe(9, 0);
  // Three frames pass without observation — the body was off screen.
  edges.sweep();
  edges.sweep();
  edges.sweep();
  assert.deepEqual(edges.observe(9, STATUS_BIT.venom), []);
});

test('stealth and stack bits never land: only ambience-mask states speak', () => {
  const edges = new StatusEdges();
  edges.sweep();
  edges.observe(4, 0);
  edges.sweep();
  // hidden (1<<4), detected (1<<5), sheathed (1<<7) rise silently.
  assert.deepEqual(edges.observe(4, (1 << 4) | (1 << 5) | (1 << 7)), []);
});

test('a deeper wound speaks the stack note, venom-first when both ride', () => {
  const edges = new StatusEdges();
  edges.sweep();
  edges.observe(5, stacked(STATUS_BIT.venom, 1));
  edges.sweep();
  assert.deepEqual(edges.observe(5, stacked(STATUS_BIT.venom, 2)), [
    { status: 'venom', kind: 'stack' },
  ]);
  edges.sweep();
  // Bleed joins AND the count deepens: the landing speaks, the note is skipped.
  assert.deepEqual(edges.observe(5, stacked(STATUS_BIT.venom | STATUS_BIT.bleed, 3)), [
    { status: 'bleed', kind: 'land' },
  ]);
  edges.sweep();
  // Both riding, count deepens: ambiguous stacks speak venom.
  assert.deepEqual(edges.observe(5, stacked(STATUS_BIT.venom | STATUS_BIT.bleed, 4)), [
    { status: 'venom', kind: 'stack' },
  ]);
  edges.sweep();
  // Bleed alone deepening speaks bleed.
  edges.observe(6, stacked(STATUS_BIT.bleed, 1));
  edges.sweep();
  assert.deepEqual(edges.observe(6, stacked(STATUS_BIT.bleed, 2)), [
    { status: 'bleed', kind: 'stack' },
  ]);
});

test('the sweep purges long-unseen bodies', () => {
  const edges = new StatusEdges();
  edges.sweep();
  edges.observe(11, STATUS_BIT.burn);
  assert.equal(edges.size(), 1);
  for (let i = 0; i < 240; i++) edges.sweep();
  assert.equal(edges.size(), 0);
});

test('ONE GRAMMAR: every ambience state has a landing voice and an ink', () => {
  const states = ['burn', 'chill', 'shock', 'bleed', 'venom', 'sunder'] as const;
  let mask = 0;
  for (const s of states) {
    assert.ok(LANDINGS[s], `${s} has no landing voice`);
    assert.match(STATUS_INK[s]!, /^#[0-9a-f]{6}$/i, `${s} has no ink`);
    mask |= STATUS_BIT[s];
  }
  assert.equal(mask, STATUS_AMBIENCE_MASK, 'the grammar covers exactly the ambience mask');
  // The DoT vignette family: exactly the three ticking wounds.
  assert.deepEqual(Object.keys(STATUS_VIGNETTE_RGB).sort(), ['bleed', 'burn', 'venom']);
});

test('every landing and stack note casts clean: bounded spawn, no leaked emitters', () => {
  const states = ['burn', 'chill', 'shock', 'bleed', 'venom', 'sunder'] as const;
  for (const s of states) {
    for (const kind of ['land', 'stack'] as const) {
      const ps = new Particles(mulberry32(11));
      const c: MatterCtx = { particles: ps, glow: () => {} };
      statusLanding(c, 5, 5, { status: s, kind });
      assert.ok(ps.count() <= 60, `${s}/${kind} spawns ${ps.count()} grains at once`);
      assert.ok(ps.emitterCount() <= 2, `${s}/${kind} runs ${ps.emitterCount()} emitters`);
      for (let i = 0; i < 200; i++) ps.update(0.016);
      assert.equal(ps.emitterCount(), 0, `${s}/${kind} leaked a live emitter`);
    }
  }
});
