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
 *
 * `profileK` is the facing weight (|cos dir|): the full lift belongs
 * to the profile silhouette, where the bent pumping arm is the whole
 * read. Front- and back-on the hang is already at hip-line width and
 * the same lift jammed both fists up into the armpits — and shrank
 * the shoulder→hand chord until the elbow bend had nowhere honest to
 * go. Half the lift at the camera-line facings, full in profile,
 * linear so the height breathes through every diagonal.
 */
export declare function runnerLift(moveK: number, runK: number, profileK: number): number;
/**
 * THE TRAILING-ELBOW POLE: the screen-X of a settled arm's anatomical
 * pole (pole Y is always 1 — gravity). At rest the elbow flares to its
 * own side of the body (`side` = ±1-ish, the arm's outboard sign); on
 * the move it trails BACK along the travel — a runner's elbows trail,
 * they never lead. `trailB` is the gait's claim on that trade.
 *
 * THE POLE NEVER VANISHES: "elbows trail the travel" is a WORLD truth,
 * but this pole lives in screen X — and a north/south run has no
 * screen-lateral travel at all (`poleX` ≈ 0). Letting the trail claim
 * the whole pole anyway collapsed the preference to straight-down,
 * parallel to the near-vertical shoulder→hand chord of a frontal run,
 * and the elbow side fell to numerical noise: the shared gait sway
 * carried both fists across their shoulder lines twice a stride and
 * BOTH elbows inverted in unison (the user's N/S broken-elbow
 * screenshots). The trail may only claim as much of the flare as it
 * can actually show on screen (|poleX|); the rest stays anatomical.
 * At a profile run |poleX| ≈ 1 and the trail owns the pole outright —
 * the chicken-wing fix this law grew out of is preserved exactly.
 *
 * THE FLARE OUTVOTES THE NOISE: the pole is a pure SIDE VOTE — the
 * solve places the elbow by the vote's sign, never its shape — so the
 * flare weight costs nothing visually and buys decisiveness. At 0.45
 * a camera-line rest chord scored ≈0.41 against the 0.35 hysteresis
 * threshold: one breath of pump noise dipped it borderline, and an
 * elbow committed inboard by a strike or a facing wiggle could sit
 * wrong for whole seconds before the pole reclaimed it. At 0.7 the
 * settled vote is committed every frame and a wrong side heals in one.
 */
export declare function settleElbowPole(side: number, poleX: number, trailB: number): number;
/** Caller-owned smoothed rest-side state (lives on the rig's depth memory). */
export interface RestSideMemory {
    side?: number;
    prevSide?: number;
    sideFlipMs?: number;
    sideWantMs?: number;
}
/**
 * THE SMOOTHED REST SIDE: sign(fx) flips instantly as the facing
 * crosses vertical, and every rest anchor mirroring on it used to
 * teleport — the mid-run "wrists flip around" snap. With memory the
 * side eases across the body over 240ms.
 *
 * THE FLIP EARNS ITS DWELL: heading jitter around straight N/S wobbles
 * fx across the ±0.12 line every few steps, and an instant flip
 * churned the hands across the body over and over — each pass a fresh
 * chance for the elbows to land inboard (the wiggle-walk inversion).
 * A flip must WANT the new side for 120ms of sustained facing before
 * it registers; a real turn barely notices (the 240ms ease dwarfs
 * it), a wobble never crosses it.
 *
 * THE EASE CONTINUES FROM WHERE IT STANDS: a flip arriving mid-ease
 * used to restart the blend from the OLD side's full ±1 — the hands
 * teleported from mid-body out to a side and swept back (the crossing
 * snap). The new ease departs from the CURRENT blended value, so a
 * reversal simply turns around, continuously.
 */
