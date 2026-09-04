/**
 * AMBIENT BIRDS — the sky lends a little life.
 *
 * Purely cosmetic, client-side flocks: a few small birds glide in from
 * off-screen, settle on open ground, and live a seeded loop of pecking,
 * hopping and preening — until anything alive walks close, and the
 * whole flock flushes in a ripple and scatters off the map. No loot, no
 * combat, no server: each client keeps its own birds, the way ambience
 * beds keep their own wind.
 *
 * THE FLUSH LAW: birds fear every body equally. The startle scan runs
 * against ALL nearby players and NPCs — so a grazing stag wandering
 * through a flock flushes it exactly like a sprinting hero. The world
 * startles itself; that's what makes it read as alive.
 *
 * Perf: hard caps (2 flocks, 10 birds), squared-distance threat tests,
 * zero per-frame allocation in steady state, and every painter is a
 * couple dozen path ops on a body smaller than a boot. Grounded birds
 * y-sort with the world; airborne birds ride over it. The brand ring is
 * the debris treatment: one round-joined under-stroke of the silhouette
 * (the surviving outer half IS the dilation) — no offscreen, no cache.
 */
export type BirdMode = 'flyin' | 'ground' | 'scatter' | 'pass';
export interface BirdSpecies {
    /** Base body tone — muted, sits in the meadow. */
    body: string;
    /** Lit crown/back facet. */
    lit: string;
    /** Folded-wing / flight-feather tone. */
    wing: string;
    /** Breast patch. */
    chest: string;
    /** Beak horn. */
    beak: string;
}
type GroundBeat = 'stand' | 'peck' | 'hop' | 'preen';
export interface Bird {
    x: number;
    y: number;
    /** Altitude in tiles; 0 = feet on the turf. */
    alt: number;
    mode: BirdMode;
    species: BirdSpecies;
    /** Screen-mirror facing: 1 = beak right. */
    dir: 1 | -1;
    /** Personal clock offset so no two birds keep the same beat. */
    phase: number;
    /** Wingbeat phase (radians). */
    flap: number;
    /** Landing target while flying in. */
    landX: number;
    landY: number;
    /** Hold before entering the world (staggers the fly-in line). */
    delay: number;
    /** Ground behavior. */
    beat: GroundBeat;
    beatT: number;
    beatDur: number;
    hopFromX: number;
    hopFromY: number;
    hopToX: number;
    hopToY: number;
    /** Scatter: per-bird flush stagger + committed heading + speed. */
    scatterDelay: number;
    headX: number;
    headY: number;
    speed: number;
    /** Seconds alive in scatter (hard despawn backstop). */
    scatterT: number;
    /** World-plane velocity + climb rate, tracked every sim step — the
     *  draw pass orients the body along the TRUE path, not a mirror. */
    vx: number;
    vy: number;
    vAlt: number;
    /** Wings set (gliding) vs beating — the plan view spreads held wings. */
    gliding: boolean;
}
/**
 * Everything the sim needs from the frame, handed in by the renderer.
 * The object is REUSED across frames (scratch-pool law) — the bird
 * system reads it synchronously inside update() and keeps nothing.
 */
export interface BirdEnv {
    tSec: number;
    /** Visible ground bounds (tiles) — spawn spots land inside these. */
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
    /** No new flocks after dark or under the earth; standing flocks leave. */
    night: boolean;
    underground: boolean;
    /** True when (tx,ty) is open natural ground a bird may stand on. */
    groundOk: (tx: number, ty: number) => boolean;
    /** Every body that can startle a bird, positions in world tiles. */
    threats: ReadonlyArray<{
        x: number;
        y: number;
    }>;
    threatCount: number;
}
export declare class Birds {
    /** Fired once per flush, at the flock's centroid — wing flutter sfx. */
    onFlutter: ((x: number, y: number) => void) | null;
    /** Fired for sparse idle chips from a grounded bird. */
    onChirp: ((x: number, y: number) => void) | null;
    private readonly flocks;
    private nextTryAt;
    private nextPassAt;
    /** Total live birds (Playwright probes read this via dcRenderer.birds). */
    get count(): number;
    /** Live flocks, for dev probes. */
    flockStates(): Array<{
        mode: BirdMode;
        birds: number;
        x: number;
        y: number;
    }>;
    /** Force-spawn a flock near the view center (staging lever). */
    debugSpawn(env: BirdEnv, n?: number): boolean;
    update(dt: number, env: BirdEnv): void;
    private trySpawnFlock;
    private spawnPass;
    private makeBird;
    private stepFlyIn;
    private stepGround;
    private stepAway;
    private isGone;
    private checkStartle;
    /** The whole flock flushes in a ripple, headings fanned away from the threat. */
    private flush;
    /** Birds standing in the world — y-sorted with everything else. */
    grounded(): IterableIterator<Bird>;
    /** Birds on the wing — drawn over the world pass. */
    airborne(): IterableIterator<Bird>;
    drawOne(ctx: CanvasRenderingContext2D, b: Bird, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number, outlined: boolean, tSec: number, 
    /** B-1c depth thread: per-item depth factor (ds=1 at q=0). */
    depthAt?: (wy: number) => number): void;
    /**
     * The grounded bird: one faceted silhouette (body+head+tail+beak),
     * the brand ring under it, then flat tone facets on top. Pecking
     * bows the head cluster down and forward; preening turns it back
     * over the shoulder.
     */
    private paintGrounded;
    /**
     * The flying bird: far wing behind the body, near wing in front,
     * both riding one flap phase. Wings are chamfered slabs pivoting at
     * the shoulder — up-beat sweeps high, down-beat spreads flat.
     */
    private paintFlying;
    /**
     * The plan view: the bird from the tilted sky, nose along +x, drawn
     * CENTERED on the origin and fully symmetric — the caller rotates it
     * to the world heading and the camera squash foreshortens it, so it
     * serves every compass direction. Wings beat by sweeping span in and
     * out (the flap reads as reach from above); set wings hold wide.
     */
    private paintPlan;
}
export {};
//# sourceMappingURL=birds.d.ts.map