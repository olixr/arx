import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECHO_START,
  FINISHER_PHASES,
  FLOURISH_MS,
  FLOURISH_OFF_PHASE_MS,
  FLOURISH_PERIOD_MS,
  STRIKE_REST_ARM,
  bladeCarriage,
  echoFrame,
  echoStage,
  finisherLean,
  icepickPath,
  idleFlourish,
  strikeFrame,
  strikePhases,
  strikeTrail,
  thrustPath,
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
        let prev = bladeCarriage(grip, sgn * 0.15, k);
        for (let w = 0.2; w <= 1.0001; w += 0.05) {
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

// ---- The strike vocabulary: the readability laws of the two schools.

const STAGES = [0, 1] as const;

/** The cut's direction sign — from the coil toward the impact pose. */
function cutSign(grip: Grip, stage: 0 | 1): number {
  const P = strikePhases(grip);
  const coil = strikeFrame(grip, stage, P.coil);
  const impact = strikeFrame(grip, stage, P.ext);
  return Math.sign(impact.arm - coil.arm);
}

test('strike frames: every channel continuous, neutral at both ends — blend-safe', () => {
  for (const grip of GRIPS) {
    for (const stage of STAGES) {
      const start = strikeFrame(grip, stage, 0);
      const end = strikeFrame(grip, stage, 1);
      const base = grip === 'rogue' ? Math.PI : 0;
      for (const f of [start, end]) {
        assert.ok(Math.abs(f.arm - STRIKE_REST_ARM) < 1e-9, `${grip}/${stage} arm neutral`);
        assert.ok(Math.abs(f.blade - base) < 1e-9, `${grip}/${stage} blade neutral`);
        assert.ok(Math.abs(f.reach - 1) < 1e-9, `${grip}/${stage} reach neutral`);
        assert.ok(Math.abs(f.lift) < 1e-9 && Math.abs(f.lean) < 1e-9, 'lift/lean neutral');
      }
      let prev = start;
      for (let t = 0.005; t <= 1.0001; t += 0.005) {
        const cur = strikeFrame(grip, stage, t);
        assert.ok(Math.abs(cur.arm - prev.arm) < 0.16, `${grip}/${stage} arm cont. t=${t.toFixed(3)}`);
        assert.ok(Math.abs(cur.blade - prev.blade) < 0.1, `${grip}/${stage} blade cont.`);
        assert.ok(Math.abs(cur.reach - prev.reach) < 0.06, `${grip}/${stage} reach cont.`);
        assert.ok(Math.abs(cur.lift - prev.lift) < 0.04, `${grip}/${stage} lift cont.`);
        assert.ok(Math.abs(cur.lean - prev.lean) < 0.04, `${grip}/${stage} lean cont.`);
        prev = cur;
      }
    }
  }
});

test('the anticipation law: a held coil, cocked opposite the cut, before every strike', () => {
  for (const grip of GRIPS) {
    for (const stage of STAGES) {
      const P = strikePhases(grip);
      const sgn = cutSign(grip, stage);
      const coil = strikeFrame(grip, stage, P.coil);
      // The coil winds AGAINST the coming cut, far enough to read.
      assert.ok(sgn * (coil.arm - STRIKE_REST_ARM) < -0.5, `${grip}/${stage} coils opposite`);
      // The wrist cocks against the sweep too.
      const base = grip === 'rogue' ? Math.PI : 0;
      assert.ok(sgn * (coil.blade - base) < -0.25, `${grip}/${stage} wrist cocked`);
      // And the coil HOLDS — a frozen anticipation frame the eye can
      // register, not a direction flip in passing.
      assert.ok(P.hold - P.coil >= 0.05, 'the hold window exists');
      for (let t = P.coil; t <= P.hold; t += 0.01) {
        const f = strikeFrame(grip, stage, t);
        assert.ok(Math.abs(f.arm - coil.arm) < 0.02, `${grip}/${stage} holds the coil`);
      }
    }
  }
});

test('the snap law: a fast strike phase landing in a held extension', () => {
  for (const grip of GRIPS) {
    for (const stage of STAGES) {
      const P = strikePhases(grip);
      // The cut itself is a snap — a sliver of the beat.
      assert.ok(P.impact - P.hold <= 0.15, `${grip}/${stage} strike phase is fast`);
      // Peak arm speed in the strike dwarfs the windup's — slow in,
      // fast out, the whip-crack shape.
      const speedAt = (t: number): number =>
        Math.abs(strikeFrame(grip, stage, t + 0.004).arm - strikeFrame(grip, stage, t).arm);
      let windupPeak = 0;
      for (let t = 0; t < P.coil - 0.004; t += 0.004) windupPeak = Math.max(windupPeak, speedAt(t));
      let strikePeak = 0;
      for (let t = P.hold; t < P.impact - 0.004; t += 0.004)
        strikePeak = Math.max(strikePeak, speedAt(t));
      assert.ok(strikePeak > windupPeak * 2.5, `${grip}/${stage} cut snaps (${strikePeak.toFixed(3)} vs ${windupPeak.toFixed(3)})`);
      // The landed cut HOLDS its extension — the readable kill frame.
      const impact = strikeFrame(grip, stage, P.impact);
      for (let t = P.impact; t <= P.ext; t += 0.01) {
        const f = strikeFrame(grip, stage, t);
        assert.ok(Math.abs(f.arm - impact.arm) < 0.12, `${grip}/${stage} holds the extension`);
      }
    }
  }
});

test('the plane law: consecutive stages alternate direction and plane — no repeated silhouette', () => {
  for (const grip of GRIPS) {
    // Opposite sweep directions.
    assert.equal(cutSign(grip, 0), -cutSign(grip, 1), `${grip} stages cut opposite ways`);
    const P = strikePhases(grip);
    const c0 = strikeFrame(grip, 0, P.coil);
    const i0 = strikeFrame(grip, 0, P.ext);
    const c1 = strikeFrame(grip, 1, P.coil);
    const i1 = strikeFrame(grip, 1, P.ext);
    // Stage 0 cuts downward from a raised coil; stage 1 answers upward.
    assert.ok(c0.lift < -0.1 && i0.lift > c0.lift, `${grip} stage 0 falls`);
    assert.ok(c1.lift > 0 && i1.lift < c1.lift, `${grip} stage 1 rises`);
  }
  // The swordsman extends THROUGH both cuts; the assassin's signature
  // is the PULL — the cross rake collapses its reach through the cut,
  // then the backslash flings back out.
  const sp = strikePhases('normal');
  assert.ok(strikeFrame('normal', 0, sp.ext).reach > 1.2, 'the cleave extends');
  assert.ok(strikeFrame('normal', 1, sp.ext).reach > 1.2, 'the return extends');
  const rp = strikePhases('rogue');
  const rake = strikeFrame('rogue', 0, rp.coil).reach - strikeFrame('rogue', 0, rp.ext).reach;
  assert.ok(rake > 0.3, 'the cross rake PULLS in — reach collapses through the cut');
  const flick = strikeFrame('rogue', 1, rp.ext).reach - strikeFrame('rogue', 1, rp.coil).reach;
  assert.ok(flick > 0.3, 'the backslash flings back out');
});

test('the assassin school: tighter arcs, earlier beats, locked reversed wrist throughout', () => {
  for (const stage of STAGES) {
    const sp = strikePhases('normal');
    const rp = strikePhases('rogue');
    const stdSpan = Math.abs(
      strikeFrame('normal', stage, sp.ext).arm - strikeFrame('normal', stage, sp.coil).arm,
    );
    const rgSpan = Math.abs(
      strikeFrame('rogue', stage, rp.ext).arm - strikeFrame('rogue', stage, rp.coil).arm,
    );
    assert.ok(rgSpan < stdSpan * 0.75, 'the assassin cut is narrower');
    assert.ok(rp.impact < sp.impact, 'and lands earlier in the beat');
    // GRIP TRUTH: the blade stays reversed through the WHOLE cut —
    // never swings out to a forward point (the grip never lies).
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const rel = strikeFrame('rogue', stage, t).blade - Math.PI;
      assert.ok(Math.abs(rel) < 0.6, `locked wrist stays tight at t=${t.toFixed(2)}`);
    }
  }
});

