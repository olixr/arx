/**
 * THE VRAM CEILING (foundation phase A1) — a shared governor over every
 * live GlStage instance.
 *
 * The renderer runs TWO WebGL stages (the world compositor and the
 * ground) and each already polices its own lanes: records against
 * `texBudgetBytes`, the scratch pool against SCRATCH_BUDGET (band 21),
 * keyed cells against KEYED_BUDGET. What no per-instance guard can see
 * is the SUM the two stages hold against the browser tab's real GPU
 * budget. Two budget-legal stages can stack past a gigabyte of resident
 * texture between them with no single lane over its own ceiling — and
 * when the combined total overruns the tab's dynamic GPU budget the
 * driver silently reclaims textures, which is exactly the "sprites
 * vanish under accelerated display" defect band 21 chased on one stage.
 *
 * This governor is the cross-stage backstop: it sums every stage's
 * resident bytes, and when the total is over a soft ceiling it sheds
 * the GLOBALLY COLDEST records — across both stages — until the total
 * is back under. We evict before the driver does. It sheds records
 * only (the cold, off-screen, re-uploadable mass); the hot scratch and
 * keyed lanes stay under their own per-instance caps, and a record
 * evicted here re-uploads the next frame its quad draws (syncForDraw).
 *
 * The ceiling is a BACKSTOP against long-session and scene-rotation
 * accumulation, sized above a big window's honest working set so it
 * never thrashes the set a frame actually draws. Driving it DOWN into a
 * constrained tab's safe range is the job of the working-set-reduction
 * phases (A2 the DPR cap, A3 compressed pools, B the ground cache);
 * `setCeiling` is their hook, and a Settings quality tier can set it
 * per machine. The confession (`resTOT` on ?perf, and `breakdown()`)
 * is how the field tells us where the real ceiling sits.
 */
/** Per-lane resident bytes for one stage — the diagnostic breakdown. */
export interface VramLanes {
    records: number;
    keyed: number;
    scratch: number;
    sheets: number;
    layer: number;
}
/** One evictable record offered up by a stage. `stamp` is a wall-clock
 *  ms (performance.now()) of the record's last touch, so candidates
 *  from stages with independent frame clocks sort against each other
 *  honestly. `evict()` releases the record and returns bytes freed. */
export interface EvictCandidate {
    stamp: number;
    bytes: number;
    evict(): number;
}
/** The contract a stage implements to be governed. */
export interface VramStage {
    readonly vramLabel: string;
    readonly residentBytes: number;
    residentBreakdown(): VramLanes;
    /** Push this stage's cold, evictable (non-pinned, not drawn this
     *  frame) records onto `out`. Called only when the governor is over
     *  ceiling, so the per-frame cost is zero on a healthy frame. */
    collectEvictable(out: EvictCandidate[]): void;
}
declare class StageVramGovernor {
    private readonly stages;
    private ceiling;
    /** Bytes shed by the last enforce() — the confession's signal that
     *  the governor is actively fighting the ceiling (a steady non-zero
     *  reading means the working set is at the ceiling: reduce it, don't
     *  raise the cap and let the driver reclaim). */
    lastShedBytes: number;
    register(stage: VramStage): void;
    unregister(stage: VramStage): void;
    /** The soft ceiling across ALL stages, in bytes. */
    get ceilingBytes(): number;
    /** Lower (or raise) the ceiling — the hook for the DPR cap, the
     *  compressed pools, and a per-machine Settings tier. Clamped to a
     *  floor so a caller cannot set a ceiling below what a frame's
     *  working set structurally needs and drive the whole store into
     *  thrash. */
    setCeiling(bytes: number): void;
    /** Every resident texture byte across every governed stage. */
    totalResidentBytes(): number;
    /** Per-stage, per-lane resident bytes — the standing diagnostic
     *  (the band-21 hunt read this by hand; now it is a method). */
    breakdown(): Array<{
        label: string;
        lanes: VramLanes;
        total: number;
    }>;
    /**
     * Run once per real frame, before the frame's draws. If the combined
     * resident total is over the ceiling, shed the globally-coldest
     * records across all stages until it is back under (or nothing more
     * is safely evictable — then resTOT stays above the ceiling, the
     * honest signal that the working set itself must shrink). Returns
     * bytes shed. Zero allocation and near-zero cost on a healthy frame:
     * the candidate gather runs only when already over ceiling.
     */
    enforce(): number;
    /** Test seam: forget every registered stage. */
    _resetForTest(): void;
}
/** The one governor every GlStage registers with at construction. */
export declare const StageVram: StageVramGovernor;
export {};
//# sourceMappingURL=stageVram.d.ts.map