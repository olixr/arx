import assert from 'node:assert/strict';
import { test } from 'node:test';
import { itemDef } from '@arx/content';
import { GameServer } from './gameServer.js';
import * as meleeSys from './melee.js';
import type { PlayerComp } from './gameServer.js';

/**
 * THE CUT'S DOORS (core audit 2026-09, Band A): the melee module's
 * pure reads — equippedWeapon and foeWithin — called directly and
 * through the class delegator on one slate, pinned equal. The swing
 * itself is proven in combatRhythm/strikes; these are the doors a
 * diverged delegator would quietly break.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

test('equippedWeapon direct: nothing worn → null; a weapon → its def with the rolled edge; delegator identical', () => {
  const bare = { equipment: {} } as unknown as PlayerComp;
  assert.equal(meleeSys.equippedWeapon({} as GameServer, bare), null);
  assert.equal((proto.equippedWeapon as Fn).call({}, bare as never), null);
  const sword = itemDef('bronze_sword');
  assert.ok(sword?.weapon, 'the test needs a weapon def');
  const armed = { equipment: { weapon: { id: 'bronze_sword', roll: { rar: 'common', seed: 3, pwr: 1 } } } } as unknown as PlayerComp;
  const direct = meleeSys.equippedWeapon({} as GameServer, armed)!;
  const viaClass = (proto.equippedWeapon as Fn).call({}, armed as never) as typeof direct;
  assert.equal(direct.id, 'bronze_sword');
  assert.ok(direct.weapon.damage > 0);
  assert.deepEqual(viaClass, direct);
  // A non-weapon in the hand reads as no weapon (the belt never swings).
  const odd = { equipment: { weapon: { id: 'carrot' } } } as unknown as PlayerComp;
  assert.equal(meleeSys.equippedWeapon({} as GameServer, odd), null);
});

function foeSlate() {
  const npcs = new Map<number, { def: { radius: number } }>();
  const pos = new Map<number, { x: number; y: number }>();
  const healths = new Map<number, { hp: number }>();
  const pets = new Set<number>();
  const companions = new Set<number>();
  const s = {
    npcs,
    pets,
    companions,
    healths,
    forEachNpcNear: (_plane: string, _x: number, _y: number, _r: number, fn: (eid: number, npc: unknown) => boolean | void) => {
      for (const [eid, npc] of npcs) if (fn(eid, npc) === true) return;
    },
    npcPosAt: (eid: number) => pos.get(eid),
  };
  const add = (eid: number, x: number, hp = 10, radius = 0.4) => {
    npcs.set(eid, { def: { radius } });
    pos.set(eid, { x, y: 0 });
    healths.set(eid, { hp });
  };
  return { s: s as unknown as GameServer, add, pets, companions };
}

const here = { plane: 'surface', x: 0, y: 0 };

test('foeWithin direct: a live wild body inside reach (its radius counted) is a foe; kin, pets and the dead are not', () => {
  const f = foeSlate();
  assert.equal(meleeSys.foeWithin(f.s, here, 2), false);
  f.add(1, 2.3, 10, 0.4);
  assert.equal(meleeSys.foeWithin(f.s, here, 2), true, '2.3 − 0.4 ≤ 2');
  f.add(1, 2.5, 10, 0.4);
  assert.equal(meleeSys.foeWithin(f.s, here, 2), false);
  f.add(2, 1, 0);
  assert.equal(meleeSys.foeWithin(f.s, here, 2), false, 'the dead offer no fight');
  f.add(3, 1, 10);
  f.pets.add(3);
  assert.equal(meleeSys.foeWithin(f.s, here, 2), false, 'a pet is never a foe');
  f.add(4, 1, 10);
  f.companions.add(4);
  assert.equal(meleeSys.foeWithin(f.s, here, 2), false);
  f.add(5, 1, 10);
  assert.equal(meleeSys.foeWithin(f.s, here, 2), true);
});

test('foeWithin direct === delegator across the same table', () => {
  const f = foeSlate();
  f.add(1, 2.3);
  f.add(2, 1, 0);
  f.add(3, 5);
  for (const range of [0.5, 1, 2, 4, 5]) {
    assert.equal(
      (proto.foeWithin as Fn).call(f.s, here as never, range as never),
      meleeSys.foeWithin(f.s, here, range),
      `range ${range}`,
    );
  }
});
