import type { S2CArenaBoard } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
/**
 * THE STAKES BOARD (docs/arena-plan.md) — the ringmaster's counter.
 *
 * Server-opened (the shopopen law): the arena dialogue hook's good
 * ending drops the frame and raises this screen with the venue's
 * whole card in hand. Every plate is one match card: name, blurb,
 * the level seal worn as a shield, round studs, the stake as coin —
 * and a rank gate SHOWN, never hidden (the price in rank is part of
 * the intrigue; a locked plate says what it wants). The foot carries
 * THE STANDING: the buyer's rank on the brass crest medal, the
 * crowd's name for them, the record in cards, and the climb to the
 * next rung — with the next NAMED rung as the carrot (a title waits,
 * not just a number).
 *
 * Buying sends one C2S verb and closes the board — the muster
 * ceremony answers from the server (or a refusal speaks overhead).
 * Routes through main.ts's one-screen gate like every other screen.
 *
 * PAD-FIRST (the Grand Refit law, ui/padUI.ts): every plate is a
 * `[data-nav]` stop inside the cards' `[data-region]`, so the ring
 * walks the card list and never bleeds sideways; the board names its
 * own seat on open (THE HERO LANDING — the first plate you could
 * actually buy, never the ✕ chip); and a locked plate stays a STOP
 * rather than a hole in the walk — its rank chip already says what it
 * wants, and Ⓐ on it refuses in place instead of going quiet.
 */
export declare class ArenaBoard {
    private readonly game;
    private readonly hooks;
    private readonly panel;
    private readonly title;
    private readonly cards;
    private readonly ladder;
    private refuseTimer;
    constructor(game: ClientGame, hooks?: {
        requestFocus?: (key: string) => void;
    });
    /** A locked plate's spoken no — color only, in place, no shake. */
    private refuse;
    get isOpen(): boolean;
    open(b: S2CArenaBoard): void;
    close(): void;
}
//# sourceMappingURL=arenaBoard.d.ts.map