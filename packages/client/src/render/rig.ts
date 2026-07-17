import { PoseState } from '@devcraft/shared';
import { itemDef } from '@devcraft/content';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';

/**
 * Procedural humanoid rig with genuine two-segment IK legs.
 *
 * Feet are planted in *world space*. When the body drifts past a
 * threshold from a foot's rest pose, that foot commits to a step: it
 * animates to a new plant ahead of the body while the other foot stays
 * planted. Knees solve by isoceles two-bone IK. The result is walking
 * that reads as walking — feet stick to the ground, stride adapts to
 * speed, and stopping settles the feet naturally under the body.
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

interface StepState {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
}

export interface LegPose {
  /** World-space feet + lift (tiles). */
  feet: Array<{ x: number; y: number; lift: number }>;
  /** Sum of lifts — the body rides this bob. */
  bob: number;
  /** Current hip height above the ground point (tiles). */
  rise: number;
  /**
   * Fake-3D squash: <1 when facing/travelling sideways (narrow side
   * profile), >1 facing up/down (full front profile). Height compensates
   * inversely so the turn reads as orientation, not shrinking.
   */
  wScale: number;
  /** Knee pole vector: unit travel direction (world axes). */
  poleX: number;
  poleY: number;
  /** 0 idle → 1 running: how strongly the pole constrains the knees. */
  poleStrength: number;
}

/**
 * The herotown gait, the version that finally nailed it (their notes,
 * kept true here):
 *
 * - Characters are BILLBOARDS. Hips are FIXED on the screen X axis
 *   (left hip, right hip, always); feet stride along the movement
 *   direction from those fixed hips. Rotating the hip line with
 *   velocity throws the legs sideways — never do it.
 * - Cadence from first principles: stride = f(leg reach), and
 *   swing = stride / (2 · speed), so step rate scales EXACTLY with
 *   how fast the body moves. No walk-cycle timer.
 * - Anticipation: a step lands where the hip will be WHEN THE SWING
 *   ENDS (home + velocity · swing). Aiming at where home is now
 *   guarantees landing behind a moving body — the dangling-feet bug.
 * - Strictly one foot in the air; the planted foot carries the body.
 *   Exception: a foot past reach snaps forward NOW — never noodles.
 */
export class LegSolver {
  private feet: Array<{ x: number; y: number; lift: number }> | null = null;
  private step: Array<StepState | null> = [null, null];
  private lastX: number | null = null;
  private lastY: number | null = null;
  private vx = 0;
  private vy = 0;
  private rise = LEG_RISE;
  private wScale = 1;
  /** Signed idle-turn accumulator; a big enough pivot owes a shuffle. */
  private lastDir: number | null = null;
  private turnDebt = 0;
  private turnPending = 0;

