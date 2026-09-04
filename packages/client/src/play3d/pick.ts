/**
 * THE HAND FINDS THE GROUND (play3d S2) — pure ray-vs-heightfield pick.
 *
 * The ground is a function `heightAt(x, z)` (bilinear over tile
 * levels, ramps sloped — heightfield.ts), not a mesh to intersect, so
 * the pick MARCHES: step the ray from the near plane until it dips
 * under the surface, then bisect the last interval. The step is
 * ADAPTIVE — a quarter tile near the surface, up to a tile and a half
 * while the ray is still high above it — so a pick costs tens of
 * samples, not hundreds; a ray that points level or up from above the
 * ground can never land and returns at once. Exact enough for a tile
 * pick, and it never allocates: the caller passes the ray, the result
 * is written into `out`. Cliff faces are vertical, so a ray that
 * enters a plateau's face registers on the first sample under the top
 * — the tile the player would read as "that cliff".
 */

export interface PickRay {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface PickHit {
  x: number;
  y: number;
  z: number;
  /** Distance along the ray, or -1 when nothing was hit within range. */
  t: number;
}

const STEP_MIN = 0.25;
const STEP_MAX = 1.5;
const BISECT = 6;

export function pickGround(
  ray: PickRay,
  heightAt: (x: number, z: number) => number,
  maxDist: number,
  out: PickHit,
): boolean {
  let tPrev = 0;
  let above = ray.oy - heightAt(ray.ox, ray.oz);
  if (above <= 0) {
    // Camera under the ground (clipping a cliff): report the point itself.
    out.x = ray.ox;
    out.y = ray.oy;
    out.z = ray.oz;
    out.t = 0;
    return true;
  }
  if (ray.dy >= 0) {
    // Level or climbing from above the ground: a sky ray, at once.
    out.t = -1;
    return false;
  }
  for (let t = STEP_MIN; t <= maxDist; ) {
    const x = ray.ox + ray.dx * t;
    const y = ray.oy + ray.dy * t;
    const z = ray.oz + ray.dz * t;
    const d = y - heightAt(x, z);
    if (d <= 0) {
      let lo = tPrev;
      let hi = t;
      for (let i = 0; i < BISECT; i++) {
        const m = (lo + hi) / 2;
        const my = ray.oy + ray.dy * m - heightAt(ray.ox + ray.dx * m, ray.oz + ray.dz * m);
        if (my <= 0) hi = m;
        else lo = m;
      }
      const th = (lo + hi) / 2;
      out.x = ray.ox + ray.dx * th;
      out.y = ray.oy + ray.dy * th;
      out.z = ray.oz + ray.dz * th;
      out.t = th;
      return true;
    }
    tPrev = t;
    above = d;
    // Stride by how high the ray still is (it drops |dy| per unit t).
    const step = Math.max(STEP_MIN, Math.min(STEP_MAX, (above * 0.5) / -ray.dy));
    t += step;
  }
  out.t = -1;
  return false;
}
