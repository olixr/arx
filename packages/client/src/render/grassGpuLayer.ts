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
import { GRASS_INSTANCE_FLOATS, packBladeInstances, type GrassProj } from './grassGpu.js';
import { GrassOrnamentRenderer, ORNAMENT_INSTANCE_FLOATS, packOrnamentInstances } from './grassOrnament.js';
import type { Blade, Flower, SeedHead } from './grass.js';

/** The camera + timing for one frame, in the renderer's own terms. */
export interface GrassFrame {
  /** World→screen zoom (Camera.scale) and vertical squash (yScale). */
  scale: number;
  yScale: number;
  /** Screen origins in CSS px (camOriginX / camOriginY). Snapped at q=0;
   *  UNSNAPPED under a lean (q≠0), matching cameraProject / the world feed —
   *  the pre-divide snap would sawtooth-jitter through the perspective divide. */
  ox: number;
  oy: number;
  /** Lean parameter (Camera.q). 0 = flat/ortho, >0 = pitched perspective. */
  q: number;
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
  private ornaments: GrassOrnamentRenderer | null = null;
  private readonly palette: readonly string[];
  private readonly ornPalette: readonly string[];
  private instances: Float32Array = new Float32Array(0);
  private ornInstances: Float32Array = new Float32Array(0);
  private lost = false;

  constructor(palette: readonly string[], ornamentPalette: readonly string[]) {
    this.palette = palette;
    this.ornPalette = ornamentPalette;
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
      this.ornaments = new GrassOrnamentRenderer(this.gl, this.ornPalette);
    } catch {
      // A driver that can't compile a program → stay inert (baked meadow).
      this.renderer?.dispose();
      this.ornaments?.dispose();
      this.renderer = null;
      this.ornaments = null;
      this.gl = null;
    }
  }

  /** True when the layer can render this frame (context + programs alive). */
  get ok(): boolean {
    return this.gl !== null && this.renderer !== null && this.ornaments !== null && !this.lost;
  }

  /**
   * Draw the visible field into the offscreen canvas and return it for the
   * renderer to blit, or null if the layer is unavailable this frame (the
   * caller then falls back to the baked meadow). `blades` MUST already be
   * in draw order — sorted back-to-front by world-y — because the blades
   * are opaque and there is no depth buffer; order is the depth.
   */
  render(
    blades: readonly Blade[],
    flowers: readonly Flower[],
    seeds: readonly SeedHead[],
    f: GrassFrame,
  ): HTMLCanvasElement | null {
    if (!this.ok || !this.gl || !this.renderer || !this.ornaments) return null;
    const gl = this.gl;
    const wDev = Math.max(1, Math.round(f.wCss * f.dpr));
    const hDev = Math.max(1, Math.round(f.hCss * f.dpr));
    if (this.canvas.width !== wDev) this.canvas.width = wDev;
    if (this.canvas.height !== hDev) this.canvas.height = hDev;
    gl.viewport(0, 0, wDev, hDev);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (blades.length === 0 && flowers.length === 0 && seeds.length === 0) {
      return this.canvas; // a clean transparent frame
    }

    // ONE PROJECTION: the whole meadow projects through projectWorld's
    // homography (grassProjectGlsl), so blades and blooms parallax with the
    // world at exactly the player's rate under any lean.
    const proj: GrassProj = {
      scale: f.scale,
      yScale: f.yScale,
      ox: f.ox,
      oy: f.oy,
      q: f.q,
      wCss: f.wCss,
      hCss: f.hCss,
    };
    // Blades first, then the ornaments OVER them (blooms sit on the field).
    if (blades.length > 0) {
      this.instances = packBladeInstances(blades, this.instances);
      this.renderer.upload(this.instances, blades.length);
      this.renderer.draw(proj, f.timeSec, { windGain: f.windGain, disturb: f.disturb });
    }
    const ornN = flowers.length + seeds.length;
    if (ornN > 0) {
      this.ornInstances = packOrnamentInstances(flowers, seeds, this.ornInstances);
      this.ornaments.upload(this.ornInstances, ornN);
      this.ornaments.draw(proj, f.timeSec);
    }
    return this.canvas;
  }

  /** Free the GL programs/buffers and drop the context. Idempotent. */
  dispose(): void {
    this.renderer?.dispose();
    this.ornaments?.dispose();
    this.renderer = null;
    this.ornaments = null;
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.lost = true;
  }
}

/** Floats the disturb buffer needs per entity — [x, y, radius, strength]. */
export const DISTURB_STRIDE = 4;

/** Reference so downstream imports of these strides stay one hop from the
 *  layer without reaching into the substrate modules directly. */
export { GRASS_INSTANCE_FLOATS, ORNAMENT_INSTANCE_FLOATS };
