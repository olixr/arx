import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginSilhouette,
  emit,
  faceBand,
  faceFill,
  faceSeam,
  faceStrip,
  faceUV,
  projectFace,
  topPlane,
  type FaceCamera,
  type FaceCtx,
  type FaceGeom,
  type FacePt,
  type WorldCorner,
} from './structureFace.js';
import { depthScaleWorld, projectWorld, type XY } from './cameraProject.js';
import { collectVolume, type VolPoint } from './collectVolume.js';
import { Tile } from '@arx/shared';

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
function stubCamera(ds: (wy: number) => number, scale = 40): FaceCamera {
  return {
    worldToScreen: (wx, wy) => ({ x: wx * 40 + 0.4, y: wy * 24 - 0.4 }),
    depthScale: ds,
    scale,
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
    scale: RS.scale,
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

/* ═══════════════════════════════════════════════════════════════════════
 * THE ONE RENDER — A1: run-continuous primitives (`faceStrip` / `topPlane` /
 * silhouette accumulation). These are PURE ADDITIONS: no caller yet, so the
 * q=0 golden look is untouched. The tests pin the two contracts A2/A4 build
 * on — (1) at q=0 a straight run reproduces today's axis-aligned rects
 * across a MULTI-segment chain (not just one face), and (2) at q>0 a world
 * corner shared by two segments projects to the IDENTICAL device vertex
 * (the seamlessness guarantee) — both through the REAL `cameraProject`.
 * ═══════════════════════════════════════════════════════════════════════ */

/** The per-tile corner chain of an E–W run at world row `y`, x in [x0,x1]. */
function ewChain(x0: number, x1: number, y: number): WorldCorner[] {
  const chain: WorldCorner[] = [];
  for (let x = x0; x <= x1; x++) chain.push({ x, y });
  return chain;
}

test('A1: faceStrip at q=0 is an axis-aligned rectangle strip over a multi-segment run', () => {
  const cam = realCamera(0);
  // A per-tile chain (4 corners ⇒ 3 segments) along one E–W run edge.
  const chain = ewChain(2, 5, 4);
  const H_TILES = 1.5; // world height
  const segs: FaceGeom[] = [];
  faceStrip(cam, W, H, chain, H_TILES, 0, (seg) => segs.push({ ...seg }));
  assert.equal(segs.length, 3, 'one trapezoid per adjacent corner pair');

  const liftPx = H_TILES * RS.scale; // world height → screen lift (ds===1)
  for (const g of segs) {
    // Every corner shares depthScale 1 at q=0 ⇒ each segment is a rect.
    assert.equal(g.dsA, 1);
    assert.equal(g.dsB, 1);
    assert.equal(g.ay, g.by, 'base edge horizontal');
    assert.equal(g.yTopA, g.yTopB, 'top edge horizontal');
    assert.ok(g.ax < g.bx, 'west corner left of east corner');
    // Height is the plain lift, no per-corner foreshortening.
    assert.equal(g.ay - g.yTopA, liftPx);
    assert.equal(g.by - g.yTopB, liftPx);
  }
  // Uniform tile pitch: every segment is the same width at q=0.
  assert.equal(segs[0]!.bx - segs[0]!.ax, segs[1]!.bx - segs[1]!.ax);
  assert.equal(segs[1]!.bx - segs[1]!.ax, segs[2]!.bx - segs[2]!.ax);
});

test('A1: faceStrip shares one device vertex between adjacent segments (seam-free, q>0)', () => {
  const cam = realCamera(0.0013); // leaned — the case seams appeared in
  const chain = ewChain(2, 5, 4);
  const segs: FaceGeom[] = [];
  faceStrip(cam, W, H, chain, 1.5, 0, (seg) => segs.push({ ...seg }));
  assert.equal(segs.length, 3);
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i]!;
    const b = segs[i + 1]!;
    // The shared world corner projected ONCE ⇒ identical device vertex,
    // identical depthScale, identical top/base y. The fills abut exactly.
    assert.equal(a.bx, b.ax, 'shared x — no double-rounded seam');
    assert.equal(a.by, b.ay, 'shared base y');
    assert.equal(a.yTopB, b.yTopA, 'shared top y');
    assert.equal(a.yBotB, b.yBotA, 'shared bottom y');
    assert.equal(a.dsB, b.dsA, 'shared depthScale');
  }
  // The strip really is leaned: an E–W run sits at one depth (its top stays
  // horizontal), but depthScale is no longer 1 and the tile pitch on screen
  // spreads from the vanishing centre (near-row widths differ across the
  // run) — proof the perspective path is engaged, not the q=0 affine.
  assert.notEqual(segs[0]!.dsA, 1, 'depthScale ≠ 1 under lean');
  assert.notEqual(
    segs[0]!.bx - segs[0]!.ax,
    segs[2]!.bx - segs[2]!.ax,
    'tile pitch varies across the run under lean',
  );
});

