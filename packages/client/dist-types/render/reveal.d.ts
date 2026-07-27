/**
 * THE STEP-ASIDE FADE + THE GHOST EMBER — the laws for a body lost
 * behind the standing world.
 *
 * Two mechanics, one philosophy: the world may hide you, but it must
 * never LOSE you — and it must never open early.
 *
 * 1. THE STEP-ASIDE FADE: an occluder that truly stands between the
 *    camera and your own body — a tree canopy, a man-height prop —
 *    politely fades. The whole sprite drops to a translucent ghost
 *    (outline ring and all, so it still reads as a tree), eased over
 *    a fraction of a second. THE TRIGGER IS OCCLUSION, NOT
 *    PROXIMITY: the sprite must draw over the body (its base at or
 *    south of yours) AND its inset silhouette must overlap the body
 *    box. Standing in the open beside or approaching something fades
 *    nothing (v2's proximity window was rejected for exactly that).
 *
 * 2. THE GHOST EMBER: walls never fade (fading them would see into
 *    buildings). When a standing wall hides most of the body, a
 *    dithered lantern-gold silhouette of your own rig draws over it —
 *    a position cue, never an x-ray.
 *
 * ANTI-WALLHACK LAW: both mechanics key exclusively off the LOCAL
 * player. Other players and mobs fade nothing and earn no ember — an
 * enemy holding a treeline keeps every bit of its concealment.
 *
 * Implementation shape (the v3 simplicity law): the fade is nothing
 * but globalAlpha on draws the renderer already makes — no masks, no
 * scratch composites, no extra strata. Cost is a rect test per tall
 * sprite. v1/v2's dither-window (per-sprite punches, then two-strata
 * composites) was measured, shipped, and REJECTED by the user as
 * murky, premature, and over-fancy; do not resurrect it.
 *
 * This module is the pure math half (test-pinned); the per-frame
 * bookkeeping lives in renderer.ts.
 */
/**
 * Combined occlusion ceiling over the body: however many canopies
 * stack over you, together they may keep at most this much alpha.
 * The per-sprite fade divides the budget (perLayerAlpha), so one
 * tree fades gently while a 4-deep stack fades each layer hard —
 * the body reads equally through both.
 */
export declare const OCCLUDED_MAX = 0.35;
/**
 * Per-sprite alpha for one of n stacked occluders such that n layers
 * composite to exactly OCCLUDED_MAX: 1-(1-a)^n = OCCLUDED_MAX.
 */
export declare function perLayerAlpha(n: number): number;
/** Seconds for a fade to ease in/out — never a pop. */
export declare const FADE_EASE_S = 0.18;
/**
 * Occlusion-test insets, as fractions of the sprite's drawn size.
 * Sprite rects carry bake margins and transparent corners; without
 * the inset a tree's empty margin "occludes" you a step early —
 * the premature-trigger complaint.
 */
export declare const FADE_INSET_X = 0.15;
export declare const FADE_INSET_TOP = 0.06;
/** The body box the occluder must overlap (tiles, around the feet
 *  anchor): half-width, height above, slack below. */
export declare const FADE_BODY_HW = 0.4;
export declare const FADE_BODY_HT = 1.35;
export declare const FADE_BODY_BELOW = 0.1;
/** Cached props at or above this drawn height (tiles) join the fade
 *  (bookshelf, pillar); short furniture never fades. */
export declare const FADE_TALL_TILES = 1.45;
/** A sprite fronts the body when its base row sits at or south of
 *  the body's continuous y (the y-sort then draws it over you). */
export declare const FRONT_EPS = 0.1;
/** Character rig height in tiles (the scale-anchor law: the body IS
 *  the unit of measure — wall cover is judged against it). */
export declare const BODY_H = 1.15;
/** The ember's peak blit alpha (before stealth multiplies in). */
export declare const GHOST_ALPHA = 0.5;
/** Lantern gold — the HUD's own accent; friendly marker, not threat. */
export declare const GHOST_TINT = "#f0cf8a";
/** Temporal ease for the ember (seconds to full) — never a pop. */
export declare const GHOST_EASE_S = 0.22;
/** Dither cell size in css px — the ember's screen-door weave. */
export declare const DITHER_CELL = 2;
/**
 * The 4×4 Bayer threshold matrix — the source of the ember's weave.
 */
export declare const BAYER4: readonly (readonly number[])[];
/** A Bayer cell's alpha: ordered thresholds spread evenly over (0,1). */
export declare function bayerAlpha(col: number, row: number): number;
export declare function smoothstep01(t: number): number;
/**
 * How much of the body a standing wall hides, 0..1.
 *
 * whT — the wall's CURRENT painted height in tiles (wallHeightAt's
 * output: the shelter veil already sank walls that front a room you
 * are inside, so a sunken stub yields zero here and the ember never
 * argues with the wall reveal).
 * dyWorld — wall base row (ty+1) minus the body's continuous y.
 * adx — |wall column center − body x|.
 * yScale — the camera's row compression (0.6).
 *
 * Screen geometry: the wall's face tops out whT above its base while
 * the body stands dyWorld compressed rows behind it; the overlap of
 * that crown over the body's BODY_H is the hidden fraction. The ember
 * only arms past ~45% hidden — a head peeking over a garden wall is
 * readable and gets nothing. OCCLUSION, NOT PROXIMITY, same as the
 * fade.
 */
export declare function wallCover(whT: number, dyWorld: number, adx: number, yScale: number): number;
/**
 * The ember's brightness curve over the eased cover ghostK. The 1.45
 * pre-gain keeps partial cover (strafing out from behind a wall)
 * clearly lit while full cover still tops out at exactly 1.
 */
export declare function emberEase(ghostK: number): number;
//# sourceMappingURL=reveal.d.ts.map