export declare function easeRestSide(mem: RestSideMemory, restSide: number, fx: number, nowMs: number): number;
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
export interface GreatWield {
    /** Main-hand offset from (x, armY), units of s (dx pre-squash). */
    dx: number;
    dy: number;
    /** Weapon angle, fist→tip, screen radians (projected). */
    angle: number;
    /** Foreshortened length for the painter. */
    fore: number;
    /** Fraction of the weapon trailing behind the fist (painter grip). */
    grip: number;
    /** How much the carrying hand joins the arm pump (0 planted…1 free). */
    pumpK: number;
    /**
     * How hard the run calls the off hand back to the hilt (0..1). The
     * rig turns this into the second-fist claim; combat's own claim is
     * separate and always full.
     */
    offClaim: number;
}
/**
 * THE SHOULDER CARRY — the great school's whole rest ladder in one
 * carry. Idle: the flat of the blade rests back over the trailing
 * shoulder, fist at the chest, off hand free — the woodcutter's carry,
 * one motion from the high guard. Walk: the same carry, the mass
 * rocking a beat BEHIND the stride (heavy things answer late). Run:
 * the blade stays shouldered but levels a little into the drive, the
 * fist drops toward the ribs, and the off hand comes back to the
 * grip — nobody sprints with six feet of iron in one fist.
 *
 * THE RESTING SHOULDER (the user's N/S verdict, second edition — the
 * ground plant was tried and rejected: it clipped the terrain and
 * read wrong at the elbows): the carry is a shoulder rest from EVERY
 * camera relationship. What breaks square-on is not the rest but the
 * TILT PLANE — "away from the facing" collapses to a screen vertical
 * there — so the plane rotates with the facing weight to lean the
 * blade over the RESTING shoulder instead: the same up-the-diagonal
 * read the profile facings have, hilt held at the shoulder-side of
 * the chest. The pitch never leaves the shoulder band, so the blade
 * points up at every facing (nothing to clip the ground) and the
 * screen's vertical component never crosses zero (nothing to whip).
 */
export declare function greatWield(dir: number, sideS: number, moveK: number, runK: number, sw: number, px: number): GreatWield;
/**
 * THE HIGH GUARD — combat's carry. Both fists on the long grip, blade
 * up-forward at the ready diagonal; the main hand rides at the cross,
 * the off hand takes the pommel end BEHIND it (the true two-hand
 * hold — opposite the staff, which chokes the off hand up FRONT).
 * Returned as the guard's world pitch for the rig to project.
 */
export declare const GREAT_GUARD_PITCH: number;
/** Off-fist seat: this far BEHIND the main fist along the grip. */
export declare const GREAT_POMMEL_CHOKE_S = 0.13;
export interface GreatStrikeFrame {
    /** Arm-angle offset from the aim; rests at 0.5 like the blades. */
    arm: number;
    /** Weapon angle relative to the arm ray — the heavy wrist lag. */
    spin: number;
    /** Reach multiplier (1 at both ends). */
    reach: number;
    /** Vertical hand offset, units of s (negative = raised). */
    lift: number;
    /** Torso lean along the cut. */
    lean: number;
    /** Weapon fraction behind the fist — cuts slide toward mid-grip. */
    grip: number;
}
/** The great school's beat: long gather, LONG poise, honest snap. */
export declare const GREAT_PHASES: {
    coil: number;
    hold: number;
    impact: number;
    ext: number;
};
export declare function greatStrikeFrame(stage: 0 | 1, t: number): GreatStrikeFrame;
/** The great sweep's crescent — alive loosing→extension, like the pole's. */
export declare function greatStrikeTrail(stage: 0 | 1, t: number): StaffTrail | null;
/**
 * THE MOUNTAIN FALLS — the finisher. Both hands haul the blade
 * straight overhead (the fist barely leaves the body; the LIFT does
 * the talking), the longest poise in the game, then the drive buries
 * the edge in the ground ahead. `pitch` is the blade's world pitch
 * for the projection law: crown-up through the haul, crashing through
 * level to down-forward at the bury.
 */
export declare const GREAT_FINISHER_PHASES: {
    coil: number;
    hold: number;
    drive: number;
    buried: number;
};
export declare function greatFinisherPath(t: number): {
    r: number;
    lift: number;
    pitch: number;
};
/** The finisher's torso: gather back, poise, tip HARD, press, ease. */
export declare function greatFinisherLean(t: number): number;
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