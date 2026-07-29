/**
 * Wield — the one carry vocabulary.
 *
 * carriage.ts owns how a FIST holds a BLADE (the user-tuned grip
 * verdicts live there and never move). This module owns everything
 * around that: how the whole body CARRIES a held thing through the
 * gait ladder — idle → walk → run are three stances, not two — how
 * the arms pump honestly along the direction of travel at every
 * facing, how a two-handed staff actually earns its second hand, and
 * how a bow is held by the wood at every gait. Pure functions, no
 * ctx, no rig state: both hands and the tests share one law source
 * (the carriage.ts pattern, grown to every class).
 *
 * Frame conventions match carriage.ts: screen radians with +y DOWN,
 * angles point fist→tip (π/2 straight down, −π/2 straight up),
 * offsets in units of the rig scale `s` with x pre-squash.
 */

/**
 * THE GROUND LAW's foreshortening factor (the shield plane's own
 * GROUND_K): one unit of world-forward travel shows as ~0.52 units of
 * screen-vertical. Everything in this file that turns travel into
 * screen motion runs through it, so a north-south stride reads with
 * the same honesty as an east-west one — smaller on screen because it
 * is foreshortened, never because it was suppressed.
 */
export const WIELD_GROUND_K = 0.52;

function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

/**
 * THE GAIT LADDER: idle → walk → run as one continuous clock.
 * `moveK` = is the body travelling at all (min(1, poleStrength));
 * `runK` = how much of that travel is a sprint (the legs' runF).
 * A slow walk is NOT a slow sprint: it gets its own stance — a
 * fraction of the run delta, so every carry lifts a little the
 * moment the feet move and only fully levels at speed. Continuous
 * in both inputs by construction, so no stance ever pops.
 */
export function gaitK(moveK: number, runK: number): number {
  const m = Math.max(0, Math.min(1, moveK));
  const r = Math.max(0, Math.min(1, runK));
  return Math.min(1, 0.3 * m * (1 - r) + r);
}

/** The ladder's eased lift — `gaitK` through the shared smoothstep.
 * bladeCarriage smooths its own runK input, so callers feeding it the
 * raw `gaitK` get exactly this curve — one ladder, two entry points. */
export function gaitLift(moveK: number, runK: number): number {
  return smooth(gaitK(moveK, runK));
}

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
 * screen because the world says so. This replaces the old pair of
 * symptom patches (an extra front-on pump clamp that froze N/S arms
 * near-dead, and a bolt-on lateral sway) with one law: pump vector =
 * travel · groundK, armed hands restrain it uniformly, and the
 * counter-sway is the torso answering the stride wherever the
 * fore/aft component leaves the screen.
 *
 * `sw` is the smoothed swing drive (±1), `amp` the caller's gait
 * amplitude in units of s, (`px`,`py`) the unit travel direction.
 * `armedK` 0..1 = how loaded the hand is (a weapon restrains the
 * vertical throw; a bare fist swings free).
 */
export function armPump(
  px: number,
  py: number,
  sw: number,
  amp: number,
  armedK: number,
): PumpFrame {
  // Vertical throw: foreshortened by the ground, then restrained by
  // the load — a carried blade quiets the pump without killing it.
  // (The per-footfall run bounce is a separate channel the rig owns:
  // it rides |sw|, not sw, and mixing it in here would let the shared
  // bob cancel the alternating throw it is supposed to sit on.)
  const vert = WIELD_GROUND_K * (1 - 0.45 * armedK);
  return {
    dx: px * sw * amp,
    dy: py * sw * amp * vert,
    // The counter-sway lives where the travel leaves the screen: full
    // on a N/S gait, gone at profile (|px| = 1), continuous between.
    sway: sw * (1 - Math.abs(px)) * 0.018,
  };
}

