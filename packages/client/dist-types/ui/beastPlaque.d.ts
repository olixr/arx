import type { ClientGame } from '../game/clientGame.js';
/**
 * THE QUIET CREST — the friend at your heel, worn small in the top-left
 * corner where the ally frame belongs: out of the action band above the
 * hotbar it used to tower over, and clear of the chat (bottom-left) and
 * the errand tracker (top-right). A smoked-glass capsule in the quiet
 * console's material carries the crest medallion with the painted
 * portrait, the name with its level gem, and a slim vigor sliver with
 * the trailing damage ghost. The state word speaks only when it has
 * something to say — downed, resting, or catching up swap in where the
 * name sits; a plain heel says nothing at all. The one state ring
 * still tells the truth that matters now: the rest clock draining
 * blue, or the reopened bond breathing gold beside the treat it asks
 * for. No idle motion — the crest moves only when something happens.
 *
 * One companion, one crest (the heel friend, or the nearest resting
 * one). DOM writes land only on change — the perf law of the HUD.
 * Clicking the crest is still the pat (THE QUIET HEEL).
 */
export declare class BeastPlaque {
    private readonly root;
    private readonly face;
    private readonly nameEl;
    private readonly lvlEl;
    private readonly hpFill;
    private readonly hpGhost;
    private readonly stateEl;
    private readonly offer;
    private readonly ring;
    private key;
    /** Last seen hp for the shown slot — the hurt-jolt trigger. */
    private lastSlot;
    private lastHp;
    /** Fires on a press — the pat channel (server range-gates it). */
    onPat: (() => void) | null;
    constructor();
    /** Called once per frame — cheap, writes only on change. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=beastPlaque.d.ts.map