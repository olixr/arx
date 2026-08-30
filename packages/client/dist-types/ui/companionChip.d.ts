/**
 * THE COMPANY CHIP (docs/companions-plan.md) — the afield companion's
 * one quiet mark on the HUD. It seats itself in the northwest column
 * (THE NORTHWEST COLUMN law: every top-left chip JOINS #hud-northwest
 * via hudNorthwest(), CSS `order` decides the stack — never a bare
 * pinned corner), below the danger gauge and the beast plaque.
 *
 * Deliberately smaller than the beast plaque beside it: no vigor bar
 * (company cannot be hurt), no level gem (company has no ladder), no
 * ring clocks (company keeps no clocks). A portrait, a name, and a
 * state word only when it has news — trailing is the whole roster of
 * news a companion can have. Idle motion: none (THE QUIET CREST law).
 * Click = the pat, exactly like the friend's own body.
 */
import type { ClientGame } from '../game/clientGame.js';
export declare class CompanionChip {
    private readonly root;
    private readonly face;
    private readonly name;
    private readonly state;
    private key;
    /** The pat — wired in main.ts to the friend's own interact. */
    onPat: (() => void) | null;
    constructor();
    update(game: ClientGame): void;
}
//# sourceMappingURL=companionChip.d.ts.map