import { Tile , isFishingTile } from '@arx/shared';
import { ClientGame } from '../game/clientGame.js';
import { ELEV_H } from './elevPick.js';
import { waterRegionPath } from './terrain.js';
import type { DrawItem } from './renderer.js';
import { stone01 } from './paintVocab.js';
import type { FallTones } from './renderer.js';
import type { PaintHost } from './paintHost.js';

/** Smooth value noise over one world axis, level-salted — the falls'
 *  anti-repetition lattice (the cliff-face world-keying law). */
function fallNoise(v: number, salt: number, level: number, ks: number): number {
  const t = v / ks;
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return (
    stone01(i, salt, 911 + level * 17) * (1 - u) +
    stone01(i + 1, salt, 911 + level * 17) * u
  );
}


/**
 * WATERFALLS — THE SPILL LAW.
 *
 * A cliff face becomes a waterfall where the world says the water
 * continues over it: FEED water on the high terrace within
 * FALL_LOOKBACK tiles behind the boundary, and PLUNGE water on the low
 * side within FALL_LOOKAHEAD tiles past the foot. Authored channels
 * stop at the lip (water never touches the Cliff rim strip — the
 * auto-fence makes that impossible), and plunge basins resume a tile
 * or two past the foot, so the scan is a short perpendicular walk on
 * BOTH sides, never a direct-adjacency test.
 *
 * The high walk demands elev === level the whole way (a taller wall
 * behind the rim means the water up there belongs to a HIGHER fall;
 * only the top face of a stacked drop owns the curtain). The low walk
 * accepts any elevation BELOW the level and reports where the water
 * actually lands (landElev) — a two-level sheer drop hangs ONE
 * curtain from the top crest to the true landing, through the
 * intermediate faces.
 *
 * Detection is pure world-data (unit-tested here); the curtain /
 * headrace / churn / outwash art lives in renderer.ts beside
 * cliffFaceItem, whose contour segments the curtains inherit — a
 * diagonal rim gets a sheared curtain by construction.
 */

/** Tiles scanned behind the boundary for feed water (k=0 is the Cliff
 *  rim strip itself, so the nearest legal feed sits at k=1). */
export const FALL_LOOKBACK = 4;
/** Tiles scanned past the foot for the plunge water. */
export const FALL_LOOKAHEAD = 4;

export interface SpillInfo {
  /** Tiles from the boundary back to the feed water (1..LOOKBACK-1). */
  race: number;
  /** Tiles from the foot row out to the plunge water (0 = water at the foot). */
  drop: number;
  /** Elevation the water lands at — level-1, or lower for stacked drops. */
  landElev: number;
}

type Sampler = (tx: number, ty: number) => number | undefined;

export function isFallWater(t: number | undefined): boolean {
  return (
    t === Tile.Water || t === Tile.WaterDeep || t === Tile.WaterShallow || isFishingTile(t)
  );
}

/** Walk the high terrace: water counts only while the ground stays at
 *  exactly `level` — cresting another rise means another fall's water. */
function scanHigh(
  ground: Sampler,
  elev: Sampler,
  x: number,
  y: number,
  dx: number,
  dy: number,
  level: number,
): number {
  for (let k = 0; k < FALL_LOOKBACK; k++) {
    const tx = x + dx * k;
    const ty = y + dy * k;
    if ((elev(tx, ty) ?? 0) !== level) return -1;
    const g = ground(tx, ty);
    if (g === undefined) return -1;
    if (isFallWater(g)) return k;
  }
  return -1;
}

/** Walk the low ground: any elevation below `level` may catch the
 *  water; a tile back at (or above) the level is a wall — stop. */
function scanLow(
  ground: Sampler,
  elev: Sampler,
  x: number,
  y: number,
  dx: number,
  dy: number,
  level: number,
): { drop: number; landElev: number } | null {
  for (let k = 0; k < FALL_LOOKAHEAD; k++) {
    const tx = x + dx * k;
    const ty = y + dy * k;
    const e = elev(tx, ty);
    if (e === undefined || e >= level) return null;
    if (isFallWater(ground(tx, ty))) return { drop: k, landElev: e };
  }
  return null;
}

/**
 * Spill test at a point ON a contour boundary. (mx,my) is the sample
 * point (a face-segment half midpoint), (nx,ny) the outward low-side
 * normal. Diagonal boundaries walk the diagonal first, then fall back
 * to each cardinal component — a channel meeting a beveled corner
 * rarely lines up with the exact diagonal ray.
 */
export function spillAt(
  ground: Sampler,
  elev: Sampler,
  mx: number,
  my: number,
  nx: number,
  ny: number,
  level: number,
): SpillInfo | null {
  const sx = Math.round(nx);
  const sy = Math.round(ny);
  const diag = sx !== 0 && sy !== 0;
  // High side: first tile just behind the boundary, stepping inward.
  // A diagonal boundary fronts TWO tile columns/rows at once, so the
  // bevel also tries each cardinal start+walk — the exact diagonal
  // ray easily threads between a channel and its corner.
  const hx = Math.floor(mx - nx * 0.51);
  const hy = Math.floor(my - ny * 0.51);
  let race = scanHigh(ground, elev, hx, hy, -sx, -sy, level);
  if (race < 0 && diag) {
    race = scanHigh(ground, elev, hx, hy, -sx, 0, level);
    if (race < 0) race = scanHigh(ground, elev, hx, hy, 0, -sy, level);
    if (race < 0) race = scanHigh(ground, elev, Math.floor(mx) - sx, Math.floor(my), -sx, 0, level);
    if (race < 0) race = scanHigh(ground, elev, Math.floor(mx), Math.floor(my) - sy, 0, -sy, level);
  }
  if (race < 0) return null;
  // Low side: first tile just past the boundary, stepping outward.
  const lx = Math.floor(mx + nx * 0.51);
  const ly = Math.floor(my + ny * 0.51);
  let low = scanLow(ground, elev, lx, ly, sx, sy, level);
  if (!low && diag) {
    low = scanLow(ground, elev, lx, ly, sx, 0, level);
    if (!low) low = scanLow(ground, elev, lx, ly, 0, sy, level);
    if (!low) low = scanLow(ground, elev, Math.floor(mx) + sx, Math.floor(my), sx, 0, level);
    if (!low) low = scanLow(ground, elev, Math.floor(mx), Math.floor(my) + sy, 0, sy, level);
  }
  if (!low) return null;
  return { race, drop: low.drop, landElev: low.landElev };
}

// --------------------------------------------------------------------
// THE FALLING WATER'S ART (foundations F2 wave B) — the painter half,
// moved verbatim off the Renderer to live beside the spill law it obeys.

export function fallAt(rend: PaintHost, 
  game: ClientGame,
  mx: number,
  my: number,
  nx: number,
  ny: number,
  level: number,
): SpillInfo | null {
  if (game.worldVersion !== rend.fallMemoVersion) {
    rend.fallMemo.clear();
    rend.fallMemoVersion = game.worldVersion;
  }
  const qn = (v: number) => (v > 0.01 ? 1 : v < -0.01 ? -1 : 0);
  const key = `${mx},${my},${qn(nx)},${qn(ny)},${level}`;
  let v = rend.fallMemo.get(key);
  if (v === undefined) {
    v = spillAt(
      (tx, ty) => game.world.groundAt(tx, ty),
      (tx, ty) => game.world.elevAt(tx, ty),
      mx,
      my,
      nx,
      ny,
      level,
    );
    rend.fallMemo.set(key, v);
  }
  return v;
}

export function fallClip(rend: PaintHost, game: ClientGame, key: string, build: () => Path2D | null): Path2D | null {
  if (game.worldVersion !== rend.fallClipVersion) {
    rend.fallClipMemo.clear();
    rend.fallClipVersion = game.worldVersion;
  }
  let p = rend.fallClipMemo.get(key);
  if (p === undefined) {
    p = build();
    rend.fallClipMemo.set(key, p);
  }
  return p;
}

/** Clip the ctx to a world-coordinate region path lifted by `lift`
 *  screen px — the reflection-composite idiom: transform, clip,
 *  restore the transform but keep the clip. Callers wrap in
 *  save()/restore(). */
export function clipFallRegion(rend: PaintHost, path: Path2D, lift: number): void {
  const ctx = rend.ctx;
  const prior = ctx.getTransform();
  const o = rend.camera.worldToScreen(0, 0, rend.w, rend.h);
  ctx.transform(
    rend.camera.scale,
    0,
    0,
    rend.camera.scale * rend.camera.yScale,
    o.x,
    o.y - lift,
  );
  ctx.clip(path);
  ctx.setTransform(prior);
}

/** The contiguous spill run through a boundary column — the mouth
 *  region must span the WHOLE run (per-segment virtual sets would
 *  seam mid-channel). Walks quarter-point spill tests both ways. */
export function fallRunColsX(rend: PaintHost, 
  game: ClientGame,
  col: number,
  my: number,
  nx: number,
  ny: number,
  level: number,
): [number, number] {
  let a = col;
  let b = col;
  for (let k = 1; k <= 32; k++) {
    if (!fallAt(rend, game, a - 1 + 0.25, my, nx, ny, level)) break;
    a--;
  }
  for (let k = 1; k <= 32; k++) {
    if (!fallAt(rend, game, b + 1 + 0.25, my, nx, ny, level)) break;
    b++;
  }
  return [a, b];
}

/**
 * THE MOUTH REGION — the feed channel's drawn water region EXTENDED
 * through the dry rim strip to the crest by a VIRTUAL sampler: the
 * spill columns' rim tiles count as water, so marching squares
 * grows organic banks that CONTINUE the channel's own drawn banks
 * exactly (the shared tile edges hash to the same crossings). The
 * headrace tongue clipped to this region meets the authored water
 * edge seamlessly — the alignment the straight tile-edge tongue
 * never had. `axis` is the run's direction; (runA..runB) the tile
 * range along it; `rim` the first dry tile row/col on the high
 * side; `step` walks from the rim toward the feed water.
 */
export function mouthClipFor(rend: PaintHost, 
  game: ClientGame,
  level: number,
  axis: 'x' | 'y',
  runA: number,
  runB: number,
  rim: number,
  step: number,
): Path2D | null {
  const key = `m:${axis}:${runA}:${runB}:${rim}:${step}:${level}`;
  return fallClip(rend, game, key, () => {
    const ground = (tx: number, ty: number): number | undefined =>
      game.world.elevAt(tx, ty) === level ? game.world.groundAt(tx, ty) : undefined;
    // The virtual cells: for each run column, the dry tiles between
    // the rim and its feed water (the scanHigh walk), plus a guard
    // cell one past the crest so no south boundary is drawn there
    // (the sheet's straight crest line owns that edge).
    const virtual = new Set<string>();
    for (let c = runA; c <= runB; c++) {
      let found = -1;
      for (let k = 0; k < FALL_LOOKBACK; k++) {
        const tx = axis === 'x' ? c : rim + step * k;
        const ty = axis === 'x' ? rim + step * k : c;
        const g = ground(tx, ty);
        if (g === undefined) break;
        if (isFallWater(g)) {
          found = k;
          break;
        }
      }
      if (found <= 0) continue;
      for (let k = 0; k < found; k++) {
        virtual.add(
          axis === 'x' ? `${c},${rim + step * k}` : `${rim + step * k},${c}`,
        );
      }
      virtual.add(axis === 'x' ? `${c},${rim - step}` : `${rim - step},${c}`);
    }
    if (virtual.size === 0) return null;
    const sampler = (tx: number, ty: number): number | undefined =>
      virtual.has(`${tx},${ty}`) ? Tile.Water : ground(tx, ty);
    const lo = Math.min(rim - step, rim + step * FALL_LOOKBACK) - 2;
    const hi = Math.max(rim - step, rim + step * FALL_LOOKBACK) + 2;
    const bounds =
      axis === 'x'
        ? { minTx: runA - 2, maxTx: runB + 2, minTy: lo, maxTy: hi }
        : { minTx: lo, maxTx: hi, minTy: runA - 2, maxTy: runB + 2 };
    return waterRegionPath(sampler, bounds);
  });
}

/** THE LANDING REGION — the real drawn water at the landing
 *  elevation around a fall's foot. Pool dressing (outwash entering
 *  the pool, rings, rafts, the strong mist veil) clips to it so
 *  nothing paints onto drawn grass past the meandering shoreline. */
export function landClipFor(rend: PaintHost, 
  game: ClientGame,
  landElev: number,
  cx0: number,
  cx1: number,
  cy0: number,
  cy1: number,
): Path2D | null {
  const key = `l:${cx0}:${cx1}:${cy0}:${cy1}:${landElev}`;
  return fallClip(rend, game, key, () => {
    const ground = (tx: number, ty: number): number | undefined =>
      game.world.elevAt(tx, ty) === landElev ? game.world.groundAt(tx, ty) : undefined;
    return waterRegionPath(ground, { minTx: cx0, maxTx: cx1, minTy: cy0, maxTy: cy1 });
  });
}

export function fallTones(rend: PaintHost, ): FallTones {
  // Band tones step off the world water palette (#3a629e deep /
  // #4979b8 open / #649cc0 shallow) so the curtain IS the channel's
  // water folded over the edge, not a new material.
  return rend.sky.moonlit
    ? {
        foam: '#d4e0f2',
        crest: '#ccd8ef',
        churnBack: 'rgba(140,160,196,',
        wash: 'rgba(204,216,238,',
        dim: 0.62,
        band: ['#26436e', '#2e4f7e', '#3a5c8c', '#2a4a78'],
        bandLow: ['#3d5a88', '#4a6a99', '#587699', '#456394'],
        race: '#2e4f7e',
        raceDeep: '#24406a',
        shelf: '#385a8a',
        rollLit: '#4d6489',
        rollInk: 'rgba(10,22,48,0.55)',
        splashPale: '#7388aa',
        splashMid: '#587699',
        churnDeep: '#5e7396',
      }
    : {
        foam: '#f2f8fd',
        crest: '#eaf4fb',
        churnBack: 'rgba(186,214,240,',
        wash: 'rgba(236,245,252,',
        dim: 1,
        band: ['#3a629e', '#4979b8', '#5b8bc4', '#4370ae'],
        bandLow: ['#5b8bc4', '#6ba0ce', '#79aad4', '#6094c8'],
        race: '#4979b8',
        raceDeep: '#3a629e',
        shelf: '#5183bd',
        rollLit: '#7fb0d6',
        rollInk: 'rgba(16,34,68,0.5)',
        splashPale: '#c6dcef',
        splashMid: '#79aad4',
        churnDeep: '#a9c6e2',
      };
}

