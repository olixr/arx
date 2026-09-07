import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { QuestDef } from '@arx/content';
import {
  acceptQuest,
  advanceStages,
  answerQuestFlag,
  creditQuest,
  questAvailable,
  questDropWanted,
  questReady,
  questWire,
  type QuestPlayerCtx,
  type QuestProgress,
} from './quests.js';
import { GameServer } from './gameServer.js';
import { countItem } from './inventory.js';

const HUNT: QuestDef = {
  id: 'hunt',
  name: 'The Hunt',
  giver: 'warden',
  stages: [
    { id: 'cull', journal: 'Cull.', objectives: [{ kind: 'kill', npc: 'goblin', count: 3 }] },
    {
      id: 'bring',
      journal: 'Bring.',
      objectives: [
        { kind: 'collect', item: 'fang', count: 2 },
        { kind: 'talk', actor: 'scout' },
      ],
    },
  ],
  questDrops: [{ npc: 'goblin', item: 'fang', chance: 1 }],
  rewards: { coins: 10 },
};

const ERRAND: QuestDef = {
  id: 'errand',
  name: 'The Errand',
  giver: 'warden',
  requires: { quests: ['hunt'], skills: [{ skill: 'combat', level: 5 }], flags: ['trusted'] },
  repeat: { cooldownHours: 2 },
  stages: [
    { id: 'walk', journal: 'Walk.', objectives: [{ kind: 'discover', place: 'zone:fort' }] },
  ],
  rewards: {},
};

function ctxOf(over: Partial<QuestPlayerCtx> = {}): QuestPlayerCtx {
  return {
    quests: new Map<string, QuestProgress>(),
    hasFlag: () => false,
    skillLevel: () => 1,
    hasDiscovered: () => false,
    countItem: () => 0,
    now: 1_000_000,
    ...over,
  };
}

test('availability: gates, active exclusion, cooldown clock', () => {
  assert.ok(questAvailable(HUNT, ctxOf()), 'ungated quest offers to anyone');
  assert.ok(!questAvailable(ERRAND, ctxOf()), 'gates hold');

  const done = new Map<string, QuestProgress>([
    ['hunt', { status: 'done', stage: 0, progress: [], acceptedAt: 1, completions: 1 }],
  ]);
  const strong = ctxOf({ quests: done, skillLevel: () => 5, hasFlag: (f) => f === 'trusted' });
  assert.ok(questAvailable(ERRAND, strong), 'all gates passed');

  const active = new Map<string, QuestProgress>([
    ['hunt', { status: 'active', stage: 0, progress: [0], acceptedAt: 1, completions: 0 }],
  ]);
  assert.ok(!questAvailable(HUNT, ctxOf({ quests: active })), 'underway is not offerable');

  const finished = new Map<string, QuestProgress>([
    ['hunt', { status: 'done', stage: 1, progress: [], acceptedAt: 1, completions: 1 }],
  ]);
  assert.ok(!questAvailable(HUNT, ctxOf({ quests: finished })), 'one-time stays done');

  const cooling = new Map<string, QuestProgress>([
    ['hunt', { status: 'done', stage: 0, progress: [], acceptedAt: 1, completions: 1 }],
    [
      'errand',
      { status: 'done', stage: 0, progress: [], acceptedAt: 1, completions: 2, cooldownUntil: 2_000_000 },
    ],
  ]);
  const cooled = ctxOf({ quests: cooling, skillLevel: () => 5, hasFlag: () => true });
  assert.ok(!questAvailable(ERRAND, cooled), 'cooldown holds while it runs');
  assert.ok(
    questAvailable(ERRAND, { ...cooled, now: 2_000_001 }),
    'the clock passing re-opens a repeatable',
  );
});

test('credit + advance: kill counters cross the stage line', () => {
  const ctx = ctxOf();
  const q = acceptQuest(HUNT, undefined, ctx);
  assert.equal(q.stage, 0);
  assert.ok(creditQuest(HUNT, q, 'kill', 'goblin'));
  assert.ok(!creditQuest(HUNT, q, 'kill', 'wolf'), 'wrong npc never credits');
  assert.equal(advanceStages(HUNT, q, ctx), 0, 'one of three is not a crossing');
  creditQuest(HUNT, q, 'kill', 'goblin');
  creditQuest(HUNT, q, 'kill', 'goblin');
  assert.ok(!creditQuest(HUNT, q, 'kill', 'goblin'), 'a met counter stops moving');
  assert.equal(advanceStages(HUNT, q, ctx), 1);
  assert.equal(q.stage, 1);
  assert.deepEqual(q.progress, [0, 0], 'fresh counters for the new stage');
});

