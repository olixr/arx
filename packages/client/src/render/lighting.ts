/**
 * The scene light pass: one low-resolution lightmap multiplied over the
 * finished world painting.
 *
 * Design laws:
 * - ONE MAP RULES EXPOSURE. The daylight ambient fills the map; every
 *   point light punches brightness back in with `screen` compositing.
 *   Multiply once over the frame and the whole scene — terrain, grass,
 *   sprites, particles — darkens and warms coherently. (The body
 *   relight pass in the renderer is the map's one licensed partner: it
 *   CORRECTS a sprite toward the exposure at its own base, it never
 *   invents light the map doesn't know about.)
 * - LIGHT IS GEOGRAPHY. The map is drawn in WORLD space through the
 *   camera transform, so light pools are ground ellipses (foreshortened
 *   by the camera pitch like everything else), not screen-space discs.
 * - GEOMETRY, NOT TILES (v3). The world is tiled but its light is not:
 *   occluders inside a light's reach are greedily merged into
 *   RECTANGLES before anything casts, so a straight wall throws ONE
 *   clean-edged shadow instead of a scallop of per-tile wedges; lit
 *   faces merge into RUNS shaded continuously (light sampled at tile
 *   CORNERS, interpolated along the run) — a wall is one face of
 *   geometry, never a row of individually-lit blocks.
 * - SHADOWS ARE NOT VOIDS (v3). The umbra keeps ~10% of the pool (the
 *   world has bounce light), penumbras grade over two widening bands,
 *   and after the erase a soft WRAP halo puts indirect light back into
 *   the shadowed nooks — a lamp in a boxed room illuminates the room.
 * - THE MAP IS FILTERED (v3). One down-up blur pass smooths the whole
 *   field before the multiply — pool falloff, shadow rims and face
 *   gradients all soften together. Light is low-frequency; nothing in
 *   this map is allowed a razor edge.
 * - WALLS STOP LIGHT. Big static lights cast real 2D shadows; a coarse
 *   line-of-sight walk gates every lit face an occluding light paints.
 * - DAYLIGHT IS FREE. At full sun the ambient is white and the entire
 *   pass is skipped — the system costs nothing until dusk.
 * - QUARTER RES IS PLENTY. Light is low-frequency; the map renders at
 *   1/3 scale and stretches up. Gradients stay smooth, fills stay tiny.
 */
import type { DaylightSample } from '@arx/shared';
import { radialGlowSprite, rampSprite } from './glowSprite.js';

/** A light living in the world, gathered fresh each frame. */
export interface WorldLight {
  x: number;
  y: number;
  /** Reach in world tiles. */
  r: number;
  rgb: [number, number, number];
  /** Peak brightness at the core, 0..1. */
  intensity: number;
  /** Static architectural lights cast hard wall shadows. */
  occlude?: boolean;
}

/** Everything the lightmap needs to share the camera's view. */
export interface LightView {
  w: number;
  h: number;
  scale: number;
  yScale: number;
  /** Screen-space origin: worldToScreen(0,0). */
  ox: number;
  oy: number;
}

/** A merged occluder rectangle, in whole tiles. */
interface OccRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A continuous run of camera-facing faces sharing a base row and
 *  height, with the light sampled at every tile corner along it. */
interface FaceRun {
  x0: number;
  x1: number;
  ye: number;
  h: number;
  /** Corner intensities, length (x1−x0)+1 — k interpolates between. */
  ks: number[];
}

const MAP_DOWNSCALE = 3;
/** How much of the direct pool the umbra erase removes: the remainder
 *  is the scene's implicit first-bounce fill. */
const SHADOW_DENSITY = 0.82;
/** Penumbra bands: [splay radians, erase alpha] — widest first, so the
 *  shadow rim grades dark→light over two steps before the blur. */
const PENUMBRA: ReadonlyArray<readonly [number, number]> = [
  [0.14, 0.22],
  [0.07, 0.3],
];
/** The wrap halo: indirect light painted AFTER the shadow erase —
 *  bounce that turns corners and fills the boxed room. */
