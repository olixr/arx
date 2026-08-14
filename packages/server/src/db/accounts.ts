import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isRarityTier, sanitizeLook, type ItemRoll, type Look, type PetState } from '@arx/shared';
import type { Db } from './db.js';

/**
 * A kept companion as the stalls know it (beastcraft v2, THE OPEN
 * HAND). `slot` 0..2 is the stall; `state` is the durable truth —
 * the wire-only 'trailing' never lands here.
 */
export interface PetRow {
  slot: number;
  species: string;
  name: string;
  xp: number;
  state: PetState;
  /** When the limp home began (ms), or null — only 'resting' carries it. */
  restedAt: number | null;
}

/** NULL-tolerant roll reader for legacy rows (pre-migration-11). */
function rowRoll(
  rar: string | null,
  seed: number | null,
  pwr?: number | null,
  coatId?: string | null,
  coatUntil?: number | null,
  enchId?: string | null,
  quality?: number | null,
  deep?: number | null,
  ench2Id?: string | null,
  quality2?: number | null,
): ItemRoll | undefined {
  if (rar === null || seed === null || !isRarityTier(rar)) return undefined;
  const roll: ItemRoll = { rar, seed };
  if (pwr !== null && pwr !== undefined) roll.pwr = pwr;
  // Expired oils dry off at load — the clock runs even in the bank.
  if (coatId != null && coatUntil != null && coatUntil > Date.now()) {
    roll.coat = { id: coatId, until: coatUntil };
  }
  if (enchId != null) roll.ench = enchId;
  // THE ENCHANTER'S HAND: absent quality reads as baseline, so every
  // instance that predates the system is exactly as strong as it was.
  if (quality != null) roll.q = quality;
  // THE DEEPENING: the seat survives even with no art in it, so a
  // sundered deepened piece stays deepened.
  if (deep) roll.deep = true;
  if (deep && ench2Id != null) roll.ench2 = ench2Id;
  if (quality2 != null) roll.q2 = quality2;
  return roll;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCRYPT_KEYLEN = 64;

export interface CharacterRow {
  id: number;
  account_id: number;
  name: string;
  x: number;
  y: number;
  hp: number;
  /** Claimed home bed TILE; null until a bed is claimed. */
  home_x: number | null;
  home_y: number | null;
  /** Last hearth recall timestamp (ms); the cooldown survives logout. */
  hearth_at: number;
  /** The one active waypoint TILE; null when none is set. */
  waypoint_x: number | null;
  waypoint_y: number | null;
  /** THE HEARTH WATCH: no raid covets this settler until this passes (ms). */
  raid_calm_until: number;
  /** The opt-out dial: 1 = warded, the covetous dice never pick them. */
  hearth_warded: number;
}

export type AuthResult =
  | { ok: true; accountId: number; character: CharacterRow }
  | { ok: false; reason: string };

/**
 * One character_quests row in wire-friendly casing. `progress` stays
 * the raw JSON string (a number[] per current-stage objective) — the
 * game layer owns its meaning, the store just keeps it safe.
 */
export interface QuestStateRow {
  questId: string;
  status: 'active' | 'done';
  stage: number;
  progress: string;
  acceptedAt: number;
  completions: number;
  cooldownUntil: number | null;
}

/**
 * Accounts, sessions, and character records over Postgres. Passwords
 * are scrypt-hashed with a per-account salt; session tokens persist so
 * reconnects survive server restarts.
 *
 * The method split mirrors how the game calls in: READS are async
 * (boot, login, panel snapshots — all promise-friendly contexts);
 * WRITES from the 20Hz sim stay synchronous fire-and-forget — each
 * takes its place in the Db FIFO, so a save enqueued before a load is
 * always visible to that load, exactly the old SQLite ordering.
 */
export class AccountStore {
  constructor(private readonly db: Db) {}

  async register(
    username: string,
    password: string,
    charName: string,
    spawn: { x: number; y: number },
    invite?: { required: boolean; code?: string },
  ): Promise<AuthResult> {
    const user = username.trim();
    const name = charName.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(user)) {
      return { ok: false, reason: 'Username must be 3-20 letters, numbers, or _' };
    }
    if (password.length < 6) {
      return { ok: false, reason: 'Password must be at least 6 characters' };
    }
    if (!/^[\p{L}\p{N} _-]{2,16}$/u.test(name)) {
      return { ok: false, reason: 'Character name must be 2-16 characters' };
    }
    // The invite gate stands BEFORE the uniqueness checks on purpose:
    // without a working code you learn nothing about taken usernames.
    const code = (invite?.code ?? '').trim();
    if (invite?.required) {
      if (!code) return { ok: false, reason: 'An invite code is required to create an account' };
      const row = await this.db.get<{ uses: number; max_uses: number | null; disabled: number }>(
        'SELECT uses, max_uses, disabled FROM invite_codes WHERE code = ?',
        [code],
      );
      if (!row || row.disabled !== 0 || (row.max_uses !== null && row.uses >= row.max_uses)) {
        return { ok: false, reason: 'That invite code is not valid' };
      }
    }
    const existing = await this.db.get('SELECT id FROM accounts WHERE username = ?', [user]);
    if (existing) return { ok: false, reason: 'That username is taken' };
    const nameTaken = await this.db.get('SELECT id FROM characters WHERE name = ?', [name]);
    if (nameTaken) return { ok: false, reason: 'That character name is taken' };

    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
    const now = Date.now();
    const result = await this.db.transaction(async (tx) => {
      if (invite?.required) {
        // Spend the code inside the transaction — the WHERE re-checks
        // validity, so a code can never go past its use budget however
        // many registrations race on it.
        const spent = await tx.run(
          'UPDATE invite_codes SET uses = uses + 1 WHERE code = ? AND disabled = 0 AND (max_uses IS NULL OR uses < max_uses)',
          [code],
        );
        if (spent.rowCount === 0) return null;
      }
      const acc = await tx.get<{ id: number }>(
        'INSERT INTO accounts (username, pass_hash, pass_salt, created_at, invite_code) VALUES (?, ?, ?, ?, ?) RETURNING id',
        [user, hash, salt, now, invite?.required ? code : null],
      );
      const ch = await tx.get<{ id: number }>(
        'INSERT INTO characters (account_id, name, x, y, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
        [acc!.id, name, spawn.x, spawn.y, now, now],
      );
      return { accountId: acc!.id, characterId: ch!.id };
    });
    if (result === null) return { ok: false, reason: 'That invite code is not valid' };
    this.nameCache.set(result.characterId, name);
    return {
      ok: true,
      accountId: result.accountId,
      character: {
        id: result.characterId,
        account_id: result.accountId,
        name,
        x: spawn.x,
        y: spawn.y,
        hp: 10,
        home_x: null,
        home_y: null,
        hearth_at: 0,
        waypoint_x: null,
        waypoint_y: null,
        raid_calm_until: 0,
        hearth_warded: 0,
      },
    };
  }

  /**
   * Seed (or re-arm) an invite code — boot runs this for INVITE_CODE.
   * Re-seeding an existing code clears `disabled` but keeps its use
   * count; max_uses NULL means unlimited.
   */
  async upsertInviteCode(code: string, note = '', maxUses: number | null = null): Promise<void> {
    await this.db.run(
      'INSERT INTO invite_codes (code, max_uses, uses, disabled, note, created_at) VALUES (?, ?, 0, 0, ?, ?) ' +
        'ON CONFLICT (code) DO UPDATE SET disabled = 0, max_uses = excluded.max_uses, note = excluded.note',
      [code.trim(), maxUses, note, Date.now()],
    );
  }

  /** Codes that can still open an account (the boot warning reads this). */
  async countOpenInviteCodes(): Promise<number> {
    const row = await this.db.get<{ n: number }>(
      'SELECT COUNT(*) AS n FROM invite_codes WHERE disabled = 0 AND (max_uses IS NULL OR uses < max_uses)',
    );
    return row?.n ?? 0;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const acc = await this.db.get<{ id: number; pass_hash: Buffer; pass_salt: Buffer }>(
      'SELECT id, pass_hash, pass_salt FROM accounts WHERE username = ?',
      [username.trim()],
    );
    if (!acc) return { ok: false, reason: 'Unknown username or wrong password' };
    const hash = scryptSync(password, acc.pass_salt, SCRYPT_KEYLEN);
    if (!timingSafeEqual(hash, acc.pass_hash)) {
      return { ok: false, reason: 'Unknown username or wrong password' };
    }
    const character = await this.db.get<CharacterRow>(
      'SELECT id, account_id, name, x, y, hp, home_x, home_y, hearth_at, waypoint_x, waypoint_y, raid_calm_until, hearth_warded FROM characters WHERE account_id = ? ORDER BY id LIMIT 1',
      [acc.id],
    );
    if (!character) return { ok: false, reason: 'Account has no character' };
    return { ok: true, accountId: acc.id, character };
  }

  async createSession(accountId: number): Promise<string> {
    const token = randomBytes(24).toString('base64url');
    const now = Date.now();
    await this.db.run(
      'INSERT INTO sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      [token, accountId, now, now + SESSION_TTL_MS],
    );
    // Opportunistic cleanup of expired sessions.
    this.db.fire('DELETE FROM sessions WHERE expires_at < ?', [now]);
    return token;
  }

  /** Burn one session row: the sign-out door, so the token is dead. */
  endSession(token: string): void {
    this.db.fire('DELETE FROM sessions WHERE token = ?', [token]);
  }

  async resumeSession(token: string): Promise<AuthResult> {
    const row = await this.db.get<{ account_id: number }>(
      'SELECT account_id FROM sessions WHERE token = ? AND expires_at > ?',
      [token, Date.now()],
    );
    if (!row) return { ok: false, reason: 'Session expired' };
    const character = await this.db.get<CharacterRow>(
      'SELECT id, account_id, name, x, y, hp, home_x, home_y, hearth_at, waypoint_x, waypoint_y, raid_calm_until, hearth_warded FROM characters WHERE account_id = ? ORDER BY id LIMIT 1',
      [row.account_id],
    );
    if (!character) return { ok: false, reason: 'Account has no character' };
    return { ok: true, accountId: row.account_id, character };
  }

  saveCharacter(id: number, x: number, y: number, hp: number): void {
    this.db.fire('UPDATE characters SET x = ?, y = ?, hp = ?, last_seen = ? WHERE id = ?', [
      x,
      y,
      hp,
      Date.now(),
      id,
    ]);
  }

  /** Claim (or move) the home bed — written the moment it's claimed. */
  saveHome(id: number, tx: number, ty: number): void {
    this.db.fire('UPDATE characters SET home_x = ?, home_y = ? WHERE id = ?', [tx, ty, id]);
  }

  /** The bed is gone — home dissolves with it. */
  clearHome(id: number): void {
    this.db.fire('UPDATE characters SET home_x = NULL, home_y = NULL WHERE id = ?', [id]);
  }

  saveHearthAt(id: number, at: number): void {
    this.db.fire('UPDATE characters SET hearth_at = ? WHERE id = ?', [at, id]);
  }

  /**
   * Every claimed home bed in the world — THE HEARTH WATCH derives the
   * claim rings from this at boot, offline settlers included (a camp
   * must never materialize in an absent player's yard).
   */
  async allHomes(): Promise<Array<{ characterId: number; x: number; y: number }>> {
    return this.db.query<{ characterId: number; x: number; y: number }>(
      'SELECT id AS "characterId", home_x AS x, home_y AS y FROM characters ' +
        'WHERE home_x IS NOT NULL AND home_y IS NOT NULL',
    );
  }

  /** Stamp raid quiet — GREATEST, so a stamp never shortens standing mercy. */
  saveRaidCalm(id: number, until: number): void {
    this.db.fire(
      'UPDATE characters SET raid_calm_until = GREATEST(raid_calm_until, ?) WHERE id = ?',
      [until, id],
    );
  }

  /** Flip the ward-the-hearth dial. */
  saveHearthWarded(id: number, warded: boolean): void {
    this.db.fire('UPDATE characters SET hearth_warded = ? WHERE id = ?', [warded ? 1 : 0, id]);
  }

  /** Staging lever only: lift a mercy stamp (bypasses the GREATEST law). */
  resetRaidCalm(id: number): void {
    this.db.fire('UPDATE characters SET raid_calm_until = 0 WHERE id = ?', [id]);
  }

  /** Pin (or move) the one active waypoint — written the moment it's set. */
  saveWaypoint(id: number, x: number, y: number): void {
    this.db.fire('UPDATE characters SET waypoint_x = ?, waypoint_y = ? WHERE id = ?', [x, y, id]);
  }

  clearWaypoint(id: number): void {
    this.db.fire('UPDATE characters SET waypoint_x = NULL, waypoint_y = NULL WHERE id = ?', [id]);
  }

  /**
   * THE CHART — fog-of-war region bitmasks (shared/world/explored.ts
   * owns the layout). Regions load whole at bind and flush dirty-only
   * on the periodic save; a lost interval of walking is acceptable in
   * a crash, so this is the batched cadence, not fire-at-the-moment.
   */
  async loadExplored(characterId: number): Promise<{ rx: number; ry: number; bits: Buffer }[]> {
    return await this.db.query<{ rx: number; ry: number; bits: Buffer }>(
      'SELECT rx, ry, bits FROM character_explored WHERE character_id = ?',
      [characterId],
    );
  }

  saveExploredRegion(characterId: number, rx: number, ry: number, bits: Uint8Array): void {
    this.db.fire(
      'INSERT INTO character_explored (character_id, rx, ry, bits, updated_at) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT (character_id, rx, ry) DO UPDATE SET bits = excluded.bits, updated_at = excluded.updated_at',
      [characterId, rx, ry, Buffer.from(bits.buffer, bits.byteOffset, bits.byteLength), Date.now()],
    );
  }

  /**
   * The place ledger — row-presence is the discovery, written the
   * moment the splash fires (a first footfall must never be lost to a
   * crash). name/x/y are denormalized so a rumored marker keeps its
   * story after the frontier ledger forgets the site.
   */
  async loadDiscoveries(characterId: number): Promise<
    {
      id: string;
      kind: string;
      name: string;
      x: number;
      y: number;
      tier: number | null;
      epoch: number | null;
      faded: number;
    }[]
  > {
    return await this.db.query(
      'SELECT id, kind, name, x, y, tier, epoch, faded FROM character_discoveries WHERE character_id = ?',
      [characterId],
    );
  }

  addDiscovery(
    characterId: number,
    d: { id: string; kind: string; name: string; x: number; y: number; tier?: number },
    epoch?: number,
  ): void {
    // Upsert: rediscovering a faded marker refreshes what stands there
    // now; discovered_at keeps the FIRST footfall.
    this.db.fire(
      'INSERT INTO character_discoveries (character_id, id, kind, name, x, y, tier, epoch, faded, discovered_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?) ' +
        'ON CONFLICT (character_id, id) DO UPDATE SET kind = excluded.kind, name = excluded.name, ' +
        'x = excluded.x, y = excluded.y, tier = excluded.tier, epoch = excluded.epoch, faded = 0',
      [characterId, d.id, d.kind, d.name, d.x, d.y, d.tier ?? null, epoch ?? null, Date.now()],
    );
  }

  /** The frontier turned over: every character's marker for this place ages to rumor. */
  fadeDiscovery(id: string): void {
    this.db.fire('UPDATE character_discoveries SET faded = 1 WHERE id = ?', [id]);
  }

  async loadSkills(characterId: number): Promise<Record<string, number>> {
    const rows = await this.db.query<{ skill: string; xp: number }>(
      'SELECT skill, xp FROM character_skills WHERE character_id = ?',
      [characterId],
    );
    const out: Record<string, number> = {};
    for (const row of rows) out[row.skill] = row.xp;
    return out;
  }

  saveSkills(characterId: number, xp: Record<string, number>): void {
    for (const [skill, value] of Object.entries(xp)) {
      this.db.fire(
        'INSERT INTO character_skills (character_id, skill, xp) VALUES (?, ?, ?) ' +
          'ON CONFLICT (character_id, skill) DO UPDATE SET xp = excluded.xp',
        [characterId, skill, value],
      );
    }
  }

  /**
   * Recipe knowledge — row-presence is the unlock. Written the moment
   * a scroll is studied (knowledge must never be lost to a crash);
   * core recipes never appear here.
   */
  async loadRecipes(characterId: number): Promise<string[]> {
    const rows = await this.db.query<{ recipe: string }>(
      'SELECT recipe FROM character_recipes WHERE character_id = ?',
      [characterId],
    );
    return rows.map((r) => r.recipe);
  }

  learnRecipe(characterId: number, recipe: string): void {
    this.db.fire(
      'INSERT INTO character_recipes (character_id, recipe, learned_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
      [characterId, recipe, Date.now()],
    );
  }

  /**
   * The flag ledger: dialogue completions, story choices, and (soon)
   * quest/faction state. Written flag-at-a-time the moment a flag is
   * set — a story beat must never be lost to a crash before the next
   * periodic save.
   */
  async loadFlags(characterId: number): Promise<Map<string, number>> {
    const rows = await this.db.query<{ flag: string; value: number }>(
      'SELECT flag, value FROM character_flags WHERE character_id = ?',
      [characterId],
    );
    return new Map(rows.map((r) => [r.flag, r.value]));
  }

  setFlag(characterId: number, flag: string, value: number): void {
    this.db.fire(
      'INSERT INTO character_flags (character_id, flag, value, set_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT (character_id, flag) DO UPDATE SET value = excluded.value, set_at = excluded.set_at',
      [characterId, flag, value, Date.now()],
    );
  }

  clearFlag(characterId: number, flag: string): void {
    this.db.fire('DELETE FROM character_flags WHERE character_id = ? AND flag = ?', [
      characterId,
      flag,
    ]);
  }

  /**
   * The quest ledger: one row per quest a character has touched.
   * Written whole at every mutation site (accept, credit, stage
   * advance, turn-in, abandon) — fire-and-forget like the flags, so a
   * turn-in can never be lost to a crash before the periodic save.
   */
  async loadQuestRows(characterId: number): Promise<QuestStateRow[]> {
    return this.db.query<QuestStateRow>(
      'SELECT quest_id AS "questId", status, stage, progress, accepted_at AS "acceptedAt", ' +
        'completions, cooldown_until AS "cooldownUntil" FROM character_quests WHERE character_id = ?',
      [characterId],
    );
  }

  saveQuestRow(characterId: number, row: QuestStateRow): void {
    this.db.fire(
      'INSERT INTO character_quests (character_id, quest_id, status, stage, progress, accepted_at, ' +
        'completions, cooldown_until, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (character_id, quest_id) DO UPDATE SET status = excluded.status, ' +
        'stage = excluded.stage, progress = excluded.progress, accepted_at = excluded.accepted_at, ' +
        'completions = excluded.completions, cooldown_until = excluded.cooldown_until, ' +
        'updated_at = excluded.updated_at',
      [
        characterId,
        row.questId,
        row.status,
        row.stage,
        row.progress,
        row.acceptedAt,
        row.completions,
        row.cooldownUntil,
        Date.now(),
      ],
    );
  }

  deleteQuestRow(characterId: number, questId: string): void {
    this.db.fire('DELETE FROM character_quests WHERE character_id = ? AND quest_id = ?', [
      characterId,
      questId,
    ]);
  }

  /**
   * The standing ledger (docs/factions-plan.md): one integer per
   * character per faction, written fire-and-forget the moment the ONE
   * creditStanding choke moves it — a deed must survive a crash.
   * Bands are derived from the live factions doc, never stored.
   */
  async loadStandings(characterId: number): Promise<Map<string, number>> {
    const rows = await this.db.query<{ factionId: string; standing: number }>(
      'SELECT faction_id AS "factionId", standing FROM character_faction_standing WHERE character_id = ?',
      [characterId],
    );
    return new Map(rows.map((r) => [r.factionId, r.standing]));
  }

  saveStanding(characterId: number, factionId: string, standing: number): void {
    this.db.fire(
      'INSERT INTO character_faction_standing (character_id, faction_id, standing, updated_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT (character_id, faction_id) DO UPDATE SET standing = excluded.standing, updated_at = excluded.updated_at',
      [characterId, factionId, standing, Date.now()],
    );
  }

  deleteStandings(characterId: number): void {
    this.db.fire('DELETE FROM character_faction_standing WHERE character_id = ?', [characterId]);
  }

  /**
   * The social ledger. Friendships are mutual — two mirrored rows in
   * character_friends written in one transaction — so every load stays
   * a single-key SELECT. Requests are directional; the handler
   * auto-accepts a mutual request, so at most one direction is ever
   * pending between two characters. All writes land the moment the
   * action happens (a friendship must never be lost to a crash).
   */
  async findCharacterByName(name: string): Promise<{ id: number; name: string } | null> {
    // '=' on the CITEXT column resolves any casing; the row echoes the
    // canonical spelling back.
    const row = await this.db.get<{ id: number; name: string }>(
      'SELECT id, name FROM characters WHERE name = ?',
      [name],
    );
    return row ?? null;
  }

  /**
   * The name behind a character id — the byline on a player's sign.
   * Served from the boot-time preload (names never change), so the
   * interest-stream hot path stays synchronous.
   */
  characterName(id: number): string | null {
    if (id <= 0) return null;
    return this.nameCache.get(id) ?? null;
  }

  /** Fill the name cache once at boot — signs address offline authors too. */
  async preloadCharacterNames(): Promise<void> {
    const rows = await this.db.query<{ id: number; name: string }>('SELECT id, name FROM characters');
    for (const row of rows) this.nameCache.set(row.id, row.name);
  }

  private readonly nameCache = new Map<number, string | null>();

  async searchCharacters(
    prefix: string,
    excludeId: number,
    limit = 10,
  ): Promise<Array<{ id: number; name: string }>> {
    const escaped = prefix.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    return this.db.query<{ id: number; name: string }>(
      "SELECT id, name FROM characters WHERE name LIKE ? ESCAPE '\\' AND id <> ? ORDER BY name LIMIT ?",
      [`${escaped}%`, excludeId, limit],
    );
  }

  async loadFriends(characterId: number): Promise<Array<{ id: number; name: string }>> {
    return this.db.query<{ id: number; name: string }>(
      'SELECT c.id, c.name FROM character_friends f JOIN characters c ON c.id = f.friend_id ' +
        'WHERE f.character_id = ? ORDER BY c.name',
      [characterId],
    );
  }

  async loadFriendRequests(characterId: number): Promise<{
    incoming: Array<{ id: number; name: string }>;
    outgoing: Array<{ id: number; name: string }>;
  }> {
    const incoming = await this.db.query<{ id: number; name: string }>(
      'SELECT c.id, c.name FROM friend_requests r JOIN characters c ON c.id = r.from_id ' +
        'WHERE r.to_id = ? ORDER BY r.created_at',
      [characterId],
    );
    const outgoing = await this.db.query<{ id: number; name: string }>(
      'SELECT c.id, c.name FROM friend_requests r JOIN characters c ON c.id = r.to_id ' +
        'WHERE r.from_id = ? ORDER BY r.created_at',
      [characterId],
    );
    return { incoming, outgoing };
  }

  async areFriends(aId: number, bId: number): Promise<boolean> {
    const row = await this.db.get(
      'SELECT 1 FROM character_friends WHERE character_id = ? AND friend_id = ?',
      [aId, bId],
    );
    return row !== undefined;
  }

  async hasFriendRequest(fromId: number, toId: number): Promise<boolean> {
    const row = await this.db.get('SELECT 1 FROM friend_requests WHERE from_id = ? AND to_id = ?', [
      fromId,
      toId,
    ]);
    return row !== undefined;
  }

  async countFriends(characterId: number): Promise<number> {
    const row = await this.db.get<{ n: number }>(
      'SELECT COUNT(*) AS n FROM character_friends WHERE character_id = ?',
      [characterId],
    );
    return row?.n ?? 0;
  }

  createFriendRequest(fromId: number, toId: number): void {
    this.db.fire(
      'INSERT INTO friend_requests (from_id, to_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
      [fromId, toId, Date.now()],
    );
  }

  async deleteFriendRequest(fromId: number, toId: number): Promise<boolean> {
    const res = await this.db.run('DELETE FROM friend_requests WHERE from_id = ? AND to_id = ?', [
      fromId,
      toId,
    ]);
    return res.rowCount > 0;
  }

  addFriendship(aId: number, bId: number): void {
    const now = Date.now();
    this.db.fireTransaction(async (tx) => {
      // Clear both pending directions, then lay both mirrored rows.
      await tx.run('DELETE FROM friend_requests WHERE from_id = ? AND to_id = ?', [aId, bId]);
      await tx.run('DELETE FROM friend_requests WHERE from_id = ? AND to_id = ?', [bId, aId]);
      const insert =
        'INSERT INTO character_friends (character_id, friend_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING';
      await tx.run(insert, [aId, bId, now]);
      await tx.run(insert, [bId, aId, now]);
    });
  }

  removeFriendship(aId: number, bId: number): void {
    this.db.fireTransaction(async (tx) => {
      await tx.run('DELETE FROM character_friends WHERE character_id = ? AND friend_id = ?', [aId, bId]);
      await tx.run('DELETE FROM character_friends WHERE character_id = ? AND friend_id = ?', [bId, aId]);
    });
  }

  /**
   * The party ledger. One party per character (UNIQUE column law);
   * membership is durable — it survives logout and ends only by a
   * deliberate leave/kick/disband. The in-memory PartySystem is the
   * runtime authority; these writes keep the durable copy true.
   */
  async loadPartyOf(characterId: number): Promise<{
    id: number;
    leaderId: number;
    members: Array<{ id: number; name: string; joinedAt: number }>;
  } | null> {
    const row = await this.db.get<{ party_id: number; leader_id: number }>(
      'SELECT m.party_id, p.leader_id FROM party_members m JOIN parties p ON p.id = m.party_id ' +
        'WHERE m.character_id = ?',
      [characterId],
    );
    if (!row) return null;
    const members = await this.db.query<{ id: number; name: string; joinedAt: number }>(
      'SELECT c.id, c.name, m.joined_at AS "joinedAt" FROM party_members m ' +
        // character_id tiebreak: two joins can land in the same ms and
        // a bare joined_at sort flips their order run to run.
        'JOIN characters c ON c.id = m.character_id WHERE m.party_id = ? ORDER BY m.joined_at, m.character_id',
      [row.party_id],
    );
    return { id: row.party_id, leaderId: row.leader_id, members };
  }

  /** Found a new party of two. Returns the party id, or null if either soul is already sworn. */
  async createParty(leaderId: number, memberId: number): Promise<number | null> {
    try {
      return await this.db.transaction(async (tx) => {
        const row = await tx.get<{ id: number }>(
          'INSERT INTO parties (leader_id, created_at) VALUES (?, ?) RETURNING id',
          [leaderId, Date.now()],
        );
        if (!row) throw new Error('party insert returned nothing');
        const now = Date.now();
        await tx.run('INSERT INTO party_members (party_id, character_id, joined_at) VALUES (?, ?, ?)', [
          row.id,
          leaderId,
          now,
        ]);
        await tx.run('INSERT INTO party_members (party_id, character_id, joined_at) VALUES (?, ?, ?)', [
          row.id,
          memberId,
          now + 1,
        ]);
        return row.id;
      });
    } catch {
      // The UNIQUE law fired — someone is already in a party.
      return null;
    }
  }

  async addPartyMember(partyId: number, characterId: number): Promise<boolean> {
    try {
      // Seat AFTER every current member: createParty hands the founding
      // pair now/now+1, so a same-millisecond join must clear the max
      // or the newcomer sorts ahead of the founding member.
      const res = await this.db.run(
        'INSERT INTO party_members (party_id, character_id, joined_at) ' +
          'SELECT ?, ?, GREATEST(?, COALESCE(MAX(joined_at) + 1, 0)) FROM party_members WHERE party_id = ?',
        [partyId, characterId, Date.now(), partyId],
      );
      return res.rowCount > 0;
    } catch {
      return false; // already sworn elsewhere
    }
  }

  removePartyMember(characterId: number): void {
    this.db.fire('DELETE FROM party_members WHERE character_id = ?', [characterId]);
  }

  setPartyLeader(partyId: number, characterId: number): void {
    this.db.fire('UPDATE parties SET leader_id = ? WHERE id = ?', [characterId, partyId]);
  }

  disbandParty(partyId: number): void {
    // Members go with the party (ON DELETE CASCADE).
    this.db.fire('DELETE FROM parties WHERE id = ?', [partyId]);
  }

  async loadInventory(
    characterId: number,
    size: number,
  ): Promise<Array<{ item: string; qty: number; roll?: ItemRoll; stolen?: true } | null>> {
    const rows = await this.db.query<{
      slot: number;
      item_id: string;
      qty: number;
      rar: string | null;
      seed: number | null;
      pwr: number | null;
      coat_id: string | null;
      coat_until: number | null;
      ench_id: string | null;
      quality: number | null;
      deep: number | null;
      ench2_id: string | null;
      quality2: number | null;
      stolen: number | null;
    }>(
      'SELECT slot, item_id, qty, rar, seed, pwr, coat_id, coat_until, ench_id, quality, deep, ench2_id, quality2, stolen FROM inventory_slots WHERE character_id = ?',
      [characterId],
    );
    const slots = new Array<{ item: string; qty: number; roll?: ItemRoll; stolen?: true } | null>(
      size,
    ).fill(null);
    for (const row of rows) {
      if (row.slot >= 0 && row.slot < size) {
        slots[row.slot] = {
          item: row.item_id,
          qty: row.qty,
          roll: rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id, row.quality, row.deep, row.ench2_id, row.quality2),
          ...(row.stolen ? { stolen: true as const } : {}),
        };
      }
    }
    return slots;
  }

  async loadBuiltTiles(): Promise<
    Array<{ tx: number; ty: number; tile: number; owner: number; prevTile: number }>
  > {
    return this.db.query<{ tx: number; ty: number; tile: number; owner: number; prevTile: number }>(
      'SELECT tx, ty, tile, owner_character_id AS owner, prev_tile AS "prevTile" FROM built_tiles',
    );
  }

  saveBuiltTile(tx: number, ty: number, tile: number, owner: number, prevTile: number): void {
    // THE LAYER LAW (building v2): prev_tile is what stood there AT
    // THIS BUILD — a wall raised on your floor remembers the floor, so
    // demolishing tears down one layer, never through it to grass.
    // (The demolish path re-registers a restored player floor with the
    // pristine ground beneath, keeping the chain honest at depth 1.)
    this.db.fire(
      'INSERT INTO built_tiles (tx, ty, tile, owner_character_id, created_at, prev_tile) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET tile = excluded.tile, owner_character_id = excluded.owner_character_id, prev_tile = excluded.prev_tile',
      [tx, ty, tile, owner, Date.now(), prevTile],
    );
  }

  deleteBuiltTile(tx: number, ty: number): void {
    this.db.fire('DELETE FROM built_tiles WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  // ------------------------------- THE SECOND LAYER (wall hangings)

  async loadBuiltDetails(): Promise<
    Array<{ tx: number; ty: number; detail: number; owner: number; prevDetail: number }>
  > {
    return this.db.query<{ tx: number; ty: number; detail: number; owner: number; prevDetail: number }>(
      'SELECT tx, ty, detail, owner_character_id AS owner, prev_detail AS "prevDetail" FROM built_details',
    );
  }

  saveBuiltDetail(tx: number, ty: number, detail: number, owner: number, prevDetail: number): void {
    // The LAYER LAW, one lane over: prev_detail is what hung here AT
    // THIS HANG. Re-hanging replaces the row whole (built_tiles'
    // always-update shape) — the chain stays honest at depth 1.
    this.db.fire(
      'INSERT INTO built_details (tx, ty, detail, owner_character_id, created_at, prev_detail) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET detail = excluded.detail, owner_character_id = excluded.owner_character_id, prev_detail = excluded.prev_detail',
      [tx, ty, detail, owner, Date.now(), prevDetail],
    );
  }

  deleteBuiltDetail(tx: number, ty: number): void {
    this.db.fire('DELETE FROM built_details WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  // ------------------------------------------------- player signs

  /**
   * Every player-written sign in the world. Signs are few and tiny, so
   * the server holds them all in memory (the built_tiles pattern) and
   * this runs once at boot.
   */
  async loadSigns(): Promise<
    Array<{ tx: number; ty: number; title: string; lines: string[]; owner: number }>
  > {
    const rows = await this.db.query<{
      tx: number;
      ty: number;
      title: string;
      lines: string;
      owner: number;
    }>('SELECT tx, ty, title, lines, owner_character_id AS owner FROM signs');
    return rows.map((r) => ({
      tx: r.tx,
      ty: r.ty,
      title: r.title,
      lines: r.lines === '' ? [] : r.lines.split('\n'),
      owner: r.owner,
    }));
  }

  saveSign(tx: number, ty: number, title: string, lines: string[], owner: number): void {
    // The owner is written ONCE. A conflict update carries the old
    // owner forward on purpose: whoever raised the post keeps the pen
    // even if the row is rewritten through some other path.
    this.db.fire(
      'INSERT INTO signs (tx, ty, title, lines, owner_character_id, updated_at) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET title = excluded.title, lines = excluded.lines, ' +
        'updated_at = excluded.updated_at',
      [tx, ty, title, lines.join('\n'), owner, Date.now()],
    );
  }

  deleteSign(tx: number, ty: number): void {
    this.db.fire('DELETE FROM signs WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  // --------------------------------------------- world_pois ledger

  async loadPoiCells(): Promise<
    Array<{
      cellX: number;
      cellY: number;
      epoch: number;
      poiId: string | null;
      prefabId: string | null;
      tier: number | null;
      anchorX: number | null;
      anchorY: number | null;
      clearedAt: number | null;
      emberUntil: number | null;
      fallowUntil: number | null;
      stage: number;
      stageAt: number | null;
      originCell: string | null;
    }>
  > {
    return this.db.query(
      'SELECT cell_x AS "cellX", cell_y AS "cellY", epoch, poi_id AS "poiId", ' +
        'prefab_id AS "prefabId", tier, anchor_x AS "anchorX", anchor_y AS "anchorY", ' +
        'cleared_at AS "clearedAt", ember_until AS "emberUntil", fallow_until AS "fallowUntil", ' +
        'stage, stage_at AS "stageAt", origin_cell AS "originCell" ' +
        'FROM world_pois',
    ) as ReturnType<AccountStore['loadPoiCells']>;
  }

  /**
   * Record a decided cell (poiId null = decided empty). Write-once per
   * epoch. A fresh decision always clears the clear/ember clocks; a
   * dissolve records emptiness WITH fallow_until — the rest the cell
   * takes before it may host again (the ember law).
   */
  /** THE CAPITAL LAW's ledger (strongholds Phase 3). */
  async loadStrongholds(): Promise<
    Array<{
      latticeX: number;
      latticeY: number;
      layoutId: string;
      anchorX: number;
      anchorY: number;
      epoch: number;
      wardsCleared: number;
      clearedAt: number | null;
      emberUntil: number | null;
      fallowUntil: number | null;
      stage: number;
      stageAt: number | null;
    }>
  > {
    return this.db.query(
      'SELECT lattice_x AS "latticeX", lattice_y AS "latticeY", layout_id AS "layoutId", ' +
        'anchor_x AS "anchorX", anchor_y AS "anchorY", epoch, ' +
        'wards_cleared AS "wardsCleared", cleared_at AS "clearedAt", ' +
        'ember_until AS "emberUntil", fallow_until AS "fallowUntil", ' +
        'stage, stage_at AS "stageAt" FROM world_strongholds',
    ) as ReturnType<AccountStore['loadStrongholds']>;
  }

  /** THE LONG WAR: the capital ledger's full-row amendment. */
  saveStrongholdState(
    latticeX: number,
    latticeY: number,
    row: {
      layoutId: string;
      epoch: number;
      wardsCleared: number;
      clearedAt: number | null;
      emberUntil: number | null;
      fallowUntil: number | null;
      stage: number;
      stageAt: number | null;
    },
  ): void {
    this.db.fire(
      'UPDATE world_strongholds SET layout_id = ?, epoch = ?, wards_cleared = ?, cleared_at = ?, ' +
        'ember_until = ?, fallow_until = ?, stage = ?, stage_at = ? ' +
        'WHERE lattice_x = ? AND lattice_y = ?',
      [
        row.layoutId,
        row.epoch,
        row.wardsCleared,
        row.clearedAt,
        row.emberUntil,
        row.fallowUntil,
        row.stage,
        row.stageAt,
        latticeX,
        latticeY,
      ],
    );
  }

  markStrongholdWards(latticeX: number, latticeY: number, wardsCleared: number): void {
    this.db.fire(
      'UPDATE world_strongholds SET wards_cleared = ? WHERE lattice_x = ? AND lattice_y = ?',
      [wardsCleared, latticeX, latticeY],
    );
  }

  markStrongholdCleared(
    latticeX: number,
    latticeY: number,
    wardsCleared: number,
    clearedAt: number,
  ): void {
    this.db.fire(
      'UPDATE world_strongholds SET wards_cleared = ?, cleared_at = ? WHERE lattice_x = ? AND lattice_y = ?',
      [wardsCleared, clearedAt, latticeX, latticeY],
    );
  }

  recordStronghold(
    latticeX: number,
    latticeY: number,
    layoutId: string,
    anchorX: number,
    anchorY: number,
    epoch: number,
  ): void {
    this.db.fire(
      'INSERT INTO world_strongholds (lattice_x, lattice_y, layout_id, anchor_x, anchor_y, epoch, first_seen_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (lattice_x, lattice_y) DO UPDATE SET layout_id = excluded.layout_id, ' +
        'anchor_x = excluded.anchor_x, anchor_y = excluded.anchor_y, epoch = excluded.epoch',
      [latticeX, latticeY, layoutId, anchorX, anchorY, epoch, Date.now()],
    );
  }

  recordPoiCell(
    cellX: number,
    cellY: number,
    epoch: number,
    site: { poiId: string; prefabId: string; tier: number; anchorX: number; anchorY: number } | null,
    fallowUntil: number | null = null,
    originCell: string | null = null,
  ): void {
    this.db.fire(
      'INSERT INTO world_pois (cell_x, cell_y, epoch, poi_id, prefab_id, tier, anchor_x, anchor_y, first_seen_at, cleared_at, ember_until, fallow_until, stage, stage_at, origin_cell) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 0, NULL, ?) ' +
        'ON CONFLICT (cell_x, cell_y) DO UPDATE SET epoch = excluded.epoch, ' +
        'poi_id = excluded.poi_id, prefab_id = excluded.prefab_id, tier = excluded.tier, ' +
        'anchor_x = excluded.anchor_x, anchor_y = excluded.anchor_y, cleared_at = NULL, ' +
        'ember_until = NULL, fallow_until = excluded.fallow_until, ' +
        'stage = 0, stage_at = NULL, origin_cell = excluded.origin_cell',
      [
        cellX,
        cellY,
        epoch,
        site?.poiId ?? null,
        site?.prefabId ?? null,
        site?.tier ?? null,
        site?.anchorX ?? null,
        site?.anchorY ?? null,
        Date.now(),
        fallowUntil,
        originCell,
      ],
    );
  }

  // --------------------------------------------- the small finds

  /**
   * Every cell with cleared-find bits (THE SMALL FINDS ledger —
   * deviations only: cells whose finds all stand have no row).
   */
  async loadMinorCells(): Promise<
    Array<{ cellX: number; cellY: number; epoch: number; cleared: number }>
  > {
    return this.db.query(
      'SELECT cell_x AS "cellX", cell_y AS "cellY", epoch, cleared FROM world_minors',
    ) as ReturnType<AccountStore['loadMinorCells']>;
  }

  /**
   * Stamp a cell's cleared-slot mask for the given epoch. A re-deal
   * (new epoch) overwrites wholesale — stale bits never survive the
   * turn.
   */
  upsertMinorCell(cellX: number, cellY: number, epoch: number, cleared: number): void {
    this.db.fire(
      'INSERT INTO world_minors (cell_x, cell_y, epoch, cleared, first_seen_at) ' +
        'VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT (cell_x, cell_y) DO UPDATE SET epoch = excluded.epoch, ' +
        'cleared = excluded.cleared',
      [cellX, cellY, epoch, cleared, Date.now()],
    );
  }

  // --------------------------------------------- world_growth ledger

  /**
   * Every wild harvest still healing (THE SECOND GROWTH — deviations
   * only: ground that matches worldgen's seed-truth has no row). Loaded
   * once at boot into the WorldSource overlay.
   */
  async loadGrowth(): Promise<
    Array<{
      tx: number;
      ty: number;
      state: number;
      tile: number;
      since: number;
      due: number | null;
      owner: number | null;
      firstSeenAt: number;
    }>
  > {
    return this.db.query(
      'SELECT tx, ty, state, tile, since, due, owner_character_id AS owner, ' +
        'first_seen_at AS "firstSeenAt" FROM world_growth',
    ) as ReturnType<AccountStore['loadGrowth']>;
  }

  /**
   * Checkpoint a regrowth row. `first_seen_at` is written once and
   * kept on conflict — it is the jitter nonce for the whole chain, and
   * moving it would re-deal every remaining wait mid-flight.
   */
  saveGrowth(row: {
    tx: number;
    ty: number;
    state: number;
    tile: number;
    since: number;
    due: number | null;
    owner: number | null;
    firstSeenAt: number;
  }): void {
    this.db.fire(
      'INSERT INTO world_growth (tx, ty, state, tile, since, due, owner_character_id, first_seen_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET state = excluded.state, tile = excluded.tile, ' +
        'since = excluded.since, due = excluded.due, ' +
        'owner_character_id = excluded.owner_character_id',
      [row.tx, row.ty, row.state, row.tile, row.since, row.due, row.owner, row.firstSeenAt],
    );
  }

  /** The ground healed (or the land was claimed) — the deviation ends. */
  deleteGrowth(tx: number, ty: number): void {
    this.db.fire('DELETE FROM world_growth WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  /** Stamp a boldness rung (stage_at = when this rung began). */
  markPoiStage(cellX: number, cellY: number, stage: number, stageAt: number): void {
    this.db.fire('UPDATE world_pois SET stage = ?, stage_at = ? WHERE cell_x = ? AND cell_y = ?', [
      stage,
      stageAt,
      cellX,
      cellY,
    ]);
  }

  // --------------------------------------------- frontier calm

  /** Live relax windows (expired rows pruned by the sweep, not here). */
  async loadFrontierCalm(): Promise<Array<{ cellX: number; cellY: number; calmUntil: number }>> {
    return this.db.query(
      'SELECT cell_x AS "cellX", cell_y AS "cellY", calm_until AS "calmUntil" FROM frontier_calm',
    ) as ReturnType<AccountStore['loadFrontierCalm']>;
  }

  stampFrontierCalm(cellX: number, cellY: number, calmUntil: number): void {
    this.db.fire(
      'INSERT INTO frontier_calm (cell_x, cell_y, calm_until) VALUES (?, ?, ?) ' +
        'ON CONFLICT (cell_x, cell_y) DO UPDATE SET calm_until = ' +
        'GREATEST(frontier_calm.calm_until, excluded.calm_until)',
      [cellX, cellY, calmUntil],
    );
  }

  pruneFrontierCalm(now: number): void {
    this.db.fire('DELETE FROM frontier_calm WHERE calm_until < ?', [now]);
  }

  /**
   * Cell keys ('cx,cy') any character has a LIVE (unfaded) poi:
   * discovery for — the boldness clock only runs for discovered sites,
   * and this seeds the in-memory set at boot.
   */
  async loadDiscoveredPoiCells(): Promise<string[]> {
    const rows = (await this.db.query(
      "SELECT DISTINCT id FROM character_discoveries WHERE id LIKE 'poi:%' AND faded = 0",
    )) as Array<{ id: string }>;
    return rows.map((r) => r.id.slice(4));
  }

  /**
   * Stamp a full garrison wipe. Procedural sites carry ember_until —
   * when the broken camp will dissolve; authored landmarks pass null
   * (they never ember, the veil has always held its den).
   */
  markPoiCleared(cellX: number, cellY: number, emberUntil: number | null = null): void {
    this.db.fire(
      'UPDATE world_pois SET cleared_at = ?, ember_until = ? WHERE cell_x = ? AND cell_y = ?',
      [Date.now(), emberUntil, cellX, cellY],
    );
  }

  /** Re-stamp only the ember clock (boot reconcile of legacy clears, staging). */
  setPoiEmber(cellX: number, cellY: number, emberUntil: number | null): void {
    this.db.fire('UPDATE world_pois SET ember_until = ? WHERE cell_x = ? AND cell_y = ?', [
      emberUntil,
      cellX,
      cellY,
    ]);
  }

  // --------------------------------------------- frontier state

  /** The renewal debt the frontier owes the world (0 if never written). */
  async loadFrontierCredits(): Promise<number> {
    const rows = (await this.db.query(
      'SELECT renewal_credits AS credits FROM frontier_state WHERE id = 1',
    )) as Array<{ credits: number }>;
    return rows[0]?.credits ?? 0;
  }

  saveFrontierCredits(credits: number): void {
    this.db.fire(
      'INSERT INTO frontier_state (id, renewal_credits, updated_at) VALUES (1, ?, ?) ' +
        'ON CONFLICT (id) DO UPDATE SET renewal_credits = excluded.renewal_credits, ' +
        'updated_at = excluded.updated_at',
      [credits, Date.now()],
    );
  }

  async loadCrops(): Promise<
    Array<{
      tx: number;
      ty: number;
      crop: string;
      plantedAt: number;
      boostMs: number;
      watered: number;
      owner: number;
      soil: number;
      mulched: number;
      framed: number;
      cycles: number;
    }>
  > {
    return this.db.query(
      'SELECT tx, ty, crop, planted_at AS "plantedAt", boost_ms AS "boostMs", watered, ' +
        'owner_character_id AS owner, soil, mulched, framed, cycles FROM crops',
    ) as ReturnType<AccountStore['loadCrops']>;
  }

  upsertCrop(
    tx: number,
    ty: number,
    crop: string,
    plantedAt: number,
    boostMs: number,
    watered: number,
    owner: number,
    soil: number,
    mulched: number,
    framed: number,
    cycles: number,
  ): void {
    this.db.fire(
      'INSERT INTO crops (tx, ty, crop, planted_at, boost_ms, watered, owner_character_id, soil, mulched, framed, cycles) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET crop = excluded.crop, ' +
        'planted_at = excluded.planted_at, boost_ms = excluded.boost_ms, ' +
        'watered = excluded.watered, owner_character_id = excluded.owner_character_id, ' +
        'soil = excluded.soil, mulched = excluded.mulched, ' +
        'framed = excluded.framed, cycles = excluded.cycles',
      [tx, ty, crop, plantedAt, boostMs, watered, owner, soil, mulched, framed, cycles],
    );
  }

  deleteCrop(tx: number, ty: number): void {
    this.db.fire('DELETE FROM crops WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  /**
   * THE LIVING SOIL: compost bins. Deviations-shaped — a row exists
   * only while a bin holds anything; an emptied bin deletes its row.
   */
  async loadFarmBins(): Promise<
    Array<{ tx: number; ty: number; fill: number; graded: number; startedAt: number }>
  > {
    return this.db.query(
      'SELECT tx, ty, fill, graded, started_at AS "startedAt" FROM farm_bins',
    ) as ReturnType<AccountStore['loadFarmBins']>;
  }

  upsertFarmBin(tx: number, ty: number, fill: number, graded: number, startedAt: number): void {
    this.db.fire(
      'INSERT INTO farm_bins (tx, ty, fill, graded, started_at) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET fill = excluded.fill, graded = excluded.graded, ' +
        'started_at = excluded.started_at',
      [tx, ty, fill, graded, startedAt],
    );
  }

  deleteFarmBin(tx: number, ty: number): void {
    this.db.fire('DELETE FROM farm_bins WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  /** THE ANIMALS OF THE YARD: every kept animal, world-wide, at boot. */
  async loadLivestock(): Promise<
    Array<{
      characterId: number;
      slot: number;
      species: string;
      name: string;
      tx: number;
      ty: number;
      bond: number;
      brushedAt: number;
      nextProduceAt: number;
      bornAt: number;
    }>
  > {
    return this.db.query(
      'SELECT character_id AS "characterId", slot, species, name, tx, ty, bond, ' +
        'brushed_at AS "brushedAt", next_produce_at AS "nextProduceAt", born_at AS "bornAt" ' +
        'FROM livestock',
    ) as ReturnType<AccountStore['loadLivestock']>;
  }

  saveLivestock(row: {
    characterId: number;
    slot: number;
    species: string;
    name: string;
    tx: number;
    ty: number;
    bond: number;
    brushedAt: number;
    nextProduceAt: number;
    bornAt: number;
  }): void {
    this.db.fire(
      'INSERT INTO livestock (character_id, slot, species, name, tx, ty, bond, brushed_at, next_produce_at, born_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (character_id, slot) DO UPDATE SET species = excluded.species, ' +
        'name = excluded.name, tx = excluded.tx, ty = excluded.ty, bond = excluded.bond, ' +
        'brushed_at = excluded.brushed_at, next_produce_at = excluded.next_produce_at, ' +
        'born_at = excluded.born_at',
      [
        row.characterId,
        row.slot,
        row.species,
        row.name,
        row.tx,
        row.ty,
        row.bond,
        row.brushedAt,
        row.nextProduceAt,
        row.bornAt,
      ],
    );
  }

  deleteLivestock(characterId: number, slot: number): void {
    this.db.fire('DELETE FROM livestock WHERE character_id = ? AND slot = ?', [characterId, slot]);
  }

  async loadFarmTroughs(): Promise<Array<{ tx: number; ty: number; feed: number }>> {
    return this.db.query('SELECT tx, ty, feed FROM farm_troughs') as ReturnType<
      AccountStore['loadFarmTroughs']
    >;
  }

  upsertFarmTrough(tx: number, ty: number, feed: number): void {
    this.db.fire(
      'INSERT INTO farm_troughs (tx, ty, feed) VALUES (?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET feed = excluded.feed',
      [tx, ty, feed],
    );
  }

  deleteFarmTrough(tx: number, ty: number): void {
    this.db.fire('DELETE FROM farm_troughs WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  /** THE WORKING YARD: station jobs and apiaries, whole at boot. */
  async loadStationJobs(): Promise<
    Array<{ tx: number; ty: number; recipe: string; qty: number; startedAt: number; grade: number; owner: number }>
  > {
    return this.db.query(
      'SELECT tx, ty, recipe, qty, started_at AS "startedAt", grade, owner_character_id AS owner FROM station_jobs',
    ) as ReturnType<AccountStore['loadStationJobs']>;
  }

  upsertStationJob(tx: number, ty: number, recipe: string, qty: number, startedAt: number, grade: number, owner: number): void {
    this.db.fire(
      'INSERT INTO station_jobs (tx, ty, recipe, qty, started_at, grade, owner_character_id) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET recipe = excluded.recipe, qty = excluded.qty, ' +
        'started_at = excluded.started_at, grade = excluded.grade, owner_character_id = excluded.owner_character_id',
      [tx, ty, recipe, qty, startedAt, grade, owner],
    );
  }

  deleteStationJob(tx: number, ty: number): void {
    this.db.fire('DELETE FROM station_jobs WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  async loadFarmApiaries(): Promise<Array<{ tx: number; ty: number; since: number }>> {
    return this.db.query('SELECT tx, ty, since FROM farm_apiaries') as ReturnType<
      AccountStore['loadFarmApiaries']
    >;
  }

  upsertFarmApiary(tx: number, ty: number, since: number): void {
    this.db.fire(
      'INSERT INTO farm_apiaries (tx, ty, since) VALUES (?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET since = excluded.since',
      [tx, ty, since],
    );
  }

  deleteFarmApiary(tx: number, ty: number): void {
    this.db.fire('DELETE FROM farm_apiaries WHERE tx = ? AND ty = ?', [tx, ty]);
  }

  /** THE LARDER BOARD: filled counts for the living epoch(s). */
  async loadLarderFills(sinceEpoch: number): Promise<Array<{ shop: string; epoch: number; filled: number }>> {
    return this.db.query('SELECT shop, epoch, filled FROM larder_orders WHERE epoch >= ?', [
      sinceEpoch,
    ]) as ReturnType<AccountStore['loadLarderFills']>;
  }

  upsertLarderFill(shop: string, epoch: number, filled: number): void {
    this.db.fire(
      'INSERT INTO larder_orders (shop, epoch, filled) VALUES (?, ?, ?) ' +
        'ON CONFLICT (shop, epoch) DO UPDATE SET filled = excluded.filled',
      [shop, epoch, filled],
    );
  }

  async loadBank(characterId: number): Promise<Record<string, number>> {
    const rows = await this.db.query<{ item_id: string; qty: number }>(
      'SELECT item_id, qty FROM bank_items WHERE character_id = ?',
      [characterId],
    );
    const out: Record<string, number> = {};
    for (const row of rows) out[row.item_id] = row.qty;
    return out;
  }

  saveBank(characterId: number, items: Record<string, number>): void {
    this.db.fireTransaction(async (tx) => {
      await tx.run('DELETE FROM bank_items WHERE character_id = ?', [characterId]);
      for (const [item, qty] of Object.entries(items)) {
        if (qty > 0) {
          await tx.run('INSERT INTO bank_items (character_id, item_id, qty) VALUES (?, ?, ?)', [
            characterId,
            item,
            qty,
          ]);
        }
      }
    });
  }

  async loadEquipment(characterId: number): Promise<Record<string, { id: string; roll?: ItemRoll }>> {
    const rows = await this.db.query<{
      slot: string;
      item_id: string;
      rar: string | null;
      seed: number | null;
      pwr: number | null;
      coat_id: string | null;
      coat_until: number | null;
      ench_id: string | null;
      quality: number | null;
      deep: number | null;
      ench2_id: string | null;
      quality2: number | null;
    }>(
      'SELECT slot, item_id, rar, seed, pwr, coat_id, coat_until, ench_id, quality, deep, ench2_id, quality2 FROM equipment WHERE character_id = ?',
      [characterId],
    );
    const out: Record<string, { id: string; roll?: ItemRoll }> = {};
    for (const row of rows) {
      out[row.slot] = {
        id: row.item_id,
        roll: rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id, row.quality, row.deep, row.ench2_id, row.quality2),
      };
    }
    return out;
  }

  saveEquipment(
    characterId: number,
    equipment: Record<string, { id: string; roll?: ItemRoll } | undefined>,
  ): void {
    this.db.fireTransaction(async (tx) => {
      await tx.run('DELETE FROM equipment WHERE character_id = ?', [characterId]);
      for (const [slot, worn] of Object.entries(equipment)) {
        if (worn) {
          await tx.run(
            'INSERT INTO equipment (character_id, slot, item_id, rar, seed, pwr, coat_id, coat_until, ench_id, quality, deep, ench2_id, quality2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              characterId, slot, worn.id,
              worn.roll?.rar ?? null, worn.roll?.seed ?? null, worn.roll?.pwr ?? null,
              worn.roll?.coat?.id ?? null, worn.roll?.coat?.until ?? null,
              worn.roll?.ench ?? null, worn.roll?.q ?? null,
              worn.roll?.deep ? 1 : null, worn.roll?.ench2 ?? null, worn.roll?.q2 ?? null,
            ],
          );
        }
      }
    });
  }

  /**
   * Bank gear instances are ROW-ops, never delete-all+reinsert: the
   * client addresses withdrawals by row id, so ids must stay stable
   * across every other operation.
   */
  async loadBankGear(characterId: number): Promise<Array<{ id: number; item: string; roll: ItemRoll }>> {
    const rows = await this.db.query<{
      id: number;
      item_id: string;
      rar: string;
      seed: number;
      pwr: number | null;
      coat_id: string | null;
      coat_until: number | null;
      ench_id: string | null;
      quality: number | null;
      deep: number | null;
      ench2_id: string | null;
      quality2: number | null;
    }>(
      'SELECT id, item_id, rar, seed, pwr, coat_id, coat_until, ench_id, quality, deep, ench2_id, quality2 FROM bank_gear WHERE character_id = ? ORDER BY id',
      [characterId],
    );
    const out: Array<{ id: number; item: string; roll: ItemRoll }> = [];
    for (const row of rows) {
      const roll = rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id, row.quality, row.deep, row.ench2_id, row.quality2);
      if (roll) out.push({ id: row.id, item: row.item_id, roll });
    }
    return out;
  }

  async insertBankGear(characterId: number, item: string, roll: ItemRoll): Promise<number> {
    const row = await this.db.get<{ id: number }>(
      'INSERT INTO bank_gear (character_id, item_id, rar, seed, pwr, coat_id, coat_until, ench_id, quality, deep, ench2_id, quality2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [
        characterId, item, roll.rar, roll.seed, roll.pwr ?? null,
        roll.coat?.id ?? null, roll.coat?.until ?? null, roll.ench ?? null, roll.q ?? null,
        roll.deep ? 1 : null, roll.ench2 ?? null, roll.q2 ?? null,
      ],
    );
    return row!.id;
  }

  async deleteBankGear(id: number, characterId: number): Promise<boolean> {
    const res = await this.db.run('DELETE FROM bank_gear WHERE id = ? AND character_id = ?', [
      id,
      characterId,
    ]);
    return res.rowCount > 0;
  }

  async loadLook(characterId: number): Promise<Look | null> {
    const row = await this.db.get<{ look: string | null }>(
      'SELECT look FROM characters WHERE id = ?',
      [characterId],
    );
    if (!row?.look) return null;
    try {
      return sanitizeLook(JSON.parse(row.look));
    } catch {
      return null;
    }
  }

  saveLook(characterId: number, look: Look): void {
    this.db.fire('UPDATE characters SET look = ? WHERE id = ?', [JSON.stringify(look), characterId]);
  }

  /** Per-hand grip preferences: [main fist, off fist]. NULL = standard. */
  async loadCarryStyles(characterId: number): Promise<{ main: 'normal' | 'rogue'; off: 'normal' | 'rogue' }> {
    const row = await this.db.get<{ carry_style: string | null; carry_style_off: string | null }>(
      'SELECT carry_style, carry_style_off FROM characters WHERE id = ?',
      [characterId],
    );
    return {
      main: row?.carry_style === 'rogue' ? 'rogue' : 'normal',
      off: row?.carry_style_off === 'rogue' ? 'rogue' : 'normal',
    };
  }

  saveCarryStyle(characterId: number, hand: 'main' | 'off', style: 'normal' | 'rogue'): void {
    const col = hand === 'off' ? 'carry_style_off' : 'carry_style';
    this.db.fire(`UPDATE characters SET ${col} = ? WHERE id = ?`, [
      style === 'rogue' ? 'rogue' : null,
      characterId,
    ]);
  }

  /**
   * THE SECOND HAND: two seated techniques per character, kept under
   * the reserved keys 'slotq' (the Q seat) and 'slot' (the R seat —
   * THE FREE HAND's original key, so no row rewrites on the cutover).
   * Legacy per-style rows (or a fresh sqlite import) still read as an
   * R-seat fallback so an old character keeps a chosen art until
   * their next save collapses it. No migration — the table was shaped
   * so renames never reseed.
   */
  async loadTechniques(characterId: number): Promise<[string | null, string | null]> {
    const rows = await this.db.query<{ style: string; ability: string }>(
      'SELECT style, ability FROM character_techniques WHERE character_id = ?',
      [characterId],
    );
    const q = rows.find((r) => r.style === 'slotq')?.ability ?? null;
    const order = ['slot', 'onehand', 'melee', 'archery', 'magic', 'sneak', 'twohand', 'shield', 'dualwield', 'combat'];
    const rank = (s: string) => {
      const i = order.indexOf(s);
      return i < 0 ? order.length : i;
    };
    const rRows = rows.filter((r) => r.style !== 'slotq').sort((a, b) => rank(a.style) - rank(b.style));
    return [q, rRows[0]?.ability ?? null];
  }

  saveTechniqueSeat(characterId: number, seat: 0 | 1, ability: string): void {
    this.db.fire(
      "DELETE FROM character_techniques WHERE character_id = ? AND style NOT IN ('slot', 'slotq')",
      [characterId],
    );
    this.db.fire(
      'INSERT INTO character_techniques (character_id, style, ability) VALUES (?, ?, ?) ' +
        'ON CONFLICT (character_id, style) DO UPDATE SET ability = excluded.ability',
      [characterId, seat === 0 ? 'slotq' : 'slot', ability],
    );
  }

  /** Answered Callings — row presence IS the answer. */
  async loadCallings(characterId: number): Promise<string[]> {
    const rows = await this.db.query<{ calling: string }>(
      'SELECT calling FROM character_callings WHERE character_id = ?',
      [characterId],
    );
    return rows.map((r) => r.calling);
  }

  saveCalling(characterId: number, calling: string): void {
    this.db.fire(
      'INSERT INTO character_callings (character_id, calling) VALUES (?, ?) ' +
        'ON CONFLICT (character_id, calling) DO NOTHING',
      [characterId, calling],
    );
  }

  deleteCalling(characterId: number, calling: string): void {
    this.db.fire('DELETE FROM character_callings WHERE character_id = ? AND calling = ?', [
      characterId,
      calling,
    ]);
  }

  /** THE STABLE DOOR: the beasts a character keeps; `chosen` answers the whistle. */
  async loadMounts(characterId: number): Promise<Array<{ id: string; chosen: boolean }>> {
    const rows = await this.db.query<{ mount_id: string; chosen: number }>(
      'SELECT mount_id, chosen FROM character_mounts WHERE character_id = ?',
      [characterId],
    );
    return rows.map((r) => ({ id: r.mount_id, chosen: Number(r.chosen) !== 0 }));
  }

  /** A new beast joins the string and takes the whistle. */
  saveMountGrant(characterId: number, mountId: string, nowMs: number): void {
    this.db.fire('UPDATE character_mounts SET chosen = 0 WHERE character_id = ?', [characterId]);
    this.db.fire(
      'INSERT INTO character_mounts (character_id, mount_id, chosen, acquired_at) VALUES (?, ?, 1, ?) ' +
        'ON CONFLICT (character_id, mount_id) DO UPDATE SET chosen = 1',
      [characterId, mountId, nowMs],
    );
  }

  /**
   * THE OPEN HAND: one kept companion. The (character, slot) pair is
   * its whole identity (THREE STALLS), so the row rides plain upserts
   * with no id sequence anywhere near the tick path. The DB row is
   * the animal; the world entity is only its visit.
   */
  async loadPets(characterId: number): Promise<PetRow[]> {
    const rows = await this.db.query<{
      slot: number;
      species: string;
      name: string;
      xp: number;
      state: string;
      rested_at: number | null;
    }>(
      'SELECT slot, species, name, xp, state, rested_at FROM character_pets WHERE character_id = ? ORDER BY slot',
      [characterId],
    );
    return rows.map((r) => ({
      slot: Number(r.slot),
      species: r.species,
      name: r.name,
      xp: Number(r.xp),
      // An unknown state (a future phase's word, an edited row) reads
      // as safely stabled — never a phantom body at heel.
      state: r.state === 'heel' || r.state === 'resting' ? r.state : 'stabled',
      restedAt: r.rested_at === null ? null : Number(r.rested_at),
    }));
  }

  /** The gentling ceremony's write: the full row, fired at the moment.
   *  A re-used stall clears any stale rest clock — a fresh bond never
   *  inherits a predecessor's convalescence. */
  savePet(characterId: number, pet: PetRow, tamedAtMs: number): void {
    this.db.fire(
      'INSERT INTO character_pets (character_id, slot, species, name, xp, state, tamed_at) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (character_id, slot) DO UPDATE SET species = excluded.species, name = excluded.name, xp = excluded.xp, state = excluded.state, rested_at = NULL',
      [characterId, pet.slot, pet.species, pet.name, pet.xp, pet.state, tamedAtMs],
    );
  }

  savePetName(characterId: number, slot: number, name: string): void {
    this.db.fire('UPDATE character_pets SET name = ? WHERE character_id = ? AND slot = ?', [
      name,
      characterId,
      slot,
    ]);
  }

  savePetXp(characterId: number, slot: number, xp: number): void {
    this.db.fire('UPDATE character_pets SET xp = ? WHERE character_id = ? AND slot = ?', [
      xp,
      characterId,
      slot,
    ]);
  }

  savePetState(characterId: number, slot: number, state: PetState): void {
    this.db.fire('UPDATE character_pets SET state = ? WHERE character_id = ? AND slot = ?', [
      state,
      characterId,
      slot,
    ]);
  }

  /** The limp home and the rested rise — state and clock move together. */
  savePetRest(characterId: number, slot: number, state: PetState, restedAtMs: number | null): void {
    this.db.fire(
      'UPDATE character_pets SET state = ?, rested_at = ? WHERE character_id = ? AND slot = ?',
      [state, restedAtMs, characterId, slot],
    );
  }

  /** The release. Phase 4 gives it its ceremony; the dev lever uses it today. */
  deletePet(characterId: number, slot: number): void {
    this.db.fire('DELETE FROM character_pets WHERE character_id = ? AND slot = ?', [
      characterId,
      slot,
    ]);
  }

  saveInventory(
    characterId: number,
    slots: Array<{ item: string; qty: number; roll?: ItemRoll; stolen?: true } | null>,
  ): void {
    this.db.fireTransaction(async (tx) => {
      await tx.run('DELETE FROM inventory_slots WHERE character_id = ?', [characterId]);
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot) {
          await tx.run(
            'INSERT INTO inventory_slots (character_id, slot, item_id, qty, rar, seed, pwr, coat_id, coat_until, ench_id, quality, deep, ench2_id, quality2, stolen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              characterId, i, slot.item, slot.qty,
              slot.roll?.rar ?? null, slot.roll?.seed ?? null, slot.roll?.pwr ?? null,
              slot.roll?.coat?.id ?? null, slot.roll?.coat?.until ?? null,
              slot.roll?.ench ?? null, slot.roll?.q ?? null,
              slot.roll?.deep ? 1 : null, slot.roll?.ench2 ?? null, slot.roll?.q2 ?? null,
              slot.stolen ? 1 : null,
            ],
          );
        }
      }
    });
  }
}
