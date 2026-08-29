/**
 * THE COMPANY YOU KEEP (docs/companions-plan.md) — the pure laws of
 * the befriended companion. A companion is company, whole and entire:
 * it follows, it settles, it is patted — it never fights, never
 * falls, never levels, and never touches the tamed-beast system.
 * These dials are deliberately its OWN, not imports from sim/pets:
 * the two systems must be free to drift apart without either one
 * noticing.
 */

/** THE COMPANY CAP: the most companions a character may keep. */
export const COMPANION_CAP = 3;

/**
 * A companion's durable state, as the DB knows it. 'heel' walks the
 * world beside its keeper (alongside a tamed beast — the two heels
 * are separate by design); 'home' keeps its own counsel until called.
 * The wire additionally derives 'trailing' (at heel, but the body
 * slipped behind and waits to re-emerge) — never stored, because it
 * is never true across a login.
 */
export type CompanionState = 'heel' | 'home';

/** Close enough to count as at heel — company presses in closer than a beast. */
export const COMPANION_HEEL_DIST = 1.4;

/** Beyond this gap the companion breaks into its catch-up scamper. */
export const COMPANION_CATCHUP_DIST = 6;

/**
 * THE HEEL FORGIVES THE ROAD (the companion's own copy of the pet
 * law): past this gap the body slips to trailing — despawned,
 * remembered — instead of pathing across the map.
 */
export const COMPANION_TRAIL_OUT = 24;

/**
 * A trailing companion re-emerges once the keeper holds under this
 * stride (tiles/sec) for COMPANION_CALM_TICKS straight — an arrival
 * you are still enough to watch, never a teleport.
 */
export const COMPANION_CALM_SPEED = 6;
export const COMPANION_CALM_TICKS = 20;

/**
 * Scamper ceiling, chosen under the netcode's SMOOTH_MAX_SPEED
 * 12 t/s render-continuity lane (the pets and mounts margin).
 * Raising it is a design review, not a tweak.
 */
export const COMPANION_SPRINT_CAP = 9.5;

/** Follow stride for one tick: settle, walk, or scamper the gap shut. */
export function companionFollowSpeed(speciesSpeed: number, dist: number): number {
  if (dist <= COMPANION_HEEL_DIST) return 0;
  if (dist >= COMPANION_CATCHUP_DIST) return Math.min(speciesSpeed * 1.5, COMPANION_SPRINT_CAP);
  return speciesSpeed;
}
