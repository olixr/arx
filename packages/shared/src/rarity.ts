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
  /**
   * THE ENCHANTER'S HAND: inscription quality, as a percentage of a
   * working's authored strength (QUALITY_FLOOR..QUALITY_CEIL).
   *
   * On a SCROLL it is the mark of whoever inscribed it. On GEAR it is
   * the strength of the working bonded there. One field, one meaning:
   * how well this working was done. Absent reads as QUALITY_BASE, so
   * every scroll and every enchanted item that existed before this
   * shipped is exactly as strong as it always was.
   */
  q?: number;
  /**
   * THE DEEPENING: this piece has been opened to hold a second working.
   * Set once by a deepening sigil and never cleared — the steel has
   * been reworked, and sundering an art does not close the seat.
   */
  deep?: true;
  /**
   * The ART: a deepened piece's second working. Always a working that
   * carries a proc, never a passive one, and that is the law that makes
   * the whole feature possible — see THE DEEPENING in enchants.ts.
   */
  ench2?: string;
  /** The art's own inscription quality. Absent reads as QUALITY_BASE. */
  q2?: number;
}

/** Sanity ceiling for wire/DB power values (above every skill cap). */
export const MAX_ITEM_POWER = 120;

/**
 * Inscription quality bounds. A working done at the very edge of the
 * enchanter's ability sits near the floor; a master's runs past 100.
 * Baseline is what an unmarked instance reads as.
 */
export const QUALITY_FLOOR = 85;
export const QUALITY_BASE = 100;
export const QUALITY_CEIL = 115;

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
  for (const key of ['q', 'q2'] as const) {
    const v = r[key];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < QUALITY_FLOOR || v > QUALITY_CEIL) {
      return false;
    }
  }
  if (r.deep !== undefined && r.deep !== true) return false;
  if (
    r.ench2 !== undefined &&
    (typeof r.ench2 !== 'string' || r.ench2.length === 0 || r.ench2.length > 40)
  ) {
    return false;
  }
  // An art without a seat is a roll that could never have been made.
  if (r.ench2 !== undefined && r.deep !== true) return false;
  return true;
}

export function sameRoll(a?: ItemRoll, b?: ItemRoll): boolean {
  if (!a || !b) return !a && !b;
  return (
    a.rar === b.rar &&
    a.seed === b.seed &&
    (a.pwr ?? 0) === (b.pwr ?? 0) &&
    (a.coat?.id ?? '') === (b.coat?.id ?? '') &&
    (a.ench ?? '') === (b.ench ?? '') &&
    (a.q ?? QUALITY_BASE) === (b.q ?? QUALITY_BASE) &&
    (a.ench2 ?? '') === (b.ench2 ?? '') &&
    (a.q2 ?? QUALITY_BASE) === (b.q2 ?? QUALITY_BASE) &&
    !a.deep === !b.deep
  );
}
