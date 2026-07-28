import type { ZoneDef } from '@arx/content';
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
export type HistoryOp = {
    kind: 'cells';
    label: string;
    cells: CellChange[];
} | {
    kind: 'zone';
    label: string;
    before: ZoneDef;
    after: ZoneDef;
};
export declare function cloneZone(zone: ZoneDef): ZoneDef;
/** Collects one stroke's cells; first touch wins the "before" value. */
export declare class StrokeRecorder {
    private readonly cells;
    record(i: number, g0: number, d0: number, e0: number): CellChange;
    get size(): number;
    finish(label: string): HistoryOp | null;
}
export declare class History {
    private readonly undoStack;
    private readonly redoStack;
    private readonly limit;
    push(op: HistoryOp): void;
    get canUndo(): boolean;
    get canRedo(): boolean;
    /** Pop + apply; returns the new zone (structural ops swap the object). */
    undo(zone: ZoneDef): {
        zone: ZoneDef;
        label: string;
    } | null;
    redo(zone: ZoneDef): {
        zone: ZoneDef;
        label: string;
    } | null;
    clear(): void;
}
//# sourceMappingURL=history.d.ts.map