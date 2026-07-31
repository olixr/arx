import { CLOTH_COLORS, HAIR_COLORS, PoseState, SKIN_TONES, type Look } from '@arx/shared';
import { ELEMENT_COLORS, enchantDef, itemDef } from '@arx/content';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import {
  bladeStyle,
  bowStyle,
  drawBow,
  drawGreatweapon,
  drawSword,
  drawStaff,
  greatStyle,
  staffStyle,
  type BladeFx,
  type StaffFx,
} from './weapons.js';
import { drawTool, toolStyle } from './tools.js';
import {
  LegRig,
  chooseLimbSign,
  solveLimb,
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
  GREAT_FINISHER_PHASES,
  GREAT_POMMEL_CHOKE_S,
  STAFF_GUARD_CHOKE_S,
  armPump,
  bowWield,
  gaitK,
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
  };
  bodyColor: string;
  hurt: boolean;
  isOwn: boolean;
  weaponItem?: string;
  /** Mainhand enchant id — overlays the enchant's fx on the weapon art. */
  weaponEnch?: string;
  /** Offhand enchant id — a dual-wielded second blade burns its own hue. */
  offhandEnch?: string;
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
   */
  sitStyle?: 'floor' | 'chair' | 'throne';
  /** Seat surface height for chair/throne sits, tile units above ground. */
  seatH?: number;
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
    const sgn = chooseLimbSign(cxn, cyn, prefX, prefY, elbow.sign);
    elbow.sign = sgn;
    prefX = cxn * sgn;
    prefY = cyn * sgn;
  }
  // Hot path: every visible humanoid solves two arms a frame — reuse
  // one scratch (destructured immediately) instead of allocating.
  const { ex, ey, kx, ky } = solveLimbInto(ARM_SOLVE, sx, sy, hx, hy, ARM_LEN * s, 1.08, prefX, prefY);

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

