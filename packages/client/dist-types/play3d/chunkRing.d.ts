/** Tile → chunk coordinate (floor division, negative-safe). */
export declare function chunkOf(t: number): number;
/** Pack a signed chunk pair into one integer key (±32767 range). */
export declare function packChunk(cx: number, cy: number): number;
export declare function unpackCx(key: number): number;
export declare function unpackCy(key: number): number;
export interface RingEntry {
    cx: number;
    cy: number;
    /** Squared chunk distance from the ring centre — the sort key. */
    d2: number;
}
/**
 * Every chunk within `r` chunks (Chebyshev square) of (cx, cy), sorted
 * nearest-first by Euclidean chunk distance. `out` is reused: it is
 * truncated and refilled, and entries are mutated in place so a steady
 * ring never allocates after the first fill.
 */
export declare function ringAround(cx: number, cy: number, r: number, out: RingEntry[]): RingEntry[];
/** True when (cx, cy) lies outside the Chebyshev square of radius r. */
export declare function outsideRing(cx: number, cy: number, ccx: number, ccy: number, r: number): boolean;
//# sourceMappingURL=chunkRing.d.ts.map