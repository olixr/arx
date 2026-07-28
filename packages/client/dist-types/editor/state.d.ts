import { Detail, Tile } from '@arx/shared';
import type { PrefabDef, ZoneDef } from '@arx/content';
/** The editor's document + tool state. Plain and observable. */
export type ToolId = 'paint' | 'erase' | 'line' | 'rect' | 'ellipse' | 'fill' | 'road' | 'select' | 'picker' | 'structure' | 'prefab' | 'portal' | 'cluster' | 'actor' | 'sign' | 'spawn';
/** Which sidebar tab is showing. */
export type SidebarTab = 'tiles' | 'structures' | 'placements';
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
    /** Rect/ellipse tools: filled or outline. */
    shapeFill: boolean;
    roadWidth: number;
    selection: Selection | null;
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
    private readonly listeners;
    onChange(fn: () => void): void;
    changed(): void;
    /** Normalize an incoming zone so the editor's invariants hold. */
    adopt(zone: ZoneDef, opts: {
        serverBacked: boolean;
    }): void;
}
//# sourceMappingURL=state.d.ts.map