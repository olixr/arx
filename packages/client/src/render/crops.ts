/**
 * Farm-crop art — the gardening system's plants, spoken in the
 * forage-flora dialect (render/flora.ts) at cultivated-row scale.
 *
 * THE CROP LAWS (the forage laws, tended by hand):
 * - A planted row is a PROUD PLANT, not ground clutter: bold blocky
 *   silhouettes, flat fills, hard chamfers — never wispy strokes.
 * - The HARVEST is the protagonist: what you pick is the biggest,
 *   brightest thing on the plant — fat orange carrot crowns, a
 *   nodding gold sunflower disc, heavy wheat heads, white cotton
 *   puffs, glowing lanterns. Ripe payloads TWINKLE (beacon law) so a
 *   field tells you what's ready from across the screen.
 * - STAGES read at a glance: sprout = hopeful shoots on a dug mound;
 *   mid = a lush green juvenile with the species' silhouette already
 *   forming; ripe = the payload arrives in its accent color, which
 *   appears at NO earlier stage.
 * - Grounded, always: parting shadow + turned-earth clods at the
 *   feet — a crop stands IN worked soil, not on it.
 * - ONE wind: primary sway samples the shared field; payloads ride a
 *   LAGGED secondary beat (heads bob after the stems).
 * - KIN LAW: field sagewort and moonbell are the SAME herbs as their
 *   wild cousins — they paint through the wild painters with tamer,
 *   tidier models, so forager and farmer learn one vocabulary.
 *
 * Scale (body-ruler law, rig ≈ 1.15 tiles): sprouts shin-high, most
 * ripe rows hip-high, wheat to the waist, sunflower/moonbell to the
 * chest — a field you visibly wade through.
 */

import { Tile } from '@arx/shared';
import { isCropTile } from '@arx/content';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { shade } from './rig.js';
import { windScalarAt } from './grass.js';
import {
  OUTLINE,
  floraModel,
  litter,
  MOON_BELL,
  MOON_LEAF,
  mulberry,
  paintFlora,
  paintMasses,
  partingShadow,
  sparkle,
  twinkle,
  type FloraFrame,
  type FloraMass,
  type FloraModel,
  type FloraPaddle,
  type FloraSpire,
  type FloraStem,
} from './flora.js';

// ---- palettes ---------------------------------------------------------

/** Turned-earth chips at every crop's feet (field litter). */
const SOIL_CHIPS = ['#57422a', '#8a6a45', '#3f2d1a'] as const;
/** Carrot plume greens — lusher than turf, feathery and bright. */
const CARROT_LEAF = ['#3d6e2e', '#549447', '#74b258'] as const;
/** The carrot itself: gem-law trio, orange lives nowhere else. */
const CARROT = { deep: '#a04f14', face: '#e8813a', glint: '#ffc37e' };
/** Sunflower: stalk greens, two alternating petal golds, seed heart. */
const SUN_STALK = ['#4d7a33', '#659a44'] as const;
const SUN_PETAL = ['#e3b33c', '#f2d264'] as const;
const SUN_HEART = { deep: '#5d3f1f', mid: '#7a5528', seed: '#3a2912' };
/** Wheat: green youth, then warm harvest gold. */
const WHEAT_LEAF = ['#5a8034', '#79a24a', '#98bf60'] as const;
const WHEAT_GOLD = { deep: '#a8752a', face: '#e0ae43', glint: '#f6e09b' };
/** Cotton: a dark shrub so the white payload burns against it. */
const COTTON_LEAF = ['#2e5c33', '#427a3f', '#579551'] as const;
const COTTON_PUFF = { under: '#d5cfc5', body: '#f2efe8', lit: '#ffffff' };
const COTTON_HUSK = '#5d4630';
/** Seedling greens — bright enough to pop on dark tilled soil. */
const SPROUT_LEAF = ['#6fb84f', '#8fd06a', '#a5de7c'] as const;

// ---- model ------------------------------------------------------------

/** A ripe carrot crown shouldering out of the soil. */
interface CropCrown {
  x: number;
  w: number; // shoulder width, tiles
  lift: number; // proud-of-soil height, tiles
  seed: number;
}

/** One wheat stalk; ripe stalks carry the stacked kernel head. */
interface CropHead {
  x0: number;
  len: number;
  lean: number;
  tone: number; // 0 back row (shaded) | 1 front row
  rungs: number;
  /** Mid-stage: a slim closed green spikelet at the tip (not yet headed out). */
  spike: boolean;
}

/** A cotton boll riding its foliage mass's rustle. */
interface CropBoll {
  x: number;
  y: number;
  r: number;
  mass: number;
  seed: number;
}

/** A chunky serrated plume blade (carrot tops). */
interface CropPlume {
  x0: number;
  len: number;
  lean: number;
  tone: number;
}

export interface CropModel {
  crop: number; // 0 sprout, 1 carrot, 2 sunflower, 3 wheat, 4 cotton, 5 moonbell-mid
  stage: 0 | 1 | 2;
  variant: number;
  height: number;
  spread: number;
  seed: number;
  masses: FloraMass[];
  plumes: CropPlume[];
  crowns: CropCrown[];
  heads: CropHead[];
  bolls: CropBoll[];
  stems: FloraStem[];
  sun?: { lean: number; headR: number; leaves: Array<{ hf: number; dir: number; len: number }> };
}

export type PlantModel = FloraModel | CropModel;

const isCropModel = (m: PlantModel): m is CropModel => 'crop' in m;

const cache = new Map<number, PlantModel>();

/**
 * The one model resolver for every grown plant tile — wild forage
 * nodes fall through to floraModel; crop tiles grow here.
 */
export function plantModel(tile: Tile, h: number): PlantModel {
  // Membership is content's call (Phase 2 grew the roster far past
  // the founding 41..53 range) — anything else is wild flora.
  if (!isCropTile(tile)) return floraModel(tile, h);
  // Tile ids passed 255 with the crop wave — the key must never mask.
  const key = tile * 0x10000 + (h & 0xffff);
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 400) cache.clear();
  const m = growCrop(tile, h);
  cache.set(key, m);
  return m;
}

/** Paint any grown plant — dispatches wild species to paintFlora. */
export function paintPlant(ctx: CanvasRenderingContext2D, m: PlantModel, f: FloraFrame): void {
  if (!isCropModel(m)) {
    paintFlora(ctx, m, f);
    return;
  }
  const wind = f.windOverride !== undefined ? f.windOverride : windScalarAt(f.wx, f.wy, f.tSec);
  if (m.crop === 0) paintSprout(ctx, m, f, wind);
  else if (m.crop === 1) paintCarrot(ctx, m, f, wind);
  else if (m.crop === 2) paintSunflower(ctx, m, f, wind);
  else if (m.crop === 3) paintWheat(ctx, m, f, wind);
  else if (m.crop === 4) paintCotton(ctx, m, f, wind);
  else if (m.crop === 5) paintMoonbellMid(ctx, m, f, wind);
  else if (m.crop <= 8) paintRootRow(ctx, m, f, wind);
  else if (m.crop === 9) paintCabbage(ctx, m, f, wind);
  else if (m.crop <= 11) paintGourd(ctx, m, f, wind);
  else if (m.crop === 12) paintBarley(ctx, m, f, wind);
  else if (m.crop <= 17) paintHerbRow(ctx, m, f, wind);
  else if (m.crop <= 20) paintOrchard(ctx, m, f, wind);
  else if (m.crop === 21) paintBramble(ctx, m, f, wind);
  else paintLogBed(ctx, m, f, wind);
}

// ---- growth -----------------------------------------------------------

function blank(crop: number, stage: 0 | 1 | 2, variant: number, seed: number): CropModel {
  return {
    crop,
    stage,
    variant,
    height: 0.4,
    spread: 0.4,
    seed,
    masses: [],
    plumes: [],
    crowns: [],
    heads: [],
    bolls: [],
    stems: [],
  };
}

