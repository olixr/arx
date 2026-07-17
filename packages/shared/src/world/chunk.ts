import { CHUNK_SIZE } from '../constants.js';
import { BinaryMsgType, ByteReader, ByteWriter } from '../protocol/binary.js';
import { isSolidTile } from './tiles.js';
import type { CollisionSource } from './collision.js';

export const CHUNK_TILES = CHUNK_SIZE * CHUNK_SIZE;

export interface ChunkData {
  cx: number;
  cy: number;
  ground: Uint16Array; // CHUNK_TILES entries
  detail: Uint16Array;
  /** Bumped on in-place mutation so render caches can invalidate. */
  rev?: number;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function emptyChunk(cx: number, cy: number): ChunkData {
  return {
    cx,
    cy,
    ground: new Uint16Array(CHUNK_TILES),
    detail: new Uint16Array(CHUNK_TILES),
  };
}

/** Index within a chunk for world-tile coords. */
export function tileIndex(tx: number, ty: number): number {
  const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return ly * CHUNK_SIZE + lx;
}

export function encodeChunk(chunk: ChunkData): ArrayBuffer {
  const w = new ByteWriter(16 + CHUNK_TILES * 4);
  w.u8(BinaryMsgType.Chunk);
  w.i32(chunk.cx);
  w.i32(chunk.cy);
  for (let i = 0; i < CHUNK_TILES; i++) w.u16(chunk.ground[i]!);
  for (let i = 0; i < CHUNK_TILES; i++) w.u16(chunk.detail[i]!);
  return w.finish();
}

/** A single ground-tile change, broadcast when the world mutates. */
export interface TilePatch {
  tx: number;
  ty: number;
  ground: number;
}

export function encodeTilePatch(patch: TilePatch): ArrayBuffer {
  const w = new ByteWriter(16);
  w.u8(BinaryMsgType.TilePatch);
  w.i32(patch.tx);
  w.i32(patch.ty);
  w.u16(patch.ground);
  return w.finish();
}

export function decodeTilePatch(r: ByteReader): TilePatch {
  return { tx: r.i32(), ty: r.i32(), ground: r.u16() };
}

export function decodeChunk(r: ByteReader): ChunkData {
  const cx = r.i32();
  const cy = r.i32();
  const ground = new Uint16Array(CHUNK_TILES);
  const detail = new Uint16Array(CHUNK_TILES);
  for (let i = 0; i < CHUNK_TILES; i++) ground[i] = r.u16();
  for (let i = 0; i < CHUNK_TILES; i++) detail[i] = r.u16();
  return { cx, cy, ground, detail };
}

/**
 * A collection of chunks that answers collision queries. Used on the
 * client (streamed chunks) and wrapped by the server's WorldSource
 * (generated/authored chunks). Missing chunks are solid — nothing may
 * move through unloaded space.
 */
export class ChunkStore implements CollisionSource {
  protected readonly chunks = new Map<string, ChunkData>();

  set(chunk: ChunkData): void {
    this.chunks.set(chunkKey(chunk.cx, chunk.cy), chunk);
  }

  get(cx: number, cy: number): ChunkData | undefined {
    return this.chunks.get(chunkKey(cx, cy));
  }

  has(cx: number, cy: number): boolean {
    return this.chunks.has(chunkKey(cx, cy));
  }

  delete(cx: number, cy: number): void {
    this.chunks.delete(chunkKey(cx, cy));
  }

  get size(): number {
    return this.chunks.size;
  }

  keys(): IterableIterator<string> {
    return this.chunks.keys();
  }

  groundAt(tx: number, ty: number): number | undefined {
    const chunk = this.get(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return chunk?.ground[tileIndex(tx, ty)];
  }

  /** Mutate one ground tile in place (no-op if the chunk isn't loaded). */
  setGround(tx: number, ty: number, tile: number): boolean {
    const chunk = this.get(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    if (!chunk) return false;
    chunk.ground[tileIndex(tx, ty)] = tile;
    chunk.rev = (chunk.rev ?? 0) + 1;
    return true;
  }

  isSolid(tx: number, ty: number): boolean {
    const ground = this.groundAt(tx, ty);
    if (ground === undefined) return true;
    return isSolidTile(ground);
  }
}
