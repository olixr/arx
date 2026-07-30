import { createHash } from 'node:crypto';
import type { Db, Queryable } from './db.js';
import {
  validateVoiceBank,
  validateVoiceClip,
  type VoiceBankDef,
  type VoiceBankEntry,
  type VoiceClipDef,
  type VoiceOwnerKind,
  type VoiceSlot,
} from '@arx/content';

/**
 * THE CLIP LEDGER's DB half (docs/voiceover-plan.md Phase 2) — clip
 * metadata rows under the dialogues two-hash truth law, bank rows as
 * plain relational children. Binaries never touch the DB: a clip row
 * names its file by sha1 (THE HASH IS THE FILE) and the store on disk
 * is content-addressed, deduped, and immutable.
 *
 * Most clips will be Studio-born (authored_hash NULL) — the upload
 * bench is the front door. The seed path still runs at boot so a
 * future shipped clip pack rides the same law as every other def.
 */

export interface VoiceSeedResult {
  added: number;
  updated: number;
  kept: number;
  removed: number;
  unchanged: number;
}

export interface LoadedVoiceClip {
  def: VoiceClipDef;
  edited: boolean;
}

/** Stable content hash of a clip def's canonical field order. */
function clipHash(def: VoiceClipDef): string {
  const canon = {
    id: def.id,
    fileHash: def.fileHash,
    ext: def.ext,
    durMs: def.durMs,
    bytes: def.bytes,
    transcript: def.transcript,
    actor: def.actor,
    tags: def.tags,
  };
  return createHash('sha1').update(JSON.stringify(canon)).digest('hex');
}

const UPSERT_CLIP = `INSERT INTO voice_clips
    (id, file_hash, ext, dur_ms, bytes, transcript, actor, tags, content_hash, authored_hash, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     file_hash = excluded.file_hash, ext = excluded.ext, dur_ms = excluded.dur_ms,
     bytes = excluded.bytes, transcript = excluded.transcript, actor = excluded.actor,
     tags = excluded.tags, content_hash = excluded.content_hash,
     authored_hash = excluded.authored_hash, updated_at = excluded.updated_at`;

async function writeClip(
  tx: Queryable,
  def: VoiceClipDef,
  contentHash: string,
  authoredHash: string | null,
): Promise<void> {
  await tx.run(UPSERT_CLIP, [
    def.id,
    def.fileHash,
    def.ext,
    def.durMs,
    def.bytes,
    def.transcript ?? null,
    def.actor ?? null,
    def.tags && def.tags.length > 0 ? JSON.stringify(def.tags) : null,
    contentHash,
    authoredHash,
    Date.now(),
  ]);
}

/** Seed shipped clip defs without ever clobbering Studio work. */
export async function seedVoiceClips(
  db: Db,
  defs: readonly VoiceClipDef[],
): Promise<VoiceSeedResult> {
  const result: VoiceSeedResult = { added: 0, updated: 0, kept: 0, removed: 0, unchanged: 0 };
  await db.transaction(async (tx) => {
    const existing = new Map<string, { content: string; authored: string | null }>();
    for (const row of await tx.query<{
      id: string;
      content_hash: string;
      authored_hash: string | null;
    }>('SELECT id, content_hash, authored_hash FROM voice_clips')) {
      existing.set(row.id, { content: row.content_hash, authored: row.authored_hash });
    }
    for (const def of defs) {
      const hash = clipHash(def);
      const row = existing.get(def.id);
      existing.delete(def.id);
      if (!row) {
        await writeClip(tx, def, hash, hash);
        result.added++;
      } else if (row.authored === hash) {
        result.unchanged++;
      } else if (row.content === row.authored) {
        await writeClip(tx, def, hash, hash);
        result.updated++;
      } else {
        await tx.run('UPDATE voice_clips SET authored_hash = ? WHERE id = ?', [hash, def.id]);
        result.kept++;
      }
    }
    // A retired shipped clip removes only its untouched seed — and
    // only when nothing in the world still points at it.
    for (const [id, row] of existing) {
      if (row.authored !== null && row.content === row.authored) {
        const refs = await clipRefs(tx, id);
        if (refs.total === 0) {
          await tx.run('DELETE FROM voice_clips WHERE id = ?', [id]);
          result.removed++;
        }
      }
    }
  });
  return result;
}