/** THE BREAKWATER — where the sheet knifes into the pool. Not a
 *  band and never a slab: a rank of low-poly FOAM MOUNDS in the
 *  world's own two-tone blob language (wash base under a lit foam
 *  cap, chunky 7-vertex polygons like every canopy and pool blob
 *  in the game), overlapping along a WORLD-KEYED grid so segment
 *  seams vanish, and tapering to nothing at true run ends
 *  (capL/capR) — the foam ends because the mounds shrink away,
 *  never because a fill stops. Behind the rank, the dark LAP line
 *  grounds the impact; in front, crescent backwash slides off into
 *  the pool and the dissolving tail carries the last flecks out.
 *  (ox,oy) = low-side push; `push` = screen-px drop to meet the
 *  dipped sheet base. */
export function drawFallChurn(rend: PaintHost, 
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ox: number,
  oy: number,
  landLift: number,
  level: number,
  t: number,
  tones: FallTones,
  push = 0,
  capL = true,
  capR = true,
): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
  const n01 = (a: number, sa: number) => stone01(a, sa, 911 + level * 17);
  const at = (f: number, off: number): { x: number; y: number } => {
    const wx = x0 + (x1 - x0) * f + ox * off;
    const wy = y0 + (y1 - y0) * f + oy * off;
    const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
    // B-3 spanning warp: this splash rides the landing plane — its lift
    // foreshortens by the impact point's own depthScale (q=0 → ×1.0).
    p.y = p.y - landLift * rend.camera.depthScale(wy) + push;
    return p;
  };
  // End envelope: sizes shrink to zero over the last ~0.7 tiles of
  // a TRUE run end. Interior segment seams keep env=1 and their
  // world-keyed mounds overlap the seam — no joint survives.
  const env = (f: number): number => {
    let e = 1;
    if (capL) e = Math.min(e, 0.15 + (f * len) / 0.7);
    if (capR) e = Math.min(e, 0.15 + ((1 - f) * len) / 0.7);
    return Math.max(0, Math.min(1, e));
  };
  // The world-keyed mound grid rides the dominant axis, so abutting
  // segments of one run agree on every mound's centre.
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  const a0 = horiz ? Math.min(x0, x1) : Math.min(y0, y1);
  const a1 = horiz ? Math.max(x0, x1) : Math.max(y0, y1);
  const fOfAxis = (w: number): number =>
    horiz ? (w - x0) / (x1 - x0 || 1e-6) : (w - y0) / (y1 - y0 || 1e-6);
  // A puffy foam blob — bumpy radii smoothed through vertex
  // midpoints (the canopy/cloud idiom). Straight polygon edges
  // here read as ICE FLOES, not foam — the curves are load-bearing.
  // `wob` boils the silhouette gently over time.
  const blob = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    seed: number,
    wob = 0,
  ): void => {
    const B = 7;
    const px: number[] = [];
    const py: number[] = [];
    for (let i = 0; i < B; i++) {
      const a = (i / B) * Math.PI * 2;
      const rr =
        1 +
        (n01(seed * 7 + i, 95) - 0.5) * 0.42 +
        wob * 0.09 * Math.sin(t * 2.1 + seed + i * 2.4);
      px.push(cx + Math.cos(a) * rx * rr);
      py.push(cy + Math.sin(a) * ry * rr);
    }
    ctx.beginPath();
    ctx.moveTo((px[B - 1]! + px[0]!) / 2, (py[B - 1]! + py[0]!) / 2);
    for (let i = 0; i < B; i++) {
      const j = (i + 1) % B;
      ctx.quadraticCurveTo(px[i]!, py[i]!, (px[i]! + px[j]!) / 2, (py[i]! + py[j]!) / 2);
    }
    ctx.closePath();
    ctx.fill();
  };
  // --- THE SPREAD ZONES: charged water radiating from the impact
  // in OPAQUE stepped tones — the shoreline grammar pointed at a
  // splash. Two zones (shallow spread under a paler charged core),
  // each a closed path whose outer boundary is world-keyed wavy
  // noise and whose reach pinches with env() at true run ends. No
  // translucency: a translucent apron prints its own silhouette
  // over the pool; a tone STEP sits in the water like a shoal.
  const zone = (offBase: number, offAmp: number, salt: number, tone: string, back: number): void => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    const SK = Math.max(4, Math.ceil(len / 0.15));
    for (let k = 0; k <= SK; k++) {
      const p = at(k / SK, -back * env(k / SK));
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    for (let k = SK; k >= 0; k--) {
      const f = k / SK;
      const wxm = x0 + (x1 - x0) * f;
      const wym = y0 + (y1 - y0) * f;
      const swell = fallNoise(wxm + wym * 3, salt, level, 0.9);
      const off =
        (offBase + offAmp * swell + 0.03 * Math.sin(t * 1.1 + f * len * 2.1)) * env(f);
      const p = at(f, off);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  };
  zone(0.42, 0.3, 171, tones.splashMid, 0.02);
  zone(0.2, 0.22, 172, tones.splashPale, 0.05);
  // Detached spreading blobs past the zone edge — the splash tone
  // interpenetrating the pool. The zone never ENDS on its contour;
  // it breaks apart into the water.
  for (let w = Math.floor(a0 / 0.42) * 0.42; w < a1 + 0.42; w += 0.42) {
    const f = fOfAxis(w);
    if (f < 0.02 || f > 0.98) continue;
    const e = env(f);
    if (e < 0.25) continue;
    const seed = Math.round(w / 0.42) * 7 + 29;
    if (n01(seed, 173) < 0.35) continue;
    const wxm = x0 + (x1 - x0) * f;
    const wym = y0 + (y1 - y0) * f;
    const swell = fallNoise(wxm + wym * 3, 171, level, 0.9);
    const off = (0.42 + 0.3 * swell + 0.1 + 0.24 * n01(seed, 174)) * e;
    const p = at(f, off);
    const rr = s * (0.045 + 0.05 * n01(seed, 175)) * e;
    ctx.fillStyle = n01(seed, 176) < 0.35 ? tones.splashPale : tones.splashMid;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rr * 1.6, rr * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // --- THE LAP: the dark waterline where the sheet knifes in —
  // the shoreline's own grounding stroke, read in the gaps between
  // mounds. Without it, foam floats on foam.
  ctx.strokeStyle = '#1a3060';
  ctx.globalAlpha = 0.32 * tones.dim;
  ctx.lineWidth = Math.max(1.2, s * 0.035);
  ctx.beginPath();
  {
    const LK = Math.max(4, Math.ceil(len / 0.2));
    for (let k = 0; k <= LK; k++) {
      const f = k / LK;
      const p = at(f, -0.04);
      const y = p.y + Math.sin(t * 1.3 + k * 1.1) * s * 0.008;
      if (k === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // --- THE BACK RANK: shaded billows behind the foam — depth,
  // OPAQUE in the churn's own shaded tone (an alpha billow shows
  // the pool through itself and reads as overlay).
  const P0 = 0.46;
  ctx.fillStyle = tones.churnDeep;
  for (let w = Math.floor(a0 / P0) * P0; w < a1 + P0; w += P0) {
    const wj = w + (n01(Math.round(w / P0), 90) - 0.5) * 0.2;
    const f = fOfAxis(wj);
    if (f < -0.05 || f > 1.05) continue;
    const e = env(Math.max(0, Math.min(1, f)));
    if (e < 0.12) continue;
    const seed = Math.round(wj / P0) * 3 + 11;
    const bob = Math.sin(t * (1.5 + 0.5 * n01(seed, 91)) + seed * 1.7);
    const r = s * (0.15 + 0.09 * n01(seed, 92)) * e * (1 + 0.06 * bob);
    const p = at(f, -0.08);
    blob(p.x, p.y - s * 0.03 + bob * s * 0.012, r * 1.35, r * 0.55, seed);
  }
  // --- THE MAIN RANK: the foam mounds themselves. Two-tone: a wash
  // base under a lit foam cap, both chunky polygons, each breathing
  // on its own slow phase. Overlap makes the rank read continuous;
  // the noise makes no two mounds match.
  const P1 = 0.3;
  for (let w = Math.floor(a0 / P1) * P1; w < a1 + P1; w += P1) {
    const wj = w + (n01(Math.round(w / P1), 93) - 0.5) * 0.16;
    const f = fOfAxis(wj);
    if (f < -0.04 || f > 1.04) continue;
    const e = env(Math.max(0, Math.min(1, f)));
    if (e < 0.1) continue;
    const seed = Math.round(wj / P1) * 5 + 3;
    const pulse = Math.sin(t * (1.8 + 0.7 * n01(seed, 94)) + seed * 2.1);
    const r = s * (0.13 + 0.1 * n01(seed, 96)) * e * (1 + 0.09 * pulse);
    // Staggered off the base line — mounds sit at world-keyed
    // depths so the rank reads as a BANK of foam, not a string of
    // beads on one line.
    const p = at(f, 0.02 + 0.18 * n01(seed, 97));
    const cy = p.y + pulse * s * 0.015;
    // Two-tone and OPAQUE: pale charged base under the lit foam
    // cap — the pulse lives in the SIZE, never the alpha (a foam
    // mound the pool shows through is an overlay, not water).
    ctx.fillStyle = tones.splashPale;
    blob(p.x, cy, r * 1.35, r * 0.62, seed, 1);
    ctx.fillStyle = tones.foam;
    blob(
      p.x - r * 0.14,
      cy - r * 0.32,
      r * (0.74 + 0.08 * pulse),
      r * (0.38 + 0.04 * pulse),
      seed * 3 + 1,
      1,
    );
  }
  // --- THE CRESCENT BACKWASH: flat arcs sliding off the rank into
  // the pool — the shoreline's backwash grammar, pointed away from
  // the impact. Each dies as it travels.
  ctx.lineCap = 'round';
  const P2 = 0.55;
  for (let w = Math.floor(a0 / P2) * P2; w < a1 + P2; w += P2) {
    const wj = w + (n01(Math.round(w / P2), 98) - 0.5) * 0.24;
    const f = fOfAxis(wj);
    if (f < 0 || f > 1) continue;
    const e = env(f);
    if (e < 0.2) continue;
    const seed = Math.round(wj / P2) * 9 + 5;
    for (let k = 0; k < 2; k++) {
      const ph = (t * (0.3 + 0.12 * n01(seed, 99 + k)) + n01(seed, 100 + k)) % 1;
      const p = at(f, 0.1 + ph * 0.5);
      const rx = s * (0.1 + 0.16 * ph) * e;
      const aa0 = Math.PI * (0.15 + 0.5 * n01(seed, 101 + k));
      const span = Math.PI * (0.5 + 0.5 * n01(seed, 102 + k));
      ctx.strokeStyle = tones.foam;
      ctx.globalAlpha = (1 - ph) * (1 - ph) * 0.22 * tones.dim;
      ctx.lineWidth = Math.max(1.2, s * 0.028);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, rx * 0.5, 0, aa0, aa0 + span);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 1;
  // --- LEAPING CAPS: bright flecks tossed off mound tops at the
  // moment each surge peaks.
  ctx.fillStyle = tones.foam;
  for (let w = Math.floor(a0 / 0.26) * 0.26; w < a1 + 0.26; w += 0.26) {
    const f = fOfAxis(w);
    if (f < 0 || f > 1) continue;
    const e = env(f);
    const seed = Math.round(w / 0.26) * 2 + 91;
    if (n01(seed, 78) < 0.52) continue;
    const pulse = Math.sin(t * (2.8 + n01(seed, 79)) + seed * 2.4);
    if (pulse < 0.25) continue;
    const p = at(f, 0);
    const rr = s * (0.022 + 0.032 * n01(seed, 77)) * pulse * e;
    ctx.globalAlpha = 0.65 * pulse * tones.dim;
    ctx.beginPath();
    ctx.ellipse(
      p.x + (n01(seed, 80) - 0.5) * s * 0.1,
      p.y - s * (0.1 + 0.07 * pulse) * e,
      Math.max(1, rr),
      Math.max(1, rr * 0.7),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // --- THE DISSOLVING TAIL: the last flecks drifting off into
  // open water, density and alpha falling with reach — the foam
  // trails away; it never stops on an edge.
  ctx.fillStyle = tones.foam;
  for (const reach of [0.34, 0.52, 0.72] as const) {
    const gate = 0.35 + reach * 0.55;
    for (let u = 0.05; u < len; u += 0.17) {
      const f = u / len;
      const wx = x0 + (x1 - x0) * f;
      const wy = y0 + (y1 - y0) * f;
      const idx = Math.round(((wx + wy * 3) / 0.17) * 2) + Math.round(reach * 100);
      if (n01(idx, 81) < gate) continue;
      const drift = (t * 0.22 * (0.7 + 0.6 * n01(idx, 82)) + n01(idx, 83)) % 1;
      const p = at(f, (reach + drift * 0.22) * Math.max(0.35, env(f)));
      const rr = s * (0.02 + 0.03 * n01(idx, 84));
      ctx.globalAlpha = (1 - reach) * 0.3 * (1 - drift * 0.7) * tones.dim * env(f);
      ctx.beginPath();
      ctx.ellipse(
        p.x + (n01(idx, 85) - 0.5) * s * 0.14,
        p.y,
        Math.max(1, rr * 1.7),
        Math.max(1, rr * 0.6),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Airborne life at a fall's landing: drifting mist motes and darting
 *  spray, dt-gated per visible fall (the portal-emitter idiom).
 *  Enhancement layer — rides the Water motion setting. */
export function emitFallHaze(rend: PaintHost, 
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wet?: (wx: number, wy: number) => boolean,
): void {
  if (!rend.waterFxFull) return;
  const dt = rend.frameDt;
  const span = Math.max(0.4, Math.hypot(x1 - x0, y1 - y0));
  if (Math.random() < dt * 2.2 * span) {
    const f = Math.random();
    const wx = x0 + (x1 - x0) * f;
    const wy = y0 + (y1 - y0) * f + 0.1 + Math.random() * 0.4;
    if (!wet || wet(wx, wy)) {
      // Motes, never squares OR rect-lobed puffs — any cornered
      // silhouette at mist scale reads as a pasted chip
      // (live-caught, twice).
      rend.particles.burst(wx, wy, 1, ['#dcebf7', '#cfe3f4'], {
        speed: 0.3,
        life: 1.3,
        size: 0.055,
        up: true,
        gravity: -0.25,
        drag: 1.1,
        grow: 0.09,
        shape: 'mote',
      });
    }
  }
  if (Math.random() < dt * 3.2 * span) {
    const f = Math.random();
    const wx = x0 + (x1 - x0) * f;
    const wy = y0 + (y1 - y0) * f + 0.08;
    if (!wet || wet(wx, wy)) {
      rend.particles.burst(wx, wy, 2, ['#f4fafe', '#bfe0f2'], {
        speed: 1.5,
        life: 0.35,
        size: 0.042,
        up: true,
        gravity: 5.5,
        drag: 1.6,
        shape: 'mote',
      });
    }
  }
}

/**
 * Spill tests for one downhill face segment, emitting the curtain
 * and its low-ground dressing. Halves are tested independently (the
 * same quarter-offset law as ramp ownership) so the curtain starts
 * and stops on the channel's tile edges, not the dual cell's.
 */
export function pushSouthFallItems(rend: PaintHost, 
  game: ClientGame,
  items: DrawItem[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  level: number,
): void {
  if (ax > bx || (ax === bx && ay > by)) {
    [ax, bx] = [bx, ax];
    [ay, by] = [by, ay];
  }
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const iA = fallAt(rend, game, (ax + mx) / 2, (ay + my) / 2, nx, ny, level);
  const iB = fallAt(rend, game, (mx + bx) / 2, (my + by) / 2, nx, ny, level);
  if (!iA && !iB) return;
  const x0 = iA ? ax : mx;
  const y0 = iA ? ay : my;
  const x1 = iB ? bx : mx;
  const y1 = iB ? by : my;
  const info: SpillInfo =
    iA && iB
      ? {
          race: Math.min(iA.race, iB.race),
          drop: Math.min(iA.drop, iB.drop),
          landElev: Math.min(iA.landElev, iB.landElev),
        }
      : (iA ?? iB)!;
  // Free ends taper the sheet; a continuing neighbour keeps it sealed.
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const edgeL = !fallAt(rend, game, x0 - ux * 0.25, y0 - uy * 0.25, nx, ny, level);
  const edgeR = !fallAt(rend, game, x1 + ux * 0.25, y1 + uy * 0.25, nx, ny, level);
  const diagonal = Math.abs(nx) > 0.01;
  // The run-wide organic clips: the mouth region fuses the tongue
  // to the channel's drawn banks, the landing region confines pool
  // dressing to the drawn water (both cached, straight faces only).
  let mouth: Path2D | null = null;
  let land: Path2D | null = null;
  let apron: Path2D | null = null;
  let runX0 = x0;
  let runX1 = x1;
  if (!diagonal) {
    const [runA, runB] = fallRunColsX(rend, game, Math.floor(mx), ay, nx, ny, level);
    runX0 = runA;
    runX1 = runB + 1;
    mouth = mouthClipFor(rend, game, level, 'x', runA, runB, ay - 1, -1);
    // The outwash corridor: the same virtual-region law pointed the
    // other way — dry apron tiles under the run count as water at
    // the landing elevation, so the rapid's banks grow organically
    // and FUSE into the pool's drawn shoreline.
    apron = mouthClipFor(rend, game, info.landElev, 'x', runA, runB, ay, 1);
    land = landClipFor(rend, 
      game,
      info.landElev,
      runA - 3,
      runB + 4,
      ay - 1,
      ay + FALL_LOOKAHEAD + 3,
    );
  }
  items.push(
    waterfallItem(rend, 
      game,
      x0,
      y0,
      x1,
      y1,
      nx,
      ny,
      level,
      info,
      edgeL,
      edgeR,
      diagonal,
      mouth,
    ),
  );
  if (!diagonal) {
    for (let r = 0; r <= info.drop; r++) {
      items.push(
        fallOutwashRowItem(rend, game, x0, x1, ay, r, info, level, land, apron, runX0, runX1),
      );
    }
  }
}

/**
 * THE WATERFALL CURTAIN — water continuing over a cliff face,
 * painted in THE POUR dialect: the world's flat-vector water
 * language folded over an edge. Everything is OPAQUE stepped tone —
 * never a translucent gradient (a see-through curtain reads as
 * wallpaper on the wall, the shipped proof-of-concept failure).
 * Top to bottom: the HEADRACE (the channel's own open-water tone
 * carried solid to the lip, mid-current lanes stretching as the
 * water gathers speed, a pale acceleration shelf where it thins
 * over the arris), the CREST ROLL (the foreshortened curl — the
 * top-plane law applied to water: a lit convex band riding the
 * arris, tearing off in world-keyed scallops, casting one crisp
 * shadow on the sheet), and the SHEET itself (0.4-tile world-grid
 * bands of the water palette, each breaking at a world-keyed height
 * into its air-charged lower half — a hard step, not a fade; base
 * DIPPED south of the wall foot and free ends FLARED outward as
 * the unconfined edge fans in air — the 2.5D pitch-out read; foam
 * threads at constant SCREEN speed — phase rate divides by drop
 * height so a two-level fall doesn't cascade twice as fast).
 * Churn, outwash, rings and mist live in per-row items on the low
 * ground (fallOutwashRowItem) so elevated landing rows — which
 * blit as items at rowTy-0.01 — can't paint over them; diagonals,
 * whose landing is a corner pocket rather than a row, draw their
 * dressing right here. Every mark is keyed to WORLD coordinates
 * (the cliff-face law): the sheet runs unbroken across segment
 * seams and around 45° turns, and both dip and band edges key to
 * world x so abutting segments join pixel-true.
 */
export function waterfallItem(rend: PaintHost, 
  game: ClientGame,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  level: number,
  info: SpillInfo,
  edgeL: boolean,
  edgeR: boolean,
  diagonal: boolean,
  mouth: Path2D | null,
): DrawItem {
  const s = rend.camera.scale;
  const topLift = level * ELEV_H * s;
  const landLift = info.landElev * ELEV_H * s;
  const levels = level - info.landElev;
  // The curtain's honest screen box (THE FALL RIDES THE SCRATCH,
  // A2 part 8): the falls are animated by design — every layer
  // carries its own phase or wobble, so the round-12 scroll-bake
  // idea dies here honestly. What they never needed was the SPLIT:
  // with a bounded box they ride the scratch lane in sort order
  // like any live art. Pads cover the crest roll above the lip,
  // the dipped base + churn below, and the flared free ends.
  const pA0 = rend.camera.worldToScreen(ax, ay, rend.w, rend.h);
  const pB0 = rend.camera.worldToScreen(bx, by, rend.w, rend.h);
  const pb = {
    x: Math.min(pA0.x, pB0.x) - 2 * s,
    y: Math.min(pA0.y, pB0.y) - topLift - 1.6 * s,
    w: Math.abs(pB0.x - pA0.x) + 4 * s,
    h: Math.abs(pB0.y - pA0.y) + (topLift - landLift) + 3.4 * s,
  };
  return {
    // THE SHELF LAW: the fall hangs down to its landing — it rides
    // the landing's shelf so a body at the foot (same shelf, larger
    // raw row) paints over it, and everything on the crown above
    // (higher shelf) beats it outright.
    strat: info.landElev !== 0 ? info.landElev : undefined,
    sortY: Math.min(ay, by) + 0.0015,
    pb,
    draw: () => {
      // Draw-time ctx: the scratch lane swaps rend.ctx under us
      // (the capture law — a creation-time ctx would paint the
      // real frame from inside a bounded pass).
      const ctx = rend.ctx;
      const t = performance.now() / 1000;
      const tones = fallTones(rend, );
      const fine = s >= 26;
      const A = rend.camera.worldToScreen(ax, ay, rend.w, rend.h);
      const B = rend.camera.worldToScreen(bx, by, rend.w, rend.h);
      A.x = Math.round(A.x);
      A.y = Math.round(A.y);
      B.x = Math.round(B.x);
      B.y = Math.round(B.y);
      // B-3 spanning warp: the curtain spans two corners (ay north, by
      // south) at different depths — each foreshortens by ITS OWN
      // depthScale, so the sheet recedes as a true trapezoid. The whole
      // sheet/bands/threads ride yTop*/yBase* via the interpolators
      // below, so warping these four warps the fall. q=0 → ×1.0 exactly.
      const dsA = rend.camera.depthScale(ay);
      const dsB = rend.camera.depthScale(by);
      const yTopA = A.y - topLift * dsA - 1.5;
      const yTopB = B.y - topLift * dsB - 1.5;
      const yBaseA = A.y - landLift * dsA;
      const yBaseB = B.y - landLift * dsB;
      const wxSpan = bx - ax || 1e-6;
      const fOf = (wx: number) => (wx - ax) / wxSpan;
      const sxAt = (f: number) => A.x + (B.x - A.x) * f;
      const yTopAt = (f: number) => yTopA + (yTopB - yTopA) * f;
      const yBaseAt = (f: number) => yBaseA + (yBaseB - yBaseA) * f;
      const vn = (v: number, salt: number, ks: number) =>
        fallNoise(v, salt, level, ks);
      const n01 = (a: number, sa: number) => stone01(a, sa, 911 + level * 17);

      // ---- the headrace ------------------------------------------
      if (!diagonal) {
        // THE MOUTH LAW: a full-width fill CLIPPED to the organic
        // mouth region — the channel's own drawn banks extended
        // over the rim strip by the virtual sampler, so the water's
        // edge at the lip IS the authored shoreline continuing.
        // The fill is the channel's OWN open-water tone, solid: the
        // baked feed and the race are one body of water (the old
        // navy-pit gradient stepped darker than anything the world
        // paints and let the rim grass bleed through). It overlaps
        // the DRAWN water by only 0.15 tiles — any deeper and the
        // flat fill erases the bake's tone variants and prints a
        // horizontal seam; the lanes and ghost columns cross the
        // overlap so no line survives.
        // Overlap the drawn pond by 0.5 tiles: the bake's shoreline
        // INK along the channel mouth sits just inside the water
        // edge, and any of it left uncovered floats in the race as
        // a dark crack. The wavy boundary keeps the deep overlap
        // seamless (same tone as the pond's open water).
        const raceTop = ay - info.race - 0.5;
        ctx.save();
        if (mouth) clipFallRegion(rend, mouth, topLift);
        const ovL = edgeL ? 0.3 : 0;
        const ovR = edgeR ? 0.3 : 0;
        const pTL = rend.camera.worldToScreen(ax - ovL, raceTop, rend.w, rend.h);
        const pBR = rend.camera.worldToScreen(bx + ovR, ay + 0.1, rend.w, rend.h);
        // The fill's upstream boundary is WAVY (world-keyed) — a
        // straight rect edge against the bake's tone variants is a
        // visible line even between near-identical tones.
        ctx.fillStyle = tones.race;
        ctx.beginPath();
        {
          const RT = Math.max(3, Math.ceil((bx - ax + ovL + ovR) / 0.18));
          for (let k = 0; k <= RT; k++) {
            const wx = ax - ovL + (bx + ovR - (ax - ovL)) * (k / RT);
            const wy = raceTop + (vn(wx, 165, 0.5) - 0.5) * 0.3;
            const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
            if (k === 0) ctx.moveTo(p.x, p.y - topLift * rend.camera.depthScale(wy)); // B-3 spanning warp
            else ctx.lineTo(p.x, p.y - topLift * rend.camera.depthScale(wy)); // B-3 spanning warp
          }
          ctx.lineTo(pBR.x, pBR.y - topLift * rend.camera.depthScale(ay + 0.1) /* B-3 spanning warp */);
          ctx.lineTo(pTL.x, pBR.y - topLift * rend.camera.depthScale(ay + 0.1) /* B-3 spanning warp */);
        }
        ctx.closePath();
        ctx.fill();
        // Mid-current lanes — darker streamlines that stretch and
        // strengthen as the water gathers for the drop.
        ctx.strokeStyle = tones.raceDeep;
        ctx.lineCap = 'round';
        for (let wx = Math.ceil((ax + 0.1) / 0.3) * 0.3; wx < bx - 0.05; wx += 0.3) {
          const idx = Math.round(wx / 0.3);
          const ph = (t * 0.85 * (0.8 + 0.4 * n01(idx, 31)) + n01(idx, 32)) % 1;
          // Lanes START upstream in the drawn water and cross the
          // fill seam — motion stitching the two bodies together.
          const wy0 = raceTop - 0.45 + Math.pow(ph, 1.5) * (ay - raceTop + 0.15);
          const wy1 = Math.min(ay + 0.05, wy0 + 0.3 + 0.55 * ph);
          const lx = wx + (n01(idx, 33) - 0.5) * 0.16;
          const p0 = rend.camera.worldToScreen(lx, wy0, rend.w, rend.h);
          const p1 = rend.camera.worldToScreen(lx, wy1, rend.w, rend.h);
          ctx.globalAlpha = (0.2 + 0.3 * ph) * tones.dim;
          ctx.lineWidth = Math.max(1.2, s * 0.035);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y - topLift * rend.camera.depthScale(wy0)); // B-3 spanning warp
          ctx.lineTo(p1.x, p1.y - topLift * rend.camera.depthScale(wy1)); // B-3 spanning warp
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // The ACCELERATION SHELF — a HALF-step between the race and
        // the pale lip, short and wavy-edged, so the crest is a
        // gradient of small tone steps rather than one cliff.
        ctx.beginPath();
        const SH = Math.max(3, Math.ceil((bx - ax + ovL + ovR) / 0.15));
        for (let k = 0; k <= SH; k++) {
          const wx = ax - ovL + ((bx + ovR) - (ax - ovL)) * (k / SH);
          const wy = ay - 0.3 + (vn(wx, 160, 0.4) - 0.5) * 0.16;
          const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
          if (k === 0) ctx.moveTo(p.x, p.y - topLift * rend.camera.depthScale(wy)); // B-3 spanning warp
          else ctx.lineTo(p.x, p.y - topLift * rend.camera.depthScale(wy)); // B-3 spanning warp
        }
        ctx.lineTo(pBR.x, pBR.y - topLift * rend.camera.depthScale(ay + 0.1) /* B-3 spanning warp */);
        ctx.lineTo(pTL.x, pBR.y - topLift * rend.camera.depthScale(ay + 0.1) /* B-3 spanning warp */);
        ctx.closePath();
        ctx.fillStyle = tones.shelf;
        ctx.fill();
        // THE COLUMNS ARRIVE EARLY: the sheet's world-grid band
        // tones ghost up through the shelf and the last stretch of
        // race, so the columns the water falls in are already
        // forming before the lip. Every column starts at its OWN
        // world-keyed height and fades in over a second soft step —
        // a shared start line would print the exact hard-rectangle
        // edge this pass exists to prevent.
        {
          const BW0 = 0.4;
          const g0 = Math.floor((ax - 0.6) / BW0);
          const g1 = Math.ceil((bx + 0.6) / BW0);
          for (let k = g0; k < g1; k++) {
            const eL = k * BW0 + (n01(k, 140) - 0.5) * 0.18;
            const eR = (k + 1) * BW0 + (n01(k + 1, 140) - 0.5) * 0.18;
            const tone = ((k % 4) + 4) % 4;
            const start = ay - 0.4 - 0.5 * n01(k, 147);
            const mid = start + 0.25 + 0.15 * n01(k, 148);
            const near = ay - 0.12 - 0.08 * n01(k, 149);
            const pL0 = rend.camera.worldToScreen(eL, start, rend.w, rend.h);
            const pL1 = rend.camera.worldToScreen(eL, mid, rend.w, rend.h);
            const pL2 = rend.camera.worldToScreen(eL, near, rend.w, rend.h);
            const pR = rend.camera.worldToScreen(eR, ay + 0.1, rend.w, rend.h);
            ctx.fillStyle = tones.band[tone]!;
            const aFull = 0.14 * (0.5 + 0.5 * n01(k, 144));
            ctx.globalAlpha = aFull * 0.45;
            ctx.fillRect(pL0.x, pL0.y - topLift * rend.camera.depthScale(start), pR.x - pL0.x, pL1.y - pL0.y); // B-3 spanning warp
            ctx.globalAlpha = aFull;
            ctx.fillRect(pL1.x, pL1.y - topLift * rend.camera.depthScale(mid), pR.x - pL1.x, pL2.y - pL1.y); // B-3 spanning warp
            // A third, stronger step hugging the lip: the column is
            // nearly formed by the time the sheet's wavy top edge
            // takes over, so the hand-off is a small step, not a
            // jump at a visible line.
            ctx.globalAlpha = Math.min(0.5, aFull * 2.2);
            ctx.fillRect(pL2.x, pL2.y - topLift * rend.camera.depthScale(near), pR.x - pL2.x, pR.y - pL2.y); // B-3 spanning warp
          }
          ctx.globalAlpha = 1;
        }
        // Foam ticks breaking on the shelf — the first white water.
        if (fine) {
          ctx.fillStyle = tones.foam;
          for (let wx = Math.ceil(ax / 0.24) * 0.24; wx < bx; wx += 0.24) {
            const idx = Math.round(wx / 0.24);
            if (n01(idx, 35) < 0.4) continue;
            const ph = (t * 1.6 + n01(idx, 36)) % 1;
            const wy = ay - 0.26 + ph * 0.2;
            const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
            ctx.globalAlpha = (0.2 + 0.4 * ph) * tones.dim;
            const rw = Math.max(1.5, s * 0.035);
            ctx.fillRect(p.x - rw / 2, p.y - topLift * rend.camera.depthScale(wy), rw, Math.max(2, s * 0.05)); // B-3 spanning warp
          }
          ctx.globalAlpha = 1;
        }
        ctx.lineCap = 'butt';
        ctx.restore();
      } else {
        // Diagonal race: the bevel's feed arrives cornerwise — a
        // short solid tongue upstream along the normal, in the
        // channel's own tone (no mouth clip on bevels; corners are
        // rare and the tongue is small).
        const rr = Math.min(info.race, 1.2);
        const p0 = rend.camera.worldToScreen(ax - nx * rr, ay - ny * rr, rend.w, rend.h);
        const p1 = rend.camera.worldToScreen(bx - nx * rr, by - ny * rr, rend.w, rend.h);
        ctx.beginPath();
        ctx.moveTo(sxAt(0), yTopAt(0) + 1.5);
        ctx.lineTo(sxAt(1), yTopAt(1) + 1.5);
        ctx.lineTo(p1.x, p1.y - topLift * rend.camera.depthScale(by - ny * rr)); // B-3 spanning warp
        ctx.lineTo(p0.x, p0.y - topLift * rend.camera.depthScale(ay - ny * rr)); // B-3 spanning warp
        ctx.closePath();
        ctx.fillStyle = tones.race;
        ctx.globalAlpha = 0.92 * (tones.dim * 0.4 + 0.6);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ---- the sheet ---------------------------------------------
      // THE PITCH-OUT GEOMETRY: water leaves the lip with speed, so
      // the sheet is not a wall decal — its base lands DIPPED south
      // of the wall foot (scalloped by world noise, continuous
      // across segment seams), and free ends FLARE outward with
      // v² as the unconfined margin fans in the air.
      const dip = s * 0.2;
      const dipAt = (wx: number) => dip * (0.8 + 0.4 * vn(wx, 130, 0.55));
      // The dip TAPERS toward free ends: a flared corner that also
      // dips to full depth pokes past the churn's cap taper as a
      // naked glass fin over the pool — the corner rises so the
      // foam rank owns the whole base line.
      const endK = (f: number): number => {
        const span = Math.abs(wxSpan);
        const reach = Math.min(0.9, span) || 1;
        let k = 1;
        if (edgeL) k = Math.min(k, 0.45 + 0.55 * Math.min(1, (f * span) / reach));
        if (edgeR) k = Math.min(k, 0.45 + 0.55 * Math.min(1, ((1 - f) * span) / reach));
        return k;
      };
      const flare = s * 0.16;
      const flareAt = (f: number, v: number): number => {
        const g = v * v;
        let d = 0;
        const span = Math.abs(wxSpan);
        // The falloff reach CLAMPS to the segment span: an end
        // segment shorter than the 0.9-tile reach must still hit
        // exactly zero at its sealed seam, or the flare drags it
        // off its neighbour and the wall grins through the crack.
        const reach = Math.min(0.9, span) || 1;
        if (edgeL) d -= flare * g * Math.max(0, 1 - (f * span) / reach);
        if (edgeR) d += flare * g * Math.max(0, 1 - ((1 - f) * span) / reach);
        return d;
      };
      // THE LIVING EDGE: the silhouette undulates — world-keyed
      // lateral wobble growing as the water gathers speed, so no
      // ruler-straight margin survives. Keyed by (edge wx, v):
      // abutting segments of one run agree at every shared seam.
      const edgeWob = (wx: number, v: number): number =>
        s * 0.05 * (vn(wx * 1.7 + v * 2.63, 156, 1) - 0.5) * (0.3 + 0.7 * v);
      const xAt = (f: number, v: number) => sxAt(f) + flareAt(f, v);
      const yAt = (f: number, wx: number, v: number) =>
        yTopAt(f) + (yBaseAt(f) + dipAt(wx) * endK(f) - yTopAt(f)) * v;
      // Seat the sheet INTO the scene: a crisp AO shade on the wall
      // just outside each free edge — the curtain hangs IN FRONT of
      // the face, it is not painted onto it.
      if (edgeL || edgeR) {
        for (const [isE, f, sgn] of [
          [edgeL, 0, -1],
          [edgeR, 1, 1],
        ] as const) {
          if (!isE) continue;
          const xe = sxAt(f);
          const gAO = ctx.createLinearGradient(xe, 0, xe + sgn * s * 0.16, 0);
          gAO.addColorStop(0, 'rgba(8,12,24,0.26)');
          gAO.addColorStop(1, 'rgba(8,12,24,0)');
          ctx.fillStyle = gAO;
          const yT = yTopAt(f);
          ctx.fillRect(
            sgn > 0 ? xe : xe - s * 0.16,
            yT,
            s * 0.16,
            yBaseAt(f) - yT,
          );
        }
      }
      const SEG = Math.max(4, Math.ceil(Math.abs(wxSpan) * 5));
      // The sheet outline carries NO straight line anywhere: the
      // top edge waves on world noise (a straight clip edge prints
      // a tone line against the ghost columns above), the sides
      // ride the living-edge wobble, the base is the dipped
      // scallop. Every vertex is world-keyed — seams stay sealed.
      const NV = 8;
      const sheet = new Path2D();
      {
        const NT = Math.max(3, Math.ceil(Math.abs(wxSpan) / 0.18));
        for (let k = 0; k <= NT; k++) {
          const f = k / NT;
          const wx = ax + wxSpan * f;
          const y = yTopAt(f) + (vn(wx, 163, 0.6) - 0.5) * s * 0.07;
          if (k === 0) sheet.moveTo(xAt(f, 0), y);
          else sheet.lineTo(xAt(f, 0), y);
        }
      }
      for (let k = 1; k <= NV; k++) {
        const v = k / NV;
        sheet.lineTo(xAt(1, v) + edgeWob(bx, v), yAt(1, bx, v));
      }
      for (let k = SEG; k >= 0; k--) {
        const f = k / SEG;
        const wx = ax + wxSpan * f;
        sheet.lineTo(xAt(f, 1), yBaseAt(f) + dipAt(wx) * endK(f));
      }
      for (let k = NV - 1; k >= 1; k--) {
        const v = k / NV;
        sheet.lineTo(xAt(0, v) + edgeWob(ax, v), yAt(0, ax, v));
      }
      sheet.closePath();
      ctx.save();
      ctx.clip(sheet);
      // Base coat under the bands — no seam pixel survives.
      {
        const cx0 = Math.min(sxAt(0), sxAt(1)) - flare - 2;
        const cx1 = Math.max(sxAt(0), sxAt(1)) + flare + 2;
        const cyT = Math.min(yTopA, yTopB) - 2;
        const cyB = Math.max(yBaseA, yBaseB) + dip * 1.4 + 2;
        ctx.fillStyle = tones.band[1]!;
        ctx.fillRect(cx0, cyT, cx1 - cx0, cyB - cyT);
      }
      // THE BANDS — 0.4-tile world grid, edges jittered by world
      // noise so no two columns match and abutting segments share
      // every edge. Each band is the water palette, breaking at a
      // world-keyed height into its air-charged lower half — one
      // hard step, the flat-vector aeration read.
      const BW = 0.4;
      const bandQuad = (
        fL: number,
        fR: number,
        wxL: number,
        wxR: number,
        v0: number,
        v1: number,
      ): void => {
        ctx.beginPath();
        ctx.moveTo(xAt(fL, v0), yAt(fL, wxL, v0));
        ctx.lineTo(xAt(fR, v0), yAt(fR, wxR, v0));
        ctx.lineTo(xAt(fR, v1), yAt(fR, wxR, v1));
        ctx.lineTo(xAt(fL, v1), yAt(fL, wxL, v1));
        ctx.closePath();
        ctx.fill();
      };
      const k0 = Math.floor((Math.min(ax, bx) - 0.6) / BW);
      const k1 = Math.ceil((Math.max(ax, bx) + 0.6) / BW);
      for (let k = k0; k < k1; k++) {
        const eL = k * BW + (n01(k, 140) - 0.5) * 0.18;
        const eR = (k + 1) * BW + (n01(k + 1, 140) - 0.5) * 0.18;
        const fL = fOf(eL);
        const fR = fOf(eR);
        const tone = ((k % 4) + 4) % 4;
        const split =
          0.34 + 0.38 * n01(k, 141) + 0.03 * Math.sin(t * 1.1 + k * 1.9);
        ctx.fillStyle = tones.band[tone]!;
        bandQuad(fL, fR, eL, eR, -0.05, split);
        ctx.fillStyle = tones.bandLow[tone]!;
        bandQuad(fL, fR, eL, eR, split, 1.1);
        // THE GLASSY TONGUE — on some columns the race's own tone
        // carries over the lip and down into the sheet before the
        // air gets in: the one mark that makes the crest read as
        // water CONTINUING rather than a new element starting.
        if (n01(k, 145) < 0.55) {
          ctx.fillStyle = tones.race;
          ctx.globalAlpha = 0.55;
          bandQuad(fL, fR, eL, eR, -0.05, 0.1 + 0.2 * n01(k, 146));
          ctx.globalAlpha = 1;
        }
        // A thin dark seam on some column edges — the shear line
        // between ropes of water.
        if (fine && n01(k, 142) < 0.3) {
          ctx.strokeStyle = tones.rollInk;
          ctx.globalAlpha = 0.16;
          ctx.lineWidth = Math.max(1, s * 0.02);
          ctx.beginPath();
          ctx.moveTo(xAt(fL, 0.06), yAt(fL, eL, 0.06));
          ctx.lineTo(xAt(fL, 1), yAt(fL, eL, 1));
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // Falling foam ropes at constant SCREEN speed (phase divides
      // by the drop so stacked falls don't double-time) — bold,
      // tapering, the sheet's primary motion.
      const step = fine ? 0.22 : 0.42;
      const vSpeed = 3.1 / (ELEV_H * levels);
      ctx.lineCap = 'round';
      for (let wx = Math.ceil(Math.min(ax, bx) / step) * step; wx < Math.max(ax, bx); wx += step) {
        const idx = Math.round(wx / step);
        for (let k = 0; k < 2; k++) {
          const ph = (t * vSpeed * (0.85 + 0.3 * n01(idx, 40 + k)) + n01(idx, 50 + k)) % 1;
          const v0 = Math.pow(ph, 1.35);
          const v1 = Math.min(1.05, v0 + 0.12 + 0.26 * v0);
          const f = fOf(wx + (n01(idx, 45 + k) - 0.5) * 0.08);
          const wob = Math.sin(t * 1.4 + wx * 6.1 + k * 2.4) * s * 0.01;
          ctx.strokeStyle = tones.foam;
          ctx.globalAlpha = (0.3 + 0.5 * v0) * tones.dim;
          ctx.lineWidth = Math.max(1.4, s * (0.036 + 0.026 * n01(idx, 60 + k)) * (0.7 + 0.5 * v0));
          ctx.beginPath();
          ctx.moveTo(xAt(f, v0) + wob, yAt(f, wx, v0));
          ctx.lineTo(xAt(f, v1) + wob, yAt(f, wx, v1));
          ctx.stroke();
        }
        // A dark back-thread between the ropes — the sheet's depth.
        if ((idx & 1) === 0) {
          const ph = (t * vSpeed * 0.9 + n01(idx, 55) + 0.5) % 1;
          const v0 = Math.pow(ph, 1.35);
          const f = fOf(Math.min(Math.max(ax, bx), wx + step * 0.5));
          ctx.strokeStyle = tones.rollInk;
          ctx.globalAlpha = 0.22;
          ctx.lineWidth = Math.max(1.2, s * 0.032);
          ctx.beginPath();
          ctx.moveTo(xAt(f, v0), yAt(f, wx, v0));
          ctx.lineTo(xAt(f, Math.min(1, v0 + 0.18)), yAt(f, wx, Math.min(1, v0 + 0.18)));
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      // The IMPACT FRINGE — spray rebounding up the sheet's foot.
      // Ragged on purpose: jittered off the tick grid, wide height
      // spread, some columns skipped — a regular picket of equal
      // ticks reads as battlements, not spray.
      if (fine) {
        ctx.strokeStyle = tones.foam;
        ctx.lineCap = 'round';
        for (let wx = Math.ceil(Math.min(ax, bx) / 0.16) * 0.16; wx < Math.max(ax, bx); wx += 0.16) {
          const idx = Math.round(wx / 0.16);
          if (n01(idx, 65) < 0.3) continue;
          const f = fOf(wx + (n01(idx, 68) - 0.5) * 0.12);
          const rise =
            0.05 + 0.16 * n01(idx, 66) + 0.04 * Math.sin(t * 3.4 + idx * 2.1);
          ctx.globalAlpha = (0.25 + 0.4 * n01(idx, 67)) * tones.dim;
          ctx.lineWidth = Math.max(1.3, s * (0.024 + 0.02 * n01(idx, 69)));
          ctx.beginPath();
          ctx.moveTo(xAt(f, 1), yAt(f, wx, 1));
          ctx.lineTo(xAt(f, 1 - rise), yAt(f, wx, 1 - rise));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
      }
      ctx.restore();

      // ---- CORNER BOILS ------------------------------------------
      // Small foam clusters seated over each free base corner —
      // the churn's cap taper leaves the very corner bare, and a
      // bare flared corner is a glass fin over the pool. A boil
      // grounds it the way the mound rank grounds the middle.
      for (const [isE, f, wxE] of [
        [edgeL, 0, ax],
        [edgeR, 1, bx],
      ] as const) {
        if (!isE) continue;
        const cxp = xAt(f, 1) + edgeWob(wxE, 1) * 0.5;
        const cyp = yBaseAt(f) + dipAt(wxE) * endK(f);
        const seedC = Math.round(wxE * 4) + 57;
        for (let k = 0; k < 3; k++) {
          const bo = Math.sin(t * (1.6 + 0.5 * n01(seedC, 61 + k)) + k * 2.2);
          const rr = s * (0.05 + 0.045 * n01(seedC, 62 + k)) * (1 + 0.1 * bo);
          const oxp = (n01(seedC, 63 + k) - 0.5) * s * 0.16;
          const oyp = (n01(seedC, 64 + k) - 0.5) * s * 0.08 + bo * s * 0.01;
          ctx.fillStyle = k === 0 ? tones.splashPale : tones.foam;
          ctx.beginPath();
          ctx.ellipse(cxp + oxp, cyp + oyp, rr * 1.5, rr * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- THE CREST ROLL ----------------------------------------
      // The foreshortened curl — the top-plane law applied to
      // water. Never a bar: the curl's height SWELLS and PINCHES
      // along a long world wave, BOTH its edges ride noise, and the
      // lit arris is broken ticks where the fold happens to catch
      // light. A full-width band with one straight edge is the
      // pasted-on transition line, whatever its tone.
      const rollH = s * 0.115;
      const swellAt = (wx: number) => 0.45 + 0.9 * vn(wx, 158, 0.32);
      const SCP = 0.16;
      const NSc = Math.max(3, Math.ceil(Math.abs(wxSpan) / SCP));
      const topYAt = (f: number): number => {
        const wx = ax + wxSpan * f;
        return (
          yTopAt(f) -
          s * 0.05 * Math.min(1, swellAt(wx)) +
          (vn(wx, 159, 0.9) - 0.5) * s * 0.03
        );
      };
      const scallopY = (f: number): number => {
        const wx = ax + wxSpan * f;
        const i = Math.round(wx / SCP);
        // Two noise octaves — a long swell under the per-scallop
        // jitter, so the tear-off line never reads as a valance.
        return (
          yTopAt(f) +
          rollH * swellAt(wx) * (0.45 + 0.4 * vn(wx, 151, 1.1) + 0.45 * n01(i, 150)) +
          Math.sin(t * 2.2 + i * 1.7) * s * 0.012
        );
      };
      const roll = new Path2D();
      for (let k = 0; k <= NSc; k++) {
        const f = k / NSc;
        if (k === 0) roll.moveTo(sxAt(f), topYAt(f));
        else roll.lineTo(sxAt(f), topYAt(f));
      }
      for (let k = NSc; k >= 0; k--) roll.lineTo(sxAt(k / NSc), scallopY(k / NSc));
      roll.closePath();
      ctx.fillStyle = tones.rollLit;
      ctx.fill(roll);
      // The curl's cast shadow — soft enough to shade, never a
      // drawn outline (a hard ink line here is exactly the pasted-
      // element edge).
      ctx.strokeStyle = tones.rollInk;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1.2, s * 0.032);
      ctx.beginPath();
      for (let k = 0; k <= NSc; k++) {
        const f = k / NSc;
        const y = scallopY(f) + s * 0.012;
        if (k === 0) ctx.moveTo(sxAt(f), y);
        else ctx.lineTo(sxAt(f), y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Broken sunlit ticks along the fold — only where the curl
      // swells enough to catch the light, sliding with the water.
      ctx.strokeStyle = tones.crest;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.4, s * 0.035);
      for (let wx = Math.ceil(Math.min(ax, bx) / 0.34) * 0.34; wx < Math.max(ax, bx) - 0.15; wx += 0.34) {
        if (swellAt(wx) < 0.8) continue;
        const idx = Math.round(wx / 0.34);
        const f0 = fOf(wx);
        const f1 = fOf(Math.min(Math.max(ax, bx), wx + 0.14 + 0.12 * n01(idx, 152)));
        if (f0 < 0 || f0 > 1) continue;
        ctx.globalAlpha =
          (0.4 + 0.35 * n01(idx, 153)) *
          (0.7 + 0.3 * Math.sin(t * 2.3 + idx * 2.7)) *
          tones.dim;
        ctx.beginPath();
        ctx.moveTo(sxAt(f0), topYAt(f0) + s * 0.012);
        ctx.lineTo(sxAt(f1), topYAt(f1) + s * 0.012);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      if (fine) {
        // Break combs — foam teeth tearing off the scallop line,
        // only where the curl happens to shred (never a dash row).
        ctx.fillStyle = tones.foam;
        for (let wx = Math.ceil(Math.min(ax, bx) / 0.3) * 0.3; wx < Math.max(ax, bx); wx += 0.3) {
          const idx = Math.round(wx / 0.3);
          if (n01(idx, 89) < 0.35) continue;
          const f = fOf(wx);
          ctx.globalAlpha =
            (0.35 + 0.5 * n01(idx, 90)) *
            (0.7 + 0.3 * Math.sin(t * 3.7 + idx * 2.2)) *
            tones.dim;
          const cw = Math.max(1.5, s * 0.035);
          ctx.fillRect(
            sxAt(f) - cw / 2,
            scallopY(f),
            cw,
            s * (0.06 + 0.09 * n01(idx, 91)),
          );
        }
        ctx.globalAlpha = 1;
      }

      // ---- diagonal landing dressing -----------------------------
      if (diagonal) {
        drawFallChurn(rend, ax, ay, bx, by, nx, ny, landLift, level, t, tones, s * 0.17);
        const wet = (wx: number, wy: number): boolean =>
          game.world.elevAt(Math.floor(wx), Math.floor(wy)) === info.landElev &&
          isFallWater(game.world.groundAt(Math.floor(wx), Math.floor(wy)));
        emitFallHaze(rend, 
          ax + nx * (info.drop * 0.5 + 0.3),
          ay + ny * (info.drop * 0.5 + 0.3),
          bx + nx * (info.drop * 0.5 + 0.3),
          by + ny * (info.drop * 0.5 + 0.3),
          wet,
        );
      }
    },
  };
}

/**
 * One low-ground row of a straight fall's landing: the outwash
 * tongue slice (spreading as it runs, whitest at impact); row 0 adds
 * the churn mound over the sheet's foot; the last row adds pool
 * rings (FLAT-law 0.6 ellipses), drifting foam rafts, the mist veil,
 * and owns the haze particles. Per-row items because elevated
 * landing rows blit as items at rowTy-0.01 — one spanning item
 * would be painted over by every row after its own.
 */
export function fallOutwashRowItem(rend: PaintHost, 
  game: ClientGame,
  x0: number,
  x1: number,
  foot: number,
  r: number,
  info: SpillInfo,
  level: number,
  land: Path2D | null,
  apron: Path2D | null,
  runX0: number,
  runX1: number,
): DrawItem {
  const s = rend.camera.scale;
  const landLift = info.landElev * ELEV_H * s;
  const rowY = foot + r;
  const last = r === info.drop;
  // Run-level marks (the veils) draw once, from the segment holding
  // the run's midpoint — per-segment veils stack into cones/banding.
  const runMid = (runX0 + runX1) / 2;
  const ownsVeil = runMid >= x0 && runMid < x1 + 0.001;
  const wet = (wx: number, wy: number): boolean =>
    game.world.elevAt(Math.floor(wx), Math.floor(wy)) === info.landElev &&
    isFallWater(game.world.groundAt(Math.floor(wx), Math.floor(wy)));
  // One landing row's box: the outwash tongue, veils, rings and
  // mist all live within the run span + spread; generous pads are
  // transparent-cheap, a clipped veil is a visible bug.
  const pR0 = rend.camera.worldToScreen(Math.min(x0, runX0) - 1.6, rowY - 0.6, rend.w, rend.h);
  const pR1 = rend.camera.worldToScreen(Math.max(x1, runX1) + 1.6, rowY + 1.8, rend.w, rend.h);
  return {
    strat: info.landElev !== 0 ? info.landElev : undefined,
    sortY: rowY + 0.0015,
    pb: { x: pR0.x, y: pR0.y - landLift, w: pR1.x - pR0.x, h: pR1.y - pR0.y },
    draw: () => {
      const ctx = rend.ctx; // draw-time: the scratch lane swaps it
      const t = performance.now() / 1000;
      const tones = fallTones(rend, );
      const vn = (v: number, salt: number, ks: number) =>
        fallNoise(v, salt, level, ks);
      const n01 = (a: number, sa: number) => stone01(a, sa, 911 + level * 17);
      const wts = (wx: number, wy: number) => {
        const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
        p.y -= landLift * rend.camera.depthScale(wy); // B-3 spanning warp
        return p;
      };
      // The outwash tongue — the RAPID racing across the apron rock
      // into the pool. Spreads gently as it runs; dry-row slices
      // paint denser (rushing water over stone must read as water,
      // not a wash stain), the shore row clips to the drawn pool.
      const spreadAt = (wy: number, side: number) =>
        0.1 * (wy - foot) + (vn(wy, 25 + side, 0.7) - 0.5) * 0.08;
      const tonguePath = (depth: number): void => {
        const SS = 3;
        ctx.beginPath();
        for (let k = 0; k <= SS; k++) {
          const wy = rowY + (k / SS) * depth;
          const p = wts(x0 - spreadAt(wy, 0), wy);
          ctx.lineTo(p.x, p.y);
        }
        for (let k = SS; k >= 0; k--) {
          const wy = rowY + (k / SS) * depth;
          const p = wts(x1 + spreadAt(wy, 1), wy);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      };
      // THE OUTFLOW FINGERS — where the rapid enters the pool it
      // breaks into tongues: opaque pale capsule streams at world-
      // keyed lengths, tips dissolving into detached rafts. Never
      // one fading slab: a gradient apron prints its own edges.
      const fingers = (): void => {
        ctx.lineCap = 'round';
        for (let wx = Math.ceil((x0 + 0.08) / 0.3) * 0.3; wx < x1 - 0.05; wx += 0.3) {
          const idx = Math.round(wx / 0.3);
          if (n01(idx, 90) < 0.18) continue;
          const lenF = 0.28 + 0.42 * n01(idx, 91);
          const wxa = wx + (n01(idx, 92) - 0.5) * 0.18;
          const surge = 1 + 0.06 * Math.sin(t * 1.4 + idx * 2.3);
          const p0 = wts(wxa, rowY - 0.08);
          const p1 = wts(wxa + (n01(idx, 93) - 0.5) * 0.1, rowY + lenF * surge);
          ctx.strokeStyle = n01(idx, 94) < 0.45 ? tones.splashPale : tones.splashMid;
          ctx.lineWidth = s * (0.16 + 0.14 * n01(idx, 95));
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          // The detached raft off the tip — the stream's tone
          // carrying on into the pool after the stream lets go.
          if (n01(idx, 96) > 0.45) {
            const pr = wts(wxa + (n01(idx, 97) - 0.5) * 0.2, rowY + lenF + 0.18 + 0.14 * n01(idx, 98));
            const rr = s * (0.04 + 0.04 * n01(idx, 99));
            ctx.fillStyle = tones.splashMid;
            ctx.beginPath();
            ctx.ellipse(pr.x, pr.y, rr * 1.7, rr * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.lineCap = 'butt';
      };
      const dashes = (depth: number): void => {
        ctx.strokeStyle = tones.foam;
        ctx.lineCap = 'round';
        for (let wx = Math.ceil((x0 + 0.1) / 0.33) * 0.33; wx < x1 - 0.05; wx += 0.33) {
          const idx = Math.round(wx / 0.33);
          const ph = (t * 1.25 * (0.85 + 0.3 * n01(idx, 33)) + n01(idx, 34)) % 1;
          const wy0 = rowY + ph * depth;
          const p0 = wts(wx, wy0);
          const p1 = wts(wx, Math.min(rowY + depth, wy0 + 0.22));
          ctx.globalAlpha = 0.36 * (1 - r * 0.14) * (1 - ph * 0.5) * tones.dim;
          ctx.lineWidth = Math.max(1.2, s * 0.03);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
      };
      // The rapid clips to the OUTWASH CORRIDOR — the apron region
      // whose organic banks fuse into the pool's drawn shoreline
      // (the mouth law pointed downhill). It includes the pool, so
      // the whole run-out is one clipped body of moving water.
      // ROW 0 DRAWS NO RAPID: row 0 is the WALL row — its slice
      // projects onto the wall face, which is the sheet's domain.
      // Painted anyway, the bed/rapid leak out past the sheet's
      // free edges wherever the corridor's organic banks flare
      // wider than the run — an opaque slab climbing the wall
      // beside the curtain. The churn is row 0's only dressing.
      if (r > 0) {
      ctx.save();
      if (apron) clipFallRegion(rend, apron, landLift);
      // The water BED first: an opaque fill so the corridor reads
      // as a channel cut through the bank, not foam on grass. The
      // shore row's bed FADES into the pool (no tone step on the
      // open water); overhang only at the run's free ends — abutting
      // segment rects must not double-paint.
      {
        const ovL = Math.abs(x0 - runX0) < 0.01 ? 0.35 : 0;
        const ovR = Math.abs(x1 - runX1) < 0.01 ? 0.35 : 0;
        // The bed is a PATH, not a rect: sides wave on world-y
        // noise (rows sample the same function at shared depths, so
        // stacked rows stay continuous), and the shore row's bottom
        // breaks into the pool along a deep wavy boundary — an
        // OPAQUE tone step in the water, never an alpha fade whose
        // rectangle corners crop over the pool.
        const depth = last ? 0.72 : 1;
        const bed = rend.sky.moonlit ? '#38547f' : '#6096c0';
        ctx.fillStyle = bed;
        ctx.beginPath();
        const NSd = 4;
        const sideX = (base: number, wy: number, salt: number): number =>
          base + (vn(wy * 1.3, salt, 0.8) - 0.5) * 0.14;
        // Down the left bank, along the bottom, up the right bank;
        // closePath seals the straight top edge under the row above.
        for (let k = 0; k <= NSd; k++) {
          const wy = rowY - 0.02 + (k / NSd) * (depth + 0.02);
          const p = wts(sideX(x0 - ovL, wy, 26), wy);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        {
          const NB = Math.max(3, Math.ceil((x1 - x0 + ovL + ovR) / 0.16));
          for (let k = 0; k <= NB; k++) {
            const wx = x0 - ovL + (x1 + ovR - (x0 - ovL)) * (k / NB);
            const amp = last ? 0.3 : 0.04;
            const wy = rowY + depth + (vn(wx, 27, 0.55) - 0.5) * amp;
            const p = wts(wx, wy);
            ctx.lineTo(p.x, p.y);
          }
        }
        for (let k = NSd; k >= 0; k--) {
          const wy = rowY - 0.02 + (k / NSd) * (depth + 0.02);
          const p = wts(sideX(x1 + ovR, wy, 24), wy);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fill();
        // Detached bed-tone shoals past the shore boundary — the
        // step interpenetrates the pool instead of contouring it.
        if (last) {
          for (let wx = Math.ceil((x0 + 0.1) / 0.44) * 0.44; wx < x1; wx += 0.44) {
            const idx = Math.round(wx / 0.44);
            if (n01(idx, 28) < 0.4) continue;
            const p = wts(
              wx + (n01(idx, 29) - 0.5) * 0.2,
              rowY + depth + 0.18 + 0.2 * n01(idx, 30),
            );
            const rr = s * (0.05 + 0.05 * n01(idx, 31));
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rr * 1.8, rr * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      if (!last) {
        // A dry apron slice: the full-depth rapid — an OPAQUE pale
        // stream over the bed, with dark cut lines along its edges
        // so the racing sheet owns its banks.
        tonguePath(1);
        ctx.fillStyle = tones.splashMid;
        ctx.fill();
        ctx.strokeStyle = 'rgba(26,48,96,0.85)';
        ctx.globalAlpha = 0.2 * tones.dim;
        ctx.lineWidth = Math.max(1.2, s * 0.028);
        for (const side of [0, 1] as const) {
          ctx.beginPath();
          for (let k = 0; k <= 3; k++) {
            const wy = rowY + (k / 3) * 1;
            const p =
              side === 0
                ? wts(x0 - spreadAt(wy, 0), wy)
                : wts(x1 + spreadAt(wy, 1), wy);
            if (k === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        dashes(1);
      } else {
        fingers();
        dashes(0.6);
      }
      ctx.restore();
      }
      if (last) {
        // Everything living ON the pool's surface — rings, rafts,
        // the strong veil — clips to the drawn water region.
        ctx.save();
        if (land) clipFallRegion(rend, land, landLift);
        // Pool rings — THE FLAT LAW (0.6 squash), but BROKEN arcs:
        // a closed ellipse reads as a soap bubble; real wash rings
        // shear apart as they spread, so each is a partial arc with
        // a world-keyed start and span, centre jittered off-grid.
        for (let wx = Math.ceil((x0 + 0.15) / 0.55) * 0.55; wx < x1; wx += 0.55) {
          const idx = Math.round(wx / 0.55);
          for (let k = 0; k < 2; k++) {
            const ph = (t * 0.5 + k * 0.41 + n01(idx, 80 + k)) % 1;
            const rx = (0.1 + ph * 0.5) * s;
            const p = wts(
              wx + (n01(idx, 83 + k) - 0.5) * 0.3,
              rowY + 0.4 + (n01(idx, 84 + k) - 0.5) * 0.25,
            );
            const a0 = n01(idx, 85 + k) * Math.PI * 2;
            const span = Math.PI * (0.7 + 0.9 * n01(idx, 86 + k));
            ctx.strokeStyle = tones.foam;
            ctx.globalAlpha = (1 - ph) * 0.38 * tones.dim;
            ctx.lineWidth = Math.max(1.2, s * 0.028);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rx, rx * 0.6, 0, a0, a0 + span);
            ctx.stroke();
          }
        }
        // Drifting foam rafts riding the outflow.
        ctx.fillStyle = tones.foam;
        for (let wx = Math.ceil(x0 / 0.7) * 0.7; wx < x1; wx += 0.7) {
          const idx = Math.round(wx / 0.7);
          const ph = (t * 0.28 + n01(idx, 86)) % 1;
          const p = wts(wx + (n01(idx, 87) - 0.5) * 0.3, rowY + 0.25 + ph * 0.7);
          ctx.globalAlpha = (1 - ph) * 0.3 * tones.dim;
          const rr = s * (0.05 + 0.04 * n01(idx, 88));
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rr * 1.6, rr * 0.6, 0, 0, Math.PI * 2);
          ctx.ellipse(p.x + rr, p.y + rr * 0.3, rr, rr * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (ownsVeil) {
          // ONE veil for the whole run, over the pool it rises from.
          const pm = wts(runMid, rowY + 0.35);
          const rx =
            ((runX1 - runX0) * 0.5 + 0.4) * s * (1 + 0.05 * Math.sin(t * 0.9 + runMid));
          const ry = s * 0.55;
          const rg = ctx.createRadialGradient(pm.x, pm.y, 0, pm.x, pm.y, rx);
          rg.addColorStop(0, `rgba(238,246,253,${0.11 * tones.dim})`);
          rg.addColorStop(0.6, `rgba(238,246,253,${0.055 * tones.dim})`);
          rg.addColorStop(1, 'rgba(238,246,253,0)');
          ctx.save();
          ctx.translate(pm.x, pm.y);
          ctx.scale(1, ry / rx);
          ctx.translate(-pm.x, -pm.y);
          ctx.fillStyle = rg;
          ctx.fillRect(pm.x - rx, pm.y - rx, rx * 2, rx * 2);
          ctx.restore();
        }
        ctx.restore();
        if (ownsVeil) {
          // The faint free mist — the only mark allowed past the
          // banks, because air is.
          const pmF = wts(runMid, rowY + 0.25);
          const rxF = ((runX1 - runX0) * 0.3 + 0.25) * s;
          const rgF = ctx.createRadialGradient(pmF.x, pmF.y, 0, pmF.x, pmF.y, rxF);
          rgF.addColorStop(0, `rgba(238,246,253,${0.06 * tones.dim})`);
          rgF.addColorStop(1, 'rgba(238,246,253,0)');
          ctx.save();
          ctx.translate(pmF.x, pmF.y);
          ctx.scale(1, 0.55);
          ctx.translate(-pmF.x, -pmF.y);
          ctx.fillStyle = rgF;
          ctx.fillRect(pmF.x - rxF, pmF.y - rxF, rxF * 2, rxF * 2);
          ctx.restore();
        }
        emitFallHaze(rend, x0, rowY + 0.3, x1, rowY + 0.3, wet);
      }
      if (r === 0) {
        // Taper caps ONLY at the run's true ends — interior seams
        // keep env=1 so the world-keyed mound rank crosses them.
        drawFallChurn(rend, 
          x0,
          foot,
          x1,
          foot,
          0,
          1,
          landLift,
          level,
          t,
          tones,
          s * 0.17,
          Math.abs(x0 - runX0) < 0.01,
          Math.abs(x1 - runX1) < 0.01,
        );
      }
    },
  };
}

/**
 * THE SIDE FALL — water over a pure north-south rim. The face is
 * edge-on (the cliffSideItem cheat strip), so the fall reads as a
 * narrow ribbon hugging the rim line: crest fold at the top, scroll
 * threads at constant screen speed, aerating body, churn stack at
 * the landing. One item per contiguous water streak of the run —
 * the sheet's motion needs the whole height, not row-sliced phases.
 * Sorts at its FIRST row without the side item's early bias: every
 * wall slice that can overlap sorts earlier by construction (their
 * bias is the full crown lift), while bodies beside the rim still
 * win against the wall line itself.
 */
export function fallRibbonItem(rend: PaintHost, 
  x: number,
  r0: number,
  r1: number,
  nx: number,
  level: number,
  info: SpillInfo,
  land: Path2D | null,
): DrawItem {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const topLift = level * ELEV_H * s;
  const landLift = info.landElev * ELEV_H * s;
  const levels = level - info.landElev;
  return {
    strat: info.landElev !== 0 ? info.landElev : undefined,
    sortY: r0 + 0.001,
    draw: () => {
      const t = performance.now() / 1000;
      const tones = fallTones(rend, );
      const fine = s >= 26;
      const A = rend.camera.worldToScreen(x, r0, rend.w, rend.h);
      const B = rend.camera.worldToScreen(x, r1, rend.w, rend.h);
      const sx = Math.round(A.x);
      const dir = nx >= 0 ? 1 : -1;
      const w = Math.max(7, s * 0.34);
      const xWall = nx >= 0 ? sx - Math.max(1, s * 0.03) : sx + Math.max(1, s * 0.03);
      // B-3 spanning warp: the edge-on ribbon spans crest (r0) to
      // landing (r1) at different depths — each end foreshortens by its
      // own corner's depthScale, so the whole body (yT..yLand, H) rides
      // a true trapezoid. q=0 depthScale is exactly 1 → byte-identical.
      const yT = Math.round(A.y - topLift * rend.camera.depthScale(r0)) - 1;
      const yLand = Math.round(B.y - landLift * rend.camera.depthScale(r1)) + Math.round(s * 0.06);
      const H = yLand - yT;
      const n01 = (a: number, sa: number) => stone01(a, sa, 911 + level * 17);
      // The edge-on sheet: wall edge dead straight on the rim line,
      // outer silhouette BOWED outward toward the base — the water
      // pitching away from the face as it falls (v² like the south
      // sheet's flare).
      const outAt = (v: number): number => xWall + dir * (w + s * 0.09 * v * v);
      const body = new Path2D();
      body.moveTo(xWall, yT);
      body.lineTo(outAt(0), yT);
      body.quadraticCurveTo(outAt(0.55), yT + H * 0.55, outAt(1), yLand);
      body.lineTo(xWall, yLand);
      body.closePath();
      ctx.save();
      ctx.clip(body);
      // Two opaque lanes: the glassy inner sheet against the rim,
      // and the air-charged outer margin that WIDENS as it falls —
      // the flat-vector aeration read, edge-on.
      ctx.fillStyle = tones.band[1]!;
      ctx.fillRect(Math.min(xWall, outAt(1)) - 2, yT, Math.abs(outAt(1) - xWall) + 4, H + 2);
      const laneAt = (v: number): number => xWall + dir * w * (0.62 - 0.24 * v);
      ctx.fillStyle = tones.bandLow[2]!;
      ctx.beginPath();
      ctx.moveTo(laneAt(0), yT);
      ctx.lineTo(outAt(0) + dir * 2, yT);
      ctx.quadraticCurveTo(outAt(0.55) + dir * 2, yT + H * 0.55, outAt(1) + dir * 2, yLand);
      ctx.lineTo(laneAt(1), yLand);
      ctx.quadraticCurveTo(laneAt(0.5), yT + H * 0.5, laneAt(0), yT);
      ctx.closePath();
      ctx.fill();
      // A hard aeration step in the lower third — the lane tone
      // switches once, world-keyed, never a fade.
      const stepV = 0.6 + 0.18 * n01(Math.round(r0 * 3), 143);
      ctx.fillStyle = tones.bandLow[1]!;
      ctx.fillRect(
        Math.min(xWall, outAt(1)) - 2,
        yT + H * stepV,
        Math.abs(outAt(1) - xWall) + 4,
        H * 0.14,
      );
      // Scroll threads — bolder foam ropes at constant screen speed.
      const vSpeed = 3.1 / (ELEV_H * levels);
      ctx.lineCap = 'round';
      const cols = fine ? 3 : 2;
      for (let c = 0; c < cols; c++) {
        for (let k = 0; k < 2; k++) {
          const idx = Math.round(x * 7 + r0 * 3) * 5 + c * 2 + k;
          const ph = (t * vSpeed * (0.85 + 0.3 * n01(idx, 40)) + n01(idx, 50)) % 1;
          const v0 = Math.pow(ph, 1.35);
          const v1 = Math.min(1.02, v0 + 0.12 + 0.24 * v0);
          const xx =
            xWall +
            dir * w * ((c + 0.5) / cols) +
            Math.sin(t * 1.5 + c * 2.1 + r0 * 3) * s * 0.008;
          ctx.strokeStyle = tones.foam;
          ctx.globalAlpha = (0.42 + 0.5 * v0) * tones.dim;
          ctx.lineWidth = Math.max(1.6, s * (0.04 + 0.022 * n01(idx, 60)));
          ctx.beginPath();
          ctx.moveTo(xx, yT + H * v0);
          ctx.lineTo(xx, yT + H * v1);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      ctx.restore();
      // THE RIM CURL, edge-on: the crest roll seen down its length —
      // a bright lit rail standing on the rim with one ink seam
      // just inside it (the same convex read as the south roll).
      ctx.fillStyle = tones.rollLit;
      ctx.fillRect(
        nx >= 0 ? xWall - 1 : xWall - Math.max(3, s * 0.08) + 1,
        yT,
        Math.max(3, s * 0.08),
        H,
      );
      ctx.fillStyle = tones.crest;
      ctx.globalAlpha = (0.85 + 0.15 * Math.sin(t * 2.1 + r0)) * tones.dim;
      ctx.fillRect(
        nx >= 0 ? xWall - 1 : xWall - Math.max(2, s * 0.04) + 1,
        yT,
        Math.max(2, s * 0.04),
        H,
      );
      ctx.globalAlpha = 1;
      ctx.strokeStyle = tones.rollInk;
      ctx.lineWidth = Math.max(1.2, s * 0.032);
      ctx.beginPath();
      ctx.moveTo(xWall + dir * Math.max(3.5, s * 0.1), yT);
      ctx.lineTo(xWall + dir * Math.max(3.5, s * 0.1), yLand);
      ctx.stroke();
      // Ink the whole silhouette — the ribbon must separate from
      // the drawn water above AND the pool below, or it melts.
      ctx.strokeStyle = tones.rollInk;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = Math.max(1.2, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(outAt(0), yT);
      ctx.quadraticCurveTo(outAt(0.55), yT + H * 0.55, outAt(1), yLand);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(xWall, yT);
      ctx.lineTo(outAt(0), yT);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // The landing: surge clusters riding the vertical foot line,
      // bulging OUTWARD (screen-horizontal — the low side), confined
      // to the drawn plunge water.
      ctx.save();
      if (land) clipFallRegion(rend, land, landLift);
      const yFootTop = Math.round(A.y - landLift * rend.camera.depthScale(r0)); // B-3 spanning warp
      for (let yy = yFootTop; yy < yLand + s * 0.06; yy += s * 0.2) {
        const idx = Math.round(yy / (s * 0.2));
        const pulse = 0.5 + 0.5 * Math.sin(t * (2.2 + 0.6 * n01(idx, 74)) + idx * 1.9);
        const base = s * (0.05 + 0.05 * n01(idx, 75)) * (0.75 + 0.4 * pulse);
        const cy = yy + Math.sin(t * 2.4 + idx) * s * 0.02;
        ctx.fillStyle = `${tones.churnBack}${0.5 * tones.dim})`;
        ctx.beginPath();
        ctx.ellipse(
          xWall + dir * w * 0.45,
          cy,
          Math.max(1, base * 1.4),
          Math.max(1, base * 0.9),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = tones.foam;
        ctx.globalAlpha = 0.85 * tones.dim;
        for (let c = 0; c < 2; c++) {
          const rx = base * (1 - c * 0.3);
          ctx.beginPath();
          ctx.ellipse(
            xWall + dir * (w * 0.55 + c * base * 0.8 + (n01(idx * 2 + c, 76) - 0.5) * base),
            cy - c * base * 0.4,
            Math.max(1, rx),
            Math.max(1, rx * 0.66),
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },
  };
}

/**
 * A side fall's flat-ground dressing: the crown headrace running
 * sideways into the rim line, the outwash fanning across the low
 * ground, pool rings and the mist veil. Sorts after every crown and
 * landing row blit it can touch ((r1-1)+0.03 beats rowTy-0.01).
 */
export function fallSideDressItem(rend: PaintHost, 
  game: ClientGame,
  x: number,
  r0: number,
  r1: number,
  nx: number,
  level: number,
  info: SpillInfo,
  mouth: Path2D | null,
  land: Path2D | null,
  apron: Path2D | null,
): DrawItem {
  const s = rend.camera.scale;
  const topLift = level * ELEV_H * s;
  const landLift = info.landElev * ELEV_H * s;
  const dir = nx >= 0 ? 1 : -1;
  // The side dressing spans from the feed tongue at the top lift
  // down the corner pocket to the landing — one box, both lifts.
  const pS0 = rend.camera.worldToScreen(x - info.race - 2.2, r0 - 1.2, rend.w, rend.h);
  const pS1 = rend.camera.worldToScreen(x + info.race + 2.2, r1 + 1.8, rend.w, rend.h);
  return {
    strat: info.landElev !== 0 ? info.landElev : undefined,
    sortY: r1 - 1 + 0.03,
    pb: { x: pS0.x, y: pS0.y - topLift, w: pS1.x - pS0.x, h: pS1.y - pS0.y + (topLift - landLift) },
    draw: () => {
      const ctx = rend.ctx; // draw-time: the scratch lane swaps it
      const t = performance.now() / 1000;
      const tones = fallTones(rend, );
      const vn = (v: number, salt: number, ks: number) =>
        fallNoise(v, salt, level, ks);
      const n01 = (a: number, sa: number) => stone01(a, sa, 911 + level * 17);
      const wtsT = (wx: number, wy: number) => {
        const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
        p.y -= topLift * rend.camera.depthScale(wy); // B-3 spanning warp
        return p;
      };
      const wtsL = (wx: number, wy: number) => {
        const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
        p.y -= landLift * rend.camera.depthScale(wy); // B-3 spanning warp
        return p;
      };
      // Headrace: the sideways tongue from the feed to the rim line
      // — full fill clipped to the organic mouth region (THE MOUTH
      // LAW), so its banks continue the channel's drawn shoreline.
      const feedX = x - dir * (info.race + 0.15);
      ctx.save();
      if (mouth) clipFallRegion(rend, mouth, topLift);
      const pF = wtsT(feedX, r0 - 0.3);
      const pR = wtsT(x + dir * 0.12, r1 + 0.3);
      // The channel's own water carried solid to the rim — one body
      // with the baked feed (no navy-pit gradient).
      ctx.fillStyle = tones.race;
      ctx.fillRect(
        Math.min(pF.x, pR.x),
        Math.min(pF.y, pR.y),
        Math.abs(pR.x - pF.x),
        Math.abs(pR.y - pF.y),
      );
      // The acceleration shelf: the last stretch before the rim
      // pales one hard step, wavy world-keyed edge (never a fade).
      {
        ctx.beginPath();
        const SH = Math.max(3, Math.ceil((r1 - r0 + 0.6) / 0.15));
        for (let k = 0; k <= SH; k++) {
          const wy = r0 - 0.3 + (r1 + 0.3 - (r0 - 0.3)) * (k / SH);
          const wx = x - dir * (0.45 + (vn(wy, 160, 0.4) - 0.5) * 0.16);
          const p = wtsT(wx, wy);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        const pEnd = wtsT(x + dir * 0.12, r1 + 0.3);
        const pStart = wtsT(x + dir * 0.12, r0 - 0.3);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.lineTo(pStart.x, pStart.y);
        ctx.closePath();
        ctx.fillStyle = tones.shelf;
        ctx.fill();
      }
      // Shear lines where the current pulls off the banks.
      ctx.strokeStyle = tones.raceDeep;
      ctx.globalAlpha = 0.22 * tones.dim;
      ctx.lineWidth = Math.max(1.2, s * 0.03);
      const RS = Math.max(3, Math.ceil(info.race * 3));
      for (const [ey, salt] of [
        [r0, 21],
        [r1, 22],
      ] as const) {
        ctx.beginPath();
        for (let k = 0; k <= RS; k++) {
          const wx = feedX + (k / RS) * (x - feedX);
          const inset = 0.09 + (vn(wx, salt, 0.9) - 0.5) * 0.06;
          const p = wtsT(wx, ey === r0 ? r0 + inset : r1 - inset);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      // Flow threads accelerating into the rim.
      ctx.strokeStyle = tones.foam;
      ctx.lineCap = 'round';
      for (let wy = r0 + 0.25; wy < r1 - 0.1; wy += 0.3) {
        const idx = Math.round(wy / 0.3);
        const ph = (t * 1.5 * (0.8 + 0.4 * n01(idx, 31)) + n01(idx, 32)) % 1;
        const px0 = feedX + Math.pow(ph, 1.6) * (x - feedX);
        const px1 = px0 + (x - px0) * Math.min(1, 0.25 + ph * 0.3);
        const p0 = wtsT(px0, wy);
        const p1 = wtsT(px1, wy);
        ctx.globalAlpha = (0.18 + 0.32 * ph) * tones.dim;
        ctx.lineWidth = Math.max(1.2, s * 0.028);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      ctx.restore();
      // The faint free mist — air overhangs the banks.
      const pmF = wtsL(x + dir * 0.25, (r0 + r1) / 2);
      const rxF = ((r1 - r0) * 0.3 + 0.25) * s;
      const rgF = ctx.createRadialGradient(pmF.x, pmF.y, 0, pmF.x, pmF.y, rxF);
      rgF.addColorStop(0, `rgba(238,246,253,${0.07 * tones.dim})`);
      rgF.addColorStop(1, 'rgba(238,246,253,0)');
      ctx.save();
      ctx.translate(pmF.x, pmF.y);
      ctx.scale(1, 0.7);
      ctx.translate(-pmF.x, -pmF.y);
      ctx.fillStyle = rgF;
      ctx.fillRect(pmF.x - rxF, pmF.y - rxF, rxF * 2, rxF * 2);
      ctx.restore();
      // The fan clips to the outwash corridor (organic banks fused
      // into the plunge water's drawn shoreline).
      ctx.save();
      if (apron) clipFallRegion(rend, apron, landLift);
      // Outwash fan across the low ground.
      const fanEnd = x + dir * (info.drop + 1.2);
      ctx.beginPath();
      const FS = 4;
      for (let k = 0; k <= FS; k++) {
        const wx = x + ((fanEnd - x) * k) / FS;
        const u = k / FS;
        const spread = 0.1 + 0.2 * u + (vn(wx, 27, 0.7) - 0.5) * 0.1;
        const p = wtsL(wx, r0 - spread);
        ctx.lineTo(p.x, p.y);
      }
      for (let k = FS; k >= 0; k--) {
        const wx = x + ((fanEnd - x) * k) / FS;
        const u = k / FS;
        const spread = 0.1 + 0.2 * u + (vn(wx, 28, 0.7) - 0.5) * 0.1;
        const p = wtsL(wx, r1 + spread);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      const pI = wtsL(x, (r0 + r1) / 2);
      const pE = wtsL(fanEnd, (r0 + r1) / 2);
      const gw = ctx.createLinearGradient(pI.x, 0, pE.x, 0);
      gw.addColorStop(0, `${tones.wash}${0.42 * tones.dim})`);
      gw.addColorStop(1, `${tones.wash}${0.04 * tones.dim})`);
      ctx.fillStyle = gw;
      ctx.fill();
      ctx.restore();
      // Rings and the strong veil live ON the plunge water — they
      // clip to the drawn water region proper.
      ctx.save();
      if (land) clipFallRegion(rend, land, landLift);
      // Pool rings — THE FLAT LAW, broken arcs SCATTERED across the
      // outwash (a shared centre nests them into a soap-bubble
      // stack; each ring gets its own spot, keyed by row AND pass).
      for (let wy = r0 + 0.2; wy < r1 + 0.2; wy += 0.45) {
        const idx = Math.round(wy / 0.45);
        for (let k = 0; k < 2; k++) {
          const ph = (t * 0.5 + k * 0.41 + n01(idx, 80 + k)) % 1;
          const rx = (0.08 + ph * 0.4) * s;
          const p = wtsL(
            x + dir * (0.5 + info.drop * 0.4 + n01(idx * 2 + k, 83) * 1.4),
            wy + (n01(idx, 84 + k) - 0.5) * 0.4,
          );
          const a0 = n01(idx, 85 + k) * Math.PI * 2;
          const span = Math.PI * (0.7 + 0.9 * n01(idx, 86 + k));
          ctx.strokeStyle = tones.foam;
          ctx.globalAlpha = (1 - ph) * 0.32 * tones.dim;
          ctx.lineWidth = Math.max(1.2, s * 0.028);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rx, rx * 0.6, 0, a0, a0 + span);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // A restrained mist veil, confined to the water it rises from.
      const pm = wtsL(x + dir * 0.25, (r0 + r1) / 2);
      const rx = ((r1 - r0) * 0.4 + 0.4) * s;
      const rg = ctx.createRadialGradient(pm.x, pm.y, 0, pm.x, pm.y, rx);
      rg.addColorStop(0, `rgba(238,246,253,${0.09 * tones.dim})`);
      rg.addColorStop(1, 'rgba(238,246,253,0)');
      ctx.save();
      ctx.translate(pm.x, pm.y);
      ctx.scale(1, 0.7);
      ctx.translate(-pm.x, -pm.y);
      ctx.fillStyle = rg;
      ctx.fillRect(pm.x - rx, pm.y - rx, rx * 2, rx * 2);
      ctx.restore();
      ctx.restore();
      const wet = (wx: number, wy: number): boolean =>
        game.world.elevAt(Math.floor(wx), Math.floor(wy)) === info.landElev &&
        isFallWater(game.world.groundAt(Math.floor(wx), Math.floor(wy)));
      emitFallHaze(rend, 
        x + dir * (info.drop * 0.6 + 0.3),
        r0 + 0.15,
        x + dir * (info.drop * 0.6 + 0.3),
        r1 - 0.15,
        wet,
      );
    },
  };
}

/**
 * NORTH falls: the face looks away from the camera, so the visible
 * story is the crown — the race running away toward the edge, the
 * boil at the silhouette, the peeking top of the hidden sheet — and
 * beyond the ridge, the far basin's churn (occluded by the lifted
 * crown exactly where it should be) plus a rising plume. Diagonal
 * back-bevels are skipped: the flanking cardinal faces carry them.
 */
export function pushNorthFallItems(rend: PaintHost, 
  game: ClientGame,
  items: DrawItem[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  level: number,
): void {
  if (Math.abs(nx) > 0.01) return;
  if (ax > bx) {
    [ax, bx] = [bx, ax];
    [ay, by] = [by, ay];
  }
  const mx = (ax + bx) / 2;
  const iA = fallAt(rend, game, (ax + mx) / 2, ay, nx, ny, level);
  const iB = fallAt(rend, game, (mx + bx) / 2, ay, nx, ny, level);
  if (!iA && !iB) return;
  const x0 = iA ? ax : mx;
  const x1 = iB ? bx : mx;
  const info: SpillInfo =
    iA && iB
      ? {
          race: Math.min(iA.race, iB.race),
          drop: Math.min(iA.drop, iB.drop),
          landElev: Math.min(iA.landElev, iB.landElev),
        }
      : (iA ?? iB)!;
  const [runA, runB] = fallRunColsX(rend, game, Math.floor(mx), ay, nx, ny, level);
  const mouth = mouthClipFor(rend, game, level, 'x', runA, runB, ay, 1);
  const land = landClipFor(rend, 
    game,
    info.landElev,
    runA - 3,
    runB + 4,
    ay - FALL_LOOKAHEAD - 4,
    ay + 1,
  );
  items.push(northFallRaceItem(rend, x0, x1, ay, level, info, mouth));
  items.push(northFallChurnItem(rend, game, x0, x1, ay, level, info, land));
}

/** The crown half of a north fall: race away to the edge + the boil
 *  line at the silhouette. Sorts after every crown row it crosses. */
export function northFallRaceItem(rend: PaintHost, 
  x0: number,
  x1: number,
  yEdge: number,
  level: number,
  info: SpillInfo,
  mouth: Path2D | null,
): DrawItem {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const topLift = level * ELEV_H * s;
  return {
    // The race runs ON the crown — it rides the crown's shelf.
    strat: level !== 0 ? level : undefined,
    sortY: yEdge + info.race - 1 + 0.02,
    draw: () => {
      const t = performance.now() / 1000;
      const tones = fallTones(rend, );
      const fine = s >= 26;
      const vn = (v: number, salt: number, ks: number) =>
        fallNoise(v, salt, level, ks);
      const n01 = (a: number, sa: number) => stone01(a, sa, 911 + level * 17);
      const wtsT = (wx: number, wy: number) => {
        const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
        p.y -= topLift * rend.camera.depthScale(wy); // B-3 spanning warp
        return p;
      };
      // The race, flowing AWAY (north) to the edge — full-width fill
      // clipped to the organic mouth region (THE MOUTH LAW: the
      // channel's drawn banks carry through the rim strip).
      const raceEnd = yEdge + info.race + 0.15;
      ctx.save();
      if (mouth) clipFallRegion(rend, mouth, topLift);
      const pTL = wtsT(x0 - 0.3, yEdge);
      const pBR = wtsT(x1 + 0.3, raceEnd);
      // Solid channel water to the silhouette — one body with the
      // baked feed (no navy-pit gradient).
      ctx.fillStyle = tones.race;
      ctx.fillRect(pTL.x, pTL.y, pBR.x - pTL.x, pBR.y - pTL.y);
      // The acceleration shelf at the edge: one pale hard step with
      // a wavy world-keyed boundary as the water thins over the lip.
      {
        ctx.beginPath();
        const SH = Math.max(3, Math.ceil((x1 - x0 + 0.6) / 0.15));
        for (let k = 0; k <= SH; k++) {
          const wx = x0 - 0.3 + (x1 + 0.3 - (x0 - 0.3)) * (k / SH);
          const wy = yEdge + 0.42 + (vn(wx, 160, 0.4) - 0.5) * 0.16;
          const p = wtsT(wx, wy);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(pBR.x, pTL.y);
        ctx.lineTo(pTL.x, pTL.y);
        ctx.closePath();
        ctx.fillStyle = tones.shelf;
        ctx.fill();
      }
      // Shear lines where the current pulls off the banks.
      ctx.strokeStyle = tones.raceDeep;
      ctx.globalAlpha = 0.22 * tones.dim;
      ctx.lineWidth = Math.max(1.2, s * 0.03);
      const RS = Math.max(3, Math.ceil(info.race * 3));
      for (const [ex, salt] of [
        [x0, 21],
        [x1, 22],
      ] as const) {
        ctx.beginPath();
        for (let k = 0; k <= RS; k++) {
          const wy = raceEnd - (k / RS) * (raceEnd - yEdge);
          const inset = 0.09 + (vn(wy, salt, 0.9) - 0.5) * 0.06;
          const p = wtsT(ex === x0 ? x0 + inset : x1 - inset, wy);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      // Flow threads accelerating toward the drop.
      ctx.strokeStyle = tones.foam;
      ctx.lineCap = 'round';
      for (let wx = Math.ceil((x0 + 0.08) / 0.3) * 0.3; wx < x1 - 0.05; wx += 0.3) {
        const idx = Math.round(wx / 0.3);
        const ph = (t * 1.5 * (0.8 + 0.4 * n01(idx, 31)) + n01(idx, 32)) % 1;
        const wy0 = raceEnd - Math.pow(ph, 1.6) * (raceEnd - yEdge);
        const wy1 = Math.max(yEdge, wy0 - 0.12 - 0.2 * ph);
        const p0 = wtsT(wx, wy0);
        const p1 = wtsT(wx, wy1);
        ctx.globalAlpha = (0.18 + 0.32 * ph) * tones.dim;
        ctx.lineWidth = Math.max(1.2, s * 0.028);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      ctx.restore();
      // The curl at the silhouette: the BACK of the crest roll
      // peeking over the ridge — a lit convex band with a scalloped
      // upper edge (world-keyed), then the bright arris line.
      const pE0 = wtsT(x0, yEdge);
      const pE1 = wtsT(x1, yEdge);
      ctx.fillStyle = tones.rollLit;
      ctx.beginPath();
      {
        const NSc = Math.max(3, Math.ceil((x1 - x0) / 0.16));
        for (let k = 0; k <= NSc; k++) {
          const f = k / NSc;
          const wx = x0 + (x1 - x0) * f;
          const i = Math.round(wx / 0.16);
          const p = wtsT(wx, yEdge);
          const y =
            p.y -
            s * (0.05 + 0.05 * n01(i, 150)) +
            Math.sin(t * 2.2 + i * 1.7) * s * 0.01;
          if (k === 0) ctx.moveTo(p.x, y);
          else ctx.lineTo(p.x, y);
        }
        ctx.lineTo(pE1.x, pE1.y + s * 0.03);
        ctx.lineTo(pE0.x, pE0.y + s * 0.03);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = tones.crest;
      ctx.globalAlpha = 0.85 * tones.dim;
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(pE0.x, pE0.y - s * 0.015);
      ctx.lineTo(pE1.x, pE1.y - s * 0.015);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (fine) {
        ctx.fillStyle = tones.foam;
        for (let wx = Math.ceil(x0 / 0.28) * 0.28; wx < x1; wx += 0.28) {
          const idx = Math.round(wx / 0.28);
          const p = wtsT(wx, yEdge);
          ctx.globalAlpha =
            (0.35 + 0.45 * n01(idx, 92)) *
            (0.6 + 0.4 * Math.sin(t * 4.1 + idx * 2.7)) *
            tones.dim;
          const rr = s * (0.03 + 0.03 * n01(idx, 93));
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - s * 0.03, rr * 1.5, rr, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // The plume rising from behind the ridge (overlay pass).
      if (rend.waterFxFull && Math.random() < rend.frameDt * 2.6 * (x1 - x0)) {
        rend.particles.burst(
          x0 + Math.random() * (x1 - x0),
          yEdge - 0.3 - Math.random() * Math.max(0.4, info.drop),
          1,
          ['#dcebf7', '#cfe3f4'],
          {
            speed: 0.35,
            life: 1.6,
            size: 0.055,
            up: true,
            gravity: -0.3,
            drag: 1.0,
            grow: 0.12,
            shape: 'mote',
          },
        );
      }
    },
  };
}

/** The far-basin half of a north fall: churn, rings and a small
 *  veil at the landing, sorted to draw BEFORE the lifted crown rows
 *  so the ridge occludes it exactly where it should. */
export function northFallChurnItem(rend: PaintHost, 
  game: ClientGame,
  x0: number,
  x1: number,
  yEdge: number,
  level: number,
  info: SpillInfo,
  land: Path2D | null,
): DrawItem {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const landLift = info.landElev * ELEV_H * s;
  const impactY = yEdge - info.drop - 0.45;
  return {
    strat: info.landElev !== 0 ? info.landElev : undefined,
    sortY: yEdge - 1 + 0.001,
    draw: () => {
      const t = performance.now() / 1000;
      const tones = fallTones(rend, );
      const n01 = (a: number, sa: number) => stone01(a, sa, 911 + level * 17);
      const wts = (wx: number, wy: number) => {
        const p = rend.camera.worldToScreen(wx, wy, rend.w, rend.h);
        p.y -= landLift * rend.camera.depthScale(wy); // B-3 spanning warp
        return p;
      };
      // A faint free mist first — air overhangs the banks.
      const pmF = wts((x0 + x1) / 2, impactY);
      const rxF = ((x1 - x0) * 0.35 + 0.25) * s;
      const rgF = ctx.createRadialGradient(pmF.x, pmF.y, 0, pmF.x, pmF.y, rxF);
      rgF.addColorStop(0, `rgba(238,246,253,${0.07 * tones.dim})`);
      rgF.addColorStop(1, 'rgba(238,246,253,0)');
      ctx.save();
      ctx.translate(pmF.x, pmF.y);
      ctx.scale(1, 0.6);
      ctx.translate(-pmF.x, -pmF.y);
      ctx.fillStyle = rgF;
      ctx.fillRect(pmF.x - rxF, pmF.y - rxF, rxF * 2, rxF * 2);
      ctx.restore();
      // Everything living on the basin's surface clips to the drawn
      // water — churn, rings and the strong veil end at the shore.
      ctx.save();
      if (land) clipFallRegion(rend, land, landLift);
      drawFallChurn(rend, x0, impactY, x1, impactY, 0, -1, landLift, level, t, tones);
      for (let wx = Math.ceil((x0 + 0.15) / 0.55) * 0.55; wx < x1; wx += 0.55) {
        const idx = Math.round(wx / 0.55);
        for (let k = 0; k < 2; k++) {
          const ph = (t * 0.5 + k * 0.41 + n01(idx, 80 + k)) % 1;
          const rx = (0.1 + ph * 0.5) * s;
          const p = wts(
            wx + (n01(idx, 83 + k) - 0.5) * 0.3,
            impactY - 0.25 + (n01(idx, 84 + k) - 0.5) * 0.25,
          );
          const a0 = n01(idx, 85 + k) * Math.PI * 2;
          const span = Math.PI * (0.7 + 0.9 * n01(idx, 86 + k));
          ctx.strokeStyle = tones.foam;
          ctx.globalAlpha = (1 - ph) * 0.38 * tones.dim;
          ctx.lineWidth = Math.max(1.2, s * 0.028);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rx, rx * 0.6, 0, a0, a0 + span);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      const pm = wts((x0 + x1) / 2, impactY);
      const rx = ((x1 - x0) * 0.6 + 0.4) * s;
      const rg = ctx.createRadialGradient(pm.x, pm.y, 0, pm.x, pm.y, rx);
      rg.addColorStop(0, `rgba(238,246,253,${0.13 * tones.dim})`);
      rg.addColorStop(1, 'rgba(238,246,253,0)');
      ctx.save();
      ctx.translate(pm.x, pm.y);
      ctx.scale(1, 0.6);
      ctx.translate(-pm.x, -pm.y);
      ctx.fillStyle = rg;
      ctx.fillRect(pm.x - rx, pm.y - rx, rx * 2, rx * 2);
      ctx.restore();
      ctx.restore();
    },
  };
}
