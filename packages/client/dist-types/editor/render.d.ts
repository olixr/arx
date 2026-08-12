import { Tile } from '@arx/shared';
import type { EditorState } from './state.js';
/** Sentinel ground value marking a transparent ghost cell. */
export declare const GHOST_SKIP = 65535;
export type OverlayKind = 'none' | 'block' | 'tree' | 'door' | 'portal';
export declare function overlayKind(t: Tile): OverlayKind;
/**
 * Schematic standing tile: a chunky extruded block — darker body,
 * lit top plate, world-outline ink. Shared with palette thumbnails so
 * the swatch you pick is the block you see.
 */
export declare function drawBlockTile(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number, t: Tile): void;
/** Paint one tree tile's sprite at a screen cell — shared with previews. */
export declare function drawTreeSprite(ctx: CanvasRenderingContext2D, tile: Tile, tx: number, ty: number, px: number, py: number, s: number): void;
export interface PreviewOverlay {
    /** Local tile indices to highlight. */
    indices: Set<number>;
    color: string;
    /** v2: the live measurement chip for shape drags (LOCAL tiles). */
    dims?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
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
    /**
     * Floating stamp ghost anchored at a local tile — paste buffers,
     * structure templates, and prefabs all preview through this. Cells
     * equal to GHOST_SKIP are transparent; pins preview placements a
     * prefab will drop.
     */
    ghost: {
        w: number;
        h: number;
        ground: Uint16Array;
        detail?: Uint16Array;
        /** v2 true-render ghosts: elevation rides the bake when present. */
        elev?: Int8Array;
        /** v2: stable identity for the baked-ghost cache (tpl:/pf: ids). */
        key?: string;
        at: {
            x: number;
            y: number;
        };
        pins?: Array<{
            dx: number;
            dy: number;
            color: string;
        }>;
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
    /** Sub-tile coordinates — placement hit tests want exact distance. */
    tileAtFloat(clientX: number, clientY: number): {
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