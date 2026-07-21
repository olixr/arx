/**
 * The universal leg rig: procedural two-segment IK legs for ANY body.
 *
 * One solver walks everything — players, goblins, cows, chickens, rats,
 * and whatever grows legs next. A rig is configured, never subclassed:
 * how many legs, where they rest under the body, which legs swing
 * together, how long the bones are. The gait laws below are the ones
 * that made the humanoid walk feel right, generalized so every creature
 * in the world obeys the same physics of stepping.
 *
 * Design laws (proven on the biped, now universal):
 * - FEET LIVE IN WORLD SPACE. A planted foot does not move. The body
 *   drifts over it; when a foot's home drifts too far away, that foot
 *   commits to a STEP — an animated re-plant. Walking is a side effect
 *   of planted feet, never a looping animation.
 * - THE STRIDE WHEEL. Stride length GROWS with speed and swing time is
 *   near-constant — the two invariants of real gait. A slow amble takes
 *   short lazy steps; a sprint covers ground with long bounding strides
 *   at only a modestly faster cadence. Deriving swing from
 *   stride/(2·speed) alone is what minced the run into a 15 Hz jitter.
 * - DUTY FACTOR DEFINES THE GAIT. Walking means a foot is always
 *   planted (duty ≥ 0.5). Running means it isn't: flight rigs may put
 *   EVERY foot in the air for a beat mid-stride (duty < 0.5) — the
 *   aerial phase is what makes a long stride geometrically possible.
 *   Grounded rigs instead cap swing time to stance time so a strict
 *   gait gate never strands a stretched partner.
 * - STRIDES FOLLOW TRAVEL, KNEES FOLLOW FACING. Feet stride along the
 *   velocity, but joint-bend preferences are anatomical — anchored to
 *   the body's facing, never to travel (industry rigs parent the knee
 *   pole to the pelvis). Backpedaling and strafing shorten the stride
 *   instead of flipping the knees.
 * - ANTICIPATION. A step lands where the home will be WHEN THE SWING
 *   ENDS (home + velocity · swing). Aiming at where home is now lands
 *   behind a moving body — the dangling-feet bug.
 * - GAIT GROUPS. Legs in the same group may swing together; legs in
 *   different groups may not overlap in the air. A biped alternates
 *   (two groups of one); a quadruped trots (two diagonal pairs). A
 *   groupmate of a swinging leg gets an eager threshold so pairs
 *   actually sync instead of decaying into a crawl.
 * - EMERGENCIES BREAK RULES. A foot past its reach snaps forward NOW,
 *   whatever the group state — legs never noodle-stretch. A teleport
 *   snaps the feet under the body — never a leg across the map.
 * - TWO FRAMES OF REFERENCE. Billboard rigs (humanoids) keep their
 *   hips fixed on the screen X axis and stagger their idle stance with
 *   the facing. Oriented rigs (beasts) carry their homes in the body
 *   frame — they rotate with the facing, so turning in place re-plants
 *   the feet through the normal step logic: a real shuffle for free.
 */

export interface LegSpec {
  /** Rest home in the body frame: forward along the facing (tiles). */
  fwd: number;
  /** Rest home lateral offset: - is the left side (tiles). */
  side: number;
  /** Gait group — legs in the same group swing together. */
  group: number;
}

