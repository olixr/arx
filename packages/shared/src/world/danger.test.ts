import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DANGER_BAND, DANGER_MAX, HAVEN_FADE, dangerAt, type DangerAnchor } from './danger.js';

const SEED = 1337;
const ANCHORS: DangerAnchor[] = [
  { x: 48, y: 48, safeR: 96 },
  { x: 132, y: 20, safeR: 40 },
];

function baseTier(tx: number, ty: number): number {
  let edge = Infinity;
  for (const a of ANCHORS) {
    edge = Math.min(edge, Math.hypot(tx - a.x, ty - a.y) - a.safeR);
  }
  if (edge <= 0) return 0;
  return Math.min(DANGER_MAX, 1 + Math.floor(edge / DANGER_BAND));
}

test('settled ground is tier 0 by construction', () => {
  for (let i = 0; i < 500; i++) {
    const ang = (i / 500) * Math.PI * 2;
    const r = (i % 10) * 9.5; // 0..85.5, all inside safeR 96
    const tx = Math.round(48 + Math.cos(ang) * r);
    const ty = Math.round(48 + Math.sin(ang) * r);
    assert.equal(dangerAt(SEED, tx, ty, ANCHORS), 0, `tile ${tx},${ty}`);
  }
});

test('the jitter bends borders by at most one tier and never to 0', () => {
  for (let i = 0; i < 4000; i++) {
    const tx = ((i * 137) % 2400) - 1200;
    const ty = ((i * 251) % 2400) - 1200;
    const base = baseTier(tx, ty);
    const tier = dangerAt(SEED, tx, ty, ANCHORS);
    if (base === 0) {
      assert.equal(tier, 0);
    } else {
      assert.ok(tier >= 1 && tier <= DANGER_MAX, `tier ${tier} out of range`);
      assert.ok(Math.abs(tier - base) <= 1, `tier ${tier} vs base ${base} at ${tx},${ty}`);
    }
  }
});

test('the deep frontier reaches DANGER_MAX', () => {
  assert.equal(dangerAt(SEED, 2000, 2000, ANCHORS), DANGER_MAX);
  assert.equal(dangerAt(SEED, -2000, 100, ANCHORS), DANGER_MAX);
});

test('deterministic from its inputs', () => {
  for (let i = 0; i < 200; i++) {
    const tx = i * 17 - 800;
    const ty = i * 31 - 900;
    assert.equal(dangerAt(SEED, tx, ty, ANCHORS), dangerAt(SEED, tx, ty, ANCHORS));
  }
});

test('no anchors: the origin plays the hearth', () => {
  assert.equal(dangerAt(SEED, 0, 0, []), 0);
  assert.ok(dangerAt(SEED, 1500, 0, []) >= DANGER_MAX - 1);
});

// ---------------------------------------------------- the haven law

/** A haven planted deep in the frontier east of the hearth. */
const HAVEN: DangerAnchor = { x: 48 + 96 + DANGER_BAND * 3.5, y: 48, safeR: 18, haven: true };
const WITH_HAVEN = [...ANCHORS, HAVEN];

test('haven: tier 0 inside the lamplight, graded rim outside', () => {
  // Inside safeR: calm by construction.
  assert.equal(dangerAt(SEED, HAVEN.x, HAVEN.y, WITH_HAVEN), 0);
  assert.equal(dangerAt(SEED, HAVEN.x + 17, HAVEN.y, WITH_HAVEN), 0);
  // The rim relieves but never re-settles: everything outside safeR is ≥ 1.
  for (let d = HAVEN.safeR + 1; d < HAVEN.safeR + HAVEN_FADE * 2 + 20; d += 3) {
    const near = dangerAt(SEED, HAVEN.x + d, HAVEN.y, WITH_HAVEN);
    const without = dangerAt(SEED, HAVEN.x + d, HAVEN.y, ANCHORS);
    assert.ok(near >= 1, `rim tile at +${d} fell to ${near}`);
    assert.ok(near <= without, `haven raised danger at +${d}: ${near} > ${without}`);
    const fade = d - HAVEN.safeR;
    const relief = fade < HAVEN_FADE ? 2 : fade < HAVEN_FADE * 2 ? 1 : 0;
    assert.ok(without - near <= relief, `relief ${without - near} exceeds law at +${d}`);
  }
});

test('haven never re-origins the band march', () => {
  // Well past the rim the field must be EXACTLY what it was without
  // the haven — a lamp lights its own clearing and nothing else.
  for (let i = 0; i < 400; i++) {
    const tx = ((i * 137) % 2400) - 1200;
    const ty = ((i * 251) % 2400) - 1200;
    if (Math.hypot(tx - HAVEN.x, ty - HAVEN.y) < HAVEN.safeR + HAVEN_FADE * 2 + 2) continue;
    assert.equal(
      dangerAt(SEED, tx, ty, WITH_HAVEN),
      dangerAt(SEED, tx, ty, ANCHORS),
      `haven leaked to ${tx},${ty}`,
    );
  }
});
