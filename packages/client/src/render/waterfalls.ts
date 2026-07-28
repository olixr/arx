import { Tile } from '@arx/shared';

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
    t === Tile.Water || t === Tile.WaterDeep || t === Tile.WaterShallow || t === Tile.FishingSpot
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