export interface LegRigConfig {
  legs: LegSpec[];
  /** Total leg length, both segments (tiles). */
  legLen: number;
  /** Hip height above the ground at rest (tiles); < legLen. */
  rise: number;
  /** Peak foot lift mid-swing (tiles). */
  liftAmp: number;
  /** Full-tilt reference speed (tiles/sec) — scales crouch and lift. */
  runSpeed: number;
  /** Legs may straighten slightly past 2L when bounding (default 1.15). */
  stretch?: number;
  /**
   * Billboard rigs face the camera: homes sit on the world X axis with
   * an idle facing stagger, and the rig reports the fake-3D squash.
   * Oriented rigs rotate their homes with the facing.
   */
  billboard?: boolean;
  /** Full-speed planted sweep = reach · strideScale (default 1.65). */
  strideScale?: number;
  /** Speed above which the rig counts as moving (default 0.35). */
  moveThreshold?: number;
  /**
   * Flight rigs may go fully airborne at speed: near full tilt a leg is
   * allowed to launch while its counterpart is still descending, so the
   * duty factor drops below 0.5 and the gait becomes a genuine run with
   * an aerial phase. Grounded rigs (default) instead cap swing time to
   * stance time and never leave the ground.
   */
  flight?: boolean;
  /** Full-run swing duration in seconds (default 0.4 · √legLen). */
  swingRef?: number;
  /**
   * Max facing slew (rad/s) for oriented rigs — bodies can't rotate
   * instantly, and the slewed homes turn a pivot into a sequenced
   * shuffle instead of a four-leg hop. The pose reports the slewed
   * `dir`; draw the body with it so body and legs always agree.
   * Default: unlimited (billboard rigs face the camera regardless).
   */
  turnRate?: number;
}

interface StepState {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
}

export interface LegPose {
  /** World-space feet + lift (tiles), one per configured leg. */
  feet: Array<{ x: number; y: number; lift: number }>;
  /** The slewed facing the homes used — draw the body with THIS. */
  dir: number;
  /** Sum of lifts — the body rides this bob. */
  bob: number;
  /** Current hip height above the ground point (tiles). */
  rise: number;
  /** Fake-3D squash (billboard rigs; 1 for oriented rigs). */
  wScale: number;
  /** Unit travel direction (world axes) — drives arm swing, NOT knees. */
  poleX: number;
  poleY: number;
  /** 0 idle → 1 moving: movement strength for secondary motion. */
  poleStrength: number;
  /** 0 walk mechanics → 1 sprint mechanics (the gait blend). */
  runF: number;
  /** cos(angle between travel and facing): 1 forward, -1 backpedal. */
  align: number;
}

export class LegRig {
  private readonly cfg: LegRigConfig;
  private readonly stretch: number;
  private readonly strideScale: number;
  private readonly moveThreshold: number;

  private feet: Array<{ x: number; y: number; lift: number }> | null = null;
  private step: Array<StepState | null>;
  private lastX: number | null = null;
  private lastY: number | null = null;
  private vx = 0;
  private vy = 0;
  private rise: number;
  private wScale = 1;
  /** Touchdowns since birth — diff across updates to hear footsteps. */
  plants = 0;
  /** Body speed (tiles/sec) at the most recent touchdown. */
  plantSpeed = 0;
  /** World position of the foot that just landed (dust spawns here). */
  plantX = 0;
  plantY = 0;
  /** Body velocity at the touchdown — dust kicks back along this. */
  plantVx = 0;
  plantVy = 0;
  /** Signed idle-turn accumulator; a big enough pivot owes a shuffle. */
  private lastDir: number | null = null;
  private turnDebt = 0;
  private turnPending = 0;

  constructor(cfg: LegRigConfig) {
    this.cfg = cfg;
    this.stretch = cfg.stretch ?? 1.15;
    this.strideScale = cfg.strideScale ?? 1.65;
    this.moveThreshold = cfg.moveThreshold ?? 0.35;
    this.step = cfg.legs.map(() => null);
    this.rise = cfg.rise;
  }

