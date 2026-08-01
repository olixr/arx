import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ITEMS } from '../items.js';
import { NPCS } from '../npcs.js';
import { NPC_ACTORS } from '../actors/registry.js';
import { DIALOGUES } from '../dialogues/registry.js';
import { validateDialogue } from '../dialogues/validate.js';
import { buildAmberford } from '../maps/amberford.js';
import { buildDawnmead } from '../maps/dawnmead.js';
import { buildSilverfall } from '../maps/silverfall.js';
import { buildUndercroft } from '../maps/undercroft.js';
import { QUEST_FLAG_RE, isQuestFlag, parseQuestFlag, questDoneFlag } from './flags.js';
import { QUESTS } from './registry.js';
import { validateQuest } from './validate.js';

const DEFS_DIR = new URL('./defs/', import.meta.url).pathname;

test('every defs/*.json file is registered and valid', () => {
  const files = readdirSync(DEFS_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'defs directory holds quest files');
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(DEFS_DIR, file), 'utf8')) as { id?: string };
    const slug = file.replace(/\.json$/, '');
    assert.equal(raw.id, slug, `${file}: filename must equal the quest id`);
    assert.ok(QUESTS.has(slug), `${file}: missing from the registry SOURCES roster`);
  }
  assert.equal(QUESTS.size, files.length, 'registry holds exactly the authored files');
});

test('every shipped quest references only real world slugs', () => {
  const zoneIds = new Set(
    [buildDawnmead(), buildAmberford(), buildSilverfall(), buildUndercroft()].map((z) => z.id),
  );
  for (const q of QUESTS.values()) {
    assert.ok(NPC_ACTORS.has(q.giver), `${q.id}: giver '${q.giver}' exists`);
    if (q.turnIn) assert.ok(NPC_ACTORS.has(q.turnIn), `${q.id}: turnIn '${q.turnIn}' exists`);
    for (const stage of q.stages) {
      for (const o of stage.objectives) {
        if (o.kind === 'kill') assert.ok(NPCS.has(o.npc), `${q.id}: npc '${o.npc}' exists`);
        if (o.kind === 'collect') assert.ok(ITEMS.has(o.item), `${q.id}: item '${o.item}' exists`);
        if (o.kind === 'talk') assert.ok(NPC_ACTORS.has(o.actor), `${q.id}: actor '${o.actor}' exists`);
        if (o.kind === 'discover') {
          assert.ok(zoneIds.has(o.place.slice(5)), `${q.id}: place '${o.place}' is an authored zone`);
        }
      }
    }
  }
});

test('every NPC-given quest is swearable at its giver (the mark keeps its promise)', () => {
  // The "!" over a giver's head promises the offer is reachable in
  // conversation. The server keeps that promise by chaining into the
  // offer tree at any good ending — which needs, per quest: a tree
  // bound to the giver, holding a quest_accept hook for the quest,
  // gated on quest:<id>:available so it retires the moment the work
  // is taken. Item-started quests wear no mark and need no tree.
  const itemStarted = new Set(
    [...ITEMS.values()].map((i) => i.startsQuest).filter((q): q is string => q !== undefined),
  );
  for (const q of QUESTS.values()) {
    if (itemStarted.has(q.id)) continue;
    const offers = [...DIALOGUES.values()].filter(
      (d) =>
        d.bindings?.some((b) => b.kind === 'actor' && b.target === q.giver) &&
        d.nodes.some((n) => n.hooks?.some((h) => h.kind === 'quest_accept' && h.quest === q.id)),
    );
    assert.ok(offers.length > 0, `${q.id}: giver '${q.giver}' has a tree that swears it`);
    assert.ok(
      offers.some((d) => (d.requires ?? []).includes(`quest:${q.id}:available`)),
      `${q.id}: an offer tree is gated on quest:${q.id}:available (retires once taken)`,
    );
  }
});

