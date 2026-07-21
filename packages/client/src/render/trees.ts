/**
 * The tree grower — DevCraft's forests, grown not authored.
 *
 * Every tree on the map is GROWN from a species grammar + the tile's
 * hash: a deterministic skeleton (trunk spine, short boughs) under a
 * DOME CANOPY — packed tiers of heavily-overlapping low-poly
 * clusters that read as ONE solid mass. The same tile always grows
 * the same tree, on every client, with no stored geometry.
 *
 * Species are GRAMMARS, not sprites: each defines growth ranges
 * (height, trunk width, crown dome shape, bough habit) plus three
 * bespoke structural VARIANTS, so a stand reads as siblings, never
 * clones. Adding a tree type = one new species entry.
 *
 * THE CANOPY LAWS (learned from the lanky first draft):
 * - Trees stand UPRIGHT. Bow and gnarl are seasoning, never posture;
 *   only the windswept species leans, and moderately.
 * - The crown is a MASS, not scattered balls: tiers of clusters
 *   spaced ~one radius apart so silhouettes fuse, dome-profiled
 *   (full at the shoulders, tapering to a cap). Nothing floats.
 * - Light is BANDED: dark underside tier -> mid body -> lit crown,
 *   painted as batched tone masses (one Path2D fill per tone per
 *   tree). That is what makes it read as one solid sculpted volume —
 *   and it is also ~5 fills per canopy instead of ~30.
 * - Branches never show their seams: boughs are short, fill-only
 *   (no edge strokes), painted BEFORE the trunk so the trunk body
 *   covers every join, and their tips end INSIDE the canopy.
 *
 * Scale law: the player reads ~1.2 tiles tall. Commons stand 3-4x
 * that, oaks and yews 4-5x. Trunk base half-widths are the physical
 * truth: `tileColliderRadius` in shared tiles.ts must stay a whisker
 * wider than the fattest variant's flared base (test-pinned via
 * maxTrunkBaseRadius; fillLimb's 0.4 flare factor is load-bearing).
 *
 * Wind: the whole tree bends as a cantilever on the ONE shared wind
 * field (grass.ts windScalarAt). Every cluster re-samples the field
 * at ITS OWN world offset with a height lag, so segments of one
 * crown rustle independently while neighbouring trees stay coherent.
 * All phase comes from world position — never per-tree randomness.
 *
 * Model space: tiles, origin at the trunk base, +x screen-right,
 * +y UP. Verticals paint at full tile scale (projection law).
 */

import { Tile, hashCoords } from '@devcraft/shared';
import { facetBlob } from './shapes.js';
import { shade } from './rig.js';
import { windScalarAt } from './grass.js';

export interface TreeBranch {
  /** Polyline base→tip, model tiles (y up from the ground). */
  pts: Array<[number, number]>;
  /** Half-widths at base and tip, tiles. */
  w0: number;
  w1: number;
  /** Root-flare boost over the first fifth of the run. */
  flare: number;
  /** Cluster index whose rustle drags this branch's tip, or -1. */
  tip: number;
  /** 0 = trunk/fork arm (edges + painted last), 1 = bough (fill-only). */
  level: number;
}

export interface TreeCluster {
  x: number;
  y: number; // centre, model tiles (y up)
  r: number;
  /** Height fraction 0..1 — drives the cantilever displacement. */
  hf: number;
  seed: number;
  /** Light band: 0 = shaded underside, 1 = body, 2 = lit crown. */
  tone: number;
  /** Carries a bright top facet in the lit pass. */
  lit: boolean;
  /** Interior filler — young trees haven't grown these yet. */
  extra: boolean;
  /** Hangs curtain strands below itself (willow). */
  droop: boolean;
}

export interface TreeModel {
  species: number;
  variant: number;
  /** Ground → crown top, tiles. */
  height: number;
  /** Max |x| + r across the crown — shadow and culling. */
  spread: number;
  bark: string;
  barkLit: string;
  barkDark: string;
  /** Light-band palette, dark → mid → lit. */
  leaves: [string, string, string];
  sides: number;
  /** Curtain strands per drooping cluster (willow), 0 = none. */
  strands: number;
  branches: TreeBranch[]; // trunk LAST (it paints over the bough joins)
  clusters: TreeCluster[];
}

