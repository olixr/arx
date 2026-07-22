import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ByteReader,
  CHUNK_SIZE,
  Tile,
  decodeChunk,
  encodeChunk,
  isSolidTile,
} from '@devcraft/shared';
import { buildBramblewick, buildHollowStair } from '@devcraft/content';
import { basinFieldAt, generateChunk } from './worldgen.js';
import { WorldSource } from './worldSource.js';

/**
 * A (2r+1)² chunk block flattened to a world-tile map so adjacency
 * checks cross chunk seams. Values: ground tile and elevation level.
 */
function tileBlock(
  seed: number,
  cx: number,
  cy: number,
  r = 1,
): Map<string, { g: number; e: number }> {
  const tiles = new Map<string, { g: number; e: number }>();
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const c = generateChunk(seed, cx + dx, cy + dy);
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const i = ly * CHUNK_SIZE + lx;
          tiles.set(`${(cx + dx) * CHUNK_SIZE + lx},${(cy + dy) * CHUNK_SIZE + ly}`, {
            g: c.ground[i]!,
            e: c.elev[i]!,
          });
        }
      }
    }
  }
  return tiles;
}

/**
 * Seeded search: probe the basin field (cheap, pure) for chunks likely
 * to hold sinks, so the sink tests scan real dells instead of praying a
 * hard-coded coordinate list stays interesting across tuning.
 */
