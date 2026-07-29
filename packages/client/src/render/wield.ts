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

// ------------------------------------------------ the projection law
//
// THE HELD THING IS A VECTOR. A carry is authored in the WORLD — a
// pitch off vertical, tilted toward (or away from) the facing — and
// projected onto the screen through the ground law, exactly the way
// the shield plane projects its normal. What falls out is not just a
// screen angle but a LENGTH: a blade leveled north points into the
// scene and draws foreshortened; leveled east it lies across the
// screen at full length. That length change is what tells the eye the
// weapon lives in the world's 3D space instead of rotating on a flat
// card — and at the profile facings the projection reproduces the
// user-approved carriage angles EXACTLY (h.y = 0 there, so the ground
// factor never touches them).

export interface CarryProjection {
  /** Screen angle, fist→tip. */
  angle: number;
  /** Length multiplier for the painter — 1 in the screen plane. */
  fore: number;
}

/**
 * THE SOFT-DEPTH LAW: the raw projection is geometrically honest but
 * PERCEPTUALLY wrong for a stylized rig — a staff at the pure ground
 * factor collapsed to a twig ("not even the same item any more", the
 * user's verdict). The eye needs a CUE, not the full compression: the
 * length shrinks a restrained fraction of what the geometry says,
 * floored so every weapon keeps its identity at every facing.
 */
const FORE_SOFT = 0.35;
const FORE_FLOOR = 0.8;

/**
 * Project a held rod: `pitch` is the tilt off straight-down, positive
 * toward the `yaw` heading, negative trailing away from it. The angle
 * is the honest projection; the length is softened by the depth law.
 */
export function projectCarry(yaw: number, pitch: number): CarryProjection {
  const h = Math.sin(pitch);
  const v = Math.cos(pitch);
  const sx = Math.cos(yaw) * h;
  const sy = Math.sin(yaw) * h * WIELD_GROUND_K + v;
  const len = Math.hypot(sx, sy);
  const soft = 1 - (1 - Math.min(1.06, len)) * FORE_SOFT;
  return {
    angle: Math.atan2(sy, sx),
    fore: Math.max(FORE_FLOOR, soft),
  };
}

/**
 * The strike-plane projection: a cut sweeps the GROUND plane around
 * the body, so a blade mid-sweep foreshortens as it points into (or
 * out of) the screen. Softened against the pure ground factor — the
 * held extension of a killing blow keeps enough length to read as a
 * blow — with the same law shape: full length across the screen,
 * honestly shorter along the depth axis.
 */
export function projectStrike(yaw: number): CarryProjection {
  const K = 0.7;
  const sx = Math.cos(yaw);
  const sy = Math.sin(yaw) * K;
  const len = Math.hypot(sx, sy);
  return {
    angle: Math.atan2(sy, sx),
    // The soft-depth law, held a shade higher: a killing blow keeps
    // its steel. ~10% at the full camera line — a cue, never a stub.
    fore: Math.max(0.85, 1 - (1 - len) * FORE_SOFT),
  };
}

// --------------------------------------------------- the honest pump

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
export function armPump(
  px: number,
  py: number,
  sw: number,
  amp: number,
  armedK: number,
): PumpFrame {
  const vert = WIELD_GROUND_K * (1 - 0.45 * armedK);
  return {
    dx: px * sw * amp,
    dy: py * sw * amp * vert,
    sway: sw * (1 - Math.abs(px)) * 0.018,
  };
}

/**
 * THE RUNNER'S ELBOW: a free hand does not dangle at a sprint — the
 * elbow bends and the fist rises toward the ribs, pumping in unison
 * with the legs (any running reference: hands carried at waist
 * height, driving fore and aft). Returned as the lift OFF the relaxed
 * hang, units of s, for the caller to subtract from the hang height.
 * Armed hands keep their own carriage heights — a carry law is a
 * verdict — so this applies to EMPTY fists only.
 */
export function runnerLift(moveK: number, runK: number): number {
  return 0.11 * smooth(Math.max(0, Math.min(1, runK))) * Math.max(0, Math.min(1, moveK));
}

