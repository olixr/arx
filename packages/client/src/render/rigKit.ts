/**
 * THE MENAGERIE'S SHARED KIT (foundations F7 endgame) — the block-body
 * painter, outline ink, profile read, the hull geometry family, ring
 * path, the colossus bands and mesh ranks, the ooze strike and the
 * mount-spec cache: pure helpers every species stall leans on. A leaf
 * on purpose — species files import HERE, and the last value edges
 * back into rig.ts die.
 */
import type { BeastBlockFrame, BeastSpec } from './rig.js';

export const OUTLINE = '#241a2e';

/**
 * THE TWO PROFILE READS (arms-v3 Phase 1: named, single-sourced).
 * The RIG's facing weight is the honest cosine — `profileK = |fx|` —
 * and every arm/carry/depth law rides that. The FACE painters use this
 * snugger read instead: |fx| boosted 15% and clamped, so the head
 * commits to its profile band a beat before the body does (eyes and
 * muzzles read wrong mid-turn if the face lags the turn). Thirteen
 * mob-head painters each re-derived this inline before it was named —
 * one drifted constant away from thirteen different face laws.
 */
export function faceProfileK(fx: number): number {
  return Math.min(1, Math.abs(fx) * 1.15);
}

export function ringPath(pts: Array<{ x: number; y: number }>): Path2D {
  const p = new Path2D();
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i]!;
    if (i === 0) p.moveTo(q.x, q.y);
    else p.lineTo(q.x, q.y);
  }
  p.closePath();
  return p;
}

/** Hoisted hull helpers — hullPath runs per beast slab per frame, so
 *  its comparator/scratch must not be rebuilt per call (GC churn). */
export const hullCmp = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  a.x - b.x || a.y - b.y;

export function hullCross(
  o: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export const hullSorted: Array<{ x: number; y: number }> = [];

export const hullLower: Array<{ x: number; y: number }> = [];

export const hullUpper: Array<{ x: number; y: number }> = [];

/** Convex hull (monotone chain) — the silhouette of an extruded slab. */
export function hullPath(pts: Array<{ x: number; y: number }>): Path2D {
  const s = hullSorted;
  s.length = 0;
  for (const p of pts) s.push(p);
  s.sort(hullCmp);
  const lower = hullLower;
  lower.length = 0;
  for (const p of s) {
    while (lower.length >= 2 && hullCross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = hullUpper;
  upper.length = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i]!;
    while (upper.length >= 2 && hullCross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  // Ring the two chains directly (skip each chain's duplicated endpoint).
  const path = new Path2D();
  if (lower.length === 0) return path;
  path.moveTo(lower[0]!.x, lower[0]!.y);
  for (let i = 1; i < lower.length - 1; i++) path.lineTo(lower[i]!.x, lower[i]!.y);
  for (let i = 0; i < upper.length - 1; i++) path.lineTo(upper[i]!.x, upper[i]!.y);
  path.closePath();
  return path;
}

export function paintBlockBody(
  ctx: CanvasRenderingContext2D,
  f: BeastBlockFrame,
  foot: Array<[number, number]>,
  topH: (X: number) => number,
  botH: (X: number) => number,
  base: string,
  marks?: (
    gx: (X: number, Y: number) => number,
    gyy: (X: number, Y: number) => number,
    lift: number,
  ) => void,
): void {
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const gx = (X: number, Y: number): number => bx + (fx * X + px * Y) * s;
  const gyy = (X: number, Y: number): number => gy + (fy * X + py * Y) * ys * s;
  const top = foot.map(([X, Y]) => ({
    x: gx(X, Y),
    y: gyy(X, Y) - topH(X) * tk * s - lift + Y * s * f.roll * 0.4,
  }));
  const bot = foot.map(([X, Y]) => ({
    x: gx(X, Y),
    y: gyy(X, Y) - (f.botH ?? botH(X)) * s - lift * 0.6,
  }));
  const hull = hullPath([...top, ...bot]);
  const topFace = ringPath(top);
  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = f.hurt ? '#ffffff' : base;
  ctx.fill(hull);
  if (!f.hurt && marks) marks(gx, gyy, lift);
  if (!f.hurt) {
    // Hard shade step: hull minus back facet = the flanks.
    const flanks = new Path2D();
    flanks.addPath(hull);
    flanks.addPath(topFace);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.20)';
    ctx.fill(flanks, 'evenodd');
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fill(topFace);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke(hull);
}

/**
 * THE SPIKE IS THE PLATE — the carapace is ONE lattice. A shared
 * vertex grid tiles the dome into scute plates, and EVERY plate
 * grows its own horn whose base ring IS the plate's corners (inset
 * a hair so the seam still reads between neighbors). Base-of-spike
 * matches base-of-shell at every band by construction — there is
 * no separate thorn layout left to drift against the mesh at the
 * quarters. The authored hand lives in the PROFILES: a per-column
 * height rank (the crown column is the vertebral saw, the flanks
 * step down toward the rim) and a per-band taper (tallest
 * amidships, dropping to bow and stern), per species.
 */
export const SNAPPER_BANDS: readonly number[] = [-0.9, -0.56, -0.2, 0.16, 0.54, 0.97];

export const SNAPPER_BAND_K: readonly number[] = [0.6, 0.9, 1, 0.85, 0.55];

/** Column edges as fractions of the hull's local half-width. */
export const MESH_COLS: readonly number[] = [-1, -0.6, -0.22, 0.22, 0.6, 1];

/** Per-column height rank and cant class (crown, inner, outer). */
export const MESH_COL_K: readonly number[] = [0.5, 0.78, 1, 0.78, 0.5];

export const MESH_COL_RANK: readonly number[] = [2, 1, 0, 1, 2];

/**
 * The cube's strike clock: gather (0..0.7), then the forward surge
 * (0.7..1) — a wall deciding to include you. (The hopper's jump-slam
 * runs its own three-beat curve inside the painter.)
 */
export function oozeStrike(at: number): { gath: number; spr: number } {
  if (at <= 0) return { gath: 0, spr: 0 };
  if (at < 0.7) return { gath: at / 0.7, spr: 0 };
  const k = Math.min(1, (at - 0.7) / 0.3);
  return { gath: 1 - k, spr: Math.sin(Math.PI * k) };
}

export const MOUNT_SPEC_CACHE = new Map<string, BeastSpec>();
