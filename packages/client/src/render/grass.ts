import { Tile, hashCoords, valueNoise, Detail } from '@arx/shared';
import type { TallBand } from './grassGpu.js';

/**
 * The bespoke grass system. The ground IS the game's biggest canvas, and
 * this module is what makes it read as a living meadow instead of blocks
 * of color. Design laws:
 *
 * - BLOCKY: blades are tapered flat-top slabs (chisel-cut quads), never
 *   soft strokes — the same brutalist language as shapes.ts. Tall blades
 *   bend as two rigid segments, like a slab cracking at a knuckle.
 * - THE COAT: the meadow is a CARPET, not a scatter. Two registers do
 *   the work — a dense low NAP of squat near-turf chips that coats the
 *   ground continuously (density riding the SAME lush field 907 the
 *   baked turf stubble uses, so live and baked thicken in the same
 *   reaches — one landform), and sparser accent STANDS above it that
 *   read as individual grass. No grass tile is ever bald; variation is
 *   density waves, never holes of flat paint.
 * - VARIED: a coverage noise field deals each tile a hand — thin nap,
 *   lone strands, medium stands, or dense clumps rooted in a shared
 *   crown chip. Meadows breathe; nothing tiles. Seed-head stalks gather
 *   in prairie drifts on their own slow field.
 * - ONE WIND: every blade, flower, and tree samples the same vector
 *   wind field. Gust fronts are CURVED (the front's phase is bent by a
 *   slow cross-wave) and a perpendicular meander makes swaths snake
 *   across the field — fluid motion without a fluid sim.
 * - SHIMMER: a long-wavelength luminance swell relights blades from a
 *   graded ramp — broad swaths of light rolling through the meadow.
 *   THE FLOOR LAW (coat amendment): ACCENT blades never render darker
 *   than the turf beneath them — a lone dark tick reads as a hole. The
 *   nap's deepest row may sit a hair under the turf, but ONLY inside a
 *   dense coat where it reads as carpet weave, never as a lone mark.
 * - INHABITED: tall grass y-sorts around entities (you walk THROUGH
 *   it), bodies part and flatten nearby blades, and a passage leaves a
 *   springy rustle wobble + leaf specks behind.
 * - CHEAP: per-tile blade geometry is generated once and cached, and
 *   THE CALM CANVAS bakes every undisturbed tile into an offscreen
 *   canvas at wind cadence — a whole meadow of quads costs ONE
 *   drawImage per frame, so the coat's density is effectively free.
 *   Only tiles a body can reach rebuild live at frame rate.
 */

// ------------------------------------------------------------------ wind

/** Wind direction — matches the treeline so the whole scene agrees.
 *  Exported as the single source the GPU grass shares (grassGpu.ts). */
export const WX = 0.94;
export const WY = 0.34;

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

/** A wild grain stalk: thin stem streaming in the wind, gold ear at the tip. */
export interface SeedHead {
  bx: number;
  by: number;
  h: number; // stalk height in tiles
  size: number; // grain chip half-extent in tiles
  lean: number; // static windswept lean
  phase: number;
  bin: number; // quantized phase → flutter-table index
}

/**
 * G-ELEVATED — THE BLOOM RIDES THE SHELF. One (row, level) group of raised
 * ornaments: a contiguous slice of the flowers array (`fStart`, `fCount`) AND
 * of the seeds array (`sStart`, `sCount`), lifted onto its shelf (`elev` =
 * level·ELEV_H) and y-sorted at `sortY`. `minBy/maxBy` and the record maxima
 * (`maxH`, `maxSize`) are pre-swept here so the GPU layer sizes each band's
 * atlas slot without re-touching the records. One band per group is rendered
 * (flowers + seeds share the draw; the shader's `kind` selects the head).
 */
