import type { RarityTier } from '@devcraft/shared';

/**
 * Loot tables — the one vocabulary for "a source pays out items".
 *
 * A table is a named, JSON-safe bundle of drop lines that any loot
 * origin resolves through `rollLoot(tableId, ctx)`:
 *
 *   - kill loot: NpcDef.loot lists table ids, rolled at the foe's level
 *   - interaction loot: NodeDef.bonusYield may name a table (chests and
 *     other lootable props resolve the same way when they land)
 *   - quest/reward loot: call rollLoot with the reward tier as ctx.level
 *
 * The resolver — not the caller — owns rarity weighting and item-power
 * stamping, so every origin pays out under the same laws. Tables
 * compose: an entry may reference another table (goblins share the
 * gutter arms rack with rats), and per-table calibration knobs
 * (rarityBonus, minRarity, power) let a rare foe pay out visibly better
 * without new code. Like the equipment schema, everything here is plain
 * data — a future content tool edits tables without touching code.
 */

export type LootMode =
  /** Every entry rolls independently (the default). */
  | 'each'
  /** Weighted draw of `picks` entries — at most one of a rack per kill. */
  | 'pick';

/** One drop line: exactly one of `item`, `table`, or `pool`. */
export interface LootEntryDef {
  /** Concrete item id. */
  item?: string;
  /** Another table, resolved inline — the composition mechanism. */
  table?: string;
  /**
   * Dynamic pool, sized at roll time. 'heirloom' = any rolled-gear def
   * whose native requirement sits HEIRLOOM_MIN_SURPLUS below ctx.level,
   * re-issued at the source's power (the heirloom law).
   */
  pool?: 'heirloom';
  /** Quantity range, inclusive. Default [1, 1]. */
  qty?: [number, number];
  /** each-mode: independent drop probability (0, 1]. Default 1. */
  chance?: number;
  /** pick-mode: selection weight. Default 1. */
  w?: number;
  /**
   * Table references only: scales the referenced table's each-mode
   * chances — "this camp carries the crypt rack at half rates".
   */
  mult?: number;
}

export interface LootTableDef {
  id: string;
  /** Authoring note, surfaced by content tools. */
  desc?: string;
  /** Default 'each'. */
  mode?: LootMode;
  /** pick-mode: how many draws, inclusive range. Default [1, 1]. */
  picks?: [number, number];
  /** pick-mode: weight of a draw paying nothing. Default 0. */
  nothingW?: number;
  entries: LootEntryDef[];
  /**
   * Rarity calibration: rolls weight rarities as if the source were
   * this many levels higher (or lower, negative). The "rare foe, better
   * loot" dial.
   */
  rarityBonus?: number;
  /** Rolled drops never land below this tier (where the def allows it). */
  minRarity?: RarityTier;
  /**
   * Item-power stamping. 'source' (default): a foe stronger than the
   * def's native requirement re-issues the piece at its own level.
   * 'native': never promotes — for sources that must not power-farm.
   */
  power?: 'source' | 'native';
}

/** A resolved drop, ready to hit the ground or a reward screen. */
export interface LootDrop {
  item: string;
  qty: number;
  roll?: import('@devcraft/shared').ItemRoll;
}

/** What the source tells the resolver about itself. */
export interface LootCtx {
  /** Source level: foe combat level, node requirement, reward tier. */
  level: number;
  /** Randomness source — inject a seeded fn for deterministic tests. */
  rand: () => number;
  /**
   * Context rarity bonus stacked ON TOP of the table's own — the
   * danger field's reader (a chest opened in tier-4 land pays the
   * tier's bonus without the table knowing where it stood).
   */
  rarityBonus?: number;
}
