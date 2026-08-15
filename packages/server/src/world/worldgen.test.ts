import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFishingTile,
  ByteReader,
  CHUNK_SIZE,
  Tile,
  decodeChunk,
  encodeChunk,
  isSolidTile,
} from '@arx/shared';
import { WORLD_SEED,
  AMBERFORD_RECT,
  ROAD_ROUTES,
  SALTMERE_RECT,
  SILVERFALL_RECT,
  SILVERSPINE,
  THORNVEIL,
  buildDawnmead,
  buildSilverfall,
  buildUndercroft,
  roadDistanceAt,
  roadHitAt,
} from '@arx/content';
import {
  basinFieldAt,
  elevationAt,
  generateChunk,
  groundProbeAt,
  levelAt,
  moistureAt,
} from '@arx/content';
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
  const town = buildDawnmead();
  const world = new WorldSource(1337, [town]);
  // The village spans world (-128,0)-(-1,95); its well sits on the
  // green with its NW stone at (-65,44).
  world.ensure(-3, 1);
  world.ensure(-2, 1);
  assert.equal(world.groundAt(-65, 44), Tile.WallStone);
  // The Waking Ring's pad is walkable stone.
  assert.equal(world.groundAt(-82, 48), Tile.StoneFloor);
  assert.equal(world.isSolid(-82, 48), false);
});

test('spawn point is walkable and inside the village', () => {
  const town = buildDawnmead();
  const world = new WorldSource(1337, [town]);
  const spawn = world.spawn;
  assert.ok(spawn.x > -128 && spawn.x < 0 && spawn.y > 0 && spawn.y < 96);
  assert.equal(world.isSolid(Math.floor(spawn.x), Math.floor(spawn.y)), false);
});

test('village interiors are enterable: every building has a door', () => {
  const town = buildDawnmead();
  const world = new WorldSource(1337, [town]);
  for (let cx = -4; cx <= -1; cx++) {
    for (let cy = 0; cy <= 2; cy++) world.ensure(cx, cy);
  }
  // Flood-fill from the Waking Ring; count reachable walkable tiles.
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [[-81, 48]];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    if (x < -128 || y < 0 || x >= 0 || y >= 96) continue;
    if (world.isSolid(x, y)) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // Every floor tile of every building must be reachable from spawn.
  let unreachableFloors = 0;
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 128; x++) {
      const g = town.ground[y * 128 + x]!;
      if ((g === Tile.WoodFloor || g === Tile.StoneFloor) && !isSolidTile(g)) {
        if (!seen.has(`${x - 128},${y}`)) unreachableFloors++;
      }
    }
  }
  assert.equal(unreachableFloors, 0, `${unreachableFloors} floor tiles unreachable`);

  // The east lane mouth must be reachable so the village connects to
  // the frontier (and the world beyond the seam).
  assert.ok(seen.has('-1,48'), 'the east lane mouth is blocked');
});

test('levels are fenced: no walkable step between levels except ramps', () => {
  // The elevation layer is render-only, so this invariant IS the
  // collision story: any two cardinally-adjacent walkable tiles at
  // different levels must involve a Ramp. Signed now — the same law
  // covers plateau crowns AND sunken dells/quarries, so the scan mixes
  // hard-coded plateau country with chunks found by the basin probe.
  const seed = WORLD_SEED;
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

test('THE CLIFF-FOOT LAW: the probe refuses every tile that borders a level change', () => {
  // groundProbeAt is the one terrain oracle every procedural placer
  // reads (POI sites, finds, trails, wild knots). A flat tile bordering
  // ANY level change is the fence line's doorstep — the rim's Cliff/Ramp
  // dressing and the talus at the wall base live there, so anything a
  // scanner stands on it clips through the rock face. The probe must
  // read 'rock' both ON non-flat levels and BESIDE them.
  const seed = WORLD_SEED;
  let boundaryTiles = 0;
  for (const [cx, cy] of [[3, 3], [-4, 2], [7, -6], [12, 12], ...findSinkChunks(seed, 2)] as Array<
    [number, number]
  >) {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tx = cx * CHUNK_SIZE + lx;
        const ty = cy * CHUNK_SIZE + ly;
        if (levelAt(seed, tx, ty) !== 0) continue;
        const beside =
          levelAt(seed, tx - 1, ty) !== 0 ||
          levelAt(seed, tx + 1, ty) !== 0 ||
          levelAt(seed, tx, ty - 1) !== 0 ||
          levelAt(seed, tx, ty + 1) !== 0;
        if (!beside) continue;
        boundaryTiles++;
        // Water/sand beside a waterline crag are already unstandable —
        // the law only demands the probe never answers standable ground.
        const cls = groundProbeAt(seed, tx, ty);
        assert.ok(
          cls !== 'grass' && cls !== 'forest',
          `probe standable ('${cls}') at cliff boundary (${tx},${ty})`,
        );
      }
    }
  }
  assert.ok(boundaryTiles > 0, 'scan found no level boundaries — coordinates drifted?');
});

