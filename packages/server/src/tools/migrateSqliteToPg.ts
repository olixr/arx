import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { openDb } from '../db/db.js';

/**
 * One-shot mover: copy an arx.db SQLite world (the pre-Postgres era)
 * into the configured Postgres database, ids preserved.
 *
 *   npm run migrate:sqlite -w @arx/server [-- /path/to/arx.db] [--force]
 *
 * The target must be empty (no accounts) unless --force is given —
 * this is a founding act, not a sync. Identity sequences are advanced
 * past the copied ids so new registrations don't collide.
 */

const args = process.argv.slice(2).filter((a) => a !== '--force');
const force = process.argv.includes('--force');
const sqlitePath = args[0] ?? join(config.dataDir, 'arx.db');

if (!existsSync(sqlitePath)) {
  console.error(`no SQLite database at ${sqlitePath}`);
  process.exit(1);
}

/** Copy order respects foreign keys. */
const TABLES = [
  'accounts',
  'sessions',
  'characters',
  'character_skills',
  'inventory_slots',
  'equipment',
  'bank_items',
  'bank_gear',
  'built_tiles',
  'character_techniques',
  'crops',
  'character_recipes',
  'character_flags',
  'npc_actors',
  'npc_actor_equipment',
  'npc_actor_inventory',
  'npc_actor_lines',
  'npc_actor_combat',
  'npc_actor_loot',
  'dialogues',
  'dialogue_nodes',
  'dialogue_choices',
  'dialogue_bindings',
  'routines',
  'routine_slots',
  'content_docs',
  'world_pois',
  'character_friends',
  'friend_requests',
  'signs',
];

/** Tables whose id is an identity column needing a sequence bump. */
const IDENTITY_TABLES = ['accounts', 'characters', 'bank_gear'];

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const db = await openDb();

const already = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM accounts');
if ((already?.n ?? 0) > 0 && !force) {
  console.error(
    `target database already holds ${already!.n} account(s) — refusing to migrate over a live world (use --force to override)`,
  );
  await db.close();
  process.exit(1);
}

// A booted server has already seeded content tables — clear the slate
// so the SQLite copy (which contains those same seeds, plus any tool
// edits) lands whole. Safe: the accounts guard above ran.
await db.run(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);

let total = 0;
for (const table of TABLES) {
  const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (info.length === 0) {
    console.log(`  ${table}: not in SQLite db, skipped`);
    continue;
  }
  const pgCols = await db.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?",
    [table],
  );
  const pgColSet = new Set(pgCols.map((c) => c.column_name));
  const cols = info.map((c) => c.name).filter((c) => pgColSet.has(c));
  const rows = sqlite.prepare(`SELECT ${cols.join(', ')} FROM ${table}`).all() as Array<
    Record<string, unknown>
  >;
  const insert = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const values = cols.map((c) => {
        const v = row[c];
        // node:sqlite hands BLOBs back as Uint8Array; pg wants Buffer.
        return v instanceof Uint8Array ? Buffer.from(v) : v;
      });
      await tx.run(insert, values);
    }
  });
  total += rows.length;
  console.log(`  ${table}: ${rows.length} rows`);
}

// New registrations must allocate past the copied ids.
for (const table of IDENTITY_TABLES) {
  await db.run(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
  );
}

console.log(`migrated ${total} rows from ${sqlitePath}`);
await db.close();
sqlite.close();
