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
import type { Blade, Flower, SeedHead, ElevOrnGroup } from './grass.js';

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
  /** The band's shelf (`strat`), passed through from the
   *  band so the emitted DrawItem sorts in the object's own slot. */
  strat?: number;
}

/** A band's screen bounding box in CSS px (clamped to the viewport). */
interface SlotBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One packed atlas slot in DEVICE px (a vertical-stack column). */
interface AtlasSlot {
  ax: number;
  ay: number;
  wDev: number;
  hDev: number;
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
  /** G-INTERACT — the parallel travel lay-vector [vx, vy]×n (world u/s,
   *  clamped) so blades comb down in each body's direction of motion. */
  disturbVel?: Float32Array;
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

  /** G-ELEVATED path — its own offscreen atlas canvas + GL context +
   *  renderer. The raised-terrain coat (grass on plateau tops / terrace
   *  edges) renders through the SAME per-band atlas machinery the tall
   *  blades use, one band per elevated (level, row) each LIFTED onto its shelf
   *  (band.elev). It cannot share the tall atlas — both re-blit
   *  this same frame at their own y-sort rows — so it keeps a fifth context.
   *  A lost elevated context simply drops the raised coat that frame (the
   *  baked meadow already painted the plateau ground beneath). */
  readonly elevCanvas: HTMLCanvasElement;
  private elevGl: WebGL2RenderingContext | null = null;
  private elevRenderer: GrassGpuRenderer | null = null;
  private elevLost = false;
  private elevInstances: Float32Array = new Float32Array(0);
  private readonly elevBlits: BandBlit[] = [];

  /** G-ELEVATED CAST path — its own offscreen atlas canvas + GL context +
   *  shadow renderer. The raised coat's casts ride the SAME per-band atlas
   *  machinery the elevated coat uses (one band per (row, level), LIFTED onto
   *  its shelf by band.elev), so a raised blade's shade sits on its raised
   *  surface. It cannot share the elevated coat atlas — both re-blit this same
   *  frame at their own y-sort rows — so it keeps a sixth context. A lost
   *  context simply drops the raised casts that frame. */
  readonly elevShadowCanvas: HTMLCanvasElement;
  private elevShadowGl: WebGL2RenderingContext | null = null;
  private elevShadowRenderer: GrassShadowRenderer | null = null;
  private elevShadowLost = false;
  private elevShadowInstances: Float32Array = new Float32Array(0);
  private readonly elevShadowBlits: BandBlit[] = [];

  /** G-ELEVATED ORNAMENT path — its own offscreen atlas canvas + GL context +
   *  ornament renderer. The raised flowers/seeds ride the SAME per-band atlas
   *  machinery, one band per (row, level) LIFTED onto its shelf, so a raised
   *  bloom sits on its raised surface (over the raised coat, under bodies). A
   *  seventh context (all elevated paths re-blit this same frame at their own
   *  rows); a lost context simply drops the raised blooms that frame. */
  readonly elevOrnCanvas: HTMLCanvasElement;
  private elevOrnGl: WebGL2RenderingContext | null = null;
  private elevOrnRenderer: GrassOrnamentRenderer | null = null;
  private elevOrnLost = false;
  private elevOrnInstances: Float32Array = new Float32Array(0);
  private readonly elevOrnBlits: BandBlit[] = [];

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

