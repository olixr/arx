import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BURN_TICK_EVERY, XP_PER_DMG_SCHOOL, XP_PER_DMG_VITALITY } from '@arx/shared';
import { GameServer } from './gameServer.js';

/**
 * THE DEEPER SIGIL's door-side laws, pinned against the 2026-07 audit:
 *
 * - a targeted working (status/bolt) is skipped BEFORE arbitration
 *   when the moment carries no live foe — no chance roll, no icd
 *   stamped on an answer that could only no-op (procWakes untouched);
 * - DoT pulses arrive at the hurt door with their burner in hand;
 * - lowHp fires on the CROSSING read from prev-vs-new health, so any
 *   heal path re-arms it without knowing the working exists;
 * - a dying body takes no further wounds (kill-door re-entrancy);
 * - a working's damage earns no skill/vitality XP;
 * - basic projectiles fold the damage surge where the shaft lands;
 * - chain per-jump fx carry the `<action>:<procId>` id convention.
 *
 * All run on hand-built slates over GameServer.prototype (the
 * theft/poiWard rig pattern).
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  bodyMoment: AnyFn;
  offerProc: AnyFn;
  procState: AnyFn;
  lowHpMoment: AnyFn;
  damageNpc: AnyFn;
  tickStatuses: AnyFn;
  tickProjectiles: AnyFn;
  executeAdjust: AnyFn;
  runProc: AnyFn;
  npcsWithin: AnyFn;
};

const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

/** Run fn with a scripted Math.random. */
function withRolls<T>(rolls: number[], fn: () => T): T {
  const real = Math.random;
  let i = 0;
  Math.random = () => rolls[Math.min(i++, rolls.length - 1)]!;
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}

const targetedProc = {
  kind: 'proc' as const,
  id: 'backdraft_t',
  name: 'Backdraft',
  trigger: { on: 'hurt' as const, chance: 0.25 },
  action: { do: 'status' as const, status: 'burn' as const, power: 2, ticks: 60 },
  icd: 300,
};

test('a targeted hurt working with no foe in hand skips BEFORE the roll: no icd banked', () => {
  const runs: unknown[] = [];
  const player = { gear: { procs: [targetedProc] }, procs: new Map() };
  const s = {
    tickCount: 100,
    pets: new Map(), npcs: new Map(),
    bodyMoment: proto.bodyMoment,
    offerProc: proto.offerProc,
    procState: proto.procState,
    runProc: (..._a: unknown[]) => {
      runs.push(_a);
      return 0;
    },
  };
  // A roll of 0 would WIN the 25% chance — if arbitration were reached
  // at all, the icd would bank and the working would go deaf.
  withRolls([0], () => call(proto.bodyMoment, s, 1, player, 'hurt', { x: 0, y: 0 }));
  assert.equal(runs.length, 0, 'the working never fired');
  assert.equal(
    (player.procs.get('backdraft_t') as { restUntil: number } | undefined)?.restUntil ?? 0,
    0,
    'no rest was stamped: the working stays awake for the next real blow',
  );

  // The same moment WITH a live foe answers normally.
  s.npcs.set(9, { def: { radius: 0.4 } });
  withRolls([0], () => call(proto.bodyMoment, s, 1, player, 'hurt', { x: 0, y: 0, targetEid: 9 }));
  assert.equal(runs.length, 1, 'a live target lets the working answer');
  assert.equal(
    (player.procs.get('backdraft_t') as { restUntil: number }).restUntil,
    400,
    'and the rest banks as ever',
  );
});

