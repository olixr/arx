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
  /**
   * Elevation LEVEL per tile, SIGNED (−2..3): plateaus rise above the
   * meadow, dells and quarries sink below it. Render-only: tops draw
   * lifted (or dropped) and entities standing on them move with the
   * ground. It never affects collision — worldgen guarantees every
   * level change is fenced by solid Cliff tiles except where a walkable
   * Ramp crosses, and the ring always sits on the HIGH side of the
   * boundary, whatever the sign.
   */
  elev: Int8Array;
  /** Bumped on in-place mutation so render caches can invalidate. */
  rev?: number;
  /** THE FRINGE RE-BAKE's bookkeeping (client render annotations,
   *  like `rev`): fringeRev counts the rev bumps that were NEIGHBOR-
   *  driven — when every bump since a chunk's last bake was a fringe
   *  bump (rev delta === fringeRev delta) and its own payload object
   *  is unchanged, the re-bake may repaint only the border strips
   *  named by fringeMask (1 N, 2 S, 4 W, 8 E) instead of the whole
   *  canvas. The renderer clears consumed mask bits at bake
   *  completion. */
  fringeRev?: number;
  fringeMask?: number;
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
    elev: new Int8Array(CHUNK_TILES),
  };
}

/** Index within a chunk for world-tile coords. */
export function tileIndex(tx: number, ty: number): number {
  const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return ly * CHUNK_SIZE + lx;
}

export function encodeChunk(chunk: ChunkData): ArrayBuffer {
  const w = new ByteWriter(16 + CHUNK_TILES * 5);
  w.u8(BinaryMsgType.Chunk);
  w.i32(chunk.cx);
  w.i32(chunk.cy);
  for (let i = 0; i < CHUNK_TILES; i++) w.u16(chunk.ground[i]!);
  for (let i = 0; i < CHUNK_TILES; i++) w.u16(chunk.detail[i]!);
  for (let i = 0; i < CHUNK_TILES; i++) w.i8(chunk.elev[i]!);
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

/**
 * A single detail-layer change — THE SECOND LAYER (exterior decor):
 * player-hung wall decor mutates the detail a chunk already streams,
 * so the patch mirrors TilePatch exactly, one lane over.
 */
export interface DetailPatch {
  tx: number;
  ty: number;
  detail: number;
}

export function encodeDetailPatch(patch: DetailPatch): ArrayBuffer {
  const w = new ByteWriter(16);
  w.u8(BinaryMsgType.DetailPatch);
  w.i32(patch.tx);
  w.i32(patch.ty);
  w.u16(patch.detail);
  return w.finish();
}

export function decodeDetailPatch(r: ByteReader): DetailPatch {
  return { tx: r.i32(), ty: r.i32(), detail: r.u16() };
}

export function decodeChunk(r: ByteReader): ChunkData {
  const cx = r.i32();
  const cy = r.i32();
  const ground = new Uint16Array(CHUNK_TILES);
  const detail = new Uint16Array(CHUNK_TILES);
  const elev = new Int8Array(CHUNK_TILES);
  for (let i = 0; i < CHUNK_TILES; i++) ground[i] = r.u16();
  for (let i = 0; i < CHUNK_TILES; i++) detail[i] = r.u16();
  for (let i = 0; i < CHUNK_TILES; i++) elev[i] = r.i8();
  return { cx, cy, ground, detail, elev };
}

/**
 * A collection of chunks that answers collision queries. Used on the
 * client (streamed chunks) and wrapped by the server's WorldSource
 * (generated/authored chunks). Missing chunks are solid — nothing may
 * move through unloaded space.
 */
export class ChunkStore implements CollisionSource {
  protected readonly chunks = new Map<string, ChunkData>();
  /**
   * One-entry chunk memo: per-tile queries (groundAt/elevAt/detailAt)
   * run in row-major scans that hit the same chunk almost every call,
   * and the naive path allocated a `${cx},${cy}` string plus a Map
   * lookup per TILE — tens of thousands per rendered frame. The memo
   * turns the common case into two integer compares. Invalidated on
   * any chunk set/delete (in-place ground mutations keep the same
   * ChunkData object, so the memo stays valid through setGround).
   */
  private memoCx = NaN;
  private memoCy = NaN;
  private memoChunk: ChunkData | undefined;

  private chunkFor(tx: number, ty: number): ChunkData | undefined {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    if (cx === this.memoCx && cy === this.memoCy) return this.memoChunk;
    this.memoCx = cx;
    this.memoCy = cy;
    return (this.memoChunk = this.chunks.get(chunkKey(cx, cy)));
  }

  set(chunk: ChunkData): void {
    this.chunks.set(chunkKey(chunk.cx, chunk.cy), chunk);
    this.memoCx = NaN;
  }

  /**
   * Forget every chunk. The lever for "a worldgen input changed":
   * geography edits redraw terrain everywhere, so rect-scoped drops
   * can't cover it — regeneration is on-demand and player-built tiles
   * reapply on regen, so a full clear is always safe.
   */
  dropAll(): void {
    this.chunks.clear();
    this.memoCx = NaN;
    this.memoChunk = undefined;
  }

  get(cx: number, cy: number): ChunkData | undefined {
    return this.chunks.get(chunkKey(cx, cy));
  }

  has(cx: number, cy: number): boolean {
    return this.chunks.has(chunkKey(cx, cy));
  }

  delete(cx: number, cy: number): void {
    this.chunks.delete(chunkKey(cx, cy));
    this.memoCx = NaN;
  }

  get size(): number {
    return this.chunks.size;
  }

  keys(): IterableIterator<string> {
    return this.chunks.keys();
  }

  groundAt(tx: number, ty: number): number | undefined {
    const chunk = this.chunkFor(tx, ty);
    return chunk?.ground[tileIndex(tx, ty)];
  }

  /** Elevation level of a tile; unloaded space is ground level. */
  elevAt(tx: number, ty: number): number {
    const chunk = this.chunkFor(tx, ty);
    return chunk?.elev[tileIndex(tx, ty)] ?? 0;
  }

  /** Detail-layer id of a tile; unloaded space has none. */
  detailAt(tx: number, ty: number): number {
    const chunk = this.chunkFor(tx, ty);
    return chunk?.detail[tileIndex(tx, ty)] ?? 0;
  }

  /** Mutate one ground tile in place (no-op if the chunk isn't loaded). */
  setGround(tx: number, ty: number, tile: number): boolean {
    const chunk = this.chunkFor(tx, ty);
    if (!chunk) return false;
    chunk.ground[tileIndex(tx, ty)] = tile;
    chunk.rev = (chunk.rev ?? 0) + 1;
    return true;
  }

  /** Mutate one detail-layer id in place (THE SECOND LAYER's write). */
  setDetail(tx: number, ty: number, detail: number): boolean {
    const chunk = this.chunkFor(tx, ty);
    if (!chunk) return false;
    chunk.detail[tileIndex(tx, ty)] = detail;
    chunk.rev = (chunk.rev ?? 0) + 1;
    return true;
  }

  isSolid(tx: number, ty: number): boolean {
    const ground = this.groundAt(tx, ty);
    if (ground === undefined) return true;
    return isSolidTile(ground);
  }

  /** CollisionSource shape hook — lets trees/rocks collide as circles. */
  tileAt(tx: number, ty: number): number | undefined {
    return this.groundAt(tx, ty);
  }
}
