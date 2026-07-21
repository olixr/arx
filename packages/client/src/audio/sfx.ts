import type { AudioEngine } from './engine.js';

/**
 * Procedural WebAudio SFX — no audio files, everything synthesized.
 * Kept short and soft; a local family server doesn't need ear-splitters.
 * Every sound rides the engine's sfx bus, which carries the warmth
 * low-pass, the glue compressor, and a touch of the shared room —
 * that shared air is what keeps synthesized blips from reading as
 * "computer noises" on top of the world instead of sounds inside it.
 */
export class Sfx {
  constructor(private engine: AudioEngine) {}

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
    const out = this.engine.sfx;
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
    const out = this.engine.sfx;
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

  collect(): void {
    this.tone(520, 0.07, { type: 'triangle', volume: 0.3 });
    this.tone(780, 0.09, { type: 'triangle', volume: 0.3, delay: 0.06 });
  }

  levelUp(): void {
    const notes = [392, 523, 659, 784];
    notes.forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', volume: 0.35, delay: i * 0.09 }));
  }

  portal(): void {
    this.tone(220, 0.4, { type: 'sine', slide: 440, volume: 0.3 });
    this.tone(140, 0.4, { type: 'sine', slide: 260, volume: 0.25, delay: 0.05 });
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

  /**
   * One foot meeting the ground. THE SOFT-STEP LAW: footsteps are felt
   * more than heard — grass is a brush of cloth against blades, stone
   * a small dry contact, never a clop. `vol` arrives distance- and
   * gait-scaled from the caller; everything here stays under it.
   */
  footstep(mat: 'grass' | 'stone' | 'wood' | 'dirt' | 'sand' | 'cave' | 'wet', vol: number, pan = 0): void {
    switch (mat) {
      case 'grass':
        // Two tiny brushed puffs — the blade rustle the user asked for.
        this.noise(0.055, vol * 0.9, 0, { band: 2600, pan });
        this.noise(0.09, vol * 0.5, 0.035, { band: 1900, pan });
        break;
      case 'stone':
        this.tone(190, 0.045, { type: 'triangle', slide: -60, volume: vol * 0.7, pan });
        this.noise(0.035, vol * 0.55, 0, { band: 1400, pan });
        break;
      case 'wood':
        this.tone(130, 0.06, { type: 'triangle', slide: -40, volume: vol * 0.9, pan });
        this.noise(0.03, vol * 0.3, 0, { band: 900, pan });
        break;
      case 'sand':
        this.noise(0.1, vol * 0.7, 0, { band: 1500, pan });
        break;
      case 'cave':
        // Same dry contact as stone, but the room hears it: the sfx bus
        // send carries the tail, so the echo comes free.
        this.tone(170, 0.05, { type: 'triangle', slide: -55, volume: vol * 0.8, pan });
        this.noise(0.045, vol * 0.6, 0, { band: 1200, pan });
        break;
      case 'wet':
        this.noise(0.08, vol * 0.8, 0, { band: 3200, pan });
        this.tone(300, 0.05, { type: 'sine', slide: -140, volume: vol * 0.4, delay: 0.01, pan });
        break;
      default:
        // dirt: the soft default thud.
        this.noise(0.06, vol * 0.7, 0, { band: 700, pan });
        break;
    }
  }
}
