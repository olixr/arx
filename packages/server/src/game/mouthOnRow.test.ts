import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NPCS, NPC_ACTORS, type DialogueDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * BAND 7 ENGINE (L5): THE MOUTH ON THE ROW. A named crowned garrison
 * body carries an actor slug in its spawn record; when it stands, the
 * server registers it in the actor table under that slug, so the
 * shipped talk path (interactNpc resolves a talk through actors.get)
 * opens the actor's bound tree on a bestiary body. The body never
 * OPENS a fight: perception skips it, the unforced aggro door refuses
 * everything but a rally from its crew or a landed blow; struck, it
 * fights as the crowned boss. Slate convention throughout.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

const MOUTH = 'company_broker';
const TREE: DialogueDef = {
  id: 'test_brede_bar',
  start: 'hub',
  nodes: [{ id: 'hub', text: 'The bar is the road and the road pays.' }],
  bindings: [{ kind: 'actor', target: MOUTH }],
};

/** Everything spawnNpc touches, over plain maps. */
function bodySlate() {
  let next = 40;
  const s = {
    ecs: { create: () => ++next },
    kinds: new Map<number, unknown>(),
    positions: new Map<number, { x: number; y: number; dir: number; plane: string }>(),
    poses: new Map<number, unknown>(),
    healths: new Map<number, { hp: number; maxHp: number }>(),
    npcs: new Map<number, Record<string, unknown>>(),
    actors: new Map<number, { actor: { id: string; name: string; title?: string; lines?: string[] }; spawnIndex: number }>(),
    actorDefs: new Map([[MOUTH, NPC_ACTORS.get(MOUTH)!]]),
    mouthWarned: new Set<string>(),
    tickCount: 100,
    updateChunkMembership: () => {},
    spawnNpc: proto.spawnNpc,
  };
  return s;
}

function standBrede(s: ReturnType<typeof bodySlate>, mouth: string | null = MOUTH): number {
  const def = NPCS.get('brigand_reaver')!;
  return (proto.spawnNpc as Fn).call(
    s,
    def as never,
    'surface' as never,
    10 as never,
    10 as never,
    0 as never,
    undefined as never,
    undefined as never,
    undefined as never,
    (mouth ?? undefined) as never,
  ) as number;
}

test('THE MOUTH ON THE ROW: the standing body registers under its actor slug, one entity with two comps', () => {
  const s = bodySlate();
  const eid = standBrede(s);
  const npc = s.npcs.get(eid)!;
  assert.equal(npc.mouth, MOUTH);
  assert.equal(npc.spawnIndex, 0, 'the body keeps its garrison seat');
  const face = s.actors.get(eid);
  assert.ok(face, 'the actor table holds the body');
  assert.equal(face!.actor.id, MOUTH);
  assert.equal(face!.spawnIndex, -1, 'the face has no actor spawn seat: respawn is the garrison seat’s');
  assert.equal(s.healths.get(eid)!.maxHp, NPCS.get('brigand_reaver')!.maxHp, 'the hit band is the bestiary’s');
  // A mouthless body registers no face; an unknown slug warns once and stands mute.
  const plain = standBrede(s, null);
  assert.equal(s.actors.has(plain), false);
  const mute = standBrede(s, 'nobody_home');
  assert.equal(s.actors.has(mute), false);
  assert.ok(s.mouthWarned.has('nobody_home'));
});

