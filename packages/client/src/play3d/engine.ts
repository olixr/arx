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
import { ORBIT_LIMITS, clampOrbit, dollyBy, easeAngle, easeTowards, orbitOffset, type OrbitPose } from './orbit.js';
import type { Backend, StageRenderer } from './stageBackend.js';

/** The 2D client's render-scale law: cap effective DPR by CSS area. */
export function capDpr(devicePixelRatio: number, cssW: number, cssH: number): number {
  const area = cssW * cssH;
  const cap = area > 3.5e6 ? 1.5 : 2;
  return Math.min(devicePixelRatio, cap);
}

export interface EngineHooks {
  /** Input, the game step, the orbit target. Runs BEFORE the camera is placed. */
  frame: (dt: number, nowMs: number) => void;
  /** Everything that reads the camera. Runs AFTER it is placed. */
  late: (dt: number, nowMs: number) => void;
  /** The draw (post stack or plain render). */
  draw: () => void;
}

export class Engine {
  readonly renderer: StageRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** Where the orbit looks (the player's chest), world units. */
  readonly target = new THREE.Vector3();
  /** Input lands here... */
  readonly want: OrbitPose = { yaw: Math.PI * 0.12, pitch: 0.78, dist: 16 };
  /** ...and the live pose eases toward it. */
  readonly pose: OrbitPose = { yaw: this.want.yaw, pitch: this.want.pitch, dist: this.want.dist };
  private readonly offset = new THREE.Vector3();
  private raf = 0;
  private lastMs = 0;
  private running = false;
  private lost = false;
  private readonly unwatchContext: () => void;
  private readonly observer: ResizeObserver | null;
  private dprMedia: MediaQueryList | null = null;
  cssW = 1;
  cssH = 1;
  dpr = 1;
  /** Last frame's wall interval, ms. */
  frameMs = 16.7;
  onResize: ((cssW: number, cssH: number, dpr: number) => void) | null = null;
  onContext: ((lost: boolean) => void) | null = null;

  private readonly onLost = (): void => {
    this.lost = true;
    cancelAnimationFrame(this.raf);
    this.onContext?.(true);
  };
  private readonly onRestored = (): void => {
    this.lost = false;
    this.onContext?.(false);
    if (this.running) this.schedule();
  };
  private readonly onAnyResize = (): void => this.resize();

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly backend: Backend,
    private readonly hooks: EngineHooks,
  ) {
    this.renderer = backend.renderer;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 260);
    this.scene.add(this.camera);
    this.unwatchContext = backend.watchContext(this.onLost, this.onRestored);
    window.addEventListener('resize', this.onAnyResize);
    this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.onAnyResize) : null;
    this.observer?.observe(canvas);
    this.resize();
  }

  resize(): void {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const devicePr = window.devicePixelRatio || 1;
    this.cssW = w;
    this.cssH = h;
    this.dpr = capDpr(devicePr, w, h);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.armDprWatch(devicePr);
    this.onResize?.(w, h, this.dpr);
  }

  /** Re-arm the monitor-hop listener for the ratio we just laid out at. */
  private armDprWatch(devicePr: number): void {
    if (typeof window.matchMedia !== 'function') return;
    this.dprMedia?.removeEventListener('change', this.onAnyResize);
    this.dprMedia = window.matchMedia(`(resolution: ${devicePr}dppx)`);
    this.dprMedia.addEventListener('change', this.onAnyResize);
  }

  /** Orbit input: drag pixels + wheel notches this frame. */
  orbitInput(dragX: number, dragY: number, wheel: number): void {
    this.want.yaw -= dragX * 0.0055;
    this.want.pitch += dragY * 0.004;
    if (wheel !== 0) this.want.dist = dollyBy(this.want.dist, wheel);
    clampOrbit(this.want);
  }

  /** Jump both poses (probe/teleport). */
  setOrbit(yaw: number, pitch: number, dist: number): void {
    this.want.yaw = yaw;
    this.want.pitch = pitch;
    this.want.dist = dist;
    clampOrbit(this.want);
    this.pose.yaw = this.want.yaw;
    this.pose.pitch = this.want.pitch;
    this.pose.dist = this.want.dist;
  }

  /** Ease the live pose, place the camera on the orbit, refresh its matrices. */
  private placeCamera(dt: number): void {
    this.pose.yaw = easeAngle(this.pose.yaw, this.want.yaw, 10, dt);
    this.pose.pitch = easeTowards(this.pose.pitch, this.want.pitch, 10, dt);
    this.pose.dist = easeTowards(this.pose.dist, this.want.dist, 7, dt);
    orbitOffset(this.pose, this.offset);
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    // Near plane scales with distance so a close orbit never clips the
    // body and a far one keeps depth precision for the ink pass.
    this.camera.near = Math.max(0.3, this.pose.dist * 0.04);
    this.camera.far = Math.max(200, this.pose.dist * 8 + ORBIT_LIMITS.distMax);
    this.camera.updateProjectionMatrix();
    // The `late` hook reads matrixWorldInverse (frustum, pick, anchors)
    // before render() would otherwise refresh it.
    this.camera.updateMatrixWorld();
  }

  get yaw(): number {
    return this.pose.yaw;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastMs = performance.now();
    this.schedule();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private schedule(): void {
    this.raf = requestAnimationFrame(this.tick);
  }

  /** One frame in the law's order (`poseDt` lets a probe snap the orbit). */
  private step(dt: number, poseDt: number, nowMs: number): void {
    this.hooks.frame(dt, nowMs);
    this.placeCamera(poseDt);
    this.hooks.late(dt, nowMs);
    this.renderer.info.reset();
    this.hooks.draw();
  }

  private readonly tick = (nowMs: number): void => {
    if (!this.running || this.lost) return;
    this.schedule();
    const raw = nowMs - this.lastMs;
    this.lastMs = nowMs;
    this.frameMs = raw;
    // A tab back from the background does not replay its whole absence.
    const dt = Math.min(0.1, raw / 1000);
    this.step(dt, dt, nowMs);
  };

  /** Render one frame synchronously (probe use); the pose snaps. */
  renderOnce(nowMs = performance.now()): void {
    this.step(0.016, 1, nowMs);
  }

  dispose(): void {
    this.stop();
    this.unwatchContext();
    window.removeEventListener('resize', this.onAnyResize);
    this.observer?.disconnect();
    this.dprMedia?.removeEventListener('change', this.onAnyResize);
    this.backend.dispose();
  }
}
