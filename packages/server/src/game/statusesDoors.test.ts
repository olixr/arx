import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AFFLICTION_STACKS_SHIFT, COUNT_STACKS_SHIFT, SHEATHED_BIT, SNEAK_DETECTED_BIT, SNEAK_HIDDEN_BIT, STATUS_BIT, pageOf } from '@arx/shared';
import { GameServer } from './gameServer.js';
import * as statusSys from './statuses.js';

/**
 * THE BOOK OF STATES' DOOR (core audit 2026-09, Band A): statusBits
 * called on the module directly and through the class delegator
 * must agree byte for byte — the wire's one status byte is read by
 * every client, so a diverged delegator would be a silent lie on
 * every snapshot.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

function slate() {
  return {
    statuses: new Map<number, Array<{ id: string; stacks?: number }>>(),
    players: new Map<number, { hidden?: boolean; sheathed?: boolean }>(),
    chasedPlayers: new Set<number>(),
    npcs: new Map<number, { state: string; sheathePref?: boolean }>(),
    actors: new Map<number, unknown>(),
  };
}

const bits = (s: ReturnType<typeof slate>, eid: number) => statusSys.statusBits(s as unknown as GameServer, eid);
const bitsViaClass = (s: ReturnType<typeof slate>, eid: number) => (proto.statusBits as Fn).call(s, eid as never) as number;

test('statusBits direct: page bits plus the two honest nibbles (perSource count, count-model depth)', () => {
  const s = slate();
  // burn is a refresh page (no nibble); a perSource page counts entries;
  // a count page carries its own depth. Pick them from the book so the
  // test follows the pages, not a guess.
  const ids = Object.keys(STATUS_BIT) as Array<keyof typeof STATUS_BIT>;
  const perSource = ids.find((id) => pageOf(id).stacking.model === 'perSource');
  const counted = ids.find((id) => pageOf(id).stacking.model === 'count');
  assert.ok(perSource && counted, 'the book has both models');
  s.statuses.set(5, [{ id: 'burn' }, { id: perSource }, { id: perSource }, { id: counted, stacks: 3 }]);
  const expected =
    STATUS_BIT.burn | STATUS_BIT[perSource] | STATUS_BIT[counted] | (2 << AFFLICTION_STACKS_SHIFT) | (3 << COUNT_STACKS_SHIFT);
  assert.equal(bits(s, 5), expected);
  assert.equal(bitsViaClass(s, 5), expected);
  assert.equal(bits(s, 6), 0, 'no ledger, no player, no npc: a clean byte');
});

test('statusBits: a player\'s stealth and sheathe ride the same byte, owner-side truths', () => {
  const s = slate();
  s.players.set(1, { hidden: true, sheathed: true });
  s.chasedPlayers.add(1);
  const expected = SNEAK_HIDDEN_BIT | SNEAK_DETECTED_BIT | SHEATHED_BIT;
  assert.equal(bits(s, 1), expected);
  assert.equal(bitsViaClass(s, 1), expected);
  s.players.set(2, {});
  assert.equal(bits(s, 2), 0);
});

test('statusBits: an NPC stows only while wary or idle; a bodiless actor always; a plain mob never', () => {
  const s = slate();
  s.npcs.set(10, { state: 'idle', sheathePref: true });
  s.npcs.set(11, { state: 'suspicious', sheathePref: true });
  s.npcs.set(12, { state: 'chase', sheathePref: true });
  s.npcs.set(13, { state: 'idle' });
  s.actors.set(14, {});
  const table = [10, 11, 12, 13, 14].map((e) => [e, bits(s, e)]);
  assert.deepEqual(table, [
    [10, SHEATHED_BIT],
    [11, SHEATHED_BIT],
    [12, 0],
    [13, 0],
    [14, SHEATHED_BIT],
  ]);
  assert.deepEqual(table.map(([e]) => [e, bitsViaClass(s, e!)]), table);
});
