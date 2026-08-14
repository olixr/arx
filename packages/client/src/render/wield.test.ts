import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bladeCarriage } from './carriage.js';
import {
  WIELD_GROUND_K,
  facingFrame,
  gaitK,
  lifelineYaw,
  projectAim,
  awayPeekK,
  bandFlag,
  BREATH_K,
  SIDE_FLOOR,
  SIDE_SLOPE,
  easeRestSide,
  type RestSideMemory,
  gaitLift,
  armPump,
  runnerLift,
  settleElbowPole,
  projectCarry,
  projectStrike,
  staffWield,
  STAFF_PLANT_LEAN,
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

test('THE VISIBLE BREATH: N/S vertical is the ground-foreshortened throw, re-voiced by the breath gain', () => {
  const ew = armPump(1, 0, 1, 0.12, 0);
  const ns = armPump(0, 1, 1, 0.12, 0);
  assert.ok(Math.abs(ew.dx) > Math.abs(ns.dy), 'still foreshortened, never equal');
  const ratio = Math.abs(ns.dy) / Math.abs(ew.dx);
  // Phase 5 re-pin: the old pin held this to the raw ground factor —
  // the honest-but-dead statue run. The camera-line remnant now
  // carries the beat's energy on the axis the camera can see.
  assert.ok(
    Math.abs(ratio - WIELD_GROUND_K * (1 + BREATH_K)) < 1e-9,
    `N/S ratio is K amplified by the breath (${ratio.toFixed(3)})`,
  );
  // Profile stays EXACT: the breath is zero where the pump reads.
  assert.ok(Math.abs(ew.dx - 1 * 1 * 0.12) < 1e-9, 'E/W throw untouched by the breath');
});

test('THE PINNED LAW: fractional armedK interpolates the vertical restraint (the audit gap)', () => {
  const free = armPump(0, 1, 1, 0.12, 0);
  const half = armPump(0, 1, 1, 0.12, 0.5);
  const armed = armPump(0, 1, 1, 0.12, 1);
  const expectHalf = 0.12 * WIELD_GROUND_K * (1 - 0.45 * 0.5) * (1 + BREATH_K);
  assert.ok(Math.abs(Math.abs(half.dy) - expectHalf) < 1e-9, 'the production input is fractional and lawful');
  assert.ok(Math.abs(half.dy) < Math.abs(free.dy) && Math.abs(half.dy) > Math.abs(armed.dy), 'monotone in load');
});

test('THE PINNED LAW: the facing weight is the named floor and slope', () => {
  for (const dir of [0, Math.PI / 4, Math.PI / 2, 2.2]) {
    const f = facingFrame(dir, 1);
    assert.ok(
      Math.abs(f.sideW - (SIDE_FLOOR + SIDE_SLOPE * f.profileK)) < 1e-9,
      `weight law holds at ${dir}`,
    );
  }
  assert.ok(Math.abs(facingFrame(Math.PI / 2, -0.5).sideW - -0.5 * SIDE_FLOOR) < 1e-9, 'signed and floored');
});

test('THE PINNED LAW: the dwell truth — fast jitter never flips, a slow deliberate wobble DOES', () => {
  // The audit called the >240ms-period wobble "the dwell-defeating
  // case, untested". Tested: it flips — CORRECTLY. A heading held for
  // 150ms+ per side is indistinguishable from real turning, and the
  // 240ms ease absorbs it into a sway instead of a snap. The law is
  // that FAST jitter (sub-dwell holds) never registers; pinned both.
  const fast: RestSideMemory = {};
  for (let t = 0; t <= 2000; t += 16) {
    const fx = Math.sin(t * 0.05) * 0.5; // ~125ms period: sub-dwell
    easeRestSide(fast, Math.sign(fx) || 1, fx, t);
  }
  assert.equal(fast.side, 1, 'sub-dwell jitter holds the standing side');
  const slow: RestSideMemory = {};
  let flipped = false;
  for (let t = 0; t <= 2000; t += 16) {
    const fx = Math.sin(t * 0.02) * 0.5; // ~314ms holds: deliberate
    easeRestSide(slow, Math.sign(fx) || 1, fx, t);
    if (slow.side === -1) flipped = true;
  }
  assert.ok(flipped, 'a deliberate slow wobble reads as turning and flips through the ease');
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

test('staff ladder: planted at idle with the crown clear of the face, one-hand level trail at a run', () => {
  const idle = staffWield(facingFrame(0, 1), 0, 0, 0, 1);
  const idleW = staffWield(facingFrame(Math.PI, -1), 0, 0, 0, 1);
  const run = staffWield(facingFrame(0, 1), 1, 1, 0, 1);
  // THE PLANT CLEARS THE FACE: the planted stick tips its crown
  // outboard by exactly the plant lean — beside the head, never
  // across it (the lab's W/NW verdict cells) — and the lean mirrors
  // with the eased side, E↔W reflected to numerical exactness.
  assert.ok(
    Math.abs(idle.angle - (-Math.PI / 2 + STAFF_PLANT_LEAN)) < 0.01,
    `idle: a walking stick leaned a breath outboard (${idle.angle.toFixed(3)})`,
  );
  assert.ok(
    Math.abs(idleW.angle - (-Math.PI / 2 - STAFF_PLANT_LEAN)) < 0.01,
    `west plant mirrors the lean (${idleW.angle.toFixed(3)})`,
  );
  assert.ok(Math.abs(idle.dx + idleW.dx) < 1e-9, 'the plant lane mirrors E↔W');
  assert.ok(Math.abs(idle.fore - 1) < 0.01, 'an upright stick is unforeshortened');
  assert.ok(run.angle > -0.4 && run.angle < 0.1, `run east: leveled, crown a touch high (${run.angle.toFixed(2)})`);
  assert.ok(idle.grip > 0.6 && run.grip <= 0.5, 'grip slides to the balance point');
  // The run trail sheds the plant lean entirely — the lifeline owns
  // the leveled carry's diagonal, mirror-true across the vertical
  // (reflection maps angle → π − angle, mod 2π).
  const runS = staffWield(facingFrame(Math.PI / 2, 1), 1, 1, 0, 0);
  const runSm = staffWield(facingFrame(Math.PI / 2, -1), 1, 1, 0, 0);
  const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
  assert.ok(
    Math.abs(wrap(Math.PI - runS.angle) - wrap(runSm.angle)) < 1e-9,
    'the south trail mirrors with the eased side',
  );
});

test('staff run: north foreshortens the trail carry AND keeps the lifeline diagonal', () => {
  const n = staffWield(facingFrame(-Math.PI / 2, 1), 1, 1, 0, 0);
  assert.ok(n.fore > 0.8 && n.fore < 0.93, `a north sprint shortens the staff a restrained shade (${n.fore.toFixed(3)})`);
  // THE LIFELINE (Phase 3): the old pin held this to the camera line —
  // a vertical stick, the lab's own verdict cell. The carry now keeps
  // a readable lateral component at every camera-line heading.
  assert.ok(Math.abs(Math.cos(n.angle)) > 0.3, `a diagonal, never a plumb line (${n.angle.toFixed(2)})`);
});

test('THE LIFELINE: zero at profile (approved angles exact), mirrored by the eased side, continuous', () => {
  assert.equal(lifelineYaw(facingFrame(0, 1)), 0, 'east carries project un-biased');
  assert.equal(lifelineYaw(facingFrame(Math.PI, -1)), Math.PI, 'west too');
  const s = lifelineYaw(facingFrame(Math.PI / 2, 1)) - Math.PI / 2;
  const sm = lifelineYaw(facingFrame(Math.PI / 2, -1)) - Math.PI / 2;
  assert.ok(s > 0.3, 'full bias at the camera line');
  assert.ok(Math.abs(s + sm) < 1e-9, 'the bias mirrors with the side');
  let prev = lifelineYaw(facingFrame(0, 1));
  for (let i = 1; i <= 64; i++) {
    const d = (i / 64) * Math.PI * 2;
    const y = lifelineYaw(facingFrame(d, 1));
    assert.ok(Math.abs(y - prev - (d - ((i - 1) / 64) * Math.PI * 2)) < 0.12, `yaw step ${i}`);
    prev = y;
  }
});

test('THE CROWN NEVER DIGS: the south sprint carry keeps its crown out of the dirt', () => {
  // Toward-camera run: the projected crown direction must not point
  // meaningfully down-screen (the orb-in-the-ground verdict cell).
  const south = staffWield(facingFrame(Math.PI / 2, 1), 1, 1, 0, 0);
  assert.ok(Math.sin(south.angle) < 0.18, `crown near or above screen level (sin ${Math.sin(south.angle).toFixed(2)})`);
  // Away keeps its identity: the north carry's crown rides up-screen.
  const north = staffWield(facingFrame(-Math.PI / 2, 1), 1, 1, 0, 0);
  assert.ok(Math.sin(north.angle) < 0, 'the away carry points up-screen');
});

test('THE AIM IS A GROUND VECTOR: reaches ride the ellipse, directions stay unit', () => {
  const e = projectAim(0);
  const st = projectAim(Math.PI / 2);
  assert.ok(Math.abs(e.px - 1) < 1e-9 && Math.abs(e.py) < 1e-9, 'east reach is full');
  assert.ok(Math.abs(st.px) < 1e-9 && Math.abs(st.py - WIELD_GROUND_K) < 1e-9, 'south reach compresses by the ONE ground K');
  assert.ok(Math.abs(Math.hypot(st.ux, st.uy) - 1) < 1e-9, 'unit direction is unit');
  assert.ok(Math.abs(st.angle - Math.PI / 2) < 1e-9, 'a pure south aim still points down-screen');
  // The strike plane and the aim agree — one projection, one world.
  for (const d of [0.3, 1.1, 2.4, -2.0]) {
    assert.ok(Math.abs(projectAim(d).angle - projectStrike(d).angle) < 1e-9, `aim/strike angle agree at ${d}`);
  }
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

// ---- THE READABLE EIGHT (arms-v3 Phase 4) ----

test('THE MIRROR LAW: greatWield SE<->SW reflect exactly (the audit finding, corrected by proof)', () => {
  // The audit flagged a SE/SW tip asymmetry from a lab capture; the
  // math is mirror-true — the capture caught differing stride phases.
  // Pinned here so any FUTURE real break fails loudly.
  for (const sw of [0, 0.5, -0.5]) {
    for (const [d, m] of [
      [Math.PI / 4, (3 * Math.PI) / 4],
      [Math.PI / 6, (5 * Math.PI) / 6],
      [-Math.PI / 4, (-3 * Math.PI) / 4],
    ] as const) {
      const a = greatWield(facingFrame(d, 1), 1, 1, sw, Math.cos(d));
      const b = greatWield(facingFrame(m, -1), 1, 1, sw, Math.cos(m));
      const err = Math.atan2(
        Math.sin(Math.PI - a.angle - b.angle),
        Math.cos(Math.PI - a.angle - b.angle),
      );
      assert.ok(Math.abs(err) < 1e-9, `angle mirrors at ${d.toFixed(2)} (err ${err})`);
      assert.ok(Math.abs(a.dx + b.dx) < 1e-9, 'lane mirrors');
      assert.ok(Math.abs(a.fore - b.fore) < 1e-9, 'length mirrors');
    }
  }
});

test('THE JOINT CASE: greatWield continuous across every hemisphere crossing, sideS mid-ease included', () => {
  for (const center of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
    for (const sideS of [1, -1, 0.4, 0.1]) {
      let prev: number | null = null;
      for (let i = 0; i <= 400; i++) {
        const d = center - 0.3 + (0.6 * i) / 400;
        const g = greatWield(facingFrame(d, sideS), 1, 1, 0.3, Math.cos(d));
        if (prev !== null) {
          const step = Math.abs(Math.atan2(Math.sin(g.angle - prev), Math.cos(g.angle - prev)));
          assert.ok(step < 0.02, `step ${step.toFixed(4)} at ${d.toFixed(3)} sideS=${sideS}`);
        }
        prev = g.angle;
      }
    }
  }
});

test('THE MIRROR LAW: staffWield reflects across vertical (the audit gap, closed)', () => {
  for (const runK of [0, 1]) {
    const e = staffWield(facingFrame(Math.PI / 4, 1), 1, runK, 0, Math.cos(Math.PI / 4));
    const w = staffWield(facingFrame((3 * Math.PI) / 4, -1), 1, runK, 0, Math.cos((3 * Math.PI) / 4));
    const err = Math.atan2(
      Math.sin(Math.PI - e.angle - w.angle),
      Math.cos(Math.PI - e.angle - w.angle),
    );
    assert.ok(Math.abs(err) < 1e-9, `staff angle mirrors at runK ${runK}`);
    assert.ok(Math.abs(e.dx + w.dx) < 1e-9, 'plant lane mirrors');
    assert.ok(Math.abs(e.fwd + w.fwd) < 1e-9, 'forward lean mirrors');
  }
});

test('THE FLIP EARNS ITS HYSTERESIS: bandFlag holds through the dead zone, both directions', () => {
  const mem = {};
  assert.equal(bandFlag(mem, 'k', 0.5, 0.42, 0.28), true, 'above on: ON');
  assert.equal(bandFlag(mem, 'k', 0.35, 0.42, 0.28), true, 'dead zone from above: HOLDS on');
  assert.equal(bandFlag(mem, 'k', 0.2, 0.42, 0.28), false, 'below off: OFF');
  assert.equal(bandFlag(mem, 'k', 0.35, 0.42, 0.28), false, 'dead zone from below: HOLDS off');
  assert.equal(bandFlag(undefined, 'k', 0.36, 0.42, 0.28), true, 'stateless: the midpoint threshold');
  assert.equal(bandFlag(undefined, 'k', 0.34, 0.42, 0.28), false, 'stateless below midpoint');
});

test('the layer bands leave every cardinal facing outside the dead zone', () => {
  // Settled cardinal headings must resolve exactly as the old raw
  // thresholds did — hysteresis changes rotation, never rest. The
  // bands under test are the ones rig.ts feeds.
  const CARDINAL_FY = [0, 0.7071067811865476, -0.7071067811865476, 1, -1];
  const BANDS: Array<[number, number, (fy: number) => number, (fy: number) => boolean]> = [
    [0.42, 0.28, (fy) => -fy, (fy) => fy < -0.35], // awayDeep
    [0.14, 0.02, (fy) => fy, (fy) => fy > 0.08], // fwdShoulder
    [0.14, 0.02, (fy) => -fy, (fy) => fy < -0.08], // awayShoulder
    [0.22, 0.1, (fy) => -fy, (fy) => fy < -0.16], // slingFront
  ];
  for (const [on, off, v, legacy] of BANDS) {
    for (const fy of CARDINAL_FY) {
      assert.ok(v(fy) >= on || v(fy) <= off, `fy ${fy} sits outside (${off}, ${on})`);
      assert.equal(bandFlag(undefined, 'x', v(fy), on, off), legacy(fy), `legacy agreement at fy ${fy}`);
    }
  }
  for (const pk of [0, 0.7071067811865476, 1]) {
    assert.ok(pk >= 0.68 || pk <= 0.56, `profileK ${pk} outside the belt band`);
    assert.equal(bandFlag(undefined, 'x', pk, 0.68, 0.56), pk > 0.62, `belt legacy agreement at ${pk}`);
  }
});

test('THE SILHOUETTE PEEK: zero on the camera half and at profile, alive through the away diagonals', () => {
  assert.equal(awayPeekK(0.5), 0, 'camera half untouched');
  assert.equal(awayPeekK(0), 0, 'profile untouched');
  assert.ok(awayPeekK(-0.7071) > 0.9, 'full peek at the away diagonal');
  assert.ok(awayPeekK(-1) === 1, 'and behind');
  let prev = awayPeekK(0.2);
  for (let i = 1; i <= 60; i++) {
    const fy = 0.2 - (1.2 * i) / 60;
    const k = awayPeekK(fy);
    // Smoothstep over a 0.3-wide band peaks at slope 5/unit — a 0.02
    // sweep step can honestly move 0.1; anything past that is a jump.
    assert.ok(Math.abs(k - prev) < 0.12, `peek continuous at fy ${fy.toFixed(2)}`);
    prev = k;
  }
});
