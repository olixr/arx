/**
 * INTERIOR DETECTION — derived, never authored. A building is any
 * region of tiles fully enclosed by INTERIOR_BOUNDARY_TILES (walls,
 * windowed walls, and doorways — a doorway-closed ring encloses;
 * arches and railings deliberately never bound a room). Because the
 * regions are flood-filled from the live tile grid, player-built
 * enclosures earn the cutaway wall, sun-shadow shelter, and warm
 * windows with zero server work, and a demolished wall un-rooms the
 * space the moment the patch lands.
 *
 * THE BREACH LAW: a ONE-TILE hole in an otherwise continuous wall
 * run — walkable ground flanked by boundary tiles on both sides of
 * one axis — seals like a phantom doorway instead of leaking the
 * flood. Dilapidated buildings (the Dawnmead rat shed's sagging
 * walls) stay rooms, so the wall reveal and shelter gate still work
 * inside them. Wider collapses stay open: at two-plus tiles the wall
 * has stopped being a wall. Standing IN the hole itself resolves no
 * region, exactly like standing on a doorway tile.
 *
 * Regions are computed lazily per queried tile and cached until the
 * world changes (worldVersion bump ⇒ full clear; recompute is bounded
 * by MAX_REGION and only runs for tiles actually asked about).
 */
import { INTERIOR_BOUNDARY_TILES, Tile, diagWallInfo, doorInfo, hashCoords } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';

export interface InteriorRegion {
  id: number;
  /** Packed interior tile keys (floors AND furniture inside). */
  tiles: Set<number>;
  /** Packed boundary-wall tile keys (the ring, doorways included). */
  wallTiles: Set<number>;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  doorTiles: Array<{ tx: number; ty: number }>;
  /** Majority boundary material (facade dressing follows it). */
  wallMaterial: Tile;
  /** A hearth/campfire/furnace inside: windows glow warm at night. */
  hasHearth: boolean;
  elevLevel: number;
  seed: number;
}

/** Beyond this footprint a space is a courtyard, not a room. */
const MAX_REGION = 400;

const BOUNDARY = new Set<number>(INTERIOR_BOUNDARY_TILES);

export function packTile(tx: number, ty: number): number {
  return (tx + 0x8000) * 65536 + (ty + 0x8000);
}

export class InteriorMap {
  private version = -1;
  private readonly byTile = new Map<number, InteriorRegion | null>();
  private nextId = 1;
  /** THE BUILDING LAW: rooms joined by a shared DOORWAY (or a breach
   *  hole) are one building — a union-find over region ids, built
   *  incrementally as floods discover their connectors. Party walls
   *  deliberately do NOT join: two row-houses sharing a wall run are
   *  two homes, and standing in one must never reveal the other. */
  private readonly buildingParent = new Map<number, number>();
  private readonly connectorOwner = new Map<number, number>();

  /** Version gate: any world change invalidates every cached region. */
  beginFrame(version: number): void {
    if (version !== this.version) {
      this.version = version;
      this.byTile.clear();
      this.buildingParent.clear();
      this.connectorOwner.clear();
      this.nextId = 1;
    }
  }

  private findRoot(id: number): number {
    let r = id;
    for (;;) {
      const p = this.buildingParent.get(r);
      if (p === undefined || p === r) break;
      r = p;
    }
    // Path compression keeps repeated frame queries O(1).
    let c = id;
    while (c !== r) {
      const n = this.buildingParent.get(c)!;
      this.buildingParent.set(c, r);
      c = n;
    }
    return r;
  }

  /** True when two regions belong to the same building (transitively
   *  connected through doorways/breaches). Same region counts. */
  sameBuilding(a: InteriorRegion, b: InteriorRegion): boolean {
    return a === b || this.findRoot(a.id) === this.findRoot(b.id);
  }

  /** The enclosed region containing this tile, or null for outdoors. */
  regionAt(game: ClientGame, tx: number, ty: number): InteriorRegion | null {
    const key = packTile(tx, ty);
    const hit = this.byTile.get(key);
    if (hit !== undefined) return hit;
    return this.flood(game, tx, ty);
  }

  /** THE BREACH LAW: a walkable one-tile gap flanked by boundary
   *  tiles across one axis is a hole in a wall run, not a way out. */
  private isBreach(game: ClientGame, tx: number, ty: number): boolean {
    const world = game.world;
    const n = world.groundAt(tx, ty - 1);
    const s = world.groundAt(tx, ty + 1);
    if (n !== undefined && s !== undefined && BOUNDARY.has(n) && BOUNDARY.has(s)) return true;
    const e = world.groundAt(tx + 1, ty);
    const w = world.groundAt(tx - 1, ty);
    return e !== undefined && w !== undefined && BOUNDARY.has(e) && BOUNDARY.has(w);
  }