function growCrop(tile: Tile, h: number): PlantModel {
  const variant = (h >>> 5) % 3;
  const rnd = mulberry(h ^ (tile * 0x9e37) ^ 0x5eed);
  switch (tile) {
    case Tile.CropSprout:
      return growSprout(variant, h, rnd);
    case Tile.CarrotMid:
      return growCarrot(1, variant, h, rnd);
    case Tile.CarrotRipe:
      return growCarrot(2, variant, h, rnd);
    case Tile.SagewortMid:
      return growFieldSagewort(1, variant, h, rnd);
    case Tile.SagewortRipe:
      return growFieldSagewort(2, variant, h, rnd);
    case Tile.SunflowerMid:
      return growSunflower(1, variant, h, rnd);
    case Tile.SunflowerRipe:
      return growSunflower(2, variant, h, rnd);
    case Tile.WheatMid:
      return growWheat(1, variant, h, rnd);
    case Tile.WheatRipe:
      return growWheat(2, variant, h, rnd);
    case Tile.CottonMid:
      return growCotton(1, variant, h, rnd);
    case Tile.CottonRipe:
      return growCotton(2, variant, h, rnd);
    case Tile.MoonbellMid:
      return growFieldMoonbellMid(variant, h, rnd);
    case Tile.MoonbellRipe:
      return growFieldMoonbellRipe(variant, h, rnd);
    // THE FULL FIELD (Phase 2): lean models — the painters lay their
    // detail from the seed (see the Phase 2 section at file's end).
    case Tile.PotatoMid: return growPhase2(6, 1, h);
    case Tile.PotatoRipe: return growPhase2(6, 2, h);
    case Tile.OnionMid: return growPhase2(7, 1, h);
    case Tile.OnionRipe: return growPhase2(7, 2, h);
    case Tile.RedrootMid: return growPhase2(8, 1, h);
    case Tile.RedrootRipe: return growPhase2(8, 2, h);
    case Tile.CabbageMid: return growPhase2(9, 1, h);
    case Tile.CabbageRipe: return growPhase2(9, 2, h);
    case Tile.PumpkinMid: return growPhase2(10, 1, h);
    case Tile.PumpkinRipe: return growPhase2(10, 2, h);
    case Tile.KingsquashMid: return growPhase2(11, 1, h);
    case Tile.KingsquashRipe: return growPhase2(11, 2, h);
    case Tile.BarleyMid: return growPhase2(12, 1, h);
    case Tile.BarleyRipe: return growPhase2(12, 2, h);
    case Tile.BittercressMid: return growPhase2(13, 1, h);
    case Tile.BittercressRipe: return growPhase2(13, 2, h);
    case Tile.SilverleafMid: return growPhase2(14, 1, h);
    case Tile.SilverleafRipe: return growPhase2(14, 2, h);
    case Tile.DuskthornMid: return growPhase2(15, 1, h);
    case Tile.DuskthornRipe: return growPhase2(15, 2, h);
    case Tile.DawnveilMid: return growPhase2(16, 1, h);
    case Tile.DawnveilRipe: return growPhase2(16, 2, h);
    case Tile.AdderstongueMid: return growPhase2(17, 1, h);
    case Tile.AdderstongueRipe: return growPhase2(17, 2, h);
    case Tile.AppleTreeMid: return growPhase2(18, 1, h);
    case Tile.AppleTreeRipe: return growPhase2(18, 2, h);
    case Tile.PlumTreeMid: return growPhase2(19, 1, h);
    case Tile.PlumTreeRipe: return growPhase2(19, 2, h);
    case Tile.MirefigMid: return growPhase2(20, 1, h);
    case Tile.MirefigRipe: return growPhase2(20, 2, h);
    case Tile.BrambleMid: return growPhase2(21, 1, h);
    case Tile.BrambleRipe: return growPhase2(21, 2, h);
    case Tile.MushroomLogSeeded: return growPhase2(22, 0, h);
    case Tile.PalegillMid: return growPhase2(23, 1, h);
    default:
      return growPhase2(23, 2, h);
  }
}

function growSprout(variant: number, h: number, rnd: () => number): CropModel {
  const m = blank(0, 0, variant, h);
  // Two fat cotyledons and a centre shoot — counts jitter per tile so
  // a freshly sown field isn't a rubber stamp.
  const n = 2 + (variant === 1 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    m.plumes.push({
      x0: u * 0.09 + (rnd() - 0.5) * 0.04,
      len: 0.16 + rnd() * 0.1 + (u === 0 ? 0.06 : 0),
      lean: u * 0.1 + (rnd() - 0.5) * 0.05,
      tone: 1 + ((rnd() * 2) | 0),
    });
  }
  m.height = 0.34;
  m.spread = 0.3;
  return m;
}

function growCarrot(stage: 1 | 2, variant: number, h: number, rnd: () => number): CropModel {
  const m = blank(1, stage, variant, h);
  if (stage === 1) {
    // The lush plume rosette — all the energy is above ground.
    const n = 5 + (variant === 2 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      m.plumes.push({
        x0: u * 0.16 + (rnd() - 0.5) * 0.04,
        len: (0.34 + rnd() * 0.12) * (1 - Math.abs(u) * 0.3),
        lean: u * 0.24 + (rnd() - 0.5) * 0.06,
        tone: (rnd() * 3) | 0,
      });
    }
    m.height = 0.52;
    m.spread = 0.42;
  } else {
    // Harvest: fat orange shoulders heave out of the row. Three (or a
    // lucky four) crowns, each under a modest tuft — the root stole
    // the show from the greens.
    const n = 3 + (variant === 0 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      m.crowns.push({
        x: u * (n === 4 ? 0.3 : 0.26) + (rnd() - 0.5) * 0.05,
        w: 0.19 + rnd() * 0.05,
        lift: 0.15 + rnd() * 0.05,
        seed: (rnd() * 0xffff) | 0,
      });
    }
    for (const c of m.crowns) {
      const k = 2 + ((rnd() * 2) | 0);
      for (let j = 0; j < k; j++) {
        const u = k === 1 ? 0 : (j / (k - 1)) * 2 - 1;
        m.plumes.push({
          x0: c.x + u * 0.06,
          len: 0.2 + rnd() * 0.1,
          lean: u * 0.14 + (rnd() - 0.5) * 0.05,
          tone: (rnd() * 3) | 0,
        });
      }
    }
    m.height = 0.62;
    m.spread = 0.46;
  }
  return m;
}

/**
 * Field sagewort IS wild sagewort, planted: a tidier, smaller rosette
 * painted by the wild painter — same paddles, same silver, and (ripe)
 * the same floret towers.
 */
function growFieldSagewort(stage: 1 | 2, variant: number, h: number, rnd: () => number): FloraModel {
  const m: FloraModel = {
    species: 2,
    variant,
    height: 0.45,
    spread: 0.4,
    seed: h,
    masses: [],
    gems: [],
    blades: [],
    paddles: [],
    spires: [],
    stems: [],
  };
  const rings: Array<[number, number, number, number, number]> =
    stage === 2
      ? [
          [8, 0.26, 0.3, 0.13, 0],
          [6, 0.14, 0.23, 0.12, 1],
          [4, 0.05, 0.15, 0.1, 2],
        ]
      : [
          [7, 0.2, 0.24, 0.12, 0],
          [5, 0.08, 0.17, 0.1, 1],
        ];
  for (const [n, dist, len, w, tier] of rings) {
    const off = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      (m.paddles as FloraPaddle[]).push({
        ang: off + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.14,
        dist,
        len: len * (0.92 + rnd() * 0.16),
        w,
        tier,
      });
    }
  }
  if (stage === 2) {
    const spec: Array<[number, number]> =
      variant === 1
        ? [
            [-0.08, 0.72 + rnd() * 0.1],
            [0.1, 0.86 + rnd() * 0.1],
          ]
        : [
            [-0.12, 0.62 + rnd() * 0.08],
            [0.02, 0.88 + rnd() * 0.1],
            [0.14, 0.56 + rnd() * 0.08],
          ];
    for (const [x, hgt] of spec) (m.spires as FloraSpire[]).push({ x, h: hgt, florets: 3 + ((rnd() * 2) | 0) });
    m.height = m.spires.reduce((t, sp) => Math.max(t, sp.h + 0.12), 0.5);
  }
  m.spread = m.paddles.reduce((w, p) => Math.max(w, p.dist + p.len), 0.35);
  return m;
}

function growSunflower(stage: 1 | 2, variant: number, h: number, rnd: () => number): CropModel {
  const m = blank(2, stage, variant, h);
  const lean = (variant === 1 ? -1 : 1) * (0.06 + rnd() * 0.07);
  const leaves = [
    { hf: 0.34 + rnd() * 0.06, dir: -1, len: 0.26 + rnd() * 0.06 },
    { hf: 0.52 + rnd() * 0.06, dir: 1, len: 0.23 + rnd() * 0.06 },
  ];
  if (stage === 2) {
    m.sun = { lean, headR: 0.24 + rnd() * 0.03, leaves };
    m.height = 1.12;
    m.spread = 0.52;
  } else {
    m.sun = { lean, headR: 0.11 + rnd() * 0.02, leaves };
    m.height = 0.9;
    m.spread = 0.42;
  }
  return m;
}

function growWheat(stage: 1 | 2, variant: number, h: number, rnd: () => number): CropModel {
  const m = blank(3, stage, variant, h);
  // A young stand is a dense green tuft; the mature stand is a sparser
  // set of tall stalks each crowned by a heavy nodding ear.
  const n = stage === 2 ? 6 + (variant === 0 ? 1 : 0) : 8;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const back = i % 2 === 0;
    if (stage === 2) {
      m.heads.push({
        x0: u * 0.3 + (rnd() - 0.5) * 0.04,
        len: (0.5 + rnd() * 0.14) * (1 - Math.abs(u) * 0.18),
        lean: u * 0.16 + (rnd() - 0.5) * 0.06,
        tone: back ? 0 : 1,
        rungs: 3 + ((rnd() * 2) | 0),
        spike: false,
      });
    } else {
      m.heads.push({
        x0: u * 0.2 + (rnd() - 0.5) * 0.04,
        len: (0.42 + rnd() * 0.14) * (1 - Math.abs(u) * 0.2),
        lean: u * 0.2 + (rnd() - 0.5) * 0.06,
        tone: back ? 0 : 1,
        rungs: 0,
        spike: false,
      });
    }
  }
  if (stage === 1) {
    // The tallest few have thrown a slim green spikelet — grain
    // forming, not yet ripe.
    const order = m.heads.map((hd, i) => ({ i, len: hd.len })).sort((a, b) => b.len - a.len);
    for (const o of order.slice(0, 3)) m.heads[o.i]!.spike = true;
  }
  m.height = m.heads.reduce((t, hd) => Math.max(t, hd.len + (hd.rungs ? 0.22 : hd.spike ? 0.14 : 0.04)), 0.4);
  m.spread = m.heads.reduce((w, hd) => Math.max(w, Math.abs(hd.x0 + hd.lean) + 0.14), 0.34);
  return m;
}

