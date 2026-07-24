import type { ZoneDef } from '@devcraft/content';

/**
 * Undo/redo. Brush strokes coalesce into one op holding per-cell
 * before/after values across all three layers (a stroke is one undo,
 * however long the drag). Structural ops — resize, origin move, meta,
 * marker edits — snapshot the whole zone; they're rare enough that
 * the clone cost never matters.
 */

export interface CellChange {
  i: number;
  g0: number;
  d0: number;
  e0: number;
  g1: number;
  d1: number;
  e1: number;
}

export type HistoryOp =
  | { kind: 'cells'; label: string; cells: CellChange[] }
  | { kind: 'zone'; label: string; before: ZoneDef; after: ZoneDef };

export function cloneZone(zone: ZoneDef): ZoneDef {
  return {
    ...zone,
    origin: { ...zone.origin },
    ground: new Uint16Array(zone.ground),
    detail: new Uint16Array(zone.detail),
    elev: zone.elev ? new Int8Array(zone.elev) : undefined,
    spawn: zone.spawn ? { ...zone.spawn } : undefined,
    portals: zone.portals?.map((p) => ({ ...p })),
    spawns: zone.spawns?.map((s) => ({ ...s })),
    actorSpawns: zone.actorSpawns?.map((a) => ({ ...a })),
  };
}

/** Collects one stroke's cells; first touch wins the "before" value. */
export class StrokeRecorder {
  private readonly cells = new Map<number, CellChange>();

  record(i: number, g0: number, d0: number, e0: number): CellChange {
    let c = this.cells.get(i);
    if (!c) {
      c = { i, g0, d0, e0, g1: g0, d1: d0, e1: e0 };
      this.cells.set(i, c);
    }
    return c;
  }

  get size(): number {
    return this.cells.size;
  }

  finish(label: string): HistoryOp | null {
    const cells = [...this.cells.values()].filter(
      (c) => c.g0 !== c.g1 || c.d0 !== c.d1 || c.e0 !== c.e1,
    );
    return cells.length > 0 ? { kind: 'cells', label, cells } : null;
  }
}

export class History {
  private readonly undoStack: HistoryOp[] = [];
  private readonly redoStack: HistoryOp[] = [];
  private readonly limit = 200;

  push(op: HistoryOp): void {
    this.undoStack.push(op);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Pop + apply; returns the new zone (structural ops swap the object). */
  undo(zone: ZoneDef): { zone: ZoneDef; label: string } | null {
    const op = this.undoStack.pop();
    if (!op) return null;
    this.redoStack.push(op);
    if (op.kind === 'zone') return { zone: cloneZone(op.before), label: op.label };
    for (const c of op.cells) {
      zone.ground[c.i] = c.g0;
      zone.detail[c.i] = c.d0;
      if (zone.elev) zone.elev[c.i] = c.e0;
    }
    return { zone, label: op.label };
  }

  redo(zone: ZoneDef): { zone: ZoneDef; label: string } | null {
    const op = this.redoStack.pop();
    if (!op) return null;
    this.undoStack.push(op);
    if (op.kind === 'zone') return { zone: cloneZone(op.after), label: op.label };
    for (const c of op.cells) {
      zone.ground[c.i] = c.g1;
      zone.detail[c.i] = c.d1;
      if (zone.elev) zone.elev[c.i] = c.e1;
    }
    return { zone, label: op.label };
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
