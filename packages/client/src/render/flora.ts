/**
 * The forage flora — Arx's wild herbs, grown as LANDMARKS.
 *
 * Every wild forage node (berry bush, fibre plant, wild sagewort,
 * wild moonbell) is GROWN from a species grammar + the tile's hash,
 * exactly like the trees: a deterministic model, three bespoke
 * structural variants per species, the same plant on every client
 * with no stored geometry.
 *
 * THE FORAGE LAWS (the ore-formation dialect, spoken in green):
 * - A node is a LANDMARK, not ground clutter. Player-waist to
 *   player-tall masses, bold blocky silhouettes, flat fills, hard
 *   chamfers — never wispy strokes.
 * - The PAYLOAD is the protagonist: what you harvest is the biggest,
 *   brightest thing on the plant — fat gem berries, heavy gold seed
 *   heads, a silver bloom spire, glowing lantern bells. Each carries
 *   an accent color that exists nowhere in the turf palette, and
 *   each TWINKLES at idle (the same beacon law as the mines) so the
 *   eye finds a forageable before the tooltip does.
 * - Grounded, always: dark parting shadow at the base, leaf-litter
 *   chips at the feet, dark silhouette backing behind foliage masses
 *   (fill-based — never stroke a union path).
 * - ONE wind: primary sway samples the shared windScalarAt field as
 *   a cantilever (base planted, crown moving). Every species adds a
 *   SECONDARY beat that lags the primary — berries shiver on their
 *   cluster, seed heads bob with follow-through, sagewort leaves
 *   flash their silver undersides in the gust bands (lift-only, the
 *   grass shimmer law), moonbell lanterns swing as pendulums.
 *
 * Model space: tiles, origin at the plant base, +x screen-right,
 * +y UP. Verticals paint at full tile scale (projection law).
 * Colliders: TILE_COLLIDER_RADIUS entries for these tiles pair with
 * floraBaseRadius() — a test pins physics to the drawn base mass.
 */

import { Tile, hashCoords } from '@arx/shared';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { shade } from './tint.js';
import { windScalarAt } from './grass.js';

export const OUTLINE = 'rgba(26, 20, 36, 0.45)';

// ---- model ------------------------------------------------------------

export interface FloraMass {
  x: number;
  y: number; // centre, model tiles (y up)
  r: number;
  hf: number; // height fraction — cantilever displacement
  seed: number;
  tone: number; // 0 shaded underside, 1 body, 2 lit crown
}

export interface FloraGem {
  x: number;
  y: number;
  r: number;
  rot: number;
  seed: number;
  /** Index of the mass whose rustle this gem rides. */
  mass: number;
}

export interface FloraBlade {
  x0: number;
  w: number;
  len: number;
  lean: number; // tiles of tip drift, pre-wind
  tone: number;
  /** Carries a stacked gold seed head at the tip. */
  head: boolean;
}

export interface FloraPaddle {
  ang: number; // plan angle, 0 = screen-right
  dist: number; // ring distance from the heart, tiles
  len: number;
  w: number;
  tier: number; // 0 outer (dark) .. 2 inner (lit)
}

export interface FloraSpire {
  x: number;
  h: number; // tip height, tiles
  florets: number;
}

export interface FloraBell {
  u: number; // position along the stem curve
  size: number; // lantern half-width, tiles
  phase: number;
}

export interface FloraStem {
  dir: number; // arch direction, -1 | 1
  reach: number; // horizontal reach at the tip, tiles
  rise: number; // tip height, tiles
  bells: FloraBell[];
}

export interface FloraModel {
  species: number; // 0 berry, 1 fibre, 2 sagewort, 3 moonbell
  variant: number;
  /** Ground → highest painted point, tiles. */
  height: number;
  /** Max half-width, tiles — cast shadow + culling. */
  spread: number;
  seed: number;
  masses: FloraMass[];
  gems: FloraGem[];
  blades: FloraBlade[];
  paddles: FloraPaddle[];
  spires: FloraSpire[];
  stems: FloraStem[];
}

export interface FloraFrame {
  bx: number; // screen x of the plant base
  groundY: number; // screen y of the plant base
  s: number; // px per tile
  wx: number; // world position — wind phase, NEVER screen coords
  wy: number;
  tSec: number;
  /** Night 0..1 — moonbell lanterns burn brighter after dark. */
  flame: number;
  windOverride?: number;
}

// ---- palettes ---------------------------------------------------------

