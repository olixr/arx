import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECHO_START,
  STRIKE_R0,
  echoStage,
  resolveEcho,
  resolveStrike,
  schoolPhases,
  strikeGhosts,
  strikeWake,
  variantCount,
  type StrikeSchool,
} from './strikes.js';
import { WIELD_GROUND_K } from './wield.js';

const SCHOOLS: StrikeSchool[] = ['sword', 'rogue', 'great', 'staff'];
const STAGES = [0, 1] as const;

/** Every (school, stage, variant) triple in the book. */
function* cuts(): Generator<[StrikeSchool, 0 | 1, number]> {
  for (const school of SCHOOLS) {
    for (const stage of STAGES) {
      for (let v = 0; v < variantCount(school, stage); v++) yield [school, stage, v];
    }
  }
}

// ---- THE BEAT IS SACRED: the phase tables are the server-aligned
// clocks combat-v2 shipped — the engine may change every pixel of a
// swing and zero ticks of it. Byte-for-byte pins.

test('the sacred beat: every school keeps its shipped phase table', () => {
  assert.deepEqual(schoolPhases('sword'), { coil: 0.24, hold: 0.3, impact: 0.44, ext: 0.6 });
  assert.deepEqual(schoolPhases('rogue'), { coil: 0.2, hold: 0.27, impact: 0.37, ext: 0.54 });
  assert.deepEqual(schoolPhases('great'), { coil: 0.3, hold: 0.42, impact: 0.52, ext: 0.72 });
  assert.deepEqual(schoolPhases('staff'), { coil: 0.24, hold: 0.3, impact: 0.42, ext: 0.58 });
});

// ---- Blend safety and continuity.

test('every cut: fist continuous through the whole beat, guard-true at both ends', () => {
  for (const [school, stage, v] of cuts()) {
    for (const side of [1, -1] as const) {
      const start = resolveStrike(school, stage, v, 0, side, 0.7);
      const end = resolveStrike(school, stage, v, 1, side, 0.7);
      // Both ends land on the combat guard: reach R0 on the guard yaw,
      // no height, no lean.
      for (const f of [start, end]) {
        const r = Math.hypot(f.fistDX, f.fistDY / WIELD_GROUND_K);
        assert.ok(Math.abs(r - STRIKE_R0) < 0.02, `${school}/${stage}/${v} guard radius (${r.toFixed(3)})`);
        assert.ok(Math.abs(f.lean) < 1e-9, `${school}/${stage}/${v} lean neutral`);
      }
      let prev = start;
      for (let t = 0.005; t <= 1.0001; t += 0.005) {
        const cur = resolveStrike(school, stage, v, t, side, 0.7);
        assert.ok(
          Math.hypot(cur.fistDX - prev.fistDX, cur.fistDY - prev.fistDY) < 0.13,
          `${school}/${stage}/${v}/${side} fist continuous at t=${t.toFixed(3)}`,
        );
        assert.ok(Math.abs(cur.lean - prev.lean) < 0.05, 'lean continuous');
        // The snap legitimately whips the steel through the camera
        // line — fore moves fast there, but never actually jumps.
        assert.ok(Math.abs(cur.fore - prev.fore) < 0.09, 'fore continuous');
        prev = cur;
      }
    }
  }
});

// ---- THE ANTICIPATION LAW: a held coil before every cut.

test('every cut holds its coil — a frozen anticipation frame the eye can register', () => {
  for (const [school, stage, v] of cuts()) {
    const P = schoolPhases(school);
    assert.ok(P.hold - P.coil >= 0.05, 'the hold window exists');
    const coil = resolveStrike(school, stage, v, P.coil, 1, 0.7);
    for (let t = P.coil; t <= P.hold; t += 0.01) {
      const f = resolveStrike(school, stage, v, t, 1, 0.7);
      assert.ok(
        Math.hypot(f.fistDX - coil.fistDX, f.fistDY - coil.fistDY) < 0.02,
        `${school}/${stage}/${v} holds the coil`,
      );
    }
  }
});

// ---- THE SNAP LAW: slow in, fast out, held extension.