  update(bx: number, by: number, dir: number, rawDt: number): LegPose {
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    // Any non-finite state resets instead of poisoning every frame.
    if (!Number.isFinite(this.vx + this.vy)) {
      this.vx = 0;
      this.vy = 0;
      this.feet = null;
      this.step = [null, null];
    }

    // Velocity from position deltas — identical for self/remotes/NPCs.
    const rawVx = this.lastX === null ? 0 : (bx - this.lastX) / dt;
    const rawVy = this.lastY === null ? 0 : (by - this.lastY) / dt;
    this.lastX = bx;
    this.lastY = by;
    const k = Math.min(1, dt * 20);
    this.vx += (rawVx - this.vx) * k;
    this.vy += (rawVy - this.vy) * k;
    const speed = Math.hypot(this.vx, this.vy);
    const moving = speed > 0.35;
    const dx = moving ? this.vx / speed : 0;
    const dy = moving ? this.vy / speed : 0;

    // Fake-3D squash: orientation comes from travel while moving and
    // from the aim/facing while standing, so turning in place reads too.
    const horiz = moving ? Math.abs(this.vx) / speed : Math.abs(Math.cos(dir));
    const wTarget = 1 + 0.05 * (1 - horiz) - 0.09 * horiz;
    this.wScale += (wTarget - this.wScale) * Math.min(1, dt * 9);

    // Run crouch: hips dip with speed, freeing horizontal reach.
    const speedF = Math.min(1, speed / RUN_SPEED);
    this.rise = LEG_RISE * (1 - 0.15 * speedF);
    // Horizontal reach available given the hip height.
    const reach = Math.sqrt(
      Math.max(0.01, (LEG_LEN * STRETCH) ** 2 - this.rise ** 2),
    );
    const stride = reach * 1.65;
    // Cadence scales exactly with speed.
    const swing = moving
      ? Math.min(0.2, Math.max(0.06, stride / (2 * speed)))
      : 0.12;

    // Turning in place owes the feet a shuffle. Accumulate the SIGNED
    // facing delta while idle (signed so aim jitter cancels instead of
    // building up); past ~a third of a turn, both feet re-plant in
    // sequence — a real pivot-shuffle, never a frozen slide.
    if (this.lastDir !== null) {
      let dd = dir - this.lastDir;
      dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      if (moving) {
        this.turnDebt = 0;
        this.turnPending = 0;
      } else {
        this.turnDebt += dd;
        if (Math.abs(this.turnDebt) > 0.55) {
          this.turnPending = 2;
          this.turnDebt = 0;
        }
      }
    }
    this.lastDir = dir;

    // Idle stance turns with the facing: the foot on the facing side
    // leads along the aim, the stance narrows side-on. Because homes
    // shift when `dir` changes, turning in place re-plants the feet
    // through the normal step logic — a real shuffle, not a slide.
    // Blends out with speed so the gait laws stay untouched on the move.
    const idleF = 1 - Math.min(1, speed / 1.2);
    const fxD = Math.cos(dir);
    const fyD = Math.sin(dir);
    const stanceW = HIP_HALF * (1 - 0.3 * Math.abs(fxD) * idleF);
    // Homes: under the screen-fixed hips, plus the idle facing stagger
    // (large enough that a stance change always clears the idle step
    // threshold — the feet re-plant rather than teleporting their rest).
    const homes: Array<{ x: number; y: number }> = [];
    for (let side = 0; side < 2; side++) {
      const sgn = side === 0 ? -1 : 1;
      const lead = sgn * Math.sign(fxD || 1);
      const stag = 0.14 * Math.abs(fxD) * idleF * lead;
      homes.push({ x: bx + sgn * stanceW + fxD * stag, y: by + fyD * stag * 0.6 });
    }

    if (!this.feet) {
      this.feet = homes.map((h) => ({ x: h.x, y: h.y, lift: 0 }));
    }

    let bob = 0;
    for (let side = 0; side < 2; side++) {
      const sgn = side === 0 ? -1 : 1;
      const homeX = homes[side]!.x;
      const homeY = homes[side]!.y;
      const f = this.feet[side]!;

      const st = this.step[side];
      if (st) {
        st.t += dt / st.dur;
        const t = Math.min(1, st.t);
        const e = t * t * (3 - 2 * t); // smoothstep
        f.x = st.fx + (st.tx - st.fx) * e;
        f.y = st.fy + (st.ty - st.fy) * e;
        f.lift = Math.sin(t * Math.PI) * LIFT_AMP * (0.6 + 1.1 * speedF);
        if (t >= 1) {
          this.step[side] = null;
          f.lift = 0;
        }
      } else {
        f.lift = 0;
        const behind = Math.hypot(f.x - homeX, f.y - homeY);
        const otherPlanted = !this.step[1 - side];
        // Emergency bound: past reach the foot snaps forward NOW, even
        // if the other foot is mid-swing — never noodle-stretch.
        // Idle threshold sits under the turn-stagger delta (~0.13+) so
        // a stance change always earns a re-planting shuffle; a paid-off
        // pivot (`turnPending`) forces one even when the home barely
        // moved — the feet visibly pick up and re-set.
        const turnStep = !moving && this.turnPending > 0;
        const due =
          ((moving ? behind > stride * 0.5 : behind > 0.09) || turnStep) &&
          otherPlanted;
        const emergency = behind > reach * 1.12;
        if (due || emergency) {
          if (turnStep) this.turnPending--;
          // Land where the hip will be when the swing completes, plus a
          // small overshoot so the planted phase centers under the hip.
          this.step[side] = {
            fx: f.x,
            fy: f.y,
            tx: homeX + this.vx * swing + dx * reach * 0.3,
            ty: homeY + this.vy * swing + dy * reach * 0.3,
            t: 0,
            dur: swing,
          };
        }
      }

      // Teleport / reconciliation-snap guard — beyond ~2× reach there is
      // no graceful step; snap rather than stretch.
      if ((f.x - homeX) ** 2 + (f.y - homeY) ** 2 > (LEG_LEN * 2.2) ** 2) {
        f.x = homeX;
        f.y = homeY;
        this.step[side] = null;
        f.lift = 0;
      }
      bob += f.lift;
    }

    return {
      feet: this.feet,
      bob,
      rise: this.rise,
      wScale: this.wScale,
      poleX: dx,
      poleY: dy,
      // Full knee constraint by an easy walking pace.
      poleStrength: Math.min(1, speed / 1.2),
    };
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
}

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
  let dx = hx - sx;
  let dy = hy - sy;
  let d = Math.hypot(dx, dy) || 1e-4;
  const dMax = L * 2 * 1.08; // may straighten just a touch past full
  if (d > dMax) {
    dx *= dMax / d;
    dy *= dMax / d;
    d = dMax;
  }
  const bend = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2));
  const cx = -dy / d;
  const cy = dx / d;
  const sign = cx * prefX + cy * prefY >= 0 ? 1 : -1;
  return {
    ex: sx + dx, // reach-clamped hand
    ey: sy + dy,
    kx: sx + dx / 2 + cx * sign * bend,
    ky: sy + dy / 2 + cy * sign * bend,
  };
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
  // Axes and pickaxes get the full two-handed chop cycle; other gather
  // tools (the rod) keep the gentle working sway.
  const chopping =
    rig.pose === PoseState.Gather && weapon !== undefined && weapon.id.includes('axe');
  const gatherSwing =
    rig.pose === PoseState.Gather && !chopping ? Math.sin(rig.gatherPhase * 5.5) * 0.5 : 0;

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
    const u = (rig.nowMs % 700) / 700;
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
  if (chopping) {
    // Two-handed grip: the free hand chokes up the haft behind the
    // striking hand.
    offX = mainX - Math.cos(mainAngle) * 0.16 * s;
    offY = mainY - Math.sin(mainAngle) * 0.16 * s + 0.03 * s;
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
 * Beast rig for four-legged / critter NPCs. Goblins and skeletons use
 * the humanoid rig with size + skin overrides instead.
 */
export function drawBeast(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    scale: number;
    dir: number;
    radius: number;
    color: string;
    defId: string;
    walkPhase: number;
    moving: boolean;
    hurt: boolean;
    /** 0..1 through an attack: crouch back, then pounce. */
    attackT?: number;
  },
): void {
  const s = opts.scale;
  const r = opts.radius * s;
  const fx = Math.cos(opts.dir);
  const fy = Math.sin(opts.dir);

  // Telegraphed pounce: rock back through the windup (matching the
  // server's 300ms telegraph), then snap forward for the strike.
  const at = opts.attackT ?? 0;
  if (at > 0) {
    const pounce =
      at < 0.7
        ? -0.12 * (at / 0.7) // crouch away
        : 0.3 * Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)); // strike!
    opts = { ...opts, x: opts.x + fx * pounce * s, y: opts.y + fy * pounce * s };
  }
  const px = -fy;
  const py = fx;
  const color = opts.hurt ? '#ffffff' : opts.color;
  const trot = opts.moving ? Math.sin(opts.walkPhase * Math.PI * 2) : 0;
  const bodyY = opts.y - r * 0.55 - Math.abs(trot) * 0.03 * s;

  // Trotting stub legs (two visible pairs, counter-phased).
  ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(opts.color, -35);
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineCap = 'round';
  const len = r * 1.3;
  for (const pair of [-0.55, 0.55]) {
    for (const side of [-1, 1]) {
      const phase = trot * side * (pair > 0 ? 1 : -1);
      const lx = opts.x + fx * len * pair + px * side * r * 0.45 + fx * phase * 0.1 * s;
      ctx.beginPath();
      ctx.moveTo(lx, bodyY + r * 0.3);
      ctx.lineTo(lx + fx * phase * 0.06 * s, opts.y + r * 0.12);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

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
  ctx.translate(opts.x, bodyY);
  ctx.rotate(opts.dir);
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
    facetCircle(ctx, opts.x - fx * len * 0.35, bodyY + py * r * 0.15, r * 0.32, 6, opts.dir + 0.5, 0.72);
    ctx.fill();
  }

  // Head: a faceted chunk, one flat side toward the travel.
  const headX = opts.x + fx * len * 0.92;
  const headY = bodyY + fy * len * 0.35 - r * 0.15;
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
    ctx.moveTo(opts.x - fx * len * 0.95, bodyY - fy * len * 0.3);
    ctx.quadraticCurveTo(
      opts.x - fx * len * 1.45 + px * wag * s,
      bodyY - fy * len * 0.6 + py * wag * s - r * 0.3,
      opts.x - fx * len * 1.75 + px * wag * s * 1.6,
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
}
