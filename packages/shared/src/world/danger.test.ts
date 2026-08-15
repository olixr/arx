import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DANGER_BAND, DANGER_MAX, DANGER_OVER, HAVEN_FADE, dangerAt, type DangerAnchor } from './danger.js';

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

// ---------------------------------------------------------------- dread
const DREAD = { x: 600, y: 600, safeR: 80, dread: 2 } as const;
const WITH_DREAD: DangerAnchor[] = [...ANCHORS, { ...DREAD }];

test('dread: bad country reads worse than its distance, on a graded rim', () => {
  // Inside the line: the full weight.
  for (const [dx, dy] of [[0, 0], [40, 0], [0, -60], [50, 50]] as const) {
    const with_ = dangerAt(SEED, DREAD.x + dx, DREAD.y + dy, WITH_DREAD);
    const without = dangerAt(SEED, DREAD.x + dx, DREAD.y + dy, ANCHORS);
    assert.equal(
      with_,
      Math.min(DANGER_MAX, without + DREAD.dread),
      `dread heart at +${dx},${dy} read ${with_} against ${without}`,
    );
  }
  // The rim carries one fewer tier, and past twice the fade, nothing.
  for (let d = DREAD.safeR + 1; d < DREAD.safeR + HAVEN_FADE * 2 + 40; d += 3) {
    const with_ = dangerAt(SEED, DREAD.x + d, DREAD.y, WITH_DREAD);
    const without = dangerAt(SEED, DREAD.x + d, DREAD.y, ANCHORS);
    const add = d - DREAD.safeR < HAVEN_FADE * 2 ? DREAD.dread - 1 : 0;
    assert.equal(with_, Math.min(DANGER_MAX, without + add), `rim at +${d}`);
  }
});

test('dread never reaches inside a hearth, and never joins the march', () => {
  // A dread laid straight over a settled anchor changes nothing inside it.
  const overTown: DangerAnchor[] = [...ANCHORS, { x: 48, y: 48, safeR: 200, dread: 3 }];
  assert.equal(dangerAt(SEED, 48, 48, overTown), 0);
  assert.equal(dangerAt(SEED, 100, 48, overTown), 0);
  // With NO settled anchor at all, a lone dread must not become one:
  // the march still measures from the world origin.
  const lone: DangerAnchor[] = [{ x: 600, y: 600, safeR: 80, dread: 2 }];
  const far = dangerAt(SEED, -900, -900, lone);
  assert.ok(far >= 1 && far <= DANGER_MAX);
});

// ------------------------------------------------------- the Overband

test('OVERBAND: a dread-3 heart at the world\'s rim crosses the ceiling', () => {
  // (1400,1400) sits far past the ninth band — the march saturates by
  // honest distance, so the full heart opens the Overband everywhere.
  const brand: DangerAnchor = { x: 1400, y: 1400, safeR: 80, dread: 3 };
  const world = [...ANCHORS, brand];
  for (let i = 0; i < 600; i++) {
    const ang = (i / 600) * Math.PI * 2;
    const r = (i % 12) * 6.5; // 0..71.5, all inside safeR 80
    const tx = Math.round(brand.x + Math.cos(ang) * r);
    const ty = Math.round(brand.y + Math.sin(ang) * r);
    const tier = dangerAt(SEED, tx, ty, world);
    assert.equal(tier, DANGER_OVER, `heart tile ${tx},${ty} read ${tier}`);
  }
});

test('OVERBAND: a dread-3 heart mid-march burns hot but never crosses', () => {
  // (600,600) reads base 6 — deep country, but honest distance says
  // the march has rungs left. The heart deals the classic additive
  // law (8-9 here), and the Overband stays closed: the noise and the
  // dread together can never fake remoteness.
  const brand: DangerAnchor = { x: 600, y: 600, safeR: 80, dread: 3 };
  const world = [...ANCHORS, brand];
  for (let i = 0; i < 600; i++) {
    const ang = (i / 600) * Math.PI * 2;
    const r = (i % 12) * 6.5;
    const tx = Math.round(brand.x + Math.cos(ang) * r);
    const ty = Math.round(brand.y + Math.sin(ang) * r);
    const tier = dangerAt(SEED, tx, ty, world);
    const without = dangerAt(SEED, tx, ty, ANCHORS);
    assert.equal(
      tier,
      Math.max(1, Math.min(DANGER_MAX, without + brand.dread!)),
      `heart tile ${tx},${ty} read ${tier}`,
    );
    assert.ok(tier <= DANGER_MAX, `heart tile ${tx},${ty} crossed: ${tier}`);
  }
});

test('OVERBAND: the rim never crosses — only the full heart does', () => {
  const brand = { x: 600, y: 600, safeR: 80, dread: 3 } as const;
  const world: DangerAnchor[] = [...ANCHORS, { ...brand }];
  for (let d = brand.safeR + 1; d < brand.safeR + HAVEN_FADE * 2 + 40; d += 2) {
    const tier = dangerAt(SEED, brand.x + d, brand.y, world);
    assert.ok(tier <= DANGER_MAX, `rim at +${d} read ${tier}`);
    // And the rim still speaks the classic dread law exactly.
    const without = dangerAt(SEED, brand.x + d, brand.y, ANCHORS);
    const add = d - brand.safeR < HAVEN_FADE * 2 ? brand.dread - 1 : 0;
    assert.equal(tier, Math.min(DANGER_MAX, without + add), `rim law at +${d}`);
  }
});

test('OVERBAND: dread below 3 never opens it, anywhere', () => {
  const wood: DangerAnchor = { x: 600, y: 600, safeR: 80, dread: 2 };
  const world = [...ANCHORS, wood];
  for (let i = 0; i < 800; i++) {
    const tx = 600 + ((i * 37) % 240) - 120;
    const ty = 600 + ((i * 53) % 240) - 120;
    assert.ok(dangerAt(SEED, tx, ty, world) <= DANGER_MAX, `dread-2 leaked past MAX at ${tx},${ty}`);
  }
});

test('OVERBAND: a dread-3 heart in near country stays inside the old law', () => {
  // Planted three bands south of the hearth (deep enough that the
  // jitter can never clip the band floor and skew the comparison,
  // clear of the second anchor): the march never saturates there, so
  // even the full dread-3 heart answers the classic law.
  const near = { x: 48, y: 48 + 96 + 300, safeR: 30, dread: 3 } as const;
  const world: DangerAnchor[] = [...ANCHORS, { ...near }];
  for (let i = 0; i < 400; i++) {
    const ang = (i / 400) * Math.PI * 2;
    const r = (i % 10) * 3.2; // 0..28.8, all inside safeR 30
    const tx = Math.round(near.x + Math.cos(ang) * r);
    const ty = Math.round(near.y + Math.sin(ang) * r);
    const tier = dangerAt(SEED, tx, ty, world);
    const without = dangerAt(SEED, tx, ty, ANCHORS);
    assert.equal(
      tier,
      Math.max(1, Math.min(DANGER_MAX, without + near.dread)),
      `near heart at ${tx},${ty}`,
    );
  }
});
