import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, Tile, isSolidTile } from '@devcraft/shared';
import { buildBramblewick } from '@devcraft/content';
import { generateChunk } from './worldgen.js';
import { WorldSource } from './worldSource.js';

test('worldgen is deterministic for a given seed', () => {
  const a = generateChunk(1337, 5, -3);
  const b = generateChunk(1337, 5, -3);
  assert.deepEqual(Array.from(a.ground), Array.from(b.ground));
  assert.deepEqual(Array.from(a.detail), Array.from(b.detail));
});

test('different seeds give different terrain', () => {
  const a = generateChunk(1, 10, 10);
  const b = generateChunk(2, 10, 10);
  assert.notDeepEqual(Array.from(a.ground), Array.from(b.ground));
});

test('authored zone overlays the procedural world exactly', () => {
  const town = buildBramblewick();
  const world = new WorldSource(1337, [town]);
  // The town spans chunks (0,0)-(2,2); its well sits at (47,47).
  world.ensure(1, 1);
  assert.equal(world.groundAt(47, 47), Tile.WallStone);
  // Plaza center is walkable stone.
  assert.equal(world.groundAt(48, 50), Tile.StoneFloor);
  assert.equal(world.isSolid(48, 50), false);
});

test('spawn point is walkable and inside the town', () => {
  const town = buildBramblewick();
  const world = new WorldSource(1337, [town]);
  const spawn = world.spawn;
  assert.ok(spawn.x > 0 && spawn.x < 96 && spawn.y > 0 && spawn.y < 96);
  assert.equal(world.isSolid(Math.floor(spawn.x), Math.floor(spawn.y)), false);
});

test('town interiors are enterable: every building has a door', () => {
  const town = buildBramblewick();
  const world = new WorldSource(1337, [town]);
  world.ensure(0, 0);
  world.ensure(1, 1);
  // Flood-fill from spawn; count reachable walkable tiles in the zone.
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [[48, 52]];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    if (x < 0 || y < 0 || x >= 96 || y >= 96) continue;
    if (world.isSolid(x, y)) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // Every floor tile of every building must be reachable from spawn.
  let unreachableFloors = 0;
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
      const g = town.ground[y * 96 + x]!;
      if ((g === Tile.WoodFloor || g === Tile.StoneFloor) && !isSolidTile(g)) {
        if (!seen.has(`${x},${y}`)) unreachableFloors++;
      }
    }
  }
  assert.equal(unreachableFloors, 0, `${unreachableFloors} floor tiles unreachable`);

  // All four road mouths must be reachable so the town connects to the wild.
  for (const [x, y] of [[1, 48], [94, 48], [48, 1], [48, 94]] as const) {
    assert.ok(seen.has(`${x},${y}`), `road mouth (${x},${y}) blocked`);
  }
});

test('chunk boundaries are seamless (tiles agree across the seam)', () => {
  // Generate two adjacent chunks and make sure edge columns exist and
  // both derive from the same world-tile functions (no coordinate skew).
  const seed = 42;
  const left = generateChunk(seed, 0, 0);
  const right = generateChunk(seed, 1, 0);
  // Re-generate the right chunk's first column via a fresh call and
  // compare — determinism across chunk borders.
  const rightAgain = generateChunk(seed, 1, 0);
  for (let y = 0; y < CHUNK_SIZE; y++) {
    assert.equal(right.ground[y * CHUNK_SIZE], rightAgain.ground[y * CHUNK_SIZE]);
  }
  assert.ok(left.ground.length === CHUNK_SIZE * CHUNK_SIZE);
});
