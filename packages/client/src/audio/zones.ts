/**
 * Where the ear is — the audio's map of the world, pure and testable.
 *
 * Three listening zones, weighted continuously so music and ambience
 * can crossfade instead of switching: TOWN (Dawnmead's green and its
 * ring of cottages), WILD (the open overworld), CAVE (anything
 * underground). The weights always sum to 1.
 *
 * Geography facts these lean on: the village zone spans (-96,16)-(0,80)
 * with its green near (-64,48). THE WORLDS APART: whether the ear is
 * underground is the PLANE'S law now (cave planes: the underworld,
 * the rifts), passed in by the caller — never a y-line; the surface
 * runs wild on every compass point. The town radii hug the built-up
 * hamlet (~22 tiles) and let the last hedgerows trail off by ~36.
 */

import { SUNRISE, SUNSET } from '@arx/shared';

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
  { x: -64, y: 48, full: 44, fade: 64 }, // Dawnmead (THE DAWN REMADE 128x96 rect)
  { x: 520, y: 16, full: 56, fade: 80 }, // Amberford — THE FORD COMES HOME 144x144 rect
  { x: -448, y: -220, full: 72, fade: 104 }, // Silverfall — the capital, crown to Vale Gate (176x256 rect)
  { x: 760, y: 330, full: 34, fade: 52 }, // Saltmere — the town at the water's end
  { x: 1160, y: -356, full: 30, fade: 48 }, // Pinewatch — the wood's muster town
  { x: 1304, y: -616, full: 30, fade: 48 }, // Hartfell — the town past the treeline
  { x: -480, y: 328, full: 34, fade: 52 }, // Kingsdelf — the town in the King's Delf
  { x: -1032, y: -358, full: 44, fade: 72 }, // Evenfall — the city of the old folk
] as const;

function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

export function zoneWeights(x: number, y: number, underground = false): ZoneWeights {
  if (underground) return { town: 0, wild: 0, cave: 1 };
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
 * A clock jump larger than this between two frames (login, /time, a
 * long hitch) is a warp, not a passage — it crosses no seam. The
 * frame clock steps ~0.0005h; twelve real seconds of game clock is
 * far past any honest frame gap.
 */
const SEAM_WARP_HOURS = 0.25;

/**
 * THE SKY'S SEAM — did the clock pass dusk or dawn between two
 * readings? Pure and wrap-aware: the passage is measured forward from
 * `prev` (the clock only ever walks forward), and a warp-sized step
 * crosses nothing, so logging in at night never plays a dusk that
 * happened hours ago. The caller decides whether the sky is even
 * visible (no seam sounds underground).
 */
export function skySeam(prev: number, cur: number): 'dusk' | 'dawn' | null {
  const step = (((cur - prev) % 24) + 24) % 24;
  if (step <= 0 || step > SEAM_WARP_HOURS) return null;
  const crossed = (mark: number): boolean => {
    const toMark = (((mark - prev) % 24) + 24) % 24;
    return toMark > 0 && toMark <= step;
  };
  if (crossed(SUNSET)) return 'dusk';
  if (crossed(SUNRISE)) return 'dawn';
  return null;
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
