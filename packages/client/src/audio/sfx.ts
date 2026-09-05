import type { AudioEngine } from './engine.js';

/** A place in the world a sound is born at (tile coordinates). */
export interface WorldAt {
  x: number;
  y: number;
}

/**
 * How far each family of world sound carries, in tiles. `ref` is the
 * full-volume radius (inside it you're "at" the source); past it the
 * gain falls on a perceptual curve and reaches exactly zero at `max`,
 * where the sound is CULLED before any synthesis happens.
 */
const RANGES = {
  /** Personal-space sounds: footsteps, splashes, small handwork. */
  close: { ref: 1.5, max: 10 },
  /** Room-scale interactions: doors, chests, props, corpse thuds. */
  near: { ref: 2.5, max: 16 },
  /** Work and combat beats: anvil, mining, chopping, spells, hits. */
  mid: { ref: 4, max: 24 },
  /** Landmark events: tree falls, prop bursts, blasts, deaths. */
  far: { ref: 6, max: 34 },
} as const;
export type SoundRange = keyof typeof RANGES;

/** Tiles of sideways offset that reach full stereo deflection. */
const PAN_WIDTH = 12;
/** Never pan fully hard — a sound at the ear still leaks both sides. */
const PAN_MAX = 0.8;

/**
 * THE RECORDED SHELF — mastered one-shot stings in /public/sfx, the
 * fourth playback idiom beside synthesized SFX, streamed tracks, and
 * voice: fetched once, decoded once, held warm for the session (the
 * shelf is a handful of short stings, not a library). Values are
 * per-sample loudness trims normalizing the shelf to its quietest
 * sample (EBU R128 integrated, ffmpeg ebur128: −17.8 LUFS reference —
 * re-measure when samples are added or replaced).
 *
 * Wired today: `level_up` (the skill herald), `poi_discovery` and
 * `stab_calm_1` (the discovery ceremony's voices), `poi_cleared`
 * (THE CHAMPION'S MARK banner), the three `stab_dramatic` dread
 * stings (rotating — hostile-camp discoveries ONLY since the
 * unprompted-sting retirement), the `day_to_night`/`night_to_day`
 * seam stingers (THE
 * SKY'S SEAM in the main loop), `friend_alert` (the social ledger's
 * ping), the henyard pair (`chicken_cluck` + the `chicken_chatter`
 * phrase table, spatial via THE HENYARD SPEAKS), and the five
 * `step_grass` field recordings (footstep('grass') round-robin).
 * The rest sit ready for future moments — see each entry's note.
 *
 * Trims above 1 are honest normalization too: several recordings
 * arrive mastered soft (owls, piano stabs) and are lifted to the
 * −17.8 reference. Every boost was peak-checked against its file's
 * true peak — with SAMPLE_LEVEL's seat no boosted sample can clip.
 */
const SAMPLE_TRIM = {
  level_up: 0.6, // −13.3 — the skill level-up herald (wired: levelUp(); recut 08-17)
  poi_discovery: 0.9, // −16.9 — a wild site found (wired: onDiscovery; recut 08-17, 8.2s ceremony)
  poi_cleared: 1.2, // −19.4 — THE CHAMPION'S MARK (wired: onPoiCleared)
  alert_1: 0.99, // −17.7 — a general attention chime, brighter
  alert_2: 0.69, // −14.6 — a general attention chime, softer
  notification_success: 0.72, // −14.9 — an affirmative notice landing
  success_1: 0.81, // −16.0 — a smaller "it worked" flourish
  stab_calm_1: 0.47, // −11.2 — a town's gate entered (wired: onDiscovery)
  stab_dramatic_1: 0.72, // −14.9 — dread stings (wired: hostile-camp finds, rotating)
  stab_dramatic_2: 0.67, // −14.3
  stab_dramatic_3: 0.84, // −16.3
  // THE AMBIENT HITS — RETIRED, UNWIRED (user verdict 2026-08-19):
  // three soft piano stabs that used to drop into the track player's
  // quiets every 70-160s. They did not sit in the same hand as the
  // music library and read as jarring against a field-recording bed.
  // Cached here so the lab can still audition them and so their
  // measured trims are not lost — but nothing plays them, and the
  // scheduler is not coming back without stings composed FOR this
  // library. See the note over DREAD_STABS in main.ts.
  ambient_hit_1: 0.88, // −16.7 — a warm ambient swell
  ambient_hit_2: 1.51, // −21.4 — a spare piano stab
  ambient_hit_3: 3.24, // −28.0 — the softest piano figure (peak −12.3 dBFS — boost-safe)
  day_to_night: 0.73, // −15.1 — the dusk stinger (wired: THE SKY'S SEAM; recut 08-17)
  night_to_day: 0.66, // −14.2 — the answering dawn stinger (wired; recut 08-17)
  friend_alert: 0.58, // −13.2 — the social ledger's ping (wired: onFriendEvent)
  // THE HENYARD SPEAKS: one clean cluck plus a 41s field bed of hen
  // chatter dealt as phrases (CHICKEN_PHRASES) — spatial, ambient.
  chicken_cluck: 0.94, // −17.3 (wired: chicken())
  chicken_chatter: 1.76, // −22.7 (wired: chicken() phrase windows)
  // Cached for future moments — reviewed, trimmed, unwired:
  broadcast_fanfare: 0.62, // −13.6 — a server-wide herald, when broadcasts exist
  notify_soft_1: 1.1, // −18.6 — soft UI notices (mail, gentle nudges)
  notify_soft_2: 1.16, // −19.1
  notify_soft_3: 1.19, // −19.3
  warn_soft_1: 1.12, // −18.8 — a soft caution, for warnings that aren't combat
  whistle_alert_1: 2.21, // −24.7 — a summons whistle (peak −16.0 — boost-safe)
  notify_bleep_1: 0.83, // −16.2 — a rounder notice bleep
  teleport_whoosh: 0.9, // −16.9 — candidate for transport arts (blink/teleport)
  thunder_rumble: 1.53, // −21.5 — awaits a weather system
  water_splash: 2.2, // −25.8 (trim capped below the 2.51 norm: true peak −1.8 dBFS)
  water_splash_big: 1.2, // −19.4 — a landmark plunge (big bodies, falls)
  logo_reveal: 0.33, // −8.2 — the Arx mark's 10s reveal; awaits the login
  // logo presentation (the autoplay law: it needs the gesture that
  // ceremony will provide — never fire it on a silent page).
  // THE REAL STEP: five grass-step field recordings (Kenney.nl Impact
  // Sounds, CC0), mastered soft at the source (≈−29 dB mean, ±1 dB of
  // natural variation kept on purpose) — trims stay 1, the footstep
  // caller's gait volume does the scaling.
  step_grass_1: 1, // (wired: footstep('grass') round-robin)
  step_grass_2: 1,
  step_grass_3: 1,
  step_grass_4: 1,
  step_grass_5: 1,
} as const;
export type SampleName = keyof typeof SAMPLE_TRIM;

/** The shelf's roster, for the sound lab and future pickers. */
export const SAMPLE_NAMES = Object.keys(SAMPLE_TRIM) as SampleName[];

/** Seats the whole recorded shelf in the synth voices' mix. */
const SAMPLE_LEVEL = 0.55;

