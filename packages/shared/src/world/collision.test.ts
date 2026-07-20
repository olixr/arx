import assert from 'node:assert/strict';
import { test } from 'node:test';
import { circleHitsSolid, pointHitsSolid, type CollisionSource } from './collision.js';
import { Tile } from './tiles.js';

/** One solid tile at (5,5) of the given kind; everything else open. */
function worldWith(tile: Tile): CollisionSource {
  return {
    isSolid: (tx, ty) => tx === 5 && ty === 5,
    tileAt: (tx, ty) => (tx === 5 && ty === 5 ? tile : Tile.Grass),
  };
}

test('full-block solids keep AABB collision', () => {
  const w = worldWith(Tile.WallStone);
  // A body just outside the tile edge misses; pressing in hits.
  assert.equal(circleHitsSolid(w, 4.7, 5.5, 0.25), false);
  assert.equal(circleHitsSolid(w, 4.8, 5.5, 0.25), true);
  // The tile corner blocks a full-block solid.
  assert.equal(circleHitsSolid(w, 4.9, 4.9, 0.25), true);
  // Any interior point is solid to a projectile.
  assert.equal(pointHitsSolid(w, 5.05, 5.05), true);
});

test('trees collide as a trunk circle, not the whole tile', () => {
  const w = worldWith(Tile.Tree); // trunk radius 0.3
  // The old AABB hit at the edge is now clear — you brush past the tile.
  assert.equal(circleHitsSolid(w, 4.8, 5.5, 0.25), false);
  // The tile corner is walkable space under the canopy.
  assert.equal(circleHitsSolid(w, 5.08, 5.08, 0.25), false);
  // The trunk itself still stops a body.
  assert.equal(circleHitsSolid(w, 5.5, 5.02, 0.25), true);
  // Arrows fly through the tile corner and die on the trunk.
  assert.equal(pointHitsSolid(w, 5.05, 5.05), false);
  assert.equal(pointHitsSolid(w, 5.45, 5.4), true);
});

test('sources without tileAt fall back to full-tile collision', () => {
  const w: CollisionSource = { isSolid: (tx, ty) => tx === 5 && ty === 5 };
  assert.equal(circleHitsSolid(w, 4.8, 5.5, 0.25), true);
  assert.equal(pointHitsSolid(w, 5.05, 5.05), true);
});

test('rocks carry a wider boulder circle than trees', () => {
  const w = worldWith(Tile.RockIron); // 0.46
  assert.equal(pointHitsSolid(w, 5.5 + 0.4, 5.5), true);
  assert.equal(pointHitsSolid(w, 5.5 + 0.48, 5.5), false);
});
