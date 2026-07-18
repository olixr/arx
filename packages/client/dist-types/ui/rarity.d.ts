/**
 * Rarity tiers, derived from vendor value so the data model stays
 * untouched: the economy already encodes how special a thing is.
 * Common stays quiet; everything above it announces itself — tinted
 * slot glow, colored nameplates, the Diablo "something's in there"
 * glance.
 */
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export declare const RARITY_COLORS: Record<RarityTier, string | null>;
export declare function rarityOf(itemId: string): RarityTier;
/** The tier's accent color, or null for common (no treatment). */
export declare function rarityColor(itemId: string): string | null;
//# sourceMappingURL=rarity.d.ts.map