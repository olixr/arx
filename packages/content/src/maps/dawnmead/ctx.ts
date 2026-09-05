/**
 * DAWNMEAD UNDER SIEGE (band 6) — THE FROZEN CTX.
 *
 * Every district module is one `(ctx: DawnCtx) => void`. It owns the
 * scene boxes it declares, lays props with `ctx.b` (set / get /
 * fillRect / outlineRect / fillEllipse / building / stamp allowed) and
 * routes everything with a village-wide consequence through the ctx:
 *
 *  - `sign`      DEFERRED; index.ts flushes every board AFTER the edge
 *                woods so no later fill can bury it (§7.6 sign law).
 *                The `tile` default mirrors ZoneBuilder.sign: a
 *                HangingSign (a shingle on a frontage). Pass
 *                Tile.Signpost for a free-standing board.
 *  - `detail`    DEFERRED; flushed after scatter and the flower
 *                thinning, so authored Ash / Tuft / Pebbles / Flowers on
 *                open ground survive the meadow's RNG. Flowers written
 *                straight through b.setDetail on Grass are THINNED.
 *  - `keepOut`   unioned with KEEP_OUT_BASE before the edge woods.
 *  - `wear.*`    the four ground brushes, all driven by meadRng so
 *                every boot is identical; wear is never a rectangle
 *                (FIX PASS 1 added `rect`: a worked yard whose rim
 *                rags on the hash, because an open yard with a ruled
 *                edge read as a rectangle of wear on the block-out).
 *  - `emberBed`  EmberBed with Detail.Ash beneath (K1); the caller lays
 *                the ash pan around it through `detail`.
 *  - `deadTree`  a DeadTree on Grass only; registered as an occluder.
 *  - `pen`       a rail ring with one-tile gaps as its open gates
 *                (ruling Kit 14); the interior is the caller's ground.
 *  - `occluder / door / post / station` register subjects and tall
 *                props for lint.ts (the occlusion law).
 *
 * A district NEVER calls b.sign, b.actor, b.npcSpawn, b.scatter*,
 * b.spawn, b.raise, b.stairs or b.setDetail on open ground directly.
 * Bodies and spawn clusters are people.ts's alone.
 *
 * This file is FROZEN by the block-out brief (§9.1). Lanes code
 * against exactly this surface.
 */
import { Detail, Tile } from '@arx/shared';
import { ZoneBuilder } from '../builder.js';
import { PINS } from './pins.js';

export type Pt = readonly [number, number];

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  owner: string;
}

export interface KeepOut {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  why: string;
}

export interface QueuedSign {
  x: number;
  y: number;
  title: string;
  lines: readonly string[];
  tile: Tile;
}

export interface QueuedDetail {
  x: number;
  y: number;
  d: Detail;
}

/** What lint.ts reads after the build: every declaration the districts made. */
export interface DawnRegistry {
  boxes: Box[];
  keepOuts: KeepOut[];
  signs: QueuedSign[];
  details: QueuedDetail[];
  occluders: Pt[];
  doors: Pt[];
  posts: Pt[];
  stations: Pt[];
}

export interface WearLineOpts {
  /** 1 (default), 2 or 3 tiles; 2 and 3 carry jittered flanks, never a ruled band. */
  width?: 1 | 2 | 3;
  /** Chance per step that the centre steps a tile sideways (default 0.35). */
  wobble?: number;
  tile?: Tile;
}

