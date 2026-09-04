/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, G-1) — the
 * instanced blade renderer.
 *
 * One WebGL2 program draws a whole field of blocky, low-poly blades from
 * a single instance buffer. Each blade is a near-rectangular strip (a
 * blunt chisel top, not a spike) the vertex shader builds from its
 * instance record (root, height, width, lean, phase, tone) and leans to
 * THE ONE WIND (grassWindGlsl — the exact CPU wind); the fragment shader
 * shades it in FLAT tone bands — shaded root (AO) → body → lit cap, hard
 * steps off the shimmer ramp (BLADE_FILLS), never a gradient — so the
 * blade reads as our vectorized, faceted brand, not a soft smear. No
 * texture atlas: the blades are flat graded facets, not textured detail.
 *
 * This is the renderer in isolation (fed instances, a view matrix, and
 * time). Scene integration — the camera homography, depth-LOD, the
 * y-sort slot, the ?grass=gpu flag — rides on top (proposal §A / G-2).
 */
import { type GrassProj } from './grassGpu.js';
/** Max simultaneous disturbers (walkers/entities pressing the grass). */
export declare const MAX_DISTURB = 8;
export declare class GrassGpuRenderer {
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
    private readonly uWindGain;
    private readonly uDisturb;
    private readonly uDisturbN;
    private readonly uNdcRemap;
    private instanceCount;
    private disposed;
    /** `paletteFills` is BLADE_FILLS (PAL_TONES·PAL_LIGHTS `#rrggbb`, tone-
     *  major) — passed in so the renderer shares the meadow's exact ramp
     *  without importing the whole grass module's generation side. */
    constructor(gl: WebGL2RenderingContext, paletteFills: readonly string[]);
    /** (Re)point the interleaved instance attributes so instance 0 reads
     *  from blade `baseFloats/GRASS_INSTANCE_FLOATS` — used to draw a
     *  contiguous band slice (WebGL2 has no baseInstance). Assumes the VAO
     *  and instance buffer are bound. */
    private bindInstanceAttribs;
    /** Upload the packed instance buffer for this frame's blades. */
    upload(instances: Float32Array, count: number): void;
    /**
     * Draw the field. `proj` carries the frame's projectWorld homography
     * inputs (the whole meadow rides one projection). Options:
     *   · windGain — scales the whole-blade wind shear (default 0.12).
     *   · disturb  — walkers pressing the grass, packed 4 floats each
     *     [worldX, worldY, radius, strength], up to MAX_DISTURB; the scene
     *     feeds the nearby players/entities here each frame.
     */
    draw(proj: GrassProj, timeSec: number, opts?: {
        windGain?: number;
        disturb?: Float32Array;
    }): void;
    /**
     * G1 — THE TALL BLADE INTERLEAVES. Set the shared per-frame uniforms
     * (projection, wind, time, disturbers) ONCE for a run of band sub-draws.
     * `count` blades are uploaded (the whole by-sorted tall array); each
     * band is then a `drawBand` slice into its own atlas slot. Call before
     * a sequence of drawBand, then drawBandEnd.
     */
    beginBands(instances: Float32Array, count: number, proj: GrassProj, timeSec: number, opts?: {
        windGain?: number;
        disturb?: Float32Array;
    }): void;
    /** Draw one band slice [i0, i0+count) with its atlas NDC remap. The
     *  caller has set the atlas viewport/scissor for this band's slot. */
    drawBand(i0: number, count: number, remap: {
        sx: number;
        sy: number;
        bx: number;
        by: number;
    }): void;
    /** End a band run: unbind the VAO and restore the base attrib offset so
     *  a subsequent whole-field `draw` starts at instance 0. */
    drawBandEnd(): void;
    /**
     * Free every GL object this renderer owns. Call when swapping the flag
     * off, changing maps, or before re-creating on context restore — a
     * long-lived game must not leak programs/buffers/textures. Idempotent.
     */
    dispose(): void;
}
//# sourceMappingURL=grassGpuRenderer.d.ts.map