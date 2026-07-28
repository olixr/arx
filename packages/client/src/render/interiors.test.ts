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
