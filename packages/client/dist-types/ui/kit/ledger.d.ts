/**
 * THE LEDGER — the paged collection (The Grand Refit, Phase 2).
 *
 * NOTHING LIVES BELOW THE FOLD: a ledger never hides rows behind a
 * scrollbar. It measures how many rows fit the space it was given,
 * deals the collection into LEAVES of that many, and turns leaves
 * whole — page dots underneath, prev/next keys beside them, triggers
 * stepping them on the pad (wired in Phase 3 via `data-pager`).
 *
 * The rows themselves are the caller's to render (bespoke rooms);
 * the leaf-turn, the dots, and the "everything visible" guarantee
 * are the kit's.
 */
export interface Ledger<T> {
    root: HTMLElement;
    /** Replace the collection; keeps the current leaf when possible. */
    setItems(items: T[]): void;
    /** Turn a leaf: -1 back, +1 forward. Wraps nothing — edges hold. */
    page(dir: -1 | 1): void;
    /** Re-measure and re-deal (call after a resize or reflow). */
    refit(): void;
}
export declare function createLedger<T>(opts: {
    renderRow: (item: T, index: number) => HTMLElement;
    /** Fallback rows per leaf before the first honest measure. */
    seedRows?: number;
    /** One quiet line for the empty case (quartermaster voice). */
    emptyLine?: string;
    /** Open on this leaf (a re-render keeping the reader's place). */
    initialLeaf?: number;
    /** The leaf turned — callers remember the reader's place with it. */
    onLeaf?: (leaf: number) => void;
}): Ledger<T>;
//# sourceMappingURL=ledger.d.ts.map