test('requires.quests chains are acyclic (a gate must be earnable)', () => {
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string): void => {
    if (done.has(id)) return;
    assert.ok(!visiting.has(id), `quest prerequisite cycle through '${id}'`);
    visiting.add(id);
    for (const req of QUESTS.get(id)?.requires?.quests ?? []) visit(req);
    visiting.delete(id);
    done.add(id);
  };
  for (const id of QUESTS.keys()) visit(id);
});

test('validator: the laws hold', () => {
  const base = {
    id: 'law_probe',
    name: 'Law Probe',
    giver: 'farmer_hobb',
    stages: [
      { id: 'one', journal: 'A probe.', objectives: [{ kind: 'kill', npc: 'goblin', count: 2 }] },
    ],
    rewards: {},
  };
  assert.ok(validateQuest(base).ok, 'the baseline probe is sound');

  const broken = (patch: Record<string, unknown>, needle: string): void => {
    const res = validateQuest({ ...base, ...patch });
    assert.ok(!res.ok, `expected failure for ${needle}`);
    assert.ok(
      res.errors.some((e) => e.includes(needle)),
      `expected an error mentioning '${needle}', got: ${res.errors.join(' | ')}`,
    );
  };

  broken({ giver: 'nobody_home' }, 'unknown actor');
  broken(
    {
      stages: [
        { id: 'a', journal: 'x', objectives: [{ kind: 'collect', item: 'egg', count: 3 }] },
        { id: 'b', journal: 'y', objectives: [{ kind: 'kill', npc: 'goblin', count: 1 }] },
      ],
    },
    'final stage',
  );
  broken(
    { questDrops: [{ npc: 'goblin', item: 'bones', chance: 0.5 }] },
    'not asked for by any collect objective',
  );
  broken(
    {
      stages: [
        { id: 'a', journal: 'x', objectives: [{ kind: 'collect', item: 'egg', count: 3 }] },
      ],
      questDrops: [{ npc: 'goblin', item: 'egg', chance: 1.5 }],
    },
    'chance',
  );
  broken({ requires: { quests: ['law_probe'] } }, 'may not name the quest itself');
  broken({ requires: { flags: ['world:calm'] } }, 'plain or dlg: flag');
  broken({ rewards: { flags: ['dlg:sneaky'] } }, 'plain story slug');
  broken(
    { stages: [{ id: 'a', journal: 'x', objectives: [{ kind: 'discover', place: 'poi:1,2' }] }] },
    'zone:',
  );

  // Rolled gear can never be a collect ask — the turn-in consumes by id.
  const gearId = [...ITEMS.values()].find((d) => d.gear)?.id;
  assert.ok(gearId, 'the item registry holds rolled gear to probe with');
  broken(
    {
      stages: [
        { id: 'a', journal: 'x', objectives: [{ kind: 'collect', item: gearId, count: 1 }] },
      ],
    },
    'rolled gear',
  );

  // Reward rarity is gear-only, and must be a real tier.
  broken({ rewards: { items: [{ item: 'egg', qty: 1, rarity: 'uncommon' }] } }, 'only gear');
  broken({ rewards: { items: [{ item: gearId, qty: 1, rarity: 'shiny' }] } }, 'rarity tier');
  const geared = validateQuest({
    ...base,
    rewards: { items: [{ item: gearId, qty: 1, rarity: 'uncommon' }] },
  });
  assert.ok(geared.ok, 'gear rewards may carry a rarity tier');
  assert.equal(geared.ok && geared.quest.rewards.items?.[0]?.rarity, 'uncommon');
});

test('quest: flag grammar — parse and refuse', () => {
  assert.deepEqual(parseQuestFlag('quest:hobbs_hens:available'), {
    quest: 'hobbs_hens',
    state: 'available',
  });
  assert.deepEqual(parseQuestFlag('quest:hobbs_hens:stage:gather'), {
    quest: 'hobbs_hens',
    state: 'stage',
    stage: 'gather',
  });
  assert.equal(parseQuestFlag('quest:hobbs_hens'), null);
  assert.equal(parseQuestFlag('quest:hobbs_hens:begun'), null);
  assert.ok(isQuestFlag('quest:x:done'));
  assert.ok(!QUEST_FLAG_RE.test('quest:Bad:done'));
  assert.equal(questDoneFlag('hobbs_hens'), 'qst:hobbs_hens');
});

