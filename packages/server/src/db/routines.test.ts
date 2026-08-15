import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROUTINES, type RoutineDef } from '@arx/content';
import { freshDb } from './testDb.js';
import { exportRoutine, importRoutine, loadRoutines, seedRoutines } from './routines.js';

const ALL = [...ROUTINES.values()];

test('seed + load round-trips the shipped routines exactly', async () => {
  const db = await freshDb();
  const res = await seedRoutines(db, ALL);
  assert.equal(res.added, ALL.length);
  assert.equal(res.removed + res.kept, 0);

  const loaded = await loadRoutines(db);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.routines.length, ALL.length);
  const byId = new Map(loaded.routines.map((r) => [r.id, r]));
  for (const authored of ALL) {
    // The DB round-trip must reproduce the interchange shape field
    // for field — JSON files, DB rows, and dev tools speak one format.
    assert.deepEqual(
      JSON.parse(JSON.stringify(byId.get(authored.id))),
      JSON.parse(JSON.stringify(authored)),
      `round-trip of ${authored.id}`,
    );
  }
});

test('second seed of identical content writes nothing', async () => {
  const db = await freshDb();
  await seedRoutines(db, ALL);
  const res = await seedRoutines(db, ALL);
  assert.equal(res.unchanged, ALL.length);
  assert.equal(res.added + res.updated + res.removed + res.kept, 0);
});

test('a changed shipped file flows into an untouched seed', async () => {
  const db = await freshDb();
  await seedRoutines(db, ALL);
  const smith = ALL.find((r) => r.id === 'berrit_hours')!;
  const edited: RoutineDef = { ...smith, slots: undefined };
  const res = await seedRoutines(db, [edited, ...ALL.filter((r) => r.id !== 'berrit_hours')]);
  assert.equal(res.updated, 1);
  const loaded = await loadRoutines(db);
  assert.equal(loaded.routines.find((r) => r.id === 'berrit_hours')!.slots, undefined);
});

test('THE DATABASE IS THE TRUTH: a tool edit survives every re-seed', async () => {
  const db = await freshDb();
  await seedRoutines(db, ALL);

  // The tooling stretches the patrol (importRoutine = a tool write).
  const tool = JSON.parse(JSON.stringify(ALL.find((r) => r.id === 'halla_rounds')!)) as RoutineDef;
  const patrol = tool.slots![0]!.task;
  assert.ok(patrol.kind === 'path');
  patrol.waypoints[1]!.x = 4.0;
  assert.ok((await importRoutine(db, tool)).ok);

  // A NEWER shipped version arrives — and must be respectfully kept out.
  const shipped = JSON.parse(JSON.stringify(ALL.find((r) => r.id === 'halla_rounds')!)) as RoutineDef;
  shipped.slots![0]!.from = 22;
  const res = await seedRoutines(db, [shipped, ...ALL.filter((r) => r.id !== 'halla_rounds')]);
  assert.equal(res.kept, 1);
  const kept = (await exportRoutine(db, 'halla_rounds'))!;
  const keptTask = kept.slots![0]!.task;
  assert.ok(keptTask.kind === 'path');
  assert.equal(keptTask.waypoints[1]!.x, 4.0, 'the tool edit stands');
  assert.equal(kept.slots![0]!.from, 7.5, 'the shipped change never landed');

  // And the divergence is not re-weighed on the next identical seed.
  const again = await seedRoutines(db, [shipped, ...ALL.filter((r) => r.id !== 'halla_rounds')]);
  assert.equal(again.kept, 0);
  assert.equal(again.unchanged, ALL.length);
});

test('a retired shipped file prunes only its untouched seed', async () => {
  const db = await freshDb();
  await seedRoutines(db, ALL);

  // Touch one row so it is tool-owned, then retire both from the seed.
  const tool = JSON.parse(JSON.stringify(ALL.find((r) => r.id === 'tansy_scamp')!)) as RoutineDef;
  tool.base = { kind: 'post' };
  assert.ok((await importRoutine(db, tool)).ok);
  const remaining = ALL.filter((r) => r.id !== 'tansy_scamp' && r.id !== 'wren_hours');
  const res = await seedRoutines(db, remaining);
  assert.equal(res.removed, 1, 'the pure seed goes');
  const loaded = await loadRoutines(db);
  assert.ok(loaded.routines.some((r) => r.id === 'tansy_scamp'), 'the tool-owned row stays');
  assert.ok(!loaded.routines.some((r) => r.id === 'wren_hours'), 'the retired seed is gone');
});

test('import rejects unsound defs without writing', async () => {
  const db = await freshDb();
  await seedRoutines(db, ALL);
  const res = await importRoutine(db, { id: 'halla_rounds', base: { kind: 'wander', radius: 900 } });
  assert.ok(!res.ok);
  const kept = (await exportRoutine(db, 'halla_rounds'))!;
  assert.equal(kept.base.kind, 'post', 'the bad import never landed');
});
