import test from 'node:test';
import assert from 'node:assert/strict';
import { TREE_TILES as TREE_TILE_SET, Tile, hashCoords, treeOfSapling } from '@arx/shared';
import { treeModel, treeExtent, saplingModel, type TreeModel } from './trees.js';

/**
 * THE FRAME CONTAINS THE TREE.
 *
 * `treeExtent` is what sizes every tree's sprite canvas, so a box that
 * is one hair too small CLIPS A CROWN on screen — a bug the bake itself
 * can never report, because a clipped sprite blits perfectly happily.
 * These tests re-walk paintTree's geometry INDEPENDENTLY (same source
 * constants, written out longhand rather than shared, so a silent edit
 * to one side fails here instead of on a player's screen) and assert
 * containment for every species, every variant, at wind extremes.
 *
 * The tightness assertions are the other half: an extent that passes
 * containment by being enormous would pass the safety half and lose
 * the entire point of the exercise, which is fill rate.
 */

/** The shared roster is a Set; these walks want an ordered list. */
const TREE_TILES: Tile[] = [...TREE_TILE_SET];

/** windScalarAt = gust * (0.4 + sway), gust <= 1, sway in [-1, 1]. */
const WIND_MAX = 1.4;

/** The worst case each painter can reach for one model, walked the
 *  long way round — clusters, wood and cascade, at full wind both
 *  ways. Mirrors paintTree, never imports treeExtent's own maths. */
function bruteExtent(m: TreeModel): { x0: number; x1: number; y0: number; y1: number } {
  const H = m.height;
  let x0 = 0;
  let x1 = 0;
  let y0 = 0;
  let y1 = 0;
  const hit = (x: number, y: number): void => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  const disp = (hf: number): number =>
    WIND_MAX * 0.055 * H * Math.pow(Math.min(1, Math.max(0, hf)), 1.4);

  for (const c of m.clusters) {
    // facetBlob vertex jitter 0.82..1.12; the shade stamp is the
    // widest (scale .98, squash .92, screen offset +.11r/+.13r); the
    // per-frame breath rb tops at 1.02.
    const r = c.r * 1.02;
    const amp = 1.2 * 0.02 * (0.5 + c.r);
    const dx = disp(c.hf) + 0.05 * H + amp;
    const dy = amp * 0.55;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const vx = Math.cos(a) * 0.98 * 1.12 * r + 0.11 * r;
      const vy = Math.sin(a) * 0.98 * 0.92 * 1.12 * r + 0.13 * r;
      // Screen +y is model -y.
      hit(c.x + vx + dx, c.y - vy + dy);
      hit(c.x + vx - dx, c.y - vy - dy);
    }
  }

  const tipDrag = 2 * WIND_MAX * 0.055 * H + 0.05 * H + 1.2 * 0.02 * (0.5 + m.spread);
  for (const b of m.branches) {
    const last = b.pts.length - 1;
    for (let i = 0; i <= last; i++) {
      const [px, py] = b.pts[i]!;
      const u = last > 0 ? i / last : 0;
      let w = b.w0 + (b.w1 - b.w0) * u;
      if (u < 0.2) w *= 1 + b.flare * ((0.2 - u) / 0.2) * 0.4;
      const sway = disp(py / H);
      const drag = b.tip >= 0 ? tipDrag * u * u : 0;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) hit(px + sx * w + sx * (sway + drag), py + sy * (w + drag));
      if (b.level === 0) hit(px, py + 0.13);
    }
  }

  for (const cu of m.curtains) {
    const sw = 0.2 * cu.len;
    const swing = disp(1) + sw + 0.085;
    for (const p of cu.pts) {
      hit(p[0] - swing, p[1]);
      hit(p[0] + swing, p[1] + sw * 0.18);
    }
  }
  return { x0, x1, y0: Math.min(0, y0), y1 };
}

