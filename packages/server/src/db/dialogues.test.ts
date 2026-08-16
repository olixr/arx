import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIALOGUES, type DialogueDef } from '@arx/content';
import { AccountStore } from './accounts.js';
import { freshDb } from './testDb.js';
import { exportDialogue, importDialogue, loadDialogues, seedDialogues } from './dialogues.js';

const ALL = [...DIALOGUES.values()];

test('seed + load round-trips the shipped trees exactly', async () => {
  const db = await freshDb();
  const res = await seedDialogues(db, ALL);
  assert.equal(res.added, ALL.length);
  assert.equal(res.removed + res.kept, 0);

  const loaded = await loadDialogues(db);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.dialogues.length, ALL.length);
  const byId = new Map(loaded.dialogues.map((d) => [d.id, d]));
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
  await seedDialogues(db, ALL);
  const res = await seedDialogues(db, ALL);
  assert.equal(res.unchanged, ALL.length);
  assert.equal(res.added + res.updated + res.removed + res.kept, 0);
});

test('a changed shipped file flows into an untouched seed', async () => {
  const db = await freshDb();
  await seedDialogues(db, ALL);
  const welcome = ALL.find((d) => d.id === 'wren_awakening')!;
  const edited: DialogueDef = { ...welcome, once: undefined };
  const res = await seedDialogues(db, [edited, ...ALL.filter((d) => d.id !== 'wren_awakening')]);
  assert.equal(res.updated, 1);
  const loaded = await loadDialogues(db);
  assert.equal(loaded.dialogues.find((d) => d.id === 'wren_awakening')!.once, undefined);
});

test('THE DATABASE IS THE TRUTH: a tool edit survives every re-seed', async () => {
  const db = await freshDb();
  await seedDialogues(db, ALL);

  // The tooling rewrites a line (importDialogue = a tool write).
  const tool = JSON.parse(JSON.stringify(ALL.find((d) => d.id === 'halla_yard')!)) as DialogueDef;
  tool.nodes.find((n) => n.id === 'recap')!.text = 'Aye. The village thanks you.';
  assert.ok((await importDialogue(db, tool)).ok);

  // A NEWER shipped version arrives — and must be respectfully kept out.
  const shipped = JSON.parse(JSON.stringify(ALL.find((d) => d.id === 'halla_yard')!)) as DialogueDef;
  shipped.nodes.find((n) => n.id === 'recap')!.text = 'SHIPPED CLOBBER ATTEMPT';
  const res = await seedDialogues(db, [shipped, ...ALL.filter((d) => d.id !== 'halla_yard')]);
  assert.equal(res.kept, 1);
  const after = (await exportDialogue(db, 'halla_yard'))!;
  assert.equal(after.nodes.find((n) => n.id === 'recap')!.text, 'Aye. The village thanks you.');

  // ...and the divergence is remembered: the same seed stays quiet.
  const again = await seedDialogues(db, [shipped, ...ALL.filter((d) => d.id !== 'halla_yard')]);
  assert.equal(again.kept + again.updated + again.added, 0);
});

test('pruning removes only pure seeds; tool-born rows are permanent', async () => {
  const db = await freshDb();
  await seedDialogues(db, ALL);

  // A tool-created tree with no shipped twin.
  const toolBorn = {
    id: 'monolith_whisper',
    start: 'a',
    bindings: [{ kind: 'actor', target: 'keeper_wren' }],
    nodes: [{ id: 'a', text: 'The stone says nothing. _Loudly._' }],
  };
  assert.ok((await importDialogue(db, toolBorn)).ok);

  // Retire every shipped file: pure seeds go, the tool's tree stays.
  const res = await seedDialogues(db, []);
  assert.equal(res.removed, ALL.length);
  const loaded = await loadDialogues(db);
  assert.deepEqual(loaded.dialogues.map((d) => d.id), ['monolith_whisper']);
  // Cascade check: no orphaned children of the pruned trees.
  const orphans = (await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM dialogue_bindings WHERE dialogue_id != 'monolith_whisper'`,
  ))!;
  assert.equal(orphans.n, 0);
});

test('importDialogue refuses unsound content instead of writing it', async () => {
  const db = await freshDb();
  const res = await importDialogue(db, { id: 'broken', start: 'ghost', nodes: [{ id: 'a', text: 'x' }] });
  assert.ok(!res.ok);
  assert.equal((await loadDialogues(db)).dialogues.length, 0);
});

test('a hand-broken DB row is rejected at load, not at talk time', async () => {
  const db = await freshDb();
  await seedDialogues(db, ALL);
  await db.run(
    `UPDATE dialogue_nodes SET next_node = 'ghost' WHERE dialogue_id = 'brammel_gate' AND node_id = 'produce'`,
  );
  const loaded = await loadDialogues(db);
  assert.equal(loaded.dialogues.length, ALL.length - 1);
  assert.ok(loaded.errors.some((e) => e.includes('ghost')));
});

test('the flag ledger: set, overwrite, clear, reload', async () => {
  const db = await freshDb();
  const accounts = new AccountStore(db);
  const reg = await accounts.register('flagger', 'hunter22', 'Flagger', { plane: 'surface', x: 48, y: 52 });
  assert.ok(reg.ok);
  const cid = reg.character.id;

  accounts.setFlag(cid, 'dlg:wren_awakening', 1);
  accounts.setFlag(cid, 'dawn_rats_task', 1);
  accounts.setFlag(cid, 'dawn_rats_task', 2); // upsert overwrites
  let flags = await accounts.loadFlags(cid);
  assert.equal(flags.get('dlg:wren_awakening'), 1);
  assert.equal(flags.get('dawn_rats_task'), 2);

  accounts.clearFlag(cid, 'dawn_rats_task');
  flags = await accounts.loadFlags(cid);
  assert.equal(flags.has('dawn_rats_task'), false);
  assert.equal(flags.size, 1);
});
