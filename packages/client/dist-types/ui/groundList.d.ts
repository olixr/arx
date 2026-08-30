import type { EntityId, ItemRoll, RarityTier } from '@arx/shared';
/**
 * THE GILDED HAND — the one ground ledger (looting v2).
 *
 * Both rooms that talk about loot lying at your feet — the quick tray
 * and the inventory's "On the ground" pane — render through this one
 * component, so the laws live once:
 *
 * - THE RARITY LEDGER: rows read best-first — rarity band descending,
 *   sticky first-seen order inside a band. The pad cursor is never
 *   reshuffled under the hand; a newcomer enters its band, animated,
 *   and everyone else keeps their seat.
 * - THE HERO ROW: with more than one pile, "Everything here" leads the
 *   list — the biggest button, the pad's landing spot, one press.
 * - THE HAND MOVES ON: rows are KEYED DOM. A taken row retires with a
 *   motion (its nav seat vacates instantly, so the ring slides to the
 *   next take without a beat), a landing row slides in, a growing
 *   stack pulses its count. The list never rebuilds wholesale.
 * - ONWARD: when the reach is picked clean but more lies within the
 *   horizon, the list offers the walk as a single focused act.
 */
export interface GroundLoot {
    eid: EntityId;
    x: number;
    y: number;
    /** Distance from the player, tiles. */
    d: number;
    itemId: string;
    qty: number;
    roll?: ItemRoll;
}
/** The tier a pile speaks with (instance roll wins; else value-derived). */
export declare function groundTier(l: Pick<GroundLoot, 'itemId' | 'roll'>): RarityTier;
/**
 * THE RARITY LEDGER's whole law, pure: assign sticky first-seen ranks
 * to newcomers (mutating `sticky` in arrival order), then sort rarity
 * band descending with sticky rank breaking ties. Re-running with the
 * same survivors never reorders them.
 */
export declare function arrangeLoot(loot: GroundLoot[], sticky: Map<EntityId, number>): GroundLoot[];
/**
 * ONWARD, pure: the next stop past arm's reach — the nearest far pile
 * carries the walk, the count tells what's waiting out there.
 */
export declare function onwardSummary(far: GroundLoot[]): {
    eid: EntityId;
    count: number;
    dist: number;
} | null;
export interface GroundListHooks {
    pickup: (eid: EntityId) => void;
    takeAll: () => void;
    /** Present = the list may offer the ONWARD walk. */
    onward?: (eid: EntityId) => void;
}
export declare class GroundList {
    private readonly list;
    /** Nav-key prefix ('loot' for the tray, 'gnd' for the pane). */
    private readonly prefix;
    private readonly hooks;
    private readonly opts;
    private rows;
    private sticky;
    private hero;
    private onwardRow;
    /** Last render's ledger order — the focus laws read the TOP row. */
    private ordered;
    private sig;
    constructor(list: HTMLElement, 
    /** Nav-key prefix ('loot' for the tray, 'gnd' for the pane). */
    prefix: string, hooks: GroundListHooks, opts?: {
        dragToPack?: boolean;
    });
    /** The pad's landing spot when this ledger opens fresh. */
    get takeAllKey(): string;
    /** Default focus for the current shape: the sweep, or the one take. */
    bestFocusKey(): string | null;
    /** Forget everything (a fresh open animates a fresh arrival). */
    reset(): void;
    /** Live refresh: `loot` within reach, `far` between reach and horizon. */
    update(loot: GroundLoot[], far?: GroundLoot[]): void;
    private render;
    /** A row's farewell: nav seat gone now, body fades, then leaves. */
    private retire;
    private paintSub;
    /** The rarity census dots on the hero row — the sweep's promise. */
    private paintPips;
    private buildHero;
    private buildOnward;
    private buildRow;
    /**
     * THE OPEN GROUND's forward gesture: drag a ground row into the
     * pack column and the take is the drop. The ghost is the row's own
     * icon; releasing anywhere else just sets it back down.
     */
    private armDrag;
    private packUnder;
}
//# sourceMappingURL=groundList.d.ts.map