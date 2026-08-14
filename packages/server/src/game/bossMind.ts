import type { NpcBossDef, NpcDef, NpcKitEntry } from '@arx/content';
import { BOSS_KNOCKBACK_MULT, BOSS_STUN_MULT } from '@arx/content';

/**
 * THE DREAD CROWN's pure mind (docs/boss-system-plan.md) — every
 * judgment the boss layer makes that needs no world, kept out of the
 * server class so the laws pin as plain functions. The crown RIDES
 * the kit rail: nothing here casts, damages, or moves a body; these
 * are the gates and dials the one engine consults.
 */

/** THE UNREPEATED HAND: the last-fired voice's weight, quartered on the next pick. */
export const BOSS_RECENCY_FOLD = 0.25;

/**
 * THE TURNING: the rung this HP fraction has earned — the highest
 * ladder index whose hpBelow the wound has crossed under. One-way by
 * construction: the current rung floors the answer, so a mended boss
 * keeps its fury (only the arena reset walks the ladder back down).
 */
export function bossPhaseFor(boss: NpcBossDef, hpFrac: number, current: number): number {
  let rung = 0;
  for (let i = 1; i < boss.phases.length; i++) {
    const gate = boss.phases[i]?.hpBelow;
    if (gate !== undefined && hpFrac < gate) rung = i;
  }
  return Math.max(current, rung);
}

/** A kit entry's phase band: wakes at `phase`, retires past `phaseMax`. */
export function bossKitGateHolds(k: NpcKitEntry, phase: number): boolean {
  if ((k.phase ?? 0) > phase) return false;
  if (k.phaseMax !== undefined && phase > k.phaseMax) return false;
  return true;
}

/** Fold recency into a selection weight (variety is structural, not authored). */
export function bossRecencyFold(weight: number, idx: number, lastIdx: number | undefined): number {
  return idx === lastIdx ? weight * BOSS_RECENCY_FOLD : weight;
}

/**
 * THE CHAIN: the kit index the fired entry queues next, or -1. The
 * validator already proved the target exists, the chain is acyclic,
 * and no combo runs past 3 links — this is a plain lookup.
 */
export function bossChainIndex(kit: readonly NpcKitEntry[], firedIdx: number): number {
  const then = kit[firedIdx]?.then;
  if (then === undefined) return -1;
  return kit.findIndex((k) => k.ability === then);
}

/** Kit cooldown scale while a phase holds (the fight accelerates honestly). */
export function bossCdMult(boss: NpcBossDef, phase: number): number {
  return boss.phases[phase]?.cdMult ?? 1;
}

/** Movement scale while a phase holds. */
export function bossSpeedMult(boss: NpcBossDef, phase: number): number {
  return boss.phases[phase]?.speedMult ?? 1;
}

/**
 * THE STUBBORN CROWN: every knockback landed on a crowned body is
 * scaled — shoved a step, never juggled. 1 for ordinary flesh.
 */
export function bossKnockMult(def: NpcDef): number {
  return def.boss ? (def.boss.knockbackMult ?? BOSS_KNOCKBACK_MULT) : 1;
}

/**
 * ...and shock's hard-stagger ticks are scaled the same way (0 =
 * immune). The status itself still lands and still fuels reactions —
 * only the hard control is dialed.
 */
export function bossStunTicks(def: NpcDef, ticks: number): number {
  if (!def.boss) return ticks;
  return Math.round(ticks * (def.boss.stunMult ?? BOSS_STUN_MULT));
}
