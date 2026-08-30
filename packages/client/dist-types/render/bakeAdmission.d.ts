/**
 * THE CACHE ALWAYS GAINS GROUND — the admission law for the world's
 * sprite bakes (discrete props, flora, trees), as pure arithmetic.
 *
 * The renderer's sprite caches turn a piece's live procedural painter
 * into one drawImage a frame. Minting a sprite costs real paint, so
 * the mints are metered: an arrival ceiling for pieces on screen right
 * now, an ordinary per-frame allowance for pad-band pre-bakes and
 * cadence refreshes.
 *
 * This module exists because the metering, written inline, grew a
 * failure mode nobody could see: the gate asked for half the running
 * average bake cost UP FRONT, the running average only ever updates
 * INSIDE an admitted bake, and on a machine where one bake costs more
 * than a lane's whole allowance the gate closed for good with no way
 * back. The caches stopped growing, and the render paths — which
 * treated "no sprite" as "draw nothing" — stopped drawing the world.
 * That was a whole class of user-visible flicker (props and streets
 * phasing out, worse the weaker the machine) hiding inside two
 * arithmetic comparisons.
 *
 * The laws pinned here, in order of who wins:
 *
 *  1. THE ESTIMATE MAY NEVER OUTGROW ITS LANE. The "don't start on
 *     fumes" ask is clamped to half the lane's own allowance, so a
 *     lane holding its full allowance ALWAYS admits, whatever the
 *     estimate says. Deadlock is unrepresentable.
 *  2. THE ARRIVAL PAYS ONCE. A piece with no sprite whose extent is on
 *     screen RIGHT NOW bakes while the arrival ceiling holds — no
 *     estimate, no count. N uncached pieces owe N bakes; paying them
 *     converges, deferring them does not (every deferred frame repaints
 *     live at the same order of cost and buys nothing).
 *  3. THE FLOOR. One first-bake per frame is guaranteed even past every
 *     budget, so the estimate always gets a fresh sample and the cache
 *     converges from any state.
 *  4. RE-BAKES ARE POLISH. A sprite already in hand is already correct
 *     on screen; its refresh gets no floor and stands down entirely
 *     through a zoom glide (the whole herd crosses the scale threshold
 *     at once, and would only re-bake AGAIN at the settled scale).
 */
/** Which lane a bake was admitted on — the caller charges accordingly. */
export declare const enum BakeLane {
    /** Declined: paint live if on screen, skip if not. */
    None = 0,
    /** The visible-now arrival lane — charges the arrival ceiling. */
    Arrival = 1,
    /** The ordinary per-frame allowance. */
    Budgeted = 2,
    /** The guaranteed one-per-frame mint (law 3). Charged exactly like
     *  `Budgeted`, but the caller must mark the frame's floor spent. */
    Floor = 3
}
/** The frame's remaining bake allowances (all ms except `count`). */
export interface BakeBudgets {
    /** Arrival ceiling left this frame (VIS_SPRITE_BAKE_MS at frame top). */
    arrivalMsLeft: number;
    /** Ordinary allowance left this frame (SPRITE_BAKE_MS at frame top). */
    budgetMsLeft: number;
    /** The ordinary allowance's full size — what law 1 clamps against. */
    budgetMsFull: number;
    /** Hard per-frame count backstop for the ordinary lane. */
    count: number;
    /** Running average bake cost (ms) — the "don't start on fumes" ask. */
    costEma: number;
    /** Has this frame's guaranteed first-bake been spent? */
    floorUsed: boolean;
    /** True while the player zoom is gliding — re-bakes stand down. */
    gliding: boolean;
}
/**
 * Decide whether a sprite bake may run, and on which lane.
 *
 * `missing` — the piece has no cached sprite at all (as opposed to one
 * that is merely stale). `visNow` — its extent overlaps the viewport
 * this frame. Callers must charge the lane they are given: `Arrival`
 * draws down `arrivalMsLeft` as well as `budgetMsLeft`.
 */
export declare function admitBake(b: BakeBudgets, missing: boolean, visNow: boolean): BakeLane;
//# sourceMappingURL=bakeAdmission.d.ts.map