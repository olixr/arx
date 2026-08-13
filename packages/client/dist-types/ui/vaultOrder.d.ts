/**
 * THE VAULT'S SHELVING ORDER — the pure comparator behind the wall.
 *
 * The vault sorts the same way the pack tidies (THE TIDY HAND,
 * panels.tidyPack): Kind walks coins, then gear, then food, then
 * materials, alphabetical inside each family; Worth ranks piles by
 * what they would fetch (vendor value × count). A-Z and Stock keep
 * the old plain orders. Pure so the node test runner can hold it to
 * account without a DOM.
 */
export type VaultSort = 'kind' | 'worth' | 'az' | 'qty';
export declare const VAULT_SORTS: ReadonlyArray<[VaultSort, string]>;
/** A pile's vendor worth — what the whole stack would fetch. */
export declare function pileWorth(item: string, qty: number): number;
/** Order stored piles for the vault wall. Does not mutate its input. */
export declare function orderVault(entries: ReadonlyArray<[string, number]>, mode: VaultSort): Array<[string, number]>;
//# sourceMappingURL=vaultOrder.d.ts.map