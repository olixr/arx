import { fbm } from '../math/noise.js';

/**
 * THE DANGER FIELD — the one gradient the open world reads.
 *
 * Every system that scales with "how far from civilization am I"
 * (wilderness spawn levels, POI garrisons, chest kinds, loot rarity
 * bonuses, key tiers) reads this field instead of inventing its own
 * distance math. One law, many readers.
 *
 * The field is a pure function of (seed, tx, ty, anchors): distance to
 * the nearest settled anchor sets a base tier in bands, and a slow
 * noise wobble bends the band borders so tier edges wander organically
 * instead of drawing circles on the map. Inside an anchor's safe radius
 * the tier is 0 by construction — the jitter never reaches into town.
 *
 * Anchors are supplied by the caller (content owns the settled list;
 * phase-4 waystations append to it at runtime), so the same function
 * serves the server's spawn logic and any client surface (map tint,
 * ambience) without protocol work.
 */

export interface DangerAnchor {
  x: number;
  y: number;
  /** Tiles of guaranteed tier-0 calm around the anchor. */
  safeR: number;
}

/** Highest danger tier. */
export const DANGER_MAX = 5;

/** Width in tiles of each danger band past the safe radius. */
export const DANGER_BAND = 56;

/** Salt for the border-wobble noise stream. */
const JITTER_SALT = 0xda2e17;

/**
 * Danger tier at a world tile: 0 (settled) .. DANGER_MAX (deep
 * frontier). Outside every safe radius the tier never drops below 1 —
 * "settled" is a property of anchors, not of a lucky noise roll.
 */
export function dangerAt(
  seed: number,
  tx: number,
  ty: number,
  anchors: readonly DangerAnchor[],
): number {
  // Distance past the nearest anchor's safe edge. With no anchors at
  // all, the world origin plays the hearth so the field stays defined.
  let edge = Infinity;
  for (const a of anchors) {
    const d = Math.hypot(tx - a.x, ty - a.y) - a.safeR;
    if (d < edge) edge = d;
  }
  if (edge === Infinity) edge = Math.hypot(tx, ty);
  if (edge <= 0) return 0;

  const base = Math.min(DANGER_MAX, 1 + Math.floor(edge / DANGER_BAND));
  // Slow wobble bends band borders by at most one tier either way.
  const j = fbm(seed ^ JITTER_SALT, tx * 0.011, ty * 0.011, 2);
  const jitter = j > 0.62 ? 1 : j < 0.38 ? -1 : 0;
  return Math.max(1, Math.min(DANGER_MAX, base + jitter));
}
