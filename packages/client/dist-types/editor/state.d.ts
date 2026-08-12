import { Detail, Tile } from '@arx/shared';
import type { PrefabDef, ZoneDef } from '@arx/content';
/** The editor's document + tool state. Plain and observable. */
export type ToolId = 'paint' | 'erase' | 'line' | 'rect' | 'ellipse' | 'polygon' | 'fill' | 'road' | 'select' | 'picker' | 'structure' | 'prefab' | 'portal' | 'cluster' | 'actor' | 'sign' | 'spawn';
/** How the select tool chooses: drag a box, draw a loop, or match tiles. */
export type SelectMode = 'marquee' | 'lasso' | 'wand' | 'same';
/** How the paint tool lays cells: plain, clipboard pattern, or scatter. */
export type BrushMode = 'normal' | 'pattern' | 'scatter';
/** Which sidebar tab is showing. */
export type SidebarTab = 'tiles' | 'structures' | 'placements' | 'people';
export type PlacementKind = 'portal' | 'cluster' | 'actor' | 'spawn' | 'sign';
/** A handle to one placement in the zone (spawn point uses index 0). */
export interface PlacementRef {
    kind: PlacementKind;
    index: number;
}
export type LayerId = 'ground' | 'detail' | 'elev';
export interface Selection {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}
export interface ClipBuf {
    w: number;
    h: number;
    ground: Uint16Array;
    detail: Uint16Array;
    elev: Int8Array;
    /** Lasso/wand captures: 1 = the cell travels, 0 = a hole. */
    mask?: Uint8Array;
}
export declare function newZone(id?: string, name?: string, width?: number, height?: number): ZoneDef;
export declare class EditorState {
    zone: ZoneDef;
    dirty: boolean;
    /** True once the open zone came from (or was saved to) the server. */
    serverBacked: boolean;
    tool: ToolId;
    layer: LayerId;
    brushTile: Tile;
    brushDetail: Detail;
    elevLevel: number;
    brushSize: number;
    brushShape: 'round' | 'square';
    /** Rect/ellipse/polygon tools: filled or outline. */
    shapeFill: boolean;
    /** Rect tool: outline as a wall shell with a south doorway. */
    rectWalls: boolean;
    roadWidth: number;
    selectMode: SelectMode;
    brushMode: BrushMode;
    /** Scatter brush: chance a stroked cell takes the detail, 0..1. */
    scatterDensity: number;
    selection: Selection | null;
    /**
     * Lasso/wand refinement of `selection` (its bbox): LOCAL cell
     * indices that are truly selected. Null = the whole rect.
     */
    selectionMask: Set<number> | null;
    clip: ClipBuf | null;
    hover: {
        x: number;
        y: number;
    } | null;
    /** Sidebar tab; placement/structure tools auto-switch it. */
    tab: SidebarTab;
    /** Armed structure template id (structure tool). */
    armedTemplate: string | null;
    /** Armed prefab (prefab tool) — fetched def, ready to stamp. */
    armedPrefab: PrefabDef | null;
    /** Mirror the armed stamp east-west (X key). */
    stampFlip: boolean;
    /** The selected placement, if any — inspector target. */
    selected: PlacementRef | null;
    /** Placement under the cursor (hover affordance). */
    hoverPlacement: PlacementRef | null;
    /** People-library pick: the NEXT cluster placement uses this npc. */
    pendingNpc: string | null;
    /** People-library pick: the NEXT actor placement uses this slug. */
    pendingActor: string | null;
    /** Bulk-edit checkmarks: cluster indices sharing the next field set. */
    bulkChecked: Set<number>;
    private readonly listeners;
    onChange(fn: () => void): void;
    changed(): void;
    /** Normalize an incoming zone so the editor's invariants hold. */
    adopt(zone: ZoneDef, opts: {
        serverBacked: boolean;
    }): void;
}
//# sourceMappingURL=state.d.ts.map