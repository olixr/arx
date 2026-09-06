import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACTIONS, STANDING_CLAMP, crossDeltas, factionDef } from '@arx/content';
import { GameServer } from './gameServer.js';
import * as standingSys from './standing.js';
import type { PlayerComp } from './gameServer.js';

/**
 * THE STANDING LEDGER'S DOOR (core audit 2026-09, Band A): the module
 * function is called DIRECTLY on a hand-built slate and must land the
 * same result as the class delegator — a deleted or diverged
 * delegator fails here. THE ONE DOOR's own laws ride along: clamp,
 * persist-on-mutation, the quiet ledger line, the band ceremony as
 * the only repevent, the cross-pay that never re-crosses.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

function slate(characterId = 7) {
  const wire: Array<Record<string, unknown>> = [];
  const saves: Array<[number, string, number]> = [];
  const pushes: string[] = [];
  const player = {
    characterId,
    standing: new Map<string, number>(),
    session: { sendJson: (m: Record<string, unknown>) => wire.push(m) },
  };
  const s = {
    accounts: { saveStanding: (c: number, f: string, v: number) => saves.push([c, f, v]) },
    pushQuestAvail: () => pushes.push('avail'),
    pushRep: () => pushes.push('rep'),
    // THE STUB WINS THE DOOR: cross-pay re-enters through srv.*.
    creditStanding: proto.creditStanding,
  };
  return { s: s as unknown as GameServer, player: player as unknown as PlayerComp, raw: player, wire, saves, pushes };
}

const fordgate = factionDef('fordgate')!;

test('creditStanding direct: the ledger line, the save, the band ceremony (once), the rep push', () => {
  const f = slate();
  standingSys.creditStanding(f.s, f.player, 'fordgate', 20);
  assert.equal(f.raw.standing.get('fordgate'), 20);
  assert.deepEqual(f.saves, [[7, 'fordgate', 20]]);
  assert.deepEqual(f.wire, [
    { t: 'chat', channel: 'system', text: `${fordgate.name} +20 — word of it travels well.` },
    { t: 'repevent', faction: 'fordgate', name: fordgate.name, band: 'known', rose: true },
  ]);
  assert.deepEqual(f.pushes, ['avail', 'rep']);
  // Inside a band: the line and the rep push, no ceremony, no avail.
  standingSys.creditStanding(f.s, f.player, 'fordgate', 5);
  assert.deepEqual(f.wire.slice(2), [{ t: 'chat', channel: 'system', text: `${fordgate.name} +5 — word of it travels well.` }]);
  assert.deepEqual(f.pushes, ['avail', 'rep', 'rep']);
});

test('creditStanding direct === delegator: the same slate walks the same road', () => {
  const a = slate();
  const b = slate();
  standingSys.creditStanding(a.s, a.player, 'fordgate', -12.4);
  (proto.creditStanding as Fn).call(b.s, b.player as never, 'fordgate' as never, -12.4 as never);
  assert.deepEqual([...b.raw.standing], [...a.raw.standing]);
  assert.deepEqual(b.wire, a.wire);
  assert.deepEqual(b.saves, a.saves);
  assert.deepEqual(b.pushes, a.pushes);
  assert.equal(a.raw.standing.get('fordgate'), -12, 'rounded, then the mark');
  assert.equal((a.wire[0] as { text: string }).text, `${fordgate.name} −12 — the deed is marked.`);
});

test('creditStanding: the clamp, the zero no-op, the unknown faction, the guest who is never saved', () => {
  const f = slate();
  standingSys.creditStanding(f.s, f.player, 'fordgate', 500);
  assert.equal(f.raw.standing.get('fordgate'), STANDING_CLAMP);
  standingSys.creditStanding(f.s, f.player, 'fordgate', 1);
  assert.equal(f.saves.length, 1, 'at the clamp nothing moves, nothing saves');
  const before = f.wire.length;
  standingSys.creditStanding(f.s, f.player, 'fordgate', 0.4);
  standingSys.creditStanding(f.s, f.player, 'no_such_house', 10);
  assert.equal(f.wire.length, before);
  const g = slate(-1);
  standingSys.creditStanding(g.s, g.player, 'fordgate', 3);
  assert.equal(g.raw.standing.get('fordgate'), 3);
  assert.deepEqual(g.saves, [], 'a guest\'s standing lives only in the session');
  assert.equal(g.wire.length, 1);
});

test('creditDeed direct: the doc\'s value paid with cross, the null faction paid nothing; delegator identical', () => {
  const run = (via: 'module' | 'class') => {
    const f = slate();
    const calls: Array<[string, number, unknown]> = [];
    (f.s as unknown as Record<string, unknown>).creditStanding = (_p: unknown, fid: string, d: number, o: unknown) =>
      calls.push([fid, d, o]);
    if (via === 'module') {
      standingSys.creditDeed(f.s, f.player, null, 'bountyHonored');
      standingSys.creditDeed(f.s, f.player, 'fordgate', 'bountyHonored');
    } else {
      (proto.creditDeed as Fn).call(f.s, f.player as never, null as never, 'bountyHonored' as never);
      (proto.creditDeed as Fn).call(f.s, f.player as never, 'fordgate' as never, 'bountyHonored' as never);
    }
    return calls;
  };
  const viaModule = run('module');
  assert.deepEqual(viaModule, [['fordgate', FACTIONS.deeds.bountyHonored, { cross: true }]]);
  assert.deepEqual(run('class'), viaModule);
  // And the cross-pay itself, through the real door: the opposition
  // matrix is paid once and never re-crossed.
  const f = slate();
  const paid: Array<[string, number, unknown]> = [];
  const real = proto.creditStanding as unknown as (this: unknown, ...a: unknown[]) => void;
  (f.s as unknown as Record<string, unknown>).creditStanding = function (this: unknown, p: unknown, fid: string, d: number, o?: unknown) {
    paid.push([fid, d, o]);
    real.call(f.s, p, fid, d, o);
  };
  standingSys.creditStanding(f.s, f.player, 'fordgate', 5, { cross: true });
  const expected = crossDeltas('fordgate', 5, 0).map((c) => [c.faction, c.delta, undefined]);
  assert.deepEqual(paid, expected);
});
