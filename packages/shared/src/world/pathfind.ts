import type { CollisionSource } from './collision.js';
import type { Vec2 } from '../math/vec.js';

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
  if (world.isSolid(tx, ty)) return null;

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
        if (world.isSolid(nx, ny)) continue;
        // No diagonal corner-cutting.
        if (dx !== 0 && dy !== 0) {
          if (world.isSolid(current.x + dx, current.y) || world.isSolid(current.x, current.y + dy)) {
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
