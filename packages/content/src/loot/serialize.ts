import { validateLootTables } from './tables.js';
import type { LootTableDef } from './types.js';

/**
 * LootTableDef <-> JSON — the content-tool interchange surface, mirroring
 * equipment/serialize.ts: defs are JSON-shaped by construction, so this
 * is stringify/parse plus the same validation pass the game runs at
 * load. A tool-exported file that wouldn't survive the build fails
 * HERE, loudly.
 *
 * Note: generated bundles (setDrops) export as their expanded entries —
 * a tool round-trips concrete drop lines, never the generator call.
 */

export function lootTablesToJson(tables: readonly LootTableDef[]): string {
  return JSON.stringify(tables, null, 2);
}

export function lootTablesFromJson(json: string): LootTableDef[] {
  const tables = JSON.parse(json) as LootTableDef[];
  if (!Array.isArray(tables)) throw new Error('malformed loot JSON: expected an array');
  for (const t of tables) {
    if (typeof t !== 'object' || t === null || typeof t.id !== 'string' || !Array.isArray(t.entries)) {
      throw new Error('malformed loot JSON: bad table entry');
    }
  }
  validateLootTables(tables);
  return tables;
}
