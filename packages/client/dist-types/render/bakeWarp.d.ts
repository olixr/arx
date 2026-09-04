/**
 * THE ONE RENDER, B5 — WARP-DOWN, don't re-bake on depth. Pure policy
 * for the perspective-native bake/LOD contract, as arithmetic pinned by
 * node tests.
 *
 * The lean homography is a CONTINUOUS magnification of a flat texture,
 * and the GL stage already warps a baked chunk/sprite texture
 * perspective-correct (StageQuad.ground / the depth-scaled blit). So a
 * texture baked ONCE at the resolution it needs at its NEAREST plausible
 * on-screen depth is crisp at every FARTHER depth for free — far is
 * minification, and minifying an already-dense texture never softens it.
 * The old contract instead re-baked a chunk when its depth crossed a
 * NEAR/FAR tier boundary and re-baked a sprite when its LOD tier
 * stepped, which
 *
 *   - flipped detail hi/lo intermittently as the camera moved, and
 *   - left a near chunk carried in at the coarse tier BLURRY until the
 *     player WALKED (walking mints fresh chunks at the right tier), the
 *     "had to walk around to get the screen to refresh" field report,
 *   - churned uploads (every crossing = a re-bake = a re-upload).
 *
 * Two moves live here:
 *   B5a — bake at the near-worst resolution, WARP it down to the current
 *         depth; never re-bake on a depth crossing (only on CONTENT).
 *   B5b — a STATIONARY resolution-deficit check: a near chunk whose
 *         current depth out-resolves its baked texture is topped up
 *         through a priority lane bounded to the near ring — so standing
 *         still resolves sharp within a frame or two, no motion needed.
 *
 * Every function returns the flat answer at q=0 (depthScale 1), so the
 * renderer's q=0 path stays the flat look the golden gate pins.
 */
/**
 * B5a — the bake resolution for ONE ground chunk under a lean.
 *
 * `depthScaleNearEdge` is the depthScale at the chunk's NEAREST (south)
 * row — a chunk magnifies most at its near edge, so that row decides
 * whether the chunk can be blown up in the near field. If it is at or
 * past the look-at row (depthScale ≥ 1) the chunk is near-band ELIGIBLE
 * and bakes at the dense `nearPx` tier (which covers the whole near band
 * up to the clamped max lean — warp-down handles everything farther). A
 * chunk whose near edge is still north of the look-at only ever minifies,
 * so the sparse `farPx` tier is oversampled and stays crisp.
 *
 * This is a ONE-TIME decision taken at mint: the caller never re-bakes a
 * chunk because its depth later crossed the boundary (that churn is what
 * B5a retires) — a receding near chunk keeps its dense texture and warps
 * down; a near chunk carried in sparse is topped up by the B5b lane, not
 * by a depth-driven re-bake.
 */
export declare function chunkNearBandEligible(depthScaleNearEdge: number): boolean;
export declare function chunkBakePxWarp(nearPx: number, farPx: number, depthScaleNearEdge: number): number;
/**
 * B5b — the resolution DEFICIT test: a cached chunk holds `bakedPx`
 * texels/tile but its CURRENT depth wants `wantedPx`. A deficit
 * (`wantedPx > bakedPx`) means the chunk is being warped UP from too few
 * texels — blurry though the world is still. This is distinct from a
 * content re-bake: it is a one-time resolution top-up, and the caller
 * runs it on a priority lane that is NOT paced by the glide/replace cap.
 * A surplus (a receding chunk that baked dense) is never a deficit —
 * warp-down keeps it crisp — so this never triggers a downgrade re-bake.
 */
export declare function chunkResDeficit(bakedPx: number, wantedPx: number): boolean;
/**
 * B5b — near-ring membership. The stationary deficit lane is bounded to a
 * small fixed ring under the player (Chebyshev `radius` chunks from the
 * camera's chunk) so a whole leaned viewport's worth of far chunks can
 * never flood the priority lane. radius 1 = the 3×3 = 9 chunks beneath
 * and around the player, the near field that actually magnifies.
 */
export declare function inNearRing(cx: number, cy: number, camCx: number, camCy: number, radius: number): boolean;
/**
 * B5a — the sprite depth LOD tier, WARP-DOWN. `depthScale` is the factor
 * at the sprite's foot; `curTier` (if the sprite is already baked) is the
 * tier it holds. A sprite baked at a denser tier is simply DOWNSCALED by
 * its blit as it recedes — so the tier RATCHETS: it never drops below the
 * tier already in hand (no re-bake DOWN, the LOD pop as the camera
 * moves), and rises only when a nearer depth genuinely out-resolves the
 * sheet by more than a full tier step (the hysteresis `hyst`, so camera
 * jitter cannot ping-pong it). Clamped to [minTier, maxTier].
 *
 * The raw tier is `round(log2(depthScale)·2)` — √2 density steps. At q=0
 * the caller passes depthScale 1 → tier 0 → the flat density, so this is
 * never consulted off the flat path.
 */
export declare function lodTierWarp(depthScale: number, curTier: number | undefined, hyst: number, minTier: number, maxTier: number): number;
//# sourceMappingURL=bakeWarp.d.ts.map