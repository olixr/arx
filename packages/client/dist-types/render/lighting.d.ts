/**
 * The scene light pass: one low-resolution lightmap multiplied over the
 * finished world painting.
 *
 * Design laws:
 * - ONE MAP RULES EXPOSURE. The daylight ambient fills the map; every
 *   point light punches brightness back in with `screen` compositing.
 *   Multiply once over the frame and the whole scene — terrain, grass,
 *   sprites, particles — darkens and warms coherently. (The body
 *   relight pass in the renderer is the map's one licensed partner: it
 *   CORRECTS a sprite toward the exposure at its own base, it never
 *   invents light the map doesn't know about.)
 * - LIGHT IS GEOGRAPHY. The map is drawn in WORLD space through the
 *   camera transform, so light pools are ground ellipses (foreshortened
 *   by the camera pitch like everything else), not screen-space discs.
 * - GEOMETRY, NOT TILES (v3). The world is tiled but its light is not:
 *   occluders inside a light's reach are greedily merged into
 *   RECTANGLES before anything casts, so a straight wall throws ONE
 *   clean-edged shadow instead of a scallop of per-tile wedges; lit
 *   faces merge into RUNS shaded continuously (light sampled at tile
 *   CORNERS, interpolated along the run) — a wall is one face of
 *   geometry, never a row of individually-lit blocks.
 * - SHADOWS ARE NOT VOIDS (v3). The umbra keeps ~10% of the pool (the
 *   world has bounce light), penumbras grade over two widening bands,
 *   and after the erase a soft WRAP halo puts indirect light back into
 *   the shadowed nooks — a lamp in a boxed room illuminates the room.
 * - THE MAP IS FILTERED (v3). One down-up blur pass smooths the whole
 *   field before the multiply — pool falloff, shadow rims and face
 *   gradients all soften together. Light is low-frequency; nothing in
 *   this map is allowed a razor edge.
 * - WALLS STOP LIGHT. Big static lights cast real 2D shadows; a coarse
 *   line-of-sight walk gates every lit face an occluding light paints.
 * - DAYLIGHT IS FREE. At full sun the ambient is white and the entire
 *   pass is skipped — the system costs nothing until dusk.
 * - QUARTER RES IS PLENTY. Light is low-frequency; the map renders at
 *   1/3 scale and stretches up. Gradients stay smooth, fills stay tiny.
 */
import type { DaylightSample } from '@arx/shared';
/** A light living in the world, gathered fresh each frame. */
export interface WorldLight {
    x: number;
    y: number;
    /** Reach in world tiles. */
    r: number;
    /** Readonly so shared EmitterSpec palette tuples flow in uncloned —
     *  nothing downstream mutates a light's color. */
    rgb: readonly [number, number, number];
    /** Peak brightness at the core, 0..1. */
    intensity: number;
    /** Static architectural lights cast hard wall shadows. */
    occlude?: boolean;
    /**
     * THE CONE (v4 phase 2): a directional throw — window spill, hooded
     * lanterns. `ux, uy` the unit axis, `spread` the half-angle in
     * radians. Pool AND lit faces clip to the wedge (apex pulled a hair
     * behind the light so the fixture itself stays lit); the map's blur
     * softens the edges. Cone lights must be NON-occluding — the patch
     * cache doesn't carry cones.
     */
    cone?: {
        ux: number;
        uy: number;
        spread: number;
    };
    /**
     * Source height, world tiles (v4 phase 3). The pool flattens — its
     * center is `z` away so it dims to (1 − z/R3), while the LATERAL
     * edge is preserved exactly (R3 = hypot(r, z)); faces respond to the
     * light's true height (a sconce strikes a wall near-horizontally,
     * a low crate obliquely from above). Absent = a ground flame.
     */
    z?: number;
}
/** Everything the lightmap needs to share the camera's view. */
export interface LightView {
    w: number;
    h: number;
    scale: number;
    yScale: number;
    /** Screen-space origin: worldToScreen(0,0). */
    ox: number;
    oy: number;
}
declare function poolStopsFor(zOverR: number): ReadonlyArray<readonly [number, number]>;
/** Test seam for THE PROFILE IS TOTAL (lightAdmission.test.ts) — the
 *  falloff derivation is pure, and the crash it used to hide lived
 *  entirely in its guard clause. */
