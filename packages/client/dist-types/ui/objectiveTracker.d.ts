import type { ClientGame } from '../game/clientGame.js';
/**
 * THE ERRAND CARD — the followed quest's live face on the HUD.
 *
 * Smoked-glass tier (the live HUD only whispers), but a card that
 * answers the three questions a walker actually has: WHAT is left
 * (asks with meters, met asks checked off), WHERE it is (a live
 * compass needle and paces toward the current ask's neighborhood),
 * and WHO settles it (the return line turns gold and names them the
 * moment the work is done). The card is a door, not a poster: press
 * it to open the journal at this errand, press the chart glyph to
 * ring the ask's whereabouts on the map.
 *
 * Structure repaints only when the ledger moves (questVersion); the
 * compass line alone breathes per frame, on cached writes.
 */
export declare class ObjectiveTracker {
    private readonly game;
    private readonly tracked;
    private readonly hooks;
    private readonly el;
    private readonly nameEl;
    private readonly partEl;
    private readonly chartBtn;
    private readonly rows;
    private readonly foot;
    private readonly needle;
    private readonly bearEl;
    private renderedVersion;
    private renderedId;
    /** The compass line's cached words — write DOM only on change. */
    private lastBearWord;
    private lastNeedleShown;
    constructor(game: ClientGame, tracked: () => string | null, hooks: {
        /** Open the journal at this errand's page. */
        onOpen(questId: string): void;
        /** Ring an ask's neighborhood on the chart. */
        onShowArea(ring: {
            x: number;
            y: number;
            r: number;
            label: string;
            quest: string;
        }): void;
    });
    /** Per-frame from the main loop. hidden=true suppresses (screens, cinema, build). */
    update(hidden: boolean): void;
    /** The card's bones — only when the ledger moves. */
    private renderStructure;
    /**
     * The breathing line: needle and paces toward the current ask, or
     * the gold return word once every ask is answered. Cached writes —
     * the needle turns every frame, the words only when they change.
     */
    private updateCompass;
}
//# sourceMappingURL=objectiveTracker.d.ts.map