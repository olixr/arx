import type { ItemRoll, RarityTier } from '@arx/shared';
/**
 * Rarity display helpers. Tier data lives in shared/rarity.ts (the
 * single source both sides derive rolls from); this module keeps the
 * client-facing API and adds the resolution rule:
 *
 * - Rolled gear: the INSTANCE's tier (its roll) wins, always.
 * - Everything else: derived from vendor value, so the economy keeps
 *   tinting relics, sigils, and capes without any new data.
 */
export type { RarityTier } from '@arx/shared';
export { RARITY_COLORS } from '@arx/shared';
/** Value-derived fallback tier for non-rolled items. */
export declare function rarityOf(itemId: string): RarityTier;
/** Instance-aware tier: the roll wins; gear without a roll is common. */
export declare function rarityOfInstance(itemId: string, roll?: ItemRoll): RarityTier;
/** The tier's accent color, or null for common (no treatment). */
export declare function rarityColor(itemId: string): string | null;
//# sourceMappingURL=rarity.d.ts.map