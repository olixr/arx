import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TICK_RATE } from '@arx/shared';
import { npcDef, npcTemperament, TEMPERAMENT_DEFAULTS } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE HUNTER'S HEART (docs/aggro-temperament-plan.md) — the server
 * half, on minimal fake slates (the wildSides/enforce rig pattern):
 * the memoized heart, the quirk's spread, the grit tether that
 * replaced the hard leash wall, the aggro door seeding the tank, and
 * the search that anchors where the quarry vanished on a 20–30 s
 * clock.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  npcTemper: AnyFn;
  npcRefillGrit: AnyFn;
  npcGritHolds: AnyFn;
  npcStartSearch: AnyFn;
  mintHuntRing: AnyFn;
  npcAggro: AnyFn;
  cancelNpcCast: AnyFn;
  resetBossEngagement: AnyFn;
  npcFactionOf: AnyFn;
  npcEnforcerFid: AnyFn;
  npcTribeOf: AnyFn;
  npcStanceRangeVs: AnyFn;
  playerBandWith: AnyFn;
};
const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

function fakeNpc(opts: {
  temperament?: Record<string, number>;
  quirk?: number;
  leashRange?: number;
  originX?: number;
  originY?: number;
} = {}): Record<string, unknown> {
  return {
    state: 'idle',
    targetEid: null,
    def: {
      id: 'test_foe',
      pack: undefined,
      aggroRange: 5,
      leashRange: opts.leashRange ?? 10,
      level: 10,
      damage: 2,
      radius: 0.3,
      temperament: opts.temperament,
    },
    quirk: opts.quirk ?? 0,
    originX: opts.originX ?? 0,
    originY: opts.originY ?? 0,
    alert: 0,
    alertEid: null,
    alertX: 0,
    alertY: 0,
    alertVelX: 0,
    alertVelY: 0,
    alertSeenTick: 0,
    huntUntilTick: 0,
    huntWps: null,
    huntIdx: 0,
    huntWaitUntilTick: 0,
    standTicks: 0,
    windupTicks: 0,
    helpEid: null,
    navBest: 0,
    navStuck: 0,
    navRefX: 0,
    navRefY: 0,
    steer: { side: 0, ticks: 0 },
    nav: null,
    progressLane: null,
    nextRepathTick: 0,
    losUntilTick: 0,
  };
}

/** The minimal host the exercised proto methods can stand on. */
function slate(): Record<string, unknown> {
  const s: Record<string, unknown> = {
    tickCount: 1000,
    players: new Map(),
    positions: new Map(),
    pets: new Map(),
    livestock: new Map(),
    npcs: new Map(),
    healths: new Map(),
    actors: new Map(),
    npcTemper: proto.npcTemper,
    npcRefillGrit: proto.npcRefillGrit,
    npcGritHolds: proto.npcGritHolds,
    npcAggro: proto.npcAggro,
    cancelNpcCast: proto.cancelNpcCast,
    resetBossEngagement: proto.resetBossEngagement,
    npcFactionOf: proto.npcFactionOf,
    npcEnforcerFid: proto.npcEnforcerFid,
    npcTribeOf: proto.npcTribeOf,
    npcStanceRangeVs: proto.npcStanceRangeVs,
    playerBandWith: proto.playerBandWith,
    worldOf: () => ({ isSolid: () => false }),
  };
  return s;
}

test('the heart is memoized — and recut when a CMS swap moves the def', () => {
  const s = slate();
  const npc = fakeNpc({ temperament: { gritSec: 90 }, quirk: 0 });
  const first = call(proto.npcTemper, s, npc) as { gritSec: number };
  assert.equal(first.gritSec, 90);
  assert.equal(call(proto.npcTemper, s, npc), first, 'same def = the memo');
  npc.def = { ...(npc.def as object), temperament: { gritSec: 30 } };
  const recut = call(proto.npcTemper, s, npc) as { gritSec: number };
  assert.equal(recut.gritSec, 30, 'a swapped def recuts the heart');
});

test('THE QUIRK: two bodies of one species carry different hearts', () => {
  const s = slate();
  const bold = fakeNpc({ temperament: { gritSec: 40, variance: 0.4 }, quirk: 1 });
  const timid = fakeNpc({ temperament: { gritSec: 40, variance: 0.4 }, quirk: -1 });
  const b = call(proto.npcTemper, s, bold) as { gritSec: number; nerve: number };
  const t = call(proto.npcTemper, s, timid) as { gritSec: number; nerve: number };
  assert.ok(b.gritSec > 40 && t.gritSec < 40, 'the bold chase longer');
  assert.ok(b.nerve < t.nerve, 'the bold commit sooner');
});

