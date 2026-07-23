import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIALOGUES, type DialogueDef } from '@devcraft/content';
import { AccountStore } from './accounts.js';
import { openDb } from './db.js';
import { loadDialogues, syncDialogues } from './dialogues.js';

const ALL = [...DIALOGUES.values()];

test('sync + load round-trips the authored trees exactly', () => {
  const db = openDb(':memory:');
  const res = syncDialogues(db, ALL);
  assert.equal(res.added, ALL.length);
  assert.equal(res.removed, 0);

  const loaded = loadDialogues(db);
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

test('second sync of identical content writes nothing', () => {
  const db = openDb(':memory:');
  syncDialogues(db, ALL);
  const res = syncDialogues(db, ALL);
  assert.equal(res.unchanged, ALL.length);
  assert.equal(res.added + res.updated + res.removed, 0);
});

test('changed defs update; retired defs are pruned with their children', () => {
  const db = openDb(':memory:');
  syncDialogues(db, ALL);

  const welcome = ALL.find((d) => d.id === 'maren_welcome')!;
  const edited: DialogueDef = { ...welcome, priority: 20 };
  const res = syncDialogues(db, [edited]); // every other tree retires
  assert.equal(res.updated, 1);
  assert.equal(res.removed, ALL.length - 1);

  const loaded = loadDialogues(db);
  assert.equal(loaded.dialogues.length, 1);
  assert.equal(loaded.dialogues[0]!.priority, 20);
  // Child rows of retired dialogues are gone (cascade).
  const orphans = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM dialogue_nodes WHERE dialogue_id = 'alda_watch')
            + (SELECT COUNT(*) FROM dialogue_choices WHERE dialogue_id = 'alda_watch') AS n`,
    )
    .get() as { n: number };
  assert.equal(orphans.n, 0);
});

test('a hand-broken DB row is rejected at load, not at talk time', () => {
  const db = openDb(':memory:');
  syncDialogues(db, ALL);
  // Point a node at a ghost — the kind of edit a buggy tool could make.
  db.prepare(
    `UPDATE dialogue_nodes SET next_node = 'ghost' WHERE dialogue_id = 'tobbin_wares' AND node_id = 'counter'`,
  ).run();
  const loaded = loadDialogues(db);
  assert.equal(loaded.dialogues.length, ALL.length - 1);
  assert.ok(loaded.errors.some((e) => e.includes('ghost')));
});

test('the flag ledger: set, overwrite, clear, reload', () => {
  const db = openDb(':memory:');
  const accounts = new AccountStore(db);
  const reg = accounts.register('flagger', 'hunter22', 'Flagger', { x: 48, y: 52 });
  assert.ok(reg.ok);
  const cid = reg.character.id;

  accounts.setFlag(cid, 'dlg:maren_welcome', 1);
  accounts.setFlag(cid, 'grib_friend', 1);
  accounts.setFlag(cid, 'grib_friend', 2); // upsert overwrites
  let flags = accounts.loadFlags(cid);
  assert.equal(flags.get('dlg:maren_welcome'), 1);
  assert.equal(flags.get('grib_friend'), 2);

  accounts.clearFlag(cid, 'grib_friend');
  flags = accounts.loadFlags(cid);
  assert.equal(flags.has('grib_friend'), false);
  assert.equal(flags.size, 1);
});
