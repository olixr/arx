/**
 * Pooled particle engine — the combat-FX workhorse.
 *
 * Everything stays on brand: hard-edged quads, no blur, no gradients.
 * Six silhouettes cover the whole vocabulary:
 *  - square: the classic chunk (debris, dust, coals)
 *  - streak: a velocity-stretched sliver (sparks, rain, speed lines)
 *  - shard:  a spinning slab (ice, bone, leaves — tumbling matter)
 *  - lick:   a tapered flame tongue riding its velocity, width
 *            breathing on its own phase — fire that BURNS
 *  - puff:   a three-lobe billow cluster — smoke and mist with
 *            volume, still hard-edged
 *  - glint:  a crossed-sliver twinkle that scale-pulses — frost
 *            sparkle, starlight, arcane motes
 *
 * THE LIVING MATTER LAW: matter tells its whole life. `fade` hard-
 * switches a particle to its cooling color late in life (ember →
 * soot, ice → mist, blood dries dark); `trail` sheds micro-motes
 * along the flight arc (gobbets become comets); `wobble` staggers
 * rising smoke off its rails. All three are pool-friendly fields —
 * no closures, no allocation.
 *
 * Perf discipline: live particles are swap-removed and dead objects
 * recycled through a free list — zero allocation once the pool warms.
 * At the cap, new spawns overwrite a rotating slot instead of pushing;
 * a detonation storm can never grow the heap or the draw bill.
 */
export declare const PARTICLE_CAP = 1400;
export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    gravity: number;
    /** Per-second velocity damping — lets dust billow out and settle. */
    drag: number;
    /** 0 = shrink over life (default); >0 = grow by this many tiles/sec. */
    grow: number;
    /** 0 square, 1 streak (velocity-stretched), 2 shard (spinning slab). */
    shape: number;
    /** Shard spin rate, rad/s (shards only). */
    spin: number;
    /** Shard orientation, advanced by spin. */
    rot: number;
    /** Strobe weight 0..1 — embers and arcs shimmer, dust doesn't. */
    flicker: number;
    /** Deterministic phase so flicker never syncs across a burst. */
    phase: number;
    /** Cooling color — hard band-switch at 55% life ('' = never). */
    fade: string;
    /** Micro-motes shed per second along the flight arc (0 = none). */
    trail: number;
    /** The shed motes' color ('' = the parent's own). */
    trailColor: string;
    /** Lateral sinusoidal drift amplitude, tiles/sec (rising smoke). */
    wobble: number;
    /**
     * Ground-hugging particles (footfall dust) join the renderer's
     * y-sort as world items instead of the overlay pass — a trail left
     * behind a south-running body must paint UNDER the body.
     */
    ground: boolean;
}
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
    /** Y-sort with the world (ground dust) instead of drawing on top. */
    ground?: boolean;
    /** Silhouette: 'square' (default) | 'streak' | 'shard' | 'lick' | 'puff' | 'glint'. */
    shape?: 'square' | 'streak' | 'shard' | 'lick' | 'puff' | 'glint';
    /** Shard tumble rate, rad/s. */
    spin?: number;
    /** Strobe weight 0..1 — embers/arcs shimmer as they live. */
    flicker?: number;
    /** Cooling color — the particle hard-switches to it at 55% life. */
    fade?: string;
    /** Micro-motes shed per second along the arc (comet tails). */
    trail?: number;
    /** Shed-mote color (defaults to the parent's own color). */
    trailColor?: string;
    /** Lateral sinusoidal stagger, tiles/sec — rising smoke, wisps. */
    wobble?: number;
}
export declare class Particles {
    private readonly pool;
    private readonly free;
    private capCursor;
    private take;
    burst(x: number, y: number, count: number, colors: string[], opts?: BurstOpts): void;
    update(dt: number): void;
    /**
     * A comet sheds: drop a micro-mote where the parent flies. The mote
     * is a plain cooling square with high drag — it hangs a beat and
     * dies. Spawned THROUGH the pool (cap law holds; appended motes
     * are simply visited next frame).
     */
    private shedMote;
    /** The overlay pass: everything airborne. Ground particles are
     * skipped here — the renderer y-sorts them into the world. */
    draw(ctx: CanvasRenderingContext2D, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
    drawOne(ctx: CanvasRenderingContext2D, p: Particle, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number): void;
    /** Live particles flagged for the world y-sort. */
    groundParticles(): IterableIterator<Particle>;
}
//# sourceMappingURL=particles.d.ts.map