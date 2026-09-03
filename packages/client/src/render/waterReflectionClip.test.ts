import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';

/**
 * FR — water reflections under the lean. waterRegionPath (and the
 * organicCellPath it drives) gained an optional 2-arg `project` map so the
 * water clip can be traced in SCREEN space under a perspective lean, where
 * the affine ctx.transform can no longer carry the divide. These tests use
 * a recording Path2D stub (Node has no canvas) to prove:
 *   1. every vertex AND every quadratic control point is run through the
 *      projector (a SEPARABLE affine projector must reproduce, coordinate
 *      by coordinate, the un-projected world path);
 *   2. omitting the projector leaves the world-coord path unchanged.
 */

type Op =
  | { t: 'move'; a: number[] }
  | { t: 'line'; a: number[] }
  | { t: 'quad'; a: number[] }
  | { t: 'rect'; a: number[] }
  | { t: 'close' };

class RecPath2D {
  ops: Op[] = [];
  moveTo(x: number, y: number): void {
    this.ops.push({ t: 'move', a: [x, y] });
  }
  lineTo(x: number, y: number): void {
    this.ops.push({ t: 'line', a: [x, y] });
  }
  quadraticCurveTo(cx: number, cy: number, ex: number, ey: number): void {
    this.ops.push({ t: 'quad', a: [cx, cy, ex, ey] });
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.ops.push({ t: 'rect', a: [x, y, w, h] });
  }
  closePath(): void {
    this.ops.push({ t: 'close' });
  }
}

// Install the stub before importing the module under test (it constructs
// Path2D internally via `new Path2D()`).
(globalThis as unknown as { Path2D: unknown }).Path2D = RecPath2D;

const { waterRegionPath } = await import('./terrain.js');

// One lone water tile — its four dual cells all resolve to PARTIAL
// marching-squares masks (never the full mask=15 rect branch), so the
// path is entirely moveTo/lineTo/quadraticCurveTo geometry.
function loneWaterSampler(wx: number, wy: number): (tx: number, ty: number) => number | undefined {
  return (tx, ty) => (tx === wx && ty === wy ? Tile.Water : Tile.Grass);
}

test('projector threads through every vertex and control point', () => {
  const ground = loneWaterSampler(5, 5);
  const bounds = { minTx: 3, maxTx: 7, minTy: 3, maxTy: 7 };

  const world = waterRegionPath(ground, bounds) as unknown as RecPath2D | null;
  assert.ok(world, 'expected a water region path');

  // A SEPARABLE affine projector: project(x,y) = (3x+1, 5y-2). Because it is
  // separable, projecting each coordinate must equal the coordinate-wise map
  // of the world path — this is exactly the invariant the perspective path
  // generalizes (a non-separable homography can't ride toX/toY, hence the
  // 2-arg map).
  const ax = 3;
  const bx = 1;
  const ay = 5;
  const by = -2;
  const project = (x: number, y: number): { x: number; y: number } => ({
    x: ax * x + bx,
    y: ay * y + by,
  });

  const leaned = waterRegionPath(ground, bounds, undefined, project) as unknown as RecPath2D | null;
  assert.ok(leaned, 'expected a leaned water region path');

  assert.equal(leaned.ops.length, world.ops.length, 'same op count / topology');

  for (let k = 0; k < world.ops.length; k++) {
    const w = world.ops[k]!;
    const l = leaned.ops[k]!;
    assert.equal(l.t, w.t, `op ${k} type matches`);
    if (w.t === 'close') continue;
    // world args are (x0,y0[,x1,y1]) pairs; project each pair.
    const wa = (w as { a: number[] }).a;
    const la = (l as { a: number[] }).a;
    assert.equal(la.length, wa.length, `op ${k} arg count`);
    for (let p = 0; p < wa.length; p += 2) {
      assert.ok(Math.abs(la[p]! - (ax * wa[p]! + bx)) < 1e-9, `op ${k} x[${p}] projected`);
      assert.ok(Math.abs(la[p + 1]! - (ay * wa[p + 1]! + by)) < 1e-9, `op ${k} y[${p}] projected`);
    }
  }
  // A lone water tile must actually produce curved boundary geometry.
  assert.ok(world.ops.some((o) => o.t === 'quad'), 'boundary has quadratic curves');
});

test('no projector leaves the world-coord path unchanged (q=0 byte-identity)', () => {
  const ground = loneWaterSampler(2, 2);
  const bounds = { minTx: 0, maxTx: 4, minTy: 0, maxTy: 4 };
  const a = waterRegionPath(ground, bounds) as unknown as RecPath2D | null;
  const b = waterRegionPath(ground, bounds) as unknown as RecPath2D | null;
  assert.ok(a && b);
  assert.deepEqual(b.ops, a.ops);
});
