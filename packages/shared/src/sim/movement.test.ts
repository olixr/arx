import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DODGE_DIST,
  applyDodge,
  resolveTeleport,
  rideSpeedMult,
  stepMovement,
  transitStep,
} from './movement.js';
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

test('THE TORN VEIL: a blink lands its full wish in the open', () => {
  const out = resolveTeleport({ x: 10, y: 10 }, 1, 0, 8, NO_COLLISION);
  assert.ok(Math.abs(out.x - 18) < 1e-9);
  assert.equal(out.y, 10);
});

test('THE TORN VEIL: a wish past a wall walks back to the near side', () => {
  // The wall stands at x∈[5,6); an 8-tile wish from x=2 wants x=10 —
  // the veil refuses the far side (the road never crossed the stone)
  // and the body lands as deep as it fits BEFORE the wall.
  const out = resolveTeleport({ x: 2, y: 0.5 }, 1, 0, 8, wallAtX5);
  assert.ok(out.x < 5, `landed before the wall, got x=${out.x.toFixed(2)}`);
  assert.ok(out.x > 3.5, 'landed deep, not at the caster\'s feet');
  // Deterministic — both mirrors resolve the same stone.
  const twin = resolveTeleport({ x: 2, y: 0.5 }, 1, 0, 8, wallAtX5);
  assert.deepEqual(out, twin);
});

test('THE TORN VEIL: nowhere to stand keeps the caster home', () => {
  const solidWorld: CollisionSource = { isSolid: () => true };
  const out = resolveTeleport({ x: 2, y: 2 }, 1, 0, 6, solidWorld);
  assert.deepEqual(out, { x: 2, y: 2 });
});

test('THE TRAVELED ROAD: a transit step covers its road and reports walls', () => {
  const open = transitStep({ x: 10, y: 10 }, 1, 0, 0.9, NO_COLLISION);
  assert.ok(Math.abs(open.x - 10.9) < 1e-9);
  assert.ok(!open.blocked, 'the open road is never blocked');
  // Face-on into the wall: the step resolves almost nothing and the
  // road reports BLOCKED so the transit ends where it stands.
  let pos = { x: 4.0, y: 0.5, blocked: false };
  for (let i = 0; i < 12 && !pos.blocked; i++) {
    pos = transitStep(pos, 1, 0, 0.9, wallAtX5);
  }
  assert.ok(pos.blocked, 'the wall ends the road');
  assert.ok(pos.x < 5, `stopped before the wall (x=${pos.x.toFixed(2)})`);
});

test('THE TRAVELED ROAD: substeps visit the corridor', () => {
  const visits: number[] = [];
  transitStep({ x: 0, y: 0 }, 1, 0, 1.0, NO_COLLISION, (x) => visits.push(x));
  assert.ok(visits.length >= 3, 'a 1-tile step substeps at ≤0.4');
  assert.ok(Math.abs(visits[visits.length - 1]! - 1.0) < 1e-9);
});

test('THE SADDLE OUTRANKS THE SOLES: max, never product', () => {
  // Afoot: the foot stack passes through untouched.
  assert.equal(rideSpeedMult(null, 1.2), 1.2);
  // Mounted with a lesser foot stack: the beast's stride rules.
  assert.equal(rideSpeedMult(1.6, 1.2), 1.6);
  // A foot stack that outruns the beast keeps its own legs (never
  // slower for mounting) — and crucially never 1.6 × 1.2 = 1.92.
  assert.equal(rideSpeedMult(1.6, 1.7), 1.7);
  // Naked foot, plain saddle.
  assert.equal(rideSpeedMult(1.6, 1), 1.6);
});