test('A1: faceStrip vs projectFace — a segment equals the two-corner face', () => {
  // Each faceStrip segment must be exactly what projectFace yields for those
  // two corners with the world height converted to a screen lift — proving
  // the run path reuses the pinned per-corner arithmetic.
  const cam = realCamera(0.0013);
  const chain = ewChain(2, 4, 6);
  const H_TILES = 1.25;
  const segs: FaceGeom[] = [];
  faceStrip(cam, W, H, chain, H_TILES, 0, (seg) => segs.push({ ...seg }));
  const liftPx = H_TILES * RS.scale;
  for (let i = 0; i < segs.length; i++) {
    const a = chain[i]!;
    const b = chain[i + 1]!;
    const g = projectFace(cam, W, H, a.x, a.y, b.x, b.y, liftPx, 0);
    assert.deepEqual(segs[i], g);
  }
});

test('A1: faceStrip accumulates a closed outer silhouette ring', () => {
  const cam = realCamera(0.0013);
  const chain = ewChain(2, 5, 4); // 4 corners
  const sil = beginSilhouette();
  faceStrip(cam, W, H, chain, 1.5, 0, () => {}, { silhouette: sil });
  assert.equal(sil.rings.length, 1);
  const ring = sil.rings[0]!;
  // Ground edge forward (4 pts) + top edge back (4 pts) = 8-point ring.
  assert.equal(ring.length, 8);
  // First half rides the base y of each corner; second half the tops, in
  // reverse — a proper closed loop around the whole strip.
  const segs: FaceGeom[] = [];
  faceStrip(cam, W, H, chain, 1.5, 0, (seg) => segs.push({ ...seg }));
  assert.deepEqual(ring[0], { x: segs[0]!.ax, y: segs[0]!.yBotA });
  assert.deepEqual(ring[3], { x: segs[2]!.bx, y: segs[2]!.yBotB });
  assert.deepEqual(ring[4], { x: segs[2]!.bx, y: segs[2]!.yTopB });
  assert.deepEqual(ring[7], { x: segs[0]!.ax, y: segs[0]!.yTopA });

  // emit() replays every ring into a Path2D-like sink as a closed subpath.
  const ops: string[] = [];
  sil.emit({
    moveTo: (x, y) => ops.push(`M ${x} ${y}`),
    lineTo: (x, y) => ops.push(`L ${x} ${y}`),
    closePath: () => ops.push('close'),
  });
  assert.equal(ops[0], `M ${ring[0]!.x} ${ring[0]!.y}`);
  assert.equal(ops[ops.length - 1], 'close');
  assert.equal(ops.filter((o) => o === 'close').length, 1);
});

test('A1: topPlane at q=0 collapses its UV to plain-rect placement', () => {
  const cam = realCamera(0);
  // A straight E–W run one tile deep: crown loop is the rectangle
  // (2,4)-(6,4)-(6,5)-(2,5).
  const loop: WorldCorner[] = [
    { x: 2, y: 4 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
    { x: 2, y: 5 },
  ];
  let geom: { poly: FacePt[]; uv: (u: number, v: number, out?: FacePt) => FacePt } | undefined;
  topPlane(cam, W, H, loop, 1.5, (g) => {
    geom = g;
  });
  assert.ok(geom);
  const { uv } = geom!;
  // x depends only on u, y only on v — the axis-aligned collapse that
  // reproduces woodCrownPlate's flat fillRect look at q=0.
  assert.equal(uv(0.3, 0.2).x, uv(0.3, 0.9).x, 'x is v-independent at q=0');
  assert.equal(uv(0.1, 0.6).y, uv(0.8, 0.6).y, 'y is u-independent at q=0');
  // The whole projected crown loop is axis-aligned (two north-row y's equal,
  // two south-row y's equal) at q=0.
  assert.equal(geom!.poly[0]!.y, geom!.poly[1]!.y, 'north crown edge horizontal');
  assert.equal(geom!.poly[2]!.y, geom!.poly[3]!.y, 'south crown edge horizontal');
});

test('A1: topPlane at q>0 recedes — its UV bilerps and far corners lift less', () => {
  const q = 0.0013;
  const loop: WorldCorner[] = [
    { x: 2, y: 4 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
    { x: 2, y: 5 },
  ];
  let flat: { poly: FacePt[] } | undefined;
  let lean: { poly: FacePt[]; uv: (u: number, v: number, out?: FacePt) => FacePt } | undefined;
  topPlane(realCamera(0), W, H, loop, 1.5, (g) => {
    flat = g;
  });
  topPlane(realCamera(q), W, H, loop, 1.5, (g) => {
    lean = g;
  });
  // Under lean the crown top is a true trapezoid: the UV x now varies with v
  // (a receding quad), unlike the q=0 collapse above.
  assert.notEqual(lean!.uv(0.3, 0.2).x, lean!.uv(0.3, 0.9).x, 'x depends on v under lean');
  // The near (south) row and far (north) row diverge in lift, so the two
  // crown rows are NOT the flat q=0 rectangle.
  assert.notEqual(lean!.poly[0]!.y, flat!.poly[0]!.y);
});

test('A1: faceStrip writes into fresh geoms — reused out on the UV mapper', () => {
  // topPlane's uv reuses an out point exactly like faceUV.
  const cam = realCamera(0);
  const loop: WorldCorner[] = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 1 },
    { x: 0, y: 1 },
  ];
  let uv: ((u: number, v: number, out?: FacePt) => FacePt) | undefined;
  topPlane(cam, W, H, loop, 1, (g) => {
    uv = g.uv;
  });
  const out = { x: -1, y: -1 };
  const r = uv!(0.5, 0.5, out);
  assert.equal(r, out, 'same object — no allocation in the hot mapper');
});

