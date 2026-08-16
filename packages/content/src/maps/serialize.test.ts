import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { zoneFromJson, zoneToJson } from './serialize.js';
import { validateZone, zonePlacementErrors } from './validateZone.js';
import type { ZoneDef } from './types.js';

/**
 * THE ROUND TRIP IS THE CONTRACT (core-audit debt 4): ZoneJson and its
 * serializer pair are a hand-maintained shadow of ZoneDef — a future
 * optional field missed there compiles clean and is silently ERASED on
 * every Studio GET→PUT round trip (the `crowned` mechanism relocated
 * into a serializer). This walks a zone with EVERY field populated
 * through both directions and demands deep equality; add a field to
 * ZoneDef and this test names the serializer the moment it goes stale.
 */

function fullZone(): ZoneDef {
  const w = 6;
  const h = 5;
  const ground = new Uint16Array(w * h).fill(Tile.Grass);
  const detail = new Uint16Array(w * h);
  const elev = new Int8Array(w * h);
  elev[7] = 1;
  return {
    id: 'roundtrip_probe',
    name: 'The Round Trip',
    // THE WORLDS APART: the plane rides the round trip explicitly —
    // a re-saved file never leans on the frozen y-derivation again.
    plane: 'surface',
    origin: { x: 100, y: 200 },
    width: w,
    height: h,
    ground,
    detail,
    elev,
    spawn: { x: 102, y: 202 },
    growth: 'wild',
    actorSpawns: [{ actor: 'torvi_stone', x: 101, y: 201, dir: 1.5, routine: 'shopkeep_day' }],
    portals: [
      { x: 103, y: 203, dest: { x: 50, y: 60 }, destPlane: 'underworld' },
      { x: 104, y: 203, delve: true },
    ],
    spawns: [
      {
        npc: 'brigand',
        x: 102,
        y: 203,
        radius: 2,
        count: 2,
        level: 12,
        name: 'The Probe',
        crown: 4242,
        arenaR: 9,
        patrol: [{ x: 101, y: 202, dwell: 40, sit: true }, { x: 103, y: 203 }],
        hours: { from: 6, to: 20 },
        wing: 1,
        post: { kind: 'vigil', x: 102, y: 202, dir: 0.5, hours: { from: 18, to: 6 } },
      },
    ],
    signs: [{ x: 101, y: 203, title: 'The Board', lines: ['words on it'] }],
  };
}

test('zone JSON round trip carries every ZoneDef field whole', () => {
  const zone = fullZone();
  const back = zoneFromJson(JSON.parse(JSON.stringify(zoneToJson(zone))));
  // Typed arrays compare by content.
  assert.deepEqual([...back.ground], [...zone.ground]);
  assert.deepEqual([...back.detail], [...zone.detail]);
  assert.deepEqual([...(back.elev ?? [])], [...(zone.elev ?? [])]);
  // Everything else must survive verbatim — a dropped optional here is
  // a field the serializer shadow lost.
  const strip = (z: ZoneDef): Omit<ZoneDef, 'ground' | 'detail' | 'elev'> => {
    const { ground: _g, detail: _d, elev: _e, ...rest } = z;
    return rest;
  };
  assert.deepEqual(strip(back), strip(zone));
});

test('the placement vet refuses the corrupt shapes the decoder passed through', () => {
  const zone = fullZone();
  assert.deepEqual(zonePlacementErrors(zone), []);
  const bad = {
    ...zone,
    spawns: [{ npc: 'brigand', x: 1, y: 1, radius: Number.NaN, count: 1e9 }],
  } as ZoneDef;
  const errors = zonePlacementErrors(bad);
  assert.ok(errors.some((e) => e.includes('count')), 'the boot-hang count is refused');
  assert.ok(errors.some((e) => e.includes('radius')), 'the NaN radius is refused');
  const doorless = {
    ...zone,
    portals: [{ x: 1, y: 1 }],
  } as ZoneDef;
  assert.ok(
    zonePlacementErrors(doorless).some((e) => e.includes('somewhere')),
    'a portal without a destination is refused',
  );
});

test('validateZone runs the placement vet before the builder replay', () => {
  const bad = {
    ...fullZone(),
    spawns: [{ npc: '', x: 1, y: 1, radius: 1, count: 1 }],
  } as ZoneDef;
  const verdict = validateZone(bad);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.error?.includes('npc'));
});
