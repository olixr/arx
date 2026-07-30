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
 * Procedural WebAudio SFX — no audio files, everything synthesized.
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
   * The level-up fanfare — a ceremony, not a blip: a grounded thump
   * the moment lands on, a four-note herald climbing the major triad,
   * then the full chord planted on top with a glitter tail. Sized to
   * the world show (~5.6s of pillar and rings) without overstaying.
   */
  levelUp(): void {
    // The ground beat: the moment arrives with weight.
    this.tone(72, 0.22, { type: 'sine', slide: -24, volume: 0.38, detune: false });
    this.noise(0.12, 0.1);
    // The herald climbs: G4 B4 D5 G5.
    const notes = [392, 494, 587, 784];
    notes.forEach((f, i) =>
      this.tone(f, 0.16, { type: 'triangle', volume: 0.3, delay: 0.06 + i * 0.085, detune: false }),
    );
    // The chord plants the flag: root-third-fifth held together, a
    // soft sine octave underneath for warmth.
    const chordAt = 0.06 + 4 * 0.085;
    for (const f of [784, 988, 1175]) {
      this.tone(f, 0.8, { type: 'triangle', volume: 0.2, delay: chordAt, detune: false });
    }
    this.tone(392, 0.8, { type: 'sine', volume: 0.18, delay: chordAt, detune: false });
    // Glitter: two high sparkles answering, and a bright hiss of air.
    this.tone(1568, 0.3, { type: 'triangle', volume: 0.11, delay: chordAt + 0.28, detune: false });
    this.tone(2093, 0.35, { type: 'triangle', volume: 0.08, delay: chordAt + 0.46, detune: false });
    this.noise(0.5, 0.045, chordAt, { band: 5200 });
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

  /** Dodge dash: a short breathy whoosh. */
  dash(): void {
    this.noise(0.13, 0.22);
    this.tone(180, 0.12, { type: 'sine', slide: 240, volume: 0.18 });
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
      case 'grass':
        // Two tiny brushed puffs — the blade rustle the user asked for.
        this.noise(0.055, vol * 0.9, 0, { band: 2600 });
        this.noise(0.09, vol * 0.5, 0.035, { band: 1900 });
        break;
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
}
