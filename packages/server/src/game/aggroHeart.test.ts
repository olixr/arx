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
  poiPassHolds: AnyFn;
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
    pets: new Map(), companions: new Map(),
    livestock: new Map(),
    npcs: new Map(),
    healths: new Map(),
    actors: new Map(),
    npcTemper: proto.npcTemper,
    npcRefillGrit: proto.npcRefillGrit,
    npcGritHolds: proto.npcGritHolds,
    // THE COMMITTED PURSUIT: the search start spends the stride here.
    npcAnticipatePursuit: (GameServer.prototype as unknown as { npcAnticipatePursuit: AnyFn })
      .npcAnticipatePursuit,
    npcAggro: proto.npcAggro,
    cancelNpcCast: proto.cancelNpcCast,
    resetBossEngagement: proto.resetBossEngagement,
    npcFactionOf: proto.npcFactionOf,
    npcEnforcerFid: proto.npcEnforcerFid,
    npcTribeOf: proto.npcTribeOf,
    npcStanceRangeVs: proto.npcStanceRangeVs,
    playerBandWith: proto.playerBandWith,
    // THE PASS (band 7): the aggro door now reads the body's site row
    // for a passFlag — no POI cells here, so the read answers false.
    poiPassHolds: proto.poiPassHolds,
    poiSpawnCells: new Map(),
    poiLedger: new Map(),
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
  const wps = call(proto.mintHuntRing, s, npc, 0, 3, 0) as Array<{ x: number; y: number }>;
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

// ─── THE COMMITTED PURSUIT (second pass) ───────────────────────────

const protoPursuit = GameServer.prototype as unknown as {
  npcAnticipatePursuit: AnyFn;
  npcPursuitSpent: AnyFn;
  mintHuntRing: AnyFn;
};

/** A positions store the proto's `.must` reads can stand on. */
function positionsStore(): Map<number, unknown> & { must: (eid: number) => unknown } {
  const m = new Map<number, unknown>() as Map<number, unknown> & {
    must: (eid: number) => unknown;
  };
  m.must = (eid: number) => m.get(eid);
  return m;
}

test('THE COMMITTED PURSUIT: anticipation leads the corner and SPENDS the stride', () => {
  const s = slate();
  const positions = positionsStore();
  positions.set(7, { x: 0, y: 0, dir: 0, plane: 0 });
  s.positions = positions;
  const npc = fakeNpc({ quirk: 0 }); // default heart: anticipateTiles 4
  npc.alertX = 10;
  npc.alertY = 0;
  npc.alertVelX = 0.2; // a sprinting quarry, due east
  npc.alertVelY = 0;
  call(protoPursuit.npcAnticipatePursuit, s, 7, npc);
  assert.ok(
    (npc.alertX as number) > 10 && (npc.alertX as number) <= 14.01,
    `led ${npc.alertX} — must overshoot the corner by up to the lead`,
  );
  assert.equal(npc.alertY, 0);
  assert.equal(npc.huntBiasDir, 0, 'the escape bearing is kept for the hunt');
  assert.equal(npc.alertVelX, 0, 'the stride is spent');
  // The one stride is never cashed twice: a second call is a no-op.
  const led = npc.alertX;
  call(protoPursuit.npcAnticipatePursuit, s, 7, npc);
  assert.equal(npc.alertX, led);
});

test('anticipateTiles 0: the literal runner goes to where it SAW you', () => {
  const s = slate();
  const positions = positionsStore();
  positions.set(7, { x: 0, y: 0, dir: 0, plane: 0 });
  s.positions = positions;
  const npc = fakeNpc({ temperament: { anticipateTiles: 0 }, quirk: 0 });
  npc.alertX = 10;
  npc.alertVelX = 0.2;
  call(protoPursuit.npcAnticipatePursuit, s, 7, npc);
  assert.equal(npc.alertX, 10, 'no overshoot');
  assert.equal(npc.alertVelX, 0, 'the stride is still spent');
  assert.equal(npc.huntBiasDir, 0, 'the bearing is still known');
});

