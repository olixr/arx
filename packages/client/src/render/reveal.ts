/**
 * THE STEP-ASIDE FADE + THE GHOST EMBER — the laws for a body lost
 * behind the standing world.
 *
 * Two mechanics, one philosophy: the world may hide you, but it must
 * never LOSE you — and it must never open early.
 *
 * 1. THE STEP-ASIDE FADE: an occluder that truly stands between the
 *    camera and your own body — a tree canopy, a man-height prop —
 *    politely fades to ONE readable ghost alpha (FADE_ALPHA, the
 *    presence floor: outline, trunk and silhouette stay visible so
 *    you can still cut it, dodge it, navigate by it). THE TRIGGER IS
 *    OCCLUSION, NOT PROXIMITY: the sprite must draw over the body
 *    (its base at or south of yours) AND its inset silhouette must
 *    overlap the body box. Standing in the open beside or
 *    approaching something fades nothing (v2's proximity window was
 *    rejected for exactly that).
 *
 * 2. THE GHOST EMBER: the body's own beacon. Walls never fade
 *    (fading them would see into buildings) — behind one, a
 *    dithered lantern-gold silhouette of your own rig draws over it.
 *    Under stacked canopies the faded ghosts still shade the body
 *    (stackCover), and the same ember rises through the shade — the
 *    fade keeps the WORLD visible, the ember keeps YOU findable.
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
 * THE PRESENCE FLOOR: every faded occluder rests at this one alpha —
 * a clearly visible ghost, never less. v3's stack-budget divided the
 * fade across every rect-overlapping canopy (a deep forest drove 16
 * trees to ~3% — "phasing out of existence, bumping into invisible
 * walls", user verdict). A tree you are about to cut, a trunk you
 * must steer around, stays readable at all times; the GHOST EMBER
 * (not more transparency) is what keeps the body findable when
 * several canopies genuinely shade it.
 */
export const FADE_ALPHA = 0.32;

/**
 * Combined shade over the body under m core occluders (the ones
 * whose silhouette covers the torso itself) — drives the ember: one
 * tree throws a light gold confirmation, a 3-deep canopy stack
 * summons it fully.
 */
export function stackCover(m: number): number {
  return 1 - (1 - FADE_ALPHA) ** Math.max(0, m);
}

/** Seconds for a fade to ease in/out — never a pop. */
export const FADE_EASE_S = 0.18;
/**
 * Occlusion-test insets, as fractions of the sprite's drawn size.
 * Sprite rects carry bake margins and transparent corners; without
 * the inset a tree's empty margin "occludes" you a step early —
 * the premature-trigger complaint.
 */
export const FADE_INSET_X = 0.15;
export const FADE_INSET_TOP = 0.06;
/** The body box the occluder must overlap (tiles, around the feet
 *  anchor): half-width, height above, slack below. */
export const FADE_BODY_HW = 0.4;
export const FADE_BODY_HT = 1.35;
export const FADE_BODY_BELOW = 0.1;
/** Cached props at or above this drawn height (tiles) join the fade
 *  (bookshelf, pillar); short furniture never fades. */
export const FADE_TALL_TILES = 1.45;
/** A sprite fronts the body when its base row sits at or south of
 *  the body's continuous y (the y-sort then draws it over you). */
export const FRONT_EPS = 0.1;
/**
 * THE CANOPY REACHES NORTH, THE FADE DOES NOT (field fix). A tree
 * hands occluderFade its trunk-BASE row (wy = ty+0.5), but a tree's
 * canopy arcs a full crown-height NORTH of that base — so a tree
 * whose base sits up to FRONT_EPS/… north of you still overlapped
 * the body box from ABOVE and faded its whole canopy, though you
 * stand in front of it (the base draws before you). The reported
 * over-aggression. A TALL occluder must be genuinely SOUTH — its
 * base at least this far past the body's row — before its canopy
 * counts as between you and the camera. Props keep the tight
 * FRONT_EPS (their bounds ARE their base; no overhead crown). */
export const FADE_TALL_FRONT = 0.6;