  private flood(game: ClientGame, sx: number, sy: number): InteriorRegion | null {
    const world = game.world;
    const start = world.groundAt(sx, sy);
    if (start === undefined || BOUNDARY.has(start) || this.isBreach(game, sx, sy)) {
      // A breach start floods BOTH ways and would null-poison the
      // room's cache — the hole is wall-line, same as a doorway.
      this.byTile.set(packTile(sx, sy), null);
      return null;
    }
    const tiles = new Set<number>();
    const wallTiles = new Set<number>();
    const doorTiles: Array<{ tx: number; ty: number }> = [];
    /** Tiles that CONNECT rooms into one building: doorways and
     *  breach holes (walkable passages), never plain shared walls. */
    const connectors: Array<[number, number]> = [];
    const queue: Array<[number, number]> = [[sx, sy]];
    tiles.add(packTile(sx, sy));
    let x0 = sx;
    let y0 = sy;
    let x1 = sx;
    let y1 = sy;
    let stone = 0;
    let wood = 0;
    let hasHearth = false;
    const elevLevel = world.elevAt(sx, sy);
    let outdoor = false;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!;
      const ground = world.groundAt(cx, cy);
      if (ground === Tile.Hearth || ground === Tile.Campfire || ground === Tile.Furnace) {
        hasHearth = true;
      }
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        const nk = packTile(nx, ny);
        if (tiles.has(nk) || wallTiles.has(nk)) continue;
        const t = world.groundAt(nx, ny);
        if (t === undefined) {
          // Touching unloaded space: enclosure is unknowable — treat
          // as outdoors until the chunk streams in.
          outdoor = true;
          continue;
        }
        if (BOUNDARY.has(t)) {
          wallTiles.add(nk);
          if (
            t === Tile.WallStone ||
            t === Tile.WallStoneWindow ||
            t === Tile.DoorwayStone ||
            t === Tile.DoorwayStoneWide ||
            t === Tile.DoorwayStoneShut ||
            t === Tile.DoorwayStoneWideShut ||
            diagWallInfo(t)?.material === 'stone'
          ) {
            stone++;
          } else if (t === Tile.CaveWall) stone++;
          else wood++;
          // Open AND shut doorways both anchor the region's door list —
          // a door toggling must never re-shape the room it serves.
          if (doorInfo(t) !== null) {
            doorTiles.push({ tx: nx, ty: ny });
            connectors.push([nx, ny]);
          }
          continue;
        }
        if (this.isBreach(game, nx, ny)) {
          // Sealed hole in the run: bounds the room like the wall it
          // tore out of, joins the ring, never expands the flood.
          wallTiles.add(nk);
          connectors.push([nx, ny]);
          continue;
        }
        if (world.elevAt(nx, ny) !== elevLevel) {
          // A building can't straddle a cliff seam — degrade to
          // roofless rather than render a roof at the wrong lift.
          outdoor = true;
          continue;
        }
        tiles.add(nk);
        if (nx < x0) x0 = nx;
        if (nx > x1) x1 = nx;
        if (ny < y0) y0 = ny;
        if (ny > y1) y1 = ny;
        queue.push([nx, ny]);
      }
      if (tiles.size > MAX_REGION) {
        outdoor = true;
        break;
      }
    }

    if (outdoor) {
      for (const k of tiles) this.byTile.set(k, null);
      return null;
    }
    const region: InteriorRegion = {
      id: this.nextId++,
      tiles,
      wallTiles,
      x0,
      y0,
      x1,
      y1,
      doorTiles,
      wallMaterial: stone >= wood ? Tile.WallStone : Tile.WallWood,
      hasHearth,
      elevLevel,
      seed: hashCoords(131, x0, y0) ^ (x1 - x0) ^ ((y1 - y0) << 8),
    };
    for (const k of tiles) this.byTile.set(k, region);
    // THE BUILDING LAW bookkeeping: claim every connector; a
    // connector already claimed by an earlier flood means the two
    // rooms share a doorway — union them into one building.
    this.buildingParent.set(region.id, region.id);
    for (const [cx, cy] of connectors) {
      const k = packTile(cx, cy);
      const owner = this.connectorOwner.get(k);
      if (owner === undefined) {
        this.connectorOwner.set(k, region.id);
      } else {
        const ra = this.findRoot(region.id);
        const rb = this.findRoot(owner);
        if (ra !== rb) this.buildingParent.set(ra, rb);
      }
    }
    // Lazy discovery closes the union eagerly: resolve whatever
    // stands on the FAR side of each connector now (cache-bounded —
    // every room floods once per version), so a building's rooms
    // always know each other no matter which one was asked about
    // first. Without this, A|hall|B only unions if someone happens
    // to query the hall. Recursion is safe: this region's tiles are
    // cached above, and each flood runs once.
    for (const [cx, cy] of connectors) {
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (tiles.has(packTile(nx, ny))) continue;
        const t = world.groundAt(nx, ny);
        if (t === undefined || BOUNDARY.has(t)) continue;
        this.regionAt(game, nx, ny);
      }
    }
    return region;
  }
}
