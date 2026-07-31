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