/** The grass steps' round-robin deal order. */
const GRASS_STEPS: readonly SampleName[] = [
  'step_grass_1',
  'step_grass_2',
  'step_grass_3',
  'step_grass_4',
  'step_grass_5',
];
/** Seats the recorded grass steps against the caller's gait volume. */
const GRASS_STEP_VOL = 2.2;

/**
 * Procedural WebAudio SFX — synthesized voices, plus THE RECORDED
 * SHELF: a small set of mastered one-shot stings (see SAMPLE_TRIM).
 * Kept short and soft; a local family server doesn't need ear-splitters.
 * Every sound rides the engine's sfx bus, which carries the warmth
 * low-pass, the glue compressor, and a touch of the shared room —
 * that shared air is what keeps synthesized blips from reading as
 * "computer noises" on top of the world instead of sounds inside it.
 *
 * THE SPATIAL LAW: any sound born at a place in the world plays
 * through `spatial(at, range, …)` — distance sets its loudness on a
 * shared rolloff curve, its side of you sets the stereo pan, and past
 * the family's max range it is culled before a single node is built
 * (cheaper than the flat world ever was). Sounds with no place — UI,
 * music stingers, your own body's feedback — skip the layer and stay
 * flat. Background music and ambience beds are NEVER spatialized.
 */
export class Sfx {
  constructor(private engine: AudioEngine) {}

  /** The listener — the player's rendered position, set every frame. */
  private lx = 0;
  private ly = 0;
  /** Emitter override: while set, tone/noise route through it. */
  private dest: AudioNode | null = null;

  /** Follow the camera's subject; called once per frame from the loop. */
  setListener(x: number, y: number): void {
    this.lx = x;
    this.ly = y;
  }

  /** Distance to the listener — for gating haptics/camera feel. */
  listenerDist(x: number, y: number): number {
    return Math.hypot(x - this.lx, y - this.ly);
  }

