/**
 * The score — pure generative composition, no WebAudio anywhere.
 * music.ts turns these note events into sound; this module only
 * decides WHAT to play, from an injected rng, so tests can pin the
 * musical laws exactly.
 *
 * The mood brief (user, three passes now): C418's Minecraft ambience
 * — Subwoofer Lullaby above all — crossed with fantasy-tavern warmth.
 * Round three's complaints: big tonal hits blowing out the bass,
 * layers stacking too heavy, and phrases short enough that the loop
 * shows. The laws that carry the fix:
 *
 *  - THE LONG FORM: a piece is no longer one short phrase. It is a
 *    plan of sections — intro / body / color / reprise / outro —
 *    running ~100–130 seconds, each section with its own dynamic arc
 *    (the swell), thinning back down before it ends. Low intensity
 *    and night trim sections rather than just dropping notes.
 *  - THE MOTIF LAW: each piece invents ONE small motif (a handful of
 *    scale degrees with a rhythm) and then develops it — repeated,
 *    transposed, tail-varied, inverted, augmented in the reprise —
 *    so the piece coheres without ever literally repeating. This is
 *    how a loop hides.
 *  - THE PROGRESSION BOOK: every zone owns three progressions (its
 *    moods), one chosen per piece and never the same twice in a row.
 *    maj7 / add9 colors carry the Subwoofer-Lullaby warmth.
 *  - SUB OWNERSHIP: only the bass voice lives in the low lane. Pads
 *    are floored at PAD_FLOOR_MIDI and drop their fifth rather than
 *    cross into the melody's octave. (music.ts enforces the other
 *    half: the pad synth has no sub oscillator and is high-passed.)
 *  - ONE COLOR LAW: a piece carries at most ONE color voice — the
 *    town's harp, the wild's flute, the cave's echo bells — and only
 *    in its color section. Bells exist nowhere else; the "chimes"
 *    that blew out the mix are gone.
 *  - Retained from earlier passes: THE REGISTER CEILING (nothing
 *    above G5), THE SEPARATION LAW (pads always below the melody by
 *    day), THE SLOW BLOOM (intensity earns sections), PENTATONIC
 *    MELODY (no wrong notes possible), SILENCE IS A SECTION (long
 *    rests between pieces), LAND HOME (the last word resolves).
 */

import type { ZoneId } from './zones.js';

export type Rng = () => number;

export type Voice = 'key' | 'pad' | 'bass' | 'harp' | 'flute' | 'bell';

export interface NoteEvent {
  /** Seconds from piece start. */
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
  /** Seconds from piece start to the last release tail. */
  lengthSec: number;
  /** Silence to hold after this piece before the next. */
  gapSec: number;
  /** Which progression from the zone's book this piece chose. */
  prog: number;
}

/** THE REGISTER CEILING — no event may sound above this. */
export const CEILING_MIDI = 79; // G5
/** And nothing useful lives below this. */
export const FLOOR_MIDI = 33; // A1
/** SUB OWNERSHIP — pads may never voice below this; the bass alone owns the low lane. */
export const PAD_FLOOR_MIDI = 43; // ~98 Hz

interface ThemeDef {
  /** Midi root of the key. */
  root: number;
  /** Melody scale, semitones from root within one octave. */
  scale: number[];
  /** THE PROGRESSION BOOK — each chord = semitone offsets from root; [0] is its bass class. */
  progressions: number[][][];
  barsPerChord: number;
  /** Base quarter-note bpm; each piece breathes ±6%. */
  tempo: number;
  /** THE LONG FORM — bars per section. */
  sections: { intro: number; body: number; color: number; reprise: number; outro: number };
  /** Chance a motif note survives realization (day). */
  keep: number;
  /** ONE COLOR LAW — the single color voice this zone may bloom. */
  color: 'harp' | 'flute' | 'bell' | null;
  gapSec: [number, number];
}

/**
 * Three zone characters. Town is the tavern hearth — maj7 warmth and
 * a low harp; the wild is Subwoofer-Lullaby sky — add9 chords and a
 * far flute; the cave is bare fifths into darkness with echo pings.
 */
