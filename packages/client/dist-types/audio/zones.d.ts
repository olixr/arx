/**
 * Where the ear is — the audio's map of the world, pure and testable.
 *
 * Three listening zones, weighted continuously so music and ambience
 * can crossfade instead of switching: TOWN (Dawnmead's green and its
 * ring of cottages), WILD (the open overworld), CAVE (anything
 * underground). The weights always sum to 1.
 *
 * Geography facts these lean on: Dawnmead's rect spans
 * (-160,-64)-(31,159) with its well and its danger anchor on the
 * rect's exact centre (-64,48). THE WORLDS APART: whether the ear is
 * underground is the PLANE'S law now (cave planes: the underworld,
 * the rifts), passed in by the caller — never a y-line; the surface
 * runs wild on every compass point. Each town's radii are sized to
 * its own rect: full weight over the built ground, trailing off to
 * wild a little past the hem.
 */
export interface ZoneWeights {
    town: number;
    wild: number;
    cave: number;
}
export type ZoneId = keyof ZoneWeights;
export declare function zoneWeights(x: number, y: number, underground?: boolean): ZoneWeights;
/** The single strongest zone — what the music commits to. */
export declare function dominantZone(w: ZoneWeights): ZoneId;
/**
 * THE SKY'S SEAM — did the clock pass dusk or dawn between two
 * readings? Pure and wrap-aware: the passage is measured forward from
 * `prev` (the clock only ever walks forward), and a warp-sized step
 * crosses nothing, so logging in at night never plays a dusk that
 * happened hours ago. The caller decides whether the sky is even
 * visible (no seam sounds underground).
 */
export declare function skySeam(prev: number, cur: number): 'dusk' | 'dawn' | null;
/**
 * Day gate for the ambient wildlife, from clock hours. Birds own the
 * day; the soft crickets own the dark. Both fade across dawn and dusk
 * (sunrise 5.5 / sunset 20.5 in shared daylight) rather than snapping,
 * and the crossover is offset so there's a quiet, expectant half-hour
 * where neither sings — real dusks have one.
 */
export declare function birdsK(hours: number): number;
export declare function cricketsK(hours: number): number;
//# sourceMappingURL=zones.d.ts.map