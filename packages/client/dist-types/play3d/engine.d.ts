/**
 * THE SECOND DOOR'S ENGINE (play3d S1) — renderer factory, scene,
 * camera rig, resize/DPR, context loss, and the frame loop.
 *
 * Laws:
 *  - ONE factory constructs the renderer (`createRenderer`). WebGL2
 *    today; the `webgpu` kind is the named seam for WebGPURenderer
 *    (three/webgpu) — it is not wired because the headless rig has no
 *    navigator.gpu to prove it on, and it must never be an accident.
 *  - Real projection, real depth: PerspectiveCamera, depth buffer on
 *    everything. There is no y-sort anywhere in this client.
 *  - The ORBIT rig (orbit.ts) owns the camera: input lands on a target
 *    pose, the live pose eases toward it; the camera sits on the orbit
 *    around the player's head.
 *  - DPR is CAPPED (2, and 1.5 past 3.5M CSS px — the 2D client's
 *    render-scale lesson: fill rate is the cost on a Retina window).
 *  - Fixed-step SIM (30 Hz accumulator, clamped catch-up) vs per-frame
 *    RENDER with an interpolation alpha, so gameplay stepping never
 *    depends on the display rate.
 *  - Context loss is handled: lost → loop stops, restored → resumes;
 *    Three re-uploads retained resources on its own.
 *  - `dispose()` releases everything it made; the owner disposes what
 *    it added to the scene.
 */
import * as THREE from 'three';
import { type OrbitPose } from './orbit.js';
export type BackendKind = 'webgl' | 'webgpu';
export interface RendererOpts {
    kind?: BackendKind;
    antialias?: boolean;
}
/** THE ONE FACTORY. */
export declare function createRenderer(canvas: HTMLCanvasElement, opts?: RendererOpts): THREE.WebGLRenderer;
/** The 2D client's render-scale law: cap effective DPR by CSS area. */
export declare function capDpr(devicePixelRatio: number, cssW: number, cssH: number): number;
export interface EngineHooks {
    /** Fixed-step simulation. */
    sim: (dt: number, nowMs: number) => void;
    /** Per-frame update before render; alpha = sim interpolation. */
    frame: (dt: number, alpha: number, nowMs: number) => void;
    /** The draw (post stack or plain render). */
    draw: () => void;
}
export declare class Engine {
    readonly canvas: HTMLCanvasElement;
    private readonly hooks;
    readonly renderer: THREE.WebGLRenderer;
    readonly scene: THREE.Scene<THREE.Object3DEventMap>;
    readonly camera: THREE.PerspectiveCamera;
    /** Where the orbit looks (the player's chest), world units. */
    readonly target: THREE.Vector3;
    /** Input lands here... */
    readonly want: OrbitPose;
    /** ...and the live pose eases toward it. */
    readonly pose: OrbitPose;
    private readonly offset;
    private raf;
    private lastMs;
    private acc;
    private running;
    private lost;
    cssW: number;
    cssH: number;
    dpr: number;
    /** Last frame's wall interval, ms. */
    frameMs: number;
    onResize: ((cssW: number, cssH: number, dpr: number) => void) | null;
    onContext: ((lost: boolean) => void) | null;
    private readonly onLost;
    private readonly onRestored;
    private readonly onWindowResize;
    constructor(canvas: HTMLCanvasElement, hooks: EngineHooks, opts?: RendererOpts);
    resize(): void;
    /** Orbit input: drag pixels + wheel notches this frame. */
    orbitInput(dragX: number, dragY: number, wheel: number): void;
    /** Jump both poses (probe/teleport). */
    setOrbit(yaw: number, pitch: number, dist: number): void;
    /** Ease the live pose and place the camera on the orbit. */
    private placeCamera;
    get yaw(): number;
    start(): void;
    stop(): void;
    private schedule;
    private readonly tick;
    /** Render one frame synchronously (probe use). */
    renderOnce(nowMs?: number): void;
    dispose(): void;
}
//# sourceMappingURL=engine.d.ts.map