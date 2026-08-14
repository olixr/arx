import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STOW_HANDOFF,
  restBack,
  restBlade,
  restShield,
  sheathePhases,
  stowBack,
  stowBlade,
} from './sheath.js';

test('the handoff can never pop: grab lands exactly at the anchor', () => {
  // At t=0 nothing has moved; at the handoff the hand is fully AT the
  // anchor (grabK 1) while the return has not started (homeK 0); at
  // t=1 the hand is fully home. Both curves are the transition's ends.
  const start = sheathePhases(0);
  assert.equal(start.grabK, 0);
  assert.equal(start.homeK, 0);
  const mid = sheathePhases(STOW_HANDOFF);
  assert.equal(mid.grabK, 1, 'the weapon must be at the anchor when it changes owners');
  assert.equal(mid.homeK, 0, 'the hand cannot leave before the weapon is seated');
  const end = sheathePhases(1);
  assert.equal(end.grabK, 1);
  assert.equal(end.homeK, 1);
});

test('both phases are monotone — no mid-stow jitter', () => {
  let prevGrab = -1;
  let prevHome = -1;
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const p = sheathePhases(t);
    assert.ok(p.grabK >= prevGrab - 1e-9, `grabK regressed at t=${t}`);
    assert.ok(p.homeK >= prevHome - 1e-9, `homeK regressed at t=${t}`);
    prevGrab = p.grabK;
    prevHome = p.homeK;
  }
});

test('the war belt: main and off blades ride opposite hips', () => {
  for (const side of [-1, 1]) {
    const main = stowBlade('main', side, side * 0.9);
    const off = stowBlade('off', side, side * 0.9);
    assert.ok(main.dx * off.dx < 0, 'the two scabbards must never share a hip');
    // The main scabbard hangs on the NEAR side: opposite the facing
    // sign (the screen-side depth law), so it paints over the torso.
    assert.ok(main.dx * side < 0, 'main blade belongs on the near hip');
  }
});

test('tip-down law: a stowed blade never points its tip above the belt', () => {
  // angle in (0, π) means the tip is below the grip on screen (+y is
  // down) — standing or seated, raked or hanging, the steel points at
  // the ground, never at the wearer's ribs.
  for (const hand of ['main', 'off'] as const) {
    for (let rake = -1; rake <= 1.0001; rake += 0.125) {
      for (const sit of [0, 0.35, 0.7, 1]) {
        const spot = stowBlade(hand, Math.sign(rake) || 1, rake, sit);
        assert.ok(
          spot.angle > 0 && spot.angle < Math.PI,
          `tip must stay down: hand=${hand} rake=${rake} sit=${sit} angle=${spot.angle}`,
        );
      }
    }
  }
});

test('mirror law: turning around mirrors the scabbard exactly', () => {
  for (const hand of ['main', 'off'] as const) {
    for (const rake of [0.3, 0.62, 1]) {
      const r = stowBlade(hand, 1, rake);
      const l = stowBlade(hand, -1, -rake);
      assert.ok(Math.abs(l.dx + r.dx) < 1e-9, 'hip offset mirrors');
      assert.ok(Math.abs(l.angle - (Math.PI - r.angle)) < 1e-9, 'rake mirrors around vertical');
    }
  }
});

test('seated the blade lies back toward the ground line', () => {
  const stand = stowBlade('main', 1, 0.9, 0);
  const seated = stowBlade('main', 1, 0.9, 1);
  // Closer to horizontal = angle further from π/2.
  assert.ok(
    Math.abs(seated.angle - Math.PI / 2) > Math.abs(stand.angle - Math.PI / 2) + 0.3,
    'the seated scabbard must visibly lie down',
  );
});

test('every stow channel is continuous through the side flip', () => {
  // The smoothed side passes through 0 turning north/south; nothing
  // may jump as it does (a Math.sign in any channel IS the snap bug).
  const probe = (f: (side: number) => number): void => {
    let prev = f(-0.4);
    for (let side = -0.4; side <= 0.4001; side += 0.02) {
      const v = f(side);
      assert.ok(Math.abs(v - prev) < 0.2, `discontinuity near side=${side.toFixed(2)}`);
      prev = v;
    }
  };
  probe((sd) => stowBlade('main', sd, sd).dx);
  probe((sd) => stowBlade('main', sd, sd).angle);
  probe((sd) => stowBlade('off', sd, sd, 0.5).angle);
  probe((sd) => stowBack('staff', sd).angle);
  probe((sd) => stowBack('staff', sd).dx);
  probe((sd) => stowBack('bow', sd).dx);
  // The bow ANGLE is exempt: the mirror law demands a reflection at
  // the side flip (a mirrored object cannot rotate continuously into
  // its own reflection) — the swap happens on a near-vertical bow
  // where the silhouette change is smallest.
});

test('back slings hang across the back, tops up', () => {
  for (const kind of ['bow', 'staff'] as const) {
    for (const side of [-1, -0.3, 0.3, 1]) {
      const spot = stowBack(kind, side);
      // Painter angles stay in the upper half-plane: the crown (or the
      // upper limb) rides up behind the shoulder, never inverted.
      assert.ok(spot.angle > -Math.PI && spot.angle < 0, 'the sling leans, never inverts');
      assert.ok(spot.dy > 0, 'anchored below the shoulder line, on the torso');
    }
  }
});

