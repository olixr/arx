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
export declare function pickGround(ray: PickRay, heightAt: (x: number, z: number) => number, maxDist: number, out: PickHit): boolean;
//# sourceMappingURL=pick.d.ts.map