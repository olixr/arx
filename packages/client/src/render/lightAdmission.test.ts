/**
 * THE LIGHT IS A REACH — the exposure pass's admission contract.
 *
 * A dynamic light arrives at the fx doors as TWO independent numbers:
 * a radius the signature deals and a strength the bloom deals. Only
 * the strength was ever gated. A light with strength and no reach
 * (radius 0, or NaN from a wire fx that carries no radius) then flowed
 * into poolStopsFor, whose whole job is to divide by that reach — and
 * `NaN <= 0.02` is false, so the guard clause fell through, the stops
 * array came out all-NaN, and addColorStop threw. The exposure pass
 * died on the spot: night rendered as flat noon for every frame that
 * light lived, and because the frame's light list was retired AFTER
 * the pass rather than in a finally, the corpse was never swept and
 * the blackout outlived the effect that caused it.
 *
 * These pin the invariant at both ends — the profile is total, and a
 * reachless light is never drawn.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poolStopsForTest } from './lighting.js';

const finiteStops = (stops: ReadonlyArray<readonly [number, number]>): boolean =>
  stops.every(([off, a]) => Number.isFinite(off) && off >= 0 && off <= 1 && Number.isFinite(a));

test('the pool profile is total — every input yields drawable stops', () => {
  // The degenerate ratios a reachless light produces: 0/0, z/0, and a
  // radius that arrived NaN because the fx carried no radius at all.
  const inputs = [
    0 / 0, // NaN — r = 0 and z = 0 (the shipped crash)
    Infinity, // z > 0, r = 0
    -Infinity,
    Number.NaN,
    -1, // a nonsense negative ratio
    0,
    0.02,
    0.5,
    1,
    12,
    1e9,
  ];
  for (const q of inputs) {
    const stops = poolStopsForTest(q);
    assert.ok(stops.length >= 2, `q=${q} produced a degenerate stop list`);
    assert.ok(
      finiteStops(stops),
      `q=${q} produced non-finite stops: ${JSON.stringify(stops)} — addColorStop would throw`,
    );
  }
});

test('the flat profile is the answer for every non-positive ratio', () => {
  // A source with no height and a source with no reach both read flat;
  // they must share the ONE canonical stops array so the glow-sprite
  // identity memo keeps hitting instead of minting a canvas per frame.
  const flat = poolStopsForTest(0);
  for (const q of [Number.NaN, 0, -1, 0.02, 0 / 0]) {
    assert.equal(poolStopsForTest(q), flat, `q=${q} did not reuse the flat profile`);
  }
});

test('a raised source still flattens its pool outward', () => {
  // The real behaviour the guard must not have disturbed: above the
  // threshold the stops move OUT from the art profile.
  const flat = poolStopsForTest(0);
  const hung = poolStopsForTest(0.5);
  assert.notEqual(hung, flat, 'a hung light must not read as a ground flame');
  assert.ok(finiteStops(hung));
  // The centre stop stays pinned at 0 (the source is still overhead);
  // it is the art stops between centre and rim that travel outward.
  assert.equal(hung[0]![0], flat[0]![0], 'the pool centre stays at the source');
  assert.ok(hung[1]![0] > flat[1]![0], 'the hung pool should flatten outward');
});