function growCotton(stage: 1 | 2, variant: number, h: number, rnd: () => number): CropModel {
  const m = blank(4, stage, variant, h);
  const H = stage === 2 ? 0.5 : 0.42;
  const row = (y: number, halfW: number, n: number, r: number, tone: number): void => {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      m.masses.push({
        x: u * halfW + (rnd() - 0.5) * r * 0.3,
        y: y + (rnd() - 0.5) * r * 0.3,
        r: r * (0.92 + rnd() * 0.16),
        hf: Math.min(1, y / H),
        seed: (rnd() * 0xffff) | 0,
        tone,
      });
    }
  };
  row(H * 0.42, 0.3, 3, 0.2, 0);
  row(H * 0.68, 0.16, 2, 0.18, 1);
  if (variant !== 2) row(H * 0.88, 0, 1, 0.15, 2);
  // Bolls pinned inside the shrub silhouette, riding its rustle.
  const n = stage === 2 ? 4 + ((rnd() * 2) | 0) : 3;
  for (let i = 0; i < n; i++) {
    const mi = (rnd() * m.masses.length) | 0;
    const c = m.masses[mi]!;
    const a = rnd() * Math.PI * 2;
    const d = (0.2 + rnd() * 0.45) * c.r;
    m.bolls.push({
      x: c.x + Math.cos(a) * d,
      y: c.y + Math.sin(a) * d * 0.6 + c.r * 0.15,
      r: stage === 2 ? 0.085 + rnd() * 0.035 : 0.045 + rnd() * 0.015,
      mass: mi,
      seed: (rnd() * 0xffff) | 0,
    });
  }
  m.height = H + 0.14;
  m.spread = m.masses.reduce((w, c) => Math.max(w, Math.abs(c.x) + c.r), 0.4);
  return m;
}

/** Mid-stage field moonbell: the leaf fan is up, the buds still shut. */
function growFieldMoonbellMid(variant: number, h: number, rnd: () => number): CropModel {
  const m = blank(5, 1, variant, h);
  const stem = (dir: number, reach: number, rise: number, buds: Array<[number, number]>): void => {
    m.stems.push({
      dir,
      reach,
      rise,
      bells: buds.map(([u, size]) => ({ u, size, phase: rnd() * Math.PI * 2 })),
    });
  };
  if (variant === 1) {
    stem(rnd() < 0.5 ? -1 : 1, 0.24, 0.68 + rnd() * 0.08, [
      [0.72, 0.09],
      [1, 0.11],
    ]);
  } else {
    stem(-1, 0.22, 0.52 + rnd() * 0.08, [[1, 0.1]]);
    stem(1, 0.26, 0.62 + rnd() * 0.08, [[1, 0.11]]);
  }
  m.height = m.stems.reduce((t, st) => Math.max(t, st.rise + 0.1), 0.5);
  m.spread = m.stems.reduce((w, st) => Math.max(w, st.reach + 0.28), 0.4);
  return m;
}

/**
 * Ripe field moonbell: the true lantern plant, via the wild painter —
 * a garden-tame twin of the highland wildflower.
 */
function growFieldMoonbellRipe(variant: number, h: number, rnd: () => number): FloraModel {
  const m: FloraModel = {
    species: 3,
    variant,
    height: 1,
    spread: 0.5,
    seed: h,
    masses: [],
    gems: [],
    blades: [],
    paddles: [],
    spires: [],
    stems: [],
  };
  const nLeaf = 5;
  for (let i = 0; i < nLeaf; i++) {
    const u = (i / (nLeaf - 1)) * 2 - 1;
    m.blades.push({
      x0: u * 0.12 + (rnd() - 0.5) * 0.03,
      w: 0.09 + rnd() * 0.03,
      len: (0.3 + rnd() * 0.16) * (1 - Math.abs(u) * 0.25),
      lean: u * 0.28 + (rnd() - 0.5) * 0.06,
      tone: (rnd() * 3) | 0,
      head: false,
    });
  }
  const stem = (dir: number, reach: number, rise: number, bells: Array<[number, number]>): void => {
    (m.stems as FloraStem[]).push({
      dir,
      reach,
      rise,
      bells: bells.map(([u, size]) => ({ u, size, phase: rnd() * Math.PI * 2 })),
    });
  };
  if (variant === 1) {
    stem(rnd() < 0.5 ? -1 : 1, 0.28, 0.98 + rnd() * 0.1, [
      [0.6, 0.12],
      [0.82, 0.14],
      [1, 0.17],
    ]);
  } else {
    stem(-1, 0.3, 0.78 + rnd() * 0.1, [
      [0.68, 0.12],
      [1, 0.16],
    ]);
    stem(1, 0.32, 0.9 + rnd() * 0.1, [[1, 0.17]]);
  }
  m.height = m.stems.reduce((t, st) => Math.max(t, st.rise + 0.12), 0.6);
  m.spread = m.stems.reduce((w, st) => Math.max(w, st.reach + 0.3), 0.4);
  return m;
}

// ---- painting ---------------------------------------------------------

/**
 * A chunky serrated plume blade — the carrot-top / seedling leaf: a
 * chisel shaft with alternating diamond leaflets. Fill-only body with
 * a light outline so blades separate against each other.
 */
function plumeBlade(
  ctx: CanvasRenderingContext2D,
  bx: number,
  gy: number,
  s: number,
  p: CropPlume,
  wind: number,
  cols: readonly string[],
  serrated: boolean,
): void {
  const drift = (p.lean + wind * 0.22 * p.len) * s;
  const x0 = bx + p.x0 * s;
  const tipX = x0 + drift;
  const tipY = gy - p.len * s;
  const w = s * 0.075;
  ctx.fillStyle = cols[p.tone]!;
  ctx.beginPath();
  ctx.moveTo(x0 - w * 0.6, gy);
  ctx.lineTo(x0 - w * 0.3 + drift * 0.45, gy - p.len * s * 0.55);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(x0 + w * 0.55 + drift * 0.4, gy - p.len * s * 0.5);
  ctx.lineTo(x0 + w * 0.6, gy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.013);
  ctx.stroke();
  if (!serrated) return;
  // Leaflets: fat diamonds alternating sides up the shaft — the
  // feathery carrot signature, spoken in chunks.
  for (let k = 0; k < 3; k++) {
    const u = 0.3 + k * 0.22;
    const cx = x0 + (tipX - x0) * u;
    const cy = gy + (tipY - gy) * u;
    const side = k % 2 ? 1 : -1;
    const ll = s * (0.085 - k * 0.018);
    ctx.fillStyle = cols[Math.min(2, p.tone + 1)]!;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + side * ll * 0.75, cy - ll * 0.42);
    ctx.lineTo(cx + side * ll * 1.15, cy + ll * 0.1);
    ctx.lineTo(cx + side * ll * 0.45, cy + ll * 0.38);
    ctx.closePath();
    ctx.fill();
  }
}

/** The freshly dug mound every young planting sits in. */
function seedMound(ctx: CanvasRenderingContext2D, bx: number, gy: number, s: number, seed: number, w: number): void {
  ctx.fillStyle = '#4a3520';
  ctx.beginPath();
  facetBlob(ctx, bx, gy - s * 0.015, s * w, seed ^ 0x33, 7, 0.38);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.014);
  ctx.stroke();
  ctx.fillStyle = '#7a5c3a';
  ctx.beginPath();
  facetBlob(ctx, bx - s * w * 0.2, gy - s * 0.045, s * w * 0.42, seed ^ 0x7b, 6, 0.4);
  ctx.fill();
}

function paintSprout(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  partingShadow(ctx, f.bx, f.groundY, s * 0.34);
  seedMound(ctx, f.bx, f.groundY, s, m.seed, 0.2);
  for (const p of m.plumes) plumeBlade(ctx, f.bx, f.groundY - s * 0.03, s, p, wind, SPROUT_LEAF, false);
  litter(ctx, f.bx, f.groundY, s * 0.8, m.seed, SOIL_CHIPS);
}

/** One harvest-ready carrot shoulder: dug ring, tapered orange block. */
function carrotCrown(ctx: CanvasRenderingContext2D, x: number, gy: number, s: number, c: CropCrown): void {
  const w = c.w * s;
  const lift = c.lift * s;
  // The dug ring the root broke through.
  ctx.fillStyle = '#3f2d1a';
  ctx.beginPath();
  facetBlob(ctx, x, gy - s * 0.01, w * 0.72, c.seed ^ 0x19, 7, 0.36);
  ctx.fill();
  // The shoulder: widest proud of the soil, chamfered top — a root
  // with real mass, not a dot of color.
  const cut = w * 0.18;
  ctx.fillStyle = CARROT.deep;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, gy);
  ctx.lineTo(x - w * 0.5, gy - lift * 0.72);
  ctx.lineTo(x - w * 0.5 + cut, gy - lift);
  ctx.lineTo(x + w * 0.5 - cut, gy - lift);
  ctx.lineTo(x + w * 0.5, gy - lift * 0.72);
  ctx.lineTo(x + w * 0.4, gy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.2, s * 0.018);
  ctx.stroke();
  // Bright face biased top-left (sun law), hard glint chip.
  ctx.fillStyle = CARROT.face;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.34, gy - lift * 0.08);
  ctx.lineTo(x - w * 0.38, gy - lift * 0.7);
  ctx.lineTo(x - w * 0.38 + cut, gy - lift * 0.92);
  ctx.lineTo(x + w * 0.3, gy - lift * 0.92);
  ctx.lineTo(x + w * 0.24, gy - lift * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CARROT.glint;
  ctx.fillRect(x - w * 0.26, gy - lift * 0.8, w * 0.22, lift * 0.18);
}

