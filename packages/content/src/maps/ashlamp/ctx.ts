/**
 * THE ASHLAMP (contested lands, band 7) — THE CTX.
 *
 * The Dawnmead ctx COPIED for a patch (site-grammar §6.2, ruling R1:
 * no shared lib until the Sett is the third consumer), with the three
 * things a scar on worldgen needs that a town does not:
 *
 *  - EVERY COORDINATE IS A WORLD TILE. The brief frames the whole east
 *    in world tiles; the ctx converts to the builder's local frame
 *    exactly once (put/get/detail/wear all take world x,y).
 *  - THE CARVE IS THE REFUSAL. Dawnmead's brushes refused the golden
 *    Ring box; here they refuse the road bed (roadDistanceAt with the
 *    shipped seed ≤ ROAD_HALF) and the border ring, because the bed
 *    stays TILE_SKIP by law (lint.bedUntouched) and the outermost ring
 *    publishes no edge profile (lint.skipRing). A prop put() ON the
 *    bed throws with coordinates: that is a layout bug, never a fill.
 *  - WEARABLE is widened (G-7) to Grass, GrassTall, Dirt, Swamp, Sand
 *    and the base TILE_SKIP itself: the ground here is worldgen's
 *    until a brush wears it, so a worn cell replaces whatever the
 *    field grew there (a shoulder tree becomes trodden dirt).
 *
 * Everything else is the frozen surface: deferred signs (flushed last
 * so no fill can bury a board), deferred details (flushed after the
 * props), the four wear brushes on the zone's OWN hash salt (ashRng,
 * never meadRng's), emberBed (K1: ash beneath), deadTree, and the
 * occluder/door/post/station registers the lints read.
 */
import { CHUNK_SIZE, Detail, TILE_SKIP, TREE_TILES, Tile, tileIndex, type ChunkData } from '@arx/shared';
import { ROAD_HALF, ROAD_SHOULDER, roadDistanceAt } from '../../geography.js';
import { WORLD_SEED, generateChunk } from '../../worldgen.js';
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

/** What lint.ts reads after the build: every declaration the scenes made (world tiles). */
export interface AshRegistry {
  boxes: Box[];
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
   * perpendicular on ashRng and never keeping the same side for more
   * than two steps; endpoints are exact; every cell is 4-connected to
   * the last. Paints only natural ground (WEARABLE); the bed and the
   * border are refused silently (a line that reaches the carve stops
   * at its edge, which is what a worn line to a road does).
   */
  line(pts: ReadonlyArray<Pt>, opts?: WearLineOpts): void;
  /** The ellipse with a ragged rim: rim cells stay as they were where ashRng > 0.55. */
  ellipse(cx: number, cy: number, rx: number, ry: number, tile?: Tile): void;
  /** Dirt on a verge row x0..x1 where ashRng < 0.6 (wheels leaving the Path). */
  shoulders(x0: number, x1: number, y: number): void;
  /**
   * A worked yard (x0..x1, y0..y1 inclusive): the interior is always
   * worn; rim cells stay as they were where ashRng > 0.55 and the
   * four corners where ashRng > 0.35, so no open yard ever reads as
   * a ruled rectangle.
   */
  rect(x0: number, y0: number, x1: number, y1: number, tile?: Tile): void;
}

export interface AshCtx {
  b: ZoneBuilder;
  W: number;
  H: number;
  rng(x: number, y: number): number;
  pins: typeof PINS;
  /** Distance to the wandered First Road at a world tile (the carve's own answer). */
  road(x: number, y: number): number;
  onBed(x: number, y: number): boolean;
  onShoulder(x: number, y: number): boolean;
  /** Inside the authorable interior (the border ring excluded). */
  authorable(x: number, y: number): boolean;
  /** Set a tile at a WORLD cell; throws on the bed or outside the interior. */
  put(x: number, y: number, tile: Tile): void;
  get(x: number, y: number): Tile;
  box(x0: number, y0: number, x1: number, y1: number, owner: string): void;
  sign(x: number, y: number, title: string, lines?: readonly string[], tile?: Tile): void;
  detail(x: number, y: number, d: Detail): void;
  wear: WearBrushes;
  /**
   * THE FELLING (the occlusion law at the true frame): every cell of
   * the box (inclusive, world tiles) that the zone has not authored
   * and that worldgen grows a TREE on becomes plain Grass, so the
   * field's canopy never paints over a scene south of the bed. Only
   * trees fall; grass, tall grass, rock and the rest keep their kind;
   * the bed and the border are refused. Reads worldgen at the shipped
   * seed (pure), so the build stays byte-identical.
   */
  fell(x0: number, y0: number, x1: number, y1: number): void;
  emberBed(x: number, y: number): void;
  deadTree(x: number, y: number): void;
  occluder(x: number, y: number): void;
  door(x: number, y: number): void;
  post(x: number, y: number): void;
  station(x: number, y: number): void;
}

