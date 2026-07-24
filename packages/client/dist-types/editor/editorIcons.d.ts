/**
 * Bespoke tool sigils for Map Studio — hand-drawn monoline glyphs in
 * the one-ink dock-sigil dialect the game HUD uses. Never emoji, never
 * font glyphs: every icon is authored strokes on a canvas, served as a
 * data URL so buttons can clone them freely.
 */
export declare const EDITOR_ICONS: Record<string, string>;
/** An <img> for a sigil, sized for toolbar/button use. */
export declare function iconImg(name: string, size?: number): HTMLImageElement;
//# sourceMappingURL=editorIcons.d.ts.map