import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACTIONS } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE ONE DOOR under test: creditStanding/creditDeed called on a
 * minimal fake host — persistence, wire, and availability edges
 * spied, the arithmetic and ceremony law asserted for real.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  creditStanding: AnyFn;
  creditDeed: AnyFn;
  factionForPlace: AnyFn;
  answerFactionGate: AnyFn;
};

interface FakePlayer {
  characterId: number;
  standing: Map<string, number>;
  repSig: string;
  flags: Map<string, number>;
  session: { sendJson: (m: Record<string, unknown>) => void } | null;
}

function rig(characterId = 7): {
  s: Record<string, unknown>;
  p: FakePlayer;
  msgs: Record<string, unknown>[];
  saved: Array<[string, number]>;
  pushes: { rep: number; avail: number };
} {
  const msgs: Record<string, unknown>[] = [];
  const saved: Array<[string, number]> = [];
  const pushes = { rep: 0, avail: 0 };
  const p: FakePlayer = {
    characterId,
    standing: new Map(),
    repSig: '',
    flags: new Map(),
    session: { sendJson: (m) => msgs.push(m) },
  };
  const s: Record<string, unknown> = {
    accounts: { saveStanding: (_c: number, f: string, v: number) => saved.push([f, v]) },
    pushRep: () => pushes.rep++,
    pushQuestAvail: () => pushes.avail++,
    creditStanding: proto.creditStanding,
    creditDeed: proto.creditDeed,
    factionForPlace: proto.factionForPlace,
  };
  return { s, p, msgs, saved, pushes };
}

const call = (s: Record<string, unknown>, fn: AnyFn, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(s, ...args);

test('a delta persists, prints its quiet line, and pushes the patch', () => {
  const { s, p, msgs, saved, pushes } = rig();
  call(s, proto.creditStanding, p, 'fordgate', 6);
  assert.equal(p.standing.get('fordgate'), 6);
  assert.deepEqual(saved, [['fordgate', 6]]);
  assert.ok(
    msgs.some((m) => m.t === 'chat' && String(m.text).includes('The Amberford Charter +6')),
  );
  assert.equal(pushes.rep, 1);
  // No band crossed (6 is still neutral): no ceremony, no re-answer.
  assert.ok(!msgs.some((m) => m.t === 'repevent'));
  assert.equal(pushes.avail, 0);
});

test('a band crossing fires the ONE ceremony and re-answers quests', () => {
  const { s, p, msgs, pushes } = rig();
  call(s, proto.creditStanding, p, 'crown', FACTIONS.bands.known);
  const ev = msgs.find((m) => m.t === 'repevent');
  assert.ok(ev, 'band crossing fires repevent');
  assert.equal(ev!.band, 'known');
  assert.equal(ev!.rose, true);
  assert.equal(pushes.avail, 1);
});

test('the clamp holds and a zero-move credits nothing', () => {
  const { s, p, saved } = rig();
  call(s, proto.creditStanding, p, 'crown', 250);
  assert.equal(p.standing.get('crown'), 100);
  call(s, proto.creditStanding, p, 'crown', 40); // already at the top
  assert.equal(saved.length, 1, 'a no-move writes nothing');
  call(s, proto.creditStanding, p, 'no_such_faction', 10);
  assert.equal(p.standing.size, 1, 'ghost factions are refused');
});

test('guests keep standing in memory only', () => {
  const { s, p, saved } = rig(-3);
  call(s, proto.creditStanding, p, 'rookery', 8);
  assert.equal(p.standing.get('rookery'), 8);
  assert.equal(saved.length, 0);
});

test('THE BORDER LAW rides creditDeed: first blood pays, grinding never', () => {
  const { s, p } = rig();
  call(s, proto.creditDeed, p, 'reavers', 'slayMember');
  const firstFord = p.standing.get('fordgate') ?? 0;
  const firstWay = p.standing.get('waykeepers') ?? 0;
  assert.ok(firstFord > 0 && firstWay > 0, 'first blood pays the lawful poles');
  call(s, proto.creditDeed, p, 'reavers', 'slayMember');
  assert.equal(p.standing.get('fordgate'), firstFord, 'an outlaw of the Company farms nothing');
  assert.equal(p.standing.get('waykeepers'), firstWay);
});

test('factionForPlace: town marches first, then the road faction', () => {
  const { s } = rig();
  // Beside Amberford's anchor (352, 24) — the charter's ground.
  assert.equal(call(s, proto.factionForPlace, 352, 30), 'fordgate');
  // Deep wild — the road's wardens.
  assert.equal(call(s, proto.factionForPlace, 448, 576), FACTIONS.roadFaction);
});

test('answerFactionGate reads the ledger by band', () => {
  const { s, p } = rig();
  p.standing.set('crown', FACTIONS.bands.trusted);
  assert.equal(call(s, proto.answerFactionGate, p, 'faction:crown:atleast:known'), true);
  assert.equal(call(s, proto.answerFactionGate, p, 'faction:crown:champion'), false);
  assert.equal(call(s, proto.answerFactionGate, p, 'faction:crown:atmost:suspect'), false);
  assert.equal(call(s, proto.answerFactionGate, p, 'faction:crown:nonsense'), false);
});
