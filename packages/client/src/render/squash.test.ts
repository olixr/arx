import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegSolver } from './rig.js';

const DT = 1 / 60;

function settleWScale(path: (t: number) => { x: number; y: number; dir: number }): number {
  const solver = new LegSolver();
  let w = 1;
  for (let t = 0; t < 2; t += DT) {
    const p = path(t);
    w = solver.update(p.x, p.y, p.dir, DT).wScale;
  }
  return w;
}

test('side travel narrows the body (side profile)', () => {
  const w = settleWScale((t) => ({ x: 5 * t, y: 0, dir: 0 }));
  assert.ok(w < 0.94, `sideways wScale ${w.toFixed(3)} should be < 0.94`);
});

test('vertical travel keeps the full front profile', () => {
  const w = settleWScale((t) => ({ x: 0, y: 5 * t, dir: Math.PI / 2 }));
  assert.ok(w > 1.02, `vertical wScale ${w.toFixed(3)} should be > 1.02`);
});

test('turning in place squashes from the facing direction', () => {
  const sideways = settleWScale(() => ({ x: 0, y: 0, dir: 0 }));
  const frontal = settleWScale(() => ({ x: 0, y: 0, dir: Math.PI / 2 }));
  assert.ok(sideways < 0.94, `idle facing right: ${sideways.toFixed(3)}`);
  assert.ok(frontal > 1.02, `idle facing down: ${frontal.toFixed(3)}`);
});

test('squash eases smoothly — no popping between orientations', () => {
  const solver = new LegSolver();
  // Face right for a while…
  for (let t = 0; t < 1; t += DT) solver.update(0, 0, 0, DT);
  // …then snap facing to down and watch the transition.
  let prev = solver.update(0, 0, Math.PI / 2, DT).wScale;
  let maxJump = 0;
  for (let t = 0; t < 1; t += DT) {
    const w = solver.update(0, 0, Math.PI / 2, DT).wScale;
    maxJump = Math.max(maxJump, Math.abs(w - prev));
    prev = w;
  }
  assert.ok(maxJump < 0.03, `per-frame wScale jump ${maxJump.toFixed(4)}`);
  assert.ok(prev > 1.02, 'eventually reaches the frontal profile');
});