/** Berry bush foliage, dark underside → mid → lit crown. */
const BERRY_LEAF = ['#24512c', '#3a7539', '#549447'] as const;
const BERRY_GEM = { deep: '#5c2340', face: '#b04a72', glint: '#ef9ec0' };
/** Fibre blades, shade-banded — deep enough to stand off the turf. */
const FIBRE_GREEN = ['#3f6529', '#57853a', '#74a34e'] as const;
const FIBRE_GOLD = { deep: '#a37b2e', face: '#d9b04c', glint: '#f2dd94' };
/** Sagewort tiers, outer dark → inner lit; silver is the flash. */
const SAGE_LEAF = ['#4f7a52', '#6f9c6c', '#94bd8c'] as const;
const SAGE_SILVER = '#d4e4c8';
const SAGE_FLORET = ['#b9d4ae', '#d8e8cc', '#eef7e6'] as const;
/** Moonbell: cool leaf fan, indigo lanterns, hot moon-white core. */
export const MOON_LEAF = ['#38584e', '#4a7161', '#5e8a74'] as const;
export const MOON_BELL = { deep: '#5b64a8', face: '#8f9ed6', core: '#e8ecff' };

// ---- growth -----------------------------------------------------------

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<number, FloraModel>();

export function speciesOfFlora(tile: Tile): number {
  switch (tile) {
    case Tile.BerryBush: return 0;
    case Tile.FibrePlant: return 1;
    case Tile.WildSagewort: return 2;
    default: return 3;
  }
}

/**
 * The drawn base-mass half-width per tile — TILE_COLLIDER_RADIUS in
 * shared tiles.ts must stay a whisker wider (test-pinned) so bodies
 * brush past exactly the plant they see.
 */
export function floraBaseRadius(tile: Tile): number {
  switch (tile) {
    case Tile.BerryBush: return 0.3; // trunk stub + low foliage skirt
    case Tile.FibrePlant: return 0.2; // basal knot
    case Tile.WildSagewort: return 0.26; // inner rosette (outer leaves yield)
    default: return 0.2; // moonbell base clump
  }
}

export function floraModel(tile: Tile, h: number): FloraModel {
  const key = ((tile & 0xff) << 16) | (h & 0xffff);
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 400) cache.clear();

  const species = speciesOfFlora(tile);
  const variant = (h >>> 5) % 3;
  const rnd = mulberry(h ^ (species * 0x9e37) ^ (variant * 0x51f3));
  const m: FloraModel = {
    species,
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

  if (species === 0) growBerry(m, variant, rnd);
  else if (species === 1) growFibre(m, variant, rnd);
  else if (species === 2) growSagewort(m, variant, rnd);
  else growMoonbell(m, variant, rnd);

  cache.set(key, m);
  return m;
}

/** A row of fused foliage clusters — the bush-scale dome dialect. */
function massRow(
  m: FloraModel,
  y: number,
  halfW: number,
  n: number,
  r: number,
  tone: number,
  H: number,
  rnd: () => number,
): void {
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
}

function growBerry(m: FloraModel, variant: number, rnd: () => number): void {
  const H = variant === 1 ? 1.2 + rnd() * 0.12 : variant === 2 ? 0.82 + rnd() * 0.08 : 1.0 + rnd() * 0.12;
  m.height = H;
  if (variant === 2) {
    // Sprawler: a low, wide thicket.
    massRow(m, H * 0.4, 0.52, 4, 0.27, 0, H, rnd);
    massRow(m, H * 0.62, 0.3, 3, 0.25, 1, H, rnd);
    massRow(m, H * 0.8, 0.1, 1, 0.22, 2, H, rnd);
  } else if (variant === 1) {
    // Tall twin: two stacked lobes, slightly staggered.
    massRow(m, H * 0.34, 0.3, 3, 0.28, 0, H, rnd);
    massRow(m, H * 0.56, 0.26, 2, 0.26, 1, H, rnd);
    m.masses.push({ x: -0.12, y: H * 0.76, r: 0.24, hf: 0.76, seed: (rnd() * 0xffff) | 0, tone: 2 });
    m.masses.push({ x: 0.14, y: H * 0.84, r: 0.21, hf: 0.84, seed: (rnd() * 0xffff) | 0, tone: 2 });
  } else {
    // The classic dome.
    massRow(m, H * 0.38, 0.34, 3, 0.29, 0, H, rnd);
    massRow(m, H * 0.62, 0.2, 2, 0.27, 1, H, rnd);
    massRow(m, H * 0.82, 0, 1, 0.23, 2, H, rnd);
  }
  // Berries: fat gems planted proud of the foliage — always INSIDE
  // the mass silhouette (a gem on the hem reads as fallen fruit).
  const nGem = 6 + ((rnd() * 3) | 0);
  for (let i = 0; i < nGem; i++) {
    const mi = (rnd() * m.masses.length) | 0;
    const c = m.masses[mi]!;
    const a = rnd() * Math.PI * 2;
    const d = (0.15 + rnd() * 0.4) * c.r;
    m.gems.push({
      x: c.x + Math.cos(a) * d,
      y: c.y + Math.sin(a) * d * 0.6 - c.r * 0.12,
      r: 0.085 + rnd() * 0.04,
      rot: (rnd() - 0.5) * 0.6,
      seed: (rnd() * 0xffff) | 0,
      mass: mi,
    });
  }
  m.spread = m.masses.reduce((w, c) => Math.max(w, Math.abs(c.x) + c.r), 0);
}