    // G-ELEVATED atlas — a fifth WebGL2 canvas/context (see field docs). It
    // degrades independently: a lost elevated context makes renderElev return
    // an empty band list and the raised coat is skipped that frame.
    this.elevCanvas = document.createElement('canvas');
    this.elevCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.elevLost = true;
      this.elevRenderer = null;
    });
    this.elevCanvas.addEventListener('webglcontextrestored', () => {
      this.elevLost = false;
      this.buildRenderer();
    });
    this.elevGl = this.elevCanvas.getContext('webgl2', ctxOpts);

    // G-ELEVATED CAST atlas — a sixth WebGL2 canvas/context (see field docs).
    this.elevShadowCanvas = document.createElement('canvas');
    this.elevShadowCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.elevShadowLost = true;
      this.elevShadowRenderer = null;
    });
    this.elevShadowCanvas.addEventListener('webglcontextrestored', () => {
      this.elevShadowLost = false;
      this.buildRenderer();
    });
    this.elevShadowGl = this.elevShadowCanvas.getContext('webgl2', ctxOpts);

    // G-ELEVATED ORNAMENT atlas — a seventh WebGL2 canvas/context (see docs).
    this.elevOrnCanvas = document.createElement('canvas');
    this.elevOrnCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.elevOrnLost = true;
      this.elevOrnRenderer = null;
    });
    this.elevOrnCanvas.addEventListener('webglcontextrestored', () => {
      this.elevOrnLost = false;
      this.buildRenderer();
    });
    this.elevOrnGl = this.elevOrnCanvas.getContext('webgl2', ctxOpts);
    this.buildRenderer();
  }

  private buildRenderer(): void {
    if (this.gl && !this.lost && !this.renderer) {
      try {
        this.renderer = new GrassGpuRenderer(this.gl, this.palette);
        this.ornaments = new GrassOrnamentRenderer(this.gl, this.ornPalette);
      } catch (e) {
        // A driver that can't compile the program stays inert (baked meadow).
        // Surface WHY — a silent shader miscompile otherwise drops the whole
        // GPU path with no clue (a reserved-keyword slip did exactly that).
        console.warn('[grass-gpu] blade program build failed; falling back to baked meadow:', e);
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
    if (this.elevGl && !this.elevLost && !this.elevRenderer) {
      try {
        this.elevRenderer = new GrassGpuRenderer(this.elevGl, this.palette);
      } catch {
        this.elevRenderer?.dispose();
        this.elevRenderer = null;
        this.elevGl = null;
      }
    }
    if (this.elevShadowGl && !this.elevShadowLost && !this.elevShadowRenderer) {
      try {
        this.elevShadowRenderer = new GrassShadowRenderer(this.elevShadowGl);
      } catch {
        this.elevShadowRenderer?.dispose();
        this.elevShadowRenderer = null;
        this.elevShadowGl = null;
      }
    }
    if (this.elevOrnGl && !this.elevOrnLost && !this.elevOrnRenderer) {
      try {
        this.elevOrnRenderer = new GrassOrnamentRenderer(this.elevOrnGl, this.ornPalette);
      } catch {
        this.elevOrnRenderer?.dispose();
        this.elevOrnRenderer = null;
        this.elevOrnGl = null;
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

    // ONE PROJECTION: the whole meadow projects through the camera affine
    // (grassProjectGlsl), so blades and blooms parallax with the world at
    // exactly the player's rate.
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
      this.renderer.draw(proj, f.timeSec, {
        windGain: f.windGain,
        disturb: f.disturb,
        disturbVel: f.disturbVel,
      });
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
   * run through the camera projection.
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
    const opts = { windGain: f.windGain, disturb: f.disturb, disturbVel: f.disturbVel };
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

  /** True when the elevated atlas path can render this frame. */
  get elevOk(): boolean {
    return this.elevGl !== null && this.elevRenderer !== null && !this.elevLost;
  }

  /**
   * G-ELEVATED — THE COAT RIDES THE SHELF. The same atlas machinery as
   * renderTall, fed the raised-terrain grass with one band per
   * elevated (level, row); each band carries `elev` (level·ELEV_H) so the
   * shader lifts its blades onto the plateau top exactly as the elevated
   * ground quad lifts. The renderer emits one y-sorted DrawItem per band
   * (drawn OVER its ground row, under bodies standing on it). A separate GL
   * context/atlas from tall (both blit this same frame),
   * degrading independently. Returns [] when the context is unavailable or
   * nothing is in view.
   */
  renderElev(
    elevBlades: readonly Blade[],
    bands: readonly TallBand[],
    f: GrassFrame,
  ): BandBlit[] {
    return this.renderBands('elev', elevBlades, bands, f);
  }

  /** Shared atlas render for the tall + elevated band paths: each band renders
   *  in ISOLATION into its own slot of one offscreen atlas (a single GL
   *  pass), returning each slot's atlas src-rect + screen dst-rect for the
   *  renderer to y-sort. `which` selects the private context/canvas/renderer
   *  + instance buffer so the two atlases never clobber one another. */
  private renderBands(
    which: 'tall' | 'elev',
    srcBlades: readonly Blade[],
    bands: readonly TallBand[],
    f: GrassFrame,
  ): BandBlit[] {
    const isElev = which === 'elev';
    const out = isElev ? this.elevBlits : this.bandBlits;
    out.length = 0;
    const gl = isElev ? this.elevGl : this.tallGl;
    const renderer = isElev ? this.elevRenderer : this.tallRenderer;
    const canvas = isElev ? this.elevCanvas : this.tallCanvas;
    const okFlag = isElev ? this.elevOk : this.tallOk;
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
    const X_MARGIN = 1.5; // world tiles: wind lean + parted lay-over splay
    const PX_PAD = 3; // device-agnostic css pad at the slot rim

    // Pass 1: each band's screen bbox (CSS px), clamped to the viewport.
    // A cheap trig-free sweep finds the band's WORLD extent (min/max root,
    // widest blade, tallest, hardest lean); the screen bbox is then just
    // the FOUR world-extent corners projected (root line south, tip line
    // north) — 4 projections/band instead of 2/blade, the same bound with
    // the wind/trample margins folded in.
    const boxes: (SlotBox | null)[] = [];
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
      // G-ELEVATED: the whole band rides its terrace shelf. Mirror the shader's
      // RIGID rise (uElev · scale) so the slot bbox tracks the lifted blades.
      // 0 = flat.
      const elev = band.elev ?? 0;
      const liftPx = elev !== 0 ? elev * f.scale : 0;
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
        const sy = s.y - liftPx;
        if (s.x < x0) x0 = s.x;
        if (s.x > x1) x1 = s.x;
        if (sy < y0) y0 = sy;
        if (sy > y1) y1 = sy;
      }
      x0 = Math.max(0, Math.floor(x0 - PX_PAD));
      y0 = Math.max(0, Math.floor(y0 - PX_PAD));
      x1 = Math.min(f.wCss, Math.ceil(x1 + PX_PAD));
      y1 = Math.min(f.hCss, Math.ceil(y1 + PX_PAD));
      boxes.push(x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null);
    }

    // Pass 2: pack slots as a vertical stack; size the atlas to fit.
    const { slots, atlasW, atlasH } = this.packSlots(boxes, dpr);
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
    const packed = packBladeInstances(
      tallBlades,
      isElev ? this.elevInstances : this.tallInstances,
    );
    if (isElev) this.elevInstances = packed;
    else this.tallInstances = packed;
    renderer.beginBands(packed, tallBlades.length, proj3, f.timeSec, {
      windGain: f.windGain,
      disturb: f.disturb,
      disturbVel: f.disturbVel,
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
      renderer.drawBand(bands[k]!.i0, bands[k]!.count, remap, bands[k]!.elev ?? 0);
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
        strat: bands[k]!.strat,
      });
    }
    renderer.drawBandEnd();
    gl.disable(gl.SCISSOR_TEST);
    return out;
  }

  /** Pack each band's screen bbox into a distinct slot of ONE vertical-stack
   *  atlas, sizing the atlas to fit. A null box (off-screen / empty band) or a
   *  slot that would overflow MAX_ATLAS gets a null slot (that band is
   *  dropped). Shared by the tall/elev coat, the elevated cast and the
   *  elevated ornament paths so all size their atlas the same way. */
  private packSlots(
    boxes: readonly (SlotBox | null)[],
    dpr: number,
  ): { slots: (AtlasSlot | null)[]; atlasW: number; atlasH: number } {
    const MAX_ATLAS = 8192;
    let atlasW = 1;
    let atlasH = 0;
    const slots: (AtlasSlot | null)[] = [];
    for (const box of boxes) {
      if (!box) {
        slots.push(null);
        continue;
      }
      const wDev = Math.max(1, Math.ceil((box.x1 - box.x0) * dpr));
      const hDev = Math.max(1, Math.ceil((box.y1 - box.y0) * dpr));
      if (atlasH + hDev > MAX_ATLAS || wDev > MAX_ATLAS) {
        slots.push(null); // atlas full — this band is dropped this frame
        continue;
      }
      slots.push({ ax: 0, ay: atlasH, wDev, hDev });
      atlasW = Math.max(atlasW, wDev);
      atlasH += hDev;
    }
    return { slots, atlasW, atlasH };
  }

  /** True when the elevated cast atlas path can render this frame. */
  get elevShadowOk(): boolean {
    return this.elevShadowGl !== null && this.elevShadowRenderer !== null && !this.elevShadowLost;
  }

  /**
   * G-ELEVATED — THE CAST RIDES THE SHELF. The cast analogue of renderElev:
   * the raised coat's casts (the SAME elevated blade array + bands the coat
   * uses) render through a per-band cast atlas, each band LIFTED onto its shelf
   * (band.elev) and thrown along the light ray, so a raised blade's shade sits
   * on its raised surface. Each slot is opaque union coverage (blend disabled),
   * blitted UNDER the raised coat at the frame's shade alpha — matching the
   * flat-field cast look. Returns each band's atlas src-rect + screen dst-rect
   * for the renderer to y-sort just under the coat, over the terrace ground.
   * `shade` is the cast colour 0..1; `sx,sy` the world-ground throw per unit
   * world-height (grassShadowOffset). Returns [] when the context is
   * unavailable or nothing is in view.
   */
  renderElevShadow(
    elevBlades: readonly Blade[],
    bands: readonly TallBand[],
    f: GrassFrame,
    shade: readonly [number, number, number],
    sx: number,
    sy: number,
  ): BandBlit[] {
    const out = this.elevShadowBlits;
    out.length = 0;
    const gl = this.elevShadowGl;
    const renderer = this.elevShadowRenderer;
    if (!this.elevShadowOk || !gl || !renderer) return out;
    if (elevBlades.length === 0 || bands.length === 0) return out;
    const dpr = f.dpr;

    // The cast quad spans from the blade root along the light ray, so its bbox
    // extends by the shadow throw (+ wind lean + a trample margin) beyond the
    // blade roots — NOT straight up like the coat. Mirror the cast shader:
    // H = height ×1.55, base half-width ×1.42×0.95 (+ margin). Throw = off·H.
    const H_FACTOR = 1.55;
    const HW_FACTOR = 1.42 * 0.95;
    const X_MARGIN = 1.5;
    const PX_PAD = 3;
    const boxes: (SlotBox | null)[] = [];
    const proj = (wx: number, wy: number): { x: number; y: number } =>
      grassProjectMirror(f.scale, f.yScale, f.ox, f.oy, wx, wy);
    for (const band of bands) {
      let minBx = Infinity;
      let maxBx = -Infinity;
      let maxW = 0;
      let maxH = 0;
      let maxLean = 0;
      for (let i = band.i0; i < band.i0 + band.count; i++) {
        const b = elevBlades[i]!;
        if (b.bx < minBx) minBx = b.bx;
        if (b.bx > maxBx) maxBx = b.bx;
        if (b.w > maxW) maxW = b.w;
        if (b.h > maxH) maxH = b.h;
        const al = Math.abs(b.lean);
        if (al > maxLean) maxLean = al;
      }
      const halfW = maxW * HW_FACTOR + X_MARGIN;
      const Hw = maxH * H_FACTOR; // world height that scales the throw
      const throwX = sx * Hw;
      const throwY = sy * Hw;
      const pushMargin = Hw * 0.6; // trample lay-over can shove the tip
      // The union of the root band and the shadow-thrown tip band.
      const x0w = Math.min(minBx - halfW, minBx + throwX - maxLean - pushMargin - halfW);
      const x1w = Math.max(maxBx + halfW, maxBx + throwX + maxLean + pushMargin + halfW);
      const y0w = Math.min(band.minBy, band.minBy + throwY - pushMargin);
      const y1w = Math.max(band.maxBy, band.maxBy + throwY + pushMargin);
      const elev = band.elev ?? 0;
      const liftPx = elev !== 0 ? elev * f.scale : 0;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [wx, wy] of [
        [x0w, y0w],
        [x1w, y0w],
        [x0w, y1w],
        [x1w, y1w],
      ] as const) {
        const s = proj(wx, wy);
        const syp = s.y - liftPx;
        if (s.x < x0) x0 = s.x;
        if (s.x > x1) x1 = s.x;
        if (syp < y0) y0 = syp;
        if (syp > y1) y1 = syp;
      }
      x0 = Math.max(0, Math.floor(x0 - PX_PAD));
      y0 = Math.max(0, Math.floor(y0 - PX_PAD));
      x1 = Math.min(f.wCss, Math.ceil(x1 + PX_PAD));
      y1 = Math.min(f.hCss, Math.ceil(y1 + PX_PAD));
      boxes.push(x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null);
    }

    const { slots, atlasW, atlasH } = this.packSlots(boxes, dpr);
    if (atlasH === 0) return out;
    const canvas = this.elevShadowCanvas;
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
    const packed = packBladeInstances(elevBlades, this.elevShadowInstances);
    this.elevShadowInstances = packed;
    renderer.beginBands(packed, elevBlades.length, proj3, f.timeSec, shade, sx, sy, {
      windGain: f.windGain,
      disturb: f.disturb,
      disturbVel: f.disturbVel,
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
      gl.scissor(slot.ax, atlasH - (slot.ay + slot.hDev), slot.wDev, slot.hDev);
      const remap = bandNdcRemap(SW, SH, atlasW, atlasH, bandSx, bandSy, slot.ax, slot.ay);
      renderer.drawBand(bands[k]!.i0, bands[k]!.count, remap, bands[k]!.elev ?? 0);
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
        strat: bands[k]!.strat,
      });
    }
    renderer.drawBandEnd();
    gl.disable(gl.SCISSOR_TEST);
    return out;
  }

  /** True when the elevated ornament atlas path can render this frame. */
  get elevOrnOk(): boolean {
    return this.elevOrnGl !== null && this.elevOrnRenderer !== null && !this.elevOrnLost;
  }

  /**
   * G-ELEVATED — THE BLOOM RIDES THE SHELF. The ornament analogue of
   * renderElev: the raised flowers + seed-heads (grouped one band per (row,
   * level) by collectGpuElevatedOrnaments) render through a per-band ornament
   * atlas, each band LIFTED onto its shelf (group.elev). Flowers and seeds
   * share one draw per group — the buffer is packed group-contiguous (a
   * group's flowers then its seeds), and the shader's `kind` selects the head.
   * Each band is emitted as a y-sorted DrawItem OVER the raised coat, under
   * bodies on the row. Returns [] when the context is unavailable or nothing is
   * in view.
   */
  renderElevOrnament(
    flowers: readonly Flower[],
    seeds: readonly SeedHead[],
    groups: readonly ElevOrnGroup[],
    f: GrassFrame,
  ): BandBlit[] {
    const out = this.elevOrnBlits;
    out.length = 0;
    const gl = this.elevOrnGl;
    const renderer = this.elevOrnRenderer;
    if (!this.elevOrnOk || !gl || !renderer) return out;
    if (groups.length === 0) return out;
    const dpr = f.dpr;

    // Pack group-contiguous so each group is one contiguous instance slice: a
    // group's flowers (kind 0) then its seeds (kind 1). Records into the same
    // ORNAMENT_INSTANCE_FLOATS layout packOrnamentInstances writes, so the
    // ornament shader reads it unchanged.
    const total = flowers.length + seeds.length;
    const need = total * ORNAMENT_INSTANCE_FLOATS;
    let buf =
      this.elevOrnInstances.length >= need ? this.elevOrnInstances : new Float32Array(need);
    const ranges: { i0: number; count: number }[] = [];
    let w = 0;
    let inst = 0;
    for (const g of groups) {
      const i0 = inst;
      for (let i = 0; i < g.fCount; i++) {
        const fl = flowers[g.fStart + i]!;
        buf[w] = fl.bx;
        buf[w + 1] = fl.by;
        buf[w + 2] = fl.h;
        buf[w + 3] = fl.size;
        buf[w + 4] = 0; // kind = flower
        buf[w + 5] = fl.pal;
        buf[w + 6] = fl.phase;
        buf[w + 7] = 0; // lean (flowers don't lean)
        w += ORNAMENT_INSTANCE_FLOATS;
        inst++;
      }
      for (let i = 0; i < g.sCount; i++) {
        const sd = seeds[g.sStart + i]!;
        buf[w] = sd.bx;
        buf[w + 1] = sd.by;
        buf[w + 2] = sd.h;
        buf[w + 3] = sd.size;
        buf[w + 4] = 1; // kind = seed
        buf[w + 5] = 0;
        buf[w + 6] = sd.phase;
        buf[w + 7] = sd.lean;
        w += ORNAMENT_INSTANCE_FLOATS;
        inst++;
      }
      ranges.push({ i0, count: g.fCount + g.sCount });
    }
    this.elevOrnInstances = buf;

    // Pass 1: each group's screen bbox. Blooms grow UP from the root (head at
    // by − h, petals ±size, wind bob up to ~h); the bbox folds those margins.
    const X_MARGIN = 0.5;
    const PX_PAD = 3;
    const boxes: (SlotBox | null)[] = [];
    const proj = (wx: number, wy: number): { x: number; y: number } =>
      grassProjectMirror(f.scale, f.yScale, f.ox, f.oy, wx, wy);
    // Group x-extent: sweep roots per group (cheap; blooms are sparse).
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]!;
      let minBx = Infinity;
      let maxBx = -Infinity;
      for (let i = 0; i < g.fCount; i++) {
        const fl = flowers[g.fStart + i]!;
        if (fl.bx < minBx) minBx = fl.bx;
        if (fl.bx > maxBx) maxBx = fl.bx;
      }
      for (let i = 0; i < g.sCount; i++) {
        const sd = seeds[g.sStart + i]!;
        if (sd.bx < minBx) minBx = sd.bx;
        if (sd.bx > maxBx) maxBx = sd.bx;
      }
      if (minBx === Infinity) {
        boxes.push(null);
        continue;
      }
      // Petals reach one size-arm out from the head + half a chip; wind bob
      // shoves the head sideways up to ~height. Fold both into the half-width.
      const halfW = g.maxSize * 1.5 + g.maxH + X_MARGIN;
      const topY = g.minBy - g.maxH - g.maxSize * 1.5; // head + upward petal
      const botY = g.maxBy + g.maxSize; // downward petal
      const liftPx = g.elev !== 0 ? g.elev * f.scale : 0;
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
        const syp = s.y - liftPx;
        if (s.x < x0) x0 = s.x;
        if (s.x > x1) x1 = s.x;
        if (syp < y0) y0 = syp;
        if (syp > y1) y1 = syp;
      }
      x0 = Math.max(0, Math.floor(x0 - PX_PAD));
      y0 = Math.max(0, Math.floor(y0 - PX_PAD));
      x1 = Math.min(f.wCss, Math.ceil(x1 + PX_PAD));
      y1 = Math.min(f.hCss, Math.ceil(y1 + PX_PAD));
      boxes.push(x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null);
    }

    const { slots, atlasW, atlasH } = this.packSlots(boxes, dpr);
    if (atlasH === 0) return out;
    const canvas = this.elevOrnCanvas;
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
    renderer.beginBands(buf, total, proj3, f.timeSec);
    gl.enable(gl.SCISSOR_TEST);
    const SW = f.wCss * dpr;
    const SH = f.hCss * dpr;
    for (let k = 0; k < groups.length; k++) {
      const slot = slots[k];
      const box = boxes[k];
      const range = ranges[k]!;
      if (!slot || !box || range.count === 0) continue;
      const bandSx = box.x0 * dpr;
      const bandSy = box.y0 * dpr;
      gl.scissor(slot.ax, atlasH - (slot.ay + slot.hDev), slot.wDev, slot.hDev);
      const remap = bandNdcRemap(SW, SH, atlasW, atlasH, bandSx, bandSy, slot.ax, slot.ay);
      renderer.drawBand(range.i0, range.count, remap, groups[k]!.elev);
      out.push({
        srcX: slot.ax,
        srcY: slot.ay,
        srcW: slot.wDev,
        srcH: slot.hDev,
        dstX: box.x0,
        dstY: box.y0,
        dstW: box.x1 - box.x0,
        dstH: box.y1 - box.y0,
        sortY: groups[k]!.sortY,
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
    this.elevRenderer?.dispose();
    this.elevShadowRenderer?.dispose();
    this.elevOrnRenderer?.dispose();
    this.renderer = null;
    this.ornaments = null;
    this.tallRenderer = null;
    this.shadowRenderer = null;
    this.elevRenderer = null;
    this.elevShadowRenderer = null;
    this.elevOrnRenderer = null;
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.tallGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.shadowGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.elevGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.elevShadowGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.elevOrnGl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.tallGl = null;
    this.shadowGl = null;
    this.elevGl = null;
    this.elevShadowGl = null;
    this.elevOrnGl = null;
    this.lost = true;
    this.tallLost = true;
    this.shadowLost = true;
    this.elevLost = true;
    this.elevShadowLost = true;
    this.elevOrnLost = true;
  }
}

/** Floats the disturb buffer needs per entity — [x, y, radius, strength]. */
export const DISTURB_STRIDE = 4;

/** Reference so downstream imports of these strides stay one hop from the
 *  layer without reaching into the substrate modules directly. */
export { GRASS_INSTANCE_FLOATS, ORNAMENT_INSTANCE_FLOATS };