export interface ElevOrnGroup {
  fStart: number;
  fCount: number;
  sStart: number;
  sCount: number;
  sortY: number;
  elev: number;
  minBy: number;
  maxBy: number;
  maxH: number;
  maxSize: number;
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
  seeds: SeedHead[];
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
/**
 * THE FOREST FLOOR (worldgen forest.ts): the two floor details fold to
 * grass codes at the cache door — the numeric tile key packs the code
 * into three bits, and only these four details ever change the coat.
 */
const DETAIL_LITTER = 3;
const DETAIL_BRACKEN = 4;

/** Fold a world Detail id to the coat's own code (0 = no effect). */
export function grassDetailCode(detailId: number): number {
  if (detailId === Detail.Flowers) return DETAIL_FLOWERS;
  if (detailId === Detail.Tuft) return DETAIL_TUFT;
  if (detailId === Detail.LeafLitter) return DETAIL_LITTER;
  if (detailId === Detail.Bracken) return DETAIL_BRACKEN;
  return 0;
}

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
  nap = false,
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
  const height = nap
    ? 0.09 + rand01(h, 5) * 0.09
    : tall
      ? 0.36 + rand01(h, 5) * 0.28
      : 0.15 + rand01(h, 5) * 0.19;
  const phase = rand01(h, 18);
  return {
    bx,
    by,
    h: height,
    // Chunky slabs, not strokes: a blade is a visible block of green.
    // Nap chips run squat and a touch wider — carpet weave, not ticks.
    w: nap
      ? 0.046 + rand01(h, 8) * 0.026
      : 0.034 + rand01(h, 8) * 0.028 + (tall ? 0.012 : 0),
    lean: (rand01(h, 15) - 0.42) * (nap ? 0.05 : 0.1),
    phase,
    bin: Math.min(31, Math.floor(phase * 32)),
    // Small jitter: just enough to dither ramp thresholds — big values
    // shred the light swaths into per-blade sparkle.
    lumJit: (rand01(h, 21) - 0.5) * 0.18,
    // Tone follows the tile's patch, drifting ±1 — meadow-scale color
    // regions, not per-blade confetti. Nap deals its own three rows.
    tone: nap ? NAP_ROW0 + (h % 3) : Math.max(0, Math.min(4, tileTone + (h % 3) - 1)),
    seg2: tall && height > 0.42,
  };
}

/**
 * Deterministic geometry for one grass tile. THE COAT lays a dense low
 * nap on every tile (density riding the lush field), then coverage
 * noise deals the accent hand above it: strands / stand / clump.
 * Detail.Tuft forces a clump, Detail.Flowers plants a bloom patch, a
 * low-frequency meadow noise scatters lone flowers so they gather into
 * natural drifts, and a prairie field raises seed-head stalks in
 * golden reaches.
 */
/**
 * GPU MEADOW — STANDING GRASS THROUGHOUT (grass-elevate pass). The threshold
 * of the slow `stand` noise field (941) above which a NORMAL grass tile may
 * raise a scattered standing tuft. Lower = more of the field carries upright
 * grass; the drift stays clumpy (gaps between reaches) so nothing lattices.
 * Only consulted in `gpu` mode (the meadow's live mode); the `gpu=false`
 * generator default grows none of these — kept only so the data tests can
 * pin the plain geometry.
 */
export const GPU_STAND_THRESHOLD = 0.42;

