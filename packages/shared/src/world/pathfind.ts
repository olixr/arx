import { footprintBlocked, type CollisionSource } from './collision.js';
import type { Vec2 } from '../math/vec.js';

/**
 * THE CART HAS TWO FEET on the nav grid: a tile is closed to a path
 * when it is solid OR when it is the second foot of a two-foot prop
 * beside it (collision.ts footprintBlocked) — otherwise the planner
 * would lay a lane through the cart's shafts and the walk collider
 * would stop the body dead inside it, the stuck watchdog's exact
 * diet. Every solidity read in this file goes through here.
 */
function navSolid(world: CollisionSource, x: number, y: number): boolean {
  return world.isSolid(x, y) || footprintBlocked(world, x, y);
}

/** Outcome of a chase-grade nav query (findPathNav). */
export interface NavPathResult {
  /** True when the lane reaches the goal tile; false = best effort. */
  complete: boolean;
  /**
   * Tile-center waypoints, start excluded. On an incomplete search
   * this walks to the reachable tile NEAREST the goal — a pursuer
   * stalks to the fence line or the shut door instead of grinding
   * a wall face. Empty = nowhere better than where we stand.
   */
  path: Vec2[];
}

/** Octile distance — admissible for 8-way movement at 1/1.41 costs. */
function octile(x: number, y: number, tx: number, ty: number): number {
  const dx = Math.abs(x - tx);
  const dy = Math.abs(y - ty);
  return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
}

/** Pack a tile coord into one int Map key (coords stay within ±32k). */
function navKey(x: number, y: number): number {
  return (x + 0x8000) * 0x10000 + (y + 0x8000);
}

interface NavNode {
  x: number;
  y: number;
  g: number;
  f: number;
}

/** Min-f binary heap — the open set at chase scale without O(n) pops. */
class NavHeap {
  private readonly a: NavNode[] = [];
  get size(): number {
    return this.a.length;
  }
  push(n: NavNode): void {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.f <= a[i]!.f) break;
      const t = a[p]!;
      a[p] = a[i]!;
      a[i] = t;
      i = p;
    }
  }
  pop(): NavNode | undefined {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0 && last !== undefined) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]!.f < a[m]!.f) m = l;
        if (r < a.length && a[r]!.f < a[m]!.f) m = r;
        if (m === i) break;
        const t = a[m]!;
        a[m] = a[i]!;
        a[i] = t;
        i = m;
      }
    }
    return top;
  }
}

/**
 * Chase-grade A* over the tile grid: 8-way, corner-cutting forbidden
 * (safe for bodies up to ~0.9 tiles wide walking tile centers).
 *
 * Differences from findPath, all in service of a live pursuer:
 * - BOUNDED: only tiles within `bounds.r` of (bounds.cx, bounds.cy)
 *   are expanded — a leashed chase never floods the map, and "no
 *   path" is decided inside the region the body may walk anyway.
 * - GOAL SNAP: a goal on a solid tile (a body pinned in a collider
 *   tile's open corner) redirects to the nearest walkable tile in a
 *   2-ring around it instead of failing outright.
 * - BEST EFFORT: exhausting the region or the expansion budget
 *   returns the lane to the reachable tile nearest the goal, flagged
 *   `complete: false` — the caller keeps walking somewhere USEFUL
 *   and its own stall ladder owns giving up.
 */
