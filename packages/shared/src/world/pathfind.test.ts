import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath } from './pathfind.js';
import type { CollisionSource } from './collision.js';

function gridWorld(rows: string[]): CollisionSource {
  return {
    isSolid: (tx, ty) => {
      if (ty < 0 || ty >= rows.length || tx < 0 || tx >= rows[0]!.length) return true;
      return rows[ty]![tx] === '#';
    },
  };
}

test('finds a straight path', () => {
  const world = gridWorld(['....', '....']);
  const path = findPath(world, 0.5, 0.5, 3.5, 0.5);
  assert.ok(path && path.length === 3);
});

test('routes around walls', () => {
  const world = gridWorld([
    '.....',
    '###..',
    '.....',
  ]);
  const path = findPath(world, 0.5, 0.5, 0.5, 2.5);
  assert.ok(path, 'path exists around the wall');
  // Must pass through the gap on the right.
  assert.ok(path.some((p) => p.x >= 3));
});

test('returns null when walled off', () => {
  const world = gridWorld(['..#..', '..#..', '..#..']);
  assert.equal(findPath(world, 0.5, 0.5, 4.5, 0.5), null);
});

test('never cuts corners diagonally', () => {
  const world = gridWorld([
    '.#',
    '..',
  ]);
  const path = findPath(world, 0.5, 0.5, 1.5, 1.5)!;
  assert.ok(path);
  // Direct diagonal would cut the corner of the wall at (1,0).
  assert.equal(path.length, 2, 'goes via (0,1) or equivalent, not straight diagonal');
});

test('handles winding cave-scale maps within budget', () => {
  // Serpentine: forces a long winding path.
  const rows: string[] = [];
  for (let y = 0; y < 60; y++) {
    if (y % 2 === 0) rows.push('.'.repeat(60));
    else rows.push(y % 4 === 1 ? '#'.repeat(59) + '.' : '.' + '#'.repeat(59));
  }
  const world = gridWorld(rows);
  const path = findPath(world, 0.5, 0.5, 0.5, 58.5);
  assert.ok(path, 'long serpentine path found');
  assert.ok(path.length > 500);
});
