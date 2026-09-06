import { fbm, hashCoords } from '@arx/shared';

/**
 * THE WOOD LEARNS TO BREATHE — the forest placement law.
 *
 * Before this module a forest was one per-tile coin toss:
 * `roll < 0.10 + (moisture − 0.62) × 1.4`, every tile independent of
 * every other. Measured on the shipped seed that dealt 20% of every
 * forest-class tile as a trunk (28–40% in the damp cores) with 90–99%
 * of trunks touching another trunk — canopies three to five deep,
 * no floor to walk, no glade to see across, and the client painting
 * the same pixels five times over. White noise cannot make a wood:
 * real trees weed each other out, gather in copses, leave glades
 * where the light falls, and grow a floor of their own under the
 * crowns. Three layers now, each deterministic from (seed, tile):
 *
 *  1. THE STAND FIELD — a slow noise (wavelength ~20 tiles) plus a
 *     finer gap wobble decides WHERE a wood closes and where it opens
 *     into a glade. Damp cores close nearly everywhere; the fringe
 *     opens into copse-and-clearing country. Moisture still names
 *     the biome; the stand field composes it.
 *
 *  2. THE ELDERS — the canopy. One candidate trunk per lattice cell
 *     (jittered inside its cell, so no row ever reads), gated by the
 *     canopy cover, and then THE WEEDING: an adjacent candidate with
 *     more vigor kills this one. Two elders can never stand on
 *     touching tiles (proved in forest.test.ts), so every crown reads
 *     as its own tree while neighbouring crowns still meet overhead
 *     in a closed core — the natural wall without the clutter.
 *
 *  3. THE FLOOR — what grows between the elders, dealt by where the
 *     tile sits: under a crown (leaf litter, mushrooms, the odd
 *     suppressed sapling, a stump the weeding left, a standing snag
 *     in the old cores), in a canopy gap (bracken, young trees
 *     colonizing the light — succession, told in tiles), or out in a
 *     glade (flowers, tufts, a lone pioneer). The herb and chest
 *     deals of the old wood are untouched, so the forager's economy
 *     is unchanged tile for tile.
 *
 * The same lattice-and-weeding law seats the meadow's trees: instead
 * of a 1.5% coin on every tile (speckle), copses gather where the
 * stand field crests and lone sentinels stand where it doesn't.
 *
 * Dials live in FOREST_LAW; the census in docs/forest-plan.md pins
 * what each number bought.
 */

/** Moisture above which ground reads as forest (worldgen's line). */
export const FOREST_LINE = 0.62;

export const FOREST_LAW = {
  /** Elder lattice cell (tiles). One canopy candidate per cell. */
  elderCell: 2,
  /** Meadow copse lattice cell. */
  copseCell: 5,
  /** Highland (plateau meadow) lattice cell. */
  highlandCell: 4,
  /** Moisture span above FOREST_LINE over which a fringe becomes a core. */
  dampRamp: 0.33,
  /** Canopy cover (per-candidate stand chance) at a fringe / a core. */
  coverFringe: 0.75,
  coverCore: 1.0,
  /**
   * Where the stand field must sit for the wood to close. A fringe
   * opens into glades below `gladeFringe`; a core only below
   * `gladeCore`. Half-width of the soft edge in `gladeSoft`.
   */
  gladeFringe: 0.50,
  gladeCore: 0.30,
  gladeSoft: 0.09,
  /** Below this stand gate a forest tile is a GLADE (open sky). */
  gladeGate: 0.15,
  /** Meadow copse: cover at a copse heart, and the lone-sentinel floor. */
  copseCover: 0.62,
  copseFloor: 0.045,
  copseLow: 0.60,
  copseHigh: 0.74,
  /** Highland windswept scatter: per-candidate chance. */
  highlandCover: 0.30,
  /**
   * THE TALL CROWN: a pine spire stands 4.4–5.7 tiles and projects
   * north over everything behind it, so at broadleaf spacing a taiga
   * still reads as a wall. Where the cold runs (pine country) cover
   * thins by this much and the glade threshold rises by `coldGlade`
   * (taiga is a wood of clearings and bogs, not one closed dome).
   */
  coldThin: 0.5,
  coldGlade: 0.18,
};

/** Lattice salts — one per tree register so the deals never alias. */
export const ELDER_SALT = 0x5e1de7;
export const COPSE_SALT = 0xc0b5e;
export const HIGHLAND_SALT = 0x4197a;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/**
 * THE STAND FIELD: slow composition noise (0.05 → ~20-tile
 * wavelength, the scale of a copse and a clearing) with a finer
 * wobble so no glade is a smooth blob. 0..1, mass in the middle.
 */
export function standAt(seed: number, tx: number, ty: number): number {
  return (
    fbm(seed + 81913, tx * 0.05, ty * 0.05, 2) +
    (fbm(seed + 91517, tx * 0.16, ty * 0.16, 1) - 0.5) * 0.28
  );
}

/** 0 at the forest line, 1 once the wood is properly damp. */
export function dampOf(moisture: number): number {
  return clamp01((moisture - FOREST_LINE) / FOREST_LAW.dampRamp);
}

