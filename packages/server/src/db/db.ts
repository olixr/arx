import pg from 'pg';
import { config } from '../config.js';

/**
 * Postgres via node-postgres. ONE connection, and every statement is
 * serialized through a FIFO promise chain — the layer above was born
 * on synchronous SQLite and its correctness leans on total write
 * ordering (a save enqueued before a load is visible to that load).
 * A pool would let statements race; one ordered connection cannot.
 *
 * BIGINT columns hold ms timestamps and counts — all far below 2^53 —
 * so int8 parses straight to Number.
 */
pg.types.setTypeParser(20, (v: string) => Number(v));

export interface RunResult {
  rowCount: number;
}

/** The statement surface both Db and an open transaction expose. */
export interface Queryable {
  query<R extends object = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<R[]>;
  get<R extends object = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<R | undefined>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
}

/** `?` placeholders → `$1..$n` (no SQL in this codebase embeds a literal '?'). */
const pgSqlCache = new Map<string, string>();
function toPgSql(sql: string): string {
  let out = pgSqlCache.get(sql);
  if (out === undefined) {
    let n = 0;
    out = sql.replace(/\?/g, () => `$${++n}`);
    pgSqlCache.set(sql, out);
  }
  return out;
}

/**
 * Empty params must use pg's SIMPLE query protocol (it allows the
 * multi-statement migration blocks); any params switch to extended.
 */
function rawQuery(client: pg.Client, sql: string, params: unknown[]): Promise<pg.QueryResult> {
  return params.length > 0 ? client.query(toPgSql(sql), params) : client.query(sql);
}

class TxHandle implements Queryable {
  constructor(private readonly client: pg.Client) {}
  async query<R extends object = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
    const res = await rawQuery(this.client, sql, params);
    return res.rows as R[];
  }
  async get<R extends object = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R | undefined> {
    return (await this.query<R>(sql, params))[0];
  }
  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const res = await rawQuery(this.client, sql, params);
    return { rowCount: res.rowCount ?? 0 };
  }
}

export class Db implements Queryable {
  /** The FIFO: each unit of work starts only after the previous settled. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly client: pg.Client) {
    client.on('error', (err) => {
      // A dead connection means every "durable at the handler" write
      // silently vanishes — crash loud and let supervisor restart.
      console.error('[db] connection lost:', err.message);
      process.exit(1);
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = () => task();
    const next = this.chain.then(run, run);
    this.chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  query<R extends object = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
    return this.enqueue(async () => {
      const res = await rawQuery(this.client, sql, params);
      return res.rows as R[];
    });
  }

  async get<R extends object = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R | undefined> {
    return (await this.query<R>(sql, params))[0];
  }

  run(sql: string, params: unknown[] = []): Promise<RunResult> {
    return this.enqueue(async () => {
      const res = await rawQuery(this.client, sql, params);
      return { rowCount: res.rowCount ?? 0 };
    });
  }

  /**
   * Ordered fire-and-forget write — the sim loop's shape. The statement
   * takes its place in the FIFO like any other; only the ERROR is
   * swallowed (logged), so a failed save can never crash the tick.
   */
  fire(sql: string, params: unknown[] = []): void {
    void this.run(sql, params).catch((err: Error) => {
      console.error(`[db] write failed: ${err.message} — ${sql.slice(0, 80)}`);
    });
  }

  /** One atomic unit: BEGIN..COMMIT occupies the FIFO end to end. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      await this.client.query('BEGIN');
      try {
        const result = await fn(new TxHandle(this.client));
        await this.client.query('COMMIT');
        return result;
      } catch (err) {
        await this.client.query('ROLLBACK');
        throw err;
      }
    });
  }

  /** Fire-and-forget transaction (mirrored friendship rows, save batches). */
  fireTransaction(fn: (tx: Queryable) => Promise<void>): void {
    void this.transaction(fn).catch((err: Error) => {
      console.error(`[db] transaction failed: ${err.message}`);
    });
  }

  /** Settles when everything enqueued so far has hit the database. */
  flush(): Promise<void> {
    return this.enqueue(async () => undefined);
  }

  async close(): Promise<void> {
    await this.flush();
    await this.client.end();
  }
}