  update(bx: number, by: number, dirRaw: number, rawDt: number): LegPose {
    const cfg = this.cfg;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    // Facing slew: turn toward the requested dir at the body's rate.
    let dir = dirRaw;
    if (cfg.turnRate !== undefined && this.lastDir !== null) {
      const dd = Math.atan2(Math.sin(dirRaw - this.lastDir), Math.cos(dirRaw - this.lastDir));
      const maxStep = cfg.turnRate * dt;
      dir = this.lastDir + Math.max(-maxStep, Math.min(maxStep, dd));
      dir = Math.atan2(Math.sin(dir), Math.cos(dir));
    }

    // Any non-finite state resets instead of poisoning every frame.
    if (!Number.isFinite(this.vx + this.vy)) {
      this.vx = 0;
      this.vy = 0;
      this.feet = null;
      this.step = cfg.legs.map(() => null);
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
    const moving = speed > this.moveThreshold;
    const dx = moving ? this.vx / speed : 0;
    const dy = moving ? this.vy / speed : 0;
    const fxDir = Math.cos(dir);
    const fyDir = Math.sin(dir);

    // Fake-3D squash (billboard only): orientation comes from travel
    // while moving and from the aim/facing while standing.
    if (cfg.billboard) {
      const horiz = moving ? Math.abs(this.vx) / speed : Math.abs(Math.cos(dir));
      const wTarget = 1 + 0.05 * (1 - horiz) - 0.09 * horiz;
      this.wScale += (wTarget - this.wScale) * Math.min(1, dt * 9);
    }

    // Run crouch: hips dip with speed, freeing horizontal reach.
    const speedF = Math.min(1, speed / cfg.runSpeed);
    // Gait blend: walk mechanics below ~half tilt, sprint mechanics at
    // full tilt, smoothly interpolated between.
    const rf = Math.min(1, Math.max(0, (speedF - 0.45) / 0.5));
    const runF = rf * rf * (3 - 2 * rf);
    this.rise = cfg.rise * (1 - 0.15 * speedF);
    // Horizontal reach available given the hip height.
    const reach = Math.sqrt(
      Math.max(0.01, (cfg.legLen * this.stretch) ** 2 - this.rise ** 2),
    );
    // Backpedal and strafe take shorter, quicker steps — the stride
    // never flips, it just tightens when travel fights the facing.
    const align = moving ? dx * fxDir + dy * fyDir : 1;
    const alignK = 1 - 0.18 * Math.max(0, -align) - 0.08 * (1 - Math.abs(align));
    // The stride wheel: the planted sweep (how far a foot rides under
    // the body, landing `lead` ahead and launching `trail` behind its
    // home) GROWS with speed. Short amble steps, long sprint strides.
    const sweep = reach * this.strideScale * (0.4 + 0.6 * speedF) * alignK;
    const lead = sweep * 0.45;
    const trail = sweep * 0.55;
    // Swing time: distance-derived at a walk, blending to near-constant
    // at a run (real swing time barely changes with speed — stance time
    // is what shrinks). Grounded rigs cap swing to stance so the gait
    // gate never strands a stretched partner; flight rigs let swing
    // outlast stance — that surplus IS the aerial phase.
    const stance = moving ? sweep / speed : Infinity;
    const swingRun = cfg.swingRef ?? 0.4 * Math.sqrt(cfg.legLen);
    let swing = 0.12;
    if (moving) {
      const swingWalk = stance * 0.82;
      swing = swingWalk + (swingRun - swingWalk) * runF;
      swing = Math.min(swing, cfg.flight ? stance * 2.1 : stance * 0.95);
      swing = Math.min(0.35, Math.max(0.06, swing));
    }
    const idleThresh = cfg.legLen * 0.2;

    // Billboard rigs owe the feet a shuffle after a big enough pivot
    // (their homes barely move with facing). Oriented rigs get pivots
    // free — their homes rotate with the facing and trip the normal
    // step threshold. Signed accumulation so aim jitter cancels.
    if (cfg.billboard && this.lastDir !== null) {
      let dd = dir - this.lastDir;
      dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      if (moving) {
        this.turnDebt = 0;
        this.turnPending = 0;
      } else {
        this.turnDebt += dd;
        if (Math.abs(this.turnDebt) > 0.55) {
          this.turnPending = cfg.legs.length;
          this.turnDebt = 0;
        }
      }
    }
    this.lastDir = dir;

    // Homes for every foot.
    const fxD = fxDir;
    const fyD = fyDir;
    const idleF = 1 - Math.min(1, speed / 1.2);
    const homes: Array<{ x: number; y: number }> = [];
    for (const leg of cfg.legs) {
      if (cfg.billboard) {
        // Screen-fixed hips: lateral spec on the world X axis; idle
        // facing stagger leads the facing-side foot along the aim, and
        // the stance narrows side-on. Homes move when `dir` changes, so
        // turning re-plants through the step logic — a real shuffle.
        const sgn = Math.sign(leg.side) || 1;
        const stanceW = Math.abs(leg.side) * (1 - 0.3 * Math.abs(fxD) * idleF);
        const lead = sgn * Math.sign(fxD || 1);
        const stag = cfg.legLen * 0.3 * Math.abs(fxD) * idleF * lead;
        homes.push({ x: bx + sgn * stanceW + fxD * stag, y: by + fyD * stag * 0.6 });
      } else {
        // Body frame rotated by the facing.
        homes.push({
          x: bx + fxD * leg.fwd - fyD * leg.side,
          y: by + fyD * leg.fwd + fxD * leg.side,
        });
      }
    }

    if (!this.feet) {
      this.feet = homes.map((h) => ({ x: h.x, y: h.y, lift: 0 }));
    }

    // Which groups are airborne right now — the gait gate — plus the
    // least-finished swing, which times the aerial-phase handoff.
    let airGroup = -1;
    let airMixed = false;
    let airCount = 0;
    let airMinT = 1;
    for (let i = 0; i < cfg.legs.length; i++) {
      const st = this.step[i];
      if (!st) continue;
      airCount++;
      airMinT = Math.min(airMinT, st.t);
      const g = cfg.legs[i]!.group;
      if (airGroup === -1) airGroup = g;
      else if (airGroup !== g) airMixed = true;
    }
    // Standing, legs reposition independently (a shuffling animal is
    // not trotting) — gate only on total airborne so pivots resolve in
    // quick natural steps instead of stranding a stretched pair while
    // it waits for its diagonal partner's turn.
    const idleAirCap = Math.max(1, Math.ceil(cfg.legs.length / 2));

    let bob = 0;
    for (let i = 0; i < cfg.legs.length; i++) {
      const leg = cfg.legs[i]!;
      const homeX = homes[i]!.x;
      const homeY = homes[i]!.y;
      const f = this.feet[i]!;

      const st = this.step[i];
      if (st) {
        st.t += dt / st.dur;
        const t = Math.min(1, st.t);
        if (t < 1 && moving) {
          // Mid-swing retargeting: the airborne foot keeps aiming at
          // where its home will be at touchdown. Real swings are long
          // enough that a hard turn mid-stride would otherwise plant a
          // stale, wrong-way foot a tile off the new line of travel.
          // At steady speed this is a no-op (the target already sits at
          // the prediction); commitment near touchdown comes from the
          // ease curve, which has spent its travel by then.
          const ix = homeX + this.vx * st.dur * (1 - t) + dx * lead;
          const iy = homeY + this.vy * st.dur * (1 - t) + dy * lead;
          const kR = Math.min(1, dt * 20);
          st.tx += (ix - st.tx) * kR;
          st.ty += (iy - st.ty) * kR;
        }
        const e = t * t * (3 - 2 * t); // smoothstep
        f.x = st.fx + (st.tx - st.fx) * e;
        f.y = st.fy + (st.ty - st.fy) * e;
        f.lift = Math.sin(t * Math.PI) * cfg.liftAmp * (0.55 + 0.95 * speedF + 0.4 * runF);
        if (t >= 1) {
          this.step[i] = null;
          f.lift = 0;
          // A touchdown — the audible moment of a gait. Consumers
          // (footstep audio) diff `plants` across updates; `plantSpeed`
          // carries the gait vigor so idle shuffles land near-silent.
          this.plants++;
          this.plantSpeed = speed;
          this.plantX = f.x;
          this.plantY = f.y;
          this.plantVx = this.vx;
          this.plantVy = this.vy;
        }
      } else {
        f.lift = 0;
        const behind = Math.hypot(f.x - homeX, f.y - homeY);
        // Moving: the group gate — step only while no OTHER group is
        // airborne — EXCEPT that a flight rig at speed may launch while
        // its counterpart is still descending (past mid-swing): duty
        // drops below 0.5 and the gait leaves the ground for a beat.
        // Idle: independent shuffle steps under the air cap.
        const flightOK =
          cfg.flight === true && runF > 0.35 && airMinT > 0.45 && airCount < cfg.legs.length;
        const groupClear = moving
          ? (!airMixed && (airGroup === -1 || airGroup === leg.group)) || flightOK
          : airCount < idleAirCap;
        // Eager threshold when a groupmate is already swinging — pairs
        // launch together, so a trot stays a trot.
        const mate = airGroup === leg.group;
        const dueDist = moving
          ? trail * (mate ? 0.6 : 1)
          : idleThresh * (mate ? 0.6 : 1);
        const turnStep = !moving && this.turnPending > 0;
        // Standing, an overstretched leg is urgent but still respects
        // the air cap — otherwise a fast pivot launches every leg at
        // once and the animal HOPS. Bounding falls to the drag below.
        const idleUrgent = !moving && behind > reach * 0.95;
        const due = (behind > dueDist || turnStep || idleUrgent) && groupClear;
        // Moving emergency bound: past reach the foot snaps forward
        // NOW, whatever the group state — never noodle-stretch.
        const emergency = moving && behind > reach * 1.12;
        if (due || emergency) {
          if (turnStep) this.turnPending--;
          // Land `lead` ahead of where the home will be when the swing
          // completes — the strike point of the stride wheel.
          this.step[i] = {
            fx: f.x,
            fy: f.y,
            tx: homeX + this.vx * swing + dx * lead,
            ty: homeY + this.vy * swing + dy * lead,
            t: 0,
            dur: swing,
          };
          if (airGroup === -1) airGroup = leg.group;
          airCount++;
          airMinT = 0; // one launch per frame — never a same-frame hop
        } else if (!moving && behind > reach * 0.7) {
          // Weight-shift drag: a planted foot that is gated from
          // stepping while the body pivots above it TWISTS toward its
          // home instead of winding up to full stretch — exactly what
          // a real animal's grounded feet do in a turn on the spot.
          // Zero below 0.8·reach, so a settled stance stays rock-solid.
          const k = Math.min(1, dt * 30 * (behind / reach - 0.7));
          f.x += (homeX - f.x) * k;
          f.y += (homeY - f.y) * k;
        }
      }

      // Teleport / reconciliation-snap guard — beyond ~2× reach there is
      // no graceful step; snap rather than stretch.
      if ((f.x - homeX) ** 2 + (f.y - homeY) ** 2 > (cfg.legLen * 2.2) ** 2) {
        f.x = homeX;
        f.y = homeY;
        this.step[i] = null;
        f.lift = 0;
      }
      bob += f.lift;
    }

    return {
      feet: this.feet,
      dir,
      bob,
      rise: this.rise,
      wScale: cfg.billboard ? this.wScale : 1,
      poleX: dx,
      poleY: dy,
      // Full secondary motion (arm swing) by an easy walking pace.
      poleStrength: Math.min(1, speed / 1.2),
      runF,
      align,
    };
  }
}

/**
 * Which side of the root→target chord a joint bends toward, with
 * hysteresis. `cx, cy` is one unit perpendicular of the chord; the
 * preference vector is the anatomical pole (normalized internally).
 * A borderline score never overturns the standing choice — this is
 * what stops a knee snapping 180° when a turning body carries the
 * pole past perpendicular to a planted leg's chord. Returns ±1.
 */
export function chooseLimbSign(
  cx: number,
  cy: number,
  prefX: number,
  prefY: number,
  memory: number,
): number {
  const m = Math.hypot(prefX, prefY) || 1;
  const score = (cx * prefX + cy * prefY) / m;
  const target = score >= 0 ? 1 : -1;
  if (memory !== 0 && target !== memory && Math.abs(score) < 0.35) return memory;
  return target;
}

/**
 * Pure two-bone limb solve, the one IK in the game: clamps the target
 * into reach and places the joint on whichever side of the root→target
 * line the preference vector points. Legs, arms, whatever bends.
 */
export function solveLimb(
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  L: number,
  stretch: number,
  prefX: number,
  prefY: number,
): { ex: number; ey: number; kx: number; ky: number } {
  let dx = hx - sx;
  let dy = hy - sy;
  let d = Math.hypot(dx, dy) || 1e-4;
  const dMax = L * 2 * stretch;
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
    ex: sx + dx,
    ey: sy + dy,
    kx: sx + dx / 2 + cx * sign * bend,
    ky: sy + dy / 2 + cy * sign * bend,
  };
}
