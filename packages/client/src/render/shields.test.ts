/**
 * THE SHIELD LAWS, pinned. The plane's carriage is pure geometry
 * (solveShield takes numbers and returns numbers), so the promises it
 * makes to the player are testable: the shield stands upright, it
 * stays in front of the body, it turns honestly with the facing, the
 * fist grips it from BEHIND, and nothing about it ever pops.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHIELD_STYLES,
  drawShieldAt,
  shieldStyle,
  solveShield,
  type ShieldStyle,
} from './shields.js';

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
const AEGIS = SHIELD_STYLES.sunforged_aegis!;

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

test('THE GUARD REACHES THE RUNE FACE: the frame carries the guard channel', () => {
  // "The offhand's rhythm: a sigil that sits quiet and FLARES ON GUARD"
  // (wornLight.ts). drawArxFace lerps its alpha up by the frame's guard,
  // so the channel exists only if solveShield threads it through.
  const rest = solve(KITE, Math.PI / 2, { restSettle: 1 });
  const guard = solve(KITE, Math.PI / 2, { restSettle: 0 });
  assert.equal(rest.guard, 0, 'settled carry has no flare');
  assert.equal(guard.guard, 1, 'the raised shield flares at full');
  // Slung, nobody is guarding with it: the flare fades with the swing.
  const slung = solve(KITE, Math.PI / 2, { restSettle: 0, sling: 1 });
  assert.equal(slung.guard, 0, 'a shield on the back cannot be a guard');
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
    for (const st of [KITE, TOWER, AEGIS, SHIELD_STYLES.spiked_buckler!]) {
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
  for (const st of [KITE, TOWER, AEGIS]) {
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

test('THE SIGNATURE LAW: every authored shield paints itself, and no two share a look', () => {
  const ids = Object.keys(SHIELD_STYLES);
  assert.ok(ids.length > 0);
  const sigs = new Set<string>();
  const looks = new Set<string>();
  for (const id of ids) {
    const st = SHIELD_STYLES[id]!;
    assert.ok(st.sig, `${id} has no bespoke face painter — it would fall back to the generic dialect`);
    assert.ok(!sigs.has(st.sig!), `${id} reuses the signature "${st.sig}"`);
    sigs.add(st.sig!);
    // Shape + material + face colour together are the across-the-room
    // read. Two shields may share any one of them, never all three.
    const look = `${st.shape}/${st.material}/${st.face}`;
    assert.ok(!looks.has(look), `${id} is indistinguishable from another shield (${look})`);
    looks.add(look);
    assert.ok(st.tier && st.tier > 0, `${id} sits on no rung of the ladder`);
  }
});

test('THE LADDER: a higher rung is never a plainer shield', () => {
  // Rungs buy fittings. Whatever else changes, detail must not fall as
  // the tier climbs — a top-tier shield that wears less than a starter
  // one is the exact failure this roster is meant to avoid.
  //
  // AMENDED with the shield wave: the old form compared ADJACENT
  // entries of the tier-sorted list, which inside a tier is just table
  // insertion order — an accident, not a law (two same-tier shields
  // may honestly wear different counts: the Everwood's minimalism is a
  // design, not a shortfall). The law the roster actually owes is the
  // tier floor: no tier's PLAINEST shield may wear less than the
  // plainest shield of any tier below it.
  const fittings = (s: ShieldStyle): number =>
    (s.studs ? 1 : 0) +
    (s.boss ? 1 : 0) +
    (s.spikes ? 1 : 0) +
    (s.device && s.device !== 'none' ? 1 : 0) +
    (s.faceAlt ? 1 : 0) +
    (s.field && s.field !== 'plain' ? 1 : 0);
  const floor = new Map<number, number>();
  for (const s of Object.values(SHIELD_STYLES)) {
    const t = s.tier ?? 0;
    floor.set(t, Math.min(floor.get(t) ?? Infinity, fittings(s)));
  }
  const tiers = [...floor.keys()].sort((a, b) => a - b);
  for (let i = 1; i < tiers.length; i++) {
    assert.ok(
      floor.get(tiers[i]!)! >= floor.get(tiers[i - 1]!)!,
      `tier ${tiers[i]}'s plainest shield (${floor.get(tiers[i]!)}) wears less than tier ${
        tiers[i - 1]
      }'s (${floor.get(tiers[i - 1]!)})`,
    );
  }
});

test('THE SLAB PROPORTION: a shield is a board, never a block', () => {
  // Thickness is authored in body units while the faces are not, so it
  // is easy to leave a small shield nearly as thick as it is tall —
  // which paints a heavy dark ring standing behind its own face. A
  // buckler is legitimately chunkier than a pavise; what no shield may
  // be is a block, and this is the line between the two.
  for (const st of Object.values(SHIELD_STYLES)) {
    const fr = solve(st, Math.PI / 2);
    assert.ok(
      fr.depth < fr.hh * 0.3,
      `${st.shape}: shell is ${(fr.depth / fr.hh).toFixed(2)}× its half-height`,
    );
  }
});

test('THE NEAR-ARM LAW: at a dead profile the shield still paints in front', () => {
  // fy is zero at profile, so a strict fy > 0 test dropped the plane
  // behind the torso — and an edge-on plane behind a body is a shield
  // the player cannot see at two of the eight facings.
  for (const st of [KITE, TOWER, AEGIS]) {
    assert.ok(solve(st, 0).front, `${st.shape} vanished behind the body facing east`);
    assert.ok(solve(st, Math.PI).front, `${st.shape} vanished behind the body facing west`);
  }
});

test('THE UNIT-SPACE LAW: no stroke is wider than the shield it rings', () => {
  // The rig paints in screen PIXELS; the inventory icons paint in a
  // UNIT SQUARE (renderIcon scales the whole context by the icon's
  // size). So any absolute pixel floor on a lineWidth — a perfectly
  // reasonable `Math.max(1.3, …)` — becomes, in the icon, a stroke
  // wider than the entire icon, and every shield disappears under its
  // own outline. Widths in this file must be in the shield's units.
  const widths: number[] = [];
  const ctx = new Proxy(
    { lineWidth: 1 },
    {
      get(t, p: string) {
        if (p in t) return t[p as 'lineWidth'];
        return () => undefined;
      },
      set(t, p: string, v) {
        if (p === 'lineWidth') widths.push(v as number);
        (t as Record<string, unknown>)[p] = v;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  const SIZE = 0.42; // exactly what offhandIconPainter asks for
  for (const st of Object.values(SHIELD_STYLES)) {
    for (const theta of [0, 0.42, 1.2, Math.PI / 2, 2.4, Math.PI]) {
      drawShieldAt(ctx, st, { cx: 0, cy: 0, size: SIZE, theta, tilt: -0.1, oside: 1 });
    }
  }
  assert.ok(widths.length > 0, 'nothing stroked — the outline pass went missing');
  for (const w of widths) {
    assert.ok(
      w > 0 && w < SIZE,
      `a stroke of ${w} in a shield of half-height ${SIZE} would swallow the icon`,
    );
  }
});

test('THE GREATSHIELD CLASS: no two top-rung shields share a silhouette', () => {
  // A tank's shield is the first thing anyone sees of them. Above the
  // pavise, a new rung must be a new OUTLINE — three top-tier walls
  // that differ only in paint are three copies of the same shield.
  const top = Object.entries(SHIELD_STYLES).filter(([, s]) => (s.tier ?? 0) >= 3);
  assert.ok(top.length >= 4, 'the ladder lost its top end');
  const shapes = new Set<string>();
  for (const [id, s] of top) {
    assert.ok(!shapes.has(s.shape), `${id} reuses the silhouette "${s.shape}"`);
    shapes.add(s.shape);
  }
});

test('a greatshield fits the body it is carried on', () => {
  // The class grows one rung at a time, and the ceiling is the rig
  // itself: a shield that clears the head or drags on the ground stops
  // being armor and starts being scenery. (The ground sits 0.414 s
  // below the hip; the shoulder line 0.40 s above it.)
  for (const id of [
    'frostplate_greatshield',
    'bulwark_bastion',
    'sunforged_aegis',
    'bonespur_ward',
    'dreadforge_thornwall',
  ]) {
    const st = SHIELD_STYLES[id]!;
    const fr = solve(st, Math.PI / 2);
    assert.ok(fr.hh * 2 > S * 0.55, `${id} is not a greatshield — it is ${(fr.hh * 2 / S).toFixed(2)} s tall`);
    // The thornwall's heel spike overshoots its own half-height (the
    // outline runs to t = 1.14), so the ground check takes the true
    // silhouette reach, not just hh.
    assert.ok(fr.cy + fr.hh * 1.15 < S * 0.414, `${id} drags its heel on the ground`);
    assert.ok(fr.cy - fr.hh > -S * 0.52, `${id} stands taller than its bearer's head`);
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
