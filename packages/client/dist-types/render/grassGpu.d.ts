import type { Blade } from './grass.js';
/** The frame's projection uniforms for the grass shaders — the exact
 *  Camera.worldToScreen affine inputs. Shared by the blade and
 *  ornament programs so the whole meadow rides one projection. */
export interface GrassProj {
    scale: number;
    yScale: number;
    /** Screen origin in CSS px (Camera.originX/Y). */
    ox: number;
    oy: number;
    /** Viewport in CSS px. */
    wCss: number;
    hCss: number;
}
/** Floats per grass instance in the packed buffer. Layout:
 *  [rootX, rootY, height, halfWidth, lean, phase, tone, seg2]. */
export declare const GRASS_INSTANCE_FLOATS = 8;
/** Pack blades into the interleaved instance buffer the GL instanced
 *  draw consumes (one instance per blade). Reuses `out` when it fits —
 *  the per-tile buffers are pooled, not re-minted each frame. */
export declare function packBladeInstances(blades: readonly Blade[], out?: Float32Array): Float32Array;
/**
 * G1 — THE TALL BLADE INTERLEAVES. A contiguous slice of the by-sorted
 * tall-blade instance buffer that shares one interleave depth (`sortY`).
 * Each band becomes one y-sorted DrawItem + one instanced GPU sub-draw
 * (drawn in isolation into its own atlas slot), so a body slots BETWEEN
 * bands at its true foot row.
 */
export interface TallBand {
    /** First blade index in the by-sorted array. */
    i0: number;
    /** Blade count in this band. */
    count: number;
    /** The band's interleave depth — the world row it y-sorts at. */
    sortY: number;
    /** Band world-y extent (min/max blade root), for screen-bbox bounding. */
    minBy: number;
    maxBy: number;
}
/**
 * Partition a BACK-TO-FRONT (by ascending) tall-blade array into fine
 * world-row bands of height `pitch` (world units). Blades are bucketed by
 * `floor(by / pitch)`; each occupied bucket becomes one band whose
 * `sortY` is the bucket CENTRE — so a body's foot at row fY slots between
 * the band centres, its interleave error bounded by pitch/2 (vs the old
 * two-fixed-lanes-per-tile hack whose midlines popped). Because the input
 * is sorted, every band is a contiguous slice (i0, count). Pure + tested.
 */
export declare function partitionTallBands(blades: readonly {
    by: number;
}[], pitch: number): TallBand[];
/**
 * G-PERF — COALESCE THE BANDS. partitionTallBands cuts one fine band per
 * occupied pitch bucket so a body can slot between ANY two world rows; but
 * that fine cut only earns its cost where a body actually stands. In open
 * field most adjacent bands have NOTHING sorting between them, so they can
 * merge into ONE blit — far fewer GL sub-draws, atlas slots and 2d copies,
 * the exact same pixels — and only the rows a body's foot occupies keep
 * their fine split (so the body still interleaves precisely).
 *
 * The rule: walk the ascending fine bands, greedily extending a run; refuse
 * to extend across a `splitRow` — an entity foot world-row — that would fall
 * STRICTLY INSIDE the run's blade-y span (`runMinBy < row < candidateMaxBy`),
 * because one blit at one sortY cannot draw both north-of and south-of a body
 * correctly. A run that never straddles a split row keeps the SAME
 * interleave the fine bands gave (it is only ever merged across body-free
 * rows); a run that would straddle one is cut there, exactly reproducing the
 * fine band at that row. So this is a strict cost reduction with no
 * interleave regression for any body whose row is honored.
 *
 * FAR-FIELD LOD: `nearMinBy` drops split rows north of it (up-screen, far
 * from the camera), letting the distance coalesce freely — a body out there
 * compresses to a few pixels and its fine interleave is imperceptible, so
 * paying per-row sub-draws for it is waste. Pass -Infinity to honor every
 * row (no LOD). `splitRows` need not be sorted; it is copied+filtered+sorted
 * here. A merged run's `sortY` is its span midpoint (any value in the
 * body-free span is correct); a lone band keeps its original `sortY`, so a
 * field with a body on every row returns the input unchanged.
 *
 * SPAN CAP: `maxSpan` bounds a merged run's world-y extent. The tall path
 * renders each band in ISOLATION into an atlas slot sized to its SCREEN
 * bbox — a slot as tall as the run's span PLUS a blade height — so an
 * unbounded merge produces a giant slot (a tall run under a lean can span
 * the whole screen), and the atlas balloons past the win. Capping the span
 * keeps every slot atlas-thin: the count still falls (a dense field merges
 * ~pitch:maxSpan-to-one) but no single band's bbox blows up. Pass Infinity
 * for no cap (the pure-geometry tests). Pure + tested.
 */
