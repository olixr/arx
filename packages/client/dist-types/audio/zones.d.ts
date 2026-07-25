/**
 * Where the ear is — the audio's map of the world, pure and testable.
 *
 * Three listening zones, weighted continuously so music and ambience
 * can crossfade instead of switching: TOWN (Dawnmead's green and its
 * ring of cottages), WILD (the open overworld), CAVE (anything
 * underground). The weights always sum to 1.
 *
 * Geography facts these lean on: the village zone spans (-96,16)-(0,80)
 * with its green near (-64,48); everything at y ≥ 512 is the dark band
 * — per-player delves sit at y ≥ 8192 — where worldgen emits solid
 * cave. The town radii hug the built-up hamlet (~22 tiles) and let the
 * last hedgerows trail off by ~36.
 */
export interface ZoneWeights {
    town: number;
    wild: number;
    cave: number;
}
export type ZoneId = keyof ZoneWeights;
/** The dark band: worldgen's underground begins here. */
export declare const UNDERGROUND_Y = 512;
export declare function zoneWeights(x: number, y: number): ZoneWeights;
/** The single strongest zone — what the music commits to. */
export declare function dominantZone(w: ZoneWeights): ZoneId;
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