import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath, findPathNav } from './pathfind.js';
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

const WIDE = { cx: 30, cy: 30, r: 60 };

test('nav: rounds a U-shaped pocket instead of entering it', () => {
  // Start due north of the pocket mouth, goal behind the closed back
  // wall — the beeline walks INTO the U; the lane must go around.
  const world = gridWorld([
    '.......',
    '..#.#..',
    '..#.#..',
    '..###..',
    '.......',
  ]);
  const r = findPathNav(world, 3.5, 0.5, 3.5, 4.5, WIDE);
  assert.ok(r.complete);
  // Every step stays off the walls and the path exits via a side.
  assert.ok(r.path.every((p) => !world.isSolid(Math.floor(p.x), Math.floor(p.y))));
  assert.ok(r.path.some((p) => p.x < 2 || p.x > 5));
});

test('nav: goal on a solid tile snaps to the nearest open neighbor', () => {
  // A body pinned at a tree-tile corner is still worth walking to.
  const world = gridWorld(['.....', '..#..', '.....']);
  const r = findPathNav(world, 0.5, 0.5, 2.6, 1.4, WIDE);
  assert.ok(r.complete);
  const end = r.path[r.path.length - 1]!;
  assert.ok(Math.hypot(end.x - 2.6, end.y - 1.4) < 1.5);
});

test('nav: sealed goal returns a best-effort lane toward it', () => {
  const world = gridWorld([
    '.......',
    '..###..',
    '..#.#..',
    '..###..',
    '.......',
  ]);
  const r = findPathNav(world, 0.5, 0.5, 3.5, 2.5, WIDE);
  assert.equal(r.complete, false);
  assert.ok(r.path.length > 0, 'still walks somewhere useful');
  const end = r.path[r.path.length - 1]!;
  const startDist = Math.hypot(0.5 - 3.5, 0.5 - 2.5);
  assert.ok(Math.hypot(end.x - 3.5, end.y - 2.5) < startDist, 'ends nearer the goal');
});

test('nav: never expands outside its bounds circle', () => {
  // The only route around the wall lies beyond the tiny bounds.
  const world = gridWorld([
    '..#..',
    '..#..',
    '..#..',
    '.....',
  ]);
  const r = findPathNav(world, 0.5, 0.5, 4.5, 0.5, { cx: 0.5, cy: 0.5, r: 1.6 });
  assert.equal(r.complete, false);
  assert.ok(r.path.every((p) => Math.hypot(p.x - 0.5, p.y - 0.5) <= 1.6 + 0.71));
});

test('nav: expansion budget still yields a forward partial lane', () => {
  const world = gridWorld(['.'.repeat(50)]);
  const r = findPathNav(world, 0.5, 0.5, 49.5, 0.5, WIDE, 10);
  assert.equal(r.complete, false);
  assert.ok(r.path.length > 0);
  const end = r.path[r.path.length - 1]!;
  assert.ok(end.x > 5, 'partial lane heads toward the goal');
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

test('nav: the long-wall trap — tight bounds hug the wall, widened bounds complete', () => {
  // A wall with EQUAL distance around either end, goal straight across:
  // the classic jostle spot. The cheap bounded ask cannot complete (the
  // detour exits the circle), and its best-effort lane ends hugging the
  // wall right beside the goal — the trap. The escalated ask (the
  // server's bounds.r + 14 / 4500-expansion retry) must COMPLETE around
  // one end instead.
  const rows: string[] = [];
  for (let y = 0; y < 43; y++) rows.push(y === 0 || y === 42 ? '............' : '.....#......');
  const world = gridWorld(rows);
  const tight = findPathNav(world, 0.5, 21.5, 10.5, 21.5, { cx: 5.5, cy: 21.5, r: 13 });
  assert.equal(tight.complete, false, 'the detour exits the tight circle');
  const end = tight.path[tight.path.length - 1]!;
  assert.ok(
    end.x < 5 && Math.abs(end.y - 21.5) < 3,
    `best-effort ends hugging the wall beside the goal, got (${end.x}, ${end.y})`,
  );
  const wide = findPathNav(world, 0.5, 21.5, 10.5, 21.5, { cx: 5.5, cy: 21.5, r: 27 }, 4500);
  assert.equal(wide.complete, true, 'the widened search rounds the wall');
  assert.ok(wide.path.some((p) => p.y < 1.1 || p.y > 41.9), 'the lane walks around a wall end');
});