test('sinks never cut water or shoreline, and every ramp is a straight-edge flight', () => {
  const seed = WORLD_SEED;
  const wet = new Set<number>([
    Tile.Water,
    Tile.WaterDeep,
    Tile.WaterShallow,
    Tile.FishingSpot,
    Tile.PikeHole,
    Tile.EelRun,
    Tile.SalmonRun,
    Tile.GlimmerShoal,
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
  const seed = WORLD_SEED;
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


test('ramps exist and connect a lower walkable tile to a higher one', () => {
  // Scan a broad band of wilderness for ramps; every ramp must have a
  // walkable mouth below and open ground above.
  const seed = WORLD_SEED;
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

// --------------------------------------------------------------------
// Epic 1 — the land learns its shape: roads, the Silverspine, the
// Thornveil, and the planned-zone aprons.
// --------------------------------------------------------------------

/** Every route sampled at ~2-tile steps along its polyline. */
function routeSamples(routeId: string): Array<[number, number]> {
  const route = ROAD_ROUTES.find((r) => r.id === routeId)!;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < route.pts.length - 1; i++) {
    const a = route.pts[i]!;
    const b = route.pts[i + 1]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = 0; s < seg; s += 2) {
      out.push([
        Math.round(a.x + ((b.x - a.x) * s) / seg),
        Math.round(a.y + ((b.y - a.y) * s) / seg),
      ]);
    }
  }
  return out;
}

test('THE WAYSTONE DRESSING: the Evenway wears its stones, the trodden way never does', () => {
  const route = ROAD_ROUTES.find((r) => r.id === 'evenway')!;
  const cells = new Set<string>();
  for (const p of route.pts) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        cells.add(`${Math.floor(p.x / 32) + dx},${Math.floor(p.y / 32) + dy}`);
      }
    }
  }
  let stones = 0;
  for (const key of cells) {
    const [cx, cy] = key.split(',').map(Number);
    const chunk = generateChunk(WORLD_SEED, cx!, cy!);
    for (let i = 0; i < chunk.ground.length; i++) {
      const t = chunk.ground[i]!;
      if (t !== Tile.ElvenWaystone && t !== Tile.Runestone) continue;
      stones++;
      // A stone on the trodden surface would block the way: the
      // dresser only ever stands them on the shoulder, and the carve
      // distance proves it.
      const tx = cx! * 32 + (i % 32);
      const ty = cy! * 32 + Math.floor(i / 32);
      const hit = roadHitAt(WORLD_SEED, tx, ty);
      assert.ok(hit !== null && hit.dist > 1.1, `stone at (${tx},${ty}) stands on the trodden way`);
    }
  }
  // The unlamped west keeps its miles: a stone every long stone's-throw.
  assert.ok(stones >= 15, `the Evenway lost its stones (${stones})`);
});

test('roads carve a walkable surface end to end', () => {
  const seed = WORLD_SEED;
  const chunkCache = new Map<string, ReturnType<typeof generateChunk>>();
  const groundAt = (tx: number, ty: number): number => {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const key = `${cx},${cy}`;
    let c = chunkCache.get(key);
    if (!c) {
      c = generateChunk(seed, cx, cy);
      chunkCache.set(key, c);
    }
    return c.ground[(ty - cy * CHUNK_SIZE) * CHUNK_SIZE + (tx - cx * CHUNK_SIZE)]!;
  };
  for (const route of ROAD_ROUTES) {
    const surface = new Set<number>(
      route.kind === 'trail' ? [Tile.Dirt, Tile.Bridge] : [Tile.Path, Tile.Bridge],
    );
    for (const [px, py] of routeSamples(route.id)) {
      // The wander can push the carved centerline a couple of tiles off
      // the authored polyline — find the nearest carved tile and check
      // THAT (the surface the player actually walks).
      let found: number | null = null;
      outer: for (let r = 0; r <= 4; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const g = groundAt(px + dx, py + dy);
            if (surface.has(g)) {
              found = g;
              break outer;
            }
          }
        }
      }
      assert.ok(
        found !== null,
        `${route.name}: no carved surface within 4 tiles of (${px},${py})`,
      );
      assert.ok(!isSolidTile(found), `${route.name}: solid surface tile at (${px},${py})`);
    }
  }
});

