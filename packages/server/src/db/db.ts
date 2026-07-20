import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

/**
 * SQLite via node:sqlite (no native deps). WAL mode; simple forward-only
 * migrations keyed by user_version. Every later phase appends a
 * migration rather than editing an old one.
 */

const MIGRATIONS: string[] = [
  // 1 — accounts, sessions, characters
  `
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash BLOB NOT NULL,
    pass_salt BLOB NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX idx_sessions_account ON sessions(account_id);
  CREATE TABLE characters (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    x REAL NOT NULL,
    y REAL NOT NULL,
    hp INTEGER NOT NULL DEFAULT 10,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  );
  CREATE INDEX idx_characters_account ON characters(account_id);
  `,
  // 2 — skills and inventory
  `
  CREATE TABLE character_skills (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (character_id, skill)
  );
  CREATE TABLE inventory_slots (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    slot INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    PRIMARY KEY (character_id, slot)
  );
  `,
  // 3 — worn equipment
  `
  CREATE TABLE equipment (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    slot TEXT NOT NULL,
    item_id TEXT NOT NULL,
    PRIMARY KEY (character_id, slot)
  );
  `,
  // 4 — bank storage (everything stacks in the bank)
  `
  CREATE TABLE bank_items (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    PRIMARY KEY (character_id, item_id)
  );
  `,
  // 5 — player-built world tiles (construction)
  `
  CREATE TABLE built_tiles (
    tx INTEGER NOT NULL,
    ty INTEGER NOT NULL,
    tile INTEGER NOT NULL,
    owner_character_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tx, ty)
  );
  `,
  // 6 — chosen combat techniques (one per style, free respec)
  `
  CREATE TABLE character_techniques (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    style TEXT NOT NULL,
    ability TEXT NOT NULL,
    PRIMARY KEY (character_id, style)
  );
  `,
  // 7 — chosen base look (JSON of palette indices; NULL = not chosen yet)
  `
  ALTER TABLE characters ADD COLUMN look TEXT;
  `,
  // 8 — planted crops (stage derives from planted_at + boost_ms at read time)
  `
  CREATE TABLE crops (
    tx INTEGER NOT NULL,
    ty INTEGER NOT NULL,
    crop TEXT NOT NULL,
    planted_at INTEGER NOT NULL,
    boost_ms INTEGER NOT NULL DEFAULT 0,
    watered INTEGER NOT NULL DEFAULT 0,
    owner_character_id INTEGER NOT NULL,
    PRIMARY KEY (tx, ty)
  );
  `,
  // 9 — cosmetic idle weapon-carry preference (NULL = standard)
  `
  ALTER TABLE characters ADD COLUMN carry_style TEXT;
  `,
  // 10 — the ground a construction replaced, so demolish can restore
  // it instead of stamping Grass (default 1 = Tile.Grass, matching the
  // old hardcoded behaviour for rows built before this migration)
  `
  ALTER TABLE built_tiles ADD COLUMN prev_tile INTEGER NOT NULL DEFAULT 1;
  `,
  // 11 — per-instance item rolls (rarity tier + derivation seed).
  // NULL rar/seed = legacy row, read as no roll (derives common/seed-0).
  // The bank needs its own gear table because bank_items stacks by
  // item_id and rolled gear can never stack; rows keep stable ids so
  // withdrawals can address an exact instance.
  `
  ALTER TABLE inventory_slots ADD COLUMN rar TEXT;
  ALTER TABLE inventory_slots ADD COLUMN seed INTEGER;
  ALTER TABLE equipment ADD COLUMN rar TEXT;
  ALTER TABLE equipment ADD COLUMN seed INTEGER;
  CREATE TABLE bank_gear (
    id INTEGER PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    rar TEXT NOT NULL,
    seed INTEGER NOT NULL
  );
  CREATE INDEX idx_bank_gear_character ON bank_gear(character_id);
  `,
  // 12 — content-boundary renames: the game never references witches
  // or the demonic (hedgewitch set → hedgemage, witchlight → wisplight,
  // hexthorn → gloomthorn). Stored ids follow so owned pieces survive.
  `
  UPDATE inventory_slots SET item_id = replace(item_id, 'hedgewitch_', 'hedgemage_') WHERE item_id LIKE 'hedgewitch_%';
  UPDATE inventory_slots SET item_id = 'wisplight' WHERE item_id = 'witchlight';
  UPDATE inventory_slots SET item_id = 'gloomthorn' WHERE item_id = 'hexthorn';
  UPDATE equipment SET item_id = replace(item_id, 'hedgewitch_', 'hedgemage_') WHERE item_id LIKE 'hedgewitch_%';
  UPDATE equipment SET item_id = 'wisplight' WHERE item_id = 'witchlight';
  UPDATE equipment SET item_id = 'gloomthorn' WHERE item_id = 'hexthorn';
  UPDATE bank_items SET item_id = replace(item_id, 'hedgewitch_', 'hedgemage_') WHERE item_id LIKE 'hedgewitch_%';
  UPDATE bank_items SET item_id = 'wisplight' WHERE item_id = 'witchlight';
  UPDATE bank_items SET item_id = 'gloomthorn' WHERE item_id = 'hexthorn';
  UPDATE bank_gear SET item_id = replace(item_id, 'hedgewitch_', 'hedgemage_') WHERE item_id LIKE 'hedgewitch_%';
  UPDATE bank_gear SET item_id = 'wisplight' WHERE item_id = 'witchlight';
  UPDATE bank_gear SET item_id = 'gloomthorn' WHERE item_id = 'hexthorn';
  `,
  // 13 — item power (the recycling axis): a re-issued instance carries
  // the level it dropped at; NULL = the def's native power (all
  // existing rows read unchanged).
  `
  ALTER TABLE inventory_slots ADD COLUMN pwr INTEGER;
  ALTER TABLE equipment ADD COLUMN pwr INTEGER;
  ALTER TABLE bank_gear ADD COLUMN pwr INTEGER;
  `,
  // 14 — weapon oils live ON the instance: vial id + epoch-ms expiry.
  // NULL = clean blade; expired oils are dropped at load.
  `
  ALTER TABLE inventory_slots ADD COLUMN coat_id TEXT;
  ALTER TABLE inventory_slots ADD COLUMN coat_until INTEGER;
  ALTER TABLE equipment ADD COLUMN coat_id TEXT;
  ALTER TABLE equipment ADD COLUMN coat_until INTEGER;
  ALTER TABLE bank_gear ADD COLUMN coat_id TEXT;
  ALTER TABLE bank_gear ADD COLUMN coat_until INTEGER;
  `,
];

export function openDb(path?: string): DatabaseSync {
  let dbPath = path;
  if (!dbPath) {
    mkdirSync(config.dataDir, { recursive: true });
    dbPath = join(config.dataDir, 'devcraft.db');
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  let version = row.user_version;
  while (version < MIGRATIONS.length) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[version]!);
      version++;
      db.exec(`PRAGMA user_version = ${version}`);
      db.exec('COMMIT');
      console.log(`[db] migrated to schema v${version}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
