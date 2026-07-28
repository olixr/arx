import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISCOVER_TILES, DUNGEON_MIN_Y } from '@arx/shared';
import {
  dungeonDiscoveryId,
  findDiscoveries,
  poiDiscoveryId,
  zoneDiscoveryId,
  type DiscoverySite,
} from './exploration.js';

const ZONES = [
  { id: 'amberford', name: 'Amberford', origin: { x: 296, y: -16 }, width: 112, height: 80 },
  { id: 'undercroft', name: 'The Undercroft', origin: { x: -344, y: 520 }, width: 96, height: 64 },
  { id: 'poi:1,0', name: 'Goblin warcamp', origin: { x: 140, y: 20 }, width: 30, height: 30 },
  { id: 'delve_9', name: 'The Mossgrown Barrow', origin: { x: 8192, y: 8192 }, width: 100, height: 100 },
];

const CAMP: DiscoverySite = { cellX: 1, cellY: 0, tier: 3, anchorX: 147, anchorY: 30, defId: 'goblin_warcamp' };
const WAYSTATION: DiscoverySite = { cellX: 2, cellY: 0, tier: 2, anchorX: 300, anchorY: 40, defId: 'waystation' };

const DEF_INFO = (defId: string) =>
  defId === 'goblin_warcamp'
    ? { name: 'Goblin warcamp' }
    : defId === 'waystation'
      ? { name: "Wayfarers' waystation", haven: true }
      : undefined;

const NONE = new Map<string, { faded?: boolean }>();

test('zone containment discovers the town once, at its center', () => {
  const found = findDiscoveries(340, 20, ZONES, [], DEF_INFO, NONE);
  assert.equal(found.length, 1);
  assert.equal(found[0]!.d.id, zoneDiscoveryId('amberford'));
  assert.equal(found[0]!.d.kind, 'town');
  assert.equal(found[0]!.d.name, 'Amberford');
  assert.deepEqual([found[0]!.d.x, found[0]!.d.y], [352, 24]);
  // One tile west of the rect: nothing.
  assert.equal(findDiscoveries(295, 20, ZONES, [], DEF_INFO, NONE).length, 0);
  // Already known: nothing.
  const known = new Map([[zoneDiscoveryId('amberford'), {}]]);
  assert.equal(findDiscoveries(340, 20, ZONES, [], DEF_INFO, known).length, 0);
});

test('composed poi zones and instance-band zones never discover as towns', () => {
  assert.equal(findDiscoveries(150, 30, ZONES, [], DEF_INFO, NONE).length, 0, 'poi: zone skipped');
  assert.equal(
    findDiscoveries(8200, 8200, ZONES, [], DEF_INFO, NONE).length,
    0,
    'dungeon instance skipped',
  );
});

test('the dark band authored zone IS discoverable', () => {
  const found = findDiscoveries(-300, 550, ZONES, [], DEF_INFO, NONE);
  assert.equal(found[0]?.d.name, 'The Undercroft');
  assert.ok(550 > 512 && 550 < DUNGEON_MIN_Y);
});

test('sites discover by anchor radius; havens read as towns', () => {
  const sites = [
    { site: CAMP, epoch: 2 },
    { site: WAYSTATION, epoch: 0 },
  ];
  // Standing at the camp: camp within DISCOVER_TILES, waystation not.
  const found = findDiscoveries(147 + DISCOVER_TILES - 1, 30, ZONES.slice(0, 2), sites, DEF_INFO, NONE);
  assert.equal(found.length, 1);
  assert.equal(found[0]!.d.id, poiDiscoveryId(1, 0));
  assert.equal(found[0]!.d.kind, 'poi');
  assert.equal(found[0]!.d.tier, 3);
  assert.equal(found[0]!.epoch, 2);
  // At the waystation: haven kind reads 'town'.
  const atHaven = findDiscoveries(300, 41, [], sites, DEF_INFO, NONE);
  assert.equal(atHaven.length, 1);
  assert.equal(atHaven[0]!.d.kind, 'town');
  // Unknown archetype yields nothing rather than a nameless marker.
  const ghost = findDiscoveries(300, 41, [], [{ site: { ...WAYSTATION, defId: 'gone' }, epoch: 0 }], DEF_INFO, NONE);
  assert.equal(ghost.length, 0);
});

test('a standing known site stays quiet; a faded one rediscovers', () => {
  const sites = [{ site: CAMP, epoch: 3 }];
  const knownLive = new Map([[poiDiscoveryId(1, 0), {}]]);
  assert.equal(findDiscoveries(147, 30, [], sites, DEF_INFO, knownLive).length, 0);
  const knownFaded = new Map([[poiDiscoveryId(1, 0), { faded: true }]]);
  const again = findDiscoveries(147, 30, [], sites, DEF_INFO, knownFaded);
  assert.equal(again.length, 1);
  assert.ok(again[0]!.rediscovered);
  assert.equal(again[0]!.epoch, 3);
});

test('discovery id shapes are stable', () => {
  assert.equal(zoneDiscoveryId('dawnmead'), 'zone:dawnmead');
  assert.equal(poiDiscoveryId(-2, 4), 'poi:-2,4');
  assert.equal(dungeonDiscoveryId(197, 311), 'dungeon:197,311');
});
