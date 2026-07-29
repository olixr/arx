/**
 * THE SHIELD LAWS, pinned. The plane's carriage is pure geometry
 * (solveShield takes numbers and returns numbers), so the promises it
 * makes to the player are testable: the shield stands upright, it
 * stays in front of the body, it turns honestly with the facing, the
 * fist grips it from BEHIND, and nothing about it ever pops.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHIELD_STYLES, shieldStyle, solveShield, type ShieldStyle } from './shields.js';

const S = 100;

/** A body standing still, facing `dir`, shield in hand. */
function solve(st: ShieldStyle, dir: number, over: Partial<Record<string, number>> = {}) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return solveShield(st, {
    x: 0,
    hipY: 0,
    shoulderY: -40,
    s: S,
    wS: 1,
    fx,
    fy,
    sideS: Math.sign(fx) || 1,
    restSettle: 1,
    swing: 0,
    runF: 0,
    poleX: 0,
    poleY: 0,
    poleStrength: 0,
    crouch: 0,
    sling: 0,
    melee: -1,
    poseT: 0,
    thrust: 0,
    nowMs: 0,
    ...over,
  });
}

const KITE = SHIELD_STYLES.oak_kiteshield!;
const TOWER = SHIELD_STYLES.tower_shield!;

test('THE YAW LAW: the face turns with the body — open to the camera, edge-on at profile, back-on turned away', () => {
  // Facing the camera the face is square to us; at profile it is edge-on;
  // turned away we are reading the shield's BACK.
  const south = solve(KITE, Math.PI / 2);
  const east = solve(KITE, 0);
  const north = solve(KITE, -Math.PI / 2);
  assert.ok(south.open > 0.85, `face-on should be open, got ${south.open}`);
  assert.ok(!south.seeBack, 'facing the camera shows the face');
  assert.ok(east.open < 0.45, `profile should be near edge-on, got ${east.open}`);
  assert.ok(north.open > 0.85, `back-on should be open, got ${north.open}`);
  assert.ok(north.seeBack, 'facing away shows the shield’s back');
});

test('THE DEPTH LAW: the plane rides the camera side of the body, and the sling inverts it', () => {
  assert.ok(solve(KITE, Math.PI / 2).front, 'held toward the camera, the shield paints in front');
  assert.ok(!solve(KITE, -Math.PI / 2).front, 'held away, it paints behind the body');
  // Slung on the back the whole relation flips: walking away, the
  // shield is the nearest thing on the body and shows its full face.
  const slungAway = solve(KITE, -Math.PI / 2, { sling: 1 });
  assert.ok(slungAway.front, 'a slung shield leads when the bearer walks away');
  assert.ok(!slungAway.seeBack, 'and it shows its FACE, not its straps');
});

test('the shield stays in front of the body — and never drifts onto its back', () => {
  for (let i = 0; i < 32; i++) {
    const dir = (i / 32) * Math.PI * 2;
    const fx = Math.cos(dir);
    const fy = Math.sin(dir);
    const fr = solve(KITE, dir);
    const fwd = fr.cx * fx + (fr.cy - -0.14 * S) * fy;
    if (fy >= 0) {
      // Facing the camera — the half the player actually studies — the
      // plane is unambiguously ahead of the chest.
      assert.ok(fwd > 0, `dir ${dir.toFixed(2)}: shield fell behind the chest (${fwd.toFixed(1)})`);
    } else {
      // Turned away, the carriage deliberately slides the shield onto
      // the off flank and a touch toward the camera (the off arm is the
      // near arm — the rig's own law), which reads as a hair behind the
      // chest PLANE. That is the trade that keeps a shield visible from
      // behind; what it must never do is ride around onto the back.
      assert.ok(
        fwd > -0.08 * S,
        `dir ${dir.toFixed(2)}: shield slid onto the back (${fwd.toFixed(1)})`,
      );
    }
    // Facing the viewer (or straight away) — the sword-and-board
    // silhouette the player reads most — the shield holds the off half
    // of the body and never crosses to the weapon hand. Off the
    // vertical, "across the body" turns into the screen's depth and
    // the forward reach owns the horizontal offset instead, so the
    // check only means anything here.
    if (Math.abs(fy) > 0.85) {
      const oside = -(Math.sign(fx) || 1);
      assert.ok(
        fr.cx * oside > -0.02 * S,
        `dir ${dir.toFixed(2)}: shield crossed to the weapon side`,
      );
    }
  }
});