// ----------------------------------------------------------- staff

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
export function staffWield(
  dir: number,
  sideS: number,
  moveK: number,
  runK: number,
  sw: number,
  px: number,
): StaffWield {
  const carry = smooth(runK);
  const m = Math.max(0, Math.min(1, moveK));
  // The stride works the planted stick: a pitch oscillation in the
  // travel plane. Slightly stronger across the screen (the lateral
  // rock the eye expects) than along the depth, but alive everywhere.
  const rock = sw * (0.2 * Math.abs(px) + 0.11 * (1 - Math.abs(px))) * (1 - carry) * m;
  // The crown points UP at rest — pitch π in the projection's from-
  // vertical-down convention. Idle/walk: near-vertical, tip planted.
  // Run: the crown levels toward the heading and stops a touch HIGH
  // (π/2 + 0.15), butt trailing down-back — the balance carry of
  // someone who means to plant the stick again when they stop.
  const pitch = Math.PI - rock - carry * (Math.PI / 2 - 0.15);
  const p = projectCarry(dir, pitch);
  return {
    dx: sideS * (0.27 - 0.06 * carry),
    dy: -0.04 + 0.17 * carry,
    angle: p.angle,
    fore: p.fore,
    grip: 0.72 - 0.22 * carry,
    pumpK: 0.3 + 0.7 * carry,
  };
}

/**
 * THE QUARTERSTAFF GUARD — combat's two hands. Out of rest the staff
 * is gripped low (grip 0.34, business end forward) and the off hand
 * belongs ON the wood ahead of the main fist: the classic ready. The
 * claim is full in the guard and yields to everything with a better
 * right to the hand (the cast punch, a shield, the seat, the sheathe
 * — the rig orders those). The RUN never claims it any more.
 */
export const STAFF_GUARD_CHOKE_S = 0.2;

// ------------------------------------------- the staff's own strikes
//
// THE POLE SCHOOL: a staff is not a long sword — it fights from the
// middle, both hands on the wood, and its cuts are SWEEPS: the shaft
// rides TANGENT to the arc (a turning bar, not a swung radius). Two
// stages plus the ram: the MOULINET, a level two-handed sweep across
// the front; the BUTT CUT, the reverse sweep on a low line led by the
// iron ferrule; and the finisher keeps the existing two-hand RAM
// (thrustPath) — a spear-drive with the crown. Same readability laws
// as the blade schools: ease into a cocked coil, HOLD it, snap the
// sweep with overshoot, hold the landed extension, recover to the
// guard. Every channel neutral at both ends, blend-safe.

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

const STAFF_PHASES = { coil: 0.24, hold: 0.3, impact: 0.42, ext: 0.58 };

interface StaffSpec {
  coilArm: number;
  impactArm: number;
  /** Tangent side: +1 crown leads the sweep, −1 the butt leads. */
  tan: number;
  coilLift: number;
  impactLift: number;
  coilReach: number;
  impactReach: number;
  lean: number;
}

const STAFF_SPECS: [StaffSpec, StaffSpec] = [
  // THE MOULINET: wide level sweep, crown leading.
  {
    coilArm: -1.55, impactArm: 1.6, tan: 1,
    coilLift: -0.07, impactLift: 0.03,
    coilReach: 0.6, impactReach: 1.05,
    lean: 0.13,
  },
  // THE BUTT CUT: reverse sweep, low line, ferrule leading.
  {
    coilArm: 1.4, impactArm: -1.45, tan: -1,
    coilLift: 0.08, impactLift: -0.03,
    coilReach: 0.55, impactReach: 1.0,
    lean: 0.12,
  },
];

/** The rest arm offset staff strikes leave from and land on. */
const STAFF_REST_ARM = 0.5;

