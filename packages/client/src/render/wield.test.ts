import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bladeCarriage } from './carriage.js';
import {
  WIELD_GROUND_K,
  gaitK,
  gaitLift,
  armPump,
  runnerLift,
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
  assert.ok(north.fore < 0.85, `a north-leveled carry draws short (${north.fore.toFixed(3)})`);
  assert.ok(Math.abs(east.fore - 1) < 1e-9, 'an east-leveled carry draws full');
  assert.ok(north.fore >= 0.55, 'the floor keeps a stub readable');
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
  assert.ok(s.fore >= 0.7 && s.fore < 0.85, `depth strikes shorten but stay a blow (${s.fore})`);
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
  assert.equal(runnerLift(0, 0), 0, 'standing hands hang');
  assert.ok(runnerLift(1, 0) < 0.02, 'a walk barely lifts them');
  assert.ok(runnerLift(1, 1) > 0.08, 'a sprint carries them toward the ribs');
});

// ---- the staff ----

test('staff ladder: planted upright at idle, one-hand level trail at a run', () => {
  const idle = staffWield(0, 1, 0, 0, 0, 1);
  const run = staffWield(0, 1, 1, 1, 0, 1);
  assert.ok(Math.abs(idle.angle + Math.PI / 2) < 0.01, 'idle: a true walking stick');
  assert.ok(Math.abs(idle.fore - 1) < 0.01, 'an upright stick is unforeshortened');
  assert.ok(run.angle > -0.4 && run.angle < 0.1, `run east: leveled, crown a touch high (${run.angle.toFixed(2)})`);
  assert.ok(idle.grip > 0.6 && run.grip <= 0.5, 'grip slides to the balance point');
});

test('staff run: north foreshortens the trail carry — the depth read', () => {
  const n = staffWield(-Math.PI / 2, 1, 1, 1, 0, 0);
  assert.ok(n.fore < 0.75, `a north sprint draws the staff short (${n.fore.toFixed(3)})`);
  assert.ok(Math.abs(Math.abs(n.angle) - Math.PI / 2) < 0.2, 'and along the camera line');
});

test('staff rock is alive at every facing while walking', () => {
  const ew = staffWield(0, 1, 1, 0, 1, 1);
  const ns = staffWield(-Math.PI / 2, 1, 1, 0, 1, 0);
  assert.ok(Math.abs(ew.angle + Math.PI / 2) > 0.05, 'E/W stride rocks the stick');
  assert.ok(
    Math.abs(ns.angle + Math.PI / 2) > 0.008 || Math.abs(ns.fore - 1) > 0.02,
    'N/S stride works it too — as depth (length breathing), not screen tilt',
  );
});

test('staff channels are continuous through the ladder', () => {
  let prev = staffWield(0, 1, 0, 0, 0.5, 1);
  for (let i = 1; i <= 40; i++) {
    const u = i / 40;
    const moveK = Math.min(1, u * 2);
    const runK = Math.max(0, u * 2 - 1);
    const f = staffWield(0, 1, moveK, runK, 0.5, 1);
    assert.ok(Math.abs(f.angle - prev.angle) < 0.14, `angle step ${i}`);
    assert.ok(Math.abs(f.grip - prev.grip) < 0.05, `grip step ${i}`);
    assert.ok(Math.abs(f.fore - prev.fore) < 0.08, `fore step ${i}`);
    prev = f;
  }
});

test('staff planted hand sits out the pump, the run carry pumps with the arm', () => {
  assert.ok(staffWield(0, 1, 0, 0, 0, 1).pumpK < 0.4, 'planted: the stick holds the hand still');
  assert.equal(staffWield(0, 1, 1, 1, 0, 1).pumpK, 1, 'run carry: the arm swings with the gait');
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
  const idle = bowWield(0, 1, 0, 0);
  const run = bowWield(0, 1, 1, 1);
  assert.ok(Math.abs(idle.angle - 0.85) < 1e-9, 'idle at the user-approved rake');
  assert.ok(run.angle < idle.angle, 'the run leans a hair further toward ready');
  assert.ok(Math.abs(run.angle - idle.angle) < 0.15, 'a hair, not a new pose');
});

test('bow: mirror symmetry through the facing weight', () => {
  const r = bowWield(0, 1, 0, 0).angle;
  const l = bowWield(Math.PI, -1, 0, 0).angle;
  assert.ok(Math.abs(r + l - Math.PI) < 1e-9, 'angles mirror across vertical');
});

test('bow: the plane compresses toward the camera line, gently', () => {
  const e = bowWield(0, 1, 0, 0);
  const n = bowWield(-Math.PI / 2, 0.2, 0, 0);
  assert.ok(Math.abs(e.fore - 1) < 1e-9, 'full at profile');
  assert.ok(n.fore < 0.9 && n.fore > 0.7, `half the rod law's depth (${n.fore.toFixed(3)})`);
});

test('gaitK feeds bladeCarriage the same ladder gaitLift eases', () => {
  const g = gaitK(1, 0.4);
  const viaCarriage = bladeCarriage('normal', 1, g, 0);
  const direct = Math.PI / 2 - (0.32 + 0.6 * gaitLift(1, 0.4));
  assert.ok(Math.abs(viaCarriage.angle - direct) < 1e-9, 'one ladder, two entry points');
});