const WRAP_K = 0.12;
const WRAP_R = 1.25;

/** Falloff profiles, hoisted: per-light-per-frame array literals
 *  defeated the glow sprite cache's identity memo (see glowSprite). */
const POOL_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.4, 0.72],
  [0.75, 0.28],
  [1, 0],
];
const WRAP_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, WRAP_K],
  [0.6, WRAP_K * 0.55],
  [1, 0],
];

/** rgb triple → "r, g, b", memoized by array identity — one string
 *  per palette color instead of one per light per frame. */
const rgbCsvMemo = new WeakMap<readonly number[], string>();

/** Alpha strings quantized to 1/255 (below 8-bit output precision) —
 *  paintFaceRuns ran toFixed(4) + a template per gradient stop per
 *  run per light per frame. */
const ALPHA_STR: readonly string[] = Array.from({ length: 256 }, (_, i) =>
  (i / 255).toFixed(4),
);

function alphaStr(k: number): string {
  const i = Math.round(k * 255);
  return ALPHA_STR[i < 0 ? 0 : i > 255 ? 255 : i]!;
}
function rgbCsv(rgb: readonly number[]): string {
  let s = rgbCsvMemo.get(rgb);
  if (s === undefined) {
    s = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
    rgbCsvMemo.set(rgb, s);
  }
  return s;
}

export class LightingSystem {
  private readonly map = document.createElement('canvas');
  private readonly mctx = this.map.getContext('2d')!;
  private readonly tmp = document.createElement('canvas');
  private readonly tctx = this.tmp.getContext('2d')!;
  /** Face-run scratch: one run at a time is shaped here (horizontal
   *  intensity gradient ∩ vertical base fade) then composited. */
  private readonly face = document.createElement('canvas');
  private readonly fctx = this.face.getContext('2d')!;
  /** Half-res bounce buffer for the map's blur pass. */
  private readonly blur = document.createElement('canvas');
  private readonly bctx = this.blur.getContext('2d')!;
  /** Scratch collections, reused across lights — no per-frame garbage. */
  private readonly rects: OccRect[] = [];
  private readonly runs: FaceRun[] = [];
  /**
   * THE STANDING LAMP REMEMBERS: an occluding light is architecture —
   * fixed position, fixed geometry — yet its pool/shadow/wrap/face
   * composite was rebuilt from scratch every frame, the dearest work in
   * the whole pass. Each one is composed ONCE into a patch and stamped
   * per frame; the flicker rides the stamp (alpha for intensity, a
   * center-scale for the radius wobble), and a staggered TTL rebuild
   * absorbs geometry changes within a second. Keyed by position+color.
   * THE LAMP RIDES THE GLIDE: patches remember their build scale and
   * the stamp rescales — a zoom no longer clears the whole cache (that
   * clear re-minted every lamp's canvas on the next frame, a
   * guaranteed hitch on wheel-zoom in a lamplit town). A slightly
   * soft light pool during the glide is invisible; the staggered TTL
   * re-crisps everything within a second of settling, and a bounded
   * number of far-off-scale patches rebuild early each frame.
   */
  private readonly patches = new Map<
    string,
    { c: HTMLCanvasElement; w: number; h: number; r: number; intensity: number; builtAt: number; sx: number; sy: number }
  >();
  private frame = 0;
  private offScaleRebuilds = 0;

  /** THE CROSSING: lamp patches are position-keyed on the current
   *  plane — drop them whole when the world changes under the lights. */
  dropWorld(): void {
    this.patches.clear();
  }