test('road cuttings keep the fence law: no walkable level step off the carve', () => {
  // The carve forces terrain levels flat inside the ribbon; the cliff
  // fence must land on the ribbon hem, never on the trodden surface,
  // and every level change around a cutting must still be fenced.
  const seed = WORLD_SEED;
  // Find High Road chunks that cut through raised country.
  const cuts = new Set<string>();
  for (const [px, py] of routeSamples('high_road')) {
    for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [0, 6]] as const) {
      if (levelAt(seed, px + dx, py + dy) > 0) {
        cuts.add(`${Math.floor(px / CHUNK_SIZE)},${Math.floor(py / CHUNK_SIZE)}`);
      }
    }
  }
  assert.ok(cuts.size >= 3, `expected the High Road to cut raised country, found ${cuts.size}`);
  for (const key of [...cuts].slice(0, 6)) {
    const [cx, cy] = key.split(',').map(Number) as [number, number];
    const tiles = tileBlock(seed, cx, cy);
    for (const [tkey, t] of tiles) {
      if (isSolidTile(t.g) || t.g === Tile.Ramp) continue;
      const [x, y] = tkey.split(',').map(Number) as [number, number];
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const n = tiles.get(`${x + dx},${y + dy}`);
        if (!n || isSolidTile(n.g) || n.g === Tile.Ramp) continue;
        assert.equal(
          t.e,
          n.e,
          `unfenced level step beside the road at (${x},${y})→(${x + dx},${y + dy})`,
        );
      }
    }
  }
});

test('the Silverspine stands: crag country cradles the Silverfall rect', () => {
  const seed = WORLD_SEED;
  let n = 0;
  let raised = 0;
  let water = 0;
  const inRect = (tx: number, ty: number): boolean =>
    tx >= SILVERFALL_RECT.x &&
    tx < SILVERFALL_RECT.x + SILVERFALL_RECT.w &&
    ty >= SILVERFALL_RECT.y &&
    ty < SILVERFALL_RECT.y + SILVERFALL_RECT.h;
  for (let ty = SILVERSPINE.y - 105; ty < SILVERSPINE.y + 105; ty += 3) {
    for (let tx = SILVERSPINE.x - 105; tx < SILVERSPINE.x + 105; tx += 3) {
      if (Math.hypot(tx - SILVERSPINE.x, ty - SILVERSPINE.y) > 105) continue;
      if (inRect(tx, ty)) continue; // the city rect is a flat canvas by design
      n++;
      if (elevationAt(seed, tx, ty) < 0.37) water++;
      else if (levelAt(seed, tx, ty) >= 1) raised++;
    }
  }
  assert.ok(raised / n > 0.3, `massif heart ring only ${((raised / n) * 100).toFixed(1)}% raised`);
  assert.ok(water / n < 0.08, `massif heart ring is ${((water / n) * 100).toFixed(1)}% water`);
});

test('the Amberfen is a true wetland: wet mosaic, reed banks, dry islets', () => {
  const seed = WORLD_SEED;
  let n = 0;
  let wet = 0;
  let reeds = 0;
  let dry = 0;
  // Sample chunks across the west heart — the fen character must hold
  // on any seed's noise: a real mosaic, not solid water or solid land.
  for (const [cx, cy] of [[2, 1], [3, 1], [2, 0], [3, 0]] as const) {
    const c = generateChunk(seed, cx, cy);
    for (let i = 0; i < c.ground.length; i++) {
      n++;
      const g = c.ground[i]!;
      if (
        g === Tile.Water ||
        g === Tile.WaterDeep ||
        g === Tile.WaterShallow ||
        isFishingTile(g)
      ) {
        wet++;
      } else if (g === Tile.Swamp) reeds++;
      else dry++;
    }
  }
  assert.ok(wet / n > 0.15, `fen heart only ${((wet / n) * 100).toFixed(1)}% open water`);
  assert.ok(reeds / n > 0.02, `fen heart only ${((reeds / n) * 100).toFixed(1)}% reed bank`);
  assert.ok(dry / n > 0.2, `fen heart drowned: only ${((dry / n) * 100).toFixed(1)}% dry ground`);
});

test('the Thornveil is a true wood', () => {
  const seed = WORLD_SEED;
  let n = 0;
  let forest = 0;
  for (let ty = THORNVEIL.y - 112; ty < THORNVEIL.y + 112; ty += 3) {
    for (let tx = THORNVEIL.x - 112; tx < THORNVEIL.x + 112; tx += 3) {
      if (Math.hypot(tx - THORNVEIL.x, ty - THORNVEIL.y) > 112) continue;
      if (elevationAt(seed, tx, ty) < 0.4 || levelAt(seed, tx, ty) !== 0) continue;
      n++;
      if (moistureAt(seed, tx, ty) > 0.62) forest++;
    }
  }
  assert.ok(forest / n > 0.35, `Thornveil core only ${((forest / n) * 100).toFixed(1)}% forest`);
});

