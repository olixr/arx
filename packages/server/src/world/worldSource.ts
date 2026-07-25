import {
  CHUNK_SIZE,
  ChunkStore,
  TILE_SKIP,
  chunkKey,
  tileIndex,
  type ChunkData,
  type Vec2,
} from '@devcraft/shared';
import type { PortalDef, ZoneDef } from '@devcraft/content';
import { generateChunk } from './worldgen.js';

/**
 * The server's world: procedural chunks with authored zones stamped on
 * top, generated lazily and cached. Implements CollisionSource (via
 * ChunkStore) — movement and AI query it directly. Zones can be added
 * and removed at runtime (delve instances).
 */
export class WorldSource extends ChunkStore {
  private readonly zones: ZoneDef[];
  private readonly portals = new Map<string, PortalDef>();

  constructor(
    private readonly seed: number,
    initialZones: ZoneDef[],
  ) {
    super();
    this.zones = [];
    for (const zone of initialZones) this.addZone(zone);
  }

  addZone(zone: ZoneDef): void {
    this.zones.push(zone);
    for (const portal of zone.portals ?? []) {
      this.portals.set(`${portal.x},${portal.y}`, portal);
    }
    this.dropZoneChunks(zone);
  }

  removeZone(zoneId: string): void {
    const idx = this.zones.findIndex((z) => z.id === zoneId);
    if (idx === -1) return;
    const [zone] = this.zones.splice(idx, 1);
    for (const portal of zone!.portals ?? []) {
      this.portals.delete(`${portal.x},${portal.y}`);
    }
    this.dropZoneChunks(zone!);
  }

  /**
   * Swap a zone in place, keeping its slot in the overlay order — a
   * live map-editor save must not change which zone wins overlaps or
   * which spawn the world reports. Unknown ids append like addZone.
   */
  replaceZone(zone: ZoneDef): void {
    const idx = this.zones.findIndex((z) => z.id === zone.id);
    if (idx === -1) {
      this.addZone(zone);
      return;
    }
    const old = this.zones[idx]!;
    for (const portal of old.portals ?? []) {
      this.portals.delete(`${portal.x},${portal.y}`);
    }
    this.zones[idx] = zone;
    for (const portal of zone.portals ?? []) {
      this.portals.set(`${portal.x},${portal.y}`, portal);
    }
    // Old and new rects can differ (resize/move) — drop both.
    this.dropZoneChunks(old);
    this.dropZoneChunks(zone);
  }

  zoneById(zoneId: string): ZoneDef | undefined {
    return this.zones.find((z) => z.id === zoneId);
  }

  /** The live authored-zone list, in overlay order. */
  get zoneDefs(): readonly ZoneDef[] {
    return this.zones;
  }

  portalAt(tx: number, ty: number): PortalDef | undefined {
    return this.portals.get(`${tx},${ty}`);
  }

