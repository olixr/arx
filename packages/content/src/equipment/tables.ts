import type { RarityTier } from '@arx/shared';
import type { Rng } from '@arx/shared';
import type { CombatStyle } from '../items.js';
import type { ArmorClass } from './types.js';

/**
 * Every equipment balance number lives HERE and only here. When plate
 * feels too strong or legendary drops feel too common, this is the one
 * file to tune — rolls re-derive from these tables automatically.
 */

/** Base armor/damage multiplier per tier — small, affixes carry the chase. */
export const RARITY_BASE_MULT: Record<RarityTier, number> = {
  common: 1,
  uncommon: 1.06,
  rare: 1.12,
  epic: 1.18,
  legendary: 1.25,
};

/** Vendor value multiplier per tier. */
export const RARITY_VALUE_MULT: Record<RarityTier, number> = {
  common: 1,
  uncommon: 1.7,
  rare: 2.6,
  epic: 4.2,
  legendary: 7,
};

/** How many affixes a tier rolls (consumes the instance rng). */
export function affixCount(rar: RarityTier, rng: Rng): number {
  switch (rar) {
    case 'common':
      return rng.chance(0.25) ? 1 : 0;
    case 'uncommon':
      return 1;
    case 'rare':
      return 2;
    case 'epic':
      return rng.chance(0.5) ? 3 : 2;
    case 'legendary':
      return 3;
  }
}

/**
 * The biggest +skill a piece can roll, driven by its equip requirement:
 * ≈ +2 at req 8, ≈ +6 at req 50, +10 from req ~92 (the stated extreme —
 * with a 99 cap a +10 is a build-defining find).
 */
export function affixMagnitudeCap(reqLevel: number): number {
  return Math.max(1, Math.min(10, Math.round(1 + reqLevel * 0.095)));
}

/** Fraction of the magnitude cap a tier rolls within (min, max). */
export const AFFIX_ROLL_FRAC: Record<RarityTier, readonly [number, number]> = {
  common: [0.25, 0.45],
  uncommon: [0.35, 0.6],
  rare: [0.5, 0.75],
  epic: [0.65, 0.9],
  legendary: [0.8, 1.0],
};

/**
 * Per-piece playstyle modifiers, counted over head/body/legs/gloves/
 * boots. Percentages — a full five-piece plate set is +15% onehand /
 * −20% Arx / −5% move; completing a set with its gloves is what
 * pushes a specialty over the top.
 * Only plate pays for its protection; cloth and leather are pure buffs,
 * so mixed sets dilute a specialty without punishing the wearer.
 * Authoring guideline: at equal tier, base armor ≈ plate 3 / leather 2 /
 * cloth 1 per piece; gloves sit at the boots budget.
 */
export const ARMOR_CLASS_MODS: Record<
  ArmorClass,
  {
    /** Additive % to a combat style's max hit, per piece. */
    dmgPct: Partial<Record<CombatStyle, number>>;
    /** Additive % to move speed, per piece. */
    speedPct: number;
    /** Additive % to ability cooldowns (negative = faster), per piece. */
    cooldownPct: number;
  }
> = {
  plate: { dmgPct: { onehand: 3, twohand: 3, polearm: 3, arx: -4 }, speedPct: -1, cooldownPct: 0 },
  leather: { dmgPct: { archery: 3 }, speedPct: 0.5, cooldownPct: 0 },
  cloth: { dmgPct: { arx: 4 }, speedPct: 0, cooldownPct: -2.5 },
};

/** Short player-facing blurb per class, shown on the item card. */
// ASCII hyphen-minus only: U+2212 MINUS SIGN reads as an en dash on a
// card and slips past the dash-ban regex.
export const ARMOR_CLASS_BLURB: Record<ArmorClass, string> = {
  plate: 'Plate: +one-handed, two-handed and polearm damage, -Arx damage, slightly slower',
  leather: 'Leather: +archery damage, slightly faster',
  cloth: 'Cloth: +Arx damage, faster ability cooldowns',
};

/**
 * Craft-result rarity weights: crafting above the recipe's requirement
 * is THE way to chase good rolls — 20 surplus levels roughly triples
 * your rare-or-better odds versus crafting at-level.
 */
export function craftRarityWeights(effLevel: number, recipeReq: number): Record<RarityTier, number> {
  const s = Math.max(0, Math.min(20, effLevel - recipeReq));
  return {
    common: Math.max(30, 100 - 3.5 * s),
    uncommon: 40 + s,
    rare: 12 + 0.8 * s,
    epic: 3 + 0.3 * s,
    legendary: 0.5 + 0.1 * s,
  };
}

/** Drop rarity weights — tougher foes carry better-kept gear. */
export function dropRarityWeights(npcLevel: number): Record<RarityTier, number> {
  const k = 1 + Math.max(0, npcLevel) / 25;
  return {
    common: 100,
    uncommon: 25 * k,
    rare: 6 * k,
    epic: 1.2 * k,
    legendary: 0.2 * k,
  };
}

// ------------------------------------------------------- item power

/**
 * Item power — the recycling axis. A roll's `pwr` above the def's
 * native requirement scales base armor/damage by this much per surplus
 * level. Calibrated against the authored ladders (cloth body: armor 2
 * at arx 4 → 6 at arx 42): a re-issued early piece lands JUST shy
 * of a native piece of its power on base stats — the heirloom's real
 * catch-up is its affix cap, which uses the full effective level. The
 * chase for native top gear survives; the old wardrobe stays viable.
 */
export const POWER_PER_LEVEL = 0.055;

/** Vendor value grows with surplus power (shy of stat growth). */
export const POWER_VALUE_PER_LEVEL = 0.04;

/** Base-stat multiplier for an instance at `eff` power over `native`. */
export function powerMult(native: number, eff: number): number {
  return 1 + Math.max(0, eff - native) * POWER_PER_LEVEL;
}

/**
 * Trinket (relic/sigil) active scaling: the SAME ability grows with the
 * instance that grants it — rarity is the roll, power is the tier it
 * dropped at. A power-50 legendary Aegis Stone shields ~1.56× the
 * shop-bought common. Applied to the active's damage and self numbers.
 */
export function trinketPowerMult(rar: RarityTier, pwr: number | undefined): number {
  return RARITY_BASE_MULT[rar] * (1 + (pwr ?? 0) * 0.005);
}

// ---------------------------------------------------------- heirlooms

/**
 * The heirloom law: any foe this strong may carry a piece of the OLD
 * wardrobe re-issued at its own power — same art, same identity, new
 * numbers. This is what keeps every set we ever ship in rotation.
 */
export const HEIRLOOM_MIN_NPC_LEVEL = 10;
export const HEIRLOOM_CHANCE = 0.05;
/** A re-issue must be a real promotion — native this far below the foe. */
export const HEIRLOOM_MIN_SURPLUS = 6;
