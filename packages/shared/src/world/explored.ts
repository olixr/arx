/**
 * THE CHART — per-player fog-of-war coverage.
 *
 * The world is unbounded procedural terrain, so explored ground is a
 * SPARSE set of region bitmasks, never one big array. A region is a
 * 256×256-tile square holding 64×64 four-tile cells — one bit each,
 * 512 bytes per region. Regions materialize the first time a player
 * walks into them and persist per character.
 *
 * THE DETERMINISTIC-REVEAL LAW: client and server both run markDisc()
 * with the same radius over the same walk, so the client clears its own
 * fog with zero latency and zero protocol, while the server keeps the
 * authoritative copy that survives devices. The only mask bytes that
 * ever travel are the login snapshot. Any drift between the two is
 * bounded by one sample interval of movement — under a cell — and the
 * client's generous fringe self-heals on the next login.
 *
 * THE WORLDS APART: one mask charts ONE plane. Persistence is the
 * PLANE'S law now (PlaneDef.persistent), not a y-band's — scratch
 * planes (dungeon runs) keep their mask in RAM for the run and never
 * touch the DB or the wire.
 */

/** Tiles per explored cell (one fog bit covers a 4×4 square). */
export const EXPLORE_CELL = 4;

/** Tiles per region row/column (256 → 64×64 cells → 512-byte mask). */
export const EXPLORE_REGION = 256;

/** Cells per region row/column. */
export const REGION_CELLS = EXPLORE_REGION / EXPLORE_CELL;

/** Bytes in one region bitmask. */
export const REGION_BYTES = (REGION_CELLS * REGION_CELLS) / 8;

/** Tiles of fog cleared around a standing body. */
export const REVEAL_RADIUS = 22;

/** Server reveal cadence in ticks (250ms at 20Hz). */
export const SERVER_REVEAL_TICKS = 5;

/** Client self-reveal cadence in ms. */
export const CLIENT_REVEAL_MS = 200;

/** Regions per S2CExplored message on the login push. */
export const EXPLORED_PUSH_BATCH = 64;

/** Tiles from a POI anchor at which the site counts as found. */
export const DISCOVER_TILES = 24;

export function regionKey(rx: number, ry: number): string {
  return `${rx},${ry}`;
}


/**
 * Sparse per-player fog mask. Bit layout inside a region is row-major
 * over cells: bit index = cellY * REGION_CELLS + cellX, packed LSB
 * first into bytes (bit b of byte i covers cell index i*8+b).
 */
export class ExploredMask {
  private readonly regions = new Map<string, Uint8Array>();

  /** Number of materialized regions (test/diagnostic surface). */
  get regionCount(): number {
    return this.regions.size;
  }

  clear(): void {
    this.regions.clear();
  }

  /** Install a region's bytes wholesale (login snapshot / DB load). */
  loadRegion(rx: number, ry: number, bits: Uint8Array): void {
    const bytes = new Uint8Array(REGION_BYTES);
    bytes.set(bits.subarray(0, REGION_BYTES));
    this.regions.set(regionKey(rx, ry), bytes);
  }

  /** The region's live bytes, or null if never touched. */
  regionBytes(rx: number, ry: number): Uint8Array | null {
    return this.regions.get(regionKey(rx, ry)) ?? null;
  }

  /** Every materialized region key, for snapshot walks. */
  regionKeys(): IterableIterator<string> {
    return this.regions.keys();
  }

  private cellBit(tx: number, ty: number): { key: string; byte: number; mask: number } {
    const cx = Math.floor(tx / EXPLORE_CELL);
    const cy = Math.floor(ty / EXPLORE_CELL);
    const rx = Math.floor(cx / REGION_CELLS);
    const ry = Math.floor(cy / REGION_CELLS);
    const lx = cx - rx * REGION_CELLS;
    const ly = cy - ry * REGION_CELLS;
    const idx = ly * REGION_CELLS + lx;
    return { key: regionKey(rx, ry), byte: idx >> 3, mask: 1 << (idx & 7) };
  }

  /** Whether the tile's cell has been charted. */
  isRevealed(tx: number, ty: number): boolean {
    const { key, byte, mask } = this.cellBit(tx, ty);
    const bytes = this.regions.get(key);
    return bytes !== undefined && (bytes[byte]! & mask) !== 0;
  }

  /** Whether a cell (cell coords, not tiles) has been charted. */
  cellRevealed(cx: number, cy: number): boolean {
    return this.isRevealed(cx * EXPLORE_CELL, cy * EXPLORE_CELL);
  }

  /**
   * Clear fog in a disc of `radius` tiles around a world position.
   * Returns the keys of regions whose bytes changed (the dirty set the
   * server unions for its periodic flush). Cell membership is tested at
   * the CELL CENTER against the exact radius — pure integer-derived
   * math, so two masks walking the same track mark identical bits.
   */
  markDisc(x: number, y: number, radius: number = REVEAL_RADIUS): string[] {
    const dirty: string[] = [];
    const r2 = radius * radius;
    const cx0 = Math.floor((x - radius) / EXPLORE_CELL);
    const cx1 = Math.floor((x + radius) / EXPLORE_CELL);
    const cy0 = Math.floor((y - radius) / EXPLORE_CELL);
    const cy1 = Math.floor((y + radius) / EXPLORE_CELL);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const centerX = (cx + 0.5) * EXPLORE_CELL;
        const centerY = (cy + 0.5) * EXPLORE_CELL;
        const dx = centerX - x;
        const dy = centerY - y;
        if (dx * dx + dy * dy > r2) continue;
        const rx = Math.floor(cx / REGION_CELLS);
        const ry = Math.floor(cy / REGION_CELLS);
        const key = regionKey(rx, ry);
        let bytes = this.regions.get(key);
        if (!bytes) {
          bytes = new Uint8Array(REGION_BYTES);
          this.regions.set(key, bytes);
        }
        const lx = cx - rx * REGION_CELLS;
        const ly = cy - ry * REGION_CELLS;
        const idx = ly * REGION_CELLS + lx;
        const byte = idx >> 3;
        const mask = 1 << (idx & 7);
        if ((bytes[byte]! & mask) === 0) {
          bytes[byte] = bytes[byte]! | mask;
          if (!dirty.includes(key)) dirty.push(key);
        }
      }
    }
    return dirty;
  }

}

// Base64 helpers that run identically in Node and the browser — the
// mask travels as b64 strings inside JSON control-plane messages.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_REV = (() => {
  const rev = new Int8Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) rev[B64.charCodeAt(i)] = i;
  return rev;
})();

export function u8ToB64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    out += B64[a >> 2]! + B64[((a & 3) << 4) | (b >> 4)]!;
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)]! : '=';
    out += i + 2 < bytes.length ? B64[c & 63]! : '=';
  }
  return out;
}

export function b64ToU8(s: string): Uint8Array {
  let len = s.length;
  while (len > 0 && s[len - 1] === '=') len--;
  const outLen = Math.floor((len * 3) / 4);
  const out = new Uint8Array(outLen);
  let o = 0;
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const v = B64_REV[s.charCodeAt(i) & 127]!;
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out;
}
