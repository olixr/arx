import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pointInPolygon, polyBounds } from './geom.js';

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

test('pointInPolygon: interior and exterior of a square', () => {
  assert.equal(pointInPolygon(square, 5, 5), true);
  assert.equal(pointInPolygon(square, 15, 5), false);
  assert.equal(pointInPolygon(square, -1, 5), false);
  assert.equal(pointInPolygon(square, 5, 11), false);
});

test('pointInPolygon: concave polygon holds its notch open', () => {
  // A U shape: the notch between the arms is outside.
  const u = [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 10 },
    { x: 8, y: 10 },
    { x: 8, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 10 },
    { x: 0, y: 10 },
  ];
  assert.equal(pointInPolygon(u, 2, 8), true, 'left arm');
  assert.equal(pointInPolygon(u, 10, 8), true, 'right arm');
  assert.equal(pointInPolygon(u, 6, 8), false, 'the notch');
  assert.equal(pointInPolygon(u, 6, 2), true, 'the base');
});

test('pointInPolygon: winding order does not matter', () => {
  const reversed = [...square].reverse();
  assert.equal(pointInPolygon(reversed, 5, 5), true);
  assert.equal(pointInPolygon(reversed, 15, 5), false);
});

test('pointInPolygon: a shared border belongs to exactly one side', () => {
  // Two squares sharing the x=10 edge: a point on the seam is inside
  // exactly one of them, so adjacent triggers never double-fire.
  const right = [
    { x: 10, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 10 },
    { x: 10, y: 10 },
  ];
  const a = pointInPolygon(square, 10, 5);
  const b = pointInPolygon(right, 10, 5);
  assert.equal(a !== b, true, `seam point in exactly one (left=${a} right=${b})`);
});

test('polyBounds: the box hugs the ring', () => {
  const b = polyBounds([
    { x: -3, y: 7 },
    { x: 12, y: -2 },
    { x: 4, y: 9 },
  ]);
  assert.deepEqual(b, { minX: -3, minY: -2, maxX: 12, maxY: 9 });
});
