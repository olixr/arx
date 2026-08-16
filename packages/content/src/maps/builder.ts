import {
  Detail,
  MAX_TERRAIN_LEVEL,
  MIN_TERRAIN_LEVEL,
  Rng,
  SIGN_TILES,
  TILE_DEFS,
  Tile,
  WALL_RUN_TILES,
  hashString,
  isSolidTile,
  sanitizeSignText,
  type Vec2,
} from '@arx/shared';
import { stampTemplate } from '../structures/stamp.js';
import type { StructureTemplate } from '../structures/types.js';
import type { PlaneId } from '../planes.js';
import type { PortalDef, ZoneActorSpawn, ZoneDef, ZoneSign, ZoneSpawn } from './types.js';

/**
 * Authoring API for hand-made zones. Zones are built by carving shapes
 * out of a base fill — readable, diffable, and tweakable in code. The
 * in-browser editor produces the same ZoneDef shape.
 */
export class ZoneBuilder {
  private readonly ground: Uint16Array;
  private readonly detail: Uint16Array;
  /** Signed elevation levels; zero-filled = flat, like every legacy zone. */
  private readonly elev: Int8Array;
  /** Local indices of stairs() tiles — the only legal gaps in the fence. */
  private readonly stairSpots = new Set<number>();
  /** True once any elevation primitive ran; flat zones export no layer. */
  private hasElev = false;
  private spawnPoint: Vec2 | undefined;
  private zonePlane: PlaneId | undefined;
  private readonly portals: PortalDef[] = [];
  private readonly zoneSpawns: ZoneSpawn[] = [];
  private readonly zoneActorSpawns: ZoneActorSpawn[] = [];
  private readonly zoneSigns: ZoneSign[] = [];
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
    this.elev = new Int8Array(width * height);
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

  // ------------------------------------------------------------------
  // Elevation authoring. Levels are SIGNED (−2..3) with the same law as
  // worldgen: every level change must be fenced by Cliff on the HIGH
  // side except where a stairs() tile crosses. Authors only shape the
  // levels and place stairs; build() grows the fence automatically and
  // validates the whole arrangement, throwing with coordinates so
  // layout conflicts surface at build time, not in-game.
  // ------------------------------------------------------------------

