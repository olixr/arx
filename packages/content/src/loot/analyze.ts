import { itemDef } from '../items.js';
import type { LootEntryDef, LootTableDef } from './types.js';
import { LOOT_TABLES } from './tables.js';

/**
 * Analytic expected yield of one table roll — the balance instrument.
 * Pure table math (no ctx.level, no player state): the same numbers a
 * content author reasons about when weighing a rack. The flood-law test
 * bounds every foe's per-kill expectation with this; the CMS lab shows
 * it beside the simulated histogram.
 *
 * maxDrops is ignored (a cap only ever lowers the true expectation), so
 * these figures are upper bounds on capped tables — exactly the
 * conservative direction a balance ceiling wants.
 */
export interface LootYield {
  /** Expected item stacks paid per roll, nested references included. */
  stacks: number;
  /** Expected EQUIPMENT stacks per roll: gear, relics, sigils, heirlooms. */
  gearStacks: number;
}

export function expectedYield(
  tableId: string,
  tables: ReadonlyMap<string, LootTableDef> = LOOT_TABLES,
): LootYield {
  const table = tables.get(tableId);
  if (!table) return { stacks: 0, gearStacks: 0 };
  return yieldOf(table, tables, 1, 0);
}

/** Mirrors rollInto's MAX_DEPTH so the math never diverges from the roll. */
const MAX_DEPTH = 8;

function yieldOf(
  table: LootTableDef,
  tables: ReadonlyMap<string, LootTableDef>,
  chanceMult: number,
  depth: number,
): LootYield {
  if (depth > MAX_DEPTH) return { stacks: 0, gearStacks: 0 };
  let stacks = 0;
  let gearStacks = 0;
  if ((table.mode ?? 'each') === 'pick') {
    const [lo, hi] = table.picks ?? [1, 1];
    const picks = (lo + hi) / 2;
    let total = table.nothingW ?? 0;
    for (const e of table.entries) total += (e.w ?? 1) * chanceMult;
    if (total > 0) {
      for (const e of table.entries) {
        const p = ((e.w ?? 1) * chanceMult) / total;
        const y = entryYield(e, tables, 1, depth);
        stacks += picks * p * y.stacks;
        gearStacks += picks * p * y.gearStacks;
      }
    }
    return { stacks, gearStacks };
  }
  for (const e of table.entries) {
    const p = Math.min(1, (e.chance ?? 1) * chanceMult);
    const y = entryYield(e, tables, chanceMult, depth);
    stacks += p * y.stacks;
    gearStacks += p * y.gearStacks;
  }
  return { stacks, gearStacks };
}

/** Yield of one resolved entry — an item pays one stack, a ref recurses. */
function entryYield(
  e: LootEntryDef,
  tables: ReadonlyMap<string, LootTableDef>,
  chanceMult: number,
  depth: number,
): LootYield {
  if (e.table) {
    const sub = tables.get(e.table);
    if (!sub) return { stacks: 0, gearStacks: 0 };
    return yieldOf(sub, tables, chanceMult * (e.mult ?? 1), depth + 1);
  }
  if (e.pool === 'heirloom') return { stacks: 1, gearStacks: 1 };
  const def = e.item ? itemDef(e.item) : undefined;
  const isGear = def !== undefined && (def.gear !== undefined || def.relic || def.sigil);
  return { stacks: 1, gearStacks: isGear ? 1 : 0 };
}
