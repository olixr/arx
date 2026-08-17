import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';

/**
 * THE WHEN CLAUSE's door laws (callings-v2, Phase 3), pinned on
 * hand-built slates over GameServer.prototype (the procDoors rig
 * pattern):
 *
 * - a true condition HOLDS a calling-channel grant: pushed on the
 *   rising edge, re-armed ahead of the sweep while held, removed
 *   crisply on the falling edge;
 * - the hp conditions carry hysteresis — a bar bouncing on the line
 *   cannot strobe the grant;
 * - a set-down calling's grants are stale the next tick and die;
 * - speed-bearing edges mark the ride mirror, chip edges send buffs;
 * - the chip row speaks held grants as 'calling' chips and honors
 *   `quiet`.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  tickCallingWhens: AnyFn;
  whenHolds: AnyFn;
  sendBuffs: AnyFn;
  describeBuff: AnyFn;
  equippedShield: AnyFn;
};

const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

interface SlateBuff {
  channel?: string;
  whenKey?: string;
  name?: string;
  untilTick: number;
  speedMult: number;
  armor: number;
  quiet?: boolean;
}

function whenSlate(hp = 100) {
  const sent: string[] = [];
  const health = { hp, maxHp: 100 };
  const player = {
    stillTicks: 0,
    buffs: [] as SlateBuff[],
    callingWhens: [] as Array<{ key: string; cond: unknown; grant: unknown }>,
    whenEngaged: new Set<string>(),
  };
  const s = {
    tickCount: 100,
    healths: new Map([[1, health]]),
    positions: new Map([[1, { plane: 'surface', x: 0, y: 0, dir: 0 }]]),
    statuses: new Map(),
    rideDirty: new Set(),
    timeOfsTicks: 0,
    tickCallingWhens: proto.tickCallingWhens,
    whenHolds: proto.whenHolds,
    equippedShield: proto.equippedShield,
    sendBuffs: () => sent.push('buffs'),
  };
  return { s, player, health, sent };
}

test('a true condition holds its grant: pushed, re-armed, removed on the falling edge', () => {
  const { s, player, health, sent } = whenSlate(20);
  player.callingWhens = [
    { key: 'test#0', cond: { when: 'hpBelow', frac: 0.3 }, grant: { name: 'Last Stand', armor: 8 } },
  ];
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 1, 'the rising edge pushed the grant');
  assert.equal(player.buffs[0]!.armor, 8);
  assert.equal(player.buffs[0]!.channel, 'calling');
  assert.equal(player.buffs[0]!.whenKey, 'test#0');
  assert.equal(player.buffs[0]!.untilTick, 110, 're-armed ahead of the sweep');
  assert.equal(sent.length, 1, 'the edge sent the chips');

  // Held: the clock re-arms, no re-push, no re-send.
  s.tickCount = 105;
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 1);
  assert.equal(player.buffs[0]!.untilTick, 115, 'the held grant walks ahead of the sweep');
  assert.equal(sent.length, 1, 'a quiet hold sends nothing');

  // The falling edge removes crisply (well past the hysteresis band).
  health.hp = 90;
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 0, 'the falling edge removed the grant');
  assert.equal(sent.length, 2, 'and sent the chips');
});

test('the hp hysteresis: a bar bouncing on the line cannot strobe the grant', () => {
  const { s, player, health } = whenSlate(31);
  player.callingWhens = [
    { key: 'test#0', cond: { when: 'hpBelow', frac: 0.3 }, grant: { name: 'Grit', armor: 4 } },
  ];
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 0, '31% is above the line: no grant');
  health.hp = 30;
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 1, 'the line engages at its own number');
  // A small heal to just above the line: inside the release band, held.
  health.hp = 33;
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 1, '33% is inside the band: still held');
  // Past the band: released.
  health.hp = 36;
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 0, '36% is past the band: released');
  // And re-engaging needs the true line again, not the band's edge.
  health.hp = 33;
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 0, '33% does not re-engage: the line is the line');
});

test('a set-down calling leaves no orphan: stale grants die on the next pass', () => {
  const { s, player } = whenSlate(100);
  player.buffs.push({
    channel: 'calling',
    whenKey: 'gone#0',
    name: 'Orphan',
    untilTick: 9999,
    speedMult: 1.1,
    armor: 0,
  });
  // The calling was set down: recomputeGear rebuilt callingWhens empty.
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 0, 'the stale grant died');
  assert.equal((s.rideDirty as Set<unknown>).size, 1, 'its speed marked the ride mirror');
});

test('the still and moving conditions split on the planted-stance clock', () => {
  const { s, player } = whenSlate(100);
  player.callingWhens = [
    { key: 'a#0', cond: { when: 'still' }, grant: { name: 'Rooted Guard', armor: 5 } },
    { key: 'b#0', cond: { when: 'moving' }, grant: { name: 'March', armor: 2 } },
  ];
  player.stillTicks = 0;
  call(proto.tickCallingWhens, s, 1, player);
  assert.deepEqual(
    player.buffs.map((b) => b.name),
    ['March'],
    'a moving body marches',
  );
  player.stillTicks = 12; // STILL_ARMOR_TICKS — Bulwark's own boundary
  call(proto.tickCallingWhens, s, 1, player);
  assert.deepEqual(
    player.buffs.map((b) => b.name),
    ['Rooted Guard'],
    'the planted stance swaps the pair on the same clock',
  );
});

test('wellFed reads the food channel; stateRiding reads the body', () => {
  const { s, player } = whenSlate(100);
  player.callingWhens = [
    { key: 'a#0', cond: { when: 'wellFed' }, grant: { name: 'Full Belly', regenPer4s: 1 } },
    { key: 'b#0', cond: { when: 'stateRiding', status: 'quicken' }, grant: { name: 'Riding High', critPct: 3 } },
  ];
  call(proto.tickCallingWhens, s, 1, player);
  assert.equal(player.buffs.length, 0);
  player.buffs.push({ channel: 'food', untilTick: 9999, speedMult: 1, armor: 0, name: 'Stew' });
  (s.statuses as Map<number, unknown>).set(1, [{ id: 'quicken', power: 0, ticksLeft: 40, sourceEid: 1 }]);
  call(proto.tickCallingWhens, s, 1, player);
  assert.deepEqual(
    player.buffs
      .filter((b) => b.channel === 'calling')
      .map((b) => b.name)
      .sort(),
    ['Full Belly', 'Riding High'],
  );
});

test("the chip row speaks held grants as 'calling' chips and honors quiet", () => {
  const jsons: Array<{ t: string; buffs: Array<{ id: string; channel: string; secsLeft: number }> }> = [];
  const player = {
    eid: 1,
    gear: { attackSpeedMult: 1 },
    buffs: [
      {
        channel: 'calling',
        whenKey: 'loud#0',
        name: 'Held Grant',
        untilTick: 9999,
        speedMult: 1,
        attackSpeedMult: 1,
        shieldHp: 0,
        meleeLifesteal: 0,
        armor: 6,
        reflectFrac: 0,
        offhandWeight: 0,
        gatherSpeed: 1,
        regenPer4s: 0,
        critPct: 0,
        dmgMult: 1,
        beastTruce: false,
        beastPart: 0,
      },
      {
        channel: 'calling',
        whenKey: 'shy#0',
        name: 'Quiet Grant',
        quiet: true,
        untilTick: 9999,
        speedMult: 1,
        attackSpeedMult: 1,
        shieldHp: 0,
        meleeLifesteal: 0,
        armor: 2,
        reflectFrac: 0,
        offhandWeight: 0,
        gatherSpeed: 1,
        regenPer4s: 0,
        critPct: 0,
        dmgMult: 1,
        beastTruce: false,
        beastPart: 0,
      },
    ],
    session: { sendJson: (m: unknown) => jsons.push(m as (typeof jsons)[number]) },
  };
  const s = {
    tickCount: 100,
    statuses: new Map(),
    sendBuffs: proto.sendBuffs,
    describeBuff: proto.describeBuff,
  };
  call(proto.sendBuffs, s, player);
  assert.equal(jsons.length, 1);
  const chips = jsons[0]!.buffs;
  assert.equal(chips.length, 1, 'the quiet grant stayed off the HUD');
  assert.equal(chips[0]!.id, 'calling:loud#0');
  assert.equal(chips[0]!.channel, 'calling');
});