/**
 * THE FADE HAS A SOUTHERN HORIZON (field fix). A tall sprite's screen
 * rect spans its whole height, so an occluder far to the SOUTH — its
 * base well below the body, but the rect's TOP still reaching up into
 * the body's row — registered as an overlap and faded, fanning a
 * translucent wedge of trees/buildings south of the player though none
 * of them stands between the player and the near-top-down camera. An
 * occluder whose base row sits more than this many tiles SOUTH of the
 * player can never occlude the body in this view — return no-fade in
 * O(1) before any screen math. (fronts already rejects the north side;
 * this caps the south side.) */
export const MAX_FADE_SOUTH = 3.5;

/**
 * COVER-FRACTION GATE — OCCLUSION, NOT PROXIMITY. The fade arms on how
 * much of the body's screen box the occluder's inset silhouette
 * genuinely covers, not on a binary rect clip: below FADE_COVER_MIN
 * (~a grazing crown-tip) nothing fades; the fade then smoothsteps up
 * over FADE_COVER_SPAN so a tree you stand squarely behind reaches the
 * presence floor and the boundary eases in/out (mirrors wallCover's
 * "arms past ~45% hidden"). */
export const FADE_COVER_MIN = 0.4;
export const FADE_COVER_SPAN = 0.45;

/** Character rig height in tiles (the scale-anchor law: the body IS
 *  the unit of measure — wall cover is judged against it). */
export const BODY_H = 1.15;

/** The ember's peak blit alpha (before stealth multiplies in). */
export const GHOST_ALPHA = 0.5;
/** Lantern gold — the HUD's own accent; friendly marker, not threat. */
export const GHOST_TINT = '#f0cf8a';
/** Temporal ease for the ember (seconds to full) — never a pop. */
export const GHOST_EASE_S = 0.22;
/** Dither cell size in css px — the ember's screen-door weave. */
export const DITHER_CELL = 2;
/**
 * The 4×4 Bayer threshold matrix — the source of the ember's weave.
 */
export const BAYER4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 5, 13],
];

/** A Bayer cell's alpha: ordered thresholds spread evenly over (0,1). */
export function bayerAlpha(col: number, row: number): number {
  return (BAYER4[row & 3]![col & 3]! + 0.5) / 16;
}

export function smoothstep01(t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return k * k * (3 - 2 * k);
}

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
export function wallCover(whT: number, dyWorld: number, adx: number, yScale: number): number {
  if (dyWorld <= 0) return 0;
  const hidden = (whT - dyWorld * yScale) / BODY_H;
  const ey = smoothstep01((hidden - 0.45) / 0.45);
  const ex = smoothstep01((1.05 - adx) / 0.5);
  return ey * ex;
}

/**
 * The ember's brightness curve over the eased cover ghostK. The 1.45
 * pre-gain keeps partial cover (strafing out from behind a wall)
 * clearly lit while full cover still tops out at exactly 1.
 */
export function emberEase(ghostK: number): number {
  return smoothstep01(ghostK * 1.45);
}

/**
 * The fraction of the body's screen box that an occluder's inset
 * silhouette covers, 0..1 — the fade's coverage measure (screen-space
 * sibling of wallCover). Product of the horizontal and vertical
 * overlap fractions, so a canopy centered over the body but only
 * grazing its top reads low, while one squarely between body and
 * camera reads high. Pure rect math, alloc-free.
 *
 * sx0..sBot — the occluder's inset silhouette screen rect.
 * bx0..bBot — the body box screen rect.
 */
export function occluderCover(
  sx0: number,
  sx1: number,
  sTop: number,
  sBot: number,
  bx0: number,
  bx1: number,
  bTop: number,
  bBot: number,
): number {
  const ow = Math.min(sx1, bx1) - Math.max(sx0, bx0);
  const oh = Math.min(sBot, bBot) - Math.max(sTop, bTop);
  if (ow <= 0 || oh <= 0) return 0;
  const bw = bx1 - bx0;
  const bh = bBot - bTop;
  if (bw <= 0 || bh <= 0) return 0;
  const fx = Math.min(1, ow / bw);
  const fy = Math.min(1, oh / bh);
  return fx * fy;
}

/**
 * Map a raw cover fraction to the fade's target occlusion strength
 * (0..1) — nothing below FADE_COVER_MIN, smoothstepped to full over
 * FADE_COVER_SPAN. The renderer temporally eases toward this and blits
 * alpha = 1 − strength·(1 − FADE_ALPHA).
 */
export function fadeStrength(cover: number): number {
  return smoothstep01((cover - FADE_COVER_MIN) / FADE_COVER_SPAN);
}
