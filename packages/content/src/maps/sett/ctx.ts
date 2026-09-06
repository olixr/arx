/**
 * THE SETT (contested lands, band 9d) — THE CTX.
 *
 * The wardthread ctx COPIED a fourth time (site-grammar §6.2: the
 * maps/lib lift was deferred "until the Sett" and is REFUSED this band
 * with its sentence in the brief §3.1: a refactor of three shipped
 * zones' ctx files in a two-hour run concurrent with a 9c build is two
 * risks for no scene; the lift goes to Foundations), bound to ONE
 * FRAME at a time (pins.FRAMES.sett now; 9e's four Course frames
 * later) since one module builds several rects. Every coordinate is a
 * WORLD tile; the border ring is refused except the frame's listed
 * SEAM cells; the carve predicate is kept for the pattern (no route
 * comes within a hundred tiles of the bowl: roadDist is Infinity
 * here, and 9e's frames will meet the belt's trails); WEARABLE is
 * Grass, GrassTall, Dirt, Sand, CaveFloor and the base TILE_SKIP.
 *
 * The brushes the Sett has that the north does not:
 *  - level(x,y) / rim(x,y): worldgen's own level at the shipped seed
 *    (generateChunk, pure) with the frame's listed EDITS applied, and
 *    the builder's 8-neighbour rim law over it. THE SHAPE IS READ.
 *  - mask(): every level<0 cell sunk to its own level with CaveFloor
 *    under it; every rim cell painted Cliff verbatim (mask.ts).
 *  - floor(x,y,tile): a floor tile on a sunk, non-rim cell only.
 *  - water(cells): WaterShallow on −2 floor cells only; a rim throws.
 *  - course(pts, opts): THE COURSE BRUSH along an ORTHOGONAL polyline
 *    (a diagonal step throws; the thread's law): CourseWall run tiles,
 *    a CourseStile replacing every twelfth, a PlumbStone every
 *    fortieth, the counter from the north gap carried across frames by
 *    the pins' COURSE_START; never a stile or a stone at a corner (it
 *    shifts to the next straight tile). Returns the counter after the
 *    run so the next frame's start is derived, never remembered.
 *  - ash(x,y): Detail.Ash on the four cardinals of a hearth, never on
 *    its own cell (K1 as the Ashlamp fixed it).
 *  - stand(x,y): Dirt under a post that stands all day (never in water).
 *  - put() refuses a prop on a rim cell (no prop on a rim; the rim is
 *    Cliff or a tread) and anything on the border but the seam.
 *
 * The hash salt is the Sett's own (settRng), never meadRng's
 * 0x2f61a3b7, ashRng's 0x5a1f0c3d, fenRng's 0x7e2b91a5 or wardRng's
 * 0x51c3a7d9, so no two zones rag alike.
 */
import { CHUNK_SIZE, Detail, TILE_SKIP, Tile, tileIndex, type ChunkData } from '@arx/shared';
import { ROAD_HALF, ROAD_SHOULDER, TRAIL_HALF, roadHitAt } from '../../geography.js';
import { WORLD_SEED, generateChunk } from '../../worldgen.js';
import type { ZoneBuilder } from '../builder.js';
import { COURSE_LAW, PINS, type Box4, type Frame, type Pt } from './pins.js';

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  owner: string;
}

export interface QueuedDetail {
  x: number;
  y: number;
  d: Detail;
}

export interface CourseTile {
  x: number;
  y: number;
  /** The counter's value at this tile (0 = the north gap). */
  i: number;
  tile: Tile;
}

/** What lint.ts reads after the build: every declaration the scenes made (world tiles). */
export interface SettRegistry {
  boxes: Box[];
  details: QueuedDetail[];
  occluders: Pt[];
  posts: Pt[];
  /** Every Course tile the brush laid, in order, with its counter. */
  course: CourseTile[];
  /** Every water cell the brush painted. */
  water: Pt[];
  /** The mask's ledger: sunk cells by level, rim cells painted, edits applied. */
  mask: { sunk: Record<number, number>; rim: number; edits: string[] };
}

