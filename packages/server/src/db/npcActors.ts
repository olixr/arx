import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import {
  validateNpcActor,
  type NpcActorCombat,
  type NpcActorDef,
} from '@devcraft/content';

/**
 * NPC actors, DB-first: the relational tables (migration 18) are what
 * the server reads at boot and what dev tools will edit. Authored JSON
 * in content/actors/defs is the SEED — syncNpcActors reconciles it in
 * on every boot (content-as-code wins), hashing each def so unchanged
 * actors cost one indexed SELECT and no writes.
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
}

/** Stable content hash of a def's interchange JSON. */
function actorHash(actor: NpcActorDef): string {
  return createHash('sha1').update(JSON.stringify(actor)).digest('hex');
}

function insertChildren(db: DatabaseSync, actor: NpcActorDef): void {
  const eq = db.prepare(
    'INSERT INTO npc_actor_equipment (actor_slug, slot, item_id) VALUES (?, ?, ?)',
  );
  for (const [slot, itemId] of Object.entries(actor.equipment ?? {})) {
    eq.run(actor.id, slot, itemId);
  }
  const inv = db.prepare(
    'INSERT INTO npc_actor_inventory (actor_slug, idx, item_id, qty) VALUES (?, ?, ?, ?)',
  );
  (actor.inventory ?? []).forEach((row, i) => inv.run(actor.id, i, row.item, row.qty));
  const line = db.prepare('INSERT INTO npc_actor_lines (actor_slug, idx, line) VALUES (?, ?, ?)');
  (actor.lines ?? []).forEach((l, i) => line.run(actor.id, i, l));
  if (actor.combat) {
    const c = actor.combat;
    db.prepare(
      `INSERT INTO npc_actor_combat
        (actor_slug, level, base_creature, respawn_sec, max_hp, damage, attack_range,
         attack_cooldown_ticks, aggro_range, leash_range, speed, xp_reward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
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
    );
    const loot = db.prepare(
      'INSERT INTO npc_actor_loot (actor_slug, idx, table_id) VALUES (?, ?, ?)',
    );
    (c.loot ?? []).forEach((t, i) => loot.run(actor.id, i, t));
  }
}

function deleteChildren(db: DatabaseSync, slug: string): void {
  for (const table of [
    'npc_actor_equipment',
    'npc_actor_inventory',
    'npc_actor_lines',
    'npc_actor_combat',
    'npc_actor_loot',
  ]) {
    db.prepare(`DELETE FROM ${table} WHERE actor_slug = ?`).run(slug);
  }
}

/** Reconcile authored defs into the DB. Content is the source of truth. */
export function syncNpcActors(
  db: DatabaseSync,
  actors: readonly NpcActorDef[],
): NpcActorSyncResult {
  const result: NpcActorSyncResult = { added: 0, updated: 0, removed: 0, unchanged: 0 };
  db.exec('BEGIN');
  try {
    const existing = new Map<string, string>();
    for (const row of db.prepare('SELECT slug, content_hash FROM npc_actors').all() as Array<{
      slug: string;
      content_hash: string;
    }>) {
      existing.set(row.slug, row.content_hash);
    }

    const now = Date.now();
    const upsert = db.prepare(
      `INSERT INTO npc_actors
        (slug, name, title, examine, disposition, protection, model_kind, creature_id, look,
         dialogue_id, shop_id, content_hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name, title = excluded.title, examine = excluded.examine,
         disposition = excluded.disposition, protection = excluded.protection,
         model_kind = excluded.model_kind,
         creature_id = excluded.creature_id, look = excluded.look,
         dialogue_id = excluded.dialogue_id, shop_id = excluded.shop_id,
         content_hash = excluded.content_hash, updated_at = excluded.updated_at`,
    );

    for (const actor of actors) {
      const hash = actorHash(actor);
      const prev = existing.get(actor.id);
      existing.delete(actor.id);
      if (prev === hash) {
        result.unchanged++;
        continue;
      }
      upsert.run(
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
        now,
      );
      deleteChildren(db, actor.id);
      insertChildren(db, actor);
      if (prev === undefined) result.added++;
      else result.updated++;
    }

    // Actors gone from content leave the DB too — a retired slug must
    // not keep spawning from stale rows.
    for (const slug of existing.keys()) {
      db.prepare('DELETE FROM npc_actors WHERE slug = ?').run(slug);
      result.removed++;
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return result;
}

export interface NpcActorLoadResult {
  actors: NpcActorDef[];
  /** Rows that failed validation — reported, never silently dropped. */
  errors: string[];
}

/** Load every actor from the DB, revalidated through the one validator. */
export function loadNpcActors(db: DatabaseSync): NpcActorLoadResult {
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

  for (const row of db
    .prepare('SELECT * FROM npc_actors ORDER BY slug')
    .all() as unknown as ActorRow[]) {
    const equipment: Record<string, string> = {};
    for (const eq of db
      .prepare('SELECT slot, item_id FROM npc_actor_equipment WHERE actor_slug = ?')
      .all(row.slug) as Array<{ slot: string; item_id: string }>) {
      equipment[eq.slot] = eq.item_id;
    }
    const inventory = (
      db
        .prepare('SELECT item_id, qty FROM npc_actor_inventory WHERE actor_slug = ? ORDER BY idx')
        .all(row.slug) as Array<{ item_id: string; qty: number }>
    ).map((r) => ({ item: r.item_id, qty: r.qty }));
    const lines = (
      db
        .prepare('SELECT line FROM npc_actor_lines WHERE actor_slug = ? ORDER BY idx')
        .all(row.slug) as Array<{ line: string }>
    ).map((r) => r.line);

    let combat: NpcActorCombat | undefined;
    const c = db
      .prepare('SELECT * FROM npc_actor_combat WHERE actor_slug = ?')
      .get(row.slug) as unknown as CombatRow | undefined;
    if (c) {
      const loot = (
        db
          .prepare('SELECT table_id FROM npc_actor_loot WHERE actor_slug = ? ORDER BY idx')
          .all(row.slug) as Array<{ table_id: string }>
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