/** One species' growth grammar. Variants override any subset. */
interface Grow {
  bark: string;
  leaves: [string, string, string]; // dark underside -> mid -> lit crown
  h: [number, number]; // total height range, tiles
  trunkW: number; // base half-width, tiles
  taper: number; // tip half-width fraction of trunkW
  bow: number; // sideways trunk bulge (± by hash) — seasoning only
  lean: number; // constant lean — windswept species only
  gnarl: number; // trunk edge waviness
  flare: number; // root-flare boost
  split: number | null; // trunk forks at this fraction (twin crowns)
  boughN: [number, number]; // short boughs reaching into the canopy
  boughStart: number; // trunk fraction where boughs begin
  cBot: number; // crown bottom as a fraction of height
  crownW: number; // crown half-width, tiles
  crownR: [number, number]; // cluster radius range, tiles
  crownDx: number; // crown centre x-shift (windswept streaming)
  droop: number; // hanging underside clusters (willow)
  strands: number; // curtain strands per drooping cluster
  sides: number; // facet count for the low-poly clusters
}

interface SpeciesDef {
  base: Grow;
  /** 3 structural variants — hash-picked, each a real silhouette. */
  variants: Array<Partial<Grow>>;
}

const GREENS: [string, string, string] = ['#2a5f30', '#3d8542', '#58ab55'];

/**
 * Species 0-4 are the common wood (Tile.Tree picks by hash); 5 oak,
 * 6 willow, 7 yew are the named harvest trees.
 */
