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
  // 15 — the trade split: generic 'crafting' becomes woodworking /
  // leatherworking / tailoring. Every character inherits their old
  // crafting xp into all three trades (they trained a mix of all of
  // them under one name — nobody loses a recipe they could make
  // yesterday). The legacy 'crafting' rows are kept, unread, so the
  // split is reversible.
  `
  INSERT OR IGNORE INTO character_skills (character_id, skill, xp)
    SELECT character_id, 'woodworking', xp FROM character_skills WHERE skill = 'crafting';
  INSERT OR IGNORE INTO character_skills (character_id, skill, xp)
    SELECT character_id, 'leatherworking', xp FROM character_skills WHERE skill = 'crafting';
  INSERT OR IGNORE INTO character_skills (character_id, skill, xp)
    SELECT character_id, 'tailoring', xp FROM character_skills WHERE skill = 'crafting';
  `,
  // 16 — enchantments live ON the instance: an EnchantDef id. NULL =
  // unenchanted. Permanent (no expiry column — unlike oils, an enchant
  // never dries).
  `
  ALTER TABLE inventory_slots ADD COLUMN ench_id TEXT;
  ALTER TABLE equipment ADD COLUMN ench_id TEXT;
  ALTER TABLE bank_gear ADD COLUMN ench_id TEXT;
  `,
  // 17 — grips are per-hand: the off fist gets its own carry preference
  // (NULL = standard), so a dual wielder can run standard main / rogue off.
  `
  ALTER TABLE characters ADD COLUMN carry_style_off TEXT;
  `,
  // 18 — NPC actors: the identity layer of the NPC system, relational
  // by design (db/npcActors.ts owns sync + load). Authored JSON
  // (content/actors/defs) is the seed; these tables are what the
  // server actually reads at boot, and what dev tools will edit.
  // `look` is a JSON blob of palette indices — the exact encoding
  // characters.look already uses (the index-stability law covers both).
  `
  CREATE TABLE npc_actors (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    examine TEXT,
    disposition TEXT NOT NULL,
    model_kind TEXT NOT NULL,
    creature_id TEXT,
    look TEXT,
    dialogue_id TEXT,
    shop_id TEXT,
    content_hash TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE npc_actor_equipment (
    actor_slug TEXT NOT NULL REFERENCES npc_actors(slug) ON DELETE CASCADE,
    slot TEXT NOT NULL,
    item_id TEXT NOT NULL,
    PRIMARY KEY (actor_slug, slot)
  );
  CREATE TABLE npc_actor_inventory (
    actor_slug TEXT NOT NULL REFERENCES npc_actors(slug) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    PRIMARY KEY (actor_slug, idx)
  );
  CREATE TABLE npc_actor_lines (
    actor_slug TEXT NOT NULL REFERENCES npc_actors(slug) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    line TEXT NOT NULL,
    PRIMARY KEY (actor_slug, idx)
  );
  CREATE TABLE npc_actor_combat (
    actor_slug TEXT PRIMARY KEY REFERENCES npc_actors(slug) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    base_creature TEXT,
    respawn_sec REAL,
    max_hp INTEGER,
    damage INTEGER,
    attack_range REAL,
    attack_cooldown_ticks INTEGER,
    aggro_range REAL,
    leash_range REAL,
    speed REAL,
    xp_reward INTEGER
  );
  CREATE TABLE npc_actor_loot (
    actor_slug TEXT NOT NULL REFERENCES npc_actors(slug) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    table_id TEXT NOT NULL,
    PRIMARY KEY (actor_slug, idx)
  );
  `,
  // 19 — dialogue trees + the character flag ledger. Dialogues follow
  // the actor pattern: authored JSON (content/dialogues/defs) seeds
  // these tables at boot (db/dialogues.ts), the runtime reads back
  // from them, dev tools will edit them. Entities are relational
  // (dialogue → nodes → choices); the small polymorphic value-lists
  // (hooks, flag conditions) ride as JSON arrays in a column — they
  // are open-ended sockets, not queryable relations. No FK to
  // npc_actors: the one validator is the cross-reference gate, same
  // as items/loot everywhere else.
  //
  // character_flags is the durable "this happened" ledger — dialogue
  // completions (dlg:<id>), story choices, and soon quest/faction
  // state all share it.
  `
  CREATE TABLE dialogues (
    id TEXT PRIMARY KEY,
    actor_slug TEXT NOT NULL,
    start_node TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    once INTEGER NOT NULL DEFAULT 0,
    requires TEXT,
    forbids TEXT,
    content_hash TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_dialogues_actor ON dialogues(actor_slug);
  CREATE TABLE dialogue_nodes (
    dialogue_id TEXT NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    speaker TEXT,
    text TEXT NOT NULL,
    next_node TEXT,
    hooks TEXT,
    PRIMARY KEY (dialogue_id, node_id)
  );
  CREATE TABLE dialogue_choices (
    dialogue_id TEXT NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    text TEXT NOT NULL,
    next_node TEXT,
    requires TEXT,
    forbids TEXT,
    set_flags TEXT,
    PRIMARY KEY (dialogue_id, node_id, idx)
  );
  CREATE TABLE character_flags (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    flag TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 1,
    set_at INTEGER NOT NULL,
    PRIMARY KEY (character_id, flag)
  );
  `,
  // 20 — dialogues v2: THE DATABASE IS THE TRUTH, and dialogues stand
  // alone. Two structural changes over v19 (which shipped a day
  // earlier, seed-data only — safe to rebuild):
  //   1. The tree loses its actor column; a dialogue_bindings table
  //      is the ONLY tie between a conversation and the world
  //      (kind + target: 'actor' today, props/items later). One tree
  //      can hang on many targets, each with its own priority.
  //   2. Rows carry TWO hashes. content_hash = what the row holds
  //      now; authored_hash = the shipped JSON that last seeded it.
  //      While they match, the row is a pure seed and newer shipped
  //      JSON may update it; the moment tooling edits a row (and
  //      bumps content_hash), the pair diverges and no re-seed will
  //      ever clobber the tool's work. authored_hash NULL = born in
  //      the tooling, no shipped counterpart at all.
  // JSON files remain the import/export envelope; db/dialogues.ts
  // owns the seed/export logic.
  `
  DROP TABLE dialogue_choices;
  DROP TABLE dialogue_nodes;
  DROP TABLE dialogues;
  CREATE TABLE dialogues (
    id TEXT PRIMARY KEY,
    start_node TEXT NOT NULL,
    once INTEGER NOT NULL DEFAULT 0,
    requires TEXT,
    forbids TEXT,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE dialogue_nodes (
    dialogue_id TEXT NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    speaker TEXT,
    text TEXT NOT NULL,
    next_node TEXT,
    hooks TEXT,
    PRIMARY KEY (dialogue_id, node_id)
  );
  CREATE TABLE dialogue_choices (
    dialogue_id TEXT NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    text TEXT NOT NULL,
    next_node TEXT,
    requires TEXT,
    forbids TEXT,
    set_flags TEXT,
    PRIMARY KEY (dialogue_id, node_id, idx)
  );
  CREATE TABLE dialogue_bindings (
    dialogue_id TEXT NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (dialogue_id, kind, target)
  );
  CREATE INDEX idx_dialogue_bindings_target ON dialogue_bindings(kind, target);
  `,
  // 21 — actor combat protection: the safety switch over a
  // disposition. 'invulnerable' = fights but every blow wards to
  // zero; 'untargetable' = never gets a combat body, attacks pass
  // straight through (talk stays safe). NULL = disposition alone
  // rules, exactly as before.
  `
  ALTER TABLE npc_actors ADD COLUMN protection TEXT;
  `,
  // 22 — routines: the daily lives placed actors keep (content/
  // routines). Same truth law as dialogues: shipped JSON seeds these
  // tables, tooling edits them, the game reads only the DB, and the
  // content_hash/authored_hash pair keeps tool edits sacred. Tasks
  // are small polymorphic objects (post/path/wander) and ride as
  // JSON TEXT sockets, not relations — one row per schedule window.
  `
  CREATE TABLE routines (
    id TEXT PRIMARY KEY,
    base TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE routine_slots (
    routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    from_hours REAL NOT NULL,
    to_hours REAL NOT NULL,
    task TEXT NOT NULL,
    PRIMARY KEY (routine_id, idx)
  );
  `,
  // 23 — recipe knowledge: which non-core recipes a character has
  // learned (trainer scrolls, chest finds). Row-presence IS the
  // unlock, the same law character_skills uses for hidden skills —
  // core recipes never get rows because everyone knows them.
  `
  CREATE TABLE character_recipes (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    recipe TEXT NOT NULL,
    learned_at INTEGER NOT NULL,
    PRIMARY KEY (character_id, recipe)
  );
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