export declare const poolStopsForTest: typeof poolStopsFor;
/**
 * THE SEATED HALO's dials (v4 phase 2; exported for the renderer AND
 * the ?lightlab mastering bench — ONE set of numbers, no lab drift).
 * One halo = two stamps from the shared radial sprite, drawn in the
 * sorted world pass under `lighter`, BEFORE the exposure multiply:
 *  - THE POOL: a camera-foreshortened ground ellipse at the fixture's
 *    ground anchor — light landing around the source;
 *  - THE CORONA: a round air-glow seated at the flame's own height.
 * The old post-multiply screen disc split its alpha between them; the
 * near-center sum (~1.1×) rides slightly hot so the multiply's dimming
 * near the pool rim nets out around the old read at the core.
 */
export declare const HALO_POOL_A = 0.62;
export declare const HALO_CORONA_A = 0.5;
export declare const HALO_CORONA_R = 0.6;
/** THE EMISSIVE CORE: the one post-multiply survivor — a flame-point
 *  glint capped in DEVICE pixels so it can only ever read as
 *  brilliance, never as lighting. */
export declare const CORE_STOPS: ReadonlyArray<readonly [number, number]>;
export declare const CORE_R_K = 0.16;
export declare const CORE_R_MAX_PX = 9;
export declare const CORE_A_K = 1.3;
export declare class LightingSystem {
    private readonly map;
    private readonly mctx;
    private readonly tmp;
    private readonly tctx;
    /** Face-run scratch: one run at a time is shaped here (horizontal
     *  intensity gradient ∩ vertical base fade) then composited. */
    private readonly face;
    private readonly fctx;
    /** Half-res bounce buffer for the map's blur pass. */
    private readonly blur;
    private readonly bctx;
    /** Scratch collections, reused across lights — no per-frame garbage. */
    private readonly rects;
    private readonly runs;
    /**
     * THE STANDING LAMP REMEMBERS: an occluding light is architecture —
     * fixed position, fixed geometry — yet its pool/shadow/wrap/face
     * composite was rebuilt from scratch every frame, the dearest work in
     * the whole pass. Each one is composed ONCE into a patch and stamped
     * per frame; the flicker rides the stamp (alpha for intensity, a
     * center-scale for the radius wobble), and a staggered TTL rebuild
     * absorbs geometry changes within a second. Keyed by position+color.
     * THE LAMP RIDES THE GLIDE: patches remember their build scale and
     * the stamp rescales — a zoom no longer clears the whole cache (that
     * clear re-minted every lamp's canvas on the next frame, a
     * guaranteed hitch on wheel-zoom in a lamplit town). A slightly
     * soft light pool during the glide is invisible; the staggered TTL
     * re-crisps everything within a second of settling, and a bounded
     * number of far-off-scale patches rebuild early each frame.
     */
    private readonly patches;
    private frame;
    private offScaleRebuilds;
    /** THE CROSSING: lamp patches are position-keyed on the current
     *  plane — drop them whole when the world changes under the lights. */
    dropWorld(): void;
    /**
     * Paint the frame's exposure. `blocks` answers whether a tile stops
     * light (walls, cliffs); it is only consulted near occluding lights.
     * `tallH` reports the camera-facing face height of whatever stands
     * on a tile, in WORLD-y units (0 = nothing tall) — it drives the
     * lit-face response for walls AND standing props alike.
     */
    draw(ctx: CanvasRenderingContext2D, view: LightView, sky: DaylightSample, lights: WorldLight[], blocks: (tx: number, ty: number) => boolean, tallH: (tx: number, ty: number) => number, 
    /** Per-tile material response for lit faces (v4 phase 3): stone
     *  returns light, wood a little less, foliage drinks it. 1 = full. */
    faceGain: (tx: number, ty: number) => number): void;
    /**
     * THE CONE's wedge clip, in world coordinates (the current transform
     * is the world→map camera). Apex pulled 0.3 tiles behind the light
     * so the emitting fixture sits inside its own wedge; the far rim is
     * one quadratic bow through the axis — THE MAP IS FILTERED softens
     * whatever straightness remains.
     */
    private clipCone;
    /** The light's radial falloff, pre-rendered — intensity rides
     *  globalAlpha at the stamp, so the sprite is shared per color;
     *  elevated sources take the hung-pool flattened profile. */
    private poolSprite;
    /** The soft indirect halo: wider and dimmer than the pool. */
    private wrapSprite;
    /**
     * The light's brightness on a camera-facing face at world x, base
     * row ye: N·L (how squarely the face looks at the pool) times the
     * pool's falloff. Sampled at tile CORNERS so neighbouring faces
     * shade continuously — the run reads as one surface.
     *
     * With a source height (v4 phase 3) the vector runs through 3D: the
     * vertical leg is the light's height over the FACE MIDDLE, so a
     * sconce strikes a wall of its own height near-horizontally (full
     * response) but a low crate obliquely from above (dim) — and the
     * falloff normalizes by R3 so the ground-edge reach the fixture was
     * tuned for is preserved exactly.
     */
    private faceK;
    /**
     * Fill `this.runs` with the light's lit faces, merged into
     * continuous runs: contiguous tiles on one base row with one height
     * fuse, carrying corner-sampled intensities. When `blocks` is given
     * (occluding lights), a coarse sight-line walk zeroes the shadowed
     * stretch of a run — light lands on the first thing it meets.
     */
    private gatherFaceRuns;
    /** Coarse LOS: sample the sight line one tile at a time, keeping
     *  0.7 tiles clear of both endpoints so neither the light's own tile
     *  nor the face's body blocks itself. */
    private sightClear;
    /**
     * Shape and composite the gathered runs. Face brightness is
     * SEPARABLE — k(x) along the run times the base-anchored vertical
     * fade — so each run is built exactly on the face scratch: fill the
     * horizontal corner-stop gradient, intersect (destination-in) with
     * the vertical fade, then screen the patch onto the destination.
     * One run, three fills, one blit; no per-tile seams anywhere.
     */
    private paintFaceRuns;
    /**
     * GEOMETRY, NOT TILES: greedily merge every blocking tile in the
     * light's reach into rectangles (row runs, then identical runs fuse
     * downward). A straight wall becomes ONE rect casting ONE shadow —
     * the per-tile wedge scallops this replaces were the tile grid
     * showing through the light.
     */
    private collectRects;
    /**
     * A light with wall shadows: painted alone on a scratch canvas, its
     * shadow erased from merged geometry, then screened onto the map.
     * The erase is GRADED — two widening penumbra bands, then the core
     * at SHADOW_DENSITY (never to zero: the world has bounce light) —
     * and after it the wrap halo pours indirect light back over
     * everything, corners included. Lit faces paint last: they re-light
     * exactly the band a wall's own occlusion blacked out.
     */
    private drawOccludedLight;
    /**
     * Compose an occluding light's full patch — pool, graded shadow
     * erase, wrap halo, lit faces — in a frame anchored to the light's
     * own center, camera-independent by construction.
     */
    private buildLightPatch;
    /**
     * Project a merged rectangle's silhouette away from the light with
     * corner rays splayed outward by `splay` radians (0 = the exact hard
     * silhouette). Every back-facing edge of the rect erases one quad;
     * with rects merged there are no interior edges left to seam.
     */
    private castRectShadow;
}
export {};
//# sourceMappingURL=lighting.d.ts.map