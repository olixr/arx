import type { ClientGame } from '../game/clientGame.js';
/**
 * THE JOURNAL — the quest log (J). List left, the open page right.
 *
 * Groups by pull: Ready to turn in (the strongest) > Underway >
 * Resting (repeatables on cooldown) > Finished. THE GUIDANCE LAW
 * rules the page: the journal entry is written directions in the
 * world's voice — read it, know the land, go. No markers.
 *
 * Offerable-but-untaken quests are DELIBERATELY absent: you find work
 * by talking to the folk who wear the mark, not by reading a menu.
 *
 * Tracking is client-local (localStorage per character) — pure
 * presentation; the server never hears which page is dog-eared.
 */
export declare class QuestLog {
    private readonly game;
    private readonly panel;
    private readonly list;
    private readonly bench;
    private selected;
    private confirmAbandon;
    private renderedVersion;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    open(): void;
    close(): void;
    /** Quiet-wire hook: repaint only when open and only on change. */
    refresh(): void;
    private get trackKey();
    /** The dog-eared page: a valid active quest id, or a sensible default. */
    trackedId(): string | null;
    private setTracked;
    private render;
    private renderBench;
    private renderActiveBench;
    private renderDoneBench;
}
//# sourceMappingURL=questLog.d.ts.map