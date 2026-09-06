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
import { TRIGGERS } from '../triggers/registry.js';
import { POI_DEFS } from '../pois/defs.js';

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

test('every quest gate flag is stampable in shipped content (a gate must be earnable)', () => {
  // The a_name_for_the_stone lesson: its one gate flag was authored on
  // a dialogue node's `set` — a field the node validator didn't know
  // and silently ate — so the quest shipped unreachable. Flags only
  // exist where something stamps them; this walks every stamp source
  // and refuses a gate no shipped content can ever satisfy.
  const stampable = new Set<string>();
  for (const d of DIALOGUES.values()) {
    for (const n of d.nodes) {
      for (const h of n.hooks ?? []) if (h.kind === 'flag') stampable.add(h.flag);
      for (const c of n.choices ?? []) for (const f of c.set ?? []) stampable.add(f);
    }
  }
  for (const q of QUESTS.values()) for (const f of q.rewards?.flags ?? []) stampable.add(f);
  for (const q of QUESTS.values()) {
    for (const f of q.requires?.flags ?? []) {
      if (f.startsWith('faction:')) continue; // answered live from standing
      if (f.startsWith('dlg:')) {
        assert.ok(DIALOGUES.has(f.slice(4)), `${q.id}: gate '${f}' names a real dialogue`);
        continue;
      }
      assert.ok(stampable.has(f), `${q.id}: gate flag '${f}' is stamped nowhere in shipped content`);
    }
  }
});

