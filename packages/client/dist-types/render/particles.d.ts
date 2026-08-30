/**
 * Pooled particle engine — the combat-FX workhorse.
 *
 * Everything stays on brand: hard-edged quads, no blur, no gradients.
 * Nine silhouettes cover the whole vocabulary:
 *  - square: the classic chunk (debris, dust, coals)
 *  - streak: a velocity-stretched sliver (sparks, rain, speed lines)
 *  - shard:  a spinning slab (ice, bone, leaves — tumbling matter)
 *  - lick:   a tapered flame tongue riding its velocity, width
 *            breathing on its own phase — fire that BURNS
 *  - puff:   a three-lobe billow cluster — smoke and mist with
 *            volume, still hard-edged
 *  - glint:  a crossed-sliver twinkle that scale-pulses — frost
 *            sparkle, starlight, arcane motes
 *  - mote:   the puff idiom with round lobes — vapour has no corners
 *  - drop:   a faceted teardrop riding its velocity, fattening as it
 *            slows — venom beads, blood gobbets, rain (THE LIQUID LAW)
 *  - bolt:   a seeded jagged arc between two anchors that re-strikes
 *            on its own beat, never per frame (THE ARC LAW)
 *
 * THE LIVING MATTER LAW: matter tells its whole life. The ramp
 * (`fade`/`fade2`/`fade3`) hard-switches through up to three cooling
 * colors — ember → dark red → soot, never a soft blend; `trail` sheds
 * micro-motes along the flight arc; `wobble` staggers rising smoke
 * off its rails. All pool-friendly fields — no closures, no
 * allocation.
 *
 * HEIGHT IS REAL (v5): `z` is altitude in tiles, rendered at FULL
 * scale (heights are never yScale-squashed — the ragdoll precedent).
 * `(x, y)` stays the ground anchor: it drives the y-sort, the contact
 * shadow, and the landing. `zg` pulls matter back to the dirt, where
 * `land` says what happens: die, settle into ground dust, bounce, or
 * splat into spatter + a lingering fleck. Landings are also queued as
 * plain records for the renderer/matter layer to voice (stains, sfx).
 *
 * THE WORLD LAYER (v5): a particle lives on one of three layers —
 * 'overlay' (over the scene, the classic pass), 'world' (y-sorted
 * with the entities so a ring's north arc passes BEHIND the body),
 * or 'ground' (y-sorted floor dust, the old `ground` flag). Airborne
 * world matter paints its own contact shadow, debris-style.
 *
 * EMITTERS ARE THE GRAMMAR (v5): pooled emitter records (never
 * closures) spawn sustained matter — point / ring / rim / path /
 * cone / orbit arrangements × an attack/sustain/release envelope ×
 * up to three grain populations (THE FINE GRAIN LAW: fines carry the
 * texture, body grains the mass, sparse heroes the story).
 *
 * Perf discipline: live particles are swap-removed and dead objects
 * recycled through a free list — zero allocation once the pool warms.
 * At the cap, new spawns overwrite a rotating slot instead of
 * pushing; a detonation storm can never grow the heap or the draw
 * bill. The overlay pass draws in (shape, color) buckets so a storm
 * of one material costs one fillStyle set, not thousands.
 */