test('treeExtent', async (t) => {
  await t.test('the frame contains every painter, every species', () => {
    let checked = 0;
    for (const tile of TREE_TILES) {
      for (let seed = 0; seed < 24; seed++) {
        const h = hashCoords(seed * 31 + 7, seed * 17, seed);
        const m = treeModel(tile, h);
        if (m.clusters.length === 0 && m.branches.length === 0) continue;
        checked++;
        const e = treeExtent(m);
        const b = bruteExtent(m);
        assert.ok(e.x0 <= b.x0, `${tile}/${seed}: left clipped ${e.x0} > ${b.x0}`);
        assert.ok(e.x1 >= b.x1, `${tile}/${seed}: right clipped ${e.x1} < ${b.x1}`);
        assert.ok(e.y0 <= b.y0, `${tile}/${seed}: below clipped ${e.y0} > ${b.y0}`);
        assert.ok(e.y1 >= b.y1, `${tile}/${seed}: crown clipped ${e.y1} < ${b.y1}`);
      }
    }
    assert.ok(checked > 40, `only ${checked} models exercised`);
  });

  await t.test('saplings get their own frame, and it contains them', () => {
    let checked = 0;
    for (const tile of Object.values(Tile)) {
      if (typeof tile !== 'number') continue;
      const adult = treeOfSapling(tile);
      if (adult === null) continue;
      for (let seed = 0; seed < 12; seed++) {
        const m = saplingModel(adult, hashCoords(seed * 13 + 3, seed * 29, seed));
        checked++;
        const e = treeExtent(m);
        const b = bruteExtent(m);
        assert.ok(e.x0 <= b.x0 && e.x1 >= b.x1, `sapling ${tile}/${seed}: sides clipped`);
        assert.ok(e.y0 <= b.y0 && e.y1 >= b.y1, `sapling ${tile}/${seed}: ends clipped`);
      }
    }
    assert.ok(checked > 0, 'no saplings exercised');
  });

  // The whole point is fill rate: a box that contains the tree by being
  // the size of the county passes the test above and helps nobody. The
  // OLD box was `spread * 1.15 + 0.08h + 0.45` sideways and
  // `height * 1.18 + 0.45` up; every model must come in meaningfully
  // under it, or this refactor bought nothing.
  await t.test('the frame is tighter than the guessed box it replaced', () => {
    let worstArea = 0;
    let n = 0;
    let sum = 0;
    for (const tile of TREE_TILES) {
      for (let seed = 0; seed < 12; seed++) {
        const m = treeModel(tile, hashCoords(seed * 31 + 7, seed * 17, seed));
        if (m.clusters.length === 0 && m.branches.length === 0) continue;
        const e = treeExtent(m);
        const oldHalf = m.spread * 1.15 + 0.08 * m.height + 0.45;
        const oldTop = m.height * 1.18 + 0.45;
        const oldArea = oldHalf * 2 * (oldTop + 0.3);
        const newArea = (e.x1 - e.x0) * (e.y1 - e.y0);
        const frac = newArea / oldArea;
        assert.ok(frac < 0.95, `${tile}/${seed}: frame is ${frac.toFixed(2)}x the old box`);
        if (frac > worstArea) worstArea = frac;
        sum += frac;
        n++;
      }
    }
    // Comfortably better than break-even on average, or the measured
    // 40%-ink finding has not actually been acted on.
    assert.ok(sum / n < 0.75, `mean frame is ${(sum / n).toFixed(2)}x the old box`);
  });

  await t.test('the frame always holds the trunk base and the ground line', () => {
    for (const tile of TREE_TILES.slice(0, 8)) {
      const m = treeModel(tile, hashCoords(5, 9, 1));
      const e = treeExtent(m);
      assert.ok(e.x0 < 0 && e.x1 > 0, 'trunk base column');
      assert.ok(e.y0 <= 0, 'ground line');
      assert.ok(e.y1 > m.height * 0.5, 'crown');
    }
  });

  await t.test('the same model gets the same frame object (memoized)', () => {
    const m = treeModel(TREE_TILES[0]!, hashCoords(1, 2, 3));
    assert.equal(treeExtent(m), treeExtent(m));
  });
});
