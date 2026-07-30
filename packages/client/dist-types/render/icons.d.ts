export type IconPainter = (ctx: CanvasRenderingContext2D, color: string) => void;
/**
 * Render an externally-authored painter through the SAME pipeline —
 * supersample, eight-tap outline ring, hard shadow — so satellite icon
 * sets (the ability spell-plates) wear the identical dark ring the
 * item set does. The key namespaces the painter in the shared cache;
 * re-registration under the same key is a no-op.
 */
export declare function paintedIconUrl(key: string, painter: IconPainter, color: string, size: number): string;
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
export declare function uiIconUrl(kind: 'backpack' | 'scroll' | 'hammer' | 'house' | 'attack' | 'bell' | 'signpost', size?: number): string;
export type DockGlyph = 'pack' | 'skills' | 'arts' | 'handiwork' | 'build' | 'sound' | 'social' | 'attack' | 'map' | 'quest' | 'rep';
/** Data URL for a dock sigil — monoline, muted brass, soft under-shade. */
export declare function dockGlyphUrl(kind: DockGlyph, size?: number): string;
//# sourceMappingURL=icons.d.ts.map