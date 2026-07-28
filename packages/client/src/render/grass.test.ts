import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { disturbFalloff, generateGrassTile, windAt } from './grass.js';

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
      assert.ok(b.h > 0.1 && b.h < 0.75, `height ${b.h} out of band`);
    }
  }
});

test('coverage varies: bare patches, strands, and dense clumps all occur', () => {
  let bare = 0;
  let dense = 0;
  for (let i = 0; i < 400; i++) {
    const n = generateGrassTile(i * 5, (i * 13) % 500, Tile.Grass, 0).under.length;
    if (n <= 1) bare++;
    if (n >= 6) dense++;
  }
  assert.ok(bare > 10, `only ${bare} bare tiles — meadow reads uniform`);
  assert.ok(dense > 10, `only ${dense} dense tiles — no clusters`);
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
