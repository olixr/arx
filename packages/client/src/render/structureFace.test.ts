import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emit,
  faceBand,
  faceFill,
  faceSeam,
  faceUV,
  projectFace,
  type FaceCamera,
  type FaceCtx,
} from './structureFace.js';
import { depthScaleWorld, projectWorld, type XY } from './cameraProject.js';

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

/**
 * FEATURE-ON-FACE UV — the bilinear that pins windows / doors / hangings
 * to the face's own projected plane. At q=0 the four corners are an
 * axis-aligned rect, so the map must reduce to plain rect placement; at
 * q>0 (a receding trapezoid) it must bilerp the four corners.
 */
test('faceUV over an axis-aligned rect reduces to rect placement', () => {
  // Base row y=0, top row y=-100 (frame-local, as the wall face feeds it);
  // west x=10, east x=50 on BOTH rows ⇒ q=0 face.
  const S = faceUV(10, 0, 50, 0, 10, -100, 50, -100);
  // Corners land on the corners.
  assert.deepEqual(S(0, 0), { x: 10, y: 0 });
  assert.deepEqual(S(1, 0), { x: 50, y: 0 });
  assert.deepEqual(S(0, 1), { x: 10, y: -100 });
  assert.deepEqual(S(1, 1), { x: 50, y: -100 });
  // x depends only on u, y only on v — the axis-aligned collapse.
  assert.deepEqual(S(0.28, 0.5), { x: 10 + 40 * 0.28, y: -50 });
  assert.deepEqual(S(0.72, 0.9), { x: 10 + 40 * 0.72, y: -90 });
});

test('faceUV bilerps a receding trapezoid (q>0)', () => {
  // A leaned face: base wider (0..100) than the top (20..80), top lifted
  // and the far/near rows at different y — a true trapezoid.
  const S = faceUV(0, 0, 100, 0, 20, -60, 80, -80);
  // Corners exact.
  assert.deepEqual(S(0, 0), { x: 0, y: 0 });
  assert.deepEqual(S(1, 0), { x: 100, y: 0 });
  assert.deepEqual(S(0, 1), { x: 20, y: -60 });
  assert.deepEqual(S(1, 1), { x: 80, y: -80 });
  // Mid-height west edge: halfway up the west side, base(0,0)→top(20,-60).
  assert.deepEqual(S(0, 0.5), { x: 10, y: -30 });
  // Dead centre: bilerp of all four — u across the v=0.5 span.
  const westMidX = 0 + (20 - 0) * 0.5; // 10
  const eastMidX = 100 + (80 - 100) * 0.5; // 90
  const westMidY = 0 + (-60 - 0) * 0.5; // -30
  const eastMidY = 0 + (-80 - 0) * 0.5; // -40
  assert.deepEqual(S(0.5, 0.5), {
    x: westMidX + (eastMidX - westMidX) * 0.5,
    y: westMidY + (eastMidY - westMidY) * 0.5,
  });
});