test('the live-collect law: the pack answers, ready flips both ways', () => {
  let held = 0;
  const ctx = ctxOf({ countItem: () => held });
  const q = acceptQuest(HUNT, undefined, ctx);
  q.stage = 1;
  q.progress = [0, 0];
  creditQuest(HUNT, q, 'talk', 'scout');
  assert.ok(!questReady(HUNT, q, ctx), 'two fangs short');
  held = 2;
  assert.ok(questReady(HUNT, q, ctx), 'the pack satisfies the ask');
  held = 1;
  assert.ok(!questReady(HUNT, q, ctx), 'dropping one honestly regresses');
  const wire = questWire(HUNT, q, ctx, {
    itemName: (id) => id,
    npcName: (id) => id,
    actorName: (id) => id,
    placeName: (id) => id,
  });
  assert.equal(wire.status, 'active');
  assert.deepEqual(
    wire.objectives.map((o) => `${o.label} ${o.have}/${o.need}`),
    ['fang 1/2', 'scout 1/1'],
  );
});

test('the final stage never auto-completes', () => {
  const held = { n: 5 };
  const ctx = ctxOf({ countItem: () => held.n });
  const q = acceptQuest(HUNT, undefined, ctx);
  q.stage = 1;
  q.progress = [0, 1];
  assert.equal(advanceStages(HUNT, q, ctx), 0);
  assert.equal(q.status, 'active', 'only the turn-in closes a quest');
  assert.ok(questReady(HUNT, q, ctx));
});

test('discover: retro-credit at entry, live credit after', () => {
  const seen = new Set<string>(['zone:fort']);
  const ctx = ctxOf({ hasDiscovered: (p) => seen.has(p) });
  const q = acceptQuest(ERRAND, undefined, ctx);
  assert.deepEqual(q.progress, [1], 'a charted place counts at accept');
  assert.ok(questReady(ERRAND, q, ctx));

  const fresh = acceptQuest(ERRAND, undefined, ctxOf());
  assert.deepEqual(fresh.progress, [0]);
  assert.ok(creditQuest(ERRAND, fresh, 'discover', 'zone:fort'));
  assert.ok(!creditQuest(ERRAND, fresh, 'discover', 'zone:fort'), 'idempotent');
});

test('quest drops: wanted only while the ask is short', () => {
  let held = 0;
  const ctx = ctxOf({ countItem: () => held });
  const q = acceptQuest(HUNT, undefined, ctx);
  assert.ok(!questDropWanted(HUNT, q, 'fang', ctx), 'stage 0 asks for no fangs');
  q.stage = 1;
  q.progress = [0, 0];
  assert.ok(questDropWanted(HUNT, q, 'fang', ctx));
  held = 2;
  assert.ok(!questDropWanted(HUNT, q, 'fang', ctx), 'a satisfied ask never drops again');
  held = 0;
  q.status = 'done';
  assert.ok(!questDropWanted(HUNT, q, 'fang', ctx), 'a closed quest never drops');
});

test('the quest: answers', () => {
  const ctx = ctxOf();
  assert.ok(answerQuestFlag(HUNT, undefined, 'available', undefined, ctx));
  assert.ok(!answerQuestFlag(HUNT, undefined, 'active', undefined, ctx));
  const q = acceptQuest(HUNT, undefined, ctx);
  const quests = new Map([['hunt', q]]);
  const actCtx = ctxOf({ quests });
  assert.ok(answerQuestFlag(HUNT, q, 'active', undefined, actCtx));
  assert.ok(!answerQuestFlag(HUNT, q, 'available', undefined, actCtx));
  assert.ok(answerQuestFlag(HUNT, q, 'stage', 'cull', actCtx));
  assert.ok(!answerQuestFlag(HUNT, q, 'stage', 'bring', actCtx));
  q.status = 'done';
  q.completions = 1;
  assert.ok(answerQuestFlag(HUNT, q, 'done', undefined, actCtx));
  assert.ok(!answerQuestFlag(undefined, q, 'done', undefined, actCtx), 'unknown quest answers false');
});

test('re-accepting a repeatable keeps its history', () => {
  const ctx = ctxOf();
  const prior: QuestProgress = {
    status: 'done',
    stage: 0,
    progress: [],
    acceptedAt: 1,
    completions: 3,
    cooldownUntil: 500,
  };
  const again = acceptQuest(ERRAND, prior, ctx);
  assert.equal(again.completions, 3);
  assert.equal(again.status, 'active');
  assert.equal(again.cooldownUntil, undefined);
});

