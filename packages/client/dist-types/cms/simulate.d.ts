import { type LootTableDef } from '@devcraft/content';
/**
 * The loot laboratory: run the REAL roller — the same rollLoot the
 * server calls on a kill — against the studio's current (possibly
 * unsaved) tables and show designers what actually falls. Numbers on
 * screen are observations, not promises, and say so.
 */
export interface SimAggregate {
    rolls: number;
    level: number;
    /** item id → occurrences (rolls that paid it) and total quantity. */
    items: Map<string, {
        hits: number;
        qty: number;
    }>;
    /** Average coin VALUE per roll, from the item catalog. */
    evCoins: number;
    emptyRolls: number;
}
/** Roll a table N times through the live studio registry. */
export declare function simulate(tableId: string, level: number, rolls?: number, draft?: LootTableDef): SimAggregate;
/**
 * Analytic per-entry share for the entry table's bars: each-mode
 * entries show their own chance; pick-mode entries show weight over
 * the pool (times average picks). Composed tables show the share of
 * reaching the sub-table, not its interior odds.
 */
export declare function entryShare(def: LootTableDef, entryIndex: number): number;
//# sourceMappingURL=simulate.d.ts.map