const SPECIES: SpeciesDef[] = [
  // 0 — Maple: the archetype. Sturdy trunk, full rounded dome.
  {
    base: {
      bark: '#6b4a26', leaves: GREENS,
      h: [3.8, 4.5], trunkW: 0.16, taper: 0.5, bow: 0.06, lean: 0,
      gnarl: 0.03, flare: 0.9, split: null,
      boughN: [2, 3], boughStart: 0.55,
      cBot: 0.44, crownW: 1.35, crownR: [0.5, 0.7], crownDx: 0,
      droop: 0, strands: 0, sides: 8,
    },
    variants: [
      {}, // classic dome
      { h: [4.3, 4.9], crownW: 1.05, cBot: 0.52, trunkW: 0.13 }, // tall column crown
      { h: [3.6, 4.2], crownW: 1.65, cBot: 0.38, crownR: [0.55, 0.76] }, // spreading
    ],
  },
  // 1 — Birch: tall, slim, pale, a narrow airy dome held high.
  {
    base: {
      bark: '#d7d2c4', leaves: ['#457f3a', '#5a9b48', '#74b55e'],
      h: [4.4, 5.2], trunkW: 0.085, taper: 0.55, bow: 0.1, lean: 0,
      gnarl: 0.02, flare: 0.5, split: null,
      boughN: [1, 2], boughStart: 0.6,
      cBot: 0.5, crownW: 0.85, crownR: [0.4, 0.55], crownDx: 0,
      droop: 0, strands: 0, sides: 7,
    },
    variants: [
      {}, // straight and pale
      { lean: 0.12, bow: 0.06 }, // a shade off plumb
      { h: [4.1, 4.8], crownW: 0.72, crownR: [0.34, 0.48] }, // weathered, tighter
    ],
  },
  // 2 — Twin: the trunk forks into a Y carrying two fused domes.
  {
    base: {
      bark: '#66492a', leaves: GREENS,
      h: [3.9, 4.6], trunkW: 0.16, taper: 0.5, bow: 0.04, lean: 0,
      gnarl: 0.04, flare: 0.85, split: 0.4,
      boughN: [0, 1], boughStart: 0.3,
      cBot: 0.52, crownW: 0.8, crownR: [0.46, 0.62], crownDx: 0,
      droop: 0, strands: 0, sides: 8,
    },
    variants: [
      {}, // classic Y
      { split: 0.3, h: [3.7, 4.3] }, // low fork, wide straddle
      { split: 0.52, h: [4.2, 4.9], crownW: 0.7 }, // high tight fork
    ],
  },
  // 3 — Windswept: a moderate lean, crown shifted leeward — shaped
  // by weather, still a standing tree.
  {
    base: {
      bark: '#6b4a26', leaves: ['#2d6a34', '#3f8a3c', '#5aa851'],
      h: [3.4, 4.1], trunkW: 0.14, taper: 0.5, bow: 0.1, lean: 0.3,
      gnarl: 0.05, flare: 0.9, split: null,
      boughN: [1, 2], boughStart: 0.5,
      cBot: 0.45, crownW: 1.25, crownR: [0.48, 0.64], crownDx: 0.4,
      droop: 0, strands: 0, sides: 8,
    },
    variants: [
      {}, // streaming
      { lean: 0.45, h: [3.2, 3.8], crownDx: 0.55 }, // cliff-bent survivor
      { h: [3.6, 4.3], crownW: 1.0, crownDx: 0.3 }, // crest-broken, tighter
    ],
  },
  // 4 — Broadleaf: short thick trunk under a wide low pavilion dome.
  {
    base: {
      bark: '#6f5030', leaves: ['#2f6e36', '#438c45', '#5daa57'],
      h: [3.0, 3.6], trunkW: 0.2, taper: 0.55, bow: 0.04, lean: 0,
      gnarl: 0.04, flare: 1.1, split: null,
      boughN: [3, 4], boughStart: 0.45,
      cBot: 0.38, crownW: 1.55, crownR: [0.5, 0.68], crownDx: 0,
      droop: 0, strands: 0, sides: 9,
    },
    variants: [
      {}, // pavilion dome
      { h: [2.9, 3.4], crownW: 1.8, cBot: 0.34 }, // sprawler
      { h: [3.3, 3.8], cBot: 0.42, crownW: 1.4 }, // tiered, taller dome
    ],
  },
  // 5 — Ancient oak: the landmark. Massive trunk, a vast deep dome
  // the rest of the forest gathers around.
  {
    base: {
      bark: '#5d4022', leaves: ['#1f4827', '#2c5c31', '#417a46'],
      h: [4.7, 5.6], trunkW: 0.26, taper: 0.5, bow: 0.06, lean: 0,
      gnarl: 0.1, flare: 1.25, split: null,
      boughN: [3, 4], boughStart: 0.45,
      cBot: 0.4, crownW: 1.85, crownR: [0.6, 0.82], crownDx: 0,
      droop: 0, strands: 0, sides: 9,
    },
    variants: [
      {}, // broad king
      { h: [4.9, 5.8], trunkW: 0.28, gnarl: 0.14, crownW: 2.0 }, // ancient
      { split: 0.42, crownW: 0.95, gnarl: 0.12 }, // storm-split twin crown
    ],
  },
  // 6 — Weeping willow: a soft dome spilling over its own underside,
  // curtain strands swinging beneath.
  {
    base: {
      bark: '#6f6448', leaves: ['#4d8045', '#659655', '#82ad6a'],
      h: [3.7, 4.3], trunkW: 0.17, taper: 0.5, bow: 0.12, lean: 0.06,
      gnarl: 0.07, flare: 1.0, split: null,
      boughN: [2, 3], boughStart: 0.5,
      cBot: 0.42, crownW: 1.45, crownR: [0.5, 0.66], crownDx: 0,
      droop: 4, strands: 4, sides: 9,
    },
    variants: [
      {}, // full curtain
      { lean: 0.2, crownDx: 0.3 }, // riverbank lean
      { h: [4.1, 4.7], droop: 6, strands: 5 }, // old weeper
    ],
  },
  // 7 — Ancient yew: red-brown mass under a dense near-black dome.
  {
    base: {
      bark: '#7d4436', leaves: ['#183b21', '#274f30', '#386841'],
      h: [4.4, 5.2], trunkW: 0.24, taper: 0.5, bow: 0.05, lean: 0,
      gnarl: 0.12, flare: 1.2, split: null,
      boughN: [3, 4], boughStart: 0.4,
      cBot: 0.38, crownW: 1.6, crownR: [0.55, 0.75], crownDx: 0,
      droop: 0, strands: 0, sides: 9,
    },
    variants: [
      {}, // dense dome
      { bow: 0.16, gnarl: 0.18 }, // twisted
      { h: [4.7, 5.5], crownW: 1.3 }, // spired
    ],
  },
];

