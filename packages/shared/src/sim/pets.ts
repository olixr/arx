/**
 * THE WILD AT HEEL (docs/beastcraft-plan.md, beastcraft v2) — the pure
 * laws of the tamed companion: what a collar-tag name may be, how the
 * heel follows, how a pet's ladder reads from its xp. Server and
 * client both consult these, so the wire carries state and never a
 * rule.
 */

import { MAX_LEVEL, levelForXp } from '../skills.js';

/** THREE STALLS, ONE HEEL: the most companions a character may keep. */
export const PET_CAP = 3;

/**
 * A companion's durable state, as the DB knows it. 'heel' walks the
 * world beside its keeper; 'stabled' waits at the stalls; 'resting'
 * is Phase 3's limp-home. The wire additionally derives 'trailing'
 * (at heel, but the body slipped behind and waits to re-emerge) —
 * that one is never stored, because it is never true across a login.
 */
export type PetState = 'heel' | 'stabled' | 'resting';

/**
 * THE GENTLING IS EARNED, NEVER ROLLED: a wild heart opens only once
 * its nerve breaks — deliberately the craven-break threshold, shared
 * so the two laws can never drift apart. Deterministic end to end:
 * skill rung + worn-down heart + the right lure + an unbroken kneel.
 * No dice, no pity, no player-state odds (the flood-law's spirit).
 */
export const GENTLE_HP_FRAC = 0.35;

/**
 * The gentling kneel, in ticks (4s at 20 tps). Flat on purpose — a
 * heart is not a node, so no gather-speed brew ever shortens it.
 */
export const GENTLE_TICKS = 80;

/** Close enough to count as at heel — where the follow settles. */
export const PET_HEEL_DIST = 1.6;

/** Beyond this gap the companion breaks into its catch-up sprint. */
export const PET_CATCHUP_DIST = 6;

/**
 * THE HEEL FORGIVES THE ROAD: past this gap the body slips to
 * trailing (despawns, remembered) instead of pathing across the map.
 */
export const PET_TRAIL_OUT = 24;

/**
 * A trailing companion re-emerges once the keeper holds under this
 * stride (tiles/sec) for PET_CALM_TICKS straight — never a visible
 * teleport, always an arrival while you are still enough to see it.
 */
export const PET_CALM_SPEED = 6;
export const PET_CALM_TICKS = 20;

/**
 * Sprint ceiling for any companion, chosen under the netcode's
 * SMOOTH_MAX_SPEED 12 t/s render-continuity lane with the same margin
 * the mounts cap keeps. Raising it is a design review, not a tweak.
 */
export const PET_SPRINT_CAP = 9.5;

/** Follow stride for one tick: settle, walk, or sprint the gap shut. */
export function petFollowSpeed(speciesSpeed: number, dist: number): number {
  if (dist <= PET_HEEL_DIST) return 0;
  if (dist >= PET_CATCHUP_DIST) return Math.min(speciesSpeed * 1.5, PET_SPRINT_CAP);
  return speciesSpeed;
}

/**
 * THE LEASH ON THE LADDER: a pet's level reads its own xp on the one
 * shipped skill curve, OFFSET so a fresh tame starts at its species'
 * authored level, and capped by the keeper's beastcraft — the skill
 * stays the ceiling, but a beast is never less than itself.
 */
export function petLevelFor(xp: number, speciesLevel: number, beastcraftLevel: number): number {
  const cap = Math.max(speciesLevel, Math.min(MAX_LEVEL, beastcraftLevel));
  return Math.min(cap, speciesLevel + levelForXp(Math.max(0, xp)) - 1);
}

/**
 * A collar-tag name: 2–16 characters, letters with inner spaces,
 * apostrophes, or compound hyphens, starting and ending on a letter.
 * Whitespace collapses. Returns the cleaned name, or null when
 * nothing worthy of a tag remains. Both sides run the same rule so
 * the naming card can refuse before the wire ever hears about it.
 */
export function sanitizePetName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 16) return null;
  if (!/^[A-Za-z][A-Za-z '-]*[A-Za-z]$/.test(clean)) return null;
  return clean;
}
