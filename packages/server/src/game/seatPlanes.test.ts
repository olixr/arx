import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { GameServer } from './gameServer.js';

/**
 * THE SEAT KNOWS ITS WORLD — plane-keyed furniture occupancy.
 *
 * Every rift shares DUNGEON_ORIGIN and the underworld aliases the
 * surface south, so coordinate-only seat claims (the planes-plan's
 * named debt) let a sleeper down a rift hold a phantom claim on a
 * surface throne at the same x,y — and the tile-only eviction check
 * called the phantom valid forever, floor-sitting the King beside
 * his own throne. These pins hold the ledger to plane-first keys.
 *
 * THE FORGIVING TILE rides along: a sit stop aimed at a SOLID tile
 * that is not itself furniture (station addressing, POI posts rolled
 * at runtime) mounts the real seat beside it instead of degrading to
 * a floor sit the author never wrote.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  seatKey: AnyFn;
  seatHolder: AnyFn;
  releaseSeat: AnyFn;
  routineMount: AnyFn;
};

interface Seat {
  plane: string;
  tiles: Array<{ x: number; y: number }>;
  retX: number;
  retY: number;
  dir: number;
  lie?: boolean;
}

function ledgerSlate() {
  const s = {
    seatOcc: new Map<string, number>(),
    players: new Map<number, { seat: Seat | null }>(),
    routines: new Map<number, { seat: Seat | null }>(),
    seatKey: proto.seatKey,
    seatHolder: proto.seatHolder,
    releaseSeat: proto.releaseSeat,
  };
  return s;
}

function claim(s: ReturnType<typeof ledgerSlate>, eid: number, seat: Seat): void {
  s.routines.set(eid, { seat });
  for (const t of seat.tiles) {
    s.seatOcc.set(
      (proto.seatKey as (this: unknown, p: string, x: number, y: number) => string).call(
        s,
        seat.plane,
        t.x,
        t.y,
      ),
      eid,
    );
  }
}

function holder(s: ReturnType<typeof ledgerSlate>, plane: string, x: number, y: number) {
  return (
    proto.seatHolder as (this: unknown, p: string, x: number, y: number) => number | null
  ).call(s, plane, x, y);
}

test('aliased coordinates on another plane never shadow a seat', () => {
  const s = ledgerSlate();
  // A sleeper in the underworld at the very tile the surface throne
  // stands on — by design the planes alias coordinates.
  claim(s, 7, { plane: 'underworld', tiles: [{ x: 77, y: 14 }], retX: 77.5, retY: 15.5, dir: 0 });
  // The surface throne is free: the King mounts.
  assert.equal(holder(s, 'surface', 77, 14), null);
  // The underworld claim itself still stands.
  assert.equal(holder(s, 'underworld', 77, 14), 7);
});

test('a claim whose holder sits on a different plane evicts on sight', () => {
  const s = ledgerSlate();
  // A stale ledger row: the key says surface, the holder's actual
  // seat says underworld (e.g. written before a plane transfer).
  s.routines.set(9, {
    seat: { plane: 'underworld', tiles: [{ x: 3, y: 3 }], retX: 3.5, retY: 4.5, dir: 0 },
  });
  s.seatOcc.set('surface:3,3', 9);
  assert.equal(holder(s, 'surface', 3, 3), null);
  assert.ok(!s.seatOcc.has('surface:3,3'), 'stale cross-plane row is erased');
});

test('release erases only the seat plane’s own keys', () => {
  const s = ledgerSlate();
  claim(s, 1, { plane: 'surface', tiles: [{ x: 5, y: 5 }], retX: 5.5, retY: 6.5, dir: 0 });
  claim(s, 2, { plane: 'underworld', tiles: [{ x: 5, y: 5 }], retX: 5.5, retY: 6.5, dir: 0 });
  const seat = s.routines.get(1)!.seat!;
  (proto.releaseSeat as (this: unknown, eid: number, seat: Seat, pos: null) => void).call(
    s,
    1,
    seat,
    null,
  );
  assert.ok(!s.seatOcc.has('surface:5,5'));
  assert.equal(holder(s, 'underworld', 5, 5), 2, 'the aliased neighbor keeps its bed');
});

// ---------------------------------------------------------------- mount

function mountSlate(tiles: Map<string, number>) {
  const world = {
    groundAt: (x: number, y: number) => tiles.get(`${x},${y}`),
    isSolid: (x: number, y: number) => tiles.has(`${x},${y}`),
  };
  const s = {
    seatOcc: new Map<string, number>(),
    players: new Map<number, { seat: Seat | null }>(),
    routines: new Map<number, { seat: Seat | null }>(),
    seatKey: proto.seatKey,
    seatHolder: proto.seatHolder,
    worldOf: () => world,
    updateChunkMembership: () => {},
  };
  return s;
}

test('the forgiving tile: a sit stop aimed at the table mounts the chair beside it', () => {
  // Table at (5,5) with the chair south of it at (5,6): the chair's
  // backrest scan finds the table north, so the sitter faces south.
  const s = mountSlate(
    new Map([
      ['5,5', Tile.Table],
      ['5,6', Tile.Chair],
    ]),
  );
  const rc = {
    targetX: 5.5,
    targetY: 5.5,
    seat: null as Seat | null,
  };
  const pos = { x: 5.5, y: 7.2, dir: 0, plane: 'surface' };
  (
    proto.routineMount as (
      this: unknown,
      eid: number,
      rc: unknown,
      pos: unknown,
      dir: number | undefined,
    ) => void
  ).call(s, 11, rc, pos, undefined);
  assert.ok(rc.seat, 'the chair was found one tile off the authored target');
  assert.deepEqual(rc.seat!.tiles, [{ x: 5, y: 6 }]);
  assert.equal(rc.seat!.plane, 'surface');
  assert.equal(pos.x, 5.5);
  assert.ok(Math.abs(pos.y - 6.57) < 1e-9, 'body settles on the chair anchor');
  assert.equal(s.seatOcc.get('surface:5,6'), 11);
});

test('an open-ground sit stop stays a wayside floor sit — no seat hijack', () => {
  // A chair one tile away from an OPEN target tile: the author wrote
  // a ground sit (a campfire circle); the probe must not kidnap the
  // body onto furniture it was never aimed at.
  const s = mountSlate(new Map([['5,6', Tile.Chair]]));
  const rc = { targetX: 5.5, targetY: 4.5, seat: null as Seat | null };
  const pos = { x: 5.5, y: 4.4, dir: 0, plane: 'surface' };
  (
    proto.routineMount as (
      this: unknown,
      eid: number,
      rc: unknown,
      pos: unknown,
      dir: number | undefined,
    ) => void
  ).call(s, 12, rc, pos, undefined);
  assert.equal(rc.seat, null);
});