test('a projection into sealed ground falls back and never lands in a wall', () => {
  const s = slate();
  s.worldOf = () => ({ isSolid: () => true });
  const positions = positionsStore();
  positions.set(7, { x: 0, y: 0, dir: 0, plane: 0 });
  s.positions = positions;
  const npc = fakeNpc({ quirk: 0 });
  npc.alertX = 10;
  npc.alertVelX = 0.2;
  call(protoPursuit.npcAnticipatePursuit, s, 7, npc);
  assert.equal(npc.alertX, 10, 'both fallbacks sealed: the corner itself is the goal');
  assert.equal(npc.alertVelX, 0);
});

test("the pursuit's verdict: never before the corner, always at it or past the clock", () => {
  const s = slate();
  const npc = fakeNpc({ temperament: { pursuitSec: 5, variance: 0 }, quirk: 0 });
  npc.alertX = 20;
  npc.alertY = 0;
  const far = { x: 0, y: 0 };
  // The eye still holds — no run, no verdict.
  assert.equal(call(protoPursuit.npcPursuitSpent, s, npc, far), false);
  // The run is young and the corner is far: the chase lives.
  npc.pursuitSinceTick = (s.tickCount as number) - 10;
  assert.equal(call(protoPursuit.npcPursuitSpent, s, npc, far), false);
  // Arrived with nothing there: concede on the spot.
  assert.equal(call(protoPursuit.npcPursuitSpent, s, npc, { x: 19.5, y: 0 }), true);
  // A corner never reached: the heart's clock is the cap.
  npc.pursuitSinceTick = (s.tickCount as number) - 5 * TICK_RATE - 1;
  assert.equal(call(protoPursuit.npcPursuitSpent, s, npc, far), true);
});

test('THE FORWARD BIAS: the first second look leans down the escape line', () => {
  const s = slate();
  for (let i = 0; i < 16; i++) {
    const npc = fakeNpc({});
    npc.alertX = 0;
    npc.alertY = 0;
    npc.huntBiasDir = 0; // the quarry fled due east
    const wps = call(protoPursuit.mintHuntRing, s, npc, 0, 3, 0) as Array<{ x: number; y: number }>;
    assert.ok(wps.length > 0);
    const first = wps[0]!;
    const ang = Math.abs(Math.atan2(first.y, first.x));
    assert.ok(ang <= 0.75, `first look at ${ang} rad — must lean down the escape bearing`);
  }
});

// ─── THE SEARCH THAT WALKS (third pass) ────────────────────────────

const protoWalk = GameServer.prototype as unknown as {
  npcNextHuntLeg: AnyFn;
  mintHuntRing: AnyFn;
};

/** A slate that can walk hunt legs: positions.must + the ring minter. */
function walkSlate(): Record<string, unknown> {
  const s = slate();
  s.mintHuntRing = protoWalk.mintHuntRing;
  const positions = positionsStore();
  positions.set(7, { x: 0, y: 0, dir: 0, plane: 0 });
  s.positions = positions;
  return s;
}

test('THE GYRE: a ring walked dry mints a WIDER one, and the spent legs end in the LAST WATCH', () => {
  const s = walkSlate();
  const npc = fakeNpc({ temperament: { searchLegs: 6, variance: 0 }, quirk: 0 });
  npc.state = 'search';
  npc.huntUntilTick = 2000;
  npc.huntLegsLeft = 6;
  // First arrival at the LKP mints the tight gyre.
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  assert.equal(npc.huntGyre, 0);
  const ring0 = npc.huntWps as Array<{ x: number; y: number }>;
  assert.equal(ring0.length, 3);
  for (const wp of ring0) {
    assert.ok(Math.hypot(wp.x, wp.y) <= 4.6, 'gyre 0 hugs the LKP');
  }
  // Walk the ring dry: each finished look spends a leg...
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  // ...and the dry ring widens the sweep instead of ending it.
  assert.equal(npc.huntGyre, 1, 'the sweep combs outward');
  assert.equal(npc.huntLegsLeft, 3);
  for (const wp of npc.huntWps as Array<{ x: number; y: number }>) {
    const d = Math.hypot(wp.x, wp.y);
    assert.ok(d >= 4.4 && d <= 7.6, `gyre 1 look at ${d} — must comb farther ground`);
  }
  // The last legs walk out, and the LAST WATCH holds to the clock —
  // the clock is the master, never clamped down.
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  assert.equal(npc.huntLegsLeft, 0);
  assert.equal(npc.huntWaitUntilTick, 2000, 'the last watch fills what remains');
  assert.equal(npc.huntUntilTick, 2000, 'the authored window is honest lived time');
});

