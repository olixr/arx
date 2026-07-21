/**
 * The audio engine — one AudioContext and the WARM MASTER CHAIN every
 * sound in the game rides. Nothing connects to the destination
 * directly: three group buses (sfx / music / ambience) meet at a
 * gentle master low-pass, then a soft compressor, so even a square
 * bleep arrives rounded and sitting in the same room as everything
 * else. A shared convolution reverb (procedurally generated impulse —
 * no audio files anywhere in the project) gives that room its air;
 * each bus carries its own send level into it.
 *
 * THE WARMTH LAW (user verdict: "not high blips and chips — soft and
 * warm"): every path to the speaker passes the master low-pass and the
 * shared room. New sounds get warmth for free; never bypass the chain.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  /** Group buses — dry legs. Route every source through one of these. */
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  ambience: GainNode | null = null;
  /** Per-group reverb sends (already connected to the room). */
  sfxVerb: GainNode | null = null;
  musicVerb: GainNode | null = null;
  ambVerb: GainNode | null = null;
  private master: GainNode | null = null;

  /** Browsers require a user gesture before audio can start. */
  unlock(): void {
    if (this.ctx) return;
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;

      // Master chain: warmth low-pass → soft glue compressor → out.
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass';
      warm.frequency.value = 8200;
      warm.Q.value = 0.4;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 22;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.008;
      comp.release.value = 0.28;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      warm.connect(comp);
      comp.connect(this.master);
      this.master.connect(ctx.destination);

      // The room: a generated stereo impulse — decaying filtered noise.
      const verb = ctx.createConvolver();
      verb.buffer = this.makeImpulse(ctx, 2.3, 3.2);
      const verbGain = ctx.createGain();
      verbGain.gain.value = 0.8;
      verb.connect(verbGain);
      verbGain.connect(warm);

      const bus = (level: number, send: number): [GainNode, GainNode] => {
        const g = ctx.createGain();
        g.gain.value = level;
        g.connect(warm);
        const s = ctx.createGain();
        s.gain.value = send;
        g.connect(s);
        s.connect(verb);
        return [g, s];
      };
      // Combat/action stays present but dry-ish; music lives in the
      // room; ambience sits behind everything.
      [this.sfx, this.sfxVerb] = bus(0.5, 0.16);
      [this.music, this.musicVerb] = bus(0.24, 0.5);
      [this.ambience, this.ambVerb] = bus(0.6, 0.22);
    } catch {
      this.ctx = null;
    }
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /**
   * A concert-hall tail from noise: stereo, exponential decay, with a
   * one-pole low-pass walking downward through the tail so the room
   * darkens as it rings — the signature of a warm space.
   */
  private makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const u = i / len;
        const white = Math.random() * 2 - 1;
        // Darkening low-pass: bright head, muffled tail.
        const k = 0.32 * (1 - u * 0.75);
        lp += k * (white - lp);
        data[i] = lp * Math.exp(-decay * u) * (ch === 0 ? 1 : 0.94);
      }
    }
    return buf;
  }
}