export declare const PARTICLE_CAP = 2600;
export declare const EMITTER_CAP = 48;
/** Landing records queued per frame before the oldest is recycled. */
export declare const LANDING_CAP = 48;
export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Altitude in tiles, drawn at FULL scale (never squashed). */
    z: number;
    /** Vertical velocity, tiles/sec (+ = rising). */
    vz: number;
    /** Z-gravity, tiles/s² pulling altitude back to the dirt. 0 = planar. */
    zg: number;
    /** What happens at z = 0 (falling): LAND_* code. */
    land: number;
    /** Restitution for LAND_BOUNCE, 0..1. */
    bounce: number;
    /** First ground contact already happened (bounce thud fires once). */
    landed: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    /** Bucket id of `color` — overlay draw sorts on it. */
    colorId: number;
    gravity: number;
    /** Per-second velocity damping — lets dust billow out and settle. */
    drag: number;
    /** 0 = shrink over life (default); >0 = grow by this many tiles/sec. */
    grow: number;
    /** SHAPE_ID value. */
    shape: number;
    /** Shard spin rate, rad/s (shards only). */
    spin: number;
    /** Shard orientation, advanced by spin. */
    rot: number;
    /** Strobe weight 0..1 — embers and arcs shimmer, dust doesn't. */
    flicker: number;
    /** Deterministic phase so flicker never syncs across a burst. */
    phase: number;
    /** Cooling ramp — hard band-switches, never blends ('' = never). */
    fade: string;
    fadeAt: number;
    fade2: string;
    fade2At: number;
    fade3: string;
    fade3At: number;
    /** Micro-motes shed per second along the flight arc (0 = none). */
    trail: number;
    /** The shed motes' color ('' = the parent's own). */
    trailColor: string;
    /** Lateral sinusoidal drift amplitude, tiles/sec (rising smoke). */
    wobble: number;
    /** LAYER_* code: 0 overlay, 1 world (y-sorted), 2 ground. */
    layer: number;
    /** Contact-shadow weight 0..1 for airborne world matter. */
    shadow: number;
    /** Far anchor — bolt arcs strike from (x,y,z) to (x2,y2,z2). */
    x2: number;
    y2: number;
    z2: number;
    /** Bolt re-strikes per second (geometry re-seeds on the beat). */
    boltRate: number;
    /** Branch weight 0..1 — stubs forking off the main arc. */
    boltBranch: number;
}
export declare const LAND_NONE = 0;
export declare const LAND_DIE = 1;
export declare const LAND_SETTLE = 2;
export declare const LAND_BOUNCE = 3;
export declare const LAND_SPLAT = 4;
export declare const LAYER_OVERLAY = 0;
export declare const LAYER_WORLD = 1;
export declare const LAYER_GROUND = 2;
export type ParticleLayer = 'overlay' | 'world' | 'ground';
export type LandKind = 'none' | 'die' | 'settle' | 'bounce' | 'splat';
export interface BurstOpts {
    speed?: number;
    life?: number;
    size?: number;
    gravity?: number;
    up?: boolean;
    /** Emit in a cone around this angle (radians) instead of a circle. */
    dir?: number;
    spread?: number;
    /** Per-second velocity damping (dust rolls out and stops). */
    drag?: number;
    /** Tiles/sec the block grows instead of shrinking (billowing dust). */
    grow?: number;
    /** Back-compat: `ground: true` = the 'ground' layer. */
    ground?: boolean;
    /** Which pass draws this matter (default 'overlay'). */
    layer?: ParticleLayer;
    /** Silhouette. */
    shape?: 'square' | 'streak' | 'shard' | 'lick' | 'puff' | 'glint' | 'mote' | 'drop' | 'bolt';
    /** Shard tumble rate, rad/s. */
    spin?: number;
    /** Strobe weight 0..1 — embers/arcs shimmer as they live. */
    flicker?: number;
    /** Cooling ramp stop 1 — hard switch at `fadeAt` (default 55%). */
    fade?: string;
    fadeAt?: number;
    /** Cooling ramp stop 2 — hard switch at `fade2At` (default 78%). */
    fade2?: string;
    fade2At?: number;
    /** Cooling ramp stop 3 — hard switch at `fade3At` (default 92%). */
    fade3?: string;
    fade3At?: number;
    /** Micro-motes shed per second along the arc (comet tails). */
    trail?: number;
    /** Shed-mote color (defaults to the parent's own color). */
    trailColor?: string;
    /** Lateral sinusoidal stagger, tiles/sec — rising smoke, wisps. */
    wobble?: number;
    /** Spawn altitude in tiles (full scale). */
    z?: number;
    /** Initial vertical velocity, tiles/sec (+ = up). Jittered like speed. */
    vz?: number;
    /** Z-gravity, tiles/s². >0 = thrown matter comes back down. */
    zg?: number;
    /** Ground-contact behavior once falling reaches z=0. */
    land?: LandKind;
    /** Restitution for land:'bounce' (default 0.45). */
    bounce?: number;
    /** Contact-shadow weight for airborne world matter (default on). */
    shadow?: number;
    /** Bolt far anchor (world coords + altitude). */
    x2?: number;
    y2?: number;
    z2?: number;
    /** Bolt re-strike beats per second (default 9). */
    boltRate?: number;
    /** Bolt branch weight 0..1 (default 0.5). */
    boltBranch?: number;
}
/**
 * The cooling ramp, resolved for life fraction t. Hard band-switches
 * only — matter cools in steps, it never airbrushes.
 */
export declare function rampColor(p: Particle, t: number): string;
/** A ground contact worth voicing (stain decals, thud sfx). */
export interface Landing {
    x: number;
    y: number;
    color: string;
    size: number;
    /** 'splat' | 'bounce' — settle/die land silently. */
    kind: number;
}
export declare const LANDING_SPLAT = 0;
export declare const LANDING_BOUNCE = 1;
export type EmitterKind = 'point' | 'ring' | 'rim' | 'path' | 'cone' | 'orbit' | 'disc';
/**
 * One grain population. THE FINE GRAIN LAW: real matter is mostly
 * fines with a few heroes — an emitter carries up to three of these,
 * each a shared frozen template (records, never closures).
 */
