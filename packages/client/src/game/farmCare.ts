import { Tile } from '@arx/shared';
import { CROP_TILES, MATURE_TILES, gradeFor, type Grade } from '@arx/content';

/**
 * THE ONE CARE MIRROR, client side (farming v2 Phase 1).
 *
 * Server truth arrives on S2CFarm (whole at login, deltas on change)
 * and lands in these module maps; the terrain bake, the renderer's
 * live passes, the interact prompts, and the compost panel all read
 * one store. Module-level on purpose — the bake path reads it without
 * threading a sampler through every call chain, exactly the
 * GrassSystem precedent.
 */

export interface PlotCare {
  /** Watered bitmask (bit per stage + the prune bit), the row's own. */
  w: number;
  /** Soil tier 0 plain / 1 enriched / 2 rich. */
  soil: number;
  /** 1 when mulched. */
  m: number;
  /** 1 when grown under a growing frame (Phase 2). */
  f: number;
  /**
   * Derived: is the CURRENT stage watered? Kept resolved here (from
   * tile + mask) so the bake never does stage math per tile.
   */
  wet: boolean;
}

export interface BinCare {
  fill: number;
  graded: number;
  /** Epoch ms the working batch completes; 0 = gathering scraps. */
  readyAt: number;
}

export const farmPlots = new Map<string, PlotCare>();
export const farmBins = new Map<string, BinCare>();
/** THE ANIMALS OF THE YARD: trough feed by "tx,ty". */
export const farmTroughs = new Map<string, { feed: number }>();

export function farmKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

/** A crop tile's stage, or null for anything that is not a crop. */
export function stageOfTile(tile: Tile | undefined): 0 | 1 | 2 | null {
  if (tile === undefined) return null;
  if (tile === Tile.CropSprout || tile === Tile.MushroomLogSeeded) return 0;
  const info = CROP_TILES.get(tile);
  return info ? info.stage : null;
}

/** Re-derive `wet` after the mask or the tile changes. */
export function refreshWet(tx: number, ty: number, tile: Tile | undefined): void {
  const care = farmPlots.get(farmKey(tx, ty));
  if (!care) return;
  const stage = stageOfTile(tile);
  care.wet = stage !== null && stage < 2 && (care.w & (1 << stage)) !== 0;
}

/**
 * Standing wells, tracked from chunk streams and tile patches so the
 * terrain bake (which sees only EFFECTIVE ground — stations remap to
 * their floor) can still answer "is a well near". Wells are rare, so
 * membership walks the set instead of scanning ground.
 */
export const wellTiles = new Set<string>();

export function noteWellTile(tx: number, ty: number, prev: number | undefined, next: number): void {
  if (prev === Tile.Well) wellTiles.delete(farmKey(tx, ty));
  if (next === Tile.Well) wellTiles.add(farmKey(tx, ty));
}

/** Is a well within range (chebyshev) of this tile? */
export function wellNearClient(tx: number, ty: number, range: number): boolean {
  for (const key of wellTiles) {
    const comma = key.indexOf(',');
    const wx = Number(key.slice(0, comma));
    const wy = Number(key.slice(comma + 1));
    if (Math.abs(wx - tx) <= range && Math.abs(wy - ty) <= range) return true;
  }
  return false;
}

/**
 * The grade this plot would earn if harvested now — the client's own
 * run of THE CARE FOLD (the shared pure function; same facts in, same
 * grade out as the server will decide). Drives the ripe sparkle and
 * nothing else; the server's fold at harvest is the truth.
 */
export function predictedGrade(tile: Tile | undefined, tx: number, ty: number): Grade {
  if (tile === undefined || !MATURE_TILES.has(tile)) return 0;
  const care = farmPlots.get(farmKey(tx, ty));
  if (!care) return 0;
  return gradeFor((care.w & 1) + ((care.w >> 1) & 1), care.soil, care.m, (care.w >> 2) & 1);
}
