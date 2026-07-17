/**
 * Faceted terrain rendering. Tiles are authored on a grid but drawn as
 * unions of CHAMFERED cells: every material region gets crisp 45°-cut
 * coastlines — angular and deliberate, never pixel-grid, never soft
 * pills. Ground shading comes from low-frequency noise — big soft
 * meadows, no checkerboard.
 */
export type GroundSampler = (tx: number, ty: number) => number | undefined;
export type DetailSampler = (tx: number, ty: number) => number;
export declare function bakeChunk(ground: GroundSampler, detail: DetailSampler, cx: number, cy: number, px: number): HTMLCanvasElement;
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