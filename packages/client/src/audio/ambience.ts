/**
 * The ambience system — the world's continuous voice. Where music is
 * an event, ambience is the room tone of being outdoors: it should
 * disappear from attention within a minute and leave a hole if muted.
 *
 * Layers, all crossfaded continuously by zone weight and clock:
 *  - WIND: leaf rustle — a soft HIGH band (~3.9kHz) that only sounds
 *    while a gust crests, riding the SAME wind field the grass and
 *    trees bend to (grass.ts windScalarAt), silent between gusts.
 *    Never a low-mid broadband bed (that reads as surf — user
 *    verdict), and never a second weather.
 *  - BIRDS (day, outdoors): sparse procedural songbird phrases —
 *    2-5 small warbles, panned somewhere in the trees, occasionally
 *    distant. Denser through the dawn chorus, gone by dusk.
 *  - CRICKETS (night, outdoors): two soft pulse-train voices, panned
 *    apart, low-passed well below "shrill" — the user's law: night
 *    sounds must soothe, never nag.
 *  - CAVE (underground): a barely-there low rumble plus echoing
 *    drips; the ambience bus reverb makes each drip a cavern.
 *  - TOWN: a distant smithy tink now and then by day — the sound of
 *    other lives being lived somewhere behind the houses.
 *
 * All scheduling is wall-clock ctx time; the per-frame update only
 * nudges gain targets (throttled to 10 Hz) and rolls dice for the
 * next one-shot. Nothing here allocates per frame.
 */

import type { AudioEngine } from './engine.js';
import { windScalarAt } from '../render/grass.js';
import { birdsK, cricketsK, type ZoneWeights } from './zones.js';

export class AmbienceSystem {
  private built = false;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private rumbleGain: GainNode | null = null;
  private cricketGains: GainNode[] = [];
  private cricketPan: StereoPannerNode[] = [];
  private lastParamAt = 0;
  private nextBirdAt = 0;
  private nextCricketAt: number[] = [0, 0];
  private nextDripAt = 0;
  private nextTownAt = 0;
  /** Debug mirrors for live verification. */
  gates = { wind: 0, birds: 0, crickets: 0, cave: 0 };

  constructor(private engine: AudioEngine) {}

  update(x: number, y: number, w: ZoneWeights, hours: number, tSec: number): void {
    const ctx = this.engine.ctx;
    const bus = this.engine.ambience;
    if (!ctx || !bus) return;
    if (!this.built) this.build(ctx, bus);
    const t = ctx.currentTime;

    const outdoor = 1 - w.cave;
    const day = birdsK(hours);
    const night = cricketsK(hours);

    // ---- steady beds: retarget at 10 Hz, glide over ~0.4s.
    if (t - this.lastParamAt > 0.1) {
      this.lastParamAt = t;
      // windScalarAt runs ~[-0.6, 1.4] (what the trees lean on) — remap
      // the full swell onto [0, 1] so lulls truly hush and gusts crest.
      const wind = Math.max(0, Math.min(1, (windScalarAt(x, y, tSec) + 0.3) / 1.55));
      // Squared gust curve: rustle exists ONLY while a gust crests —
      // between gusts the trees are silent, exactly like the grass is
      // still. No floor term, or the surf comes back.
      const windLevel = (w.wild * 1 + w.town * 0.5) * wind * wind * (0.6 + 0.4 * day) * 0.055;
      this.windGain!.gain.setTargetAtTime(windLevel, t, 0.4);
      // A cresting gust rustles slightly brighter — leaves, not a tone.
      this.windFilter!.frequency.setTargetAtTime(3600 + wind * 900, t, 0.5);
      this.rumbleGain!.gain.setTargetAtTime(w.cave * 0.1, t, 0.8);
      const cr = night * outdoor * 0.038;
      for (const g of this.cricketGains) g.gain.setTargetAtTime(cr, t, 0.6);
      this.gates = { wind: windLevel, birds: day * outdoor, crickets: night * outdoor, cave: w.cave };
    }

    // ---- one-shots.
    const birdGate = day * outdoor * (w.wild + w.town * 0.7);
    if (t >= this.nextBirdAt) {
      if (birdGate > 0.1) this.birdPhrase(ctx, bus, t, birdGate);
      // The dawn chorus crowds in; midday spreads out.
      const dawn = hours > 5.8 && hours < 8.5 ? 0.5 : 1;
      this.nextBirdAt = t + (3.5 + Math.random() * 9) * dawn;
    }
    const cricketGate = night * outdoor;
    for (let v = 0; v < 2; v++) {
      if (t >= this.nextCricketAt[v]!) {
        if (cricketGate > 0.05) this.cricketBurst(ctx, v, t);
        this.nextCricketAt[v] = t + 0.9 + Math.random() * (v === 0 ? 0.9 : 1.4);
      }
    }
    if (t >= this.nextDripAt) {
      if (w.cave > 0.5) this.drip(ctx, bus, t);
      this.nextDripAt = t + 2.5 + Math.random() * 7;
    }
    if (t >= this.nextTownAt) {
      if (w.town > 0.5 && day > 0.4) this.townTink(ctx, bus, t);
      this.nextTownAt = t + 16 + Math.random() * 18;
    }
  }

