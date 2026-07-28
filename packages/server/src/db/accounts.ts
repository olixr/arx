import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isRarityTier, sanitizeLook, type ItemRoll, type Look } from '@arx/shared';
import type { Db } from './db.js';

/** NULL-tolerant roll reader for legacy rows (pre-migration-11). */
function rowRoll(
  rar: string | null,
  seed: number | null,
  pwr?: number | null,
  coatId?: string | null,
  coatUntil?: number | null,
  enchId?: string | null,
): ItemRoll | undefined {
  if (rar === null || seed === null || !isRarityTier(rar)) return undefined;
  const roll: ItemRoll = { rar, seed };
  if (pwr !== null && pwr !== undefined) roll.pwr = pwr;
  // Expired oils dry off at load — the clock runs even in the bank.
  if (coatId != null && coatUntil != null && coatUntil > Date.now()) {
    roll.coat = { id: coatId, until: coatUntil };
  }
  if (enchId != null) roll.ench = enchId;
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
}

export type AuthResult =
  | { ok: true; accountId: number; character: CharacterRow }
  | { ok: false; reason: string };

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
      'SELECT id, account_id, name, x, y, hp, home_x, home_y, hearth_at, waypoint_x, waypoint_y FROM characters WHERE account_id = ? ORDER BY id LIMIT 1',
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

  async resumeSession(token: string): Promise<AuthResult> {
    const row = await this.db.get<{ account_id: number }>(
      'SELECT account_id FROM sessions WHERE token = ? AND expires_at > ?',
      [token, Date.now()],
    );
    if (!row) return { ok: false, reason: 'Session expired' };
    const character = await this.db.get<CharacterRow>(
      'SELECT id, account_id, name, x, y, hp, home_x, home_y, hearth_at, waypoint_x, waypoint_y FROM characters WHERE account_id = ? ORDER BY id LIMIT 1',
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

  async loadInventory(
    characterId: number,
    size: number,
  ): Promise<Array<{ item: string; qty: number; roll?: ItemRoll } | null>> {
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
    }>(
      'SELECT slot, item_id, qty, rar, seed, pwr, coat_id, coat_until, ench_id FROM inventory_slots WHERE character_id = ?',
      [characterId],
    );
    const slots = new Array<{ item: string; qty: number; roll?: ItemRoll } | null>(size).fill(null);
    for (const row of rows) {
      if (row.slot >= 0 && row.slot < size) {
        slots[row.slot] = {
          item: row.item_id,
          qty: row.qty,
          roll: rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id),
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
    // On rebuild-over-a-build, prev_tile keeps the ORIGINAL ground the
    // conflict row captured — demolishing a replaced piece should still
    // return the natural terrain, not the intermediate construction.
    this.db.fire(
      'INSERT INTO built_tiles (tx, ty, tile, owner_character_id, created_at, prev_tile) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET tile = excluded.tile, owner_character_id = excluded.owner_character_id',
      [tx, ty, tile, owner, Date.now(), prevTile],
    );
  }

  deleteBuiltTile(tx: number, ty: number): void {
    this.db.fire('DELETE FROM built_tiles WHERE tx = ? AND ty = ?', [tx, ty]);
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
    }>
  > {
    return this.db.query(
      'SELECT cell_x AS "cellX", cell_y AS "cellY", epoch, poi_id AS "poiId", ' +
        'prefab_id AS "prefabId", tier, anchor_x AS "anchorX", anchor_y AS "anchorY", ' +
        'cleared_at AS "clearedAt" FROM world_pois',
    ) as ReturnType<AccountStore['loadPoiCells']>;
  }

  /** Record a decided cell (poiId null = decided empty). Write-once per epoch. */
  recordPoiCell(
    cellX: number,
    cellY: number,
    epoch: number,
    site: { poiId: string; prefabId: string; tier: number; anchorX: number; anchorY: number } | null,
  ): void {
    this.db.fire(
      'INSERT INTO world_pois (cell_x, cell_y, epoch, poi_id, prefab_id, tier, anchor_x, anchor_y, first_seen_at, cleared_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL) ' +
        'ON CONFLICT (cell_x, cell_y) DO UPDATE SET epoch = excluded.epoch, ' +
        'poi_id = excluded.poi_id, prefab_id = excluded.prefab_id, tier = excluded.tier, ' +
        'anchor_x = excluded.anchor_x, anchor_y = excluded.anchor_y, cleared_at = NULL',
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
      ],
    );
  }

  /** Stamp the last full garrison wipe (the phase-3 fallow sweep reads it). */
  markPoiCleared(cellX: number, cellY: number): void {
    this.db.fire('UPDATE world_pois SET cleared_at = ? WHERE cell_x = ? AND cell_y = ?', [
      Date.now(),
      cellX,
      cellY,
    ]);
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
    }>
  > {
    return this.db.query(
      'SELECT tx, ty, crop, planted_at AS "plantedAt", boost_ms AS "boostMs", watered, ' +
        'owner_character_id AS owner FROM crops',
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
  ): void {
    this.db.fire(
      'INSERT INTO crops (tx, ty, crop, planted_at, boost_ms, watered, owner_character_id) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (tx, ty) DO UPDATE SET crop = excluded.crop, ' +
        'planted_at = excluded.planted_at, boost_ms = excluded.boost_ms, ' +
        'watered = excluded.watered, owner_character_id = excluded.owner_character_id',
      [tx, ty, crop, plantedAt, boostMs, watered, owner],
    );
  }

  deleteCrop(tx: number, ty: number): void {
    this.db.fire('DELETE FROM crops WHERE tx = ? AND ty = ?', [tx, ty]);
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
    }>(
      'SELECT slot, item_id, rar, seed, pwr, coat_id, coat_until, ench_id FROM equipment WHERE character_id = ?',
      [characterId],
    );
    const out: Record<string, { id: string; roll?: ItemRoll }> = {};
    for (const row of rows) {
      out[row.slot] = {
        id: row.item_id,
        roll: rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id),
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
            'INSERT INTO equipment (character_id, slot, item_id, rar, seed, pwr, coat_id, coat_until, ench_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              characterId, slot, worn.id,
              worn.roll?.rar ?? null, worn.roll?.seed ?? null, worn.roll?.pwr ?? null,
              worn.roll?.coat?.id ?? null, worn.roll?.coat?.until ?? null,
              worn.roll?.ench ?? null,
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
    }>(
      'SELECT id, item_id, rar, seed, pwr, coat_id, coat_until, ench_id FROM bank_gear WHERE character_id = ? ORDER BY id',
      [characterId],
    );
    const out: Array<{ id: number; item: string; roll: ItemRoll }> = [];
    for (const row of rows) {
      const roll = rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id);
      if (roll) out.push({ id: row.id, item: row.item_id, roll });
    }
    return out;
  }

  async insertBankGear(characterId: number, item: string, roll: ItemRoll): Promise<number> {
    const row = await this.db.get<{ id: number }>(
      'INSERT INTO bank_gear (character_id, item_id, rar, seed, pwr, coat_id, coat_until, ench_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [
        characterId, item, roll.rar, roll.seed, roll.pwr ?? null,
        roll.coat?.id ?? null, roll.coat?.until ?? null, roll.ench ?? null,
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

  async loadTechniques(characterId: number): Promise<Record<string, string>> {
    const rows = await this.db.query<{ style: string; ability: string }>(
      'SELECT style, ability FROM character_techniques WHERE character_id = ?',
      [characterId],
    );
    const out: Record<string, string> = {};
    for (const row of rows) out[row.style] = row.ability;
    return out;
  }

  saveTechnique(characterId: number, style: string, ability: string): void {
    this.db.fire(
      'INSERT INTO character_techniques (character_id, style, ability) VALUES (?, ?, ?) ' +
        'ON CONFLICT (character_id, style) DO UPDATE SET ability = excluded.ability',
      [characterId, style, ability],
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

  saveInventory(
    characterId: number,
    slots: Array<{ item: string; qty: number; roll?: ItemRoll } | null>,
  ): void {
    this.db.fireTransaction(async (tx) => {
      await tx.run('DELETE FROM inventory_slots WHERE character_id = ?', [characterId]);
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot) {
          await tx.run(
            'INSERT INTO inventory_slots (character_id, slot, item_id, qty, rar, seed, pwr, coat_id, coat_until, ench_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              characterId, i, slot.item, slot.qty,
              slot.roll?.rar ?? null, slot.roll?.seed ?? null, slot.roll?.pwr ?? null,
              slot.roll?.coat?.id ?? null, slot.roll?.coat?.until ?? null,
              slot.roll?.ench ?? null,
            ],
          );
        }
      }
    });
  }
}
