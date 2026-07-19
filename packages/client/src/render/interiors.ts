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
 * Regions are computed lazily per queried tile and cached until the
 * world changes (worldVersion bump ⇒ full clear; recompute is bounded
 * by MAX_REGION and only runs for tiles actually asked about).
 */
import { Detail, INTERIOR_BOUNDARY_TILES, Tile, hashCoords } from '@devcraft/shared';
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
  /** Facade story count from authored Detail.Story markers. */
  stories: 1 | 2 | 3;
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

  /** Version gate: any world change invalidates every cached region. */
  beginFrame(version: number): void {
    if (version !== this.version) {
      this.version = version;
      this.byTile.clear();
      this.nextId = 1;
    }
  }

  /** The enclosed region containing this tile, or null for outdoors. */
  regionAt(game: ClientGame, tx: number, ty: number): InteriorRegion | null {
    const key = packTile(tx, ty);
    const hit = this.byTile.get(key);
    if (hit !== undefined) return hit;
    return this.flood(game, tx, ty);
  }

  private flood(game: ClientGame, sx: number, sy: number): InteriorRegion | null {
    const world = game.world;
    const start = world.groundAt(sx, sy);
    if (start === undefined || BOUNDARY.has(start)) {
      this.byTile.set(packTile(sx, sy), null);
      return null;
    }
    const tiles = new Set<number>();
    const wallTiles = new Set<number>();
    const doorTiles: Array<{ tx: number; ty: number }> = [];
    const queue: Array<[number, number]> = [[sx, sy]];
    tiles.add(packTile(sx, sy));
    let x0 = sx;
    let y0 = sy;
    let x1 = sx;
    let y1 = sy;
    let stone = 0;
    let wood = 0;
    let stories: 1 | 2 | 3 = 1;
    let hasHearth = false;
    const elevLevel = world.elevAt(sx, sy);
    let outdoor = false;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!;
      const ground = world.groundAt(cx, cy);
      if (ground === Tile.Hearth || ground === Tile.Campfire || ground === Tile.Furnace) {
        hasHearth = true;
      }
      const d = world.detailAt(cx, cy);
      if (d === Detail.Story3) stories = 3;
      else if (d === Detail.Story2 && stories < 3) stories = 2;
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
          if (t === Tile.WallStone || t === Tile.WallStoneWindow || t === Tile.DoorwayStone) stone++;
          else if (t === Tile.CaveWall) stone++;
          else wood++;
          if (t === Tile.DoorwayStone || t === Tile.DoorwayWood) doorTiles.push({ tx: nx, ty: ny });
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
      stories,
      hasHearth,
      elevLevel,
      seed: hashCoords(131, x0, y0) ^ (x1 - x0) ^ ((y1 - y0) << 8),
    };
    for (const k of tiles) this.byTile.set(k, region);
    return region;
  }
}
