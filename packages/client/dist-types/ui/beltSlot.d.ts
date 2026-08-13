import type { InvSlot } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
/**
 * THE BELT — a fifth well on the hotbar holding one consumable, fired
 * by a single press (1 on keys, d-pad ▼ on a pad) so a dire moment
 * never costs a trip into the pack.
 *
 * Laws:
 * - THE PIN IS A PREFERENCE, NOT A PROMISE. "Set on belt" pins an item
 *   ID (never a slot index — the server replaces the inventory array
 *   whole, and tidy-sorts reorder it). While any of that item remains
 *   in the pack, the belt serves it.
 * - THE BELT REFILLS ITSELF. With the pin absent (or none set), the
 *   belt falls forward to the heartiest meal in the pack — highest
 *   heals wins, lowest slot breaks ties. Tonics with no heal are never
 *   auto-picked; a buff is a plan, a meal is a rescue.
 * - THE PIN SURVIVES THE FAMINE. Running dry does not clear the pin;
 *   restock the item and the belt goes back to serving it.
 */
/** What the belt would serve right now, or null for an empty belt. */
export interface BeltPick {
    /** Inventory slot index to send in the use message. */
    slot: number;
    item: string;
    /** Total quantity across every stack of the item, for the badge. */
    qty: number;
    /** True when the fallback stepped in for an absent pinned item. */
    fallback: boolean;
}
/** A thing the belt may hold: it heals or it grants a consumed buff. */
export declare function beltEligible(id: string): boolean;
/**
 * Resolve the belt against the live pack. Pure — the widget, the use
 * press, and the tests all ask this one question.
 */
export declare function resolveBelt(inventory: readonly InvSlot[], pinned: string | null): BeltPick | null;
/** The pinned item id, or null when the belt trusts the fallback. */
export declare function beltPin(): string | null;
export declare function setBeltPin(id: string | null): void;
/**
 * The belt well itself: rides the hotbar row a breath after the sigil,
 * wearing the same smoked-glass socket, an item icon, a count, and the
 * device-aware key badge. Pressing it is the same as pressing the key.
 */
export declare class BeltSlot {
    private readonly root;
    private readonly icon;
    private readonly count;
    private renderedKey;
    constructor(onUse: () => void);
    /** Called once per frame — DOM writes only when the pick changes. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=beltSlot.d.ts.map