import { NPCS, PACK_RALLY_RANGE } from './npcs.js';
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
 *
 * THE KNOT LAW (docs/lived-in-land-plan.md Phase 1): life comes as
 * authored-shaped GROUPS — a pack, a herd, a sounder — never a
 * sprinkle of singletons. A knot's spread keeps every body inside
 * PACK_RALLY_RANGE of the anchor, so the pack law (NpcDef.pack +
 * rallyPack) wakes for free the moment one member is pulled: three
 * wolves in a knot are an encounter; three wolves forty tiles apart
 * are scenery. Singles stay legal — bears, trolls, and adders hunt
 * alone by nature, not by accident of the spawner.
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
  /**
   * Bodies per knot [min, max], inclusive. Absent = [1, 1]: a
   * solitary kind. The band sizes the group; the budget may still
   * truncate a knot (partial knots stand — never zero bodies).
   */
  band?: readonly [number, number];
  /**
   * Knot radius in tiles around the anchor. Absent = WILD_KNOT_SPREAD.
   * THE KNOT LAW pins it under PACK_RALLY_RANGE so a knot is always
   * one pull away from answering as a pack.
   */
  spread?: number;
  /**
   * One extra body that walks at the head of the knot — the stag over
   * the hinds, the dire wolf before the midnight pack. The lead is
   * ADDITIVE to the band and spawns first, so a knot truncated to one
   * body is a lone lead (a stag browsing alone reads true; a lone
   * straggler hind does not). An aggressive lead's level CLAMPS into
   * the spot tier's band — busier, never deadlier.
   */
  lead?: { npc: string };
  /**
   * Phase-2 hook (THE DEN IS THE SOURCE): the find-id prefix this
   * kind dens near — knots will prefer to stand by a matching
   * materialized find (den, warren, glade) once the finds layer
   * exists. A no-op today, vetted so content rot cannot creep in
   * ahead of the machinery.
   */
  habitat?: string;
}

/** Default knot radius (tiles) when an entry names none. */
export const WILD_KNOT_SPREAD = 2.5;
/**
 * The widest lawful spread — one tile inside PACK_RALLY_RANGE, so the
 * far edge of a knot still hears the anchor's cry. The validator
 * refuses anything wider; the pin is the point.
 */
export const WILD_KNOT_SPREAD_MAX = PACK_RALLY_RANGE - 1;

const NIGHT = { from: 20.5, to: 5.5 };
const DAY = { from: 5.5, to: 20.5 };

