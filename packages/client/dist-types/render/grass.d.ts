import { type StageItem } from './stage/stageTypes.js';
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
     * THE SHADE CACHE (né THE CALM CANVAS). Round 6 baked the whole calm
     * under-layer — blades and casts — into offscreen canvases at 66ms
     * cadence; round 13 moved the BLADES onto the budgeted row-sprite
     * lane (THE MEADOW RIDES THE SHEAR — the 15Hz full re-tessellation
     * was a measured multi-ms burst that read as micro-stutter on fast
     * panels), and this cache now carries only the meadow's merged CAST
     * canvas (cast-only build, ~a quarter of the old beat) plus the
     * live-exclusion set both consumers share. Casts stay monolithic on
     * purpose: one canvas is the only place overlapping shade can merge
     * instead of stacking (the shadow-layer law). Only tiles a body (or
     * its predicted path — a swept box over the cache window) can
     * reach, plus fresh wakes, are excluded and rebuilt live per frame.
     * A disturber that escapes its predicted box forces an immediate
     * rebake, so displacement NEVER lags a frame.
     */
    private underCache;
    /** The meadow's merged cast canvas, reused across bakes. */
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
     * THE MEADOW RIDES THE SHEAR: cadence-baked sprites for the two
     * lanes that could never join the calm canvas because they y-sort
     * per row — tall thicket bands and elevated-surface rows. Each
     * sprite blits through a live wind-delta shear about the row's base
     * line, so primary sway runs at frame rate at any cadence (the tree
     * lane's law, one size down). Byte-ledgered, admission-gated,
     * pooled — rounds 10-12's metering laws verbatim.
     */
    private readonly rowSprites;
    private rowBytes;
    private readonly rowPool;
    private rowPoolBytes;
    private frameNo;
    /** Per-frame bake spend: cadence refreshes ride `bakeMsLeft`, first
     *  sight and hatches ride `urgentMsLeft` (the runaway guard). */
    private bakeMsLeft;
    private urgentMsLeft;
    /** Law 2's count floor for first-sight cells (mirrors
     *  bakeAdmission.ARRIVAL_MIN_COUNT): a Mac-tuned ms window admits
     *  ~1 cell on a slow machine — the floor keeps convergence real. */
    private firstCellsLeft;
    /** One guaranteed cadence bake per frame keeps the queue draining
     *  even when a single bake overruns the whole budget. */
    private bakeFloorLeft;
    /** THE FRAME CONFESSES: read by the renderer's ?perf line. */
    readonly rowStats: {
        blit: number;
        live: number;
        bake: number;
        over: number;
    };
    /** Dev/proof lever (the staticLayerOn pattern): false = every cell
     *  builds live through the exact pre-sprite path. */
    rowSpritesOn: boolean;
    /** THE CADENCE PAYS A BUDGET: live beat, self-tuned per frame. */
    private rowCadenceMs;
    /** Cell-scan scratch (span-sized; no per-frame allocation). */
    private readonly cellSt;
    private readonly cellT;
    private readonly rowSweepScratch;
    /** Under-lane deferred blits (cell sprites paint after the shade). */
    private readonly underBlitScratch;
    /**
     * THE WORLD ON STAGE hook (phase A2p2): set by the renderer during
     * world assembly. blitRowSprite emits quads through it, and the
     * live-tile tails defer into ONE bounded paint per band/row (see
     * stageDrainLive). Null = the classic canvas path, untouched.
     */
    stagePush: ((item: StageItem) => void) | null;
    private readonly stageLive;
    private readonly stageTexMap;
    private stageRevSeq;
    /** Handles key by the CANVAS (the renderer's shadow law, same
     *  two-axis invalidation): a pooled canvas claimed by another cell
     *  re-uploads unconditionally; a cell's own rebake rides its
     *  bake stamp. */
    private stageTexFor;
    /** Drain the deferred live tiles as ONE bounded paint item. The
     *  tiles rebuild inside the closure from the samplers — everything
     *  they need is recomputable, so nothing captures a stale frame. */
    private stageDrainLive;
    /**
     * Per-frame ctx transform memo. Every lane's entry point read
     * ctx.getTransform() per row item — ~100-130 DOMMatrix allocations
     * a frame in a capital — but the base transform is constant across
     * a frame's grass passes (the renderer's height-lean transforms
     * live INSIDE wall painters, never around item dispatch), so one
     * read per frame per ctx serves them all.
     */
    private ctxM;
    private ctxMOwner;
    private ctxMFrame;
    private frameTransform;
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
    /** Anything queued for the shade pass this frame? (The stage skips
     *  the layer paint entirely on shadeless frames.) */
    hasShadows(): boolean;
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
    /**
     * Rebake the meadow's SHADE canvas (see underCache). Round 13
     * slimmed this from the old full calm-canvas bake: the blades
     * themselves now live on the row-sprite lane (budgeted, sheared),
     * so this pass builds ONLY the cast quads — ~a quarter of the old
     * beat, and the one place the whole meadow's casts still merge on a
     * single canvas so overlaps never stack (the shadow-layer law).
     */
    private bakeShade;
    /**
     * The under-layer: every short blade, nap chip, clump, flower, and
     * seed-head in bounds — drawn beneath entities. Tall thickets
     * contribute only their nap underbrush here; their mass y-sorts via
     * collectTall. Since round 13 the blades ride the row-sprite lane
     * (THE MEADOW RIDES THE SHEAR): calm cells blit their cadence
     * sprites through the live wind shear, disturbed/waking tiles build
     * live — the old monolithic calm canvas re-tessellated the entire
     * viewport's coat every 66ms, a measured multi-ms burst at 15Hz
     * that read as micro-stutter on fast panels. Only the SHADE still
     * bakes monolithically (cast-only, ~a quarter of the old beat),
     * because casts must merge on one canvas so overlaps never stack.
     */
    drawUnder(ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
    /** World-stable cell identity: lane, elevation level, row, cell. */
    private static rowKey;
    /**
     * THE LEDGER HAS ONE DOOR: release a sprite's canvas back through
     * the pool (or to GC past the pool's byte ceiling) and return its
     * bytes. The caller owns the map entry itself.
     */
    private dropRowSprite;
    /** One lane-tile of live geometry — the SAME brush the sprites bake
     *  with, and the same order the old per-frame loops drew in. `cast`
     *  is true only for LIVE under-lane tiles: a cell bake never casts
     *  (the shade bake owns the merged cast canvas), and the tall/row
     *  lanes never did. */
    private buildLaneTile;
    /**
     * Bake one row cell into a sprite. SAME-BRUSH: the live builders
     * paint under a re-anchored tile frame (local origin at the cell's
     * first tile, the row's own sx/sy), so bake output is the live
     * output verbatim. Returns the stored entry, or null when the
     * frame's bake spend is gone (the caller draws live and retries).
     */
    private bakeRowCell;
    /**
     * Blit one baked cell through the live wind-delta shear about the
     * row's mid-depth base line: tips track the cantilever at frame
     * rate, and a missed cadence beat degrades into a larger (capped)
     * shear instead of a stutter.
     */
    private blitRowSprite;
    /**
     * One cell of one lane, one frame: scan, decide, blit through the
     * live wind-delta shear, and build the excluded tiles live. The
     * sprite is a cache, never a mode — every decline or miss paints
     * live through the exact pre-sprite path (THE STILL-WORLD BARGAIN).
     * The under lane hands its blit to `defer` so the meadow's shade
     * can composite beneath every calm blade.
     */
    private handleRowCell;
    /**
     * Tall grass as y-sorted items: each thicket splits at its midline
     * into two depth bands, so a body standing inside it is wrapped —
     * blades behind it draw first, blades in front draw over.
     */
    collectTall(items: Array<{
        sortY: number;
        draw?: () => void;
        stageSafe?: true;
    }>, ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
    /**
     * Elevated rows: the plateau band item draws its own strip of living
     * grass right after its surface — already y-granular, so everything
     * (tall included) goes down in one pass.
     */
    drawRow(ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number, level?: number): void;
}
export {};
//# sourceMappingURL=grass.d.ts.map