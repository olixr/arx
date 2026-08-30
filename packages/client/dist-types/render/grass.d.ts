export interface WindSample {
    /** Bend vector in world tiles (unit cantilever at reference height). */
    bx: number;
    by: number;
    /** Scalar strength ~[-0.6, 1.4] — what the trees lean on. */
    s: number;
    /**
     * Luminance wave ~[-1, 1]: a much LONGER-wavelength signal than the
     * bend, so the shimmer arrives as broad rolling swaths of light —
     * never per-blade sparkle or screen-sized blotches.
     */
    l: number;
}
/**
 * Coherent vector wind: two travelling swells over a breathing gust
 * envelope, with the front's phase BENT by a slow cross-wave (fronts
 * curve like real weather) and a perpendicular meander (swaths snake
 * sideways as they pass). Pure function of position + time.
 */
export declare function windAtInto(out: WindSample, wx: number, wy: number, tSec: number): WindSample;
export declare function windAt(wx: number, wy: number, tSec: number): WindSample;
/**
 * Scalar wind for anything that only bends one way (the trees). Same
 * formula as windAt's `s` — inlined WITHOUT the meander/luminance
 * terms, because tree canopies sample this per cluster per frame and
 * the discarded sines were ~40% of the call.
 */
export declare function windScalarAt(wx: number, wy: number, tSec: number): number;
export interface Blade {
    bx: number;
    by: number;
    h: number;
    w: number;
    lean: number;
    phase: number;
    bin: number;
    lumJit: number;
    tone: number;
    seg2: boolean;
}
export interface Flower {
    bx: number;
    by: number;
    h: number;
    size: number;
    pal: number;
    phase: number;
}
/** A wild grain stalk: thin stem streaming in the wind, gold ear at the tip. */
export interface SeedHead {
    bx: number;
    by: number;
    h: number;
    size: number;
    lean: number;
    phase: number;
    bin: number;
}
export interface GrassTileGeom {
    /** Short blades — always drawn under entities. */
    under: Blade[];
    /** Tall blades split at the tile's midline for y-sorting. */
    north: Blade[];
    south: Blade[];
    /** Clump crowns: dark root chips anchoring dense tufts. */
    roots: Array<{
        x: number;
        y: number;
        w: number;
    }>;
    flowers: Flower[];
    seeds: SeedHead[];
}
/**
 * Deterministic geometry for one grass tile. THE COAT lays a dense low
 * nap on every tile (density riding the lush field), then coverage
 * noise deals the accent hand above it: strands / stand / clump.
 * Detail.Tuft forces a clump, Detail.Flowers plants a bloom patch, a
 * low-frequency meadow noise scatters lone flowers so they gather into
 * natural drifts, and a prairie field raises seed-head stalks in
 * golden reaches.
 */
