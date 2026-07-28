import type { ClientGame } from '../game/clientGame.js';
/**
 * The ground manager: everything lying within reach, as a list you
 * can actually choose from — the answer to a battlefield of
 * overlapping bags. Each row is one pile (the server already merged
 * twins): icon, rarity-tinted instance name, count, and a Take
 * button; Take All sweeps the lot. Rows carry the same inspect
 * dataset as pack cells, so hover (mouse) and focus (pad) raise the
 * full item card — rolled affixes, enchants and all — for gear you
 * haven't picked up yet.
 *
 * The list is LIVE (drops land, merge, get taken by someone else) but
 * row ORDER is sticky: existing piles keep their place, newcomers
 * append, so a pad cursor never has the list reshuffled under it.
 */
export declare class LootPanel {
    private readonly game;
    private readonly panel;
    private readonly list;
    /** Where the panel was opened — walking away from here closes it. */
    private anchor;
    /** Sticky row order: pile eid → row rank. */
    private order;
    private nextRank;
    private sig;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    open(): void;
    close(): void;
    /** Called every frame with the player's position (anchor law). */
    update(px: number, py: number): void;
    private refresh;
}
//# sourceMappingURL=lootPanel.d.ts.map