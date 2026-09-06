import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shutDoorTile, Tile } from '@arx/shared';
import { GameServer } from './gameServer.js';
import * as arenaSys from './arena.js';

// THE SAND'S CHARACTER (foundations F4.8). Written against the in-class
// arena methods BEFORE the move; they must read identically against
// game/arena.ts. Slate convention throughout.

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

test('arenaOf finds the one match a soul is enrolled in', () => {
  const m1 = { members: new Map([[7, {}]]) };
  const m2 = { members: new Map([[9, {}]]) };
  const slate = { arenaMatches: new Map([['a', m1], ['b', m2]]) };
  assert.equal((proto.arenaOf as Fn).call(slate, 9 as never), m2);
  assert.equal((proto.arenaOf as Fn).call(slate, 4 as never), null);
});

test('arenaFoesLeft counts only the living wave', () => {
  const slate = { ecs: { isAlive: (e: number) => e % 2 === 0 } };
  const match = { waveEids: [2, 3, 4, 5, 6] };
  assert.equal((proto.arenaFoesLeft as Fn).call(slate, match as never), 3);
});

test('THE GATE MUST OPEN ONTO GROUND: a body on the sill holds the gate', () => {
  const open = Tile.GateGarrison;
  const shut = shutDoorTile(open);
  assert.ok(shut !== null, 'test needs a door pair');
  const setCalls: Array<[string, number, number, number]> = [];
  const fx: unknown[] = [];
  const world = new Map([['1,1', open], ['2,1', open]]);
  const slate = {
    worldOf: () => ({ groundAt: (x: number, y: number) => world.get(`${x},${y}`) }),
    bodyOnTile: (_p: string, x: number) => x === 2, // a body blocks the second gate
    setWorldTile: (p: string, x: number, y: number, t: number) => setCalls.push([p, x, y, t]),
    broadcastFx: (_p: string, f: unknown) => fx.push(f),
  };
  const match = {
    venue: { plane: 'surface' },
    gateTiles: [
      { x: 1, y: 1, open },
      { x: 2, y: 1, open },
    ],
    gatesShut: false,
  };
  (proto.arenaSetGates as Fn).call(slate, match as never, true as never);
  // The clear sill shuts (and rattles); the blocked sill is left alone,
  // and the match knows the wall is not yet whole.
  assert.deepEqual(setCalls, [['surface', 1, 1, shut]]);
  assert.equal(fx.length, 1);
  assert.equal(match.gatesShut, false);
  // Opening restores the shut leaf and only the shut leaf.
  world.set('1,1', shut as number);
  setCalls.length = 0;
  (proto.arenaSetGates as Fn).call(slate, match as never, false as never);
  assert.deepEqual(setCalls, [['surface', 1, 1, open]]);
});

// ---- THE DOOR, DIRECT (core audit 2026-09, Band A): the module
// function called without the class must land the delegator's answer.

test('arena doors direct === delegator: arenaOf, arenaFoesLeft, arenaSetGates', () => {
  const m1 = { members: new Map([[7, {}]]) };
  const m2 = { members: new Map([[9, {}]]) };
  const slate = { arenaMatches: new Map([['a', m1], ['b', m2]]) } as unknown as GameServer;
  assert.equal(arenaSys.arenaOf(slate, 9), (proto.arenaOf as Fn).call(slate, 9 as never));
  assert.equal(arenaSys.arenaOf(slate, 9), m2);
  assert.equal(arenaSys.arenaOf(slate, 4), null);
  const alive = { ecs: { isAlive: (e: number) => e % 2 === 0 } } as unknown as GameServer;
  const match = { waveEids: [2, 3, 4, 5, 6] } as never;
  assert.equal(arenaSys.arenaFoesLeft(alive, match), 3);
  assert.equal(arenaSys.arenaFoesLeft(alive, match), (proto.arenaFoesLeft as Fn).call(alive, match));
  const open = Tile.GateGarrison;
  const shut = shutDoorTile(open)!;
  const run = (via: 'module' | 'class') => {
    const setCalls: Array<[string, number, number, number]> = [];
    const world = new Map([['1,1', open], ['2,1', open]]);
    const s = {
      worldOf: () => ({ groundAt: (x: number, y: number) => world.get(`${x},${y}`) }),
      bodyOnTile: (_p: string, x: number) => x === 2,
      setWorldTile: (p: string, x: number, y: number, t: number) => setCalls.push([p, x, y, t]),
      broadcastFx: () => {},
    } as unknown as GameServer;
    const mt = { venue: { plane: 'surface' }, gateTiles: [{ x: 1, y: 1, open }, { x: 2, y: 1, open }], gatesShut: false };
    if (via === 'module') arenaSys.arenaSetGates(s, mt as never, true);
    else (proto.arenaSetGates as Fn).call(s, mt as never, true as never);
    return { setCalls, gatesShut: mt.gatesShut };
  };
  assert.deepEqual(run('module'), { setCalls: [['surface', 1, 1, shut]], gatesShut: false });
  assert.deepEqual(run('class'), run('module'));
});
