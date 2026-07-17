import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

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

  loadInventory(characterId: number, size: number): Array<{ item: string; qty: number } | null> {
    const rows = this.db
      .prepare('SELECT slot, item_id, qty FROM inventory_slots WHERE character_id = ?')
      .all(characterId) as Array<{ slot: number; item_id: string; qty: number }>;
    const slots = new Array<{ item: string; qty: number } | null>(size).fill(null);
    for (const row of rows) {
      if (row.slot >= 0 && row.slot < size) slots[row.slot] = { item: row.item_id, qty: row.qty };
    }
    return slots;
  }

  loadBuiltTiles(): Array<{ tx: number; ty: number; tile: number; owner: number }> {
    return (
      this.db
        .prepare('SELECT tx, ty, tile, owner_character_id AS owner FROM built_tiles')
        .all() as Array<{ tx: number; ty: number; tile: number; owner: number }>
    );
  }

  saveBuiltTile(tx: number, ty: number, tile: number, owner: number): void {
    this.db
      .prepare(
        'INSERT INTO built_tiles (tx, ty, tile, owner_character_id, created_at) VALUES (?, ?, ?, ?, ?) ' +
          'ON CONFLICT(tx, ty) DO UPDATE SET tile = excluded.tile, owner_character_id = excluded.owner_character_id',
      )
      .run(tx, ty, tile, owner, Date.now());
  }

  deleteBuiltTile(tx: number, ty: number): void {
    this.db.prepare('DELETE FROM built_tiles WHERE tx = ? AND ty = ?').run(tx, ty);
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

  loadEquipment(characterId: number): Record<string, string> {
    const rows = this.db
      .prepare('SELECT slot, item_id FROM equipment WHERE character_id = ?')
      .all(characterId) as Array<{ slot: string; item_id: string }>;
    const out: Record<string, string> = {};
    for (const row of rows) out[row.slot] = row.item_id;
    return out;
  }

  saveEquipment(characterId: number, equipment: Record<string, string | undefined>): void {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM equipment WHERE character_id = ?').run(characterId);
      const stmt = this.db.prepare(
        'INSERT INTO equipment (character_id, slot, item_id) VALUES (?, ?, ?)',
      );
      for (const [slot, item] of Object.entries(equipment)) {
        if (item) stmt.run(characterId, slot, item);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  saveInventory(characterId: number, slots: Array<{ item: string; qty: number } | null>): void {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM inventory_slots WHERE character_id = ?').run(characterId);
      const stmt = this.db.prepare(
        'INSERT INTO inventory_slots (character_id, slot, item_id, qty) VALUES (?, ?, ?, ?)',
      );
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot) stmt.run(characterId, i, slot.item, slot.qty);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