export interface EmitterPop {
    colors: string[];
    opts: BurstOpts;
    /** Relative share of the emitter's rate (default 1). */
    weight?: number;
}
export interface EmitterOpts {
    kind?: EmitterKind;
    x: number;
    y: number;
    z?: number;
    /** Far anchor for 'path'. */
    x2?: number;
    y2?: number;
    /** Ring/rim/orbit radius in tiles. */
    radius?: number;
    /** Cone heading override (falls back to each pop's own dir). */
    dir?: number;
    spread?: number;
    /** Particles/sec across all populations at full envelope. */
    rate: number;
    /** Emitter lifetime, seconds (clamped to 12 — nothing leaks forever). */
    dur: number;
    /** Envelope ramp-in, seconds (default 0.06). */
    attack?: number;
    /** Envelope ramp-out tail before dur ends (default 0.2). */
    release?: number;
    /** Orbit head speed, rad/s (default 5). */
    orbitSpeed?: number;
    /**
     * Rim radial speed, tiles/sec (defaults to each pop's own speed).
     * NEGATIVE converges — matter gathers INTO the heart (charge-up).
     */
    outward?: number;
    pops: EmitterPop[];
}
/** Live emitter record — mutate x/y to follow a body, stop() to end. */
export interface Emitter {
    alive: boolean;
    kind: number;
    x: number;
    y: number;
    z: number;
    x2: number;
    y2: number;
    radius: number;
    dir: number;
    spread: number;
    rate: number;
    age: number;
    dur: number;
    attack: number;
    release: number;
    orbitSpeed: number;
    orbitA: number;
    outward: number;
    hasDir: boolean;
    hasOutward: boolean;
    /** Shared frozen population templates (reference, not copy). */
    pops: EmitterPop[] | null;
    /** Per-population fractional emission carry (max 3 pops). */
    acc0: number;
    acc1: number;
    acc2: number;
    stop(): void;
}
export declare class Particles {
    private readonly rand;
    private readonly pool;
    private readonly free;
    private capCursor;
    private readonly emitters;
    private readonly emitterFree;
    private readonly landings;
    private landingCount;
    /** color string → bucket id; palettes are small, this stays small. */
    private readonly colorIds;
    /** Reused overlay draw order — (shape, color)-bucketed indices. */
    private readonly drawOrder;
    private batching;
    private lastFill;
    constructor(rand?: () => number);
    private colorIdOf;
    private take;
    burst(x: number, y: number, count: number, colors: string[], opts?: BurstOpts): void;
    /**
     * The one spawn door. Emitter arrangements steer heading/speed per
     * spawn point through the overrides — shared templates stay frozen.
     */
    private spawnOne;
    emit(opts: EmitterOpts): Emitter;
    /** Live emitter count (tests + budget audits). */
    emitterCount(): number;
    private updateEmitters;
    private emitOne;
    private pushLanding;
    /**
     * Hand this frame's ground contacts to the caller (stain decals,
     * thud sfx) and clear the queue. Call once per frame after update.
     */
    drainLandings(fn: (l: Landing) => void): void;
    update(dt: number): void;
    /**
     * Ground contact. Returns false when the particle was removed (the
     * update loop must not touch it again).
     */
    private touchGround;
    private kill;
    /**
     * A comet sheds: drop a micro-mote where the parent flies. The mote
     * is a plain cooling square with high drag — it hangs a beat and
     * dies. Spawned THROUGH the pool (cap law holds; appended motes
     * are simply visited next frame).
     */
    private shedMote;
    /**
     * The overlay pass: airborne screen-dressing. World and ground
     * particles are skipped here — the renderer y-sorts them. Draws in
     * (shape, color) buckets: a storm of one material costs one
     * fillStyle set instead of thousands.
     */
    draw(ctx: CanvasRenderingContext2D, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
    /**
     * The renderer's world pass marks a RUN of consecutive particle
     * items (nothing else touches fillStyle inside a run), so setFill
     * can dedupe across bulk-lane draws exactly like the overlay batch.
     */
    beginRun(): void;
    endRun(): void;
    private setFill;
    drawOne(ctx: CanvasRenderingContext2D, p: Particle, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
    /**
     * THE ARC LAW: a jagged polyline from (x,y,z) to (x2,y2,z2), deep
     * halo under a hot core, two branch stubs. Geometry re-seeds on the
     * strike beat (boltRate/sec) — NEVER per frame — so each strike
     * hangs long enough to read, then the arc visibly re-forms.
     */
    private drawBolt;
    /** Scratch bolt node buffers — reused, never allocated per frame. */
    private readonly boltNx;
    private readonly boltNy;
    /**
     * THE CROSSING: every live grain dies where it flew and every
     * emitter falls silent — particles are position-keyed matter, and a
     * survivor would rain another plane's weather here. The dead return
     * to the free lists, so the warm pool stays warm; the landing queue
     * empties too (those contacts happened on ground we just left).
     */
    clear(): void;
    /** Live particle count (tests + budget audits). */
    count(): number;
    /**
     * The raw pool for the renderer's collect pass — indexed loops over
     * this replaced the ground/world generators, which minted an
     * iterator plus a result object per particle per frame.
     */
    livePool(): readonly Particle[];
    /** Every live particle, all layers (tests + budget audits). */
    live(): IterableIterator<Particle>;
    /** Live particles on the ground layer, for the world y-sort. */
    groundParticles(): IterableIterator<Particle>;
    /**
     * Live particles on the world layer — airborne matter that y-sorts
     * WITH the bodies, so a ring's north arc passes behind the caster.
     */
    worldParticles(): IterableIterator<Particle>;
}
//# sourceMappingURL=particles.d.ts.map