test('THE LONG PULL: home ground refills, the far road drains, empty breaks', () => {
  const s = slate();
  const npc = fakeNpc({ temperament: { gritSec: 2, variance: 0 }, leashRange: 10 });
  // Inside the circle: the verdict holds and the tank tops up.
  assert.equal(call(proto.npcGritHolds, s, npc, 5), true);
  assert.equal(npc.gritTicksLeft, 2 * TICK_RATE, 'home ground = a full tank');
  // Beyond it: every tick spends one, and the chase lives meanwhile.
  for (let i = 0; i < 2 * TICK_RATE - 1; i++) {
    assert.equal(call(proto.npcGritHolds, s, npc, 14), true, `tick ${i} still holds`);
  }
  // The last coin: the tank empties and the verdict breaks.
  assert.equal(call(proto.npcGritHolds, s, npc, 14), false, 'empty = the walk home');
  // Stepping home re-arms the whole tank for the next fight.
  assert.equal(call(proto.npcGritHolds, s, npc, 3), true);
  assert.equal(npc.gritTicksLeft, 2 * TICK_RATE);
});

test('gritSec 0 reads as the classic hard leash by construction', () => {
  const s = slate();
  const npc = fakeNpc({ temperament: { gritSec: 0, variance: 0 }, leashRange: 10 });
  assert.equal(call(proto.npcGritHolds, s, npc, 5), true, 'inside: unchanged');
  assert.equal(call(proto.npcGritHolds, s, npc, 11), false, 'one step past = the wall');
});

test('the aggro door opens every fight with a full tank of resolve', () => {
  const s = slate();
  const npc = fakeNpc({ temperament: { gritSec: 50, variance: 0 } });
  (s.npcs as Map<number, unknown>).set(1, npc);
  (s.positions as Map<number, unknown>).set(1, { x: 0, y: 0, dir: 0, plane: 0 });
  (s.positions as Map<number, unknown>).set(2, { x: 3, y: 0, dir: 0, plane: 0 });
  (s.players as Map<number, unknown>).set(2, { standings: {} });
  call(proto.npcAggro, s, 1, npc, 2, {});
  assert.equal(npc.state, 'chase');
  assert.equal(npc.gritTicksLeft, 50 * TICK_RATE, 'seeded at the door');
});

test('THE HUNT UNCHAINED: the search clock lives in the asked-for 20–30 s window', () => {
  const s = slate();
  for (let i = 0; i < 24; i++) {
    const npc = fakeNpc({ quirk: 0 }); // default heart: searchSec 20
    npc.state = 'chase';
    (s.positions as Map<number, unknown>).set(7, { x: 80, y: 0, dir: 0, plane: 0 });
    call(proto.npcStartSearch, s, 7, npc);
    const ticks = (npc.huntUntilTick as number) - (s.tickCount as number);
    assert.ok(
      ticks >= 20 * TICK_RATE && ticks <= 30 * TICK_RATE,
      `hunt clock ${ticks} outside the 20–30 s window`,
    );
    assert.equal(npc.state, 'search');
  }
});

test('THE HUNT UNCHAINED: the LKP stays where the quarry vanished, however far the pull', () => {
  const s = slate();
  const npc = fakeNpc({ leashRange: 10 });
  npc.state = 'chase';
  // The quarry slipped the eye 80 tiles from home — the old clamp
  // would have teleported the hunt's heart back into the circle.
  npc.alertX = 80;
  npc.alertY = 0;
  (s.positions as Map<number, unknown>).set(7, { x: 79, y: 0, dir: 0, plane: 0 });
  call(proto.npcStartSearch, s, 7, npc);
  assert.equal(npc.alertX, 80, 'the hunt anchors at the hedgerow, not at home');
  // ...and the ring of second looks hugs that ground the same way.
  const wps = call(proto.mintHuntRing, s, npc, 0, 3) as Array<{ x: number; y: number }>;
  for (const wp of wps) {
    const d = Math.hypot(wp.x - 80, wp.y - 0);
    assert.ok(d <= 5, `ring point ${d} tiles from the LKP — it must hug it`);
  }
});

test('the shipped hearts: authored species differ where the doc says they do', () => {
  const wolf = npcTemperament(npcDef('wolf')!);
  const fox = npcTemperament(npcDef('fox')!);
  const bones = npcTemperament(npcDef('skeleton')!);
  assert.ok(wolf.gritSec > TEMPERAMENT_DEFAULTS.gritSec, 'the pack pulls to the gates');
  assert.ok(fox.gritSec < TEMPERAMENT_DEFAULTS.gritSec, 'the skulk abandons early');
  assert.ok(fox.nerve > wolf.nerve, 'the fox studies you longest');
  assert.equal(bones.variance, 0, 'the dead do not differ');
});
