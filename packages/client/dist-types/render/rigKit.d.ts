/**
 * THE MENAGERIE'S SHARED KIT (foundations F7 endgame) — the block-body
 * painter, outline ink, profile read, the hull geometry family, ring
 * path, the colossus bands and mesh ranks, the ooze strike and the
 * mount-spec cache: pure helpers every species stall leans on. A leaf
 * on purpose — species files import HERE, and the last value edges
 * back into rig.ts die.
 */
import type { BeastBlockFrame, BeastSpec } from './rig.js';
export declare const OUTLINE = "#241a2e";
/**
 * THE TWO PROFILE READS (arms-v3 Phase 1: named, single-sourced).
 * The RIG's facing weight is the honest cosine — `profileK = |fx|` —
 * and every arm/carry/depth law rides that. The FACE painters use this
 * snugger read instead: |fx| boosted 15% and clamped, so the head
 * commits to its profile band a beat before the body does (eyes and
 * muzzles read wrong mid-turn if the face lags the turn). Thirteen
 * mob-head painters each re-derived this inline before it was named —
 * one drifted constant away from thirteen different face laws.
 */
export declare function faceProfileK(fx: number): number;
export declare function ringPath(pts: Array<{
    x: number;
    y: number;
}>): Path2D;
/** Hoisted hull helpers — hullPath runs per beast slab per frame, so
 *  its comparator/scratch must not be rebuilt per call (GC churn). */
export declare const hullCmp: (a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}) => number;
export declare function hullCross(o: {
    x: number;
    y: number;
}, a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}): number;
export declare const hullSorted: Array<{
    x: number;
    y: number;
}>;
export declare const hullLower: Array<{
    x: number;
    y: number;
}>;
export declare const hullUpper: Array<{
    x: number;
    y: number;
}>;
/** Convex hull (monotone chain) — the silhouette of an extruded slab. */
export declare function hullPath(pts: Array<{
    x: number;
    y: number;
}>): Path2D;
export declare function paintBlockBody(ctx: CanvasRenderingContext2D, f: BeastBlockFrame, foot: Array<[number, number]>, topH: (X: number) => number, botH: (X: number) => number, base: string, marks?: (gx: (X: number, Y: number) => number, gyy: (X: number, Y: number) => number, lift: number) => void): void;
/**
 * THE SPIKE IS THE PLATE — the carapace is ONE lattice. A shared
 * vertex grid tiles the dome into scute plates, and EVERY plate
 * grows its own horn whose base ring IS the plate's corners (inset
 * a hair so the seam still reads between neighbors). Base-of-spike
 * matches base-of-shell at every band by construction — there is
 * no separate thorn layout left to drift against the mesh at the
 * quarters. The authored hand lives in the PROFILES: a per-column
 * height rank (the crown column is the vertebral saw, the flanks
 * step down toward the rim) and a per-band taper (tallest
 * amidships, dropping to bow and stern), per species.
 */
export declare const SNAPPER_BANDS: readonly number[];
export declare const SNAPPER_BAND_K: readonly number[];
/** Column edges as fractions of the hull's local half-width. */
export declare const MESH_COLS: readonly number[];
/** Per-column height rank and cant class (crown, inner, outer). */
export declare const MESH_COL_K: readonly number[];
export declare const MESH_COL_RANK: readonly number[];
/**
 * The cube's strike clock: gather (0..0.7), then the forward surge
 * (0.7..1) — a wall deciding to include you. (The hopper's jump-slam
 * runs its own three-beat curve inside the painter.)
 */
export declare function oozeStrike(at: number): {
    gath: number;
    spr: number;
};
export declare const MOUNT_SPEC_CACHE: Map<string, BeastSpec>;
//# sourceMappingURL=rigKit.d.ts.map