function growFibre(m: FloraModel, variant: number, rnd: () => number): void {
  const scale = variant === 2 ? 0.85 : 1;
  const bias = variant === 1 ? 0.16 : 0; // wind-parted fan leans one way
  const clumps = variant === 2 ? [-0.2, 0.22] : [0];
  let top = 0;
  for (const cx of clumps) {
    const n = variant === 2 ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const len = (0.72 + rnd() * 0.34) * scale * (1 - Math.abs(u) * 0.3);
      m.blades.push({
        x0: cx + u * 0.14 * scale + (rnd() - 0.5) * 0.03,
        w: 0.1 + rnd() * 0.04,
        len,
        lean: u * 0.22 + bias + (rnd() - 0.5) * 0.08,
        tone: (rnd() * 3) | 0,
        head: false,
      });
      top = Math.max(top, len);
    }
    // Three blades per clump carry the gold — picked tallest-first
    // but SEPARATED, so the towers never merge into one blob.
    const order = m.blades
      .map((b, i) => ({ i, len: b.len, tip: b.x0 + b.lean }))
      .filter((b) => Math.abs(m.blades[b.i]!.x0 - cx) < 0.3)
      .sort((a, b) => b.len - a.len);
    const picked: number[] = [];
    for (const cand of order) {
      if (picked.length >= 3) break;
      if (picked.every((pi) => Math.abs((m.blades[pi]!.x0 + m.blades[pi]!.lean) - cand.tip) > 0.2)) {
        picked.push(cand.i);
      }
    }
    for (const pi of picked) m.blades[pi]!.head = true;
  }
  m.height = top + 0.18;
  m.spread = m.blades.reduce((w, b) => Math.max(w, Math.abs(b.x0 + b.lean) + 0.12), 0.3);
}

function growSagewort(m: FloraModel, variant: number, rnd: () => number): void {
  // Rosette rings, outer → inner. The grand rosette adds a 4th ring.
  const rings: Array<[number, number, number, number, number]> =
    variant === 2
      ? [
          [10, 0.4, 0.4, 0.15, 0],
          [8, 0.26, 0.32, 0.14, 0],
          [6, 0.15, 0.24, 0.12, 1],
          [4, 0.06, 0.16, 0.1, 2],
        ]
      : [
          [8, 0.28, 0.34, 0.14, 0],
          [6, 0.16, 0.26, 0.12, 1],
          [4, 0.06, 0.17, 0.1, 2],
        ];
  for (const [n, dist, len, w, tier] of rings) {
    const off = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      m.paddles.push({
        ang: off + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.2,
        dist,
        len: len * (0.9 + rnd() * 0.2),
        w,
        tier,
      });
    }
  }
  // Bloom spires rising from the heart.
  const spec: Array<[number, number]> =
    variant === 1
      ? [
          [-0.1, 0.92 + rnd() * 0.15],
          [0.04, 1.05 + rnd() * 0.15],
          [0.16, 0.85 + rnd() * 0.12],
        ]
      : variant === 2
        ? [
            [-0.07, 0.55 + rnd() * 0.1],
            [0.09, 0.62 + rnd() * 0.1],
          ]
        : [
            [-0.14, 0.6 + rnd() * 0.1],
            [0.02, 0.98 + rnd() * 0.14],
            [0.15, 0.52 + rnd() * 0.1],
          ];
  for (const [x, hgt] of spec) m.spires.push({ x, h: hgt, florets: 3 + ((rnd() * 2) | 0) });
  m.height = m.spires.reduce((t, sp) => Math.max(t, sp.h + 0.12), 0.5);
  m.spread = m.paddles.reduce((w, p) => Math.max(w, p.dist + p.len), 0.4);
}

