/**
 * Blade carriage — the grip vocabulary.
 *
 * A grip belongs to a HAND, not to a weapon: the main fist and the off
 * fist each resolve their own carriage through these pure functions, so
 * a dual wielder can run a standard main blade over a reversed off
 * dagger and both read true from every facing. Keeping the vocabulary
 * pure (no ctx, no rig state) is what lets both hands — and the tests —
 * share one law source.
 *
 * Frame conventions: screen radians with +y DOWN; `angle` points
 * fist→tip (π/2 = straight down). `side` is the screen side the hand
 * hangs on (+1 right of the body, −1 left) — mirror symmetry is a law,
 * not a convention, and the tests pin it. Offsets are in units of the
 * rig scale `s`; dx is pre-squash (the caller multiplies by wScale like
 * every other x offset).
 *
 * The standard-grip idle numbers are the user-tuned rest carriage
 * (512292f + 6b413e4) — change them only against fresh screenshots.
 * The rogue run rake is capped well short of horizontal: past ~1.1 rad
 * of reverse rake the blade reads as skewering the belly (the 1.15 rad
 * verdict), so the run stance tightens instead of flattening. And the
 * rogue fist NEVER rides up to "carry" the blade — the armpit verdict:
 * a raised fist folds the elbow into a cramped bend that pivots
 * jittery, and the assassin read comes from hanging LOW and coiled.
 */

export type Grip = 'normal' | 'rogue';

export interface BladeCarriage {
  /** Hand offset from the hanging rest anchor, units of s (x pre-squash). */
  dx: number;
  dy: number;
  /** Blade angle, fist→tip, screen radians. */
  angle: number;
  /** Mirror the blade across its long axis — a reversed fist turns the edge out. */
  flip: boolean;
}

/** Smoothstep — the gait blend every carriage transition rides. */
function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

/**
 * Where one fist carries a blade at rest, blended across the gait.
 * runK 0 = standing idle, 1 = full sprint; every returned channel is
 * continuous in runK so the stance never pops as the gait changes.
 *
 * `side` is the FACING WEIGHT — sign = which way is forward, for BOTH
 * hands; magnitude = how profile the facing is (1 side-on, shrinking
 * toward front/back, floored ~0.2 by the caller — front-on the grip
 * reads through the edge flip and lean sign, and a bigger floor
 * splayed blades at the camera). Every channel is linear in side, so a fractional weight
 * relaxes the rake toward a near-vertical hang — there is no screen-
 * forward when the travel runs straight at (or away from) the camera,
 * and a full-profile rake there held swords sideways and fists high.
 * It is NOT the side the fist hangs on: the off fist hangs opposite
 * the facing, and feeding it its hanging side mirrors every stance
 * backward (standard read as rogue and vice versa — the user-caught
 * flip-flop). The caller mirrors `dx` itself for the trailing hand.
 */
