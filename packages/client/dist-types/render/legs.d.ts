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
 * - THE STRIDE WHEEL. Stride length GROWS with speed and swing time is
 *   near-constant — the two invariants of real gait. A slow amble takes
 *   short lazy steps; a sprint covers ground with long bounding strides
 *   at only a modestly faster cadence. Deriving swing from
 *   stride/(2·speed) alone is what minced the run into a 15 Hz jitter.
 * - DUTY FACTOR DEFINES THE GAIT. Walking means a foot is always
 *   planted (duty ≥ 0.5). Running means it isn't: flight rigs may put
 *   EVERY foot in the air for a beat mid-stride (duty < 0.5) — the
 *   aerial phase is what makes a long stride geometrically possible.
 *   Grounded rigs instead cap swing time to stance time so a strict
 *   gait gate never strands a stretched partner.
 * - STRIDES FOLLOW TRAVEL, KNEES FOLLOW FACING. Feet stride along the
 *   velocity, but joint-bend preferences are anatomical — anchored to
 *   the body's facing, never to travel (industry rigs parent the knee
 *   pole to the pelvis). Backpedaling and strafing shorten the stride
 *   instead of flipping the knees.
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
    /** Full-speed planted sweep = reach · strideScale (default 1.65). */
    strideScale?: number;
    /** Speed above which the rig counts as moving (default 0.35). */
    moveThreshold?: number;
    /**
     * Flight rigs may go fully airborne at speed: near full tilt a leg is
     * allowed to launch while its counterpart is still descending, so the
     * duty factor drops below 0.5 and the gait becomes a genuine run with
     * an aerial phase. Grounded rigs (default) instead cap swing time to
     * stance time and never leave the ground.
     */
    flight?: boolean;
    /** Full-run swing duration in seconds (default 0.4 · √legLen). */
    swingRef?: number;
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
    /** Unit travel direction (world axes) — drives arm swing, NOT knees. */
    poleX: number;
    poleY: number;
    /** 0 idle → 1 moving: movement strength for secondary motion. */
    poleStrength: number;
    /** 0 walk mechanics → 1 sprint mechanics (the gait blend). */
    runF: number;
    /** cos(angle between travel and facing): 1 forward, -1 backpedal. */
    align: number;
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
    /** Touchdowns since birth — diff across updates to hear footsteps. */
    plants: number;
    /** Body speed (tiles/sec) at the most recent touchdown. */
    plantSpeed: number;
    /** World position of the foot that just landed (dust spawns here). */
    plantX: number;
    plantY: number;
    /** Body velocity at the touchdown — dust kicks back along this. */
    plantVx: number;
    plantVy: number;
    /** Signed idle-turn accumulator; a big enough pivot owes a shuffle. */
    private lastDir;
    private turnDebt;
    private turnPending;
    /** Seconds since each foot's last touchdown — the rhythm reference. */
    private readonly sinceLand;
    /** Distinct gait groups: touchdowns aim to spread cycle/groups apart. */
    private readonly groupCount;
    constructor(cfg: LegRigConfig);
    update(bx: number, by: number, dirRaw: number, rawDt: number): LegPose;
}
/**
 * Which side of the root→target chord a joint bends toward, with
 * hysteresis. `cx, cy` is one unit perpendicular of the chord; the
 * preference vector is the anatomical pole (normalized internally).
 * A borderline score never overturns the standing choice — this is
 * what stops a knee snapping 180° when a turning body carries the
 * pole past perpendicular to a planted leg's chord. Returns ±1.
 */
export declare function chooseLimbSign(cx: number, cy: number, prefX: number, prefY: number, memory: number): number;
/** solveLimb's result shape — also usable as a caller-owned scratch. */
export interface LimbSolve {
    ex: number;
    ey: number;
    kx: number;
    ky: number;
}
/**
 * Allocation-free two-bone solve: writes into `out` and returns it.
 * Per-frame paint paths (every limb of every visible body solves every
 * frame) call this with a long-lived scratch; anything that needs to
 * HOLD two solves at once uses solveLimb, which allocates.
 */
export declare function solveLimbInto(out: LimbSolve, sx: number, sy: number, hx: number, hy: number, L: number, stretch: number, prefX: number, prefY: number): LimbSolve;
/**
 * Pure two-bone limb solve, the one IK in the game: clamps the target
 * into reach and places the joint on whichever side of the root→target
 * line the preference vector points. Legs, arms, whatever bends.
 */
export declare function solveLimb(sx: number, sy: number, hx: number, hy: number, L: number, stretch: number, prefX: number, prefY: number): LimbSolve;
//# sourceMappingURL=legs.d.ts.map