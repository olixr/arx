/**
 * THE THREAT LAW — the one damage pipeline, D&D-structured, shared by
 * every strike in the game (player basics, arts, NPC melee, thrown
 * spears, ability blasts). Nothing rolls or mitigates damage outside
 * these functions.
 *
 * The pipeline, attacker → defender:
 *
 *   1. BASE DAMAGE — the weapon die. A creature's authored `damage`
 *      stat or a weapon's `damage` stat: what the arm is swinging.
 *   2. POWER MULTIPLIER — the stat modifier. Level scales the die
 *      multiplicatively (D&D's ability-modifier-plus-proficiency
 *      climb, folded into one curve). Two goblins holding the same
 *      club at level 5 and level 15 are DIFFERENT threats.
 *   3. THE ROLL — uniform 0..maxHit at the strike site. A 0 is a
 *      whiff: the axe whistles past. Deliberate law — the miss is
 *      real risk texture and is NEVER floored away — WITH ONE spoken
 *      exception: player BASIC attacks floor a landed roll at 1
 *      (`rollBasic`, the hack-and-slash cadence law 09b762b — at ~3
 *      chip hits a second, zero-rolls read broken and starve on-hit
 *      haste). Abilities and every NPC strike keep the true whiff.
 *   4. MITIGATION — armor class. Percentage reduction from trained
 *      defence + worn armor, diminishing-returns shaped so big hits
 *      shrink but never vanish, with the attacker's level piercing
 *      through (a deep-tier horror shoulders past town plate).
 *
 * Special effects (statuses, DoTs) ride on top: DoT ticks pierce
 * armor — the wound is already inside it.
 */

// ------------------------------------------------------- attacker side

/**
 * Players climb 5%/level: their real growth compounds through gear
 * multipliers, combo finishers, and arts on top of this.
 */
export const PLAYER_POWER_PER_LEVEL = 0.05;
/**
 * NPCs climb 10%/level: the level line is ALL they have — no rolled
 * gear, no combo string, no relic slot — so it climbs steeper to keep
 * an even-level fight honest and make a +10 gap a genuine danger.
 */
export const NPC_POWER_PER_LEVEL = 0.1;

/** The stat multiplier a level hangs on a base die. */
export function powerMult(level: number, perLevel: number): number {
  return 1 + Math.max(0, level) * perLevel;
}

/** Base die × level curve, rounded, never below 1 for a real weapon. */
export function scaledMaxHit(base: number, level: number, perLevel: number): number {
  return Math.max(1, Math.round(base * powerMult(level, perLevel)));
}

/**
 * An NPC's true max hit: its authored die carried by its level.
 * Harmless creatures (die 0) stay harmless at any level.
 */
export function npcMaxHit(baseDamage: number, level: number): number {
  if (baseDamage <= 0) return 0;
  return scaledMaxHit(baseDamage, level, NPC_POWER_PER_LEVEL);
}

// ------------------------------------------------------- defender side

/** Rating per trained defence level — the skill IS armor you wear. */
export const ARMOR_RATING_PER_DEFENCE = 2;
/** Rating per point of worn armor — plate counts ~1.5 defence levels. */
export const ARMOR_RATING_PER_ARMOR = 3;
/** Mitigation half-way constant floor (rating == K ⇒ 50% reduction). */
export const MITIGATION_K_BASE = 60;
/**
 * K grows with the attacker's level: the same plate that halves a
 * bandit's cut only shaves a deep-frontier champion. Threat is never
 * fully armored away.
 */
export const MITIGATION_K_PER_LEVEL = 4;
/** Reduction ceiling — tanky is tanky, invincible is forbidden. */
export const MITIGATION_CAP = 0.75;
/**
 * THE RAISED WALL: bonus armor per shield-skill level, granted at the
 * mitigate site ONLY while an offhand shield is equipped. The pipeline
 * itself never changes — the wall is a contribution to the armor term
 * (like Bulwark's planted stance), so the cap and the attacker-level
 * pierce still govern. 0.5 armor/level = 1.5 rating/level raised.
 */
export const SHIELD_ARMOR_PER_LEVEL = 0.5;

/** One number for the whole defensive kit: trained skill + worn metal. */
export function armorRating(defenceLevel: number, armor: number): number {
  return Math.max(0, defenceLevel) * ARMOR_RATING_PER_DEFENCE + Math.max(0, armor) * ARMOR_RATING_PER_ARMOR;
}

/**
 * Fractional damage reduction (0..MITIGATION_CAP) — the WoW-shaped
 * rating/(rating+K) curve: early points matter most, stacking always
 * helps, 100% is unreachable.
 */
export function damageReduction(rating: number, attackerLevel: number): number {
  const k = MITIGATION_K_BASE + MITIGATION_K_PER_LEVEL * Math.max(1, attackerLevel);
  return Math.min(MITIGATION_CAP, Math.max(0, rating) / (Math.max(0, rating) + k));
}

/**
 * A rolled hit through the defender's armor class. Rounds to nearest —
 * a heavily-armored body can clank a small hit to 0 (the soak), but a
 * big hit always arrives meaningfully.
 */
export function mitigate(
  raw: number,
  defenceLevel: number,
  armor: number,
  attackerLevel: number,
): number {
  if (raw <= 0) return 0;
  const dr = damageReduction(armorRating(defenceLevel, armor), attackerLevel);
  return Math.round(raw * (1 - dr));
}
