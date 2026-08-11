import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAST_STILL_FACTOR, artFlag, xpForLevel } from '@arx/shared';
import { abilityDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE DRAWN BREATH's server laws, pinned: a casted art's press begins
 * a wind-up and pays NOTHING; accrual breathes CAST_STILL_FACTOR on a
 * planted tick and 1 on a moving one; the fire re-verifies the hand
 * and only then runs the one pay block; every cancel is clean (nothing
 * spent, nothing refunded). The instants' pay-at-press stands beside
 * it, regression-pinned. Same slate discipline as techniques.test.ts:
 * private GameServer methods over a hand-built slate — no db, no
 * sockets, real content.
 *
 * Content facts leaned on: 'daybreak' is the arx rung-50 ladder art
 * and THE DRAWN BREATH's pilot (castTicks 24, cooldown 280);
 * 'heavy_slam' is the onehand rung-5 instant.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  tryCastAbility: Fn;
  beginCasting: Fn;
  cancelCasting: Fn;
  tickCasting: Fn;
  fireCasting: Fn;
  fireAbility: Fn;
  slotAbility: Fn;
  seatAbility: Fn;
  seatDormant: Fn;
};

interface FakePlayer {
  techniques: [string | null, string | null];
  flags: Map<string, number>;
  skills: Record<string, number>;
  equipment: Record<string, { id: string } | undefined>;
  session: { sendJson: (m: unknown) => void };
  abilityCd: [number, number, number, number];
  castFreezeUntilTick: number;
  casting: unknown | null;
  gear: { cooldownMult: number };
  drawTicks: number;
  action: { kind: string } | null;
  poseUntilTick: number;
  lastCombatAt: number;
}

function mkPlayer(over: Partial<FakePlayer> = {}): FakePlayer {
  return {
    techniques: ['daybreak', null],
    flags: new Map(),
    skills: { arx: xpForLevel(60), onehand: xpForLevel(60) },
    equipment: {},
    session: { sendJson: () => undefined },
    abilityCd: [0, 0, 0, 0],
    castFreezeUntilTick: 0,
    casting: null,
    gear: { cooldownMult: 1 },
    drawTicks: 0,
    action: null,
    poseUntilTick: 0,
    lastCombatAt: 0,
    ...over,
  };
}

function slate(player: FakePlayer) {
  const sent: Array<Record<string, unknown>> = [];
  const casts: Array<{ ab: { id: string }; aim: number; targetPos?: { x: number; y: number } }> =
    [];
  const cancels: string[] = [];
  player.session = { sendJson: (m) => sent.push(m as Record<string, unknown>) };
  const pos = { x: 0, y: 0, dir: 0 };
  const self = {
    tickCount: 100,
    positions: { get: () => pos, must: () => pos },
    setPose: () => undefined,
    revealPlayer: () => undefined,
    sendCooldowns: () => undefined,
    bodyMoment: () => undefined,
    currentStyle: () => 'arx',
    effectiveLevel: () => 60,
    cancelAction: (_eid: unknown, p: FakePlayer, reason?: string) => {
      p.action = null;
      cancels.push(reason ?? '');
    },
    castAbility: (_eid: unknown, ab: { id: string }, aim: number, ...rest: unknown[]) => {
      casts.push({ ab, aim, targetPos: rest[3] as { x: number; y: number } | undefined });
    },
    techSeat: (slot: number) => (slot === 0 ? 0 : slot === 2 ? 1 : null),
    masteredArt: (p: FakePlayer, ability: string) => p.flags.has(artFlag(ability)),
    equippedArtIds: () => new Set<string>(),
    tryCastAbility: proto.tryCastAbility,
    beginCasting: proto.beginCasting,
    cancelCasting: proto.cancelCasting,
    tickCasting: proto.tickCasting,
    fireCasting: proto.fireCasting,
    fireAbility: proto.fireAbility,
    slotAbility: proto.slotAbility,
    seatAbility: proto.seatAbility,
    seatDormant: proto.seatDormant,
  };
  return { self, sent, casts, cancels, pos };
}

const castMsgs = (sent: Array<Record<string, unknown>>) =>
  sent.filter((m) => m.t === 'cast').map((m) => m.state);

test('the press begins the breath and pays nothing', () => {
  const player = mkPlayer();
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0.5);
  assert.ok(player.casting, 'the wind-up stands');
  assert.equal(player.abilityCd[0], 0, 'no cooldown at the press — the pay waits for the fire');
  assert.equal(player.castFreezeUntilTick, 0, 'no root — the breath moves at full stride');
  assert.equal(casts.length, 0, 'the one door has not opened');
  const start = sent.find((m) => m.t === 'cast');
  assert.ok(start && start.state === 'start' && start.ticks === 24, 'the start speaks its length');
});

