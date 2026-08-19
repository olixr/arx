import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birdsK, cricketsK, dominantZone, skySeam, zoneWeights } from './zones.js';

test('zone weights always sum to 1 and never leave [0,1]', () => {
  for (let x = -200; x <= 200; x += 7) {
    for (const y of [-150, 0, 30, 48, 90, 511, 512, 1040, 9000]) {
      for (const under of [false, true]) {
        const w = zoneWeights(x, y, under);
        assert.ok(Math.abs(w.town + w.wild + w.cave - 1) < 1e-9, `sum at ${x},${y}`);
        for (const v of [w.town, w.wild, w.cave]) assert.ok(v >= 0 && v <= 1);
      }
    }
  }
});

test('the green is town, the far field is wild, cave planes are cave', () => {
  assert.equal(zoneWeights(-64, 48).town, 1);
  assert.equal(dominantZone(zoneWeights(-64, 48)), 'town');
  assert.equal(zoneWeights(300, 48).wild, 1);
  assert.equal(dominantZone(zoneWeights(300, 48)), 'wild');
  // THE WORLDS APART: underground is the PLANE'S flag, never a y-line
  // — the far south is open wilderness now.
  assert.equal(zoneWeights(20, 1040, true).cave, 1);
  assert.equal(dominantZone(zoneWeights(20, 1040, true)), 'cave');
  assert.equal(zoneWeights(20, 1040).wild, 1);
});

test('the town edge fades — no cliff in the crossfade', () => {
  // THE DAWN COMES OPEN: Dawnmead's row is sized to its 192x224 rect
  // (half-diagonal 147), so full town weight covers the built ground
  // and the fade lands on zero out past the east hem at world x=31 —
  // by x=120 the First Road has the ear entirely.
  let prev = zoneWeights(-64, 48).town;
  for (let x = -64; x <= 130; x += 0.5) {
    const cur = zoneWeights(x, 48).town;
    assert.ok(cur <= prev + 1e-9, 'town weight is monotone outward');
    assert.ok(Math.abs(cur - prev) < 0.06, `smooth at x=${x}`);
    prev = cur;
  }
  assert.equal(prev, 0);
});

test("THE SKY'S SEAM: dusk and dawn each cross once, warps cross nothing", () => {
  // A frame stepping over sunset hears dusk; over sunrise, dawn.
  assert.equal(skySeam(20.49, 20.51), 'dusk');
  assert.equal(skySeam(5.49, 5.51), 'dawn');
  // An ordinary frame step crosses nothing.
  assert.equal(skySeam(12.0, 12.001), null);
  assert.equal(skySeam(20.51, 20.52), null);
  // Midnight wraps without inventing a seam.
  assert.equal(skySeam(23.99, 0.01), null);
  // A warp-sized jump (login, /time) crosses nothing — even over dusk.
  assert.equal(skySeam(12, 22), null);
  assert.equal(skySeam(22, 12), null);
  // A stalled clock stays quiet.
  assert.equal(skySeam(20.5, 20.5), null);
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
