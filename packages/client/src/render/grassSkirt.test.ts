import test from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import {
  grassRootedSkirtAt,
  isGrassTile,
  isSkirtEligibleTile,
  isNaturalWild,
  skirtStrengthForTile,
  grassSidesMask,
  wallSkirtSidesAt,
  SIDE_N,
  SIDE_S,
  SIDE_W,
  SIDE_E,
  SIDE_ALL,
  SKIRT_MIN_GRASS_NEIGHBORS,
} from './grassSkirt.js';
import { generateSkirtBlades } from './grass.js';

test('isGrassTile accepts short + tall grass, rejects the rest', () => {
  assert.equal(isGrassTile(Tile.Grass), true);
  assert.equal(isGrassTile(Tile.GrassTall), true);
  assert.equal(isGrassTile(Tile.Path), false);
  assert.equal(isGrassTile(Tile.Water), false);
  assert.equal(isGrassTile(undefined), false);
});

test('isNaturalWild covers trees, rocks, saplings, stump and wild plants', () => {
  assert.equal(isNaturalWild(Tile.TreeOak), true);
  assert.equal(isNaturalWild(Tile.Rock), true);
  assert.equal(isNaturalWild(Tile.SaplingPine), true);
  assert.equal(isNaturalWild(Tile.Stump), true);
  assert.equal(isNaturalWild(Tile.BerryBush), true);
  assert.equal(isNaturalWild(Tile.Path), false);
});

test('crops are never skirt-eligible (tilled earth, not wild meadow)', () => {
  assert.equal(isSkirtEligibleTile(Tile.TreeOak), true);
  // A crop tile: isCropTile gates it out.
  assert.equal(isSkirtEligibleTile(Tile.CropSprout), false);
});

// A ground sampler backed by a sparse map (undefined = off-map).
function sampler(tiles: Record<string, Tile>): (tx: number, ty: number) => number | undefined {
  return (tx, ty) => tiles[`${tx},${ty}`];
}

test('grassRootedSkirtAt: a tree ringed by meadow is rooted', () => {
  const s = sampler({
    '0,0': Tile.TreeOak,
    '0,-1': Tile.Grass,
    '0,1': Tile.Grass,
    '-1,0': Tile.GrassTall,
    '1,0': Tile.Grass,
  });
  assert.equal(grassRootedSkirtAt(s, 0, 0, Tile.TreeOak), true);
});

test('grassRootedSkirtAt: a tree in a stone courtyard is NOT rooted', () => {
  const s = sampler({
    '0,0': Tile.TreeOak,
    '0,-1': Tile.Path,
    '0,1': Tile.Path,
    '-1,0': Tile.Path,
    '1,0': Tile.Path,
  });
  assert.equal(grassRootedSkirtAt(s, 0, 0, Tile.TreeOak), false);
});

test('grassRootedSkirtAt: a field-edge object (2 of 4 grassy) still roots', () => {
  const s = sampler({
    '0,0': Tile.Rock,
    '0,-1': Tile.Grass,
    '0,1': Tile.Grass,
    '-1,0': Tile.Path,
    '1,0': Tile.Path,
  });
  assert.equal(SKIRT_MIN_GRASS_NEIGHBORS, 2);
  assert.equal(grassRootedSkirtAt(s, 0, 0, Tile.Rock), true);
});

test('grassRootedSkirtAt: one grassy neighbour is below threshold', () => {
  const s = sampler({
    '0,0': Tile.Rock,
    '0,-1': Tile.Grass,
    '0,1': Tile.Path,
    '-1,0': Tile.Path,
    '1,0': Tile.Path,
  });
  assert.equal(grassRootedSkirtAt(s, 0, 0, Tile.Rock), false);
});

test('grassRootedSkirtAt: a crop in grass gets no skirt (ineligible kind)', () => {
  const s = sampler({
    '0,-1': Tile.Grass,
    '0,1': Tile.Grass,
    '-1,0': Tile.Grass,
    '1,0': Tile.Grass,
  });
  assert.equal(grassRootedSkirtAt(s, 0, 0, Tile.CropSprout), false);
});

