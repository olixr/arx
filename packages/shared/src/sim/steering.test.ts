import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NO_COLLISION, type CollisionSource } from '../world/collision.js';
import { Tile } from '../world/tiles.js';
import { newSteerMemory, steerToward } from './steering.js';

const RADIUS = 0.35;

/** A solid column of full-block tiles at x = 5, y in [-10, 10]. */
const wallAtX5: CollisionSource = {
  isSolid: (tx, ty) => tx === 5 && ty >= -10 && ty <= 10,
};

test('open field: heads straight at the goal, unit length', () => {
  const mem = newSteerMemory();
  const h = steerToward({ x: 0, y: 0 }, 10, 5, NO_COLLISION, RADIUS, mem);
  assert.ok(Math.abs(Math.hypot(h.mx, h.my) - 1) < 1e-9);
  const want = Math.hypot(10, 5);
  assert.ok(Math.abs(h.mx - 10 / want) < 1e-9);
  assert.equal(mem.side, 0, 'no swerve committed on a clear run');
});

test('at the goal: zero vector', () => {
  const h = steerToward({ x: 3, y: 3 }, 3, 3, NO_COLLISION, RADIUS, newSteerMemory());
  assert.equal(h.mx, 0);
  assert.equal(h.my, 0);
});

test('wall ahead: deflects off the desired line and commits a side', () => {
  const mem = newSteerMemory();
  const pos = { x: 4.2, y: 0.5 };
  const h = steerToward(pos, 8, 0.5, wallAtX5, RADIUS, mem);
  assert.ok(Math.abs(Math.hypot(h.mx, h.my) - 1) < 1e-9, 'unit length');
  // The desired heading is due east; a deflection must swing off it.
  assert.ok(h.mx < 0.99, `deflected away from due east, got (${h.mx}, ${h.my})`);
  assert.notEqual(mem.side, 0, 'a swerve side is committed');
  assert.ok(mem.ticks > 0, 'the commitment has duration');
});

test('commitment is sticky: the same side wins while blocked', () => {
  const mem = newSteerMemory();
  const pos = { x: 4.2, y: 0.5 };
  const first = steerToward(pos, 8, 0.5, wallAtX5, RADIUS, mem);
  const side = mem.side;
  // Ask again from a spot where both sides are equally viable.
  const second = steerToward(pos, 8, 0.5, wallAtX5, RADIUS, mem);
  assert.equal(mem.side, side, 'side survives the second query');
  assert.equal(Math.sign(first.my), Math.sign(second.my), 'same swerve direction');
});

test('clear runs bleed the commitment off and release the side', () => {
  const mem = newSteerMemory();
  mem.side = 1;
  mem.ticks = 2;
  steerToward({ x: 0, y: 0 }, 10, 0, NO_COLLISION, RADIUS, mem);
  assert.equal(mem.ticks, 1);
  steerToward({ x: 0, y: 0 }, 10, 0, NO_COLLISION, RADIUS, mem);
  assert.equal(mem.side, 0, 'commitment expired');
});

test('boxed in on all sides: pushes the desired line for the wall-slide', () => {
  // Solid everywhere except the body's own tile.
  const cell: CollisionSource = { isSolid: (tx, ty) => !(tx === 0 && ty === 0) };
  const h = steerToward({ x: 0.5, y: 0.5 }, 5, 0.5, cell, 0.3, newSteerMemory());
  assert.ok(h.mx > 0.99, 'falls back to the direct heading');
});

test('never probes past a goal standing hard against a wall', () => {
  // Goal is adjacent to the wall column but reachable dead ahead.
  const mem = newSteerMemory();
  const h = steerToward({ x: 3.0, y: 0.5 }, 4.4, 0.5, wallAtX5, 0.2, mem);
  assert.ok(h.mx > 0.99, `straight approach stays straight, got (${h.mx}, ${h.my})`);
});

test('sub-tile colliders steer as circles, not blocks', () => {
  // A stalagmite at tile (5, 0): its 0.34 circle sits at (5.5, 0.5).
  // A body skimming past at y = 1.25 misses the circle but would clip
  // the full-block AABB — centered masses must not deflect that run.
  const asBlock: CollisionSource = { isSolid: (tx, ty) => tx === 5 && ty === 0 };
  const asMass: CollisionSource = { ...asBlock, tileAt: (tx, ty) => (tx === 5 && ty === 0 ? Tile.Stalagmite : Tile.Grass) };
  const blocked = steerToward({ x: 4.0, y: 1.25 }, 8, 1.25, asBlock, RADIUS, newSteerMemory());
  const skimmed = steerToward({ x: 4.0, y: 1.25 }, 8, 1.25, asMass, RADIUS, newSteerMemory());
  assert.ok(blocked.mx < 0.99, 'the full block deflects the skim');
  assert.ok(skimmed.mx > 0.99, 'the centered mass lets it pass');
});
