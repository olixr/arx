import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { isRarityTier, sanitizeLook, type ItemRoll, type Look } from '@devcraft/shared';

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
}

export type AuthResult =
  | { ok: true; accountId: number; character: CharacterRow }
  | { ok: false; reason: string };

/**
 * Accounts, sessions, and character records. Passwords are scrypt-hashed
 * with a per-account salt; session tokens persist so reconnects survive
 * server restarts.
 */
export class AccountStore {
  constructor(private readonly db: DatabaseSync) {}

  register(username: string, password: string, charName: string, spawn: { x: number; y: number }): AuthResult {
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
    const existing = this.db.prepare('SELECT id FROM accounts WHERE username = ?').get(user);
    if (existing) return { ok: false, reason: 'That username is taken' };
    const nameTaken = this.db.prepare('SELECT id FROM characters WHERE name = ?').get(name);
    if (nameTaken) return { ok: false, reason: 'That character name is taken' };

    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
    const now = Date.now();
    const acc = this.db
      .prepare('INSERT INTO accounts (username, pass_hash, pass_salt, created_at) VALUES (?, ?, ?, ?)')
      .run(user, hash, salt, now);
    const accountId = Number(acc.lastInsertRowid);
    const ch = this.db
      .prepare(
        'INSERT INTO characters (account_id, name, x, y, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(accountId, name, spawn.x, spawn.y, now, now);
    return {
      ok: true,
      accountId,
      character: {
        id: Number(ch.lastInsertRowid),
        account_id: accountId,
        name,
        x: spawn.x,
        y: spawn.y,
        hp: 10,
      },
    };
  }

  login(username: string, password: string): AuthResult {
    const acc = this.db
      .prepare('SELECT id, pass_hash, pass_salt FROM accounts WHERE username = ?')
      .get(username.trim()) as { id: number; pass_hash: Uint8Array; pass_salt: Uint8Array } | undefined;
    if (!acc) return { ok: false, reason: 'Unknown username or wrong password' };
    const hash = scryptSync(password, acc.pass_salt, SCRYPT_KEYLEN);
    if (!timingSafeEqual(hash, acc.pass_hash)) {
      return { ok: false, reason: 'Unknown username or wrong password' };
    }
    const character = this.db
      .prepare('SELECT id, account_id, name, x, y, hp FROM characters WHERE account_id = ? ORDER BY id LIMIT 1')
      .get(acc.id) as CharacterRow | undefined;
    if (!character) return { ok: false, reason: 'Account has no character' };
    return { ok: true, accountId: acc.id, character };
  }

  createSession(accountId: number): string {
    const token = randomBytes(24).toString('base64url');
    const now = Date.now();
    this.db
      .prepare('INSERT INTO sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, accountId, now, now + SESSION_TTL_MS);
    // Opportunistic cleanup of expired sessions.
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    return token;
  }

  resumeSession(token: string): AuthResult {
    const row = this.db
      .prepare('SELECT account_id FROM sessions WHERE token = ? AND expires_at > ?')
      .get(token, Date.now()) as { account_id: number } | undefined;
    if (!row) return { ok: false, reason: 'Session expired' };
    const character = this.db
      .prepare('SELECT id, account_id, name, x, y, hp FROM characters WHERE account_id = ? ORDER BY id LIMIT 1')
      .get(row.account_id) as CharacterRow | undefined;
    if (!character) return { ok: false, reason: 'Account has no character' };
    return { ok: true, accountId: row.account_id, character };
  }

  saveCharacter(id: number, x: number, y: number, hp: number): void {
    this.db
      .prepare('UPDATE characters SET x = ?, y = ?, hp = ?, last_seen = ? WHERE id = ?')
      .run(x, y, hp, Date.now(), id);
  }

  loadSkills(characterId: number): Record<string, number> {
    const rows = this.db
      .prepare('SELECT skill, xp FROM character_skills WHERE character_id = ?')
      .all(characterId) as Array<{ skill: string; xp: number }>;
    const out: Record<string, number> = {};
    for (const row of rows) out[row.skill] = row.xp;
    return out;
  }

  saveSkills(characterId: number, xp: Record<string, number>): void {
    const stmt = this.db.prepare(
      'INSERT INTO character_skills (character_id, skill, xp) VALUES (?, ?, ?) ' +
        'ON CONFLICT(character_id, skill) DO UPDATE SET xp = excluded.xp',
    );
    for (const [skill, value] of Object.entries(xp)) stmt.run(characterId, skill, value);
  }

  /**
   * Recipe knowledge — row-presence is the unlock. Written the moment
   * a scroll is studied (knowledge must never be lost to a crash);
   * core recipes never appear here.
   */
  loadRecipes(characterId: number): string[] {
    const rows = this.db
      .prepare('SELECT recipe FROM character_recipes WHERE character_id = ?')
      .all(characterId) as Array<{ recipe: string }>;
    return rows.map((r) => r.recipe);
  }

  learnRecipe(characterId: number, recipe: string): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO character_recipes (character_id, recipe, learned_at) VALUES (?, ?, ?)',
      )
      .run(characterId, recipe, Date.now());
  }

