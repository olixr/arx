import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AFFLICTION_SOURCE_CAP, AFFLICTION_STACKS_SHIFT, SHOCK_MAX_TICKS, STATUS_BIT } from '@arx/shared';
import { GameServer } from './gameServer.js';

/**
 * THE TWO LANES (buildcraft Phase 1), pinned:
 *
 * - sparks keep the reaction grammar among THEMSELVES: a different
 *   spark detonates, and afflictions/sunder ride through the flash;
 * - afflictions never detonate and are never detonated;
 * - afflictions stack PER SOURCE: one entry per hand per id, the
 *   same hand refreshes its own wound, a pet is its own hand;
 * - at AFFLICTION_SOURCE_CAP the new source folds into the weakest
 *   entry by the max rules — no landed apply is ever eaten;
 * - sunder holds ONE entry, highest power wins;
 * - resist refuses every lane, weakness doubles every lane;
 * - the player door keeps the pre-lanes one-entry-per-id shape
 *   (player-side stacking would raise damage taken — a ledger call);
 * - statusBits carries the affliction count in the high nibble.
 *
 * All run on hand-built slates over GameServer.prototype (the
 * procDoors rig pattern).
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  applyStatusToNpc: AnyFn;
  applyStatusToPlayer: AnyFn;
  statusBits: AnyFn;
};

const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

interface Entry {
  id: string;
  power: number;
  ticksLeft: number;
  sourceEid: number;
  stunLeft?: number;
  fromPet?: boolean;
}

function npcSlate(def: Record<string, unknown> = {}) {
  const hits: Array<{ eid: unknown; dmg: unknown }> = [];
  const fx: Array<{ text?: string }> = [];
  const statuses = new Map<number, Entry[]>();
  const s = {
    npcs: new Map([[9, { def: { radius: 0.4, ...def } }]]),
    actors: new Map(),
    positions: new Map([[9, { x: 0, y: 0, dir: 0 }]]),
    statuses,
    broadcastFx: (m: { text?: string }) => fx.push(m),
    damageNpc: (eid: unknown, dmg: unknown) => hits.push({ eid, dmg }),
    applyStatusToNpc: proto.applyStatusToNpc,
    // The reaction rings walk the chunk index now (core-audit debt
    // 12); this slate stands one body and no index, so the honest
    // ring is empty — exactly what the old whole-map walk saw after
    // skipping the detonating body itself.
    forEachNpcNear: () => undefined,
  };
  return { s, statuses, hits, fx };
}

function lay(
  s: unknown,
  status: string,
  power: number,
  durationTicks: number,
  source = 1,
  fromPet = false,
): void {
  call(proto.applyStatusToNpc, s, 9, { status, power, durationTicks }, source, 'onehand', fromPet);
}

const riding = (statuses: Map<number, Entry[]>): Entry[] => statuses.get(9) ?? [];
const ids = (statuses: Map<number, Entry[]>): string[] => riding(statuses).map((e) => e.id).sort();

test('a spark detonates a different spark; the wounds ride through the flash', () => {
  const { s, statuses, hits, fx } = npcSlate();
  lay(s, 'burn', 3, 100);
  lay(s, 'venom', 2, 300, 2);
  lay(s, 'sunder', 15, 60);
  assert.equal(hits.length, 0, 'coexistence is not a detonation');
  lay(s, 'chill', 0, 100);
  assert.equal(hits.length, 1, 'the riding burn detonated');
  assert.ok(fx.some((m) => m.text === 'Thermal Shock'), 'the pair speaks its name');
  // Both sparks are consumed in the flash (the pre-lanes law holds);
  // the wounds and the mark ride through untouched.
  assert.deepEqual(ids(statuses), ['sunder', 'venom'], 'the flash took only the sparks');
});

test('Shatter still stuns: the reaction re-applies a hard shock', () => {
  const { s, statuses, hits } = npcSlate();
  lay(s, 'chill', 0, 100);
  lay(s, 'shock', 2, 40);
  assert.equal(hits.length, 1, 'the pair detonated');
  const shock = riding(statuses).find((e) => e.id === 'shock');
  assert.ok(shock, 'the stun rides as a fresh shock');
  assert.equal(shock.stunLeft, SHOCK_MAX_TICKS);
  assert.ok(!riding(statuses).some((e) => e.id === 'chill'), 'the chill was consumed');
});

test('afflictions never detonate and are never detonated', () => {
  const { s, statuses, hits } = npcSlate();
  lay(s, 'bleed', 2, 100);
  lay(s, 'burn', 3, 100);
  assert.equal(hits.length, 0, 'a spark landing on a wound is no reaction');
  lay(s, 'venom', 2, 100, 2);
  assert.equal(hits.length, 0, 'a wound landing on a spark is no reaction');
  assert.deepEqual(ids(statuses), ['bleed', 'burn', 'venom'], 'all three ride');
});

test('afflictions stack per source; the same hand refreshes its own wound', () => {
  const { s, statuses } = npcSlate();
  lay(s, 'venom', 3, 100, 1);
  lay(s, 'venom', 5, 80, 2);
  assert.equal(riding(statuses).length, 2, 'two hands, two wounds');
  lay(s, 'venom', 2, 200, 1);
  const mine = riding(statuses).filter((e) => e.sourceEid === 1);
  assert.equal(riding(statuses).length, 2, 'the same hand never self-stacks');
  assert.equal(mine.length, 1);
  assert.equal(mine[0]!.power, 3, 'power refreshes by max, never down');
  assert.equal(mine[0]!.ticksLeft, 200, 'duration refreshes by max');
});

test('a pet is its own hand', () => {
  const { s, statuses } = npcSlate();
  lay(s, 'venom', 3, 100, 1, false);
  lay(s, 'venom', 3, 100, 1, true);
  assert.equal(riding(statuses).length, 2, 'hunter and hound each hold a wound');
});

test('at the cap a new source folds into the weakest wound — nothing is eaten', () => {
  const { s, statuses } = npcSlate();
  for (let src = 1; src <= AFFLICTION_SOURCE_CAP; src++) lay(s, 'bleed', src, 100, src);
  assert.equal(riding(statuses).length, AFFLICTION_SOURCE_CAP);
  lay(s, 'bleed', 9, 250, 99);
  assert.equal(riding(statuses).length, AFFLICTION_SOURCE_CAP, 'the cap holds');
  const weakest = riding(statuses).find((e) => e.sourceEid === 1);
  assert.equal(weakest?.power, 9, 'the late blow deepened the weakest wound');
  assert.equal(weakest?.ticksLeft, 250);
});

test('sunder holds one entry and the highest power wins', () => {
  const { s, statuses, hits } = npcSlate();
  lay(s, 'sunder', 12, 100);
  lay(s, 'sunder', 18, 50, 2);
  lay(s, 'sunder', 10, 300, 3);
  const marks = riding(statuses).filter((e) => e.id === 'sunder');
  assert.equal(marks.length, 1, 'the mark never self-stacks');
  assert.equal(marks[0]!.power, 18, 'highest wins');
  assert.equal(marks[0]!.ticksLeft, 300, 'the crack stays open by max');
  assert.equal(hits.length, 0, 'the mark is no reaction fuel');
});

test('resist refuses every lane at the door', () => {
  const { s, statuses, fx } = npcSlate({ resist: ['venom', 'sunder'] });
  lay(s, 'venom', 3, 100);
  lay(s, 'sunder', 15, 100);
  assert.equal(riding(statuses).length, 0, 'nothing landed');
  assert.equal(fx.filter((m) => m.text === 'Resist').length, 2);
});

test('weakness doubles the wound and stretches it', () => {
  const { s, statuses } = npcSlate({ weak: ['bleed'] });
  lay(s, 'bleed', 3, 100);
  const wound = riding(statuses)[0]!;
  assert.equal(wound.power, 6);
  assert.equal(wound.ticksLeft, 150);
});

test('the player door keeps the pre-lanes shape: one entry per id, refresh by max', () => {
  const statuses = new Map<number, Entry[]>();
  const s = { statuses };
  call(proto.applyStatusToPlayer, s, 5, { status: 'bleed', power: 3, durationTicks: 100 }, 11);
  call(proto.applyStatusToPlayer, s, 5, { status: 'bleed', power: 5, durationTicks: 60 }, 22);
  const list = statuses.get(5)!;
  assert.equal(list.length, 1, 'a pack of wolves is still one bleed');
  assert.equal(list[0]!.power, 5);
  assert.equal(list[0]!.ticksLeft, 100);
});

test('statusBits carries the affliction count in the high nibble', () => {
  const statuses = new Map<number, Entry[]>([
    [
      7,
      [
        { id: 'burn', power: 2, ticksLeft: 50, sourceEid: 1 },
        { id: 'bleed', power: 2, ticksLeft: 50, sourceEid: 1 },
        { id: 'bleed', power: 3, ticksLeft: 50, sourceEid: 2 },
        { id: 'venom', power: 2, ticksLeft: 50, sourceEid: 3 },
        { id: 'sunder', power: 15, ticksLeft: 50, sourceEid: 1 },
      ],
    ],
  ]);
  const s = { statuses, players: new Map(), npcs: new Map(), actors: new Map() };
  const bits = call(proto.statusBits, s, 7) as number;
  assert.ok(bits & STATUS_BIT.burn && bits & STATUS_BIT.bleed, 'flags still fly');
  assert.ok(bits & STATUS_BIT.sunder, 'the mark reaches the wire');
  assert.equal((bits >> AFFLICTION_STACKS_SHIFT) & 0xf, 3, 'three wounds counted');
});