export function generateGrassTile(
  tx: number,
  ty: number,
  tileId: number,
  detailId: number,
  snowMask = 0,
  /**
   * GPU-meadow geometry (grass-elevate pass): when true, normal grass tiles
   * ALSO scatter taller standing blades (north/south, so they interleave with
   * bodies) on the organic `stand` field — upright grass present throughout
   * the meadow, densest on true GrassTall. The renderer always passes true
   * (the GPU meadow is the only grass path); the `false` default is kept for
   * the generator's data tests.
   */
  gpu = false,
): GrassTileGeom {
  const geom: GrassTileGeom = {
    under: [],
    north: [],
    south: [],
    roots: [],
    flowers: [],
    seeds: [],
  };
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

  // THE LUSH FIELD: the same 907 landform the baked turf stubble rides —
  // the live nap and the baked flecks thicken in the SAME reaches, so
  // near and far zoom read one meadow.
  const lush = valueNoise(907, tx * 0.04, ty * 0.04);

  if (tall) {
    // A tall tile is a thicket: dense long slabs + nap underbrush so
    // the thicket floor never shows bald turf between the stems.
    const h = hashCoords(151, tx, ty);
    const count = 13 + (h % 5);
    for (let i = 0; i < count; i++) {
      const b = makeBlade(tx, ty, 157, i, true, null, tileTone);
      if (buried?.(b.bx, b.by)) continue;
      (b.by < ty + 0.5 ? geom.north : geom.south).push(b);
    }
    for (let i = 0; i < 4; i++) {
      const b = makeBlade(tx, ty, 163, i, false, null, tileTone, true);
      if (!buried?.(b.bx, b.by)) geom.under.push(b);
    }
    return geom;
  }

  // THE COAT: every short-grass tile wears a nap of squat near-turf
  // chips — the carpet that makes the ground read COATED instead of
  // dotted. Count rides the lush field (thin worn reaches, thick lush
  // ones) but never drops to zero: bald tiles are what made the old
  // meadow read as nodules on flat paint.
  const hn = hashCoords(661, tx, ty);
  // Under a crown the coat wears thin: leaf litter starves the nap
  // to its floor, so the baked litter reads through and the wood's
  // floor is not the meadow's. Bracken keeps the coat — the fronds
  // are painted into the bake and stand over ordinary turf.
  const litter = detailId === DETAIL_LITTER;
  const napN = litter ? 2 : Math.max(2, Math.round((3 + (hn % 3)) * (0.5 + 0.9 * lush)));
  for (let i = 0; i < napN; i++) {
    const b = makeBlade(tx, ty, 673 + i * 17, i, false, null, tileTone, true);
    // Floor-law gate: the shade row only lives inside a dense coat.
    if (napN < 4 && b.tone === NAP_ROW0) b.tone = NAP_ROW0 + 1;
    if (!buried?.(b.bx, b.by)) geom.under.push(b);
  }

  // Accent stands above the nap, dealt as TUFTLETS: cluster seeds land
  // anywhere in the tile (edges included, so groups straddle borders),
  // each growing 1-3 blades — and the budget jitters tile to tile on
  // top of the meadow coverage. Uniform per-tile counts are what make
  // a lattice read.
  const clump = detailId === DETAIL_TUFT || (!litter && cov > 0.74);
  {
    const hc = hashCoords(167, tx, ty);
    const budget = litter
      ? hc % 2
      : detailId === DETAIL_BRACKEN
        ? 1
        : cov < 0.32 ? 1 + (hc % 2) : cov < 0.56 ? 2 + (hc % 2) : 3 + (hc % 3);
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
  }
  if (clump) {
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

  // STANDING GRASS THROUGHOUT (GPU meadow, grass-elevate pass). The tall
  // standing mass used to live ONLY on dedicated GrassTall tiles (a minority),
  // so upright grass was sparse. Here a slow, clumpy `stand` field raises a few
  // taller standing blades on a tunable fraction of NORMAL grass tiles too, so
  // standing grass reads across the whole meadow — while true GrassTall tiles
  // (handled above, 13-17 stems) stay by far the densest thickets. The tufts
  // fan from a shared seed point (organic, not one-per-cell), split at the
  // tile midline into north/south so the G1 band machinery interleaves them
  // with entities. GPU-only: the canvas default never grows these.
  // THE FOREST FLOOR steps the standing grass aside: under leaf litter
  // the floor is bare by law, and on a bracken tile the fronds ARE the
  // standing element — waist-high blades over either buried the bake.
  const floorDetail = litter || detailId === DETAIL_BRACKEN;
  if (gpu && !tall && !floorDetail) {
    const stand =
      valueNoise(941, tx * 0.05, ty * 0.05) * 0.62 + valueNoise(942, tx * 0.11, ty * 0.11) * 0.38;
    if (stand > GPU_STAND_THRESHOLD) {
      const hs = hashCoords(947, tx, ty);
      // Denser inside the heart of a drift, thinning to its edge — a soft,
      // clumpy presence, never every tile.
      const drift = (stand - GPU_STAND_THRESHOLD) / (1 - GPU_STAND_THRESHOLD);
      const gate = 34 + Math.floor(drift * 52); // 34..86% of drift tiles
      if (hs % 100 < gate) {
        const n = 1 + (hs % 3) + (drift > 0.62 ? 1 : 0); // 1..4 stems
        const scx = tx + rand01(hs, 3);
        const scy = ty + rand01(hs, 13);
        for (let i = 0; i < n; i++) {
          const b = makeBlade(tx, ty, 953 + i * 31, i, true, { x: scx, y: scy }, tileTone);
          // Waist-ish standing grass — clearly taller than the coat, clearly
          // shorter than a true thicket stem, so the thickets still read densest
          // AND tallest.
          b.h *= 0.85;
          b.seg2 = b.h > 0.42;
          if (buried?.(b.bx, b.by)) continue;
          (b.by < ty + 0.5 ? geom.north : geom.south).push(b);
        }
      }
    }
  }

  // THE GOLDEN REACH: wild grain stalks gather in prairie drifts on
  // their own slow field — inside a drift roughly half the tiles raise
  // one or two stalks (gaps keep the drift organic), everywhere else
  // the meadow stays pure green.
  const prairie = valueNoise(911, tx * 0.045, ty * 0.045);
  if (prairie > 0.64) {
    const hs = hashCoords(919, tx, ty);
    if (hs % 100 < 52) {
      const n = 1 + (hs % 2);
      const scx = tx + rand01(hs, 3);
      const scy = ty + rand01(hs, 13);
      for (let i = 0; i < n; i++) {
        const h2 = hashCoords(929 + i * 7, tx, ty);
        const ang = rand01(h2, 3) * 6.283;
        const rad = rand01(h2, 13) * 0.34;
        const bx = scx + Math.cos(ang) * rad;
        const by = scy + Math.sin(ang) * rad * 0.8;
        if (buried?.(bx, by)) continue;
        const phase = rand01(h2, 17);
        geom.seeds.push({
          bx,
          by,
          h: 0.38 + rand01(h2, 6) * 0.16,
          size: 0.036 + rand01(h2, 9) * 0.016,
          lean: (rand01(h2, 15) - 0.5) * 0.14,
          phase,
          bin: Math.min(31, Math.floor(phase * 32)),
        });
      }
    }
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
        pal: h % FLOWER_PALS.length,
        phase: rand01(h, 17),
      });
    }
  }
  return geom;
}

