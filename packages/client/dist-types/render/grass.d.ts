import { Tile } from '@arx/shared';
import { type StageItem } from './stage/stageTypes.js';
/**
 * The bespoke grass system. The ground IS the game's biggest canvas, and
 * this module is what makes it read as a living meadow instead of blocks
 * of color. Design laws:
 *
 * - BLOCKY: blades are tapered flat-top slabs (chisel-cut quads), never
 *   soft strokes — the same brutalist language as shapes.ts. Tall blades
 *   bend as two rigid segments, like a slab cracking at a knuckle.
 * - THE COAT: the meadow is a CARPET, not a scatter. Two registers do
 *   the work — a dense low NAP of squat near-turf chips that coats the
 *   ground continuously (density riding the SAME lush field 907 the
 *   baked turf stubble uses, so live and baked thicken in the same
 *   reaches — one landform), and sparser accent STANDS above it that
 *   read as individual grass. No grass tile is ever bald; variation is
 *   density waves, never holes of flat paint.
 * - VARIED: a coverage noise field deals each tile a hand — thin nap,
 *   lone strands, medium stands, or dense clumps rooted in a shared
 *   crown chip. Meadows breathe; nothing tiles. Seed-head stalks gather
 *   in prairie drifts on their own slow field.
 * - ONE WIND: every blade, flower, and tree samples the same vector
 *   wind field. Gust fronts are CURVED (the front's phase is bent by a
 *   slow cross-wave) and a perpendicular meander makes swaths snake
 *   across the field — fluid motion without a fluid sim.
 * - SHIMMER: a long-wavelength luminance swell relights blades from a
 *   graded ramp — broad swaths of light rolling through the meadow.
 *   THE FLOOR LAW (coat amendment): ACCENT blades never render darker
 *   than the turf beneath them — a lone dark tick reads as a hole. The
 *   nap's deepest row may sit a hair under the turf, but ONLY inside a
 *   dense coat where it reads as carpet weave, never as a lone mark.
 * - INHABITED: tall grass y-sorts around entities (you walk THROUGH
 *   it), bodies part and flatten nearby blades, and a passage leaves a
 *   springy rustle wobble + leaf specks behind.
 * - CHEAP: per-tile blade geometry is generated once and cached, and
 *   THE CALM CANVAS bakes every undisturbed tile into an offscreen
 *   canvas at wind cadence — a whole meadow of quads costs ONE
 *   drawImage per frame, so the coat's density is effectively free.
 *   Only tiles a body can reach rebuild live at frame rate.
 */
/** Wind direction — matches the treeline so the whole scene agrees.
 *  Exported as the single source the GPU grass shares (grassGpu.ts). */
export declare const WX = 0.94;
export declare const WY = 0.34;
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
/**
 * `strength` (0..1) stands in for the object's HEIGHT: a tall tree carries a
 * full climbing collar (1); a low rock gets a bare few short wisps (~0.22) so
 * it is never swallowed; a wall foot a subtle low nestle (~0.5). It scales
 * blade count, height, radius and whether inner climbers appear. `sides` is a
 * grass-edge bitmask (SKIRT_SIDE_*): the full ring (default) scatters freely,
 * a partial mask (a wall) keeps every blade on a grass-facing edge only.
 */
export declare function generateSkirtBlades(tx: number, ty: number, footY: number, strength?: number, sides?: number): Blade[];
/** Exported as the GPU grass's palette source (grassGpuRenderer.ts) —
 *  the exact shade→base→lit ramp, so the instanced blades wear the same
 *  colours as the baked meadow. Tone-major: [tone·LIGHTS + light]. */
export declare const BLADE_FILLS: string[];
/** GPU ornament palette (grassOrnament.ts) — the EXACT flower/seed colours
 *  the baked meadow uses, so the instanced blooms match. Fixed order:
 *  [petal0..3, core, gold, stem]. */