test('THE FINGER ON THE CHART: every ground rides the wire, best first', () => {
  const names = {
    itemName: (id: string) => id,
    npcName: (id: string) => id,
    actorName: (id: string) => id,
    placeName: (id: string) => id,
  };
  const grounds = [
    { x: 100, y: 100, r: 24 },
    { x: 300, y: 60, r: 40, sure: false as const, word: 'wolf runs' },
    { x: -80, y: 220, r: 36, sure: false as const },
  ];
  const locate = {
    actorHint: () => ({ x: 8, y: 8, r: 10 }),
    objectiveHints: () => grounds,
  };
  const q = acceptQuest(HUNT, undefined, ctxOf());
  const wire = questWire(HUNT, q, ctxOf(), names, locate);
  const kill = wire.objectives[0]!;
  assert.deepEqual(kill.hint, grounds[0], 'the compass keeps the best single');
  assert.deepEqual(kill.hints, grounds, 'the chart gets every ground');
  assert.equal(kill.hints![1]!.sure, false, 'rumors stay marked');
  assert.deepEqual(wire.turnInHint, { x: 8, y: 8, r: 10 });

  // One ground = the one hint carries alone; no hints list rides.
  const single = { ...locate, objectiveHints: () => [grounds[0]!] };
  const w2 = questWire(HUNT, q, ctxOf(), names, single);
  assert.deepEqual(w2.objectives[0]!.hint, grounds[0]);
  assert.equal(w2.objectives[0]!.hints, undefined);

  // Silence falls back to the authored stage mark, as it always did.
  const marked: QuestDef = {
    ...HUNT,
    id: 'marked',
    stages: [{ ...HUNT.stages[0]!, mark: { x: 50, y: 60 } }],
  };
  const silent = { ...locate, objectiveHints: () => [] };
  const w3 = questWire(marked, acceptQuest(marked, undefined, ctxOf()), ctxOf(), names, silent);
  assert.deepEqual(w3.objectives[0]!.hint, { x: 50, y: 60, r: 12 });
  assert.equal(w3.objectives[0]!.hints, undefined);
});

// ---------------------------------------------------------------------
// THE FLAG OBJECTIVE (contested lands, band 8): a flag objective is a
// thing the world already knows about you; the quest only asks you to
// go and have it be true. Retro-credited at stage entry, live-credited
// through the server's one flag choke, never on a synthetic namespace.
// ---------------------------------------------------------------------

const CULL: QuestDef = {
  id: 'wool_count',
  name: 'The Wool Count',
  giver: 'drover',
  stages: [
    { id: 'count', journal: 'Count.', objectives: [{ kind: 'talk', actor: 'sergeant' }] },
    {
      id: 'cull',
      journal: 'Cull.',
      objectives: [{ kind: 'flag', flag: 'poi_veil_den_broken', label: 'Break the veil pack at its den' }],
    },
    { id: 'word', journal: 'Word.', objectives: [{ kind: 'talk', actor: 'drover' }] },
  ],
  rewards: { flags: ['wool_count_taken'] },
};

test('THE FLAG OBJECTIVE: a flag already held retro-credits the moment its stage opens', () => {
  // The character who broke the den last week has culled it: the talk
  // stage crosses straight through the flag stage into the word.
  const held = ctxOf({ hasFlag: (f) => f === 'poi_veil_den_broken' });
  const q = acceptQuest(CULL, undefined, held);
  assert.ok(creditQuest(CULL, q, 'talk', 'sergeant'));
  assert.equal(advanceStages(CULL, q, held), 2, 'count crossed, cull retro-credited, word open');
  assert.equal(CULL.stages[q.stage]!.id, 'word');
  // A character who never broke it stops at the cull with nothing held.
  const cold = acceptQuest(CULL, undefined, ctxOf());
  creditQuest(CULL, cold, 'talk', 'sergeant');
  assert.equal(advanceStages(CULL, cold, ctxOf()), 1);
  assert.equal(CULL.stages[cold.stage]!.id, 'cull');
  assert.deepEqual(cold.progress, [0]);
});

