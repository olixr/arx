import type { ClientGame } from '../game/clientGame.js';
/**
 * THE COMPANION PLAQUE — the friend at your heel, promoted out of the
 * buff-chip tray into a standing piece of the HUD: a crest medallion
 * carrying the animal's painted portrait on its suede bed, a cut-plate
 * nameplate with the level gem, a bold ink-rimmed vigor gauge with a
 * trailing damage ghost, and one state ring that speaks whichever
 * truth matters now — the rest clock draining blue, or the reopened
 * bond breathing gold beside the treat it is asking for.
 *
 * One companion, one plaque (the heel friend, or the nearest resting
 * one). DOM writes land only on change — the perf law of the HUD.
 * Clicking the plaque is still the pat (THE QUIET HEEL).
 */
export declare class CompanionPlaque {
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
//# sourceMappingURL=companionPlaque.d.ts.map