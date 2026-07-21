/**
 * The music system — performs the pure score through soft WebAudio
 * voices. Three instruments, all built for warmth:
 *
 *  - KEY: the C418 voice — a sine with a whisper of octave shimmer
 *    through a low-pass, quick soft attack, long release. A felt
 *    piano heard from another room.
 *  - PAD: two barely-detuned saws behind a dark low-pass with a
 *    seconds-long attack — the chord is weather, not an instrument.
 *  - BELL: a small two-partial chime for sparkle (town) and echo
 *    pings (cave); the music bus reverb send does the rest.
 *
 * Orchestration laws:
 *  - One phrase at a time, then a LONG rest (the score's gapSec).
 *  - Zone changes commit on a ~1.6s-sustained dominant zone
 *    (hysteresis — doorway dithering must never stutter the music),
 *    fade the sounding phrase over ~3s, breathe, then open the new
 *    zone's theme. Arriving somewhere new should feel announced.
 *  - Every phrase plays into its own gain node; fades never touch
 *    the bus, so a new phrase is born at full level.
 */

import type { AudioEngine } from './engine.js';
import { generatePhrase, midiHz, type NoteEvent, type Phrase } from './score.js';
import { dominantZone, type ZoneId, type ZoneWeights } from './zones.js';

/** How far ahead of the clock notes are handed to WebAudio. */
const LOOKAHEAD_SEC = 2.2;

export class MusicSystem {
  /** The theme the music is committed to (readable for debugging). */
  zone: ZoneId = 'wild';
  state: 'resting' | 'playing' = 'resting';

  private phrase: Phrase | null = null;
  private phraseGain: GainNode | null = null;
  private phraseStart = 0;
  private phraseEnd = 0;
  private nextIdx = 0;
  private restUntil = 0;
  private candidate: ZoneId | null = null;
  private candidateSince = 0;
  private booted = false;

  constructor(private engine: AudioEngine) {}

  update(w: ZoneWeights, hours: number): void {
    const ctx = this.engine.ctx;
    if (!ctx || !this.engine.music) return;
    const t = ctx.currentTime;

    if (!this.booted) {
      // First moments in the world: let the scene settle, then sing.
      this.booted = true;
      this.zone = dominantZone(w);
      this.restUntil = t + 4 + Math.random() * 4;
    }

    // Zone commitment with hysteresis.
    const dom = dominantZone(w);
    if (dom !== this.zone) {
      if (this.candidate !== dom) {
        this.candidate = dom;
        this.candidateSince = t;
      } else if (t - this.candidateSince > 1.6) {
        this.switchTo(dom, t);
      }
    } else {
      this.candidate = null;
    }

    if (this.state === 'resting') {
      if (t >= this.restUntil) this.startPhrase(t, hours);
      return;
    }

    // Playing: hand due notes to WebAudio a couple of seconds early.
    const phrase = this.phrase;
    const out = this.phraseGain;
    if (phrase && out) {
      while (this.nextIdx < phrase.events.length) {
        const ev = phrase.events[this.nextIdx]!;
        const at = this.phraseStart + ev.t;
        if (at > t + LOOKAHEAD_SEC) break;
        this.playNote(ev, at, out);
        this.nextIdx++;
      }
    }
    if (t > this.phraseEnd) {
      this.state = 'resting';
      this.restUntil = t + (phrase?.gapSec ?? 20);
      this.phrase = null;
      this.phraseGain = null;
    }
  }

  private switchTo(zone: ZoneId, t: number): void {
    this.zone = zone;
    this.candidate = null;
    if (this.state === 'playing' && this.phraseGain) {
      // Let the old place finish its sentence quickly and bow out.
      this.phraseGain.gain.setTargetAtTime(0, t, 0.9);
      this.phrase = null;
      this.phraseGain = null;
      this.state = 'resting';
      this.restUntil = t + 6 + Math.random() * 5;
    } else {
      // Silent transit: the new place may speak a little sooner than
      // the old rest would have allowed — arrival deserves music.
      this.restUntil = Math.min(this.restUntil, t + 4 + Math.random() * 4);
    }
  }

  private startPhrase(t: number, hours: number): void {
    const ctx = this.engine.ctx;
    if (!ctx || !this.engine.music) return;
    const night = hours < 5.5 || hours > 20.5;
    const phrase = generatePhrase(this.zone, night, Math.random);
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.engine.music);
    this.phrase = phrase;
    this.phraseGain = gain;
    this.phraseStart = t + 0.2;
    this.phraseEnd = this.phraseStart + phrase.lengthSec;
    this.nextIdx = 0;
    this.state = 'playing';
  }

  private playNote(ev: NoteEvent, at: number, out: GainNode): void {
    const ctx = this.engine.ctx!;
    const f = midiHz(ev.midi);
    if (ev.voice === 'pad') {
      // Weather: detuned saw pair behind a dark low-pass, slow bloom.
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 620;
      lp.Q.value = 0.3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, ev.vel), at + 1.8);
      g.gain.setTargetAtTime(0, at + ev.dur, 1.5);
      lp.connect(g);
      g.connect(out);
      for (const cents of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(lp);
        o.start(at);
        o.stop(at + ev.dur + 7);
      }
      return;
    }
    if (ev.voice === 'bell') {
      const g = ctx.createGain();
      g.gain.setValueAtTime(ev.vel, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 1.4);
      g.connect(out);
      for (const [mult, amp] of [
        [1, 1],
        [3.01, 0.22],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mult;
        const og = ctx.createGain();
        og.gain.value = amp;
        o.connect(og);
        og.connect(g);
        o.start(at);
        o.stop(at + 1.6);
      }
      return;
    }
    // KEY. Fundamental + a whisper of octave, soft attack, long tail.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1900 + ev.vel * 1400;
    lp.Q.value = 0.2;
    const g = ctx.createGain();
    const hold = Math.min(ev.dur, 0.9);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, ev.vel), at + 0.014);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, ev.vel * 0.45), at + hold);
    g.gain.setTargetAtTime(0, at + ev.dur, 0.6);
    lp.connect(g);
    g.connect(out);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    o1.connect(lp);
    o1.start(at);
    o1.stop(at + ev.dur + 3);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2.001;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    o2.connect(g2);
    g2.connect(lp);
    o2.start(at);
    o2.stop(at + ev.dur + 3);
  }
}