  /**
   * Paint the frame's exposure. `blocks` answers whether a tile stops
   * light (walls, cliffs); it is only consulted near occluding lights.
   * `tallH` reports the camera-facing face height of whatever stands
   * on a tile, in WORLD-y units (0 = nothing tall) — it drives the
   * lit-face response for walls AND standing props alike.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    view: LightView,
    sky: DaylightSample,
    lights: WorldLight[],
    blocks: (tx: number, ty: number) => boolean,
    tallH: (tx: number, ty: number) => number,
  ): void {
    if (sky.darkness < 0.02) return; // full daylight: multiply-by-white
    const mw = Math.max(1, Math.ceil(view.w / MAP_DOWNSCALE));
    const mh = Math.max(1, Math.ceil(view.h / MAP_DOWNSCALE));
    if (this.map.width !== mw || this.map.height !== mh) {
      this.map.width = mw;
      this.map.height = mh;
    }
    if (this.face.width < mw || this.face.height < mh) {
      this.face.width = Math.max(this.face.width, mw);
      this.face.height = Math.max(this.face.height, mh);
    }
    const m = this.mctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over';
    const [ar, ag, ab] = sky.ambient;
    m.fillStyle = `rgb(${ar | 0}, ${ag | 0}, ${ab | 0})`;
    m.fillRect(0, 0, mw, mh);

    // The camera transform at map scale: world coords in, map px out.
    const k = 1 / MAP_DOWNSCALE;
    const sx = view.scale * k;
    const sy = view.scale * view.yScale * k;
    const tx = view.ox * k;
    const ty = view.oy * k;

    this.frame++;
    this.offScaleRebuilds = 2;

    for (const light of lights) {
      if (light.intensity <= 0.01) continue;
      if (light.occlude) {
        this.drawOccludedLight(light, blocks, tallH, sx, sy, tx, ty);
      } else {
        m.setTransform(sx, 0, 0, sy, tx, ty);
        m.globalCompositeOperation = 'screen';
        m.globalAlpha = Math.min(1, light.intensity);
        m.drawImage(this.poolSprite(light), light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
        m.globalAlpha = 1;
        // Standing content in the pool catches the light — no shadow
        // math for free-floating lights, so no LOS gate either.
        this.gatherFaceRuns(light, tallH, null);
        this.paintFaceRuns(m, light, sx, sy, tx, ty);
      }
    }

    // THE FILTER: one down-up resample softens the whole field —
    // shadow rims, face seams, pool banding — before the multiply.
    // Bilinear resampling IS the blur (the tilt-shift law).
    const bw = Math.max(1, Math.ceil(mw / 2));
    const bh = Math.max(1, Math.ceil(mh / 2));
    if (this.blur.width !== bw || this.blur.height !== bh) {
      this.blur.width = bw;
      this.blur.height = bh;
    }
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over';
    m.globalAlpha = 1;
    this.bctx.imageSmoothingEnabled = true;
    this.bctx.clearRect(0, 0, bw, bh);
    this.bctx.drawImage(this.map, 0, 0, mw, mh, 0, 0, bw, bh);
    m.imageSmoothingEnabled = true;
    m.drawImage(this.blur, 0, 0, bw, bh, 0, 0, mw, mh);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.map, 0, 0, mw, mh, 0, 0, view.w, view.h);
    ctx.restore();
  }

  /** The light's radial falloff, pre-rendered — intensity rides
   *  globalAlpha at the stamp, so the sprite is shared per color. */
  private poolSprite(light: WorldLight): HTMLCanvasElement {
    return radialGlowSprite(rgbCsv(light.rgb), POOL_STOPS, 0.06);
  }

  /** The soft indirect halo: wider and dimmer than the pool. */
  private wrapSprite(light: WorldLight): HTMLCanvasElement {
    return radialGlowSprite(rgbCsv(light.rgb), WRAP_STOPS, 0.05);
  }

  /**
   * The light's brightness on a camera-facing face at world x, base
   * row ye: N·L (how squarely the face looks at the pool) times the
   * pool's falloff. Sampled at tile CORNERS so neighbouring faces
   * shade continuously — the run reads as one surface.
   */
  private faceK(light: WorldLight, x: number, ye: number): number {
    const mx = x - light.x;
    const my = ye - light.y;
    if (my >= 0) return 0;
    const d = Math.hypot(mx, my) || 1;
    if (d >= light.r) return 0;
    const fall = 1 - d / light.r;
    return Math.min(0.6, light.intensity * Math.pow(fall, 1.4) * (-my / d) * 0.85);
  }

