/**
 * THE PROSPECTOR — pure "what country grows this?" queries for the
 * quest chart (THE FINGER ON THE CHART).
 *
 * When an errand asks for berries or copper ore and nothing authored
 * answers, the world itself can still gesture at the map: these are
 * the same pure fields generateChunk deals tiles from (moisture, cold,
 * the knoll fbm, the scorch, the tide line), read as GROUND FAMILIES
 * instead of per-tile rolls. Deliberately coarse — the chart draws a
 * generous searching ground, never a tile — so this module never
 * needs the per-tile hash salts, only the fields that gate them.
 *
 * ADJACENCY LAW: the cuts below mirror generateChunk's biome branches
 * (worldgen.ts, the open-field node deals). If those branches move
 * their thresholds, move these with them — a prospect that points at
 * country the generator no longer sows is a lie on the chart.
 */
import { fbm } from '@arx/shared';
import {
  coldAt,
  groundProbeAt,
  moistureAt,
  shoreProbeAt,
} from './worldgen.js';
import { fenAt, scorchAt } from './geography.js';

/** A family of gathering country the fields can point at. */
export type ProspectGround =
  | 'forest'
  | 'damp_forest'
  | 'pine_forest'
  | 'meadow'
  | 'ore_knoll'
  | 'scorch_field'
  | 'waterside'
  | 'cold_waterside'
  | 'fen_water';

/**
 * Worldgen-grown yield items -> the country that grows them, with the
 * cartographer's word for the chart label. ONLY open-field deals
 * belong here: the deep ores (iron and up) live in camps, prefabs,
 * and caves — the prospector must never gesture at empty meadow for
 * them. Bonus/seed yields are deliberately absent (a resin rumor
 * would drown the pine's own).
 */
export const GATHER_PROSPECTS: ReadonlyMap<
  string,
  { ground: ProspectGround; word: string }
> = new Map([
  ['log', { ground: 'forest', word: 'woodland' }],
  ['oak_log', { ground: 'forest', word: 'oak stands' }],
  ['yew_log', { ground: 'forest', word: 'old woods' }],
  ['pine_log', { ground: 'pine_forest', word: 'pine country' }],
  ['willow_log', { ground: 'damp_forest', word: 'willow damp' }],
  ['sagewort', { ground: 'forest', word: 'shaded understory' }],
  ['moonbell', { ground: 'damp_forest', word: 'the deep damp' }],
  ['plant_fibre', { ground: 'meadow', word: 'open field' }],
  ['berries', { ground: 'meadow', word: 'berry meadow' }],
  ['copper_ore', { ground: 'ore_knoll', word: 'rocky knolls' }],
  ['tin_ore', { ground: 'ore_knoll', word: 'rocky knolls' }],
  ['obsidian_shard', { ground: 'scorch_field', word: 'the burn country' }],
  ['raw_trout', { ground: 'waterside', word: 'open water' }],
  ['raw_pike', { ground: 'fen_water', word: 'still water' }],
  ['raw_eel', { ground: 'waterside', word: 'deep banks' }],
  ['raw_glimmerfish', { ground: 'waterside', word: 'deep banks' }],
  ['raw_salmon', { ground: 'cold_waterside', word: 'cold water' }],
]);

/**
 * How strongly this spot's country matches the asked ground family.
 * 0 = wrong country entirely; (0, 1] = the fields agree, scaled by
 * how deep into the family's band the spot sits. Pure and chunk-free:
 * a handful of noise evaluations, safe to sample by the hundreds.
 */
export function prospectScoreAt(
  seed: number,
  tx: number,
  ty: number,
  ground: ProspectGround,
): number {
  // The water families read the tide line first — their "biome" is
  // the bank itself, whatever grows behind it.
  if (ground === 'waterside' || ground === 'cold_waterside' || ground === 'fen_water') {
    const probe = groundProbeAt(seed, tx, ty);
    if (probe === 'water' || probe === 'rock' || probe === 'cave') return 0;
    if (!shoreProbeAt(seed, tx, ty, 4)) return 0;
    if (ground === 'cold_waterside') {
      const cold = coldAt(seed, tx, ty);
      return cold > 0.55 ? Math.min(1, 0.4 + (cold - 0.55) * 2) : 0;
    }
    if (ground === 'fen_water') {
      return fenAt(tx, ty) > 0.25 || moistureAt(seed, tx, ty) > 0.62 ? 0.8 : 0;
    }
    return 0.8;
  }

  const probe = groundProbeAt(seed, tx, ty);
  const moisture = moistureAt(seed, tx, ty);
  switch (ground) {
    case 'forest': {
      // generateChunk's forest branch: moisture > 0.62, density
      // rising with the damp.
      if (probe !== 'forest') return 0;
      return Math.min(1, 0.3 + (moisture - 0.62) * 3);
    }
    case 'damp_forest': {
      // Moonbell and willow ask the deepest damp (> 0.75).
      if (probe !== 'forest' || moisture <= 0.75) return 0;
      return Math.min(1, 0.4 + (moisture - 0.75) * 5);
    }
    case 'pine_forest': {
      // Pines take the stand where the cold crosses ~0.42 and own it
      // past ~0.55 (pineRoll < (cold - 0.42) * 1.9).
      if (probe !== 'forest') return 0;
      const cold = coldAt(seed, tx, ty);
      return cold > 0.5 ? Math.min(1, (cold - 0.5) * 3) : 0;
    }
    case 'meadow': {
      // The open meadow branch: grass country that is neither dry
      // (< 0.34, the knolls') nor damp enough to close into canopy.
      if (probe !== 'grass' || moisture < 0.34 || moisture > 0.62) return 0;
      return 0.7;
    }
    case 'ore_knoll': {
      // Dry meadow (< 0.34) where the knoll field crests (> 0.72) —
      // the freestanding copper/tin formations.
      if (probe !== 'grass' || moisture >= 0.34) return 0;
      const knoll = fbm(seed + 777, tx * 0.09, ty * 0.09, 2);
      return knoll > 0.68 ? Math.min(1, 0.3 + (knoll - 0.68) * 6) : 0;
    }
    case 'scorch_field': {
      // Obsidian shows only where the burn runs deep over knoll rock
      // (scorch strength s > 0.5 -> scorchAt > ~0.4).
      if (probe !== 'grass' && probe !== 'forest') return 0;
      const scorch = scorchAt(tx, ty);
      if (scorch <= 0.4) return 0;
      const knoll = fbm(seed + 777, tx * 0.09, ty * 0.09, 2);
      return knoll > 0.68 ? Math.min(1, scorch) : 0;
    }
    default:
      return 0;
  }
}