export declare function coalesceTallBands(bands: readonly TallBand[], splitRows: readonly number[], nearMinBy?: number, maxSpan?: number): TallBand[];
/**
 * G1 — THE ATLAS REMAP. The tall bands each render in ISOLATION (no
 * cross-band contamination, so a band's blit carries only its own blades)
 * into a distinct slot of ONE offscreen atlas — a single GL pass, then
 * cheap 2d blits at the interleaved y-sort slots. The blade shader still
 * projects through the camera affine (grassProjectGlsl),
 * emitting NDC for the REAL screen (viewport `SW×SH` device px). This
 * returns the affine `gl_Position.xy = ndc·scale + bias` that RETARGETS
 * that real-screen NDC into the band's atlas slot: the screen device rect
 * at (bandSx,bandSy) maps to the atlas device rect at (ax,ay), same size.
 * It is a pure NDC→NDC affine applied after the projection. Pure + tested
 * (corner mapping).
 *
 *   SW,SH = full-screen backbuffer size in DEVICE px (viewCss·dpr)
 *   AW,AH = atlas size in DEVICE px
 *   bandSx,bandSy = band screen bbox origin in DEVICE px
 *   ax,ay = band atlas-slot origin in DEVICE px
 */
export declare function bandNdcRemap(SW: number, SH: number, AW: number, AH: number, bandSx: number, bandSy: number, ax: number, ay: number): {
    sx: number;
    sy: number;
    bx: number;
    by: number;
};
/**
 * Build the world→clip `mat3` (column-major, 9 floats) a grass vertex
 * shader could consume as `uView`. It composes the renderer's affine
 * world→screen projection
 * (`screenX = wx·scale + ox`, `screenY = wy·scale·yScale + oy`, matching
 * Camera.worldToScreen; reference math in render/cameraProject.ts) with
 * the GL screen→NDC map, folding in
 * the Y-FLIP the stage shader applies (`ndcY = 1 − 2·screenY/h`), so
 * `uView · vec3(world,1)` lands each blade root exactly where the canvas2d
 * meadow paints it. `ox`/`oy` are the snapped screen origins (Camera.originX/Y);
 * `w`/`h` are the frame's CSS pixel dimensions. Alloc-free with `out`.
 *
 * RETIRED from the live path (Epic "THE ONE RENDER", B2): the grass shaders
 * project every vertex through `grassProjectGlsl` (the per-vertex form of the
 * same affine) instead of this matrix. Kept only as a pinned reference of the
 * affine map (grassGpu.test.ts); no live caller.
 */
export declare function grassViewMatrix(scale: number, yScale: number, ox: number, oy: number, w: number, h: number, out?: Float32Array): Float32Array;
/**
 * THE ONE PROJECTION in GLSL (Epic "THE ONE RENDER", phase B2). The grass
 * vertex shaders map every blade/bloom world point to `gl_Position` through
 * THIS function — the exact Camera.worldToScreen affine (render/renderer.ts;
 * reference math `projectWorld` in render/cameraProject.ts), not a private
 * view matrix, so the meadow parallaxes at exactly the player's rate and
 * never edge-crawls against bodies.
 *
 * The camera uniforms `(uScale, uYScale, uOrigin, uViewport)` carry the
 * frame's projection; `uOrigin` is the screen origin the feed computes with
 * `Camera.originX/Y`. Per vertex we form the screen point, then map to NDC with
 * the stage's Y-flip (`gl_Position.w = 1`).
 *
 * Short and tall grass ride one law: a blade tip moves with its root
 * because wind/trample move the point in WORLD space BEFORE this projection.
 * Pinned equal to `projectWorld` by grassProjectParity.test.ts via the JS
 * mirror `grassProjectMirror` below (the `grassWindMirror` pattern).
 */
export declare function grassProjectGlsl(): string;
/**
 * A JS transcription of grassProjectGlsl's screen-space math — for the
 * parity test and the tall-band bbox sweep. Given the camera uniforms and
 * a world point it returns the SCREEN position (pre-NDC). Asserting it
 * equals `projectWorld` proves the shader parallaxes the meadow at exactly
 * the player's rate. Keep it in lockstep with grassProjectGlsl (the test
 * fails if they drift). `uOrigin` is passed in already resolved
 * (Camera.originX/Y). Alloc-free when `out` is given.
 */
export declare function grassProjectMirror(scale: number, yScale: number, ox: number, oy: number, wx: number, wy: number, out?: {
    x: number;
    y: number;
}): {
    x: number;
    y: number;
};
/**
 * THE ONE WIND in GLSL. Returns `vec4(bendX, bendY, strength, lum)` —
 * the same four fields as WindSample — for a world point `w` at time
 * `t`. The wind direction (WX/WY) is templated from grass.ts so the two
 * cannot drift on the axis; the coefficients mirror `windAtInto` and are
 * pinned by the parity test. The vertex shader calls this per blade to
 * bend it exactly as the CPU meadow does.
 */
export declare function grassWindGlsl(): string;
/**
 * A JS transcription of grassWindGlsl — FOR THE PARITY TEST ONLY. It is
 * the GLSL formula line-for-line in JS, so asserting it equals the CPU
 * `windAtInto` proves the shader bends blades to the exact same wind.
 * Keep it in lockstep with grassWindGlsl above (the test fails if they
 * or windAtInto drift).
 */
export declare function grassWindMirror(wx: number, wy: number, t: number): {
    bx: number;
    by: number;
    s: number;
    l: number;
};
//# sourceMappingURL=grassGpu.d.ts.map