  /**
   * Play `body`'s sounds from a place in the world. One shared
   * emitter chain (gain → equal-power pan → sfx bus) carries every
   * tone and noise the body fires, so a five-layer clang costs one
   * extra gain and one panner — and an out-of-range clang costs
   * nothing at all. Passing a null/undefined `at` plays flat, so
   * shared code paths can serve both worlds.
   */
  spatial(at: WorldAt | null | undefined, range: SoundRange, body: () => void): void {
    if (!at) {
      body();
      return;
    }
    const ctx = this.ctx;
    const bus = this.engine.sfx;
    if (!ctx || !bus) return;
    const { ref, max } = RANGES[range];
    const dx = at.x - this.lx;
    const d = Math.hypot(dx, at.y - this.ly);
    if (d >= max) return; // inaudible — skip synthesis entirely
    // Perceptual rolloff: flat inside ref, then (1-u)^1.6 to zero at
    // max — monotonic, cheap, and silent exactly at the cull edge so
    // walking the boundary never pops.
    const u = d <= ref ? 0 : (d - ref) / (max - ref);
    const g = Math.pow(1 - u, 1.6);
    const gain = ctx.createGain();
    gain.gain.value = g;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-PAN_MAX, Math.min(PAN_MAX, dx / PAN_WIDTH));
    gain.connect(pan);
    pan.connect(bus);
    this.dest = gain;
    try {
      body();
    } finally {
      this.dest = null;
    }
  }

  /** Browsers require a user gesture before audio can start. */
  unlock(): void {
    this.engine.unlock();
    // Warm the wired samples so their first firing is the recording.
    this.warmSample('level_up');
    this.warmSample('poi_discovery');
    this.warmSample('poi_cleared');
    this.warmSample('stab_calm_1');
    this.warmSample('day_to_night');
    this.warmSample('night_to_day');
    this.warmSample('stab_dramatic_1');
    this.warmSample('stab_dramatic_2');
    this.warmSample('stab_dramatic_3');
    // Friend presence can ping right at login (the roster push).
    this.warmSample('friend_alert');
    // The grass underfoot must be the recording from the first step.
    for (const s of GRASS_STEPS) this.warmSample(s);
  }

  // ---- the recorded shelf -------------------------------------------

  /** Decoded samples, held for the session. */
  private sampleBuf = new Map<SampleName, AudioBuffer>();
  private sampleLoading = new Set<SampleName>();
  /** The grass steps' round-robin cursor (random start per session). */
  private grassStepIdx = Math.floor(Math.random() * GRASS_STEPS.length);

  /** Fetch + decode a sample ahead of its moment. Failure stays quiet. */
  warmSample(name: SampleName): void {
    const ctx = this.ctx;
    if (!ctx || this.sampleBuf.has(name) || this.sampleLoading.has(name)) return;
    this.sampleLoading.add(name);
    fetch(`/sfx/${name}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buf) => {
        this.sampleBuf.set(name, buf);
      })
      .catch(() => {
        // Silence is valid — a later call may retry the fetch.
      })
      .finally(() => this.sampleLoading.delete(name));
  }

  /**
   * Play a recorded one-shot from the shelf. Returns true if the
   * recording sounded; false warms it for next time so the caller can
   * fall back to its synth voice — the shelf never delays a moment.
   * Flat by default (UI and self feedback); inside `spatial()` it
   * rides the emitter like every other voice.
   *
   * `win` plays only a window of the buffer (offset + duration in
   * source seconds) under a short sin ramp at each edge, so a phrase
   * dealt out of a longer field bed never starts or ends on a click.
   */
  sample(name: SampleName, volume = 1, rate = 1, win?: { at: number; dur: number }): boolean {
    const ctx = this.ctx;
    const out = this.dest ?? this.engine.sfx;
    if (!ctx || !out) return false;
    const buf = this.sampleBuf.get(name);
    if (!buf) {
      this.warmSample(name);
      return false;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // A breath of rate variation keeps repeated one-shots (footsteps)
    // from ever machine-gunning the identical waveform.
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    const level = SAMPLE_TRIM[name] * SAMPLE_LEVEL * volume;
    src.connect(gain);
    gain.connect(out);
    if (win) {
      const t0 = ctx.currentTime;
      const heard = win.dur / rate; // window length at the played rate
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(level, t0 + 0.015);
      gain.gain.setValueAtTime(level, t0 + Math.max(0.015, heard - 0.06));
      gain.gain.linearRampToValueAtTime(0.0001, t0 + heard);
      src.start(t0, win.at, win.dur);
    } else {
      gain.gain.value = level;
      src.start();
    }
    return true;
  }

  private get ctx(): AudioContext | null {
    return this.engine.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    opts: {
      type?: OscillatorType;
      slide?: number;
      volume?: number;
      delay?: number;
      detune?: boolean;
      pan?: number;
    } = {},
  ): void {
    const ctx = this.ctx;
    const out = this.dest ?? this.engine.sfx;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'square';
    // A pinch of random detune keeps repeated combat sounds organic.
    if (opts.detune !== false) freq *= 1 + (Math.random() - 0.5) * 0.07;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + opts.slide), t0 + duration);
    gain.gain.setValueAtTime(opts.volume ?? 0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    if (opts.pan) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, opts.pan));
      gain.connect(pan);
      pan.connect(out);
    } else {
      gain.connect(out);
    }
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(duration: number, volume = 0.3, delay = 0, opts: { band?: number; pan?: number } = {}): void {
    const ctx = this.ctx;
    const out = this.dest ?? this.engine.sfx;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + delay;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    let head: AudioNode = gain;
    src.connect(gain);
    if (opts.band) {
      // Focused hiss instead of full-spectrum static — cloth, grass, air.
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = opts.band;
      bp.Q.value = 0.9;
      head.connect(bp);
      head = bp;
    }
    if (opts.pan) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, opts.pan));
      head.connect(pan);
      head = pan;
    }
    head.connect(out);
    src.start(t0);
  }

  /**
   * A soft brass voice: two sawtooths detuned a few cents apart (the
   * ensemble beat that makes horns warm) through a lowpass that
   * BLOSSOMS open over the attack — brass brightens as the player
   * leans in — with a gentle linear onset instead of tone()'s instant
   * strike. Built for fanfares that repeat without wearing thin.
   */
  private horn(
    freq: number,
    duration: number,
    opts: { volume?: number; delay?: number; attack?: number; bright?: number } = {},
  ): void {
    const ctx = this.ctx;
    const out = this.dest ?? this.engine.sfx;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const vol = opts.volume ?? 0.2;
    const attack = opts.attack ?? 0.05;
    const bright = opts.bright ?? 3.4;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(freq * 1.6, t0);
    lp.frequency.linearRampToValueAtTime(freq * bright, t0 + attack * 1.8);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.setValueAtTime(vol, t0 + Math.max(attack, duration - 0.12));
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    lp.connect(gain);
    gain.connect(out);
    for (const cents of [-4, 5]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);
      osc.detune.setValueAtTime(cents, t0);
      osc.connect(lp);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    }
  }

  hit(): void {
    this.tone(160, 0.08, { type: 'square', slide: -80, volume: 0.4 });
    this.noise(0.06, 0.2);
  }

  hurt(): void {
    this.tone(110, 0.15, { type: 'sawtooth', slide: -60, volume: 0.4 });
  }

  swing(): void {
    this.noise(0.08, 0.12);
  }

  chop(): void {
    this.tone(90, 0.06, { type: 'square', slide: -30, volume: 0.35 });
    this.noise(0.05, 0.25);
  }

  /** A stem snaps free of the plant: a leafy brush with a soft pop. */
  forage(): void {
    this.noise(0.09, 0.16, 0, { band: 2600 });
    this.tone(340, 0.05, { type: 'triangle', slide: -140, volume: 0.12, delay: 0.02 });
  }

  /** The joiner's mallet taps the piece home: a woody knock, rounder
   *  and lighter than the axe's bite — furniture being made, not
   *  timber being felled. Serves the bench AND the building site. */
  benchKnock(): void {
    this.tone(210, 0.045, { type: 'square', slide: -70, volume: 0.22 });
    this.tone(460, 0.035, { type: 'triangle', slide: -160, volume: 0.1, delay: 0.006 });
    this.noise(0.03, 0.12, 0, { band: 1400 });
  }

  /** The saw draws through the kerf: a short fibrous rasp — banded
   *  noise with a woody undertone, no ring (steel in wood, never
   *  steel on steel). */
  sawRasp(): void {
    this.noise(0.16, 0.16, 0, { band: 2100 });
    this.noise(0.1, 0.1, 0.03, { band: 3300 });
    this.tone(140, 0.09, { type: 'sawtooth', slide: -25, volume: 0.08 });
  }

  /** Pick meets rock: a hard stony knock with a metallic tick on top. */
  mineClink(): void {
    this.tone(120, 0.05, { type: 'square', slide: -50, volume: 0.35 });
    this.tone(1750, 0.06, { type: 'triangle', slide: -420, volume: 0.14, delay: 0.008 });
    this.noise(0.06, 0.28);
  }

  /** A mined-out node collapses: low crunch + settling stone clatter. */
  rockCrumble(): void {
    this.tone(72, 0.24, { type: 'square', slide: -30, volume: 0.4 });
    this.noise(0.28, 0.3);
    this.tone(190, 0.05, { type: 'square', slide: -60, volume: 0.18, delay: 0.09 });
    this.tone(150, 0.05, { type: 'square', slide: -50, volume: 0.14, delay: 0.17 });
    this.noise(0.06, 0.14, 0.13);
  }

  /** Hammer rings the anvil: a bright ping over a body knock. */
  anvilClang(): void {
    this.tone(1180, 0.28, { type: 'triangle', slide: -160, volume: 0.24 });
    this.tone(1770, 0.16, { type: 'triangle', slide: -220, volume: 0.12, delay: 0.004 });
    this.tone(220, 0.07, { type: 'square', slide: -90, volume: 0.3 });
    this.noise(0.04, 0.22);
  }

  /** The furnace draws breath: a soft roaring swell of hot air. */
  furnaceRoar(): void {
    this.noise(0.55, 0.2);
    this.tone(70, 0.5, { type: 'sine', slide: 26, volume: 0.22 });
  }

  /** The long groan of a felled trunk tipping over. */
  treeFall(): void {
    this.tone(150, 0.7, { type: 'sawtooth', slide: -95, volume: 0.22 });
    this.tone(96, 0.6, { type: 'sawtooth', slide: -50, volume: 0.16, delay: 0.1 });
  }

  /** The crown hits the ground: deep thud + leaf wash. */
  treeImpact(): void {
    this.tone(55, 0.22, { type: 'sine', slide: -18, volume: 0.5 });
    this.noise(0.3, 0.3);
  }

  /** A body hitting the ground — dull and soft; heavy falls land lower. */
  bodyThud(heavy: boolean): void {
    this.tone(heavy ? 62 : 78, heavy ? 0.16 : 0.11, {
      type: 'sine',
      slide: heavy ? -26 : -20,
      volume: heavy ? 0.34 : 0.24,
    });
    this.noise(heavy ? 0.12 : 0.08, heavy ? 0.14 : 0.09);
  }

  collect(): void {
    this.tone(520, 0.07, { type: 'triangle', volume: 0.3 });
    this.tone(780, 0.09, { type: 'triangle', volume: 0.3, delay: 0.06 });
  }

  /**
   * A craft batch seen through — the tools set down, not a fanfare:
   * a soft wooden tock as the last piece lands on the pile, a rising
   * third saying "done", and one warm ring to let the bench go quiet.
   * Bigger than the collect blip, smaller than swearing a quest —
   * it fires every batch, so it must never wear out its welcome.
   */
  workDone(): void {
    this.tone(180, 0.08, { type: 'sine', slide: -40, volume: 0.24, detune: false });
    this.noise(0.05, 0.04, 0, { band: 1400 });
    this.tone(523.3, 0.12, { type: 'triangle', volume: 0.22, delay: 0.07, detune: false });
    this.tone(659.3, 0.28, { type: 'triangle', volume: 0.24, delay: 0.16, detune: false });
    this.tone(1318.5, 0.14, { type: 'triangle', volume: 0.07, delay: 0.3, detune: false });
  }

  /**
   * The level-up fanfare v3 — a small brass choir, not a chiptune
   * arpeggio: a felt timpani landing, then horns lift G4 - C5 - E5
   * and plant a full C major chord over a low root, a soft ensemble
   * "ta - da - daaa" with real attack and a shimmer of air on top.
   * Soft-edged on purpose: several skills can level in one hunt, and
   * the herald must stay welcome on the fifth hearing. Sized to the
   * world show without overstaying.
   */
  levelUp(): void {
    // The recorded herald leads; the synth choir below is the fallback
    // for the beat before the sample has decoded.
    if (this.sample('level_up')) return;
    // The felt timpani: the moment lands with weight, not a click.
    this.tone(82, 0.34, { type: 'sine', slide: -28, volume: 0.34, detune: false });
    this.noise(0.1, 0.05, 0, { band: 220 });
    // The lift: two pickup horns stepping up...
    this.horn(392, 0.16, { volume: 0.16, delay: 0.03, attack: 0.035 });
    this.horn(523.25, 0.17, { volume: 0.17, delay: 0.17, attack: 0.035 });
    // ...into the held call, a third above.
    this.horn(659.26, 0.62, { volume: 0.18, delay: 0.31, attack: 0.045, bright: 4 });
    // The chord blooms under the held note: C major planted broad and
    // warm, horns on the triad, a low horn root and a sine sub for
    // the chest of it.
    const chordAt = 0.44;
    this.horn(523.25, 0.85, { volume: 0.13, delay: chordAt, attack: 0.07 });
    this.horn(783.99, 0.8, { volume: 0.1, delay: chordAt, attack: 0.07 });
    this.horn(261.63, 0.9, { volume: 0.15, delay: chordAt, attack: 0.06, bright: 2.6 });
    this.tone(130.81, 0.9, { type: 'sine', volume: 0.15, delay: chordAt, detune: false });
    // The shimmer: one glockenspiel star and a breath of bright air.
    this.tone(2093, 0.5, { type: 'triangle', volume: 0.055, delay: chordAt + 0.3, detune: false });
    this.noise(0.55, 0.03, chordAt + 0.12, { band: 4800 });
  }

  /**
   * A place enters the chart — wonder, not triumph. A breath of
   * parchment air, a rising call answered an octave up, a warm fourth
   * held underneath, and the pin landing as one bright tick with
   * glitter air. Smaller than the level-up herald by design: finding
   * is a gift, leveling is a feat.
   */
  discovery(): void {
    this.noise(0.22, 0.055, 0, { band: 3600 });
    this.tone(440, 0.2, { type: 'triangle', volume: 0.24, detune: false });
    this.tone(587, 0.26, { type: 'triangle', volume: 0.28, delay: 0.14, detune: false });
    this.tone(880, 0.6, { type: 'triangle', volume: 0.2, delay: 0.3, detune: false });
    this.tone(293.7, 0.6, { type: 'sine', volume: 0.15, delay: 0.3, detune: false });
    this.tone(1760, 0.26, { type: 'triangle', volume: 0.09, delay: 0.58, detune: false });
    this.noise(0.4, 0.03, 0.58, { band: 5600 });
  }

  /**
   * Swearing a quest — a page turned and a hand shaken, not a
   * fanfare: a soft paper breath, a rising fourth to say "begun", and
   * one clean tick as the entry lands in the journal. Smaller than the
   * discovery call by design: swearing is a start, finding is a gift.
   */
  questAccepted(): void {
    this.noise(0.16, 0.045, 0, { band: 2400 });
    this.tone(392, 0.16, { type: 'triangle', volume: 0.2, detune: false });
    this.tone(523.3, 0.3, { type: 'triangle', volume: 0.24, delay: 0.11, detune: false });
    this.tone(1568, 0.12, { type: 'triangle', volume: 0.08, delay: 0.3, detune: false });
  }

  /**
   * A quest seen through — the level-up's herald a size down, with the
   * ledger shutting under it: a warm thump, three rising calls at the
   * herald's spacing, the chord planted with a sine root, and glitter
   * air on top. Finishing IS a feat; only leveling outranks it.
   */
  questComplete(): void {
    this.tone(88, 0.3, { type: 'sine', slide: -20, volume: 0.3 });
    this.noise(0.2, 0.05, 0, { band: 900 });
    this.tone(392, 0.2, { type: 'triangle', volume: 0.24, delay: 0.1, detune: false });
    this.tone(493.9, 0.2, { type: 'triangle', volume: 0.24, delay: 0.2, detune: false });
    this.tone(587.3, 0.5, { type: 'triangle', volume: 0.26, delay: 0.3, detune: false });
    this.tone(196, 0.6, { type: 'sine', volume: 0.16, delay: 0.3, detune: false });
    this.tone(1174.7, 0.3, { type: 'triangle', volume: 0.1, delay: 0.52, detune: false });
    this.noise(0.36, 0.03, 0.52, { band: 5200 });
  }

  /**
   * Stepping through the Riftgate — a dimensional plunge, not a blip:
   * the deep mouth swallows (a falling sub womp), the veil tears (a
   * focused hiss of air), and a doubled shimmer climbs out the far
   * side with a sparkle landing on top. ~0.9s, sized to the swallow.
   */
  portal(): void {
    // The swallow: a sub-heavy womp folding downward.
    this.tone(150, 0.5, { type: 'sine', slide: -95, volume: 0.5 });
    this.tone(78, 0.62, { type: 'sine', slide: -32, volume: 0.34, delay: 0.04 });
    // The veil tearing: bright air, band-focused so it hisses, not static.
    this.noise(0.34, 0.16, 0.02, { band: 2400 });
    // The shimmer through: two staggered glisses rising past each other.
    this.tone(340, 0.45, { type: 'triangle', slide: 620, volume: 0.15, delay: 0.1 });
    this.tone(520, 0.42, { type: 'triangle', slide: 940, volume: 0.11, delay: 0.2 });
    // Arrival glitter on the far side.
    this.tone(1320, 0.18, { type: 'triangle', volume: 0.08, delay: 0.42, detune: false });
    this.tone(1760, 0.22, { type: 'triangle', volume: 0.06, delay: 0.54, detune: false });
  }

  death(): void {
    this.tone(220, 0.5, { type: 'sawtooth', slide: -160, volume: 0.4 });
  }

  /**
   * THE LONG ROAD TOGETHER (beastcraft v2): the companion's three
   * moments, kept small and warm — these are house sounds, not
   * fanfares. The fall is a low huff folding down; the rise is the
   * happy nip, two quick notes upward; the bond is one soft chirp
   * with a breath under it.
   */
  petDown(): void {
    // The huff: breath out, low and short, with a soft body thud.
    this.noise(0.22, 0.1, 0, { band: 420 });
    this.tone(140, 0.3, { type: 'sine', slide: -55, volume: 0.28, delay: 0.03 });
  }

  petRise(): void {
    // The happy nip: two quick warm notes stepping up.
    this.tone(392, 0.12, { type: 'triangle', volume: 0.16 });
    this.tone(523, 0.16, { type: 'triangle', volume: 0.14, delay: 0.1 });
    this.noise(0.1, 0.02, 0.08, { band: 3200 });
  }

  petBond(): void {
    // One soft chirp over a breath — the snack taken gently.
    this.tone(660, 0.1, { type: 'triangle', volume: 0.1 });
    this.noise(0.14, 0.03, 0.04, { band: 900 });
  }

  crit(): void {
    this.tone(200, 0.1, { type: 'square', slide: -120, volume: 0.5 });
    this.tone(90, 0.16, { type: 'sawtooth', slide: -40, volume: 0.4, delay: 0.015 });
    this.noise(0.1, 0.3);
  }

  bowTwang(): void {
    this.tone(340, 0.09, { type: 'triangle', slide: -180, volume: 0.35 });
    this.noise(0.04, 0.12);
  }

  /** Steel leaves the scabbard: a bright scrape ringing UP and open. */
  weaponDraw(): void {
    this.noise(0.16, 0.13, 0, { band: 3400 });
    this.tone(1250, 0.16, { type: 'triangle', slide: 850, volume: 0.13 });
    this.tone(420, 0.05, { type: 'square', slide: -60, volume: 0.09 });
  }

  /** Steel slides home: a duller scrape down, then the frog's soft click. */
  weaponStow(): void {
    this.noise(0.14, 0.11, 0, { band: 2200 });
    this.tone(980, 0.13, { type: 'triangle', slide: -430, volume: 0.09 });
    this.tone(200, 0.05, { type: 'square', slide: -40, volume: 0.14, delay: 0.12 });
  }

  /** Nocking + hauling the string back: a low wooden creak. */
  bowDraw(): void {
    this.tone(90, 0.28, { type: 'sawtooth', slide: 55, volume: 0.14 });
    this.noise(0.1, 0.05);
  }

  /** Full draw reached: a tight little click — "locked in". */
  fullDrawClick(): void {
    this.tone(660, 0.05, { type: 'square', volume: 0.22, detune: false });
    this.tone(990, 0.04, { type: 'square', volume: 0.14, delay: 0.03, detune: false });
  }

  /**
   * Loosing the arrow: string snap + a whistle that sharpens with the
   * charge — a full-power shot sounds meaner than a snap shot.
   */
  loose(charge: number): void {
    this.tone(300 + charge * 160, 0.1, { type: 'triangle', slide: -220, volume: 0.4 });
    this.noise(0.08 + charge * 0.06, 0.18 + charge * 0.14);
    if (charge > 0.9) this.tone(880, 0.12, { type: 'sine', slide: -500, volume: 0.16, delay: 0.01 });
  }

  /** Combo swings pitch up the chain; the finisher lands with a thud. */
  swingCombo(stage: number): void {
    if (stage >= 2) {
      this.tone(70, 0.16, { type: 'sawtooth', slide: -30, volume: 0.4 });
      this.noise(0.14, 0.3);
    } else {
      this.noise(0.08, 0.12 + stage * 0.05);
      this.tone(220 + stage * 90, 0.06, { type: 'triangle', slide: -80, volume: 0.12 });
    }
  }

  /** Snap shot — a quick dry pip from the hip. */
  snapShot(): void {
    this.tone(520, 0.05, { type: 'triangle', slide: -160, volume: 0.22 });
    this.noise(0.04, 0.1);
  }

  /** The wand's heavy third bolt leaving — a fat slow whomp. */
  heavyBolt(): void {
    this.tone(160, 0.2, { type: 'sawtooth', slide: 120, volume: 0.32 });
    this.tone(420, 0.16, { type: 'sine', slide: -180, volume: 0.2, delay: 0.02 });
  }

  /** Chain lightning crackle. */
  chainZap(): void {
    this.tone(880, 0.05, { type: 'square', volume: 0.2, detune: false });
    this.tone(1240, 0.06, { type: 'square', slide: -500, volume: 0.18, delay: 0.04 });
    this.noise(0.08, 0.14, 0.02);
  }

  /** Weapon Art / relic cast — a rising committed whoomph. */
  art(): void {
    this.tone(190, 0.16, { type: 'sawtooth', slide: 260, volume: 0.3 });
    this.tone(520, 0.2, { type: 'sine', slide: 340, volume: 0.22, delay: 0.03 });
    this.noise(0.1, 0.12);
  }

  /** A status reaction detonating — the combo payoff sting. */
  reaction(): void {
    this.tone(740, 0.1, { type: 'square', volume: 0.3 });
    this.tone(990, 0.16, { type: 'square', slide: -420, volume: 0.26, delay: 0.05 });
    this.noise(0.14, 0.2, 0.02);
  }

  /** Telegraphed blast landing. */
  blast(): void {
    this.tone(120, 0.24, { type: 'sawtooth', slide: -70, volume: 0.4 });
    this.noise(0.2, 0.3);
  }

  /** The hotbar radial refilling to ready — a soft affirmative tick. */
  abilityReady(): void {
    this.tone(660, 0.06, { type: 'sine', volume: 0.16, detune: false });
    this.tone(880, 0.09, { type: 'sine', volume: 0.14, delay: 0.05, detune: false });
  }

  zap(): void {
    this.tone(520, 0.14, { type: 'sawtooth', slide: -300, volume: 0.28 });
    this.tone(780, 0.1, { type: 'sine', slide: -400, volume: 0.2, delay: 0.02 });
  }

  /** A dash art or a drop into the crouch: a short breathy whoosh. */
  dash(): void {
    this.noise(0.13, 0.22);
    this.tone(180, 0.12, { type: 'sine', slide: 240, volume: 0.18 });
  }

  /**
   * THE SLIPPED BLOW: a blow that never landed — a lighter, quicker
   * breath than the dash, a swept-cloth hiss with a rising whisper
   * where the impact would have thudded. Reads as "missed", not "hit".
   */
  slip(): void {
    this.noise(0.09, 0.16, 0.01);
    this.tone(420, 0.09, { type: 'sine', slide: 380, volume: 0.1, detune: false });
    this.tone(1240, 0.05, { type: 'triangle', slide: 600, volume: 0.05, delay: 0.03, detune: false });
  }

  /** A kill: a small dark pop with a satisfying tail. */
  kill(): void {
    this.tone(140, 0.12, { type: 'square', slide: -90, volume: 0.45 });
    this.noise(0.14, 0.3);
    this.tone(420, 0.14, { type: 'triangle', slide: 160, volume: 0.22, delay: 0.06 });
  }

  /** An instant ray firing — a bright sustained lance with a crack. */
  beam(): void {
    this.tone(320, 0.2, { type: 'sawtooth', slide: -120, volume: 0.3 });
    this.tone(1180, 0.16, { type: 'square', slide: -300, volume: 0.16, delay: 0.01 });
    this.noise(0.12, 0.18);
  }

  /** A hazard zone igniting — a low bloom that settles into a simmer. */
  ignite(): void {
    this.tone(150, 0.22, { type: 'sawtooth', slide: 90, volume: 0.28 });
    this.noise(0.24, 0.14, 0.03);
  }

  /** A self-buff flourish — an ascending affirmation chord. */
  empower(): void {
    this.tone(440, 0.12, { type: 'sine', volume: 0.2, detune: false });
    this.tone(660, 0.14, { type: 'sine', volume: 0.18, delay: 0.06, detune: false });
    this.tone(880, 0.2, { type: 'triangle', volume: 0.16, delay: 0.12, detune: false });
  }

  // ---- furniture & fingers -----------------------------------------
  // The interaction suite: every station you talk to and every control
  // you touch answers back. THE QUIET-HANDS LAW: these are the softest
  // sounds in the game — felt at the fingertips, never announcing
  // themselves over the world. Materials speak (wood creaks, parchment
  // slides, leather shifts, coin rings); pure-UI cues are tiny sine
  // taps with detune off so they always land identically.

  /** The bank chest waking: a slow wooden creak, a latch, a lid knock. */
  chestOpen(): void {
    this.tone(64, 0.38, { type: 'sawtooth', slide: 42, volume: 0.1 });
    this.tone(92, 0.3, { type: 'sawtooth', slide: 34, volume: 0.065, delay: 0.06 });
    this.noise(0.14, 0.12, 0.02, { band: 480 });
    this.tone(1500, 0.04, { type: 'triangle', volume: 0.08, delay: 0.03, detune: false });
  }

  /** The lid settling shut: soft thud, wood shift, latch tick. */
  chestClose(): void {
    this.tone(90, 0.12, { type: 'sine', slide: -25, volume: 0.2 });
    this.noise(0.08, 0.12, 0, { band: 500 });
    this.tone(1250, 0.035, { type: 'triangle', volume: 0.07, delay: 0.07, detune: false });
  }

  /** A door leaf swinging wide: latch click, then a long hinge creak. */
  doorOpen(): void {
    this.tone(1400, 0.03, { type: 'triangle', volume: 0.07, detune: false });
    this.tone(120, 0.34, { type: 'sawtooth', slide: 60, volume: 0.075, delay: 0.03 });
    this.noise(0.1, 0.16, 0.02, { band: 700 });
  }

  /** The leaf pulled to: a short creak, a frame knock, the latch. */
  doorClose(): void {
    this.tone(160, 0.16, { type: 'sawtooth', slide: -50, volume: 0.06 });
    this.tone(85, 0.1, { type: 'sine', slide: -20, volume: 0.18, delay: 0.1 });
    this.tone(1350, 0.03, { type: 'triangle', volume: 0.08, delay: 0.15, detune: false });
  }

  /** A locked door refusing: two dull knocks and the hasp's rattle. */
  doorRattle(): void {
    this.tone(110, 0.06, { type: 'sine', slide: -15, volume: 0.16 });
    this.tone(110, 0.06, { type: 'sine', slide: -15, volume: 0.14, delay: 0.09 });
    this.noise(0.05, 0.1, 0, { band: 1800 });
    this.noise(0.05, 0.08, 0.09, { band: 1800 });
  }

  /**
   * THE KEPT FLAME: a wick taking (the strike's soft pip and the
   * flame's first warm breath) or dying (one puffed breath, the
   * faintest ember tick). The quietest verb in the game on purpose —
   * a candle is mood, never an event.
   */
  candleFlip(lit: boolean): void {
    if (lit) {
      this.noise(0.03, 0.04, 0, { band: 3200 });
      this.tone(980, 0.06, { type: 'triangle', slide: 180, volume: 0.045, delay: 0.02 });
      this.tone(520, 0.12, { type: 'sine', slide: 40, volume: 0.04, delay: 0.05 });
    } else {
      this.noise(0.14, 0.05, 0, { band: 750 });
      this.tone(300, 0.1, { type: 'sine', slide: -130, volume: 0.035, delay: 0.03 });
    }
  }

  /**
   * A blow landing on a durable prop without finishing it: one solid
   * woody knock and a short splinter spray — the sound of progress.
   */
  propCrack(): void {
    this.tone(200, 0.05, { type: 'triangle', slide: -90, volume: 0.15 });
    this.noise(0.05, 0.11, 0.01, { band: 2100 });
  }

  /**
   * A prop bursting: a sharp crack, a spray of splinters, and the
   * clatter of pieces coming down. Barrels add a hollow cask boom
   * under the crack — a drum giving up.
   */
  propSmash(hollow = false): void {
    this.tone(240, 0.06, { type: 'triangle', slide: -140, volume: 0.18 });
    this.noise(0.09, 0.18, 0, { band: 2400 });
    if (hollow) this.tone(95, 0.16, { type: 'sine', slide: -35, volume: 0.16, delay: 0.02 });
    // The pieces landing: two staggered woody knocks and a dry rustle.
    this.tone(170, 0.05, { type: 'triangle', slide: -60, volume: 0.09, delay: 0.16 });
    this.noise(0.06, 0.08, 0.2, { band: 1400 });
    this.tone(140, 0.05, { type: 'triangle', slide: -50, volume: 0.07, delay: 0.3 });
  }

  /**
   * THE SALVAGE LAW's crack-and-drop: a whole construction giving up.
   * Timber goes with a frame groan, one sharp crack, and a stagger of
   * plank clatter; stone drops straight into a rubble slump — deeper,
   * duller, done. Bigger than propSmash on purpose: this was a wall.
   */
  demolishCrash(stone = false): void {
    if (stone) {
      this.tone(58, 0.3, { type: 'sine', slide: -20, volume: 0.5 });
      this.tone(84, 0.26, { type: 'square', slide: -34, volume: 0.3, delay: 0.02 });
      this.noise(0.34, 0.3, 0, { band: 900 });
      // Masonry settling: three falling knocks, each lower than the last.
      this.tone(150, 0.06, { type: 'square', slide: -60, volume: 0.16, delay: 0.16 });
      this.tone(120, 0.06, { type: 'square', slide: -50, volume: 0.13, delay: 0.28 });
      this.tone(96, 0.07, { type: 'square', slide: -40, volume: 0.1, delay: 0.42 });
      this.noise(0.08, 0.12, 0.3, { band: 700 });
      return;
    }
    // The frame lets go: a groan, then the crack.
    this.tone(130, 0.18, { type: 'sawtooth', slide: -55, volume: 0.16 });
    this.tone(255, 0.07, { type: 'triangle', slide: -150, volume: 0.22, delay: 0.05 });
    this.noise(0.12, 0.22, 0.04, { band: 2200 });
    // The ground takes the weight.
    this.tone(62, 0.2, { type: 'sine', slide: -20, volume: 0.4, delay: 0.1 });
    // Boards coming down: staggered woody knocks and a dry rustle.
    this.tone(180, 0.05, { type: 'triangle', slide: -60, volume: 0.11, delay: 0.2 });
    this.noise(0.07, 0.1, 0.24, { band: 1400 });
    this.tone(150, 0.05, { type: 'triangle', slide: -55, volume: 0.09, delay: 0.34 });
    this.tone(128, 0.05, { type: 'triangle', slide: -45, volume: 0.07, delay: 0.46 });
  }

  /** The counter bell: two soft brass partials over a felt strike. */
  shopBell(): void {
    this.noise(0.02, 0.05, 0, { band: 3000 });
    this.tone(1560, 0.5, { type: 'sine', volume: 0.12, detune: false });
    this.tone(2340, 0.34, { type: 'sine', volume: 0.055, delay: 0.005, detune: false });
  }

  /**
   * THE RAID HORN — a stolen ox-horn, blown once past somebody's
   * fence-line: a breathy attack sliding up into a long two-note hold
   * (root + rough fifth), a beat, then a shorter answering blast. Low
   * sawtooth body under a triangle head, so it reads brassy and cheap
   * — raiders don't own good horns.
   */
  warHorn(): void {
    // The wind-up breath.
    this.noise(0.09, 0.08, 0, { band: 500 });
    // First blast: rise into the held root, fifth stacked rough above.
    this.tone(146, 0.85, { type: 'sawtooth', slide: 22, volume: 0.16 });
    this.tone(150, 0.85, { type: 'triangle', slide: 22, volume: 0.12 });
    this.tone(222, 0.7, { type: 'sawtooth', slide: 18, volume: 0.06, delay: 0.1 });
    // The answering blast, shorter and a shade higher — a crew, not a man.
    this.tone(164, 0.5, { type: 'sawtooth', slide: 14, volume: 0.13, delay: 1.05 });
    this.tone(168, 0.5, { type: 'triangle', slide: 14, volume: 0.09, delay: 1.05 });
  }

  /**
   * THE COUNT SPEAKS — one felt drum per closing second of an arena
   * clock (the last five of a muster or breather): a low timpani
   * touch under a tight leather slap, rising a shade as the gate
   * nears — the beat the stands stamp their feet to.
   */
  arenaCount(secs: number): void {
    const near = Math.max(0, Math.min(4, 5 - secs)); // 0 far .. 4 at the gate
    this.tone(84 + near * 7, 0.24, { type: 'sine', slide: -20, volume: 0.2, detune: false });
    this.noise(0.05, 0.08 + near * 0.015, 0, { band: 900 + near * 160 });
  }

  /** Stepping up to a station: a wooden tap and the tools shifting. */
  stationOpen(): void {
    this.tone(200, 0.05, { type: 'triangle', slide: -70, volume: 0.16 });
    this.noise(0.1, 0.1, 0.02, { band: 1300 });
    this.tone(150, 0.05, { type: 'triangle', slide: -50, volume: 0.1, delay: 0.08 });
  }

  /** Parchment unrolling — the skills scroll, the blueprint sheaf. */
  parchment(): void {
    this.noise(0.14, 0.1, 0, { band: 2100 });
    this.noise(0.12, 0.08, 0.07, { band: 1500 });
    this.tone(320, 0.04, { type: 'triangle', slide: -60, volume: 0.07, delay: 0.12, detune: false });
  }

  /** Going through your things: leather and cloth, a buckle tick. */
  satchel(): void {
    this.noise(0.12, 0.12, 0, { band: 950 });
    this.noise(0.07, 0.08, 0.05, { band: 1600 });
    this.tone(1100, 0.03, { type: 'triangle', volume: 0.05, delay: 0.09, detune: false });
  }

  /** A quiet panel breathing open: two rising sine touches. */
  uiOpen(): void {
    this.tone(440, 0.07, { type: 'sine', volume: 0.09, detune: false });
    this.tone(660, 0.08, { type: 'sine', volume: 0.07, delay: 0.045, detune: false });
  }

  /** …and settling closed: the same pair, descending. */
  uiClose(): void {
    this.tone(520, 0.06, { type: 'sine', volume: 0.08, detune: false });
    this.tone(350, 0.08, { type: 'sine', volume: 0.07, delay: 0.04, detune: false });
  }

  /** A control accepting your press: one soft wooden tap. */
  uiTap(): void {
    this.tone(290, 0.045, { type: 'triangle', slide: -50, volume: 0.12, detune: false });
    this.noise(0.03, 0.05, 0, { band: 1000 });
  }

  /** The pad cursor stepping between controls — barely-there tick. */
  uiTick(): void {
    this.tone(600, 0.025, { type: 'sine', volume: 0.045, detune: false });
  }

  // ---- dialogue cinema ----------------------------------------------

  /** The cinematic frame rising: cloth settles, two warm low touches. */
  dialogueOpen(): void {
    this.noise(0.18, 0.08, 0, { band: 800 });
    this.tone(220, 0.16, { type: 'sine', volume: 0.09, detune: false });
    this.tone(330, 0.18, { type: 'sine', volume: 0.06, delay: 0.08, detune: false });
  }

  /** …and bowing out: the pair descending, a last cloth breath. */
  dialogueClose(): void {
    this.tone(330, 0.1, { type: 'sine', volume: 0.07, detune: false });
    this.tone(196, 0.16, { type: 'sine', volume: 0.08, delay: 0.06, detune: false });
    this.noise(0.12, 0.05, 0.05, { band: 700 });
  }

  /**
   * The typewriter's voice: one quill scratch per few letters —
   * pitch-wobbled noise ticks so a sentence reads as writing, not a
   * metronome. THE QUIET-HANDS LAW applies doubly: this fires dozens
   * of times per line and must stay at the edge of hearing.
   */
  dialogueScratch(): void {
    this.noise(0.02, 0.035, 0, { band: 2400 + Math.random() * 900 });
  }

  /**
   * The foreboding register: the same quill, dropped an octave and
   * dragged — a _grim_ span is HEARD slowing down before it's read.
   */
  dialogueScratchGrim(): void {
    this.noise(0.035, 0.045, 0, { band: 900 + Math.random() * 300 });
  }

  /** A choice plate sliding in — soft parchment tap, one per plate. */
  dialogueChoiceIn(): void {
    this.noise(0.04, 0.05, 0, { band: 1700 });
    this.tone(500, 0.03, { type: 'sine', volume: 0.04, delay: 0.01, detune: false });
  }

  /**
   * A gift landing mid-conversation: two warm bell partials over a
   * felt strike, and a little shimmer — generosity, not a jackpot.
   */
  dialogueGift(): void {
    this.noise(0.03, 0.05, 0, { band: 2600 });
    this.tone(1040, 0.4, { type: 'sine', volume: 0.1, detune: false });
    this.tone(1560, 0.3, { type: 'sine', volume: 0.06, delay: 0.06, detune: false });
    this.tone(2080, 0.22, { type: 'sine', volume: 0.035, delay: 0.12, detune: false });
  }

  /** Gear going on: leather shifts, a clasp snicks, weight settles. */
  equipGear(): void {
    this.noise(0.09, 0.12, 0, { band: 900 });
    this.tone(1350, 0.045, { type: 'triangle', volume: 0.1, delay: 0.03, detune: false });
    this.tone(170, 0.05, { type: 'sine', slide: -40, volume: 0.1, delay: 0.01 });
  }

  /** Gear coming off — the softer reverse. */
  unequipGear(): void {
    this.noise(0.09, 0.1, 0, { band: 800 });
    this.tone(240, 0.05, { type: 'triangle', slide: -70, volume: 0.08, delay: 0.03 });
  }

  /** A bite and a swallow. */
  eat(): void {
    this.tone(300, 0.06, { type: 'triangle', slide: -120, volume: 0.14 });
    this.noise(0.05, 0.1, 0, { band: 700 });
    this.tone(140, 0.07, { type: 'sine', slide: -30, volume: 0.12, delay: 0.12 });
  }

  /** Coin meeting coin — the money jingle, kept polite. */
  coins(): void {
    this.noise(0.06, 0.05, 0, { band: 1200 });
    this.tone(2100, 0.05, { type: 'triangle', volume: 0.1 });
    this.tone(2500, 0.05, { type: 'triangle', volume: 0.08, delay: 0.05 });
    this.tone(2300, 0.05, { type: 'triangle', volume: 0.06, delay: 0.1 });
  }

  /** An item stowed — into the vault, the pack, a new slot. */
  stow(): void {
    this.noise(0.07, 0.1, 0, { band: 750 });
    this.tone(190, 0.05, { type: 'triangle', slide: -50, volume: 0.1 });
  }

  /** An item let go onto the grass: a soft ground thud. */
  dropThud(): void {
    this.tone(120, 0.08, { type: 'sine', slide: -30, volume: 0.16 });
    this.noise(0.06, 0.1, 0.01, { band: 600 });
  }

  /** A seed pressed into worked soil. */
  plantSeed(): void {
    this.noise(0.1, 0.12, 0, { band: 500 });
    this.tone(150, 0.06, { type: 'sine', slide: -40, volume: 0.1, delay: 0.03 });
  }

  /** Construction landing: a solid wooden set-down, knocked twice. */
  buildThump(): void {
    this.tone(105, 0.1, { type: 'sine', slide: -20, volume: 0.22 });
    this.noise(0.08, 0.14, 0, { band: 700 });
    this.tone(240, 0.05, { type: 'triangle', slide: -60, volume: 0.1, delay: 0.1 });
  }

  /**
   * One foot meeting the ground. THE SOFT-STEP LAW: footsteps are felt
   * more than heard — grass is a brush of cloth against blades, stone
   * a small dry contact, never a clop. `vol` arrives gait-scaled from
   * the caller; distance and pan come from the spatial emitter.
   */
  footstep(mat: 'grass' | 'stone' | 'wood' | 'dirt' | 'sand' | 'cave' | 'wet', vol: number): void {
    switch (mat) {
      case 'grass': {
        // THE REAL STEP (v4): synthesis was ruled paper THREE times
        // (fixed-band pair, staggered grains, muted low crush) — this
        // voice is a field recording now, full stop. Five CC0 grass
        // steps (Kenney.nl) dealt round-robin with a breath of rate
        // wobble so no two steps are the identical waveform; the
        // muted synth crush below survives ONLY as the pre-decode
        // fallback for the first beat of a session.
        const name = GRASS_STEPS[this.grassStepIdx++ % GRASS_STEPS.length]!;
        if (this.sample(name, vol * GRASS_STEP_VOL, 0.94 + Math.random() * 0.12)) break;
        this.noise(0.07 + Math.random() * 0.03, vol * 0.5, 0, { band: 650 + Math.random() * 250 });
        this.noise(0.09 + Math.random() * 0.04, vol * 0.32, 0.025, {
          band: 950 + Math.random() * 350,
        });
        break;
      }
      case 'stone':
        this.tone(190, 0.045, { type: 'triangle', slide: -60, volume: vol * 0.7 });
        this.noise(0.035, vol * 0.55, 0, { band: 1400 });
        break;
      case 'wood':
        this.tone(130, 0.06, { type: 'triangle', slide: -40, volume: vol * 0.9 });
        this.noise(0.03, vol * 0.3, 0, { band: 900 });
        break;
      case 'sand':
        this.noise(0.1, vol * 0.7, 0, { band: 1500 });
        break;
      case 'cave':
        // Same dry contact as stone, but the room hears it: the sfx bus
        // send carries the tail, so the echo comes free.
        this.tone(170, 0.05, { type: 'triangle', slide: -55, volume: vol * 0.8 });
        this.noise(0.045, vol * 0.6, 0, { band: 1200 });
        break;
      case 'wet':
        this.noise(0.08, vol * 0.8, 0, { band: 3200 });
        this.tone(300, 0.05, { type: 'sine', slide: -140, volume: vol * 0.4, delay: 0.01 });
        break;
      default:
        // dirt: the soft default thud.
        this.noise(0.06, vol * 0.7, 0, { band: 700 });
        break;
    }
  }

  /**
   * A body stepping into (or out of) shallow water: one honest plunk —
   * a pitched blip swallowed by a short bright spray. One-shot grains
   * only (the granular ambience law: no continuous noise beds, ever).
   */
  splash(vol: number): void {
    this.tone(340, 0.07, { type: 'sine', slide: -180, volume: vol * 0.8 });
    this.noise(0.06, vol, 0.015, { band: 2900 });
    this.noise(0.12, vol * 0.45, 0.05, { band: 2100 });
  }

  /**
   * A flock flushing off the turf: a quick ripple of banded wing puffs
   * (the soft-step dialect — air brushed by feathers, never a clap)
   * climbing slightly in pitch as the birds lift, capped with two tiny
   * alarm chips. One emitter at the flock's centroid; distance and pan
   * come from the spatial law.
   */
  birdFlutter(): void {
    for (let i = 0; i < 7; i++) {
      this.noise(0.045, 0.19 - i * 0.013, i * 0.05, { band: 2300 + i * 240 });
    }
    this.tone(3050, 0.05, { type: 'sine', slide: 420, volume: 0.045, delay: 0.03 });
    this.tone(3400, 0.05, { type: 'sine', slide: -550, volume: 0.035, delay: 0.12 });
  }

  /**
   * One idle chip from a grounded bird — two grains, up then down,
   * quieter and shorter than the ambience bed's songbird phrases so it
   * reads as THIS bird here, not the far chorus.
   */
  birdChip(): void {
    this.tone(3100, 0.045, { type: 'sine', slide: 350, volume: 0.04 });
    this.tone(2750, 0.05, { type: 'sine', slide: -420, volume: 0.03, delay: 0.07 });
  }

  /** The chatter bed's phrase deal cursor (random start per session). */
  private chickenPhraseIdx = Math.floor(Math.random() * CHICKEN_PHRASES.length);

  /**
   * THE HENYARD SPEAKS: one voice from the yard — either the clean
   * single cluck or a phrase dealt from the 41-second field bed of
   * hen chatter (CHICKEN_PHRASES, cut points measured against the
   * recording's own silences), with a breath of rate wobble so the
   * flock never repeats a waveform. Ambient by law: no synth
   * fallback — a cluck the shelf can't sound yet simply doesn't
   * happen, and nobody misses a sound that was never scheduled.
   * Always called inside `spatial()` from the henyard scheduler.
   */
  chicken(): void {
    const rate = 0.97 + Math.random() * 0.08;
    if (Math.random() < 0.45) {
      this.sample('chicken_cluck', 0.55, rate);
      return;
    }
    // Deal phrases round-robin from a shuffled start so back-to-back
    // beats never replay the sentence just heard.
    this.chickenPhraseIdx = (this.chickenPhraseIdx + 1) % CHICKEN_PHRASES.length;
    const [at, end] = CHICKEN_PHRASES[this.chickenPhraseIdx]!;
    this.sample('chicken_chatter', 0.5, rate, { at, dur: end - at });
  }
}

/**
 * The chatter bed's phrases — [start, end] seconds inside
 * chicken_chatter.mp3, measured with ffmpeg silencedetect (−35 dB,
 * 0.4s) so every window opens and closes in the recording's own
 * silences. Nine sentences from one hen yard: quick clucks, longer
 * grumbles, one full monologue — the whole bed stays in the file, so
 * nothing recorded was thrown away to make one-shots.
 */
const CHICKEN_PHRASES: ReadonlyArray<readonly [number, number]> = [
  [0.0, 5.16],
  [5.68, 7.75],
  [8.53, 15.06],
  [15.73, 17.92],
  [18.35, 21.44],
  [22.4, 28.31],
  [28.84, 30.55],
  [31.64, 32.42],
  [33.12, 39.74],
];
