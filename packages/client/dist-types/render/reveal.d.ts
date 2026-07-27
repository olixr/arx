/**
 * THE THICKET VEIL + THE GHOST EMBER — the laws for a body lost
 * behind the standing world.
 *
 * Two mechanics, one philosophy: the world may hide you, but it must
 * never LOSE you.
 *
 * 1. THE THICKET VEIL: a soft elliptical window of screen-door dither
 *    punched out of any tree canopy that draws over your own body.
 *    The window is centered on YOU and reaches ~2 tiles — you can read
 *    the ground you stand on inside a deep forest, but nothing at
 *    range is revealed. The dither punches the OCCLUDER's sprite, so
 *    whatever was already painted beneath (you, props, a mob at your
 *    heels) shows through at reduced strength: navigation, not x-ray.
 *
 * 2. THE GHOST EMBER: when your body is still mostly hidden — a rear
 *    facade seen from the street, a canopy the veil only half-opens —
 *    a dithered lantern-gold silhouette of your own rig draws over the
 *    occluder. A positional cue, deliberately NOT the detailed sprite:
 *    it says "you are here", never "see through the wall".
 *
 * ANTI-WALLHACK LAW: both mechanics key exclusively off the LOCAL
 * player's continuous render position. Other players and mobs get no
 * ember and open no window — an enemy holding a treeline keeps every
 * bit of its concealment. What the veil incidentally reveals is capped
 * by the window radius around your own feet.
 *
 * This module is the pure math half (test-pinned); the canvas
 * compositing lives in renderer.ts.
 */
/** Horizontal half-reach of the veil window, in tiles. */
export declare const VEIL_R_TILES = 2.3;
/**
 * Vertical squash of the window ellipse. Matches the 2.5D camera's
 * compressed rows AND protects the trunk zone below the window — a
 * tree must keep its ground contact or it reads as floating.
 */
export declare const VEIL_SQUASH = 0.8;
/**
 * Peak alpha the veil may punch from a canopy at the window center.
 * Deliberately < 1: the canopy stays present as a translucent lace —
 * "I can see where I am", never "the tree is gone". Calibrated live
 * against a 40-tree canopy stack: 0.7 read too murky at the center.
 */
export declare const VEIL_MAX = 0.74;
/** Dither cell size in css px — chunky enough to read as screen-door. */
export declare const DITHER_CELL = 2;
/**
 * The 4×4 Bayer threshold matrix — the one source of the dither's
 * pattern, shared by the veil mask and the ember's weave.
 */
export declare const BAYER4: readonly (readonly number[])[];
/** A Bayer cell's alpha: ordered thresholds spread evenly over (0,1). */
export declare function bayerAlpha(col: number, row: number): number;
/** Character rig height in tiles (the scale-anchor law: the body IS
 *  the unit of measure — wall cover is judged against it). */
export declare const BODY_H = 1.15;
/** The ember's peak blit alpha (before stealth multiplies in). */
export declare const GHOST_ALPHA = 0.5;
/** Lantern gold — the HUD's own accent; friendly marker, not threat. */
export declare const GHOST_TINT = "#f0cf8a";
/** Temporal ease for the ember (seconds to full) — never a pop. */
export declare const GHOST_EASE_S = 0.22;
export declare function smoothstep01(t: number): number;
/**
 * A tree only veils (and only counts as cover) while it FRONTS the
 * body — its base row at or south of yours, so the y-sort draws it
 * over you. Eased over a fraction of a tile so a tree entering
 * candidacy while you strafe never pops its window in.
 */
export declare function frontEase(dyWorld: number): number;
/**
 * How much of the body a standing wall hides, 0..1.
 *
 * whT — the wall's CURRENT painted height in tiles (wallHeightAt's
 * output: the shelter veil already sank walls that front a room you
 * are inside, so a sunken stub yields zero here and the ember never
 * argues with the wall veil).
 * dyWorld — wall base row (ty+1) minus the body's continuous y.
 * adx — |wall column center − body x|.
 * yScale — the camera's row compression (0.6).
 *
 * Screen geometry: the wall's face tops out whT above its base while
 * the body stands dyWorld compressed rows behind it; the overlap of
 * that crown over the body's BODY_H is the hidden fraction. The ember
 * only arms past ~45% hidden — a head peeking over a garden wall is
 * readable and gets nothing.
 */
export declare function wallCover(whT: number, dyWorld: number, adx: number, yScale: number): number;
/**
 * Residual occlusion once the veil window has opened on a fronting
 * tree: the ember's tree-cover term is damped by what the punch
 * already shows. Deep forest keeps a faint ember (confirmation), a
 * lone tree with a wide-open window barely draws one.
 */
export declare function veilResidual(ey: number): number;
/**
 * The ember's brightness curve over the eased cover ghostK. A plain
 * smoothstep starved the MID range (deep-forest residual sits near
 * 0.4 → the gold whisper vanished into the canopy murk — live
 * verdict); the 1.45 pre-gain lands mid cover at ~2/3 brightness
 * while full cover still tops out at exactly 1.
 */
export declare function emberEase(ghostK: number): number;
//# sourceMappingURL=reveal.d.ts.map