export const WILD_ROSTER: readonly WildEntry[] = [
  // ------------------------------------------------ gentle daylight
  {
    npc: 'hind',
    weight: 3,
    tiers: [1, 3],
    biomes: ['grass', 'forest'],
    hours: DAY,
    band: [2, 4],
    spread: 3,
    lead: { npc: 'stag' },
    habitat: 'glade',
  },
  { npc: 'ram', weight: 2, tiers: [1, 2], biomes: ['grass'], hours: DAY, band: [2, 3] },
  { npc: 'rat', weight: 1, tiers: [1, 1], biomes: ['grass'], band: [1, 2], spread: 2, habitat: 'warren' },
  { npc: 'giant_beetle', weight: 1.5, tiers: [1, 2], biomes: ['grass'] },
  { npc: 'boar', weight: 2, tiers: [1, 3], biomes: ['forest'], band: [2, 3] },
  // --------------------------------------------- the standing perils
  { npc: 'wolf', weight: 2, tiers: [2, 5], biomes: ['forest'], band: [2, 3], habitat: 'den' },
  { npc: 'adder', weight: 1, tiers: [2, 4], biomes: ['grass'] },
  { npc: 'bear', weight: 1.5, tiers: [3, 5], biomes: ['forest'] },
  // ------------------------------------------------- the night shift
  {
    npc: 'wolf',
    weight: 2,
    tiers: [2, 4],
    biomes: ['forest', 'grass'],
    hours: NIGHT,
    band: [2, 4],
    habitat: 'den',
  },
  {
    // The deep dark's answer to the day wolf: the tier-5 midnight
    // pack runs behind a dire wolf — the old lone dire_wolf entry,
    // promoted from straggler to leader.
    npc: 'wolf',
    weight: 2,
    tiers: [5, 5],
    biomes: ['forest', 'grass'],
    hours: NIGHT,
    band: [3, 4],
    lead: { npc: 'dire_wolf' },
    habitat: 'den',
  },
  { npc: 'cave_bat', weight: 2, tiers: [2, 5], biomes: ['grass', 'forest'], hours: NIGHT, band: [2, 3], spread: 2 },
  { npc: 'giant_spider', weight: 1.5, tiers: [3, 5], biomes: ['forest'], hours: NIGHT },
  { npc: 'skeleton', weight: 1, tiers: [3, 5], biomes: ['grass', 'forest'], hours: NIGHT, band: [2, 3], habitat: 'barrow' },
  { npc: 'worg', weight: 1.5, tiers: [4, 5], biomes: ['grass', 'forest'], hours: NIGHT, band: [2, 2] },
  { npc: 'troll', weight: 0.5, tiers: [5, 5], biomes: ['forest'], hours: NIGHT },
  // Daylight gnolls range in scavenging pairs, wide of the squat.
  { npc: 'gnoll', weight: 1.5, tiers: [3, 4], biomes: ['grass', 'forest'], hours: DAY, band: [1, 2], spread: 3, habitat: 'den' },
  {
    // The night raid: the warband runs behind its packlord, and the
    // cackle carries further than any fire-light.
    npc: 'gnoll',
    weight: 2,
    tiers: [4, 5],
    biomes: ['grass', 'forest'],
    hours: NIGHT,
    band: [2, 3],
    spread: 4,
    lead: { npc: 'gnoll_champion' },
    habitat: 'den',
  },
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

/** One body of a composed knot. */
export interface KnotBody {
  npc: string;
  /** True for the entry's lead — the head of the walking order. */
  lead: boolean;
}

/**
 * Compose one knot from a picked entry — pure, so the shape of the
 * wilds is testable even though their placement never is. `roll` in
 * [0, 1) sizes the band; `cap` is the spawner's remaining body budget
 * and truncates from the TAIL (the lead spawns first and is dropped
 * last — see the lead's doc above). Never returns an empty knot for a
 * positive cap; returns [] only when cap admits nobody.
 */
export function composeKnot(entry: WildEntry, roll: number, cap: number): KnotBody[] {
  if (cap < 1) return [];
  const [lo, hi] = entry.band ?? [1, 1];
  const size = lo + Math.floor(Math.min(0.999999, Math.max(0, roll)) * (hi - lo + 1));
  const bodies: KnotBody[] = [];
  if (entry.lead) bodies.push({ npc: entry.lead.npc, lead: true });
  for (let i = 0; i < size; i++) bodies.push({ npc: entry.npc, lead: false });
  return bodies.slice(0, cap);
}

/**
 * Vet one entry — the whole law for a single knot, exported so the
 * tests refuse by class against the REAL gate, not a copy of it.
 */
export function wildEntryErrors(e: WildEntry, label: string): string[] {
  const errors: string[] = [];
  if (!NPCS.has(e.npc)) errors.push(`${label}: unknown npc '${e.npc}'`);
  if (e.tiers[0] < 1 || e.tiers[1] < e.tiers[0]) {
    errors.push(`${label}: bad tier range ${e.tiers[0]}..${e.tiers[1]}`);
  }
  if (e.weight <= 0) errors.push(`${label}: weight must be positive`);
  if (e.band) {
    const [lo, hi] = e.band;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi < lo || hi > 8) {
      errors.push(`${label}: band must be integers 1 <= min <= max <= 8`);
    }
  }
  if (e.spread !== undefined) {
    if (!(e.spread > 0) || e.spread > WILD_KNOT_SPREAD_MAX) {
      errors.push(
        `${label}: spread must sit in (0, ${WILD_KNOT_SPREAD_MAX}] — ` +
          'a knot must answer as a pack (THE KNOT LAW)',
      );
    }
  }
  if (e.lead) {
    if (!NPCS.has(e.lead.npc)) errors.push(`${label}: unknown lead npc '${e.lead.npc}'`);
    if (!e.band) errors.push(`${label}: a lead needs a band to lead (add band or drop lead)`);
  }
  if (e.habitat !== undefined && !/^[a-z][a-z0-9_]*$/.test(e.habitat)) {
    errors.push(`${label}: habitat must be a lowercase slug`);
  }
  return errors;
}

/** Registry guard: a roster entry naming a missing beast is content rot. */
export function wildRosterErrors(): string[] {
  return WILD_ROSTER.flatMap((e, i) => wildEntryErrors(e, `WILD_ROSTER[${i}]`));
}
