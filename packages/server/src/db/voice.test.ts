import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VoiceClipDef } from '@arx/content';
import { freshDb } from './testDb.js';
import { importDialogue, loadDialogues } from './dialogues.js';
import {
  clipRefs,
  deleteVoiceBank,
  deleteVoiceClip,
  importVoiceClip,
  loadVoiceBanks,
  loadVoiceClips,
  saveVoiceBank,
  seedVoiceClips,
} from './voice.js';

const HASH_A = 'a'.repeat(40);
const HASH_B = 'b'.repeat(40);

const CLIP: VoiceClipDef = {
  id: 'dunna_greet_1',
  fileHash: HASH_A,
  ext: 'ogg',
  durMs: 1400,
  bytes: 18_000,
  transcript: 'Welcome to the Rest.',
  actor: 'innkeep_dunna',
  tags: ['greet'],
};
const GRUNT: VoiceClipDef = { id: 'grunt_low_1', fileHash: HASH_B, ext: 'ogg', durMs: 400, bytes: 6_000 };

test('seed + load round-trips clips exactly; second seed writes nothing', async () => {
  const db = await freshDb();
  const first = await seedVoiceClips(db, [CLIP, GRUNT]);
  assert.equal(first.added, 2);
  const again = await seedVoiceClips(db, [CLIP, GRUNT]);
  assert.equal(again.unchanged, 2);
  assert.equal(again.added + again.updated + again.kept + again.removed, 0);

  const { clips, errors } = await loadVoiceClips(db);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    clips.map((c) => JSON.parse(JSON.stringify(c.def))),
    [JSON.parse(JSON.stringify(CLIP)), JSON.parse(JSON.stringify(GRUNT))],
  );
  assert.deepEqual(
    clips.map((c) => c.edited),
    [false, false],
  );
});

test('THE DATABASE IS THE TRUTH: a Studio upload survives re-seeds and wears the badge', async () => {
  const db = await freshDb();
  await seedVoiceClips(db, [CLIP]);
  // The Studio replaces the recording (new binary, new duration).
  await importVoiceClip(db, { ...CLIP, fileHash: HASH_B, durMs: 1650 });
  // The unchanged shipped def re-seeds as a no-op...
  const same = await seedVoiceClips(db, [CLIP]);
  assert.equal(same.unchanged, 1);
  // ...and even a CHANGED shipped def is respectfully kept out.
  const seeded = await seedVoiceClips(db, [{ ...CLIP, transcript: 'Welcome in, love.' }]);
  assert.equal(seeded.kept, 1);
  const { clips } = await loadVoiceClips(db);
  assert.equal(clips[0]!.def.fileHash, HASH_B);
  assert.equal(clips[0]!.def.durMs, 1650);
  assert.equal(clips[0]!.edited, true);

  // A Studio-born clip (no authored twin) is edited from birth.
  await importVoiceClip(db, GRUNT);
  const reload = await loadVoiceClips(db);
  assert.equal(reload.clips.find((c) => c.def.id === 'grunt_low_1')!.edited, true);
});

test('banks: save validates refs, load groups per owner, delete clears', async () => {
  const db = await freshDb();
  await seedVoiceClips(db, [CLIP, GRUNT]);
  const clipIds = new Set(['dunna_greet_1', 'grunt_low_1']);

  const ghost = await saveVoiceBank(
    db,
    { owner: { kind: 'actor', id: 'innkeep_dunna' }, slots: { greet: [{ clip: 'ghost' }] } },
    clipIds,
  );
  assert.ok(!ghost.ok);

  const saved = await saveVoiceBank(
    db,
    {
      owner: { kind: 'actor', id: 'innkeep_dunna' },
      slots: { greet: [{ clip: 'dunna_greet_1' }, { clip: 'grunt_low_1', weight: 3 }], ack: [{ clip: 'grunt_low_1' }] },
    },
    clipIds,
  );
  assert.ok(saved.ok);

  const banks = await loadVoiceBanks(db);
  assert.equal(banks.length, 1);
  assert.deepEqual(banks[0]!.owner, { kind: 'actor', id: 'innkeep_dunna' });
  assert.deepEqual(banks[0]!.slots.greet, [
    { clip: 'dunna_greet_1' },
    { clip: 'grunt_low_1', weight: 3 },
  ]);

  // A re-save replaces the whole card — no stale rows linger.
  await saveVoiceBank(
    db,
    { owner: { kind: 'actor', id: 'innkeep_dunna' }, slots: { greet: [{ clip: 'grunt_low_1' }] } },
    clipIds,
  );
  const after = await loadVoiceBanks(db);
  assert.deepEqual(after[0]!.slots, { greet: [{ clip: 'grunt_low_1' }] });

  assert.equal(await deleteVoiceBank(db, 'actor', 'innkeep_dunna'), true);
  assert.deepEqual(await loadVoiceBanks(db), []);
});