test('validator: the laws hold', () => {
  const base = {
    id: 'law_probe',
    name: 'Law Probe',
    giver: 'farmer_brammel',
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
  assert.deepEqual(parseQuestFlag('quest:eggs_for_the_morning:available'), {
    quest: 'eggs_for_the_morning',
    state: 'available',
  });
  assert.deepEqual(parseQuestFlag('quest:eggs_for_the_morning:stage:gather'), {
    quest: 'eggs_for_the_morning',
    state: 'stage',
    stage: 'gather',
  });
  assert.equal(parseQuestFlag('quest:eggs_for_the_morning'), null);
  assert.equal(parseQuestFlag('quest:eggs_for_the_morning:begun'), null);
  assert.ok(isQuestFlag('quest:x:done'));
  assert.ok(!QUEST_FLAG_RE.test('quest:Bad:done'));
  assert.equal(questDoneFlag('eggs_for_the_morning'), 'qst:eggs_for_the_morning');
});

test('dialogue validator: quest hooks and quest: gates', () => {
  const tree = (patch: Record<string, unknown>): Record<string, unknown> => ({
    id: 'probe_tree',
    start: 'hub',
    nodes: [{ id: 'hub', text: 'Well?', ...patch }],
    bindings: [{ kind: 'actor', target: 'farmer_brammel' }],
  });

  const offer = validateDialogue(
    tree({ hooks: [{ kind: 'quest_offer', quest: 'eggs_for_the_morning' }] }),
  );
  assert.ok(offer.ok, 'quest_offer hook validates');

  const badKind = validateDialogue(tree({ hooks: [{ kind: 'quest_begin', quest: 'x' }] }));
  assert.ok(!badKind.ok && badKind.errors.some((e) => e.includes('quest_offer')));

  const crossRef = validateDialogue(
    tree({ hooks: [{ kind: 'quest_accept', quest: 'ghost_quest' }] }),
    { questIds: new Set(['eggs_for_the_morning']) },
  );
  assert.ok(!crossRef.ok && crossRef.errors.some((e) => e.includes('unknown quest')));

  const gated = validateDialogue(
    { ...tree({}), requires: ['quest:eggs_for_the_morning:ready'] },
    { questIds: new Set(['eggs_for_the_morning']) },
  );
  assert.ok(gated.ok, 'quest: gates validate with a known id');

  const badGrammar = validateDialogue({ ...tree({}), requires: ['quest:eggs_for_the_morning:begun'] });
  assert.ok(!badGrammar.ok && badGrammar.errors.some((e) => e.includes('quest:<id>')));

  const setQuest = validateDialogue(
    tree({
      choices: [{ text: 'Yes.', set: ['quest:eggs_for_the_morning:done'] }],
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

// ---- THE CONTESTED LANDS band 7: THE CAUSEWAY OR THE SLUICE (plan §3.1,
// band7/blockout.md §6). The fork is two opposed two-link chains on the
// four objective kinds; each side's offer trees forbid the OTHER side by
// quest state only (E10: never by the bare flag, so a third corner can
// land without touching these files); both sides stamp fen_side_taken.
test('CONTESTED LANDS: the fen waist fork is two chains that shut each other by quest state', () => {
  const A = ['stakes_in_the_waist', 'the_levy_posted'];
  const B = ['the_old_gate', 'the_green_road'];
  for (const id of [...A, ...B, 'the_ledger_line', 'the_obstruction_bill']) {
    assert.ok(QUESTS.has(id), `${id} is shipped`);
  }
  // The chains: link 1 gated on the tutorial, link 2 on link 1.
  assert.deepEqual(QUESTS.get(A[0]!)!.requires?.quests, ['the_first_road']);
  assert.deepEqual(QUESTS.get(B[0]!)!.requires?.quests, ['the_first_road']);
  assert.deepEqual(QUESTS.get(A[1]!)!.requires?.quests, [A[0]]);
  assert.deepEqual(QUESTS.get(B[1]!)!.requires?.quests, [B[0]]);
  // The ledger carry is closed to B by construction; the bill to A.
  assert.deepEqual(QUESTS.get('the_ledger_line')!.requires?.quests, [A[1]]);
  assert.deepEqual(QUESTS.get('the_obstruction_bill')!.requires?.quests, [B[1]]);
  assert.ok(QUESTS.get('the_ledger_line')!.repeat && QUESTS.get('the_obstruction_bill')!.repeat);
  // Both sides stamp the one shared flag; only A cuts the reach and
  // buys the pass; only B carries the string.
  const flagsOf = (id: string) => QUESTS.get(id)!.rewards.flags ?? [];
  assert.deepEqual(flagsOf(A[1]!), ['fen_side_taken', 'charter_pass', 'weir_cut']);
  assert.deepEqual(flagsOf(B[1]!), ['fen_side_taken', 'halvor_string_carried']);
  assert.deepEqual(flagsOf(A[0]!), ['dike_planted']);
  assert.deepEqual(flagsOf(B[0]!), ['sluice_mended']);
  // Opposition authored on both sides of every reward row, never crossed.
  const A2 = QUESTS.get(A[1]!)!;
  assert.deepEqual(A2.rewards.standing, [
    { faction: 'fordgate', delta: 15 },
    { faction: 'fenside', delta: -15 },
  ]);
  assert.deepEqual(QUESTS.get(B[1]!)!.rewards.standing, [
    { faction: 'fenside', delta: 15 },
    { faction: 'fordgate', delta: -15 },
  ]);
  // The pass is a held keepsake AND a flag; the sortie is a kill on the
  // shipped shore rows; the wordless beat is a talk on the neutral skral.
  assert.deepEqual(A2.rewards.items, [{ item: 'charter_pass', qty: 1 }]);
  assert.deepEqual(A2.stages[0]!.objectives, [{ kind: 'kill', npc: 'skral', count: 4 }]);
  assert.equal(A2.turnIn, 'charter_margit');
  const B2 = QUESTS.get(B[1]!)!;
  assert.deepEqual(B2.stages[0]!.objectives, [{ kind: 'talk', actor: 'skral_weirward' }]);
  assert.equal(B2.turnIn, 'waykeeper_leif');
  // Every offer tree forbids the other side's two ids in both states and
  // reads no bare flag (E10: the fork stays open to a third corner).
  const shut = (side: string[]) => side.flatMap((q) => [`quest:${q}:active`, `quest:${q}:done`]);
  for (const [id, other] of [
    ['q_stakes_in_the_waist_offer', B],
    ['q_the_levy_posted_offer', B],
    ['q_the_old_gate_offer', A],
    ['q_the_green_road_offer', A],
  ] as const) {
    const tree = DIALOGUES.get(id);
    assert.ok(tree, `${id} is shipped`);
    assert.deepEqual(tree!.forbids, shut([...other]), `${id} forbids the other side by quest state`);
    assert.ok(!(tree!.forbids ?? []).includes('fen_side_taken'), `${id} never forbids the bare flag`);
  }
  // Nothing reads fen_side_taken as a side: Aldis reads it on a choice
  // and her node names neither corner; band 8 added Aske's coin, which
  // reads it as "in the book from the ford" (the road's rate) and
  // likewise names neither corner. Band 7's ledger foresaw exactly
  // that reader.
  const readers: string[] = [];
  for (const d of DIALOGUES.values()) {
    const reads = [
      ...(d.requires ?? []),
      ...d.nodes.flatMap((n) => (n.choices ?? []).flatMap((c) => c.requires ?? [])),
    ];
    if (reads.includes('fen_side_taken')) readers.push(d.id);
  }
  assert.deepEqual(readers.sort(), ['aldis_watch_heeded', 'aske_coin']);
  const book = DIALOGUES.get('aske_coin')!.nodes.find((n) => n.id === 'paid_book')!.text;
  assert.ok(!/causeway|sluice|dike|gate/i.test(book), 'the book names neither corner');
});

// ---- THE CONTESTED LANDS band 8: THE HUSK AND THE WARD LINE (plan §3.2,
// §3.3; band8/blockout.md §6). Two forks, each two opposed two-link
// chains on the four kinds plus THE FLAG OBJECTIVE; each offer tree
// forbids the OTHER side by quest state and its own declined flag
// (THE DOOR BACK), never the bare pair flag; every collect rides a
// final stage and is consumed at the turn-in.
test('CONTESTED LANDS band 8: the north pair is two chains, the pack or the squat', () => {
  const A = ['wool_count', 'the_fleece'];
  const B = ['the_towers_debt', 'the_order_pays'];
  for (const id of [...A, ...B]) assert.ok(QUESTS.has(id), `${id} is shipped`);
  assert.deepEqual(QUESTS.get(A[0]!)!.requires?.quests, ['the_first_road']);
  assert.deepEqual(QUESTS.get(B[0]!)!.requires?.quests, ['the_first_road']);
  assert.deepEqual(QUESTS.get(A[1]!)!.requires?.quests, [A[0]]);
  assert.deepEqual(QUESTS.get(B[1]!)!.requires?.quests, [B[0]]);
  const flagsOf = (id: string) => QUESTS.get(id)!.rewards.flags ?? [];
  assert.deepEqual(flagsOf('wool_count'), ['wool_counted']);
  assert.deepEqual(flagsOf('the_fleece'), ['wool_count_taken']);
  assert.deepEqual(flagsOf('the_towers_debt'), ['tower_debt_paid']);
  assert.deepEqual(flagsOf('the_order_pays'), ['wool_returned']);
  // A1: the count is a talk, the cull is THE FLAG OBJECTIVE reading the
  // veil den's own clearedFlag (retro-credited; the generic den flag
  // would credit a break of any den in the world).
  const a1 = QUESTS.get('wool_count')!;
  assert.deepEqual(a1.stages[0]!.objectives, [{ kind: 'talk', actor: 'waykeeper_torsten' }]);
  assert.deepEqual(a1.stages[1]!.objectives, [
    { kind: 'flag', flag: 'poi_veil_den_broken', label: 'Break the veil pack at its den' },
  ]);
  // A2: three pelts by quest drop only while the fleece is asked for.
  const a2 = QUESTS.get('the_fleece')!;
  assert.deepEqual(a2.stages[0]!.objectives, [{ kind: 'collect', item: 'wolf_pelt', count: 3 }]);
  assert.deepEqual(a2.questDrops, [
    { npc: 'wolf', item: 'wolf_pelt', chance: 0.6 },
    { npc: 'dire_wolf', item: 'wolf_pelt', chance: 1 },
  ]);
  assert.deepEqual(a2.rewards.items, [{ item: 'drover_fleece_cloak', qty: 1 }]);
  // B1: break the squat (the day rows), hold the apron by flag, and the
  // lamp comes back as a collect on the FINAL stage (THE TURN-IN
  // CONSUMES: the sworn node always gives one first, so nothing
  // pre-owned is ever taken).
  const b1 = QUESTS.get('the_towers_debt')!;
  assert.deepEqual(b1.stages.map((s) => s.id), ['break', 'hold', 'lamp']);
  assert.deepEqual(b1.stages[0]!.objectives, [
    { kind: 'kill', npc: 'gnoll', count: 4 },
    { kind: 'kill', npc: 'gnoll_champion', count: 1 },
  ]);
  assert.equal(b1.stages[1]!.objectives[0]!.kind, 'flag');
  assert.equal((b1.stages[1]!.objectives[0] as { flag: string }).flag, 'husk_held');
  assert.deepEqual(b1.stages[2]!.objectives, [{ kind: 'collect', item: 'lantern', count: 1 }]);
  assert.deepEqual(b1.rewards.items, [{ item: 'grey_wool', qty: 1 }]);
  // B2: the wool carried to Hale and consumed there.
  const b2 = QUESTS.get('the_order_pays')!;
  assert.equal(b2.turnIn, 'waykeeper_hale');
  assert.deepEqual(b2.stages[0]!.objectives, [{ kind: 'collect', item: 'grey_wool', count: 1 }]);
  // Opposition authored on every closing row, never crossed. A pays the
  // Charter alone (A's costs are Alder's yard and Torsten's nought).
  assert.deepEqual(a2.rewards.standing, [{ faction: 'fordgate', delta: 15 }]);
  assert.deepEqual(b1.rewards.standing, [
    { faction: 'waykeepers', delta: 15 },
    { faction: 'fordgate', delta: -10 },
  ]);
  assert.deepEqual(b2.rewards.standing, [
    { faction: 'waykeepers', delta: 10 },
    { faction: 'fordgate', delta: -15 },
  ]);
});

test('CONTESTED LANDS band 8: the north-west pair is two chains, the thread or the axe', () => {
  const A = ['keep_the_thread', 'the_stone_at_dusk'];
  const B = ['the_grey_root', 'the_full_tally'];
  for (const id of [...A, ...B]) assert.ok(QUESTS.has(id), `${id} is shipped`);
  assert.deepEqual(QUESTS.get(A[0]!)!.requires?.quests, ['the_first_road']);
  assert.deepEqual(QUESTS.get(B[0]!)!.requires?.quests, ['the_first_road']);
  assert.deepEqual(QUESTS.get(A[1]!)!.requires?.quests, [A[0]]);
  assert.deepEqual(QUESTS.get(B[1]!)!.requires?.quests, [B[0]]);
  const flagsOf = (id: string) => QUESTS.get(id)!.rewards.flags ?? [];
  // ward_line_taken stamps on BOTH closing links and names no side; the
  // side words are keep_thread_done and grey_root_done.
  assert.deepEqual(flagsOf('keep_the_thread'), ['keep_thread_done']);
  assert.deepEqual(flagsOf('the_stone_at_dusk'), ['ward_line_taken', 'moonglass_chip_held']);
  assert.deepEqual(flagsOf('the_grey_root'), ['ward_line_taken', 'grey_root_done']);
  assert.deepEqual(flagsOf('the_full_tally'), ['full_tally_posted']);
  // A1: three places teach the line (three flag objectives, three
  // triggers), then the four lengths go back to the stone.
  const a1 = QUESTS.get('keep_the_thread')!;
  assert.deepEqual(
    a1.stages[0]!.objectives.map((o) => (o as { flag?: string }).flag),
    ['grey_one', 'grey_two', 'grey_three'],
  );
  assert.deepEqual(a1.stages[1]!.objectives, [{ kind: 'collect', item: 'cut_thread', count: 4 }]);
  // A2: the stand is a flag, the word is the final talk (a talk credits
  // on address, so it can only ever be the last stage).
  const a2 = QUESTS.get('the_stone_at_dusk')!;
  assert.equal((a2.stages[0]!.objectives[0] as { flag: string }).flag, 'glade_stood');
  assert.deepEqual(a2.stages[1]!.objectives, [{ kind: 'talk', actor: 'even_sentinel' }]);
  assert.deepEqual(a2.rewards.items, [{ item: 'moonglass_chip', qty: 1 }]);
  // B1: the licence is Bodil's talk; the cord and the yew are the final
  // collect. B2: six more to Margit.
  const b1 = QUESTS.get('the_grey_root')!;
  assert.deepEqual(b1.stages[0]!.objectives, [{ kind: 'talk', actor: 'charter_bodil' }]);
  assert.deepEqual(b1.stages[1]!.objectives, [
    { kind: 'collect', item: 'log', count: 12 },
    { kind: 'collect', item: 'yew_log', count: 2 },
  ]);
  const b2 = QUESTS.get('the_full_tally')!;
  assert.equal(b2.turnIn, 'charter_margit');
  assert.deepEqual(b2.stages[0]!.objectives, [{ kind: 'collect', item: 'log', count: 6 }]);
  // Opposition authored both ways on the closing rows.
  assert.deepEqual(a2.rewards.standing, [
    { faction: 'evencourt', delta: 15 },
    { faction: 'fordgate', delta: -15 },
  ]);
  assert.deepEqual(b1.rewards.standing, [
    { faction: 'fordgate', delta: 15 },
    { faction: 'evencourt', delta: -20 },
  ]);
});

test('CONTESTED LANDS band 8: every offer shuts the other side by quest state and carries THE DOOR BACK', () => {
  const north = { A: ['wool_count', 'the_fleece'], B: ['the_towers_debt', 'the_order_pays'] };
  const west = { A: ['keep_the_thread', 'the_stone_at_dusk'], B: ['the_grey_root', 'the_full_tally'] };
  const shut = (side: string[]) => side.flatMap((q) => [`quest:${q}:active`, `quest:${q}:done`]);
  const declined: Record<string, string> = {
    wool_count: 'wool_count_declined',
    the_fleece: 'fleece_declined',
    the_towers_debt: 'towers_debt_declined',
    the_order_pays: 'order_pays_declined',
    keep_the_thread: 'keep_thread_declined',
    the_stone_at_dusk: 'stone_dusk_declined',
    the_grey_root: 'grey_root_declined',
    the_full_tally: 'full_tally_declined',
  };
  const pairFlags = ['wool_count_taken', 'tower_debt_paid', 'ward_line_taken'];
  for (const [pair, side, other] of [
    [north, 'A', north.B],
    [north, 'B', north.A],
    [west, 'A', west.B],
    [west, 'B', west.A],
  ] as const) {
    for (const q of pair[side]) {
      const offer = DIALOGUES.get(`q_${q}_offer`);
      assert.ok(offer, `q_${q}_offer is shipped`);
      const forbids = offer!.forbids ?? [];
      for (const f of shut([...other])) assert.ok(forbids.includes(f), `q_${q}_offer forbids ${f}`);
      assert.ok(forbids.includes(declined[q]!), `q_${q}_offer forbids its own declined flag`);
      for (const p of pairFlags) assert.ok(!forbids.includes(p), `q_${q}_offer never forbids ${p}`);
      // The declined flag is stamped on the offer's own refusal...
      const stamps = offer!.nodes.flatMap((n) => (n.choices ?? []).flatMap((c) => c.set ?? []));
      assert.ok(stamps.includes(declined[q]!), `q_${q}_offer stamps ${declined[q]}`);
      // ...and a door back stands: some tree bound to the giver, not the
      // offer, reaches a quest_offer node for this quest through a gate
      // on the declined flag AND availability (a hub choice, or a
      // re-offer tree where the giver keeps no hub).
      const giver = QUESTS.get(q)!.giver;
      const doors = [...DIALOGUES.values()].filter((d) => {
        if (d.id === `q_${q}_offer`) return false;
        if (!d.bindings?.some((b) => b.target === giver)) return false;
        const reoffer = d.nodes.filter((n) =>
          n.hooks?.some((h) => h.kind === 'quest_offer' && h.quest === q),
        );
        if (reoffer.length === 0) return false;
        const treeGate =
          (d.requires ?? []).includes(declined[q]!) &&
          (d.requires ?? []).includes(`quest:${q}:available`);
        const choiceGate = d.nodes.some((n) =>
          (n.choices ?? []).some(
            (c) =>
              reoffer.some((r) => r.id === c.next) &&
              (c.requires ?? []).includes(declined[q]!) &&
              (c.requires ?? []).includes(`quest:${q}:available`),
          ),
        );
        // Every re-offer node continues to a quest_accept for the same quest.
        const accepts = reoffer.every((r) =>
          (r.choices ?? []).some((c) =>
            d.nodes.some(
              (n) => n.id === c.next && n.hooks?.some((h) => h.kind === 'quest_accept' && h.quest === q),
            ),
          ),
        );
        return (treeGate || choiceGate) && accepts;
      });
      assert.ok(doors.length > 0, `${q}: THE DOOR BACK stands at ${giver}`);
    }
  }
});

test('CONTESTED LANDS band 8: THE FLAG OBJECTIVE validates, and every shipped one is stampable', () => {
  const base = {
    id: 'flag_probe',
    name: 'Flag Probe',
    giver: 'farmer_brammel',
    rewards: {},
  };
  const stage = (obj: Record<string, unknown>) => ({
    ...base,
    stages: [{ id: 'one', journal: 'A probe.', objectives: [obj] }],
  });
  assert.ok(validateQuest(stage({ kind: 'flag', flag: 'held_it', label: 'Hold it' })).ok);
  assert.ok(validateQuest(stage({ kind: 'flag', flag: 'trig:some_gate', label: 'Cross it' })).ok);
  for (const [obj, needle] of [
    [{ kind: 'flag', flag: 'world:calm', label: 'x' }, 'never world:'],
    [{ kind: 'flag', flag: 'quest:eggs_for_the_morning:done', label: 'x' }, 'never world:'],
    [{ kind: 'flag', flag: 'held_it' }, 'label'],
    [{ kind: 'flag', flag: 'held_it', label: 'x'.repeat(91) }, 'label'],
  ] as const) {
    const res = validateQuest(stage(obj as Record<string, unknown>));
    assert.ok(!res.ok, `refused: ${needle}`);
    assert.ok(res.errors.some((e) => e.includes(needle)), `${needle}: ${res.errors.join(' | ')}`);
  }
  // A flag objective is a thing the world already knows about you: the
  // flag must be stamped by a shipped trigger's setFlag, a dialogue's
  // set or flag hook, a quest reward, or a POI def's clearedFlag.
  const stampable = new Set<string>();
  for (const d of DIALOGUES.values()) {
    for (const n of d.nodes) {
      for (const h of n.hooks ?? []) if (h.kind === 'flag') stampable.add(h.flag);
      for (const c of n.choices ?? []) for (const f of c.set ?? []) stampable.add(f);
    }
  }
  for (const q of QUESTS.values()) for (const f of q.rewards?.flags ?? []) stampable.add(f);
  for (const t of TRIGGERS.values()) {
    if (t.setFlag) stampable.add(t.setFlag);
    if (t.once) stampable.add(`trig:${t.id}`);
  }
  for (const p of POI_DEFS.values()) if (p.clearedFlag) stampable.add(p.clearedFlag);
  const seen: string[] = [];
  for (const q of QUESTS.values()) {
    for (const s of q.stages) {
      for (const o of s.objectives) {
        if (o.kind !== 'flag') continue;
        seen.push(o.flag);
        assert.ok(stampable.has(o.flag), `${q.id}/${s.id}: flag '${o.flag}' is stamped nowhere`);
        assert.ok(o.label.length > 0 && o.label.length <= 90, `${q.id}/${s.id}: label is a wire name`);
      }
    }
  }
  assert.deepEqual(seen.sort(), [
    'glade_stood',
    'grey_one',
    'grey_three',
    'grey_two',
    'husk_held',
    'poi_veil_den_broken',
  ]);
});