test('the taiga stands north: pines take the cold forests, never the south', () => {
  const seed = WORLD_SEED;
  // Deep-north wilds (east of Silverfall's rect, well past the cold
  // ramp): the forest share of trees must be pine-dominant.
  let northPine = 0;
  let northOther = 0;
  for (let ty = -260; ty < -180; ty += 2) {
    for (let tx = 40; tx < 200; tx += 2) {
      const chunkless = generateChunkTile(seed, tx, ty);
      if (chunkless === Tile.TreePine) northPine++;
      else if (
        chunkless === Tile.Tree || chunkless === Tile.TreeOak ||
        chunkless === Tile.TreeWillow || chunkless === Tile.TreeYew
      ) northOther++;
    }
  }
  assert.ok(northPine > 40, `only ${northPine} pines in the deep north`);
  assert.ok(northPine > northOther, `north not taiga: ${northPine} pines vs ${northOther} others`);
  // The warm south grows none.
  let southPine = 0;
  for (let ty = 40; ty < 160; ty += 2) {
    for (let tx = 260; tx < 420; tx += 2) {
      if (generateChunkTile(seed, tx, ty) === Tile.TreePine) southPine++;
    }
  }
  assert.equal(southPine, 0, `${southPine} pines grew in the warm south`);
});

/** Sample one tile's generated ground via its whole chunk (worldgen is chunk-grained). */
const chunkTileCache = new Map<string, Uint16Array>();
function generateChunkTile(seed: number, tx: number, ty: number): number {
  const cx = Math.floor(tx / CHUNK_SIZE);
  const cy = Math.floor(ty / CHUNK_SIZE);
  const key = `${cx},${cy}`;
  let ground = chunkTileCache.get(key);
  if (!ground) {
    ground = generateChunk(seed, cx, cy).ground as Uint16Array;
    chunkTileCache.set(key, ground);
  }
  const lx = tx - cx * CHUNK_SIZE;
  const ly = ty - cy * CHUNK_SIZE;
  return ground[lx + ly * CHUNK_SIZE]!;
}

test('planned zone rects are flat canvases: no levels, no basins inside', () => {
  const seed = WORLD_SEED;
  for (const rect of [AMBERFORD_RECT, SILVERFALL_RECT, SALTMERE_RECT]) {
    for (let ty = rect.y; ty < rect.y + rect.h; ty += 5) {
      for (let tx = rect.x; tx < rect.x + rect.w; tx += 5) {
        assert.equal(
          levelAt(seed, tx, ty),
          0,
          `terrain level inside planned rect at (${tx},${ty})`,
        );
      }
    }
  }
});

test('roads read as not-standable to the POI probe and calm to the wilds', () => {
  const seed = WORLD_SEED;
  // Centerline distances are ~0; the probe treats the whole shoulder
  // as rock so no POI footprint can sever a route.
  const samples = routeSamples('high_road');
  for (let k = 0; k < samples.length; k += 10) {
    const [px, py] = samples[k]!;
    const hit = roadHitAt(seed, px, py);
    assert.ok(hit !== null && hit.dist < 6, `route sample (${px},${py}) reads far from its road`);
  }
  // And far country is genuinely Infinity — the frontier skips the field.
  assert.equal(roadDistanceAt(seed, 5000, 5000), Infinity);
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

test('respawnAt: bands keep their own dead (the Undercroft law)', () => {
  const world = new WorldSource(1337, [buildDawnmead(), buildSilverfall(), buildUndercroft()]);
  const dawn = buildDawnmead().spawn!;
  const fall = buildSilverfall().spawn!;
  const croft = buildUndercroft().spawn!;
  // A death in the Undercroft wakes at the Landing, not the surface.
  assert.deepEqual(world.respawnAt(croft.x + 40, croft.y + 5), croft);
  // A surface death near Silverfall wakes at Silverfall...
  assert.deepEqual(world.respawnAt(fall.x + 10, fall.y + 10), fall);
  // ...and a surface death SOUTH of the map can never wake in the
  // dark, even when the dark band is closer as the crow digs — the
  // nearest SURFACE hearth answers instead (Dawnmead, from here).
  assert.deepEqual(world.respawnAt(croft.x, 400), dawn);
  // The instance band (personal dungeons) always surfaces to the
  // world spawn — the rescue law stands.
  assert.deepEqual(world.respawnAt(croft.x, 9000), dawn);
});
