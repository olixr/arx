/**
 * The score — pure generative composition, no WebAudio anywhere.
 * music.ts turns these note events into sound; this module only
 * decides WHAT to play, from an injected rng, so tests can pin the
 * musical laws exactly.
 *
 * The mood brief (user, twice now): C418's Minecraft ambience and the
 * warmth of a fantasy town — calm, soothing, DEEP. The first cut was
 * too high and its layers fought. The laws that carry the fix:
 *
 *  - THE REGISTER CEILING: no note above G5 (midi 79), ever. The
 *    sharpness the user heard was register, not volume — melody lives
 *    in one octave starting an octave over the root, bells only
 *    double notes that keep the double under E5-ish, and everything
 *    drops an octave at night.
 *  - THE SEPARATION LAW: layers own frequency lanes. Bass at the
 *    bottom (a single root, chord changes only), pads voiced BELOW
 *    the melody (two voices, root+fifth, folded down so they never
 *    cross it by day), melody in its octave, sparkle rare and soft.
 *    Nothing competes because nothing shares a lane.
 *  - THE SLOW BLOOM (progressive layering): a phrase opens with pad
 *    and bass alone, the melody enters after the intro bars, and the
 *    color layers — town harp arpeggios, the wild's soft flute — are
 *    gated by `intensity`, which the performer grows the longer you
 *    stay in a zone. The first phrase you hear in a place is nearly
 *    empty; the third has found its voice.
 *  - PENTATONIC MELODY: no semitone clashes; a random walk can't
 *    play a wrong note.
 *  - SILENCE IS A SECTION: long rests between phrases. Music that
 *    never stops is wallpaper; music that returns is an event.
 *  - LAND HOME: the last melody note snaps to the tonic class and
 *    holds — every phrase resolves.
 */

import type { ZoneId } from './zones.js';

export type Rng = () => number;

export type Voice = 'key' | 'pad' | 'bass' | 'harp' | 'flute' | 'bell';

export interface NoteEvent {
  /** Seconds from phrase start. */
  t: number;
  midi: number;
  /** Seconds. */
  dur: number;
  /** 0..1 — the synth maps this to gain. */
  vel: number;
  voice: Voice;
}

export interface Phrase {
  events: NoteEvent[];
  /** Seconds from phrase start to the last release tail. */
  lengthSec: number;
  /** Silence to hold after this phrase before the next. */
  gapSec: number;
}

/** THE REGISTER CEILING — no event may sound above this. */
export const CEILING_MIDI = 79; // G5
/** And nothing useful lives below this. */
export const FLOOR_MIDI = 33; // A1

interface ThemeDef {
  /** Midi root of the key. */
  root: number;
  /** Melody scale, semitones from root within one octave. */
  scale: number[];
  /** Progression: each chord = semitone offsets from root; [0] is its bass class. */
  chords: number[][];
  barsPerChord: number;
  /** Quarter-note bpm; phrases are 4/4. */
  tempo: number;
  bars: number;
  /** Bars of pad+bass alone before the melody may enter. */
  introBars: number;
  /** Base chance an eighth-note slot sounds. */
  density: number;
  /** Chance a low melody note is doubled by a soft bell. */
  bell: number;
  /** Color layers this theme may bloom into at high intensity. */
  arp: boolean;
  flute: boolean;
  gapSec: [number, number];
}

/**
 * Three zone themes. Town is a hearth — warm, with harp arpeggios
 * when it fully blooms; the wild is big patient sky with a distant
 * flute; the cave is single low notes into darkness. All pentatonic.
 */
export const THEMES: Record<ZoneId, ThemeDef> = {
  town: {
    root: 55, // G3
    scale: [0, 2, 4, 7, 9], // major pentatonic
    chords: [
      [0, 4, 7], // I
      [-3, 0, 4], // vi
      [5, 9, 12], // IV
      [0, 4, 7], // I — home twice as often as anywhere else
    ],
    barsPerChord: 1,
    tempo: 66,
    bars: 16,
    introBars: 4,
    density: 0.3,
    bell: 0.1,
    arp: true,
    flute: false,
    gapSec: [20, 42],
  },
  wild: {
    root: 57, // A3
    scale: [0, 2, 4, 7, 9],
    chords: [
      [0, 4, 7, 14], // I add9 — the open-sky chord
      [5, 9, 12, 16], // IV add9
      [-3, 0, 4, 11], // vi
      [7, 11, 14, 17], // V color
    ],
    barsPerChord: 2,
    tempo: 54,
    bars: 12,
    introBars: 4,
    density: 0.22,
    bell: 0.06,
    arp: false,
    flute: true,
    gapSec: [26, 58],
  },
  cave: {
    root: 45, // A2
    scale: [0, 3, 5, 7, 10], // minor pentatonic
    chords: [
      [0, 7, 12], // bare fifth drone
      [-2, 5, 10], // bVII shadow
      [0, 7, 12],
      [3, 10, 15], // bIII lift
    ],
    barsPerChord: 2,
    tempo: 46,
    bars: 8,
    introBars: 2,
    density: 0.14,
    bell: 0.16, // the cave's "bells" are echo pings — they carry the theme
    arp: false,
    flute: false,
    gapSec: [30, 68],
  },
};