export function speciesOf(tile: Tile, h: number): number {
  return tile === Tile.TreeOak ? 5
    : tile === Tile.TreeWillow ? 6
    : tile === Tile.TreeYew ? 7
    : h % 5;
}

/**
 * The widest flared trunk base any variant can grow, per tree tile —
 * tested against `tileColliderRadius` so physics never drifts from
 * the art. Flare widens the very base by up to (1 + flare * 0.4).
 */
export function maxTrunkBaseRadius(tile: Tile): number {
  const idxs = tile === Tile.Tree ? [0, 1, 2, 3, 4] : [speciesOf(tile, 0)];
  let m = 0;
  for (const si of idxs) {
    const def = SPECIES[si]!;
    for (const v of [{}, ...def.variants]) {
      const g = { ...def.base, ...v };
      m = Math.max(m, g.trunkW * (1 + g.flare * 0.4));
    }
  }
  return m;
}

/**
 * Build a curved polyline base→target with bow / lean / gnarl.
 * `unit` is the species' character scale (≈ height / 3.5): curve
 * magnitudes are unit-relative, never length-relative, so a tall
 * trunk curves gracefully instead of multiplying its own wobble.
 * The base point is exact — the collider circle sits under it.
 */
function grownSpine(
  x0: number, y0: number, x1: number, y1: number,
  bow: number, lean: number, gnarl: number, bowSign: number, unit: number,
  rnd: (i: number) => number, ri: number, segs: number,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const e = u * u * (3 - 2 * u);
    let x = x0 + (x1 - x0) * e;
    x += bowSign * bow * Math.sin(u * Math.PI) * unit;
    x += lean * e * unit;
    if (i > 0) x += (rnd(ri + i) - 0.5) * gnarl * unit;
    pts.push([x, y0 + (y1 - y0) * u]);
  }
  return pts;
}

/** Sample a polyline at fraction u of its point range. */
function alongSpine(pts: Array<[number, number]>, u: number): [number, number] {
  const t = Math.min(1, Math.max(0, u)) * (pts.length - 1);
  const i0 = Math.floor(t);
  const fr = t - i0;
  const a = pts[i0]!;
  const b = pts[Math.min(pts.length - 1, i0 + 1)]!;
  return [a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr];
}

const modelCache = new Map<number, TreeModel>();

