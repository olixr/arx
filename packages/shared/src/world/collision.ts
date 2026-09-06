import { footprintCoveredAt, isFishingTile, Tile, tileColliderRadius } from './tiles.js';

/** Anything that can answer "is this tile solid?" — maps, generated chunks. */
export interface CollisionSource {
  isSolid(tileX: number, tileY: number): boolean;
  /**
   * Optional: the ground tile id, enabling sub-tile colliders — trees
   * and rocks collide as centered circles instead of full blocks.
   * Sources without it fall back to full-tile collision.
   */
  tileAt?(tileX: number, tileY: number): number | undefined;
}

export const NO_COLLISION: CollisionSource = {
  isSolid: () => false,
};

/** The collider radius of a solid tile, or null for a full-block solid. */
function solidRadius(src: CollisionSource, tx: number, ty: number): number | null {
  if (!src.tileAt) return null;
  const tile = src.tileAt(tx, ty);
  return tile === undefined ? null : tileColliderRadius(tile);
}

/**
 * THE CART HAS TWO FEET (tiles.ts FOOTPRINT): an open tile is still
 * blocked to boots when a two-foot prop beside it reaches into it —
 * the belongings cart's shafts, the lean-to's skirt, the cot's far
 * trestle, the broken cart's spilled sacks. The second foot is a
 * full block (the art fills it edge to edge on the foot line), never
 * a centered radius. Sources without `tileAt` cannot see a footprint
 * and keep their one-tile world, exactly as they keep full-tile
 * collision. Shared by the walk collider, the point test and the nav
 * grid (pathfind.ts), so server, client prediction and NPC paths all
 * stop at the same canvas — the netcode determinism law.
 */
export function footprintBlocked(src: CollisionSource, tx: number, ty: number): boolean {
  if (!src.tileAt) return false;
  return footprintCoveredAt(src.tileAt.bind(src), tx, ty);
}

/**
 * Circle-vs-tilemap test: does a body of `radius` at (x, y) overlap any
 * solid tile? Positions are in tile units; tile (tx, ty) spans
 * [tx, tx+1) x [ty, ty+1). Centered-mass tiles (trees, rocks) test as
 * circles at the tile centre — the rest as full AABBs. A two-foot
 * prop's second foot (footprintBlocked) tests as a full AABB too.
 */
export function circleHitsSolid(
  src: CollisionSource,
  x: number,
  y: number,
  radius: number,
): boolean {
  const minTx = Math.floor(x - radius);
  const maxTx = Math.floor(x + radius);
  const minTy = Math.floor(y - radius);
  const maxTy = Math.floor(y + radius);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!src.isSolid(tx, ty)) {
        if (!footprintBlocked(src, tx, ty)) continue;
        // The second foot: a full block, tested below like a wall.
      } else {
        const r = solidRadius(src, tx, ty);
        if (r !== null) {
          // Circle-vs-circle against the trunk/boulder at the centre.
          const dx = x - (tx + 0.5);
          const dy = y - (ty + 0.5);
          if (dx * dx + dy * dy < (radius + r) * (radius + r)) return true;
          continue;
        }
      }
      // Closest point on the tile AABB to the circle center.
      const cx = Math.max(tx, Math.min(x, tx + 1));
      const cy = Math.max(ty, Math.min(y, ty + 1));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

/**
 * Point-vs-tilemap test with the same shape law — the projectile's
 * view of the world: a shot entering a tree's tile only dies when it
 * reaches the trunk. A two-foot prop's second foot is solid to a
 * point on the ground (a dropped item, a spawn probe) as it is to
 * boots.
 */
export function pointHitsSolid(src: CollisionSource, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!src.isSolid(tx, ty)) return footprintBlocked(src, tx, ty);
  const r = solidRadius(src, tx, ty);
  if (r === null) return true;
  const dx = x - (tx + 0.5);
  const dy = y - (ty + 0.5);
  return dx * dx + dy * dy < r * r;
}

/**
 * THE SHOT SEES THE SLIM TRUNK: the walk collider's centered radii
 * track the DRAWN FLARED BASE (roots spread where boots meet them),
 * but a shot crosses at chest height, where the trunk has tapered —
 * so projectiles test centered masses at a slimmer radius, and a
 * forest is genuinely shootable-through while real wood still stops
 * an arrow dead. Canopies never had a hitbox and never will: the only
 * matter a shot can meet in a tree's tile is the trunk core. Full
 * blocks (walls, doors, cliffs) are unchanged. Server flight, beams,
 * the client's predicted tracers and the renderer's extrapolation
 * clamp all share THIS predicate — the netcode determinism law.
 */
export const SHOT_TRUNK_K = 0.7;

/** THE SHOT OVERFLIES THE WATER: open water is solid to BOOTS (you
 *  cannot walk into the deep), but a shot crosses at chest height and
 *  water has no mass up there — an arrow that died on a stream's
 *  surface read as hitting an invisible wall. Same physical logic as
 *  the canopy rule: solidity-to-walking is not solidity-to-flight. */
function shotOverflies(src: CollisionSource, tx: number, ty: number): boolean {
  if (!src.tileAt) return false;
  const t = src.tileAt(tx, ty);
  return (
    t === Tile.Water || t === Tile.WaterDeep || t === Tile.WaterShallow || isFishingTile(t)
  );
}

/**
 * A two-foot prop's second foot never stops a shot: the resting
 * shafts, the pegged skirt and the spilled sacks all lie under chest
 * height (the water rule's cousin), so this test reads only the
 * tile's own solidity, as it always did.
 */
export function pointHitsShot(src: CollisionSource, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!src.isSolid(tx, ty)) return false;
  if (shotOverflies(src, tx, ty)) return false;
  const r = solidRadius(src, tx, ty);
  if (r === null) return true;
  const rs = r * SHOT_TRUNK_K;
  const dx = x - (tx + 0.5);
  const dy = y - (ty + 0.5);
  return dx * dx + dy * dy < rs * rs;
}
