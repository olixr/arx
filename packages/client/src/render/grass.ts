import { Tile, hashCoords, valueNoise } from '@arx/shared';
import { StageBlend, type StageItem, type StageTexture } from './stage/stageTypes.js';
import {
  GRASS_BAKE_MS_BUDGET,
  GRASS_CELL_SPAN,
  GRASS_ROW_CADENCE_MS,
  GrassVerdict,
  admitGrassSprite,
  cellStartTx,
  grassPoolAdmits,
  grassPoolClass,
  grassSweepNeeded,
  grassSweepRelieved,
  planGrassSweep,
  rowCadenceJitter,
  rowCadenceStep,
  rowShear,
  scaleFresh,
  windTerm,
} from './grassSpriteBudget.js';
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
export function generateGrassTile(
  tx: number,
  ty: number,
  tileId: number,
  detailId: number,
  snowMask = 0,
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
  const napN = Math.max(2, Math.round((3 + (hn % 3)) * (0.5 + 0.9 * lush)));
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
  const clump = detailId === DETAIL_TUFT || cov > 0.74;
  {
    const hc = hashCoords(167, tx, ty);
    const budget = cov < 0.32 ? 1 + (hc % 2) : cov < 0.56 ? 2 + (hc % 2) : 3 + (hc % 3);
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

/**
 * G4 — THE OVER-FOOT SKIRT. A small deterministic cluster of grass blades
 * that nestle UP AROUND the base of a grass-rooted object (a tree trunk, a
 * rock, a bush) so it reads as GROWING OUT of the meadow instead of pasted
 * on top. The renderer emits these through the SAME GPU instanced band path
 * the tall grass rides, at a y-sort slot JUST GREATER than the object's foot
 * — so the blades draw OVER the object's lower base edge (breaking the hard
 * sticker line) while the object's mass above still occludes correctly.
 *
 * The art: a few taller tufts rise a little up the trunk at the very centre,
 * thinning to short chips at the rim — dense at the foot, sparse outward —
 * so the collar never reads as a uniform ring. Blades wear the meadow's own
 * tone patch (matching the surrounding coat) and, drawn through the blade
 * shader, sway with THE ONE WIND like every other blade. `footY` is the
 * object's ground-contact world row (its sort row); blades scatter in a
 * squashed ground ellipse around (tx+0.5, footY). Pure + deterministic
 * (same tile → same skirt), sorted back-to-front by world-y. Alloc: one
 * array per call — the renderer caches it per tile so a still object mints
 * its skirt once.
 */
// Side bits for edge-biased (wall/building) skirts — mirror grassSkirt.ts.
const SKIRT_SIDE_N = 1;
const SKIRT_SIDE_S = 2;
const SKIRT_SIDE_W = 4;
const SKIRT_SIDE_E = 8;
const SKIRT_SIDE_ALL = SKIRT_SIDE_N | SKIRT_SIDE_S | SKIRT_SIDE_W | SKIRT_SIDE_E;

/**
 * Snap an angle onto its nearest grass-facing cardinal sector when the skirt
 * is edge-biased (a wall foot: `sides` names which orthogonal edges are
 * grass). Returns the angle unchanged for a full ring (natural wilds). Screen
 * convention: cos>0 → east, cos<0 → west; sin>0 → south, sin<0 → north (by
 * grows southward). A blade whose free angle points at a NON-grass edge is
 * pulled into one of the grass sectors so the whole tuft lands on grass — a
 * wall never sprouts grass out of its stone/path/interior side.
 */
function biasAngleToGrassSides(ang: number, sides: number, pick: number): number {
  if (sides === SKIRT_SIDE_ALL || sides === 0) return ang;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  // Which cardinal does this free angle favour?
  const wantsWE = Math.abs(c) > Math.abs(s);
  const side = wantsWE ? (c > 0 ? SKIRT_SIDE_E : SKIRT_SIDE_W) : s > 0 ? SKIRT_SIDE_S : SKIRT_SIDE_N;
  if ((sides & side) !== 0) return ang; // already lands on a grass edge
  // Rotate onto one of the allowed sectors (centres: E=0, S=π/2, W=π, N=3π/2),
  // keeping a ±40° spread so the edge reads as a soft fringe, not a picket.
  const allowed: number[] = [];
  if (sides & SKIRT_SIDE_E) allowed.push(0);
  if (sides & SKIRT_SIDE_S) allowed.push(Math.PI * 0.5);
  if (sides & SKIRT_SIDE_W) allowed.push(Math.PI);
  if (sides & SKIRT_SIDE_N) allowed.push(Math.PI * 1.5);
  if (allowed.length === 0) return ang;
  const centre = allowed[Math.floor(pick * allowed.length) % allowed.length]!;
  return centre + (pick - 0.5) * (Math.PI * 4 / 9); // ±40°
}

/**
 * `strength` (0..1) stands in for the object's HEIGHT: a tall tree carries a
 * full climbing collar (1); a low rock gets a bare few short wisps (~0.22) so
 * it is never swallowed; a wall foot a subtle low nestle (~0.5). It scales
 * blade count, height, radius and whether inner climbers appear. `sides` is a
 * grass-edge bitmask (SKIRT_SIDE_*): the full ring (default) scatters freely,
 * a partial mask (a wall) keeps every blade on a grass-facing edge only.
 */
export function generateSkirtBlades(
  tx: number,
  ty: number,
  footY: number,
  strength = 1,
  sides = SKIRT_SIDE_ALL,
): Blade[] {
  const out: Blade[] = [];
  if (strength <= 0) return out;
  // The meadow's tone patch at this tile — the skirt wears the SAME green
  // as the coat around it, so it is the meadow climbing the trunk, not a
  // ring of a different grass.
  const tileTone = Math.min(4, Math.floor(valueNoise(905, tx * 0.05, ty * 0.05) * 5));
  const cx = tx + 0.5;
  const h0 = hashCoords(521, tx, ty);
  // A LUSH tuft at full strength — enough blades to wrap the foot and thin
  // outward, still a tuft not a hedge. Scaled DOWN by strength so a rock
  // carries only a handful (≈5) and a wall foot a modest fringe (≈12).
  const full = 20 + (h0 % 8); // 20..27
  const count = Math.max(3, Math.round(full * strength));
  // Shorter + tighter for weaker skirts: a rock's wisps must not climb it.
  const heightScale = 0.4 + 0.6 * strength; // rock 0.53 · wall 0.7 · tree 1.0
  const radiusScale = 0.6 + 0.4 * strength; // rock hugs the base tighter
  const climbers = strength >= 0.85; // only tall wilds send blades up the bark
  for (let i = 0; i < count; i++) {
    const hh = hashCoords(523 + i * 37, tx, ty);
    // Radial scatter biased hard INWARD (u^1.7): most blades hug the trunk,
    // a thinning few reach the rim — the density falls off outward, never a
    // uniform collar. maxR 0.5 wraps a full tile diameter around the foot.
    const u = rand01(hh, 2);
    const rad = 0.5 * radiusScale * Math.pow(u, 1.7);
    const ang = biasAngleToGrassSides(rand01(hh, 12) * 6.2831853, sides, rand01(hh, 27));
    const bx = cx + Math.cos(ang) * rad;
    // Squash the ellipse (×0.5) so the skirt lies in the ground plane and
    // WRAPS the trunk sides more than it spills forward; a hair forward
    // (south) so it favours the visible near face without hiding the foot.
    const by = footY + Math.sin(ang) * rad * 0.5 + 0.03;
    // rise = 1 at the trunk, 0 at the rim: centre blades stand tall and
    // climb the bark, outer chips stay squat. A handful of the very inner
    // blades are CLIMBERS — a touch taller still — for the few tufts that
    // rise up the trunk. Capped so the skirt never swallows the mass.
    const rise = 1 - u;
    const climber = climbers && u < 0.22 ? rand01(hh, 24) * 0.1 : 0;
    const height = (0.14 + rise * 0.27 + climber + rand01(hh, 5) * 0.06) * heightScale; // ≤ ~0.57
    const phase = rand01(hh, 18);
    out.push({
      bx,
      by,
      h: height,
      // A touch narrower than a meadow accent — trunk-side blades read as
      // fine strands, not slabs; inner blades a hair wider so they read.
      w: 0.03 + rand01(hh, 8) * 0.02 + rise * 0.008,
      lean: (rand01(hh, 15) - 0.42) * 0.1,
      phase,
      bin: Math.min(31, Math.floor(phase * 32)),
      lumJit: (rand01(hh, 21) - 0.5) * 0.18,
      tone: Math.max(0, Math.min(4, tileTone + (hh % 3) - 1)),
      seg2: height > 0.4,
    });
  }
  // Back-to-front within the skirt: the GPU draws opaque, order is depth.
  out.sort((a, b) => a.by - b.by);
  return out;
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
const BUCKETS = B_STEM + 1;
const BUCKET_FILLS: string[] = [
  ...BLADE_FILLS,
  ROOT_COLOR,
  ...FLOWER_PALS,
  FLOWER_CORE,
  SEED_GOLD,
  TONE_BASE[0]!, // stems: the deepest blade green — never below the turf
];

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
/**
 * A disturber's blade-influence pad past its own radius, tiles. The
 * push falloff in buildBlade reaches exactly `d.r + 0.62` from the
 * BASE of a blade, so a disturber's box is `d.r + 0.7` (falloff plus
 * a whisker), floored to tiles. This used to be a fixed 2.3 — ~4x the
 * area a walking body can actually touch (the whole live-exclusion
 * set rode on it: 140-350 tiles rebuilt per frame in every surveyed
 * scene), while UNDER-covering a large body whose r + 0.62 exceeds
 * 2.3 (an ogre's parting clipped at the box edge). Every consumer —
 * the disturber index, the calm-canvas exclusion, the escape hatch —
 * derives the same bound from the same function.
 */
const DISTURB_PAD = 0.7;

function disturbReach(r: number): number {
  return r + DISTURB_PAD;
}

// ---------------------------------- THE MEADOW RIDES THE SHEAR (round 13)

/** Row-sprite lanes: a full elevated row, one thicket depth band, or
 *  a level-0 under-layer row (round 13's calm-canvas successor). */
const LANE_ROW = 0;
const LANE_TALL_N = 1;
const LANE_TALL_S = 2;
const LANE_UNDER = 3;

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

/** A tile stays live this long after its last wake (spring-back runs
 *  at frame rate — the same window bakeUnder honors). */
const WAKE_LIVE_MS = 800;

/** Urgent-bake spend ceiling, ms/frame: first sight and hatches pay
 *  now (THE ARRIVAL PAYS ONCE — deferring repaints live at the same
 *  order of cost and converges never); this is only the runaway guard. */
const GRASS_URGENT_MS = 12;

/**
 * One baked row-cell sprite. `liveMask` records which of the cell's
 * tiles were EXCLUDED at bake (bit i = tile cellTx+i): excluded tiles
 * are empty pixels in the sprite and always build live, whatever the
 * disturbers are doing now. A canvas of null is a declined verdict —
 * the cell draws live and retries on the cadence.
 */
interface RowSprite {
  canvas: HTMLCanvasElement | null;
  bytes: number;
  /** Canvas device dims actually painted (canvas itself is class-sized). */
  w: number;
  h: number;
  scale: number;
  dpr: number;
  sx: number;
  sy: number;
  mx: number;
  my: number;
  bakedAtMs: number;
  bakedTerm: number;
  liveMask: number;
  sig: number;
  used: number;
  /** First used tile of the baked extent, relative to the cell start —
   *  THE SPRITE FITS ITS FRAME: a cell with three scattered thicket
   *  tiles bakes three tiles' width, not sixteen. */
  txOff: number;
  /** World x of the baked extent's center (the shear's wind sample). */
  center: number;
}
/** Ear chip scale from tip down: pointed tip, swollen middle, eased foot. */
const SEED_EAR_TAPER = [0.55, 0.9, 1.0, 0.75] as const;

/** Flower/seed buckets in paint order — hoisted (flush runs per frame). */
const FLOWER_BUCKETS = [
  B_STEM,
  B_PETAL0,
  B_PETAL0 + 1,
  B_PETAL0 + 2,
  B_PETAL0 + 3,
  B_CORE,
  B_SEED,
] as const;

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
    // The calm canvas holds the OLD world's meadow — drop it too, or
    // a stale coat blits for a beat after the crossing.
    this.underCache = null;
    // Row sprites are world content too. THE LEDGER HAS ONE DOOR:
    // every canvas goes back through the pool and the ledger re-grounds
    // at zero — a bare clear() here is round 10's phantom-ledger bug.
    for (const key of this.rowSprites.keys()) this.dropRowSprite(key);
    this.rowSprites.clear();
    this.rowBytes = 0;
  }
  private readonly lastPos = new Map<
    number | 'own',
    { x: number; y: number; tx: number; ty: number; movedAt: number }
  >();
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
   * THE SHADE CACHE (né THE CALM CANVAS). Round 6 baked the whole calm
   * under-layer — blades and casts — into offscreen canvases at 66ms
   * cadence; round 13 moved the BLADES onto the budgeted row-sprite
   * lane (THE MEADOW RIDES THE SHEAR — the 15Hz full re-tessellation
   * was a measured multi-ms burst that read as micro-stutter on fast
   * panels), and this cache now carries only the meadow's merged CAST
   * canvas (cast-only build, ~a quarter of the old beat) plus the
   * live-exclusion set both consumers share. Casts stay monolithic on
   * purpose: one canvas is the only place overlapping shade can merge
   * instead of stacking (the shadow-layer law). Only tiles a body (or
   * its predicted path — a swept box over the cache window) can
   * reach, plus fresh wakes, are excluded and rebuilt live per frame.
   * A disturber that escapes its predicted box forces an immediate
   * rebake, so displacement NEVER lags a frame.
   */
  private underCache: {
    /** Screen position of world (0,0) at bake — blits translate by the delta. */
    ox: number;
    oy: number;
    /** Screen (CSS px) origin of the canvas's top-left at bake. */
    canvasX0: number;
    canvasY0: number;
    scale: number;
    dpr: number;
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
    shFill: string;
    /** Whether the shadow canvas holds any content this bake. */
    hasShadow: boolean;
  } | null = null;
  /** The meadow's merged cast canvas, reused across bakes. */
  private shadowCanvas: HTMLCanvasElement | null = null;
  private shadowCtx: CanvasRenderingContext2D | null = null;
  /** The shadow fill the NEXT bake will use (set via setShadow). */
  private shFill = '#000';
  /** Effective screen alpha for the meadow's own cast composite. */
  private shAlpha = 0.5;
  /** This frame's cached-fill translation (drawUnder → flushShadows). */
  private cacheDx = 0;
  private cacheDy = 0;

  /**
   * THE MEADOW RIDES THE SHEAR: cadence-baked sprites for the two
   * lanes that could never join the calm canvas because they y-sort
   * per row — tall thicket bands and elevated-surface rows. Each
   * sprite blits through a live wind-delta shear about the row's base
   * line, so primary sway runs at frame rate at any cadence (the tree
   * lane's law, one size down). Byte-ledgered, admission-gated,
   * pooled — rounds 10-12's metering laws verbatim.
   */
  private readonly rowSprites = new Map<number, RowSprite>();
  private rowBytes = 0;
  private readonly rowPool = new Map<number, HTMLCanvasElement[]>();
  private rowPoolBytes = 0;
  private frameNo = 0;
  /** Per-frame bake spend: cadence refreshes ride `bakeMsLeft`, first
   *  sight and hatches ride `urgentMsLeft` (the runaway guard). */
  private bakeMsLeft = 0;
  private urgentMsLeft = 0;
  /** Law 2's count floor for first-sight cells (mirrors
   *  bakeAdmission.ARRIVAL_MIN_COUNT): a Mac-tuned ms window admits
   *  ~1 cell on a slow machine — the floor keeps convergence real. */
  private firstCellsLeft = 0;
  /** One guaranteed cadence bake per frame keeps the queue draining
   *  even when a single bake overruns the whole budget. */
  private bakeFloorLeft = 0;
  /** THE FRAME CONFESSES: read by the renderer's ?perf line. */
  readonly rowStats = { blit: 0, live: 0, bake: 0, over: 0 };
  /** Dev/proof lever (the staticLayerOn pattern): false = every cell
   *  builds live through the exact pre-sprite path. */
  rowSpritesOn = true;
  /** THE CADENCE PAYS A BUDGET: live beat, self-tuned per frame. */
  private rowCadenceMs = GRASS_ROW_CADENCE_MS;
  /** Cell-scan scratch (span-sized; no per-frame allocation). */
  private readonly cellSt: Array<GrassTileState | null> = new Array(GRASS_CELL_SPAN).fill(null);
  private readonly cellT = new Int32Array(GRASS_CELL_SPAN);
  private readonly rowSweepScratch: Array<{ key: number; used: number }> = [];
  /** Under-lane deferred blits (cell sprites paint after the shade). */
  private readonly underBlitScratch: Array<{ sp: RowSprite; c0: number; ty: number }> = [];

  /**
   * THE WORLD ON STAGE hook (phase A2p2): set by the renderer during
   * world assembly. blitRowSprite emits quads through it, and the
   * live-tile tails defer into ONE bounded paint per band/row (see
   * stageDrainLive). Null = the classic canvas path, untouched.
   */
  stagePush: ((item: StageItem) => void) | null = null;
  private readonly stageLive: Array<{ lane: number; tx: number; ty: number }> = [];
  private readonly stageTexMap = new WeakMap<
    HTMLCanvasElement,
    { tex: StageTexture; owner: object; frameRev: number }
  >();
  private stageRevSeq = 0;

  /** Handles key by the CANVAS (the renderer's shadow law, same
   *  two-axis invalidation): a pooled canvas claimed by another cell
   *  re-uploads unconditionally; a cell's own rebake rides its
   *  bake stamp. */
  private stageTexFor(sp: RowSprite): StageTexture {
    const canvas = sp.canvas!;
    let rec = this.stageTexMap.get(canvas);
    if (!rec) {
      rec = { tex: { canvas, rev: ++this.stageRevSeq, filter: 'linear' }, owner: sp, frameRev: sp.bakedAtMs };
      this.stageTexMap.set(canvas, rec);
      return rec.tex;
    }
    if (rec.owner !== sp || rec.frameRev !== sp.bakedAtMs) {
      rec.owner = sp;
      rec.frameRev = sp.bakedAtMs;
      rec.tex.rev = ++this.stageRevSeq;
    }
    return rec.tex;
  }

  /** Drain the deferred live tiles as ONE bounded paint item. The
   *  tiles rebuild inside the closure from the samplers — everything
   *  they need is recomputable, so nothing captures a stale frame. */
  private stageDrainLive(ground: Sampler, detail: DetailFn, wts: WTS, s: number): void {
    if (this.stageLive.length === 0) return;
    const tiles = this.stageLive.splice(0);
    let minTx = Infinity;
    let maxTx = -Infinity;
    let minTy = Infinity;
    let maxTy = -Infinity;
    for (const d of tiles) {
      if (d.tx < minTx) minTx = d.tx;
      if (d.tx > maxTx) maxTx = d.tx;
      if (d.ty < minTy) minTy = d.ty;
      if (d.ty > maxTy) maxTy = d.ty;
    }
    const p0 = wts(minTx, minTy);
    const p1 = wts(maxTx + 1, maxTy + 1);
    const x0 = Math.min(p0.x, p1.x) - s;
    const x1 = Math.max(p0.x, p1.x) + s;
    const y0 = Math.min(p0.y, p1.y) - 1.6 * s;
    const y1 = Math.max(p0.y, p1.y) + 0.4 * s;
    this.stagePush!({
      kind: 'paint',
      px: x0,
      py: y0,
      pw: x1 - x0,
      ph: y1 - y0,
      paint: (ctx) => {
        this.ensurePaths();
        for (const d of tiles) {
          const t = ground(d.tx, d.ty);
          const use =
            d.lane === LANE_ROW || d.lane === LANE_UNDER
              ? t === Tile.Grass || t === Tile.GrassTall
              : t === Tile.GrassTall;
          if (!use) continue;
          const st = this.tile(d.tx, d.ty, t!, detail(d.tx, d.ty), ground);
          const wind = windAtInto(WIND_SCRATCH, d.tx + 0.5, d.ty + 0.5, this.tSec);
          const f = this.tileFrame(d.tx, d.ty, wts);
          this.gatherNear(d.tx, d.ty);
          this.buildLaneTile(d.lane, st, t!, wind, f, s, d.lane === LANE_UNDER);
          this.rowStats.live++;
        }
        this.flush(ctx);
      },
    });
  }
  /**
   * Per-frame ctx transform memo. Every lane's entry point read
   * ctx.getTransform() per row item — ~100-130 DOMMatrix allocations
   * a frame in a capital — but the base transform is constant across
   * a frame's grass passes (the renderer's height-lean transforms
   * live INSIDE wall painters, never around item dispatch), so one
   * read per frame per ctx serves them all.
   */
  private ctxM: DOMMatrix | null = null;
  private ctxMOwner: CanvasRenderingContext2D | null = null;
  private ctxMFrame = -1;

  private frameTransform(ctx: CanvasRenderingContext2D): DOMMatrix {
    if (this.ctxMFrame !== this.frameNo || this.ctxMOwner !== ctx || this.ctxM === null) {
      this.ctxM = ctx.getTransform();
      this.ctxMOwner = ctx;
      this.ctxMFrame = this.frameNo;
    }
    return this.ctxM;
  }
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
    this.frameNo++;
    this.rowCadenceMs = rowCadenceStep(this.rowCadenceMs, this.rowStats.bake);
    this.rowStats.blit = 0;
    this.rowStats.live = 0;
    this.rowStats.bake = 0;
    this.rowStats.over = 0;
    this.bakeMsLeft = GRASS_BAKE_MS_BUDGET;
    this.urgentMsLeft = GRASS_URGENT_MS;
    this.firstCellsLeft = 8;
    this.bakeFloorLeft = 1;
    // Sweep the row-sprite ledger toward relief — coldest first, never
    // a sprite this frame drew with. Runs before any draw so the gate
    // has its headroom when the frame's admissions arrive.
    if (grassSweepNeeded(this.rowBytes)) {
      this.rowSweepScratch.length = 0;
      for (const [key, sp] of this.rowSprites) {
        if (sp.canvas) this.rowSweepScratch.push({ key, used: sp.used });
      }
      for (const key of planGrassSweep(this.rowSweepScratch, this.frameNo)) {
        this.dropRowSprite(key);
        this.rowSprites.delete(key);
        if (grassSweepRelieved(this.rowBytes)) break;
      }
      this.rowSweepScratch.length = 0;
    }
    // Key hygiene: a long walk accretes declined/cold entries whose
    // canvases the sweep already took — prune the bookkeeping too.
    if (this.rowSprites.size > 2048) {
      for (const [key, sp] of this.rowSprites) {
        if (sp.used < this.frameNo - 900) {
          this.dropRowSprite(key);
          this.rowSprites.delete(key);
        }
      }
    }
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
    // Rebuild the tile → nearby-disturbers index for this frame.
    // EPOCH-STAMPED entries recycle their list arrays across frames
    // (the old clear()+fresh-[d] pattern allocated ~1k arrays a frame
    // with a town's worth of bodies); readers must check the epoch.
    const epoch = ++this.indexEpoch;
    for (const d of this.live) {
      const reach = disturbReach(d.r);
      const tx0 = Math.floor(d.x - reach);
      const tx1 = Math.floor(d.x + reach);
      const ty0 = Math.floor(d.y - reach);
      const ty1 = Math.floor(d.y + reach);
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

  /**
   * Arm (or disarm) this frame's blade shadow projection. `fill` is
   * the shade color the calm canvas will bake its casts in — pass the
   * same color the composite will use, or the cached shade lags a
   * bake behind at a sun/moon flip. `alpha` is the EFFECTIVE screen
   * alpha the meadow's self-composite lands at (drawUnder paints its
   * own casts under the coat — see the z-order law there), matching
   * what the shared prepass layer would have produced.
   */
  setShadow(kx: number, ky: number, on: boolean, fill = this.shFill, alpha = this.shAlpha): void {
    this.shKx = kx;
    this.shKy = ky;
    this.shOn = on;
    this.shFill = fill;
    this.shAlpha = alpha;
    if (!on) this.shadowPath = null;
  }

  /**
   * Composite any blade casts still pending on the shared prepass
   * layer. Since THE CAST LIES UNDER THE COAT (see drawUnder), the
   * meadow consumes its own shade — calm canvas and live path alike —
   * before its blades paint, so this normally has nothing left; it
   * stays as the safety drain for any cast gathered after the under
   * pass, keeping the shared-layer merge law for that remainder.
   */
  /** Anything queued for the shade pass this frame? (The stage skips
   *  the layer paint entirely on shadeless frames.) */
  hasShadows(): boolean {
    return this.shadowPath !== null;
  }

  flushShadows(ctx: CanvasRenderingContext2D, fill: string, alpha: number): void {
    if (!this.shadowPath) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fill(this.shadowPath);
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
    draw = true,
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
    if (!draw) return;

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

  /**
   * A wild grain stalk: thin stem streaming further than any blade
   * (long lever, light head), three gold chips laid up the tip like a
   * ripening ear. Sparse by construction — the prairie field deals
   * them — so each one reads as a find, not a crop.
   */
  private buildSeed(
    sd: SeedHead,
    st: GrassTileState,
    wind: WindSample,
    fr: TileFrame,
    s: number,
    cast = false,
    draw = true,
  ): void {
    let bob = (wind.bx + wind.by * 0.35) * sd.h * 0.85 + sd.lean;
    bob += this.flutter[sd.bin]! * (0.9 + Math.abs(wind.s));
    let hMul = 1;
    for (const d of this.near) {
      const dx = sd.bx - d.x;
      const dy = sd.by - d.y;
      const fall = disturbFalloff(Math.hypot(dx, dy), d.r + 0.6);
      if (fall <= 0) continue;
      bob += (dx > 0 ? 1 : -1) * fall * 0.28;
      hMul *= 1 - 0.4 * fall;
    }
    if (st.wakeAt > 0) {
      const e = 1 - (this.nowMs - st.wakeAt) / 700;
      if (e > 0) bob += this.wakeWobble[sd.bin]! * e * e * 1.4;
    }

    const px = fr.x0 + (sd.bx - st.tx) * fr.sx;
    const py = fr.y0 + (sd.by - st.ty) * fr.sy;
    const hpx = sd.h * hMul * s;
    if (hpx < 3) return;
    const hx = px + bob * s;
    const hy = py - hpx;
    const paths = this.paths as Path2D[];

    // The cast: stem line + a chip where the ear lands (bin parity —
    // same half-the-herd law the blades follow).
    if (cast && this.shOn && hpx >= 6 && (sd.bin & 1) === 0) {
      const sp = (this.shadowPath ??= new Path2D());
      const ssw = Math.max(0.8, 0.013 * s);
      const sx = hx + this.shKx * hpx;
      const sy = py + this.shKy * hpx;
      sp.moveTo(px - ssw, py);
      sp.lineTo(px + ssw, py);
      sp.lineTo(sx + ssw, sy);
      sp.lineTo(sx - ssw, sy);
    }
    if (!draw) return;

    // Stem: a thin slab streaming to the ear.
    const stem = paths[B_STEM]!;
    this.mark(B_STEM);
    const sw = Math.max(0.8, 0.013 * s);
    stem.moveTo(px - sw, py);
    stem.lineTo(px + sw, py);
    stem.lineTo(hx + sw * 0.6, hy);
    stem.lineTo(hx - sw * 0.6, hy);

    // The ear: four gold chips stepping up the last stretch of stalk,
    // alternating tight off its axis and TAPERING to the tip — an ear
    // silhouette, not a stack of squares (the first cut's fat equal
    // chips merged into popcorn blobs at gameplay zoom).
    const pr = sd.size * s;
    const gold = paths[B_SEED]!;
    this.mark(B_SEED);
    const dxs = hx - px;
    const dys = hy - py;
    for (let i = 0; i < 4; i++) {
      const t = 1 - i * 0.13;
      const k = SEED_EAR_TAPER[i]! * pr;
      const side = (i & 1) === 0 ? 1 : -1;
      const cx = px + dxs * t + side * pr * 0.4;
      const cy = py + dys * t;
      gold.rect(cx - k * 0.7, cy - k * 0.55, k * 1.4, k * 1.1);
    }
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

  /**
   * Rebake the meadow's SHADE canvas (see underCache). Round 13
   * slimmed this from the old full calm-canvas bake: the blades
   * themselves now live on the row-sprite lane (budgeted, sheared),
   * so this pass builds ONLY the cast quads — ~a quarter of the old
   * beat, and the one place the whole meadow's casts still merge on a
   * single canvas so overlaps never stack (the shadow-layer law).
   */
  private bakeShade(
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
    ox: number,
    oy: number,
    dpr: number,
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
      // THE SETTLED BODY JOINS THE CALM: a body that has stood still
      // long enough excludes nothing — the bake captures its (static)
      // parting exactly as the live path would draw it, and the tiles
      // under a plaza of idle townsfolk go back to one blit. First
      // motion re-arms within a bake window (≤66ms parting onset,
      // under the body's own sprite — invisible), and fresh wakes
      // below keep springing tiles live at frame rate.
      if (d.settled) continue;
      const x1 = d.x + d.vx * horizon;
      const y1 = d.y + d.vy * horizon;
      const reach = disturbReach(d.r);
      const bx0 = Math.floor(Math.min(d.x, x1) - reach);
      const bx1 = Math.floor(Math.max(d.x, x1) + reach);
      const by0 = Math.floor(Math.min(d.y, y1) - reach);
      const by1 = Math.floor(Math.max(d.y, y1) + reach);
      for (let ty = by0; ty <= by1; ty++) {
        for (let tx = bx0; tx <= bx1; tx++) {
          live.add((ty + 8192) * 16384 + (tx + 8192));
        }
      }
    }
    // Only the cast path is built — blades, flowers and roots write
    // nothing when draw is false, so the bucket containers stay
    // untouched and only the shadow path needs the swap ceremony.
    const prevShadow = this.shadowPath;
    this.shadowPath = null;
    const castsOn = this.shOn;
    for (let ty = minTy; ty <= maxTy && castsOn; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = ground(tx, ty);
        if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
        const key = (ty + 8192) * 16384 + (tx + 8192);
        const st = this.tile(tx, ty, t, detail(tx, ty), ground);
        // Fresh wakes spring back at frame rate — keep them live too.
        if (st.wakeAt > 0 && this.nowMs - st.wakeAt < WAKE_LIVE_MS) {
          live.add(key);
          continue;
        }
        if (live.has(key)) continue;
        const wind = windAtInto(WIND_SCRATCH, tx + 0.5, ty + 0.5, this.tSec);
        const f = this.tileFrame(tx, ty, wts);
        this.gatherNear(tx, ty);
        // Pre-gate on the builders' own cast conditions (hpx floor,
        // bin parity) using h*s — an upper bound on hpx, so a skip is
        // never a lost cast. The nap (most of the coat) can never
        // reach the 8px floor and this pass owes it nothing.
        for (const b of st.geom.under) {
          if (b.h * s < 8 || (b.bin & 1) !== 0) continue;
          this.buildBlade(b, st, wind, f, s, true, false);
        }
        if (t === Tile.GrassTall) {
          for (const b of st.geom.north) {
            if (b.h * s < 8 || (b.bin & 1) !== 0) continue;
            this.buildBlade(b, st, wind, f, s, true, false);
          }
          for (const b of st.geom.south) {
            if (b.h * s < 8 || (b.bin & 1) !== 0) continue;
            this.buildBlade(b, st, wind, f, s, true, false);
          }
        }
        for (const fl of st.geom.flowers) {
          if (fl.h * s < 6) continue;
          this.buildFlower(fl, st, wind, f, s, true, false);
        }
        for (const sd of st.geom.seeds) {
          if (sd.h * s < 6 || (sd.bin & 1) !== 0) continue;
          this.buildSeed(sd, st, wind, f, s, true, false);
        }
      }
    }

    // THE SHADE BAKES ONCE (Epic1 B4): the calm cast monolith bakes into
    // the canvas in screen space, once per bake beat; drawUnder blits it
    // flat each frame — no per-frame rebake.
    // Rasterize the merged casts, anchored at the padded bounds'
    // top-left in the bake frame's screen space (CSS px onto a
    // dpr-resolution backing). Margin covers cast throw past a tile.
    const pTL = wts(minTx, minTy);
    const pBR = wts(maxTx + 1, maxTy + 1);
    const margin = 1.5 * s;
    const canvasX0 = Math.floor(Math.min(pTL.x, pBR.x) - margin);
    const canvasY0 = Math.floor(Math.min(pTL.y, pBR.y) - margin);
    const cw = Math.ceil(Math.abs(pBR.x - pTL.x) + margin * 2);
    const chh = Math.ceil(Math.abs(pBR.y - pTL.y) + margin * 2);
    const hasShadow = this.shadowPath !== null;
    {
      const bw = Math.ceil(cw * dpr);
      const bh = Math.ceil(chh * dpr);
      if (!this.shadowCanvas) {
        this.shadowCanvas = document.createElement('canvas');
        this.shadowCtx = this.shadowCanvas.getContext('2d');
      }
      const scv = this.shadowCanvas;
      if (scv.width !== bw || scv.height !== bh) {
        scv.width = bw;
        scv.height = bh;
      }
      if (hasShadow || this.underCache?.hasShadow) {
        const sctx = this.shadowCtx!;
        sctx.setTransform(dpr, 0, 0, dpr, -canvasX0 * dpr, -canvasY0 * dpr);
        sctx.clearRect(canvasX0, canvasY0, cw, chh);
        if (this.shadowPath) {
          // Opaque at bake: the meadow's own overlapping casts merge into
          // one density here; flushShadows applies the layer alpha.
          sctx.fillStyle = this.shFill;
          sctx.fill(this.shadowPath);
        }
      }
    }

    this.underCache = {
      ox,
      oy,
      canvasX0,
      canvasY0,
      scale: s,
      dpr,
      bakedAtMs: this.nowMs,
      minTx,
      maxTx,
      minTy,
      maxTy,
      live,
      shKx: this.shKx,
      shKy: this.shKy,
      shOn: this.shOn,
      shFill: this.shFill,
      hasShadow,
    };
    // The monolith owns the calm casts; restore the caller's live path so
    // drawUnder's live tiles append their casts to shadowPath.
    this.shadowPath = prevShadow;
  }

  /**
   * The under-layer: every short blade, nap chip, clump, flower, and
   * seed-head in bounds — drawn beneath entities. Tall thickets
   * contribute only their nap underbrush here; their mass y-sorts via
   * collectTall. Since round 13 the blades ride the row-sprite lane
   * (THE MEADOW RIDES THE SHEAR): calm cells blit their cadence
   * sprites through the live wind shear, disturbed/waking tiles build
   * live — the old monolithic calm canvas re-tessellated the entire
   * viewport's coat every 66ms, a measured multi-ms burst at 15Hz
   * that read as micro-stutter on fast panels. Only the SHADE still
   * bakes monolithically (cast-only, ~a quarter of the old beat),
   * because casts must merge on one canvas so overlaps never stack.
   */
  drawUnder(
    ctx: CanvasRenderingContext2D,
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
  ): void {
    // The ctx's device-pixel ratio, read off its transform (a pure
    // dpr scale in both the renderer and the landing scene) — the calm
    // canvas bakes at this resolution so the blit is 1:1 device px.
    const m = this.frameTransform(ctx);
    const dpr = m.a || 1;
    const o = wts(0, 0);
    let c = this.underCache;
    // THE SHADE BAKES ONCE (Epic1 B4): the calm monolith bakes once per
    // beat and is REUSED across frames (bake-once/blit-many cadence).
    let needBake =
      !c ||
      c.scale !== s ||
      c.dpr !== dpr ||
      this.nowMs - c.bakedAtMs >= UNDER_CACHE_MS ||
      Math.abs(c.shKx - this.shKx) > 0.004 ||
      Math.abs(c.shKy - this.shKy) > 0.004 ||
      c.shOn !== this.shOn ||
      c.shFill !== this.shFill ||
      bounds.minTx < c.minTx ||
      bounds.maxTx > c.maxTx ||
      bounds.minTy < c.minTy ||
      bounds.maxTy > c.maxTy;
    // Escape hatch: a disturber outside every predicted box (teleport,
    // fresh projectile) must not displace BAKED blades — rebake now,
    // not at the next beat, so displacement never lags.
    if (!needBake && c) {
      outer: for (const d of this.live) {
        // THE SETTLED BODY JOINS THE CALM: a settled body's parting is
        // IN the bake — to this hatch it is not a displacement at all.
        // The moment it moves, settled flips false, the hatch sees its
        // tiles missing from the exclusion set, and the rebake lands
        // THIS frame: motion onset never lags the calm canvas.
        if (d.settled) continue;
        const reach = disturbReach(d.r);
        const tx0 = Math.floor(d.x - reach);
        const tx1 = Math.floor(d.x + reach);
        const ty0 = Math.floor(d.y - reach);
        const ty1 = Math.floor(d.y + reach);
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
      this.bakeShade(ground, detail, bounds, wts, s, o.x, o.y, dpr);
      c = this.underCache;
    }
    const cache = c!;
    this.cacheDx = o.x - cache.ox;
    this.cacheDy = o.y - cache.oy;
    // THE CAST LIES UNDER THE COAT (the z-order law): a blade's
    // shadow is ground-plane paint, and every standing blade occludes
    // any cast behind it — so the meadow composites its OWN shade
    // first and lays every blade over it. The old flow parked grass
    // casts on the shared prepass layer, which composites AFTER this
    // pass: the whole meadow's shade stamped over the blades, and the
    // 2.5D read collapsed (user screenshot). Grass shade — short coat
    // and thicket casts alike — rides this composite; big casters
    // (props, trees, bodies) keep the shared layer, whose shade
    // honestly DRAPES over the standing coat.
    // 1. Walk the row cells FIRST but paint nothing: cell bakes and
    // live tiles land in the containers (live casts into shadowPath),
    // and each usable sprite defers its blit — so every cast, baked
    // and live, composites under every blade.
    this.ensurePaths();
    const defer = this.underBlitScratch;
    defer.length = 0;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let c0 = cellStartTx(bounds.minTx); c0 <= bounds.maxTx; c0 += GRASS_CELL_SPAN) {
        this.handleRowCell(ctx, m, LANE_UNDER, 0, ty, c0, ground, detail, wts, s, defer);
      }
    }
    // 2. The whole meadow's shade — the baked cast canvas (opaque at
    // bake, one alpha here: overlaps merged) and the live tiles' cast
    // path — lands BEFORE any blade.
    const cached = cache.hasShadow ? this.shadowCanvas : null;
    if (cached || this.shadowPath) {
      ctx.globalAlpha = this.shAlpha;
      if (cached) {
        // The flat monolith blit, 1:1 device px.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(
          cached,
          Math.round(m.a * (cache.canvasX0 + this.cacheDx) + m.e),
          Math.round(m.d * (cache.canvasY0 + this.cacheDy) + m.f),
        );
        ctx.restore();
      }
      if (this.shadowPath) {
        ctx.fillStyle = this.shFill;
        ctx.fill(this.shadowPath);
        this.shadowPath = null;
      }
      ctx.globalAlpha = 1;
    }
    // 3. The calm cells' blades: one sheared blit per cell.
    for (let i = 0; i < defer.length; i++) {
      const b = defer[i]!;
      this.blitRowSprite(ctx, m, b.sp, b.c0, b.ty, wts, s);
    }
    defer.length = 0;
    // 4. The living blades over everything.
    this.flush(ctx);
  }

  /**
   * THE GPU PATH'S BLADE GATHERER (proposal G-2). Walk the SAME
   * level-0 visible tiles drawUnder walks and, instead of drawing,
   * collect each tile's CACHED blade geometry into `out` for the
   * instanced GPU renderer. Reuses the identical this.tile() cache
   * drawUnder reads (no separate generation path — cache misses mint
   * exactly the geometry drawUnder would). Gathers the `under` coat
   * (both grass tiles wear it — THE COAT LAW), and — unless the tall
   * standing mass is being routed to the y-sorted interleave — the tall
   * `north`/`south` blades (GrassTall only). Blade geometry ONLY; flowers,
   * seeds and roots are separate instance types handled later. The
   * blades land SORTED back-to-front by world-y (`by` ascending): the
   * GPU draws them opaque with no depth buffer, so paint order IS the
   * depth. The immutable cached Blade objects are pushed by reference
   * (no copy). `out` is caller-owned and pooled — it is truncated here.
   * Returns the number of blades written.
   *
   * B3 — THE TALL BLADE INTERLEAVES: with `tallInterleave` set, the GPU
   * flat field carries ONLY the short `under` coat (both grass tiles),
   * and the tall standing mass (GrassTall north/south bands) is skipped
   * here so the renderer can route it through the CPU `collectTall`
   * y-sort — a body then walks THROUGH a thicket, blades in front of it
   * occluding the lower body. The `under` coat is short and correctly
   * stays flat below every entity, so the partition is exactly the two
   * depth classes: coat (flat, GPU) vs standing mass (interleaved, CPU).
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
        // NOT being interleaved. Under interleave the CPU collectTall pass
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
        if (ground(tx, ty) !== Tile.GrassTall) continue;
        const geom = this.tile(tx, ty, Tile.GrassTall, detail(tx, ty), ground).geom;
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

  // ---------------------------- THE MEADOW RIDES THE SHEAR (round 13)

  /** World-stable cell identity: lane, elevation level, row, cell. */
  private static rowKey(lane: number, level: number, ty: number, c0: number): number {
    return (((ty + 8192) * 1024 + (c0 / GRASS_CELL_SPAN + 512)) * 4 + lane) * 16 + level;
  }

  /**
   * THE LEDGER HAS ONE DOOR: release a sprite's canvas back through
   * the pool (or to GC past the pool's byte ceiling) and return its
   * bytes. The caller owns the map entry itself.
   */
  private dropRowSprite(key: number): void {
    const sp = this.rowSprites.get(key);
    if (!sp || !sp.canvas) return;
    const cls = grassPoolClass(sp.canvas.width, sp.canvas.height);
    const bytes = sp.canvas.width * sp.canvas.height * 4;
    if (grassPoolAdmits(this.rowPoolBytes, bytes)) {
      let bucket = this.rowPool.get(cls);
      if (!bucket) {
        bucket = [];
        this.rowPool.set(cls, bucket);
      }
      bucket.push(sp.canvas);
      this.rowPoolBytes += bytes;
    }
    this.rowBytes -= sp.bytes;
    sp.canvas = null;
    sp.bytes = 0;
  }

  /** One lane-tile of live geometry — the SAME brush the sprites bake
   *  with, and the same order the old per-frame loops drew in. `cast`
   *  is true only for LIVE under-lane tiles: a cell bake never casts
   *  (the shade bake owns the merged cast canvas), and the tall/row
   *  lanes never did. */
  private buildLaneTile(
    lane: number,
    st: GrassTileState,
    t: number,
    wind: WindSample,
    f: TileFrame,
    s: number,
    cast: boolean,
  ): void {
    if (lane === LANE_TALL_N) {
      for (const b of st.geom.north) this.buildBlade(b, st, wind, f, s);
      return;
    }
    if (lane === LANE_TALL_S) {
      for (const b of st.geom.south) this.buildBlade(b, st, wind, f, s);
      return;
    }
    if (lane === LANE_UNDER) {
      this.buildRoots(st, f, s);
      for (const b of st.geom.under) this.buildBlade(b, st, wind, f, s, cast);
      // Tall thickets y-sort their standing mass via collectTall —
      // the under pass owes only their casts (live tiles; baked casts
      // ride the shade canvas).
      if (cast && t === Tile.GrassTall) {
        for (const b of st.geom.north) this.buildBlade(b, st, wind, f, s, true, false);
        for (const b of st.geom.south) this.buildBlade(b, st, wind, f, s, true, false);
      }
      for (const fl of st.geom.flowers) this.buildFlower(fl, st, wind, f, s, cast);
      for (const sd of st.geom.seeds) this.buildSeed(sd, st, wind, f, s, cast);
      return;
    }
    this.buildRoots(st, f, s);
    for (const b of st.geom.under) this.buildBlade(b, st, wind, f, s);
    for (const b of st.geom.north) this.buildBlade(b, st, wind, f, s);
    for (const b of st.geom.south) this.buildBlade(b, st, wind, f, s);
    for (const fl of st.geom.flowers) this.buildFlower(fl, st, wind, f, s);
    for (const sd of st.geom.seeds) this.buildSeed(sd, st, wind, f, s);
  }

  /**
   * Bake one row cell into a sprite. SAME-BRUSH: the live builders
   * paint under a re-anchored tile frame (local origin at the cell's
   * first tile, the row's own sx/sy), so bake output is the live
   * output verbatim. Returns the stored entry, or null when the
   * frame's bake spend is gone (the caller draws live and retries).
   */
  private bakeRowCell(
    key: number,
    lane: number,
    ty: number,
    c0: number,
    s: number,
    dpr: number,
    usedMask: number,
    liveNowMask: number,
    sig: number,
    wts: WTS,
    urgent: 'first' | 'hatch' | 'cadence',
    iLo: number,
    iHi: number,
  ): RowSprite | null {
    if (urgent === 'hatch') {
      // A hatch has USABLE pixels in hand — declining it degrades to
      // a live draw of a cell that will settle on its own. The
      // runaway guard is legitimate here.
      if (this.urgentMsLeft <= 0) return null;
    } else if (urgent === 'first') {
      // LAW 2 COMPLETED (bakeAdmission's law): a first-sight cell
      // rides the ms window while it lasts and a COUNT FLOOR past it
      // — declined, the cell SKIPS the frame (blades pop in a few
      // frames later) instead of rebuilding its full blade geometry
      // live. The live rebuild was the grass half of the measured
      // 3fps spiral (171 cells a frame at 20x throttle); unbounded
      // admission measured as 2-3 second arrival frames. The floor
      // bounds both.
      if (this.urgentMsLeft <= 0) {
        if (this.firstCellsLeft <= 0) return null;
        this.firstCellsLeft--;
      }
    } else if (this.bakeMsLeft <= 0) {
      // THE CACHE ALWAYS GAINS GROUND: one guaranteed bake per frame
      // keeps the cadence queue draining under any budget.
      if (this.bakeFloorLeft <= 0) return null;
      this.bakeFloorLeft--;
    }
    const t0 = performance.now();
    const f0 = this.tileFrame(c0 + iLo, ty, wts);
    const sx = f0.sx;
    const sy = f0.sy;
    // Margins: sideways lean + wind throw + clump fan (≤ ~0.65 tiles,
    // seed stalks streaming); above, the tallest accent blade or stem.
    const mx = s * 0.8;
    const my = s * 0.8 + 4;
    const wCss = (iHi - iLo + 1) * Math.abs(sx) + mx * 2;
    const hCss = my + Math.abs(sy) + 2;
    // Canvases allocate at the 64px shape class, so every pool bucket
    // holds identically-sized canvases and reuse never reallocates.
    const w = Math.ceil((wCss * dpr) / 64) * 64;
    const h = Math.ceil((hCss * dpr) / 64) * 64;
    const bytes = w * h * 4;
    let sp = this.rowSprites.get(key);
    const reuseInPlace = sp?.canvas !== undefined && sp.canvas !== null
      && sp.canvas.width === w && sp.canvas.height === h;
    if (sp && !reuseInPlace) this.dropRowSprite(key);
    if (!sp) {
      sp = {
        canvas: null,
        bytes: 0,
        w,
        h,
        scale: s,
        dpr,
        sx,
        sy,
        mx,
        my,
        bakedAtMs: this.nowMs,
        bakedTerm: 0,
        liveMask: liveNowMask,
        sig,
        used: this.frameNo,
        txOff: iLo,
        center: c0 + (iLo + iHi + 1) / 2,
      };
      this.rowSprites.set(key, sp);
    }
    let canvas = sp.canvas;
    if (!canvas) {
      // THE BUDGET IS AN ADMISSION GATE — decide before painting.
      if (admitGrassSprite(this.rowBytes, bytes) !== GrassVerdict.Admit) {
        sp.canvas = null;
        sp.bytes = 0;
        sp.bakedAtMs = this.nowMs; // the decline's retry clock
        sp.sig = sig;
        sp.scale = s;
        sp.dpr = dpr;
        sp.liveMask = liveNowMask;
        return sp;
      }
      const bucket = this.rowPool.get(grassPoolClass(w, h));
      canvas = bucket && bucket.length > 0 ? bucket.pop()! : null;
      if (canvas) {
        this.rowPoolBytes -= canvas.width * canvas.height * 4;
      } else {
        canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
      }
      this.rowBytes += bytes;
      sp.canvas = canvas;
      sp.bytes = bytes;
    }
    const sctx = canvas.getContext('2d')!;
    // A borrowed canvas must be CLEARED and have its TRANSFORM RESET —
    // it holds the previous bake's pixels and anchor (round 11's law).
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.setTransform(dpr, 0, 0, dpr, mx * dpr, my * dpr);
    // Swap the shared bucket containers for the bake (bakeUnder's own
    // ceremony) — the builders all write through `this`.
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
    const bakeMask = usedMask & ~liveNowMask;
    for (let i = iLo; i <= iHi; i++) {
      if ((bakeMask & (1 << i)) === 0) continue;
      const tx = c0 + i;
      const st = this.cellSt[i]!;
      const wind = windAtInto(WIND_SCRATCH, tx + 0.5, ty + 0.5, this.tSec);
      this.gatherNear(tx, ty);
      this.buildLaneTile(lane, st, this.cellT[i]!, wind, { x0: (i - iLo) * sx, y0: 0, sx, sy }, s, false);
    }
    this.fillBuckets(sctx, paths, this.touchedFlag);
    this.paths = prevPaths;
    this.touchedFlag = prevFlags;
    this.touched = prevTouched;
    this.shadowPath = prevShadow;
    sp.center = c0 + (iLo + iHi + 1) / 2;
    const wc = windAtInto(WIND_SCRATCH, sp.center, ty + 0.5, this.tSec);
    sp.w = w;
    sp.h = h;
    sp.scale = s;
    sp.dpr = dpr;
    sp.sx = sx;
    sp.sy = sy;
    sp.mx = mx;
    sp.my = my;
    sp.bakedAtMs = this.nowMs;
    sp.bakedTerm = windTerm(wc.bx, wc.by);
    sp.liveMask = liveNowMask;
    sp.sig = sig;
    sp.txOff = iLo;
    const dt = performance.now() - t0;
    if (urgent !== 'cadence') this.urgentMsLeft -= dt;
    else this.bakeMsLeft -= dt;
    this.rowStats.bake++;
    return sp;
  }

  /**
   * Blit one baked cell through the live wind-delta shear about the
   * row's mid-depth base line: tips track the cantilever at frame
   * rate, and a missed cadence beat degrades into a larger (capped)
   * shear instead of a stutter.
   */
  private blitRowSprite(
    ctx: CanvasRenderingContext2D,
    m: DOMMatrix,
    sp: RowSprite,
    c0: number,
    ty: number,
    wts: WTS,
    s: number,
  ): void {
    const p = wts(c0 + sp.txOff, ty);
    const wNow = windAtInto(WIND_SCRATCH, sp.center, ty + 0.5, this.tSec);
    const shx = rowShear(windTerm(wNow.bx, wNow.by), sp.bakedTerm);
    if (this.stagePush) {
      // THE WORLD ON STAGE: the same shear, as a quad. Dest-local is
      // the sprite's own device px; a = r/dpr maps them to CSS at the
      // rescale ratio, exactly the setTransform below divided by the
      // live device ratio (the backend multiplies it back). The affine
      // `m` pins the raster's ground line (roots, raster CSS (mx,my)) to
      // `p` = wts(westTile, ty) and stands the blades UP by `r·my`.
      const r = s / sp.scale;
      const refY = sp.sy * 0.5;
      this.stagePush({
        kind: 'quad',
        tex: this.stageTexFor(sp),
        sx: 0,
        sy: 0,
        sw: sp.w,
        sh: sp.h,
        dw: sp.w,
        dh: sp.h,
        m: [
          r / sp.dpr,
          0,
          (-r * shx) / sp.dpr,
          r / sp.dpr,
          p.x - r * sp.mx + r * shx * (refY + sp.my),
          p.y - r * sp.my,
        ],
        alpha: 1,
        blend: StageBlend.SourceOver,
      });
      this.rowStats.blit++;
      return;
    }
    const K = m.a * (s / sp.scale);
    const bx = m.a * p.x + m.e;
    const by = m.d * p.y + m.f;
    const refY = sp.sy * 0.5;
    ctx.setTransform(
      K / sp.dpr,
      0,
      (-K * shx) / sp.dpr,
      K / sp.dpr,
      bx - K * sp.mx + K * shx * (refY + sp.my),
      by - K * sp.my,
    );
    ctx.drawImage(sp.canvas!, 0, 0, sp.w, sp.h, 0, 0, sp.w, sp.h);
    ctx.setTransform(m);
    this.rowStats.blit++;
  }

  /**
   * One cell of one lane, one frame: scan, decide, blit through the
   * live wind-delta shear, and build the excluded tiles live. The
   * sprite is a cache, never a mode — every decline or miss paints
   * live through the exact pre-sprite path (THE STILL-WORLD BARGAIN).
   * The under lane hands its blit to `defer` so the meadow's shade
   * can composite beneath every calm blade.
   */
  private handleRowCell(
    ctx: CanvasRenderingContext2D,
    m: DOMMatrix,
    lane: number,
    level: number,
    ty: number,
    c0: number,
    ground: Sampler,
    detail: DetailFn,
    wts: WTS,
    s: number,
    defer: Array<{ sp: RowSprite; c0: number; ty: number }> | null = null,
  ): void {
    let sig = 0;
    let usedMask = 0;
    let liveNowMask = 0;
    for (let i = 0; i < GRASS_CELL_SPAN; i++) {
      const tx = c0 + i;
      const t = ground(tx, ty);
      const use = laneUses(lane, t);
      this.cellSt[i] = null;
      if (!use) {
        sig = (sig * 31) | 0;
        continue;
      }
      const det = detail(tx, ty);
      sig = (sig * 31 + (t! * 8 + det + 1)) | 0;
      usedMask |= 1 << i;
      const st = this.tile(tx, ty, t!, det, ground);
      this.cellSt[i] = st;
      this.cellT[i] = t!;
      let liveTile = false;
      const e = this.disturberIndex.get((ty + 8192) * 16384 + (tx + 8192));
      if (e !== undefined && e.epoch === this.indexEpoch) {
        // Settled bodies bake their (static) parting in — THE SETTLED
        // BODY JOINS THE CALM, the same bargain the calm canvas keeps.
        for (const d of e.list) {
          if (!d.settled) {
            liveTile = true;
            break;
          }
        }
      }
      if (!liveTile && st.wakeAt > 0 && this.nowMs - st.wakeAt < WAKE_LIVE_MS) liveTile = true;
      if (liveTile) liveNowMask |= 1 << i;
    }
    if (usedMask === 0) return;
    // A cell of one lone tile builds live for less than its sprite's
    // bookkeeping — no bake, no ledger entry.
    let iLo = 0;
    while ((usedMask & (1 << iLo)) === 0) iLo++;
    let iHi = GRASS_CELL_SPAN - 1;
    while ((usedMask & (1 << iHi)) === 0) iHi--;
    // Lone tiles USED to build live ("less than the sprite's
    // bookkeeping") — true for one frame on a fast machine, and the
    // measured wilds stall on a slow one: scattered single grass
    // tiles rebuilt full blade geometry every frame, ~85ms of the
    // 20x-throttle frame. They ride the sprite lane now.
    if (!this.rowSpritesOn) {
      for (let i = iLo; i <= iHi; i++) {
        if ((usedMask & (1 << i)) === 0) continue;
        const tx = c0 + i;
        if (this.stagePush) {
          this.stageLive.push({ lane, tx, ty });
          continue;
        }
        const st = this.cellSt[i]!;
        const wind = windAtInto(WIND_SCRATCH, tx + 0.5, ty + 0.5, this.tSec);
        this.gatherNear(tx, ty);
        this.buildLaneTile(lane, st, this.cellT[i]!, wind, this.tileFrame(tx, ty, wts), s, lane === LANE_UNDER);
        this.rowStats.live++;
      }
      return;
    }
    const dpr = m.a || 1;
    const key = GrassSystem.rowKey(lane, level, ty, c0);
    let sp = this.rowSprites.get(key);
    // A live tile the bake did not exclude means the sprite's pixels
    // under a moving body are wrong THIS frame — the hatch rebakes
    // now, exactly like the calm canvas's escape hatch.
    const hatch = sp !== undefined && sp.canvas !== null && (liveNowMask & ~sp.liveMask) !== 0;
    // First sight = NOTHING usable in hand (absent, content-stale, or
    // wrong grid) — the unconditional lane. A hatch has good pixels
    // and merely needs them refreshed under a moving body.
    const missing = sp === undefined || sp.canvas === null || sp.sig !== sig || sp.dpr !== dpr;
    if (missing || hatch) {
      sp = this.bakeRowCell(key, lane, ty, c0, s, dpr, usedMask, liveNowMask, sig, wts, missing ? 'first' : 'hatch', iLo, iHi) ?? sp;
    } else if (
      // !missing implies sp is defined (missing covers undefined).
      this.nowMs - sp!.bakedAtMs > this.rowCadenceMs + rowCadenceJitter(key, this.rowCadenceMs) ||
      (sp!.canvas !== null && !scaleFresh(s, sp!.scale))
    ) {
      sp = this.bakeRowCell(key, lane, ty, c0, s, dpr, usedMask, liveNowMask, sig, wts, 'cadence', iLo, iHi) ?? sp;
    }
    const usable =
      sp !== undefined &&
      sp.canvas !== null &&
      sp.sig === sig &&
      sp.dpr === dpr &&
      scaleFresh(s, sp.scale) &&
      (liveNowMask & ~sp.liveMask) === 0;
    let liveMask: number;
    if (usable) {
      const spr = sp!;
      spr.used = this.frameNo;
      if (defer) defer.push({ sp: spr, c0, ty });
      else this.blitRowSprite(ctx, m, spr, c0, ty, wts, s);
      liveMask = (spr.liveMask | liveNowMask) & usedMask;
    } else if (sp === undefined || sp.canvas === null) {
      // LAW 2's decline: nothing usable in hand and no mint this
      // frame — the cell SKIPS (blades pop in when its mint lands).
      this.rowStats.over++;
      liveMask = 0;
    } else {
      this.rowStats.over++;
      liveMask = usedMask;
    }
    if (liveMask !== 0) {
      for (let i = 0; i < GRASS_CELL_SPAN; i++) {
        if ((liveMask & (1 << i)) === 0) continue;
        const st = this.cellSt[i];
        if (!st) continue;
        const tx = c0 + i;
        if (this.stagePush) {
          this.stageLive.push({ lane, tx, ty });
          continue;
        }
        const wind = windAtInto(WIND_SCRATCH, tx + 0.5, ty + 0.5, this.tSec);
        const f = this.tileFrame(tx, ty, wts);
        this.gatherNear(tx, ty);
        this.buildLaneTile(lane, st, this.cellT[i]!, wind, f, s, lane === LANE_UNDER);
        this.rowStats.live++;
      }
    }
  }

  /**
   * Tall grass as y-sorted items: each thicket splits at its midline
   * into two depth bands, so a body standing inside it is wrapped —
   * blades behind it draw first, blades in front draw over.
   */
  collectTall(
    items: Array<{ sortY: number; draw?: () => void; stageSafe?: true }>,
    ctx: CanvasRenderingContext2D,
    ground: Sampler,
    detail: DetailFn,
    bounds: GrassBounds,
    wts: WTS,
    s: number,
  ): void {
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      // All tall tiles in a row share their two band depths, so a
      // whole row batches into two items. Each band walks the row's
      // world-aligned cells: calm cells blit their cadence sprite
      // through the live shear, disturbed tiles build live.
      let any = false;
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        if (ground(tx, ty) === Tile.GrassTall) {
          any = true;
          break;
        }
      }
      if (!any) continue;
      const bands: Array<[number, number]> = [
        [LANE_TALL_N, ty + 0.26],
        [LANE_TALL_S, ty + 0.76],
      ];
      for (const [lane, sortY] of bands) {
        items.push({
          sortY,
          stageSafe: true,
          draw: () => {
            this.ensurePaths();
            const m = this.frameTransform(ctx);
            for (let c0 = cellStartTx(bounds.minTx); c0 <= bounds.maxTx; c0 += GRASS_CELL_SPAN) {
              this.handleRowCell(ctx, m, lane, 0, ty, c0, ground, detail, wts, s);
            }
            if (this.stagePush) this.stageDrainLive(ground, detail, wts, s);
            else this.flush(ctx);
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
    level = 0,
  ): void {
    this.ensurePaths();
    const m = this.frameTransform(ctx);
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let c0 = cellStartTx(bounds.minTx); c0 <= bounds.maxTx; c0 += GRASS_CELL_SPAN) {
        this.handleRowCell(ctx, m, LANE_ROW, level, ty, c0, ground, detail, wts, s);
      }
    }
    if (this.stagePush) this.stageDrainLive(ground, detail, wts, s);
    else this.flush(ctx);
  }
}
