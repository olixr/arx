import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import {
  validateDialogue,
  type DialogueBinding,
  type DialogueChoice,
  type DialogueDef,
  type DialogueNode,
  type ValidateDialogueRefs,
} from '@devcraft/content';

/**
 * Dialogues in the database — THE DATABASE IS THE TRUTH.
 *
 * The relational tables (migration 20) are what the game reads and
 * what internal tooling edits. The shipped JSON (content/dialogues/
 * defs) is the SEED and the import/export envelope, nothing more.
 *
 * Every row carries two hashes:
 *   content_hash   what the row holds right now
 *   authored_hash  the shipped JSON that last seeded it (NULL = the
 *                  row was born in the tooling, no shipped twin)
 *
 * seedDialogues resolves the three honest states per shipped def:
 *   new          → insert (both hashes = the def's hash)
 *   pure seed    → content_hash == authored_hash: the tooling never
 *                  touched it, so newer shipped JSON flows through
 *   tool-owned   → the hashes diverged: the DB wins, permanently.
 *                  We still record the new authored_hash so the def
 *                  isn't re-considered every boot — divergence stays
 *                  divergent either way.
 * Pruning is equally respectful: only PURE SEEDS whose shipped file
 * vanished are removed. Tool-created and tool-edited rows are never
 * deleted by a seed pass.
 *
 * exportDialogue/importDialogue are the managerial envelope: export
 * emits the exact interchange JSON; import is a TOOL WRITE (content
 * hash moves, authored hash doesn't), so an imported edit is owned by
 * the DB like any other tool edit.
 *
 * loadDialogues reassembles rows into the interchange shape and runs
 * them back through validateDialogue — the one validator guards the
 * DB path the same as the authoring path.
 */

export interface DialogueSeedResult {
  added: number;
  updated: number;
  /** Tool-owned rows a changed seed respectfully left alone. */
  kept: number;
  removed: number;
  unchanged: number;
}

/** Stable content hash of a def's interchange JSON. */
function dialogueHash(def: DialogueDef): string {
  return createHash('sha1').update(JSON.stringify(def)).digest('hex');
}

/** JSON-encode a small optional list; empty and absent both store NULL. */
function packList(list: readonly unknown[] | undefined): string | null {
  return list && list.length > 0 ? JSON.stringify(list) : null;
}

function unpackList<T>(raw: string | null): T[] | undefined {
  return raw ? (JSON.parse(raw) as T[]) : undefined;
}

