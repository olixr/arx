import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveArm } from './rig.js';
import { armPump, settleElbowPole } from './wield.js';
import { chooseLimbSign } from './legs.js';

const L = 0.17;

/**
 * The N/S-run stride, in the rig's own numbers (units of s): the main
 * arm settled on the right of the body at a camera-line facing. The
 * shoulder sits at the anatomical anchor; the fist hangs at hip-line
 * width, lifted by the runner's elbow, riding the honest pump and the
 * shared torso sway. Returns the shoulder→hand chord for phase `t`.
 */
function nsStrideChord(sideS: number, t: number): { dx: number; dy: number } {
  const sw = Math.sin(t);
  const p = armPump(0, 1, sw, 0.125, 0); // N/S travel: dx 0, sway full
  const shoulderX = sideS * 0.185 * 0.85; // rig.x + sideS·tw·0.85
  const handX = sideS * 0.125 * 1.08 + p.sway; // hip-line hang + sway
  const handY = 0.4 - 0.26 + 0.17 - 0.06 - p.dy - sw * sw * 0.03; // below shoulder
  return { dx: handX - shoulderX, dy: handY };
}

test('elbow lands on the preferred side of the shoulder→hand line', () => {
  // Hand below-right of the shoulder; prefer the elbow downward.
  const down = solveArm(0, 0, 0.2, 0.1, L, 0, 1);
  const up = solveArm(0, 0, 0.2, 0.1, L, 0, -1);
  assert.ok(down.ky > up.ky, 'preference flips the elbow side');
  assert.ok(down.ky > 0.05, 'downward preference puts the elbow below');
});

test('segment lengths hold through the solve', () => {
  const { ex, ey, kx, ky } = solveArm(0, 0, 0.15, 0.18, L, 0, 1);
  const upper = Math.hypot(kx, ky);
  const fore = Math.hypot(ex - kx, ey - ky);
  assert.ok(Math.abs(upper - L) < 1e-9, `upper arm stays bone-length (${upper})`);
  assert.ok(Math.abs(fore - L) < 1e-9, `forearm stays bone-length (${fore})`);
});

test('an out-of-reach hand is clamped, never stretched', () => {
  const { ex, ey } = solveArm(0, 0, 5, 5, L, 0, 1);
  const d = Math.hypot(ex, ey);
  assert.ok(d <= L * 2 * 1.08 + 1e-9, `hand clamped into reach (${d})`);
  // Still points at the target.
  assert.ok(Math.abs(ex - ey) < 1e-9, 'clamp preserves direction');
});

test('a straight-arm reach keeps a stable elbow (no NaN, on the line)', () => {
  const r = solveArm(0, 0, L * 2 * 1.08, 0, L, 0, 1);
  assert.ok(Number.isFinite(r.kx + r.ky), 'no NaN at full extension');
  assert.ok(Math.abs(r.ky) < 0.02, 'elbow sits on the arm line when straight');
});

// ---- the N/S-run elbow (the inversion regression) ----

test('N/S sprint: the pole never vanishes and the elbow never inverts', () => {
  // Full sprint straight north/south, facing settled (sideS = 1). The
  // fixed pole keeps the outboard flare (poleX = 0 → the trail claims
  // nothing) — the side choice must hold statelessly through the whole
  // stride, sway and pump included, and the solved elbow stays outboard.
  const prefX = settleElbowPole(1, 0, 1);
  const prefY = 1;
  for (let i = 0; i <= 48; i++) {
    const { dx, dy } = nsStrideChord(1, (i / 48) * Math.PI * 2);
    const d = Math.hypot(dx, dy);
    const sign = chooseLimbSign(-dy / d, dx / d, prefX, prefY, 0);
    assert.equal(sign, -1, `stride phase ${i}: elbow side committed outboard`);
    const r = solveArm(0.157, 0, 0.157 + dx, dy, L, prefX, prefY);
    assert.ok(r.kx > 0.157 + dx / 2, `stride phase ${i}: elbow outboard of the chord`);
  }
});

test('side-flip ease: memory carries the elbow through the degenerate window', () => {
  // Mid side-flip the flare sweeps through zero (sideS ≈ 0.3) and even
  // the fixed pole runs weak — every frame is borderline. The OLD
  // degenerate pole (0, 1) actually flips its stateless choice across
  // the stride (the bug); the remembered sign must hold every frame.
  let flipped = false;
  let prevStateless = 0;
  for (let i = 0; i <= 48; i++) {
    const { dx, dy } = nsStrideChord(0.3, (i / 48) * Math.PI * 2);
    const d = Math.hypot(dx, dy);
    const stateless = chooseLimbSign(-dy / d, dx / d, 0, 1, 0);
    if (prevStateless !== 0 && stateless !== prevStateless) flipped = true;
    prevStateless = stateless;
    const held = chooseLimbSign(-dy / d, dx / d, settleElbowPole(0.3, 0, 1), 1, -1);
    assert.equal(held, -1, `stride phase ${i}: memory holds through the borderline`);
  }
  assert.ok(flipped, 'the degenerate pole really does flip statelessly (the bug being guarded)');
});

test('a committed pole on the other side still overturns the memory', () => {
  // Hysteresis is a guard, not a lock: once the facing flip completes
  // (sideS = −1, arm re-anchored on the left), the pole claims the new
  // outboard side decisively and the remembered elbow must yield.
  const { dx, dy } = nsStrideChord(-1, Math.PI / 3);
  const d = Math.hypot(dx, dy);
  const sign = chooseLimbSign(-dy / d, dx / d, settleElbowPole(-1, 0, 1), 1, -1);
  assert.equal(sign, 1, 'the elbow crosses to the new outboard side');
});
