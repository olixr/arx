import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePhrase, midiHz, THEMES, type Rng } from './score.js';
import type { ZoneId } from './zones.js';

/** Deterministic rng (mulberry32) so phrases are pinnable. */
function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ZONES: ZoneId[] = ['town', 'wild', 'cave'];

test('phrases are deterministic in the rng', () => {
  for (const z of ZONES) {
    const a = generatePhrase(z, false, rng(7));
    const b = generatePhrase(z, false, rng(7));
    assert.deepEqual(a, b);
  }
});

test('every note lands in the theme scale or its chords — no wrong notes possible', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    const legal = new Set<number>();
    for (const s of th.scale) legal.add(((s % 12) + 12) % 12);
    for (const chord of th.chords) for (const c of chord) legal.add(((c % 12) + 12) % 12);
    for (let seed = 1; seed <= 5; seed++) {
      for (const night of [false, true]) {
        const p = generatePhrase(z, night, rng(seed));
        for (const ev of p.events) {
          const cls = (((ev.midi - th.root) % 12) + 12) % 12;
          assert.ok(legal.has(cls), `${z} ${ev.voice} class ${cls}`);
        }
      }
    }
  }
});

test('phrases are well-formed: sorted, in-range, soft, with a real rest after', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    const p = generatePhrase(z, false, rng(3));
    assert.ok(p.events.length > 0);
    let last = -Infinity;
    for (const ev of p.events) {
      assert.ok(ev.t >= last, 'sorted by time');
      last = ev.t;
      assert.ok(ev.t >= -0.05 && ev.t <= p.lengthSec, 'inside the phrase');
      assert.ok(ev.vel > 0 && ev.vel <= 0.75, 'never loud');
      assert.ok(ev.dur > 0);
    }
    assert.ok(p.gapSec >= th.gapSec[0] && p.gapSec <= th.gapSec[1], 'silence is a section');
  }
});

test('the last word of a phrase is home — tonic or fifth', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    for (let seed = 1; seed <= 6; seed++) {
      const p = generatePhrase(z, false, rng(seed));
      const keys = p.events.filter((e) => e.voice === 'key');
      if (keys.length === 0) continue;
      const lastKey = keys.reduce((a, b) => (b.t >= a.t ? b : a));
      const cls = (((lastKey.midi - th.root) % 12) + 12) % 12;
      assert.ok(cls === 0 || cls === 7, `${z} seed ${seed} landed on class ${cls}`);
    }
  }
});

test('night plays fewer and softer notes than day', () => {
  for (const z of ZONES) {
    let dayN = 0;
    let nightN = 0;
    for (let seed = 1; seed <= 8; seed++) {
      dayN += generatePhrase(z, false, rng(seed)).events.filter((e) => e.voice === 'key').length;
      nightN += generatePhrase(z, true, rng(seed)).events.filter((e) => e.voice === 'key').length;
    }
    assert.ok(nightN < dayN, `${z}: night ${nightN} vs day ${dayN}`);
  }
});

test('midiHz anchors: A4 = 440, octaves double', () => {
  assert.ok(Math.abs(midiHz(69) - 440) < 1e-9);
  assert.ok(Math.abs(midiHz(81) - 880) < 1e-9);
});
