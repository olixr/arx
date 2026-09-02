import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { disturbFalloff, generateGrassTile, laneUses, windAt } from './grass.js';

// ------------------------------------------------------------------ wind

test('wind stays within the treeline contract (~[-0.6, 1.4] scalar)', () => {
  for (let i = 0; i < 400; i++) {
    const w = windAt((i * 7.3) % 200, (i * 3.1) % 200, i * 0.37);
    assert.ok(w.s > -1.2 && w.s < 1.6, `scalar ${w.s} out of range`);
    assert.ok(Math.hypot(w.bx, w.by) < 2.2, 'bend vector too large');
  }
});

test('wind is spatially smooth — neighbours sway together, never against each other', () => {
  for (let i = 0; i < 200; i++) {
    const x = (i * 11.7) % 300;
    const y = (i * 5.3) % 300;
    const t = i * 0.29;
    const a = windAt(x, y, t);
    const b = windAt(x + 0.5, y, t);
    assert.ok(Math.abs(a.s - b.s) < 0.35, `scalar jump ${Math.abs(a.s - b.s)}`);
    assert.ok(Math.abs(a.bx - b.bx) < 0.35, `bend jump ${Math.abs(a.bx - b.bx)}`);
  }
});

test('wind actually travels: the field at a point changes over time', () => {
  let maxDelta = 0;
  for (let t = 0; t < 8; t += 0.25) {
    maxDelta = Math.max(maxDelta, Math.abs(windAt(50, 50, t).s - windAt(50, 50, t + 2).s));
  }
  assert.ok(maxDelta > 0.4, `field barely moved: ${maxDelta}`);
});

// ------------------------------------------------------------ generation

test('grass generation is deterministic — same tile, same meadow, every session', () => {
  assert.deepEqual(generateGrassTile(12, 34, Tile.Grass, 0), generateGrassTile(12, 34, Tile.Grass, 0));
});

test('every blade roots inside (or fanning just past) its tile, heights sane', () => {
  for (let i = 0; i < 60; i++) {
    const tx = i * 3;
    const ty = i * 7 + 1;
    const g = generateGrassTile(tx, ty, Tile.Grass, 0);
    for (const b of [...g.under, ...g.north, ...g.south]) {
      assert.ok(b.bx > tx - 0.25 && b.bx < tx + 1.25, `bx ${b.bx} strays from tile ${tx}`);
      assert.ok(b.by > ty - 0.25 && b.by < ty + 1.25, `by ${b.by} strays from tile ${ty}`);
      assert.ok(b.h > 0.08 && b.h < 0.75, `height ${b.h} out of band`);
    }
  }
});

test('THE COAT: no short-grass tile is ever bald — the carpet has a floor', () => {
  for (let i = 0; i < 400; i++) {
    const n = generateGrassTile(i * 5, (i * 13) % 500, Tile.Grass, 0).under.length;
    assert.ok(n >= 3, `tile dealt only ${n} blades — bald paint reads as nodules`);
  }
});

test('coverage varies: thin worn reaches and dense lush stands both occur', () => {
  let thin = 0;
  let dense = 0;
  for (let i = 0; i < 400; i++) {
    const n = generateGrassTile(i * 5, (i * 13) % 500, Tile.Grass, 0).under.length;
    if (n <= 5) thin++;
    if (n >= 10) dense++;
  }
  assert.ok(thin > 30, `only ${thin} thin tiles — the coat reads uniform`);
  assert.ok(dense > 30, `only ${dense} dense tiles — no lush waves`);
});