test('generateSkirtBlades: deterministic, tuft-sized, nestles the foot', () => {
  const a = generateSkirtBlades(3, 7, 7.9);
  const b = generateSkirtBlades(3, 7, 7.9);
  // Deterministic per tile.
  assert.deepEqual(JSON.stringify(a), JSON.stringify(b));
  // A dispersed tuft, not a hedge — the grass-elevate pass widened it (a
  // few blades are thinned from the outer rim, so the count sits under `full`).
  assert.ok(a.length >= 16 && a.length <= 31, `count ${a.length}`);
  // Sorted back-to-front by world-y (the GPU draws opaque, order is depth).
  for (let i = 1; i < a.length; i++) assert.ok(a[i]!.by >= a[i - 1]!.by);
  // Blades scatter around (tx+0.5, footY) over a WIDER, ground-squashed ellipse
  // (a full tile of reach, half that in y), staying short enough never to
  // swallow the object.
  for (const bl of a) {
    assert.ok(Math.abs(bl.bx - 3.5) <= 1.1, `bx ${bl.bx}`);
    assert.ok(Math.abs(bl.by - 7.9) <= 0.6, `by ${bl.by}`);
    assert.ok(bl.h > 0 && bl.h <= 0.7, `h ${bl.h}`);
    assert.ok(bl.tone >= 0 && bl.tone <= 4, `tone ${bl.tone}`);
  }
});

test('generateSkirtBlades: DISPERSED + organic — a wide, irregular patch, not a tight collar', () => {
  // The grass-elevate pass makes the skirt read as grass that GREW around the
  // foot: blades spread across a wide area with an irregular outline and gaps,
  // instead of a dense ring hugging the trunk.
  const tree = generateSkirtBlades(9, 4, 4.5, 1); // full-strength wild
  const cx = 9.5;
  const radii = tree.map((b) => Math.hypot(b.bx - cx, (b.by - 4.5) / 0.5));
  const maxR = Math.max(...radii);
  // Genuinely WIDE reach — the old collar clustered inside ~0.5t; now some
  // blades reach out past 0.7t (per-direction lobe pushes fingers of grass out).
  assert.ok(maxR > 0.7, `reach ${maxR} should exceed a tight collar`);
  // DISPERSED, not clustered at the foot: a real fraction of the tuft sits in
  // the outer half of the patch (a hard-inward u^1.7 collar would leave it bare).
  const outer = radii.filter((r) => r > maxR * 0.5).length;
  assert.ok(outer >= tree.length * 0.25, `only ${outer}/${tree.length} blades reach the outer half`);
  // IRREGULAR outline: the reach varies a lot around the ring (a clean disc
  // would have near-uniform max radius) — measured as spread across the radii.
  const mean = radii.reduce((s, r) => s + r, 0) / radii.length;
  const variance = radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length;
  assert.ok(variance > 0.02, `patch too uniform (variance ${variance})`);
});

test('generateSkirtBlades: different tiles differ (not a stamped ring)', () => {
  const a = JSON.stringify(generateSkirtBlades(3, 7, 7.9));
  const b = JSON.stringify(generateSkirtBlades(4, 7, 7.9));
  assert.notEqual(a, b);
});

// ---------------------------------------------------------- per-type strength

test('skirtStrengthForTile: rocks back WAY off, trees stay full, walls subtle', () => {
  // A low rock must not be swallowed — a bare few short wisps at most.
  assert.ok(skirtStrengthForTile(Tile.Rock) <= 0.3, 'rock skirt is minimal');
  assert.ok(skirtStrengthForTile(Tile.RockIron) <= 0.3, 'ore rock skirt is minimal');
  // A tall tree keeps the full embedded collar (no regression).
  assert.equal(skirtStrengthForTile(Tile.TreeOak), 1);
  assert.equal(skirtStrengthForTile(Tile.BerryBush), 1);
  // A building foot gets a subtle, low nestle — present but not full.
  const wall = skirtStrengthForTile(Tile.WallStone);
  assert.ok(wall > 0 && wall < 1, `wall skirt subtle (${wall})`);
  // Everything else: a modest nestle.
  assert.ok(skirtStrengthForTile(Tile.LampPost) > 0);
});

