import { type WorldSel, type WorldState } from './worldState.js';
export interface PickHit {
    sel: WorldSel;
    /** Gesture affordance under the cursor, beyond plain selection. */
    handle?: 'radius' | 'corner' | 'segment';
    /** For 'corner': which one (0 nw, 1 ne, 2 se, 3 sw). */
    corner?: 0 | 1 | 2 | 3;
    /** For route segment hits: insert-after index. */
    segIdx?: number;
}
export declare class WorldView {
    private readonly canvas;
    private readonly ws;
    panX: number;
    panY: number;
    /** Pixels per world tile. */
    scale: number;
    /** Bumped when the draft changes terrain inputs — blocks rebake. */
    private terrainRev;
    private blocks;
    private bakeQueue;
    private zoneArt;
    private dangerRev;
    private dangerBlocks;
    constructor(canvas: HTMLCanvasElement, ws: WorldState);
    tileAtFloat(mx: number, my: number): {
        x: number;
        y: number;
    };
    tileAt(mx: number, my: number): {
        x: number;
        y: number;
    };
    private sx;
    private sy;
    zoomAt(mx: number, my: number, factor: number): void;
    centerOn(tx: number, ty: number, scale?: number): void;
    /** Frame the whole plan: every zone, route, and site, with air. */
    fitWorld(): void;
    /** The draft changed a terrain input (roads/landforms/aprons). */
    invalidateTerrain(): void;
    /** The draft changed the anchor list — danger wash only. */
    invalidateDanger(): void;
    /** A zone's tiles changed (save/adopt) — refetch its art. */
    invalidateZone(id: string): void;
    invalidateAllZones(): void;
    private blockKey;
    /** A cheap one-probe fill for blocks still in the bake queue. */
    private probeFill;
    /** Coarse block: the field classifier every 4th tile, render-honest. */
    private bakeCoarse;
    /** Fine block: the REAL generateChunk, one pixel per tile. */
    private bakeFine;
    /** One pixel per tile of a zone's authored ground (+elev shade). */
    private buildZoneArt;
    private requestZoneArt;
    /**
     * A zone's ground art as a data URL — the Open browser's thumbs
     * ride the same cache the map draws from.
     */
    thumbUrl(id: string): Promise<string | null>;
    private dangerBlock;
    render(): void;
    /** Faction id → the lens's ink. Unrostered ids get the road grey. */
    private static readonly FACTION_INK;
    /**
     * THE STANDING LENS (factions Phase 6): the living map learns
     * politics — every faction's marches drawn at the honest radius
     * (the SAME marchTiles factionForPlace reads at deed time), and
     * every fine counter marked at its live post (⚖ — the road back,
     * which is also where the Company's envoy sits). Road factions hold
     * no ground; their name is the space between the circles.
     */
    private drawStanding;
    /**
     * THE CLAIMED YARDS lens (Phase 6): every claim ring drawn honest —
     * the exclusion mask exactly as the spawn paths read it, never a
     * danger wash (rings calm nothing; they only refuse ground).
     */
    private drawClaimRings;
    /**
     * THE FAMILY LINES (Phase 6): every satellite and toll drawn tied to
     * its core — the source-and-kill-switch made visible. Hearth-tied
     * squats (origin `hearth:<id>`) key on no cell and draw no line.
     */
    private drawFamilyLines;
    private isSel;
    private isHover;
    private drawCells;
    private label;
    private drawPlanned;
    private drawZoneFrames;
    private drawRoutes;
    private drawRouteDraft;
    private drawSites;
    /** The authored-site pin — a lamp-post sigil, gold when live. */
    private pin;
    private drawAnchors;
    /** Screen-space hit test, most-specific first (the marker law). */
    pick(mx: number, my: number): PickHit | null;
}
//# sourceMappingURL=worldView.d.ts.map