  // ---- persistent graph ------------------------------------------------

  private build(ctx: AudioContext, bus: GainNode): void {
    this.built = true;
    const loopNoise = (): AudioBufferSourceNode => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    };

    // Wind = LEAF RUSTLE, not air (user verdict: the old low-mid
    // broadband bed read as white noise / crashing waves — that recipe
    // IS surf). What a meadow gust actually sounds like is foliage: a
    // soft high band, present only while a gust crests, silent in the
    // lulls. The gain is driven on a squared gust curve in update().
    const wind = loopNoise();
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 3900;
    this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(bus);
    wind.start();

    // Cave rumble: the same noise idea, pressed under 150 Hz.
    const rumble = loopNoise();
    const rlp = ctx.createBiquadFilter();
    rlp.type = 'lowpass';
    rlp.frequency.value = 150;
    rlp.Q.value = 0.4;
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    rumble.connect(rlp);
    rlp.connect(this.rumbleGain);
    this.rumbleGain.connect(bus);
    rumble.start();

    // Two cricket carriers: gated sines, panned left and right of the
    // listener; bursts modulate per-voice gain on top of the night gate.
    for (const pan of [-0.55, 0.6]) {
      const g = ctx.createGain();
      g.gain.value = 0;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(bus);
      this.cricketGains.push(g);
      this.cricketPan.push(p);
    }
  }

  // ---- one-shot voices -------------------------------------------------

  /** A songbird phrase: 2-5 warbles from one spot in the canopy. */
  private birdPhrase(ctx: AudioContext, bus: GainNode, t: number, gate: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.8;
    // Some singers are far off: quieter, darker, more room.
    const distant = Math.random() < 0.35;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = distant ? 2400 : 4300;
    lp.connect(pan);
    pan.connect(bus);

    const base = 2300 + Math.random() * 1500;
    const vol = (distant ? 0.05 : 0.1) * (0.6 + 0.4 * gate);
    const chirps = 2 + Math.floor(Math.random() * 4);
    let at = t + 0.05;
    for (let i = 0; i < chirps; i++) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = ctx.createGain();
      o.connect(g);
      g.connect(lp);
      const f = base * (0.92 + Math.random() * 0.18);
      const kind = Math.random();
      const dur = 0.06 + Math.random() * 0.09;
      o.frequency.setValueAtTime(f, at);
      if (kind < 0.4) {
        o.frequency.exponentialRampToValueAtTime(f * 1.35, at + dur);
      } else if (kind < 0.7) {
        o.frequency.setValueAtTime(f * 1.3, at);
        o.frequency.exponentialRampToValueAtTime(f * 0.95, at + dur);
      } else {
        // Trill: a fast up-down-up flutter.
        const n = 3 + Math.floor(Math.random() * 3);
        for (let k = 0; k <= n; k++) {
          o.frequency.linearRampToValueAtTime(f * (k % 2 ? 1.22 : 1), at + (dur * k) / n);
        }
      }
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, at + dur + 0.03);
      o.start(at);
      o.stop(at + dur + 0.08);
      at += dur + 0.08 + Math.random() * 0.28;
    }
  }

  /** One cricket chirp: three tiny pulses. Soft by construction. */
  private cricketBurst(ctx: AudioContext, voice: number, t: number): void {
    const carrier = this.cricketGains[voice]!;
    const f = voice === 0 ? 3350 : 3650;
    for (let p = 0; p < 3; p++) {
      const at = t + p * 0.034;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.02);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(1, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.02);
      o.connect(g);
      g.connect(carrier);
      o.start(at);
      o.stop(at + 0.03);
    }
  }

  /** A single water drip somewhere off in the dark. */
  private drip(ctx: AudioContext, bus: GainNode, t: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.7;
    pan.connect(bus);
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f = 550 + Math.random() * 350;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g);
    g.connect(pan);
    o.start(t);
    o.stop(t + 0.12);
  }

  /** A far-off hammer on a far-off anvil: Bramblewick at work. */
  private townTink(ctx: AudioContext, bus: GainNode, t: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.connect(pan);
    pan.connect(bus);
    const hits = Math.random() < 0.5 ? 1 : 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < hits; i++) {
      const at = t + i * (0.42 + Math.random() * 0.08);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1150 + Math.random() * 120, at);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.032, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
      o.connect(g);
      g.connect(lp);
      o.start(at);
      o.stop(at + 0.26);
    }
  }
}