export function staffStrikeFrame(stage: 0 | 1, t: number): StaffStrikeFrame {
  const K = STAFF_SPECS[stage];
  const P = STAFF_PHASES;
  const sgn = Math.sign(K.impactArm - K.coilArm);
  // The tangent hold: through the cut the shaft lies across the arc
  // (±π/2 off the arm ray), cocked a little PAST tangent at the coil
  // and whipping a little short of it at impact — the turning-bar
  // read. It unwinds to zero at both ends so the guard blend is safe.
  const tanHold = K.tan * sgn * (Math.PI / 2);
  const cock = K.tan * sgn * 0.5;
  const ov = sgn * 0.1;
  if (t < P.coil) {
    const e = smooth(t / P.coil);
    return {
      arm: STAFF_REST_ARM + (K.coilArm - STAFF_REST_ARM) * e,
      spin: (tanHold + cock) * e,
      reach: 1 + (K.coilReach - 1) * e,
      lift: K.coilLift * e,
      lean: -sgn * K.lean * 0.6 * e,
      grip: 0.34 + 0.16 * e,
    };
  }
  if (t < P.hold) {
    return {
      arm: K.coilArm,
      spin: tanHold + cock,
      reach: K.coilReach,
      lift: K.coilLift,
      lean: -sgn * K.lean * 0.6,
      grip: 0.5,
    };
  }
  if (t < P.impact) {
    const e = smooth((t - P.hold) / (P.impact - P.hold));
    return {
      arm: K.coilArm + (K.impactArm + ov - K.coilArm) * e,
      spin: tanHold + cock - (cock + K.tan * sgn * 0.4) * e,
      reach: K.coilReach + (K.impactReach - K.coilReach) * e,
      lift: K.coilLift + (K.impactLift - K.coilLift) * e,
      lean: -sgn * K.lean * 0.6 + sgn * K.lean * 1.6 * e,
      grip: 0.5,
    };
  }
  if (t < P.ext) {
    const e = smooth((t - P.impact) / (P.ext - P.impact));
    return {
      arm: K.impactArm + ov * (1 - e),
      spin: tanHold - K.tan * sgn * 0.4 * (1 - 0.3 * e),
      reach: K.impactReach,
      lift: K.impactLift,
      lean: sgn * K.lean * (1 - 0.25 * e),
      grip: 0.5,
    };
  }
  const e = smooth((t - P.ext) / (1 - P.ext));
  return {
    arm: K.impactArm + (STAFF_REST_ARM - K.impactArm) * e,
    spin: (tanHold - K.tan * sgn * 0.28) * (1 - e),
    reach: K.impactReach + (1 - K.impactReach) * e,
    lift: K.impactLift * (1 - e),
    lean: sgn * K.lean * 0.75 * (1 - e),
    grip: 0.5 - 0.16 * e,
  };
}

export interface StaffTrail {
  from: number;
  to: number;
  alpha: number;
  lift: number;
}

/** The sweep's crescent, alive from the loosing through the extension. */
export function staffStrikeTrail(stage: 0 | 1, t: number): StaffTrail | null {
  const P = STAFF_PHASES;
  if (t < P.hold || t > P.ext) return null;
  const K = STAFF_SPECS[stage];
  const f = staffStrikeFrame(stage, t);
  const alpha = t <= P.impact ? 1 : 1 - smooth((t - P.impact) / (P.ext - P.impact));
  return {
    from: K.coilArm,
    to: f.arm,
    alpha,
    lift: (K.coilLift + K.impactLift) / 2,
  };
}

// ------------------------------------------------------------- bow

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
export function bowWield(
  dir: number,
  sideW: number,
  moveK: number,
  runK: number,
): { dx: number; dy: number; angle: number; fore: number } {
  const lift = gaitLift(moveK, runK);
  const beta = 0.72 + 0.1 * lift;
  const p = projectCarry(dir, beta);
  return {
    dx: sideW * (0.12 + 0.02 * lift),
    dy: 0.18 - 0.02 * lift,
    angle: Math.PI / 2 - sideW * (Math.PI / 2 - 0.85 + 0.1 * lift),
    fore: 0.5 + 0.5 * p.fore,
  };
}
