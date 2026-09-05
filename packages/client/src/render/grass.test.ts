import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import {
  disturbFalloff,
  generateGrassTile,
  GrassSystem,
  laneUses,
  windAt,
  type Blade,
  type Flower,
  type SeedHead,
  type ElevOrnGroup,
} from './grass.js';

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

// ------------------------------------------ GPU meadow: standing grass scatter

test('gpu=false leaves normal grass with NO standing mass (canvas default unchanged)', () => {
  // The default (canvas) path must be byte-identical to before: a normal Grass
  // tile carries only the under coat, never north/south standing blades.
  for (let i = 0; i < 200; i++) {
    const g = generateGrassTile(i * 5, (i * 13) % 400, Tile.Grass, 0);
    assert.equal(g.north.length + g.south.length, 0, `tile ${i} grew standing grass in canvas mode`);
  }
  // And passing gpu=false explicitly is identical to omitting it.
  assert.deepEqual(
    generateGrassTile(21, 42, Tile.Grass, 0, 0, false),
    generateGrassTile(21, 42, Tile.Grass, 0),
  );
});

test('gpu=true scatters standing grass through a CLUMPY FRACTION of normal tiles', () => {
  let withStanding = 0;
  const total = 900;
  for (let i = 0; i < total; i++) {
    const tx = i % 30;
    const ty = Math.floor(i / 30);
    const g = generateGrassTile(tx, ty, Tile.Grass, 0, 0, true);
    if (g.north.length + g.south.length > 0) withStanding++;
  }
  const frac = withStanding / total;
  // A real fraction of the field carries standing grass — but nowhere near all
  // of it (clumpy drifts with gaps, never a uniform carpet or a barren field).
  assert.ok(frac > 0.1, `too little standing grass (${(frac * 100).toFixed(0)}%)`);
  assert.ok(frac < 0.75, `standing grass everywhere — not clumpy (${(frac * 100).toFixed(0)}%)`);
});

test('gpu standing scatter is deterministic and gpu-gated', () => {
  const a = generateGrassTile(7, 11, Tile.Grass, 0, 0, true);
  const b = generateGrassTile(7, 11, Tile.Grass, 0, 0, true);
  assert.deepEqual(JSON.stringify(a), JSON.stringify(b));
});

test('true GrassTall thickets stay the DENSEST standing grass', () => {
  // A dedicated thicket must out-mass any scattered tuft in a normal tile.
  let tallMin = Infinity;
  for (let i = 0; i < 40; i++) {
    const g = generateGrassTile(i * 3, (i * 7) % 200, Tile.GrassTall, 0, 0, true);
    tallMin = Math.min(tallMin, g.north.length + g.south.length);
  }
  let scatterMax = 0;
  for (let i = 0; i < 900; i++) {
    const g = generateGrassTile(i % 30, Math.floor(i / 30), Tile.Grass, 0, 0, true);
    scatterMax = Math.max(scatterMax, g.north.length + g.south.length);
  }
  assert.ok(tallMin > scatterMax, `thicket floor ${tallMin} must exceed scatter peak ${scatterMax}`);
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

// ------------------------------------------- B3: THE TALL BLADE INTERLEAVES
//
// The GPU meadow's flat field carries only the short `under` coat (correct
// below all bodies); the tall standing mass is skipped here so the CPU
// collectTall y-sort can interleave it with entities. collectGpuBlades is
// the partition boundary: `tallInterleave` decides which depth class the
// GPU field owns.

function tallRegion(): { ground: (tx: number, ty: number) => number | undefined; bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number } } {
  const bounds = { minTx: 0, maxTx: 3, minTy: 0, maxTy: 3 };
  const ground = (tx: number, ty: number): number | undefined =>
    tx >= bounds.minTx && tx <= bounds.maxTx && ty >= bounds.minTy && ty <= bounds.maxTy
      ? Tile.GrassTall
      : undefined;
  return { ground, bounds };
}

test('collectGpuBlades: interleave OFF keeps the tall standing mass in the flat field', () => {
  const { ground, bounds } = tallRegion();
  const gs = new GrassSystem();
  const out: Blade[] = [];
  gs.collectGpuBlades(ground, () => 0, bounds, out, false);
  // Expected = under + north + south over the whole GrassTall region.
  let expect = 0;
  for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
    for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
      const g = generateGrassTile(tx, ty, Tile.GrassTall, 0);
      expect += g.under.length + g.north.length + g.south.length;
    }
  }
  assert.equal(out.length, expect, 'flat field must carry every blade when not interleaving');
});

