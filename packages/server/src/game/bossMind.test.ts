import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { NpcBossDef, NpcDef, NpcKitEntry } from '@arx/content';
import {
  BOSS_RECENCY_FOLD,
  bossCdMult,
  bossChainIndex,
  bossKitGateHolds,
  bossKnockMult,
  bossPhaseFor,
  bossRecencyFold,
  bossSpeedMult,
  bossStunTicks,
} from './bossMind.js';
import { GameServer } from './gameServer.js';

/**
 * THE DREAD CROWN's laws, pinned (docs/boss-system-plan.md): the
 * phase ladder is one-way and reads the wound; phase bands gate the
 * kit; the chain queues its combo-mate at fire and dies with a broken
 * breath; tempo scales the paid cooldown, never the ability; the CC
 * dials scale hard control and leave plain flesh untouched. Same
 * slate discipline as kitEngine.test.ts — private methods over a
 * hand-built slate, no db, no sockets, real content abilities.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  pickKitEntry: Fn;
  beginNpcCast: Fn;
  fireNpcCast: Fn;
  cancelNpcCast: Fn;
  tickBossCrown: Fn;
};

const LADDER: NpcBossDef = {
  phases: [
    { name: 'The Opening' },
    { hpBelow: 0.6, cdMult: 0.5, speedMult: 1.2 },
    { hpBelow: 0.25 },
  ],
};

interface FakeNpc {
  def: {
    id: string;
    name: string;
    level: number;
    pack?: string;
    kit?: NpcKitEntry[];
    boss?: NpcBossDef;
  };
  kitCds: number[];
  casting: { idx: number; ticksLeft: number; total: number } | null;
  targetEid: number | null;
  alertVelX: number;
  alertVelY: number;
  poseUntilTick: number;
  windupTicks: number;
  bossPhase?: number;
  bossChainIdx?: number | null;
  bossLastKitIdx?: number;
}

function mkBossNpc(kit: NpcKitEntry[], boss: NpcBossDef = LADDER, over: Partial<FakeNpc> = {}): FakeNpc {
  return {
    def: { id: 'test_crown', name: 'The Test Crown', level: 40, kit, boss },
    kitCds: kit.map(() => 0),
    casting: null,
    targetEid: 11,
    alertVelX: 0,
    alertVelY: 0,
    poseUntilTick: 0,
    windupTicks: 0,
    ...over,
  };
}

function slate(opts: { hp?: { hp: number; maxHp: number } } = {}) {
  const pos = { x: 10, y: 10, dir: 0 };
  const fx: Array<Record<string, unknown>> = [];
  const casts: Array<{ ab: { id: string } }> = [];
  const said: string[] = [];
  const metaSends: number[] = [];
  const self = {
    tickCount: 200,
    positions: { get: () => pos, must: () => pos },
    healths: new Map([[7, opts.hp ?? { hp: 100, maxHp: 100 }]]),
    world: { isSolid: () => false },
    broadcastFx: (f: Record<string, unknown>) => fx.push(f),
    broadcastMetaUpdate: (eid: number) => metaSends.push(eid),
    castAbility: (_eid: number, ab: { id: string }) => casts.push({ ab }),
    setNpcPose: () => {},
    rallyPack: () => {},
    sayAloud: (_eid: number, _from: string, text: string) => said.push(text),
    beginNpcCast: proto.beginNpcCast,
    fireNpcCast: proto.fireNpcCast,
    cancelNpcCast: proto.cancelNpcCast,
  };
  return { self, fx, casts, said, metaSends };
}

const GS: NpcKitEntry = { ability: 'ground_slam', cooldownTicks: 150 };
const HOWL: NpcKitEntry = { ability: 'rallying_howl', cooldownTicks: 150 };

// ------------------------------------------------------ the pure mind

test('the ladder reads the wound: rungs wake as hpBelow gates are crossed', () => {
  assert.equal(bossPhaseFor(LADDER, 1.0, 0), 0, 'fresh: the opening stance');
  assert.equal(bossPhaseFor(LADDER, 0.59, 0), 1, 'bloodied: the second rung');
  assert.equal(bossPhaseFor(LADDER, 0.2, 0), 2, 'a deep blow turns straight to the deepest rung');
});

test('the ladder is one-way: a mended boss keeps its fury', () => {
  assert.equal(bossPhaseFor(LADDER, 0.95, 2), 2);
});

test('phase bands gate the kit: wakes at phase, retires past phaseMax', () => {
  assert.ok(bossKitGateHolds({ ...GS }, 0), 'ungated: every phase');
  assert.ok(!bossKitGateHolds({ ...GS, phase: 1 }, 0), 'a late voice sleeps early');
  assert.ok(bossKitGateHolds({ ...GS, phase: 1 }, 2), '...and stays awake after');
  assert.ok(!bossKitGateHolds({ ...GS, phaseMax: 0 }, 1), 'an early voice the crown outgrows');
});

test('the unrepeated hand quarters the last-fired weight', () => {
  assert.equal(bossRecencyFold(4, 2, 2), 4 * BOSS_RECENCY_FOLD);
  assert.equal(bossRecencyFold(4, 1, 2), 4, 'other voices keep their full say');
});

test('the chain resolves its combo-mate by ability id', () => {
  const kit: NpcKitEntry[] = [{ ...GS, then: 'rallying_howl' }, HOWL];
  assert.equal(bossChainIndex(kit, 0), 1);
  assert.equal(bossChainIndex(kit, 1), -1, 'no link authored, no link queued');
});

test('tempo and stride read the standing rung', () => {
  assert.equal(bossCdMult(LADDER, 1), 0.5);
  assert.equal(bossCdMult(LADDER, 0), 1, 'unauthored rungs keep true time');
  assert.equal(bossSpeedMult(LADDER, 1), 1.2);
});

test('the stubborn crown: dials scale hard control, plain flesh untouched', () => {
  const flesh = { id: 'goblin' } as NpcDef;
  const crowned = { id: 'x', boss: LADDER } as NpcDef;
  const immovable = { id: 'y', boss: { ...LADDER, knockbackMult: 0, stunMult: 0 } } as NpcDef;
  assert.equal(bossKnockMult(flesh), 1);
  assert.equal(bossStunTicks(flesh, 12), 12);
  assert.equal(bossKnockMult(crowned), 0.25, 'the default: shoved a step, never juggled');
  assert.equal(bossStunTicks(crowned, 12), 6, 'the default: staggered a beat, never chained');
  assert.equal(bossKnockMult(immovable), 0);
  assert.equal(bossStunTicks(immovable, 12), 0, 'authored immunity holds');
});

// -------------------------------------------------- the engine seams

test('phase bands hold at the pick: a late voice cannot be chosen early', () => {
  const { self } = slate();
  const npc = mkBossNpc([{ ...GS, phase: 1 }]);
  assert.equal((proto.pickKitEntry as Fn).call(self, 7, npc, 3), -1, 'phase 0: it sleeps');
  npc.bossPhase = 1;
  assert.equal((proto.pickKitEntry as Fn).call(self, 7, npc, 3), 0, 'phase 1: it wakes');
});

test('the fire pays the tempo, remembers the hand, and queues the chain', () => {
  const { self } = slate();
  const npc = mkBossNpc([{ ...GS, then: 'rallying_howl' }, HOWL], LADDER, { bossPhase: 1 });
  npc.casting = { idx: 0, ticksLeft: 0, total: 10 };
  (proto.fireNpcCast as Fn).call(self, 7, npc, { x: 12, y: 10 });
  assert.equal(npc.kitCds[0], 75, 'the rung cdMult 0.5 halves the paid price');
  assert.equal(npc.bossLastKitIdx, 0, 'the hand remembers');
  assert.equal(npc.bossChainIdx, 1, 'the combo-mate is queued');
});

test('a broken breath breaks the combo', () => {
  const { self } = slate();
  const npc = mkBossNpc([{ ...GS, windupTicks: 20, then: 'rallying_howl' }, HOWL]);
  npc.bossChainIdx = 1;
  npc.casting = { idx: 0, ticksLeft: 12, total: 20 };
  (proto.cancelNpcCast as Fn).call(self, 7, npc);
  assert.equal(npc.bossChainIdx, null, 'the crown re-deals its hand');
});

test('the turning: a crossed gate barks, waives the entry, and winds it honestly', () => {
  const { self, said, metaSends, fx } = slate({ hp: { hp: 40, maxHp: 100 } });
  const boss: NpcBossDef = {
    phases: [
      {},
      { hpBelow: 0.6, bark: 'Enough of this.', entry: 'ground_slam' },
    ],
  };
  const npc = mkBossNpc([{ ...GS, windupTicks: 14 }], boss);
  npc.kitCds = [120]; // deep in cooldown — the turn waives it
  (proto.tickBossCrown as Fn).call(self, 7, npc, { x: 12, y: 10 });
  assert.equal(npc.bossPhase, 1, 'the crown turned');
  assert.deepEqual(said, ['Enough of this.'], 'the rung speaks aloud');
  assert.deepEqual(npc.casting, { idx: 0, ticksLeft: 14, total: 14 }, 'the free entry still winds — the turn is loud, never cheap');
  assert.deepEqual(metaSends, [7], 'the banner turns with the crown (the one meta door)');
  assert.ok(fx.some((f) => f.kind === 'summon'), 'the turn gets its moment in the world');
});

test('the turning is idempotent: a standing rung turns no ceremony twice', () => {
  const { self, said } = slate({ hp: { hp: 40, maxHp: 100 } });
  const boss: NpcBossDef = { phases: [{}, { hpBelow: 0.6, bark: 'Once.' }] };
  const npc = mkBossNpc([{ ...GS }], boss);
  (proto.tickBossCrown as Fn).call(self, 7, npc, { x: 12, y: 10 });
  (proto.tickBossCrown as Fn).call(self, 7, npc, { x: 12, y: 10 });
  assert.deepEqual(said, ['Once.']);
});
