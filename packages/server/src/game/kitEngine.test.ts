import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { NpcKitEntry } from '@arx/content';
import { abilityDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE KIT's server laws, pinned (docs/enemy-arts-plan.md): selection
 * honors every gate (cooldown, range band, hp fractions, minLevel);
 * a windup-0 entry fires on the spot (the old special behavior); a
 * true wind-up plants a casting record, holds the Cast stance, and
 * speaks the charge dialect; the fire pays the FULL cooldown and
 * stakes 'lead'/'self' points by their laws; a broken breath pays
 * only the retry cooldown and never casts. Same slate discipline as
 * castEngine.test.ts: private methods over a hand-built slate — no
 * db, no sockets, real content abilities.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  pickKitEntry: Fn;
  beginNpcCast: Fn;
  fireNpcCast: Fn;
  cancelNpcCast: Fn;
};

interface FakeNpc {
  def: {
    id: string;
    level: number;
    pack?: string;
    kit?: NpcKitEntry[];
  };
  kitCds: number[];
  casting: { idx: number; ticksLeft: number; total: number } | null;
  targetEid: number | null;
  alertVelX: number;
  alertVelY: number;
  poseUntilTick: number;
}

function mkNpc(kit: NpcKitEntry[], over: Partial<FakeNpc> = {}): FakeNpc {
  return {
    def: { id: 'test_foe', level: 20, kit },
    kitCds: kit.map(() => 0),
    casting: null,
    targetEid: 11,
    alertVelX: 0,
    alertVelY: 0,
    poseUntilTick: 0,
    ...over,
  };
}

function slate(opts: { hp?: { hp: number; maxHp: number } } = {}) {
  const pos = { plane: 'surface', x: 10, y: 10, dir: 0 };
  const fx: Array<Record<string, unknown>> = [];
  const casts: Array<{ ab: { id: string }; aim: number; pt?: { x: number; y: number } }> = [];
  const poses: number[] = [];
  const rallies: number[] = [];
  const self = {
    tickCount: 200,
    positions: { get: () => pos, must: () => pos },
    healths: new Map([[7, opts.hp ?? { hp: 100, maxHp: 100 }]]),
    world: { isSolid: () => false },
    worldOf: () => ({ isSolid: () => false }),
    broadcastFx: (f: Record<string, unknown>) => fx.push(f),
    castAbility: (_eid: number, ab: { id: string }, aim: number, ...rest: unknown[]) => {
      casts.push({ ab, aim, pt: rest[3] as { x: number; y: number } | undefined });
    },
    setNpcPose: (_eid: number, _npc: unknown, pose: number) => poses.push(pose),
    rallyPack: (eid: number) => rallies.push(eid),
    fireNpcCast: proto.fireNpcCast, // beginNpcCast chains into it for windup-0
  };
  return { self, pos, fx, casts, poses, rallies };
}

const pick = (self: unknown, npc: FakeNpc, dist: number): number =>
  (proto.pickKitEntry as Fn).call(self, 7, npc, dist) as number;

const GS = { ability: 'ground_slam', cooldownTicks: 150 };

test('selection honors cooldown, range band, hp gates, and minLevel', () => {
  const { self } = slate();
  // Ready and in band.
  assert.equal(pick(self, mkNpc([{ ...GS }]), 3), 0);
  // Cooling entry refuses.
  const cooling = mkNpc([{ ...GS }]);
  cooling.kitCds = [10];
  assert.equal(pick(self, cooling, 3), -1);
  // Range band.
  assert.equal(pick(self, mkNpc([{ ...GS, maxRange: 4.5 }]), 6), -1);
  assert.equal(pick(self, mkNpc([{ ...GS, minRange: 2 }]), 1), -1);
  // minLevel wakes with the def's level (scaled reissues learn).
  assert.equal(pick(self, mkNpc([{ ...GS, minLevel: 30 }]), 3), -1);
  const deep = mkNpc([{ ...GS, minLevel: 30 }]);
  deep.def.level = 40;
  assert.equal(pick(self, deep, 3), 0);
});

test('hp gates read the body: a desperation cast waits for the wound', () => {
  const hurt = slate({ hp: { hp: 30, maxHp: 100 } });
  const fresh = slate({ hp: { hp: 100, maxHp: 100 } });
  const kit: NpcKitEntry[] = [{ ...GS, hpBelow: 0.4 }];
  assert.equal(pick(hurt.self, mkNpc(kit), 3), 0, 'bloodied: the desperation voice wakes');
  assert.equal(pick(fresh.self, mkNpc(kit), 3), -1, 'fresh: it sleeps');
});