test('THE FLAG OBJECTIVE: live credit keys on the flag alone, and the wire names the label', () => {
  const q: QuestProgress = { status: 'active', stage: 1, progress: [0], acceptedAt: 1, completions: 0 };
  assert.equal(creditQuest(CULL, q, 'flag', 'some_other_flag'), false, 'another flag is nobody');
  assert.equal(creditQuest(CULL, q, 'discover', 'poi_veil_den_broken'), false, 'the kind must match');
  assert.equal(creditQuest(CULL, q, 'flag', 'poi_veil_den_broken'), true);
  assert.deepEqual(q.progress, [1]);
  assert.equal(creditQuest(CULL, q, 'flag', 'poi_veil_den_broken'), false, 'need 1, already met');
  const names = { itemName: (s: string) => s, npcName: (s: string) => s, actorName: (s: string) => s, placeName: (s: string) => s };
  const wire = questWire(CULL, q, ctxOf(), names);
  assert.deepEqual(
    { kind: wire.objectives[0]!.kind, flag: wire.objectives[0]!.flag, label: wire.objectives[0]!.label, have: wire.objectives[0]!.have, need: wire.objectives[0]!.need },
    { kind: 'flag', flag: 'poi_veil_den_broken', label: 'Break the veil pack at its den', have: 1, need: 1 },
  );
});

/**
 * The ONE flag choke under test: setPlayerFlag on a minimal slate —
 * every stamp (a trigger, a choice, a def's clearedFlag, a reward)
 * lands here, so this is where the live credit is proven.
 */
function flagSlate(defs: QuestDef[]) {
  type Fn = (...a: unknown[]) => unknown;
  const proto = GameServer.prototype as unknown as Record<string, Fn>;
  const stored: Array<[string, number]> = [];
  const cleared: string[] = [];
  const pushes = { avail: 0, wire: 0, persist: 0 };
  const player = {
    characterId: 9,
    flags: new Map<string, number>(),
    quests: new Map<string, QuestProgress>(),
    skills: {},
    discoveries: new Map(),
    inventory: [],
    standing: new Map(),
    session: { sendJson: () => {}, playerEid: null },
  };
  const s = {
    accounts: {
      setFlag: (_c: number, f: string, v: number) => stored.push([f, v]),
      clearFlag: (_c: number, f: string) => cleared.push(f),
    },
    questDefs: new Map(defs.map((d) => [d.id, d])),
    actorDefs: new Map(),
    positions: new Map(),
    grantArt: () => {},
    grantXp: () => {},
    creditStanding: () => {},
    pushQuestAvail: () => pushes.avail++,
    pushQuestWire: () => pushes.wire++,
    persistQuest: () => pushes.persist++,
    setWaypoint: () => {},
    answerFactionGate: () => false,
    questDoneWire: () => ({}),
    questRewardsWire: () => ({}),
    setPlayerFlag: proto.setPlayerFlag,
    clearPlayerFlag: proto.clearPlayerFlag,
    creditQuestEvent: proto.creditQuestEvent,
    questCtx: proto.questCtx,
    questTurnIn: proto.questTurnIn,
  };
  return { s, player, stored, cleared, pushes, call: (fn: string, ...a: unknown[]) => (s as unknown as Record<string, Fn>)[fn]!.call(s, ...a) };
}

test('THE FLAG OBJECTIVE: the one flag choke credits live, and never on a synthetic namespace', () => {
  const { s, player, stored, pushes, call } = flagSlate([CULL]);
  player.quests.set('wool_count', { status: 'active', stage: 1, progress: [0], acceptedAt: 1, completions: 0 });
  // A world:/quest:/faction: flag is answered, never held: no store, no credit.
  call('setPlayerFlag', player, 'world:threat_near');
  call('setPlayerFlag', player, 'quest:wool_count:done');
  call('setPlayerFlag', player, 'faction:fordgate:known');
  assert.equal(stored.length, 0);
  assert.deepEqual(player.quests.get('wool_count')!.progress, [0]);
  // The den's clearedFlag lands through the same door a trigger's
  // setFlag would: the stage credits and walks on to the word.
  call('setPlayerFlag', player, 'poi_veil_den_broken');
  assert.deepEqual(stored, [['poi_veil_den_broken', 1]]);
  const q = player.quests.get('wool_count')!;
  assert.equal(CULL.stages[q.stage]!.id, 'word', 'the flag stage crossed live');
  assert.ok(pushes.persist >= 1 && pushes.wire >= 1, 'the journal heard it');
  // Re-stamping a held flag is a no-op at the choke (no double credit).
  call('setPlayerFlag', player, 'poi_veil_den_broken');
  assert.equal(stored.length, 1);
  void s;
});

test('THE FLAG OBJECTIVE: a turn-in reward flag credits another active quest', () => {
  // The order's pair: the_fleece rewards wool_count_taken; a second
  // quest waits on that very flag. The reward loop calls setPlayerFlag
  // for each rewards.flags entry, so the stamp is the credit.
  const WAIT: QuestDef = {
    id: 'the_relief',
    name: 'The Relief',
    giver: 'sergeant',
    stages: [
      { id: 'taken', journal: 'Taken.', objectives: [{ kind: 'flag', flag: 'wool_count_taken', label: 'See the count taken' }] },
      { id: 'word', journal: 'Word.', objectives: [{ kind: 'talk', actor: 'sergeant' }] },
    ],
    rewards: {},
  };
  const { player, call } = flagSlate([CULL, WAIT]);
  player.quests.set('the_relief', { status: 'active', stage: 0, progress: [0], acceptedAt: 1, completions: 0 });
  for (const f of CULL.rewards.flags ?? []) call('setPlayerFlag', player, f);
  assert.equal(WAIT.stages[player.quests.get('the_relief')!.stage]!.id, 'word');
});

