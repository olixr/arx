/**
 * Wield — the one carry vocabulary.
 *
 * carriage.ts owns how a FIST holds a BLADE (the user-tuned grip
 * verdicts live there and never move). This module owns everything
 * around that: how the whole body CARRIES a held thing through the
 * gait ladder — idle → walk → run are three stances, not two — how
 * the arms pump honestly along the direction of travel at every
 * facing, how a staff is carried and FOUGHT with, and how a bow is
 * held by the wood at every gait. Pure functions, no ctx, no rig
 * state: both hands and the tests share one law source (the
 * carriage.ts pattern, grown to every class).
 *
 * Frame conventions match carriage.ts: screen radians with +y DOWN,
 * angles point fist→tip (π/2 straight down, −π/2 straight up),
 * offsets in units of the rig scale `s` with x pre-squash.
 */
/**
 * THE GROUND LAW's foreshortening factor (the shield plane's own
 * GROUND_K): one unit of world-forward travel shows as ~0.52 units of
 * screen-vertical. Everything in this file that turns world direction
 * into screen direction runs through it, so a north-south carry reads
 * with the same honesty as an east-west one — smaller on screen
 * because it is foreshortened, never because it was suppressed.
 */
export declare const WIELD_GROUND_K = 0.52;
/**
 * THE GAIT LADDER: idle → walk → run as one continuous clock.
 * `moveK` = is the body travelling at all (min(1, poleStrength));
 * `runK` = how much of that travel is a sprint (the legs' runF).
 * A slow walk is NOT a slow sprint: it gets its own stance — a
 * fraction of the run delta, so every carry lifts a little the
 * moment the feet move and only fully levels at speed. Continuous
 * in both inputs by construction, so no stance ever pops.
 */
export declare function gaitK(moveK: number, runK: number): number;
/** The ladder's eased lift — `gaitK` through the shared smoothstep.
 * bladeCarriage smooths its own runK input, so callers feeding it the
 * raw `gaitK` get exactly this curve — one ladder, two entry points. */
export declare function gaitLift(moveK: number, runK: number): number;
export interface CarryProjection {
    /** Screen angle, fist→tip. */
    angle: number;
    /** Length multiplier for the painter — 1 in the screen plane. */
    fore: number;
}
/**
 * Project a held rod: `pitch` is the tilt off straight-down, positive
 * toward the `yaw` heading, negative trailing away from it. The angle
 * is the honest projection; the length is softened by the depth law.
 */
export declare function projectCarry(yaw: number, pitch: number): CarryProjection;
/**
 * The strike-plane projection: a cut sweeps the GROUND plane around
 * the body, so a blade mid-sweep foreshortens as it points into (or
 * out of) the screen. Softened against the pure ground factor — the
 * held extension of a killing blow keeps enough length to read as a
 * blow — with the same law shape: full length across the screen,
 * honestly shorter along the depth axis.
 */
export declare function projectStrike(yaw: number): CarryProjection;
export interface PumpFrame {
    /** Main-hand offset, units of s (off hand mirrors both channels). */
    dx: number;
    dy: number;
    /** Shared lateral torso counter-sway, units of s (NOT mirrored). */
    sway: number;
}
/**
 * THE HONEST PUMP: arms swing along the direction of TRAVEL,
 * foreshortened by the ground law — never along a raw screen axis.
 * East-west that is the familiar fore/aft swing; north-south the
 * hands genuinely reach toward and away from the camera, smaller on
 * screen because the world says so. One law replaces the old pair of
 * symptom patches (the front-on pump clamp that froze N/S arms
 * near-dead, and a bolt-on lateral sway).
 *
 * `sw` is the smoothed swing drive (±1), `amp` the caller's gait
 * amplitude, (`px`,`py`) the unit travel direction. `armedK` 0..1 =
 * how loaded the hand is (a weapon restrains the vertical throw; a
 * bare fist swings free). The per-footfall bounce is a separate
 * channel the rig owns: it rides |sw|, not sw, and mixing it in here
 * would let the shared bob cancel the alternating throw.
 */