  /** Invalidate cached chunks the zone covers so they regenerate. */
  private dropZoneChunks(zone: ZoneDef): void {
    const c0x = Math.floor(zone.origin.x / CHUNK_SIZE);
    const c0y = Math.floor(zone.origin.y / CHUNK_SIZE);
    const c1x = Math.floor((zone.origin.x + zone.width - 1) / CHUNK_SIZE);
    const c1y = Math.floor((zone.origin.y + zone.height - 1) / CHUNK_SIZE);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        this.chunks.delete(chunkKey(cx, cy));
      }
    }
  }

  /** The spawn point of the first zone that declares one. */
  get spawn(): Vec2 {
    for (const zone of this.zones) {
      if (zone.spawn) return zone.spawn;
    }
    return { x: 8, y: 8 };
  }

  /**
   * The spawn point a specific zone declares, if it does — reads the
   * live zone list, so a hot-reloaded zone moves its spawn with it.
   * The awakening flow (config.startZoneId) resolves through this.
   */
  spawnOf(zoneId: string): Vec2 | undefined {
    for (const zone of this.zones) {
      if (zone.id === zoneId && zone.spawn) return zone.spawn;
    }
    return undefined;
  }

  /**
   * Where death sends you: the NEAREST settled spawn. With Dawnmead
   * the world's only hearth that means the Waking Ring; as new
   * settlements declare spawns, the walk back shortens on its own.
   * Underground deaths (the dark band, dungeons, delves) always
   * surface at the world spawn: distance means nothing down there.
   */
  respawnAt(x: number, y: number): Vec2 {
    if (y >= 512) return this.spawn;
    let best = this.spawn;
    let bestD = Infinity;
    for (const zone of this.zones) {
      if (!zone.spawn) continue;
      const d = Math.hypot(zone.spawn.x - x, zone.spawn.y - y);
      if (d < bestD) {
        bestD = d;
        best = zone.spawn;
      }
    }
    return best;
  }

  /** Player-built tiles, reapplied whenever a chunk regenerates. */
  private readonly builtTiles = new Map<string, { tile: number; owner: number; prevTile: number }>();

  registerBuilt(tx: number, ty: number, tile: number, owner: number, prevTile: number): void {
    // Building over an existing construction (a wall onto your own
    // floor) keeps the FIRST capture: demolish returns the natural
    // ground, never an intermediate build that no longer exists.
    const existing = this.builtTiles.get(`${tx},${ty}`);
    this.builtTiles.set(`${tx},${ty}`, { tile, owner, prevTile: existing?.prevTile ?? prevTile });
    this.setGround(tx, ty, tile);
  }

  unregisterBuilt(tx: number, ty: number): void {
    this.builtTiles.delete(`${tx},${ty}`);
  }

  builtAt(tx: number, ty: number): { tile: number; owner: number; prevTile: number } | undefined {
    return this.builtTiles.get(`${tx},${ty}`);
  }

  /**
   * Planted-crop stage tiles, applied over builtTiles so a crop wins
   * over its plot's stored Tilled ground when a chunk regenerates.
   */
  private readonly cropTiles = new Map<string, number>();

  registerCropTile(tx: number, ty: number, tile: number): void {
    this.cropTiles.set(`${tx},${ty}`, tile);
    this.setGround(tx, ty, tile);
  }

  unregisterCropTile(tx: number, ty: number): void {
    this.cropTiles.delete(`${tx},${ty}`);
  }

  ensure(cx: number, cy: number): ChunkData {
    const existing = this.get(cx, cy);
    if (existing) return existing;
    const chunk = generateChunk(this.seed, cx, cy);
    for (const zone of this.zones) this.overlayZone(chunk, zone);
    // Player constructions survive regeneration.
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;
    for (const [key, built] of this.builtTiles) {
      const [tx, ty] = key.split(',').map(Number);
      if (tx! >= baseX && tx! < baseX + CHUNK_SIZE && ty! >= baseY && ty! < baseY + CHUNK_SIZE) {
        chunk.ground[tileIndex(tx!, ty!)] = built.tile;
      }
    }
    // Crops overwrite their plot's Tilled ground.
    for (const [key, tile] of this.cropTiles) {
      const [tx, ty] = key.split(',').map(Number);
      if (tx! >= baseX && tx! < baseX + CHUNK_SIZE && ty! >= baseY && ty! < baseY + CHUNK_SIZE) {
        chunk.ground[tileIndex(tx!, ty!)] = tile;
      }
    }
    this.set(chunk);
    return chunk;
  }

  override isSolid(tx: number, ty: number): boolean {
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.isSolid(tx, ty);
  }

  override tileAt(tx: number, ty: number): number | undefined {
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.tileAt(tx, ty);
  }

  private overlayZone(chunk: ChunkData, zone: ZoneDef): void {
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseY = chunk.cy * CHUNK_SIZE;
    // Intersection of the chunk rect and the zone rect, in world tiles.
    const x0 = Math.max(baseX, zone.origin.x);
    const y0 = Math.max(baseY, zone.origin.y);
    const x1 = Math.min(baseX + CHUNK_SIZE, zone.origin.x + zone.width);
    const y1 = Math.min(baseY + CHUNK_SIZE, zone.origin.y + zone.height);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const zi = (ty - zone.origin.y) * zone.width + (tx - zone.origin.x);
        // TILE_SKIP cells are transparent: the ground beneath (procgen
        // or an earlier zone) shows through untouched — elev included,
        // or a skipped cell would flatten the terrain it reveals.
        if (zone.ground[zi] === TILE_SKIP) continue;
        const ci = tileIndex(tx, ty);
        chunk.ground[ci] = zone.ground[zi]!;
        chunk.detail[ci] = zone.detail[zi] === TILE_SKIP ? 0 : zone.detail[zi]!;
        // A zone without an elev layer is flat ground: any generated
        // plateau under it is levelled (it carries no cliffs to fence
        // one). Zones WITH a layer stamp it verbatim — ZoneBuilder
        // already validated its fencing at build time.
        chunk.elev[ci] = zone.elev ? zone.elev[zi]! : 0;
      }
    }
  }
}
