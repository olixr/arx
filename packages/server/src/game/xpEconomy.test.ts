import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  xpMarkAllowance,
  XP_PER_DMG_SCHOOL,
  XP_PER_DMG_VITALITY,
  SNEAK_CASE_CAP_PER_LEVEL,
} from '@arx/shared';
import { GameServer } from './gameServer.js';

// The slate idiom: assemble a minimal `this` from real proto methods
// plus stubs, so the law under test runs the SHIPPED code path.
type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  damageNpc: AnyFn;
  dotNpc: AnyFn;
  creditMark: AnyFn;
  tickSneakXp: AnyFn;
  forEachNpcNear: AnyFn;
};
const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

function markSlate(hp: number, xpReward: number) {
  const grants: Array<[string, number]> = [];
  const npc = {
    def: { id: 'test_foe', radius: 0.4, damage: 2, maxHp: hp, level: 1, xpReward, loot: [] },
    state: 'chase',
    windupTicks: 3,
    spawnIndex: 0,
  };
  const health = { hp, maxHp: hp };
  const attacker = { lastCombatAt: 0, characterId: -1, buffs: [], equipment: {} };
  const s = {
    tickCount: 50,
    pets: new Map(),
    livestock: new Map(),
    npcs: new Map([[9, npc]]),
    healths: new Map([[9, health]]),
    positions: new Map([
      [9, { plane: 'surface', x: 5, y: 5, dir: 0 }],
      [1, { plane: 'surface', x: 4, y: 5, dir: 0 }],
    ]),
    actors: new Map(),
    statuses: new Map(),
    players: new Map<number, unknown>([[1, attacker]]),
    ecs: { isAlive: () => true },
    world: { isSolid: () => true },
    worldOf: () => ({ isSolid: () => true }),
    poiSpawnCells: new Map(),
    poiLive: new Map(),
    broadcastHit: () => {},
    setNpcPose: () => {},
    updateChunkMembership: () => {},
    applyStatusToNpc: () => {},
    petDefend: () => {},
    npcAtPeace: () => false,
    // THE HUNTER'S HEART: the wound winds a chasing body's grit clock
    // (long pull) — not this suite's law, a quiet clock here.
    npcRefillGrit: () => {},
    grantXp: (_e: unknown, _p: unknown, skill: string, amount: number) =>
      grants.push([skill, amount]),
    killNpc: () => {},
    damageNpc: proto.damageNpc,
    dotNpc: proto.dotNpc,
    creditMark: proto.creditMark,
  };
  return { s, npc, health, grants };
}

test("THE MARK'S WORTH: a sponge stops teaching at its own price", () => {
  // xpReward 10 prices an allowance of ceil(10 * 1.25 / 0.75) = 17
  // damage points, however much meat the body carries.
  const { s, health, grants } = markSlate(100, 10);
  assert.equal(xpMarkAllowance(10), 17);
  call(proto.damageNpc, s, 9, 8, 1, 'onehand', {});
  call(proto.damageNpc, s, 9, 8, 1, 'onehand', {});
  call(proto.damageNpc, s, 9, 8, 1, 'onehand', {});
  assert.deepEqual(grants, [
    ['onehand', Math.round(8 * XP_PER_DMG_SCHOOL)],
    ['vitality', 8 * XP_PER_DMG_VITALITY],
    ['onehand', Math.round(8 * XP_PER_DMG_SCHOOL)],
    ['vitality', 8 * XP_PER_DMG_VITALITY],
    ['onehand', Math.round(1 * XP_PER_DMG_SCHOOL)],
    ['vitality', 1 * XP_PER_DMG_VITALITY],
  ]);
  // Damage always lands in full — only the lesson has a bottom.
  assert.equal(health.hp, 100 - 24);
});

test('each attacker draws their own budget from the same body', () => {
  const { s, grants } = markSlate(100, 10);
  (s.players as Map<number, unknown>).set(
    2,
    { lastCombatAt: 0, characterId: -1, buffs: [], equipment: {} },
  );
  (s.positions as Map<number, unknown>).set(2, { x: 6, y: 5, dir: 0 });
  call(proto.damageNpc, s, 9, 5, 1, 'onehand', {});
  call(proto.damageNpc, s, 9, 5, 2, 'archery', {});
  assert.deepEqual(grants, [
    ['onehand', Math.round(5 * XP_PER_DMG_SCHOOL)],
    ['vitality', 5 * XP_PER_DMG_VITALITY],
    ['archery', Math.round(5 * XP_PER_DMG_SCHOOL)],
    ['vitality', 5 * XP_PER_DMG_VITALITY],
  ]);
});

test('the drip draws the same budget as the blow that set it', () => {
  const { s, grants } = markSlate(100, 10);
  call(proto.damageNpc, s, 9, 15, 1, 'onehand', {}); // 15 of 17 spent
  grants.length = 0;
  call(proto.dotNpc, s, 9, 3, 1, 'burn'); // 2 points left in the budget
  assert.deepEqual(grants, [['arx', 1]]); // round(2 * 0.5): the drip's half rate
  call(proto.dotNpc, s, 9, 3, 1, 'burn'); // budget dry: burns, teaches nothing
  assert.deepEqual(grants, [['arx', 1]]);
});

function sneakSlate(npcLevel: number) {
  const grants: number[] = [];
  const player = { sneaking: true, session: {}, sneakMoveAccum: 1 };
  const npc = {
    def: { aggroRange: 6, damage: 2, level: npcLevel },
    state: 'idle',
    targetEid: null,
  };
  const s = {
    tickCount: 19, // (19 + eid 1) % SNEAK_XP_PERIOD_TICKS === 0
    players: new Map([[1, player]]),
    npcs: new Map([[9, npc]]),
    positions: new Map([
      [1, { plane: 'surface', x: 5, y: 5, dir: 0 }],
      [9, { plane: 'surface', x: 5, y: 5, dir: 0 }],
    ]),
    grantXp: (_e: unknown, _p: unknown, _skill: string, amount: number) => grants.push(amount),
    chunks: new Map([['surface|0,0', new Set([9])]]),
    forEachNpcNear: proto.forEachNpcNear,
    tickSneakXp: proto.tickSneakXp,
  };
  return { s, player, npc, grants };
}

test('THE CASED CAMP: an unaware body is a lesson with a bottom', () => {
  const { s, player, npc, grants } = sneakSlate(10);
  const cap = 10 * SNEAK_CASE_CAP_PER_LEVEL;
  // Pulse until well past the budget; every pulse re-earns the stride.
  for (let i = 0; i < 40; i++) {
    player.sneakMoveAccum = 1;
    call(proto.tickSneakXp, s);
  }
  const total = grants.reduce((a, b) => a + b, 0);
  assert.equal(total, cap, 'the body pays exactly its budget, never more');
  assert.ok(grants.every((g) => g > 0), 'a dry budget grants nothing at all');
  // The bank lives on the BODY (world-state): a fresh body pays anew.
  const fresh = { def: { aggroRange: 6, damage: 2, level: 10 }, state: 'idle', targetEid: null };
  (s.npcs as Map<number, unknown>).set(9, fresh);
  player.sneakMoveAccum = 1;
  call(proto.tickSneakXp, s);
  assert.ok(grants.reduce((a, b) => a + b, 0) > total, 'the camp beyond still teaches');
  void npc;
});
