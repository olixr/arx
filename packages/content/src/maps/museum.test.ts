import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_DEFS, Tile, SIGN_TILES, isSolidTile } from '@arx/shared';
import { MUSEUM_PLANE_ID } from '../planes.js';
import {
  MUSEUM_EXCLUDED,
  buildMuseum,
  museumExhibitedTiles,
  museumStrayTiles,
} from './museum.js';
import { validateZone, zonePlacementErrors } from './validateZone.js';

test('the museum builds and passes the one zone gate', () => {
  const zone = buildMuseum();
  assert.equal(zone.id, 'museum');
  assert.equal(zone.plane, MUSEUM_PLANE_ID);
  assert.ok(zone.spawn, 'museum declares a spawn');
  assert.deepEqual(zonePlacementErrors(zone), []);
  const verdict = validateZone(zone);
  assert.ok(verdict.ok, `zone gate verdict: ${verdict.error}`);
});

test('coverage is total: every TILE_DEFS id is shown or excluded on purpose', () => {
  // The strays gallery exists exactly so this can never fail on a new
  // tile — it walks in on its own. What CAN fail: an excluded tile
  // that stopped existing, or an exclusion someone widened by hand.
  for (const t of MUSEUM_EXCLUDED) {
    assert.ok(t in TILE_DEFS, `excluded tile ${t} is not in TILE_DEFS`);
  }
  assert.ok(MUSEUM_EXCLUDED.size <= 4, 'exclusions stay a short, argued list');

  const zone = buildMuseum();
  const onFloor = new Set<number>(zone.ground);
  const exhibited = museumExhibitedTiles();
  for (const t of museumStrayTiles()) exhibited.add(t);
  for (const key of Object.keys(TILE_DEFS)) {
    const t = Number(key) as Tile;
    if (MUSEUM_EXCLUDED.has(t)) continue;
    assert.ok(exhibited.has(t), `tile ${t} (${TILE_DEFS[t]!.name}) has no museum bay`);
    assert.ok(onFloor.has(t), `tile ${t} (${TILE_DEFS[t]!.name}) never landed on the floor`);
  }
});

test('every exhibit plinth stands, reads, and can be reached', () => {
  const zone = buildMuseum();
  assert.ok((zone.signs?.length ?? 0) > 300, 'the hall is fully labeled');
  for (const s of zone.signs ?? []) {
    const lx = s.x - zone.origin.x;
    const ly = s.y - zone.origin.y;
    const under = zone.ground[ly * zone.width + lx]!;
    assert.ok(SIGN_TILES.has(under), `sign "${s.title}" lost its board`);
    // The reading spot: the tile just south of every plinth is open
    // floor — a plaque you cannot stand before is a plaque unread.
    const south = zone.ground[(ly + 1) * zone.width + lx]! as Tile;
    assert.ok(!isSolidTile(south), `sign "${s.title}" has no reading spot (${TILE_DEFS[south]?.name})`);
  }
});
