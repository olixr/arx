import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, Tile } from '@arx/shared';
import { WORLD_SEED,
  elevationAt,
  generateChunk,
  moistureAt,
  replaceZoneEdgeProfiles,
  type ZoneDef,
} from '@arx/content';
import { WorldSource } from './worldSource.js';

/**
 * THE EDGE-HARMONY LAW, proven: an authored border is a boundary
 * condition the wild honors — water keeps flowing, tree lines keep
 * growing, land edges repel the lakes that would otherwise be sliced
 * — and beyond the feathered reach the wilderness is byte-identical
 * to a world that never heard of the zone.
 */

const SEED = WORLD_SEED;
const WET = new Set<number>([Tile.Water, Tile.WaterDeep, Tile.WaterShallow, Tile.FishingSpot]);

/** A synthetic all-grass zone with optional authored edits. */
function syntheticZone(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  edit?: (ground: Uint16Array) => void,
): ZoneDef {
  const ground = new Uint16Array(w * h).fill(Tile.Grass);
  const detail = new Uint16Array(w * h);
  edit?.(ground);
  return { id, name: id, origin: { x, y }, width: w, height: h, ground, detail };
}

function groundVia(world: WorldSource, tx: number, ty: number): number {
  world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
  return world.tileAt(tx, ty)!;
}

test('a water edge keeps flowing: the wild continues an authored shoreline', () => {
  replaceZoneEdgeProfiles([]);
  // Far-east open country, away from every authored thing.
  const zx = 600;
  const zy = 200;
  const zw = 24;
  const zh = 32;
  const zone = syntheticZone('watertown', zx, zy, zw, zh, (g) => {
    // The whole east edge is authored water — a lakefront district.
    for (let ly = 0; ly < zh; ly++) g[ly * zw + (zw - 1)] = Tile.Water;
  });
  const world = new WorldSource(SEED, [zone]);
  // Just outside the east border, facing the middle of the water run,
  // the wild must be wet — the authored lake continues as a cove.
  let wet = 0;
  let n = 0;
  for (let ty = zy + 8; ty < zy + zh - 8; ty++) {
    for (let d = 1; d <= 2; d++) {
      n++;
      if (WET.has(groundVia(world, zx + zw - 1 + d, ty))) wet++;
    }
  }
  assert.ok(wet / n > 0.8, `only ${wet}/${n} tiles wet just outside a water edge`);
  // And the cove tapers: EDGE_REACH out, the border no longer decides.
  replaceZoneEdgeProfiles([]);
});

test('land edges repel water: a lake is never sliced by a zone border', () => {
  replaceZoneEdgeProfiles([]);
  // Find real open water in the far-east wilderness (pure fields, no
  // hard-coded coordinate that tuning could strand on dry land).
  let lake: { x: number; y: number } | null = null;
  outer: for (let ty = 96; ty < 480; ty += 3) {
    for (let tx = 520; tx < 900; tx += 3) {
      if (elevationAt(SEED, tx, ty) < 0.33) {
        lake = { x: tx, y: ty };
        break outer;
      }
    }
  }
  assert.ok(lake, 'no open water found in the search band');
  // Stamp an all-grass zone whose WEST border cuts through the lake.
  const zone = syntheticZone('lakeside', lake!.x, lake!.y - 16, 24, 32);
  const world = new WorldSource(SEED, [zone]);
  // The tiles hugging the border outside must be LAND: the shoreline
  // curves away from the rect instead of being cut ruler-straight.
  for (let ty = lake!.y - 4; ty <= lake!.y + 4; ty++) {
    for (let d = 1; d <= 2; d++) {
      const g = groundVia(world, lake!.x - d, ty);
      assert.ok(!WET.has(g), `water laps the land border at d=${d}, y=${ty}`);
    }
  }
  replaceZoneEdgeProfiles([]);
});

test('a forest edge grows outward as wild woods', () => {
  replaceZoneEdgeProfiles([]);
  const zx = 700;
  const zy = 300;
  const zw = 32;
  const zh = 24;
  // Baseline moisture along the south hem, before the zone exists.
  const probes: Array<[number, number]> = [];
  for (let tx = zx + 6; tx < zx + zw - 6; tx += 2) {
    for (let d = 1; d <= 4; d++) probes.push([tx, zy + zh - 1 + d]);
  }
  const zone = syntheticZone('greenhold', zx, zy, zw, zh, (g) => {
    for (let lx = 0; lx < zw; lx++) g[(zh - 1) * zw + lx] = Tile.TreeOak;
  });
  new WorldSource(SEED, [zone]);
  // Every hem tile now reads as forest-grade damp, whatever the noise
  // dealt: the authored tree line thins into real wild woods.
  for (const [tx, ty] of probes) {
    const m = moistureAt(SEED, tx, ty);
    assert.ok(m > 0.62, `moisture ${m.toFixed(3)} at (${tx},${ty}) under a forest edge`);
  }
  replaceZoneEdgeProfiles([]);
});

test('beyond the reach the wilderness is byte-identical', () => {
  replaceZoneEdgeProfiles([]);
  // Chunks two-plus chunks away from the rect: far past EDGE_REACH and
  // the basin damp arm.
  const baseline = [
    generateChunk(SEED, 22, 3),
    generateChunk(SEED, 14, 10),
  ];
  const zone = syntheticZone('watertown', 600, 200, 24, 32, (g) => {
    for (let ly = 0; ly < 32; ly++) g[ly * 24 + 23] = Tile.Water;
  });
  new WorldSource(SEED, [zone]);
  const after = [generateChunk(SEED, 22, 3), generateChunk(SEED, 14, 10)];
  for (let i = 0; i < baseline.length; i++) {
    assert.deepEqual(
      Array.from(after[i]!.ground),
      Array.from(baseline[i]!.ground),
      `chunk ${i} shifted beyond the edge-harmony reach`,
    );
  }
  replaceZoneEdgeProfiles([]);
});

test('removing a zone heals the wild (registry refresh + padded drops)', () => {
  replaceZoneEdgeProfiles([]);
  const zx = 600;
  const zy = 200;
  const zone = syntheticZone('watertown', zx, zy, 24, 32, (g) => {
    for (let ly = 0; ly < 32; ly++) g[ly * 24 + 23] = Tile.Water;
  });
  const world = new WorldSource(SEED, [zone]);
  const probeX = zx + 24; // one tile past the water edge
  const probeY = zy + 16;
  world.ensure(Math.floor(probeX / CHUNK_SIZE), Math.floor(probeY / CHUNK_SIZE));
  const before = world.tileAt(probeX, probeY)!;
  assert.ok(WET.has(before), 'expected the cove while the zone stands');
  world.removeZone('watertown');
  // The padded drop regenerates the surroundings; with the profile
  // gone the wild reverts to what the noise always wanted there.
  const healed = groundVia(world, probeX, probeY);
  replaceZoneEdgeProfiles([]);
  const bare = new WorldSource(SEED, []);
  assert.equal(healed, groundVia(bare, probeX, probeY));
});
