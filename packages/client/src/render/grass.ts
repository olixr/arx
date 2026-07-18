import { Tile, hashCoords, valueNoise } from '@devcraft/shared';

/**
 * The bespoke grass system. The ground IS the game's biggest canvas, and
 * this module is what makes it read as a living meadow instead of blocks
 * of color. Design laws:
 *
 * - BLOCKY: blades are tapered flat-top slabs (chisel-cut quads), never
 *   soft strokes — the same brutalist language as shapes.ts. Tall blades
 *   bend as two rigid segments, like a slab cracking at a knuckle.
 * - VARIED: a coverage noise field deals each tile a hand — bare dirt
 *   patches, lone strands, medium stands, or dense clumps rooted in a
 *   shared crown chip. Meadows breathe; nothing tiles.
 * - ONE WIND: every blade, flower, and tree samples the same vector
 *   wind field. Gust fronts are CURVED (the front's phase is bent by a
 *   slow cross-wave) and a perpendicular meander makes swaths snake
 *   across the field — fluid motion without a fluid sim.
 * - SHIMMER: the passing front relights blades from a precomputed
 *   shade/base/lit ramp, so bright bands sweep the meadow exactly like
 *   sun catching bent grass.
 * - INHABITED: tall grass y-sorts around entities (you walk THROUGH
 *   it), bodies part and flatten nearby blades, and a passage leaves a
 *   springy rustle wobble + leaf specks behind.
 * - CHEAP: per-tile blade geometry is generated once and cached; every
 *   frame batches all quads into a handful of Path2D color buckets, so
 *   thousands of blades cost ~20 canvas fills.
 */

// ------------------------------------------------------------------ wind

/** Wind direction — matches the treeline so the whole scene agrees. */
const WX = 0.94;
const WY = 0.34;

export interface WindSample {
  /** Bend vector in world tiles (unit cantilever at reference height). */
  bx: number;
  by: number;
  /** Scalar strength ~[-0.6, 1.4] — what the trees lean on. */
  s: number;
}

/**
 * Coherent vector wind: two travelling swells over a breathing gust
 * envelope, with the front's phase BENT by a slow cross-wave (fronts
 * curve like real weather) and a perpendicular meander (swaths snake
 * sideways as they pass). Pure function of position + time.
 */
export function windAt(wx: number, wy: number, tSec: number): WindSample {
  const along = wx * WX + wy * WY;
  const across = -wx * WY + wy * WX;
  const frontBend = 0.9 * Math.sin(across * 0.055 + tSec * 0.13);
  const gust = 0.6 + 0.4 * Math.sin(along * 0.05 - tSec * 0.34 + frontBend);
  const sway =
    0.72 * Math.sin(along * 0.12 - tSec * 1.25 + 0.35 * frontBend) +
    0.28 * Math.sin(along * 0.2 - tSec * 1.9 + 0.7);
  const s = gust * (0.4 + sway);
  const meander = 0.3 * Math.sin(across * 0.14 - tSec * 0.7 + along * 0.05);
  return {
    bx: WX * s - WY * meander,
    by: WY * s + WX * meander,
    s,
  };
}

/** Scalar wind for anything that only bends one way (the trees). */
export function windScalarAt(wx: number, wy: number, tSec: number): number {
  return windAt(wx, wy, tSec).s;
}

// ------------------------------------------------------------ generation

export interface Blade {
  bx: number; // world base
  by: number;
  h: number; // height in tiles
  w: number; // base half-width in tiles
  lean: number; // static windswept lean (tiles at tip)
  phase: number; // per-blade jitter phase [0, 1)
  bin: number; // quantized phase → flutter-table index
  lumJit: number; // static shimmer-threshold jitter
  tone: number; // palette row
  seg2: boolean; // tall two-segment blade
}

export interface Flower {
  bx: number;
  by: number;
  h: number; // stem height in tiles
  size: number; // bloom half-extent in tiles
  pal: number; // palette index
  phase: number;
}

export interface GrassTileGeom {
  /** Short blades — always drawn under entities. */
  under: Blade[];
  /** Tall blades split at the tile's midline for y-sorting. */
  north: Blade[];
  south: Blade[];
  /** Clump crowns: dark root chips anchoring dense tufts. */
  roots: Array<{ x: number; y: number; w: number }>;
  flowers: Flower[];
}