const MIGRATIONS: string[] = [
  // 1 — the Postgres baseline: the full schema as it stood at SQLite
  // v28 (the epoch of the engine move). Later phases append migrations
  // here, never edit this one. Conventions carried over: ms timestamps
  // as BIGINT, 0/1 flags as INTEGER, JSON sockets as TEXT; CITEXT
  // gives usernames and character names their COLLATE NOCASE law.
  `
  CREATE EXTENSION IF NOT EXISTS citext;

  CREATE TABLE accounts (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username CITEXT NOT NULL UNIQUE,
    pass_hash BYTEA NOT NULL,
    pass_salt BYTEA NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
  );
  CREATE INDEX idx_sessions_account ON sessions(account_id);
  CREATE TABLE characters (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name CITEXT NOT NULL UNIQUE,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    hp INTEGER NOT NULL DEFAULT 10,
    created_at BIGINT NOT NULL,
    last_seen BIGINT NOT NULL,
    look TEXT,
    carry_style TEXT,
    carry_style_off TEXT,
    home_x INTEGER,
    home_y INTEGER,
    hearth_at BIGINT NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_characters_account ON characters(account_id);

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
    rar TEXT,
    seed BIGINT,
    pwr INTEGER,
    coat_id TEXT,
    coat_until BIGINT,
    ench_id TEXT,
    PRIMARY KEY (character_id, slot)
  );
  CREATE TABLE equipment (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    slot TEXT NOT NULL,
    item_id TEXT NOT NULL,
    rar TEXT,
    seed BIGINT,
    pwr INTEGER,
    coat_id TEXT,
    coat_until BIGINT,
    ench_id TEXT,
    PRIMARY KEY (character_id, slot)
  );
  CREATE TABLE bank_items (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    PRIMARY KEY (character_id, item_id)
  );
  CREATE TABLE bank_gear (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    rar TEXT NOT NULL,
    seed BIGINT NOT NULL,
    pwr INTEGER,
    coat_id TEXT,
    coat_until BIGINT,
    ench_id TEXT
  );
  CREATE INDEX idx_bank_gear_character ON bank_gear(character_id);

  CREATE TABLE built_tiles (
    tx INTEGER NOT NULL,
    ty INTEGER NOT NULL,
    tile INTEGER NOT NULL,
    owner_character_id INTEGER NOT NULL,
    created_at BIGINT NOT NULL,
    prev_tile INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (tx, ty)
  );
  CREATE TABLE character_techniques (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    style TEXT NOT NULL,
    ability TEXT NOT NULL,
    PRIMARY KEY (character_id, style)
  );
  CREATE TABLE crops (
    tx INTEGER NOT NULL,
    ty INTEGER NOT NULL,
    crop TEXT NOT NULL,
    planted_at BIGINT NOT NULL,
    boost_ms BIGINT NOT NULL DEFAULT 0,
    watered INTEGER NOT NULL DEFAULT 0,
    owner_character_id INTEGER NOT NULL,
    PRIMARY KEY (tx, ty)
  );
  CREATE TABLE character_recipes (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    recipe TEXT NOT NULL,
    learned_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, recipe)
  );
  CREATE TABLE character_flags (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    flag TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 1,
    set_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, flag)
  );

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
    protection TEXT,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at BIGINT NOT NULL
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
    respawn_sec DOUBLE PRECISION,
    max_hp INTEGER,
    damage INTEGER,
    attack_range DOUBLE PRECISION,
    attack_cooldown_ticks INTEGER,
    aggro_range DOUBLE PRECISION,
    leash_range DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    xp_reward INTEGER
  );
  CREATE TABLE npc_actor_loot (
    actor_slug TEXT NOT NULL REFERENCES npc_actors(slug) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    table_id TEXT NOT NULL,
    PRIMARY KEY (actor_slug, idx)
  );

  CREATE TABLE dialogues (
    id TEXT PRIMARY KEY,
    start_node TEXT NOT NULL,
    once INTEGER NOT NULL DEFAULT 0,
    requires TEXT,
    forbids TEXT,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at BIGINT NOT NULL
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

  CREATE TABLE routines (
    id TEXT PRIMARY KEY,
    base TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at BIGINT NOT NULL
  );
  CREATE TABLE routine_slots (
    routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    from_hours DOUBLE PRECISION NOT NULL,
    to_hours DOUBLE PRECISION NOT NULL,
    task TEXT NOT NULL,
    PRIMARY KEY (routine_id, idx)
  );

  CREATE TABLE content_docs (
    kind TEXT NOT NULL,
    id TEXT NOT NULL,
    doc TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (kind, id)
  );

  CREATE TABLE world_pois (
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    epoch INTEGER NOT NULL DEFAULT 0,
    poi_id TEXT,
    prefab_id TEXT,
    tier INTEGER,
    anchor_x INTEGER,
    anchor_y INTEGER,
    first_seen_at BIGINT NOT NULL,
    cleared_at BIGINT,
    PRIMARY KEY (cell_x, cell_y)
  );

  CREATE TABLE character_friends (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    friend_id    INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at   BIGINT NOT NULL,
    PRIMARY KEY (character_id, friend_id),
    CHECK (character_id <> friend_id)
  );
  CREATE TABLE friend_requests (
    from_id    INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    to_id      INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (from_id, to_id),
    CHECK (from_id <> to_id)
  );
  CREATE INDEX idx_friend_requests_to ON friend_requests(to_id);

  CREATE TABLE signs (
    tx INTEGER NOT NULL,
    ty INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    lines TEXT NOT NULL DEFAULT '',
    owner_character_id INTEGER NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (tx, ty)
  );
  `,
  // v2: the map epic — per-player fog-of-war region bitmasks, the
  // discovery ledger (name/x/y denormalized so a rumored marker keeps
  // its story after the frontier rerolls), and the one active waypoint.
  `
  ALTER TABLE characters ADD COLUMN waypoint_x INTEGER;
  ALTER TABLE characters ADD COLUMN waypoint_y INTEGER;

  CREATE TABLE character_explored (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    rx INTEGER NOT NULL,
    ry INTEGER NOT NULL,
    bits BYTEA NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, rx, ry)
  );

  CREATE TABLE character_discoveries (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    tier INTEGER,
    epoch INTEGER,
    faded INTEGER NOT NULL DEFAULT 0,
    discovered_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, id)
  );
  CREATE INDEX idx_character_discoveries_id ON character_discoveries(id);
  `,
];

