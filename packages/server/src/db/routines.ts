import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { validateRoutine, type RoutineDef, type RoutineTask } from '@devcraft/content';

/**
 * Routines in the database — THE DATABASE IS THE TRUTH, exactly the
 * dialogue law (db/dialogues.ts) applied to daily lives.
 *
 * The relational tables (migration 22) are what the game reads and
 * what internal tooling edits. The shipped JSON (content/routines/
 * defs) is the SEED and the import/export envelope, nothing more.
 * Every row carries content_hash (what it holds now) and
 * authored_hash (the shipped JSON that last seeded it); a diverged
 * pair marks the row tool-owned — no re-seed updates it, no prune
 * removes it, ever.
 */

export interface RoutineSeedResult {
  added: number;
  updated: number;
  /** Tool-owned rows a changed seed respectfully left alone. */
  kept: number;
  removed: number;
  unchanged: number;
}

/** Stable content hash of a def's interchange JSON. */
function routineHash(def: RoutineDef): string {
  return createHash('sha1').update(JSON.stringify(def)).digest('hex');
}

/** Write one def's rows wholesale (caller decides the hash columns). */
function writeDef(
  db: DatabaseSync,
  def: RoutineDef,
  contentHash: string,
  authoredHash: string | null,
): void {
  db.prepare(
    `INSERT INTO routines (id, base, content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       base = excluded.base,
       content_hash = excluded.content_hash, authored_hash = excluded.authored_hash,
       updated_at = excluded.updated_at`,
  ).run(def.id, JSON.stringify(def.base), contentHash, authoredHash, Date.now());
  db.prepare('DELETE FROM routine_slots WHERE routine_id = ?').run(def.id);
  const slot = db.prepare(
    'INSERT INTO routine_slots (routine_id, idx, from_hours, to_hours, task) VALUES (?, ?, ?, ?, ?)',
  );
  (def.slots ?? []).forEach((s, i) => slot.run(def.id, i, s.from, s.to, JSON.stringify(s.task)));
}

/** Seed shipped defs into the DB without ever clobbering tool work. */
export function seedRoutines(db: DatabaseSync, defs: readonly RoutineDef[]): RoutineSeedResult {
  const result: RoutineSeedResult = { added: 0, updated: 0, kept: 0, removed: 0, unchanged: 0 };
  db.exec('BEGIN');
  try {
    const existing = new Map<string, { content: string; authored: string | null }>();
    for (const row of db
      .prepare('SELECT id, content_hash, authored_hash FROM routines')
      .all() as Array<{ id: string; content_hash: string; authored_hash: string | null }>) {
      existing.set(row.id, { content: row.content_hash, authored: row.authored_hash });
    }

    for (const def of defs) {
      const hash = routineHash(def);
      const row = existing.get(def.id);
      existing.delete(def.id);
      if (!row) {
        writeDef(db, def, hash, hash);
        result.added++;
      } else if (row.authored === hash) {
        result.unchanged++; // this exact JSON already seeded it
      } else if (row.content === row.authored) {
        writeDef(db, def, hash, hash); // pure seed: the new JSON flows through
        result.updated++;
      } else {
        // Tool-owned: the DB wins. Note the new authored hash so this
        // def isn't re-weighed every boot; the divergence remains.
        db.prepare('UPDATE routines SET authored_hash = ? WHERE id = ?').run(hash, def.id);
        result.kept++;
      }
    }

    // A retired shipped file removes ONLY its untouched seed. Rows the
    // tooling created or edited belong to the DB and stay.
    for (const [id, row] of existing) {
      if (row.authored !== null && row.content === row.authored) {
        db.prepare('DELETE FROM routines WHERE id = ?').run(id);
        result.removed++;
      }
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return result;
}

/**
 * A TOOL WRITE: import one interchange def into the DB as the new
 * truth. content_hash moves; authored_hash stays (or NULL for a new
 * row) — the row is tool-owned now. Returns validation errors instead
 * of writing anything unsound.
 */
export function importRoutine(db: DatabaseSync, raw: unknown): { ok: true } | { ok: false; errors: string[] } {
  const res = validateRoutine(raw);
  if (!res.ok) return res;
  const def = res.routine;
  const prev = db
    .prepare('SELECT authored_hash FROM routines WHERE id = ?')
    .get(def.id) as { authored_hash: string | null } | undefined;
  db.exec('BEGIN');
  try {
    writeDef(db, def, routineHash(def), prev?.authored_hash ?? null);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { ok: true };
}

export interface RoutineLoadResult {
  routines: RoutineDef[];
  /** Rows that failed validation — reported, never silently dropped. */
  errors: string[];
}

/** Load every routine from the DB, revalidated through the one validator. */
export function loadRoutines(db: DatabaseSync): RoutineLoadResult {
  const routines: RoutineDef[] = [];
  const errors: string[] = [];

  for (const row of db
    .prepare('SELECT id, base FROM routines ORDER BY id')
    .all() as Array<{ id: string; base: string }>) {
    const slots: Array<{ from: number; to: number; task: RoutineTask }> = [];
    for (const s of db
      .prepare('SELECT from_hours, to_hours, task FROM routine_slots WHERE routine_id = ? ORDER BY idx')
      .all(row.id) as Array<{ from_hours: number; to_hours: number; task: string }>) {
      slots.push({ from: s.from_hours, to: s.to_hours, task: JSON.parse(s.task) as RoutineTask });
    }

    // Reassemble the interchange shape and re-validate: the DB is the
    // truth, but never a bypass around the rules.
    const res = validateRoutine({
      id: row.id,
      base: JSON.parse(row.base) as RoutineTask,
      slots: slots.length > 0 ? slots : undefined,
    });
    if (res.ok) routines.push(res.routine);
    else errors.push(...res.errors);
  }

  return { routines, errors };
}

/** Export one routine in the exact interchange shape (or null). */
export function exportRoutine(db: DatabaseSync, id: string): RoutineDef | null {
  const all = loadRoutines(db);
  return all.routines.find((r) => r.id === id) ?? null;
}
