import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpForLevel } from '@arx/shared';
import { GameServer } from './gameServer.js';

/**
 * RANK IS A CHOICE YOU AFFORD (callings-v2, Phase 4) — the server-side
 * laws on hand-built slates:
 *
 * - focusUsed prices every answer at its APPLIED rank;
 * - sanitizeCallings brings an over-held set back inside the law by
 *   LOWERING before setting down: entitlement caps first, then the
 *   deepest applied rank steps down one at a time, and only at rank I
 *   across the board is a seat set down (the costliest first) — never
 *   greedy-arbitrary, and a founding (rank-I, in-budget) set is never
 *   touched;
 * - setCalling refuses a rank past the entitlement with the honest
 *   line, re-prices in place on a re-answer, and never overdrafts.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  focusUsed: AnyFn;
  sanitizeCallings: AnyFn;
  setCalling: AnyFn;
  callingsMessage: AnyFn;
};
const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

// Two shipped seats: prospector (mining 20, cost 1), deep_lungs (mining 60, cost 2).
function slate(miningLevel: number, callings: Array<[string, number]>) {
  const saved: Array<[string, number]> = [];
  const deleted: string[] = [];
  const player = {
    characterId: 7,
    skills: { mining: xpForLevel(miningLevel) },
    callings: new Map(callings),
  };
  const s = {
    accounts: {
      saveCalling: (_c: number, id: string, rank: number) => saved.push([id, rank]),
      deleteCalling: (_c: number, id: string) => deleted.push(id),
    },
    focusUsed: proto.focusUsed,
    sanitizeCallings: proto.sanitizeCallings,
  };
  return { s, player, saved, deleted };
}

test('focusUsed prices the applied rank: seat + one per rank past I', () => {
  const { s, player } = slate(99, [
    ['prospector', 1],
    ['deep_lungs', 3],
  ]);
  assert.equal(call(proto.focusUsed, s, player), 1 + (2 + 2));
});

test('sanitize: a founding rank-I set inside the budget is untouched', () => {
  // mining 60: budget = 2 + 25 + 50 = 4; prospector 1 + deep_lungs 2 = 3.
  const { s, player, saved, deleted } = slate(60, [
    ['prospector', 1],
    ['deep_lungs', 1],
  ]);
  call(proto.sanitizeCallings, s, player);
  assert.deepEqual([...player.callings], [['prospector', 1], ['deep_lungs', 1]]);
  assert.equal(saved.length + deleted.length, 0, 'no row moved');
});

test('sanitize: an applied rank past the entitlement is LOWERED, not set down', () => {
  // mining 30: prospector entitlement = I (rank II needs 35); held at III.
  const { s, player, saved } = slate(30, [['prospector', 3]]);
  call(proto.sanitizeCallings, s, player);
  assert.equal(player.callings.get('prospector'), 1, 'lowered to the earned rank');
  assert.deepEqual(saved, [['prospector', 1]], 'the row was re-saved at the cap');
});

test('sanitize: over budget, the deepest rank steps down first; seats fall only at rank I', () => {
  // mining 99: budget = 2 + 4 = 6. Held: prospector IV (cost 4) + deep_lungs III (cost 4) = 8.
  const { s, player, deleted } = slate(99, [
    ['prospector', 4],
    ['deep_lungs', 3],
  ]);
  call(proto.sanitizeCallings, s, player);
  // Step 1: prospector IV→III (7). Step 2: tie at III — costlier seat
  // (deep_lungs 4 vs prospector 3) steps III→II (6). Inside budget.
  assert.equal(player.callings.get('prospector'), 3);
  assert.equal(player.callings.get('deep_lungs'), 2);
  assert.equal(deleted.length, 0, 'nothing was set down when lightening would do');
});

test('setCalling refuses an unearned rank with the honest line, re-prices in place otherwise', () => {
  const lines: string[] = [];
  const player = {
    characterId: -1,
    skills: { mining: xpForLevel(50) }, // prospector entitlement III (35=II, 50=III)
    callings: new Map<string, number>([['prospector', 1]]),
    session: { sendJson: (m: { t: string; text?: string }) => m.t === 'chat' && lines.push(m.text ?? '') },
  };
  const s = {
    players: new Map([[1, player]]),
    focusUsed: proto.focusUsed,
    callingsMessage: proto.callingsMessage,
    setCalling: proto.setCalling,
    recomputeGear: () => {},
    sendCooldowns: () => {},
    sendCharges: () => {},
    accounts: { saveCalling: () => {}, deleteCalling: () => {} },
  };
  call(proto.setCalling, s, 1, 'prospector', true, 4);
  assert.equal(player.callings.get('prospector'), 1, 'Rank IV is not earned at 50');
  assert.match(lines.at(-1) ?? '', /honed to Rank III/);
  assert.match(lines.at(-1) ?? '', /level 65/, 'the line names the level Rank IV waits on');
  call(proto.setCalling, s, 1, 'prospector', true, 3);
  assert.equal(player.callings.get('prospector'), 3, 're-answered deeper in place');
  // Budget at mining 50 = 2 + 2 = 4; prospector III costs 3. deep_lungs (60) is locked anyway;
  // deepen prospector no further (cap). Lighten back to I:
  call(proto.setCalling, s, 1, 'prospector', true, 1);
  assert.equal(player.callings.get('prospector'), 1);
});
