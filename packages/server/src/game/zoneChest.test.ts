import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import type { ZoneDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * BAND 7 ENGINE (L5): THE ZONE'S WARDED CHEST. An authored zone binds
 * a strongbox to a pinned site's garrison and a loot table; the server
 * registers it exactly as the POI materialise path registers a def's
 * chestLoot/chestWarded, so the one chest-open door wards it while
 * that cell's fighters stand and lifts it once they are broken. The
 * bindings retire with the zone's placements. Slate convention.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

function zone(chests: ZoneDef['chests']): ZoneDef {
  return {
    id: 'test_fenside',
    name: 'Test fen waist',
    origin: { x: 124, y: 76 },
    width: 4,
    height: 4,
    ground: new Uint16Array(16).fill(Tile.Grass),
    detail: new Uint16Array(16),
    chests,
  };
}

function slate() {
  const spawns = [{ npc: 'brigand', eid: 9 as number | null, respawnAt: 0, active: true }];
  const s = {
    authoredCells: () => new Map([['3,4', 'first_road_toll']]),
    poiChests: new Map<string, { cell: string; table?: string; warded?: boolean }>(),
    zonePlacements: new Map(),
    poiLive: new Map([['3,4', { spawnIdx: [0] }]]),
    spawnPoints: spawns,
    freeSpawnSlots: [] as number[],
    freeActorSlots: [] as number[],
    actorSpawnPoints: [] as unknown[],
    zonePlacementIdx: proto.zonePlacementIdx,
    authoredCellOf: proto.authoredCellOf,
    registerZoneChests: proto.registerZoneChests,
    retireZonePlacements: proto.retireZonePlacements,
    poiGarrisonStands: proto.poiGarrisonStands,
    poiSpawnFights: proto.poiSpawnFights,
    warned: [] as string[],
  };
  return s;
}

test('the zone chest registers as the POI path does, keyed to the warding site’s cell', () => {
  const s = slate();
  (proto.registerZoneChests as Fn).call(
    s,
    zone([{ x: 125, y: 77, table: 'chest_pit_takings', wardedBy: 'first_road_toll' }]) as never,
  );
  assert.deepEqual(s.poiChests.get('surface|125,77'), { cell: '3,4', table: 'chest_pit_takings', warded: true });
  // The lid holds while the bar's crew stands, and lifts once it is broken.
  assert.equal((proto.poiGarrisonStands as Fn).call(s, '3,4' as never), true);
  s.spawnPoints[0]!.eid = null;
  assert.equal((proto.poiGarrisonStands as Fn).call(s, '3,4' as never), false);
});

test('a ward by a site the plan does not pin binds nothing', () => {
  const s = slate();
  const warn = console.warn;
  console.warn = (m: string) => s.warned.push(m);
  try {
    (proto.registerZoneChests as Fn).call(
      s,
      zone([{ x: 125, y: 77, table: 'chest_pit_takings', wardedBy: 'nobody_pins_this' }]) as never,
    );
  } finally {
    console.warn = warn;
  }
  assert.equal(s.poiChests.size, 0);
  assert.ok(s.warned.some((m) => m.includes('nobody_pins_this')));
});

test('the bindings retire with the zone’s placements (a live save never leaves a stale ward)', () => {
  const s = slate();
  (proto.registerZoneChests as Fn).call(
    s,
    zone([{ x: 125, y: 77, table: 'chest_pit_takings', wardedBy: 'first_road_toll' }]) as never,
  );
  assert.equal(s.poiChests.size, 1);
  (proto.retireZonePlacements as Fn).call(s, 'test_fenside' as never);
  assert.equal(s.poiChests.size, 0);
});
