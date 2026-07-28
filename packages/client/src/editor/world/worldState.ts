import type { GeographyDef } from '@arx/content';
import type { MapListEntry, WorldCell, WorldSnapshot } from '../api.js';

/**
 * THE WORLD DOCUMENT — the World view's state: the geography DRAFT
 * (the plan being edited), the frontier ledger as the server tells
 * it, and the view/tool state around them. Same observable law as
 * EditorState: plain fields, one changed() fan-out, no framework.
 *
 * The draft is the SINGLE working copy: every edit mutates `geo`
 * through beginOp (snapshot undo — the whole plan is a few KB, so
 * world history is snapshot-based where zone history is cell-op
 * based) and the view previews it through the editor bundle's OWN
 * live geography registry (replaceGeography + the real worldgen).
 * Save PUTs the draft; the server then regenerates the true world.
 */

export type WorldTool = 'select' | 'route' | 'trail' | 'site' | 'anchor' | 'planned';

export type WorldSel =
  | { kind: 'waypoint'; route: string; idx: number }
  | { kind: 'route'; route: string }
  | { kind: 'site'; id: string }
  | { kind: 'anchor'; idx: number }
  | { kind: 'planned'; id: string }
  | { kind: 'zone'; id: string }
  | { kind: 'cell'; cx: number; cy: number };

export function sameSel(a: WorldSel | null, b: WorldSel | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'waypoint':
      return b.kind === 'waypoint' && a.route === b.route && a.idx === b.idx;
    case 'route':
      return b.kind === 'route' && a.route === b.route;
    case 'site':
      return b.kind === 'site' && a.id === b.id;
    case 'anchor':
      return b.kind === 'anchor' && a.idx === b.idx;
    case 'planned':
      return b.kind === 'planned' && a.id === b.id;
    case 'zone':
      return b.kind === 'zone' && a.id === b.id;
    case 'cell':
      return b.kind === 'cell' && a.cx === b.cx && a.cy === b.cy;
  }
}

interface WorldOp {
  label: string;
  json: string;
}

export class WorldState {
  /** The geography draft — null until the first /dev/world read. */
  geo: GeographyDef | null = null;
  /** JSON of the last server-acknowledged plan (dirty baseline). */
  private savedJson = '';
  seed = 1337;
  poiCell = 128;
  cells: WorldCell[] = [];
  zones: MapListEntry[] = [];
  poiDefs: WorldSnapshot['poiDefs'] = [];
  /** Server-side advisory warnings from the last read/save. */
  warnings: string[] = [];
  /** The doc diverges from the shipped plan (revert offered). */
  edited = false;
  /** True while /dev/world has never answered (offline studio). */
  offline = false;

  tool: WorldTool = 'select';
  sel: WorldSel | null = null;
  hover: WorldSel | null = null;
  /** World-tile under the cursor (statusbar + tools). */
  hoverTile: { x: number; y: number } | null = null;
  /** A route being laid (route/trail tool): waypoints so far. */
  routeDraft: { kind: 'road' | 'trail'; pts: Array<{ x: number; y: number }> } | null = null;

  /** Overlay toggles — what the world wears. */
  readonly show = {
    zones: true,
    roads: true,
    sites: true,
    anchors: true,
    cells: true,
    danger: false,
    grid: false,
  };

  private readonly undoStack: WorldOp[] = [];
  private readonly redoStack: WorldOp[] = [];
  private static readonly UNDO_CAP = 200;

  private readonly listeners = new Set<() => void>();

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  changed(): void {
    for (const fn of this.listeners) fn();
  }

  get dirty(): boolean {
    return this.geo !== null && JSON.stringify(this.geo) !== this.savedJson;
  }

  /** Adopt a fresh server snapshot (open/boot/save-ack/reload). */
  adopt(snap: WorldSnapshot, opts: { keepDraft?: boolean } = {}): void {
    this.seed = snap.seed;
    this.poiCell = snap.poiCell;
    this.cells = snap.cells;
    this.poiDefs = snap.poiDefs;
    this.warnings = snap.warnings;
    this.edited = snap.geographyEdited;
    this.savedJson = JSON.stringify(snap.geography);
    if (!opts.keepDraft || this.geo === null) {
      this.geo = snap.geography;
      this.undoStack.length = 0;
      this.redoStack.length = 0;
      this.sel = null;
      this.hover = null;
      this.routeDraft = null;
    }
    this.offline = false;
    this.changed();
  }

  /** Mark the current draft as the saved truth (after a PUT lands). */
  markSaved(warnings: string[]): void {
    if (this.geo) this.savedJson = JSON.stringify(this.geo);
    this.warnings = warnings;
    this.edited = true;
    this.changed();
  }

  /**
   * Snapshot the plan before a mutation — ONE call per user gesture
   * (a whole waypoint drag is one op; the caller invokes this on
   * gesture start, not per mousemove).
   */
  beginOp(label: string): void {
    if (!this.geo) return;
    this.undoStack.push({ label, json: JSON.stringify(this.geo) });
    if (this.undoStack.length > WorldState.UNDO_CAP) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo(): string | null {
    if (!this.geo) return null;
    const op = this.undoStack.pop();
    if (!op) return null;
    this.redoStack.push({ label: op.label, json: JSON.stringify(this.geo) });
    this.geo = JSON.parse(op.json) as GeographyDef;
    this.sel = null;
    this.routeDraft = null;
    this.changed();
    return op.label;
  }

  redo(): string | null {
    if (!this.geo) return null;
    const op = this.redoStack.pop();
    if (!op) return null;
    this.undoStack.push({ label: op.label, json: JSON.stringify(this.geo) });
    this.geo = JSON.parse(op.json) as GeographyDef;
    this.sel = null;
    this.routeDraft = null;
    this.changed();
    return op.label;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** The zone list rides /dev/maps — the Open browser's same truth. */
  setZones(list: MapListEntry[]): void {
    this.zones = list;
    this.changed();
  }

  /** The ledger row for a macro-cell, if the frontier decided it. */
  cellAt(cx: number, cy: number): WorldCell | undefined {
    return this.cells.find((c) => c.cellX === cx && c.cellY === cy);
  }
}
