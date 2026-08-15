import { fbm } from '../math/noise.js';

/**
 * THE DANGER FIELD — the one gradient the open world reads.
 *
 * Every system that scales with "how far from civilization am I"
 * (wilderness spawn levels, POI garrisons, chest kinds, loot rarity
 * bonuses, key tiers) reads this field instead of inventing its own
 * distance math. One law, many readers.
 *
 * THE LADDER PAST THE LAMPS (2026-08-14): the field is a pure function
 * of (seed, tx, ty, anchors). Every worded anchor — a town that KNOWS
 * what its country is — contributes two readings:
 *
 *   march = country + one tier per DANGER_BAND past its safe edge
 *   heat  = country − one tier per HEAT_FADE past its safe edge
 *
 * The tile's base tier is max(min(all marches), max(all heats)): the
 * SAFEST word in reach sets the floor of the climb (so the basin
 * around the low hearths stays broad and gentle), while a hot town's
 * own word brands the belt around it (so the country wrapping a
 * level-50 city reads level-50 even where a far-off village's march
 * would have called it a meadow). Between any two towns the two terms
 * hand off continuously — no cliffs, only rungs.
 *
 * A slow noise wobble bends the band borders so tier edges wander
 * organically instead of drawing circles on the map. Inside an
 * anchor's safe radius the tier is 0 by construction — the jitter
 * never reaches into town.
 *
 * Anchors are supplied by the caller (content owns the settled list;
 * materialized waystations append at runtime), so the same function
 * serves the server's spawn logic and any client surface (map tint,
 * the danger gauge, ambience) without protocol work.
 */

