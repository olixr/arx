import test from 'node:test';
import assert from 'node:assert/strict';
import { emit, faceBand, faceFill, faceSeam, projectFace, type FaceCamera, type FaceCtx } from './structureFace.js';

/**
 * THE STRUCTURE FACE — the shared world-geometry face primitive, pinned.
 *
 * projectFace must reproduce the old inline math bit-for-bit: round the
 * two projected corners to whole device pixels, then subtract each
 * corner's OWN depthScale-scaled lift. At q=0 (depthScale === 1) both
 * corners share one lift and the trapezoid collapses to the old rect.
 */

const W = 1600;
const H = 1000;

/**
 * A deterministic camera stub. worldToScreen is a plain affine (with a
 * fractional part so rounding is exercised); depthScale is a fixed table
 * keyed on world y, so per-corner foreshortening is testable in isolation.
 */
function stubCamera(ds: (wy: number) => number): FaceCamera {
  return {
    worldToScreen: (wx, wy) => ({ x: wx * 40 + 0.4, y: wy * 24 - 0.4 }),
    depthScale: ds,
  };
}

test('projectFace rounds shared corners and lifts each by its own depthScale', () => {
  const dsTable: Record<number, number> = { 3: 0.8, 7: 1.25 };
  const cam = stubCamera((wy) => dsTable[wy] ?? 1);
  const ax = 2, ay = 3, bx = 5, by = 7;
  const liftTop = 50, liftBot = 10;
  const g = projectFace(cam, W, H, ax, ay, bx, by, liftTop, liftBot);

  // Corners rounded to whole pixels.
  assert.equal(g.ax, Math.round(ax * 40 + 0.4));
  assert.equal(g.ay, Math.round(ay * 24 - 0.4));
  assert.equal(g.bx, Math.round(bx * 40 + 0.4));
  assert.equal(g.by, Math.round(by * 24 - 0.4));

  assert.equal(g.dsA, 0.8);
  assert.equal(g.dsB, 1.25);

  // Each corner subtracts lift * its own depthScale — NOT reassociated.
  assert.equal(g.yTopA, g.ay - liftTop * 0.8);
  assert.equal(g.yTopB, g.by - liftTop * 1.25);
  assert.equal(g.yBotA, g.ay - liftBot * 0.8);
  assert.equal(g.yBotB, g.by - liftBot * 1.25);
});

test('projectFace matches hand-computed inline projection', () => {
  const cam = stubCamera((wy) => 1 + wy * 0.05);
  const ax = 1.5, ay = -4, bx = 9.25, by = 6;
  const liftTop = 33.3, liftBot = 4.7;
  const g = projectFace(cam, W, H, ax, ay, bx, by, liftTop, liftBot);

  // The exact old inline sequence.
  const A = { x: Math.round(ax * 40 + 0.4), y: Math.round(ay * 24 - 0.4) };
  const B = { x: Math.round(bx * 40 + 0.4), y: Math.round(by * 24 - 0.4) };
  const dsA = 1 + ay * 0.05;
  const dsB = 1 + by * 0.05;
  assert.equal(g.yTopA, A.y - liftTop * dsA);
  assert.equal(g.yTopB, B.y - liftTop * dsB);
  assert.equal(g.yBotA, A.y - liftBot * dsA);
  assert.equal(g.yBotB, B.y - liftBot * dsB);
  assert.equal(g.ax, A.x);
  assert.equal(g.bx, B.x);
});

test('at q=0 (depthScale === 1) both corners collapse to one lift', () => {
  const cam = stubCamera(() => 1);
  const g = projectFace(cam, W, H, 0, 0, 4, 0, 60, 12);
  // depthScale 1 everywhere ⇒ top edge is a flat lift, base edge another.
  assert.equal(g.yTopA, g.ay - 60);
  assert.equal(g.yTopB, g.by - 60);
  assert.equal(g.yBotA, g.ay - 12);
  assert.equal(g.yBotB, g.by - 12);
  assert.equal(g.dsA, 1);
  assert.equal(g.dsB, 1);
});

test('emit hands projectFace geometry to the paint callback', () => {
  const cam = stubCamera((wy) => 1 + wy * 0.1);
  const direct = projectFace(cam, W, H, 2, 3, 6, 8, 40, 5);
  let seen: typeof direct | undefined;
  emit(cam, W, H, 2, 3, 6, 8, 40, 5, (f) => {
    seen = f;
  });
  assert.deepEqual(seen, direct);
});

/** A canvas stub that records the path it is told to draw. */
function recCtx(): FaceCtx & { ops: string[] } {
  const ops: string[] = [];
  return {
    ops,
    fillStyle: '',
    beginPath() {
      ops.push('begin');
    },
    moveTo(x, y) {
      ops.push(`M ${x} ${y}`);
    },
    lineTo(x, y) {
      ops.push(`L ${x} ${y}`);
    },
    closePath() {
      ops.push('close');
    },
    fill() {
      ops.push(`fill ${this.fillStyle}`);
    },
  };
}

test('faceFill draws the base→lifted trapezoid verbatim', () => {
  const ctx = recCtx();
  faceFill(ctx, 10, 100, 30, 50, 90, 20, '#abc');
  assert.deepEqual(ctx.ops, ['begin', 'M 10 100', 'L 10 70', 'L 50 70', 'L 50 90', 'close', 'fill #abc']);
});

test('faceBand spans wall-height fractions on both corners', () => {
  const ctx = recCtx();
  faceBand(ctx, 10, 100, 40, 50, 90, 20, 0.25, 0.75, '#111');
  assert.deepEqual(ctx.ops, [
    'begin',
    `M 10 ${100 - 40 * 0.25}`,
    `L 10 ${100 - 40 * 0.75}`,
    `L 50 ${90 - 20 * 0.75}`,
    `L 50 ${90 - 20 * 0.25}`,
    'close',
    'fill #111',
  ]);
});

test('faceSeam draws a min-1px seam at a fraction', () => {
  const ctx = recCtx();
  faceSeam(ctx, 10, 100, 40, 50, 90, 20, 0.5, 0.2, '#222');
  const wa = Math.max(1, 0.2);
  assert.deepEqual(ctx.ops, [
    'begin',
    `M 10 ${100 - 40 * 0.5}`,
    `L 50 ${90 - 20 * 0.5}`,
    `L 50 ${90 - 20 * 0.5 + wa}`,
    `L 10 ${100 - 40 * 0.5 + wa}`,
    'close',
    'fill #222',
  ]);
});
