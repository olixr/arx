import type { ClientGame } from '../game/clientGame.js';
/**
 * The ground manager tray (THE GILDED HAND): everything lying within
 * reach as a best-first ledger you can actually choose from — the
 * answer to a battlefield of overlapping bags. Rendering, order, and
 * motion live in the shared GroundList (one component behind this
 * tray AND the inventory's ground pane); this shell owns the tray's
 * conversation:
 *
 * - THE ANCHOR LAW: opened here, closed by walking >3 tiles away —
 *   EXCEPT while ONWARD carries you: the errand keeps the tray open,
 *   and arrival at the next pile re-anchors it. The sweep is a
 *   rhythm, not a re-open.
 * - THE HERO LANDING: opening in pad mode lands the ring on Take all
 *   (or the lone Take) — one press before the hand ever moves.
 * - THE CHOSEN HAND CHIP: the walk-over toggle lives in the head,
 *   right where the itch is felt, beside its Settings twin.
 */
export declare class LootPanel {
    private readonly game;
    private readonly hooks;
    private readonly panel;
    private readonly ground;
    /** Where the panel was opened — walking away from here closes it. */
    private anchor;
    /** ONWARD in flight: the walk errand holds the tray open. */
    private traveling;
    private prefChip;
    constructor(game: ClientGame, hooks: {
        /** Land the pad ring on a navkey (main gates on pad mode). */
        requestFocus: (key: string) => void;
    });
    get isOpen(): boolean;
    open(): void;
    close(): void;
    /** ONWARD: walk to the next pile; the tray rides along. */
    private travel;
    /** Called every frame with the player's position (anchor law). */
    update(px: number, py: number): void;
    private refresh;
    /**
     * THE CHOSEN HAND's chip — built once, riding the hint line's right
     * end so the head keeps its full title (dressPanel assembles both
     * before the first open; main dresses panels at boot).
     */
    private ensurePrefChip;
    private paintPrefChip;
}
//# sourceMappingURL=lootPanel.d.ts.map