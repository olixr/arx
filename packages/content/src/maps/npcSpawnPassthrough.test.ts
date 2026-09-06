import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { ZoneBuilder } from './builder.js';
import { zoneFromJson, zoneToJson } from './serialize.js';
import { validateZone } from './validateZone.js';

/**
 * BAND 8 ENGINE (L5, A7): THE PASSTHROUGH. An authored zone may seat
 * a body with the same life a POI garrison row has — tribe, hours,
 * patrol, post, minDark — through ZoneBuilder.npcSpawn's opts, copied
 * onto the ZoneSpawn in WORLD coords (the builder's one convention),
 * absent fields absent (the JSON round-trip law). The wardthread
 * zone's wolf row is the first reader.
 */

function line(): ZoneBuilder {
  // The ward line's rect (blockout §2.6): origin (-164,-203), 32x23.
  return new ZoneBuilder('test_wardthread', 'Test ward line', { x: -164, y: -203 }, 32, 23, Tile.Grass);
}

test('THE PASSTHROUGH: tribe, hours, patrol, post and minDark ride onto the ZoneSpawn in world coords', () => {
  const zone = line()
    .npcSpawn('wolf', 23, 19, 2, 2, {
      tribe: 'predators',
      hours: { from: 19, to: 6 },
      patrol: [
        { x: 28, y: 19, dwell: 15 },
        { x: 18, y: 19, dwell: 10 },
      ],
      post: { kind: 'vigil', x: 23, y: 19, dir: 0, hours: { from: 19, to: 6 } },
      minDark: 0.2,
    })
    .build();
  assert.deepEqual(zone.spawns, [
    {
      npc: 'wolf',
      x: -141,
      y: -184,
      radius: 2,
      count: 2,
      tribe: 'predators',
      hours: { from: 19, to: 6 },
      patrol: [
        { x: -136, y: -184, dwell: 15 },
        { x: -146, y: -184, dwell: 10 },
      ],
      post: { kind: 'vigil', x: -141, y: -184, dir: 0, hours: { from: 19, to: 6 } },
      minDark: 0.2,
    },
  ]);
  const vet = validateZone(zone);
  assert.equal(vet.ok, true, JSON.stringify(vet));
  // The JSON round trip carries every field byte-exact.
  assert.deepEqual(zoneFromJson(zoneToJson(zone)).spawns, zone.spawns);
});

test('THE PASSTHROUGH: a bare npcSpawn writes no optional key (absent stays absent)', () => {
  const zone = line().npcSpawn('wolf', 23, 19, 2, 2).build();
  assert.deepEqual(zone.spawns, [{ npc: 'wolf', x: -141, y: -184, radius: 2, count: 2 }]);
  for (const k of ['tribe', 'hours', 'patrol', 'post', 'minDark']) {
    assert.equal(k in zone.spawns[0]!, false, `${k} stays absent`);
  }
  // The patrol copy never aliases the author's array (a later push
  // by the author cannot reach into the built def).
  const pts = [{ x: 28, y: 19 }];
  const built = line().npcSpawn('wolf', 23, 19, 2, 1, { patrol: pts }).build();
  pts.push({ x: 0, y: 0 });
  assert.equal(built.spawns![0]!.patrol!.length, 1);
  assert.equal('dwell' in built.spawns![0]!.patrol![0]!, false, 'an absent dwell stays absent');
});

test('THE COUNTED PACK (band 8 fix pass): `passive` rides onto the ZoneSpawn as `true` and nothing else', () => {
  // The wolves on the ward line walk their loop as theatre and never
  // open on a player (the live audit's dusk stand was a fight); the
  // word is placement data like `tribe`, absent unless said.
  const zone = line().npcSpawn('wolf', 23, 19, 2, 2, { tribe: 'predators', passive: true }).build();
  assert.deepEqual(zone.spawns, [{ npc: 'wolf', x: -141, y: -184, radius: 2, count: 2, tribe: 'predators', passive: true }]);
  assert.equal(validateZone(zone).ok, true);
  assert.deepEqual(zoneFromJson(zoneToJson(zone)).spawns, zone.spawns, 'the JSON round trip carries it');
  const bare = line().npcSpawn('wolf', 23, 19, 2, 2).build();
  assert.equal('passive' in bare.spawns![0]!, false, 'absent stays absent');
  // The validator refuses a hand-written falsy word: `passive: false`
  // would read as a passive row to a lax check.
  const forged = { ...zone, spawns: [{ ...zone.spawns![0]!, passive: false as unknown as true }] };
  const vet = validateZone(forged);
  assert.equal(vet.ok, false);
  assert.ok((vet.error ?? '').includes('passive'), vet.error);
});