export declare const ORNAMENT_FILLS: readonly string[];
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
/**
 * Which tiles a cell lane owns. THE COAT LAW anchors the under lane:
 * every short-grass tile wears the nap (plus roots, flowers and
 * seed-heads — all under-lane residents), so the UNDER lane takes
 * BOTH grass tiles; only the tall standing-mass lanes are thickets-
 * only. The original cell gate lumped UNDER into the "not ROW"
 * branch and silently balded the entire open meadow — casts kept
 * drawing (the shade pass reads geometry directly), so the field
 * report was "shadows of the grass with no grass". Exported pure so
 * grass.test.ts pins it.
 */
export declare function laneUses(lane: number, t: Tile | null | undefined): boolean;
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
    /**
     * THE GPU PATH'S BLADE GATHERER (proposal G-2). Walk the SAME
     * level-0 visible tiles drawUnder walks and, instead of drawing,
     * collect each tile's CACHED blade geometry into `out` for the
     * instanced GPU renderer. Reuses the identical this.tile() cache
     * drawUnder reads (no separate generation path — cache misses mint
     * exactly the geometry drawUnder would). Gathers the `under` coat
     * (both grass tiles wear it — THE COAT LAW), and — unless the tall
     * standing mass is being routed to the y-sorted interleave — the tall
     * `north`/`south` blades (GrassTall only). Blade geometry ONLY; flowers,
     * seeds and roots are separate instance types handled later. The
     * blades land SORTED back-to-front by world-y (`by` ascending): the
     * GPU draws them opaque with no depth buffer, so paint order IS the
     * depth. The immutable cached Blade objects are pushed by reference
     * (no copy). `out` is caller-owned and pooled — it is truncated here.
     * Returns the number of blades written.
     *
     * B3 — THE TALL BLADE INTERLEAVES: with `tallInterleave` set, the GPU
     * flat field carries ONLY the short `under` coat (both grass tiles),
     * and the tall standing mass (GrassTall north/south bands) is skipped
     * here so the renderer can route it through the CPU `collectTall`
     * y-sort — a body then walks THROUGH a thicket, blades in front of it
     * occluding the lower body. The `under` coat is short and correctly
     * stays flat below every entity, so the partition is exactly the two
     * depth classes: coat (flat, GPU) vs standing mass (interleaved, CPU).
     */
    collectGpuBlades(ground: Sampler, detail: DetailFn, bounds: GrassBounds, out: Blade[], tallInterleave?: boolean): number;
    /**
     * G1 — THE TALL BLADE GOES TO THE GPU. Gather ONLY the tall standing
     * mass (GrassTall north+south blades) for the visible field, from the
     * SAME immutable tile cache collectGpuBlades reads (no separate
     * generation). The short `under` coat is NOT included here — it rides
     * the flat GPU field (collectGpuBlades with tallInterleave). The blades
     * land SORTED back-to-front by world-y (`by` ascending): the GPU draws
     * them opaque with no depth buffer, so within any one row-band the paint
     * order IS the depth. The renderer then partitions this sorted array
     * into fine world-row bands (partitionTallBands) and emits each band as
     * a y-sorted DrawItem, so a body walks THROUGH the thicket — blades
     * rooted south of it (in front) occlude its lower body, blades rooted
     * north do not, CONTINUOUSLY (no two-band pop). `out` is caller-owned
     * and pooled (truncated here); cached Blade records are pushed by
     * reference. Returns the number of tall blades written.
     */
    collectGpuTall(ground: Sampler, detail: DetailFn, bounds: GrassBounds, out: Blade[]): number;
    /**
     * The GPU path's ORNAMENT gatherer (proposal G-2) — flowers and
     * seed-heads for the visible field, from the SAME tile cache
     * collectGpuBlades walks. The ornament pass draws OVER the blades, so
     * these need no depth sort among themselves. Both output arrays are
     * caller-owned and pooled (truncated here); the immutable cached
     * records are pushed by reference. Returns the total written.
     */
    collectGpuOrnaments(ground: Sampler, detail: DetailFn, bounds: GrassBounds, flowersOut: Flower[], seedsOut: SeedHead[]): number;
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