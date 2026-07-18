import type { InputFrame } from './input.js';
import { InputButton, hasButton } from './input.js';

/**
 * Charged bow draw + melee combo rules, shared verbatim by server
 * (authoritative) and client (prediction/animation) so both sides always
 * agree on charge, movement slow-down, and combo stage.
 */

/** Ticks of holding Attack to reach a full draw (20 Hz). */
export const DRAW_FULL_TICKS = 14; // 0.7s
/** Below this the release is a SNAP SHOT, not a charged arrow. */
export const DRAW_MIN_TICKS = 3;
/** Movement speed multiplier while drawing a bow. */
export const DRAW_MOVE_FACTOR = 0.55;

// ---------------------------------------------------------- snap shots

/**
 * Tap-fire: releasing under DRAW_MIN_TICKS looses an instant weak
 * arrow from the hip. Tap-tap-tap IS rapid fire — mobile, scrappy,
 * ~70% of a charge cycle's damage but you never stop moving.
 */
export const SNAP_RECOVERY_TICKS = 6; // 0.3 s between snaps
/** Snap shots in the rhythm chain; the third fires a two-arrow fan. */
export const SNAP_CHAIN = 3;
/** Grace after recovery to continue the snap rhythm. */
export const SNAP_GRACE_TICKS = 10;

export function snapShot(
  maxHit: number,
  speed: number,
  range: number,
): { maxHit: number; speed: number; range: number } {
  return {
    maxHit: Math.max(1, Math.round(maxHit * 0.45)),
    speed: speed * 0.85,
    range: range * 0.55,
  };
}

/** Next snap-chain stage; the fan stage always resets. */
export function nextSnapStage(prevStage: number, withinGrace: boolean): number {
  if (!withinGrace) return 0;
  return (prevStage + 1) % SNAP_CHAIN;
}

// ---------------------------------------------------------- wand rhythm

/**
 * Staff basics are a 1-2-HEAVY rhythm: two quick bolts, then a slow
 * fat orb that splashes and shoves. Same chain law as the melee combo.
 */
export const HEAVY_BOLT_MULT = 2.0;
export const HEAVY_BOLT_RECOVERY_MULT = 1.8;
export const HEAVY_BOLT_SPLASH = 1.2; // tiles around the impact
export const HEAVY_BOLT_KNOCKBACK = 1.6;

/** 0..1 charge from ticks spent drawing. */
export function drawCharge(ticks: number): number {
  return Math.max(0, Math.min(1, ticks / DRAW_FULL_TICKS));
}

/**
 * Charge scaling: a snap shot is weak and slow, a full draw hits hard,
 * flies fast, and carries the bow's whole range. Damage never scales to
 * zero — a loosed arrow always threatens.
 */
export function chargedShot(
  charge: number,
  maxHit: number,
  speed: number,
  range: number,
): { maxHit: number; speed: number; range: number } {
  const c = Math.max(0, Math.min(1, charge));
  return {
    maxHit: Math.max(1, Math.round(maxHit * (0.4 + 0.6 * c))),
    speed: speed * (0.7 + 0.5 * c),
    range: range * (0.55 + 0.45 * c),
  };
}

/**
 * True when this input frame slows movement: drawing a bow is a braced,
 * deliberate stance. Purely a function of the frame + equipped style so
 * client prediction and the server derive it identically.
 */
export function isDrawSlowed(frame: Pick<InputFrame, 'buttons'>, style: string | null): boolean {
  return style === 'archery' && hasButton(frame.buttons, InputButton.Attack);
}

// ---------------------------------------------------------------- combo

/** Number of stages in the melee chain (last one is the finisher). */
export const COMBO_STAGES = 3;
/** Ticks after an attack's cooldown ends during which the chain holds. */
export const COMBO_GRACE_TICKS = 14; // 0.7s to continue the string
/** The finisher hits harder, shoves harder, and needs a longer recovery. */
export const FINISHER_DAMAGE_MULT = 1.5;
export const FINISHER_KNOCKBACK_MULT = 1.8;
export const FINISHER_RECOVERY_MULT = 1.6;

/**
 * Next combo stage given the stage of the previous swing and whether the
 * new swing landed inside the grace window. The finisher always resets.
 */
export function nextComboStage(prevStage: number, withinGrace: boolean): number {
  if (!withinGrace) return 0;
  return (prevStage + 1) % COMBO_STAGES;
}
