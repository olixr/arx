import type { StageBackend, StageItem, StageTexture } from './stageTypes.js';
export declare class GlStage implements StageBackend {
    readonly canvas: HTMLCanvasElement;
    readonly kind: "gl";
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
    /** The texture store's ceiling — ~2x a settled town's working set. */
    private static readonly TEX_BUDGET_BYTES;
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
    private frameNo;
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
    private bw;
    private bh;
    /** Interleaved vertex scratch, grown geometrically, reused. */
    private buf;
    private f32;
    private u8;
    /** Alpha stage: the world layer composites OVER the 2d ground, so
     *  it needs a real alpha channel; the main/ground stage stays
     *  opaque so the page can never bleed through. The two refuse each
     *  other's illegal ops symmetrically (see begin/draw). */
    readonly isAlpha: boolean;
    constructor(canvas: HTMLCanvasElement, opts?: {
        alpha?: boolean;
    });
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
    ensure(tex: StageTexture, msLeft: number): {
        state: 'current' | 'stale' | 'absent';
        spentMs: number;
    };
    /** ONE LIFECYCLE's release door — call from the cache evictors. */
    release(tex: StageTexture): void;
    /** Live texture records — the ledger's companion count. */
    get textureCount(): number;
    statsReset(): void;
    begin(w: number, h: number, dpr: number, clear: string | null): void;
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
    private paintScratch;
    drawLayer(items: readonly StageItem[], alpha: number): void;
    end(): void;
}
//# sourceMappingURL=glStage.d.ts.map