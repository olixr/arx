import { Detail, Rng, Tile, hashString, type Vec2 } from '@devcraft/shared';
import type { PortalDef, ZoneDef, ZoneSpawn } from './types.js';

/**
 * Authoring API for hand-made zones. Zones are built by carving shapes
 * out of a base fill — readable, diffable, and tweakable in code. The
 * in-browser editor produces the same ZoneDef shape.
 */
export class ZoneBuilder {
  private readonly ground: Uint16Array;
  private readonly detail: Uint16Array;
  private spawnPoint: Vec2 | undefined;
  private readonly portals: PortalDef[] = [];
  private readonly zoneSpawns: ZoneSpawn[] = [];
  private readonly rng: Rng;

  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly origin: Vec2,
    readonly width: number,
    readonly height: number,
    baseTile: Tile,
  ) {
    this.ground = new Uint16Array(width * height).fill(baseTile);
    this.detail = new Uint16Array(width * height);
    this.rng = new Rng(hashString(id));
  }

  /** Local zone coords (0..width-1). */
  set(x: number, y: number, tile: Tile): this {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.ground[y * this.width + x] = tile;
    }
    return this;
  }

  get(x: number, y: number): Tile {
    return (this.ground[y * this.width + x] ?? Tile.Void) as Tile;
  }

  setDetail(x: number, y: number, d: Detail): this {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.detail[y * this.width + x] = d;
    }
    return this;
  }

  fillRect(x: number, y: number, w: number, h: number, tile: Tile): this {
    for (let iy = y; iy < y + h; iy++) {
      for (let ix = x; ix < x + w; ix++) this.set(ix, iy, tile);
    }
    return this;
  }

  outlineRect(x: number, y: number, w: number, h: number, tile: Tile): this {
    for (let ix = x; ix < x + w; ix++) {
      this.set(ix, y, tile);
      this.set(ix, y + h - 1, tile);
    }
    for (let iy = y; iy < y + h; iy++) {
      this.set(x, iy, tile);
      this.set(x + w - 1, iy, tile);
    }
    return this;
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, tile: Tile): this {
    for (let iy = Math.floor(cy - ry); iy <= cy + ry; iy++) {
      for (let ix = Math.floor(cx - rx); ix <= cx + rx; ix++) {
        const dx = (ix - cx) / rx;
        const dy = (iy - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(ix, iy, tile);
      }
    }
    return this;
  }

  /** A path of the given width between two points (L-shaped). */
  path(from: Vec2, to: Vec2, width: number, tile: Tile = Tile.Path): this {
    const half = Math.floor(width / 2);
    const x0 = Math.min(from.x, to.x);
    const x1 = Math.max(from.x, to.x);
    for (let x = x0; x <= x1; x++) {
      for (let o = -half; o < width - half; o++) this.set(x, from.y + o, tile);
    }
    const y0 = Math.min(from.y, to.y);
    const y1 = Math.max(from.y, to.y);
    for (let y = y0; y <= y1; y++) {
      for (let o = -half; o < width - half; o++) this.set(to.x + o, y, tile);
    }
    return this;
  }

  /**
   * A building: outer walls, inner floor, and door gaps. Doors are given
   * as local offsets along the wall, e.g. { side: 's', at: 3 }.
   */
  building(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: {
      wall: Tile;
      floor: Tile;
      doors: Array<{ side: 'n' | 's' | 'e' | 'w'; at: number }>;
    },
  ): this {
    this.fillRect(x, y, w, h, opts.floor);
    this.outlineRect(x, y, w, h, opts.wall);
    for (const door of opts.doors) {
      if (door.side === 'n') this.set(x + door.at, y, opts.floor);
      if (door.side === 's') this.set(x + door.at, y + h - 1, opts.floor);
      if (door.side === 'w') this.set(x, y + door.at, opts.floor);
      if (door.side === 'e') this.set(x + w - 1, y + door.at, opts.floor);
    }
    return this;
  }

  /** Scatter a tile over matching base tiles with the given density. */
  scatter(tile: Tile, density: number, on: Tile[] = [Tile.Grass]): this {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (on.includes(this.get(x, y)) && this.rng.chance(density)) {
          this.set(x, y, tile);
        }
      }
    }
    return this;
  }

  scatterDetail(d: Detail, density: number, on: Tile[] = [Tile.Grass]): this {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (on.includes(this.get(x, y)) && this.rng.chance(density)) {
          this.setDetail(x, y, d);
        }
      }
    }
    return this;
  }

  /** Spawn point in local coords; stored in world coords. */
  spawn(x: number, y: number): this {
    this.spawnPoint = { x: this.origin.x + x, y: this.origin.y + y };
    return this;
  }

  /** Place a portal tile (local coords; dest in world coords). */
  portal(x: number, y: number, tile: Tile, dest: Vec2 | 'delve'): this {
    this.set(x, y, tile);
    this.portals.push({
      x: this.origin.x + x,
      y: this.origin.y + y,
      dest: dest === 'delve' ? undefined : dest,
      delve: dest === 'delve' ? true : undefined,
    });
    return this;
  }

  /** NPC spawn cluster (local coords; stored in world coords). */
  npcSpawn(npc: string, x: number, y: number, radius: number, count: number): this {
    this.zoneSpawns.push({
      npc,
      x: this.origin.x + x,
      y: this.origin.y + y,
      radius,
      count,
    });
    return this;
  }

  build(): ZoneDef {
    return {
      id: this.id,
      name: this.name,
      origin: this.origin,
      width: this.width,
      height: this.height,
      ground: this.ground,
      detail: this.detail,
      spawn: this.spawnPoint,
      portals: this.portals,
      spawns: this.zoneSpawns,
    };
  }
}
