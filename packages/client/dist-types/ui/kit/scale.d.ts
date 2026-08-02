/**
 * THE ONE RULER — the interface's single scale (The Grand Refit, Ph 1).
 *
 * The UI is designed on a 1920×1080 reference canvas. At boot and on
 * every resize this module measures the real viewport against that
 * canvas and sets the root font size, so every rem in the stylesheet —
 * which is every size there is — renders the same COMPOSITION on a
 * 1080p TV, a 1440p desk, or a 4K panel. Nothing is ever px-capped
 * into a corner of a big display again.
 *
 * Laws:
 * - THE COMPOSITION IS THE CONSTANT. Scale follows min(vw/1920,
 *   vh/1080): the whole design grows together, never one axis.
 * - EIGHTH STEPS. Scale snaps to 1/8 so the painted 9-slice chrome
 *   (drawn 5× oversampled) lands on clean device pixels and stays
 *   crisp to the 2.75 ceiling.
 * - THE COUCH GETS A SAY. The player's `Interface size` setting
 *   (Snug / Standard / Grand) multiplies the automatic scale — the
 *   ten-foot answer without a special TV mode.
 *
 * The world canvas is untouched: `arx.zoom` frames the WORLD, this
 * frames the INTERFACE, and the two never meet.
 */
/** The player's hand on the ruler. */
export declare const UI_SIZES: readonly [{
    readonly id: "snug";
    readonly label: "Snug";
    readonly mult: 0.9;
}, {
    readonly id: "standard";
    readonly label: "Standard";
    readonly mult: 1;
}, {
    readonly id: "grand";
    readonly label: "Grand";
    readonly mult: 1.15;
}];
export type UiSizeId = (typeof UI_SIZES)[number]['id'];
/** Restore the saved size and take up the ruler. Call once at boot. */
export declare function installScale(): void;
export declare function uiSize(): UiSizeId;
export declare function setUiSize(id: UiSizeId): void;
//# sourceMappingURL=scale.d.ts.map