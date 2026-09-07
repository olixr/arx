/**
 * THE LEDGERS THAT KNOW THEIR CHUNK (core audit 2026-09, Band B): the
 * packed chunk cell every hot spatial read keys on, and the small
 * indexed ledgers — respawn queue, sign board, livestock, routine
 * stops — whose old shape was a whole-world walk per tick or per
 * approach. Each keeps the exact answer of the walk it replaces; the
 * bodiesNear suite pins that equality on seeded slates.
 */
import { CHUNK_SIZE, EntityId, EntityKind, Tile } from '@arx/shared';
import type { PlaneId } from '@arx/content';
import type { LivestockComp } from './gameServer.js';

/** forEachBodyNear kind masks — one EntityKind bit each. */
export const BODY_PLAYER = 1 << EntityKind.Player;
export const BODY_NPC = 1 << EntityKind.Npc;
/** Summons (decoys, baits, totems, traps) are kinded Prop. */
export const BODY_SUMMON = 1 << EntityKind.Prop;

/**
 * One integer per (cx, cy): the chunk grid's key. No string is minted
 * on the moving-body path — `${plane}|${cx},${cy}` stays the public
 * key of `chunks` (the wire and the awake union read it), but the
 * per-tick neighbour walks read the plane's numeric grid instead.
 * ±32767 chunks (a million tiles a side) is the honest range.
 */
export function packChunk(cx: number, cy: number): number {
  return (cx + 0x8000) * 0x10000 + (cy + 0x8000);
}

/** The chunk cell a world coordinate lies in, packed. */
export function cellOf(x: number, y: number): number {
  return packChunk(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
}

/** One integer per tile coordinate — the same packing, tile-scaled. */
export function packTile(tx: number, ty: number): number {
  return (tx + 0x8000) * 0x10000 + (ty + 0x8000);
}

// ------------------------------------------------------- respawn queue

export interface RespawnEntry {
  at: number;
  /** THE WORLDS APART: the plane whose ground restores. */
  plane: PlaneId;
  tx: number;
  ty: number;
  tile: Tile;
  /**
   * Respawn only if the ground still holds this tile — a smashed
   * prop whose floor someone has since built over stays gone rather
   * than stomping the new construction.
   */
  over?: Tile;
}

/**
 * THE DUE HEAD: a binary heap on `at`, so the tick pops only what is
 * due instead of touching every pending door, node and litter tile
 * 20×/s. Ties fall LATER-PUSH-FIRST — the order the old end-to-start
 * array scan fired equal-time entries in — so a tile queued twice
 * still resolves the same way. Removals by tile or rect are rare
 * hands (a door shut by hand, a build, a zone unload) and pay one
 * O(n) filter plus a heapify.
 */
export class RespawnQueue {
  private readonly heap: RespawnEntry[] = [];
  private readonly seqs: number[] = [];
  private nextSeq = 0;

  get length(): number {
    return this.heap.length;
  }

  push(entry: RespawnEntry): void {
    this.heap.push(entry);
    this.seqs.push(this.nextSeq++);
    this.siftUp(this.heap.length - 1);
  }

  /** The earliest-due entry, or undefined when nothing waits. */
  peek(): RespawnEntry | undefined {
    return this.heap[0];
  }

  pop(): RespawnEntry | undefined {
    const n = this.heap.length;
    if (n === 0) return undefined;
    const top = this.heap[0]!;
    const last = this.heap.pop()!;
    const lastSeq = this.seqs.pop()!;
    if (n > 1) {
      this.heap[0] = last;
      this.seqs[0] = lastSeq;
      this.siftDown(0);
    }
    return top;
  }

  /** Drop every entry the predicate names; returns how many went. */
  removeWhere(pred: (e: RespawnEntry) => boolean): number {
    let w = 0;
    for (let r = 0; r < this.heap.length; r++) {
      const e = this.heap[r]!;
      if (pred(e)) continue;
      this.heap[w] = e;
      this.seqs[w] = this.seqs[r]!;
      w++;
    }
    const gone = this.heap.length - w;
    if (gone > 0) {
      this.heap.length = w;
      this.seqs.length = w;
      for (let i = (w >> 1) - 1; i >= 0; i--) this.siftDown(i);
    }
    return gone;
  }

  /** Every pending entry in firing order — a read for audits and tests, never the tick. */
  toArray(): RespawnEntry[] {
    const idx = this.heap.map((_, i) => i);
    idx.sort((a, b) => (this.before(a, b) ? -1 : this.before(b, a) ? 1 : 0));
    return idx.map((i) => this.heap[i]!);
  }

  [Symbol.iterator](): Iterator<RespawnEntry> {
    return this.toArray()[Symbol.iterator]();
  }

  private before(i: number, j: number): boolean {
    const a = this.heap[i]!;
    const b = this.heap[j]!;
    if (a.at !== b.at) return a.at < b.at;
    return this.seqs[i]! > this.seqs[j]!;
  }

  private swap(i: number, j: number): void {
    const h = this.heap;
    const s = this.seqs;
    const he = h[i]!;
    h[i] = h[j]!;
    h[j] = he;
    const se = s[i]!;
    s[i] = s[j]!;
    s[j] = se;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(i, p)) return;
      this.swap(i, p);
      i = p;
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.before(l, m)) m = l;
      if (r < n && this.before(r, m)) m = r;
      if (m === i) return;
      this.swap(i, m);
      i = m;
    }
  }
}

