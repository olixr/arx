import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NO_COLLISION, type CollisionSource } from '../world/collision.js';
import { Tile } from '../world/tiles.js';
import {
  ALERT_MAX,
  ALERT_RATE_MAX,
  ALERT_RATE_MIN,
  ALERT_SUS,
  ALERT_WATCH_CAP,
  COVER_VIS_FACTOR,
  PERIPHERAL_RATE,
  SIGHT_CLOSE_RANGE,
  SIGHT_PERIPHERAL_FRAC,
  SIGHT_RANGE_MULT,
  alertRate,
  sightLine,
  sightVisibility,
  sightZone,
} from './perception.js';

/** A world of one tile kind painted onto listed cells. */
function worldOf(tile: Tile, cells: Array<[number, number]>): CollisionSource {
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  return {
    isSolid: (tx, ty) => set.has(`${tx},${ty}`),
    tileAt: (tx, ty) => (set.has(`${tx},${ty}`) ? tile : Tile.Grass),
  };
}

test('sightLine: open ground is clear', () => {
  const line = sightLine(NO_COLLISION, 0.5, 0.5, 12.5, 4.5);
  assert.ok(line.clear);
  assert.equal(line.cover, 0);
});

test('sightLine: a wall across the line seals it', () => {
  const wall = worldOf(
    Tile.WallStone,
    [
      [5, -1],
      [5, 0],
      [5, 1],
      [5, 2],
    ],
  );
  assert.ok(!sightLine(wall, 0.5, 0.5, 10.5, 0.5).clear);
  // Looking parallel to the wall, never crossing it: clear.
  assert.ok(sightLine(wall, 3.5, 0.5, 3.5, 8.5).clear);
});

test('sightLine: sight is not walk-clearance — a fence hides nobody', () => {
  const fence = worldOf(
    Tile.Fence,
    [
      [5, 0],
      [5, 1],
      [5, 2],
    ],
  );
  const line = sightLine(fence, 0.5, 1.5, 10.5, 1.5);
  assert.ok(line.clear);
  assert.equal(line.cover, 0);
});

test('sightLine: one trunk dulls, two seal', () => {
  const oneTree = worldOf(Tile.Tree, [[5, 1]]);
  const one = sightLine(oneTree, 0.5, 1.5, 10.5, 1.5);
  assert.ok(one.clear);
  assert.equal(one.cover, 1);
  assert.equal(sightVisibility(one), COVER_VIS_FACTOR);

  const grove = worldOf(
    Tile.Tree,
    [
      [4, 1],
      [7, 1],
    ],
  );
  const two = sightLine(grove, 0.5, 1.5, 10.5, 1.5);
  assert.equal(sightVisibility(two), 0);
});

test('sightLine: endpoint cells never occlude', () => {
  // Watcher pressed into a tree's own cell corner, target beside a
  // wall cell: neither endpoint's mass counts against the line.
  const world = worldOf(
    Tile.WallStone,
    [
      [0, 0],
      [10, 0],
    ],
  );
  assert.ok(sightLine(world, 0.9, 0.5, 10.1, 0.5).clear);
});

test('sightLine: a corner seam between two diagonal walls is sealed', () => {
  // Walls diagonally adjacent at (5,-1) and (4,0); the slope-1 ray
  // from (4.5,-0.5) to (7.5,2.5) passes exactly through their shared
  // corner (5,0) — it must not thread the seam between them.
  const world = worldOf(
    Tile.WallStone,
    [
      [5, -1],
      [4, 0],
    ],
  );
  const line = sightLine(world, 4.5, -0.5, 7.5, 2.5);
  assert.ok(!line.clear);
});

test('sightZone: the close ring is all-round', () => {
  // Target dead behind the watcher (facing +x), inside the ring.
  assert.equal(sightZone(-1.5, 0, 1.5, 0, 100, 12), 'close');
});

