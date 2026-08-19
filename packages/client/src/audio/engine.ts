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
 *
 * USER VOLUMES: each bus keeps a fixed BASE level (the mix) times a
 * user setting 0..1 (the audio menu). Never write bus gains directly —
 * go through setUserVolume so the mix balance survives.
 *
 * THE DUCK RAIL (voiceover epic amendment): a bus's live gain is
 * BASE × userVol × duck. `duck` defaults to 1 and only setDuck may
 * move it — the system's one lawful multiplier, used to seat music
 * and ambience under a spoken line and release them after. The user's
 * sliders and the system's duck compose; neither ever writes a gain
 * directly, and nothing else touches bus gains at all.
 *
 * THE RAIL HAS LANES (music-pacing pass): more than one system wants
 * the same bus down at the same time — a spoken line seats the
 * ambience, and so does a sounding track. A single scalar made those
 * two clobber each other (a line ending would throw the ambience back
 * to full underneath the music, and a track ending would undo a duck
 * the voice still needed). Each SOURCE now holds its own lane and the
 * bus takes their PRODUCT, so ducks compose instead of racing and
 * every source releases only its own hold.
 */

/**
 * The tuned mix — bus base levels. User sliders multiply these.
 * THE BACKGROUND LAW (user): music is scenery, never the subject —
 * the tracks bus sits low enough by default that speech-of-the-world
 * (SFX, ambience) always reads over it. Tuned by ear + analyser, not
 * by the player's sliders.
 */
const BASE = {
  master: 0.9,
  sfx: 0.5,
  music: 0.17,
  tracks: 0.21,
  ambience: 0.6,
  voice: 0.8,
} as const;

export type VolumeKind = 'master' | 'music' | 'sfx' | 'ambience' | 'voice';
/** The duckable group buses (master carries no duck — it is the user's). */
export type BusKind = 'sfx' | 'music' | 'tracks' | 'ambience' | 'voice';
/**
 * THE RAIL HAS LANES — who is holding a bus down. `voice` seats the
 * world under a spoken line; `music` settles the ambience back under
 * a sounding track. Each releases only its own lane.
 */
export type DuckSource = 'voice' | 'music';

/** Which user slider drives each bus (tracks rides the music slider). */
const SLIDER: Record<BusKind, VolumeKind> = {
  sfx: 'sfx',
  music: 'music',
  tracks: 'music',
  ambience: 'ambience',
  voice: 'voice',
};

/**
 * The one place a bus's target gain is computed: tuned base × the
 * driving user slider × the system duck. Pure, so tests can pin the
 * composition law without an AudioContext.
 */
export function busLevel(
  kind: BusKind,
  userVol: Readonly<Record<VolumeKind, number>>,
  duck: Readonly<Record<BusKind, number>>,
): number {
  return BASE[kind] * userVol[SLIDER[kind]] * duck[kind];
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  /** Group buses — dry legs. Route every source through one of these. */
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  /** Streamed music tracks: nearly dry — mastered audio needs no room. */
  tracks: GainNode | null = null;
  ambience: GainNode | null = null;
  /** Spoken lines and quips: close and dry — speech, not room tone. */
  voice: GainNode | null = null;
  /** Per-group reverb sends (already connected to the room). */
  sfxVerb: GainNode | null = null;
  musicVerb: GainNode | null = null;
  tracksVerb: GainNode | null = null;
  ambVerb: GainNode | null = null;
  voiceVerb: GainNode | null = null;
  private master: GainNode | null = null;
  private userVol: Record<VolumeKind, number> = {
    master: 1,
    music: 1,
    sfx: 1,
    ambience: 1,
    voice: 1,
  };
  /**
   * THE DUCK RAIL — the product of every source's hold on each bus,
   * 1 = unducked. Derived from `duckLanes`; only setDuck moves it.
   */
  private duckVol: Record<BusKind, number> = {
    sfx: 1,
    music: 1,
    tracks: 1,
    ambience: 1,
    voice: 1,
  };
  /** THE RAIL HAS LANES — each source's own hold, per bus. */
  private duckLanes: Record<BusKind, Record<DuckSource, number>> = {
    sfx: { voice: 1, music: 1 },
    music: { voice: 1, music: 1 },
    tracks: { voice: 1, music: 1 },
    ambience: { voice: 1, music: 1 },
    voice: { voice: 1, music: 1 },
  };

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
      // Combat/action stays present but dry-ish; generated music
      // lives in the room; streamed tracks arrive already mastered
      // and take barely any; ambience sits behind everything.
      [this.sfx, this.sfxVerb] = bus(BASE.sfx, 0.16);
      [this.music, this.musicVerb] = bus(BASE.music, 0.5);
      [this.tracks, this.tracksVerb] = bus(BASE.tracks, 0.06);
      [this.ambience, this.ambVerb] = bus(BASE.ambience, 0.22);
      [this.voice, this.voiceVerb] = bus(BASE.voice, 0.06);
      this.applyUserVolumes();
    } catch {
      this.ctx = null;
    }
  }

  /** Set a user volume 0..1 (multiplies the bus's tuned base level). */
  setUserVolume(kind: VolumeKind, v: number): void {
    this.userVol[kind] = Math.max(0, Math.min(1, v));
    this.applyUserVolumes();
  }

  getUserVolume(kind: VolumeKind): number {
    return this.userVol[kind];
  }

  /**
   * Duck a bus toward `k` (0..1 of its normal level) or release it
   * back to 1, in `source`'s own lane. `tc` shapes the move: quick
   * seat (~0.12) under a line, slow release (~0.2) after, long and
   * scenic (~2.5) when the music settles the world back. The bus
   * takes the product of all lanes, so releasing one hold never
   * lifts another source's. The only lawful system write to gains.
   */
  setDuck(kind: BusKind, k: number, tc = 0.12, source: DuckSource = 'voice'): void {
    this.duckLanes[kind][source] = Math.max(0, Math.min(1, k));
    const lanes = this.duckLanes[kind];
    this.duckVol[kind] = lanes.voice * lanes.music;
    const ctx = this.ctx;
    const node = this.busNode(kind);
    if (!ctx || !node) return;
    node.gain.setTargetAtTime(busLevel(kind, this.userVol, this.duckVol), ctx.currentTime, tc);
  }

  /** The bus's live hold — the product of every lane. */
  getDuck(kind: BusKind): number {
    return this.duckVol[kind];
  }

  private busNode(kind: BusKind): GainNode | null {
    switch (kind) {
      case 'sfx':
        return this.sfx;
      case 'music':
        return this.music;
      case 'tracks':
        return this.tracks;
      case 'ambience':
        return this.ambience;
      case 'voice':
        return this.voice;
    }
  }

  private applyUserVolumes(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const set = (node: GainNode | null, target: number): void => {
      node?.gain.setTargetAtTime(target, t, 0.06);
    };
    set(this.master, BASE.master * this.userVol.master);
    for (const kind of ['sfx', 'music', 'tracks', 'ambience', 'voice'] as const) {
      set(this.busNode(kind), busLevel(kind, this.userVol, this.duckVol));
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
