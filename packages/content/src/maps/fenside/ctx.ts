/**
 * THE FEN WAIST (contested lands, band 7) — THE CTX.
 *
 * The Dawnmead ctx COPIED for a patch on worldgen (site-grammar §6.2,
 * ruling R1: no shared lib until the Sett is the third consumer), on
 * the same three departures the Ashlamp's ctx makes — every coordinate
 * is a WORLD tile; the carve is the refusal (the road bed and the
 * border ring, read through roadDistanceAt with the shipped seed);
 * WEARABLE is widened (G-7) to Grass, GrassTall, Dirt, Swamp, Sand and
 * the base TILE_SKIP — plus what the ford needs that the scar does not:
 *
 *  - BAR_GAP. The bar's north post and its stepped tooth stand ON the
 *    bed by ruling (R2: the road narrowed to one pair of boots); those
 *    two cells alone may be put() inside ROAD_HALF. Every other bed
 *    cell throws.
 *  - stakeLine(pts, tile, every, between): a post every N cells of a
 *    polyline with a rail between, skipping the bed — the dike line
 *    driven from the bank into the channel.
 *  - shallows(pts, width): WaterShallow along a polyline with a ragged
 *    rim. No scene calls it this band (the channel is worldgen's, §2.4
 *    G4); it stands for the Sett's lift list (site-grammar §6.2).
 *  - chest(x, y, table, wardedBy): the zone's warded chest (0.2 G)
 *    through the builder's binding, in world coordinates.
 *
 * The hash salt is the fen's own (fenRng), never meadRng's and never
 * the Ashlamp's, so no two zones rag alike.
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
export interface FenRegistry {
  boxes: Box[];
  signs: QueuedSign[];
  details: QueuedDetail[];
  occluders: Pt[];
  doors: Pt[];
  posts: Pt[];
  stations: Pt[];
}

export interface WearLineOpts {
  width?: 1 | 2 | 3;
  wobble?: number;
  tile?: Tile;
}

export interface WearBrushes {
  line(pts: ReadonlyArray<Pt>, opts?: WearLineOpts): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, tile?: Tile): void;
  shoulders(x0: number, x1: number, y: number): void;
  rect(x0: number, y0: number, x1: number, y1: number, tile?: Tile): void;
}

export interface FenCtx {
  b: ZoneBuilder;
  W: number;
  H: number;
  rng(x: number, y: number): number;
  pins: typeof PINS;
  road(x: number, y: number): number;
  onBed(x: number, y: number): boolean;
  onShoulder(x: number, y: number): boolean;
  authorable(x: number, y: number): boolean;
  /** Set a tile at a WORLD cell; throws on the bed (but BAR_GAP) or outside the interior. */
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
  /** WaterShallow along a polyline with a ragged rim (unused this band; the Sett's). */
  shallows(pts: ReadonlyArray<Pt>, width: number): void;
  /** A `tile` every `every` cells of the polyline, `between` on the rest; the bed is skipped. */
  stakeLine(pts: ReadonlyArray<Pt>, tile: Tile, every: number, between: Tile): void;
  /** The zone's warded chest at a WORLD cell (a closed chest tile; the builder binds it). */
  chest(x: number, y: number, table: string, wardedBy: string): void;
  emberBed(x: number, y: number): void;
  deadTree(x: number, y: number): void;
  occluder(x: number, y: number): void;
  door(x: number, y: number): void;
  post(x: number, y: number): void;
  station(x: number, y: number): void;
}

/** Stable per-tile randomness on the fen's OWN salt (never meadRng's, never the Ashlamp's). */
export function fenRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x7e2b91a5;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const WEARABLE: ReadonlySet<number> = new Set([
  Tile.Grass, Tile.GrassTall, Tile.Dirt, Tile.Swamp, Tile.Sand, TILE_SKIP,
]);

