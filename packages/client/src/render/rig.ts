import { CLOTH_COLORS, HAIR_COLORS, PoseState, SKIN_TONES, type Look } from '@arx/shared';
import { ELEMENT_COLORS, enchantDef, itemDef } from '@arx/content';
import { arxMark, markPulse, resolveWornLight, SLOT_GLINT_PHASE, type ArxMark, type SlotLight } from './wornLight.js';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import {
  BOW_GRIP_X,
  bladeStyle,
  bowStyle,
  drawBow,
  drawGreatweapon,
  drawSword,
  drawStaff,
  greatStyle,
  staffStyle,
  wieldClass,
  type BladeFx,
  type StaffFx,
} from './weapons.js';
import { drawTool, toolStyle } from './tools.js';
import {
  drawGolemArm,
  paintGolemBody,
  paintGolemFoot,
  paintGolemHead,
  type GolemLook,
} from './golems.js';
import {
  LegRig,
  chooseLimbSign,
  solveLimb,
  solveLimb2Into,
  solveLimbInto,
  type LegPose,
  type LegRigConfig,
  type LimbSolve,
} from './legs.js';
import {
  ECHO_START,
  FINISHER_PHASES,
  FLOURISH_OFF_PHASE_MS,
  bladeCarriage,
  echoFrame,
  echoTrail,
  finisherLean,
  icepickPath,
  idleFlourish,
  strikeFrame,
  strikeTrail,
  thrustPath,
  type Grip,
  type StrikeFrame,
  type StrikeTrail,
} from './carriage.js';
import { STOW_HANDOFF, sheathePhases, stowBack, stowBlade } from './sheath.js';
import {
  BOW_PLANE_SOFT,
  GREAT_FINISHER_PHASES,
  GREAT_POMMEL_CHOKE_S,
  STAFF_GUARD_CHOKE_S,
  WIELD_GROUND_K,
  armPump,
  awayPeekK,
  bandFlag,
  bowWield,
  easeRestSide,
  facingFrame,
  gaitK,
  lifelineYaw,
  LIFT_ALT_K,
  PEEK_HANG_K,
  projectAim,
  greatFinisherLean,
  greatFinisherPath,
  greatStrikeFrame,
  greatStrikeTrail,
  greatWield,
  projectCarry,
  projectStrike,
  runnerLift,
  settleElbowPole,
  staffStrikeFrame,
  staffStrikeTrail,
  staffWield,
} from './wield.js';
import {
  drawShield,
  drawShieldStraps,
  isShieldKind,
  shieldStyle,
  solveShield,
  type ShieldFrame,
  type ShieldStyle,
} from './shields.js';
import { NPC_HAIR_STYLE, drawHairBack, drawHairFront, type HairCover } from './hair.js';
import { drawBeard } from './beard.js';
import {
  bodyStyle,
  bootStyle,
  drawHelmet,
  drawOffhandOnArm,
  drawPauldron,
  drawQuiver,
  drawTorsoGarment,
  gloveStyle,
  helmStyle,
  legStyle,
  offhandStyle,
  type GloveStyle,
} from './armor.js';

export type { LegPose } from './legs.js';

/**
 * Procedural rigs with genuine two-segment IK legs — the humanoid
 * puppet and the beast bodies both walk on the universal LegRig
 * (legs.ts): feet planted in world space, steps committed when the
 * body drifts, knees solved by two-bone IK. Everything here is the
 * PAINT over that shared skeleton.
 */

const OUTLINE = '#241a2e';
const SKIN = '#e8b98a';
const BOOT = '#4a3324';

/**
 * Gait proportions, all derived from one character height (in tiles) —
 * the same construction as herotown's puppet, ported to tile units.
 */
const HEIGHT = 1.0;
const LEG_LEN = HEIGHT * 0.46; // thigh + shin
const LEG_RISE = LEG_LEN * 0.9; // hip height above ground, near-straight
const HIP_HALF = HEIGHT * 0.1; // half stance width
const LIFT_AMP = HEIGHT * 0.14;
const STRETCH = 1.15; // legs may straighten slightly past 2L — bounding
const RUN_SPEED = 5; // full-tilt reference speed (tiles/sec)

/**
 * The humanoid gait is the herotown construction that finally nailed
 * it, now expressed as a CONFIG of the universal rig: a billboard
 * biped — hips fixed on the screen X axis, feet striding along the
 * travel from those fixed hips, alternating one-at-a-time.
 */
const HUMANOID_LEG_CFG: LegRigConfig = {
  legs: [
    { fwd: 0, side: -HIP_HALF, group: 0 },
    { fwd: 0, side: HIP_HALF, group: 1 },
  ],
  legLen: LEG_LEN,
  rise: LEG_RISE,
  liftAmp: LIFT_AMP,
  runSpeed: RUN_SPEED,
  stretch: STRETCH,
  billboard: true,
  // Bipeds RUN: at full tilt the gait goes airborne between strides.
  flight: true,
};

export class LegSolver extends LegRig {
  constructor() {
    super(HUMANOID_LEG_CFG);
  }
}

/**
 * Knee pole constraint — ANATOMICAL, never kinematic. The knee bends
 * toward the body's FACING (industry rigs parent the pole target to
 * the pelvis), so a backpedaling or strafing character keeps forward
 * knees while the feet stride along the travel — bending knees toward
 * velocity is what drew broken, inverted legs the moment aim and
 * travel disagreed. Side-on, the sagittal term dominates and knees bow
 * with the facing; front/back-on the flexion is edge-on to the camera,
 * so a gentle down-screen + outward preference takes over — one
 * continuous law with no speed blend, so the choice is deterministic
 * from the pose alone. Per-leg hysteresis (`memory`) still smooths the
 * boundary between regimes.
 *
 * `cx, cy` is one unit perpendicular of the hip→foot line (screen);
 * `fx, fy` is the facing unit; returns +1 to use the perpendicular,
 * -1 to use its negation.
 */
export function chooseKneeSign(
  cx: number,
  cy: number,
  fx: number,
  fy: number,
  sideSgn: number,
  memory: number,
): number {
  const frontal = 1 - Math.abs(fx);
  // Sagittal: bow with the facing. Frontal: bow down-screen (toward
  // the camera) with only a whisper of outward — down must DOMINATE
  // front-on, or steep chords let the outward term flip a knee upward.
  const prefX = fx * 0.9 + sideSgn * 0.1 * frontal;
  const prefY = 0.38 * frontal + Math.max(0, fy) * 0.25;
  const m = Math.hypot(prefX, prefY) || 1;
  const score = (cx * prefX + cy * prefY) / m;
  const target = score >= 0 ? 1 : -1;
  // Hysteresis: a weak winner doesn't overturn the standing choice.
  if (memory !== 0 && target !== memory && Math.abs(score) < 0.18) return memory;
  return target;
}

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
  /**
   * 0..1 settle into rest carriage — time since leaving the last
   * non-restful pose. Runs on its own clock so Idle↔Walk transitions
   * never reset it (poseT resets on EVERY pose change, and blending
   * carriage on it made the weapon re-settle at each stop and start).
   */
  restT: number;
  /** Wall-clock ms for micro-motion (full-draw tremble, string buzz). */
  nowMs: number;
  /** Solved feet in screen space (already projected by the caller). */
  feet: Array<{ x: number; y: number; lift: number }>;
  /** Gait bob + hip rise from the solver (tile units). */
  bob: number;
  rise: number;
  /** Fake-3D squash factor from the solver. */
  wScale: number;
  /** Unit travel direction + strength from the solver (arm swing). */
  poleX: number;
  poleY: number;
  poleStrength: number;
  /** Gait blend from the solver: 0 walk mechanics → 1 sprint. */
  runF: number;
  /** Travel·facing alignment: 1 forward, -1 backpedal. */
  align: number;
  /** Per-leg knee-sign hysteresis, owned by the caller's anim state. */
  kneeMemory: number[];
  /**
   * Arm-carriage memory (caller-owned, like kneeMemory): the dual-wield
   * depth flip's hysteresis bit, plus the smoothed rest-side state —
   * when the facing crosses vertical the hands EASE across the body
   * over ~240ms instead of mirror-teleporting (the wrist-snap fix).
   * Absent = stateless fallbacks (single thresholds, instant side).
   */
  depthMemory?: {
    mainBehind: boolean;
    /** Facing-camera depth: the off arm rides in FRONT of the torso. */
    offFront?: boolean;
    side?: number;
    prevSide?: number;
    sideFlipMs?: number;
    /** When the facing first asked for a side flip (dwell debounce). */
    sideWantMs?: number;
    /** Low-passed arm-swing drive (see the SMOOTHED SWING law). */
    sw?: number;
    swMs?: number;
    /**
     * Per-arm elbow-side hysteresis (THE REMEMBERED ELBOW) — the same
     * chooseLimbSign memory the knees carry, so a borderline pole can
     * never snap an elbow through the arm. Lazily seeded by the rig.
     */
    mainElbow?: { sign: number };
    offElbow?: { sign: number };
    /**
     * THE FLIP EARNS ITS HYSTERESIS (arms-v3 Phase 4): per-flag layer
     * band states — every paint-order decision holds its last verdict
     * through the dead zone between its enter/exit thresholds.
     */
    bands?: Record<string, boolean>;
  };
  bodyColor: string;
  hurt: boolean;
  isOwn: boolean;
  weaponItem?: string;
  /** Mainhand enchant id — overlays the enchant's fx on the weapon art. */
  weaponEnch?: string;
  /** Offhand enchant id — a dual-wielded second blade burns its own hue. */
  offhandEnch?: string;
  /**
   * THE WORN LIGHT: enchant ids by armor slot (head/body/legs/gloves/
   * boots/offhand/cape). The rig resolves them into per-slot marks and
   * overlays each onto its piece's style — see withArx.
   */
  armorEnch?: Partial<Record<string, string>>;
  /** Cosmetic idle carry: 'rogue' rakes a blade down-back, reverse grip. */
  carryStyle?: 'normal' | 'rogue';
  /** Off-fist grip — a dual wielder's second blade rides its own way. */
  carryOff?: 'normal' | 'rogue';
  bodyItem?: string;
  /** Equipped head gear — drawn as a real helmet over the skull. */
  headItem?: string;
  /** Equipped leg armor — recolors/overlays the IK leg strokes. */
  legsItem?: string;
  /** Equipped boots — replace the bare foot chip with real footwear. */
  bootsItem?: string;
  /** Equipped gloves — dress the hand mitts and wrists on both arms. */
  glovesItem?: string;
  /** Equipped offhand — shield on the arm, quiver on the back, etc. */
  offhandItem?: string;
  /** A cape is worn — back-mounted gear drops to the hip to clear it. */
  hasCape?: boolean;
  /** Player-chosen base look (skin/hair/beard/cloth palettes). */
  look?: Look;
  /** Overall size multiplier (goblins ~0.8, champions ~1.2). */
  size?: number;
  skinColor?: string;
  /**
   * THE BONE DIALECT: swap every flesh painter for bone — skull for
   * head, ribcage for torso, bare bone strokes for limbs — while the
   * rig, carriage, capes, and helmets keep working untouched.
   */
  skeletal?: SkeletonLook;
  /**
   * THE SCALE DIALECT: swap the flesh head for the kobold's horned
   * muzzle, grow a tail off the hip, and claw the bare feet — while
   * the rig, carriage, and facing bands keep working untouched.
   */
  kobold?: KoboldLook;
  /**
   * THE FUR DIALECT: swap the flesh head for the gnoll's hyena muzzle
   * under tall round ears and a bristled crest, hunch the back, hang a
   * bushy tail off the hip, and paw the bare feet — while the rig,
   * carriage, and facing bands keep working untouched.
   */
  gnoll?: GnollLook;
  /**
   * THE CONSTRUCT DIALECT (docs/golems-plan.md): swap head, torso,
   * limbs, and feet for one of the four golem builds — stacked stone,
   * forged plate, cracked crust, sheared ice — while the rig,
   * carriage, and facing bands keep working untouched. Golems wear no
   * garment and hold no weapon; the body IS the wardrobe.
   */
  golem?: GolemLook;
  /** Time-based swing driver for the gather pose. */
  gatherPhase: number;
  /**
   * Which station a Craft pose is working: picks the choreography
   * (hammer-and-tongs, furnace stoking, fire tending, bench work) and
   * the bespoke props that go with it.
   */
  craftKind?: 'anvil' | 'furnace' | 'fire' | 'workbench' | null;
  /**
   * The Gather target is a forage plant: bare-handed picking — one
   * hand steadies the stems while the other reaches, plucks, and
   * carries the harvest back to the belt pouch. No tool is drawn.
   */
  foraging?: boolean;
  /**
   * Seated rest blend, 0..1, SMOOTHED BY THE CALLER (never poseT — it
   * resets on pose flips and would pop the stand-up). Drops the hips
   * to the ground, plants the hands, and forces knees up-screen; the
   * caller stretches the feet forward and leans the body back to
   * complete the armored wayside sit.
   */
  sitT?: number;
  /** Which seated posture: 0 = lounger (legs out), 1 = one knee up. */
  sitVariant?: 0 | 1;
  /**
   * WHERE the body sits. 'floor' (default) = the wayside sit above.
   * 'chair' = mounted furniture: hips ride at seatH on the seat
   * surface, feet drop square to the floor in front, knees keep the
   * anatomical facing pole, and the hands rest on the thighs.
   * 'throne' = the crown sit — upright spine, fists out to the
   * armrests. Callers pass it with the same smoothed sitT.
   * 'saddle' = the riding seat: hips at the saddle's own height, feet
   * to the caller-placed stirrups, both fists settled on the pommel.
   */
  sitStyle?: 'floor' | 'chair' | 'throne' | 'saddle';
  /** Seat surface height for chair/throne sits, tile units above ground. */
  seatH?: number;
  /**
   * Saddle sits only: the pommel grip in screen space — both hands
   * settle here (the reins are tied to the same knob by the mount
   * painter, on the same ruler, so leather and fists always meet).
   */
  reinX?: number;
  reinY?: number;
  /**
   * Sleeping blend, 0..1 (the lie recline, caller-smoothed): past 0.5
   * the eyes close — soft lid lines instead of the open pattern.
   */
  sleepT?: number;
  /**
   * Sheathe blend, 0..1, SMOOTHED BY THE CALLER (the sitT pattern —
   * never poseT). 0 = weapons in hand; rising, the hand carries the
   * weapon to its stow spot (blades to the belt, bow/staff over the
   * shoulder); past the handoff the weapon rides the BODY and the
   * empty hand walks home. Falling plays the same motion as the draw.
   */
  sheathT?: number;
}

/** Shortest signed rotation from angle `a` to angle `b` (radians). */
function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

/** Duration of one mining swing (windup→heave→strike→pry), ms. */
export const MINE_CYCLE_MS = 880;
/** Duration of one woodcutting chop, ms. */
export const CHOP_CYCLE_MS = 700;
/** Duration of one anvil hammer blow, ms. */
export const ANVIL_CYCLE_MS = 640;
/** Duration of one forage pluck (reach→tug→snap→pouch), ms. */
export const FORAGE_CYCLE_MS = 1050;
/** Duration of one two-hand milking beat (each hand pulls once), ms. */
export const MILK_CYCLE_MS = 640;
/** Duration of one furnace stoking push, ms. */
export const FURNACE_CYCLE_MS = 1700;

/** Arm segment length (upper = fore), in tile units. */
const ARM_LEN = 0.17;

// ---- THE NAMED ANATOMY (arms-v3 Phase 1): the rest-carriage frame's
// load-bearing offsets, named and exported so the simulation tests can
// import the rig's OWN numbers instead of hand-copying them (the
// silent-desync copy the audit caught in armSolver.test.ts). All in
// units of s. NOTE: REST_HANG_DROP_S coincidentally equals ARM_LEN —
// they are different quantities; do not merge them.
/** The arm ring's height below the hip line (armY = hipY − this·s). */
export const ARM_RING_DROP_S = 0.26;
/** A relaxed fist's hang below the arm ring (main hand + bare hands). */
export const REST_HANG_DROP_S = 0.17;
/** The off blade's hang below the arm ring — a touch higher than the
 *  main: the trailing blade of a paired stance, never a mirror image. */
export const OFF_BLADE_HANG_DROP_S = 0.15;
/** Shoulder half-width (the torso trapezoid's top, before dialects). */
export const SHOULDER_HALF_S = 0.185;
/** Waist half-width (the trapezoid's bottom — the hang-width lane). */
export const WAIST_HALF_S = 0.125;
/** A settled shoulder's anatomical anchor along the shoulder bar. */
export const SHOULDER_SETTLE_K = 0.85;
/**
 * THE TURNED BAR (the turned silhouette's second channel): how much of
 * the settle spread survives the heading. Face-on the bar is a full
 * billboard bar; side-on the two shoulders stand nearly in line with
 * the camera axis, so their SCREEN spread must collapse toward the
 * body's centerline — the legs already narrow their stance 30% side-on
 * (legs.ts homes), and an upper body that keeps full spread over a
 * turned stance is exactly the "front-facing card with a turned head"
 * read. fx² keeps the falloff smooth through the diagonals. The floor
 * is 0.5, NEVER 0: the historic 3D-bar projection collapsed caps onto
 * the spine while the arms kept their spread (THE PROJECTION NEVER
 * OWNS THE BILLBOARD) — arms and sockets BOTH consume this one
 * function, so they collapse together or not at all (ONE SPREAD LAW).
 */
export function shoulderTuckK(fx: number): number {
  return 1 - 0.5 * fx * fx;
}
/**
 * THE TURNED BAR's fore-aft stagger (units of tw, signed along the
 * facing): side-on, the leading arm hangs a half-step ahead of the
 * chest line and the trailing arm behind it — the same stagger the
 * feet already take (legs.ts `stag`). Zero face-on; grows with the
 * profile so the diagonals inherit a taste of it.
 */
export function shoulderStagK(fx: number): number {
  return fx * Math.abs(fx);
}
/**
 * THE PERSPECTIVE SHEET (dev-only): when `on`, drawHumanoid records
 * the solved shoulder geometry of the last figure drawn so a lab can
 * overlay red/green calibration lines — the solved bar, the settle
 * anchors, the pauldron sockets and the honest 3D projection of the
 * shoulder bar — over the art. The labs flip it on (`?dbg=1`); the
 * game never does. Zero cost off: one boolean check per draw.
 */
export const RIG_DEBUG = {
  on: false,
  x: 0,
  hipY: 0,
  shoulderY: 0,
  s: 0,
  tw: 0,
  wS: 0,
  dir: 0,
  mainShX: 0,
  mainShY: 0,
  offShX: 0,
  offShY: 0,
  anchorMainX: 0,
  anchorOffX: 0,
  sockets: [] as Array<{ x: number; y: number; depthK: number }>,
};
/** The hang-width lane's flare off the waist line (hangW's ww term). */
export const HANG_WAIST_K = 1.08;
/** shoulderY sits this far below the shoulder line's top (units of s). */
export const SHOULDER_Y_DROP_S = 0.06;
/** Hip line → shoulder line rise before the crouch/squash factors. */
export const TORSO_RISE_S = 0.46;

/**
 * THE TWO PROFILE READS (arms-v3 Phase 1: named, single-sourced).
 * The RIG's facing weight is the honest cosine — `profileK = |fx|` —
 * and every arm/carry/depth law rides that. The FACE painters use this
 * snugger read instead: |fx| boosted 15% and clamped, so the head
 * commits to its profile band a beat before the body does (eyes and
 * muzzles read wrong mid-turn if the face lags the turn). Thirteen
 * mob-head painters each re-derived this inline before it was named —
 * one drifted constant away from thirteen different face laws.
 */
export function faceProfileK(fx: number): number {
  return Math.min(1, Math.abs(fx) * 1.15);
}

/** Shared per-frame IK scratches (see solveLimbInto's contract). */
const ARM_SOLVE: LimbSolve = { ex: 0, ey: 0, kx: 0, ky: 0 };
/** Per-draw knee scratch (hot path, no alloc): the leg loop records
 * each solved knee so the seated arm vocabulary can drape a forearm
 * over the raised kneecap it actually drew. d = hip→foot span; the
 * SMALLER span is the more bent — the raised — knee. */
const KNEE_SCRATCH = [
  { x: 0, y: 0, d: 0 },
  { x: 0, y: 0, d: 0 },
];
/** Per-draw leg-frame scratch (hot path, no alloc): the solve loop
 * records each leg's hip and clamped foot so the deferred leg PAINT
 * layer (THE FAR SIDE GOES BEHIND THE LEGS) redraws without
 * re-solving. Knee lives in KNEE_SCRATCH. */
const LEG_POSE_SCRATCH = [
  { hipX: 0, footX: 0, footY: 0 },
  { hipX: 0, footX: 0, footY: 0 },
];
const LEG_SOLVE: LimbSolve = { ex: 0, ey: 0, kx: 0, ky: 0 };
/** Hoisted per-foot paint tables — loop literals in the leg painter
 *  alloc once per LEG per frame otherwise. */
const CLAW_TOES = [-0.55, 0, 0.55] as const;
const BEARPAW_RAKE = [-1, 0, 1] as const;

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
export function solveArm(
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  L: number,
  prefX: number,
  prefY: number,
): { ex: number; ey: number; kx: number; ky: number } {
  // Arms may straighten just a touch past full extension.
  return solveLimb(sx, sy, hx, hy, L, 1.08, prefX, prefY);
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  prefX: number,
  prefY: number,
  sleeve: string,
  skin: string,
  s: number,
  /** Full-sleeve cloth: forearm wears this color with a belled cuff. */
  cuff?: string,
  /** Equipped gloves — mitt recolor, wrist cuff, bracer, knuckle gear. */
  glove?: GloveStyle | null,
  hurt?: boolean,
  /** Bare bone: humerus + forearm as thin bone strokes with condyle
   *  knobs at the joints and a skeletal claw for a hand. Overrides
   *  every cloth/glove branch — the dead wear nothing on their arms. */
  bone?: SkeletonLook | null,
  /** Caller-owned elbow-side memory (THE REMEMBERED ELBOW). */
  elbow?: { sign: number },
  /** THE CROSSING LOCKS THE ELBOW: while the rest side eases across
   *  the body the flare pole collapses through zero, and the leftover
   *  gravity term scores pure chord noise — noise that COMMITS inboard
   *  sides mid-crossing (the wiggle-walk inversion). A held elbow
   *  keeps its standing side outright through the ease and flips
   *  exactly once, when the settled pole reclaims it. */
  elbowHold?: boolean,
  /** Wall-clock ms — the knuckle channel's breath (THE WORN LIGHT). */
  nowMs?: number,
  /** Fur dialect: heavy furred arms ending in broad clawed paws —
   *  overrides the cloth/glove branches the way bone does; a gnoll
   *  never owned a sleeve. */
  gno?: GnollLook | null,
  /** Construct dialect: stone, plate, crust, or ice — the whole limb
   *  machine swaps per build (golems.ts). Overrides everything the
   *  way bone does; a golem's arm IS its armor. */
  gol?: GolemLook | null,
): { ex: number; ey: number; kx: number; ky: number } {
  // THE REMEMBERED ELBOW: the arms carry the same side-choice
  // hysteresis the knees have had since the quadruped rig — score the
  // chord perpendicular against the anatomical pole and let a
  // borderline score NEVER overturn the standing choice. The frames
  // that used to invert an elbow are exactly the near-degenerate ones
  // (a pole almost parallel to the chord: the N/S run before the pole
  // fix, the 240ms side-flip ease where the flare sweeps through
  // zero); with memory they hold the last committed side, and the
  // elbow flips only when the pole genuinely claims the other side.
  // The clamp inside the solve scales the chord uniformly, so this
  // perpendicular is the solve's own.
  if (elbow) {
    const ddx = hx - sx;
    const ddy = hy - sy;
    const dd = Math.hypot(ddx, ddy) || 1e-4;
    const cxn = -ddy / dd;
    const cyn = ddx / dd;
    const sgn =
      elbowHold && elbow.sign !== 0
        ? elbow.sign
        : chooseLimbSign(cxn, cyn, prefX, prefY, elbow.sign);
    elbow.sign = sgn;
    prefX = cxn * sgn;
    prefY = cyn * sgn;
  }
  // Hot path: every visible humanoid solves two arms a frame — reuse
  // one scratch (destructured immediately) instead of allocating.
  const { ex, ey, kx, ky } = solveLimbInto(ARM_SOLVE, sx, sy, hx, hy, ARM_LEN * s, 1.08, prefX, prefY);

  if (gol) {
    drawGolemArm(ctx, gol, sx, sy, kx, ky, ex, ey, s, hurt ?? false, nowMs ?? 0);
    return { ex, ey, kx, ky };
  }

  if (bone) {
    const hv = bone.heavy;
    const bcol = hurt ? '#ffffff' : bone.bone;
    ctx.lineCap = 'round';
    // Humerus: one clean bone shaft, thinner than any sleeved arm.
    ctx.strokeStyle = hurt ? '#ffffff' : shade(bone.bone, -3);
    ctx.lineWidth = Math.max(2, s * 0.06 * hv);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    // Forearm: slightly slighter still — the taper of real bone.
    ctx.strokeStyle = bcol;
    ctx.lineWidth = Math.max(2, s * 0.048 * hv);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Elbow condyle: the joint knob wider than either shaft — the
    // single mark that makes a stroked limb read as articulated bone.
    ctx.fillStyle = bcol;
    ctx.beginPath();
    ctx.arc(kx, ky, Math.max(1.6, s * 0.038 * hv), 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(bone.bone, -22);
      ctx.fillRect(kx - s * 0.026 * hv, ky - s * 0.007, s * 0.052 * hv, s * 0.014);
    }
    // Skeletal claw: the tapered hand mold in bone, split by dark
    // finger seams so it reads as fleshless phalanges, not a mitt.
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(ey - ky, ex - kx));
    drawTaperedHand(ctx, bcol, s * 0.92);
    if (!hurt) {
      ctx.strokeStyle = shade(bone.bone, -30);
      ctx.lineWidth = Math.max(1, 0.014 * s);
      for (const oy of [-0.02, 0.02]) {
        ctx.beginPath();
        ctx.moveTo(0.024 * s, oy * 2.2 * s);
        ctx.lineTo(0.076 * s, oy * 1.4 * s);
        ctx.stroke();
      }
      // Wrist knob seats the claw on the forearm.
      ctx.fillStyle = shade(bone.bone, -10);
      ctx.beginPath();
      ctx.arc(-0.05 * s, 0, Math.max(1.2, s * 0.024 * hv), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return { ex, ey, kx, ky };
  }

  if (gno) {
    // THE FUR DIALECT arm: seven feet of scavenger swings from HEAVY
    // shoulders — a thick furred upper arm tapering through a leaner
    // forearm into a broad paw. The taper is the anatomy argument:
    // mass lives up top, exactly where the hunched species carries it.
    const hv = gno.heavy;
    const furC = hurt ? '#ffffff' : shade(gno.fur, -2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = furC;
    ctx.lineWidth = Math.max(2, s * 0.108 * (0.9 + 0.2 * hv));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.strokeStyle = hurt ? '#ffffff' : shade(gno.fur, -10);
    ctx.lineWidth = Math.max(2, s * 0.08 * (0.92 + 0.16 * hv));
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (!hurt) {
      // The elbow tuft: two ragged fur wedges off the OUTSIDE of the
      // joint — the side the elbow actually bent toward — so every
      // silhouette edge on this body breaks like coat, never tube.
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      let tx = kx - mx;
      let ty = ky - my;
      const tl = Math.hypot(tx, ty);
      if (tl > s * 0.008) {
        tx /= tl;
        ty /= tl;
        ctx.fillStyle = shade(gno.fur, -6);
        for (const [along, sizeK] of [[-0.2, 1], [0.24, 0.75]] as const) {
          const bx = kx + (ex - kx) * along * 0.3;
          const by = ky + (ey - ky) * along * 0.3;
          const tuft = s * 0.05 * sizeK * (0.9 + 0.2 * hv);
          ctx.beginPath();
          ctx.moveTo(bx - ty * tuft * 0.5, by + tx * tuft * 0.5);
          ctx.lineTo(bx + tx * tuft * 1.5, by + ty * tuft * 1.5);
          ctx.lineTo(bx + ty * tuft * 0.5, by - tx * tuft * 0.5);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    // The paw: a broad hide-backed mitt wider than the forearm, split
    // by knuckle seams, with dark claws raking past the fingers — the
    // hand of a thing that digs through carcasses. Local +x runs down
    // the fingers, exactly like the glove frame.
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(ey - ky, ex - kx));
    const pawW = s * 0.082 * (0.92 + 0.16 * hv);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gno.skin, -4);
    ctx.beginPath();
    chamferRect(ctx, -0.05 * s, -pawW, 0.152 * s, pawW * 2, 0.032 * s);
    ctx.fill();
    if (!hurt) {
      // Fur cuff lapping the wrist: coat flows INTO the paw.
      ctx.fillStyle = shade(gno.fur, -10);
      ctx.beginPath();
      chamferRect(ctx, -0.062 * s, -pawW * 1.06, 0.05 * s, pawW * 2.12, 0.018 * s);
      ctx.fill();
      // Knuckle seams: two dark ticks splitting the mitt into fingers.
      ctx.strokeStyle = shade(gno.skin, -26);
      ctx.lineWidth = Math.max(1, 0.013 * s);
      for (const oy of [-0.34, 0.34]) {
        ctx.beginPath();
        ctx.moveTo(0.04 * s, oy * pawW);
        ctx.lineTo(0.092 * s, oy * pawW * 0.8);
        ctx.stroke();
      }
      // The claws: three dark hooks past the leading edge.
      ctx.fillStyle = shade(gno.mask, -12);
      for (const oy of [-0.62, 0, 0.62]) {
        ctx.beginPath();
        ctx.moveTo(0.088 * s, oy * pawW - 0.016 * s);
        ctx.lineTo(0.148 * s, oy * pawW + 0.008 * s);
        ctx.lineTo(0.088 * s, oy * pawW + 0.02 * s);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    return { ex, ey, kx, ky };
  }

  ctx.lineCap = 'round';
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = Math.max(2, s * 0.085);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  if (cuff) {
    // Robed arms: cloth all the way down, WIDENING toward the wrist —
    // the belled sleeve that makes every gesture read as wizardry.
    ctx.strokeStyle = cuff;
    ctx.lineWidth = Math.max(2, s * 0.075);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const ang = Math.atan2(ey - ky, ex - kx);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(ang);
    // The bell flares WIDER than the hand and its mouth hangs just past
    // the wrist, so the mitt sits inside the sleeve instead of over it.
    ctx.fillStyle = cuff;
    ctx.beginPath();
    ctx.moveTo(-0.16 * s, -0.045 * s);
    ctx.lineTo(0.035 * s, -0.098 * s);
    ctx.lineTo(0.055 * s, 0);
    ctx.lineTo(0.035 * s, 0.098 * s);
    ctx.lineTo(-0.16 * s, 0.045 * s);
    ctx.closePath();
    ctx.fill();
    // The mouth's inner shadow — the sleeve is OPEN, a tube not a mitt.
    ctx.fillStyle = 'rgba(24, 15, 26, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0.035 * s, -0.085 * s);
    ctx.quadraticCurveTo(0.06 * s, 0, 0.035 * s, 0.085 * s);
    ctx.quadraticCurveTo(0.01 * s, 0, 0.035 * s, -0.085 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (glove) {
    // Gloved forearm: armor from ELBOW to wrist — no skin ever shows.
    // A touch wider than the bare arm so the layer reads as WORN, and
    // round-capped so the elbow end tucks under the sleeve stroke.
    ctx.strokeStyle = hurt ? '#ffffff' : (glove.bracer ?? shade(glove.color, -8));
    ctx.lineWidth = Math.max(2, s * 0.076);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // The cuff is the SEAM piece: it sits at the top of the forearm
    // where glove meets sleeve, so the armor flows up the arm as one
    // unit instead of stopping at a naked elbow. Local +x = wrist-ward.
    const cf = glove.cuff;
    if (cf && !hurt) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(Math.atan2(ey - ky, ex - kx));
      ctx.fillStyle = cf.color;
      switch (cf.kind) {
        case 'band':
          // A buckled strap closing the glove below the elbow.
          ctx.fillRect(0.012 * s, -0.052 * s, 0.042 * s, 0.104 * s);
          break;
        case 'roll':
          // Folded-over top — quilted cloth or doubled leather.
          ctx.beginPath();
          chamferRect(ctx, -0.008 * s, -0.058 * s, 0.056 * s, 0.116 * s, 0.02 * s);
          ctx.fill();
          break;
        case 'flare': {
          // The vambrace mouth: a forged bell opening up the arm to
          // swallow the sleeve, bright-rimmed like the pauldron steel.
          ctx.beginPath();
          ctx.moveTo(0.075 * s, -0.048 * s);
          ctx.lineTo(-0.018 * s, -0.078 * s);
          ctx.lineTo(-0.018 * s, 0.078 * s);
          ctx.lineTo(0.075 * s, 0.048 * s);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(cf.color, 24);
          ctx.fillRect(-0.018 * s, -0.078 * s, 0.016 * s, 0.156 * s);
          // Mouth shadow under the rim — the sleeve disappears INTO it.
          ctx.fillStyle = 'rgba(24, 15, 26, 0.35)';
          ctx.fillRect(-0.002 * s, -0.066 * s, 0.012 * s, 0.132 * s);
          break;
        }
        case 'fur':
          // A pelt roll ringing the elbow — winter kit reads from afar.
          for (const oy of [-0.048, 0, 0.048]) {
            ctx.beginPath();
            ctx.arc((0.02 + (oy === 0 ? -0.012 : 0)) * s, oy * s, Math.max(1.6, 0.042 * s), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
      }
      ctx.restore();
    }
  } else {
    // Bare forearm — short-sleeved adventurers.
    ctx.strokeStyle = skin;
    ctx.lineWidth = Math.max(2, s * 0.062);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Hand: aligned with the forearm — blocky, not a ball. Gloves own
  // this frame: local +x runs down the fingers, the wrist heel sits at
  // −x, so end caps square the fist and talons rake past it no matter
  // where the IK put the hand.
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(Math.atan2(ey - ky, ex - kx));
  if (!glove || hurt) {
    ctx.fillStyle = glove ? '#ffffff' : skin;
    ctx.beginPath();
    chamferRect(ctx, -0.055 * s, -0.06 * s, 0.13 * s, 0.12 * s, 0.03 * s);
    ctx.fill();
  } else {
    // The hand silhouette IS the glove's first read — four molds, so a
    // knight's fist and a conjurer's fingers never share an outline.
    const base = glove.color;
    switch (glove.hand ?? 'glove') {
      case 'gauntlet':
        // Squared plated fist: broad box, hard-lit end cap, one dark
        // lame seam — a fist you could knight someone with.
        ctx.fillStyle = base;
        ctx.beginPath();
        chamferRect(ctx, -0.058 * s, -0.068 * s, 0.148 * s, 0.136 * s, 0.014 * s);
        ctx.fill();
        ctx.fillStyle = shade(base, 20);
        ctx.fillRect(0.052 * s, -0.06 * s, 0.034 * s, 0.12 * s);
        ctx.fillStyle = shade(base, -24);
        ctx.fillRect(0.016 * s, -0.06 * s, 0.013 * s, 0.12 * s);
        break;
      case 'paw':
        // The beast mitt: rounder, bulkier, split at the toes.
        ctx.fillStyle = base;
        ctx.beginPath();
        chamferRect(ctx, -0.055 * s, -0.07 * s, 0.148 * s, 0.14 * s, 0.045 * s);
        ctx.fill();
        ctx.strokeStyle = shade(base, -22);
        ctx.lineWidth = Math.max(1, 0.015 * s);
        for (const oy of [-0.024, 0.024]) {
          ctx.beginPath();
          ctx.moveTo(0.088 * s, oy * s);
          ctx.lineTo(0.052 * s, oy * 0.75 * s);
          ctx.stroke();
        }
        break;
      case 'wrap':
        // Wound cloth: the tapered hand crossed by binding strips.
        drawTaperedHand(ctx, base, s);
        ctx.strokeStyle = shade(base, 16);
        ctx.lineWidth = Math.max(1, 0.018 * s);
        for (const ox of [-0.026, 0.014]) {
          ctx.beginPath();
          ctx.moveTo((ox - 0.022) * s, -0.058 * s);
          ctx.lineTo((ox + 0.022) * s, 0.058 * s);
          ctx.stroke();
        }
        break;
      default:
        // Fitted glove: tapers toward squared fingers with a seam, so
        // it reads as a HAND in leather, never a mitten.
        drawTaperedHand(ctx, base, s);
        ctx.strokeStyle = shade(base, -22);
        ctx.lineWidth = Math.max(1, 0.015 * s);
        ctx.beginPath();
        ctx.moveTo(0.044 * s, -0.042 * s);
        ctx.lineTo(0.044 * s, 0.042 * s);
        ctx.stroke();
        break;
    }
    // Fingerless cut: bare fingertips past a knuckle strap.
    if (glove.fingerless) {
      ctx.fillStyle = skin;
      ctx.fillRect(0.044 * s, -0.04 * s, 0.04 * s, 0.08 * s);
      ctx.fillStyle = shade(base, -18);
      ctx.fillRect(0.028 * s, -0.052 * s, 0.017 * s, 0.104 * s);
    }
    const kn = glove.knuckle;
    if (kn) {
      switch (kn.kind) {
        case 'studs': {
          // Riveted knuckle studs, each catching the light.
          const r = Math.max(1.3, 0.022 * s);
          for (const oy of [-0.036, 0.036]) {
            ctx.fillStyle = kn.color;
            ctx.beginPath();
            ctx.arc(0.028 * s, oy * s, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shade(kn.color, 42);
            ctx.beginPath();
            ctx.arc(0.028 * s - r * 0.32, oy * s - r * 0.32, r * 0.38, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'spikes': {
          // Forged punch spikes: riveted to a knuckle bar, each with a
          // dark under-facet and a sun-caught top facet — smithed
          // steel, not paper triangles.
          ctx.fillStyle = shade(glove.color, -20);
          ctx.fillRect(0.042 * s, -0.066 * s, 0.026 * s, 0.132 * s);
          for (const oy of [-0.038, 0.038]) {
            ctx.fillStyle = shade(kn.color, -16);
            ctx.beginPath();
            ctx.moveTo(0.06 * s, (oy - 0.032) * s);
            ctx.lineTo(0.168 * s, oy * s);
            ctx.lineTo(0.06 * s, (oy + 0.032) * s);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade(kn.color, 24);
            ctx.beginPath();
            ctx.moveTo(0.06 * s, (oy - 0.032) * s);
            ctx.lineTo(0.168 * s, oy * s);
            ctx.lineTo(0.06 * s, oy * s);
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
        case 'claws': {
          // Curved talons off the paw: thick at the root, hooked belly,
          // needle tips — the middle claw reaches furthest.
          for (const [i, oy] of [-0.048, 0, 0.048].entries()) {
            const len = i === 1 ? 0.13 : 0.105;
            ctx.fillStyle = kn.color;
            ctx.beginPath();
            ctx.moveTo(0.055 * s, (oy - 0.026) * s);
            ctx.quadraticCurveTo(
              (0.07 + len * 0.6) * s, (oy - 0.034) * s,
              (0.062 + len) * s, (oy + 0.012) * s,
            );
            ctx.quadraticCurveTo(
              (0.065 + len * 0.4) * s, (oy + 0.014) * s,
              0.055 * s, (oy + 0.026) * s,
            );
            ctx.closePath();
            ctx.fill();
            // Root shadow seats each talon IN the paw.
            ctx.fillStyle = shade(kn.color, -28);
            ctx.fillRect(0.05 * s, (oy - 0.02) * s, 0.014 * s, 0.04 * s);
          }
          break;
        }
        case 'plate': {
          // A beveled plate over the back of the hand: lit crown facet
          // over the base plate, pinned by two rivets.
          ctx.fillStyle = kn.color;
          ctx.beginPath();
          chamferRect(ctx, -0.042 * s, -0.054 * s, 0.074 * s, 0.108 * s, 0.016 * s);
          ctx.fill();
          ctx.fillStyle = shade(kn.color, 22);
          ctx.beginPath();
          chamferRect(ctx, -0.042 * s, -0.054 * s, 0.036 * s, 0.108 * s, 0.016 * s);
          ctx.fill();
          ctx.fillStyle = shade(kn.color, -30);
          const rr = Math.max(0.9, 0.011 * s);
          for (const oy of [-0.033, 0.033]) {
            ctx.beginPath();
            ctx.arc(0.016 * s, oy * s, rr, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'gem': {
          // A set jewel: dark bezel, stone, one hard glint.
          const r = Math.max(1.4, 0.027 * s);
          ctx.fillStyle = shade(glove.color, -26);
          ctx.beginPath();
          ctx.arc(-0.002 * s, 0, r * 1.32, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = kn.color;
          ctx.beginPath();
          ctx.arc(-0.002 * s, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(kn.color, 45);
          ctx.beginPath();
          ctx.arc(-0.002 * s - r * 0.3, -r * 0.3, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
    // THE KNUCKLES — the gloves' channel. Three ticks across the back
    // of the fist plus a bright bar over the first joint, drawn in the
    // rotated hand frame so the light rides the fist wherever it swings
    // and rakes across the screen during a strike. This is the one worn
    // channel whose whole job is to be seen IN MOTION, which is why it
    // lives on the hand and not on the forearm.
    if (glove.arx && !hurt) {
      const mark = glove.arx;
      const a = markPulse(mark, nowMs ?? 0, SLOT_GLINT_PHASE.gloves ?? 0, 1.35);
      if (a > 0.02) {
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = mark.mid;
        for (const oy of [-0.038, 0, 0.038]) {
          ctx.fillRect(0.03 * s, oy * s - 0.008 * s, 0.03 * s, 0.016 * s);
        }
        ctx.globalAlpha = Math.min(1, a * 1.15);
        ctx.fillStyle = mark.core;
        ctx.fillRect(0.056 * s, -0.05 * s, 0.012 * s, 0.1 * s);
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
  // The solved joints, so gear (shields, tomes) can strap to the bone.
  return { ex, ey, kx, ky };
}

/**
 * The fitted-glove hand mold: tapering toward squared fingertips.
 * Shared by the 'glove' and 'wrap' hand kinds; drawn in the rotated
 * hand frame (+x = fingers).
 */
function drawTaperedHand(ctx: CanvasRenderingContext2D, color: string, s: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-0.055 * s, -0.06 * s);
  ctx.lineTo(0.048 * s, -0.052 * s);
  ctx.lineTo(0.084 * s, -0.034 * s);
  ctx.lineTo(0.084 * s, 0.034 * s);
  ctx.lineTo(0.048 * s, 0.052 * s);
  ctx.lineTo(-0.055 * s, 0.06 * s);
  ctx.closePath();
  ctx.fill();
}

/* ========================== THE BONE DIALECT ==========================
 * Skeletons are NOT reskinned villagers. When RigPose.skeletal is set,
 * the flesh painters swap out — skull for the head block, ribcage for
 * the torso garment, bare bone strokes with condyle knobs for every
 * limb — while the IK rig, the weapon carriage, capes, helmets, and
 * all eight facing bands keep working untouched. Each variant is its
 * own DESIGN, never a scale-up: the warrior's plain grave-iron frame,
 * the archer's bleached gracile build with frost-lit sockets, the
 * guard's stained heavy bones under a rusted helm, and the champion's
 * crowned, cracked, ember-eyed bulk.
 */
export interface SkeletonLook {
  /** Base bone tone — each variant aged differently in the ground. */
  bone: string;
  /** The dark of the rib cavity behind the rib bars — the depth read. */
  cavity: string;
  /** Light living in the sockets; undefined = the hollow dark stare. */
  glow?: string;
  /** Royalty among the dead wears its crown into battle. */
  crown?: { band: string; gem: string };
  /** Bone thickness multiplier: gracile archer 0.92 → champion 1.3. */
  heavy: number;
  /** Old battle damage: a skull crack down the trailing brow. */
  cracked: boolean;
}

export const SKELETON_LOOKS: Record<string, SkeletonLook> = {
  // The rank-and-file: parchment bone, hollow stare, grave iron.
  skeleton: { bone: '#d6cfba', cavity: '#2a2133', heavy: 1, cracked: false },
  // The archer: bleached lighter, built lighter, a cold frost light
  // behind the eyes — the crypt's patient marksman.
  skeleton_archer: {
    bone: '#dfd9c9',
    cavity: '#2a2133',
    glow: '#9fd8e8',
    heavy: 0.92,
    cracked: false,
  },
  // The guard: iron-stained heavy bone, cracked from old sieges — the
  // door that still stands its post.
  skeleton_guard: { bone: '#c6bda4', cavity: '#292031', heavy: 1.14, cracked: true },
  // The chanter: violet-washed bone, a pale arcane light standing in
  // the sockets — the crypt's one throat that still remembers words.
  skeleton_chanter: {
    bone: '#d6cfdf',
    cavity: '#2a2138',
    glow: '#b49af0',
    heavy: 1.0,
    cracked: false,
  },
  // The champion: aged ivory mass, ember-lit sockets, a gold crown —
  // whoever he was, the grave promoted him.
  skeleton_champion: {
    bone: '#e6ddc4',
    cavity: '#2d1f2e',
    glow: '#ff9a3d',
    crown: { band: '#d4a43c', gem: '#3fa8a0' },
    heavy: 1.3,
    cracked: true,
  },
};

/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export function skeletonLook(defId: string): SkeletonLook {
  return SKELETON_LOOKS[defId] ?? SKELETON_LOOKS['skeleton']!;
}

export interface SkullFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  headR: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 jaw drop — the combat bite; 0 keeps the jaw seated. */
  gape: number;
}

/**
 * The skull, drawn in the head block's own frame so helmets still fit.
 * Reads skull by SILHOUETTE first: a broad cranium dome stepping in to
 * a narrower maxilla and a separate mandible — then the band-aware
 * face: sockets that slide with the facing and vanish around the
 * corner, a nasal wedge, a tooth row, suture lines on the back band.
 */
export function paintSkull(
  ctx: CanvasRenderingContext2D,
  sk: SkeletonLook,
  f: SkullFrame,
): void {
  const { headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = f;
  const bone = hurt ? '#ffffff' : sk.bone;
  const dark = '#241a2e';
  const back = backK > 0.55;
  const jawDrop = f.gape * hh * 0.24;

  // --- cranium: the dome, slightly taller than the flesh block was,
  // ending high so the cheek step-in below can read.
  const crTop = headY - hh * 1.06;
  const crBot = headY + hh * 0.32;
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.15, cut * 1.15, cut * 0.4, cut * 0.4]);
  ctx.fill();

  // --- maxilla: the upper jaw, stepped in from the dome. From behind
  // the step is hidden — the nape runs long instead.
  const mxHw = hw * (back ? 0.8 : 0.72);
  const mxX = headX + fx * hw * 0.08;
  const mxTop = crBot - hh * 0.06;
  const mxBot = headY + hh * (back ? 0.78 : 0.66);
  ctx.beginPath();
  chamferRect(ctx, mxX - mxHw, mxTop, mxHw * 2, mxBot - mxTop, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();

  // --- mandible: its own piece, narrower again, dropping with the
  // gape. Hidden from straight behind (the skull owns that view).
  const mdHw = hw * 0.58;
  const mdTop = headY + hh * 0.6 + jawDrop;
  const mdBot = headY + hh * 1.0 + jawDrop;
  if (!back) {
    // The open mouth: a dark gap behind the dropped jaw.
    if (jawDrop > hh * 0.02) {
      ctx.fillStyle = hurt ? dark : shade(sk.cavity, -6);
      ctx.beginPath();
      chamferRect(ctx, mxX - mdHw * 0.94, mxBot - hh * 0.08, mdHw * 1.88, mdTop - mxBot + hh * 0.14, cut * 0.3);
      ctx.fill();
      ctx.fillStyle = bone;
    }
    ctx.beginPath();
    chamferRect(ctx, mxX - mdHw, mdTop, mdHw * 2, mdBot - mdTop, [0, 0, cut * 0.55, cut * 0.55]);
    ctx.fill();
  }

  if (!hurt) {
    // THE FORM SPLIT, restated for bone: hard shade on the screen-right
    // half, a lit crown band, a temple under-shade rounding the dome.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.15, cut * 1.15, cut * 0.4, cut * 0.4]);
    ctx.clip();
    ctx.fillStyle = shade(sk.bone, -9);
    ctx.fillRect(headX, crTop, hw, crBot - crTop);
    ctx.fillStyle = shade(sk.bone, -16);
    ctx.fillRect(headX - hw, crBot - hh * 0.14, hw * 2, hh * 0.14);
    ctx.fillStyle = shade(sk.bone, 9);
    ctx.fillRect(headX - hw, crTop, hw * 2, hh * 0.18);
    ctx.restore();
    // Maxilla sits recessed; the mandible breaks clearly darker — the
    // jaw must read as its OWN bone, not a chin band.
    if (!back) {
      ctx.fillStyle = shade(sk.bone, -8);
      ctx.beginPath();
      chamferRect(ctx, mxX, mxTop, mxHw, mxBot - mxTop, [0, 0, cut * 0.5, 0]);
      ctx.fill();
      ctx.fillStyle = shade(sk.bone, -12);
      ctx.beginPath();
      chamferRect(ctx, mxX - mdHw, mdTop, mdHw * 2, mdBot - mdTop, [0, 0, cut * 0.55, cut * 0.55]);
      ctx.fill();
      ctx.fillStyle = shade(sk.bone, -20);
      ctx.beginPath();
      chamferRect(ctx, mxX, mdTop, mdHw, mdBot - mdTop, [0, 0, cut * 0.55, 0]);
      ctx.fill();
      // The jaw seam: a hard shadow line where mandible meets maxilla.
      ctx.fillStyle = shade(sk.bone, -30);
      ctx.fillRect(mxX - mdHw * 0.92, mdTop - hh * 0.015, mdHw * 1.84, hh * 0.03);
    }
  }

  if (back) {
    // The back of the skull: no face — the suture cross and the
    // occipital shelf are what make the turned head a SKULL still.
    if (!hurt) {
      ctx.strokeStyle = shade(sk.bone, -18);
      ctx.lineWidth = Math.max(1, headR * 0.05);
      ctx.beginPath();
      ctx.moveTo(headX, crTop + hh * 0.22);
      ctx.lineTo(headX, headY + hh * 0.3);
      ctx.moveTo(headX - hw * 0.72, headY - hh * 0.34);
      ctx.lineTo(headX + hw * 0.72, headY - hh * 0.34);
      ctx.stroke();
      ctx.fillStyle = shade(sk.bone, -14);
      ctx.beginPath();
      chamferRect(ctx, mxX - mxHw * 0.9, mxBot - hh * 0.16, mxHw * 1.8, hh * 0.16, [0, 0, cut * 0.5, cut * 0.5]);
      ctx.fill();
    }
  } else {
    // --- the face bands: sockets, nasal wedge, teeth — all sliding
    // with the facing, the far side narrowing through three-quarter
    // and slipping around the corner at profile.
    const pairX = headX + fx * headR * 0.4;
    const sep = headR * (0.44 - 0.18 * profileK);
    const sockY = headY - hh * 0.08;
    const sockW = headR * 0.34;
    const sockH = headR * 0.36;
    const sideK = (es: number): number =>
      es !== lead ? Math.max(0, 1 - Math.max(0, (profileK - 0.5) / 0.28)) : 1;
    // Brow shelf: one heavy shade bar over both sockets — the scowl
    // every skull wears.
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -26);
      const bw = (sep + sockW * 1.05) * 2 * (1 - 0.2 * profileK);
      ctx.beginPath();
      chamferRect(ctx, pairX - bw / 2, sockY - sockH * 0.86, bw, headR * 0.16, headR * 0.05);
      ctx.fill();
    }
    for (const es of [-1, 1]) {
      const wK = sideK(es);
      if (wK <= 0.02) continue;
      const w = sockW * wK;
      const cx = pairX + es * sep;
      ctx.fillStyle = dark;
      ctx.beginPath();
      chamferRect(ctx, cx - w / 2, sockY - sockH / 2, w, sockH, headR * 0.09);
      ctx.fill();
      // Zygomatic notch: a shade tick under the socket's outer corner
      // — the cheekbone that makes the socket sit IN bone.
      if (!hurt) {
        ctx.fillStyle = shade(sk.bone, -16);
        ctx.fillRect(cx + es * w * 0.32, sockY + sockH * 0.52, headR * 0.14 * wK, headR * 0.06);
      }
      // The light in the socket: ember or frost, breathing on its own
      // clock, and it OWNS the socket — a furnace behind bone, not a
      // pixel of tint. The rank-and-file keep the hollow dark.
      if (sk.glow && !hurt) {
        const pulse = 0.62 + 0.38 * Math.sin(f.nowMs * 0.004 + es * 1.7);
        ctx.globalAlpha = 0.45 + 0.3 * pulse;
        ctx.fillStyle = shade(sk.glow, -30);
        ctx.beginPath();
        chamferRect(ctx, cx - w * 0.42, sockY - sockH * 0.36, w * 0.84, sockH * 0.74, headR * 0.06);
        ctx.fill();
        ctx.globalAlpha = 0.75 + 0.25 * pulse;
        ctx.fillStyle = sk.glow;
        ctx.fillRect(cx - w * 0.26, sockY - sockH * 0.2, w * 0.52, sockH * 0.46);
        ctx.globalAlpha = 1;
        ctx.fillStyle = shade(sk.glow, 46);
        ctx.fillRect(cx - w * 0.1, sockY - sockH * 0.1, w * 0.2, sockH * 0.24);
      }
    }
    // Nasal aperture: front-on a downward wedge between the sockets;
    // at profile it becomes the notch cut into the leading edge.
    ctx.fillStyle = dark;
    if (profileK > 0.6) {
      const nx = mxX + lead * mxHw * 0.98;
      ctx.beginPath();
      ctx.moveTo(nx, headY + hh * 0.18);
      ctx.lineTo(nx - lead * headR * 0.18, headY + hh * 0.34);
      ctx.lineTo(nx, headY + hh * 0.44);
      ctx.closePath();
      ctx.fill();
    } else {
      const nx = pairX + fx * headR * 0.06;
      ctx.beginPath();
      ctx.moveTo(nx - headR * 0.09, headY + hh * 0.24);
      ctx.lineTo(nx + headR * 0.09, headY + hh * 0.24);
      ctx.lineTo(nx, headY + hh * 0.48);
      ctx.closePath();
      ctx.fill();
    }
    // Teeth: the mandible's top strip in brighter ivory, cut by dark
    // separation ticks — the grin is the skeleton's signature, so it
    // stays bold at every band that shows a face.
    const tK = 1 - 0.35 * profileK;
    const tHw = mdHw * 0.86 * tK;
    const tX = mxX + fx * hw * 0.04;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, 14);
    ctx.fillRect(tX - tHw, mdTop, tHw * 2, hh * 0.16);
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -40);
      for (const ot of [-0.62, -0.21, 0.21, 0.62]) {
        ctx.fillRect(tX + ot * tHw - headR * 0.028, mdTop, headR * 0.056, hh * 0.15);
      }
    }
    // Jaw hinge: the condyle knob where mandible meets skull — the
    // profile detail that articulates the jaw.
    if (profileK > 0.5 && !hurt) {
      ctx.fillStyle = shade(sk.bone, -12);
      ctx.beginPath();
      ctx.arc(headX - lead * hw * 0.52, headY + hh * 0.52 + jawDrop * 0.4, headR * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Old damage: a crack wandering down the trailing brow. Painted on
  // every band — a wound this old goes all the way around a story.
  if (sk.cracked && !hurt) {
    ctx.strokeStyle = shade(sk.bone, -26);
    ctx.lineWidth = Math.max(1, headR * 0.055);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.3, crTop + hh * 0.1);
    ctx.lineTo(headX - lead * hw * 0.52, headY - hh * 0.5);
    ctx.lineTo(headX - lead * hw * 0.38, headY - hh * 0.16);
    ctx.stroke();
    ctx.lineJoin = 'miter';
  }

  // The crown: a gold band ringing the dome with rising points — worn
  // at every facing (a crown has no back), the gem only where a face
  // is. Painted last so it sits OVER the cracked old bone it outranks.
  if (sk.crown) {
    const bandCol = hurt ? '#ffffff' : sk.crown.band;
    const bandY = crTop + hh * 0.3;
    const bandH = hh * 0.26;
    ctx.fillStyle = bandCol;
    ctx.fillRect(headX - hw * 0.98, bandY, hw * 1.96, bandH);
    if (!hurt) {
      ctx.fillStyle = shade(sk.crown.band, -14);
      ctx.fillRect(headX, bandY, hw * 0.98, bandH);
      ctx.fillStyle = shade(sk.crown.band, 18);
      ctx.fillRect(headX - hw * 0.98, bandY, hw * 1.96, bandH * 0.3);
    }
    // Points: center tallest, the pair beside it shorter — every other
    // one shaded so the ring reads as depth, not a paper cutout.
    for (const [i, ot] of [-0.68, 0, 0.68].entries()) {
      const bx = headX + ot * hw;
      const hgt = hh * (ot === 0 ? 0.46 : 0.32);
      ctx.fillStyle = !hurt && i % 2 === 0 ? shade(sk.crown.band, -8) : bandCol;
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(bx + hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(bx + ot * hw * 0.06, bandY - hgt);
      ctx.closePath();
      ctx.fill();
    }
    if (!back && !hurt) {
      const gx = headX + fx * hw * 0.34;
      ctx.fillStyle = sk.crown.gem;
      ctx.fillRect(gx - headR * 0.07, bandY + bandH * 0.24, headR * 0.14, bandH * 0.55);
      ctx.fillStyle = shade(sk.crown.gem, 40);
      ctx.fillRect(gx - headR * 0.05, bandY + bandH * 0.3, headR * 0.055, bandH * 0.22);
    }
  }
}

export interface RibcageFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  lead: number;
  profileK: number;
  backK: number;
  hurt: boolean;
}

/** Rib row positions down the barrel (fractions of its height). */
const RIB_ROWS = [0.1, 0.36, 0.62, 0.88] as const;

/**
 * The skeletal torso, drawn in the garment's local frame (y=0 at the
 * hip line, −th at the shoulders): clavicle bar and shoulder knobs, a
 * rib barrel over the dark cavity with the sternum riding the leading
 * edge, scapulae and spine from behind — and below it a REAL gap where
 * a waist should be, crossed only by vertebrae down to the iliac-wing
 * pelvis. The see-through waist is the whole-body skeleton read.
 */
export function paintRibcage(
  ctx: CanvasRenderingContext2D,
  sk: SkeletonLook,
  f: RibcageFrame,
): void {
  const { s, tw, ww, th, fx, profileK, backK, hurt } = f;
  const hv = sk.heavy;
  const bone = hurt ? '#ffffff' : sk.bone;
  const back = backK > 0.55;

  // Barrel bounds: shoulders down to mid-torso.
  const y0 = -th + 0.055 * s;
  const y1 = -th * 0.48;
  const wTop = tw * 0.9;
  const wBot = ww * 1.0;
  const wAt = (t: number): number => wTop + (wBot - wTop) * t;

  const barrel = (): void => {
    ctx.beginPath();
    ctx.moveTo(-wTop, y0);
    ctx.lineTo(wTop, y0);
    ctx.lineTo(wBot, y1);
    ctx.lineTo(-wBot, y1);
    ctx.closePath();
  };

  if (back) {
    // From behind the cage is CLOSED: solid bone back, rib seams, the
    // spine column, and the two scapula plates riding the shoulders.
    ctx.fillStyle = bone;
    barrel();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      barrel();
      ctx.clip();
      ctx.fillStyle = shade(sk.bone, -9);
      ctx.fillRect(0, y0, wTop, y1 - y0);
      ctx.strokeStyle = shade(sk.bone, -15);
      ctx.lineWidth = Math.max(1, 0.02 * s);
      for (const t of RIB_ROWS) {
        const ry = y0 + (y1 - y0) * t;
        ctx.beginPath();
        ctx.moveTo(-wAt(t), ry + 0.012 * s);
        ctx.quadraticCurveTo(0, ry - 0.022 * s, wAt(t), ry + 0.012 * s);
        ctx.stroke();
      }
      ctx.restore();
      // Scapulae: two proud blades high on the back, angled outward,
      // each with its own under-shade so they STAND OFF the rib wall.
      const spX = fx * tw * 0.3;
      for (const es of [-1, 1]) {
        ctx.fillStyle = shade(sk.bone, es > 0 ? 2 : 12);
        ctx.beginPath();
        ctx.moveTo(spX + es * tw * 0.18, y0 + 0.012 * s);
        ctx.lineTo(spX + es * tw * 0.88, y0 + 0.03 * s);
        ctx.lineTo(spX + es * tw * 0.6, y0 + 0.22 * s);
        ctx.lineTo(spX + es * tw * 0.2, y0 + 0.16 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(sk.bone, -22);
        ctx.beginPath();
        ctx.moveTo(spX + es * tw * 0.6, y0 + 0.22 * s);
        ctx.lineTo(spX + es * tw * 0.88, y0 + 0.03 * s);
        ctx.lineTo(spX + es * tw * 0.86, y0 + 0.075 * s);
        ctx.lineTo(spX + es * tw * 0.62, y0 + 0.245 * s);
        ctx.closePath();
        ctx.fill();
      }
      // The spine bar overlays the seam of the two halves.
      ctx.fillStyle = shade(sk.bone, -6);
      ctx.fillRect(spX - 0.032 * s, y0, 0.064 * s, y1 - y0);
      ctx.fillStyle = shade(sk.bone, -20);
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(spX - 0.032 * s, y0 + (y1 - y0) * (0.14 + i * 0.24), 0.064 * s, 0.012 * s);
      }
    }
  } else {
    // Facing the camera (and every three-quarter): the OPEN cage.
    // Dark cavity first, rib bars over it, sternum over the ribs. The
    // cage only reads when the cavity WINS between the ribs — thin
    // bright bars over deep dark, never a pale slab with seams.
    ctx.fillStyle = hurt ? '#3a3346' : shade(sk.cavity, -8);
    barrel();
    ctx.fill();
    // Ribs: four near-horizontal bars filling the cage evenly — bone
    // band, dark band, bone band: the classic cage rhythm. A gentle
    // center dip bows each pair toward the sternum, and the whole row
    // tilts down-forward as the body turns to profile.
    const span = y1 - y0;
    const rh = Math.min(0.036 * s * (1 + 0.18 * (hv - 1)), (span / RIB_ROWS.length) * 0.58);
    const tilt = fx * 0.042 * s;
    const dip = (1 - profileK) * 0.016 * s;
    for (const [i, t] of RIB_ROWS.entries()) {
      const ry = y0 + span * t;
      const hwR = wAt(t) * 0.97;
      const cxR = fx * hwR * 0.12;
      for (const es of [-1, 1]) {
        ctx.fillStyle =
          hurt ? '#ffffff' : es > 0 ? shade(sk.bone, -6 - i * 2) : shade(sk.bone, 6 - i * 2);
        ctx.beginPath();
        ctx.moveTo(cxR, ry + dip - rh / 2);
        ctx.lineTo(es * hwR, ry + es * tilt - rh / 2);
        ctx.lineTo(es * hwR, ry + es * tilt + rh / 2);
        ctx.lineTo(cxR, ry + dip + rh / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Sternum: a narrow breastbone bar running the cage's full height,
    // a step brighter than the ribs so the center line reads, sliding
    // from center to the leading edge with the turn.
    const stX = fx * (wTop * 0.86);
    const stW = 0.048 * s * hv;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, 10);
    ctx.beginPath();
    chamferRect(ctx, stX - stW / 2, y0 - 0.01 * s, stW, span * 0.92, 0.016 * s);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -14);
      ctx.fillRect(stX + stW * 0.14, y0 - 0.01 * s, stW * 0.36, span * 0.88);
      // Xiphoid tip: the sternum ends in a point, like the real bone.
      ctx.fillStyle = shade(sk.bone, -4);
      ctx.beginPath();
      ctx.moveTo(stX - stW / 2, y0 + span * 0.9);
      ctx.lineTo(stX + stW / 2, y0 + span * 0.9);
      ctx.lineTo(stX, y0 + span * 1.04);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Clavicle bar + shoulder knobs: the coat-hanger the arms hang from.
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, -tw * 0.98, y0 - 0.055 * s, tw * 1.96, 0.04 * s, 0.014 * s);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(sk.bone, -12);
    ctx.fillRect(0, y0 - 0.055 * s, tw * 0.98, 0.04 * s);
  }
  for (const es of [-1, 1]) {
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, es > 0 ? -10 : 4);
    ctx.beginPath();
    ctx.arc(es * tw * 0.94, y0 - 0.02 * s, Math.max(1.8, 0.048 * s * hv), 0, Math.PI * 2);
    ctx.fill();
  }

  // The waist: NOTHING but spine. Three vertebra beads crossing the
  // gap — whatever is behind the body (grass, cape, the far arm)
  // shows through beside them. This gap is the skeleton.
  const spX = fx * tw * 0.22;
  const gapTop = y1 + 0.012 * s;
  const pelvTop = -0.14 * s;
  const beadH = 0.038 * s;
  const step = (pelvTop - gapTop - beadH) / 2;
  for (let i = 0; i < 3; i++) {
    const by = gapTop + i * step;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, i % 2 === 0 ? 0 : -8);
    ctx.beginPath();
    chamferRect(ctx, spX - 0.042 * s * hv, by, 0.084 * s * hv, beadH, 0.012 * s);
    ctx.fill();
  }

  // Pelvis: iliac wings flaring up-and-out from the sacrum wedge, the
  // dark inlet notch under it — a bone bowl, not a belt line. Each
  // wing carries a crest highlight so the flare reads as a rim.
  for (const es of [-1, 1]) {
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, es > 0 ? -10 : 4);
    ctx.beginPath();
    ctx.moveTo(spX + es * 0.018 * s, pelvTop + 0.024 * s);
    ctx.lineTo(es * ww * 1.12, pelvTop - 0.012 * s);
    ctx.lineTo(es * ww * 0.8, 0.042 * s);
    ctx.lineTo(spX + es * 0.028 * s, 0.05 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The crest: a lit lip along the wing's top edge.
      ctx.strokeStyle = shade(sk.bone, es > 0 ? 4 : 16);
      ctx.lineWidth = Math.max(1, 0.02 * s);
      ctx.beginPath();
      ctx.moveTo(spX + es * 0.02 * s, pelvTop + 0.02 * s);
      ctx.lineTo(es * ww * 1.1, pelvTop - 0.01 * s);
      ctx.stroke();
    }
  }
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, spX - 0.052 * s * hv, pelvTop - 0.008 * s, 0.104 * s * hv, 0.07 * s, 0.016 * s);
  ctx.fill();
  ctx.fillStyle = hurt ? '#3a3346' : sk.cavity;
  ctx.beginPath();
  ctx.moveTo(spX - 0.036 * s, 0.022 * s);
  ctx.lineTo(spX + 0.036 * s, 0.022 * s);
  ctx.lineTo(spX, 0.058 * s);
  ctx.closePath();
  ctx.fill();
}

/* ========================== THE SCALE DIALECT ==========================
 * Kobolds are NOT small villagers with horns and a tail. When
 * RigPose.kobold is set, the flesh head swaps for a hunched tunnel-rat
 * skull — a low cranium sunk into the shoulders under two big dish
 * ears, a LONG drooping snout ending in a bare nose pad with whiskers
 * and buck incisors, and a lit tallow candle seated on the crown (a
 * miner carries its own light). The body hunches with it: the torso
 * tips forward, the head hangs low and thrust ahead over a bent
 * shoulder hump, a naked tail rides the hip, and the bare feet grow
 * claws — while the IK rig, weapon carriage, and all eight facing
 * bands keep working untouched. Each variant is its own DESIGN, never
 * a scale-up: the dusty rank-and-file digger under one candle, and
 * the digmaster's dark bulk under a ragged mane and a three-candle
 * crown.
 */
export interface KoboldLook {
  /** Hide base — each variant weathered its own tunnel. */
  hide: string;
  /** Pale under-hide: jaw, muzzle underside, the tail's low edge. */
  belly: string;
  /** The lit eye bead — small, bright, watching. */
  eye: string;
  /** The bare nose pad at the snout tip. */
  nose: string;
  /**
   * Ragged mane shag over crown and nape; undefined = the digger's
   * short bristle scruff instead.
   */
  mane?: string;
  /** Frame multiplier: jaw mass, ear dish, tail girth. */
  heavy: number;
}

/** The inner ear membrane — thin skin, always flesh-pink. */
const KOBOLD_EAR_INNER = '#c78e7f';

export const KOBOLD_LOOKS: Record<string, KoboldLook> = {
  // The rank-and-file digger: dusty tan hide, a short bristle scruff,
  // whiskers full of rock dust — a coward alone, a warren together.
  kobold: {
    hide: '#9c6a4a',
    belly: '#d8bf9a',
    eye: '#f0b93a',
    nose: '#43302c',
    heavy: 1,
  },
  // The digmaster: dark umber hide under a ragged slate mane — the
  // warren's one broad-backed silhouette.
  kobold_digmaster: {
    hide: '#6f4838',
    belly: '#c2a480',
    eye: '#ffd24a',
    nose: '#352624',
    mane: '#4a4252',
    heavy: 1.3,
  },
};

/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export function koboldLook(defId: string): KoboldLook {
  return KOBOLD_LOOKS[defId] ?? KOBOLD_LOOKS['kobold']!;
}

/**
 * A tapered filled ribbon along a quadratic spine — the law learned on
 * the ram's horns: curved mass reads as carved form only when drawn as
 * a filled shape with an outline, never as a stroke chain. Width
 * tapers base→tip; returns the sampled spine so callers can seat
 * details on it.
 */
export function scaleRibbon(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  w0: number,
  fill: string,
  outline: string,
): Array<{ x: number; y: number; px: number; py: number; w: number }> {
  const N = 8;
  const spine: Array<{ x: number; y: number; px: number; py: number; w: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    // Tangent of the bezier, for the perpendicular offset.
    const tx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
    const ty = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
    const tl = Math.hypot(tx, ty) || 1e-4;
    spine.push({ x, y, px: -ty / tl, py: tx / tl, w: w0 * (1 - t) * 0.5 });
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < spine.length; i++) {
    const p = spine[i]!;
    if (i === 0) ctx.moveTo(p.x + p.px * p.w, p.y + p.py * p.w);
    else ctx.lineTo(p.x + p.px * p.w, p.y + p.py * p.w);
  }
  for (let i = spine.length - 1; i >= 0; i--) {
    const p = spine[i]!;
    ctx.lineTo(p.x - p.px * p.w, p.y - p.py * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1, w0 * 0.16);
  ctx.stroke();
  return spine;
}

export interface KoboldHeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 jaw drop — the combat yip-and-snap; 0 keeps the jaw seated. */
  gape: number;
}

/**
 * The kobold head, drawn in the head block's own frame. Reads kobold
 * by SILHOUETTE first: a low cranium between big dish ears under the
 * candle crown, and a LONG snout that leads the facing — hanging low
 * face-on, run out level and drooping at profile — ending in a bare
 * nose pad with whiskers and buck incisors. The pale mandible drops
 * with the gape. From behind there is NO face: hide plates, the nape,
 * the ears' backs, and the scruff or mane riding the crown.
 */
export function paintKoboldHead(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  f: KoboldHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, profileK, backK, lead, hurt } = f;
  const hv = kb.heavy;
  const hide = hurt ? '#ffffff' : kb.hide;
  const belly = hurt ? '#ffffff' : kb.belly;
  const back = backK > 0.55;

  // --- the low cranium: a shallow dome sunk into the shoulders — all
  // ear and snout, no proud brow. Silhouette before detail.
  const crTop = headY - hh * 0.72;
  const crBot = headY + hh * 0.5;

  // --- dish ears: big round tunnel-rat ears riding high and wide.
  // Far-side-skip at profile; from behind both read (backs only —
  // the pink membrane faces forward, never the camera's back band).
  const drawEar = (side: number, depth: number): void => {
    const ex = headX - fx * hw * 0.38 + side * hw * 0.8;
    const ey = crTop + hh * 0.24 - (1 - depth) * hh * 0.06;
    const r = hh * 0.42 * (0.85 + 0.15 * hv) * depth;
    ctx.fillStyle = hide;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(kb.hide, -24);
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.stroke();
      if (!back) {
        ctx.fillStyle = KOBOLD_EAR_INNER;
        ctx.beginPath();
        ctx.arc(ex + fx * r * 0.14, ey + r * 0.08, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(KOBOLD_EAR_INNER, -18);
        ctx.beginPath();
        ctx.arc(ex + fx * r * 0.18, ey + r * 0.16, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const nearSide = lead;
  // The far ear reads a step smaller and higher — the cheap perspective
  // cue that sells the head as a volume at the three-quarter bands.
  if (profileK < 0.7 || back) drawEar(-nearSide, back ? 1 : 0.86);
  drawEar(nearSide, 1);

  // --- cranium block.
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.4, cut * 1.4, cut * 0.5, cut * 0.5]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for hide: hard shade right half, lit
    // crown band, jaw under-shade — the dome reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.4, cut * 1.4, cut * 0.5, cut * 0.5]);
    ctx.clip();
    ctx.fillStyle = shade(kb.hide, -10);
    ctx.fillRect(headX, crTop, hw, crBot - crTop);
    ctx.fillStyle = shade(kb.hide, 9);
    ctx.fillRect(headX - hw, crTop, hw * 2, hh * 0.14);
    ctx.fillStyle = shade(kb.hide, -16);
    ctx.fillRect(headX - hw, crBot - hh * 0.1, hw * 2, hh * 0.1);
    ctx.restore();
  }

  // --- the crown: every kobold wears something up top. The digger
  // gets a short bristle scruff — a few stiff tufts, rock dust and
  // all; the digmaster's full mane replaces it below.
  if (!kb.mane && !hurt) {
    ctx.fillStyle = shade(kb.hide, -20);
    const sBase = headX - fx * hw * 0.28;
    for (let i = 0; i < 4; i++) {
      const t = (i / 3) * 2 - 1;
      const bx = sBase + t * hw * 0.42;
      const by = crTop + hh * 0.1;
      const tall = hh * (0.2 + 0.09 * Math.sin(i * 2.1 + 0.7));
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.11, by + hh * 0.05);
      ctx.lineTo(bx - fx * hw * 0.12 + t * hw * 0.05, by - tall);
      ctx.lineTo(bx + hw * 0.11, by + hh * 0.06);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- the mane: ragged shag over the crown and pouring down the
  // nape. The digmaster's slate mop; the digger keeps the scruff.
  if (kb.mane && !hurt) {
    ctx.fillStyle = kb.mane;
    const mBase = headX - fx * hw * 0.24;
    for (let i = 0; i < 5; i++) {
      const t = (i / 4) * 2 - 1;
      const bx = mBase + t * hw * 0.72;
      const by = crTop + hh * 0.14;
      const tall = hh * (0.42 + 0.2 * Math.sin(i * 2.6 + 1)) * (1 + 0.2 * (1 - Math.abs(t)));
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.2, by + hh * 0.08);
      ctx.lineTo(bx - fx * hw * 0.24 + t * hw * 0.1, by - tall);
      ctx.lineTo(bx + hw * 0.2, by + hh * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    // The nape shag: a heavy lock falling off the trailing edge of
    // the crown — the mop reads even at profile, under the candles.
    const nx0 = headX - fx * hw * 0.98;
    ctx.beginPath();
    ctx.moveTo(nx0 + fx * hw * 0.3, crTop + hh * 0.1);
    ctx.lineTo(nx0 - fx * hw * 0.22, crTop + hh * 0.7);
    ctx.lineTo(nx0 - fx * hw * 0.1, crBot + hh * 0.16);
    ctx.lineTo(nx0 + fx * hw * 0.34, crBot - hh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(kb.mane, -14);
    ctx.beginPath();
    ctx.moveTo(nx0 + fx * hw * 0.1, crTop + hh * 0.34);
    ctx.lineTo(nx0 - fx * hw * 0.16, crTop + hh * 0.9);
    ctx.lineTo(nx0 + fx * hw * 0.16, crBot + hh * 0.02);
    ctx.closePath();
    ctx.fill();
  }

  if (back) {
    // --- the occiput: no face ever shows from behind. Hide plates in
    // courses, the nape shadow, the ears' backs — and the candlelight
    // still riding the crown.
    if (!hurt) {
      ctx.strokeStyle = shade(kb.hide, -14);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const t of [0.32, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.6, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + hw * 0.6, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      // The nape shadow where the head sinks into the hump.
      ctx.fillStyle = shade(kb.hide, -18);
      ctx.beginPath();
      chamferRect(ctx, headX - hw * 0.4, crBot - hh * 0.16, hw * 0.8, hh * 0.16, cut * 0.3);
      ctx.fill();
      if (kb.mane) {
        // Nape shag trailing down the back of the skull.
        ctx.fillStyle = kb.mane;
        for (let i = 0; i < 3; i++) {
          const bx = headX + (i - 1) * hw * 0.3;
          ctx.beginPath();
          ctx.moveTo(bx - hw * 0.14, crTop + hh * 0.4);
          ctx.lineTo(bx + hw * 0.02, crBot + hh * (0.14 + 0.08 * Math.sin(i * 2.2)));
          ctx.lineTo(bx + hw * 0.16, crTop + hh * 0.42);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    return;
  }

  // --- the snout: LONG, leading the facing. Face-on it hangs low and
  // narrow off the skull; at profile it runs out level, the bridge
  // easing down toward the nose pad. Two-piece with the mandible.
  const jawDrop = f.gape * hh * 0.3;
  const snLen = hw * (0.5 + 1.15 * profileK);
  const rootX = headX + fx * hw * 0.16;
  const tipX = rootX + fx * snLen;
  const snHw = hw * (0.44 - 0.12 * profileK);
  const x0 = Math.min(rootX, tipX) - snHw * (1 - profileK);
  const x1 = Math.max(rootX, tipX) + snHw * (1 - profileK);
  const topY = headY - hh * (0.24 - 0.08 * profileK);
  const botY = headY + hh * (0.6 + 0.26 * (1 - profileK));
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, x0, topY, x1 - x0, botY - topY, [cut * 0.4, cut * 0.4, cut * 0.6, cut * 0.6]);
  ctx.fill();
  if (!hurt) {
    // Bridge highlight sloping toward the tip, form-split shade, and
    // the drooped under-tip shadow that sells the hang of the snout.
    ctx.fillStyle = shade(kb.hide, 10);
    ctx.fillRect(x0 + (x1 - x0) * 0.12, topY, (x1 - x0) * 0.76, hh * 0.1);
    ctx.fillStyle = shade(kb.hide, -9);
    ctx.beginPath();
    chamferRect(ctx, headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX, topY, x1 - (headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX), botY - topY, [0, cut * 0.4, cut * 0.6, 0]);
    ctx.fill();
    ctx.fillStyle = shade(kb.hide, -14);
    ctx.fillRect(x0, botY - hh * 0.12, x1 - x0, hh * 0.12);
  }

  // --- the nose pad: bare flesh at the very tip, nostril dot beside.
  const nx = rootX + fx * snLen * 0.96;
  const ny = headY + hh * (0.12 * profileK) + (1 - profileK) * (botY - headY - hh * 0.26);
  const nr = hh * 0.15 * (0.9 + 0.2 * hv);
  ctx.fillStyle = hurt ? '#ffffff' : kb.nose;
  ctx.beginPath();
  ctx.arc(nx, ny, nr, 0, Math.PI * 2);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(kb.nose, 16);
    ctx.beginPath();
    ctx.arc(nx - nr * 0.3, ny - nr * 0.35, nr * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(kb.nose, -26);
    if (profileK < 0.55) {
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(nx + sd * nr * 0.5, ny + nr * 0.25, nr * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(nx + lead * nr * 0.45, ny + nr * 0.2, nr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- whiskers: dust-pale threads swept back off the snout. Near
  // side only at profile (the far cheek is around the corner).
  if (!hurt) {
    ctx.strokeStyle = 'rgba(238,228,205,0.85)';
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const sd of [-1, 1]) {
      if (sd !== nearSide && profileK > 0.7) continue;
      const wx = nx - fx * hw * 0.2 + sd * snHw * 0.4 * (1 - profileK * 0.6);
      const wy = ny - hh * 0.04;
      for (const [dy0, dy1] of [[-0.04, -0.14], [0.04, 0.1]] as const) {
        ctx.beginPath();
        ctx.moveTo(wx, wy + dy0 * hh * 3);
        ctx.quadraticCurveTo(
          wx - fx * hw * 0.1 + sd * hw * 0.34,
          wy + dy0 * hh * 3 + hh * 0.06,
          wx - fx * hw * 0.18 + sd * hw * 0.62,
          wy + dy1 * hh * 3 + hh * 0.22,
        );
        ctx.stroke();
      }
    }
  }

  // --- the mandible: pale under-jaw, its own piece, dropping with
  // the gape — the kobold yips and snaps through every swing.
  const mdHw = snHw * 0.82;
  const mdX = rootX + fx * snLen * 0.42;
  const mdTop = botY - hh * 0.08 + jawDrop;
  if (jawDrop > hh * 0.03) {
    // The open mouth behind the dropped jaw, and the tooth row above.
    ctx.fillStyle = hurt ? '#241a2e' : '#3a2028';
    ctx.beginPath();
    chamferRect(ctx, mdX - mdHw * 0.94, botY - hh * 0.1, mdHw * 1.88, mdTop - botY + hh * 0.16, cut * 0.25);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#e8ddc2';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(mdX + i * mdHw * 0.5 - hh * 0.05, botY - hh * 0.08);
        ctx.lineTo(mdX + i * mdHw * 0.5, botY + hh * 0.08);
        ctx.lineTo(mdX + i * mdHw * 0.5 + hh * 0.05, botY - hh * 0.08);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = belly;
  ctx.beginPath();
  chamferRect(ctx, mdX - mdHw, mdTop, mdHw * 2, hh * 0.24, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();

  // --- buck incisors: the tunnel-rat's chisels, proud of the jaw
  // even shut, hanging just behind the nose pad.
  if (!hurt) {
    ctx.fillStyle = '#efe6cf';
    for (const sd of [-1, 1]) {
      const ix = nx - fx * hw * 0.12 + sd * nr * 0.55;
      ctx.beginPath();
      chamferRect(ctx, ix - hh * 0.045, ny + nr * 0.5, hh * 0.09, hh * 0.2 * (1 + 0.25 * hv), [0, 0, hh * 0.03, hh * 0.03]);
      ctx.fill();
    }
  }

  // --- the eyes: small lit beads under a shading brow — watching,
  // not draconic. They slide with the facing; the far eye slips
  // around the corner at profile.
  const eyeY = headY - hh * 0.3;
  const pairX = headX + fx * hw * 0.34;
  const eyeDx = hw * 0.42 * (1 - profileK * 0.5);
  if (!hurt) {
    ctx.fillStyle = shade(kb.hide, -18);
    ctx.beginPath();
    chamferRect(ctx, pairX - hw * 0.62, eyeY - hh * 0.22, hw * 1.24, hh * 0.14, cut * 0.3);
    ctx.fill();
  }
  for (const sd of [-1, 1]) {
    if (sd !== nearSide && profileK > 0.78) continue;
    const ex = pairX + sd * eyeDx;
    if (!hurt) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = kb.eye;
      ctx.beginPath();
      ctx.arc(ex, eyeY, hh * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : kb.eye;
    ctx.beginPath();
    ctx.arc(ex, eyeY, hh * 0.115, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(ex + fx * hh * 0.02, eyeY + hh * 0.01, hh * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(ex - hh * 0.045, eyeY - hh * 0.05, hh * 0.028, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export interface KoboldHumpFrame {
  s: number;
  tw: number;
  th: number;
  fx: number;
  backK: number;
  hurt: boolean;
}

/**
 * The shoulder hump: the bent back the whole species carries, drawn
 * in the torso's local frame AFTER the garment and BEFORE the head —
 * a rounded mass rising behind the neck that the low-slung skull sinks
 * into. It trails the facing at profile and reads as bowed shoulders
 * face-on and from behind.
 */
export function paintKoboldHump(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  garment: string,
  f: KoboldHumpFrame,
): void {
  const { tw, th, fx, backK, hurt } = f;
  const cx = -fx * tw * 0.4;
  const cy = -th + th * 0.02;
  const rx = tw * (1.02 + 0.12 * backK);
  const ry = th * 0.24 * (1 + 0.18 * kb.heavy - 0.18);
  ctx.fillStyle = hurt ? '#ffffff' : garment;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, cy + ry * 0.35);
  ctx.lineTo(cx - rx, cy + ry * 0.35);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    // The form split carries over the hump: lit crown line, shaded
    // trailing slope — a bent back, not a collar.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(garment, -9);
    ctx.fillRect(cx, cy - ry, rx, ry * 2);
    ctx.fillStyle = shade(garment, 8);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.42);
    ctx.restore();
  }
}

export interface KoboldTailFrame {
  s: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  nowMs: number;
  runF: number;
  poleX: number;
  hurt: boolean;
}

/**
 * The naked tail — THE LIVING WHIP. Drawn in the torso's squashed
 * local frame BEFORE the garment so the root always tucks behind the
 * body. A wave travels root-to-tip on the wall clock, quickening and
 * widening with the gait, so the tail is never a dead ribbon: it
 * snakes at a stand, lashes at a run. Hide at the root eases to bare
 * flesh at the tip. It trails the facing — run out long at profile,
 * hanging low and swaying seen from behind, tip peeking past the hip
 * face-on.
 */
export function paintKoboldTail(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  f: KoboldTailFrame,
): void {
  const { s, fx, fy, backK, profileK, lead, nowMs, runF, poleX, hurt } = f;
  const hide = hurt ? '#ffffff' : kb.hide;
  const frontK = Math.max(0, fy);
  const trail = -poleX * 0.12 * s;
  // Base spine: root planted at the hip, arcing out behind the facing.
  const rootX = -fx * 0.05 * s;
  const rootY = -0.06 * s;
  const tipX = -fx * (0.56 + 0.14 * profileK) * s + trail - lead * 0.2 * s * frontK;
  const tipY = 0.15 * s + 0.19 * s * backK;
  const cx = rootX + (tipX - rootX) * 0.42;
  const cy = rootY + 0.12 * s + 0.05 * s * backK;
  // The traveling wave: amplitude grows toward the tip (the root stays
  // planted in the pelvis), the whole thing runs faster at speed.
  const N = 10;
  const phase = nowMs * (0.0042 + 0.0038 * runF);
  const amp = s * (0.03 + 0.05 * runF);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    let x = mt * mt * rootX + 2 * mt * t * cx + t * t * tipX;
    let y = mt * mt * rootY + 2 * mt * t * cy + t * t * tipY;
    const tx = 2 * mt * (cx - rootX) + 2 * t * (tipX - cx);
    const ty = 2 * mt * (cy - rootY) + 2 * t * (tipY - cy);
    const tl = Math.hypot(tx, ty) || 1e-4;
    const wob = Math.sin(phase - t * 5.2) * amp * Math.pow(t, 1.4);
    x += (-ty / tl) * wob;
    y += (tx / tl) * wob;
    pts.push({ x, y });
  }
  // Per-point frames from the DISPLACED spine, then one filled ribbon
  // with an outline (the ram's carved-mass law) tapering to the tip.
  const w0 = 0.075 * s * kb.heavy;
  const sp = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(N, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1e-4;
    const t = i / N;
    return { x: p.x, y: p.y, px: -dy / dl, py: dx / dl, w: w0 * (1 - t * 0.92) * 0.5 };
  });
  ctx.fillStyle = hide;
  ctx.beginPath();
  for (let i = 0; i < sp.length; i++) {
    const p = sp[i]!;
    if (i === 0) ctx.moveTo(p.x + p.px * p.w, p.y + p.py * p.w);
    else ctx.lineTo(p.x + p.px * p.w, p.y + p.py * p.w);
  }
  for (let i = sp.length - 1; i >= 0; i--) {
    const p = sp[i]!;
    ctx.lineTo(p.x - p.px * p.w, p.y - p.py * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hurt ? '#ffffff' : shade(kb.hide, -26);
  ctx.lineWidth = Math.max(1, w0 * 0.16);
  ctx.stroke();
  if (hurt) return;
  // The bare flesh tip: the last third of the whip pales out.
  ctx.strokeStyle = shade(KOBOLD_EAR_INNER, -4);
  ctx.lineCap = 'round';
  for (let i = 7; i < sp.length - 1; i++) {
    const p = sp[i]!;
    const q = sp[i + 1]!;
    ctx.lineWidth = Math.max(1, p.w * 1.9);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Pale underside: the belly line along the low edge of the ribbon.
  ctx.strokeStyle = shade(kb.belly, -6);
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const p = sp[i]!;
    // The perpendicular can flip along the spine — always take the
    // down-screen side for the belly edge.
    const sgn = p.py >= 0 ? 1 : -1;
    const x = p.x + p.px * p.w * 0.7 * sgn;
    const y = p.y + p.py * p.w * 0.7 * sgn;
    if (i === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/**
 * THE FUR DIALECT — the gnoll, the hyena-headed scavenger. Like the
 * bone and scale dialects it swaps head, hair, and face wholesale and
 * adds species mass (crest hump, bushy tail, bare paws) while the IK
 * rig, carriage, and facing bands keep working untouched. Each variant
 * is its own DESIGN, never a scale-up: the rank-and-file skulker in
 * its speckled coat, and the packlord's storm-dark bulk under the
 * standing crest. The rank-and-file additionally rolls a COAT CLUSTER
 * from its spawn seed — a warband reads as individuals from one stock,
 * never as one body stamped four times.
 */
export interface GnollLook {
  /** Coat base — the speckled gray-brown fur that carries the body. */
  fur: string;
  /** Pale underfur: throat, belly panel, jaw underside, tail's low edge. */
  underfur: string;
  /** Bare umber hide where the fur thins: paw pads and the ear dish. */
  skin: string;
  /** Speckle ink — the hyena's broken spot field over the coat. */
  spot: string;
  /** The bristled crest: crown, nape, and down the hunched back. */
  mane: string;
  /**
   * The dark face mask — brow ledge, muzzle bridge, eye sockets, claw
   * ink, the dorsal saddle. The menace tone: everything that scowls
   * wears it.
   */
  mask: string;
  /** The lit eye bead — small, close-set, watching the weakest. */
  eye: string;
  /** The bare nose pad at the muzzle tip. */
  nose: string;
  /** Frame multiplier: jaw mass, ear reach, crest height, tail girth. */
  heavy: number;
  /** Battle-worn: notched ear and a muzzle scar — the packlord's ledger. */
  scarred?: boolean;
  /** Spawn seed carried on the resolved look — drives the spot field. */
  seed?: number;
}

export const GNOLL_LOOKS: Record<string, GnollLook> = {
  // The rank-and-file skulker: a dusty, dirt-matted coat over umber
  // hide, a dark hyena mask, hungry amber eyes — brave in fours.
  gnoll: {
    fur: '#7f6d4c',
    underfur: '#bfae87',
    skin: '#8a7358',
    spot: '#4c4030',
    mane: '#332a1e',
    mask: '#42372a',
    eye: '#f2a93a',
    nose: '#241d17',
    heavy: 1,
  },
  // The packlord: storm-dark coat, an iron-gray standing crest twice
  // the skulker's reach, a notched ear and an old muzzle scar — the
  // warband's one broad-backed silhouette.
  gnoll_champion: {
    fur: '#4e463c',
    underfur: '#948a70',
    skin: '#6b5f4e',
    spot: '#332c24',
    mane: '#3d3f4c',
    mask: '#302a24',
    eye: '#ffd24a',
    nose: '#1d1815',
    heavy: 1.3,
    scarred: true,
  },
};

/**
 * THE COAT CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a pack sorts into family groups (the beasts'
 * one-line fur-tint law, grown to a wardrobe): dust, ash, russet, and
 * the bone-pale runt. Champions never roll — a packlord is a DESIGN.
 */
const GNOLL_CLUSTERS: ReadonlyArray<
  Pick<GnollLook, 'fur' | 'underfur' | 'spot' | 'mane' | 'mask'>
> = [
  { fur: '#7f6d4c', underfur: '#bfae87', spot: '#4c4030', mane: '#332a1e', mask: '#42372a' }, // dust
  { fur: '#65625a', underfur: '#a19e92', spot: '#37342e', mane: '#33343a', mask: '#35352f' }, // ash
  { fur: '#785a3c', underfur: '#b49e7c', spot: '#44342a', mane: '#3a2b1e', mask: '#3d3026' }, // russet
  { fur: '#8a8164', underfur: '#c6bb9a', spot: '#4e4736', mane: '#453d2e', mask: '#443c30' }, // bone-pale
];

const GNOLL_LOOK_CACHE = new Map<string, GnollLook>();

/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the skulker's coat cluster plus a small
 * shade jitter; named looks (the packlord) hold their authored design.
 * Resolved looks are cached — this runs per body per frame.
 */
export function gnollLook(defId: string, seed = 0): GnollLook {
  const base = GNOLL_LOOKS[defId] ?? GNOLL_LOOKS['gnoll']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = GNOLL_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: GnollLook;
  if (defId === 'gnoll') {
    // Hash the seed before picking: knot members spawn with
    // CONSECUTIVE eids, and raw high bits dressed a whole pack in one
    // coat — the hash spreads a spawned warband across the clusters.
    const h = (seed * 2654435761) | 0;
    const cl = GNOLL_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      fur: shade(cl.fur, jit),
      underfur: cl.underfur,
      spot: cl.spot,
      mane: shade(cl.mane, jit),
      mask: cl.mask,
      seed,
    };
  } else {
    // Named looks hold their authored design — only the spot field
    // stays the body's own.
    look = { ...base, seed };
  }
  GNOLL_LOOK_CACHE.set(key, look);
  return look;
}

/**
 * The gnoll head, drawn in the head block's own frame. Reads gnoll by
 * SILHOUETTE first: a broad low skull between TALL ROUND ears, a
 * bristled crest breaking off the crown, and a BLUNT DEEP muzzle — a
 * bone-cracking jaw, not the wolf's spike — ending in a broad nose
 * with the underbite's teeth proud of the lip. Muzzle length leads the
 * facing (short face-on, run out at profile) and the whole face is
 * gone from behind (the cattle muzzle law): occiput fur, spot courses,
 * ear backs, and the crest pouring down the nape.
 */
export function paintGnollHead(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: KoboldHeadFrame,
  seed = 0,
): void {
  const { headX, headY, hw, hh, cut, fx, fy, profileK, backK, lead, hurt } = f;
  const hv = gn.heavy;
  const fur = hurt ? '#ffffff' : gn.fur;
  const under = hurt ? '#ffffff' : gn.underfur;
  const mask = hurt ? '#ffffff' : gn.mask;
  const back = backK > 0.55;
  const nearSide = lead;

  // --- the skull box: broad and LOW — all jaw and ear, the brow sunk
  // between the shoulders. Wider than the old cut (the hyena's cheek
  // mass), crown chamfers heavier than the jaw's.
  const gw = hw * 1.16;
  const crTop = headY - hh * 0.62;
  const crBot = headY + hh * 0.6;

  // --- THE MANE HOOD, laid down FIRST so the skull laps its base: a
  // connected sawtooth ridge breaking off the crown and pouring back
  // off the facing toward the hump — one ragged mass, never a row of
  // pasted thorns. Face-on it reads end-on as a bristle halo behind
  // the crown; at profile the full ridge runs crown → nape; from
  // behind it owns the whole occiput (drawn again there, wider).
  const hoodSpread = gw * (0.62 - 0.38 * profileK) * (1 - backK * 0.2) + backK * gw * 0.3;
  const hoodTall = hh * (0.42 + 0.5 * (hv - 1)) * (1 + 0.15 * profileK);
  const drawHood = (baseYLift: number, teeth: number): void => {
    const bx = (t: number): number =>
      headX + (1 - 2 * t) * hoodSpread - fx * gw * (0.08 + 0.9 * t) * (1 - backK);
    const by = (t: number): number =>
      crTop + hh * (0.04 + (0.5 * profileK + 0.1) * t * (1 - backK)) + baseYLift;
    ctx.beginPath();
    ctx.moveTo(bx(0) + fx * gw * 0.1, by(0) + hh * 0.3);
    for (let i = 0; i < teeth; i++) {
      const t = i / (teeth - 1);
      // Face-on the ridge is seen END-ON: the center locks stand
      // tallest and the corners taper away, so the silhouette above
      // the crown reads as one bristled mound — corner spikes at
      // full height read as a pair of horns.
      const centerBias = 1 - 0.45 * (1 - profileK) * Math.abs(t - 0.5) * 2;
      const tall = hoodTall * (0.72 + 0.38 * Math.sin(i * 2.3 + 1.1)) * centerBias;
      ctx.lineTo(bx(t) - fx * gw * 0.24 + (0.5 - t) * gw * 0.12, by(t) - tall);
      ctx.lineTo(bx(Math.min(1, t + 0.75 / (teeth - 1))), by(t) + hh * 0.04);
    }
    // The nape skirt: the ridge falls off the trailing edge toward
    // the shoulder hump instead of ending in mid-air.
    ctx.lineTo(bx(1) - fx * gw * 0.28, crBot + hh * 0.26 * (1 - backK * 0.5));
    ctx.lineTo(bx(0.5), crBot - hh * 0.05);
    ctx.closePath();
    ctx.fill();
  };
  if (!hurt) {
    ctx.fillStyle = gn.mane;
    drawHood(0, 5);
    if (gn.scarred) {
      // The packlord's frost: pale tips over the iron ridge — age worn
      // as rank. A second, smaller sawtooth inset into the first.
      ctx.fillStyle = shade(gn.mane, 42);
      const bx = (t: number): number =>
        headX + (1 - 2 * t) * hoodSpread * 0.86 - fx * gw * (0.08 + 0.86 * t) * (1 - backK);
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const tall = hoodTall * (0.78 + 0.34 * Math.sin(i * 2.3 + 1.4));
        const px = bx(t) - fx * gw * 0.22 + (0.5 - t) * gw * 0.1;
        const py = crTop + hh * (0.04 + 0.5 * profileK * t * (1 - backK)) - tall;
        ctx.beginPath();
        ctx.moveTo(px - gw * 0.055, py + hoodTall * 0.3);
        ctx.lineTo(px, py);
        ctx.lineTo(px + gw * 0.055, py + hoodTall * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // --- tall round ears riding high and wide, out-canted like a
  // listening hyena, BEFORE the skull so the cranium laps their
  // roots. Far ear steps smaller and higher at the three-quarter
  // bands (the cheap perspective cue); both read from behind as
  // backs — the inner dish faces forward only.
  const drawEar = (side: number, depth: number): void => {
    const er = hh * 0.3 * (0.9 + 0.18 * hv) * depth;
    const dh = hh * (0.78 + 0.16 * hv) * depth;
    const ex = headX - fx * gw * 0.26 + side * gw * 0.8;
    const baseY = crTop + hh * 0.16;
    const notched = gn.scarred && side === nearSide;
    ctx.save();
    ctx.translate(ex, baseY);
    // The out-cant: the whole ear leans off vertical away from the
    // skull center — alert, not teddy-bear upright.
    ctx.rotate(side * (0.16 + 0.08 * (1 - profileK)));
    // Front ears sit a value under the crown so they never glow; the
    // backs go darker still — pale lollipop ears were the plush tell.
    ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, back ? -16 : -8);
    ctx.beginPath();
    ctx.moveTo(-er, 0);
    ctx.lineTo(-er, -dh + er);
    ctx.arc(0, -dh + er, er, Math.PI, notched ? Math.PI * 1.6 : Math.PI * 2);
    if (notched) {
      // The notch: a bite taken out of the rim, healed ragged.
      ctx.lineTo(er * 0.34, -dh + er * 0.66);
      ctx.lineTo(er, -dh + er * 0.94);
    }
    ctx.lineTo(er, 0);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gn.fur, -28);
      ctx.lineWidth = Math.max(1, er * 0.18);
      ctx.stroke();
      if (!back) {
        // The inner dish: a deep dark cavity rimmed low with underfur.
        ctx.fillStyle = shade(gn.skin, -34);
        ctx.beginPath();
        ctx.ellipse(fx * er * 0.14, -dh + er + er * 0.62, er * 0.52, er * 0.94, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(gn.underfur, -12);
        ctx.lineWidth = Math.max(1, er * 0.12);
        ctx.beginPath();
        ctx.ellipse(fx * er * 0.14, -dh + er + er * 0.62, er * 0.52, er * 0.94, 0, Math.PI * 0.7, Math.PI * 1.6);
        ctx.stroke();
        if (!notched) {
          // Every skulker's ears carry a scrap-fight nick — a dark
          // wedge bitten into the outer rim, seeded per body.
          const nickT = 0.3 + 0.3 * (((seed >>> (side > 0 ? 3 : 9)) & 7) / 7);
          ctx.fillStyle = mask;
          ctx.beginPath();
          ctx.moveTo(side * er * 1.02, -dh * nickT);
          ctx.lineTo(side * er * 0.5, -dh * nickT - er * 0.22);
          ctx.lineTo(side * er * 1.02, -dh * nickT - er * 0.42);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Ear back: a fur seam up the middle keeps it a volume.
        ctx.strokeStyle = shade(gn.fur, -14);
        ctx.lineWidth = Math.max(1, er * 0.1);
        ctx.beginPath();
        ctx.moveTo(0, -er * 0.3);
        ctx.lineTo(0, -dh + er * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  if (profileK < 0.72 || back) drawEar(-nearSide, back ? 1 : 0.84);
  drawEar(nearSide, 1);

  // --- cranium block.
  ctx.fillStyle = fur;
  ctx.beginPath();
  chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.3, cut * 1.3, cut * 0.6, cut * 0.6]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for fur: hard shade right half, lit
    // crown band, jaw under-shade — the block reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.3, cut * 1.3, cut * 0.6, cut * 0.6]);
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -10);
    ctx.fillRect(headX, crTop, gw, crBot - crTop);
    ctx.fillStyle = shade(gn.fur, 9);
    ctx.fillRect(headX - gw, crTop, gw * 2, hh * 0.13);
    ctx.fillStyle = shade(gn.fur, -16);
    ctx.fillRect(headX - gw, crBot - hh * 0.1, gw * 2, hh * 0.1);
    // The spot field: seeded speckles over the trailing cheek and
    // crown — broken hyena dapple, never a grid. Deterministic from
    // the spawn seed so a body keeps its own coat frame to frame.
    ctx.fillStyle = shade(gn.spot, 0);
    for (let i = 0; i < 5; i++) {
      const h = ((seed >>> (i * 3)) ^ (seed * 41 + i * 97)) | 0;
      const sxr = ((h & 15) / 15) * 2 - 1;
      const syr = (((h >> 4) & 15) / 15) * 2 - 1;
      const bx = headX - fx * gw * 0.34 + sxr * gw * 0.52;
      const by = crTop + (crBot - crTop) * (0.3 + 0.32 * (syr * 0.5 + 0.5));
      const br = hh * (0.055 + 0.03 * (((h >> 8) & 3) / 3));
      ctx.beginPath();
      ctx.ellipse(bx, by, br * 1.25, br, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- cheek ruffs: jagged fur flaring sideways off the jaw line —
  // the sideburn wedges that break the clean box and read "wild
  // animal" from every band. Far ruff first so the near one laps it.
  const drawRuff = (side: number, depth: number): void => {
    const rx0 = headX - fx * gw * 0.08 + side * gw * 0.84;
    const reach = gw * 0.4 * depth * (0.9 + 0.2 * hv);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, -5);
    ctx.beginPath();
    ctx.moveTo(rx0, headY - hh * 0.16);
    ctx.lineTo(rx0 + side * reach, headY + hh * 0.02);
    ctx.lineTo(rx0 + side * gw * 0.06, headY + hh * 0.14);
    ctx.lineTo(rx0 + side * reach * 0.86, headY + hh * 0.34);
    ctx.lineTo(rx0 + side * gw * 0.04, headY + hh * 0.4);
    ctx.lineTo(rx0 + side * reach * 0.55, headY + hh * 0.6);
    ctx.lineTo(rx0 - side * gw * 0.08, headY + hh * 0.56);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // One mask-dark tooth in the ruff keeps it ratty, not fluffy.
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.moveTo(rx0 + side * gw * 0.02, headY + hh * 0.18);
      ctx.lineTo(rx0 + side * reach * 0.7, headY + hh * 0.4);
      ctx.lineTo(rx0 + side * gw * 0.01, headY + hh * 0.44);
      ctx.closePath();
      ctx.fill();
    }
  };
  if (!back) {
    if (profileK < 0.72) drawRuff(-nearSide, 0.8);
    drawRuff(nearSide, 1);
  }

  if (back) {
    // --- the occiput: no face from behind. Fur courses, the nape
    // shadow where the skull sinks into the hump, and the mane hood
    // owning the crown and pouring down the middle in falling locks.
    if (!hurt) {
      ctx.strokeStyle = shade(gn.fur, -14);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const t of [0.38, 0.64]) {
        ctx.beginPath();
        ctx.moveTo(headX - gw * 0.6, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + gw * 0.6, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      ctx.fillStyle = shade(gn.fur, -18);
      ctx.beginPath();
      chamferRect(ctx, headX - gw * 0.44, crBot - hh * 0.16, gw * 0.88, hh * 0.16, cut * 0.3);
      ctx.fill();
      // The mane from behind: ONE connected fall — a crown cap arcing
      // the full skull width whose bottom edge tears into ragged
      // locks pouring down the occiput, deepest at the spine line, so
      // the whole band reads as hair over the head, never a panel
      // strapped to it.
      ctx.fillStyle = gn.mane;
      ctx.beginPath();
      ctx.moveTo(headX - gw * 0.88, crTop + hh * 0.08);
      ctx.quadraticCurveTo(headX, crTop - hh * 0.16, headX + gw * 0.88, crTop + hh * 0.08);
      ctx.lineTo(headX + gw * 0.62, crTop + hh * 0.46);
      for (const [xk, dk] of [
        [0.5, 0.5],
        [0.34, 1.05],
        [0.18, 0.58],
        [0.02, 1.3],
        [-0.16, 0.6],
        [-0.34, 1.02],
        [-0.5, 0.48],
      ] as const) {
        ctx.lineTo(headX + xk * gw, crTop + hh * (0.42 + dk * 0.72 * (1 + 0.3 * (hv - 1))));
      }
      ctx.lineTo(headX - gw * 0.62, crTop + hh * 0.46);
      ctx.closePath();
      ctx.fill();
      // The center seam: a darker part line down the spine of the fall.
      ctx.strokeStyle = shade(gn.mane, -14);
      ctx.lineWidth = Math.max(1, hh * 0.07);
      ctx.beginPath();
      ctx.moveTo(headX, crTop + hh * 0.1);
      ctx.lineTo(headX + gw * 0.02, crTop + hh * (0.42 + 1.15 * 0.72 * (1 + 0.3 * (hv - 1))));
      ctx.stroke();
      if (gn.scarred) {
        // Frost tips streak the fall.
        ctx.strokeStyle = shade(gn.mane, 42);
        ctx.lineWidth = Math.max(1, hh * 0.05);
        for (const o of [-0.42, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(headX + o * gw * 0.6, crTop + hh * 0.3);
          ctx.lineTo(headX + o * gw * 0.68, crTop + hh * 1.0);
          ctx.stroke();
        }
      }
    }
    return;
  }

  // --- the muzzle: BLUNT and DEEP — the bone-cracker. Face-on it
  // hangs as a heavy box under the brow; at profile it runs out to
  // barely half the wolf's reach but twice the depth. FUR to the lip
  // with the dark mask riding the bridge — the old bare green box
  // read plush; a hyena's muzzle is coat, then black.
  const jawDrop = f.gape * hh * 0.42;
  const snLen = gw * (0.4 + 0.6 * profileK);
  const rootX = headX + fx * gw * 0.26;
  const tipX = rootX + fx * snLen;
  const snHw = gw * (0.46 - 0.12 * profileK);
  const x0 = Math.min(rootX, tipX) - snHw * (1 - profileK);
  const x1 = Math.max(rootX, tipX) + snHw * (1 - profileK);
  const topY = headY - hh * (0.16 - 0.05 * profileK);
  // Face-on the box runs DEEP — the bone-cracker jaw is most of the
  // face; a shallow muzzle under the pale chin read plush, not gnoll.
  const botY = headY + hh * (0.76 + 0.22 * (1 - profileK));
  const muzC = hurt ? '#ffffff' : shade(gn.fur, -4);
  ctx.fillStyle = muzC;
  ctx.beginPath();
  chamferRect(ctx, x0, topY, x1 - x0, botY - topY, [cut * 0.5, cut * 0.5, cut * 0.7, cut * 0.7]);
  ctx.fill();
  if (!hurt) {
    // The mask bridge, the form-split shade, and the deep jowl shadow
    // — the muzzle must read as a BOX with weight, never a snout
    // spike, and the dark saddle over it is the hyena's face.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, x0, topY, x1 - x0, botY - topY, [cut * 0.5, cut * 0.5, cut * 0.7, cut * 0.7]);
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -12);
    const shX = headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX;
    ctx.fillRect(shX, topY, x1 - shX, botY - topY);
    // The bridge: mask ink along the top of the box — at profile a
    // full saddle running out the snout; face-on a CENTER column down
    // to the nose, so the dark bridge, the brow, and the sockets stay
    // three separate marks instead of merging into one blob.
    const brCx = (x0 + x1) / 2 + fx * (x1 - x0) * 0.08;
    const brHw = ((x1 - x0) / 2) * (0.52 + 0.48 * profileK);
    ctx.fillStyle = mask;
    ctx.fillRect(brCx - brHw, topY, brHw * 2, (botY - topY) * 0.3);
    ctx.fillStyle = shade(gn.mask, -10);
    ctx.fillRect(brCx - brHw, topY, brHw * 2, (botY - topY) * 0.12);
    // Jowl under-shade seats the jaw.
    ctx.fillStyle = shade(gn.fur, -20);
    ctx.fillRect(x0, botY - hh * 0.14, x1 - x0, hh * 0.14);
    ctx.restore();
  }

  // --- the nose: broad and flat on the blunt tip, wider than tall.
  const nx = rootX + fx * snLen * 0.9;
  const ny = headY + hh * (0.08 * profileK) + (1 - profileK) * (botY - headY - hh * 0.34) - hh * 0.06;
  const nr = hh * 0.18 * (0.9 + 0.2 * hv);
  ctx.fillStyle = hurt ? '#ffffff' : gn.nose;
  ctx.beginPath();
  ctx.ellipse(nx, ny, nr * 1.3, nr * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(gn.nose, 22);
    ctx.beginPath();
    ctx.ellipse(nx - nr * 0.34, ny - nr * 0.3, nr * 0.42, nr * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- the mouth: mandible in pale underfur, dropping with the gape,
  // and THE UNDERBITE — lower teeth proud of the lip even shut, the
  // gnoll signature no other dialect carries (the skeleton grins, the
  // kobold bucks, the gnoll juts).
  // Narrow chin under the wide box — the mandible is a strap, never a
  // bib (the too-wide pale chin was the first cut's plush-toy tell).
  const mdHw = snHw * 0.56;
  const mdX = rootX + fx * snLen * 0.4;
  const mdTop = botY - hh * 0.06 + jawDrop;
  if (jawDrop > hh * 0.03) {
    // The open maw behind the dropped jaw — dark red meat, a tongue,
    // and the UPPER tooth row hanging into it: the cackle is a threat
    // display, and teeth are the whole message.
    ctx.fillStyle = hurt ? '#241a2e' : '#2e1418';
    ctx.beginPath();
    chamferRect(ctx, mdX - mdHw * 1.1, botY - hh * 0.1, mdHw * 2.2, mdTop - botY + hh * 0.16, cut * 0.25);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#7c3234';
      ctx.beginPath();
      ctx.ellipse(mdX + fx * mdHw * 0.2, mdTop - hh * 0.03, mdHw * 0.6, hh * 0.07 + jawDrop * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#efe6cf';
      for (const off of [-0.62, -0.05, 0.55]) {
        const ixT = mdX + fx * mdHw * 0.4 + off * mdHw * 0.72 * (1 - profileK * 0.4);
        ctx.beginPath();
        ctx.moveTo(ixT - hh * 0.045, botY - hh * 0.06);
        ctx.lineTo(ixT, botY - hh * 0.06 + hh * (off === -0.05 ? 0.13 : 0.2) + jawDrop * 0.2);
        ctx.lineTo(ixT + hh * 0.045, botY - hh * 0.06);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = hurt ? '#ffffff' : shade(gn.underfur, -16);
  ctx.beginPath();
  chamferRect(ctx, mdX - mdHw, mdTop, mdHw * 2, hh * 0.22, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();
  if (!hurt && jawDrop <= hh * 0.03) {
    // The shut-mouth seam: a dark lip line across the jaw so the maw
    // reads even at rest — a hyena's mouth is never NOT a threat.
    ctx.strokeStyle = mask === '#ffffff' ? mask : shade(gn.mask, -18);
    ctx.lineWidth = Math.max(1, hh * 0.055);
    ctx.beginPath();
    ctx.moveTo(mdX - mdHw * 0.9, mdTop + hh * 0.01);
    ctx.lineTo(mdX + mdHw * 0.9 + fx * mdHw * 0.3, mdTop + hh * 0.01);
    ctx.stroke();
  }
  if (!hurt) {
    // THE UPPER CANINES: two down-hooked fangs proud of the lip
    // corners even with the mouth shut — the first thing the eye
    // finds, and the single loudest "predator" cue on the whole body.
    ctx.fillStyle = '#e8dcc0';
    for (const sd of [-1, 1]) {
      if (sd !== nearSide && profileK > 0.78) continue;
      const ux = mdX + fx * mdHw * 0.5 + sd * mdHw * 1.02 * (1 - profileK * 0.45);
      const uy = mdTop + hh * 0.005;
      const fang = hh * 0.2 * (1 + 0.3 * (hv - 1));
      ctx.beginPath();
      ctx.moveTo(ux - hh * 0.055, uy - hh * 0.04);
      ctx.lineTo(ux + sd * hh * 0.02, uy + fang);
      ctx.lineTo(ux + hh * 0.055, uy - hh * 0.04);
      ctx.closePath();
      ctx.fill();
    }
    // The underbite row: up-pointing tusks off the mandible's leading
    // edge, riding the jaw as it drops. Taller than the first cut —
    // teeth are cheap to draw and expensive to ignore.
    ctx.fillStyle = '#efe6cf';
    const tRootY = mdTop + hh * 0.02;
    for (const [off, tall] of [[-0.55, 0.2], [0, 0.28], [0.55, 0.2]] as const) {
      const ix = mdX + fx * mdHw * 0.5 + off * mdHw * 0.5 * (1 - profileK * 0.4);
      ctx.beginPath();
      ctx.moveTo(ix - hh * 0.05, tRootY);
      ctx.lineTo(ix + fx * hh * 0.02, tRootY - hh * tall * (1 + 0.25 * (hv - 1)));
      ctx.lineTo(ix + hh * 0.05, tRootY);
      ctx.closePath();
      ctx.fill();
    }
    // Snarl creases: the bridge wrinkles up when the jaw drops — the
    // gape is a SNARL, not a yawn.
    if (f.gape > 0.25) {
      ctx.strokeStyle = mask === '#ffffff' ? mask : shade(gn.mask, -14);
      ctx.lineWidth = Math.max(1, hh * 0.04);
      for (const o of [0.16, 0.34]) {
        ctx.beginPath();
        ctx.moveTo(rootX + fx * snLen * o - snHw * 0.34 * (1 - profileK), topY + hh * (0.1 + o * 0.5));
        ctx.quadraticCurveTo(
          rootX + fx * snLen * (o + 0.16),
          topY + hh * (0.02 + o * 0.4),
          rootX + fx * snLen * o + snHw * 0.34 * (1 - profileK),
          topY + hh * (0.1 + o * 0.5),
        );
        ctx.stroke();
      }
    }
  }

  // --- the muzzle scar: the packlord's ledger, a pale seam raked
  // across the bridge on the near side.
  if (gn.scarred && !hurt) {
    ctx.strokeStyle = shade(gn.fur, 52);
    ctx.lineWidth = Math.max(1.5, hh * 0.07);
    const scx = rootX + fx * snLen * 0.5 + nearSide * snHw * 0.2;
    ctx.beginPath();
    ctx.moveTo(scx - hh * 0.12, topY + hh * 0.06);
    ctx.lineTo(scx + hh * 0.1, topY + hh * 0.54);
    ctx.stroke();
    // Two stitch ticks across it — an old wound, badly closed.
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const t of [0.3, 0.62]) {
      const px0 = scx - hh * 0.12 + (hh * 0.22) * t;
      const py0 = topY + hh * (0.06 + 0.48 * t);
      ctx.beginPath();
      ctx.moveTo(px0 - hh * 0.06, py0 + hh * 0.03);
      ctx.lineTo(px0 + hh * 0.06, py0 - hh * 0.03);
      ctx.stroke();
    }
  }

  // --- THE SCOWL: a heavy mask-dark brow ledge angled DOWN toward
  // the muzzle root — two wedges meeting in a V. This single mark
  // flips the face from curious to predatory; it paints OVER the
  // muzzle root so the brow visibly hoods the eyes.
  const eyeY = headY - hh * 0.26;
  const pairX = headX + fx * gw * 0.38;
  const eyeDx = gw * 0.37 * (1 - profileK * 0.5);
  if (!hurt) {
    ctx.fillStyle = mask;
    for (const sd of [-1, 1]) {
      if (sd !== nearSide && profileK > 0.78) continue;
      const inX = pairX + sd * gw * 0.04;
      const outX = pairX + sd * (eyeDx + gw * 0.3);
      ctx.beginPath();
      ctx.moveTo(inX, eyeY + hh * 0.02);
      ctx.lineTo(outX, eyeY - hh * 0.24);
      ctx.lineTo(outX + sd * gw * 0.02, eyeY - hh * 0.06);
      ctx.lineTo(inX + sd * gw * 0.02, eyeY + hh * 0.16);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- the eyes: small, close-set, SUNK under the brow — lit amber
  // beads in dark sockets, the scavenger's sizing-you-up squint,
  // never round wonder. The far eye slips around the corner at
  // profile.
  for (const sd of [-1, 1]) {
    if (sd !== nearSide && profileK > 0.78) continue;
    const ex = pairX + sd * eyeDx;
    const eyY = eyeY + hh * 0.05;
    if (!hurt) {
      // The socket: a mask-dark pocket the bead burns inside.
      ctx.fillStyle = shade(gn.mask, -12);
      ctx.beginPath();
      ctx.ellipse(ex, eyY, hh * 0.13, hh * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = gn.eye;
      ctx.beginPath();
      ctx.arc(ex, eyY, hh * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : gn.eye;
    ctx.beginPath();
    ctx.arc(ex, eyY, hh * 0.095, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(ex + fx * hh * 0.025, eyY + hh * 0.015, hh * 0.048, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * The crest hump: the gnoll's hunched shoulders drawn in the torso's
 * local frame AFTER the garment and BEFORE the head — high withers in
 * FUR (the scraps a gnoll wears never cover its own back) with the
 * mane's bristle ridge marching down the slope. The low-slung skull
 * sinks into it; face-on and from behind it reads as the bowed back
 * the whole species carries.
 */
export function paintGnollCrest(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: KoboldHumpFrame,
): void {
  const { tw, th, fx, backK, hurt } = f;
  const hv = gn.heavy;
  const cx = -fx * tw * 0.34;
  const cy = -th + th * 0.02;
  const rx = tw * (0.96 + 0.12 * backK);
  const ry = th * 0.36 * (1 + 0.3 * (hv - 1));
  const fur = hurt ? '#ffffff' : gn.fur;
  // The withers: a heavy shoulder boulder the skull sinks into — the
  // species' whole silhouette argument. It rises well ABOVE the torso
  // line so the back reads bowed from every band.
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, cy + ry * 0.4);
  ctx.lineTo(cx - rx, cy + ry * 0.4);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    // Form split over the hump, the shoulder dapple, then the mane
    // ridge marching the crown — the nape hood above pours into THIS.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -9);
    ctx.fillRect(cx, cy - ry, rx, ry * 2);
    ctx.fillStyle = shade(gn.fur, 8);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.4);
    // The dorsal mask: the dark saddle tone creeping over the trailing
    // slope of the hump — the hyena's back is darker than its flank.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gn.mask;
    ctx.fillRect(cx - fx * rx * 0.5 - rx * (1 - Math.abs(fx)) * 0.2, cy - ry, rx * 0.9, ry * 0.55);
    ctx.globalAlpha = 1;
    // The shoulder dapple: the hump is the coat's widest field — the
    // speckled read lives or dies here, seeded per body like the head.
    ctx.fillStyle = gn.spot;
    const seed = gn.seed ?? 0;
    for (let i = 0; i < 4; i++) {
      const h = ((seed >>> (i * 5)) ^ (seed * 53 + i * 131)) | 0;
      const sx = cx + (((h & 15) / 15) * 2 - 1) * rx * 0.7;
      const sy = cy - ry * 0.1 - ((h >> 4) & 7) / 7 * ry * 0.5;
      const sr = ry * (0.13 + 0.07 * (((h >> 7) & 3) / 3));
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr * 1.3, sr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // THE MANE RIDGE: one connected sawtooth band riding the crown
    // arc, teeth raking toward the tail — a standing ridge of bristle,
    // never separate pasted triangles. Taller on the packlord.
    const n = 6;
    const ridge = (inset: number, tallK: number, col: string): void => {
      ctx.fillStyle = col;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1;
        const bx = cx + t * rx * 0.72 * inset;
        const lift = Math.sqrt(Math.max(0, 1 - (t * 0.72 * inset) ** 2));
        const by = cy - ry * lift * 0.94;
        const tall =
          ry * (0.5 + 0.34 * Math.sin(i * 2.1 + 0.6)) * tallK * (1 + 0.6 * (hv - 1));
        if (!started) {
          ctx.moveTo(bx - tw * 0.1, by + ry * 0.18);
          started = true;
        }
        ctx.lineTo(bx - fx * tw * 0.12 + t * tw * 0.04, by - tall);
        ctx.lineTo(bx + tw * 0.1, by + ry * 0.1);
      }
      // The skirt closes the band back along the crown so the ridge
      // reads as one mass rooted in the hump.
      ctx.lineTo(cx + rx * 0.74 * inset, cy + ry * 0.06);
      ctx.lineTo(cx - rx * 0.74 * inset, cy + ry * 0.06);
      ctx.closePath();
      ctx.fill();
    };
    ridge(1, 1, gn.mane);
    if (gn.scarred) {
      // Packlord frost: a paler inner ridge over the iron one.
      ridge(0.82, 0.66, shade(gn.mane, 42));
    }
  }
}

/** Torso-local frame for the gnoll body coat overpaint. */
export interface GnollBodyFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
}

/**
 * THE BODY COAT — the gnoll's torso overpaint, drawn in the torso's
 * local frame AFTER the garment quad (which paints in plain fur) and
 * BEFORE the crest hump. It turns the flat tunic block into an
 * animal: pale belly panel face-on, the dark dorsal saddle from
 * behind, seeded rosettes on the flanks, a ragged pelt fringe over
 * the hip seam, and the scavenger's crude hide harness with its bone
 * fetishes — species dressing painted on, never equipment (nothing
 * here drops, so nothing here lies).
 */
export function paintGnollBody(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: GnollBodyFrame,
): void {
  const { s, tw, ww, th, fy, profileK, backK, lead, hurt } = f;
  const back = backK > 0.55;
  const frontK = Math.max(0, Math.min(1, (fy - 0.1) / 0.35));
  const seed = gn.seed ?? 0;
  if (hurt) return; // the hurt flash keeps the silhouette clean
  if (frontK > 0.05 && !back) {
    // The belly panel: pale underfur from the throat pit to the
    // waist, ragged along its edges — the soft underside every
    // predator body carries under a darker back.
    ctx.globalAlpha = frontK;
    ctx.fillStyle = shade(gn.underfur, -6);
    const bw = ww * 0.6 * (1 - profileK * 0.55);
    const yT = -th * 0.66;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.7, yT);
    ctx.quadraticCurveTo(0, yT - th * 0.08, bw * 0.7, yT);
    ctx.lineTo(bw, -th * 0.34);
    ctx.lineTo(bw * 0.8, -th * 0.3);
    ctx.lineTo(bw * 0.96, -th * 0.12);
    ctx.lineTo(bw * 0.72, 0.005 * s);
    ctx.lineTo(-bw * 0.72, 0.005 * s);
    ctx.lineTo(-bw * 0.96, -th * 0.12);
    ctx.lineTo(-bw * 0.8, -th * 0.3);
    ctx.lineTo(-bw, -th * 0.34);
    ctx.closePath();
    ctx.fill();
    // The chest shadow: the head hangs OVER this torso — a soft dark
    // pocket under the jaw line seats the slung skull.
    ctx.fillStyle = shade(gn.fur, -18);
    ctx.beginPath();
    ctx.ellipse(0, -th * 0.86, tw * 0.5, th * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (backK > 0.25) {
    // The dorsal fall: the MANE keeps going — a tapering column of
    // bristle in the mane's own ink pouring from under the hump down
    // the spine, ragged at its tip. One continuous read from crown to
    // mid-back, never a bib strapped over a tunic.
    ctx.globalAlpha = Math.min(1, backK * 1.3) * 0.9;
    ctx.fillStyle = gn.mane;
    const sw = tw * 0.56;
    ctx.beginPath();
    ctx.moveTo(-sw, -th * 0.99);
    ctx.lineTo(sw, -th * 0.99);
    ctx.lineTo(sw * 0.66, -th * 0.62);
    ctx.lineTo(sw * 0.4, -th * 0.68);
    ctx.lineTo(sw * 0.3, -th * 0.34);
    ctx.lineTo(sw * 0.06, -th * 0.5);
    ctx.lineTo(-sw * 0.08, -th * 0.2);
    ctx.lineTo(-sw * 0.3, -th * 0.56);
    ctx.lineTo(-sw * 0.52, -th * 0.44);
    ctx.lineTo(-sw * 0.66, -th * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The flank rosettes: the hyena dapple across the widest field the
  // body owns, seeded per body — a warband of individuals.
  ctx.fillStyle = gn.spot;
  for (let i = 0; i < 5; i++) {
    const h = ((seed >>> (i * 4)) ^ (seed * 71 + i * 113)) | 0;
    const sxr = ((h & 15) / 15) * 2 - 1;
    const u = ((h >> 4) & 15) / 15;
    const sx = sxr * tw * 0.72;
    // Spots live on the FLANKS: skip the belly center face-on.
    if (!back && frontK > 0.4 && Math.abs(sxr) < 0.4) continue;
    const sy = -th * (0.2 + 0.55 * u);
    const sr = th * (0.045 + 0.03 * (((h >> 8) & 3) / 3));
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * 1.35, sr, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The pelt fringe: ragged fur teeth breaking over the hip seam so
  // the torso ENDS in coat, never in a tailored hem.
  ctx.fillStyle = shade(gn.fur, -8);
  ctx.beginPath();
  const fw = ww * 1.06;
  ctx.moveTo(-fw, -0.035 * s);
  ctx.lineTo(fw, -0.035 * s);
  for (let i = 5; i >= 0; i--) {
    const u = i / 5;
    const bx = -fw + u * 2 * fw;
    const drop = 0.034 * s * (0.7 + 0.5 * Math.sin(i * 2.4 + seed * 0.7));
    ctx.lineTo(bx + fw * 0.09, 0.01 * s);
    ctx.lineTo(bx, 0.01 * s + drop);
  }
  ctx.closePath();
  ctx.fill();
  // THE HARNESS: one crude hide strap slung shoulder-to-hip — the
  // scavenger's only tailoring. It crosses the chest face-on and the
  // back from behind (a real strap wraps the body), and carries its
  // bone fetishes only on the chest run.
  const strap = '#3a2a1a';
  const sx0 = lead * tw * 0.72;
  const sy0 = -th * 0.94;
  const sx1 = -lead * ww * 0.8;
  const sy1 = -0.03 * s;
  ctx.strokeStyle = strap;
  ctx.lineWidth = Math.max(2, s * 0.042);
  ctx.beginPath();
  ctx.moveTo(sx0, sy0);
  ctx.lineTo(sx1, sy1);
  ctx.stroke();
  // The strap's worn highlight — leather, not a painted line.
  ctx.strokeStyle = shade(strap, 20);
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(sx0 - lead * s * 0.008, sy0 + s * 0.006);
  ctx.lineTo(sx1 - lead * s * 0.008, sy1 + s * 0.006);
  ctx.stroke();
  if (!back && frontK > 0.3) {
    // Bone fetishes riding the strap: teeth taken off things it ate.
    // The packlord strings more of them — rank counted in trophies.
    const nT = gn.scarred ? 4 : 2;
    for (let i = 0; i < nT; i++) {
      const u = 0.3 + (i / Math.max(1, nT - 1)) * 0.3;
      const bx = sx0 + (sx1 - sx0) * u;
      const by = sy0 + (sy1 - sy0) * u + s * 0.012;
      ctx.fillStyle = '#d8cbaa';
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.012, by);
      ctx.lineTo(bx + (i % 2 === 0 ? 1 : -1) * s * 0.006, by + s * 0.036);
      ctx.lineTo(bx + s * 0.012, by);
      ctx.closePath();
      ctx.fill();
    }
    if (gn.scarred) {
      // The packlord's iron ring cinching the strap mid-chest.
      ctx.strokeStyle = '#5d6068';
      ctx.lineWidth = Math.max(1.5, s * 0.014);
      ctx.beginPath();
      ctx.arc(sx0 + (sx1 - sx0) * 0.5, sy0 + (sy1 - sy0) * 0.5, s * 0.028, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}


export function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const skel = rig.skeletal ?? null;
  const kob = rig.kobold ?? null;
  const gno = rig.gnoll ?? null;
  const gol = rig.golem ?? null;
  const skin = rig.hurt
    ? '#ffffff'
    : (skel?.bone ?? rig.skinColor ?? (rig.look ? SKIN_TONES[rig.look.skin]! : SKIN));
  const bodyColor = rig.hurt ? '#ffffff' : (itemDef(rig.bodyItem ?? '')?.color ?? rig.bodyColor);

  const fx = Math.cos(rig.dir);
  const fy = Math.sin(rig.dir);
  const px = -fy;
  const py = fx;
  // Facing bands, shared by the face, the helmet, and the armor.
  const profileK = Math.abs(fx);
  const backK = Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)); // 1 = facing away
  const lead = fx >= 0 ? 1 : -1;

  // Equipment styles, resolved once per frame (Record lookups).
  //
  // THE WORN LIGHT overlays each piece's working onto its resolved
  // style here — the same trick enchantedStyle has always played on
  // weapons, now for the rest of the body. Styles are plain data, so a
  // shallow clone re-aims a painter without touching any silhouette,
  // and a def that authored its own rune color simply gets recolored to
  // the bonded school (its shapes survive, its hue answers the enchant).
  const worn = resolveWornLight(rig.armorEnch);
  const bodySt = withArx(rig.bodyItem, rig.bodyItem ? bodyStyle(rig.bodyItem) : null, worn.slots.body);
  const legSt = withArx(rig.legsItem, rig.legsItem ? legStyle(rig.legsItem) : null, worn.slots.legs);
  const bootSt = withArx(rig.bootsItem, rig.bootsItem ? bootStyle(rig.bootsItem) : null, worn.slots.boots);
  const offSt = withArx(rig.offhandItem, rig.offhandItem ? offhandStyle(rig.offhandItem) : null, worn.slots.offhand);
  const gloveSt = withArx(rig.glovesItem, rig.glovesItem ? gloveStyle(rig.glovesItem) : null, worn.slots.gloves);
  // A shield is not an item held in a fist — it is a PLANE the body
  // stands behind, with its own dialect (shields.ts). Resolving it here
  // takes the offhand out of the held-item vocabulary entirely.
  const shieldSt: ShieldStyle | null = withArx(
    rig.offhandItem ? `shield:${rig.offhandItem}` : undefined,
    offSt && rig.offhandItem && isShieldKind(offSt.kind)
      ? shieldStyle(rig.offhandItem, offSt.kind, offSt.color, offSt.trim, offSt.boss)
      : null,
    worn.slots.offhand,
  );

  // Sneak crouch: dropping the hip line shortens the leg chain so the IK
  // bends the knees for free, and the whole arm frame (armY/shoulderY)
  // hangs off hipY so the weapon carriage ducks with the body. Milking
  // settles into a shallower working crouch at the flank.
  const crouch =
    rig.pose === PoseState.Sneak
      ? Math.min(1, rig.poseT)
      : rig.pose === PoseState.Milk
        ? 0.55 * Math.min(1, rig.poseT)
        : 0;
  const sit = rig.sitT ?? 0;
  // A furniture sit: the hips ride the SEAT surface, not the ground.
  const chairSit = sit > 0 && rig.sitStyle !== undefined && rig.sitStyle !== 'floor';

  // The body rides the hip line, which rides the gait bob. Seated on
  // the ground, the hip line settles a hand's width off it; mounted
  // on furniture, it settles at the seat's own surface height — the
  // whole upper body (armY/shoulderY hang off hipY) comes down (or
  // up onto the throne) with it.
  const seatLift = chairSit ? (rig.seatH ?? 0.34) : 0.13;
  const hipYStand = rig.y - (rig.rise + rig.bob * 0.45) * s + 0.11 * s * crouch;
  const hipY = hipYStand + (rig.y - seatLift * s - hipYStand) * sit;

  // ---- legs: two-bone IK from SCREEN-FIXED hips to planted feet.
  const L = (LEG_LEN / 2) * s;
  for (let i = 0; i < 2; i++) {
    const sgn = i === 0 ? -1 : 1;
    const foot = rig.feet[i];
    if (!foot) continue;
    const hipX = rig.x + sgn * HIP_HALF * s;
    const footScreenY = foot.y - foot.lift * s;

    let ex = foot.x - hipX;
    let ey = footScreenY - hipY;
    let d = Math.hypot(ex, ey) || 1;
    // Legs may straighten fully and stretch a touch (bounding at speed).
    const dMax = L * 2 * STRETCH;
    if (d > dMax) {
      ex *= dMax / d;
      ey *= dMax / d;
      d = dMax;
    }

    // Knee: anatomical pole — bends with the FACING (sagittal side-on,
    // gentle down/outward front-on), never with travel, so backpedal
    // and strafe keep honest knees; hysteresis smooths the boundary.
    const bend = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2));
    const cxn = -ey / d;
    const cyn = ex / d;
    // Seated ON THE GROUND, the anatomical pole yields to gravity's
    // law: a bent knee always rises UP-SCREEN — folding down would
    // bury it in the ground. A chair sit keeps the anatomical pole:
    // hips ride the seat, shins drop to the floor, and the knee folds
    // with the facing exactly as a standing bend would.
    const sign =
      sit > 0.4 && !chairSit
        ? cyn > 0
          ? -1
          : 1
        : chooseKneeSign(cxn, cyn, fx, fy, sgn, rig.kneeMemory[i] ?? 0);
    rig.kneeMemory[i] = sign;
    const kx = hipX + ex / 2 + cxn * sign * bend;
    const ky = hipY + ey / 2 + cyn * sign * bend;
    const kn = KNEE_SCRATCH[i]!;
    kn.x = kx;
    kn.y = ky;
    kn.d = d;
    const lp = LEG_POSE_SCRATCH[i]!;
    lp.hipX = hipX;
    lp.footX = hipX + ex;
    lp.footY = hipY + ey;
  }

  // THE LEG LAYER: solved above (the knee scratch feeds the seated arm
  // vocabulary), painted HERE as a deferred closure so the depth ladder
  // below can slip far-side gear underneath it (THE FAR SIDE GOES
  // BEHIND THE LEGS). Same pixels as the old inline paint: nothing
  // else painted between the old site and the ladder.
  const paintLegs = (): void => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 2; i++) {
      if (!rig.feet[i]) continue;
      const lp = LEG_POSE_SCRATCH[i]!;
      const hipX = lp.hipX;
      const kx = KNEE_SCRATCH[i]!.x;
      const ky = KNEE_SCRATCH[i]!.y;
      const fxx = lp.footX;
      const fyy = lp.footY;
      // Leg dressing: thigh and shin as separate strokes so greaves and
      // wraps can recolor the lower leg; default = today's exact colors.
      // Skeletal legs are bare bone: femur thicker than tibia, a condyle
      // knob at the knee — no cloth ever dressed these.
      // Kobold legs are bare scaled hide, never cloth — the shin a
      // touch darker so the digitigrade read survives at distance.
      const baseLeg = skel
        ? shade(skel.bone, -3)
        : kob
          ? shade(kob.hide, -5)
          : gno
            ? shade(gno.fur, -5)
            : gol
              ? shade(gol.shell, -4)
              : rig.look
                ? shade(CLOTH_COLORS[rig.look.pants]!, -8)
                : shade(bodyColor, -28);
      const thighCol = rig.hurt ? '#ffffff' : (legSt?.thigh ?? baseLeg);
      const shinCol = rig.hurt
        ? '#ffffff'
        : skel
          ? skel.bone
          : kob
            ? shade(kob.hide, -12)
            : gno
              ? shade(gno.fur, -14)
              : gol
                ? shade(gol.shell, -12)
                : (legSt?.shin ?? legSt?.thigh ?? baseLeg);
      // THE FOOT CAPS THE LEG: the shin stroke ends at the ANKLE — the
      // endpoint pulled back up the bone so its round cap tucks inside
      // the footwear painted below. Stroked all the way to the sole, the
      // cap's half-disc poked out under every foot chip at zoom.
      const shinLen0 = Math.hypot(fxx - kx, fyy - ky) || 1;
      const aux = (fxx - kx) / shinLen0;
      const auy = (fyy - ky) / shinLen0;
      // The gnoll leg TAPERS: a heavy furred haunch over a leaner
      // shank — the digitigrade read on a two-bone rig, mass up top
      // where the hunched species carries it.
      const shinLW = Math.max(
        2,
        s * (skel ? 0.052 * skel.heavy : bootSt ? 0.1 : gno ? 0.078 : gol ? 0.128 : 0.09),
      );
      const ankPull = shinLW * 0.55;
      const ankX = fxx - aux * ankPull;
      const ankY = fyy - auy * ankPull;
      ctx.strokeStyle = thighCol;
      ctx.lineWidth = Math.max(
        2,
        s *
          (skel
            ? 0.066 * skel.heavy
            : gno
              ? 0.126 * (0.9 + 0.2 * gno.heavy)
              : gol
                ? 0.165 * (0.9 + 0.2 * gol.heavy)
                : 0.09),
      );
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kx, ky);
      if (shinCol === thighCol && !skel && !gno && !gol) {
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
      } else {
        ctx.stroke();
        ctx.strokeStyle = shinCol;
        if (skel || gno || gol) ctx.lineWidth = shinLW;
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
      }
      if (gno && !rig.hurt) {
        // The hock tuft: a ragged fur wedge off the knee's trailing
        // edge — the joint breaks like coat, and the tapered shank
        // below it reads as an animal's hock, not a shaved calf.
        const outX = Math.abs(fx) > 0.35 ? -Math.sign(fx) : i === 0 ? -1 : 1;
        ctx.fillStyle = shade(gno.fur, -7);
        ctx.beginPath();
        ctx.moveTo(kx + outX * 0.02 * s, ky - 0.045 * s);
        ctx.lineTo(kx + outX * 0.095 * s * (0.9 + 0.2 * gno.heavy), ky + 0.01 * s);
        ctx.lineTo(kx + outX * 0.015 * s, ky + 0.04 * s);
        ctx.closePath();
        ctx.fill();
      }
      if (skel) {
        // Knee condyle: the joint knob, wider than either shaft, with a
        // dark seam line — the articulation mark of the bone dialect.
        ctx.fillStyle = rig.hurt ? '#ffffff' : skel.bone;
        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(1.8, s * 0.042 * skel.heavy), 0, Math.PI * 2);
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(skel.bone, -22);
          ctx.fillRect(kx - s * 0.028 * skel.heavy, ky - s * 0.007, s * 0.056 * skel.heavy, s * 0.014);
        }
      }
      // Knee dressing: a plate chip riding the shin's angle, or wraps.
      if (legSt?.knee === 'plate' && !rig.hurt) {
        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate(Math.atan2(fyy - ky, fxx - kx) - Math.PI / 2);
        ctx.fillStyle = legSt.kneeColor ?? shinCol;
        ctx.beginPath();
        chamferRect(ctx, -0.055 * s, -0.045 * s, 0.11 * s, 0.1 * s, 0.025 * s);
        ctx.fill();
        ctx.fillStyle = shade(legSt.kneeColor ?? shinCol, 14);
        ctx.fillRect(-0.04 * s, -0.038 * s, 0.08 * s, 0.028 * s);
        ctx.restore();
      } else if (legSt?.knee === 'wrap' && !rig.hurt) {
        ctx.strokeStyle = legSt.kneeColor ?? shade(shinCol, -16);
        ctx.lineWidth = Math.max(1.5, s * 0.028);
        for (const o of [-0.02, 0.025]) {
          ctx.beginPath();
          ctx.moveTo(kx - 0.05 * s, ky + o * s - 0.012 * s);
          ctx.lineTo(kx + 0.05 * s, ky + o * s + 0.012 * s);
          ctx.stroke();
        }
        ctx.lineWidth = Math.max(2, s * 0.09);
      }

      // THE HUNTER'S LEGS — the leather lane's one-owner leg words.
      // Each paints ON the limb's own solved geometry (segments and
      // normals), so it rides every gait for free. One-sided words
      // pick the outward side the way the gnoll hock does.
      if (legSt && !rig.hurt && !skel && !kob && !gno) {
        const outX = Math.abs(fx) > 0.35 ? -Math.sign(fx) : i === 0 ? -1 : 1;
        // Thigh segment frame (hip→knee) for thigh-mounted words.
        const tLen = Math.hypot(kx - hipX, ky - hipY) || 1;
        const tux = (kx - hipX) / tLen;
        const tuy = (ky - hipY) / tLen;
        if (legSt.hock) {
          // Hare-fur hocks: a pale tuft off the back of the ankle —
          // three round flicks and a seat wedge, the spring visible.
          ctx.fillStyle = legSt.hock.color;
          ctx.beginPath();
          ctx.moveTo(ankX + outX * 0.012 * s, ankY - 0.052 * s);
          ctx.lineTo(ankX + outX * 0.062 * s, ankY - 0.012 * s);
          ctx.lineTo(ankX + outX * 0.014 * s, ankY + 0.014 * s);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = legSt.hock.color;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.014);
          for (const [dx, dy] of [[0.07, -0.05], [0.085, -0.015], [0.075, 0.02]] as const) {
            ctx.beginPath();
            ctx.moveTo(ankX + outX * 0.02 * s, ankY - 0.02 * s);
            ctx.lineTo(ankX + outX * dx * s, ankY + dy * s);
            ctx.stroke();
          }
        }
        if (legSt.calffin) {
          // The calf fin: one small swept blade off the outer shin,
          // back-raked, bright leading edge — sharp even at a walk.
          const bk = 0.34;
          const bx = kx + (ankX - kx) * bk;
          const by = ky + (ankY - ky) * bk;
          ctx.fillStyle = legSt.calffin.color;
          ctx.beginPath();
          ctx.moveTo(bx, by - 0.008 * s);
          ctx.lineTo(bx + outX * 0.044 * s, by + 0.022 * s);
          ctx.lineTo(bx, by + 0.034 * s);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = legSt.calffin.edge;
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.moveTo(bx, by - 0.008 * s);
          ctx.lineTo(bx + outX * 0.044 * s, by + 0.022 * s);
          ctx.stroke();
        }
        if (legSt.wader) {
          // Waxed waders: the lower shin recolored to a hard
          // waterline break, one lit rim where the wax catches.
          const bk = 0.42;
          const bx = kx + (ankX - kx) * bk;
          const by = ky + (ankY - ky) * bk;
          ctx.strokeStyle = legSt.wader.color;
          ctx.lineWidth = Math.max(2, s * 0.1);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(ankX, ankY);
          ctx.stroke();
          ctx.strokeStyle = legSt.wader.rim;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(bx - auy * 0.055 * s, by + aux * 0.055 * s);
          ctx.lineTo(bx + auy * 0.055 * s, by - aux * 0.055 * s);
          ctx.stroke();
        }
        if (legSt.sock) {
          // The fox's socks: dark from mid-shin down, tied off with
          // an ember knot and one loose end.
          const bk = 0.5;
          const bx = kx + (ankX - kx) * bk;
          const by = ky + (ankY - ky) * bk;
          ctx.strokeStyle = legSt.sock.color;
          ctx.lineWidth = Math.max(2, s * 0.096);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(ankX, ankY);
          ctx.stroke();
          if (legSt.sock.tie) {
            ctx.fillStyle = legSt.sock.tie;
            ctx.beginPath();
            ctx.arc(bx + outX * 0.045 * s, by, Math.max(1.2, s * 0.018), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = legSt.sock.tie;
            ctx.lineWidth = Math.max(1, s * 0.012);
            ctx.beginPath();
            ctx.moveTo(bx + outX * 0.045 * s, by);
            ctx.lineTo(bx + outX * 0.06 * s, by + 0.045 * s);
            ctx.stroke();
          }
        }
        if (legSt.shinlace) {
          // Snare-cord lacing: three X crossings climbing the shin.
          ctx.strokeStyle = legSt.shinlace.color;
          ctx.lineWidth = Math.max(1, s * 0.013);
          for (const k of [0.2, 0.48, 0.76]) {
            const cxx = kx + (ankX - kx) * k;
            const cyy = ky + (ankY - ky) * k;
            const w = 0.05 * s;
            const h = 0.028 * s;
            ctx.beginPath();
            ctx.moveTo(cxx - w, cyy - h);
            ctx.lineTo(cxx + w, cyy + h);
            ctx.moveTo(cxx - w, cyy + h);
            ctx.lineTo(cxx + w, cyy - h);
            ctx.stroke();
          }
        }
        if (legSt.mossbind) {
          // Moss-bound bands: two green wraps on the shin, tufts
          // spilling off each band's lower edge.
          ctx.strokeStyle = legSt.mossbind.color;
          ctx.lineWidth = Math.max(1.5, s * 0.03);
          for (const k of [0.3, 0.62]) {
            const cxx = kx + (ankX - kx) * k;
            const cyy = ky + (ankY - ky) * k;
            ctx.beginPath();
            ctx.moveTo(cxx - 0.05 * s, cyy - 0.012 * s);
            ctx.lineTo(cxx + 0.05 * s, cyy + 0.012 * s);
            ctx.stroke();
          }
          ctx.strokeStyle = legSt.mossbind.tuft;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.013);
          for (const [k, dx] of [[0.34, 0.045], [0.66, -0.04], [0.64, 0.05]] as const) {
            const cxx = kx + (ankX - kx) * k;
            const cyy = ky + (ankY - ky) * k;
            ctx.beginPath();
            ctx.moveTo(cxx, cyy);
            ctx.lineTo(cxx + dx * s, cyy + 0.035 * s);
            ctx.stroke();
          }
        }
        if (legSt.furknee) {
          // Winter fur bursting over the knee: a lumpy pale cap with
          // guard hairs flicking down and out.
          ctx.fillStyle = legSt.furknee.color;
          ctx.beginPath();
          ctx.arc(kx, ky - 0.02 * s, 0.055 * s, Math.PI * 0.95, Math.PI * 2.05);
          ctx.quadraticCurveTo(kx + 0.03 * s, ky + 0.03 * s, kx - 0.01 * s, ky + 0.025 * s);
          ctx.quadraticCurveTo(kx - 0.045 * s, ky + 0.03 * s, kx - 0.055 * s, ky - 0.01 * s);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = legSt.furknee.color;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.014);
          for (const [dx, dy] of [[-0.05, 0.05], [0.01, 0.06], [0.055, 0.045]] as const) {
            ctx.beginPath();
            ctx.moveTo(kx + dx * s * 0.4, ky + 0.01 * s);
            ctx.lineTo(kx + dx * s, ky + dy * s);
            ctx.stroke();
          }
        }
        if (legSt.scalerows) {
          // THE SCALED THIGH: three lapped scute bands riding the
          // solved thigh, hip to knee, painted bottom-up so uppers
          // lap lowers — the plastron's language carried down, in
          // the legs' muted register (bright edges on small leg
          // devices read as floating teeth; the glint budget lives
          // on the torso and head).
          const srw = legSt.scalerows;
          for (const [bi, k] of [[2, 0.78], [1, 0.52], [0, 0.26]] as const) {
            const cxx = hipX + tux * tLen * k + outX * 0.006 * s;
            const cyy = hipY + tuy * tLen * k;
            const w = 0.062 * s * (1 - bi * 0.12);
            const h = 0.05 * s;
            ctx.fillStyle = shade(srw.plate, -4 - bi * 7);
            ctx.beginPath();
            ctx.moveTo(cxx - w, cyy - h * 0.5);
            ctx.lineTo(cxx + w, cyy - h * 0.5);
            ctx.lineTo(cxx + w * 0.86, cyy + h * 0.34);
            ctx.quadraticCurveTo(cxx, cyy + h * 0.62, cxx - w * 0.86, cyy + h * 0.34);
            ctx.closePath();
            ctx.fill();
            // The under-lap shadow line — never a bright rim.
            ctx.strokeStyle = shade(srw.plate, -26);
            ctx.lineWidth = Math.max(1, s * 0.01);
            ctx.beginPath();
            ctx.moveTo(cxx - w * 0.86, cyy + h * 0.36);
            ctx.quadraticCurveTo(cxx, cyy + h * 0.64, cxx + w * 0.86, cyy + h * 0.36);
            ctx.stroke();
            // One keel tick per band — the forge seam continued.
            ctx.fillStyle = shade(srw.plate, -18);
            ctx.fillRect(cxx - 0.006 * s, cyy - h * 0.4, 0.012 * s, h * 0.66);
          }
        }
        if (legSt.shadewrap) {
          // The veil's language carried to the ground: three hard
          // turns of dark cloth wound down the shin, edges on the
          // diagonal — bands, never a gradient.
          const swp = legSt.shadewrap;
          ctx.strokeStyle = swp.color;
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          for (const k of [0.28, 0.52, 0.76]) {
            const px = kx + (ankX - kx) * k;
            const py = ky + (ankY - ky) * k;
            ctx.beginPath();
            ctx.moveTo(px - 0.024 * s, py - 0.01 * s);
            ctx.lineTo(px + 0.024 * s, py + 0.008 * s);
            ctx.stroke();
          }
          // The tie: one loose end off the outward ankle — one leg
          // only; on both it reads as uniform print.
          if (i === 0 && swp.tie) {
            ctx.strokeStyle = swp.tie;
            ctx.lineWidth = Math.max(1, s * 0.009);
            ctx.beginPath();
            ctx.moveTo(ankX + outX * 0.014 * s, ankY - 0.024 * s);
            ctx.lineTo(ankX + outX * 0.038 * s, ankY - 0.004 * s);
            ctx.stroke();
          }
        }
        // One-sided words dress a single leg — a roll on both thighs
        // reads as uniform print, on one it reads as gear.
        if (i === 0) {
          if (legSt.thighsheath) {
            // The Knife's spare, flat to the outer thigh — muted
            // register (bright edges on small leg devices float as
            // teeth; the calffin verdict).
            const ts2 = legSt.thighsheath;
            const cxx = hipX + tux * tLen * 0.42 + outX * 0.024 * s;
            const cyy = hipY + tuy * tLen * 0.42;
            ctx.save();
            ctx.translate(cxx, cyy);
            ctx.rotate(Math.atan2(tuy, tux) - Math.PI / 2);
            ctx.fillStyle = ts2.sheath;
            chamferRect(ctx, -0.019 * s, -0.048 * s, 0.038 * s, 0.098 * s, 0.009 * s);
            ctx.fill();
            ctx.strokeStyle = shade(ts2.sheath, -22);
            ctx.lineWidth = Math.max(1, s * 0.009);
            for (const o of [-0.022, 0.02]) {
              ctx.beginPath();
              ctx.moveTo(-0.019 * s, o * s);
              ctx.lineTo(0.019 * s, o * s);
              ctx.stroke();
            }
            // Grip stub and pommel above the throat — dulled brass,
            // no glint at the leg.
            ctx.fillStyle = shade(ts2.sheath, -32);
            ctx.fillRect(-0.006 * s, -0.06 * s, 0.012 * s, 0.013 * s);
            ctx.fillStyle = shade(ts2.pommel, -14);
            ctx.beginPath();
            ctx.arc(0, -0.066 * s, 0.01 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          if (legSt.pickroll) {
            // The thief's tool roll strapped flat to the thigh, pick
            // ends ticking out of the top.
            const cxx = hipX + tux * tLen * 0.5 + outX * 0.02 * s;
            const cyy = hipY + tuy * tLen * 0.5;
            ctx.save();
            ctx.translate(cxx, cyy);
            ctx.rotate(Math.atan2(tuy, tux) - Math.PI / 2);
            ctx.fillStyle = legSt.pickroll.color;
            chamferRect(ctx, -0.032 * s, -0.055 * s, 0.064 * s, 0.11 * s, 0.012 * s);
            ctx.fill();
            ctx.strokeStyle = shade(legSt.pickroll.color, -24);
            ctx.lineWidth = Math.max(1, s * 0.01);
            for (const o of [-0.028, 0.024]) {
              ctx.beginPath();
              ctx.moveTo(-0.032 * s, o * s);
              ctx.lineTo(0.032 * s, o * s);
              ctx.stroke();
            }
            ctx.strokeStyle = legSt.pickroll.glint ?? shade(legSt.pickroll.color, 34);
            ctx.lineWidth = Math.max(1, s * 0.011);
            for (const o of [-0.016, 0, 0.016]) {
              ctx.beginPath();
              ctx.moveTo(o * s, -0.055 * s);
              ctx.lineTo(o * s, -0.075 * s);
              ctx.stroke();
            }
            ctx.restore();
          }
          if (legSt.garter) {
            // The assassin's garter: one strap high on the thigh, a
            // sheathed blade hanging off its outward edge.
            const cxx = hipX + tux * tLen * 0.34;
            const cyy = hipY + tuy * tLen * 0.34;
            ctx.strokeStyle = legSt.garter.color;
            ctx.lineWidth = Math.max(1.5, s * 0.024);
            ctx.beginPath();
            ctx.moveTo(cxx - 0.05 * s, cyy - 0.008 * s);
            ctx.lineTo(cxx + 0.05 * s, cyy + 0.008 * s);
            ctx.stroke();
            if (legSt.garter.blade) {
              const bx2 = cxx + outX * 0.038 * s;
              ctx.fillStyle = shade(legSt.garter.color, -18);
              ctx.fillRect(bx2 - 0.012 * s, cyy, 0.024 * s, 0.062 * s);
              ctx.fillStyle = legSt.garter.blade;
              ctx.beginPath();
              ctx.moveTo(bx2 - 0.008 * s, cyy + 0.062 * s);
              ctx.lineTo(bx2 + 0.008 * s, cyy + 0.062 * s);
              ctx.lineTo(bx2, cyy + 0.095 * s);
              ctx.closePath();
              ctx.fill();
            }
          }
          if (legSt.roadpatch) {
            // The road's mending: a squared patch sewn slightly
            // askew on the thigh, stitch ticks at its corners.
            const cxx = hipX + tux * tLen * 0.55;
            const cyy = hipY + tuy * tLen * 0.55;
            ctx.save();
            ctx.translate(cxx, cyy);
            ctx.rotate(0.16 + Math.atan2(tuy, tux) - Math.PI / 2);
            ctx.fillStyle = legSt.roadpatch.color;
            ctx.fillRect(-0.03 * s, -0.03 * s, 0.06 * s, 0.06 * s);
            ctx.strokeStyle = shade(legSt.roadpatch.color, -26);
            ctx.lineWidth = Math.max(1, s * 0.008);
            for (const [x0, y0, x1, y1] of [
              [-0.03, -0.012, -0.02, -0.012],
              [0.02, 0.008, 0.03, 0.008],
              [-0.008, -0.03, -0.008, -0.02],
              [0.006, 0.02, 0.006, 0.03],
            ] as const) {
              ctx.beginPath();
              ctx.moveTo(x0 * s, y0 * s);
              ctx.lineTo(x1 * s, y1 * s);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, s * 0.09);
      }

      // THE GREAVES — the legs' channel. A thin light down the outside
      // of the thigh, brightest when the leg is EXTENDED.
      //
      // The pulse is taken from the limb's own geometry rather than a
      // clock: extension is how straight the leg currently is, so the
      // light swells at the top of each stride and dims through the
      // swing, for free and perfectly in phase. A leg lit off a timer
      // would drift against the walk cycle within seconds and read as
      // two animations fighting.
      if (legSt?.arx && !rig.hurt) {
        const mark = legSt.arx;
        const reach = Math.hypot(ankX - hipX, ankY - hipY);
        const span = Math.hypot(kx - hipX, ky - hipY) + shinLen0 || 1;
        const extend = Math.max(0, Math.min(1, (reach / span - 0.72) / 0.26));
        const base = markPulse(mark, rig.nowMs, SLOT_GLINT_PHASE.legs ?? 0, 0.8);
        const a = base * (0.45 + 0.55 * extend);
        if (a > 0.02) {
          // Offset to the outside of the bone so the light reads as a
          // fitting ON the greave, never as the leg itself glowing.
          const nx = -(ky - hipY);
          const ny = kx - hipX;
          const nl = Math.hypot(nx, ny) || 1;
          const off = s * 0.03;
          ctx.globalAlpha = Math.min(1, a * 0.9);
          ctx.strokeStyle = mark.mid;
          ctx.lineWidth = Math.max(1, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(hipX + (nx / nl) * off, hipY + (ny / nl) * off);
          ctx.lineTo(kx + (nx / nl) * off, ky + (ny / nl) * off);
          ctx.stroke();
          // A brighter cap at the knee: the line has a TERMINUS, which
          // is what separates a fitting from a smear of light.
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = mark.core;
          const cs = s * 0.02;
          ctx.fillRect(kx - cs / 2, ky - cs / 2, cs, cs);
          ctx.globalAlpha = 1;
        }
      }

      // Boots: a shaft climbing the shin, folded cuff, foot, toe cap —
      // or the bare hardcoded chip when nothing is worn.
      const bootCol = rig.hurt ? '#ffffff' : (bootSt?.color ?? BOOT);
      if (bootSt) {
        const shinLen = Math.hypot(fxx - kx, fyy - ky) || 1;
        const hK = Math.min(1, (bootSt.height * s) / shinLen);
        const topX = fxx + (kx - fxx) * hK;
        const topY = fyy + (ky - fyy) * hK;
        ctx.strokeStyle = bootCol;
        ctx.lineWidth = Math.max(2.5, s * 0.1);
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
        if (bootSt.cuff && !rig.hurt) {
          ctx.strokeStyle = bootSt.cuff.color;
          ctx.lineWidth = Math.max(2.5, s * 0.115);
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(topX + (fxx - topX) * 0.22, topY + (fyy - topY) * 0.22);
          ctx.stroke();
        }
        // THE ANKLE BAND — the boots' body-space mark. Small, because
        // the boots already own the loudest channel in the grammar (the
        // trail) and this is not a second voice. Its only job is to
        // ATTACH that trail to a wearer: without a lit ankle the prints
        // read as ground decoration that happens to follow someone, and
        // with one they read as light coming off these boots.
        if (bootSt.arx && !rig.hurt) {
          const mark = bootSt.arx;
          const a = markPulse(mark, rig.nowMs, SLOT_GLINT_PHASE.boots ?? 0, 1.1);
          if (a > 0.02) {
            const dxn = (fxx - topX) / shinLen;
            const dyn = (fyy - topY) / shinLen;
            const px = -dyn;
            const py = dxn;
            const w = 0.05 * s;
            const bx = topX + (fxx - topX) * 0.32;
            const by = topY + (fyy - topY) * 0.32;
            ctx.globalAlpha = Math.min(1, a * 0.95);
            ctx.strokeStyle = mark.mid;
            ctx.lineWidth = Math.max(1.2, s * 0.022);
            ctx.beginPath();
            ctx.moveTo(bx + px * w, by + py * w);
            ctx.lineTo(bx - px * w, by - py * w);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        if (bootSt.spike && !rig.hurt) {
          // A knee-spike off the shaft top — dread sabatons bite upward.
          ctx.fillStyle = bootSt.toe ?? shade(bootCol, 18);
          ctx.beginPath();
          ctx.moveTo(topX + lead * 0.015 * s, topY + 0.015 * s);
          ctx.lineTo(topX + lead * 0.085 * s, topY - 0.055 * s);
          ctx.lineTo(topX + lead * 0.045 * s, topY + 0.035 * s);
          ctx.closePath();
          ctx.fill();
        }
        if (bootSt.wrap && !rig.hurt) {
          // Crossed straps lacing the shaft — drawn along the solved shin
          // so the X climbs the leg at any facing or terrain lift.
          const dxn = (fxx - topX) / shinLen;
          const dyn = (fyy - topY) / shinLen;
          const px = -dyn;
          const py = dxn;
          const w = 0.056 * s;
          ctx.strokeStyle = bootSt.wrap.color;
          ctx.lineWidth = Math.max(1.5, s * 0.032);
          ctx.beginPath();
          for (const [t0, t1] of [[0.1, 0.55], [0.55, 0.1]] as const) {
            ctx.moveTo(topX + (fxx - topX) * t0 + px * w, topY + (fyy - topY) * t0 + py * w);
            ctx.lineTo(topX + (fxx - topX) * t1 - px * w, topY + (fyy - topY) * t1 - py * w);
          }
          ctx.stroke();
        }
        if (bootSt.fur && !rig.hurt) {
          // A lumpy fur top instead of a clean cuff — winter boots.
          ctx.fillStyle = bootSt.fur.color;
          for (let i = 0; i < 3; i++) {
            const u = -1 + i;
            ctx.beginPath();
            ctx.arc(
              topX + u * 0.048 * s,
              topY + Math.sin(i * 2.4) * 0.012 * s,
              (0.04 + 0.009 * Math.sin(i * 3.1)) * s,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        ctx.lineWidth = Math.max(2, s * 0.09);
      }
      if (skel) {
        // Bare bone foot: a narrower chip split by dark toe seams on the
        // leading half — metatarsals, not a boot.
        ctx.fillStyle = rig.hurt ? '#ffffff' : skel.bone;
        ctx.beginPath();
        chamferRect(ctx, fxx - 0.068 * s, fyy - 0.026 * s, 0.136 * s, 0.052 * s, 0.018 * s);
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(skel.bone, -28);
          for (const ot of [0.018, 0.048]) {
            ctx.fillRect(fxx + lead * ot * s, fyy - 0.018 * s, 0.013 * s, 0.036 * s);
          }
        }
      } else if (gno && !bootSt) {
        // The bare gnoll paw: BROAD and heavy — a digger's foot wider
        // than the shank above it, hide-toned under the fur, with
        // three dark claw hooks raking off the leading edge — a
        // scavenger walks on what it was born with.
        const gv = 0.92 + 0.16 * gno.heavy;
        ctx.fillStyle = rig.hurt ? '#ffffff' : shade(gno.skin, -6);
        ctx.beginPath();
        chamferRect(ctx, fxx - 0.095 * s * gv, fyy - 0.034 * s, 0.19 * s * gv, 0.068 * s, 0.024 * s);
        ctx.fill();
        if (!rig.hurt) {
          // A fur cuff where the shin meets the paw — stitches the
          // coat to the bare foot so the ankle never reads cut off.
          ctx.fillStyle = shade(gno.fur, -10);
          ctx.beginPath();
          chamferRect(ctx, fxx - 0.07 * s * gv, fyy - 0.054 * s, 0.14 * s * gv, 0.032 * s, 0.013 * s);
          ctx.fill();
          // Toe seams split the pad — a foot with anatomy.
          ctx.strokeStyle = shade(gno.skin, -24);
          ctx.lineWidth = Math.max(1, 0.012 * s);
          for (const o of [-0.012, 0.02]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.045 * s, fyy + o * s - 0.01 * s);
            ctx.lineTo(fxx + lead * 0.085 * s * gv, fyy + o * s);
            ctx.stroke();
          }
          ctx.fillStyle = shade(gno.mask, -12);
          for (const o of [-0.026, -0.002, 0.022]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.082 * s * gv, fyy + o * s - 0.008 * s);
            ctx.lineTo(fxx + lead * 0.128 * s * gv, fyy + o * s + 0.005 * s);
            ctx.lineTo(fxx + lead * 0.082 * s * gv, fyy + o * s + 0.014 * s);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (gol && !bootSt) {
        // The construct footing: a slab wider than any boot — stone
        // block, riveted sabaton, cracked pad, or faceted wedge per
        // build. A golem stands on its own architecture.
        paintGolemFoot(ctx, gol, fxx, fyy, s, lead, rig.hurt);
      } else if (kob && !bootSt) {
        // The bare kobold foot: a scaled chip, slightly narrow, with
        // pale claw ticks raking off the leading edge — no kobold ever
        // owned boots worth drawing.
        ctx.fillStyle = rig.hurt ? '#ffffff' : shade(kob.hide, -8);
        ctx.beginPath();
        chamferRect(ctx, fxx - 0.07 * s, fyy - 0.028 * s, 0.14 * s, 0.056 * s, 0.02 * s);
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(kob.belly, 10);
          for (const o of [-0.02, 0.012]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.062 * s, fyy + o * s - 0.008 * s);
            ctx.lineTo(fxx + lead * 0.095 * s, fyy + o * s + 0.004 * s);
            ctx.lineTo(fxx + lead * 0.062 * s, fyy + o * s + 0.014 * s);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else {
        // The shoe: a heel-to-toe sole block pointed by the facing, an
        // instep collar carrying the leg's line down into it, a sole
        // shadow along the ground and a lit toe face at profile —
        // footwear with anatomy, not a floating pill.
        const toe = fx * 0.026 * s;
        const fw = 0.082 * s;
        const x0 = fxx - fw + Math.min(0, toe);
        const wF = fw * 2 + Math.abs(toe);
        if (!rig.hurt) {
          // Instep first, so the sole block laps over its base.
          const pxw = -auy * shinLW * 0.62;
          const pyw = aux * shinLW * 0.62;
          ctx.fillStyle = shade(bootCol, -6);
          ctx.beginPath();
          ctx.moveTo(ankX - pxw, ankY - pyw);
          ctx.lineTo(ankX + pxw, ankY + pyw);
          ctx.lineTo(fxx + fw * 0.55, fyy - 0.02 * s);
          ctx.lineTo(fxx - fw * 0.55, fyy - 0.02 * s);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = bootCol;
        ctx.beginPath();
        chamferRect(ctx, x0, fyy - 0.031 * s, wF, 0.062 * s, 0.02 * s);
        ctx.fill();
        if (!rig.hurt) {
          // Sole shadow: the dark welt line the shoe stands on.
          ctx.fillStyle = shade(bootCol, -22);
          ctx.fillRect(x0 + 0.008 * s, fyy + 0.017 * s, wF - 0.016 * s, 0.014 * s);
          if (Math.abs(fx) > 0.35) {
            // Toe face catches the light at profile; the heel counter
            // behind darkens — the shoe points where the body walks.
            ctx.fillStyle = shade(bootCol, 9);
            ctx.beginPath();
            chamferRect(
              ctx,
              fx > 0 ? x0 + wF - 0.048 * s : x0 + 0.003 * s,
              fyy - 0.026 * s,
              0.045 * s,
              0.032 * s,
              0.012 * s,
            );
            ctx.fill();
            ctx.fillStyle = shade(bootCol, -12);
            ctx.fillRect(fx > 0 ? x0 + 0.004 * s : x0 + wF - 0.026 * s, fyy - 0.024 * s, 0.022 * s, 0.04 * s);
          }
        }
      }
      if (bootSt?.toe && !rig.hurt) {
        // Steel toe on the leading half of the foot.
        ctx.fillStyle = bootSt.toe;
        ctx.beginPath();
        chamferRect(ctx, fxx + (lead > 0 ? 0.022 : -0.088) * s, fyy - 0.028 * s, 0.066 * s, 0.056 * s, 0.018 * s);
        ctx.fill();
      }
      if (bootSt?.curl && !rig.hurt) {
        // The curled slipper toe — a hook of cloth rising off the tip.
        ctx.strokeStyle = bootSt.cuff?.color ?? shade(bootCol, 16);
        ctx.lineWidth = Math.max(2, s * 0.042);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fxx + lead * 0.068 * s, fyy - 0.004 * s);
        ctx.quadraticCurveTo(fxx + lead * 0.14 * s, fyy + 0.006 * s, fxx + lead * 0.118 * s, fyy - 0.052 * s);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  };

  // ---- arms + weapon. Hand targets change with what the character is
  // doing; two-segment IK arms connect them back to the shoulder line.
  const wS = rig.wScale;
  const hScale = 1 + (1 - wS) * 0.55;
  // The sheathe blend: before the handoff the weapon still lives in the
  // hand (carried toward its stow spot); past it the weapon is BODY
  // gear — the hand code below sees empty fists and relaxes into the
  // bare hang, while the stow painters put the steel on the belt/back.
  const sheath = rig.sheathT ?? 0;
  const stowed = sheath >= STOW_HANDOFF;
  const wornDef = itemDef(rig.weaponItem ?? '');
  const weapon = stowed ? undefined : wornDef;
  // ONE CLASS, ONE DETECTION (arms-v3 Phase 1): the held thing's kind
  // comes from wieldClass — the check-great-first law and the registry
  // probe order live THERE, once, instead of being re-derived at every
  // consumer. Identity still comes from the style registries; roster
  // ids (falchion, hush, stormcaller, ...) don't all say 'sword'.
  const heldKind = weapon !== undefined ? wieldClass(weapon.id) : 'none';
  const isBow = heldKind === 'bow';
  const isGreat = heldKind === 'great';
  // Blades — swords and daggers both — share the low carriage AND the
  // grip-aware strike vocabulary (incl. the reverse grip).
  const isSword = heldKind === 'blade';
  const isStaff = heldKind === 'staff';
  // A reversed main fist changes the ATTACK choreography, not just the
  // carriage — tighter rakes, locked wrist, icepick finisher.
  const rogueMelee = isSword && rig.carryStyle === 'rogue';
  // Per-fist grips + the off blade, hoisted above the melee block: the
  // dual-wield echo choreography needs them at strike time, not just
  // at rest. Flip is a property of the GRIP, constant through swings.
  const mainGrip: Grip = rig.carryStyle === 'rogue' ? 'rogue' : 'normal';
  const offGrip: Grip = rig.carryOff === 'rogue' ? 'rogue' : 'normal';
  // A stowed off blade leaves the hand exactly like the main weapon —
  // offWorn remembers it for the stow painter and the grab blend.
  const offWorn = offSt?.kind === 'weapon' && rig.offhandItem !== undefined;
  const offBlade = offWorn && !stowed;
  // The tool TYPE picks the work cycle: an axe chops, a pick heaves
  // overhead and pries — different rhythms, different bodies. Rods (and
  // bare hands) keep the gentle working sway.
  const toolType = weapon?.tool?.type;
  // Foraging outranks the belt tool: picking herbs is hand-work even
  // with an axe on the hip (the caller also holsters the tool sprite).
  const foraging = rig.pose === PoseState.Gather && rig.foraging === true;
  // Milking is its own pose (never Gather): bare-handed dairy work,
  // weapons stowed by the caller's sheathe blend.
  const milking = rig.pose === PoseState.Milk;
  const chopping = rig.pose === PoseState.Gather && toolType === 'axe' && !foraging;
  const mining = rig.pose === PoseState.Gather && toolType === 'pickaxe' && !foraging;
  const craftKind = rig.pose === PoseState.Craft ? (rig.craftKind ?? 'workbench') : null;
  const gatherSwing =
    rig.pose === PoseState.Gather && !chopping && !mining && !foraging
      ? Math.sin(rig.gatherPhase * 5.5) * 0.5
      : 0;

  // Torso proportions (needed for shoulders before the torso is drawn).
  // THE FRONT-HEAVY FRAME: the fur dialect widens the shoulder line
  // and barely the waist — the gnoll's mass lives in its upper torso
  // (arms anchor off tw, so the wider carriage propagates for free).
  // THE CONSTRUCT FRAME widens further than the fur dialect ever did:
  // a golem's mass IS its shoulder line (arms anchor off tw, so the
  // whole carriage broadens for free).
  const tw = SHOULDER_HALF_S * s * (gno ? 1.28 : gol ? 1.4 * (0.94 + 0.12 * gol.heavy) : 1); // shoulder half-width
  const ww = WAIST_HALF_S * s * (gno ? 1.06 : gol ? 1.22 : 1); // waist half-width
  const th = TORSO_RISE_S * s * (1 - 0.12 * crouch); // hip line → shoulders

  // Melee combo stages — THE TWO SCHOOLS (carriage.ts strike
  // vocabulary): every strike is coil → cocked hold → snap →
  // held extension → recover, and the grip picks the choreography.
  // Standard: cleave / rising return / lunge thrust. Rogue: cross
  // rake (pull-in) / backslash (fling-out) / icepick plunge.
  let swingOffset = 0.5 + gatherSwing;
  let thrustR: number | null = null; // finisher: radial thrust (tiles)
  // Strike channels beyond the arm angle: reach multiplier, screen
  // lift (the cut's vertical plane), and the blade's wrist-law angle.
  let strikeReachK = 1;
  let strikeLiftS = 0;
  let strikeBladeRel: number | null = null;
  // THE POLE SCHOOL: a struck staff rides TANGENT to its sweep — its
  // own wrist channel, never the blade's — and pivots at the middle.
  let staffSpin: number | null = null;
  let staffStrikeGrip: number | null = null;
  let mainTrail: StrikeTrail | null = null;
  // Dual-wield echo: the off blade's own cut on the back of the beat
  // (the ONE-TWO law) — channels + a ramp weight blending it out of
  // and back into the combat guard.
  let echoF: StrikeFrame | null = null;
  let echoTr: StrikeTrail | null = null;
  let echoW = 0;
  // Sneaking hunches forward along facing; no other pose branch runs in
  // Sneak, so this baseline survives to the torso draw.
  let lean = 0.15 * crouch * Math.sign(fx || 1); // torso lean (radians) inside the squash frame
  const meleeStage =
    rig.pose === PoseState.Attack
      ? 0
      : rig.pose === PoseState.Attack2
        ? 1
        : rig.pose === PoseState.Attack3
          ? 2
          : -1;
  // Icepick finisher path (reverse grip only) — set in stage 2 below.
  let ice: { r: number; lift: number } | null = null;
  // THE MOUNTAIN FALLS (great finisher): the blade's world pitch
  // through the overhead haul — projected for heldAngle below.
  let greatFinPitch: number | null = null;
  // The shoulder carry's run-claim on the off fist (greatWield).
  let greatRunClaim = 0;
  if (meleeStage === 0 || meleeStage === 1) {
    const t = rig.poseT;
    if (isStaff) {
      // THE POLE SCHOOL: the staff fights from the middle — the
      // moulinet sweep and the butt cut, shaft tangent to the arc,
      // both hands on the wood (the guard claim below rides the same
      // choke through the whole beat).
      const f = staffStrikeFrame(meleeStage as 0 | 1, t);
      swingOffset = f.arm;
      strikeReachK = f.reach;
      strikeLiftS = f.lift;
      staffSpin = f.spin;
      staffStrikeGrip = f.grip;
      lean = f.lean;
      mainTrail = staffStrikeTrail(meleeStage as 0 | 1, t);
    } else if (isGreat) {
      // THE GREAT SCHOOL: the felling stroke and the wide reap —
      // swung RADII with a heavy wrist lag (the mass answers late),
      // both fists welded to the grip through the whole beat (the
      // second-fist claim below), on the renderer's long clock. The
      // wrist channel rides the same projection as the pole school's.
      const f = greatStrikeFrame(meleeStage as 0 | 1, t);
      swingOffset = f.arm;
      strikeReachK = f.reach;
      strikeLiftS = f.lift;
      staffSpin = f.spin;
      staffStrikeGrip = f.grip;
      lean = f.lean;
      mainTrail = greatStrikeTrail(meleeStage as 0 | 1, t);
    } else {
      const f = strikeFrame(rogueMelee ? 'rogue' : 'normal', meleeStage as 0 | 1, t);
      swingOffset = f.arm;
      strikeReachK = f.reach;
      strikeLiftS = f.lift;
      if (isSword) strikeBladeRel = f.blade;
      lean = f.lean;
      mainTrail = strikeTrail(rogueMelee ? 'rogue' : 'normal', meleeStage as 0 | 1, t);
    }
  } else if (meleeStage === 2) {
    // Finisher. Standard grip: haul the blade to the hip — tip on the
    // mark — then RAM it down the aim and hold it buried. Reverse
    // grip: the ICEPICK — coil high, POISE (the raised-dagger
    // telegraph), plunge down the aim line tip first. One shared lean
    // clock (finisherLean) lands the whole body together.
    const t = rig.poseT;
    swingOffset = 0;
    if (rogueMelee) {
      ice = icepickPath(t);
    } else if (isGreat) {
      // THE MOUNTAIN FALLS: both hands haul the blade straight
      // overhead — the LIFT does the talking while the fist barely
      // leaves the body — the longest poise in the game, then the
      // drive buries the edge in the ground ahead. The blade's pitch
      // is authored in the world and projected below.
      const gp = greatFinisherPath(t);
      thrustR = gp.r;
      strikeLiftS = gp.lift;
      greatFinPitch = gp.pitch;
      staffStrikeGrip = 0.26;
    } else {
      const tp = thrustPath(t);
      thrustR = tp.r;
      strikeLiftS = tp.lift;
    }
    lean = (isGreat ? greatFinisherLean(t) : finisherLean(t)) * Math.sign(fx || 1); // tip the torso along the strike
  }
  // The echo rides every stage of the main combo when an off blade is
  // worn: it coils while the main blade cuts and cuts while the main
  // recovers, on the opposite plane, in the OFF fist's own grip. The
  // ramp weight eases the fist out of its guard into the echo's coil
  // and back to guard by the beat's end, so nothing ever pops.
  if (offBlade && meleeStage >= 0) {
    const t = rig.poseT;
    echoF = echoFrame(offGrip, meleeStage as 0 | 1 | 2, t);
    echoTr = echoTrail(offGrip, meleeStage as 0 | 1 | 2, t);
    if (echoF) {
      const inU = Math.min(1, (t - ECHO_START) / 0.1);
      const outU = Math.max(0, Math.min(1, (t - 0.92) / 0.08));
      echoW = inU * inU * (3 - 2 * inU) * (1 - outU * outU * (3 - 2 * outU));
      // The body answers the second cut — a smaller counter-lean on
      // the echo's own clock, layered over the main lean's recovery.
      lean += echoF.lean * 0.5 * echoW;
    }
  }

  const drawT = isBow ? rig.drawT : 0;
  const loosing = isBow && rig.pose === PoseState.Loose;
  const drawing = isBow && !loosing && (drawT > 0 || rig.pose === PoseState.Draw);
  if (drawing) lean = -Math.sign(fx || 1) * 0.07 * drawT; // braced back

  let reach = 0.25 * s;
  // THE SWING MIRROR: the chop/mine cycles are authored for a right-
  // facer — windup over the shoulder, arc sweeping clockwise down into
  // the work. Applying rel unmirrored kept that clockwise sweep at
  // EVERY facing, so a left-facer wound up low behind the hip and
  // scooped UP into the tree, poll first. Negating rel reflects the
  // whole arc across the facing line — overhead stays overhead, the
  // bite lands down-forward — and pairs with the BIT-LEADS flip law in
  // drawHeldItem (same cos(dir) > 0 test) so the honed edge leads the
  // sweep on both sides of the node.
  const workSide = Math.cos(rig.dir) > 0 ? 1 : -1;
  // The chop: raise the axe up over the shoulder, slam it down into the
  // node, hold through the bite, recover — every beat readable.
  if (chopping) {
    const u = (rig.nowMs % CHOP_CYCLE_MS) / CHOP_CYCLE_MS;
    let rel: number;
    if (u < 0.42) {
      // Windup: haul the axe up and back over the shoulder.
      const p2 = u / 0.42;
      const e2 = 1 - (1 - p2) * (1 - p2);
      rel = 0.35 - 2.4 * e2;
      reach = (0.2 - 0.02 * e2) * s;
      lean = -0.08 * e2;
    } else if (u < 0.54) {
      // Strike: fast, whole body tips into it.
      const p2 = (u - 0.42) / 0.12;
      const e2 = p2 * p2;
      rel = -2.05 + 2.4 * e2;
      reach = (0.2 + 0.13 * e2) * s;
      lean = -0.08 + 0.24 * e2;
    } else if (u < 0.72) {
      // The bite: blade buried, arms extended, a shiver of effort.
      rel = 0.35 + Math.sin(rig.nowMs * 0.15) * 0.02;
      reach = 0.33 * s;
      lean = 0.16 - ((u - 0.54) / 0.18) * 0.06;
    } else {
      // Recover toward the next windup.
      const p2 = (u - 0.72) / 0.28;
      rel = 0.35;
      reach = (0.33 - 0.1 * p2) * s;
      lean = 0.1 * (1 - p2);
    }
    swingOffset = rel * workSide;
    lean *= workSide;
  }
  // The mine: a pick is NOT an axe. Haul it straight overhead with the
  // whole back, hang at the top of the heave, drive it down into the
  // seam, then LEVER it back out — the pry is what says "rock".
  if (mining) {
    const u = (rig.nowMs % MINE_CYCLE_MS) / MINE_CYCLE_MS;
    let rel: number;
    if (u < 0.32) {
      // Windup: the pick climbs past the shoulder to straight overhead.
      const p2 = u / 0.32;
      const e2 = 1 - (1 - p2) * (1 - p2);
      rel = 0.4 - 2.9 * e2;
      reach = (0.22 - 0.06 * e2) * s;
      lean = -0.11 * e2;
    } else if (u < 0.44) {
      // The heave: hanging at the top, gathering weight.
      const p2 = (u - 0.32) / 0.12;
      rel = -2.5 + Math.sin(rig.nowMs * 0.02) * 0.03;
      reach = 0.16 * s;
      lean = -0.11 - 0.03 * p2;
    } else if (u < 0.54) {
      // The drive: everything comes down at once.
      const p2 = (u - 0.44) / 0.1;
      const e2 = p2 * p2;
      rel = -2.5 + 2.95 * e2;
      reach = (0.16 + 0.2 * e2) * s;
      lean = -0.14 + 0.42 * e2;
    } else if (u < 0.7) {
      // Buried: point deep in the seam, shoulders hunched, quivering.
      rel = 0.45 + Math.sin(rig.nowMs * 0.16) * 0.018;
      reach = 0.36 * s;
      lean = 0.28 - ((u - 0.54) / 0.16) * 0.1;
    } else if (u < 0.86) {
      // The pry: lever the head back out of the rock.
      const p2 = (u - 0.7) / 0.16;
      const e2 = p2 * p2 * (3 - 2 * p2);
      rel = 0.45 - 0.55 * e2;
      reach = (0.36 - 0.08 * e2) * s;
      lean = 0.18 - 0.2 * e2;
    } else {
      // Recover into the next lift.
      const p2 = (u - 0.86) / 0.14;
      rel = -0.1 + 0.5 * p2;
      reach = (0.28 - 0.06 * p2) * s;
      lean = -0.02 * (1 - p2);
    }
    swingOffset = rel * workSide;
    lean *= workSide;
  }
  // The forage: no tool, no swing — herbalist's hands. Bend toward
  // the plant, reach the working hand deep into it, TUG with a little
  // shiver of effort, snap the stem free, then carry the pluck back
  // to the belt pouch. The drop rides mainY below so the reach goes
  // DOWN into the foliage at every facing.
  let forageDrop = 0;
  if (foraging) {
    const u = (rig.nowMs % FORAGE_CYCLE_MS) / FORAGE_CYCLE_MS;
    let r: number;
    if (u < 0.3) {
      // Reach in, body bending with it.
      const p2 = u / 0.3;
      const e2 = 1 - (1 - p2) * (1 - p2);
      r = 0.14 + 0.22 * e2;
      forageDrop = 0.08 + 0.08 * e2;
      lean = 0.13 * e2;
    } else if (u < 0.42) {
      // The tug: gripped in the plant, a shiver of effort.
      r = 0.36 + Math.sin(rig.nowMs * 0.13) * 0.012;
      forageDrop = 0.16;
      lean = 0.13 + Math.sin(rig.nowMs * 0.13) * 0.012;
    } else if (u < 0.5) {
      // Snap free — quick, the body rocks back with the release.
      const p2 = (u - 0.42) / 0.08;
      const e2 = p2 * p2;
      r = 0.36 - 0.14 * e2;
      forageDrop = 0.16 - 0.06 * e2;
      lean = 0.13 - 0.19 * e2;
    } else if (u < 0.78) {
      // Carry the pluck to the pouch on the belt.
      const p2 = (u - 0.5) / 0.28;
      const e2 = p2 * p2 * (3 - 2 * p2);
      r = 0.22 - 0.15 * e2;
      forageDrop = 0.1 - 0.09 * e2;
      lean = -0.06 * (1 - e2) - 0.01;
    } else {
      // Settle, hand drifting back toward the next reach.
      const p2 = (u - 0.78) / 0.22;
      r = 0.07 + 0.07 * p2;
      forageDrop = 0.01 + 0.07 * p2;
      lean = -0.01 * (1 - p2);
    }
    swingOffset = 0.14;
    reach = r * s;
    lean *= Math.sign(fx || 1);
  }
  // The milking: no tool, no swing — dairy hands. Settled low at the
  // flank in the working crouch, both arms reach in together and pull
  // down in alternation — a steady squeeze-and-release rhythm, the
  // shoulders rocking faintly on the beat.
  let milkDropMain = 0;
  let milkDropOff = 0;
  if (milking) {
    const u = (rig.nowMs % MILK_CYCLE_MS) / MILK_CYCLE_MS;
    // One hand's pull: a quick draw down, an easy ride back up.
    const pull = (p: number) => {
      const t2 = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
      return t2 * t2 * (3 - 2 * t2);
    };
    milkDropMain = 0.06 + 0.085 * pull(u);
    milkDropOff = 0.06 + 0.085 * pull((u + 0.5) % 1);
    swingOffset = 0.3;
    reach = 0.3 * s;
    // Bent to the work, breathing with the alternating pulls.
    lean = (0.14 + 0.018 * Math.sin(u * Math.PI * 4)) * Math.sign(fx || 1);
  }
  // Station work: each craft station has its own body language.
  if (craftKind === 'anvil') {
    // Hammer blows: raise over the shoulder, ring it off the billet the
    // tongs hold on the anvil face, let the head bounce, reset.
    const u = (rig.nowMs % ANVIL_CYCLE_MS) / ANVIL_CYCLE_MS;
    let rel: number;
    if (u < 0.3) {
      const p2 = u / 0.3;
      const e2 = 1 - (1 - p2) * (1 - p2);
      rel = 0.2 - 2.1 * e2;
      reach = (0.26 - 0.06 * e2) * s;
      lean = -0.05 * e2;
    } else if (u < 0.42) {
      const p2 = (u - 0.3) / 0.12;
      const e2 = p2 * p2;
      rel = -1.9 + 1.68 * e2;
      reach = (0.2 + 0.14 * e2) * s;
      lean = -0.05 + 0.16 * e2;
    } else if (u < 0.58) {
      // The ring: a crisp rebound off the metal.
      const p2 = (u - 0.42) / 0.16;
      rel = -0.22 - 0.5 * Math.sin(p2 * Math.PI) * (1 - p2 * 0.5);
      reach = (0.34 - 0.05 * Math.sin(p2 * Math.PI)) * s;
      lean = 0.11 - 0.07 * p2;
    } else {
      const p2 = (u - 0.58) / 0.42;
      rel = -0.22 + 0.42 * p2 * p2 * (3 - 2 * p2);
      reach = (0.29 - 0.03 * p2) * s;
      lean = 0.04 * (1 - p2);
    }
    swingOffset = rel;
    lean *= Math.sign(fx || 1);
  } else if (craftKind === 'furnace') {
    // Stoking: lean in and feed the mouth with both hands, hold against
    // the heat, pull back.
    const u = (rig.nowMs % FURNACE_CYCLE_MS) / FURNACE_CYCLE_MS;
    let push: number;
    if (u < 0.38) {
      const p2 = u / 0.38;
      push = p2 * p2 * (3 - 2 * p2);
    } else if (u < 0.6) {
      push = 1;
    } else {
      const p2 = (u - 0.6) / 0.4;
      push = 1 - p2 * p2 * (3 - 2 * p2);
    }
    swingOffset = 0.1;
    reach = (0.18 + 0.19 * push) * s;
    lean = 0.13 * push * Math.sign(fx || 1);
  } else if (craftKind === 'fire') {
    // Tending the pot: a slow, patient stir.
    swingOffset = 0.45 + Math.sin(rig.gatherPhase * 2.4) * 0.28;
    reach = (0.26 + Math.sin(rig.gatherPhase * 4.8) * 0.02) * s;
  } else if (craftKind === 'workbench') {
    // Bench work: short, busy taps over the surface.
    const u = (rig.nowMs % 900) / 900;
    swingOffset = 0.32 + Math.sin(u * Math.PI * 2) * 0.2;
    reach = (0.27 + 0.035 * Math.sin(u * Math.PI * 4)) * s;
    lean = 0.03 * Math.sin(u * Math.PI * 2 + 0.8) * Math.sign(fx || 1);
  }
  // THE ARM RING RIDES THE SQUASH (arms-v3 Phase 1, the one flagged
  // pixel change): shoulderY has always compensated the fake-3D width
  // squash with hScale — the torso reads TALLER when it narrows at the
  // camera-line facings — but the hand-orbit line hung at a fixed drop,
  // so the shoulder→hand span quietly stretched ~6% on every N/S
  // facing. Both ends of the arm frame now agree about the squash.
  const armY = hipY - ARM_RING_DROP_S * s * hScale;
  const shoulderY = hipY - th * hScale + SHOULDER_Y_DROP_S * s;
  // ==================== THE ONE MOUTH BEGINS ====================
  // (arms-v3 Phase 2) Every write to the arm channels — heldAngle,
  // mainX/mainY, offX/offY, offBladeAngle, mainFore/offFore,
  // staffGrip, armSwingK — lives between this fence and its END
  // marker, as one ordered pipeline of labeled stages: baseline →
  // rest carriage → pump → seat → cast → draw → sheathe → claims.
  // armAssembly.test.ts walks the source and fails the build if a
  // write to any of these channels appears outside the fence, or if
  // the per-channel writer census drifts without the test being told.
  const mainAngle = rig.dir + swingOffset;
  // The free arm counter-swings a melee strike instead of floating on
  // a fixed circle — two arms in the fight, not one. An off BLADE
  // never counter-swings: it braces in guard, then its shoulder and
  // elbow follow the echo cut on the echo's own ramp.
  let offAngle =
    meleeStage === 0 || meleeStage === 1 ? rig.dir - swingOffset * 0.55 : rig.dir - 0.55;
  if (offBlade && meleeStage >= 0) {
    offAngle = rig.dir - 0.9;
    if (echoF && echoW > 0) {
      offAngle += angleDelta(offAngle, rig.dir + echoF.arm) * echoW;
    }
  }
  // THE AIM IS A GROUND VECTOR (arms-v3 Phase 3): every radial reach
  // down the aim rides the projected unit direction — its depth
  // component carries the ground K, so a north thrust punches short
  // and high, a south thrust short and low, and the fist finally
  // travels the same ellipse its slash trail draws. The strike-stage
  // ORBITS (mainAngle sweeps) deliberately stay screen circles: the
  // schools' cut planes are authored facing-dependent art (Part 4 —
  // the choreography is law).
  const aim = projectAim(rig.dir);
  let mainX: number;
  let mainY: number;
  if (thrustR !== null) {
    mainX = rig.x + aim.px * thrustR * s * wS;
    mainY = armY + aim.py * thrustR * s + strikeLiftS * s;
  } else if (ice) {
    // Icepick: the fist rides its coil-high/drive-down path.
    mainX = rig.x + aim.px * ice.r * s * wS;
    mainY = armY + aim.py * ice.r * s + ice.lift * s;
  } else {
    // Strike channels ride here: the reach breathes with the cut
    // (collapsing through a rogue pull, extending through a cleave)
    // and the lift carries the cut's vertical plane at every facing.
    mainX = rig.x + Math.cos(mainAngle) * reach * strikeReachK * wS;
    mainY = armY + Math.sin(mainAngle) * reach * strikeReachK + strikeLiftS * s;
    // Foraging reaches DOWN into the plant regardless of facing.
    if (foraging) mainY += forageDrop * s;
    // Milking pulls DOWN on its half of the beat at every facing.
    if (milking) mainY += milkDropMain * s;
  }
  // The free hand hangs relaxed by the hip opposite the weapon hand;
  // during swings/casts it rides the counterbalance circle instead.
  let offX: number;
  let offY: number;
  if (offBlade && meleeStage >= 0) {
    // Dual wield, mid-combo: the off blade NEVER mirrors the main
    // swing (two arms windmilling in parallel was the flail). It
    // BRACES in guard while the main blade cuts — a fixed coiled
    // ready — then the echo beat takes the fist over on its own
    // choreography, eased in and out by the ramp weight.
    const gAngle = rig.dir - 0.9;
    let gx = rig.x + Math.cos(gAngle) * 0.18 * s * wS;
    let gy = armY + Math.sin(gAngle) * 0.18 * s + 0.02 * s;
    if (thrustR !== null || ice) {
      // Finisher counter-haul until the echo claims the arm.
      gx = rig.x - fx * 0.17 * s * wS;
      gy = armY + 0.09 * s;
    }
    if (echoF && echoW > 0) {
      const eAngle = rig.dir + echoF.arm;
      const ex = rig.x + Math.cos(eAngle) * reach * echoF.reach * wS;
      const ey = armY + Math.sin(eAngle) * reach * echoF.reach + echoF.lift * s;
      offX = gx + (ex - gx) * echoW;
      offY = gy + (ey - gy) * echoW;
    } else {
      offX = gx;
      offY = gy;
    }
  } else if (thrustR !== null || ice) {
    // Finisher: the free arm hauls back behind the hip — the counter-
    // weight of the ram (or of the icepick drive).
    offX = rig.x - fx * 0.17 * s * wS;
    offY = armY + 0.09 * s;
  } else if (chopping || mining) {
    // Two-handed grip: the free hand chokes up the haft behind the
    // striking hand — further down for the heavier pick.
    const choke = mining ? 0.2 : 0.16;
    offX = mainX - Math.cos(mainAngle) * choke * s;
    offY = mainY - Math.sin(mainAngle) * choke * s + 0.03 * s;
  } else if (foraging) {
    // The steadying hand: planted low in the foliage off the working
    // axis, holding the stems still while the main hand plucks — it
    // barely moves, just a slow breath of grip-shifting.
    const steadyAngle = rig.dir - 0.42;
    offX = rig.x + Math.cos(steadyAngle) * 0.23 * s * wS;
    offY = armY + Math.sin(steadyAngle) * 0.23 * s + (0.11 + Math.sin(rig.nowMs * 0.0021) * 0.012) * s;
  } else if (milking) {
    // The other hand works the off-beat: planted just off the working
    // axis, pulling opposite the main hand's rhythm.
    const milkAngle = rig.dir - 0.34;
    offX = rig.x + Math.cos(milkAngle) * 0.27 * s * wS;
    offY = armY + Math.sin(milkAngle) * 0.27 * s + milkDropOff * s;
  } else if (craftKind === 'anvil') {
    // Tongs hand: planted toward the anvil, holding the work steady
    // while the hammer arm does everything else.
    const tongsAngle = rig.dir - 0.32;
    offX = rig.x + Math.cos(tongsAngle) * 0.31 * s * wS;
    offY = armY + Math.sin(tongsAngle) * 0.31 * s + 0.04 * s;
  } else if (craftKind === 'furnace') {
    // Both hands carry the charge into the mouth together.
    offX = mainX - Math.sin(rig.dir) * 0.13 * s;
    offY = mainY + Math.cos(rig.dir) * 0.13 * s * 0.5 + 0.02 * s;
  } else if (meleeStage === -1 && rig.pose !== PoseState.Cast) {
    offX = rig.x - Math.cos(mainAngle) * 0.15 * s * wS;
    offY = armY + 0.13 * s;
  } else {
    offX = rig.x + Math.cos(offAngle) * reach * wS;
    offY = armY + Math.sin(offAngle) * reach;
  }

  // ---- rest carriage: out of combat the weapon comes DOWN. Idle and
  // travel are where the character actually lives, so this is its own
  // vocabulary: hands hanging just outside the silhouette (BOTH arms
  // visible), a blade lowered with its tip trailing, a bow upright at
  // the side — and the staff planted as a true walking stick at rest,
  // leveling out into a low run carry as the gait becomes a sprint.
  // Everything blends on poseT, so a combat follow-through settles
  // into carriage over the same 280 ms every pose change uses.
  // Foreshortening from the projection law — threaded to the painter
  // so a weapon pointing into (or out of) the scene draws SHORT. The
  // length change, not the angle, is what tells the eye the steel
  // lives in the world's depth instead of rotating on a flat card.
  // THE STRIKE'S OWN MOUTH (arms-v3 Phase 2): the five mutually-
  // exclusive strike-angle sources resolve to ONE {angle, fore} pair
  // in one pure expression — the branch cascade that used to be
  // heldAngle's writers #1 and #2 is now a single resolved input to
  // the assembly below.
  const strikeHeld = ((): { angle: number; fore: number } => {
    if (strikeBladeRel !== null) {
      // THE WRIST LAW (strikeFrame's blade channel): the blade lags
      // the arm cocked through the coil and the hold, whips to a lead
      // at impact, settles straight — a whip-crack cut, not a
      // windshield wiper. The reverse grip runs the same beat around
      // its π reversal, tight and locked — the grip never lies. The
      // cut sweeps the GROUND plane, so the strike projection bends
      // the screen angle and shortens the steel along the depth axis.
      return projectStrike(mainAngle + strikeBladeRel);
    }
    if (staffSpin !== null) {
      // THE POLE SCHOOL's tangent hold, through the same projection.
      return projectStrike(mainAngle + staffSpin);
    }
    if (ice) {
      // The reversed blade stays pointed at the strike mark all the
      // way through the coil and the drive — menace through the whole
      // beat. The mark lives on the projected ground plane now (the
      // fist's own ellipse), so blade, fist, and streak agree.
      const markX = rig.x + aim.px * 0.6 * s * wS;
      const markY = armY + aim.py * 0.6 * s + 0.26 * s;
      return {
        angle: Math.atan2(markY - mainY, markX - mainX),
        fore: aim.fore,
      };
    }
    if (greatFinPitch !== null) {
      // THE MOUNTAIN FALLS: the blade's overhead haul is a world
      // pitch — straight up through the poise, crashing to
      // down-forward at the bury — projected exactly like a carry.
      return projectCarry(rig.dir, greatFinPitch);
    }
    if (thrustR !== null) {
      // The lunge rams straight down the PROJECTED aim — the blade
      // rides the same ellipse the fist travels, honestly shorter
      // when the aim runs into the screen.
      return { angle: aim.angle, fore: aim.fore };
    }
    return { angle: mainAngle, fore: 1 };
  })();
  let mainFore = strikeHeld.fore;
  let offFore = 1;
  let heldAngle = strikeHeld.angle;
  let staffGrip = 0.34; // combat default: gripped low, business end forward
  if (staffStrikeGrip !== null) staffGrip = staffStrikeGrip;
  let armSwingK = 1;
  let restSettle = 0;
  const restSide = Math.sign(fx) || 1;
  // THE SMOOTHED REST SIDE (wield.ts easeRestSide): the side eases
  // ±1→∓1 through 0 over 240ms, a flip needs 120ms of sustained
  // facing past ±0.12 to register (heading-jitter churn), and a
  // mid-ease reversal continues from the current blend, never
  // snapping back to a full side. Stateless callers take the raw sign.
  let sideS = restSide;
  const mem = rig.depthMemory;
  if (mem) sideS = easeRestSide(mem, restSide, fx, rig.nowMs);
  // THE FACING FRAME (arms-v3 Phase 2): the one side vocabulary,
  // computed once — every wield function takes the whole frame and
  // reads by field name, so a bare number can never be fed the wrong
  // meaning of "side" again (the drift the audit mapped).
  const face = facingFrame(rig.dir, sideS);
  // THE FACING-WEIGHT LAW: the carriage rake is a PROFILE read. Side-on
  // the blade rakes fully forward or back; facing the camera (or away)
  // there IS no screen-forward, so the rake relaxes toward a near-
  // vertical hang. The floor is a whisper (0.2): front-on there is no
  // direction for a rake to point, and the old 0.35 floor splayed the
  // blade diagonally at the viewer — "pointing the sword at the
  // camera" (user verdict). Grip identity front-on is carried by the
  // edge flip and the lean SIGN, not by rake magnitude. Feeding the
  // full ±1 at every facing is what held swords sideways and fists
  // high on a north-south run.
  const sideW = face.sideW;
  // THE SMOOTHED SWING LAW: the raw pump drive — the foot-lift
  // differential — saturates and kinks at every footfall, and wrists
  // driven straight off it hinge between two poses. An ~80ms low-pass
  // turns the drive into a sweep; the lag IS the lag of a relaxed arm.
  // Stateless callers fall back to the raw drive.
  const swRaw = Math.max(
    -1,
    Math.min(1, ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP),
  );
  let swS = swRaw;
  if (mem) {
    const dt = Math.max(0, Math.min(120, rig.nowMs - (mem.swMs ?? rig.nowMs)));
    const prev = mem.sw ?? swRaw;
    swS = prev + (swRaw - prev) * (1 - Math.exp(-dt / 80));
    mem.sw = swS;
    mem.swMs = rig.nowMs;
  }
  // Per-fist edge flips: a property of the GRIP (hoisted above the
  // melee block), constant through swings — a reversed fist keeps its
  // edge orientation mid-combo, so it can never pop.
  const mainFlip = isSword && mainGrip === 'rogue';
  const offFlip = offBlade && offGrip === 'rogue';
  // Knives ride tighter to the body than swords — the compact carry.
  const mainCompact = isSword && (weapon?.weapon?.range ?? 2) <= 1.5 ? 1 : 0;
  const offCompact =
    offBlade && (itemDef(rig.offhandItem!)?.weapon?.range ?? 2) <= 1.5 ? 1 : 0;
  // Off-blade baseline: the raised guard read it keeps through combat.
  let offBladeAngle = -Math.PI / 2 + sideW * 0.35;
  // The echo cut steers the off blade through its own wrist law —
  // blended on the same ramp weight as the fist, so the blade and the
  // hand leave (and rejoin) the guard together.
  if (echoF && echoW > 0) {
    // The echo cut sweeps the same ground plane — same projection.
    const ep = projectStrike(rig.dir + echoF.arm + echoF.blade);
    offBladeAngle += angleDelta(offBladeAngle, ep.angle) * echoW;
    offFore = 1 + (ep.fore - 1) * echoW;
  }
  // THE SETTLE OUTLIVES THE POSE (arms-v3 Phase 2): the rest stage
  // used to gate on the restful POSES, so the first frame of a strike
  // dropped every rest channel to the combat baseline in one step —
  // the renderer's rest clock now GLIDES on exit, and this stage runs
  // wherever any settle remains, its lerps carrying the hands out of
  // the carriage and into the fight continuously. At restSettle 0 the
  // whole block is a no-op by construction (every write lerps by the
  // settle), so the gate change alone moves no pixel.
  restSettle = rig.restT * rig.restT * (3 - 2 * rig.restT);
  if (restSettle > 0 && !drawing && !loosing) {
    const wSide = sideS;
    // THE GAIT LADDER (wield.ts): idle → walk → run are three stances.
    // A slow walk lifts every carry a fraction of the run delta the
    // moment the feet move — the old two-stop blend held the full idle
    // hang until the legs were sprinting, a stroll with statue arms.
    const runK = gaitK(Math.min(1, rig.poleStrength), rig.runF);
    // THE HANG-WIDTH LAW: hands hang at shoulder width only in PROFILE
    // (where the near hand must clear the turned torso). Front-on and
    // back-on a relaxed arm tapers in from the shoulder to brush the
    // HIP line — full-width hands at a frontal facing floated outward
    // off the body, both fists splayed wide of the silhouette (the
    // "hands come outward" read). Linear in profileK, so the stance
    // breathes continuously through every diagonal.
    // THE SILHOUETTE PEEK (arms-v3 Phase 4): at the away diagonals the
    // hang lanes widen so held gear clears the torso silhouette — a
    // loadout stays readable from behind instead of vanishing into
    // the body (zero on the camera half and at profile, by the band).
    // THE TURNED BAR reaches the hands: the old profile lane WIDENED
    // to the shoulder corner (tw·1.02) side-on — hands splayed at both
    // silhouette edges, the frontal-card read. A profile hand hangs
    // along the body's side plane, near the centerline: the lane now
    // TUCKS toward tw·0.62 as the heading turns side-on, and each fist
    // inherits its own shoulder's fore-aft stagger below.
    const hangW =
      (ww * HANG_WAIST_K + (tw * 0.62 - ww * HANG_WAIST_K) * profileK) *
      (1 + PEEK_HANG_K * awayPeekK(fy));
    const hangStag = shoulderStagK(fx) * tw;
    // THE RUNNER'S ELBOW: an empty fist rises toward the ribs as the
    // gait becomes a sprint — bent arms pumping with the legs, the
    // shape every running reference draws. Armed fists keep their
    // carriage heights (a carry law is a verdict). Facing-weighted
    // inside runnerLift: full lift in profile, half at the camera
    // lines, where the full lift tucked both fists into the armpits.
    const elbowLift = runnerLift(Math.min(1, rig.poleStrength), rig.runF, profileK) * s;
    // THE VISIBLE BREATH (arms-v3 Phase 5): free fists alternate the
    // lift with the stride on camera-line gaits — one hand toward the
    // ribs as the other drops — dead at profile where the fore/aft
    // pump already owns the read. Rides the SMOOTHED swing, so it
    // sweeps instead of hinging.
    const liftAlt = LIFT_ALT_K * swS * (1 - Math.abs(rig.poleX));
    let hx = rig.x + wSide * hangW * wS + hangStag * 0.06;
    let hy = armY + REST_HANG_DROP_S * s - elbowLift * (1 + liftAlt);
    let hAngle = Math.PI / 2 + sideW * (0.3 + 0.35 * runK); // tip down, trailing
    let hFore = 1; // rest-carry foreshortening, blended in on the settle
    // How "at rest" the rest really is: flourishes and wrist life only
    // play when the figure is planted (no gait, no sneak crouch) —
    // a sneaking rogue does not twirl knives.
    const idleK = (1 - Math.min(1, rig.poleStrength)) * (1 - crouch);
    if (isSword) {
      // Hand lanes ride the facing weight; the ANGLE rides the
      // projection law — the carriage's profile rake is authored as a
      // world pitch and projected, so at E/W the user-approved angles
      // reproduce exactly while N/S carries genuinely foreshorten
      // (the blade points into the scene and draws short) instead of
      // being relaxed toward vertical by a screen-side floor.
      const c = bladeCarriage(mainGrip, sideW, runK, mainCompact);
      const canon = bladeCarriage(mainGrip, 1, runK, mainCompact);
      // THE LIFELINE: the blade's projection yaw biases toward the
      // eased side at the camera lines — a leveled run carry keeps a
      // readable diagonal instead of collapsing to a plumb line (the
      // "sword run S = a stick" verdict cell). Profile stays exact.
      const proj = projectCarry(lifelineYaw(face), Math.PI / 2 - canon.angle);
      hAngle = proj.angle;
      hFore = proj.fore;
      hx += c.dx * s * wS;
      hy = armY + (REST_HANG_DROP_S + c.dy) * s;
      // DUAL-WIELD PROFILE FLIP (position half): side-on you cannot see
      // both hilts, and it is the MAIN fist that reads as the body's
      // far hand — it slides in toward the body center as the facing
      // turns profile, and the paint order below drops it behind the
      // torso. The off hand keeps its visible hang at the side.
      if (offBlade) {
        const t = Math.max(0, Math.min(1, (profileK - 0.6) / 0.35));
        const tuckK = t * t * (3 - 2 * t);
        hx = rig.x + (hx - rig.x) * (1 - 0.82 * tuckK);
      }
      if (idleK > 0) {
        // Continuous wrist life: the resting blade breathes with the
        // hands instead of freezing — and every few seconds the fist
        // plays with it (a rogue wrist-spin, a standard tip-raise).
        hAngle += Math.sin(rig.nowMs * 0.0011) * 0.045 * idleK;
        // Flourishes take the side SIGN, not the weight — a fractional
        // side would shrink the rogue spin short of its full turn.
        const fl = idleFlourish(rig.nowMs, 0, mainGrip, sideS >= 0 ? 1 : -1);
        if (fl) {
          hAngle += fl.spin * idleK;
          hy -= fl.lift * s * idleK;
        }
      }
    }
    if (isGreat) {
      // THE SHOULDER CARRY (wield.ts): the flat of the greatblade
      // rests back over the trailing shoulder at every gait — the
      // woodcutter's carry, one motion from the guard. The walk rocks
      // the mass a beat behind the stride; the run levels the blade a
      // little into the drive, drops the fist toward the ribs, and
      // calls the off hand back to the grip (the second-fist claim
      // below reads gf.offClaim).
      const gf = greatWield(face, Math.min(1, rig.poleStrength), rig.runF, swS, rig.poleX);
      hAngle = gf.angle;
      hFore = gf.fore;
      hx = rig.x + gf.dx * s * wS + gf.fwd * s;
      hy = armY + gf.dy * s;
      // THE GRIP JOINS THE LADDER (arms-v3 Phase 2): grip and pumpK
      // ride the same settle blend every other rest channel rides —
      // they used to be plain overwrites, and the fist SNAPPED along
      // the haft at every combat entry and exit (the one channel the
      // audit found excluded from the neutral-at-boundary contract).
      staffGrip += (gf.grip - staffGrip) * restSettle;
      armSwingK += (gf.pumpK - armSwingK) * restSettle;
      greatRunClaim = gf.offClaim;
    }
    if (isStaff) {
      // THE STAFF LADDER v2 (wield.ts): planted walking stick at
      // idle, rocking with the stride at a walk (in the TRAVEL plane
      // now, alive at every facing), leveling into a ONE-hand balance
      // carry at a run — the off hand is free and pumps with the legs
      // (the user's verdict on the two-hand run: nobody crosses their
      // body to double-grip a pole at a dead sprint). Two hands meet
      // on the wood only in the quarterstaff guard and its strikes.
      const sf = staffWield(face, Math.min(1, rig.poleStrength), rig.runF, swS, rig.poleX);
      hAngle = sf.angle;
      hFore = sf.fore;
      hx = rig.x + sf.dx * s * wS + sf.fwd * s;
      hy = armY + sf.dy * s;
      // THE GRIP JOINS THE LADDER — the staff's fist slides to the
      // walking-stick grip on the settle, never in one frame.
      staffGrip += (sf.grip - staffGrip) * restSettle;
      armSwingK += (sf.pumpK - armSwingK) * restSettle;
    } else if (isBow) {
      // The walking carry, reference-true (wield.ts): gripped by the
      // wood with the STRING facing the body (upper side) and the
      // wooden belly curving down-forward — the bow leans half-ready,
      // top limb toward the shoulder line, lower limb by the thigh, so
      // raising it into the aim is one motion. Continuous in the
      // facing weight (no binary mirror snap at north/south), the gait
      // ladder firms the carry toward ready on the run, and the
      // projection law compresses the limbs gently at the camera-line
      // facings — a plane's half-measure of the rod law's depth.
      const bf = bowWield(face, Math.min(1, rig.poleStrength), rig.runF);
      hAngle = bf.angle;
      hFore = bf.fore;
      hx += bf.dx * s * wS;
      hy = armY + bf.dy * s;
    }
    // THE HANDS PASS FRONT-AND-BACK: mid side-ease both rest anchors
    // sweep through the body's center, and at the midpoint the two
    // fists (and their blades) landed on the SAME point — the "arms
    // crossed" overlap the user caught. A crossing splits on the
    // height axis instead: the main fist dips a breath, the off fist
    // rides a breath high, and the pair shears past each other like
    // real hands swapping — never through one another. crossK > 0
    // only while the ease is in flight; the settled stance is
    // untouched.
    const crossK = 1 - Math.min(1, Math.abs(sideS));
    hy += crossK * 0.035 * s;
    mainX += (hx - mainX) * restSettle;
    mainY += (hy - mainY) * restSettle;
    heldAngle += angleDelta(heldAngle, hAngle) * restSettle;
    mainFore += (hFore - mainFore) * restSettle;
    // The off fist: bare hands hang; a dual wielder's second blade gets
    // the same grip vocabulary as the main — its own side, its own
    // grip, its own flourish phase (the two never twirl in sync). The
    // hand rides a touch higher and tighter than the main: the trailing
    // blade of a paired stance, not a mirror image.
    let ox = rig.x - wSide * hangW * wS - hangStag * 0.12;
    let oy = armY + REST_HANG_DROP_S * s - elbowLift * (1 - liftAlt);
    if (offBlade) {
      // The carriage mirrors on FACING, not on the hanging side — the
      // off fist trails the facing, so its outward push (dx) mirrors
      // while the blade angles stay true to forward/backward.
      const oc = bladeCarriage(offGrip, sideW, runK, offCompact);
      // The off blade rides the same projection law as the main: its
      // profile rake becomes a world pitch, N/S carries draw honestly
      // short — and the same LIFELINE keeps its diagonal readable.
      const oCanon = bladeCarriage(offGrip, 1, runK, offCompact);
      const oProj = projectCarry(lifelineYaw(face), Math.PI / 2 - oCanon.angle);
      let oAngle = oProj.angle;
      offFore += (oProj.fore - offFore) * restSettle;
      // The off fist is the NEAR arm — visible at the side from every
      // facing; side-on it pulls part-way onto the body (where a near
      // arm actually hangs in profile) and the depth flip below paints
      // it FOREMOST, over the torso.
      ox -= oc.dx * s * wS;
      oy = armY + (OFF_BLADE_HANG_DROP_S + oc.dy) * s;
      const tn = Math.max(0, Math.min(1, (profileK - 0.55) / 0.4));
      const nearK = tn * tn * (3 - 2 * tn);
      ox = rig.x + (ox - rig.x) * (1 - 0.45 * nearK);
      if (idleK > 0) {
        oAngle += Math.sin(rig.nowMs * 0.0011 + 2.1) * 0.045 * idleK;
        const fl = idleFlourish(rig.nowMs, FLOURISH_OFF_PHASE_MS, offGrip, sideS >= 0 ? 1 : -1);
        if (fl) {
          oAngle += fl.spin * idleK;
          oy -= fl.lift * s * idleK;
        }
      }
      offBladeAngle += angleDelta(offBladeAngle, oAngle) * restSettle;
    }
    // The off fist takes the high lane of the crossing shear (see
    // crossK above the main blend).
    oy -= crossK * 0.035 * s;
    offX += (ox - offX) * restSettle;
    offY += (oy - offY) * restSettle;
  }

  // Walking: arms swing counter to the legs along the travel direction.
  // Sneak walks the same law at a stalker's amplitude — the old gate
  // froze a sneaking figure's arms dead from the first crouched step.
  // THE PUMP RIDES THE SETTLE (arms-v3 Phase 2): this stage used to
  // gate on the restful POSES — pump, sway, and breath vanished in one
  // frame when a strike began, even though the rest carriage they
  // decorate blends out over restSettle. The stage now runs wherever
  // any rest carriage remains, and every contribution scales with the
  // settle: in from nothing as the body settles out of a fight, out
  // through the exit glide — no channel the settle owns ever snaps.
  // (The draw guard mirrors the rest stage's: the archer's anchors
  // own the hands outright, exactly as the old pose gate had it.)
  if (restSettle > 0 && !drawing && !loosing) {
    // The pump rides the SMOOTHED swing (clamped ±1 at the source):
    // the raw footfall drive hinges, the low-passed one sweeps.
    const sw = swS;
    // THE HONEST PUMP (wield.ts): arms swing along the TRAVEL,
    // foreshortened by the ground law — a north-south run keeps real
    // fore/aft arm life (smaller on screen because the world says so),
    // where the old front-on clamp suppressed armed hands near-dead.
    // THE ALIGNMENT DAMP: the full throw belongs to a body running the
    // way it faces. Strafing or backpedaling, the hands hang on the
    // FACING side while the pump drives along the TRAVEL — at full
    // amplitude that swings a fist across the shoulder line and folds
    // the elbow inside-out. A sidestepping body pumps small.
    const alignK = 0.5 + 0.5 * Math.max(0, rig.align);
    const amp =
      (0.07 + 0.055 * rig.runF) *
      s *
      Math.min(1, rig.poleStrength) *
      (1 - 0.45 * crouch) *
      alignK;
    const armed = isSword || isBow || isStaff || isGreat;
    const p = armPump(rig.poleX, rig.poleY, sw, amp, armed ? restSettle : 0);
    // THE PENDULUM ARC: a hand swinging from a shoulder rises at both
    // ends of its sweep — sw² is that arc. (|sw| had the same shape
    // but a hard CORNER at every zero crossing: the hands visibly
    // flicked twice a stride, the jitter the user caught.)
    const bounce = sw * sw * rig.runF * 0.03 * s;
    mainX += p.dx * armSwingK * restSettle;
    mainY += (p.dy - bounce) * armSwingK * restSettle;
    const offSwingK = offBlade ? 0.85 : 1;
    offX -= p.dx * offSwingK * restSettle;
    offY -= (p.dy - bounce) * offSwingK * restSettle;
    // The torso counter-sway of a real gait, living wherever the
    // fore/aft component leaves the screen (travel-true, not a
    // facing patch) — shared by both hands, never mirrored.
    const sway = p.sway * s * Math.min(1, rig.poleStrength) * restSettle;
    mainX += sway;
    offX += sway;
    // WRIST-FOLLOW: the blade angle rides the arm swing a few degrees
    // instead of staying frozen while the fist translates — a frozen
    // world-angle on a pumping hand reads as a broken wrist. Subtle,
    // counter-phased between the hands, alive from the first walking
    // step, scaled by the facing weight (quiet wrists on a front/back
    // gait — the same law the carriage rake follows), and it dies as
    // the figure stops.
    if (restSettle > 0 && rig.poleStrength > 0.05) {
      const follow =
        sw * (0.3 + 0.7 * rig.runF) * restSettle * Math.min(1, rig.poleStrength);
      // A reverse grip is LOCKED to the forearm (an assassin's blade
      // doesn't flop) — its follow is half the standard grip's lag.
      if (isSword) heldAngle += (mainGrip === 'rogue' ? 0.03 : -0.07) * sideW * follow;
      else if (isBow) heldAngle += -0.04 * sideW * follow;
      if (offBlade) offBladeAngle += (offGrip === 'rogue' ? -0.03 : 0.07) * sideW * follow;
    }
    // Standing breath: the hands ride a slow offset sine so the figure
    // is never a freeze-frame — alive even when idle.
    const rest = (1 - Math.min(1, rig.poleStrength)) * restSettle;
    if (rest > 0) {
      const b = Math.sin(rig.nowMs * 0.0019) * rest;
      const b2 = Math.sin(rig.nowMs * 0.0019 + 1.1) * rest;
      mainY += b * 0.011 * s;
      mainX += b2 * 0.005 * s;
      offY += b2 * 0.013 * s;
      offX -= b * 0.005 * s;
    }
  }

  // ---- the seat claims the arms and the spine. Sit is not a restful
  // pose (restT stays 0), so without this the hands hold the combat-
  // guard baseline — arms braced forward on a sitter, the "goofy sit"
  // read. Two arm vocabularies matched to the two leg postures:
  // LOUNGER plants both palms on the ground behind the hips (the
  // lean-back sunset watch); KNEE-UP drapes the forearm over the
  // raised kneecap — wrist hanging loose past the cap — while the
  // other palm props the ground beside the trailing hip. THE PROP
  // LEAN: the torso tips back off the planted arms, profile-weighted
  // (front-on there is no screen-backward to lean along). Everything
  // blends on the caller-smoothed sit channel, so the hands travel to
  // the ground and back with the body — never a pop.
  if (sit > 0) {
    const kneeUpSit = rig.sitVariant === 1;
    let smx: number;
    let smy: number;
    let sox: number;
    let soy: number;
    if (chairSit) {
      // FURNITURE CLAIMS ITS OWN CARRIAGE. Chair and bench: both
      // hands settle onto the thighs just shy of the solved kneecaps
      // — the patient tavern sit. Throne: the fists ride out to the
      // scrolled armrest ends, spine regal-straight (the armrest line
      // is the painter's own: arms end ~0.33s off center, a forearm
      // above the cushion).
      if (rig.sitStyle === 'throne') {
        smx = rig.x + 0.33 * s;
        smy = hipY - 0.16 * s;
        sox = rig.x - 0.33 * s;
        soy = hipY - 0.16 * s;
      } else if (rig.sitStyle === 'saddle') {
        // THE PORT HAND: both fists settle onto the pommel the mount
        // painter anchored — near hand a knuckle ahead of the far so
        // the stack reads as a hold, never a clasp.
        const rx = rig.reinX ?? rig.x;
        const ry = rig.reinY ?? hipY - 0.12 * s;
        smx = rx + 0.03 * s;
        smy = ry - 0.01 * s;
        sox = rx - 0.03 * s;
        soy = ry + 0.015 * s;
      } else {
        const a = KNEE_SCRATCH[0]!;
        const b = KNEE_SCRATCH[1]!;
        // Main hand takes the camera-side knee so the near forearm
        // paints over the lap; the off hand rests on the far thigh.
        const aNear = a.x >= rig.x;
        const near = aNear ? a : b;
        const far = aNear ? b : a;
        const mainNear = (Math.sign(sideS) || 1) >= 0;
        const mk = mainNear ? near : far;
        const ok = mainNear ? far : near;
        smx = mk.x + (mk.x - rig.x) * 0.1;
        smy = mk.y - 0.045 * s;
        sox = ok.x + (ok.x - rig.x) * 0.1;
        soy = ok.y - 0.045 * s;
      }
    } else if (kneeUpSit) {
      // The raised knee is the leg the IK bent hardest (smallest
      // hip→foot span) — drape the same-side fist over it.
      const a = KNEE_SCRATCH[0]!;
      const b = KNEE_SCRATCH[1]!;
      const rk = a.d <= b.d ? a : b;
      const kneeSide = Math.sign(rk.x - rig.x) || 1;
      const drapeX = rk.x + kneeSide * 0.05 * s * wS;
      const drapeY = rk.y + 0.05 * s;
      const propX = rig.x - kneeSide * tw * 1.35 * wS - fx * 0.1 * s * wS;
      const propY = hipY + 0.11 * s;
      const mainDrapes = kneeSide === (Math.sign(sideS) || 1);
      smx = mainDrapes ? drapeX : propX;
      smy = mainDrapes ? drapeY : propY;
      sox = mainDrapes ? propX : drapeX;
      soy = mainDrapes ? propY : drapeY;
    } else {
      // Both palms planted just outside and behind the hips.
      const backX = -fx * 0.13 * s * wS;
      smx = rig.x + sideS * tw * 1.5 * wS + backX;
      smy = hipY + 0.1 * s;
      sox = rig.x - sideS * tw * 1.5 * wS + backX;
      soy = hipY + 0.12 * s;
    }
    mainX += (smx - mainX) * sit;
    mainY += (smy - mainY) * sit;
    offX += (sox - offX) * sit;
    offY += (soy - offY) * sit;
    // Seated breath — the resting hands are never a freeze-frame.
    mainY += Math.sin(rig.nowMs * 0.0017) * 0.008 * s * sit;
    offY += Math.sin(rig.nowMs * 0.0017 + 1.4) * 0.008 * s * sit;
    // THE PROP LEAN belongs to the floor sit's planted arms; a chair
    // sit keeps the spine over the hips (the throne dead-upright).
    if (!chairSit) lean += -sideS * profileK * (kneeUpSit ? 0.1 : 0.2) * sit;
  }

  // Casting: the free hand punches a push toward the aim. The punch
  // amount is remembered so the staff's two-hand claim below yields
  // the fist for exactly as long as the spell owns it.
  let castPunch = 0;
  if (rig.pose === PoseState.Cast && rig.poseT < 0.5) {
    const u = Math.sin((rig.poseT / 0.5) * Math.PI);
    castPunch = u;
    // The punch is a radial reach down the aim — it rides the ground
    // ellipse like every other reach (a north cast no longer punches
    // at the sky, a south cast no longer at the boots).
    offX = rig.x + aim.px * (0.14 + 0.18 * u) * s * wS;
    offY = armY + aim.py * (0.14 + 0.18 * u) * s;
    // THE PRESENT: a staff LEVELS onto the aim line for the beat of
    // the spell — crown at the mark, flaring — instead of hanging on
    // the guard angle while the free hand does all the talking. The
    // aim line is the PROJECTED one, and the crown honestly shortens
    // as it points into the scene (the fore blend rides the same u).
    if (isStaff) {
      heldAngle += angleDelta(heldAngle, aim.angle) * u;
      mainFore += (aim.fore - mainFore) * u;
      mainX += aim.px * 0.08 * s * wS * u;
      mainY += aim.py * 0.08 * s * u;
    }
  }

  // Archery: the FRONT hand holds the bow at arm's length toward the
  // aim; the string hand physically hauls the string back to the cheek.
  // THE DRAW RIDES THE ELLIPSE (arms-v3 Phase 3): the bow anchor is a
  // radial reach down the aim, so it projects — a south draw holds the
  // bow low-forward at the belt line instead of down at the boots, a
  // north draw high-forward instead of at the zenith. The string haul
  // runs along the aim's UNIT screen direction, and the elevation read
  // comes from the arrow's fore + the anchor, the way the trail
  // already tells depth. (The true fire direction is the server's —
  // this is the drawn POSE.)
  let bowX: number | null = null;
  let bowY = 0;
  let bowPull = 0;
  if (drawing || loosing) {
    const bd = reach * 1.2;
    bowX = rig.x + aim.px * bd * wS;
    bowY = armY + aim.py * bd;
    if (loosing) {
      const t = rig.poseT;
      bowX -= aim.ux * 0.05 * s * (1 - t); // recoil kick back into the grip
      bowPull = 0.03 * s;
      mainX = bowX - aim.ux * 0.07 * s; // string hand snapped forward
      mainY = bowY + 0.02 * s;
    } else {
      bowPull = (0.08 + 0.3 * drawT) * s;
      mainX = bowX - aim.ux * bowPull;
      mainY = bowY + (shoulderY + 0.06 * s - bowY) * (0.35 * drawT);
      if (drawT >= 0.97) {
        // Full-draw tension tremble — the whole aim quivers with
        // effort, perpendicular to the PROJECTED aim line.
        const tr = Math.sin(rig.nowMs * 0.05) * 0.008 * s;
        mainX += -aim.uy * tr;
        mainY += aim.ux * tr;
        bowX += -aim.uy * tr * 0.5;
        bowY += aim.ux * tr * 0.5;
      }
    }
    offX = bowX;
    offY = bowY;
  }

  // ---- the sheathe: one blend moves the weapons between hand and body.
  // Blades stow to the belt, bows and staffs sling across the back; the
  // spots live in sheath.ts (pure, test-pinned) and ride hipY/shoulderY,
  // so they duck with a crouch and settle with a sit for free.
  // The worn kind reads through the same one detection as the held —
  // the stow solve and the hand solve can never disagree about class.
  const wornKind = wornDef !== undefined ? wieldClass(wornDef.id) : 'none';
  const wornGreat = wornKind === 'great';
  const wornBow = wornKind === 'bow';
  const wornStaff = wornKind === 'staff';
  const wornBack = wornBow || wornStaff || wornGreat;
  let mainStow: { x: number; y: number; angle: number } | null = null;
  if (wornDef) {
    if (wornBack) {
      // stowBack speaks painter space directly: staff angle = grip→
      // crown along local +X (the greatblade slings the same, lower
      // and steeper), bow angle = the mirrored-sling law.
      const spot = stowBack(wornBow ? 'bow' : wornGreat ? 'great' : 'staff', sideS);
      mainStow = {
        x: rig.x - fx * 0.14 * s + spot.dx * s * wS,
        y: shoulderY + spot.dy * s,
        angle: spot.angle,
      };
    } else {
      // The lie-back law (a stowed blade rests along the ground
      // beside a sitter) belongs to the FLOOR sit — on furniture the
      // hips ride the seat and the scabbard hangs upright at the hip.
      const spot = stowBlade('main', sideS, sideW, chairSit ? sit * 0.15 : sit);
      mainStow = { x: rig.x + spot.dx * s * wS, y: hipY + spot.dy * s, angle: spot.angle };
    }
  }
  let offStow: { x: number; y: number; angle: number } | null = null;
  if (offWorn) {
    const spot = stowBlade('off', sideS, sideW, chairSit ? sit * 0.15 : sit);
    offStow = { x: rig.x + spot.dx * s * wS, y: hipY + spot.dy * s, angle: spot.angle };
  }
  if (sheath > 0 && mainStow) {
    const ph = sheathePhases(sheath);
    if (!stowed) {
      // The reach: hand and weapon travel together to the stow spot,
      // the blade rolling to its seated rake on the way in. Falling
      // (a draw) plays the same path out of the scabbard.
      mainX += (mainStow.x - mainX) * ph.grabK;
      mainY += (mainStow.y - mainY) * ph.grabK;
      heldAngle += angleDelta(heldAngle, mainStow.angle) * ph.grabK;
      staffGrip += (0.5 - staffGrip) * ph.grabK;
      if (offStow) {
        offX += (offStow.x - offX) * ph.grabK;
        offY += (offStow.y - offY) * ph.grabK;
        offBladeAngle += angleDelta(offBladeAngle, offStow.angle) * ph.grabK;
      }
    } else {
      // The weapon is body gear now — the empty hands walk home from
      // the spot they left it (or reach back toward it, drawing).
      mainX = mainStow.x + (mainX - mainStow.x) * ph.homeK;
      mainY = mainStow.y + (mainY - mainStow.y) * ph.homeK;
      if (offStow) {
        offX = offStow.x + (offX - offStow.x) * ph.homeK;
        offY = offStow.y + (offY - offStow.y) * ph.homeK;
      }
    }
  }

  // ---- THE QUARTERSTAFF GUARD. Out of rest the off hand belongs ON
  // the wood ahead of the main fist, so every staff sweep and thrust
  // is a two-handed cut — but ONLY in the fight: the rest ladder never
  // claims it (a run is a one-hand balance carry; the user's verdict).
  // The claim is placed AFTER the sheathe blend so a stowing staff
  // releases the second fist, and it yields to everything with a
  // better right to the hand: the cast punch (castPunch), the seat
  // (sit), a busy off blade, the bow, and the shield's own claim
  // below, which lands after and wins.
  if (isStaff && !offBlade && !drawing && !loosing) {
    let claim = (1 - restSettle) * (1 - sit) * (1 - castPunch);
    claim *= 1 - sheathePhases(sheath).grabK;
    if (claim > 0) {
      // The choke rides the drawn shaft — mainFore keeps the second
      // fist on the foreshortened wood at the camera-line facings.
      const chokeS = STAFF_GUARD_CHOKE_S * mainFore;
      const cx = mainX + Math.cos(heldAngle) * chokeS * s * wS;
      const cy = mainY + Math.sin(heldAngle) * chokeS * s + 0.02 * s;
      offX += (cx - offX) * claim;
      offY += (cy - offY) * claim;
    }
  }

  // ---- THE SECOND FIST (the great school). Both hands belong to the
  // haft — but where the staff chokes the off hand up FRONT of the
  // main fist, great steel takes the pommel end BEHIND it: the true
  // two-hand hold. Combat welds it on (out of rest, through every
  // strike); the run's shoulder carry calls it back too (greatWield's
  // offClaim) — nobody sprints with six feet of iron in one fist.
  // Same yield order as the staff guard: cast punch, seat, sheathe,
  // and the shield claim below would win (a 2H stows the offhand, so
  // in practice the hand is always free to take the grip).
  if (isGreat && !offBlade && !drawing && !loosing) {
    let claim = Math.max(1 - restSettle, greatRunClaim);
    claim *= (1 - sit) * (1 - castPunch);
    claim *= 1 - sheathePhases(sheath).grabK;
    if (claim > 0) {
      const chokeS = GREAT_POMMEL_CHOKE_S * mainFore;
      const cx = mainX - Math.cos(heldAngle) * chokeS * s * wS;
      const cy = mainY - Math.sin(heldAngle) * chokeS * s + 0.03 * s;
      offX += (cx - offX) * claim;
      offY += (cy - offY) * claim;
    }
  }

  // ---- THE SHIELD LEADS THE ARM. Everything above solved a HAND and
  // hung gear off it; a shield inverts that. The plane is placed first
  // — upright, in front of the chest, square to the threat — and the
  // off hand is then dragged to the grip behind it, elbow braced along
  // the boards. That inversion is the whole difference between "a
  // board taped to a wrist" and a body standing behind a wall.
  // An archer's off hand is busy holding the bow: the shield sits the
  // volley out (the existing law), and the arm keeps its own carriage.
  const shieldArcher = drawing || loosing;
  let shieldFr: ShieldFrame | null = null;
  if (shieldSt && !shieldArcher) {
    // The finisher's drive, normalized: the shield rams with the body.
    const thrustK =
      meleeStage === 2
        ? Math.max(0, Math.min(1, (thrustR ?? (ice ? ice.r : 0)) / 0.55))
        : 0;
    shieldFr = solveShield(shieldSt, {
      x: rig.x,
      hipY,
      shoulderY,
      s,
      wS,
      fx,
      fy,
      sideS,
      restSettle,
      swing: swS,
      runF: rig.runF,
      poleX: rig.poleX,
      poleY: rig.poleY,
      poleStrength: rig.poleStrength,
      crouch,
      sling: Math.max(0, Math.min(1, (sheath - STOW_HANDOFF) / (1 - STOW_HANDOFF))),
      melee: meleeStage,
      poseT: rig.poseT,
      thrust: thrustK,
      nowMs: rig.nowMs,
    });
    // The fist closes on the grip — the arm now answers to the shield.
    // Slung, the hand lets go and walks home to its own hang.
    const claim = 1 - shieldFr.sling;
    offX += (shieldFr.gripX - offX) * claim;
    offY += (shieldFr.gripY - offY) * claim;
  }
  // ===================== THE ONE MOUTH ENDS =====================
  // Everything below READS the assembled channels; nothing writes.

  // Slash trails: a crisp crescent chasing each blade through its cut,
  // centered on the cut's plane (a high cleave rings high, a rising
  // return rings low) and fading through the held extension. The echo
  // draws its own smaller, fainter crescent — the second beat of the
  // one-two. The finishers fire a piston streak down the aim instead.
  // THE GROUND-ARC LAW: a cut sweeps the ground plane around the
  // body, so its trail is an ELLIPSE on screen — full width across,
  // foreshortened along the depth axis — not a screen circle. A
  // circular trail was the one element still telling the eye the
  // fight happened on a flat card.
  // THE ONE GROUND: the trail sweeps the same ellipse the fist travels.
  const TRAIL_K = WIELD_GROUND_K;
  const drawCrescent = (tr: StrikeTrail, r0: number, k: number): void => {
    const a = Math.max(0, Math.min(1, tr.alpha)) * k;
    if (a <= 0) return;
    const cy = armY + tr.lift * s * 0.6;
    const from = rig.dir + tr.from;
    const to = rig.dir + tr.to;
    const ccw = to < from;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(244, 239, 228, ${0.28 * a})`;
    ctx.lineWidth = 0.16 * s * k;
    ctx.beginPath();
    ctx.ellipse(rig.x, cy, r0, r0 * TRAIL_K, 0, from, to, ccw);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 252, 240, ${0.75 * a})`;
    ctx.lineWidth = 0.055 * s * k;
    ctx.beginPath();
    ctx.ellipse(rig.x, cy, r0 + 0.09 * s, (r0 + 0.09 * s) * TRAIL_K, 0, from, to, ccw);
    ctx.stroke();
    ctx.lineCap = 'butt';
  };
  if (mainTrail && (weapon?.weapon?.style === 'onehand' || weapon?.weapon?.style === 'twohand' || isStaff)) {
    // A staff's WEAPON range is its spell reach — the sweep is an
    // arm's-length fact, so the crescent radius caps at melee reach.
    // A greatweapon's range IS its reach: the crescent earns the
    // school's whole horizon (the biggest arcs in the game).
    drawCrescent(mainTrail, Math.min(weapon?.weapon?.range ?? 1.6, isGreat ? 2.8 : 2) * 0.27 * s, 1);
  }
  if (echoTr && offBlade) {
    const offRange = itemDef(rig.offhandItem!)?.weapon?.range ?? 1.5;
    drawCrescent(echoTr, offRange * 0.27 * s * 0.8, 0.7);
  }
  if (meleeStage === 2 && isGreat) {
    // THE MOUNTAIN FALLS leaves its own mark: a vertical smash streak
    // dropping onto the strike point through the drive, dying through
    // the buried hold — the fall, drawn.
    const P = GREAT_FINISHER_PHASES;
    const t = rig.poseT;
    if (t >= P.hold + 0.02 && t < P.buried + 0.06) {
      const fade = 1 - Math.max(0, (t - P.drive) / (P.buried + 0.06 - P.drive));
      const reach = Math.min(weapon?.weapon?.range ?? 2.4, 2.8) * 0.3 * s;
      const tx = rig.x + aim.px * reach * wS;
      const ty = armY + aim.py * reach + 0.24 * s;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(244, 239, 228, ${0.3 * fade})`;
      ctx.lineWidth = 0.24 * s;
      ctx.beginPath();
      ctx.moveTo(rig.x + fx * 0.1 * s, armY - 0.75 * s);
      ctx.lineTo(tx, ty - 0.15 * s);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.7 * fade})`;
      ctx.lineWidth = 0.09 * s;
      ctx.beginPath();
      ctx.moveTo(rig.x + fx * 0.2 * s, armY - 0.45 * s);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  if (meleeStage === 2 && weapon?.weapon?.style === 'onehand') {
    // The finisher streak, on the shared finisher clock: alive from
    // the loosing of the drive, dying through the buried hold. The
    // icepick's streak runs down its plunge line to the mark; the
    // thrust's straight down the aim.
    const P = FINISHER_PHASES;
    const t = rig.poseT;
    if (t >= P.hold + 0.02 && t < P.buried + 0.06) {
      const fade = 1 - Math.max(0, (t - P.drive) / (P.buried + 0.06 - P.drive));
      const r1 = (weapon.weapon.range ?? 1.7) * 0.33 * s;
      const tx = ice ? rig.x + aim.px * 0.6 * s * wS : rig.x + aim.px * r1;
      const ty = ice ? armY + aim.py * 0.6 * s + 0.26 * s : armY + aim.py * r1;
      const sx = ice ? rig.x + aim.px * 0.08 * s : rig.x + aim.px * 0.15 * s;
      const sy = ice ? armY + aim.py * 0.08 * s - 0.2 * s : armY + aim.py * 0.15 * s;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(244, 239, 228, ${0.3 * fade})`;
      ctx.lineWidth = 0.2 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (tx - sx) * 0.85, sy + (ty - sy) * 0.85);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.7 * fade})`;
      ctx.lineWidth = 0.08 * s;
      ctx.beginPath();
      ctx.moveTo(sx + (tx - sx) * 0.2, sy + (ty - sy) * 0.2);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  // Shoulders slide smoothly along the shoulder line toward each hand
  // (billboard-friendly: continuous, never pops). An archer anchors the
  // string arm on the rear shoulder, the bow arm on the front.
  const sleeve = rig.hurt ? '#ffffff' : (bodySt?.sleeve ?? shade(bodyColor, -12));
  const archer = drawing || loosing;
  // Shoulders: slide along the shoulder bar with an active swing, but
  // settle onto fixed anatomical anchors at rest — a hanging arm hangs
  // from its own shoulder, not from wherever the last swing left it.
  let mainShX = archer
    ? rig.x - fx * tw * 0.7 * wS
    : rig.x + Math.cos(mainAngle) * tw * 0.8 * wS;
  let offShX = archer
    ? rig.x + fx * tw * 0.8 * wS
    : rig.x + Math.cos(offAngle) * tw * 0.8 * wS;
  // Seated counts as fully settled: arms hang (or plant) from their
  // anatomical roots even though Sit is not a "restful" pose.
  const settleK = Math.max(restSettle, sit);
  // THE TRAILING ELBOW: a settled arm flares its elbow to its own
  // side of the body — but on the move both elbows swing BACK along
  // the travel. A runner's elbows trail; they never lead. (The rest
  // flare left the main elbow pointing AT the travel direction on a
  // profile run — the chicken-wing read the user caught.) Blended on
  // the gait so the flare returns the moment the body stops — and
  // gated on ALIGNMENT: trailing along the travel only makes sense
  // when the body travels the way it faces. Strafing or backpedaling
  // (facing one way, walking another) the arms belong to the BODY's
  // frame, and an un-gated travel pole folded the elbows inside-out
  // (the user's broken-elbow screenshot). The pole math itself lives
  // in wield.ts (settleElbowPole) with THE POLE NEVER VANISHES law:
  // the trail claims the flare only in proportion to |poleX|, so a
  // depth-axis run keeps its outboard elbows instead of collapsing
  // the preference to noise.
  const trailB =
    Math.min(1, rig.poleStrength) *
    (0.3 + 0.7 * rig.runF) *
    restSettle *
    Math.max(0, rig.align);
  const mainSettlePoleX = settleElbowPole(sideS, rig.poleX, trailB);
  const offSettlePoleX = settleElbowPole(-sideS, rig.poleX, trailB);
  // THE CROSSING LOCKS THE ELBOW: mid side-ease (|sideS| < 1) the
  // flare pole is collapsing through zero — every settled frame in
  // that window is degenerate, so the remembered sides hold outright
  // and the flip lands once, after the hands arrive. Rest carries
  // only: strikes and draws own their elbows dynamically.
  // THE FLIP EARNS ITS HYSTERESIS (arms-v3 Phase 4): every layer flag
  // below rides the one banded resolver on the caller's depth memory.
  // The bands straddle the old thresholds while leaving every CARDINAL
  // facing outside the dead zone — a settled heading resolves exactly
  // as the raw threshold did (det-pinned), but a slow arc across a
  // boundary now flips each layer exactly ONCE instead of flickering
  // with every heading wobble.
  const settleHalf = bandFlag(mem, 'settleHalf', restSettle, 0.55, 0.45);
  const awayDeep = bandFlag(mem, 'awayDeep', -fy, 0.42, 0.28);
  const fwdShoulder = bandFlag(mem, 'fwdShoulder', fy, 0.14, 0.02);
  const awayShoulder = bandFlag(mem, 'awayShoulder', -fy, 0.14, 0.02);
  const runTrail = bandFlag(mem, 'runTrail', rig.runF, 0.42, 0.28);
  const elbowEaseHold = settleHalf && Math.abs(sideS) < 0.98;
  // THE TURNED BAR: side-on the settle anchors tuck toward the body's
  // centerline (shoulderTuckK) and stagger along the facing — leading
  // arm a half-step ahead, trailing arm behind — the upper body's
  // answer to the profile stance the feet already take. The sockets
  // read the SAME tuck (ONE SPREAD LAW), so cap and root collapse as
  // one girdle.
  const barTuck = shoulderTuckK(fx);
  const barStag = shoulderStagK(fx) * tw;
  mainShX +=
    (rig.x + sideS * tw * SHOULDER_SETTLE_K * barTuck * wS + barStag * 0.06 - mainShX) * settleK;
  offShX +=
    (rig.x - sideS * tw * SHOULDER_SETTLE_K * barTuck * wS - barStag * 0.12 - offShX) * settleK;
  // ---- THE LIVING SHOULDER: the roots are not pins. The girdle
  // breathes on THE SAME CLOCK the hands ride (arms-v3 Phase 5's
  // standing breath, phases matched, quieter amplitude — the hand's
  // drift now visibly ORIGINATES at its own shoulder), and on the
  // move each root rolls with the stride, counter-phased across the
  // bar the way a real shoulder line seesaws over the footfalls.
  // Everything worn ON the root — the arm and the pauldron alike —
  // consumes these solved Ys, so shoulder, sleeve and cap move as
  // one body instead of a cap bolted over a living arm.
  const mainSideSign = Math.sign(sideS) || 1;
  const rootRest = (1 - Math.min(1, rig.poleStrength)) * restSettle * (1 - sit);
  const rootB = Math.sin(rig.nowMs * 0.0019) * rootRest;
  const rootB2 = Math.sin(rig.nowMs * 0.0019 + 1.1) * rootRest;
  const rootSw = ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP;
  const rootRoll = 0.012 * s * rig.runF * Math.min(1, rig.poleStrength);
  const mainShY = shoulderY + rootB * 0.008 * s + rootSw * rootRoll * mainSideSign;
  const offShY = shoulderY + rootB2 * 0.009 * s - rootSw * rootRoll * mainSideSign;
  if (RIG_DEBUG.on) {
    RIG_DEBUG.x = rig.x;
    RIG_DEBUG.hipY = hipY;
    RIG_DEBUG.shoulderY = shoulderY;
    RIG_DEBUG.s = s;
    RIG_DEBUG.tw = tw;
    RIG_DEBUG.wS = wS;
    RIG_DEBUG.dir = rig.dir;
    RIG_DEBUG.mainShX = mainShX;
    RIG_DEBUG.mainShY = mainShY;
    RIG_DEBUG.offShX = offShX;
    RIG_DEBUG.offShY = offShY;
    RIG_DEBUG.anchorMainX =
      rig.x + sideS * tw * SHOULDER_SETTLE_K * barTuck * wS + barStag * 0.06;
    RIG_DEBUG.anchorOffX =
      rig.x - sideS * tw * SHOULDER_SETTLE_K * barTuck * wS - barStag * 0.12;
    RIG_DEBUG.sockets.length = 0;
  }
  // Aiming up-and-away puts the gear behind the body. And a LONG
  // carry crossing the body goes behind it too: the staff's leveled
  // run trail at a camera-facing heading swept its butt half up
  // across the chest and FACE when painted in front (the user's
  // catch) — the body belongs in front of the pole, crown showing
  // beside the hip, butt hidden behind the shoulder. Gated on the
  // run trail itself (a planted stick and the combat guard stay in
  // front, where the business end lives).
  const staffTrailBehind = isStaff && settleHalf && runTrail && fwdShoulder;
  // The shoulder carry lays the greatblade up-BACK over the trailing
  // shoulder at EVERY gait — facing the camera, the body stands in
  // front of it (the LONG CARRY GOES BEHIND law; strikes and the
  // guard keep the business end in front). Facing AWAY the same rest
  // lies on the NEAR side of the body — the blade crosses the BACK,
  // which the camera sees — so the generic aim-away rule must not
  // hide it behind the torso.
  const greatShoulderBehind = isGreat && settleHalf && fwdShoulder;
  const greatRestFront = isGreat && settleHalf && awayShoulder;
  const weaponBehind =
    (awayDeep && !greatRestFront) || staffTrailBehind || greatShoulderBehind;
  const cuff = bodySt?.sleeves === 'full' ? sleeve : undefined;
  const paintOffArm = (): void => {
    // DUAL WIELD: the off blade is the real weapon, carried by the off
    // fist in its OWN grip — raised guard in combat, settling into its
    // full carriage (standard or reversed) at rest. It paints BEFORE
    // the arm — weapon, then fist, the main hand's layering — so the
    // mitt visibly wraps the hilt instead of the grip floating on top
    // of the hand.
    const offWeapon = offSt?.kind === 'weapon' && rig.offhandItem !== undefined && !archer;
    if (offWeapon && offSt) {
      drawHeldItem(ctx, rig.offhandItem!, offSt.color, offX, offY, offBladeAngle, s, rig, {
        ench: rig.offhandEnch,
        flip: offFlip,
        fore: offFore,
      });
    }
    // THE SHIELD'S OWN LAYER ORDER, and it is not the arm's. Turned
    // toward us, the boards cover the fist that holds them — arm, then
    // shield. Turned away, we are looking at the shield's BACK, and
    // the forearm is between us and it: shield first, then the arm,
    // then the enarmes struck back over the sleeve so the limb reads
    // as genuinely threaded through the straps.
    const shieldBehindArm = shieldFr !== null && shieldFr.seeBack;
    if (shieldSt && shieldFr && shieldBehindArm) {
      drawShield(ctx, shieldSt, shieldFr, rig.hurt, rig.nowMs);
    }
    // The elbow braces along the boards when a shield claims the arm,
    // and lets go again as the shield swings onto the back.
    const freePoleX =
      (archer ? fx * 0.2 : Math.cos(offAngle) * 0.4) * (1 - settleK) + offSettlePoleX * settleK;
    const claim = shieldFr ? 1 - shieldFr.sling : 0;
    const armPoleX = freePoleX + (shieldFr ? (shieldFr.poleX - freePoleX) * claim : 0);
    const armPoleY = 1 + (shieldFr ? (shieldFr.poleY - 1) * claim : 0);
    const joints = drawArm(
      ctx,
      offShX,
      offShY,
      offX,
      offY,
      armPoleX,
      armPoleY,
      sleeve,
      skin,
      s,
      cuff,
      gloveSt,
      rig.hurt,
      skel,
      mem ? (mem.offElbow ??= { sign: 0 }) : undefined,
      elbowEaseHold,
      rig.nowMs,
      gno,
      gol,
    );
    if (shieldSt && shieldFr) {
      if (shieldBehindArm) drawShieldStraps(ctx, shieldSt, shieldFr, rig.hurt);
      else drawShield(ctx, shieldSt, shieldFr, rig.hurt, rig.nowMs);
    }
    // Arm-carried offhand rides the solved forearm, same depth layer as
    // the arm itself so the strap never breaks. An archer's off hand is
    // busy holding the bow — the shield sits this one out.
    if (offSt && offSt.kind !== 'quiver' && !archer && !offWeapon && !shieldSt) {
      drawOffhandOnArm(ctx, offSt, joints, s, profileK, rig.hurt, rig.nowMs);
    }
  };
  // Back-mounted quiver. Depth follows the cape's facing law — behind
  // the torso when the player faces the camera, in front when they face
  // away. With a cape worn the RENDERER owns this call (drawBackGear),
  // layered over the cloth — gear straps OVER a cape, never under it.
  const quiverFront = offSt?.kind === 'quiver' && bandFlag(mem, 'slingFront', -fy, 0.22, 0.1);
  const paintQuiver = (): void => {
    if (!offSt || offSt.kind !== 'quiver' || rig.hasCape) return;
    drawQuiver(ctx, offSt, rig.x - fx * 0.14 * s, shoulderY - 0.02 * s, s, lead, rig.hurt, rig.nowMs);
  };
  // ---- stowed weapons on the body. A sheathed BLADE wears its
  // scabbard: a leather sleeve covering the steel from guard to point,
  // dressed with the blade's own guard metal (locket at the mouth,
  // chape at the tip) so every bespoke sword keeps its identity while
  // visibly put away. The belt FROG — the loop that hangs the scabbard
  // from the belt — paints over the mouth: that strap is what
  // attaches the steel to the body instead of floating it at the hip.
  const paintScabbard = (spot: { x: number; y: number; angle: number }, itemId: string): void => {
    const bSt = bladeStyle(itemId, '#8d9299');
    if (!bSt) return; // tools hang bare on the frog — no sleeve
    ctx.save();
    ctx.translate(spot.x, spot.y);
    ctx.rotate(spot.angle);
    const mouth = 0.035 * s;
    const tip = 0.045 * s + (bSt.len ?? 1) * 0.44 * s + 0.02 * s;
    const leather = rig.hurt ? '#ffffff' : '#453324';
    // The sleeve: widest at the mouth, tapering to a rounded point.
    ctx.fillStyle = leather;
    ctx.beginPath();
    ctx.moveTo(mouth, -0.055 * s);
    ctx.lineTo(tip - 0.06 * s, -0.034 * s);
    ctx.quadraticCurveTo(tip + 0.015 * s, 0, tip - 0.06 * s, 0.034 * s);
    ctx.lineTo(mouth, 0.055 * s);
    ctx.closePath();
    ctx.fill();
    if (!rig.hurt) {
      // Stitched seam down the center line — worn leather, not a slab.
      ctx.strokeStyle = '#5d4732';
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(mouth + 0.05 * s, 0);
      ctx.lineTo(tip - 0.07 * s, 0);
      ctx.stroke();
      // Furniture in the blade's own guard metal: the locket banding
      // the mouth, the chape capping the point.
      const metal = bSt.guardColor ?? '#4a4554';
      ctx.fillStyle = metal;
      ctx.fillRect(mouth, -0.058 * s, 0.042 * s, 0.116 * s);
      ctx.beginPath();
      ctx.moveTo(tip - 0.075 * s, -0.037 * s);
      ctx.quadraticCurveTo(tip + 0.018 * s, 0, tip - 0.075 * s, 0.037 * s);
      ctx.lineTo(tip - 0.045 * s, 0.02 * s);
      ctx.lineTo(tip - 0.045 * s, -0.02 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  const paintFrog = (spot: { x: number; y: number; angle: number }): void => {
    if (rig.hurt) return; // the hurt flash keeps silhouettes clean
    ctx.save();
    ctx.translate(spot.x, spot.y);
    ctx.rotate(spot.angle);
    ctx.fillStyle = '#43331f';
    ctx.beginPath();
    ctx.roundRect(0.09 * s, -0.06 * s, 0.062 * s, 0.12 * s, 0.02 * s);
    ctx.fill();
    ctx.fillStyle = '#5d4a30';
    ctx.fillRect(0.104 * s, -0.06 * s, 0.014 * s, 0.12 * s);
    ctx.restore();
  };
  const paintStowedMain = (): void => {
    if (!stowed || !wornDef || !mainStow) return;
    drawHeldItem(ctx, wornDef.id, wornDef.color, mainStow.x, mainStow.y, mainStow.angle, s, rig, {
      ench: rig.weaponEnch,
      carry: wornBow ? 1 : 0,
      grip: 0.5,
    });
    if (!wornBack) {
      paintScabbard(mainStow, wornDef.id);
      paintFrog(mainStow);
    }
  };
  const paintStowedOff = (): void => {
    if (!stowed || !offStow || !offSt || !rig.offhandItem) return;
    drawHeldItem(ctx, rig.offhandItem, offSt.color, offStow.x, offStow.y, offStow.angle, s, rig, {
      ench: rig.offhandEnch,
    });
    paintScabbard(offStow, rig.offhandItem);
    paintFrog(offStow);
  };
  // Back slings share the quiver's depth law: behind the torso facing
  // the camera, over it facing away. With a cape the renderer owns the
  // call (drawBackGear) so the sling straps over the cloth. Belt gear
  // has its own depth: at PROFILE the main scabbard hangs off the
  // TRAILING hip — the blade rakes back behind the body, so it tucks
  // behind the torso — while the off scabbard rides the leading hip in
  // front; face-on both hips sit outside the waist and paint in front.
  const slingFront = bandFlag(mem, 'slingFront', -fy, 0.22, 0.1);
  // (The leg layer, belt gear, and quiver paint down at the depth
  // ladder — after every paint closure exists, before the torso.)
  const paintMainArm = (): void => {
    drawArm(
      ctx,
      mainShX,
      mainShY,
      mainX,
      mainY,
      (archer ? -fx : Math.cos(mainAngle) * 0.4) * (1 - settleK) +
        mainSettlePoleX * settleK,
      archer ? -0.6 : 1,
      sleeve,
      skin,
      s,
      cuff,
      gloveSt,
      rig.hurt,
      skel,
      mem ? (mem.mainElbow ??= { sign: 0 }) : undefined,
      elbowEaseHold,
      rig.nowMs,
      gno,
      gol,
    );
  };
  // ---- THE BILLBOARD SOCKET: pauldrons sit on the rig's SHOULDER
  // SOCKETS — and the sockets obey the BILLBOARD's law, not a 3D
  // projection's. This rig never yaws its torso: at every facing the
  // body is a front-ish billboard whose depth is spoken through the
  // wS squash, layering and size — the settled arms root at a
  // CONSTANT spread (±SHOULDER_SETTLE_K·tw, the anatomical anchor law
  // at line one of the shoulder settle) no matter the heading. The
  // previous frame projected the shoulder bar like true 3D (lx =
  // ∓fy·tw), so at a profile both caps collapsed onto the SPINE while
  // the arms kept their billboard spread — caps beside the head,
  // roots bare (the user's stormsinger E sheet). One law now serves
  // both: each cap's socket spreads by the SAME settle constant the
  // arm hangs from (widening to the garment corner only as the facing
  // squares to the camera), and runs through the exact matrix the
  // torso paints with — hip translate, combat lean, wS/hScale squash
  // — so cap and arm root can never disagree again. Depth is spoken
  // the billboard way: a small far-rise/near-drop on the shoulder
  // line, ±15% size in drawPauldron, and the layer flag — far cap
  // BEHIND the torso, crown peeking over the trapezius; near cap in
  // front, cupping the arm root. BOTH always paint: depth decides
  // layer, size and lean, never existence. Which screen side each
  // anatomical cap owns flips ONCE through a profile on its own
  // hysteresis band (the arms' remembered-side law), never per-frame.
  // The stride rolls each cap on its own end; the combat lean carries
  // both through every swing because the frame itself leans. History:
  // the caps once rode the solved ARM anchors and followed the HANDS
  // (akimbo dragged a cap to the cheek); then rode a projected 3D bar
  // and abandoned the billboard. The arm never owns the pauldron; the
  // projection never owns the billboard.
  //
  // ---- THE LIVING SOCKET (the third law, and the reconciliation):
  // the billboard owns the cap's HOME; the arm owns its MOTION. Each
  // cap now reads its own arm's SOLVED root and follows the root's
  // DEVIATION from the settle anchor — the strike's slide along the
  // bar, the archer's rotation into the draw, the girdle's standing
  // breath and stride roll — position and a matching lean. The
  // deviation is CLAMPED to a fifth of the torso, so the old akimbo
  // failure (a cap dragged to the cheek by a hand) stays impossible
  // BY CONSTRUCTION: at rest the deviation is zero and the billboard
  // law holds bit-exact; in motion the cap is an extension of the
  // arm, never its passenger. A pauldron that ignores its own arm
  // reads as bolted to the torso — the user's palethorn/kingsmane
  // catch that founded this law.
  const paintPauldrons = (layer: 'behind' | 'front'): void => {
    if (!bodySt || bodySt.pauldron === 'none') return;
    const cosL = Math.cos(lean);
    const sinL = Math.sin(lean);
    // The garment's shoulder line, in torso-local units — the same
    // height shoulderY resolves to, expressed inside the frame.
    const lyBar = -th + (SHOULDER_Y_DROP_S * s) / hScale;
    const strideSwP = ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP;
    // Socket spread: exactly the arm's anatomical settle spread at a
    // profile (cap ON the root), easing out to the garment's own
    // corner (0.98·tw) as the shoulder bar squares to the camera —
    // there the cap wraps the OUTSIDE of the root, as a worn cap does.
    // THE TURNED BAR: the settle spread itself now tucks side-on
    // (shoulderTuckK — the same function the arm anchors ride), so at
    // a profile the near cap stands over the body's centerline where
    // its arm actually roots, not parked at a frontal corner.
    const settleSpread = SHOULDER_SETTLE_K * shoulderTuckK(fx);
    const spread = tw * (settleSpread + (0.98 - settleSpread) * Math.abs(fy));
    for (const e of [1, -1] as const) {
      // Screen side, remembered: ±fy decides while the bar reads,
      // the band holds through the profile crossing so each cap
      // flips sides exactly once per half-turn. The ±1e-4 bias keeps
      // the stateless fallback deterministic (and opposite) at an
      // exact profile.
      const sideScr = bandFlag(
        mem,
        e === 1 ? 'capSideA' : 'capSideB',
        e * (-fy + 1e-4),
        0.1,
        -0.1,
      )
        ? 1
        : -1;
      const depthK = e * fx; // -1 far .. +1 near
      // Depth, spoken asymmetrically: the NEAR cap drops down its
      // root (we look down onto it); the FAR cap must NOT rise — a
      // tall device lifted at the far socket parks its crown at EYE
      // height beside the face (the stormsinger crystal lesson). The
      // far shoulder instead peeks OUTBOARD past the torso's back
      // edge at shoulder height — the classic side-view read — with
      // only a whisper of rise for the bird's-eye tilt.
      const nearK = Math.max(0, depthK);
      const farK = Math.max(0, -depthK);
      // The near drop deepens toward a full profile: the head slides
      // to the leading edge there and stands directly over the near
      // socket, so the cap seats at the jaw line — cupping the upper
      // arm — for the face to stay sovereign. (0.32 was the first
      // cut: it parked the cap over the CHEST, a floating device
      // divorced from its own arm — the user's palethorn E catch.
      // 0.2 lifted the stormspire crystals into the FACE. 0.26 holds
      // both laws: tall devices clear the jaw, compact caps still
      // read seated ON the root — with the living socket carrying
      // the attachment the drop was over-asked to fake.)
      // The near cap wraps the OUTSIDE of its shoulder: with the
      // turned bar tucking the roots toward the centerline, a cap
      // centered ON the root lands inside the head column at a
      // profile and fuses with the jaw. It biases outboard toward
      // the leading silhouette edge instead — worn over the arm,
      // clear of the chin — and seats a touch DEEPER as the bias
      // engages, so tall devices ride the deltoid, not the cheek.
      // Zero face-on (nearK is |fx|-driven).
      // The far peek is anchored to the torso's BACK EDGE, not to the
      // spread: a fixed offset from the tucked bar parked tall far
      // devices against the trailing cheek (the stormsinger crystal
      // lesson, round two). Whatever the spread does, the far cap
      // lands just past the garment's own edge (1.1·tw) — the classic
      // side-view sliver — and never nearer.
      const farOut = Math.max(0.34 * tw, 1.1 * tw - spread);
      const lx = sideScr * (spread + farK * farOut + nearK * tw * 0.14);
      const ly = lyBar + nearK * tw * 0.3 - farK * tw * 0.08;
      const px = lx * wS;
      const py = ly * hScale;
      // THE LIVING SOCKET: this cap's own arm root, solved above —
      // main arm settles on sign(sideS)'s screen side, off arm
      // opposite — and its deviation from the settle anchor, clamped
      // to a fifth of the torso. Zero at rest by construction.
      const capIsMain = sideScr === mainSideSign;
      const rootX = capIsMain ? mainShX : offShX;
      const rootY = capIsMain ? mainShY : offShY;
      const devLim = 0.2 * tw * wS;
      const devX = Math.max(
        -devLim,
        Math.min(devLim, rootX - (rig.x + sideScr * tw * settleSpread * wS)),
      );
      const devY = rootY - shoulderY;
      const wx = rig.x + cosL * px - sinL * py + devX;
      const wy = hipY + sinL * px + cosL * py + devY;
      const behind = bandFlag(
        mem,
        e === 1 ? 'capBehindA' : 'capBehindB',
        -depthK,
        0.18,
        0.08,
      );
      if ((layer === 'behind') !== behind) continue;
      if (RIG_DEBUG.on) RIG_DEBUG.sockets.push({ x: wx, y: wy, depthK });
      // Orientation: the outward perspective lean (strongest when the
      // bar points at the camera and we see the cap from its side),
      // the combat lean the frame itself carries, the stride's roll —
      // opposite ends of the bar counter-rotate on the run — and the
      // root-follow lean: a cap riding its arm's slide along the bar
      // TIPS with the travel, the way a shrugging shoulder carries
      // its spaulder. An extension of the arm, not a hat on a peg.
      const tilt =
        Math.max(
          -0.34,
          Math.min(0.34, Math.atan2(sideScr * depthK * 0.5, Math.abs(fy) + 0.45)),
        ) +
        lean * 0.6 +
        strideSwP * 0.055 * rig.runF * e +
        (devX / (tw * wS)) * 0.4;
      drawPauldron(
        ctx, bodySt, wx, wy, sideScr, s, wS, rig.hurt, sideScr < 0, rig.nowMs,
        depthK, tilt,
      );
    }
  };
  const paintWeapon = (): void => {
    // Station props: the smith's own kit, drawn regardless of loadout.
    if (craftKind === 'anvil') {
      // Tongs gripping a glowing billet — the work in progress.
      const tang = Math.atan2(offY - (armY + 0.02 * s), offX - rig.x);
      const glow = 0.72 + Math.sin(rig.nowMs * 0.006) * 0.16;
      ctx.save();
      ctx.translate(offX, offY);
      ctx.rotate(tang);
      ctx.strokeStyle = '#4a4554';
      ctx.lineWidth = Math.max(2, s * 0.045);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-0.06 * s, side * 0.012 * s);
        ctx.lineTo(0.12 * s, side * 0.035 * s);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255, 176, 82, ${glow})`;
      ctx.beginPath();
      chamferRect(ctx, 0.1 * s, -0.038 * s, 0.2 * s, 0.076 * s, 0.02 * s);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 236, 180, ${glow * 0.85})`;
      ctx.fillRect(0.13 * s, -0.016 * s, 0.1 * s, 0.032 * s);
      ctx.restore();
      // The smith's hammer in the striking hand.
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(mainAngle);
      ctx.fillStyle = '#7a552e';
      ctx.beginPath();
      ctx.roundRect(-0.06 * s, -0.02 * s, 0.3 * s, 0.04 * s, 0.015 * s);
      ctx.fill();
      ctx.fillStyle = '#9aa2ac';
      ctx.beginPath();
      chamferRect(ctx, 0.18 * s, -0.075 * s, 0.11 * s, 0.15 * s, 0.03 * s);
      ctx.fill();
      ctx.fillStyle = '#c9ccd4';
      ctx.fillRect(0.18 * s, -0.075 * s, 0.11 * s, 0.045 * s);
      ctx.restore();
      return;
    }
    if (craftKind === 'furnace') {
      // A charged crucible carried in both hands, mouth aglow.
      const cx2 = (mainX + offX) / 2;
      const cy2 = (mainY + offY) / 2 - 0.02 * s;
      const glow = 0.6 + Math.sin(rig.nowMs * 0.008) * 0.2;
      ctx.fillStyle = '#4a4554';
      ctx.beginPath();
      chamferRect(ctx, cx2 - 0.11 * s, cy2 - 0.07 * s, 0.22 * s, 0.13 * s, 0.03 * s);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 158, 66, ${glow})`;
      ctx.beginPath();
      chamferRect(ctx, cx2 - 0.08 * s, cy2 - 0.065 * s, 0.16 * s, 0.045 * s, 0.015 * s);
      ctx.fill();
      return;
    }
    if (!weapon) return;
    if (bowX !== null) {
      // The drawn bow points down the PROJECTED aim and compresses at
      // the plane's half-measure — the arrow's angle and length are
      // the elevation read (a south draw reads low-forward, never
      // "aimed at the boots"; a north draw high-forward, never
      // straight up a flat card).
      drawHeldItem(ctx, weapon.id, weapon.color, bowX, bowY, aim.angle, s, rig, {
        pull: bowPull,
        loose: loosing ? rig.poseT : undefined,
        ench: rig.weaponEnch,
        fore: 1 - BOW_PLANE_SOFT * (1 - aim.fore),
      });
    } else {
      drawHeldItem(ctx, weapon.id, weapon.color, mainX, mainY, heldAngle, s, rig, {
        grip: staffGrip,
        // THE BOW IS HELD BY THE WOOD — always. The old restSettle
        // blend slid the fist onto the string line whenever the settle
        // was partial: a hand carrying a bowstring like a suitcase.
        carry: isBow ? 1 : 0,
        ench: rig.weaponEnch,
        flip: mainFlip,
        fore: mainFore,
      });
    }
  };

  // Far arm always sits behind the torso; the weapon + striking arm go
  // in front unless the character is aiming up and away.
  // DUAL-WIELD PROFILE FLIP (depth half) — the screen-side depth law:
  // facing right, the screen-LEFT hand is the near arm and paints
  // FOREMOST (after the torso); the screen-RIGHT hand is the far arm
  // and paints BEHIND it. So at profile the main pair drops before the
  // torso and the off pair moves after it — ONE flag drives both, so
  // the arms can never end up on the same layer with both weapons
  // reading as slung behind the back. Hysteresis on profileK (cape
  // front/back pattern, memory caller-owned) so aim jitter at the
  // boundary can never flicker the layering.
  const flipAt = mem ? (mem.mainBehind ? 0.78 : 0.86) : 0.82;
  const mainBehind = offBlade && restSettle > 0.5 && profileK > flipAt;
  if (mem) mem.mainBehind = mainBehind;
  // THE FACING-CAMERA DEPTH LAW: facing the viewer, BOTH arms hang on
  // the near side of the body — an off hand that overlaps the hip must
  // read in FRONT of the torso, not clip behind it (the frontal cone
  // where the depth effect "got lost"). Mirror of the weaponBehind law
  // for the opposite pole, with the same hysteresis pattern so aim
  // jitter at the boundary can never flicker the layering.
  const offFrontAt = mem ? (mem.offFront ? 0.28 : 0.4) : 0.34;
  // A shield overrides the hand's depth rule with the PLANE's: the arm
  // goes wherever its shield went, in or out of combat, so the boards
  // and the fist behind them can never end up on opposite sides of the
  // torso. The flip lands exactly at profile, where the shield is
  // edge-on beside the body and the swap is invisible by construction.
  const offFront = shieldFr
    ? shieldFr.front
    : !mainBehind && restSettle > 0.5 && fy > offFrontAt;
  if (mem) mem.offFront = offFront;
  // THE FAR SIDE GOES BEHIND THE LEGS: facing up-and-away, the hang
  // and the aim live on the body's FAR side — the whole gear layer
  // paints before the legs, not merely before the torso (dual blades
  // used to hang OVER the shins on a north-facing idle, the user's
  // screenshot). Same gate as weaponBehind's aim-away term, so the
  // layer swap shares that one boundary; the great rest's visible
  // back-carry keeps its front verdict, and the profile flip
  // (mainBehind) keeps its own torso-relative lanes.
  const gearBehindLegs = awayDeep && !greatRestFront;
  // THE HEAD SITS UPON THE SHOULDERS: at a settled rest with EMPTY
  // hands, the hanging arms belong UNDER the helm — a mantled hood
  // drapes over the arm root, a sleeve never juts over the head's own
  // cloth. Armed, striking, or aiming, the weapon pair keeps the old
  // front layer (the boldest thing on screen; an overhead swing must
  // cross in front of the face), so the flip rides the settle band
  // and the empty fist — it can never land mid-swing. The shoulder
  // caps still paint LAST either way: head upon shoulders, caps upon
  // the mantle.
  const headOverArms =
    settleHalf &&
    weapon === undefined &&
    !offBlade &&
    !weaponBehind &&
    !mainBehind &&
    !gearBehindLegs;
  if (gearBehindLegs && !mainBehind) {
    if (weaponBehind) {
      paintWeapon();
      paintMainArm();
    }
    if (!offFront) paintOffArm();
  }
  paintLegs();
  // Belt scabbards + the back quiver lie over the legs, under the
  // torso — exactly the layer they held when the legs painted early.
  const beltBehind = bandFlag(mem, 'beltBehind', profileK, 0.68, 0.56);
  if (!quiverFront) paintQuiver();
  if (stowed && offWorn && !beltBehind) paintStowedOff();
  if (stowed && !wornBack && beltBehind) paintStowedMain();
  if (stowed && wornBack && !slingFront && !rig.hasCape) paintStowedMain();
  if (mainBehind) {
    paintWeapon();
    paintMainArm();
  } else if (!offFront && !gearBehindLegs) {
    paintOffArm();
  }
  if (weaponBehind && !mainBehind && !gearBehindLegs) {
    paintWeapon();
    paintMainArm();
  }

  // Sprint lean: the torso tips into a full-tilt forward run — reads
  // side-on only (fx), and never when backpedaling against the aim.
  lean += 0.09 * rig.runF * Math.max(0, rig.align) * fx;
  // The kobold hunch: the whole species stands bent over its next
  // hole — a standing forward tip that stacks under the sprint lean
  // (and eases out when seated; a sitting kobold just slumps).
  if (kob) lean += 0.12 * fx * (1 - sit);
  // The gnoll hunch: seven feet of scavenger carried low — a heavier
  // standing tip than the kobold's (the lore's stoop), easing out
  // when seated.
  if (gno) lean += 0.18 * fx * (1 - sit);
  // The construct stands like a tower — no hunch. Only the rock golem
  // carries a lean: a stacked cairn was never plumb.
  if (gol) lean += (gol.build === 'rock' ? 0.06 : 0.015) * fx * (1 - sit);

  // Seated drape info for the garment painter: the ground line and the
  // solved knees mapped into the torso local frame (translate → lean
  // rotate → squash scale, inverted) so a robe's skirt can pool at the
  // TRUE ground and tent over a raised knee. Knees read from
  // KNEE_SCRATCH — legs solve before the torso, the ordering is
  // load-bearing.
  let seatDrape: { groundY: number; knees: Array<{ x: number; y: number }> } | undefined;
  if (sit > 0.01 && bodySt && bodySt.skirt > 0) {
    const cosL = Math.cos(lean);
    const sinL = Math.sin(lean);
    const loc = (px: number, py: number): { x: number; y: number } => {
      const dx = px - rig.x;
      const dy = py - hipY;
      return { x: (dx * cosL + dy * sinL) / wS, y: (-dx * sinL + dy * cosL) / hScale };
    };
    seatDrape = {
      groundY: loc(rig.x, rig.y).y,
      knees: KNEE_SCRATCH.map((kn) => loc(kn.x, kn.y)),
    };
  }

  // The far shoulder's cap ducks under the garment (profile band only)
  // — painted before the torso frame OPENS so it peeks over the
  // shoulder line from behind the cloth. It must run in the same WORLD
  // space as the front pass: inside the frame its world-coordinate
  // anchors got the frame's translate applied twice, teleporting the
  // cap to (2x, ~2y) — off-screen in game, so the leading cap simply
  // VANISHED at profile facings (the floating-cap ghost on unclipped
  // render sheets).
  paintPauldrons('behind');

  // ---- torso + head, drawn in a local frame at the hip line with the
  // fake-3D squash: narrow side profile, full front/back profile, height
  // compensating inversely so the turn reads as orientation.
  ctx.save();
  ctx.translate(rig.x, hipY);
  // Combat lean: the torso coils and tips with swings and braced draws.
  if (lean !== 0) ctx.rotate(lean);
  ctx.scale(wS, hScale);

  // The kobold tail rides the torso frame, painted BEFORE the garment
  // so its root always tucks behind the body — trailing the facing,
  // hanging low from behind, tip peeking past the hip face-on.
  if (kob) {
    paintKoboldTail(ctx, kob, {
      s,
      fx,
      fy,
      profileK,
      backK,
      lead,
      nowMs: rig.nowMs,
      runF: rig.runF,
      poleX: rig.poleX,
      hurt: rig.hurt,
    });
  }
  // The gnoll's tail is NOT painted here: it is a world-space verlet
  // simulation (tail.ts — the cape contract in muscle) ticked by the
  // caller and painted on the cape's facing-law side of the whole
  // body: behind facing the camera, in front facing away.

  // ---- head measurements, resolved BEFORE the torso paints. Hair is
  // a two-pass matter (THE HAIR RIDES THE SKULL RING, hair.ts): the
  // far-side pass lies UNDER the body — behind-the-head falls are
  // occluded by the torso from the front, exactly like real hair down
  // the back — while the near-side pass paints over the skull later.
  // Kobolds carry OVERSIZED heads for their frame — the big-headed
  // burrow-goblin proportion the whole species reads by; the kobold
  // skull hangs LOW and thrust FORWARD off the hump.
  // The gnoll skull hangs LOW and FORWARD — SUNK into the crest hump
  // (deeper than the kobold's), thrust ahead of the hunched
  // shoulders, and oversized so the jaw mass reads at distance: the
  // head is the predator's whole argument and the hunch is the pose
  // that presents it.
  // The golem head is SMALL for its frame and sunk INTO the shoulder
  // line — the neckless construct proportion: massive body, deep-set
  // capstone. The opposite argument to the kobold/gnoll oversize.
  const headR = 0.15 * s * (kob ? 1.16 : gno ? 1.22 : gol ? 1.04 : 1);
  const headX = kob ? fx * 0.14 * s : gno ? fx * 0.19 * s : gol ? fx * 0.08 * s : fx * 0.05 * s;
  const headY =
    kob ? -th - headR * 0.48 : gno ? -th - headR * 0.3 : gol ? -th - headR * 0.08 : -th - headR * 0.82;
  const hw = headR * 1.04; // half-width
  const hh = headR * 1.0; // half-height
  const cut = headR * 0.34;
  const helm = itemDef(rig.headItem ?? '');
  // THE WORN LIGHT reaches the head too: the brow band (drawArxBrow)
  // only paints when the resolved style carries the working, exactly
  // like every other slot above.
  const helmSt = helm ? withArx(helm.id, helmStyle(helm.id), worn.slots.head) : null;
  // THE COVERAGE LAW: a helmet never deletes a hairstyle, it CONTAINS it.
  //   free   — bare head or a circlet: the full hairdo.
  //   brim   — wizard's hat: the fringe cap only (cloth holds the rest).
  //   sealed — every forged metal kind (THE FORGE LAW: all metal is
  //            full-face): only the nape falls escape below the rim.
  //   cloth  — hoods: the cloth wraps everything.
  const helmKind = helmSt?.kind;
  const cover: HairCover =
    !helm || helmKind === 'circlet'
      ? 'free'
      : helmKind === 'wizard'
        ? 'brim'
        : helmKind === 'hood' || helmKind === 'guildcowl' ||
            helmKind === 'latchhood' || helmKind === 'veilwrap'
          ? 'cloth'
          : 'sealed';
  const hairCol = rig.hurt
    ? '#ffffff'
    : rig.look
      ? HAIR_COLORS[rig.look.hairColor]!
      : shade(bodyColor, -24);
  // NPC humanoids carry no Look — they wear the neutral short cut, not
  // the player default (a town where every crofter has collar-length
  // hair reads as a costume choice nobody made).
  const hairIx = rig.look?.hair ?? NPC_HAIR_STYLE;
  const hairFrame = {
    headX,
    headY,
    hw,
    hh,
    cut,
    fx,
    fy,
    col: hairCol,
    hurt: rig.hurt,
  };
  // The bone, scale, and fur dialects replace head, hair, and face wholesale.
  if (!skel && !kob && !gno && !gol) drawHairBack(ctx, hairFrame, hairIx, cover);

  // Torso garment: the styled body (robe, jerkin, brigandine, cuirass,
  // pauldrons) — the bare `tunic` default is the original silhouette.
  // The bone dialect wears no garment at all: the ribcage IS the torso.
  // (The far shoulder's behind-pass cap paints before this frame opens
  // — world coords never enter the torso frame.)
  if (skel) {
    paintRibcage(ctx, skel, {
      s,
      tw,
      ww,
      th,
      fx,
      lead,
      profileK,
      backK,
      hurt: rig.hurt,
    });
  } else if (gol) {
    // THE CONSTRUCT wears no garment — the stacked stone, forged
    // plate, cracked crust, or sheared ice IS the torso. The flare
    // input is the menace ramp: cracks gape and visors burn through
    // the wind of every art.
    paintGolemBody(ctx, gol, {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      runF: rig.runF,
      flare:
        meleeStage >= 0 || rig.pose === PoseState.Cast
          ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
          : 0,
    });
  } else {
    drawTorsoGarment(
      ctx,
      bodySt ?? {
        color: bodyColor,
        trim: shade(bodyColor, -20),
        cls: 'cloth',
        silhouette: 'tunic',
        pauldron: 'none',
        chest: 'none',
        skirt: 0,
      },
      {
        s,
        tw,
        ww,
        th,
        lead,
        profileK,
        backK,
        yaw: fx,
        hurt: rig.hurt,
        strideSw: ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP,
        nowMs: rig.nowMs,
        runF: rig.runF,
        sit,
        groundY: seatDrape?.groundY,
        seatKnees: seatDrape?.knees,
        // Cloth trails the travel: the hem drags OPPOSITE the motion,
        // un-squashed into the local frame so profile runs still read.
        dragX:
          (-rig.poleX * Math.min(1, rig.poleStrength) * (0.1 + 0.14 * rig.runF)) /
          Math.max(0.6, wS),
      },
    );
  }

  // The kobold's shoulder hump rises OVER the garment and UNDER the
  // head — the bent back the low-slung skull sinks into.
  if (kob) {
    paintKoboldHump(ctx, kob, bodyColor, {
      s,
      tw,
      th,
      fx,
      backK,
      hurt: rig.hurt,
    });
  }
  // The gnoll's body coat overpaints the garment quad (belly panel,
  // dorsal saddle, rosettes, hip fringe, the scavenger harness), then
  // the crest hump rises OVER it and UNDER the head — high furred
  // withers with the mane ridge on top.
  if (gno) {
    paintGnollBody(ctx, gno, {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
    });
    paintGnollCrest(ctx, gno, {
      s,
      tw,
      th,
      fx,
      backK,
      hurt: rig.hurt,
    });
  }

  // ---- THE HEAD SITS UPON THE SHOULDERS: at a settled, empty-handed
  // rest the torso frame closes here so the hanging arms can paint in
  // world space UNDER everything that follows — the head stack and
  // the helm whose mantle drapes onto the shoulders — then the frame
  // re-opens with the exact same matrix for the head. The caps still
  // paint last at the tail (head upon shoulders, caps upon mantle).
  if (headOverArms) {
    ctx.restore();
    if (offFront) paintOffArm();
    paintMainArm();
    ctx.save();
    ctx.translate(rig.x, hipY);
    if (lean !== 0) ctx.rotate(lean);
    ctx.scale(wS, hScale);
  }

  // ---- head (inside the squash frame so turning carries it too).
  // A chamfered block, not a ball — and a BILLBOARD FACE, not a dial:
  // the head reads in bands (front, three-quarter, profile, back).
  // Eyes live on one fixed eye line and slide only horizontally with
  // the facing; the pair narrows through three-quarter, the far eye
  // slips around the corner at profile, and the back of the head shows
  // hair, not features. Sliding features vertically with fy is what
  // made the old head read top-down. Measurements, the coverage tier,
  // and the far-side hair pass were all resolved above the torso.
  if (skel) {
    // THE SKULL replaces head, hair, and face wholesale — the helmet
    // (if the dead wear one) still fits over it below. The jaw gapes
    // through every strike beat: the skeleton BITES as it swings.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintSkull(ctx, skel, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      headR,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      gape,
    });
  } else if (kob) {
    // THE SCALE DIALECT head replaces head, hair, and face wholesale —
    // the muzzle leads the facing and the jaw yips through every
    // strike beat, same combat-bite clock as the skeleton's gape.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintKoboldHead(ctx, kob, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      gape,
    });
  } else if (gno) {
    // THE FUR DIALECT head replaces head, hair, and face wholesale —
    // the blunt muzzle leads the facing and the jaw drops through
    // every strike beat: the gnoll CACKLES as it swings.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintGnollHead(
      ctx,
      gno,
      {
        s,
        headX,
        headY,
        hw,
        hh,
        cut,
        fx,
        fy,
        profileK,
        backK,
        lead,
        hurt: rig.hurt,
        nowMs: rig.nowMs,
        gape,
      },
      gno.seed ?? 0,
    );
  } else if (gol) {
    // THE CONSTRUCT DIALECT head: capstone, helm block, crucible, or
    // sheared prism — the strike beat FLARES instead of biting (a
    // visor burns, a capstone nods, a pool surges, a crack flashes).
    const flare =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintGolemHead(
      ctx,
      gol,
      {
        s,
        headX,
        headY,
        hw,
        hh,
        cut,
        fx,
        fy,
        profileK,
        backK,
        lead,
        hurt: rig.hurt,
        nowMs: rig.nowMs,
        flare,
      },
      gol.seed ?? 0,
    );
  } else {
  ctx.fillStyle = skin;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 2, cut);
  ctx.fill();
  if (!rig.hurt) {
    // THE FORM SPLIT: the head shares the torso's screen-fixed x=0
    // light — hard shade on the right half, a lit crown band, and a
    // jaw under-shade, so the block reads as a skull, not a sticker.
    // CLIPPED TO THE SKULL: chamferRect clamps a corner cut to half a
    // shape's height, so the thin crown/jaw bands used to end in
    // near-square corners that poked PAST the head's chamfer — pale
    // skin chips floating at the head corners under every hairline.
    // Inside the clip the bands are plain rects; the silhouette owns
    // every edge.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 2, cut);
    ctx.clip();
    ctx.fillStyle = shade(skin, -9);
    ctx.fillRect(headX, headY - hh, hw, hh * 2);
    ctx.fillStyle = shade(skin, -16);
    ctx.fillRect(headX - hw, headY + hh * 0.8, hw * 2, hh * 0.2);
    ctx.fillStyle = shade(skin, 8);
    ctx.fillRect(headX - hw, headY - hh, hw * 2, hh * 0.18);
    ctx.restore();
  }
  // Ears ride the head sides UNDER the hair (curtains lie over the
  // roots; pointed tips break the silhouette — that is the point).
  // Round ears vanish into the block head; metal and cloth cover all.
  //
  // THE AZIMUTH LAW: each ear lives at a fixed bearing on the skull —
  // 90° either side of the nose — and every facing question is
  // answered by projecting that bearing, never by special-casing
  // bands. For ear `es`, azimuth φ = dir − es·π/2 gives:
  //   cosP = es·fy   — where the ear sits across the screen (±1 = the
  //                    silhouette edges, 0 = mid-skull at profile);
  //   sinP = −es·fx  — how much it faces the camera (>0 in front of
  //                    the skull, <0 tucked behind the turned head).
  // So the TRAILING ear stays in view through a turn (riding toward
  // mid-skull at profile, exactly where a portrait puts it) while the
  // LEADING ear forshortens and ducks behind the face — it never
  // crosses onto the eyes. From behind, the pair swaps screen sides
  // (a mirror does that) and shows ear BACKS: no concha, no seam.
  // Each ear is a FACETED LEAF: rib-split lit/shaded faces, a concha
  // hollow scaled by how much the flap faces the camera, a root seam
  // against the skull, and a sweep-back lean that grows as the radial
  // axis leaves the screen plane (elf ears trail the facing).
  const earStyle = rig.look?.ears ?? 0;
  if (earStyle > 0 && (cover === 'free' || cover === 'brim')) {
    for (const es of [-1, 1]) {
      const cosP = es * fy;
      const sinP = -es * fx;
      // Visible facing the camera, or protruding at the silhouette
      // edge (pure front/back). The leading ear fades smoothly as it
      // slides behind the turned face.
      const vis = Math.max((sinP + 0.12) / 0.6, (Math.abs(cosP) - 0.86) / 0.14);
      if (vis <= 0.05) continue;
      const v = Math.min(1, vis);
      const rootX = headX - fx * headR * 0.16 + cosP * hw * 0.94;
      const rootY = headY + headR * 0.1 + fy * headR * 0.05;
      // The leaf's horizontal run: radial reach plus sweep-back. At
      // the back quarters the two nearly cancel — the ear points at
      // the camera — so a floor keeps the flap a readable nub.
      const dirRaw = cosP + -fx * 0.85;
      const dSign = dirRaw >= 0 ? 1 : -1;
      const dLen = Math.max(0.5, Math.min(1, Math.abs(dirRaw))) * v;
      const earBack = backK > 0.55;
      // How much of the flap's front face shows: full at profile and
      // the front quarters, partial head-on, none from behind.
      const hollowK = earBack ? 0 : Math.max(0, Math.min(1, (sinP + 0.5) / 0.7));
      // Screen-side light law by actual screen position, so the pair
      // keeps the head's x=0 split even after the behind-the-head
      // mirror swap; ear backs sit a step darker (nape shadow).
      const earBase = rig.hurt
        ? skin
        : shade(skin, (cosP > 0 ? -9 : 0) + (earBack ? -7 : 0));
      // A flap riding IN FRONT of the skull (the profile band) is
      // skin against skin — it needs its own rim to read. Front and
      // back ears break the silhouette and the sky separates them.
      const contourK = Math.max(0, Math.min(1, (sinP - 0.45) / 0.55));
      const rimEar = (path: Path2D): void => {
        if (rig.hurt || contourK <= 0.15) return;
        ctx.strokeStyle = shade(skin, -22);
        ctx.lineWidth = headR * 0.055 * contourK;
        ctx.lineJoin = 'round';
        ctx.stroke(path);
        ctx.lineJoin = 'miter';
      };
      ctx.fillStyle = earBase;
      if (earStyle === 1) {
        // Pointed — the long leaf, tip rising as the head turns (the
        // swept-back drow read at profile, level at front).
        const eL = headR * 0.62 * dLen;
        const upT = 0.34 + 0.16 * (1 - Math.abs(cosP));
        const topY = rootY - headR * 0.26;
        const tipX = rootX + dSign * eL;
        const tipY = rootY - headR * upT;
        const botY = rootY + headR * 0.2;
        const leaf = new Path2D();
        leaf.moveTo(rootX, topY);
        leaf.lineTo(tipX, tipY);
        leaf.lineTo(rootX + dSign * eL * 0.3, rootY + headR * 0.08);
        leaf.lineTo(rootX, botY);
        leaf.closePath();
        rimEar(leaf);
        ctx.fill(leaf);
        if (!rig.hurt) {
          // Under-face: everything below the rib line falls into
          // shade, giving the leaf its fold and thickness.
          ctx.fillStyle = shade(earBase, -12);
          ctx.beginPath();
          ctx.moveTo(rootX, rootY - headR * 0.03);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(rootX + dSign * eL * 0.3, rootY + headR * 0.08);
          ctx.lineTo(rootX, botY);
          ctx.closePath();
          ctx.fill();
          if (hollowK > 0.1) {
            // The hollow: a concha wedge nested against the root,
            // opening wider the more the flap faces the camera.
            ctx.fillStyle = shade(skin, -24);
            ctx.beginPath();
            ctx.moveTo(rootX + dSign * headR * 0.03, rootY - headR * 0.12);
            ctx.lineTo(rootX + dSign * eL * 0.42 * hollowK, rootY - headR * 0.16);
            ctx.lineTo(rootX + dSign * headR * 0.03, rootY + headR * 0.1);
            ctx.closePath();
            ctx.fill();
          }
          if (!earBack) {
            // Root seam: cartilage meets skull on a hard dark line.
            ctx.fillStyle = shade(skin, -30);
            ctx.fillRect(
              rootX - dSign * headR * 0.005,
              topY + headR * 0.06,
              dSign * headR * 0.035,
              botY - topY - headR * 0.12,
            );
          }
        }
      } else {
        // Upswept — the tall fey blade angling for the crown, leaning
        // with the sweep so it trails the facing through a turn.
        const kX = dSign * headR * dLen;
        const botY = rootY + headR * 0.2;
        const tipX = rootX + kX * 0.5;
        const tipY = rootY - headR * (0.74 - 0.1 * (1 - v));
        const blade = new Path2D();
        blade.moveTo(rootX, botY);
        blade.lineTo(rootX + kX * 0.34, rootY - headR * 0.06);
        blade.lineTo(tipX, tipY);
        blade.lineTo(rootX + dSign * headR * 0.05, rootY - headR * 0.24);
        blade.lineTo(rootX, rootY - headR * 0.02);
        blade.closePath();
        rimEar(blade);
        ctx.fill(blade);
        if (!rig.hurt) {
          // Leading face: the outer half of the blade catches light,
          // the inner half turns away — a standing fin, not a stripe.
          ctx.fillStyle = shade(earBase, 8);
          ctx.beginPath();
          ctx.moveTo(rootX + kX * 0.34, rootY - headR * 0.06);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(rootX + kX * 0.24, rootY - headR * 0.3);
          ctx.closePath();
          ctx.fill();
          if (hollowK > 0.1) {
            // The hollow nested low, against the skull.
            ctx.fillStyle = shade(skin, -24);
            ctx.beginPath();
            ctx.moveTo(rootX + dSign * headR * 0.04, rootY + headR * 0.08);
            ctx.lineTo(rootX + kX * 0.24 * hollowK, rootY - headR * 0.14);
            ctx.lineTo(rootX + dSign * headR * 0.05, rootY - headR * 0.12);
            ctx.closePath();
            ctx.fill();
          }
          // Dark tip bead: the point ends in shadow, and stays a
          // point at any zoom instead of dissolving into the sky.
          ctx.fillStyle = shade(earBase, -16);
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - kX * 0.14, tipY + headR * 0.2);
          ctx.lineTo(tipX - kX * 0.02, tipY + headR * 0.22);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // The near-side hair: cap with its solved hairline + camera-facing
  // locks, painted OVER the ears (curtains overlay roots; pointed ear
  // tips break the cap silhouette sideways — that is the point).
  drawHairFront(ctx, hairFrame, hairIx, cover);

  // Face — only where a face actually is.
  if (backK <= 0.55) {
    const faceK = 1 - Math.max(0, Math.min(1, (-fy - 0.05) / 0.25)) * 0.35; // dim up-facing
    // One fixed eye line: a whisper of vertical drift for life, never
    // a slide onto the scalp or chin.
    const eyeLineY = headY + headR * 0.1 + fy * headR * 0.06;
    // The big symmetric slabs (beard, mouth line) ride a simple pair
    // slide; the face FEATURES project off the skull ring below.
    const pairX = headX + fx * headR * 0.36;
    const eyeStyle = rig.look?.eyes ?? 0;
    const feature = rig.look?.feature ?? 0;
    // THE FACE WRAPS THE SKULL (supersedes the pair-slide + far-side
    // collapse): every feature lives at a fixed bearing off the nose
    // (u = sin of its angle, −1..1 across the face) and every facing
    // question is answered by PROJECTING that bearing, the ears'
    // azimuth law brought onto the face:
    //   screen x       = (fx·√(1−u²) + fy·u)·headR
    //   camera-facing  =  fy·√(1−u²) − fx·u
    // So a turn slides BOTH eyes toward the leading edge: the leading
    // eye rides out to the silhouette, forshortens, and slips around
    // the corner (gone well before pure profile), while the trailing
    // eye crosses the face and lands by the nose as the single
    // profile eye. A feature only ever narrows while it is rounding
    // the corner — the exit is a slide off the edge, never an
    // in-place squish or crop.
    // ORBIT: features sit on the chamfered front FACET of the block
    // head, recessed inside the full silhouette — so a feature that
    // survives to profile lands just behind the nose instead of on
    // the outermost edge. Eyes are DEEP-SET a step further (EYE_R):
    // the surviving profile eye must stop short of the hair's dark
    // side curtain, or a black eye dies against it on every dark-
    // haired look at the cardinal E/W facings.
    const ORBIT = 0.875;
    const EYE_R = 0.78;
    const featX = (u: number, r = ORBIT): number =>
      headX + (fx * Math.sqrt(Math.max(0, 1 - u * u)) + fy * u) * headR * r;
    // Width factor: camera-facing normalized so a head-on face reads
    // exactly 1 (the front look is unchanged) and 0 = rounded the
    // corner. The 0.05 floor kills lingering one-pixel slivers.
    const featK = (u: number): number => {
      const c0 = Math.sqrt(Math.max(0, 1 - u * u));
      return Math.max(
        0,
        Math.min(1, (fy * c0 - fx * u - 0.05) / (c0 - 0.05)),
      );
    };
    // Eye bearing: sin picked so the FRONT separation stays exactly
    // the old 0.42·headR (0.538·EYE_R = 0.42) — every bearing below
    // is pre-divided by its recess the same way to hold every front
    // position where it has always been.
    const EYE_U = 0.538;

    // The scar rides UNDER the eye slit, so the slash reads as
    // crossing it — always on the leading side of the face.
    if (feature === 4 && !rig.hurt) {
      // The scar rides its eye's skull bearing, so it wraps out of
      // view with that cheek instead of squishing in place.
      const sk = featK(lead * EYE_U);
      if (sk > 0.05) {
        ctx.strokeStyle = shade(skin, -42);
        ctx.lineWidth = headR * 0.085;
        const sx = featX(lead * EYE_U, EYE_R);
        ctx.beginPath();
        ctx.moveTo(sx - lead * headR * 0.1 * sk, eyeLineY - headR * 0.42);
        ctx.lineTo(sx + lead * headR * 0.14 * sk, eyeLineY + headR * 0.46);
        ctx.stroke();
        // Two stitch ticks across the slash.
        ctx.lineWidth = headR * 0.045;
        for (const t of [-0.16, 0.2]) {
          const mx = sx + lead * headR * (0.02 + 0.24 * t) * sk;
          const my = eyeLineY + headR * 0.88 * t;
          ctx.beginPath();
          ctx.moveTo(mx - headR * 0.09 * sk, my - headR * 0.03);
          ctx.lineTo(mx + headR * 0.09 * sk, my + headR * 0.03);
          ctx.stroke();
        }
      }
    }

    // Eyes, per chosen pattern: the calm slit, the sharp blade, the
    // wide open pair (with a glint), and the lashed read.
    const eyeW = headR * (eyeStyle === 1 || eyeStyle === 2 ? 0.24 : 0.19);
    const eyeH = headR * (eyeStyle === 1 ? 0.26 : eyeStyle === 2 ? 0.44 : 0.36);
    // Brows carry the character's intent, one bar per eye in the hair
    // color: flat for calm, knived inward for sharp, lifted high for
    // wide, a thin gentle arch for lashed. They ride the same facing
    // slide and far-side narrowing as everything else on the face.
    if (!rig.hurt) {
      ctx.fillStyle = shade(hairCol, -6);
      for (const es of [-1, 1]) {
        const wK = featK(es * EYE_U);
        if (wK <= 0.02) continue;
        const bw = eyeW * 1.3 * wK;
        const bx = featX(es * EYE_U, EYE_R);
        const by =
          eyeLineY - eyeH * (eyeStyle === 2 ? 0.98 : 0.85) - headR * 0.06;
        const innerX = bx - es * (bw / 2);
        const outerX = bx + es * (bw / 2);
        const slant =
          eyeStyle === 1 ? headR * 0.12 : eyeStyle === 3 ? -headR * 0.05 : 0;
        const bt = headR * (eyeStyle === 1 ? 0.1 : 0.07);
        ctx.beginPath();
        ctx.moveTo(innerX, by + slant / 2);
        ctx.lineTo(outerX, by - slant / 2);
        ctx.lineTo(outerX, by - slant / 2 + bt);
        ctx.lineTo(innerX, by + slant / 2 + bt);
        ctx.closePath();
        ctx.fill();
      }
    }
    const asleep = (rig.sleepT ?? 0) > 0.5;
    for (const es of [-1, 1]) {
      const wK = featK(es * EYE_U);
      if (wK <= 0.02) continue;
      const w = eyeW * wK;
      const cx = featX(es * EYE_U, EYE_R);
      ctx.fillStyle = OUTLINE;
      if (asleep) {
        // Closed lids: one soft line resting where the eye's lower
        // third sat, gently bowed — a sleeper, not a squint.
        ctx.fillRect(cx - w / 2, eyeLineY + eyeH * 0.08, w, headR * 0.06);
        continue;
      }
      if (eyeStyle === 1) {
        // Sharp: a hard slanted blade, outer corner riding high.
        const innerX = cx - es * (w / 2);
        const outerX = cx + es * (w / 2);
        ctx.beginPath();
        ctx.moveTo(innerX, eyeLineY + eyeH * 0.12 * faceK);
        ctx.lineTo(outerX, eyeLineY - eyeH * 0.5 * faceK);
        ctx.lineTo(outerX, eyeLineY + eyeH * 0.16 * faceK);
        ctx.lineTo(innerX, eyeLineY + eyeH * 0.5 * faceK);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(cx - w / 2, eyeLineY - eyeH / 2, w, eyeH * faceK);
        if (eyeStyle === 2 && !rig.hurt) {
          // Wide: a bright glint wakes the bigger eye.
          ctx.fillStyle = '#8fa0b5';
          ctx.fillRect(cx - w * 0.1, eyeLineY - eyeH * 0.34, w * 0.3, eyeH * 0.22);
        } else if (eyeStyle === 3 && !rig.hurt) {
          // Lashed: two ticks flicking up off the outer corner.
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = headR * 0.045;
          const ox = cx + es * (w / 2);
          const topY = eyeLineY - eyeH / 2;
          for (const l of [0, 1]) {
            ctx.beginPath();
            ctx.moveTo(ox, topY + eyeH * 0.16 * l);
            ctx.lineTo(ox + es * headR * 0.12 * wK, topY - headR * 0.07 + eyeH * 0.2 * l);
            ctx.stroke();
          }
        }
      }
    }
    // Profile nose: a small skin wedge off the leading edge — the one
    // mark that makes a side view a side view.
    if (profileK > 0.55) {
      const nk = Math.min(1, (profileK - 0.55) / 0.3);
      const nx = headX + lead * hw * 0.98;
      ctx.fillStyle = rig.hurt ? '#ffffff' : shade(skin, -14);
      ctx.beginPath();
      ctx.moveTo(nx, eyeLineY + headR * 0.06);
      ctx.lineTo(nx + lead * headR * 0.16 * nk, eyeLineY + headR * 0.17);
      ctx.lineTo(nx, eyeLineY + headR * 0.28);
      ctx.closePath();
      ctx.fill();
    }
    // Rosy cheeks under the eyes, riding the same face bands —
    // warpaint replaces the blush entirely.
    if (!rig.hurt && feature !== 3) {
      ctx.fillStyle = 'rgba(214, 118, 96, 0.45)';
      for (const es of [-1, 1]) {
        const wK = featK(es * EYE_U);
        if (wK <= 0.02) continue;
        ctx.fillRect(
          featX(es * EYE_U, EYE_R) - headR * 0.14 * wK,
          eyeLineY + headR * 0.24,
          headR * 0.28 * wK,
          headR * 0.16,
        );
      }
    }
    if (feature === 3 && !rig.hurt) {
      // Warpaint: a three-finger claw rake down each cheek — stripes
      // shorten and drift as they descend, the way dragged fingers
      // actually land, each with a dried-blood edge beneath it.
      for (const es of [-1, 1]) {
        const wK = featK(es * EYE_U);
        if (wK <= 0.05) continue;
        for (const row of [0, 1, 2]) {
          const y0 = eyeLineY + headR * (0.18 + row * 0.15);
          const bw = headR * (0.4 - row * 0.06) * wK;
          const x0 = featX(es * EYE_U, EYE_R) - bw / 2 + es * headR * 0.03 * row;
          ctx.fillStyle = 'rgba(120, 24, 20, 0.55)';
          ctx.beginPath();
          ctx.moveTo(x0, y0 + headR * 0.075);
          ctx.lineTo(x0 + bw, y0 - headR * 0.005);
          ctx.lineTo(x0 + bw, y0 + headR * 0.075);
          ctx.lineTo(x0, y0 + headR * 0.155);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(186, 46, 38, 0.9)';
          ctx.beginPath();
          ctx.moveTo(x0, y0 + headR * 0.05);
          ctx.lineTo(x0 + bw, y0 - headR * 0.03);
          ctx.lineTo(x0 + bw, y0 + headR * 0.05);
          ctx.lineTo(x0, y0 + headR * 0.13);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (feature === 5 && !rig.hurt) {
      // Freckles: a scatter across the nose bridge and cheeks.
      ctx.fillStyle = shade(skin, -22);
      const spots: readonly (readonly [number, number])[] = [
        [-0.34, 0.24],
        [-0.18, 0.32],
        [-0.02, 0.26],
        [0.14, 0.33],
        [0.3, 0.25],
        [0.05, 0.4],
      ];
      // Each spot projects at its own bearing — the scatter bunches
      // toward the leading edge and wraps off spot by spot.
      for (const [ox, oy] of spots) {
        const u = ox * 1.2;
        if (featK(u) <= 0.15) continue;
        ctx.fillRect(
          featX(u),
          eyeLineY + oy * headR,
          headR * 0.055,
          headR * 0.055,
        );
      }
    }
    // Facial hair: a BAND around the jaw on the shared skull ring
    // (beard.ts), painted over the cheek marks it would really cover
    // and under the teeth that grow in front of it.
    drawBeard(ctx, hairFrame, rig.look?.beard ?? 0, cover);
    // Tusks and fangs rise off the underbite — teeth in front of skin.
    if (feature === 1 || feature === 2) {
      const big = feature === 1;
      const ivory = rig.hurt ? '#ffffff' : '#eae1c8';
      // The underbite: a dark mouth line the teeth rise out of, so
      // they grow from a jaw instead of floating on the chin.
      if (!rig.hurt) {
        const mw = headR * (big ? 0.42 : 0.3) * (1 - 0.25 * profileK);
        ctx.fillStyle = shade(skin, -30);
        ctx.beginPath();
        chamferRect(
          ctx,
          pairX - mw,
          headY + hh * (big ? 0.76 : 0.68),
          mw * 2,
          headR * 0.07,
          headR * 0.03,
        );
        ctx.fill();
      }
      for (const es of [-1, 1]) {
        const tu = es * (big ? 0.343 : 0.251);
        const wK = featK(tu);
        if (wK <= 0.05) continue;
        const bx = featX(tu);
        const baseY = headY + hh * (big ? 0.82 : 0.72);
        const len = headR * (big ? 0.52 : 0.28);
        const w = headR * (big ? 0.15 : 0.1) * wK;
        const tipX = bx + es * headR * (big ? 0.1 : 0.04);
        ctx.fillStyle = ivory;
        ctx.beginPath();
        ctx.moveTo(bx - w, baseY);
        ctx.lineTo(bx + w, baseY);
        ctx.lineTo(tipX, baseY - len);
        ctx.closePath();
        ctx.fill();
        if (!rig.hurt) {
          // Inner-edge shade curves the tooth; a glint caps the tip.
          ctx.strokeStyle = shade(ivory, -24);
          ctx.lineWidth = headR * (big ? 0.035 : 0.025);
          ctx.beginPath();
          ctx.moveTo(bx - es * w * 0.6, baseY);
          ctx.lineTo(tipX - es * headR * 0.03, baseY - len * 0.8);
          ctx.stroke();
          if (big) {
            ctx.fillStyle = '#f8f3e4';
            ctx.fillRect(
              tipX - headR * 0.035,
              baseY - len + headR * 0.02,
              headR * 0.07,
              headR * 0.07,
            );
          }
        }
      }
    }
  }
  } // end of the flesh head/hair/face branch (skeletal drew the skull)

  // Head gear: styled kinds (dome, greathelm, hood, circlet, horned) —
  // the classic dome is the fallback, so every helm is already dressed.
  if (helmSt) {
    drawHelmet(ctx, helmSt, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      headR,
      fx,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
    });
  }
  ctx.restore();

  // A back-facing quiver reads over the torso, like a cape's front side.
  if (quiverFront) paintQuiver();
  // Stowed gear on the near side of the body paints over the torso —
  // the back sling when facing away, the belt pieces face-on, and the
  // off scabbard's leading hip at profile — but UNDER the arms, so a
  // hand hanging beside the hip reads in front of its own scabbard.
  if (stowed && wornBack && slingFront && !rig.hasCape) paintStowedMain();
  if (stowed && !wornBack && !beltBehind) paintStowedMain();
  if (stowed && offWorn && beltBehind) paintStowedOff();

  // ---- weapon + striking arm in front of the torso (the bold read) —
  // unless the dual-wield profile flip already painted them behind it,
  // in which case the NEAR (off) arm is the foremost thing instead.
  // Facing the camera the off arm joins the front layer too — under
  // the main pair, so the weapon stays the boldest thing on screen.
  if (offFront && !headOverArms) paintOffArm();
  if (!weaponBehind && !mainBehind && !headOverArms) {
    paintWeapon();
    paintMainArm();
  }
  if (mainBehind) paintOffArm();
  // Visible shoulder caps paint over everything on their layer — the
  // near cap over its arm's root, and from behind, both caps over the
  // backplate where the camera can actually see them.
  paintPauldrons('front');
}

/**
 * Back-mounted gear layered relative to the CAPE — called by the
 * renderer immediately after the cape paints, so a quiver straps OVER
 * the cloth (gear goes over a cape, never under it). Recomputes the
 * few shoulder measurements it needs; drawHumanoid skips its internal
 * quiver whenever hasCape is set.
 */
export function drawBackGear(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const st = rig.offhandItem ? offhandStyle(rig.offhandItem) : null;
  const worn = itemDef(rig.weaponItem ?? '');
  // ONE CLASS, ONE DETECTION — the cape-layer stow reads the same
  // wieldClass the main solve does; the two stow sites can't drift.
  const stowedKind = worn !== undefined ? wieldClass(worn.id) : 'none';
  const stowedGreat = stowedKind === 'great';
  const stowedBow = stowedKind === 'bow';
  const stowedStaff = stowedKind === 'staff';
  const sling = (rig.sheathT ?? 0) >= STOW_HANDOFF && (stowedBow || stowedStaff || stowedGreat);
  if (st?.kind !== 'quiver' && !sling) return;
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const fx = Math.cos(rig.dir);
  const crouch =
    rig.pose === PoseState.Sneak
      ? Math.min(1, rig.poseT)
      : rig.pose === PoseState.Milk
        ? 0.55 * Math.min(1, rig.poseT)
        : 0;
  const hipY = rig.y - (rig.rise + rig.bob * 0.45) * s + 0.11 * s * crouch;
  const wS = rig.wScale;
  const hScale = 1 + (1 - wS) * 0.55;
  const th = TORSO_RISE_S * s * (1 - 0.12 * crouch);
  const shoulderY = hipY - th * hScale + SHOULDER_Y_DROP_S * s;
  const lead = fx >= 0 ? 1 : -1;
  if (st?.kind === 'quiver') {
    drawQuiver(ctx, st, rig.x - fx * 0.14 * s, shoulderY - 0.02 * s, s, lead, rig.hurt, rig.nowMs);
  }
  // A stowed bow/staff straps over the cape exactly like the quiver.
  if (sling && worn) {
    const side = rig.depthMemory?.side ?? (Math.sign(fx) || 1);
    const spot = stowBack(stowedBow ? 'bow' : stowedGreat ? 'great' : 'staff', side);
    drawHeldItem(
      ctx,
      worn.id,
      worn.color,
      rig.x - fx * 0.14 * s + spot.dx * s * wS,
      shoulderY + spot.dy * s,
      spot.angle,
      s,
      rig,
      { ench: rig.weaponEnch, carry: stowedBow ? 1 : 0, grip: 0.5 },
    );
  }
}

/** Darken/lighten a hex color by a flat amount — flat-art shading. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Part library: how each holdable draws in the hand. */
/**
 * Enchant fx channels per weapon family. Tier 1 is a colored glint;
 * tiers 2-3 ride the element's full mote channel. Staffs speak their
 * own fx dialect, so each element maps twice.
 */
const ENCH_BLADE_FX: Record<string, BladeFx> = {
  ember: 'ember',
  frost: 'frost',
  storm: 'storm',
  blood: 'blood',
  void: 'void',
  radiant: 'sun',
  arcane: 'star',
  // NINE SCHOOLS on the weapon channel too: astral drifts a small
  // constellation (never arcane's hard twinkle), and verdant grows a
  // living tendril instead of borrowing the tier-1 gleam.
  astral: 'drift',
  verdant: 'tendril',
};
const ENCH_STAFF_FX: Record<string, StaffFx> = {
  ember: 'embers',
  frost: 'frost',
  storm: 'sparks',
  blood: 'drip',
  void: 'motes',
  radiant: 'rays',
  arcane: 'runes',
  astral: 'stars',
  verdant: 'leaves',
};

/**
 * Overlay a worn working onto a resolved armor style. Null in, null
 * out, and unenchanted pieces return the SAME object they came in as —
 * this runs per piece per body per frame, so the common case must not
 * allocate.
 *
 * `runes` and `glowTrim` are recolored where a garment already owns
 * them: a robe authored with rune work keeps every shape its artist
 * drew and simply answers the bonded school instead of its own.
 */
function withArx<T extends { arx?: ArxMark; runes?: string; glowTrim?: string }>(
  itemId: string | undefined,
  st: T | null,
  slot: SlotLight | undefined,
): T | null {
  if (!st || !slot || !itemId) return st;
  // Cached on (item, school, tier). Keyed by ITEM ID rather than by the
  // style object, because the style resolvers return a registry object
  // for authored gear but build a fresh derived one every call for
  // anything unstyled — an identity cache would miss those every frame
  // forever. The id is stable for both, so this is one Map hit in the
  // steady state instead of five style clones per body per frame.
  const key = `${itemId}|${slot.element}|${slot.tier}`;
  const hit = ARX_STYLE_CACHE.get(key) as T | undefined;
  if (hit) return hit;
  const mark = arxMark(slot)!;
  const out: T = { ...st, arx: mark };
  // A garment that authored its own rune work keeps every shape its
  // artist drew and simply answers the bonded school in hue.
  if (st.runes) out.runes = mark.mid;
  if (st.glowTrim) out.glowTrim = mark.core;
  if (ARX_STYLE_CACHE.size >= ARX_STYLE_CACHE_MAX) ARX_STYLE_CACHE.clear();
  ARX_STYLE_CACHE.set(key, out);
  return out;
}

/**
 * Bounded because the key space is (worn item x school x tier) and a
 * session only ever sees the gear that walks past it. Cleared wholesale
 * rather than evicted one by one: this is a render cache, and rebuilding
 * it costs one clone per visible piece on a single frame.
 */
const ARX_STYLE_CACHE = new Map<string, object>();
const ARX_STYLE_CACHE_MAX = 512;

/**
 * Overlay an enchant's fx channel on a resolved weapon style — the
 * style object is data, so a shallow clone re-aims the existing mote
 * painters at the enchant's element without touching the silhouette.
 */
export function enchantedStyle<T extends { fx?: unknown; fxColor?: string; aura?: string }>(
  st: T,
  ench: string | undefined,
  family: 'blade' | 'staff',
): T {
  const def = ench ? enchantDef(ench) : undefined;
  if (!def) return st;
  const color = ELEMENT_COLORS[def.element];
  if (def.tier <= 1) {
    // A whisper of Arx: the traveling glint (staffs: drifting motes).
    return { ...st, fx: family === 'staff' ? 'motes' : 'gleam', fxColor: color };
  }
  const out: T = {
    ...st,
    fx:
      family === 'staff'
        ? (ENCH_STAFF_FX[def.element] ?? 'motes')
        : (ENCH_BLADE_FX[def.element] ?? 'gleam'),
    fxColor: color,
  };
  // THE AURA BLADE: a tier-5 working stands a second edge a hand's
  // width off the steel (drawBladeFx paints it under the fx channel).
  if (family === 'blade' && def.tier >= 5) out.aura = color;
  return out;
}

function drawHeldItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  color: string,
  hx: number,
  hy: number,
  angle: number,
  s: number,
  rig: RigPose,
  /**
   * Bow: string pull-back (px), release progress, and rest-carry blend
   * (0 aiming → 1 settled: slides the grip wrap into the fist so the
   * bow is carried by the wood, not the string). Staff: grip height.
   * ench: enchant id riding this instance — overlays its fx channel.
   * flip: mirror across the long axis — a reversed fist turns the
   * edge (and any guard/blade asymmetry) the other way.
   */
  extra?: {
    pull?: number;
    loose?: number;
    grip?: number;
    carry?: number;
    ench?: string;
    flip?: boolean;
    /**
     * THE PROJECTION LAW's length: 1 in the screen plane, shrinking as
     * the carry points into (or out of) the scene. Rod classes
     * compress along their long axis (local x); the bow — whose length
     * runs local ±y — compresses across it. The foreshortening is what
     * tells the eye the item lives in the world's depth.
     */
    fore?: number;
  },
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  if (extra?.flip) ctx.scale(1, -1);
  // ONE CLASS, ONE DETECTION (arms-v3 Phase 2): the painter's branch
  // SELECTION reads wieldClass — the same single detection the solve
  // and the stows use — while each branch still resolves its colored
  // style for the art. Tools and rods stay their own interleaved
  // probes: they are paintability questions (toolStyle), not carry
  // classes, and wieldClass pins them 'none' by test.
  const kind = wieldClass(itemId);
  const fore = extra?.fore ?? 1;
  if (fore !== 1) {
    if (kind === 'bow') ctx.scale(1, fore);
    else ctx.scale(fore, 1);
  }
  // Mid-arc wood point: the bow's belly passes through x = BOW_GRIP_X·s
  // at grip height BY CONSTRUCTION (weapons.ts owns the constant and
  // the quadratic that guarantees it) — align THAT to the fist, or the
  // bow reads as resting on the wrist.
  if (extra?.carry) ctx.translate(-BOW_GRIP_X * s * extra.carry, 0);

  // The item-space envelope each roster's art can reach — the outline
  // scratch is sized from this, so keep it tight per class (a bow is
  // tall, a blade is long, and paying the widest box for every belt
  // knife would bill the whole town).
  let env: readonly [number, number, number];
  let paint: (c: CanvasRenderingContext2D) => void;
  if (kind === 'great') {
    // (Check-great-first lives inside wieldClass now.) The grip
    // slides with the carry exactly like the staff's — high on the
    // shouldered rest, mid-haft through the cuts.
    env = [-1.3, 1.3, 0.45];
    paint = (c) => drawGreatweapon(c, greatStyle(itemId, color)!, s, rig.nowMs, rig.hurt, extra?.grip ?? 0.2);
  } else if (kind === 'blade') {
    // The blade + rogue rosters: every sword AND dagger resolves a
    // style — bespoke silhouette, guard, pommel, living fx channel.
    // Unknown '*sword'/'*dagger' ids get color-derived fallbacks.
    env = [-0.5, 1.2, 0.32];
    paint = (c) => drawSword(c, enchantedStyle(bladeStyle(itemId, color)!, extra?.ench, 'blade'), s, rig.nowMs, rig.hurt);
  } else if (toolStyle(itemId, color) && !itemId.includes('rod')) {
    // The gatherer's roster: every axe and pickaxe resolves a style —
    // bespoke head, haft furniture, collar lashing, starsteel fx.
    // BIT-LEADS LAW: the head is authored with the bit on −y; a chop
    // facing right sweeps clockwise, so mirror the head across the
    // haft there — the honed edge (not the poll) buries in the work
    // at the bite, whichever way the body faces.
    env = [-0.7, 1.0, 0.35];
    paint = (c) => {
      c.save();
      if (Math.cos(rig.dir) > 0) c.scale(1, -1);
      drawTool(c, toolStyle(itemId, color)!, s, rig.nowMs, rig.hurt);
      c.restore();
    };
  } else if (kind === 'bow') {
    // The archer's roster: every bow resolves a style — limb kind,
    // wood, tip furniture, charms, and the living fx channel. The
    // painter keeps the classic behaviors: limbs flex with the pull,
    // the string hauls to the nock, release buzzes it straight.
    env = [-0.5, 0.7, 0.85];
    paint = (c) => drawBow(c, enchantedStyle(bowStyle(itemId, color)!, extra?.ench, 'blade'), s, rig.nowMs, rig.hurt, extra?.pull ?? 0, extra?.loose);
  } else if (kind === 'staff') {
    // The archmage's roster: every staff resolves a style — shaft
    // grammar, signature crown, element focus, living fx. The grip
    // slides with the carriage — high on a planted walking stick,
    // mid-shaft when the business end levels at something — and the
    // focus flares while a cast leaves.
    const castT = rig.pose === PoseState.Cast ? rig.poseT : 0;
    env = [-1.1, 1.5, 0.35];
    paint = (c) => drawStaff(c, enchantedStyle(staffStyle(itemId, color)!, extra?.ench, 'staff'), s, rig.nowMs, rig.hurt, extra?.grip ?? 0.34, castT);
  } else if (itemId.includes('rod')) {
    env = [-0.7, 1.0, 0.35];
    paint = (c) => drawTool(c, toolStyle(itemId, color)!, s, rig.nowMs, rig.hurt);
  } else {
    env = [-0.1, 0.35, 0.18];
    paint = (c) => {
      c.fillStyle = color;
      c.beginPath();
      c.roundRect(0.04 * s, -0.05 * s, 0.16 * s, 0.1 * s, 0.03 * s);
      c.fill();
    };
  }
  paintHeldOutlined(ctx, s, env, paint);
  ctx.restore();
}

// ---- THE WEAPON WEARS ITS OWN OUTLINE (the shield law bd69422,
// extended to everything a hand holds): the renderer's dilate rings
// the composed BODY silhouette, so a weapon crossing the torso met the
// shirt with no line at all and the two masses read as one blob. In
// this game every separate object is ringed — so the held item strikes
// its own ring, in the world's outline colour at the dilate's own
// weight, from its own alpha: paint the art into scratch A under the
// live transform, stamp eight tinted taps of it (scratch B) UNDER the
// art, then the art itself. Device-pixel identity blits — the
// bakeOutlineRing recipe, scratches module-scoped and grow-only.
//
// THE RING NEVER DOUBLES: the renderer's body dilate rings whatever
// alpha the rig leaves in its scratch — if this ring extended the
// weapon's silhouette, the exposed edges would wear this ring PLUS the
// body's ring around it (a 2r band against the body's r). So the ring
// is stamped `source-atop`: it exists ONLY over pixels the rig has
// already painted (the body the weapon crosses), and the exposed
// silhouette stays bare for the body pass to ring exactly once.
let heldOlA: HTMLCanvasElement | null = null;
let heldOlACtx: CanvasRenderingContext2D | null = null;
let heldOlB: HTMLCanvasElement | null = null;
let heldOlBCtx: CanvasRenderingContext2D | null = null;
const HELD_OL_TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Paint a held item with its own outline ring. `env` is the item-space
 * envelope [x0, x1, ±y] in units of s. Contexts without full canvas
 * support (test stubs) fall back to ringless direct paint.
 */
function paintHeldOutlined(
  ctx: CanvasRenderingContext2D,
  s: number,
  env: readonly [number, number, number],
  paint: (c: CanvasRenderingContext2D) => void,
): void {
  if (!heldOlA && typeof document !== 'undefined' && typeof ctx.getTransform === 'function') {
    heldOlA = document.createElement('canvas');
    heldOlB = document.createElement('canvas');
    heldOlACtx = heldOlA.getContext('2d');
    heldOlBCtx = heldOlB.getContext('2d');
  }
  const a = heldOlACtx;
  const b = heldOlBCtx;
  if (!a || !b || typeof ctx.getTransform !== 'function') {
    paint(ctx);
    return;
  }
  const m = ctx.getTransform();
  const x0 = env[0] * s;
  const x1 = env[1] * s;
  const ey = env[2] * s;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of [[x0, -ey], [x1, -ey], [x0, ey], [x1, ey]] as const) {
    const dx = m.a * px + m.c * py + m.e;
    const dy = m.b * px + m.d * py + m.f;
    if (dx < minX) minX = dx;
    if (dx > maxX) maxX = dx;
    if (dy < minY) minY = dy;
    if (dy > maxY) maxY = dy;
  }
  // Ring weight = the renderer's dilate in device pixels: the matrix
  // norm carries dpr (and any bake scale) into the item's px scale.
  const norm = Math.hypot(m.a, m.b) || 1;
  const ring = Math.max(1.25, s * norm * 0.04);
  const ri = Math.max(1, Math.round(ring));
  const rd = Math.max(1, Math.round(ring * 0.71));
  const pad = ri + 3;
  const ox = Math.floor(minX) - pad;
  const oy = Math.floor(minY) - pad;
  const w = Math.ceil(maxX) + pad - ox;
  const h = Math.ceil(maxY) + pad - oy;
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) {
    paint(ctx);
    return;
  }
  if (heldOlA!.width < w) heldOlA!.width = w;
  if (heldOlA!.height < h) heldOlA!.height = h;
  if (heldOlB!.width < w) heldOlB!.width = w;
  if (heldOlB!.height < h) heldOlB!.height = h;
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.clearRect(0, 0, w, h);
  a.setTransform(m.a, m.b, m.c, m.d, m.e - ox, m.f - oy);
  paint(a);
  a.setTransform(1, 0, 0, 1, 0, 0);
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = 'source-over';
  b.clearRect(0, 0, w, h);
  for (const [tx, ty] of HELD_OL_TAPS) {
    const diag = tx !== 0 && ty !== 0;
    b.drawImage(heldOlA!, 0, 0, w, h, tx * (diag ? rd : ri), ty * (diag ? rd : ri), w, h);
  }
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = '#241a2e';
  b.fillRect(0, 0, w, h);
  b.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.drawImage(heldOlB!, 0, 0, w, h, ox, oy, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(heldOlA!, 0, 0, w, h, ox, oy, w, h);
  ctx.restore();
}

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
  foot: 'hoof' | 'paw' | 'claw' | 'bearpaw';
  /** Bare shanks (chicken) instead of body-shaded legs. */
  legColor?: string;
  /**
   * Unequal limb bones: the UPPER bone's fraction of the total leg
   * length, [front, hind]. A cat carries a long thigh over a short
   * hock; absent = the equal-bone solve every other species runs.
   */
  segSplit?: [number, number];
}

/** Diagonal trot pairs: FL+BR swing together, FR+BL together. */
function quadLegs(fwd: number, side: number): LegRigConfig['legs'] {
  return [
    { fwd, side: -side, group: 0 },
    { fwd, side, group: 1 },
    { fwd: -fwd, side: -side, group: 1 },
    { fwd: -fwd, side, group: 0 },
  ];
}

const BEAST_SPECS: Record<string, BeastSpec> = {
  cow: {
    rig: {
      legs: quadLegs(0.3, 0.16),
      legLen: 0.33,
      rise: 0.29,
      liftAmp: 0.055,
      runSpeed: 1.8,
      turnRate: 4.5,
    },
    bodyLen: 0.48,
    bodyRise: 0.36,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.5,
    legW: 0.095,
    foot: 'hoof',
    legColor: '#d9ccb8',
  },
  bull: {
    rig: {
      legs: quadLegs(0.32, 0.17),
      legLen: 0.35,
      rise: 0.31,
      liftAmp: 0.055,
      runSpeed: 2.4,
      turnRate: 4,
    },
    bodyLen: 0.52,
    bodyRise: 0.38,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.5,
    legW: 0.105,
    foot: 'hoof',
    legColor: '#584a3d',
  },
  wolf: {
    rig: {
      legs: quadLegs(0.28, 0.12),
      legLen: 0.38,
      rise: 0.325,
      liftAmp: 0.1,
      runSpeed: 4.6,
      turnRate: 8,
    },
    bodyLen: 0.4,
    bodyRise: 0.4,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.075,
    foot: 'paw',
    legColor: '#5d6270',
  },
  // The matriarch: longer-limbed and heavier than any wolf — she
  // covers ground in strides the pack can't match.
  dire_wolf: {
    rig: {
      legs: quadLegs(0.34, 0.15),
      legLen: 0.47,
      rise: 0.4,
      liftAmp: 0.11,
      runSpeed: 4.8,
      turnRate: 7,
    },
    bodyLen: 0.52,
    bodyRise: 0.49,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.1,
    foot: 'paw',
    legColor: '#3e3a48',
  },
  // The war-hound: front legs longer than the rear carriage suggests —
  // the hyena slope on the move, fast and wrong-looking.
  worg: {
    rig: {
      legs: quadLegs(0.3, 0.14),
      legLen: 0.4,
      rise: 0.33,
      liftAmp: 0.09,
      runSpeed: 5.0,
      turnRate: 9,
    },
    bodyLen: 0.46,
    bodyRise: 0.38,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.085,
    foot: 'paw',
    legColor: '#4e4436',
  },
  // The tufted shadow: a short body slung between legs LONGER than a
  // wolf's — the stilted, light-footed carriage that reads "cat" the
  // moment it moves. High-stepping lift, the quickest turn in the wood.
  lynx: {
    rig: {
      legs: quadLegs(0.26, 0.11),
      legLen: 0.4,
      rise: 0.34,
      liftAmp: 0.11,
      runSpeed: 4.7,
      turnRate: 9,
    },
    bodyLen: 0.36,
    bodyRise: 0.42,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.085,
    foot: 'paw',
    // The cat's bones: a long thigh over a short hock behind, a
    // slightly long upper arm in front — the crouch-and-spring frame.
    segSplit: [0.53, 0.58],
  },
  // The year's litter: cub proportions are their own design — a short
  // body still catching up to its oversized paws and ears, never a
  // scaled-down adult.
  lynx_young: {
    rig: {
      legs: quadLegs(0.22, 0.1),
      legLen: 0.33,
      rise: 0.28,
      liftAmp: 0.11,
      runSpeed: 4.6,
      turnRate: 10,
    },
    bodyLen: 0.29,
    bodyRise: 0.35,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.07,
    foot: 'paw',
    segSplit: [0.53, 0.58],
  },
  // The duskruff: never a scaled lynx — a long low stalker whose mass
  // hangs between heavy shoulders and heavier haunches, on legs that
  // clear deadfall the pack goes around.
  lynx_champion: {
    rig: {
      legs: quadLegs(0.32, 0.14),
      legLen: 0.5,
      rise: 0.42,
      liftAmp: 0.12,
      runSpeed: 4.9,
      turnRate: 8,
    },
    bodyLen: 0.48,
    bodyRise: 0.52,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.105,
    foot: 'paw',
    legColor: '#3a3746',
    segSplit: [0.53, 0.58],
  },
  rat: {
    rig: {
      legs: quadLegs(0.19, 0.13),
      legLen: 0.17,
      rise: 0.13,
      liftAmp: 0.05,
      runSpeed: 3.2,
      turnRate: 10,
    },
    bodyLen: 0.34,
    bodyRise: 0.19,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.048,
    foot: 'paw',
    legColor: '#786a5b',
  },
  chicken: {
    rig: {
      legs: [
        { fwd: -0.02, side: -0.075, group: 0 },
        { fwd: -0.02, side: 0.075, group: 1 },
      ],
      legLen: 0.2,
      rise: 0.17,
      liftAmp: 0.07,
      runSpeed: 2,
      turnRate: 9,
    },
    bodyLen: 0.28,
    bodyRise: 0.28,
    kneeFwd: [-1, -1], // bird ankles bow backward
    hipFwd: 0.9,
    hipSide: 0.9,
    legW: 0.035,
    foot: 'claw',
    legColor: '#e8a33d',
  },
  // The great owl: a two-post strider — bird ankles bow backward like
  // the chicken's, but the mass they carry is a keg the henyard never
  // dreamed of. Modest on foot; the kill lives in the pounce lunge.
  great_owl: {
    rig: {
      legs: [
        { fwd: -0.02, side: -0.11, group: 0 },
        { fwd: -0.02, side: 0.11, group: 1 },
      ],
      legLen: 0.34,
      rise: 0.28,
      liftAmp: 0.085,
      runSpeed: 4.4,
      turnRate: 8,
    },
    bodyLen: 0.3,
    bodyRise: 0.5,
    kneeFwd: [-1, -1], // bird ankles bow backward
    hipFwd: 0.9,
    hipSide: 0.85,
    legW: 0.062,
    foot: 'claw',
    legColor: '#c7b697',
  },
  // The elder: longer-shanked and half again the hunter's keg — the
  // high seat of the parliament walks like it owns the glade.
  elder_great_owl: {
    rig: {
      legs: [
        { fwd: -0.02, side: -0.13, group: 0 },
        { fwd: -0.02, side: 0.13, group: 1 },
      ],
      legLen: 0.42,
      rise: 0.35,
      liftAmp: 0.09,
      runSpeed: 4.6,
      turnRate: 7,
    },
    bodyLen: 0.38,
    bodyRise: 0.64,
    kneeFwd: [-1, -1],
    hipFwd: 0.9,
    hipSide: 0.85,
    legW: 0.078,
    foot: 'claw',
    legColor: '#a8adbd',
  },
  boar: {
    rig: {
      legs: quadLegs(0.24, 0.13),
      legLen: 0.24,
      rise: 0.21,
      liftAmp: 0.06,
      runSpeed: 3.8,
      turnRate: 7,
    },
    bodyLen: 0.38,
    bodyRise: 0.27,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.07,
    foot: 'hoof',
    legColor: '#463527',
  },
  bear: {
    rig: {
      legs: quadLegs(0.3, 0.17),
      legLen: 0.34,
      rise: 0.29,
      liftAmp: 0.07,
      runSpeed: 4.0,
      turnRate: 5.5,
    },
    bodyLen: 0.52,
    bodyRise: 0.38,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.5,
    legW: 0.13,
    foot: 'bearpaw',
    legColor: '#302620',
  },
  ram: {
    rig: {
      legs: quadLegs(0.23, 0.13),
      legLen: 0.29,
      rise: 0.25,
      liftAmp: 0.06,
      runSpeed: 3.4,
      turnRate: 7,
    },
    bodyLen: 0.36,
    bodyRise: 0.3,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.058,
    foot: 'hoof',
    legColor: '#6b5a48',
  },
  // The ewe: shorter-legged and rounder than her crag cousin — a
  // placid amble, never a charger's stance. Dark slim legs vanish
  // under the fleece cloud.
  sheep: {
    rig: {
      legs: quadLegs(0.2, 0.12),
      legLen: 0.26,
      rise: 0.22,
      liftAmp: 0.05,
      runSpeed: 3.0,
      turnRate: 6,
    },
    bodyLen: 0.34,
    bodyRise: 0.27,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.05,
    foot: 'hoof',
    legColor: '#4f4234',
  },
  stag: {
    rig: {
      legs: quadLegs(0.26, 0.13),
      legLen: 0.42,
      rise: 0.37,
      liftAmp: 0.09,
      runSpeed: 4.4,
      turnRate: 7,
    },
    bodyLen: 0.38,
    bodyRise: 0.44,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.052,
    foot: 'hoof',
    legColor: '#8a6f4d',
  },
  // The stag's build a hand smaller — same gait, same high daylight
  // under the belly, so the herd reads as one species at a glance.
  hind: {
    rig: {
      legs: quadLegs(0.24, 0.12),
      legLen: 0.4,
      rise: 0.35,
      liftAmp: 0.085,
      runSpeed: 4.4,
      turnRate: 7,
    },
    bodyLen: 0.34,
    bodyRise: 0.42,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.048,
    foot: 'hoof',
    legColor: '#93764f',
  },
  // Six legs, alternating tripods: each group keeps a stable triangle
  // planted (front+rear one side, middle the other) — the insect gait.
  mudcrab: {
    rig: {
      legs: [
        { fwd: 0.13, side: -0.19, group: 0 },
        { fwd: 0.13, side: 0.19, group: 1 },
        { fwd: 0, side: -0.22, group: 1 },
        { fwd: 0, side: 0.22, group: 0 },
        { fwd: -0.13, side: -0.19, group: 0 },
        { fwd: -0.13, side: 0.19, group: 1 },
      ],
      legLen: 0.15,
      rise: 0.09,
      liftAmp: 0.04,
      runSpeed: 2.2,
      turnRate: 12,
    },
    bodyLen: 0.24,
    bodyRise: 0.13,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.62,
    legW: 0.032,
    foot: 'claw',
    legColor: '#8a4f38',
  },
  giant_beetle: {
    rig: {
      legs: [
        { fwd: 0.16, side: -0.15, group: 0 },
        { fwd: 0.16, side: 0.15, group: 1 },
        { fwd: 0, side: -0.17, group: 1 },
        { fwd: 0, side: 0.17, group: 0 },
        { fwd: -0.16, side: -0.15, group: 0 },
        { fwd: -0.16, side: 0.15, group: 1 },
      ],
      legLen: 0.15,
      rise: 0.11,
      liftAmp: 0.045,
      runSpeed: 2.8,
      turnRate: 8,
    },
    bodyLen: 0.32,
    bodyRise: 0.17,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.6,
    legW: 0.03,
    foot: 'claw',
    legColor: '#252c3d',
  },
  // Eight legs in two alternating tetrapods — diagonal pairs of pairs,
  // so four feet always hold the ground while four reach.
  giant_spider: {
    rig: {
      legs: [
        { fwd: 0.22, side: -0.15, group: 0 },
        { fwd: 0.22, side: 0.15, group: 1 },
        { fwd: 0.08, side: -0.17, group: 1 },
        { fwd: 0.08, side: 0.17, group: 0 },
        { fwd: -0.06, side: -0.17, group: 0 },
        { fwd: -0.06, side: 0.17, group: 1 },
        { fwd: -0.2, side: -0.15, group: 1 },
        { fwd: -0.2, side: 0.15, group: 0 },
      ],
      legLen: 0.36,
      rise: 0.17,
      liftAmp: 0.07,
      runSpeed: 4.2,
      turnRate: 9,
    },
    bodyLen: 0.34,
    bodyRise: 0.22,
    kneeFwd: [1, 1, 1, 1, -1, -1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.034,
    foot: 'paw',
    legColor: '#2e2838',
  },
  // Legless bodies: the specs exist for the corpse ragdolls (spine
  // points only) and sprite bounds — the LIVE bodies never build a
  // LegRig; they draw through their own dedicated painters.
  adder: {
    rig: { legs: [], legLen: 0.1, rise: 0.06, liftAmp: 0, runSpeed: 3.6, turnRate: 9 },
    bodyLen: 0.62,
    bodyRise: 0.08,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.03,
    foot: 'paw',
  },
  cave_bat: {
    rig: { legs: [], legLen: 0.08, rise: 0.05, liftAmp: 0, runSpeed: 4.8, turnRate: 11 },
    bodyLen: 0.24,
    bodyRise: 0.9,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.025,
    foot: 'paw',
  },
  slime: {
    rig: { legs: [], legLen: 0.06, rise: 0.04, liftAmp: 0, runSpeed: 2.6, turnRate: 9 },
    bodyLen: 0.34,
    bodyRise: 0.26,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.03,
    foot: 'paw',
  },
  slime_small: {
    rig: { legs: [], legLen: 0.05, rise: 0.03, liftAmp: 0, runSpeed: 3.0, turnRate: 9 },
    bodyLen: 0.2,
    bodyRise: 0.16,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.03,
    foot: 'paw',
  },
};

/**
 * Spec for a beast id — named species get their tuned rig; anything
 * new walks on a generic quadruped scaled from its collision radius,
 * so future creatures have working legs before they have a look.
 */
export function beastSpec(defId: string, radius: number, speed: number): BeastSpec {
  const known = BEAST_SPECS[defId];
  if (known) return known;
  return {
    rig: {
      legs: quadLegs(radius * 0.8, radius * 0.42),
      legLen: radius * 1.1,
      rise: radius * 0.92,
      liftAmp: radius * 0.26,
      runSpeed: Math.max(1, speed),
      turnRate: 7,
    },
    bodyLen: radius * 1.3,
    bodyRise: radius * 1.15,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: radius * 0.2,
    foot: 'paw',
  };
}

/**
 * Cattle are drawn as true 2.5D blocks — the same dialect as the wall
 * prisms: a chamfered footprint extruded straight up, lit back slab
 * over hard-shaded flanks. Everything species-flavored (hide, patches,
 * horns, muzzle, udder) lives in this look table so the dairy cow and
 * the bull share one painter.
 */
export interface CattleLook {
  hide: string;
  /** Seeded body patches; the count says how many. */
  patch: string;
  spots: number;
  muzzle: string;
  horn: string;
  hornTip: string;
  /** Horn reach (tiles) — stubs on the cow, sweeps on the bull. */
  hornLen: number;
  udder?: string;
  noseRing?: string;
  /** A strap-hung cowbell at the throat (dairy herd charm). */
  bell?: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  bellyH: number;
  backH: number;
  /** Extra shoulder mass ramped toward the chest (bull). */
  humpH: number;
  headW: number;
  headH: number;
}

export const CATTLE_LOOKS: Record<string, CattleLook> = {
  cow: {
    hide: '#e7ddca',
    patch: '#59463a',
    spots: 3,
    muzzle: '#d8a396',
    horn: '#ddd0b2',
    hornTip: '#8d7c64',
    hornLen: 0.09,
    udder: '#e2aba1',
    bell: '#c9a24a',
    bodyW: 0.26,
    bellyH: 0.3,
    backH: 0.66,
    humpH: 0,
    headW: 0.3,
    headH: 0.26,
  },
  bull: {
    hide: '#63503f',
    patch: '#473a2e',
    spots: 2,
    muzzle: '#a08872',
    horn: '#e4d8bc',
    hornTip: '#6f6350',
    hornLen: 0.17,
    noseRing: '#d9b054',
    bodyW: 0.29,
    bellyH: 0.31,
    backH: 0.7,
    humpH: 0.14,
    headW: 0.33,
    headH: 0.29,
  },
};

function ringPath(pts: Array<{ x: number; y: number }>): Path2D {
  const p = new Path2D();
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i]!;
    if (i === 0) p.moveTo(q.x, q.y);
    else p.lineTo(q.x, q.y);
  }
  p.closePath();
  return p;
}

/** Hoisted hull helpers — hullPath runs per beast slab per frame, so
 *  its comparator/scratch must not be rebuilt per call (GC churn). */
const hullCmp = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  a.x - b.x || a.y - b.y;
function hullCross(
  o: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
const hullSorted: Array<{ x: number; y: number }> = [];
const hullLower: Array<{ x: number; y: number }> = [];
const hullUpper: Array<{ x: number; y: number }> = [];

/** Convex hull (monotone chain) — the silhouette of an extruded slab. */
function hullPath(pts: Array<{ x: number; y: number }>): Path2D {
  const s = hullSorted;
  s.length = 0;
  for (const p of pts) s.push(p);
  s.sort(hullCmp);
  const lower = hullLower;
  lower.length = 0;
  for (const p of s) {
    while (lower.length >= 2 && hullCross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = hullUpper;
  upper.length = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i]!;
    while (upper.length >= 2 && hullCross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  // Ring the two chains directly (skip each chain's duplicated endpoint).
  const path = new Path2D();
  if (lower.length === 0) return path;
  path.moveTo(lower[0]!.x, lower[0]!.y);
  for (let i = 1; i < lower.length - 1; i++) path.lineTo(lower[i]!.x, lower[i]!.y);
  for (let i = 0; i < upper.length - 1; i++) path.lineTo(upper[i]!.x, upper[i]!.y);
  path.closePath();
  return path;
}

export interface CattleBodyFrame {
  /** Screen position of the body's ground point. */
  bx: number;
  gy: number;
  s: number;
  fx: number;
  fy: number;
  /** Camera foreshorten (1 for ragdolls drawn in screen space). */
  ys: number;
  seed: number;
  hurt: boolean;
  /** Gait bob (tiles) and side roll — 0 for corpses. */
  bob: number;
  roll: number;
  /** Heights (tiles) — corpses pass a collapsed backH. */
  backH: number;
  bellyH: number;
}

/**
 * The cattle body block: chamfered octagon footprint projected at
 * belly and back height, silhouette = convex hull of both rings.
 * Paint order inside the clip makes the light model: base hide, then
 * the seeded patches, then a hard shade step on everything below the
 * back plane, then the lit back facet — so each patch reads darker
 * where it spills over the flank, exactly like the torso shade-half.
 */
export function paintCattleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CattleLook,
  f: CattleBodyFrame,
): void {
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const hl = spec.bodyLen * s;
  const hw = look.bodyW * s;
  const cut = Math.min(hl, hw) * 0.5;
  const oct: Array<[number, number]> = [
    [hl, -hw + cut],
    [hl, hw - cut],
    [hl - cut, hw],
    [-hl + cut, hw],
    [-hl, hw - cut],
    [-hl, -hw + cut],
    [-hl + cut, -hw],
    [hl - cut, -hw],
  ];
  const lift = f.bob * 0.35 * s;
  const hump = look.humpH * s;
  const gx = (X: number, Y: number): number => bx + fx * X + px * Y;
  const gyy = (X: number, Y: number): number => gy + (fy * X + py * Y) * ys;
  const top = oct.map(([X, Y]) => {
    let h = f.backH * s + lift - Y * f.roll * 0.4;
    if (hump > 0 && X > hl * 0.1) h += hump * ((X / hl - 0.1) / 0.9);
    return { x: gx(X, Y), y: gyy(X, Y) - h };
  });
  const bot = oct.map(([X, Y]) => ({
    x: gx(X, Y),
    // The chest runs deeper than the flank — the belly line climbs
    // toward the rump, which is most of what reads "cattle" side-on.
    y: gyy(X, Y) - (f.bellyH - 0.05 * Math.max(0, X / hl)) * s - lift * 0.6,
  }));
  const hull = hullPath([...top, ...bot]);
  const topFace = ringPath(top);

  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = f.hurt ? '#ffffff' : look.hide;
  ctx.fill(hull);
  if (!f.hurt && look.spots > 0) {
    ctx.fillStyle = look.patch;
    for (let k = 0; k < look.spots; k++) {
      const b = (n: number): number => ((f.seed >>> ((k * 9 + n * 3) % 28)) & 7) / 7;
      const X = (b(0) * 1.7 - 0.85) * hl * 0.9;
      const Y = (b(1) * 2 - 1) * hw;
      const r = (0.55 + b(2) * 0.5) * hw;
      ctx.beginPath();
      facetBlob(
        ctx,
        gx(X, Y),
        gyy(X, Y) - f.backH * 0.72 * s - lift,
        r,
        (f.seed ^ (k * 0x9e37)) | 0,
        7,
        0.8,
        k * 2.1,
      );
      ctx.fill();
    }
  }
  if (!f.hurt) {
    // Hard shade step: hull minus back facet = the flanks.
    const flanks = new Path2D();
    flanks.addPath(hull);
    flanks.addPath(topFace);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.20)';
    ctx.fill(flanks, 'evenodd');
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fill(topFace);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke(hull);
}

/**
 * The cattle head: a billboard chamfered slab (like the humanoid head)
 * whose muzzle, ears, horns and eyes orbit with the facing. Shared by
 * the live rig and the ragdoll — corpses pass `dead` (no face marks)
 * and ys=1.
 */
export function drawCattleHead(
  ctx: CanvasRenderingContext2D,
  look: CattleLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Slow lateral cud-grind offset (screen px), idle only. */
    chew?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Ears: angular flaps riding the side axis, drooping at the tips,
  // pink inside when they face the camera.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.4;
    const byr = cy + py * es * w * 0.4 * ys - h * 0.1;
    const tx = cx + px * es * w * 0.95;
    const ty = cy + py * es * w * 0.95 * ys + h * 0.12;
    ctx.fillStyle = C(shade(look.hide, -12));
    ctx.beginPath();
    ctx.moveTo(bxr, byr - h * 0.12);
    ctx.lineTo(tx, ty - h * 0.08);
    ctx.lineTo(tx + px * es * w * 0.06, ty + h * 0.06);
    ctx.lineTo(bxr, byr + h * 0.14);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.muzzle;
      ctx.beginPath();
      ctx.moveTo(bxr + (tx - bxr) * 0.35, byr + (ty - byr) * 0.35 - h * 0.05);
      ctx.lineTo(bxr + (tx - bxr) * 0.85, byr + (ty - byr) * 0.85 - h * 0.02);
      ctx.lineTo(bxr + (tx - bxr) * 0.4, byr + (ty - byr) * 0.4 + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Horns: tapered two-segment polygons sweeping out, then forward-up.
  const L = look.hornLen * s;
  for (const es of [-1, 1]) {
    const b0x = cx + px * es * w * 0.3;
    const b0y = cy + py * es * w * 0.3 * ys - h * 0.44;
    const m0x = b0x + px * es * L * 0.85;
    const m0y = b0y + py * es * L * 0.85 * ys - L * 0.55;
    const t0x = m0x + fx * L * 0.6;
    const t0y = m0y + fy * L * 0.6 * ys - L * 0.75;
    // Perpendicular half-widths shrinking base → mid → tip.
    const a1 = Math.atan2(m0y - b0y, m0x - b0x) + Math.PI / 2;
    const a2 = Math.atan2(t0y - m0y, t0x - m0x) + Math.PI / 2;
    const w0 = Math.max(1.2, L * 0.2);
    const w1 = Math.max(0.9, L * 0.13);
    ctx.fillStyle = C(look.horn);
    ctx.beginPath();
    ctx.moveTo(b0x + Math.cos(a1) * w0, b0y + Math.sin(a1) * w0);
    ctx.lineTo(m0x + Math.cos(a2) * w1, m0y + Math.sin(a2) * w1);
    ctx.lineTo(t0x, t0y);
    ctx.lineTo(m0x - Math.cos(a2) * w1, m0y - Math.sin(a2) * w1);
    ctx.lineTo(b0x - Math.cos(a1) * w0, b0y - Math.sin(a1) * w0);
    ctx.closePath();
    ctx.fill();
    // Dark tip cap.
    ctx.fillStyle = C(look.hornTip);
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.lineTo(t0x - (t0x - m0x) * 0.3 + Math.cos(a2) * w1 * 0.7, t0y - (t0y - m0y) * 0.3 + Math.sin(a2) * w1 * 0.7);
    ctx.lineTo(t0x - (t0x - m0x) * 0.3 - Math.cos(a2) * w1 * 0.7, t0y - (t0y - m0y) * 0.3 - Math.sin(a2) * w1 * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  // Head block with a lit poll band and a hard jaw shade.
  ctx.fillStyle = C(look.hide);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.18)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.14)';
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
    // Poll tuft between the horns.
    ctx.fillStyle = look.patch;
    ctx.beginPath();
    chamferRect(ctx, cx - w * 0.17, cy - h * 0.56, w * 0.34, h * 0.16, 1.5);
    ctx.fill();
  }

  // The cowbell: a strapped trapezoid at the throat, clapper below.
  if (look.bell && fy > -0.35) {
    const kx = cx - fx * w * 0.1;
    const ky = cy + h * 0.62;
    const bw = w * 0.2;
    ctx.strokeStyle = C('#4a3324');
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(kx, ky - h * 0.14);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.fillStyle = C(look.bell);
    ctx.beginPath();
    ctx.moveTo(kx - bw * 0.32, ky);
    ctx.lineTo(kx + bw * 0.32, ky);
    ctx.lineTo(kx + bw * 0.52, ky + bw * 0.78);
    ctx.lineTo(kx - bw * 0.52, ky + bw * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(shade(look.bell, -45));
    ctx.fillRect(kx - bw * 0.14, ky + bw * 0.78, bw * 0.28, bw * 0.3);
  }

  // Muzzle: a paler block pushed along the facing. It must TURN with
  // the head: full-face width head-on, foreshortened to a narrow
  // profile wedge side-on (a frontal muzzle pasted over a profile head
  // was the classic bug), gone entirely from behind.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const d = w * (0.42 + profileK * 0.14);
    const mx = cx + fx * d + (o.chew ?? 0) * (1 - profileK);
    const my = cy + fy * d * ys + h * 0.16;
    const mw = w * 0.74 * (1 - profileK * 0.58);
    const mh = h * 0.52;
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    chamferRect(ctx, mx - mw / 2, my - mh / 2, mw, mh, mw * 0.16);
    ctx.fill();
    if (!o.hurt) {
      ctx.fillStyle = 'rgba(30, 20, 36, 0.12)';
      ctx.fillRect(mx - mw * 0.4, my + mh * 0.18, mw * 0.8, mh * 0.24);
    }
    if (fy > -0.1 && !o.hurt) {
      // Nostril slits ride the muzzle's own frame — only the near one
      // survives the turn to profile.
      ctx.fillStyle = OUTLINE;
      for (const es of [-1, 1]) {
        if (profileK > 0.45 && es * py < 0) continue;
        const nx = mx + px * es * mw * 0.26 + fx * mw * 0.2 * profileK;
        const ny = my + py * es * mw * 0.26 * ys - mh * 0.18;
        ctx.fillRect(nx - mw * 0.05, ny, mw * 0.1, mh * 0.3);
      }
      if (look.noseRing) {
        ctx.strokeStyle = look.noseRing;
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.arc(mx + fx * mw * 0.18 * profileK, my + mh * 0.22, mw * 0.16, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }
    }
  }

  // Lateral eyes — one per side of the skull, the far one hiding as
  // the head goes profile; none on the back of the skull, none dead.
  if (!o.dead && fy > -0.45) {
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.44;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.44) * ys - h * 0.08;
      ctx.fillRect(ex - w * 0.055, ey - h * 0.09, w * 0.11, h * 0.18);
    }
  }
}

/**
 * Shared 2.5D block-body core for the bespoke beasts: a footprint
 * polygon extruded from a belly line up to a lit back facet, the
 * silhouette the convex hull of both rings, hard flank shade between
 * them — the wall-prism dialect on legs. The wolf and rat ride this;
 * cattle keep their tuned copy above.
 */
export interface BeastBlockFrame {
  /** Screen position of the body's ground point. */
  bx: number;
  gy: number;
  s: number;
  fx: number;
  fy: number;
  /** Camera foreshorten (1 for ragdolls drawn in screen space). */
  ys: number;
  seed: number;
  hurt: boolean;
  /** Gait bob (tiles) and side roll — 0 for corpses. */
  bob: number;
  roll: number;
  /** Corpses collapse the extrusion onto its side. */
  topScale?: number;
  /** Corpses flatten the belly line to the ground. */
  botH?: number;
}

function paintBlockBody(
  ctx: CanvasRenderingContext2D,
  f: BeastBlockFrame,
  foot: Array<[number, number]>,
  topH: (X: number) => number,
  botH: (X: number) => number,
  base: string,
  marks?: (
    gx: (X: number, Y: number) => number,
    gyy: (X: number, Y: number) => number,
    lift: number,
  ) => void,
): void {
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const gx = (X: number, Y: number): number => bx + (fx * X + px * Y) * s;
  const gyy = (X: number, Y: number): number => gy + (fy * X + py * Y) * ys * s;
  const top = foot.map(([X, Y]) => ({
    x: gx(X, Y),
    y: gyy(X, Y) - topH(X) * tk * s - lift + Y * s * f.roll * 0.4,
  }));
  const bot = foot.map(([X, Y]) => ({
    x: gx(X, Y),
    y: gyy(X, Y) - (f.botH ?? botH(X)) * s - lift * 0.6,
  }));
  const hull = hullPath([...top, ...bot]);
  const topFace = ringPath(top);
  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = f.hurt ? '#ffffff' : base;
  ctx.fill(hull);
  if (!f.hurt && marks) marks(gx, gyy, lift);
  if (!f.hurt) {
    // Hard shade step: hull minus back facet = the flanks.
    const flanks = new Path2D();
    flanks.addPath(hull);
    flanks.addPath(topFace);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.20)';
    ctx.fill(flanks, 'evenodd');
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fill(topFace);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke(hull);
}

/**
 * A tapered ribbon along a quadratic spine — the wolf's brush and the
 * rat's naked tail both build from this, live and dead. `widthAt`
 * returns the half-width at t∈[0,1] so species shape their own taper.
 */
export function taperedSpinePath(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  widthAt: (t: number) => number,
): Path2D {
  const N = 8;
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    const qx = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const qy = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const dx = u * (cx - x0) + t * (x1 - cx);
    const dy = u * (cy - y0) + t * (y1 - cy);
    const d = Math.hypot(dx, dy) || 1e-4;
    const w = widthAt(t);
    left.push({ x: qx + (-dy / d) * w, y: qy + (dx / d) * w });
    right.push({ x: qx - (-dy / d) * w, y: qy - (dx / d) * w });
  }
  return ringPath([...left, ...right.reverse()]);
}

/**
 * The wolf: a lean predator prism — deep chest, tucked waist, shoulder
 * hump, dark saddle cape over pale underparts, erect ears, long
 * foreshortening muzzle, amber eyes and a bushy dark-tipped brush.
 */
export interface WolfLook {
  coat: string;
  saddle: string;
  under: string;
  earIn: string;
  eye: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  backH: number;
  /** Extra mass ramped up over the shoulders. */
  shoulderH: number;
  /** Belly height at the chest (deep) and the waist (tucked). */
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}

export const WOLF_LOOK: WolfLook = {
  coat: '#6a6f7d',
  saddle: '#4b4e5d',
  under: '#b7b2a2',
  earIn: '#3a3644',
  eye: '#e2a63c',
  bodyW: 0.165,
  backH: 0.54,
  shoulderH: 0.085,
  chestH: 0.25,
  tuckH: 0.33,
  headW: 0.3,
  headH: 0.245,
};

export function paintWolfBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: WolfLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Wedge footprint: broad chest and shoulders, waist pulling in
  // toward a narrow rump — the athletic taper that reads "predator"
  // against the cattle's even slab.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.8],
    [hl, hw * 0.8],
    [hl * 0.5, hw],
    [-hl * 0.45, hw * 0.9],
    [-hl, hw * 0.62],
    [-hl, -hw * 0.62],
    [-hl * 0.45, -hw * 0.9],
    [hl * 0.5, -hw],
  ];
  // Herd variance: each wolf's coat sits a step off the pack tone.
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) =>
      look.backH +
      Math.max(0, X / hl - 0.05) * look.shoulderH -
      0.05 * Math.max(0, (-X / hl - 0.35) / 0.65),
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 1.2)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Dark saddle cape draped over the back, seeded per wolf.
      ctx.save();
      ctx.translate(gx(hl * 0.02, 0), gyy(hl * 0.02, 0) - look.backH * tk * s * 0.96 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.saddle;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.82, f.seed | 1, 9, (hw * 1.15) / (hl * 0.82), 0.35);
      ctx.fill();
      ctx.restore();
      // Pale bib at the chest — only while the chest can actually
      // face the camera; painted flat it would show through the back
      // when the wolf walks away.
      if (f.fy > -0.15) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.88, 0),
          gyy(hl * 0.88, 0) - (look.chestH + 0.1) * s,
          hw * s * 0.8,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
    },
  );
}

/**
 * The wolf head: angular skull slab with erect ears and a long tapered
 * muzzle that turns with the facing (full-face wedge head-on, narrow
 * profile spike side-on). `snarl` pins the ears back and bares teeth
 * through the pounce telegraph; corpses pass `dead` (no eyes).
 */
export function drawWolfHead(
  ctx: CanvasRenderingContext2D,
  look: WolfLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** 0..1 quick idle ear twitch. */
    flick?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;

  // Erect ears on the skull crown — pinned flat mid-snarl, the near
  // one twitching at idle. A small along-facing stagger keeps the two
  // ears from collapsing into one sliver at full profile.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.1;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.1) * ys - h * 0.38;
    const pin = Math.min(1, snarl * 0.6 + (es > 0 ? (o.flick ?? 0) * 0.35 : 0));
    const tx = bxr + px * es * w * 0.15 - fx * w * 0.22 * pin;
    const ty = byr - h * (0.78 - 0.36 * pin) - fy * w * 0.22 * pin * ys;
    ctx.fillStyle = C(shade(look.coat, -6));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.17, byr + h * 0.06);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.2, byr + h * 0.12);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.06, byr + h * 0.02);
      ctx.lineTo(bxr + (tx - bxr) * 0.62, byr + (ty - byr) * 0.62);
      ctx.lineTo(bxr + px * es * w * 0.12, byr + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Skull block: lit brow, shaded jaw, pale cheek band low.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.24, w * 0.24, w * 0.3, w * 0.3]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.24, w * 0.24, w * 0.3, w * 0.3]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.22);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.14, w, h * 0.36);
    ctx.restore();
  }

  // Muzzle: a tapered snout wedge pushed along the facing. It must
  // TURN with the head — longer and narrower as the profile deepens,
  // gone from behind (the cattle muzzle law).
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.26;
    const by0 = cy + fy * w * 0.26 * ys + h * 0.12;
    const sl = w * (0.32 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.2 * (1 - profileK * 0.25);
    const ht = hb * 0.62;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Snarl: the jaw drops open below the snout tip, teeth bared.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.34 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.9, ty - ny * ht * 0.9);
      ctx.lineTo(tx + nx * ht * 0.9, ty + ny * ht * 0.9);
      ctx.lineTo(tx + (axv / al) * ht * 0.4, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.45, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.02, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.02, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.45);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Nose chip SEATED on the tip — pulled back along the axis so it
    // overlaps the wedge instead of floating past it at profile.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.09, 5, fx);
    ctx.fill();
  }

  // Amber hunter's eyes — slanted slits, the far one hiding as the
  // head goes profile; none from behind, none dead.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.3) * ys - h * 0.1;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.3 + snarl * 0.3));
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.078, -h * 0.055, w * 0.156, h * 0.11);
      ctx.restore();
    }
  }
}

/**
 * The dire wolf: the matriarch — a storm-charcoal predator half again
 * the wolf's mass, designed around ONE silhouette element: the HACKLE
 * RIDGE, a serrated mane standing permanently proud of the spine from
 * skull to mid-back. Frost-grizzled guard hairs tick the dark saddle,
 * an old rake of scars crosses the near flank, the ears carry a
 * bitten-out notch, and the eyes burn ember — the champion tier reads
 * through them the way it does through a crowned skeleton's sockets.
 * Never a scale-up of the wolf: heavier skull, deeper chest over a
 * gaunter tuck, and the brush ends PALE where the wolf's ends dark.
 */
export interface DireWolfLook {
  coat: string;
  saddle: string;
  under: string;
  /** Frost-tipped guard hairs ticking the saddle line. */
  grizzle: string;
  /** The raised mane crest — darker than the saddle, near-black. */
  hackle: string;
  earIn: string;
  eye: string;
  eyeCore: string;
  /** Old rake scars, pale where fur never grew back. */
  scar: string;
  bodyW: number;
  backH: number;
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}

export const DIREWOLF_LOOK: DireWolfLook = {
  coat: '#4b4854',
  saddle: '#312e3c',
  under: '#9d97a0',
  grizzle: '#8d8fa0',
  hackle: '#232030',
  earIn: '#241f2c',
  eye: '#ff9a3d',
  eyeCore: '#ffe4ac',
  scar: '#8f8494',
  bodyW: 0.215,
  backH: 0.68,
  shoulderH: 0.16,
  chestH: 0.3,
  tuckH: 0.46,
  headW: 0.385,
  headH: 0.3,
};

export function paintDireWolfBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: DireWolfLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Harder wedge than the wolf: the chest carries even more of the
  // width and the waist pulls in tighter — massive AND gaunt, the
  // starved-winter matriarch, never a fattened scale-up.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.84],
    [hl, hw * 0.84],
    [hl * 0.55, hw],
    [-hl * 0.42, hw * 0.82],
    [-hl, hw * 0.56],
    [-hl, -hw * 0.56],
    [-hl * 0.42, -hw * 0.82],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  // Withers carry the drama: a taller shoulder ramp than the wolf's,
  // then the spine falls away down a low-slung rump.
  const topH = (X: number): number =>
    look.backH +
    Math.max(0, X / hl + 0.05) * look.shoulderH -
    0.07 * Math.max(0, (-X / hl - 0.3) / 0.7);
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 1.1)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // The great saddle cape: broader and darker than a wolf's,
      // reaching down the flanks.
      ctx.save();
      ctx.translate(gx(hl * 0.02, 0), gyy(hl * 0.02, 0) - look.backH * tk * s * 0.92 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.saddle;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.88, f.seed | 1, 9, (hw * 1.3) / (hl * 0.88), 0.35);
      ctx.fill();
      // Frost grizzle: pale guard-hair ticks riding the saddle's
      // edge — the winters she's carried, seeded so no two matriarchs
      // frost alike.
      ctx.strokeStyle = look.grizzle;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const gseed = (f.seed >>> (i * 3)) & 15;
        const tx = hl * s * (0.62 - 0.19 * i) * 0.9;
        const ty = -hw * s * (0.35 + (gseed & 3) * 0.14) * ((i & 1) === 0 ? 1 : -1);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - s * 0.05, ty + s * 0.028 * ((i & 1) === 0 ? 1 : -1));
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
      // Pale chest bib — only while the chest can face the camera.
      if (f.fy > -0.15) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.9, 0),
          gyy(hl * 0.9, 0) - (look.chestH + 0.12) * s,
          hw * s * 0.82,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
      // The old rake: three parallel scar lines across the ribs,
      // near flank only — the story the pack reads at a glance.
      if (Math.abs(f.fy) < 0.92) {
        ctx.strokeStyle = look.scar;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const sx = gx(hl * (0.34 - i * 0.13), hw * 0.55);
          const sy = gyy(hl * (0.34 - i * 0.13), hw * 0.55) - (look.chestH + 0.2) * s - lift * 0.6;
          ctx.beginPath();
          ctx.moveTo(sx - s * 0.02, sy - s * 0.075);
          ctx.lineTo(sx + s * 0.024, sy + s * 0.055);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    },
  );
  // THE HACKLE RIDGE — the signature. Serrated mane spikes standing
  // proud of the spine, tallest over the withers, dying out mid-back.
  // Painted AFTER the body: the hull clip eats anything above it.
  const { bx, gy, s, fx, fy, ys } = f;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const spineAt = (X: number): { x: number; y: number } => ({
    x: bx + fx * X * s,
    y: gy + fy * X * ys * s - topH(X) * tk * s - lift,
  });
  ctx.fillStyle = f.hurt ? '#ffffff' : look.hackle;
  const N = 5;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // Skull to mid-back only — the rump stays smooth.
    const X0 = hl * (0.92 - 0.95 * t);
    const X1 = X0 - hl * 0.16;
    const a = spineAt(X0);
    const b = spineAt(X1);
    // Serration: alternating tall/short teeth, all raked BACK.
    const hgt = s * tk * (0.115 - 0.055 * t) * ((i & 1) === 0 ? 1 : 0.72);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + s * 0.012);
    ctx.lineTo((a.x + b.x) / 2 - fx * s * 0.035, (a.y + b.y) / 2 - hgt);
    ctx.lineTo(b.x, b.y + s * 0.012);
    ctx.closePath();
    ctx.fill();
  }
  // Frost tips on the tallest hackles — the ridge catches the light.
  if (!f.hurt) {
    ctx.fillStyle = look.grizzle;
    for (const i of [0, 2]) {
      const t = i / (N - 1);
      const X0 = hl * (0.92 - 0.95 * t);
      const X1 = X0 - hl * 0.16;
      const a = spineAt(X0);
      const b = spineAt(X1);
      const hgt = s * tk * (0.115 - 0.055 * t);
      const tipX = (a.x + b.x) / 2 - fx * s * 0.035;
      const tipY = (a.y + b.y) / 2 - hgt;
      ctx.beginPath();
      ctx.moveTo(tipX - s * 0.014, tipY + s * 0.03);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(tipX + s * 0.014, tipY + s * 0.03);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * The dire wolf head: a heavier skull than any wolf's — broad brow
 * ledge over ember eyes, a longer deeper muzzle whose fangs show even
 * at rest, and tall ears with a bitten-out notch on the near side.
 * `snarl` drops the whole jaw and bares the full rack.
 */
export function drawDireWolfHead(
  ctx: CanvasRenderingContext2D,
  look: DireWolfLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** 0..1 quick idle ear twitch. */
    flick?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;

  // Tall ears — the NEAR ear (es > 0) carries the notch, a triangular
  // bite taken out of its trailing edge: the matriarch's history in
  // silhouette. Both pin flat mid-snarl.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.1;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.1) * ys - h * 0.4;
    const pin = Math.min(1, snarl * 0.6 + (es > 0 ? (o.flick ?? 0) * 0.35 : 0));
    const tx = bxr + px * es * w * 0.16 - fx * w * 0.24 * pin;
    const ty = byr - h * (0.92 - 0.4 * pin) - fy * w * 0.24 * pin * ys;
    ctx.fillStyle = C(shade(look.coat, -8));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.18, byr + h * 0.06);
    if (es > 0) {
      // Notched trailing edge: out to the tip, then a V bitten into
      // the way back down.
      ctx.lineTo(tx, ty);
      ctx.lineTo(bxr + px * es * w * 0.24 + (tx - bxr) * 0.42, byr + (ty - byr) * 0.55);
      ctx.lineTo(bxr + px * es * w * 0.1 + (tx - bxr) * 0.3, byr + (ty - byr) * 0.42);
      ctx.lineTo(bxr + px * es * w * 0.21, byr + h * 0.12);
    } else {
      ctx.lineTo(tx, ty);
      ctx.lineTo(bxr + px * es * w * 0.21, byr + h * 0.12);
    }
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.06, byr + h * 0.02);
      ctx.lineTo(bxr + (tx - bxr) * 0.55, byr + (ty - byr) * 0.55);
      ctx.lineTo(bxr + px * es * w * 0.12, byr + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Skull block: broader than the wolf's, chamfered heavier.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    // Lit crown, then the BROW LEDGE: a hard dark band over the eye
    // line that the wolf head doesn't carry — the glower.
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.18);
    ctx.fillStyle = C(shade(look.saddle, -6));
    ctx.fillRect(cx - w / 2, cy - h * 0.28, w, h * 0.17);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.18, w, h * 0.34);
    ctx.restore();
  }

  // Muzzle: longer and deeper than the wolf's — the bone-crusher jaw.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.28;
    const by0 = cy + fy * w * 0.28 * ys + h * 0.12;
    const sl = w * (0.36 + 0.32 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.23 * (1 - profileK * 0.22);
    const ht = hb * 0.66;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      // The full rack: a deeper gape than any wolf, three fangs and a
      // dark gum line.
      const gape = h * 0.46 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.95, ty - ny * ht * 0.95);
      ctx.lineTo(tx + nx * ht * 0.95, ty + ny * ht * 0.95);
      ctx.lineTo(tx + (axv / al) * ht * 0.45, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.55, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!o.dead && !o.hurt && fy > 0.05) {
      // At rest the fangs still show — two pale ticks hooking down
      // from the jawline near the tip. The wolf hides its teeth; the
      // matriarch never does.
      ctx.fillStyle = '#e8e2d0';
      for (const ts of [-0.62, 0.52]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.016, ty + ny * ht * ts + h * 0.05);
        ctx.lineTo(tx + nx * ht * ts + w * 0.016, ty + ny * ht * ts + h * 0.05);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + h * 0.14);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Nose chip seated on the tip.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.095, 5, fx);
    ctx.fill();
  }

  // Ember eyes under the brow ledge — a soft heat-glow OWNS the
  // socket (the tiny-tint failure from the skeleton epic), then the
  // slit, then a hot core. Dark and dead on a corpse.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.3) * ys - h * 0.08;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.28 + snarl * 0.3));
      if (!o.hurt) {
        ctx.fillStyle = 'rgba(255, 154, 61, 0.28)';
        ctx.fillRect(-w * 0.13, -h * 0.1, w * 0.26, h * 0.2);
      }
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.088, -h * 0.06, w * 0.176, h * 0.12);
      if (!o.hurt) {
        ctx.fillStyle = look.eyeCore;
        ctx.fillRect(-w * 0.032, -h * 0.032, w * 0.064, h * 0.064);
      }
      ctx.restore();
    }
  }
}

/**
 * The worg: goblin-kin war-hound, designed around ONE silhouette
 * element: the HYENA SLOPE — towering shoulders falling hard down a
 * pencil-thin rump, the head slung LOW off the withers. A bear-trap
 * skull with an underbite whose fang-tusks hook up past the muzzle,
 * big ragged bat ears torn at the edges, mange-dappled dun hide over
 * a bare-skin chest, a short ratty kink of a tail — nothing about it
 * reads noble. The eyes are sickly green and set forward: it is
 * thinking about you specifically.
 */
export interface WorgLook {
  hide: string;
  /** Mange dapple blotches across the shoulders. */
  dapple: string;
  /** The short choppy bristle strip down the nape — patchy, not a mane. */
  mane: string;
  /** Bare skin: chest bib, muzzle, tail hide. */
  bare: string;
  earIn: string;
  eye: string;
  fang: string;
  bodyW: number;
  /** Withers height — the tall front of the slope. */
  shoulderH: number;
  /** Rump height — the low rear of the slope. */
  rumpH: number;
  chestH: number;
  headW: number;
  headH: number;
}

export const WORG_LOOK: WorgLook = {
  hide: '#6b5f47',
  dapple: '#544a36',
  mane: '#38301f',
  bare: '#8f7a62',
  earIn: '#4a3a30',
  eye: '#b8d44a',
  fang: '#e8dfc8',
  bodyW: 0.2,
  shoulderH: 0.6,
  rumpH: 0.34,
  chestH: 0.22,
  headW: 0.34,
  headH: 0.27,
};

export function paintWorgBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: WorgLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Front-loaded footprint: all the width lives at the shoulders, the
  // haunches pinch to almost nothing — the slope in plan view.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.85],
    [hl, hw * 0.85],
    [hl * 0.5, hw],
    [-hl * 0.55, hw * 0.68],
    [-hl, hw * 0.42],
    [-hl, -hw * 0.42],
    [-hl * 0.55, -hw * 0.68],
    [hl * 0.5, -hw],
  ];
  const hide = shade(look.hide, (((f.seed >>> 5) & 7) - 3) * 2);
  // THE HYENA SLOPE: withers tower at the front and the spine falls
  // away in one hard line to the low rump — the anti-wolf silhouette.
  const topH = (X: number): number => {
    const t = Math.min(1, Math.max(0, (X / hl + 1) / 1.5));
    return look.rumpH + (look.shoulderH - look.rumpH) * t * t;
  };
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    // Deep chest shallowing toward the tucked rear.
    (X) => look.chestH + 0.05 * Math.min(1, Math.max(0, (0.4 - X / hl) / 1.4)),
    hide,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Mange dapple: seeded blotches scattered down the upper flank,
      // painted in the body's rotated frame so they ride every facing.
      ctx.save();
      ctx.translate(gx(hl * 0.06, 0), gyy(hl * 0.06, 0) - look.shoulderH * tk * s * 0.7 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.dapple;
      for (let i = 0; i < 5; i++) {
        const dseed = (f.seed >>> (i * 4)) & 31;
        const dx = hl * s * (0.55 - 0.28 * i + (dseed & 3) * 0.02);
        const dy = ((dseed >> 2) & 3) * hw * s * 0.22 * ((i & 1) === 0 ? 1 : -1);
        ctx.beginPath();
        facetBlob(ctx, dx, dy, s * (0.055 + (dseed & 1) * 0.02), f.seed ^ (i * 77), 6, 0.8);
        ctx.fill();
      }
      ctx.restore();
      // Bare-skin chest bib, camera-side only.
      if (f.fy > -0.15) {
        ctx.fillStyle = look.bare;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.88, 0),
          gyy(hl * 0.88, 0) - (look.chestH + 0.1) * s,
          hw * s * 0.72,
          f.seed ^ 0x2f,
          7,
          0.85,
          1.6,
        );
        ctx.fill();
      }
    },
  );
  // The nape bristle strip: short choppy spikes from skull to
  // mid-back — PATCHY, with seeded gaps. A mangy war-hound's roach,
  // never the matriarch's proud ridge. Painted after the body.
  const { bx, gy, s, fx, fy, ys } = f;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  ctx.fillStyle = f.hurt ? '#ffffff' : look.mane;
  const spineAt = (X: number): { x: number; y: number } => ({
    x: bx + fx * X * s,
    y: gy + fy * X * ys * s - topH(X) * tk * s - lift,
  });
  const N = 8;
  for (let i = 0; i < N; i++) {
    // Mange gaps: the seeded bits eat two of the eight tufts.
    if (((f.seed >>> (i + 2)) & 7) === 3) continue;
    const t = i / (N - 1);
    const X0 = hl * (0.95 - 1.0 * t);
    const X1 = X0 - hl * 0.1;
    const a = spineAt(X0);
    const b = spineAt(X1);
    const hgt = s * tk * (0.055 - 0.02 * t);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + s * 0.01);
    ctx.lineTo((a.x + b.x) / 2 - fx * s * 0.012, (a.y + b.y) / 2 - hgt);
    ctx.lineTo(b.x, b.y + s * 0.01);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The worg head: a bear-trap — broad short skull, heavier below than
 * above, the UNDERBITE fang-tusks hooking up past the muzzle sides
 * even at rest. Big ragged bat ears with torn edges; forward-set
 * sickly-green eyes. `gape` swings the whole lower jaw open through
 * the lunge — the trap showing you its hinge.
 */
export function drawWorgHead(
  ctx: CanvasRenderingContext2D,
  look: WorgLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph — the trap opens. */
    gape?: number;
    /** 0..1 idle ear swivel. */
    flick?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const gape = o.gape ?? 0;

  // Ragged bat ears: broad-based sails with a torn V down the outer
  // edge. Painted in the MANE tone — the head hangs low against the
  // worg's own withers, and hide-toned ears vanished into the body
  // mass (caught in matrix v2).
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.08;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.08) * ys - h * 0.34;
    const swiv = es > 0 ? (o.flick ?? 0) * 0.2 : 0;
    const tx = bxr + px * es * w * (0.24 + swiv);
    const ty = byr - h * 0.82;
    ctx.fillStyle = C(look.mane);
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.2, byr + h * 0.05);
    // Inner edge straight up to the tip.
    ctx.lineTo(tx - px * es * w * 0.12, ty + h * 0.08);
    ctx.lineTo(tx, ty);
    // Outer edge falls with a torn V halfway down.
    ctx.lineTo(tx + px * es * w * 0.14, ty + h * 0.28);
    ctx.lineTo(tx + px * es * w * 0.03, ty + h * 0.4);
    ctx.lineTo(tx + px * es * w * 0.2, ty + h * 0.54);
    ctx.lineTo(bxr + px * es * w * 0.26, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.08, byr + h * 0.02);
      ctx.lineTo(bxr + (tx - bxr) * 0.66, byr + (ty - byr) * 0.66);
      ctx.lineTo(bxr + px * es * w * 0.14, byr + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Skull: broad and SHORT — wider than the dire wolf's in proportion,
  // bottom-heavy chamfer (the jaw carries the mass).
  ctx.fillStyle = C(look.hide);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.16, w * 0.16]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.16, w * 0.16]);
    ctx.clip();
    // Heavy brow shade, bare-skin jaw band low.
    ctx.fillStyle = 'rgba(30, 20, 36, 0.22)';
    ctx.fillRect(cx - w / 2, cy - h * 0.5, w, h * 0.2);
    ctx.fillStyle = C(look.bare);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.32);
    ctx.restore();
  }

  // Muzzle: SHORT and thick — a stub next to the wolves' spike, the
  // trap's front plate. Gone from behind.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.14;
    const sl = w * (0.22 + 0.18 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.08;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.27 * (1 - profileK * 0.18);
    const ht = hb * 0.78;
    ctx.fillStyle = C(shade(look.bare, -4));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    if (gape > 0.15 && !o.dead && !o.hurt) {
      // THE TRAP OPENS: the whole lower jaw swings, dark gullet
      // behind a fence of teeth, the fang-tusks riding the jaw down.
      const drop = h * 0.55 * Math.min(1, gape);
      ctx.fillStyle = '#241018';
      ctx.beginPath();
      ctx.moveTo(bx0 - nx * hb * 0.9, by0 - ny * hb * 0.9);
      ctx.lineTo(tx - nx * ht * 0.9, ty - ny * ht * 0.9);
      ctx.lineTo(tx + (axv / al) * ht * 0.2, ty + drop);
      ctx.lineTo(bx0, by0 + drop * 0.8);
      ctx.closePath();
      ctx.fill();
      // The dropped jaw slab under the gullet.
      ctx.fillStyle = C(shade(look.bare, -12));
      ctx.beginPath();
      ctx.moveTo(bx0 - nx * hb * 0.7, by0 + drop * 0.82);
      ctx.lineTo(tx - nx * ht * 0.6, ty + drop * 0.98);
      ctx.lineTo(tx + nx * ht * 0.6, ty + drop);
      ctx.lineTo(bx0 + nx * hb * 0.7, by0 + drop * 0.86);
      ctx.closePath();
      ctx.fill();
      // Teeth fence on the upper plate.
      ctx.fillStyle = look.fang;
      for (const ts of [-0.5, -0.05, 0.42]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.018, ty + ny * ht * ts + h * 0.02);
        ctx.lineTo(tx + nx * ht * ts + w * 0.018, ty + ny * ht * ts + h * 0.02);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + drop * 0.42);
        ctx.closePath();
        ctx.fill();
      }
    }
    // THE UNDERBITE — the signature read. Two fang-tusks hooking UP
    // from the lower jaw past the muzzle sides, always shown (rest or
    // gape), obeying the far-side-skip law at profile.
    if (!o.hurt) {
      const jawDrop = gape > 0.15 && !o.dead ? h * 0.5 * Math.min(1, gape) : 0;
      for (const ts of [-1, 1]) {
        if (Math.abs(fx) > 0.7 && ts * py < 0) continue;
        const fxp = tx + nx * ht * ts * 0.82;
        const fyp = ty + ny * ht * ts * 0.82 + h * 0.1 + jawDrop;
        ctx.fillStyle = look.fang;
        ctx.beginPath();
        ctx.moveTo(fxp - w * 0.028, fyp);
        ctx.lineTo(fxp + w * 0.028, fyp + h * 0.02);
        // The up-hook: tip pulled back toward the skull.
        ctx.lineTo(fxp + w * 0.012 - fx * w * 0.05, fyp - h * 0.2);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Broad nose bar across the stub tip.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.015, ty - (ayv / al) * w * 0.015, w * 0.1, 5, fx);
    ctx.fill();
  }

  // Sickly green eyes — round and FORWARD-SET (closer to the muzzle
  // root than any wolf's), a black slit pupil. It is not hunting; it
  // is planning.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.17 + px * es * w * 0.22;
      const ey = cy + (fy * w * 0.17 + py * es * w * 0.22) * ys - h * 0.12;
      ctx.fillStyle = C(look.eye);
      ctx.beginPath();
      ctx.arc(ex, ey, w * 0.075, 0, Math.PI * 2);
      ctx.fill();
      if (!o.hurt) {
        ctx.fillStyle = '#1a1610';
        ctx.fillRect(ex - w * 0.014, ey - w * 0.055, w * 0.028, w * 0.11);
      }
    }
  }
}

/**
 * THE FEATHER-AND-DISC DIALECT — the great owl, the parliament's
 * hunter. A TWO-POST beast unlike anything else on the rig: an
 * upright keg of plumage on backward-kneed bird legs, a facial disc
 * that carries BOTH eyes forward (the one face in the bestiary that
 * meets yours), and a head that turns on its own clock while the
 * body stands stone-still. Straight out of the oldest bestiaries — a
 * horned hunter the size of a shepherd — rebuilt in the Arx facet
 * dialect: block-prism body, chamfered feather fans, hard shade
 * steps, square pupils, no soft pill anywhere.
 */
export interface OwlLook {
  /** Mantle — the folded-wing cloak that IS the back and shoulders. */
  mantle: string;
  /** Breast keel and underwing — the pale flash of the threat bloom. */
  breast: string;
  /** Barring ink: breast chevrons, feather tips, tail bands. */
  bar: string;
  /** The facial disc plate. */
  disc: string;
  /** The disc's dark rim — what makes the disc a DISC. */
  discRim: string;
  /** The iris — the lamp of the face. */
  eye: string;
  /** Beak horn. */
  horn: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  /** Shoulder-dome height of the upright keg (tiles). */
  backH: number;
  /** Belly clearance over the shanks (tiles). */
  bellyH: number;
  headW: number;
  headH: number;
  /** Ear-tuft reach (tiles) — the horned crown; the elder's is a crest. */
  tuftLen: number;
  /** Tail-fan blade reach past the rump (tiles). */
  tailLen: number;
  /** Leading-primary reach of one spread wing (tiles). */
  wingSpan: number;
  /** Doubled disc ring, frost crown ticks — the elder's ledger. */
  elder?: boolean;
  /** Spawn seed carried on the resolved look — drives barring phase. */
  seed?: number;
}

/** The rank-and-file hunter: tawny bark camouflage, amber lamps. */
export const GREAT_OWL_LOOK: OwlLook = {
  mantle: '#8a7458',
  breast: '#d8c9a4',
  bar: '#5a4a38',
  disc: '#c9b488',
  discRim: '#4a3c30',
  eye: '#e8b23c',
  horn: '#3a3028',
  bodyW: 0.25,
  backH: 0.72,
  bellyH: 0.3,
  headW: 0.4,
  headH: 0.27,
  tuftLen: 0.16,
  tailLen: 0.38,
  wingSpan: 1.35,
};

/**
 * The elder: the parliament's high seat — never a scale-up. Storm
 * slate over moon-pale cream where the wing is bark over buff, a
 * TALL tufted crest for a crown, the disc ring doubled like a
 * weathered court seal, and frost ticked through the crown feathers.
 * It out-masses the hunter in every dimension that counts.
 */
export const ELDER_GREAT_OWL_LOOK: OwlLook = {
  mantle: '#4e5262',
  breast: '#d7d3be',
  bar: '#343846',
  disc: '#b9bdc9',
  discRim: '#2c303c',
  eye: '#f2e6a0',
  horn: '#2a2a34',
  bodyW: 0.34,
  backH: 0.94,
  bellyH: 0.38,
  headW: 0.53,
  headH: 0.35,
  tuftLen: 0.34,
  tailLen: 0.55,
  wingSpan: 1.85,
  elder: true,
};

/**
 * THE PLUMAGE CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a parliament sorts into kin groups (the
 * gnoll coat-cluster law, feathered): tawny bark, ash gray, deep-wood
 * moss, and the birch-pale ghost. Elders never roll — an elder is a
 * DESIGN.
 */
const OWL_PLUMAGES: ReadonlyArray<
  Pick<OwlLook, 'mantle' | 'breast' | 'bar' | 'disc' | 'discRim' | 'eye'>
> = [
  // tawny bark — the shipped def color
  { mantle: '#8a7458', breast: '#d8c9a4', bar: '#5a4a38', disc: '#c9b488', discRim: '#4a3c30', eye: '#e8b23c' },
  // ash gray — the great gray of the high boughs
  { mantle: '#767c88', breast: '#ccc9bd', bar: '#474c58', disc: '#b8b5a8', discRim: '#3c4048', eye: '#e8d24c' },
  // deep-wood moss — olive umber, the pine-shadow coat
  { mantle: '#777052', breast: '#cfc298', bar: '#4c4734', disc: '#b5ab7e', discRim: '#3e3a2c', eye: '#e09a38' },
  // birch-pale — the winter ghost the loggers swear at
  { mantle: '#a8a290', breast: '#e4ddc8', bar: '#6e675a', disc: '#d5cdb4', discRim: '#575044', eye: '#f0c84a' },
];

const OWL_LOOK_CACHE = new Map<string, OwlLook>();

/**
 * Variant lookup with the hunter as the unknown-id fallback. The seed
 * (spawn eid) rolls the rank-and-file's plumage cluster plus a small
 * shade jitter — hashed first, because knot members spawn with
 * CONSECUTIVE eids and raw bits would dress a whole wing in one coat.
 * The elder holds its authored design. Cached; runs per body per frame.
 */
export function owlLook(defId: string, seed = 0): OwlLook {
  const base = defId === 'elder_great_owl' ? ELDER_GREAT_OWL_LOOK : GREAT_OWL_LOOK;
  const key = `${defId}|${seed & 0xff}`;
  const hit = OWL_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: OwlLook;
  if (defId === 'great_owl') {
    const h = (seed * 2654435761) | 0;
    const cl = OWL_PLUMAGES[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      mantle: shade(cl.mantle, jit),
      breast: cl.breast,
      bar: cl.bar,
      disc: shade(cl.disc, jit),
      discRim: cl.discRim,
      eye: cl.eye,
      seed,
    };
  } else {
    look = { ...base, seed };
  }
  OWL_LOOK_CACHE.set(key, look);
  return look;
}

/**
 * One feathered wing fan in the facet dialect: a bone-dark leading
 * arm and four chamfered primary blades stepping back from it — a
 * STEPPED silhouette, never a soft fan. Pale on the underside, so a
 * raised wing flashes the mantle warning every prey animal in the
 * wood understands. Screen-space like the bat's membranes (billboard
 * wings read at every body facing); the corpse splay squashes the
 * same fan onto the ground.
 */
export function owlWingFan(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    /** Shoulder pivot on screen. */
    x: number;
    y: number;
    s: number;
    /** Screen angle of the leading edge (radians). */
    ang: number;
    /** 0..1 fan opening. */
    spread: number;
    /** Leading-primary reach (tiles). */
    span: number;
    /** Show the pale underside (wings up = the mantle flash). */
    under?: boolean;
    /** Vertical squash for corpse splays flat on the ground. */
    squash?: number;
    /**
     * Fan-opening scale: 1 = the full mantling droop (the standing
     * threat bloom). Level flight carries the blade flatter — cruise
     * ~0.6, a locked-out glide flatter still.
     */
    openK?: number;
    hurt?: boolean;
    seed?: number;
  },
): void {
  const s = o.s;
  const sy = o.squash ?? 1;
  const reach = o.span * s * (0.5 + 0.5 * o.spread);
  const base = o.hurt ? '#ffffff' : o.under ? look.breast : look.mantle;
  const rib = o.hurt ? '#ffffff' : o.under ? shade(look.breast, -11) : shade(look.mantle, -12);
  // The fan droops from the leading edge toward the ground, whichever
  // side of the screen the wing points.
  const droop = Math.cos(o.ang) >= 0 ? 1 : -1;
  const open = droop * (0.28 + 0.62 * Math.max(0.3, o.spread)) * (o.openK ?? 1);
  // ONE solid fan silhouette with a stepped trailing edge — a wing is
  // a MASS, never a rake of ribs. Five primary tips, notched between.
  const N = 5;
  const tip = (k: number): { x: number; y: number; a: number } => {
    const t = k / (N - 1);
    const a = o.ang + open * t;
    const len = reach * (1 - 0.15 * t);
    return { x: o.x + Math.cos(a) * len, y: o.y + Math.sin(a) * len * sy, a };
  };
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  for (let k = 0; k < N; k++) {
    const p = tip(k);
    ctx.lineTo(p.x, p.y);
    // The notch: a step back toward the pivot between primaries.
    if (k < N - 1) {
      const a = o.ang + open * ((k + 0.5) / (N - 1));
      const len = reach * (1 - 0.15 * ((k + 0.5) / (N - 1))) * 0.84;
      ctx.lineTo(o.x + Math.cos(a) * len, o.y + Math.sin(a) * len * sy);
    }
  }
  ctx.closePath();
  ctx.fill();
  if (!o.hurt) {
    // Rachis lines: the feather shafts fanning through the mass.
    ctx.strokeStyle = rib;
    ctx.lineWidth = Math.max(1.2, s * 0.022);
    ctx.lineCap = 'round';
    for (let k = 1; k < N - 1; k++) {
      const p = tip(k);
      ctx.beginPath();
      ctx.moveTo(o.x + (p.x - o.x) * 0.2, o.y + (p.y - o.y) * 0.2);
      ctx.lineTo(o.x + (p.x - o.x) * 0.9, o.y + (p.y - o.y) * 0.9);
      ctx.stroke();
    }
    // The bar band riding the tips — one broken arc of bar ink.
    ctx.strokeStyle = look.bar;
    ctx.lineWidth = Math.max(1.3, s * 0.024);
    for (let k = 0; k < N; k++) {
      const p = tip(k);
      ctx.beginPath();
      ctx.moveTo(o.x + (p.x - o.x) * 0.8, o.y + (p.y - o.y) * 0.8);
      ctx.lineTo(o.x + (p.x - o.x) * 0.9, o.y + (p.y - o.y) * 0.9);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // The leading arm rides the front edge — the wing's bone line.
  ctx.strokeStyle = o.hurt ? '#ffffff' : shade(look.mantle, -18);
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  ctx.lineTo(o.x + Math.cos(o.ang) * reach * 0.96, o.y + Math.sin(o.ang) * reach * 0.96 * sy);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Covert chip seating the fan on the shoulder.
  ctx.fillStyle = base;
  ctx.beginPath();
  facetCircle(ctx, o.x, o.y, s * 0.08, 6, o.ang, sy);
  ctx.fill();
}

/**
 * THE BROAD WING — the great owl's living wing, drawn in BODY SPACE
 * and projected through the caller's lens, so the same mass
 * foreshortens correctly at every one of the eight facings: a
 * profile bird shows a near wing crossing its body and a far wing
 * behind it, a bird flying away shows both wings from above, and
 * nothing ever points sideways-on-screen because the screen said so.
 *
 * The planform is a real owl's: a bone-dark leading arm sweeping out
 * to the wrist, a broad slab of secondaries behind it, and FINGERED
 * primaries stepping back from the wingtip — each finger shorter and
 * further back-swept than the last — closing along a curved trailing
 * edge into the flank. Coverts shingle the shoulder, a dark
 * flight-feather band rides the outer half, and bar ink ticks the
 * finger tips. Pale underside for the mantling flash.
 */
function owlWingBroad(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    /** Body-space projector: (F fwd, L starboard, Z up) tiles → screen. */
    P: (F: number, L: number, Z: number) => [number, number];
    /** Which wing: -1 port, +1 starboard. */
    es: number;
    s: number;
    /** Wing carriage: 0 = level, + = raised (mantling), − = swept low. */
    raise: number;
    /** The HAND's carriage, trailing the arm through the beat — the
     *  tip whip. Defaults to `raise` (a held pose). */
    raiseHand?: number;
    /** Load flex: + bends the primaries UP under the power stroke,
     *  − droops them through the recovery. */
    flex?: number;
    /** Rowing swing: forward wrist offset (tiles) through the power
     *  stroke, backward on recovery. */
    swing?: number;
    /** 0..1 downwash window — pale gust streaks fall away under the
     *  wingtips right after the stroke bottoms out. */
    gust?: number;
    /** 0..1 how far the wing is unfolded from the body. */
    spread: number;
    /** Back-sweep of the primary fingers: 0.25 mantling → 1 diving. */
    sweepK: number;
    /** Leading-primary reach in tiles (the look's wingSpan). */
    span: number;
    /** Show the pale underside (raised wings flash the warning). */
    under?: boolean;
    hurt?: boolean;
    seed?: number;
  },
): void {
  const { P, es, s } = o;
  const spread = Math.max(0.05, o.spread);
  const raiseA = o.raise;
  const base = o.hurt ? '#ffffff' : o.under ? look.breast : look.mantle;
  const flightInk = o.hurt ? '#ffffff' : o.under ? shade(look.breast, -9) : shade(look.mantle, -10);
  const boneInk = o.hurt ? '#ffffff' : shade(look.mantle, -22);

  // The skeleton in body space. The arm reaches out and slightly
  // forward; the hand carries the reach and the fingers sweep back.
  const armL = o.span * 0.42 * spread;
  const handL = o.span * 0.58 * spread;
  const handA = o.raiseHand ?? raiseA;
  const flex = o.flex ?? 0;
  const shF = 0.14;
  const shL = es * look.bodyW * 0.72;
  const shZ = 0.1 + look.bodyW * 0.35;
  const cosR = Math.cos(raiseA);
  const sinR = Math.sin(raiseA);
  const wrF = shF + 0.1 * spread + (o.swing ?? 0);
  const wrL = shL + es * cosR * armL;
  const wrZ = shZ + sinR * armL;
  // Five primary fingers: tip k reaches shorter and sweeps further
  // back; the whole hand droops through the fan so a level wing
  // curves like a held glide, and a raised wing blooms.
  const N = 5;
  const tips: Array<[number, number, number]> = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const len = handL * (1 - 0.36 * u);
    // The hand carries its own (trailing) angle, and the primaries
    // BEND under load — outer fingers most, the tip-flex that turns
    // a hinged plank into a wing pushing against real air.
    const tipRaise = handA - (0.28 + 0.5 * u) * spread * 0.55;
    const backF = (0.1 + 0.85 * u) * len * o.sweepK;
    tips.push([
      wrF + 0.06 * spread - backF,
      wrL + es * Math.cos(tipRaise) * len,
      wrZ + Math.sin(tipRaise) * len * 0.85 - 0.04 * u + flex * u * u * o.span * 0.3,
    ]);
  }
  // The trailing edge closes into the flank at the tail root.
  const rootF = -0.34;
  const rootL = es * look.bodyW * 0.5;
  const rootZ = 0.06;

  // One solid slab: shoulder → leading edge → fingered tips (with the
  // stepped notches of the facet dialect) → trailing root.
  ctx.fillStyle = base;
  ctx.beginPath();
  const p0 = P(shF, shL, shZ);
  ctx.moveTo(p0[0], p0[1]);
  const pw = P(wrF, wrL, wrZ);
  ctx.lineTo(pw[0], pw[1]);
  for (let k = 0; k < N; k++) {
    const t = tips[k]!;
    const pt = P(t[0], t[1], t[2]);
    ctx.lineTo(pt[0], pt[1]);
    if (k < N - 1) {
      // The notch between primaries: step back toward the wrist.
      const n = tips[k + 1]!;
      const nx = t[0] * 0.35 + n[0] * 0.35 + wrF * 0.3;
      const nl = t[1] * 0.35 + n[1] * 0.35 + wrL * 0.3;
      const nz = t[2] * 0.35 + n[2] * 0.35 + wrZ * 0.3;
      const pn = P(nx, nl, nz);
      ctx.lineTo(pn[0], pn[1]);
    }
  }
  const pr = P(rootF, rootL, rootZ);
  ctx.lineTo(pr[0], pr[1]);
  ctx.closePath();
  ctx.fill();

  if (!o.hurt) {
    // The flight-feather band: the outer half of the slab a step
    // darker — secondaries and primaries against the paler coverts.
    ctx.fillStyle = flightInk;
    ctx.beginPath();
    const mixF = (a: [number, number, number], t: number): [number, number] =>
      P(
        a[0] * t + (shF * 0.5 + rootF * 0.5) * (1 - t),
        a[1] * t + (shL * 0.7 + rootL * 0.3) * (1 - t),
        a[2] * t + (shZ * 0.5 + rootZ * 0.5) * (1 - t),
      );
    const pm0 = mixF([wrF, wrL, wrZ], 0.45);
    ctx.moveTo(pm0[0], pm0[1]);
    const pwF = P(wrF, wrL, wrZ);
    ctx.lineTo(pwF[0], pwF[1]);
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const pt = P(t[0], t[1], t[2]);
      ctx.lineTo(pt[0], pt[1]);
    }
    const prF = mixF(tips[N - 1]!, 0.55);
    ctx.lineTo(prF[0], prF[1]);
    ctx.closePath();
    ctx.fill();
    // Bar ink ticking every finger tip — the parliament's barring.
    ctx.strokeStyle = look.bar;
    ctx.lineWidth = Math.max(1.2, s * 0.022);
    ctx.lineCap = 'round';
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const a = P(
        t[0] * 0.82 + wrF * 0.18,
        t[1] * 0.82 + wrL * 0.18,
        t[2] * 0.82 + wrZ * 0.18,
      );
      const b = P(
        t[0] * 0.93 + wrF * 0.07,
        t[1] * 0.93 + wrL * 0.07,
        t[2] * 0.93 + wrZ * 0.07,
      );
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // Covert shingles: two short arcs seating the wing on the body.
    ctx.strokeStyle = shade(base, -8);
    ctx.lineWidth = Math.max(1.1, s * 0.018);
    for (let r = 0; r < 2; r++) {
      const t0 = 0.2 + r * 0.16;
      const a = P(
        shF + (wrF - shF) * t0,
        shL + (wrL - shL) * t0 * 0.9,
        shZ + (wrZ - shZ) * t0 - 0.02,
      );
      const b = P(
        rootF * (0.4 + r * 0.2) + shF * (0.6 - r * 0.2),
        shL + (rootL - shL) * (0.3 + r * 0.2),
        shZ * 0.7 + rootZ * 0.3 - 0.01,
      );
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  // The leading arm — the wing's bone line, shoulder to wingtip.
  ctx.strokeStyle = boneInk;
  ctx.lineWidth = Math.max(1.5, s * 0.042);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(pw[0], pw[1]);
  const lead = tips[0]!;
  const pl = P(lead[0], lead[1], lead[2]);
  ctx.lineTo(pl[0], pl[1]);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // THE DOWNWASH: right after the power stroke bottoms out, pale air
  // falls away beneath the outer primaries — brief slanting streaks
  // that sink and fade as the window closes. The whoosh, drawn.
  const gust = o.gust ?? 0;
  if (gust > 0.03 && !o.hurt) {
    const fall = (1 - gust) * 0.3;
    ctx.strokeStyle = `rgba(238, 234, 218, ${(0.3 * gust).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.4, s * 0.032);
    ctx.lineCap = 'round';
    for (const k of [0, 2]) {
      const t = tips[k]!;
      const a = P(t[0] - 0.03, t[1] * 1.01, t[2] - 0.08 - fall);
      const b = P(t[0] - 0.16, t[1] * 1.07, t[2] - 0.22 - fall * 1.3);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}

/**
 * The owl body: the upright keg — a tall block-prism (the wall-prism
 * dialect stood on end) under a lit shoulder dome, the folded wings
 * drawn as darker saddle panels meeting in a spine seam, the pale
 * breast keel barred in seeded chevron rows, primary steps ticking
 * the low flanks toward the tail. The attack telegraph MANTLES:
 * wings rise and spread through the windup — the threat bloom that
 * doubles the owl on screen — then snap down-forward with the strike.
 */
export function paintOwlBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: OwlLook,
  f: BeastBlockFrame,
  attackT = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const s = f.s;
  // Keg footprint: broad through the wing butts, easing at both ends.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.62],
    [hl, hw * 0.62],
    [hl * 0.42, hw],
    [-hl * 0.48, hw * 0.94],
    [-hl, hw * 0.6],
    [-hl, -hw * 0.6],
    [-hl * 0.48, -hw * 0.94],
    [hl * 0.42, -hw],
  ];
  // Parliament variance: each owl's mantle sits a step off its
  // cluster tone — a wing of owls reads as kin, never as stamps.
  const coat = shade(look.mantle, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The shoulder dome: highest over the wing butts, easing into the
    // chest front, dropping harder into the tail root.
    (X) =>
      look.backH -
      0.09 * Math.max(0, X / hl - 0.2) -
      0.07 * Math.max(0, (-X / hl - 0.4) / 0.6),
    // Deep keel chest; the stern lifts for tail clearance.
    (X) =>
      look.bellyH -
      0.04 * Math.max(0, X / hl - 0.2) +
      0.05 * Math.max(0, (-X / hl - 0.4) / 0.6),
    coat,
    (gx, gyy, lift) => {
      const tk = f.topScale ?? 1;
      const bodyA = Math.atan2(f.fy * f.ys, f.fx);
      // Folded wing panels: one long saddle blob per side, a shade
      // darker than the mantle — the closed wings ARE the back.
      for (const es of [-1, 1]) {
        ctx.save();
        ctx.translate(
          gx(-hl * 0.08, es * hw * 0.42),
          gyy(-hl * 0.08, es * hw * 0.42) - look.backH * tk * s * 0.88 - lift,
        );
        ctx.rotate(bodyA);
        ctx.fillStyle = shade(coat, -9);
        ctx.beginPath();
        facetBlob(
          ctx,
          0,
          0,
          hl * s * 0.78,
          (f.seed ^ (es * 0x2f)) | 1,
          9,
          (hw * 0.62) / (hl * 0.78),
          0.35,
        );
        ctx.fill();
        ctx.restore();
      }
      // Primary steps: folded flight feathers ticking the low flanks,
      // converging on the tail root — three hard strokes per side.
      if (!f.hurt) {
        ctx.strokeStyle = shade(coat, -18);
        ctx.lineWidth = Math.max(1.2, s * 0.02);
        ctx.lineCap = 'round';
        for (const es of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const X0 = -hl * (0.1 + 0.24 * k);
            ctx.beginPath();
            ctx.moveTo(
              gx(X0, es * hw * (0.82 - 0.1 * k)),
              gyy(X0, es * hw * (0.82 - 0.1 * k)) - (look.bellyH + 0.12) * s - lift,
            );
            ctx.lineTo(
              gx(X0 - hl * 0.32, es * hw * (0.52 - 0.1 * k)),
              gyy(X0 - hl * 0.32, es * hw * (0.52 - 0.1 * k)) - (look.bellyH + 0.07) * s - lift,
            );
            ctx.stroke();
          }
        }
        ctx.lineCap = 'butt';
      }
      // The breast keel: a pale bib on the camera side of the chest,
      // BARRED in seeded chevron rows — painted only while the chest
      // can actually face the camera (the wolf-bib law: flat paint
      // shows through the back when the body walks away).
      if (f.fy > -0.15) {
        const bibX = gx(hl * 0.72, 0);
        const bibY =
          gyy(hl * 0.72, 0) -
          (look.bellyH + (look.backH - look.bellyH) * 0.42) * s -
          lift;
        ctx.fillStyle = f.hurt ? '#ffffff' : look.breast;
        ctx.beginPath();
        facetBlob(ctx, bibX, bibY, hw * s * 1.0, f.seed ^ 0x51, 8, 1.5, 1.6);
        ctx.fill();
        if (!f.hurt) {
          ctx.strokeStyle = look.bar;
          ctx.lineWidth = Math.max(1.1, s * 0.016);
          ctx.lineCap = 'round';
          for (let rIdx = 0; rIdx < 3; rIdx++) {
            // Seeded phase: no two owls wear the same bars.
            const ph = (((f.seed >>> (rIdx * 2)) & 3) - 1.5) * hw * s * 0.09;
            const rw = hw * s * (0.62 - rIdx * 0.13);
            const ry = bibY + (rIdx - 0.9) * hw * s * 0.42;
            ctx.beginPath();
            ctx.moveTo(bibX - rw + ph, ry - hw * s * 0.06);
            ctx.lineTo(bibX + ph, ry + hw * s * 0.08);
            ctx.lineTo(bibX + rw + ph, ry - hw * s * 0.06);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
      // Spine seam from behind: the closed wings MEET — one dark part
      // line down the back, only when the rump faces the camera.
      if (f.fy < -0.2 && !f.hurt) {
        ctx.strokeStyle = shade(coat, -16);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(gx(hl * 0.3, 0), gyy(hl * 0.3, 0) - look.backH * tk * s * 0.98 - lift);
        ctx.lineTo(gx(-hl * 0.85, 0), gyy(-hl * 0.85, 0) - look.backH * tk * s * 0.62 - lift);
        ctx.stroke();
      }
    },
  );
  // THE MANTLE: only a live, standing body blooms — corpses pass a
  // collapsed topScale and never reach here with an attack running.
  if (attackT > 0 && (f.topScale ?? 1) === 1) {
    const wind = Math.min(1, attackT / 0.7);
    const strike =
      attackT > 0.7 ? Math.sin(Math.PI * Math.min(1, (attackT - 0.7) / 0.3)) : 0;
    // Windup lifts the wings high (pale undersides out); the strike
    // snaps them down-forward past level. Body-space wings: the
    // mantle blooms around the BODY's facing at every camera band.
    const raise = 0.95 * wind - 1.3 * strike;
    const spread = Math.min(1, wind * 1.15);
    const mpx = -f.fy;
    const mpy = f.fx;
    const MP = (F: number, L: number, Z: number): [number, number] => [
      f.bx + (f.fx * F + mpx * L) * s,
      f.gy - f.bob * 0.35 * s + (f.fy * F + mpy * L) * f.ys * s - (Z + look.backH * 0.45) * s,
    ];
    for (const es of [-1, 1]) {
      owlWingBroad(ctx, look, {
        P: MP,
        es,
        s,
        raise,
        spread,
        sweepK: 0.25 + 0.75 * strike,
        span: look.wingSpan,
        under: raise > 0.3,
        hurt: f.hurt,
        seed: f.seed,
      });
    }
  }
}

/**
 * The owl head, drawn in its own frame with its OWN facing — the
 * swivel means the gaze rarely matches the body line. Reads owl by
 * silhouette alone: the horned tufts, the broad low dome, and THE
 * FACIAL DISC — two rimmed lobes carrying both eyes FORWARD, thinning
 * to a crescent at profile and gone entirely from behind (no face on
 * a backskull, ever). The elder's disc ring is doubled and its crown
 * wears frost.
 */
export function drawOwlHead(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    x: number;
    y: number;
    s: number;
    /** HEAD facing (post-swivel), not the body's. */
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 beak gape through the strike — the elder's scream. */
    screech?: number;
    /** 0..1 slow two-beat blink. */
    blink?: number;
    seed?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const screech = o.dead ? 0 : (o.screech ?? 0);
  const profileK = faceProfileK(fx);

  // Ear tufts on the crown — the horned silhouette. A fore/aft
  // stagger keeps the pair from collapsing to one sliver at profile
  // (the paired-gear law); the screech pins them low and flat.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.09;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.09) * ys - h * 0.42;
    const pin = screech * 0.55;
    const reach = Math.max(h * 0.2, look.tuftLen * s * (1 - 0.4 * pin));
    const tx = bxr + px * es * w * 0.2;
    const ty = byr - reach - fy * w * 0.06 * pin * ys;
    ctx.fillStyle = C(shade(look.mantle, -7));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.14, byr + h * 0.08);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.16, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    // Frost tips the elder's crest — the crown it grew, not one it took.
    if (look.elder && !o.hurt) {
      ctx.strokeStyle = look.breast;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(bxr + (tx - bxr) * 0.7, byr + (ty - byr) * 0.7);
      ctx.lineTo(bxr + (tx - bxr) * 0.9, byr + (ty - byr) * 0.9);
      ctx.stroke();
    }
  }

  // Skull dome — broad and low, wider than tall. The crown catches
  // the light: a round head still shows the camera its cap (the
  // top-plane law).
  ctx.fillStyle = C(look.mantle);
  ctx.beginPath();
  facetCircle(ctx, cx, cy, w * 0.56, 7, fx * 0.4 - Math.PI / 2, (h * 0.82) / (w * 0.56));
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    facetCircle(ctx, cx, cy, w * 0.56, 7, fx * 0.4 - Math.PI / 2, (h * 0.82) / (w * 0.56));
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fillRect(cx - w * 0.58, cy - h * 0.52, w * 1.16, h * 0.24);
    ctx.restore();
  }

  // THE FACIAL DISC — only while the face can meet the camera.
  if (fy > -0.38) {
    const dcx = cx + fx * w * 0.16;
    const dcy = cy + fy * w * 0.14 * ys + h * 0.03;
    const lobeR = w * 0.3 * (1 - 0.3 * profileK);
    for (const es of [-1, 1]) {
      // The far lobe hides as the head goes profile.
      if (profileK > 0.55 && es * py < 0) continue;
      const lx = dcx + px * es * w * 0.21 * (1 - 0.45 * profileK) + fx * es * w * 0.02;
      const ly = dcy + py * es * w * 0.21 * (1 - 0.45 * profileK) * ys;
      ctx.fillStyle = C(look.disc);
      ctx.beginPath();
      facetCircle(ctx, lx, ly, lobeR, 7, es * 0.35 + fx * 0.3, 1.06);
      ctx.fill();
      if (!o.hurt) {
        // The rim ring — and the elder's SECOND ring inside it.
        ctx.strokeStyle = look.discRim;
        ctx.lineWidth = Math.max(1.2, s * 0.02);
        ctx.beginPath();
        facetCircle(ctx, lx, ly, lobeR * 0.95, 7, es * 0.35 + fx * 0.3, 1.06);
        ctx.stroke();
        // The second ring only while both lobes read — at profile it
        // stacked into goggle circles on one lobe (harness-audited).
        if (look.elder && profileK < 0.55) {
          ctx.strokeStyle = shade(look.discRim, 26);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          facetCircle(ctx, lx, ly, lobeR * 0.72, 7, es * 0.35 - fx * 0.2, 1.06);
          ctx.stroke();
        }
      }
      if (!o.dead) {
        // The eye: pulled INWARD toward the beak (owl eyes crowd the
        // center of the disc — dead-center lobes read as goggles) and
        // set a touch along the facing so the pair aims where the head
        // points. The strike narrows the pupil to a hunting pin.
        const er = lobeR * 0.37;
        const ex = lx - px * es * lobeR * 0.24 + fx * lobeR * 0.08;
        const ey = ly + fy * lobeR * 0.06 * ys;
        ctx.fillStyle = C(look.eye);
        ctx.beginPath();
        facetCircle(ctx, ex, ey, er, 6, fx * 0.5);
        ctx.fill();
        if (!o.hurt) {
          // Round pupil, offset along the gaze — a directed stare,
          // never the flat cartoon square.
          // The pupil OWNS the lamp: a thin amber ring around a deep
          // black center reads raptor; a wide iris reads plush toy.
          const pr = er * 0.62 * (1 - 0.35 * screech);
          const ppx = ex + fx * er * 0.1;
          const ppy = ey + fy * er * 0.08 * ys;
          ctx.fillStyle = OUTLINE;
          ctx.beginPath();
          facetCircle(ctx, ppx, ppy, pr, 6, fx * 0.3);
          ctx.fill();
          // One small glint, up-INNER on each lobe (mirrored — a
          // same-side pair reads walleyed) — the lamp's live point.
          ctx.fillStyle = '#fff7e0';
          ctx.beginPath();
          facetCircle(ctx, ex - px * es * er * 0.3, ey - er * 0.34, er * 0.13, 5, 0.4);
          ctx.fill();
          // The slow blink: a disc-toned lid dropping over the lamp.
          const blink = o.blink ?? 0;
          if (blink > 0.05) {
            ctx.fillStyle = look.disc;
            ctx.fillRect(ex - er * 1.05, ey - er * 1.05, er * 2.1, er * 2.1 * Math.min(1, blink));
          }
          // THE BROW RIDGE: a hard slanted ledge over each eye, high
          // at the center of the face and cutting down-outward — the
          // one stroke that turns a staring toy into a raptor. The
          // elder's ledge is heavier: the court's scowl.
          ctx.strokeStyle = C(shade(look.discRim, -8));
          ctx.lineWidth = Math.max(1.6, s * (look.elder ? 0.04 : 0.031));
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - px * es * er * 0.8, ey - er * (1.3 + 0.12 * screech));
          ctx.lineTo(ex + px * es * er * 0.95, ey - er * (0.85 - 0.12 * screech));
          ctx.stroke();
          ctx.lineCap = 'butt';
        }
      } else {
        // Dead: the lamps are out — a shut-line across each lobe.
        ctx.strokeStyle = C(look.discRim);
        ctx.lineWidth = Math.max(1.2, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(lx - lobeR * 0.4, ly);
        ctx.lineTo(lx + lobeR * 0.4, ly + lobeR * 0.08);
        ctx.stroke();
      }
    }
    // The beak: a small dark hook seated between the lobes, pulled
    // back so it overlaps the disc instead of floating at profile.
    if (fy > -0.2) {
      // An owl's beak TUCKS UNDER the disc: full presence only on the
      // frontal face, shrinking to a small leading-edge hook as the
      // head turns — the disc owns the profile silhouette.
      const bkx = dcx + fx * w * (0.18 - 0.05 * profileK);
      const bky = dcy + fy * w * 0.1 * ys + h * (0.2 - 0.02 * profileK);
      const bw = w * 0.08 * (1 - 0.55 * profileK);
      ctx.fillStyle = C(look.horn);
      ctx.beginPath();
      ctx.moveTo(bkx - px * bw - fx * w * 0.03 * profileK, bky - h * 0.05);
      ctx.lineTo(bkx + px * bw + fx * w * 0.01 * profileK, bky - h * (0.05 - 0.02 * profileK));
      ctx.lineTo(
        bkx + fx * w * (0.04 + 0.05 * profileK),
        bky + h * (0.22 - 0.1 * profileK + 0.06 * screech),
      );
      ctx.closePath();
      ctx.fill();
      if (screech > 0.15 && !o.hurt && !o.dead) {
        // The scream: the lower mandible drops, dark gape under it.
        ctx.fillStyle = '#2a1420';
        ctx.beginPath();
        ctx.moveTo(bkx - px * w * 0.05, bky + h * 0.08);
        ctx.lineTo(bkx + px * w * 0.05, bky + h * 0.08);
        ctx.lineTo(bkx + fx * w * 0.03, bky + h * (0.1 + 0.16 * screech));
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

/** Flight ceiling per rank (tiles over the ground anchor): the elder
 *  rides higher — rank you can read from across the glade. */
export function owlHoverHeight(look: OwlLook): number {
  return look.elder ? 1.18 : 0.98;
}

/** Shortest-arc angle blend — the flare-to-cruise pitch never takes
 *  the long way around the circle. */
function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * THE WINGBEAT — one smooth analytic curve, asymmetric by
 * construction and continuous to every derivative (the last version's
 * piecewise shape carried a velocity kink at the stroke bottom that
 * read as a frame skip). A phase-locked two-harmonic carriage gives
 * the bird stroke for free: a breath of overswing at the top, a
 * short accelerating POWER stroke down (~36% of the period), and a
 * long decelerating recovery. Everything else derives smoothly from
 * the same curve: HAND trails the arm by phase, POWER and RECOVER are
 * smoothstepped velocity windows (tip flex, wrist row, spread fold,
 * body surge all ride them), and the GUST window follows the lagged
 * velocity peak — the downwash lands just past the bottom.
 */
function owlBeat(u: number): {
  arm: number;
  hand: number;
  power: number;
  recover: number;
  gust: number;
} {
  const TAU = Math.PI * 2;
  const f = (p: number): number => Math.cos(TAU * p) + 0.26 * Math.sin(2 * TAU * p);
  const fp = (p: number): number =>
    -TAU * Math.sin(TAU * p) + 0.52 * TAU * Math.cos(2 * TAU * p);
  const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const NORM = 1.11;
  const VN = TAU * 1.3;
  const vel = -fp(u) / VN; // + = the wing sweeping DOWN
  const velLag = -fp(u - 0.055) / VN;
  return {
    arm: f(u) / NORM,
    hand: f(u - 0.07) / NORM,
    power: sm((vel - 0.15) / 0.85),
    recover: sm((-vel - 0.15) / 0.85),
    gust: sm((velLag - 0.5) / 0.5),
  };
}

/**
 * THE PARLIAMENT FLIES: the great owl's one body painter, air-blended.
 *
 * `air` = 0 is the ROOST — the standing keg settled into a low squat
 * over its own talons, breathing, ruffling on a long clock, head
 * sweeping the glade. `air` = 1 is CRUISE — a leveled-out flier at
 * hover height: slow deep wingbeats broken by seeded glides, a
 * wingbeat-coupled bob, a fanned steering tail, talons tucked. The
 * band between is the LANDING FLARE birds actually fly: body swinging
 * upright, wings wide and braking, talons reaching for the ground —
 * which is exactly the silhouette the roost opens from, so the
 * composition swap hides inside the flare.
 *
 * Banking rolls the body, wings and tail into the turn while the head
 * holds level — the owl's famous gimbal, and the detail that sells
 * the whole bird. The pounce telegraph is a true SWOOP: the windup
 * brakes and mantles high (pale undersides flashing), the strike is a
 * silent dive with both talons thrown forward.
 */
export function drawGreatOwl(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: OwlLook,
  o: {
    /** Ground anchor on screen (terrain-lifted) — where the shadow lives. */
    x: number;
    y: number;
    s: number;
    dir: number;
    ys: number;
    /** 0 = perched on the roost, 1 = full cruise height. */
    air: number;
    /** Smoothed 0..1 travel activity — glides only open mid-travel. */
    moveK: number;
    /** Signed body roll from turning — the banking lean (radians). */
    bank?: number;
    attackT?: number;
    hurt?: boolean;
    nowMs: number;
    seed: number;
    /** Keeper's strap for a tamed companion — worn gear, never a dye. */
    collar?: string;
  },
): void {
  const s = o.s;
  const ys = o.ys;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const at = o.attackT ?? 0;
  const now = o.nowMs;
  const seed = o.seed;
  const air = Math.min(1, Math.max(0, o.air));
  const hl = spec.bodyLen * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // ---------------------------------------------------------- flight
  // THE BODY-SPACE FLIER: every part lives in owl-local coordinates —
  // F forward along the facing, L lateral to starboard, Z up — and
  // projects through the ONE lens below. Eight facings foreshorten
  // one mass instead of restating it: a profile bird is long with a
  // near wing crossing its body, a bird flying away is compact under
  // two wings seen from above, and the tail always trails the LINE
  // OF FLIGHT (never the bottom of the screen).
  // AN OWL NEVER SITS: every value of `air` is airborne — it scales
  // altitude only (0 = a low hold just over the grass, 1 = cruise
  // height), and the composition is always the flier.
  // THE HOVER: an idle owl doesn't land — it stands on the air.
  // hoverK pitches the body up into the watch, slows and deepens the
  // beat, fans the tail for balance, and lets the whole bird breathe
  // on the column and drift a feather's width side to side.
  const hoverK = (1 - Math.min(1, o.moveK * 1.35)) * (at > 0 ? 0 : 1);
  // Pitch: 1 = leveled-out cruise; the hover carries the body ~40%
  // toward upright — a watcher treading air, not a landing flare.
  const pitchK = 1 - 0.4 * hoverK;
  // The elder beats a slower, heavier wing — mass you can hear; the
  // hover slows either bird's tempo further still.
  const flapF = (look.elder ? 0.0066 : 0.0082) * (1 - 0.24 * hoverK);
  // Seeded glide gate: only a leveled, traveling, peaceful bird locks
  // its wings out — the beat-beat-glide rhythm real owls cruise on.
  const gwave = Math.sin(now * 0.00042 + seed * 1.13);
  const glideK =
    hoverK < 0.05 && at === 0
      ? Math.min(1, Math.max(0, (gwave - 0.15) / 0.35)) * Math.min(1, o.moveK * 1.6)
      : 0;
  const beatK = 1 - glideK;
  const B = owlBeat((now * flapF) / (Math.PI * 2) + seed * 0.7);
  // Wing carriage: the beat swings around a working height — the
  // hover works higher and deeper; a glide holds the blades level
  // with only a feather flutter.
  const carriage =
    (0.14 + 0.3 * hoverK) * beatK + (0.05 + Math.sin(now * 0.0036 + seed) * 0.04) * glideK;
  const beatAmp = (0.5 + 0.3 * hoverK) * beatK;
  let raise = carriage + B.arm * beatAmp;
  // The hand trails the arm and overswings — the tip whip that turns
  // two levers into one living wing.
  let raiseHand = carriage + B.hand * beatAmp * 1.18;
  // Primaries bend up under the POWER stroke, droop through recovery.
  let flex = (B.power * 0.5 - B.recover * 0.32) * beatK;
  // The whole wing rows: forward through the power, back on recovery.
  let swing = (B.power - B.recover) * 0.06 * beatK;
  let spread = Math.min(1, 0.96 - 0.2 * B.recover * beatK + 0.04 * glideK);
  let sweepK = 0.5 + 0.25 * glideK + 0.3 * (1 - spread);
  let gustK = B.gust * beatK * Math.min(1, o.moveK * 0.55 + 0.55);
  // The body hangs off the wingbeat: it SURGES on the power stroke
  // and settles through the recovery — thrust you can see. The hover
  // adds the long breath of the column and a feather-width drift.
  let lift =
    owlHoverHeight(look) * s * (0.55 + 0.45 * air) +
    (B.power * 0.055 - B.recover * 0.022) * s * beatK +
    Math.sin(now * 0.0036 + seed) * 0.012 * s * glideK +
    Math.sin(now * 0.00105 + seed * 2.1) * 0.055 * s * hoverK;
  const driftA = Math.sin(now * 0.00068 + seed * 1.4) * 0.055 * hoverK;
  let lungeX = 0;
  let lungeY = 0;
  // Gear stays TUCKED in every peaceful state — cruise, glide, and
  // hover alike; only the strike drops and opens the talons.
  let talonK = 0;
  let under = raise > 0.4;
  if (at > 0) {
    const quiet = Math.min(1, at * 3);
    flex *= 1 - quiet;
    swing *= 1 - quiet;
    gustK *= 1 - quiet;
    if (at < 0.7) {
      // The windup: brake, climb a hand's width, mantle HIGH — the
      // pale underwing flash every prey animal understands.
      const w = at / 0.7;
      lift += 0.12 * s * w;
      raise += (1.05 - raise) * w;
      raiseHand += (1.1 - raiseHand) * w;
      spread = Math.min(1, spread + w * 0.3);
      sweepK = sweepK + (0.22 - sweepK) * w;
      talonK = Math.max(talonK, w);
      under = true;
    } else {
      // The strike: the silent dive — wings swept back past level,
      // both talons thrown forward, the whole mass falling along the
      // facing.
      const k = Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
      lungeX = fx * 0.45 * k * s;
      lungeY = fy * 0.45 * k * s * ys;
      lift -= 0.32 * s * k;
      raise += (-0.42 - raise) * k;
      raiseHand += (-0.5 - raiseHand) * k;
      spread += (0.8 - spread) * k;
      sweepK = sweepK + (1 - sweepK) * k;
      talonK = 1;
      under = false;
    }
  }
  const bcx = o.x + lungeX + px * driftA * s;
  const bcy = o.y + lungeY + py * driftA * s * ys - lift;
  // THE GIMBAL: the bank rolls the whole projected bird around its
  // center — wings, body, tail — while the head, painted last and
  // level, holds the horizon. The owl's famous trick.
  const roll = (o.bank ?? 0) * pitchK * 0.6;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  /** The one lens: body space (F, L, Z in tiles) → screen. */
  const P = (F: number, L: number, Z: number): [number, number] => {
    const wx = (fx * F + px * L) * s;
    const wy = (fy * F + py * L) * ys * s - Z * s;
    return [bcx + wx * cosR - wy * sinR, bcy + wx * sinR + wy * cosR];
  };
  const coat = C(shade(look.mantle, (((seed >>> 5) & 7) - 3) * 2));

  // The fuselage endpoints: an upright keg in the flare pitching down
  // into a level, head-led body in cruise.
  const noseF = 0.42 * pitchK * (1 + 0.28 * (spec.bodyLen - 0.55));
  const rearF = 0.55 * pitchK * (1 + 0.28 * (spec.bodyLen - 0.55));
  const noseZ = 0.34 * (1 - pitchK);
  const rearZ = -0.3 * (1 - pitchK);

  const drawTail = (): void => {
    // The steering fan: rooted at the vent, trailing the flight line,
    // spreading to brake in the flare and tipping into the bank; a
    // slight droop keeps it reading below the body plane.
    const tSpread =
      0.5 + 0.55 * (1 - pitchK) + Math.min(0.5, Math.abs(o.bank ?? 0)) * 0.5 + (at >= 0.7 ? 0.3 : 0);
    const tLen = look.tailLen * (1.05 + 0.25 * (1 - pitchK));
    const rootF = -rearF - 0.06;
    const rootZ = rearZ + 0.02;
    const TN = 5;
    const tip = (k: number): [number, number, number] => {
      const u = k / (TN - 1) - 0.5;
      const ln = tLen * (1 - 0.3 * Math.abs(u) * 2);
      return [
        rootF - Math.cos(u * tSpread) * ln * pitchK - (1 - pitchK) * ln * 0.25,
        Math.sin(u * tSpread) * ln,
        rootZ - 0.12 * (1 - Math.abs(u)) - (1 - pitchK) * ln * 0.75,
      ];
    };
    ctx.fillStyle = C(shade(look.mantle, -6));
    ctx.beginPath();
    const r0 = P(rootF, 0, rootZ);
    ctx.moveTo(r0[0], r0[1]);
    for (let k = 0; k < TN; k++) {
      const tp = tip(k);
      const pp = P(tp[0], tp[1], tp[2]);
      ctx.lineTo(pp[0], pp[1]);
      if (k < TN - 1) {
        const a = tip(k);
        const b = tip(k + 1);
        const pn = P(
          a[0] * 0.41 + b[0] * 0.41 + rootF * 0.18,
          a[1] * 0.41 + b[1] * 0.41,
          a[2] * 0.41 + b[2] * 0.41 + rootZ * 0.18,
        );
        ctx.lineTo(pn[0], pn[1]);
      }
    }
    ctx.closePath();
    ctx.fill();
    if (!o.hurt) {
      // Bar bands ticking the tail tips.
      ctx.strokeStyle = look.bar;
      ctx.lineWidth = Math.max(1.2, s * 0.02);
      ctx.lineCap = 'round';
      for (let k = 0; k < TN; k++) {
        const tp = tip(k);
        const a = P(
          tp[0] * 0.8 + rootF * 0.2,
          tp[1] * 0.8,
          tp[2] * 0.8 + rootZ * 0.2,
        );
        const b = P(
          tp[0] * 0.92 + rootF * 0.08,
          tp[1] * 0.92,
          tp[2] * 0.92 + rootZ * 0.08,
        );
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  };

  const drawWing = (es: number): void =>
    owlWingBroad(ctx, look, {
      P,
      es,
      s,
      raise,
      raiseHand,
      flex,
      swing,
      gust: gustK,
      spread,
      sweepK,
      span: look.wingSpan,
      under,
      hurt: o.hurt,
      seed,
    });

  const drawBody = (): void => {
    // One streamlined mass between nose and vent — foreshortened by
    // the projection itself, so a bird flying at the camera is a
    // compact chest and a profile bird is a long hull.
    const pN = P(noseF, 0, noseZ);
    const pV = P(-rearF, 0, rearZ);
    const mx = (pN[0] + pV[0]) / 2;
    const my = (pN[1] + pV[1]) / 2;
    const ax = Math.atan2(pV[1] - pN[1], pV[0] - pN[0]);
    const half = Math.max(
      Math.hypot(pV[0] - pN[0], pV[1] - pN[1]) / 2 + look.bodyW * 0.55 * s,
      look.bodyW * 1.05 * s,
    );
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ax);
    ctx.fillStyle = coat;
    ctx.beginPath();
    facetBlob(ctx, 0, 0, half, seed | 1, 9, (look.bodyW * 1.0 * s) / half, 0.35);
    ctx.fill();
    if (!o.hurt) {
      ctx.beginPath();
      facetBlob(ctx, 0, 0, half, seed | 1, 9, (look.bodyW * 1.0 * s) / half, 0.35);
      ctx.clip();
      ctx.rotate(-ax);
      // The pale keel: the under-half of the hull in breast tone —
      // strongest flying at the camera, gone flying away.
      const keelK = Math.max(0, Math.min(1, 0.55 + fy * 0.7));
      if (keelK > 0.05) {
        ctx.globalAlpha = keelK;
        ctx.fillStyle = shade(look.breast, -3);
        ctx.fillRect(-half * 1.4, look.bodyW * 0.12 * s, half * 2.8, half * 2.4);
        ctx.globalAlpha = 1;
        // Barred keel rows when the chest truly faces the camera.
        if (fy > 0.25) {
          ctx.strokeStyle = look.bar;
          ctx.lineWidth = Math.max(1.1, s * 0.016);
          ctx.lineCap = 'round';
          for (let rIdx = 0; rIdx < 2; rIdx++) {
            const ph = (((seed >>> (rIdx * 2)) & 3) - 1.5) * s * 0.02;
            const rw = look.bodyW * s * (0.5 - rIdx * 0.12);
            const ry = look.bodyW * s * (0.34 + rIdx * 0.22);
            ctx.beginPath();
            ctx.moveTo(ph - rw, ry - s * 0.028);
            ctx.lineTo(ph, ry + s * 0.028);
            ctx.lineTo(ph + rw, ry - s * 0.028);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
      // The sunlit top rim — the camera always reads the back plane.
      ctx.fillStyle = 'rgba(255, 244, 220, 0.13)';
      ctx.rotate(ax);
      ctx.fillRect(-half, -look.bodyW * 1.0 * s, half * 2, look.bodyW * 0.3 * s);
    }
    ctx.restore();
  };

  const drawTalons = (): void => {
    // Tucked flat under the vent in cruise; the flare drops them and
    // the strike throws both forward, claws open.
    const shankInk = C(shade(spec.legColor ?? look.mantle, -20));
    const clawInk = C(shade(spec.legColor ?? look.mantle, -50));
    // Fully tucked gear disappears into the belly feathers — a
    // cruising owl shows NO legs at all.
    if (talonK < 0.15 && at === 0) return;
    ctx.lineCap = 'round';
    for (const es of [-1, 1]) {
      // Owl gear is SHORT: feathered shanks barely clear the belly,
      // and the strike punches both feet forward under the chest —
      // never a wader's dangle.
      const hipF = at >= 0.7 ? 0.05 : -rearF * 0.3;
      const hipL = es * look.bodyW * 0.42;
      const hipZ = -look.bodyW * 0.48;
      const footF =
        hipF + (at >= 0.7 ? 0.4 * talonK : talonK * 0.1 - (1 - talonK) * 0.12);
      const footZ = hipZ - (0.05 + 0.16 * talonK) + (at >= 0.7 ? 0.08 : 0);
      const a = P(hipF, hipL, hipZ);
      const b = P(footF, hipL * 1.15, footZ);
      ctx.strokeStyle = shankInk;
      ctx.lineWidth = Math.max(2, spec.legW * s * 0.95);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      if (talonK > 0.25) {
        ctx.strokeStyle = clawInk;
        ctx.lineWidth = Math.max(1.3, spec.legW * s * 0.5);
        for (const ta of [-1, 0, 1]) {
          const c = P(
            footF + (at >= 0.7 ? 0.1 : 0.03) * talonK + ta * 0.02,
            hipL * 1.15 + es * ta * 0.045 * talonK,
            footZ - 0.07 * talonK,
          );
          ctx.beginPath();
          ctx.moveTo(b[0], b[1]);
          ctx.lineTo(c[0], c[1]);
          ctx.stroke();
        }
      }
    }
    ctx.lineCap = 'butt';
  };

  const drawHead = (): void => {
    // The head — LAST and LEVEL: the gimbal. Its position rides the
    // bank with the body; its art never rolls. In cruise the gaze
    // locks near the line of flight; a hover frees the slow sweep;
    // a telegraph snaps it dead ahead and screams through the strike.
    const hp = P(noseF + look.headW * 0.5 * pitchK, 0, noseZ + look.headH * (0.75 - 0.25 * pitchK));
    const gazeAmp = 0.25 + 0.55 * (1 - Math.min(1, o.moveK * 1.3));
    const hdir =
      o.dir + (at > 0 ? 0 : (now > 0 ? Math.sin(now * 0.00037 + seed * 0.83) : 0) * gazeAmp);
    const blink =
      now > 0 && at === 0 ? Math.max(0, Math.sin(now * 0.0009 + seed * 1.7) - 0.975) / 0.025 : 0;
    // The neck ruff: a wedge seating the head on the hull — no
    // floating skull, whatever the pitch.
    if (!o.hurt) {
      const r0 = P(noseF * 0.72, 0, noseZ * 0.8 + 0.05);
      ctx.fillStyle = shade(look.mantle, -4);
      ctx.beginPath();
      facetCircle(ctx, r0[0], r0[1], look.headW * s * 0.42, 7, seed * 0.3, 0.8);
      ctx.fill();
    }
    drawOwlHead(ctx, look, {
      x: hp[0],
      y: hp[1],
      s,
      fx: Math.cos(hdir),
      fy: Math.sin(hdir),
      ys,
      hurt: o.hurt,
      screech: at > 0.55 ? Math.min(1, (at - 0.55) / 0.3) : 0,
      blink,
      seed,
    });
  };

  // Assembly — painter's order from the facing: the far wing always
  // seats behind the hull, the near wing over it; the tail and head
  // swap ends as the bird turns through the camera line.
  const farEs = py < 0 ? 1 : py > 0 ? -1 : 1;
  if (fy >= -0.15) {
    drawTail();
    drawWing(farEs);
    drawBody();
    drawTalons();
    drawWing(-farEs);
    drawHead();
  } else {
    drawHead();
    drawWing(farEs);
    drawBody();
    drawTalons();
    drawTail();
    drawWing(-farEs);
  }
}

/**
 * The giant rat: a low hunched wedge — rump high and round, body
 * tapering into a pointed twitchy head with big dish ears, whiskers,
 * buck teeth and a long naked tail dragging an S behind it.
 */
export interface RatLook {
  fur: string;
  dorsal: string;
  belly: string;
  /** Naked skin — tail, nose, inner ear. */
  skin: string;
  earIn: string;
  bodyW: number;
  /** Height of the hunched rump peak. */
  humpH: number;
  headW: number;
  headH: number;
}

export const RAT_LOOK: RatLook = {
  fur: '#8a7a6a',
  dorsal: '#69594b',
  belly: '#b5a68f',
  skin: '#c9a68a',
  earIn: '#d8a396',
  bodyW: 0.2,
  humpH: 0.29,
  headW: 0.25,
  headH: 0.18,
};

export function paintRatBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: RatLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Teardrop footprint: full-width haunches, shoulders pinching in
  // where the head takes over.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.45],
    [hl, hw * 0.45],
    [hl * 0.2, hw * 0.85],
    [-hl * 0.5, hw],
    [-hl, hw * 0.55],
    [-hl, -hw * 0.55],
    [-hl * 0.5, -hw],
    [hl * 0.2, -hw * 0.85],
  ];
  const fur = shade(look.fur, (((f.seed >>> 7) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The hunched arch: peak over the haunches, falling away to the
    // shoulders — THE rat silhouette side-on.
    (X) => look.humpH - 0.05 * (X / hl + 0.35) * (X / hl + 0.35),
    (X) => 0.05 + 0.02 * Math.max(0, X / hl),
    fur,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Greasy dorsal stripe down the spine.
      ctx.save();
      ctx.translate(gx(-hl * 0.12, 0), gyy(-hl * 0.12, 0) - look.humpH * tk * s * 0.9 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.dorsal;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.78, f.seed | 1, 9, (hw * 0.62) / (hl * 0.78), 0.9);
      ctx.fill();
      ctx.restore();
    },
  );
}

/**
 * The rat head: pointed snout wedge off a small skull, dish ears
 * behind, beady eyes, whiskers and buck teeth. Muzzle and eyes obey
 * the same foreshortening laws as the cattle and wolf.
 */
export function drawRatHead(
  ctx: CanvasRenderingContext2D,
  look: RatLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** -1..1 fast whisker twitch, idle only. */
    twitch?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Big dish ears behind the skull, pink inside when they face us. A
  // touch of along-facing stagger keeps them apart at full profile.
  for (const es of [-1, 1]) {
    const exr = cx + px * es * w * 0.5 + fx * es * w * 0.07;
    const eyr = cy + (py * es * w * 0.5 + fy * es * w * 0.07) * ys - h * 0.42;
    ctx.fillStyle = C(shade(look.fur, -8));
    ctx.beginPath();
    facetCircle(ctx, exr, eyr, w * 0.36, 6, es * 0.4);
    ctx.fill();
    if (fy > -0.1 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      facetCircle(ctx, exr + fx * w * 0.04, eyr + fy * w * 0.04, w * 0.2, 6, es * 0.4);
      ctx.fill();
    }
  }

  // Small skull block — a step lighter than the body fur so the head
  // reads against the haunches at profile.
  ctx.fillStyle = C(shade(look.fur, 8));
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.24);
    ctx.fillStyle = C(look.belly);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
  }

  // Pointed snout — longer and narrower in profile, pink nose tip.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.1;
    const sl = w * (0.3 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.12;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.16 * (1 - profileK * 0.3);
    const ht = hb * 0.25;
    ctx.fillStyle = C(shade(look.fur, 8));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(look.skin);
    ctx.beginPath();
    facetCircle(ctx, tx, ty, w * 0.062, 5, fx);
    ctx.fill();
    // Buck teeth under the nose when the face shows.
    if (fy > 0.1 && !o.hurt && !o.dead) {
      ctx.fillStyle = '#efe9d8';
      ctx.fillRect(tx - w * 0.05, ty + h * 0.08, w * 0.044, h * 0.16);
      ctx.fillRect(tx + w * 0.008, ty + h * 0.08, w * 0.044, h * 0.16);
    }
    // Whiskers fanning back off the snout — the near side only once
    // the head goes full profile.
    if (!o.dead && !o.hurt) {
      ctx.strokeStyle = 'rgba(240, 236, 224, 0.7)';
      ctx.lineWidth = Math.max(0.8, s * 0.007);
      const wbx = bx0 + (axv / al) * sl * 0.55;
      const wby = by0 + (ayv / al) * sl * 0.55;
      const baseA = Math.atan2(ayv, axv);
      const tw = (o.twitch ?? 0) * 0.12;
      for (const es of [-1, 1]) {
        if (profileK > 0.75 && es * py < 0) continue;
        for (const k of [-1, 0, 1]) {
          const a = baseA + es * (1.5 - k * 0.3) + tw * es;
          ctx.beginPath();
          ctx.moveTo(wbx, wby);
          ctx.lineTo(wbx + Math.cos(a) * w * 0.52, wby + Math.sin(a) * w * 0.4);
          ctx.stroke();
        }
      }
    }
  }

  // Beady eyes at the snout root.
  if (!o.dead && fy > -0.45) {
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.16 + px * es * w * 0.27;
      const ey = cy + (fy * w * 0.16 + py * es * w * 0.27) * ys - h * 0.06;
      ctx.fillRect(ex - w * 0.05, ey - w * 0.05, w * 0.1, w * 0.1);
    }
  }
}

/**
 * The boar: a front-loaded battering wedge — massive shoulders under a
 * bristle crest, deep low-slung barrel, short muzzle ending in a flat
 * pink snout disc flanked by up-curved tusks.
 */
export interface BoarLook {
  hide: string;
  bristle: string;
  snout: string;
  tusk: string;
  earIn: string;
  bodyW: number;
  backH: number;
  /** Extra bristle-crest mass peaked over the shoulders. */
  crestH: number;
  chestH: number;
  headW: number;
  headH: number;
}

export const BOAR_LOOK: BoarLook = {
  hide: '#5c4a3a',
  bristle: '#33261c',
  snout: '#c99e86',
  tusk: '#efe9d8',
  earIn: '#2e2118',
  bodyW: 0.21,
  backH: 0.46,
  crestH: 0.09,
  chestH: 0.12,
  headW: 0.3,
  headH: 0.26,
};

export function paintBoarBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BoarLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Front-heavy footprint: chest and shoulders carry the width, the
  // rump pulls in — the wedge that reads "charges things".
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.75],
    [hl, hw * 0.75],
    [hl * 0.45, hw],
    [-hl * 0.5, hw * 0.88],
    [-hl, hw * 0.6],
    [-hl, -hw * 0.6],
    [-hl * 0.5, -hw * 0.88],
    [hl * 0.45, -hw],
  ];
  const hide = shade(look.hide, (((f.seed >>> 5) & 7) - 3) * 2);
  // The razorback line: tall over the withers, falling steadily to a
  // low rump — the sloped wedge IS the boar silhouette.
  const topH = (X: number): number => {
    const t = Math.min(1, Math.max(0, (X / hl + 1) / 1.45));
    return look.backH * (0.68 + 0.32 * t) - 0.04 * Math.max(0, (X / hl - 0.55) / 0.45);
  };
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    () => look.chestH,
    hide,
    (gx, gyy, lift) => {
      const s = f.s;
      // Grizzled flank band — a lighter dust along the lower barrel,
      // chest-side only so it never pastes onto the rump from behind.
      if (f.fy > -0.15) {
        ctx.fillStyle = shade(look.hide, 12);
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.3, 0),
          gyy(hl * 0.3, 0) - (look.chestH + 0.09) * s,
          hw * s * 0.72,
          f.seed ^ 0x55,
          7,
          0.8,
          1.5,
        );
        ctx.fill();
      }
    },
  );
  // The bristle crest: serrated spikes standing proud OF the spine —
  // painted after the body (the clip would eat anything above the
  // hull), tallest over the shoulders, dying out down the rump.
  const { bx, gy, s, fx, fy, ys } = f;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  ctx.fillStyle = f.hurt ? '#ffffff' : look.bristle;
  const spineAt = (X: number): { x: number; y: number } => ({
    x: bx + fx * X * s,
    y: gy + fy * X * ys * s - topH(X) * tk * s - lift,
  });
  const N = 6;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const X0 = hl * (0.58 - 1.12 * t);
    const X1 = X0 - hl * 0.14;
    const a = spineAt(X0);
    const b = spineAt(X1);
    const hgt = s * tk * (0.085 - 0.05 * t);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + s * 0.01);
    ctx.lineTo((a.x + b.x) / 2 - fx * s * 0.015, (a.y + b.y) / 2 - hgt);
    ctx.lineTo(b.x, b.y + s * 0.01);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The boar head: a short deep wedge with pinned-back ears, a stubby
 * muzzle ending in the flat SNOUT DISC (the pig read), and white tusk
 * chips hooking up from the jaw. `charge` lowers everything.
 */
export function drawBoarHead(
  ctx: CanvasRenderingContext2D,
  look: BoarLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the charge telegraph — ears pin, head drops. */
    charge?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const charge = o.charge ?? 0;

  // Small pointed ears swept back along the crest, staggered fore/aft
  // so profile keeps the pair readable.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.28 + fx * es * w * 0.08 - fx * w * 0.14;
    const byr = cy + (py * es * w * 0.28 + fy * es * w * 0.08) * ys - h * 0.42 - fy * w * 0.14 * ys;
    const pin = 0.35 + charge * 0.5;
    const tx = bxr - fx * w * 0.3 * pin + px * es * w * 0.1;
    const ty = byr - h * (0.55 - 0.25 * pin) - fy * w * 0.3 * pin * ys;
    ctx.fillStyle = C(look.bristle);
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.13, byr + h * 0.05);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.15, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  // Skull block — deep jaw, lit brow.
  ctx.fillStyle = C(look.hide);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = C(look.bristle);
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.1);
    ctx.restore();
  }

  // Stubby muzzle → snout disc, foreshortening with the facing.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.14;
    const sl = w * (0.26 + 0.24 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.06;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.22 * (1 - profileK * 0.2);
    const ht = hb * 0.8;
    ctx.fillStyle = C(shade(look.hide, 4));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Tusks hook UP and OUT from the jaw sides — big enough to read
    // as weapons, the far one hiding at profile. A dark gum seat keeps
    // the ivory from floating free of the jaw.
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const tbx = bx0 + nx * es * hb * 0.95 + (axv / al) * sl * 0.5;
      const tby = by0 + ny * es * hb * 0.95 + (ayv / al) * sl * 0.5 + h * 0.12;
      ctx.fillStyle = C(shade(look.hide, -16));
      ctx.beginPath();
      facetCircle(ctx, tbx, tby + h * 0.02, w * 0.045, 5, es);
      ctx.fill();
      ctx.fillStyle = C(look.tusk);
      ctx.beginPath();
      ctx.moveTo(tbx - w * 0.05, tby + h * 0.02);
      ctx.lineTo(tbx + nx * es * w * 0.1 - w * 0.008, tby - h * 0.42);
      ctx.lineTo(tbx + w * 0.05, tby + h * 0.04);
      ctx.closePath();
      ctx.fill();
    }
    // THE SNOUT DISC — flat pink pad seated on the tip, nostrils when
    // it faces the camera.
    ctx.fillStyle = C(look.snout);
    ctx.beginPath();
    facetCircle(
      ctx,
      tx - (axv / al) * w * 0.015,
      ty - (ayv / al) * w * 0.015,
      w * 0.135 * (1 - profileK * 0.35),
      6,
      fx,
      1 - profileK * 0.3,
    );
    ctx.fill();
    if (profileK < 0.55 && !o.hurt && !o.dead) {
      ctx.fillStyle = shade(look.snout, -38);
      for (const es of [-1, 1]) {
        ctx.fillRect(tx + nx * es * w * 0.05 - w * 0.017, ty - h * 0.03, w * 0.034, h * 0.08);
      }
    }
  }

  // Small dark eyes tight against the brow.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.28;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.28) * ys - h * 0.12;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.05, ey - h * 0.06, w * 0.1, h * 0.12);
    }
  }
}

/**
 * The giant spider: two block masses — a low cephalothorax carrying the
 * eye cluster and fang chips, a domed abdomen behind wearing pale
 * chevrons — slung between eight thin stalking legs. No head or tail
 * painter: the whole animal is the body.
 */
export interface SpiderLook {
  carapace: string;
  abdomen: string;
  mark: string;
  eye: string;
  fang: string;
  /** Abdomen half-width; the cephalothorax runs narrower. */
  bodyW: number;
  abdH: number;
  cephH: number;
}

export const SPIDER_LOOK: SpiderLook = {
  carapace: '#3a3244',
  abdomen: '#453a55',
  mark: '#b7a76a',
  eye: '#d95763',
  fang: '#efe9d8',
  bodyW: 0.21,
  abdH: 0.34,
  cephH: 0.19,
};

export function paintSpiderBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SpiderLook,
  f: BeastBlockFrame,
  at = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const s = f.s;
  const fx = f.fx;
  const fy = f.fy;
  const px = -fy;
  const py = fx;
  const carapace = shade(look.carapace, (((f.seed >>> 5) & 7) - 3) * 2);

  // Abdomen: a domed octagon over the rear half, peaked mid-mass.
  const aC = -hl * 0.45;
  const aR = hl * 0.55;
  const abdomen: Array<[number, number]> = [
    [aC + aR, -hw * 0.55],
    [aC + aR, hw * 0.55],
    [aC + aR * 0.5, hw],
    [aC - aR * 0.5, hw],
    [aC - aR, hw * 0.55],
    [aC - aR, -hw * 0.55],
    [aC - aR * 0.5, -hw],
    [aC + aR * 0.5, -hw],
  ];
  paintBlockBody(
    ctx,
    f,
    abdomen,
    (X) => look.abdH * (1 - 0.45 * Math.pow((X - aC) / aR, 2)),
    () => 0.1,
    shade(look.abdomen, (((f.seed >>> 5) & 7) - 3) * 2),
    (gx, gyy, lift) => {
      const tk = f.topScale ?? 1;
      // Pale chevrons marching rearward down the dome — drawn in the
      // abdomen's own rotated frame so every facing keeps the V shape.
      ctx.save();
      ctx.translate(gx(aC, 0), gyy(aC, 0) - look.abdH * tk * s * 0.86 - lift);
      ctx.rotate(Math.atan2(fy * f.ys, fx));
      ctx.strokeStyle = look.mark;
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.lineCap = 'round';
      const wv = hw * s * 0.42;
      for (const q of [0.3, 0, -0.3]) {
        const mx = aR * q * s;
        ctx.beginPath();
        ctx.moveTo(mx - wv * 0.5, -wv);
        ctx.lineTo(mx + wv * 0.45, 0);
        ctx.lineTo(mx - wv * 0.5, wv);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
    },
  );
  // Spinneret nub off the abdomen's stern.
  ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.abdomen, -18);
  ctx.beginPath();
  facetCircle(
    ctx,
    f.bx + fx * (aC - aR) * s * 1.02,
    f.gy + fy * (aC - aR) * s * 1.02 * f.ys - 0.12 * s,
    s * 0.045,
    5,
    fx,
  );
  ctx.fill();

  // Cephalothorax: the lower front plate the legs crowd around.
  const cC = hl * 0.4;
  const cR = hl * 0.5;
  const cw = hw * 0.62;
  const ceph: Array<[number, number]> = [
    [cC + cR, -cw * 0.6],
    [cC + cR, cw * 0.6],
    [cC + cR * 0.45, cw],
    [cC - cR * 0.55, cw * 0.95],
    [cC - cR, cw * 0.55],
    [cC - cR, -cw * 0.55],
    [cC - cR * 0.55, -cw * 0.95],
    [cC + cR * 0.45, -cw],
  ];
  paintBlockBody(
    ctx,
    f,
    ceph,
    (X) => look.cephH * (1 - 0.3 * Math.pow((X - cC) / cR, 2)),
    () => 0.08,
    carapace,
  );

  // Eye cluster: four hunter's beads across the front plate brow —
  // far-side pair hiding at profile, none from behind, none dead.
  const dead = f.topScale !== undefined && f.topScale < 1;
  if (fy > -0.45 && !f.hurt && !dead) {
    ctx.fillStyle = look.eye;
    for (const [ex0, es] of [
      [0.86, -0.5],
      [0.86, 0.5],
      [0.78, -1.1],
      [0.78, 1.1],
    ] as Array<[number, number]>) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = f.bx + (fx * hl * ex0 + px * es * cw * 0.4) * s;
      const ey =
        f.gy + (fy * hl * ex0 + py * es * cw * 0.4) * f.ys * s - look.cephH * s * 0.82 - f.bob * 0.35 * s;
      const er = s * (Math.abs(es) < 0.8 ? 0.028 : 0.02);
      ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    }
  }
  // Fang chips under the brow — flared mid-pounce.
  if (fy > -0.3 && !f.hurt) {
    const flare = 1 + Math.min(1, at * 1.6) * 0.5;
    ctx.fillStyle = look.fang;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.75 && es * py < 0) continue;
      const fx0 = f.bx + (fx * hl * 0.92 + px * es * cw * 0.3) * s;
      const fy0 =
        f.gy + (fy * hl * 0.92 + py * es * cw * 0.3) * f.ys * s - look.cephH * s * 0.4 - f.bob * 0.35 * s;
      ctx.beginPath();
      ctx.moveTo(fx0 - s * 0.022, fy0);
      ctx.lineTo(fx0 + es * px * s * 0.012, fy0 + s * 0.075 * flare);
      ctx.lineTo(fx0 + s * 0.022, fy0);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * The wild ram: a boxy fleece loaf on sturdy legs with a dark bare
 * face — and the signature, big ridged horns curling back around the
 * ears. The charge drops the whole head into a battering line.
 */
export interface RamLook {
  wool: string;
  /** Bare face and leg tone — dark against the fleece. */
  face: string;
  horn: string;
  hornRib: string;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  /** Horn curl radius (tiles). */
  hornR: number;
}

export const RAM_LOOK: RamLook = {
  wool: '#cfc6b4',
  face: '#6b5a48',
  horn: '#9d8257',
  hornRib: '#77613f',
  bodyW: 0.21,
  backH: 0.44,
  chestH: 0.15,
  headW: 0.26,
  headH: 0.22,
  hornR: 0.165,
};

export function paintRamBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: RamLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Nearly a full rectangle — the fleece hides the taper a leaner
  // animal would show; the loaf read IS the sheep read.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.72],
    [hl, hw * 0.72],
    [hl * 0.55, hw],
    [-hl * 0.55, hw],
    [-hl, hw * 0.72],
    [-hl, -hw * 0.72],
    [-hl * 0.55, -hw],
    [hl * 0.55, -hw],
  ];
  const wool = shade(look.wool, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => look.backH * (1 - 0.1 * Math.pow(X / hl, 2)),
    () => look.chestH,
    wool,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Lumpy fleece: lighter wool clumps drifting along the back in
      // the body's rotated frame, seeded per animal.
      ctx.save();
      ctx.translate(gx(0, 0), gyy(0, 0) - look.backH * tk * s * 0.88 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = shade(wool, 14);
      for (let k = 0; k < 3; k++) {
        const b = ((f.seed >>> (k * 5 + 3)) & 7) / 7;
        ctx.beginPath();
        facetBlob(
          ctx,
          (k - 1) * hl * s * 0.58,
          (b - 0.5) * hw * s * 0.5,
          hl * s * 0.36,
          (f.seed ^ (k * 0x51)) | 0,
          7,
          (hw * 0.75) / (hl * 0.72),
          k * 1.9,
        );
        ctx.fill();
      }
      ctx.restore();
    },
  );
}

/**
 * The ram head: horns first — each curls in its sagittal plane, up
 * over the ear, back, down and forward, drifting outward through the
 * spiral so the front view reads as two curls flanking the poll.
 * Growth ribs cross the curl. The bare face is a dark slab under a
 * wool cap.
 */
export function drawRamHead(
  ctx: CanvasRenderingContext2D,
  look: RamLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the charge telegraph. */
    charge?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const fsx = fx;
  const fsy = fy * ys;

  for (const es of [-1, 1]) {
    // The far horn only vanishes deep into profile — it is the ram's
    // whole identity, so it holds on longer than an ear would.
    if (Math.abs(fx) > 0.75 && es * py < 0) continue;
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.05;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.05) * ys - h * 0.28;
    const R = look.hornR * s;
    const NPT = 9;
    // A solid tapered ribbon along the spiral — inner and outer edges
    // offset radially from the curl center, so the horn reads as one
    // carved mass, never a wire loop.
    const outer: Array<{ x: number; y: number }> = [];
    const inner: Array<{ x: number; y: number }> = [];
    const at = (t: number, rOff: number): { x: number; y: number } => {
      const phi = 1.95 + t * 4.05;
      const r = Math.max(R * 0.12, R * (1 - 0.38 * t) + rOff);
      const out = Math.sin(Math.PI * Math.min(1, t * 1.15)) * R * 0.78;
      return {
        x: bxr + Math.cos(phi) * fsx * r + px * es * out,
        y: byr + Math.cos(phi) * fsy * r - Math.sin(phi) * r + py * es * out * ys,
      };
    };
    for (let i = 0; i <= NPT; i++) {
      const t = i / NPT;
      const wdt = w * (0.19 - 0.13 * t);
      outer.push(at(t, wdt));
      inner.push(at(t, -wdt));
    }
    ctx.fillStyle = C(look.horn);
    ctx.beginPath();
    ctx.moveTo(outer[0]!.x, outer[0]!.y);
    for (let i = 1; i <= NPT; i++) ctx.lineTo(outer[i]!.x, outer[i]!.y);
    for (let i = NPT; i >= 0; i--) ctx.lineTo(inner[i]!.x, inner[i]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.stroke();
    // Growth ribs across the curl — what makes it horn, not hose.
    if (!o.hurt) {
      ctx.strokeStyle = C(look.hornRib);
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (const rt of [0.2, 0.42, 0.64]) {
        const a = at(rt, w * (0.19 - 0.13 * rt));
        const b = at(rt, -w * (0.19 - 0.13 * rt));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // Bare dark face under a wool poll cap.
  ctx.fillStyle = C(look.face);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    ctx.fillStyle = C(look.wool);
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.3);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.14)';
    ctx.fillRect(cx - w / 2, cy + h * 0.24, w, h * 0.26);
    ctx.restore();
  }

  // Roman-nose muzzle wedge, foreshortening with the facing.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.22;
    const by0 = cy + fy * w * 0.22 * ys + h * 0.16;
    const sl = w * (0.18 + 0.18 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.21 * (1 - profileK * 0.22);
    const ht = hb * 0.66;
    ctx.fillStyle = C(shade(look.face, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.07, 5, fx);
    ctx.fill();
  }

  // Small dark eyes under the horn bases.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.3) * ys - h * 0.06;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.05, ey - h * 0.06, w * 0.1, h * 0.12);
    }
  }
}

/**
 * The kept ewe — THE FLEECE TELLS THE TIME. Two bodies in one
 * painter: a full cloud of scalloped cream fleece while the wool
 * stands ready for the shears, and a clipped, slimmer trim while it
 * regrows — the produce clock worn as silhouette, readable across a
 * whole yard. Dark bare face, drooping ears, no horns: kin to the
 * crag ram, but nobody's charger.
 */
export interface SheepLook {
  /** Standing fleece — and the duller clipped tone beneath it. */
  wool: string;
  woolShorn: string;
  /** Bare face, ears, and legs — dark against the cream. */
  face: string;
  bodyW: number;
  /** Fleece height standing full — and trimmed after the shears. */
  backH: number;
  backHShorn: number;
  chestH: number;
  headW: number;
  headH: number;
}

export const SHEEP_LOOK: SheepLook = {
  wool: '#e6dfcd',
  woolShorn: '#d6cab0',
  face: '#4f4234',
  bodyW: 0.23,
  backH: 0.48,
  backHShorn: 0.35,
  chestH: 0.16,
  headW: 0.21,
  headH: 0.19,
};

export function paintSheepBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SheepLook,
  f: BeastBlockFrame,
  shorn: boolean,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW * (shorn ? 0.84 : 1);
  // Full fleece: a rounded cloud, widest amidships, scalloped at the
  // waist. Shorn: the trimmer animal underneath, straighter-sided.
  const foot: Array<[number, number]> = shorn
    ? [
        [hl * 0.92, -hw * 0.7],
        [hl * 0.92, hw * 0.7],
        [hl * 0.5, hw],
        [-hl * 0.5, hw],
        [-hl * 0.92, hw * 0.7],
        [-hl * 0.92, -hw * 0.7],
        [-hl * 0.5, -hw],
        [hl * 0.5, -hw],
      ]
    : [
        [hl, -hw * 0.6],
        [hl, hw * 0.6],
        [hl * 0.62, hw * 0.96],
        [0, hw],
        [-hl * 0.62, hw * 0.96],
        [-hl, hw * 0.6],
        [-hl, -hw * 0.6],
        [-hl * 0.62, -hw * 0.96],
        [0, -hw],
        [hl * 0.62, -hw * 0.96],
      ];
  const base = shade(shorn ? look.woolShorn : look.wool, (((f.seed >>> 5) & 7) - 3) * 2);
  const backH = shorn ? look.backHShorn : look.backH;
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => backH * (1 - (shorn ? 0.12 : 0.18) * Math.pow(X / hl, 2)),
    () => look.chestH,
    base,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      ctx.save();
      ctx.translate(gx(0, 0), gyy(0, 0) - backH * tk * s * 0.88 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      if (shorn) {
        // Shear tracks — the rows the blades left across the back —
        // and one spared tuft at the rump: regrowth's first word.
        ctx.strokeStyle = shade(base, -12);
        ctx.lineWidth = Math.max(1, s * 0.018);
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(-hl * s * 0.72, k * hw * s * 0.42);
          ctx.quadraticCurveTo(0, k * hw * s * 0.58, hl * s * 0.7, k * hw * s * 0.4);
          ctx.stroke();
        }
        ctx.fillStyle = shade(look.wool, 6);
        ctx.beginPath();
        facetBlob(ctx, -hl * s * 0.74, 0, hl * s * 0.2, f.seed | 0, 6, 0.8, 1.3);
        ctx.fill();
      } else {
        // The cloud: five scalloped clumps in two drifted rows, each
        // a shadowed base under a lit crown, seeded per animal — the
        // cauliflower read that says WOOL, not hide.
        const CLUMPS: Array<[number, number, number]> = [
          [-0.62, -0.3, 0.34],
          [-0.6, 0.32, 0.36],
          [0.02, -0.02, 0.42],
          [0.6, -0.3, 0.34],
          [0.58, 0.3, 0.33],
        ];
        for (let k = 0; k < CLUMPS.length; k++) {
          const [ckx, cky, ckr] = CLUMPS[k]!;
          const jx = (((f.seed >>> (k * 3 + 2)) & 3) - 1.5) * 0.04;
          const jy = (((f.seed >>> (k * 3 + 5)) & 3) - 1.5) * 0.04;
          const mx = (ckx + jx) * hl * s;
          const my = (cky + jy) * hw * s * 0.9;
          const mr = ckr * hl * s;
          const asp = (hw * 0.8) / hl;
          ctx.fillStyle = shade(base, -14);
          ctx.beginPath();
          facetBlob(ctx, mx + s * 0.016, my + s * 0.02, mr, (f.seed ^ (k * 0x9e)) | 0, 7, asp, k * 1.7);
          ctx.fill();
          ctx.fillStyle = shade(base, 16);
          ctx.beginPath();
          facetBlob(ctx, mx, my - s * 0.012, mr * 0.94, (f.seed ^ (k * 0x9e)) | 0, 7, asp, k * 1.7);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  );
  // The crown scallops: the block hull is convex, so the cloud's
  // bumpy top can't come from the footprint — clumps ride OVER the
  // back line instead, breaking the straight roof into wool. Full
  // fleece only; the clipped trim keeps its flat top.
  if (!shorn && !f.hurt) {
    const { bx, gy, s, fx, fy, ys } = f;
    const px = -fy;
    const py = fx;
    const lift = f.bob * 0.35 * s;
    const tk = f.topScale ?? 1;
    const CROWN: Array<[number, number, number]> = [
      [-0.6, -0.12, 0.24],
      [-0.16, 0.14, 0.26],
      [0.28, -0.14, 0.25],
      [0.64, 0.1, 0.21],
    ];
    for (let k = 0; k < CROWN.length; k++) {
      const [ckx, cky, ckr] = CROWN[k]!;
      const jx = (((f.seed >>> (k * 4 + 1)) & 3) - 1.5) * 0.05;
      const X = (ckx + jx) * hl;
      const Y = cky * hw;
      const topY = backH * (1 - 0.18 * Math.pow(X / hl, 2)) * tk * s;
      const gxp = bx + (fx * X + px * Y) * s;
      const gyp = gy + (fy * X + py * Y) * ys * s - topY - lift + Y * s * f.roll * 0.4;
      const mr = ckr * hl * s;
      // Soft wool: a shadow crescent tucked under a lit clump — no
      // ink (a stroked ring on the lit top face reads as a hoop).
      ctx.fillStyle = shade(base, -7);
      ctx.beginPath();
      facetBlob(ctx, gxp + s * 0.018, gyp + s * 0.028, mr, (f.seed ^ (k * 0x77)) | 0, 7, 0.68, k * 2.3);
      ctx.fill();
      ctx.fillStyle = shade(base, 22);
      ctx.beginPath();
      facetBlob(ctx, gxp, gyp - s * 0.006, mr * 0.96, (f.seed ^ (k * 0x77)) | 0, 7, 0.68, k * 2.3);
      ctx.fill();
    }
  }
}

/**
 * The ewe head: drooping dark ears off the poll, a bare slab face
 * under a puffed wool cap, a short straight muzzle — everything the
 * ram's skull is not (no horns, no Roman nose, no menace).
 */
export function drawSheepHead(
  ctx: CanvasRenderingContext2D,
  look: SheepLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Body tone behind the poll cap — the shorn trim dulls it. */
    capTone?: string;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const cap = o.capTone ?? look.wool;

  // Drooping ears first, behind the face: soft dark lobes angled
  // down and out from the poll, the far one hiding into profile.
  ctx.lineCap = 'round';
  for (const es of [-1, 1]) {
    if (Math.abs(fx) > 0.8 && es * py < 0) continue;
    const bx0 = cx + px * es * w * 0.48 + fx * w * 0.02;
    const by0 = cy + (py * es * w * 0.48 + fy * w * 0.02) * ys - h * 0.26;
    const tx = bx0 + px * es * w * 0.3;
    const ty = by0 + py * es * w * 0.3 * ys + h * 0.44;
    ctx.strokeStyle = C(look.face);
    ctx.lineWidth = Math.max(2, w * 0.26);
    ctx.beginPath();
    ctx.moveTo(bx0, by0);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // A warm inner line when the lobe faces the camera.
    if (!o.hurt && fy > 0) {
      ctx.strokeStyle = shade(look.face, 18);
      ctx.lineWidth = Math.max(1, w * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx0 + fx * w * 0.04, by0 + fy * w * 0.04 * ys + h * 0.05);
      ctx.lineTo(tx + fx * w * 0.03, ty + fy * w * 0.03 * ys - h * 0.06);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  // Bare dark face slab.
  ctx.fillStyle = C(look.face);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.18, w * 0.18, w * 0.3, w * 0.3]);
  ctx.fill();

  // The poll cap: a puffed wool crown overhanging the brow — drawn
  // OVER the face, the fleece spilling forward, never a painted band.
  ctx.fillStyle = C(cap);
  ctx.beginPath();
  facetBlob(ctx, cx, cy - h * 0.46, w * 0.46, 0x5eeb ^ (w | 0), 7, 0.62, 2.1);
  ctx.fill();

  // Short straight muzzle with the ink nose chip.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.18;
    const sl = w * (0.12 + 0.14 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.05;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.19 * (1 - profileK * 0.2);
    const ht = hb * 0.72;
    ctx.fillStyle = C(shade(look.face, 8));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.06, 5, fx);
    ctx.fill();
  }

  // Gentle wide-set eyes below the cap's shadow.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.08 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.08 + py * es * w * 0.3) * ys - h * 0.02;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.05, ey - h * 0.06, w * 0.1, h * 0.12);
    }
  }
}

/**
 * The stag: elegance by proportion — a slim barrel held HIGH on long
 * legs, a proud rising neck column, pale rump patch, and branched
 * antlers swept back off the crown. The alarm-charge levels the
 * antlers forward.
 */
export interface StagLook {
  coat: string;
  belly: string;
  /** The pale rump patch — the deer flag. */
  rump: string;
  antler: string;
  muzzle: string;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  /** How far the head rides above the back line (tiles). */
  neckRise: number;
  /**
   * Branched crown or bare poll — the hind shares the whole deer
   * dialect and differs exactly here: no beams, leaf ears instead
   * (everything species-flavored lives in the look table).
   */
  antlers: boolean;
}

export const STAG_LOOK: StagLook = {
  coat: '#a67c52',
  belly: '#c4a97f',
  rump: '#e2d6b9',
  antler: '#9c8563',
  muzzle: '#5f4c38',
  bodyW: 0.16,
  backH: 0.62,
  chestH: 0.38,
  headW: 0.22,
  headH: 0.19,
  neckRise: 0.3,
  antlers: true,
};

/**
 * The hind: the stag's dialect at herd scale — a hand smaller, a
 * shade warmer, the neck a touch lower, and big leaf ears where the
 * stag carries his crown. Reads "deer" beside the stag and "not the
 * stag" on her own.
 */
export const HIND_LOOK: StagLook = {
  coat: '#b18a60',
  belly: '#d1b98f',
  rump: '#e9ddc2',
  antler: '#9c8563',
  muzzle: '#63503a',
  bodyW: 0.145,
  backH: 0.56,
  chestH: 0.35,
  headW: 0.19,
  headH: 0.17,
  neckRise: 0.26,
  antlers: false,
};

export function paintStagBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: StagLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Slim barrel, chest a touch deeper than the flank — the daylight
  // under the high belly line is what reads "deer" at a glance.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.78],
    [hl, hw * 0.78],
    [hl * 0.5, hw],
    [-hl * 0.5, hw * 0.95],
    [-hl, hw * 0.66],
    [-hl, -hw * 0.66],
    [-hl * 0.5, -hw * 0.95],
    [hl * 0.5, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => look.backH + 0.03 * Math.max(0, X / hl - 0.2) - 0.04 * Math.max(0, -X / hl - 0.5),
    (X) => look.chestH - 0.04 * Math.max(0, X / hl - 0.3),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // The pale rump patch — only while the rump can actually face
      // the camera (body-frame marks show through the back otherwise).
      if (f.fy < 0.2) {
        ctx.fillStyle = look.rump;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(-hl * 0.86, 0),
          gyy(-hl * 0.86, 0) - look.backH * tk * s * 0.55 - lift,
          hw * s * 0.95,
          f.seed ^ 0x77,
          7,
          0.9,
          2.3,
        );
        ctx.fill();
      }
    },
  );
}

/**
 * The stag head: a small wedge carried high, alert ears, and the
 * crown — branched antlers, each a swept-back beam with a brow tine,
 * a mid tine and a forked top, drifting outward so the front view
 * spreads them wide.
 */
export function drawStagHead(
  ctx: CanvasRenderingContext2D,
  look: StagLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const fsx = fx;
  const fsy = fy * ys;

  // Antlers — drawn before the skull so the beams root under it.
  for (const es of [-1, 1]) {
    // (forward, up, outward) in head units → screen. The constant
    // along-facing stagger keeps the pair readable at full profile.
    const A = (fw: number, up: number, sd: number): { x: number; y: number } => ({
      x: cx + fsx * fw * w + px * es * sd * w + fx * es * w * 0.08,
      y: cy + fsy * fw * w - up * w + (py * es * sd * w + fy * es * w * 0.08) * ys,
    });
    ctx.lineCap = 'round';
    const seg = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      lw: number,
    ): void => {
      ctx.lineWidth = Math.max(1.2, lw);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };
    if (look.antlers) {
      const b0 = A(0.05, 0.28, 0.24);
      const b1 = A(-0.32, 0.85, 0.5);
      const b2 = A(-0.42, 1.45, 0.72);
      const brow = A(0.5, 0.85, 0.36);
      const mid = A(0.1, 1.35, 0.62);
      const tipA = A(-0.12, 1.9, 0.8);
      const tipB = A(-0.95, 1.72, 0.84);
      ctx.strokeStyle = C(look.antler);
      seg(b0, b1, w * 0.1);
      seg(b1, b2, w * 0.08);
      seg(b0, brow, w * 0.06);
      seg(b1, mid, w * 0.055);
      ctx.strokeStyle = C(shade(look.antler, 16));
      seg(b2, tipA, w * 0.05);
      seg(b2, tipB, w * 0.05);
    } else {
      // The bare poll wears leaf ears instead — a coat-dark blade
      // with a pale inner lick, angled back off the crown. Without
      // them an antlerless deer head reads horse at a glance.
      const e0 = A(0.12, 0.26, 0.26);
      const e1 = A(-0.22, 0.78, 0.52);
      const eIn = A(-0.1, 0.62, 0.44);
      ctx.strokeStyle = C(shade(look.coat, -10));
      seg(e0, e1, w * 0.13);
      ctx.strokeStyle = C(look.belly);
      seg(eIn, e1, w * 0.05);
    }
    ctx.lineCap = 'butt';
  }

  // Alert ears flaring out below the antlers.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.36 + fx * es * w * 0.09;
    const byr = cy + (py * es * w * 0.36 + fy * es * w * 0.09) * ys - h * 0.3;
    const tx = bxr + px * es * w * 0.34;
    const ty = byr - h * 0.42 + py * es * w * 0.1 * ys;
    ctx.fillStyle = C(shade(look.coat, -8));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.1, byr + h * 0.08);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.14, byr + h * 0.14);
    ctx.closePath();
    ctx.fill();
  }

  // Small chamfered skull.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.3, w * 0.3]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.3, w * 0.3]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.22);
    if (fy > 0) {
      // Pale chin patch when the throat faces the camera.
      ctx.fillStyle = C(look.belly);
      ctx.fillRect(cx - w * 0.24, cy + h * 0.26, w * 0.48, h * 0.24);
    }
    ctx.restore();
  }

  // Tapered muzzle dipping to a dark nose.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.14;
    const sl = w * (0.24 + 0.22 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.12;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.17 * (1 - profileK * 0.25);
    const ht = hb * 0.6;
    ctx.fillStyle = C(shade(look.coat, 5));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.075, 5, fx);
    ctx.fill();
  }

  // Wide-set dark eyes.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.34;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.34) * ys - h * 0.08;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.055, ey - h * 0.07, w * 0.11, h * 0.14);
    }
  }
}

/**
 * The black bear: sheer mass — a broad slab with the shoulder hump
 * peaked over the front legs, belly nearly brushing the ground, and a
 * huge low head with round ears and a pale short muzzle. The pounce
 * bares teeth like the wolf, but everything about it is heavier.
 */
export interface BearLook {
  fur: string;
  muzzle: string;
  earIn: string;
  bodyW: number;
  backH: number;
  /** Extra shoulder mass over the front legs. */
  humpH: number;
  chestH: number;
  headW: number;
  headH: number;
}

export const BEAR_LOOK: BearLook = {
  fur: '#3d332a',
  muzzle: '#a8865f',
  earIn: '#241c16',
  bodyW: 0.27,
  backH: 0.6,
  humpH: 0.12,
  chestH: 0.16,
  headW: 0.34,
  headH: 0.3,
};

export function paintBearBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BearLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.7],
    [hl, hw * 0.7],
    [hl * 0.5, hw],
    [-hl * 0.5, hw],
    [-hl, hw * 0.7],
    [-hl, -hw * 0.7],
    [-hl * 0.5, -hw],
    [hl * 0.5, -hw],
  ];
  const fur = shade(look.fur, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) =>
      look.backH * (1 - 0.08 * Math.pow(X / hl, 2)) +
      look.humpH * Math.max(0, 1 - Math.abs(X / hl - 0.4) / 0.55),
    () => look.chestH,
    fur,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Grizzled shoulder saddle riding the hump, seeded per bear.
      ctx.save();
      ctx.translate(
        gx(hl * 0.35, 0),
        gyy(hl * 0.35, 0) - (look.backH + look.humpH * 0.6) * tk * s * 0.9 - lift,
      );
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = shade(fur, 9);
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.5, f.seed | 1, 8, (hw * 0.9) / (hl * 0.5), 0.6);
      ctx.fill();
      ctx.restore();
    },
  );
}

/**
 * The bear head: a wide chamfered slab with small round ears, a short
 * broad tan muzzle and a heavy nose. `snarl` opens the jaw and pins
 * the ears through the pounce telegraph.
 */
export function drawBearHead(
  ctx: CanvasRenderingContext2D,
  look: BearLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;

  // Round ears riding the crown corners — flattened mid-snarl. The
  // far one hides at profile so it never floats free of the skull.
  for (const es of [-1, 1]) {
    if (Math.abs(fx) > 0.7 && es * py < 0) continue;
    const exr = cx + px * es * w * 0.34 + fx * es * w * 0.05;
    const eyr = cy + (py * es * w * 0.34 + fy * es * w * 0.05) * ys - h * (0.44 - snarl * 0.1);
    const er = w * 0.17 * (1 - snarl * 0.25);
    ctx.fillStyle = C(shade(look.fur, -5));
    ctx.beginPath();
    facetCircle(ctx, exr, eyr, er, 6, es * 0.7);
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      facetCircle(ctx, exr, eyr + er * 0.15, er * 0.5, 5, es);
      ctx.fill();
    }
  }

  // The skull slab — wide, heavy-jawed.
  ctx.fillStyle = C(look.fur);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.13)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.22);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.16)';
    ctx.fillRect(cx - w / 2, cy + h * 0.22, w, h * 0.28);
    ctx.restore();
  }

  // Short broad muzzle in the pale tan — the bear face read.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.14;
    const sl = w * (0.16 + 0.16 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.08;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.24 * (1 - profileK * 0.2);
    const ht = hb * 0.78;
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Snarl: the jaw swings open under the muzzle, teeth bared.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.4 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.95, ty - ny * ht * 0.95);
      ctx.lineTo(tx + nx * ht * 0.95, ty + ny * ht * 0.95);
      ctx.lineTo(tx + (axv / al) * ht * 0.3, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.55, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The heavy nose block.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.095, 5, fx);
    ctx.fill();
  }

  // Small dark eyes — tiny against the mass, which is the point.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.28;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.28) * ys - h * 0.12;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.045, ey - h * 0.05, w * 0.09, h * 0.1);
    }
  }
}

/**
 * The mudcrab: a wide flat carapace slung sideways across the facing,
 * two chunky pincers held forward (the left one the bigger crusher),
 * and stalked eyes off the front rim. The whole animal is the body
 * painter — head and tail branches return early.
 */
export interface CrabLook {
  shell: string;
  claw: string;
  eye: string;
  /** Half-WIDTH across the facing — wider than the body is long. */
  bodyW: number;
  shellH: number;
}

export const CRAB_LOOK: CrabLook = {
  shell: '#b06a4a',
  claw: '#c97f55',
  eye: '#241a2e',
  bodyW: 0.3,
  shellH: 0.2,
};

export function paintCrabBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CrabLook,
  f: BeastBlockFrame,
  at = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const dead = f.topScale !== undefined && f.topScale < 1;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;

  const drawClaw = (es: number): void => {
    // Arm off the front corner, then the pincer held forward — open
    // through the windup, snapped shut (and lunged) on the strike.
    const sx0 = bx + (fx * hl * 0.4 + px * es * hw * 0.72) * s;
    const sy0 = gy + (fy * hl * 0.4 + py * es * hw * 0.72) * ys * s - look.shellH * 0.45 * tk * s - lift;
    const lunge = at > 0.7 ? Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)) * 0.1 : 0;
    const raise = at > 0 && at <= 0.7 ? (at / 0.7) * 0.05 : 0;
    const ex0 = sx0 + (fx * (0.15 + lunge) + px * es * 0.12) * s;
    const ey0 = sy0 + (fy * (0.15 + lunge) + py * es * 0.12) * ys * s - (0.02 + raise) * s;
    ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.claw, -14);
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(ex0, ey0);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Pincer palm: a faceted pad aimed along the facing. The left
    // claw is the oversized crusher — real crabs are lopsided.
    const pR = (es < 0 ? 0.105 : 0.085) * s;
    const aim = Math.atan2(fy * ys, fx);
    const cxp = ex0 + fx * 0.07 * s;
    const cyp = ey0 + fy * 0.07 * ys * s;
    ctx.fillStyle = f.hurt ? '#ffffff' : look.claw;
    ctx.beginPath();
    facetCircle(ctx, cxp, cyp, pR, 6, aim, 0.85);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
    ctx.lineWidth = Math.max(1, s * 0.016);
    ctx.stroke();
    // Fingers: two tapered chips off the palm — the gap between them
    // gapes through the windup and snaps flat on the strike.
    const gapeK = dead ? 0.2 : at > 0 && at <= 0.7 ? 0.3 + (at / 0.7) * 0.7 : at > 0.7 ? 0 : 0.25;
    ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.claw, 10);
    for (const fu of [-1, 1]) {
      const fa = aim + es * fu * (0.12 + gapeK * 0.3);
      const fLen = pR * (1.15 + (fu < 0 ? 0.15 : 0));
      const fx1 = cxp + Math.cos(fa) * pR * 0.55;
      const fy1 = cyp + Math.sin(fa) * pR * 0.55;
      const fx2 = cxp + Math.cos(fa) * (pR * 0.55 + fLen);
      const fy2 = cyp + Math.sin(fa) * (pR * 0.55 + fLen);
      const pnx = -Math.sin(fa);
      const pny = Math.cos(fa);
      ctx.beginPath();
      ctx.moveTo(fx1 + pnx * pR * 0.28, fy1 + pny * pR * 0.28);
      ctx.lineTo(fx2, fy2);
      ctx.lineTo(fx1 - pnx * pR * 0.28, fy1 - pny * pR * 0.28);
      ctx.closePath();
      ctx.fill();
    }
  };

  // A claw whose screen-y offset puts it below the body center is the
  // near one — it paints over the shell; the other tucks behind.
  const clawNear = (es: number): boolean => (fy * hl * 0.55 + py * es * hw * 0.8) * ys > 0;
  for (const es of [-1, 1]) if (!clawNear(es)) drawClaw(es);

  // The carapace: wider than long, low-domed, mottled.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.55],
    [hl, hw * 0.55],
    [hl * 0.45, hw],
    [-hl * 0.45, hw],
    [-hl, hw * 0.55],
    [-hl, -hw * 0.55],
    [-hl * 0.45, -hw],
    [hl * 0.45, -hw],
  ];
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => look.shellH * (1 - 0.35 * Math.pow(X / hl, 2)),
    () => 0.05,
    shell,
    (gx, gyy, lift2) => {
      // Mottle specks scattered across the crown.
      ctx.fillStyle = shade(shell, -14);
      for (let k = 0; k < 4; k++) {
        const b = (n: number): number => ((f.seed >>> ((k * 7 + n * 3) % 28)) & 7) / 7;
        ctx.beginPath();
        facetCircle(
          ctx,
          gx((b(0) * 1.5 - 0.75) * hl, (b(1) * 1.6 - 0.8) * hw),
          gyy((b(0) * 1.5 - 0.75) * hl, (b(1) * 1.6 - 0.8) * hw) - look.shellH * 0.8 * tk * s - lift2,
          s * (0.016 + b(2) * 0.014),
          5,
          k * 1.7,
        );
        ctx.fill();
      }
    },
  );

  // Stalked eyes off the front rim — the far one hides at profile.
  if (!dead && !f.hurt && fy > -0.5) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      const ex1 = bx + (fx * hl * 0.8 + px * es * hw * 0.3) * s;
      const ey1 = gy + (fy * hl * 0.8 + py * es * hw * 0.3) * ys * s - look.shellH * 0.92 * s - lift;
      ctx.strokeStyle = shade(look.shell, -22);
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(ex1, ey1 + s * 0.05);
      ctx.lineTo(ex1, ey1 - s * 0.05);
      ctx.stroke();
      ctx.fillStyle = look.eye;
      ctx.fillRect(ex1 - s * 0.024, ey1 - s * 0.095, s * 0.048, s * 0.048);
    }
  }

  for (const es of [-1, 1]) if (clawNear(es)) drawClaw(es);
}

/**
 * The giant beetle: domed elytra split by a center seam with an
 * iridescent sheen, a darker pronotum plate at the front, and a rhino
 * horn hooking up off the head between two elbowed antennae. Whole
 * animal in the body painter — head and tail branches return early.
 */
export interface BeetleLook {
  shell: string;
  plate: string;
  seam: string;
  /** Iridescent highlight glazed over the lit dome. */
  sheen: string;
  horn: string;
  bodyW: number;
  elyH: number;
  plateH: number;
}

export const BEETLE_LOOK: BeetleLook = {
  shell: '#42527a',
  plate: '#333f5e',
  seam: '#1f2740',
  sheen: '#7fd8c9',
  horn: '#242c44',
  bodyW: 0.2,
  elyH: 0.3,
  plateH: 0.17,
};

export function paintBeetleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BeetleLook,
  f: BeastBlockFrame,
  at = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;

  // Elytra: one big domed shell over the rear three-quarters.
  const aC = -hl * 0.18;
  const aR = hl * 0.8;
  const ely: Array<[number, number]> = [
    [aC + aR, -hw * 0.62],
    [aC + aR, hw * 0.62],
    [aC + aR * 0.5, hw],
    [aC - aR * 0.5, hw],
    [aC - aR, hw * 0.55],
    [aC - aR, -hw * 0.55],
    [aC - aR * 0.5, -hw],
    [aC + aR * 0.5, -hw],
  ];
  const drawEly = (): void =>
    paintBlockBody(
      ctx,
      f,
      ely,
      (X) => look.elyH * (1 - 0.45 * Math.pow((X - aC) / aR, 2)),
      () => 0.06,
      shell,
      (gx, gyy, lift2) => {
        // Seam, striations and sheen live in the elytra's rotated
        // frame so every facing keeps them running nose-to-tail.
        ctx.save();
        ctx.translate(gx(aC, 0), gyy(aC, 0) - look.elyH * tk * s * 0.88 - lift2);
        ctx.rotate(Math.atan2(fy * ys, fx));
        // The center split — two wing cases, not one shell — opening
        // from a scutellum notch at the front.
        ctx.strokeStyle = look.seam;
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(aR * 0.8 * s, 0);
        ctx.lineTo(-aR * 0.95 * s, 0);
        ctx.stroke();
        ctx.fillStyle = look.seam;
        ctx.beginPath();
        ctx.moveTo(aR * 0.92 * s, -hw * s * 0.28);
        ctx.lineTo(aR * 0.55 * s, 0);
        ctx.lineTo(aR * 0.92 * s, hw * s * 0.28);
        ctx.closePath();
        ctx.fill();
        // Pit striations flanking the seam.
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.globalAlpha = 0.45;
        for (const q of [-0.5, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(aR * 0.5 * s, q * hw * s * 0.55);
          ctx.lineTo(-aR * 0.8 * s, q * hw * s * 0.55);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Iridescent glaze catching on the lit dome.
        ctx.fillStyle = look.sheen;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        facetBlob(ctx, aR * 0.28 * s, -hw * s * 0.32, aR * 0.5 * s, f.seed | 3, 7, 0.62, 0.8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      },
    );

  // Pronotum plate + head + horn + antennae as one forequarter group.
  const drawFore = (): void => {
    const cC = hl * 0.72;
    const cR = hl * 0.3;
    const cw = hw * 0.78;
    const pro: Array<[number, number]> = [
      [cC + cR, -cw * 0.6],
      [cC + cR, cw * 0.6],
      [cC + cR * 0.4, cw],
      [cC - cR * 0.5, cw],
      [cC - cR, cw * 0.6],
      [cC - cR, -cw * 0.6],
      [cC - cR * 0.5, -cw],
      [cC + cR * 0.4, -cw],
    ];
    paintBlockBody(
      ctx,
      f,
      pro,
      (X) => look.plateH * (1 - 0.35 * Math.pow((X - cC) / cR, 2)),
      () => 0.06,
      f.hurt ? '#ffffff' : look.plate,
    );
    // Head chip in front of the plate.
    const hx0 = bx + fx * hl * 1.08 * s;
    const hy0 = gy + fy * hl * 1.08 * ys * s - look.plateH * 0.4 * tk * s - lift;
    ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.plate, -8);
    ctx.beginPath();
    facetCircle(ctx, hx0, hy0, s * 0.06, 6, Math.atan2(fy * ys, fx));
    ctx.fill();
    // THE HORN: a rhino hook curving up-forward off the head — tossed
    // upward through the strike.
    const toss = at > 0.7 ? Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)) * 0.12 : 0;
    const P = (fw: number, up: number): { x: number; y: number } => ({
      x: bx + fx * fw * s,
      y: gy + fy * fw * ys * s - up * tk * s - lift,
    });
    const hB = P(hl * 1.06, look.plateH * 0.5);
    const hM = P(hl * 1.32, look.plateH * 0.5 + 0.18);
    const hT = P(hl * 1.34, look.plateH * 0.5 + 0.4 + toss);
    const a1 = Math.atan2(hM.y - hB.y, hM.x - hB.x) + Math.PI / 2;
    const a2 = Math.atan2(hT.y - hM.y, hT.x - hM.x) + Math.PI / 2;
    const w0 = Math.max(1.6, s * 0.05);
    const w1 = Math.max(1.2, s * 0.028);
    ctx.fillStyle = f.hurt ? '#ffffff' : look.horn;
    ctx.beginPath();
    ctx.moveTo(hB.x + Math.cos(a1) * w0, hB.y + Math.sin(a1) * w0);
    ctx.lineTo(hM.x + Math.cos(a2) * w1, hM.y + Math.sin(a2) * w1);
    ctx.lineTo(hT.x, hT.y);
    ctx.lineTo(hM.x - Math.cos(a2) * w1, hM.y - Math.sin(a2) * w1);
    ctx.lineTo(hB.x - Math.cos(a1) * w0, hB.y - Math.sin(a1) * w0);
    ctx.closePath();
    ctx.fill();
    // Lit leading edge so the hook reads against the dark shell.
    ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.shell, 26);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(hB.x + Math.cos(a1) * w0 * 0.7, hB.y + Math.sin(a1) * w0 * 0.7);
    ctx.lineTo(hM.x + Math.cos(a2) * w1 * 0.7, hM.y + Math.sin(a2) * w1 * 0.7);
    ctx.lineTo(hT.x, hT.y);
    ctx.stroke();
    // Elbowed antennae with club tips, staggered; far one hides at
    // profile.
    const dead = f.topScale !== undefined && f.topScale < 1;
    // No antennae from behind — over the dome they read as stray
    // grass, and the horn already carries the silhouette.
    if (!dead && !f.hurt && fy > -0.35) {
      for (const es of [-1, 1]) {
        if (Math.abs(fx) > 0.65 && es * py < 0) continue;
        const a0x = hx0 + px * es * s * 0.05;
        const a0y = hy0 + py * es * s * 0.05 * ys;
        const a1x = a0x + (fx * 0.1 + px * es * 0.08) * s;
        const a1y = a0y + (fy * 0.1 + py * es * 0.08) * ys * s - s * 0.035;
        const a2x = a1x + (fx * 0.05 + px * es * 0.055) * s;
        const a2y = a1y - s * 0.055;
        ctx.strokeStyle = look.horn;
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(a0x, a0y);
        ctx.lineTo(a1x, a1y);
        ctx.lineTo(a2x, a2y);
        ctx.stroke();
        ctx.fillStyle = look.horn;
        ctx.fillRect(a2x - s * 0.018, a2y - s * 0.018, s * 0.036, s * 0.036);
      }
    }
  };

  // True depth between the two masses: walking away, the forequarter
  // tucks behind the dome instead of pasting over it.
  if (fy < -0.2) {
    drawFore();
    drawEly();
  } else {
    drawEly();
    drawFore();
  }
}

/**
 * The slime: a hopping gel block in the wall-prism dialect — a chamfered
 * cube that squashes on landing, stretches mid-hop, and breathes at
 * rest, with a darker nucleus riding low in the mass. One body reads at
 * both sizes (the halves pass `radius` small).
 */
export function drawSlime(
  ctx: CanvasRenderingContext2D,
  o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    walkPhase: number;
    nowMs: number;
    seed: number;
    /** 0..1 how much the body is actually travelling — stills the hop. */
    moveK: number;
    attackT?: number;
    ys: number;
  },
): void {
  const s = o.s;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const w = o.radius * 2.1 * s;
  const h = o.radius * 1.7 * s;

  // Hop cycle from travelled distance; landing squash → launch stretch.
  const hp = (o.walkPhase * 1.35) % 1;
  const lift = Math.max(0, Math.sin(Math.PI * hp)) * 0.2 * s * o.moveK;
  let sqy = 1 + (Math.sin(Math.PI * 2 * hp) * 0.14 - 0.02) * o.moveK;
  // Idle breathing: the mass never quite holds still.
  sqy += Math.sin(o.nowMs * 0.0032 + o.seed) * 0.045 * (1 - o.moveK);
  let sqx = 2 - sqy; // area-preserving squash

  // Attack: gather low and wide, then spring along the facing.
  const at = o.attackT ?? 0;
  let bx = o.x;
  let by = o.y - lift;
  if (at > 0) {
    if (at < 0.7) {
      const k = at / 0.7;
      sqx += k * 0.22;
      sqy -= k * 0.18;
      bx -= fx * 0.1 * k * s;
      by += fy * 0.02 * k * s;
    } else {
      const k = Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
      sqx -= k * 0.16;
      sqy += k * 0.22;
      bx += fx * 0.3 * k * s;
      by -= (0.08 * k - fy * 0.02) * s;
    }
  }

  const bw = w * sqx;
  const bh = h * sqy;
  const cut = bw * 0.24;
  const bodyPath = (): void => {
    ctx.beginPath();
    chamferRect(ctx, bx - bw / 2, by - bh, bw, bh, [cut, cut, cut * 0.55, cut * 0.55]);
  };

  // Gel mass, then flat bands clipped inside it: dark contact base,
  // lit top slab — the block read with zero gradients.
  ctx.fillStyle = o.hurt ? '#ffffff' : o.color;
  bodyPath();
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    bodyPath();
    ctx.clip();
    ctx.fillStyle = shade(o.color, -16);
    ctx.fillRect(bx - bw / 2, by - bh * 0.24, bw, bh * 0.24);
    ctx.fillStyle = 'rgba(255, 244, 220, 0.17)';
    ctx.fillRect(bx - bw / 2, by - bh, bw, bh * 0.3);
    // The nucleus: a darker core low in the body, seeded off-center.
    ctx.fillStyle = shade(o.color, -30);
    ctx.beginPath();
    facetBlob(
      ctx,
      bx + ((o.seed % 7) - 3) * bw * 0.016,
      by - bh * 0.38,
      bw * 0.19,
      o.seed,
      7,
      0.85,
    );
    ctx.fill();
    // One flat gloss chip high on the lit corner.
    ctx.fillStyle = shade(o.color, 30);
    ctx.fillRect(bx - bw * 0.3, by - bh * 0.82, bw * 0.13, bh * 0.1);
    ctx.restore();
  }
  // Eyes track the facing; none on the back of the mass.
  if (fy > -0.45) {
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      const eex = bx + fx * bw * 0.15 + es * px * bw * 0.19;
      const eey = by - bh * 0.62 + (fy * bh * 0.1 + es * py * bw * 0.19) * o.ys;
      ctx.fillRect(eex - bw * 0.035, eey - bh * 0.07, bw * 0.07, bh * 0.14);
    }
  }
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = 1;
  bodyPath();
  ctx.stroke();
}

/**
 * The cave bat: an airborne body — leathery wing fans beating on their
 * own clock, a round tuft body hovering shoulder-high, big dish ears.
 * The ground never touches it; the renderer throws its shadow.
 */
export function drawBat(
  ctx: CanvasRenderingContext2D,
  o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    nowMs: number;
    seed: number;
    attackT?: number;
    ys: number;
  },
): void {
  const s = o.s;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const r = o.radius * 2.6 * s;
  const at = o.attackT ?? 0;

  // Hover with a slow bob; the strike is a dip-and-lunge.
  let bx = o.x;
  let cy = o.y - 0.85 * s - Math.sin(o.nowMs * 0.0053 + o.seed) * 0.055 * s;
  if (at > 0) {
    if (at < 0.7) {
      cy -= (at / 0.7) * 0.08 * s;
      bx -= fx * 0.06 * (at / 0.7) * s;
    } else {
      const k = Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
      cy += k * 0.3 * s;
      bx += fx * 0.26 * k * s;
    }
  }
  const flap = Math.sin(o.nowMs * 0.021 + o.seed * 0.7);
  const body = o.hurt ? '#ffffff' : o.color;
  const membrane = o.hurt ? '#ffffff' : shade(o.color, -10);

  // Wings: chamfered membrane fans on screen-X, beating out of phase
  // with gravity — up-beat folds slightly, down-beat spreads.
  for (const es of [-1, 1]) {
    const shx = bx + es * r * 0.22;
    const shy = cy - r * 0.05;
    const wrx = bx + es * r * (0.85 - Math.max(0, flap) * 0.1);
    const wry = cy - r * 0.32 - flap * 0.42 * r;
    const tipx = bx + es * r * (1.5 - Math.max(0, flap) * 0.22);
    const tipy = cy - r * 0.08 - flap * 0.78 * r;
    ctx.fillStyle = membrane;
    ctx.beginPath();
    ctx.moveTo(shx, shy);
    ctx.lineTo(wrx, wry);
    ctx.lineTo(tipx, tipy);
    // Scalloped trailing edge: two dips back toward the body.
    ctx.lineTo(bx + es * r * 1.02, cy + r * 0.26 - flap * 0.3 * r);
    ctx.lineTo(bx + es * r * 0.62, cy + r * 0.16 - flap * 0.12 * r);
    ctx.lineTo(bx + es * r * 0.3, cy + r * 0.24);
    ctx.closePath();
    ctx.fill();
    // Wing-arm bones ride the leading edge.
    ctx.strokeStyle = o.hurt ? '#ffffff' : shade(o.color, -30);
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shx, shy);
    ctx.lineTo(wrx, wry);
    ctx.lineTo(tipx, tipy);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Body tuft + head with tall staggered ears.
  ctx.fillStyle = body;
  ctx.beginPath();
  facetBlob(ctx, bx, cy, r * 0.42, o.seed, 8, 1.1);
  ctx.fill();
  ctx.fillStyle = o.hurt ? '#ffffff' : shade(o.color, 12);
  ctx.beginPath();
  facetBlob(ctx, bx, cy + r * 0.16, r * 0.2, o.seed ^ 0x33, 6, 0.8);
  ctx.fill();
  const hx = bx + fx * r * 0.3;
  const hy = cy - r * 0.34 + fy * r * 0.12 * o.ys;
  const hr = r * 0.3;
  for (const es of [-1, 1]) {
    // Ears split fore/aft at profile — the paired-gear stagger law.
    const ex = hx + es * (-fy) * hr * 0.7 + fx * es * hr * 0.14;
    const ey = hy + es * fx * hr * 0.7 * o.ys - hr * 0.5;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(ex - hr * 0.24, ey);
    ctx.lineTo(ex, ey - hr * 1.05);
    ctx.lineTo(ex + hr * 0.24, ey);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  facetCircle(ctx, hx, hy, hr, 6, o.dir + Math.PI / 6);
  ctx.fill();
  if (fy > -0.45 && !o.hurt) {
    ctx.fillStyle = '#e2a63c';
    for (const es of [-1, 1]) {
      const eex = hx + fx * hr * 0.35 + es * (-fy) * hr * 0.34;
      const eey = hy + (fy * hr * 0.35 + es * fx * hr * 0.34) * o.ys;
      ctx.fillRect(eex - hr * 0.09, eey - hr * 0.09, hr * 0.18, hr * 0.18);
    }
    if (at > 0.4) {
      ctx.fillStyle = '#efe9d8';
      for (const es of [-1, 1]) {
        ctx.fillRect(hx + es * hr * 0.18 - hr * 0.05, hy + hr * 0.5, hr * 0.1, hr * 0.26);
      }
    }
  }
}

/**
 * The giant adder: a slithering tapered ribbon — the body is a sampled
 * S-wave behind the head, diamond-patterned down the spine, with a
 * raised viper head that strikes along the facing.
 */
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    walkPhase: number;
    nowMs: number;
    seed: number;
    moveK: number;
    attackT?: number;
    ys: number;
  },
): void {
  const s = o.s;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const at = o.attackT ?? 0;
  const body = o.hurt ? '#ffffff' : o.color;

  // Strike: the head and fore-body pull back, then whip forward.
  let strike = 0;
  if (at > 0) {
    strike = at < 0.7 ? -0.08 * (at / 0.7) : 0.3 * Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
  }

  const LEN = 1.3; // tiles of body behind the head
  const N = 12;
  const amp = s * (0.05 + 0.07 * o.moveK);
  const phase = o.walkPhase * Math.PI * 2 * 1.15 + Math.sin(o.nowMs * 0.0008 + o.seed) * 0.6 * (1 - o.moveK);
  const pts: Array<{ x: number; y: number; w: number }> = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const d = t * LEN * s;
    // The head holds its line; the wave grows behind the neck.
    const lat = Math.sin(phase - t * 5.2) * amp * Math.min(1, t * 3);
    // Fore-body rides the strike; rear stays planted.
    const lunge = strike * Math.max(0, 1 - t * 2.4) * s;
    const rise = Math.max(0, 0.22 - t) / 0.22 * (0.1 + at * 0.06) * s;
    pts.push({
      x: o.x - fx * d + px * lat + fx * lunge,
      y: o.y - (fy * d - py * lat - fy * lunge) * o.ys - rise,
      w: s * (0.055 * Math.sin(Math.PI * Math.pow(Math.min(1, t * 1.12), 0.7)) + 0.014 * (1 - t) + 0.004),
    });
  }
  // Ribbon body: perpendicular offsets per sample, one closed fill.
  ctx.fillStyle = body;
  ctx.beginPath();
  for (let k = 0; k <= N; k++) {
    const a = pts[Math.max(0, k - 1)]!;
    const b = pts[Math.min(N, k + 1)]!;
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-4;
    const nx = -(b.y - a.y) / dl;
    const ny = (b.x - a.x) / dl;
    const p = pts[k]!;
    if (k === 0) ctx.moveTo(p.x + nx * p.w, p.y + ny * p.w);
    else ctx.lineTo(p.x + nx * p.w, p.y + ny * p.w);
  }
  for (let k = N; k >= 0; k--) {
    const a = pts[Math.max(0, k - 1)]!;
    const b = pts[Math.min(N, k + 1)]!;
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-4;
    const nx = -(b.y - a.y) / dl;
    const ny = (b.x - a.x) / dl;
    const p = pts[k]!;
    ctx.lineTo(p.x - nx * p.w, p.y - ny * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Dorsal diamonds march the spine — the adder's zigzag.
  if (!o.hurt) {
    ctx.fillStyle = shade(o.color, -24);
    for (let k = 1; k < N; k += 2) {
      const p = pts[k]!;
      const dw = p.w * 0.85;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - dw);
      ctx.lineTo(p.x + dw, p.y);
      ctx.lineTo(p.x, p.y + dw);
      ctx.lineTo(p.x - dw, p.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Viper head: a flat wedge wider than the neck, riding the rise.
  const h = pts[0]!;
  const hw = s * 0.085;
  const hl = s * 0.15;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(Math.atan2(fy * o.ys, fx));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-hl * 0.3, -hw);
  ctx.lineTo(hl * 0.45, -hw * 0.72);
  ctx.lineTo(hl, -hw * 0.3);
  ctx.lineTo(hl, hw * 0.3);
  ctx.lineTo(hl * 0.45, hw * 0.72);
  ctx.lineTo(-hl * 0.3, hw);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.stroke();
  // Tongue: a rare forked flick, eager through the strike.
  const flick = Math.max(0, Math.sin(o.nowMs * 0.0031 + o.seed) - 0.88) / 0.12;
  const tk = Math.max(flick, at > 0.5 ? 1 : 0);
  if (tk > 0.05 && !o.hurt) {
    ctx.strokeStyle = '#c4485a';
    ctx.lineWidth = Math.max(1, s * 0.012);
    const tl = s * 0.11 * tk;
    ctx.beginPath();
    ctx.moveTo(hl, 0);
    ctx.lineTo(hl + tl * 0.7, 0);
    ctx.moveTo(hl + tl * 0.7, 0);
    ctx.lineTo(hl + tl, -s * 0.02 * tk);
    ctx.moveTo(hl + tl * 0.7, 0);
    ctx.lineTo(hl + tl, s * 0.02 * tk);
    ctx.stroke();
  }
  ctx.restore();
  // Eyes sit on the head's sides — skipped facing away.
  if (fy > -0.45 && !o.hurt) {
    ctx.fillStyle = '#e2a63c';
    for (const es of [-1, 1]) {
      const eex = h.x + fx * hl * 0.25 + es * px * hw * 0.72;
      const eey = h.y + (fy * hl * 0.25 + es * py * hw * 0.72) * o.ys;
      ctx.fillRect(eex - s * 0.014, eey - s * 0.02, s * 0.028, s * 0.04);
    }
  }
}

/**
 * The Dawnlands courser — the first saddle beast (THE ROAD GROWS
 * SHORT). A working horse in the brutalist dialect: tall block barrel
 * held high on long hoofed legs, a strong rising neck under a fallen
 * mane, a long plain head, and its tack worn honestly — blanket, seat,
 * girth, reins looped to the pommel. Coats keyed by MOUNT def id.
 */
export interface CourserLook {
  coat: string;
  belly: string;
  mane: string;
  muzzle: string;
  /** Lower-leg tone (the socks) — becomes the spec's legColor. */
  sock: string;
  /** Tack cloth under the saddle — the owner-visible identity color. */
  blanket: string;
  leather: string;
  /** Grey coats dapple; solid coats stay plain. */
  dapple?: boolean;
  /** Mountain shag: belly fringe and a heavier mane fall (the garron). */
  shaggy?: boolean;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  neckRise: number;
}

export const COURSER_LOOKS: Record<string, CourserLook> = {
  courser_bay: {
    coat: '#7b4a2e',
    belly: '#93613f',
    mane: '#2b2018',
    muzzle: '#241a12',
    sock: '#3a2c20',
    blanket: '#7d3f3a',
    leather: '#4a3423',
    bodyW: 0.185,
    backH: 0.72,
    chestH: 0.42,
    headW: 0.27,
    headH: 0.2,
    neckRise: 0.44,
  },
};

// Leather reads one way across every coat — the tack is the constant,
// the horse is the variable.
COURSER_LOOKS.courser_grey = {
  ...COURSER_LOOKS.courser_bay!,
  coat: '#b7b3a8',
  belly: '#d0ccc2',
  mane: '#6b675f',
  muzzle: '#4e4a44',
  sock: '#8b867c',
  blanket: '#3d5a68',
  dapple: true,
};
COURSER_LOOKS.courser_dun = {
  ...COURSER_LOOKS.courser_bay!,
  coat: '#b2905e',
  belly: '#c8ad80',
  mane: '#2e241a',
  muzzle: '#33281c',
  sock: '#2e241a',
  blanket: '#5a6238',
};
// The Hoargate garron: stocky pass pony under a winter shag — smaller
// in every measure, deeper in the barrel, pine-green tack.
COURSER_LOOKS.garron_hoargate = {
  coat: '#6d5c49',
  belly: '#857462',
  mane: '#3a322a',
  muzzle: '#2c241c',
  sock: '#3a322a',
  blanket: '#4c5a45',
  leather: '#4a3423',
  shaggy: true,
  bodyW: 0.2,
  backH: 0.58,
  chestH: 0.3,
  headW: 0.24,
  headH: 0.19,
  neckRise: 0.3,
};

/**
 * Rider anchor geometry, tile units above the beast's ground point.
 * The renderer builds the rider's seat, stirrups, and pommel grip from
 * these; the tack painter draws to the same numbers — one ruler, so
 * the boot always meets the stirrup iron and the fists the pommel.
 */
export const COURSER_SADDLE = {
  seatH: 0.84,
  stirrupH: 0.36,
  stirrupSide: 0.185,
  stirrupFwd: 0.05,
  pommelFwd: 0.16,
  pommelH: 0.97,
  radius: 0.42,
};

/** One rig for every coat — only the sock color varies. */
export function mountSpec(mountId: string): BeastSpec {
  let spec = MOUNT_SPEC_CACHE.get(mountId);
  if (!spec && mountId.startsWith('sabercat')) {
    // The cat: long and low on springy paws, quick through the turn —
    // the wolf family's athletic grammar at riding scale.
    const catLook = SABERCAT_LOOKS[mountId] ?? SABERCAT_LOOKS.sabercat_night!;
    spec = {
      rig: {
        legs: quadLegs(0.34, 0.14),
        legLen: 0.46,
        rise: 0.4,
        liftAmp: 0.09,
        runSpeed: 7.5,
        turnRate: 7.5,
      },
      bodyLen: 0.62,
      bodyRise: 0.46,
      kneeFwd: [1, 1, -1, -1],
      hipFwd: 0.9,
      hipSide: 0.52,
      legW: 0.085,
      foot: 'paw',
      legColor: shade(catLook.coat, -14),
    };
    MOUNT_SPEC_CACHE.set(mountId, spec);
    return spec;
  }
  const look = COURSER_LOOKS[mountId] ?? COURSER_LOOKS.courser_bay!;
  if (!spec) {
    // The garron is the courser's rig a hand shorter and a hand
    // stockier — same gait laws, lower center, thicker bone.
    const garron = mountId.startsWith('garron');
    spec = {
      rig: {
        legs: quadLegs(garron ? 0.32 : 0.36, garron ? 0.16 : 0.15),
        legLen: garron ? 0.42 : 0.52,
        rise: garron ? 0.37 : 0.46,
        liftAmp: 0.075,
        // The gait ceiling sits at canter: at mount speed (8 t/s) the
        // blend rides full-run and cadence scales with true speed.
        runSpeed: 6.5,
        // A horse commits to a line — statelier than a wolf's snap.
        turnRate: garron ? 6 : 5.5,
      },
      bodyLen: garron ? 0.5 : 0.58,
      bodyRise: garron ? 0.44 : 0.54,
      kneeFwd: [1, 1, -1, -1],
      hipFwd: 0.9,
      hipSide: 0.5,
      legW: garron ? 0.105 : 0.09,
      foot: 'hoof',
      legColor: look.sock,
    };
    MOUNT_SPEC_CACHE.set(mountId, spec);
  }
  return spec;
}

/**
 * Rider geometry per body — the garron seats lower than the courser.
 * Same shape as COURSER_SADDLE; the renderer picks by mount id.
 */
export function saddleFor(mountId: string): typeof COURSER_SADDLE {
  if (mountId.startsWith('sabercat')) return SABER_SADDLE;
  return mountId.startsWith('garron') ? GARRON_SADDLE : COURSER_SADDLE;
}
const GARRON_SADDLE = {
  seatH: 0.7,
  stirrupH: 0.28,
  stirrupSide: 0.19,
  stirrupFwd: 0.05,
  pommelFwd: 0.14,
  pommelH: 0.82,
  radius: 0.4,
};
// The cat is ridden LOW and close — the night-saber crouch: seat on
// the harness pad behind the shoulder rise, feet tucked high, grip on
// the strap-ring horn.
const SABER_SADDLE = {
  seatH: 0.64,
  stirrupH: 0.26,
  stirrupSide: 0.19,
  stirrupFwd: 0.02,
  pommelFwd: 0.15,
  pommelH: 0.76,
  radius: 0.42,
};
const MOUNT_SPEC_CACHE = new Map<string, BeastSpec>();

export function paintCourserBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CourserLook,
  f: BeastBlockFrame,
  saddle: typeof COURSER_SADDLE = COURSER_SADDLE,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Deep chest, level back, round croup — the working-horse barrel.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.8],
    [hl, hw * 0.8],
    [hl * 0.55, hw],
    [-hl * 0.5, hw * 0.98],
    [-hl, hw * 0.7],
    [-hl, -hw * 0.7],
    [-hl * 0.5, -hw * 0.98],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // Level back with the faint wither rise at the neck end.
    (X) => look.backH + 0.035 * Math.max(0, X / hl - 0.45),
    // The chest drops deeper forward — daylight under the flank only.
    (X) => look.chestH - 0.05 * Math.max(0, X / hl - 0.2),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // Mountain shag: a ragged fringe along the belly line — the
      // winter coat that makes a garron read garron beside a courser.
      if (look.shaggy && !f.hurt) {
        ctx.strokeStyle = shade(look.coat, -12);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.5, s * 0.035);
        for (let k = 0; k < 6; k++) {
          const X = (k / 5 - 0.5) * 1.5 * hl;
          const fx0 = gx(X, 0);
          const fy0 = gyy(X, 0) - look.chestH * tk * s * 0.72 - lift;
          ctx.beginPath();
          ctx.moveTo(fx0, fy0);
          ctx.lineTo(fx0 + s * 0.012 * ((k % 3) - 1), fy0 + s * (0.07 + 0.02 * (k % 2)));
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // Grey coats dapple: a scatter of paler facets over the croup
      // and shoulder, seeded per body so no two greys match.
      if (look.dapple && !f.hurt) {
        ctx.fillStyle = shade(look.coat, 10);
        for (let k = 0; k < 5; k++) {
          const rr = (h: number): number =>
            ((((f.seed >>> (h % 13)) * 2654435761 + k * 97) >>> 0) % 1000) / 1000;
          const X = (rr(k) * 1.6 - 0.8) * hl;
          const Y = (rr(k + 5) * 1.4 - 0.7) * hw;
          ctx.beginPath();
          facetCircle(ctx, gx(X, Y), gyy(X, Y) - bh * 0.62 - lift, s * 0.035, 5, f.seed + k);
          ctx.fill();
        }
      }
      // ---- THE TACK, on the one ruler (COURSER_SADDLE).
      // Blanket: a cloth lozenge laid along the spine under the seat,
      // plus its hem hanging down the camera-near flank.
      const bx0 = gx(-0.16 * hl * 2, 0);
      const by0 = gyy(-0.16 * hl * 2, 0) - bh * 0.92 - lift;
      const bx1 = gx(0.4 * hl, 0);
      const by1 = gyy(0.4 * hl, 0) - bh * 0.92 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.blanket;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, s * 0.19);
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx1, by1);
      ctx.stroke();
      // The hem band a half-step lower, in the cloth's shade.
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.blanket, -14);
      ctx.lineWidth = Math.max(2.5, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx0, by0 + s * 0.13);
      ctx.lineTo(bx1, by1 + s * 0.13);
      ctx.stroke();
      // Saddle seat: the leather lozenge riding the blanket, shorter,
      // with the girth strap dropping to the belly line at its middle.
      const sx0 = gx(-0.05 * hl * 2, 0);
      const sy0 = gyy(-0.05 * hl * 2, 0) - bh * 1.0 - lift;
      const sx1 = gx(0.3 * hl, 0);
      const sy1 = gyy(0.3 * hl, 0) - bh * 1.0 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
      ctx.lineWidth = Math.max(3, s * 0.13);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
      // Cantle and pommel: the seat's two rises, pommel forward.
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 12);
      ctx.beginPath();
      facetCircle(ctx, sx1, sy1 - s * 0.045, s * 0.045, 5, f.seed ^ 0x11);
      ctx.fill();
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 4);
      ctx.beginPath();
      facetCircle(ctx, sx0, sy0 - s * 0.03, s * 0.038, 5, f.seed ^ 0x2f);
      ctx.fill();
      // Girth: down the visible flank to the belly, mid-seat.
      const gxm = gx(0.12 * hl, 0);
      const gym = gyy(0.12 * hl, 0);
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.leather, -10);
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(gxm, gym - bh * 0.94 - lift);
      ctx.lineTo(gxm, gym - look.chestH * tk * s * 0.5 - lift);
      ctx.stroke();
      // Stirrup leather: seat edge down the near flank to the iron,
      // on the same ruler the rider's boot lands on — a hung boot
      // with no strap is a floating boot. Side-on bands only; dead
      // ahead the legs own that column.
      if (Math.abs(f.fx) > 0.25) {
        const stx = gx(0.04 * hl, 0);
        const sty = gyy(0.04 * hl, 0);
        const ironY = sty - saddle.stirrupH * tk * s - lift;
        ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
        ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(stx, sty - bh * 0.98 - lift);
        ctx.lineTo(stx + f.fx * s * 0.02, ironY);
        ctx.stroke();
        ctx.strokeStyle = f.hurt ? '#ffffff' : '#55545c';
        ctx.lineWidth = Math.max(1.5, s * 0.025);
        ctx.beginPath();
        ctx.arc(stx + f.fx * s * 0.02, ironY + s * 0.022, s * 0.028, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
  );
}

/**
 * The courser's head: a long plain skull with pricked ears, the
 * muzzle running well past the cheek to a soft dark nose — the length
 * is what separates horse from deer at a glance. The forelock falls
 * between the ears in the mane's color.
 */
export function drawCourserHead(
  ctx: CanvasRenderingContext2D,
  look: CourserLook,
  o: { x: number; y: number; s: number; fx: number; fy: number; ys: number; hurt?: boolean },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Pricked ears, tighter and shorter than any deer's leaf.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.05;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.05) * ys - h * 0.42;
    const tx = bxr + px * es * w * 0.14;
    const ty = byr - h * 0.52;
    ctx.fillStyle = C(shade(look.coat, -8));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.09, byr + h * 0.06);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.11, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  // The forelock: mane falling between the ears onto the brow.
  ctx.strokeStyle = C(look.mane);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, w * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - fx * w * 0.1, cy - fy * w * 0.1 * ys - h * 0.5);
  ctx.lineTo(cx + fx * w * 0.12, cy + fy * w * 0.12 * ys - h * 0.16);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Long chamfered skull.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.24);
    ctx.restore();
  }

  // The long muzzle: the horse's whole argument. Runs a full head
  // farther than the deer's taper, square-ended, nose soft and dark.
  if (fy > -0.35) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.22;
    const by0 = cy + fy * w * 0.22 * ys + h * 0.1;
    const sl = w * (0.34 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    // The head axis BREAKS DOWN off the poll — seen side-on the nose
    // line falls near 45 degrees; head-on it stays a hung drop. This
    // angle is the whole difference between a horse and a llama.
    const ty = by0 + fy * sl * ys + h * (0.16 + 0.62 * profileK);
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    // The jaw DEEPENS at the cheek side-on (never narrows) and tapers
    // to a squared nose — the working head, not a stuffed sock.
    const hb = w * (0.19 + 0.055 * profileK);
    const ht = hb * 0.62;
    ctx.fillStyle = C(shade(look.coat, 4));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Soft nose block, plus the bit line where the rein meets.
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.03, ty - (ayv / al) * w * 0.03, w * 0.085, 5, fx);
    ctx.fill();
  }

  // Calm dark eyes, wide-set.
  if (fy > -0.45 && !o.hurt) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.06 + px * es * w * 0.32;
      const ey = cy + (fy * w * 0.06 + py * es * w * 0.32) * ys - h * 0.1;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(ex - s * 0.014, ey - s * 0.018, s * 0.028, s * 0.036);
    }
  }
}

/**
 * The night sabercat — the prestige saddle beast (THE ROAD GROWS
 * SHORT Phase 5). A cat is not a horse and is not painted like one:
 * low-slung length, shoulder blades riding ABOVE the spine line, a
 * deep waist tuck, flank stripes, a round skull with a short broad
 * muzzle, and the two ivory sabers that name it. It wears a HARNESS,
 * not a saddle: strap ring at the shoulders, low seat pad, breast
 * band. Ridden low — the seat sits where the cat's back actually is.
 */
export interface SabercatLook {
  coat: string;
  /** Flank banding — the saber stripe read. */
  stripe: string;
  under: string;
  earIn: string;
  eye: string;
  fang: string;
  /** Harness leather (the tack constant) and the seat pad's cloth. */
  leather: string;
  pad: string;
  bodyW: number;
  backH: number;
  /** The feline shoulder rise — blades above the spine at the walk. */
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}

export const SABERCAT_LOOKS: Record<string, SabercatLook> = {
  sabercat_night: {
    coat: '#4a4f63',
    stripe: '#343849',
    under: '#9aa0b5',
    earIn: '#2c2938',
    eye: '#c9d97a',
    fang: '#efe9da',
    leather: '#4a3423',
    pad: '#5d3550',
    bodyW: 0.19,
    backH: 0.5,
    shoulderH: 0.11,
    chestH: 0.24,
    tuckH: 0.34,
    headW: 0.3,
    headH: 0.24,
  },
};

export function paintSabercatBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SabercatLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Longer than the wolf's wedge, rump fuller — a cat is carried
  // between its shoulders and its haunches, not on a chest keel.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.78],
    [hl, hw * 0.78],
    [hl * 0.55, hw],
    [-hl * 0.4, hw * 0.96],
    [-hl, hw * 0.74],
    [-hl, -hw * 0.74],
    [-hl * 0.4, -hw * 0.96],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The feline topline: shoulder rise forward, a shallow dip, the
    // haunch swelling again over the rear legs.
    (X) =>
      look.backH +
      Math.max(0, X / hl - 0.15) * look.shoulderH -
      0.03 * Math.max(0, 1 - Math.abs(X / hl + 0.1) / 0.5) +
      0.05 * Math.max(0, -X / hl - 0.45),
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.55 - X / hl) / 1.1)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // Flank stripes: dark bands raking down-back from the spine to
      // mid-flank, seeded per body — the saber tiger's name written
      // on it. Long enough to survive daylight at world zoom.
      if (!f.hurt) {
        ctx.strokeStyle = shade(look.stripe, -8);
        ctx.lineCap = 'round';
        for (let k = 0; k < 5; k++) {
          const rr = ((((f.seed >>> (k % 11)) * 2654435761 + k * 131) >>> 0) % 1000) / 1000;
          const X = (-0.68 + 0.34 * k + (rr - 0.5) * 0.12) * hl;
          const sx0 = gx(X, 0);
          const sy0 = gyy(X, 0) - bh * (0.94 - 0.05 * (k % 2)) - lift;
          ctx.lineWidth = Math.max(1.8, s * (0.05 - 0.006 * (k % 2)));
          ctx.beginPath();
          ctx.moveTo(sx0, sy0);
          ctx.quadraticCurveTo(
            sx0 - f.fx * s * 0.045,
            sy0 + s * 0.1,
            sx0 - f.fx * s * 0.09,
            sy0 + s * (0.2 + 0.03 * rr),
          );
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // Pale bib at the chest (the wolf's law: only while the chest
      // can face the camera).
      if (f.fy > -0.15 && !f.hurt) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.86, 0),
          gyy(hl * 0.86, 0) - (look.chestH + 0.1) * s,
          hw * s * 0.78,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
      // ---- THE HARNESS (SABER_SADDLE ruler): a low seat pad between
      // the shoulder rise and the haunch, shoulder strap ring forward,
      // breast band dropping at the chest line. No blanket, no cantle:
      // a cat is ridden close.
      const px0 = gx(-0.04 * hl * 2, 0);
      const py0 = gyy(-0.04 * hl * 2, 0) - bh * 0.98 - lift;
      const px1 = gx(0.26 * hl, 0);
      const py1 = gyy(0.26 * hl, 0) - bh * 0.98 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.pad;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, s * 0.11);
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.stroke();
      // The strap ring at the shoulders and its girth line.
      const rgx = gx(0.34 * hl, 0);
      const rgy = gyy(0.34 * hl, 0);
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.leather, -8);
      ctx.lineWidth = Math.max(1.8, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(rgx, rgy - bh * 1.02 - lift);
      ctx.lineTo(rgx, rgy - look.chestH * tk * s * 0.5 - lift);
      ctx.stroke();
      // The pommel horn on the strap ring — the rider's grip point,
      // on the same ruler the hands settle to.
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 10);
      ctx.beginPath();
      facetCircle(ctx, px1, py1 - s * 0.035, s * 0.04, 5, f.seed ^ 0x59);
      ctx.fill();
      ctx.lineCap = 'butt';
    },
  );
}

/**
 * The sabercat head: a round skull where the wolf carries a slab, a
 * short broad muzzle where the wolf runs a spike, blunt round-backed
 * ears, pale-gold eyes, and the two ivory sabers dropping past the
 * jaw — visible at every facing the muzzle is, because they ARE the
 * animal.
 */
export function drawSabercatHead(
  ctx: CanvasRenderingContext2D,
  look: SabercatLook,
  o: { x: number; y: number; s: number; fx: number; fy: number; ys: number; hurt?: boolean; dead?: boolean },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Blunt round-backed ears, set wide and low.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.08;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.08) * ys - h * 0.34;
    const tx = bxr + px * es * w * 0.12;
    const ty = byr - h * 0.5;
    ctx.fillStyle = C(shade(look.coat, -6));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.15, byr + h * 0.04);
    ctx.quadraticCurveTo(tx - px * es * w * 0.02, ty, tx + px * es * w * 0.1, byr - h * 0.1);
    ctx.lineTo(bxr + px * es * w * 0.16, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.04, byr);
      ctx.lineTo(bxr + (tx - bxr) * 0.55, byr + (ty - byr) * 0.55);
      ctx.lineTo(bxr + px * es * w * 0.09, byr + h * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Round skull: deeper chamfers than any canid — the cat's circle.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
  }

  // Short broad muzzle + THE SABERS. The muzzle barely leaves the
  // skull (the feline read); the fangs drop from its leading corners,
  // splayed a whisker outward, ivory over everything.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.12;
    const sl = w * (0.14 + 0.12 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.06;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.2 * (1 - profileK * 0.15);
    const ht = hb * 0.85;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Dark nose leather at the muzzle tip.
    ctx.fillStyle = C(look.earIn);
    ctx.beginPath();
    facetCircle(ctx, tx, ty - h * 0.04, w * 0.06, 5, fx);
    ctx.fill();
    // The sabers: two tapered ivory drops off the muzzle corners.
    if (!o.hurt) {
      ctx.fillStyle = look.fang;
      for (const es of [-1, 1]) {
        // At full profile the far saber hides behind the near one.
        if (Math.abs(fx) > 0.75 && es * py < 0) continue;
        const fx0 = tx + nx * es * ht * 0.72;
        const fy0 = ty + ny * es * ht * 0.72 + h * 0.06;
        const drop = h * 0.52;
        ctx.beginPath();
        ctx.moveTo(fx0 - w * 0.035, fy0);
        ctx.lineTo(fx0 + w * 0.035, fy0);
        ctx.lineTo(fx0 + px * es * w * 0.03 + fx * w * 0.02, fy0 + drop);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The eyes: pale gold-green, set wide, unblinking.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.08 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.08 + py * es * w * 0.3) * ys - h * 0.12;
      ctx.fillStyle = o.hurt ? '#ffffff' : look.eye;
      ctx.fillRect(ex - s * 0.016, ey - s * 0.014, s * 0.032, s * 0.028);
      if (!o.hurt) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(ex - s * 0.005, ey - s * 0.012, s * 0.01, s * 0.024);
      }
    }
  }
}

/**
 * The lynx: the tufted shadow of the deep wood, designed around FOUR
 * reads no other beast owns — black EAR TUFTS spiking off triangular
 * ears, the pale facial RUFF framing the face in fur chops, a
 * black-tipped BOBTAIL perched high, and a RUMP-HIGH topline on legs
 * longer than a wolf's (the cat's mass sits over its haunches, the
 * inverse of the wolf's shoulder keel). Rosette spots write the coat.
 */
export interface LynxLook {
  coat: string;
  /** Rosette ink — the spots that name the cat. */
  rosette: string;
  under: string;
  /** Dark streaks seaming the pale ruff chops. */
  ruffDark: string;
  earIn: string;
  /** Ear-tuft and tail-tip ink. Tufts are STROKES (the fur-dialect law). */
  tuft: string;
  eye: string;
  /** Nose-leather ink — the downward triangle every cat face carries. */
  nose: string;
  bodyW: number;
  backH: number;
  /** The cat carries its mass BEHIND: extra height ramped over the haunches. */
  haunchH: number;
  /** A modest shoulder rise — always below the haunch line. */
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
  /**
   * The duskruff dresses further: the storm mantle, silver grizzle,
   * and the old scar rake. Champions never roll a cluster — the
   * duskruff is a DESIGN (the packlord law).
   */
  champion?: boolean;
  grizzle?: string;
  scar?: string;
  seed?: number;
}

export const LYNX_LOOKS: Record<string, LynxLook> = {
  lynx: {
    coat: '#9c7f55',
    rosette: '#5d4a33',
    under: '#d8cdb4',
    ruffDark: '#4a3c2c',
    earIn: '#3d3226',
    tuft: '#332e2a',
    eye: '#cfd97a',
    nose: '#7a4448',
    bodyW: 0.15,
    backH: 0.47,
    haunchH: 0.12,
    shoulderH: 0.045,
    chestH: 0.24,
    tuckH: 0.35,
    headW: 0.27,
    headH: 0.225,
  },
  // The year's litter: the head and paws lead the body — cub
  // proportions, rolled into the same coat clusters as the tribe.
  lynx_young: {
    coat: '#9c7f55',
    rosette: '#5d4a33',
    under: '#d8cdb4',
    ruffDark: '#4a3c2c',
    earIn: '#3d3226',
    tuft: '#332e2a',
    eye: '#cfd97a',
    nose: '#7a4448',
    bodyW: 0.125,
    backH: 0.39,
    haunchH: 0.1,
    shoulderH: 0.035,
    chestH: 0.19,
    tuckH: 0.29,
    headW: 0.25,
    headH: 0.21,
  },
  // The duskruff: storm-slate where the pack runs tawny, and marked in
  // SILVER rosettes — the inverse of the pack's dark spots, the way
  // the dire wolf's brush ends pale where the pack's ends dark. Her
  // ONE silhouette element is THE GREAT RUFF: a storm collar of
  // layered fur chops no lean lynx carries.
  lynx_champion: {
    coat: '#565064',
    rosette: '#8d8a9c',
    under: '#9d99a8',
    ruffDark: '#3a3546',
    earIn: '#322d3c',
    tuft: '#332e3a',
    eye: '#ffd24d',
    nose: '#403a4c',
    bodyW: 0.2,
    backH: 0.58,
    haunchH: 0.17,
    shoulderH: 0.06,
    chestH: 0.27,
    tuckH: 0.42,
    headW: 0.34,
    headH: 0.27,
    champion: true,
    grizzle: '#8f8c9e',
    scar: '#8a8494',
  },
};

/**
 * THE COAT CLUSTERS (the gnoll law, spoken feline): four curated wild
 * colorways a spawned tribe spreads across — never a random hue roll,
 * always one of the four coats the wood actually breeds.
 */
const LYNX_CLUSTERS: ReadonlyArray<Pick<LynxLook, 'coat' | 'under' | 'rosette' | 'ruffDark'>> = [
  // Dun — the common tawny.
  { coat: '#9c7f55', under: '#d8cdb4', rosette: '#5d4a33', ruffDark: '#4a3c2c' },
  // Ash — the grey shade of the old burns.
  { coat: '#8a8a80', under: '#cfcabb', rosette: '#54514a', ruffDark: '#45423c' },
  // Rufous — the red cats of the bracken slopes.
  { coat: '#a4744a', under: '#d9c4a4', rosette: '#66452c', ruffDark: '#523823' },
  // Frost — the pale winter-born.
  { coat: '#b0a98f', under: '#e2dcc8', rosette: '#6a5f4c', ruffDark: '#57503f' },
];

const LYNX_LOOK_CACHE = new Map<string, LynxLook>();

export function lynxLook(defId: string, seed = 0): LynxLook {
  const base = LYNX_LOOKS[defId] ?? LYNX_LOOKS['lynx']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = LYNX_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: LynxLook;
  if (defId === 'lynx' || defId === 'lynx_young') {
    // Hash the seed before picking: knot members spawn with
    // CONSECUTIVE eids, and raw high bits would dress a whole tribe
    // in one coat — the hash spreads a spawned ambush across the
    // clusters (the gnoll lesson, kept).
    const h = (seed * 2654435761) | 0;
    const cl = LYNX_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      coat: shade(cl.coat, jit),
      under: cl.under,
      rosette: shade(cl.rosette, jit),
      ruffDark: cl.ruffDark,
      seed,
    };
  } else {
    // The duskruff holds her authored design.
    look = { ...base, seed };
  }
  LYNX_LOOK_CACHE.set(key, look);
  return look;
}

export function paintLynxBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: LynxLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // The cat's wedge runs BACKWARD: the rump carries the width and the
  // chest tapers — the inverse of the wolf's chest keel, and the
  // second thing (after the topline) that says feline at world zoom.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.74],
    [hl, hw * 0.74],
    [hl * 0.5, hw * 0.92],
    [-hl * 0.35, hw],
    [-hl, hw * 0.8],
    [-hl, -hw * 0.8],
    [-hl * 0.35, -hw],
    [hl * 0.5, -hw * 0.92],
  ];
  // Tribe variance: each cat's coat sits a step off the cluster tone.
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // THE RUMP-HIGH TOPLINE: a modest shoulder rise forward, a shallow
    // spine dip, then the haunches SWELL PAST the shoulder line — the
    // coiled-spring rear that fires the pounce. At the very front the
    // NECK ROOT falls away out of the shoulders: the prowler head
    // hangs off a descending slope, never off a flat prism wall.
    (X) =>
      look.backH +
      look.shoulderH * Math.max(0, X / hl - 0.25) -
      0.035 * Math.max(0, 1 - Math.abs(X / hl - 0.1) / 0.5) +
      look.haunchH * Math.max(0, (-X / hl - 0.05) / 0.75) -
      0.07 * Math.max(0, (X / hl - 0.62) / 0.38),
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 1.05)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // The duskruff's storm mantle: a darker cape over shoulders and
      // spine, laid FIRST so her silver reads against it.
      if (look.champion && !f.hurt) {
        ctx.save();
        ctx.translate(gx(hl * 0.05, 0), gyy(hl * 0.05, 0) - bh * 0.94 - lift);
        ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
        ctx.fillStyle = shade(coat, -12);
        ctx.beginPath();
        facetBlob(ctx, 0, 0, hl * s * 0.8, f.seed | 1, 9, (hw * 1.2) / (hl * 0.8), 0.35);
        ctx.fill();
        ctx.restore();
      }
      // THE ROSETTES: seeded spot rows riding the back and upper
      // flanks — big enough to survive daylight at world zoom, never
      // a stipple. Each cat's spots land differently.
      if (!f.hurt) {
        ctx.fillStyle = look.champion ? (look.grizzle ?? look.rosette) : look.rosette;
        for (let k = 0; k < 8; k++) {
          const rr = ((((f.seed >>> (k % 13)) * 2654435761 + k * 197) >>> 0) % 1000) / 1000;
          const X = (-0.78 + 0.22 * k + (rr - 0.5) * 0.1) * hl;
          const Y = ((k & 1) === 0 ? 1 : -1) * hw * (0.2 + 0.34 * rr);
          const sx = gx(X, Y);
          const sy = gyy(X, Y) - bh * (0.82 + 0.1 * rr) - lift;
          ctx.beginPath();
          facetCircle(ctx, sx, sy, s * (0.024 + 0.014 * rr), 5, (f.seed >>> k) | 1);
          ctx.fill();
        }
        // The scar rake: three pale lines across the duskruff's near
        // haunch — the seasons she's won, fur that never grew back.
        if (look.champion && look.scar) {
          ctx.strokeStyle = look.scar;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const sx = gx(-hl * (0.5 + 0.06 * i), hw * 0.5);
            const sy = gyy(-hl * (0.5 + 0.06 * i), hw * 0.5) - bh * (0.5 - 0.05 * i) - lift;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - f.fx * s * 0.02 + s * 0.012, sy + s * 0.075);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
      // Pale bib at the chest — the wolf's law: only while the chest
      // can actually face the camera.
      if (f.fy > -0.15 && !f.hurt) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.86, 0),
          gyy(hl * 0.86, 0) - (look.chestH + 0.1) * s,
          hw * s * 0.8,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
    },
  );
}

/**
 * THE MUSCLED LIMB: the lynx's leg is drawn as MASS, never as stick
 * strokes — a filled haunch ball feeding a tapered thigh, a slim hock,
 * and the oversized paw a snow-cat actually stands on. Every shape is
 * built in the solved bones' own frames (hip→knee, knee→paw), so the
 * masses articulate honestly through all eight facing bands, the
 * pounce stretch, and every mid-turn joint memory — flat value planes
 * per the forge law, one coat family per cluster.
 */
export function drawCatLimb(
  ctx: CanvasRenderingContext2D,
  o: {
    hipX: number;
    hipY: number;
    kx: number;
    ky: number;
    ex: number;
    ey: number;
    /** Upper-leg thickness in px (spec.legW × scale). */
    w: number;
    s: number;
    hind: boolean;
    coat: string;
    champion: boolean;
    /** Far-side legs step into shadow so pairs never merge mid-stride. */
    far: boolean;
    hurt: boolean;
  },
): void {
  const { hipX, hipY, kx, ky, ex, ey, w, s, hind } = o;
  const dim = o.far ? -13 : 0;
  const C = (c: string): string => (o.hurt ? '#ffffff' : shade(c, dim));
  // Segment frames.
  const u1x = kx - hipX;
  const u1y = ky - hipY;
  const l1 = Math.hypot(u1x, u1y) || 1e-4;
  const p1x = -u1y / l1;
  const p1y = u1x / l1;
  const u2x = ex - kx;
  const u2y = ey - ky;
  const l2 = Math.hypot(u2x, u2y) || 1e-4;
  const p2x = -u2y / l2;
  const p2y = u2x / l2;

  // The thigh (or upper arm): a tapered quad, broad at the body and
  // pulling in toward the joint. The hind thigh is the biggest muscle
  // on the animal; the foreleg column runs leaner.
  const wHip = w * (hind ? 1.35 : 1.05);
  const wKnee = w * (hind ? 0.62 : 0.58);
  ctx.fillStyle = C(shade(o.coat, hind ? -10 : -14));
  ctx.beginPath();
  ctx.moveTo(hipX + p1x * wHip, hipY + p1y * wHip);
  ctx.lineTo(kx + p1x * wKnee, ky + p1y * wKnee);
  ctx.lineTo(kx - p1x * wKnee, ky - p1y * wKnee);
  ctx.lineTo(hipX - p1x * wHip, hipY - p1y * wHip);
  ctx.closePath();
  ctx.fill();

  // The shank: hock or forearm, slim and tapering to the ankle.
  const wShin = w * 0.55;
  const wAnkle = w * 0.4;
  ctx.fillStyle = C(shade(o.coat, -22));
  ctx.beginPath();
  ctx.moveTo(kx + p2x * wShin, ky + p2y * wShin);
  ctx.lineTo(ex + p2x * wAnkle, ey + p2y * wAnkle);
  ctx.lineTo(ex - p2x * wAnkle, ey - p2y * wAnkle);
  ctx.lineTo(kx - p2x * wShin, ky - p2y * wShin);
  ctx.closePath();
  ctx.fill();

  // Joint fill: a disc bridging the two quads so the knee/hock never
  // opens a wedge of daylight mid-stride.
  ctx.fillStyle = C(shade(o.coat, -16));
  ctx.beginPath();
  ctx.arc(kx, ky, w * 0.58, 0, Math.PI * 2);
  ctx.fill();

  // THE HAUNCH BALL (hind) / shoulder chip (fore): the muscle mass
  // seated over the limb's root, riding the thigh's own angle so it
  // rolls with the stride instead of sticking to the body like a
  // decal. This is what makes the leg read FED, not scrawny.
  const massR = w * (hind ? 1.6 : 1.1);
  const mx = hipX + (u1x / l1) * l1 * (hind ? 0.2 : 0.16);
  const my = hipY + (u1y / l1) * l1 * (hind ? 0.2 : 0.16);
  ctx.fillStyle = C(shade(o.coat, hind ? -5 : -9));
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(Math.atan2(u1y, u1x));
  ctx.beginPath();
  ctx.ellipse(0, 0, massR, massR * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();
  // One quiet under-edge on the mass — a stroke, never a bright rim —
  // so the muscle separates from the flank it overlaps.
  if (!o.hurt) {
    ctx.strokeStyle = shade(o.coat, -30 + dim);
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.ellipse(0, 0, massR, massR * 0.76, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();

  // THE PAW: broad and snowshoe-big, seated square on the shank's own
  // axis, with the toe cleft seams that read at the sheet zoom and
  // vanish quietly at world zoom.
  const pw = w * 0.95;
  const shinA = Math.atan2(ey - ky, ex - kx);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(shinA - Math.PI / 2);
  ctx.fillStyle = C(shade(o.coat, -32));
  ctx.beginPath();
  ctx.ellipse(0, pw * 0.1, pw * 0.72, pw * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!o.hurt && s > 100) {
    ctx.strokeStyle = shade(o.coat, -48 + dim);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.lineCap = 'round';
    for (const t of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(t * pw * 0.4, pw * 0.22);
      ctx.lineTo(t * pw * 0.48, pw * 0.5);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  ctx.restore();
}

/**
 * The lynx head: a round feline skull wearing the THREE face reads —
 * tall triangular ears firing black TUFTS off their tips, the pale
 * RUFF chops framing the jaw like a layered beard, and slanted
 * gold-green eyes. The muzzle barely leaves the skull (the feline
 * law); mid-snarl the ears pin, the tufts rake back, the jaw gapes.
 */
export function drawLynxHead(
  ctx: CanvasRenderingContext2D,
  look: LynxLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** 0..1 quick idle ear twitch. */
    flick?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;
  const great = look.champion === true;

  // Tall triangular ears set high on the crown, pinned flat mid-snarl,
  // the near one twitching at idle. The along-facing stagger keeps the
  // pair from collapsing into one sliver at full profile.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.09;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.09) * ys - h * 0.36;
    const pin = Math.min(1, snarl * 0.7 + (es > 0 ? (o.flick ?? 0) * 0.35 : 0));
    const tx = bxr + px * es * w * 0.12 - fx * w * 0.24 * pin;
    const ty = byr - h * (0.72 - 0.34 * pin) - fy * w * 0.24 * pin * ys;
    ctx.fillStyle = C(shade(look.coat, -6));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.16, byr + h * 0.05);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.18, byr + h * 0.11);
    ctx.closePath();
    ctx.fill();
    // THE TUFT: the black spike off the ear tip — a stroke, never a
    // fill (the fur-dialect law), riding the ear's own axis so it
    // pins and rakes with the snarl.
    if (!o.dead) {
      const al = Math.hypot(tx - bxr, ty - byr) || 1e-4;
      const ux = (tx - bxr) / al;
      const uy = (ty - byr) / al;
      const tlen = w * (great ? 0.38 : 0.3);
      ctx.strokeStyle = C(look.tuft);
      ctx.lineWidth = Math.max(1.4, w * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + ux * tlen, ty + uy * tlen);
      ctx.stroke();
      // The duskruff's tufts end SILVER — her winters, worn high.
      if (great && !o.hurt && look.grizzle) {
        ctx.strokeStyle = look.grizzle;
        ctx.lineWidth = Math.max(1, w * 0.05);
        ctx.beginPath();
        ctx.moveTo(tx + ux * tlen * 0.72, ty + uy * tlen * 0.72);
        ctx.lineTo(tx + ux * tlen, ty + uy * tlen);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.05, byr + h * 0.01);
      ctx.lineTo(bxr + (tx - bxr) * 0.58, byr + (ty - byr) * 0.58);
      ctx.lineTo(bxr + px * es * w * 0.1, byr + h * 0.06);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Round skull: the cat's circle — deep chamfers, no canid slab.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.18, w, h * 0.32);
    ctx.restore();
  }

  // THE RUFF: layered fur chops hanging off the skull's lower sides —
  // the framed face that reads "lynx" before the tufts do. Broad
  // overlapping wedges, never fang-thin spikes; a FACE frame, so it
  // hides as the head turns away (from behind it read as tusks). The
  // duskruff's great ruff runs a third chop per side and wider.
  if (!o.hurt && fy > -0.35) {
    const chops = great ? 3 : 2;
    for (const es of [-1, 1]) {
      // At full profile the far side's ruff hides behind the skull.
      if (Math.abs(fx) > 0.75 && es * py < 0) continue;
      for (let i = 0; i < chops; i++) {
        const spread = 0.3 + i * (great ? 0.18 : 0.22);
        const rx = cx + px * es * w * spread + fx * w * 0.06;
        const ry = cy + (py * es * w * spread + fy * w * 0.06) * ys + h * (0.16 + i * 0.05);
        const drop = h * (great ? 0.42 - i * 0.07 : 0.34 - i * 0.06);
        ctx.fillStyle = C(look.under);
        ctx.beginPath();
        ctx.moveTo(rx - px * es * w * 0.18, ry - h * 0.14);
        ctx.lineTo(rx + px * es * w * (0.17 + i * 0.03), ry - h * 0.02);
        ctx.lineTo(rx + px * es * w * 0.04, ry + drop);
        ctx.closePath();
        ctx.fill();
        // The dark seam streaking each chop — a stroke, per the law.
        ctx.strokeStyle = C(look.ruffDark);
        ctx.lineWidth = Math.max(1, w * 0.035);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx, ry - h * 0.04);
        ctx.lineTo(rx + px * es * w * 0.02, ry + drop * 0.62);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
    // The chin beard — short and broad, front-facing only.
    if (fy > -0.1) {
      const bx0 = cx + fx * w * 0.18;
      const by0 = cy + fy * w * 0.18 * ys + h * 0.32;
      ctx.fillStyle = C(look.under);
      ctx.beginPath();
      ctx.moveTo(bx0 - w * 0.13, by0 - h * 0.08);
      ctx.lineTo(bx0 + w * 0.13, by0 - h * 0.08);
      ctx.lineTo(bx0, by0 + h * (great ? 0.22 : 0.18));
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- THE CAT FACE. No canid wedge, ever: a cat's face is FLAT.
  // The pale muzzle PLATE with its split whisker pads sits ON the
  // skull and barely leaves it at profile — the one read that says
  // feline before anything else. Gone from behind (the muzzle law).
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    // The plate slides toward the leading edge as the head turns and
    // narrows — the flat face holding its read side-on.
    const sl = w * (0.08 + 0.08 * profileK);
    const mx = cx + fx * (w * 0.2 + sl);
    const my = cy + fy * (w * 0.2 + sl) * ys + h * 0.17;
    const prx = w * 0.23 * (1 - 0.3 * profileK);
    const pry = h * 0.185;
    ctx.fillStyle = C(look.under);
    ctx.beginPath();
    ctx.ellipse(mx, my, prx, pry, 0, 0, Math.PI * 2);
    ctx.fill();
    // The whisker pads: two bumps splitting the upper lip.
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      ctx.fillStyle = C(shade(look.under, 7));
      ctx.beginPath();
      ctx.ellipse(
        mx + px * es * prx * 0.42,
        my - pry * 0.28,
        prx * 0.42,
        pry * 0.5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    // The nose leather: the downward triangle, seated where the pads
    // meet.
    const nx = mx;
    const ny = my - pry * 0.62;
    const nw = w * 0.075 * (1 - 0.2 * profileK);
    ctx.fillStyle = C(look.nose);
    ctx.beginPath();
    ctx.moveTo(nx - nw, ny - h * 0.035);
    ctx.lineTo(nx + nw, ny - h * 0.035);
    ctx.lineTo(nx, ny + h * 0.05);
    ctx.closePath();
    ctx.fill();
    // The philtrum: nose to lip split — a stroke, per the law.
    if (!o.hurt) {
      ctx.strokeStyle = look.ruffDark;
      ctx.lineWidth = Math.max(1, w * 0.022);
      ctx.beginPath();
      ctx.moveTo(nx, ny + h * 0.05);
      ctx.lineTo(nx, my + pry * 0.5);
      ctx.stroke();
    }
    // The chin drop below the plate, front-facing only.
    if (fy > 0) {
      ctx.fillStyle = C(shade(look.under, -4));
      ctx.beginPath();
      ctx.ellipse(mx, my + pry * 1.05, prx * 0.4, pry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Whiskers: sheet-zoom detail off the pads; they vanish quietly
    // at world zoom.
    if (!o.hurt && !o.dead && s > 110 && fy > 0.05) {
      ctx.strokeStyle = 'rgba(238, 232, 214, 0.75)';
      ctx.lineWidth = Math.max(0.8, w * 0.012);
      for (const es of [-1, 1]) {
        for (const wa of [0.12, 0.3]) {
          ctx.beginPath();
          ctx.moveTo(mx + px * es * prx * 0.55, my - pry * 0.2 + wa * pry);
          ctx.lineTo(
            mx + px * es * (prx * 0.55 + w * 0.3),
            my - pry * 0.1 + wa * pry * 2.4,
          );
          ctx.stroke();
        }
      }
    }
    // Snarl: the jaw gapes below the plate, fangs bared.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.34 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(mx - prx * 0.72, my + pry * 0.5);
      ctx.lineTo(mx + prx * 0.72, my + pry * 0.5);
      ctx.lineTo(mx + fx * prx * 0.2, my + pry * 0.5 + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.5, 0.5]) {
        const fx0 = mx + ts * prx * 0.66;
        ctx.beginPath();
        ctx.moveTo(fx0 - w * 0.02, my + pry * 0.5);
        ctx.lineTo(fx0 + w * 0.02, my + pry * 0.5);
        ctx.lineTo(fx0, my + pry * 0.5 + gape * 0.55);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Crown stripes between the ears — the lynx's written forehead.
  if (!o.hurt && fy > -0.2) {
    ctx.strokeStyle = C(look.ruffDark);
    ctx.lineWidth = Math.max(1, w * 0.028);
    ctx.lineCap = 'round';
    for (const es of [-1, 0, 1]) {
      if (es !== 0 && Math.abs(fx) > 0.7 && es * py < 0) continue;
      const sx0 = cx + px * es * w * 0.13 + fx * w * (es === 0 ? -0.02 : -0.05);
      const sy0 = cy + py * es * w * 0.13 * ys - h * 0.42;
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + px * es * w * 0.03 + fx * w * 0.1, sy0 + h * 0.16 + fy * w * 0.1 * ys);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // Almond hunter's eyes: lined in dark, gold-green with the vertical
  // cat pupil and one fixed light chip — set forward on the flat
  // face. The far one hides as the head goes profile; none from
  // behind, none dead.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.26;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.26) * ys - h * 0.11;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.3 + snarl * 0.25));
      // The liner rim first, then the iris inside it.
      ctx.fillStyle = C(look.ruffDark);
      ctx.fillRect(-w * 0.1, -h * 0.062, w * 0.2, h * 0.124);
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.085, -h * 0.048, w * 0.17, h * 0.096);
      if (!o.hurt) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(-w * 0.018, -h * 0.048, w * 0.036, h * 0.096);
        ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
        ctx.fillRect(w * 0.03, -h * 0.04, w * 0.026, h * 0.03);
      }
      ctx.restore();
      // The tear-line: the dark streak from the inner eye down the
      // muzzle's side — the lynx's war-paint, its signature stripe.
      if (!o.hurt && fy > -0.15) {
        ctx.strokeStyle = C(look.ruffDark);
        ctx.lineWidth = Math.max(1, w * 0.026);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - px * es * w * 0.06, ey + h * 0.05);
        ctx.quadraticCurveTo(
          ex - px * es * w * 0.02 + fx * w * 0.04,
          ey + h * 0.16,
          ex - px * es * w * 0.05 + fx * w * 0.07,
          ey + h * 0.26,
        );
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
  }
}

export function drawBeast(
  ctx: CanvasRenderingContext2D,
  opts: {
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
    feet: Array<{ x: number; y: number; lift: number }>;
    /** Camera y foreshorten for body-frame offsets. */
    yScale: number;
    walkPhase: number;
    hurt: boolean;
    /** Per-leg joint-side hysteresis, owned by the caller's anim state. */
    kneeMemory: number[];
    /** 0..1 through an attack: crouch back, then pounce. */
    attackT?: number;
    /** Stable per-entity seed — patch layouts differ cow to cow. */
    seed?: number;
    /** Clock for idle life (cud chewing, tail swish, ear time). */
    nowMs?: number;
    /**
     * THE RIDER SEAM: drawn between the near legs and a down-screen
     * head — the one slot where a body on the saddle reads correctly
     * at every facing (behind the neck coming toward camera, over the
     * barrel going away).
     */
    rider?: () => void;
    /**
     * THE SIMULATED TAIL: when the caller ticks a physics tail
     * (BobtailSim on its anim map), this paints the projected nodes.
     * drawBeast keeps the depth law (tailFront) and skips its
     * analytic stub; callers without a sim (portraits, the CMS
     * viewport) fall back to the analytic pose.
     */
    tail?: () => void;
    /**
     * THE COLLAR TELLS THE TALE (beastcraft v2): strap color for a
     * tamed body — worn gear in the saddle's tradition, never a
     * palette swap. Absent on every wild thing.
     */
    collar?: string;
    /**
     * THE FLEECE TELLS THE TIME (sheep only): true while the wool
     * regrows — the painter trades the cloud for the clipped trim.
     */
    shorn?: boolean;
  },
): void {
  const s = opts.scale;
  const r = opts.radius * s;
  const spec = opts.spec;
  const ys = opts.yScale;
  const fx = Math.cos(opts.dir);
  const fy = Math.sin(opts.dir);
  const px = -fy;
  const py = fx;

  // Telegraphed pounce: rock back through the windup (matching the
  // server's 300ms telegraph), then snap forward for the strike. Only
  // the BODY lunges — the feet stay planted and the IK legs stretch
  // into the strike, which is what sells the weight.
  const at = opts.attackT ?? 0;
  let bx = opts.x;
  let by = opts.y;
  if (at > 0) {
    const pounce =
      at < 0.7
        ? -0.12 * (at / 0.7) // crouch away
        : 0.3 * Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)); // strike!
    bx += fx * pounce * s;
    by += fy * pounce * s * ys;
  }
  const color = opts.hurt ? '#ffffff' : opts.color;
  const len = spec.bodyLen * s;

  // The body rides the legs: height from the spec, dipping with bob,
  // plus a subtle roll toward whichever side is mid-swing.
  const bodyY = by - (spec.bodyRise + opts.pose.bob * 0.35) * s;
  let roll = 0;
  for (let i = 0; i < spec.rig.legs.length; i++) {
    roll += (opts.feet[i]?.lift ?? 0) * -Math.sign(spec.rig.legs[i]!.side);
  }
  roll *= 0.2;

  // ---- legs: two-segment IK from body-frame hips to planted feet.
  // Far-side legs draw behind the body mass, near-side in front.
  const L = (spec.rig.legLen / 2) * s;
  const stretch = spec.rig.stretch ?? 1.15;
  // The stable per-entity seed, hoisted above the legs: the lynx limb
  // painter jitters its muscle coat off the SAME hash the body wears.
  let seed = 0;
  for (let i = 0; i < opts.defId.length; i++) {
    seed = (seed * 31 + opts.defId.charCodeAt(i)) | 0;
  }
  seed = (seed ^ ((opts.seed ?? 0) * 2654435761)) | 0;
  // A lynx's legs wear its ROLLED cluster coat, not the def color —
  // an ash cat on tawny stockings read as a stranger's legs. The full
  // look resolves here (cached) so the bespoke limb painter can dress
  // muscle, not strokes.
  const lynxLegL = opts.defId.startsWith('lynx') ? lynxLook(opts.defId, opts.seed ?? 0) : undefined;
  const legBase = lynxLegL ? lynxLegL.coat : opts.color;
  const legColor = opts.hurt ? '#ffffff' : (spec.legColor ?? shade(legBase, -35));
  const shinColor = opts.hurt ? '#ffffff' : (spec.legColor ?? shade(legBase, -22));
  const footColor = opts.hurt ? '#ffffff' : shade(spec.legColor ?? legBase, -55);
  const drawLeg = (i: number): void => {
    const foot = opts.feet[i];
    const leg = spec.rig.legs[i];
    if (!foot || !leg) return;
    // Hip: body-frame attach point, projected like the world plane and
    // raised to the rig's (crouch-scaled) hip height.
    const hf = leg.fwd * spec.hipFwd;
    const hs = leg.side * spec.hipSide;
    const wx = fx * hf - fy * hs;
    const wy = fy * hf + fx * hs;
    const hipX = bx + wx * s;
    const hipY = by + wy * s * ys - opts.pose.rise * s;
    const footY = foot.y - foot.lift * s;
    // Anatomical joint preference: along the facing (front knees bow
    // forward, hocks and bird ankles backward) plus a SCREEN-space
    // outward lean from whichever side of the body this hip actually
    // sits on — front-on legs bow outward, never across the belly.
    // The outward sign comes from the projected hip, not the body
    // frame: body-frame lateral flips meaning as the facing crosses
    // the screen axis, which is what twisted knees mid-turn.
    const bow = spec.kneeFwd[i] ?? 1;
    const out = Math.sign(hipX - bx) || Math.sign(leg.side) || 1;
    const prefX = bow * fx * 0.9 + out * 0.45;
    const prefY = bow * fy * ys * 0.9;
    // Chord perpendicular, then a REMEMBERED side choice: hysteresis
    // stops the joint snapping 180° while a turning body carries the
    // pole past perpendicular to a still-planted leg.
    let ddx = foot.x - hipX;
    let ddy = footY - hipY;
    const dd = Math.hypot(ddx, ddy) || 1e-4;
    const cxn = -ddy / dd;
    const cyn = ddx / dd;
    const sign = chooseLimbSign(cxn, cyn, prefX, prefY, opts.kneeMemory[i] ?? 0);
    opts.kneeMemory[i] = sign;
    // Species with authored bone proportions run the unequal solve —
    // the cat's long thigh over its short hock is a SKELETON fact,
    // not a paint trick, so the joint sits where the anatomy puts it.
    const split = spec.segSplit ? (leg.fwd >= 0 ? spec.segSplit[0] : spec.segSplit[1]) : 0.5;
    const { ex, ey, kx, ky } =
      split === 0.5
        ? solveLimbInto(LEG_SOLVE, hipX, hipY, foot.x, footY, L, stretch, cxn * sign, cyn * sign)
        : solveLimb2Into(
            LEG_SOLVE,
            hipX,
            hipY,
            foot.x,
            footY,
            L * 2 * split,
            L * 2 * (1 - split),
            stretch,
            cxn * sign,
            cyn * sign,
          );

    // THE MUSCLED LIMB: the lynx never wears the stick strokes — its
    // legs are filled masses riding the solved bones at every facing.
    if (lynxLegL) {
      drawCatLimb(ctx, {
        hipX,
        hipY,
        kx,
        ky,
        ex,
        ey,
        w: spec.legW * s,
        s,
        hind: leg.fwd < 0,
        coat: shade(lynxLegL.coat, (((seed >>> 5) & 7) - 3) * 2),
        champion: lynxLegL.champion === true,
        // The far pair steps into shadow: without the tone step, two
        // same-coat legs mid-stride merge into one blob at profile.
        far: (opts.feet[i]?.y ?? opts.y) < opts.y,
        hurt: opts.hurt,
      });
      return;
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = legColor;
    ctx.lineWidth = Math.max(2, spec.legW * s);
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.strokeStyle = shinColor;
    ctx.lineWidth = Math.max(1.5, spec.legW * s * 0.78);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Feet: the species' contact chip.
    if (spec.foot === 'claw') {
      // Splayed bird toes, fanning along the facing.
      ctx.strokeStyle = footColor;
      ctx.lineWidth = Math.max(1.5, spec.legW * s * 0.7);
      ctx.lineCap = 'round';
      for (const t of CLAW_TOES) {
        const ta = opts.dir + t;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(ta) * 0.07 * s, ey + Math.sin(ta) * 0.07 * s * ys);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    } else if (spec.foot === 'hoof') {
      // Hoof block seated square on the shin's own axis.
      const hw = spec.legW * s * 1.5;
      const shinA = Math.atan2(ey - ky, ex - kx);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(shinA - Math.PI / 2);
      ctx.fillStyle = footColor;
      ctx.beginPath();
      chamferRect(ctx, -hw / 2, -hw * 0.35, hw, hw * 0.62, hw * 0.18);
      ctx.fill();
      ctx.restore();
    } else if (spec.foot === 'bearpaw') {
      // Broad pad with pale claws raking off its leading edge — drawn
      // in the shin's own frame so pad and rake follow the leg at
      // every facing, in the fur tone (not the near-black generic
      // foot shade).
      const pw = spec.legW * s * 1.45;
      const shinA = Math.atan2(ey - ky, ex - kx);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(shinA - Math.PI / 2);
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(spec.legColor ?? opts.color, -10);
      ctx.beginPath();
      ctx.ellipse(0, 0, pw * 0.62, pw * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = opts.hurt ? '#ffffff' : '#d8cbb2';
      ctx.lineWidth = Math.max(1.2, s * 0.02);
      ctx.lineCap = 'round';
      for (const t of BEARPAW_RAKE) {
        ctx.beginPath();
        ctx.moveTo(t * pw * 0.34, pw * 0.28);
        ctx.lineTo(t * pw * 0.44, pw * 0.58);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
    } else {
      // Paw chip aligned with the shin.
      const pw = spec.legW * s * 1.35;
      const shinA = Math.atan2(ey - ky, ex - kx);
      ctx.fillStyle = footColor;
      ctx.beginPath();
      ctx.ellipse(ex, ey, pw * 0.62, pw * 0.42, shinA - Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  // Depth split by where each foot ACTUALLY is, not its rest pose —
  // during a turn a planted foot can be anywhere around the body, and
  // classifying by home spec is what drew legs across faces.
  const farLegs: number[] = [];
  const nearLegs: number[] = [];
  for (let i = 0; i < spec.rig.legs.length; i++) {
    ((opts.feet[i]?.y ?? opts.y) < opts.y ? farLegs : nearLegs).push(i);
  }
  // ---- paint closures, composed in true depth order below. (The
  // per-entity seed hash is hoisted above the legs — the limb painter
  // shares it.)
  const cattle = CATTLE_LOOKS[opts.defId];
  const wolfL = opts.defId === 'wolf' ? WOLF_LOOK : undefined;
  const direL = opts.defId === 'dire_wolf' ? DIREWOLF_LOOK : undefined;
  const worgL = opts.defId === 'worg' ? WORG_LOOK : undefined;
  const ratL = opts.defId === 'rat' ? RAT_LOOK : undefined;
  const boarL = opts.defId === 'boar' ? BOAR_LOOK : undefined;
  const spiderL = opts.defId === 'giant_spider' ? SPIDER_LOOK : undefined;
  const ramL = opts.defId === 'ram' ? RAM_LOOK : undefined;
  const sheepL = opts.defId === 'sheep' ? SHEEP_LOOK : undefined;
  const stagL =
    opts.defId === 'stag' ? STAG_LOOK : opts.defId === 'hind' ? HIND_LOOK : undefined;
  const courserL =
    opts.defId.startsWith('courser') || opts.defId.startsWith('garron')
      ? (COURSER_LOOKS[opts.defId] ?? COURSER_LOOKS.courser_bay)
      : undefined;
  const sabercatL = opts.defId.startsWith('sabercat')
    ? (SABERCAT_LOOKS[opts.defId] ?? SABERCAT_LOOKS.sabercat_night)
    : undefined;
  // The tufted shadows: wild cats roll a coat CLUSTER from the spawn
  // eid; the duskruff holds her authored design.
  const lynxL = opts.defId.startsWith('lynx') ? lynxLook(opts.defId, opts.seed ?? 0) : undefined;
  const bearL = opts.defId === 'bear' ? BEAR_LOOK : undefined;
  const crabL = opts.defId === 'mudcrab' ? CRAB_LOOK : undefined;
  const beetleL = opts.defId === 'giant_beetle' ? BEETLE_LOOK : undefined;
  const idle = 1 - opts.pose.poleStrength;
  const now = opts.nowMs ?? 0;
  const blockFrame = (): BeastBlockFrame => ({
    bx,
    gy: by,
    s,
    fx,
    fy,
    ys,
    seed,
    hurt: opts.hurt,
    bob: opts.pose.bob,
    roll,
  });
  const paintBody = (): void => {
    if (lynxL) {
      paintLynxBody(ctx, spec, lynxL, blockFrame());
      return;
    }
    if (wolfL) {
      paintWolfBody(ctx, spec, wolfL, blockFrame());
      return;
    }
    if (direL) {
      paintDireWolfBody(ctx, spec, direL, blockFrame());
      return;
    }
    if (worgL) {
      paintWorgBody(ctx, spec, worgL, blockFrame());
      return;
    }
    if (ratL) {
      paintRatBody(ctx, spec, ratL, blockFrame());
      return;
    }
    if (boarL) {
      paintBoarBody(ctx, spec, boarL, blockFrame());
      return;
    }
    if (spiderL) {
      paintSpiderBody(ctx, spec, spiderL, blockFrame(), at);
      return;
    }
    if (ramL) {
      paintRamBody(ctx, spec, ramL, blockFrame());
      return;
    }
    if (sheepL) {
      paintSheepBody(ctx, spec, sheepL, blockFrame(), opts.shorn === true);
      return;
    }
    if (stagL) {
      paintStagBody(ctx, spec, stagL, blockFrame());
      return;
    }
    if (courserL) {
      paintCourserBody(ctx, spec, courserL, blockFrame(), saddleFor(opts.defId));
      return;
    }
    if (sabercatL) {
      paintSabercatBody(ctx, spec, sabercatL, blockFrame());
      return;
    }
    if (bearL) {
      paintBearBody(ctx, spec, bearL, blockFrame());
      return;
    }
    if (crabL) {
      paintCrabBody(ctx, spec, crabL, blockFrame(), at);
      return;
    }
    if (beetleL) {
      paintBeetleBody(ctx, spec, beetleL, blockFrame(), at);
      return;
    }
    if (cattle) {
      paintCattleBody(ctx, spec, cattle, {
        bx,
        gy: by,
        s,
        fx,
        fy,
        ys,
        seed,
        hurt: opts.hurt,
        bob: opts.pose.bob,
        roll,
        backH: cattle.backH,
        bellyH: cattle.bellyH,
      });
      return;
    }
    // Faceted low-poly mass along the facing — same dialect as the
    // boulders and canopies.
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(bx, bodyY);
    ctx.rotate(opts.dir + roll);
    ctx.beginPath();
    facetBlob(ctx, 0, 0, len, seed, 9, (r * 0.78) / len, 0.4);
    ctx.fill();
    // Flat back highlight facet.
    ctx.fillStyle = opts.hurt ? '#ffffff' : shade(opts.color, 14);
    ctx.beginPath();
    facetBlob(ctx, -len * 0.15, -r * 0.25, len * 0.5, seed ^ 0x5f5f, 7, (r * 0.32) / (len * 0.5), 1.1);
    ctx.fill();
    ctx.restore();
  };

  // Head anchor: a chicken pecks its head forward with each step.
  const peck = opts.defId === 'chicken' ? opts.pose.bob * 1.6 : 0;
  const headX = bx + fx * (len * 0.92 + peck * s);
  const headY = bodyY + fy * (len * 0.35 + peck * s * ys) - r * 0.15;
  const headR = r * (opts.defId === 'chicken' ? 0.5 : 0.55);
  const paintHead = (): void => {
    if (spiderL) return; // the spider's face lives in its body painter
    if (crabL || beetleL) return; // whole animal drawn by the body painter
    if (ramL) {
      const hl = spec.bodyLen * s;
      const hw2 = ramL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The charge drops the whole head into a battering line.
      const drop = at > 0 ? Math.min(1, at / 0.7) * 0.14 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.44);
      const chy = by + fy * (hl + hw2 * 0.44) * ys - ramL.backH * 0.98 * s - nod + drop;
      // Wool shoulder roll into the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(ramL.wool, -7);
      ctx.beginPath();
      const nb = ramL.backH * s + opts.pose.bob * 0.35 * s;
      const nwx = px * ramL.bodyW * 0.6 * s;
      const nwy = py * ramL.bodyW * 0.6 * s;
      ctx.moveTo(bx + fx * hl * 0.72 + nwx, by + (fy * hl * 0.72 + nwy) * ys - nb * 0.9);
      ctx.lineTo(bx + fx * hl * 0.72 - nwx, by + (fy * hl * 0.72 - nwy) * ys - nb * 0.9);
      ctx.lineTo(chx - px * hw2 * 0.4, chy - py * hw2 * 0.4 * ys + ramL.headH * s * 0.24);
      ctx.lineTo(chx + px * hw2 * 0.4, chy + py * hw2 * 0.4 * ys + ramL.headH * s * 0.24);
      ctx.closePath();
      ctx.fill();
      drawRamHead(ctx, ramL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        charge: at > 0 ? Math.min(1, at * 1.6) : 0,
      });
      return;
    }
    if (sheepL) {
      const shorn = opts.shorn === true;
      const backH = shorn ? sheepL.backHShorn : sheepL.backH;
      const tone = shorn ? sheepL.woolShorn : sheepL.wool;
      const hl = spec.bodyLen * s;
      const hw2 = sheepL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The graze: at rest the head sinks toward the grass on its own
      // slow clock — the yard's idle life, and it lifts on the move.
      const graze =
        now > 0 ? Math.max(0, Math.sin(now * 0.00042 + seed * 1.3)) * idle * 0.16 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.42);
      const chy = by + fy * (hl + hw2 * 0.42) * ys - backH * 0.92 * s - nod + graze;
      // Wool ruff into the skull — the clipped body keeps a thinner one.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(tone, -7);
      ctx.beginPath();
      const nb = backH * s + opts.pose.bob * 0.35 * s;
      const nwx = px * sheepL.bodyW * (shorn ? 0.45 : 0.58) * s;
      const nwy = py * sheepL.bodyW * (shorn ? 0.45 : 0.58) * s;
      ctx.moveTo(bx + fx * hl * 0.7 + nwx, by + (fy * hl * 0.7 + nwy) * ys - nb * 0.88);
      ctx.lineTo(bx + fx * hl * 0.7 - nwx, by + (fy * hl * 0.7 - nwy) * ys - nb * 0.88);
      ctx.lineTo(chx - px * hw2 * 0.38, chy - py * hw2 * 0.38 * ys + sheepL.headH * s * 0.24);
      ctx.lineTo(chx + px * hw2 * 0.38, chy + py * hw2 * 0.38 * ys + sheepL.headH * s * 0.24);
      ctx.closePath();
      ctx.fill();
      drawSheepHead(ctx, sheepL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        capTone: tone,
      });
      return;
    }
    if (stagL) {
      const hl = spec.bodyLen * s;
      const hw2 = stagL.headW * s;
      const nod = opts.pose.bob * 0.4 * s;
      // The alarm-charge levels the antlers: the high head drops.
      const drop = at > 0 ? Math.min(1, at / 0.7) * 0.2 * s : 0;
      const chx = bx + fx * (hl * 0.9 + hw2 * 0.5);
      const chy =
        by + fy * (hl * 0.9 + hw2 * 0.5) * ys - (stagL.backH + stagL.neckRise) * s - nod + drop;
      // The neck column — the proud riser that makes a deer read deer.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(stagL.coat, -6);
      ctx.beginPath();
      const nb = stagL.backH * 0.92 * s + opts.pose.bob * 0.35 * s;
      const nwx = px * stagL.bodyW * 0.52 * s;
      const nwy = py * stagL.bodyW * 0.52 * s;
      ctx.moveTo(bx + fx * hl * 0.68 + nwx, by + (fy * hl * 0.68 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.68 - nwx, by + (fy * hl * 0.68 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.32, chy - py * hw2 * 0.32 * ys + stagL.headH * s * 0.3);
      ctx.lineTo(chx + px * hw2 * 0.32, chy + py * hw2 * 0.32 * ys + stagL.headH * s * 0.3);
      ctx.closePath();
      ctx.fill();
      drawStagHead(ctx, stagL, { x: chx, y: chy, s, fx, fy, ys, hurt: opts.hurt });
      return;
    }
    if (courserL) {
      const hl = spec.bodyLen * s;
      const hw2 = courserL.headW * s;
      const nod = opts.pose.bob * 0.45 * s;
      // The head rides HIGH on the neck: not far past the chest, but
      // well above the back line — the proud carriage that separates
      // horse from hound at a glance.
      const chx = bx + fx * (hl * 0.86 + hw2 * 0.3);
      const chy =
        by +
        fy * (hl * 0.86 + hw2 * 0.3) * ys -
        (courserL.backH + courserL.neckRise) * s -
        nod;
      // The neck: a strong arched column off the withers, wide at the
      // shoulder, tapering under the jaw.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(courserL.coat, -5);
      ctx.beginPath();
      const nb = courserL.backH * 0.88 * s + opts.pose.bob * 0.35 * s;
      const nwx = px * courserL.bodyW * 0.78 * s;
      const nwy = py * courserL.bodyW * 0.78 * s;
      ctx.moveTo(bx + fx * hl * 0.6 + nwx, by + (fy * hl * 0.6 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.6 - nwx, by + (fy * hl * 0.6 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.3, chy - py * hw2 * 0.3 * ys + courserL.headH * s * 0.42);
      ctx.lineTo(chx + px * hw2 * 0.3, chy + py * hw2 * 0.3 * ys + courserL.headH * s * 0.42);
      ctx.closePath();
      ctx.fill();
      // The mane: the crest line first, then the fall — hung to one
      // seed-stable side so it reads at every facing.
      if (!opts.hurt) {
        ctx.strokeStyle = courserL.mane;
        ctx.lineCap = 'round';
        // Crest: one continuous stroke withers → poll.
        ctx.lineWidth = Math.max(2, s * 0.055);
        ctx.beginPath();
        ctx.moveTo(bx + fx * hl * 0.62, by + fy * hl * 0.62 * ys - nb - s * 0.02);
        ctx.quadraticCurveTo(
          bx + fx * hl * 0.78,
          by + fy * hl * 0.78 * ys - nb - courserL.neckRise * s * 0.75,
          chx - fx * hw2 * 0.2,
          chy - fy * hw2 * 0.2 * ys - courserL.headH * s * 0.3,
        );
        ctx.stroke();
        // The fall: a hanging ribbon of hair off the crest's rear
        // edge. Side-on it drapes BEHIND the neck line as one mass
        // (never a rope down the centerline); head-on it slims to the
        // top ridge. At speed the whole fall streams back.
        const run = opts.pose.poleStrength;
        const wxp = bx + fx * hl * 0.62;
        const wyp = by + fy * hl * 0.62 * ys - nb - s * 0.02;
        const pxp = chx - fx * hw2 * 0.2;
        const pyp = chy - fy * hw2 * 0.2 * ys - courserL.headH * s * 0.3;
        const cqx = bx + fx * hl * 0.78;
        const cqy = by + fy * hl * 0.78 * ys - nb - courserL.neckRise * s * 0.75;
        const slim = 0.35 + 0.65 * Math.min(1, Math.abs(fx) * 1.2);
        const offx = -fx * s * (0.055 + 0.05 * run) * slim;
        const offy = s * (0.11 - 0.04 * run) * slim;
        ctx.fillStyle = courserL.mane;
        ctx.beginPath();
        ctx.moveTo(wxp, wyp);
        ctx.quadraticCurveTo(cqx, cqy, pxp, pyp);
        ctx.lineTo(pxp + offx * 0.5, pyp + offy * 0.6);
        ctx.quadraticCurveTo(cqx + offx, cqy + offy, wxp + offx * 0.8, wyp + offy);
        ctx.closePath();
        ctx.fill();
        // Three loose strands off the ribbon's hem for texture.
        ctx.lineWidth = Math.max(1.5, s * 0.035);
        for (let k = 0; k < 3; k++) {
          const t = 0.2 + 0.3 * k;
          const hx = wxp + (pxp - wxp) * t + offx * (0.6 + 0.3 * (k % 2));
          const hy = wyp + (pyp - wyp) * t + offy * 0.8;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + offx * 0.6 - fx * s * 0.03 * run, hy + s * (0.05 + 0.015 * (k % 2)));
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
        // The rein: bit to pommel, sagging its own weight — tied, so
        // it never has to find a hand it can't see. Pale against the
        // coat (tack must READ), breathing with the gait.
        const bitX = chx + fx * hw2 * 0.5;
        const bitY = chy + fy * hw2 * 0.5 * ys + courserL.headH * s * 0.3;
        const pomX = bx + fx * COURSER_SADDLE.pommelFwd * s;
        const pomY = by + fy * COURSER_SADDLE.pommelFwd * s * ys - COURSER_SADDLE.pommelH * s;
        ctx.strokeStyle = shade(courserL.leather, 22);
        ctx.lineWidth = Math.max(1.5, s * 0.032);
        ctx.beginPath();
        ctx.moveTo(bitX, bitY);
        ctx.quadraticCurveTo(
          (bitX + pomX) / 2,
          (bitY + pomY) / 2 + s * 0.085 + nod * 0.5,
          pomX,
          pomY,
        );
        ctx.stroke();
      }
      drawCourserHead(ctx, courserL, { x: chx, y: chy, s, fx, fy, ys, hurt: opts.hurt });
      return;
    }
    if (lynxL) {
      // THE PROWLER CARRIAGE: a cat's head never SITS on its
      // shoulders — it hangs FORWARD and LOW off them. The skull
      // rides level with the shoulder line at rest, drops with the
      // lope (the prowl), and sinks to the chest line through the
      // pounce windup while the high haunches stay coiled — the
      // stalking wedge every big-cat silhouette is built on. The
      // wolves carry their heads high on a rising neck; the lynx
      // must never borrow that.
      const hl = spec.bodyLen * s;
      const hw2 = lynxL.headW * s;
      const nod = opts.pose.bob * 0.4 * s;
      const run = opts.pose.poleStrength;
      const stalk =
        ((at > 0 ? Math.min(1, at / 0.7) * (lynxL.champion ? 0.1 : 0.08) : 0) + run * 0.035) * s;
      const reach = hl * 1.1 + hw2 * 0.34;
      const chx = bx + fx * reach;
      const chy = by + fy * reach * ys - (lynxL.backH * 0.94 + 0.02) * s - nod + stalk;
      // Neck: a thick coat wedge sloping DOWN-forward from the
      // shoulder top into the head sides — the descending line IS the
      // prowler read; the ruff does the rest at the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(lynxL.coat, -5);
      ctx.beginPath();
      const nb = (lynxL.backH + lynxL.shoulderH * 0.5) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * lynxL.bodyW * (lynxL.champion ? 0.95 : 0.85) * s;
      const nwy = py * lynxL.bodyW * (lynxL.champion ? 0.95 : 0.85) * s;
      ctx.moveTo(bx + fx * hl * 0.5 + nwx, by + (fy * hl * 0.5 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.5 - nwx, by + (fy * hl * 0.5 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.42, chy - py * hw2 * 0.42 * ys + lynxL.headH * s * 0.3);
      ctx.lineTo(chx + px * hw2 * 0.42, chy + py * hw2 * 0.42 * ys + lynxL.headH * s * 0.3);
      ctx.closePath();
      ctx.fill();
      // Idle ear flick: a rare quick pulse, never a metronome.
      const flick =
        now > 0 ? (Math.max(0, Math.sin(now * 0.0023 + seed) - 0.94) / 0.06) * idle : 0;
      drawLynxHead(ctx, lynxL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        flick,
      });
      return;
    }
    if (sabercatL) {
      // The cat carries its head LOW and forward on a thick ruff — no
      // horse column: a broad short wedge off the shoulder rise.
      const hl = spec.bodyLen * s;
      const hw2 = sabercatL.headW * s;
      const nod = opts.pose.bob * 0.35 * s;
      const chx = bx + fx * (hl * 0.92 + hw2 * 0.3);
      const chy =
        by +
        fy * (hl * 0.92 + hw2 * 0.3) * ys -
        (sabercatL.backH + sabercatL.shoulderH + 0.2) * s -
        nod;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(sabercatL.coat, -4);
      ctx.beginPath();
      const nb = (sabercatL.backH + sabercatL.shoulderH * 0.8) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * sabercatL.bodyW * 0.8 * s;
      const nwy = py * sabercatL.bodyW * 0.8 * s;
      ctx.moveTo(bx + fx * hl * 0.62 + nwx, by + (fy * hl * 0.62 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.62 - nwx, by + (fy * hl * 0.62 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.4, chy - py * hw2 * 0.4 * ys + sabercatL.headH * s * 0.34);
      ctx.lineTo(chx + px * hw2 * 0.4, chy + py * hw2 * 0.4 * ys + sabercatL.headH * s * 0.34);
      ctx.closePath();
      ctx.fill();
      drawSabercatHead(ctx, sabercatL, { x: chx, y: chy, s, fx, fy, ys, hurt: opts.hurt });
      return;
    }
    if (bearL) {
      const hl = spec.bodyLen * s;
      const hw2 = bearL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The head stays LOW — slung off the hump, dropping further
      // through the pounce windup.
      const stalk = at > 0 ? Math.min(1, at / 0.7) * 0.08 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.32);
      const chy = by + fy * (hl + hw2 * 0.32) * ys - bearL.backH * 0.82 * s - nod + stalk;
      // Thick fur neck from the hump into the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(bearL.fur, -6);
      ctx.beginPath();
      const nb = (bearL.backH + bearL.humpH * 0.7) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * bearL.bodyW * 0.62 * s;
      const nwy = py * bearL.bodyW * 0.62 * s;
      ctx.moveTo(bx + fx * hl * 0.72 + nwx, by + (fy * hl * 0.72 + nwy) * ys - nb * 0.88);
      ctx.lineTo(bx + fx * hl * 0.72 - nwx, by + (fy * hl * 0.72 - nwy) * ys - nb * 0.88);
      ctx.lineTo(chx - px * hw2 * 0.44, chy - py * hw2 * 0.44 * ys + bearL.headH * s * 0.26);
      ctx.lineTo(chx + px * hw2 * 0.44, chy + py * hw2 * 0.44 * ys + bearL.headH * s * 0.26);
      ctx.closePath();
      ctx.fill();
      drawBearHead(ctx, bearL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2) : 0,
      });
      return;
    }
    if (boarL) {
      const hl = spec.bodyLen * s;
      const hw2 = boarL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The whole head drops through the charge windup — a battering
      // ram lining up.
      const drop = at > 0 ? Math.min(1, at / 0.7) * 0.09 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.3);
      const chy =
        by + fy * (hl + hw2 * 0.3) * ys - (boarL.backH + boarL.crestH * 0.5) * 0.9 * s - nod + drop;
      // Thick neck roll from the crest into the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(boarL.hide, -8);
      ctx.beginPath();
      const nb = (boarL.backH + boarL.crestH * 0.6) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * boarL.bodyW * 0.6 * s;
      const nwy = py * boarL.bodyW * 0.6 * s;
      ctx.moveTo(bx + fx * hl * 0.7 + nwx, by + (fy * hl * 0.7 + nwy) * ys - nb * 0.88);
      ctx.lineTo(bx + fx * hl * 0.7 - nwx, by + (fy * hl * 0.7 - nwy) * ys - nb * 0.88);
      ctx.lineTo(chx - px * hw2 * 0.42, chy - py * hw2 * 0.42 * ys + boarL.headH * s * 0.26);
      ctx.lineTo(chx + px * hw2 * 0.42, chy + py * hw2 * 0.42 * ys + boarL.headH * s * 0.26);
      ctx.closePath();
      ctx.fill();
      drawBoarHead(ctx, boarL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        charge: at > 0 ? Math.min(1, at * 1.6) : 0,
      });
      return;
    }
    if (cattle) {
      const hl = spec.bodyLen * s;
      const hw2 = cattle.headW * s;
      // The head hangs off the shoulder line, nodding with the gait.
      const nod = opts.pose.bob * 0.5 * s;
      const chx = bx + fx * (hl + hw2 * 0.35);
      const chy =
        by + fy * (hl + hw2 * 0.35) * ys - cattle.backH * (opts.defId === 'bull' ? 0.72 : 0.78) * s - nod;
      // Neck: a hide quad from the chest top to the head sides.
      const nb = cattle.backH * s + opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(cattle.hide, -8);
      ctx.beginPath();
      const nwx = px * cattle.bodyW * 0.5 * s;
      const nwy = py * cattle.bodyW * 0.5 * s;
      ctx.moveTo(bx + fx * hl * 0.75 + nwx, by + (fy * hl * 0.75 + nwy) * ys - nb * 0.92);
      ctx.lineTo(bx + fx * hl * 0.75 - nwx, by + (fy * hl * 0.75 - nwy) * ys - nb * 0.92);
      ctx.lineTo(chx - px * hw2 * 0.38, chy - py * hw2 * 0.38 * ys + cattle.headH * s * 0.2);
      ctx.lineTo(chx + px * hw2 * 0.38, chy + py * hw2 * 0.38 * ys + cattle.headH * s * 0.2);
      ctx.closePath();
      ctx.fill();
      // Idle cud-grind: a slow lateral figure the muzzle rides.
      const chew = now > 0 ? Math.sin(now * 0.005 + seed) * hw2 * 0.035 * idle : 0;
      drawCattleHead(ctx, cattle, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        chew,
      });
      return;
    }
    if (wolfL) {
      const hl = spec.bodyLen * s;
      const hw2 = wolfL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The head drops toward the ground through the pounce windup —
      // a stalking crouch that matches the body rocking back.
      const stalk = at > 0 ? Math.min(1, at / 0.7) * 0.08 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.42);
      const chy =
        by +
        fy * (hl + hw2 * 0.42) * ys -
        (wolfL.backH + wolfL.shoulderH * 0.6) * 1.12 * s -
        nod +
        stalk;
      // Neck: a coat quad from the shoulder top into the head sides.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(wolfL.coat, -8);
      ctx.beginPath();
      const nb = (wolfL.backH + wolfL.shoulderH) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * wolfL.bodyW * 0.55 * s;
      const nwy = py * wolfL.bodyW * 0.55 * s;
      ctx.moveTo(bx + fx * hl * 0.72 + nwx, by + (fy * hl * 0.72 + nwy) * ys - nb * 0.9);
      ctx.lineTo(bx + fx * hl * 0.72 - nwx, by + (fy * hl * 0.72 - nwy) * ys - nb * 0.9);
      ctx.lineTo(chx - px * hw2 * 0.36, chy - py * hw2 * 0.36 * ys + wolfL.headH * s * 0.24);
      ctx.lineTo(chx + px * hw2 * 0.36, chy + py * hw2 * 0.36 * ys + wolfL.headH * s * 0.24);
      ctx.closePath();
      ctx.fill();
      // Idle ear flick: a rare quick pulse, never a metronome.
      const flick =
        now > 0 ? Math.max(0, Math.sin(now * 0.0021 + seed) - 0.94) / 0.06 * idle : 0;
      drawWolfHead(ctx, wolfL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        flick,
      });
      return;
    }
    if (direL) {
      const hl = spec.bodyLen * s;
      const hw2 = direL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The matriarch stalks lower and longer than her pack through
      // the windup — the whole front end sinks toward the kill line.
      const stalk = at > 0 ? Math.min(1, at / 0.7) * 0.11 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.44);
      const chy =
        by +
        fy * (hl + hw2 * 0.44) * ys -
        (direL.backH + direL.shoulderH * 0.7) * 1.1 * s -
        nod +
        stalk;
      // The ruff: a thick coat quad off the withers into the head
      // sides, its lower edge breaking into fur chops — the storm
      // collar no lean wolf carries.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(direL.coat, -9);
      ctx.beginPath();
      const nb = (direL.backH + direL.shoulderH) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * direL.bodyW * 0.62 * s;
      const nwy = py * direL.bodyW * 0.62 * s;
      const rax = bx + fx * hl * 0.7;
      const ray = by + fy * hl * 0.7 * ys;
      ctx.moveTo(rax + nwx, ray + nwy * ys - nb * 0.88);
      ctx.lineTo(rax - nwx, ray - nwy * ys - nb * 0.88);
      ctx.lineTo(chx - px * hw2 * 0.4, chy - py * hw2 * 0.4 * ys + direL.headH * s * 0.26);
      ctx.lineTo(chx + px * hw2 * 0.4, chy + py * hw2 * 0.4 * ys + direL.headH * s * 0.26);
      ctx.closePath();
      ctx.fill();
      // Fur chops hanging off the ruff's throat line.
      if (!opts.hurt) {
        ctx.fillStyle = shade(direL.coat, -9);
        for (const cs of [-0.55, 0, 0.55]) {
          const chpx = chx - px * hw2 * 0.4 * cs - fx * hw2 * 0.18;
          const chpy =
            chy - (py * hw2 * 0.4 * cs + fy * hw2 * 0.18) * ys + direL.headH * s * 0.3;
          ctx.beginPath();
          ctx.moveTo(chpx - hw2 * 0.09, chpy - hw2 * 0.04);
          ctx.lineTo(chpx + hw2 * 0.09, chpy - hw2 * 0.04);
          ctx.lineTo(chpx, chpy + hw2 * 0.14);
          ctx.closePath();
          ctx.fill();
        }
      }
      const flick =
        now > 0 ? Math.max(0, Math.sin(now * 0.0017 + seed) - 0.94) / 0.06 * idle : 0;
      drawDireWolfHead(ctx, direL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        flick,
      });
      return;
    }
    if (worgL) {
      const hl = spec.bodyLen * s;
      const hw2 = worgL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The lunge THRUSTS the head forward off the low carriage — the
      // worg doesn't stalk down like a wolf, it snaps OUT.
      const thrust = at > 0 ? Math.min(1, at / 0.7) * 0.14 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.46 + thrust);
      // THE LOW CARRIAGE: the skull hangs well BELOW the withers peak —
      // the hyena head-slung read that makes the slope mean something.
      const chy =
        by + (fy * (hl + hw2 * 0.46) + fy * thrust * 0.5) * ys - worgL.shoulderH * 0.78 * s - nod;
      // Neck: a thick quad falling DOWN from the withers to the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(worgL.hide, -8);
      ctx.beginPath();
      const nb = worgL.shoulderH * s + opts.pose.bob * 0.35 * s;
      const nwx = px * worgL.bodyW * 0.6 * s;
      const nwy = py * worgL.bodyW * 0.6 * s;
      const rax = bx + fx * hl * 0.68;
      const ray = by + fy * hl * 0.68 * ys;
      ctx.moveTo(rax + nwx, ray + nwy * ys - nb * 0.95);
      ctx.lineTo(rax - nwx, ray - nwy * ys - nb * 0.95);
      ctx.lineTo(chx - px * hw2 * 0.38, chy - py * hw2 * 0.38 * ys + worgL.headH * s * 0.2);
      ctx.lineTo(chx + px * hw2 * 0.38, chy + py * hw2 * 0.38 * ys + worgL.headH * s * 0.2);
      ctx.closePath();
      ctx.fill();
      const flick =
        now > 0 ? Math.max(0, Math.sin(now * 0.0026 + seed) - 0.92) / 0.08 * idle : 0;
      drawWorgHead(ctx, worgL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        gape: at > 0 ? Math.min(1, at * 2.2) : 0,
        flick,
      });
      return;
    }
    if (ratL) {
      const hl = spec.bodyLen * s;
      const hw2 = ratL.headW * s;
      // The head rides low off the shoulders, forever sniffing — a
      // busy little bob on its own clock, stilled by running.
      const sniff = now > 0 ? Math.sin(now * 0.004 + seed) * 0.012 * s * idle : 0;
      const chx = bx + fx * (hl + hw2 * 0.28);
      const chy =
        by + fy * (hl + hw2 * 0.28) * ys - 0.17 * s - opts.pose.bob * 0.3 * s + sniff;
      // Short neck wedge bridging the shoulder pinch into the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(ratL.fur, -6);
      ctx.beginPath();
      const nwx = px * ratL.bodyW * 0.42 * s;
      const nwy = py * ratL.bodyW * 0.42 * s;
      ctx.moveTo(bx + fx * hl * 0.7 + nwx, by + (fy * hl * 0.7 + nwy) * ys - 0.22 * s);
      ctx.lineTo(bx + fx * hl * 0.7 - nwx, by + (fy * hl * 0.7 - nwy) * ys - 0.22 * s);
      ctx.lineTo(chx - px * hw2 * 0.34, chy - py * hw2 * 0.34 * ys + ratL.headH * s * 0.2);
      ctx.lineTo(chx + px * hw2 * 0.34, chy + py * hw2 * 0.34 * ys + ratL.headH * s * 0.2);
      ctx.closePath();
      ctx.fill();
      const twitch = now > 0 ? Math.sin(now * 0.02 + seed) * idle : 0;
      drawRatHead(ctx, ratL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        twitch,
      });
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    facetCircle(ctx, headX, headY, headR, 6, opts.dir + Math.PI / 6);
    ctx.fill();
    if (opts.defId === 'chicken') {
      ctx.fillStyle = '#e8a33d';
      ctx.beginPath();
      ctx.moveTo(headX + fx * headR * 0.8 - py * headR * 0.25, headY + fy * headR * 0.8 - py * headR * 0.25);
      ctx.lineTo(headX + fx * headR * 1.8, headY + fy * headR * 1.8);
      ctx.lineTo(headX + fx * headR * 0.8 + py * headR * 0.25, headY + fy * headR * 0.8 + py * headR * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d95763';
      ctx.beginPath();
      ctx.arc(headX - fx * headR * 0.1, headY - headR * 0.85, headR * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    // Eyes track the facing — and a head facing away from the camera
    // SHOWS NO EYES. Painting them regardless put eyes on the back of
    // the skull whenever an animal looked up-screen.
    if (fy > -0.45) {
      ctx.fillStyle = OUTLINE;
      for (const es of [-1, 1]) {
        const eex = headX + fx * headR * 0.42 + es * px * headR * 0.35;
        const eey = headY + fy * headR * 0.42 + es * py * headR * 0.35;
        ctx.fillRect(eex - headR * 0.13, eey - headR * 0.15, headR * 0.26, headR * 0.3);
      }
    }
  };

  const paintTail = (): void => {
    if (spiderL || crabL || beetleL) return;
    if (ramL) {
      // A wool nub dropped off the fleece stern.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(ramL.wool, -5);
      ctx.beginPath();
      facetCircle(
        ctx,
        bx - fx * hl * 1.02,
        by - fy * hl * 1.02 * ys - ramL.backH * 0.68 * s - lift,
        s * 0.045,
        5,
        seed * 0.3,
      );
      ctx.fill();
      return;
    }
    if (sheepL) {
      // The ewe's tail HANGS — a wool drop off the stern, low, where
      // the ram's nub perches high.
      const shorn = opts.shorn === true;
      const backH = shorn ? sheepL.backHShorn : sheepL.backH;
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(shorn ? sheepL.woolShorn : sheepL.wool, -6);
      ctx.beginPath();
      facetCircle(
        ctx,
        bx - fx * hl * 1.0,
        by - fy * hl * 1.0 * ys - backH * 0.48 * s - lift,
        s * 0.05,
        5,
        seed * 0.4,
      );
      ctx.fill();
      return;
    }
    if (lynxL) {
      // THE SIMULATED BOB: the live game runs the verlet stub
      // (BobtailSim) — physics, not pose. The analytic stub below
      // survives only for sim-less callers.
      if (opts.tail) {
        opts.tail();
        return;
      }
      // THE BOBTAIL: a stub perched HIGH on the raised rump, black at
      // the tip — nothing like the wolf's hanging brush or the
      // sabercat's long sweep. It flicks upright when the cat is
      // wound (idle interest, the pounce crouch), and tucks flat at a
      // flat run.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const rumpH = (lynxL.backH + lynxL.haunchH) * s;
      const flickT = now > 0 ? Math.max(0, Math.sin(now * 0.0017 + seed * 0.8) - 0.5) * 2 : 0;
      // Perk: upright at idle and through the crouch, flat at speed.
      const perk = Math.min(1, (1 - run * 0.85) + at * 0.8) * (0.55 + 0.3 * flickT);
      const tbx = bx - fx * hl * 0.98;
      const tby = by - fy * hl * 0.98 * ys - rumpH * 0.9 - lift;
      const backA = Math.atan2(-fy * ys, -fx);
      const len = s * (lynxL.champion ? 0.17 : 0.14);
      const sway = now > 0 ? Math.sin(now * 0.0021 + seed) * 0.2 * (1 - run) : 0;
      // The stub rides back-and-UP: its tip lifts with the perk.
      const tipx = tbx + Math.cos(backA + sway) * len * (1 - perk * 0.45);
      const tipy =
        tby + Math.sin(backA + sway) * len * (1 - perk * 0.45) * ys - len * (0.45 + perk * 0.75);
      const cxq = tbx + Math.cos(backA) * len * 0.5;
      const cyq = tby + Math.sin(backA) * len * 0.5 * ys - len * perk * 0.3;
      const stub = taperedSpinePath(tbx, tby, cxq, cyq, tipx, tipy, (t) =>
        s * (lynxL.champion ? 0.052 : 0.042) * (1 - t * 0.25),
      );
      // Walking away the perked stub stands against the cat's own
      // back — show its pale UNDERSIDE there, or the dark tip reads
      // as a hole punched in the coat.
      ctx.fillStyle = opts.hurt ? '#ffffff' : fy < -0.2 ? lynxL.under : shade(lynxL.coat, -3);
      ctx.fill(stub);
      // The black tip — the read that survives any zoom.
      ctx.fillStyle = opts.hurt ? '#ffffff' : lynxL.tuft;
      ctx.beginPath();
      facetCircle(ctx, tipx, tipy, s * (lynxL.champion ? 0.042 : 0.034), 5, seed * 0.4);
      ctx.fill();
      // The duskruff banded in silver below her black tip.
      if (lynxL.champion && !opts.hurt && lynxL.grizzle) {
        ctx.strokeStyle = lynxL.grizzle;
        ctx.lineWidth = Math.max(1.4, s * 0.03);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tbx + (tipx - tbx) * 0.55, tby + (tipy - tby) * 0.55);
        ctx.lineTo(tbx + (tipx - tbx) * 0.72, tby + (tipy - tby) * 0.72);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
      return;
    }
    if (sabercatL) {
      // The feline tail: one long low sweep off the haunch, curling UP
      // at the tip — swaying at rest, streaming flat at speed, dark
      // banding near the end.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const sway = now > 0 ? Math.sin(now * 0.0014 + seed * 0.9) * (1 - run * 0.7) : 0;
      const tbx = bx - fx * hl * 0.98;
      const tby = by - fy * hl * 0.98 * ys - sabercatL.backH * 0.7 * s - lift;
      const backA = Math.atan2(-fy * ys, -fx);
      const len = s * 0.42;
      const droop = (1 - run * 0.8) * 0.3;
      const midx = tbx + Math.cos(backA + sway * 0.25) * len * 0.55;
      const midy = tby + Math.sin(backA + sway * 0.25) * len * 0.55 * ys + len * droop;
      const tipx = tbx + Math.cos(backA + sway * 0.4) * len;
      // The curl: the tip lifts back up past the sweep's low point.
      const tipy = midy - len * (0.22 + 0.1 * (1 - run)) + Math.sin(backA) * len * 0.3 * ys;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : sabercatL.coat;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.quadraticCurveTo(midx, midy, tipx, tipy);
      ctx.stroke();
      // Dark tip band.
      if (!opts.hurt) {
        ctx.strokeStyle = sabercatL.stripe;
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(midx + (tipx - midx) * 0.6, midy + (tipy - midy) * 0.6);
        ctx.quadraticCurveTo(
          midx + (tipx - midx) * 0.8,
          midy + (tipy - midy) * 0.8,
          tipx,
          tipy,
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      return;
    }
    if (courserL) {
      // The tail: a full fall of hair off the croup, streaming back
      // with speed, swishing on its own clock at rest.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const swish = now > 0 ? Math.sin(now * 0.0011 + seed * 0.7) * (1 - run) : 0;
      const tbx = bx - fx * hl * 1.0;
      const tby = by - fy * hl * 1.0 * ys - courserL.backH * 0.9 * s - lift;
      const backA = Math.atan2(-fy * ys, -fx);
      // The fall has MASS: a filled tapered drape first, so the tail
      // reads as hair from every facing — straight from behind it is
      // a full dark fall down the croup, never three shadow threads.
      // It ends above the hocks; a tail that touches the ground reads
      // as a fourth shadow, not a tail.
      const droop = (1 - run * 0.75) * 0.5 + 0.22;
      const len = s * 0.3;
      const a0 = backA + swish * 0.22;
      const tipx = tbx + Math.cos(a0) * len;
      const tipy = tby + Math.sin(a0) * len * ys + len * droop;
      const pxr = -Math.sin(a0);
      const pyr = Math.cos(a0);
      const w0 = s * 0.06;
      const w1 = s * 0.026;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(courserL.mane, 18);
      ctx.beginPath();
      ctx.moveTo(tbx + pxr * w0, tby + pyr * w0);
      ctx.quadraticCurveTo(
        tbx + Math.cos(a0) * len * 0.5 + pxr * w0,
        tby + Math.sin(a0) * len * 0.5 * ys + len * droop * 0.3 + pyr * w0,
        tipx + pxr * w1,
        tipy + pyr * w1,
      );
      ctx.lineTo(tipx - pxr * w1, tipy - pyr * w1);
      ctx.quadraticCurveTo(
        tbx + Math.cos(a0) * len * 0.5 - pxr * w0,
        tby + Math.sin(a0) * len * 0.5 * ys + len * droop * 0.3 - pyr * w0,
        tbx - pxr * w0,
        tby - pyr * w0,
      );
      ctx.closePath();
      ctx.fill();
      // Two strands over the mass keep the hair read.
      ctx.strokeStyle = opts.hurt ? '#ffffff' : courserL.mane;
      ctx.lineCap = 'round';
      for (const k of [-1, 1]) {
        const a = a0 + k * 0.14;
        const kl = len * 0.94;
        const tex = tbx + Math.cos(a) * kl;
        const tey = tby + Math.sin(a) * kl * ys + kl * droop;
        ctx.lineWidth = Math.max(1.5, s * 0.038);
        ctx.beginPath();
        ctx.moveTo(tbx, tby);
        ctx.quadraticCurveTo(
          tbx + Math.cos(a) * kl * 0.5,
          tby + Math.sin(a) * kl * 0.5 * ys + kl * droop * 0.3,
          tex,
          tey,
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      return;
    }
    if (stagL) {
      // The white flick riding the rump patch, twitching at idle.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const flick = now > 0 ? Math.max(0, Math.sin(now * 0.0019 + seed) - 0.9) / 0.1 : 0;
      const tbx = bx - fx * hl * 1.0;
      const tby = by - fy * hl * 1.0 * ys - stagL.backH * 0.82 * s - lift;
      ctx.fillStyle = opts.hurt ? '#ffffff' : stagL.rump;
      ctx.beginPath();
      ctx.moveTo(tbx - px * s * 0.03, tby);
      ctx.lineTo(tbx - fx * s * 0.045 + px * flick * s * 0.03, tby + s * (0.085 - flick * 0.03));
      ctx.lineTo(tbx + px * s * 0.03, tby);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (bearL) {
      // Barely a tail at all — a fur nub lost in the rump.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(bearL.fur, -4);
      ctx.beginPath();
      facetCircle(
        ctx,
        bx - fx * hl * 1.0,
        by - fy * hl * 1.0 * ys - bearL.backH * 0.6 * s - lift,
        s * 0.038,
        5,
        seed * 0.3,
      );
      ctx.fill();
      return;
    }
    if (boarL) {
      // The piggy kink: a short cord hooking up off the rump with a
      // dark tuft, flicking with the gait.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.02 * s +
        (now > 0 ? Math.sin(now * 0.0017 + seed) * 0.025 * s * idle : 0);
      const tbx = bx - fx * hl * 0.96;
      const tby = by - fy * hl * 0.96 * ys - boarL.backH * 0.78 * s - lift;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(boarL.hide, -14);
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.quadraticCurveTo(
        tbx - fx * hl * 0.16 + px * sway,
        tby - s * 0.09,
        tbx - fx * hl * 0.2 + px * sway * 2,
        tby + s * 0.02,
      );
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = opts.hurt ? '#ffffff' : boarL.bristle;
      ctx.beginPath();
      facetCircle(ctx, tbx - fx * hl * 0.2 + px * sway * 2, tby + s * 0.03, s * 0.032, 5, seed * 0.3);
      ctx.fill();
      return;
    }
    if (cattle) {
      // Rope tail hanging off the rump, swishing slowly at idle and
      // swaying with the gait, ending in a dark tuft.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.03 * s +
        (now > 0 ? Math.sin(now * 0.0013 + seed * 0.7) * 0.045 * s * idle : 0);
      const tbx = bx - fx * hl * 0.92;
      const tby = by - fy * hl * 0.92 * ys - cattle.backH * 0.95 * s - lift;
      const tex = tbx - fx * hl * 0.14 + px * sway * 1.7;
      const tey = tby + cattle.backH * 0.72 * s + py * sway * 0.4;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(cattle.hide, -24);
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.quadraticCurveTo(tbx - fx * hl * 0.1 + px * sway * 0.6, tby + cattle.backH * 0.3 * s, tex, tey);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = opts.hurt ? '#ffffff' : cattle.patch;
      ctx.beginPath();
      facetCircle(ctx, tex, tey + s * 0.03, s * 0.047, 5, seed * 0.3);
      ctx.fill();
      return;
    }
    if (wolfL) {
      // The brush: a full bushy tail hanging off the rump in a lazy
      // curve, dark-tipped, swaying with the gait and drifting at idle.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.04 * s +
        (now > 0 ? Math.sin(now * 0.0011 + seed) * 0.05 * s * idle : 0);
      const tbx = bx - fx * hl * 0.95;
      const tby = by - fy * hl * 0.95 * ys - wolfL.backH * 0.8 * s - lift;
      const cxq = tbx - fx * hl * 0.42 + px * sway * 0.7;
      const cyq = tby + wolfL.backH * 0.1 * s;
      const tex = tbx - fx * hl * 0.78 + px * sway * 1.6;
      const tey = tby + wolfL.backH * 0.52 * s;
      const brush = taperedSpinePath(tbx, tby, cxq, cyq, tex, tey, (t) =>
        s * (0.034 + 0.058 * Math.sin(Math.PI * Math.pow(t, 0.9))),
      );
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(wolfL.coat, -4);
      ctx.fill(brush);
      ctx.fillStyle = opts.hurt ? '#ffffff' : wolfL.saddle;
      ctx.beginPath();
      facetCircle(ctx, tex, tey, s * 0.042, 5, seed * 0.4);
      ctx.fill();
      return;
    }
    if (direL) {
      // The matriarch's brush: heavier than any wolf's, hung low and
      // ending PALE — the frost tip, the inverse of the pack's dark
      // ones. Sways slower; she wastes no motion.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.035 * s +
        (now > 0 ? Math.sin(now * 0.0008 + seed) * 0.045 * s * idle : 0);
      const tbx = bx - fx * hl * 0.96;
      const tby = by - fy * hl * 0.96 * ys - direL.backH * 0.74 * s - lift;
      const cxq = tbx - fx * hl * 0.4 + px * sway * 0.7;
      const cyq = tby + direL.backH * 0.16 * s;
      const tex = tbx - fx * hl * 0.74 + px * sway * 1.5;
      const tey = tby + direL.backH * 0.58 * s;
      const brush = taperedSpinePath(tbx, tby, cxq, cyq, tex, tey, (t) =>
        s * (0.042 + 0.072 * Math.sin(Math.PI * Math.pow(t, 0.9))),
      );
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(direL.coat, -6);
      ctx.fill(brush);
      ctx.fillStyle = opts.hurt ? '#ffffff' : direL.grizzle;
      ctx.beginPath();
      facetCircle(ctx, tex, tey, s * 0.05, 5, seed * 0.4);
      ctx.fill();
      return;
    }
    if (worgL) {
      // The ratty crook: a thin kinked whip off the low rump, bare at
      // the tip — nothing a wolf would admit to. Flicks fast at idle.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.03 * s +
        (now > 0 ? Math.sin(now * 0.0023 + seed) * 0.035 * s * idle : 0);
      const tbx = bx - fx * hl * 0.94;
      const tby = by - fy * hl * 0.94 * ys - worgL.rumpH * 0.82 * s - lift;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(worgL.hide, -14);
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      // Down, then the kink hooks it back up — the crook.
      ctx.quadraticCurveTo(
        tbx - fx * hl * 0.2 + px * sway,
        tby + s * 0.12,
        tbx - fx * hl * 0.3 + px * sway * 2,
        tby + s * 0.05,
      );
      ctx.stroke();
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.strokeStyle = opts.hurt ? '#ffffff' : worgL.bare;
      ctx.beginPath();
      ctx.moveTo(tbx - fx * hl * 0.3 + px * sway * 2, tby + s * 0.05);
      ctx.lineTo(tbx - fx * hl * 0.36 + px * sway * 2.4, tby + s * 0.11);
      ctx.stroke();
      ctx.lineCap = 'butt';
      return;
    }
    if (ratL) {
      // The naked tail: long, thin, dragging a slithering S on the
      // ground behind the haunches.
      const hl = spec.bodyLen * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2 + Math.PI * 0.5) * 0.09 * s +
        (now > 0 ? Math.sin(now * 0.0009 + seed) * 0.06 * s * idle : 0);
      const tbx = bx - fx * hl * 0.88;
      const tby = by - fy * hl * 0.88 * ys - 0.11 * s;
      const cxq = bx - fx * hl * 1.42 + px * sway * 2.2;
      const cyq = by - fy * hl * 1.42 * ys - 0.05 * s;
      const tex = bx - fx * hl * 1.95 + px * sway * 1.1;
      const tey = by - fy * hl * 1.95 * ys - 0.01 * s;
      const tail = taperedSpinePath(tbx, tby, cxq, cyq, tex, tey, (t) =>
        s * (0.02 * (1 - t) + 0.006),
      );
      ctx.fillStyle = opts.hurt ? '#ffffff' : ratL.skin;
      ctx.fill(tail);
      return;
    }
  };

  // The dairy udder: a pink faceted mass under the rear belly with
  // teat chips, visible side-on and from behind — never through the
  // body when the rump faces away.
  const paintUdder = (): void => {
    if (!cattle?.udder) return;
    const hl = spec.bodyLen * s;
    const lift = opts.pose.bob * 0.35 * s;
    const ux = bx - fx * hl * 0.52;
    const uy = by - fy * hl * 0.52 * ys - (cattle.bellyH - 0.06) * s - lift * 0.6;
    const ur = cattle.bodyW * 0.62 * s;
    ctx.fillStyle = opts.hurt ? '#ffffff' : cattle.udder;
    ctx.beginPath();
    facetCircle(ctx, ux, uy, ur, 6, seed * 0.5, 0.75);
    ctx.fill();
    if (!opts.hurt && fy < 0.25) {
      ctx.fillStyle = shade(cattle.udder, -18);
      for (const es of [-1, 1]) {
        ctx.fillRect(ux + es * ur * 0.38 - s * 0.012, uy + ur * 0.5, s * 0.024, s * 0.05);
      }
    }
  };

  // ---- compose in depth order. The facing decides where head and
  // tail sit relative to the mass: facing down-screen the head is the
  // closest thing (nothing may paint over the face); facing up-screen
  // it tucks behind the body and the tail comes forward.
  const headFront = fy > 0.2;
  const headBack = fy < -0.25;
  const tailFront = fy < -0.2;
  const udderBehind = fy > 0.15;
  // THE COLLAR: a strap across the hull's neck end with a brass tag
  // hung under it — one universal anchor (every species hull runs
  // bodyLen along the facing), painted over the body and under a
  // down-screen head so the face is never covered. Shell-bodied
  // species (crab, beetle, spider) have no neck to strap: their tag
  // rides the shell rim instead, same brass, same read.
  const paintCollar = (): void => {
    if (!opts.collar) return;
    const shellBody = !!(crabL || beetleL || spiderL);
    // The sheep has no neck to see — the fleece swallows it — so her
    // strap rides the wool line right behind the skull, short and
    // thin, or it reads as a plank across the cloud.
    const cx = bx + fx * len * (shellBody ? 0.5 : sheepL ? 0.95 : 0.72);
    const cy = bodyY + fy * len * (shellBody ? 0.34 : sheepL ? 0.6 : 0.5) * ys;
    const bw = Math.max(2, r * (shellBody ? 0.4 : sheepL ? 0.34 : 0.58));
    ctx.save();
    ctx.translate(cx, cy);
    if (!shellBody) {
      ctx.rotate(Math.atan2(fy * ys, fx) + Math.PI / 2);
      ctx.fillStyle = opts.collar;
      const hw3 = r * (sheepL ? 0.1 : 0.17);
      ctx.fillRect(-hw3, -bw, hw3 * 2, bw * 2);
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.strokeRect(-hw3, -bw, hw3 * 2, bw * 2);
    }
    // The tag: one brass drop — the thing a keeper's eye finds first.
    ctx.fillStyle = '#d8a83d';
    ctx.beginPath();
    ctx.arc(0, bw * (shellBody ? 0.4 : 1.05), Math.max(1.4, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.55)';
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.stroke();
    ctx.restore();
  };

  if (!tailFront) paintTail();
  if (headBack) paintHead();
  if (udderBehind) paintUdder();
  for (const i of farLegs) drawLeg(i);
  paintBody();
  paintCollar();
  if (!udderBehind) paintUdder();
  if (!headBack && !headFront) paintHead();
  for (const i of nearLegs) drawLeg(i);
  opts.rider?.();
  if (headFront) paintHead();
  if (tailFront) paintTail();
}