test('DoT pulses reach the hurt door with the burner in hand', () => {
  const hits: Array<{ eid: unknown; dmg: unknown; opts: { sourceEid?: number; pierceArmor?: boolean } }> = [];
  const s = {
    statuses: new Map([
      [5, [{ id: 'burn', power: 3, ticksLeft: BURN_TICK_EVERY * 4 + 1, sourceEid: 42 }]],
    ]),
    pets: new Map(), npcs: new Map(),
    players: new Map([[5, { perks: { dotResistMult: 1 } }]]),
    damagePlayer: (eid: unknown, dmg: unknown, opts: { sourceEid?: number }) =>
      hits.push({ eid, dmg, opts: opts as { sourceEid?: number; pierceArmor?: boolean } }),
    tickStatuses: proto.tickStatuses,
  };
  call(proto.tickStatuses, s);
  assert.equal(hits.length, 1, 'the pulse landed');
  assert.equal(hits[0]!.opts.sourceEid, 42, 'the burner rides the pulse');
  assert.equal(hits[0]!.opts.pierceArmor, true, 'the wound is already inside the armor');
});

const wardProc = {
  kind: 'proc' as const,
  id: 'last_ward',
  name: 'Last Ward',
  trigger: { on: 'lowHp' as const, pct: 0.35 },
  action: { do: 'ward' as const, absorb: 10, ticks: 100 },
  icd: 100,
};

function lowHpSlate(hp: number) {
  const runs: unknown[][] = [];
  const health = { hp, maxHp: 100 };
  const player = { gear: { procs: [wardProc] }, procs: new Map() };
  const s = {
    tickCount: 1000,
    healths: new Map([[1, health]]),
    positions: new Map([[1, { x: 0, y: 0, dir: 0 }]]),
    procState: proto.procState,
    runProc: (...a: unknown[]) => {
      runs.push(a);
      return 0;
    },
    lowHpMoment: proto.lowHpMoment,
  };
  return { s, player, health, runs };
}

test('lowHp answers the crossing, once per dive', () => {
  const { s, player, health, runs } = lowHpSlate(30);
  // The wound carried us 60 → 30, across the 35 line.
  call(proto.lowHpMoment, s, 1, player, 60);
  assert.equal(runs.length, 1, 'the crossing fired the ward');
  // A second wound below the line is not a crossing.
  health.hp = 20;
  s.tickCount = 2000; // well past the rest, so only the crossing gates
  call(proto.lowHpMoment, s, 1, player, 30);
  assert.equal(runs.length, 1, 'no re-fire while still under the line');
});

test('lowHp re-arms through ANY heal path: the crossing is read from prev hp alone', () => {
  const { s, player, health, runs } = lowHpSlate(30);
  call(proto.lowHpMoment, s, 1, player, 60);
  assert.equal(runs.length, 1);
  // Food / drain / totem / lifesteal / regen: none of them call the
  // moment — they just move hp. The next burst crosses again.
  health.hp = 90;
  s.tickCount = 2000;
  health.hp = 20; // one burst blow, 90 → 20
  call(proto.lowHpMoment, s, 1, player, 90);
  assert.equal(runs.length, 2, 'the ward answered the second dive');
});

test('lowHp stays quiet through its rest and at zero hp', () => {
  const { s, player, health, runs } = lowHpSlate(30);
  call(proto.lowHpMoment, s, 1, player, 60);
  assert.equal(runs.length, 1);
  // Climb out and dive again INSIDE the rest: the crossing is unpaid.
  health.hp = 25;
  s.tickCount = 1050; // restUntil is 1100
  call(proto.lowHpMoment, s, 1, player, 80);
  assert.equal(runs.length, 1, 'resting workings never wake');
  // A killing blow is no crossing to answer.
  health.hp = 0;
  s.tickCount = 3000;
  call(proto.lowHpMoment, s, 1, player, 80);
  assert.equal(runs.length, 1, 'the dead are past warding');
});

