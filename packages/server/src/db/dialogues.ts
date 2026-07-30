import { createHash } from 'node:crypto';
import type { Db, Queryable } from './db.js';
import {
  validateDialogue,
  type DialogueBinding,
  type DialogueChoice,
  type DialogueDef,
  type DialogueNode,
  type ValidateDialogueRefs,
} from '@arx/content';

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

async function insertChildren(tx: Queryable, def: DialogueDef): Promise<void> {
  const nodeSql = `INSERT INTO dialogue_nodes (dialogue_id, node_id, idx, speaker, text, next_node, hooks, voice)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const choiceSql = `INSERT INTO dialogue_choices
      (dialogue_id, node_id, idx, text, next_node, requires, forbids, set_flags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const bindingSql =
    'INSERT INTO dialogue_bindings (dialogue_id, kind, target, priority) VALUES (?, ?, ?, ?)';
  for (const [i, n] of def.nodes.entries()) {
    await tx.run(nodeSql, [
      def.id,
      n.id,
      i,
      n.speaker ?? null,
      n.text,
      n.next ?? null,
      packList(n.hooks),
      n.voice ?? null,
    ]);
    for (const [j, c] of (n.choices ?? []).entries()) {
      await tx.run(choiceSql, [
        def.id,
        n.id,
        j,
        c.text,
        c.next ?? null,
        packList(c.requires),
        packList(c.forbids),
        packList(c.set),
      ]);
    }
  }
  for (const b of def.bindings ?? []) {
    await tx.run(bindingSql, [def.id, b.kind, b.target, b.priority ?? 0]);
  }
}

async function deleteChildren(tx: Queryable, id: string): Promise<void> {
  await tx.run('DELETE FROM dialogue_nodes WHERE dialogue_id = ?', [id]);
  await tx.run('DELETE FROM dialogue_choices WHERE dialogue_id = ?', [id]);
  await tx.run('DELETE FROM dialogue_bindings WHERE dialogue_id = ?', [id]);
}

/** Write one def's rows wholesale (caller decides the hash columns). */
async function writeDef(
  tx: Queryable,
  def: DialogueDef,
  contentHash: string,
  authoredHash: string | null,
): Promise<void> {
  await tx.run(
    `INSERT INTO dialogues (id, start_node, once, requires, forbids, content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       start_node = excluded.start_node, once = excluded.once,
       requires = excluded.requires, forbids = excluded.forbids,
       content_hash = excluded.content_hash, authored_hash = excluded.authored_hash,
       updated_at = excluded.updated_at`,
    [
      def.id,
      def.start,
      def.once ? 1 : 0,
      packList(def.requires),
      packList(def.forbids),
      contentHash,
      authoredHash,
      Date.now(),
    ],
  );
  await deleteChildren(tx, def.id);
  await insertChildren(tx, def);
}

/** Seed shipped defs into the DB without ever clobbering tool work. */
export async function seedDialogues(
  db: Db,
  defs: readonly DialogueDef[],
): Promise<DialogueSeedResult> {
  const result: DialogueSeedResult = { added: 0, updated: 0, kept: 0, removed: 0, unchanged: 0 };
  await db.transaction(async (tx) => {
    const existing = new Map<string, { content: string; authored: string | null }>();
    for (const row of await tx.query<{
      id: string;
      content_hash: string;
      authored_hash: string | null;
    }>('SELECT id, content_hash, authored_hash FROM dialogues')) {
      existing.set(row.id, { content: row.content_hash, authored: row.authored_hash });
    }

    for (const def of defs) {
      const hash = dialogueHash(def);
      const row = existing.get(def.id);
      existing.delete(def.id);
      if (!row) {
        await writeDef(tx, def, hash, hash);
        result.added++;
      } else if (row.authored === hash) {
        result.unchanged++; // this exact JSON already seeded it
      } else if (row.content === row.authored) {
        await writeDef(tx, def, hash, hash); // pure seed: the new JSON flows through
        result.updated++;
      } else {
        // Tool-owned: the DB wins. Note the new authored hash so this
        // def isn't re-weighed every boot; the divergence remains.
        await tx.run('UPDATE dialogues SET authored_hash = ? WHERE id = ?', [hash, def.id]);
        result.kept++;
      }
    }

    // A retired shipped file removes ONLY its untouched seed. Rows the
    // tooling created or edited belong to the DB and stay.
    for (const [id, row] of existing) {
      if (row.authored !== null && row.content === row.authored) {
        await tx.run('DELETE FROM dialogues WHERE id = ?', [id]);
        result.removed++;
      }
    }
  });
  return result;
}

/**
 * A TOOL WRITE: import one interchange def into the DB as the new
 * truth. content_hash moves to the imported content; authored_hash is
 * left as-is (or NULL for a new row) — the row is tool-owned now.
 * Returns validation errors instead of writing anything unsound.
 */
export async function importDialogue(
  db: Db,
  raw: unknown,
  refs?: ValidateDialogueRefs,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const res = validateDialogue(raw, refs);
  if (!res.ok) return res;
  const def = res.dialogue;
  const prev = await db.get<{ authored_hash: string | null }>(
    'SELECT authored_hash FROM dialogues WHERE id = ?',
    [def.id],
  );
  await db.transaction(async (tx) => {
    await writeDef(tx, def, dialogueHash(def), prev?.authored_hash ?? null);
  });
  return { ok: true };
}

export interface DialogueLoadResult {
  dialogues: DialogueDef[];
  /** Rows that failed validation — reported, never silently dropped. */
  errors: string[];
}

/** Load every dialogue from the DB, revalidated through the one validator. */
export async function loadDialogues(
  db: Db,
  refs?: ValidateDialogueRefs,
): Promise<DialogueLoadResult> {
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
    voice: string | null;
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

  for (const row of await db.query<DefRow>('SELECT * FROM dialogues ORDER BY id')) {
    const choicesByNode = new Map<string, DialogueChoice[]>();
    for (const c of await db.query<ChoiceRow>(
      'SELECT * FROM dialogue_choices WHERE dialogue_id = ? ORDER BY node_id, idx',
      [row.id],
    )) {
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
    for (const n of await db.query<NodeRow>(
      'SELECT * FROM dialogue_nodes WHERE dialogue_id = ? ORDER BY idx',
      [row.id],
    )) {
      const node: DialogueNode = { id: n.node_id, text: n.text };
      if (n.speaker !== null) node.speaker = n.speaker as DialogueNode['speaker'];
      if (n.next_node !== null) node.next = n.next_node;
      node.choices = choicesByNode.get(n.node_id);
      node.hooks = unpackList(n.hooks);
      if (n.voice !== null) node.voice = n.voice;
      nodes.push(node);
    }
    const bindings: DialogueBinding[] = [];
    for (const b of await db.query<BindingRow>(
      'SELECT * FROM dialogue_bindings WHERE dialogue_id = ? ORDER BY kind, target',
      [row.id],
    )) {
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
export async function exportDialogue(db: Db, id: string): Promise<DialogueDef | null> {
  const all = await loadDialogues(db);
  return all.dialogues.find((d) => d.id === id) ?? null;
}

/**
 * The two-hash truth per row, for the studio's badges: `edited` means
 * the tooling owns this row (born there, or diverged from its seed).
 */
export async function editedDialogueIds(db: Db): Promise<Set<string>> {
  const edited = new Set<string>();
  for (const row of await db.query<{
    id: string;
    content_hash: string;
    authored_hash: string | null;
  }>('SELECT id, content_hash, authored_hash FROM dialogues')) {
    if (row.authored_hash === null || row.content_hash !== row.authored_hash) edited.add(row.id);
  }
  return edited;
}

/**
 * Undo the tooling's claim on one dialogue: with a shipped twin the
 * row becomes a pure seed of it again ('reverted'); a tool-born row
 * simply leaves ('deleted').
 */
export async function revertDialogue(
  db: Db,
  id: string,
  authored: DialogueDef | null,
): Promise<'reverted' | 'deleted'> {
  await db.transaction(async (tx) => {
    if (authored) {
      const hash = dialogueHash(authored);
      await writeDef(tx, authored, hash, hash);
    } else {
      await deleteChildren(tx, id);
      await tx.run('DELETE FROM dialogues WHERE id = ?', [id]);
    }
  });
  return authored ? 'reverted' : 'deleted';
}
