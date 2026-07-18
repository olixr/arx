/**
 * The universal leg rig: procedural two-segment IK legs for ANY body.
 *
 * One solver walks everything — players, goblins, cows, chickens, rats,
 * and whatever grows legs next. A rig is configured, never subclassed:
 * how many legs, where they rest under the body, which legs swing
 * together, how long the bones are. The gait laws below are the ones
 * that made the humanoid walk feel right, generalized so every creature
 * in the world obeys the same physics of stepping.
 *
 * Design laws (proven on the biped, now universal):
 * - FEET LIVE IN WORLD SPACE. A planted foot does not move. The body
 *   drifts over it; when a foot's home drifts too far away, that foot
 *   commits to a STEP — an animated re-plant. Walking is a side effect
 *   of planted feet, never a looping animation.
 * - CADENCE FROM FIRST PRINCIPLES. stride = f(leg reach) and
 *   swing = stride / (2 · speed): step rate scales exactly with how
 *   fast the body moves. No walk-cycle timer anywhere.
 * - ANTICIPATION. A step lands where the home will be WHEN THE SWING
 *   ENDS (home + velocity · swing). Aiming at where home is now lands
 *   behind a moving body — the dangling-feet bug.
 * - GAIT GROUPS. Legs in the same group may swing together; legs in
 *   different groups may not overlap in the air. A biped alternates
 *   (two groups of one); a quadruped trots (two diagonal pairs). A
 *   groupmate of a swinging leg gets an eager threshold so pairs
 *   actually sync instead of decaying into a crawl.
 * - EMERGENCIES BREAK RULES. A foot past its reach snaps forward NOW,
 *   whatever the group state — legs never noodle-stretch. A teleport
 *   snaps the feet under the body — never a leg across the map.
 * - TWO FRAMES OF REFERENCE. Billboard rigs (humanoids) keep their
 *   hips fixed on the screen X axis and stagger their idle stance with
 *   the facing. Oriented rigs (beasts) carry their homes in the body
 *   frame — they rotate with the facing, so turning in place re-plants
 *   the feet through the normal step logic: a real shuffle for free.
 */
export interface LegSpec {
    /** Rest home in the body frame: forward along the facing (tiles). */
    fwd: number;
    /** Rest home lateral offset: - is the left side (tiles). */
    side: number;
    /** Gait group — legs in the same group swing together. */
    group: number;
}
export interface LegRigConfig {
    legs: LegSpec[];
    /** Total leg length, both segments (tiles). */
    legLen: number;
    /** Hip height above the ground at rest (tiles); < legLen. */
    rise: number;
    /** Peak foot lift mid-swing (tiles). */
    liftAmp: number;
    /** Full-tilt reference speed (tiles/sec) — scales crouch and lift. */
    runSpeed: number;
    /** Legs may straighten slightly past 2L when bounding (default 1.15). */
    stretch?: number;
    /**
     * Billboard rigs face the camera: homes sit on the world X axis with
     * an idle facing stagger, and the rig reports the fake-3D squash.
     * Oriented rigs rotate their homes with the facing.
     */
    billboard?: boolean;
    /** stride = reach · strideScale (default 1.65). */
    strideScale?: number;
    /** Speed above which the rig counts as moving (default 0.35). */
    moveThreshold?: number;
    /**
     * Max facing slew (rad/s) for oriented rigs — bodies can't rotate
     * instantly, and the slewed homes turn a pivot into a sequenced
     * shuffle instead of a four-leg hop. The pose reports the slewed
     * `dir`; draw the body with it so body and legs always agree.
     * Default: unlimited (billboard rigs face the camera regardless).
     */
    turnRate?: number;
}
export interface LegPose {
    /** World-space feet + lift (tiles), one per configured leg. */
    feet: Array<{
        x: number;
        y: number;
        lift: number;
    }>;
    /** The slewed facing the homes used — draw the body with THIS. */
    dir: number;
    /** Sum of lifts — the body rides this bob. */
    bob: number;
    /** Current hip height above the ground point (tiles). */
    rise: number;
    /** Fake-3D squash (billboard rigs; 1 for oriented rigs). */
    wScale: number;
    /** Knee pole vector: unit travel direction (world axes). */
    poleX: number;
    poleY: number;
    /** 0 idle → 1 running: how strongly the pole constrains the knees. */
    poleStrength: number;
}
export declare class LegRig {
    private readonly cfg;
    private readonly stretch;
    private readonly strideScale;
    private readonly moveThreshold;
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
    constructor(cfg: LegRigConfig);
    update(bx: number, by: number, dirRaw: number, rawDt: number): LegPose;
}
/**
 * Pure two-bone limb solve, the one IK in the game: clamps the target
 * into reach and places the joint on whichever side of the root→target
 * line the preference vector points. Legs, arms, whatever bends.
 */
export declare function solveLimb(sx: number, sy: number, hx: number, hy: number, L: number, stretch: number, prefX: number, prefY: number): {
    ex: number;
    ey: number;
    kx: number;
    ky: number;
};
//# sourceMappingURL=legs.d.ts.map