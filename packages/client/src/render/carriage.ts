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
 * toward front/back, floored ~0.35 by the caller so grips stay
 * readable). Every channel is linear in side, so a fractional weight
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
 * its blade — a rogue fist rolls a full wrist spin, a standard fist
 * raises the tip as if checking the edge. Deterministic in nowMs (the
 * twinkle-window pattern: remotes and replays agree), null outside the
 * window, and both channels land back on zero (mod 2π) at the window
 * edge so blending in and out can never pop.
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
    // A full reverse-grip wrist spin, eased so it snaps through the
    // middle and lands soft — 2π total, invisible to the base angle.
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    return { spin: side * 2 * Math.PI * e, lift: Math.sin(u * Math.PI) * 0.03 };
  }
  // Standard: a slow tip-raise toward the forward horizon and back.
  return { spin: -side * Math.sin(u * Math.PI) * 0.5, lift: Math.sin(u * Math.PI) * 0.015 };
}