/**
 * THE STAND GATE: how closed the wood is at this tile, 0 (glade) to
 * 1 (closed). The glade threshold slides with damp: a fringe is
 * copse-and-clearing country, a core closes over nearly everything.
 */
export function standGateAt(
  seed: number,
  tx: number,
  ty: number,
  damp: number,
  cold = 0,
): number {
  const t =
    FOREST_LAW.gladeFringe -
    damp * (FOREST_LAW.gladeFringe - FOREST_LAW.gladeCore) +
    coldOf(cold) * FOREST_LAW.coldGlade;
  return smoothstep(t - FOREST_LAW.gladeSoft, t + FOREST_LAW.gladeSoft, standAt(seed, tx, ty));
}

/** 0 in the warm south, 1 once the pine takes the whole stand (cold ≥ 0.9). */
export function coldOf(cold: number): number {
  return smoothstep(0.5, 0.9, cold);
}

/** Canopy cover: the chance an elder candidate here takes root. */
export function canopyCoverAt(
  seed: number,
  tx: number,
  ty: number,
  moisture: number,
  cold = 0,
): number {
  if (moisture <= FOREST_LINE) return 0;
  const damp = dampOf(moisture);
  const gate = standGateAt(seed, tx, ty, damp, cold);
  return (
    gate *
    (FOREST_LAW.coverFringe + damp * (FOREST_LAW.coverCore - FOREST_LAW.coverFringe)) *
    (1 - coldOf(cold) * FOREST_LAW.coldThin)
  );
}

/** Meadow copse cover: copses where the stand field crests, else the sentinel floor. */
export function copseCoverAt(seed: number, tx: number, ty: number): number {
  const s = standAt(seed, tx, ty);
  return (
    FOREST_LAW.copseFloor +
    (FOREST_LAW.copseCover - FOREST_LAW.copseFloor) *
      smoothstep(FOREST_LAW.copseLow, FOREST_LAW.copseHigh, s)
  );
}

export interface LatticeCandidate {
  x: number;
  y: number;
  /** 0..1; LOWER is stronger (it clears more of the cover gate). */
  vigor: number;
}

/**
 * One candidate per cell, jittered inside it by hash. The vigor rides
 * bits the jitter never reads, so position and strength don't rhyme.
 */
export function latticeCandidate(
  seed: number,
  salt: number,
  cx: number,
  cy: number,
  cell: number,
): LatticeCandidate {
  const h = hashCoords(seed ^ salt, cx, cy);
  return {
    x: cx * cell + (h % cell),
    y: cy * cell + ((h >>> 5) % cell),
    vigor: (h >>> 10) / 4194304, // 22 bits
  };
}

/**
 * THE LATTICE AND THE WEEDING. True when a tree of this register
 * stands on (tx, ty): the tile must be its cell's candidate, the
 * candidate's vigor must clear the cover at its own tile, and no
 * TOUCHING candidate (8-neighbourhood) that also clears its cover may
 * be stronger. The rule is symmetric, so two standing trees can never
 * touch: of any touching pair, exactly the weaker dies. Purely local —
 * only the eight neighbouring cells are ever consulted.
 *
 * `coverAt` answers for ANY tile the law asks about (this one and the
 * touching candidates, all within two tiles), in world coordinates.
 */
export function latticeTreeAt(
  seed: number,
  salt: number,
  cell: number,
  tx: number,
  ty: number,
  coverAt: (wx: number, wy: number) => number,
): boolean {
  const cx = Math.floor(tx / cell);
  const cy = Math.floor(ty / cell);
  const me = latticeCandidate(seed, salt, cx, cy, cell);
  if (me.x !== tx || me.y !== ty) return false;
  if (me.vigor >= coverAt(tx, ty)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const n = latticeCandidate(seed, salt, cx + dx, cy + dy, cell);
      if (Math.abs(n.x - tx) > 1 || Math.abs(n.y - ty) > 1) continue;
      if (n.vigor < me.vigor && n.vigor < coverAt(n.x, n.y)) return false;
    }
  }
  return true;
}

/** Where a forest-floor tile sits relative to the canopy. */
export type FloorSeat = 'shade' | 'gap' | 'glade';

export function floorSeatOf(shaded: boolean, gate: number): FloorSeat {
  if (shaded) return 'shade';
  return gate < FOREST_LAW.gladeGate ? 'glade' : 'gap';
}

/**
 * THE FLOOR DEALS — per-seat cumulative chances on a fresh 0..1 roll.
 * Order matters (first match wins); everything not listed is plain
 * grass, which the detail deal below then dresses.
 */
export const FLOOR = {
  shade: { sapling: 0.012, tall: 0.042, rock: 0.048, stump: 0.054, snag: 0.057 },
  gap: { sapling: 0.030, tall: 0.100, rock: 0.104, stump: 0.104, snag: 0.106 },
  glade: { sapling: 0.006, tall: 0.056, rock: 0.058, stump: 0.058, snag: 0.058 },
} as const;

/** Stumps and snags belong to the old wood only — below this damp the weeding leaves no bones. */
export const OLD_WOOD_DAMP = 0.5;