function insertChildren(db: DatabaseSync, def: DialogueDef): void {
  const node = db.prepare(
    `INSERT INTO dialogue_nodes (dialogue_id, node_id, idx, speaker, text, next_node, hooks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const choice = db.prepare(
    `INSERT INTO dialogue_choices
      (dialogue_id, node_id, idx, text, next_node, requires, forbids, set_flags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const binding = db.prepare(
    'INSERT INTO dialogue_bindings (dialogue_id, kind, target, priority) VALUES (?, ?, ?, ?)',
  );
  def.nodes.forEach((n, i) => {
    node.run(def.id, n.id, i, n.speaker ?? null, n.text, n.next ?? null, packList(n.hooks));
    (n.choices ?? []).forEach((c, j) => {
      choice.run(
        def.id,
        n.id,
        j,
        c.text,
        c.next ?? null,
        packList(c.requires),
        packList(c.forbids),
        packList(c.set),
      );
    });
  });
  (def.bindings ?? []).forEach((b) => binding.run(def.id, b.kind, b.target, b.priority ?? 0));
}

function deleteChildren(db: DatabaseSync, id: string): void {
  db.prepare('DELETE FROM dialogue_nodes WHERE dialogue_id = ?').run(id);
  db.prepare('DELETE FROM dialogue_choices WHERE dialogue_id = ?').run(id);
  db.prepare('DELETE FROM dialogue_bindings WHERE dialogue_id = ?').run(id);
}

/** Write one def's rows wholesale (caller decides the hash columns). */
function writeDef(
  db: DatabaseSync,
  def: DialogueDef,
  contentHash: string,
  authoredHash: string | null,
): void {
  db.prepare(
    `INSERT INTO dialogues (id, start_node, once, requires, forbids, content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       start_node = excluded.start_node, once = excluded.once,
       requires = excluded.requires, forbids = excluded.forbids,
       content_hash = excluded.content_hash, authored_hash = excluded.authored_hash,
       updated_at = excluded.updated_at`,
  ).run(
    def.id,
    def.start,
    def.once ? 1 : 0,
    packList(def.requires),
    packList(def.forbids),
    contentHash,
    authoredHash,
    Date.now(),
  );
  deleteChildren(db, def.id);
  insertChildren(db, def);
}

/** Seed shipped defs into the DB without ever clobbering tool work. */
export function seedDialogues(
  db: DatabaseSync,
  defs: readonly DialogueDef[],
): DialogueSeedResult {
  const result: DialogueSeedResult = { added: 0, updated: 0, kept: 0, removed: 0, unchanged: 0 };
  db.exec('BEGIN');
  try {
    const existing = new Map<string, { content: string; authored: string | null }>();
    for (const row of db
      .prepare('SELECT id, content_hash, authored_hash FROM dialogues')
      .all() as Array<{ id: string; content_hash: string; authored_hash: string | null }>) {
      existing.set(row.id, { content: row.content_hash, authored: row.authored_hash });
    }

    for (const def of defs) {
      const hash = dialogueHash(def);
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
        db.prepare('UPDATE dialogues SET authored_hash = ? WHERE id = ?').run(hash, def.id);
        result.kept++;
      }
    }

    // A retired shipped file removes ONLY its untouched seed. Rows the
    // tooling created or edited belong to the DB and stay.
    for (const [id, row] of existing) {
      if (row.authored !== null && row.content === row.authored) {
        db.prepare('DELETE FROM dialogues WHERE id = ?').run(id);
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
 * truth. content_hash moves to the imported content; authored_hash is
 * left as-is (or NULL for a new row) — the row is tool-owned now.
 * Returns validation errors instead of writing anything unsound.
 */
export function importDialogue(
  db: DatabaseSync,
  raw: unknown,
  refs?: ValidateDialogueRefs,
): { ok: true } | { ok: false; errors: string[] } {
  const res = validateDialogue(raw, refs);
  if (!res.ok) return res;
  const def = res.dialogue;
  const prev = db
    .prepare('SELECT authored_hash FROM dialogues WHERE id = ?')
    .get(def.id) as { authored_hash: string | null } | undefined;
  db.exec('BEGIN');
  try {
    writeDef(db, def, dialogueHash(def), prev?.authored_hash ?? null);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { ok: true };
}

export interface DialogueLoadResult {
  dialogues: DialogueDef[];
  /** Rows that failed validation — reported, never silently dropped. */
  errors: string[];
}

/** Load every dialogue from the DB, revalidated through the one validator. */
export function loadDialogues(db: DatabaseSync, refs?: ValidateDialogueRefs): DialogueLoadResult {
  const dialogues: DialogueDef[] = [];
  const errors: string[] = [];

  interface DefRow {
    id: string;
    start_node: string;
    once: number;
    requires: string | null;
    forbids: string | null;
  }
  interface NodeRow {
    node_id: string;
    speaker: string | null;
    text: string;
    next_node: string | null;
    hooks: string | null;
  }
  interface ChoiceRow {
    node_id: string;
    text: string;
    next_node: string | null;
    requires: string | null;
    forbids: string | null;
    set_flags: string | null;
  }
  interface BindingRow {
    kind: string;
    target: string;
    priority: number;
  }

  for (const row of db
    .prepare('SELECT * FROM dialogues ORDER BY id')
    .all() as unknown as DefRow[]) {
    const choicesByNode = new Map<string, DialogueChoice[]>();
    for (const c of db
      .prepare('SELECT * FROM dialogue_choices WHERE dialogue_id = ? ORDER BY node_id, idx')
      .all(row.id) as unknown as ChoiceRow[]) {
      const choice: DialogueChoice = { text: c.text };
      if (c.next_node !== null) choice.next = c.next_node;
      choice.requires = unpackList(c.requires);
      choice.forbids = unpackList(c.forbids);
      choice.set = unpackList(c.set_flags);
      const list = choicesByNode.get(c.node_id) ?? [];
      list.push(choice);
      choicesByNode.set(c.node_id, list);
    }
    const nodes: DialogueNode[] = [];
    for (const n of db
      .prepare('SELECT * FROM dialogue_nodes WHERE dialogue_id = ? ORDER BY idx')
      .all(row.id) as unknown as NodeRow[]) {
      const node: DialogueNode = { id: n.node_id, text: n.text };
      if (n.speaker !== null) node.speaker = n.speaker as DialogueNode['speaker'];
      if (n.next_node !== null) node.next = n.next_node;
      node.choices = choicesByNode.get(n.node_id);
      node.hooks = unpackList(n.hooks);
      nodes.push(node);
    }
    const bindings: DialogueBinding[] = [];
    for (const b of db
      .prepare('SELECT * FROM dialogue_bindings WHERE dialogue_id = ? ORDER BY kind, target')
      .all(row.id) as unknown as BindingRow[]) {
      bindings.push({
        kind: b.kind as DialogueBinding['kind'],
        target: b.target,
        priority: b.priority !== 0 ? b.priority : undefined,
      });
    }

    // Reassemble the interchange shape and re-validate: the DB is the
    // truth, but never a bypass around the rules.
    const res = validateDialogue(
      {
        id: row.id,
        start: row.start_node,
        once: row.once === 1 ? true : undefined,
        requires: unpackList(row.requires),
        forbids: unpackList(row.forbids),
        nodes,
        bindings: bindings.length > 0 ? bindings : undefined,
      },
      refs,
    );
    if (res.ok) dialogues.push(res.dialogue);
    else errors.push(...res.errors);
  }

  return { dialogues, errors };
}

/** Export one dialogue in the exact interchange shape (or null). */
export function exportDialogue(db: DatabaseSync, id: string): DialogueDef | null {
  const all = loadDialogues(db);
  return all.dialogues.find((d) => d.id === id) ?? null;
}

/**
 * The two-hash truth per row, for the studio's badges: `edited` means
 * the tooling owns this row (born there, or diverged from its seed).
 */
export function editedDialogueIds(db: DatabaseSync): Set<string> {
  const edited = new Set<string>();
  for (const row of db
    .prepare('SELECT id, content_hash, authored_hash FROM dialogues')
    .all() as Array<{ id: string; content_hash: string; authored_hash: string | null }>) {
    if (row.authored_hash === null || row.content_hash !== row.authored_hash) edited.add(row.id);
  }
  return edited;
}

/**
 * Undo the tooling's claim on one dialogue: with a shipped twin the
 * row becomes a pure seed of it again ('reverted'); a tool-born row
 * simply leaves ('deleted').
 */
export function revertDialogue(
  db: DatabaseSync,
  id: string,
  authored: DialogueDef | null,
): 'reverted' | 'deleted' {
  db.exec('BEGIN');
  try {
    if (authored) {
      const hash = dialogueHash(authored);
      writeDef(db, authored, hash, hash);
    } else {
      deleteChildren(db, id);
      db.prepare('DELETE FROM dialogues WHERE id = ?').run(id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return authored ? 'reverted' : 'deleted';
}
