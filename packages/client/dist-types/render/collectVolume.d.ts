import { Tile } from '@arx/shared';
/**
 * THE ONE RENDER — A0: the shared world-geometry flood.
 *
 * `collectVolume` generalizes the run-ring BFS that `tryRunRingItem`
 * used to keep to itself into ONE component-flood primitive. Its one
 * surviving caller is the run-ring path (furniture); the wall/hedge
 * volume paths that also called it (A2/A4) left with the camera lean on
 * 2026-09-04 (docs/perspective-review-and-3d-client-plan.md). A "volume" is the 4-connected same-class component of tiles
 * containing a seed cell, described as:
 *
 *   - the member tile list (flat `[x0,y0,x1,y1,…]`),
 *   - the LEXICOGRAPHIC-MIN anchor + inclusive tile bbox,
 *   - the EXPOSED-PERIMETER edge loop(s) in WORLD (tile-corner) coords —
 *     the outer boundary with interior shared edges dropped, and
 *   - a per-member height sampler hook the caller supplies.
 *
 * The perimeter is why runs render seamlessly downstream (invariants
 * #2/#3 of the epic): the shared-edge test is computed ONCE for the
 * whole component, so a run projects each world corner once instead of
 * per tile — no double-rounded seams. The loop doubles as the outline to
 * walk and as the silhouette to ring (A3).
 *
 * Membership is decided by CLASS EQUALITY: `classOf(tile,tx,ty)` maps a
 * sampled tile to a class key (any number) or `null` for "not a member".
 * Two cells join iff both classes are non-null AND equal to the SEED's
 * class. So the run-ring path passes a `classOf` that returns the tile
 * itself (exact-tile runs never merge across kinds); a caller that wants
 * kinds to coalesce maps them all to one class.
 */
/** Reads the ground tile at a world cell (`undefined` off-map). */
export type TileSampler = (tx: number, ty: number) => Tile | undefined;
/**
 * Maps a sampled tile (and its cell) to a class key, or `null` for
 * "not a member". Membership in a volume = same non-null class as seed.
 */
export type ClassOf = (tile: Tile, tx: number, ty: number) => number | null;
/** A world-space corner point (tile-corner integer coordinates). */
export interface VolPoint {
    x: number;
    y: number;
}
/** Pooled scratch so the hot flood allocates nothing per call. */
export interface VolumeScratch {
    members: number[];
    seen: Set<number>;
    queue: number[];
}
export interface CollectVolumeOpts {
    /**
     * Max member-tile count. If the component grows beyond this the flood
     * bails and `collectVolume` returns `null` (caller treats as "too big
     * — render plainly"), matching the run-ring `cap*2` guard.
     */
    cap?: number;
    /**
     * Per-member height sampler, echoed back on the volume so callers pass
     * `wallHeightAt` / the hedge height and A1/A2 lift the perimeter to it.
     * Defaults to a flat `() => 0`.
     */
    heightAt?: (tx: number, ty: number) => number;
    /**
     * Compute the exposed-perimeter loop(s). Defaults to `true`. The
     * run-ring hot path passes `false` (it needs only members + bbox), so
     * sharing the flood adds no per-frame edge work / garbage there.
     */
    perimeter?: boolean;
    /**
     * Pooled scratch to flood into. Reused across calls to stay alloc-free
     * in hot loops. When omitted, fresh arrays/set are allocated. NOTE: the
     * returned `members` aliases `scratch.members` — copy it if retained
     * past the next `collectVolume` call.
     */
    scratch?: VolumeScratch;
}
export interface Volume {
    /**
     * Member tiles as a flat `[x0,y0,x1,y1,…]`. Traversal order matches
     * the original run-ring DFS (stack pop, neighbour order E,W,S,N) so
     * dependent draw order is preserved. Aliases `scratch.members` when a
     * scratch was supplied — copy if retained.
     */
    members: number[];
    /** Member-tile count (`members.length / 2`). */
    count: number;
    /** Lexicographic-min anchor: min ty, then min tx. Stable per component. */
    ax: number;
    ay: number;
    /** Inclusive tile bbox. */
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    /**
     * Exposed-perimeter loop(s) in WORLD corner coords. One entry per
     * closed boundary (outer boundary + any holes). Each loop is a list of
     * corner points with collinear midpoints merged (a straight E–W run →
     * a 4-corner rectangle), canonicalized to start at the loop's
     * lexicographic-min corner, wound clockwise in screen (y-down) space so
     * the filled interior is on the right. Empty when `perimeter:false`.
     */
    perimeter: VolPoint[][];
    /** Per-member height sampler (the caller's hook, else `() => 0`). */
    heightAt: (tx: number, ty: number) => number;
}
/**
 * Flood the 4-connected same-class component containing (tx,ty).
 * Returns `null` if the seed isn't a member, or the component exceeds
 * `cap`. See the module doc for the full contract.
 */
export declare function collectVolume(sample: TileSampler, tx: number, ty: number, classOf: ClassOf, opts?: CollectVolumeOpts): Volume | null;
//# sourceMappingURL=collectVolume.d.ts.map