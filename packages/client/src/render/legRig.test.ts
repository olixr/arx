import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegRig, solveLimb, type LegRigConfig } from './legs.js';

/**
 * Universal-rig laws, probed on a wolf-like quadruped. The biped case
 * is pinned separately by legSolver.test.ts (LegSolver is a 2-leg
 * config of this same rig).
 */
const QUAD: LegRigConfig = {
  legs: [
    { fwd: 0.28, side: -0.12, group: 0 }, // front-left
    { fwd: 0.28, side: 0.12, group: 1 }, // front-right
    { fwd: -0.28, side: -0.12, group: 1 }, // back-left
    { fwd: -0.28, side: 0.12, group: 0 }, // back-right
  ],
  legLen: 0.34,
  rise: 0.29,
  liftAmp: 0.09,
  runSpeed: 4.6,
  turnRate: 7,
};

const DT = 1 / 60;

function makeRig(): LegRig {
  return new LegRig(QUAD);
}

test('quadruped: feet track their body-frame homes at full run', () => {
  const rig = makeRig();
  let maxD = 0;
  for (let t = 0; t < 3; t += DT) {
    const pose = rig.update(4.6 * t, 0, 0, DT);
    pose.feet.forEach((f, i) => {
      const home = QUAD.legs[i]!;
      const d = Math.hypot(f.x - (4.6 * t + home.fwd), f.y - home.side);
      maxD = Math.max(maxD, d);
    });
  }
  assert.ok(maxD <= 0.75, `feet drifted ${maxD.toFixed(3)} tiles from home`);
});

test('quadruped trot: airborne legs stay within one diagonal pair', () => {
  const rig = makeRig();
  let mixed = 0;
  let frames = 0;
  for (let t = 0; t < 3; t += DT) {
    const pose = rig.update(4.6 * t, 0, 0, DT);
    if (t < 0.5) continue; // warm-up
    const airGroups = new Set(
      pose.feet
        .map((f, i) => (f.lift > 0 ? QUAD.legs[i]!.group : -1))
        .filter((g) => g !== -1),
    );
    if (airGroups.size > 1) mixed++;
    frames++;
  }
  assert.ok(mixed <= frames * 0.05, `mixed-group air ${mixed}/${frames} frames`);
});

test('quadruped trot: diagonal pairs actually swing together', () => {
  const rig = makeRig();
  let paired = 0;
  let solo = 0;
  for (let t = 0; t < 3; t += DT) {
    const pose = rig.update(4.6 * t, 0, 0, DT);
    if (t < 0.5) continue;
    const air = pose.feet.map((f) => f.lift > 0);
    const count = air.filter(Boolean).length;
    if (count === 2) paired++;
    else if (count === 1) solo++;
  }
  assert.ok(
    paired > solo,
    `pairs should dominate: paired ${paired} vs solo ${solo} frames`,
  );
});

test('oriented homes rotate with the facing', () => {
  const rig = makeRig();
  // Settle facing +y (down-screen).
  let pose = rig.update(0, 0, Math.PI / 2, DT);
  for (let t = 0; t < 2; t += DT) pose = rig.update(0, 0, Math.PI / 2, DT);
  // Front legs (fwd > 0) must now sit at +y, not +x.
  assert.ok(pose.feet[0]!.y > 0.15, `front foot y=${pose.feet[0]!.y.toFixed(3)}`);
  assert.ok(Math.abs(pose.feet[0]!.x) < 0.2, 'front foot stays near the body axis');
});

test('a pivot in place re-plants an oriented rig — homes swing, feet follow', () => {
  const rig = makeRig();
  for (let t = 0; t < 1.5; t += DT) rig.update(0, 0, 0, DT);
  let lifts = 0;
  let airborne = false;
  let last: ReturnType<LegRig['update']> | null = null;
  for (let t = 0; t < 2; t += DT) {
    last = rig.update(0, 0, Math.PI, DT);
    const air = last.feet.some((f) => f.lift > 0);
    if (air && !airborne) lifts++;
    airborne = air;
  }
  assert.ok(lifts >= 2, `pivot only produced ${lifts} step bursts`);
  // And the feet must end up in the NEW frame: front legs now at -x.
  assert.ok(last!.feet[0]!.x < -0.1, 'front foot crossed to the new facing');
});

test('feet settle on their homes after stopping and never float', () => {
  const rig = makeRig();
  for (let t = 0; t < 2; t += DT) rig.update(4.6 * t, 0, 0, DT);
  let pose = rig.update(9.2, 0, 0, DT);
  for (let t = 0; t < 1; t += DT) pose = rig.update(9.2, 0, 0, DT);
  pose.feet.forEach((f, i) => {
    const home = QUAD.legs[i]!;
    const d = Math.hypot(f.x - (9.2 + home.fwd), f.y - home.side);
    assert.ok(d < 0.25, `foot ${i} rested ${d.toFixed(3)} from home`);
    assert.equal(f.lift, 0, 'feet planted at rest');
  });
});

test('teleports snap every foot instead of stretching across the map', () => {
  const rig = makeRig();
  for (let t = 0; t < 1; t += DT) rig.update(t, 0, 0, DT);
  const pose = rig.update(500, 500, 0, DT);
  for (const f of pose.feet) {
    const d = Math.hypot(f.x - 500, f.y - 500);
    assert.ok(d <= 0.6, `post-teleport foot at ${d.toFixed(3)}`);
  }
});

test('solveLimb: joint lands on the preferred side and reach is clamped', () => {
  // Target within reach, preference +x → joint east of the chord.
  const bent = solveLimb(0, 0, 0, 0.5, 0.3, 1.1, 1, 0);
  assert.ok(bent.kx > 0.01, `joint x=${bent.kx.toFixed(3)} not on +x side`);
  const bentL = solveLimb(0, 0, 0, 0.5, 0.3, 1.1, -1, 0);
  assert.ok(bentL.kx < -0.01, 'preference mirrors the joint');
  // Target beyond reach → end clamps to 2·L·stretch.
  const far = solveLimb(0, 0, 10, 0, 0.3, 1.1, 0, 1);
  assert.ok(Math.abs(Math.hypot(far.ex, far.ey) - 0.66) < 1e-9, 'reach clamp');
});