export interface WearLineOpts {
  width?: 1 | 2 | 3;
  wobble?: number;
  tile?: Tile;
  /**
   * THE BROKEN TRAIL (the floor pass): the hash drops this fraction of
   * the line's cells (never the two ends, never two in a row), so a
   * trail on rock reads as feet that found the same way, not a laid
   * ribbon. 0 (the default, every other zone's) paints every cell.
   */
  gap?: number;
}

export interface WearBrushes {
  line(pts: ReadonlyArray<Pt>, opts?: WearLineOpts): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, tile?: Tile): void;
  rect(x0: number, y0: number, x1: number, y1: number, tile?: Tile): void;
  tufts(cx: number, cy: number, rx: number, ry: number, density: number, tile?: Tile): void;
}

export interface CourseOpts {
  /** The counter's value at the first tile (the frame's COURSE_START by default). */
  start?: number;
  stileEvery?: number;
  plumbEvery?: number;
}

export interface SettCtx {
  b: ZoneBuilder;
  frame: Frame;
  rng(x: number, y: number): number;
  pins: typeof PINS;
  /** Distance to the nearest route of any kind (Infinity in the bowl; kept for 9e's frames). */
  road(x: number, y: number): number;
  onBed(x: number, y: number): boolean;
  onShoulder(x: number, y: number): boolean;
  authorable(x: number, y: number): boolean;
  /** Worldgen's level at a WORLD cell with the frame's EDITS applied (pure). */
  level(x: number, y: number): number;
  /** The builder's rim law over level(): a cell with a lower 8-neighbour. */
  rim(x: number, y: number): boolean;
  /** Set a tile at a WORLD cell; throws on the border (but the seam), on a bed, or a prop on a rim. */
  put(x: number, y: number, tile: Tile): void;
  get(x: number, y: number): Tile;
  floor(x: number, y: number, tile: Tile): void;
  water(cells: ReadonlyArray<Pt>): void;
  course(pts: ReadonlyArray<Pt>, opts?: CourseOpts): number;
  ash(x: number, y: number): void;
  stand(x: number, y: number): void;
  rubble(x: number, y: number): void;
  box(x0: number, y0: number, x1: number, y1: number, owner: string): void;
  detail(x: number, y: number, d: Detail): void;
  wear: WearBrushes;
  occluder(x: number, y: number): void;
  post(x: number, y: number): void;
}

/** Stable per-tile randomness on the Sett's OWN salt. */
export function settRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x9d5e77c3;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const WEARABLE: ReadonlySet<number> = new Set([
  Tile.Grass, Tile.GrassTall, Tile.Dirt, Tile.Sand, Tile.CaveFloor, TILE_SKIP,
]);

/** The two tiles a rim cell may carry: the fence and the tread. */
const RIM_TILES: ReadonlySet<number> = new Set([Tile.Cliff, Tile.Ramp]);

function jitterAt(x: number, y: number, wobble: number): -1 | 0 | 1 {
  const r = settRng(x * 3 + 11, y * 5 + 7);
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

/** Worldgen's own chunk at a WORLD tile, at the shipped seed (cached per process; pure). */
const fieldChunks = new Map<string, ChunkData>();
function fieldChunk(x: number, y: number): ChunkData {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  const key = `${cx},${cy}`;
  let c = fieldChunks.get(key);
  if (!c) {
    c = generateChunk(WORLD_SEED, cx, cy);
    fieldChunks.set(key, c);
  }
  return c;
}
export function fieldGround(x: number, y: number): number {
  return fieldChunk(x, y).ground[tileIndex(x, y)]!;
}
/** Worldgen's own LEVEL at a WORLD tile (the read the mask stamps). */
export function fieldLevel(x: number, y: number): number {
  return fieldChunk(x, y).elev[tileIndex(x, y)]!;
}

/** THE BED, by the nearest route's own half (a trail is narrower than a road). */
export function bedAt(x: number, y: number): boolean {
  const hit = roadHitAt(WORLD_SEED, x, y);
  return hit !== null && hit.dist <= (hit.trail ? TRAIL_HALF : ROAD_HALF);
}
export function roadAt(x: number, y: number): number {
  return roadHitAt(WORLD_SEED, x, y)?.dist ?? Infinity;
}

/** The frame's level at a WORLD cell: worldgen's, with the listed EDITS over it. */
export function frameLevel(frame: Frame, x: number, y: number): number {
  for (const e of frame.EDITS) {
    for (const [ex, ey] of e.cells) if (ex === x && ey === y) return e.level;
  }
  return fieldLevel(x, y);
}

/** The builder's rim law: a cell with a LOWER 8-neighbour is the high side of a fence. */
export function frameRim(frame: Frame, x: number, y: number): boolean {
  const l = frameLevel(frame, x, y);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx !== 0 || dy !== 0) && frameLevel(frame, x + dx, y + dy) < l) return true;
    }
  }
  return false;
}

