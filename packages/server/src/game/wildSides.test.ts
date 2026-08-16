import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUTHORED_STANCES,
  replaceStances,
  stancePairKey,
  type StancesDef,
} from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE WILD TAKES SIDES (docs/npc-hostility-plan.md) — the NPC-vs-NPC
 * seams exercised on minimal fake hosts (the enforce.test rig
 * pattern): the aggro door's kin/drover guards, the chase whitelist's
 * NPC branch, the strike dispatcher's NPC branch, and the second-eye
 * perception scan that makes the watch answer the worg at the gate.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  npcAggro: AnyFn;
  cancelNpcCast: AnyFn;
  resetBossEngagement: AnyFn;
  npcRefillGrit: AnyFn;
  npcTemper: AnyFn;
  npcFactionOf: AnyFn;
  npcEnforcerFid: AnyFn;
  npcTribeOf: AnyFn;
  npcStanceRangeVs: AnyFn;
  npcPerceiveNpcs: AnyFn;
  npcTargetPos: AnyFn;
  npcStrike: AnyFn;
  playerBandWith: AnyFn;
};

function fakeNpc(
  defId: string,
  opts: { aggroRange?: number; tribe?: string; damage?: number } = {},
): Record<string, unknown> {
  return {
    state: 'idle',
    targetEid: null,
    def: {
      id: defId,
      pack: undefined,
      aggroRange: opts.aggroRange ?? 5,
      level: 10,
      attackStatus: undefined,
      damage: opts.damage ?? 2,
    },
    tribe: opts.tribe,
    navBest: 0,
    navStuck: 0,
    navRefX: 0,
    navRefY: 0,
    steer: { side: 0, ticks: 0 },
    nav: null,
    progressLane: null,
    nextRepathTick: 0,
    losUntilTick: 0,
    alert: 0,
    alertEid: null,
    alertVelX: 0,
    alertVelY: 0,
    alertSeenTick: 0,
    alertX: 0,
    alertY: 0,
    huntWps: null,
    huntIdx: 0,
    huntWaitUntilTick: 0,
    standTicks: 0,
  };
}

/** A slate whose npc roster the proto methods can walk for real. */
function slate(): Record<string, unknown> {
  const s: Record<string, unknown> = {
    tickCount: 100,
    players: new Map(),
    positions: new Map(),
    pets: new Map(),
    livestock: new Map(),
    npcs: new Map(),
    healths: new Map(),
    actors: new Map(),
    summons: new Map(),
    npcAggro: proto.npcAggro,
    cancelNpcCast: proto.cancelNpcCast,
    // THE HUNTER'S HEART: the door and the strike wind the grit clock.
    npcRefillGrit: proto.npcRefillGrit,
    npcTemper: proto.npcTemper,
    resetBossEngagement: proto.resetBossEngagement,
    npcFactionOf: proto.npcFactionOf,
    npcEnforcerFid: proto.npcEnforcerFid,
    npcTribeOf: proto.npcTribeOf,
    npcStanceRangeVs: proto.npcStanceRangeVs,
    npcTargetPos: proto.npcTargetPos,
    playerBandWith: proto.playerBandWith,
    worldOf: () => ({ isSolid: () => false }),
    // The chunk index has its own coverage — the rig walks the roster.
    forEachNpcNear(
      this: { npcs: Map<number, unknown>; positions: Map<number, { x: number; y: number }> },
      _plane: number,
      _x: number,
      _y: number,
      _r: number,
      fn: (eid: number, npc: unknown, pos: { x: number; y: number }) => boolean | void,
    ): void {
      for (const [eid, npc] of this.npcs) {
        const pos = this.positions.get(eid);
        if (pos && fn(eid, npc, pos) === true) return;
      }
    },
  };
  return s;
}

function addBody(
  s: Record<string, unknown>,
  eid: number,
  npc: Record<string, unknown>,
  x: number,
  y: number,
  opts: { actorSlug?: string; hp?: number; protection?: string } = {},
): void {
  (s.npcs as Map<number, unknown>).set(eid, npc);
  (s.positions as Map<number, unknown>).set(eid, { x, y, dir: 0, plane: 0 });
  (s.healths as Map<number, unknown>).set(eid, { hp: opts.hp ?? 10, maxHp: 10 });
  if (opts.actorSlug) {
    (s.actors as Map<number, unknown>).set(eid, {
      actor: { id: opts.actorSlug, protection: opts.protection },
    });
  }
}

const aggro = (
  s: Record<string, unknown>,
  eid: number,
  npc: Record<string, unknown>,
  targetEid: number,
  opts?: { force?: boolean },
): void => {
  (proto.npcAggro as (...a: unknown[]) => void).call(s, eid, npc, targetEid, opts ?? {});
};

