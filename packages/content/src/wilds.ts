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

/**
 * Ground classes an entry may haunt. 'shore' is a REFINEMENT, not a
 * ground class of its own: a grass anchor within a few tiles of open
 * water reads as shore ON TOP of being grass — bank knots stand among
 * the ordinary meadow life, and a shore-only kind (the crabs) never
 * wanders inland by construction. The server derives the flag from
 * the same elevation field the water itself comes from.
 */
export type WildBiome = 'grass' | 'forest' | 'shore';

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
  /**
   * THE TERRITORY FIELD (Phase 5): inside this family's country the
   * entry's pick weight multiplies by FRONTIER.territoryBias — wolf
   * knots run thicker in wolfkin country, the dead walk their own
   * barrows more often. A lean, never a cage; absent = weather, the
   * same everywhere.
   */
  family?: string;
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
  // THE OLD RAZORBACK roots the deep wood alone by day — a hill of
  // quills glimpsed between the trunks, best walked around.
  { npc: 'dire_boar', weight: 0.7, tiers: [3, 6], biomes: ['forest'] },
  // ------------------------------------------------- the tide line
  // THE SHORE FINALLY FEEDS: mudcrabs work the banks in skittering
  // handfuls at every hour — the tide does not keep town time. Their
  // whole world is the wet margin; they never wander inland.
  { npc: 'mudcrab', weight: 2, tiers: [1, 3], biomes: ['shore'], band: [2, 4], spread: 2 },
  // THE TIDE'S RAMPART: the giant crab stands its claimed stretch of
  // bank alone, or as a pair walling a narrows. Deeper waters raise
  // deadlier walls — the band rescales the body, the silhouette
  // keeps the promise.
  { npc: 'giant_crab', weight: 1.2, tiers: [3, 7], biomes: ['shore'], band: [1, 2], spread: 2 },
  // THE SKRAL (docs/skral-plan.md): the banks get their PEOPLE. Day
  // shoals wade the margin netting the shallows; harpooners stand off
  // the waterline in ones and twos.
  { npc: 'skral', weight: 2, tiers: [2, 5], biomes: ['shore'], band: [2, 4], spread: 2, family: 'skral' },
  { npc: 'skral_harpooner', weight: 1, tiers: [2, 5], biomes: ['shore'], band: [1, 2], spread: 2, family: 'skral' },
  // The tidecaller keeps the dark hours — a lone silhouette on the
  // waterline with the water doing things water should not.
  { npc: 'skral_tidecaller', weight: 0.7, tiers: [3, 6], biomes: ['shore'], hours: NIGHT, band: [1, 1], family: 'skral' },
  // THE NIGHT SHOAL: after dark the bank marches behind its deepking —
  // the gnoll warband's promotion law, spoken in croaks.
  {
    npc: 'skral',
    weight: 1.2,
    tiers: [3, 6],
    biomes: ['shore'],
    hours: NIGHT,
    band: [3, 5],
    spread: 2,
    lead: { npc: 'skral_champion' },
    family: 'skral',
  },
  // --------------------------------------------- the standing perils
  { npc: 'wolf', weight: 2, tiers: [2, 5], biomes: ['forest'], band: [2, 3], habitat: 'den', family: 'wolfkin' },
  { npc: 'adder', weight: 1, tiers: [2, 4], biomes: ['grass'] },
  { npc: 'bear', weight: 1.5, tiers: [3, 7], biomes: ['forest'] },
  // THE SHELL WALKS: giant turtles bask in the open by day, in ones
  // and twos — a keep does not hide, and a pair of keeps is a wall.
  { npc: 'giant_turtle', weight: 1, tiers: [2, 4], biomes: ['grass'], hours: DAY, band: [1, 2], spread: 2 },
  // THE HILL THAT WATCHES: the colossus stands alone at any hour —
  // it does not sleep so much as pause, and a sighting is a landmark
  // that was not on yesterday's map.
  { npc: 'colossus_turtle', weight: 0.5, tiers: [4, 8], biomes: ['grass', 'forest'] },
  // ------------------------------------------------- the night shift
  // After dark the sounder runs behind the old razorback — the same
  // promotion the dire wolf earned: straggler to leader.
  {
    npc: 'boar',
    weight: 1.5,
    tiers: [3, 5],
    biomes: ['forest'],
    hours: NIGHT,
    band: [2, 3],
    lead: { npc: 'dire_boar' },
  },
  {
    npc: 'wolf',
    weight: 2,
    tiers: [2, 4],
    biomes: ['forest', 'grass'],
    hours: NIGHT,
    band: [2, 4],
    habitat: 'den',
    family: 'wolfkin',
  },
  {
    // The deep dark's answer to the day wolf: the tier-5 midnight
    // pack runs behind a dire wolf — the old lone dire_wolf entry,
    // promoted from straggler to leader.
    npc: 'wolf',
    weight: 2,
    tiers: [5, 7],
    biomes: ['forest', 'grass'],
    hours: NIGHT,
    band: [3, 4],
    lead: { npc: 'dire_wolf' },
    habitat: 'den',
    family: 'wolfkin',
  },
  // The tufted shadows: lynx hunt the wood in mated pairs by day —
  // young cats prowl the nearer forest from tier 2 (the keeper's
  // courting ground), and at night the deep-wood tribes run behind
  // a duskruff, the ambush that answers the wolf pack's chase.
  { npc: 'lynx', weight: 1.5, tiers: [2, 5], biomes: ['forest'], band: [1, 2], spread: 2, habitat: 'den', family: 'lynxkin' },
  // The year's litter: young lynx hunt the forest edge alone or in
  // sibling pairs — the keeper's first cat is courted here.
  { npc: 'lynx_young', weight: 1.5, tiers: [1, 3], biomes: ['forest'], band: [1, 2], spread: 2, habitat: 'den', family: 'lynxkin' },
  {
    npc: 'lynx',
    weight: 1.5,
    tiers: [4, 6],
    biomes: ['forest'],
    hours: NIGHT,
    band: [2, 3],
    spread: 3,
    lead: { npc: 'lynx_champion' },
    habitat: 'den',
    family: 'lynxkin',
  },
  // The red skulk: foxes work the hedge-country where wood meets
  // grass — singles and pairs by day, bolder bands after dark, and in
  // the deep tiers the night skulk runs behind the smokebrush vixen.
  // No family yet: the territory chain law wants a POI to declare
  // 'foxkin' before the wilds may lean on it (the golem precedent).
  { npc: 'fox', weight: 1.5, tiers: [1, 4], biomes: ['forest', 'grass'], band: [1, 2], spread: 2, habitat: 'den' },
  { npc: 'fox', weight: 2, tiers: [2, 5], biomes: ['forest', 'grass'], hours: NIGHT, band: [2, 3], spread: 2, habitat: 'den' },
  {
    npc: 'fox',
    weight: 1.5,
    tiers: [4, 6],
    biomes: ['forest'],
    hours: NIGHT,
    band: [2, 3],
    spread: 3,
    lead: { npc: 'fox_champion' },
    habitat: 'den',
  },
  { npc: 'cave_bat', weight: 2, tiers: [2, 5], biomes: ['grass', 'forest'], hours: NIGHT, band: [2, 3], spread: 2 },
  { npc: 'giant_spider', weight: 1.5, tiers: [3, 7], biomes: ['forest'], hours: NIGHT },
  { npc: 'skeleton', weight: 1, tiers: [3, 7], biomes: ['grass', 'forest'], hours: NIGHT, band: [2, 3], habitat: 'barrow', family: 'dead' },
  { npc: 'worg', weight: 1.5, tiers: [4, 8], biomes: ['grass', 'forest'], hours: NIGHT, band: [2, 2], family: 'wolfkin' },
  // The parliament: great owls hunt the moonlit glades in wings of
  // two and three — the wide-eyed answer to the wolf pack, and the
  // one night beast no approach angle sneaks past.
  { npc: 'great_owl', weight: 1.5, tiers: [3, 5], biomes: ['forest'], hours: NIGHT, band: [2, 3], spread: 3, habitat: 'glade', family: 'parliament' },
  {
    // The deep wood's high court: the tier-5 parliament stoops behind
    // an elder — the screech calls every bough down on you at once.
    npc: 'great_owl',
    weight: 1.5,
    tiers: [5, 8],
    biomes: ['forest'],
    hours: NIGHT,
    band: [2, 3],
    spread: 3,
    lead: { npc: 'elder_great_owl' },
    habitat: 'glade',
    family: 'parliament',
  },
  // The troll walks every rung of the deep dark: a level-14 word near
  // the far woods' hem, a level-90 horror at the world's rim — the
  // band rescales the body, the silhouette keeps the promise.
  { npc: 'troll', weight: 0.5, tiers: [5, 9], biomes: ['forest'], hours: NIGHT },
  // THE EARTH STANDS UP (docs/golems-plan.md): golems stand alone,
  // day and night — a construct does not sleep, and a sighting is an
  // event, not a lawn. No family yet: the territory chain law wants a
  // POI to declare 'golem' before the wilds may lean on it.
  { npc: 'rock_golem', weight: 0.5, tiers: [3, 5], biomes: ['grass', 'forest'] },
  { npc: 'iron_golem', weight: 0.4, tiers: [4, 7], biomes: ['grass', 'forest'] },
  // The banked furnace walks at night, when the glow owns the dark.
  { npc: 'fire_golem', weight: 0.5, tiers: [4, 7], biomes: ['grass', 'forest'], hours: NIGHT },
  // The glacier stands at every rung past the far dark — at the
  // world's rim it is the day-country's answer to the troll.
  { npc: 'ice_golem', weight: 0.4, tiers: [5, 9], biomes: ['grass', 'forest'] },
  // Daylight gnolls range in scavenging pairs, wide of the squat.
  { npc: 'gnoll', weight: 1.5, tiers: [3, 5], biomes: ['grass', 'forest'], hours: DAY, band: [1, 2], spread: 3, habitat: 'den', family: 'gnoll' },
  {
    // The night raid: the warband runs behind its packlord, and the
    // cackle carries further than any fire-light.
    npc: 'gnoll',
    weight: 2,
    tiers: [4, 7],
    biomes: ['grass', 'forest'],
    hours: NIGHT,
    band: [2, 3],
    spread: 4,
    lead: { npc: 'gnoll_champion' },
    habitat: 'den',
    family: 'gnoll',
  },
  // THE HILL COMES DOWN (docs/ogres-plan.md): ogres walk in ones and
  // twos by day — a giant needs no escort — and the camp's muscle
  // strolls at night behind the Bonegrinder, dragging the club.
  // THE GIANTS KEEP THE HIGH COUNTRY: no ogre stands below tier 6 —
  // the band floor is level 44, and meeting one before the lampless
  // dark would cheapen every story told about them. Test-pinned.
  { npc: 'ogre', weight: 0.7, tiers: [6, 9], biomes: ['grass', 'forest'], hours: DAY, band: [1, 2], spread: 3, habitat: 'den', family: 'ogre' },
  {
    // The night forage: the camp walks out together, and the ground
    // tells you long before your eyes do.
    npc: 'ogre',
    weight: 0.9,
    tiers: [7, 9],
    biomes: ['grass', 'forest'],
    hours: NIGHT,
    band: [1, 2],
    spread: 4,
    lead: { npc: 'ogre_champion' },
    habitat: 'den',
    family: 'ogre',
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
  /** THE BANK IS ALSO A MEADOW: true when the spot borders open water. */
  shore = false,
): WildEntry[] {
  return WILD_ROSTER.filter(
    (e) =>
      tier >= e.tiers[0] &&
      tier <= e.tiers[1] &&
      (e.biomes.includes(biome) || (shore && e.biomes.includes('shore'))) &&
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

/**
 * THE TERRITORY LEAN (Phase 5): candidates re-weighted toward the
 * country's family — matching entries multiply by `bias`, the rest
 * keep their own weight (bias never gates, structurally). Pure; the
 * server feeds territoryAt's answer for the spawn anchor.
 */
export function leanWild(
  candidates: readonly WildEntry[],
  territory: string | null,
  bias: number,
): WildEntry[] {
  if (territory === null || bias === 1) return [...candidates];
  return candidates.map((e) =>
    e.family === territory ? { ...e, weight: e.weight * bias } : e,
  );
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
  if (e.family !== undefined && !/^[a-z][a-z0-9_]*$/.test(e.family)) {
    errors.push(`${label}: family must be a lowercase slug`);
  }
  return errors;
}

/** Registry guard: a roster entry naming a missing beast is content rot. */
export function wildRosterErrors(): string[] {
  return WILD_ROSTER.flatMap((e, i) => wildEntryErrors(e, `WILD_ROSTER[${i}]`));
}