/** Stable per-tile randomness on the Ashlamp's OWN salt (never meadRng's 0x2f61a3b7). */
export function ashRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x5a1f0c3d;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Natural ground the wear brushes may paint over (G-7: the fen's own kinds, and the base). */
const WEARABLE: ReadonlySet<number> = new Set([
  Tile.Grass, Tile.GrassTall, Tile.Dirt, Tile.Swamp, Tile.Sand, TILE_SKIP,
]);

/** Deterministic {-1,0,1} from a tile's own hash at the given wobble. */
function jitterAt(x: number, y: number, wobble: number): -1 | 0 | 1 {
  const r = ashRng(x * 3 + 11, y * 5 + 7);
  if (r < wobble / 2) return -1;
  if (r < wobble) return 1;
  return 0;
}

/** Walk a segment one axis-step at a time (4-connected DDA), cells strictly after `from` up to `to`. */
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

/** Worldgen's own ground at a WORLD tile, at the shipped seed (chunks cached per process; pure). */
const fieldChunks = new Map<string, ChunkData>();
function fieldGround(x: number, y: number): number {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  const key = `${cx},${cy}`;
  let c = fieldChunks.get(key);
  if (!c) {
    c = generateChunk(WORLD_SEED, cx, cy);
    fieldChunks.set(key, c);
  }
  return c.ground[tileIndex(x, y)]!;
}

export function makeCtx(b: ZoneBuilder): { ctx: AshCtx; registry: AshRegistry } {
  const registry: AshRegistry = {
    boxes: [],
    signs: [],
    details: [],
    occluders: [],
    doors: [],
    posts: [],
    stations: [],
  };
  const { ORIGIN, AUTHORABLE } = PINS;
  const road = (x: number, y: number): number => roadDistanceAt(WORLD_SEED, x, y);
  const onBed = (x: number, y: number): boolean => road(x, y) <= ROAD_HALF;
  const onShoulder = (x: number, y: number): boolean => road(x, y) <= ROAD_SHOULDER;
  const authorable = (x: number, y: number): boolean =>
    x >= AUTHORABLE.x0 && x <= AUTHORABLE.x1 && y >= AUTHORABLE.y0 && y <= AUTHORABLE.y1;
  const get = (x: number, y: number): Tile => b.get(x - ORIGIN.x, y - ORIGIN.y);
  const put = (x: number, y: number, tile: Tile): void => {
    if (!authorable(x, y)) {
      throw new Error(`ashlamp: (${x},${y}) lies outside the authorable interior x ${AUTHORABLE.x0}..${AUTHORABLE.x1} y ${AUTHORABLE.y0}..${AUTHORABLE.y1}`);
    }
    if (onBed(x, y)) {
      throw new Error(`ashlamp: (${x},${y}) lies on the First Road's bed (${road(x, y).toFixed(2)} ≤ ${ROAD_HALF}); the bed stays TILE_SKIP`);
    }
    b.set(x - ORIGIN.x, y - ORIGIN.y, tile);
  };

  // THE CARVE IS THE REFUSAL: no wear brush ever paints the bed or the
  // border ring; the rest of the field is worldgen's until worn.
  const paint = (x: number, y: number, tile: Tile): void => {
    if (!authorable(x, y)) return;
    if (onBed(x, y)) return;
    if (WEARABLE.has(get(x, y))) b.set(x - ORIGIN.x, y - ORIGIN.y, tile);
  };

  const line = (pts: ReadonlyArray<Pt>, opts: WearLineOpts = {}): void => {
    const width = opts.width ?? 1;
    const wobble = opts.wobble ?? 0.35;
    const tile = opts.tile ?? Tile.Dirt;
    if (pts.length === 0) return;
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
        j = 0;
      } else if (prevJ !== 0) {
        const hold = ashRng(c.x + 5, c.y + 3) < 0.45 ? 1 : 2;
        j = run >= hold ? 0 : prevJ;
      } else if (rest > 0) {
        j = 0;
        rest--;
      } else {
        j = jitterAt(c.x, c.y, wobble);
      }
      // A sidestep onto the bed is refused: the line holds its course.
      if (j !== 0 && onBed(c.x + c.px * j, c.y + c.py * j)) j = 0;
      if (prevJ !== 0 && j === 0) rest = ashRng(c.x + 9, c.y + 1) < 0.5 ? 1 : 2;
      run = j !== 0 && j === prevJ ? run + 1 : j !== 0 ? 1 : 0;
      const cx = c.x + c.px * j;
      const cy = c.y + c.py * j;
      paint(cx, cy, tile);
      if (width >= 2) {
        paint(cx + c.px, cy + c.py, tile);
        if (ashRng(cx + 17, cy + 29) < 0.25) paint(cx - c.px, cy - c.py, tile);
        if (ashRng(cx + 31, cy + 13) < 0.25) paint(cx + c.px * 2, cy + c.py * 2, tile);
      }
      if (width >= 3) {
        paint(cx - c.px, cy - c.py, tile);
        if (ashRng(cx + 43, cy + 47) < 0.2) paint(cx - c.px * 2, cy - c.py * 2, tile);
      }
      prevJ = j;
    }
  };

  const ellipse = (cx: number, cy: number, rx: number, ry: number, tile: Tile = Tile.Dirt): void => {
    for (let iy = Math.floor(cy - ry); iy <= cy + ry; iy++) {
      for (let ix = Math.floor(cx - rx); ix <= cx + rx; ix++) {
        const dx = (ix - cx) / rx;
        const dy = (iy - cy) / ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        if (d2 >= 0.6 && ashRng(ix, iy) > 0.55) continue;
        paint(ix, iy, tile);
      }
    }
  };

  const shoulders = (x0: number, x1: number, y: number): void => {
    for (let x = x0; x <= x1; x++) {
      if (ashRng(x, y) < 0.6) paint(x, y, Tile.Dirt);
    }
  };

  const rect = (x0: number, y0: number, x1: number, y1: number, tile: Tile = Tile.Dirt): void => {
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const edgeX = ix === x0 || ix === x1;
        const edgeY = iy === y0 || iy === y1;
        if (edgeX && edgeY) {
          if (ashRng(ix, iy) > 0.35) continue;
        } else if (edgeX || edgeY) {
          if (ashRng(ix, iy) > 0.55) continue;
        }
        paint(ix, iy, tile);
      }
    }
  };

  const ctx: AshCtx = {
    b,
    W: PINS.WIDTH,
    H: PINS.HEIGHT,
    rng: ashRng,
    pins: PINS,
    road,
    onBed,
    onShoulder,
    authorable,
    put,
    get,
    box(x0, y0, x1, y1, owner) {
      registry.boxes.push({ x0, y0, x1, y1, owner });
    },
    sign(x, y, title, lines = [], tile = Tile.Signpost) {
      registry.signs.push({ x, y, title, lines, tile });
    },
    detail(x, y, d) {
      registry.details.push({ x, y, d });
    },
    wear: { line, ellipse, shoulders, rect },
    fell(x0, y0, x1, y1) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!authorable(x, y) || onBed(x, y)) continue;
          if ((get(x, y) as number) !== TILE_SKIP) continue;
          if (TREE_TILES.has(fieldGround(x, y) as Tile)) b.set(x - ORIGIN.x, y - ORIGIN.y, Tile.Grass);
        }
      }
    },
    emberBed(x, y) {
      // THE PAN READS AGAINST THE ASH (fix pass 1, amending K1 for a
      // floor that is ash already): the burnt cottage's bed sits on
      // its own ash because the floor around it is boards; here the
      // whole floor is ash, and a pan of ash on a floor of ash was
      // invisible by day (the proof's shell shots). The bed's own
      // cell carries NO ash detail, so the painter's cold pan and
      // stone ring stand on bare dirt inside the ash pan around it,
      // and by day it reads by the ash it sits IN, not under.
      put(x, y, Tile.EmberBed);
    },
    deadTree(x, y) {
      // A snag stands on natural ground: grass, or the field's own
      // cell (TILE_SKIP) where worldgen grew whatever it grew.
      const under = get(x, y);
      if (under !== Tile.Grass && under !== Tile.GrassTall && (under as number) !== TILE_SKIP) {
        throw new Error(`ashlamp: DeadTree at (${x},${y}) must stand on natural ground, not tile ${under}`);
      }
      put(x, y, Tile.DeadTree);
      registry.occluders.push([x, y]);
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
