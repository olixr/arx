import { PoseState } from '@devcraft/shared';
import { LegRig, type LegPose, type LegRigConfig } from './legs.js';
export type { LegPose } from './legs.js';
export declare class LegSolver extends LegRig {
    constructor();
}
/**
 * Knee pole constraint. While running, BOTH knees must bow toward the
 * travel direction (a knee bent against the run reads as a broken,
 * inverted leg). At rest the natural screen rule applies — up-ish, else
 * outward — where mismatched knees are fine. The speed blend prevents
 * popping at gait transitions, and per-leg hysteresis (`memory`) keeps a
 * borderline choice from flickering mid-stride.
 *
 * `cx, cy` is one unit perpendicular of the hip→foot line (screen);
 * returns +1 to use it, -1 to use its negation.
 */
export declare function chooseKneeSign(cx: number, cy: number, poleX: number, poleY: number, poleStrength: number, sideSgn: number, memory: number): number;
export interface RigPose {
    /** Screen position of the body's ground point. */
    x: number;
    y: number;
    scale: number;
    dir: number;
    pose: PoseState;
    poseT: number;
    /** 0..1 bow-draw charge (own: live input; remotes: time in Draw pose). */
    drawT: number;
    /** Wall-clock ms for micro-motion (full-draw tremble, string buzz). */
    nowMs: number;
    /** Solved feet in screen space (already projected by the caller). */
    feet: Array<{
        x: number;
        y: number;
        lift: number;
    }>;
    /** Gait bob + hip rise from the solver (tile units). */
    bob: number;
    rise: number;
    /** Fake-3D squash factor from the solver. */
    wScale: number;
    /** Knee pole constraint from the solver. */
    poleX: number;
    poleY: number;
    poleStrength: number;
    /** Per-leg knee-sign hysteresis, owned by the caller's anim state. */
    kneeMemory: [number, number];
    bodyColor: string;
    hurt: boolean;
    isOwn: boolean;
    weaponItem?: string;
    bodyItem?: string;
    /** Overall size multiplier (goblins ~0.8, champions ~1.2). */
    size?: number;
    skinColor?: string;
    /** Time-based swing driver for the gather pose. */
    gatherPhase: number;
    /**
     * Which station a Craft pose is working: picks the choreography
     * (hammer-and-tongs, furnace stoking, fire tending, bench work) and
     * the bespoke props that go with it.
     */
    craftKind?: 'anvil' | 'furnace' | 'fire' | 'workbench' | null;
}
/** Duration of one mining swing (windup→heave→strike→pry), ms. */
export declare const MINE_CYCLE_MS = 880;
/** Duration of one woodcutting chop, ms. */
export declare const CHOP_CYCLE_MS = 700;
/** Duration of one anvil hammer blow, ms. */
export declare const ANVIL_CYCLE_MS = 640;
/** Duration of one furnace stoking push, ms. */
export declare const FURNACE_CYCLE_MS = 1700;
/**
 * One two-segment arm: shoulder → elbow (sleeve) → forearm (skin) →
 * hand, solved by the same two-bone IK as the legs. The preference
 * vector decides which way the elbow bends — down-and-out at rest,
 * back-and-up for a drawn bowstring.
 */
/**
 * Pure two-bone arm solve: clamps the hand into reach and places the
 * elbow on whichever side of the shoulder→hand line the preference
 * vector points. Exported for simulation tests.
 */
export declare function solveArm(sx: number, sy: number, hx: number, hy: number, L: number, prefX: number, prefY: number): {
    ex: number;
    ey: number;
    kx: number;
    ky: number;
};
export declare function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void;
/** Darken/lighten a hex color by a flat amount — flat-art shading. */
export declare function shade(hex: string, amount: number): string;
/**
 * Beast bodies: every non-humanoid NPC walks on the same universal
 * LegRig as the player — planted feet, committed steps, two-segment
 * IK. Each species is a spec: where its legs live under the body,
 * how its joints bend, and what its feet look like.
 *
 * Joint law: front legs bow FORWARD at the knee, hind legs bow
 * BACKWARD at the hock — the classic quadruped silhouette. Birds bow
 * BACKWARD (the visible joint on a bird leg is the ankle). The
 * preference is anatomical and constant; it never flips with travel.
 */
export interface BeastSpec {
    rig: LegRigConfig;
    /** Half-length of the body mass along the facing (tiles). */
    bodyLen: number;
    /** Body-mass center height above ground (tiles). */
    bodyRise: number;
    /** Per-leg joint bow along the facing: +1 forward, -1 backward. */
    kneeFwd: number[];
    /** Where legs attach, as fractions of the leg spec offsets. */
    hipFwd: number;
    hipSide: number;
    /** Upper-leg thickness (tiles). */
    legW: number;
    foot: 'hoof' | 'paw' | 'claw';
    /** Bare shanks (chicken) instead of body-shaded legs. */
    legColor?: string;
}
/**
 * Spec for a beast id — named species get their tuned rig; anything
 * new walks on a generic quadruped scaled from its collision radius,
 * so future creatures have working legs before they have a look.
 */
export declare function beastSpec(defId: string, radius: number, speed: number): BeastSpec;
export declare function drawBeast(ctx: CanvasRenderingContext2D, opts: {
    /** Screen position of the body's ground point. */
    x: number;
    y: number;
    scale: number;
    /** Slewed facing from the rig pose — body and legs agree. */
    dir: number;
    radius: number;
    color: string;
    defId: string;
    spec: BeastSpec;
    pose: LegPose;
    /** Feet already projected to screen (terrain lift applied). */
    feet: Array<{
        x: number;
        y: number;
        lift: number;
    }>;
    /** Camera y foreshorten for body-frame offsets. */
    yScale: number;
    walkPhase: number;
    hurt: boolean;
    /** 0..1 through an attack: crouch back, then pounce. */
    attackT?: number;
}): void;
//# sourceMappingURL=rig.d.ts.map