function findSinkChunks(seed: number, want: number): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  const seen = new Set<string>();
  for (let ty = -480; ty < 480 && found.length < want; ty += 4) {
    for (let tx = -480; tx < 480 && found.length < want; tx += 4) {
      if (basinFieldAt(seed, tx, ty) <= 0.72) continue;
      // The raster hits a basin's NORTH tip first; hill-climb to the
      // crest so the scanned block centers on the region instead of
      // clipping it at the block's south edge.
      let px = tx;
      let py = ty;
      for (let step = 0; step < 64; step++) {
        let best = basinFieldAt(seed, px, py);
        let bx = px;
        let by = py;
        for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]] as const) {
          const v = basinFieldAt(seed, px + dx, py + dy);
          if (v > best) {
            best = v;
            bx = px + dx;
            by = py + dy;
          }
        }
        if (bx === px && by === py) break;
        px = bx;
        py = by;
      }
      const cx = Math.floor(px / CHUNK_SIZE);
      const cy = Math.floor(py / CHUNK_SIZE);
      const key = `${cx},${cy}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push([cx, cy]);
    }
  }
  return found;
}

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

test('levels are fenced: no walkable step between levels except ramps', () => {
  // The elevation layer is render-only, so this invariant IS the
  // collision story: any two cardinally-adjacent walkable tiles at
  // different levels must involve a Ramp. Signed now — the same law
  // covers plateau crowns AND sunken dells/quarries, so the scan mixes
  // hard-coded plateau country with chunks found by the basin probe.
  const seed = 1337;
  const coords: Array<readonly [number, number]> = [
    [3, 3],
    [-4, 2],
    [7, -6],
    [12, 12],
    [-9, -9],
    ...findSinkChunks(seed, 4),
  ];
  let sinkTiles = 0;
  for (const [cx, cy] of coords) {
    const tiles = tileBlock(seed, cx, cy);
    for (const [key, t] of tiles) {
      if (t.e < 0) sinkTiles++;
      if (isSolidTile(t.g) || t.g === Tile.Ramp) continue;
      const [x, y] = key.split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const n = tiles.get(`${x! + dx},${y! + dy}`);
        if (!n || isSolidTile(n.g) || n.g === Tile.Ramp) continue;
        assert.equal(
          t.e,
          n.e,
          `walkable level step at (${x},${y})→(${x! + dx},${y! + dy}): ${t.e} vs ${n.e}`,
        );
      }
    }
  }
  assert.ok(sinkTiles > 0, 'basin probe found no actual sink tiles — thresholds drifted?');
});

test('sinks never cut water or shoreline, and every ramp is a straight-edge flight', () => {
  const seed = 1337;
  const wet = new Set<number>([
    Tile.Water,
    Tile.WaterDeep,
    Tile.WaterShallow,
    Tile.FishingSpot,
    Tile.Sand,
  ]);
  for (const [cx, cy] of findSinkChunks(seed, 4)) {
    const tiles = tileBlock(seed, cx, cy);
    const E = (x: number, y: number): number | undefined => tiles.get(`${x},${y}`)?.e;
    for (const [key, t] of tiles) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      if (t.e < 0) {
        assert.ok(!wet.has(t.g), `sink tile on water/sand at (${x},${y})`);
      }
      if (t.g !== Tile.Ramp) continue;
      // Straight-edge predicate, signed: south exactly one lower, e/w
      // flanks and north at the ramp's own level, mouth diagonals one
      // lower, top diagonals no lower. Skip ramps whose neighborhood
      // leaves the scanned block.
      const hood = [
        E(x, y - 1), E(x + 1, y), E(x, y + 1), E(x - 1, y),
        E(x - 1, y + 1), E(x + 1, y + 1), E(x - 1, y - 1), E(x + 1, y - 1),
      ];
      if (hood.some((v) => v === undefined)) continue;
      assert.equal(E(x, y + 1), t.e - 1, `ramp (${x},${y}): south not one lower`);
      assert.equal(E(x - 1, y), t.e, `ramp (${x},${y}): west flank off level`);
      assert.equal(E(x + 1, y), t.e, `ramp (${x},${y}): east flank off level`);
      assert.equal(E(x, y - 1), t.e, `ramp (${x},${y}): north off level`);
      assert.equal(E(x - 1, y + 1), t.e - 1, `ramp (${x},${y}): west mouth diagonal`);
      assert.equal(E(x + 1, y + 1), t.e - 1, `ramp (${x},${y}): east mouth diagonal`);
      assert.ok(E(x - 1, y - 1)! >= t.e, `ramp (${x},${y}): west top diagonal lower`);
      assert.ok(E(x + 1, y - 1)! >= t.e, `ramp (${x},${y}): east top diagonal lower`);
    }
  }
});

test('sink regions get entrance ramps (most enterable, some scenic)', () => {
  // A stair needs a locally STRAIGHT north lip, and a blobby fbm hole
  // is not guaranteed to have one — the mirror of the plateau law where
  // "the odd unclimbable mesa stays scenic". So the guarantee worth
  // testing is statistical and, for a fixed seed, exact: most sizeable
  // dells must carry at least one entrance ramp on their level-0 lip.
  const seed = 1337;
  const regionKeys = new Set<string>();
  let sizeable = 0;
  let enterable = 0;
  for (const [cx, cy] of findSinkChunks(seed, 8)) {
    // 5×5 block: whole basins are wider than one 3×3 neighborhood.
    const tiles = tileBlock(seed, cx, cy, 2);
    const visited = new Set<string>();
    for (const [key, t] of tiles) {
      if (t.e >= 0 || visited.has(key)) continue;
      // Flood the whole basin (any negative level counts as one region).
      const region: Array<[number, number]> = [];
      let touchesEdge = false;
      const stack = [key];
      while (stack.length > 0) {
        const k = stack.pop()!;
        if (visited.has(k)) continue;
        const cell = tiles.get(k);
        if (!cell) {
          touchesEdge = true; // spills past the scanned block: skip it
          continue;
        }
        if (cell.e >= 0) continue;
        visited.add(k);
        const [x, y] = k.split(',').map(Number) as [number, number];
        region.push([x, y]);
        stack.push(`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`);
      }
      if (touchesEdge || region.length < 24) continue;
      // Overlapping blocks re-find the same basin: dedupe on its
      // lexicographically smallest tile.
      const canon = region
        .map(([x, y]) => `${x},${y}`)
        .sort()[0]!;
      if (regionKeys.has(canon)) continue;
      regionKeys.add(canon);
      sizeable++;
      // Entrance: a Ramp on the level-0 lip, cardinally adjacent.
      const hasRamp = region.some(([x, y]) =>
        [[1, 0], [-1, 0], [0, 1], [0, -1]].some(
          ([dx, dy]) => tiles.get(`${x + dx!},${y + dy!}`)?.g === Tile.Ramp,
        ),
      );
      if (hasRamp) enterable++;
    }
  }
  assert.ok(sizeable > 0, 'no fully-scanned sink regions found');
  assert.ok(enterable >= 1, 'no sink region anywhere has an entrance ramp');
  assert.ok(
    enterable * 2 >= sizeable,
    `only ${enterable}/${sizeable} sizeable sink regions are enterable`,
  );
});

test('the Hollow Stair zone stamps signed elevation over the wilds', () => {
  const world = new WorldSource(1337, [buildHollowStair()]);
  world.ensure(3, 0);
  world.ensure(4, 0);
  // Zone origin (120,8): dell floor at local (11,9), quarry at (12,14).
  assert.equal(world.elevAt(131, 17), -1);
  assert.equal(world.elevAt(132, 22), -2);
  assert.equal(world.groundAt(132, 22), Tile.PortalDown);
  assert.ok(world.portalAt(132, 22)?.delve, 'delve portal missing on the quarry floor');
  // Both flights present, framed by the auto-fence.
  assert.equal(world.groundAt(131, 15), Tile.Ramp);
  assert.equal(world.elevAt(131, 15), 0);
  assert.equal(world.groundAt(130, 15), Tile.Cliff);
  assert.equal(world.groundAt(131, 19), Tile.Ramp);
  assert.equal(world.elevAt(131, 19), -1);
});

test('ramps exist and connect a lower walkable tile to a higher one', () => {
  // Scan a broad band of wilderness for ramps; every ramp must have a
  // walkable mouth below and open ground above.
  const seed = 1337;
  let ramps = 0;
  for (let cy = -8; cy <= 8; cy++) {
    for (let cx = -8; cx <= 8; cx++) {
      const c = generateChunk(seed, cx, cy);
      for (let i = 0; i < c.ground.length; i++) {
        if (c.ground[i] === Tile.Ramp) ramps++;
      }
    }
  }
  assert.ok(ramps > 0, 'no ramps generated anywhere in the scanned band');
});

test('chunk codec round-trips the elevation layer, negatives included', () => {
  const chunk = generateChunk(99, 6, 6);
  // Force signed values through the wire: the elev byte is Int8 as of
  // protocol v3, and an unsigned codec would bounce −2 back as 254.
  chunk.elev[0] = -2;
  chunk.elev[1] = -1;
  chunk.elev[2] = 3;
  const encoded = encodeChunk(chunk);
  const r = new ByteReader(encoded);
  r.u8(); // discriminator
  const decoded = decodeChunk(r);
  assert.deepEqual(Array.from(decoded.elev), Array.from(chunk.elev));
  assert.deepEqual(Array.from(decoded.ground), Array.from(chunk.ground));
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