  /**
   * Fill `this.runs` with the light's lit faces, merged into
   * continuous runs: contiguous tiles on one base row with one height
   * fuse, carrying corner-sampled intensities. When `blocks` is given
   * (occluding lights), a coarse sight-line walk zeroes the shadowed
   * stretch of a run — light lands on the first thing it meets.
   */
  private gatherFaceRuns(
    light: WorldLight,
    tallH: (tx: number, ty: number) => number,
    blocks: ((tx: number, ty: number) => boolean) | null,
  ): void {
    this.runs.length = 0;
    const t0x = Math.floor(light.x - light.r);
    const t1x = Math.ceil(light.x + light.r);
    const t0y = Math.floor(light.y - light.r);
    const t1y = Math.ceil(light.y + light.r);
    for (let cy = t0y; cy <= t1y; cy++) {
      const ye = cy + 1;
      if (ye - light.y >= 0) continue; // light must stand south of it
      let run: FaceRun | null = null;
      let live = false;
      for (let cx = t0x; cx <= t1x + 1; cx++) {
        let h = cx <= t1x ? tallH(cx, cy) : 0;
        let k0 = 0;
        let k1 = 0;
        if (h > 0) {
          k0 = this.faceK(light, cx, ye);
          k1 = this.faceK(light, cx + 1, ye);
          if (k0 <= 0.005 && k1 <= 0.005) h = 0;
          else if (blocks) {
            const mx = cx + 0.5 - light.x;
            const my = ye - light.y;
            const d = Math.hypot(mx, my) || 1;
            if (d > 2 && !this.sightClear(light, cx + 0.5, ye, d, blocks)) {
              // Shadowed stretch: the run continues but dips to dark.
              k0 = 0;
              k1 = 0;
            }
          }
        }
        if (run && (h !== run.h || cx > run.x1)) {
          if (live) this.runs.push(run);
          run = null;
          live = false;
        }
        if (h <= 0) continue;
        if (!run) {
          run = { x0: cx, x1: cx + 1, ye, h, ks: [k0, k1] };
        } else {
          // Shared corner: keep the brighter sample (LOS dips write 0).
          run.ks[run.ks.length - 1] = Math.max(run.ks[run.ks.length - 1]!, k0);
          run.ks.push(k1);
          run.x1 = cx + 1;
        }
        if (k0 > 0.03 || k1 > 0.03) live = true;
      }
      if (run && live) this.runs.push(run);
    }
  }

  /** Coarse LOS: sample the sight line one tile at a time, keeping
   *  0.7 tiles clear of both endpoints so neither the light's own tile
   *  nor the face's body blocks itself. */
  private sightClear(
    light: WorldLight,
    fx: number,
    fy: number,
    d: number,
    blocks: (tx: number, ty: number) => boolean,
  ): boolean {
    const ux = (fx - light.x) / d;
    const uy = (fy - light.y) / d;
    for (let t = 0.7; t < d - 0.7; t += 1) {
      if (blocks(Math.floor(light.x + ux * t), Math.floor(light.y + uy * t))) return false;
    }
    return true;
  }

