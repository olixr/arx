import type { GpuStageBackend, GpuStageOpts, StageItem, StageTexture } from './stageTypes.js';
import type { EvictCandidate, VramLanes } from './stageVram.js';
export declare class GlStage implements GpuStageBackend {
    readonly canvas: HTMLCanvasElement;
    readonly kind: "gl";
    /** THE VRAM CEILING (A1): this stage's name in the cross-stage
     *  governor's ledger and confession ('world' / 'ground'). */
    readonly vramLabel: string;
    private gl;
    private program;
    private uRes;
    private vbo;
    private vao;
    private white;
    /** THE TEXTURE IS THE CANVAS'S SHADOW: records keyed by handle;
     *  release is explicit and the ledger is symmetric. */
    private readonly records;
    /** Exact resident texture bytes (the `?perf` gpu line's source). */
    textureBytes: number;
    /** The texture store's ceiling — ~2x a settled town's working set.
     *  Per-instance since the foundation audit: the renderer runs TWO
     *  stages, and two full 512MB stores plus the keyed/scratch/sheet
     *  classes stacked past a gigabyte of budget-legal worst case. The
     *  GROUND stage carries only chunk quads (~200MB measured working
     *  set) and takes the smaller store at construction. */
    private readonly texBudgetBytes;
    /** Bytes uploaded since the last statsReset — the jitter signal. */
    uploadedBytes: number;
    uploads: number;
    drawCalls: number;
    /** Measured submission cost, ms per MB (gpuBudget EMA). */
    uploadCostMsPerMb: number;
    /** True once a budgeted ensure() admitted this frame (the floor). */
    private uploadedThisFrame;
    /**
     * THE SCRATCH LANE (phase A2): pooled canvas+texture pairs, one per
     * 64px size class, that live-paint closures run through. GL reads a
     * texture's content as of the draw CALL, so one pair per class
     * serves every paint item of a frame sequentially — zero per-item
     * allocation, uploads being the only recurring cost (GPU-to-GPU on
     * accelerated canvases). Stats feed the ?perf confession.
     */
    private readonly scratch;
    private scratchBytes;
    /**
     * THE SCRATCH POOL KEEPS A BUDGET (field fix, 2026-09-02). The
     * class pool was bounded only by a 600-frame IDLE sweep — so on a
     * large (maximized Retina) window, where wall runs and bodies mint
     * a wide spread of size classes, it ballooned to 2.3GB resident
     * across 300+ classes (measured), and with the keyed/record/sheet
     * lanes the world stage held 3.2GB of GPU memory. That overflows a
     * browser's per-tab GPU budget on ordinary machines (Mac Chrome on
     * prod, reported) and the driver silently reclaims textures — the
     * "sprites vanish under accelerated display" defect. A byte cap
     * with coldest-first LRU (the keyed evictor's exact shape) bounds
     * it; the frame's own working set (~15-20 distinct classes) is far
     * under the cap, so nothing thrashes. */
    private static readonly SCRATCH_BUDGET;
    /**
     * THE ONE RENDER — B9: FACE / SCRATCH CELL CAP (device px per dimension).
     * The stage-wide ceiling on any paint cell's bake resolution — the renderer
     * sets it under lean (q>0) and to 0 (off) at q=0, so the flat golden gate is
     * untouched. Under lean the perspective projection can size a per-run scratch
     * cell by a huge PROJECTED screen extent — a structure-face run, a grass row,
     * or a particle run with one grain near the horizon — minting multi-GB cells
     * (measured ~16GB at zoom 2, a GPU-crash risk). Capping the cell to this many
     * device px per dimension and letting the GL quad SCALE the capped texture up
     * to the full projected extent bounds the resident scratch: any on-screen-
     * sized cell (≤ this) is byte-identical (k=1, sharp — faces stay sharp at
     * normal zoom); only a cell larger than the ceiling softens gracefully. A
     * per-item `capDim` overrides it. 0 = no cap. */
    cellCapPx: number;
    /** THE SCRATCH LEDGER: keyed paints keep their own exact-size
     *  canvas+texture and repaint/re-upload ONLY on a rev change — the
     *  wall-run lane's cure (~48MB/frame of identical wall strips
     *  re-uploaded at the crown). Bounded by the LRU sweep + byte cap. */
    private readonly keyed;
    private keyedBytes;
    private static readonly KEYED_BUDGET;
    scratchCachedHits: number;
    private frameNo;
    /** Staging canvas for dirty-rect subuploads (grown, never shrunk). */
    private staging;
    private stagingFor;
    scratchPaints: number;
    scratchUploadBytes: number;
    /**
     * THE SCRATCH SHEET (A2 part 9). The per-pass scratch round-trip —
     * paint a pooled canvas, texImage2D it, draw, repeat — serializes
     * the 2d raster backend against GL once per pass; at ~74 passes a
     * frame that sync ping-pong was the measured fps floor (hoargate
     * 60fps with a 1.9ms world phase — the cost lived off the CPU
     * clock). The sheet batches the lane: a pre-pass shelf-packs every
     * ELIGIBLE pass box into a few large pooled canvases, paints them
     * all while the raster pipeline stays on one target, uploads each
     * touched sheet ONCE, and the paint sentinels become plain quad
     * draws sampling their cells. Order never changes — the sentinels
     * draw exactly where they always did. Boxes past the eligibility
     * cut (and any overflow past the pool cap) keep the legacy
     * per-pass lane; 2px gutters keep linear sampling out of the
     * neighbors. The pool is BOUNDED (3 × 2048×1024 ≈ 25MB) and dies
     * with the context like every scratch resource.
     */
    private readonly sheets;
    private static readonly SHEET_W;
    private static readonly SHEET_H;
    private static readonly SHEET_MAX;
    private static readonly SHEET_GUT;
    /** Eligibility cut: the many-small go to the sheet, the few-big
     *  keep their own upload (a 2MB box batched saves one call but
     *  wastes a third of a sheet). Device px. */
    private static readonly SHEET_CELL_W;
    private static readonly SHEET_CELL_H;
    sheetUploads: number;
    /** THE SHADOW LAYER RIDES THE STAGE (A3): one pooled FBO+texture
     *  pair; drawLayer renders a stream into it and composites once at
     *  layer alpha. Inside it alpha-target blends are legal on either
     *  stage (the punch), opaque-only blends stay refused. */
    private layerFbo;
    private layerTex;
    private layerW;
    private layerH;
    private inLayer;
    /** True after webglcontextlost; the caller flips to the canvas
     *  backend the same frame (THE TOGGLE IS THE PRODUCT'S SAFETY). */
    contextLost: boolean;
    onContextLost: (() => void) | null;
    private dpr;
    /** THE RENDER SCALE (A2): the backbuffer/viewport/layer-FBO size in
     *  device px — the RESOLUTION the stage rasterizes at. */
    private bw;
    private bh;
    /** The GEOMETRY space in device px (uRes) — the coordinate frame the
     *  quad positions live in, always at FULL dpr. When bw/bh < uw/uh
     *  (render scale < 1) the shader still maps aPos/uRes correctly and
     *  the smaller viewport rasterizes the same geometry at lower
     *  resolution; the composite drawImage upsamples it. Equal when the
     *  render scale is 1, so a full-scale frame is byte-identical. */
    private uw;
    private uh;
    /** Interleaved vertex scratch, grown geometrically, reused. */
    private buf;
    private f32;
    private u8;
    /** Alpha stage: the world layer composites OVER the 2d ground, so
     *  it needs a real alpha channel; the main/ground stage stays
     *  opaque so the page can never bleed through. The two refuse each
     *  other's illegal ops symmetrically (see begin/draw). */
    readonly isAlpha: boolean;
    constructor(canvas: HTMLCanvasElement, opts?: GpuStageOpts);
    /** Drop every GPU-resident handle this stage tracks and zero the byte
     *  ledgers. The GL textures themselves are already gone (context loss)
     *  or about to be re-created (restore/initGL), so this only forgets
     *  our bookkeeping — the paint-factory canvases (the truth) are
     *  untouched and re-upload lazily. Shared by both context handlers so
     *  the governor's cross-stage sum never counts freed memory. */
    private forgetGpuResources;
    private initGL;
    /** Create-or-get the shadow record and sync it to the handle's rev.
     *  Phase A0 uploads immediately; A1 threads the budget through here. */
    private sync;
    /**
     * THE UPLOAD IS A BAKE — the budgeted lane for emitters that can
     * fall back (the ground pass paints an un-uploadable chunk through
     * the canvas lane instead; THE STILL-WORLD BARGAIN at the right
     * layer). Returns the handle's drawable state:
     *
     *  'current' — texture matches rev (uploaded now or already fresh);
     *  'stale'   — an older upload exists and may blit while the budget
     *              catches up (a stale bake still serves — the band
     *              layer's own law);
     *  'absent'  — nothing uploaded and the guard declined: the caller
     *              MUST paint this item through its live lane.
     *
     * `msLeft` is the frame's remaining lane budget as the caller
     * tracks it; the return includes the ms actually spent so the
     * caller can decrement. draw() itself still uploads unconditionally
     * whatever it meets un-synced — a forgotten ensure() may cost a
     * hitch, never a hole.
     */
    ensure(tex: StageTexture, msLeft: number, floor?: boolean): {
        state: 'current' | 'stale' | 'absent';
        spentMs: number;
    };
    /** Honest refresh pricing: a dirty-rect refresh costs its RECTS,
     *  not the whole canvas (ensure once priced an atlas page's few-KB
     *  cadence dirt at 16.8MB and declined it for nothing). */
    private pendingUploadBytes;
    /**
     * Draw-time sync with the stale-bake escape (foundation audit):
     * draw() must never meet a missing texture (never a hole), but a
     * REFRESH of content already uploaded may defer under budget
     * pressure when the handle says stale content still serves
     * (staleOk — chunk grounds, band bakes). The old unconditional
     * sync was the recorded safety net turned main road: every
     * declined ensure() re-uploaded at draw anyway, unmetered, which
     * made the whole upload economy advisory.
     */
    private syncForDraw;
    /** ONE LIFECYCLE's release door — call from the cache evictors. */
    release(tex: StageTexture): void;
    /** Live texture records — the ledger's companion count. */
    get textureCount(): number;
    /** THE WHOLE COMMIT CONFESSES (foundation audit): every byte this
     *  stage holds resident on the GPU — records, keyed cells, scratch
     *  classes, sheets, the layer FBO. The per-class ledgers were each
     *  honest and none of them summed. */
    get residentBytes(): number;
    /** Resident keyed-cell bytes (probe/confession). */
    get keyedResidentBytes(): number;
    /** THE VRAM CEILING (A1): this stage's resident bytes broken out by
     *  lane — the standing diagnostic the cross-stage governor sums and
     *  ?perf/probes read (the band-21 hunt computed this by hand). */
    residentBreakdown(): VramLanes;
    /** THE VRAM CEILING (A1): offer this stage's cold records to the
     *  cross-stage governor. Only records NOT drawn this frame and NOT
     *  pinned (atlas pages) are evictable — an evicted record re-uploads
     *  the next frame its quad draws (syncForDraw), so this sheds only
     *  genuinely-cold off-screen mass, never the working set. Scratch and
     *  keyed stay under their own per-instance caps and are not offered:
     *  they are hot, re-paint (not re-upload) to restore, and the record
     *  mass is where a big window's surplus actually lives. */
    collectEvictable(out: EvictCandidate[]): void;
    statsReset(): void;
    begin(w: number, h: number, dpr: number, clear: string | null, renderScale?: number): void;
    /** True once the host ever called frame() — the authoritative
     *  per-real-frame clock; begin() stops ticking on its own then. */
    private externalClock;
    /** Advance the frame clock: aging, sweeps, and the per-frame
     *  upload allowance. Call ONCE per rendered frame, before any
     *  ensure()/draw() of that frame. */
    frame(): void;
    private tickFrame;
    /** The shared per-frame upload allowance (THE UPLOAD IS A BAKE):
     *  ensure() and draw-time refreshes spend from ONE pool, so N
     *  independent lanes can no longer each claim a full budget in the
     *  same frame. */
    private uploadMsLeft;
    /** Draw-time refreshes deferred to a stale bind this frame (probe). */
    drawDeferred: number;
    draw(items: readonly StageItem[]): void;
    /** Stand sheet `i` up (pooled; filters set once at creation). */
    private openSheet;
    /**
     * One paint item through the scratch lane: run the closure against
     * the class pair's 2d canvas (screen coordinates preserved by the
     * translate), upload, draw its pre-filled quad. The pair is reused
     * by the very next paint item — GL snapshots texture content at the
     * draw call, so sequential reuse is sound by spec.
     */
    /** B9: the effective cell cap for one paint — its own `capDim` if set, else
     *  the stage-wide `cellCapPx` (0 → no cap). One place so the sheet pre-pass,
     *  the vertex UV and the paint all agree by arithmetic. */
    private capFor;
    private paintScratch;
    /**
     * THE SCRATCH LEDGER's draw: a keyed paint owns an exact-size
     * canvas+texture pair; the closure runs and the texture uploads
     * ONLY when the item's rev (or its box size) changed. A cache hit
     * is a bind and a drawArrays — the wall strips that measured
     * ~48MB/frame of identical uploads at the crown become, in effect,
     * quads that repaint on world/zoom/cadence edges alone.
     */
    /**
     * Reserve (or refuse) a keyed cell for this item — get, size-check,
     * evict, mint; NO GL painting. Runs in the VERTEX pass, because the
     * refusal decides the quad's UV mapping (keyed cells span [0,1];
     * the scratch fallback samples a class-rounded pair) and vertices
     * are written before the run walk paints anything.
     */
    private ensureKeyedEntry;
    private paintKeyed;
    drawLayer(items: readonly StageItem[], alpha: number): void;
    end(): void;
}
//# sourceMappingURL=glStage.d.ts.map