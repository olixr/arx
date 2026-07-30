import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { InteriorMap, packTile } from './interiors.js';
import type { ClientGame } from '../game/clientGame.js';

/** A tiny grid world: everything is Grass unless placed. */
function gameOf(tiles: Map<number, Tile>): ClientGame {
  return {
    world: {
      groundAt: (tx: number, ty: number) =>
        Math.abs(tx) > 40 || Math.abs(ty) > 40 ? undefined : (tiles.get(packTile(tx, ty)) ?? Tile.Grass),
      elevAt: () => 0,
    },
  } as unknown as ClientGame;
}

/** The rat-shed idiom: a wall ring with holes torn in it. */
function ruin(gaps: Array<[number, number]>): Map<number, Tile> {
  const t = new Map<number, Tile>();
  for (let x = 0; x <= 6; x++) {
    for (let y = 0; y <= 5; y++) {
      const ring = x === 0 || x === 6 || y === 0 || y === 5;
      t.set(packTile(x, y), ring ? Tile.WallWood : Tile.Dirt);
    }
  }
  t.set(packTile(3, 0), Tile.DoorwayWood);
  for (const [gx, gy] of gaps) t.set(packTile(gx, gy), Tile.Grass);
  return t;
}

test('a continuous ring encloses (baseline)', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  const r = m.regionAt(gameOf(ruin([])), 3, 2);
  assert.ok(r, 'intact ring must resolve a region');
  assert.equal(r.wallMaterial, Tile.WallWood);
});

test('BREACH LAW: one-tile holes seal and the ruin stays a room', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  // West, east, and south walls each torn open one tile — the shed.
  const game = gameOf(ruin([[0, 2], [6, 3], [2, 5]]));
  const r = m.regionAt(game, 3, 2);
  assert.ok(r, 'breached ring must still resolve a region');
  // Every interior tile agrees, including ones beside the holes.
  assert.equal(m.regionAt(game, 1, 2), r);
  assert.equal(m.regionAt(game, 5, 3), r);
  // The holes joined the boundary ring.
  assert.ok(r.wallTiles.has(packTile(0, 2)));
  assert.ok(r.wallTiles.has(packTile(2, 5)));
});

test('BREACH LAW: standing in the hole itself is no region, and never poisons the room', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  const game = gameOf(ruin([[0, 2]]));
  // Query the hole FIRST — the order wallHeightAt's north probe hits it.
  assert.equal(m.regionAt(game, 0, 2), null);
  assert.ok(m.regionAt(game, 3, 2), 'room must still resolve after the hole was queried');
});

test('a two-tile collapse stays open — that wall is gone', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  const game = gameOf(ruin([[2, 5], [3, 5]]));
  assert.equal(m.regionAt(game, 3, 2), null);
});

/** Two rooms side by side sharing the wall column x=6; `door` decides
 *  whether a doorway pierces the party wall at (6,2). Each room keeps
 *  its own street entrance so both are honest standalone homes. */
function pair(door: boolean): Map<number, Tile> {
  const t = new Map<number, Tile>();
  for (let x = 0; x <= 12; x++) {
    for (let y = 0; y <= 5; y++) {
      const ring = x === 0 || x === 6 || x === 12 || y === 0 || y === 5;
      if (ring) t.set(packTile(x, y), Tile.WallStone);
      else t.set(packTile(x, y), Tile.StoneFloor);
    }
  }
  t.set(packTile(3, 5), Tile.DoorwayStone); // west home's street door
  t.set(packTile(9, 5), Tile.DoorwayStone); // east home's street door
  if (door) t.set(packTile(6, 2), Tile.DoorwayStone);
  return t;
}

test('BUILDING LAW: rooms joined by a doorway are one building', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  const game = gameOf(pair(true));
  const a = m.regionAt(game, 3, 2);
  const b = m.regionAt(game, 9, 2);
  assert.ok(a && b, 'both rooms resolve');
  assert.notEqual(a, b, 'two rooms, two regions');
  assert.ok(m.sameBuilding(a!, b!), 'a connecting doorway unions them');
  assert.ok(m.sameBuilding(a!, a!), 'a region is its own building');
});

test('BUILDING LAW: a party wall alone never joins two homes', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  const game = gameOf(pair(false));
  const a = m.regionAt(game, 3, 2);
  const b = m.regionAt(game, 9, 2);
  assert.ok(a && b, 'both rooms resolve');
  assert.equal(m.sameBuilding(a!, b!), false, 'shared masonry is not a shared home');
});

test('BUILDING LAW: a breach hole joins like a doorway (one broken building)', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  const tiles = pair(false);
  tiles.set(packTile(6, 2), Tile.Grass); // one-tile hole in the party wall
  const game = gameOf(tiles);
  const a = m.regionAt(game, 3, 2);
  const b = m.regionAt(game, 9, 2);
  assert.ok(a && b, 'breach seals — both rooms still resolve');
  assert.ok(m.sameBuilding(a!, b!), 'the hole connects them into one building');
});

test('BUILDING LAW: union is transitive across a middle room', () => {
  const m = new InteriorMap();
  m.beginFrame(1);
  // Three rooms in a row: A|hall|B with doorways A->hall and hall->B.
  const t = new Map<number, Tile>();
  for (let x = 0; x <= 18; x++) {
    for (let y = 0; y <= 5; y++) {
      const ring = x === 0 || x === 6 || x === 12 || x === 18 || y === 0 || y === 5;
      t.set(packTile(x, y), ring ? Tile.WallStone : Tile.StoneFloor);
    }
  }
  t.set(packTile(6, 2), Tile.DoorwayStone);
  t.set(packTile(12, 3), Tile.DoorwayStone);
  const game = gameOf(t);
  const a = m.regionAt(game, 3, 2);
  const b = m.regionAt(game, 15, 2);
  assert.ok(a && b);
  assert.ok(m.sameBuilding(a!, b!), 'A and B never touch, but the hall chains them');
});