// ------------------------------------------------------------- palette

/**
 * Base tones, deep → light, in two registers.
 *
 * ACCENT rows (0-4) keep THE FLOOR LAW: the darkest accent blade is
 * still a step lighter than the lightest ground green (GRASS_TONES
 * peak at #608e45), and the ramp only ever LIFTS — a blade that fades
 * into the turf color reads as transparent. The rows sit CLOSER to
 * the turf than the old set (#6f9e4e+): when every blade popped a
 * full step above the ground, each one read as a separate nodule —
 * the rolling light swaths are what should carry the drama.
 *
 * NAP rows (5-7) are the coat's weave, hugging the turf from a hair
 * below to a step above. The shade row (#547e3b) is the COAT
 * AMENDMENT to the floor law: inside a dense carpet a slightly-sunk
 * chip is texture, not a hole — generation gates it out of thin coats.
 */
const TONE_BASE = ['#659245', '#6a9749', '#6f9c4d', '#74a251', '#79a755'];
const NAP_BASE = ['#547e3b', '#5e8a43', '#679349'];
const NAP_ROW0 = TONE_BASE.length;
const ALL_TONES = [...TONE_BASE, ...NAP_BASE];
const LIT_TARGET = '#d9e37f'; // sun catching a bent blade
const NAP_LIT = '#c4d375'; // the carpet's softer glow under the same swell
const ROOT_COLOR = '#699a49';
const FLOWER_PALS = ['#e88a9e', '#f0d264', '#efe3c2', '#9fa8dd'];
const FLOWER_CORE = '#f7efd8';
const SEED_GOLD = '#c8b671'; // ripe grain ears in the golden reaches

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
/** Exported as the GPU grass's palette source (grassGpuRenderer.ts) —
 *  the exact shade→base→lit ramp, so the instanced blades wear the same
 *  colours as the baked meadow. Tone-major: [tone·LIGHTS + light]. */
export const BLADE_FILLS: string[] = ALL_TONES.flatMap((tone, row) =>
  Array.from({ length: LIGHTS }, (_, i) => {
    // Lift-only ramp: the trough IS the base tone, and the swell adds
    // a modest glow on top. Never downward. The nap lifts a touch less
    // toward a softer target — the carpet glows, the accents flash.
    const t = i / (LIGHTS - 1);
    return row >= NAP_ROW0 ? mixHex(tone, NAP_LIT, 0.17 * t) : mixHex(tone, LIT_TARGET, 0.22 * t);
  }),
);

// Bucket layout: blade ramp first, then roots, petals, cores, seeds, stems.
const B_ROOT = ALL_TONES.length * LIGHTS;
const B_PETAL0 = B_ROOT + 1;
const B_CORE = B_PETAL0 + FLOWER_PALS.length;
const B_SEED = B_CORE + 1;
const B_STEM = B_SEED + 1;

/** GPU ornament palette (grassOrnament.ts) — the EXACT flower/seed colours
 *  the baked meadow uses, so the instanced blooms match. Fixed order:
 *  [petal0..3, core, gold, stem]. */
