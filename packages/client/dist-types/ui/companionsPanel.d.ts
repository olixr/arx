/**
 * THE COMPANY YOU KEEP (docs/companions-plan.md) — the companions'
 * own room, wholly apart from the Beasts hall: no stats, no arts, no
 * stalls, because a companion HAS none of those. One rail of kept
 * friends on the left, THE STANDING for the friend under regard —
 * portrait, its own story, the journey line, and the three verbs
 * (call, send home, part) plus the rename.
 *
 * The room opens anywhere (company is a menu decision, never a pen
 * fixture — the server holds the same law), renders purely off the
 * S2CCompanions mirror, and re-proves nothing: every act rides the
 * wire and the mirror's echo retells the room.
 */
import { type CompanionInfo } from '@arx/shared';
interface CompanyGame {
    ownCompanions: CompanionInfo[];
}
export declare class CompanionsPanel {
    private readonly root;
    private readonly rail;
    private readonly standing;
    /** The slot under regard. */
    private selSlot;
    /**
     * THE DELIBERATE GOODBYE: parting is armed on the first press and
     * fires on the second (the stalls' release discipline). Any other
     * act clears the arm.
     */
    private partArmed;
    onOp: ((op: 'heel' | 'home' | 'part', slot: number) => void) | null;
    onRename: ((slot: number, current: string) => void) | null;
    constructor();
    get isOpen(): boolean;
    open(game: CompanyGame): void;
    close(): void;
    /** The mirror moved (S2CCompanions): retell whatever is on stage. */
    refresh(game: CompanyGame): void;
    private lastGame;
    private render;
    private renderRail;
    private renderStanding;
}
export {};
//# sourceMappingURL=companionsPanel.d.ts.map