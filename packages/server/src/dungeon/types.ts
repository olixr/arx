import {
  DOOR_TILES,
  Rng,
  Tile,
  isSolidTile,
  type DungeonSpec,
  type ThemeLaw,
  type Vec2,
} from '@arx/shared';
import type { ZoneSpawn } from '@arx/content';

/**
 * THE LONG DARK — the dungeon pipeline's shared model.
 *
 * The old generator was one 700-line function whose intermediate
 * knowledge (rooms, edges, depth, corridor paths) evaporated between
 * passes. This model is the seam: every pass reads and enriches the
 * same `DungeonBuild`, so plan topology survives into carving, carved
 * geometry survives into dressing, and dressing's reach masks survive
 * into the garrison. New features join a pass; they never re-derive.
 */

/** What a room IS in the journey — drives carving, dressing, garrison. */
export type RoomKind =
  | 'entry'
  | 'boss'
  | 'room'
  | 'vault'
  | 'camp'
  | 'forge'
  | 'spring'
  | 'ossuary'
  | 'den';

/** The two carving dialects — natural cavern vs worked masonry. */
export type RoomStyle = 'cave' | 'hall';

/**
 * The room's architectural archetype, picked in the carve pass:
 * organic blobs and twin-lobed caverns for caves; plain halls,
 * pillared halls, rotundas and long galleries for masonry.
 */
export type RoomArch = 'blob' | 'twinlobe' | 'hall' | 'pillared' | 'rotunda' | 'gallery';

export interface Room {
  x: number;
  y: number;
  kind: RoomKind;
  style: RoomStyle;
  arch: RoomArch;
  /** Rough carved radius, for dressing/garrison density. */
  r: number;
  /** Graph depth from the entry (loops folded). */
  depth: number;
  degree: number;
  /** True for rungs of the critical path entry → champion's court. */
  onSpine: boolean;
}

export interface Edge {
  a: number;
  b: number;
}

/** The tile canvas all passes carve into. */
export class Carver {
  readonly ground: Uint16Array;
  readonly detail: Uint16Array;
  constructor(readonly s: number) {
    this.ground = new Uint16Array(s * s).fill(Tile.CaveWall);
    this.detail = new Uint16Array(s * s);
  }

  inb(x: number, y: number): boolean {
    // A two-tile rock apron all round: the zone seam never shows.
    return x >= 2 && y >= 2 && x < this.s - 2 && y < this.s - 2;
  }

  get(x: number, y: number): Tile {
    if (x < 0 || y < 0 || x >= this.s || y >= this.s) return Tile.CaveWall;
    return this.ground[y * this.s + x] as Tile;
  }

  set(x: number, y: number, t: Tile): void {
    if (this.inb(x, y)) this.ground[y * this.s + x] = t;
  }

  /** Carve to floor; never demotes an existing floor-ish tile. */
  carve(x: number, y: number, t: Tile): void {
    if (!this.inb(x, y)) return;
    const cur = this.get(x, y);
    if (cur === Tile.CaveWall || cur === Tile.CrackedCaveWall || cur === Tile.WallStone) {
      this.set(x, y, t);
    }
  }

  isRock(x: number, y: number): boolean {
    const t = this.get(x, y);
    return t === Tile.CaveWall || t === Tile.CrackedCaveWall || t === Tile.WallStone;
  }

  /**
   * Walkable for the run-through: floors, water, and door tiles.
   * With `cracksOpen`, cracked walls count too — "reachable once the
   * player smashes through", the hidden-prize guarantee.
   */
  passable(x: number, y: number, cracksOpen = false): boolean {
    const t = this.get(x, y);
    if (cracksOpen && t === Tile.CrackedCaveWall) return true;
    return !isSolidTile(t) || DOOR_TILES.has(t);
  }
}

/**
 * The build in flight — one object handed pass to pass. Fields are
 * grouped by the pass that OWNS (writes) them; later passes read.
 */
export interface DungeonBuild {
  readonly spec: DungeonSpec;
  readonly theme: ThemeLaw;
  /**
   * THE TURNED SEED: the spec's modifier ids (dungeonModifiers of the
   * seed), derived once in the orchestrator — passes read membership,
   * never re-derive.
   */
  readonly mods: ReadonlySet<string>;
  readonly c: Carver;
  readonly origin: Vec2;
  readonly returnTo: Vec2;
  /** Named RNG streams — one per pass, the no-reshuffle law. */
  readonly rLayout: Rng;
  readonly rCarve: Rng;
  readonly rSecret: Rng;
  readonly rDress: Rng;
  readonly rMobs: Rng;

  // ---- PLAN owns
  rooms: Room[];
  edges: Edge[];
  /** Room indexes of the critical path, entry first, court last. */
  spine: number[];
  bossIdx: number;

  // ---- CARVE owns
  /** Recorded corridor centers per edge (same order as `edges`). */
  corridorPaths: Array<Array<{ x: number; y: number }>>;
  /** Hidden-room prize cells (behind cracked walls). */
  hiddenRooms: Array<{ x: number; y: number }>;

  // ---- DRESS owns
  openMask: Uint8Array;
  secretMask: Uint8Array;
  placedChests: Array<{ x: number; y: number }>;
  oreSpots: Array<{ x: number; y: number }>;
  /**
   * Everything dressing places over floor — pulled by the repair
   * sweep if it ever pinches a prize off the road.
   */
  removables: Array<{ x: number; y: number; was: Tile }>;
  /** The champion's chest (local coords), found after the arena stamp. */
  bossChest: { x: number; y: number } | null;

  // ---- GARRISON owns
  spawns: ZoneSpawn[];
  /** Index into `spawns` of the champion — the ward reads his life. */
  bossSpawnIndex: number | null;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** BFS over passable tiles from one point; returns the visited mask. */
export function reachMask(c: Carver, sx: number, sy: number, cracksOpen = false): Uint8Array {
  const seen = new Uint8Array(c.s * c.s);
  if (!c.passable(sx, sy, cracksOpen)) return seen;
  const queue = [sy * c.s + sx];
  seen[sy * c.s + sx] = 1;
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % c.s;
    const y = Math.floor(i / c.s);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= c.s || ny >= c.s) continue;
      const ni = ny * c.s + nx;
      if (seen[ni] || !c.passable(nx, ny, cracksOpen)) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  return seen;
}

/** A target counts as reached if it or any orthogonal neighbor is. */
export function reached(seen: Uint8Array, s: number, x: number, y: number): boolean {
  if (seen[y * s + x]) return true;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < s && ny < s && seen[ny * s + nx]) return true;
  }
  return false;
}
