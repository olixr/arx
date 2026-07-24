import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

/**
 * DB-first content docs — bestiary defs and loot tables stored whole
 * as JSON under the dialogues two-hash truth law:
 *
 *   content_hash  what the row holds right now
 *   authored_hash the shipped code def that last seeded it
 *                 (NULL = the tool created it, no code twin)
 *
 * Seeding at boot: a new def inserts; an unchanged def is a no-op; a
 * changed def flows through ONLY while the row is a pure seed
 * (content == authored); a tool-touched row keeps its content forever
 * and just records the new authored hash so it isn't re-weighed every
 * boot. Tool writes move content_hash and never authored_hash — that
 * divergence IS the "edited" flag the CMS shows.
 */

export interface SeedStats {
  added: number;
  updated: number;
  kept: number;
  removed: number;
  unchanged: number;
}

export interface LoadedDoc {
  id: string;
  doc: unknown;
  /** True when the row diverged from its authored twin (or has none). */
  edited: boolean;
}

function docHash(doc: unknown): string {
  return createHash('sha1').update(JSON.stringify(doc)).digest('hex');
}

export function seedContentDocs(
  db: DatabaseSync,
  kind: string,
  docs: ReadonlyArray<{ id: string; doc: unknown }>,
): SeedStats {
  const stats: SeedStats = { added: 0, updated: 0, kept: 0, removed: 0, unchanged: 0 };
  const rows = db
    .prepare('SELECT id, content_hash, authored_hash FROM content_docs WHERE kind = ?')
    .all(kind) as Array<{ id: string; content_hash: string; authored_hash: string | null }>;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const write = db.prepare(
    `INSERT INTO content_docs (kind, id, doc, content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (kind, id) DO UPDATE
       SET doc = excluded.doc, content_hash = excluded.content_hash,
           authored_hash = excluded.authored_hash, updated_at = excluded.updated_at`,
  );
  const touchAuthored = db.prepare(
    'UPDATE content_docs SET authored_hash = ? WHERE kind = ? AND id = ?',
  );
  const seen = new Set<string>();
  for (const { id, doc } of docs) {
    seen.add(id);
    const hash = docHash(doc);
    const row = byId.get(id);
    if (!row) {
      write.run(kind, id, JSON.stringify(doc), hash, hash, Date.now());
      stats.added++;
    } else if (row.authored_hash === hash) {
      stats.unchanged++;
    } else if (row.content_hash === row.authored_hash) {
      // Pure seed — the newer authored def flows through.
      write.run(kind, id, JSON.stringify(doc), hash, hash, Date.now());
      stats.updated++;
    } else {
      // Tool-owned — the DB wins; remember the new authored twin.
      touchAuthored.run(hash, kind, id);
      stats.kept++;
    }
  }
  // A vanished authored def deletes only its untouched pure seed.
  const del = db.prepare('DELETE FROM content_docs WHERE kind = ? AND id = ?');
  for (const row of rows) {
    if (
      !seen.has(row.id) &&
      row.authored_hash !== null &&
      row.content_hash === row.authored_hash
    ) {
      del.run(kind, row.id);
      stats.removed++;
    }
  }
  return stats;
}

export function loadContentDocs(db: DatabaseSync, kind: string): LoadedDoc[] {
  const rows = db
    .prepare('SELECT id, doc, content_hash, authored_hash FROM content_docs WHERE kind = ?')
    .all(kind) as Array<{
    id: string;
    doc: string;
    content_hash: string;
    authored_hash: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    doc: JSON.parse(r.doc) as unknown,
    edited: r.authored_hash === null || r.content_hash !== r.authored_hash,
  }));
}

/** Tool write: content moves, authored stays — the row becomes owned. */
export function importContentDoc(db: DatabaseSync, kind: string, id: string, doc: unknown): void {
  const hash = docHash(doc);
  db.prepare(
    `INSERT INTO content_docs (kind, id, doc, content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?)
     ON CONFLICT (kind, id) DO UPDATE
       SET doc = excluded.doc, content_hash = excluded.content_hash,
           updated_at = excluded.updated_at`,
  ).run(kind, id, JSON.stringify(doc), hash, Date.now());
}

/**
 * Revert a doc: with an authored twin, the row becomes a pure seed of
 * it again; without one (tool-born), the row is deleted outright.
 */
export function revertContentDoc(
  db: DatabaseSync,
  kind: string,
  id: string,
  authoredDoc: unknown | null,
): 'reverted' | 'deleted' {
  if (authoredDoc !== null) {
    const hash = docHash(authoredDoc);
    db.prepare(
      `INSERT INTO content_docs (kind, id, doc, content_hash, authored_hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (kind, id) DO UPDATE
         SET doc = excluded.doc, content_hash = excluded.content_hash,
             authored_hash = excluded.authored_hash, updated_at = excluded.updated_at`,
    ).run(kind, id, JSON.stringify(authoredDoc), hash, hash, Date.now());
    return 'reverted';
  }
  db.prepare('DELETE FROM content_docs WHERE kind = ? AND id = ?').run(kind, id);
  return 'deleted';
}
