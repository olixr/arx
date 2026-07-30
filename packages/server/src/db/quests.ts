import { createHash } from 'node:crypto';
import type { Db, Queryable } from './db.js';
import {
  validateQuest,
  type QuestDef,
  type QuestStage,
  type ValidateQuestRefs,
} from '@arx/content';

/**
 * Quests in the database — THE DATABASE IS THE TRUTH.
 *
 * The relational tables (migration v10) are what the game reads and
 * what internal tooling edits. The shipped JSON (content/quests/defs)
 * is the SEED and the import/export envelope, nothing more. The
 * two-hash law is dialogues.ts's, verbatim:
 *
 *   content_hash   what the row holds right now
 *   authored_hash  the shipped JSON that last seeded it (NULL = the
 *                  row was born in the tooling, no shipped twin)
 *
 * seedQuests: new → insert; pure seed (content == authored) → newer
 * shipped JSON flows through; tool-owned (diverged) → the DB wins
 * permanently, we only note the new authored hash. Pruning removes
 * ONLY pure seeds whose shipped file vanished.
 *
 * loadQuests reassembles rows into the interchange shape and runs
 * them back through validateQuest — the one validator guards the DB
 * path the same as the authoring path.
 */

export interface QuestSeedResult {
  added: number;
  updated: number;
  /** Tool-owned rows a changed seed respectfully left alone. */
  kept: number;
  removed: number;
  unchanged: number;
}

/** Stable content hash of a def's interchange JSON. */
function questHash(def: QuestDef): string {
  return createHash('sha1').update(JSON.stringify(def)).digest('hex');
}

/** JSON-encode a small optional value; absent stores NULL. */
function pack(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v) && v.length === 0) return null;
  return JSON.stringify(v);
}

function unpack<T>(raw: string | null): T | undefined {
  return raw ? (JSON.parse(raw) as T) : undefined;
}

async function insertStages(tx: Queryable, def: QuestDef): Promise<void> {
  const sql = `INSERT INTO quest_stages (quest_id, idx, stage_id, journal, objectives, mark)
     VALUES (?, ?, ?, ?, ?, ?)`;
  for (const [i, s] of def.stages.entries()) {
    await tx.run(sql, [def.id, i, s.id, s.journal, JSON.stringify(s.objectives), pack(s.mark)]);
  }
}

/** Write one def's rows wholesale (caller decides the hash columns). */
async function writeDef(
  tx: Queryable,
  def: QuestDef,
  contentHash: string,
  authoredHash: string | null,
): Promise<void> {
  await tx.run(
    `INSERT INTO quests (id, name, giver, turn_in, requires, repeat_hours, rewards, quest_drops,
        content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, giver = excluded.giver, turn_in = excluded.turn_in,
       requires = excluded.requires, repeat_hours = excluded.repeat_hours,
       rewards = excluded.rewards, quest_drops = excluded.quest_drops,
       content_hash = excluded.content_hash, authored_hash = excluded.authored_hash,
       updated_at = excluded.updated_at`,
    [
      def.id,
      def.name,
      def.giver,
      def.turnIn ?? null,
      pack(def.requires),
      def.repeat?.cooldownHours ?? null,
      JSON.stringify(def.rewards),
      pack(def.questDrops),
      contentHash,
      authoredHash,
      Date.now(),
    ],
  );
  await tx.run('DELETE FROM quest_stages WHERE quest_id = ?', [def.id]);
  await insertStages(tx, def);
}

