import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DODGE_DIST, applyDodge, stepMovement } from './movement.js';
import { NO_COLLISION, type CollisionSource } from '../world/collision.js';
import { Tile, WADE_SPEED_FACTOR } from '../world/tiles.js';

const wallAtX5: CollisionSource = {
  isSolid: (tx) => tx === 5,
};

test('movement is deterministic — identical inputs give identical results', () => {
  let a = { x: 10, y: 10 };
  let b = { x: 10, y: 10 };
  const inputs = [
    { mx: 1, my: 0 },
    { mx: 0.7, my: 0.7 },
    { mx: -1, my: 0.3 },
    { mx: 0, my: -1 },
  ];
  for (const input of inputs) {
    a = stepMovement(a, input, 5, 0.05, NO_COLLISION);
    b = stepMovement(b, input, 5, 0.05, NO_COLLISION);
  }
  assert.deepEqual(a, b);
});

test('diagonal input is normalized (no speed advantage)', () => {
  const straight = stepMovement({ x: 0, y: 0 }, { mx: 1, my: 0 }, 5, 0.05, NO_COLLISION);
  const diagonal = stepMovement({ x: 0, y: 0 }, { mx: 1, my: 1 }, 5, 0.05, NO_COLLISION);
  const straightDist = Math.hypot(straight.x, straight.y);
  const diagDist = Math.hypot(diagonal.x, diagonal.y);
  assert.ok(Math.abs(straightDist - diagDist) < 1e-9);
});

test('walls block and allow sliding', () => {
  // Walking straight into the wall: x stops short of it.
  let pos = { x: 4.0, y: 0.5 };
  for (let i = 0; i < 40; i++) {
    pos = stepMovement(pos, { mx: 1, my: 0 }, 5, 0.05, wallAtX5);
  }
  assert.ok(pos.x < 5, `blocked by wall, got x=${pos.x}`);

  // Walking diagonally into the wall: x blocked, y slides.
  let slide = { x: 4.6, y: 0.5 };
  const startY = slide.y;
  for (let i = 0; i < 10; i++) {
    slide = stepMovement(slide, { mx: 1, my: 1 }, 5, 0.05, wallAtX5);
  }
  assert.ok(slide.x < 5);
  assert.ok(slide.y > startY, 'slides along the wall');
});

test('shallow water wades at the shared factor — dry land does not', () => {
  // A world that is all shallow water vs. all grass.
  const ford: CollisionSource = { isSolid: () => false, tileAt: () => Tile.WaterShallow };
  const meadow: CollisionSource = { isSolid: () => false, tileAt: () => Tile.Grass };
  const wet = stepMovement({ x: 0, y: 0 }, { mx: 1, my: 0 }, 5, 0.05, ford);
  const dry = stepMovement({ x: 0, y: 0 }, { mx: 1, my: 0 }, 5, 0.05, meadow);
  assert.ok(Math.abs(wet.x - dry.x * WADE_SPEED_FACTOR) < 1e-9, `wet=${wet.x} dry=${dry.x}`);
  // Sources without tileAt (older tests, tools) never wade.
  const bare = stepMovement({ x: 0, y: 0 }, { mx: 1, my: 0 }, 5, 0.05, NO_COLLISION);
  assert.ok(Math.abs(bare.x - dry.x) < 1e-9);
});

test('zero input means zero movement', () => {
  const pos = stepMovement({ x: 3, y: 3 }, { mx: 0, my: 0 }, 5, 0.05, NO_COLLISION);
  assert.deepEqual(pos, { x: 3, y: 3 });
});

test('dodge dashes the full distance in the open', () => {
  const out = applyDodge({ x: 10, y: 10 }, 1, 0, NO_COLLISION);
  assert.ok(Math.abs(out.x - 10 - DODGE_DIST) < 1e-9);
  assert.equal(out.y, 10);
});

test('dodge is deterministic and stops at walls', () => {
  const a = applyDodge({ x: 4.3, y: 0.5 }, 1, 0, wallAtX5);
  const b = applyDodge({ x: 4.3, y: 0.5 }, 1, 0, wallAtX5);
  assert.deepEqual(a, b);
  assert.ok(a.x < 5, `dash stopped at the wall (x=${a.x.toFixed(3)})`);
});

test('dodge with no direction goes nowhere', () => {
  const out = applyDodge({ x: 2, y: 2 }, 0, 0, NO_COLLISION);
  assert.deepEqual(out, { x: 2, y: 2 });
});
