/**
 * THE MASTERED HAND (techniques v3, Phase 1) — the engine of
 * relationships between presses, pinned at the doors:
 * THE FOLLOW-THROUGH (window, spend, refund, the resolved def),
 * THE FINALE (the last beat's weight), THE AFTERMATH + THE HELD
 * GROUND (a standing field from a resolved press; the owner wears the
 * boon inside it, one buff by name), THE RED LEDGER (a kill inside
 * the window refunds the seat, once).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpForLevel, type AbilityDef } from '@arx/shared';
import { GameServer, masteredHandWithFollow } from './gameServer.js';

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  fireAbility: Fn;
  channelPulse: Fn;
  leaveAftermath: Fn;
  spawnAftermath: Fn;
  holdGround: Fn;
  tickFields: Fn;
  settleKillRefund: Fn;
};

const OPENER: AbilityDef = {
  id: 'test_opener',
  name: 'Test Opener',
  desc: '',
  color: '#fff',
  code: 'TO',
  cooldownTicks: 200,
  shape: 'nova',
  damage: 6,
  radius: 2,
  tag: 'brand',
  onKill: { refundTicks: 60 },
};
const PAYOFF: AbilityDef = {
  id: 'test_payoff',
  name: 'Test Payoff',
  desc: '',
  color: '#fff',
  code: 'TP',
  cooldownTicks: 200,
  shape: 'nova',
  damage: 10,
  radius: 2,
  follow: { after: ['brand', 'rend'], windowTicks: 40, damageMult: 2, radiusMult: 1.5, refundTicks: 50 },
};

function mkPlayer() {
  return {
    techniques: [null, null] as [string | null, string | null],
    flags: new Map<string, number>(),
    skills: { arx: xpForLevel(50) },
    equipment: {} as Record<string, unknown>,
    session: { sendJson: () => undefined },
    abilityCd: [0, 0, 0, 0] as [number, number, number, number],
    castFreezeUntilTick: 0,
    casting: null,
    gear: { cooldownMult: 1 },
    drawTicks: 0,
    action: null as unknown,
    poseUntilTick: 0,
    lastCombatAt: 0,
    lastArt: null as { tag: string; tick: number } | null,
    killRefund: null as { slot: number; ticks: number; until: number } | null,
    buffs: [] as Array<{ name: string; untilTick: number }>,
  };
}

function slate() {
  const casts: Array<{ ab: AbilityDef; powerMult: number; follow: unknown }> = [];
  const fxOut: Array<Record<string, unknown>> = [];
  const pos = { plane: 0, x: 0, y: 0, dir: 0 };
  const applied: Array<{ ab: AbilityDef }> = [];
  const player = mkPlayer();
  const self = {
    tickCount: 100,
    positions: { get: () => pos, must: () => pos },
    players: { get: () => player },
    activeFields: [] as unknown[],
    broadcastFx: (_plane: unknown, fx: Record<string, unknown>) => fxOut.push(fx),
    setPose: () => undefined,
    revealPlayer: () => undefined,
    sendCooldowns: () => undefined,
    bodyMoment: () => undefined,
    currentStyle: () => 'arx',
    effectiveLevel: () => 50,
    cancelAction: () => undefined,
    techSeat: (slot: number) => (slot === 0 ? 0 : slot === 2 ? 1 : null),
    castAbility: (_eid: unknown, ab: AbilityDef, _aim: number, ...rest: unknown[]) => {
      casts.push({ ab, powerMult: rest[4] as number, follow: rest[5] });
    },
    applySelf: (_eid: unknown, ab: AbilityDef) => {
      applied.push({ ab });
      player.buffs.push({ name: ab.name, untilTick: 0 });
    },
    forEachNpcNear: () => {
      throw new Error('a silent field must never look for bodies');
    },
    fireAbility: proto.fireAbility,
    channelPulse: proto.channelPulse,
    leaveAftermath: proto.leaveAftermath,
    spawnAftermath: proto.spawnAftermath,
    holdGround: proto.holdGround,
    tickFields: proto.tickFields,
    settleKillRefund: proto.settleKillRefund,
  };
  return { self, player, casts, fxOut, pos, applied };
}

test('THE FOLLOW-THROUGH: an opener leaves its word; a payoff inside the window speaks its bonus and spends the opening', () => {
  const { self, player, casts } = slate();
  self.fireAbility.call(self, 1, player, 0, OPENER, 0);
  assert.deepEqual(player.lastArt, { tag: 'brand', tick: 100 }, 'the opener leaves its word at the fire tick');
  assert.equal(casts[0]!.follow, undefined, 'the opener follows nothing');
  self.tickCount = 130;
  self.fireAbility.call(self, 1, player, 2, PAYOFF, 0);
  assert.equal(casts[1]!.follow, PAYOFF.follow, 'inside the window the payoff carries its follow');
  assert.equal(player.abilityCd[2], 150, 'the follow refund is paid at fire (200 − 50)');
  assert.equal(player.lastArt, null, 'a follow spends the opening');
  assert.equal(player.killRefund, null, 'an art without a ledger arms no refund');
});

test('THE FOLLOW-THROUGH: outside the window, or after a stranger, the payoff is only itself', () => {
  const { self, player, casts } = slate();
  self.fireAbility.call(self, 1, player, 0, OPENER, 0);
  self.tickCount = 141;
  self.fireAbility.call(self, 1, player, 2, PAYOFF, 0);
  assert.equal(casts[1]!.follow, undefined, 'one tick past the window is no follow');
  assert.equal(player.abilityCd[2], 200, 'no refund without a follow');
  player.lastArt = { tag: 'chill', tick: 141 };
  self.fireAbility.call(self, 1, player, 2, PAYOFF, 0);
  assert.equal(casts[2]!.follow, undefined, 'a word the follow does not read is no opening');
  assert.deepEqual(player.lastArt, { tag: 'chill', tick: 141 }, 'an unread word stands');
});

test('THE FOLLOW-THROUGH: the resolved def keeps its id and shape and wears the bonus', () => {
  const eff = masteredHandWithFollow(PAYOFF, PAYOFF.follow!);
  assert.equal(eff.id, PAYOFF.id);
  assert.equal(eff.shape, PAYOFF.shape);
  assert.equal(eff.damage, 20);
  assert.equal(eff.radius, 3);
  assert.equal(PAYOFF.damage, 10, 'the authored def is never written');
  const chilled = masteredHandWithFollow(PAYOFF, {
    after: 'brand',
    windowTicks: 40,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  });
  assert.equal(chilled.status?.status, 'chill');
});

test('THE FINALE: the last beat of the note carries the multiple, the quiet beats do not', () => {
  const { self, player, casts } = slate();
  const note: AbilityDef = { ...OPENER, id: 'test_note', channelTicks: 48, pulseEveryTicks: 16, finaleMult: 2.5 };
  const action = { kind: 'channel', slot: 0, ab: note, style: 'arx', level: 50, powerMult: 1, every: 16, ticksLeft: 48, total: 48 };
  self.channelPulse.call(self, 1, player, action, 0);
  action.ticksLeft = 32;
  self.channelPulse.call(self, 1, player, action, 0);
  action.ticksLeft = 16;
  self.channelPulse.call(self, 1, player, action, 0);
  assert.deepEqual(
    casts.map((c) => c.powerMult),
    [1, 1, 2.5],
    'three beats: two quiet, the last at the finale weight',
  );
});

test('THE AFTERMATH: a resolved press leaves a standing field with the field fx, scaled like the art', () => {
  const { self, fxOut } = slate();
  const burning: AbilityDef = {
    ...OPENER,
    id: 'test_fire',
    aftermath: { fieldTicks: 80, everyTicks: 20, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
  };
  self.leaveAftermath.call(self, burning, 0, 3, 4, 2, 1, 'arx', false, 50, 1.5);
  assert.equal(self.activeFields.length, 1);
  const f = self.activeFields[0] as Record<string, unknown>;
  assert.equal(f.damage, 3, 'the field pulse scales by the caster power (2 × 1.5)');
  assert.equal(f.radius, 2, 'radius defaults to the blast radius');
  assert.equal(f.ticksLeft, 80);
  assert.equal(f.everyTicks, 20);
  assert.equal((f.status as { status: string }).status, 'burn');
  assert.equal(f.selfId, 'test_fire');
  const fx = fxOut.at(-1)!;
  assert.equal(fx.kind, 'field');
  assert.equal(fx.id, 'test_fire');
  assert.equal(fx.ticks, 80);
  const quiet: AbilityDef = { ...OPENER, id: 'test_quiet' };
  self.leaveAftermath.call(self, quiet, 0, 0, 0, 2, 1, 'arx', false, 50, 1.5);
  assert.equal(self.activeFields.length, 1, 'no aftermath, no field');
});

test('THE HELD GROUND: the owner inside their zone wears the boon as ONE buff, and a silent zone never hunts bodies', () => {
  const { self, player, pos, applied } = slate();
  const field = {
    plane: 0,
    x: 0,
    y: 0,
    radius: 2,
    damage: 0,
    everyTicks: 16,
    ticksLeft: 64,
    ownerEid: 1,
    style: 'shield',
    fromNpc: false,
    knockback: 0,
    self: { armor: 8, durationTicks: 999 },
    selfId: 'test_wall',
    selfColor: '#abc',
  };
  self.activeFields.push(field);
  for (let i = 0; i < 16; i++) self.tickFields.call(self);
  assert.equal(applied.length, 1, 'the first pulse inside lays the boon');
  assert.equal((applied[0]!.ab.self as { durationTicks: number }).durationTicks, 18, 'the boon lapses a beat after the next pulse');
  assert.equal(player.buffs.length, 1);
  for (let i = 0; i < 16; i++) self.tickFields.call(self);
  assert.equal(applied.length, 1, 'the second pulse extends the standing buff instead of laying a twin');
  assert.equal(player.buffs[0]!.untilTick, self.tickCount + 18, 'the clock is pushed, not doubled');
  pos.x = 5;
  for (let i = 0; i < 16; i++) self.tickFields.call(self);
  assert.equal(applied.length, 1, 'outside the ring the ground holds nothing');
  assert.ok(self.activeFields.length === 1 && (self.activeFields[0] as { ticksLeft: number }).ticksLeft === 16);
});

test('THE RED LEDGER: a kill inside the window refunds the seat once; a late kill refunds nothing', () => {
  const { self, player } = slate();
  self.fireAbility.call(self, 1, player, 0, OPENER, 0);
  assert.deepEqual(player.killRefund, { slot: 0, ticks: 60, until: 140 }, 'the ledger arms for two seconds');
  self.tickCount = 120;
  self.settleKillRefund.call(self, player);
  assert.equal(player.abilityCd[0], 140, 'the kill gives 60 ticks back (200 − 60)');
  assert.equal(player.killRefund, null, 'paid once');
  self.settleKillRefund.call(self, player);
  assert.equal(player.abilityCd[0], 140, 'a second kill pays nothing more');
  self.tickCount = 100;
  self.fireAbility.call(self, 1, player, 0, OPENER, 0);
  self.tickCount = 141;
  self.settleKillRefund.call(self, player);
  assert.equal(player.abilityCd[0], 200, 'a kill past the window is just a kill');
  assert.equal(player.killRefund, null, 'the stale ledger is cleared');
});

// ---------------------------------------------------------------------
// Phase 3 — the engine ledger the schools asked for.
// ---------------------------------------------------------------------
import { masteredHandQuietBeat } from './gameServer.js';

const proto3 = GameServer.prototype as unknown as {
  castAbility: Fn;
  landAftermath: Fn;
};

test('THE FOLLOW-THROUGH riders: a landed follow can shove harder and dress the caster; a missed one does neither', () => {
  const shove = masteredHandWithFollow({ ...PAYOFF, knockback: 1.5 }, { after: 'brand', windowTicks: 40, knockbackMult: 2 });
  assert.equal(shove.knockback, 3);
  const { self, player, applied } = slate();
  const linked: AbilityDef = { ...PAYOFF, id: 'test_link', follow: { after: 'brand', windowTicks: 40, self: { speedMult: 1.1, durationTicks: 40 } } };
  self.fireAbility.call(self, 1, player, 2, linked, 0);
  assert.equal(applied.length, 0, 'no opening, no boon');
  player.lastArt = { tag: 'brand', tick: 100 };
  self.fireAbility.call(self, 1, player, 2, linked, 0);
  assert.equal(applied.length, 1, 'the landed link dresses the caster');
  assert.equal((applied[0]!.ab.self as { speedMult: number }).speedMult, 1.1);
});

test('THE QUIET BEAT: a channel leaves ground and spends the wound on its last beat only', () => {
  const note: AbilityDef = {
    ...OPENER,
    id: 'test_red_note',
    channelTicks: 48,
    pulseEveryTicks: 16,
    aftermath: { fieldTicks: 40, damage: 1 },
    vs: { status: 'bleed', mult: 1.5, consume: true },
  };
  const quiet = masteredHandQuietBeat(note);
  assert.equal(quiet.aftermath, undefined);
  assert.equal(quiet.vs?.consume, false);
  assert.equal(quiet.vs?.mult, 1.5, 'the quiet beats still READ the wound');
  assert.equal(masteredHandQuietBeat(OPENER), OPENER, 'an art with nothing to hold back is itself');
  const { self, player, casts } = slate();
  const action = { kind: 'channel', slot: 0, ab: note, style: 'arx', level: 50, powerMult: 1, every: 16, ticksLeft: 48, total: 48 };
  self.channelPulse.call(self, 1, player, action, 0);
  action.ticksLeft = 16;
  self.channelPulse.call(self, 1, player, action, 0);
  assert.equal(casts[0]!.ab.aftermath, undefined, 'the first beat leaves nothing');
  assert.equal(casts[1]!.ab.aftermath, note.aftermath, 'the last beat leaves the ground');
  assert.equal(casts[1]!.ab.vs?.consume, true, 'and spends the wound');
});

test('THE LAST PULSE: a pulse train and a flurry carry the aftermath and the consume on their final pulse only', () => {
  const pos = { plane: 0, x: 0, y: 0, dir: 0 };
  const self = {
    tickCount: 100,
    positions: { get: () => pos, must: () => pos },
    players: { get: () => undefined },
    pendingBlasts: [] as Array<Record<string, unknown>>,
    broadcastFx: () => undefined,
    castAbility: proto3.castAbility,
  };
  const train: AbilityDef = {
    ...OPENER,
    id: 'test_train',
    shape: 'pulse_nova',
    pulses: 3,
    pulseEveryTicks: 8,
    aftermath: { fieldTicks: 40, damage: 2 },
    vs: { status: 'sunder', mult: 1.5, consume: true },
  };
  self.castAbility.call(self, 1, train, 0, 'arx', 50, false);
  assert.equal(self.pendingBlasts.length, 3);
  assert.deepEqual(
    self.pendingBlasts.map((b) => [!!b.aftermath, (b.vs as { consume: boolean }).consume]),
    [
      [false, false],
      [false, false],
      [true, true],
    ],
  );
  assert.equal((self.pendingBlasts[2]!.aftermath as { damage: number }).damage, Math.round(2 * (1 + 50 * 0.05)), 'the field scales like the art');
  self.pendingBlasts.length = 0;
  const flurry: AbilityDef = { ...train, id: 'test_flurry', shape: 'flurry', hits: 2 };
  self.castAbility.call(self, 1, flurry, 0, 'onehand', 50, false);
  assert.deepEqual(self.pendingBlasts.map((b) => !!b.aftermath), [false, true]);
});

test('THE AFTERMATH on a shot lands once: the first body, or where the shot dies', () => {
  const { self } = slate();
  const proj = {
    ownerEid: 1,
    style: 'archery',
    fromNpc: false,
    splashRadius: undefined,
    aftermath: { def: { fieldTicks: 60, damage: 2 }, damage: 3, abilityId: 'test_ember', color: '#f80' },
  };
  proto3.landAftermath.call(self, proj, { plane: 0, x: 4, y: 5 });
  assert.equal(self.activeFields.length, 1);
  const f = self.activeFields[0] as Record<string, unknown>;
  assert.equal(f.x, 4);
  assert.equal(f.radius, 1.4, 'a shot without splash leaves a stride of ground');
  assert.equal(f.damage, 3);
  proto3.landAftermath.call(self, proj, { plane: 0, x: 9, y: 9 });
  assert.equal(self.activeFields.length, 1, 'spent once');
});