// ----------------------------------------------------------- sign board

export interface PlayerSign {
  plane: PlaneId;
  tx: number;
  ty: number;
  title: string;
  lines: string[];
  owner: number;
}

/**
 * THE BOARD KNOWS ITS CHUNK: player signs by tile (the read on every
 * approach) and by chunk (the hand-out as a chunk streams in — the
 * old sweep read every sign in the world per streamed chunk, ~25 of
 * them at every join and crossing).
 */
export class SignLedger {
  private readonly byTile = new Map<string, PlayerSign>();
  private readonly byChunk = new Map<PlaneId, Map<number, Set<PlayerSign>>>();

  get size(): number {
    return this.byTile.size;
  }

  private static tileKey(plane: PlaneId, tx: number, ty: number): string {
    return `${plane}|${tx},${ty}`;
  }

  get(plane: PlaneId, tx: number, ty: number): PlayerSign | undefined {
    return this.byTile.get(SignLedger.tileKey(plane, tx, ty));
  }

  has(plane: PlaneId, tx: number, ty: number): boolean {
    return this.byTile.has(SignLedger.tileKey(plane, tx, ty));
  }

  set(sign: PlayerSign): void {
    this.delete(sign.plane, sign.tx, sign.ty);
    this.byTile.set(SignLedger.tileKey(sign.plane, sign.tx, sign.ty), sign);
    let grid = this.byChunk.get(sign.plane);
    if (!grid) {
      grid = new Map();
      this.byChunk.set(sign.plane, grid);
    }
    const cell = cellOf(sign.tx, sign.ty);
    let bucket = grid.get(cell);
    if (!bucket) {
      bucket = new Set();
      grid.set(cell, bucket);
    }
    bucket.add(sign);
  }

  delete(plane: PlaneId, tx: number, ty: number): boolean {
    const key = SignLedger.tileKey(plane, tx, ty);
    const sign = this.byTile.get(key);
    if (!sign) return false;
    this.byTile.delete(key);
    const grid = this.byChunk.get(plane);
    const bucket = grid?.get(cellOf(tx, ty));
    if (bucket) {
      bucket.delete(sign);
      if (bucket.size === 0) grid!.delete(cellOf(tx, ty));
    }
    return true;
  }

  values(): IterableIterator<PlayerSign> {
    return this.byTile.values();
  }

  /** The signs standing inside one chunk of one plane. */
  inChunk(plane: PlaneId, cx: number, cy: number): Iterable<PlayerSign> {
    return this.byChunk.get(plane)?.get(packChunk(cx, cy)) ?? EMPTY_SIGNS;
  }
}
const EMPTY_SIGNS: ReadonlySet<PlayerSign> = new Set();

// ------------------------------------------------------------ livestock

/**
 * THE YARD KEEPS ITS ROLL: kept animals by keeper and by trough tile,
 * maintained through the Map's own set/delete so every caller (the
 * release, the sale, the slaughter) files for free. The three
 * lookups the interactions pay were linear over every kept animal
 * in the world.
 */
export class LivestockLedger extends Map<EntityId, LivestockComp> {
  readonly byKeeper = new Map<number, Set<EntityId>>();
  readonly byTrough = new Map<number, Set<EntityId>>();

  override set(eid: EntityId, comp: LivestockComp): this {
    // The Map constructor calls set before the fields exist — a bare
    // `new LivestockLedger()` passes nothing, so this only guards
    // subclass-construction order.
    if (this.byKeeper === undefined) return super.set(eid, comp);
    const prev = super.get(eid);
    if (prev) this.unfile(eid, prev);
    super.set(eid, comp);
    file(this.byKeeper, comp.row.characterId, eid);
    file(this.byTrough, packTile(comp.row.tx, comp.row.ty), eid);
    return this;
  }

