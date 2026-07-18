/**
 * Item glyph paths from game-icons.net, CC BY 3.0
 * (https://creativecommons.org/licenses/by/3.0/).
 * Authors: Lorc (lorc.deviantart.com), Delapouite (delapouite.com),
 * Faithtoken (fungustober.deviantart.com), DarkZaitzev (darkzaitzev.deviantart.com).
 * Each entry is the white glyph path from the original 512x512 SVG;
 * DevCraft re-renders them through its own tint/outline pipeline.
 */
export interface GlyphDef {
    /** SVG path data in a 512x512 box. */
    d: string;
    /** game-icons.net author credit. */
    by: string;
}
export declare const GLYPHS: Record<string, GlyphDef>;
//# sourceMappingURL=iconPaths.d.ts.map