test('the plane stands UPRIGHT — it never rolls onto the forearm', () => {
  for (let i = 0; i < 32; i++) {
    const dir = (i / 32) * Math.PI * 2;
    for (const over of [{}, { restSettle: 0 }, { runF: 1, poleStrength: 1, swing: 1 }]) {
      const fr = solve(TOWER, dir, over);
      assert.ok(
        Math.abs(fr.tilt) < 0.42,
        `dir ${dir.toFixed(2)}: shield rolled to ${fr.tilt.toFixed(2)} rad`,
      );
    }
  }
});

test('the fist grips from BEHIND the plane — never through its face', () => {
  for (let i = 0; i < 24; i++) {
    const dir = (i / 24) * Math.PI * 2;
    for (const st of [KITE, TOWER, SHIELD_STYLES.spiked_buckler!]) {
      const fr = solve(st, dir);
      // The grip must sit on the bearer's side of the plane: its offset
      // from the center, projected on the face normal, points backward.
      const nx = fr.sgnP * Math.sin(fr.theta);
      const ny = 0.52 * Math.cos(fr.theta);
      const along = (fr.gripX - fr.cx) * nx + (fr.gripY - fr.cy) * ny;
      assert.ok(along < 0, `${st.shape} at ${dir.toFixed(2)}: hand is in front of the boards`);
    }
  }
});

test('nothing pops: the carriage is continuous through a full turn', () => {
  // The one class of bug this rig keeps re-learning — a mirrored anchor
  // that teleports as the facing crosses an axis. Sweeping the facing in
  // fine steps (with the side held, as the rig's own eased flip does)
  // must move the plane smoothly.
  for (const st of [KITE, TOWER]) {
    let prev = solve(st, -Math.PI / 2 + 0.001, { sideS: 1 });
    for (let i = 1; i <= 200; i++) {
      // Sweep the camera-facing half, where sideS is stable at +1.
      const dir = -Math.PI / 2 + 0.001 + (i / 200) * (Math.PI - 0.002);
      const fr = solve(st, dir, { sideS: 1 });
      const move = Math.hypot(fr.cx - prev.cx, fr.cy - prev.cy);
      assert.ok(move < S * 0.05, `${st.shape}: carriage jumped ${move.toFixed(2)}px at ${dir}`);
      assert.ok(
        Math.abs(fr.theta - prev.theta) < 0.15,
        `${st.shape}: yaw jumped at ${dir.toFixed(2)}`,
      );
      prev = fr;
    }
  }
});

test('the sling is a blend, not a switch — every step of it is small', () => {
  let prev = solve(KITE, Math.PI / 2, { sling: 0 });
  for (let i = 1; i <= 50; i++) {
    const fr = solve(KITE, Math.PI / 2, { sling: i / 50 });
    assert.ok(
      Math.hypot(fr.cx - prev.cx, fr.cy - prev.cy) < S * 0.06,
      `the shield teleported onto the back at sling ${i / 50}`,
    );
    prev = fr;
  }
});

test('an unknown shield still resolves to a real shield in a coherent dialect', () => {
  const wood = shieldStyle('nobody_home', 'kite', '#8a5f31', '#4a3524');
  assert.equal(wood.material, 'wood', 'a warm face is built from staves');
  assert.equal(wood.shape, 'kite');
  const steel = shieldStyle('nobody_home_2', 'tower', '#8d9299', '#6a6f7d');
  assert.equal(steel.material, 'steel', 'a cool face is forged');
  // A known id always wins over the derived fallback.
  assert.equal(shieldStyle('tower_shield', 'tower', '#000000', '#000000'), TOWER);
});
