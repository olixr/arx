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
 * fist→tip (π/2 = straight down). `side` is the signed FACING WEIGHT —
 * sign = which way the body faces, magnitude = how profile the facing
 * is — NEVER the side the fist hangs on (see bladeCarriage's docblock;
 * this header used to say the opposite, and that stale line was the
 * seed of the three-meanings-of-`side` drift the arms-v3 audit mapped
 * across carriage/wield/sheath). Mirror symmetry is a law, not a
 * convention, and the tests pin it. Offsets are in units of the rig
 * scale `s`; dx is pre-squash (the caller multiplies by wScale like
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
export declare function bladeCarriage(grip: Grip, side: number, runK: number, 
/** 1 = knife-class (range ≤ 1.5): rides tighter and steeper than a sword. */
compact?: number): BladeCarriage;
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
export declare const STRIKE_REST_ARM = 0.5;
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
export declare function strikePhases(grip: Grip): StrikePhases;
/**
 * One melee strike, every channel, as a pure function of the beat
 * clock. Phases: ease into the coil, HOLD cocked, snap the cut with a
 * hair of overshoot, hold the extension, recover to neutral. The blade
 * channel runs the wrist law inside the same clock — cocked against
 * the sweep through the coil, whipping to a lead at impact, settling
 * straight — around the rogue grip's constant π reversal.
 */
export declare function strikeFrame(grip: Grip, stage: 0 | 1, t: number): StrikeFrame;
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
export declare function strikeTrail(grip: Grip, stage: 0 | 1, t: number): StrikeTrail | null;
/** Main-beat t where the off blade's echo beat begins. */
export declare const ECHO_START = 0.34;
/** The echo always answers on the opposite plane (the finisher's
 * straight drive is answered by the rising stage-1 cut). */
export declare function echoStage(mainStage: 0 | 1 | 2): 0 | 1;
/**
 * The off blade's echo cut, in MAIN-beat time. Null until the echo
 * begins; then the full strike vocabulary (the off fist's own grip)
 * compressed into the back of the beat. Because the echo reuses the
 * strike specs, every readability law rides along for free — and its
 * strike window lands entirely after the main impact (test-pinned).
 */
export declare function echoFrame(grip: Grip, mainStage: 0 | 1 | 2, t: number): StrikeFrame | null;
/** The echo's slash trail, in main-beat time. */
export declare function echoTrail(grip: Grip, mainStage: 0 | 1 | 2, t: number): StrikeTrail | null;
/**
 * The finisher beat both schools share: coil, a POISED hold (the big
 * telegraphed kill — longer than a combo hold), the drive, a BURIED
 * hold with the blade in the mark, recover. One clock for the thrust,
 * the icepick, and the torso lean, so the whole body lands together.
 */
export declare const FINISHER_PHASES: {
    coil: number;
    hold: number;
    drive: number;
    buried: number;
};
/**
 * THE LUNGE THRUST (standard finisher): haul the blade to the hip —
 * tip aimed at the mark the whole coil, the menace read — then RAM it
 * straight down the aim to full extension and hold it buried. Units:
 * `r` = radial reach along the aim (rig multiplies by s), `lift` =
 * vertical hand offset.
 */
export declare function thrustPath(t: number): {
    r: number;
    lift: number;
};
/**
 * THE ICEPICK PLUNGE (rogue finisher): a reversed tip cannot lead a
 * forward thrust — the kill is the overhand stab. The fist coils high
 * over the shoulder, POISES there (the raised-dagger silhouette, the
 * clearest telegraph in the game), then drives down the aim line to
 * gut height and hangs buried before easing out. Same shared beat.
 */
export declare function icepickPath(t: number): {
    r: number;
    lift: number;
};
/**
 * The finisher's torso lean — one choreography for both schools, on
 * the shared beat: coil away, hold loaded, tip hard into the drive,
 * press through the buried hold, ease home.
 */
export declare function finisherLean(t: number): number;
/** One flourish cycle: how often a resting fist plays with its blade. */
export declare const FLOURISH_PERIOD_MS = 9200;
/** How long the flourish itself lasts inside each cycle. */
export declare const FLOURISH_MS = 820;
/** Phase offset handed to the off fist so the two never twirl in sync. */
export declare const FLOURISH_OFF_PHASE_MS: number;
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
export declare function idleFlourish(nowMs: number, phaseMs: number, grip: Grip, side: number): Flourish | null;
//# sourceMappingURL=carriage.d.ts.map