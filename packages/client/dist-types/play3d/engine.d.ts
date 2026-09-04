/**
 * THE SECOND DOOR'S ENGINE (play3d S1; S3 review fixes) — scene, camera
 * rig, resize/DPR, context loss, and the frame loop over a Backend.
 *
 * Laws:
 *  - The engine never names a GPU API. It drives a `StageRenderer`
 *    (stageBackend.ts) handed to it by THE ONE FACTORY
 *    (backend/createBackend.ts); context loss reaches it through
 *    `Backend.watchContext`.
 *  - Real projection, real depth: PerspectiveCamera, depth buffer on
 *    everything. There is no y-sort anywhere in this client.
 *  - The ORBIT rig (orbit.ts) owns the camera: input lands on a target
 *    pose, the live pose eases toward it; the camera sits on the orbit
 *    around the player's head.
 *  - DPR is CAPPED (2, and 1.5 past 3.5M CSS px — the 2D client's
 *    render-scale lesson: fill rate is the cost on a Retina window).
 *  - Resize is OBSERVED, not assumed: a ResizeObserver on the canvas
 *    catches CSS-driven size changes with no window event, a
 *    `(resolution: Ndppx)` media listener catches a monitor hop at the
 *    same CSS size, and the window listener stays as the fallback.
 *  - THE FRAME ORDER: `frame` (input, the game step, where the orbit
 *    target goes) → the camera is placed and its matrices refreshed →
 *    `late` (everything that reads the camera: frustum culling, body
 *    repaints, the cursor pick, the chrome's pins) → `draw`. Nothing
 *    reads a stale camera; `renderOnce` keeps the same order.
 *  - Simulation stepping is NOT this engine's: ClientGame runs its own
 *    fixed-step tick inside `update()` (the 2D client's law, one law
 *    for both doors). The engine hands `frame` the wall dt only.
 *  - Context loss is handled: lost → loop stops, restored → resumes and
 *    the owner is told (it re-bakes what it chose not to retain).
 *  - `dispose()` releases everything it made; the owner disposes what
 *    it added to the scene.
 */
import * as THREE from 'three';
import { type OrbitPose } from './orbit.js';
import type { Backend, StageRenderer } from './stageBackend.js';
/** The 2D client's render-scale law: cap effective DPR by CSS area. */
export declare function capDpr(devicePixelRatio: number, cssW: number, cssH: number): number;
export interface EngineHooks {
    /** Input, the game step, the orbit target. Runs BEFORE the camera is placed. */
    frame: (dt: number, nowMs: number) => void;
    /** Everything that reads the camera. Runs AFTER it is placed. */
    late: (dt: number, nowMs: number) => void;
    /** The draw (post stack or plain render). */
    draw: () => void;
}
export declare class Engine {
    readonly canvas: HTMLCanvasElement;
    readonly backend: Backend;
    private readonly hooks;
    readonly renderer: StageRenderer;
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
    private running;
    private lost;
    private readonly unwatchContext;
    private readonly observer;
    private dprMedia;
    cssW: number;
    cssH: number;
    dpr: number;
    /** Last frame's wall interval, ms. */
    frameMs: number;
    onResize: ((cssW: number, cssH: number, dpr: number) => void) | null;
    onContext: ((lost: boolean) => void) | null;
    private readonly onLost;
    private readonly onRestored;
    private readonly onAnyResize;
    constructor(canvas: HTMLCanvasElement, backend: Backend, hooks: EngineHooks);
    resize(): void;
    /** Re-arm the monitor-hop listener for the ratio we just laid out at. */
    private armDprWatch;
    /** Orbit input: drag pixels + wheel notches this frame. */
    orbitInput(dragX: number, dragY: number, wheel: number): void;
    /** Jump both poses (probe/teleport). */
    setOrbit(yaw: number, pitch: number, dist: number): void;
    /** Ease the live pose, place the camera on the orbit, refresh its matrices. */
    private placeCamera;
    get yaw(): number;
    start(): void;
    stop(): void;
    private schedule;
    /** One frame in the law's order (`poseDt` lets a probe snap the orbit). */
    private step;
    private readonly tick;
    /** Render one frame synchronously (probe use); the pose snaps. */
    renderOnce(nowMs?: number): void;
    dispose(): void;
}
//# sourceMappingURL=engine.d.ts.map