interface ClipRow {
  id: string;
  file_hash: string;
  ext: string;
  dur_ms: number;
  bytes: number;
  transcript: string | null;
  actor: string | null;
  tags: string | null;
  content_hash: string;
  authored_hash: string | null;
}

function rowToClip(r: ClipRow): VoiceClipDef {
  const def: VoiceClipDef = {
    id: r.id,
    fileHash: r.file_hash,
    ext: r.ext as VoiceClipDef['ext'],
    durMs: r.dur_ms,
    bytes: r.bytes,
  };
  if (r.transcript !== null) def.transcript = r.transcript;
  if (r.actor !== null) def.actor = r.actor;
  if (r.tags !== null) def.tags = JSON.parse(r.tags) as string[];
  return def;
}

/** Load every clip, re-validated — a bad row is reported, not served. */
export async function loadVoiceClips(
  db: Db,
): Promise<{ clips: LoadedVoiceClip[]; errors: string[] }> {
  const rows = await db.query<ClipRow>('SELECT * FROM voice_clips ORDER BY id');
  const clips: LoadedVoiceClip[] = [];
  const errors: string[] = [];
  for (const r of rows) {
    const res = validateVoiceClip(rowToClip(r));
    if (!res.ok) {
      errors.push(`clip '${r.id}': ${res.errors[0]}`);
      continue;
    }
    clips.push({
      def: res.def,
      edited: r.authored_hash === null || r.content_hash !== r.authored_hash,
    });
  }
  return { clips, errors };
}

/** A TOOL WRITE (Studio upload/edit): content moves, authored stays. */
export async function importVoiceClip(db: Db, def: VoiceClipDef): Promise<void> {
  const hash = clipHash(def);
  await db.run(
    `INSERT INTO voice_clips
       (id, file_hash, ext, dur_ms, bytes, transcript, actor, tags, content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
     ON CONFLICT(id) DO UPDATE SET
       file_hash = excluded.file_hash, ext = excluded.ext, dur_ms = excluded.dur_ms,
       bytes = excluded.bytes, transcript = excluded.transcript, actor = excluded.actor,
       tags = excluded.tags, content_hash = excluded.content_hash,
       updated_at = excluded.updated_at`,
    [
      def.id,
      def.fileHash,
      def.ext,
      def.durMs,
      def.bytes,
      def.transcript ?? null,
      def.actor ?? null,
      def.tags && def.tags.length > 0 ? JSON.stringify(def.tags) : null,
      hash,
      Date.now(),
    ],
  );
}

export interface ClipRefs {
  /** Bank rows naming the clip, as 'kind:owner:slot'. */
  banks: string[];
  /** Dialogue nodes naming it as their line, as 'dialogueId#nodeId'. */
  nodes: string[];
  total: number;
}

/** Who points at a clip — the DELETE guard reads this before acting. */
export async function clipRefs(q: Queryable, clipId: string): Promise<ClipRefs> {
  const bankRows = await q.query<{ owner_kind: string; owner_id: string; slot: string }>(
    'SELECT DISTINCT owner_kind, owner_id, slot FROM voice_banks WHERE clip_id = ?',
    [clipId],
  );
  const nodeRows = await q.query<{ dialogue_id: string; node_id: string }>(
    'SELECT dialogue_id, node_id FROM dialogue_nodes WHERE voice = ?',
    [clipId],
  );
  const banks = bankRows.map((r) => `${r.owner_kind}:${r.owner_id}:${r.slot}`);
  const nodes = nodeRows.map((r) => `${r.dialogue_id}#${r.node_id}`);
  return { banks, nodes, total: banks.length + nodes.length };
}

