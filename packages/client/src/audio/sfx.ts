/**
 * Procedural WebAudio SFX — no audio files, everything synthesized.
 * Kept short and soft; a local family server doesn't need ear-splitters.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  /** Browsers require a user gesture before audio can start. */
  unlock(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private tone(
    freq: number,
    duration: number,
    opts: { type?: OscillatorType; slide?: number; volume?: number; delay?: number; detune?: boolean } = {},
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type ?? 'square';
    // A pinch of random detune keeps repeated combat sounds organic.
    if (opts.detune !== false) freq *= 1 + (Math.random() - 0.5) * 0.07;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + opts.slide), t0 + duration);
    gain.gain.setValueAtTime(opts.volume ?? 0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(duration: number, volume = 0.3, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(gain);
    gain.connect(this.master);
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
}
