/**
 * THE MEADOW CASTS ITS OWN SHADE ON THE GPU (grass proposal, G-2) — the
 * instanced grass CAST renderer.
 *
 * The CPU meadow's shade is a frozen baked monolith EXCEPT a rectangle
 * swept LIVE around each moving body — a hard box edge that tracks the
 * player (the #2 "shadow radius" artifact). This renderer replaces that
 * whole scheme on the GPU path: every blade (short coat + tall bands)
 * projects a sheared GROUND shadow quad in the shader, thrown from the
 * blade's crown along the light ray, and bent by the SAME per-vertex wind
 * term the blades use (grassWindGlsl). So the whole field's shade sways
 * uniformly at frame rate — no baked monolith, no player-centred region,
 * no radius edge — and it is perspective-correct for free (both quad ends
 * are ground points run through the full projectWorld homography).
 *
 * The casts render OPAQUE (a flat shade colour) into a private offscreen
 * canvas as UNION coverage — overlapping quads overwrite, they do not
 * darken twice — exactly the CPU trick of baking casts opaque on one
 * canvas then compositing the whole layer at a single alpha. The renderer
 * then blits that canvas UNDER the blade coat at the frame's shade alpha:
 * THE CAST LIES UNDER THE COAT, one density with the world's shade.
 */
import { type GrassProj } from './grassGpu.js';
/** The cast vertex shader source — exported so the parity test can assert
 *  it rides the shared wind + projection (no private copy that could drift). */
export declare function grassShadowVertSrc(): string;
/**
 * Instanced grass-cast renderer. One WebGL2 program throws a sheared
 * ground quad from every blade; the short coat and the tall bands both
 * feed it (as two instanced draws into one canvas), so the entire visible
 * meadow's shade is one uniform, wind-animated layer with no radius.
 */
export declare class GrassShadowRenderer {
    private readonly gl;
    private readonly program;
    private readonly vao;
    private readonly tmplBuf;
    private readonly instanceBuf;
    private readonly uTime;
    private readonly uWindGain;
    private readonly uShadow;
    private readonly uShade;
    private readonly uScale;
    private readonly uYScale;
    private readonly uOrigin;
    private readonly uViewport;
    private readonly uDisturb;
    private readonly uDisturbN;
    private disposed;
    constructor(gl: WebGL2RenderingContext);
    private bindInstanceAttribs;
    /** Upload the packed blade instances (same layout as the blade renderer;
     *  the cast reads only root + shape). */
    upload(instances: Float32Array, count: number): void;
    /**
     * Draw `count` casts. `shade` is [r,g,b] in 0..1 (opaque union coverage;
     * the layer alpha applies at blit). `uShadow` is the world-ground throw
     * per unit world-height. Blend is DISABLED so overlaps overwrite (no
     * double darkening); MSAA still softens the silhouette edges.
     */
    draw(proj: GrassProj, timeSec: number, count: number, shade: readonly [number, number, number], shadowX: number, shadowY: number, opts?: {
        windGain?: number;
        disturb?: Float32Array;
    }): void;
    dispose(): void;
}
/** Convert a `#rrggbb` shade colour to the [r,g,b] 0..1 the shader wants. */
export declare function shadeRgb01(hex: string): [number, number, number];
/**
 * THE ONE SHEAR, on the ground. The world-ground shadow throw per unit
 * world-height, derived from the sky's shear (shadowX/Y · shadowLen, the
 * SAME inputs the CPU `setShadow` uses). The CPU cast throws its tip a
 * screen offset of `dir·shadowLen·hpx` (hpx = the blade's screen height =
 * H·scale); our quad's tip is a WORLD ground point run through the SAME
 * projectWorld homography as the blades, which applies scale (and scale·
 * yScale on y). Equating the two screen offsets, the scale (and yScale)
 * factors cancel, leaving this pure world vector — so the GPU cast lands
 * exactly where the CPU shade did, at q=0 and (perspective-correct) q>0.
 * Pure + tested.
 */
export declare function grassShadowOffset(shadowX: number, shadowY: number, shadowLen: number): {
    x: number;
    y: number;
};
//# sourceMappingURL=grassGpuShadow.d.ts.map