test('generateSkirtBlades: a rock (low strength) is a handful of SHORT wisps', () => {
  const rock = generateSkirtBlades(3, 7, 7.9, skirtStrengthForTile(Tile.Rock));
  const tree = generateSkirtBlades(3, 7, 7.9, skirtStrengthForTile(Tile.TreeOak));
  // Far fewer blades than a tree's lush collar.
  assert.ok(rock.length < tree.length, `rock ${rock.length} < tree ${tree.length}`);
  assert.ok(rock.length <= 8 && rock.length >= 3, `rock count ${rock.length}`);
  // And SHORTER — a rock's wisps never climb it the way a tree's do.
  const rockMax = Math.max(...rock.map((b) => b.h));
  const treeMax = Math.max(...tree.map((b) => b.h));
  assert.ok(rockMax < treeMax, `rock tips ${rockMax} < tree tips ${treeMax}`);
  // Still deterministic.
  assert.equal(
    JSON.stringify(rock),
    JSON.stringify(generateSkirtBlades(3, 7, 7.9, skirtStrengthForTile(Tile.Rock))),
  );
});

test('generateSkirtBlades: zero strength emits nothing', () => {
  assert.equal(generateSkirtBlades(3, 7, 7.9, 0).length, 0);
});

test('generateSkirtBlades: a wall skirt (south edge only) stays on its grass side', () => {
  // Grass to the SOUTH only → every blade must sit at/below the foot row,
  // never north of it (that would sprout grass out of the wall's back).
  const blades = generateSkirtBlades(3, 7, 8, 0.5, SIDE_S);
  assert.ok(blades.length > 0);
  for (const b of blades) {
    assert.ok(b.by >= 8 - 0.02, `blade by ${b.by} should not reach north of foot`);
  }
});

// ---------------------------------------------------------- building predicate

function sampler2(tiles: Record<string, Tile>): (tx: number, ty: number) => number | undefined {
  return (tx, ty) => tiles[`${tx},${ty}`];
}

test('grassSidesMask: reports exactly the grass-facing edges', () => {
  const s = sampler2({ '0,1': Tile.Grass, '1,0': Tile.GrassTall, '0,-1': Tile.Path, '-1,0': Tile.Water });
  const m = grassSidesMask(s, 0, 0);
  assert.equal(m & SIDE_S, SIDE_S, 'south grass set');
  assert.equal(m & SIDE_E, SIDE_E, 'east grass set');
  assert.equal(m & SIDE_N, 0, 'north path unset');
  assert.equal(m & SIDE_W, 0, 'west water unset');
});

test('wallSkirtSidesAt: a wall foot on grass skirts its grass edge only', () => {
  const s = sampler2({
    '0,0': Tile.WallStone,
    '0,1': Tile.Grass, // south foot meets meadow
    '0,-1': Tile.Path, // interior/back — no skirt
    '-1,0': Tile.WallStone, // neighbouring wall — no skirt
    '1,0': Tile.WallStone,
  });
  const sides = wallSkirtSidesAt(s, 0, 0, Tile.WallStone);
  assert.equal(sides, SIDE_S, 'only the south grass edge skirts');
});

test('wallSkirtSidesAt: a wall with no grass neighbour gets no skirt', () => {
  const s = sampler2({
    '0,0': Tile.WallStone,
    '0,1': Tile.WoodFloor,
    '0,-1': Tile.Path,
    '-1,0': Tile.WallStone,
    '1,0': Tile.Path,
  });
  assert.equal(wallSkirtSidesAt(s, 0, 0, Tile.WallStone), 0);
});

test('wallSkirtSidesAt: a non-wall tile is not a building foot', () => {
  const s = sampler2({ '0,1': Tile.Grass });
  assert.equal(wallSkirtSidesAt(s, 0, 0, Tile.TreeOak), 0);
  assert.equal(SIDE_ALL, SIDE_N | SIDE_S | SIDE_W | SIDE_E);
});
