/**
 * THE CONTEXT SHEET — the one grammar for secondary verbs
 * (The Grand Refit, Phase 2; wired game-wide in Phase 3).
 *
 * Today the item verb menu exists only for pack cells; the bank, the
 * store, the codex and every other collection improvise inline
 * buttons instead. The sheet generalizes it: ANY focusable can offer
 * verbs, Ⓨ (or right-click) opens them AT the element, and the ring
 * is modal inside until a verb lands or Ⓑ closes it.
 *
 * Laws:
 * - THE VERB COMES TO THE HAND. The sheet opens beside its anchor,
 *   clamped on-screen — focus never travels to reach it.
 * - ONE SHEET. A singleton: opening it anywhere closes it everywhere.
 * - IT HAS A FLOOR. Max height and a scroll region are defined —
 *   the one thing the old menu never had.
 * - VERBS FAN OUT. On a pad, a short list of verbs is a WHEEL around
 *   the anchor: flick the stick at one, release Ⓐ. A list is the
 *   slowest shape a stick can read; a wheel is one motion, and the
 *   DOM, the buttons and the clicks are identical either way.
 */
export interface SheetVerb {
    /** Text, or a node (a glyphLine with seat chips set into it). */
    label: string | HTMLElement;
    act: () => void;
    /** Ember-tinted, set apart at the bottom (Drop, Abandon…). */
    danger?: boolean;
    disabled?: boolean;
    /**
     * THE SEAT ANSWERS ITS OWN BUTTON: while the sheet is open,
     * pressing this raw pad button index chooses this verb directly —
     * the menu teaches the fight control by using it.
     */
    padButton?: number;
}
export declare function registerSheetProvider(prefix: string, provide: (el: HTMLElement) => SheetVerb[]): void;
/** Whether a focusable would offer verbs — the action strip's read. */
export declare function hasSheetVerbs(el: HTMLElement): boolean;
/** Open the sheet for a focusable via its provider. True if it did. */
export declare function openSheetFor(el: HTMLElement): boolean;
export declare function sheetOpen(): boolean;
/**
 * How many verbs the open sheet fans around its hub, or 0 when it is a
 * plain list. The pad grammar reads this to steer by stick angle.
 */
export declare function sheetRadialCount(): number;
/** Open the sheet beside `anchor`. Verbs in order; dangers sink. */
export declare function openSheet(anchor: HTMLElement, verbs: SheetVerb[], opts?: {
    onClose?: () => void;
}): void;
/** Close it. Returns true if a sheet was open (Ⓑ eats the press). */
export declare function closeSheet(): boolean;
/**
 * The verb standing on a raw pad button while the sheet is open, or
 * null. The pad grammar presses it INSTEAD of navigating.
 */
export declare function sheetPadVerb(btnIndex: number): HTMLButtonElement | null;
//# sourceMappingURL=contextSheet.d.ts.map