/**
 * THE SPENT ASK (contested lands, band 9e; the audit's free repeat):
 * a repeatable quest's flag objective is cleared by the engine at the
 * turn-in. Left held, freshProgress would retro-credit the stage at
 * the next run's entry and the choke would swallow the fresh stamp
 * (a held flag stores nothing), so every run after the first walked
 * the ask for free. A one-shot quest keeps its deed.
 */
const CIRCLE: QuestDef = {
  id: 'circle',
  name: 'The Circle',
  giver: 'mother',
  repeat: { cooldownHours: 24 },
  stages: [
    { id: 'load', journal: 'Load.', objectives: [{ kind: 'talk', actor: 'carter' }] },
    { id: 'set', journal: 'Set.', objectives: [{ kind: 'flag', flag: 'gap_set', label: 'Set the gap' }] },
    { id: 'carry', journal: 'Carry.', objectives: [{ kind: 'collect', item: 'stone', count: 1 }] },
  ],
  rewards: { flags: ['carried'] },
};

test("THE SPENT ASK: a repeatable quest's flag objective is engine-cleared at the turn-in, so the next run asks again; a one-shot keeps its deed", () => {
  const { player, call, cleared } = flagSlate([CIRCLE, CULL]);
  const inv = player.inventory as Array<{ item: string; qty: number }>;
  // Day 1: accept, talk, set (the stamp credits live), carry, turn in.
  player.quests.set('circle', acceptQuest(CIRCLE, undefined, call('questCtx', player) as QuestPlayerCtx));
  call('creditQuestEvent', player, 'talk', 'carter');
  assert.equal(CIRCLE.stages[player.quests.get('circle')!.stage]!.id, 'set');
  call('setPlayerFlag', player, 'gap_set');
  assert.equal(CIRCLE.stages[player.quests.get('circle')!.stage]!.id, 'carry', 'the fresh stamp credits the set');
  inv.push({ item: 'stone', qty: 1 });
  assert.equal(call('questTurnIn', 1, player, 'circle'), true, 'turned in');
  assert.equal(countItem(inv as never, 'stone'), 0, 'the stone is consumed');
  assert.equal(player.flags.has('gap_set'), false, 'the ask is spent');
  assert.deepEqual(cleared, ['gap_set'], 'and cleared in the store');
  assert.equal(player.flags.get('carried'), 1, 'the reward flag stands');
  assert.equal(player.flags.get('quest:circle:done'), undefined, 'the synthetic namespace is never held');
  // Day 2 (the cooldown passed): the talk alone crosses ONE stage; the
  // set stage opens with no retro-credit and waits for a fresh stamp.
  const done = player.quests.get('circle')!;
  assert.equal(done.status, 'done');
  player.quests.set('circle', acceptQuest(CIRCLE, done, { ...(call('questCtx', player) as QuestPlayerCtx), now: (done.cooldownUntil ?? 0) + 1 }));
  call('creditQuestEvent', player, 'talk', 'carter');
  const q2 = player.quests.get('circle')!;
  assert.equal(CIRCLE.stages[q2.stage]!.id, 'set', 'the set stage is open, not crossed');
  assert.deepEqual(q2.progress, [0], 'no stone set today');
  call('setPlayerFlag', player, 'gap_set');
  assert.equal(CIRCLE.stages[player.quests.get('circle')!.stage]!.id, 'carry', "today's stamp credits today's ask");
  // A one-shot quest's deed stands past its turn-in: the den stays broken.
  player.quests.set('wool_count', acceptQuest(CULL, undefined, call('questCtx', player) as QuestPlayerCtx));
  call('creditQuestEvent', player, 'talk', 'sergeant');
  call('setPlayerFlag', player, 'poi_veil_den_broken');
  call('creditQuestEvent', player, 'talk', 'drover');
  assert.equal(call('questTurnIn', 1, player, 'wool_count'), true);
  assert.equal(player.flags.get('poi_veil_den_broken'), 1, 'a one-shot keeps its flag');
  assert.deepEqual(cleared, ['gap_set'], 'nothing else cleared');
});
