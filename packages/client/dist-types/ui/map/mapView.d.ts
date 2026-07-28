import { type DiscoveryWire } from '@arx/shared';
import type { ClientGame } from '../../game/clientGame.js';
export type MapBand = 'surface' | 'dungeon';
export interface MapPick {
    kind: 'discovery' | 'waypoint';
    d?: DiscoveryWire;
}
export declare class MapView {
    private readonly canvas;
    private readonly game;
    panX: number;
    panY: number;
    /** Pixels per world tile. */
    scale: number;
    showDanger: boolean;
    hover: DiscoveryWire | null;
    private blocks;
    private dangerBlocks;
    private dangerRev;
    private lastAnchors;
    private lastWorldVersion;
    private readonly fog;
    private readonly dungeonFog;
    private layer;
    private fogCnv;
    constructor(canvas: HTMLCanvasElement, game: ClientGame);
    tileAtFloat(mx: number, my: number): {
        x: number;
        y: number;
    };
    private sx;
    private sy;
    zoomAt(mx: number, my: number, factor: number): void;
    centerOn(tx: number, ty: number, scale?: number): void;
    /** The band the reader is charting right now. */
    band(): MapBand;
    /** Live chunks moved — drop the fine blocks near the player (the
     * only place streamed data ever changes). */
    private refreshLiveBlocks;
    private probeFill;
    private bakeCoarse;
    /**
     * Fine block: one pixel per tile. LIVE chunks are the session's
     * truth and always win; worldgen fills the rest (never in the
     * instance band — a dungeon the stream hasn't shown stays rock).
     */
    private bakeFine;
    private dangerBlock;
    render(nowMs: number): void;
    pick(mx: number, my: number): MapPick | null;
}
//# sourceMappingURL=mapView.d.ts.map