  /**
   * The flag ledger: dialogue completions, story choices, and (soon)
   * quest/faction state. Written flag-at-a-time the moment a flag is
   * set — a story beat must never be lost to a crash before the next
   * periodic save.
   */
  loadFlags(characterId: number): Map<string, number> {
    const rows = this.db
      .prepare('SELECT flag, value FROM character_flags WHERE character_id = ?')
      .all(characterId) as Array<{ flag: string; value: number }>;
    return new Map(rows.map((r) => [r.flag, r.value]));
  }

  setFlag(characterId: number, flag: string, value: number): void {
    this.db
      .prepare(
        'INSERT INTO character_flags (character_id, flag, value, set_at) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(character_id, flag) DO UPDATE SET value = excluded.value, set_at = excluded.set_at',
      )
      .run(characterId, flag, value, Date.now());
  }

  clearFlag(characterId: number, flag: string): void {
    this.db
      .prepare('DELETE FROM character_flags WHERE character_id = ? AND flag = ?')
      .run(characterId, flag);
  }

  loadInventory(
    characterId: number,
    size: number,
  ): Array<{ item: string; qty: number; roll?: ItemRoll } | null> {
    const rows = this.db
      .prepare('SELECT slot, item_id, qty, rar, seed, pwr, coat_id, coat_until, ench_id FROM inventory_slots WHERE character_id = ?')
      .all(characterId) as Array<{
      slot: number;
      item_id: string;
      qty: number;
      rar: string | null;
      seed: number | null;
      pwr: number | null;
      coat_id: string | null;
      coat_until: number | null;
      ench_id: string | null;
    }>;
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

  loadBuiltTiles(): Array<{ tx: number; ty: number; tile: number; owner: number; prevTile: number }> {
    return (
      this.db
        .prepare(
          'SELECT tx, ty, tile, owner_character_id AS owner, prev_tile AS prevTile FROM built_tiles',
        )
        .all() as Array<{ tx: number; ty: number; tile: number; owner: number; prevTile: number }>
    );
  }

  saveBuiltTile(tx: number, ty: number, tile: number, owner: number, prevTile: number): void {
    // On rebuild-over-a-build, prev_tile keeps the ORIGINAL ground the
    // conflict row captured — demolishing a replaced piece should still
    // return the natural terrain, not the intermediate construction.
    this.db
      .prepare(
        'INSERT INTO built_tiles (tx, ty, tile, owner_character_id, created_at, prev_tile) VALUES (?, ?, ?, ?, ?, ?) ' +
          'ON CONFLICT(tx, ty) DO UPDATE SET tile = excluded.tile, owner_character_id = excluded.owner_character_id',
      )
      .run(tx, ty, tile, owner, Date.now(), prevTile);
  }

  deleteBuiltTile(tx: number, ty: number): void {
    this.db.prepare('DELETE FROM built_tiles WHERE tx = ? AND ty = ?').run(tx, ty);
  }

  loadCrops(): Array<{
    tx: number;
    ty: number;
    crop: string;
    plantedAt: number;
    boostMs: number;
    watered: number;
    owner: number;
  }> {
    return this.db
      .prepare(
        'SELECT tx, ty, crop, planted_at AS plantedAt, boost_ms AS boostMs, watered, ' +
          'owner_character_id AS owner FROM crops',
      )
      .all() as ReturnType<AccountStore['loadCrops']>;
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
    this.db
      .prepare(
        'INSERT INTO crops (tx, ty, crop, planted_at, boost_ms, watered, owner_character_id) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?) ' +
          'ON CONFLICT(tx, ty) DO UPDATE SET crop = excluded.crop, ' +
          'planted_at = excluded.planted_at, boost_ms = excluded.boost_ms, ' +
          'watered = excluded.watered, owner_character_id = excluded.owner_character_id',
      )
      .run(tx, ty, crop, plantedAt, boostMs, watered, owner);
  }

  deleteCrop(tx: number, ty: number): void {
    this.db.prepare('DELETE FROM crops WHERE tx = ? AND ty = ?').run(tx, ty);
  }

  loadBank(characterId: number): Record<string, number> {
    const rows = this.db
      .prepare('SELECT item_id, qty FROM bank_items WHERE character_id = ?')
      .all(characterId) as Array<{ item_id: string; qty: number }>;
    const out: Record<string, number> = {};
    for (const row of rows) out[row.item_id] = row.qty;
    return out;
  }

  saveBank(characterId: number, items: Record<string, number>): void {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM bank_items WHERE character_id = ?').run(characterId);
      const stmt = this.db.prepare(
        'INSERT INTO bank_items (character_id, item_id, qty) VALUES (?, ?, ?)',
      );
      for (const [item, qty] of Object.entries(items)) {
        if (qty > 0) stmt.run(characterId, item, qty);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  loadEquipment(characterId: number): Record<string, { id: string; roll?: ItemRoll }> {
    const rows = this.db
      .prepare('SELECT slot, item_id, rar, seed, pwr, coat_id, coat_until, ench_id FROM equipment WHERE character_id = ?')
      .all(characterId) as Array<{
      slot: string;
      item_id: string;
      rar: string | null;
      seed: number | null;
      pwr: number | null;
      coat_id: string | null;
      coat_until: number | null;
      ench_id: string | null;
    }>;
    const out: Record<string, { id: string; roll?: ItemRoll }> = {};
    for (const row of rows) {
      out[row.slot] = { id: row.item_id, roll: rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id) };
    }
    return out;
  }

  saveEquipment(
    characterId: number,
    equipment: Record<string, { id: string; roll?: ItemRoll } | undefined>,
  ): void {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM equipment WHERE character_id = ?').run(characterId);
      const stmt = this.db.prepare(
        'INSERT INTO equipment (character_id, slot, item_id, rar, seed, pwr, coat_id, coat_until, ench_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      );
      for (const [slot, worn] of Object.entries(equipment)) {
        if (worn) {
          stmt.run(
            characterId, slot, worn.id,
            worn.roll?.rar ?? null, worn.roll?.seed ?? null, worn.roll?.pwr ?? null,
            worn.roll?.coat?.id ?? null, worn.roll?.coat?.until ?? null,
            worn.roll?.ench ?? null,
          );
        }
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Bank gear instances are ROW-ops, never delete-all+reinsert: the
   * client addresses withdrawals by row id, so ids must stay stable
   * across every other operation.
   */
  loadBankGear(characterId: number): Array<{ id: number; item: string; roll: ItemRoll }> {
    const rows = this.db
      .prepare('SELECT id, item_id, rar, seed, pwr, coat_id, coat_until, ench_id FROM bank_gear WHERE character_id = ? ORDER BY id')
      .all(characterId) as Array<{
      id: number;
      item_id: string;
      rar: string;
      seed: number;
      pwr: number | null;
      coat_id: string | null;
      coat_until: number | null;
      ench_id: string | null;
    }>;
    const out: Array<{ id: number; item: string; roll: ItemRoll }> = [];
    for (const row of rows) {
      const roll = rowRoll(row.rar, row.seed, row.pwr, row.coat_id, row.coat_until, row.ench_id);
      if (roll) out.push({ id: row.id, item: row.item_id, roll });
    }
    return out;
  }

  insertBankGear(characterId: number, item: string, roll: ItemRoll): number {
    const res = this.db
      .prepare('INSERT INTO bank_gear (character_id, item_id, rar, seed, pwr, coat_id, coat_until, ench_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(characterId, item, roll.rar, roll.seed, roll.pwr ?? null, roll.coat?.id ?? null, roll.coat?.until ?? null, roll.ench ?? null);
    return Number(res.lastInsertRowid);
  }

  deleteBankGear(id: number, characterId: number): boolean {
    const res = this.db
      .prepare('DELETE FROM bank_gear WHERE id = ? AND character_id = ?')
      .run(id, characterId);
    return res.changes > 0;
  }

  loadLook(characterId: number): Look | null {
    const row = this.db
      .prepare('SELECT look FROM characters WHERE id = ?')
      .get(characterId) as { look: string | null } | undefined;
    if (!row?.look) return null;
    try {
      return sanitizeLook(JSON.parse(row.look));
    } catch {
      return null;
    }
  }

  saveLook(characterId: number, look: Look): void {
    this.db
      .prepare('UPDATE characters SET look = ? WHERE id = ?')
      .run(JSON.stringify(look), characterId);
  }

  /** Per-hand grip preferences: [main fist, off fist]. NULL = standard. */
  loadCarryStyles(characterId: number): { main: 'normal' | 'rogue'; off: 'normal' | 'rogue' } {
    const row = this.db
      .prepare('SELECT carry_style, carry_style_off FROM characters WHERE id = ?')
      .get(characterId) as
      | { carry_style: string | null; carry_style_off: string | null }
      | undefined;
    return {
      main: row?.carry_style === 'rogue' ? 'rogue' : 'normal',
      off: row?.carry_style_off === 'rogue' ? 'rogue' : 'normal',
    };
  }

  saveCarryStyle(characterId: number, hand: 'main' | 'off', style: 'normal' | 'rogue'): void {
    const col = hand === 'off' ? 'carry_style_off' : 'carry_style';
    this.db
      .prepare(`UPDATE characters SET ${col} = ? WHERE id = ?`)
      .run(style === 'rogue' ? 'rogue' : null, characterId);
  }

  loadTechniques(characterId: number): Record<string, string> {
    const rows = this.db
      .prepare('SELECT style, ability FROM character_techniques WHERE character_id = ?')
      .all(characterId) as Array<{ style: string; ability: string }>;
    const out: Record<string, string> = {};
    for (const row of rows) out[row.style] = row.ability;
    return out;
  }

  saveTechnique(characterId: number, style: string, ability: string): void {
    this.db
      .prepare(
        `INSERT INTO character_techniques (character_id, style, ability) VALUES (?, ?, ?)
         ON CONFLICT (character_id, style) DO UPDATE SET ability = excluded.ability`,
      )
      .run(characterId, style, ability);
  }

  saveInventory(
    characterId: number,
    slots: Array<{ item: string; qty: number; roll?: ItemRoll } | null>,
  ): void {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM inventory_slots WHERE character_id = ?').run(characterId);
      const stmt = this.db.prepare(
        'INSERT INTO inventory_slots (character_id, slot, item_id, qty, rar, seed, pwr, coat_id, coat_until, ench_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      );
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot) {
          stmt.run(
            characterId, i, slot.item, slot.qty,
            slot.roll?.rar ?? null, slot.roll?.seed ?? null, slot.roll?.pwr ?? null,
            slot.roll?.coat?.id ?? null, slot.roll?.coat?.until ?? null,
            slot.roll?.ench ?? null,
          );
        }
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