test('the delete guard: references refuse, orphaned binaries are named', async () => {
  const db = await freshDb();
  await seedVoiceClips(db, [CLIP, GRUNT]);
  const clipIds = new Set(['dunna_greet_1', 'grunt_low_1']);
  await saveVoiceBank(
    db,
    { owner: { kind: 'actor', id: 'innkeep_dunna' }, slots: { greet: [{ clip: 'dunna_greet_1' }] } },
    clipIds,
  );
  // A dialogue node speaking the clip guards it too (Phase 3 threads
  // the column; the ledger already respects it).
  await db.run(
    `INSERT INTO dialogues (id, start_node, once, content_hash, authored_hash, updated_at)
     VALUES ('t_dlg', 'a', 0, 'x', 'x', 0)`,
  );
  await db.run(
    `INSERT INTO dialogue_nodes (dialogue_id, node_id, idx, text, voice) VALUES ('t_dlg', 'a', 0, 'Hello.', 'dunna_greet_1')`,
  );

  const refs = await clipRefs(db, 'dunna_greet_1');
  assert.deepEqual(refs.banks, ['actor:innkeep_dunna:greet']);
  assert.deepEqual(refs.nodes, ['t_dlg#a']);

  const refused = await deleteVoiceClip(db, 'dunna_greet_1');
  assert.ok(!refused.ok && 'refs' in refused && refused.refs.total === 2);

  // Unhook both referents — now the clip may go, and its binary is orphaned.
  await deleteVoiceBank(db, 'actor', 'innkeep_dunna');
  await db.run(`UPDATE dialogue_nodes SET voice = NULL WHERE dialogue_id = 't_dlg'`);
  const gone = await deleteVoiceClip(db, 'dunna_greet_1');
  assert.ok(gone.ok && gone.fileHash === HASH_A && gone.fileOrphaned === true);

  // Two clips sharing one binary: deleting one leaves the file held.
  await importVoiceClip(db, { ...CLIP, id: 'dunna_greet_alt', fileHash: HASH_B });
  const shared = await deleteVoiceClip(db, 'dunna_greet_alt');
  assert.ok(shared.ok && shared.fileOrphaned === false);

  const missing = await deleteVoiceClip(db, 'never_was');
  assert.ok(!missing.ok && 'missing' in missing);
});

test('the spoken line rides the dialogue row: voice survives the DB round trip', async () => {
  const db = await freshDb();
  const def = {
    id: 'v_roundtrip',
    start: 'a',
    bindings: [{ kind: 'actor' as const, target: 'innkeep_dunna' }],
    nodes: [
      { id: 'a', text: 'Morning.', voice: 'dunna_greet_1', next: 'b' },
      { id: 'b', text: 'Mind the step.' },
    ],
  };
  const imported = await importDialogue(db, def);
  assert.ok(imported.ok, JSON.stringify(imported));
  const loaded = await loadDialogues(db);
  const back = loaded.dialogues.find((d) => d.id === 'v_roundtrip')!;
  assert.equal(back.nodes[0]!.voice, 'dunna_greet_1');
  assert.equal(back.nodes[1]!.voice, undefined);
  // The interchange shape reproduces field for field.
  assert.deepEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(def)));
});