/** Grow (or recall) the tree standing on a tile with world-hash `h`. */
export function treeModel(tile: Tile, h: number): TreeModel {
  const key = ((tile as number) << 16) | (h & 0xffff);
  const hit = modelCache.get(key);
  if (hit) return hit;
  if (modelCache.size > 600) modelCache.clear();

  const rnd = (i: number): number => (hashCoords(53, h & 0xffff, i) % 1000) / 1000;
  const species = speciesOf(tile, h);
  const def = SPECIES[species]!;
  const variant = Math.floor(rnd(0) * def.variants.length) % def.variants.length;
  const g: Grow = { ...def.base, ...def.variants[variant] };

  const H = g.h[0] + (g.h[1] - g.h[0]) * rnd(1);
  // Curve character scale: coefficients are authored against a
  // ~3.5-tile reference so taller species curve, not flail.
  const unit = H / 3.5;
  const bowSign = rnd(2) < 0.5 ? -1 : 1;
  const lerp = (r: [number, number], t: number): number => r[0] + (r[1] - r[0]) * t;

  const branches: TreeBranch[] = [];
  const clusters: TreeCluster[] = [];

  const addCluster = (
    x: number, y: number, r: number, tone: number,
    opts: { lit?: boolean; extra?: boolean; droop?: boolean } = {},
  ): number => {
    // Crown ceiling + reach: nothing tops out above H or streams past
    // the renderer's ±3-column culling pad (wind sway included).
    const cy = Math.min(y, H - r);
    const cx = Math.sign(x) * Math.min(Math.abs(x), 2.6 - r);
    clusters.push({
      x: cx, y: cy, r, hf: Math.min(1, cy / H),
      seed: hashCoords(59, h & 0xffff, clusters.length),
      tone, lit: opts.lit ?? false, extra: opts.extra ?? false, droop: opts.droop ?? false,
    });
    return clusters.length - 1;
  };

  /**
   * THE DOME: tiers of clusters packed ~one radius apart so their
   * silhouettes fuse into one mass. Widest at the shoulders, closing
   * to a cap. Light bands by tier: underside dark, body mid, crown
   * lit. Returns the indices of the bottom tier (bough targets).
   */
  const dome = (cx0: number, yBot: number, yTop: number, halfW: number, ri: number): number[] => {
    const ch = yTop - yBot;
    const rMid = (g.crownR[0] + g.crownR[1]) / 2;
    const nT = Math.max(3, Math.min(4, Math.round(ch / (rMid * 0.85))));
    const bottomIdx: number[] = [];
    for (let t = 0; t < nT; t++) {
      const v = (t + 0.5) / nT;
      // Dome profile: tucked underside, widest at the shoulders
      // (v ≈ 0.3), closing to the cap.
      const prof = Math.max(0.4, Math.cos((v - 0.3) * 1.55) * (v < 0.3 ? 0.94 + v * 0.2 : 1));
      const tw = halfW * prof;
      const r = lerp(g.crownR, rnd(ri + t * 17)) * (1 - 0.18 * v);
      const n = Math.max(1, Math.round((tw * 2) / (r * 1.05)));
      for (let k = 0; k < n; k++) {
        const fx = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2 * (tw - r * 0.35);
        const jx = (rnd(ri + t * 17 + k * 3 + 1) - 0.5) * r * 0.5;
        const jy = (rnd(ri + t * 17 + k * 3 + 2) - 0.5) * r * 0.45;
        const tone = v < 0.3 ? 0 : v < 0.62 ? 1 : 2;
        const edge = k === 0 || k === n - 1;
        const idx = addCluster(cx0 + fx + jx, yBot + ch * v + jy, r, tone, {
          lit: t === nT - 1,
          extra: !edge && t > 0 && t < nT - 1, // interior body — grown later
        });
        if (t === 0) bottomIdx.push(idx);
      }
    }
    // The cap closes the silhouette.
    const rCap = rMid * 0.95;
    addCluster(cx0 + (rnd(ri + 90) - 0.5) * rCap * 0.4, yTop - rCap * 0.5, rCap, 2, { lit: true });
    return bottomIdx;
  };

  // --- Trunk (possibly forked) + crown dome(s).
  const crownBot = H * g.cBot;
  const crownCx = g.crownDx * unit + g.lean * unit * 0.9;
  let bottomIdx: number[] = [];
  if (g.split !== null) {
    // Fork: shared lower trunk, two arms, two fused mini-domes.
    const splitY = crownBot * g.split * 1.6;
    const lower = grownSpine(0, 0, bowSign * g.bow * unit * 0.2, splitY, g.bow * 0.4, g.lean * 0.5, g.gnarl, bowSign, unit, rnd, 3, 4);
    const [sx, sy] = lower[lower.length - 1]!;
    const straddle = (0.64 + rnd(4) * 0.3) * unit;
    const armTop = crownBot + (H - crownBot) * 0.3;
    for (const side of [-1, 1]) {
      const hx = sx + side * straddle + g.lean * unit * 0.4;
      const arm = grownSpine(sx, sy, hx, armTop, g.bow * 0.5, 0, g.gnarl, side, unit, rnd, 5 + (side + 1) * 3, 4);
      branches.push({ pts: arm, w0: g.trunkW * 0.7, w1: g.trunkW * 0.32, flare: 0.2, tip: -1, level: 0 });
      bottomIdx.push(...dome(hx, crownBot + side * 0.06, H - (side < 0 ? 0.12 : 0), g.crownW, 40 + (side + 1) * 20));
    }
    branches.push({ pts: lower, w0: g.trunkW, w1: g.trunkW * 0.82, flare: g.flare, tip: -1, level: 0 });
  } else {
    // The trunk climbs INTO the dome so the joint can never show.
    const trunkTop = crownBot + (H - crownBot) * 0.3;
    const trunk = grownSpine(0, 0, g.lean * unit * 0.7, trunkTop, g.bow, g.lean, g.gnarl, bowSign, unit, rnd, 3, 6);
    bottomIdx = dome(crownCx, crownBot, H, g.crownW, 40);

    // Boughs: short, fill-only, from the upper trunk to just SHORT of
    // a bottom-tier cluster's centre — tips always buried in foliage.
    const boughN = Math.round(lerp(g.boughN, rnd(10)));
    for (let i = 0; i < boughN && bottomIdx.length > 0; i++) {
      const ci = bottomIdx[Math.floor(rnd(12 + i) * bottomIdx.length) % bottomIdx.length]!;
      const c = clusters[ci]!;
      const a = g.boughStart + rnd(14 + i) * (0.9 - g.boughStart);
      const [ax, ay] = alongSpine(trunk, a);
      const ex = ax + (c.x - ax) * 0.75;
      const ey = ay + (c.y - ay) * 0.75;
      const bough = grownSpine(ax, ay, ex, ey, 0.06, 0, g.gnarl * 0.7, c.x < ax ? -1 : 1, unit, rnd, 20 + i * 4, 3);
      branches.push({ pts: bough, w0: g.trunkW * 0.55, w1: g.trunkW * 0.16, flare: 0, tip: ci, level: 1 });
    }
    // Trunk LAST: its body paints over every bough join (seam law).
    branches.push({ pts: trunk, w0: g.trunkW, w1: g.trunkW * g.taper, flare: g.flare, tip: -1, level: 0 });
  }

  // Willow: drooping underside clusters spilling below the dome edge.
  for (let d = 0; d < g.droop; d++) {
    const t = g.droop === 1 ? 0.5 : d / (g.droop - 1);
    const dx2 = crownCx + (t - 0.5) * 2 * g.crownW * 0.85 + (rnd(70 + d) - 0.5) * 0.3;
    const rr = lerp(g.crownR, rnd(72 + d)) * 0.7;
    addCluster(dx2, crownBot - rr * (0.35 + (d % 2) * 0.5), rr, 0, { droop: true });
  }

  let top = 0;
  let spread = 0;
  for (const c of clusters) {
    top = Math.max(top, c.y + c.r);
    spread = Math.max(spread, Math.abs(c.x) + c.r);
  }

  const model: TreeModel = {
    species, variant,
    height: Math.max(H, top),
    spread,
    bark: g.bark,
    barkLit: shade(g.bark, g.bark === '#d7d2c4' ? 10 : 16),
    barkDark: shade(g.bark, -18),
    leaves: g.leaves,
    sides: g.sides,
    strands: g.strands,
    branches,
    clusters,
  };
  modelCache.set(key, model);
  return model;
}