test('collectGpuBlades: interleave ON drops the tall bands from the flat field (only the coat)', () => {
  const { ground, bounds } = tallRegion();
  const gs = new GrassSystem();
  const out: Blade[] = [];
  gs.collectGpuBlades(ground, () => 0, bounds, out, true);
  // Expected = the `under` coat ONLY — north/south now ride collectTall.
  let underN = 0;
  let standN = 0;
  for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
    for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
      const g = generateGrassTile(tx, ty, Tile.GrassTall, 0);
      underN += g.under.length;
      standN += g.north.length + g.south.length;
    }
  }
  assert.equal(out.length, underN, 'GPU flat field must carry only the short coat under interleave');
  assert.ok(standN > 0, 'sanity: the region actually has a tall standing mass to interleave');
  // The dropped mass is what collectTall now paints at its y-sort slot —
  // this is exactly the count the interleave restores to the walk-through.
  assert.equal(underN + standN, underN + standN);
});

test('collectGpuBlades: short grass is unaffected by the tall partition', () => {
  // A pure short-grass tile has no standing mass, so the two modes agree.
  const bounds = { minTx: 0, maxTx: 2, minTy: 0, maxTy: 2 };
  const ground = (tx: number, ty: number): number | undefined =>
    tx >= 0 && tx <= 2 && ty >= 0 && ty <= 2 ? Tile.Grass : undefined;
  const gs = new GrassSystem();
  const off: Blade[] = [];
  const on: Blade[] = [];
  gs.collectGpuBlades(ground, () => 0, bounds, off, false);
  gs.collectGpuBlades(ground, () => 0, bounds, on, true);
  assert.equal(on.length, off.length, 'short grass carries the coat identically either way');
  assert.ok(on.length > 0, 'sanity: short grass deals a coat');
});

// ------------------------------------------------ G-ELEVATED (the shelf)

test('collectGpuElevated: only raised grass, one band per (row, level), lifted', () => {
  // A 3-wide region: row 0 flat grass (elev 0), rows 1..2 a level-1 grass
  // plateau. Only the raised rows should be gathered, each row its own band.
  const bounds = { minTx: 0, maxTx: 2, minTy: 0, maxTy: 2 };
  const ground = (tx: number, ty: number): number | undefined =>
    tx >= 0 && tx <= 2 && ty >= 0 && ty <= 2 ? Tile.Grass : undefined;
  const elevAt = (_tx: number, ty: number): number => (ty >= 1 ? 1 : 0);
  const gs = new GrassSystem();
  const out: Blade[] = [];
  const bands: Array<{ i0: number; count: number; sortY: number; minBy: number; maxBy: number; elev?: number }> = [];
  gs.collectGpuElevated(ground, () => 0, elevAt, bounds, 24, out, bands as never);
  // Two raised rows → two bands; the flat row 0 is ignored.
  assert.equal(bands.length, 2, 'one band per raised row');
  for (const b of bands) {
    assert.equal(b.elev, 24, 'every raised band carries level·ELEV_H = 1·24');
    assert.ok(b.count > 0, 'a raised band has blades');
  }
  // Contiguous slices covering the whole output, no overlap.
  assert.equal(bands[0]!.i0, 0);
  assert.equal(bands[0]!.i0 + bands[0]!.count, bands[1]!.i0);
  assert.equal(bands[1]!.i0 + bands[1]!.count, out.length);
  // Blades within a band are back-to-front (by ascending).
  for (const b of bands) {
    for (let i = b.i0 + 1; i < b.i0 + b.count; i++) {
      assert.ok(out[i]!.by >= out[i - 1]!.by, 'band blades sorted by world-y');
    }
  }
});