test('windup-0 fires on the spot and pays the FULL cooldown', () => {
  const { self, casts } = slate();
  const npc = mkNpc([{ ...GS }]);
  (proto.beginNpcCast as Fn).call(self, 7, npc, 0, { x: 12, y: 10 });
  assert.equal(casts.length, 1, 'the shape ran through the one door');
  assert.equal(casts[0]!.ab.id, 'ground_slam');
  assert.equal(npc.kitCds[0], 150, 'the full price, paid at fire');
  assert.equal(npc.casting, null, 'no breath left standing');
});

test('a true wind-up plants the breath, holds Cast, and speaks the charge', () => {
  const { self, casts, fx, poses } = slate();
  const npc = mkNpc([{ ...GS, windupTicks: 14 }]);
  (proto.beginNpcCast as Fn).call(self, 7, npc, 0, { x: 12, y: 10 });
  assert.equal(casts.length, 0, 'nothing fires at the press');
  assert.equal(npc.kitCds[0], 0, 'nothing is paid at the press');
  assert.deepEqual(npc.casting, { idx: 0, ticksLeft: 14, total: 14 });
  assert.ok(poses.length >= 1, 'the Cast stance holds');
  const charge = fx.find((f) => f.kind === 'charge');
  assert.ok(charge, 'the charge dialect speaks (ONE VOICE with the player engine)');
  assert.equal(charge!.id, 'ground_slam');
});

test('the fire stakes its point by aim law: target, self, and capped lead', () => {
  const { self, casts } = slate();
  // 'target' (default): the quarry's feet.
  const npc = mkNpc([{ ...GS, windupTicks: 10 }]);
  npc.casting = { idx: 0, ticksLeft: 0, total: 10 };
  (proto.fireNpcCast as Fn).call(self, 7, npc, { x: 14, y: 10 });
  assert.deepEqual(casts[0]!.pt, { x: 14, y: 10 });
  // 'self': under the caster.
  const npcSelf = mkNpc([{ ...GS, windupTicks: 10, aim: 'self' }]);
  npcSelf.casting = { idx: 0, ticksLeft: 0, total: 10 };
  (proto.fireNpcCast as Fn).call(self, 7, npcSelf, { x: 14, y: 10 });
  assert.deepEqual(casts[1]!.pt, { x: 10, y: 10 });
  // 'lead': the stride projects, capped at NPC_LEAD_CAP tiles.
  const npcLead = mkNpc([{ ...GS, windupTicks: 10, aim: 'lead' }]);
  npcLead.casting = { idx: 0, ticksLeft: 0, total: 10 };
  npcLead.alertVelX = 1; // a full tile per tick — an absurd sprint
  (proto.fireNpcCast as Fn).call(self, 7, npcLead, { x: 14, y: 10 });
  assert.deepEqual(casts[2]!.pt, { x: 17, y: 10 }, 'projection capped at 3 tiles');
});

test('an authored rally re-gathers the pack at fire; unauthored stays quiet', () => {
  const { self, rallies } = slate();
  const howl = { ability: 'rallying_howl', cooldownTicks: 150, rally: true };
  const npc = mkNpc([howl]);
  npc.def.pack = 'wolfkin';
  npc.casting = { idx: 0, ticksLeft: 0, total: 0 };
  (proto.fireNpcCast as Fn).call(self, 7, npc, { x: 12, y: 10 });
  assert.equal(rallies.length, 1, 'the howl carries');
  const quiet = mkNpc([{ ...GS }]);
  quiet.def.pack = 'wolfkin';
  quiet.casting = { idx: 0, ticksLeft: 0, total: 0 };
  (proto.fireNpcCast as Fn).call(self, 7, quiet, { x: 12, y: 10 });
  assert.equal(rallies.length, 1, 'a slam is not a cry');
});

test('a broken breath pays only the retry cooldown and never casts', () => {
  const { self, casts } = slate();
  const npc = mkNpc([{ ...GS, windupTicks: 20 }]);
  npc.casting = { idx: 0, ticksLeft: 12, total: 20 };
  (proto.cancelNpcCast as Fn).call(self, 7, npc);
  assert.equal(npc.casting, null);
  assert.equal(casts.length, 0, 'nothing fired');
  assert.equal(npc.kitCds[0], 50, 'the retry price, never the full one');
  assert.equal(npc.poseUntilTick, 200, 'the stance lets go at once');
});

test('the migrated specials still speak: content kits resolve through the door', () => {
  // The six shipped kit entries all resolve to real abilities with
  // cooldownTicks 0 (NPC pacing lives on the def — the standing law).
  for (const id of ['ground_slam', 'rallying_howl', 'ravening_cackle', 'hushing_screech']) {
    const ab = abilityDef(id);
    assert.ok(ab, `${id} resolves`);
    assert.equal(ab!.cooldownTicks, 0, `${id}: pacing on the def, never the ability`);
  }
});