test('faceUV writes into a reused out point when given one', () => {
  const S = faceUV(0, 0, 10, 0, 0, -10, 10, -10);
  const out = { x: -1, y: -1 };
  const r = S(0.5, 0.5, out);
  assert.equal(r, out); // same object, no allocation
  assert.deepEqual(out, { x: 5, y: -5 });
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

/**
 * THE ONE RENDER — F0 foundation gate: the q=0 RECT-EQUIVALENCE invariant,
 * pinned through the REAL projection (`cameraProject.projectWorld` /
 * `depthScaleWorld`), not a hand-tuned stub. Track A rebuilds walls,
 * garrison and hedges as run-continuous `structureFace` volumes (faceStrip
 * / topPlane); A1's contract is that at q=0 these new run-continuous
 * primitives reproduce today's axis-aligned rects EXACTLY. This test is the
 * gate that contract runs against: a real camera at q=0, an E-W ground run,
 * and the assertion that its side face is an axis-aligned rectangle.
 */

// A representative camera; the same shape cameraProject's own tests use.
const RS = { scale: 40, yScale: 0.6, camX: 12.5, camY: -7.25, snapDpr: 2 };

/** A FaceCamera backed by the SHIPPED projection at a chosen q. */
function realCamera(q: number): FaceCamera {
  const scratch: XY = { x: 0, y: 0 };
  return {
    worldToScreen: (wx, wy, w, h) => {
      projectWorld(RS.scale, RS.yScale, RS.camX, RS.camY, q, RS.snapDpr, wx, wy, w, h, scratch);
      return { x: scratch.x, y: scratch.y };
    },
    depthScale: (wy) => depthScaleWorld(RS.scale, RS.yScale, RS.camY, q, wy),
  };
}

test('F0: at q=0 an E-W run face is an axis-aligned rectangle (A1 must preserve)', () => {
  const cam = realCamera(0);
  // An east–west run: two ground corners share a world row (ay === by).
  const ay = 4,
    by = 4,
    ax = 2,
    bx = 9;
  const liftTop = 60,
    liftBot = 0;
  const g = projectFace(cam, W, H, ax, ay, bx, by, liftTop, liftBot);

  // Left and right edges are VERTICAL (each corner keeps its own screen x
  // top and bottom) — a rect has two vertical sides.
  assert.ok(g.ax < g.bx, 'west corner left of east corner');
  // Both corners share one depthScale (=1) at q=0, so the top edge is
  // horizontal and the base edge is horizontal: an axis-aligned rect.
  assert.equal(g.dsA, 1);
  assert.equal(g.dsB, 1);
  assert.equal(g.ay, g.by); // base edge horizontal
  assert.equal(g.yTopA, g.yTopB); // top edge horizontal
  assert.equal(g.yBotA, g.yBotB);
  // The rect's height is the plain lift (no per-corner foreshortening).
  assert.equal(g.ay - g.yTopA, liftTop);
  assert.equal(g.by - g.yTopB, liftTop);
});

test('F0: a receding run gets equal depthScale at q=0 but NOT under lean', () => {
  // A run whose two ground corners sit at DIFFERENT world depths
  // (ay ≠ by). At q=0 both corners still share depthScale 1 — the flat
  // collapse. Under a lean the nearer corner foreshortens more than the
  // farther one, so the two depthScales diverge and the face becomes a
  // true trapezoid. This proves the q=0 rect-equivalence above is a real
  // property of q=0, not something projectFace yields for any camera.
  const ax = 2,
    ay = 1,
    bx = 9,
    by = 14; // corners at different depths
  const flat = projectFace(realCamera(0), W, H, ax, ay, bx, by, 60, 0);
  assert.equal(flat.dsA, 1);
  assert.equal(flat.dsB, 1);
  assert.equal(flat.dsA, flat.dsB);

  const lean = projectFace(realCamera(0.0013), W, H, ax, ay, bx, by, 60, 0);
  assert.notEqual(lean.dsA, lean.dsB);
  // The nearer (larger wy, down-screen) corner foreshortens MORE (>1).
  assert.ok(lean.dsB > lean.dsA, 'nearer corner has the larger depthScale');
});

test('F0: at q=0 faceUV over the projected run collapses to plain rect placement', () => {
  const cam = realCamera(0);
  // Project an E-W run's base + top corners through the real camera, then
  // feed faceUV the four screen corners (base row, lifted top row).
  const ay = 4,
    by = 4,
    ax = 2,
    bx = 9,
    lift = 80;
  const g = projectFace(cam, W, H, ax, ay, bx, by, lift, 0);
  const S = faceUV(g.ax, g.ay, g.bx, g.by, g.ax, g.yTopA, g.bx, g.yTopB);
  // x depends only on u (both rows share each corner's x); y only on v
  // (both corners share each row's y) — the axis-aligned collapse a
  // window/door keyed to the face relies on at q=0.
  const lo = S(0.3, 0.2);
  const hi = S(0.3, 0.9);
  assert.equal(lo.x, hi.x, 'x is v-independent at q=0');
  const left = S(0.1, 0.6);
  const right = S(0.8, 0.6);
  assert.equal(left.y, right.y, 'y is u-independent at q=0');
  // Corners land exactly on the projected rect corners.
  assert.deepEqual(S(0, 0), { x: g.ax, y: g.ay });
  assert.deepEqual(S(1, 1), { x: g.bx, y: g.yTopB });
});
