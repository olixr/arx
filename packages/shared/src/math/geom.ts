import type { Vec2 } from './vec.js';

/**
 * THE WATCHFUL GROUND's geometry (docs/triggers-plan.md): the world's
 * first region primitive below the zone rect. A polygon is a closed
 * ring of vertices in world-tile coordinates (the last edge returns to
 * the first vertex implicitly); containment is the even-odd ray cast,
 * written half-open on the crossing test so a point sliding along a
 * shared border between two triggers is inside exactly one of them.
 */

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function polyBounds(points: readonly Vec2[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Even-odd ray cast; vertices may wind either way. */
export function pointInPolygon(points: readonly Vec2[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    const crosses = a.y > y !== b.y > y;
    if (crosses && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}
