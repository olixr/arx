import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NPC_ACTORS, type NpcActorDef } from '@arx/content';
import { openDb } from './db.js';
import { loadNpcActors, syncNpcActors } from './npcActors.js';

const ALL = [...NPC_ACTORS.values()];

test('sync + load round-trips the authored roster exactly', () => {
  const db = openDb(':memory:');
  const res = syncNpcActors(db, ALL);
  assert.equal(res.added, ALL.length);
  assert.equal(res.removed, 0);

  const loaded = loadNpcActors(db);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.actors.length, ALL.length);
  const bySlug = new Map(loaded.actors.map((a) => [a.id, a]));
  for (const authored of ALL) {
    // The DB round-trip must reproduce the interchange shape field
    // for field — JSON files, DB rows, and dev tools speak one format.
    assert.deepEqual(
      JSON.parse(JSON.stringify(bySlug.get(authored.id))),
      JSON.parse(JSON.stringify(authored)),
      `round-trip of ${authored.id}`,
    );
  }
});

test('second sync of identical content writes nothing', () => {
  const db = openDb(':memory:');
  syncNpcActors(db, ALL);
  const res = syncNpcActors(db, ALL);
  assert.equal(res.unchanged, ALL.length);
  assert.equal(res.added + res.updated + res.removed, 0);
});

test('changed defs update; retired defs are pruned with their children', () => {
  const db = openDb(':memory:');
  syncNpcActors(db, ALL);

  const guard = ALL.find((a) => a.id === 'warden_bryn')!;
  const renamed: NpcActorDef = { ...guard, name: 'Watch Sergeant' };
  const res = syncNpcActors(db, [renamed]); // everyone else retires
  assert.equal(res.updated, 1);
  assert.equal(res.removed, ALL.length - 1);

  const loaded = loadNpcActors(db);
  assert.equal(loaded.actors.length, 1);
  assert.equal(loaded.actors[0]!.name, 'Watch Sergeant');
  // Child rows of retired actors are gone (cascade).
  const orphan = db
    .prepare('SELECT COUNT(*) AS n FROM npc_actor_inventory WHERE actor_slug = ?')
    .get('tinker_fen') as { n: number };
  assert.equal(orphan.n, 0);
});

test('a hand-broken DB row is rejected at load, not at spawn time', () => {
  const db = openDb(':memory:');
  syncNpcActors(db, ALL);
  db.prepare('UPDATE npc_actors SET creature_id = ?, model_kind = ? WHERE slug = ?').run(
    'dragon',
    'creature',
    'young_pip',
  );
  const loaded = loadNpcActors(db);
  assert.ok(loaded.errors.some((e) => e.includes('young_pip') && e.includes('unknown bestiary')));
  assert.equal(loaded.actors.length, ALL.length - 1);
});