test('KIN PEACE AT THE DOOR: a tribe never opens on its own, a blow forces', () => {
  const s = slate();
  const a = fakeNpc('goblin');
  const b = fakeNpc('goblin_thrower');
  addBody(s, 1, a, 5, 5);
  addBody(s, 2, b, 6, 5);
  aggro(s, 1, a, 2);
  assert.equal(a.state, 'idle', 'goblin and thrower share the menace tribe');
  aggro(s, 1, a, 2, { force: true });
  assert.equal(a.state, 'chase', 'a wound outranks kinship');
});

test('the placement banner splits kin: rival camps CAN open on each other', () => {
  const s = slate();
  const a = fakeNpc('goblin', { tribe: 'goblin_redfang' });
  const b = fakeNpc('goblin', { tribe: 'goblin_mosstooth' });
  addBody(s, 1, a, 5, 5);
  addBody(s, 2, b, 6, 5);
  aggro(s, 1, a, 2);
  assert.equal(a.state, 'chase', 'different banners, no kin peace');
});

test('THE DROVER\'S PEACE and THE QUIET SHADOW hold for NPC-shaped targets', () => {
  const s = slate();
  const wolf = fakeNpc('wolf');
  const ewe = fakeNpc('sheep');
  addBody(s, 1, wolf, 5, 5);
  addBody(s, 2, ewe, 6, 5);
  (s.livestock as Map<number, unknown>).set(2, {});
  aggro(s, 1, wolf, 2);
  assert.equal(wolf.state, 'idle', 'a kept yard animal is nobody\'s quarry');
  (s.livestock as Map<number, unknown>).delete(2);
  (s.pets as Map<number, unknown>).set(2, {});
  aggro(s, 1, wolf, 2);
  assert.equal(wolf.state, 'idle', 'a companion is never unforced quarry');
});

test('npcTargetPos: an NPC quarry is chaseable while alive, gone when dead', () => {
  const s = slate();
  const stag = fakeNpc('stag');
  addBody(s, 2, stag, 8, 5);
  const at = (proto.npcTargetPos as (...a: unknown[]) => unknown).call(s, 2, 0);
  assert.ok(at !== null, 'a live body on the plane is a chaseable quarry');
  (s.healths as Map<number, unknown>).set(2, { hp: 0, maxHp: 10 });
  const gone = (proto.npcTargetPos as (...a: unknown[]) => unknown).call(s, 2, 0);
  assert.equal(gone, null, 'the dead are gone to the chase');
});

test('npcStrike routes an NPC quarry through the one damage door', () => {
  const s = slate();
  const wolf = fakeNpc('wolf');
  const stag = fakeNpc('stag');
  addBody(s, 1, wolf, 5, 5);
  addBody(s, 2, stag, 6, 5);
  const hits: Array<{ eid: number; dmg: number; attacker: number }> = [];
  s.damageNpc = (eid: number, dmg: number, attacker: number) => {
    hits.push({ eid, dmg, attacker });
  };
  s.damageSummon = () => {
    assert.fail('an NPC quarry must never fall through to the summon rail');
  };
  (proto.npcStrike as (...a: unknown[]) => void).call(s, 1, wolf, 2, 3);
  assert.deepEqual(hits, [{ eid: 2, dmg: 3, attacker: 1 }]);
});

test('THE SECOND EYE: the watch charges the worg at the gate', () => {
  const s = slate();
  const guard = fakeNpc('actor:castle_guard', { aggroRange: 0 });
  const worg = fakeNpc('worg');
  addBody(s, 1, guard, 5, 5, { actorSlug: 'castle_guard' });
  addBody(s, 2, worg, 10, 5);
  (proto.npcPerceiveNpcs as (...a: unknown[]) => void).call(
    s,
    1,
    guard,
    (s.positions as Map<number, { x: number; y: number; dir: number; plane: number }>).get(1),
  );
  assert.equal(guard.state, 'chase', 'the watch answers the menace');
  assert.equal(guard.targetEid, 2);
});

test('THE SECOND EYE is one-way: the worg does not besiege the gate', () => {
  const s = slate();
  const worg = fakeNpc('worg');
  const guard = fakeNpc('actor:castle_guard', { aggroRange: 0 });
  addBody(s, 1, worg, 5, 5);
  addBody(s, 2, guard, 10, 5, { actorSlug: 'castle_guard' });
  (proto.npcPerceiveNpcs as (...a: unknown[]) => void).call(
    s,
    1,
    worg,
    (s.positions as Map<number, { x: number; y: number; dir: number; plane: number }>).get(1),
  );
  assert.equal(worg.state, 'idle', 'menace holds unless struck (or hunting prey)');
});

test('THE HUNT: a predator opens on a grazer inside the feud circle only', () => {
  const s = slate();
  const wolf = fakeNpc('wolf');
  const stagFar = fakeNpc('stag');
  const stagNear = fakeNpc('stag');
  addBody(s, 1, wolf, 5, 5);
  addBody(s, 2, stagFar, 20, 5);
  addBody(s, 3, stagNear, 9, 5);
  (proto.npcPerceiveNpcs as (...a: unknown[]) => void).call(
    s,
    1,
    wolf,
    (s.positions as Map<number, { x: number; y: number; dir: number; plane: number }>).get(1),
  );
  assert.equal(wolf.state, 'chase', 'the near stag is inside the hunt circle');
  assert.equal(wolf.targetEid, 3, 'nearest hostile wins');
});