/* ───────────────────────────────────────────────────────────────────────
 * A1 × A0 INTEGRATION: the run-continuous primitives consume a real
 * `collectVolume.perimeter`. This is the end-to-end path A2/A4 take — flood
 * the run, walk its exposed loop, and hand it straight to `topPlane`
 * (crown) and one edge of it to `faceStrip` (side). A straight E–W run and
 * an L-shape both yield correct continuous geometry.
 * ─────────────────────────────────────────────────────────────────────── */

/** A tile sampler over an explicit member set (a mock world). */
function memberSampler(members: Set<string>): (tx: number, ty: number) => Tile | undefined {
  return (tx, ty) => (members.has(`${tx},${ty}`) ? Tile.WallStone : undefined);
}
const ALL_ONE_CLASS = () => 1;

test('A1×A0: a straight E–W run — perimeter → topPlane crown + faceStrip side', () => {
  // Three tiles in a row at y=4, x∈{2,3,4}.
  const members = new Set(['2,4', '3,4', '4,4']);
  const vol = collectVolume(memberSampler(members), 3, 4, ALL_ONE_CLASS);
  assert.ok(vol);
  assert.equal(vol!.perimeter.length, 1, 'one boundary loop');
  const loop = vol!.perimeter[0]!;
  // Collinear merge ⇒ the run's boundary is a 4-corner rectangle.
  assert.equal(loop.length, 4);

  // The whole loop feeds topPlane — the run-continuous crown.
  const cam = realCamera(0);
  let poly: FacePt[] | undefined;
  topPlane(cam, W, H, loop, 1.5, (g) => {
    poly = g.poly;
  });
  assert.equal(poly!.length, 4, 'crown poly tracks the loop corners');

  // The SOUTH edge of the loop is the exposed face you walk behind; slice it
  // and hand it to faceStrip. (The rectangle loop, canonicalized CW from its
  // min corner, contains the y=5 south run as two adjacent corners.)
  const south = southEdge(loop);
  assert.ok(south.length >= 2, 'south run edge found');
  const segs: FaceGeom[] = [];
  faceStrip(cam, W, H, south, 1.5, 0, (seg) => segs.push({ ...seg }));
  assert.equal(segs.length, south.length - 1);
  // A straight south run at q=0 is an axis-aligned rect.
  for (const g of segs) {
    assert.equal(g.ay, g.by);
    assert.equal(g.yTopA, g.yTopB);
  }
});

test('A1×A0: an L-shape run — perimeter → continuous topPlane crown', () => {
  // An L: (0,0),(1,0),(0,1).
  const members = new Set(['0,0', '1,0', '0,1']);
  const vol = collectVolume(memberSampler(members), 0, 0, ALL_ONE_CLASS);
  assert.ok(vol);
  assert.equal(vol!.perimeter.length, 1);
  const loop = vol!.perimeter[0]!;
  // An L-boundary has 6 corners after collinear merge.
  assert.equal(loop.length, 6);

  const cam = realCamera(0);
  let poly: FacePt[] | undefined;
  let uv: ((u: number, v: number, out?: FacePt) => FacePt) | undefined;
  topPlane(cam, W, H, loop, 1, (g) => {
    poly = g.poly;
    uv = g.uv;
  });
  // The crown poly carries all six corners — a continuous L crown, not a
  // per-tile plate. The whole-run UV still spans the L's world bbox.
  assert.equal(poly!.length, 6);
  assert.equal(uv!(0.3, 0.2).x, uv!(0.3, 0.9).x, 'UV collapses over the L bbox at q=0');
  // Under lean the same L crown recedes (its UV bilerps).
  let leanUv: ((u: number, v: number, out?: FacePt) => FacePt) | undefined;
  topPlane(realCamera(0.0013), W, H, loop, 1, (g) => {
    leanUv = g.uv;
  });
  assert.notEqual(leanUv!(0.3, 0.2).x, leanUv!(0.3, 0.9).x);
});

/** Extract the southern (max-y) horizontal run of a rectilinear loop. */
function southEdge(loop: VolPoint[]): WorldCorner[] {
  let maxY = -Infinity;
  for (const p of loop) if (p.y > maxY) maxY = p.y;
  const onSouth = loop.filter((p) => p.y === maxY).sort((a, b) => a.x - b.x);
  return onSouth.map((p) => ({ x: p.x, y: p.y }));
}