/** Live per-tile state layered over the immutable geometry. */
interface GrassTileState {
  geom: GrassTileGeom;
  wakeAt: number; // last rustle disturbance, ms
  tx: number;
  ty: number;
}

/** Detail-layer ids mirrored here to avoid a wider import surface. */
const DETAIL_FLOWERS = 1;
const DETAIL_TUFT = 2;

function rand01(h: number, shift: number): number {
  return ((h >>> shift) & 1023) / 1024;
}

function makeBlade(
  tx: number,
  ty: number,
  salt: number,
  i: number,
  tall: boolean,
  clumpAt: { x: number; y: number } | null,
): Blade {
  const h = hashCoords(salt + i * 7, tx, ty);
  let bx: number;
  let by: number;
  if (clumpAt) {
    // Clump members fan out of a shared crown.
    bx = clumpAt.x + (rand01(h, 2) - 0.5) * 0.34;
    by = clumpAt.y + (rand01(h, 12) - 0.5) * 0.2;
  } else {
    bx = tx + 0.08 + rand01(h, 2) * 0.84;
    by = ty + 0.08 + rand01(h, 12) * 0.84;
  }
  const height = tall
    ? 0.36 + rand01(h, 5) * 0.28
    : 0.15 + rand01(h, 5) * 0.19;
  const phase = rand01(h, 18);
  return {
    bx,
    by,
    h: height,
    // Chunky slabs, not strokes: a blade is a visible block of green.
    w: 0.034 + rand01(h, 8) * 0.028 + (tall ? 0.012 : 0),
    lean: (rand01(h, 15) - 0.42) * 0.1,
    phase,
    bin: Math.min(31, Math.floor(phase * 32)),
    lumJit: (rand01(h, 21) - 0.5) * 0.55,
    tone: h % 5,
    seg2: tall && height > 0.42,
  };
}

/**
 * Deterministic geometry for one grass tile. Coverage noise deals the
 * hand: bare / strands / stand / clump. Detail.Tuft forces a clump,
 * Detail.Flowers plants a bloom patch, and a low-frequency meadow noise
 * scatters lone flowers so they gather into natural drifts.
 */
export function generateGrassTile(
  tx: number,
  ty: number,
  tileId: number,
  detailId: number,
): GrassTileGeom {
  const geom: GrassTileGeom = { under: [], north: [], south: [], roots: [], flowers: [] };
  const tall = tileId === Tile.GrassTall;
  const cov =
    valueNoise(901, tx * 0.13, ty * 0.13) * 0.6 + valueNoise(902, tx * 0.045, ty * 0.045) * 0.4;

  if (tall) {
    // A tall tile is a thicket: dense long slabs + a little underbrush.
    const h = hashCoords(151, tx, ty);
    const count = 9 + (h % 5);
    for (let i = 0; i < count; i++) {
      const b = makeBlade(tx, ty, 157, i, true, null);
      (b.by < ty + 0.5 ? geom.north : geom.south).push(b);
    }
    for (let i = 0; i < 2; i++) geom.under.push(makeBlade(tx, ty, 163, i, false, null));
    return geom;
  }

  // Short grass: the coverage hand. Counts stay lean — width and the
  // baked stubble carry density; the live blades carry the motion.
  const clump = detailId === DETAIL_TUFT || cov > 0.74;
  const count = clump ? 0 : cov < 0.32 ? (hashCoords(167, tx, ty) % 2) : cov < 0.56 ? 2 : 3;
  for (let i = 0; i < count; i++) geom.under.push(makeBlade(tx, ty, 173, i, false, null));

  if (clump) {
    const h = hashCoords(179, tx, ty);
    const cx = tx + 0.3 + rand01(h, 3) * 0.4;
    const cy = ty + 0.3 + rand01(h, 13) * 0.4;
    geom.roots.push({ x: cx, y: cy, w: 0.16 + rand01(h, 7) * 0.06 });
    const members = 5 + (h % 3);
    for (let i = 0; i < members; i++) {
      const b = makeBlade(tx, ty, 181, i, false, { x: cx, y: cy });
      b.h += 0.08; // clumps stand proud of the lawn
      geom.under.push(b);
    }
    // A satellite strand beside the clump.
    geom.under.push(makeBlade(tx, ty, 191, 0, false, null));
  }

  // Flowers: authored patches bloom hard; meadow noise drifts the rest.
  const meadow = valueNoise(903, tx * 0.06, ty * 0.06);
  const flowerCount =
    detailId === DETAIL_FLOWERS ? 3 + (hashCoords(193, tx, ty) % 3) : meadow > 0.78 && cov > 0.4 ? 1 : 0;
  for (let i = 0; i < flowerCount; i++) {
    const h = hashCoords(197 + i * 5, tx, ty);
    geom.flowers.push({
      bx: tx + 0.12 + rand01(h, 2) * 0.76,
      by: ty + 0.12 + rand01(h, 12) * 0.76,
      h: 0.2 + rand01(h, 6) * 0.12,
      size: 0.05 + rand01(h, 9) * 0.025,
      pal: h % 3,
      phase: rand01(h, 17),
    });
  }
  return geom;
}

