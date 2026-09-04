/**
 * The ambience system — the world's continuous voice. Where music is
 * an event, ambience is the room tone of being outdoors: it should
 * disappear from attention within a minute and leave a hole if muted.
 *
 * Layers, all crossfaded continuously by zone weight and clock:
 *  - LEAF RUSTLE (the "wind"): a REAL RECORDING — aspen foliage at
 *    the edge of Białowieża Forest (freesound #381717 by urupin,
 *    CC0), its calmest 14 seconds cut into a seamless loop
 *    (public/sfx/leaf_rustle_loop.mp3), fetched and decoded async
 *    with the old synthesized grain loop standing in only until the
 *    recording arrives. Ruled twice on synthesis (v1 micro-grains =
 *    paper bag, v2 smooth grains = white noise): this voice is a
 *    field recording now, full stop — real leaves are the only
 *    thing that sounds like real leaves. Gated by the squared gust
 *    curve of the SAME wind field the grass and trees bend to;
 *    silent between gusts, so the recording supplies the TEXTURE
 *    and the field supplies the WEATHER.
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
 *  - TOWN: a far-off dog somewhere behind the houses now and then by
 *    day — the sound of other lives being lived. (The smithy tink
 *    that held this seat was removed by user verdict.)
 *  - OWL (night, wild): the low call off in the dark, rare and far —
 *    the calmest thing the night says. Since 08-17 the voice deals
 *    from a pool: two REAL owl recordings (public/sfx/owl_night_*.mp3,
 *    fetched + decoded async, per-file gains matching their measured
 *    loudness) and the original synthesized four-note call, no pick
 *    repeated back-to-back. The synth owl also stands in whole until
 *    the recordings decode — the first night is never silent.
 *  - FALLING WATER (near a waterfall): a calm pink-noise roil in two
 *    legs — a body whose lowpass opens as the listener approaches
 *    (distance darkens a fall long before it silences it) and a low
 *    rumble that swells under tall stacked drops — seated in stereo
 *    toward the fall. Fed by audio/falls.ts, which asks THE SPILL LAW
 *    itself where curtains hang, so it is silent everywhere the
 *    renderer draws no fall. Never a wash: the loop's roil grains
 *    tumble inside it, and the earshot gate keeps it a soft far hush
 *    that only finds its voice at the plunge pool.
 *  - SMOLDER (near an ember bed — THE SCARRED LAND K1): the sound of
 *    a fire that is over but not out. Granular one-shots ONLY, on the
 *    fall's earshot pattern: main.ts scans for the nearest EmberBed
 *    tiles on the Riftgate cadence and feeds a SmolderEar; inside
 *    earshot the bed deals tick clusters (2-20ms noise grains through
 *    a bandpass — a coal's skin splitting), the occasional settle (a
 *    low soft thump as the ash shifts) and the rare pop (one grain
 *    with a sine pip — a check letting go). Closer is busier and
 *    brighter; at the edge of earshot it is one dark tick a few
 *    seconds apart. THE BAN holds in full: there is no bed under the
 *    grains, no gain envelope on noise, nothing continuous — silence
 *    between ticks is the voice.
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
import { Tile } from '@arx/shared';

/**
 * SMOLDER EARSHOT — where a dead fire's ticking reaches the ear, pure
 * and testable (the falls.ts pattern). `near` is the closeness gate,
 * `pan` the stereo seat of the beds' acoustic center.
 */
export interface SmolderEar {
  /** 0..1 gate for the smolder voice — 0 is out of earshot. */
  near: number;
  /** Stereo seat, -1..1. */
  pan: number;
}

/** The silence every quiet scan returns (treat as frozen). */
export const SILENT_SMOLDER: SmolderEar = { near: 0, pan: 0 };

/** Tiles at which a bed's ticking fades to nothing — also the scan
 *  radius, so closeness reaches exactly 0 at the edge and never pops. */
export const SMOLDER_EARSHOT = 9;

/**
 * Walk the square around the ear; every ember bed contributes
 * closeness²-weighted presence and seats the voice by its offset. One
 * bed underfoot is full voice; a steading of them is no louder than
 * one, only wider (the soft knee) — this is a whisper, not a chorus.
 */
