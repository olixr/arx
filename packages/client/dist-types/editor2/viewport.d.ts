/**
 * THE VIEWPORT — one camera over two views. The TRUE view is the
 * game's own renderer painting the Editor Stage (Phase 2, the default
 * forever); the DRAFT view is the v1 schematic EditorView, kept as an
 * explicit fallback toggle (THE TRUE VIEWPORT LAW: no third dialect).
 * The camera (center + px/tile) is shared, so flipping views never
 * loses your place; every editor decoration — zone frame, grids,
 * selection, previews, ghosts, markers — draws through the renderer's
 * overlay hook with true world transforms (rings squash into
 * perspective-true ellipses).
 */
import { EditorView } from '../editor/render.js';
import type { EditorState } from '../editor/state.js';
import { EditorStage } from './stage.js';
/** THE LENS SUITE — composable law overlays on the true render. */
export interface Lenses {
    shelf: boolean;
    interiors: boolean;
    reach: boolean;
    edges: boolean;
    growth: boolean;
    factions: boolean;
    signs: boolean;
}
export declare class Viewport {
    readonly draft: EditorView;
    readonly stage: EditorStage;
    private readonly state;
    private readonly draftCanvas;
    private readonly stageCanvas;
    /** The stage paints by default; draft is the explicit fallback. */
    trueView: boolean;
    /** Camera truth: zone-LOCAL tile center + horizontal px per tile. */
    centerX: number;
    centerY: number;
    pxPerTile: number;
    showGrid: boolean;
    showChunkGrid: boolean;
    showMarkers: boolean;
    showElev: boolean;
    /** The Phase 5 law lenses, persisted per user. */
    lenses: Lenses;
    saveLenses(): void;
    /** Reachability cache — reflooded when the world moves. */
    private reachCache;
    /**
     * The people plane (Phase 3): ghosted out-of-hours clusters, the
     * selected actor's projected routine, patrol paths — composed by
     * the root where people/ops both live, drawn under the markers.
     */
    peopleOverlay: ((h: {
        ctx: CanvasRenderingContext2D;
        sx: (lx: number) => number;
        sy: (ly: number) => number;
        s: number;
        ys: number;
    }) => void) | null;
    private warnedFallback;
    /** TRUE-RENDER GHOSTS: baked stamp canvases keyed by ghost identity. */
    private readonly ghostBakes;
    constructor(draft: EditorView, stage: EditorStage, state: EditorState, draftCanvas: HTMLCanvasElement, stageCanvas: HTMLCanvasElement);
    /** Horizontal px/tile; the one zoom number both views share. */
    get scale(): number;
    private get onStage();
    private clampScale;
    private activeCanvas;
    tileAt(clientX: number, clientY: number): {
        x: number;
        y: number;
    };
    tileAtFloat(clientX: number, clientY: number): {
        x: number;
        y: number;
    };
    panBy(dxPx: number, dyPx: number): void;
    centerOn(lx: number, ly: number): void;
    zoomAt(clientX: number, clientY: number, factor: number): void;
    fitZone(): void;
    /** A LOCAL tile's screen position inside the canvas-wrap (context bar). */
    localToScreen(lx: number, ly: number): {
        x: number;
        y: number;
    };
    /** The visible LOCAL-tile rect (minimap window, culling). */
    visibleLocalRect(): {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    markDirty(x0: number, y0: number, x1: number, y1: number): void;
    markAllDirty(): void;
    get ghost(): EditorView['ghost'];
    set ghost(g: EditorView['ghost']);
    get preview(): EditorView['preview'];
    set preview(p: EditorView['preview']);
    get strokeActive(): boolean;
    set strokeActive(v: boolean);
    toggleDraftView(): void;
    render(nowMs: number): void;
    /**
     * The editor's plane over the finished true frame. Ports the v1
     * decoration dialect onto the game projection: x scales by `s`,
     * y by `s·yScale`, rings become ellipses. Markers anchor at the
     * ground footprint (matching v1); elevated-tile markers ride the
     * unlifted ground position — the elevation lens proper lands in
     * Phase 5.
     */
    private drawOverlay;
    /**
     * THE LAW IS VISIBLE: each lens draws the derived truth the save
     * gate enforces — the fence line while you sculpt, the shelf the
     * draw order reads, the rooms the client will derive, the reach of
     * a spawned player, the border the wild grows toward, the claim of
     * every hearth, and the boards' words.
     */
    private drawLenses;
    /** The v1 marker dialect on the true projection. */
    private drawMarkers;
}
//# sourceMappingURL=viewport.d.ts.map