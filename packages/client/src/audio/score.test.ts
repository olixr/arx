import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CEILING_MIDI,
  FLOOR_MIDI,
  PAD_FLOOR_MIDI,
  generatePhrase,
  midiHz,
  THEMES,
  type Rng,
} from './score.js';
import type { ZoneId } from './zones.js';

/** Deterministic rng (mulberry32) so pieces are pinnable. */
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
const COLOR_VOICES = ['harp', 'flute', 'bell'];

test('pieces are deterministic in the rng', () => {
  for (const z of ZONES) {
    const a = generatePhrase(z, false, 1, rng(7));
    const b = generatePhrase(z, false, 1, rng(7));
    assert.deepEqual(a, b);
  }
});

test('the progression book: variety across pieces, never the same page twice', () => {
  for (const z of ZONES) {
    assert.ok(THEMES[z].progressions.length >= 3, `${z} needs a real book`);
    const picked = new Set<number>();
    for (let seed = 1; seed <= 10; seed++) {
      picked.add(generatePhrase(z, false, 1, rng(seed)).prog);
    }
    assert.ok(picked.size >= 2, `${z} always reads the same page`);
    // The avoid law: a piece never repeats the previous progression.
    for (let seed = 1; seed <= 8; seed++) {
      for (let avoid = 0; avoid < THEMES[z].progressions.length; avoid++) {
        assert.notEqual(generatePhrase(z, false, 1, rng(seed), avoid).prog, avoid);
      }
    }
  }
});

test('every note lands in the theme scale or its chords — no wrong notes possible', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    const legal = new Set<number>();
    for (const s of th.scale) legal.add(((s % 12) + 12) % 12);
    for (const prog of th.progressions) {
      for (const chord of prog) {
        for (const c of chord) {
          legal.add(((c % 12) + 12) % 12);
          legal.add((((c + 7) % 12) + 12) % 12); // pad fifths ride the bass class
        }
      }
    }
    for (let seed = 1; seed <= 5; seed++) {
      for (const night of [false, true]) {
        const p = generatePhrase(z, night, 1, rng(seed));
        for (const ev of p.events) {
          const cls = (((ev.midi - th.root) % 12) + 12) % 12;
          assert.ok(legal.has(cls), `${z} ${ev.voice} class ${cls}`);
        }
      }
    }
  }
});

test('the register ceiling: nothing above G5, nothing below the floor', () => {
  for (const z of ZONES) {
    for (let seed = 1; seed <= 6; seed++) {
      for (const night of [false, true]) {
        for (const intensity of [0, 0.7, 1]) {
          const p = generatePhrase(z, night, intensity, rng(seed));
          for (const ev of p.events) {
            assert.ok(ev.midi <= CEILING_MIDI, `${z} ${ev.voice} midi ${ev.midi} over the ceiling`);
            assert.ok(ev.midi >= FLOOR_MIDI, `${z} ${ev.voice} midi ${ev.midi} under the floor`);
          }
        }
      }
    }
  }
});

test('sub ownership: pads never voice below the pad floor', () => {
  for (const z of ZONES) {
    for (let seed = 1; seed <= 6; seed++) {
      for (const night of [false, true]) {
        const p = generatePhrase(z, night, 1, rng(seed));
        for (const ev of p.events) {
          if (ev.voice !== 'pad') continue;
          assert.ok(ev.midi >= PAD_FLOOR_MIDI, `${z} pad ${ev.midi} in the bass lane`);
        }
      }
    }
  }
});

test('the separation law: pads always sit below the melody', () => {
  for (const z of ZONES) {
    for (let seed = 1; seed <= 6; seed++) {
      for (const night of [false, true]) {
        const p = generatePhrase(z, night, 1, rng(seed));
        const pads = p.events.filter((e) => e.voice === 'pad').map((e) => e.midi);
        const keys = p.events.filter((e) => e.voice === 'key').map((e) => e.midi);
        if (!pads.length || !keys.length) continue;
        assert.ok(Math.max(...pads) < Math.min(...keys), `${z} seed ${seed}: pads cross the melody`);
      }
    }
  }
});

test('one color law: at most the zone color voice, bells only in the cave, always soft', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    for (let seed = 1; seed <= 8; seed++) {
      for (const night of [false, true]) {
        const p = generatePhrase(z, night, 1, rng(seed));
        for (const ev of p.events) {
          if (!COLOR_VOICES.includes(ev.voice)) continue;
          assert.equal(ev.voice, th.color, `${z} played a ${ev.voice}`);
          if (ev.voice === 'bell') {
            assert.equal(z, 'cave', 'bells escaped the cave');
            assert.ok(ev.vel <= 0.09, `bell vel ${ev.vel} — the chimes are back`);
          }
        }
      }
    }
  }
});

