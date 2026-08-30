import type { ClientGame } from '../game/clientGame.js';
/**
 * THE ONE CONTROL, ONE TRUTH: is the walk-away on offer? A member may
 * leave before the gates come down, and only then — never a spectator,
 * never mid-card. The HUD chip's visibility and the pad's Ⓨ verb both
 * read THIS function, so the button and the thing you can see can
 * never promise different things.
 */
export declare function canWalkAway(game: ClientGame): boolean;
export declare class ArenaHud {
    private readonly root;
    private readonly head;
    private readonly pips;
    private readonly word;
    private readonly count;
    private readonly countWord;
    private readonly bar;
    private readonly leave;
    private key;
    private spanMs;
    private phaseSeen;
    private countShown;
    private beatSec;
    /** Wired by main.ts: the walk-away verb (C2S arenaleave). */
    onLeave: (() => void) | null;
    /**
     * Wired by main.ts: THE COUNT SPEAKS — one beat per closing second
     * of a member's muster/breather clock (never for the stands).
     */
    onCountBeat: ((secs: number) => void) | null;
    constructor();
    update(game: ClientGame): void;
}
//# sourceMappingURL=arenaHud.d.ts.map