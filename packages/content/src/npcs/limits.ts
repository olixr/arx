/**
 * THE ROSTER'S LIMITS (foundations F7 endgame) — the boss-kit cap and
 * the temperament bounds both the hub and the inspector read. A leaf:
 * limits flow downhill.
 */
import type { NpcTemperament } from '../npcs.js';

/** Bosses may carry more voices than trash — phase gates keep each moment's hand small. */
export const BOSS_KIT_MAX = 10;

/** Validator bounds, [min, max] per dial — the CMS sliders' rails too. */
export const TEMPERAMENT_BOUNDS: Record<keyof NpcTemperament, readonly [number, number]> = {
  keen: [0.25, 3],
  nerve: [0.25, 4],
  investigateSec: [3, 60],
  searchSec: [5, 90],
  gritSec: [0, 600],
  pursuitSec: [1, 30],
  anticipateTiles: [0, 12],
  searchLegs: [0, 12],
  variance: [0, 0.5],
};