/** Seed shipped defs into the DB without ever clobbering tool work. */
export async function seedQuests(db: Db, defs: readonly QuestDef[]): Promise<QuestSeedResult> {
  const result: QuestSeedResult = { added: 0, updated: 0, kept: 0, removed: 0, unchanged: 0 };
  await db.transaction(async (tx) => {
    const existing = new Map<string, { content: string; authored: string | null }>();
    for (const row of await tx.query<{
      id: string;
      content_hash: string;
      authored_hash: string | null;
    }>('SELECT id, content_hash, authored_hash FROM quests')) {
      existing.set(row.id, { content: row.content_hash, authored: row.authored_hash });
    }

    for (const def of defs) {
      const hash = questHash(def);
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
        await tx.run('UPDATE quests SET authored_hash = ? WHERE id = ?', [hash, def.id]);
        result.kept++;
      }
    }

    // A retired shipped file removes ONLY its untouched seed. Rows the
    // tooling created or edited belong to the DB and stay.
    for (const [id, row] of existing) {
      if (row.authored !== null && row.content === row.authored) {
        await tx.run('DELETE FROM quests WHERE id = ?', [id]);
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
export async function importQuest(
  db: Db,
  raw: unknown,
  refs?: ValidateQuestRefs,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const res = validateQuest(raw, refs);
  if (!res.ok) return res;
  const def = res.quest;
  const prev = await db.get<{ authored_hash: string | null }>(
    'SELECT authored_hash FROM quests WHERE id = ?',
    [def.id],
  );
  await db.transaction(async (tx) => {
    await writeDef(tx, def, questHash(def), prev?.authored_hash ?? null);
  });
  return { ok: true };
}

export interface QuestLoadResult {
  quests: QuestDef[];
  /** Rows that failed validation — reported, never silently dropped. */
  errors: string[];
}

/** Load every quest from the DB, revalidated through the one validator. */
export async function loadQuests(db: Db, refs?: ValidateQuestRefs): Promise<QuestLoadResult> {
  const quests: QuestDef[] = [];
  const errors: string[] = [];

  interface DefRow {
    id: string;
    name: string;
    giver: string;
    turn_in: string | null;
    requires: string | null;
    repeat_hours: number | null;
    rewards: string;
    quest_drops: string | null;
  }
  interface StageRow {
    stage_id: string;
    journal: string;
    objectives: string;
    mark: string | null;
  }

  for (const row of await db.query<DefRow>('SELECT * FROM quests ORDER BY id')) {
    const stages: QuestStage[] = [];
    for (const s of await db.query<StageRow>(
      'SELECT * FROM quest_stages WHERE quest_id = ? ORDER BY idx',
      [row.id],
    )) {
      stages.push({
        id: s.stage_id,
        journal: s.journal,
        objectives: JSON.parse(s.objectives) as QuestStage['objectives'],
        mark: unpack(s.mark),
      });
    }

    // Reassemble the interchange shape and re-validate: the DB is the
    // truth, but never a bypass around the rules.
    const res = validateQuest(
      {
        id: row.id,
        name: row.name,
        giver: row.giver,
        turnIn: row.turn_in ?? undefined,
        requires: unpack(row.requires),
        repeat: row.repeat_hours !== null ? { cooldownHours: row.repeat_hours } : undefined,
        stages,
        questDrops: unpack(row.quest_drops),
        rewards: JSON.parse(row.rewards) as QuestDef['rewards'],
      },
      refs,
    );
    if (res.ok) quests.push(res.quest);
    else errors.push(...res.errors);
  }

  return { quests, errors };
}

/** Export one quest in the exact interchange shape (or null). */
export async function exportQuest(db: Db, id: string): Promise<QuestDef | null> {
  const all = await loadQuests(db);
  return all.quests.find((q) => q.id === id) ?? null;
}

/**
 * The two-hash truth per row, for the studio's badges: `edited` means
 * the tooling owns this row (born there, or diverged from its seed).
 */
export async function editedQuestIds(db: Db): Promise<Set<string>> {
  const edited = new Set<string>();
  for (const row of await db.query<{
    id: string;
    content_hash: string;
    authored_hash: string | null;
  }>('SELECT id, content_hash, authored_hash FROM quests')) {
    if (row.authored_hash === null || row.content_hash !== row.authored_hash) edited.add(row.id);
  }
  return edited;
}

/**
 * Undo the tooling's claim on one quest: with a shipped twin the row
 * becomes a pure seed of it again ('reverted'); a tool-born row simply
 * leaves ('deleted').
 */
export async function revertQuest(
  db: Db,
  id: string,
  authored: QuestDef | null,
): Promise<'reverted' | 'deleted'> {
  await db.transaction(async (tx) => {
    if (authored) {
      const hash = questHash(authored);
      await writeDef(tx, authored, hash, hash);
    } else {
      await tx.run('DELETE FROM quest_stages WHERE quest_id = ?', [id]);
      await tx.run('DELETE FROM quests WHERE id = ?', [id]);
    }
  });
  return authored ? 'reverted' : 'deleted';
}
