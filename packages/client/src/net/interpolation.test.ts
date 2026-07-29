import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { InterpBuffer } from './interpolation.js';

const sample = (t: number, x: number, y = 0) => ({
  t,
  x,
  y,
  dir: 0,
  pose: 1,
  hpPct: 255,
  status: 0,
  alert: 0,
});

test('interpolates between bracketing samples', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 0));
  b.push(sample(100, 1));
  const s = b.sampleAt(50)!;
  assert.ok(Math.abs(s.x - 0.5) < 1e-9);
});

test('extrapolates a moving entity past the newest sample', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 0));
  b.push(sample(50, 0.25)); // 5 tiles/sec east
  const s = b.sampleAt(150)!; // 100ms past the last sample
  assert.ok(Math.abs(s.x - 0.75) < 1e-6, `expected ~0.75, got ${s.x}`);
});

test('extrapolation is capped, then holds', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 0));
  b.push(sample(50, 0.25));
  const capped = b.sampleAt(50 + 150)!; // exactly the cap
  const beyond = b.sampleAt(50 + 500)!; // far beyond — must clamp to cap
  assert.ok(Math.abs(beyond.x - capped.x) < 1e-9);
});

test('a stationary entity never extrapolates (no idle drift)', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 3));
  b.push(sample(50, 3.001)); // sub-threshold jitter
  const s = b.sampleAt(200)!;
  assert.ok(Math.abs(s.x - 3.001) < 1e-9);
});

test('stale velocity pairs do not project', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 0));
  b.push(sample(400, 2)); // pair gap way past freshness bound
  const s = b.sampleAt(500)!;
  assert.ok(Math.abs(s.x - 2) < 1e-9);
});

test('implausible speeds are rejected (teleport, not motion)', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 0));
  b.push(sample(50, 10)); // 200 tiles/sec — a teleport
  const s = b.sampleAt(150)!;
  assert.ok(Math.abs(s.x - 10) < 1e-9);
});