test('the bow mirror law: left-lean is the reflection of right-lean', () => {
  for (const side of [0.3, 0.7, 1]) {
    const r = stowBack('bow', side);
    const l = stowBack('bow', -side);
    // Reflection across vertical: angles sum to −π (mod 2π) — the
    // belly keeps facing outward on BOTH sides, the string keeps
    // facing the back. A π rotation would sum to 0 and put the
    // string across the chest.
    const sum = r.angle + l.angle;
    assert.ok(Math.abs(sum + Math.PI) < 1e-9, `mirror broken at side=${side}: sum=${sum}`);
    assert.ok(Math.abs(l.dx + r.dx) < 1e-9, 'anchor tweak mirrors');
  }
});

// ------------------------------------------------- the second grip

test('THE CROSS: the waiting sling leans opposite, harder, one rank down', () => {
  for (const kind of ['bow', 'staff', 'great'] as const) {
    for (const side of [-1, -0.5, 0.5, 1]) {
      const active = stowBack(kind, side);
      const rest = restBack(kind, side);
      assert.ok(rest.dx * active.dx < 0, 'anchored past the OPPOSITE shoulder');
      assert.ok(Math.abs(rest.dx) > Math.abs(active.dx), 'and further out than the live sling');
      assert.ok(rest.dy > active.dy + 0.05, 'the waiting rank rides visibly lower');
      if (kind !== 'bow') {
        // Staff and great lean as tilt off their own vertical: the
        // waiting tilt must CROSS the active one, and lean harder —
        // a rest sling that only mirrors a big active blade vanishes
        // inside its silhouette (the lab receipt behind the law).
        const vertical = kind === 'staff' ? -Math.PI / 2 : Math.PI / 2;
        const activeTilt = active.angle - vertical;
        const restTilt = rest.angle - vertical;
        assert.ok(restTilt * activeTilt < 0, 'the two long axes cross');
        assert.ok(Math.abs(restTilt) > Math.abs(activeTilt), 'the waiting lean is the harder one');
      } else {
        // The bow keeps the mirror STRUCTURE: its rest angle lives in
        // the reflected family (same branch stowBack takes for the
        // opposite side), so the belly still faces outward.
        const mirrored = stowBack('bow', -side);
        const sameBranch =
          (rest.angle <= 0 && rest.angle > -Math.PI / 2 && mirrored.angle <= 0 && mirrored.angle > -Math.PI / 2) ||
          (rest.angle <= -Math.PI / 2 && mirrored.angle <= -Math.PI / 2);
        assert.ok(sameBranch, 'the waiting bow is a reflection, never a rotation');
      }
    }
  }
});

test('THE SECOND ROW: waiting blades hang lower, wider, nearer vertical', () => {
  for (const hand of ['main', 'off'] as const) {
    for (const side of [-1, 1]) {
      const live = stowBlade(hand, side, side * 0.9);
      const rest = restBlade(hand, side, side * 0.9);
      assert.ok(rest.dy > live.dy + 0.05, 'the waiting row hangs below the live one');
      assert.ok(Math.abs(rest.dx) > Math.abs(live.dx), 'and a touch wider on the belt');
      assert.ok(rest.dx * live.dx > 0, 'without ever crossing to the other hip');
      assert.ok(
        Math.abs(rest.angle - Math.PI / 2) < Math.abs(live.angle - Math.PI / 2),
        'relaxing toward the vertical hang — a quiet row, not a second war belt',
      );
    }
  }
});

test('the second row keeps the tip-down law', () => {
  for (const hand of ['main', 'off'] as const) {
    for (let rake = -1; rake <= 1.0001; rake += 0.25) {
      for (const sit of [0, 0.5, 1]) {
        const spot = restBlade(hand, Math.sign(rake) || 1, rake, sit);
        assert.ok(
          spot.angle > 0 && spot.angle < Math.PI,
          `waiting steel points down too: hand=${hand} rake=${rake} sit=${sit}`,
        );
      }
    }
  }
});

test('the rest channels stay continuous through the side flip', () => {
  const probe = (f: (side: number) => number): void => {
    let prev = f(-0.4);
    for (let side = -0.4; side <= 0.4001; side += 0.02) {
      const v = f(side);
      assert.ok(Math.abs(v - prev) < 0.2, `discontinuity near side=${side.toFixed(2)}`);
      prev = v;
    }
  };
  probe((sd) => restBlade('main', sd, sd).dx);
  probe((sd) => restBlade('main', sd, sd).angle);
  probe((sd) => restBlade('off', sd, sd, 0.5).angle);
  probe((sd) => restBack('staff', sd).dx);
  probe((sd) => restBack('staff', sd).angle);
  probe((sd) => restBack('bow', sd).dx);
  probe((sd) => restShield(sd).dx);
  probe((sd) => restShield(sd).tilt);
  // restBack('bow').angle inherits the mirror-law exemption above.
});

test('THE SLUNG WALL: the waiting shield hangs square below the sling line', () => {
  for (const side of [-1, -0.4, 0.4, 1]) {
    const perch = restShield(side);
    assert.ok(perch.dy > stowBack('bow', side).dy, 'deepest rank: everything paints over the wall');
    const mirror = restShield(-side);
    assert.ok(Math.abs(mirror.dx + perch.dx) < 1e-9, 'the perch mirrors with the body');
    assert.ok(Math.abs(mirror.tilt + perch.tilt) < 1e-9, 'and so does its lean');
  }
});
