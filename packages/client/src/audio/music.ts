/**
 * The music system — performs the pure score through warm WebAudio
 * voices. Every instrument here is built AGAINST sharpness: soft
 * attacks, dark filters, and low registers, with the shared room
 * (music bus reverb send) doing the space.
 *
 *  - KEY: the C418 voice — a detuned unison sine pair with a slow
 *    tape-like pitch wobble (the "wow"), a 45ms attack (never a
 *    click), and a dark low-pass. A felt piano from another room.
 *  - PAD: two barely-detuned TRIANGLES (saws were the droning
 *    culprit) panned wide behind a very dark filter with a
 *    seconds-long bloom. SUB OWNERSHIP: the pad has NO sub
 *    oscillator and is high-passed — its old octave-down sine was
 *    what piled onto the bass and blew out the low end.
 *  - BASS: a soft sine root with a whisper of octave harmonic — the
 *    only voice allowed below ~100 Hz.
 *  - HARP: a dark triangle pluck for the town's low broken chords.
 *  - FLUTE: a sine with delayed vibrato — a far hilltop call.
 *  - BELL: cave echo pings only (the score bans bells elsewhere) —
 *    slow-attacked, dark, and quiet. A glow, never a chime.
 *
 * The mix: voices sit in a stereo field (harp right, flute left,
 * bells drifting, keys and bass center, pads wide) and the whole
 * music path passes a gentle peaking cut around 250 Hz — the mud
 * shelf where pads and bass used to stack — before the bus.
 *
 * Orchestration laws:
 *  - One piece (~2 min of sections, see score.ts THE LONG FORM),
 *    then a LONG rest (the score's gapSec).
 *  - THE PROGRESSION BOOK: the performer remembers each zone's last
 *    progression and asks the score to avoid it — no two consecutive
 *    pieces in a zone read the same page.
 *  - THE SLOW BLOOM: `zonePlays` counts phrases performed per zone
 *    this session; intensity = min(1, plays/3) feeds the score, so a
 *    zone's music starts nearly empty and finds its voice as you
 *    stay. Leaving and returning keeps what it learned.
 *  - Zone changes commit on a ~1.6s-sustained dominant zone
 *    (doorway dithering must never stutter the music), fade the
 *    sounding phrase over ~3s, breathe, then open the new theme.
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
  /** Phrases performed per zone — drives the slow bloom. */
  zonePlays: Record<ZoneId, number> = { town: 0, wild: 0, cave: 0 };
  /** The progression each zone last played — never repeated back-to-back. */
  lastProg: Record<ZoneId, number> = { town: -1, wild: -1, cave: -1 };

  private mixIn: GainNode | null = null;
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
    // THE SLOW BLOOM: intensity grows with phrases heard in this zone.
    const intensity = Math.min(1, this.zonePlays[this.zone] / 3);
    this.zonePlays[this.zone]++;
    const phrase = generatePhrase(this.zone, night, intensity, Math.random, this.lastProg[this.zone]);
    this.lastProg[this.zone] = phrase.prog;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.mixBus(ctx));
    this.phrase = phrase;
    this.phraseGain = gain;
    this.phraseStart = t + 0.2;
    this.phraseEnd = this.phraseStart + phrase.lengthSec;
    this.nextIdx = 0;
    this.state = 'playing';
  }

  /**
   * All phrases pass one shared mastering touch before the bus: a
   * gentle peaking cut at the 250 Hz mud shelf, where the old pad
   * subs used to stack against the bass and thicken everything.
   */
  private mixBus(ctx: AudioContext): GainNode {
    if (this.mixIn) return this.mixIn;
    const g = ctx.createGain();
    g.gain.value = 0.62; // headroom trim — pieces are denser than phrases were
    const mud = ctx.createBiquadFilter();
    mud.type = 'peaking';
    mud.frequency.value = 250;
    mud.Q.value = 0.9;
    mud.gain.value = -3;
    g.connect(mud);
    mud.connect(this.engine.music!);
    this.mixIn = g;
    return g;
  }

  /** A slow pitch wobble — the tape "wow" that makes keys feel old. */
  private wow(ctx: AudioContext, at: number, until: number, cents: number, ...targets: AudioParam[]): void {
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5 + Math.random() * 0.5;
    const depth = ctx.createGain();
    depth.gain.value = cents;
    lfo.connect(depth);
    for (const p of targets) depth.connect(p);
    lfo.start(at);
    lfo.stop(until);
  }

  private playNote(ev: NoteEvent, at: number, out: GainNode): void {
    const ctx = this.engine.ctx!;
    const f = midiHz(ev.midi);
    switch (ev.voice) {
      case 'pad': {
        // Weather: two panned triangles behind a very dark filter.
        // SUB OWNERSHIP: no sub oscillator, and a high-pass keeps the
        // pad out of the bass lane entirely — the old octave-down
        // sine was what piled up and blew out the low end.
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 115;
        hp.Q.value = 0.3;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 520;
        lp.Q.value = 0.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, ev.vel), at + 2.2);
        g.gain.setTargetAtTime(0, at + ev.dur, 1.8);
        hp.connect(lp);
        lp.connect(g);
        g.connect(out);
        const stop = at + ev.dur + 8;
        for (const [cents, pan] of [
          [-4, -0.35],
          [4, 0.35],
        ] as const) {
          const o = ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = f;
          o.detune.value = cents;
          const p = ctx.createStereoPanner();
          p.pan.value = pan;
          o.connect(p);
          p.connect(hp);
          o.start(at);
          o.stop(stop);
        }
        return;
      }
      case 'bass': {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(ev.vel, at + 0.08);
        g.gain.setTargetAtTime(ev.vel * 0.6, at + 0.4, 0.8);
        g.gain.setTargetAtTime(0, at + ev.dur, 0.7);
        g.connect(out);
        // A whisper of octave harmonic gives the low root definition
        // on small speakers without adding any boom.
        for (const [mult, amp] of [
          [1, 1],
          [2, 0.12],
        ] as const) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f * mult;
          const og = ctx.createGain();
          og.gain.value = amp;
          o.connect(og);
          og.connect(g);
          o.start(at);
          o.stop(at + ev.dur + 3);
        }
        return;
      }
      case 'harp': {
        // A dark pluck: fast-but-soft attack, quick warm decay.
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2200;
        lp.Q.value = 0.3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(ev.vel, at + 0.008);
        g.gain.setTargetAtTime(0, at + 0.03, 0.35);
        lp.connect(g);
        const pan = ctx.createStereoPanner();
        pan.pan.value = 0.28; // the harp sits to the listener's right
        g.connect(pan);
        pan.connect(out);
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.connect(lp);
        o.start(at);
        o.stop(at + 2);
        return;
      }
      case 'flute': {
        // A far call: sine with vibrato that arrives late, like breath.
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const vib = ctx.createOscillator();
        vib.type = 'sine';
        vib.frequency.value = 4.6;
        const vibG = ctx.createGain();
        vibG.gain.setValueAtTime(0, at);
        vibG.gain.linearRampToValueAtTime(6, at + 0.6); // cents
        vib.connect(vibG);
        vibG.connect(o.detune);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(ev.vel, at + 0.18);
        g.gain.setTargetAtTime(ev.vel * 0.8, at + 0.3, 0.5);
        g.gain.setTargetAtTime(0, at + ev.dur, 0.4);
        o.connect(g);
        const pan = ctx.createStereoPanner();
        pan.pan.value = -0.35; // the flute calls from the far left hill
        g.connect(pan);
        pan.connect(out);
        const stop = at + ev.dur + 2;
        o.start(at);
        o.stop(stop);
        vib.start(at);
        vib.stop(stop);
        return;
      }
      case 'bell': {
        // The cave's echo ping — a GLOW, not a chime: slow attack,
        // long dark decay, barely any upper partial. The old 10ms
        // ping with a hot octave was one of the tonal blowouts.
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2100;
        lp.Q.value = 0.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(ev.vel, at + 0.04);
        g.gain.setTargetAtTime(0, at + 0.1, 0.8);
        lp.connect(g);
        const pan = ctx.createStereoPanner();
        pan.pan.value = 0.18;
        g.connect(pan);
        pan.connect(out);
        for (const [mult, amp] of [
          [1, 1],
          [2, 0.07],
        ] as const) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f * mult;
          const og = ctx.createGain();
          og.gain.value = amp;
          o.connect(og);
          og.connect(lp);
          o.start(at);
          o.stop(at + 3.5);
        }
        return;
      }
      default: {
        // KEY: detuned unison pair + wow, soft attack, dark filter.
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1300 + ev.vel * 900;
        lp.Q.value = 0.2;
        const g = ctx.createGain();
        const hold = Math.min(ev.dur, 1.1);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(ev.vel, at + 0.045);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, ev.vel * 0.4), at + hold);
        g.gain.setTargetAtTime(0, at + ev.dur, 0.7);
        lp.connect(g);
        g.connect(out);
        const stop = at + ev.dur + 3.5;
        const pair: AudioParam[] = [];
        for (const cents of [-3.5, 3.5]) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          o.detune.value = cents;
          o.connect(lp);
          o.start(at);
          o.stop(stop);
          pair.push(o.detune);
        }
        this.wow(ctx, at, stop, 3, ...pair);
        return;
      }
    }
  }
}
