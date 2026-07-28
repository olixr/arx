/**
 * WATERFALLS — THE SPILL LAW.
 *
 * A cliff face becomes a waterfall where the world says the water
 * continues over it: FEED water on the high terrace within
 * FALL_LOOKBACK tiles behind the boundary, and PLUNGE water on the low
 * side within FALL_LOOKAHEAD tiles past the foot. Authored channels
 * stop at the lip (water never touches the Cliff rim strip — the
 * auto-fence makes that impossible), and plunge basins resume a tile
 * or two past the foot, so the scan is a short perpendicular walk on
 * BOTH sides, never a direct-adjacency test.
 *
 * The high walk demands elev === level the whole way (a taller wall
 * behind the rim means the water up there belongs to a HIGHER fall;
 * only the top face of a stacked drop owns the curtain). The low walk
 * accepts any elevation BELOW the level and reports where the water
 * actually lands (landElev) — a two-level sheer drop hangs ONE
 * curtain from the top crest to the true landing, through the
 * intermediate faces.
 *
 * Detection is pure world-data (unit-tested here); the curtain /
 * headrace / churn / outwash art lives in renderer.ts beside
 * cliffFaceItem, whose contour segments the curtains inherit — a
 * diagonal rim gets a sheared curtain by construction.
 */
/** Tiles scanned behind the boundary for feed water (k=0 is the Cliff
 *  rim strip itself, so the nearest legal feed sits at k=1). */
export declare const FALL_LOOKBACK = 4;
/** Tiles scanned past the foot for the plunge water. */
export declare const FALL_LOOKAHEAD = 4;
export interface SpillInfo {
    /** Tiles from the boundary back to the feed water (1..LOOKBACK-1). */
    race: number;
    /** Tiles from the foot row out to the plunge water (0 = water at the foot). */
    drop: number;
    /** Elevation the water lands at — level-1, or lower for stacked drops. */
    landElev: number;
}
type Sampler = (tx: number, ty: number) => number | undefined;
export declare function isFallWater(t: number | undefined): boolean;
/**
 * Spill test at a point ON a contour boundary. (mx,my) is the sample
 * point (a face-segment half midpoint), (nx,ny) the outward low-side
 * normal. Diagonal boundaries walk the diagonal first, then fall back
 * to each cardinal component — a channel meeting a beveled corner
 * rarely lines up with the exact diagonal ray.
 */
export declare function spillAt(ground: Sampler, elev: Sampler, mx: number, my: number, nx: number, ny: number, level: number): SpillInfo | null;
export {};
//# sourceMappingURL=waterfalls.d.ts.map