test('slash trail: silent through the coil, chasing the cut, dying through the extension', () => {
  for (const grip of GRIPS) {
    for (const stage of STAGES) {
      const P = strikePhases(grip);
      assert.equal(strikeTrail(grip, stage, P.coil / 2), null, 'no trail in the windup');
      assert.equal(strikeTrail(grip, stage, 0.98), null, 'no trail in the recover');
      const mid = strikeTrail(grip, stage, (P.hold + P.impact) / 2);
      assert.ok(mid && mid.alpha === 1, 'full trail through the cut');
      // The crescent starts at the coil and chases the arm.
      const coil = strikeFrame(grip, stage, P.coil);
      assert.ok(Math.abs(mid!.from - coil.arm) < 1e-9, 'trail roots at the coil');
      // Fading monotonically through the extension hold.
      let prevA = 1;
      for (let t = P.impact; t <= P.ext; t += 0.02) {
        const tr = strikeTrail(grip, stage, t);
        assert.ok(tr && tr.alpha <= prevA + 1e-9, 'trail fades through the extension');
        prevA = tr!.alpha;
      }
    }
  }
});

test('the one-two law: the echo cuts the opposite plane, entirely after the main impact', () => {
  // The echo answers on the opposite plane.
  assert.equal(echoStage(0), 1);
  assert.equal(echoStage(1), 0);
  assert.equal(echoStage(2), 1);
  for (const mainGrip of GRIPS) {
    for (const offGrip of GRIPS) {
      for (const mainStage of [0, 1, 2] as const) {
        // Silent until the echo beat begins.
        assert.equal(echoFrame(offGrip, mainStage, ECHO_START - 0.01), null);
        assert.equal(echoFrame(offGrip, mainStage, 0), null);
        // The echo's strike window lands entirely after the main
        // blade's impact — one blade owns the eye at any instant.
        const mainP = strikePhases(mainGrip);
        const echoP = strikePhases(offGrip);
        const span = 1 - ECHO_START;
        const echoStrikeStart = ECHO_START + span * echoP.hold;
        assert.ok(
          echoStrikeStart > mainP.impact + 0.05,
          `echo cut (${echoStrikeStart.toFixed(2)}) waits for the main impact (${mainP.impact})`,
        );
        // Opposite direction to the main cut (scissor, not parallel).
        if (mainStage !== 2) {
          const es = echoStage(mainStage);
          assert.equal(
            cutSign(offGrip, es),
            -cutSign(offGrip, mainStage as 0 | 1),
            'the echo scissors',
          );
        }
        // And the echo lands neutral by the beat's end.
        const end = echoFrame(offGrip, mainStage, 1)!;
        assert.ok(Math.abs(end.arm - STRIKE_REST_ARM) < 1e-6, 'echo lands neutral');
      }
    }
  }
});

