import {
  CHUNK_SIZE,
  ChunkStore,
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

  /** Player-built tiles, reapplied whenever a chunk regenerates. */
  private readonly builtTiles = new Map<string, { tile: number; owner: number }>();

  registerBuilt(tx: number, ty: number, tile: number, owner: number): void {
    this.builtTiles.set(`${tx},${ty}`, { tile, owner });
    this.setGround(tx, ty, tile);
  }

  unregisterBuilt(tx: number, ty: number): void {
    this.builtTiles.delete(`${tx},${ty}`);
  }

  builtAt(tx: number, ty: number): { tile: number; owner: number } | undefined {
    return this.builtTiles.get(`${tx},${ty}`);
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
    this.set(chunk);
    return chunk;
  }

  override isSolid(tx: number, ty: number): boolean {
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.isSolid(tx, ty);
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
        const ci = tileIndex(tx, ty);
        chunk.ground[ci] = zone.ground[zi]!;
        chunk.detail[ci] = zone.detail[zi]!;
      }
    }
  }
}
