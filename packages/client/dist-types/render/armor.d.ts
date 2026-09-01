import type { BodyStyle, HelmStyle, OffhandStyle } from './armorStyles.js';
export * from './armorStyles.js';
export { drawPauldron } from './armorPauldron.js';
/**
 * The torso local frame drawHumanoid establishes before calling in:
 * translated to the hip line, rotated by combat lean, scaled by the
 * fake-3D squash — every coordinate here foreshortens for free.
 */
export interface TorsoFrame {
    s: number;
    /** Shoulder / waist half-widths, hip→shoulder height (local units). */
    tw: number;
    ww: number;
    th: number;
    lead: number;
    profileK: number;
    backK: number;
    /**
     * THE TURNED GARMENT (the turned silhouette's fourth channel): the
     * SIGNED facing cosine. profileK says HOW side-on the body is; yaw
     * says WHICH way it turned. The painter slides its front-plane
     * content (chest marks, emblems, midline, lacing, tabard) toward
     * the leading edge and compresses it, shades the trailing side of
     * the quad as the turned-away plane, and lights the leading arris —
     * so a profile reads as a rotated VOLUME, not a symmetric card.
     */
    yaw: number;
    hurt: boolean;
    /** Foot-lift differential — the gait beat hems sway on. */
    strideSw: number;
    /** Wall-clock ms — hem flutter, ember pulses, living details. */
    nowMs: number;
    /** Gait blend 0..1 — billow and cloth drag scale with real speed. */
    runF: number;
    /**
     * Cloth drag in local x: the hem trails the direction of travel like
     * real cloth (screen travel, un-squashed by the caller). Signed.
     */
    dragX: number;
    /**
     * Seated blend 0..1 (the caller-smoothed sit channel). A seated robe
     * cannot hang its full length — the skirt pools on the ground.
     */
    sit?: number;
    /** Ground line under the body in torso-local units (seated drape). */
    groundY?: number;
    /** Solved knees in the torso local frame (seated knee tents). */
    seatKnees?: Array<{
        x: number;
        y: number;
    }>;
}
export declare function drawTorsoGarment(ctx: CanvasRenderingContext2D, st: BodyStyle, f: TorsoFrame): void;
/**
 * A pauldron as a real shoulder JOINT: painted in screen space on the
 * solved shoulder anchor, after its arm, so it caps the arm root and
 * rides swings instead of staying glued to the torso corners. `side`
 * is the outward direction sign; `squashK` is the body's facing squash.
 */
/** The head local frame (inside the torso squash) drawHelmet works in. */
export interface HeadFrame {
    s: number;
    headX: number;
    headY: number;
    hw: number;
    hh: number;
    cut: number;
    headR: number;
    fx: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    /** Wall-clock ms — hat-tip sway, living micro-motion. */
    nowMs: number;
}
export declare function drawHelmet(ctx: CanvasRenderingContext2D, st: HelmStyle, f: HeadFrame): void;
/**
 * Arm-carried offhand, strapped to the solved off forearm — drawn in
 * the same depth layer as the arm so the strap never breaks.
 */
export declare function drawOffhandOnArm(ctx: CanvasRenderingContext2D, st: OffhandStyle, arm: {
    ex: number;
    ey: number;
    kx: number;
    ky: number;
}, s: number, profileK: number, hurt: boolean, nowMs?: number): void;
/**
 * Back-mounted quiver (screen space, at the shoulder line). Depth is
 * the caller's: behind the torso when the player faces the camera, in
 * front when they face away — the cape's facing law. When a cape is
 * worn the quiver drops to the off hip so cloth and leather never fight.
 */
export declare function drawQuiver(ctx: CanvasRenderingContext2D, st: OffhandStyle, x: number, y: number, s: number, lead: number, hurt: boolean, nowMs?: number): void;
//# sourceMappingURL=armor.d.ts.map