import type { ClientGame } from '../game/clientGame.js';
/**
 * THE ERRAND CARD — the tracked quest's live face on the HUD.
 *
 * Smoked-glass tier (the live HUD only whispers): a small top-right
 * card with the quest's name and each ask as "label n/m", counts in
 * tabular figures so a ticking number never jitters the line. Ready
 * flips the name gold and says where to go. Pure presentation of the
 * pushed ledger — it holds no truth of its own.
 */
export declare class ObjectiveTracker {
    private readonly game;
    private readonly tracked;
    private readonly el;
    private readonly nameEl;
    private readonly rows;
    private renderedVersion;
    private renderedId;
    constructor(game: ClientGame, tracked: () => string | null);
    /** Per-frame from the main loop. hidden=true suppresses (screens, cinema, build). */
    update(hidden: boolean): void;
}
//# sourceMappingURL=objectiveTracker.d.ts.map