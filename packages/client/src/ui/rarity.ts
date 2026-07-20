import type { ItemRoll, RarityTier } from '@devcraft/shared';
import { RARITY_COLORS } from '@devcraft/shared';
import { itemDef } from '@devcraft/content';

/**
 * Rarity display helpers. Tier data lives in shared/rarity.ts (the
 * single source both sides derive rolls from); this module keeps the
 * client-facing API and adds the resolution rule:
 *
 * - Rolled gear: the INSTANCE's tier (its roll) wins, always.
 * - Everything else: derived from vendor value, so the economy keeps
 *   tinting relics, sigils, and capes without any new data.
 */
export type { RarityTier } from '@devcraft/shared';
export { RARITY_COLORS } from '@devcraft/shared';

/** Value-derived fallback tier for non-rolled items. */
export function rarityOf(itemId: string): RarityTier {
  const value = itemDef(itemId)?.value ?? 0;
  if (value >= 1000) return 'legendary';
  if (value >= 550) return 'epic';
  if (value >= 250) return 'rare';
  if (value >= 100) return 'uncommon';
  return 'common';
}

/** Instance-aware tier: the roll wins; gear without a roll is common. */
export function rarityOfInstance(itemId: string, roll?: ItemRoll): RarityTier {
  if (roll) return roll.rar;
  if (itemDef(itemId)?.gear) return 'common';
  return rarityOf(itemId);
}

/** The tier's accent color, or null for common (no treatment). */
export function rarityColor(itemId: string): string | null {
  return RARITY_COLORS[rarityOf(itemId)];
}