export function midiHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Nearest pitch class of `cls` (semitones from root) to `midi`. */
function snapToClass(midi: number, root: number, cls: number[]): number {
  let best = midi;
  let bestD = Infinity;
  for (let oct = -2; oct <= 2; oct++) {
    for (const c of cls) {
      const m = root + c + Math.round((midi - root - c) / 12) * 12 + oct * 12;
      const d = Math.abs(m - midi);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
  }
  return best;
}

/**
 * Compose one phrase. `intensity` 0..1 is how settled-in the listener
 * is (the performer grows it per zone): 0 = pad, bass, and the barest
 * melody; 1 = the full bloom with color layers.
 */
export function generatePhrase(zone: ZoneId, night: boolean, intensity: number, rng: Rng): Phrase {
  const th = THEMES[zone];
  const beat = 60 / th.tempo;
  const slot = beat / 2; // eighth-note grid
  const barSec = beat * 4;
  const events: NoteEvent[] = [];

  const density = th.density * (night ? 0.55 : 1) * (0.7 + 0.3 * intensity);
  const drop = night ? -12 : 0;
  const velScale = night ? 0.7 : 1;
  const melodyBase = th.root + 12 + drop; // one octave over the root
  const chordAt = (bar: number): number[] =>
    th.chords[Math.floor(bar / th.barsPerChord) % th.chords.length]!;

  // ---- Bass and pads: the ground floor, present from bar one.
  for (let bar = 0; bar < th.bars; bar += th.barsPerChord) {
    const chord = chordAt(bar);
    const span = barSec * th.barsPerChord;
    const t0 = bar * barSec;
    // One low root per chord change — the note that makes it deep.
    let bassMidi = th.root - 12 + chord[0]!;
    while (bassMidi < FLOOR_MIDI) bassMidi += 12;
    events.push({ t: t0 + rng() * 0.04, midi: bassMidi, dur: span * 0.92, vel: 0.13 * velScale, voice: 'bass' });
    // Pads: TWO voices only — the chord's root class and its fifth,
    // FOLDED to sit below the melody's octave (the separation law).
    const c0 = chord[0]! >= 5 ? chord[0]! - 12 : chord[0]!;
    let padLow = th.root + c0 + drop;
    while (padLow < FLOOR_MIDI + 3) padLow += 12;
    for (const off of [0, 7]) {
      events.push({
        t: t0 + rng() * 0.06,
        midi: padLow + off,
        dur: span * 0.98,
        vel: (0.09 + rng() * 0.02) * velScale,
        voice: 'pad',
      });
    }
  }

  // ---- Melody: a random walk in ONE octave over the root, entering
  // only after the intro bars, thinning through the final bar.
  const ladder: number[] = [...th.scale, 12];
  let idx = 2;
  let lastKeyEvent: NoteEvent | null = null;
  const startSlot = th.introBars * 8;
  const totalSlots = th.bars * 8;
  for (let s = startSlot; s < totalSlots; s++) {
    const bar = Math.floor(s / 8);
    const inBar = s % 8;
    // Call and answer: even 4-bar groups sing, odd ones recede; the
    // last bar always recedes (the outro breath before landing home).
    let breathe = Math.floor(bar / 4) % 2 === 0 ? 1 : 0.6;
    if (bar >= th.bars - 1) breathe *= 0.45;
    const beatW = inBar === 0 ? 1.6 : inBar % 4 === 0 ? 1.25 : inBar % 2 === 0 ? 1 : 0.5;
    if (rng() > density * breathe * beatW) continue;

    // Step the walk: small moves, rare leaps, pulled home at the ends.
    const r = rng();
    const step = r < 0.12 ? 2 : r < 0.55 ? 1 : 0;
    idx += (rng() < 0.5 ? -1 : 1) * step;
    if (idx < 0) idx = 1;
    if (idx >= ladder.length) idx = ladder.length - 2;

    let midi = melodyBase + ladder[idx]!;
    if (inBar === 0 || inBar === 4) {
      const cls = chordAt(bar).map((c) => ((c % 12) + 12) % 12);
      midi = snapToClass(midi, melodyBase, cls);
    }
    // The lane law: the snap may not pull the melody down into the
    // pads' octave, nor over the ceiling.
    if (midi < melodyBase) midi += 12;
    if (midi > CEILING_MIDI) midi -= 12;

    // Unhurried: most notes hold long — C418 lets tones ring.
    const holdSlots = rng() < 0.3 ? 4 : rng() < 0.65 ? 2 : 1;
    const vel = (0.24 + rng() * 0.12) * (inBar % 4 === 0 ? 1.1 : 0.85) * velScale;
    const ev: NoteEvent = {
      t: s * slot + (rng() - 0.5) * 0.014, // human micro-timing
      midi,
      dur: slot * holdSlots * 1.9,
      vel: Math.min(0.4, vel),
      voice: 'key',
    };
    events.push(ev);
    lastKeyEvent = ev;
    // Sparkle is EARNED: only in a bloomed phrase, only doubling notes
    // low enough that the double stays warm, and very softly.
    if (intensity > 0.55 && midi <= 62 && rng() < th.bell) {
      events.push({ t: ev.t + 0.012, midi: midi + 12, dur: ev.dur * 0.6, vel: ev.vel * 0.3, voice: 'bell' });
    }
    s += holdSlots - 1;
  }

  // ---- Color layers: the bloom. Only when the listener has settled.
  if (th.arp && !night && intensity > 0.4) {
    // Town harp: a gentle rising broken chord every other bar in the
    // phrase's heart, plucked under the melody's volume.
    for (let bar = th.introBars + 2; bar < th.bars - 2; bar += 2) {
      if (rng() < 0.45) continue;
      const chord = chordAt(bar);
      const t0 = bar * barSec + beat * (rng() < 0.5 ? 0 : 2);
      const tones = [...chord].sort((a, b) => a - b);
      tones.forEach((c, i) => {
        let m = th.root + 12 + c;
        while (m > CEILING_MIDI - 3) m -= 12;
        events.push({
          t: t0 + i * slot * 0.5 + (rng() - 0.5) * 0.01,
          midi: m,
          dur: slot * 2,
          vel: (0.1 + rng() * 0.04) * velScale,
          voice: 'harp',
        });
      });
    }
  }
  if (th.flute && !night && intensity > 0.5) {
    // The wild's far flute: one or two slow calls in the middle bars,
    // long tones from the scale, never busy.
    const calls = 1 + (rng() < 0.4 ? 1 : 0);
    for (let c = 0; c < calls; c++) {
      const bar = th.introBars + 1 + Math.floor(rng() * (th.bars - th.introBars - 4));
      let t0 = bar * barSec + (rng() < 0.5 ? 0 : beat);
      const notes = 2 + Math.floor(rng() * 2);
      let deg = 2 + Math.floor(rng() * 3);
      for (let n = 0; n < notes; n++) {
        deg += rng() < 0.5 ? -1 : 1;
        deg = Math.max(0, Math.min(th.scale.length - 1, deg));
        let m = th.root + 12 + th.scale[deg]!;
        if (m > CEILING_MIDI - 3) m -= 12;
        const dur = beat * (1.5 + rng() * 1.5);
        events.push({ t: t0, midi: m, dur, vel: 0.11 * velScale, voice: 'flute' });
        t0 += dur + beat * 0.5 * rng();
      }
    }
  }

  // Land home: the phrase's last word is always the tonic class, held.
  if (lastKeyEvent) {
    lastKeyEvent.midi = snapToClass(lastKeyEvent.midi, melodyBase, [0, 7]);
    lastKeyEvent.dur = Math.max(lastKeyEvent.dur, beat * 3);
  }

  const lengthSec = th.bars * barSec + 3;
  const gapSec = th.gapSec[0] + rng() * (th.gapSec[1] - th.gapSec[0]);
  return { events: events.sort((a, b) => a.t - b.t), lengthSec, gapSec };
}
