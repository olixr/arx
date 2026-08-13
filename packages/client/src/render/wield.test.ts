import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bladeCarriage } from './carriage.js';
import {
  WIELD_GROUND_K,
  facingFrame,
  gaitK,
  gaitLift,
  armPump,
  runnerLift,
  settleElbowPole,
  projectCarry,
  projectStrike,
  staffWield,
  staffStrikeFrame,
  staffStrikeTrail,
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
    const u = i / 40;
    const moveK = Math.min(1, u * 2);
    const runK = Math.max(0, u * 2 - 1);
    const v = gaitLift(moveK, runK);
    assert.ok(v >= prev - 1e-9, 'monotone along the accelerating path');
    assert.ok(Math.abs(v - prev) < 0.08, `step ${i} jumps ${Math.abs(v - prev).toFixed(3)}`);
    prev = v;
  }
});

// ---- the projection law ----

test('projection: profile facings reproduce the carriage verdicts exactly', () => {
  for (const grip of ['normal', 'rogue'] as const) {
    for (const runK of [0, 0.5, 1]) {
      const c = bladeCarriage(grip, 1, runK, 0);
      const pitch = Math.PI / 2 - c.angle;
      const p = projectCarry(0, pitch);
      assert.ok(
        Math.abs(p.angle - c.angle) < 1e-9,
        `${grip}@${runK}: east projection is the carriage angle (${p.angle} vs ${c.angle})`,
      );
      assert.ok(Math.abs(p.fore - 1) < 1e-9, 'no foreshortening at profile');
    }
  }
});

test('projection: mirror symmetry across vertical', () => {
  const e = projectCarry(0, 0.6);
  const w = projectCarry(Math.PI, 0.6);
  assert.ok(Math.abs(e.angle + w.angle - Math.PI) < 1e-9, 'angles mirror');
  assert.ok(Math.abs(e.fore - w.fore) < 1e-9, 'lengths agree');
});

test('projection: camera-line carries foreshorten, screen-plane ones do not', () => {
  const north = projectCarry(-Math.PI / 2, 1.2);
  const east = projectCarry(0, 1.2);
  assert.ok(north.fore < 0.95, `a north-leveled carry draws short (${north.fore.toFixed(3)})`);
  assert.ok(Math.abs(east.fore - 1) < 1e-9, 'an east-leveled carry draws full');
  assert.ok(north.fore >= 0.8, 'THE SOFT-DEPTH LAW: a cue, never a twig');
});

test('projection: continuous through a full turn', () => {
  let prev = projectCarry(0, 0.9);
  for (let i = 1; i <= 64; i++) {
    const yaw = (i / 64) * Math.PI * 2;
    const p = projectCarry(yaw, 0.9);
    const d = Math.atan2(Math.sin(p.angle - prev.angle), Math.cos(p.angle - prev.angle));
    assert.ok(Math.abs(d) < 0.35, `angle step ${i} jumps ${d.toFixed(3)}`);
    assert.ok(Math.abs(p.fore - prev.fore) < 0.12, `fore step ${i}`);
    prev = p;
  }
});

test('strike projection: softened, floored, profile-true', () => {
  const e = projectStrike(0);
  assert.ok(Math.abs(e.angle) < 1e-9 && Math.abs(e.fore - 1) < 1e-9, 'east untouched');
  const s = projectStrike(Math.PI / 2);
  assert.ok(Math.abs(s.angle - Math.PI / 2) < 1e-9, 'camera-line keeps its heading');
  assert.ok(s.fore >= 0.85 && s.fore < 0.95, `depth strikes shorten but stay a blow (${s.fore})`);
});

// ---- the honest pump ----

