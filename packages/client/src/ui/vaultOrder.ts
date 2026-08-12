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

import { itemDef } from '@arx/content';

export type VaultSort = 'kind' | 'worth' | 'az' | 'qty';

export const VAULT_SORTS: ReadonlyArray<[VaultSort, string]> = [
  ['kind', 'Kind'],
  ['worth', 'Worth'],
  ['az', 'A-Z'],
  ['qty', 'Most stored'],
];

/** The pack's family ladder: coins first, then gear, food, materials. */
function kindRank(item: string): number {
  if (item === 'coins') return 0;
  const def = itemDef(item);
  return def?.equipSlot ? 1 : def?.heals ? 2 : 3;
}

/** A pile's vendor worth — what the whole stack would fetch. */
export function pileWorth(item: string, qty: number): number {
  return (itemDef(item)?.value ?? 0) * qty;
}

/** Order stored piles for the vault wall. Does not mutate its input. */
export function orderVault(
  entries: ReadonlyArray<[string, number]>,
  mode: VaultSort,
): Array<[string, number]> {
  const nameOf = (id: string): string => itemDef(id)?.name ?? id;
  const sorted: Array<[string, number]> = [...entries];
  sorted.sort(([a, an], [b, bn]) => {
    switch (mode) {
      case 'kind':
        return kindRank(a) - kindRank(b) || nameOf(a).localeCompare(nameOf(b));
      case 'worth':
        return pileWorth(b, bn) - pileWorth(a, an) || nameOf(a).localeCompare(nameOf(b));
      case 'qty':
        return bn - an || nameOf(a).localeCompare(nameOf(b));
      case 'az':
        return nameOf(a).localeCompare(nameOf(b));
    }
  });
  return sorted;
}