test('sightZone: the cone honors facing and arc', () => {
  // Facing +x, 90° full arc: 40° off is in, 50° off is out.
  const inA = (40 * Math.PI) / 180;
  const outA = (50 * Math.PI) / 180;
  const d = 8;
  assert.equal(
    sightZone(Math.cos(inA) * d, Math.sin(inA) * d, d, 0, 90, 12),
    'cone',
  );
  assert.notEqual(
    sightZone(Math.cos(outA) * d, Math.sin(outA) * d, d, 0, 90, 12),
    'cone',
  );
});

test('sightZone: 360 arc sees all round at full range', () => {
  assert.equal(sightZone(-11, 0, 11, 0, 360, 12), 'cone');
});

test('sightZone: behind falls to peripheral only when near', () => {
  const range = 12;
  const nearBehind = range * SIGHT_PERIPHERAL_FRAC - 0.5;
  const farBehind = range * SIGHT_PERIPHERAL_FRAC + 1;
  assert.equal(sightZone(-nearBehind, 0, nearBehind, 0, 100, range), 'peripheral');
  assert.equal(sightZone(-farBehind, 0, farBehind, 0, 100, range), null);
});

test('sightZone: beyond range sees nothing', () => {
  assert.equal(sightZone(13, 0, 13, 0, 100, 12), null);
});

test('sightZone: a shrunken close ring lets the crouch inside', () => {
  // Sneak thins the ring: 1.2 tiles out behind the watcher is
  // 'close' at the default ring but only 'peripheral' under a 0.9
  // ring — the crouched approach slips inside the reflex.
  assert.equal(sightZone(-1.2, 0, 1.2, 0, 100, 12), 'close');
  assert.equal(sightZone(-1.2, 0, 1.2, 0, 100, 12, 0.9), 'peripheral');
});

test('alertRate: distance is time — near fills fast, the edge slow', () => {
  assert.ok(Math.abs(alertRate(0, 12, 'cone') - ALERT_RATE_MAX) < 1e-9);
  assert.ok(Math.abs(alertRate(12, 12, 'cone') - ALERT_RATE_MIN) < 1e-9);
  assert.ok(alertRate(6, 12, 'cone') > ALERT_RATE_MIN);
  assert.ok(alertRate(6, 12, 'cone') < ALERT_RATE_MAX);
});

test('alertRate: the peripheral band runs at half attention', () => {
  const d = 4;
  assert.ok(
    Math.abs(alertRate(d, 12, 'peripheral') - alertRate(d, 12, 'cone') * PERIPHERAL_RATE) < 1e-9,
  );
});

test('constants stay sane as a set', () => {
  assert.ok(SIGHT_CLOSE_RANGE > 0);
  assert.ok(SIGHT_PERIPHERAL_FRAC > 0 && SIGHT_PERIPHERAL_FRAC < 1);
  // Seeing is not charging: the eye must genuinely outreach the
  // old engage circle, and the watchful cap must sit under the lock.
  assert.ok(SIGHT_RANGE_MULT > 1);
  assert.ok(ALERT_WATCH_CAP < ALERT_MAX && ALERT_WATCH_CAP > ALERT_SUS);
});

test('THE EYE ABOVE THE HEAD: six distinct rungs, one u8, calm is zero', async () => {
  const P = await import('./perception.js');
  const rungs = [
    P.ALERT_ICON_NONE,
    P.ALERT_ICON_WARY,
    P.ALERT_ICON_ENGAGED,
    P.ALERT_ICON_HUNTING,
    P.ALERT_ICON_PURSUIT,
    P.ALERT_ICON_LOOKING,
  ];
  assert.equal(new Set(rungs).size, rungs.length, 'every rung wears its own face');
  assert.equal(P.ALERT_ICON_NONE, 0, 'calm is the zero the wire defaults to');
  for (const r of rungs) {
    assert.ok(Number.isInteger(r) && r >= 0 && r <= 255, 'the snapshot byte holds it');
  }
});
