/**
 * The ambience system — the world's continuous voice. Where music is
 * an event, ambience is the room tone of being outdoors: it should
 * disappear from attention within a minute and leave a hole if muted.
 *
 * Layers, all crossfaded continuously by zone weight and clock:
 *  - LEAF RUSTLE (the "wind"): a GRANULAR texture — a pre-rendered
 *    stereo loop of hundreds of overlapping micro-grains (each a
 *    15-80ms flutter), so the sound flickers like foliage instead of
 *    washing like water. Gated by the squared gust curve of the SAME
 *    wind field the grass and trees bend to; silent between gusts.
 *    THE BAN (two user rejections): NO continuous filtered-noise bed
 *    may ever play, in any band — a smooth gain envelope on noise
 *    reads as waves crashing, full stop. Granular or nothing.
 *    (One sanctioned exception: the FALLING WATER voice below, which
 *    IS water — the very reading the ban protects against is that
 *    voice's whole job. It stays gated by true SPILL-LAW earshot and
 *    granular inside; the ban holds everywhere else, unchanged.)
 *  - BIRDS (day, outdoors): sparse procedural songbird phrases —
 *    2-5 small warbles, panned somewhere in the trees, occasionally
 *    distant. Denser through the dawn chorus, gone by dusk.
 *  - MOURNING DOVE (day, outdoors): the soft low coo-ah-ooo of the
 *    North American morning, a few times a minute at most.
 *  - WOODPECKER (day, wild): a distant drum roll on a far snag,
 *    rare enough to be an event.
 *  - CRICKETS (night, outdoors): two soft pulse-train voices, panned
 *    apart, low-passed well below "shrill" — the user's law: night
 *    sounds must soothe, never nag.
 *  - CAVE (underground): a barely-there low rumble plus echoing
 *    drips; the ambience bus reverb makes each drip a cavern.
 *  - TOWN: a distant smithy tink now and then by day — the sound of
 *    other lives being lived somewhere behind the houses.
 *  - FALLING WATER (near a waterfall): a calm pink-noise roil in two
 *    legs — a body whose lowpass opens as the listener approaches
 *    (distance darkens a fall long before it silences it) and a low
 *    rumble that swells under tall stacked drops — seated in stereo
 *    toward the fall. Fed by audio/falls.ts, which asks THE SPILL LAW
 *    itself where curtains hang, so it is silent everywhere the
 *    renderer draws no fall. Never a wash: the loop's roil grains
 *    tumble inside it, and the earshot gate keeps it a soft far hush
 *    that only finds its voice at the plunge pool.
 *  - RIFTGATE (near a portal): a low beating drone — detuned sine
 *    pairs, a slow-wobbling harmonic, a hollow whistle riding on top
 *    — that swells as the listener approaches (closeness², so it
 *    arrives late and lands hard), plus eerie one-shot moods: warped
 *    whines glissing up or down and the occasional deep womp, exactly
 *    the "distant otherworld" register of a Minecraft portal. All
 *    oscillators — the noise-bed ban holds here too.
 *
 * All scheduling is wall-clock ctx time; the per-frame update only
 * nudges gain targets (throttled to 10 Hz) and rolls dice for the
 * next one-shot. Nothing here allocates per frame.
 */

