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
 * THE GROUND LAW's foreshortening factor: one unit of world-forward
 * travel shows as ~0.52 units of screen-vertical. Everything in this
 * file that turns world direction into screen direction runs through
 * it, so a north-south carry reads with the same honesty as an
 * east-west one — smaller on screen because it is foreshortened, never
 * because it was suppressed. THE ONE GROUND (arms-v3 Phase 1): this is
 * the single definition — shields.ts imports it for the plane
 * projection, so the shield and the carries can never drift apart.
 * (projectStrike below still runs its own softer K = 0.7; unifying the
 * strike plane onto this constant is Phase 3's HONEST DEPTH work.)
 */
export const WIELD_GROUND_K = 0.52;

function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

// ------------------------------------------------- THE FACING FRAME
//
// ONE SIDE VOCABULARY (arms-v3 Phase 2). The audit found `side`
// meaning three different things across three modules — the facing
// weight, the smoothed sign, the outboard-arm sign — with nothing but
// parameter names (some of them lying) to keep callers honest. The
// FacingFrame is the fix: computed ONCE per body per frame from the
// facing and the eased rest side, and passed WHOLE, so a function
// picks the read it needs by FIELD NAME instead of trusting a bare
// number's positional slot.

/** THE FACING-WEIGHT LAW's floor: front-on there is no screen-forward
 *  for a rake to point, so the weight never quite reaches zero — grip
 *  identity is carried by the edge flip and the lean sign there. A
 *  bigger floor splayed blades at the camera (the 0.35 verdict). */
export const SIDE_FLOOR = 0.2;
/** The weight's profile slope: full rake belongs to the silhouette. */
export const SIDE_SLOPE = 0.8;

export interface FacingFrame {
  /** World heading, radians (the projection functions' yaw). */
  dir: number;
  fx: number;
  fy: number;
  /** The rig's honest facing weight: |fx| (NOT the face painters'
   *  boosted read — that is faceProfileK in rig.ts). */
  profileK: number;
  /** THE SMOOTHED REST SIDE — eased, dwelled sign (easeRestSide). */
  sideS: number;
  /** THE FACING WEIGHT — sideS · (floor + slope·profileK). */
  sideW: number;
}

export function facingFrame(dir: number, sideS: number): FacingFrame {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  const profileK = Math.abs(fx);
  return {
    dir,
    fx,
    fy,
    profileK,
    sideS,
    sideW: sideS * (SIDE_FLOOR + SIDE_SLOPE * profileK),
  };
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
 * floored so every weapon keeps its identity at every facing. ONE
 * SOFT LAW (arms-v3 Phase 3): every projection shares this shape;
 * only the FLOOR is a per-context perceptual verdict — carries keep
 * identity at 0.8, strikes keep their steel at 0.85.
 */
const FORE_SOFT = 0.35;
const FORE_FLOOR = 0.8;
/** The strike floor: a killing blow keeps its steel — a cue, never a
 *  stub (~10% shorter at the full camera line). */
const FORE_FLOOR_STRIKE = 0.85;

function softFore(len: number, floor: number): number {
  return Math.max(floor, 1 - (1 - Math.min(1.06, len)) * FORE_SOFT);
}

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
  return {
    angle: Math.atan2(sy, sx),
    fore: softFore(Math.hypot(sx, sy), FORE_FLOOR),
  };
}

/**
 * The strike-plane projection: a cut sweeps the GROUND plane around
 * the body, so a blade mid-sweep foreshortens as it points into (or
 * out of) the screen. ONE GROUND (arms-v3 Phase 3): this used to run
 * its own K = 0.7 — a second, flatter world living inside the first;
 * the audit's "three depth laws" finding. It now projects through
 * WIELD_GROUND_K like everything else; its FLOOR stays the strike
 * verdict.
 */
export function projectStrike(yaw: number): CarryProjection {
  const sx = Math.cos(yaw);
  const sy = Math.sin(yaw) * WIELD_GROUND_K;
  return {
    angle: Math.atan2(sy, sx),
    fore: softFore(Math.hypot(sx, sy), FORE_FLOOR_STRIKE),
  };
}

/**
 * THE AIM IS A GROUND VECTOR (arms-v3 Phase 3): a radial reach down
 * the aim — a thrust, an icepick mark, a cast punch, a drawn arrow —
 * lives on the ground plane, so its screen direction is the
 * PROJECTED heading and its unit vector carries the ground K on the
 * depth axis. `ax, ay` are the unit screen direction of the aim; a
 * reach of r lands at (ax·r, ay·r) — an ellipse, not the flat card's
 * circle. The old un-projected reaches were why a south-facing archer
 * aimed the arrow at their own feet and a north thrust punched at
 * the sky.
 */
export interface AimProjection extends CarryProjection {
  /** RAW projected components: a world reach r lands at (px·r, py·r)
   *  — the ellipse itself. |(px,py)| shrinks toward the camera lines;
   *  normalizing them would silently rebuild the flat card's circle. */
  px: number;
  py: number;
  /** UNIT screen direction of the aim — for directions (a string
   *  haul, a recoil), never for reach distances. */
  ux: number;
  uy: number;
}

export function projectAim(yaw: number): AimProjection {
  const sx = Math.cos(yaw);
  const sy = Math.sin(yaw) * WIELD_GROUND_K;
  const len = Math.hypot(sx, sy) || 1;
  return {
    angle: Math.atan2(sy, sx),
    fore: softFore(len, FORE_FLOOR_STRIKE),
    px: sx,
    py: sy,
    ux: sx / len,
    uy: sy / len,
  };
}

/**
 * THE LIFELINE (arms-v3 Phase 3): at the camera-line facings a long
 * carry's projection collapses toward a screen vertical — the lab's
 * verdict rows: a staff sprint south read as a stick with the crown
 * in the dirt, a leveled sword as a plumb line. The perceptual floor:
 * the authored yaw biases toward the EASED side exactly where the
 * heading runs down the camera line, so the projected carry keeps a
 * readable diagonal. Riding sideS keeps it continuous through every
 * turn and mirror-true; smooth(1 − profileK) keeps profile facings
 * EXACT (zero bias where the user-approved angles reproduce).
 */
export const LIFELINE_BIAS = 0.48;

export function lifelineYaw(f: FacingFrame): number {
  return f.dir + f.sideS * LIFELINE_BIAS * smooth(1 - f.profileK);
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
/**
 * THE VISIBLE BREATH (arms-v3 Phase 5): on a camera-line gait the
 * pump's fore/aft throw projects to almost nothing — the S-facing
 * "statue run" verdict cells: both fists frozen at the hips while the
 * legs sprint. The beat re-expresses through the one channel that
 * SURVIVES the projection: the vertical remnant amplifies by this
 * gain exactly as the lateral read dies — sized so the deepest
 * throw of a bare sprint stays inside the arm's reach budget (0.85
 * overstretched the stride bottom; the elbow regression test caught
 * it) ((1 − |px|): zero at profile,
 * full at the camera lines). Same energy, different axis — never a
 * fake side-to-side arm swing.
 */
export const BREATH_K = 0.5;

export function armPump(
  px: number,
  py: number,
  sw: number,
  amp: number,
  armedK: number,
): PumpFrame {
  const vert = WIELD_GROUND_K * (1 - 0.45 * armedK);
  const breath = 1 + BREATH_K * (1 - Math.abs(px));
  return {
    dx: px * sw * amp,
    dy: py * sw * amp * vert * breath,
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
 *
 * `profileK` is the facing weight (|cos dir|): the full lift belongs
 * to the profile silhouette, where the bent pumping arm is the whole
 * read. Front- and back-on the hang is already at hip-line width and
 * the same lift jammed both fists up into the armpits — and shrank
 * the shoulder→hand chord until the elbow bend had nowhere honest to
 * go. Half the lift at the camera-line facings, full in profile,
 * linear so the height breathes through every diagonal.
 */
/**
 * THE VISIBLE BREATH's second voice (arms-v3 Phase 5): free fists on
 * a camera-line gait ALTERNATE their runner's lift with the stride —
 * one fist rides toward the ribs as the other drops — the pumping
 * read every running reference draws, re-expressed on the axis the
 * camera can see. Zero at profile (the fore/aft pump owns that read).
 */
export const LIFT_ALT_K = 0.55;

export function runnerLift(moveK: number, runK: number, profileK: number): number {
  const pk = Math.max(0, Math.min(1, profileK));
  return (
    0.11 *
    (0.55 + 0.45 * pk) *
    smooth(Math.max(0, Math.min(1, runK))) *
    Math.max(0, Math.min(1, moveK))
  );
}

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
export function settleElbowPole(side: number, poleX: number, trailB: number): number {
  const claim = trailB * Math.abs(poleX);
  return side * 0.7 * (1 - claim) - poleX * 0.6 * trailB;
}

// ------------------------------------- THE FLIP EARNS ITS HYSTERESIS
//
// (arms-v3 Phase 4) Every LAYER decision — which side of the torso or
// legs a weapon paints on — used to flip on a raw threshold: a slow
// arc across fy = −0.35 popped the blade between layers every frame
// the heading wobbled. One banded resolver now serves them all, on
// the same caller-owned memory the mainBehind/offFront pair proved:
// a flag turns ON at `on`, OFF at `off` (on > off), and HOLDS its
// last state anywhere between. The bands are chosen to leave every
// CARDINAL facing (fy, profileK ∈ {0, ±0.707, ±1}) outside the dead
// zone, so a settled heading always resolves exactly as the old
// threshold did — hysteresis changes rotation, never rest.

export interface BandMemory {
  bands?: Record<string, boolean>;
}

export function bandFlag(
  mem: BandMemory | undefined,
  key: string,
  v: number,
  on: number,
  off: number,
): boolean {
  const mid = (on + off) / 2;
  if (!mem) return v >= mid; // stateless callers: the old single threshold
  const bands = (mem.bands ??= {});
  const next = v >= on ? true : v <= off ? false : (bands[key] ?? v >= mid);
  bands[key] = next;
  return next;
}

/**
 * THE SILHOUETTE PEEK's away band (arms-v3 Phase 4): 0 on the whole
 * camera-facing half and at the profile facings, rising smoothly
 * through the away diagonals — the band where held gear used to
 * vanish completely behind the torso (the invisible-kiteshield
 * verdict). Peek lanes scale by this so a loadout stays readable at
 * every one of the eight headings.
 */
export function awayPeekK(fy: number): number {
  return smooth(Math.max(0, Math.min(1, (-fy - 0.2) / 0.3)));
}

/** How far the hang lanes widen at the away band (fraction of hangW). */
export const PEEK_HANG_K = 0.16;
/** The bow's own outboard peek at the away band (units of s). */
export const BOW_PEEK_S = 0.1;

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
export function easeRestSide(
  mem: RestSideMemory,
  restSide: number,
  fx: number,
  nowMs: number,
): number {
  if (mem.side === undefined) {
    mem.side = restSide;
    mem.sideFlipMs = -1e9;
  }
  const wantFlip = mem.side !== restSide && Math.abs(fx) > 0.12;
  if (!wantFlip) mem.sideWantMs = undefined;
  else if (mem.sideWantMs === undefined) mem.sideWantMs = nowMs;
  if (wantFlip && nowMs - mem.sideWantMs! >= 120) {
    const tOld = Math.max(0, Math.min(1, (nowMs - (mem.sideFlipMs ?? -1e9)) / 240));
    const kOld = tOld * tOld * (3 - 2 * tOld);
    mem.prevSide = mem.side * kOld + (mem.prevSide ?? mem.side) * (1 - kOld);
    mem.side = restSide;
    mem.sideFlipMs = nowMs;
    mem.sideWantMs = undefined;
  }
  const t = Math.max(0, Math.min(1, (nowMs - (mem.sideFlipMs ?? -1e9)) / 240));
  const k = t * t * (3 - 2 * t);
  return mem.side * k + (mem.prevSide ?? mem.side) * (1 - k);
}

// ----------------------------------------------------------- staff

export interface StaffWield {
  /** Main-hand offset from (x, armY), units of s (dx pre-squash). */
  dx: number;
  dy: number;
  /** UN-squashed forward lean of the fist along the facing, units of
   *  s — the carry sits a breath ahead of the hang lane. This used to
   *  be a bare `fx·0.05·s` nudge at the rig's assembly site (the
   *  frame-is-the-only-writer violation the audit caught); the frame
   *  owns it now. Kept separate from dx because dx rides wScale and
   *  this deliberately does not. */
  fwd: number;
  /** Staff angle, fist→crown, screen radians (projected). */
  angle: number;
  /** Foreshortened length for the painter. */
  fore: number;
  /** Fraction of the shaft trailing behind the fist (painter grip). */
  grip: number;
  /** How much the planted hand sits out the arm pump (0 planted…1 free). */
  pumpK: number;
}

/** The staff carry's forward lean (see StaffWield.fwd), units of s. */
export const STAFF_FWD_LEAN_S = 0.05;
/** THE PLANT CLEARS THE FACE: the planted stick's crown tips outboard
 *  by this screen lean (radians) so the shaft stands clear of the head
 *  silhouette at the profile facings — the lab's verdict cells showed
 *  the staff crossing the face at W/NW. Rides sideS (mirror-true,
 *  continuous through every turn) and fades out as the run levels the
 *  carry (the trail has its own lifeline). */
export const STAFF_PLANT_LEAN = 0.09;
/** The great shoulder carry's forward lean, units of s. */
export const GREAT_FWD_LEAN_S = 0.04;
/** THE CROWN NEVER DIGS: extra above-level pitch the staff's run
 *  carry takes as the heading turns toward the camera (radians). */
export const STAFF_CROWN_GUARD = 0.34;

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
  f: FacingFrame,
  moveK: number,
  runK: number,
  sw: number,
  px: number,
): StaffWield {
  const { dir, sideS } = f;
  const carry = smooth(runK);
  const m = Math.max(0, Math.min(1, moveK));
  // The stride works the planted stick: a pitch oscillation in the
  // travel plane. Slightly stronger across the screen (the lateral
  // rock the eye expects) than along the depth, but alive everywhere.
  const rock = sw * (0.2 * Math.abs(px) + 0.11 * (1 - Math.abs(px))) * (1 - carry) * m;
  // THE CROWN NEVER DIGS (arms-v3 Phase 3): a leveled carry pointing
  // TOWARD the camera projects down-screen — at a south sprint the
  // crown orb read as scraping the ground (the lab's verdict cell).
  // The run carry's pitch rides a toward-camera guard: a barely-above-
  // level trail at the profile facings, lifting toward the camera half
  // so the projected crown never drops below its readable band.
  // Continuous in the facing (smooth of fy's positive half).
  const digK = smooth(Math.max(0, f.fy));
  // The crown points UP at rest — pitch π in the projection's from-
  // vertical-down convention. Idle/walk: near-vertical, tip planted.
  // Run: the crown levels toward the heading and stops a touch HIGH
  // (π/2 + 0.15 at profile, + the crown guard toward the camera),
  // butt trailing down-back — the balance carry of someone who means
  // to plant the stick again when they stop.
  const pitch = Math.PI - rock - carry * (Math.PI / 2 - 0.15 - STAFF_CROWN_GUARD * digK);
  // THE LIFELINE: the projection yaw biases toward the eased side at
  // the camera lines, so the carry keeps a readable diagonal instead
  // of collapsing to a screen vertical (profile facings are exact —
  // the bias is zero there).
  const p = projectCarry(lifelineYaw(f), pitch);
  return {
    // The plant lane sits wide enough that the near-vertical shaft
    // stands beside the head, never across it (0.27 parked the crown
    // on the ear at the profile facings); the run carry pulls the
    // leveled trail back in toward the body line.
    dx: sideS * (0.33 - 0.12 * carry),
    dy: -0.04 + 0.17 * carry,
    fwd: f.fx * STAFF_FWD_LEAN_S,
    angle: p.angle + sideS * STAFF_PLANT_LEAN * (1 - carry),
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

// The staff's own strike choreography (the moulinet, the butt cut,
// their tangent-bar law and trails) moved into strikes.ts — THE CUT
// LIVES IN THE WORLD. The carries, the guard, and the choke constants
// below remain the pole school's rest-side law source.

// ---------------------------------------------------- the great school
//
// THE MASS LAW: a greatweapon is the only held thing whose WEIGHT is
// the identity — every carry and every cut must read as mass managed,
// never mass ignored. The second fist is never far: the shoulder
// carry frees it only at a standstill, the run calls it back to the
// hilt, and combat welds both hands on. Where the staff fights from
// the middle (tangent sweeps), great steel fights from the END of a
// long lever — cuts are swung RADII with a heavy wrist lag, and every
// beat runs slower than the sword schools because the renderer gives
// this school its own, longer clock.

export interface GreatWield {
  /** Main-hand offset from (x, armY), units of s (dx pre-squash). */
  dx: number;
  dy: number;
  /** UN-squashed forward lean along the facing (StaffWield.fwd's law). */
  fwd: number;
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
export function greatWield(
  f: FacingFrame,
  moveK: number,
  runK: number,
  sw: number,
  px: number,
): GreatWield {
  const { dir, sideS } = f;
  const m = Math.max(0, Math.min(1, moveK));
  const drive = smooth(runK);
  // The late rock: the mass answers the stride at reduced amplitude —
  // a greatblade never jiggles.
  const rock = sw * (0.09 * Math.abs(px) + 0.05 * (1 - Math.abs(px))) * m;
  // Shouldered: tip up and BACK over the trailing shoulder (pitch past
  // π tilts away from the facing). The run lays it FLATTER across the
  // shoulder — the charging carry — never toward vertical: a blade
  // walked upright to the chest reads as a candle, not a burden (the
  // lab's verdict on the first draft).
  const shoulderPitch = Math.PI + 0.62 - rock + drive * 0.35;
  // How square to the camera the facing runs — the weight that swings
  // the tilt plane from "away from the facing" (the profile verdict)
  // to "over the resting shoulder" (the square-on one). Every blend
  // frame is itself a valid diagonal shoulder rest, so the weight can
  // run the full wide band with nothing to hide.
  const k = smooth(1 - Math.abs(Math.cos(dir)));
  // THE LEAN GOES INWARD (the user's angle verdict): square-on, the
  // blade crosses from the hilt fist IN over the shoulder behind the
  // neck — tip up on the far side of the head. Leaning OUTWARD from
  // the fist read as brandishing the sword beside the body, not
  // resting it: a rest must CROSS the shoulder line. The world yaw
  // flips with the hemisphere so the cross reads the same on screen
  // whether the body faces the camera or away; sideS (the smoothed
  // rest side) keeps the shoulder swap continuous — the blade eases
  // across the back of the neck instead of teleporting when the
  // facing crosses the vertical.
  const hemi = Math.sin(dir) >= 0 ? 1 : -1;
  const p = projectCarry(dir - sideS * hemi * (Math.PI / 2) * k, shoulderPitch);
  return {
    // Square-on, the hilt holds a little further out by the resting
    // shoulder — the bent elbow's read, not a fist across the chest.
    dx: sideS * (0.16 + 0.05 * drive + 0.08 * k),
    dy: -0.16 + 0.07 * drive,
    fwd: f.fx * GREAT_FWD_LEAN_S,
    angle: p.angle,
    fore: p.fore,
    grip: 0.14 + 0.07 * drive,
    pumpK: 0.2 + 0.25 * drive,
    offClaim: smooth(Math.min(1, runK * 1.7)) * m,
  };
}

// ---------------------------------------------------- the reaching school
//
// THE VERSATILE GRIP is a RENDER truth here: the same haft carries two
// whole rest ladders, picked by what the off hand holds. War grip
// (off fist empty) = THE PORT: the soldier's diagonal across the body,
// point up-forward over the lead shoulder, both hands on the wood; the
// run lowers the point down the travel line, butt trailing. Couched
// (a shield on the off arm) = THE PLANT: the sentry's vertical beside
// the body through idle and walk — the patrol silhouette beside the
// wall — dropping to THE COUCH at a run: one hand, haft just above
// level at the hip, point forward. Both ladders ride the projection
// law, the lifeline, and the crown guard exactly as the staff does.

export interface PoleWield {
  /** Main-hand offset from (x, armY), units of s (dx pre-squash). */
  dx: number;
  dy: number;
  /** UN-squashed forward lean along the facing (StaffWield.fwd's law). */
  fwd: number;
  /** Haft angle, fist→point, screen radians (projected). */
  angle: number;
  /** Foreshortened length for the painter. */
  fore: number;
  /** Fraction of the haft trailing behind the fist (painter grip). */
  grip: number;
  /** How much the carrying hand joins the arm pump (0 planted…1 free). */
  pumpK: number;
  /** The war grip's call on the off fist (0 under the couch — the
   *  shield owns that hand and this never argues). */
  offClaim: number;
}

/** The pole carry's forward lean (StaffWield.fwd's law), units of s. */
export const POLE_FWD_LEAN_S = 0.05;
/** Combat's ready pitch: point forward-level, a breath above the
 *  horizon — the guard every polearm strike coils from. */
export const POLE_GUARD_PITCH = Math.PI / 2 + 0.3;

export function poleWield(
  f: FacingFrame,
  moveK: number,
  runK: number,
  sw: number,
  px: number,
  couched: boolean,
): PoleWield {
  const { sideS } = f;
  const m = Math.max(0, Math.min(1, moveK));
  const drive = smooth(runK);
  const digK = smooth(Math.max(0, f.fy));
  if (couched) {
    // THE PLANT: vertical beside the lead side, butt grounded, the
    // stride rocking it on the staff's own walk law (a patrol keeps
    // its spear planted); THE COUCH takes over at the run — the haft
    // levels at the hip, point forward, hand slid back toward the
    // butt to buy the reach.
    const rock = sw * (0.16 * Math.abs(px) + 0.09 * (1 - Math.abs(px))) * (1 - drive) * m;
    const pitch = Math.PI - rock - drive * (Math.PI / 2 - 0.12 - STAFF_CROWN_GUARD * digK);
    const p = projectCarry(lifelineYaw(f), pitch);
    return {
      dx: sideS * (0.31 - 0.13 * drive),
      dy: -0.02 + 0.17 * drive,
      fwd: f.fx * POLE_FWD_LEAN_S,
      angle: p.angle + sideS * STAFF_PLANT_LEAN * (1 - drive),
      fore: p.fore,
      // Planted: fist above the middle of a TALL shaft. Couched: the
      // hand runs back so the point owns the front.
      grip: 0.6 - 0.32 * drive,
      pumpK: 0.25 + 0.45 * drive,
      offClaim: 0,
    };
  }
  // THE PORT: the diagonal across the body — point up-forward over
  // the lead shoulder (the great rests BACK over the trailing one;
  // the port aims where its bearer is going). The mass answers the
  // stride a beat late, softer than great iron; the run lowers the
  // point toward the travel line, never past the crown guard's floor.
  const rock = sw * (0.08 * Math.abs(px) + 0.05 * (1 - Math.abs(px))) * m;
  const pitch = Math.PI - 0.52 - rock - drive * (0.72 - STAFF_CROWN_GUARD * digK);
  const p = projectCarry(lifelineYaw(f), pitch);
  return {
    dx: sideS * (0.22 - 0.06 * drive),
    dy: -0.08 + 0.12 * drive,
    fwd: f.fx * POLE_FWD_LEAN_S,
    angle: p.angle,
    fore: p.fore,
    // Port holds near the balance point; the run slides the hand back
    // as the point drops — the trail that is one motion from a thrust.
    grip: 0.44 - 0.1 * drive,
    pumpK: 0.2 + 0.3 * drive,
    // Both hands belong on a war-gripped haft; the run welds them.
    offClaim: (0.55 + 0.45 * drive) * Math.max(m, 0.55),
  };
}

/**
 * THE HIGH GUARD — combat's carry. Both fists on the long grip, blade
 * up-forward at the ready diagonal; the main hand rides at the cross,
 * the off hand takes the pommel end BEHIND it (the true two-hand
 * hold — opposite the staff, which chokes the off hand up FRONT).
 * The guard's world pitch: THE MOUNTAIN FALLS hauls the blade up FROM
 * this pitch and returns it here at the recover (greatFinisherPath
 * consumes it — the three re-literalled copies the arms-v3 audit
 * caught are gone).
 */
export const GREAT_GUARD_PITCH = Math.PI - 0.55;
/** Off-fist seat: this far BEHIND the main fist along the grip. */
export const GREAT_POMMEL_CHOKE_S = 0.13;

// The great school's cut choreography (the felling stroke, the wide
// reap, the heavy wrist lag) moved into strikes.ts — THE CUT LIVES IN
// THE WORLD. The beat table stays here because the renderer's own
// choreography clock reads it alongside the finisher's.

/** The great school's beat: long gather, LONG poise, honest snap. */
export const GREAT_PHASES = { coil: 0.3, hold: 0.42, impact: 0.52, ext: 0.72 };

/**
 * THE MOUNTAIN FALLS — the finisher. Both hands haul the blade
 * straight overhead (the fist barely leaves the body; the LIFT does
 * the talking), the longest poise in the game, then the drive buries
 * the edge in the ground ahead. `pitch` is the blade's world pitch
 * for the projection law: crown-up through the haul, crashing through
 * level to down-forward at the bury.
 */
export const GREAT_FINISHER_PHASES = { coil: 0.3, hold: 0.46, drive: 0.58, buried: 0.78 };

export function greatFinisherPath(t: number): { r: number; lift: number; pitch: number } {
  const P = GREAT_FINISHER_PHASES;
  const UP = Math.PI + 0.12; // tip straight up, a hair behind vertical
  const DOWN = Math.PI / 2 - 0.85; // buried: down-forward into the mark
  if (t < P.coil) {
    // The haul: fist to the chest, blade climbing to vertical.
    const e = smooth(t / P.coil);
    return { r: 0.22 - 0.1 * e, lift: -0.1 - 0.24 * e, pitch: GREAT_GUARD_PITCH + (UP - GREAT_GUARD_PITCH) * e };
  }
  if (t < P.hold) {
    // The poise: the mountain considers. Longest telegraph there is.
    const e = (t - P.coil) / (P.hold - P.coil);
    return { r: 0.12, lift: -0.34 - 0.03 * e, pitch: UP + 0.06 * e };
  }
  if (t < P.drive) {
    // The fall: everything at once, straight through level.
    const e = smooth((t - P.hold) / (P.drive - P.hold));
    return { r: 0.12 + 0.4 * e, lift: -0.37 + 0.55 * e, pitch: UP + 0.06 + (DOWN - UP - 0.06) * e };
  }
  if (t < P.buried) {
    // Buried: the edge in the earth, the weight still pressing.
    const e = (t - P.drive) / (P.buried - P.drive);
    return { r: 0.52 - 0.02 * e, lift: 0.18, pitch: DOWN - 0.04 * e };
  }
  const e = smooth((t - P.buried) / (1 - P.buried));
  return { r: 0.5 - 0.28 * e, lift: 0.18 - 0.18 * e, pitch: DOWN - 0.04 + (GREAT_GUARD_PITCH - DOWN + 0.04) * e };
}

/** The finisher's torso: gather back, poise, tip HARD, press, ease. */
export function greatFinisherLean(t: number): number {
  const P = GREAT_FINISHER_PHASES;
  if (t < P.coil) return -0.1 * smooth(t / P.coil);
  if (t < P.hold) return -0.1;
  if (t < P.drive) return -0.1 + 0.34 * smooth((t - P.hold) / (P.drive - P.hold));
  if (t < P.buried) return 0.24 - 0.04 * ((t - P.drive) / (P.buried - P.drive));
  return 0.2 * (1 - smooth((t - P.buried) / (1 - P.buried)));
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
/** THE PLANE'S HALF-MEASURE: a bow is a plane, not a rod — its limbs
 *  compress at half a rod's depth read (a full rod compression turned
 *  the silhouette into a stick; the half keeps the triangle). */
export const BOW_PLANE_SOFT = 0.5;

export function bowWield(
  f: FacingFrame,
  moveK: number,
  runK: number,
): { dx: number; dy: number; angle: number; fore: number } {
  const { dir, sideW } = f;
  const lift = gaitLift(moveK, runK);
  const beta = 0.72 + 0.1 * lift;
  const p = projectCarry(dir, beta);
  return {
    // THE SILHOUETTE PEEK: at the away diagonals the hang lane's
    // facing weight decays exactly where the torso swallows the bow —
    // an archer read as unarmed from behind. The peek rides the eased
    // side so it mirrors and turns continuously.
    dx: sideW * (0.12 + 0.02 * lift) + f.sideS * BOW_PEEK_S * awayPeekK(f.fy),
    dy: 0.18 - 0.02 * lift,
    angle: Math.PI / 2 - sideW * (Math.PI / 2 - 0.85 + 0.1 * lift),
    fore: 1 - BOW_PLANE_SOFT * (1 - p.fore),
  };
}