test('THE MOUTH ON THE ROW: talkable at rest through the shipped talk path, speaking its bound tree', () => {
  const s = bodySlate();
  const eid = standBrede(s);
  const sent: Array<Record<string, unknown>> = [];
  const entered: string[] = [];
  const player = {
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
    dialogue: null as unknown,
    sneaking: false,
    flags: new Map<string, number>(),
    standing: new Map<string, number>(),
    quests: new Map(),
  };
  const talk = Object.assign(s, {
    players: new Map([[77, player]]),
    dialoguesByActor: new Map([[MOUTH, [{ def: TREE, priority: 0 }]]]),
    dialogueHas: proto.dialogueHas,
    playerBandWith: proto.playerBandWith,
    questDefs: new Map(),
    voiceClips: new Map(),
    voiceBanks: new Map(),
    routines: new Map(),
    credited: [] as string[],
    creditQuestEvent: (_p: unknown, kind: string, id: string) => talk.credited.push(`${kind}:${id}`),
    dialogueEnterNode: (_e: number, _p: unknown, node: string) => entered.push(node),
    sayAloud: () => {},
  });
  s.positions.set(77, { x: 11, y: 10, dir: 0, plane: 'surface' });
  (proto.interactNpc as Fn).call(talk, 77 as never, eid as never);
  assert.deepEqual(talk.credited, [`talk:${MOUTH}`], 'the talk credits on address, as for any actor');
  const open = sent.find((m) => m.t === 'dlgopen');
  assert.ok(open, 'the cinematic frame opened');
  assert.equal(open!.eid, eid);
  assert.equal(open!.name, NPC_ACTORS.get(MOUTH)!.name);
  assert.deepEqual(entered, ['hub'], 'the bound tree speaks from its start node');
  assert.equal((player.dialogue as { def: DialogueDef }).def.id, TREE.id);
});

/** The unforced aggro door's slate around a standing mouth. */
function fightSlate() {
  const s = bodySlate();
  const eid = standBrede(s);
  const npc = s.npcs.get(eid)! as Record<string, unknown> & { state: string; targetEid: number | null };
  const player = { flags: new Map([['qst:the_first_road', 1]]), standing: new Map<string, number>() };
  const f = Object.assign(s, {
    pets: new Map(),
    companions: new Map(),
    livestock: new Map(),
    players: new Map([[77, player]]),
    poiSpawnCells: new Map(),
    poiLedger: new Map(),
    npcFactionOf: proto.npcFactionOf,
    npcEnforcerFid: proto.npcEnforcerFid,
    playerBandWith: proto.playerBandWith,
    npcTribeOf: proto.npcTribeOf,
    poiPassHolds: proto.poiPassHolds,
    npcAggro: proto.npcAggro,
    npcPerception: proto.npcPerception,
    npcPerceivePlayers: () => {
      throw new Error('the mouth opened its eye');
    },
    npcPerceiveNpcs: () => {
      throw new Error('the mouth opened its eye');
    },
    resetBossEngagement: () => {},
    npcRefillGrit: () => {},
    rallyPack: () => {},
    sayAloud: () => {},
    broadcastFx: () => {},
  });
  s.positions.set(77, { x: 11, y: 10, dir: 0, plane: 'surface' });
  return { s: f, eid, npc };
}

test('THE MOUTH ON THE ROW: it never initiates — no eye, and the unforced door refuses an unflagged walker in reach', () => {
  const { s, eid, npc } = fightSlate();
  assert.doesNotThrow(() =>
    (proto.npcPerception as Fn).call(s, eid as never, npc as never, s.positions.get(eid) as never),
  );
  (proto.npcAggro as Fn).call(s, eid as never, npc as never, 77 as never);
  assert.equal(npc.state, 'idle');
  assert.equal(npc.targetEid, null);
});

test('THE MOUTH ON THE ROW: a blow forces, and its crew’s rally reaches it', () => {
  const { s, eid, npc } = fightSlate();
  (proto.npcAggro as Fn).call(s, eid as never, npc as never, 77 as never, { force: true } as never);
  assert.equal(npc.state, 'chase');
  assert.equal(npc.targetEid, 77);
  const again = fightSlate();
  (proto.npcAggro as Fn).call(again.s, again.eid as never, again.npc as never, 77 as never, { rally: true } as never);
  assert.equal(again.npc.state, 'chase', 'the fight reached the crown through its crew');
});

test('THE MOUTH ON THE ROW: the crown flies its crew’s banner, and a fang may mark it', () => {
  const { s, eid, npc } = fightSlate();
  const tribe = (proto.npcTribeOf as Fn).call(s, eid as never, npc as never);
  const plain = bodySlate();
  const plainEid = standBrede(plain, null);
  const plainTribe = (proto.npcTribeOf as Fn).call(
    Object.assign(plain, { npcTribeOf: proto.npcTribeOf }),
    plainEid as never,
    plain.npcs.get(plainEid) as never,
  );
  assert.equal(tribe, plainTribe, 'the mouth changes no side in the stances matrix');
  const legal = (proto.petLegalMark as Fn).call(s, eid as never);
  assert.equal(legal, true);
});
