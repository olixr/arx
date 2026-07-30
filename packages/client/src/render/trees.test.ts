import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TREE_TILES,
  Tile,
  isSolidTile,
  saplingOf,
  tileColliderRadius,
  treeOfSapling,
} from '@arx/shared';
import { maxTrunkBaseRadius, speciesOf, treeModel } from './trees.js';

const TREES = [Tile.Tree, Tile.TreeOak, Tile.TreeWillow, Tile.TreeYew];

test('every tree tile grows all of its structural variants', () => {
  // The user-facing promise: 2-3 real silhouettes per species, not
  // one model with jitter. Hash coverage must reach every variant.
  for (const tile of TREES) {
    const perSpecies = new Map<number, Set<number>>();
    for (let h = 0; h < 400; h++) {
      const m = treeModel(tile, h);
      let set = perSpecies.get(m.species);
      if (!set) perSpecies.set(m.species, (set = new Set()));
      set.add(m.variant);
    }
    for (const [species, variants] of perSpecies) {
      assert.ok(
        variants.size >= 3,
        `${Tile[tile]} species ${species} only grew ${variants.size} variants`,
      );
    }
  }
});

test('trees stand at proper scale — never stubby, never absurd', () => {
  // The player reads ~1.2 tiles tall; common trees must clear ~2.3x
  // that and the named giants more, with a sane ceiling for the
  // renderer's south-pad culling (TREE_PAD assumes <= ~6.5).
  for (const tile of TREES) {
    for (let h = 0; h < 200; h++) {
      const m = treeModel(tile, h);
      assert.ok(m.height >= 2.8, `${Tile[tile]} h=${h} only ${m.height.toFixed(2)} tiles`);
      assert.ok(m.height <= 6.5, `${Tile[tile]} h=${h} is ${m.height.toFixed(2)} tiles tall`);
    }
  }
  for (let h = 0; h < 100; h++) {
    assert.ok(treeModel(Tile.TreeOak, h).height >= 4.6, 'oaks are landmarks');
    assert.ok(treeModel(Tile.TreeYew, h).height >= 4.3, 'yews are ancients');
  }
});

test('colliders track the drawn trunk base — physics matches the art', () => {
  // tileColliderRadius must stay within a whisker of the fattest
  // flared trunk any variant can grow, so bodies brush past exactly
  // the wood they see (tight forests stay walkable).
  for (const tile of TREES) {
    const collider = tileColliderRadius(tile);
    assert.ok(collider !== null, `${Tile[tile]} lost its trunk collider`);
    const drawn = maxTrunkBaseRadius(tile);
    assert.ok(
      collider! + 0.05 >= drawn,
      `${Tile[tile]} trunk draws ${drawn.toFixed(3)} but collides at ${collider}`,
    );
    assert.ok(
      collider! <= drawn + 0.12,
      `${Tile[tile]} collider ${collider} is far fatter than the drawn ${drawn.toFixed(3)}`,
    );
  }
});

test('the model is coherent: anchored tips, sorted crown, real spread', () => {
  for (const tile of TREES) {
    for (let h = 0; h < 60; h++) {
      const m = treeModel(tile, h);
      assert.ok(m.branches.length >= 1 && m.clusters.length >= 4);
      // The trunk is the LAST branch (it paints over the bough
      // joins — the seam law) and starts at the ground origin.
      const [bx0, by0] = m.branches[m.branches.length - 1]!.pts[0]!;
      assert.equal(by0, 0);
      assert.ok(Math.abs(bx0) < 0.01);
      // Every bough tip points at a live cluster (anchoring law).
      for (const b of m.branches) {
        assert.ok(b.tip >= -1 && b.tip < m.clusters.length);
      }
      // The dome is a MASS: the crown's widest tier must overlap —
      // no cluster's nearest neighbour further than a fused join.
      for (let i = 0; i < m.clusters.length; i++) {
        const a = m.clusters[i]!;
        let nearest = Infinity;
        for (let j = 0; j < m.clusters.length; j++) {
          if (j === i) continue;
          const b = m.clusters[j]!;
          nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y) - (a.r + b.r));
        }
        assert.ok(nearest < -0.05, `${Tile[tile]} h=${h} cluster ${i} floats ${nearest.toFixed(2)} clear of the mass`);
      }
      assert.ok(m.spread > 0.4 && m.spread < 3.2);
    }
  }
});