test('finishers: coil, POISED hold, snap drive, buried hold — continuous, telegraphed, landed', () => {
  const P = FINISHER_PHASES;
  for (const path of [thrustPath, icepickPath]) {
    let prev = path(0);
    for (let t = 0.005; t <= 1.0001; t += 0.005) {
      const cur = path(t);
      assert.ok(
        Math.abs(cur.r - prev.r) < 0.04 && Math.abs(cur.lift - prev.lift) < 0.04,
        `continuous at t=${t.toFixed(3)}`,
      );
      prev = cur;
    }
    // The poised hold: the loaded pose barely moves — the telegraph.
    const poise = path(P.coil);
    for (let t = P.coil; t <= P.hold; t += 0.01) {
      assert.ok(Math.abs(path(t).r - poise.r) < 0.02, 'poised hold barely moves');
    }
    // The drive reaches full extension fast...
    assert.ok(path(P.drive).r > 0.4, 'drives to full extension');
    // ...and stays buried — the kill frame is held, never a drive-by.
    const buried = path(P.drive);
    for (let t = P.drive; t <= P.buried; t += 0.01) {
      assert.ok(Math.abs(path(t).r - buried.r) < 0.05, 'held buried');
    }
  }
  // Thrust: hauled to the hip, level. Icepick: coiled HIGH — the
  // raised-dagger silhouette — landing BELOW the shoulder line.
  assert.ok(thrustPath(P.hold).r < 0.1, 'thrust loads at the hip');
  assert.ok(icepickPath(P.hold).lift < -0.3, 'icepick poises high overhead');
  assert.ok(icepickPath(P.drive).lift > 0, 'the plunge lands low — a downward stab');
  // The shared lean choreography: coiled away, tipped hard into the
  // drive, neutral by the end.
  assert.ok(finisherLean(P.coil) < -0.05, 'coiled away');
  assert.ok(finisherLean(P.drive) > 0.15, 'tipped into the drive');
  assert.ok(Math.abs(finisherLean(1)) < 1e-6, 'lean lands neutral');
  let prevL = finisherLean(0);
  for (let t = 0.005; t <= 1.0001; t += 0.005) {
    const cur = finisherLean(t);
    assert.ok(Math.abs(cur - prevL) < 0.04, 'lean continuous');
    prevL = cur;
  }
});
