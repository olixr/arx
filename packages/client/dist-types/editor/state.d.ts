import { Detail, Tile } from '@devcraft/shared';
import type { ZoneDef } from '@devcraft/content';
/** The editor's document + tool state. Plain and observable. */
export type ToolId = 'paint' | 'erase' | 'line' | 'rect' | 'ellipse' | 'fill' | 'road' | 'select' | 'picker' | 'spawn';
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
    private readonly listeners;
    onChange(fn: () => void): void;
    changed(): void;
    /** Normalize an incoming zone so the editor's invariants hold. */
    adopt(zone: ZoneDef, opts: {
        serverBacked: boolean;
    }): void;
}
//# sourceMappingURL=state.d.ts.map