/**
 * The tree grower — Arx's forests, grown not authored.
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
 * THE WILLOW REBUILT (the weeping species' own law — supersedes
 * every skirt-on-a-crown draft):
 * - The willow has its OWN anatomy, not a shrunken dome with
 *   dressing: trunk → arching LIMBS → fronds pouring off the arcs.
 *   Four or five real wooden limbs rise from the upper trunk, arc
 *   outward and droop at the ends; every streamer is anchored at an
 *   actual point ALONG a limb, so the cascade hangs from the wood
 *   that carries it.
 * - The crown is a BROKEN crown: an apex knot on the trunk top plus
 *   small tufts riding each limb — never one fused dome. Tufts bury
 *   every streamer anchor and every limb tip (seam law, both ways).
 * - Hem law: anchors nearer the center hang longest, tips are
 *   STAGGERED chisel points, and daylight opens between the outer
 *   hems. A willow you cannot see through at the fringe is a blob
 *   wearing a skirt. The bole shows only LOW through the front
 *   parting — never a bare pole up the tree.
 * - Depth is layered back to front, one batched fill per tone: the
 *   rear limbs' dark streamers paint BEHIND the trunk, mid
 *   streamers over it, the sun-side limb carries the lit fronds,
 *   bright escaped withies fly off the limb tips last.
 * - EVERY section moves on the ONE wind field, independently: tufts
 *   rustle per-cluster, limbs flex with their tuft (anchoring law),
 *   and each streamer pendulums at its own lag AND carries a
 *   traveling ripple down its length (dropF phase) — cloth waving
 *   from the arc, not a rigid flag. Strand part-lines (one batched
 *   stroke) keep same-tone fronds reading combed, never a slab.
 *
 * THE PINE (the cold-country species' own law):
 * - A pine is TIERS, not a dome: downswept chevron plates stacked up
 *   a straight spire trunk, each hem cut into serrated teeth, bare
 *   bole and daylight under the lowest tier, a pointed spire cap.
 *   The silhouette is the species — nothing round anywhere.
 * - Light is banded by tier (dark low band, mid above) and every
 *   plate wears a WEST-LIT facet — the one sun, sculpting the cone.
 *   Tier separation is a single batched hem stroke (the shingle
 *   line), never per-plate strokes.
 * - Plates are near-rigid: the trunk cantilever carries them, the
 *   hem teeth flutter barely at all (drop weights ~0.2). Ridge
 *   tufts and the spire tuft add the soft mass over the crisp
 *   plates; dead whorl stubs stand on the bare bole.
 * - Tone indices are per-species SEMANTICS, not colors: the pine
 *   paints lower band / upper band / lit facets in its own order,
 *   all still one batched fill per tone.
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

import { Tile, hashCoords } from '@arx/shared';
import { BLOB_M, unitBlob } from './shapes.js';
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
}

/**
 * One curtain of weeping foliage (the willow's skirt). The polygon
 * is final model-space geometry — faceted flanks and a chisel-cut
 * fringe — plus a per-vertex swing weight so the paint pass can hang
 * it like cloth off the wind field.
 */
