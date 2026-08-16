import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QUESTS, type QuestDef } from '@arx/content';
import { AccountStore } from './accounts.js';
import { freshDb } from './testDb.js';
import { exportQuest, importQuest, loadQuests, seedQuests } from './quests.js';

const ALL = [...QUESTS.values()];

test('seed + load round-trips the shipped quests exactly', async () => {
  const db = await freshDb();
  const res = await seedQuests(db, ALL);
  assert.equal(res.added, ALL.length);
  assert.equal(res.removed + res.kept, 0);

  const loaded = await loadQuests(db);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.quests.length, ALL.length);
  const byId = new Map(loaded.quests.map((q) => [q.id, q]));
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
  await seedQuests(db, ALL);
  const res = await seedQuests(db, ALL);
  assert.equal(res.unchanged, ALL.length);
  assert.equal(res.added + res.updated + res.removed + res.kept, 0);
});

test('a changed shipped file flows into an untouched seed', async () => {
  const db = await freshDb();
  await seedQuests(db, ALL);
  const hens = ALL.find((q) => q.id === 'eggs_for_the_morning')!;
  const edited: QuestDef = { ...hens, rewards: { ...hens.rewards, coins: 99 } };
  const res = await seedQuests(db, [edited, ...ALL.filter((q) => q.id !== 'eggs_for_the_morning')]);
  assert.equal(res.updated, 1);
  const loaded = await loadQuests(db);
  assert.equal(loaded.quests.find((q) => q.id === 'eggs_for_the_morning')!.rewards.coins, 99);
});

test('THE DATABASE IS THE TRUTH: a tool edit survives every re-seed', async () => {
  const db = await freshDb();
  await seedQuests(db, ALL);

  // The tooling retunes a reward (importQuest = a tool write).
  const tool = JSON.parse(JSON.stringify(ALL.find((q) => q.id === 'the_meadow_count')!)) as QuestDef;
  tool.rewards.coins = 77;
  assert.ok((await importQuest(db, tool)).ok);

  // A NEWER shipped version arrives — and must be respectfully kept out.
  const shipped = JSON.parse(
    JSON.stringify(ALL.find((q) => q.id === 'the_meadow_count')!),
  ) as QuestDef;
  shipped.rewards.coins = 12345;
  const res = await seedQuests(db, [shipped, ...ALL.filter((q) => q.id !== 'the_meadow_count')]);
  assert.equal(res.kept, 1);
  const after = (await exportQuest(db, 'the_meadow_count'))!;
  assert.equal(after.rewards.coins, 77);

  // ...and the divergence is remembered: the same seed stays quiet.
  const again = await seedQuests(db, [shipped, ...ALL.filter((q) => q.id !== 'the_meadow_count')]);
  assert.equal(again.kept + again.updated + again.added, 0);
});

test('pruning removes only pure seeds; tool-born rows are permanent', async () => {
  const db = await freshDb();
  await seedQuests(db, ALL);

  // A tool-created quest with no shipped twin.
  const toolBorn = {
    id: 'stones_errand',
    name: "The Stone's Errand",
    giver: 'keeper_wren',
    stages: [
      {
        id: 'listen',
        journal: 'The stone says nothing. Keep listening.',
        objectives: [{ kind: 'talk', actor: 'keeper_wren' }],
      },
    ],
    // Gear reward with an authored tier: rarity must survive the trip.
    rewards: { coins: 1, items: [{ item: 'iron_sword', qty: 1, rarity: 'uncommon' }] },
  };
  assert.ok((await importQuest(db, toolBorn)).ok);
  const born = (await loadQuests(db)).quests.find((q) => q.id === 'stones_errand');
  assert.equal(born?.rewards.items?.[0]?.rarity, 'uncommon');

  // Retire every shipped file: pure seeds go, the tool's quest stays.
  const res = await seedQuests(db, []);
  assert.equal(res.removed, ALL.length);
  const loaded = await loadQuests(db);
  assert.deepEqual(loaded.quests.map((q) => q.id), ['stones_errand']);
  // Cascade check: no orphaned stages of the pruned quests.
  const orphans = (await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM quest_stages WHERE quest_id != 'stones_errand'`,
  ))!;
  assert.equal(orphans.n, 0);
});

test('importQuest refuses unsound content instead of writing it', async () => {
  const db = await freshDb();
  const res = await importQuest(db, {
    id: 'broken',
    name: 'Broken',
    giver: 'nobody_home',
    stages: [{ id: 'a', journal: 'x', objectives: [{ kind: 'kill', npc: 'goblin', count: 1 }] }],
    rewards: {},
  });
  assert.ok(!res.ok);
  assert.equal((await loadQuests(db)).quests.length, 0);
});

test('a hand-broken DB row is rejected at load, not at play time', async () => {
  const db = await freshDb();
  await seedQuests(db, ALL);
  await db.run(
    `UPDATE quest_stages SET objectives = '[{"kind":"kill","npc":"ghost_npc","count":1}]'
     WHERE quest_id = 'the_meadow_count'`,
  );
  const loaded = await loadQuests(db);
  assert.equal(loaded.quests.length, ALL.length - 1);
  assert.ok(loaded.errors.some((e) => e.includes('ghost_npc')));
});

test('the quest state ledger: save, overwrite, delete, reload', async () => {
  const db = await freshDb();
  const accounts = new AccountStore(db);
  const reg = await accounts.register('quester', 'hunter22', 'Quester', { plane: 'surface', x: 48, y: 52 });
  assert.ok(reg.ok);
  const cid = reg.character.id;

  accounts.saveQuestRow(cid, {
    questId: 'eggs_for_the_morning',
    status: 'active',
    stage: 0,
    progress: '[3]',
    acceptedAt: 1000,
    completions: 0,
    cooldownUntil: null,
  });
  accounts.saveQuestRow(cid, {
    questId: 'eggs_for_the_morning',
    status: 'done',
    stage: 0,
    progress: '[]',
    acceptedAt: 1000,
    completions: 1,
    cooldownUntil: 2000,
  });
  let rows = await accounts.loadQuestRows(cid);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.status, 'done');
  assert.equal(rows[0]!.completions, 1);
  assert.equal(rows[0]!.cooldownUntil, 2000);

  accounts.deleteQuestRow(cid, 'eggs_for_the_morning');
  rows = await accounts.loadQuestRows(cid);
  assert.equal(rows.length, 0);
});