  override delete(eid: EntityId): boolean {
    const prev = super.get(eid);
    if (prev) this.unfile(eid, prev);
    return super.delete(eid);
  }

  override clear(): void {
    super.clear();
    this.byKeeper.clear();
    this.byTrough.clear();
  }

  private unfile(eid: EntityId, comp: LivestockComp): void {
    unfile(this.byKeeper, comp.row.characterId, eid);
    unfile(this.byTrough, packTile(comp.row.tx, comp.row.ty), eid);
  }

  keeperCount(characterId: number): number {
    return this.byKeeper.get(characterId)?.size ?? 0;
  }

  troughCount(tx: number, ty: number): number {
    return this.byTrough.get(packTile(tx, ty))?.size ?? 0;
  }

  eidFor(characterId: number, slot: number): EntityId | null {
    const kept = this.byKeeper.get(characterId);
    if (!kept) return null;
    for (const eid of kept) {
      if (this.get(eid)?.row.slot === slot) return eid;
    }
    return null;
  }
}

function file<K>(index: Map<K, Set<EntityId>>, key: K, eid: EntityId): void {
  let set = index.get(key);
  if (!set) {
    set = new Set();
    index.set(key, set);
  }
  set.add(eid);
}

function unfile<K>(index: Map<K, Set<EntityId>>, key: K, eid: EntityId): void {
  const set = index.get(key);
  if (!set) return;
  set.delete(eid);
  if (set.size === 0) index.delete(key);
}

// -------------------------------------------------------- routine stops

/** A record whose stops stand while it is active (a spawn row, an actor post). */
export interface StopOwner {
  readonly plane: PlaneId;
  active: boolean;
}

interface RoutineStop {
  x: number;
  y: number;
  owner: StopOwner;
}

/**
 * THE STOPS BY THEIR CHUNK: every patrol stop, post cell and actor
 * post filed under its chunk at registration, so the litter law's
 * "never on a waypoint" read walks the nearby cells instead of every
 * spawn row the server has ever registered (the roster never
 * shrinks). Retired owners stay filed and answer `active` false —
 * exactly the old scan's skip; a re-tenanted slot unfiles first.
 */
export class StopIndex {
  private readonly byPlane = new Map<PlaneId, Map<number, RoutineStop[]>>();
  private readonly byOwner = new Map<StopOwner, RoutineStop[]>();

  add(owner: StopOwner, x: number, y: number): void {
    let grid = this.byPlane.get(owner.plane);
    if (!grid) {
      grid = new Map();
      this.byPlane.set(owner.plane, grid);
    }
    const cell = cellOf(x, y);
    let bucket = grid.get(cell);
    if (!bucket) {
      bucket = [];
      grid.set(cell, bucket);
    }
    const stop: RoutineStop = { x, y, owner };
    bucket.push(stop);
    let mine = this.byOwner.get(owner);
    if (!mine) {
      mine = [];
      this.byOwner.set(owner, mine);
    }
    mine.push(stop);
  }

  /** Unfile everything one owner stood — the slot is being re-tenanted. */
  remove(owner: StopOwner | undefined): void {
    if (!owner) return;
    const mine = this.byOwner.get(owner);
    if (!mine) return;
    this.byOwner.delete(owner);
    const grid = this.byPlane.get(owner.plane);
    if (!grid) return;
    for (const stop of mine) {
      const cell = cellOf(stop.x, stop.y);
      const bucket = grid.get(cell);
      if (!bucket) continue;
      const i = bucket.indexOf(stop);
      if (i >= 0) bucket.splice(i, 1);
      if (bucket.length === 0) grid.delete(cell);
    }
  }

  /**
   * Every active stop within `reach` (Chebyshev) of a tile, as
   * "tx,ty" keys — the exact set the old whole-roster scan built.
   */
  near(plane: PlaneId, x: number, y: number, reach: number): Set<string> {
    const out = new Set<string>();
    const grid = this.byPlane.get(plane);
    if (!grid) return out;
    const cx0 = Math.floor((x - reach) / CHUNK_SIZE);
    const cx1 = Math.floor((x + reach) / CHUNK_SIZE);
    const cy0 = Math.floor((y - reach) / CHUNK_SIZE);
    const cy1 = Math.floor((y + reach) / CHUNK_SIZE);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const bucket = grid.get(packChunk(cx, cy));
        if (!bucket) continue;
        for (const stop of bucket) {
          if (!stop.owner.active) continue;
          if (Math.abs(stop.x - x) > reach || Math.abs(stop.y - y) > reach) continue;
          out.add(`${Math.floor(stop.x)},${Math.floor(stop.y)}`);
        }
      }
    }
    return out;
  }
}