function damageNpcSlate(hp: number) {
  const kills: unknown[][] = [];
  const grants: Array<[string, number]> = [];
  const npc = {
    def: { id: 'test_foe', radius: 0.4, damage: 2, maxHp: 20, level: 1, xpReward: 10, loot: [] },
    state: 'chase',
    windupTicks: 3,
    spawnIndex: 0,
  };
  const health = { hp, maxHp: 20 };
  const s = {
    tickCount: 50,
    pets: new Map(), npcs: new Map([[9, npc]]),
    healths: new Map([[9, health]]),
    positions: new Map([
      [9, { x: 5, y: 5, dir: 0 }],
      [1, { x: 4, y: 5, dir: 0 }],
    ]),
    actors: new Map(),
    statuses: new Map(),
    players: new Map<number, unknown>(),
    ecs: { isAlive: () => true },
    world: { isSolid: () => true },
    poiSpawnCells: new Map(),
    poiLive: new Map(),
    broadcastHit: () => {},
    setNpcPose: () => {},
    updateChunkMembership: () => {},
    applyStatusToNpc: () => {},
    petDefend: () => {},
    npcAtPeace: () => false,
    grantXp: (_e: unknown, _p: unknown, skill: string, amount: number) =>
      grants.push([skill, amount]),
    killNpc: (...a: unknown[]) => kills.push(a),
    damageNpc: proto.damageNpc,
    creditMark: proto.creditMark,
  };
  return { s, npc, health, kills, grants };
}

test('A DYING BODY TAKES NO FURTHER WOUNDS: no second killNpc can recurse', () => {
  // Mid-killNpc the victim still sits in npcs with hp <= 0 and the
  // entity alive — exactly this slate. A kill-woken nova striking it
  // must change nothing.
  const { s, health, kills } = damageNpcSlate(0);
  call(proto.damageNpc, s, 9, 5, 1, 'arx', {});
  assert.equal(health.hp, 0, 'the corpse-in-progress took no wound');
  assert.equal(kills.length, 0, 'no second death was dealt');
});

test('a live body still dies exactly once through the same door', () => {
  const { s, health, kills } = damageNpcSlate(20);
  call(proto.damageNpc, s, 9, 25, 1, 'arx', {});
  assert.ok(health.hp <= 0);
  assert.equal(kills.length, 1);
});

test("THE WORKING'S DAMAGE IS THE WORKING'S: fromProc earns no skill or vitality XP", () => {
  const { s, grants } = damageNpcSlate(20);
  const attacker = { lastCombatAt: 0, characterId: -1, buffs: [], equipment: {} };
  (s.players as Map<number, unknown>).set(1, attacker);
  call(proto.damageNpc, s, 9, 5, 1, 'shield', { fromProc: true });
  assert.deepEqual(grants, [], 'nova damage trained nothing');
  // The wielder's own blow still pays as ever (THE MARK'S WORTH:
  // xpReward 10 prices an allowance of 5 damage points — this
  // 5-damage blow credits in full).
  call(proto.damageNpc, s, 9, 5, 1, 'shield', {});
  assert.deepEqual(grants, [
    ['shield', 5 * XP_PER_DMG_SCHOOL],
    ['vitality', 5 * XP_PER_DMG_VITALITY],
  ]);
});

test('a live surge sharpens the basic shaft where it lands', () => {
  const dealt: number[] = [];
  const shooter = {
    gear: { critPct: 0 },
    buffs: [{ dmgMult: 1.5, critPct: 0, untilTick: 9999 }],
  };
  const positions = new Map<number, { x: number; y: number; dir: number }>([
    [100, { x: 5, y: 5, dir: 0 }],
    [9, { x: 5, y: 5, dir: 0 }],
  ]);
  const proj = {
    ownerEid: 1,
    style: 'archery',
    maxHit: 10,
    dirX: 1,
    dirY: 0,
    speed: 0,
    distLeft: 5,
    basic: true,
    spawnSeq: 0,
  };
  const s = {
    projectiles: new Map([[100, proj]]),
    positions: Object.assign(positions, {
      must: (id: number) => positions.get(id)!,
    }),
    players: new Map([[1, shooter]]),
    pets: new Map(), npcs: new Map([[9, { def: { radius: 0.4 } }]]),
    summons: new Map(),
    world: { isSolid: () => false, groundAt: () => undefined },
    executeAdjust: proto.executeAdjust,
    damageNpc: (_eid: unknown, dmg: number) => dealt.push(dmg),
    drainHeal: () => {},
    broadcastFx: () => {},
    removeFromChunks: () => {},
    updateChunkMembership: () => {},
    ecs: { destroy: () => {} },
    tickProjectiles: proto.tickProjectiles,
  };
  // Scripted rolls: no crit, then a max damage roll — deterministic.
  withRolls([0.99, 0.999], () => call(proto.tickProjectiles, s));
  // 10 folded by the 1.5 surge is 15; an unfolded shot tops out at 10.
  assert.deepEqual(dealt, [15], 'the surge was read at the landing');
});

