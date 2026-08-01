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

// ---- RENDER CONTINUITY (sampleSmoothed) ----------------------------

test('smoothed sampling is idempotent per timestamp', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 0));
  b.push(sample(50, 0.25));
  const a1 = b.sampleSmoothed(30)!;
  const a2 = b.sampleSmoothed(30)!;
  assert.equal(a1, a2);
});

test('clean 20Hz motion passes through untouched', () => {
  const b = new InterpBuffer();
  for (let i = 0; i <= 10; i++) b.push(sample(i * 50, i * 0.25)); // 5 tiles/s
  for (let t = 60; t <= 400; t += 8) {
    const raw = b.sampleAt(t)!;
    const sm = b.sampleSmoothed(t)!;
    assert.ok(Math.abs(sm.x - raw.x) < 1e-9, `t=${t}: smoothing altered clean motion`);
  }
});

test('a late-burst correction snap is hidden and glides out', () => {
  // Walker at 5 tiles/s; snapshots stall after t=100, resume at t=250
  // having TURNED — extrapolation guessed straight ahead, reality
  // disagrees. Raw sampling shows a hard jump; smoothed must stay
  // under plausible per-frame motion and converge to truth.
  const feed = (b: InterpBuffer) => {
    b.push(sample(0, 0));
    b.push(sample(50, 0.25));
    b.push(sample(100, 0.5));
  };
  const late = [sample(150, 0.5, 0.25), sample(200, 0.5, 0.5), sample(250, 0.5, 0.75)];

  const rawB = new InterpBuffer();
  feed(rawB);
  const smB = new InterpBuffer();
  feed(smB);

  let rawJump = 0;
  let smJump = 0;
  let prevRaw: { x: number; y: number } | null = null;
  let prevSm: { x: number; y: number } | null = null;
  let delivered = false;
  for (let t = 110; t <= 800; t += 8) {
    if (!delivered && t >= 260) {
      for (const s of late) {
        rawB.push(s);
        smB.push(s);
      }
      delivered = true;
    }
    const r = rawB.sampleAt(t)!;
    const s = smB.sampleSmoothed(t)!;
    if (prevRaw) rawJump = Math.max(rawJump, Math.hypot(r.x - prevRaw.x, r.y - prevRaw.y));
    if (prevSm) smJump = Math.max(smJump, Math.hypot(s.x - prevSm.x, s.y - prevSm.y));
    prevRaw = { x: r.x, y: r.y };
    prevSm = { x: s.x, y: s.y };
  }
  const plausiblePerFrame = (12 * 8) / 1000 + 0.02; // SMOOTH_MAX_SPEED over one 8ms frame
  assert.ok(rawJump > plausiblePerFrame, `raw path should snap (saw ${rawJump.toFixed(3)})`);
  assert.ok(smJump <= plausiblePerFrame + 1e-6, `smoothed path snapped ${smJump.toFixed(3)}`);
  // And it converges: by the end the offset has bled away.
  const finalRaw = rawB.sampleAt(800)!;
  const finalSm = smB.sampleSmoothed(800)!;
  assert.ok(Math.hypot(finalSm.x - finalRaw.x, finalSm.y - finalRaw.y) < 0.05, 'did not converge');
});

test('a real teleport still snaps — no cross-map glide', () => {
  const b = new InterpBuffer();
  b.push(sample(0, 0));
  b.push(sample(50, 0.25));
  b.sampleSmoothed(40);
  b.push(sample(100, 40)); // /tp across the world
  b.push(sample(150, 40.25));
  const s = b.sampleSmoothed(120)!;
  assert.ok(s.x > 39, `should render at the destination, got x=${s.x.toFixed(2)}`);
});
