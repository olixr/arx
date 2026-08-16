import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';

/**
 * THE READING EDGE (buildcraft Phase 2), pinned at the seam:
 *
 * - the ONE SEAM: every blow reaching an NPC pays the state bucket at
 *   the top of damageNpc — gear clauses (highest wins per state),
 *   the striking clause, distinct states multiplying, sunder's amp;
 * - a blow never feeds on the status it carries (fold before apply);
 * - THE CONSUME VERB spends every riding entry of the read state, and
 *   whiff-0 folds nothing and spends nothing;
 * - the pet's fang does not wear the keeper's armor (viaPet blows
 *   skip gear clauses);
 * - the drip pays the mark too (dotNpc), and the mirror seam in
 *   damagePlayer amplifies what mitigation let through.
 *
 * Hand-built slates over GameServer.prototype (the procDoors rig).
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  damageNpc: AnyFn;
  dotNpc: AnyFn;
  damagePlayer: AnyFn;
  creditMark: AnyFn;
  applyStatusToNpc: AnyFn;
};

const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

interface Entry {
  id: string;
  power: number;
  ticksLeft: number;
  sourceEid: number;
}

function seamSlate(hp = 100) {
  const npc = {
    def: { id: 'test_foe', radius: 0.4, damage: 2, maxHp: hp, level: 1, xpReward: 50, loot: [] },
    state: 'chase',
    windupTicks: 3,
    spawnIndex: 0,
  };
  const health = { hp, maxHp: hp };
  const statuses = new Map<number, Entry[]>();
  const attacker = {
    lastCombatAt: 0,
    characterId: -1,
    buffs: [] as unknown[],
    equipment: {},
    gear: { vsState: {} as Record<string, number> },
  };
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
    statuses,
    players: new Map<number, unknown>([[1, attacker]]),
    ecs: { isAlive: () => true },
    world: { isSolid: () => true },
    worldOf: () => ({ isSolid: () => true }),
    poiSpawnCells: new Map(),
    poiLive: new Map(),
    broadcastHit: () => {},
    broadcastFx: () => {},
    setNpcPose: () => {},
    updateChunkMembership: () => {},
    applyStatusToNpc: proto.applyStatusToNpc,
    petDefend: () => {},
    grantPetBattleXp: () => {},
    npcAtPeace: () => false,
    grantXp: () => {},
    killNpc: () => {},
    damageNpc: proto.damageNpc,
    creditMark: proto.creditMark,
  };
  return { s, npc, health, statuses, attacker };
}

test('a gear clause pays where the state rides, and only there', () => {
  const { s, health, statuses, attacker } = seamSlate();
  attacker.gear.vsState = { venom: 50 };
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', {});
  assert.equal(health.hp, 90, 'an unmarked body pays the plain number');
  statuses.set(9, [{ id: 'venom', power: 3, ticksLeft: 100, sourceEid: 1 }]);
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', {});
  assert.equal(health.hp, 75, 'the venomed body pays half again');
});

test('highest clause wins between gear and the striking clause — never both', () => {
  const { s, health, statuses, attacker } = seamSlate();
  attacker.gear.vsState = { venom: 50 };
  statuses.set(9, [{ id: 'venom', power: 3, ticksLeft: 100, sourceEid: 1 }]);
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', { vs: { status: 'venom', mult: 1.3 } });
  assert.equal(health.hp, 85, 'the weaker striking clause changes nothing');
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', { vs: { status: 'venom', mult: 2 } });
  assert.equal(health.hp, 65, 'the stronger striking clause takes the seat');
});

test('distinct states multiply — the assembled build collects on both', () => {
  const { s, health, statuses, attacker } = seamSlate();
  attacker.gear.vsState = { venom: 50, bleed: 20 };
  statuses.set(9, [
    { id: 'venom', power: 3, ticksLeft: 100, sourceEid: 1 },
    { id: 'bleed', power: 2, ticksLeft: 100, sourceEid: 1 },
  ]);
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', {});
  assert.equal(health.hp, 82, '10 × 1.5 × 1.2 = 18');
});

test('the sunder mark amplifies EVERY attacker, clauses or none', () => {
  const { s, health, statuses } = seamSlate();
  statuses.set(9, [{ id: 'sunder', power: 15, ticksLeft: 60, sourceEid: 7 }]);
  // Attacker 2 is nobody: no player entry, no gear, no clauses.
  call(proto.damageNpc, s, 9, 10, 2, 'onehand', {});
  assert.equal(health.hp, 100 - 12, 'the crack lets 15% more through (rounded)');
});

test('THE CONSUME VERB: the payoff spends the state, once', () => {
  const { s, health, statuses } = seamSlate();
  statuses.set(9, [
    { id: 'venom', power: 3, ticksLeft: 100, sourceEid: 1 },
    { id: 'venom', power: 5, ticksLeft: 80, sourceEid: 2 },
    { id: 'bleed', power: 2, ticksLeft: 100, sourceEid: 1 },
  ]);
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', { vs: { status: 'venom', mult: 1.5, consume: true } });
  assert.equal(health.hp, 85, 'the read paid');
  assert.deepEqual(
    statuses.get(9)!.map((e) => e.id),
    ['bleed'],
    'every venom entry was spent; the bleed rides on',
  );
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', { vs: { status: 'venom', mult: 1.5, consume: true } });
  assert.equal(health.hp, 75, 'the second read finds nothing to read');
});

test('whiff-0 folds nothing and spends nothing', () => {
  const { s, health, statuses } = seamSlate();
  statuses.set(9, [{ id: 'venom', power: 3, ticksLeft: 100, sourceEid: 1 }]);
  call(proto.damageNpc, s, 9, 0, 1, 'onehand', { vs: { status: 'venom', mult: 1.5, consume: true } });
  assert.equal(health.hp, 100);
  assert.equal(statuses.get(9)!.length, 1, 'the whiff spent no wound');
});

test('a blow never feeds on the status it carries', () => {
  const { s, health, statuses, attacker } = seamSlate();
  attacker.gear.vsState = { venom: 50 };
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', {
    status: { status: 'venom', power: 3, durationTicks: 100 },
  });
  assert.equal(health.hp, 90, 'the venom landed AFTER the fold');
  assert.ok(statuses.get(9)!.some((e) => e.id === 'venom'), 'and it does ride now');
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', {});
  assert.equal(health.hp, 75, 'the NEXT blow collects');
});

test("the pet's fang does not wear the keeper's armor", () => {
  const { s, health, statuses, attacker } = seamSlate();
  attacker.gear.vsState = { venom: 50 };
  statuses.set(9, [{ id: 'venom', power: 3, ticksLeft: 100, sourceEid: 1 }]);
  call(proto.damageNpc, s, 9, 10, 1, 'onehand', { viaPet: { petEid: 44 } });
  assert.equal(health.hp, 90, 'the bite pays plain');
});

test('the drip pays the mark: dotNpc rides the sunder amp', () => {
  const { s, health, statuses } = seamSlate();
  statuses.set(9, [{ id: 'sunder', power: 20, ticksLeft: 60, sourceEid: 7 }]);
  call(proto.dotNpc, s, 9, 10, 1, 'burn');
  assert.equal(health.hp, 100 - 12, 'the crack lets the burn bite deeper');
});

test('the mirror seam: a sundered player takes more of what mitigation passed', () => {
  const health = { hp: 100, maxHp: 100 };
  const player = {
    buffs: [] as unknown[],
    gear: { armor: 0 },
    perks: { stillArmor: 0, marchArmor: 0, shieldArm: 0, dotResistMult: 1 },
    stillTicks: 0,
    dialogue: null,
    session: null,
    lastBlockFxTick: 0,
    hidden: false,
  };
  const s = {
    tickCount: 50,
    players: new Map([[5, player]]),
    healths: new Map([[5, health]]),
    positions: new Map([[5, { plane: 'surface', x: 0, y: 0, dir: 0 }]]),
    statuses: new Map([[5, [{ id: 'sunder', power: 20, ticksLeft: 60, sourceEid: 7 }]]]),
    pets: new Map(),
    npcs: new Map(),
    revealPlayer: () => {},
    dialogueClose: () => {},
    petDefend: () => {},
    grantXp: () => {},
    standUp: () => {},
    cancelAction: () => {},
    dismount: () => {},
    setPose: () => {},
    damageNpc: () => {},
    effectiveLevel: () => 1,
    equippedShield: () => false,
    hasPassive: () => false,
    broadcastHit: () => {},
    broadcastFx: () => {},
    bodyMoment: () => {},
    lowHpMoment: () => {},
    applyStatusToPlayer: () => {},
    sendHp: () => {},
    damagePlayer: proto.damagePlayer,
  };
  call(proto.damagePlayer, s, 5, 10, { pierceArmor: true, sourceEid: 7 });
  assert.equal(health.hp, 100 - 12, 'the cracked guard let 20% more through');
});