export interface StaffWield {
  /** Main-hand offset from (x, armY), units of s (dx pre-squash). */
  dx: number;
  dy: number;
  /** Staff angle, fist→crown, screen radians. */
  angle: number;
  /** Fraction of the shaft trailing behind the fist (painter grip). */
  grip: number;
  /** How much the planted hand sits out the arm pump (0 planted…1 free). */
  pumpK: number;
  /**
   * The second hand's claim on the shaft (0 = off hand free, 1 = both
   * hands on the wood) and where it lands: `chokeS` units of s along
   * the staff angle from the main fist, positive toward the crown.
   */
  twoHandK: number;
  chokeS: number;
}

/**
 * THE STAFF IS TWO-HANDED — the walking-stick ladder.
 *
 * Idle: planted upright beside the body, the true walking stick, off
 * hand free at its hang. Walk: still the planted stick — it ROCKS
 * with the stride now at every facing (the old rock only worked E/W
 * because it rode the screen-x pole; it now rides the stride clock
 * itself, tipped along the travel). Run: the staff levels into the
 * two-hand trail carry and the OFF HAND JOINS THE SHAFT, choked
 * toward the crown — nobody sprints leaning on a stick. Every channel
 * is continuous in the ladder, so the second hand reaches for the
 * wood as the jog builds and lets go as it dies.
 *
 * `sideS`/`sideW` are the rig's smoothed side sign and facing weight,
 * `sw` the smoothed swing drive, `px` the unit travel x.
 */
export function staffWield(
  sideS: number,
  sideW: number,
  moveK: number,
  runK: number,
  sw: number,
  px: number,
): StaffWield {
  const carry = smooth(runK);
  const m = Math.max(0, Math.min(1, moveK));
  // The stride works the planted stick: lateral rock where the travel
  // is lateral, a small fore/aft pump (ground-foreshortened) where the
  // travel runs at the camera — the stick is alive on a N/S walk too.
  const rockLat = -sw * 0.2 * px;
  const rockFwd = sw * 0.07 * (1 - Math.abs(px)) * WIELD_GROUND_K;
  const rock = (rockLat + rockFwd) * (1 - carry) * m;
  const up = -Math.PI / 2 + rock;
  // Level trail carry — continuous in the facing weight (full level at
  // profile, near-upright when the travel runs at the camera).
  const level = -Math.PI / 2 + sideW * (Math.PI / 2 - 0.3);
  return {
    dx: sideS * (0.27 + 0.02 * carry),
    dy: -0.04 + 0.2 * carry,
    angle: up + (level - up) * carry,
    grip: 0.72 - 0.3 * carry,
    pumpK: 0.3 + 0.7 * carry,
    // The second hand: reaches for the shaft as the jog builds. The
    // claim leads the level slightly (smooth(runK) would have the hand
    // arrive late) so the grab reads as PART of breaking into the run.
    twoHandK: smooth(Math.min(1, runK * 1.6)) * m,
    chokeS: 0.2 + 0.04 * carry,
  };
}

/**
 * THE QUARTERSTAFF GUARD — combat's two hands. Out of rest the staff
 * is gripped low (grip 0.34, business end forward) and the off hand
 * belongs ON the wood ahead of the main fist: the classic ready, both
 * hands spread mid-shaft. The claim is full in the guard and yields
 * to everything with a better right to the hand (the cast punch, a
 * shield, the seat, the sheathe — the rig orders those).
 */
export const STAFF_GUARD_CHOKE_S = 0.2;

/**
 * THE BOW IS HELD BY THE WOOD. The rest carriage: string toward the
 * body, wooden belly curving down-forward, half-ready — one motion
 * from the aim (the user-approved verdict, unchanged). The gait only
 * firms the carry: at a run the bow presses a touch closer and leans
 * a hair further toward ready, and the grip NEVER leaves the wrap —
 * the old carry blend slid the fist onto the string line whenever the
 * settle was partial, which is a hand holding a bowstring like a
 * suitcase handle.
 */
export function bowWield(
  sideW: number,
  moveK: number,
  runK: number,
): { dx: number; dy: number; angle: number } {
  const lift = gaitLift(moveK, runK);
  return {
    dx: sideW * (0.12 + 0.02 * lift),
    dy: 0.18 - 0.02 * lift,
    angle: Math.PI / 2 - sideW * (Math.PI / 2 - 0.85 + 0.1 * lift),
  };
}