// ------------------------------------------------------------- palette

/** Base tones, deep → light: the meadow's dealt greens. */
const TONE_BASE = ['#476f31', '#527c38', '#5d8a3f', '#699847', '#76a650'];
const LIT_TARGET = '#d9e37f'; // sun catching a bent blade
const SHADE_TARGET = '#26421f'; // the trough of the wave
const ROOT_COLOR = '#3a5c2b';
const FLOWER_PALS = ['#e88a9e', '#f0d264', '#efe3c2'];
const FLOWER_CORE = '#f7efd8';

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => {
    const va = (pa >> sh) & 255;
    const vb = (pb >> sh) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/**
 * Shimmer ramp: LIGHTS graded steps per tone, shade → base → lit. Many
 * small steps (dithered further by per-blade lumJit) is what makes a
 * passing gust GLIDE across the field — three coarse steps popped.
 */
const LIGHTS = 7;
const BLADE_FILLS: string[] = TONE_BASE.flatMap((tone) =>
  Array.from({ length: LIGHTS }, (_, i) => {
    const t = i / (LIGHTS - 1);
    return t < 0.45
      ? mixHex(tone, SHADE_TARGET, 0.42 * (1 - t / 0.45))
      : mixHex(tone, LIT_TARGET, 0.38 * ((t - 0.45) / 0.55));
  }),
);

// Bucket layout: blade ramp first, then roots, petals, cores, stems.
const B_ROOT = TONE_BASE.length * LIGHTS;
const B_PETAL0 = B_ROOT + 1;
const B_CORE = B_PETAL0 + 3;
const B_STEM = B_CORE + 1;
const BUCKETS = B_STEM + 1;
const BUCKET_FILLS: string[] = [
  ...BLADE_FILLS,
  ROOT_COLOR,
  ...FLOWER_PALS,
  FLOWER_CORE,
  mixHex(TONE_BASE[1]!, SHADE_TARGET, 0.3), // stems
];

// -------------------------------------------------------------- physics

/** Radial falloff of a body pushing into grass: 1 at center, 0 at R. */
export function disturbFalloff(dist: number, radius: number): number {
  if (dist >= radius) return 0;
  const f = 1 - dist / radius;
  return f * f * (3 - 2 * f); // smoothstep — no hard rim in the field
}

export interface Disturber {
  id: number | 'own';
  x: number;
  y: number;
  r: number;
}

interface LiveDisturber extends Disturber {
  vx: number;
  vy: number;
  speed: number;
}

// --------------------------------------------------------------- system

type WTS = (wx: number, wy: number) => { x: number; y: number };
type Sampler = (tx: number, ty: number) => number | undefined;
type DetailFn = (tx: number, ty: number) => number;

export interface GrassBounds {
  minTx: number;
  maxTx: number;
  minTy: number;
  maxTy: number;
}

/**
 * Per-tile screen frame: worldToScreen is affine within a tile (lift is
 * constant across a grass tile), so two corner samples give an exact
 * local transform — and spare a per-BLADE elevation lookup, the single
 * hottest thing the old path did.
 */
interface TileFrame {
  x0: number;
  y0: number;
  sx: number;
  sy: number;
}

/** Bins for the shared per-frame flutter table (indexed by blade phase). */
const FLUTTER_BINS = 32;

export class GrassSystem {
  private readonly tiles = new Map<number, GrassTileState>();
  /** Position → live state, for waking tiles bodies move through. */
  private readonly posIndex = new Map<number, GrassTileState>();
  private readonly lastPos = new Map<number | 'own', { x: number; y: number; tx: number; ty: number }>();
  private live: LiveDisturber[] = [];
  private tSec = 0;
  private nowMs = 0;
  private paths: Path2D[] | null = null;
  private touched: number[] = [];
  private readonly touchedFlag = new Uint8Array(BUCKETS);
  /** Scratch: disturbers near the tile currently being built. */
  private near: LiveDisturber[] = [];
  /**
   * Per-frame flutter table: every blade's tremble is one of 32 phase
   * bins sampled once per frame — thousands of Math.sin calls become
   * thirty-two.
   */
  private readonly flutter = new Float32Array(FLUTTER_BINS);
  private readonly wakeWobble = new Float32Array(FLUTTER_BINS);

  /**
   * Per-frame setup: resolve disturber velocities, wake tiles bodies are
   * moving through, and fire rustle specks when someone wades into a new
   * patch of tall grass.
   */
  beginFrame(
    nowMs: number,
    frameDt: number,
    disturbers: Disturber[],
    groundAt: Sampler,
    rustle: (x: number, y: number) => void,
    camX: number,
    camY: number,
  ): void {
    this.nowMs = nowMs;
    this.tSec = nowMs / 1000;
    for (let i = 0; i < FLUTTER_BINS; i++) {
      const phase = (i / FLUTTER_BINS) * 6.283;
      this.flutter[i] = Math.sin(this.tSec * 2.3 + phase) * 0.028;
      this.wakeWobble[i] = Math.sin(nowMs * 0.021 + phase * 1.75) * 0.055;
    }
    const dt = Math.max(frameDt, 1 / 240);
    this.live = disturbers.map((d) => {
      const prev = this.lastPos.get(d.id);
      const vx = prev ? (d.x - prev.x) / dt : 0;
      const vy = prev ? (d.y - prev.y) / dt : 0;
      const speed = Math.hypot(vx, vy);
      const tx = Math.floor(d.x);
      const ty = Math.floor(d.y);
      if (speed > 1.1) {
        // Moving bodies keep the grass around them agitated.
        const st = this.posIndex.get((ty + 8192) * 16384 + (tx + 8192));
        if (st) st.wakeAt = nowMs;
        if (prev && (prev.tx !== tx || prev.ty !== ty)) {
          const tile = groundAt(tx, ty);
          if (tile === Tile.GrassTall) rustle(d.x, d.y);
        }
      }
      this.lastPos.set(d.id, { x: d.x, y: d.y, tx, ty });
      return { ...d, vx: Math.min(8, Math.max(-8, vx)), vy: Math.min(8, Math.max(-8, vy)), speed };
    });
    // Forget disturbers that vanished (deaths, despawns).
    if (this.lastPos.size > disturbers.length + 8) {
      const ids = new Set(disturbers.map((d) => d.id));
      for (const key of this.lastPos.keys()) if (!ids.has(key)) this.lastPos.delete(key);
    }
    // Evict geometry far outside the camera's neighbourhood.
    if (this.tiles.size > 6000) {
      for (const [key, st] of this.tiles) {
        if (Math.abs(st.tx - camX) > 48 || Math.abs(st.ty - camY) > 48) {
          this.tiles.delete(key);
          this.posIndex.delete((st.ty + 8192) * 16384 + (st.tx + 8192));
        }
      }
    }
  }

  private tile(tx: number, ty: number, tileId: number, detailId: number): GrassTileState {
    // Numeric key — string building here showed up in profiles.
    const key = (((ty + 8192) * 16384 + (tx + 8192)) * 16 + tileId) * 8 + detailId;
    let st = this.tiles.get(key);
    if (!st) {
      st = { geom: generateGrassTile(tx, ty, tileId, detailId), wakeAt: 0, tx, ty };
      this.tiles.set(key, st);
      this.posIndex.set((ty + 8192) * 16384 + (tx + 8192), st);
    }
    return st;
  }

  private ensurePaths(): Path2D[] {
    if (!this.paths) {
      this.paths = new Array(BUCKETS);
      for (let i = 0; i < BUCKETS; i++) this.paths[i] = new Path2D();
    }
    for (const i of this.touched) {
      this.paths[i] = new Path2D();
      this.touchedFlag[i] = 0;
    }
    this.touched.length = 0;
    return this.paths as Path2D[];
  }

  private mark(i: number): void {
    if (this.touchedFlag[i] === 0) {
      this.touchedFlag[i] = 1;
      this.touched.push(i);
    }
  }

  /** Refresh the near-disturber scratch list for one tile. */
  private gatherNear(tx: number, ty: number): void {
    this.near.length = 0;
    const cx = tx + 0.5;
    const cy = ty + 0.5;
    for (const d of this.live) {
      if (Math.abs(d.x - cx) < 1.8 && Math.abs(d.y - cy) < 1.8) this.near.push(d);
    }
  }

  /** Two corner samples → the tile's exact local affine frame. */
  private tileFrame(tx: number, ty: number, wts: WTS): TileFrame {
    const p0 = wts(tx, ty);
    const p1 = wts(tx + 1, ty + 1);
    return { x0: p0.x, y0: p0.y, sx: p1.x - p0.x, sy: p1.y - p0.y };
  }

  /**
   * One blade → one (or two) quads into its color bucket. All the life
   * happens here: wind cantilever, shimmer relight, body displacement,
   * post-passage wobble.
   */
  private buildBlade(b: Blade, st: GrassTileState, wind: WindSample, f: TileFrame, s: number): void {
    // Wind cantilever: bend grows with height; the y-component folds
    // into a slight x-drift plus a height dip (bending toward or away
    // from the camera reads as the blade foreshortening).
    const cant = b.h * (0.55 + b.phase * 0.2);
    let tipDx = (wind.bx + wind.by * 0.35) * cant * 0.42 + b.lean;
    let hMul = 1 - wind.by * 0.05;

    // Flutter: tiny per-blade tremble riding on the big wave (table).
    tipDx += this.flutter[b.bin]! * (0.5 + Math.abs(wind.s));

    // Bodies part the grass: radial push + flatten underfoot.
    for (const d of this.near) {
      const dx = b.bx - d.x;
      const dy = b.by - d.y;
      const dist = Math.hypot(dx, dy);
      const push = disturbFalloff(dist, d.r + 0.62);
      if (push <= 0) continue;
      const inv = dist > 0.001 ? 1 / dist : 0;
      tipDx += dx * inv * push * 0.3 + d.vx * 0.03 * push;
      hMul *= 1 - 0.45 * push;
    }

    // The wake: grass springs back with a decaying wobble after passage.
    if (st.wakeAt > 0) {
      const e = 1 - (this.nowMs - st.wakeAt) / 700;
      if (e > 0) tipDx += this.wakeWobble[b.bin]! * e * e;
    }

    // Shimmer: the front relights the blade as it passes — mapped onto
    // the graded ramp so the change is a glide, never a pop.
    const lum = (wind.s + b.lumJit + 0.35) / 1.5;
    const level = lum <= 0 ? 0 : lum >= 1 ? LIGHTS - 1 : Math.floor(lum * LIGHTS);
    const bucket = b.tone * LIGHTS + level;
    const path = (this.paths as Path2D[])[bucket]!;
    this.mark(bucket);

    const px = f.x0 + (b.bx - st.tx) * f.sx;
    const py = f.y0 + (b.by - st.ty) * f.sy;
    const hpx = b.h * hMul * s;
    if (hpx < 1.5) return; // sub-pixel blades are pure cost
    const w0 = Math.max(1.1, b.w * s);
    const w1 = w0 * 0.55;
    const tipX = px + tipDx * s;
    const tipY = py - hpx;

    if (b.seg2) {
      // Two rigid segments: planted shin, streaming crown.
      const midX = px + tipDx * 0.32 * s;
      const midY = py - hpx * 0.48;
      const wm = w0 * 0.8;
      path.moveTo(px - w0, py);
      path.lineTo(px + w0, py);
      path.lineTo(midX + wm, midY);
      path.lineTo(tipX + w1, tipY);
      path.lineTo(tipX - w1, tipY);
      path.lineTo(midX - wm, midY);
      path.closePath();
    } else {
      path.moveTo(px - w0, py);
      path.lineTo(px + w0, py);
      path.lineTo(tipX + w1, tipY);
      path.lineTo(tipX - w1, tipY);
      path.closePath();
    }
  }

  private buildFlower(f: Flower, st: GrassTileState, wind: WindSample, fr: TileFrame, s: number): void {
    let bob = (wind.bx + wind.by * 0.35) * f.h * 0.5;
    bob += Math.sin(this.tSec * 2.6 + f.phase * 6.283) * 0.02;
    let hMul = 1;
    for (const d of this.near) {
      const dx = f.bx - d.x;
      const dy = f.by - d.y;
      const fall = disturbFalloff(Math.hypot(dx, dy), d.r + 0.6);
      if (fall <= 0) continue;
      bob += (dx > 0 ? 1 : -1) * fall * 0.24;
      hMul *= 1 - 0.35 * fall;
    }
    if (st.wakeAt > 0) {
      const e = 1 - (this.nowMs - st.wakeAt) / 700;
      if (e > 0) bob += Math.sin(this.nowMs * 0.023 + f.phase * 9) * 0.06 * e * e;
    }

    const px = fr.x0 + (f.bx - st.tx) * fr.sx;
    const py = fr.y0 + (f.by - st.ty) * fr.sy;
    const hpx = f.h * hMul * s;
    const hx = px + bob * s;
    const hy = py - hpx;
    const paths = this.paths as Path2D[];

    // Stem: a thin slab leaning to the bloom.
    const stem = paths[B_STEM]!;
    this.mark(B_STEM);
    const sw = Math.max(0.8, 0.014 * s);
    stem.moveTo(px - sw, py);
    stem.lineTo(px + sw, py);
    stem.lineTo(hx + sw * 0.7, hy);
    stem.lineTo(hx - sw * 0.7, hy);
    stem.closePath();

    // Bloom: a pixel-flower plus — four petal chips around a core.
    const pr = f.size * s;
    const petal = paths[B_PETAL0 + f.pal]!;
    this.mark(B_PETAL0 + f.pal);
    petal.rect(hx - pr * 1.5, hy - pr * 0.5, pr, pr);
    petal.rect(hx + pr * 0.5, hy - pr * 0.5, pr, pr);
    petal.rect(hx - pr * 0.5, hy - pr * 1.5, pr, pr);
    petal.rect(hx - pr * 0.5, hy + pr * 0.5, pr, pr);
    const core = paths[B_CORE]!;
    this.mark(B_CORE);
    core.rect(hx - pr * 0.45, hy - pr * 0.45, pr * 0.9, pr * 0.9);
  }

  private buildRoots(st: GrassTileState, f: TileFrame, s: number): void {
    if (st.geom.roots.length === 0) return;
    const path = (this.paths as Path2D[])[B_ROOT]!;
    this.mark(B_ROOT);
    for (const r of st.geom.roots) {
      const px = f.x0 + (r.x - st.tx) * f.sx;
      const py = f.y0 + (r.y - st.ty) * f.sy;
      const w = r.w * s;
      const h = w * 0.32;
      path.moveTo(px - w, py);
      path.lineTo(px - w * 0.6, py - h);
      path.lineTo(px + w * 0.6, py - h);
      path.lineTo(px + w, py);
      path.closePath();
    }
  }

  private flush(ctx: CanvasRenderingContext2D): void {
    const paths = this.paths as Path2D[];
    // Roots under blades under flowers: painter's order inside the batch.
    if (this.touchedFlag[B_ROOT]) {
      ctx.fillStyle = BUCKET_FILLS[B_ROOT]!;
      ctx.fill(paths[B_ROOT]!);
    }
    for (let i = 0; i < B_ROOT; i++) {
      if (!this.touchedFlag[i]) continue;
      ctx.fillStyle = BUCKET_FILLS[i]!;
      ctx.fill(paths[i]!);
    }
    for (const i of [B_STEM, B_PETAL0, B_PETAL0 + 1, B_PETAL0 + 2, B_CORE]) {
      if (!this.touchedFlag[i]) continue;
      ctx.fillStyle = BUCKET_FILLS[i]!;
      ctx.fill(paths[i]!);
    }
  }

  /**
   * The under-layer: every short blade, clump, and flower in bounds —
   * drawn beneath entities. Tall thickets contribute only their sparse
   * underbrush here; their mass y-sorts via collectTall.
   */
  drawUnder(
    ctx: CanvasRenderingContext2D,
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
  ): void {
    this.ensurePaths();
    const flowerTiles: Array<[GrassTileState, TileFrame]> = [];
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const st = this.tile(tx, ty, t, detail(tx, ty));
        const wind = windAt(tx + 0.5, ty + 0.5, this.tSec);
        const f = this.tileFrame(tx, ty, wts);
        this.gatherNear(tx, ty);
        this.buildRoots(st, f, s);
        for (const b of st.geom.under) this.buildBlade(b, st, wind, f, s);
        if (st.geom.flowers.length > 0) flowerTiles.push([st, f]);
      }
    }
    // Flowers are their own layer: heads always read above the lawn.
    for (const [st, f] of flowerTiles) {
      const wind = windAt(st.tx + 0.5, st.ty + 0.5, this.tSec);
      this.gatherNear(st.tx, st.ty);
      for (const fl of st.geom.flowers) this.buildFlower(fl, st, wind, f, s);
    }
    this.flush(ctx);
  }

  /**
   * Tall grass as y-sorted items: each thicket splits at its midline
   * into two depth bands, so a body standing inside it is wrapped —
   * blades behind it draw first, blades in front draw over.
   */
  collectTall(
    items: Array<{ sortY: number; draw: () => void }>,
    ctx: CanvasRenderingContext2D,
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
  ): void {
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      // All tall tiles in a row share their two band depths, so a whole
      // row-run batches into two items — one Path2D flush each, however
      // wide the thicket is.
      let row: GrassTileState[] | null = null;
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        if (ground(tx, ty) !== Tile.GrassTall) continue;
        (row ??= []).push(this.tile(tx, ty, Tile.GrassTall, detail(tx, ty)));
      }
      if (!row) continue;
      const tiles = row;
      const bands: Array<['north' | 'south', number]> = [
        ['north', ty + 0.26],
        ['south', ty + 0.76],
      ];
      for (const [half, sortY] of bands) {
        items.push({
          sortY,
          draw: () => {
            this.ensurePaths();
            for (const st of tiles) {
              const wind = windAt(st.tx + 0.5, st.ty + 0.5, this.tSec);
              const f = this.tileFrame(st.tx, st.ty, wts);
              this.gatherNear(st.tx, st.ty);
              for (const b of st.geom[half]) this.buildBlade(b, st, wind, f, s);
            }
            this.flush(ctx);
          },
        });
      }
    }
  }

  /**
   * Elevated rows: the plateau band item draws its own strip of living
   * grass right after its surface — already y-granular, so everything
   * (tall included) goes down in one pass.
   */
  drawRow(
    ctx: CanvasRenderingContext2D,
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
  ): void {
    this.ensurePaths();
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const st = this.tile(tx, ty, t, detail(tx, ty));
        const wind = windAt(tx + 0.5, ty + 0.5, this.tSec);
        const f = this.tileFrame(tx, ty, wts);
        this.gatherNear(tx, ty);
        this.buildRoots(st, f, s);
        for (const b of st.geom.under) this.buildBlade(b, st, wind, f, s);
        for (const b of st.geom.north) this.buildBlade(b, st, wind, f, s);
        for (const b of st.geom.south) this.buildBlade(b, st, wind, f, s);
        for (const fl of st.geom.flowers) this.buildFlower(fl, st, wind, f, s);
      }
    }
    this.flush(ctx);
  }
}