function jitterAt(x: number, y: number, wobble: number): -1 | 0 | 1 {
  const r = fenRng(x * 3 + 11, y * 5 + 7);
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

export function makeCtx(b: ZoneBuilder): { ctx: FenCtx; registry: FenRegistry } {
  const registry: FenRegistry = {
    boxes: [],
    signs: [],
    details: [],
    occluders: [],
    doors: [],
    posts: [],
    stations: [],
  };
  const { ORIGIN, AUTHORABLE } = PINS;
  const gap = new Set(PINS.BAR_GAP.map(([x, y]) => `${x},${y}`));
  const road = (x: number, y: number): number => roadDistanceAt(WORLD_SEED, x, y);
  const onBed = (x: number, y: number): boolean => road(x, y) <= ROAD_HALF;
  const onShoulder = (x: number, y: number): boolean => road(x, y) <= ROAD_SHOULDER;
  const authorable = (x: number, y: number): boolean =>
    x >= AUTHORABLE.x0 && x <= AUTHORABLE.x1 && y >= AUTHORABLE.y0 && y <= AUTHORABLE.y1;
  const get = (x: number, y: number): Tile => b.get(x - ORIGIN.x, y - ORIGIN.y);
  const refuse = (x: number, y: number): boolean => onBed(x, y) && !gap.has(`${x},${y}`);
  const put = (x: number, y: number, tile: Tile): void => {
    if (!authorable(x, y)) {
      throw new Error(`fenside: (${x},${y}) lies outside the authorable interior x ${AUTHORABLE.x0}..${AUTHORABLE.x1} y ${AUTHORABLE.y0}..${AUTHORABLE.y1}`);
    }
    if (refuse(x, y)) {
      throw new Error(`fenside: (${x},${y}) lies on the First Road's bed (${road(x, y).toFixed(2)} ≤ ${ROAD_HALF}) and is not a BAR_GAP cell`);
    }
    b.set(x - ORIGIN.x, y - ORIGIN.y, tile);
  };
  // THE CARVE IS THE REFUSAL: no wear brush ever paints the bed (the
  // gap cells included: a tooth stands on trodden road, not on wear)
  // or the border ring.
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
        const hold = fenRng(c.x + 5, c.y + 3) < 0.45 ? 1 : 2;
        j = run >= hold ? 0 : prevJ;
      } else if (rest > 0) {
        j = 0;
        rest--;
      } else {
        j = jitterAt(c.x, c.y, wobble);
      }
      if (j !== 0 && onBed(c.x + c.px * j, c.y + c.py * j)) j = 0;
      if (prevJ !== 0 && j === 0) rest = fenRng(c.x + 9, c.y + 1) < 0.5 ? 1 : 2;
      run = j !== 0 && j === prevJ ? run + 1 : j !== 0 ? 1 : 0;
      const cx = c.x + c.px * j;
      const cy = c.y + c.py * j;
      paint(cx, cy, tile);
      if (width >= 2) {
        paint(cx + c.px, cy + c.py, tile);
        if (fenRng(cx + 17, cy + 29) < 0.25) paint(cx - c.px, cy - c.py, tile);
        if (fenRng(cx + 31, cy + 13) < 0.25) paint(cx + c.px * 2, cy + c.py * 2, tile);
      }
      if (width >= 3) {
        paint(cx - c.px, cy - c.py, tile);
        if (fenRng(cx + 43, cy + 47) < 0.2) paint(cx - c.px * 2, cy - c.py * 2, tile);
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
        if (d2 >= 0.6 && fenRng(ix, iy) > 0.55) continue;
        paint(ix, iy, tile);
      }
    }
  };

  const shoulders = (x0: number, x1: number, y: number): void => {
    for (let x = x0; x <= x1; x++) {
      if (fenRng(x, y) < 0.6) paint(x, y, Tile.Dirt);
    }
  };

  const rect = (x0: number, y0: number, x1: number, y1: number, tile: Tile = Tile.Dirt): void => {
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const edgeX = ix === x0 || ix === x1;
        const edgeY = iy === y0 || iy === y1;
        if (edgeX && edgeY) {
          if (fenRng(ix, iy) > 0.35) continue;
        } else if (edgeX || edgeY) {
          if (fenRng(ix, iy) > 0.55) continue;
        }
        paint(ix, iy, tile);
      }
    }
  };

  const ctx: FenCtx = {
    b,
    W: PINS.WIDTH,
    H: PINS.HEIGHT,
    rng: fenRng,
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
    shallows(pts, width) {
      // The channel's own kind over natural ground, ragged at the rim
      // exactly as a worn line is (the same brush, the water's tile).
      line(pts, { width: (Math.max(1, Math.min(3, width)) as 1 | 2 | 3), tile: Tile.WaterShallow });
    },
    stakeLine(pts, tile, every, between) {
      if (pts.length === 0 || every < 1) return;
      const cells: Pt[] = [pts[0]!];
      for (let i = 1; i < pts.length; i++) cells.push(...stepCells(pts[i - 1]!, pts[i]!));
      cells.forEach(([x, y], i) => {
        if (!authorable(x, y) || onBed(x, y)) return;
        put(x, y, i % every === 0 ? tile : between);
      });
    },
    chest(x, y, table, wardedBy) {
      if (!authorable(x, y) || refuse(x, y)) {
        throw new Error(`fenside: chest at (${x},${y}) must stand inside the interior and off the bed`);
      }
      b.chest(x - ORIGIN.x, y - ORIGIN.y, table, wardedBy);
    },
    emberBed(x, y) {
      // THE PAN READS AGAINST THE ASH (fix pass 1, the Ashlamp's ctx
      // copied whole, fix pass 2): the bed's own cell carries NO ash
      // detail, so the painter's cold pan and stone ring stand on bare
      // dirt inside the ash pan around it; the scene that places one
      // lays the ring, and the lint (emberBedsOffAsh) holds it to
      // that. No bed stands in the fen waist today; the helper is kept
      // whole so a scene that lands one cannot fail its own lint.
      put(x, y, Tile.EmberBed);
    },
    deadTree(x, y) {
      const under = get(x, y);
      if (under !== Tile.Grass && under !== Tile.GrassTall && (under as number) !== TILE_SKIP) {
        throw new Error(`fenside: DeadTree at (${x},${y}) must stand on natural ground, not tile ${under}`);
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
