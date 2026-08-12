/**
 * EDITOR OPS — the document verbs of the zone editor, extracted from
 * the v1 god module. Everything that mutates the zone (brush strokes,
 * shapes, stamps, placements, clipboard, road, undo) lives here as one
 * testable seam; the pointer machine, the keyboard, the rail, and the
 * ⌘K palette are all just hands reaching for these verbs.
 */
import { type StructureTemplate, type ZoneDef } from '@arx/content';
import { History, StrokeRecorder } from '../editor/history.js';
import type { EditorState, PlacementRef, ToolId } from '../editor/state.js';
import type { Viewport } from './viewport.js';
import { type Pt } from '../editor/tools.js';
import type { RegistrySnapshot } from '../editor/api.js';
export type { Pt };
export interface ClipRegion {
    w: number;
    h: number;
    ground: Uint16Array;
    detail: Uint16Array;
    elev: Int8Array;
    /** Lasso/wand captures: 1 = the cell travels, 0 = a hole. */
    mask?: Uint8Array;
}
export declare class EditorOps {
    readonly state: EditorState;
    readonly view: Viewport;
    readonly history: History;
    private readonly getRegistry;
    /** Road tool waypoints-in-progress. */
    roadPts: Pt[];
    /** ⌘V armed: next click stamps the clipboard. */
    pasteArmed: boolean;
    /**
     * PATROL EDITING (Phase 3): while set, canvas clicks append WORLD
     * waypoints to this cluster's patrol; Enter commits, Esc restores.
     */
    patrolEdit: {
        index: number;
        points: Array<{
            x: number;
            y: number;
        }>;
    } | null;
    /** Polygon tool corners-in-progress (LOCAL tiles). */
    polyPts: Pt[];
    /** Per-stroke die for the scatter brush — same stroke, same holes. */
    private scatterSeed;
    private pendingZoneBefore;
    constructor(state: EditorState, view: Viewport, history: History, getRegistry: () => RegistrySnapshot);
    idx(x: number, y: number): number;
    inBounds(x: number, y: number): boolean;
    markDirtyCells(pts: Pt[]): void;
    /** Roll a new die for the coming stroke (scatter's hole pattern). */
    newStrokeSeed(): void;
    /** The last stroke's refused-stair reason (one toast at commit). */
    stairsBlocked: string | null;
    /** THE STAIR ARMS ONLY ON LEGAL GROUND — the reason, or null. */
    stairReasonAt(x: number, y: number): string | null;
    applyBrush(rec: StrokeRecorder, x: number, y: number, erase: boolean): void;
    commitStroke(rec: StrokeRecorder, label: string, pts: Pt[]): void;
    /** One-shot cell application (fill, shapes, road). */
    applyCellsOp(label: string, pts: Pt[], erase?: boolean): void;
    /**
     * Structural zone op (resize, origin, placements): full snapshots.
     * Placement-only edits pass tiles:false and skip the ground rebake.
     */
    zoneOp(label: string, mutate: (z: ZoneDef) => void, opts?: {
        tiles?: boolean;
    }): void;
    beginZoneGesture(): void;
    cancelZoneGesture(): void;
    endZoneGesture(label: string, opts?: {
        tiles?: boolean;
    }): void;
    /** Jump the history cursor to `target` (the History panel's click). */
    jumpHistory(target: number): void;
    undoRedo(dir: 'undo' | 'redo'): void;
    setTool(tool: ToolId): void;
    /** Put an armed structure/prefab stamp away without placing it. */
    disarmStamp(quiet?: boolean): boolean;
    pickAt(x: number, y: number): void;
    setPreview(pts: Pt[], erase: boolean, dims?: {
        x: number;
        y: number;
        w: number;
        h: number;
    }): void;
    shapeCells(d: {
        anchor: Pt;
        cur: Pt;
    }, shift: boolean): Pt[];
    brushFootprint(x: number, y: number): Pt[];
    strokeLine(a: Pt, b: Pt): Pt[];
    floodFrom(x: number, y: number): Pt[];
    polygonPreviewCells(extra?: Pt): Pt[];
    commitPolygon(): boolean;
    /** The lasso loop's filled region (its own path closes it). */
    lassoPreview(path: Pt[]): Pt[];
    abandonPolygon(): boolean;
    /**
     * THE WALL SHELL (rect tool, walls mode): the outline in the chosen
     * wall tile with a doorway centered on the south face — a building's
     * bones in one drag. The doorway follows the wall's material.
     */
    applyWallShell(anchor: Pt, cur: Pt): void;
    wallShellPreview(anchor: Pt, cur: Pt): Pt[];
    /** Contiguous same-value region under the cursor (the wand). */
    wandCells(x: number, y: number): Pt[];
    /** EVERY cell matching the value under the cursor (select-same). */
    selectSameCells(x: number, y: number): Pt[];
    roadPreviewCells(extra?: Pt): Pt[];
    commitRoad(): void;
    abandonRoad(): boolean;
    selRect(): {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    } | null;
    /** Is this LOCAL cell inside the live selection (mask-aware)? */
    inSelection(x: number, y: number): boolean;
    /** Every selected LOCAL cell (the rect, refined by the mask). */
    selectionCells(): Pt[];
    /** Adopt an arbitrary cell set as the selection (lasso/wand/same). */
    setSelectionFromCells(pts: Pt[]): void;
    clearSelection(): void;
    copySelection(): boolean;
    /** Clear the SELECTED cells (mask-aware) as one op. */
    clearSelectedCells(label: string): void;
    /** Legacy rect clear (delete-selection path keeps its name). */
    clearRegion(r: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    }, label: string): void;
    /** Clear the selection's cells into an open recorder (a move's cut). */
    clearRegionInto(r: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    }, rec: StrokeRecorder, pts: Pt[]): void;
    stampBuffer(buf: ClipRegion, at: Pt, rec: StrokeRecorder, pts: Pt[]): void;
    cutSelection(): void;
    /**
     * THE SWAP — replace one ground tile with another inside the
     * selection, one undoable op. The quick "this fence was the wrong
     * wood" verb every marquee wants.
     */
    swapTiles(from: number, to: number): number;
    /** Ground-tile census of the selection (the swap dialog's menu). */
    selectionTileCensus(): Array<{
        tile: number;
        count: number;
    }>;
    /**
     * THE NUDGE — arrow keys carry the selection's content (and the
     * selection itself) one tile over, one undoable op per press.
     */
    nudgeSelection(dx: number, dy: number): void;
    armPaste(): boolean;
    cancelPaste(): boolean;
    selectPlacement(ref: PlacementRef | null): void;
    focusPlacement(ref: PlacementRef): void;
    removePlacementRef(ref: PlacementRef): void;
    /** Portal/sign markers carry their entrance tile: moving one swaps tiles. */
    carryPlacementTile(z: ZoneDef, fromW: Pt, toW: Pt): void;
    /** Create the active placement tool's object at a local tile. */
    createPlacementAt(t: Pt): PlacementRef | null;
    beginPatrolEdit(index: number): void;
    addPatrolPoint(wx: number, wy: number): void;
    removeLastPatrolPoint(): void;
    commitPatrolEdit(): boolean;
    cancelPatrolEdit(): boolean;
    clearPatrol(index: number): void;
    placementHit(fx: number, fy: number): PlacementRef | null;
    /** A placement's current LOCAL tile position. */
    placementLocalPos(ref: PlacementRef): {
        x: number;
        y: number;
    } | null;
    clusterEdgeHit(fx: number, fy: number): number | null;
    movePlacementTo(ref: PlacementRef, lx: number, ly: number): void;
    armedTemplateDef(): StructureTemplate | null;
    templateGhost(t: Pt): void;
    stampTemplateAt(t: Pt): void;
    prefabGhost(t: Pt): void;
    stampPrefabAt(t: Pt): void;
}
//# sourceMappingURL=ops.d.ts.map