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

test('the willow weeps: limbs carrying a cascade, and only the willow', () => {
  // THE WILLOW REBUILT law: real arching limbs (each tip dragging
  // its tuft), dark rear streamers, a body of mid fronds, lit
  // sun-side fronds, escaped withies. Anchors buried under the
  // tufts, tips staggered and plunging near the ground, never
  // digging in, never streaming past the culling reach, always
  // inside `spread` — and the ground-level hem must sweep WIDE.
  for (let h = 0; h < 120; h++) {
    const m = treeModel(Tile.TreeWillow, h);
    const limbs = m.branches.filter((b) => b.level === 1);
    assert.ok(limbs.length >= 4, `only ${limbs.length} limbs — the willow lost its arms`);
    for (const b of limbs) {
      assert.ok(b.tip >= 0, 'every limb tip must drag its own tuft (anchoring law)');
    }
    const byTone = [0, 0, 0, 0];
    let lowest = Infinity;
    let hemL = Infinity;
    let hemR = -Infinity;
    const tips: number[] = [];
    for (const cu of m.curtains) {
      byTone[cu.tone]!++;
      let topY = -Infinity;
      let low = Infinity;
      assert.equal(cu.dropF.length, cu.pts.length, 'every vertex needs a ripple phase');
      for (let i = 0; i < cu.pts.length; i++) {
        const [x, y] = cu.pts[i]!;
        low = Math.min(low, y);
        topY = Math.max(topY, y);
        if (y < 1.3) { hemL = Math.min(hemL, x); hemR = Math.max(hemR, x); }
        assert.ok(y >= 0.09, `a streamer digs into the ground at y=${y.toFixed(2)}`);
        assert.ok(Math.abs(x) <= 2.56, 'a streamer streams past the culling reach');
        assert.ok(Math.abs(x) <= m.spread, 'spread must cover the whole cascade');
        const fr = cu.dropF[i]!;
        assert.ok(fr >= 0 && fr <= 1);
      }
      lowest = Math.min(lowest, low);
      tips.push(low);
      // Anchors buried under the tuft masses (seam law, downward).
      assert.ok(topY > m.height * 0.52, `a streamer anchors in the open at y=${topY.toFixed(2)}`);
      // Swing weights are sane: bounded, anchored at the top.
      for (const d of cu.drop) assert.ok(d >= 0 && d <= 1.45);
      assert.ok(cu.drop[0]! < 0.35, 'the anchor row must hang stiff');
      assert.ok(cu.len > 0.35);
    }
    assert.ok(byTone[0]! >= 5, `only ${byTone[0]} rear streamers`);
    assert.ok(byTone[1]! >= 6, `only ${byTone[1]} mid streamers`);
    assert.ok(byTone[2]! >= 2, 'the sun side carries lit streamers');
    assert.ok(byTone[3]! >= 4, 'withies sell the close range');
    assert.ok(lowest <= 0.75, `the cascade stops short at ${lowest.toFixed(2)} tiles`);
    // The staggered hem: tips spread over real depth, never a bar.
    assert.ok(
      Math.max(...tips) - Math.min(...tips) > 0.5,
      'streamer tips must stagger, not line up',
    );
    // The ground-level sweep: the hem spans wide on both sides.
    assert.ok(
      hemR - hemL > 2.0,
      `the hem only sweeps ${(hemR - hemL).toFixed(2)} tiles`,
    );
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
