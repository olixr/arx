/**
 * Pure tile geometry for the editor's tools: brush footprints, thick
 * lines, shapes, flood fill, and the L-shaped road law the ZoneBuilder
 * paths use. Everything returns local tile coords; the editor applies
 * them through the stroke recorder.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Brush footprint cells centered on a tile. */
export function footprint(
  cx: number,
  cy: number,
  size: number,
  shape: 'round' | 'square',
): Pt[] {
  if (size <= 1) return [{ x: cx, y: cy }];
  const r = (size - 1) / 2;
  const out: Pt[] = [];
  const lo = Math.floor(-r);
  const hi = Math.ceil(r);
  for (let dy = lo; dy <= hi; dy++) {
    for (let dx = lo; dx <= hi; dx++) {
      if (shape === 'round' && dx * dx + dy * dy > r * r + 0.6) continue;
      out.push({ x: cx + dx, y: cy + dy });
    }
  }
  return out;
}

/** Bresenham between two tiles, inclusive. */
export function lineCells(x0: number, y0: number, x1: number, y1: number): Pt[] {
  const out: Pt[] = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}

/** A line stamped with a brush footprint at every step. */
export function thickLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  shape: 'round' | 'square',
): Pt[] {
  const seen = new Set<string>();
  const out: Pt[] = [];
  for (const p of lineCells(x0, y0, x1, y1)) {
    for (const c of footprint(p.x, p.y, size, shape)) {
      const k = `${c.x},${c.y}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
  }
  return out;
}

export function rectCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: boolean,
): Pt[] {
  const ax = Math.min(x0, x1);
  const ay = Math.min(y0, y1);
  const bx = Math.max(x0, x1);
  const by = Math.max(y0, y1);
  const out: Pt[] = [];
  for (let y = ay; y <= by; y++) {
    for (let x = ax; x <= bx; x++) {
      if (fill || x === ax || x === bx || y === ay || y === by) out.push({ x, y });
    }
  }
  return out;
}

export function ellipseCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: boolean,
): Pt[] {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.max(0.5, Math.abs(x1 - x0) / 2);
  const ry = Math.max(0.5, Math.abs(y1 - y0) / 2);
  const inside = (x: number, y: number): boolean => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  };
  const out: Pt[] = [];
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (!inside(x, y)) continue;
      if (fill) {
        out.push({ x, y });
      } else if (
        !inside(x + 1, y) ||
        !inside(x - 1, y) ||
        !inside(x, y + 1) ||
        !inside(x, y - 1)
      ) {
        out.push({ x, y });
      }
    }
  }
  return out;
}

/**
 * Contiguous flood fill over a sampled value, 4-connected, capped so a
 * misclick on an open meadow can't hang the tab.
 */
export function floodCells(
  startX: number,
  startY: number,
  width: number,
  height: number,
  sample: (i: number) => number,
  cap = 65536,
): Pt[] {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return [];
  const target = sample(startY * width + startX);
  const seen = new Set<number>();
  const stack = [startY * width + startX];
  const out: Pt[] = [];
  while (stack.length > 0 && out.length < cap) {
    const i = stack.pop()!;
    if (seen.has(i)) continue;
    seen.add(i);
    if (sample(i) !== target) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    out.push({ x, y });
    if (x + 1 < width) stack.push(i + 1);
    if (x - 1 >= 0) stack.push(i - 1);
    if (y + 1 < height) stack.push(i + width);
    if (y - 1 >= 0) stack.push(i - width);
  }
  return out;
}

/**
 * The road law: consecutive waypoints connect with the ZoneBuilder's
 * L-shaped path (horizontal leg from the start, vertical leg into the
 * end), at the given width. One tool stroke = one committed road.
 */
export function roadCells(points: Pt[], width: number): Pt[] {
  const seen = new Set<string>();
  const out: Pt[] = [];
  const add = (x: number, y: number): void => {
    const k = `${x},${y}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ x, y });
    }
  };
  const half = Math.floor(width / 2);
  for (let i = 0; i + 1 < points.length; i++) {
    const from = points[i]!;
    const to = points[i + 1]!;
    const x0 = Math.min(from.x, to.x);
    const x1 = Math.max(from.x, to.x);
    for (let x = x0; x <= x1; x++) {
      for (let o = -half; o < width - half; o++) add(x, from.y + o);
    }
    const y0 = Math.min(from.y, to.y);
    const y1 = Math.max(from.y, to.y);
    for (let y = y0; y <= y1; y++) {
      for (let o = -half; o < width - half; o++) add(to.x + o, y);
    }
  }
  if (points.length === 1) {
    const p = points[0]!;
    for (let o = -half; o < width - half; o++) {
      for (let o2 = -half; o2 < width - half; o2++) add(p.x + o2, p.y + o);
    }
  }
  return out;
}

/**
 * Cells inside a closed polygon (LOCAL tile coords) — even-odd
 * scanline over tile centers, plus the outline itself so thin shapes
 * never vanish. Powers the polygon tool and the lasso's freehand loop.
 */
export function polygonCells(pts: Pt[], fill: boolean): Pt[] {
  if (pts.length < 3) return pts.slice();
  const out: Pt[] = [];
  const seen = new Set<number>();
  const KEY = (x: number, y: number): number => y * 65536 + x + 32768;
  const add = (x: number, y: number): void => {
    const k = KEY(x, y);
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ x, y });
    }
  };
  // The outline: every edge rasterized.
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    for (const p of lineCells(a.x, a.y, b.x, b.y)) add(p.x, p.y);
  }
  if (!fill) return out;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  // Even-odd fill against tile centers.
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      const cy = y + 0.5;
      if (a.y + 0.5 <= cy === b.y + 0.5 <= cy) continue;
      xs.push(a.x + ((cy - (a.y + 0.5)) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.ceil(xs[k]! - 0.5);
      const xb = Math.floor(xs[k + 1]! - 0.5);
      for (let x = xa; x <= xb; x++) add(x, y);
    }
  }
  return out;
}

/**
 * A wall shell: the rect outline in the chosen wall tile with one
 * doorway centered on the south face — a building's bones in a drag.
 */
export function wallShellCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wall: number,
  door: number,
): Array<Pt & { tile: number }> {
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  const out: Array<Pt & { tile: number }> = [];
  const doorX = Math.floor((xa + xb) / 2);
  for (let x = xa; x <= xb; x++) {
    out.push({ x, y: ya, tile: wall });
    out.push({ x, y: yb, tile: x === doorX && xb - xa >= 2 ? door : wall });
  }
  for (let y = ya + 1; y < yb; y++) {
    out.push({ x: xa, y, tile: wall });
    out.push({ x: xb, y, tile: wall });
  }
  return out;
}
