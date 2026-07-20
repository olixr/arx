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
export interface ItemRoll {
  rar: RarityTier;
  /** 32-bit unsigned roll seed. */
  seed: number;
}

/** Wire/DB guard for untrusted roll payloads. */
export function isItemRoll(v: unknown): v is ItemRoll {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return isRarityTier(r.rar) && typeof r.seed === 'number' && Number.isInteger(r.seed) && r.seed >= 0;
}

export function sameRoll(a?: ItemRoll, b?: ItemRoll): boolean {
  if (!a || !b) return !a && !b;
  return a.rar === b.rar && a.seed === b.seed;
}
