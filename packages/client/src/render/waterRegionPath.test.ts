import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';

/**
 * The water clip's topology pin. `waterRegionPath` (and the
 * `organicCellPath` it drives) traces the reflection clip as marching-squares
 * geometry in world coords; nothing else in the node suite touches it. These
 * tests use a recording Path2D stub (Node has no canvas) to prove:
 *   1. the path is deterministic — the same sampler + bounds yield the same
 *      op list twice over;
 *   2. a lone water tile yields real boundary geometry: moveTo/lineTo/
 *      quadraticCurveTo ops (its four dual cells all resolve to PARTIAL
 *      masks, never the full-mask rect branch).
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

function loneWaterSampler(wx: number, wy: number): (tx: number, ty: number) => number | undefined {
  return (tx, ty) => (tx === wx && ty === wy ? Tile.Water : Tile.Grass);
}

test('a lone water tile traces curved boundary geometry', () => {
  const ground = loneWaterSampler(5, 5);
  const bounds = { minTx: 3, maxTx: 7, minTy: 3, maxTy: 7 };
  const path = waterRegionPath(ground, bounds) as unknown as RecPath2D | null;
  assert.ok(path, 'expected a water region path');
  assert.ok(path.ops.some((o) => o.t === 'move'), 'boundary starts with a moveTo');
  assert.ok(path.ops.some((o) => o.t === 'line'), 'boundary has straight edges');
  assert.ok(path.ops.some((o) => o.t === 'quad'), 'boundary has quadratic curves');
  assert.ok(!path.ops.some((o) => o.t === 'rect'), 'a lone tile never takes the full-mask rect branch');
});

test('the same sampler and bounds trace the same path twice (deterministic)', () => {
  const ground = loneWaterSampler(2, 2);
  const bounds = { minTx: 0, maxTx: 4, minTy: 0, maxTy: 4 };
  const a = waterRegionPath(ground, bounds) as unknown as RecPath2D | null;
  const b = waterRegionPath(ground, bounds) as unknown as RecPath2D | null;
  assert.ok(a && b);
  assert.deepEqual(b.ops, a.ops);
});
