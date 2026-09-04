/**
 * THE RING AROUND THE PLAYER (play3d S1) — the pure streaming math the
 * ground streamer and the standing-world streamer share.
 *
 * Laws:
 *  - A chunk key is ONE integer (packed signed 16-bit pair), never a
 *    string — the streamer walks the ring every frame and a string per
 *    chunk per frame is an allocation law-breaker.
 *  - The ring is dealt NEAREST-FIRST so the chunk the player stands on
 *    bakes before the horizon does; `ringAround` fills a caller-owned
 *    array so the hot loop allocates nothing.
 *  - Eviction is by a WIDER radius than loading (hysteresis): a chunk
 *    loads at `r` and unloads past `r + 1`, so a player pacing a chunk
 *    border never thrashes a bake.
 */
import { CHUNK_SIZE } from '@arx/shared';

/** Tile → chunk coordinate (floor division, negative-safe). */
export function chunkOf(t: number): number {
  return Math.floor(t / CHUNK_SIZE);
}

/** Pack a signed chunk pair into one integer key (±32767 range). */
export function packChunk(cx: number, cy: number): number {
  return ((cx + 0x8000) << 16) | ((cy + 0x8000) & 0xffff);
}

export function unpackCx(key: number): number {
  return (key >>> 16) - 0x8000;
}

export function unpackCy(key: number): number {
  return (key & 0xffff) - 0x8000;
}

export interface RingEntry {
  cx: number;
  cy: number;
  /** Squared chunk distance from the ring centre — the sort key. */
  d2: number;
}

/**
 * Every chunk within `r` chunks (Chebyshev square) of (cx, cy), sorted
 * nearest-first by Euclidean chunk distance. `out` is reused: it is
 * truncated and refilled, and entries are mutated in place so a steady
 * ring never allocates after the first fill.
 */
export function ringAround(cx: number, cy: number, r: number, out: RingEntry[]): RingEntry[] {
  let n = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const e = out[n];
      if (e) {
        e.cx = cx + dx;
        e.cy = cy + dy;
        e.d2 = dx * dx + dy * dy;
      } else {
        out.push({ cx: cx + dx, cy: cy + dy, d2: dx * dx + dy * dy });
      }
      n++;
    }
  }
  out.length = n;
  out.sort(byD2);
  return out;
}

function byD2(a: RingEntry, b: RingEntry): number {
  return a.d2 - b.d2 || a.cy - b.cy || a.cx - b.cx;
}

/** True when (cx, cy) lies outside the Chebyshev square of radius r. */
export function outsideRing(cx: number, cy: number, ccx: number, ccy: number, r: number): boolean {
  return Math.abs(cx - ccx) > r || Math.abs(cy - ccy) > r;
}
