import { RARITY_TIERS, mintKeyPower, rarityIndex, type ItemRoll, type RarityTier } from '@devcraft/shared';
import { itemDef } from '../items.js';
import { dropRarityWeights } from '../equipment/tables.js';
import { heirloomFor, makeRoll, pickRarity } from '../equipment/roll.js';
import type { LootCtx, LootDrop, LootEntryDef, LootTableDef } from './types.js';
import { LOOT_TABLES } from './tables.js';

/**
 * The one resolver every loot origin calls. Pure given ctx.rand — the
 * server passes Math.random, tests pass a seeded fn. Rarity and
 * item-power laws live HERE, not at call sites: a kill, a chest, and a
 * quest reward all pay out under identical rules.
 */
export function rollLoot(
  tableId: string,
  ctx: LootCtx,
  tables: ReadonlyMap<string, LootTableDef> = LOOT_TABLES,
): LootDrop[] {
  const table = tables.get(tableId);
  if (!table) return [];
  const drops: LootDrop[] = [];
  rollInto(table, ctx, tables, 1, 0, drops);
  return drops;
}

/** Validation rejects reference cycles; the cap is a belt-and-braces stop. */
const MAX_DEPTH = 8;

function rollInto(
  table: LootTableDef,
  ctx: LootCtx,
  tables: ReadonlyMap<string, LootTableDef>,
  chanceMult: number,
  depth: number,
  out: LootDrop[],
): void {
  if (depth > MAX_DEPTH) return;
  if ((table.mode ?? 'each') === 'pick') {
    const [lo, hi] = table.picks ?? [1, 1];
    const picks = lo + Math.floor(ctx.rand() * (hi - lo + 1));
    let total = table.nothingW ?? 0;
    for (const e of table.entries) total += e.w ?? 1;
    for (let i = 0; i < picks; i++) {
      let draw = ctx.rand() * total;
      for (const e of table.entries) {
        draw -= e.w ?? 1;
        if (draw < 0) {
          resolveEntry(e, table, ctx, tables, 1, depth, out);
          break;
        }
      }
      // Remaining draw fell in the nothing-weight: this pick pays nothing.
    }
    return;
  }
  for (const e of table.entries) {
    const chance = (e.chance ?? 1) * chanceMult;
    if (chance < 1 && ctx.rand() > chance) continue;
    resolveEntry(e, table, ctx, tables, chanceMult, depth, out);
  }
}

function resolveEntry(
  e: LootEntryDef,
  table: LootTableDef,
  ctx: LootCtx,
  tables: ReadonlyMap<string, LootTableDef>,
  chanceMult: number,
  depth: number,
  out: LootDrop[],
): void {
  if (e.table) {
    const sub = tables.get(e.table);
    if (sub) rollInto(sub, ctx, tables, chanceMult * (e.mult ?? 1), depth + 1, out);
    return;
  }
  const item = e.pool === 'heirloom' ? heirloomFor(ctx.level, ctx.rand) : (e.item ?? null);
  if (!item) return;
  const [lo, hi] = e.qty ?? [1, 1];
  const qty = lo + Math.floor(ctx.rand() * (hi - lo + 1));
  // Pool picks are rolled gear by construction — craft-only sets
  // re-issued as heirlooms still arrive with a rarity and a power.
  out.push({ item, qty, roll: stampRoll(item, table, ctx, e.pool !== undefined) });
}

/**
 * Rarity + item-power stamping for one dropped instance. Gear flagged
 * for drop acquisition and all relics/sigils roll a rarity weighted by
 * the source's level (plus the table's rarityBonus, floored at its
 * minRarity); a source stronger than the def's native requirement
 * re-issues the piece at its own level unless the table opts out.
 */
function stampRoll(
  item: string,
  table: LootTableDef,
  ctx: LootCtx,
  force = false,
): ItemRoll | undefined {
  const def = itemDef(item);
  if (!def) return undefined;
  // Dungeon keys mint their own identity: tier weighted by the
  // source's level (floored by the table, so boss chests never pay
  // out worn commons), a fresh 32-bit seed — a dungeon nobody has
  // ever walked — and the tier's power with seeded jitter.
  if (def.dungeonKey) {
    const allowed = floorRarities(RARITY_TIERS, table.minRarity);
    const weights = dropRarityWeights(ctx.level + (table.rarityBonus ?? 0) + (ctx.rarityBonus ?? 0));
    const rar = pickRarity(weights, allowed, ctx.rand);
    const seed = Math.floor(ctx.rand() * 0x100000000) >>> 0;
    return { rar, seed, pwr: mintKeyPower(rar, seed) };
  }
  const gear = def.gear;
  const rollable = force || gear?.acquisition.drop || def.relic || def.sigil;
  if (!rollable) return undefined;
  const allowed = floorRarities(gear?.rarities ?? RARITY_TIERS, table.minRarity);
  const weights = dropRarityWeights(ctx.level + (table.rarityBonus ?? 0) + (ctx.rarityBonus ?? 0));
  const roll = makeRoll(pickRarity(weights, allowed, ctx.rand));
  if ((table.power ?? 'source') === 'source') {
    const native = gear?.levelReq?.level ?? 0;
    const pwr = ctx.level + Math.floor(ctx.rand() * 4);
    if (pwr > native) roll.pwr = pwr;
  }
  return roll;
}

/** Tiers at or above the floor — unless the def allows none, then as-is. */
function floorRarities(
  allowed: readonly RarityTier[],
  min: RarityTier | undefined,
): readonly RarityTier[] {
  if (!min) return allowed;
  const floored = allowed.filter((r) => rarityIndex(r) >= rarityIndex(min));
  return floored.length > 0 ? floored : allowed;
}

/**
 * Every concrete item a table can pay out, nested references included —
 * the audit surface for tests and content tools. Dynamic pools are
 * excluded (their membership depends on ctx.level).
 */
export function reachableItems(
  tableId: string,
  tables: ReadonlyMap<string, LootTableDef> = LOOT_TABLES,
  seen = new Set<string>(),
): Set<string> {
  const items = new Set<string>();
  const table = tables.get(tableId);
  if (!table || seen.has(tableId)) return items;
  seen.add(tableId);
  for (const e of table.entries) {
    if (e.item) items.add(e.item);
    if (e.table) for (const sub of reachableItems(e.table, tables, seen)) items.add(sub);
  }
  return items;
}
