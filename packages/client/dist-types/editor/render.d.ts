import { Tile } from '@devcraft/shared';
import type { EditorState } from './state.js';
export type OverlayKind = 'none' | 'block' | 'tree' | 'door' | 'portal';
export declare function overlayKind(t: Tile): OverlayKind;
/**
 * Schematic standing tile: a chunky extruded block — darker body,
 * lit top plate, world-outline ink. Shared with palette thumbnails so
 * the swatch you pick is the block you see.
 */
export declare function drawBlockTile(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number, t: Tile): void;
export interface PreviewOverlay {
    /** Local tile indices to highlight. */
    indices: Set<number>;
    color: string;
}
export declare class EditorView {
    private readonly canvas;
    private readonly state;
    panX: number;
    panY: number;
    scale: number;
    showGrid: boolean;
    showChunkGrid: boolean;
    showMarkers: boolean;
    showElev: boolean;
    /** Live tool feedback painted over the map. */
    preview: PreviewOverlay | null;
    /** Floating paste ghost anchored at a local tile. */
    ghost: {
        w: number;
        h: number;
        ground: Uint16Array;
        at: {
            x: number;
            y: number;
        };
    } | null;
    /** While a stroke is live, chunk rebakes are throttled hard. */
    strokeActive: boolean;
    private readonly baked;
    private lastStrokeBakeAt;
    constructor(canvas: HTMLCanvasElement, state: EditorState);
    tileAt(clientX: number, clientY: number): {
        x: number;
        y: number;
    };
    zoomAt(clientX: number, clientY: number, factor: number): void;
    centerOn(x: number, y: number): void;
    fitZone(): void;
    /** Invalidate baked art around an edited local rect (blob contours
     *  and detail spill reach a few tiles past a chunk seam). */
    markDirty(x0: number, y0: number, x1: number, y1: number): void;
    markAllDirty(): void;
    render(nowMs: number): void;
    private sx;
    private sy;
    private blitGround;
    /** Instant flat-color stand-in while a chunk's real bake is queued. */
    private flatChunk;
    private bakeLocal;
    private drawOverlays;
    private drawElev;
    private drawGrids;
    private drawMarkers;
    private drawPreview;
    private drawGhost;
    private drawSelection;
    private drawZoneFrame;
}
//# sourceMappingURL=render.d.ts.map