export interface TreeFrame {
  bx: number; // screen x of the trunk base
  groundY: number; // screen y of the trunk base
  s: number; // px per tile
  syT: number; // foreshortened ground unit (s * yScale)
  wx: number; // world position — wind phase, NEVER screen coords
  wy: number;
  tSec: number;
  /** Felling override: replaces the sampled wind bend. */
  windOverride?: number;
  /** 0..1 growth: saplings ~0.45, grow-in eases to 1. Default 1. */
  grow?: number;
}

/** Fill a tapered branch as a bark polygon, optionally edge-lit. */
function fillLimb(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  w0: number, w1: number, flare: number,
  bark: string, lit: string, dark: string,
  edges: boolean,
): void {
  const n = pts.length;
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const u = i / (n - 1);
    let w = w0 + (w1 - w0) * u;
    // The flare factor 0.4 is load-bearing: maxTrunkBaseRadius() must
    // report the same widening so colliders stay honest.
    if (u < 0.2) w *= 1 + flare * ((0.2 - u) / 0.2) * 0.4;
    left.push([pts[i]![0] - ty * w, pts[i]![1] + tx * w]);
    right.push([pts[i]![0] + ty * w, pts[i]![1] - tx * w]);
  }
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(left[0]![0], left[0]![1]);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i]![0], left[i]![1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i]![0], right[i]![1]);
  ctx.closePath();
  ctx.fill();
  if (!edges) return;
  ctx.lineJoin = 'round';
  // Lit west edge, shaded east edge — the round-trunk read.
  ctx.strokeStyle = lit;
  ctx.lineWidth = Math.max(1, w0 * 0.5);
  ctx.beginPath();
  ctx.moveTo(left[0]![0], left[0]![1]);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i]![0], left[i]![1]);
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, w0 * 0.32);
  ctx.beginPath();
  ctx.moveTo(right[0]![0], right[0]![1]);
  for (let i = 1; i < n; i++) ctx.lineTo(right[i]![0], right[i]![1]);
  ctx.stroke();
}