test('the willow weeps: a real skirt of falls, and only the willow', () => {
  // The cascade IS the tree (THE WILLOW FALL law): a deep rear sheet,
  // articulated mid falls, lit falls, and withy streaks — anchored
  // under the crown, plunging to near the ground, never digging in,
  // never streaming past the culling reach, always inside `spread`.
  for (let h = 0; h < 120; h++) {
    const m = treeModel(Tile.TreeWillow, h);
    const byTone = [0, 0, 0, 0];
    let lowest = Infinity;
    for (const cu of m.curtains) {
      byTone[cu.tone]!++;
      let topY = -Infinity;
      for (const [x, y] of cu.pts) {
        lowest = Math.min(lowest, y);
        topY = Math.max(topY, y);
        assert.ok(y >= 0.09, `fall digs into the ground at y=${y.toFixed(2)}`);
        assert.ok(Math.abs(x) <= 2.56, 'fall streams past the culling reach');
        assert.ok(Math.abs(x) <= m.spread, 'spread must cover the whole skirt');
      }
      // Anchors buried under the crown mass (seam law, downward).
      assert.ok(topY > m.height * 0.5, `a fall anchors in the open at y=${topY.toFixed(2)}`);
      // Swing weights are sane: bounded, anchored at the top.
      for (const d of cu.drop) assert.ok(d >= 0 && d <= 1.45);
      assert.ok(cu.drop[0]! < 0.35, 'the anchor row must hang stiff');
      assert.ok(cu.len > 0.35);
    }
    assert.equal(byTone[0], 1, 'exactly one rear sheet');
    assert.ok(byTone[1]! >= 5, `only ${byTone[1]} mid falls`);
    assert.ok(byTone[2]! >= 2, 'the light side carries lit falls');
    assert.ok(byTone[3]! >= 3, 'withy streaks sell the close range');
    assert.ok(lowest <= 0.95, `the skirt stops short at ${lowest.toFixed(2)} tiles`);
  }
  // Nothing else weeps.
  for (const tile of [Tile.Tree, Tile.TreeOak, Tile.TreeYew]) {
    for (let h = 0; h < 60; h++) {
      assert.equal(treeModel(tile, h).curtains.length, 0, `${Tile[tile]} grew a skirt`);
    }
  }
});

test('regrowth staging: tree <-> sapling maps invert, saplings walkable', () => {
  for (const tile of TREES) {
    const sap = saplingOf(tile);
    assert.ok(sap !== null, `${Tile[tile]} has no sapling stage`);
    assert.equal(treeOfSapling(sap!), tile);
    assert.equal(isSolidTile(sap!), false, 'saplings are stepped over');
    assert.equal(isSolidTile(tile), true);
    assert.ok(TREE_TILES.has(tile));
    // Saplings must NOT be solid colliders either.
    assert.equal(tileColliderRadius(sap!), null);
  }
  assert.equal(saplingOf(Tile.Rock), null);
  assert.equal(treeOfSapling(Tile.Tree), null);
});

test('species mapping: named trees keep their species, commons vary', () => {
  assert.equal(speciesOf(Tile.TreeOak, 7), 5);
  assert.equal(speciesOf(Tile.TreeWillow, 7), 6);
  assert.equal(speciesOf(Tile.TreeYew, 7), 7);
  const commons = new Set<number>();
  for (let h = 0; h < 40; h++) commons.add(speciesOf(Tile.Tree, h));
  assert.equal(commons.size, 5, 'common wood draws from five species');
});
