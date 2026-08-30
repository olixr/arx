export type IconPainter = (ctx: CanvasRenderingContext2D, color: string) => void;
/**
 * The lane's core: `baked` is the cheap cache probe's answer (see
 * `itemIconUrlIfBaked` / `paintedIconUrlIfBaked`). Hot icons apply
 * synchronously; cold ones queue for the budgeted drain.
 */
export declare function queueIconTask(el: HTMLImageElement | HTMLElement, baked: string | undefined, make: () => string): void;
/** `itemIconUrl`'s cache probe — same key derivation, no rasterizing. */
export declare function itemIconUrlIfBaked(itemId: string, size?: number): string | undefined;
/** `paintedIconUrl`'s cache probe — satellite icon sets build their
 * own lane wrappers on this (see abilityIcons' queueAbilityIcon). */
export declare function paintedIconUrlIfBaked(key: string, color: string, size: number): string | undefined;
/** Fill `el` with an item icon through the budgeted lane. */
export declare function queueItemIcon(el: HTMLImageElement | HTMLElement, itemId: string, size?: number): void;
/**
 * The bare pipeline as a reusable baker: paint a unit-box painter at
 * supersample, ring it with the eight-tap outline shader, drop the
 * hard shadow off the ringed silhouette, downscale once — and hand
 * back the CANVAS (map sigils stamp these straight onto the chart;
 * the dataURL wrapper below serves the `<img>` lanes). `ringFrac`
 * scales the ring against the sprite size — chart marks read at map
 * distance and wear a bolder ring than a pack icon needs.
 */
export declare function bakeOutlinedSprite(painter: (ctx: CanvasRenderingContext2D) => void, size: number, ringFrac?: number): HTMLCanvasElement;
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
/**
 * THE DYE LAW's swatches, index-married to the shared roster (linen 0
 * … rose 9). The ONE client-side color truth for dyes: the renderer's
 * AWNING_CLOTHS derives its bolt colors from this list, and the build
 * tray's swatch row paints its dots with it — change a dye here and
 * every reader agrees.
 */
export declare const DYE_SWATCHES: readonly string[];
export declare function buildableIconUrl(buildableId: string, size: number): string | null;
/** Dim placeholder glyph telling an empty equipment slot's purpose. */
export declare function slotGlyphUrl(slot: string, size?: number): string;
/** Data URL for the HUD sneak-state eye chip. */
export declare function sneakEyeUrl(state: 'sneaking' | 'hidden' | 'detected', size?: number): string;
/** Data URL for a UI glyph. */
export declare function uiIconUrl(kind: 'backpack' | 'scroll' | 'hammer' | 'house' | 'attack' | 'bell' | 'signpost', size?: number): string;
/**
 * THE SAND'S OWN MARK — gold swords rising crossed behind a dark
 * heater shield. Worn by arena chrome only (the cinema's board-opening
 * plate, the stakes board's head). The shield mass owns the center and
 * the blades read point-UP like trophies over a hearth, so the mark
 * can never be mistaken for a dismiss cross the way bare crossed
 * blades were at chip size (the proving pass's find).
 */
export declare function arenaEmblemUrl(size?: number): string;
export type DockGlyph = 'pack' | 'skills' | 'arts' | 'handiwork' | 'build' | 'sound' | 'social' | 'attack' | 'map' | 'quest' | 'rep' | 'keys' | 'beast' | 'companion';
/** Data URL for a dock sigil — monoline, muted brass, soft under-shade. */
export declare function dockGlyphUrl(kind: DockGlyph, size?: number): string;
//# sourceMappingURL=icons.d.ts.map