import { type ExploredMask } from '@arx/shared';
/**
 * THE FOG — unexplored ground is blank parchment; the map literally
 * draws itself in as you walk (user decree: no terrain ghost). Region
 * bitmasks become small alpha canvases (one pixel per 4-tile cell)
 * that scale up with smoothing, so the charted frontier reads as a
 * soft organic edge, never a staircase of squares.
 */
/** Pure bit→alpha expansion (one byte of coverage per cell). */
export declare function maskBitsToAlpha(bytes: Uint8Array, out: Uint8ClampedArray): void;
/**
 * Region-mask canvas cache. Rebuilds a region's canvas only when the
 * chart version has moved past the cached bake.
 */
export declare class FogLayer {
    private readonly regions;
    /** Reusable cell-resolution composite — regions land here unsmoothed
     *  so the one scaled blit to screen has no interior edges to bleed. */
    private readonly compose;
    /** THE CROSSING: region canvases are (rx,ry)-keyed on one plane —
     *  a plane switch drops them whole. */
    clear(): void;
    regionCanvas(mask: ExploredMask, rx: number, ry: number, version: number): HTMLCanvasElement | null;
    /**
     * Paint the coverage mask for the visible span into `ctx` (white
     * where charted, clear where fog). Smoothing ON so the frontier
     * blooms softly at map scale.
     */
    draw(ctx: CanvasRenderingContext2D, mask: ExploredMask, version: number, tx0: number, ty0: number, tx1: number, ty1: number, sx: (tx: number) => number, sy: (ty: number) => number, scale: number): void;
}
/**
 * The uncharted vellum — warm base with seeded mottle blotches and a
 * few fiber flecks, tiled as a pattern. Painted once; deterministic
 * (no Math.random) so every open reads as the same sheet.
 */
export declare function parchmentCanvas(): HTMLCanvasElement;
//# sourceMappingURL=fog.d.ts.map