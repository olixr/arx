import { NPCS } from './npcs.js';
import { slotContains } from './routines/schedule.js';

/**
 * THE WILD ROSTER — ambient life for the space BETWEEN points of
 * interest. Not landmarks, not loot: presence. A stag at the wood's
 * edge at noon, bats over the meadow at midnight, and the further out
 * the danger field reads, the worse what rustles in the dark.
 *
 * Ambient bodies are non-deterministic by design (ambience, not
 * geography): the server rolls this roster near players, spawns with
 * no respawn record, and lets bodies slip away when nobody is near.
 * Density comes from DANGER_LAWS.wildDensity — one law, many readers.
 */

export type WildBiome = 'grass' | 'forest';

export interface WildEntry {
  /** Bestiary id. */
  npc: string;
  /** Pick weight among candidates at the rolled spot. */
  weight: number;
  /** Danger tiers [min, max] this creature roams. */
  tiers: readonly [number, number];
  /** Ground classes it haunts. */
  biomes: ReadonlyArray<WildBiome>;
  /**
   * Activity window (game hours, midnight-wrapping). Absent = all
   * hours. Nocturne entries are how the night gets teeth.
   */
  hours?: { from: number; to: number };
}

const NIGHT = { from: 20.5, to: 5.5 };
const DAY = { from: 5.5, to: 20.5 };

export const WILD_ROSTER: readonly WildEntry[] = [
  // ------------------------------------------------ gentle daylight
  { npc: 'stag', weight: 3, tiers: [1, 3], biomes: ['grass', 'forest'], hours: DAY },
  { npc: 'ram', weight: 2, tiers: [1, 2], biomes: ['grass'], hours: DAY },
  { npc: 'rat', weight: 1, tiers: [1, 1], biomes: ['grass'] },
  { npc: 'giant_beetle', weight: 1.5, tiers: [1, 2], biomes: ['grass'] },
  { npc: 'boar', weight: 2, tiers: [1, 3], biomes: ['forest'] },
  // --------------------------------------------- the standing perils
  { npc: 'wolf', weight: 2, tiers: [2, 5], biomes: ['forest'] },
  { npc: 'adder', weight: 1, tiers: [2, 4], biomes: ['grass'] },
  { npc: 'bear', weight: 1.5, tiers: [3, 5], biomes: ['forest'] },
  // ------------------------------------------------- the night shift
  { npc: 'wolf', weight: 2, tiers: [2, 5], biomes: ['forest', 'grass'], hours: NIGHT },
  { npc: 'cave_bat', weight: 2, tiers: [2, 5], biomes: ['grass', 'forest'], hours: NIGHT },
  { npc: 'giant_spider', weight: 1.5, tiers: [3, 5], biomes: ['forest'], hours: NIGHT },
  { npc: 'skeleton', weight: 1, tiers: [3, 5], biomes: ['grass', 'forest'], hours: NIGHT },
  { npc: 'worg', weight: 1.5, tiers: [4, 5], biomes: ['grass', 'forest'], hours: NIGHT },
  { npc: 'troll', weight: 0.5, tiers: [5, 5], biomes: ['forest'], hours: NIGHT },
  { npc: 'dire_wolf', weight: 1, tiers: [5, 5], biomes: ['grass', 'forest'], hours: NIGHT },
];

/**
 * Candidates for one rolled spot — pure, shared by the server's
 * ambience pass and the tests, so both read the same wilderness.
 */
export function wildCandidates(
  tier: number,
  biome: WildBiome,
  hours: number,
): WildEntry[] {
  return WILD_ROSTER.filter(
    (e) =>
      tier >= e.tiers[0] &&
      tier <= e.tiers[1] &&
      e.biomes.includes(biome) &&
      (!e.hours || slotContains(e.hours.from, e.hours.to, hours)),
  );
}

/** Weighted pick over candidates; `roll` in [0, 1). Null when empty. */
export function pickWild(
  candidates: readonly WildEntry[],
  roll: number,
): WildEntry | null {
  const total = candidates.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let r = roll * total;
  for (const e of candidates) {
    r -= e.weight;
    if (r < 0) return e;
  }
  return candidates[candidates.length - 1] ?? null;
}

/** Registry guard: a roster entry naming a missing beast is content rot. */
export function wildRosterErrors(): string[] {
  const errors: string[] = [];
  for (const [i, e] of WILD_ROSTER.entries()) {
    if (!NPCS.has(e.npc)) errors.push(`WILD_ROSTER[${i}]: unknown npc '${e.npc}'`);
    if (e.tiers[0] < 1 || e.tiers[1] < e.tiers[0]) {
      errors.push(`WILD_ROSTER[${i}]: bad tier range ${e.tiers[0]}..${e.tiers[1]}`);
    }
    if (e.weight <= 0) errors.push(`WILD_ROSTER[${i}]: weight must be positive`);
  }
  return errors;
}
