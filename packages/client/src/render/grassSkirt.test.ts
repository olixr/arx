import test from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import {
  grassRootedSkirtAt,
  isGrassTile,
  isSkirtEligibleTile,
  isNaturalWild,
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

test('generateSkirtBlades: deterministic, tuft-sized, hugs the foot', () => {
  const a = generateSkirtBlades(3, 7, 7.9);
  const b = generateSkirtBlades(3, 7, 7.9);
  // Deterministic per tile.
  assert.deepEqual(JSON.stringify(a), JSON.stringify(b));
  // A tuft, not a hedge.
  assert.ok(a.length >= 20 && a.length <= 27, `count ${a.length}`);
  // Sorted back-to-front by world-y (the GPU draws opaque, order is depth).
  for (let i = 1; i < a.length; i++) assert.ok(a[i]!.by >= a[i - 1]!.by);
  // Blades cluster around (tx+0.5, footY) within a ~half-tile ellipse, and
  // stay short (a small rise, never swallowing the object).
  for (const bl of a) {
    assert.ok(Math.abs(bl.bx - 3.5) <= 0.5, `bx ${bl.bx}`);
    assert.ok(Math.abs(bl.by - 7.9) <= 0.35, `by ${bl.by}`);
    assert.ok(bl.h > 0 && bl.h <= 0.6, `h ${bl.h}`);
    assert.ok(bl.tone >= 0 && bl.tone <= 4, `tone ${bl.tone}`);
  }
});

test('generateSkirtBlades: different tiles differ (not a stamped ring)', () => {
  const a = JSON.stringify(generateSkirtBlades(3, 7, 7.9));
  const b = JSON.stringify(generateSkirtBlades(4, 7, 7.9));
  assert.notEqual(a, b);
});
