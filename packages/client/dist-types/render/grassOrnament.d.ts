/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, G-2) — the ornament
 * pass: flowers and seed-heads as a SECOND instanced program, drawn over
 * the blades.
 *
 * These carry the meadow's colour — the blue/yellow/cream/lavender blooms
 * and the golden grain ears the baked field deals sparsely. They are
 * rendered PROCEDURALLY (no atlas), faithful to the baked art:
 *   · a flower = a thin stem + a "pixel-flower plus" (four petal chips of
 *     the flower's palette around a cream core), exactly as buildFlower;
 *   · a seed-head = a thin stem + four gold chips tapering up an ear,
 *     alternating off the axis, exactly as buildSeed.
 * Both bend to THE ONE WIND (grassWindGlsl) — the same gust as the blades
 * and the CPU field. One instanced draw paints every bloom on screen.
 *
 * The instance record packs both kinds; `kind` (0 flower, 1 seed) selects
 * the head layout in the vertex shader. Colours come from ORNAMENT_FILLS
 * (grass.ts) so the blooms match the baked meadow to the byte.
 */
import { type GrassProj } from './grassGpu.js';
import type { Flower, SeedHead } from './grass.js';
/** Floats per ornament instance:
 *  [rootX, rootY, height, size, kind, pal, phase, lean]. */
export declare const ORNAMENT_INSTANCE_FLOATS = 8;
/**
 * Pack flowers then seed-heads into one interleaved instance buffer.
 * Flowers get kind=0 and their palette index; seeds get kind=1, their
 * static lean, and pal=0 (unused). Reuses `out` when it fits (pooled).
 * Returns the buffer and the instance count via `out` length semantics —
 * callers pass the count (flowers.length + seeds.length) alongside.
 */
export declare function packOrnamentInstances(flowers: readonly Flower[], seeds: readonly SeedHead[], out?: Float32Array): Float32Array;
export declare class GrassOrnamentRenderer {
    private readonly gl;
    private readonly program;
    private readonly vao;
    private readonly tmplBuf;
    private readonly instanceBuf;
    private readonly palTex;
    private readonly uScale;
    private readonly uYScale;
    private readonly uOrigin;
    private readonly uViewport;
    private readonly uTime;
    private readonly uBobGain;
    private instanceCount;
    private disposed;
    /** `palette` is ORNAMENT_FILLS ([petal0..3, core, gold, stem]). */
    constructor(gl: WebGL2RenderingContext, palette: readonly string[]);
    upload(instances: Float32Array, count: number): void;
    /** Draw every ornament. `proj` is the same projectWorld homography the
     *  blades use; `bobGain` scales the wind nod (1 = the baked meadow's sway). */
    draw(proj: GrassProj, timeSec: number, bobGain?: number): void;
    /** Free every GL object. Idempotent. */
    dispose(): void;
}
//# sourceMappingURL=grassOrnament.d.ts.map