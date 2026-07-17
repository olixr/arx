import { PoseState } from '@devcraft/shared';
export interface LegPose {
    /** World-space feet + lift (tiles). */
    feet: Array<{
        x: number;
        y: number;
        lift: number;
    }>;
    /** Sum of lifts — the body rides this bob. */
    bob: number;
    /** Current hip height above the ground point (tiles). */
    rise: number;
    /**
     * Fake-3D squash: <1 when facing/travelling sideways (narrow side
     * profile), >1 facing up/down (full front profile). Height compensates
     * inversely so the turn reads as orientation, not shrinking.
     */
    wScale: number;
    /** Knee pole vector: unit travel direction (world axes). */
    poleX: number;
    poleY: number;
    /** 0 idle → 1 running: how strongly the pole constrains the knees. */
    poleStrength: number;
}
/**
 * The herotown gait, the version that finally nailed it (their notes,
 * kept true here):
 *
 * - Characters are BILLBOARDS. Hips are FIXED on the screen X axis
 *   (left hip, right hip, always); feet stride along the movement
 *   direction from those fixed hips. Rotating the hip line with
 *   velocity throws the legs sideways — never do it.
 * - Cadence from first principles: stride = f(leg reach), and
 *   swing = stride / (2 · speed), so step rate scales EXACTLY with
 *   how fast the body moves. No walk-cycle timer.
 * - Anticipation: a step lands where the hip will be WHEN THE SWING
 *   ENDS (home + velocity · swing). Aiming at where home is now
 *   guarantees landing behind a moving body — the dangling-feet bug.
 * - Strictly one foot in the air; the planted foot carries the body.
 *   Exception: a foot past reach snaps forward NOW — never noodles.
 */
export declare class LegSolver {
    private feet;
    private step;
    private lastX;
    private lastY;
    private vx;
    private vy;
    private rise;
    private wScale;
    /** Signed idle-turn accumulator; a big enough pivot owes a shuffle. */
    private lastDir;
    private turnDebt;
    private turnPending;
    update(bx: number, by: number, dir: number, rawDt: number): LegPose;
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
 * Beast rig for four-legged / critter NPCs. Goblins and skeletons use
 * the humanoid rig with size + skin overrides instead.
 */
export declare function drawBeast(ctx: CanvasRenderingContext2D, opts: {
    x: number;
    y: number;
    scale: number;
    dir: number;
    radius: number;
    color: string;
    defId: string;
    walkPhase: number;
    moving: boolean;
    hurt: boolean;
    /** 0..1 through an attack: crouch back, then pounce. */
    attackT?: number;
}): void;
//# sourceMappingURL=rig.d.ts.map