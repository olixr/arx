import { Tile, hashCoords, valueNoise } from '@arx/shared';

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
 * - SHIMMER: a long-wavelength luminance swell relights blades from a
 *   graded ramp — broad swaths of light rolling through the meadow.
 *   THE FLOOR LAW: grass never renders darker than the turf beneath
 *   it; light lifts from the ground tone, never digs holes in it.
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
  /**
   * Luminance wave ~[-1, 1]: a much LONGER-wavelength signal than the
   * bend, so the shimmer arrives as broad rolling swaths of light —
   * never per-blade sparkle or screen-sized blotches.
   */
  l: number;
}

/**
 * Coherent vector wind: two travelling swells over a breathing gust
 * envelope, with the front's phase BENT by a slow cross-wave (fronts
 * curve like real weather) and a perpendicular meander (swaths snake
 * sideways as they pass). Pure function of position + time.
 */
export function windAtInto(out: WindSample, wx: number, wy: number, tSec: number): WindSample {
  const along = wx * WX + wy * WY;
  const across = -wx * WY + wy * WX;
  const frontBend = 0.9 * Math.sin(across * 0.055 + tSec * 0.13);
  const gust = 0.6 + 0.4 * Math.sin(along * 0.05 - tSec * 0.34 + frontBend);
  const sway =
    0.72 * Math.sin(along * 0.12 - tSec * 1.25 + 0.35 * frontBend) +
    0.28 * Math.sin(along * 0.2 - tSec * 1.9 + 0.7);
  const s = gust * (0.4 + sway);
  const meander = 0.3 * Math.sin(across * 0.14 - tSec * 0.7 + along * 0.05);
  // Light travels in far bigger swells than the bend: ~180- and ~90-tile
  // wavelengths, gently curved by the same front bend.
  const l =
    0.62 * Math.sin(along * 0.035 - tSec * 0.3 + 0.5 * frontBend) +
    0.38 * Math.sin(along * 0.07 - tSec * 0.75 + across * 0.02);
  out.bx = WX * s - WY * meander;
  out.by = WY * s + WX * meander;
  out.s = s;
  out.l = l;
  return out;
}

export function windAt(wx: number, wy: number, tSec: number): WindSample {
  return windAtInto({ bx: 0, by: 0, s: 0, l: 0 }, wx, wy, tSec);
}

/**
 * The grass system's own wind scratch: one sample is in flight at a
 * time (per-tile, consumed before the next tile samples), so every
 * in-class call reuses this record — thousands of allocations a frame
 * otherwise. External callers with overlapping lifetimes use windAt.
 */
const WIND_SCRATCH: WindSample = { bx: 0, by: 0, s: 0, l: 0 };

/**
 * Scalar wind for anything that only bends one way (the trees). Same
 * formula as windAt's `s` — inlined WITHOUT the meander/luminance
 * terms, because tree canopies sample this per cluster per frame and
 * the discarded sines were ~40% of the call.
 */