export function scanSmolderEar(
  ground: (tx: number, ty: number) => number | undefined,
  px: number,
  py: number,
): SmolderEar {
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  let loud = 0;
  let panAcc = 0;
  for (let ty = cy - SMOLDER_EARSHOT; ty <= cy + SMOLDER_EARSHOT; ty++) {
    for (let tx = cx - SMOLDER_EARSHOT; tx <= cx + SMOLDER_EARSHOT; tx++) {
      if (ground(tx, ty) !== Tile.EmberBed) continue;
      const mx = tx + 0.5;
      const my = ty + 0.5;
      const c = 1 - Math.hypot(mx - px, my - py) / SMOLDER_EARSHOT;
      if (c <= 0) continue;
      const w = c * c;
      loud += w;
      panAcc += (mx - px) * w;
    }
  }
  if (loud <= 0) return SILENT_SMOLDER;
  const near = Math.min(1, Math.sqrt(loud));
  const pan = Math.max(-0.65, Math.min(0.65, panAcc / loud / 6));
  return { near, pan };
}

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
  private nextDogAt = 0;
  private nextDoveAt = 0;
  private nextPeckAt = 0;
  private nextOwlAt = 0;
  private portalGain: GainNode | null = null;
  private nextPortalMoodAt = 0;
  private fallBody: GainNode | null = null;
  private fallRumble: GainNode | null = null;
  private fallLp: BiquadFilterNode | null = null;
  private fallPan: StereoPannerNode | null = null;
  /** The smolder voice's grain bank: eight sin²-windowed noise grains,
   *  4-22ms, pre-rendered once — a tick is one of these at a random
   *  rate through a bandpass, never a synthesized bed. */
  private crackleGrains: AudioBuffer[] = [];
  private nextSmolderAt = 0;
  /** The synth rustle standing in until the recorded loop decodes. */
  private rustleSynth: AudioBufferSourceNode | null = null;
  /**
   * The recorded owl calls, decoded async like the rustle loop.
   * Paired with a per-file gain: the two recordings arrive mastered
   * ~15 dB apart (−11.7 / −26.9 LUFS) and must land equally far off
   * in the dark.
   */
  private owlCalls: Array<{ buf: AudioBuffer; gain: number }> = [];
  /** Last owl voice dealt (index; owlCalls.length = the synth call). */
  private owlLastPick = -1;
  /** Debug mirrors for live verification. */
  gates = { wind: 0, birds: 0, crickets: 0, cave: 0, portal: 0, fall: 0, smolder: 0 };
  /**
   * Dev lever (soundlab.html): when set, stands in for the wind
   * field's gust scalar (0..1) so the rustle texture can be
   * auditioned on demand instead of waiting on a natural gust.
   * The game never sets it.
   */
  devWindOverride: number | null = null;

  constructor(private engine: AudioEngine) {}

  /**
   * `portalNear` is 0..1 closeness to the nearest Riftgate (0 beyond
   * hearing range) — main.ts scans for it on a throttle and feeds it
   * through here. `fall` is the fall-earshot scan's verdict on the
   * falling water around the listener (audio/falls.ts), same cadence.
   * `smolder` is the ember-bed earshot scan (scanSmolderEar above),
   * fed on the Riftgate cadence too.
   */
  update(
    x: number,
    y: number,
    w: ZoneWeights,
    hours: number,
    tSec: number,
    portalNear = 0,
    fall: FallEar = SILENT_EAR,
    smolder: SmolderEar = SILENT_SMOLDER,
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
      const wind =
        this.devWindOverride ?? Math.max(0, Math.min(1, (windScalarAt(x, y, tSec) + 0.3) / 1.55));
      // Squared gust curve: the leaf-grain loop sounds ONLY while a
      // gust crests — between gusts the trees are silent, exactly
      // like the grass is still. No floor term, ever.
      const windLevel = (w.wild * 1 + w.town * 0.5) * wind * wind * (0.6 + 0.4 * day) * 0.06;
      this.windGain!.gain.setTargetAtTime(windLevel, t, 0.4);
      // A cresting gust opens slightly brighter — a breath, not a hiss.
      this.windFilter!.frequency.setTargetAtTime(3400 + wind * 800, t, 0.6);
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
        smolder: smolder.near,
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
    if (t >= this.nextDogAt) {
      if (w.town > 0.5 && day > 0.4) this.dogBark(ctx, bus, t);
      this.nextDogAt = t + 38 + Math.random() * 50;
    }
    if (t >= this.nextOwlAt) {
      if (night * outdoor * w.wild > 0.3) this.owlCall(ctx, bus, t);
      this.nextOwlAt = t + 55 + Math.random() * 65;
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
    if (t >= this.nextSmolderAt) {
      const sn = smolder.near;
      if (sn > 0.04) this.smolderTick(ctx, bus, t, sn, smolder.pan);
      // Closer is busier: a bed at your feet ticks every ~0.3-0.9s;
      // at the edge of earshot one dark tick every few seconds. The
      // gap is rolled even when silent so arrival never bunches.
      this.nextSmolderAt = t + 0.25 + Math.random() * (0.6 + 2.6 * (1 - sn));
    }
  }

  // ---- persistent graph ------------------------------------------------

  private build(ctx: AudioContext, bus: GainNode): void {
    this.built = true;
    // The smolder grain bank (see smolderTick): eight short windowed
    // noise grains. Rendered once; a tick plays one at a random rate.
    this.crackleGrains = [];
    for (let g = 0; g < 8; g++) {
      const ms = 4 + g * 2.5; // 4..21.5 ms
      const n = Math.max(16, Math.floor((ctx.sampleRate * ms) / 1000));
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const win = Math.sin((Math.PI * i) / n);
        d[i] = (Math.random() * 2 - 1) * win * win;
      }
      this.crackleGrains.push(buf);
    }
    const loopNoise = (): AudioBufferSourceNode => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    };

    // LEAF RUSTLE — the recorded aspen loop is the voice; the synth
    // grain loop below plays ONLY until the recording decodes (a
    // gust in the first second of a session should not be silent).
    // The squared gust curve in update() owns when either sounds.
    // The filter is a gentle lowpass lid, not a carving bandpass —
    // the recording already carries the right spectrum.
    const rustle = ctx.createBufferSource();
    rustle.buffer = this.makeRustleBuffer(ctx);
    rustle.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 3600;
    this.windFilter.Q.value = 0.4;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    rustle.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(bus);
    rustle.start();
    this.rustleSynth = rustle;
    this.loadRustleLoop(ctx);

    this.loadOwlCalls(ctx);

    // The dove, the woodpecker, the dog, and the owl all wait a
    // polite while after login — the world greets you with wind first.
    this.nextDoveAt = ctx.currentTime + 12 + Math.random() * 20;
    this.nextPeckAt = ctx.currentTime + 25 + Math.random() * 30;
    this.nextDogAt = ctx.currentTime + 15 + Math.random() * 25;
    this.nextOwlAt = ctx.currentTime + 18 + Math.random() * 25;

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
   * Fetch + decode the recorded aspen loop and seat it in the synth
   * loop's place. SILENCE IS VALID: any failure simply leaves the
   * synth fallback playing — no throw escapes into the frame loop.
   */
  private loadRustleLoop(ctx: AudioContext): void {
    fetch('/sfx/leaf_rustle_loop.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buf) => {
        if (!this.windFilter) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(this.windFilter);
        src.start();
        // The stand-in bows out the moment the real leaves arrive.
        this.rustleSynth?.stop();
        this.rustleSynth?.disconnect();
        this.rustleSynth = null;
      })
      .catch(() => {
        // The synth loop keeps the wind alive this session.
      });
  }

  /**
   * Fetch + decode the recorded owl calls. Each failure stays quiet
   * on its own — one dead file still leaves the other recording and
   * the synth call in the deal.
   */
  private loadOwlCalls(ctx: AudioContext): void {
    // name → the gain seating that file at the shared far-owl level
    // (measured EBU R128: owl_night_1 −11.7 LUFS, owl_night_2 −26.9).
    const calls: Array<[string, number]> = [
      ['owl_night_1', 0.16],
      ['owl_night_2', 0.92],
    ];
    for (const [name, gain] of calls) {
      fetch(`/sfx/${name}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .then((bytes) => ctx.decodeAudioData(bytes))
        .then((buf) => {
          this.owlCalls.push({ buf, gain });
        })
        .catch(() => {
          // The synth owl keeps the night company without it.
        });
    }
  }

  /**
   * Pre-render the SYNTH leaf texture — since v3 only the stand-in
   * while the recorded loop decodes (and the net-failure fallback).
   * The first build's 20-80ms micro-grains flickering to silence
   * read as a paper bag scrunching (user verdict): fast, deep
   * amplitude flicker on bright noise IS crinkle. What a gust through leaves
   * actually does is BREATHE — so this loop is long (120-350ms),
   * heavily overlapped sin²-windowed grains riding OVER a floor
   * (the texture undulates, it never blinks), on pink-tinted noise
   * so the energy leans dark, with two slow whole-loop swells
   * (seam-safe sine multiples, phase-offset per channel) letting
   * the canopy inhale and exhale. Decorrelated left/right. The
   * paper-bag law: no fast bright flicker in this voice, ever.
   */
  private makeRustleBuffer(ctx: AudioContext): AudioBuffer {
    const secs = 6;
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(2, rate * secs, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      // The undulation: ~30 long grains/sec, average overlap ~7 deep,
      // so the summed surface rolls gently instead of sparkling.
      const env = new Float32Array(d.length);
      const grains = secs * 30;
      for (let g = 0; g < grains; g++) {
        const start = Math.floor(Math.random() * d.length);
        const glen = Math.floor(rate * (0.12 + Math.random() * 0.23));
        const amp = 0.4 + 0.6 * Math.random();
        for (let i = 0; i < glen; i++) {
          const w = Math.sin((Math.PI * i) / glen);
          const idx = (start + i) % d.length;
          env[idx] = env[idx]! + amp * w * w;
        }
      }
      let peak = 0;
      for (let i = 0; i < env.length; i++) peak = Math.max(peak, env[i]!);
      const inv = peak > 0 ? 1 / peak : 1;
      // Kellet's economy pink filter — the darkness is in the source,
      // not just the seat, so nothing bright survives to crinkle.
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      const phase = ch * 2.1;
      for (let i = 0; i < d.length; i++) {
        const u = (i / d.length) * Math.PI * 2;
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        const pink = (b0 + b1 + b2 + white * 0.1848) * 0.22;
        const breath = 1 + 0.1 * Math.sin(u * 2 + phase) + 0.06 * Math.sin(u * 5 + phase * 1.7);
        d[i] = pink * (0.45 + 0.55 * env[i]! * inv) * breath;
      }
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

  /**
   * SMOLDER: one moment of a dead fire. Three grammars, dealt by
   * chance —
   *  - the TICK CLUSTER (most of them): 1-4 grains from the bank at a
   *    random rate, a few tens of ms apart, through a bandpass seated
   *    where a coal's skin splits (2.4-5 kHz); distance darkens it
   *    through the lowpass before it quiets it (the fall's law);
   *  - the SETTLE: the ash shifting — a low soft sine thump (110→58
   *    Hz, 90 ms) and one dull grain after it;
   *  - the POP (rare): a check letting go — the loudest grain plus a
   *    short sine pip riding on it.
   * Every voice here is a one-shot under 120 ms; nothing loops,
   * nothing holds a gain on noise (THE BAN).
   */
  private smolderTick(ctx: AudioContext, bus: GainNode, t: number, near: number, seat: number): void {
    if (this.crackleGrains.length === 0) return;
    const pan = ctx.createStereoPanner();
    pan.pan.value = seat + (Math.random() * 2 - 1) * 0.12;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400 + 4200 * near;
    lp.Q.value = 0.4;
    lp.connect(pan);
    pan.connect(bus);
    const loud = Math.pow(near, 1.5);
    const grain = (at: number, vol: number, rate: number, bp: number): void => {
      const src = ctx.createBufferSource();
      src.buffer = this.crackleGrains[Math.floor(Math.random() * this.crackleGrains.length)]!;
      src.playbackRate.value = rate;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = bp;
      f.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(lp);
      src.start(at);
      src.stop(at + 0.06);
    };
    const roll = Math.random();
    if (roll < 0.14) {
      // The pop.
      grain(t, 0.16 * loud, 0.9 + Math.random() * 0.4, 3200 + Math.random() * 1400);
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = 1900 + Math.random() * 900;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.03);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 * loud, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04);
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + 0.05);
      return;
    }
    if (roll < 0.36) {
      // The settle.
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(58, t + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045 * loud, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.1);
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + 0.11);
      grain(t + 0.05 + Math.random() * 0.04, 0.05 * loud, 0.55 + Math.random() * 0.3, 1600);
      return;
    }
    // The tick cluster.
    const n = 1 + Math.floor(Math.random() * 4);
    let at = t;
    for (let i = 0; i < n; i++) {
      grain(at, (0.04 + Math.random() * 0.07) * loud, 0.7 + Math.random() * 1.0, 2400 + Math.random() * 2600);
      at += 0.018 + Math.random() * 0.07;
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

  /**
   * A dog somewhere behind the houses — soft far-off barks, low-passed
   * to distance. Each "wuff" is a pitch-dropping saw pair (a few cents
   * apart for the throat's roughness) with a sharp attack; the pattern
   * varies — one wuff, a quick ruff-ruff, or a short string — so the
   * same dog never says the same thing twice.
   */
  private dogBark(ctx: AudioContext, bus: GainNode, t: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 720 + Math.random() * 260;
    lp.Q.value = 0.4;
    lp.connect(pan);
    pan.connect(bus);
    const far = Math.random() < 0.45;
    const vol = far ? 0.018 : 0.032;
    const roll = Math.random();
    const barks = roll < 0.4 ? 1 : roll < 0.8 ? 2 : 3 + Math.floor(Math.random() * 2);
    // A quick pair reads as "ruff-ruff"; longer strings space out.
    const gap = barks === 2 ? 0.17 : 0.32;
    let at = t + 0.03;
    for (let i = 0; i < barks; i++) {
      const f0 = 205 + Math.random() * 65;
      for (const cents of [0, 14]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.detune.value = cents;
        o.frequency.setValueAtTime(f0, at);
        o.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + 0.1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(vol * (cents ? 0.55 : 1), at + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.11);
        o.connect(g);
        g.connect(lp);
        o.start(at);
        o.stop(at + 0.13);
      }
      at += gap + Math.random() * 0.12;
    }
  }

  /**
   * The night owl's moment: deal one voice from the pool — the two
   * recordings and the synth four-note call — never the same pick
   * twice running. A recording plays seated exactly like the synth
   * owl does: panned somewhere off in the trees, darkened by a
   * lowpass when it's far, quieter still at distance; the ambience
   * bus's shared room carries the rest of the night around it.
   */
  private owlCall(ctx: AudioContext, bus: GainNode, t: number): void {
    const pool = this.owlCalls.length + 1; // + the synth call
    let pick = Math.floor(Math.random() * pool);
    if (pool > 1 && pick === this.owlLastPick) pick = (pick + 1) % pool;
    this.owlLastPick = pick;
    const rec = this.owlCalls[pick];
    if (!rec) {
      this.owlHoot(ctx, bus, t);
      return;
    }
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.75;
    pan.connect(bus);
    const far = Math.random() < 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = far ? 1100 : 2000;
    lp.Q.value = 0.3;
    lp.connect(pan);
    const g = ctx.createGain();
    g.gain.value = rec.gain * (far ? 0.55 : 1);
    g.connect(lp);
    const src = ctx.createBufferSource();
    src.buffer = rec.buf;
    // A whisper of rate drift — the same owl, never the same breath.
    src.playbackRate.value = 0.97 + Math.random() * 0.06;
    src.connect(g);
    src.start(t);
  }

  /**
   * An owl off in the dark — the low four-note call: hoo… h'hoo…
   * hoo, hoooo. Soft-attacked sines settling slightly flat through a
   * dark filter, a breath of vibrato on the held last note. Rare and
   * far by design: the parliament roosts out there, and hearing one
   * should feel like the night noticed you. Since 08-17 one voice of
   * three in the owlCall deal (and the whole voice before the
   * recordings decode).
   */
  private owlHoot(ctx: AudioContext, bus: GainNode, t: number): void {
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.75;
    const far = Math.random() < 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = far ? 520 : 700;
    lp.Q.value = 0.3;
    lp.connect(pan);
    pan.connect(bus);
    const vol = far ? 0.026 : 0.046;
    const f = 315 + Math.random() * 40;
    const note = (at: number, dur: number, freq: number, vib = false): void => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, at);
      o.frequency.exponentialRampToValueAtTime(freq * 0.94, at + dur);
      if (vib) {
        const v = ctx.createOscillator();
        v.frequency.value = 5.2;
        const va = ctx.createGain();
        va.gain.value = 6; // cents — felt, not warbled
        v.connect(va);
        va.connect(o.detune);
        v.start(at);
        v.stop(at + dur + 0.1);
      }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.05);
      g.gain.setValueAtTime(vol, at + Math.max(0.05, dur * 0.55));
      g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      o.connect(g);
      g.connect(lp);
      o.start(at);
      o.stop(at + dur + 0.05);
    };
    let at = t + 0.05;
    note(at, 0.32, f);
    at += 0.5 + Math.random() * 0.1;
    note(at, 0.14, f * 1.06);
    at += 0.22;
    note(at, 0.3, f);
    at += 0.5 + Math.random() * 0.12;
    note(at, 0.55, f * 0.98, true);
  }
}
