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
import { GrassShadowRenderer } from './grassGpuShadow.js';
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
  /** Screen origins in CSS px (camOriginX / camOriginY), matching the
   *  world feed. */
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

  /** G2 CAST path — its own offscreen canvas + GL context + shadow
   *  renderer. The cast layer composites at a DIFFERENT alpha than the
   *  blade coat (THE CAST LIES UNDER THE COAT), so it needs its own output
   *  image; a WebGL context binds one canvas, so it is a separate context.
   *  Degrades independently: a lost cast context makes renderShadow return
   *  null and the meadow simply draws its coat with no GPU shade that frame. */
  readonly shadowCanvas: HTMLCanvasElement;
  private shadowGl: WebGL2RenderingContext | null = null;
  private shadowRenderer: GrassShadowRenderer | null = null;
  private shadowLost = false;
  private shadowInstances: Float32Array = new Float32Array(0);
  private shadowTallInstances: Float32Array = new Float32Array(0);

  /** G4 SKIRT path — its own offscreen atlas canvas + GL context +
   *  renderer. The over-foot skirt (grass nestling around an object's base)
   *  renders through the SAME per-band atlas machinery the tall blades use,
   *  but each grass-rooted object is ONE band at its own foot slot — so its
   *  atlas cannot share the tall atlas (that canvas is re-blitted at the
   *  tall bands' own sort rows this same frame). A separate context keeps
   *  the two atlases independent (and a lost skirt context simply drops the
   *  skirts that frame — the object falls back to its hard pasted base). */
  readonly skirtCanvas: HTMLCanvasElement;
  private skirtGl: WebGL2RenderingContext | null = null;
  private skirtRenderer: GrassGpuRenderer | null = null;
  private skirtLost = false;
  private skirtInstances: Float32Array = new Float32Array(0);
  private readonly skirtBlits: BandBlit[] = [];

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

    // G2 cast atlas — a third WebGL2 canvas/context (see field docs).
    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.shadowLost = true;
      this.shadowRenderer = null;
    });
    this.shadowCanvas.addEventListener('webglcontextrestored', () => {
      this.shadowLost = false;
      this.buildRenderer();
    });
    this.shadowGl = this.shadowCanvas.getContext('webgl2', ctxOpts);

    // G4 skirt atlas — a fourth WebGL2 canvas/context (see field docs). It
    // degrades independently: a lost skirt context makes renderSkirt return
    // an empty band list and objects keep their hard base that frame.
    this.skirtCanvas = document.createElement('canvas');
    this.skirtCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.skirtLost = true;
      this.skirtRenderer = null;
    });
    this.skirtCanvas.addEventListener('webglcontextrestored', () => {
      this.skirtLost = false;
      this.buildRenderer();
    });
    this.skirtGl = this.skirtCanvas.getContext('webgl2', ctxOpts);
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
    if (this.shadowGl && !this.shadowLost && !this.shadowRenderer) {
      try {
        this.shadowRenderer = new GrassShadowRenderer(this.shadowGl);
      } catch {
        this.shadowRenderer?.dispose();
        this.shadowRenderer = null;
        this.shadowGl = null;
      }
    }
    if (this.skirtGl && !this.skirtLost && !this.skirtRenderer) {
      try {
        this.skirtRenderer = new GrassGpuRenderer(this.skirtGl, this.palette);
      } catch {
        this.skirtRenderer?.dispose();
        this.skirtRenderer = null;
        this.skirtGl = null;
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

  /** True when the cast path can render this frame. */
  get shadowOk(): boolean {
    return this.shadowGl !== null && this.shadowRenderer !== null && !this.shadowLost;
  }

  /**
   * G2 — THE MEADOW CASTS ITS OWN SHADE. Render the whole visible field's
   * casts (short coat `blades` + tall `tallBlades`, as two instanced draws)
   * into the private shadow canvas as OPAQUE union coverage, and return it
   * for the renderer to blit UNDER the blade coat at the frame's shade
   * alpha. Because every cast is thrown by the SAME per-vertex wind term
   * the blades use, the whole field's shade sways uniformly — no baked
   * monolith, no player-centred radius. Both quad ends are ground points
   * run through projectWorld, so it is perspective-correct at q>0.
   *
   * `shade` is the cast colour in 0..1; `sx,sy` is the world-ground throw
   * per unit world-height (grassShadowOffset). Returns null when the cast
   * context is unavailable (the caller then draws the coat with no shade).
   */
  renderShadow(
    blades: readonly Blade[],
    tallBlades: readonly Blade[],
    f: GrassFrame,
    shade: readonly [number, number, number],
    sx: number,
    sy: number,
  ): HTMLCanvasElement | null {
    if (!this.shadowOk || !this.shadowGl || !this.shadowRenderer) return null;
    if (blades.length === 0 && tallBlades.length === 0) return null;
    const gl = this.shadowGl;
    const wDev = Math.max(1, Math.round(f.wCss * f.dpr));
    const hDev = Math.max(1, Math.round(f.hCss * f.dpr));
    if (this.shadowCanvas.width !== wDev) this.shadowCanvas.width = wDev;
    if (this.shadowCanvas.height !== hDev) this.shadowCanvas.height = hDev;
    gl.viewport(0, 0, wDev, hDev);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const proj: GrassProj = {
      scale: f.scale,
      yScale: f.yScale,
      ox: f.ox,
      oy: f.oy,
      wCss: f.wCss,
      hCss: f.hCss,
    };
    const opts = { windGain: f.windGain, disturb: f.disturb };
    if (blades.length > 0) {
      this.shadowInstances = packBladeInstances(blades, this.shadowInstances);
      this.shadowRenderer.upload(this.shadowInstances, blades.length);
      this.shadowRenderer.draw(proj, f.timeSec, blades.length, shade, sx, sy, opts);
    }
    if (tallBlades.length > 0) {
      this.shadowTallInstances = packBladeInstances(tallBlades, this.shadowTallInstances);
      this.shadowRenderer.upload(this.shadowTallInstances, tallBlades.length);
      this.shadowRenderer.draw(proj, f.timeSec, tallBlades.length, shade, sx, sy, opts);
    }
    return this.shadowCanvas;
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
    return this.renderBands('tall', tallBlades, bands, f);
  }

  /** True when the skirt atlas path can render this frame. */
  get skirtOk(): boolean {
    return this.skirtGl !== null && this.skirtRenderer !== null && !this.skirtLost;
  }

  /**
   * G4 — THE OVER-FOOT SKIRT. Identical atlas machinery to renderTall, but
   * fed the per-object skirt blades (generateSkirtBlades) and one band PER
   * OBJECT — each band's `sortY` is the object's foot row plus a hair, so
   * the renderer emits it as a y-sorted DrawItem that draws OVER the
   * object's lower base. A separate GL context/atlas from the tall path
   * (both blit this same frame), degrading independently. Returns [] when
   * the skirt context is unavailable or nothing is in view.
   */
  renderSkirt(
    skirtBlades: readonly Blade[],
    bands: readonly TallBand[],
    f: GrassFrame,
  ): BandBlit[] {
    return this.renderBands('skirt', skirtBlades, bands, f);
  }

  /** Shared atlas render for the tall + skirt band paths: each band renders
   *  in ISOLATION into its own slot of one offscreen atlas (a single GL
   *  pass), returning each slot's atlas src-rect + screen dst-rect for the
   *  renderer to y-sort. `which` selects the private context/canvas/renderer
   *  + instance buffer so the two atlases never clobber one another. */
  private renderBands(
    which: 'tall' | 'skirt',
    srcBlades: readonly Blade[],
    bands: readonly TallBand[],
    f: GrassFrame,
  ): BandBlit[] {
    const isSkirt = which === 'skirt';
    const out = isSkirt ? this.skirtBlits : this.bandBlits;
    out.length = 0;
    const gl = isSkirt ? this.skirtGl : this.tallGl;
    const renderer = isSkirt ? this.skirtRenderer : this.tallRenderer;
    const canvas = isSkirt ? this.skirtCanvas : this.tallCanvas;
    const okFlag = isSkirt ? this.skirtOk : this.tallOk;
    if (!okFlag || !gl || !renderer) return out;
    const tallBlades = srcBlades;
    if (tallBlades.length === 0 || bands.length === 0) return out;
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
    const proj = (wx: number, wy: number): { x: number; y: number } =>
      grassProjectMirror(f.scale, f.yScale, f.ox, f.oy, wx, wy);
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

    if (canvas.width !== atlasW) canvas.width = atlasW;
    if (canvas.height !== atlasH) canvas.height = atlasH;
    gl.viewport(0, 0, atlasW, atlasH);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const proj3: GrassProj = {
      scale: f.scale,
      yScale: f.yScale,
      ox: f.ox,
      oy: f.oy,
      wCss: f.wCss,
      hCss: f.hCss,
    };
    const packed = packBladeInstances(tallBlades, isSkirt ? this.skirtInstances : this.tallInstances);
    if (isSkirt) this.skirtInstances = packed;
    else this.tallInstances = packed;
    renderer.beginBands(packed, tallBlades.length, proj3, f.timeSec, {
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
      renderer.drawBand(bands[k]!.i0, bands[k]!.count, remap);
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
    renderer.drawBandEnd();
    gl.disable(gl.SCISSOR_TEST);
    return out;
  }

  /** Free the GL programs/buffers and drop the context. Idempotent. */
  dispose(): void {
    this.renderer?.dispose();
    this.ornaments?.dispose();
    this.tallRenderer?.dispose();
    this.shadowRenderer?.dispose();
    this.skirtRenderer?.dispose();
    this.renderer = null;
    this.ornaments = null;
    this.tallRenderer = null;
    this.shadowRenderer = null;
    this.skirtRenderer = null;
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.tallGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.shadowGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.skirtGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.tallGl = null;
    this.shadowGl = null;
    this.skirtGl = null;
    this.lost = true;
    this.tallLost = true;
    this.shadowLost = true;
    this.skirtLost = true;
  }
}

/** Floats the disturb buffer needs per entity — [x, y, radius, strength]. */
export const DISTURB_STRIDE = 4;

/** Reference so downstream imports of these strides stay one hop from the
 *  layer without reaching into the substrate modules directly. */
export { GRASS_INSTANCE_FLOATS, ORNAMENT_INSTANCE_FLOATS };