function paintCarrot(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  partingShadow(ctx, f.bx, f.groundY, s * 0.44);
  if (m.stage === 1) {
    for (const p of m.plumes) plumeBlade(ctx, f.bx, f.groundY, s, p, wind, CARROT_LEAF, true);
  } else {
    // Plumes first, crowns in front: the orange must never be buried.
    for (const p of m.plumes) plumeBlade(ctx, f.bx, f.groundY - s * 0.1, s, p, wind, CARROT_LEAF, true);
    for (const c of m.crowns) carrotCrown(ctx, f.bx + c.x * s, f.groundY, s, c);
    const tw = twinkle(f.tSec, m.seed, 3.2);
    if (tw > 0 && m.crowns.length) {
      const c = m.crowns[(m.seed >>> 7) % m.crowns.length]!;
      sparkle(ctx, f.bx + c.x * s, f.groundY - (c.lift + 0.06) * s, s * 0.1, tw * 0.9, CARROT.glint);
    }
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

function paintSunflower(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const sun = m.sun!;
  partingShadow(ctx, f.bx, f.groundY, s * 0.4);
  const H = m.height - (m.stage === 2 ? sun.headR : 0.06);
  const drift = (sun.lean + wind * 0.12) * H;
  const tipX = f.bx + drift * s;
  const tipY = f.groundY - H * s;
  // The stalk: a tapered slab bowing with the wind — mass, not a line.
  const w0 = s * 0.075;
  const w1 = s * 0.045;
  const midX = f.bx + drift * 0.35 * s;
  const midY = f.groundY - H * 0.55 * s;
  ctx.fillStyle = SUN_STALK[0]!;
  ctx.beginPath();
  ctx.moveTo(f.bx - w0, f.groundY);
  ctx.lineTo(midX - w0 * 0.8, midY);
  ctx.lineTo(tipX - w1, tipY);
  ctx.lineTo(tipX + w1, tipY);
  ctx.lineTo(midX + w0 * 0.8, midY);
  ctx.lineTo(f.bx + w0, f.groundY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.014);
  ctx.stroke();
  // Sunlit edge lane up the west side of the stalk.
  ctx.fillStyle = SUN_STALK[1]!;
  ctx.beginPath();
  ctx.moveTo(f.bx - w0 * 0.55, f.groundY);
  ctx.lineTo(midX - w0 * 0.45, midY);
  ctx.lineTo(tipX - w1 * 0.3, tipY);
  ctx.lineTo(tipX - w1 * 0.85, tipY);
  ctx.lineTo(midX - w0 * 0.75, midY);
  ctx.lineTo(f.bx - w0 * 0.9, f.groundY);
  ctx.closePath();
  ctx.fill();
  // Two broad chisel leaves with a drooping tip and a lit midrib.
  for (const lf of sun.leaves) {
    const ax = f.bx + drift * lf.hf * lf.hf * s;
    const ay = f.groundY - H * lf.hf * s;
    const ex = ax + lf.dir * lf.len * s + wind * 0.1 * s;
    const ey = ay - lf.len * 0.28 * s;
    const wl = lf.len * 0.34 * s;
    ctx.fillStyle = SUN_STALK[0]!;
    ctx.beginPath();
    ctx.moveTo(ax, ay + wl * 0.3);
    ctx.lineTo(ax + (ex - ax) * 0.45, ay + (ey - ay) * 0.45 - wl);
    ctx.lineTo(ex, ey + wl * 0.4);
    ctx.lineTo(ax + (ex - ax) * 0.5, ay + (ey - ay) * 0.5 + wl * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.013);
    ctx.stroke();
    ctx.fillStyle = SUN_STALK[1]!;
    ctx.beginPath();
    ctx.moveTo(ax + (ex - ax) * 0.12, ay + (ey - ay) * 0.12);
    ctx.lineTo(ex - (ex - ax) * 0.1, ey);
    ctx.lineTo(ax + (ex - ax) * 0.24, ay + (ey - ay) * 0.24 + wl * 0.26);
    ctx.closePath();
    ctx.fill();
  }
  // Secondary beat: the head nods AFTER the stalk.
  const lag = f.windOverride !== undefined ? wind : windScalarAt(f.wx, f.wy, f.tSec - 0.25);
  const nod = (lag - wind) * 0.5 + sun.lean * 0.4 + wind * 0.12;
  if (m.stage === 1) {
    // The closed bud: a green faceted teardrop with gold peeking out.
    const r = sun.headR * s;
    ctx.save();
    ctx.translate(tipX, tipY - r * 0.4);
    ctx.rotate(nod);
    ctx.fillStyle = '#557f36';
    ctx.beginPath();
    ctx.moveTo(0, r * 1.1);
    ctx.lineTo(-r * 0.9, r * 0.15);
    ctx.lineTo(-r * 0.5, -r * 0.85);
    ctx.lineTo(r * 0.5, -r * 0.85);
    ctx.lineTo(r * 0.9, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1.1, s * 0.016);
    ctx.stroke();
    ctx.fillStyle = SUN_PETAL[1]!;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.lineTo(-r * 0.3, -r * 0.3);
    ctx.lineTo(0, -r * 0.05);
    ctx.lineTo(r * 0.3, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6d9a44';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.5);
    ctx.lineTo(-r * 0.15, -r * 0.4);
    ctx.lineTo(-r * 0.02, r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    // THE DISC — the whole reason to grow one. Dark sepal ruff, two
    // alternating golds of fat diamond petals, a deep seed heart with
    // a sunlit inner disc and a ring of seed chips.
    const r = sun.headR * s;
    ctx.save();
    ctx.translate(tipX, tipY - r * 0.35);
    ctx.rotate(nod);
    ctx.fillStyle = '#3f6127';
    ctx.beginPath();
    facetBlob(ctx, 0, 0, r * 1.06, m.seed ^ 0x44, 10, 1);
    ctx.fill();
    const nP = 12;
    for (let i = 0; i < nP; i++) {
      const a = (i / nP) * Math.PI * 2 + 0.26;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.fillStyle = SUN_PETAL[i % 2]!;
      ctx.beginPath();
      ctx.moveTo(ca * r * 0.42, sa * r * 0.42);
      ctx.lineTo(ca * r * 0.85 - sa * r * 0.17, sa * r * 0.85 + ca * r * 0.17);
      ctx.lineTo(ca * r * 1.32, sa * r * 1.32);
      ctx.lineTo(ca * r * 0.85 + sa * r * 0.17, sa * r * 0.85 - ca * r * 0.17);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = SUN_HEART.deep;
    ctx.beginPath();
    facetCircle(ctx, 0, 0, r * 0.56, 8, 0.3, 1);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1.2, s * 0.018);
    ctx.stroke();
    ctx.fillStyle = SUN_HEART.mid;
    ctx.beginPath();
    facetCircle(ctx, -r * 0.1, -r * 0.1, r * 0.36, 7, 0.5, 1);
    ctx.fill();
    ctx.fillStyle = SUN_HEART.seed;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const d = r * (i % 2 ? 0.24 : 0.4);
      ctx.fillRect(Math.cos(a) * d - r * 0.045, Math.sin(a) * d - r * 0.045, r * 0.09, r * 0.09);
    }
    ctx.restore();
    const tw = twinkle(f.tSec, m.seed, 3);
    if (tw > 0) sparkle(ctx, tipX + r * 0.9, tipY - r * 1.1, s * 0.11, tw * 0.9, SUN_PETAL[1]!);
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** One wheat ear: stacked chevron kernel pairs tapering to awns. */
function wheatEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  rot: number,
  rungs: number,
  green: boolean,
): void {
  const deep = green ? '#4f7a34' : WHEAT_GOLD.deep;
  const face = green ? '#79a24a' : WHEAT_GOLD.face;
  const glint = green ? '#98bf60' : WHEAT_GOLD.glint;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const kw = s * 0.075;
  const kh = s * 0.058;
  const earH = rungs * kh * 1.05;
  // One dark silhouette slab grounds the ear (the fibre-tower law).
  ctx.fillStyle = deep;
  ctx.beginPath();
  chamferRect(ctx, -kw * 1.05, -earH - kh * 0.6, kw * 2.1, earH + kh * 0.9, kw * 0.35);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.1, s * 0.016);
  ctx.stroke();
  // Kernel pairs, a chevron per rung, brightening upward.
  for (let k = 0; k < rungs; k++) {
    const ky = -k * kh * 1.05 - kh * 0.4;
    const kwk = kw * (1 - k * 0.14);
    ctx.fillStyle = k >= rungs - 1 ? glint : face;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * kwk * 0.52, ky);
      ctx.rotate(side * 0.5);
      ctx.beginPath();
      chamferRect(ctx, -kwk * 0.45, -kh * 0.42, kwk * 0.9, kh * 0.84, kwk * 0.2);
      ctx.fill();
      ctx.restore();
    }
  }
  // Awns: two whisker quads splaying from the tip.
  ctx.fillStyle = glint;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * kw * 0.2, -earH - kh * 0.4);
    ctx.lineTo(side * kw * 1.1, -earH - kh * 2.1);
    ctx.lineTo(side * kw * 1.35, -earH - kh * 1.95);
    ctx.lineTo(side * kw * 0.45, -earH - kh * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintWheat(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  partingShadow(ctx, f.bx, f.groundY, s * 0.5);
  const gold = m.stage === 2;
  const lag = f.windOverride !== undefined ? wind : windScalarAt(f.wx, f.wy, f.tSec - 0.22);
  // Back row first, then front — two tones give the stand depth.
  const sorted = [...m.heads].sort((a, b) => a.tone - b.tone);
  for (const hd of sorted) {
    const drift = (hd.lean + wind * 0.24 * hd.len) * s;
    const x0 = f.bx + hd.x0 * s;
    const tipX = x0 + drift;
    const tipY = f.groundY - hd.len * s;
    const w = s * 0.05;
    const stalk = gold
      ? hd.tone
        ? '#c99b3c'
        : '#a8752a'
      : WHEAT_LEAF[hd.tone === 0 ? 0 : 2]!;
    // Stem slab (never a stroke), slightly wider at the boot.
    ctx.fillStyle = stalk;
    ctx.beginPath();
    ctx.moveTo(x0 - w * 0.6, f.groundY);
    ctx.lineTo(x0 - w * 0.25 + drift * 0.45, f.groundY - hd.len * s * 0.55);
    ctx.lineTo(tipX - w * 0.16, tipY);
    ctx.lineTo(tipX + w * 0.16, tipY);
    ctx.lineTo(x0 + w * 0.45 + drift * 0.4, f.groundY - hd.len * s * 0.5);
    ctx.lineTo(x0 + w * 0.6, f.groundY);
    ctx.closePath();
    ctx.fill();
    if (hd.rungs > 0) {
      // The ear bobs with follow-through after its stem.
      const hx = tipX + (lag - wind) * 0.16 * hd.len * s;
      const rot = (hd.lean + lag * 0.28 * hd.len) * 0.55;
      wheatEar(ctx, hx, tipY + s * 0.02, s, rot, hd.rungs, !gold);
    } else if (hd.spike) {
      // Mid stage: a slim closed green spikelet — grain heading out,
      // no kernels shown yet. A tapered leaf-green blade with a lit
      // west edge, riding the stem's lagged bob.
      const hx = tipX + (lag - wind) * 0.12 * hd.len * s;
      const spikeH = s * 0.2;
      const sw = s * 0.05;
      const tx = hx + hd.lean * 0.2 * s;
      const ty = tipY - spikeH;
      ctx.fillStyle = WHEAT_LEAF[1]!;
      ctx.beginPath();
      ctx.moveTo(hx - sw, tipY + s * 0.01);
      ctx.lineTo(hx - sw * 0.5, tipY - spikeH * 0.5);
      ctx.lineTo(tx, ty);
      ctx.lineTo(hx + sw * 0.5, tipY - spikeH * 0.5);
      ctx.lineTo(hx + sw, tipY + s * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.stroke();
      ctx.fillStyle = WHEAT_LEAF[2]!;
      ctx.beginPath();
      ctx.moveTo(hx - sw * 0.4, tipY);
      ctx.lineTo(hx - sw * 0.15, tipY - spikeH * 0.5);
      ctx.lineTo(tx - sw * 0.15, ty + spikeH * 0.1);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (gold) {
    const tw = twinkle(f.tSec, m.seed, 3.4);
    if (tw > 0) {
      const tall = m.heads.reduce((a, b) => (b.len > a.len ? b : a));
      sparkle(
        ctx,
        f.bx + (tall.x0 + tall.lean + wind * 0.24 * tall.len) * s,
        f.groundY - (tall.len + 0.2) * s,
        s * 0.1,
        tw * 0.85,
        WHEAT_GOLD.glint,
      );
    }
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** One cotton boll: a dark husk star cradling a tri-lobe white puff. */
function cottonBoll(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, open: boolean): void {
  if (!open) {
    // Green bud: a chamfered square with a seam cross.
    ctx.fillStyle = '#3f7a3c';
    ctx.beginPath();
    chamferRect(ctx, x - r, y - r, r * 2, r * 2, r * 0.5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, r * 0.28);
    ctx.stroke();
    ctx.fillStyle = '#2e5c2c';
    ctx.fillRect(x - r * 0.08, y - r * 0.75, r * 0.16, r * 1.5);
    ctx.fillRect(x - r * 0.75, y - r * 0.08, r * 1.5, r * 0.16);
    return;
  }
  // Husk star behind: four hard points.
  ctx.fillStyle = COTTON_HUSK;
  ctx.beginPath();
  facetCircle(ctx, x, y + r * 0.15, r * 1.3, 4, Math.PI / 4 + ((seed & 7) - 3) * 0.06, 0.9);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.stroke();
  // Tri-lobe puff: shaded under-lobes, blazing lit crown lobe.
  ctx.fillStyle = COTTON_PUFF.under;
  ctx.beginPath();
  facetCircle(ctx, x - r * 0.5, y + r * 0.28, r * 0.62, 6, 0.4 + (seed & 3) * 0.3, 0.95);
  ctx.fill();
  ctx.fillStyle = COTTON_PUFF.body;
  ctx.beginPath();
  facetCircle(ctx, x + r * 0.48, y + r * 0.2, r * 0.62, 6, 1.1 + (seed & 3) * 0.3, 0.95);
  ctx.fill();
  ctx.fillStyle = COTTON_PUFF.lit;
  ctx.beginPath();
  facetCircle(ctx, x - r * 0.05, y - r * 0.42, r * 0.68, 6, 2 + (seed & 3) * 0.3, 0.95);
  ctx.fill();
}

function paintCotton(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const bend = wind * 0.04 * m.height;
  partingShadow(ctx, f.bx, f.groundY, s * 0.5);
  // Woody stub legs, then the tone-banded shrub (berry-bush dialect).
  ctx.fillStyle = '#4a3626';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(f.bx + dir * s * 0.03, f.groundY - m.height * 0.36 * s);
    ctx.lineTo(f.bx + dir * s * 0.1, f.groundY - m.height * 0.34 * s);
    ctx.lineTo(f.bx + dir * s * 0.15, f.groundY + s * 0.01);
    ctx.lineTo(f.bx + dir * s * 0.04, f.groundY + s * 0.02);
    ctx.closePath();
    ctx.fill();
  }
  const rx = paintMasses(ctx, m, f, wind, COTTON_LEAF, bend);
  const open = m.stage === 2;
  for (const b of m.bolls) {
    const bx = f.bx + (b.x + (rx[b.mass] ?? 0)) * s;
    const by = f.groundY - b.y * s;
    cottonBoll(ctx, bx, by, b.r * s * (open ? 1.6 : 1.3), b.seed, open);
  }
  if (open) {
    const tw = twinkle(f.tSec, m.seed, 3.1);
    if (tw > 0 && m.bolls.length) {
      const b = m.bolls.reduce((a, c) => (c.y > a.y ? c : a));
      sparkle(ctx, f.bx + b.x * s, f.groundY - (b.y + b.r * 1.6) * s, s * 0.1, tw * 0.85, '#ffffff');
    }
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/**
 * Mid-stage moonbell: wild-kin leaf fan and arched stems, but every
 * lantern still a shut indigo bud — the promise, not yet the glow.
 */
function paintMoonbellMid(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  partingShadow(ctx, f.bx, f.groundY, s * 0.4);
  // Basal leaf fan, painted like the wild plant's feet.
  const nLeaf = 4;
  const lrnd = mulberry(m.seed ^ 0x1eaf);
  for (let i = 0; i < nLeaf; i++) {
    const u = (i / (nLeaf - 1)) * 2 - 1;
    const len = (0.26 + lrnd() * 0.12) * (1 - Math.abs(u) * 0.25);
    const lean = u * 0.26 + (lrnd() - 0.5) * 0.06;
    const x0 = f.bx + (u * 0.11 + (lrnd() - 0.5) * 0.03) * s;
    const drift = (lean + wind * 0.1 * len) * s;
    const w = (0.09 + lrnd() * 0.03) * s;
    ctx.fillStyle = MOON_LEAF[(lrnd() * 3) | 0]!;
    ctx.beginPath();
    ctx.moveTo(x0 - w * 0.55, f.groundY);
    ctx.lineTo(x0 - w * 0.28 + drift * 0.45, f.groundY - len * s * 0.55);
    ctx.lineTo(x0 + drift, f.groundY - len * s);
    ctx.lineTo(x0 + w * 0.5 + drift * 0.4, f.groundY - len * s * 0.5);
    ctx.lineTo(x0 + w * 0.55, f.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.013);
    ctx.stroke();
  }
  const lag = f.windOverride !== undefined ? wind : windScalarAt(f.wx, f.wy, f.tSec - 0.3);
  for (const st of m.stems) {
    const drift = wind * 0.07 * st.rise;
    const SEGS = 8;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= SEGS; i++) {
      const u = i / SEGS;
      const arch = st.dir * st.reach * u * u;
      pts.push([
        f.bx + (arch + drift * u * u) * s,
        f.groundY - st.rise * Math.sin((u * Math.PI) / 2) * s,
      ]);
    }
    ctx.strokeStyle = '#46695c';
    ctx.lineCap = 'round';
    for (let i = 0; i < SEGS; i++) {
      ctx.lineWidth = Math.max(1.6, s * (0.075 - i * 0.006));
      ctx.beginPath();
      ctx.moveTo(pts[i]![0], pts[i]![1]);
      ctx.lineTo(pts[i + 1]![0], pts[i + 1]![1]);
      ctx.stroke();
    }
    for (const bud of st.bells) {
      const seg = Math.min(SEGS - 1, Math.floor(bud.u * SEGS));
      const su = bud.u * SEGS - seg;
      const hx = pts[seg]![0] + (pts[seg + 1]![0] - pts[seg]![0]) * su;
      const hy = pts[seg]![1] + (pts[seg + 1]![1] - pts[seg]![1]) * su;
      const swing = (lag - wind) * 0.8 + Math.sin(f.tSec * 1.7 + bud.phase) * 0.06;
      const r = bud.size * s;
      const bx2 = hx + Math.sin(swing) * r * 1.1;
      const by2 = hy + Math.cos(swing) * r * 1.1;
      // The shut bud: a faceted teardrop, tip down, a thin core seam
      // hinting at the light inside.
      ctx.save();
      ctx.translate(bx2, by2);
      ctx.rotate(swing * 0.5);
      ctx.fillStyle = MOON_BELL.deep;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.lineTo(r * 0.7, -r * 0.2);
      ctx.lineTo(r * 0.42, r * 0.75);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.42, r * 0.75);
      ctx.lineTo(-r * 0.7, -r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.stroke();
      ctx.fillStyle = MOON_BELL.face;
      ctx.beginPath();
      ctx.moveTo(-r * 0.06, -r * 0.7);
      ctx.lineTo(-r * 0.46, -r * 0.15);
      ctx.lineTo(-r * 0.26, r * 0.55);
      ctx.lineTo(-r * 0.02, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = MOON_BELL.core;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(-r * 0.06, r * 0.4, r * 0.12, r * 0.5);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

// =====================================================================
// THE FULL FIELD (farming v2 Phase 2) — the crop wave's art.
//
// Same laws, three new dialects: root rows and heads for the staples,
// the herb beds with their signature accents, standing orchard wood,
// and the shade log. Models here are deliberately lean (stage, seed,
// silhouette bounds); painters lay their detail out from the seed at
// paint time — deterministic per tile, cached by the sprite path.
// =====================================================================

const POTATO_LEAF = ['#3f6b33', '#568f47', '#6ea85a'] as const;
const POTATO_SKIN = { deep: '#8a6a3f', face: '#c9a26e', lit: '#e2c491' } as const;
const ONION_LEAF = ['#4a7c46', '#5f975a', '#79ad72'] as const;
const ONION_BULB = { deep: '#a08258', face: '#d8c4a8', lit: '#efe2cc', neck: '#7a9c5e' } as const;
const REDROOT_LEAF = ['#4f5c2e', '#6b7a3d', '#87964f'] as const;
const REDROOT_SKIN = { deep: '#6e2027', face: '#a8383d', lit: '#d16b64' } as const;
const CABBAGE_HEAD = { outer: '#5f8a52', body: '#8fb083', heart: '#c2d8b4', lit: '#e0eed2' } as const;
const GOURD_PUMPKIN = { deep: '#9c4f1c', face: '#e08a3d', rib: '#b8642a', lit: '#f2b26a', stem: '#5f7a3d' } as const;
const GOURD_KING = { deep: '#a89a72', face: '#e2d8b8', rib: '#c2b48c', lit: '#f4eeda', stem: '#6b7a4a' } as const;
const BARLEY_GOLD = { deep: '#95763a', face: '#c9b45c', glint: '#ecdfa2' } as const;
const HERB_SPECS = {
  13: { leaf: ['#5a7a4e', '#7a9c6e', '#94b284'] as const, accent: '#e8ecd8', tall: 0.55 },
  14: { leaf: ['#7f8f92', '#a3b2b5', '#c4d0d2'] as const, accent: '#e8f0f2', tall: 0.72 },
  15: { leaf: ['#43395c', '#5e4a78', '#786397'] as const, accent: '#a878d8', tall: 0.66 },
  16: { leaf: ['#9a9070', '#bcb28c', '#d8cfa8'] as const, accent: '#f4e8bc', tall: 0.78 },
  17: { leaf: ['#4a6b2a', '#5f8a35', '#7aa83d'] as const, accent: '#c4e05c', tall: 0.5 },
} as const;
const ORCHARD_SPECS = {
  18: { crown: ['#3f7233', '#549447', '#68a856'] as const, fruit: '#c94a3d', lit: '#e87a5c', lean: 0 },
  19: { crown: ['#39663a', '#4c7f4b', '#5f975a'] as const, fruit: '#6e4a78', lit: '#9a72a8', lean: 0.06 },
  20: { crown: ['#4d5a2e', '#66763d', '#7f914c'] as const, fruit: '#8a6a45', lit: '#b39064', lean: 0.16 },
} as const;
const BRAMBLE_CANE = { cane: '#5c4238', thornpale: '#8a7060', leaf: ['#3f6b33', '#568f47'] as const, berry: '#a04a6e', lit: '#d17a96' } as const;
const LOG_BARK = { body: '#5f4426', end: '#8a6a45', crack: '#3a2c18', myc: '#c9c2b4' } as const;
const PALEGILL = { cap: '#d8d2c4', capLit: '#efe9dc', gill: '#8a7f6e', stem: '#c4baa8' } as const;

function growPhase2(crop: number, stage: 0 | 1 | 2, h: number): CropModel {
  const m = blank(crop, stage, (h >>> 5) % 3, h);
  // Silhouette bounds by family — the sprite baker sizes off these.
  const tall =
    crop === 10 || crop === 11 ? 0.6
    : crop === 12 ? 0.95
    : crop >= 13 && crop <= 17 ? (HERB_SPECS[crop as 13].tall + 0.25)
    : crop >= 18 && crop <= 20 ? 1.75
    : crop === 21 ? 0.85
    : crop >= 22 ? 0.62
    : 0.6;
  m.height = stage === 1 ? tall * 0.62 : tall;
  m.spread =
    crop === 10 || crop === 11 ? 0.62
    : crop >= 18 && crop <= 20 ? 0.85
    : crop === 21 ? 0.6
    : crop >= 22 ? 0.58
    : 0.45;
  return m;
}

/** Root rows: potato (6), onion (7), redroot (8). */
function paintRootRow(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const rnd = mulberry(m.seed ^ 0x2f31);
  partingShadow(ctx, f.bx, f.groundY, s * 0.42);
  const leaf = m.crop === 6 ? POTATO_LEAF : m.crop === 7 ? ONION_LEAF : REDROOT_LEAF;
  const n = m.stage === 1 ? 5 : 4;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    plumeBlade(
      ctx,
      f.bx,
      f.groundY - (m.stage === 2 ? s * 0.08 : 0),
      s,
      {
        x0: u * 0.17 + (rnd() - 0.5) * 0.04,
        len: (m.crop === 7 ? 0.44 : 0.34) * (1 - Math.abs(u) * 0.25) + rnd() * 0.08,
        lean: u * (m.crop === 7 ? 0.1 : 0.22) + (rnd() - 0.5) * 0.06,
        tone: (rnd() * 3) | 0,
      },
      wind,
      leaf,
      m.crop !== 7,
    );
  }
  if (m.stage === 2) {
    // The payload heaves out of the row: clustered tan lobes, round
    // shouldered bulbs, or crimson tapers — lit face top-left, one
    // glint chip, all in a dug ring.
    const skin = m.crop === 6 ? POTATO_SKIN : m.crop === 7 ? ONION_BULB : REDROOT_SKIN;
    const k = m.crop === 6 ? 4 : 3;
    for (let i = 0; i < k; i++) {
      const u = (i / (k - 1)) * 2 - 1;
      const cx = f.bx + u * s * 0.26 + (rnd() - 0.5) * s * 0.05;
      const r = s * (m.crop === 6 ? 0.1 : 0.12) * (0.9 + rnd() * 0.25);
      const lift = s * (0.06 + rnd() * 0.04);
      ctx.fillStyle = 'rgba(30, 20, 11, 0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, f.groundY + r * 0.2, r * 1.25, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin.face;
      ctx.beginPath();
      if (m.crop === 8) {
        // Redroot: a tapered shoulder, point down and buried.
        ctx.moveTo(cx - r, f.groundY - lift);
        ctx.quadraticCurveTo(cx, f.groundY - lift - r * 1.3, cx + r, f.groundY - lift);
        ctx.lineTo(cx + r * 0.5, f.groundY + r * 0.3);
        ctx.lineTo(cx - r * 0.5, f.groundY + r * 0.3);
        ctx.closePath();
      } else {
        facetCircle(ctx, cx, f.groundY - lift, r, 7, m.seed + i * 17, m.crop === 6 ? 0.7 : 0.9);
      }
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.stroke();
      ctx.fillStyle = skin.lit;
      ctx.fillRect(cx - r * 0.5, f.groundY - lift - r * 0.55, r * 0.6, r * 0.3);
      if (m.crop === 7) {
        // The onion's folded neck.
        ctx.strokeStyle = ONION_BULB.neck;
        ctx.lineWidth = Math.max(1, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(cx, f.groundY - lift - r * 0.8);
        ctx.lineTo(cx + (rnd() - 0.5) * s * 0.08, f.groundY - lift - r * 1.4);
        ctx.stroke();
      }
    }
    const tw = twinkle(f.tSec, m.seed, 3.4);
    if (tw > 0) sparkle(ctx, f.bx + s * 0.1, f.groundY - s * 0.2, s * 0.09, tw * 0.85, skin.lit);
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** Cabbage (9): the layered head is the whole argument. */
function paintCabbage(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const rnd = mulberry(m.seed ^ 0x11c5);
  partingShadow(ctx, f.bx, f.groundY, s * 0.44);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rnd() * 0.4;
    const lean = Math.cos(ang) * 0.5 + wind * 0.1;
    plumeBlade(
      ctx, f.bx, f.groundY, s,
      { x0: Math.cos(ang) * 0.14, len: 0.26 + rnd() * 0.08, lean, tone: (rnd() * 2) | 0 },
      wind, [CABBAGE_HEAD.outer, CABBAGE_HEAD.body], false,
    );
  }
  const r = s * (m.stage === 1 ? 0.14 : 0.24);
  const cy = f.groundY - r * 0.75;
  ctx.fillStyle = m.stage === 1 ? CABBAGE_HEAD.body : CABBAGE_HEAD.heart;
  ctx.beginPath();
  facetCircle(ctx, f.bx, cy, r, 8, m.seed, 0.85);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.stroke();
  // Wrapping leaf bands: two arcs hugging the sphere, lit crescent up.
  ctx.strokeStyle = CABBAGE_HEAD.outer;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.beginPath();
  ctx.arc(f.bx - r * 0.2, cy, r * 0.82, Math.PI * 0.55, Math.PI * 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(f.bx + r * 0.25, cy + r * 0.1, r * 0.7, -Math.PI * 0.35, Math.PI * 0.5);
  ctx.stroke();
  if (m.stage === 2) {
    ctx.fillStyle = CABBAGE_HEAD.lit;
    ctx.beginPath();
    ctx.ellipse(f.bx - r * 0.3, cy - r * 0.45, r * 0.34, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    const tw = twinkle(f.tSec, m.seed, 3.6);
    if (tw > 0) sparkle(ctx, f.bx - r * 0.2, cy - r * 0.6, s * 0.09, tw * 0.8, CABBAGE_HEAD.lit);
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** Gourds: pumpkin (10) and kingsquash (11) — the field's heavyweights. */
function paintGourd(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const rnd = mulberry(m.seed ^ 0x77d3);
  const g = m.crop === 10 ? GOURD_PUMPKIN : GOURD_KING;
  partingShadow(ctx, f.bx, f.groundY, s * 0.52);
  // The sprawling vine: three fat leaf masses on crawling stems plus
  // one curly tendril — the gourd grows OUT of a living tangle.
  for (let i = 0; i < 3; i++) {
    const u = (i / 2) * 2 - 1;
    const lx = f.bx + u * s * (0.3 + rnd() * 0.08);
    const drift = wind * s * 0.05;
    ctx.fillStyle = i === 1 ? '#568f47' : '#3f6b33';
    ctx.beginPath();
    facetBlob(ctx, lx + drift, f.groundY - s * (0.12 + rnd() * 0.06), s * 0.16, m.seed + i * 31, 6, 0.62);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.stroke();
  }
  ctx.strokeStyle = '#4a7c3a';
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(f.bx - s * 0.3, f.groundY - s * 0.02);
  ctx.quadraticCurveTo(f.bx + s * 0.1, f.groundY - s * 0.1 + wind * s * 0.03, f.bx + s * 0.38, f.groundY - s * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(f.bx + s * 0.4, f.groundY - s * 0.14, s * 0.045, 0.5, 4.6);
  ctx.stroke();
  // The gourd(s): mid = one green fist; ripe = the great ribbed thing.
  const big = m.stage === 2;
  const r = s * (big ? 0.26 : 0.11);
  const gx = f.bx + s * 0.08;
  const gy = f.groundY - r * 0.62;
  ctx.fillStyle = big ? g.face : '#6b8f4a';
  ctx.beginPath();
  ctx.ellipse(gx, gy, r * 1.15, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.2, s * 0.022);
  ctx.stroke();
  if (big) {
    ctx.strokeStyle = g.rib;
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (const rx of [-0.55, 0, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(gx + rx * r, gy - r * 0.85);
      ctx.quadraticCurveTo(gx + rx * r * 1.35, gy, gx + rx * r, gy + r * 0.85);
      ctx.stroke();
    }
    ctx.fillStyle = g.lit;
    ctx.beginPath();
    ctx.ellipse(gx - r * 0.45, gy - r * 0.45, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g.stem;
    ctx.fillRect(gx - s * 0.03, gy - r - s * 0.09, s * 0.06, s * 0.1);
    const tw = twinkle(f.tSec, m.seed, 3.0);
    if (tw > 0) sparkle(ctx, gx - r * 0.3, gy - r * 0.7, s * 0.11, tw, g.lit);
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** Barley (12): wheat's cool-gold cousin, all beard. */
function paintBarley(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const rnd = mulberry(m.seed ^ 0x3b21);
  partingShadow(ctx, f.bx, f.groundY, s * 0.4);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const hgt = (m.stage === 1 ? 0.52 : 0.85) * (1 - Math.abs(u) * 0.16) + rnd() * 0.08;
    const x0 = f.bx + u * s * 0.16;
    const drift = (u * 0.1 + wind * 0.3 * hgt) * s;
    // Stalk slab with a lit west lane.
    ctx.strokeStyle = m.stage === 1 ? '#6b8f4a' : '#b09a4e';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(x0, f.groundY);
    ctx.quadraticCurveTo(x0 + drift * 0.4, f.groundY - hgt * s * 0.6, x0 + drift, f.groundY - hgt * s);
    ctx.stroke();
    if (m.stage === 2) {
      // The bearded ear: a kernel bar wearing LONG splayed awns —
      // barley's whole signature is the beard.
      const ex = x0 + drift;
      const ey = f.groundY - hgt * s;
      const lag = windScalarAt(f.wx, f.wy, f.tSec - 0.22) * s * 0.05;
      ctx.save();
      ctx.translate(ex + lag, ey);
      ctx.rotate(drift / (s * 2.4) + 0.12);
      ctx.fillStyle = BARLEY_GOLD.face;
      chamferRect(ctx, 0, -s * 0.1, s * 0.075, s * 0.2, s * 0.02);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.stroke();
      ctx.fillStyle = BARLEY_GOLD.deep;
      for (let k = 0; k < 3; k++) ctx.fillRect(-s * 0.032, -s * 0.085 + k * s * 0.055, s * 0.064, s * 0.02);
      ctx.strokeStyle = BARLEY_GOLD.glint;
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 4; k++) {
        const aw = (k / 3 - 0.5) * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.08);
        ctx.lineTo(aw * s * 0.34, -s * (0.34 + (k % 2) * 0.06));
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = '#7fa858';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(x0 + drift, f.groundY - hgt * s);
      ctx.lineTo(x0 + drift + s * 0.03, f.groundY - hgt * s - s * 0.1);
      ctx.stroke();
    }
  }
  if (m.stage === 2) {
    const tw = twinkle(f.tSec, m.seed, 3.2);
    if (tw > 0) sparkle(ctx, f.bx, f.groundY - s * 0.8, s * 0.09, tw * 0.9, BARLEY_GOLD.glint);
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** The herb beds (13..17): rosettes with a signature ripe accent. */
function paintHerbRow(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const spec = HERB_SPECS[m.crop as 13];
  const rnd = mulberry(m.seed ^ 0x59a7);
  partingShadow(ctx, f.bx, f.groundY, s * 0.4);
  const n = m.stage === 1 ? 5 : 6;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    plumeBlade(
      ctx, f.bx, f.groundY, s,
      {
        x0: u * 0.15 + (rnd() - 0.5) * 0.04,
        len: spec.tall * 0.55 * (1 - Math.abs(u) * 0.3) + rnd() * 0.08,
        lean: u * 0.2 + (rnd() - 0.5) * 0.05,
        tone: (rnd() * 3) | 0,
      },
      wind, spec.leaf, m.crop === 17,
    );
  }
  if (m.stage === 2) {
    // Ripe accents, one dialect each: bittercress white sprig heads,
    // silverleaf's lit paddle faces, duskthorn berry whips, dawnveil
    // glow bells (moonbell's dawn-lit kin), adderstongue venom sacs.
    const lag = windScalarAt(f.wx, f.wy, f.tSec - 0.22);
    if (m.crop === 13 || m.crop === 15) {
      for (let k = 0; k < 3; k++) {
        const u = (k / 2) * 2 - 1;
        const hx = f.bx + u * s * 0.14 + lag * s * 0.04;
        const hy = f.groundY - s * (spec.tall * 0.72 + (k % 2) * 0.08);
        ctx.fillStyle = spec.accent;
        for (let d = 0; d < 4; d++) {
          const a = (d / 4) * Math.PI * 2 + k;
          ctx.beginPath();
          facetCircle(ctx, hx + Math.cos(a) * s * 0.035, hy + Math.sin(a) * s * 0.028, s * 0.026, 5, m.seed + d, 0.9);
          ctx.fill();
        }
      }
    } else if (m.crop === 14) {
      ctx.fillStyle = spec.accent;
      for (let k = 0; k < 3; k++) {
        const u = (k / 2) * 2 - 1;
        ctx.beginPath();
        ctx.ellipse(f.bx + u * s * 0.12 + lag * s * 0.03, f.groundY - s * (spec.tall * 0.6), s * 0.05, s * 0.09, u * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (m.crop === 16) {
      for (let k = 0; k < 3; k++) {
        const u = (k / 2) * 2 - 1;
        const bx2 = f.bx + u * s * 0.13 + lag * s * 0.04;
        const by2 = f.groundY - s * (spec.tall * 0.78 - Math.abs(u) * 0.1);
        const glow = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, s * 0.11);
        glow.addColorStop(0, 'rgba(244, 232, 188, 0.5)');
        glow.addColorStop(1, 'rgba(244, 232, 188, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(bx2, by2, s * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = spec.accent;
        ctx.beginPath();
        ctx.moveTo(bx2, by2 - s * 0.045);
        ctx.lineTo(bx2 + s * 0.035, by2);
        ctx.lineTo(bx2, by2 + s * 0.05);
        ctx.lineTo(bx2 - s * 0.035, by2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.stroke();
      }
    } else {
      // Adderstongue: two swollen sacs low on the forked tongues,
      // each with one venom-bright drip glint.
      for (const u of [-0.6, 0.5]) {
        const sx2 = f.bx + u * s * 0.14;
        const sy2 = f.groundY - s * 0.16;
        ctx.fillStyle = spec.accent;
        ctx.beginPath();
        ctx.ellipse(sx2, sy2, s * 0.06, s * 0.075, u * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.stroke();
        ctx.fillStyle = '#eaf5a8';
        ctx.fillRect(sx2 - s * 0.012, sy2 - s * 0.03, s * 0.024, s * 0.024);
      }
    }
    const tw = twinkle(f.tSec, m.seed, 3.4);
    if (tw > 0) sparkle(ctx, f.bx + s * 0.06, f.groundY - s * spec.tall * 0.8, s * 0.09, tw * 0.85, spec.accent);
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** Orchard wood (18..20): a cultivated tree, fruit at the twinkle. */
function paintOrchard(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const spec = ORCHARD_SPECS[m.crop as 18];
  const rnd = mulberry(m.seed ^ 0x6f11);
  const young = m.stage === 1;
  const trunkH = s * (young ? 0.55 : 0.8);
  const lean = spec.lean * s;
  partingShadow(ctx, f.bx, f.groundY, s * (young ? 0.4 : 0.55));
  // The trunk: a hand-width bole with one graft knuckle — cultivated
  // wood, not wildwood.
  ctx.strokeStyle = '#5f4426';
  ctx.lineWidth = Math.max(2, s * (young ? 0.07 : 0.1));
  ctx.beginPath();
  ctx.moveTo(f.bx, f.groundY);
  ctx.quadraticCurveTo(f.bx + lean * 0.4, f.groundY - trunkH * 0.55, f.bx + lean, f.groundY - trunkH);
  ctx.stroke();
  ctx.fillStyle = '#7d5a2e';
  ctx.fillRect(f.bx - s * 0.035 + lean * 0.3, f.groundY - trunkH * 0.5, s * 0.05, s * 0.05);
  // The crown: three tone-banded masses, wind-drifted, outlined.
  const crownY = f.groundY - trunkH - s * (young ? 0.14 : 0.24);
  const drift = wind * s * 0.06;
  for (let i = 0; i < 3; i++) {
    const off = [[-0.2, 0.1], [0.22, 0.06], [0, -0.16]][i]!;
    ctx.fillStyle = spec.crown[i]!;
    ctx.beginPath();
    facetBlob(
      ctx,
      f.bx + lean + off[0]! * s * (young ? 0.8 : 1.2) + drift * (0.6 + i * 0.2),
      crownY + off[1]! * s * (young ? 0.8 : 1.2),
      s * (young ? 0.16 : 0.24) * (0.9 + rnd() * 0.2),
      m.seed + i * 47,
      7,
      0.7,
    );
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.016);
    ctx.stroke();
  }
  if (m.stage === 2) {
    // The fruit: fat accent dots hung through the crown, lit chip
    // each, twinkling ripe (the payload law, hung in a tree).
    const k = 4 + ((m.seed >>> 6) % 2);
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + rnd();
      const fx2 = f.bx + lean + Math.cos(a) * s * 0.2 + drift * 0.8;
      const fy2 = crownY + Math.sin(a) * s * 0.15 + s * 0.05;
      const r = s * (m.crop === 20 ? 0.05 : 0.04);
      ctx.fillStyle = spec.fruit;
      ctx.beginPath();
      if (m.crop === 20) {
        ctx.ellipse(fx2, fy2, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(fx2, fy2, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.stroke();
      ctx.fillStyle = spec.lit;
      ctx.fillRect(fx2 - r * 0.4, fy2 - r * 0.55, r * 0.5, r * 0.35);
    }
    const tw = twinkle(f.tSec, m.seed, 2.9);
    if (tw > 0) sparkle(ctx, f.bx + lean + s * 0.08, crownY - s * 0.08, s * 0.11, tw, spec.lit);
  }
  // Grass tuft at the bole, not soil chips — the orchard floor heals.
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** Bramblevine (21): arched canes, thorn ticks, berry clusters ripe. */
function paintBramble(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const rnd = mulberry(m.seed ^ 0x4be3);
  partingShadow(ctx, f.bx, f.groundY, s * 0.46);
  for (let i = 0; i < 3; i++) {
    const u = (i / 2) * 2 - 1;
    const x0 = f.bx + u * s * 0.2;
    const peak = s * (0.5 + rnd() * 0.2) * (m.stage === 1 ? 0.75 : 1);
    const drift = wind * s * 0.05;
    ctx.strokeStyle = BRAMBLE_CANE.cane;
    ctx.lineWidth = Math.max(1.4, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(x0 - s * 0.16, f.groundY);
    ctx.quadraticCurveTo(x0 + drift, f.groundY - peak, x0 + s * 0.2, f.groundY - s * 0.04);
    ctx.stroke();
    // Thorn ticks along the arch.
    ctx.strokeStyle = BRAMBLE_CANE.thornpale;
    ctx.lineWidth = Math.max(1, s * 0.016);
    for (let k = 1; k < 4; k++) {
      const tq = k / 4;
      const txp = x0 - s * 0.16 + (s * 0.36) * tq + drift * tq;
      const typ = f.groundY - peak * (1 - (2 * tq - 1) ** 2);
      ctx.beginPath();
      ctx.moveTo(txp, typ);
      ctx.lineTo(txp + s * 0.028, typ - s * 0.028);
      ctx.stroke();
    }
    // Leaf pairs riding the cane.
    for (const tq of [0.3, 0.65]) {
      ctx.fillStyle = BRAMBLE_CANE.leaf[(i + (tq > 0.5 ? 1 : 0)) % 2]!;
      ctx.beginPath();
      facetCircle(ctx, x0 - s * 0.16 + s * 0.36 * tq + drift * tq, f.groundY - peak * (1 - (2 * tq - 1) ** 2) + s * 0.05, s * 0.05, 5, m.seed + i * 13 + (tq * 10) | 0, 0.7);
      ctx.fill();
    }
    if (m.stage === 2) {
      // Berry clusters hang low off the arch: three-lobe drupes with
      // one lit chip each.
      const bx2 = x0 + drift * 0.6;
      const by2 = f.groundY - peak * 0.72 + s * 0.1;
      for (let d = 0; d < 3; d++) {
        const a = (d / 3) * Math.PI * 2;
        ctx.fillStyle = BRAMBLE_CANE.berry;
        ctx.beginPath();
        ctx.arc(bx2 + Math.cos(a) * s * 0.026, by2 + Math.sin(a) * s * 0.024, s * 0.028, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.arc(bx2, by2, s * 0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = BRAMBLE_CANE.lit;
      ctx.fillRect(bx2 - s * 0.014, by2 - s * 0.03, s * 0.02, s * 0.02);
    }
  }
  if (m.stage === 2) {
    const tw = twinkle(f.tSec, m.seed, 3.1);
    if (tw > 0) sparkle(ctx, f.bx, f.groundY - s * 0.45, s * 0.09, tw * 0.9, BRAMBLE_CANE.lit);
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, SOIL_CHIPS);
}

/** The shade log (22 seeded, 23 palegill): timber wearing its tenants. */
function paintLogBed(ctx: CanvasRenderingContext2D, m: CropModel, f: FloraFrame, wind: number): void {
  void wind; // the shade bed stands out of the wind, by design
  const s = f.s;
  const rnd = mulberry(m.seed ^ 0x1d47);
  partingShadow(ctx, f.bx, f.groundY, s * 0.5);
  // The log itself: a horizontal bole with sawn end grain east, bark
  // cracks along the run, moss at the shaded footing.
  const halfL = s * 0.42;
  const bodyH = s * 0.2;
  const topY = f.groundY - bodyH - s * 0.1;
  ctx.fillStyle = LOG_BARK.body;
  ctx.beginPath();
  ctx.roundRect(f.bx - halfL, topY, halfL * 2, bodyH, s * 0.05);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.2, s * 0.02);
  ctx.stroke();
  ctx.fillStyle = LOG_BARK.end;
  ctx.beginPath();
  ctx.ellipse(f.bx + halfL, topY + bodyH * 0.5, s * 0.045, bodyH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(LOG_BARK.end, -20);
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.ellipse(f.bx + halfL, topY + bodyH * 0.5, s * 0.028, bodyH * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = LOG_BARK.crack;
  ctx.lineWidth = Math.max(1, s * 0.014);
  for (let k = 0; k < 3; k++) {
    const cx2 = f.bx - halfL * 0.6 + k * halfL * 0.55 + (rnd() - 0.5) * s * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx2, topY + bodyH * 0.2);
    ctx.lineTo(cx2 + s * 0.04, topY + bodyH * 0.8);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(96, 122, 74, 0.7)';
  ctx.fillRect(f.bx - halfL + s * 0.03, f.groundY - s * 0.12, s * 0.08, s * 0.03);
  if (m.crop === 22) {
    // Spored: mycelium veins the bark — pale threadwork, the promise.
    ctx.strokeStyle = LOG_BARK.myc;
    ctx.lineWidth = Math.max(1, s * 0.012);
    for (let k = 0; k < 4; k++) {
      const vx = f.bx - halfL * 0.7 + k * halfL * 0.45;
      ctx.beginPath();
      ctx.moveTo(vx, topY + bodyH * 0.85);
      ctx.lineTo(vx + s * 0.03, topY + bodyH * 0.45);
      ctx.lineTo(vx + s * 0.075, topY + bodyH * 0.6);
      ctx.stroke();
    }
  } else {
    // Palegill shelves: cap rows along the top edge — buds at mid,
    // full fans with dark gill undersides at ripe.
    const ripe = m.stage === 2;
    const k = ripe ? 4 : 3;
    for (let i = 0; i < k; i++) {
      const u = (i / (k - 1)) * 2 - 1;
      const mx2 = f.bx + u * halfL * 0.7 + (rnd() - 0.5) * s * 0.04;
      const r = s * (ripe ? 0.085 : 0.05) * (0.9 + rnd() * 0.25);
      const my2 = topY - r * 0.3;
      if (ripe) {
        ctx.fillStyle = PALEGILL.gill;
        ctx.beginPath();
        ctx.ellipse(mx2, my2 + r * 0.3, r * 1.05, r * 0.4, 0, 0, Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = PALEGILL.cap;
      ctx.beginPath();
      ctx.ellipse(mx2, my2, r, r * 0.62, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.stroke();
      ctx.fillStyle = PALEGILL.capLit;
      ctx.fillRect(mx2 - r * 0.5, my2 - r * 0.5, r * 0.55, r * 0.22);
    }
    if (ripe) {
      const tw = twinkle(f.tSec, m.seed, 3.5);
      if (tw > 0) sparkle(ctx, f.bx, topY - s * 0.14, s * 0.08, tw * 0.8, PALEGILL.capLit);
    }
  }
}
