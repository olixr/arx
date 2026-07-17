/** Anything that can answer "is this tile solid?" — maps, generated chunks. */
export interface CollisionSource {
  isSolid(tileX: number, tileY: number): boolean;
}

export const NO_COLLISION: CollisionSource = {
  isSolid: () => false,
};

/**
 * Circle-vs-tilemap test: does a body of `radius` at (x, y) overlap any
 * solid tile? Positions are in tile units; tile (tx, ty) spans
 * [tx, tx+1) x [ty, ty+1).
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
