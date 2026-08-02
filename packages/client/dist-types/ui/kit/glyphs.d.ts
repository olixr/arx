/**
 * THE DEVICE-TRUE GLYPH — the one legal way to name a button
 * (The Grand Refit, Phase 2).
 *
 * A seat chip carries BOTH languages — a key cap and a pad glyph —
 * and lets `body.pad-mode` pick which one shows, exactly the way the
 * hotbar and dock badges have always done it. Nothing that renders a
 * bare key letter into a sentence survives the refit: prose points at
 * a chip, the chip knows the device.
 *
 * Laws:
 * - EVERY GLYPH KNOWS ITS DEVICE. Never render `bindings.kbBadge()`
 *   output as text without its pad twin beside it.
 * - THE CHIP FOLLOWS THE KEYMAP. Callers re-render on
 *   `bindings.onChange` (the hotbar's discipline) — a chip is cheap,
 *   rebuild it, never mutate it.
 */
import { type ActionId } from '../../input/bindings.js';
/** A raw chip in one language. */
export declare function glyphChip(kind: 'kb' | 'pad', cls: string, text: string, small?: boolean): HTMLElement;
/**
 * The dual-language chip for an action: key cap + pad glyph, CSS-
 * swapped by device. Returns an empty span when the action has no
 * binding in either language (callers may hide it).
 */
export declare function seatChip(action: ActionId, opts?: {
    small?: boolean;
}): HTMLElement;
/**
 * A sentence with chips set into it: `glyphLine('Seat on •', chip)`
 * replaces each `•` with the next node — so prose never bakes a
 * letter in. Extra nodes append at the end.
 */
export declare function glyphLine(template: string, ...nodes: HTMLElement[]): HTMLElement;
//# sourceMappingURL=glyphs.d.ts.map