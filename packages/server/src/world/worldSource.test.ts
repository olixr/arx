import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, tileIndex } from '@arx/shared';
import { SURFACE_PLANE, WORLD_SEED, buildDawnmead, buildSett } from '@arx/content';
import { WorldSource } from './worldSource.js';

/**
 * THE REACH ANCHOR (contested lands, band 9d, L4's E2; rulings R-D):
 * a sunk zone with no spawn proves its floors reachable through
 * `reachFrom`, and NEVER becomes a respawn hearth, because every
 * spawn reader on the plane (`spawn`, `spawnOf`, `nearestSpawnTo`)
 * reads `zone.spawn` alone. The Sett is the first such zone: a
 * character who dies on its floor rises at Dawnmead, not in the bowl.
 */
test('THE REACH ANCHOR (9d E2): the Sett is no hearth — nearestSpawnTo inside the bowl answers Dawnmead, spawnOf answers nothing', () => {
  const dawnmead = buildDawnmead();
  const sett = buildSett();
  assert.equal(sett.spawn, undefined, 'the Sett declares no spawn');
  assert.deepEqual(sett.reachFrom, { x: 172, y: 266 }, 'the Sett carries its reach anchor');
  const world = new WorldSource(WORLD_SEED, SURFACE_PLANE, [dawnmead, sett]);
  assert.deepEqual(world.spawn, dawnmead.spawn, 'the world spawn is the first zone declaring one');
  assert.equal(world.spawnOf('sett'), undefined, 'the Sett has no spawn of its own');
  // The Plug, the wet floor, the yard, the lip: every point in the
  // rect resolves to Dawnmead's hearth, never to the anchor.
  for (const [x, y] of [[175, 291], [172, 300], [160, 293], [172, 266], [172, 271]] as const) {
    assert.deepEqual(world.nearestSpawnTo(x, y), dawnmead.spawn, `(${x},${y}) rises at Dawnmead`);
  }
  // The anchor is stamped nowhere on the plane's ground: the lip cell
  // under it is the zone's approach Dirt at level 0, and the bowl
  // below it carries the sunk levels the overlay stamps verbatim.
  assert.equal(world.tileAt(172, 266), 3, 'the approach is Dirt');
  const core = world.ensure(Math.floor(175 / CHUNK_SIZE), Math.floor(291 / CHUNK_SIZE));
  assert.equal(core.elev[tileIndex(175, 291)], -2, 'the Plug stands on the −2 floor the overlay stamped');
  const lip = world.ensure(Math.floor(172 / CHUNK_SIZE), Math.floor(271 / CHUNK_SIZE));
  assert.equal(lip.elev[tileIndex(172, 271)], -1, 'the foot apron is on the −1 ring');
  assert.equal(lip.elev[tileIndex(172, 266)], 0, 'the lip is level 0');
});