export function bladeCarriage(
  grip: Grip,
  side: number,
  runK: number,
  /** 1 = knife-class (range ≤ 1.5): rides tighter and steeper than a sword. */
  compact = 0,
): BladeCarriage {
  const lift = smooth(runK);
  const tight = 1 - 0.28 * compact;
  // THE HOLD-MAINTENANCE LAW (user verdict, twice-earned): a fist holds
  // a hilt exactly one of two ways — blade-down past the thumb
  // (standard) or blade-down past the pinky, reversed (rogue) — and
  // RUNNING NEVER CHANGES THE HOLD. The tip stays BELOW the hand at
  // every gait; the run only levels the blade toward (never past)
  // horizontal as the arm pumps. Any sprint carry that sweeps the tip
  // above the fist reads as stabbing yourself in the chest. The
  // approved idle angles are the anchors; the run is the same hold,
  // livelier.
  if (grip === 'rogue') {
    // THE ASSASSIN CARRY (redone after the armpit verdict): low,
    // quiet, coiled. The fist hangs at the SAME relaxed height as any
    // resting hand — the old carriage rode the fist up toward the
    // armpit "carrying" the blade, which folded the elbow into a
    // cramped near-degenerate bend where every small hand move became
    // a big forearm pivot (the goofy jittery-wrist read). The reversed
    // blade lies along the low-line, tip trailing down-back past the
    // calf — one flick from an icepick stab. The run only deepens the
    // trail (a blades-back sprint) while the hand stays low and
    // presses a touch tighter to the body: a knife-fighter at speed.
    return {
      dx: side * (0.05 - 0.01 * lift) * tight,
      dy: 0.01 - 0.03 * lift,
      angle: Math.PI / 2 + side * (0.78 + 0.05 * compact + 0.28 * lift),
      flip: true,
    };
  }
  // Standard: the blade angles down-forward off the leg so the guard
  // and taper read as a sword; on the run it levels toward (staying
  // below) horizontal-forward — a sword carried low and ready. A knife
  // hangs steeper and tighter: a short blade at a sword's rake reads
  // as pointing at nothing.
  return {
    dx: side * (0.05 + 0.04 * lift) * tight,
    dy: -0.04 * lift,
    angle: Math.PI / 2 - side * (0.32 - 0.07 * compact + 0.6 * lift),
    flip: false,
  };
}

// ---- The strike vocabulary: grip-aware melee attacks. ----
//
// THE TWO SCHOOLS (the melee rework): a grip is a fighting style, not
// just a carriage. The STANDARD grip is the swordsman — cuts thrown
// from the shoulder on long committed arcs THROUGH the aim, the blade
// an extension of the arm: a high diagonal cleave, a rising backhand
// return, a lunging thrust. The ROGUE grip is the assassin — the
// reversed blade is locked to the forearm and every cut is elbow-led
// and CLOSE: a cross rake that PULLS in across the body (the reach
// collapses through the cut), a backslash that flings back out, an
// icepick plunge. No stage shares a silhouette with its neighbor.
//
// THE READABILITY LAWS every strike obeys (all test-pinned):
// - ANTICIPATION: the windup eases into a coil and HOLDS there for a
//   visible beat before the cut — a cocked pose the eye can register,
//   coiled OPPOSITE the coming sweep (arm angle AND lift both counter).
// - SNAP: the strike phase itself is FAST (≤ 0.15 of the beat) and
//   lands in a held EXTENSION — overshoot settling onto the impact
//   pose, held long enough to read at a distance. Slow-in, fast-out,
//   frozen landing: that shape IS "a cut", everything else is flail.
// - PLANE: consecutive stages alternate cutting planes (high→low then
//   low→high; pull-in then fling-out) and directions, so a combo
//   string never repeats a silhouette.
// - GRIP TRUTH: the rogue blade stays within a whisker of its π
//   reversal through every beat — the grip never lies mid-attack.
// - BLEND SAFETY: every channel starts and ends neutral, so the stage
//   blends cleanly out of and back into the carriage.

export interface StrikeFrame {
  /** Arm-angle offset from the aim (radians). STRIKE_REST_ARM at both ends. */
  arm: number;
  /** Blade angle relative to the arm ray (the rogue base π included). */
  blade: number;
  /** Reach multiplier of the base combat reach (1 at both ends). */
  reach: number;
  /** Vertical hand offset, units of s (negative = raised). 0 at both ends. */
  lift: number;
  /** Torso lean, signed along the cut direction. 0 at both ends. */
  lean: number;
}

/** The combat-guard arm offset every strike starts from and lands on. */
export const STRIKE_REST_ARM = 0.5;

export interface StrikePhases {
  /** t where the windup arrives at the coil. */
  coil: number;
  /** t where the cocked hold ends and the cut is loosed. */
  hold: number;
  /** t where the cut lands — the impact frame. */
  impact: number;
  /** t where the held extension releases into the recover. */
  ext: number;
}