test('THE PLANTED FOOT: still ticks breathe 1.25, moving ticks breathe 1', () => {
  const planted = mkPlayer();
  const s1 = slate(planted);
  s1.self.tryCastAbility.call(s1.self, 1, planted, 0, 0);
  let ticks = 0;
  while (planted.casting && ticks < 100) {
    s1.self.tickCasting.call(s1.self, 1, planted, false);
    ticks++;
  }
  assert.equal(
    ticks,
    Math.ceil(24 / CAST_STILL_FACTOR),
    'planted, the breath completes on the quickened clock',
  );
  assert.equal(s1.casts.length, 1, 'the fire opens the one door once');
  assert.equal(planted.abilityCd[0], 280, 'the cooldown lands at the fire');
  assert.deepEqual(castMsgs(s1.sent), ['start', 'fire']);

  const moving = mkPlayer();
  const s2 = slate(moving);
  s2.self.tryCastAbility.call(s2.self, 1, moving, 0, 0);
  ticks = 0;
  while (moving.casting && ticks < 100) {
    s2.self.tickCasting.call(s2.self, 1, moving, true);
    ticks++;
  }
  assert.equal(ticks, 24, 'on the move, the breath takes its authored length');
});

test('a second press of the winding slot cancels clean; other slots are refused', () => {
  const player = mkPlayer({ techniques: ['daybreak', 'heavy_slam'] });
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  assert.ok(player.casting, 'winding');
  // Another slot's press is refused quietly — the breath holds.
  self.tryCastAbility.call(self, 1, player, 2, 0);
  assert.ok(player.casting, 'the breath holds through the refused press');
  assert.equal(player.abilityCd[2], 0, 'the refused slot spent nothing');
  // The winding slot's own press is the cancel.
  self.tryCastAbility.call(self, 1, player, 0, 0);
  assert.equal(player.casting, null, 'the re-press lets the breath go');
  assert.equal(casts.length, 0, 'nothing fired');
  assert.equal(player.abilityCd[0], 0, 'nothing spent, nothing to refund');
  assert.deepEqual(castMsgs(sent), ['start', 'break']);
});

test('a working that takes the hands breaks the breath', () => {
  const player = mkPlayer();
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  player.action = { kind: 'gather' };
  self.tickCasting.call(self, 1, player, false);
  assert.equal(player.casting, null, 'the action broke it');
  assert.equal(casts.length, 0, 'no fire');
  assert.deepEqual(castMsgs(sent), ['start', 'break']);
});

test('the fire re-verifies the hand: a reseat mid-breath breaks, never fires a stranger', () => {
  const player = mkPlayer();
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  player.techniques[0] = 'arc_bolt'; // reseated mid-breath
  while (player.casting) self.tickCasting.call(self, 1, player, false);
  assert.equal(casts.length, 0, 'the door never fires a stranger’s art');
  assert.equal(player.abilityCd[0], 0, 'the broken working spent nothing');
  assert.deepEqual(castMsgs(sent), ['start', 'break']);
});

test('THE HELD SIGIL composes: the staked point holds and the facing re-derives at the fire', () => {
  const player = mkPlayer();
  const { self, casts, pos } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0, { x: 6, y: 0 });
  assert.ok(player.casting, 'the point-aimed breath stands');
  // The body wanders mid-breath; the promise holds.
  pos.x = 0;
  pos.y = 5;
  while (player.casting) self.tickCasting.call(self, 1, player, false);
  assert.equal(casts.length, 1);
  const fired = casts[0]!;
  assert.deepEqual(fired.targetPos, { x: 6, y: 0 }, 'the staked point is the promise kept');
  assert.ok(
    Math.abs(fired.aim - Math.atan2(-5, 6)) < 1e-9,
    'the facing re-derives from where the body ended up',
  );
});

test('the instants stand unchanged: pay-at-press, fire-at-press', () => {
  const player = mkPlayer({ techniques: ['heavy_slam', null] });
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  assert.equal(player.casting, null, 'no wind-up on an instant');
  assert.equal(casts.length, 1, 'the door opens on the press edge');
  assert.ok(player.abilityCd[0] > 0, 'the cooldown pays at the press');
  assert.equal(castMsgs(sent).length, 0, 'the instants never speak on the cast wire');
});

test('a cancelled breath leaves the pose and a broken one is idempotent', () => {
  const player = mkPlayer();
  const { self } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  self.cancelCasting.call(self, 1, player);
  assert.equal(player.casting, null);
  assert.equal(player.poseUntilTick, 100, 'the stance lets go at once');
  // A second cancel is a quiet no-op.
  self.cancelCasting.call(self, 1, player);
  assert.equal(player.casting, null);
});

test('content pins the pilot: daybreak carries the breath, its old root retired', () => {
  const ab = abilityDef('daybreak')!;
  assert.equal(ab.castTicks, 24, 'the pilot winds 1.2s');
  assert.equal(ab.castFreezeTicks, undefined, 'the wind-up IS the commit — no post-fire root');
});
