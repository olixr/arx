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
export type VolumeKind = 'master' | 'music' | 'sfx' | 'ambience' | 'voice';
/** The duckable group buses (master carries no duck — it is the user's). */
export type BusKind = 'sfx' | 'music' | 'tracks' | 'ambience' | 'voice';
/**
 * THE RAIL HAS LANES — who is holding a bus down. `voice` seats the
 * world under a spoken line; `music` settles the ambience back under
 * a sounding track. Each releases only its own lane.
 */
export type DuckSource = 'voice' | 'music';
/**
 * The one place a bus's target gain is computed: tuned base × the
 * driving user slider × the system duck. Pure, so tests can pin the
 * composition law without an AudioContext.
 */
export declare function busLevel(kind: BusKind, userVol: Readonly<Record<VolumeKind, number>>, duck: Readonly<Record<BusKind, number>>): number;
export declare class AudioEngine {
    ctx: AudioContext | null;
    /** Group buses — dry legs. Route every source through one of these. */
    sfx: GainNode | null;
    music: GainNode | null;
    /** Streamed music tracks: nearly dry — mastered audio needs no room. */
    tracks: GainNode | null;
    ambience: GainNode | null;
    /** Spoken lines and quips: close and dry — speech, not room tone. */
    voice: GainNode | null;
    /** Per-group reverb sends (already connected to the room). */
    sfxVerb: GainNode | null;
    musicVerb: GainNode | null;
    tracksVerb: GainNode | null;
    ambVerb: GainNode | null;
    voiceVerb: GainNode | null;
    private master;
    private userVol;
    /**
     * THE DUCK RAIL — the product of every source's hold on each bus,
     * 1 = unducked. Derived from `duckLanes`; only setDuck moves it.
     */
    private duckVol;
    /** THE RAIL HAS LANES — each source's own hold, per bus. */
    private duckLanes;
    /** Browsers require a user gesture before audio can start. */
    unlock(): void;
    /** Set a user volume 0..1 (multiplies the bus's tuned base level). */
    setUserVolume(kind: VolumeKind, v: number): void;
    getUserVolume(kind: VolumeKind): number;
    /**
     * Duck a bus toward `k` (0..1 of its normal level) or release it
     * back to 1, in `source`'s own lane. `tc` shapes the move: quick
     * seat (~0.12) under a line, slow release (~0.2) after, long and
     * scenic (~2.5) when the music settles the world back. The bus
     * takes the product of all lanes, so releasing one hold never
     * lifts another source's. The only lawful system write to gains.
     */
    setDuck(kind: BusKind, k: number, tc?: number, source?: DuckSource): void;
    /** The bus's live hold — the product of every lane. */
    getDuck(kind: BusKind): number;
    private busNode;
    private applyUserVolumes;
    now(): number;
    /**
     * A concert-hall tail from noise: stereo, exponential decay, with a
     * one-pole low-pass walking downward through the tail so the room
     * darkens as it rings — the signature of a warm space.
     */
    private makeImpulse;
}
//# sourceMappingURL=engine.d.ts.map