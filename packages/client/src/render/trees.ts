/**
 * The tree grower — DevCraft's forests, grown not authored.
 *
 * Every tree on the map is GROWN from a species grammar + the tile's
 * hash: a deterministic branching skeleton (trunk spine, primary
 * limbs, twigs) hung with low-poly foliage clusters. The same tile
 * always grows the same tree, on every client, with no stored
 * geometry — the model is derived on first sight and cached.
 *
 * Species are GRAMMARS, not sprites: each defines growth ranges
 * (height, trunk width, branching habit, crown shape) plus three
 * bespoke structural VARIANTS, so a stand reads as siblings, never
 * clones. Adding a tree type = one new species entry.
 *
 * Scale law: the player reads ~1.2 tiles tall on screen. Common
 * trees stand 3-4x that, oaks and yews 4-5x — tall enough to be
 * lost under, never lollipops. Trunk base half-widths are the
 * physical truth: `tileColliderRadius` in shared tiles.ts must stay
 * a whisker wider than the fattest variant's flared base so bodies
 * brush past exactly what they see.
 *
 * Wind: the whole tree bends as a cantilever on the ONE shared wind
 * field (grass.ts windScalarAt) — the same squalls sweep meadow and
 * canopy. On top, every foliage cluster re-samples the field at ITS
 * OWN world offset with a height lag, so segments of one crown
 * rustle independently while neighbouring trees stay coherent. All
 * phase comes from world position — never per-tree randomness.
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
  /** 0 = trunk, 1 = primary limb, 2 = twig (thinned on saplings). */
  level: number;
}

export interface TreeCluster {
  x: number;
  y: number; // centre, model tiles (y up)
  r: number;
  /** Height fraction 0..1 — drives the cantilever displacement. */
  hf: number;
  seed: number;
  /** Index into the species leaf palette. */
  tone: number;
  /** Crown filler — young trees haven't grown these yet. */
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
  leaves: string[];
  sides: number;
  /** Curtain strands per drooping cluster (willow), 0 = none. */
  strands: number;
  branches: TreeBranch[]; // trunk first
  clusters: TreeCluster[]; // pre-sorted: higher first (painted back-to-front)
}

/** One species' growth grammar. Variants override any subset. */
interface Grow {
  bark: string;
  leaves: string[];
  h: [number, number]; // total height range, tiles
  trunkW: number; // base half-width, tiles
  taper: number; // tip half-width fraction of trunkW
  bow: number; // sideways trunk bulge (± by hash)
  lean: number; // constant windswept lean
  gnarl: number; // trunk edge waviness
  flare: number; // root-flare boost
  split: number | null; // trunk forks at this fraction, or null
  limbN: [number, number]; // primary limb count range
  limbStart: number; // trunk fraction where limbs begin
  limbEnd: number; // trunk fraction where limbs stop
  limbLen: [number, number]; // limb reach, fraction of height
  limbUp: number; // limb rise per unit reach (0 = level, 1 = steep)
  curve: number; // upward curl of limb tips
  twigs: number; // chance per limb of a secondary twig
  crownR: [number, number]; // foliage cluster radius range, tiles
  fill: number; // crown filler cluster count
  fillW: number; // filler spread half-width, tiles
  fillH: number; // filler spread half-height, tiles
  fillDx: number; // filler centre x-shift (windswept crowns stream)
  droop: number; // hanging clusters per limb tip (willow)
  strands: number; // curtain strands per drooping cluster
  sides: number; // facet count for the low-poly clusters
}

interface SpeciesDef {
  base: Grow;
  /** 2-3 structural variants — hash-picked, each a real silhouette. */
  variants: Array<Partial<Grow>>;
}

const GREENS = ['#3a8140', '#35773a', '#3f8a3c'];

/**
 * Species 0-4 are the common wood (Tile.Tree picks by hash); 5 oak,
 * 6 willow, 7 yew are the named harvest trees.
 */