export declare function generateGrassTile(tx: number, ty: number, tileId: number, detailId: number, snowMask?: number): GrassTileGeom;
/** Radial falloff of a body pushing into grass: 1 at center, 0 at R. */
export declare function disturbFalloff(dist: number, radius: number): number;
export interface Disturber {
    id: number | 'own';
    x: number;
    y: number;
    r: number;
}
type WTS = (wx: number, wy: number) => {
    x: number;
    y: number;
};
type Sampler = (tx: number, ty: number) => number | undefined;
type DetailFn = (tx: number, ty: number) => number;
export interface GrassBounds {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}
export declare class GrassSystem {
    private readonly tiles;
    /** Position → live state, for waking tiles bodies move through. */
    private readonly posIndex;
    /**
     * THE CROSSING: every tuft and disturbance is position-keyed on the
     * CURRENT plane — a plane switch drops the meadow whole, or another
     * world's grass would sway here.
     */
    dropWorld(): void;
    private readonly lastPos;
    private live;
    private tSec;
    private nowMs;
    private paths;
    /**
     * GRASS CASTS. Every blade tall enough to read appends one sheared
     * ground quad here during the under pass — base at the root, tip
     * thrown (kx, ky) px per px of height past the wind-bent crown, so
     * shadows sway with the SAME gusts as their blades. The renderer
     * fills the whole meadow's shadow in ONE path into the shared
     * shadow layer (merge law: overlaps never stack), where props'
     * shadows and the interior punch-out already live.
     */
    private shadowPath;
    private shKx;
    private shKy;
    private shOn;
    private touched;
    private touchedFlag;
    /** Disturbers near the tile currently being built. */
    private near;
    /**
     * THE CALM CANVAS. Re-tessellating every visible blade every frame
     * cost ~2ms steady at 0.85× zoom (and its allocation churn drew GC
     * pauses of up to 15ms into this very pass) — and even the Path2D
     * cache that fixed THAT still re-FILLED every bucket every frame,
     * which is what kept the meadow's density starved. A calm meadow
     * only MOVES at wind rate — so the under-layer now RENDERS all
     * undisturbed tiles into an offscreen canvas at UNDER_CACHE_MS
     * cadence (~15Hz wind sampling, the tree-cadence law) and each frame
     * blits it with ONE drawImage translated by the camera delta. The
     * coat's 3-4× blade density rides on this: quads are only paid at
     * bake time. Grass shadows bake into a second canvas the same way
     * (opaque at bake, alpha at blit — overlaps inside the meadow's own
     * shade merge instead of stacking, the shadow-layer law). Only tiles
     * a body (or its predicted path — a swept box over the cache window)
     * can reach, plus fresh wakes, are excluded and rebuilt live per
     * frame. A disturber that escapes its predicted box forces an
     * immediate rebake, so displacement NEVER lags a frame.
     */
    private underCache;
    /** The calm canvas + its shadow twin, reused across bakes. */
    private underCanvas;
    private underCtx;
    private shadowCanvas;
    private shadowCtx;
    /** The shadow fill the NEXT bake will use (set via setShadow). */
    private shFill;
    /** Effective screen alpha for the meadow's own cast composite. */
    private shAlpha;
    /** This frame's cached-fill translation (drawUnder → flushShadows). */
    private cacheDx;
    private cacheDy;
    /**
     * Tile → disturbers-in-range, rebuilt once per frame from each
     * disturber's footprint (~5×5 tiles). Inverts the old per-tile scan
     * over every live body: thousands of visible tiles × N disturbers of
     * box tests became one map lookup per tile. Same coverage box, so
     * blade output is identical.
     */
    private readonly disturberIndex;
    /** Frame stamp for disturberIndex entries — readers must match it. */
    private indexEpoch;
    /** Recycled LiveDisturber records backing `live` (see beginFrame). */
    private readonly livePool;
    /**
     * Per-frame flutter table: every blade's tremble is one of 32 phase
     * bins sampled once per frame — thousands of Math.sin calls become
     * thirty-two.
     */
    private readonly flutter;
    private readonly wakeWobble;
    /**
     * Per-frame setup: resolve disturber velocities, wake tiles bodies are
     * moving through, and fire rustle specks when someone wades into a new
     * patch of tall grass.
     */
    beginFrame(nowMs: number, frameDt: number, disturbers: Disturber[], groundAt: Sampler, rustle: (x: number, y: number) => void, camX: number, camY: number): void;
    /**
     * Arm (or disarm) this frame's blade shadow projection. `fill` is
     * the shade color the calm canvas will bake its casts in — pass the
     * same color the composite will use, or the cached shade lags a
     * bake behind at a sun/moon flip. `alpha` is the EFFECTIVE screen
     * alpha the meadow's self-composite lands at (drawUnder paints its
     * own casts under the coat — see the z-order law there), matching
     * what the shared prepass layer would have produced.
     */
    setShadow(kx: number, ky: number, on: boolean, fill?: string, alpha?: number): void;
    /**
     * Composite any blade casts still pending on the shared prepass
     * layer. Since THE CAST LIES UNDER THE COAT (see drawUnder), the
     * meadow consumes its own shade — calm canvas and live path alike —
     * before its blades paint, so this normally has nothing left; it
     * stays as the safety drain for any cast gathered after the under
     * pass, keeping the shared-layer merge law for that remainder.
     */
    flushShadows(ctx: CanvasRenderingContext2D, fill: string, alpha: number): void;
    private tile;
    private ensurePaths;
    private mark;
    private static readonly NO_DISTURBERS;
    /** Point `near` at this tile's precomputed disturber list. */
    private gatherNear;
    /** Two corner samples → the tile's exact local affine frame. */
    private tileFrame;
    /**
     * One blade → one (or two) quads into its color bucket. All the life
     * happens here: wind cantilever, shimmer relight, body displacement,
     * post-passage wobble.
     */
    private buildBlade;
    private buildFlower;
    /**
     * A wild grain stalk: thin stem streaming further than any blade
     * (long lever, light head), three gold chips laid up the tip like a
     * ripening ear. Sparse by construction — the prairie field deals
     * them — so each one reads as a find, not a crop.
     */
    private buildSeed;
    private buildRoots;
    private flush;
    /** Painter's order for one bucket set: roots under blades under flowers. */
    private fillBuckets;
    /** Build one tile's under-layer content into the CURRENT containers
     *  (roots, under blades, tall-thicket casts, flowers deferred). */
    private buildUnderTile;
    /** Flowers and seed-heads are their own layer: heads read above the lawn. */
    private buildFlowerTiles;
    /** Rebake the calm canvas (see underCache). */
    private bakeUnder;
    /**
     * The under-layer: every short blade, nap chip, clump, flower, and
     * seed-head in bounds — drawn beneath entities. Tall thickets
     * contribute only their nap underbrush here; their mass y-sorts via
     * collectTall. Calm tiles come from the cadence-baked calm canvas
     * (ONE drawImage, however dense the coat); only disturbed/waking
     * tiles rebuild per frame.
     */
    drawUnder(ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
    /**
     * Tall grass as y-sorted items: each thicket splits at its midline
     * into two depth bands, so a body standing inside it is wrapped —
     * blades behind it draw first, blades in front draw over.
     */
    collectTall(items: Array<{
        sortY: number;
        draw?: () => void;
    }>, ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
    /**
     * Elevated rows: the plateau band item draws its own strip of living
     * grass right after its surface — already y-granular, so everything
     * (tall included) goes down in one pass.
     */
    drawRow(ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
}
export {};
//# sourceMappingURL=grass.d.ts.map