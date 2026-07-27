import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_SKIP, Tile } from '@devcraft/shared';
import {
  ZONE_EDGE_PROFILES,
  packZoneEdgeProfile,
  replaceZoneEdgeProfiles,
  tileEdgeClass,
  unpackZoneEdgeProfile,
  zoneEdgeProfileOf,
} from './zoneEdges.js';

function zone(
  id: string,
  w: number,
  h: number,
  fill: number,
  edit?: (ground: Uint16Array) => void,
): { id: string; origin: { x: number; y: number }; width: number; height: number; ground: Uint16Array } {
  const ground = new Uint16Array(w * h).fill(fill);
  edit?.(ground);
  return { id, origin: { x: 100, y: 100 }, width: w, height: h, ground };
}

test('tileEdgeClass maps authored tiles to terrain intentions', () => {
  assert.equal(tileEdgeClass(TILE_SKIP), 'open');
  assert.equal(tileEdgeClass(Tile.Water), 'water');
  assert.equal(tileEdgeClass(Tile.Dock), 'water');
  assert.equal(tileEdgeClass(Tile.Sand), 'sand');
  assert.equal(tileEdgeClass(Tile.TreeOak), 'forest');
  assert.equal(tileEdgeClass(Tile.BerryBush), 'forest');
  assert.equal(tileEdgeClass(Tile.Path), 'worn');
  assert.equal(tileEdgeClass(Tile.Cliff), 'stark');
  assert.equal(tileEdgeClass(Tile.Snow), 'stark');
  assert.equal(tileEdgeClass(Tile.Grass), 'meadow');
  assert.equal(tileEdgeClass(Tile.WallStone), 'meadow');
  assert.equal(tileEdgeClass(Tile.Fence), 'meadow');
});

test('a fully-transparent border publishes nothing (composed POI sites)', () => {
  const z = zone('poi', 12, 12, Tile.Grass, (g) => {
    // Skip fringe all around — only the interior is authored.
    for (let x = 0; x < 12; x++) {
      g[x] = TILE_SKIP;
      g[11 * 12 + x] = TILE_SKIP;
    }
    for (let y = 0; y < 12; y++) {
      g[y * 12] = TILE_SKIP;
      g[y * 12 + 11] = TILE_SKIP;
    }
  });
  assert.equal(zoneEdgeProfileOf(z), null);
});

test('edge profile reads the perimeter and smooths lone outliers', () => {
  const w = 16;
  const h = 10;
  const z = zone('t', w, h, Tile.Grass, (g) => {
    // A 3-wide stream leaves the east edge; a lone tree sits on the
    // north edge (should smooth away); a real tree line holds the south.
    for (let y = 4; y <= 6; y++) g[y * w + (w - 1)] = Tile.Water;
    g[7] = Tile.Tree;
    for (let x = 2; x < 14; x++) g[(h - 1) * w + x] = Tile.TreeOak;
  });
  const p = zoneEdgeProfileOf(z)!;
  assert.ok(p, 'profile expected');
  // The stream survives the vote (water votes double)...
  assert.equal(p.right[5], 'water');
  // ...the lone tree does not — a single stall post is not a forest.
  assert.equal(p.top[7], 'meadow');
  // The authored tree line reads as forest along its run.
  assert.equal(p.bottom[8], 'forest');
  // Plain grass borders read as meadow.
  assert.equal(p.left[5], 'meadow');
});

test('packed profiles round-trip', () => {
  const z = zone('t', 8, 6, Tile.Grass, (g) => {
    for (let y = 0; y < 6; y++) g[y * 8 + 7] = Tile.Water;
    for (let x = 0; x < 8; x++) g[x] = Tile.TreeOak;
  });
  const p = zoneEdgeProfileOf(z)!;
  const packed = packZoneEdgeProfile(p);
  assert.deepEqual(unpackZoneEdgeProfile(packed), p);
});

test('the registry refills in place (the live-registry law)', () => {
  const ref = ZONE_EDGE_PROFILES;
  const p = zoneEdgeProfileOf(zone('t', 8, 6, Tile.Grass))!;
  replaceZoneEdgeProfiles([p]);
  assert.equal(ref.length, 1);
  assert.equal(ref[0]!.id, 't');
  replaceZoneEdgeProfiles([]);
  assert.equal(ref.length, 0);
});