function growMoonbell(m: FloraModel, variant: number, rnd: () => number): void {
  // A fan of cool broad leaves at the base — a PLANT's feet, never
  // dark lumps that read as boulders.
  const nLeaf = 6;
  for (let i = 0; i < nLeaf; i++) {
    const u = (i / (nLeaf - 1)) * 2 - 1;
    m.blades.push({
      x0: u * 0.13 + (rnd() - 0.5) * 0.03,
      w: 0.09 + rnd() * 0.03,
      len: (0.32 + rnd() * 0.2) * (1 - Math.abs(u) * 0.25),
      lean: u * 0.3 + (rnd() - 0.5) * 0.06,
      tone: (rnd() * 3) | 0,
      head: false,
    });
  }
  const stem = (dir: number, reach: number, rise: number, bells: Array<[number, number]>): void => {
    m.stems.push({
      dir,
      reach,
      rise,
      bells: bells.map(([u, size]) => ({ u, size, phase: rnd() * Math.PI * 2 })),
    });
  };
  if (variant === 1) {
    // The shepherd's crook: one tall stem strung with three bells.
    stem(rnd() < 0.5 ? -1 : 1, 0.34, 1.25 + rnd() * 0.15, [
      [0.55, 0.14],
      [0.78, 0.17],
      [1, 0.21],
    ]);
    stem(-1, 0.3, 0.6 + rnd() * 0.1, [[1, 0.14]]);
  } else if (variant === 2) {
    // The bell thicket: three short stems fanned apart.
    stem(-1, 0.38, 0.62 + rnd() * 0.1, [[0.7, 0.12], [1, 0.15]]);
    stem(1, 0.42, 0.74 + rnd() * 0.1, [[0.68, 0.13], [1, 0.16]]);
    stem(-1, 0.08, 0.92 + rnd() * 0.1, [[1, 0.17]]);
  } else {
    // Twin arches bowing apart.
    stem(-1, 0.36, 0.95 + rnd() * 0.12, [[0.66, 0.14], [1, 0.19]]);
    stem(1, 0.4, 1.08 + rnd() * 0.12, [[0.62, 0.13], [1, 0.2]]);
  }
  m.height = m.stems.reduce((t, st) => Math.max(t, st.rise + 0.12), 0.6);
  m.spread = m.stems.reduce((w, st) => Math.max(w, st.reach + 0.32), 0.4);
}

// ---- painting ---------------------------------------------------------

/** Staggered twinkle window: brief flash once per period (beacon law). */
export function twinkle(tSec: number, seed: number, period: number): number {
  const phase = (tSec / period + ((seed >>> 3) % 97) / 97) % 1;
  const DUR = 0.14;
  return phase < DUR ? Math.sin((phase / DUR) * Math.PI) : 0;
}

export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, color: string): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.22, y - r * 0.22);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.22, y + r * 0.22);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.22, y + r * 0.22);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.22, y - r * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Crisp parting shadow where the plant meets the turf (ore law). */
export function partingShadow(ctx: CanvasRenderingContext2D, bx: number, gy: number, w: number): void {
  ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
  ctx.fillRect(bx - w / 2, gy - Math.max(1.5, w * 0.05), w, Math.max(1.5, w * 0.05));
}

/** Blocky leaf-litter chips scattered at the feet — grounds the mass. */
export function litter(ctx: CanvasRenderingContext2D, bx: number, gy: number, s: number, seed: number, colors: readonly string[]): void {
  for (let k = 0; k < 4; k++) {
    const cx = bx + ((((seed >> (k * 6)) % 200) - 100) / 100) * s * 0.5;
    const cy = gy + ((((seed >> (k * 4 + 2)) % 20) - 4) / 100) * s;
    const cw = s * (0.04 + ((seed >> (k * 5)) % 5) / 130);
    ctx.fillStyle = colors[k % colors.length]!;
    ctx.beginPath();
    chamferRect(ctx, cx, cy, cw * 1.3, cw * 0.8, cw * 0.2);
    ctx.fill();
  }
}

/**
 * The sagewort floret tower: a snug dark silhouette behind stacked
 * chamfer florets whitening upward. `tipY` is the stalk's top; the
 * tower rises above it. Shared with the FARM-grown sagewort so field
 * and wild kin read as the same herb.
 */
export function floretTower(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  s: number,
  florets: number,
  sway = 0,
): void {
  const towerH = s * (0.1 + florets * 0.068);
  ctx.fillStyle = '#5f7f5c';
  ctx.beginPath();
  chamferRect(ctx, tipX - s * 0.078, tipY - towerH, s * 0.156, towerH + s * 0.02, s * 0.028);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.1, s * 0.016);
  ctx.stroke();
  for (let k = 0; k < florets; k++) {
    const fw = s * (0.145 - k * 0.026);
    const fy = tipY - (k + 1) * s * 0.066;
    const fx = tipX + sway * s * 0.06 * k;
    ctx.fillStyle = k >= 2 ? '#f2f8ec' : SAGE_FLORET[k]!;
    ctx.beginPath();
    chamferRect(ctx, fx - fw / 2, fy, fw, s * 0.062, fw * 0.22);
    ctx.fill();
  }
}

/**
 * One moonbell lantern: layered halo, faceted indigo bell, breathing
 * moon-white core — swing rotates the bell about its hang point.
 * Shared with the FARM-grown moonbell (garden lantern flowers).
 */
