import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artFlag, xpForLevel } from '@arx/shared';
import { abilityDef, channelBeats } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE HELD NOTE's server laws, pinned: a channeled art's press pays
 * the whole price at the first note and strikes it at once; the note
 * pulses its shape on its beat with LIVE aim (or a staked point);
 * breaks forfeit the remainder and refund nothing; the singing slot's
 * own re-press ends the note, any other slot's cast takes the hands.
 * Same slate discipline as castEngine.test.ts — private GameServer
 * methods over a hand-built slate, real content.
 *
 * Content facts leaned on: 'maelstrom' is the arx rung-45 art and THE
 * HELD NOTE's pilot (channelTicks 48, pulseEveryTicks 16, cooldown
 * 260, rank IV holds 64); 'heavy_slam' is the onehand rung-5 instant.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  tryCastAbility: Fn;
  beginChannel: Fn;
  tickChannel: Fn;
  cancelCasting: Fn;
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
  action: { kind: string; slot?: number } | null;
  poseUntilTick: number;
  lastCombatAt: number;
}

function mkPlayer(over: Partial<FakePlayer> = {}): FakePlayer {
  return {
    techniques: ['maelstrom', null],
    flags: new Map(),
    skills: { arx: xpForLevel(50), onehand: xpForLevel(60) },
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
    effectiveLevel: () => 50,
    cancelAction: (_eid: unknown, p: FakePlayer, reason?: string) => {
      if (!p.action) return;
      p.action = null;
      p.session.sendJson({ t: 'action', state: 'stop', reason });
    },
    castAbility: (_eid: unknown, ab: { id: string }, aim: number, ...rest: unknown[]) => {
      casts.push({ ab, aim, targetPos: rest[3] as { x: number; y: number } | undefined });
    },
    techSeat: (slot: number) => (slot === 0 ? 0 : slot === 2 ? 1 : null),
    masteredArt: (p: FakePlayer, ability: string) => p.flags.has(artFlag(ability)),
    equippedArtIds: () => new Set<string>(),
    tryCastAbility: proto.tryCastAbility,
    beginChannel: proto.beginChannel,
    channelPulse: proto.channelPulse,
    tickChannel: proto.tickChannel,
    cancelCasting: proto.cancelCasting,
    fireAbility: proto.fireAbility,
    slotAbility: proto.slotAbility,
    seatAbility: proto.seatAbility,
    seatDormant: proto.seatDormant,
  };
  return { self, sent, casts, pos };
}

test('the press pays at the first note and strikes it at once', () => {
  const player = mkPlayer();
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0.5);
  assert.equal(player.action?.kind, 'channel', 'the note stands on the action rail');
  assert.equal(player.abilityCd[0], 260, 'the cooldown pays at the start');
  assert.equal(casts.length, 1, 'the first beat lands with the press');
  const start = sent.find((m) => m.t === 'action');
  assert.ok(
    start &&
      start.state === 'start' &&
      start.ticks === 48 &&
      start.ability === 'maelstrom' &&
      start.slot === 0,
    'the rail wire names the art, the slot, and the length',
  );
});

test('the note pulses on its beat and closes done', () => {
  const player = mkPlayer();
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  let ticks = 0;
  while (player.action && ticks < 200) {
    self.tickChannel.call(self, 1, player);
    ticks++;
  }
  assert.equal(ticks, 48, 'the note sings its authored length');
  assert.equal(
    casts.length,
    channelBeats(abilityDef('maelstrom')!),
    'the beat count is the model’s beat count — the contract and the game agree',
  );
  const stop = sent.filter((m) => m.t === 'action').at(-1);
  assert.ok(stop && stop.state === 'stop' && stop.reason === 'done', 'the note closes done');
});

test('the singing slot’s re-press ends the note; the forfeit refunds nothing', () => {
  const player = mkPlayer();
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  self.tickChannel.call(self, 1, player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  assert.equal(player.action, null, 'the re-press lets the note go');
  assert.equal(player.abilityCd[0], 260, 'the paid cooldown stands — the forfeit is the price');
  assert.equal(casts.length, 1, 'only the beats already sung ever landed');
  const stop = sent.filter((m) => m.t === 'action').at(-1);
  assert.ok(stop && stop.state === 'stop' && stop.reason === 'cancelled');
  // And the slot stays shut behind its paid cooldown.
  self.tryCastAbility.call(self, 1, player, 0, 0);
  assert.equal(player.action, null, 'no restart through a paid cooldown');
});

test('another slot’s cast takes the hands: the channel yields with reason cast', () => {
  const player = mkPlayer({ techniques: ['maelstrom', 'heavy_slam'] });
  const { self, sent, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0);
  assert.equal(player.action?.kind, 'channel');
  self.tryCastAbility.call(self, 1, player, 2, 0);
  assert.equal(player.action, null, 'the new cast took the hands');
  const stop = sent.filter((m) => m.t === 'action').at(-1);
  assert.ok(stop && stop.state === 'stop' && stop.reason === 'cast');
  assert.equal(casts.at(-1)?.ab.id, 'heavy_slam', 'and the new art fired');
});

test('the aim is live: each beat reads the caster’s facing', () => {
  const player = mkPlayer();
  const { self, casts, pos } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0.25);
  assert.equal(casts[0]!.aim, 0.25, 'the first beat sings the press aim');
  pos.dir = 2.5; // the stick steers mid-note
  for (let i = 0; i < 16; i++) self.tickChannel.call(self, 1, player);
  assert.equal(casts.length, 2, 'the second beat landed');
  assert.equal(casts[1]!.aim, 2.5, 'and it follows the live facing');
});

test('THE HELD SIGIL composes: a staked point rides every beat', () => {
  const player = mkPlayer();
  const { self, casts } = slate(player);
  self.tryCastAbility.call(self, 1, player, 0, 0, { x: 5, y: 0 });
  for (let i = 0; i < 16; i++) self.tickChannel.call(self, 1, player);
  assert.equal(casts.length, 2);
  for (const c of casts) {
    assert.deepEqual(c.targetPos, { x: 5, y: 0 }, 'the promise holds beat after beat');
  }
});

test('content pins the pilot: maelstrom holds the note', () => {
  const ab = abilityDef('maelstrom')!;
  assert.equal(ab.channelTicks, 48, 'the pilot holds 2.4s');
  assert.equal(ab.pulseEveryTicks, 16, 'one drag of the drain per beat');
  assert.equal(channelBeats(ab), 3, 'three beats: press, and two more');
  assert.ok(ab.damage >= 3, 'a damage art in the model’s eyes — never a hidden utility');
});