/**
 * The beat structure per grip. The assassin's whole beat runs earlier
 * and tighter — shorter hold, earlier impact, shorter extension — but
 * both grips keep every phase long enough to READ: the hold and the
 * extension are the two frames a bystander actually sees.
 */
export function strikePhases(grip: Grip): StrikePhases {
  return grip === 'rogue'
    ? { coil: 0.2, hold: 0.27, impact: 0.37, ext: 0.54 }
    : { coil: 0.24, hold: 0.3, impact: 0.44, ext: 0.6 };
}

interface StrikeSpec {
  coilArm: number;
  impactArm: number;
  coilLift: number;
  impactLift: number;
  coilReach: number;
  impactReach: number;
  /** Wrist cock against the sweep at the coil. */
  cock: number;
  /** Wrist lead past the arm at impact. */
  lead: number;
  /** Peak torso lean into the cut. */
  lean: number;
}

/**
 * The choreography table. Standard: the CLEAVE (stage 0) coils the
 * fist high over the shoulder (raised, pulled in) and cuts down-
 * forward to a long low extension — an angular sweep AND a vertical
 * drop, so the diagonal reads from every facing. The RETURN (stage 1)
 * runs the opposite plane: coiled low by the hip, carving back up
 * across the body. Rogue: the CROSS RAKE (stage 0) reaches the fist
 * out high and PULLS it in across the body — the collapsing reach is
 * the "hand pull" signature — and the BACKSLASH (stage 1) flings back
 * out from the tucked hip on a lower line. Rogue arcs run ~60% of the
 * standard span: an assassin slices close, never windmills.
 */
const STRIKE_SPECS: Record<Grip, [StrikeSpec, StrikeSpec]> = {
  normal: [
    // The cleave: over-the-shoulder coil, diagonal cut down-forward.
    {
      coilArm: -1.35, impactArm: 1.35,
      coilLift: -0.3, impactLift: 0.12,
      coilReach: 0.55, impactReach: 1.45,
      cock: 0.85, lead: 0.5, lean: 0.14,
    },
    // The rising return: low coil at the hip, backhand carving up.
    {
      coilArm: 1.35, impactArm: -1.25,
      coilLift: 0.14, impactLift: -0.18,
      coilReach: 0.6, impactReach: 1.3,
      cock: 0.85, lead: 0.5, lean: 0.14,
    },
  ],
  rogue: [
    // The cross rake: reach out at the shoulder line, PULL in across
    // the body (a raised coil rode the fist in front of the face).
    {
      coilArm: -0.95, impactArm: 0.85,
      coilLift: -0.14, impactLift: 0.1,
      coilReach: 1.0, impactReach: 0.55,
      cock: 0.4, lead: 0.3, lean: 0.1,
    },
    // The backslash: fling back out from the tucked hip, lower line.
    {
      coilArm: 1.05, impactArm: -0.75,
      coilLift: 0.1, impactLift: -0.04,
      coilReach: 0.5, impactReach: 1.05,
      cock: 0.4, lead: 0.3, lean: 0.1,
    },
  ],
};

function easeOut(u: number): number {
  const v = Math.max(0, Math.min(1, u));
  return 1 - (1 - v) * (1 - v);
}

/** Overshoot past the impact pose the extension settles back from. */
const IMPACT_OVERSHOOT = 0.09;

/**
 * One melee strike, every channel, as a pure function of the beat
 * clock. Phases: ease into the coil, HOLD cocked, snap the cut with a
 * hair of overshoot, hold the extension, recover to neutral. The blade
 * channel runs the wrist law inside the same clock — cocked against
 * the sweep through the coil, whipping to a lead at impact, settling
 * straight — around the rogue grip's constant π reversal.
 */