test('honest pump: N/S travel still moves an armed hand', () => {
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

test("runner's elbow: free fists rise only at speed", () => {
  assert.equal(runnerLift(0, 0, 1), 0, 'standing hands hang');
  assert.ok(runnerLift(1, 0, 1) < 0.02, 'a walk barely lifts them');
  assert.ok(runnerLift(1, 1, 1) > 0.08, 'a sprint carries them toward the ribs');
});

test("runner's elbow: the camera-line lift is a half-measure of the profile's", () => {
  const profile = runnerLift(1, 1, 1);
  const frontal = runnerLift(1, 1, 0);
  assert.ok(frontal < profile * 0.6, `frontal fists stay out of the armpits (${frontal.toFixed(3)})`);
  assert.ok(frontal > profile * 0.4, 'lowered, not dropped — the pump still reads');
  const mid = runnerLift(1, 1, 0.5);
  assert.ok(mid > frontal && mid < profile, 'linear breath through the diagonals');
});

// ---- the trailing-elbow pole ----

test('settle pole: a depth-axis run keeps the full outboard flare', () => {
  // N/S travel: poleX = 0 — the trail can show nothing on screen, so
  // it may claim nothing. The old blend zeroed the flare here and the
  // pole degenerated to straight-down (the N/S elbow-inversion bug).
  assert.ok(Math.abs(settleElbowPole(1, 0, 1) - 0.7) < 1e-9, 'main flare survives at full trail');
  assert.ok(Math.abs(settleElbowPole(-1, 0, 1) + 0.7) < 1e-9, 'off flare mirrors');
});

test('settle pole: a profile run hands the pole to the trail outright', () => {
  // E/W travel: |poleX| = 1 — the trail owns the pole, flare gone.
  // This is the chicken-wing verdict, preserved exactly.
  assert.ok(Math.abs(settleElbowPole(1, 1, 1) - -0.6) < 1e-9, 'elbow trails a full east run');
  assert.ok(Math.abs(settleElbowPole(1, -1, 1) - 0.6) < 1e-9, 'elbow trails a full west run');
});

test('settle pole: at rest the flare stands alone, and the blend is continuous', () => {
  assert.ok(Math.abs(settleElbowPole(1, 0.7, 0) - 0.7) < 1e-9, 'no gait, no trail claim');
  let prev = settleElbowPole(1, Math.cos(0), 1);
  for (let i = 1; i <= 64; i++) {
    const yaw = (i / 64) * Math.PI * 2;
    const p = settleElbowPole(1, Math.cos(yaw), 1);
    assert.ok(Math.abs(p - prev) < 0.15, `pole step ${i} jumps ${(p - prev).toFixed(3)}`);
    prev = p;
  }
});

// ---- the staff ----

test('staff ladder: planted upright at idle, one-hand level trail at a run', () => {
  const idle = staffWield(facingFrame(0, 1), 0, 0, 0, 1);
  const run = staffWield(facingFrame(0, 1), 1, 1, 0, 1);
  assert.ok(Math.abs(idle.angle + Math.PI / 2) < 0.01, 'idle: a true walking stick');
  assert.ok(Math.abs(idle.fore - 1) < 0.01, 'an upright stick is unforeshortened');
  assert.ok(run.angle > -0.4 && run.angle < 0.1, `run east: leveled, crown a touch high (${run.angle.toFixed(2)})`);
  assert.ok(idle.grip > 0.6 && run.grip <= 0.5, 'grip slides to the balance point');
});

test('staff run: north foreshortens the trail carry — the depth read', () => {
  const n = staffWield(facingFrame(-Math.PI / 2, 1), 1, 1, 0, 0);
  assert.ok(n.fore > 0.8 && n.fore < 0.93, `a north sprint shortens the staff a restrained shade (${n.fore.toFixed(3)})`);
  assert.ok(Math.abs(Math.abs(n.angle) - Math.PI / 2) < 0.2, 'and along the camera line');
});

test('staff rock is alive at every facing while walking', () => {
  const ew = staffWield(facingFrame(0, 1), 1, 0, 1, 1);
  const ns = staffWield(facingFrame(-Math.PI / 2, 1), 1, 0, 1, 0);
  assert.ok(Math.abs(ew.angle + Math.PI / 2) > 0.05, 'E/W stride rocks the stick');
  assert.ok(
    Math.abs(ns.angle + Math.PI / 2) > 0.008 || Math.abs(ns.fore - 1) > 0.012,
    'N/S stride works it too — as depth (length breathing), not screen tilt',
  );
});

test('staff channels are continuous through the ladder', () => {
  let prev = staffWield(facingFrame(0, 1), 0, 0, 0.5, 1);
  for (let i = 1; i <= 40; i++) {
    const u = i / 40;
    const moveK = Math.min(1, u * 2);
    const runK = Math.max(0, u * 2 - 1);
    const f = staffWield(facingFrame(0, 1), moveK, runK, 0.5, 1);
    assert.ok(Math.abs(f.angle - prev.angle) < 0.14, `angle step ${i}`);
    assert.ok(Math.abs(f.grip - prev.grip) < 0.05, `grip step ${i}`);
    assert.ok(Math.abs(f.fore - prev.fore) < 0.08, `fore step ${i}`);
    prev = f;
  }
});

test('staff planted hand sits out the pump, the run carry pumps with the arm', () => {
  assert.ok(staffWield(facingFrame(0, 1), 0, 0, 0, 1).pumpK < 0.4, 'planted: the stick holds the hand still');
  assert.equal(staffWield(facingFrame(0, 1), 1, 1, 0, 1).pumpK, 1, 'run carry: the arm swings with the gait');
});

// ---- the pole school ----

test('pole school: every channel neutral at both ends of the beat', () => {
  for (const stage of [0, 1] as const) {
    for (const t of [0, 1]) {
      const f = staffStrikeFrame(stage, t);
      assert.ok(Math.abs(f.arm - 0.5) < 1e-6, `arm rests (s${stage} t${t})`);
      assert.ok(Math.abs(f.spin) < 1e-6, `spin unwinds (s${stage} t${t})`);
      assert.ok(Math.abs(f.reach - 1) < 1e-6, `reach home (s${stage} t${t})`);
      assert.ok(Math.abs(f.lift) < 1e-6 && Math.abs(f.lean) < 1e-6, `lift/lean home (s${stage} t${t})`);
    }
  }
});

test('pole school: the shaft rides tangent through the cut', () => {
  for (const stage of [0, 1] as const) {
    const f = staffStrikeFrame(stage, 0.36); // mid-snap
    assert.ok(
      Math.abs(Math.abs(f.spin) - Math.PI / 2) < 0.6,
      `s${stage}: a turning bar, not a swung radius (spin ${f.spin.toFixed(2)})`,
    );
    assert.ok(Math.abs(f.grip - 0.5) < 0.01, 'sweeps pivot at the middle');
  }
});

test('pole school: stages alternate direction and line', () => {
  const a = STAFFDIR(0);
  const b = STAFFDIR(1);
  assert.ok(a * b < 0, 'the moulinet and the butt cut sweep opposite ways');
  const s0 = staffStrikeFrame(0, 0.24);
  const s1 = staffStrikeFrame(1, 0.24);
  assert.ok(s0.lift < 0 && s1.lift > 0, 'high coil answers low coil');
  function STAFFDIR(stage: 0 | 1): number {
    const f0 = staffStrikeFrame(stage, 0.24);
    const f1 = staffStrikeFrame(stage, 0.42);
    return f1.arm - f0.arm;
  }
});

test('pole school: the trail lives from the loosing through the extension', () => {
  assert.equal(staffStrikeTrail(0, 0.1), null, 'no trail in the windup');
  const mid = staffStrikeTrail(0, 0.4);
  assert.ok(mid !== null && mid.alpha > 0.9, 'full through the cut');
  assert.equal(staffStrikeTrail(0, 0.7), null, 'gone after the extension');
});

// ---- the bow ----

test('bow: the approved half-ready carry holds through the gait', () => {
  const idle = bowWield(facingFrame(0, 1), 0, 0);
  const run = bowWield(facingFrame(0, 1), 1, 1);
  assert.ok(Math.abs(idle.angle - 0.85) < 1e-9, 'idle at the user-approved rake');
  assert.ok(run.angle < idle.angle, 'the run leans a hair further toward ready');
  assert.ok(Math.abs(run.angle - idle.angle) < 0.15, 'a hair, not a new pose');
});

test('bow: mirror symmetry through the facing weight', () => {
  const r = bowWield(facingFrame(0, 1), 0, 0).angle;
  const l = bowWield(facingFrame(Math.PI, -1), 0, 0).angle;
  assert.ok(Math.abs(r + l - Math.PI) < 1e-9, 'angles mirror across vertical');
});

test('bow: the plane compresses toward the camera line, gently', () => {
  const e = bowWield(facingFrame(0, 1), 0, 0);
  const n = bowWield(facingFrame(-Math.PI / 2, 1), 0, 0);
  assert.ok(Math.abs(e.fore - 1) < 1e-9, 'full at profile');
  assert.ok(n.fore <= 0.95 && n.fore > 0.8, `half the rod law's depth (${n.fore.toFixed(3)})`);
});

test('gaitK feeds bladeCarriage the same ladder gaitLift eases', () => {
  const g = gaitK(1, 0.4);
  const viaCarriage = bladeCarriage('normal', 1, g, 0);
  const direct = Math.PI / 2 - (0.32 + 0.6 * gaitLift(1, 0.4));
  assert.ok(Math.abs(viaCarriage.angle - direct) < 1e-9, 'one ladder, two entry points');
});

// ---- the great school ----

import {
  GREAT_FINISHER_PHASES,
  GREAT_PHASES,
  greatFinisherLean,
  greatFinisherPath,
  greatStrikeFrame,
  greatStrikeTrail,
  greatWield,
} from './wield.js';
import { strikePhases } from './carriage.js';

test('shoulder carry: shouldered at idle, leveling a little at a run, never forward of the body', () => {
  // Facing east, the resting blade points up and BACK (screen up-left):
  // the shoulder carry, not a ready or a trail.
  const idle = greatWield(facingFrame(0, 1), 0, 0, 0, 1);
  assert.ok(Math.cos(idle.angle) < 0, 'idle tip trails behind the facing');
  assert.ok(Math.sin(idle.angle) < 0, 'idle tip rides up over the shoulder');
  const run = greatWield(facingFrame(0, 1), 1, 1, 0, 1);
  // The run levels the carry toward the drive but the tip stays behind
  // the body — a shouldered sprint, never a leveled lance.
  assert.ok(Math.cos(run.angle) < 0.1, 'run tip never leads the body');
  assert.ok(Math.sin(run.angle) < Math.sin(idle.angle) + 0.6, 'run keeps the blade up');
  // The fist drops toward the ribs and the grip slides up the handle.
  assert.ok(run.dy > idle.dy, 'the fist drops into the drive');
  assert.ok(run.grip > idle.grip, 'the grip slides toward the cross');
});

test('shoulder carry: continuous through the gait ladder — the mass never pops', () => {
  let prev = greatWield(facingFrame(1.2, 0.7), 0, 0, 0.3, 0.6);
  for (let i = 1; i <= 20; i++) {
    const k = i / 20;
    const g = greatWield(facingFrame(1.2, 0.7), Math.min(1, k * 2), k, 0.3, 0.6);
    assert.ok(Math.abs(g.dx - prev.dx) < 0.08, 'dx continuous');
    assert.ok(Math.abs(g.dy - prev.dy) < 0.08, 'dy continuous');
    assert.ok(Math.abs(g.grip - prev.grip) < 0.06, 'grip continuous');
    assert.ok(Math.abs(g.offClaim - prev.offClaim) < 0.35, 'claim continuous');
    prev = g;
  }
});

test('the second fist: the run calls the off hand back to the hilt', () => {
  assert.equal(greatWield(facingFrame(0, 1), 0, 0, 0, 1).offClaim, 0, 'idle frees the off hand');
  const walk = greatWield(facingFrame(0, 1), 1, 0.2, 0, 1).offClaim;
  const run = greatWield(facingFrame(0, 1), 1, 1, 0, 1).offClaim;
  assert.ok(walk < run, 'the claim builds with the gait');
  assert.ok(run > 0.95, 'a sprint welds both hands on');
});

test('great cuts: every channel neutral at both ends — blend-safe', () => {
  for (const stage of [0, 1] as const) {
    for (const t of [0, 1]) {
      const f = greatStrikeFrame(stage, t);
      assert.ok(Math.abs(f.arm - 0.5) < 1e-9, `stage ${stage} arm rests`);
      assert.ok(Math.abs(f.spin) < 1e-9, `stage ${stage} spin unwinds`);
      assert.ok(Math.abs(f.reach - 1) < 1e-9, `stage ${stage} reach home`);
      assert.ok(Math.abs(f.lift) < 1e-9, `stage ${stage} lift home`);
      assert.ok(Math.abs(f.lean) < 1e-9, `stage ${stage} lean home`);
    }
  }
});

test('the anticipation law: a HELD coil, wrist cocked against the coming cut', () => {
  for (const stage of [0, 1] as const) {
    const P = GREAT_PHASES;
    const atCoil = greatStrikeFrame(stage, P.coil + 1e-6);
    const midHold = greatStrikeFrame(stage, (P.coil + P.hold) / 2);
    // The hold is frozen — the eye's registration frame.
    assert.ok(Math.abs(atCoil.arm - midHold.arm) < 1e-6, 'the coil holds');
    // Cocked against the sweep: spin sign opposes the arm's travel.
    const impact = greatStrikeFrame(stage, P.impact);
    const sweep = Math.sign(impact.arm - atCoil.arm);
    assert.ok(Math.sign(midHold.spin) === -sweep, 'wrist lags the coming cut');
    assert.ok(Math.abs(midHold.spin) > 0.7, 'the lag is HEAVY — mass answers late');
  }
});

test('the plane law: the felling stroke drops, the wide reap runs level, directions alternate', () => {
  const P = GREAT_PHASES;
  const fell = greatStrikeFrame(0, P.coil);
  const reap = greatStrikeFrame(1, P.coil);
  assert.ok(fell.lift < -0.3, 'the felling stroke coils HIGH overhead');
  assert.ok(Math.abs(reap.lift) < 0.15, 'the reap coils on the level line');
  const fellSweep = Math.sign(greatStrikeFrame(0, P.impact).arm - fell.arm);
  const reapSweep = Math.sign(greatStrikeFrame(1, P.impact).arm - reap.arm);
  assert.ok(fellSweep !== reapSweep, 'consecutive cuts alternate direction');
});

test('the slow-beat law: the great phases run later than the sword school at every beat', () => {
  const S = strikePhases('normal');
  assert.ok(GREAT_PHASES.coil > S.coil && GREAT_PHASES.hold > S.hold, 'a longer gather');
  assert.ok(GREAT_PHASES.impact > S.impact && GREAT_PHASES.ext > S.ext, 'a longer landing');
  // But the SNAP law still holds: the cut itself is fast.
  assert.ok(GREAT_PHASES.impact - GREAT_PHASES.hold <= 0.15, 'the cut is still a snap');
});

test('great trail: silent through the coil, alive through the cut, dead after the extension', () => {
  for (const stage of [0, 1] as const) {
    const P = GREAT_PHASES;
    assert.equal(greatStrikeTrail(stage, P.coil / 2), null);
    const mid = greatStrikeTrail(stage, (P.hold + P.impact) / 2);
    assert.ok(mid !== null && mid.alpha > 0.9, 'full through the cut');
    const late = greatStrikeTrail(stage, (P.impact + P.ext) / 2);
    assert.ok(late !== null && late.alpha < 1, 'dying through the extension');
    assert.equal(greatStrikeTrail(stage, P.ext + 0.05), null);
  }
});

test('the mountain falls: overhead poise, the longest telegraph, then the bury', () => {
  const F = GREAT_FINISHER_PHASES;
  const poise = greatFinisherPath((F.coil + F.hold) / 2);
  // Poised: the blade near vertical-up, the fist raised, barely reaching.
  assert.ok(Math.abs(poise.pitch - Math.PI) < 0.25, 'the blade stands overhead');
  assert.ok(poise.lift < -0.3, 'the fists are hauled high');
  assert.ok(poise.r < 0.2, 'nothing reaches yet — all threat');
  // The poise is the longest hold of any school's finisher.
  assert.ok(F.hold - F.coil > 0.14, 'the mountain considers');
  // Buried: pitch crashed through level to down-forward, reach out.
  const buried = greatFinisherPath((F.drive + F.buried) / 2);
  assert.ok(buried.pitch < Math.PI / 2, 'the edge ends down-forward');
  assert.ok(buried.r > 0.4 && buried.lift > 0, 'buried at reach, weight pressing');
  // Blend-safe at both ends.
  const start = greatFinisherPath(0);
  const end = greatFinisherPath(1);
  assert.ok(Math.abs(start.r - end.r) < 0.15, 'reach comes home');
  assert.ok(Math.abs(end.lift) < 0.05, 'lift comes home');
  assert.ok(Math.abs(greatFinisherLean(0)) < 0.02 && Math.abs(greatFinisherLean(1)) < 0.02, 'lean home');
});
test('THE RESTING SHOULDER: square to the camera the blade leans over the shoulder, never vertical', () => {
  for (const dir of [Math.PI / 2, -Math.PI / 2]) {
    const g = greatWield(facingFrame(dir, 1), 0, 0, 0, 0);
    // A readable screen diagonal: clearly up, clearly to the side —
    // neither the centered candle nor a level plank.
    assert.ok(Math.sin(g.angle) < -0.5, `dir ${dir}: the blade points up`);
    assert.ok(Math.abs(Math.cos(g.angle)) > 0.4, `dir ${dir}: the lean reads as a diagonal`);
    // THE LEAN GOES INWARD: the tip crosses the shoulder line away
    // from the hilt fist — a rest, never a brandish (leaning outward
    // was the user-caught inversion).
    assert.ok(Math.sign(Math.cos(g.angle)) === -Math.sign(g.dx), `dir ${dir}: the blade crosses IN over the shoulder`);
    assert.ok(g.fore > 0.9, `dir ${dir}: the rest keeps its steel`);
    // The hilt holds by the resting shoulder, chest height.
    assert.ok(g.dx > 0.2, 'the fist sits out by the shoulder');
    assert.ok(g.dy < 0, 'the fist stays at the chest');
    assert.ok(g.offClaim < 0.05, 'the off hand stays free at a standstill');
  }
});

test('THE RESTING SHOULDER: the blade points up at EVERY facing and gait — nothing to clip the ground', () => {
  for (let i = 0; i < 16; i++) {
    const dir = (i / 16) * Math.PI * 2;
    for (const [m, r] of [[0, 0], [1, 0.2], [1, 1]] as const) {
      const g = greatWield(facingFrame(dir, 1), m, r, 0.3, Math.cos(dir));
      assert.ok(Math.sin(g.angle) < -0.25, `dir ${dir.toFixed(2)} gait ${r}: tip above the fist`);
    }
  }
});

test('THE RESTING SHOULDER: continuous in facing — turning on the spot never pops the carry', () => {
  let prev = greatWield(facingFrame(0, 1), 0, 0, 0, 0);
  for (let i = 1; i <= 48; i++) {
    const g = greatWield(facingFrame((i / 48) * Math.PI * 2, 1), 0, 0, 0, 0);
    let d = (g.angle - prev.angle) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    assert.ok(Math.abs(d) < 0.45, `step ${i}: angle continuous (${d.toFixed(2)})`);
    assert.ok(Math.abs(g.dx - prev.dx) < 0.08, `step ${i}: dx continuous`);
    assert.ok(Math.abs(g.dy - prev.dy) < 0.05, `step ${i}: dy continuous`);
    prev = g;
  }
});

test('THE RESTING SHOULDER: the side swap eases the blade across, never teleports it', () => {
  // sideS easing through zero (the smoothed rest-side flip) must carry
  // the lean smoothly from one shoulder to the other, square-on.
  let prev = greatWield(facingFrame(Math.PI / 2, 1), 0, 0, 0, 0);
  for (let i = 1; i <= 20; i++) {
    const sideS = 1 - (i / 10);
    const g = greatWield(facingFrame(Math.PI / 2, sideS), 0, 0, 0, 0);
    let d = (g.angle - prev.angle) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    assert.ok(Math.abs(d) < 0.3, `step ${i}: the swap eases (${d.toFixed(2)})`);
    prev = g;
  }
});
