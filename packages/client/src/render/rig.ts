import { CLOTH_COLORS, HAIR_COLORS, PoseState, SKIN_TONES, type Look } from '@devcraft/shared';
import { ELEMENT_COLORS, enchantDef, itemDef } from '@devcraft/content';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import {
  bladeStyle,
  bowStyle,
  drawBow,
  drawSword,
  drawStaff,
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
/** Duration of one furnace stoking push, ms. */
export const FURNACE_CYCLE_MS = 1700;

/** Arm segment length (upper = fore), in tile units. */
const ARM_LEN = 0.17;

/** Shared per-frame IK scratches (see solveLimbInto's contract). */
const ARM_SOLVE: LimbSolve = { ex: 0, ey: 0, kx: 0, ky: 0 };
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
): { ex: number; ey: number; kx: number; ky: number } {
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

export function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const skel = rig.skeletal ?? null;
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

  // Sneak crouch: dropping the hip line shortens the leg chain so the IK
  // bends the knees for free, and the whole arm frame (armY/shoulderY)
  // hangs off hipY so the weapon carriage ducks with the body.
  const crouch = rig.pose === PoseState.Sneak ? Math.min(1, rig.poseT) : 0;

  // The body rides the hip line, which rides the gait bob.
  const hipY = rig.y - (rig.rise + rig.bob * 0.45) * s + 0.11 * s * crouch;

  // ---- legs: two-bone IK from SCREEN-FIXED hips to planted feet.
  const L = (LEG_LEN / 2) * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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
    const sign = chooseKneeSign(
      cxn,
      cyn,
      fx,
      fy,
      sgn,
      rig.kneeMemory[i] ?? 0,
    );
    rig.kneeMemory[i] = sign;
    const kx = hipX + ex / 2 + cxn * sign * bend;
    const ky = hipY + ey / 2 + cyn * sign * bend;

    // Leg dressing: thigh and shin as separate strokes so greaves and
    // wraps can recolor the lower leg; default = today's exact colors.
    // Skeletal legs are bare bone: femur thicker than tibia, a condyle
    // knob at the knee — no cloth ever dressed these.
    const baseLeg = skel
      ? shade(skel.bone, -3)
      : rig.look
        ? shade(CLOTH_COLORS[rig.look.pants]!, -8)
        : shade(bodyColor, -28);
    const thighCol = rig.hurt ? '#ffffff' : (legSt?.thigh ?? baseLeg);
    const shinCol = rig.hurt
      ? '#ffffff'
      : skel
        ? skel.bone
        : (legSt?.shin ?? legSt?.thigh ?? baseLeg);
    const fxx = hipX + ex;
    const fyy = hipY + ey;
    ctx.strokeStyle = thighCol;
    ctx.lineWidth = Math.max(2, s * (skel ? 0.066 * skel.heavy : 0.09));
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kx, ky);
    if (shinCol === thighCol && !skel) {
      ctx.lineTo(fxx, fyy);
      ctx.stroke();
    } else {
      ctx.stroke();
      ctx.strokeStyle = shinCol;
      if (skel) ctx.lineWidth = Math.max(2, s * 0.052 * skel.heavy);
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(fxx, fyy);
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
      ctx.lineTo(fxx, fyy);
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
    } else {
      ctx.fillStyle = bootCol;
      ctx.beginPath();
      chamferRect(ctx, fxx - 0.075 * s, fyy - 0.03 * s, 0.15 * s, 0.06 * s, 0.022 * s);
      ctx.fill();
    }
    if (bootSt?.toe && !rig.hurt) {
      // Steel toe on the leading half of the foot.
      ctx.fillStyle = bootSt.toe;
      ctx.beginPath();
      chamferRect(ctx, fxx + (lead > 0 ? 0.01 : -0.075) * s, fyy - 0.028 * s, 0.065 * s, 0.055 * s, 0.018 * s);
      ctx.fill();
    }
    if (bootSt?.curl && !rig.hurt) {
      // The curled slipper toe — a hook of cloth rising off the tip.
      ctx.strokeStyle = bootSt.cuff?.color ?? shade(bootCol, 16);
      ctx.lineWidth = Math.max(2, s * 0.042);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fxx + lead * 0.06 * s, fyy - 0.004 * s);
      ctx.quadraticCurveTo(fxx + lead * 0.13 * s, fyy + 0.006 * s, fxx + lead * 0.108 * s, fyy - 0.052 * s);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  // ---- arms + weapon. Hand targets change with what the character is
  // doing; two-segment IK arms connect them back to the shoulder line.
  const wS = rig.wScale;
  const hScale = 1 + (1 - wS) * 0.55;
  const weapon = itemDef(rig.weaponItem ?? '');
  const isBow = weapon !== undefined && bowStyle(weapon.id) !== null;
  // Blades — swords and daggers both — share the low carriage AND the
  // grip-aware strike vocabulary (incl. the reverse grip). Identity
  // comes from the style registries; roster ids (falchion, hush,
  // stormcaller, ...) don't all say 'sword'/'dagger'/'staff'.
  const isSword = weapon !== undefined && bladeStyle(weapon.id) !== null;
  const isStaff = weapon !== undefined && staffStyle(weapon.id) !== null;
  // A reversed main fist changes the ATTACK choreography, not just the
  // carriage — tighter rakes, locked wrist, icepick finisher.
  const rogueMelee = isSword && rig.carryStyle === 'rogue';
  // Per-fist grips + the off blade, hoisted above the melee block: the
  // dual-wield echo choreography needs them at strike time, not just
  // at rest. Flip is a property of the GRIP, constant through swings.
  const mainGrip: Grip = rig.carryStyle === 'rogue' ? 'rogue' : 'normal';
  const offGrip: Grip = rig.carryOff === 'rogue' ? 'rogue' : 'normal';
  const offBlade = offSt?.kind === 'weapon' && rig.offhandItem !== undefined;
  // The tool TYPE picks the work cycle: an axe chops, a pick heaves
  // overhead and pries — different rhythms, different bodies. Rods (and
  // bare hands) keep the gentle working sway.
  const toolType = weapon?.tool?.type;
  // Foraging outranks the belt tool: picking herbs is hand-work even
  // with an axe on the hip (the caller also holsters the tool sprite).
  const foraging = rig.pose === PoseState.Gather && rig.foraging === true;
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
  if (meleeStage === 0 || meleeStage === 1) {
    const t = rig.poseT;
    const f = strikeFrame(rogueMelee ? 'rogue' : 'normal', meleeStage as 0 | 1, t);
    swingOffset = f.arm;
    strikeReachK = f.reach;
    strikeLiftS = f.lift;
    if (isSword) strikeBladeRel = f.blade;
    lean = f.lean;
    mainTrail = strikeTrail(rogueMelee ? 'rogue' : 'normal', meleeStage as 0 | 1, t);
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
    } else {
      const tp = thrustPath(t);
      thrustR = tp.r;
      strikeLiftS = tp.lift;
    }
    lean = finisherLean(t) * Math.sign(fx || 1); // tip the torso along the strike
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
    swingOffset = rel;
    lean *= Math.sign(fx || 1);
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
    swingOffset = rel;
    lean *= Math.sign(fx || 1);
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
  let heldAngle = thrustR !== null ? rig.dir : mainAngle;
  if (strikeBladeRel !== null) {
    // THE WRIST LAW (strikeFrame's blade channel): the blade lags the
    // arm cocked through the coil and the hold, whips to a lead at
    // impact, settles straight — a whip-crack cut, not a windshield
    // wiper. The reverse grip runs the same beat around its π
    // reversal, tight and locked — the grip never lies.
    heldAngle = mainAngle + strikeBladeRel;
  } else if (ice) {
    // The reversed blade stays pointed at the strike mark all the way
    // through the coil and the drive — menace through the whole beat.
    const markX = rig.x + fx * 0.6 * s * wS;
    const markY = armY + fy * 0.6 * s + 0.26 * s;
    heldAngle = Math.atan2(markY - mainY, markX - mainX);
  }
  let staffGrip = 0.34; // combat default: gripped low, business end forward
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
    const eTarget = rig.dir + echoF.arm + echoF.blade;
    offBladeAngle += angleDelta(offBladeAngle, eTarget) * echoW;
  }
  if (
    (rig.pose === PoseState.Walk || rig.pose === PoseState.Idle || rig.pose === PoseState.Sneak) &&
    !drawing &&
    !loosing
  ) {
    restSettle = rig.restT * rig.restT * (3 - 2 * rig.restT);
    const wSide = sideS;
    const runK = rig.runF;
    // THE HANG-WIDTH LAW: hands hang at shoulder width only in PROFILE
    // (where the near hand must clear the turned torso). Front-on and
    // back-on a relaxed arm tapers in from the shoulder to brush the
    // HIP line — full-width hands at a frontal facing floated outward
    // off the body, both fists splayed wide of the silhouette (the
    // "hands come outward" read). Linear in profileK, so the stance
    // breathes continuously through every diagonal.
    const hangW = ww * 1.08 + (tw * 1.02 - ww * 1.08) * profileK;
    let hx = rig.x + wSide * hangW * wS;
    let hy = armY + 0.17 * s;
    let hAngle = Math.PI / 2 + sideW * (0.3 + 0.35 * runK); // tip down, trailing
    // How "at rest" the rest really is: flourishes and wrist life only
    // play when the figure is planted (no gait, no sneak crouch) —
    // a sneaking rogue does not twirl knives.
    const idleK = (1 - Math.min(1, rig.poleStrength)) * (1 - crouch);
    if (isSword) {
      const c = bladeCarriage(mainGrip, sideW, runK, mainCompact);
      hAngle = c.angle;
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
    if (isStaff) {
      // Walking stick ↔ run carry, blended on the gait itself.
      const carry = runK * runK * (3 - 2 * runK);
      // Planted stick rocks with the steps — the stride works the staff
      // (on the SMOOTHED swing, so the rock sweeps instead of hinging).
      const rock = -swS * 0.2 * rig.poleX * (1 - carry) * Math.min(1, rig.poleStrength);
      const up = -Math.PI / 2 + rock;
      // Orb forward, held low — continuous in the facing weight, so the
      // run carry levels fully at profile and stays near-upright when
      // the travel is straight toward or away from the camera.
      const level = -Math.PI / 2 + sideW * (Math.PI / 2 - 0.3);
      hAngle = up + (level - up) * carry;
      // Held at arm's distance — the planted staff stands clear of the
      // torso silhouette, the way a person actually leans on a stick.
      hx = rig.x + wSide * (0.27 + 0.02 * carry) * s * wS + fx * 0.05 * s;
      hy = armY + (-0.04 + 0.2 * carry) * s;
      staffGrip = 0.72 - 0.3 * carry; // high grip on the stick, mid on the carry
      armSwingK = 0.3 + 0.7 * carry; // a planted hand doesn't pump
    } else if (isBow) {
      // The walking carry, reference-true: gripped by the wood with
      // the STRING facing the body (upper side) and the wooden belly
      // curving down-forward — the bow leans half-ready, top limb
      // toward the shoulder line, lower limb by the thigh, so raising
      // it into the aim is one motion. drawHeldItem slides the grip
      // wrap into the fist on the same settle blend.
      // Continuous in the facing weight: at profile the full half-ready
      // lean (0.85 rad), front/back a near-vertical hang at the side —
      // and the old binary mirror snap at north/south is gone.
      hAngle = Math.PI / 2 - sideW * (Math.PI / 2 - 0.85);
      hx += sideW * 0.12 * s * wS;
      hy = armY + 0.18 * s;
    }
    mainX += (hx - mainX) * restSettle;
    mainY += (hy - mainY) * restSettle;
    heldAngle += angleDelta(heldAngle, hAngle) * restSettle;
    // The off fist: bare hands hang; a dual wielder's second blade gets
    // the same grip vocabulary as the main — its own side, its own
    // grip, its own flourish phase (the two never twirl in sync). The
    // hand rides a touch higher and tighter than the main: the trailing
    // blade of a paired stance, not a mirror image.
    let ox = rig.x - wSide * hangW * wS;
    let oy = armY + 0.17 * s;
    if (offBlade) {
      // The carriage mirrors on FACING, not on the hanging side — the
      // off fist trails the facing, so its outward push (dx) mirrors
      // while the blade angles stay true to forward/backward.
      const oc = bladeCarriage(offGrip, sideW, runK, offCompact);
      let oAngle = oc.angle;
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
  if (rig.pose === PoseState.Walk || rig.pose === PoseState.Idle) {
    // The pump rides the SMOOTHED swing (clamped ±1 at the source):
    // the raw footfall drive hinges, the low-passed one sweeps.
    const sw = swS;
    // Arms pump harder as the walk becomes a run — but a hand carrying
    // a weapon keeps its vertical pump restrained, and MORE so facing
    // north/south, where the screen pump is purely vertical and used
    // to carry the fists toward chest height.
    const amp = (0.07 + 0.055 * rig.runF) * s * Math.min(1, rig.poleStrength);
    const armed = isSword || isBow || isStaff;
    const pumpY = 0.5 - (armed ? (0.18 + 0.16 * (1 - profileK)) * restSettle : 0);
    mainX += rig.poleX * sw * amp * armSwingK;
    mainY += (rig.poleY * sw * amp * pumpY - Math.abs(sw) * rig.runF * 0.03 * s) * armSwingK;
    const offSwingK = offBlade ? 0.85 : 1;
    offX -= rig.poleX * sw * amp * offSwingK;
    offY -= (rig.poleY * sw * amp * pumpY - Math.abs(sw) * rig.runF * 0.03 * s) * offSwingK;
    // Front/back travel has no screen-x pump at all (poleX ≈ 0); a
    // whisper of shared lateral sway — the torso counter-sway of a
    // real gait — keeps the restrained vertical pump from freezing.
    const sway = sw * (1 - profileK) * 0.018 * s * Math.min(1, rig.poleStrength);
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

  // Casting: the free hand punches a push toward the aim.
  if (rig.pose === PoseState.Cast && rig.poseT < 0.5) {
    const u = Math.sin((rig.poseT / 0.5) * Math.PI);
    offX = rig.x + fx * (0.14 + 0.18 * u) * s * wS;
    offY = armY + fy * (0.14 + 0.18 * u) * s;
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

  // Slash trails: a crisp crescent chasing each blade through its cut,
  // centered on the cut's plane (a high cleave rings high, a rising
  // return rings low) and fading through the held extension. The echo
  // draws its own smaller, fainter crescent — the second beat of the
  // one-two. The finishers fire a piston streak down the aim instead.
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
    ctx.arc(rig.x, cy, r0, from, to, ccw);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 252, 240, ${0.75 * a})`;
    ctx.lineWidth = 0.055 * s * k;
    ctx.beginPath();
    ctx.arc(rig.x, cy, r0 + 0.09 * s, from, to, ccw);
    ctx.stroke();
    ctx.lineCap = 'butt';
  };
  if (mainTrail && weapon?.weapon?.style === 'melee') {
    drawCrescent(mainTrail, (weapon.weapon.range ?? 1.5) * 0.27 * s, 1);
  }
  if (echoTr && offBlade) {
    const offRange = itemDef(rig.offhandItem!)?.weapon?.range ?? 1.5;
    drawCrescent(echoTr, offRange * 0.27 * s * 0.8, 0.7);
  }
  if (meleeStage === 2 && weapon?.weapon?.style === 'melee') {
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
  mainShX += (rig.x + sideS * tw * 0.85 * wS - mainShX) * restSettle;
  offShX += (rig.x - sideS * tw * 0.85 * wS - offShX) * restSettle;
  // Aiming up-and-away puts the gear behind the body.
  const weaponBehind = fy < -0.35;
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
      });
    }
    const joints = drawArm(
      ctx,
      offShX,
      shoulderY,
      offX,
      offY,
      (archer ? fx * 0.2 : Math.cos(offAngle) * 0.4) * (1 - restSettle) -
        sideS * 0.45 * restSettle,
      1,
      sleeve,
      skin,
      s,
      cuff,
      gloveSt,
      rig.hurt,
      skel,
    );
    // Arm-carried offhand rides the solved forearm, same depth layer as
    // the arm itself so the strap never breaks. An archer's off hand is
    // busy holding the bow — the shield sits this one out.
    if (offSt && offSt.kind !== 'quiver' && !archer && !offWeapon) {
      drawOffhandOnArm(ctx, offSt, joints, s, profileK, rig.hurt);
    }
    // The far pauldron is a true shoulder joint: it caps THIS arm's
    // root on its solved anchor, so it rides swings and draws instead
    // of staying glued to the torso corner.
    if (bodySt && bodySt.pauldron !== 'none') {
      const side = Math.sign(offShX - rig.x) || -lead;
      drawPauldron(ctx, bodySt, offShX, shoulderY, side, s, wS, rig.hurt, false, rig.nowMs);
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
  if (!quiverFront) paintQuiver();
  const paintMainArm = (): void => {
    drawArm(
      ctx,
      mainShX,
      shoulderY,
      mainX,
      mainY,
      (archer ? -fx : Math.cos(mainAngle) * 0.4) * (1 - restSettle) +
        sideS * 0.45 * restSettle,
      archer ? -0.6 : 1,
      sleeve,
      skin,
      s,
      cuff,
      gloveSt,
      rig.hurt,
      skel,
    );
    // Near pauldron caps the striking arm's root, over everything.
    if (bodySt && bodySt.pauldron !== 'none') {
      const side = Math.sign(mainShX - rig.x) || lead;
      drawPauldron(ctx, bodySt, mainShX, shoulderY, side, s, wS, rig.hurt, true, rig.nowMs);
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
        carry: isBow ? restSettle : 0,
        ench: rig.weaponEnch,
        flip: mainFlip,
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
  const offFront = !mainBehind && restSettle > 0.5 && fy > offFrontAt;
  if (mem) mem.offFront = offFront;
  if (mainBehind) {
    paintWeapon();
    paintMainArm();
  } else if (!offFront) {
    paintOffArm();
  }
  if (weaponBehind && !mainBehind) {
    paintWeapon();
    paintMainArm();
  }

  // Sprint lean: the torso tips into a full-tilt forward run — reads
  // side-on only (fx), and never when backpedaling against the aim.
  lean += 0.09 * rig.runF * Math.max(0, rig.align) * fx;

  // ---- torso + head, drawn in a local frame at the hip line with the
  // fake-3D squash: narrow side profile, full front/back profile, height
  // compensating inversely so the turn reads as orientation.
  ctx.save();
  ctx.translate(rig.x, hipY);
  // Combat lean: the torso coils and tips with swings and braced draws.
  if (lean !== 0) ctx.rotate(lean);
  ctx.scale(wS, hScale);

  // Torso garment: the styled body (robe, jerkin, brigandine, cuirass,
  // pauldrons) — the bare `tunic` default is the original silhouette.
  // The bone dialect wears no garment at all: the ribcage IS the torso.
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
        // Cloth trails the travel: the hem drags OPPOSITE the motion,
        // un-squashed into the local frame so profile runs still read.
        dragX:
          (-rig.poleX * Math.min(1, rig.poleStrength) * (0.1 + 0.14 * rig.runF)) /
          Math.max(0.6, wS),
      },
    );
  }

  // ---- head (inside the squash frame so turning carries it too).
  // A chamfered block, not a ball — and a BILLBOARD FACE, not a dial:
  // the head reads in bands (front, three-quarter, profile, back).
  // Eyes live on one fixed eye line and slide only horizontally with
  // the facing; the pair narrows through three-quarter, the far eye
  // slips around the corner at profile, and the back of the head shows
  // hair, not features. Sliding features vertically with fy is what
  // made the old head read top-down.
  const headR = 0.15 * s;
  const headX = fx * 0.05 * s;
  const headY = -th - headR * 0.82;
  const hw = headR * 1.04; // half-width
  const hh = headR * 1.0; // half-height
  const cut = headR * 0.34;
  const helm = itemDef(rig.headItem ?? '');
  const helmSt = helm ? helmStyle(helm.id) : null;
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
  } else {
  ctx.fillStyle = skin;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 2, cut);
  ctx.fill();
  if (!rig.hurt) {
    // THE FORM SPLIT: the head shares the torso's screen-fixed x=0
    // light — hard shade on the right half, a lit crown band, and a
    // jaw under-shade, so the block reads as a skull, not a sticker.
    ctx.fillStyle = shade(skin, -9);
    ctx.beginPath();
    chamferRect(ctx, headX, headY - hh, hw, hh * 2, [0, cut, cut, 0]);
    ctx.fill();
    ctx.fillStyle = shade(skin, -16);
    ctx.beginPath();
    chamferRect(ctx, headX - hw, headY + hh * 0.8, hw * 2, hh * 0.2, [0, 0, cut, cut]);
    ctx.fill();
    ctx.fillStyle = shade(skin, 8);
    ctx.beginPath();
    chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 0.18, [cut, cut, 0, 0]);
    ctx.fill();
  }
  // ---- hair, ears, and the face: all band-aware, all gated by what
  // the headwear allows. THE COVERAGE LAW: a helmet never deletes a
  // hairstyle, it CONTAINS it.
  //   free   — bare head or a circlet: the full hairdo.
  //   brim   — wizard's hat: fringe locks only (cloth holds the rest).
  //   open   — open-face metal (dome, horned): steel owns the crown,
  //            but curtains, side locks, and tails show below the rim.
  //   sealed — greathelm, bascinet: only the long styles' nape-fall
  //            escapes below the back rim.
  //   cloth  — hoods: the cloth wraps everything.
  const helmKind = helmSt?.kind;
  const cover: 'free' | 'brim' | 'open' | 'sealed' | 'cloth' =
    !helm || helmKind === 'circlet'
      ? 'free'
      : helmKind === 'wizard'
        ? 'brim'
        : helmKind === 'dome' || helmKind === 'horned'
          ? 'open'
          : helmKind === 'hood'
            ? 'cloth'
            : 'sealed';
  const hairCol = rig.hurt
    ? '#ffffff'
    : rig.look
      ? HAIR_COLORS[rig.look.hairColor]!
      : shade(bodyColor, -24);

  // A hanging plait: stacked beads narrowing to a tuft, tie bands
  // between beads — the braid vocabulary for hair AND beards. Beads
  // alternate their lit half left/right so the column reads as a
  // WEAVE, not a stack of boxes.
  const paintPlait = (bx: number, topY: number, w: number, segs: number): void => {
    let y = topY;
    let bw = w;
    for (let i = 0; i < segs; i++) {
      ctx.fillStyle = hairCol;
      ctx.beginPath();
      chamferRect(ctx, bx - bw / 2, y, bw, hh * 0.36, bw * 0.28);
      ctx.fill();
      if (!rig.hurt) {
        // The over-strand: half of each bead sits proud, sides swap
        // every bead — the two crossing ropes of a real braid.
        const os = i % 2 === 0 ? -1 : 1;
        ctx.fillStyle = shade(hairCol, -11);
        ctx.beginPath();
        chamferRect(
          ctx,
          os < 0 ? bx : bx - bw / 2,
          y + hh * 0.02,
          bw / 2,
          hh * 0.3,
          bw * 0.2,
        );
        ctx.fill();
        ctx.fillStyle = shade(hairCol, -28);
        ctx.fillRect(bx - bw / 2, y + hh * 0.3, bw, hh * 0.07);
      }
      y += hh * 0.34;
      bw *= 0.82;
    }
    ctx.fillStyle = hairCol;
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, y);
    ctx.lineTo(bx + bw * 0.5, y);
    ctx.lineTo(bx, y + hh * 0.32);
    ctx.closePath();
    ctx.fill();
    if (!rig.hurt) {
      // The tuft flicks dark at its very tip.
      ctx.fillStyle = shade(hairCol, -14);
      ctx.beginPath();
      ctx.moveTo(bx - bw * 0.22, y + hh * 0.14);
      ctx.lineTo(bx + bw * 0.22, y + hh * 0.14);
      ctx.lineTo(bx, y + hh * 0.32);
      ctx.closePath();
      ctx.fill();
    }
  };

  // A gathered tail: tie band at the root, a gloss chip below it, and
  // a shaded lower taper so the fall of hair reads round.
  const paintTail = (bx: number, topY: number, w: number, len: number): void => {
    ctx.fillStyle = hairCol;
    ctx.beginPath();
    ctx.moveTo(bx - w / 2, topY);
    ctx.lineTo(bx + w / 2, topY);
    ctx.lineTo(bx + w * 0.32, topY + len * 0.6);
    ctx.lineTo(bx, topY + len);
    ctx.lineTo(bx - w * 0.32, topY + len * 0.6);
    ctx.closePath();
    ctx.fill();
    if (!rig.hurt) {
      // Trailing-half shade keeps the tail on the head's light.
      ctx.fillStyle = shade(hairCol, -12);
      ctx.beginPath();
      ctx.moveTo(bx, topY);
      ctx.lineTo(bx + w / 2, topY);
      ctx.lineTo(bx + w * 0.32, topY + len * 0.6);
      ctx.lineTo(bx, topY + len);
      ctx.closePath();
      ctx.fill();
      // Dark tip: the taper ends in shadow, not a bright point.
      ctx.fillStyle = shade(hairCol, -20);
      ctx.beginPath();
      ctx.moveTo(bx + w * 0.2, topY + len * 0.75);
      ctx.lineTo(bx, topY + len);
      ctx.lineTo(bx - w * 0.2, topY + len * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(hairCol, -28);
      ctx.fillRect(bx - w / 2, topY + hh * 0.07, w, hh * 0.08);
      // The gloss chip under the tie — gathered hair catches light.
      ctx.fillStyle = shade(hairCol, 12);
      ctx.fillRect(bx - w * 0.26, topY + hh * 0.2, w * 0.34, hh * 0.14);
    }
  };

  // Ears ride the head sides UNDER the hair (curtains lie over the
  // roots; pointed tips break the silhouette — that is the point).
  // Round ears vanish into the block head; metal and cloth cover all.
  const earStyle = rig.look?.ears ?? 0;
  if (earStyle > 0 && (cover === 'free' || cover === 'brim')) {
    for (const es of [-1, 1]) {
      // The far ear ducks behind the skull through three-quarter.
      const far = es !== lead;
      const wK = far ? Math.max(0, 1 - Math.max(0, (profileK - 0.42) / 0.3)) : 1;
      if (wK <= 0.05) continue;
      const rootX = headX - fx * headR * 0.16 + es * hw * (0.94 - 0.2 * profileK);
      const rootY = headY + headR * 0.1 + fy * headR * 0.05;
      // Each ear sits on the head's x=0 light: the screen-right ear
      // wears the shade tone, so the pair belongs to the same skull.
      ctx.fillStyle = es > 0 && !rig.hurt ? shade(skin, -9) : skin;
      ctx.beginPath();
      if (earStyle === 1) {
        // Pointed: a long leaf wedge running outward — the drow read.
        ctx.moveTo(rootX, rootY - headR * 0.2);
        ctx.lineTo(rootX + es * headR * 0.6 * wK, rootY - headR * 0.32);
        ctx.lineTo(rootX, rootY + headR * 0.16);
      } else {
        // Upswept: a high fey point angling toward the crown.
        ctx.moveTo(rootX, rootY + headR * 0.16);
        ctx.lineTo(rootX + es * headR * 0.42 * wK, rootY - headR * 0.62);
        ctx.lineTo(rootX + es * headR * 0.03, rootY - headR * 0.16);
      }
      ctx.closePath();
      ctx.fill();
      if (!rig.hurt) {
        // The inner ear: a smaller shade wedge nested toward the
        // root — the hollow that makes the flap read as an EAR.
        ctx.fillStyle = shade(skin, -20);
        ctx.beginPath();
        if (earStyle === 1) {
          ctx.moveTo(rootX + es * headR * 0.04, rootY - headR * 0.1);
          ctx.lineTo(rootX + es * headR * 0.32 * wK, rootY - headR * 0.19);
          ctx.lineTo(rootX + es * headR * 0.04, rootY + headR * 0.08);
        } else {
          ctx.moveTo(rootX + es * headR * 0.05, rootY + headR * 0.05);
          ctx.lineTo(rootX + es * headR * 0.22 * wK, rootY - headR * 0.32);
          ctx.lineTo(rootX + es * headR * 0.06, rootY - headR * 0.1);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Style and color come from the chosen look; NPC humanoids keep the
  // classic crop tinted from their body color. Under a wizard's brim
  // every hairdo collapses to the crop — curtains and tails would
  // dangle through the cloth and read as stray cowl strips.
  const hairStyleRaw = rig.look?.hair ?? 0;
  const BALD = hairStyleRaw === 1;
  const hairStyle = cover === 'brim' ? 0 : hairStyleRaw;
  const LONG = hairStyle === 2;
  const KNOT = hairStyle === 3;
  const BRAID = hairStyle === 4;
  const PONY = hairStyle === 5;
  const TWIN = hairStyle === 6;
  const BOB = hairStyle === 7;
  const HAWK = hairStyle === 8;
  const WILD = hairStyle === 9;
  const SWEEP = hairStyle === 10;
  // Crown-top protrusions (knob, ridge, spikes, puff) fit only a bare
  // head or a circlet; any real helm owns the crown line.
  const crownFree = cover === 'free';
  const napeFall = LONG || BRAID || PONY || TWIN || BOB;

  // Flame teeth ringing the crown — the wild mane silhouette. Every
  // other spike takes the shade tone and the screen-right ones darken
  // further, so the mane keeps the head's light and reads as depth-
  // stacked tufts instead of a paper crown.
  const paintCrownSpikes = (): void => {
    for (let i = 0; i < 5; i++) {
      const t = (i / 4) * 2 - 1;
      const bx = headX + t * hw * 0.7;
      const by = headY - hh * (0.92 - 0.16 * t * t);
      const hgt = hh * (0.52 - 0.18 * Math.abs(t));
      ctx.fillStyle = rig.hurt
        ? hairCol
        : shade(hairCol, (i % 2 === 1 ? -10 : 2) + (t > 0.1 ? -8 : 0));
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.17, by);
      ctx.lineTo(bx + hw * 0.17, by);
      ctx.lineTo(bx + t * hw * 0.12, by - hgt);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = hairCol;
  };

  if (!BALD && cover !== 'cloth') {
    ctx.fillStyle = hairCol;
    if (cover === 'sealed') {
      // Only the nape-fall escapes a sealed helm — and a full helm's
      // box runs to headY + 0.98·hh and ±1.06·hw, so everything here
      // starts BELOW that rim or OUTSIDE that width, or it vanishes.
      if (napeFall) {
        if (backK > 0.55 || profileK > 0.5) {
          if (BRAID) {
            paintPlait(
              backK > 0.55 ? headX : headX - lead * hw * 0.9,
              headY + hh * 0.9,
              hw * 0.36,
              3,
            );
          } else if (PONY) {
            paintTail(
              backK > 0.55 ? headX : headX - lead * hw * 0.9,
              headY + hh * 0.85,
              hw * 0.5,
              hh * 1.5,
            );
          } else if (TWIN) {
            for (const es of [-1, 1]) {
              paintTail(headX + es * hw * 0.95, headY + hh * 0.8, hw * 0.3, hh * 1.3);
            }
          } else {
            // Long and bob: a nape curtain below the back rim.
            ctx.beginPath();
            chamferRect(
              ctx,
              headX - hw * 0.72,
              headY + hh * 0.85,
              hw * 1.44,
              hh * (LONG ? 1.0 : 0.6),
              [0, 0, cut * 0.8, cut * 0.8],
            );
            ctx.fill();
          }
        } else if (LONG || TWIN || BOB) {
          // Face-on: curtain stubs pushed out past the cheek plates.
          for (const es of [-1, 1]) {
            ctx.fillRect(
              headX + es * hw * 1.02 - hw * 0.13,
              headY + hh * 0.55,
              hw * 0.26,
              hh * (BOB ? 0.85 : 1.15),
            );
          }
        }
      }
    } else if (backK > 0.55) {
      // Back of the skull: the mop covers nearly everything, with one
      // stepped hem so it still reads as a haircut. Long hair falls
      // past the jaw; a topknot crops high; the bob hooks inward.
      if (HAWK) {
        if (crownFree) {
          // The ridge runs crown-to-nape, read edge-on from behind.
          ctx.beginPath();
          chamferRect(ctx, headX - hw * 0.24, headY - hh * 1.48, hw * 0.48, hh * 2.35, [
            cut * 0.6,
            cut * 0.6,
            0,
            0,
          ]);
          ctx.fill();
        }
      } else {
        const mopH = LONG
          ? hh * 1.95
          : KNOT
            ? hh * 1.1
            : BOB
              ? hh * 1.78
              : SWEEP
                ? hh * 1.62
                : BRAID || PONY
                  ? hh * 1.28
                  : TWIN
                    ? hh * 1.38
                    : hh * 1.52;
        const mopY = headY - hh * 0.98;
        const mopCorners: [number, number, number, number] = BOB
          ? [cut * 0.85, cut * 0.85, cut * 1.4, cut * 1.4]
          : [cut * 0.85, cut * 0.85, 0, 0];
        ctx.beginPath();
        chamferRect(ctx, headX - hw * 0.96, mopY, hw * 1.92, mopH, mopCorners);
        ctx.fill();
        if (!rig.hurt) {
          // THE DEPTH KIT, clipped to the mop so no facet leaks past
          // the silhouette: trailing-half shade on the head's x=0
          // light, a hem under-shade, strand notches rising off the
          // hem, and the lit crown plane.
          ctx.save();
          ctx.beginPath();
          chamferRect(ctx, headX - hw * 0.96, mopY, hw * 1.92, mopH, mopCorners);
          ctx.clip();
          ctx.fillStyle = shade(hairCol, -12);
          ctx.fillRect(headX, mopY, hw * 0.96, mopH);
          ctx.fillStyle = shade(hairCol, -22);
          ctx.fillRect(headX - hw * 0.96, mopY + mopH - hh * 0.1, hw * 1.92, hh * 0.1);
          for (const [ox, dh] of [
            [-0.55, 0.36],
            [0.02, 0.5],
            [0.55, 0.32],
          ] as const) {
            ctx.fillRect(headX + ox * hw - hw * 0.05, mopY + mopH - dh * hh, hw * 0.1, dh * hh);
          }
          if (cover === 'free') {
            ctx.fillStyle = shade(hairCol, 10);
            ctx.beginPath();
            chamferRect(ctx, headX - hw * 0.8, headY - hh * 0.92, hw * 1.6, hh * 0.28, cut * 0.5);
            ctx.fill();
          }
          ctx.restore();
          ctx.fillStyle = hairCol;
        }
        if (!BOB && !KNOT) {
          // The hem step chip rides OVER the shade — a nearer strand.
          ctx.fillRect(
            headX - lead * hw * 0.5 - hw * 0.28,
            mopY + mopH - hh * 0.06,
            hw * 0.56,
            hh * 0.22,
          );
          if (!rig.hurt) {
            ctx.fillStyle = shade(hairCol, -22);
            ctx.fillRect(
              headX - lead * hw * 0.5 - hw * 0.28,
              mopY + mopH + hh * 0.11,
              hw * 0.56,
              hh * 0.05,
            );
            ctx.fillStyle = hairCol;
          }
        }
        if (SWEEP) {
          // The sweep drops one long lock past the hem, trailing side.
          const lx = headX - lead * hw * 0.72 - hw * 0.15;
          ctx.fillRect(lx, mopY + mopH - hh * 0.1, hw * 0.3, hh * 0.65);
          if (!rig.hurt) {
            ctx.fillStyle = shade(hairCol, -18);
            ctx.fillRect(lx + hw * 0.19, mopY + mopH - hh * 0.1, hw * 0.11, hh * 0.65);
            ctx.fillStyle = hairCol;
          }
        }
        if (WILD) {
          // Jagged hem teeth below the mop, every other one shaded so
          // the shag reads as layered tufts.
          for (let i = 0; i < 4; i++) {
            const bx = headX - hw * 0.66 + i * hw * 0.44;
            const by = mopY + mopH - hh * 0.02;
            ctx.fillStyle = !rig.hurt && i % 2 === 1 ? shade(hairCol, -14) : hairCol;
            ctx.beginPath();
            ctx.moveTo(bx - hw * 0.16, by);
            ctx.lineTo(bx + hw * 0.16, by);
            ctx.lineTo(bx, by + hh * 0.3);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = hairCol;
        }
      }
      if (BRAID) paintPlait(headX, headY + hh * 0.28, hw * 0.42, 4);
      if (PONY) paintTail(headX, headY - hh * (crownFree ? 0.7 : 0.1), hw * 0.66, hh * 2.4);
      if (TWIN) {
        for (const es of [-1, 1]) {
          paintTail(headX + es * hw * 0.82, headY - hh * 0.35, hw * 0.32, hh * 1.7);
        }
      }
      if (WILD && crownFree) paintCrownSpikes();
    } else {
      // Front and three-quarter bands: the fringe family.
      const fringeH = KNOT ? hh * 0.45 : BOB ? hh * 0.68 : hh * 0.6;
      if (HAWK) {
        if (crownFree) {
          // The ridge reads narrow head-on and widens into the full
          // forehead-to-nape crest through profile — one band curve.
          const widen = Math.max(0, (profileK - 0.25) / 0.75);
          const rw = hw * (0.46 + 1.15 * widen);
          ctx.beginPath();
          chamferRect(ctx, headX - rw / 2, headY - hh * 1.5, rw, hh * 0.9, [
            cut * 0.7,
            cut * 0.7,
            0,
            0,
          ]);
          ctx.fill();
          if (!rig.hurt) {
            // The ridge is a standing blade: lit on the light side,
            // shaded on the trailing edge, so it reads as a fin with
            // thickness instead of a painted stripe.
            ctx.fillStyle = shade(hairCol, 12);
            ctx.fillRect(headX - rw / 2 + rw * 0.08, headY - hh * 1.42, rw * 0.14, hh * 0.78);
            ctx.fillStyle = shade(hairCol, -14);
            ctx.fillRect(headX + rw / 2 - rw * 0.2, headY - hh * 1.42, rw * 0.14, hh * 0.78);
            ctx.fillStyle = hairCol;
          }
          // The forehead landing strip grounds the ridge head-on.
          ctx.fillRect(headX - hw * 0.2, headY - hh * 0.98, hw * 0.4, hh * 0.42);
          if (!rig.hurt) {
            ctx.fillStyle = shade(hairCol, -16);
            ctx.fillRect(headX + hw * 0.06, headY - hh * 0.98, hw * 0.14, hh * 0.42);
            ctx.fillStyle = hairCol;
          }
        }
      } else if (SWEEP) {
        // A diagonal sweep: high over the leading brow, deep past the
        // trailing cheek, one long lock trailing to the jaw.
        const hemLead = headY - hh * 0.5;
        const hemTrail = headY + hh * 0.05;
        const hemR = lead > 0 ? hemLead : hemTrail;
        const hemL = lead > 0 ? hemTrail : hemLead;
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.96, headY - hh * 0.98);
        ctx.lineTo(headX + hw * 0.96, headY - hh * 0.98);
        ctx.lineTo(headX + hw * 0.96, hemR);
        ctx.lineTo(headX - hw * 0.96, hemL);
        ctx.closePath();
        ctx.fill();
        if (!rig.hurt) {
          // A shade band riding just above the diagonal hem — the
          // underside of the sweep, carrying its direction.
          ctx.fillStyle = shade(hairCol, -16);
          ctx.beginPath();
          ctx.moveTo(headX + hw * 0.96, hemR - hh * 0.16);
          ctx.lineTo(headX + hw * 0.96, hemR);
          ctx.lineTo(headX - hw * 0.96, hemL);
          ctx.lineTo(headX - hw * 0.96, hemL - hh * 0.16);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = hairCol;
        }
        const lockX = headX - lead * hw * 0.79 - hw * 0.15;
        ctx.fillRect(lockX, headY - hh * 0.4, hw * 0.3, hh * 1.15);
        if (!rig.hurt) {
          // The lock's inner edge separates from the cheek.
          ctx.fillStyle = shade(hairCol, -18);
          ctx.fillRect(lockX + (lead > 0 ? hw * 0.2 : 0), headY - hh * 0.4, hw * 0.1, hh * 1.15);
          ctx.fillStyle = shade(hairCol, -22);
          ctx.fillRect(lockX, headY + hh * 0.55, hw * 0.3, hh * 0.2);
          ctx.fillStyle = hairCol;
        }
      } else if (WILD) {
        // Jagged fringe: teeth biting down over the brow, every other
        // tooth shaded — layered shag, not a zigzag sticker.
        ctx.beginPath();
        chamferRect(ctx, headX - hw * 0.96, headY - hh * 0.98, hw * 1.92, hh * 0.5, [
          cut * 0.85,
          cut * 0.85,
          0,
          0,
        ]);
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(hairCol, -12);
          ctx.fillRect(headX, headY - hh * 0.94, hw * 0.9, hh * 0.46);
          ctx.fillStyle = hairCol;
        }
        for (let i = 0; i < 4; i++) {
          const bx = headX - hw * 0.6 + i * hw * 0.4;
          const by = headY - hh * 0.5;
          ctx.fillStyle = !rig.hurt && i % 2 === 1 ? shade(hairCol, -14) : hairCol;
          ctx.beginPath();
          ctx.moveTo(bx - hw * 0.15, by);
          ctx.lineTo(bx + hw * 0.15, by);
          ctx.lineTo(bx, by + hh * 0.28);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = hairCol;
        if (crownFree) paintCrownSpikes();
      } else {
        // The classic fringe slab with its stepped notch trailing.
        ctx.beginPath();
        chamferRect(ctx, headX - hw * 0.96, headY - hh * 0.98, hw * 1.92, fringeH, [
          cut * 0.85,
          cut * 0.85,
          0,
          0,
        ]);
        ctx.fill();
        if (!rig.hurt) {
          // The fringe depth kit: trailing-half shade, hem under-
          // shade, and two strand notches parting the brow line.
          ctx.save();
          ctx.beginPath();
          chamferRect(ctx, headX - hw * 0.96, headY - hh * 0.98, hw * 1.92, fringeH, [
            cut * 0.85,
            cut * 0.85,
            0,
            0,
          ]);
          ctx.clip();
          ctx.fillStyle = shade(hairCol, -12);
          ctx.fillRect(headX, headY - hh * 0.98, hw * 0.96, fringeH);
          ctx.fillStyle = shade(hairCol, -20);
          ctx.fillRect(headX - hw * 0.96, headY - hh * 0.98 + fringeH - hh * 0.08, hw * 1.92, hh * 0.08);
          for (const ox of [-0.38, 0.3] as const) {
            ctx.fillRect(
              headX + ox * hw - hw * 0.045,
              headY - hh * 0.98 + fringeH - hh * 0.26,
              hw * 0.09,
              hh * 0.26,
            );
          }
          ctx.restore();
          ctx.fillStyle = hairCol;
        }
        if (!KNOT && !BOB) {
          // The notch chip rides OVER the shade — the nearer strand.
          ctx.fillRect(headX - lead * hw * 0.55 - hw * 0.28, headY - hh * 0.44, hw * 0.56, hh * 0.24);
          if (!rig.hurt) {
            ctx.fillStyle = shade(hairCol, -20);
            ctx.fillRect(headX - lead * hw * 0.55 - hw * 0.28, headY - hh * 0.24, hw * 0.56, hh * 0.05);
            ctx.fillStyle = hairCol;
          }
        }
      }
      if (LONG) {
        // Curtains framing the face on both sides, past the jawline —
        // each with an inner parting shade and a darkened fall tip,
        // the screen-right one carrying the head's shade half.
        for (const es of [-1, 1]) {
          const cx0 = headX + es * hw * 0.82 - hw * 0.15;
          ctx.fillRect(cx0, headY - hh * 0.6, hw * 0.3, hh * 1.75);
          if (!rig.hurt) {
            if (es > 0) {
              ctx.fillStyle = shade(hairCol, -12);
              ctx.fillRect(cx0 + hw * 0.15, headY - hh * 0.6, hw * 0.15, hh * 1.75);
            }
            ctx.fillStyle = shade(hairCol, -16);
            ctx.fillRect(cx0 + (es > 0 ? 0 : hw * 0.2), headY - hh * 0.5, hw * 0.1, hh * 1.45);
            ctx.fillStyle = shade(hairCol, -22);
            ctx.fillRect(cx0, headY + hh * 0.95, hw * 0.3, hh * 0.2);
            ctx.fillStyle = hairCol;
          }
        }
      } else if (BOB) {
        // A rounded helmet of hair: curtains crop at the jaw, hook in.
        for (const es of [-1, 1]) {
          const bx0 = headX + es * hw * 0.8 - hw * 0.17;
          ctx.beginPath();
          chamferRect(ctx, bx0, headY - hh * 0.66, hw * 0.34, hh * 1.42, [
            0,
            0,
            cut * 0.5,
            cut * 0.5,
          ]);
          ctx.fill();
          if (!rig.hurt) {
            if (es > 0) {
              ctx.fillStyle = shade(hairCol, -12);
              ctx.fillRect(bx0 + hw * 0.17, headY - hh * 0.66, hw * 0.17, hh * 1.3);
            }
            ctx.fillStyle = shade(hairCol, -16);
            ctx.fillRect(bx0 + (es > 0 ? 0 : hw * 0.24), headY - hh * 0.55, hw * 0.1, hh * 1.15);
            ctx.fillStyle = shade(hairCol, -22);
            ctx.fillRect(bx0 + hw * 0.03, headY + hh * 0.6, hw * 0.28, hh * 0.12);
            ctx.fillStyle = hairCol;
          }
        }
        if (profileK > 0.45) {
          // Turned: the bob wraps the back half of the skull.
          const k = Math.min(1, (profileK - 0.45) / 0.35);
          ctx.beginPath();
          chamferRect(
            ctx,
            headX - lead * hw * 0.96 - (lead < 0 ? hw * 0.62 * k : 0),
            headY - hh * 0.72,
            hw * 0.62 * k,
            hh * 1.48,
            [0, 0, cut * 0.5, cut * 0.5],
          );
          ctx.fill();
        }
      } else if (TWIN) {
        // Two gathered tails hanging off the upper sides.
        for (const es of [-1, 1]) {
          const far = es !== lead;
          const wK = far ? Math.max(0.5, 1 - Math.max(0, (profileK - 0.45) / 0.4)) : 1;
          paintTail(headX + es * hw * 0.92, headY - hh * 0.35, hw * 0.32 * wK, hh * 1.55);
        }
      } else if (PONY) {
        if (crownFree) {
          // The gather puff rides the back of the crown, lit above
          // its tie shadow so the gather reads as pulled hair.
          const px0 = headX - fx * hw * 0.3 - hw * 0.3;
          ctx.beginPath();
          chamferRect(ctx, px0, headY - hh * 1.28, hw * 0.6, hh * 0.4, cut * 0.5);
          ctx.fill();
          if (!rig.hurt) {
            ctx.fillStyle = shade(hairCol, 10);
            ctx.fillRect(px0 + hw * 0.08, headY - hh * 1.24, hw * 0.28, hh * 0.1);
            ctx.fillStyle = shade(hairCol, -26);
            ctx.fillRect(px0 + hw * 0.06, headY - hh * 0.94, hw * 0.48, hh * 0.06);
            ctx.fillStyle = hairCol;
          }
        }
        if (profileK > 0.4) {
          // Turned: the tail sweeps back and down behind the skull.
          ctx.save();
          ctx.translate(headX - lead * hw * 0.85, headY - hh * (crownFree ? 0.75 : 0.15));
          ctx.rotate(lead * 0.45);
          paintTail(0, 0, hw * 0.5, hh * 1.9);
          ctx.restore();
        }
      } else if (BRAID) {
        if (profileK > 0.4) {
          // Turned: the plait trails behind the skull.
          paintPlait(
            headX - lead * hw * 0.95,
            headY - hh * (cover === 'open' ? 0.1 : 0.35),
            hw * 0.34,
            3,
          );
        }
      } else if (hairStyle === 0 && profileK > 0.45) {
        // Crop: a side-lock behind the ear grounds the turned head.
        const k = Math.min(1, (profileK - 0.45) / 0.35);
        ctx.fillStyle = hairCol;
        ctx.fillRect(
          headX - lead * hw * 0.96,
          headY - hh * 0.5,
          hw * 0.34 * k,
          hh * 1.05,
        );
      }
      // A lit band on the fringe gives the hair its top plane.
      if (!rig.hurt && !HAWK && cover === 'free') {
        ctx.fillStyle = shade(hairCol, 10);
        ctx.beginPath();
        chamferRect(ctx, headX - hw * 0.8, headY - hh * 0.92, hw * 1.6, hh * 0.2, cut * 0.4);
        ctx.fill();
        ctx.fillStyle = hairCol;
      }
    }
    if (KNOT && crownFree) {
      // The knob rides the crown in every band — lit on top, seated
      // on a tie shadow, so it reads as a wound bun with weight.
      ctx.fillStyle = hairCol;
      ctx.beginPath();
      chamferRect(ctx, headX - hw * 0.2, headY - hh * 1.34, hw * 0.4, hh * 0.36, cut * 0.4);
      ctx.fill();
      if (!rig.hurt) {
        ctx.fillStyle = shade(hairCol, 12);
        ctx.fillRect(headX - hw * 0.12, headY - hh * 1.3, hw * 0.18, hh * 0.1);
        ctx.fillStyle = shade(hairCol, -12);
        ctx.fillRect(headX + hw * 0.02, headY - hh * 1.28, hw * 0.14, hh * 0.24);
        ctx.fillStyle = shade(hairCol, -26);
        ctx.fillRect(headX - hw * 0.16, headY - hh * 1.02, hw * 0.32, hh * 0.06);
      }
    }
  }

  // Face — only where a face actually is.
  if (backK <= 0.55) {
    const faceK = 1 - Math.max(0, Math.min(1, (-fy - 0.05) / 0.25)) * 0.35; // dim up-facing
    // One fixed eye line: a whisper of vertical drift for life, never
    // a slide onto the scalp or chin.
    const eyeLineY = headY + headR * 0.1 + fy * headR * 0.06;
    const pairX = headX + fx * headR * 0.36;
    const sep = headR * (0.42 - 0.16 * profileK);
    const eyeStyle = rig.look?.eyes ?? 0;
    const feature = rig.look?.feature ?? 0;
    // The far side of anything on the face narrows through
    // three-quarter and disappears around the corner at profile.
    const sideK = (es: number): number =>
      es !== lead ? Math.max(0, 1 - Math.max(0, (profileK - 0.5) / 0.28)) : 1;

    // The scar rides UNDER the eye slit, so the slash reads as
    // crossing it — always on the leading side of the face.
    if (feature === 4 && !rig.hurt) {
      ctx.strokeStyle = shade(skin, -42);
      ctx.lineWidth = headR * 0.085;
      const sx = pairX + lead * sep;
      ctx.beginPath();
      ctx.moveTo(sx - lead * headR * 0.1, eyeLineY - headR * 0.42);
      ctx.lineTo(sx + lead * headR * 0.14, eyeLineY + headR * 0.46);
      ctx.stroke();
      // Two stitch ticks across the slash.
      ctx.lineWidth = headR * 0.045;
      for (const t of [-0.16, 0.2]) {
        const mx = sx + lead * headR * 0.02 + lead * headR * 0.24 * t;
        const my = eyeLineY + headR * 0.88 * t;
        ctx.beginPath();
        ctx.moveTo(mx - headR * 0.09, my - headR * 0.03);
        ctx.lineTo(mx + headR * 0.09, my + headR * 0.03);
        ctx.stroke();
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
        const wK = sideK(es);
        if (wK <= 0.02) continue;
        const bw = eyeW * 1.3 * wK;
        const bx = pairX + es * sep;
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
    for (const es of [-1, 1]) {
      const wK = sideK(es);
      if (wK <= 0.02) continue;
      const w = eyeW * wK;
      const cx = pairX + es * sep;
      ctx.fillStyle = OUTLINE;
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
        const wK = sideK(es);
        if (wK <= 0.02) continue;
        ctx.fillRect(
          pairX + es * sep - headR * 0.14 * wK,
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
        const wK = sideK(es);
        if (wK <= 0.05) continue;
        for (const row of [0, 1, 2]) {
          const y0 = eyeLineY + headR * (0.18 + row * 0.15);
          const bw = headR * (0.4 - row * 0.06) * wK;
          const x0 = pairX + es * sep - bw / 2 + es * headR * 0.03 * row;
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
      for (const [ox, oy] of spots) {
        const wK = sideK(ox < 0 ? -1 : 1);
        if (wK <= 0.15) continue;
        ctx.fillRect(
          pairX + ox * headR * 1.05 * (1 - 0.3 * profileK),
          eyeLineY + oy * headR,
          headR * 0.055,
          headR * 0.055,
        );
      }
    }
    // Facial hair: chunky slabs in the hair color, tracking the same
    // face shift so a turned head carries its beard around with it.
    const beard = rig.look?.beard ?? 0;
    if (beard > 0) {
      ctx.fillStyle = hairCol;
      const bK = 1 - 0.25 * profileK; // beards narrow a touch at profile
      if (beard === 1) {
        // Mustache: one confident bar under the nose line.
        ctx.fillRect(pairX - headR * 0.32 * bK, eyeLineY + headR * 0.26, headR * 0.64 * bK, headR * 0.14);
      } else if (beard === 2) {
        // Goatee: a chin spike dropping past the jaw, shaded on its
        // trailing edge so the point reads as a tuft with body.
        ctx.beginPath();
        chamferRect(
          ctx,
          pairX - headR * 0.15 * bK,
          headY + hh * 0.58,
          headR * 0.3 * bK,
          hh * 0.62,
          cut * 0.3,
        );
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(hairCol, -14);
          ctx.fillRect(pairX + headR * 0.02, headY + hh * 0.64, headR * 0.1 * bK, hh * 0.48);
          ctx.fillStyle = hairCol;
        }
      } else if (beard === 3) {
        // Full beard: mustache bar plus a jaw slab below the face —
        // split on the head's light, mouth shadow under the mustache,
        // hem darkened where the beard leaves the chin.
        ctx.fillRect(pairX - headR * 0.32 * bK, eyeLineY + headR * 0.26, headR * 0.64 * bK, headR * 0.14);
        ctx.beginPath();
        chamferRect(
          ctx,
          pairX - hw * 0.62 * bK,
          headY + hh * 0.42,
          hw * 1.24 * bK,
          hh * 0.85,
          [0, 0, cut * 0.8, cut * 0.8],
        );
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(hairCol, -12);
          ctx.fillRect(pairX + hw * 0.04, headY + hh * 0.42, hw * 0.5 * bK, hh * 0.72);
          ctx.fillStyle = shade(hairCol, -24);
          ctx.fillRect(pairX - hw * 0.5 * bK, headY + hh * 1.08, hw * 1.0 * bK, hh * 0.1);
          ctx.fillStyle = shade(hairCol, -28);
          ctx.fillRect(pairX - headR * 0.13 * bK, eyeLineY + headR * 0.4, headR * 0.26 * bK, headR * 0.07);
          ctx.fillStyle = hairCol;
        }
      } else if (beard === 4) {
        // Braided beard: mustache bar, then the plait off the chin.
        ctx.fillRect(pairX - headR * 0.32 * bK, eyeLineY + headR * 0.26, headR * 0.64 * bK, headR * 0.14);
        paintPlait(pairX, headY + hh * 0.55, headR * 0.34 * bK, 3);
      } else if (beard === 5) {
        // Mutton chops: side slabs hugging the jaw, chin left bare.
        for (const es of [-1, 1]) {
          const wK = sideK(es);
          if (wK <= 0.05) continue;
          const sideX = headX - fx * headR * 0.12 + es * hw * 0.76;
          ctx.beginPath();
          chamferRect(
            ctx,
            sideX - hw * 0.17 * wK,
            eyeLineY + headR * 0.02,
            hw * 0.34 * wK,
            hh * 0.78,
            [0, 0, cut * 0.4, cut * 0.4],
          );
          ctx.fill();
          // The jaw hook curls in toward the chin.
          ctx.fillRect(
            sideX - es * hw * 0.24 - hw * 0.12 * wK,
            headY + hh * 0.6,
            hw * 0.24 * wK,
            hh * 0.24,
          );
          if (!rig.hurt) {
            // The cheek-side edge sits in shade — whiskers stand off
            // the face instead of being inked onto it.
            ctx.fillStyle = shade(hairCol, -14);
            ctx.fillRect(
              sideX - es * hw * 0.17 * wK + (es < 0 ? -hw * 0.08 * wK : 0),
              eyeLineY + headR * 0.06,
              hw * 0.08 * wK,
              hh * 0.66,
            );
            ctx.fillStyle = hairCol;
          }
        }
      } else {
        // Stubble: a translucent shadow across the jaw band.
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        chamferRect(
          ctx,
          pairX - hw * 0.6 * bK,
          headY + hh * 0.35,
          hw * 1.2 * bK,
          hh * 0.55,
          [0, 0, cut * 0.7, cut * 0.7],
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // Tusks and fangs paint OVER the beard — teeth in front of hair.
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
        const wK = sideK(es);
        if (wK <= 0.05) continue;
        const bx = pairX + es * headR * (big ? 0.3 : 0.22) * (1 - 0.2 * profileK);
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
}

/**
 * Back-mounted gear layered relative to the CAPE — called by the
 * renderer immediately after the cape paints, so a quiver straps OVER
 * the cloth (gear goes over a cape, never under it). Recomputes the
 * few shoulder measurements it needs; drawHumanoid skips its internal
 * quiver whenever hasCape is set.
 */
export function drawBackGear(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  if (!rig.offhandItem) return;
  const st = offhandStyle(rig.offhandItem);
  if (st.kind !== 'quiver') return;
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const fx = Math.cos(rig.dir);
  const crouch = rig.pose === PoseState.Sneak ? Math.min(1, rig.poseT) : 0;
  const hipY = rig.y - (rig.rise + rig.bob * 0.45) * s + 0.11 * s * crouch;
  const wS = rig.wScale;
  const hScale = 1 + (1 - wS) * 0.55;
  const th = 0.46 * s * (1 - 0.12 * crouch);
  const shoulderY = hipY - th * hScale + 0.06 * s;
  const lead = fx >= 0 ? 1 : -1;
  drawQuiver(ctx, st, rig.x - fx * 0.14 * s, shoulderY - 0.02 * s, s, lead, rig.hurt);
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
function enchantedStyle<T extends { fx?: unknown; fxColor?: string }>(
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
  },
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  if (extra?.flip) ctx.scale(1, -1);
  // Mid-arc wood point: the bow's quadratic (tips 0.06s, belly control
  // 0.3s) passes through x = 0.18s at grip height — align THAT to the
  // fist, or the bow reads as resting on the wrist.
  if (extra?.carry) ctx.translate(-0.18 * s * extra.carry, 0);

  if (bladeStyle(itemId, color)) {
    // The blade + rogue rosters: every sword AND dagger resolves a
    // style — bespoke silhouette, guard, pommel, living fx channel.
    // Unknown '*sword'/'*dagger' ids get color-derived fallbacks.
    drawSword(ctx, enchantedStyle(bladeStyle(itemId, color)!, extra?.ench, 'blade'), s, rig.nowMs, rig.hurt);
  } else if (toolStyle(itemId, color) && !itemId.includes('rod')) {
    // The gatherer's roster: every axe and pickaxe resolves a style —
    // bespoke head, haft furniture, collar lashing, starsteel fx.
    // BIT-LEADS LAW: the head is authored with the bit on −y; a chop
    // facing right sweeps clockwise, so mirror the head across the
    // haft there — the honed edge (not the poll) buries in the work
    // at the bite, whichever way the body faces.
    ctx.save();
    if (Math.cos(rig.dir) > 0) ctx.scale(1, -1);
    drawTool(ctx, toolStyle(itemId, color)!, s, rig.nowMs, rig.hurt);
    ctx.restore();
  } else if (bowStyle(itemId, color)) {
    // The archer's roster: every bow resolves a style — limb kind,
    // wood, tip furniture, charms, and the living fx channel. The
    // painter keeps the classic behaviors: limbs flex with the pull,
    // the string hauls to the nock, release buzzes it straight.
    drawBow(ctx, enchantedStyle(bowStyle(itemId, color)!, extra?.ench, 'blade'), s, rig.nowMs, rig.hurt, extra?.pull ?? 0, extra?.loose);
  } else if (staffStyle(itemId, color)) {
    // The archmage's roster: every staff resolves a style — shaft
    // grammar, signature crown, element focus, living fx. The grip
    // slides with the carriage — high on a planted walking stick,
    // mid-shaft when the business end levels at something — and the
    // focus flares while a cast leaves.
    const castT = rig.pose === PoseState.Cast ? rig.poseT : 0;
    drawStaff(ctx, enchantedStyle(staffStyle(itemId, color)!, extra?.ench, 'staff'), s, rig.nowMs, rig.hurt, extra?.grip ?? 0.34, castT);
  } else if (itemId.includes('rod')) {
    drawTool(ctx, toolStyle(itemId, color)!, s, rig.nowMs, rig.hurt);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(0.04 * s, -0.05 * s, 0.16 * s, 0.1 * s, 0.03 * s);
    ctx.fill();
  }
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