export function strikeFrame(grip: Grip, stage: 0 | 1, t: number): StrikeFrame {
  const K = STRIKE_SPECS[grip][stage];
  const P = strikePhases(grip);
  const base = grip === 'rogue' ? Math.PI : 0;
  const sgn = Math.sign(K.impactArm - K.coilArm);
  const ov = sgn * IMPACT_OVERSHOOT;
  if (t < P.coil) {
    // Windup: ease in AND out to the coil — a slow gather that makes
    // the snap read three times faster than anything before it.
    const e = smooth(t / P.coil);
    return {
      arm: STRIKE_REST_ARM + (K.coilArm - STRIKE_REST_ARM) * e,
      blade: base - sgn * K.cock * e,
      reach: 1 + (K.coilReach - 1) * e,
      lift: K.coilLift * e,
      lean: -sgn * K.lean * 0.6 * e,
    };
  }
  if (t < P.hold) {
    // The cocked hold — the anticipation frame the eye registers.
    return {
      arm: K.coilArm,
      blade: base - sgn * K.cock,
      reach: K.coilReach,
      lift: K.coilLift,
      lean: -sgn * K.lean * 0.6,
    };
  }
  if (t < P.impact) {
    // The cut: the whole arc crossed in one snap, wrist whipping from
    // its cocked lag through to a lead.
    const e = smooth((t - P.hold) / (P.impact - P.hold));
    return {
      arm: K.coilArm + (K.impactArm + ov - K.coilArm) * e,
      blade: base - sgn * K.cock + sgn * (K.cock + K.lead) * e,
      reach: K.coilReach + (K.impactReach - K.coilReach) * e,
      lift: K.coilLift + (K.impactLift - K.coilLift) * e,
      lean: -sgn * K.lean * 0.6 + sgn * K.lean * 1.6 * e,
    };
  }
  if (t < P.ext) {
    // The held extension: overshoot settles onto the impact pose and
    // STAYS — the landed cut, readable at a distance.
    const e = smooth((t - P.impact) / (P.ext - P.impact));
    return {
      arm: K.impactArm + ov * (1 - e),
      blade: base + sgn * K.lead * (1 - 0.35 * e),
      reach: K.impactReach,
      lift: K.impactLift,
      lean: sgn * K.lean * (1 - 0.25 * e),
    };
  }
  // Recover: ease everything home to neutral.
  const e = smooth((t - P.ext) / (1 - P.ext));
  return {
    arm: K.impactArm + (STRIKE_REST_ARM - K.impactArm) * e,
    blade: base + sgn * K.lead * 0.65 * (1 - e),
    reach: K.impactReach + (1 - K.impactReach) * e,
    lift: K.impactLift * (1 - e),
    lean: sgn * K.lean * 0.75 * (1 - e),
  };
}

export interface StrikeTrail {
  /** Arm angle (offset from aim) the crescent starts from — the coil. */
  from: number;
  /** Arm angle the crescent has swept to — the current arm. */
  to: number;
  /** 0..1 fade — full through the cut, dying through the extension. */
  alpha: number;
  /** Vertical offset for the crescent's center, units of s. */
  lift: number;
}

/**
 * The slash trail as a pure channel: alive from the moment the cut is
 * loosed, chasing the blade to the impact pose, fading through the
 * held extension. The lift centers the crescent on the cut's plane, so
 * a high cleave rings high and a rising return rings low.
 */
export function strikeTrail(grip: Grip, stage: 0 | 1, t: number): StrikeTrail | null {
  const P = strikePhases(grip);
  if (t < P.hold || t > P.ext) return null;
  const K = STRIKE_SPECS[grip][stage];
  const f = strikeFrame(grip, stage, t);
  const alpha = t <= P.impact ? 1 : 1 - smooth((t - P.impact) / (P.ext - P.impact));
  return {
    from: K.coilArm,
    to: f.arm,
    alpha,
    lift: (K.coilLift + K.impactLift) / 2,
  };
}

