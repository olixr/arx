/**
 * Blend-mode mappings for the stage, with their derivations written
 * down — a blend bug reads as a lighting bug three towns away, so
 * every equation here is shown, not asserted.
 *
 * Both backends work in PREMULTIPLIED alpha. Canvas2d stores
 * premultiplied internally; GL uploads with UNPACK_PREMULTIPLY_ALPHA
 * and the fragment shader outputs premultiplied color. For a source
 * S = (s·a, a) premultiplied and destination D:
 *
 *  source-over:       R = S + D·(1−a)            → (ONE, ONE_MINUS_SRC_ALPHA)
 *  lighter (plus):    R = S + D                  → (ONE, ONE)
 *  destination-out:   R = D·(1−a)                → (ZERO, ONE_MINUS_SRC_ALPHA)
 *  destination-over:  R = S·(1−Da) + D           → (ONE_MINUS_DST_ALPHA, ONE)
 *
 * multiply and screen are separable-mode composites; their FULL forms
 * carry (1−Da) and (1−a) terms. On an OPAQUE destination (Da = 1 —
 * the main frame is cleared opaque and stays opaque, which
 * StageBackend.begin guarantees) they reduce to fixed-function:
 *
 *  multiply: R = S·D + S·(1−Da) + D·(1−a)
 *          Da=1 →  S·D + D·(1−a)             → (DST_COLOR, ONE_MINUS_SRC_ALPHA)
 *  screen:   R = S + D − S·D
 *               =  S·(1−D) + D               → (ONE_MINUS_DST_COLOR, ONE)
 *
 * LAW: multiply/screen items may only target opaque destinations.
 * Phase A3's shadow FBO has real alpha — it uses source-over and
 * destination-out only, which are exact at any Da. If a future pass
 * ever needs multiply onto an alpha target, it gets a shader, not a
 * silently-wrong blendFunc.
 */
import { StageBlend } from './stageTypes.js';
/** Canvas2d composite-operation names, indexed by StageBlend. */
export declare const BLEND_CANVAS_OP: readonly GlobalCompositeOperation[];
/**
 * GL blendFunc factors, indexed by StageBlend, as WebGL enum VALUES
 * (numeric constants from the spec — pure data, testable in node
 * without a context; they are identical across every conforming
 * implementation).
 */
export declare const GL_ONE = 1;
export declare const GL_ZERO = 0;
export declare const GL_ONE_MINUS_SRC_ALPHA = 771;
export declare const GL_DST_COLOR = 774;
export declare const GL_ONE_MINUS_DST_COLOR = 775;
export declare const GL_ONE_MINUS_DST_ALPHA = 773;
export declare const BLEND_GL_FUNC: ReadonlyArray<readonly [number, number]>;
/** The blends whose fixed-function form assumes an opaque target. */
export declare function blendNeedsOpaqueTarget(b: StageBlend): boolean;
/**
 * The blends that only mean anything on an ALPHA target.
 * destination-out ERASES destination alpha — on the main frame, which
 * is opaque by contract (and whose backbuffer is opaque — GL
 * `alpha:false`, WebGPU `alphaMode:'opaque'` — so the page can never
 * bleed through), erasure is undefined-by-design
 * and the two backends would diverge silently. In the real frame it
 * never happens there: the interior punch lives on the shadow LAYER,
 * which phase A3 gives the stage as an alpha FBO target. Until then —
 * and forever, on the main target — both backends REFUSE it loudly.
 */
export declare function blendNeedsAlphaTarget(b: StageBlend): boolean;
//# sourceMappingURL=stageBlend.d.ts.map