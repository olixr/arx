/**
 * THE WORK CARD — the craft batch's voice on the live HUD.
 *
 * Starting a craft closes the Workshop and hands the moment to the
 * world: you watch your character work the station while this card
 * rides above the hotbar carrying the recipe's face, a fill bar timed
 * to the exact item duration, and the batch tally the server now
 * shares ("4 of 28"). Two bars, two truths: the bright bar is THIS
 * item (the hammer's rhythm), the thin bar under it is the whole
 * batch (the journey). Both animate by CSS transition — one style
 * write per item, never a per-frame write (HUD write-on-edge law).
 *
 * Ends wear a face: done flips to "Work done" with the tally and a
 * gold breath; setting the tools down says "Work set down"; running
 * dry says "Out of materials" in ember. A card with nothing to say
 * (stopped at zero made) simply leaves.
 *
 * The card ducks while any screen owns the stage — the reopened
 * Workshop's own busy strip speaks for the work there.
 */
export interface WorkBeat {
    /** Recipe display name — "Bronze bar". */
    name: string;
    /** Output item id for the plaque icon; null falls back to the hammer glyph. */
    icon: string | null;
    /** The station face's label — "Smelting". */
    label: string;
    /** The station face's accent color. */
    accent: string;
    /** Items finished before this one began. */
    made: number;
    /** Batch size asked for. */
    total: number;
    /** Items each run of the recipe yields. */
    outQty: number;
    /** This item's duration. */
    durationMs: number;
}
export declare class CraftHud {
    private root;
    private plaque;
    private img;
    private kicker;
    private nameEl;
    private countEl;
    private fill;
    private batchBar;
    private batchFill;
    private hint;
    private visible;
    private holdTimer;
    private leaveTimer;
    /** The last beat's face — the end ceremony reads its tally from this. */
    private cur;
    /** Write-on-edge caches: only touch the DOM when the value moves. */
    private wroteIcon;
    private wroteKicker;
    private wroteName;
    private wroteCount;
    constructor(onStop: () => void);
    /** An item began — raise the card if needed and wind the bars. */
    beat(b: WorkBeat): void;
    /** The batch ended — wear the right face, then leave the stage. */
    end(reason: string | undefined, made: number | undefined): void;
    /** Screens own the stage — the card steps aside while one is open. */
    duck(hidden: boolean): void;
    private leave;
    private clearTimers;
    private write;
}
//# sourceMappingURL=craftHud.d.ts.map