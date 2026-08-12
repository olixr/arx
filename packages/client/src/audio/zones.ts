/**
 * Where the ear is — the audio's map of the world, pure and testable.
 *
 * Three listening zones, weighted continuously so music and ambience
 * can crossfade instead of switching: TOWN (Dawnmead's green and its
 * ring of cottages), WILD (the open overworld), CAVE (anything
 * underground). The weights always sum to 1.
 *
 * Geography facts these lean on: the village zone spans (-96,16)-(0,80)
 * with its green near (-64,48); everything at y ≥ 512 is the dark band
 * — per-player delves sit at y ≥ 8192 — where worldgen emits solid
 * cave. The town radii hug the built-up hamlet (~22 tiles) and let the
 * last hedgerows trail off by ~36.
 */

export interface ZoneWeights {
  town: number;
  wild: number;
  cave: number;
}

export type ZoneId = keyof ZoneWeights;

/**
 * The settled places the music treats as town: full weight inside
 * `full`, trailing off to wild by `fade`. Every hearth and haven the
 * danger field knows (content danger.ts) needs a row here, or its
 * streets play the wild's music — new settlements add rows as built.
 */
const TOWNS = [
  { x: -64, y: 48, full: 22, fade: 36 }, // Dawnmead
  { x: 352, y: 24, full: 30, fade: 48 }, // Amberford — the bigger hearth
  { x: -288, y: -160, full: 44, fade: 72 }, // Silverfall — the mountain capital
  { x: 356, y: 292, full: 34, fade: 52 }, // Saltmere — the town at the water's end
  { x: 584, y: -136, full: 30, fade: 48 }, // Pinewatch — the wood's muster town
  { x: 848, y: -392, full: 30, fade: 48 }, // Hartfell — the town past the treeline
] as const;
/** The dark band: worldgen's underground begins here. */
export const UNDERGROUND_Y = 512;

function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

export function zoneWeights(x: number, y: number): ZoneWeights {
  if (y >= UNDERGROUND_Y) return { town: 0, wild: 0, cave: 1 };
  let town = 0;
  for (const t of TOWNS) {
    const d = Math.hypot(x - t.x, y - t.y);
    town = Math.max(town, smooth((t.fade - d) / (t.fade - t.full)));
  }
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