export function bellLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  half: number,
  swing: number,
  pulse: number,
  glowK: number,
): void {
  const bw = half * 2;
  ctx.fillStyle = '#aabcff';
  ctx.globalAlpha = (0.07 + 0.07 * pulse) * glowK;
  ctx.beginPath();
  ctx.arc(x, y, bw * (1.5 + 0.2 * pulse), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = (0.16 + 0.14 * pulse) * glowK;
  ctx.beginPath();
  ctx.arc(x, y, bw * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing * 0.6);
  const w2 = half;
  ctx.fillStyle = MOON_BELL.deep;
  ctx.beginPath();
  ctx.moveTo(-w2 * 0.55, -w2 * 0.9);
  ctx.lineTo(w2 * 0.55, -w2 * 0.9);
  ctx.lineTo(w2 * 0.78, w2 * 0.35);
  ctx.lineTo(w2 * 0.3, w2 * 0.66);
  ctx.lineTo(0, w2 * 0.44);
  ctx.lineTo(-w2 * 0.3, w2 * 0.66);
  ctx.lineTo(-w2 * 0.78, w2 * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.1, w2 * 0.09);
  ctx.stroke();
  ctx.fillStyle = MOON_BELL.face;
  ctx.beginPath();
  ctx.moveTo(-w2 * 0.42, -w2 * 0.72);
  ctx.lineTo(w2 * 0.42, -w2 * 0.72);
  ctx.lineTo(w2 * 0.58, w2 * 0.28);
  ctx.lineTo(-w2 * 0.58, w2 * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MOON_BELL.core;
  ctx.globalAlpha = 0.75 + 0.25 * pulse;
  ctx.fillRect(-w2 * 0.32, -w2 * 0.56, w2 * 0.64, w2 * 0.74);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** One chamfered payload gem: deep frame, bright face, hard glint. */
function gemBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  rot: number,
  pal: { deep: string; face: string; glint: string },
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const hh = w * 0.92;
  const cut = w * 0.18;
  ctx.fillStyle = pal.deep;
  ctx.beginPath();
  chamferRect(ctx, -w / 2, -hh / 2, w, hh, cut);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.2, w * 0.09);
  ctx.stroke();
  ctx.fillStyle = pal.face;
  ctx.beginPath();
  chamferRect(ctx, -w * 0.38, -hh * 0.4, w * 0.72, hh * 0.68, cut * 0.7);
  ctx.fill();
  ctx.fillStyle = pal.glint;
  ctx.fillRect(-w * 0.3, -hh * 0.32, w * 0.26, hh * 0.2);
  ctx.restore();
}

/**
 * Paint a forage node. Returns the sampled wind so callers can gate
 * ambient effects on gust strength.
 */
export function paintFlora(ctx: CanvasRenderingContext2D, m: FloraModel, f: FloraFrame): number {
  const wind = f.windOverride !== undefined ? f.windOverride : windScalarAt(f.wx, f.wy, f.tSec);
  if (m.species === 0) paintBerry(ctx, m, f, wind);
  else if (m.species === 1) paintFibre(ctx, m, f, wind);
  else if (m.species === 2) paintSagewort(ctx, m, f, wind);
  else paintMoonbell(ctx, m, f, wind);
  return wind;
}

/** Tone-banded foliage masses with per-cluster rustle (tree dialect). */
export function paintMasses(
  ctx: CanvasRenderingContext2D,
  m: { masses: FloraMass[] },
  f: FloraFrame,
  wind: number,
  leaves: readonly string[],
  bend: number,
): Float32Array {
  const s = f.s;
  const n = m.masses.length;
  const rx = new Float32Array(n);
  const shadePath = new Path2D();
  const tonePaths = [new Path2D(), new Path2D(), new Path2D()];
  const litPath = new Path2D();
  const pctx = (p: Path2D): CanvasRenderingContext2D => p as unknown as CanvasRenderingContext2D;
  for (let i = 0; i < n; i++) {
    const c = m.masses[i]!;
    const local = windScalarAt(f.wx + c.x * 0.8, f.wy - c.y * 0.35, f.tSec - c.hf * 0.25);
    const ph = f.wx * 1.7 + f.wy * 1.3 + c.x * 2.3 + c.y * 1.9;
    const flut = Math.sin(f.tSec * (1.8 + (c.seed % 5) * 0.14) + ph) * 0.012 * (0.4 + Math.abs(wind));
    rx[i] = bend * Math.pow(c.hf, 1.5) + (local - wind) * 0.03 + flut;
    const cx = f.bx + (c.x + rx[i]!) * s;
    const cy = f.groundY - c.y * s;
    const cr = c.r * s;
    facetBlob(pctx(shadePath), cx + cr * 0.1, cy + cr * 0.14, cr * 1.02, c.seed ^ 0x2f, 7, 0.9);
    facetBlob(pctx(tonePaths[c.tone]!), cx, cy, cr * 0.96, c.seed, 7, 0.9);
    if (c.tone === 2) facetBlob(pctx(litPath), cx - cr * 0.22, cy - cr * 0.3, cr * 0.5, c.seed ^ 0x55, 6, 0.9);
  }
  ctx.fillStyle = shade(leaves[0]!, -22);
  ctx.fill(shadePath);
  for (let t = 0; t < 3; t++) {
    ctx.fillStyle = leaves[t]!;
    ctx.fill(tonePaths[t]!);
  }
  ctx.fillStyle = shade(leaves[2]!, 22);
  ctx.fill(litPath);
  return rx;
}

function paintBerry(ctx: CanvasRenderingContext2D, m: FloraModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  const bend = wind * 0.05 * m.height;
  partingShadow(ctx, f.bx, f.groundY, s * 0.5);
  // Woody stub trunk — the bush stands on legs, not on its hem.
  ctx.fillStyle = '#4a3626';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(f.bx + dir * s * 0.04, f.groundY - m.height * 0.42 * s);
    ctx.lineTo(f.bx + dir * s * 0.13, f.groundY - m.height * 0.4 * s);
    ctx.lineTo(f.bx + dir * s * 0.19, f.groundY + s * 0.01);
    ctx.lineTo(f.bx + dir * s * 0.05, f.groundY + s * 0.02);
    ctx.closePath();
    ctx.fill();
  }
  const rx = paintMasses(ctx, m, f, wind, BERRY_LEAF, bend);
  // The payload: fat berry gems riding their cluster's rustle.
  for (const g of m.gems) {
    const gx = f.bx + (g.x + (rx[g.mass] ?? 0)) * s;
    const gy = f.groundY - g.y * s;
    gemBlock(ctx, gx, gy, g.r * 2 * s, g.rot, BERRY_GEM);
  }
  // Beacon: one berry flashes on its window.
  const tw = twinkle(f.tSec, m.seed, 3.2);
  if (tw > 0 && m.gems.length) {
    const g = m.gems[(m.seed >>> 7) % m.gems.length]!;
    sparkle(ctx, f.bx + (g.x + (rx[g.mass] ?? 0)) * s, f.groundY - (g.y + g.r) * s, s * 0.11, tw * 0.9, '#ffd9ec');
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, ['#2f5c32', '#7c2f4e', '#3a7539']);
}