export function windScalarAt(wx: number, wy: number, tSec: number): number {
  const along = wx * WX + wy * WY;
  const across = -wx * WY + wy * WX;
  const frontBend = 0.9 * Math.sin(across * 0.055 + tSec * 0.13);
  const gust = 0.6 + 0.4 * Math.sin(along * 0.05 - tSec * 0.34 + frontBend);
  const sway =
    0.72 * Math.sin(along * 0.12 - tSec * 1.25 + 0.35 * frontBend) +
    0.28 * Math.sin(along * 0.2 - tSec * 1.9 + 0.7);
  return gust * (0.4 + sway);
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
  tileTone: number,
): Blade {
  const h = hashCoords(salt + i * 7, tx, ty);
  let bx: number;
  let by: number;
  if (clumpAt) {
    // Cluster members fan out of a shared crown.
    bx = clumpAt.x + (rand01(h, 2) - 0.5) * 0.34;
    by = clumpAt.y + (rand01(h, 12) - 0.5) * 0.2;
  } else {
    // Full-tile scatter, edges included: margins carve grout lines
    // along tile borders and the whole meadow starts reading as a grid.
    bx = tx + rand01(h, 2);
    by = ty + rand01(h, 12);
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
    // Small jitter: just enough to dither ramp thresholds — big values
    // shred the light swaths into per-blade sparkle.
    lumJit: (rand01(h, 21) - 0.5) * 0.18,
    // Tone follows the tile's patch, drifting ±1 — meadow-scale color
    // regions, not per-blade confetti.
    tone: Math.max(0, Math.min(4, tileTone + (h % 3) - 1)),
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
  snowMask = 0,
): GrassTileGeom {
  const geom: GrassTileGeom = { under: [], north: [], south: [], roots: [], flowers: [] };
  const tall = tileId === Tile.GrassTall;
  // THE BURIED MARGIN: a snow neighbor's baked contour overhangs up to
  // half a tile into this one — blades rooted under the blanket must
  // never sprout THROUGH it (green ticks poking out of white read as
  // z-fighting, not meadow). snowMask bits: 1=N 2=E 4=S 8=W.
  const buried =
    snowMask === 0
      ? null
      : (bx: number, by: number): boolean =>
          ((snowMask & 1) !== 0 && by < ty + 0.42) ||
          ((snowMask & 4) !== 0 && by > ty + 0.58) ||
          ((snowMask & 8) !== 0 && bx < tx + 0.42) ||
          ((snowMask & 2) !== 0 && bx > tx + 0.58);
  const cov =
    valueNoise(901, tx * 0.13, ty * 0.13) * 0.6 + valueNoise(902, tx * 0.045, ty * 0.045) * 0.4;
  // Tone patches at meadow scale — neighbouring tiles share a palette.
  const tileTone = Math.min(4, Math.floor(valueNoise(905, tx * 0.05, ty * 0.05) * 5));

  if (tall) {
    // A tall tile is a thicket: dense long slabs + a little underbrush.
    const h = hashCoords(151, tx, ty);
    const count = 9 + (h % 5);
    for (let i = 0; i < count; i++) {
      const b = makeBlade(tx, ty, 157, i, true, null, tileTone);
      if (buried?.(b.bx, b.by)) continue;
      (b.by < ty + 0.5 ? geom.north : geom.south).push(b);
    }
    for (let i = 0; i < 2; i++) {
      const b = makeBlade(tx, ty, 163, i, false, null, tileTone);
      if (!buried?.(b.bx, b.by)) geom.under.push(b);
    }
    return geom;
  }

  // Short grass, dealt as TUFTLETS: cluster seeds land anywhere in the
  // tile (edges included, so groups straddle borders), each growing 1-3
  // blades — and the budget jitters tile to tile on top of the meadow
  // coverage. Uniform per-tile counts are what make a lattice read.
  const clump = detailId === DETAIL_TUFT || cov > 0.74;
  if (!clump) {
    const hc = hashCoords(167, tx, ty);
    const budget = cov < 0.32 ? hc % 2 : cov < 0.56 ? 1 + (hc % 3) : 2 + (hc % 4);
    let placed = 0;
    let seed = 0;
    while (placed < budget) {
      const hs = hashCoords(211 + seed * 13, tx, ty);
      const size = Math.min(budget - placed, 1 + (hs % 3));
      const at = size > 1 ? { x: tx + rand01(hs, 3), y: ty + rand01(hs, 13) } : null;
      for (let i = 0; i < size; i++) {
        const b = makeBlade(tx, ty, 173 + seed * 29, i, false, at, tileTone);
        if (!buried?.(b.bx, b.by)) geom.under.push(b);
      }
      placed += size;
      seed++;
    }
  } else {
    const h = hashCoords(179, tx, ty);
    const cx = tx + 0.1 + rand01(h, 3) * 0.8;
    const cy = ty + 0.1 + rand01(h, 13) * 0.8;
    if (!buried?.(cx, cy)) {
      geom.roots.push({ x: cx, y: cy, w: 0.16 + rand01(h, 7) * 0.06 });
      const members = 5 + (h % 3);
      for (let i = 0; i < members; i++) {
        const b = makeBlade(tx, ty, 181, i, false, { x: cx, y: cy }, tileTone);
        b.h += 0.08; // clumps stand proud of the lawn
        geom.under.push(b);
      }
    }
    // A satellite strand beside the clump.
    const sat = makeBlade(tx, ty, 191, 0, false, null, tileTone);
    if (!buried?.(sat.bx, sat.by)) geom.under.push(sat);
  }

  // Flowers grow as PATCHES: a seed point lands anywhere (edges too),
  // and blooms scatter in a loose ring around it — drifts that straddle
  // tile borders, never one-bloom-per-cell lattices. Meadow noise adds
  // the occasional lone stray.
  const meadow = valueNoise(903, tx * 0.06, ty * 0.06);
  const flowerCount =
    detailId === DETAIL_FLOWERS
      ? 3 + (hashCoords(193, tx, ty) % 3)
      : meadow > 0.78 && cov > 0.4
        ? hashCoords(194, tx, ty) % 2
        : 0;
  if (flowerCount > 0) {
    const hp = hashCoords(197, tx, ty);
    const pcx = tx + rand01(hp, 3);
    const pcy = ty + rand01(hp, 13);
    for (let i = 0; i < flowerCount; i++) {
      const h = hashCoords(199 + i * 5, tx, ty);
      const ang = rand01(h, 3) * 6.283;
      const rad = 0.08 + rand01(h, 13) * 0.3;
      if (buried?.(pcx + Math.cos(ang) * rad, pcy + Math.sin(ang) * rad * 0.8)) continue;
      geom.flowers.push({
        bx: pcx + Math.cos(ang) * rad,
        by: pcy + Math.sin(ang) * rad * 0.8,
        h: 0.2 + rand01(h, 6) * 0.12,
        size: 0.05 + rand01(h, 9) * 0.025,
        pal: h % 3,
        phase: rand01(h, 17),
      });
    }
  }
  return geom;
}

// ------------------------------------------------------------- palette

/**
 * Base tones, deep → light. THE FLOOR LAW: the DARKEST possible blade
 * is still a visible step lighter than the LIGHTEST ground green
 * (GRASS_TONES peak at #608e45). The ramp only ever LIFTS from these —
 * there is no downward shade mix at all, because a blade that fades
 * into the turf color reads as transparent and the effect is lost.
 */
const TONE_BASE = ['#6f9e4e', '#74a452', '#79a956', '#7eae5a', '#83b35e'];
const LIT_TARGET = '#d9e37f'; // sun catching a bent blade
const ROOT_COLOR = '#699a49';
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
    // Lift-only ramp: the trough IS the base tone (already above the
    // turf), and the swell adds a modest glow on top. Never downward.
    const t = i / (LIGHTS - 1);
    return mixHex(tone, LIT_TARGET, 0.22 * t);
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
  TONE_BASE[0]!, // stems: the deepest blade green — never below the turf
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

/** Calm-cache rebake cadence, ms (~15Hz wind sampling — the same
 *  rate the tree-sprite cadence law already proved invisible). */
const UNDER_CACHE_MS = 66;
/** Padding (tiles) baked past the visible bounds so panning doesn't
 *  force a rebake between cadence beats. */
const UNDER_PAD = 2;
/** A disturber's blade-influence box half-extent, tiles (matches the
 *  disturberIndex footprint). */
const DISTURB_REACH = 2.3;
/** Flower buckets in paint order — hoisted (flush runs per frame). */
const FLOWER_BUCKETS = [B_STEM, B_PETAL0, B_PETAL0 + 1, B_PETAL0 + 2, B_CORE] as const;

export class GrassSystem {
  private readonly tiles = new Map<number, GrassTileState>();
  /** Position → live state, for waking tiles bodies move through. */
  private readonly posIndex = new Map<number, GrassTileState>();

  /**
   * THE CROSSING: every tuft and disturbance is position-keyed on the
   * CURRENT plane — a plane switch drops the meadow whole, or another
   * world's grass would sway here.
   */
  dropWorld(): void {
    this.tiles.clear();
    this.posIndex.clear();
    this.disturberIndex.clear();
    this.lastPos.clear();
    this.live.length = 0;
  }
  private readonly lastPos = new Map<number | 'own', { x: number; y: number; tx: number; ty: number }>();
  private live: LiveDisturber[] = [];
  private tSec = 0;
  private nowMs = 0;
  private paths: Path2D[] | null = null;
  /**
   * GRASS CASTS. Every blade tall enough to read appends one sheared
   * ground quad here during the under pass — base at the root, tip
   * thrown (kx, ky) px per px of height past the wind-bent crown, so
   * shadows sway with the SAME gusts as their blades. The renderer
   * fills the whole meadow's shadow in ONE path into the shared
   * shadow layer (merge law: overlaps never stack), where props'
   * shadows and the interior punch-out already live.
   */
  private shadowPath: Path2D | null = null;
  private shKx = 0;
  private shKy = 0;
  private shOn = false;
  private touched: number[] = [];
  private touchedFlag = new Uint8Array(BUCKETS);
  /** Disturbers near the tile currently being built. */
  private near: LiveDisturber[] = [];
  /**
   * THE CALM CACHE. Re-tessellating every visible blade every frame
   * cost ~2ms steady at 0.85× zoom (and its allocation churn drew GC
   * pauses of up to 15ms into this very pass). But a calm meadow only
   * MOVES at wind rate — so the under-layer bakes all undisturbed
   * tiles into a persistent set of bucket paths at UNDER_CACHE_MS
   * cadence (~15Hz wind sampling, the tree-cadence law) and each frame
   * just re-FILLS them translated by the camera delta. Only tiles a
   * body (or its predicted path — a swept box over the cache window)
   * can reach, plus fresh wakes, are excluded and rebuilt live per
   * frame. A disturber that escapes its predicted box forces an
   * immediate rebake, so displacement NEVER lags a frame.
   */
  private underCache: {
    paths: Path2D[];
    flags: Uint8Array;
    shadow: Path2D | null;
    /** Screen position of world (0,0) at bake — fills translate by the delta. */
    ox: number;
    oy: number;
    scale: number;
    bakedAtMs: number;
    /** Padded tile bounds the bake covered. */
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
    /** Packed keys of tiles EXCLUDED from the bake (drawn live). */
    live: Set<number>;
    shKx: number;
    shKy: number;
    shOn: boolean;
  } | null = null;
  /** This frame's cached-fill translation (drawUnder → flushShadows). */
  private cacheDx = 0;
  private cacheDy = 0;
  /**
   * Tile → disturbers-in-range, rebuilt once per frame from each
   * disturber's footprint (~5×5 tiles). Inverts the old per-tile scan
   * over every live body: thousands of visible tiles × N disturbers of
   * box tests became one map lookup per tile. Same coverage box, so
   * blade output is identical.
   */
  private readonly disturberIndex = new Map<number, { epoch: number; list: LiveDisturber[] }>();
  /** Frame stamp for disturberIndex entries — readers must match it. */
  private indexEpoch = 0;
  /** Recycled LiveDisturber records backing `live` (see beginFrame). */
  private readonly livePool: LiveDisturber[] = [];
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
    // POOLED live records: the roster is rebuilt every frame, so the
    // record objects (and the lastPos entries) are recycled in place —
    // the old map()+spread minted ~80 objects a frame here.
    this.live.length = disturbers.length;
    for (let i = 0; i < disturbers.length; i++) {
      const d = disturbers[i]!;
      let ld = this.livePool[i];
      if (!ld) {
        ld = { id: 0, x: 0, y: 0, r: 0, vx: 0, vy: 0, speed: 0 };
        this.livePool[i] = ld;
      }
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
      if (prev) {
        prev.x = d.x;
        prev.y = d.y;
        prev.tx = tx;
        prev.ty = ty;
      } else {
        this.lastPos.set(d.id, { x: d.x, y: d.y, tx, ty });
      }
      ld.id = d.id;
      ld.x = d.x;
      ld.y = d.y;
      ld.r = d.r;
      ld.vx = Math.min(8, Math.max(-8, vx));
      ld.vy = Math.min(8, Math.max(-8, vy));
      ld.speed = speed;
      this.live[i] = ld;
    }
    // Forget disturbers that vanished (deaths, despawns).
    if (this.lastPos.size > disturbers.length + 8) {
      const ids = new Set(disturbers.map((d) => d.id));
      for (const key of this.lastPos.keys()) if (!ids.has(key)) this.lastPos.delete(key);
    }
    // Rebuild the tile → nearby-disturbers index for this frame.
    // EPOCH-STAMPED entries recycle their list arrays across frames
    // (the old clear()+fresh-[d] pattern allocated ~1k arrays a frame
    // with a town's worth of bodies); readers must check the epoch.
    const epoch = ++this.indexEpoch;
    for (const d of this.live) {
      const tx0 = Math.floor(d.x - 2.3);
      const tx1 = Math.floor(d.x + 2.3);
      const ty0 = Math.floor(d.y - 2.3);
      const ty1 = Math.floor(d.y + 2.3);
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const key = (ty + 8192) * 16384 + (tx + 8192);
          let e = this.disturberIndex.get(key);
          if (!e) {
            e = { epoch, list: [] };
            this.disturberIndex.set(key, e);
          } else if (e.epoch !== epoch) {
            e.epoch = epoch;
            e.list.length = 0;
          }
          e.list.push(d);
        }
      }
    }
    // Stale keys (tiles bodies left) accumulate — prune occasionally.
    if (this.disturberIndex.size > 4096) {
      for (const [key, e] of this.disturberIndex) {
        if (e.epoch !== epoch) this.disturberIndex.delete(key);
      }
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

  /** Arm (or disarm) this frame's blade shadow projection. */
  setShadow(kx: number, ky: number, on: boolean): void {
    this.shKx = kx;
    this.shKy = ky;
    this.shOn = on;
    if (!on) this.shadowPath = null;
  }

  /**
   * Fill the frame's accumulated blade shadows — called by the
   * renderer inside the ground-shadow prepass so grass shade lands on
   * the same batched layer as every other caster.
   */
  flushShadows(ctx: CanvasRenderingContext2D, fill: string, alpha: number): void {
    const cached = this.underCache?.shadow ?? null;
    if (!this.shadowPath && !cached) return;
    ctx.fillStyle = fill;
    ctx.globalAlpha = alpha;
    // The calm meadow's casts ride the cache, translated exactly like
    // its blades (cacheDx/Dy were computed by this frame's drawUnder).
    if (cached) {
      const moved = this.cacheDx !== 0 || this.cacheDy !== 0;
      if (moved) {
        ctx.save();
        ctx.translate(this.cacheDx, this.cacheDy);
      }
      ctx.fill(cached);
      if (moved) ctx.restore();
    }
    if (this.shadowPath) ctx.fill(this.shadowPath);
    ctx.globalAlpha = 1;
    this.shadowPath = null;
  }

  private tile(
    tx: number,
    ty: number,
    tileId: number,
    detailId: number,
    ground?: Sampler,
  ): GrassTileState {
    // Numeric key — string building here showed up in profiles.
    const key = (((ty + 8192) * 16384 + (tx + 8192)) * 16 + tileId) * 8 + detailId;
    let st = this.tiles.get(key);
    if (!st) {
      // Snow adjacency culls blades under the blanket's baked overhang
      // (see generateGrassTile). Static per world — cached with the
      // geometry.
      const snowMask = ground
        ? (ground(tx, ty - 1) === Tile.Snow ? 1 : 0) |
          (ground(tx + 1, ty) === Tile.Snow ? 2 : 0) |
          (ground(tx, ty + 1) === Tile.Snow ? 4 : 0) |
          (ground(tx - 1, ty) === Tile.Snow ? 8 : 0)
        : 0;
      st = { geom: generateGrassTile(tx, ty, tileId, detailId, snowMask), wakeAt: 0, tx, ty };
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

  private static readonly NO_DISTURBERS: LiveDisturber[] = [];

  /** Point `near` at this tile's precomputed disturber list. */
  private gatherNear(tx: number, ty: number): void {
    const e = this.disturberIndex.get((ty + 8192) * 16384 + (tx + 8192));
    // Entries persist across frames (recycled lists) — a stale epoch
    // means "no disturbers here THIS frame".
    this.near = e !== undefined && e.epoch === this.indexEpoch ? e.list : GrassSystem.NO_DISTURBERS;
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
  private buildBlade(
    b: Blade,
    st: GrassTileState,
    wind: WindSample,
    f: TileFrame,
    s: number,
    cast = false,
    drawBlade = true,
  ): void {
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

    const px = f.x0 + (b.bx - st.tx) * f.sx;
    const py = f.y0 + (b.by - st.ty) * f.sy;
    const hpx = b.h * hMul * s;
    if (hpx < 1.5) return; // sub-pixel blades are pure cost
    const w0 = Math.max(1.1, b.w * s);
    const w1 = w0 * 0.55;
    const tipX = px + tipDx * s;
    const tipY = py - hpx;

    // The blade's cast: base rooted, tip thrown along the light ray
    // FROM the wind-bent crown — the shadow gusts with the meadow.
    // Perf law: HALF the blades cast (bin parity), drawn a touch
    // wider — half the path scan for the same read; a full-herd cast
    // measured 31fps on a dense meadow.
    // PATH2D CLOSE LAW: never call closePath() on a shared accumulating
    // Path2D — Chromium's closePath walks the whole path (O(n)), so one
    // close per quad goes quadratic across the meadow (measured 115ms
    // for 8k quads vs 0.6ms without). fill() closes every subpath
    // implicitly, so for fill-only geometry the calls were pure cost.
    if (cast && this.shOn && hpx >= 8 && (b.bin & 1) === 0) {
      const sp = (this.shadowPath ??= new Path2D());
      const sx = tipX + this.shKx * hpx;
      const sy = py + this.shKy * hpx;
      const ws = w0 * 1.25;
      sp.moveTo(px - ws, py);
      sp.lineTo(px + ws, py);
      sp.lineTo(sx + w1 * 1.25, sy);
      sp.lineTo(sx - w1 * 1.25, sy);
    }
    if (!drawBlade) return;

    // Shimmer: the LONG luminance swell (not the busy bend signal)
    // relights the blade — broad swaths of light rolling through.
    const lum = (wind.l + b.lumJit + 1) / 2;
    const level = lum <= 0 ? 0 : lum >= 1 ? LIGHTS - 1 : Math.floor(lum * LIGHTS);
    const bucket = b.tone * LIGHTS + level;
    const path = (this.paths as Path2D[])[bucket]!;
    this.mark(bucket);

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
    } else {
      path.moveTo(px - w0, py);
      path.lineTo(px + w0, py);
      path.lineTo(tipX + w1, tipY);
      path.lineTo(tipX - w1, tipY);
    }
  }

  private buildFlower(
    f: Flower,
    st: GrassTileState,
    wind: WindSample,
    fr: TileFrame,
    s: number,
    cast = false,
  ): void {
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

    // A flower's cast: thin stem line and a chip where the head lands.
    if (cast && this.shOn && hpx >= 6) {
      const sp = (this.shadowPath ??= new Path2D());
      const ssw = Math.max(0.8, 0.014 * s);
      const sx = hx + this.shKx * hpx;
      const sy = py + this.shKy * hpx;
      sp.moveTo(px - ssw, py);
      sp.lineTo(px + ssw, py);
      sp.lineTo(sx + ssw, sy);
      sp.lineTo(sx - ssw, sy);
      const spr = f.size * s;
      sp.rect(sx - spr, sy - spr * 0.55, spr * 2, spr * 1.1);
    }

    // Stem: a thin slab leaning to the bloom.
    const stem = paths[B_STEM]!;
    this.mark(B_STEM);
    const sw = Math.max(0.8, 0.014 * s);
    stem.moveTo(px - sw, py);
    stem.lineTo(px + sw, py);
    stem.lineTo(hx + sw * 0.7, hy);
    stem.lineTo(hx - sw * 0.7, hy);

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
    }
  }

  private flush(ctx: CanvasRenderingContext2D): void {
    this.fillBuckets(ctx, this.paths as Path2D[], this.touchedFlag);
  }

  /** Painter's order for one bucket set: roots under blades under flowers. */
  private fillBuckets(ctx: CanvasRenderingContext2D, paths: Path2D[], flags: Uint8Array): void {
    if (flags[B_ROOT]) {
      ctx.fillStyle = BUCKET_FILLS[B_ROOT]!;
      ctx.fill(paths[B_ROOT]!);
    }
    for (let i = 0; i < B_ROOT; i++) {
      if (!flags[i]) continue;
      ctx.fillStyle = BUCKET_FILLS[i]!;
      ctx.fill(paths[i]!);
    }
    for (const i of FLOWER_BUCKETS) {
      if (!flags[i]) continue;
      ctx.fillStyle = BUCKET_FILLS[i]!;
      ctx.fill(paths[i]!);
    }
  }

  /** Build one tile's under-layer content into the CURRENT containers
   *  (roots, under blades, tall-thicket casts, flowers deferred). */
  private buildUnderTile(
    st: GrassTileState,
    t: number,
    tx: number,
    ty: number,
    wts: WTS,
    s: number,
    flowerTiles: GrassTileState[],
  ): void {
    const wind = windAtInto(WIND_SCRATCH, tx + 0.5, ty + 0.5, this.tSec);
    const f = this.tileFrame(tx, ty, wts);
    this.gatherNear(tx, ty);
    this.buildRoots(st, f, s);
    for (const b of st.geom.under) this.buildBlade(b, st, wind, f, s, true);
    // Tall thickets y-sort their mass AFTER the shadow layer has
    // composited, so their casts are gathered here, shadow-only —
    // the thicket's shade lands with everyone else's.
    if (t === Tile.GrassTall) {
      for (const b of st.geom.north) this.buildBlade(b, st, wind, f, s, true, false);
      for (const b of st.geom.south) this.buildBlade(b, st, wind, f, s, true, false);
    }
    if (st.geom.flowers.length > 0) flowerTiles.push(st);
  }

  /** Flowers are their own layer: heads always read above the lawn. */
  private buildFlowerTiles(flowerTiles: GrassTileState[], wts: WTS, s: number): void {
    for (const st of flowerTiles) {
      const wind = windAtInto(WIND_SCRATCH, st.tx + 0.5, st.ty + 0.5, this.tSec);
      const f = this.tileFrame(st.tx, st.ty, wts);
      this.gatherNear(st.tx, st.ty);
      for (const fl of st.geom.flowers) this.buildFlower(fl, st, wind, f, s, true);
    }
  }

  /** Rebake the calm cache (see underCache). */
  private bakeUnder(
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
    ox: number,
    oy: number,
  ): void {
    const minTx = bounds.minTx - UNDER_PAD;
    const maxTx = bounds.maxTx + UNDER_PAD;
    const minTy = bounds.minTy - UNDER_PAD;
    const maxTy = bounds.maxTy + UNDER_PAD;
    // Exclusion set: every tile a disturber can influence during this
    // cache window — its reach box SWEPT along its predicted motion.
    const live = new Set<number>();
    const horizon = UNDER_CACHE_MS / 1000 + 0.02;
    for (const d of this.live) {
      const x1 = d.x + d.vx * horizon;
      const y1 = d.y + d.vy * horizon;
      const bx0 = Math.floor(Math.min(d.x, x1) - DISTURB_REACH);
      const bx1 = Math.floor(Math.max(d.x, x1) + DISTURB_REACH);
      const by0 = Math.floor(Math.min(d.y, y1) - DISTURB_REACH);
      const by1 = Math.floor(Math.max(d.y, y1) + DISTURB_REACH);
      for (let ty = by0; ty <= by1; ty++) {
        for (let tx = bx0; tx <= bx1; tx++) {
          live.add((ty + 8192) * 16384 + (tx + 8192));
        }
      }
    }
    // Swap the bucket containers for the bake, restore after — the
    // build helpers all write through `this`.
    const prevPaths = this.paths;
    const prevFlags = this.touchedFlag;
    const prevTouched = this.touched;
    const prevShadow = this.shadowPath;
    const paths = new Array<Path2D>(BUCKETS);
    for (let i = 0; i < BUCKETS; i++) paths[i] = new Path2D();
    this.paths = paths;
    this.touchedFlag = new Uint8Array(BUCKETS);
    this.touched = [];
    this.shadowPath = null;
    const flowerTiles: GrassTileState[] = [];
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const key = (ty + 8192) * 16384 + (tx + 8192);
        const st = this.tile(tx, ty, t, detail(tx, ty), ground);
        // Fresh wakes spring back at frame rate — keep them live too.
        if (st.wakeAt > 0 && this.nowMs - st.wakeAt < 800) {
          live.add(key);
          continue;
        }
        if (live.has(key)) continue;
        this.buildUnderTile(st, t, tx, ty, wts, s, flowerTiles);
      }
    }
    this.buildFlowerTiles(flowerTiles, wts, s);
    this.underCache = {
      paths,
      flags: this.touchedFlag,
      shadow: this.shadowPath,
      ox,
      oy,
      scale: s,
      bakedAtMs: this.nowMs,
      minTx,
      maxTx,
      minTy,
      maxTy,
      live,
      shKx: this.shKx,
      shKy: this.shKy,
      shOn: this.shOn,
    };
    this.paths = prevPaths;
    this.touchedFlag = prevFlags;
    this.touched = prevTouched;
    this.shadowPath = prevShadow;
  }

  /**
   * The under-layer: every short blade, clump, and flower in bounds —
   * drawn beneath entities. Tall thickets contribute only their sparse
   * underbrush here; their mass y-sorts via collectTall. Calm tiles
   * come from the cadence-baked cache (one translated fill per bucket);
   * only disturbed/waking tiles rebuild per frame.
   */
  drawUnder(
    ctx: CanvasRenderingContext2D,
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
  ): void {
    const o = wts(0, 0);
    let c = this.underCache;
    let needBake =
      !c ||
      c.scale !== s ||
      this.nowMs - c.bakedAtMs >= UNDER_CACHE_MS ||
      Math.abs(c.shKx - this.shKx) > 0.004 ||
      Math.abs(c.shKy - this.shKy) > 0.004 ||
      c.shOn !== this.shOn ||
      bounds.minTx < c.minTx ||
      bounds.maxTx > c.maxTx ||
      bounds.minTy < c.minTy ||
      bounds.maxTy > c.maxTy;
    // Escape hatch: a disturber outside every predicted box (teleport,
    // fresh projectile) must not displace BAKED blades — rebake now,
    // not at the next beat, so displacement never lags.
    if (!needBake && c) {
      outer: for (const d of this.live) {
        const tx0 = Math.floor(d.x - DISTURB_REACH);
        const tx1 = Math.floor(d.x + DISTURB_REACH);
        const ty0 = Math.floor(d.y - DISTURB_REACH);
        const ty1 = Math.floor(d.y + DISTURB_REACH);
        for (let ty = ty0; ty <= ty1; ty++) {
          for (let tx = tx0; tx <= tx1; tx++) {
            if (tx < bounds.minTx || tx > bounds.maxTx || ty < bounds.minTy || ty > bounds.maxTy) continue;
            if (!c.live.has((ty + 8192) * 16384 + (tx + 8192))) {
              const t = ground(tx, ty);
              if (t === Tile.Grass || t === Tile.GrassTall) {
                needBake = true;
                break outer;
              }
            }
          }
        }
      }
    }
    if (needBake) {
      this.bakeUnder(ground, detail, bounds, wts, s, o.x, o.y);
      c = this.underCache;
    }
    const cache = c!;
    // 1. The calm meadow: cached buckets, translated by the camera
    // delta (both origins are pixel-snapped, so the delta is integer).
    this.cacheDx = o.x - cache.ox;
    this.cacheDy = o.y - cache.oy;
    const moved = this.cacheDx !== 0 || this.cacheDy !== 0;
    if (moved) {
      ctx.save();
      ctx.translate(this.cacheDx, this.cacheDy);
    }
    this.fillBuckets(ctx, cache.paths, cache.flags);
    if (moved) ctx.restore();
    // 2. The living edge: excluded tiles rebuild at frame rate.
    this.ensurePaths();
    const flowerTiles: GrassTileState[] = [];
    for (const key of cache.live) {
      const ty = Math.floor(key / 16384) - 8192;
      const tx = (key % 16384) - 8192;
      if (tx < bounds.minTx || tx > bounds.maxTx || ty < bounds.minTy || ty > bounds.maxTy) continue;
      const t = ground(tx, ty);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      const st = this.tile(tx, ty, t, detail(tx, ty), ground);
      this.buildUnderTile(st, t, tx, ty, wts, s, flowerTiles);
    }
    this.buildFlowerTiles(flowerTiles, wts, s);
    this.flush(ctx);
  }

  /**
   * Tall grass as y-sorted items: each thicket splits at its midline
   * into two depth bands, so a body standing inside it is wrapped —
   * blades behind it draw first, blades in front draw over.
   */
  collectTall(
    items: Array<{ sortY: number; draw?: () => void }>,
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
        (row ??= []).push(this.tile(tx, ty, Tile.GrassTall, detail(tx, ty), ground));
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
              const wind = windAtInto(WIND_SCRATCH, st.tx + 0.5, st.ty + 0.5, this.tSec);
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
        const st = this.tile(tx, ty, t, detail(tx, ty), ground);
        const wind = windAtInto(WIND_SCRATCH, tx + 0.5, ty + 0.5, this.tSec);
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
