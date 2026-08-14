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
  /**
   * THE HAVEN LAW: a haven is a lamp, not a hearth. Settled anchors
   * define the band march — every tile's tier is its distance past the
   * NEAREST one. A haven (a materialized waystation) must never join
   * that march, or one campfire in the deep frontier would re-origin
   * the bands and flatten fifty tiles of tier-4 land to tier 1.
   * Instead a haven carves a small tier-0 bubble inside safeR and
   * RELIEVES the surrounding field on a graded rim (−2 tiers within
   * HAVEN_FADE past the edge, −1 within twice that, floor 1) — the
   * lamplight pushes the dark back, and the dark closes in again a
   * stone's throw down the road.
   */
  haven?: boolean;
  /**
   * THE DREAD LAW — the mirror of the haven, and the answer to a
   * question the band march cannot answer on its own: why is the
   * short way the bad way?
   *
   * Distance from a hearth is a fine model of danger right up until
   * the world has NAMED COUNTRY in it. A wood everyone walks around
   * is not dangerous because it is far; it is dangerous because it is
   * that wood. A dread adds tiers inside its safeR and one fewer on
   * the graded rim past it (the haven's relief, run backwards), so a
   * shortcut that saves a day of walking can cost more than the long
   * lamped road it skips — and the map, the music, and the spawn
   * tables all agree about it, because they all read this one field.
   *
   * Dreads NEVER set the march: a bad wood cannot re-origin the
   * bands any more than a campfire can. And they never reach inside
   * a hearth's safe radius, because a town is a town.
   */
  dread?: number;
}

/** Highest danger tier the band march itself can reach. */
export const DANGER_MAX = 5;

/**
 * THE OVERBAND — the one tier past the march's ceiling, and the only
 * tier distance can never deal. The band march is a model of REMOTENESS,
 * and remoteness ran out of meaning at DANGER_MAX: past five bands out,
 * farther is just farther. What lies past the far dark is not farther —
 * it is named country so wrong the map keeps a separate word for it.
 *
 * The law: a tile reads DANGER_OVER only where BOTH hold —
 *   1. the march itself (base + jitter − relief, before any dread)
 *      already reads DANGER_MAX, and
 *   2. the tile stands INSIDE the safe radius (the full heart, not the
 *      graded rim) of an anchor with dread >= OVERBAND_DREAD.
 * Everywhere else the classic clamped law answers, byte for byte. A
 * dread-2 wood (the Blackpine) can never deal it; a dread-3 heart near
 * a town can never deal it; the rim of a dread-3 heart never deals it.
 * Only the deep frontier's own worst ground crosses the old ceiling —
 * and the jitter still wanders tier-5 pockets through it, because band
 * borders wander everywhere in this world.
 */
export const DANGER_OVER = DANGER_MAX + 1;

/** Dread strength required (at full heart) before the Overband opens. */
export const OVERBAND_DREAD = 3;

/** Width in tiles of each danger band past the safe radius. */
export const DANGER_BAND = 56;

/** Tiles of graded relief past a haven's safe edge (see DangerAnchor.haven). */
export const HAVEN_FADE = 24;

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
  // Distance past the nearest SETTLED anchor's safe edge sets the band
  // march; havens only relieve it (see the haven law above). With no
  // anchors at all, the world origin plays the hearth so the field
  // stays defined.
  let edge = Infinity;
  let relief = 0;
  let dread = 0;
  let dreadCore = 0;
  for (const a of anchors) {
    const d = Math.hypot(tx - a.x, ty - a.y) - a.safeR;
    if (a.dread) {
      // The dread law: bad country, graded like a haven's relief and
      // signed the other way. It never joins the march.
      const add = d <= 0 ? a.dread : d < HAVEN_FADE * 2 ? a.dread - 1 : 0;
      if (add > dread) dread = add;
      // The Overband reads only full hearts, never rims (see the law
      // at DANGER_OVER).
      if (d <= 0 && a.dread > dreadCore) dreadCore = a.dread;
    } else if (a.haven) {
      if (d <= 0) return 0;
      const r = d < HAVEN_FADE ? 2 : d < HAVEN_FADE * 2 ? 1 : 0;
      if (r > relief) relief = r;
    } else if (d < edge) {
      edge = d;
    }
  }
  if (edge === Infinity) edge = Math.hypot(tx, ty);
  // A town is a town: no wood's reputation reaches inside a hearth.
  if (edge <= 0) return 0;

  const base = Math.min(DANGER_MAX, 1 + Math.floor(edge / DANGER_BAND));
  // Slow wobble bends band borders by at most one tier either way.
  const j = fbm(seed ^ JITTER_SALT, tx * 0.011, ty * 0.011, 2);
  const jitter = j > 0.62 ? 1 : j < 0.38 ? -1 : 0;
  // THE OVERBAND (see DANGER_OVER): where the march alone already
  // saturates AND the tile stands in a full dread-3 heart, the field
  // crosses the old ceiling. Everywhere else, the classic clamped law
  // answers exactly as it always has.
  const marched = Math.max(1, Math.min(DANGER_MAX, base + jitter - relief));
  if (dreadCore >= OVERBAND_DREAD && marched === DANGER_MAX) return DANGER_OVER;
  return Math.max(1, Math.min(DANGER_MAX, base + jitter - relief + dread));
}
