/**
 * THE ONE MATERIAL TRUTH — the single source for every color, ladder
 * and lane the interface wears (The Grand Refit, Phase 1).
 *
 * Before this module, the palette lived twice: once in style.css's
 * `:root` and once as swatch consts inside ui/chrome.ts — and the two
 * had drifted (brass vs gold, stale fallbacks from a pre-refit skin).
 * Now the stylesheet owns NO values. Everything below is injected onto
 * `:root` at boot, and the chrome painter imports the same objects, so
 * a material can never disagree with itself again.
 *
 * Laws:
 * - ONE TRUTH. No hex literal may be added to style.css that exists
 *   here; no swatch may be added here without a CSS custom property.
 * - LADDERS, NOT NUMBERS. New sizes come from the type/space/radius/
 *   stroke ladders. A bare px in a stylesheet is a defect.
 * - REM IS THE RULER. Every ladder value is rem so the whole interface
 *   rides the root scale (ui/kit/scale.ts). Only true hairline art may
 *   ever reason in device pixels.
 */
/**
 * THE INK — the world's outline-shader color (renderer STRUCT_OUTLINE
 * and the icons' eight-tap ring). The Ink Pass makes it a UI material:
 * every raised or sunken piece of furniture wears this same bold line,
 * so a button and the axe painted on it finally speak one language.
 */
export declare const INK = "#241a2e";
/** Structure: riveted case bands, key buttons. */
export declare const IRON: {
    rim: string;
    base: string;
    lit: string;
    dark: string;
};
/** The touchable: action ingots, brackets, crests, fillet lines. */
export declare const BRASS: {
    rim: string;
    base: string;
    lit: string;
    dark: string;
};
/** The field everything sits in. */
export declare const LEATHER: {
    seam: string;
    echo: string;
};
/** The documents: blueprint sheets, title banners. */
export declare const PAPER: {
    field: string;
    edge: string;
    rim: string;
    ink: string;
};
/** The case-bottom leather field — CSS `--panel` and the painter agree. */
export declare const PANEL_FILL = "#262019";
/** The recessed well floor — CSS `--sunk` and the painter agree. */
export declare const SUNK_FILL = "#191510";
/**
 * THE SUEDE BED — the floor of a FILLED well. The icons wear the
 * world's dark outline ring, and a ring only cuts against ground
 * lighter than itself: on the near-black well floor the shader was
 * invisible. Occupied wells are lined with this warm mid suede so
 * every icon pops the way it does standing in the world; empty wells
 * keep the quiet dark floor so a bare pack never glares.
 */
export declare const BED_FILL = "#71603f";
export declare const PALETTE: Record<string, string>;
/** Type ladder: six steps. Names say the job, not the size. */
export declare const TYPE: Record<string, string>;
/** Space ladder: the only gaps and paddings there are. */
export declare const SPACE: Record<string, string>;
/** Rounding: chips, plates, and the case. Chamfers stay painted. */
export declare const RADIUS: Record<string, string>;
/** Strokes: the three line weights. */
export declare const STROKE: Record<string, string>;
/**
 * THE BOTTOM LANES — the south edge is shared real estate: hotbar,
 * action strip, loot tray, sign tray, build tray all park here. Their
 * altitudes were five hand-tuned constants that had to agree by luck;
 * now they are one stack.
 */
export declare const LANES: Record<string, string>;
/**
 * Publish the whole truth to `:root`. Called at boot before any panel
 * shows — the stylesheet holds no values of its own.
 */
export declare function installTokens(): void;
//# sourceMappingURL=tokens.d.ts.map