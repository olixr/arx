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
  // v3: the invite gate — registration spends a code from this ledger.
  // CITEXT so a code survives being typed in any casing; max_uses NULL
  // means unlimited. accounts.invite_code records which code opened
  // each account (audit trail, never read on the hot path).
  `
  CREATE TABLE invite_codes (
    code CITEXT PRIMARY KEY,
    max_uses INTEGER,
    uses INTEGER NOT NULL DEFAULT 0,
    disabled INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL
  );
  ALTER TABLE accounts ADD COLUMN invite_code TEXT;
  `,
  // v4: THE CALLING LAW — answered toggleable skill passives. Row
  // presence = answered (the hidden-skill pattern); the Focus budget
  // is derived from character_skills, never stored.
  `
  CREATE TABLE character_callings (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    calling TEXT NOT NULL,
    PRIMARY KEY (character_id, calling)
  );
  `,
  // v5: THE FREE HAND — the technique slot unbinds from the weapon, so
  // each character keeps ONE row under the reserved 'slot' key. Of the
  // legacy per-style picks, the melee-first order keeps the art most
  // mains were actually riding.
  `
  DELETE FROM character_techniques a
  USING character_techniques b
  WHERE a.character_id = b.character_id
    AND (CASE a.style WHEN 'melee' THEN 0 WHEN 'archery' THEN 1 WHEN 'magic' THEN 2 WHEN 'sneak' THEN 3 ELSE 4 END)
      > (CASE b.style WHEN 'melee' THEN 0 WHEN 'archery' THEN 1 WHEN 'magic' THEN 2 WHEN 'sneak' THEN 3 ELSE 4 END);
  UPDATE character_techniques SET style = 'slot';
  `,
  // v6: THE LIVING FRONTIER — the ember turn. A cleared site lingers
  // as the player's broken trophy until ember_until, then dissolves;
  // the cell rests until fallow_until before it may host again. The
  // renewal debt (sites the frontier owes the world after dissolves)
  // survives restarts in the one-row frontier_state.
  `
  ALTER TABLE world_pois ADD COLUMN ember_until BIGINT;
  ALTER TABLE world_pois ADD COLUMN fallow_until BIGINT;

  CREATE TABLE frontier_state (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    renewal_credits INTEGER NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
  );
  `,
  // v7: THE BOLDNESS LADDER — a discovered, unanswered site climbs
  // stage rungs on a real-time clock (stage_at = when the current rung
  // began); satellites point at their core via origin_cell (the
  // source-and-kill-switch law). frontier_calm holds the relax
  // windows: cells near a garrison wipe see no new pressure while
  // calm_until stands.
  `
  ALTER TABLE world_pois ADD COLUMN stage INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE world_pois ADD COLUMN stage_at BIGINT;
  ALTER TABLE world_pois ADD COLUMN origin_cell TEXT;

  CREATE TABLE frontier_calm (
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    calm_until BIGINT NOT NULL,
    PRIMARY KEY (cell_x, cell_y)
  );
  `,
  // v8: THE HEARTH WATCH — the covetous dice's per-character mercy
  // stamps. raid_calm_until: no raid squat covets this settler's claim
  // while it stands (answered raids and losses both earn quiet).
  // hearth_warded: the opt-out dial ("Ward the hearth") — 1 means the
  // dice never pick this settler at all.
  `
  ALTER TABLE characters ADD COLUMN raid_calm_until BIGINT NOT NULL DEFAULT 0;
  ALTER TABLE characters ADD COLUMN hearth_warded INTEGER NOT NULL DEFAULT 0;
  `,
  // v9: THE PARTY — durable fellowships. Membership survives logout;
  // only a deliberate leave/kick/disband (or a party thinning to one)
  // ends it. The UNIQUE on character_id is the one-party-per-character
  // law, enforced where it can never be raced. Invites stay in memory
  // (they die with the evening); membership is what must not be lost.
  `
  CREATE TABLE parties (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    leader_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL
  );
  CREATE TABLE party_members (
    party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
    joined_at BIGINT NOT NULL,
    PRIMARY KEY (party_id, character_id)
  );
  `,

  // v10: THE QUEST LEDGER — content truth under the two-hash law
  // (dialogues' twin: shipped JSON is seed + interchange only, tool
  // edits are never clobbered) and per-character quest state. Small
  // unions (objectives, requires, rewards) ride as JSON TEXT sockets,
  // not relations; character state writes fire-and-forget at every
  // mutation site, never batched into savePlayer — a turn-in must
  // survive a crash.
  `
  CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    giver TEXT NOT NULL,
    turn_in TEXT,
    requires TEXT,
    repeat_hours INTEGER,
    rewards TEXT NOT NULL,
    quest_drops TEXT,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at BIGINT NOT NULL
  );
  CREATE TABLE quest_stages (
    quest_id TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    stage_id TEXT NOT NULL,
    journal TEXT NOT NULL,
    objectives TEXT NOT NULL,
    mark TEXT,
    PRIMARY KEY (quest_id, idx)
  );
  CREATE TABLE character_quests (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL,
    status TEXT NOT NULL,
    stage INTEGER NOT NULL DEFAULT 0,
    progress TEXT NOT NULL DEFAULT '[]',
    accepted_at BIGINT NOT NULL,
    completions INTEGER NOT NULL DEFAULT 0,
    cooldown_until BIGINT,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, quest_id)
  );
  `,
  // v11: THE LEDGER OF NAMES (docs/factions-plan.md Phase 1) — one
  // integer standing per character per faction. Bands are derived at
  // read time from the live factions doc, never stored; rows write
  // fire-and-forget at the ONE creditStanding choke (the quest-row
  // law: a deed must survive a crash).
  `
  CREATE TABLE character_faction_standing (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    faction_id TEXT NOT NULL,
    standing INTEGER NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, faction_id)
  );
  `,
  // v12: THE LIGHT FINGERS (factions-plan Phase 5) — stolen is a
  // per-UNIT facet, so it rides the slot row beside the roll columns.
  // NULL = honest goods; 1 = no lawful counter will touch it.
  `
  ALTER TABLE inventory_slots ADD COLUMN stolen INTEGER;
  `,
  // v13: THE CLIP LEDGER (docs/voiceover-plan.md Phase 2) — voice
  // clips are two-hash rows whose binaries live content-addressed in
  // data/voice (THE HASH IS THE FILE); banks hang weighted clip
  // shuffles off an open owner axis (actor now; poi/zone/cutscene
  // later); a dialogue node's full spoken line is one nullable clip
  // id riding the node row (threaded end-to-end in Phase 3).
  `
  CREATE TABLE voice_clips (
    id TEXT PRIMARY KEY,
    file_hash TEXT NOT NULL,
    ext TEXT NOT NULL,
    dur_ms INTEGER NOT NULL,
    bytes INTEGER NOT NULL,
    transcript TEXT,
    actor TEXT,
    tags TEXT,
    content_hash TEXT NOT NULL,
    authored_hash TEXT,
    updated_at BIGINT NOT NULL
  );
  CREATE INDEX idx_voice_clips_actor ON voice_clips (actor);
  CREATE TABLE voice_banks (
    owner_kind TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    slot TEXT NOT NULL,
    idx INTEGER NOT NULL,
    clip_id TEXT NOT NULL REFERENCES voice_clips(id),
    weight INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (owner_kind, owner_id, slot, idx)
  );
  CREATE INDEX idx_voice_banks_clip ON voice_banks (clip_id);
  ALTER TABLE dialogue_nodes ADD COLUMN voice TEXT;
  `,
  // v14: THE WORLD SPEAKS (voiceover-plan Phase 6) — a beat's mood
  // mark ('yes' | 'no' | 'hm'): the designer's word that an unvoiced
  // beat draws that bank slot instead of a rationed ack.
  `
  ALTER TABLE dialogue_nodes ADD COLUMN mood TEXT;
  `,
  // v15: THE VETERAN'S SCHOOL — melee splits in two. The old skill's
  // rows rename to 'onehand' (the one-handed weapon school keeps its
  // ladder, its levels, and its unlocked arts), and every character is
  // seeded a 'combat' row at exactly what THE SHARED LESSON would have
  // paid historically: half the summed xp of the strike schools. The
  // merge-then-rename shape guards a half-applied rerun, per v5's model.
  `
  DELETE FROM character_skills a
    USING character_skills b
    WHERE a.character_id = b.character_id
    AND a.skill = 'melee' AND b.skill = 'onehand';
  UPDATE character_skills SET skill = 'onehand' WHERE skill = 'melee';
  INSERT INTO character_skills (character_id, skill, xp)
    SELECT character_id, 'combat', FLOOR(SUM(xp) * 0.5)::INTEGER
    FROM character_skills
    WHERE skill IN ('onehand', 'twohand', 'archery', 'magic', 'dualwield', 'shield')
    GROUP BY character_id
    HAVING FLOOR(SUM(xp) * 0.5) > 0
  ON CONFLICT (character_id, skill) DO NOTHING;
  `,
  // v16: ARX WIELDING — the school of Arx takes its true name. 'magic'
  // was only ever the placeholder word for the energy that binds the
  // world; the skill that taps it is Arx Wielding, and its id is the
  // substance itself. A straight rename: the ladder, the levels, and
  // every art unlocked off it carry over untouched. The merge guard
  // follows v15's model so a half-applied rerun cannot double a row —
  // no character can hold an 'arx' row yet, but the shape is the law.
  //
  // Nothing else stored needs rewriting: character_techniques rows all
  // sit under the reserved 'slot' key since v5, and gear affixes are
  // derived from (rar, seed) by pool INDEX, so renaming the stat in
  // the affix pools leaves every rolled item in the world unchanged.
  `
  DELETE FROM character_skills a
    USING character_skills b
    WHERE a.character_id = b.character_id
    AND a.skill = 'magic' AND b.skill = 'arx';
  UPDATE character_skills SET skill = 'arx' WHERE skill = 'magic';
  `,
  // v17: THE SMALL FINDS (lived-in-land Phase 2) — the finds ledger.
  // Deviations only, at find scale: a row exists ONLY once a find in
  // the cell has been cleared (the pure lattice re-decides everything
  // else from the seed). `cleared` is a 16-bit slot mask; `epoch`
  // stamps which deal the bits belong to — an epoch turn re-deals the
  // cell and the stale bits simply stop matching.
  `
  CREATE TABLE world_minors (
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    epoch INTEGER NOT NULL DEFAULT 0,
    cleared INTEGER NOT NULL DEFAULT 0,
    first_seen_at BIGINT NOT NULL,
    PRIMARY KEY (cell_x, cell_y)
  );
  `,
  // v18: THE ENCHANTER'S HAND — a working's inscription quality.
  //
  // The roll is stored as COLUMNS here, not as JSON, so a new roll
  // field is a new column in all three tables that carry one. Missing
  // reads as QUALITY_BASE, which is exactly what every scroll and every
  // enchanted item in the world already was, so nothing changes
  // strength on the day this lands.
  //
  // Written IF NOT EXISTS on purpose: migrations are index-addressed,
  // and this one was authored while another was in flight in the same
  // array. An additive column that can be applied twice without harm is
  // the cheap insurance against the ordering ever being disturbed.
  `
  ALTER TABLE inventory_slots ADD COLUMN IF NOT EXISTS quality INTEGER;
  ALTER TABLE equipment ADD COLUMN IF NOT EXISTS quality INTEGER;
  ALTER TABLE bank_gear ADD COLUMN IF NOT EXISTS quality INTEGER;
  `,
  // v19: THE DEEPENING — a piece opened to a second working carries the
  // seat itself (`deep`), the art bonded into it, and the art's own
  // quality. Additive and nullable across the same three roll tables;
  // absent reads as an ordinary undeepened piece, which is what every
  // item in the world already is.
  `
  ALTER TABLE inventory_slots ADD COLUMN IF NOT EXISTS deep INTEGER;
  ALTER TABLE inventory_slots ADD COLUMN IF NOT EXISTS ench2_id TEXT;
  ALTER TABLE inventory_slots ADD COLUMN IF NOT EXISTS quality2 INTEGER;
  ALTER TABLE equipment ADD COLUMN IF NOT EXISTS deep INTEGER;
  ALTER TABLE equipment ADD COLUMN IF NOT EXISTS ench2_id TEXT;
  ALTER TABLE equipment ADD COLUMN IF NOT EXISTS quality2 INTEGER;
  ALTER TABLE bank_gear ADD COLUMN IF NOT EXISTS deep INTEGER;
  ALTER TABLE bank_gear ADD COLUMN IF NOT EXISTS ench2_id TEXT;
  ALTER TABLE bank_gear ADD COLUMN IF NOT EXISTS quality2 INTEGER;
  `,
  // v20: THE LEDGER OF THE LAND (second-growth Phase 1) — the wild
  // harvest ledger. Deviations only, at tile scale: a row exists ONLY
  // where a hand harvested WILD ground (kept ground — authored zones,
  // live POI zones, the dark band — never writes here); a row whose
  // regrowth has fully healed back to worldgen's seed-truth deletes
  // itself. `state`/`since`/`due` are a checkpoint — the truth is the
  // pure projection (content/growth.ts projectGrowth) walked from them
  // at read time, which is what makes the ledger restart-safe with no
  // catch-up pass. `due` NULL is the Phase 2 dormant-germination gate;
  // `owner_character_id` is the Phase 4 planting stamp.
  `
  CREATE TABLE world_growth (
    tx INTEGER NOT NULL,
    ty INTEGER NOT NULL,
    state SMALLINT NOT NULL DEFAULT 0,
    tile INTEGER NOT NULL,
    since BIGINT NOT NULL,
    due BIGINT,
    owner_character_id INTEGER,
    first_seen_at BIGINT NOT NULL,
    PRIMARY KEY (tx, ty)
  );
  `,
  // v21: THE STABLE DOOR (mounts Phase 4) — the beasts a character
  // keeps. Row presence = owned (the callings pattern); `chosen` marks
  // the one the whistle answers with.
  `
  CREATE TABLE character_mounts (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    mount_id TEXT NOT NULL,
    chosen SMALLINT NOT NULL DEFAULT 0,
    acquired_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, mount_id)
  );
  `,
  // v22: THE OPEN HAND (beastcraft v2 Phase 1) — the companions a
  // character keeps. Slot-addressed (0..2, THREE STALLS ONE HEEL):
  // the (character, slot) pair IS the pet's identity, so every write
  // in the tick path is a plain fire-and-forget upsert and no id
  // sequence ever blocks the sim loop. `state` is the durable truth
  // ('heel' | 'stabled' | 'resting'); the wire-only 'trailing' is
  // never stored because it is never true across a login.
  `
  CREATE TABLE character_pets (
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    slot SMALLINT NOT NULL,
    species TEXT NOT NULL,
    name TEXT NOT NULL,
    xp BIGINT NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'heel',
    tamed_at BIGINT NOT NULL,
    PRIMARY KEY (character_id, slot)
  );
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
