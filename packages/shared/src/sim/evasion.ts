/**
 * THE SLIPPED BLOW (docs/evasion-plan.md) — the body's chance that a
 * blow misses it entirely.
 *
 * The pressed dodge dash left the game on 2026-09-05: it had become a
 * stride exploit (dodge, then ride the haste it granted) and nothing
 * else. What it was FOR — a nimble body taking fewer blows — lives
 * here instead, as a chance rolled where the blow lands. Armor is the
 * plate's answer to a blow (it lands, softer); the slip is leather's
 * (it never lands). Two defensive lanes, one roll site each.
 *
 * ONE HOME: every source folds through evadeChancePct, and the roll
 * itself is rollSlip — the server's damage door reads both, the codex
 * and the character sheet describe them from the same constants, and
 * the tests below pin the table. Pure: no engine state, no RNG until
 * the roll, so the same inputs give the same chance on both sides of
 * the wire.
 *
 * THE LANES (all percentage points, summed, then capped):
 *   worn     Wolf Reflexes (a cape passive)        flat WOLF_REFLEXES_PCT
 *   leather  each leather armor piece worn         LEATHER_EVADE_PER_PIECE
 *   trained  the Sneak skill's effective level     SNEAK_EVADE_PER_LEVEL each
 *   buffs    tonics, callings' when-grants, boons   the forge's evadePct fold
 *
 * THE FEET ARE THE SLIP: a slip is a body stepping aside, so the
 * chance rides the feet. A hold's stone feet slip nothing; a chill
 * slips slower (the move factor scales the chance); a seated body and
 * a body in the saddle never slip — the horse takes the blow.
 *
 * WHAT NEVER SLIPS: a wound already inside the armor (burn, bleed,
 * venom pulses) and any armor-piercing drip — those pass the door by
 * the `via` / pierce lane and never reach the roll.
 */

/** Wolf Reflexes: the worn lane's flat chance, percentage points. */
export const WOLF_REFLEXES_PCT = 10;
/** Each leather armor piece worn (head/body/legs/gloves/boots). */
export const LEATHER_EVADE_PER_PIECE = 2;
/** Each effective Sneak level (99 trained = 9.9 before the cap). */
export const SNEAK_EVADE_PER_LEVEL = 0.1;
/**
 * The ceiling every assembly of lanes lands under. Half the blows is
 * the most any body slips — past it the fight stops being one.
 */
export const EVADE_CAP_PCT = 50;

export interface EvadeInputs {
  /** The forge's evadePct fold over the riding buffs (percentage points). */
  buffPct: number;
  /** Wolf Reflexes worn (an unstowed cape carrying the passive). */
  wolfReflexes: boolean;
  /** Leather armor pieces worn — the gear cache's classCounts.leather. */
  leatherPieces: number;
  /** The Sneak skill's effective level (0 when untrained). */
  sneakLevel: number;
  /**
   * The body's status move factor (moveFactorOfList): 1 free-footed,
   * a chill's fraction, 0 for a hold's stone feet.
   */
  moveFactor: number;
  /** Seated, or in the saddle — the body cannot step aside. */
  planted: boolean;
}

/**
 * The chance, in percentage points [0, EVADE_CAP_PCT], that the next
 * blow misses. Lanes sum; the feet scale; the cap closes.
 */
export function evadeChancePct(i: EvadeInputs): number {
  if (i.planted) return 0;
  const feet = Math.max(0, Math.min(1, i.moveFactor));
  if (feet <= 0) return 0;
  const raw =
    Math.max(0, i.buffPct) +
    (i.wolfReflexes ? WOLF_REFLEXES_PCT : 0) +
    Math.max(0, i.leatherPieces) * LEATHER_EVADE_PER_PIECE +
    Math.max(0, i.sneakLevel) * SNEAK_EVADE_PER_LEVEL;
  return Math.min(EVADE_CAP_PCT, raw * feet);
}

/**
 * The roll: true when the blow slips. `rng` is a [0, 1) sample so the
 * proving suites can pin both outcomes without a seeded engine.
 */
export function rollSlip(chancePct: number, rng: () => number = Math.random): boolean {
  if (chancePct <= 0) return false;
  return rng() * 100 < chancePct;
}

/** The chance spoken for a sheet or a tooltip: "14% of blows slip". */
export function describeEvade(chancePct: number): string {
  const pct = Math.round(chancePct);
  return pct <= 0 ? 'no blows slip' : `${pct}% of blows slip`;
}
