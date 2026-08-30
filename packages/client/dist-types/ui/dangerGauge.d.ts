/**
 * THE NORTHWEST COLUMN's one door: the top-left corner is a single
 * flex lane (danger gauge over companion crest — CSS `order` seats
 * the rows, so construction order never matters). Idempotent: the
 * first chip to mount builds the column, the rest join it.
 */
export declare function hudNorthwest(): HTMLElement;
export declare class DangerGauge {
    private readonly el;
    private readonly pips;
    private readonly word;
    private readonly band;
    private shownTier;
    private hidden;
    constructor();
    /**
     * Per-frame. `tier` is the danger field at the walker's feet, or
     * null to stand the gauge down (underground, cinema, build mode —
     * the dark and the workbench keep their own chrome).
     */
    update(tier: number | null): void;
}
//# sourceMappingURL=dangerGauge.d.ts.map