export function findPathNav(
  world: CollisionSource,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  bounds: { cx: number; cy: number; r: number },
  maxExpansions = 1500,
): NavPathResult {
  const sx = Math.floor(fromX);
  const sy = Math.floor(fromY);
  let tx = Math.floor(toX);
  let ty = Math.floor(toY);

  // Goal snap: hunt the rings around a solid goal tile for the
  // walkable tile closest to the true goal point.
  if (navSolid(world, tx, ty)) {
    let bestD = Infinity;
    let bx = tx;
    let by = ty;
    for (let r = 1; r <= 2 && bestD === Infinity; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = tx + dx;
          const ny = ty + dy;
          if (navSolid(world, nx, ny)) continue;
          const d = Math.hypot(nx + 0.5 - toX, ny + 0.5 - toY);
          if (d < bestD) {
            bestD = d;
            bx = nx;
            by = ny;
          }
        }
      }
    }
    if (bestD === Infinity) return { complete: false, path: [] };
    tx = bx;
    ty = by;
  }
  if (sx === tx && sy === ty) return { complete: true, path: [] };

  const r2 = bounds.r * bounds.r;
  const inBounds = (x: number, y: number): boolean => {
    const dx = x + 0.5 - bounds.cx;
    const dy = y + 0.5 - bounds.cy;
    return dx * dx + dy * dy <= r2;
  };

  const open = new NavHeap();
  const gScore = new Map<number, number>([[navKey(sx, sy), 0]]);
  const cameFrom = new Map<number, number>();
  open.push({ x: sx, y: sy, g: 0, f: octile(sx, sy, tx, ty) });

  // The consolation prize: closest expanded tile to the goal.
  let bestKey = navKey(sx, sy);
  let bestH = octile(sx, sy, tx, ty);

  const rebuild = (endKey: number, complete: boolean): NavPathResult => {
    const startKey = navKey(sx, sy);
    const path: Vec2[] = [];
    let k = endKey;
    while (k !== startKey) {
      const x = Math.floor(k / 0x10000) - 0x8000;
      const y = (k % 0x10000) - 0x8000;
      path.push({ x: x + 0.5, y: y + 0.5 });
      k = cameFrom.get(k)!;
    }
    path.reverse();
    return { complete, path };
  };

  let expansions = 0;
  while (open.size > 0 && expansions < maxExpansions) {
    const current = open.pop()!;
    const ck = navKey(current.x, current.y);
    // Lazy deletion: stale queue entries are skipped, not re-expanded.
    if (current.g > (gScore.get(ck) ?? Infinity)) continue;
    expansions++;

    if (current.x === tx && current.y === ty) return rebuild(ck, true);
    const h = current.f - current.g;
    if (h < bestH) {
      bestH = h;
      bestKey = ck;
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (!inBounds(nx, ny) || navSolid(world, nx, ny)) continue;
        // No diagonal corner-cutting.
        if (dx !== 0 && dy !== 0) {
          if (navSolid(world, current.x + dx, current.y) || navSolid(world, current.x, current.y + dy)) {
            continue;
          }
        }
        const tentative = current.g + (dx !== 0 && dy !== 0 ? 1.41 : 1);
        const nk = navKey(nx, ny);
        if (tentative < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, tentative);
          cameFrom.set(nk, ck);
          open.push({ x: nx, y: ny, g: tentative, f: tentative + octile(nx, ny, tx, ty) });
        }
      }
    }
  }
  return rebuild(bestKey, false);
}

/**
 * A* over the tile grid. 8-directional with corner-cutting forbidden —
 * paths stay safe for bodies up to ~0.7 tiles wide walking tile centers.
 * Returns tile-center waypoints excluding the start, or null.
 */
export function findPath(
  world: CollisionSource,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  maxExpansions = 4000,
): Vec2[] | null {
  const sx = Math.floor(fromX);
  const sy = Math.floor(fromY);
  const tx = Math.floor(toX);
  const ty = Math.floor(toY);
  if (sx === tx && sy === ty) return [];
  if (navSolid(world, tx, ty)) return null;

  const key = (x: number, y: number) => `${x},${y}`;
  const open: Array<{ x: number; y: number; g: number; f: number }> = [
    { x: sx, y: sy, g: 0, f: 0 },
  ];
  const gScore = new Map<string, number>([[key(sx, sy), 0]]);
  const cameFrom = new Map<string, string>();
  const heuristic = (x: number, y: number) => {
    const dx = Math.abs(x - tx);
    const dy = Math.abs(y - ty);
    return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
  };

  let expansions = 0;
  while (open.length > 0 && expansions < maxExpansions) {
    // Cheap priority queue: find min f. Fine at path lengths we use.
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) if (open[i]!.f < open[bestIdx]!.f) bestIdx = i;
    const current = open.splice(bestIdx, 1)[0]!;
    // Lazy deletion: stale queue entries are skipped, not re-expanded.
    if (current.g > (gScore.get(key(current.x, current.y)) ?? Infinity)) continue;
    expansions++;

    if (current.x === tx && current.y === ty) {
      const path: Vec2[] = [];
      let k = key(tx, ty);
      while (k !== key(sx, sy)) {
        const [px, py] = k.split(',').map(Number);
        path.push({ x: px! + 0.5, y: py! + 0.5 });
        k = cameFrom.get(k)!;
      }
      path.reverse();
      return path;
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (navSolid(world, nx, ny)) continue;
        // No diagonal corner-cutting.
        if (dx !== 0 && dy !== 0) {
          if (navSolid(world, current.x + dx, current.y) || navSolid(world, current.x, current.y + dy)) {
            continue;
          }
        }
        const cost = dx !== 0 && dy !== 0 ? 1.41 : 1;
        const tentative = current.g + cost;
        const nk = key(nx, ny);
        if (tentative < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, tentative);
          cameFrom.set(nk, key(current.x, current.y));
          open.push({ x: nx, y: ny, g: tentative, f: tentative + heuristic(nx, ny) });
        }
      }
    }
  }
  return null;
}
