/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — THE CTX.
 *
 * The fen waist's ctx COPIED for three patches on worldgen (the
 * Ashlamp's, itself the Dawnmead ctx copied; site-grammar §6.2: no
 * shared lib until the Sett is the third consumer), bound to ONE
 * FRAME at a time (pins.WARDTHREAD, PICKET or TURNOFF) since one
 * module builds three rects. Every coordinate is a WORLD tile; the
 * carve is the refusal (the bed of the nearest route, read through
 * roadHitAt with the shipped seed and the route's OWN half: a trail's
 * bed is TRAIL_HALF, a road's ROAD_HALF, so the picket on the trail
 * and the line on the road argue with the same predicate); WEARABLE
 * is Grass, GrassTall, Dirt, Swamp and the base TILE_SKIP. No cell may
 * be authored inside any bed this band (no BAR_GAP twin).
 *
 * The three brushes the north has that the ford does not:
 *  - thread(pts): WardThread along an ORTHOGONAL polyline; any
 *    diagonal step throws, because the line is one line (owed F2).
 *  - ring(stone, snags): a GloomStone with its three DeadTree and
 *    Detail.BlightVeins on its own cell and its four neighbours — the
 *    ground the stone sickens, and nowhere else (lint.blightUnderGloom).
 *  - graves(pts): GraveMound on bare grass only (the Company dug in a
 *    hurry; a mound on worn Dirt is a mound in a yard, refused).
 *
 * The hash salt is the north's own (wardRng), never meadRng's, ashRng's
 * or fenRng's, so no two zones rag alike.
 */
import { CHUNK_SIZE, Detail, TILE_SKIP, TREE_TILES, Tile, tileIndex, treeOfSapling, type ChunkData } from '@arx/shared';
import { ROAD_HALF, ROAD_SHOULDER, TRAIL_HALF, roadHitAt } from '../../geography.js';
import { WORLD_SEED, generateChunk } from '../../worldgen.js';
import type { ZoneBuilder } from '../builder.js';
import { PINS, type Box4, type Frame, type Pt } from './pins.js';

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
export interface WardRegistry {
  boxes: Box[];
  signs: QueuedSign[];
  details: QueuedDetail[];
  occluders: Pt[];
  doors: Pt[];
  posts: Pt[];
  stations: Pt[];
  /** Every thread tile the brush laid, in order. */
  thread: Pt[];
  /** Every fell pocket with its owner (the trunk law's ledger). */
  fells: Box[];
}

export interface WearLineOpts {
  width?: 1 | 2 | 3;
  wobble?: number;
  tile?: Tile;
}

export interface WearBrushes {
  line(pts: ReadonlyArray<Pt>, opts?: WearLineOpts): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, tile?: Tile): void;
  rect(x0: number, y0: number, x1: number, y1: number, tile?: Tile): void;
  /** Tufts hashed inside an ellipse over natural ground (the ash vocabulary's GrassTall). */
  tufts(cx: number, cy: number, rx: number, ry: number, density: number, tile?: Tile): void;
}

export interface WardCtx {
  b: ZoneBuilder;
  frame: Frame;
  rng(x: number, y: number): number;
  pins: typeof PINS;
  /** Distance to the nearest route of any kind (the wandered carve). */
  road(x: number, y: number): number;
  /** Inside the nearest route's bed, by that route's own half (trail 1.1, road 1.6). */
  onBed(x: number, y: number): boolean;
  onShoulder(x: number, y: number): boolean;
  authorable(x: number, y: number): boolean;
  /** Set a tile at a WORLD cell; throws on any bed or outside the interior. */
  put(x: number, y: number, tile: Tile): void;
  get(x: number, y: number): Tile;
  box(x0: number, y0: number, x1: number, y1: number, owner: string): void;
  sign(x: number, y: number, title: string, lines?: readonly string[], tile?: Tile): void;
  detail(x: number, y: number, d: Detail): void;
  wear: WearBrushes;
  /**
   * THE FELLING (the occlusion law at the true frame, the trunk law):
   * every cell of the box (inclusive, world tiles) that the zone has
   * not authored and that worldgen grows a TREE on becomes plain
   * Grass. Only trees fall; grass, tall grass, rock and the rest keep
   * their kind; the bed and the border are refused. Reads worldgen at
   * the shipped seed (pure), so the build stays byte-identical. The
   * pocket is filed in the registry with its owner.
   */
  fell(box: Box4, owner: string): void;
  thread(pts: ReadonlyArray<Pt>): void;
  ring(stone: Pt, snags: ReadonlyArray<Pt>): void;
  graves(pts: ReadonlyArray<Pt>): void;
  emberBed(x: number, y: number): void;
  deadTree(x: number, y: number): void;
  occluder(x: number, y: number): void;
  door(x: number, y: number): void;
  post(x: number, y: number): void;
  station(x: number, y: number): void;
}