import type { AudioEngine } from './engine.js';
import { windScalarAt } from '../render/grass.js';
import { birdsK, cricketsK, type ZoneWeights } from './zones.js';
import { SILENT_EAR, type FallEar } from './falls.js';

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
  private nextDoveAt = 0;
  private nextPeckAt = 0;
  private portalGain: GainNode | null = null;
  private nextPortalMoodAt = 0;
  private fallBody: GainNode | null = null;
  private fallRumble: GainNode | null = null;
  private fallLp: BiquadFilterNode | null = null;
  private fallPan: StereoPannerNode | null = null;
  /** Debug mirrors for live verification. */
  gates = { wind: 0, birds: 0, crickets: 0, cave: 0, portal: 0, fall: 0 };

  constructor(private engine: AudioEngine) {}

  /**
   * `portalNear` is 0..1 closeness to the nearest Riftgate (0 beyond
   * hearing range) — main.ts scans for it on a throttle and feeds it
   * through here. `fall` is the fall-earshot scan's verdict on the
   * falling water around the listener (audio/falls.ts), same cadence.
   */
  update(
    x: number,
    y: number,
    w: ZoneWeights,
    hours: number,
    tSec: number,
    portalNear = 0,
    fall: FallEar = SILENT_EAR,
  ): void {
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
      // Squared gust curve: the leaf-grain loop sounds ONLY while a
      // gust crests — between gusts the trees are silent, exactly
      // like the grass is still. No floor term, ever.
      const windLevel = (w.wild * 1 + w.town * 0.5) * wind * wind * (0.6 + 0.4 * day) * 0.06;
      this.windGain!.gain.setTargetAtTime(windLevel, t, 0.4);
      // A cresting gust flutters slightly brighter — leaves, not a tone.
      this.windFilter!.frequency.setTargetAtTime(4000 + wind * 700, t, 0.5);
      this.rumbleGain!.gain.setTargetAtTime(w.cave * 0.1, t, 0.8);
      const cr = night * outdoor * 0.038;
      for (const g of this.cricketGains) g.gain.setTargetAtTime(cr, t, 0.6);
      // The Riftgate drone: closeness² so it fades in late and swells
      // hard at the threshold — you HEAR when you've entered its yard.
      const pg = portalNear * portalNear * 0.1;
      this.portalGain!.gain.setTargetAtTime(pg, t, 0.5);
      // The fall voice: a steep closeness curve keeps it a far hush
      // until you're genuinely near; the body's lowpass opens on
      // approach (a distant fall is dark before it is quiet); heft
      // leans tall drops onto the rumble leg. Long glides — water
      // never jumps.
      const fn = fall.near;
      const fBody = Math.pow(fn, 1.4) * 0.075;
      const fRumble = Math.pow(fn, 1.8) * 0.055 * (0.35 + 0.65 * fall.heft);
      this.fallBody!.gain.setTargetAtTime(fBody, t, 0.5);
      this.fallRumble!.gain.setTargetAtTime(fRumble, t, 0.5);
      this.fallLp!.frequency.setTargetAtTime(600 + 2200 * fn, t, 0.5);
      this.fallPan!.pan.setTargetAtTime(fall.pan, t, 0.7);
      this.gates = {
        wind: windLevel,
        birds: day * outdoor,
        crickets: night * outdoor,
        cave: w.cave,
        portal: pg,
        fall: fBody + fRumble,
      };
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
    if (t >= this.nextDoveAt) {
      if (day * outdoor * (w.wild + w.town * 0.6) > 0.25) this.dove(ctx, bus, t);
      this.nextDoveAt = t + 24 + Math.random() * 26;
    }
    if (t >= this.nextPeckAt) {
      if (day * outdoor * w.wild > 0.3) this.woodpecker(ctx, bus, t);
      this.nextPeckAt = t + 35 + Math.random() * 45;
    }
    if (t >= this.nextPortalMoodAt) {
      if (portalNear > 0.2) this.portalMood(ctx, bus, t, portalNear);
      this.nextPortalMoodAt = t + 2.8 + Math.random() * 5;
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

    // LEAF RUSTLE — granular, never a noise bed. Smooth noise with a
    // gain envelope IS the sound of surf, whatever band it sits in
    // (two user rejections). Foliage flickers: hundreds of tiny
    // flutter-grains, decorrelated left/right, looping seamlessly.
    // The gain is driven on a squared gust curve in update().
    const rustle = ctx.createBufferSource();
    rustle.buffer = this.makeRustleBuffer(ctx);
    rustle.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 4300;
    this.windFilter.Q.value = 0.45;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    rustle.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(bus);
    rustle.start();

    // The dove and the woodpecker wait a polite while after login.
    this.nextDoveAt = ctx.currentTime + 12 + Math.random() * 20;
    this.nextPeckAt = ctx.currentTime + 25 + Math.random() * 30;

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

    // FALLING WATER — the ban's one sanctioned voice (see THE BAN
    // above): noise reading as water is the failure of a leaf and the
    // truth of a fall. One pre-rendered roil loop feeds two legs into
    // a shared stereo seat: the body through a closeness-opened
    // lowpass, and a deep rumble leg for the pressure under tall
    // drops. Both gains sit at 0 until the earshot scan says a
    // curtain hangs nearby.
    const fallSrc = ctx.createBufferSource();
    fallSrc.buffer = this.makeFallBuffer(ctx);
    fallSrc.loop = true;
    this.fallPan = ctx.createStereoPanner();
    this.fallPan.pan.value = 0;
    this.fallPan.connect(bus);
    this.fallLp = ctx.createBiquadFilter();
    this.fallLp.type = 'lowpass';
    this.fallLp.frequency.value = 800;
    this.fallLp.Q.value = 0.5;
    this.fallBody = ctx.createGain();
    this.fallBody.gain.value = 0;
    fallSrc.connect(this.fallLp);
    this.fallLp.connect(this.fallBody);
    this.fallBody.connect(this.fallPan);
    const fallRlp = ctx.createBiquadFilter();
    fallRlp.type = 'lowpass';
    fallRlp.frequency.value = 240;
    fallRlp.Q.value = 0.5;
    this.fallRumble = ctx.createGain();
    this.fallRumble.gain.value = 0;
    fallSrc.connect(fallRlp);
    fallRlp.connect(this.fallRumble);
    this.fallRumble.connect(this.fallPan);
    fallSrc.start();

    // The Riftgate drone: three voices under one gate, all oscillators.
    //  - a beating sub pair (64 / 64.7 Hz — the ~0.7 Hz beat is the
    //    "presence" you feel before you name it);
    //  - a third-harmonic shimmer whose detune wanders on a slow LFO;
    //  - a hollow whistle far above, vibrato-wobbled, barely there —
    //    the eerie edge that says "this hum is not machinery".
    this.portalGain = ctx.createGain();
    this.portalGain.gain.value = 0;
    this.portalGain.connect(bus);
    const droneVoice = (freq: number, type: OscillatorType, level: number): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g);
      g.connect(this.portalGain!);
      o.start();
      return o;
    };
    droneVoice(64, 'sine', 1);
    droneVoice(64.7, 'sine', 0.85);
    const harm = droneVoice(193, 'sine', 0.3);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 0.13;
    const wobbleAmt = ctx.createGain();
    wobbleAmt.gain.value = 11; // cents of wander
    wobble.connect(wobbleAmt);
    wobbleAmt.connect(harm.detune);
    wobble.start();
    const whistle = droneVoice(431, 'triangle', 0.09);
    const vib = ctx.createOscillator();
    vib.frequency.value = 0.31;
    const vibAmt = ctx.createGain();
    vibAmt.gain.value = 28;
    vib.connect(vibAmt);
    vibAmt.connect(whistle.detune);
    vib.start();

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

  /**
   * Pre-render the leaf texture: white noise multiplied by a granular
   * envelope — ~55 overlapping sin²-windowed grains per second, each
   * 20-80ms with squared-random amplitude (many soft, few loud), wrapped
   * at the loop seam. The chaotic 8-25 Hz amplitude flicker this makes
   * is what separates leaves from water; a smooth envelope cannot.
   */
  private makeRustleBuffer(ctx: AudioContext): AudioBuffer {
    const secs = 6;
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(2, rate * secs, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const env = new Float32Array(d.length);
      const grains = secs * 55;
      for (let g = 0; g < grains; g++) {
        const start = Math.floor(Math.random() * d.length);
        const glen = Math.floor(rate * (0.02 + Math.random() * 0.06));
        const amp = Math.random() * Math.random();
        for (let i = 0; i < glen; i++) {
          const w = Math.sin((Math.PI * i) / glen);
          const idx = (start + i) % d.length;
          env[idx] = env[idx]! + amp * w * w;
        }
      }
      let peak = 0;
      for (let i = 0; i < env.length; i++) peak = Math.max(peak, env[i]!);
      const inv = peak > 0 ? 1 / peak : 1;
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env[i]! * inv;
    }
    return buf;
  }

  /**
   * Pre-render the fall's roil loop: pink-ish noise (a waterfall's
   * energy lives below 1 kHz) under a granular tumble — dense
   * overlapping grains over a steady floor, so the sound has the
   * internal boil of falling water instead of the flat hiss of
   * static. Two slow whole-loop swells (seam-safe by construction,
   * phase-offset per channel) let the mass of it breathe.
   */
  private makeFallBuffer(ctx: AudioContext): AudioBuffer {
    const secs = 6;
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(2, rate * secs, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      // ROIL: ~26 grains/sec, 80-350ms, sin²-windowed, wrapped at the
      // loop seam — the tumble that separates a living fall from hiss.
      const env = new Float32Array(d.length);
      const grains = secs * 26;
      for (let g = 0; g < grains; g++) {
        const start = Math.floor(Math.random() * d.length);
        const glen = Math.floor(rate * (0.08 + Math.random() * 0.27));
        const amp = 0.35 + 0.65 * Math.random() * Math.random();
        for (let i = 0; i < glen; i++) {
          const w = Math.sin((Math.PI * i) / glen);
          const idx = (start + i) % d.length;
          env[idx] = env[idx]! + amp * w * w;
        }
      }
      let peak = 0;
      for (let i = 0; i < env.length; i++) peak = Math.max(peak, env[i]!);
      const inv = peak > 0 ? 1 / peak : 1;
      // Kellet's economy pink filter under the envelope.
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      const phase = ch * 1.7;
      for (let i = 0; i < d.length; i++) {
        const u = (i / d.length) * Math.PI * 2;
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        const pink = (b0 + b1 + b2 + white * 0.1848) * 0.22;
        const breath = 1 + 0.08 * Math.sin(u + phase) + 0.05 * Math.sin(u * 3 + phase * 2);
        d[i] = pink * (0.5 + 0.5 * env[i]! * inv) * breath;
      }
    }
    return buf;
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

  /**
   * A mourning dove somewhere in the trees: the rising coo-ah-OOO,
   * then two or three low even coos. The calmest sound in North
   * America — sine through a dark filter, nothing else.
   */
  private dove(ctx: AudioContext, bus: GainNode, t: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.7;
    const distant = Math.random() < 0.4;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = distant ? 620 : 880;
    lp.Q.value = 0.3;
    lp.connect(pan);
    pan.connect(bus);
    const vol = distant ? 0.032 : 0.055;

    const coo = (at: number, dur: number, shape: (o: OscillatorNode) => void): void => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      shape(o);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.07);
      g.gain.setValueAtTime(vol, at + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      o.connect(g);
      g.connect(lp);
      o.start(at);
      o.stop(at + dur + 0.05);
    };

    // coo-ah-OOO: starts low, lifts, settles long.
    let at = t + 0.05;
    coo(at, 0.9, (o) => {
      o.frequency.setValueAtTime(400, at);
      o.frequency.exponentialRampToValueAtTime(560, at + 0.14);
      o.frequency.exponentialRampToValueAtTime(395, at + 0.55);
    });
    at += 1.15;
    const tail = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < tail; i++) {
      const a = at;
      coo(a, 0.55, (o) => {
        o.frequency.setValueAtTime(405, a);
        o.frequency.exponentialRampToValueAtTime(370, a + 0.5);
      });
      at += 0.85 + Math.random() * 0.15;
    }
  }

  /**
   * A woodpecker drumming a far snag: a fast decaying roll of soft
   * knocks. Rare — an event, not a bed.
   */
  private woodpecker(ctx: AudioContext, bus: GainNode, t: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.8;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    lp.connect(pan);
    pan.connect(bus);
    const vol = Math.random() < 0.5 ? 0.022 : 0.034;
    const n = 9 + Math.floor(Math.random() * 7);
    const iv = 0.046 + Math.random() * 0.012;
    for (let i = 0; i < n; i++) {
      const at = t + i * iv;
      const fade = 1 - (0.55 * i) / n; // the roll trails off
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(330 + Math.random() * 30, at);
      o.frequency.exponentialRampToValueAtTime(185, at + 0.025);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol * fade, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
      o.connect(g);
      g.connect(lp);
      o.start(at);
      o.stop(at + 0.04);
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

  /**
   * A Riftgate mood: mostly a warped whine — a sine gliss bending up
   * or down through a dark filter, doubled a few cents off so the pair
   * phases as it moves — and now and then a deep womp from somewhere
   * inside the gate. Panned wide at random; louder the closer you are.
   */
  private portalMood(ctx: AudioContext, bus: GainNode, t: number, near: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.75;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    lp.Q.value = 0.5;
    lp.connect(pan);
    pan.connect(bus);

    if (Math.random() < 0.32) {
      // The womp: a pressure swell falling into the sub.
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(96, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06 * near, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + 0.6);
      return;
    }
    // The whine: up or down, never the same twice.
    const f0 = 260 + Math.random() * 620;
    const ratio = Math.random() < 0.5 ? 0.42 + Math.random() * 0.25 : 1.6 + Math.random() * 0.9;
    const dur = 0.5 + Math.random() * 0.7;
    const vol = (0.02 + 0.045 * near) * (0.7 + Math.random() * 0.5);
    for (const cents of [0, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.detune.value = cents;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * ratio, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.09);
      g.gain.setValueAtTime(vol, t + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /** A far-off hammer on a far-off anvil: the village at work. */
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
