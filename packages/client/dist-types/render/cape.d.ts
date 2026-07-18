export interface CapeStyle {
    color: string;
    /** Hem band + clasp color — the cape's signature accent. */
    trim: string;
    /** Spine nodes below the anchor (more = longer, more sinuous). */
    segs: number;
    /** Tiles per spine segment. */
    segLen: number;
    /** Half-width at the shoulders / at the hem (tiles). */
    shoulderW: number;
    hemW: number;
    /** Gravity multiplier — fur hangs, silk floats. */
    weight: number;
    /** How eagerly the scene wind works the cloth. */
    windMul: number;
    /** High-frequency edge flutter amplitude. */
    flutter: number;
    /** Champion chevron stitched at the shoulders. */
    emblem?: boolean;
}
/** Unknown cape items still fly: defaults in the item's own color. */
export declare function capeStyle(itemId: string): CapeStyle;
interface CapeNode {
    x: number;
    y: number;
    z: number;
    px: number;
    py: number;
    pz: number;
}
export declare class CapeSim {
    private readonly style;
    readonly nodes: CapeNode[];
    /** Per-cape flutter phase — no two capes ripple in sync. */
    private readonly phase;
    private lastAx;
    private lastAy;
    private live;
    private isFront;
    /** Hem velocity (tiles/s) — drives the kick-light on the trim. */
    hemSpd: number;
    constructor(style: CapeStyle, seed: number);
    /**
     * Advance the cloth one frame. (ax, ay) is the wearer's world position
     * (lunge included), az the shoulder height in tile units, dir the
     * facing in radians. sizeK scales the whole garment (champions 1.25).
     */
    update(ax: number, ay: number, az: number, dir: number, dt: number, wind: {
        bx: number;
        by: number;
    }, tSec: number, sizeK: number): void;
    /** Where the cloth actually is, for depth-true front/behind sorting. */
    meanY(): number;
    /**
     * Depth-true paint side with HYSTERESIS: the cloth must be clearly
     * toward the camera to come in front, and clearly away to go back —
     * inside the band it keeps its last side. Side profiles hover near
     * zero, and without the band they flickered between paint orders
     * every frame.
     */
    front(eY: number): boolean;
}
/**
 * Paint the projected ribbon: base fill, hard-shade fold half, lit
 * shoulder mantle, trim hem, outline — the tunic's own dialect, in cloth.
 * `pts` are the nodes projected to screen by the caller; `wk` is the
 * width scale (camera scale × body size). `sideK` is how side-on the
 * facing is (0 front/back → 1 pure profile): the clasp is seen edge-on
 * in profile so the top narrows, while the hem swings toward the camera
 * and flares FULLER — the forced perspective that makes the cloth read
 * as turning in space with the character. `hemGlow` (0..1, from hem
 * speed) lets a fast-moving trim catch the light.
 */
export declare function drawCape(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, style: CapeStyle, wk: number, hurt: boolean, sideK?: number, hemGlow?: number): void;
export {};
//# sourceMappingURL=cape.d.ts.map