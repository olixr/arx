/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, G-2) — the scene
 * bridge.
 *
 * The renderer's primary surface is canvas2d; the WebGL stages composite
 * by blitting their own offscreen canvases onto it. This layer follows
 * that exact pattern for the grass: it owns a private offscreen WebGL2
 * canvas + a GrassGpuRenderer, draws the visible field into it each frame,
 * and hands the canvas back for the renderer to `drawImage` into the 2d
 * frame at the grass slot (below entities, before the world lightmap — so
 * the grass is world-lit for free, exactly as the canvas2d meadow is).
 *
 * Self-contained and resilient: it sizes to the frame, survives WebGL
 * context loss/restore (falls inert so the renderer reverts to the baked
 * meadow that frame, then rebuilds), and disposes cleanly when the flag
 * toggles off. It knows nothing of the renderer's internals — it takes
 * depth-sorted blades, a camera frame, and packed disturbers.
 */
import { GrassGpuRenderer } from './grassGpuRenderer.js';
import { GRASS_INSTANCE_FLOATS, grassViewMatrix, packBladeInstances } from './grassGpu.js';
import type { Blade } from './grass.js';

/** The camera + timing for one frame, in the renderer's own terms. */
export interface GrassFrame {
  /** World→screen zoom (Camera.scale) and vertical squash (yScale). */
  scale: number;
  yScale: number;
  /** Snapped screen origins in CSS px (camOriginX / camOriginY). */
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

export class GrassGpuLayer {
  /** The offscreen canvas the renderer blits. */
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private renderer: GrassGpuRenderer | null = null;
  private readonly palette: readonly string[];
  private instances: Float32Array = new Float32Array(0);
  private readonly viewMat = new Float32Array(9);
  private lost = false;

  constructor(palette: readonly string[]) {
    this.palette = palette;
    this.canvas = document.createElement('canvas');
    // Context loss is normal on the web (GPU reset, tab sleep). Handle it
    // so a lost context degrades to the baked meadow, then self-heals.
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.renderer = null;
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.buildRenderer();
    });
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      // Depth-sorted opaque blades painted back-to-front; no depth buffer.
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      // The 2d frame reads this via drawImage every frame — preserve isn't
      // needed and costs memory.
      preserveDrawingBuffer: false,
    });
    this.buildRenderer();
  }

  private buildRenderer(): void {
    if (!this.gl || this.lost) return;
    try {
      this.renderer = new GrassGpuRenderer(this.gl, this.palette);
    } catch {
      // A driver that can't compile the program → stay inert (baked meadow).
      this.renderer = null;
      this.gl = null;
    }
  }

  /** True when the layer can render this frame (context + program alive). */
  get ok(): boolean {
    return this.gl !== null && this.renderer !== null && !this.lost;
  }

  /**
   * Draw the visible field into the offscreen canvas and return it for the
   * renderer to blit, or null if the layer is unavailable this frame (the
   * caller then falls back to the baked meadow). `blades` MUST already be
   * in draw order — sorted back-to-front by world-y — because the blades
   * are opaque and there is no depth buffer; order is the depth.
   */
  render(blades: readonly Blade[], f: GrassFrame): HTMLCanvasElement | null {
    if (!this.ok || !this.gl || !this.renderer) return null;
    const gl = this.gl;
    const wDev = Math.max(1, Math.round(f.wCss * f.dpr));
    const hDev = Math.max(1, Math.round(f.hCss * f.dpr));
    if (this.canvas.width !== wDev) this.canvas.width = wDev;
    if (this.canvas.height !== hDev) this.canvas.height = hDev;
    gl.viewport(0, 0, wDev, hDev);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (blades.length === 0) return this.canvas; // a clean transparent frame

    this.instances = packBladeInstances(blades, this.instances);
    this.renderer.upload(this.instances, blades.length);
    grassViewMatrix(f.scale, f.yScale, f.ox, f.oy, f.wCss, f.hCss, this.viewMat);
    this.renderer.draw(this.viewMat, f.timeSec, {
      windGain: f.windGain,
      disturb: f.disturb,
    });
    return this.canvas;
  }

  /** Free the GL program/buffers and drop the context. Idempotent. */
  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.lost = true;
  }
}

/** Floats the disturb buffer needs per entity — [x, y, radius, strength]. */
export const DISTURB_STRIDE = 4;

/** Reference so downstream imports of GRASS_INSTANCE_FLOATS stay one hop
 *  from the layer without reaching into grassGpu directly. */
export { GRASS_INSTANCE_FLOATS };
