/**
 * THE WORLD BEHIND THE DOOR (play3d S1) — the world-source seam.
 *
 * The 3D client never asks "what is this tile" of anything but a
 * WorldSource3D. S1 ships ONE implementation, StandaloneWorld: the real
 * `@arx/content` worldgen (WORLD_SEED, generateChunk) with the real
 * Dawnmead ZoneDef stamped over it by the SAME overlay law the server's
 * WorldSource applies (TILE_SKIP transparent, a flat zone levels the
 * ground under it, a zone with an elev layer stamps it verbatim). So
 * the skeleton renders the very tiles a player at spawn is served — no
 * server needed. S2's LiveWorld (liveWorld.ts) is the second
 * implementation, over ClientGame's streamed chunks; everything above
 * this seam is untouched by the swap.
 *
 * Edge-harmony: the zone's border profile is published to the worldgen
 * fields exactly as the server does at boot, so the meadow around the
 * village blends toward Dawnmead's hems the way it does live. Only
 * Dawnmead is registered here — the other towns' hems are far outside
 * the S1 ring, and registering all of content's zones would cost a
 * build of every map at page load.
 */
import { CHUNK_SIZE, ChunkStore, TILE_SKIP, Tile, isSolidTile, tileIndex, type ChunkData, type Vec2 } from '@arx/shared';
import {
  WORLD_SEED,
  buildDawnmead,
  generateChunk,
  replaceZoneEdgeProfiles,
  zoneEdgeProfileOf,
  type ZoneDef,
} from '@arx/content';

export interface WorldSource3D {
  /** The chunk, generated/fetched on demand. */
  ensure(cx: number, cy: number): ChunkData;
  /** The chunk if already present (no generation side-effect). */
  peek(cx: number, cy: number): ChunkData | undefined;
  /**
   * True when `ensure` can answer NOW. A generated world always can; a
   * streamed world (LiveWorld) only once the server has sent the chunk
   * — the streamer waits rather than standing up an empty tile field.
   */
  ready(cx: number, cy: number): boolean;
  groundAt(tx: number, ty: number): number | undefined;
  detailAt(tx: number, ty: number): number;
  elevAt(tx: number, ty: number): number;
  isSolid(tx: number, ty: number): boolean;
  isRamp(tx: number, ty: number): boolean;
  readonly spawn: Vec2;
  /** Human-readable source name for the HUD confession. */
  readonly label: string;
}

/** The server's overlay law, verbatim (worldSource.ts overlayZone). */
export function overlayZone(chunk: ChunkData, zone: ZoneDef): void {
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;
  const x0 = Math.max(baseX, zone.origin.x);
  const y0 = Math.max(baseY, zone.origin.y);
  const x1 = Math.min(baseX + CHUNK_SIZE, zone.origin.x + zone.width);
  const y1 = Math.min(baseY + CHUNK_SIZE, zone.origin.y + zone.height);
  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const zi = (ty - zone.origin.y) * zone.width + (tx - zone.origin.x);
      if (zone.ground[zi] === TILE_SKIP) continue;
      const ci = tileIndex(tx, ty);
      chunk.ground[ci] = zone.ground[zi]!;
      chunk.detail[ci] = zone.detail[zi] === TILE_SKIP ? 0 : zone.detail[zi]!;
      chunk.elev[ci] = zone.elev ? zone.elev[zi]! : 0;
    }
  }
}

export class StandaloneWorld extends ChunkStore implements WorldSource3D {
  readonly label: string;
  readonly spawn: Vec2;
  private readonly zones: ZoneDef[];
  /** Chunks generated so far — the HUD's "world" confession. */
  generated = 0;

  constructor(
    private readonly seed = WORLD_SEED,
    zones: ZoneDef[] = [buildDawnmead()],
  ) {
    super();
    this.zones = zones;
    replaceZoneEdgeProfiles(
      zones.map((z) => zoneEdgeProfileOf(z)).filter((p): p is NonNullable<typeof p> => p !== null),
    );
    const withSpawn = zones.find((z) => z.spawn);
    this.spawn = withSpawn?.spawn ?? { x: 8, y: 8 };
    this.label = `standalone seed ${seed} + ${zones.map((z) => z.id).join(',')}`;
  }

  ensure(cx: number, cy: number): ChunkData {
    const have = this.get(cx, cy);
    if (have) return have;
    const chunk = generateChunk(this.seed, cx, cy);
    for (const z of this.zones) overlayZone(chunk, z);
    this.set(chunk);
    this.generated++;
    return chunk;
  }

  peek(cx: number, cy: number): ChunkData | undefined {
    return this.get(cx, cy);
  }

  ready(): boolean {
    return true;
  }

  override groundAt(tx: number, ty: number): number | undefined {
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.groundAt(tx, ty);
  }

  override detailAt(tx: number, ty: number): number {
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.detailAt(tx, ty);
  }

  override elevAt(tx: number, ty: number): number {
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.elevAt(tx, ty);
  }

  override isSolid(tx: number, ty: number): boolean {
    const g = this.groundAt(tx, ty);
    return g === undefined ? true : isSolidTile(g);
  }

  isRamp(tx: number, ty: number): boolean {
    return this.groundAt(tx, ty) === Tile.Ramp;
  }
}
