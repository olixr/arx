/**
 * THE POST STACK ON WEBGL (play3d S1; backend/ since S3) — the HD-2D
 * unifier, on EffectComposer. Reached only through
 * `Backend.createPost` (stageBackend.ts).
 *
 *   RenderPass (scene → linear half-float target with a DEPTH texture)
 *   → InkPass (ONE fullscreen pass: depth-edge INK ring, tilt-shift,
 *     warm/cool grade, vignette)
 *   → OutputPass (linear → sRGB encode + tone mapping, the standard way)
 *
 * The July spike's post shader did its own `pow(1/2.2)` because a raw
 * ShaderMaterial sampling an sRGB target must re-encode or the frame
 * drops a stop. Modern Three.js makes that a non-problem: the composer
 * runs in LINEAR half-float and OutputPass owns the encode. The ink
 * pass reads the scene DEPTH texture off the composer's read buffer
 * (both ping-pong targets carry one — clone() copies the depth
 * texture), so the ring lands on every silhouette that has depth —
 * cliff lips, billboards against sky, bodies against ground — without
 * a normal buffer or a second geometry pass.
 *
 * The composer target is MULTISAMPLED (4×): the canvas itself carries
 * no MSAA (backend/webgl.ts), so the scene's edges — cliff lips,
 * terrain silhouettes — resolve here, and the depth texture the ink
 * pass reads is the resolved one. The target is built at the
 * renderer's DRAWING-BUFFER size and the composer is never told a
 * pixel ratio twice (EffectComposer multiplies a passed target's size
 * by the ratio again on setPixelRatio — the dpr² allocation).
 *
 * Toggleable: `enabled = false` renders the scene straight to the
 * canvas. Each stage has its own strength uniform for A/B.
 */
import * as THREE from 'three';
import type { PostStage } from '../stageBackend.js';
export declare class PostStack implements PostStage {
    private readonly renderer;
    private readonly scene;
    private readonly camera;
    enabled: boolean;
    private readonly composer;
    private readonly target;
    private readonly scenePass;
    private readonly ink;
    private readonly output;
    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera);
    /** Strengths 0..1 for A/B: ink ring, tilt-shift, grade. */
    set(opts: {
        ink?: number;
        tilt?: number;
        grade?: number;
        night?: number;
    }): void;
    /** CSS pixels + the renderer's pixel ratio (the composer scales). */
    resize(cssW: number, cssH: number, dpr: number): void;
    render(): void;
    dispose(): void;
}
//# sourceMappingURL=webglPost.d.ts.map