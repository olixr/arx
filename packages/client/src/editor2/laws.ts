/**
 * THE VISIBLE LAWS — Map Studio v2 Phase 5. Pure readings of the zone
 * laws the save-time validator enforces, cheap enough to run under the
 * cursor and every frame: the stair predicate (verbatim from
 * ZoneBuilder.validateStairs, with its reasons), the auto-fence line
 * (every FENCEABLE tile with a lower 8-neighbor becomes Cliff at
 * save; a non-fenceable one REFUSES the save), and the ramp-gated
 * reachability flood. The validator remains the one gate — these are
 * its light thrown forward onto the bench.
 */

import { Tile, tileDef } from '@arx/shared';
import type { ZoneDef } from '@arx/content';

/** ZoneBuilder.FENCEABLE, mirrored (private there; keep in sync). */
export const FENCEABLE: ReadonlySet<number> = new Set([
  Tile.Grass,
  Tile.GrassTall,
  Tile.Dirt,
  Tile.Sand,
  Tile.Path,
  Tile.StoneFloor,
  Tile.CaveFloor,
]);

/** The doorway tiles THE DOOR-OPENS-ONTO-A-ROOM law inspects. */
export const DOORWAY_TILES: ReadonlySet<number> = new Set([
  Tile.DoorwayStone,
  Tile.DoorwayWood,
  Tile.DoorwayStoneWide,
  Tile.DoorwayWoodWide,
  Tile.DoorwayWoodShut,
  Tile.DoorwayWoodWideShut,
]);

/** Elevation level of a LOCAL tile; out-of-bounds reads flat 0. */
function levelAt(z: ZoneDef, x: number, y: number): number {
  if (!z.elev || x < 0 || y < 0 || x >= z.width || y >= z.height) return 0;
  return z.elev[y * z.width + x]!;
}

/**
 * The stairs law, verbatim from ZoneBuilder.validateStairs — null when
 * a Ramp may stand at (x,y), else WHY not (the status bar's words).
 */
export function stairLegalAt(z: ZoneDef, x: number, y: number): string | null {
  const lvl = levelAt(z, x, y);
  if (levelAt(z, x, y + 1) !== lvl - 1) {
    return 'needs its SOUTH neighbor exactly one level lower';
  }
  if (levelAt(z, x - 1, y) !== lvl || levelAt(z, x + 1, y) !== lvl) {
    return 'needs both e/w flanks at the stair level (they become the framing cliff)';
  }
  if (levelAt(z, x, y - 1) !== lvl) return 'needs its north neighbor at the stair level';
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx !== 0 || dy !== 0) && levelAt(z, x + dx, y - 1 + dy) < lvl) {
        return 'must top out on interior ground, not another rim';
      }
    }
  }
  if (levelAt(z, x - 1, y + 1) !== lvl - 1 || levelAt(z, x + 1, y + 1) !== lvl - 1) {
    return 'needs both mouth diagonals one level lower (straight edge, not a corner)';
  }
  if (levelAt(z, x - 1, y - 1) < lvl || levelAt(z, x + 1, y - 1) < lvl) {
    return 'needs both top diagonals at the stair level (straight crown, not a corner)';
  }
  return null;
}

export interface FenceCell {
  x: number;
  y: number;
  /** True = auto-fence paves it to Cliff at save; false = it REFUSES. */
  ok: boolean;
}

/**
 * THE FENCE LINE, LIVE: within a LOCAL rect, every tile with a lower
 * 8-neighbor (the high side of a boundary) that is not already solid
 * and not a stair. FENCEABLE ones become Cliff on save; the rest are
 * the exact cells the validator will name.
 */
export function fenceLine(z: ZoneDef, x0: number, y0: number, x1: number, y1: number): FenceCell[] {
  if (!z.elev) return [];
  const out: FenceCell[] = [];
  for (let y = Math.max(0, y0); y <= Math.min(z.height - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(z.width - 1, x1); x++) {
      const lvl = levelAt(z, x, y);
      let high = false;
      for (let dy = -1; dy <= 1 && !high; dy++) {
        for (let dx = -1; dx <= 1 && !high; dx++) {
          if ((dx !== 0 || dy !== 0) && levelAt(z, x + dx, y + dy) < lvl) high = true;
        }
      }
      if (!high) continue;
      const g = z.ground[y * z.width + x]!;
      if (g === Tile.Ramp || g === Tile.Cliff) continue;
      if (tileDef(g).solid) continue; // already a wall of its own
      out.push({ x, y, ok: FENCEABLE.has(g) });
    }
  }
  return out;
}

export interface ReachResult {
  /** LOCAL indices reachable from the spawn on foot. */
  reachable: Set<number>;
  /** Walkable but unreachable — the validator's complaint, mapped. */
  stranded: Set<number>;
  /** Where the flood started (local), or null without a spawn. */
  from: { x: number; y: number } | null;
}

/**
 * THE REACH: flood from the zone spawn, 4-way, walkable = non-solid,
 * crossing a level change ONLY through a Ramp on either side — the
 * validator's own crossing rule.
 */
export function reachability(z: ZoneDef): ReachResult {
  const reachable = new Set<number>();
  const stranded = new Set<number>();
  if (!z.spawn) return { reachable, stranded, from: null };
  const sx = Math.floor(z.spawn.x) - z.origin.x;
  const sy = Math.floor(z.spawn.y) - z.origin.y;
  if (sx < 0 || sy < 0 || sx >= z.width || sy >= z.height) {
    return { reachable, stranded, from: null };
  }
  const idx = (x: number, y: number): number => y * z.width + x;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height && !tileDef(z.ground[idx(x, y)]!).solid;
  const queue: Array<[number, number]> = [[sx, sy]];
  if (walkable(sx, sy)) reachable.add(idx(sx, sy));
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (reachable.has(ni)) continue;
      const la = levelAt(z, x, y);
      const lb = levelAt(z, nx, ny);
      if (la !== lb) {
        const ga = z.ground[idx(x, y)]!;
        const gb = z.ground[ni]!;
        if (ga !== Tile.Ramp && gb !== Tile.Ramp) continue;
      }
      reachable.add(ni);
      queue.push([nx, ny]);
    }
  }
  for (let y = 0; y < z.height; y++) {
    for (let x = 0; x < z.width; x++) {
      const i = idx(x, y);
      if (!tileDef(z.ground[i]!).solid && !reachable.has(i)) stranded.add(i);
    }
  }
  return { reachable, stranded, from: { x: sx, y: sy } };
}

/** THE SHELF (draw-order strat) of a tile: crowns ride shelf 0. */
export function shelfAt(z: ZoneDef, x: number, y: number): number {
  const lvl = levelAt(z, x, y);
  return lvl > 0 ? 0 : lvl;
}