export const THEMES: Record<ZoneId, ThemeDef> = {
  town: {
    root: 55, // G3
    scale: [0, 2, 4, 7, 9], // major pentatonic
    progressions: [
      // hearth — plain and homely
      [
        [0, 4, 7],
        [-3, 0, 4],
        [5, 9, 12],
        [0, 4, 7],
      ],
      // tavern — the maj7 glow
      [
        [0, 4, 7, 11],
        [5, 9, 12, 16],
        [7, 11, 14],
        [0, 4, 7],
      ],
      // evening — starts away from home, longing
      [
        [-3, 0, 4],
        [5, 9, 12],
        [0, 4, 7],
        [7, 11, 14],
      ],
    ],
    barsPerChord: 1,
    tempo: 64,
    sections: { intro: 4, body: 8, color: 8, reprise: 8, outro: 4 },
    keep: 0.85,
    color: 'harp',
    gapSec: [24, 46],
  },
  wild: {
    root: 57, // A3
    scale: [0, 2, 4, 7, 9],
    progressions: [
      // sky — the open add9s
      [
        [0, 4, 7, 14],
        [5, 9, 12, 16],
        [-3, 0, 4, 11],
        [7, 11, 14, 17],
      ],
      // lullaby — maj7 home, barely leaving
      [
        [0, 4, 7, 11],
        [5, 9, 12, 16],
        [-3, 0, 4],
        [5, 9, 12],
      ],
      // dawn — the old warm circle
      [
        [0, 4, 7],
        [7, 11, 14],
        [-3, 0, 4],
        [5, 9, 12],
      ],
    ],
    barsPerChord: 2,
    tempo: 54,
    sections: { intro: 4, body: 6, color: 6, reprise: 6, outro: 4 },
    keep: 0.72,
    color: 'flute',
    gapSec: [30, 60],
  },
  cave: {
    root: 45, // A2
    scale: [0, 3, 5, 7, 10], // minor pentatonic
    progressions: [
      // deep
      [
        [0, 7, 12],
        [-2, 5, 10],
        [0, 7, 12],
        [3, 10, 15],
      ],
      // hollow
      [
        [0, 7, 12],
        [3, 10, 15],
        [-2, 5, 10],
        [0, 7, 12],
      ],
      // still — barely moves at all
      [
        [0, 7, 12],
        [0, 7, 12],
        [-2, 5, 10],
        [3, 10, 15],
      ],
    ],
    barsPerChord: 2,
    tempo: 46,
    sections: { intro: 2, body: 6, color: 6, reprise: 4, outro: 2 },
    keep: 0.6,
    color: 'bell',
    gapSec: [32, 70],
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

/** Rhythm cells in eighth-note slots; each sums to 12 of a 16-slot
 * (2-bar) cell, leaving a breath at the end. */
const RHYTHMS: number[][] = [
  [4, 2, 2, 4],
  [2, 2, 4, 4],
  [2, 4, 2, 4],
  [6, 2, 4],
  [2, 2, 2, 2, 4],
  [4, 4, 4],
];

type SectionKind = 'intro' | 'body' | 'color' | 'reprise' | 'outro';

interface Section {
  kind: SectionKind;
  /** Absolute starting bar. */
  bar: number;
  bars: number;
  /** The swell — a section-level velocity multiplier. */
  arc: number;
}

/**
 * Compose one piece. `intensity` 0..1 is how settled-in the listener
 * is (the performer grows it per zone): low intensity and night trim
 * whole sections; full day intensity earns the color section.
 * `avoidProg` is the progression the previous piece in this zone
 * used — the book never reads the same page twice in a row.
 */
export function generatePhrase(
  zone: ZoneId,
  night: boolean,
  intensity: number,
  rng: Rng,
  avoidProg = -1,
): Phrase {
  const th = THEMES[zone];

  // ---- The page from the progression book, and this piece's breath.
  let prog = Math.floor(rng() * th.progressions.length);
  if (th.progressions.length > 1 && prog === avoidProg) prog = (prog + 1) % th.progressions.length;
  const chords = th.progressions[prog]!;
  const tempo = th.tempo * (0.94 + rng() * 0.12);
  const beat = 60 / tempo;
  const slot = beat / 2; // eighth-note grid
  const barSec = beat * 4;

  // Night sinks the register an octave — except underground, where
  // there is no sky and the register is already as deep as it goes
  // (dropping further would land the melody on the pad floor).
  const drop = night && zone !== 'cave' ? -12 : 0;
  const velScale = night ? 0.7 : 1;
  const melodyBase = th.root + 12 + drop; // one octave over the root
  const keepP = th.keep * (night ? 0.72 : 1);
  const chordAt = (bar: number): number[] =>
    chords[Math.floor(bar / th.barsPerChord) % chords.length]!;

  // ---- THE LONG FORM: assemble the section plan.
  const S = th.sections;
  const full = !night && intensity >= 0.55;
  const plan: Section[] = [];
  let barCursor = 0;
  const addSec = (kind: SectionKind, bars: number, arc: number): void => {
    plan.push({ kind, bar: barCursor, bars, arc });
    barCursor += bars;
  };
  addSec('intro', S.intro, 0.8);
  addSec('body', S.body, 0.95);
  if (full) addSec('color', S.color, 1);
  if (full || intensity >= 0.3) addSec('reprise', S.reprise, 0.8);
  addSec('outro', S.outro, 0.65);
  const totalBars = barCursor;

  const events: NoteEvent[] = [];

  // ---- The ground floor: bass and pads, present through every
  // section, shaped by each section's arc. The outro always sits on
  // the home chord — the piece lands harmonically too.
  for (const sec of plan) {
    for (let b = 0; b < sec.bars; b += th.barsPerChord) {
      const abs = sec.bar + b;
      const chord = sec.kind === 'outro' ? chords[0]! : chordAt(abs);
      const span = barSec * th.barsPerChord;
      const t0 = abs * barSec;
      // One low root per chord change — the bass alone owns the deep.
      let bassMidi = th.root - 12 + chord[0]!;
      while (bassMidi < FLOOR_MIDI) bassMidi += 12;
      events.push({
        t: t0 + rng() * 0.04,
        midi: bassMidi,
        dur: span * 0.94,
        vel: 0.1 * sec.arc * velScale,
        voice: 'bass',
      });
      // Pads: root class + fifth, floored out of the bass lane; the
      // fifth is DROPPED rather than allowed to cross the melody.
      const c0 = chord[0]! >= 5 ? chord[0]! - 12 : chord[0]!;
      let padLow = th.root + c0 + drop;
      while (padLow < PAD_FLOOR_MIDI) padLow += 12;
      const offs = padLow + 7 < melodyBase ? [0, 7] : [0];
      for (const off of offs) {
        events.push({
          t: t0 + rng() * 0.06,
          midi: padLow + off,
          dur: sec.kind === 'outro' ? span * 1.25 : span * 1.02,
          vel: (0.085 + rng() * 0.02) * sec.arc * velScale,
          voice: 'pad',
        });
      }
    }
  }

  // ---- THE MOTIF LAW: invent the piece's one idea.
  const ladder: number[] = [...th.scale, 12];
  const clampDeg = (d: number): number => Math.max(0, Math.min(ladder.length - 1, d));
  const rhythm = RHYTHMS[Math.floor(rng() * RHYTHMS.length)]!;
  const motif: number[] = [];
  let deg = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < rhythm.length; i++) {
    motif.push(deg);
    const r = rng();
    const step = r < 0.15 ? 2 : r < 0.6 ? 1 : 0;
    deg = clampDeg(deg + (rng() < 0.5 ? -1 : 1) * step);
  }

  let lastKeyEvent: NoteEvent | null = null;

  /** Realize one melodic cell of the motif at an absolute bar. */
  const realizeCell = (
    cellBar: number,
    degs: number[],
    durs: number[],
    arc: number,
    kp: number,
  ): void => {
    let pos = 0;
    let first = true;
    for (let i = 0; i < degs.length; i++) {
      const durSlots = durs[i]!;
      const tSlot = cellBar * 8 + pos;
      pos += durSlots;
      // The cell's opening note anchors it — it survives more often.
      if (rng() > (first ? Math.min(1, kp + 0.25) : kp)) continue;
      let midi = melodyBase + ladder[clampDeg(degs[i]!)]!;
      if (first) {
        const bar = Math.floor(tSlot / 8);
        const cls = chordAt(bar).map((c) => ((c % 12) + 12) % 12);
        midi = snapToClass(midi, melodyBase, cls);
      }
      // The lane law: the snap may not pull the melody down into the
      // pads' octave, nor over the ceiling.
      if (midi < melodyBase) midi += 12;
      if (midi > CEILING_MIDI) midi -= 12;
      const vel = Math.min(
        0.34,
        (0.19 + rng() * 0.08) * (first ? 1.1 : 0.86) * arc * velScale,
      );
      const ev: NoteEvent = {
        t: tSlot * slot + (rng() - 0.5) * 0.014, // human micro-timing
        midi,
        dur: durSlots * slot * 1.9, // let tones ring past their slot
        vel,
        voice: 'key',
      };
      events.push(ev);
      lastKeyEvent = ev;
      first = false;
    }
  };

  /** Develop the motif: pick a variation for one cell. */
  const developCell = (isFirst: boolean): { degs: number[]; durs: number[] } | null => {
    if (isFirst) return { degs: motif, durs: rhythm };
    const r = rng();
    if (r < 0.2) return { degs: motif, durs: rhythm };
    if (r < 0.5) {
      // Transposed within the scale.
      const r2 = rng();
      const k = r2 < 0.4 ? -1 : r2 < 0.8 ? 1 : 2;
      return { degs: motif.map((d) => d + k), durs: rhythm };
    }
    if (r < 0.75) {
      // Tail-varied: the idea, but it ends somewhere new.
      const degs = [...motif];
      for (let i = Math.max(1, degs.length - 2); i < degs.length; i++) {
        degs[i] = clampDeg(degs[i]! + (rng() < 0.5 ? -1 : 1));
      }
      return { degs, durs: rhythm };
    }
    if (r < 0.85) {
      // Inverted around its first note.
      return { degs: motif.map((d) => motif[0]! * 2 - d), durs: rhythm };
    }
    return null; // a cell of rest — breath is part of the melody
  };

  for (const sec of plan) {
    if (sec.kind === 'body' || sec.kind === 'color') {
      // 2-bar cells, each a development of the motif. In the color
      // section the melody thins a little — the color voice speaks.
      const kp = keepP * (sec.kind === 'color' ? 0.85 : 1);
      for (let c = 0; c < Math.floor(sec.bars / 2); c++) {
        const cell = developCell(sec.kind === 'body' && c === 0);
        if (!cell) continue;
        realizeCell(sec.bar + c * 2, cell.degs, cell.durs, sec.arc, kp);
      }
    } else if (sec.kind === 'reprise') {
      // The reprise augments: the motif at half speed over 4-bar
      // cells, sparser — the idea remembered, not restated.
      for (let c = 0; c < Math.floor(sec.bars / 4); c++) {
        const cell = developCell(false) ?? { degs: motif, durs: rhythm };
        realizeCell(
          sec.bar + c * 4,
          cell.degs,
          cell.durs.map((d) => d * 2),
          sec.arc,
          keepP * 0.8,
        );
      }
    }
  }

  // ---- ONE COLOR LAW: the zone's single color voice, only in the
  // color section (which only a full day plan contains).
  const colorSec = plan.find((s) => s.kind === 'color');
  if (colorSec && th.color === 'harp') {
    // The tavern harp: low broken chords UNDER the melody's octave,
    // rolled gently — accompaniment, never competition.
    for (let b = 0; b < colorSec.bars; b += 2) {
      if (rng() < 0.45) continue;
      const abs = colorSec.bar + b;
      const chord = chordAt(abs);
      const t0 = abs * barSec + (rng() < 0.5 ? 0 : beat * 2);
      // Three tones only — the roll stays under the melody's octave.
      const tones = [...chord].sort((x, y) => x - y).slice(0, 3);
      let prevM = 0;
      tones.forEach((c, i) => {
        let m = th.root + c;
        while (m <= prevM) m += 12;
        while (m > CEILING_MIDI - 3) m -= 12;
        prevM = m;
        events.push({
          t: t0 + i * slot * 0.66 + (rng() - 0.5) * 0.01,
          midi: m,
          dur: slot * 2.5,
          vel: (0.09 + rng() * 0.03) * velScale,
          voice: 'harp',
        });
      });
    }
  }
  if (colorSec && th.color === 'flute') {
    // The wild's far flute: one or two slow calls, long scale tones.
    const calls = 1 + (rng() < 0.4 ? 1 : 0);
    for (let c = 0; c < calls; c++) {
      const bar = colorSec.bar + Math.floor(rng() * Math.max(1, colorSec.bars - 2));
      let t0 = bar * barSec + (rng() < 0.5 ? 0 : beat);
      const notes = 2 + Math.floor(rng() * 2);
      let d = 2 + Math.floor(rng() * 3);
      for (let n = 0; n < notes; n++) {
        d = Math.max(0, Math.min(th.scale.length - 1, d + (rng() < 0.5 ? -1 : 1)));
        let m = th.root + 12 + th.scale[d]!;
        if (m > CEILING_MIDI - 3) m -= 12;
        const dur = beat * (1.5 + rng() * 1.5);
        events.push({ t: t0, midi: m, dur, vel: 0.1 * velScale, voice: 'flute' });
        t0 += dur + beat * 0.5 * rng();
      }
    }
  }
  if (colorSec && th.color === 'bell') {
    // The cave's echo pings — soft, sparse, low, and NOWHERE else in
    // any zone does a bell exist any more.
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const bar = colorSec.bar + rng() * colorSec.bars;
      const d = rng() < 0.55 ? (rng() < 0.5 ? 0 : 3) : Math.floor(rng() * th.scale.length);
      const m = th.root + 12 + th.scale[Math.min(d, th.scale.length - 1)]!;
      events.push({
        t: Math.floor(bar * 4) * beat,
        midi: m,
        dur: 2.5,
        vel: (0.055 + rng() * 0.02) * velScale,
        voice: 'bell',
      });
    }
  }

  // Land home: the piece's last word is always the tonic class, held.
  if (lastKeyEvent !== null) {
    const ev: NoteEvent = lastKeyEvent;
    ev.midi = snapToClass(ev.midi, melodyBase, [0, 7]);
    ev.dur = Math.max(ev.dur, beat * 3);
  }

  const lengthSec = totalBars * barSec + 4;
  const gapSec = th.gapSec[0] + rng() * (th.gapSec[1] - th.gapSec[0]);
  return { events: events.sort((a, b) => a.t - b.t), lengthSec, gapSec, prog };
}
