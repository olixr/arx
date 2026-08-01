import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_SPEED } from '@arx/shared';
import { MOUNT_MULT_CAP, MOUNTS, maxMountSpeed, mountDef } from './mounts.js';

test('mount ids are unique slugs the registry resolves', () => {
  const seen = new Set<string>();
  for (const m of MOUNTS) {
    assert.match(m.id, /^[a-z][a-z0-9_]*$/);
    assert.ok(!seen.has(m.id), `duplicate mount id ${m.id}`);
    seen.add(m.id);
    assert.equal(mountDef(m.id), m);
  }
  assert.equal(mountDef('no_such_beast'), undefined);
});

test('THE SADDLE OUTRANKS THE SOLES: every mult is a real gain under the cap', () => {
  for (const m of MOUNTS) {
    // Faster than the best foot stack is the point; the cap is the wall.
    assert.ok(m.speedMult > 1.3, `${m.id} too slow to be a mount`);
    assert.ok(m.speedMult <= MOUNT_MULT_CAP, `${m.id} over MOUNT_MULT_CAP`);
  }
});

test('the netcode lane holds: no saddle reaches remote smoothing speed', () => {
  // interpolation.ts SMOOTH_MAX_SPEED = 12 t/s ("a sprinting mount
  // stays under this"). The cap must leave nudge headroom below it.
  assert.ok(maxMountSpeed() <= MOUNT_MULT_CAP * PLAYER_SPEED);
  assert.ok(MOUNT_MULT_CAP * PLAYER_SPEED < 12, 'cap crossed the smoothing lane');
});

test('flavor keeps the voice: one plain sentence, dash ban honored', () => {
  for (const m of MOUNTS) {
    assert.ok(m.flavor.length <= 120, `${m.id} flavor runs long`);
    assert.ok(m.flavor.endsWith('.'), `${m.id} flavor unfinished`);
    // The dash ban (docs/VOICE.md): no em/en dashes, --, or … anywhere.
    // U+2212 MINUS SIGN is in the net too: it reads as an en dash.
    assert.doesNotMatch(m.flavor, /—|–|−|--|…/, `${m.id} flavor breaks the dash ban`);
    assert.doesNotMatch(m.name, /—|–|−|--|…/, `${m.id} name breaks the dash ban`);
  }
});

test('every mount names a body and a coat for the painter', () => {
  for (const m of MOUNTS) {
    assert.ok(m.body.length > 0);
    assert.ok(m.coat.length > 0);
  }
});