  /**
   * Shape and composite the gathered runs. Face brightness is
   * SEPARABLE — k(x) along the run times the base-anchored vertical
   * fade — so each run is built exactly on the face scratch: fill the
   * horizontal corner-stop gradient, intersect (destination-in) with
   * the vertical fade, then screen the patch onto the destination.
   * One run, three fills, one blit; no per-tile seams anywhere.
   */
  private paintFaceRuns(
    dest: CanvasRenderingContext2D,
    light: WorldLight,
    a: number,
    d: number,
    e: number,
    f: number,
  ): void {
    if (this.runs.length === 0) return;
    const [lr, lg, lb] = light.rgb;
    const stopPrefix = `rgba(${lr}, ${lg}, ${lb}, `;
    const fc = this.fctx;
    for (const run of this.runs) {
      // Device-px bbox of the run on the destination, padded a pixel.
      const bx0 = Math.max(0, Math.floor(run.x0 * a + e) - 1);
      const by0 = Math.max(0, Math.floor((run.ye - run.h) * d + f) - 1);
      const bx1 = Math.min(this.face.width, Math.ceil(run.x1 * a + e) + 1);
      const by1 = Math.min(this.face.height, Math.ceil(run.ye * d + f) + 1);
      if (bx1 <= bx0 || by1 <= by0) continue;
      fc.setTransform(1, 0, 0, 1, 0, 0);
      fc.globalCompositeOperation = 'source-over';
      fc.clearRect(bx0, by0, bx1 - bx0, by1 - by0);
      fc.setTransform(a, 0, 0, d, e, f);
      // The run's intensity ride: one gradient, a stop per corner.
      const hg = fc.createLinearGradient(run.x0, 0, run.x1, 0);
      const n = run.ks.length - 1;
      for (let i = 0; i <= n; i++) {
        hg.addColorStop(i / n, stopPrefix + alphaStr(run.ks[i]!) + ')');
      }
      fc.fillStyle = hg;
      fc.fillRect(run.x0, run.ye - run.h, run.x1 - run.x0, run.h);
      // The base-anchored fade: hottest at the foot, dead at the top.
      fc.globalCompositeOperation = 'destination-in';
      fc.drawImage(rampSprite(0.55, 0.45), run.x0, run.ye - run.h, run.x1 - run.x0, run.h);
      dest.save();
      dest.setTransform(1, 0, 0, 1, 0, 0);
      dest.globalCompositeOperation = 'screen';
      dest.drawImage(this.face, bx0, by0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
      dest.restore();
    }
  }

  /**
   * GEOMETRY, NOT TILES: greedily merge every blocking tile in the
   * light's reach into rectangles (row runs, then identical runs fuse
   * downward). A straight wall becomes ONE rect casting ONE shadow —
   * the per-tile wedge scallops this replaces were the tile grid
   * showing through the light.
   */
  private collectRects(
    light: WorldLight,
    blocks: (tx: number, ty: number) => boolean,
  ): void {
    this.rects.length = 0;
    const t0x = Math.floor(light.x - light.r);
    const t1x = Math.ceil(light.x + light.r);
    const t0y = Math.floor(light.y - light.r);
    const t1y = Math.ceil(light.y + light.r);
    const lTx = Math.floor(light.x);
    const lTy = Math.floor(light.y);
    // Rects still open to downward fusion, from the previous row.
    let open: OccRect[] = [];
    for (let cy = t0y; cy <= t1y; cy++) {
      const rowRuns: OccRect[] = [];
      let x0 = -1;
      for (let cx = t0x; cx <= t1x + 1; cx++) {
        const solid =
          cx <= t1x && !(cx === lTx && cy === lTy) && blocks(cx, cy);
        if (solid && x0 < 0) x0 = cx;
        else if (!solid && x0 >= 0) {
          rowRuns.push({ x0, y0: cy, x1: cx, y1: cy + 1 });
          x0 = -1;
        }
      }
      // Fuse runs that exactly continue an open rect; retire the rest.
      const next: OccRect[] = [];
      for (const rr of rowRuns) {
        const prev = open.find((o) => o.x0 === rr.x0 && o.x1 === rr.x1 && o.y1 === rr.y0);
        if (prev) {
          prev.y1 = rr.y1;
          next.push(prev);
        } else {
          next.push(rr);
        }
      }
      for (const o of open) if (!next.includes(o)) this.rects.push(o);
      open = next;
    }
    for (const o of open) this.rects.push(o);
  }

  /**
   * A light with wall shadows: painted alone on a scratch canvas, its
   * shadow erased from merged geometry, then screened onto the map.
   * The erase is GRADED — two widening penumbra bands, then the core
   * at SHADOW_DENSITY (never to zero: the world has bounce light) —
   * and after it the wrap halo pours indirect light back over
   * everything, corners included. Lit faces paint last: they re-light
   * exactly the band a wall's own occlusion blacked out.
   */
  private drawOccludedLight(
    light: WorldLight,
    blocks: (tx: number, ty: number) => boolean,
    tallH: (tx: number, ty: number) => number,
    sx: number,
    sy: number,
    tx: number,
    ty: number,
  ): void {
    const key = `${light.x},${light.y}|${light.rgb.join()}`;
    let p = this.patches.get(key);
    // Staggered TTL so a whole town's lamps never rebuild on one frame.
    const ttl = 45 + ((key.length * 7) & 15);
    // Far off the build scale (deep zoom since the bake): rebuild early
    // rather than stamp a visibly resampled pool — but only a bounded
    // number per frame, so a zoom never re-mints the whole town at once.
    const offScale =
      p !== undefined &&
      (Math.abs(sx / p.sx - 1) > 0.25 || Math.abs(sy / p.sy - 1) > 0.25) &&
      this.offScaleRebuilds > 0;
    if (!p || offScale || this.frame - p.builtAt > ttl) {
      if (offScale) this.offScaleRebuilds--;
      // THE LAMP KEEPS ITS CANVAS: a TTL rebuild repaints the patch's
      // existing canvas in place. Fresh canvases are minted only for
      // lights new to the cache — the per-rebuild createElement was
      // shedding ~1MB of canvas backing store per lamp per second all
      // night long (browser canvas memory, invisible to the JS heap).
      const built = this.buildLightPatch(light, blocks, tallH, sx, sy, p?.c);
      if (!built) return;
      while (this.patches.size >= 128) {
        const first = this.patches.keys().next().value as string;
        this.patches.delete(first);
      }
      this.patches.delete(key);
      this.patches.set(key, built);
      p = built;
    } else {
      // LRU touch so the cap evicts truly cold lamps, not busy ones.
      this.patches.delete(key);
      this.patches.set(key, p);
    }
    // The flicker rides the stamp: intensity as alpha, radius as a
    // center-scale — both hover near 1 while the TTL keeps the patch's
    // reference values current. The extra sx/sy ratio rescales patches
    // baked at another zoom (THE LAMP RIDES THE GLIDE).
    const scale = light.r / p.r;
    const dw = p.w * scale * (sx / p.sx);
    const dh = p.h * scale * (sy / p.sy);
    const m = this.mctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'screen';
    m.globalAlpha = Math.min(1, light.intensity / p.intensity);
    m.drawImage(p.c, light.x * sx + tx - dw / 2, light.y * sy + ty - dh / 2, dw, dh);
    m.globalAlpha = 1;
  }

  /**
   * Compose an occluding light's full patch — pool, graded shadow
   * erase, wrap halo, lit faces — in a frame anchored to the light's
   * own center, camera-independent by construction.
   */
  private buildLightPatch(
    light: WorldLight,
    blocks: (tx: number, ty: number) => boolean,
    tallH: (tx: number, ty: number) => number,
    sx: number,
    sy: number,
    reuse?: HTMLCanvasElement,
  ): { c: HTMLCanvasElement; w: number; h: number; r: number; intensity: number; builtAt: number; sx: number; sy: number } | null {
    // Patch bbox in map pixels around the light's WRAP reach.
    const reach = light.r * WRAP_R;
    const bw = Math.ceil(reach * 2 * sx) + 2;
    const bh = Math.ceil(reach * 2 * sy) + 2;
    if (bw <= 0 || bh <= 0) return null;
    if (this.tmp.width < bw || this.tmp.height < bh) {
      this.tmp.width = Math.max(this.tmp.width, bw);
      this.tmp.height = Math.max(this.tmp.height, bh);
    }
    if (this.face.width < this.tmp.width || this.face.height < this.tmp.height) {
      this.face.width = Math.max(this.face.width, this.tmp.width);
      this.face.height = Math.max(this.face.height, this.tmp.height);
    }
    const t = this.tctx;
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'source-over';
    t.globalAlpha = 1;
    t.clearRect(0, 0, bw, bh);
    // The world→map transform, anchored so the light sits at center.
    const tx = bw / 2 - light.x * sx;
    const ty = bh / 2 - light.y * sy;
    t.setTransform(sx, 0, 0, sy, tx, ty);
    t.globalAlpha = Math.min(1, light.intensity);
    t.drawImage(this.poolSprite(light), light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
    t.globalAlpha = 1;

    // Shadows from merged geometry, graded rim to core.
    this.collectRects(light, blocks);
    if (this.rects.length > 0) {
      t.globalCompositeOperation = 'destination-out';
      t.fillStyle = '#000';
      for (const [splay, alpha] of PENUMBRA) {
        t.globalAlpha = alpha;
        for (const rect of this.rects) this.castRectShadow(t, light, rect, splay);
      }
      t.globalAlpha = SHADOW_DENSITY;
      for (const rect of this.rects) this.castRectShadow(t, light, rect, 0);
      t.globalAlpha = 1;
      t.globalCompositeOperation = 'source-over';
    }

    // THE WRAP: indirect light, painted OVER the shadow erase — the
    // bounce that turns corners, fills the boxed room, and keeps a
    // shadowed nook readable beside a burning brazier.
    t.globalCompositeOperation = 'screen';
    t.globalAlpha = Math.min(1, light.intensity);
    t.drawImage(this.wrapSprite(light), light.x - reach, light.y - reach, reach * 2, reach * 2);
    t.globalAlpha = 1;
    t.globalCompositeOperation = 'source-over';

    // THE LIT FACES: everything standing in the pool — the walls that
    // just erased their own wedges AND the stalls, stations and trees
    // the shadow math never knew — catches the lamp on the side the
    // camera sees, LOS-gated so nothing glows through a wall.
    this.gatherFaceRuns(light, tallH, blocks);
    this.paintFaceRuns(t, light, sx, sy, tx, ty);
    t.setTransform(1, 0, 0, 1, 0, 0);

    const c = reuse ?? document.createElement('canvas');
    const cc = c.getContext('2d')!;
    if (c.width !== bw || c.height !== bh) {
      c.width = bw;
      c.height = bh;
    } else {
      cc.clearRect(0, 0, bw, bh);
    }
    cc.drawImage(this.tmp, 0, 0, bw, bh, 0, 0, bw, bh);
    return { c, w: bw, h: bh, r: light.r, intensity: Math.max(0.05, Math.min(1, light.intensity)), builtAt: this.frame, sx, sy };
  }

  /**
   * Project a merged rectangle's silhouette away from the light with
   * corner rays splayed outward by `splay` radians (0 = the exact hard
   * silhouette). Every back-facing edge of the rect erases one quad;
   * with rects merged there are no interior edges left to seam.
   */
  private castRectShadow(
    t: CanvasRenderingContext2D,
    light: WorldLight,
    rect: OccRect,
    splay: number,
  ): void {
    const c: Array<[number, number]> = [
      [rect.x0, rect.y0],
      [rect.x1, rect.y0],
      [rect.x1, rect.y1],
      [rect.x0, rect.y1],
    ];
    const normals: Array<[number, number]> = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    const reach = light.r * 2.2;
    const cosP = Math.cos(splay);
    const sinP = Math.sin(splay);
    for (let e = 0; e < 4; e++) {
      const a = c[e]!;
      const b = c[(e + 1) % 4]!;
      const mx = (a[0] + b[0]) / 2 - light.x;
      const my = (a[1] + b[1]) / 2 - light.y;
      // Front-facing: the light strikes this side — nothing to erase.
      if (mx * normals[e]![0] + my * normals[e]![1] <= 0) continue;
      const dax = a[0] - light.x;
      const day = a[1] - light.y;
      const dbx = b[0] - light.x;
      const dby = b[1] - light.y;
      const da = Math.hypot(dax, day) || 1;
      const db = Math.hypot(dbx, dby) || 1;
      const uax = dax / da;
      const uay = day / da;
      const ubx = dbx / db;
      const uby = dby / db;
      t.beginPath();
      t.moveTo(a[0], a[1]);
      t.lineTo(b[0], b[1]);
      t.lineTo(b[0] + (ubx * cosP - uby * sinP) * reach, b[1] + (uby * cosP + ubx * sinP) * reach);
      t.lineTo(a[0] + (uax * cosP + uay * sinP) * reach, a[1] + (uay * cosP - uax * sinP) * reach);
      t.closePath();
      t.fill();
    }
  }
}
