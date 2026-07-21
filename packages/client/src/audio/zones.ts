/**
 * Where the ear is — the audio's map of the world, pure and testable.
 *
 * Three listening zones, weighted continuously so music and ambience
 * can crossfade instead of switching: TOWN (the Bramblewick plaza and
 * its ring of buildings), WILD (the open overworld), CAVE (anything
 * underground). The weights always sum to 1.
 *
 * Geography facts these lean on: the authored town zone spans
 * (0,0)–(96,96) with its plaza at (48,48); everything at y ≥ 512 is
 * the dark band — Gloomhollow sits at y 1024+, per-player delves at
 * y ≥ 8192 — where worldgen emits solid cave. The town radii hug the
 * built-up ring (~30 tiles) and let the last houses trail off by ~48.
 */

export interface ZoneWeights {
  town: number;
  wild: number;
  cave: number;
}

export type ZoneId = keyof ZoneWeights;

const TOWN_X = 48;
const TOWN_Y = 48;
/** Fully "in town" inside this radius… */
const TOWN_FULL = 30;
/** …fully in the wild past this one. */
const TOWN_FADE_END = 48;
/** The dark band: worldgen's underground begins here. */
export const UNDERGROUND_Y = 512;

function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

export function zoneWeights(x: number, y: number): ZoneWeights {
  if (y >= UNDERGROUND_Y) return { town: 0, wild: 0, cave: 1 };
  const d = Math.hypot(x - TOWN_X, y - TOWN_Y);
  const town = smooth((TOWN_FADE_END - d) / (TOWN_FADE_END - TOWN_FULL));
  return { town, wild: 1 - town, cave: 0 };
}

/** The single strongest zone — what the music commits to. */
export function dominantZone(w: ZoneWeights): ZoneId {
  if (w.cave >= w.town && w.cave >= w.wild) return 'cave';
  return w.town >= w.wild ? 'town' : 'wild';
}

/**
 * Day gate for the ambient wildlife, from clock hours. Birds own the
 * day; the soft crickets own the dark. Both fade across dawn and dusk
 * (sunrise 5.5 / sunset 20.5 in shared daylight) rather than snapping,
 * and the crossover is offset so there's a quiet, expectant half-hour
 * where neither sings — real dusks have one.
 */
export function birdsK(hours: number): number {
  return smooth((hours - 5.8) / 1.4) * (1 - smooth((hours - 18.6) / 1.2));
}

export function cricketsK(hours: number): number {
  // Night wraps midnight: evenings fade in, pre-dawn fades out.
  if (hours >= 12) return smooth((hours - 20.3) / 1.2);
  return 1 - smooth((hours - 4.2) / 1.2);
}