export function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const skel = rig.skeletal ?? null;
  const kob = rig.kobold ?? null;
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
  const bodySt = rig.bodyItem ? bodyStyle(rig.bodyItem) : null;
  const legSt = rig.legsItem ? legStyle(rig.legsItem) : null;
  const bootSt = rig.bootsItem ? bootStyle(rig.bootsItem) : null;
  const offSt = rig.offhandItem ? offhandStyle(rig.offhandItem) : null;
  const gloveSt = rig.glovesItem ? gloveStyle(rig.glovesItem) : null;
  // A shield is not an item held in a fist — it is a PLANE the body
  // stands behind, with its own dialect (shields.ts). Resolving it here
  // takes the offhand out of the held-item vocabulary entirely.
  const shieldSt: ShieldStyle | null =
    offSt && rig.offhandItem && isShieldKind(offSt.kind)
      ? shieldStyle(rig.offhandItem, offSt.kind, offSt.color, offSt.trim, offSt.boss)
      : null;

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
            : (legSt?.shin ?? legSt?.thigh ?? baseLeg);
      // THE FOOT CAPS THE LEG: the shin stroke ends at the ANKLE — the
      // endpoint pulled back up the bone so its round cap tucks inside
      // the footwear painted below. Stroked all the way to the sole, the
      // cap's half-disc poked out under every foot chip at zoom.
      const shinLen0 = Math.hypot(fxx - kx, fyy - ky) || 1;
      const aux = (fxx - kx) / shinLen0;
      const auy = (fyy - ky) / shinLen0;
      const shinLW = Math.max(2, s * (skel ? 0.052 * skel.heavy : bootSt ? 0.1 : 0.09));
      const ankPull = shinLW * 0.55;
      const ankX = fxx - aux * ankPull;
      const ankY = fyy - auy * ankPull;
      ctx.strokeStyle = thighCol;
      ctx.lineWidth = Math.max(2, s * (skel ? 0.066 * skel.heavy : 0.09));
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kx, ky);
      if (shinCol === thighCol && !skel) {
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
      } else {
        ctx.stroke();
        ctx.strokeStyle = shinCol;
        if (skel) ctx.lineWidth = Math.max(2, s * 0.052 * skel.heavy);
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
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
  const isBow = weapon !== undefined && bowStyle(weapon.id) !== null;
  // THE GREAT SCHOOL asks first — the check-great-first law: a
  // 'greatsword'-shaped id also satisfies bladeStyle's '*sword'
  // fallback, so the one-hand registry must never see it.
  const isGreat = weapon !== undefined && greatStyle(weapon.id) !== null;
  // Blades — swords and daggers both — share the low carriage AND the
  // grip-aware strike vocabulary (incl. the reverse grip). Identity
  // comes from the style registries; roster ids (falchion, hush,
  // stormcaller, ...) don't all say 'sword'/'dagger'/'staff'.
  const isSword = !isGreat && weapon !== undefined && bladeStyle(weapon.id) !== null;
  const isStaff = weapon !== undefined && staffStyle(weapon.id) !== null;
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
  const tw = 0.185 * s; // shoulder half-width
  const ww = 0.125 * s; // waist half-width
  const th = 0.46 * s * (1 - 0.12 * crouch); // hip line → shoulders

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
  const armY = hipY - 0.26 * s;
  const shoulderY = hipY - th * hScale + 0.06 * s;
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
  let mainX: number;
  let mainY: number;
  if (thrustR !== null) {
    mainX = rig.x + fx * thrustR * s * wS;
    mainY = armY + fy * thrustR * s + strikeLiftS * s;
  } else if (ice) {
    // Icepick: the fist rides its coil-high/drive-down path.
    mainX = rig.x + fx * ice.r * s * wS;
    mainY = armY + fy * ice.r * s + ice.lift * s;
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
  let mainFore = 1;
  let offFore = 1;
  let heldAngle = thrustR !== null ? rig.dir : mainAngle;
  if (strikeBladeRel !== null) {
    // THE WRIST LAW (strikeFrame's blade channel): the blade lags the
    // arm cocked through the coil and the hold, whips to a lead at
    // impact, settles straight — a whip-crack cut, not a windshield
    // wiper. The reverse grip runs the same beat around its π
    // reversal, tight and locked — the grip never lies. The cut
    // sweeps the GROUND plane, so the strike projection bends the
    // screen angle and shortens the steel along the depth axis.
    const ps = projectStrike(mainAngle + strikeBladeRel);
    heldAngle = ps.angle;
    mainFore = ps.fore;
  } else if (staffSpin !== null) {
    // THE POLE SCHOOL's tangent hold, through the same projection.
    const ps = projectStrike(mainAngle + staffSpin);
    heldAngle = ps.angle;
    mainFore = ps.fore;
  } else if (ice) {
    // The reversed blade stays pointed at the strike mark all the way
    // through the coil and the drive — menace through the whole beat.
    // The mark is a SCREEN target, so the angle stays target-true; the
    // depth read comes from the length alone.
    const markX = rig.x + fx * 0.6 * s * wS;
    const markY = armY + fy * 0.6 * s + 0.26 * s;
    heldAngle = Math.atan2(markY - mainY, markX - mainX);
    mainFore = projectStrike(rig.dir).fore;
  } else if (greatFinPitch !== null) {
    // THE MOUNTAIN FALLS: the blade's overhead haul is a world pitch —
    // straight up through the poise, crashing to down-forward at the
    // bury — projected exactly like a carry.
    const gp = projectCarry(rig.dir, greatFinPitch);
    heldAngle = gp.angle;
    mainFore = gp.fore;
  } else if (thrustR !== null) {
    // The lunge rams straight down the aim — angle target-true, the
    // blade honestly shorter when the aim runs into the screen.
    mainFore = projectStrike(rig.dir).fore;
  }
  let staffGrip = 0.34; // combat default: gripped low, business end forward
  if (staffStrikeGrip !== null) staffGrip = staffStrikeGrip;
  let armSwingK = 1;
  let restSettle = 0;
  const restSide = Math.sign(fx) || 1;
  // SMOOTHED REST SIDE: sign(fx) flips instantly as the aim crosses
  // vertical, and every rest anchor mirroring on it used to teleport —
  // the mid-run "wrists flip around" snap. With caller memory the side
  // eases ±1→∓1 through 0 over 240ms: the hands PASS across the body
  // and every carriage angle (all linear in side) sweeps with them.
  // The flip only REGISTERS once the facing is clearly past vertical
  // (|fx| > 0.12): walking straight north/south, fx jitters around
  // zero, and an undebounced sign ping-ponged the hands across the
  // body every few steps — the "pivoting between two frames" read.
  let sideS = restSide;
  const mem = rig.depthMemory;
  if (mem) {
    if (mem.side === undefined) {
      mem.side = restSide;
      mem.sideFlipMs = -1e9;
    }
    if (mem.side !== restSide && Math.abs(fx) > 0.12) {
      mem.prevSide = mem.side;
      mem.side = restSide;
      mem.sideFlipMs = rig.nowMs;
    }
    const t = Math.max(0, Math.min(1, (rig.nowMs - (mem.sideFlipMs ?? -1e9)) / 240));
    const k = t * t * (3 - 2 * t);
    sideS = mem.side * k + (mem.prevSide ?? mem.side) * (1 - k);
  }
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
  const sideW = sideS * (0.2 + 0.8 * profileK);
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
  if (
    (rig.pose === PoseState.Walk || rig.pose === PoseState.Idle || rig.pose === PoseState.Sneak) &&
    !drawing &&
    !loosing
  ) {
    restSettle = rig.restT * rig.restT * (3 - 2 * rig.restT);
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
    const hangW = ww * 1.08 + (tw * 1.02 - ww * 1.08) * profileK;
    // THE RUNNER'S ELBOW: an empty fist rises toward the ribs as the
    // gait becomes a sprint — bent arms pumping with the legs, the
    // shape every running reference draws. Armed fists keep their
    // carriage heights (a carry law is a verdict). Facing-weighted
    // inside runnerLift: full lift in profile, half at the camera
    // lines, where the full lift tucked both fists into the armpits.
    const elbowLift = runnerLift(Math.min(1, rig.poleStrength), rig.runF, profileK) * s;
    let hx = rig.x + wSide * hangW * wS;
    let hy = armY + 0.17 * s - elbowLift;
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
      const proj = projectCarry(rig.dir, Math.PI / 2 - canon.angle);
      hAngle = proj.angle;
      hFore = proj.fore;
      hx += c.dx * s * wS;
      hy = armY + (0.17 + c.dy) * s;
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
      const gf = greatWield(
        rig.dir,
        wSide,
        Math.min(1, rig.poleStrength),
        rig.runF,
        swS,
        rig.poleX,
      );
      hAngle = gf.angle;
      hFore = gf.fore;
      hx = rig.x + gf.dx * s * wS + fx * 0.04 * s;
      hy = armY + gf.dy * s;
      staffGrip = gf.grip;
      armSwingK = gf.pumpK;
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
      const sf = staffWield(
        rig.dir,
        wSide,
        Math.min(1, rig.poleStrength),
        rig.runF,
        swS,
        rig.poleX,
      );
      hAngle = sf.angle;
      hFore = sf.fore;
      hx = rig.x + sf.dx * s * wS + fx * 0.05 * s;
      hy = armY + sf.dy * s;
      staffGrip = sf.grip;
      armSwingK = sf.pumpK;
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
      const bf = bowWield(rig.dir, sideW, Math.min(1, rig.poleStrength), rig.runF);
      hAngle = bf.angle;
      hFore = bf.fore;
      hx += bf.dx * s * wS;
      hy = armY + bf.dy * s;
    }
    mainX += (hx - mainX) * restSettle;
    mainY += (hy - mainY) * restSettle;
    heldAngle += angleDelta(heldAngle, hAngle) * restSettle;
    mainFore += (hFore - mainFore) * restSettle;
    // The off fist: bare hands hang; a dual wielder's second blade gets
    // the same grip vocabulary as the main — its own side, its own
    // grip, its own flourish phase (the two never twirl in sync). The
    // hand rides a touch higher and tighter than the main: the trailing
    // blade of a paired stance, not a mirror image.
    let ox = rig.x - wSide * hangW * wS;
    let oy = armY + 0.17 * s - elbowLift;
    if (offBlade) {
      // The carriage mirrors on FACING, not on the hanging side — the
      // off fist trails the facing, so its outward push (dx) mirrors
      // while the blade angles stay true to forward/backward.
      const oc = bladeCarriage(offGrip, sideW, runK, offCompact);
      // The off blade rides the same projection law as the main: its
      // profile rake becomes a world pitch, and N/S carries draw
      // honestly short instead of relaxing to a screen vertical.
      const oCanon = bladeCarriage(offGrip, 1, runK, offCompact);
      const oProj = projectCarry(rig.dir, Math.PI / 2 - oCanon.angle);
      let oAngle = oProj.angle;
      offFore += (oProj.fore - offFore) * restSettle;
      // The off fist is the NEAR arm — visible at the side from every
      // facing; side-on it pulls part-way onto the body (where a near
      // arm actually hangs in profile) and the depth flip below paints
      // it FOREMOST, over the torso.
      ox -= oc.dx * s * wS;
      oy = armY + (0.15 + oc.dy) * s;
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
    offX += (ox - offX) * restSettle;
    offY += (oy - offY) * restSettle;
  }

  // Walking: arms swing counter to the legs along the travel direction.
  // Sneak walks the same law at a stalker's amplitude — the old gate
  // froze a sneaking figure's arms dead from the first crouched step.
  if (
    rig.pose === PoseState.Walk ||
    rig.pose === PoseState.Idle ||
    rig.pose === PoseState.Sneak
  ) {
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
    mainX += p.dx * armSwingK;
    mainY += (p.dy - bounce) * armSwingK;
    const offSwingK = offBlade ? 0.85 : 1;
    offX -= p.dx * offSwingK;
    offY -= (p.dy - bounce) * offSwingK;
    // The torso counter-sway of a real gait, living wherever the
    // fore/aft component leaves the screen (travel-true, not a
    // facing patch) — shared by both hands, never mirrored.
    const sway = p.sway * s * Math.min(1, rig.poleStrength);
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
    const rest = 1 - Math.min(1, rig.poleStrength);
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
    offX = rig.x + fx * (0.14 + 0.18 * u) * s * wS;
    offY = armY + fy * (0.14 + 0.18 * u) * s;
    // THE PRESENT: a staff LEVELS onto the aim line for the beat of
    // the spell — crown at the mark, flaring — instead of hanging on
    // the guard angle while the free hand does all the talking.
    if (isStaff) {
      heldAngle += angleDelta(heldAngle, rig.dir) * u;
      mainX += fx * 0.08 * s * wS * u;
      mainY += fy * 0.08 * s * u;
    }
  }

  // Archery: the FRONT hand holds the bow at arm's length toward the
  // aim; the string hand physically hauls the string back to the cheek.
  let bowX: number | null = null;
  let bowY = 0;
  let bowPull = 0;
  if (drawing || loosing) {
    const bd = reach * 1.2;
    bowX = rig.x + fx * bd * wS;
    bowY = armY + fy * bd;
    if (loosing) {
      const t = rig.poseT;
      bowX -= fx * 0.05 * s * (1 - t); // recoil kick back into the grip
      bowPull = 0.03 * s;
      mainX = bowX - fx * 0.07 * s; // string hand snapped forward
      mainY = bowY + 0.02 * s;
    } else {
      bowPull = (0.08 + 0.3 * drawT) * s;
      mainX = bowX - fx * bowPull;
      mainY = bowY + (shoulderY + 0.06 * s - bowY) * (0.35 * drawT);
      if (drawT >= 0.97) {
        // Full-draw tension tremble — the whole aim quivers with effort.
        const tr = Math.sin(rig.nowMs * 0.05) * 0.008 * s;
        mainX += -fy * tr;
        mainY += fx * tr;
        bowX += -fy * tr * 0.5;
        bowY += fx * tr * 0.5;
      }
    }
    offX = bowX;
    offY = bowY;
  }

  // ---- the sheathe: one blend moves the weapons between hand and body.
  // Blades stow to the belt, bows and staffs sling across the back; the
  // spots live in sheath.ts (pure, test-pinned) and ride hipY/shoulderY,
  // so they duck with a crouch and settle with a sit for free.
  const wornGreat = wornDef !== undefined && greatStyle(wornDef.id) !== null;
  const wornBow = wornDef !== undefined && bowStyle(wornDef.id) !== null;
  const wornStaff = wornDef !== undefined && staffStyle(wornDef.id) !== null;
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
  const TRAIL_K = 0.62;
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
      const tx = rig.x + fx * reach * wS;
      const ty = armY + fy * reach + 0.24 * s;
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
      const tx = ice ? rig.x + fx * 0.6 * s * wS : rig.x + fx * r1;
      const ty = ice ? armY + fy * 0.6 * s + 0.26 * s : armY + fy * r1;
      const sx = ice ? rig.x + fx * 0.08 * s : rig.x + fx * 0.15 * s;
      const sy = ice ? armY + fy * 0.08 * s - 0.2 * s : armY + fy * 0.15 * s;
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
  mainShX += (rig.x + sideS * tw * 0.85 * wS - mainShX) * settleK;
  offShX += (rig.x - sideS * tw * 0.85 * wS - offShX) * settleK;
  // Aiming up-and-away puts the gear behind the body. And a LONG
  // carry crossing the body goes behind it too: the staff's leveled
  // run trail at a camera-facing heading swept its butt half up
  // across the chest and FACE when painted in front (the user's
  // catch) — the body belongs in front of the pole, crown showing
  // beside the hip, butt hidden behind the shoulder. Gated on the
  // run trail itself (a planted stick and the combat guard stay in
  // front, where the business end lives).
  const staffTrailBehind = isStaff && restSettle > 0.5 && rig.runF > 0.35 && fy > 0.08;
  // The shoulder carry lays the greatblade up-BACK over the trailing
  // shoulder at EVERY gait — facing the camera, the body stands in
  // front of it (the LONG CARRY GOES BEHIND law; strikes and the
  // guard keep the business end in front). Facing AWAY the same rest
  // lies on the NEAR side of the body — the blade crosses the BACK,
  // which the camera sees — so the generic aim-away rule must not
  // hide it behind the torso.
  const greatShoulderBehind = isGreat && restSettle > 0.5 && fy > 0.08;
  const greatRestFront = isGreat && restSettle > 0.5 && fy < -0.08;
  const weaponBehind =
    (fy < -0.35 && !greatRestFront) || staffTrailBehind || greatShoulderBehind;
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
      shoulderY,
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
    );
    if (shieldSt && shieldFr) {
      if (shieldBehindArm) drawShieldStraps(ctx, shieldSt, shieldFr, rig.hurt);
      else drawShield(ctx, shieldSt, shieldFr, rig.hurt, rig.nowMs);
    }
    // Arm-carried offhand rides the solved forearm, same depth layer as
    // the arm itself so the strap never breaks. An archer's off hand is
    // busy holding the bow — the shield sits this one out.
    if (offSt && offSt.kind !== 'quiver' && !archer && !offWeapon && !shieldSt) {
      drawOffhandOnArm(ctx, offSt, joints, s, profileK, rig.hurt);
    }
  };
  // Back-mounted quiver. Depth follows the cape's facing law — behind
  // the torso when the player faces the camera, in front when they face
  // away. With a cape worn the RENDERER owns this call (drawBackGear),
  // layered over the cloth — gear straps OVER a cape, never under it.
  const quiverFront = offSt?.kind === 'quiver' && fy < -0.16;
  const paintQuiver = (): void => {
    if (!offSt || offSt.kind !== 'quiver' || rig.hasCape) return;
    drawQuiver(ctx, offSt, rig.x - fx * 0.14 * s, shoulderY - 0.02 * s, s, lead, rig.hurt);
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
  const slingFront = fy < -0.16;
  // (The leg layer, belt gear, and quiver paint down at the depth
  // ladder — after every paint closure exists, before the torso.)
  const paintMainArm = (): void => {
    drawArm(
      ctx,
      mainShX,
      shoulderY,
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
    );
  };
  // ---- THE SHOULDER DEPTH LAW: a pauldron is a cap on TOP of the
  // shoulder, so under the tilted bird's eye it stays visible at
  // nearly every facing — including from behind (riding the arms'
  // layer used to sink BOTH caps whenever the arms dropped behind the
  // torso: a knight seen from the back lost his pauldrons). Only in
  // the PROFILE band does one shoulder genuinely hide: the LEADING
  // one belongs to the far side of the turned body — it ducks BEHIND
  // the torso and peeks over the shoulder line, never in front of the
  // chest (the flipped-shoulder read the user caught). Position still
  // rides the solved anchors so the caps travel with the swings;
  // lighting follows the ONE SUN, screen-left, like every other form
  // split — never the weapon hand.
  const paintPauldrons = (layer: 'behind' | 'front'): void => {
    if (!bodySt || bodySt.pauldron === 'none') return;
    const profileBand = Math.abs(fy) <= 0.35;
    const leadSgn = Math.sign(fx) || 1;
    for (const [sx, fallback] of [
      [offShX, -lead],
      [mainShX, lead],
    ] as Array<[number, number]>) {
      const side = Math.sign(sx - rig.x) || fallback || 1;
      const behind = profileBand && side === leadSgn;
      if ((layer === 'behind') !== behind) continue;
      drawPauldron(ctx, bodySt, sx, shoulderY, side, s, wS, rig.hurt, side < 0, rig.nowMs);
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
      drawHeldItem(ctx, weapon.id, weapon.color, bowX, bowY, rig.dir, s, rig, {
        pull: bowPull,
        loose: loosing ? rig.poseT : undefined,
        ench: rig.weaponEnch,
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
  const gearBehindLegs = fy < -0.35 && !greatRestFront;
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
  const beltBehind = profileK > 0.62;
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

  // ---- head measurements, resolved BEFORE the torso paints. Hair is
  // a two-pass matter (THE HAIR RIDES THE SKULL RING, hair.ts): the
  // far-side pass lies UNDER the body — behind-the-head falls are
  // occluded by the torso from the front, exactly like real hair down
  // the back — while the near-side pass paints over the skull later.
  // Kobolds carry OVERSIZED heads for their frame — the big-headed
  // burrow-goblin proportion the whole species reads by; the kobold
  // skull hangs LOW and thrust FORWARD off the hump.
  const headR = 0.15 * s * (kob ? 1.16 : 1);
  const headX = kob ? fx * 0.14 * s : fx * 0.05 * s;
  const headY = kob ? -th - headR * 0.48 : -th - headR * 0.82;
  const hw = headR * 1.04; // half-width
  const hh = headR * 1.0; // half-height
  const cut = headR * 0.34;
  const helm = itemDef(rig.headItem ?? '');
  const helmSt = helm ? helmStyle(helm.id) : null;
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
        : helmKind === 'hood'
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
  // The bone and scale dialects replace head, hair, and face wholesale.
  if (!skel && !kob) drawHairBack(ctx, hairFrame, hairIx, cover);

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
  if (offFront) paintOffArm();
  if (!weaponBehind && !mainBehind) {
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
  const stowedGreat = worn !== undefined && greatStyle(worn.id) !== null;
  const stowedBow = worn !== undefined && bowStyle(worn.id) !== null;
  const stowedStaff = worn !== undefined && staffStyle(worn.id) !== null;
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
  const th = 0.46 * s * (1 - 0.12 * crouch);
  const shoulderY = hipY - th * hScale + 0.06 * s;
  const lead = fx >= 0 ? 1 : -1;
  if (st?.kind === 'quiver') {
    drawQuiver(ctx, st, rig.x - fx * 0.14 * s, shoulderY - 0.02 * s, s, lead, rig.hurt);
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
  astral: 'star',
  verdant: 'gleam',
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
 * Overlay an enchant's fx channel on a resolved weapon style — the
 * style object is data, so a shallow clone re-aims the existing mote
 * painters at the enchant's element without touching the silhouette.
 */
export function enchantedStyle<T extends { fx?: unknown; fxColor?: string }>(
  st: T,
  ench: string | undefined,
  family: 'blade' | 'staff',
): T {
  const def = ench ? enchantDef(ench) : undefined;
  if (!def) return st;
  const color = ELEMENT_COLORS[def.element];
  if (def.tier <= 1) {
    // A whisper of magic: the traveling glint (staffs: drifting motes).
    return { ...st, fx: family === 'staff' ? 'motes' : 'gleam', fxColor: color };
  }
  const fx =
    family === 'staff'
      ? (ENCH_STAFF_FX[def.element] ?? 'motes')
      : (ENCH_BLADE_FX[def.element] ?? 'gleam');
  return { ...st, fx, fxColor: color };
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
  const fore = extra?.fore ?? 1;
  if (fore !== 1) {
    if (bowStyle(itemId) !== null) ctx.scale(1, fore);
    else ctx.scale(fore, 1);
  }
  // Mid-arc wood point: the bow's quadratic (tips 0.06s, belly control
  // 0.3s) passes through x = 0.18s at grip height — align THAT to the
  // fist, or the bow reads as resting on the wrist.
  if (extra?.carry) ctx.translate(-0.18 * s * extra.carry, 0);

  // The item-space envelope each roster's art can reach — the outline
  // scratch is sized from this, so keep it tight per class (a bow is
  // tall, a blade is long, and paying the widest box for every belt
  // knife would bill the whole town).
  let env: readonly [number, number, number];
  let paint: (c: CanvasRenderingContext2D) => void;
  if (greatStyle(itemId, color)) {
    // THE GREAT SCHOOL asks first (the check-great-first law: a
    // 'greatsword'-shaped id also satisfies bladeStyle's fallback).
    // The grip slides with the carry exactly like the staff's — high
    // on the shouldered rest, mid-haft through the cuts.
    env = [-1.3, 1.3, 0.45];
    paint = (c) => drawGreatweapon(c, greatStyle(itemId, color)!, s, rig.nowMs, rig.hurt, extra?.grip ?? 0.2);
  } else if (bladeStyle(itemId, color)) {
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
  } else if (bowStyle(itemId, color)) {
    // The archer's roster: every bow resolves a style — limb kind,
    // wood, tip furniture, charms, and the living fx channel. The
    // painter keeps the classic behaviors: limbs flex with the pull,
    // the string hauls to the nock, release buzzes it straight.
    env = [-0.5, 0.7, 0.85];
    paint = (c) => drawBow(c, enchantedStyle(bowStyle(itemId, color)!, extra?.ench, 'blade'), s, rig.nowMs, rig.hurt, extra?.pull ?? 0, extra?.loose);
  } else if (staffStyle(itemId, color)) {
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const b0 = A(0.05, 0.28, 0.24);
    const b1 = A(-0.32, 0.85, 0.5);
    const b2 = A(-0.42, 1.45, 0.72);
    const brow = A(0.5, 0.85, 0.36);
    const mid = A(0.1, 1.35, 0.62);
    const tipA = A(-0.12, 1.9, 0.8);
    const tipB = A(-0.95, 1.72, 0.84);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C(look.antler);
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
    seg(b0, b1, w * 0.1);
    seg(b1, b2, w * 0.08);
    seg(b0, brow, w * 0.06);
    seg(b1, mid, w * 0.055);
    ctx.strokeStyle = C(shade(look.antler, 16));
    seg(b2, tipA, w * 0.05);
    seg(b2, tipB, w * 0.05);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
    const profileK = Math.min(1, Math.abs(fx) * 1.15);
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
  const legColor = opts.hurt ? '#ffffff' : (spec.legColor ?? shade(opts.color, -35));
  const shinColor = opts.hurt ? '#ffffff' : (spec.legColor ?? shade(opts.color, -22));
  const footColor = opts.hurt ? '#ffffff' : shade(spec.legColor ?? opts.color, -55);
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
    const { ex, ey, kx, ky } = solveLimbInto(
      LEG_SOLVE,
      hipX,
      hipY,
      foot.x,
      footY,
      L,
      stretch,
      cxn * sign,
      cyn * sign,
    );

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
  // ---- paint closures, composed in true depth order below.
  let seed = 0;
  for (let i = 0; i < opts.defId.length; i++) {
    seed = (seed * 31 + opts.defId.charCodeAt(i)) | 0;
  }
  seed = (seed ^ ((opts.seed ?? 0) * 2654435761)) | 0;
  const cattle = CATTLE_LOOKS[opts.defId];
  const wolfL = opts.defId === 'wolf' ? WOLF_LOOK : undefined;
  const direL = opts.defId === 'dire_wolf' ? DIREWOLF_LOOK : undefined;
  const worgL = opts.defId === 'worg' ? WORG_LOOK : undefined;
  const ratL = opts.defId === 'rat' ? RAT_LOOK : undefined;
  const boarL = opts.defId === 'boar' ? BOAR_LOOK : undefined;
  const spiderL = opts.defId === 'giant_spider' ? SPIDER_LOOK : undefined;
  const ramL = opts.defId === 'ram' ? RAM_LOOK : undefined;
  const stagL = opts.defId === 'stag' ? STAG_LOOK : undefined;
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
    if (stagL) {
      paintStagBody(ctx, spec, stagL, blockFrame());
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
  if (!tailFront) paintTail();
  if (headBack) paintHead();
  if (udderBehind) paintUdder();
  for (const i of farLegs) drawLeg(i);
  paintBody();
  if (!udderBehind) paintUdder();
  if (!headBack && !headFront) paintHead();
  for (const i of nearLegs) drawLeg(i);
  if (headFront) paintHead();
  if (tailFront) paintTail();
}
