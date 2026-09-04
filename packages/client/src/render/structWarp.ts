/**
 * THE ONE RENDER — B8: warp-don't-repaint for structure crowns.
 *
 * A wall/stone/dark crown SPAN's ART (fill + the arris/spine/lip beam read)
 * is CAMERA-INDEPENDENT in the crown's own UV plane — only the four projected
 * corners change as the camera leans, zooms or pans. So the crown texture is
 * baked ONCE into an axis-aligned UV canvas keyed by its CONTENT signature
 * and drawn each frame as a perspective-correct quad over that cached texture
 * (the same `StageQuad.ground` mechanism the ground chunks lean through) —
 * retiring the per-frame re-paint + re-upload of the projected trapezoid into
 * the world scratch lane that the static keyed cache could not hold under
 * lean (it warps with the camera).
 *
 * This module holds the PURE pieces of that scheme so the invariants are
 * node-testable off the same code the renderer runs:
 *  - `crownUvSig`  — the content signature (camera-independent by construction).
 *  - `crownUvSize` — the bounded UV texel size for a span.
 *  - `CROWN_BANDS` — the beam-read band layout, shared by the UV bake.
 */

/** Texels-per-tile bounds: the UV texture tracks on-screen density but stays
 *  bounded (content-sized, never screen-sized) so a zoomed-in lean can never
 *  mint a giant texture the way a screen-space scratch cell does. */
export const CROWN_TPT_MIN = 6;
export const CROWN_TPT_MAX = 160;
/** Hard cap on either UV dimension (device px). */
export const CROWN_UV_MAX = 2048;

/**
 * The crown UV texture's CONTENT signature. Pure so the invariant is pinned
 * by test: the sig is a function of the span's identity (`pbKey`), material,
 * UV size in texels and dpr ONLY — NEVER the camera's position, pan,
 * zoom-within-a-bucket or q. Two frames whose camera merely moved (same zoom
 * bucket + dpr) hash EQUAL, so the texture is reused (no re-bake, no
 * re-upload); a real content change — a chunk edit bumping `pbKey`, a zoom
 * crossing the bucket, a dpr flip, or a size change — hashes DIFFERENT, so
 * the cache re-bakes and re-uploads. That camera-independence is what lets
 * the crown WARP instead of RE-PAINT.
 */
export function crownUvSig(
  pbKey: number,
  scaleBucket: number,
  dprBits: number,
  matClass: number,
  uvW: number,
  uvH: number,
): number {
  return (
    (Math.imul(pbKey | 0, 0x9e3779b1) ^
      (scaleBucket & 0xffff) ^
      (matClass << 17) ^
      ((dprBits & 0x3f) << 20) ^
      Math.imul(uvW | 0, 0x85ebca6b) ^
      Math.imul(uvH | 0, 0xc2b2ae35)) |
    0
  );
}

/** The bounded UV texel size for a span of `wTiles`×`hTiles` at the given
 *  texels-per-tile (`camera.scale · dpr`, clamped). Bounded by CROWN_UV_MAX. */
export function crownUvSize(
  wTiles: number,
  hTiles: number,
  scale: number,
  dpr: number,
): { uvW: number; uvH: number; tpt: number } {
  const tpt = Math.max(CROWN_TPT_MIN, Math.min(CROWN_TPT_MAX, scale * dpr));
  const uvW = Math.max(1, Math.min(CROWN_UV_MAX, Math.round(wTiles * tpt)));
  const uvH = Math.max(1, Math.min(CROWN_UV_MAX, Math.round(hTiles * tpt)));
  return { uvW, uvH, tpt };
}

/** The zoom bucket the sig quantizes `camera.scale` into (a zoom-glide within
 *  a bucket reuses the texture; crossing it re-bakes — the warp-down cadence). */
export function crownScaleBucket(scale: number): number {
  return Math.round(scale * 4);
}
