import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WIELD_GROUND_K,
  gaitLift,
  armPump,
  staffWield,
  bowWield,
} from './wield.js';

// ---- the gait ladder ----

test('gait ladder: walk sits strictly between idle and run', () => {
  const idle = gaitLift(0, 0);
  const walk = gaitLift(1, 0);
  const run = gaitLift(1, 1);
  assert.equal(idle, 0, 'planted feet, no lift');
  assert.ok(walk > 0.1 && walk < 0.5, `walk stage is its own stance (${walk.toFixed(3)})`);
  assert.equal(run, 1, 'full sprint reaches the full carry');
});

test('gait ladder: continuous in both inputs (no stance pops)', () => {
  let prev = gaitLift(0, 0);
  for (let i = 1; i <= 40; i++) {
    // Sweep idle → walk → run along one path.
    const u = i / 40;
    const moveK = Math.min(1, u * 2);
    const runK = Math.max(0, u * 2 - 1);
    const v = gaitLift(moveK, runK);
    assert.ok(v >= prev - 1e-9, 'monotone along the accelerating path');
    assert.ok(Math.abs(v - prev) < 0.08, `step ${i} jumps ${Math.abs(v - prev).toFixed(3)}`);
    prev = v;
  }
});

// ---- the honest pump ----

test('honest pump: N/S travel still moves an armed hand', () => {
  // The old law suppressed the front-on pump to near-dead for armed
  // hands; the ground law keeps it alive, just foreshortened.
  const ns = armPump(0, 1, 1, 0.12, 1);
  assert.ok(Math.abs(ns.dy) > 0.02, `vertical pump alive (${ns.dy.toFixed(3)})`);
});

test('honest pump: N/S vertical is the E/W throw foreshortened by the ground', () => {
  const ew = armPump(1, 0, 1, 0.12, 0);
  const ns = armPump(0, 1, 1, 0.12, 0);
  assert.ok(Math.abs(ew.dx) > Math.abs(ns.dy), 'foreshortened, not equal');
  const ratio = Math.abs(ns.dy) / Math.abs(ew.dx);
  assert.ok(
    Math.abs(ratio - WIELD_GROUND_K) < 1e-9,
    `bare-hand N/S ratio IS the ground factor (${ratio.toFixed(3)})`,
  );
});

test('honest pump: the counter-sway lives only off-profile', () => {
  const ew = armPump(1, 0, 1, 0.12, 0);
  const ns = armPump(0, 1, 1, 0.12, 0);
  assert.equal(ew.sway, 0, 'profile travel needs no lateral patch');
  assert.ok(Math.abs(ns.sway) > 0, 'front/back travel gets the torso answer');
});

test('honest pump: a loaded hand restrains but never freezes', () => {
  const free = armPump(0, 1, 1, 0.12, 0);
  const armed = armPump(0, 1, 1, 0.12, 1);
  assert.ok(Math.abs(armed.dy) < Math.abs(free.dy), 'the weapon quiets the throw');
  assert.ok(Math.abs(armed.dy) > Math.abs(free.dy) * 0.4, 'quiet, not dead');
});

// ---- the two-handed staff ----

test('staff ladder: planted upright at idle and walk, level at run', () => {
  const idle = staffWield(1, 1, 0, 0, 0, 1);
  const walk = staffWield(1, 1, 1, 0, 0, 1);
  const run = staffWield(1, 1, 1, 1, 0, 1);
  assert.ok(Math.abs(idle.angle + Math.PI / 2) < 0.01, 'idle: a true walking stick');
  assert.ok(Math.abs(walk.angle + Math.PI / 2) < 0.35, 'walk: still planted (rock aside)');
  assert.ok(run.angle > -Math.PI / 2 + 0.9, `run: leveled into the trail carry (${run.angle.toFixed(2)})`);
  assert.ok(idle.grip > 0.6 && run.grip < 0.5, 'grip slides down the stick into the carry');
});

test('staff rock is alive at every facing while walking', () => {
  const ew = staffWield(1, 1, 1, 0, 1, 1);
  const ns = staffWield(1, 0.2, 1, 0, 1, 0);
  assert.ok(Math.abs(ew.angle + Math.PI / 2) > 0.05, 'E/W stride rocks the stick');
  assert.ok(Math.abs(ns.angle + Math.PI / 2) > 0.015, 'N/S stride rocks it too (the old rock died here)');
});

test('staff second hand: free at idle/walk, on the shaft at run', () => {
  assert.equal(staffWield(1, 1, 0, 0, 0, 1).twoHandK, 0, 'standing: one hand, stick planted');
  assert.ok(staffWield(1, 1, 1, 0.1, 0, 1).twoHandK < 0.2, 'slow walk: still one hand');
  const run = staffWield(1, 1, 1, 1, 0, 1);
  assert.equal(run.twoHandK, 1, 'sprint: both hands on the wood');
  assert.ok(run.chokeS > 0.15, 'the second hand chokes a real distance up the shaft');
});

test('staff channels are continuous through the ladder', () => {
  let prev = staffWield(1, 1, 0, 0, 0.5, 1);
  for (let i = 1; i <= 40; i++) {
    const u = i / 40;
    const moveK = Math.min(1, u * 2);
    const runK = Math.max(0, u * 2 - 1);
    const f = staffWield(1, 1, moveK, runK, 0.5, 1);
    assert.ok(Math.abs(f.angle - prev.angle) < 0.12, `angle step ${i}`);
    assert.ok(Math.abs(f.twoHandK - prev.twoHandK) < 0.15, `claim step ${i}`);
    assert.ok(Math.abs(f.grip - prev.grip) < 0.05, `grip step ${i}`);
    prev = f;
  }
});

test('staff planted hand sits out the pump, the carry hand rejoins it', () => {
  assert.ok(staffWield(1, 1, 0, 0, 0, 1).pumpK < 0.4, 'planted: the stick holds the hand still');
  assert.equal(staffWield(1, 1, 1, 1, 0, 1).pumpK, 1, 'run carry: the arm swings with the gait');
});

// ---- the bow ----

test('bow: the approved half-ready carry holds through the gait', () => {
  const idle = bowWield(1, 0, 0);
  const run = bowWield(1, 1, 1);
  assert.ok(Math.abs(idle.angle - 0.85) < 1e-9, 'idle at the user-approved rake');
  assert.ok(run.angle < idle.angle, 'the run leans a hair further toward ready');
  assert.ok(Math.abs(run.angle - idle.angle) < 0.15, 'a hair, not a new pose');
});

test('bow: mirror symmetry through the facing weight', () => {
  const r = bowWield(1, 0, 0).angle;
  const l = bowWield(-1, 0, 0).angle;
  assert.ok(Math.abs(r + l - Math.PI) < 1e-9, 'angles mirror across vertical');
});