test('every cut snaps: strike-phase fist speed dwarfs the windup, and the landing holds', () => {
  for (const [school, stage, v] of cuts()) {
    const P = schoolPhases(school);
    assert.ok(P.impact - P.hold <= 0.15, `${school} strike phase is fast`);
    const speedAt = (t: number): number => {
      const a = resolveStrike(school, stage, v, t, 1, 0.7);
      const b = resolveStrike(school, stage, v, t + 0.004, 1, 0.7);
      return Math.hypot(b.fistDX - a.fistDX, b.fistDY - a.fistDY);
    };
    let windupPeak = 0;
    for (let t = 0; t < P.coil - 0.004; t += 0.004) windupPeak = Math.max(windupPeak, speedAt(t));
    let strikePeak = 0;
    for (let t = P.hold; t < P.impact - 0.004; t += 0.004) strikePeak = Math.max(strikePeak, speedAt(t));
    assert.ok(
      strikePeak > windupPeak * 2.2,
      `${school}/${stage}/${v} cut snaps (${strikePeak.toFixed(4)} vs ${windupPeak.toFixed(4)})`,
    );
    // The landed cut HOLDS its extension — the readable kill frame.
    const impact = resolveStrike(school, stage, v, P.impact, 1, 0.7);
    for (let t = P.impact; t <= P.ext; t += 0.01) {
      const f = resolveStrike(school, stage, v, t, 1, 0.7);
      assert.ok(
        Math.hypot(f.fistDX - impact.fistDX, f.fistDY - impact.fistDY) < 0.06,
        `${school}/${stage}/${v} holds the extension`,
      );
    }
  }
});

// ---- THE PLANE LAW: stage families alternate; variants stay in family.

test('the plane law: every stage-0 variant falls or drives forward, every stage-1 answers rising', () => {
  for (const school of SCHOOLS) {
    for (let v = 0; v < variantCount(school, 0); v++) {
      const P = schoolPhases(school);
      const coil = resolveStrike(school, 0, v, P.coil, 1, 0.7);
      const impact = resolveStrike(school, 0, v, P.impact, 1, 0.7);
      assert.ok(impact.fistDY > coil.fistDY - 0.02, `${school}/0/${v} the cut falls`);
    }
    for (let v = 0; v < variantCount(school, 1); v++) {
      const P = schoolPhases(school);
      const coil = resolveStrike(school, 1, v, P.coil, 1, 0.7);
      const impact = resolveStrike(school, 1, v, P.impact, 1, 0.7);
      assert.ok(impact.fistDY < coil.fistDY + 0.02, `${school}/1/${v} the answer rises`);
    }
  }
});

test('the variant book: at least two cuts per stage, and they are different cuts', () => {
  for (const school of SCHOOLS) {
    for (const stage of STAGES) {
      const n = variantCount(school, stage);
      assert.ok(n >= 2, `${school}/${stage} carries variants`);
      const P = schoolPhases(school);
      const a = resolveStrike(school, stage, 0, P.impact, 1, 0.7);
      const b = resolveStrike(school, stage, 1, P.impact, 1, 0.7);
      assert.ok(
        Math.hypot(a.fistDX - b.fistDX, a.fistDY - b.fistDY) > 0.08,
        `${school}/${stage} variants land different cuts`,
      );
    }
  }
});

test('the assassin signature survives: the cross rake PULLS in, the backslash flings out', () => {
  const P = schoolPhases('rogue');
  const rakeCoil = resolveStrike('rogue', 0, 0, P.coil, 1, 0.7);
  const rakeEnd = resolveStrike('rogue', 0, 0, P.impact, 1, 0.7);
  const rCoil = Math.hypot(rakeCoil.fistDX, rakeCoil.fistDY / WIELD_GROUND_K);
  const rEnd = Math.hypot(rakeEnd.fistDX, rakeEnd.fistDY / WIELD_GROUND_K);
  assert.ok(rCoil - rEnd > 0.08, 'the rake collapses its reach through the cut');
  const backCoil = resolveStrike('rogue', 1, 0, P.coil, 1, 0.7);
  const backEnd = resolveStrike('rogue', 1, 0, P.impact, 1, 0.7);
  const bCoil = Math.hypot(backCoil.fistDX, backCoil.fistDY / WIELD_GROUND_K);
  const bEnd = Math.hypot(backEnd.fistDX, backEnd.fistDY / WIELD_GROUND_K);
  assert.ok(bEnd - bCoil > 0.08, 'the backslash flings back out');
});

