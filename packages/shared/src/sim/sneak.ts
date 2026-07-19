/**
 * Sneak skill laws, shared by server sim and client prediction/HUD.
 *
 * Sneaking is a crouch-walk: slower movement, shrunken NPC detection radius.
 * Level buys stealth power, never speed — the move factor stays fixed so the
 * client can scale its input axes (walk-mode precedent) and prediction stays
 * exact with zero predictor changes.
 */

/** Input-magnitude cap while the Sneak bit is held. */
export const SNEAK_FACTOR = 0.45;

/** Sneaking + standing still ⇒ fully hidden from players and NPCs. */
export const SNEAK_HIDE_LEVEL = 50;

/** Masters stay hidden even while sneak-moving. */
export const SNEAK_MOVE_HIDE_LEVEL = 90;

/** Ticks of stillness before tier-1 hidden engages (500ms at 20tps). */
export const SNEAK_STILL_TICKS = 10;

/** Re-hide lockout after attacking or taking damage (3s). */
export const SNEAK_REVEAL_LOCK_TICKS = 60;

/** Passive-XP pulse cadence (1s). */
export const SNEAK_XP_PERIOD_TICKS = 20;

/** Tiles moved since the last pulse required to earn it — stillness earns safety, not XP. */
export const SNEAK_XP_MIN_MOVE = 0.5;

/** Hostile-NPC proximity window for passive XP, in tiles. */
export const SNEAK_XP_RADIUS = 8;

/** Width of the cone centered on a target's back that counts as "behind". */
export const BACKSTAB_ARC = (2 * Math.PI) / 3;

/** Backstab damage multiplier for melee weapons without their own. */
export const BACKSTAB_MULT_DEFAULT = 1.5;

/** Flat sneak XP per backstab, on top of dmg-scaled XP. */
export const BACKSTAB_XP_BASE = 12;

/** NPC aggro-radius multiplier while sneaking: 0.85 at level 1 → 0.15 at 99. */
export function sneakDetectionFactor(level: number): number {
  const f = 0.85 - (0.7 * (level - 1)) / 98;
  return Math.min(0.85, Math.max(0.15, f));
}

/** Is the attacker inside the BACKSTAB_ARC cone behind the target's facing? */
export function isBehind(ax: number, ay: number, tx: number, ty: number, targetDir: number): boolean {
  const toAttacker = Math.atan2(ay - ty, ax - tx);
  let delta = toAttacker - targetDir;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return Math.abs(delta) > Math.PI - BACKSTAB_ARC / 2;
}
