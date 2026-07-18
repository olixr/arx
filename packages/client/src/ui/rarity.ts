import { itemDef } from '@devcraft/content';

/**
 * Rarity tiers, derived from vendor value so the data model stays
 * untouched: the economy already encodes how special a thing is.
 * Common stays quiet; everything above it announces itself — tinted
 * slot glow, colored nameplates, the Diablo "something's in there"
 * glance.
 */
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<RarityTier, string | null> = {
  common: null,
  uncommon: '#7dc46a',
  rare: '#6fa8ff',
  epic: '#b47aff',
  legendary: '#ffb347',
};

export function rarityOf(itemId: string): RarityTier {
  const value = itemDef(itemId)?.value ?? 0;
  if (value >= 1000) return 'legendary';
  if (value >= 550) return 'epic';
  if (value >= 250) return 'rare';
  if (value >= 100) return 'uncommon';
  return 'common';
}

/** The tier's accent color, or null for common (no treatment). */
export function rarityColor(itemId: string): string | null {
  return RARITY_COLORS[rarityOf(itemId)];
}