/**
 * Open (and migrate) the game database. Connection parts come from
 * config.db (DB_HOST / DB_PORT / DB_DATABASE / DB_USERNAME /
 * DB_PASSWORD) with per-call overrides; a missing database is created
 * on the fly so a fresh checkout boots with nothing but `postgres`
 * running.
 */
export async function openDb(overrides?: pg.ClientConfig): Promise<Db> {
  const cfg: pg.ClientConfig = { ...config.db, ...overrides };
  let client = new pg.Client(cfg);
  try {
    await client.connect();
  } catch (err) {
    if ((err as { code?: string }).code !== '3D000') throw err; // not "database does not exist"
    await createDatabase(cfg);
    client = new pg.Client(cfg);
    await client.connect();
  }
  const db = new Db(client);
  await migrate(db);
  return db;
}

async function createDatabase(cfg: pg.ClientConfig): Promise<void> {
  const dbName = cfg.database ?? 'arx';
  if (!/^[a-z_][a-z0-9_]*$/i.test(dbName)) throw new Error(`cannot auto-create database '${dbName}'`);
  const admin = new pg.Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[db] created database '${dbName}'`);
  } finally {
    await admin.end();
  }
}

async function migrate(db: Db): Promise<void> {
  await db.run(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at BIGINT NOT NULL)',
  );
  const row = await db.get<{ v: number | null }>('SELECT MAX(version) AS v FROM schema_migrations');
  let version = row?.v ?? 0;
  while (version < MIGRATIONS.length) {
    const next = version + 1;
    await db.transaction(async (tx) => {
      await tx.run(MIGRATIONS[next - 1]!);
      await tx.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        next,
        Date.now(),
      ]);
    });
    version = next;
    console.log(`[db] migrated to schema v${version}`);
  }
}