export interface DangerAnchor {
  x: number;
  y: number;
  /** Tiles of guaranteed tier-0 calm around the anchor. */
  safeR: number;
  /**
   * THE WORD — the danger tier of this anchor's own country, the tier
   * read just past its relief. A worded anchor joins the band march
   * (see the header law). Settled anchors default to 1 when silent;
   * a haven with no word is a pure lamp (see the haven law below).
   * Never valid on a dread — bad country has no townsfolk to ask.
   */
  country?: number;
  /**
   * THE HAVEN LAW: a WORDLESS haven is a lamp, not a hearth. A
   * materialized waystation must never join the march, or one campfire
   * in the deep frontier would re-origin the bands and flatten fifty
   * tiles of tier-8 land to tier 1. It carves a small tier-0 bubble
   * inside safeR and RELIEVES the surrounding field on a graded rim
   * (−2 tiers within HAVEN_FADE past the edge, −1 within twice that,
   * floor 1) — the lamplight pushes the dark back, and the dark
   * closes in again a stone's throw down the road.
   *
   * A haven WITH a word is a town: it keeps the lamp and the relief,
   * AND its word joins the march — because a city in the far dark
   * knows exactly what stands outside its walls, and the map should
   * say so.
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

/**
 * Highest danger tier the band march itself can reach. Nine rungs:
 * the ladder now runs the whole way to the player cap — the far rim
 * of the world deals level-90s wherever the walk is long enough, in
 * every direction, without end.
 */
export const DANGER_MAX = 9;

/**
 * THE OVERBAND — the one tier past the march's ceiling, and the only
 * tier distance can never deal. The band march is a model of
 * REMOTENESS, and remoteness runs out of meaning at DANGER_MAX: past
 * nine bands out, farther is just farther. What lies past the world's
 * rim is not farther — it is named country so wrong the map keeps a
 * separate word for it.
 *
 * The law: a tile reads DANGER_OVER only where ALL THREE hold —
 *   1. the un-jittered march (base, from distance and words alone)
 *      stands within one band of its ceiling: base >= DANGER_MAX − 1.
 *      The noise can never fake remoteness — a dread-3 heart planted
 *      near a town can never open the Overband, ever;
 *   2. the wobbled march (base + jitter − relief, before any dread)
 *      also reads DANGER_MAX − 1 or better — so no jitter-dipped
 *      pocket ever jumps tiers in one step; and
 *   3. the tile stands INSIDE the safe radius (the full heart, not the
 *      graded rim) of an anchor with dread >= OVERBAND_DREAD.
 * Everywhere else the classic clamped law answers. No shipped heart
 * deals it yet — the Brand stands in base-5 country and burns at the
 * classic law's ceiling instead. The Overband is the map's held
 * breath: the row is written, the ground is not.
 */
export const DANGER_OVER = DANGER_MAX + 1;

/** Dread strength required (at full heart) before the Overband opens. */
export const OVERBAND_DREAD = 3;

/**
 * Width in tiles of each danger band past the safe radius — one rung
 * per POI macro-cell (128 tiles), so the land climbs one tier per
 * cell of honest travel and the low basin around the hearths stays a
 * true province, not a dooryard.
 */
export const DANGER_BAND = 128;

/**
 * Tiles per rung of a hot word's fade (see the header law). Half a
 * band: a town's own heat grips its belt hard and lets go quickly, so
 * a level-50 city brands its hinterland without swallowing the calm
 * province a low hearth's march promised two valleys away.
 */
export const HEAT_FADE = DANGER_BAND / 2;

/** Tiles of graded relief past a haven's safe edge (see DangerAnchor.haven). */
export const HAVEN_FADE = 24;

/** Salt for the border-wobble noise stream. */
const JITTER_SALT = 0xda2e17;

/**
 * Danger tier at a world tile: 0 (settled) .. DANGER_MAX (the world's
 * rim), DANGER_OVER only inside a qualifying dread heart. Outside
 * every safe radius the tier never drops below 1 — "settled" is a
 * property of anchors, not of a lucky noise roll.
 */
export function dangerAt(
  seed: number,
  tx: number,
  ty: number,
  anchors: readonly DangerAnchor[],
): number {
  // The worded march (see the header law): the safest word in reach
  // sets the climb's floor, the hottest word brands its own belt.
  // Wordless havens only relieve; dreads only worsen; neither ever
  // joins the march.
  let march = Infinity;
  let heat = -Infinity;
  let inside = false;
  let relief = 0;
  let dread = 0;
  let dreadCore = 0;
  for (const a of anchors) {
    const d = Math.hypot(tx - a.x, ty - a.y) - a.safeR;
    if (a.dread) {
      // The dread law: bad country, graded like a haven's relief and
      // signed the other way. It never joins the march. The grading is
      // real at every step: a dread-3 heart's rim used to hold a flat
      // −1 for its whole 48-tile hem and then drop STRAIGHT to zero —
      // a two-tier cliff (9 beside 7 at the Brand's edge) in a field
      // whose own header forbids cliffs. The outer band now steps
      // through every rung on the way down; dread ≤ 2 reads exactly
      // as it always has.
      const add =
        d <= 0
          ? a.dread
          : d < HAVEN_FADE * 2
            ? a.dread - 1
            : d < HAVEN_FADE * 3
              ? Math.max(0, a.dread - 2)
              : 0;
      if (add > dread) dread = add;
      // The Overband reads only full hearts, never rims (see the law
      // at DANGER_OVER).
      if (d <= 0 && a.dread > dreadCore) dreadCore = a.dread;
      continue;
    }
    if (a.haven) {
      if (d <= 0) return 0;
      const r = d < HAVEN_FADE ? 2 : d < HAVEN_FADE * 2 ? 1 : 0;
      if (r > relief) relief = r;
      if (a.country === undefined) continue; // a wordless lamp
    } else if (d <= 0) {
      // A town is a town: no wood's reputation reaches inside a hearth.
      inside = true;
      continue;
    }
    const word = a.country ?? 1;
    const out = Math.max(0, d);
    const m = word + Math.floor(out / DANGER_BAND);
    if (m < march) march = m;
    // THE HAND-OFF LAW: heat's FIRST step lands exactly where the
    // haven's relief runs out (HAVEN_FADE*2 = 48); every later step
    // keeps the classic HEAT_FADE ladder untouched. Unaligned, heat
    // held the FULL word through the 16 tiles past the last relief
    // rung — a hostile spike RING around any town whose word out-runs
    // the surrounding march (Kingsdelf's Old Road read 4 → 5 → 6 → 5
    // → 4 walking IN, a level-44 band astride the promised tier-4
    // approach). Only that annulus changes: the walk-out is monotone
    // by construction and the far heat belt keeps its authored reach.
    const h =
      word - Math.max(out >= HAVEN_FADE * 2 ? 1 : 0, Math.floor(out / HEAT_FADE));
    if (h > heat) heat = h;
  }
  if (inside) return 0;
  // With no worded anchor at all, the world origin plays the hearth so
  // the field stays defined.
  if (march === Infinity) {
    const edge = Math.hypot(tx, ty);
    if (edge <= 0) return 0;
    march = 1 + Math.floor(edge / DANGER_BAND);
  }

  const base = Math.min(DANGER_MAX, Math.max(march, heat, 1));
  // Slow wobble bends band borders by at most one tier either way.
  const j = fbm(seed ^ JITTER_SALT, tx * 0.011, ty * 0.011, 2);
  const jitter = j > 0.62 ? 1 : j < 0.38 ? -1 : 0;
  // THE OVERBAND (see DANGER_OVER): where the march runs within one
  // band of its ceiling — by honest distance AND after the wobble —
  // and the tile stands in a full dread-3 heart, the field crosses
  // the ceiling. Everywhere else, the classic clamped law answers
  // exactly as it always has.
  const marched = Math.max(1, Math.min(DANGER_MAX, base + jitter - relief));
  if (dreadCore >= OVERBAND_DREAD && base >= DANGER_MAX - 1 && marched >= DANGER_MAX - 1) {
    return DANGER_OVER;
  }
  return Math.max(1, Math.min(DANGER_MAX, base + jitter - relief + dread));
}