export interface WearBrushes {
  /**
   * A Dirt polyline through `pts`, one tile wide, jittering one tile
   * perpendicular on meadRng and never keeping the same side for more
   * than two steps; endpoints are exact; every cell is 4-connected to
   * the last. Paints only natural ground (Grass, GrassTall, Dirt):
   * stone, path, water and sand are never overwritten (a line across
   * the well court is a no-op by design).
   */
  line(pts: ReadonlyArray<Pt>, opts?: WearLineOpts): void;
  /** The ellipse with a ragged rim: rim cells stay as they were where meadRng > 0.55. */
  ellipse(cx: number, cy: number, rx: number, ry: number, tile?: Tile): void;
  /** Dirt on a verge row x0..x1 where meadRng < 0.6 (wheels leaving the Path). */
  shoulders(x0: number, x1: number, y: number): void;
  /**
   * A worked yard (x0..x1, y0..y1 inclusive): the interior is always
   * worn; rim cells stay as they were where meadRng > 0.55 and the
   * four corners where meadRng > 0.35, so no open yard ever reads as
   * a ruled rectangle. Fenced yards and floors keep fillRect (a rail
   * or a wall is the edge; the ground inside is honestly square).
   */
  rect(x0: number, y0: number, x1: number, y1: number, tile?: Tile): void;
}

export interface PenOpts {
  rail: Tile;
  /** One-tile gaps: the open gates (the ground beneath is restored, never the rail). */
  gaps: Array<{ side: 'n' | 's' | 'e' | 'w'; at: number }>;
  /** FenceBroken at these spots (a Fence run's leaning corner). */
  broken?: Array<{ side: 'n' | 's' | 'e' | 'w'; at: number }>;
}

export interface DawnCtx {
  b: ZoneBuilder;
  W: 192;
  H: 224;
  brookX(y: number): number;
  rng(x: number, y: number): number;
  pins: typeof PINS;
  box(x0: number, y0: number, x1: number, y1: number, owner: string): void;
  sign(x: number, y: number, title: string, lines?: readonly string[], tile?: Tile): void;
  detail(x: number, y: number, d: Detail): void;
  keepOut(x0: number, y0: number, x1: number, y1: number, why: string): void;
  wear: WearBrushes;
  emberBed(x: number, y: number): void;
  deadTree(x: number, y: number): void;
  pen(x: number, y: number, w: number, h: number, opts: PenOpts): void;
  occluder(x: number, y: number): void;
  door(x: number, y: number): void;
  post(x: number, y: number): void;
  station(x: number, y: number): void;
}

/** Stable per-tile randomness so the village is identical every boot (the shipped hash). */
export function meadRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x2f61a3b7;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The brook's centre column at a row (shared by every water read). */
export function brookX(y: number): number {
  return 160 + Math.round(Math.sin((y - 112) * 0.1) * 2);
}

/** Natural ground the wear brushes may paint over. */
const WEARABLE: ReadonlySet<number> = new Set([Tile.Grass, Tile.GrassTall, Tile.Dirt]);

/** Deterministic {-1,0,1} from a tile's own hash at the given wobble. */
function jitterAt(x: number, y: number, wobble: number): -1 | 0 | 1 {
  const r = meadRng(x * 3 + 11, y * 5 + 7);
  if (r < wobble / 2) return -1;
  if (r < wobble) return 1;
  return 0;
}

/**
 * Walk a segment one axis-step at a time (4-connected DDA). Returns the
 * cells strictly after `from` up to and including `to`.
 */
function stepCells(from: Pt, to: Pt): Pt[] {
  const out: Pt[] = [];
  let [x, y] = from;
  const [tx, ty] = to;
  const dx = tx - x;
  const dy = ty - y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  let err = 0;
  if (adx >= ady) {
    while (x !== tx) {
      x += sx;
      err += ady;
      out.push([x, y]);
      if (err * 2 >= adx && y !== ty) {
        y += sy;
        err -= adx;
        out.push([x, y]);
      }
    }
    while (y !== ty) {
      y += sy;
      out.push([x, y]);
    }
  } else {
    while (y !== ty) {
      y += sy;
      err += adx;
      out.push([x, y]);
      if (err * 2 >= ady && x !== tx) {
        x += sx;
        err -= ady;
        out.push([x, y]);
      }
    }
    while (x !== tx) {
      x += sx;
      out.push([x, y]);
    }
  }
  return out;
}

