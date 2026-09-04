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
export declare const CROWN_TPT_MIN = 6;
export declare const CROWN_TPT_MAX = 160;
/** Hard cap on either UV dimension (device px). */
export declare const CROWN_UV_MAX = 2048;
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
export declare function crownUvSig(pbKey: number, scaleBucket: number, dprBits: number, matClass: number, uvW: number, uvH: number): number;
/** The bounded UV texel size for a span of `wTiles`×`hTiles` at the given
 *  texels-per-tile (`camera.scale · dpr`, clamped). Bounded by CROWN_UV_MAX. */
export declare function crownUvSize(wTiles: number, hTiles: number, scale: number, dpr: number): {
    uvW: number;
    uvH: number;
    tpt: number;
};
/** The zoom bucket the sig quantizes `camera.scale` into (a zoom-glide within
 *  a bucket reuses the texture; crossing it re-bakes — the warp-down cadence). */
export declare function crownScaleBucket(scale: number): number;
//# sourceMappingURL=structWarp.d.ts.map