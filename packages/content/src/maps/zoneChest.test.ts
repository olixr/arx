import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { ZoneBuilder } from './builder.js';
import { zoneFromJson, zoneToJson } from './serialize.js';
import { validateZone, zonePlacementErrors } from './validateZone.js';

/**
 * BAND 7 ENGINE (L5): THE ZONE'S WARDED CHEST (site-grammar G-6) and
 * the growth setter (G-3). A zone binds a strongbox to a PINNED
 * authored site's garrison and a loot table; the vet refuses a lid
 * warded by nobody the plan pins, an open or absent chest tile, and
 * an unknown table. The builder's growth mark stays absent unless set.
 */

function fenside(): ZoneBuilder {
  const b = new ZoneBuilder('test_fenside', 'Test fen waist', { x: 124, y: 76 }, 12, 10, Tile.Grass);
  return b;
}

test('the growth setter marks the built def, and stays absent when unset', () => {
  const kept = fenside().build();
  assert.equal('growth' in kept, false, 'an unset growth adds no key');
  const wild = fenside().growth('wild').build();
  assert.equal(wild.growth, 'wild');
  assert.deepEqual(zonePlacementErrors(wild), []);
});

test('a zone chest binds a closed chest tile to a pinned ward and a table', () => {
  const zone = fenside().growth('wild').chest(5, 4, 'chest_pit_takings', 'first_road_toll').build();
  assert.equal(zone.ground[4 * zone.width + 5], Tile.ChestIron, 'the builder stands the chest tile');
  assert.deepEqual(zone.chests, [{ x: 129, y: 80, table: 'chest_pit_takings', wardedBy: 'first_road_toll' }]);
  assert.deepEqual(zonePlacementErrors(zone), []);
  assert.equal(validateZone(zone).ok, true);
  // The JSON round trip carries the binding; a chestless zone writes no key.
  const back = zoneFromJson(zoneToJson(zone));
  assert.deepEqual(back.chests, zone.chests);
  assert.equal(zoneToJson(fenside().build()).chests, undefined);
  assert.equal('chests' in fenside().build(), false, 'an empty binding list adds no key');
});

test('the builder refuses an open lid or a non-chest tile as a chest', () => {
  assert.throws(() => fenside().chest(2, 2, 'chest_pit_takings', 'first_road_toll', Tile.ChestIronOpen), /closed chest tile/);
  assert.throws(() => fenside().chest(2, 2, 'chest_pit_takings', 'first_road_toll', Tile.Crate), /closed chest tile/);
});

test('the placement vet refuses a ward by an unpinned site, an unknown table, and a lidless binding', () => {
  const zone = fenside().chest(5, 4, 'chest_pit_takings', 'first_road_toll').build();
  const patched = (over: Partial<NonNullable<typeof zone.chests>[number]>) => ({
    ...zone,
    chests: [{ ...zone.chests![0]!, ...over }],
  });
  assert.ok(
    zonePlacementErrors(patched({ wardedBy: 'nobody_pins_this' })).some((e) => e.includes('not a pinned authored site')),
    'an unknown site id is refused',
  );
  assert.ok(
    zonePlacementErrors(patched({ table: 'chest_of_wonders' })).some((e) => e.includes('unknown loot table')),
    'an unknown table is refused',
  );
  assert.ok(
    zonePlacementErrors(patched({ x: 125, y: 77 })).some((e) => e.includes('no closed chest tile')),
    'a binding over plain ground is refused',
  );
  assert.ok(
    zonePlacementErrors(patched({ x: 200, y: 77 })).some((e) => e.includes('outside the zone rect')),
    'a binding outside the rect is refused',
  );
  // validateZone runs the same vet before the builder replay.
  const verdict = validateZone(patched({ wardedBy: 'nobody_pins_this' }));
  assert.equal(verdict.ok, false);
  assert.ok(verdict.error?.includes('nobody_pins_this'));
});
