/**
 * THE UPLOAD IS A BAKE — the stage's texture-upload economy as pure
 * arithmetic (plan §3-A1, law: NOTHING HEAVY RUNS OUTSIDE A BUDGET).
 *
 * A chunk canvas is 4.3-17MB; pushing one through texImage2D is the
 * same order of stall as the bake that painted it, and an arrival
 * storm of uploads is the same jitter class rounds 10-13 spent
 * themselves killing. So uploads are metered exactly like bakes:
 *
 *  - the VISIBLE lane is urgent — a hole is worse than a hitch
 *    (THE ARRIVAL PAYS ONCE; the ms ceiling is only a runaway guard,
 *    and the emitter falls back to the canvas lane for anything the
 *    guard defers, so nothing ever fails to draw);
 *  - background/ring work (phase A2+) rides the small steady budget;
 *  - one admission per frame is guaranteed (THE CACHE ALWAYS GAINS
 *    GROUND — round 7's deadlock is unrepresentable when a full lane
 *    always admits at least once and the estimate keeps sampling);
 *  - the cost estimate is MEASURED, not assumed: an EMA of ms/MB from
 *    the machine's own texImage2D calls, seeded conservative. It
 *    meters the CPU submission cost — the driver's async half is not
 *    synchronously observable, and we do not pretend otherwise.
 */
/** Visible-now lane, ms/frame — the runaway guard, not a promise. */
export declare const GPU_URGENT_MS = 6;
/** Background/ring lane, ms/frame (consumers arrive in phase A2). */
export declare const GPU_STEADY_MS = 2;
/** Conservative ms-per-MB seed until the EMA has real samples
 *  (integrated GPUs measure ~0.5-2ms/MB; discrete far less). */
export declare const GPU_COST_SEED_MS_PER_MB = 2;
/** Estimated submission cost for `bytes` at the current measured rate. */
export declare function uploadEstMs(bytes: number, msPerMb: number): number;
/**
 * Admission: fits the remaining budget, OR is the frame's guaranteed
 * first admission (the floor that keeps the estimate sampled and the
 * queue draining under any budget — bakeAdmission's own law).
 */
export declare function admitUpload(msLeft: number, estMs: number, firstThisFrame: boolean): boolean;
/** EMA step for the measured cost, in ms per MB. Fast-moving (0.3):
 *  the first real samples should quickly wash out the seed. */
export declare function nextUploadCost(emaMsPerMb: number, tookMs: number, bytes: number): number;
//# sourceMappingURL=gpuBudget.d.ts.map