test('seed-heads gather in prairie drifts — present, sparse, and rooted in-tile', () => {
  let seedTiles = 0;
  for (let i = 0; i < 400; i++) {
    const tx = i * 5;
    const ty = (i * 13) % 500;
    const g = generateGrassTile(tx, ty, Tile.Grass, 0);
    if (g.seeds.length > 0) seedTiles++;
    assert.ok(g.seeds.length <= 2, 'a tile is a drift member, never a crop row');
    for (const sd of g.seeds) {
      assert.ok(sd.bx > tx - 0.4 && sd.bx < tx + 1.4, `seed bx ${sd.bx} strays from tile ${tx}`);
      assert.ok(sd.by > ty - 0.4 && sd.by < ty + 1.4, `seed by ${sd.by} strays from tile ${ty}`);
      assert.ok(sd.h > 0.3 && sd.h < 0.55, `stalk height ${sd.h} out of band`);
    }
  }
  assert.ok(seedTiles > 20, `only ${seedTiles} seed tiles — the golden reaches are missing`);
  assert.ok(seedTiles < 200, `${seedTiles} seed tiles — gold everywhere is not a drift`);
});

test('tall thickets split cleanly at the midline for y-sorting', () => {
  for (let i = 0; i < 40; i++) {
    const ty = i * 9;
    const g = generateGrassTile(i * 4, ty, Tile.GrassTall, 0);
    assert.ok(g.north.length + g.south.length >= 9, 'thicket too thin');
    for (const b of g.north) assert.ok(b.by < ty + 0.5, 'north blade south of midline');
    for (const b of g.south) assert.ok(b.by >= ty + 0.5, 'south blade north of midline');
  }
});

test('a Tuft detail always deals a rooted clump', () => {
  const g = generateGrassTile(7, 7, Tile.Grass, 2);
  assert.equal(g.roots.length, 1);
  assert.ok(g.under.length >= 6);
});

test('a Flowers detail always blooms; tall thickets never do', () => {
  assert.ok(generateGrassTile(3, 5, Tile.Grass, 1).flowers.length >= 3);
  for (let i = 0; i < 50; i++) {
    assert.equal(generateGrassTile(i, i * 2, Tile.GrassTall, 1).flowers.length, 0);
  }
});

// ---------------------------------------------------------- displacement

test('displacement falls off smoothly and monotonically from body to rim', () => {
  const R = 0.9;
  assert.equal(disturbFalloff(0, R), 1);
  assert.equal(disturbFalloff(R, R), 0);
  assert.equal(disturbFalloff(R + 1, R), 0);
  let prev = 1;
  for (let d = 0.05; d < R; d += 0.05) {
    const f = disturbFalloff(d, R);
    assert.ok(f <= prev && f >= 0, `falloff not monotonic at ${d}`);
    prev = f;
  }
});

// THE COAT LAW, pinned at the lane gate (field-regression guard). The
// under lane owns the nap/roots/flowers/seeds of EVERY grass tile —
// a gate that lumped it with the tall-only lanes silently balded the
// whole open meadow (casts kept drawing: "grass shadows, no grass").
test('the under lane coats BOTH grass tiles; tall lanes are thickets-only', () => {
  const LANE_ROW = 0;
  const LANE_TALL_N = 1;
  const LANE_TALL_S = 2;
  const LANE_UNDER = 3;
  // UNDER: both short and tall grass wear the coat.
  assert.equal(laneUses(LANE_UNDER, Tile.Grass), true, 'under coats short grass');
  assert.equal(laneUses(LANE_UNDER, Tile.GrassTall), true, 'under coats tall grass');
  // ROW: both grass tiles (accent stands).
  assert.equal(laneUses(LANE_ROW, Tile.Grass), true);
  assert.equal(laneUses(LANE_ROW, Tile.GrassTall), true);
  // TALL lanes: standing mass is thickets only.
  assert.equal(laneUses(LANE_TALL_N, Tile.Grass), false, 'no tall stand on short grass');
  assert.equal(laneUses(LANE_TALL_S, Tile.Grass), false);
  assert.equal(laneUses(LANE_TALL_N, Tile.GrassTall), true);
  assert.equal(laneUses(LANE_TALL_S, Tile.GrassTall), true);
  // Non-grass never uses any lane.
  for (const lane of [LANE_ROW, LANE_TALL_N, LANE_TALL_S, LANE_UNDER]) {
    assert.equal(laneUses(lane, Tile.Dirt), false);
    assert.equal(laneUses(lane, null), false);
    assert.equal(laneUses(lane, undefined), false);
  }
});
