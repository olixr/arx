import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegSolver } from './rig.js';

/**
 * Gait invariants, matched to the herotown-style solver:
 * legLen 0.46, reach ≈ 0.4 at speed, emergency bound reach*1.12,
 * hip half-width 0.1 → feet should live within ~0.6 tiles of the body
 * center; 0.8 is the generous test ceiling (covers swing transit).
 */
const FOOT_LIMIT = 0.8;
const DT = 1 / 60;

function run(
  solver: LegSolver,
  path: (t: number) => { x: number; y: number; dir: number },
  seconds: number,
): { maxD: number; bothInFlight: number; frames: number } {
  let maxD = 0;
  let bothInFlight = 0;
  let frames = 0;
  for (let t = 0; t < seconds; t += DT) {
    const p = path(t);
    const pose = solver.update(p.x, p.y, p.dir, DT);
    for (const foot of pose.feet) {
      maxD = Math.max(maxD, Math.hypot(foot.x - p.x, foot.y - p.y));
    }
    if (pose.feet.every((f) => f.lift > 0)) bothInFlight++;
    frames++;
  }
  return { maxD, bothInFlight, frames };
}

test('feet stay near the body at full run speed', () => {
  const solver = new LegSolver();
  const { maxD } = run(solver, (t) => ({ x: 5 * t, y: 0, dir: 0 }), 3);
  assert.ok(maxD <= FOOT_LIMIT, `feet stretched to ${maxD.toFixed(3)} tiles`);
});

test('feet stay near the body through sharp zig-zags', () => {
  const solver = new LegSolver();
  const { maxD } = run(
    solver,
    (t) => {
      const seg = Math.floor(t * 2) % 4;
      const f = t % 0.5;
      const x = seg === 0 ? 5 * f : seg === 1 ? 2.5 : seg === 2 ? 2.5 - 5 * f : 0;
      const y = seg === 1 ? 5 * f : seg === 2 ? 2.5 : seg === 3 ? 2.5 - 5 * f : 0;
      return { x, y, dir: 0 };
    },
    4,
  );
  assert.ok(maxD <= FOOT_LIMIT, `zig-zag stretched to ${maxD.toFixed(3)} tiles`);
});

test('full-tilt running has a real flight phase (duty factor < 0.5)', () => {
  const solver = new LegSolver();
  const { bothInFlight, frames } = run(solver, (t) => ({ x: 5 * t, y: 0, dir: 0 }), 3);
  const frac = bothInFlight / frames;
  assert.ok(frac > 0.08, `sprint never left the ground (${(frac * 100).toFixed(1)}% flight)`);
  assert.ok(frac < 0.6, `sprint is leaping, not running (${(frac * 100).toFixed(1)}% flight)`);
});

test('walking pace keeps one foot planted — no flight below the run blend', () => {
  const solver = new LegSolver();
  const { bothInFlight, frames } = run(solver, (t) => ({ x: 1.8 * t, y: 0, dir: 0 }), 3);
  assert.ok(
    bothInFlight <= frames * 0.05,
    `walk went airborne ${bothInFlight}/${frames} frames`,
  );
});

test('sprint cadence is a bound, not a jitter: step rate stays humanly plausible', () => {
  const solver = new LegSolver();
  // Count foot-0 launches over 2 s of settled full-tilt running.
  for (let t = 0; t < 1; t += DT) solver.update(5 * t, 0, 0, DT);
  let launches = 0;
  let wasAir = false;
  for (let t = 1; t < 3; t += DT) {
    const pose = solver.update(5 * t, 0, 0, DT);
    const air = pose.feet[0]!.lift > 0;
    if (air && !wasAir) launches++;
    wasAir = air;
  }
  const perSec = launches / 2;
  assert.ok(perSec >= 1.5, `foot cycles ${perSec}/s — gait stalled`);
  assert.ok(perSec <= 4, `foot cycles ${perSec}/s — Energizer-Bunny mincing is back`);
});

test('feet settle under the body after stopping', () => {
  const solver = new LegSolver();
  for (let t = 0; t < 2; t += DT) solver.update(5 * t, 0, 0, DT);
  let pose = solver.update(10, 0, 0, DT);
  for (let t = 0; t < 1; t += DT) pose = solver.update(10, 0, 0, DT);
  for (const foot of pose.feet) {
    const d = Math.hypot(foot.x - 10, foot.y - 0);
    assert.ok(d < 0.35, `foot rested ${d.toFixed(3)} from body`);
    assert.equal(foot.lift, 0, 'feet planted at rest');
  }
});

