import { tileColliderRadius } from './tiles.js';

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
 * Circle-vs-tilemap test: does a body of `radius` at (x, y) overlap any
 * solid tile? Positions are in tile units; tile (tx, ty) spans
 * [tx, tx+1) x [ty, ty+1). Centered-mass tiles (trees, rocks) test as
 * circles at the tile centre — the rest as full AABBs.
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
      if (!src.isSolid(tx, ty)) continue;
      const r = solidRadius(src, tx, ty);
      if (r !== null) {
        // Circle-vs-circle against the trunk/boulder at the centre.
        const dx = x - (tx + 0.5);
        const dy = y - (ty + 0.5);
        if (dx * dx + dy * dy < (radius + r) * (radius + r)) return true;
        continue;
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
 * reaches the trunk.
 */
export function pointHitsSolid(src: CollisionSource, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!src.isSolid(tx, ty)) return false;
  const r = solidRadius(src, tx, ty);
  if (r === null) return true;
  const dx = x - (tx + 0.5);
  const dy = y - (ty + 0.5);
  return dx * dx + dy * dy < r * r;
}
