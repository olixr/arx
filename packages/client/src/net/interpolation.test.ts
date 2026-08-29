import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { InterpBuffer, shortestAngle } from './interpolation.js';

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

// ---- THE SEAT IS A TELEPORT (extrapolation side) -------------------
// Live-caught in Silverfall: a sleeper's last two samples straddle the
// bed mount — bedside walk → bed anchor in one 50ms tick, ~29 t/s,
// just under the extrapolation speed cap — and THE QUIET WIRE never
// sends another row, so render time sits past the newest sample for
// the entire night. The projection beached every sleeper ~4 tiles
// outside the house, lying in the void, until any row change (a talk)
// resent the truth.

test('a body resting after the mount teleport never extrapolates', () => {
  const b = new InterpBuffer();
  b.push({ ...sample(0, 10.3, 5.5), pose: 1 }); // last walk step, bedside
  b.push({ ...sample(50, 11.5, 4.7), pose: 16 }); // mount teleport onto the anchor, Lie
  // Deep in the quiet-wire night: minutes past the newest sample.
  const s = b.sampleAt(50 + 200_000)!;
  assert.equal(s.pose, 16);
  assert.ok(Math.abs(s.x - 11.5) < 1e-9 && Math.abs(s.y - 4.7) < 1e-9,
    `sleeper must hold the bed anchor, got ${s.x},${s.y}`);
});

test('a body that just rose never rides the dismount teleport', () => {
  const b = new InterpBuffer();
  b.push({ ...sample(0, 11.5, 4.7), pose: 16 }); // lying on the anchor
  b.push({ ...sample(50, 10.3, 5.5), pose: 0 }); // dismount step back beside the bed
  const s = b.sampleAt(50 + 200_000)!;
  assert.ok(Math.abs(s.x - 10.3) < 1e-9 && Math.abs(s.y - 5.5) < 1e-9,
    `riser must hold the bedside stand, got ${s.x},${s.y}`);
});

test('a seated body holds its chair through the quiet wire', () => {
  const b = new InterpBuffer();
  b.push({ ...sample(0, 3.2, 8.4), pose: 1 });
  b.push({ ...sample(50, 4.5, 8.5), pose: 14 }); // Sit mount
  const s = b.sampleAt(50 + 60_000)!;
  assert.ok(Math.abs(s.x - 4.5) < 1e-9, `sitter must hold the seat anchor, got ${s.x}`);
});

// ---- BALLISTIC TRUTH (v9) ------------------------------------------

test('a ballistic shot flies from its very first sample — no freeze', () => {
  const b = new InterpBuffer();
  b.ballisticSpeed = 12;
  b.push({ ...sample(0, 5), dir: 0 }); // spawn, flying east
  const s = b.sampleAt(100)!; // one transit later, still only one sample
  assert.ok(Math.abs(s.x - 6.2) < 1e-6, `expected 6.2 (12 t/s over 100ms), got ${s.x}`);
});

test('ballistic projection rides the NEWEST heading (homing curves)', () => {
  const b = new InterpBuffer();
  b.ballisticSpeed = 10;
  b.push({ ...sample(0, 0), dir: 0 });
  b.push({ ...sample(50, 0.5), dir: Math.PI / 2 }); // turned north
  const s = b.sampleAt(150)!;
  assert.ok(Math.abs(s.x - 0.5) < 1e-6, 'x should hold on a northward heading');
  assert.ok(Math.abs(s.y - 1.0) < 1e-6, `y should advance 1 tile, got ${s.y}`);
});

test('ballistic projection is capped at its longer leash, then holds', () => {
  const b = new InterpBuffer();
  b.ballisticSpeed = 12;
  b.push({ ...sample(0, 0), dir: 0 });
  const atCap = b.sampleAt(300)!;
  const beyond = b.sampleAt(2000)!;
  assert.ok(Math.abs(atCap.x - 3.6) < 1e-6, `cap should sit at 3.6 tiles, got ${atCap.x}`);
  assert.ok(Math.abs(beyond.x - atCap.x) < 1e-9, 'must hold at the cap');
});

test('shortestAngle wraps both ways', () => {
  assert.ok(Math.abs(shortestAngle(0.1, -0.1) + 0.2) < 1e-9);
  const wrapped = shortestAngle(Math.PI - 0.1, -Math.PI + 0.1);
  assert.ok(Math.abs(wrapped - 0.2) < 1e-9, `expected +0.2 across the seam, got ${wrapped}`);
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
