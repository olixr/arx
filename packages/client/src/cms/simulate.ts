import { rollLoot, type LootTableDef } from '@devcraft/content';
import { state } from './cms.js';

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
  items: Map<string, { hits: number; qty: number }>;
  /** Average coin VALUE per roll, from the item catalog. */
  evCoins: number;
  emptyRolls: number;
}

/** Roll a table N times through the live studio registry. */
export function simulate(tableId: string, level: number, rolls = 200, draft?: LootTableDef): SimAggregate {
  const tables = new Map<string, LootTableDef>(state.loot.map((t) => [t.def.id, t.def]));
  if (draft) tables.set(draft.id, draft);
  const items = new Map<string, { hits: number; qty: number }>();
  let coinValue = 0;
  let empty = 0;
  const values = new Map(state.items.map((i) => [i.id, i.value]));
  for (let i = 0; i < rolls; i++) {
    let drops: Array<{ item: string; qty: number }> = [];
    try {
      drops = rollLoot(tableId, { level, rand: Math.random }, tables);
    } catch {
      break; // a broken draft mid-edit just shows nothing
    }
    if (drops.length === 0) empty++;
    for (const d of drops) {
      const rec = items.get(d.item) ?? { hits: 0, qty: 0 };
      rec.hits++;
      rec.qty += d.qty;
      items.set(d.item, rec);
      coinValue += (values.get(d.item) ?? 0) * d.qty;
    }
  }
  return { rolls, level, items, evCoins: coinValue / Math.max(1, rolls), emptyRolls: empty };
}

/**
 * Analytic per-entry share for the entry table's bars: each-mode
 * entries show their own chance; pick-mode entries show weight over
 * the pool (times average picks). Composed tables show the share of
 * reaching the sub-table, not its interior odds.
 */
export function entryShare(def: LootTableDef, entryIndex: number): number {
  const e = def.entries[entryIndex];
  if (!e) return 0;
  if (def.mode !== 'pick') return Math.min(1, e.chance ?? 1);
  const totalW = def.entries.reduce((sum, x) => sum + (x.w ?? 1), 0) + (def.nothingW ?? 0);
  if (totalW <= 0) return 0;
  const picksAvg = def.picks ? (def.picks[0] + def.picks[1]) / 2 : 1;
  return Math.min(1, ((e.w ?? 1) / totalW) * picksAvg);
}
