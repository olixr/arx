/** Every mapped item id — the dev icon gallery walks this. */
export declare function allIconItemIds(): string[];
/** Every mapped buildable id — the dev icon gallery walks this. */
export declare function allIconBuildableIds(): string[];
/** Data URL for an item's icon. */
export declare function itemIconUrl(itemId: string, size?: number): string;
/**
 * Data URL for a buildable's build-panel icon, or null when a buildable
 * has no art yet — the panel falls back to its tile color swatch, so a
 * missing mapping degrades instead of breaking.
 */
export declare function buildableIconUrl(buildableId: string, size: number): string | null;
/** Dim placeholder glyph telling an empty equipment slot's purpose. */
export declare function slotGlyphUrl(slot: string, size?: number): string;
/** Data URL for the HUD sneak-state eye chip. */
export declare function sneakEyeUrl(state: 'sneaking' | 'hidden' | 'detected', size?: number): string;
/** Data URL for a UI glyph. */
export declare function uiIconUrl(kind: 'backpack' | 'scroll' | 'hammer' | 'house' | 'attack' | 'bell', size?: number): string;
//# sourceMappingURL=icons.d.ts.map