// ---- THE MIRROR LAW: side −1 is the exact reflection of side +1.

test('the mirror law: a west cut is the true reflection of an east cut, every channel', () => {
  for (const [school, stage, v] of cuts()) {
    for (let t = 0.02; t <= 1; t += 0.07) {
      const e = resolveStrike(school, stage, v, t, 1, 0);
      const w = resolveStrike(school, stage, v, t, -1, Math.PI);
      assert.ok(Math.abs(e.fistDX + w.fistDX) < 1e-9, `${school}/${stage}/${v} fist x mirrors`);
      assert.ok(Math.abs(e.fistDY - w.fistDY) < 1e-9, 'fist y (height + depth) is shared');
      const mirrored = Math.PI - e.bladeAngle;
      const d = Math.atan2(Math.sin(w.bladeAngle - mirrored), Math.cos(w.bladeAngle - mirrored));
      assert.ok(Math.abs(d) < 1e-9, `${school}/${stage}/${v} blade angle mirrors at t=${t.toFixed(2)}`);
      assert.ok(Math.abs(e.fore - w.fore) < 1e-9, 'foreshortening mirrors');
      assert.ok(Math.abs(e.depthSin - w.depthSin) < 1e-9, 'depth is shared');
      assert.ok(Math.abs(e.lean + w.lean) < 1e-9, 'lean mirrors');
    }
  }
});

// ---- GRIP TRUTH: the rogue blade stays reversed through every beat.

test('grip truth: the reversed blade never swings out to a forward point', () => {
  for (const stage of STAGES) {
    for (let v = 0; v < variantCount('rogue', stage); v++) {
      for (let t = 0.02; t <= 1; t += 0.02) {
        const f = resolveStrike('rogue', stage, v, t, 1, 0.7);
        // The blade points back along the fist's radial: reversed.
        const radial = Math.atan2(f.fistDY - 0, f.fistDX - 0);
        const rel = Math.atan2(
          Math.sin(f.bladeAngle - radial),
          Math.cos(f.bladeAngle - radial),
        );
        assert.ok(
          Math.abs(rel) > Math.PI / 2,
          `rogue/${stage}/${v} blade stays reversed at t=${t.toFixed(2)} (rel ${rel.toFixed(2)})`,
        );
      }
    }
  }
});

// ---- THE POLE BAR: staff cuts ride tangent, never radial.

test('the turning bar: mid-snap the staff lies across its arc, not along the arm', () => {
  for (const stage of STAGES) {
    const P = schoolPhases('staff');
    const t = (P.hold + P.impact) / 2;
    const f = resolveStrike('staff', stage, 0, t, 1, 0.7);
    const radial = Math.atan2(f.fistDY, f.fistDX);
    const rel = Math.abs(
      Math.atan2(Math.sin(f.bladeAngle - radial), Math.cos(f.bladeAngle - radial)),
    );
    // Tangent means roughly perpendicular to the radial (either lead).
    assert.ok(
      Math.abs(rel - Math.PI / 2) < 0.7 || Math.abs(rel - (3 * Math.PI) / 2) < 0.7,
      `staff/${stage} rides tangent (rel ${rel.toFixed(2)})`,
    );
    assert.ok(f.grip !== null && Math.abs(f.grip - 0.5) < 0.1, 'sweeps pivot at the middle');
    assert.ok(f.weldS !== null, 'both hands belong on the wood');
  }
});

// ---- THE WAKE IS THE BLADE'S: connectivity by construction.