// ------------------------------------------------------------- echo
//
// THE ONE-TWO LAW (dual wield): the off blade NEVER moves during the
// main blade's strike phase — one blade owns the eye at any instant.
// The echo coils while the main blade cuts, and cuts while the main
// recovers, always on the OPPOSITE plane (stage 0 answers with the
// stage-1 shape and vice versa) so the pair reads as a scissor — a
// deliberate one-two, not two arms flailing in parallel.

/** Main-beat t where the off blade's echo beat begins. */
export const ECHO_START = 0.34;

/** The echo always answers on the opposite plane (the finisher's
 * straight drive is answered by the rising stage-1 cut). */
export function echoStage(mainStage: 0 | 1 | 2): 0 | 1 {
  return mainStage === 1 ? 0 : 1;
}

/**
 * The off blade's echo cut, in MAIN-beat time. Null until the echo
 * begins; then the full strike vocabulary (the off fist's own grip)
 * compressed into the back of the beat. Because the echo reuses the
 * strike specs, every readability law rides along for free — and its
 * strike window lands entirely after the main impact (test-pinned).
 */
export function echoFrame(grip: Grip, mainStage: 0 | 1 | 2, t: number): StrikeFrame | null {
  if (t <= ECHO_START) return null;
  const u = Math.min(1, (t - ECHO_START) / (1 - ECHO_START));
  return strikeFrame(grip, echoStage(mainStage), u);
}

/** The echo's slash trail, in main-beat time. */
export function echoTrail(grip: Grip, mainStage: 0 | 1 | 2, t: number): StrikeTrail | null {
  if (t <= ECHO_START) return null;
  const u = Math.min(1, (t - ECHO_START) / (1 - ECHO_START));
  return strikeTrail(grip, echoStage(mainStage), u);
}

// -------------------------------------------------------- finishers

/**
 * The finisher beat both schools share: coil, a POISED hold (the big
 * telegraphed kill — longer than a combo hold), the drive, a BURIED
 * hold with the blade in the mark, recover. One clock for the thrust,
 * the icepick, and the torso lean, so the whole body lands together.
 */
export const FINISHER_PHASES = { coil: 0.26, hold: 0.36, drive: 0.5, buried: 0.68 };

/**
 * THE LUNGE THRUST (standard finisher): haul the blade to the hip —
 * tip aimed at the mark the whole coil, the menace read — then RAM it
 * straight down the aim to full extension and hold it buried. Units:
 * `r` = radial reach along the aim (rig multiplies by s), `lift` =
 * vertical hand offset.
 */
export function thrustPath(t: number): { r: number; lift: number } {
  const P = FINISHER_PHASES;
  if (t < P.coil) {
    // Haul to the hip, blade level, tip on the mark.
    const e = easeOut(t / P.coil);
    return { r: 0.25 - 0.21 * e, lift: 0.02 * e };
  }
  if (t < P.hold) {
    // Poised at the hip — the loaded spring.
    return { r: 0.04, lift: 0.02 };
  }
  if (t < P.drive) {
    // The ram: hips, shoulder and arm down the aim line in one snap.
    const e = smooth((t - P.hold) / (P.drive - P.hold));
    return { r: 0.04 + 0.54 * e, lift: 0.02 - 0.04 * e };
  }
  if (t < P.buried) {
    // Buried at full extension — held, the kill frame.
    const e = (t - P.drive) / (P.buried - P.drive);
    return { r: 0.58 - 0.03 * e, lift: -0.02 };
  }
  const e = smooth((t - P.buried) / (1 - P.buried));
  return { r: 0.55 - 0.3 * e, lift: -0.02 + 0.02 * e };
}

/**
 * THE ICEPICK PLUNGE (rogue finisher): a reversed tip cannot lead a
 * forward thrust — the kill is the overhand stab. The fist coils high
 * over the shoulder, POISES there (the raised-dagger silhouette, the
 * clearest telegraph in the game), then drives down the aim line to
 * gut height and hangs buried before easing out. Same shared beat.
 */
