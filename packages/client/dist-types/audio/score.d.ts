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
export declare const CEILING_MIDI = 79;
/** And nothing useful lives below this. */
export declare const FLOOR_MIDI = 33;
/** SUB OWNERSHIP — pads may never voice below this; the bass alone owns the low lane. */
export declare const PAD_FLOOR_MIDI = 43;
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
    sections: {
        intro: number;
        body: number;
        color: number;
        reprise: number;
        outro: number;
    };
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
export declare const THEMES: Record<ZoneId, ThemeDef>;
export declare function midiHz(midi: number): number;
/**
 * Compose one piece. `intensity` 0..1 is how settled-in the listener
 * is (the performer grows it per zone): low intensity and night trim
 * whole sections; full day intensity earns the color section.
 * `avoidProg` is the progression the previous piece in this zone
 * used — the book never reads the same page twice in a row.
 */
export declare function generatePhrase(zone: ZoneId, night: boolean, intensity: number, rng: Rng, avoidProg?: number): Phrase;
export {};
//# sourceMappingURL=score.d.ts.map