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
import {
  GRASS_INSTANCE_FLOATS,
  packBladeInstances,
  bandNdcRemap,
  grassProjectMirror,
  type GrassProj,
  type TallBand,
} from './grassGpu.js';
import { GrassOrnamentRenderer, ORNAMENT_INSTANCE_FLOATS, packOrnamentInstances } from './grassOrnament.js';
import type { Blade, Flower, SeedHead } from './grass.js';

/** G1 — one tall band's atlas→screen blit. `src*` are DEVICE px in the
 *  tall atlas canvas; `dst*` are CSS px on the frame. The renderer emits
 *  one y-sorted DrawItem per band that draws atlas[src] → frame[dst]. */
export interface BandBlit {
  srcX: number;
  srcY: number;
  srcW: number;
  srcH: number;
  dstX: number;
  dstY: number;
  dstW: number;
  dstH: number;
  sortY: number;
}

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

  /** G1 tall path — its own offscreen atlas canvas + GL context + renderer
   *  (a WebGL context binds ONE canvas, and the tall atlas has its own
   *  size/lifecycle, so it does not share the coat's canvas). Built lazily
   *  on the first renderTall. */
  readonly tallCanvas: HTMLCanvasElement;
  private tallGl: WebGL2RenderingContext | null = null;
  private tallRenderer: GrassGpuRenderer | null = null;
  private tallLost = false;
  private tallInstances: Float32Array = new Float32Array(0);
  private readonly bandBlits: BandBlit[] = [];

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
    const ctxOpts: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      // Depth-sorted opaque blades painted back-to-front; no depth buffer.
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      // The 2d frame reads this via drawImage every frame — preserve isn't
      // needed and costs memory.
      preserveDrawingBuffer: false,
    };
    this.gl = this.canvas.getContext('webgl2', ctxOpts);

    // G1 tall atlas — a second WebGL2 canvas/context (see field docs). It
    // degrades independently: a lost tall context makes renderTall return
    // an empty band list, and the renderer falls back to the CPU tall pass.
    this.tallCanvas = document.createElement('canvas');
    this.tallCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.tallLost = true;
      this.tallRenderer = null;
    });
    this.tallCanvas.addEventListener('webglcontextrestored', () => {
      this.tallLost = false;
      this.buildRenderer();
    });
    this.tallGl = this.tallCanvas.getContext('webgl2', ctxOpts);
    this.buildRenderer();
  }

  private buildRenderer(): void {
    if (this.gl && !this.lost && !this.renderer) {
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
    if (this.tallGl && !this.tallLost && !this.tallRenderer) {
      try {
        this.tallRenderer = new GrassGpuRenderer(this.tallGl, this.palette);
      } catch {
        this.tallRenderer?.dispose();
        this.tallRenderer = null;
        this.tallGl = null;
      }
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

  /** True when the tall atlas path can render this frame. */
  get tallOk(): boolean {
    return this.tallGl !== null && this.tallRenderer !== null && !this.tallLost;
  }

  /**
   * G1 — THE TALL BLADE INTERLEAVES. Render the tall standing mass into a
   * private atlas: each `band` (a contiguous slice of the by-sorted
   * `tallBlades`, from partitionTallBands) renders in ISOLATION into its
   * own atlas slot — ONE GL pass, no bakes — and the returned BandBlits
   * carry each slot's atlas src-rect and screen dst-rect. The renderer
   * emits one y-sorted DrawItem per blit, so a body slots BETWEEN bands at
   * its true foot row and blades rooted south of it occlude its lower body
   * CONTINUOUSLY. Returns [] (and the caller falls back to the CPU tall
   * pass) when the tall context is unavailable or nothing is in view.
   *
   * Isolated slots + one GL pass = the whole field costs one GPU→2d sync
   * (on the first band blit); the rest are cheap 2d copies at their slots.
   */
  renderTall(
    tallBlades: readonly Blade[],
    bands: readonly TallBand[],
    f: GrassFrame,
  ): BandBlit[] {
    const out = this.bandBlits;
    out.length = 0;
    if (!this.tallOk || !this.tallGl || !this.tallRenderer) return out;
    if (tallBlades.length === 0 || bands.length === 0) return out;
    const gl = this.tallGl;
    const dpr = f.dpr;

    // Blade world extent mirrors the vertex shader (grassGpuRenderer):
    // height ×1.55, half-width ×1.42×(≤1.08 jitter). Margins cover the
    // wind shear + trample lay-over the shader adds per vertex, so a
    // leaning/trampled blade is never clipped at its slot edge.
    const H_FACTOR = 1.55;
    const HW_FACTOR = 1.42 * 1.08;
    const X_MARGIN = 1.1; // world tiles: wind lean + trample splay
    const PX_PAD = 3; // device-agnostic css pad at the slot rim

    // Pass 1: each band's screen bbox (CSS px), clamped to the viewport.
    // A cheap trig-free sweep finds the band's WORLD extent (min/max root,
    // widest blade, tallest, hardest lean); the screen bbox is then just
    // the FOUR world-extent corners projected (root line south, tip line
    // north) — 4 projections/band instead of 2/blade, the same bound with
    // the wind/trample margins folded in.
    type Box = { x0: number; y0: number; x1: number; y1: number };
    const boxes: (Box | null)[] = [];
    const proj = (wx: number, wy: number): { x: number; y: number; wDiv: number } =>
      grassProjectMirror(f.scale, f.yScale, f.ox, f.oy, f.q, wx, wy, f.wCss, f.hCss);
    for (const band of bands) {
      let minBx = Infinity;
      let maxBx = -Infinity;
      let maxW = 0;
      let maxH = 0;
      let maxLean = 0;
      for (let i = band.i0; i < band.i0 + band.count; i++) {
        const b = tallBlades[i]!;
        if (b.bx < minBx) minBx = b.bx;
        if (b.bx > maxBx) maxBx = b.bx;
        if (b.w > maxW) maxW = b.w;
        if (b.h > maxH) maxH = b.h;
        const al = Math.abs(b.lean);
        if (al > maxLean) maxLean = al;
      }
      const halfW = maxW * HW_FACTOR + X_MARGIN + maxLean;
      const topY = band.minBy - maxH * H_FACTOR; // tip line (northmost)
      const botY = band.maxBy; // root line (southmost)
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [wx, wy] of [
        [minBx - halfW, botY],
        [maxBx + halfW, botY],
        [minBx - halfW, topY],
        [maxBx + halfW, topY],
      ] as const) {
        const s = proj(wx, wy);
        if (s.x < x0) x0 = s.x;
        if (s.x > x1) x1 = s.x;
        if (s.y < y0) y0 = s.y;
        if (s.y > y1) y1 = s.y;
      }
      x0 = Math.max(0, Math.floor(x0 - PX_PAD));
      y0 = Math.max(0, Math.floor(y0 - PX_PAD));
      x1 = Math.min(f.wCss, Math.ceil(x1 + PX_PAD));
      y1 = Math.min(f.hCss, Math.ceil(y1 + PX_PAD));
      boxes.push(x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null);
    }

    // Pass 2: pack slots as a vertical stack; size the atlas to fit.
    const MAX_ATLAS = 8192;
    let atlasW = 1;
    let atlasH = 0;
    const slots: ({ ax: number; ay: number; wDev: number; hDev: number } | null)[] = [];
    for (const box of boxes) {
      if (!box) {
        slots.push(null);
        continue;
      }
      const wDev = Math.max(1, Math.ceil((box.x1 - box.x0) * dpr));
      const hDev = Math.max(1, Math.ceil((box.y1 - box.y0) * dpr));
      if (atlasH + hDev > MAX_ATLAS || wDev > MAX_ATLAS) {
        slots.push(null); // atlas full — this band falls back to CPU tall
        continue;
      }
      slots.push({ ax: 0, ay: atlasH, wDev, hDev });
      atlasW = Math.max(atlasW, wDev);
      atlasH += hDev;
    }
    if (atlasH === 0) return out;

    if (this.tallCanvas.width !== atlasW) this.tallCanvas.width = atlasW;
    if (this.tallCanvas.height !== atlasH) this.tallCanvas.height = atlasH;
    gl.viewport(0, 0, atlasW, atlasH);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const proj3: GrassProj = {
      scale: f.scale,
      yScale: f.yScale,
      ox: f.ox,
      oy: f.oy,
      q: f.q,
      wCss: f.wCss,
      hCss: f.hCss,
    };
    this.tallInstances = packBladeInstances(tallBlades, this.tallInstances);
    this.tallRenderer.beginBands(this.tallInstances, tallBlades.length, proj3, f.timeSec, {
      windGain: f.windGain,
      disturb: f.disturb,
    });
    gl.enable(gl.SCISSOR_TEST);
    const SW = f.wCss * dpr;
    const SH = f.hCss * dpr;
    for (let k = 0; k < bands.length; k++) {
      const slot = slots[k];
      const box = boxes[k];
      if (!slot || !box) continue;
      const bandSx = box.x0 * dpr;
      const bandSy = box.y0 * dpr;
      // Scissor the slot (GL framebuffer origin is bottom-left → flip y).
      gl.scissor(slot.ax, atlasH - (slot.ay + slot.hDev), slot.wDev, slot.hDev);
      const remap = bandNdcRemap(SW, SH, atlasW, atlasH, bandSx, bandSy, slot.ax, slot.ay);
      this.tallRenderer.drawBand(bands[k]!.i0, bands[k]!.count, remap);
      out.push({
        srcX: slot.ax,
        srcY: slot.ay,
        srcW: slot.wDev,
        srcH: slot.hDev,
        dstX: box.x0,
        dstY: box.y0,
        dstW: box.x1 - box.x0,
        dstH: box.y1 - box.y0,
        sortY: bands[k]!.sortY,
      });
    }
    this.tallRenderer.drawBandEnd();
    gl.disable(gl.SCISSOR_TEST);
    return out;
  }

  /** Free the GL programs/buffers and drop the context. Idempotent. */
  dispose(): void {
    this.renderer?.dispose();
    this.ornaments?.dispose();
    this.tallRenderer?.dispose();
    this.renderer = null;
    this.ornaments = null;
    this.tallRenderer = null;
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.tallGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.tallGl = null;
    this.lost = true;
    this.tallLost = true;
  }
}

/** Floats the disturb buffer needs per entity — [x, y, radius, strength]. */
export const DISTURB_STRIDE = 4;

/** Reference so downstream imports of these strides stay one hop from the
 *  layer without reaching into the substrate modules directly. */
export { GRASS_INSTANCE_FLOATS, ORNAMENT_INSTANCE_FLOATS };
