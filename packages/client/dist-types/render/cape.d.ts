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
    /**
     * Paint side is a FACING law, not a cloth-position law — the same
     * convention as the beast head/tail and the weapon-behind rule. The
     * cloth hangs on the back, and the back is toward the camera exactly
     * when the facing points up-screen. Cloth position near the side
     * boundary is pure noise (that's what caused the paint flicker);
     * facing is definitive. Hysteresis band so the flip never dithers,
     * placed just above horizontal where the cape is slim and tucked —
     * the swap is invisible there.
     */
    front(fy: number): boolean;
}
/**
 * Paint the projected ribbon: base fill, hard-shade fold half, lit
 * shoulder mantle, trim hem, outline — the tunic's own dialect, in cloth.
 * `pts` are the nodes projected to screen by the caller; `wk` is the
 * width scale (camera scale × body size).
 *
 * `breadthK` is THE FORESHORTENING LAW — the projected length of the
 * shoulder bar the cloth hangs from (1 facing up/down, ~0.45 in pure
 * profile, continuous through all 360°). The clasp is welded to the
 * body plane so it foreshortens fully; free cloth twists back toward
 * the camera down its length, so each rung recovers breadth toward the
 * hem. This is what makes the cape read as a surface turning in 3D
 * space with the character instead of a full-width banner pasted on
 * from every angle. `hemGlow` (0..1, from hem speed) lets a
 * fast-moving trim catch the light.
 */
export declare function drawCape(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, style: CapeStyle, wk: number, hurt: boolean, breadthK?: number, hemGlow?: number): void;
export {};
//# sourceMappingURL=cape.d.ts.map