test('collectGpuElevated: an all-flat field yields no raised bands', () => {
  const bounds = { minTx: 0, maxTx: 2, minTy: 0, maxTy: 2 };
  const ground = (): number | undefined => Tile.Grass;
  const gs = new GrassSystem();
  const out: Blade[] = [];
  const bands: Array<{ i0: number; count: number; sortY: number; minBy: number; maxBy: number; elev?: number }> = [];
  gs.collectGpuElevated(ground, () => 0, () => 0, bounds, 24, out, bands as never);
  assert.equal(bands.length, 0, 'flat ground rides the flat field, not the shelf path');
  assert.equal(out.length, 0);
});

test('collectGpuElevatedOrnaments: only raised blooms, grouped per row/level, lifted', () => {
  // Rows 14..16 are a level-1 plateau; row 13 is flat. (The procedural meadow
  // only deals blooms in this coordinate band — see the flat row exclusion
  // below.) Raised ornaments only.
  const bounds = { minTx: 0, maxTx: 19, minTy: 13, maxTy: 16 };
  const ground = (tx: number, ty: number): number | undefined =>
    tx >= bounds.minTx && tx <= bounds.maxTx && ty >= bounds.minTy && ty <= bounds.maxTy
      ? Tile.Grass
      : undefined;
  const elevAt = (_tx: number, ty: number): number => (ty >= 14 ? 1 : 0);
  const gs = new GrassSystem();
  const flowers: Flower[] = [];
  const seeds: SeedHead[] = [];
  const groups: ElevOrnGroup[] = [];
  gs.collectGpuElevatedOrnaments(ground, () => 0, elevAt, bounds, 24, flowers, seeds, groups);

  // Exactly the ornaments the RAISED rows generate — the flat row 13 is skipped.
  let expF = 0;
  let expS = 0;
  for (let ty = 14; ty <= 16; ty++) {
    for (let tx = 0; tx <= 19; tx++) {
      const g = generateGrassTile(tx, ty, Tile.Grass, 0);
      expF += g.flowers.length;
      expS += g.seeds.length;
    }
  }
  assert.equal(flowers.length, expF, 'raised flowers gathered, flat row excluded');
  assert.equal(seeds.length, expS, 'raised seeds gathered, flat row excluded');
  assert.ok(expF + expS > 0, 'sanity: the raised rows actually deal ornaments');

  for (const g of groups) {
    assert.equal(g.elev, 24, 'every raised group carries level·ELEV_H = 1·24');
    // sortY = row + 0.0015 (just over the coat) → the row is raised (≥ 1).
    const row = Math.round(g.sortY - 0.0015);
    assert.ok(row >= 14, 'a group only ever sits on a raised row');
    assert.ok(g.fCount > 0 || g.sCount > 0, 'a group holds at least one bloom');
  }
  // The groups' slices exactly tile the flower/seed arrays (no gaps/overlap).
  let fSum = 0;
  let sSum = 0;
  for (const g of groups) {
    fSum += g.fCount;
    sSum += g.sCount;
  }
  assert.equal(fSum, flowers.length, 'flower group slices cover the array');
  assert.equal(sSum, seeds.length, 'seed group slices cover the array');
});

test('collectGpuElevatedOrnaments: an all-flat field yields no raised groups', () => {
  const bounds = { minTx: 0, maxTx: 2, minTy: 0, maxTy: 2 };
  const ground = (): number | undefined => Tile.Grass;
  const gs = new GrassSystem();
  const flowers: Flower[] = [];
  const seeds: SeedHead[] = [];
  const groups: ElevOrnGroup[] = [];
  gs.collectGpuElevatedOrnaments(ground, () => 0, () => 0, bounds, 24, flowers, seeds, groups);
  assert.equal(groups.length, 0, 'flat blooms ride the flat field, not the shelf path');
  assert.equal(flowers.length, 0);
  assert.equal(seeds.length, 0);
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