test('the long form: full-intensity day pieces run long; low intensity trims sections', () => {
  for (const z of ZONES) {
    for (let seed = 1; seed <= 4; seed++) {
      const long = generatePhrase(z, false, 1, rng(seed));
      const bare = generatePhrase(z, false, 0, rng(seed));
      assert.ok(long.lengthSec >= 95, `${z} full piece only ${long.lengthSec.toFixed(0)}s`);
      assert.ok(bare.lengthSec < long.lengthSec * 0.7, `${z} bare piece did not trim`);
    }
  }
});

test('the intro law: only pad and bass speak before the intro bars end', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    // Tempo breathes ±6% per piece; use the fastest possible intro.
    const introSec = th.sections.intro * (60 / (th.tempo * 1.06)) * 4 - 0.05;
    for (let seed = 1; seed <= 5; seed++) {
      const p = generatePhrase(z, false, 1, rng(seed));
      for (const ev of p.events) {
        if (ev.t < introSec) {
          assert.ok(ev.voice === 'pad' || ev.voice === 'bass', `${z}: ${ev.voice} jumped the intro`);
        }
      }
    }
  }
});

test('the slow bloom: intensity 0 is bare bones, full intensity earns the color voice', () => {
  for (const z of ZONES) {
    for (let seed = 1; seed <= 6; seed++) {
      const bare = generatePhrase(z, false, 0, rng(seed));
      for (const ev of bare.events) {
        assert.ok(['pad', 'bass', 'key'].includes(ev.voice), `${z} bare piece leaked a ${ev.voice}`);
      }
    }
  }
  // Each zone's color voice must surface across a handful of seeds.
  for (const z of ZONES) {
    const color = THEMES[z].color;
    if (!color) continue;
    let found = false;
    for (let seed = 1; seed <= 12 && !found; seed++) {
      found = generatePhrase(z, false, 1, rng(seed)).events.some((e) => e.voice === color);
    }
    assert.ok(found, `${z} never bloomed its ${color}`);
  }
});

test('pieces are well-formed: sorted, in-range, soft, with a real rest after', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    const p = generatePhrase(z, false, 1, rng(3));
    assert.ok(p.events.length > 0);
    let last = -Infinity;
    for (const ev of p.events) {
      assert.ok(ev.t >= last, 'sorted by time');
      last = ev.t;
      assert.ok(ev.t >= -0.05 && ev.t <= p.lengthSec, 'inside the piece');
      assert.ok(ev.vel > 0 && ev.vel <= 0.45, 'never loud');
      assert.ok(ev.dur > 0);
    }
    assert.ok(p.gapSec >= th.gapSec[0] && p.gapSec <= th.gapSec[1], 'silence is a section');
  }
});

test('the last word of a piece is home — tonic or fifth', () => {
  for (const z of ZONES) {
    const th = THEMES[z];
    for (let seed = 1; seed <= 6; seed++) {
      const p = generatePhrase(z, false, 1, rng(seed));
      const keys = p.events.filter((e) => e.voice === 'key');
      if (keys.length === 0) continue;
      const lastKey = keys.reduce((a, b) => (b.t >= a.t ? b : a));
      const cls = (((lastKey.midi - th.root) % 12) + 12) % 12;
      assert.ok(cls === 0 || cls === 7, `${z} seed ${seed} landed on class ${cls}`);
    }
  }
});

test('night plays fewer notes than day', () => {
  for (const z of ZONES) {
    let dayN = 0;
    let nightN = 0;
    for (let seed = 1; seed <= 8; seed++) {
      dayN += generatePhrase(z, false, 1, rng(seed)).events.filter((e) => e.voice === 'key').length;
      nightN += generatePhrase(z, true, 1, rng(seed)).events.filter((e) => e.voice === 'key').length;
    }
    assert.ok(nightN < dayN, `${z}: night ${nightN} vs day ${dayN}`);
  }
});

test('midiHz anchors: A4 = 440, octaves double', () => {
  assert.ok(Math.abs(midiHz(69) - 440) < 1e-9);
  assert.ok(Math.abs(midiHz(81) - 880) < 1e-9);
});