test('the SENTINEL (searchLegs 0): no wandering — the whole clock is a standing watch', () => {
  const s = walkSlate();
  const npc = fakeNpc({ temperament: { searchLegs: 0, variance: 0 }, quirk: 0 });
  npc.state = 'search';
  npc.huntUntilTick = 3000;
  npc.huntLegsLeft = 0;
  call(protoWalk.npcNextHuntLeg, s, 7, npc);
  assert.equal((npc.huntWps as unknown[]).length, 0, 'no looks minted');
  assert.equal(npc.huntWaitUntilTick, 3000, 'stand and scan until the clock alone shrugs');
});

test('THE PEEK: a cunning species spends its SECOND look farther down the escape line', () => {
  const s = slate();
  for (let i = 0; i < 12; i++) {
    const npc = fakeNpc({ temperament: { anticipateTiles: 6, variance: 0 }, quirk: 0 });
    npc.huntBiasDir = 0; // the quarry fled due east
    const wps = call(protoWalk.mintHuntRing, s, npc, 0, 3, 0) as Array<{ x: number; y: number }>;
    assert.ok(wps.length >= 2);
    const second = wps[1]!;
    const ang = Math.abs(Math.atan2(second.y, second.x));
    assert.ok(ang <= 1.0, `second look at ${ang} rad — the corner-cutter chases your LINE`);
    const d = Math.hypot(second.x, second.y);
    assert.ok(d >= 4.4, `second peek at ${d} tiles — must reach past the first band`);
  }
});

test('THE EYE ABOVE THE HEAD: every rung of the ladder telegraphs its own face', () => {
  const protoEye = GameServer.prototype as unknown as { npcAlertByte: AnyFn };
  const s = slate();
  const npc = fakeNpc({});
  (s.npcs as Map<number, unknown>).set(1, npc);
  const byte = () => call(protoEye.npcAlertByte, s, 1) as number;
  // 0 calm · 1 wary · 2 engaged · 3 hunting · 4 pursuit · 5 looking
  npc.state = 'idle';
  assert.equal(byte(), 0);
  npc.state = 'suspicious';
  assert.equal(byte(), 1);
  npc.state = 'investigate';
  assert.equal(byte(), 5, 'the walk-over wears its own face, not the stare');
  npc.state = 'chase';
  assert.equal(byte(), 2, 'the eye ON you is the lock');
  // The chase never lies about its eye: the blind run telegraphs blind.
  npc.pursuitSinceTick = 900;
  assert.equal(byte(), 4, 'sight broken, still coming — the slashed eye');
  npc.pursuitSinceTick = undefined;
  npc.state = 'search';
  assert.equal(byte(), 3);
  npc.state = 'return';
  assert.equal(byte(), 0, 'the walk home stands the telegraph down');
});

test('the peacetime stroll never mints a look past its leash circle', () => {
  const s = slate();
  for (let i = 0; i < 8; i++) {
    const npc = fakeNpc({ leashRange: 10 });
    npc.state = 'investigate';
    // Wondering at home, widest gyre: the band alone would overshoot.
    const wps = call(protoWalk.mintHuntRing, s, npc, 0, 3, 2) as Array<{ x: number; y: number }>;
    for (const wp of wps) {
      assert.ok(
        Math.hypot(wp.x, wp.y) <= 9.01,
        'an investigate look stays inside leash − 1 — wandering past it would end the errand',
      );
    }
  }
});
