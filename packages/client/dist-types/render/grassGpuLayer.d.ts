import { GRASS_INSTANCE_FLOATS, type TallBand } from './grassGpu.js';
import { ORNAMENT_INSTANCE_FLOATS } from './grassOrnament.js';
import type { Blade, Flower, SeedHead } from './grass.js';
/** G1 — one tall band's atlas→screen blit. `src*` are DEVICE px in the
 *  tall atlas canvas; `dst*` are CSS px on the frame. The renderer emits
 *  one y-sorted DrawItem per band that draws atlas[src] → frame[dst]. */
export interface BandBlit {
    srcX: number;
    srcY: number;
    srcW: number;
    srcH: number;
    dstX: number;
    dstY: number;
    dstW: number;
    dstH: number;
    sortY: number;
}
/** The camera + timing for one frame, in the renderer's own terms. */
export interface GrassFrame {
    /** World→screen zoom (Camera.scale) and vertical squash (yScale). */
    scale: number;
    yScale: number;
    /** Screen origins in CSS px (camOriginX / camOriginY), matching the
     *  world feed. */
    ox: number;
    oy: number;
    /** Frame size in CSS px. */
    wCss: number;
    hCss: number;
    /** Device-pixel ratio for the backing store (crisp blades). */
    dpr: number;
    /** Seconds for the wind (matches the CPU meadow's tSec). */
    timeSec: number;
    /** Wind-shear gain (default the renderer's tuned value). */
    windGain?: number;
    /** Disturbers packed [worldX, worldY, radius, strength]×n (≤ MAX_DISTURB). */
    disturb?: Float32Array;
}
export declare class GrassGpuLayer {
    /** The offscreen canvas the renderer blits. */
    readonly canvas: HTMLCanvasElement;
    private gl;
    private renderer;
    private ornaments;
    private readonly palette;
    private readonly ornPalette;
    private instances;
    private ornInstances;
    private lost;
    /** G1 tall path — its own offscreen atlas canvas + GL context + renderer
     *  (a WebGL context binds ONE canvas, and the tall atlas has its own
     *  size/lifecycle, so it does not share the coat's canvas). Built lazily
     *  on the first renderTall. */
    readonly tallCanvas: HTMLCanvasElement;
    private tallGl;
    private tallRenderer;
    private tallLost;
    private tallInstances;
    private readonly bandBlits;
    /** G2 CAST path — its own offscreen canvas + GL context + shadow
     *  renderer. The cast layer composites at a DIFFERENT alpha than the
     *  blade coat (THE CAST LIES UNDER THE COAT), so it needs its own output
     *  image; a WebGL context binds one canvas, so it is a separate context.
     *  Degrades independently: a lost cast context makes renderShadow return
     *  null and the meadow simply draws its coat with no GPU shade that frame. */
    readonly shadowCanvas: HTMLCanvasElement;
    private shadowGl;
    private shadowRenderer;
    private shadowLost;
    private shadowInstances;
    private shadowTallInstances;
    /** G4 SKIRT path — its own offscreen atlas canvas + GL context +
     *  renderer. The over-foot skirt (grass nestling around an object's base)
     *  renders through the SAME per-band atlas machinery the tall blades use,
     *  but each grass-rooted object is ONE band at its own foot slot — so its
     *  atlas cannot share the tall atlas (that canvas is re-blitted at the
     *  tall bands' own sort rows this same frame). A separate context keeps
     *  the two atlases independent (and a lost skirt context simply drops the
     *  skirts that frame — the object falls back to its hard pasted base). */
    readonly skirtCanvas: HTMLCanvasElement;
    private skirtGl;
    private skirtRenderer;
    private skirtLost;
    private skirtInstances;
    private readonly skirtBlits;
    constructor(palette: readonly string[], ornamentPalette: readonly string[]);
    private buildRenderer;
    /** True when the layer can render this frame (context + programs alive). */
    get ok(): boolean;
    /**
     * Draw the visible field into the offscreen canvas and return it for the
     * renderer to blit, or null if the layer is unavailable this frame (the
     * caller then falls back to the baked meadow). `blades` MUST already be
     * in draw order — sorted back-to-front by world-y — because the blades
     * are opaque and there is no depth buffer; order is the depth.
     */
    render(blades: readonly Blade[], flowers: readonly Flower[], seeds: readonly SeedHead[], f: GrassFrame): HTMLCanvasElement | null;
    /** True when the cast path can render this frame. */
    get shadowOk(): boolean;
    /**
     * G2 — THE MEADOW CASTS ITS OWN SHADE. Render the whole visible field's
     * casts (short coat `blades` + tall `tallBlades`, as two instanced draws)
     * into the private shadow canvas as OPAQUE union coverage, and return it
     * for the renderer to blit UNDER the blade coat at the frame's shade
     * alpha. Because every cast is thrown by the SAME per-vertex wind term
     * the blades use, the whole field's shade sways uniformly — no baked
     * monolith, no player-centred radius. Both quad ends are ground points
     * run through projectWorld, so it is perspective-correct at q>0.
     *
     * `shade` is the cast colour in 0..1; `sx,sy` is the world-ground throw
     * per unit world-height (grassShadowOffset). Returns null when the cast
     * context is unavailable (the caller then draws the coat with no shade).
     */
    renderShadow(blades: readonly Blade[], tallBlades: readonly Blade[], f: GrassFrame, shade: readonly [number, number, number], sx: number, sy: number): HTMLCanvasElement | null;
    /** True when the tall atlas path can render this frame. */
    get tallOk(): boolean;
    /**
     * G1 — THE TALL BLADE INTERLEAVES. Render the tall standing mass into a
     * private atlas: each `band` (a contiguous slice of the by-sorted
     * `tallBlades`, from partitionTallBands) renders in ISOLATION into its
     * own atlas slot — ONE GL pass, no bakes — and the returned BandBlits
     * carry each slot's atlas src-rect and screen dst-rect. The renderer
     * emits one y-sorted DrawItem per blit, so a body slots BETWEEN bands at
     * its true foot row and blades rooted south of it occlude its lower body
     * CONTINUOUSLY. Returns [] (and the caller falls back to the CPU tall
     * pass) when the tall context is unavailable or nothing is in view.
     *
     * Isolated slots + one GL pass = the whole field costs one GPU→2d sync
     * (on the first band blit); the rest are cheap 2d copies at their slots.
     */
    renderTall(tallBlades: readonly Blade[], bands: readonly TallBand[], f: GrassFrame): BandBlit[];
    /** True when the skirt atlas path can render this frame. */
    get skirtOk(): boolean;
    /**
     * G4 — THE OVER-FOOT SKIRT. Identical atlas machinery to renderTall, but
     * fed the per-object skirt blades (generateSkirtBlades) and one band PER
     * OBJECT — each band's `sortY` is the object's foot row plus a hair, so
     * the renderer emits it as a y-sorted DrawItem that draws OVER the
     * object's lower base. A separate GL context/atlas from the tall path
     * (both blit this same frame), degrading independently. Returns [] when
     * the skirt context is unavailable or nothing is in view.
     */
    renderSkirt(skirtBlades: readonly Blade[], bands: readonly TallBand[], f: GrassFrame): BandBlit[];
    /** Shared atlas render for the tall + skirt band paths: each band renders
     *  in ISOLATION into its own slot of one offscreen atlas (a single GL
     *  pass), returning each slot's atlas src-rect + screen dst-rect for the
     *  renderer to y-sort. `which` selects the private context/canvas/renderer
     *  + instance buffer so the two atlases never clobber one another. */
    private renderBands;
    /** Free the GL programs/buffers and drop the context. Idempotent. */
    dispose(): void;
}
/** Floats the disturb buffer needs per entity — [x, y, radius, strength]. */
export declare const DISTURB_STRIDE = 4;
/** Reference so downstream imports of these strides stay one hop from the
 *  layer without reaching into the substrate modules directly. */
export { GRASS_INSTANCE_FLOATS, ORNAMENT_INSTANCE_FLOATS };
//# sourceMappingURL=grassGpuLayer.d.ts.map