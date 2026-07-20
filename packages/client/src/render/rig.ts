import { CLOTH_COLORS, HAIR_COLORS, PoseState, SKIN_TONES, type Look } from '@devcraft/shared';
import { itemDef } from '@devcraft/content';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { bladeStyle, bowStyle, drawBow, drawSword, drawStaff, staffStyle } from './weapons.js';
import { LegRig, chooseLimbSign, solveLimb, type LegPose, type LegRigConfig } from './legs.js';
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
  bodyColor: string;
  hurt: boolean;
  isOwn: boolean;
  weaponItem?: string;
  /** Cosmetic idle carry: 'rogue' rakes a blade down-back, reverse grip. */
  carryStyle?: 'normal' | 'rogue';
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
  /** Time-based swing driver for the gather pose. */
  gatherPhase: number;
  /**
   * Which station a Craft pose is working: picks the choreography
   * (hammer-and-tongs, furnace stoking, fire tending, bench work) and
   * the bespoke props that go with it.
   */
  craftKind?: 'anvil' | 'furnace' | 'fire' | 'workbench' | null;
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
/** Duration of one furnace stoking push, ms. */
export const FURNACE_CYCLE_MS = 1700;

/** Arm segment length (upper = fore), in tile units. */
const ARM_LEN = 0.17;

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
): { ex: number; ey: number; kx: number; ky: number } {
  const { ex, ey, kx, ky } = solveArm(sx, sy, hx, hy, ARM_LEN * s, prefX, prefY);

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

export function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const skin = rig.hurt
    ? '#ffffff'
    : (rig.skinColor ?? (rig.look ? SKIN_TONES[rig.look.skin]! : SKIN));
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
    const baseLeg = rig.look
      ? shade(CLOTH_COLORS[rig.look.pants]!, -8)
      : shade(bodyColor, -28);
    const thighCol = rig.hurt ? '#ffffff' : (legSt?.thigh ?? baseLeg);
    const shinCol = rig.hurt ? '#ffffff' : (legSt?.shin ?? legSt?.thigh ?? baseLeg);
    const fxx = hipX + ex;
    const fyy = hipY + ey;
    ctx.strokeStyle = thighCol;
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kx, ky);
    if (shinCol === thighCol) {
      ctx.lineTo(fxx, fyy);
      ctx.stroke();
    } else {
      ctx.stroke();
      ctx.strokeStyle = shinCol;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(fxx, fyy);
      ctx.stroke();
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
    ctx.fillStyle = bootCol;
    ctx.beginPath();
    chamferRect(ctx, fxx - 0.075 * s, fyy - 0.03 * s, 0.15 * s, 0.06 * s, 0.022 * s);
    ctx.fill();
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
  // The tool TYPE picks the work cycle: an axe chops, a pick heaves
  // overhead and pries — different rhythms, different bodies. Rods (and
  // bare hands) keep the gentle working sway.
  const toolType = weapon?.tool?.type;
  const chopping = rig.pose === PoseState.Gather && toolType === 'axe';
  const mining = rig.pose === PoseState.Gather && toolType === 'pickaxe';
  const craftKind = rig.pose === PoseState.Craft ? (rig.craftKind ?? 'workbench') : null;
  const gatherSwing =
    rig.pose === PoseState.Gather && !chopping && !mining
      ? Math.sin(rig.gatherPhase * 5.5) * 0.5
      : 0;

  // Torso proportions (needed for shoulders before the torso is drawn).
  const tw = 0.185 * s; // shoulder half-width
  const ww = 0.125 * s; // waist half-width
  const th = 0.46 * s * (1 - 0.12 * crouch); // hip line → shoulders

  // Melee combo stages: forehand sweep, backhand sweep, lunging thrust.
  // Each is anticipation → strike → follow-through, never a plain pivot.
  let swingOffset = 0.5 + gatherSwing;
  let strikeSweep: { from: number; to: number } | null = null;
  let thrustR: number | null = null; // finisher: radial thrust (tiles)
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
  if (meleeStage === 0 || meleeStage === 1) {
    const t = rig.poseT;
    const WINDUP = meleeStage === 0 ? -1.35 : 1.45;
    const FOLLOW = meleeStage === 0 ? 1.45 : -1.35;
    const sgn = Math.sign(FOLLOW - WINDUP);
    if (t < 0.2) {
      // Pull back (ease-out), coiling the torso against the swing.
      const u = t / 0.2;
      swingOffset = 0.5 + (WINDUP - 0.5) * (1 - (1 - u) * (1 - u));
      lean = -sgn * 0.06 * u;
    } else if (t < 0.5) {
      // The strike: fast ease-in sweep across the whole arc.
      const u = (t - 0.2) / 0.3;
      const e = u * u * (3 - 2 * u);
      swingOffset = WINDUP + (FOLLOW - WINDUP) * e;
      strikeSweep = { from: rig.dir + WINDUP, to: rig.dir + swingOffset };
      lean = sgn * 0.12 * Math.sin(u * Math.PI);
    } else {
      // Follow-through settles back to rest.
      const u = (t - 0.5) / 0.5;
      swingOffset = FOLLOW + (0.5 - FOLLOW) * u * u * (3 - 2 * u);
      if (t < 0.62) strikeSweep = { from: rig.dir + WINDUP, to: rig.dir + FOLLOW };
      lean = sgn * 0.12 * (1 - u);
    }
  } else if (meleeStage === 2) {
    // Finisher: haul the blade to the hip, then RAM it down the aim.
    const t = rig.poseT;
    swingOffset = 0;
    if (t < 0.35) {
      const u = t / 0.35;
      thrustR = 0.25 - 0.15 * u * u;
      lean = -0.09 * u;
    } else if (t < 0.6) {
      const u = (t - 0.35) / 0.25;
      const e = u * u * (3 - 2 * u);
      thrustR = 0.1 + 0.4 * e;
      lean = 0.17 * Math.sin(u * Math.PI * 0.5);
    } else {
      const u = (t - 0.6) / 0.4;
      thrustR = 0.5 - 0.25 * u * u * (3 - 2 * u);
      lean = 0.17 * (1 - u);
    }
    lean *= Math.sign(fx || 1); // tip the torso along the thrust
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
  // a fixed circle — two arms in the fight, not one.
  const offAngle =
    meleeStage === 0 || meleeStage === 1 ? rig.dir - swingOffset * 0.55 : rig.dir - 0.55;
  let mainX: number;
  let mainY: number;
  if (thrustR !== null) {
    mainX = rig.x + fx * thrustR * s * wS;
    mainY = armY + fy * thrustR * s;
  } else {
    mainX = rig.x + Math.cos(mainAngle) * reach * wS;
    mainY = armY + Math.sin(mainAngle) * reach;
  }
  // The free hand hangs relaxed by the hip opposite the weapon hand;
  // during swings/casts it rides the counterbalance circle instead.
  let offX: number;
  let offY: number;
  if (thrustR !== null) {
    // Finisher: the free arm hauls back behind the hip — the counter-
    // weight of the ram.
    offX = rig.x - fx * 0.17 * s * wS;
    offY = armY + 0.09 * s;
  } else if (chopping || mining) {
    // Two-handed grip: the free hand chokes up the haft behind the
    // striking hand — further down for the heavier pick.
    const choke = mining ? 0.2 : 0.16;
    offX = mainX - Math.cos(mainAngle) * choke * s;
    offY = mainY - Math.sin(mainAngle) * choke * s + 0.03 * s;
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
  // Staves resolve through the style registry too — roster ids
  // (stormcaller, worldsplinter, ...) don't all say 'staff'.
  const isStaff = weapon !== undefined && staffStyle(weapon.id) !== null;
  // Blades — swords and daggers both — share the low carriage (incl.
  // the rogue reverse grip). Identity comes from the style registry;
  // roster ids (falchion, hush, ...) don't all say 'sword'/'dagger'.
  const isSword = weapon !== undefined && bladeStyle(weapon.id) !== null;
  let heldAngle = thrustR !== null ? rig.dir : mainAngle;
  let staffGrip = 0.34; // combat default: gripped low, business end forward
  let armSwingK = 1;
  let restSettle = 0;
  let restSide = Math.sign(fx) || 1;
  if (
    (rig.pose === PoseState.Walk || rig.pose === PoseState.Idle || rig.pose === PoseState.Sneak) &&
    !drawing &&
    !loosing
  ) {
    restSettle = rig.restT * rig.restT * (3 - 2 * rig.restT);
    const wSide = restSide;
    const runK = rig.runF;
    let hx = rig.x + wSide * tw * 1.02 * wS;
    let hy = armY + 0.17 * s;
    let hAngle = Math.PI / 2 + wSide * (0.3 + 0.35 * runK); // tip down, trailing
    if (isSword) {
      if (rig.carryStyle === 'rogue') {
        // Reverse grip: blade hanging down-back past the hip, tip
        // toward the heel — the rogue's low-line carry, one flick from
        // an icepick stab.
        hAngle = Math.PI / 2 + wSide * (0.72 + 0.08 * runK);
        hx += wSide * 0.04 * s * wS;
        hy = armY + 0.12 * s;
      } else {
        // Standard carry: at rest the blade angles down-FORWARD off
        // the leg so the guard and taper read as a sword; as the gait
        // becomes a run the whole blade swings UP into the ready carry
        // — point up-forward, clear of the body — the way a sword is
        // actually run with. Blended on the gait itself so a jog only
        // half-raises it.
        const lift = runK * runK * (3 - 2 * runK);
        hAngle = Math.PI / 2 - wSide * (0.32 + lift * (Math.PI / 2 + 0.18));
        hx += wSide * (0.05 + 0.04 * lift) * s * wS;
        hy = armY + (0.17 - 0.05 * lift) * s;
      }
    }
    if (isStaff) {
      // Walking stick ↔ run carry, blended on the gait itself.
      const carry = runK * runK * (3 - 2 * runK);
      const sw = ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP;
      // Planted stick rocks with the steps — the stride works the staff.
      const rock = -sw * 0.2 * rig.poleX * (1 - carry) * Math.min(1, rig.poleStrength);
      const up = -Math.PI / 2 + rock;
      const level = wSide > 0 ? -0.3 : -Math.PI + 0.3; // orb forward, held low
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
      hAngle = wSide > 0 ? 0.85 : Math.PI - 0.85;
      hx += wSide * 0.12 * s * wS;
      hy = armY + 0.18 * s;
    }
    mainX += (hx - mainX) * restSettle;
    mainY += (hy - mainY) * restSettle;
    heldAngle += angleDelta(heldAngle, hAngle) * restSettle;
    offX += (rig.x - wSide * tw * 1.02 * wS - offX) * restSettle;
    offY += (armY + 0.17 * s - offY) * restSettle;
  }

  // Walking: arms swing counter to the legs along the travel direction.
  if (rig.pose === PoseState.Walk || rig.pose === PoseState.Idle) {
    const sw = ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP;
    // Arms pump harder as the walk becomes a run.
    const amp = (0.07 + 0.055 * rig.runF) * s * Math.min(1, rig.poleStrength);
    mainX += rig.poleX * sw * amp * armSwingK;
    mainY += (rig.poleY * sw * amp * 0.5 - Math.abs(sw) * rig.runF * 0.03 * s) * armSwingK;
    offX -= rig.poleX * sw * amp;
    offY -= rig.poleY * sw * amp * 0.5 - Math.abs(sw) * rig.runF * 0.03 * s;
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

  // Slash trail: a crisp crescent chasing the blade through the strike
  // (backhand sweeps the reverse way); the finisher fires a piston
  // streak straight down the aim line instead.
  if (strikeSweep && weapon?.weapon?.style === 'melee') {
    const fade = rig.poseT < 0.5 ? 1 : 1 - (rig.poseT - 0.5) / 0.12;
    const alpha = Math.max(0, Math.min(1, fade));
    if (alpha > 0) {
      const r0 = (weapon.weapon.range ?? 1.5) * 0.27 * s;
      const ccw = strikeSweep.to < strikeSweep.from;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(244, 239, 228, ${0.28 * alpha})`;
      ctx.lineWidth = 0.16 * s;
      ctx.beginPath();
      ctx.arc(rig.x, armY, r0, strikeSweep.from, strikeSweep.to, ccw);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.75 * alpha})`;
      ctx.lineWidth = 0.055 * s;
      ctx.beginPath();
      ctx.arc(rig.x, armY, r0 + 0.09 * s, strikeSweep.from, strikeSweep.to, ccw);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  if (
    thrustR !== null &&
    weapon?.weapon?.style === 'melee' &&
    rig.poseT >= 0.35 &&
    rig.poseT < 0.78
  ) {
    const fade = 1 - Math.max(0, (rig.poseT - 0.6) / 0.18);
    const r1 = (weapon.weapon.range ?? 1.7) * 0.33 * s;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(244, 239, 228, ${0.3 * fade})`;
    ctx.lineWidth = 0.2 * s;
    ctx.beginPath();
    ctx.moveTo(rig.x + fx * 0.15 * s, armY + fy * 0.15 * s);
    ctx.lineTo(rig.x + fx * r1 * 0.85, armY + fy * r1 * 0.85);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 252, 240, ${0.7 * fade})`;
    ctx.lineWidth = 0.08 * s;
    ctx.beginPath();
    ctx.moveTo(rig.x + fx * 0.2 * s, armY + fy * 0.2 * s);
    ctx.lineTo(rig.x + fx * r1, armY + fy * r1);
    ctx.stroke();
    ctx.lineCap = 'butt';
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
  mainShX += (rig.x + restSide * tw * 0.85 * wS - mainShX) * restSettle;
  offShX += (rig.x - restSide * tw * 0.85 * wS - offShX) * restSettle;
  // Aiming up-and-away puts the gear behind the body.
  const weaponBehind = fy < -0.35;
  const cuff = bodySt?.sleeves === 'full' ? sleeve : undefined;
  const paintOffArm = (): void => {
    const joints = drawArm(
      ctx,
      offShX,
      shoulderY,
      offX,
      offY,
      (archer ? fx * 0.2 : Math.cos(offAngle) * 0.4) * (1 - restSettle) -
        restSide * 0.45 * restSettle,
      1,
      sleeve,
      skin,
      s,
      cuff,
      gloveSt,
      rig.hurt,
    );
    // Arm-carried offhand rides the solved forearm, same depth layer as
    // the arm itself so the strap never breaks. An archer's off hand is
    // busy holding the bow — the shield sits this one out.
    if (offSt && offSt.kind !== 'quiver' && !archer) {
      if (offSt.kind === 'weapon' && rig.offhandItem) {
        // DUAL WIELD: the off blade is the real weapon, gripped in the
        // off fist in a near-vertical low carry — the rogue's second
        // edge, unmistakable at a glance.
        drawHeldItem(
          ctx,
          rig.offhandItem,
          offSt.color,
          offX,
          offY,
          -Math.PI / 2 + restSide * 0.35,
          s,
          rig,
        );
      } else {
        drawOffhandOnArm(ctx, offSt, joints, s, profileK, rig.hurt);
      }
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
        restSide * 0.45 * restSettle,
      archer ? -0.6 : 1,
      sleeve,
      skin,
      s,
      cuff,
      gloveSt,
      rig.hurt,
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
      });
    } else {
      drawHeldItem(ctx, weapon.id, weapon.color, mainX, mainY, heldAngle, s, rig, {
        grip: staffGrip,
        carry: isBow ? restSettle : 0,
      });
    }
  };

  // Far arm always sits behind the torso; the weapon + striking arm go
  // in front unless the character is aiming up and away.
  paintOffArm();
  if (weaponBehind) {
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
  ctx.fillStyle = skin;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 2, cut);
  ctx.fill();
  // Hair (skipped under a helmet — the dome owns the skull). Style and
  // color come from the chosen look; NPC humanoids keep the classic
  // crop tinted from their body color.
  const hairStyle = rig.look?.hair ?? 0;
  const hairCol = rig.hurt
    ? '#ffffff'
    : rig.look
      ? HAIR_COLORS[rig.look.hairColor]!
      : shade(bodyColor, -24);
  const BALD = hairStyle === 1;
  // A hat CONTAINS the hair: under a wizard brim only the fringe locks
  // peek out — long curtains and topknots would dangle through the
  // cloth and read as stray cowl strips.
  const underBrim = helmSt?.kind === 'wizard';
  const LONG = hairStyle === 2 && !underBrim;
  const KNOT = hairStyle === 3 && !underBrim;
  // A circlet sits ON the hair, a wizard's brim rides over it (locks
  // peeking out below); every other helm owns the skull.
  if ((!helm || helmSt?.kind === 'circlet' || helmSt?.kind === 'wizard') && !BALD) {
    ctx.fillStyle = hairCol;
    if (backK > 0.55) {
      // Back of the skull: the mop covers nearly everything, with one
      // stepped hem so it still reads as a haircut. Long hair falls
      // past the jaw; a topknot crops high.
      const mopH = LONG ? hh * 1.95 : KNOT ? hh * 1.1 : hh * 1.52;
      ctx.beginPath();
      chamferRect(ctx, headX - hw * 0.96, headY - hh * 0.98, hw * 1.92, mopH, [
        cut * 0.85,
        cut * 0.85,
        0,
        0,
      ]);
      ctx.fill();
      ctx.fillRect(
        headX - lead * hw * 0.5 - hw * 0.28,
        headY - hh * 0.98 + mopH - hh * 0.06,
        hw * 0.56,
        hh * 0.22,
      );
    } else {
      // Fringe slab with its stepped notch on the trailing side.
      const fringeH = KNOT ? hh * 0.45 : hh * 0.6;
      ctx.beginPath();
      chamferRect(ctx, headX - hw * 0.96, headY - hh * 0.98, hw * 1.92, fringeH, [
        cut * 0.85,
        cut * 0.85,
        0,
        0,
      ]);
      ctx.fill();
      if (!KNOT) {
        ctx.fillRect(headX - lead * hw * 0.55 - hw * 0.28, headY - hh * 0.44, hw * 0.56, hh * 0.24);
      }
      if (LONG) {
        // Curtains framing the face on both sides, past the jawline.
        for (const es of [-1, 1]) {
          ctx.fillRect(headX + es * hw * 0.68, headY - hh * 0.6, hw * 0.3, hh * 1.75);
        }
      } else if (profileK > 0.45) {
        // Crop: a side-lock behind the ear grounds the turned head.
        const k = Math.min(1, (profileK - 0.45) / 0.35);
        ctx.fillRect(
          headX - lead * hw * 0.96,
          headY - hh * 0.5,
          hw * 0.34 * k,
          hh * 1.05,
        );
      }
    }
    if (KNOT) {
      // The knob rides the crown in every band.
      ctx.beginPath();
      chamferRect(ctx, headX - hw * 0.2, headY - hh * 1.34, hw * 0.4, hh * 0.36, cut * 0.4);
      ctx.fill();
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
    const eyeW = headR * 0.19;
    const eyeH = headR * 0.36;
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      // The far eye narrows through three-quarter and disappears
      // around the corner at strong profile.
      const far = es !== lead;
      const wK = far ? Math.max(0, 1 - Math.max(0, (profileK - 0.5) / 0.28)) : 1;
      if (wK <= 0.02) continue;
      const w = eyeW * wK;
      ctx.fillRect(pairX + es * sep - w / 2, eyeLineY - eyeH / 2, w, eyeH * faceK);
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
    // Rosy cheeks under the eyes, riding the same face bands.
    if (!rig.hurt) {
      ctx.fillStyle = 'rgba(214, 118, 96, 0.45)';
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0, 1 - Math.max(0, (profileK - 0.5) / 0.28)) : 1;
        if (wK <= 0.02) continue;
        ctx.fillRect(
          pairX + es * sep - headR * 0.14 * wK,
          eyeLineY + headR * 0.24,
          headR * 0.28 * wK,
          headR * 0.16,
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
        // Goatee: a chin spike dropping past the jaw.
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
      } else {
        // Full beard: mustache bar plus a jaw slab below the face.
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
      }
    }
  }

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

  // ---- weapon + striking arm in front of the torso (the bold read).
  if (!weaponBehind) {
    paintWeapon();
    paintMainArm();
  }
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
   */
  extra?: { pull?: number; loose?: number; grip?: number; carry?: number },
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  // Mid-arc wood point: the bow's quadratic (tips 0.06s, belly control
  // 0.3s) passes through x = 0.18s at grip height — align THAT to the
  // fist, or the bow reads as resting on the wrist.
  if (extra?.carry) ctx.translate(-0.18 * s * extra.carry, 0);

  if (bladeStyle(itemId, color)) {
    // The blade + rogue rosters: every sword AND dagger resolves a
    // style — bespoke silhouette, guard, pommel, living fx channel.
    // Unknown '*sword'/'*dagger' ids get color-derived fallbacks.
    drawSword(ctx, bladeStyle(itemId, color)!, s, rig.nowMs, rig.hurt);
  } else if (itemId.includes('axe') || itemId.includes('pickaxe')) {
    ctx.fillStyle = '#8a6a45';
    ctx.beginPath();
    ctx.roundRect(-0.05 * s, -0.024 * s, 0.46 * s, 0.048 * s, 0.02 * s);
    ctx.fill();
    ctx.fillStyle = color;
    if (itemId.includes('pickaxe')) {
      ctx.beginPath();
      ctx.moveTo(0.36 * s, -0.16 * s);
      ctx.quadraticCurveTo(0.55 * s, 0, 0.36 * s, 0.16 * s);
      ctx.quadraticCurveTo(0.44 * s, 0, 0.36 * s, -0.16 * s);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0.36 * s, -0.13 * s);
      ctx.quadraticCurveTo(0.56 * s, -0.06 * s, 0.54 * s, 0.1 * s);
      ctx.lineTo(0.36 * s, 0.06 * s);
      ctx.closePath();
      ctx.fill();
    }
  } else if (bowStyle(itemId, color)) {
    // The archer's roster: every bow resolves a style — limb kind,
    // wood, tip furniture, charms, and the living fx channel. The
    // painter keeps the classic behaviors: limbs flex with the pull,
    // the string hauls to the nock, release buzzes it straight.
    drawBow(ctx, bowStyle(itemId, color)!, s, rig.nowMs, rig.hurt, extra?.pull ?? 0, extra?.loose);
  } else if (staffStyle(itemId, color)) {
    // The archmage's roster: every staff resolves a style — shaft
    // grammar, signature crown, element focus, living fx. The grip
    // slides with the carriage — high on a planted walking stick,
    // mid-shaft when the business end levels at something — and the
    // focus flares while a cast leaves.
    const castT = rig.pose === PoseState.Cast ? rig.poseT : 0;
    drawStaff(ctx, staffStyle(itemId, color)!, s, rig.nowMs, rig.hurt, extra?.grip ?? 0.34, castT);
  } else if (itemId.includes('rod')) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(-0.05 * s, 0);
    ctx.quadraticCurveTo(0.3 * s, -0.14 * s, 0.52 * s, -0.06 * s);
    ctx.stroke();
    ctx.strokeStyle = '#dcd6c4';
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.beginPath();
    ctx.moveTo(0.52 * s, -0.06 * s);
    ctx.lineTo(0.5 * s, 0.12 * s);
    ctx.stroke();
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
  foot: 'hoof' | 'paw' | 'claw';
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
      legs: quadLegs(0.26, 0.15),
      legLen: 0.31,
      rise: 0.26,
      liftAmp: 0.06,
      runSpeed: 1.8,
      turnRate: 4.5,
    },
    bodyLen: 0.44,
    bodyRise: 0.34,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.088,
    foot: 'hoof',
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
    bodyLen: 0.44,
    bodyRise: 0.4,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.068,
    foot: 'paw',
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
    legW: 0.042,
    foot: 'paw',
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
    const { ex, ey, kx, ky } = solveLimb(
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
      for (const t of [-0.55, 0, 0.55]) {
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
  const paintBody = (): void => {
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
    if (opts.defId === 'cow' && !opts.hurt) {
      ctx.fillStyle = '#5b4632';
      ctx.beginPath();
      facetCircle(ctx, bx - fx * len * 0.35, bodyY + py * r * 0.15, r * 0.32, 6, opts.dir + 0.5, 0.72);
      ctx.fill();
    }
  };

  // Head anchor: a chicken pecks its head forward with each step.
  const peck = opts.defId === 'chicken' ? opts.pose.bob * 1.6 : 0;
  const headX = bx + fx * (len * 0.92 + peck * s);
  const headY = bodyY + fy * (len * 0.35 + peck * s * ys) - r * 0.15;
  const headR = r * (opts.defId === 'chicken' ? 0.5 : 0.55);
  const paintHead = (): void => {
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
    } else if (opts.defId === 'wolf' || opts.defId === 'rat') {
      ctx.fillStyle = color;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(headX + px * side * headR * 0.4, headY - headR * 0.3);
        ctx.lineTo(headX + px * side * headR * 0.85, headY - headR * 1.15);
        ctx.lineTo(headX + px * side * headR * 0.95, headY - headR * 0.2);
        ctx.closePath();
        ctx.fill();
      }
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
    if (opts.defId !== 'wolf' && opts.defId !== 'rat') return;
    const wag = Math.sin(opts.walkPhase * Math.PI * 4) * 0.14;
    ctx.strokeStyle = opts.defId === 'rat' ? '#c9a68a' : color;
    ctx.lineWidth = Math.max(2, s * (opts.defId === 'rat' ? 0.035 : 0.07));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - fx * len * 0.95, bodyY - fy * len * 0.3);
    ctx.quadraticCurveTo(
      bx - fx * len * 1.45 + px * wag * s,
      bodyY - fy * len * 0.6 + py * wag * s - r * 0.3,
      bx - fx * len * 1.75 + px * wag * s * 1.6,
      bodyY - fy * len * 0.7 + py * wag * s * 1.6,
    );
    ctx.stroke();
    ctx.lineCap = 'butt';
  };

  // ---- compose in depth order. The facing decides where head and
  // tail sit relative to the mass: facing down-screen the head is the
  // closest thing (nothing may paint over the face); facing up-screen
  // it tucks behind the body and the tail comes forward.
  const headFront = fy > 0.2;
  const headBack = fy < -0.25;
  const tailFront = fy < -0.2;
  if (!tailFront) paintTail();
  if (headBack) paintHead();
  for (const i of farLegs) drawLeg(i);
  paintBody();
  if (!headBack && !headFront) paintHead();
  for (const i of nearLegs) drawLeg(i);
  if (headFront) paintHead();
  if (tailFront) paintTail();
}