export declare function armPump(px: number, py: number, sw: number, amp: number, armedK: number): PumpFrame;
/**
 * THE RUNNER'S ELBOW: a free hand does not dangle at a sprint — the
 * elbow bends and the fist rises toward the ribs, pumping in unison
 * with the legs (any running reference: hands carried at waist
 * height, driving fore and aft). Returned as the lift OFF the relaxed
 * hang, units of s, for the caller to subtract from the hang height.
 * Armed hands keep their own carriage heights — a carry law is a
 * verdict — so this applies to EMPTY fists only.
 */
export declare function runnerLift(moveK: number, runK: number): number;
export interface StaffWield {
    /** Main-hand offset from (x, armY), units of s (dx pre-squash). */
    dx: number;
    dy: number;
    /** Staff angle, fist→crown, screen radians (projected). */
    angle: number;
    /** Foreshortened length for the painter. */
    fore: number;
    /** Fraction of the shaft trailing behind the fist (painter grip). */
    grip: number;
    /** How much the planted hand sits out the arm pump (0 planted…1 free). */
    pumpK: number;
}
/**
 * THE STAFF LADDER, second edition — one hand on the move.
 *
 * Idle: planted upright beside the body, the true walking stick, off
 * hand free. Walk: still the planted stick, ROCKING with the stride
 * in the travel plane (the rock is a pitch in the world now, so it
 * projects honestly at every facing). Run: the staff LEVELS into a
 * one-hand trail carry at the balance point — nobody sprints leaning
 * on a stick, and nobody crosses their body to two-hand a pole at a
 * dead run either (the user's verdict on edition one): the off hand
 * is FREE and pumps with the legs. Both hands meet on the wood only
 * where two hands belong — the quarterstaff guard and its strikes.
 *
 * The run carry rides the projection law: sprinting north the staff
 * points up-screen and draws SHORT — the length change is the depth.
 */
export declare function staffWield(dir: number, sideS: number, moveK: number, runK: number, sw: number, px: number): StaffWield;
/**
 * THE QUARTERSTAFF GUARD — combat's two hands. Out of rest the staff
 * is gripped low (grip 0.34, business end forward) and the off hand
 * belongs ON the wood ahead of the main fist: the classic ready. The
 * claim is full in the guard and yields to everything with a better
 * right to the hand (the cast punch, a shield, the seat, the sheathe
 * — the rig orders those). The RUN never claims it any more.
 */
export declare const STAFF_GUARD_CHOKE_S = 0.2;
export interface StaffStrikeFrame {
    /** Arm-angle offset from the aim (radians); rests at 0.5 like blades. */
    arm: number;
    /** Staff angle relative to the arm ray — ±π/2 is the tangent hold. */
    spin: number;
    /** Reach multiplier (1 at both ends). */
    reach: number;
    /** Vertical hand offset, units of s (negative = raised). */
    lift: number;
    /** Torso lean along the sweep. */
    lean: number;
    /** Shaft fraction behind the fist — sweeps pivot at the middle. */
    grip: number;
}
export declare function staffStrikeFrame(stage: 0 | 1, t: number): StaffStrikeFrame;
export interface StaffTrail {
    from: number;
    to: number;
    alpha: number;
    lift: number;
}
/** The sweep's crescent, alive from the loosing through the extension. */
export declare function staffStrikeTrail(stage: 0 | 1, t: number): StaffTrail | null;
/**
 * THE BOW IS HELD BY THE WOOD. The rest carriage: string toward the
 * body, wooden belly curving down-forward, half-ready — one motion
 * from the aim (the user-approved verdict, unchanged; the angle blend
 * keeps the BOW MIRROR law, which a raw projection would break by
 * rotating instead of reflecting). The gait firms the carry a hair
 * toward ready, and the projection law contributes the LENGTH: on a
 * north-south run the limbs compress toward the camera line, half
 * the depth read of the blades, because a bow is a plane, not a rod.
 */
export declare function bowWield(dir: number, sideW: number, moveK: number, runK: number): {
    dx: number;
    dy: number;
    angle: number;
    fore: number;
};
//# sourceMappingURL=wield.d.ts.map