const SPECIES: SpeciesDef[] = [
  // 0 — Maple: the archetype. Sturdy trunk, full rounded crown.
  {
    base: {
      bark: '#6b4a26', leaves: GREENS,
      h: [3.9, 4.6], trunkW: 0.13, taper: 0.35, bow: 0.1, lean: 0,
      gnarl: 0.03, flare: 0.9, split: null,
      limbN: [2, 3], limbStart: 0.48, limbEnd: 0.72, limbLen: [0.22, 0.3],
      limbUp: 0.55, curve: 0.08, twigs: 0.35,
      crownR: [0.62, 0.85], fill: 3, fillW: 0.9, fillH: 0.55, fillDx: 0,
      droop: 0, strands: 0, sides: 8,
    },
    variants: [
      {}, // classic round crown
      { h: [4.4, 5.0], trunkW: 0.115, limbStart: 0.58, crownR: [0.55, 0.75], fillW: 0.7 }, // tall
      { h: [3.6, 4.2], limbN: [3, 4], limbLen: [0.3, 0.4], limbUp: 0.3, fillW: 1.25, fillH: 0.45 }, // spreading
    ],
  },
  // 1 — Birch: tall, slim, pale, airy vertical crown.
  {
    base: {
      bark: '#d7d2c4', leaves: ['#5a9b48', '#63a850', '#579544'],
      h: [4.6, 5.5], trunkW: 0.085, taper: 0.45, bow: 0.16, lean: 0,
      gnarl: 0.02, flare: 0.5, split: null,
      limbN: [2, 3], limbStart: 0.55, limbEnd: 0.85, limbLen: [0.14, 0.2],
      limbUp: 0.7, curve: 0.05, twigs: 0.2,
      crownR: [0.38, 0.55], fill: 3, fillW: 0.5, fillH: 0.9, fillDx: 0,
      droop: 0, strands: 0, sides: 7,
    },
    variants: [
      {}, // gentle S-bow
      { lean: 0.18, bow: 0.1 }, // leaning off plumb
      { h: [4.2, 5.0], fill: 2, crownR: [0.32, 0.46] }, // sparse weathered
    ],
  },
  // 2 — Twin: the trunk forks into a Y carrying two crowns.
  {
    base: {
      bark: '#66492a', leaves: GREENS,
      h: [3.9, 4.6], trunkW: 0.135, taper: 0.4, bow: 0.05, lean: 0,
      gnarl: 0.04, flare: 0.85, split: 0.42,
      limbN: [0, 1], limbStart: 0.25, limbEnd: 0.38, limbLen: [0.18, 0.24],
      limbUp: 0.45, curve: 0.06, twigs: 0,
      crownR: [0.5, 0.7], fill: 2, fillW: 0.55, fillH: 0.4, fillDx: 0,
      droop: 0, strands: 0, sides: 8,
    },
    variants: [
      {}, // classic Y
      { split: 0.3, h: [3.7, 4.3] }, // low fork, wide straddle
      { split: 0.56, h: [4.2, 4.9], crownR: [0.45, 0.62] }, // high tight fork
    ],
  },
  // 3 — Windswept: leans hard, crown streaming downwind.
  {
    base: {
      bark: '#6b4a26', leaves: ['#3f8a3c', '#479243', '#3a8140'],
      h: [3.4, 4.1], trunkW: 0.115, taper: 0.4, bow: 0.12, lean: 0.55,
      gnarl: 0.05, flare: 0.9, split: null,
      limbN: [2, 3], limbStart: 0.45, limbEnd: 0.75, limbLen: [0.2, 0.28],
      limbUp: 0.35, curve: 0.1, twigs: 0.25,
      crownR: [0.5, 0.68], fill: 3, fillW: 0.85, fillH: 0.45, fillDx: 0.55,
      droop: 0, strands: 0, sides: 8,
    },
    variants: [
      {}, // streaming
      { lean: 0.85, h: [3.1, 3.7], fillDx: 0.8 }, // cliff-bent survivor
      { fill: 2, crownR: [0.42, 0.58], h: [3.6, 4.3] }, // crest-broken, sparse
    ],
  },
  // 4 — Broadleaf: short thick trunk, wide low crown, heavy boughs.
  {
    base: {
      bark: '#6f5030', leaves: ['#48924a', '#3f8a3c', '#4f9a4e'],
      h: [3.0, 3.6], trunkW: 0.17, taper: 0.45, bow: 0.05, lean: 0,
      gnarl: 0.04, flare: 1.1, split: null,
      limbN: [3, 4], limbStart: 0.38, limbEnd: 0.62, limbLen: [0.3, 0.42],
      limbUp: 0.25, curve: 0.1, twigs: 0.5,
      crownR: [0.55, 0.75], fill: 4, fillW: 1.3, fillH: 0.5, fillDx: 0,
      droop: 0, strands: 0, sides: 9,
    },
    variants: [
      {}, // dome
      { h: [2.8, 3.3], limbLen: [0.4, 0.52], limbUp: 0.12, fillW: 1.6 }, // sprawler
      { h: [3.3, 3.9], fillH: 0.85, fill: 5 }, // tiered double-storey
    ],
  },
  // 5 — Ancient oak: the landmark. Thick gnarled trunk, heavy limbs,
  // deep dark canopy — the tree the forest gathers around.
  {
    base: {
      bark: '#5d4022', leaves: ['#2c5c31', '#2f6135', '#295830'],
      h: [4.8, 5.7], trunkW: 0.26, taper: 0.4, bow: 0.07, lean: 0,
      gnarl: 0.1, flare: 1.25, split: null,
      limbN: [3, 4], limbStart: 0.4, limbEnd: 0.68, limbLen: [0.28, 0.4],
      limbUp: 0.4, curve: 0.12, twigs: 0.6,
      crownR: [0.68, 0.95], fill: 5, fillW: 1.5, fillH: 0.7, fillDx: 0,
      droop: 0, strands: 0, sides: 9,
    },
    variants: [
      {}, // broad king
      { h: [5.0, 6.0], trunkW: 0.28, gnarl: 0.16, bow: 0.14, limbN: [4, 5] }, // ancient
      { split: 0.5, gnarl: 0.13, crownR: [0.6, 0.82], fill: 3 }, // storm-split twin crown
    ],
  },
  // 6 — Weeping willow: arched limbs, curtain crown hanging low.
  {
    base: {
      bark: '#6f6448', leaves: ['#7aa062', '#6f9a58', '#83aa6a'],
      h: [3.7, 4.4], trunkW: 0.15, taper: 0.4, bow: 0.18, lean: 0.1,
      gnarl: 0.07, flare: 1.0, split: null,
      limbN: [3, 4], limbStart: 0.5, limbEnd: 0.8, limbLen: [0.25, 0.35],
      limbUp: 0.45, curve: 0.14, twigs: 0,
      crownR: [0.5, 0.68], fill: 3, fillW: 1.0, fillH: 0.4, fillDx: 0,
      droop: 2, strands: 4, sides: 9,
    },
    variants: [
      {}, // full curtain
      { lean: 0.25, fillDx: 0.35 }, // riverbank lean
      { h: [4.2, 4.9], droop: 3, strands: 5 }, // old weeper
    ],
  },
  // 7 — Ancient yew: red-brown twisted mass under a near-black crown.
  {
    base: {
      bark: '#7d4436', leaves: ['#274f30', '#224a2c', '#2c5434'],
      h: [4.5, 5.3], trunkW: 0.24, taper: 0.45, bow: 0.06, lean: 0,
      gnarl: 0.12, flare: 1.2, split: null,
      limbN: [3, 4], limbStart: 0.35, limbEnd: 0.6, limbLen: [0.24, 0.34],
      limbUp: 0.35, curve: 0.08, twigs: 0.5,
      crownR: [0.6, 0.85], fill: 5, fillW: 1.2, fillH: 0.75, fillDx: 0,
      droop: 0, strands: 0, sides: 9,
    },
    variants: [
      {}, // dense dome
      { bow: 0.2, gnarl: 0.18 }, // twisted
      { h: [4.9, 5.7], fillW: 0.85, fillH: 1.0, crownR: [0.5, 0.7] }, // spired
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
 * the art. Flare widens the first fifth of the trunk by up to
 * (1 + flare * 0.4) at the very base.
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
  const variant = Math.floor(rnd(0) * (def.variants.length)) % def.variants.length;
  const g: Grow = { ...def.base, ...def.variants[variant] };

  const H = g.h[0] + (g.h[1] - g.h[0]) * rnd(1);
  // Curve character scale: coefficients are authored against a
  // ~3.5-tile reference so taller species curve, not flail.
  const unit = H / 3.5;
  const bowSign = rnd(2) < 0.5 ? -1 : 1;
  const lerp = (r: [number, number], t: number): number => r[0] + (r[1] - r[0]) * t;

  const branches: TreeBranch[] = [];
  const clusters: TreeCluster[] = [];
  const tone = (i: number): number => Math.floor(rnd(90 + i) * g.leaves.length) % g.leaves.length;

  const addCluster = (
    x: number, y: number, r: number, i: number, extra: boolean, droop: boolean,
  ): number => {
    // Crown ceiling: no cluster tops out above H, so model.height is
    // exactly H and the renderer's south-pad culling stays honest.
    const cy = Math.min(y, H - r);
    // Crown reach: |x| + r stays inside the renderer's ±3-column
    // culling pad with room for wind sway — hard-leaning variants
    // stream, they don't leave the stage.
    const cx = Math.sign(x) * Math.min(Math.abs(x), 2.6 - r);
    clusters.push({ x: cx, y: cy, r, hf: Math.min(1, cy / H), seed: h ^ (clusters.length * 0x9e37), tone: tone(i), extra, droop });
    return clusters.length - 1;
  };

  // --- Trunk (possibly forked). Crown heads = where fillers gather.
  const trunkTopY = H * 0.82;
  const heads: Array<[number, number]> = [];
  if (g.split !== null) {
    const splitY = trunkTopY * g.split;
    const lower = grownSpine(0, 0, bowSign * g.bow * unit * 0.3, splitY, g.bow * 0.4, g.lean * 0.5, g.gnarl, bowSign, unit, rnd, 3, 4);
    branches.push({ pts: lower, w0: g.trunkW, w1: g.trunkW * 0.8, flare: g.flare, tip: -1, level: 0 });
    const [sx, sy] = lower[lower.length - 1]!;
    const straddle = 0.55 + rnd(4) * 0.35;
    for (const side of [-1, 1]) {
      const hx = sx + side * straddle + g.lean * H * 0.3;
      const arm = grownSpine(sx, sy, hx, trunkTopY, g.bow * 0.6, 0, g.gnarl, side, unit, rnd, 5 + (side + 1) * 3, 4);
      const r0 = lerp(g.crownR, rnd(7 + side));
      const ci = addCluster(hx, trunkTopY + r0 * 0.35, r0, 8 + side, false, false);
      branches.push({ pts: arm, w0: g.trunkW * 0.72, w1: g.trunkW * 0.35, flare: 0.2, tip: ci, level: 0 });
      heads.push([hx, trunkTopY + r0 * 0.3]);
    }
  } else {
    const trunk = grownSpine(0, 0, g.lean * H * 0.25, trunkTopY, g.bow, g.lean, g.gnarl, bowSign, unit, rnd, 3, 7);
    const [tx, ty] = trunk[trunk.length - 1]!;
    const r0 = lerp(g.crownR, 0.6 + rnd(6) * 0.4);
    const ci = addCluster(tx, ty + r0 * 0.35, r0, 6, false, false);
    branches.push({ pts: trunk, w0: g.trunkW, w1: g.trunkW * g.taper, flare: g.flare, tip: ci, level: 0 });
    heads.push([tx + g.fillDx * 0.4, ty + r0 * 0.25]);
  }
  const trunkPts = branches[0]!.pts;

  // --- Primary limbs reaching out to their own foliage.
  const limbN = Math.round(lerp(g.limbN, rnd(10)));
  let side = rnd(11) < 0.5 ? -1 : 1;
  for (let i = 0; i < limbN; i++) {
    const a = g.limbStart + (g.limbEnd - g.limbStart) * ((i + rnd(12 + i) * 0.6) / Math.max(1, limbN));
    // Windswept trees grow leeward only: every limb streams with the lean.
    if (g.lean > 0.3) side = 1;
    const [ax, ay] = alongSpine(trunkPts, g.split !== null ? Math.min(a / g.split, 0.95) : a);
    const reach = lerp(g.limbLen, rnd(14 + i)) * H;
    const ex = ax + side * reach + g.lean * reach * 0.5;
    const ey = ay + reach * (g.limbUp + (rnd(16 + i) - 0.5) * 0.3) + g.curve * reach;
    const limb = grownSpine(ax, ay, ex, ey, 0.1, 0, g.gnarl, side, unit, rnd, 20 + i * 4, 3);
    const lr = lerp(g.crownR, rnd(18 + i)) * 0.82;
    const ci = addCluster(ex + side * lr * 0.25, ey + lr * 0.3, lr, 20 + i, false, false);
    branches.push({ pts: limb, w0: g.trunkW * 0.5, w1: g.trunkW * 0.16, flare: 0, tip: ci, level: 1 });

    // Weeping species hang curtain clusters below each limb tip.
    for (let d = 0; d < g.droop; d++) {
      const dx2 = ex + (rnd(30 + i * 3 + d) - 0.5) * lr * 1.4;
      addCluster(dx2, ey - lr * (0.7 + d * 0.75), lr * (0.72 - d * 0.12), 30 + i + d, false, true);
    }

    // Twigs: secondary bushing off the limb's midpoint.
    if (rnd(40 + i) < g.twigs) {
      const [mx, my] = alongSpine(limb, 0.55);
      const tr = reach * 0.5;
      const tx2 = mx + side * tr * 0.7;
      const ty2 = my + tr * (g.limbUp + 0.35);
      const twig = grownSpine(mx, my, tx2, ty2, 0.08, 0, g.gnarl, side, unit, rnd, 50 + i * 3, 2);
      const wr = lr * 0.6;
      const wi = addCluster(tx2, ty2 + wr * 0.25, wr, 40 + i, false, false);
      branches.push({ pts: twig, w0: g.trunkW * 0.24, w1: g.trunkW * 0.1, flare: 0, tip: wi, level: 2 });
    }
    side = -side;
  }

  // --- Crown fillers: pack the silhouette around each head.
  const perHead = Math.max(1, Math.round(g.fill / heads.length));
  for (let hd = 0; hd < heads.length; hd++) {
    const [hx, hy] = heads[hd]!;
    for (let j = 0; j < perHead; j++) {
      const ri = 60 + hd * 16 + j * 3;
      const fx = hx + g.fillDx + (rnd(ri) - 0.5) * 2 * g.fillW;
      const fy = hy - g.crownR[0] * 0.2 + (rnd(ri + 1) - 0.35) * 2 * g.fillH;
      const fr = lerp(g.crownR, rnd(ri + 2)) * (0.75 + rnd(ri + 3) * 0.3);
      addCluster(fx, fy, fr, ri, true, false);
      if (g.droop > 0 && rnd(ri + 4) < 0.5) {
        addCluster(fx + (rnd(ri + 5) - 0.5) * fr, fy - fr * 1.1, fr * 0.6, ri + 6, true, true);
      }
    }
  }

  // Paint order: higher clusters first, lower ones overpaint them —
  // the crown's underside reads nearest, same depth law as the world.
  // Branch tips were captured as pre-sort indices; seeds are unique
  // (index-derived), so they resolve the permutation exactly.
  clusters.sort((a, b) => b.y - a.y);
  const seedToIdx = new Map<number, number>();
  clusters.forEach((c, i) => seedToIdx.set(c.seed, i));
  for (const b of branches) {
    if (b.tip >= 0) b.tip = seedToIdx.get(h ^ (b.tip * 0x9e37)) ?? -1;
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

/** Fill a tapered branch as a bark polygon with lit/shade edges. */
function fillLimb(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  w0: number, w1: number, flare: number,
  bark: string, lit: string, dark: string,
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
    rb[i] = 1 + 0.025 * Math.sin(f.tSec * 1.9 + ph);
  }

  // --- Root flares.
  const w0px = m.branches[0]!.w0 * wMul * s * g;
  ctx.fillStyle = shade(m.bark, -8);
  const fl = m.branches[0]!.flare;
  for (const rs of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(f.bx + rs * w0px * (1 + fl), f.groundY - w0px * 0.9);
    ctx.lineTo(f.bx + rs * w0px * (2.3 + fl), f.groundY + f.syT * 0.02 * g);
    ctx.lineTo(f.bx + rs * w0px * 0.5, f.groundY + f.syT * 0.03 * g);
    ctx.closePath();
    ctx.fill();
  }

  // --- Branches: trunk, limbs, twigs — each displaced by the
  // cantilever, tips dragged by the foliage they carry.
  for (const b of m.branches) {
    if (g < 0.7 && b.level === 2) continue;
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
    fillLimb(ctx, px, b.w0 * wMul * s * g, b.w1 * wMul * s * g, b.flare, m.bark, m.barkLit, m.barkDark);
  }

  // Bark seam ticks along the trunk.
  const trunk = m.branches[0]!;
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

  // --- Foliage: low-poly clusters, three tones each, back-to-front.
  for (let i = 0; i < n; i++) {
    const c = m.clusters[i]!;
    if (g < 0.7 && c.extra) continue;
    const leaf = m.leaves[c.tone]!;
    const cx = X(c.x + rx[i]!);
    const cy = Y(c.y + ry[i]!);
    const cr = c.r * rMul * s * g * rb[i]!;
    ctx.fillStyle = shade(leaf, -16);
    ctx.beginPath();
    facetBlob(ctx, cx + cr * 0.12, cy + cr * 0.14, cr * 0.95, c.seed, m.sides, 0.92);
    ctx.fill();
    ctx.fillStyle = leaf;
    ctx.beginPath();
    facetBlob(ctx, cx, cy, cr * 0.93, c.seed, m.sides, 0.92);
    ctx.fill();
    ctx.fillStyle = shade(leaf, 18);
    ctx.beginPath();
    facetBlob(ctx, cx - cr * 0.26, cy - cr * 0.3, cr * 0.5, c.seed ^ 0x55, 6, 0.9);
    ctx.fill();

    // Willow curtains: chisel-cut strands hanging off drooping
    // clusters, tips swinging with the cluster's own rustle.
    if (c.droop && m.strands > 0) {
      ctx.fillStyle = shade(leaf, 8);
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