export interface TreeCurtain {
  /** Polygon in model tiles (y up), fringe cut into the hem. */
  pts: Array<[number, number]>;
  /** Per-vertex swing weight: 0 anchored top → ~1 free hem. */
  drop: number[];
  /** Raw drop FRACTION per vertex (0 anchor → 1 hem) — the phase
   *  rail the traveling ripple runs down. */
  dropF: number[];
  /** Vertex index range [from, to] to lay into the batched part
   *  stroke — the willow's comb lines. */
  part?: [number, number];
  /** Carries no mass for the shadow projection (hem-shadow ribbons,
   *  facet overlays) — the shadow pass walks every curtain of every
   *  tree every frame, so decorative geometry must opt out. */
  noShadow?: boolean;
  /** Simplified outline for the shadow projection (a sheared-flat
   *  shadow can't show hem teeth — a dense stand shouldn't pay to
   *  project them). Falls back to `pts`. */
  shadowHull?: Array<[number, number]>;
  /** 0 = deep backdrop (paints BEHIND the trunk), 1 = mid fall,
   *  2 = lit fall, 3 = bright withy streak. */
  tone: number;
  /** Anchor height fraction — rides the crown cantilever. */
  hf: number;
  seed: number;
  /** Anchor x — wind-sampling offset (world phase, never screen). */
  x0: number;
  /** Anchor→hem drop, tiles — scales the swing throw. */
  len: number;
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
  branches: TreeBranch[]; // trunk LAST (it paints over the bough joins)
  clusters: TreeCluster[];
  /** The weeping skirt — empty for every species but the willow. */
  curtains: TreeCurtain[];
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
  fall: number; // willow: lowest streamer-tip height, tiles (0 = none)
  fallW: number; // willow: skirt half-width at the belly, tiles
  fallN: number; // willow: mid-layer streamer count
  tiers: number; // pine: plate-tier count (0 = not a pine)
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
      fall: 0, fallW: 0, fallN: 0, tiers: 0, sides: 8,
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
      fall: 0, fallW: 0, fallN: 0, tiers: 0, sides: 7,
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
      fall: 0, fallW: 0, fallN: 0, tiers: 0, sides: 8,
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
      fall: 0, fallW: 0, fallN: 0, tiers: 0, sides: 8,
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
      fall: 0, fallW: 0, fallN: 0, tiers: 0, sides: 9,
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
      fall: 0, fallW: 0, fallN: 0, tiers: 0, sides: 9,
    },
    variants: [
      {}, // broad king
      { h: [4.9, 5.8], trunkW: 0.28, gnarl: 0.14, crownW: 2.0 }, // ancient
      { split: 0.42, crownW: 0.95, gnarl: 0.12 }, // storm-split twin crown
    ],
  },
  // 6 — Weeping willow: trunk → arching limbs → fronds pouring off
  // the arcs, under a broken crown of limb tufts (see the header
  // law). The gnarled bole shows low through the front parting.
  // Pale silvered green against the harder forest tones. crownW is
  // the apex knot's half-width; fallW the cascade belly.
  {
    base: {
      bark: '#6f6448', leaves: ['#41713d', '#5d914f', '#7fac66'],
      h: [4.0, 4.6], trunkW: 0.19, taper: 0.6, bow: 0.14, lean: 0.05,
      gnarl: 0.09, flare: 1.15, split: null,
      boughN: [0, 0], boughStart: 0.55,
      cBot: 0.7, crownW: 0.52, crownR: [0.32, 0.44], crownDx: 0,
      fall: 0.38, fallW: 1.75, fallN: 7, tiers: 0, sides: 9,
    },
    variants: [
      {}, // the classic weeper
      { lean: 0.22, crownDx: 0.3, h: [3.8, 4.4], crownW: 0.48, fallW: 1.6 }, // riverbank lean
      { h: [4.5, 5.1], fall: 0.28, fallW: 1.95, fallN: 8, trunkW: 0.2, crownW: 0.56 }, // the old weeper
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
      fall: 0, fallW: 0, fallN: 0, tiers: 0, sides: 9,
    },
    variants: [
      {}, // dense dome
      { bow: 0.16, gnarl: 0.18 }, // twisted
      { h: [4.7, 5.5], crownW: 1.3 }, // spired
    ],
  },
  // 8 — Northern pine: THE SPIRE (see the header law). Tiered chevron
  // plates on a dead-straight bole, cold blue-greens against the
  // broadleaf palette, red-brown bark. crownW = the bottom tier's
  // half-width; crownR sizes the ridge tufts; cBot = first tier.
  {
    base: {
      bark: '#7a4f33', leaves: ['#24473a', '#33604c', '#4a7f5e'],
      h: [4.4, 5.2], trunkW: 0.16, taper: 0.32, bow: 0.04, lean: 0,
      gnarl: 0.05, flare: 0.95, split: null,
      boughN: [0, 0], boughStart: 0.5,
      cBot: 0.3, crownW: 1.32, crownR: [0.24, 0.34], crownDx: 0,
      fall: 0, fallW: 0, fallN: 0, tiers: 6, sides: 7,
    },
    variants: [
      {}, // the classic spire
      { h: [4.9, 5.7], cBot: 0.42, crownW: 1.05, tiers: 5, trunkW: 0.14 }, // lodgepole — high bare bole
      { h: [4.1, 4.7], cBot: 0.26, crownW: 1.55, tiers: 7, trunkW: 0.19, gnarl: 0.08 }, // old growth — storm-flattened top
    ],
  },
];