test('teleports snap the feet instead of stretching across the map', () => {
  const solver = new LegSolver();
  for (let t = 0; t < 1; t += DT) solver.update(t, 0, 0, DT);
  const pose = solver.update(500, 500, 0, DT);
  for (const foot of pose.feet) {
    const d = Math.hypot(foot.x - 500, foot.y - 500);
    assert.ok(d <= FOOT_LIMIT, `post-teleport foot at ${d.toFixed(3)}`);
  }
});

test('cadence keeps up: the foot centroid tracks the moving body', () => {
  const solver = new LegSolver();
  let lagSum = 0;
  let frames = 0;
  for (let t = 0; t < 3; t += DT) {
    const x = 5 * t;
    const pose = solver.update(x, 0, 0, DT);
    if (t > 0.5) {
      const centroid = (pose.feet[0]!.x + pose.feet[1]!.x) / 2;
      lagSum += x - centroid;
      frames++;
    }
  }
  const avgLag = lagSum / frames;
  assert.ok(Math.abs(avgLag) < 0.25, `average gait lag ${avgLag.toFixed(3)} tiles`);
});

test('a pivot in place makes the feet visibly shuffle, not slide', () => {
  const solver = new LegSolver();
  // Settle facing right, then flip to face left.
  for (let t = 0; t < 1.5; t += DT) solver.update(0, 0, 0, DT);
  let stepped = 0;
  let airborne = false;
  for (let t = 0; t < 1.5; t += DT) {
    const pose = solver.update(0, 0, Math.PI, DT);
    const air = pose.feet.some((f) => f.lift > 0);
    if (air && !airborne) stepped++;
    airborne = air;
  }
  assert.ok(stepped >= 2, `pivot only re-planted ${stepped} feet (want both)`);
});

test('facing sideways staggers the stance; facing down squares it', () => {
  const side = new LegSolver();
  for (let t = 0; t < 2; t += DT) side.update(0, 0, 0, DT);
  const sideSpread = Math.abs(
    side.update(0, 0, 0, DT).feet[1]!.x - side.update(0, 0, 0, DT).feet[0]!.x,
  );
  const front = new LegSolver();
  for (let t = 0; t < 2; t += DT) front.update(0, 0, Math.PI / 2, DT);
  const frontPose = front.update(0, 0, Math.PI / 2, DT);
  const frontSpread = Math.abs(frontPose.feet[1]!.x - frontPose.feet[0]!.x);
  for (const foot of frontPose.feet) {
    assert.ok(Math.abs(foot.y) < 0.05, `front-facing foot staggered at y=${foot.y.toFixed(3)}`);
  }
  assert.ok(Math.abs(frontSpread - 0.2) < 0.05, `front spread ${frontSpread.toFixed(3)} ≠ hip width`);
  assert.ok(
    sideSpread > frontSpread + 0.1,
    `side-on stance (${sideSpread.toFixed(3)}) should out-stagger front-on (${frontSpread.toFixed(3)})`,
  );
});

test('aim jitter never earns shuffles — signed debt cancels', () => {
  const solver = new LegSolver();
  for (let t = 0; t < 1.5; t += DT) solver.update(0, 0, 0, DT);
  let lifts = 0;
  for (let t = 0; t < 3; t += DT) {
    // ±0.15 rad wobble around the same facing, like a twitchy mouse.
    const pose = solver.update(0, 0, Math.sin(t * 40) * 0.15, DT);
    if (pose.feet.some((f) => f.lift > 0)) lifts++;
  }
  assert.equal(lifts, 0, `jitter caused ${lifts} airborne frames`);
});

test('gait alternates harmoniously: strides interleave, not sync', () => {
  const solver = new LegSolver();
  // Warm up, then record which foot is airborne over time.
  for (let t = 0; t < 1; t += DT) solver.update(5 * t, 0, 0, DT);
  let switches = 0;
  let lastAir = -1;
  for (let t = 1; t < 3; t += DT) {
    const pose = solver.update(5 * t, 0, 0, DT);
    const air = pose.feet[0]!.lift > 0 ? 0 : pose.feet[1]!.lift > 0 ? 1 : -1;
    if (air !== -1 && air !== lastAir) {
      if (lastAir !== -1) switches++;
      lastAir = air;
    }
  }
  // Two seconds of running should produce many alternating swings.
  assert.ok(switches >= 6, `only ${switches} left/right alternations in 2s`);
});