/**
 * Paint a grown tree. Returns the sampled wind value so the caller
 * can gate ambient leaf-shed on gust strength.
 */
export function paintTree(ctx: CanvasRenderingContext2D, m: TreeModel, f: TreeFrame): number {
  const s = f.s;
  const g = f.grow ?? 1;
  // Young trees are thin as well as short.
  const wMul = 0.45 + 0.55 * g;
  const rMul = 0.5 + 0.5 * g;
  const X = (x: number): number => f.bx + x * g * s;
  const Y = (y: number): number => f.groundY - y * g * s;

  const wind = f.windOverride !== undefined ? f.windOverride : windScalarAt(f.wx, f.wy, f.tSec);
  const H = m.height;
  // Cantilever: base planted, crown swaying most (tiles at hf = 1).
  const bendT = wind * 0.055 * H;
  const disp = (hf: number): number => bendT * Math.pow(Math.max(0, hf), 1.4);

  // --- Per-cluster rustle: each segment of the crown re-samples the
  // ONE wind field at its own world offset and height lag, plus a
  // small flutter whose phase comes from world position. Segments
  // move independently; the stand still breathes together.
  const n = m.clusters.length;
  const rx = new Float32Array(n);
  const ry = new Float32Array(n);
  const rb = new Float32Array(n);
  const windy = 0.2 + Math.min(1, Math.abs(wind));
  for (let i = 0; i < n; i++) {
    const c = m.clusters[i]!;
    if (g < 0.7 && c.extra) continue;
    const local = f.windOverride !== undefined
      ? wind
      : windScalarAt(f.wx + c.x * 0.8, f.wy - c.y * 0.35, f.tSec - c.hf * 0.3);
    const ph = f.wx * 1.7 + f.wy * 1.3 + c.x * 2.1 + c.y * 1.6;
    const amp = windy * 0.02 * (0.5 + c.r);
    const gust = Math.max(-0.05 * H, Math.min(0.05 * H, (local - wind) * 0.05 * H));
    rx[i] = disp(c.hf) + gust + Math.sin(f.tSec * (1.7 + (c.seed % 5) * 0.13) + ph) * amp;
    ry[i] = Math.cos(f.tSec * (1.35 + (c.seed % 3) * 0.17) + ph * 1.29) * amp * 0.55;
    rb[i] = 1 + 0.02 * Math.sin(f.tSec * 1.9 + ph);
  }

  // --- Root flares (the trunk is the LAST branch — seam law).
  const trunk = m.branches[m.branches.length - 1]!;
  const w0px = trunk.w0 * wMul * s * g;
  ctx.fillStyle = shade(m.bark, -8);
  for (const rs of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(f.bx + rs * w0px * (1 + trunk.flare), f.groundY - w0px * 0.9);
    ctx.lineTo(f.bx + rs * w0px * (2.3 + trunk.flare), f.groundY + f.syT * 0.02 * g);
    ctx.lineTo(f.bx + rs * w0px * 0.5, f.groundY + f.syT * 0.03 * g);
    ctx.closePath();
    ctx.fill();
  }

  // --- Branches. Boughs (level 1) first, fill-only; then trunk/arms
  // (level 0) with edge light — the trunk body covers every join.
  for (const b of m.branches) {
    if (g < 0.7 && b.level === 1) continue;
    const last = b.pts.length - 1;
    // Anchoring law: a branch's base rides the cantilever exactly like
    // the spine it grew from, and its TIP lands exactly on its foliage
    // cluster's displaced centre — boughs can never float off their
    // trunk or shed their leaves sideways, at any wind.
    const tipY = b.pts[last]![1];
    const tipDx = b.tip >= 0 ? rx[b.tip]! - disp(Math.min(1, tipY / H)) : 0;
    const tipDy = b.tip >= 0 ? ry[b.tip]! : 0;
    const px: Array<[number, number]> = b.pts.map(([x, y], i) => {
      const u = last > 0 ? i / last : 0;
      const w = u * u;
      const hf = Math.min(1, y / H);
      return [X(x + disp(hf) + tipDx * w), Y(y + tipDy * w)];
    });
    fillLimb(
      ctx, px,
      b.w0 * wMul * s * g, b.w1 * wMul * s * g, b.flare,
      m.bark, m.barkLit, m.barkDark,
      b.level === 0,
    );
  }

  // Bark seam ticks along the trunk.
  ctx.strokeStyle = m.barkDark;
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  for (let i = 1; i < trunk.pts.length - 1; i += 2) {
    const [x, y] = trunk.pts[i]!;
    const sxp = X(x + disp(Math.min(1, y / H)) + trunk.w0 * 0.25);
    ctx.moveTo(sxp, Y(y));
    ctx.lineTo(sxp, Y(y) - s * 0.13 * g);
  }
  ctx.stroke();

  // --- THE CANOPY MASS: every cluster contributes its blob to
  // batched tone paths — one shade layer beneath, three light bands,
  // bright facets on the lit crown. Single-fill-per-tone is what
  // fuses the clusters into one sculpted low-poly volume (and it is
  // 6 fills per tree instead of 30).
  const shadePath = new Path2D();
  const tonePaths = [new Path2D(), new Path2D(), new Path2D()];
  const litPath = new Path2D();
  const pctx = (p: Path2D): CanvasRenderingContext2D => p as unknown as CanvasRenderingContext2D;
  let drew = false;
  for (let i = 0; i < n; i++) {
    const c = m.clusters[i]!;
    if (g < 0.7 && c.extra) continue;
    drew = true;
    const cx = X(c.x + rx[i]!);
    const cy = Y(c.y + ry[i]!);
    const cr = c.r * rMul * s * g * rb[i]!;
    facetBlob(pctx(shadePath), cx + cr * 0.11, cy + cr * 0.13, cr * 0.98, c.seed, m.sides, 0.92);
    facetBlob(pctx(tonePaths[c.tone]!), cx, cy, cr * 0.94, c.seed, m.sides, 0.92);
    if (c.lit) {
      facetBlob(pctx(litPath), cx - cr * 0.2, cy - cr * 0.28, cr * 0.5, c.seed ^ 0x55, 6, 0.9);
    }
  }
  if (drew) {
    // Depth rim under and right of the whole mass.
    ctx.fillStyle = shade(m.leaves[0], -20);
    ctx.fill(shadePath);
    // Light bands, dark underside upward to the lit crown.
    ctx.fillStyle = m.leaves[0];
    ctx.fill(tonePaths[0]!);
    ctx.fillStyle = m.leaves[1];
    ctx.fill(tonePaths[1]!);
    ctx.fillStyle = m.leaves[2];
    ctx.fill(tonePaths[2]!);
    // Sun facets on the crown.
    ctx.fillStyle = shade(m.leaves[2], 24);
    ctx.fill(litPath);
  }

  // Willow curtains: chisel-cut strands hanging off drooping
  // clusters, tips swinging with the cluster's own rustle.
  if (m.strands > 0) {
    for (let i = 0; i < n; i++) {
      const c = m.clusters[i]!;
      if (!c.droop) continue;
      const cx = X(c.x + rx[i]!);
      const cy = Y(c.y + ry[i]!);
      const cr = c.r * rMul * s * g;
      ctx.fillStyle = shade(m.leaves[1], 6);
      for (let k = 0; k < m.strands; k++) {
        const t = m.strands === 1 ? 0.5 : k / (m.strands - 1);
        const sx0 = cx + (t - 0.5) * cr * 1.5;
        const sy0 = cy + cr * 0.4;
        const len = cr * (1.15 + ((c.seed >> (k * 2)) % 4) * 0.16);
        const swing = rx[i]! * s * 0.5 + Math.sin(f.tSec * 1.9 + t * 5 + c.seed) * windy * s * 0.03;
        ctx.beginPath();
        ctx.moveTo(sx0 - s * 0.035, sy0);
        ctx.lineTo(sx0 + s * 0.035, sy0);
        ctx.lineTo(sx0 + swing + s * 0.012, sy0 + len);
        ctx.lineTo(sx0 + swing - s * 0.012, sy0 + len);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  return wind;
}