export function makeCtx(b: ZoneBuilder, frame: Frame): { ctx: SettCtx; registry: SettRegistry } {
  const registry: SettRegistry = {
    boxes: [],
    details: [],
    occluders: [],
    posts: [],
    course: [],
    water: [],
    mask: { sunk: {}, rim: 0, edits: [] },
  };
  const { ORIGIN, AUTHORABLE } = frame;
  const seam = new Set(frame.SEAM.map(([x, y]) => `${x},${y}`));
  const road = roadAt;
  const onBed = bedAt;
  const onShoulder = (x: number, y: number): boolean => road(x, y) <= ROAD_SHOULDER;
  const inRect = (x: number, y: number): boolean =>
    x >= ORIGIN.x && y >= ORIGIN.y && x < ORIGIN.x + frame.WIDTH && y < ORIGIN.y + frame.HEIGHT;
  const authorable = (x: number, y: number): boolean =>
    (x >= AUTHORABLE.x0 && x <= AUTHORABLE.x1 && y >= AUTHORABLE.y0 && y <= AUTHORABLE.y1) || seam.has(`${x},${y}`);
  const level = (x: number, y: number): number => frameLevel(frame, x, y);
  const rim = (x: number, y: number): boolean => frameRim(frame, x, y);
  const get = (x: number, y: number): Tile => b.get(x - ORIGIN.x, y - ORIGIN.y);
  const put = (x: number, y: number, tile: Tile): void => {
    if (!authorable(x, y)) {
      throw new Error(`${frame.id}: (${x},${y}) lies outside the authorable interior x ${AUTHORABLE.x0}..${AUTHORABLE.x1} y ${AUTHORABLE.y0}..${AUTHORABLE.y1} (and is no listed seam)`);
    }
    if (onBed(x, y)) {
      throw new Error(`${frame.id}: (${x},${y}) lies on a carve's bed (${road(x, y).toFixed(2)} from the wandered route)`);
    }
    // NO PROP ON A RIM: a rim cell is the fence (Cliff) or a tread
    // (Ramp) and nothing else; a prop written there would be buried
    // by the auto-fence or throw under it.
    if (rim(x, y) && !RIM_TILES.has(tile)) {
      throw new Error(`${frame.id}: (${x},${y}) is a rim cell (level ${level(x, y)} with a lower neighbour); tile ${tile} may not stand on it`);
    }
    b.set(x - ORIGIN.x, y - ORIGIN.y, tile);
  };
  // THE CARVE IS THE REFUSAL: no wear brush ever paints a bed, the
  // border ring, or a rim (Cliff is not wearable).
  const paint = (x: number, y: number, tile: Tile): void => {
    if (!authorable(x, y)) return;
    if (onBed(x, y)) return;
    if (rim(x, y)) return;
    if (WEARABLE.has(get(x, y))) b.set(x - ORIGIN.x, y - ORIGIN.y, tile);
  };

  const line = (pts: ReadonlyArray<Pt>, opts: WearLineOpts = {}): void => {
    const width = opts.width ?? 1;
    const wobble = opts.wobble ?? 0.35;
    const tile = opts.tile ?? Tile.Dirt;
    const gap = opts.gap ?? 0;
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
    let dropped = false;
    const last = cells.length - 1;
    for (let i = 0; i <= last; i++) {
      const c = cells[i]!;
      let j: number;
      if (i === 0 || i === last) {
        j = 0;
      } else if (prevJ !== 0) {
        const hold = settRng(c.x + 5, c.y + 3) < 0.45 ? 1 : 2;
        j = run >= hold ? 0 : prevJ;
      } else if (rest > 0) {
        j = 0;
        rest--;
      } else {
        j = jitterAt(c.x, c.y, wobble);
      }
      if (j !== 0 && onBed(c.x + c.px * j, c.y + c.py * j)) j = 0;
      if (prevJ !== 0 && j === 0) rest = settRng(c.x + 9, c.y + 1) < 0.5 ? 1 : 2;
      run = j !== 0 && j === prevJ ? run + 1 : j !== 0 ? 1 : 0;
      const cx = c.x + c.px * j;
      const cy = c.y + c.py * j;
      prevJ = j;
      // THE BROKEN TRAIL: a dropped cell keeps the wobble's state (the
      // trail bends where it bends) and paints nothing.
      const drop: boolean = gap > 0 && i !== 0 && i !== last && !dropped && settRng(cx + 23, cy + 41) < gap;
      dropped = drop;
      if (drop) continue;
      paint(cx, cy, tile);
      if (width >= 2) {
        paint(cx + c.px, cy + c.py, tile);
        if (settRng(cx + 17, cy + 29) < 0.25) paint(cx - c.px, cy - c.py, tile);
        if (settRng(cx + 31, cy + 13) < 0.25) paint(cx + c.px * 2, cy + c.py * 2, tile);
      }
      if (width >= 3) {
        paint(cx - c.px, cy - c.py, tile);
        if (settRng(cx + 43, cy + 47) < 0.2) paint(cx - c.px * 2, cy - c.py * 2, tile);
      }
    }
  };

  const ellipse = (cx: number, cy: number, rx: number, ry: number, tile: Tile = Tile.Dirt): void => {
    for (let iy = Math.floor(cy - ry); iy <= cy + ry; iy++) {
      for (let ix = Math.floor(cx - rx); ix <= cx + rx; ix++) {
        const dx = (ix - cx) / rx;
        const dy = (iy - cy) / ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        if (d2 >= 0.6 && settRng(ix, iy) > 0.55) continue;
        paint(ix, iy, tile);
      }
    }
  };

  const rect = (x0: number, y0: number, x1: number, y1: number, tile: Tile = Tile.Dirt): void => {
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const edgeX = ix === x0 || ix === x1;
        const edgeY = iy === y0 || iy === y1;
        if (edgeX && edgeY) {
          if (settRng(ix, iy) > 0.35) continue;
        } else if (edgeX || edgeY) {
          if (settRng(ix, iy) > 0.55) continue;
        }
        paint(ix, iy, tile);
      }
    }
  };

  const tufts = (cx: number, cy: number, rx: number, ry: number, density: number, tile: Tile = Tile.GrassTall): void => {
    for (let iy = Math.floor(cy - ry); iy <= cy + ry; iy++) {
      for (let ix = Math.floor(cx - rx); ix <= cx + rx; ix++) {
        const dx = (ix - cx) / rx;
        const dy = (iy - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        if (!authorable(ix, iy) || onShoulder(ix, iy) || rim(ix, iy)) continue;
        const under = get(ix, iy);
        if ((under as number) !== TILE_SKIP && under !== Tile.Grass) continue;
        if (settRng(ix + 53, iy + 71) < density) b.set(ix - ORIGIN.x, iy - ORIGIN.y, tile);
      }
    }
  };

  const ctx: SettCtx = {
    b,
    frame,
    rng: settRng,
    pins: PINS,
    road,
    onBed,
    onShoulder,
    authorable,
    level,
    rim,
    put,
    get,
    floor(x, y, tile) {
      if (level(x, y) >= 0) throw new Error(`${frame.id}: floor at (${x},${y}) wants a sunk cell (level ${level(x, y)})`);
      put(x, y, tile);
    },
    water(cells) {
      // THE WET FLOOR: WaterShallow on −2 floor cells only. A floor
      // tile is never a rim; WaterShallow on a rim would throw in the
      // auto-fence (water is not fenceable), so the brush refuses it
      // first, with the cell.
      for (const [x, y] of cells) {
        if (level(x, y) !== -2) throw new Error(`${frame.id}: water at (${x},${y}) wants the −2 floor (level ${level(x, y)})`);
        if (rim(x, y)) throw new Error(`${frame.id}: water at (${x},${y}) lies on a rim`);
        put(x, y, Tile.WaterShallow);
        registry.water.push([x, y]);
      }
    },
    course(pts, opts = {}) {
      // THE LINE IS ONE LINE: every step of the polyline lies on one
      // axis, so the painter's N/E/S/W read finds two neighbours on
      // every tile but the two ends.
      if (pts.length < 2) throw new Error(`${frame.id}: a course needs two points`);
      const cells: Array<{ x: number; y: number; corner: boolean }> = [{ x: pts[0]![0], y: pts[0]![1], corner: false }];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const c = pts[i]!;
        if (a[0] !== c[0] && a[1] !== c[1]) {
          throw new Error(`${frame.id}: course step (${a[0]},${a[1]}) -> (${c[0]},${c[1]}) is diagonal; the line is one line`);
        }
        const step = stepCells(a, c);
        for (let k = 0; k < step.length; k++) {
          const [x, y] = step[k]!;
          // A vertex that is not an end is a corner: never a stile or a stone there.
          const corner = k === step.length - 1 && i < pts.length - 1;
          cells.push({ x, y, corner });
        }
      }
      const stileEvery = opts.stileEvery ?? COURSE_LAW.stileEvery;
      const plumbEvery = opts.plumbEvery ?? COURSE_LAW.plumbEvery;
      let i = opts.start ?? frame.COURSE_START;
      let pending: Tile | null = null;
      for (const c of cells) {
        let tile: Tile = Tile.CourseWall;
        if (i > 0 && i % plumbEvery === 0) tile = Tile.PlumbStone;
        else if (i % stileEvery === 0) tile = Tile.CourseStile;
        if (tile !== Tile.CourseWall && c.corner) {
          // The stile shifts to the next straight tile.
          pending = tile;
          tile = Tile.CourseWall;
        } else if (tile === Tile.CourseWall && pending !== null && !c.corner) {
          tile = pending;
          pending = null;
        }
        put(c.x, c.y, tile);
        registry.course.push({ x: c.x, y: c.y, i, tile });
        i++;
      }
      return i;
    },
    ash(x, y) {
      // THE PAN READS AGAINST THE ASH (K1): the bed's own cell carries
      // no ash; its four cardinals do, where they are floor.
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (!authorable(nx, ny) || onBed(nx, ny) || rim(nx, ny)) continue;
        ctx.detail(nx, ny, Detail.Ash);
      }
    },
    stand(x, y) {
      // A body that stands all day wears its patch; a body in the
      // water stands in the water.
      const under = get(x, y);
      if (under === Tile.WaterShallow) return;
      if (WEARABLE.has(under)) put(x, y, Tile.Dirt);
    },
    rubble(x, y) {
      put(x, y, Tile.CaveRubble);
    },
    box(x0, y0, x1, y1, owner) {
      registry.boxes.push({ x0, y0, x1, y1, owner });
    },
    detail(x, y, d) {
      if (!authorable(x, y) || onBed(x, y)) {
        throw new Error(`${frame.id}: detail at (${x},${y}) must stand inside the interior and off the bed`);
      }
      if (rim(x, y)) throw new Error(`${frame.id}: detail at (${x},${y}) may not mark a rim`);
      registry.details.push({ x, y, d });
    },
    wear: { line, ellipse, rect, tufts },
    occluder(x, y) {
      registry.occluders.push([x, y]);
    },
    post(x, y) {
      registry.posts.push([x, y]);
    },
  };
  void inRect;
  return { ctx, registry };
}

export type { Box4 };
