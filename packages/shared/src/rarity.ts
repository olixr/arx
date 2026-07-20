/**
 * Item rarity + per-instance rolls — the single source of truth.
 *
 * An item INSTANCE is `itemId + ItemRoll`: the roll is just a rarity tier
 * and a 32-bit seed. Actual stats are never stored anywhere — they are
 * derived on demand by a pure function (content/equipment/roll.ts) that
 * both client and server share, so the DB and the wire carry two small
 * fields and a content rebalance re-derives every instance in the world.
 */

/**
 * Canonical tier order, weakest first. This array is THE extension
 * point: a future 'artifact' tier above legendary is one entry here
 * plus a color + tables row — nothing else hardcodes the tier count.
 */
export const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

export type RarityTier = (typeof RARITY_TIERS)[number];

/** Accent color per tier; null = common (no visual treatment). */
export const RARITY_COLORS: Record<RarityTier, string | null> = {
  common: null,
  uncommon: '#7dc46a',
  rare: '#6fa8ff',
  epic: '#b47aff',
  legendary: '#ffb347',
};

export function rarityIndex(rar: RarityTier): number {
  return RARITY_TIERS.indexOf(rar);
}

export function isRarityTier(v: unknown): v is RarityTier {
  return typeof v === 'string' && (RARITY_TIERS as readonly string[]).includes(v);
}

/**
 * One item instance's identity. Absent roll reads as common/seed-0
 * everywhere (legacy rows and pre-roll items stay valid forever).
 */
/**
 * A weapon oil riding an instance: the vial's item id and a real-clock
 * expiry (epoch ms — survives restarts; the oil dries even in the
 * bank). Lives ON the weapon, so two blades can wear two different
 * poisons and remember them through every swap.
 */
export interface ItemCoat {
  id: string;
  until: number;
}

export interface ItemRoll {
  rar: RarityTier;
  /** 32-bit unsigned roll seed. */
  seed: number;
  /**
   * Item power — the recycling axis. A piece dropped by a stronger foe
   * carries that foe's level here, and its derived stats scale up to
   * match while the VISUALS never change: every set ever shipped stays
   * in the loot pool forever. Absent (or at/below the def's native
   * requirement) reads as the def's native power — legacy grace.
   */
  pwr?: number;
  /** Weapon oil currently on this instance (weapons only). */
  coat?: ItemCoat;
  /**
   * Enchantment bonded to this instance — an EnchantDef id from
   * content/equipment/enchants.ts. Permanent (unlike an oil): it rides
   * every swap, bank trip, and trade until another scroll replaces it.
   */
  ench?: string;
}

/** Sanity ceiling for wire/DB power values (above every skill cap). */
export const MAX_ITEM_POWER = 120;

/** Wire/DB guard for untrusted roll payloads. */
export function isItemRoll(v: unknown): v is ItemRoll {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  if (!isRarityTier(r.rar) || typeof r.seed !== 'number' || !Number.isInteger(r.seed) || r.seed < 0) {
    return false;
  }
  if (r.pwr !== undefined) {
    if (typeof r.pwr !== 'number' || !Number.isInteger(r.pwr) || r.pwr < 1 || r.pwr > MAX_ITEM_POWER) {
      return false;
    }
  }
  if (r.coat !== undefined) {
    const c = r.coat as Record<string, unknown>;
    if (typeof c !== 'object' || c === null) return false;
    if (typeof c.id !== 'string' || typeof c.until !== 'number' || !Number.isFinite(c.until)) {
      return false;
    }
  }
  if (r.ench !== undefined && (typeof r.ench !== 'string' || r.ench.length === 0 || r.ench.length > 40)) {
    return false;
  }
  return true;
}

export function sameRoll(a?: ItemRoll, b?: ItemRoll): boolean {
  if (!a || !b) return !a && !b;
  return (
    a.rar === b.rar &&
    a.seed === b.seed &&
    (a.pwr ?? 0) === (b.pwr ?? 0) &&
    (a.coat?.id ?? '') === (b.coat?.id ?? '') &&
    (a.ench ?? '') === (b.ench ?? '')
  );
}
