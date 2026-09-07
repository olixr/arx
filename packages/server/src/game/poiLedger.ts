/**
 * THE FRONTIER KEEPS ITS INDEX (core audit 2026-09, Band B) — the
 * frontier's ledgers as indexed maps. The beat used to be O(ledger²)
 * string work on the tick thread: every core re-walked the whole
 * ledger to count its satellites, every calm read re-split every calm
 * key, and the ledger only ever grows (one row per decided tier>0
 * cell, forever). These maps keep the Map contract every reader
 * already leans on (get/has/iterate) and maintain their own indexes
 * at the ONE door every write already uses — set/delete — so no call
 * site can forget the other half.
 */
import type { PoiSite } from '../world/pois.js';

/** A decided cell's ledger row — the world_pois dialect plus the parsed key. */
export interface PoiRow {
  epoch: number;
  site: PoiSite | null;
  clearedAt: number | null;
  emberUntil: number | null;
  fallowUntil: number | null;
  /** Boldness rung (0 = base camp) + when the current rung began. */
  stage: number;
  stageAt: number | null;
  /** Satellite camps point at their core's cell key (the family law). */
  originCell: string | null;
  /**
   * THE CHAMPION'S MARK: the victory banner's names (felling hand
   * first, then their sworn party). Rides only rows with a
   * clearedAt stamp; omitted everywhere a fresh decision stands —
   * the banner falls with the carcass, never survives the turn.
   */
  clearedBy?: string[] | null;
  /** The cell key, parsed ONCE at write (the beat never splits again). */
  cx: number;
  cy: number;
}

/** What a writer hands the ledger — the key carries the coordinates. */
export type PoiRowInput = Omit<PoiRow, 'cx' | 'cy'> & { cx?: number; cy?: number };

const NO_KEYS: ReadonlySet<string> = new Set();

/**
 * The world_pois ledger with a satellite index: originCell → the keys
 * of every row that names it. Satellite counts, toll lookups, the
 * kill-switch scatter, and the covet check all read their family in
 * O(family) instead of O(ledger).
 */
export class PoiLedger extends Map<string, PoiRow> {
  private readonly byOrigin = new Map<string, Set<string>>();

  constructor(rows?: Iterable<readonly [string, PoiRowInput]>) {
    // Never hand the iterable to super: Map's constructor calls the
    // subclass `set` before this class's fields exist.
    super();
    if (rows) for (const [key, row] of rows) this.set(key, row);
  }

  override set(key: string, row: PoiRowInput): this {
    const prior = super.get(key);
    if (prior !== undefined && prior.originCell !== null) this.unindex(prior.originCell, key);
    const comma = key.indexOf(',');
    const full = row as PoiRow;
    full.cx = Number(key.slice(0, comma));
    full.cy = Number(key.slice(comma + 1));
    super.set(key, full);
    if (full.originCell !== null) {
      let set = this.byOrigin.get(full.originCell);
      if (!set) {
        set = new Set();
        this.byOrigin.set(full.originCell, set);
      }
      set.add(key);
    }
    return this;
  }

  override delete(key: string): boolean {
    const prior = super.get(key);
    if (prior !== undefined && prior.originCell !== null) this.unindex(prior.originCell, key);
    return super.delete(key);
  }

  override clear(): void {
    this.byOrigin.clear();
    super.clear();
  }

  /** Every row key whose originCell is `origin` — the family, unfiltered. */
  satellitesOf(origin: string): ReadonlySet<string> {
    return this.byOrigin.get(origin) ?? NO_KEYS;
  }

  private unindex(origin: string, key: string): void {
    const set = this.byOrigin.get(origin);
    if (!set) return;
    set.delete(key);
    if (set.size === 0) this.byOrigin.delete(origin);
  }
}

/** A relax window: when it lifts, and the cell it stands on (parsed once). */
export interface CalmWindow {
  until: number;
  cx: number;
  cy: number;
}

/** A strongbox override: the owning cell, the re-tabled loot, the ward. */
export interface ChestOver {
  cell: string;
  table?: string;
  warded?: boolean;
  level?: number;
}

/**
 * The root a chest's owner cell retires under: a POI cell is its own
 * root; a capital's chests (`sh:<gx,gy>` and the captained wards'
 * `sh:<gx,gy>:<ward>`) all retire with the capital.
 */
export function chestRootOf(cell: string): string {
  if (!cell.startsWith('sh:')) return cell;
  const colon = cell.indexOf(':', 3);
  return colon === -1 ? cell : cell.slice(0, colon);
}

/**
 * The strongbox overrides by world-tile key, with a reverse map by
 * owner root — retireCapital/retirePoiCell prune their chests in
 * O(chests of that cell), never by a prefix scan of every lid in the
 * world.
 */
export class ChestLedger extends Map<string, ChestOver> {
  private readonly byRoot = new Map<string, Set<string>>();

  constructor(entries?: Iterable<readonly [string, ChestOver]>) {
    super();
    if (entries) for (const [key, over] of entries) this.set(key, over);
  }

  override set(tileKey: string, over: ChestOver): this {
    const prior = super.get(tileKey);
    if (prior !== undefined) this.unindex(chestRootOf(prior.cell), tileKey);
    super.set(tileKey, over);
    const root = chestRootOf(over.cell);
    let set = this.byRoot.get(root);
    if (!set) {
      set = new Set();
      this.byRoot.set(root, set);
    }
    set.add(tileKey);
    return this;
  }

  override delete(tileKey: string): boolean {
    const prior = super.get(tileKey);
    if (prior !== undefined) this.unindex(chestRootOf(prior.cell), tileKey);
    return super.delete(tileKey);
  }

  override clear(): void {
    this.byRoot.clear();
    super.clear();
  }

  /** The tile keys of every override owned by this root, or undefined when it holds none. */
  keysOf(root: string): ReadonlySet<string> | undefined {
    return this.byRoot.get(root);
  }

  /** Drop every override owned by this root (a POI cell key or `sh:<key>`). */
  retireCell(root: string): void {
    const keys = this.byRoot.get(root);
    if (!keys) return;
    for (const tileKey of keys) super.delete(tileKey);
    this.byRoot.delete(root);
  }

  private unindex(root: string, tileKey: string): void {
    const set = this.byRoot.get(root);
    if (!set) return;
    set.delete(tileKey);
    if (set.size === 0) this.byRoot.delete(root);
  }
}
