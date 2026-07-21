/**
 * The score — pure generative composition, no WebAudio anywhere.
 * music.ts turns these note events into sound; this module only
 * decides WHAT to play, from an injected rng, so tests can pin the
 * musical laws (in-scale, in-phrase, sparser at night) exactly.
 *
 * The mood brief (user): C418's Minecraft ambience and RuneScape's
 * nostalgia — calm, warm, inviting, never busy. The laws that carry
 * that here:
 *  - PENTATONIC MELODY: every theme's melody scale has no semitone
 *    clashes, so a random walk can't play a wrong note, only a less
 *    interesting one.
 *  - SILENCE IS A SECTION: phrases are short and separated by long
 *    rests (gapSec). Music that never stops is wallpaper; music that
 *    returns is an event.
 *  - CALL AND ANSWER: within a phrase, 4-bar halves alternate denser
 *    and thinner so the melody breathes.
 *  - LAND HOME: the last melody note of a phrase snaps to the root
 *    class — every phrase resolves, nothing is left hanging.
 *  - NIGHT PLAYS LOWER AND LESS: after dark the same themes drop an
 *    octave, thin out, and soften. Familiar, but hushed.
 */

import type { ZoneId } from './zones.js';

export type Rng = () => number;

export type Voice = 'key' | 'pad' | 'bell';

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

interface ThemeDef {
  /** Midi root of the key. */
  root: number;
  /** Melody scale, semitones from root within one octave. */
  scale: number[];
  /** Progression: each chord = semitone offsets from root. */
  chords: number[][];
  barsPerChord: number;
  /** Quarter-note bpm; phrases are 4/4. */
  tempo: number;
  bars: number;
  /** Base chance an eighth-note slot sounds. */
  density: number;
  /** Melody register, octaves above root. */
  register: number;
  /** Chance a melody note is doubled by a bell an octave up. */
  bell: number;
  gapSec: [number, number];
}

/**
 * Three zone themes. Town is the warmest and most active — a hearth;
 * the wild is airy and patient — big sky over long grass; the cave is
 * sparse and low — single notes into darkness. All major/minor
 * PENTATONIC so nothing can bite.
 */
export const THEMES: Record<ZoneId, ThemeDef> = {
  town: {
    root: 55, // G3
    scale: [0, 2, 4, 7, 9], // major pentatonic
    chords: [
      [0, 4, 7], // I
      [-3, 0, 4], // vi (E m, voiced under)
      [5, 9, 12], // IV
      [0, 4, 7], // I — home twice as often as anywhere else
    ],
    barsPerChord: 1,
    tempo: 76,
    bars: 16,
    density: 0.42,
    register: 1,
    bell: 0.14,
    gapSec: [18, 40],
  },
  wild: {
    root: 57, // A3
    scale: [0, 2, 4, 7, 9],
    chords: [
      [0, 4, 7, 14], // I add9 — the open-sky chord
      [5, 9, 12, 16], // IV add9
      [-3, 0, 4, 11], // vi
      [7, 11, 14, 17], // V sus-ish color
    ],
    barsPerChord: 2,
    tempo: 58,
    bars: 16,
    density: 0.26,
    register: 1,
    bell: 0.08,
    gapSec: [24, 55],
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
    tempo: 48,
    bars: 8,
    density: 0.16,
    register: 1,
    bell: 0.2, // the cave's "bells" are echo pings — they carry the theme
    gapSec: [28, 65],
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

export function generatePhrase(zone: ZoneId, night: boolean, rng: Rng): Phrase {
  const th = THEMES[zone];
  const beat = 60 / th.tempo;
  const slot = beat / 2; // eighth-note grid
  const barSec = beat * 4;
  const events: NoteEvent[] = [];

  const density = th.density * (night ? 0.55 : 1);
  const drop = night ? -12 : 0;
  const velScale = night ? 0.75 : 1;

  // Pads: one chord per barsPerChord bars, held the whole span.
  for (let bar = 0; bar < th.bars; bar += th.barsPerChord) {
    const chord = th.chords[(bar / th.barsPerChord) % th.chords.length]!;
    const span = barSec * th.barsPerChord;
    for (const c of chord) {
      events.push({
        t: bar * barSec + rng() * 0.05,
        midi: th.root + c + drop,
        dur: span * 0.96,
        vel: (0.16 + rng() * 0.05) * velScale,
        voice: 'pad',
      });
    }
  }

  // Melody: a random walk on the pentatonic ladder. Chord-support
  // beats snap to the underlying chord so the walk always agrees with
  // the ground under it.
  const octaves = 2;
  const ladder: number[] = [];
  for (let o = 0; o < octaves; o++) for (const s of th.scale) ladder.push(o * 12 + s);
  const center = th.register * 12 + drop;
  let idx = Math.floor(ladder.length / 2);
  let lastKeyEvent: NoteEvent | null = null;

  const totalSlots = th.bars * 8;
  for (let s = 0; s < totalSlots; s++) {
    const bar = Math.floor(s / 8);
    const inBar = s % 8;
    // Call and answer: even 4-bar groups sing, odd ones recede.
    const breathe = Math.floor(bar / 4) % 2 === 0 ? 1 : 0.65;
    // Downbeats are likelier to sound than off-beats.
    const beatW = inBar === 0 ? 1.6 : inBar % 4 === 0 ? 1.25 : inBar % 2 === 0 ? 1 : 0.55;
    if (rng() > density * breathe * beatW) continue;

    // Step the walk: small moves, rare leaps.
    const r = rng();
    const step = r < 0.14 ? 3 : r < 0.3 ? 2 : r < 0.62 ? 1 : 0;
    idx += (rng() < 0.5 ? -1 : 1) * step;
    // Soft pull toward the middle of the ladder.
    if (idx < 0) idx = 1;
    if (idx >= ladder.length) idx = ladder.length - 2;

    let midi = th.root + center + ladder[idx]!;
    if (inBar === 0 || inBar === 4) {
      const chord = th.chords[Math.floor(bar / th.barsPerChord) % th.chords.length]!;
      midi = snapToClass(midi, th.root + center, chord.map((c) => ((c % 12) + 12) % 12));
    }

    // Hold length: mostly a beat-ish, sometimes long singing tones.
    const holdSlots = rng() < 0.22 ? 4 : rng() < 0.5 ? 2 : 1;
    const vel = (0.34 + rng() * 0.2) * (inBar % 4 === 0 ? 1.1 : 0.85) * velScale;
    const ev: NoteEvent = {
      t: s * slot + (rng() - 0.5) * 0.014, // human micro-timing
      midi,
      dur: slot * holdSlots * 1.9, // legato overhang into the release
      vel: Math.min(0.6, vel),
      voice: 'key',
    };
    events.push(ev);
    lastKeyEvent = ev;
    if (rng() < th.bell) {
      events.push({ t: ev.t + 0.012, midi: midi + 12, dur: ev.dur * 0.7, vel: ev.vel * 0.4, voice: 'bell' });
    }
    s += holdSlots - 1;
  }

  // Land home: the phrase's last word is always the tonic class.
  if (lastKeyEvent) {
    lastKeyEvent.midi = snapToClass(lastKeyEvent.midi, th.root + center, [0, 7]);
    lastKeyEvent.dur = Math.max(lastKeyEvent.dur, beat * 2.5);
  }

  const lengthSec = th.bars * barSec + 3;
  const gapSec = th.gapSec[0] + rng() * (th.gapSec[1] - th.gapSec[0]);
  return { events: events.sort((a, b) => a.t - b.t), lengthSec, gapSec };
}