export function makeCtx(b: ZoneBuilder): { ctx: DawnCtx; registry: DawnRegistry } {
  const registry: DawnRegistry = {
    boxes: [],
    keepOuts: [],
    signs: [],
    details: [],
    occluders: [],
    doors: [],
    posts: [],
    stations: [],
  };

  // THE BOX IS GOLDEN: no wear brush ever paints inside the Ring's
  // eight-tile box (the re-stamp would erase it; a line that wobbles
  // in there would only leave a gap on the way back out).
  const box = PINS.RING_BOX;
  const inBox = (x: number, y: number): boolean =>
    x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
  const paint = (x: number, y: number, tile: Tile): void => {
    if (x < 0 || y < 0 || x >= b.width || y >= b.height) return;
    if (inBox(x, y)) return;
    if (WEARABLE.has(b.get(x, y))) b.set(x, y, tile);
  };

  const line = (pts: ReadonlyArray<Pt>, opts: WearLineOpts = {}): void => {
    const width = opts.width ?? 1;
    const wobble = opts.wobble ?? 0.35;
    const tile = opts.tile ?? Tile.Dirt;
    if (pts.length === 0) return;
    // The base cells of the whole polyline, 4-connected, with the
    // segment's perpendicular axis carried alongside each cell.
    const cells: Array<{ x: number; y: number; px: number; py: number }> = [];
    const first = pts[0]!;
    cells.push({ x: first[0], y: first[1], px: 0, py: 1 });
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const c = pts[i]!;
      const horizontal = Math.abs(c[0] - a[0]) >= Math.abs(c[1] - a[1]);
      const px = horizontal ? 0 : 1;
      const py = horizontal ? 1 : 0;
      for (const [x, y] of stepCells(a, c)) cells.push({ x, y, px, py });
    }
    // Mirror the first segment's axis onto its head cell.
    if (cells.length > 1) {
      cells[0]!.px = cells[1]!.px;
      cells[0]!.py = cells[1]!.py;
    }
    let prevJ = 0;
    let run = 0;
    let rest = 0;
    const last = cells.length - 1;
    for (let i = 0; i <= last; i++) {
      const c = cells[i]!;
      let j: number;
      if (i === 0 || i === last) {
        j = 0; // endpoints are exact
      } else if (prevJ !== 0) {
        // A sidestep holds one cell or two on its own hash, never a third.
        const hold = meadRng(c.x + 5, c.y + 3) < 0.45 ? 1 : 2;
        j = run >= hold ? 0 : prevJ;
      } else if (rest > 0) {
        j = 0; // one straight cell at least before the next wobble
        rest--;
      } else {
        j = jitterAt(c.x, c.y, wobble);
      }
      // A sidestep into the golden box is refused: the line holds its course.
      if (j !== 0 && inBox(c.x + c.px * j, c.y + c.py * j)) j = 0;
      if (prevJ !== 0 && j === 0) rest = meadRng(c.x + 9, c.y + 1) < 0.5 ? 1 : 2;
      run = j !== 0 && j === prevJ ? run + 1 : j !== 0 ? 1 : 0;
      // A sidestep is a diagonal, never a bridged two-wide blip: feet
      // cut the corner, and grass is walkable either side.
      const cx = c.x + c.px * j;
      const cy = c.y + c.py * j;
      paint(cx, cy, tile);
      if (width >= 2) {
        // The core's second column rides with the centre; the outer
        // flanks are ragged on their own hash.
        paint(cx + c.px, cy + c.py, tile);
        if (meadRng(cx + 17, cy + 29) < 0.25) paint(cx - c.px, cy - c.py, tile);
        if (meadRng(cx + 31, cy + 13) < 0.25) paint(cx + c.px * 2, cy + c.py * 2, tile);
      }
      if (width >= 3) {
        paint(cx - c.px, cy - c.py, tile);
        if (meadRng(cx + 43, cy + 47) < 0.2) paint(cx - c.px * 2, cy - c.py * 2, tile);
      }
      prevJ = j;
    }
  };

  const ellipse = (cx: number, cy: number, rx: number, ry: number, tile: Tile = Tile.Dirt): void => {
    // The heart (d² < 0.6) is always worn; the outer ring rags on the
    // tile's own hash so no ellipse ever reads as a ruled shape.
    for (let iy = Math.floor(cy - ry); iy <= cy + ry; iy++) {
      for (let ix = Math.floor(cx - rx); ix <= cx + rx; ix++) {
        const dx = (ix - cx) / rx;
        const dy = (iy - cy) / ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        if (d2 >= 0.6 && meadRng(ix, iy) > 0.55) continue;
        paint(ix, iy, tile);
      }
    }
  };

  const shoulders = (x0: number, x1: number, y: number): void => {
    for (let x = x0; x <= x1; x++) {
      if (meadRng(x, y) < 0.6) paint(x, y, Tile.Dirt);
    }
  };

  const rect = (x0: number, y0: number, x1: number, y1: number, tile: Tile = Tile.Dirt): void => {
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const edgeX = ix === x0 || ix === x1;
        const edgeY = iy === y0 || iy === y1;
        // The rim rags on the tile's own hash; the corners rag harder
        // (a yard is worn from its middle out, and its corners last).
        if (edgeX && edgeY) {
          if (meadRng(ix, iy) > 0.35) continue;
        } else if (edgeX || edgeY) {
          if (meadRng(ix, iy) > 0.55) continue;
        }
        paint(ix, iy, tile);
      }
    }
  };

  const wallSpot = (
    x: number, y: number, w: number, h: number, o: { side: 'n' | 's' | 'e' | 'w'; at: number },
  ): Pt =>
    o.side === 'n' ? [x + o.at, y]
      : o.side === 's' ? [x + o.at, y + h - 1]
        : o.side === 'w' ? [x, y + o.at]
          : [x + w - 1, y + o.at];

  const ctx: DawnCtx = {
    b,
    W: 192,
    H: 224,
    brookX,
    rng: meadRng,
    pins: PINS,
    box(x0, y0, x1, y1, owner) {
      registry.boxes.push({ x0, y0, x1, y1, owner });
    },
    sign(x, y, title, lines = [], tile = Tile.HangingSign) {
      registry.signs.push({ x, y, title, lines, tile });
    },
    detail(x, y, d) {
      registry.details.push({ x, y, d });
    },
    keepOut(x0, y0, x1, y1, why) {
      registry.keepOuts.push({ x0, y0, x1, y1, why });
    },
    wear: { line, ellipse, shoulders, rect },
    emberBed(x, y) {
      // K1: the coals sit on their own ash, whatever ground was laid.
      b.set(x, y, Tile.EmberBed);
      b.setDetail(x, y, Detail.Ash);
    },
    deadTree(x, y) {
      const under = b.get(x, y);
      if (under !== Tile.Grass && under !== Tile.GrassTall) {
        throw new Error(`dawnmead: DeadTree at (${x},${y}) must stand on grass, not tile ${under}`);
      }
      b.set(x, y, Tile.DeadTree);
      registry.occluders.push([x, y]);
    },
    pen(x, y, w, h, opts) {
      // Remember the ground under every gap so the gate is the ground
      // it always was: pen() draws its gaps last (brief §9.2 #9).
      const gaps = opts.gaps.map((g) => {
        const [gx, gy] = wallSpot(x, y, w, h, g);
        return { gx, gy, under: b.get(gx, gy) };
      });
      b.outlineRect(x, y, w, h, opts.rail);
      for (const o of opts.broken ?? []) {
        const [bx, by] = wallSpot(x, y, w, h, o);
        b.set(bx, by, Tile.FenceBroken);
      }
      for (const g of gaps) b.set(g.gx, g.gy, g.under);
    },
    occluder(x, y) {
      registry.occluders.push([x, y]);
    },
    door(x, y) {
      registry.doors.push([x, y]);
    },
    post(x, y) {
      registry.posts.push([x, y]);
    },
    station(x, y) {
      registry.stations.push([x, y]);
    },
  };
  return { ctx, registry };
}