test('dialogue validator: quest hooks and quest: gates', () => {
  const tree = (patch: Record<string, unknown>): Record<string, unknown> => ({
    id: 'probe_tree',
    start: 'hub',
    nodes: [{ id: 'hub', text: 'Well?', ...patch }],
    bindings: [{ kind: 'actor', target: 'farmer_hobb' }],
  });

  const offer = validateDialogue(
    tree({ hooks: [{ kind: 'quest_offer', quest: 'hobbs_hens' }] }),
  );
  assert.ok(offer.ok, 'quest_offer hook validates');

  const badKind = validateDialogue(tree({ hooks: [{ kind: 'quest_begin', quest: 'x' }] }));
  assert.ok(!badKind.ok && badKind.errors.some((e) => e.includes('quest_offer')));

  const crossRef = validateDialogue(
    tree({ hooks: [{ kind: 'quest_accept', quest: 'ghost_quest' }] }),
    { questIds: new Set(['hobbs_hens']) },
  );
  assert.ok(!crossRef.ok && crossRef.errors.some((e) => e.includes('unknown quest')));

  const gated = validateDialogue(
    { ...tree({}), requires: ['quest:hobbs_hens:ready'] },
    { questIds: new Set(['hobbs_hens']) },
  );
  assert.ok(gated.ok, 'quest: gates validate with a known id');

  const badGrammar = validateDialogue({ ...tree({}), requires: ['quest:hobbs_hens:begun'] });
  assert.ok(!badGrammar.ok && badGrammar.errors.some((e) => e.includes('quest:<id>')));

  const setQuest = validateDialogue(
    tree({
      choices: [{ text: 'Yes.', set: ['quest:hobbs_hens:done'] }],
    }),
  );
  assert.ok(!setQuest.ok && setQuest.errors.some((e) => e.includes('nobody writes it')));
});

test('shipped dialogues: every quest reference resolves', () => {
  // The dialogue registry can't import the quest registry (import
  // cycle), so the shipped-content cross-check lives here.
  for (const def of DIALOGUES.values()) {
    const flags = [
      ...(def.requires ?? []),
      ...(def.forbids ?? []),
      ...def.nodes.flatMap((n) =>
        (n.choices ?? []).flatMap((c) => [...(c.requires ?? []), ...(c.forbids ?? [])]),
      ),
    ];
    for (const f of flags) {
      if (!isQuestFlag(f)) continue;
      const parsed = parseQuestFlag(f);
      assert.ok(parsed && QUESTS.has(parsed.quest), `${def.id}: '${f}' names a shipped quest`);
      if (parsed?.state === 'stage') {
        const q = QUESTS.get(parsed.quest)!;
        assert.ok(
          q.stages.some((s) => s.id === parsed.stage),
          `${def.id}: '${f}' names a real stage of ${parsed.quest}`,
        );
      }
    }
    for (const node of def.nodes) {
      for (const h of node.hooks ?? []) {
        if (h.kind === 'quest_offer' || h.kind === 'quest_accept' || h.kind === 'quest_turnin') {
          assert.ok(QUESTS.has(h.quest), `${def.id}/${node.id}: quest '${h.quest}' is shipped`);
        }
      }
    }
  }
});

test('items: quest facets are lawful', () => {
  for (const item of ITEMS.values()) {
    if (item.startsQuest !== undefined) {
      assert.ok(QUESTS.has(item.startsQuest), `${item.id}: startsQuest '${item.startsQuest}' is shipped`);
    }
    if (item.quest) {
      assert.equal(item.value, 0, `${item.id}: quest items are worthless by law`);
      assert.equal(item.gear, undefined, `${item.id}: quest items never roll`);
    }
  }
});