export function speciesOf(tile: Tile, h: number): number {
  return tile === Tile.TreeOak ? 5
    : tile === Tile.TreeWillow ? 6
    : tile === Tile.TreeYew ? 7
    : tile === Tile.TreePine ? 8
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
    opts: { lit?: boolean; extra?: boolean } = {},
  ): number => {
    // Crown ceiling + reach: nothing tops out above H or streams past
    // the renderer's ±3-column culling pad (wind sway included).
    const cy = Math.min(y, H - r);
    const cx = Math.sign(x) * Math.min(Math.abs(x), 2.6 - r);
    clusters.push({
      x: cx, y: cy, r, hf: Math.min(1, cy / H),
      seed: hashCoords(59, h & 0xffff, clusters.length),
      tone, lit: opts.lit ?? false, extra: opts.extra ?? false,
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
    // The willow and the pine grow no dome — their crowns are built
    // in their own blocks below.
    bottomIdx = g.fall > 0 || g.tiers > 0 ? [] : dome(crownCx, crownBot, H, g.crownW, 40);

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

  // --- THE WILLOW REBUILT: limbs, tufts, and the cascade they
  // carry (see the header law).
  const curtains: TreeCurtain[] = [];
  if (g.fall > 0) {
    const skirtW = g.fallW;
    const trunkB = branches[branches.length - 1]!;
    const [axc, ayc] = trunkB.pts[trunkB.pts.length - 1]!;

    /** One small foliage tuft riding a limb (or the apex). */
    const tuft = (
      x: number, y: number, scale: number, tone: number,
      opts: { lit?: boolean; extra?: boolean }, ri: number,
    ): number =>
      addCluster(x, y, lerp(g.crownR, rnd(ri)) * scale, tone, opts);

    // The apex knot: three clusters capping the trunk top — the only
    // crown a young willow has grown yet. Kept SMALL: the crown must
    // stay a swept mound over the arcs, never a ball.
    const apexR = g.crownW * 0.5;
    tuft(axc - apexR, ayc + 0.02, 0.95, 2, { lit: true }, 500);
    tuft(axc + apexR, ayc + 0.05, 0.9, 1, {}, 501);
    tuft(axc + (rnd(502) - 0.5) * 0.16, ayc + 0.2, 0.95, 2, { lit: true }, 503);

    /**
     * One streamer: a frond bundle hung from an exact anchor point
     * on a limb. A tiny lip rise, a short outward shoulder (the
     * limb already carried it out), then a near-vertical hang to a
     * chisel-cut point. `tipY` is the LOWEST tip; `sway` scales the
     * pendulum, `dropF` carries the traveling-ripple phase.
     */
    const addStreamer = (
      ax: number, ay: number, dir: number, reach: number,
      tipY: number, w: number,
      tone: number, sway: number, tipN: number, ri: number,
    ): void => {
      const tipDepth = Math.min(0.45, Math.max(0.16, (ay - tipY) * 0.28));
      const seatY = tipY + tipDepth * 0.85;
      const len = Math.max(0.4, ay - seatY);
      const xF = [0, 0.45, 0.8, 0.98, 1.03, 1.0];
      const yF = [0, -0.04, 0.18, 0.45, 0.72, 1];
      const wF = [0.45, 0.7, 0.95, 1, 0.85, 0.62];
      const st: Array<[number, number, number]> = [];
      for (let i = 0; i < 6; i++) {
        const jx = i === 0 ? 0 : (rnd(ri + i) - 0.5) * 0.08;
        st.push([ax + dir * reach * xF[i]! + jx, ay - len * yF[i]!, w * wF[i]!]);
      }
      const pts: Array<[number, number]> = [];
      const drop: number[] = [];
      const dropF: number[] = [];
      const push = (x: number, y: number): void => {
        // Reach + ground clearance: streamers never stream past the
        // culling pad and tips never dig into the grass.
        pts.push([Math.sign(x) * Math.min(Math.abs(x), 2.55), Math.max(0.1, y)]);
        const fr = Math.min(1, Math.max(0, (ay - y) / len));
        drop.push(Math.pow(fr, 1.3) * sway);
        dropF.push(fr);
      };
      for (let i = 0; i < 6; i++) push(st[i]![0] - st[i]![2], st[i]![1]);
      const [hx, , hw] = st[5]!;
      if (tipN <= 1) {
        push(hx, seatY - tipDepth);
      } else {
        for (let k = 0; k < tipN; k++) {
          const dTip = (0.5 + rnd(ri + 20 + k) * 0.5) * tipDepth;
          push(hx - hw + 2 * hw * ((k + 0.5) / tipN), seatY - dTip);
          if (k < tipN - 1) push(hx - hw + 2 * hw * ((k + 1) / tipN), seatY - dTip * 0.25);
        }
      }
      for (let i = 5; i >= 0; i--) push(st[i]![0] + st[i]![2], st[i]![1]);
      curtains.push({
        pts, drop, dropF, tone, hf: Math.min(1, ay / H),
        seed: hashCoords(61, h & 0xffff, curtains.length), x0: ax, len,
        // The comb part-line runs down the visible fronds' left flank.
        part: tone === 1 || tone === 2 ? [1, 5] : undefined,
      });
    };

    /** Hem law: anchors near the center hang longest. */
    const tipOf = (ax: number, j: number): number =>
      g.fall + Math.abs(ax) * 0.3 + rnd(120 + j) * 0.25;

    /**
     * One arching limb: crotch on the trunk, a rise, an outward
     * shoulder, a drooping tip — with a tuft buried over each
     * station and 2-3 streamers hung from those exact points.
     * `depth` 0 = rear pair (dark streamers, painted pre-trunk),
     * 1 = mid front, 2 = the sun-side front limb (lit fronds).
     */
    const addLimb = (
      dir: number, crotchU: number, R: number, depth: number, ri: number,
    ): void => {
      const [x0, y0] = alongSpine(trunkB.pts, crotchU);
      const rise = (0.42 + rnd(ri) * 0.15) * unit;
      const reach = R * (1 + g.lean * dir * 1.1);
      const jx = (i: number): number => (rnd(ri + i) - 0.5) * 0.08;
      // The arc: up off the crotch, over the shoulder, and the tip
      // DROOPS — the tuft line slopes down toward the edges, the
      // swept-mound crown profile.
      const p1: [number, number] = [x0 + dir * reach * 0.35 + jx(1), y0 + rise * 0.85];
      const p2: [number, number] = [x0 + dir * reach * 0.72 + jx(2), y0 + rise];
      const p3: [number, number] = [
        Math.sign(x0 + dir * reach) * Math.min(Math.abs(x0 + dir * reach), 2.3),
        Math.min(y0 + rise * 0.42, H - 0.45),
      ];
      // Tufts first (the limb tip needs its cluster to drag with —
      // anchoring law). Grown late like dome filler: a sapling has
      // no limbs, so it gets no limb tufts either.
      tuft(p1[0], p1[1], 0.95, 1, { extra: true }, ri + 10);
      const litLimb = depth === 2;
      tuft(p2[0], p2[1], 0.95, litLimb ? 2 : 1, { lit: litLimb, extra: true }, ri + 11);
      // A small bridge tuft rides the arc between shoulder and tip —
      // it guarantees the tuft chain never breaks (mass law) and
      // deepens the swept mound.
      tuft(
        (p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2 + 0.05, 0.7,
        litLimb ? 2 : 1, { extra: true }, ri + 13,
      );
      const t3 = tuft(p3[0], p3[1], 0.8, 1, { extra: true }, ri + 12);
      branches.push({
        pts: [[x0, y0], p1, p2, p3],
        w0: g.trunkW * 0.55, w1: g.trunkW * 0.16, flare: 0.15,
        tip: t3, level: 1,
      });
      // The cascade this limb carries: one frond per station. Rear
      // limbs hang dark depth; the front limbs the visible body;
      // the sun-side limb bright fronds. Inner stations hang the
      // loosest and longest (hem law).
      const stations: Array<[number, number]> = [p1, p2, p3];
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const [sx2, sy2] = stations[sIdx]!;
        const tone = depth === 0 ? 0 : depth === 2 ? (sIdx < 2 ? 2 : 1) : 1;
        addStreamer(
          sx2, sy2 - 0.08, dir, 0.1 + sIdx * 0.09,
          tipOf(sx2, ri + sIdx) + (depth === 0 ? 0.22 : 0),
          (depth === 0 ? 0.3 : 0.24) + rnd(ri + 30 + sIdx) * 0.09,
          tone,
          (depth === 0 ? 0.55 : 0.85) + rnd(ri + 40 + sIdx) * 0.25 + sIdx * 0.08,
          depth === 0 ? 2 : 3, ri + 50 + sIdx * 7,
        );
      }
      // The rear pair double-hangs a near strand over its own dark
      // fall — depth INSIDE the cascade, not just behind it.
      if (depth === 0) {
        addStreamer(
          p1[0] + dir * 0.12, p1[1] - 0.12, dir, 0.08,
          tipOf(p1[0], ri + 60), 0.17 + rnd(ri + 61) * 0.05,
          1, 1.0, 2, ri + 62,
        );
      }
      // Every limb tip sheds one bright escaped withy — the loosest
      // thing on the tree, flying just past the belly.
      addStreamer(
        p3[0], p3[1] - 0.05, dir, 0.3 + rnd(ri + 70) * 0.12,
        g.fall + rnd(ri + 71) * 0.2, 0.055,
        3, 1.25, 1, ri + 72,
      );
    };

    // The limb plan: per side one HIGH limb (short reach, rear
    // depth) and one LOW limb (the long front sweep); the old
    // weeper grows a fifth long west sweeper. West front is the
    // sun-side limb (lit fronds ride it).
    addLimb(1, 0.78 + rnd(600) * 0.05, 0.92 + rnd(601) * 0.16, 0, 610); // high east — rear
    addLimb(-1, 0.76 + rnd(602) * 0.05, 0.95 + rnd(603) * 0.16, 0, 640); // high west — rear
    addLimb(1, 0.66 + rnd(604) * 0.05, (skirtW - 0.35) * (0.82 + rnd(605) * 0.1), 1, 670); // low east — front
    addLimb(-1, 0.68 + rnd(606) * 0.05, (skirtW - 0.3) * (0.86 + rnd(607) * 0.1), 2, 700); // low west — sun side
    if (variant === 2) {
      addLimb(-1, 0.68 + rnd(608) * 0.04, (skirtW - 0.2), 1, 730); // the old sweeper
    }

    // The front veil: one frond hung from the trunk top, crossing
    // the bole so it shows only LOW through the parting — never a
    // bare pole running the tree's whole height. It follows the
    // trunk's OWN mid-course (the bole bows).
    const [vx] = alongSpine(trunkB.pts, 0.55);
    addStreamer(
      vx, ayc - 0.1, vx < axc ? -1 : 1, 0.05,
      g.fall + 0.85 + rnd(356) * 0.25, 0.36 + rnd(357) * 0.05,
      1, 0.95, 3, 358,
    );

    // The limbs grew after the trunk was seated — re-seat the trunk
    // LAST so its body still covers every crotch join (seam law).
    branches.splice(branches.indexOf(trunkB), 1);
    branches.push(trunkB);
  }

  // --- THE PINE: tiered plates up the spire (see the header law).
  if (g.tiers > 0) {
    const trunkB = branches[branches.length - 1]!;
    const nT = g.tiers;
    const yBot = H * g.cBot;
    const yTop = H * (variant === 2 ? 0.86 : 0.9);

    /**
     * One chevron plate: a peaked top ridge, downswept tips, and a
     * serrated hem of staggered teeth. The hem also sheds a SHADOW
     * RIBBON — the same zigzag offset down, filled dark in the
     * pine's tone-0 batch — the shingle separation as a fill, never
     * a stroke (strokes were the taiga's frame cost: a dense stand
     * re-bakes many trees per second, and fills raster far cheaper).
     * `tone` is band semantics (1 low, 2 high, 3 west-lit facet).
     */
    const addPlate = (
      cx0: number, y: number, W: number, rise: number, dTip: number,
      tone: number, teeth: number, ri: number,
    ): void => {
      const pts: Array<[number, number]> = [];
      const drop: number[] = [];
      const dropF: number[] = [];
      const push = (x: number, yy: number, d: number): void => {
        pts.push([Math.sign(x) * Math.min(Math.abs(x), 2.55), Math.max(0.1, yy)]);
        drop.push(d);
        dropF.push(d);
      };
      const j = (i: number): number => (rnd(ri + i) - 0.5) * 0.07;
      push(cx0 - W, y - dTip, 0.28);
      push(cx0 - W * 0.52 + j(1), y + rise * 0.55 + j(2) * 0.5, 0.1);
      push(cx0 + j(3) * 0.6, y + rise, 0);
      push(cx0 + W * 0.52 + j(4), y + rise * 0.55 + j(5) * 0.5, 0.1);
      push(cx0 + W, y - dTip, 0.28);
      // The serrated hem, right tip → left tip: notch up, tooth down.
      const hem: Array<[number, number]> = [[cx0 + W, y - dTip]];
      for (let k = teeth - 1; k >= 0; k--) {
        const xn = cx0 - W + 2 * W * ((k + 1) / teeth);
        const xt = cx0 - W + 2 * W * ((k + 0.5) / teeth);
        const yn = y - dTip * (0.35 + rnd(ri + 20 + k) * 0.2);
        const yt = y - dTip * (1.25 + rnd(ri + 30 + k) * 0.65);
        push(xn - W * 0.06, yn, 0.2);
        push(xt, yt, 0.26);
        hem.push([xn - W * 0.06, yn], [xt, yt]);
      }
      push(cx0 - W, y - dTip, 0.28);
      hem.push([cx0 - W, y - dTip]);
      curtains.push({
        pts, drop, dropF, tone, hf: Math.min(1, y / H),
        seed: hashCoords(61, h & 0xffff, curtains.length), x0: cx0, len: 0.5,
        // The ridge + tips are the whole shadow silhouette.
        shadowHull: pts.slice(0, 5).concat([[cx0, y - dTip * 1.6]]),
      });
      // The shadow ribbon (skip the spire cap's, tone 3 never rides).
      if (tone !== 3 && W > 0.4) {
        const rp: Array<[number, number]> = [];
        const rd: number[] = [];
        for (const [x, yy] of hem) { rp.push([x, Math.max(0.1, yy)]); rd.push(0.24); }
        for (let i2 = hem.length - 1; i2 >= 0; i2--) {
          rp.push([hem[i2]![0], Math.max(0.1, hem[i2]![1] - 0.07)]);
          rd.push(0.24);
        }
        curtains.push({
          pts: rp, drop: rd, dropF: rd, tone: 0, hf: Math.min(1, y / H),
          seed: hashCoords(61, h & 0xffff, curtains.length), x0: cx0, len: 0.5,
          noShadow: true,
        });
      }
    };

    /** The west-lit facet riding a plate — the one-sun sculpting. */
    const addFacet = (
      cx0: number, y: number, W: number, rise: number, dTip: number, ri: number,
    ): void => {
      const pts: Array<[number, number]> = [];
      const drop: number[] = [];
      const dropF: number[] = [];
      const push = (x: number, yy: number, d: number): void => {
        pts.push([Math.sign(x) * Math.min(Math.abs(x), 2.55), Math.max(0.1, yy)]);
        drop.push(d);
        dropF.push(d);
      };
      push(cx0 - W, y - dTip, 0.28);
      push(cx0 - W * 0.52 + (rnd(ri) - 0.5) * 0.06, y + rise * 0.55, 0.1);
      push(cx0 - W * 0.06, y + rise * 0.9, 0);
      push(cx0 - W * 0.16, y - dTip * 0.3, 0.12);
      push(cx0 - W * 0.6, y - dTip * (0.9 + rnd(ri + 1) * 0.3), 0.24);
      curtains.push({
        pts, drop, dropF, tone: 3, hf: Math.min(1, y / H),
        seed: hashCoords(61, h & 0xffff, curtains.length), x0: cx0, len: 0.5,
      });
    };

    // The tiers: wider spacing low (daylight and bole between the
    // bottom plates), tightening toward the crown; width tapers to
    // the spire with a slight concave sweep.
    for (let i = 0; i < nT; i++) {
      const v = nT === 1 ? 0 : i / (nT - 1);
      const y = yBot + (yTop - yBot) * Math.pow(v, 0.88);
      const W = g.crownW * Math.pow(1 - v, 1.12) + 0.24;
      const cx0 = crownCx + (rnd(800 + i) - 0.5) * 0.09;
      const rise = 0.3 + W * 0.12 + rnd(810 + i) * 0.06;
      const dTip = Math.min(0.3, 0.15 + W * 0.11);
      const teeth = 3 + Math.round(W * 1.5);
      const tone = v < 0.45 ? 1 : 2;
      addPlate(cx0, y, W, rise, dTip, tone, teeth, 820 + i * 13);
      addFacet(cx0, y, W, rise, dTip, 900 + i * 7);
    }
    // The spire cap: one slim tall plate closing the silhouette to a
    // point — the storm-flattened ancient goes without.
    if (variant !== 2) {
      addPlate(
        crownCx + (rnd(950) - 0.5) * 0.06, yTop - 0.05,
        0.26, H - yTop, 0.12, 2, 2, 955,
      );
    }
    // The crown core: a tight chain of small tufts hugging the spine
    // BELOW the spire base (fixed radii — the mass law needs the
    // chain to never break). They tuck INSIDE the upper plates as
    // soft depth mass between the ridges — the spire plate alone
    // owns the top of the silhouette; a pine ends in a POINT, never
    // a ball. The storm-flattened ancient instead wears a wide low
    // crown pad. A sapling keeps only the top two — a green tip.
    const tuftR = (i: number): number => 0.24 + rnd(970 + i) * 0.04;
    addCluster(crownCx + (rnd(972) - 0.5) * 0.08, yTop - 0.22, tuftR(0), 2, { lit: true });
    addCluster(crownCx - 0.11, yTop - 0.55, tuftR(1), 2, { lit: true });
    addCluster(crownCx + 0.12, yTop - 0.9, tuftR(2), 2, { extra: true });
    addCluster(crownCx - 0.13, yTop - 1.24, tuftR(3), 1, { extra: true });
    addCluster(crownCx + 0.11, yTop - 1.58, tuftR(4), 1, { extra: true });

    // Dead whorl stubs on the bare bole — the northern signature.
    const nStub = 2 + (rnd(990) < 0.5 ? 1 : 0);
    for (let k = 0; k < nStub; k++) {
      const side = k % 2 === 0 ? -1 : 1;
      const u = 0.45 + rnd(991 + k) * 0.35;
      const [sx2, sy2] = alongSpine(trunkB.pts, u);
      branches.push({
        pts: [
          [sx2, sy2],
          [sx2 + side * (0.2 + rnd(994 + k) * 0.14), sy2 - 0.06 - rnd(996 + k) * 0.05],
        ],
        w0: g.trunkW * 0.3, w1: g.trunkW * 0.06, flare: 0, tip: -1, level: 1,
      });
    }
    // Re-seat the trunk LAST (seam law) — the stubs grew after it.
    branches.splice(branches.indexOf(trunkB), 1);
    branches.push(trunkB);
  }

  let top = 0;
  let spread = 0;
  for (const c of clusters) {
    top = Math.max(top, c.y + c.r);
    spread = Math.max(spread, Math.abs(c.x) + c.r);
  }
  for (const cu of curtains) {
    for (const p of cu.pts) spread = Math.max(spread, Math.abs(p[0]) + 0.06);
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
    branches,
    clusters,
    curtains,
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

  // --- Curtain hang (willow): each fall samples the ONE field at its
  // own anchor with a lag; the swing scales with the fall's length
  // and looseness, and the hem lifts slightly as it swings — a
  // pendulum of hanging cloth, never a flapping sheet.
  const nc = m.curtains.length;
  const cSw = nc > 0 && g >= 0.7 ? new Float32Array(nc) : null;
  if (cSw) {
    for (let i = 0; i < nc; i++) {
      const cu = m.curtains[i]!;
      const local = f.windOverride !== undefined
        ? wind
        : windScalarAt(f.wx + cu.x0 * 0.8, f.wy + 0.4, f.tSec - 0.22);
      const ph = f.wx * 1.9 + f.wy * 1.45 + cu.x0 * 2.3;
      const flut = Math.sin(f.tSec * (1.3 + (cu.seed % 5) * 0.11) + ph) * windy * 0.035;
      cSw[i] = Math.max(-0.2, Math.min(0.2, local * 0.055 + flut)) * cu.len;
    }
  }

  /**
   * Batch every curtain of one tone into a single fill (band law).
   * Each vertex swings on the pendulum AND rides a traveling ripple
   * running down the frond (phase along dropF) — cloth waving from
   * the arc, never a rigid flag. Mid and lit fronds also lay their
   * left flank into `partPath`, the batched strand part-lines that
   * keep same-tone fronds reading combed instead of fusing flat.
   */
  const partPath = cSw && f.s > 18 ? new Path2D() : null;
  const fillFalls = (tone: number, color: string): void => {
    if (!cSw) return;
    const path = new Path2D();
    let any = false;
    for (let i = 0; i < nc; i++) {
      const cu = m.curtains[i]!;
      if (cu.tone !== tone) continue;
      any = true;
      const ax = disp(cu.hf);
      const sw = cSw[i]!;
      const lift = Math.abs(sw) * 0.18;
      const ph = f.wx * 1.9 + f.wy * 1.45 + cu.x0 * 2.3;
      const wAmp = windy * Math.min(0.085, 0.028 + cu.len * 0.016);
      const wT = f.tSec * (2.1 + (cu.seed % 4) * 0.15) + ph * 1.7;
      const part = partPath ? cu.part : undefined;
      for (let k = 0; k < cu.pts.length; k++) {
        const p = cu.pts[k]!;
        const d = cu.drop[k]!;
        const fr = cu.dropF[k]!;
        const ripple = Math.sin(wT - fr * 2.8) * wAmp * fr * fr;
        const sx2 = X(p[0] + ax + sw * d + ripple);
        const sy2 = Y(p[1] + lift * d);
        if (k === 0) path.moveTo(sx2, sy2);
        else path.lineTo(sx2, sy2);
        // The declared vertex run feeds the batched part/hem stroke.
        if (part) {
          if (k === part[0]) partPath!.moveTo(sx2, sy2);
          else if (k > part[0] && k <= part[1]) partPath!.lineTo(sx2, sy2);
        }
      }
      path.closePath();
    }
    if (!any) return;
    ctx.fillStyle = color;
    ctx.fill(path);
  };

  // Back streamers paint before any wood: the willow's bole stands
  // INSIDE the cascade, never pasted in front of it. The pine has no
  // pre-trunk foliage — its plates all ride the spire.
  const pine = m.species === 8;
  if (!pine) fillFalls(0, shade(m.leaves[0], -8));

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

  // --- The foliage geometry, per-species semantics (band law):
  // willow = cascade fronds; pine = tier plates. Either way each
  // tone is ONE batched fill and the part/hem lines ONE stroke.
  if (pine) {
    // Lower band, upper band + spire, then the shingle hem shadows
    // (batched FILLS — see the plate law), then the west-lit facets.
    fillFalls(1, m.leaves[0]);
    fillFalls(2, m.leaves[1]);
    fillFalls(0, shade(m.leaves[0], -16));
    fillFalls(3, shade(m.leaves[1], 15));
  } else {
    // The cascade (willow): mid streamers bury the upper trunk, lit
    // streamers ride the sun side, withies last. The crest paints
    // AFTER all of it — it spills over every anchor (seam law, down).
    fillFalls(1, m.leaves[1]);
    fillFalls(2, m.leaves[2]);
    // Strand part-lines: ONE stroke for every mid + lit frond — the
    // combed-curtain read, skipped when the tree is too small for it.
    if (partPath) {
      ctx.strokeStyle = shade(m.leaves[0], -6);
      ctx.lineWidth = Math.max(1, s * 0.026);
      ctx.lineJoin = 'round';
      ctx.stroke(partPath);
    }
    fillFalls(3, shade(m.leaves[2], 18));
  }

  // --- THE CANOPY MASS: every cluster contributes its blob to
  // batched tone paths — one shade layer beneath, three light bands,
  // bright facets on the lit crown. Single-fill-per-tone is what
  // fuses the clusters into one sculpted low-poly volume (and it is
  // 6 fills per tree instead of 30).
  const shadePath = new Path2D();
  const tonePaths = [new Path2D(), new Path2D(), new Path2D()];
  const litPath = new Path2D();
  // Clusters stamp CACHED unit blobs (shapes.ts unitBlob) — the facet
  // trig ran once per (seed, sides) ever; per frame each cluster is
  // three addPath calls with a scale+squash matrix. Pixel-identical.
  const M = BLOB_M;
  M.b = 0;
  M.c = 0;
  let drew = false;
  for (let i = 0; i < n; i++) {
    const c = m.clusters[i]!;
    if (g < 0.7 && c.extra) continue;
    drew = true;
    const cx = X(c.x + rx[i]!);
    const cy = Y(c.y + ry[i]!);
    const cr = c.r * rMul * s * g * rb[i]!;
    const blob = unitBlob(c.seed, m.sides);
    M.a = cr * 0.98;
    M.d = cr * 0.98 * 0.92;
    M.e = cx + cr * 0.11;
    M.f = cy + cr * 0.13;
    shadePath.addPath(blob, M);
    M.a = cr * 0.94;
    M.d = cr * 0.94 * 0.92;
    M.e = cx;
    M.f = cy;
    tonePaths[c.tone]!.addPath(blob, M);
    if (c.lit) {
      M.a = cr * 0.5;
      M.d = cr * 0.5 * 0.9;
      M.e = cx - cr * 0.2;
      M.f = cy - cr * 0.28;
      litPath.addPath(unitBlob(c.seed ^ 0x55, 6), M);
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

  return wind;
}
