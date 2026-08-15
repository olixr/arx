import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birdsK, cricketsK, dominantZone, zoneWeights } from './zones.js';

test('zone weights always sum to 1 and never leave [0,1]', () => {
  for (let x = -200; x <= 200; x += 7) {
    for (const y of [-150, 0, 30, 48, 90, 511, 512, 1040, 9000]) {
      const w = zoneWeights(x, y);
      assert.ok(Math.abs(w.town + w.wild + w.cave - 1) < 1e-9, `sum at ${x},${y}`);
      for (const v of [w.town, w.wild, w.cave]) assert.ok(v >= 0 && v <= 1);
    }
  }
});

test('the green is town, the far field is wild, underground is cave', () => {
  assert.equal(zoneWeights(-64, 48).town, 1);
  assert.equal(dominantZone(zoneWeights(-64, 48)), 'town');
  assert.equal(zoneWeights(300, 48).wild, 1);
  assert.equal(dominantZone(zoneWeights(300, 48)), 'wild');
  assert.equal(zoneWeights(20, 1040).cave, 1);
  assert.equal(dominantZone(zoneWeights(20, 1040)), 'cave');
});

test('the town edge fades — no cliff in the crossfade', () => {
  // The rebuilt Dawnmead fills its whole rect: the town weight rides
  // the lane east and lands on zero exactly where the First Road
  // takes over at world x=0.
  let prev = zoneWeights(-64, 48).town;
  for (let x = -64; x <= 0; x += 0.5) {
    const cur = zoneWeights(x, 48).town;
    assert.ok(cur <= prev + 1e-9, 'town weight is monotone outward');
    assert.ok(Math.abs(cur - prev) < 0.06, `smooth at x=${x}`);
    prev = cur;
  }
  assert.equal(prev, 0);
});

test('birds own the day, crickets own the night, dusk holds a quiet gap', () => {
  assert.ok(birdsK(13) > 0.99);
  assert.ok(birdsK(1) < 0.01);
  assert.ok(cricketsK(0.5) > 0.99);
  assert.ok(cricketsK(13) < 0.01);
  // The expectant half-hour around sunset: neither sings at 20.0.
  assert.ok(birdsK(20.0) < 0.05);
  assert.ok(cricketsK(20.0) < 0.05);
  // Pre-dawn fade-out finishes before the birds start.
  assert.ok(cricketsK(5.6) < 0.01);
  assert.ok(birdsK(5.6) < 0.05);
});
