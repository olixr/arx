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

test('the hold-maintenance law: the tip stays below the hand at EVERY gait, both grips', () => {
  // A fist holds a hilt one of two ways — blade-down forward or
  // blade-down reversed — and running never changes the hold. Sweeping
  // the tip above the fist reads as stabbing your own chest.
  for (const grip of GRIPS) {
    for (const side of SIDES) {
      for (let k = 0; k <= 1.0001; k += 0.05) {
        const c = bladeCarriage(grip, side, k);
        assert.ok(
          Math.sin(c.angle) > 0.35,
          `${grip}/${side} tip below the hand at runK=${k.toFixed(2)}`,
        );
      }
    }
  }
});

test('standard grip: blade down-forward, leveling (not raising) as the gait builds', () => {
  for (const side of SIDES) {
    for (let k = 0; k <= 1.0001; k += 0.05) {
      const c = bladeCarriage('normal', side, k);
      // The tip always leads FORWARD of the hand, on the facing side.
      assert.ok(Math.sign(Math.cos(c.angle)) === Math.sign(side), 'tip leads the facing');
      assert.ok(!c.flip, 'standard grip never mirrors the edge');
    }
    const idle = bladeCarriage('normal', side, 0);
    const run = bladeCarriage('normal', side, 1);
    // The run levels the same hold — a real change, but a modest one.
    const sweep = Math.abs(run.angle - idle.angle);
    assert.ok(sweep > 0.3 && sweep < 0.9, 'run levels the blade without changing the hold');
  }
});

test('rogue grip: reversed low-line, trailing the facing at every gait', () => {
  for (const side of SIDES) {
    for (let k = 0; k <= 1.0001; k += 0.05) {
      const c = bladeCarriage('rogue', side, k);
      // The reversed tip ALWAYS trails behind the facing — the one
      // invariant that makes it read as a reverse grip from any gait.
      assert.ok(Math.sign(Math.cos(c.angle)) === -Math.sign(side), 'tip trails the facing');
      assert.ok(c.flip, 'reverse grip turns the edge out');
    }
    const idle = bladeCarriage('rogue', side, 0);
    const run = bladeCarriage('rogue', side, 1);
    const sweep = Math.abs(run.angle - idle.angle);
    assert.ok(sweep > 0.15 && sweep < 0.6, 'run levels the low-line without changing the hold');
    assert.ok(run.dy < idle.dy, 'run carry rides a touch higher');
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

test('facing-weight law: fractional side relaxes the rake continuously, laws intact', () => {
  // The caller feeds |side| < 1 when the facing turns toward front/back
  // — the rake must relax smoothly toward vertical, never jump, and
  // every hold law must survive at every weight.
  for (const grip of GRIPS) {
    for (const sgn of SIDES) {
      for (const k of [0, 0.5, 1]) {
        let prev = bladeCarriage(grip, sgn * 0.3, k);
        for (let w = 0.35; w <= 1.0001; w += 0.05) {
          const c = bladeCarriage(grip, sgn * w, k);
          assert.ok(Math.abs(c.angle - prev.angle) < 0.12, `${grip} rake sweeps, never jumps`);
          assert.ok(Math.sin(c.angle) > 0.35, `${grip} tip stays below the hand at weight ${w}`);
          // The lead/trail read survives at every weight: the tip still
          // leans the correct way, just less steeply.
          const lean = Math.sign(Math.cos(c.angle));
          assert.equal(lean, grip === 'rogue' ? -sgn : sgn, `${grip} keeps its read at ${w}`);
          // Rake magnitude grows with the weight — profile is the
          // strongest read, front/back the most vertical.
          assert.ok(
            Math.abs(Math.cos(c.angle)) >= Math.abs(Math.cos(prev.angle)) - 1e-9,
            `${grip} rake grows with the facing weight`,
          );
          prev = c;
        }
      }
    }
  }
});

test('compact (knife) carriage rides tighter and steeper, same laws', () => {
  for (const grip of GRIPS) {
    for (const side of SIDES) {
      for (let k = 0; k <= 1.0001; k += 0.1) {
        const sword = bladeCarriage(grip, side, k, 0);
        const knife = bladeCarriage(grip, side, k, 1);
        assert.ok(Math.abs(knife.dx) < Math.abs(sword.dx), 'knife hangs tighter');
        // Every hold law survives the compact variant.
        assert.ok(Math.sin(knife.angle) > 0.35, 'knife tip below the hand');
        const lead = Math.sign(Math.cos(knife.angle));
        assert.equal(lead, grip === 'rogue' ? -Math.sign(side) : Math.sign(side));
      }
    }
  }
});
