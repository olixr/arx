/**
 * The forage flora — DevCraft's wild herbs, grown as LANDMARKS.
 *
 * Every wild forage node (berry bush, fibre plant, wild sagewort,
 * wild moonbell) is GROWN from a species grammar + the tile's hash,
 * exactly like the trees: a deterministic model, three bespoke
 * structural variants per species, the same plant on every client
 * with no stored geometry.
 *
 * THE FORAGE LAWS (the ore-formation dialect, spoken in green):
 * - A node is a LANDMARK, not ground clutter. Player-waist to
 *   player-tall masses, bold blocky silhouettes, flat fills, hard
 *   chamfers — never wispy strokes.
 * - The PAYLOAD is the protagonist: what you harvest is the biggest,
 *   brightest thing on the plant — fat gem berries, heavy gold seed
 *   heads, a silver bloom spire, glowing lantern bells. Each carries
 *   an accent color that exists nowhere in the turf palette, and
 *   each TWINKLES at idle (the same beacon law as the mines) so the
 *   eye finds a forageable before the tooltip does.
 * - Grounded, always: dark parting shadow at the base, leaf-litter
 *   chips at the feet, dark silhouette backing behind foliage masses
 *   (fill-based — never stroke a union path).
 * - ONE wind: primary sway samples the shared windScalarAt field as
 *   a cantilever (base planted, crown moving). Every species adds a
 *   SECONDARY beat that lags the primary — berries shiver on their
 *   cluster, seed heads bob with follow-through, sagewort leaves
 *   flash their silver undersides in the gust bands (lift-only, the
 *   grass shimmer law), moonbell lanterns swing as pendulums.
 *
 * Model space: tiles, origin at the plant base, +x screen-right,
 * +y UP. Verticals paint at full tile scale (projection law).
 * Colliders: TILE_COLLIDER_RADIUS entries for these tiles pair with
 * floraBaseRadius() — a test pins physics to the drawn base mass.
 */
import { Tile } from '@devcraft/shared';
export declare const OUTLINE = "rgba(26, 20, 36, 0.45)";
export interface FloraMass {
    x: number;
    y: number;
    r: number;
    hf: number;
    seed: number;
    tone: number;
}
export interface FloraGem {
    x: number;
    y: number;
    r: number;
    rot: number;
    seed: number;
    /** Index of the mass whose rustle this gem rides. */
    mass: number;
}
export interface FloraBlade {
    x0: number;
    w: number;
    len: number;
    lean: number;
    tone: number;
    /** Carries a stacked gold seed head at the tip. */
    head: boolean;
}
export interface FloraPaddle {
    ang: number;
    dist: number;
    len: number;
    w: number;
    tier: number;
}
export interface FloraSpire {
    x: number;
    h: number;
    florets: number;
}
export interface FloraBell {
    u: number;
    size: number;
    phase: number;
}
export interface FloraStem {
    dir: number;
    reach: number;
    rise: number;
    bells: FloraBell[];
}
export interface FloraModel {
    species: number;
    variant: number;
    /** Ground → highest painted point, tiles. */
    height: number;
    /** Max half-width, tiles — cast shadow + culling. */
    spread: number;
    seed: number;
    masses: FloraMass[];
    gems: FloraGem[];
    blades: FloraBlade[];
    paddles: FloraPaddle[];
    spires: FloraSpire[];
    stems: FloraStem[];
}
export interface FloraFrame {
    bx: number;
    groundY: number;
    s: number;
    wx: number;
    wy: number;
    tSec: number;
    /** Night 0..1 — moonbell lanterns burn brighter after dark. */
    flame: number;
    windOverride?: number;
}
/** Moonbell: cool leaf fan, indigo lanterns, hot moon-white core. */
export declare const MOON_LEAF: readonly ["#38584e", "#4a7161", "#5e8a74"];
export declare const MOON_BELL: {
    deep: string;
    face: string;
    core: string;
};
export declare function mulberry(seed: number): () => number;
export declare function speciesOfFlora(tile: Tile): number;
/**
 * The drawn base-mass half-width per tile — TILE_COLLIDER_RADIUS in
 * shared tiles.ts must stay a whisker wider (test-pinned) so bodies
 * brush past exactly the plant they see.
 */
export declare function floraBaseRadius(tile: Tile): number;
export declare function floraModel(tile: Tile, h: number): FloraModel;
/** Staggered twinkle window: brief flash once per period (beacon law). */
export declare function twinkle(tSec: number, seed: number, period: number): number;
export declare function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, color: string): void;
/** Crisp parting shadow where the plant meets the turf (ore law). */
export declare function partingShadow(ctx: CanvasRenderingContext2D, bx: number, gy: number, w: number): void;
/** Blocky leaf-litter chips scattered at the feet — grounds the mass. */
export declare function litter(ctx: CanvasRenderingContext2D, bx: number, gy: number, s: number, seed: number, colors: readonly string[]): void;
/**
 * The sagewort floret tower: a snug dark silhouette behind stacked
 * chamfer florets whitening upward. `tipY` is the stalk's top; the
 * tower rises above it. Shared with the FARM-grown sagewort so field
 * and wild kin read as the same herb.
 */
export declare function floretTower(ctx: CanvasRenderingContext2D, tipX: number, tipY: number, s: number, florets: number, sway?: number): void;
/**
 * One moonbell lantern: layered halo, faceted indigo bell, breathing
 * moon-white core — swing rotates the bell about its hang point.
 * Shared with the FARM-grown moonbell (garden lantern flowers).
 */
export declare function bellLantern(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, swing: number, pulse: number, glowK: number): void;
/**
 * Paint a forage node. Returns the sampled wind so callers can gate
 * ambient effects on gust strength.
 */
export declare function paintFlora(ctx: CanvasRenderingContext2D, m: FloraModel, f: FloraFrame): number;
/** Tone-banded foliage masses with per-cluster rustle (tree dialect). */
export declare function paintMasses(ctx: CanvasRenderingContext2D, m: {
    masses: FloraMass[];
}, f: FloraFrame, wind: number, leaves: readonly string[], bend: number): Float32Array;
//# sourceMappingURL=flora.d.ts.map