  /** Elevation level of a local tile; out-of-bounds reads as flat 0. */
  levelAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.elev[y * this.width + x]!;
  }

  private setLevel(x: number, y: number, level: number): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.elev[y * this.width + x] = level;
      this.hasElev = true;
    }
  }

  /**
   * Lift a rect onto a plateau shelf (level 1..3). Levels are set
   * absolutely, so nesting carves terraces: a later raise() inside an
   * earlier one wins.
   */
  raise(x: number, y: number, w: number, h: number, level: number): this {
    if (!Number.isInteger(level) || level < 1 || level > MAX_TERRAIN_LEVEL) {
      throw new Error(`${this.id}: raise level ${level} outside 1..${MAX_TERRAIN_LEVEL}`);
    }
    for (let iy = y; iy < y + h; iy++) {
      for (let ix = x; ix < x + w; ix++) this.setLevel(ix, iy, level);
    }
    return this;
  }

  /**
   * Sink a rect below the meadow. Depth is POSITIVE (1..2) — the author
   * says how far DOWN and the builder stores the negative level, so
   * zone files never juggle signs. Nest a deeper sink inside a
   * shallower one for a stepped descent: each ring auto-fences its own
   * rim and can carry its own stairs().
   */
  sink(x: number, y: number, w: number, h: number, depth = 1): this {
    if (!Number.isInteger(depth) || depth < 1 || depth > -MIN_TERRAIN_LEVEL) {
      throw new Error(`${this.id}: sink depth ${depth} outside 1..${-MIN_TERRAIN_LEVEL}`);
    }
    for (let iy = y; iy < y + h; iy++) {
      for (let ix = x; ix < x + w; ix++) this.setLevel(ix, iy, -depth);
    }
    return this;
  }

  /** Elliptical elevation brush; signed level (−2..3), 0 flattens back. */
  elevEllipse(cx: number, cy: number, rx: number, ry: number, level: number): this {
    if (!Number.isInteger(level) || level < MIN_TERRAIN_LEVEL || level > MAX_TERRAIN_LEVEL) {
      throw new Error(`${this.id}: elevEllipse level ${level} outside ${MIN_TERRAIN_LEVEL}..${MAX_TERRAIN_LEVEL}`);
    }
    for (let iy = Math.floor(cy - ry); iy <= cy + ry; iy++) {
      for (let ix = Math.floor(cx - rx); ix <= cx + rx; ix++) {
        const dx = (ix - cx) / rx;
        const dy = (iy - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.setLevel(ix, iy, level);
      }
    }
    return this;
  }

  /**
   * A walkable stair through the fence. Call it on the HIGH-side rim
   * tile (after shaping levels) whose SOUTH neighbor is exactly one
   * level lower — the same camera-facing straight-edge rule worldgen
   * uses; build() validates it and throws with coordinates if the
   * flight can't read.
   */
  stairs(x: number, y: number): this {
    this.set(x, y, Tile.Ramp);
    this.stairSpots.add(y * this.width + x);
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
   * A building: outer walls, inner floor, framed doorways, and
   * optionally windows. Doors/windows are local offsets along a wall,
   * e.g. { side: 's', at: 3 }. Doorways are REAL walkable doorway
   * tiles (the renderer frames them and interior detection treats
   * them as enclosure); windows are windowed wall tiles.
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
      windows?: Array<{ side: 'n' | 's' | 'e' | 'w'; at: number }>;
    },
  ): this {
    this.fillRect(x, y, w, h, opts.floor);
    this.outlineRect(x, y, w, h, opts.wall);
    const wood = opts.wall !== Tile.WallStone;
    const doorway = wood ? Tile.DoorwayWood : Tile.DoorwayStone;
    const windowT = wood ? Tile.WallWoodWindow : Tile.WallStoneWindow;
    const wallSpot = (o: { side: 'n' | 's' | 'e' | 'w'; at: number }): Vec2 =>
      o.side === 'n'
        ? { x: x + o.at, y }
        : o.side === 's'
          ? { x: x + o.at, y: y + h - 1 }
          : o.side === 'w'
            ? { x, y: y + o.at }
            : { x: x + w - 1, y: y + o.at };
    for (const door of opts.doors) {
      const p = wallSpot(door);
      this.set(p.x, p.y, doorway);
    }
    for (const win of opts.windows ?? []) {
      const p = wallSpot(win);
      this.set(p.x, p.y, windowT);
    }
    return this;
  }

  /**
   * Stamp a structure template at local coords. Space cells in the
   * template are transparent; flipX mirrors it (never rotates — the
   * renderer presents south faces). See structures/stamp.ts.
   */
  stamp(tpl: StructureTemplate, x: number, y: number, opts?: { flipX?: boolean }): this {
    stampTemplate(this, tpl, x, y, opts);
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

  /**
   * Place a portal tile (local coords; dest in world coords, on
   * `destPlane` — absent falls to the legacy y-derivation, which is
   * exact for pre-split content and wrong for anything new; state it).
   */
  portal(x: number, y: number, tile: Tile, dest: Vec2 | 'delve', destPlane?: PlaneId): this {
    this.set(x, y, tile);
    this.portals.push({
      x: this.origin.x + x,
      y: this.origin.y + y,
      dest: dest === 'delve' ? undefined : dest,
      destPlane: dest === 'delve' ? undefined : destPlane,
      delve: dest === 'delve' ? true : undefined,
    });
    return this;
  }

  /** THE WORLDS APART: which plane this zone stamps (default surface). */
  onPlane(plane: PlaneId): this {
    this.zonePlane = plane;
    return this;
  }

  /**
   * Stand a sign and write it (local coords; stored in world coords).
   *
   * One call places the furniture AND the words, because a sign tile
   * with no record is a blank board nobody can read — the pair is the
   * unit. `tile` picks the furniture: a hanging shingle off a
   * building's wall (the default) or a free-standing roadside post.
   */
  /**
   * A sign stands IN FRONT of a wall, never in it: writing the sign
   * tile over a wall-run member (or the garrison curtain) punches a
   * hole in the building's silhouette — the renderer draws a
   * free-standing post where the wall face should continue. Fail the
   * build with coordinates instead of shipping a cut wall.
   */
  private static readonly SIGN_REFUSES: ReadonlySet<number> = new Set([
    ...WALL_RUN_TILES,
    Tile.WallGarrison,
    Tile.GateGarrison,
    Tile.WallGarrisonDiagNE,
    Tile.WallGarrisonDiagNW,
    Tile.WallGarrisonDiagSE,
    Tile.WallGarrisonDiagSW,
  ]);

  sign(
    x: number,
    y: number,
    title: string,
    lines: string[] = [],
    tile: Tile = Tile.HangingSign,
  ): this {
    const under = this.get(x, y);
    if (ZoneBuilder.SIGN_REFUSES.has(under)) {
      throw new Error(
        `${this.id}: sign "${title}" at (${x},${y}) would overwrite '${this.tileName(under)}' — ` +
          `stand it on open ground in front of the wall, never in the wall`,
      );
    }
    this.set(x, y, tile);
    const text = sanitizeSignText({ title, lines });
    const record: ZoneSign = { x: this.origin.x + x, y: this.origin.y + y, title: text.title };
    // Absent stays absent — the JSON round-trip law the placements keep.
    if (text.lines.length > 0) record.lines = text.lines;
    this.zoneSigns.push(record);
    return this;
  }

  /** Place a named NPC actor (local coords; stored in world coords). */
  actor(slug: string, x: number, y: number, dir?: number, routine?: string): this {
    // Absent fields stay absent — placements survive the zone JSON
    // round-trip byte-exact (JSON drops undefined; deepEqual doesn't).
    const spawn: ZoneActorSpawn = { actor: slug, x: this.origin.x + x, y: this.origin.y + y };
    if (dir !== undefined) spawn.dir = dir;
    if (routine !== undefined) spawn.routine = routine;
    this.zoneActorSpawns.push(spawn);
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

  /**
   * Tiles the auto-fence may overwrite: plain natural ground carrying
   * no authored intent. Anything else under a required fence tile —
   * walls, floors of a building, portals, props, water — is a layout
   * conflict the author must resolve, so build() throws instead of
   * silently burying it in Cliff.
   */
  private static readonly FENCEABLE: ReadonlySet<number> = new Set([
    Tile.Grass,
    Tile.GrassTall,
    Tile.Dirt,
    Tile.Sand,
    Tile.Path,
    Tile.StoneFloor,
    Tile.CaveFloor,
  ]);

  private tileName(t: number): string {
    return TILE_DEFS[t as Tile]?.name ?? `tile ${t}`;
  }

  /**
   * The border row and the row inside it must stay flat: the tile just
   * OUTSIDE the zone is procgen at an unknown level, and a fence for a
   * border-hugging level change would have to live where the overlay
   * can't guarantee it. A flat two-tile apron makes the seam a no-op.
   */
  private validateBorderFlat(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const nearBorder = x < 2 || y < 2 || x >= this.width - 2 || y >= this.height - 2;
        if (nearBorder && this.elev[y * this.width + x] !== 0) {
          throw new Error(
            `${this.id}: nonzero elevation at (${x},${y}) within 1 tile of the zone border`,
          );
        }
      }
    }
  }

  /** Port of worldgen's camera-facing straight-edge stair predicate. */
  private validateStairs(): void {
    for (const i of this.stairSpots) {
      const x = i % this.width;
      const y = Math.floor(i / this.width);
      const fail = (why: string): never => {
        throw new Error(`${this.id}: stairs at (${x},${y}) ${why}`);
      };
      if (this.ground[i] !== Tile.Ramp) fail('was overwritten by a later tile');
      const lvl = this.levelAt(x, y);
      if (this.levelAt(x, y + 1) !== lvl - 1) {
        fail('needs its SOUTH neighbor exactly one level lower');
      }
      if (this.levelAt(x - 1, y) !== lvl || this.levelAt(x + 1, y) !== lvl) {
        fail('needs both e/w flanks at the stair level (they become the framing cliff)');
      }
      if (this.levelAt(x, y - 1) !== lvl) fail('needs its north neighbor at the stair level');
      // The flight must top out on open interior ground, not another rim.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx !== 0 || dy !== 0) && this.levelAt(x + dx, y - 1 + dy) < lvl) {
            fail('must top out on interior ground, not another rim');
          }
        }
      }
      if (this.levelAt(x - 1, y + 1) !== lvl - 1 || this.levelAt(x + 1, y + 1) !== lvl - 1) {
        fail('needs both mouth diagonals one level lower (straight edge, not a corner)');
      }
      if (this.levelAt(x - 1, y - 1) < lvl || this.levelAt(x + 1, y - 1) < lvl) {
        fail('needs both top diagonals at the stair level (straight crown, not a corner)');
      }
    }
  }

  /**
   * Grow the Cliff fence: every tile with a lower 8-neighbor is high
   * side of a boundary and must be solid — unless it's a recorded
   * stairs() tile, the one legal gap.
   */
  private autoFence(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = y * this.width + x;
        if (this.stairSpots.has(i)) continue;
        const lvl = this.elev[i]!;
        let rim = false;
        for (let dy = -1; dy <= 1 && !rim; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if ((dx !== 0 || dy !== 0) && this.levelAt(x + dx, y + dy) < lvl) {
              rim = true;
              break;
            }
          }
        }
        if (!rim) continue;
        const g = this.ground[i]!;
        if (g === Tile.Cliff) continue; // author already fenced it
        if (!ZoneBuilder.FENCEABLE.has(g)) {
          throw new Error(
            `${this.id}: auto-fence at (${x},${y}) would overwrite authored '${this.tileName(g)}' — ` +
              `move the feature off the rim or cross it with stairs()`,
          );
        }
        this.ground[i] = Tile.Cliff;
      }
    }
  }

  /**
   * Words need a board. A sign record whose tile got overwritten by a
   * later stamp (a building dropped on top of it, a road paved over
   * it) is copy nobody will ever read — fail the build rather than
   * ship a ghost, the same standard the fence conflict keeps.
   */
  private validateSigns(): void {
    for (const s of this.zoneSigns) {
      const lx = s.x - this.origin.x;
      const ly = s.y - this.origin.y;
      if (!SIGN_TILES.has(this.get(lx, ly))) {
        throw new Error(
          `zone ${this.id}: sign "${s.title}" at ${s.x},${s.y} has no sign tile under it ` +
            `(found ${TILE_DEFS[this.get(lx, ly)]?.name ?? 'void'}) — something stamped over it`,
        );
      }
    }
  }

  /**
   * Every walkable off-level tile must be reachable from the zone spawn
   * crossing level changes only via Ramp — an unreachable dell floor is
   * a content bug worth failing the build over. Skipped when the zone
   * declares no spawn (dungeons entered by portal validate in play).
   */
  private validateReachable(): void {
    if (!this.spawnPoint) return;
    // Spawns are usually tile-centered (x.5): floor to the tile, or
    // the fractional index silently breaks the flood fill.
    const sx = Math.floor(this.spawnPoint.x - this.origin.x);
    const sy = Math.floor(this.spawnPoint.y - this.origin.y);
    const seen = new Set<number>();
    const stack = [sy * this.width + sx];
    while (stack.length > 0) {
      const i = stack.pop()!;
      if (seen.has(i)) continue;
      const x = i % this.width;
      const y = Math.floor(i / this.width);
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
      if (isSolidTile(this.ground[i]!)) continue;
      seen.add(i);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
        const ni = ny * this.width + nx;
        // Level changes are crossed only on a stair tile.
        if (
          this.elev[ni] !== this.elev[i] &&
          this.ground[i] !== Tile.Ramp &&
          this.ground[ni] !== Tile.Ramp
        ) {
          continue;
        }
        stack.push(ni);
      }
    }
    const unreachable: string[] = [];
    for (let i = 0; i < this.elev.length; i++) {
      if (this.elev[i] !== 0 && !isSolidTile(this.ground[i]!) && !seen.has(i)) {
        unreachable.push(`(${i % this.width},${Math.floor(i / this.width)})`);
      }
    }
    if (unreachable.length > 0) {
      throw new Error(
        `${this.id}: ${unreachable.length} off-level walkable tiles unreachable from spawn ` +
          `(no stair connects them): ${unreachable.slice(0, 8).join(' ')}` +
          (unreachable.length > 8 ? ' …' : ''),
      );
    }
  }

  build(): ZoneDef {
    if (this.hasElev || this.stairSpots.size > 0) {
      this.validateBorderFlat();
      this.validateStairs();
      this.autoFence();
      this.validateReachable();
    }
    // Signage validates for EVERY zone: words with no board under them
    // are dead copy whether or not the zone has elevation.
    this.validateSigns();
    return {
      id: this.id,
      name: this.name,
      plane: this.zonePlane,
      origin: this.origin,
      width: this.width,
      height: this.height,
      ground: this.ground,
      detail: this.detail,
      // Flat zones export no layer, keeping legacy defs byte-identical.
      elev: this.hasElev ? this.elev : undefined,
      spawn: this.spawnPoint,
      portals: this.portals,
      spawns: this.zoneSpawns,
      actorSpawns: this.zoneActorSpawns,
      signs: this.zoneSigns,
    };
  }
}