test('the wake: silent in the windup, rooted on the live steel through the cut, dying after', () => {
  for (const [school, stage, v] of cuts()) {
    const P = schoolPhases(school);
    assert.equal(strikeWake(school, stage, v, P.coil / 2, 1, 0.7), null, 'no wake in the windup');
    assert.equal(strikeWake(school, stage, v, 0.99, 1, 0.7), null, 'no wake in the recover');
    const tMid = (P.hold + P.impact) / 2;
    const wk = strikeWake(school, stage, v, tMid, 1, 0.7);
    assert.ok(wk && wk.alpha === 1, 'full wake through the cut');
    // THE CONNECTIVITY LAW: the freshest sample IS the current frame —
    // the ribbon's head sits exactly on the blade.
    const head = wk!.samples[wk!.samples.length - 1]!;
    const now = resolveStrike(school, stage, v, tMid, 1, 0.7);
    assert.ok(Math.abs(head.dx - now.fistDX) < 1e-9, `${school}/${stage}/${v} wake head on the fist`);
    assert.ok(Math.abs(head.dy - now.fistDY) < 1e-9, 'wake head height true');
    assert.ok(Math.abs(head.angle - now.bladeAngle) < 1e-9, 'wake head along the blade');
    assert.ok(Math.abs(head.fore - now.fore) < 1e-9, 'wake head foreshortened as the art');
    // Fading monotonically through the extension.
    let prevA = 1;
    for (let t = P.impact; t <= P.ext; t += 0.02) {
      const w2 = strikeWake(school, stage, v, t, 1, 0.7);
      assert.ok(w2 && w2.alpha <= prevA + 1e-9, 'wake fades through the extension');
      prevA = w2!.alpha;
    }
  }
});

// ---- THE SWEEP EARNS ITS LAYER: depth crossings exist and are honest.

test('the layer law: a north-facing cut crosses behind the body; the depth channel is sin(yaw)', () => {
  // Facing north, the big stage-0 arcs must spend part of the beat on
  // the away side (depthSin < 0) — the rig paints those frames behind
  // the torso, which is what keeps the blade off the face.
  for (const school of SCHOOLS) {
    let minDepth = 1;
    for (let t = 0; t <= 1; t += 0.02) {
      const f = resolveStrike(school, 0, 0, t, 1, -Math.PI / 2);
      minDepth = Math.min(minDepth, f.depthSin);
    }
    assert.ok(minDepth < -0.32, `${school} north cut earns the behind layer (${minDepth.toFixed(2)})`);
  }
});

// ---- THE ONE-TWO LAW: the echo, re-based on the world engine.

test('the one-two law: the echo answers late, on the opposite plane, and lands neutral', () => {
  assert.equal(echoStage(0), 1);
  assert.equal(echoStage(1), 0);
  assert.equal(echoStage(2), 1);
  for (const offGrip of ['normal', 'rogue'] as const) {
    for (const mainStage of [0, 1, 2] as const) {
      assert.equal(resolveEcho(offGrip, mainStage, ECHO_START - 0.01, 0, 1, 0.7), null);
      assert.equal(resolveEcho(offGrip, mainStage, 0, 0, 1, 0.7), null);
      // The echo's strike window lands entirely after the main impact.
      const mainP = schoolPhases(mainStage === 2 ? 'sword' : 'sword');
      const echoP = schoolPhases(offGrip === 'rogue' ? 'rogue' : 'sword');
      const echoStrikeStart = ECHO_START + (1 - ECHO_START) * echoP.hold;
      assert.ok(echoStrikeStart > mainP.impact + 0.05, 'the echo waits for the main impact');
      // And lands neutral by the beat's end.
      const end = resolveEcho(offGrip, mainStage, 1, 0, 1, 0.7)!;
      const r = Math.hypot(end.fistDX, end.fistDY / WIELD_GROUND_K);
      assert.ok(Math.abs(r - STRIKE_R0) < 0.02, 'echo lands on the guard');
    }
  }
});

// ---- THE SPEED GHOSTS: only through the snap, always earlier, always fading.

test('the ghosts live only in the snap, at earlier beat times, dimmer with age', () => {
  for (const school of SCHOOLS) {
    const P = schoolPhases(school);
    assert.deepEqual(strikeGhosts(school, P.coil), [], 'no ghosts in the windup');
    assert.deepEqual(strikeGhosts(school, P.ext + 0.05), [], 'no ghosts in the extension');
    const mid = (P.hold + P.impact) / 2 + 0.03;
    const gs = strikeGhosts(school, mid);
    assert.ok(gs.length >= 1, 'ghosts ride the snap');
    for (const g of gs) assert.ok(g.t < mid, 'ghosts are the past');
    if (gs.length === 2) assert.ok(gs[1]!.alpha < gs[0]!.alpha, 'older is dimmer');
  }
});