test('THE SECOND EYE ignores the grocer, the hen, and the companion', () => {
  const s = slate();
  const guard = fakeNpc('actor:castle_guard', { aggroRange: 0 });
  const hen = fakeNpc('chicken', { aggroRange: 0 });
  const petWolf = fakeNpc('wolf');
  addBody(s, 1, guard, 5, 5, { actorSlug: 'castle_guard' });
  addBody(s, 2, hen, 6, 5);
  addBody(s, 3, petWolf, 7, 5);
  (s.pets as Map<number, unknown>).set(3, {});
  (proto.npcPerceiveNpcs as (...a: unknown[]) => void).call(
    s,
    1,
    guard,
    (s.positions as Map<number, { x: number; y: number; dir: number; plane: number }>).get(1),
  );
  assert.equal(guard.state, 'idle', 'wildfolk and companions draw no steel');
});

test('a wall is a peace that holds: the ray refuses the blocked feud', () => {
  const s = slate();
  s.worldOf = () => ({ isSolid: () => true });
  const guard = fakeNpc('actor:castle_guard', { aggroRange: 0 });
  const worg = fakeNpc('worg');
  addBody(s, 1, guard, 5.5, 5.5, { actorSlug: 'castle_guard' });
  addBody(s, 2, worg, 10.5, 5.5);
  (proto.npcPerceiveNpcs as (...a: unknown[]) => void).call(
    s,
    1,
    guard,
    (s.positions as Map<number, { x: number; y: number; dir: number; plane: number }>).get(1),
  );
  assert.equal(guard.state, 'idle', 'no line, no fight');
});

test('THE TOOTHLESS NEVER CHARGE: a 0-damage body opens no feud', () => {
  const s = slate();
  const wolf = fakeNpc('wolf', { damage: 0 });
  const stag = fakeNpc('stag');
  addBody(s, 1, wolf, 5, 5);
  addBody(s, 2, stag, 8, 5);
  (proto.npcPerceiveNpcs as (...a: unknown[]) => void).call(
    s,
    1,
    wolf,
    (s.positions as Map<number, { x: number; y: number; dir: number; plane: number }>).get(1),
  );
  assert.equal(wolf.state, 'idle', 'no teeth, no hunt — retaliation still rides force');
});

test('THE UNKILLABLE ARE NOT QUARRY: the scanner skips warded bodies', () => {
  const s = slate();
  const guard = fakeNpc('actor:castle_guard', { aggroRange: 0 });
  const tollGuard = fakeNpc('actor:company_toll_guard', { aggroRange: 0 });
  addBody(s, 1, guard, 5, 5, { actorSlug: 'castle_guard' });
  addBody(s, 2, tollGuard, 10, 5, {
    actorSlug: 'company_toll_guard',
    protection: 'invulnerable',
  });
  (proto.npcPerceiveNpcs as (...a: unknown[]) => void).call(
    s,
    1,
    guard,
    (s.positions as Map<number, { x: number; y: number; dir: number; plane: number }>).get(1),
  );
  assert.equal(guard.state, 'idle', 'two wards never lock — the fight has no possible end');
});

test('AN ALLY ROW holds the door: unforced aggro on a sworn friend is refused', () => {
  const doc = JSON.parse(JSON.stringify(AUTHORED_STANCES)) as StancesDef;
  doc.matrix[stancePairKey('kennels', 'yard_dogs')] = { stance: 'ally' };
  replaceStances(doc);
  try {
    const s = slate();
    const a = fakeNpc('goblin', { tribe: 'kennels' });
    const b = fakeNpc('goblin', { tribe: 'yard_dogs' });
    addBody(s, 1, a, 5, 5);
    addBody(s, 2, b, 6, 5);
    aggro(s, 1, a, 2);
    assert.equal(a.state, 'idle', 'sworn allies never open on each other');
    aggro(s, 1, a, 2, { force: true });
    assert.equal(a.state, 'chase', 'a blow still forces');
  } finally {
    replaceStances(JSON.parse(JSON.stringify(AUTHORED_STANCES)) as StancesDef);
  }
});

test('chase retention: the stance circle rides watchBase for NPC quarry', () => {
  const s = slate();
  const guard = fakeNpc('actor:castle_guard', { aggroRange: 0 });
  const worg = fakeNpc('worg');
  addBody(s, 1, guard, 5, 5, { actorSlug: 'castle_guard' });
  addBody(s, 2, worg, 10, 5);
  const r = (proto.npcStanceRangeVs as (...a: unknown[]) => number).call(s, 1, guard, 2);
  assert.ok(r >= 9, 'the watch keeps its feud circle in the chase');
  const rKin = (proto.npcStanceRangeVs as (...a: unknown[]) => number).call(s, 2, worg, 2);
  assert.equal(rKin, 0, 'no feud, no circle');
});
