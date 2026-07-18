import { PoseState } from '@devcraft/shared';
import { itemDef } from '@devcraft/content';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { LegRig, solveLimb, type LegPose, type LegRigConfig } from './legs.js';

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
};

export class LegSolver extends LegRig {
  constructor() {
    super(HUMANOID_LEG_CFG);
  }
}

/**
 * Knee pole constraint. While running, BOTH knees must bow toward the
 * travel direction (a knee bent against the run reads as a broken,
 * inverted leg). At rest the natural screen rule applies — up-ish, else
 * outward — where mismatched knees are fine. The speed blend prevents
 * popping at gait transitions, and per-leg hysteresis (`memory`) keeps a
 * borderline choice from flickering mid-stride.
 *
 * `cx, cy` is one unit perpendicular of the hip→foot line (screen);
 * returns +1 to use it, -1 to use its negation.
 */
export function chooseKneeSign(
  cx: number,
  cy: number,
  poleX: number,
  poleY: number,
  poleStrength: number,
  sideSgn: number,
  memory: number,
): number {
  // Moving preference: knee offset should align with travel.
  const moveScore = cx * poleX + cy * poleY;
  // Idle preference: the classic up-ish / outward rule.
  const idleSign =
    cy > 0.15 || (Math.abs(cy) <= 0.15 && Math.sign(cx) !== sideSgn) ? -1 : 1;
  const m = poleStrength;
  const score = m * moveScore + (1 - m) * idleSign * 0.5;
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
  /** Wall-clock ms for micro-motion (full-draw tremble, string buzz). */
  nowMs: number;
  /** Solved feet in screen space (already projected by the caller). */
  feet: Array<{ x: number; y: number; lift: number }>;
  /** Gait bob + hip rise from the solver (tile units). */
  bob: number;
  rise: number;
  /** Fake-3D squash factor from the solver. */
  wScale: number;
  /** Knee pole constraint from the solver. */
  poleX: number;
  poleY: number;
  poleStrength: number;
  /** Per-leg knee-sign hysteresis, owned by the caller's anim state. */
  kneeMemory: [number, number];
  bodyColor: string;
  hurt: boolean;
  isOwn: boolean;
  weaponItem?: string;
  bodyItem?: string;
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
): void {
  const { ex, ey, kx, ky } = solveArm(sx, sy, hx, hy, ARM_LEN * s, prefX, prefY);

  ctx.lineCap = 'round';
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = Math.max(2, s * 0.085);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  // Bare forearm — short-sleeved adventurers.
  ctx.strokeStyle = skin;
  ctx.lineWidth = Math.max(2, s * 0.062);
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Hand: a squared mitt aligned with the forearm — blocky, not a ball.
  ctx.fillStyle = skin;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.028);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(Math.atan2(ey - ky, ex - kx));
  ctx.beginPath();
  chamferRect(ctx, -0.055 * s, -0.06 * s, 0.13 * s, 0.12 * s, 0.03 * s);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const skin = rig.hurt ? '#ffffff' : (rig.skinColor ?? SKIN);
  const bodyColor = rig.hurt ? '#ffffff' : (itemDef(rig.bodyItem ?? '')?.color ?? rig.bodyColor);

  const fx = Math.cos(rig.dir);
  const fy = Math.sin(rig.dir);
  const px = -fy;
  const py = fx;

  // The body rides the hip line, which rides the gait bob.
  const hipY = rig.y - (rig.rise + rig.bob * 0.45) * s;

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

    // Knee: pole-constrained. Running bows both knees toward travel;
    // idle uses the natural up-ish/outward rule; hysteresis stops
    // borderline flicker mid-stride.
    const bend = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2));
    const cxn = -ey / d;
    const cyn = ex / d;
    const sign = chooseKneeSign(
      cxn,
      cyn,
      rig.poleX,
      rig.poleY,
      rig.poleStrength,
      sgn,
      rig.kneeMemory[i] ?? 0,
    );
    rig.kneeMemory[i] = sign;
    const kx = hipX + ex / 2 + cxn * sign * bend;
    const ky = hipY + ey / 2 + cyn * sign * bend;

    ctx.strokeStyle = rig.hurt ? '#ffffff' : shade(bodyColor, -28);
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kx, ky);
    ctx.lineTo(hipX + ex, hipY + ey);
    ctx.stroke();

    // Foot chip: a flat blocky boot at the contact point.
    ctx.fillStyle = rig.hurt ? '#ffffff' : BOOT;
    ctx.beginPath();
    chamferRect(
      ctx,
      hipX + ex - 0.075 * s,
      hipY + ey - 0.03 * s,
      0.15 * s,
      0.06 * s,
      0.022 * s,
    );
    ctx.fill();
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  // ---- arms + weapon. Hand targets change with what the character is
  // doing; two-segment IK arms connect them back to the shoulder line.
  const wS = rig.wScale;
  const hScale = 1 + (1 - wS) * 0.55;
  const weapon = itemDef(rig.weaponItem ?? '');
  const isBow = weapon !== undefined && weapon.id.includes('bow');
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
  const th = 0.46 * s; // hip line → shoulders

  // Melee combo stages: forehand sweep, backhand sweep, lunging thrust.
  // Each is anticipation → strike → follow-through, never a plain pivot.
  let swingOffset = 0.5 + gatherSwing;
  let strikeSweep: { from: number; to: number } | null = null;
  let thrustR: number | null = null; // finisher: radial thrust (tiles)
  let lean = 0; // torso lean (radians) inside the squash frame
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
  const offAngle = rig.dir - 0.55;
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
  if (chopping || mining) {
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

  // Walking: arms swing counter to the legs along the travel direction.
  if (rig.pose === PoseState.Walk || rig.pose === PoseState.Idle) {
    const sw = ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP;
    const amp = 0.07 * s * Math.min(1, rig.poleStrength);
    mainX += rig.poleX * sw * amp;
    mainY += rig.poleY * sw * amp * 0.5;
    offX -= rig.poleX * sw * amp;
    offY -= rig.poleY * sw * amp * 0.5;
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
  const sleeve = rig.hurt ? '#ffffff' : shade(bodyColor, -12);
  const archer = drawing || loosing;
  const mainShX = archer
    ? rig.x - fx * tw * 0.7 * wS
    : rig.x + Math.cos(mainAngle) * tw * 0.8 * wS;
  const offShX = archer
    ? rig.x + fx * tw * 0.8 * wS
    : rig.x + Math.cos(offAngle) * tw * 0.8 * wS;
  // Aiming up-and-away puts the gear behind the body.
  const weaponBehind = fy < -0.35;
  const paintOffArm = (): void =>
    drawArm(
      ctx,
      offShX,
      shoulderY,
      offX,
      offY,
      archer ? fx * 0.2 : Math.cos(offAngle) * 0.4,
      1,
      sleeve,
      skin,
      s,
    );
  const paintMainArm = (): void =>
    drawArm(
      ctx,
      mainShX,
      shoulderY,
      mainX,
      mainY,
      archer ? -fx : Math.cos(mainAngle) * 0.4,
      archer ? -0.6 : 1,
      sleeve,
      skin,
      s,
    );
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
      drawHeldItem(
        ctx,
        weapon.id,
        weapon.color,
        mainX,
        mainY,
        thrustR !== null ? rig.dir : mainAngle,
        s,
        rig,
      );
    }
  };

  // Far arm always sits behind the torso; the weapon + striking arm go
  // in front unless the character is aiming up and away.
  paintOffArm();
  if (weaponBehind) {
    paintWeapon();
    paintMainArm();
  }

  // ---- torso + head, drawn in a local frame at the hip line with the
  // fake-3D squash: narrow side profile, full front/back profile, height
  // compensating inversely so the turn reads as orientation.
  ctx.save();
  ctx.translate(rig.x, hipY);
  // Combat lean: the torso coils and tips with swings and braced draws.
  if (lean !== 0) ctx.rotate(lean);
  ctx.scale(wS, hScale);

  // Rectangular tunic: shoulders tapering to the waist — kept trim so
  // the silhouette reads lithe rather than broad.
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = rig.isOwn ? '#e8b64c' : OUTLINE;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(-tw, -th);
  ctx.lineTo(tw, -th);
  ctx.lineTo(ww, 0.02 * s);
  ctx.lineTo(-ww, 0.02 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Hard shade half — the flat-art form read.
  if (!rig.hurt) {
    ctx.fillStyle = shade(bodyColor, -18);
    ctx.beginPath();
    ctx.moveTo(0, -th);
    ctx.lineTo(tw, -th);
    ctx.lineTo(ww, 0.02 * s);
    ctx.lineTo(0, 0.02 * s);
    ctx.closePath();
    ctx.fill();
    // Lit shoulder cap plane.
    ctx.fillStyle = shade(bodyColor, 14);
    ctx.beginPath();
    ctx.moveTo(-tw, -th);
    ctx.lineTo(tw, -th);
    ctx.lineTo(tw * 0.9, -th + 0.07 * s);
    ctx.lineTo(-tw * 0.9, -th + 0.07 * s);
    ctx.closePath();
    ctx.fill();
    // Belt band grounds the silhouette.
    ctx.fillStyle = shade(bodyColor, -38);
    ctx.fillRect(-ww - 0.008 * s, -0.075 * s, ww * 2 + 0.016 * s, 0.075 * s);
  }

  // ---- head (inside the squash frame so turning carries it too).
  // A chamfered block, not a ball — the brutalist read, kept friendly
  // by proportion and the face.
  const headR = 0.15 * s;
  const headX = fx * 0.05 * s;
  const headY = -th - headR * 0.82;
  const hw = headR * 1.04; // half-width
  const hh = headR * 1.0; // half-height
  const cut = headR * 0.34;
  ctx.fillStyle = skin;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.beginPath();
  chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 2, cut);
  ctx.fill();
  ctx.stroke();
  // Hair: a flat slab with a straight fringe and one stepped notch —
  // crisp, angular, and it still reads as a haircut.
  ctx.fillStyle = rig.hurt ? '#ffffff' : shade(bodyColor, -24);
  ctx.beginPath();
  chamferRect(ctx, headX - hw * 0.96, headY - hh * 0.98, hw * 1.92, hh * 0.6, [
    cut * 0.85,
    cut * 0.85,
    0,
    0,
  ]);
  ctx.fill();
  // Fringe notch drops on the side away from the facing — kept high so
  // it never crowds the eyes.
  const notchSide = fx >= 0 ? -1 : 1;
  ctx.fillRect(
    headX + notchSide * hw * 0.55 - hw * 0.28,
    headY - hh * 0.44,
    hw * 0.56,
    hh * 0.24,
  );

  // Eyes track facing: bold vertical slits, not dots.
  const eyeW = headR * 0.2;
  const eyeH = headR * 0.38;
  ctx.fillStyle = OUTLINE;
  for (const es of [-1, 1]) {
    ctx.fillRect(
      headX + fx * headR * 0.45 + es * px * headR * 0.4 - eyeW / 2,
      headY + fy * headR * 0.32 + es * py * headR * 0.4 - eyeH / 2,
      eyeW,
      eyeH,
    );
  }
  // Rosy cheeks: small soft chips under the eyes, kid-friendly.
  if (!rig.hurt) {
    ctx.fillStyle = 'rgba(214, 118, 96, 0.45)';
    for (const es of [-1, 1]) {
      ctx.fillRect(
        headX + fx * headR * 0.28 + es * px * headR * 0.66 - headR * 0.14,
        headY + fy * headR * 0.3 + es * py * headR * 0.66,
        headR * 0.28,
        headR * 0.17,
      );
    }
  }
  ctx.restore();

  // ---- weapon + striking arm in front of the torso (the bold read).
  if (!weaponBehind) {
    paintWeapon();
    paintMainArm();
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
function drawHeldItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  color: string,
  hx: number,
  hy: number,
  angle: number,
  s: number,
  rig: RigPose,
  /** Bow extras: string pull-back distance (px) and release progress. */
  extra?: { pull?: number; loose?: number },
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.028);

  if (itemId.includes('sword')) {
    // Blade with a tapered tip, crossguard, pommel.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0.04 * s, -0.038 * s);
    ctx.lineTo(0.42 * s, -0.038 * s);
    ctx.lineTo(0.52 * s, 0);
    ctx.lineTo(0.42 * s, 0.038 * s);
    ctx.lineTo(0.04 * s, 0.038 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(color, 30);
    ctx.fillRect(0.06 * s, -0.03 * s, 0.36 * s, 0.026 * s);
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(0.02 * s, -0.085 * s, 0.045 * s, 0.17 * s);
    ctx.beginPath();
    ctx.arc(-0.06 * s, 0, 0.035 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#d9a441';
    ctx.fill();
  } else if (itemId.includes('axe') || itemId.includes('pickaxe')) {
    ctx.fillStyle = '#8a6a45';
    ctx.beginPath();
    ctx.roundRect(-0.05 * s, -0.024 * s, 0.46 * s, 0.048 * s, 0.02 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    if (itemId.includes('pickaxe')) {
      ctx.beginPath();
      ctx.moveTo(0.36 * s, -0.16 * s);
      ctx.quadraticCurveTo(0.55 * s, 0, 0.36 * s, 0.16 * s);
      ctx.quadraticCurveTo(0.44 * s, 0, 0.36 * s, -0.16 * s);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0.36 * s, -0.13 * s);
      ctx.quadraticCurveTo(0.56 * s, -0.06 * s, 0.54 * s, 0.1 * s);
      ctx.lineTo(0.36 * s, 0.06 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (itemId.includes('bow')) {
    // The bow flexes with the pull: limbs bend deeper as the string
    // comes back, and on release the string buzzes back to straight.
    const pull = extra?.pull ?? 0;
    const flex = Math.min(1, pull / (0.36 * s));
    const tipA = Math.PI / 2.3;
    const limbR = (0.3 + flex * 0.045) * s;
    const tipX = Math.cos(tipA) * 0.3 * s;
    const tipY = Math.sin(tipA) * 0.3 * s;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(tipX, -tipY);
    ctx.quadraticCurveTo(limbR, 0, tipX, tipY);
    ctx.stroke();
    // Grip wrap.
    ctx.strokeStyle = shade(color, -30);
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(0.29 * s, -0.05 * s);
    ctx.lineTo(0.29 * s, 0.05 * s);
    ctx.stroke();
    // String: taut → hauled to the nock point → buzzing on release.
    ctx.strokeStyle = '#e6e0d0';
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(tipX, -tipY);
    if (extra?.loose !== undefined) {
      const t = extra.loose;
      const buzz = Math.sin(t * 42) * 0.05 * s * (1 - t);
      ctx.quadraticCurveTo(-buzz, 0, tipX, tipY);
    } else {
      ctx.lineTo(-pull, 0);
      ctx.lineTo(tipX, tipY);
    }
    ctx.stroke();
    if (pull > 0.06 * s && extra?.loose === undefined) {
      // Nocked arrow: shaft, a real head, and fletching at the nock.
      ctx.strokeStyle = '#c4b590';
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.beginPath();
      ctx.moveTo(-pull, 0);
      ctx.lineTo(0.36 * s, 0);
      ctx.stroke();
      ctx.fillStyle = '#c9ccd4';
      ctx.beginPath();
      ctx.moveTo(0.42 * s, 0);
      ctx.lineTo(0.34 * s, -0.032 * s);
      ctx.lineTo(0.34 * s, 0.032 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d95763';
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-pull + 0.01 * s, 0);
        ctx.lineTo(-pull - 0.045 * s, sy * 0.045 * s);
        ctx.stroke();
      }
    }
  } else if (itemId.includes('staff')) {
    const castT = rig.pose === PoseState.Cast ? rig.poseT : 0;
    ctx.fillStyle = '#5b4632';
    ctx.beginPath();
    ctx.roundRect(-0.12 * s, -0.026 * s, 0.52 * s, 0.052 * s, 0.03 * s);
    ctx.fill();
    ctx.stroke();
    // Orb in a claw.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0.44 * s, 0, (0.075 + castT * 0.04) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#efe3ff';
    ctx.beginPath();
    ctx.arc(0.42 * s, -0.02 * s, 0.028 * s, 0, Math.PI * 2);
    ctx.fill();
    if (castT > 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0.44 * s, 0, (0.13 + castT * 0.1) * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
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
    ctx.stroke();
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
      legLen: 0.36,
      rise: 0.3,
      liftAmp: 0.06,
      runSpeed: 1.8,
      turnRate: 4.5,
    },
    bodyLen: 0.44,
    bodyRise: 0.38,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.075,
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
    legW: 0.06,
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
    // forward, hocks and bird ankles backward), with a lateral-outward
    // tiebreak so up/down-screen facings stay deterministic.
    const bow = spec.kneeFwd[i] ?? 1;
    const out = Math.sign(leg.side) || 1;
    const prefX = bow * fx + px * out * 0.35;
    const prefY = (bow * fy + py * out * 0.35) * ys;
    const { ex, ey, kx, ky } = solveLimb(hipX, hipY, foot.x, footY, L, stretch, prefX, prefY);

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
      const hw = spec.legW * s * 1.5;
      ctx.fillStyle = footColor;
      ctx.beginPath();
      chamferRect(ctx, ex - hw / 2, ey - hw * 0.55, hw, hw * 0.62, hw * 0.18);
      ctx.fill();
    } else {
      const pw = spec.legW * s * 1.35;
      ctx.fillStyle = footColor;
      ctx.beginPath();
      ctx.ellipse(ex, ey - pw * 0.18, pw * 0.62, pw * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  // Split by projected world-y of the hip: up-screen legs are FAR.
  const farLegs: number[] = [];
  const nearLegs: number[] = [];
  for (let i = 0; i < spec.rig.legs.length; i++) {
    const leg = spec.rig.legs[i]!;
    const wy = fy * leg.fwd + fx * leg.side;
    (wy < 0 ? farLegs : nearLegs).push(i);
  }
  for (const i of farLegs) drawLeg(i);

  // Body: faceted low-poly mass along the facing — same dialect as the
  // boulders and canopies.
  let seed = 0;
  for (let i = 0; i < opts.defId.length; i++) {
    seed = (seed * 31 + opts.defId.charCodeAt(i)) | 0;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.save();
  ctx.translate(bx, bodyY);
  ctx.rotate(opts.dir + roll);
  ctx.beginPath();
  facetBlob(ctx, 0, 0, len, seed, 9, (r * 0.78) / len, 0.4);
  ctx.fill();
  ctx.stroke();
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

  // Head: a faceted chunk, one flat side toward the travel. A chicken
  // pecks its head forward with each step — the bob rides the gait.
  const peck = opts.defId === 'chicken' ? opts.pose.bob * 1.6 : 0;
  const headX = bx + fx * (len * 0.92 + peck * s);
  const headY = bodyY + fy * (len * 0.35 + peck * s * ys) - r * 0.15;
  const headR = r * (opts.defId === 'chicken' ? 0.5 : 0.55);
  ctx.fillStyle = color;
  ctx.beginPath();
  facetCircle(ctx, headX, headY, headR, 6, opts.dir + Math.PI / 6);
  ctx.fill();
  ctx.stroke();

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
      ctx.stroke();
    }
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
  }

  // Eyes: square chips, tracking the facing.
  ctx.fillStyle = OUTLINE;
  for (const es of [-1, 1]) {
    const eex = headX + fx * headR * 0.42 + es * px * headR * 0.35;
    const eey = headY + fy * headR * 0.42 + es * py * headR * 0.35;
    ctx.fillRect(eex - headR * 0.13, eey - headR * 0.15, headR * 0.26, headR * 0.3);
  }

  // Near-side legs pass in front of the body mass.
  for (const i of nearLegs) drawLeg(i);
}