test('chain per-jump fx carry the `<action>:<procId>` id, same as the closing broadcast', () => {
  const fx: Array<{ id?: string; x2?: number }> = [];
  const chainProc = {
    kind: 'proc' as const,
    id: 'zap',
    name: 'Zap',
    trigger: { on: 'hit' as const, chance: 0.1 },
    action: { do: 'chain' as const, damage: 4, jumps: 2 },
    icd: 100,
  };
  const positions = new Map([
    [1, { x: 0, y: 0, dir: 0 }],
    [9, { x: 1, y: 0, dir: 0 }],
    [10, { x: 2, y: 0, dir: 0 }],
  ]);
  const s = {
    positions,
    pets: new Map(), npcs: new Map([
      [9, { def: { radius: 0.4 } }],
      [10, { def: { radius: 0.4 } }],
    ]),
    npcsWithin: proto.npcsWithin,
    damageNpc: () => {},
    broadcastFx: (m: { id?: string; x2?: number }) => fx.push(m),
    runProc: proto.runProc,
  };
  const player = { gear: { procs: [chainProc] }, procs: new Map(), buffs: [] };
  call(proto.runProc, s, 1, player, chainProc, { x: 0, y: 0, targetEid: 9 });
  const jumps = fx.filter((m) => m.x2 !== undefined);
  assert.ok(jumps.length >= 2, 'the arc walked its jumps');
  for (const jump of jumps) {
    assert.equal(jump.id, 'chain:zap', 'every stroke names its action and working');
  }
});

test('THE METER SHOWS ITS HAND: a moved meter reaches the wearer once, as (id, have, need)', () => {
  const stackProc = {
    kind: 'proc' as const,
    id: 'bastion_t',
    name: 'Bastion',
    trigger: { on: 'stacks' as const, per: 'block' as const, count: 4 },
    action: { do: 'ward' as const, absorb: 10, ticks: 100 },
    icd: 80,
  };
  const sent: { t: string; charges?: { id: string; have: number; need: number }[] }[] = [];
  const player = {
    procs: new Map(),
    gear: { procs: [stackProc] },
    session: { sendJson: (m: (typeof sent)[number]) => sent.push(m) },
  };
  const s = {
    tickCount: 100,
    chargesDirty: new Set<number>(),
    procState: proto.procState,
    runProc: () => 0,
  };
  // Two blocks bank two charges; each marks the wearer dirty.
  call(proto.offerProc, s, 1, player, stackProc, 'block', { x: 0, y: 0 });
  call(proto.offerProc, s, 1, player, stackProc, 'block', { x: 0, y: 0 });
  assert.ok(s.chargesDirty.has(1), 'the moved meter marked its wearer');
  // The flush speaks only what the server alone knows.
  call((GameServer.prototype as unknown as { sendCharges: AnyFn }).sendCharges, s, player);
  assert.deepEqual(sent.at(-1), {
    t: 'charges',
    charges: [{ id: 'bastion_t', have: 2, need: 4 }],
  });
  // A chance proc never touches the meter and never dirties the set.
  s.chargesDirty.clear();
  withRolls([0.99], () => {
    call(proto.offerProc, s, 1, player, targetedProc, 'hurt', { x: 0, y: 0, targetEid: 9 });
  });
  assert.equal(s.chargesDirty.size, 0, 'a resting chance working moves no meter');
});
