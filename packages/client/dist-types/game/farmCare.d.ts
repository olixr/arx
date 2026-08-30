import { Tile } from '@arx/shared';
import { type Grade } from '@arx/content';
/**
 * THE ONE CARE MIRROR, client side (farming v2 Phase 1).
 *
 * Server truth arrives on S2CFarm (whole at login, deltas on change)
 * and lands in these module maps; the terrain bake, the renderer's
 * live passes, the interact prompts, and the compost panel all read
 * one store. Module-level on purpose — the bake path reads it without
 * threading a sampler through every call chain, exactly the
 * GrassSystem precedent.
 */
export interface PlotCare {
    /** Watered bitmask (bit per stage + the prune bit), the row's own. */
    w: number;
    /** Soil tier 0 plain / 1 enriched / 2 rich. */
    soil: number;
    /** 1 when mulched. */
    m: number;
    /** 1 when grown under a growing frame (Phase 2). */
    f: number;
    /**
     * Derived: is the CURRENT stage watered? Kept resolved here (from
     * tile + mask) so the bake never does stage math per tile.
     */
    wet: boolean;
}
export interface BinCare {
    fill: number;
    graded: number;
    /** Epoch ms the working batch completes; 0 = gathering scraps. */
    readyAt: number;
}
export declare const farmPlots: Map<string, PlotCare>;
export declare const farmBins: Map<string, BinCare>;
/** THE ANIMALS OF THE YARD: trough feed by "tx,ty". */
export declare const farmTroughs: Map<string, {
    feed: number;
}>;
/** THE WORKING YARD: running station batches by "tx,ty". */
export declare const farmJobs: Map<string, {
    recipe: string;
    qty: number;
    startedAt: number;
    grade: number;
}>;
/** The hives' clocks by "tx,ty". */
export declare const farmApiaries: Map<string, {
    since: number;
}>;
/** THE LARDER BOARD: filled counts by shop id (orders derive). */
export declare const larderFills: Map<string, {
    epoch: number;
    filled: number;
}>;
export declare function farmKey(tx: number, ty: number): string;
/**
 * THE CROSSING: every yard mirror is tile-keyed on the CURRENT plane —
 * a plane switch must drop them whole or another world's coordinates
 * would wear this one's care. (The larder board is shop-id-keyed and
 * survives; the server re-mirrors farm state as its chunks restream.)
 */
export declare function clearFarmMirror(): void;
/** A crop tile's stage, or null for anything that is not a crop. */
export declare function stageOfTile(tile: Tile | undefined): 0 | 1 | 2 | null;
/** Re-derive `wet` after the mask or the tile changes. */
export declare function refreshWet(tx: number, ty: number, tile: Tile | undefined): void;
/**
 * Standing wells, tracked from chunk streams and tile patches so the
 * terrain bake (which sees only EFFECTIVE ground — stations remap to
 * their floor) can still answer "is a well near". Wells are rare, so
 * membership walks the set instead of scanning ground.
 */
export declare const wellTiles: Set<string>;
export declare function noteWellTile(tx: number, ty: number, prev: number | undefined, next: number): void;
/** Is a well within range (chebyshev) of this tile? */
export declare function wellNearClient(tx: number, ty: number, range: number): boolean;
/**
 * The grade this plot would earn if harvested now — the client's own
 * run of THE CARE FOLD (the shared pure function; same facts in, same
 * grade out as the server will decide). Drives the ripe sparkle and
 * nothing else; the server's fold at harvest is the truth.
 */
export declare function predictedGrade(tile: Tile | undefined, tx: number, ty: number): Grade;
//# sourceMappingURL=farmCare.d.ts.map