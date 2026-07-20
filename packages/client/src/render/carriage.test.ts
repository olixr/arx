import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOURISH_MS,
  FLOURISH_OFF_PHASE_MS,
  FLOURISH_PERIOD_MS,
  bladeCarriage,
  idleFlourish,
  type Grip,
} from './carriage.js';

const GRIPS: Grip[] = ['normal', 'rogue'];
const SIDES = [1, -1];

test('carriage is continuous across the whole gait — stances never pop', () => {
  for (const grip of GRIPS) {
    for (const side of SIDES) {
      let prev = bladeCarriage(grip, side, 0);
      for (let k = 0.02; k <= 1.0001; k += 0.02) {
        const cur = bladeCarriage(grip, side, k);
        assert.ok(
          Math.abs(cur.angle - prev.angle) < 0.12,
          `${grip}/${side} angle step at runK=${k.toFixed(2)}`,
        );
        assert.ok(Math.abs(cur.dx - prev.dx) < 0.02, `${grip}/${side} dx step`);
        assert.ok(Math.abs(cur.dy - prev.dy) < 0.02, `${grip}/${side} dy step`);
        prev = cur;
      }
    }
  }
});

test('standard grip: blade down-forward at rest, raised ready carry at a sprint', () => {
  for (const side of SIDES) {
    const idle = bladeCarriage('normal', side, 0);
    const run = bladeCarriage('normal', side, 1);
    // Idle tip points DOWN (+y is down on screen)…
    assert.ok(Math.sin(idle.angle) > 0.7, 'idle tip hangs down');
    // …and forward of the hand on the facing side.
    assert.ok(Math.sign(Math.cos(idle.angle)) === Math.sign(side), 'idle tip leads forward');
    // Sprint tip points UP-forward — the ready carry.
    assert.ok(Math.sin(run.angle) < -0.4, 'sprint tip rises above the hand');
    assert.ok(!idle.flip && !run.flip, 'standard grip never mirrors the edge');
  }
});

test('rogue grip: the low-line law — the reversed tip stays below the hand at every gait', () => {
  for (const side of SIDES) {
    for (let k = 0; k <= 1.0001; k += 0.05) {
      const c = bladeCarriage('rogue', side, k);
      assert.ok(Math.sin(c.angle) > 0.25, `tip below hand at runK=${k.toFixed(2)}`);
      // Tip trails BEHIND the facing side — down-back, never skewering
      // the belly (the >1.0 rad rake verdict).
      assert.ok(Math.sign(Math.cos(c.angle)) === -Math.sign(side), 'tip trails the facing');
      assert.ok(c.flip, 'reverse grip turns the edge out');
    }
    // The run stance is genuinely different from idle: raked further
    // back and carried higher.
    const idle = bladeCarriage('rogue', side, 0);
    const run = bladeCarriage('rogue', side, 1);
    assert.ok(Math.abs(run.angle - idle.angle) > 0.2, 'run rake differs from idle');
    assert.ok(run.dy < idle.dy, 'run carry rides higher');
  }
});

test('mirror-symmetry law: the left fist is the exact reflection of the right', () => {
  for (const grip of GRIPS) {
    for (let k = 0; k <= 1.0001; k += 0.1) {
      const r = bladeCarriage(grip, 1, k);
      const l = bladeCarriage(grip, -1, k);
      // Reflecting screen-x negates dx and mirrors the angle about the
      // vertical (π − a ≡ mirrored direction).
      assert.ok(Math.abs(l.dx + r.dx) < 1e-9);
      assert.ok(Math.abs(l.dy - r.dy) < 1e-9);
      const mirrored = Math.PI - r.angle;
      const d = Math.atan2(Math.sin(l.angle - mirrored), Math.cos(l.angle - mirrored));
      assert.ok(Math.abs(d) < 1e-9, `${grip} angle mirrors at runK=${k.toFixed(1)}`);
    }
  }
});

test('flourish: deterministic windows that land back on zero — blending can never pop', () => {
  for (const grip of GRIPS) {
    // Outside the window: silence.
    assert.equal(idleFlourish(FLOURISH_MS + 1, 0, grip, 1), null);
    assert.equal(idleFlourish(FLOURISH_PERIOD_MS - 10, 0, grip, 1), null);
    // Deterministic: same clock, same answer.
    const a = idleFlourish(400, 0, grip, 1);
    const b = idleFlourish(400, 0, grip, 1);
    assert.deepEqual(a, b);
    // Window edges land on spin ≡ 0 (mod 2π) and lift 0.
    for (const t of [0, FLOURISH_MS - 1e-6]) {
      const f = idleFlourish(t, 0, grip, 1);
      assert.ok(f, 'inside the window');
      const wrapped = Math.atan2(Math.sin(f!.spin), Math.cos(f!.spin));
      assert.ok(Math.abs(wrapped) < 0.05, `${grip} spin lands on zero at t=${t}`);
      assert.ok(Math.abs(f!.lift) < 0.01, `${grip} lift lands on zero at t=${t}`);
    }
    // Mid-window it actually moves.
    const mid = idleFlourish(FLOURISH_MS / 2, 0, grip, 1)!;
    assert.ok(Math.abs(mid.spin) > 0.2 || Math.abs(mid.lift) > 0.01, `${grip} flourish is alive`);
  }
  // The off fist's phase keeps the two hands out of sync: when the main
  // fist is mid-flourish the off fist is quiet.
  assert.ok(idleFlourish(FLOURISH_MS / 2, 0, 'rogue', 1) !== null);
  assert.equal(idleFlourish(FLOURISH_MS / 2, FLOURISH_OFF_PHASE_MS, 'rogue', 1), null);
});

test('rogue flourish is a full wrist spin; standard is a tip-raise', () => {
  // The rogue spin sweeps a full turn over the window (monotonic in u).
  let last = 0;
  for (let t = 0; t < FLOURISH_MS; t += FLOURISH_MS / 40) {
    const f = idleFlourish(t, 0, 'rogue', 1)!;
    assert.ok(f.spin >= last - 1e-9, 'spin never reverses');
    last = f.spin;
  }
  assert.ok(last > Math.PI * 1.8, 'sweeps essentially the full turn');
  // Standard peaks well short of a spin — an inspect, not a twirl.
  let peak = 0;
  for (let t = 0; t < FLOURISH_MS; t += FLOURISH_MS / 40) {
    peak = Math.max(peak, Math.abs(idleFlourish(t, 0, 'normal', 1)!.spin));
  }
  assert.ok(peak > 0.3 && peak < 1.0, 'a raise, not a revolution');
});
