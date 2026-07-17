/**
 * Faceted terrain rendering. Tiles are authored on a grid but drawn as
 * unions of CHAMFERED cells: every material region gets crisp 45°-cut
 * coastlines — angular and deliberate, never pixel-grid, never soft
 * pills. Ground shading comes from low-frequency noise — big soft
 * meadows, no checkerboard.
 */
export type GroundSampler = (tx: number, ty: number) => number | undefined;
export type DetailSampler = (tx: number, ty: number) => number;
export type ElevSampler = (tx: number, ty: number) => number;
export declare function bakeChunk(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number): HTMLCanvasElement;
/**
 * Bake the LIFTED terrain surface of one chunk at one elevation level:
 * every tile at `level` or higher (ramps excluded — they get bespoke
 * stair props) painted with the full material-skin pipeline, clipped to
 * a marching-squares contour so the plateau top has the same crisp
 * 45°-cut coastline as every other material — then finished with a
 * sunlit brink line along the rim. The renderer draws this canvas
 * shifted UP by level·ELEV_H and y-sorted, which is what makes the
 * plateau a solid mass you can walk behind.
 */
export interface ElevatedBake {
    canvas: HTMLCanvasElement;
    /** Chunk rows (local ly) containing any lifted content at this level. */
    rows: boolean[];
}
export declare function bakeElevated(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, level: number): ElevatedBake | null;
/**
 * The breeze layer: swaying grass blades, drifting water glints, pulsing
 * ripples and portal swirls. Drawn every frame over the baked ground —
 * this is what makes the meadow feel alive.
 */
export declare function drawLiveGround(ctx: CanvasRenderingContext2D, ground: GroundSampler, detail: DetailSampler, bounds: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}, worldToScreen: (wx: number, wy: number) => {
    x: number;
    y: number;
}, s: number, timeMs: number): void;
//# sourceMappingURL=terrain.d.ts.map