/**
 * Delete a clip row. Refuses while anything references it (the caller
 * surfaces the referents). Returns the dead row's file hash and
 * whether any OTHER clip still shares that binary — the caller only
 * unlinks the file when it reports orphaned.
 */
export async function deleteVoiceClip(
  db: Db,
  clipId: string,
): Promise<
  | { ok: true; fileHash: string; ext: string; fileOrphaned: boolean }
  | { ok: false; refs: ClipRefs }
  | { ok: false; missing: true }
> {
  const rows = await db.query<{ file_hash: string; ext: string }>(
    'SELECT file_hash, ext FROM voice_clips WHERE id = ?',
    [clipId],
  );
  const row = rows[0];
  if (!row) return { ok: false, missing: true };
  const refs = await clipRefs(db, clipId);
  if (refs.total > 0) return { ok: false, refs };
  await db.run('DELETE FROM voice_clips WHERE id = ?', [clipId]);
  // The on-disk name is <hash>.<ext> — orphanhood is per name, not
  // per hash, so a same-bytes upload under another ext keeps its file.
  const sharers = await db.query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM voice_clips WHERE file_hash = ? AND ext = ?',
    [row.file_hash, row.ext],
  );
  return {
    ok: true,
    fileHash: row.file_hash,
    ext: row.ext,
    fileOrphaned: (sharers[0]?.n ?? 0) === 0,
  };
}

// ---------------------------------------------------------- banks

interface BankRow {
  owner_kind: string;
  owner_id: string;
  slot: string;
  idx: number;
  clip_id: string;
  weight: number;
}

/** Load every bank, grouped per owner in slot/idx order. */
export async function loadVoiceBanks(db: Db): Promise<VoiceBankDef[]> {
  const rows = await db.query<BankRow>(
    'SELECT * FROM voice_banks ORDER BY owner_kind, owner_id, slot, idx',
  );
  const byOwner = new Map<string, VoiceBankDef>();
  for (const r of rows) {
    const key = `${r.owner_kind}:${r.owner_id}`;
    let bank = byOwner.get(key);
    if (!bank) {
      bank = { owner: { kind: r.owner_kind as VoiceOwnerKind, id: r.owner_id }, slots: {} };
      byOwner.set(key, bank);
    }
    const entry: VoiceBankEntry = { clip: r.clip_id };
    if (r.weight !== 1) entry.weight = r.weight;
    (bank.slots[r.slot as VoiceSlot] ??= []).push(entry);
  }
  return [...byOwner.values()];
}

/**
 * Replace one owner's whole bank (the Studio edits a bank as a card).
 * The def must already be validated against the live clip set; this
 * re-checks structure as a last line, then swaps rows in one breath.
 */
export async function saveVoiceBank(
  db: Db,
  def: VoiceBankDef,
  clipIds: ReadonlySet<string>,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const res = validateVoiceBank(def, { clipIds });
  if (!res.ok) return { ok: false, errors: res.errors };
  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM voice_banks WHERE owner_kind = ? AND owner_id = ?', [
      res.def.owner.kind,
      res.def.owner.id,
    ]);
    const slotPairs = Object.entries(res.def.slots) as [string, VoiceBankEntry[]][];
    for (const [slot, entries] of slotPairs) {
      for (const [i, e] of entries.entries()) {
        await tx.run(
          `INSERT INTO voice_banks (owner_kind, owner_id, slot, idx, clip_id, weight)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [res.def.owner.kind, res.def.owner.id, slot, i, e.clip, e.weight ?? 1],
        );
      }
    }
  });
  return { ok: true };
}

export async function deleteVoiceBank(
  db: Db,
  ownerKind: string,
  ownerId: string,
): Promise<boolean> {
  const rows = await db.query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM voice_banks WHERE owner_kind = ? AND owner_id = ?',
    [ownerKind, ownerId],
  );
  await db.run('DELETE FROM voice_banks WHERE owner_kind = ? AND owner_id = ?', [
    ownerKind,
    ownerId,
  ]);
  return (rows[0]?.n ?? 0) > 0;
}
