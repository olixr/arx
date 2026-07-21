import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOURISH_MS,
  FLOURISH_OFF_PHASE_MS,
  FLOURISH_PERIOD_MS,
  bladeCarriage,
  icepickPath,
  idleFlourish,
  strikeArc,
  strikeBlade,
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
    assert.ok(sweep > 0.15 && sweep < 0.6, 'run deepens the trail without changing the hold');
    assert.ok(run.dy < idle.dy, 'the sprint hand lifts only a hair');
  }
});

test('the LOW-HANDS law: the assassin fist hangs at resting height at every gait', () => {
  // The armpit verdict: the rogue fist must NEVER ride up to "carry"
  // the blade — a raised fist folds the elbow into a cramped bend that
  // pivots jittery, and the whole stance reads goofy instead of
  // coiled. The reverse-grip hand stays within a hair of the relaxed
  // resting hang from idle through sprint.
  for (const side of SIDES) {
    for (const compact of [0, 1]) {
      for (let k = 0; k <= 1.0001; k += 0.05) {
        const c = bladeCarriage('rogue', side, k, compact);
        assert.ok(
          Math.abs(c.dy) <= 0.045,
          `rogue hand at rest height (dy=${c.dy.toFixed(3)}) at runK=${k.toFixed(2)}`,
        );
      }
    }
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

test('the no-flip law: no flourish ever revolves the blade', () => {
  // The user verdict: the full 2π rogue wrist spin read as goofily
  // flipping the sword. Every grip's flourish must stay a small tilt —
  // alive, but never a fraction of a revolution.
  for (const grip of GRIPS) {
    let peak = 0;
    for (let t = 0; t < FLOURISH_MS; t += FLOURISH_MS / 40) {
      peak = Math.max(peak, Math.abs(idleFlourish(t, 0, grip, 1)!.spin));
    }
    assert.ok(peak > 0.3, `${grip} flourish is alive`);
    assert.ok(peak < 1.0, `${grip} tilts, never flips`);
  }
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

test('the wrist law: a swing lags, whips to a lead, settles — continuous, neutral at both ends', () => {
  for (const grip of GRIPS) {
    for (const stage of [0, 1] as const) {
      const sgn = stage === 0 ? 1 : -1;
      const base = grip === 'rogue' ? Math.PI : 0;
      let prev = strikeBlade(grip, stage, 0);
      assert.ok(Math.abs(prev - base) < 1e-9, `${grip}/${stage} starts neutral`);
      for (let t = 0.01; t <= 1.0001; t += 0.01) {
        const cur = strikeBlade(grip, stage, t);
        assert.ok(Math.abs(cur - prev) < 0.12, `${grip}/${stage} continuous at t=${t.toFixed(2)}`);
        prev = cur;
      }
      assert.ok(Math.abs(strikeBlade(grip, stage, 1) - base) < 1e-6, 'lands neutral');
      // Cocked AGAINST the sweep at the top of the windup...
      assert.ok(sgn * (strikeBlade(grip, stage, 0.19) - base) < -0.3, 'lags in the windup');
      // ...leading the arm at the moment of impact.
      const arc = strikeArc(grip, stage);
      assert.ok(sgn * (strikeBlade(grip, stage, arc.strikeEnd) - base) > 0.2, 'leads at impact');
    }
  }
});

test('reverse-grip strikes: tighter arc, earlier impact, locked wrist, reversed throughout', () => {
  for (const stage of [0, 1] as const) {
    const std = strikeArc('normal', stage);
    const rg = strikeArc('rogue', stage);
    assert.ok(
      Math.abs(rg.follow - rg.windup) < Math.abs(std.follow - std.windup),
      'the assassin cut is narrower',
    );
    assert.ok(rg.strikeEnd < std.strikeEnd, 'and lands earlier in the beat');
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const rel = strikeBlade('rogue', stage, t) - Math.PI;
      // The blade stays REVERSED through the whole cut — never swings
      // out to a forward point (the grip never lies mid-attack).
      assert.ok(Math.abs(rel) < 0.5, `locked wrist stays tight at t=${t.toFixed(2)}`);
    }
  }
  // The backhand is the exact mirror of the forehand, both grips.
  for (const grip of GRIPS) {
    const a = strikeArc(grip, 0);
    const b = strikeArc(grip, 1);
    assert.equal(a.windup, b.follow);
    assert.equal(a.follow, b.windup);
    const base = grip === 'rogue' ? Math.PI : 0;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const fore = strikeBlade(grip, 0, t) - base;
      const back = strikeBlade(grip, 1, t) - base;
      assert.ok(Math.abs(fore + back) < 1e-9, `${grip} stages mirror at t=${t.toFixed(1)}`);
    }
  }
});

test('icepick finisher: coil high and in, drive down the aim, recover — continuous', () => {
  let prev = icepickPath(0);
  for (let t = 0.01; t <= 1.0001; t += 0.01) {
    const cur = icepickPath(t);
    assert.ok(
      Math.abs(cur.r - prev.r) < 0.04 && Math.abs(cur.lift - prev.lift) < 0.04,
      `continuous at t=${t.toFixed(2)}`,
    );
    prev = cur;
  }
  const coil = icepickPath(0.35);
  assert.ok(coil.lift < -0.3, 'the fist coils high over the shoulder');
  assert.ok(coil.r < 0.1, 'coiled in tight, not reaching');
  const strike = icepickPath(0.6);
  assert.ok(strike.r > 0.4, 'drives out along the aim');
  assert.ok(strike.lift > 0, 'lands below the shoulder line — a downward stab');
});