export const ORNAMENT_FILLS: readonly string[] = [
  ...FLOWER_PALS,
  FLOWER_CORE,
  SEED_GOLD,
  TONE_BASE[0]!,
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
  /** THE SETTLED BODY JOINS THE CALM: true once this body has stood
   *  still for ~a second. Its parting field is then static, so the
   *  calm canvas may bake the deformed blades and stop rebuilding the
   *  tiles under it live every frame — the cost that kept a plaza of
   *  idle townsfolk paying meadow prices. The field itself still
   *  applies wherever those tiles DO build (bake or live). */
  settled: boolean;
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


// ---------------------------------- THE MEADOW RIDES THE SHEAR (round 13)

/** Row-sprite lanes: a full elevated row, one thicket depth band, or
 *  a level-0 under-layer row (round 13's calm-canvas successor). */
const LANE_TALL_N = 1;
const LANE_TALL_S = 2;

/**
 * Which tiles a cell lane owns. THE COAT LAW anchors the under lane:
 * every short-grass tile wears the nap (plus roots, flowers and
 * seed-heads — all under-lane residents), so the UNDER lane takes
 * BOTH grass tiles; only the tall standing-mass lanes are thickets-
 * only. The original cell gate lumped UNDER into the "not ROW"
 * branch and silently balded the entire open meadow — casts kept
 * drawing (the shade pass reads geometry directly), so the field
 * report was "shadows of the grass with no grass". Exported pure so
 * grass.test.ts pins it.
 */
export function laneUses(lane: number, t: Tile | null | undefined): boolean {
  if (t == null || (t !== Tile.Grass && t !== Tile.GrassTall)) return false;
  if (lane === LANE_TALL_N || lane === LANE_TALL_S) return t === Tile.GrassTall;
  return true;
}


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
    this.lastPos.clear();
    this.live.length = 0;
  }
  private readonly lastPos = new Map<
    number | 'own',
    { x: number; y: number; tx: number; ty: number; movedAt: number }
  >();
  private live: LiveDisturber[] = [];
  private tSec = 0;
  private nowMs = 0;

  /**
   * GPU-meadow geometry mode (grass-elevate pass): when true, generateGrassTile
   * scatters taller standing blades through NORMAL grass tiles (see that fn),
   * so upright grass reads across the whole field under ?grass=gpu. The renderer
   * sets it before the GPU field is gathered; the canvas default leaves it false
   * (byte-identical geometry). Changing it clears the tile cache so no stale
   * (wrong-mode) geometry survives the flip.
   */
  private gpuGeom = false;
  setGpuGeom(on: boolean): void {
    if (on === this.gpuGeom) return;
    this.gpuGeom = on;
    // Geometry differs by mode — drop the cache so tiles re-mint in the new mode.
    this.tiles.clear();
    this.posIndex.clear();
  }
  /** Recycled LiveDisturber records backing `live` (see beginFrame). */
  private readonly livePool: LiveDisturber[] = [];

  /**
   * Per-frame setup: track each body's motion and fire rustle specks when
   * someone wades into a new patch of tall grass, then evict far geometry.
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
    const dt = Math.max(frameDt, 1 / 240);
    // POOLED live records: the roster is rebuilt every frame, so the
    // record objects (and the lastPos entries) are recycled in place —
    // the old map()+spread minted ~80 objects a frame here.
    this.live.length = disturbers.length;
    for (let i = 0; i < disturbers.length; i++) {
      const d = disturbers[i]!;
      let ld = this.livePool[i];
      if (!ld) {
        ld = { id: 0, x: 0, y: 0, r: 0, vx: 0, vy: 0, speed: 0, settled: false };
        this.livePool[i] = ld;
      }
      const prev = this.lastPos.get(d.id);
      const vx = prev ? (d.x - prev.x) / dt : 0;
      const vy = prev ? (d.y - prev.y) / dt : 0;
      const speed = Math.hypot(vx, vy);
      const tx = Math.floor(d.x);
      const ty = Math.floor(d.y);
      // Settle clock: any real motion re-arms the live window (see
      // LiveDisturber.settled). The threshold is a whisker over
      // interpolation jitter so an idle body truly settles.
      if (prev && (Math.abs(d.x - prev.x) > 0.02 || Math.abs(d.y - prev.y) > 0.02)) {
        prev.movedAt = nowMs;
      }
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
        this.lastPos.set(d.id, { x: d.x, y: d.y, tx, ty, movedAt: nowMs });
      }
      ld.id = d.id;
      ld.x = d.x;
      ld.y = d.y;
      ld.r = d.r;
      ld.vx = Math.min(8, Math.max(-8, vx));
      ld.vy = Math.min(8, Math.max(-8, vy));
      ld.speed = speed;
      ld.settled = prev !== undefined && nowMs - prev.movedAt > 900;
      this.live[i] = ld;
    }
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

  private tile(
    tx: number,
    ty: number,
    tileId: number,
    detailId: number,
    ground?: Sampler,
  ): GrassTileState {
    // Numeric key — string building here showed up in profiles.
    const code = grassDetailCode(detailId);
    const key = (((ty + 8192) * 16384 + (tx + 8192)) * 16 + tileId) * 8 + code;
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
      st = {
        geom: generateGrassTile(tx, ty, tileId, code, snowMask, this.gpuGeom),
        wakeAt: 0,
        tx,
        ty,
      };
      this.tiles.set(key, st);
      this.posIndex.set((ty + 8192) * 16384 + (tx + 8192), st);
    }
    return st;
  }


  /**
   * THE GPU PATH'S BLADE GATHERER (proposal G-2). Walk the visible level-0
   * grass tiles and collect each tile's CACHED blade geometry into `out` for
   * the instanced GPU renderer (this.tile() mints and caches the geometry on
   * first sight). Gathers the `under` coat (both grass tiles wear it — THE
   * COAT LAW), and — unless the tall standing mass is being routed to the
   * y-sorted interleave — the tall `north`/`south` blades (GrassTall only).
   * Blade geometry ONLY; flowers, seeds and roots are separate instance types
   * handled later. The blades land SORTED back-to-front by world-y (`by`
   * ascending): the GPU draws them opaque with no depth buffer, so paint
   * order IS the depth. The immutable cached Blade objects are pushed by
   * reference (no copy). `out` is caller-owned and pooled — it is truncated
   * here. Returns the number of blades written.
   *
   * B3 — THE TALL BLADE INTERLEAVES: with `tallInterleave` set, the GPU flat
   * field carries ONLY the short `under` coat (both grass tiles), and the
   * tall standing mass (GrassTall north/south bands) is skipped here so the
   * renderer can route it through the GPU tall-band y-sort
   * (collectGpuTall → collectGpuTallBands) — a body then walks THROUGH a
   * thicket, blades in front of it occluding the lower body. The `under`
   * coat is short and correctly stays flat below every entity, so the
   * partition is exactly the two depth classes: coat (flat) vs standing
   * mass (interleaved).
   */
  collectGpuBlades(
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    out: Blade[],
    tallInterleave = false,
  ): number {
    out.length = 0;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const t = ground(tx, ty);
        // The same gate laneUses applies: the UNDER lane owns both
        // grass tiles; the tall N/S lanes are thickets (GrassTall) only.
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const geom = this.tile(tx, ty, t, detail(tx, ty), ground).geom;
        for (const b of geom.under) out.push(b);
        // Tall standing mass: kept in the flat GPU field only when it is
        // NOT being interleaved. Under interleave the GPU tall-band pass
        // draws these bands at their y-sort slots instead (see renderer).
        if (t === Tile.GrassTall && !tallInterleave) {
          for (const b of geom.north) out.push(b);
          for (const b of geom.south) out.push(b);
        }
      }
    }
    // Back-to-front: opaque GPU draw with no depth buffer — order is depth.
    out.sort((a, b) => a.by - b.by);
    return out.length;
  }

  /**
   * G1 — THE TALL BLADE GOES TO THE GPU. Gather ONLY the tall standing
   * mass (GrassTall north+south blades) for the visible field, from the
   * SAME immutable tile cache collectGpuBlades reads (no separate
   * generation). The short `under` coat is NOT included here — it rides
   * the flat GPU field (collectGpuBlades with tallInterleave). The blades
   * land SORTED back-to-front by world-y (`by` ascending): the GPU draws
   * them opaque with no depth buffer, so within any one row-band the paint
   * order IS the depth. The renderer then partitions this sorted array
   * into fine world-row bands (partitionTallBands) and emits each band as
   * a y-sorted DrawItem, so a body walks THROUGH the thicket — blades
   * rooted south of it (in front) occlude its lower body, blades rooted
   * north do not, CONTINUOUSLY (no two-band pop). `out` is caller-owned
   * and pooled (truncated here); cached Blade records are pushed by
   * reference. Returns the number of tall blades written.
   */
  collectGpuTall(ground: Sampler, detail: DetailFn, bounds: GrassBounds, out: Blade[]): number {
    out.length = 0;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        // BOTH grass tiles now carry a standing mass under ?grass=gpu: true
        // GrassTall thickets AND the taller tufts scattered through normal
        // Grass (generateGrassTile in gpu mode). Normal tiles have empty
        // north/south in canvas mode, so this is a no-op there. The flat GPU
        // field (collectGpuBlades, tallInterleave) skips ALL north/south, so
        // these interleave here with no double-draw.
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const geom = this.tile(tx, ty, t, detail(tx, ty), ground).geom;
        for (const b of geom.north) out.push(b);
        for (const b of geom.south) out.push(b);
      }
    }
    // Back-to-front: opaque GPU draw with no depth buffer — order is depth.
    out.sort((a, b) => a.by - b.by);
    return out.length;
  }

  /**
   * G-ELEVATED — THE COAT RIDES THE SHELF. Gather the RAISED-terrain grass
   * (tiles whose `elevAt` level ≠ 0) for the visible field, grouped into ONE
   * band per (row, level) so each band can be lifted onto its shelf and
   * y-sorted at its own row (drawn over the elevated ground quad, under the
   * bodies standing on it). Reads the SAME immutable tile cache as
   * collectGpuBlades — no separate generation. Each band gathers a tile's
   * `under` coat AND its `north`/`south` tall standing mass (elevated tall is
   * NOT per-body interleaved — a small, rare field where the flat meadow's
   * fine tall interleave does not apply); the slice is sorted back-to-front
   * by world-y so the opaque no-depth GPU draw paints correctly within the
   * band. `elevH` is one level's world height (ELEV_H); `band.elev` is
   * `level·elevH`, the exact lift the elevated ground quad rides. `out` and
   * `bands` are caller-owned pooled arrays (truncated here); cached Blade
   * records are pushed by reference. Flat (level-0) tiles are ignored — they
   * ride the flat GPU field (collectGpuBlades).
   */
  collectGpuElevated(
    ground: Sampler,
    detail: DetailFn,
    elevAt: (tx: number, ty: number) => number,
    bounds: GrassBounds,
    elevH: number,
    out: Blade[],
    bands: TallBand[],
  ): void {
    out.length = 0;
    bands.length = 0;
    const levels = this.elevLevelScratch;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      // Which elevation levels does this row carry? (usually one — a terrace
      // top — so this scan is short and levels stays tiny.)
      levels.length = 0;
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const lvl = elevAt(tx, ty);
        if (lvl === 0) continue;
        if (!levels.includes(lvl)) levels.push(lvl);
      }
      for (const lvl of levels) {
        const i0 = out.length;
        let minBy = Infinity;
        let maxBy = -Infinity;
        for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
          const t = ground(tx, ty);
          if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
          if (elevAt(tx, ty) !== lvl) continue;
          const geom = this.tile(tx, ty, t, detail(tx, ty), ground).geom;
          for (const b of geom.under) {
            out.push(b);
            if (b.by < minBy) minBy = b.by;
            if (b.by > maxBy) maxBy = b.by;
          }
          if (t === Tile.GrassTall) {
            for (const b of geom.north) {
              out.push(b);
              if (b.by < minBy) minBy = b.by;
              if (b.by > maxBy) maxBy = b.by;
            }
            for (const b of geom.south) {
              out.push(b);
              if (b.by < minBy) minBy = b.by;
              if (b.by > maxBy) maxBy = b.by;
            }
          }
        }
        const count = out.length - i0;
        if (count === 0) continue;
        // Back-to-front within the band (opaque, no depth buffer).
        this.sortBladeSlice(out, i0, count);
        bands.push({
          i0,
          count,
          // Draw just past the row's foot so the coat lands OVER the elevated
          // ground quad (sorted at worldTy − 0.01) yet under a body on the row.
          sortY: ty + 0.001,
          minBy,
          maxBy,
          elev: lvl * elevH,
        });
      }
    }
  }

  /** In-place back-to-front (by ascending) sort of a slice of a blade array
   *  — used by collectGpuElevated to order each band's own blades without
   *  disturbing (or reallocating) the shared output buffer. */
  private sortBladeSlice(a: Blade[], i0: number, count: number): void {
    // Small per-band slices — an insertion sort avoids allocating a subarray
    // and is faster than Array.sort for the tens of blades a row holds.
    for (let i = i0 + 1; i < i0 + count; i++) {
      const v = a[i]!;
      let j = i - 1;
      while (j >= i0 && a[j]!.by > v.by) {
        a[j + 1] = a[j]!;
        j--;
      }
      a[j + 1] = v;
    }
  }

  /** Reused scratch for collectGpuElevated's per-row level set (no per-frame
   *  alloc); a row rarely carries more than one or two elevation levels. */
  private readonly elevLevelScratch: number[] = [];

  /**
   * The GPU path's ORNAMENT gatherer (proposal G-2) — flowers and
   * seed-heads for the visible field, from the SAME tile cache
   * collectGpuBlades walks. The ornament pass draws OVER the blades, so
   * these need no depth sort among themselves. Both output arrays are
   * caller-owned and pooled (truncated here); the immutable cached
   * records are pushed by reference. Returns the total written.
   */
  collectGpuOrnaments(
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    flowersOut: Flower[],
    seedsOut: SeedHead[],
  ): number {
    flowersOut.length = 0;
    seedsOut.length = 0;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const geom = this.tile(tx, ty, t, detail(tx, ty), ground).geom;
        for (const fl of geom.flowers) flowersOut.push(fl);
        for (const sd of geom.seeds) seedsOut.push(sd);
      }
    }
    return flowersOut.length + seedsOut.length;
  }

  /**
   * G-ELEVATED — THE BLOOM RIDES THE SHELF. The ornament analogue of
   * collectGpuElevated: gather the RAISED-terrain flowers + seed-heads (tiles
   * whose `elevAt` level ≠ 0) grouped into ONE band per (row, level) so each
   * can be lifted onto its shelf and y-sorted at its own row (drawn OVER the
   * elevated coat, under the bodies standing on it). Flat (level-0) tiles are
   * ignored — their blooms ride the flat GPU field (collectGpuOrnaments). All
   * three output arrays are caller-owned and pooled (truncated here); cached
   * records are pushed by reference. `elevH` is one level's world height
   * (ELEV_H). Each group's record maxima are swept here so the GPU layer sizes
   * its atlas slot without re-touching the records.
   */
  collectGpuElevatedOrnaments(
    ground: Sampler,
    detail: DetailFn,
    elevAt: (tx: number, ty: number) => number,
    bounds: GrassBounds,
    elevH: number,
    flowersOut: Flower[],
    seedsOut: SeedHead[],
    groups: ElevOrnGroup[],
  ): void {
    flowersOut.length = 0;
    seedsOut.length = 0;
    groups.length = 0;
    const levels = this.elevLevelScratch;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      levels.length = 0;
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const lvl = elevAt(tx, ty);
        if (lvl === 0) continue;
        if (!levels.includes(lvl)) levels.push(lvl);
      }
      for (const lvl of levels) {
        const fStart = flowersOut.length;
        const sStart = seedsOut.length;
        let minBy = Infinity;
        let maxBy = -Infinity;
        let maxH = 0;
        let maxSize = 0;
        for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
          const t = ground(tx, ty);
          if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
          if (elevAt(tx, ty) !== lvl) continue;
          const geom = this.tile(tx, ty, t, detail(tx, ty), ground).geom;
          for (const fl of geom.flowers) {
            flowersOut.push(fl);
            if (fl.by < minBy) minBy = fl.by;
            if (fl.by > maxBy) maxBy = fl.by;
            if (fl.h > maxH) maxH = fl.h;
            if (fl.size > maxSize) maxSize = fl.size;
          }
          for (const sd of geom.seeds) {
            seedsOut.push(sd);
            if (sd.by < minBy) minBy = sd.by;
            if (sd.by > maxBy) maxBy = sd.by;
            if (sd.h > maxH) maxH = sd.h;
            if (sd.size > maxSize) maxSize = sd.size;
          }
        }
        const fCount = flowersOut.length - fStart;
        const sCount = seedsOut.length - sStart;
        if (fCount === 0 && sCount === 0) continue;
        groups.push({
          fStart,
          fCount,
          sStart,
          sCount,
          // Just past the elevated coat's row (ty + 0.001) so the blooms sit
          // OVER the raised blades, yet under a body standing on the row.
          sortY: ty + 0.0015,
          elev: lvl * elevH,
          minBy,
          maxBy,
          maxH,
          maxSize,
        });
      }
    }
  }

}
