import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import {
  validateDialogue,
  type DialogueChoice,
  type DialogueDef,
  type DialogueNode,
} from '@devcraft/content';

/**
 * Dialogue trees, DB-first: the relational tables (migration 19) are
 * what the server reads at boot and what dev tools will edit. Authored
 * JSON in content/dialogues/defs is the SEED — syncDialogues
 * reconciles it in on every boot (content-as-code wins), hashing each
 * def so unchanged trees cost one indexed SELECT and no writes.
 *
 * loadDialogues reassembles rows into the exact JSON interchange shape
 * and runs them back through validateDialogue — the one validator
 * guards the DB path the same as the authoring path.
 */

export interface DialogueSyncResult {
  added: number;
  updated: number;
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
}

function deleteChildren(db: DatabaseSync, id: string): void {
  db.prepare('DELETE FROM dialogue_nodes WHERE dialogue_id = ?').run(id);
  db.prepare('DELETE FROM dialogue_choices WHERE dialogue_id = ?').run(id);
}

/** Reconcile authored defs into the DB. Content is the source of truth. */
export function syncDialogues(
  db: DatabaseSync,
  defs: readonly DialogueDef[],
): DialogueSyncResult {
  const result: DialogueSyncResult = { added: 0, updated: 0, removed: 0, unchanged: 0 };
  db.exec('BEGIN');
  try {
    const existing = new Map<string, string>();
    for (const row of db.prepare('SELECT id, content_hash FROM dialogues').all() as Array<{
      id: string;
      content_hash: string;
    }>) {
      existing.set(row.id, row.content_hash);
    }

    const now = Date.now();
    const upsert = db.prepare(
      `INSERT INTO dialogues
        (id, actor_slug, start_node, priority, once, requires, forbids, content_hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         actor_slug = excluded.actor_slug, start_node = excluded.start_node,
         priority = excluded.priority, once = excluded.once,
         requires = excluded.requires, forbids = excluded.forbids,
         content_hash = excluded.content_hash, updated_at = excluded.updated_at`,
    );

    for (const def of defs) {
      const hash = dialogueHash(def);
      const prev = existing.get(def.id);
      existing.delete(def.id);
      if (prev === hash) {
        result.unchanged++;
        continue;
      }
      upsert.run(
        def.id,
        def.actor,
        def.start,
        def.priority ?? 0,
        def.once ? 1 : 0,
        packList(def.requires),
        packList(def.forbids),
        hash,
        now,
      );
      deleteChildren(db, def.id);
      insertChildren(db, def);
      if (prev === undefined) result.added++;
      else result.updated++;
    }

    // Trees gone from content leave the DB too — a retired conversation
    // must not keep speaking from stale rows.
    for (const id of existing.keys()) {
      db.prepare('DELETE FROM dialogues WHERE id = ?').run(id);
      result.removed++;
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return result;
}

export interface DialogueLoadResult {
  dialogues: DialogueDef[];
  /** Rows that failed validation — reported, never silently dropped. */
  errors: string[];
}

/** Load every dialogue from the DB, revalidated through the one validator. */
export function loadDialogues(db: DatabaseSync): DialogueLoadResult {
  const dialogues: DialogueDef[] = [];
  const errors: string[] = [];

  interface DefRow {
    id: string;
    actor_slug: string;
    start_node: string;
    priority: number;
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

    // Reassemble the interchange shape and re-validate: the DB is a
    // peer of the JSON files, not a trusted bypass around the rules.
    const res = validateDialogue({
      id: row.id,
      actor: row.actor_slug,
      start: row.start_node,
      priority: row.priority,
      once: row.once === 1 ? true : undefined,
      requires: unpackList(row.requires),
      forbids: unpackList(row.forbids),
      nodes,
    });
    if (res.ok) dialogues.push(res.dialogue);
    else errors.push(...res.errors);
  }

  return { dialogues, errors };
}