export function icepickPath(t: number): { r: number; lift: number } {
  const P = FINISHER_PHASES;
  if (t < P.coil) {
    // Coil: the fist climbs up-back over the shoulder.
    const e = easeOut(t / P.coil);
    return { r: 0.16 - 0.11 * e, lift: -0.36 * e };
  }
  if (t < P.hold) {
    // Poised: raised dagger, a breath of gathering height.
    const e = (t - P.coil) / (P.hold - P.coil);
    return { r: 0.05, lift: -0.36 - 0.02 * e };
  }
  if (t < P.drive) {
    // The plunge: straight down the aim to the mark.
    const e = smooth((t - P.hold) / (P.drive - P.hold));
    return { r: 0.05 + 0.41 * e, lift: -0.38 + 0.52 * e };
  }
  if (t < P.buried) {
    // Buried: the blade in the mark, weight pressing on it.
    const e = (t - P.drive) / (P.buried - P.drive);
    return { r: 0.46 - 0.02 * e, lift: 0.14 - 0.02 * e };
  }
  const e = smooth((t - P.buried) / (1 - P.buried));
  return { r: 0.44 - 0.16 * e, lift: 0.12 - 0.14 * e };
}

/**
 * The finisher's torso lean — one choreography for both schools, on
 * the shared beat: coil away, hold loaded, tip hard into the drive,
 * press through the buried hold, ease home.
 */
export function finisherLean(t: number): number {
  const P = FINISHER_PHASES;
  if (t < P.coil) return -0.09 * easeOut(t / P.coil);
  if (t < P.hold) return -0.09;
  if (t < P.drive) return -0.09 + 0.29 * smooth((t - P.hold) / (P.drive - P.hold));
  if (t < P.buried) return 0.2 - 0.04 * ((t - P.drive) / (P.buried - P.drive));
  return 0.16 * (1 - smooth((t - P.buried) / (1 - P.buried)));
}

/** One flourish cycle: how often a resting fist plays with its blade. */
export const FLOURISH_PERIOD_MS = 9200;
/** How long the flourish itself lasts inside each cycle. */
export const FLOURISH_MS = 820;
/** Phase offset handed to the off fist so the two never twirl in sync. */
export const FLOURISH_OFF_PHASE_MS = FLOURISH_PERIOD_MS / 2;

export interface Flourish {
  /** Added to the blade angle (radians). Returns to ≡0 at the window end. */
  spin: number;
  /** Upward hand bounce, units of s. Zero at both window ends. */
  lift: number;
}

/**
 * The idle flourish: every few seconds a fully-at-rest fist plays with
 * its blade — a small, grounded gesture. THE NO-FLIP LAW (user verdict):
 * no flourish ever revolves the blade — the old full 2π rogue wrist
 * spin read as goofily flipping the sword and is gone for good. A
 * flourish tips the blade out a hand's-width and settles it back,
 * nothing more. Deterministic in nowMs (the twinkle-window pattern:
 * remotes and replays agree), null outside the window, and both
 * channels land back on zero at the window edge so blending in and out
 * can never pop.
 */
export function idleFlourish(
  nowMs: number,
  phaseMs: number,
  grip: Grip,
  side: number,
): Flourish | null {
  const t = (nowMs + phaseMs) % FLOURISH_PERIOD_MS;
  if (t < 0 || t >= FLOURISH_MS) return null;
  const u = t / FLOURISH_MS;
  if (grip === 'rogue') {
    // A restrained edge-check: the reversed blade tips out and settles
    // back, the fist barely rising — a knife-fighter's tic, not a show.
    return { spin: side * Math.sin(u * Math.PI) * 0.55, lift: Math.sin(u * Math.PI) * 0.03 };
  }
  // Standard: a slow tip-raise toward the forward horizon and back.
  return { spin: -side * Math.sin(u * Math.PI) * 0.5, lift: Math.sin(u * Math.PI) * 0.015 };
}
