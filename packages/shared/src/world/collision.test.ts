import assert from 'node:assert/strict';
import { test } from 'node:test';
import { circleHitsSolid, footprintBlocked, pointHitsShot, pointHitsSolid, SHOT_TRUNK_K, type CollisionSource } from './collision.js';
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

/** A two-foot prop at (5,5) on open ground. */
function worldWithProp(tile: Tile): CollisionSource {
  return {
    isSolid: (tx, ty) => tx === 5 && ty === 5,
    tileAt: (tx, ty) => (tx === 5 && ty === 5 ? tile : Tile.Grass),
  };
}

test('THE CART HAS TWO FEET: the belongings cart blocks the tile under its shafts (west)', () => {
  const w = worldWithProp(Tile.BelongingsCart);
  assert.equal(footprintBlocked(w, 4, 5), true, 'the west neighbour is the second foot');
  assert.equal(footprintBlocked(w, 6, 5), false, 'the east neighbour stays open');
  assert.equal(footprintBlocked(w, 5, 4), false);
  assert.equal(footprintBlocked(w, 5, 6), false);
  // A body standing in the shafts' tile is blocked as by a wall...
  assert.equal(circleHitsSolid(w, 4.5, 5.5, 0.25), true);
  assert.equal(pointHitsSolid(w, 4.5, 5.5), true);
  // ...and one just past the second foot's west edge walks free.
  assert.equal(circleHitsSolid(w, 3.7, 5.5, 0.25), false);
  // The east side is a one-tile wall as before.
  assert.equal(circleHitsSolid(w, 6.2, 5.5, 0.25), true);
  assert.equal(circleHitsSolid(w, 6.3, 5.5, 0.25), false);
  // Shots cross the resting shafts at chest height: only the cart's own tile stops one.
  assert.equal(pointHitsShot(w, 4.5, 5.5), false);
  assert.equal(pointHitsShot(w, 5.5, 5.5), true);
});

test('THE CART HAS TWO FEET: the cot reaches east, the lean-to and the broken cart west', () => {
  assert.equal(footprintBlocked(worldWithProp(Tile.FieldCot), 6, 5), true);
  assert.equal(footprintBlocked(worldWithProp(Tile.FieldCot), 4, 5), false);
  assert.equal(footprintBlocked(worldWithProp(Tile.LeanTo), 4, 5), true);
  assert.equal(footprintBlocked(worldWithProp(Tile.BrokenCart), 4, 5), true);
  // A one-tile solid owns no second foot.
  assert.equal(footprintBlocked(worldWithProp(Tile.WallStone), 4, 5), false);
  // Sources without tileAt cannot see a footprint.
  const blind: CollisionSource = { isSolid: (tx, ty) => tx === 5 && ty === 5 };
  assert.equal(footprintBlocked(blind, 4, 5), false);
  assert.equal(circleHitsSolid(blind, 4.5, 5.5, 0.25), false);
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

test('THE SHOT SEES THE SLIM TRUNK: flight tests a slimmer core than the walk base', () => {
  const w = worldWith(Tile.TreeOak); // flared base radius 0.38
  const r = 0.38;
  const slim = r * SHOT_TRUNK_K;
  // The annulus between the slim trunk and the flared base: a walking
  // body still collides (roots underfoot), a shot at chest height
  // slips past — this band is what makes a forest shootable-through.
  const mid = (slim + r) / 2;
  assert.equal(pointHitsSolid(w, 5.5 + mid, 5.5), true);
  assert.equal(pointHitsShot(w, 5.5 + mid, 5.5), false);
  // The trunk core stops a shot dead.
  assert.equal(pointHitsShot(w, 5.5 + slim * 0.9, 5.5), true);
  // Canopy air (the tile corner) was never a hitbox and still isn't.
  assert.equal(pointHitsShot(w, 5.05, 5.05), false);
});

test('shots keep full-block collision on walls and blind sources', () => {
  const wall = worldWith(Tile.WallStone);
  assert.equal(pointHitsShot(wall, 5.05, 5.05), true);
  const blind: CollisionSource = { isSolid: (tx, ty) => tx === 5 && ty === 5 };
  assert.equal(pointHitsShot(blind, 5.05, 5.05), true);
});

test('THE SHOT OVERFLIES THE WATER: deep water blocks boots, never flight', () => {
  const w = worldWith(Tile.WaterDeep);
  // Boots cannot enter the deep...
  assert.equal(circleHitsSolid(w, 5.5, 5.5, 0.25), true);
  // ...but a chest-height shot crosses clean.
  assert.equal(pointHitsShot(w, 5.5, 5.5), false);
  assert.equal(pointHitsSolid(w, 5.5, 5.5), true); // debris still splashes short
});