/** Stable per-tile randomness on the north's OWN salt (never meadRng's, ashRng's or fenRng's). */
export function wardRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x51c3a7d9;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const WEARABLE: ReadonlySet<number> = new Set([
  Tile.Grass, Tile.GrassTall, Tile.Dirt, Tile.Swamp, TILE_SKIP,
]);

function jitterAt(x: number, y: number, wobble: number): -1 | 0 | 1 {
  const r = wardRng(x * 3 + 11, y * 5 + 7);
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
export function fieldGround(x: number, y: number): number {
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

/** THE BED, by the nearest route's own half (a trail is narrower than a road). */
export function bedAt(x: number, y: number): boolean {
  const hit = roadHitAt(WORLD_SEED, x, y);
  return hit !== null && hit.dist <= (hit.trail ? TRAIL_HALF : ROAD_HALF);
}
export function roadAt(x: number, y: number): number {
  return roadHitAt(WORLD_SEED, x, y)?.dist ?? Infinity;
}

export function makeCtx(b: ZoneBuilder, frame: Frame): { ctx: WardCtx; registry: WardRegistry } {
  const registry: WardRegistry = {
    boxes: [],
    signs: [],
    details: [],
    occluders: [],
    doors: [],
    posts: [],
    stations: [],
    thread: [],
    fells: [],
  };
  const { ORIGIN, AUTHORABLE } = frame;
  const road = roadAt;
  const onBed = bedAt;
  const onShoulder = (x: number, y: number): boolean => road(x, y) <= ROAD_SHOULDER;
  const authorable = (x: number, y: number): boolean =>
    x >= AUTHORABLE.x0 && x <= AUTHORABLE.x1 && y >= AUTHORABLE.y0 && y <= AUTHORABLE.y1;
  const get = (x: number, y: number): Tile => b.get(x - ORIGIN.x, y - ORIGIN.y);
  const put = (x: number, y: number, tile: Tile): void => {
    if (!authorable(x, y)) {
      throw new Error(`${frame.id}: (${x},${y}) lies outside the authorable interior x ${AUTHORABLE.x0}..${AUTHORABLE.x1} y ${AUTHORABLE.y0}..${AUTHORABLE.y1}`);
    }
    if (onBed(x, y)) {
      throw new Error(`${frame.id}: (${x},${y}) lies on a carve's bed (${road(x, y).toFixed(2)} from the wandered route)`);
    }
    b.set(x - ORIGIN.x, y - ORIGIN.y, tile);
  };
  // THE CARVE IS THE REFUSAL: no wear brush ever paints a bed or the
  // border ring.
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
        const hold = wardRng(c.x + 5, c.y + 3) < 0.45 ? 1 : 2;
        j = run >= hold ? 0 : prevJ;
      } else if (rest > 0) {
        j = 0;
        rest--;
      } else {
        j = jitterAt(c.x, c.y, wobble);
      }
      if (j !== 0 && onBed(c.x + c.px * j, c.y + c.py * j)) j = 0;
      if (prevJ !== 0 && j === 0) rest = wardRng(c.x + 9, c.y + 1) < 0.5 ? 1 : 2;
      run = j !== 0 && j === prevJ ? run + 1 : j !== 0 ? 1 : 0;
      const cx = c.x + c.px * j;
      const cy = c.y + c.py * j;
      paint(cx, cy, tile);
      if (width >= 2) {
        paint(cx + c.px, cy + c.py, tile);
        if (wardRng(cx + 17, cy + 29) < 0.25) paint(cx - c.px, cy - c.py, tile);
        if (wardRng(cx + 31, cy + 13) < 0.25) paint(cx + c.px * 2, cy + c.py * 2, tile);
      }
      if (width >= 3) {
        paint(cx - c.px, cy - c.py, tile);
        if (wardRng(cx + 43, cy + 47) < 0.2) paint(cx - c.px * 2, cy - c.py * 2, tile);
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
        if (d2 >= 0.6 && wardRng(ix, iy) > 0.55) continue;
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
          if (wardRng(ix, iy) > 0.35) continue;
        } else if (edgeX || edgeY) {
          if (wardRng(ix, iy) > 0.55) continue;
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
        if (!authorable(ix, iy) || onShoulder(ix, iy)) continue;
        const under = get(ix, iy);
        if ((under as number) !== TILE_SKIP && under !== Tile.Grass) continue;
        if (wardRng(ix + 53, iy + 71) < density) b.set(ix - ORIGIN.x, iy - ORIGIN.y, tile);
      }
    }
  };

  const deadTree = (x: number, y: number): void => {
    const under = get(x, y);
    if (under !== Tile.Grass && under !== Tile.GrassTall && (under as number) !== TILE_SKIP) {
      throw new Error(`${frame.id}: DeadTree at (${x},${y}) must stand on natural ground, not tile ${under}`);
    }
    put(x, y, Tile.DeadTree);
    registry.occluders.push([x, y]);
  };

  const ctx: WardCtx = {
    b,
    frame,
    rng: wardRng,
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
      if (!authorable(x, y) || onBed(x, y)) {
        throw new Error(`${frame.id}: detail at (${x},${y}) must stand inside the interior and off the bed`);
      }
      registry.details.push({ x, y, d });
    },
    wear: { line, ellipse, rect, tufts },
    fell(box, owner) {
      for (let y = box.y0; y <= box.y1; y++) {
        for (let x = box.x0; x <= box.x1; x++) {
          if (!authorable(x, y) || onBed(x, y)) continue;
          if ((get(x, y) as number) !== TILE_SKIP) continue;
          // A fell takes the sapling too (band 8 fix pass): worldgen
          // deals a sapling where a tree fell and regrew, and a
          // sapling left standing regrows the very occluder the
          // pocket was dug to remove (the proof found one against
          // the head stone's south leg).
          const g = fieldGround(x, y) as Tile;
          if (TREE_TILES.has(g) || treeOfSapling(g) !== null) b.set(x - ORIGIN.x, y - ORIGIN.y, Tile.Grass);
        }
      }
      registry.fells.push({ ...box, owner });
    },
    thread(pts) {
      // THE LINE IS ONE LINE: every step of the polyline lies on one
      // axis, so the painter's N/E/S/W read (A5) finds two neighbours
      // on every tile but the two ends.
      if (pts.length < 2) throw new Error(`${frame.id}: a thread needs two points`);
      const cells: Pt[] = [pts[0]!];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const c = pts[i]!;
        if (a[0] !== c[0] && a[1] !== c[1]) {
          throw new Error(`${frame.id}: thread step (${a[0]},${a[1]}) -> (${c[0]},${c[1]}) is diagonal; the line is one line`);
        }
        cells.push(...stepCells(a, c));
      }
      for (const [x, y] of cells) {
        put(x, y, Tile.WardThread);
        registry.thread.push([x, y]);
      }
    },
    ring(stone, snags) {
      // The grey point, the bruise on its cell and its four sides, and
      // the three dead standing round it.
      const [sx, sy] = stone;
      put(sx, sy, Tile.GloomStone);
      registry.occluders.push([sx, sy]);
      ctx.detail(sx, sy, Detail.BlightVeins);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (!authorable(nx, ny) || onBed(nx, ny)) continue;
        if (get(nx, ny) === Tile.WardThread) {
          // The thread runs over the forest floor as found (G5): the
          // bruise stops at the thread's own cell.
          continue;
        }
        ctx.detail(nx, ny, Detail.BlightVeins);
      }
      for (const [x, y] of snags) deadTree(x, y);
    },
    graves(pts) {
      for (const [x, y] of pts) {
        const under = get(x, y);
        if ((under as number) !== TILE_SKIP && under !== Tile.Grass) {
          throw new Error(`${frame.id}: GraveMound at (${x},${y}) wants bare grass, not tile ${under} (the Company dug in a hurry)`);
        }
        put(x, y, Tile.GraveMound);
      }
    },
    emberBed(x, y) {
      // THE PAN READS AGAINST THE ASH (K1 as the Ashlamp fixed it): the
      // bed's own cell carries no ash; the scene lays the ash round it.
      put(x, y, Tile.EmberBed);
    },
    deadTree,
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