function paintFibre(ctx: CanvasRenderingContext2D, m: FloraModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  partingShadow(ctx, f.bx, f.groundY, s * 0.42);
  // Secondary: seed heads follow the blades with a lag — sampled
  // slightly in the past, so the gold bobs after the green.
  const lag = f.windOverride !== undefined ? wind : windScalarAt(f.wx, f.wy, f.tSec - 0.22);
  for (const b of m.blades) {
    const tipDrift = (b.lean + wind * 0.2 * b.len) * s;
    const bx0 = f.bx + b.x0 * s;
    const tipX = bx0 + tipDrift;
    const tipY = f.groundY - b.len * s;
    const w = b.w * s;
    // Chisel blade: a two-facet slab quad, never a stroke.
    ctx.fillStyle = FIBRE_GREEN[b.tone]!;
    ctx.beginPath();
    ctx.moveTo(bx0 - w * 0.55, f.groundY);
    ctx.lineTo(bx0 - w * 0.22 + tipDrift * 0.45, f.groundY - b.len * s * 0.55);
    ctx.lineTo(tipX - w * 0.1, tipY);
    ctx.lineTo(tipX + w * 0.1, tipY);
    ctx.lineTo(bx0 + w * 0.5 + tipDrift * 0.4, f.groundY - b.len * s * 0.5);
    ctx.lineTo(bx0 + w * 0.55, f.groundY);
    ctx.closePath();
    ctx.fill();
    if (b.head) {
      // The payload: a heavy gold seed head — a stacked kernel tower
      // wide enough to read from across the screen, bobbing with
      // follow-through after the blade.
      const hx = tipX + (lag - wind) * 0.14 * b.len * s;
      const rot = (b.lean + lag * 0.24 * b.len) * 0.5;
      ctx.save();
      ctx.translate(hx, tipY + s * 0.03);
      ctx.rotate(rot);
      const bw = s * 0.19;
      // One dark silhouette behind the stack grounds the whole tower.
      ctx.fillStyle = FIBRE_GOLD.deep;
      ctx.beginPath();
      chamferRect(ctx, -bw * 0.56, -s * 0.3, bw * 1.12, s * 0.32, bw * 0.18);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1.2, s * 0.018);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const w2 = bw * (1 - k * 0.18);
        const y2 = -k * s * 0.072;
        ctx.fillStyle = k >= 2 ? FIBRE_GOLD.glint : FIBRE_GOLD.face;
        ctx.beginPath();
        chamferRect(ctx, -w2 / 2, y2 - s * 0.062, w2 * 0.92, s * 0.06, w2 * 0.2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // Basal knot: the woven wrap that says "fibre lives here".
  ctx.fillStyle = '#6b5230';
  ctx.beginPath();
  chamferRect(ctx, f.bx - s * 0.21, f.groundY - s * 0.17, s * 0.42, s * 0.18, s * 0.045);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.2, s * 0.018);
  ctx.stroke();
  ctx.fillStyle = '#8a6c40';
  ctx.fillRect(f.bx - s * 0.17, f.groundY - s * 0.13, s * 0.34, s * 0.04);
  ctx.fillStyle = '#57422a';
  ctx.fillRect(f.bx - s * 0.17, f.groundY - s * 0.07, s * 0.34, s * 0.028);
  const tw = twinkle(f.tSec, m.seed, 3.4);
  if (tw > 0) {
    const tall = m.blades.reduce((a, b) => (b.len > a.len ? b : a));
    sparkle(
      ctx,
      f.bx + (tall.x0 + tall.lean + wind * 0.2 * tall.len) * s,
      f.groundY - (tall.len + 0.16) * s,
      s * 0.1,
      tw * 0.85,
      '#f7e3a0',
    );
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, ['#8a6c40', '#79a355', '#d9b04c']);
}

function paintSagewort(ctx: CanvasRenderingContext2D, m: FloraModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  partingShadow(ctx, f.bx, f.groundY, s * 0.46);
  // Rosette paddles, plan-projected (dy foreshortened), far side first.
  const sorted = [...m.paddles].sort((a, b) => Math.sin(a.ang) - Math.sin(b.ang));
  for (const p of sorted) {
    const ca = Math.cos(p.ang);
    const sa = Math.sin(p.ang);
    const x0 = f.bx + ca * p.dist * s;
    const y0 = f.groundY - s * 0.1 + sa * p.dist * s * 0.55;
    const x1 = f.bx + ca * (p.dist + p.len) * s;
    const y1 = f.groundY - s * 0.1 + sa * (p.dist + p.len) * s * 0.55 - p.len * s * 0.22;
    // Perpendicular in screen space for the paddle width.
    let px = -(y1 - y0);
    let py = x1 - x0;
    const pl = Math.hypot(px, py) || 1;
    px = (px / pl) * p.w * s;
    py = (py / pl) * p.w * s * 0.7;
    // Silver shimmer: gust bands lift the leaf tone toward the
    // underside silver — lift-only, never darker than the base.
    const lift = Math.max(0, windScalarAt(f.wx + ca * 0.5, f.wy + sa * 0.5, f.tSec) * 0.9);
    const base = SAGE_LEAF[p.tier]!;
    ctx.fillStyle = lift > 0.12 ? shade(base, Math.min(30, lift * 34)) : base;
    ctx.beginPath();
    ctx.moveTo(x0 - px * 0.4, y0 - py * 0.4);
    ctx.lineTo(x0 + (x1 - x0) * 0.45 - px, y0 + (y1 - y0) * 0.45 - py);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x0 + (x1 - x0) * 0.45 + px, y0 + (y1 - y0) * 0.45 + py);
    ctx.lineTo(x0 + px * 0.4, y0 + py * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.stroke();
    // Silver midrib chip — the healer's-herb signature.
    ctx.fillStyle = SAGE_SILVER;
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * 0.25, y0 + (y1 - y0) * 0.25);
    ctx.lineTo(x1 - (x1 - x0) * 0.08, y1 - (y1 - y0) * 0.08);
    ctx.lineTo(x0 + (x1 - x0) * 0.3 + px * 0.24, y0 + (y1 - y0) * 0.3 + py * 0.24);
    ctx.closePath();
    ctx.fill();
  }
  // The pale heart.
  ctx.fillStyle = '#a8c9a0';
  ctx.beginPath();
  facetCircle(ctx, f.bx, f.groundY - s * 0.12, s * 0.09, 6, 0.4, 0.7);
  ctx.fill();
  // Bloom spires: a stout stalk carrying a silver floret TOWER — the
  // payload must read as a landmark crown, never a floating dot.
  for (const sp of m.spires) {
    const sway = wind * 0.16 * sp.h + Math.sin(f.tSec * 1.6 + sp.x * 9 + f.wx) * 0.02;
    const baseX = f.bx + sp.x * s;
    const tipX = baseX + sway * s;
    const towerH = s * (0.1 + sp.florets * 0.068);
    const tipY = f.groundY - sp.h * s + towerH;
    ctx.fillStyle = '#4f7a52';
    ctx.beginPath();
    ctx.moveTo(baseX - s * 0.036, f.groundY - s * 0.1);
    ctx.lineTo(tipX - s * 0.018, tipY);
    ctx.lineTo(tipX + s * 0.018, tipY);
    ctx.lineTo(baseX + s * 0.036, f.groundY - s * 0.1);
    ctx.closePath();
    ctx.fill();
    floretTower(ctx, tipX, tipY, s, sp.florets, sway);
  }
  const tw = twinkle(f.tSec, m.seed, 3.6);
  if (tw > 0 && m.spires.length) {
    const sp = m.spires.reduce((a, b) => (b.h > a.h ? b : a));
    sparkle(ctx, f.bx + (sp.x + wind * 0.16 * sp.h) * s, f.groundY - (sp.h + 0.14) * s, s * 0.1, tw * 0.85, '#eef7e6');
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, ['#4f7a52', '#d4e4c8', '#6f9c6c']);
}

