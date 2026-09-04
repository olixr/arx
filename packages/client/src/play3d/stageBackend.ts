/**
 * THE STAGE BACKEND SEAM (play3d S3) — the ONE place the 3D client
 * knows which GPU API it is standing on.
 *
 * Law: nothing outside `backend/` imports three's WebGLRenderer, the
 * jsm post-processing stack, or a GLSL string. The engine, the lanes
 * (ground, sprites, bodies), the sky and the composition drive the
 * surfaces below, and `createBackend` is the one factory that picks
 * the realisation:
 *
 *   'webgl'  → backend/webgl.ts  (WebGL2: WebGLRenderer, EffectComposer,
 *              raw-GLSL billboards, webglcontextlost/restored)
 *   'webgpu' → a named refusal. The WebGPU realisation is
 *              three/webgpu's WebGPURenderer + TSL NodeMaterials for the
 *              billboard law + three/tsl PostProcessing, reporting loss
 *              through `device.lost`. It is not wired because the
 *              headless rig has no navigator.gpu to prove it on, and it
 *              must never be an accident (docs/play3d-plan.md).
 *
 * `StageRenderer` is the renderer surface the engine drives, named as
 * a Pick so it stays honest to what is actually called (WebGPURenderer
 * carries the same members). A backend also owns the two operations
 * that are API-specific by nature: landing a painted canvas on a
 * resident atlas page (sub-rect upload, never a page re-upload), and
 * the context-loss subscription. The factory itself is
 * backend/createBackend.ts (it must import the realisations; this file
 * stays type-only so every lane can import it without pulling WebGL).
 */
import type * as THREE from 'three';
import type { BillboardFactory } from './billboard.js';

export type BackendKind = 'webgl' | 'webgpu';

export interface BackendOpts {
  kind?: BackendKind;
  /**
   * MSAA on the canvas itself. Off by default: with the post stack on,
   * the scene renders into the composer's multisampled target and the
   * canvas only receives one fullscreen quad — canvas MSAA would buy
   * nothing and cost a resolve.
   */
  antialias?: boolean;
}

/** The renderer surface the engine and the HUD drive. */
export type StageRenderer = Pick<
  THREE.WebGLRenderer,
  | 'domElement'
  | 'setSize'
  | 'setPixelRatio'
  | 'getPixelRatio'
  | 'getDrawingBufferSize'
  | 'render'
  | 'info'
  | 'shadowMap'
  | 'outputColorSpace'
  | 'toneMapping'
  | 'dispose'
>;

/** The post stack: the HD-2D unifier, or a plain draw when disabled. */
export interface PostStage {
  enabled: boolean;
  /** Strengths 0..1 for A/B: ink ring, tilt-shift, grade; night 0..1. */
  set(opts: { ink?: number; tilt?: number; grade?: number; night?: number }): void;
  /** CSS pixels + the renderer's pixel ratio. */
  resize(cssW: number, cssH: number, dpr: number): void;
  render(): void;
  dispose(): void;
}

export interface Backend {
  readonly kind: BackendKind;
  readonly renderer: StageRenderer;
  readonly billboards: BillboardFactory;
  createPost(scene: THREE.Scene, camera: THREE.PerspectiveCamera): PostStage;
  /**
   * Make `tex` resident now (its one full upload), so later `blit`s
   * land on it without a re-upload.
   */
  prepareTexture(tex: THREE.Texture): void;
  /**
   * THE SUB-RECT UPLOAD: copy the whole of `src` (a painted canvas)
   * into the resident `dst` with its top-left at canvas-space (x, y)
   * — the same orientation `dst`'s own canvas would have (top row at
   * v = 1). `finish` = regenerate the mip chain after this copy (pass
   * it only on the last blit of a batch).
   */
  blit(src: HTMLCanvasElement, dst: THREE.Texture, x: number, y: number, finish: boolean): void;
  /** Subscribe to context loss/restore; returns the unsubscribe. */
  watchContext(onLost: () => void, onRestored: () => void): () => void;
  dispose(): void;
}

/** The named refusal for the backend that is not wired yet. */
export function refuseBackend(kind: BackendKind): never {
  throw new Error(`play3d: ${kind} backend is not wired yet (see docs/play3d-plan.md, stageBackend.ts)`);
}
