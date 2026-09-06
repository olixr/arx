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

/**
 * BAND 9d ENGINE (L4, E1): VORL'S DOOR. A zone row may be named,
 * levelled and mouthed (ZoneSpawn carried all three; the server read
 * them off any spawn record; only the builder never threaded them).
 * The Sett's one row is the first reader: the champion at his own
 * level 14, named, speaking through `dolmen_vorl`, passive.
 */
test('VORL\'S DOOR (9d E1): name, level and mouth ride onto the ZoneSpawn; absent stays absent; the vet holds the name short', () => {
  const zone = line()
    .npcSpawn('dolmen_champion', 10, 10, 0, 1, {
      level: 14,
      name: 'Vorl Fullweight',
      mouth: 'dolmen_vorl',
      tribe: 'dolmen',
      passive: true,
      post: { kind: 'vigil', x: 10, y: 10, dir: 0 },
    })
    .build();
  assert.deepEqual(zone.spawns, [
    {
      npc: 'dolmen_champion',
      x: -154,
      y: -193,
      radius: 0,
      count: 1,
      level: 14,
      name: 'Vorl Fullweight',
      mouth: 'dolmen_vorl',
      tribe: 'dolmen',
      passive: true,
      post: { kind: 'vigil', x: -154, y: -193, dir: 0 },
    },
  ]);
  assert.equal(validateZone(zone).ok, true);
  assert.deepEqual(zoneFromJson(zoneToJson(zone)).spawns, zone.spawns, 'the JSON round trip carries all three');
  const bare = line().npcSpawn('dolmen_champion', 10, 10, 0, 1).build();
  for (const k of ['name', 'level', 'mouth']) assert.equal(k in bare.spawns![0]!, false, `${k} stays absent`);
  // The name vet: a 61-char name and a non-string are refused; sixty stands.
  const named = (name: unknown) => ({ ...zone, spawns: [{ ...zone.spawns![0]!, name: name as string }] });
  assert.equal(validateZone(named('x'.repeat(60))).ok, true, 'sixty characters stand');
  const long = validateZone(named('x'.repeat(61)));
  assert.equal(long.ok, false);
  assert.ok((long.error ?? '').includes('name'), long.error);
  const notString = validateZone(named(7));
  assert.equal(notString.ok, false);
  assert.ok((notString.error ?? '').includes('name'), notString.error);
  assert.equal(validateZone(named('')).ok, false, 'an empty name is no name');
});

/**
 * BAND 9d ENGINE (L4, E2): THE REACH ANCHOR. A sunk zone with no
 * spawn used to build unchecked; with `reachFrom` it floods from the
 * anchor and throws on a sealed pocket, and the built def carries
 * `reachFrom` and no `spawn`, so it never becomes a respawn hearth.
 */
function sunk(anchor: boolean, stairs: boolean): ZoneBuilder {
  // A 12x12 flat rect with a 4x4 dell sunk one level in its middle,
  // reached (or not) by one stair on its north rim.
  const b = new ZoneBuilder('test_sunk', 'Test dell', { x: 100, y: 100 }, 12, 12, Tile.Grass);
  b.sink(4, 4, 4, 4, 1);
  if (stairs) b.stairs(5, 3);
  if (anchor) b.reachFrom(1, 1);
  return b;
}

test('THE REACH ANCHOR (9d E2): no spawn and no anchor builds unchecked; an anchor proves the flood; the def carries reachFrom and no spawn', () => {
  // Today's behaviour, byte-identical: a spawnless sunk zone with a
  // sealed dell builds (dungeons entered by portal validate in play).
  const unchecked = sunk(false, false).build();
  assert.equal(unchecked.spawn, undefined);
  assert.equal('reachFrom' in unchecked, false, 'absent stays absent');
  // With an anchor and no stair the dell is a sealed pocket: the build
  // throws naming the anchor and the pocket.
  assert.throws(() => sunk(true, false).build(), /reachFrom \(101,101\)/);
  // With the stair it builds, carries the anchor in WORLD coords and
  // still declares no spawn.
  const reached = sunk(true, true).build();
  assert.deepEqual(reached.reachFrom, { x: 101, y: 101 });
  assert.equal(reached.spawn, undefined, 'a reach anchor is never a spawn');
  // The gate replays it: the same def validates, and the same def
  // with its stair painted over fails at the same anchor.
  assert.equal(validateZone(reached).ok, true, JSON.stringify(validateZone(reached)));
  const sealed = { ...reached, ground: new Uint16Array(reached.ground) };
  sealed.ground[3 * 12 + 5] = Tile.Grass;
  const vet = validateZone(sealed);
  assert.equal(vet.ok, false);
  assert.ok((vet.error ?? '').includes('reachFrom'), vet.error);
  // The JSON round trip carries the anchor and keeps an absent one absent.
  assert.deepEqual(zoneFromJson(zoneToJson(reached)).reachFrom, { x: 101, y: 101 });
  assert.equal('reachFrom' in zoneFromJson(zoneToJson(unchecked)), false);
  // A spawn still wins the flood when both are set (the legacy law).
  const both = sunk(true, true).spawn(1, 2).build();
  assert.deepEqual(both.spawn, { x: 101, y: 102 });
  assert.deepEqual(both.reachFrom, { x: 101, y: 101 });
});
