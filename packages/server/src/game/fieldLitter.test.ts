import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { PLANNED_ZONE_RECTS, ROAD_HALF, ROAD_ROUTES, roadDistanceAt } from '@arx/content';
import { GameServer } from './gameServer.js';
import { config } from '../config.js';

/**
 * BAND 8 ENGINE (L5, A4; owner gate G1 YES): BODIES WHERE THE FIGHT
 * WAS. A body lies where the fight was for a quarter hour, and the
 * world forgets it, because the world is shared and the dead are
 * theatre. Pinned here: a POI-ground kill lays; a planned-rect kill
 * lays nothing; never on a route, a waypoint, a standing body or under
 * a player's eye; the caps (two per loop, six per cell) and their
 * quarter-hour expiry; the sweep entry; no persistence (a restart
 * clears: nothing but the live chunk is written).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

// The frontier test's honestly wild cell (12,1): no road, no rect.
const WILD = { x: 1600, y: 192 };
const NOW = 1_000_000;

function slate(
  opts: {
    playerNear?: boolean;
    spawnPoints?: unknown[];
    actorSpawnPoints?: unknown[];
    bodies?: Set<string>;
  } = {},
) {
  const g = new Map<string, Tile>();
  const w = {
    groundAt: (x: number, y: number): Tile => g.get(`${x},${y}`) ?? Tile.Grass,
    setGround: (x: number, y: number, t: Tile): void => {
      g.set(`${x},${y}`, t);
    },
  };
  // NO PERSISTENCE: any touch of the account store throws the test.
  const accounts = new Proxy(
    {},
    {
      get: (_t, k) => {
        throw new Error(`layFieldLitter touched accounts.${String(k)}`);
      },
    },
  );
  const s = {
    accounts,
    fieldLitter: [] as unknown[],
    respawnQueue: [] as Array<{ at: number; plane: string; tx: number; ty: number; tile: Tile; over?: Tile }>,
    spawnPoints: opts.spawnPoints ?? [],
    actorSpawnPoints: opts.actorSpawnPoints ?? [],
    playerWithin: () => opts.playerNear === true,
    worldOf: () => w,
    setWorldTile: (_p: string, x: number, y: number, t: Tile) => w.setGround(x, y, t),
    bodyOnTile: (_p: string, x: number, y: number) => opts.bodies?.has(`${x},${y}`) ?? false,
    layFieldLitter: proto.layFieldLitter,
    routineWaypointsNear: proto.routineWaypointsNear,
  };
  const lay = (x: number, y: number, loop = 'spawn:1', cell = '12,1', now = NOW, plane = 'surface'): boolean =>
    proto.layFieldLitter!.call(s, plane, x, y, cell, loop, now) as boolean;
  const laid = (): Array<[number, number]> =>
    [...g.entries()].filter(([, t]) => t === Tile.FieldLitter).map(([k]) => k.split(',').map(Number) as [number, number]);
  return { s, g, w, lay, laid };
}

test('BODIES WHERE THE FIGHT WAS: a POI-ground kill lays litter on the fall cell and queues the quarter-hour sweep', () => {
  const { s, w, lay, laid } = slate();
  assert.equal(lay(WILD.x + 0.4, WILD.y + 0.6), true);
  assert.deepEqual(laid(), [[WILD.x, WILD.y]]);
  assert.equal(w.groundAt(WILD.x, WILD.y), Tile.FieldLitter);
  assert.deepEqual(s.respawnQueue, [
    { at: NOW + 15 * 60_000, plane: 'surface', tx: WILD.x, ty: WILD.y, tile: Tile.Grass, over: Tile.FieldLitter },
  ]);
  assert.equal(s.fieldLitter.length, 1);
});

test('BODIES WHERE THE FIGHT WAS: a planned-rect kill lays nothing (the towns keep their ground)', () => {
  const r = PLANNED_ZONE_RECTS[0]!;
  const { lay, laid } = slate();
  assert.equal(lay(r.x + Math.floor(r.w / 2) + 0.5, r.y + Math.floor(r.h / 2) + 0.5), false);
  assert.deepEqual(laid(), []);
});

test('BODIES WHERE THE FIGHT WAS: never on a route (the distance law, not a tile id)', () => {
  const route = ROAD_ROUTES.find((rt) => rt.pts.length >= 3)!;
  const p = route.pts[Math.floor(route.pts.length / 2)]!;
  const { lay, laid } = slate();
  lay(p.x + 0.5, p.y + 0.5);
  for (const [tx, ty] of laid()) {
    assert.ok(roadDistanceAt(config.worldSeed, tx, ty) > ROAD_HALF, `(${tx},${ty}) lies off the road`);
  }
  assert.ok(!laid().some(([tx, ty]) => tx === p.x && ty === p.y), 'the road cell itself stays a road');
});

test('BODIES WHERE THE FIGHT WAS: never on a routine waypoint, a post, an actor post, or a standing body', () => {
  const { lay, laid } = slate({
    spawnPoints: [
      { active: true, plane: 'surface', patrol: [{ x: WILD.x, y: WILD.y }], post: { kind: 'vigil', x: WILD.x + 1, y: WILD.y, dir: 0 } },
      { active: false, plane: 'surface', patrol: [{ x: WILD.x - 1, y: WILD.y }] }, // retired rows own nothing
    ],
    actorSpawnPoints: [{ active: true, plane: 'surface', x: WILD.x, y: WILD.y + 1 }],
    bodies: new Set([`${WILD.x - 1},${WILD.y}`]),
  });
  assert.equal(lay(WILD.x + 0.5, WILD.y + 0.5), true);
  const [[tx, ty]] = laid() as [[number, number]];
  assert.ok(Math.max(Math.abs(tx - WILD.x), Math.abs(ty - WILD.y)) <= 2, 'within two of the fall');
  const refused = new Set([`${WILD.x},${WILD.y}`, `${WILD.x + 1},${WILD.y}`, `${WILD.x},${WILD.y + 1}`, `${WILD.x - 1},${WILD.y}`]);
  assert.ok(!refused.has(`${tx},${ty}`), `(${tx},${ty}) is no stop, post or body`);
});

test('BODIES WHERE THE FIGHT WAS: two per loop, six per cell, and the quarter hour lets go', () => {
  const { lay, laid } = slate();
  assert.equal(lay(WILD.x + 0.5, WILD.y + 0.5, 'spawn:1'), true);
  assert.equal(lay(WILD.x + 0.5, WILD.y + 0.5, 'spawn:1'), true);
  assert.equal(lay(WILD.x + 0.5, WILD.y + 0.5, 'spawn:1'), false, 'the loop cap: two');
  assert.equal(laid().length, 2);
  for (const loop of ['spawn:2', 'spawn:3', 'spawn:4', 'spawn:5']) {
    assert.equal(lay(WILD.x + 0.5, WILD.y + 0.5, loop), true, loop);
  }
  assert.equal(lay(WILD.x + 0.5, WILD.y + 0.5, 'spawn:6'), false, 'the cell cap: six');
  assert.equal(laid().length, 6);
  // Another cell counts its own six; the same loop still holds its two.
  assert.equal(lay(WILD.x + 10.5, WILD.y + 0.5, 'spawn:1', '12,2'), false);
  assert.equal(lay(WILD.x + 10.5, WILD.y + 0.5, 'spawn:9', '12,2'), true);
  // After the quarter hour the ledger forgets and the loop may lay again.
  assert.equal(lay(WILD.x + 20.5, WILD.y + 0.5, 'spawn:1', '12,1', NOW + 15 * 60_000 + 1), true);
});

test('BODIES WHERE THE FIGHT WAS: dignity (a player within 12, one screen off) and the halls refuse', () => {
  // THE DIGNITY LIES INSIDE THE FIGHT'S EYE (band 8 fix pass): the
  // changeover is a fight only under a character within 20, so a
  // dignity of 48 could never meet it and the verb never landed at
  // the husk (the review's finding 2). Twelve is the true frame's
  // half-width at zoom 1.3.
  assert.equal(GameServer.FIELD_LITTER_DIGNITY, 12);
  assert.ok(GameServer.FIELD_LITTER_DIGNITY < 20, 'under the eye that keeps a fight');
  const watched = slate({ playerNear: true });
  assert.equal(watched.lay(WILD.x + 0.5, WILD.y + 0.5), false);
  assert.deepEqual(watched.laid(), []);
  const hall = slate();
  assert.equal(hall.lay(WILD.x + 0.5, WILD.y + 0.5, 'spawn:1', '12,1', NOW, 'rift:1'), false);
});

test('BODIES WHERE THE FIGHT WAS: no persistence — a restart clears (only the live chunk and the sweep were written)', () => {
  const { s, lay } = slate();
  assert.equal(lay(WILD.x + 0.5, WILD.y + 0.5), true);
  // The account store was never touched (the Proxy would have thrown),
  // and the sweep floors the litter over itself — nothing outlives the
  // process but the plan the chunk regenerates from.
  assert.equal(s.respawnQueue[0]!.over, Tile.FieldLitter);
  const fresh = slate(); // the boot: an empty ledger and a clean chunk
  assert.equal(fresh.laid().length, 0);
  assert.equal(fresh.s.fieldLitter.length, 0);
});
