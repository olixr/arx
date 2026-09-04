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
import { ORBIT_LIMITS, clampOrbit, dollyBy, easeAngle, easeTowards, orbitOffset, type OrbitPose } from './orbit.js';

export type BackendKind = 'webgl' | 'webgpu';

export interface RendererOpts {
  kind?: BackendKind;
  antialias?: boolean;
}

/** THE ONE FACTORY. */
export function createRenderer(canvas: HTMLCanvasElement, opts: RendererOpts = {}): THREE.WebGLRenderer {
  const kind = opts.kind ?? 'webgl';
  if (kind === 'webgpu') {
    // The seam: `import('three/webgpu')` → WebGPURenderer with the same
    // public surface this engine drives (setSize/setPixelRatio/render/
    // info/shadowMap/outputColorSpace). Unverifiable in the headless
    // rig (no navigator.gpu), so it stays a named refusal, not a guess.
    throw new Error('play3d: webgpu backend is not wired yet (see docs/play3d-plan.md)');
  }
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: opts.antialias ?? true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap is deprecated in r185 (collapses to PCF); PCF +
  // shadow.radius is the soft edge now.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // We reset the ledger ourselves at frame start so a multi-pass frame
  // (shadow map + scene + post) confesses its whole cost, not the last pass.
  renderer.info.autoReset = false;
  return renderer;
}

/** The 2D client's render-scale law: cap effective DPR by CSS area. */
export function capDpr(devicePixelRatio: number, cssW: number, cssH: number): number {
  const area = cssW * cssH;
  const cap = area > 3.5e6 ? 1.5 : 2;
  return Math.min(devicePixelRatio, cap);
}

export interface EngineHooks {
  /** Fixed-step simulation. */
  sim: (dt: number, nowMs: number) => void;
  /** Per-frame update before render; alpha = sim interpolation. */
  frame: (dt: number, alpha: number, nowMs: number) => void;
  /** The draw (post stack or plain render). */
  draw: () => void;
}

const SIM_DT = 1 / 30;
const MAX_CATCHUP = 5;

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
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
  private acc = 0;
  private running = false;
  private lost = false;
  cssW = 1;
  cssH = 1;
  dpr = 1;
  /** Last frame's wall interval, ms. */
  frameMs = 16.7;
  onResize: ((cssW: number, cssH: number, dpr: number) => void) | null = null;
  onContext: ((lost: boolean) => void) | null = null;

  private readonly onLost = (e: Event): void => {
    e.preventDefault();
    this.lost = true;
    cancelAnimationFrame(this.raf);
    this.onContext?.(true);
  };
  private readonly onRestored = (): void => {
    this.lost = false;
    this.onContext?.(false);
    if (this.running) this.schedule();
  };
  private readonly onWindowResize = (): void => this.resize();

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly hooks: EngineHooks,
    opts: RendererOpts = {},
  ) {
    this.renderer = createRenderer(canvas, opts);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 260);
    this.scene.add(this.camera);
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
    window.addEventListener('resize', this.onWindowResize);
    this.resize();
  }

  resize(): void {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.cssW = w;
    this.cssH = h;
    this.dpr = capDpr(window.devicePixelRatio || 1, w, h);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize?.(w, h, this.dpr);
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

  /** Ease the live pose and place the camera on the orbit. */
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

  private readonly tick = (nowMs: number): void => {
    if (!this.running || this.lost) return;
    this.schedule();
    const raw = nowMs - this.lastMs;
    this.lastMs = nowMs;
    this.frameMs = raw;
    const dt = Math.min(0.1, raw / 1000);
    // Fixed-step sim with bounded catch-up (a tab coming back from
    // the background does not simulate its whole absence).
    this.acc += dt;
    let steps = 0;
    while (this.acc >= SIM_DT && steps < MAX_CATCHUP) {
      this.hooks.sim(SIM_DT, nowMs);
      this.acc -= SIM_DT;
      steps++;
    }
    if (steps === MAX_CATCHUP) this.acc = 0;
    const alpha = this.acc / SIM_DT;
    this.hooks.frame(dt, alpha, nowMs);
    this.placeCamera(dt);
    this.renderer.info.reset();
    this.hooks.draw();
  };

  /** Render one frame synchronously (probe use). */
  renderOnce(nowMs = performance.now()): void {
    this.hooks.frame(0.016, 1, nowMs);
    this.placeCamera(1);
    this.renderer.info.reset();
    this.hooks.draw();
  }

  dispose(): void {
    this.stop();
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
