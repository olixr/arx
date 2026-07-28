import { createHash } from 'node:crypto';
import type { Db, Queryable } from './db.js';
import {
  validateNpcActor,
  type NpcActorCombat,
  type NpcActorDef,
} from '@arx/content';

/**
 * NPC actors, DB-first: the relational tables (the Postgres baseline
 * migration) are what the server reads at boot and what dev tools will
 * edit. Authored JSON in content/actors/defs is the SEED —
 * syncNpcActors reconciles it in on every boot (content-as-code wins),
 * hashing each def so unchanged actors cost one indexed SELECT and no
 * writes.
 *
 * loadNpcActors reassembles rows into the exact JSON interchange shape
 * and runs them back through validateNpcActor — the one validator
 * guards the DB path the same as the authoring path, so a hand-edited
 * row that breaks a cross-reference is rejected at boot with a real
 * error instead of a mystery at spawn time.
 */

export interface NpcActorSyncResult {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  /** Tool-owned rows the seed respected (the dialogues two-hash law). */
  kept: number;
}

/** Stable content hash of a def's interchange JSON. */
function actorHash(actor: NpcActorDef): string {
  return createHash('sha1').update(JSON.stringify(actor)).digest('hex');
}

async function insertChildren(tx: Queryable, actor: NpcActorDef): Promise<void> {
  const eq = 'INSERT INTO npc_actor_equipment (actor_slug, slot, item_id) VALUES (?, ?, ?)';
  for (const [slot, itemId] of Object.entries(actor.equipment ?? {})) {
    await tx.run(eq, [actor.id, slot, itemId]);
  }
  const inv = 'INSERT INTO npc_actor_inventory (actor_slug, idx, item_id, qty) VALUES (?, ?, ?, ?)';
  for (const [i, row] of (actor.inventory ?? []).entries()) {
    await tx.run(inv, [actor.id, i, row.item, row.qty]);
  }
  const line = 'INSERT INTO npc_actor_lines (actor_slug, idx, line) VALUES (?, ?, ?)';
  for (const [i, l] of (actor.lines ?? []).entries()) {
    await tx.run(line, [actor.id, i, l]);
  }
  if (actor.combat) {
    const c = actor.combat;
    await tx.run(
      `INSERT INTO npc_actor_combat
        (actor_slug, level, base_creature, respawn_sec, max_hp, damage, attack_range,
         attack_cooldown_ticks, aggro_range, leash_range, speed, xp_reward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actor.id,
        c.level,
        c.base ?? null,
        c.respawnSec ?? null,
        c.stats?.maxHp ?? null,
        c.stats?.damage ?? null,
        c.stats?.attackRange ?? null,
        c.stats?.attackCooldownTicks ?? null,
        c.stats?.aggroRange ?? null,
        c.stats?.leashRange ?? null,
        c.stats?.speed ?? null,
        c.stats?.xpReward ?? null,
      ],
    );
    const loot = 'INSERT INTO npc_actor_loot (actor_slug, idx, table_id) VALUES (?, ?, ?)';
    for (const [i, t] of (c.loot ?? []).entries()) {
      await tx.run(loot, [actor.id, i, t]);
    }
  }
}

async function deleteChildren(tx: Queryable, slug: string): Promise<void> {
  for (const table of [
    'npc_actor_equipment',
    'npc_actor_inventory',
    'npc_actor_lines',
    'npc_actor_combat',
    'npc_actor_loot',
  ]) {
    await tx.run(`DELETE FROM ${table} WHERE actor_slug = ?`, [slug]);
  }
}

/** Write one actor's rows (parent upsert + children replace). */
async function writeActorRows(
  tx: Queryable,
  actor: NpcActorDef,
  hash: string,
  authoredHash: string | null,
  keepAuthored: boolean,
): Promise<void> {
  await tx.run(
    `INSERT INTO npc_actors
      (slug, name, title, examine, disposition, protection, model_kind, creature_id, look,
       dialogue_id, shop_id, content_hash, authored_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       name = excluded.name, title = excluded.title, examine = excluded.examine,
       disposition = excluded.disposition, protection = excluded.protection,
       model_kind = excluded.model_kind,
       creature_id = excluded.creature_id, look = excluded.look,
       dialogue_id = excluded.dialogue_id, shop_id = excluded.shop_id,
       content_hash = excluded.content_hash,
       authored_hash = ${keepAuthored ? 'npc_actors.authored_hash' : 'excluded.authored_hash'},
       updated_at = excluded.updated_at`,
    [
      actor.id,
      actor.name,
      actor.title ?? null,
      actor.examine ?? null,
      actor.disposition,
      actor.protection ?? null,
      actor.model.kind,
      actor.model.kind === 'creature' ? actor.model.creature : null,
      actor.model.kind === 'humanoid' ? JSON.stringify(actor.model.look) : null,
      actor.dialogue ?? null,
      actor.shop ?? null,
      hash,
      authoredHash,
      Date.now(),
    ],
  );
  await deleteChildren(tx, actor.id);
  await insertChildren(tx, actor);
}

/**
 * Reconcile authored defs into the DB under the dialogues two-hash
 * law: pure seeds flow, tool-owned rows are kept (their authored twin
 * is recorded so they stop being re-weighed), and only untouched
 * seeds are pruned when their authored def retires.
 */
export async function syncNpcActors(
  db: Db,
  actors: readonly NpcActorDef[],
): Promise<NpcActorSyncResult> {
  const result: NpcActorSyncResult = {
    added: 0,
    updated: 0,
    removed: 0,
    unchanged: 0,
    kept: 0,
  };
  await db.transaction(async (tx) => {
    const existing = new Map<string, { content: string; authored: string | null }>();
    for (const row of await tx.query<{
      slug: string;
      content_hash: string;
      authored_hash: string | null;
    }>('SELECT slug, content_hash, authored_hash FROM npc_actors')) {
      existing.set(row.slug, { content: row.content_hash, authored: row.authored_hash });
    }

    for (const actor of actors) {
      const hash = actorHash(actor);
      const prev = existing.get(actor.id);
      existing.delete(actor.id);
      if (!prev) {
        await writeActorRows(tx, actor, hash, hash, false);
        result.added++;
      } else if (prev.authored === hash) {
        result.unchanged++;
      } else if (prev.content === prev.authored) {
        await writeActorRows(tx, actor, hash, hash, false);
        result.updated++;
      } else {
        // Tool-owned: the DB wins; remember the new authored twin.
        await tx.run('UPDATE npc_actors SET authored_hash = ? WHERE slug = ?', [hash, actor.id]);
        result.kept++;
      }
    }

    // A retired authored actor deletes only its untouched pure seed;
    // tool-created or tool-edited rows survive.
    for (const [slug, prev] of existing) {
      if (prev.authored !== null && prev.content === prev.authored) {
        await tx.run('DELETE FROM npc_actors WHERE slug = ?', [slug]);
        result.removed++;
      }
    }
  });
  return result;
}

/**
 * Tool write: content moves, authored stays — the row becomes owned.
 * Returns the validator-normalized def (the index-stability law fills
 * Look defaults) — callers register THAT, never the raw input.
 */
export async function importNpcActor(db: Db, raw: unknown): Promise<NpcActorDef> {
  const result = validateNpcActor(raw);
  if (!result.ok) throw new Error(result.errors.join('; '));
  const actor = result.actor;
  await db.transaction(async (tx) => {
    await writeActorRows(tx, actor, actorHash(actor), null, true);
  });
  return actor;
}

/**
 * Revert an actor: with its authored def, the row becomes a pure seed
 * again; a tool-born slug (no authored twin) is deleted outright.
 */
export async function revertNpcActor(
  db: Db,
  slug: string,
  authored: NpcActorDef | null,
): Promise<'reverted' | 'deleted'> {
  return db.transaction(async (tx) => {
    if (authored) {
      const hash = actorHash(authored);
      await writeActorRows(tx, authored, hash, hash, false);
      return 'reverted';
    }
    await deleteChildren(tx, slug);
    await tx.run('DELETE FROM npc_actors WHERE slug = ?', [slug]);
    return 'deleted';
  });
}

/** Slugs whose rows diverged from their authored twin (CMS badges). */
export async function editedActorSlugs(db: Db): Promise<Set<string>> {
  const rows = await db.query<{ slug: string }>(
    'SELECT slug FROM npc_actors WHERE authored_hash IS NULL OR content_hash != authored_hash',
  );
  return new Set(rows.map((r) => r.slug));
}

export interface NpcActorLoadResult {
  actors: NpcActorDef[];
  /** Rows that failed validation — reported, never silently dropped. */
  errors: string[];
}

/** Load every actor from the DB, revalidated through the one validator. */
export async function loadNpcActors(db: Db): Promise<NpcActorLoadResult> {
  const actors: NpcActorDef[] = [];
  const errors: string[] = [];

  interface ActorRow {
    slug: string;
    name: string;
    title: string | null;
    examine: string | null;
    disposition: string;
    protection: string | null;
    model_kind: string;
    creature_id: string | null;
    look: string | null;
    dialogue_id: string | null;
    shop_id: string | null;
  }
  interface CombatRow {
    level: number;
    base_creature: string | null;
    respawn_sec: number | null;
    max_hp: number | null;
    damage: number | null;
    attack_range: number | null;
    attack_cooldown_ticks: number | null;
    aggro_range: number | null;
    leash_range: number | null;
    speed: number | null;
    xp_reward: number | null;
  }

  for (const row of await db.query<ActorRow>('SELECT * FROM npc_actors ORDER BY slug')) {
    const equipment: Record<string, string> = {};
    for (const eq of await db.query<{ slot: string; item_id: string }>(
      'SELECT slot, item_id FROM npc_actor_equipment WHERE actor_slug = ?',
      [row.slug],
    )) {
      equipment[eq.slot] = eq.item_id;
    }
    const inventory = (
      await db.query<{ item_id: string; qty: number }>(
        'SELECT item_id, qty FROM npc_actor_inventory WHERE actor_slug = ? ORDER BY idx',
        [row.slug],
      )
    ).map((r) => ({ item: r.item_id, qty: r.qty }));
    const lines = (
      await db.query<{ line: string }>(
        'SELECT line FROM npc_actor_lines WHERE actor_slug = ? ORDER BY idx',
        [row.slug],
      )
    ).map((r) => r.line);

    let combat: NpcActorCombat | undefined;
    const c = await db.get<CombatRow>('SELECT * FROM npc_actor_combat WHERE actor_slug = ?', [
      row.slug,
    ]);
    if (c) {
      const loot = (
        await db.query<{ table_id: string }>(
          'SELECT table_id FROM npc_actor_loot WHERE actor_slug = ? ORDER BY idx',
          [row.slug],
        )
      ).map((r) => r.table_id);
      // Only present columns become stat keys — the validator treats
      // an explicit `undefined` value as a bad number, rightly.
      const stats: Record<string, number> = {};
      if (c.max_hp !== null) stats.maxHp = c.max_hp;
      if (c.damage !== null) stats.damage = c.damage;
      if (c.attack_range !== null) stats.attackRange = c.attack_range;
      if (c.attack_cooldown_ticks !== null) stats.attackCooldownTicks = c.attack_cooldown_ticks;
      if (c.aggro_range !== null) stats.aggroRange = c.aggro_range;
      if (c.leash_range !== null) stats.leashRange = c.leash_range;
      if (c.speed !== null) stats.speed = c.speed;
      if (c.xp_reward !== null) stats.xpReward = c.xp_reward;
      const hasStats = Object.keys(stats).length > 0;
      combat = {
        level: c.level,
        base: c.base_creature ?? undefined,
        respawnSec: c.respawn_sec ?? undefined,
        loot: loot.length > 0 ? loot : undefined,
        stats: hasStats ? stats : undefined,
      };
    }

    // Reassemble the interchange shape and re-validate: the DB is a
    // peer of the JSON files, not a trusted bypass around the rules.
    const res = validateNpcActor({
      id: row.slug,
      name: row.name,
      title: row.title ?? undefined,
      examine: row.examine ?? undefined,
      disposition: row.disposition,
      protection: row.protection ?? undefined,
      model:
        row.model_kind === 'creature'
          ? { kind: 'creature', creature: row.creature_id }
          : { kind: 'humanoid', look: row.look ? JSON.parse(row.look) : undefined },
      equipment: Object.keys(equipment).length > 0 ? equipment : undefined,
      inventory: inventory.length > 0 ? inventory : undefined,
      lines: lines.length > 0 ? lines : undefined,
      combat,
      dialogue: row.dialogue_id ?? undefined,
      shop: row.shop_id ?? undefined,
    });
    if (res.ok) actors.push(res.actor);
    else errors.push(...res.errors);
  }

  return { actors, errors };
}