function paintMoonbell(ctx: CanvasRenderingContext2D, m: FloraModel, f: FloraFrame, wind: number): void {
  const s = f.s;
  partingShadow(ctx, f.bx, f.groundY, s * 0.42);
  const bend = wind * 0.07;
  // Basal leaf fan — broad cool chisel blades.
  for (const b of m.blades) {
    const tipDrift = (b.lean + wind * 0.1 * b.len) * s;
    const bx0 = f.bx + b.x0 * s;
    const tipX = bx0 + tipDrift;
    const tipY = f.groundY - b.len * s;
    const w = b.w * s;
    ctx.fillStyle = MOON_LEAF[b.tone]!;
    ctx.beginPath();
    ctx.moveTo(bx0 - w * 0.55, f.groundY);
    ctx.lineTo(bx0 - w * 0.28 + tipDrift * 0.45, f.groundY - b.len * s * 0.55);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx0 + w * 0.5 + tipDrift * 0.4, f.groundY - b.len * s * 0.5);
    ctx.lineTo(bx0 + w * 0.55, f.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, s * 0.013);
    ctx.stroke();
  }
  const lag = f.windOverride !== undefined ? wind : windScalarAt(f.wx, f.wy, f.tSec - 0.3);
  const pulse = 0.5 + 0.5 * Math.sin(f.tSec * 1.15 + f.wx * 0.7 + f.wy * 0.9);
  const glowK = 0.32 + 0.68 * f.flame;
  for (const st of m.stems) {
    // The stem: a thick tapered arc bowing over, cantilever-swayed.
    const drift = bend * st.rise;
    const SEGS = 8;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= SEGS; i++) {
      const u = i / SEGS;
      const arch = st.dir * st.reach * u * u;
      const x = f.bx + (arch + drift * u * u) * s;
      const y = f.groundY - st.rise * Math.sin((u * Math.PI) / 2) * s;
      pts.push([x, y]);
    }
    ctx.strokeStyle = '#46695c';
    ctx.lineCap = 'round';
    for (let i = 0; i < SEGS; i++) {
      ctx.lineWidth = Math.max(1.8, s * (0.085 - i * 0.007));
      ctx.beginPath();
      ctx.moveTo(pts[i]![0], pts[i]![1]);
      ctx.lineTo(pts[i + 1]![0], pts[i + 1]![1]);
      ctx.stroke();
    }
    // Lanterns: pendulums hanging from their stem points, swinging
    // with the LAG of the gust — the secondary beat.
    for (const bell of st.bells) {
      const u = bell.u;
      const seg = Math.min(SEGS - 1, Math.floor(u * SEGS));
      const su = u * SEGS - seg;
      const hx = pts[seg]![0] + (pts[seg + 1]![0] - pts[seg]![0]) * su;
      const hy = pts[seg]![1] + (pts[seg + 1]![1] - pts[seg]![1]) * su;
      const swing = (lag - wind) * 1.4 + Math.sin(f.tSec * 2.05 + bell.phase) * 0.1 + wind * 0.3;
      const bw = bell.size * s * 2;
      const drop = bell.size * s * 1.15;
      const bx2 = hx + Math.sin(swing) * drop;
      const by2 = hy + Math.cos(swing) * drop;
      // Hanger stalk, then the lantern (halo + bell + breathing core).
      ctx.strokeStyle = '#3f5d50';
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(bx2, by2 - drop * 0.35);
      ctx.stroke();
      bellLantern(ctx, bx2, by2, bw / 2, swing, pulse, glowK);
    }
  }
  const tw = twinkle(f.tSec, m.seed, 2.4);
  if (tw > 0 && m.stems.length) {
    const st = m.stems[0]!;
    sparkle(
      ctx,
      f.bx + (st.dir * st.reach + bend * st.rise) * s,
      f.groundY - st.rise * s,
      s * 0.12,
      tw,
      '#ffffff',
    );
  }
  litter(ctx, f.bx, f.groundY, s, m.seed, ['#3e5a5c', '#8f9ed6', '#527268']);
}
