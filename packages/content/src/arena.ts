import type { ChestKind } from '@arx/shared';
import type { PlaneId } from './planes.js';

/**
 * THE SAND AND THE ROAR (docs/arena-plan.md) — the arena's one content
 * doc. Venues (authored town ground under match CLAIM), match cards
 * (rounds of authored foes, seeded pool variety, crown-forged
 * champions), the rank ladder 1..50 (meta-progression on the factions
 * band law: gameplay reads TITLE BANDS, never the raw number), the
 * house dials, and the ringmaster's stock barks — all live-doc state
 * on the stances/factions FRONTIER pattern. A Studio save re-writes
 * the card the very next time a counter is asked; nothing here is
 * cached beyond the claim indexes below.
 *
 * Laws this module carries:
 * - AUTHORED OUTRANKS ROLLED: pools and crown seeds only ever pick
 *   from authored parts; validation walks every part.
 * - THE CHEST IS THE PURSE: a card names a purse table (or takes the
 *   banded default); arena foes themselves pay nothing.
 * - THE SAND PAYS ITS OWN (THE WORN BOOK wave): the purses carry the
 *   pit house's own rack (`pit_arms`) instead of the crypt's
 *   grave-goods, and the sport keeps two exclusives nothing else in
 *   the world pays — `sand_laurel` (t4) and `laurelbrand` (t3/t4).
 *   Both are pinned negative everywhere else; see loot/tables.ts.
 * - THE ANNOUNCER IS A THROAT: every bark ships VOICE-lawful — the
 *   validator enforces the dash ban so a machine-writing tell can
 *   never reach the sand through a Studio save.
 */

// ------------------------------------------------------------ types

/** One fielded line of a round — the PoiGarrisonEntry grammar. */
export interface ArenaWaveEntry {
  /** Bestiary def id. */
  npc: string;
  /** Bodies fielded, seeded roll. Absent = exactly one. */
  count?: [number, number];
  /** Level relative to the card's stated level. */
  levelOffset?: number;
  /** A named keeper — the ringmaster calls it by name. */
  name?: string;
  /**
   * Forge a champion from the run seed (THE SEED IS THE SOUL). The
   * def must carry a kit and either a crown pool family or an
   * authored boss block — the validator refuses a bare body a crown.
   */
  crown?: boolean;
}

export interface ArenaRoundDef {
  /** The round's card name — 'The Warm-Up', "The Champion's Turn". */
  title?: string;
  /** The ringmaster's line as the far gate opens on this round. */
  bark?: string;
  /** Always fielded. */
  entries?: ArenaWaveEntry[];
  /** Seeded variety: pick N from the pool, per run. */
  pool?: { pick: number; from: ArenaWaveEntry[] };
  /** Destructible cover pieces scattered on the sand (0..8). */
  props?: number;
}

export interface ArenaMatchDef {
  id: string;
  name: string;
  blurb?: string;
  /** The card's stated level; entries scale from it. */
  level: number;
  /** The stake, in coins, taken at the counter. */
  fee: number;
  /** Arena rank required to buy the card. */
  rankReq?: number;
  /** 1..5 rounds; three is the house standard. */
  rounds: ArenaRoundDef[];
  /** The purse chest kind. Absent = 'boss'. */
  chest?: ChestKind;
  /** Purse table override. Absent = the banded arena_purse default. */
  lootTable?: string;
  /** Arena xp on completion. Absent = the house formula. */
  xp?: number;
  /** Restrict to venues. Absent = any venue whose band admits level. */
  venues?: string[];
}

export interface ArenaVenueDef {
  id: string;
  name: string;
  /** The zone whose ground this venue claims. */
  zone: string;
  plane?: PlaneId;
  /** The sand — an ellipse in world coords; the fight's containment. */
  pit: { x: number; y: number; rx: number; ry: number };
  /** Gate tiles the match shuts and opens. */
  gates: Array<{ x: number; y: number }>;
  /** Eviction, spill, and walk-of-shame spot — outside the gates. */
  exit: { x: number; y: number };
  /** The purse tile, on the sand. */
  chest: { x: number; y: number };
  /** Actor slug of the ringmaster — the announcer's throat. */
  master: string;
  /** Which cards this counter lists. */
  levelBand: [number, number];
}

export interface ArenaLadderDef {
  /** The ladder's top rung. */
  maxRank: number;
  /** xp to climb rank r-1 -> r = round(xpBase * xpGrowth^(r-1)). */
  xpBase: number;
  xpGrowth: number;
  /** Title bands, ascending by rank; gameplay reads the band. */
  titles: Array<{ rank: number; title: string }>;
}

export interface ArenaDialsDef {
  /** Claim -> gate-shut muster window (seconds). */
  musterSec: number;
  /** The breather between rounds (seconds). */
  countdownSec: number;
  /** The purse stands this long after victory (seconds). */
  chestGraceSec: number;
  /** Venue rest after any match (seconds). */
  cooldownSec: number;
  /** The backstop — no claim outlives this (seconds). */
  matchCapSec: number;
  /** The fallen's share of the card's arena xp. */
  deathXpFrac: number;
  /** Max wave bodies alive on the sand at once. */
  aliveCap: number;
}

export interface ArenaBarksDef {
  muster: string[];
  gates: string[];
  round: string[];
  final: string[];
  victory: string[];
  wipe: string[];
  chest: string[];
}

export interface ArenasDef {
  venues: ArenaVenueDef[];
  matches: ArenaMatchDef[];
  ladder: ArenaLadderDef;
  dials: ArenaDialsDef;
  barks: ArenaBarksDef;
}

// ------------------------------------------------------------ seed

/**
 * The live doc — module state the whole game reads, swapped whole by
 * replaceArenas. Venue coordinates are sealed by Phase 5's dressing
 * passes (the two rings); until those land they are the PLANNED
 * grounds from the epic doc and nothing server-side consumes them.
 */
export const ARENAS: ArenasDef = {
  venues: [
    // Coordinates SEALED by the grand recut's builds (§10 THE SAND
    // GROWS; the fillEllipse cell math is the truth): Silverfall
    // local (64,216) rx12.5/ry9.5 on the Fairstead colosseum,
    // Amberford local (134,101) rx7/ry6.4 in the working country
    // south of Perl's orchard. World = local + zone origin.
    {
      id: 'grand_ring',
      name: 'The Grand Ring',
      zone: 'silverfall',
      pit: { x: -472, y: -128, rx: 12.5, ry: 9.5 },
      gates: [
        { x: -473, y: -139 },
        { x: -472, y: -139 },
        { x: -471, y: -139 },
        { x: -473, y: -117 },
        { x: -472, y: -117 },
        { x: -471, y: -117 },
      ],
      exit: { x: -472, y: -113 },
      chest: { x: -472, y: -136 },
      master: 'ringmaster_cato',
      levelBand: [15, 40],
    },
    {
      id: 'ford_ring',
      name: 'The Ford Ring',
      zone: 'amberford',
      pit: { x: 582, y: 45, rx: 7, ry: 6.4 },
      gates: [
        { x: 581, y: 38 },
        { x: 582, y: 38 },
        { x: 583, y: 38 },
        { x: 581, y: 52 },
        { x: 582, y: 52 },
        { x: 583, y: 52 },
      ],
      exit: { x: 582, y: 55 },
      chest: { x: 582, y: 40 },
      master: 'ringmaster_serle',
      levelBand: [3, 16],
    },
  ],
  matches: [
    // ------------------------------------------- the Ford Ring's card
    {
      id: 'the_first_bell',
      name: 'The First Bell',
      blurb: 'Green fighters, green goblins. Somebody leaves wiser.',
      level: 4,
      fee: 15,
      rounds: [
        { title: 'The Warm-Up', entries: [{ npc: 'goblin', count: [2, 2] }] },
        {
          title: 'The Second Bell',
          entries: [{ npc: 'goblin', count: [2, 2] }, { npc: 'goblin_thrower' }],
          props: 2,
        },
        {
          title: 'Knuckle',
          bark: 'The big one answers to Knuckle. Answer back.',
          entries: [{ npc: 'goblin_champion', name: 'Knuckle' }, { npc: 'goblin' }],
        },
      ],
    },
    {
      id: 'the_pen',
      name: 'The Pen',
      blurb: 'Tusks and temper. Keep your feet.',
      level: 6,
      fee: 25,
      rounds: [
        { entries: [{ npc: 'boar', count: [2, 2] }] },
        { entries: [{ npc: 'boar', count: [2, 3] }], props: 3 },
        {
          title: 'Old Tusk',
          bark: 'Old Tusk broke three fences and one fencer. Mind the charge.',
          entries: [{ npc: 'dire_boar', name: 'Old Tusk' }],
        },
      ],
    },
    {
      id: 'bones_of_the_yard',
      name: 'Bones of the Yard',
      blurb: 'The yard digs its old arguments back up.',
      level: 9,
      fee: 40,
      rounds: [
        { entries: [{ npc: 'skeleton', count: [2, 2] }] },
        {
          entries: [{ npc: 'skeleton_archer', count: [1, 2] }, { npc: 'skeleton' }],
          props: 2,
        },
        {
          title: 'The Doorman',
          entries: [{ npc: 'skeleton_guard', name: 'The Doorman' }, { npc: 'skeleton', count: [1, 2] }],
        },
      ],
    },
    {
      id: 'teeth_at_dusk',
      name: 'Teeth at Dusk',
      blurb: 'A pack works together. Do the same.',
      level: 12,
      fee: 60,
      rounds: [
        { entries: [{ npc: 'wolf', count: [2, 2] }] },
        {
          entries: [{ npc: 'wolf', count: [2, 3] }],
          pool: { pick: 1, from: [{ npc: 'fox' }, { npc: 'lynx_young' }] },
        },
        {
          title: "The Champion's Turn",
          bark: 'The kennel gave up its eldest for this. Earn it.',
          entries: [{ npc: 'dire_wolf', crown: true }],
        },
      ],
    },
    {
      id: 'the_mixed_card',
      name: 'The Mixed Card',
      blurb: 'The ring empties its cellar. No two nights the same.',
      level: 14,
      fee: 80,
      rounds: [
        {
          pool: {
            pick: 2,
            from: [
              { npc: 'kobold', count: [1, 2] },
              { npc: 'mudcrab', count: [1, 2] },
              { npc: 'giant_beetle' },
              { npc: 'adder' },
            ],
          },
        },
        {
          pool: {
            pick: 2,
            from: [
              { npc: 'giant_bat', count: [1, 2] },
              { npc: 'slime', count: [1, 2] },
              { npc: 'kobold_digmaster' },
              { npc: 'giant_spider' },
            ],
          },
          props: 3,
        },
        {
          pool: {
            pick: 1,
            from: [
              { npc: 'bear', name: 'The Cellar Door' },
              { npc: 'giant_turtle', name: 'The Landlord' },
              { npc: 'dire_boar', name: 'The Bad Debt' },
            ],
          },
        },
      ],
    },
    // ------------------------------------------ the Grand Ring's card
    {
      id: 'the_warband',
      name: 'The Warband',
      blurb: 'A gnoll pack, paid in advance and angry about it.',
      level: 18,
      fee: 120,
      rounds: [
        { entries: [{ npc: 'gnoll', count: [2, 3] }] },
        {
          entries: [{ npc: 'gnoll', count: [2, 3] }],
          props: 3,
        },
        {
          title: "The Champion's Turn",
          entries: [{ npc: 'gnoll_champion', crown: true }, { npc: 'gnoll', count: [1, 2] }],
        },
      ],
    },
    {
      id: 'the_legion_files',
      name: 'The Legion Files',
      blurb: 'Hobgoblins fight in order. Break it.',
      level: 22,
      fee: 160,
      rounds: [
        { entries: [{ npc: 'hobgoblin', count: [2, 2] }, { npc: 'hobgoblin_archer' }] },
        { entries: [{ npc: 'hobgoblin_warcaster' }, { npc: 'hobgoblin', count: [2, 2] }] },
        {
          title: 'The File Closes',
          entries: [
            { npc: 'hobgoblin_champion', name: 'The Unbroken File' },
            { npc: 'hobgoblin_archer' },
          ],
        },
      ],
    },
    {
      id: 'court_of_bone',
      name: 'Court of Bone',
      blurb: 'The old court holds session one more time.',
      level: 26,
      fee: 220,
      rounds: [
        { entries: [{ npc: 'skeleton_kingsman', count: [2, 2] }] },
        {
          entries: [{ npc: 'skeleton_chanter' }, { npc: 'skeleton_kingsman', count: [1, 2] }],
          props: 2,
        },
        {
          title: "The Champion's Turn",
          entries: [{ npc: 'skeleton_champion', crown: true }, { npc: 'skeleton_guard' }],
        },
      ],
    },
    {
      id: 'the_brine_card',
      name: 'The Brine Card',
      blurb: 'The banks send their best. The sand stays wet for a week.',
      level: 30,
      fee: 300,
      rounds: [
        { entries: [{ npc: 'skral', count: [2, 2] }, { npc: 'skral_harpooner' }] },
        { entries: [{ npc: 'skral_tidecaller' }, { npc: 'skral', count: [2, 2] }] },
        {
          title: "The Champion's Turn",
          entries: [{ npc: 'skral_champion', crown: true }, { npc: 'skral_harpooner', count: [1, 2] }],
        },
      ],
    },
    {
      id: 'stone_and_fire',
      name: 'Stone and Fire',
      blurb: 'The earth stands up. Twice.',
      level: 34,
      fee: 400,
      rounds: [
        { entries: [{ npc: 'rock_golem', count: [2, 2] }] },
        { entries: [{ npc: 'iron_golem' }, { npc: 'rock_golem' }], props: 4 },
        {
          title: 'The Kilnheart',
          bark: 'The last one walked out of a kiln. It remembers the kiln fondly.',
          entries: [{ npc: 'fire_golem', name: 'The Kilnheart' }],
        },
      ],
    },
    {
      id: 'the_hill_comes_down',
      name: 'The Hill Comes Down',
      blurb: 'Ogres, by weight. The stands are advised to sit back.',
      level: 38,
      fee: 500,
      rounds: [
        { entries: [{ npc: 'ogre' }, { npc: 'ogre_hurler' }] },
        { entries: [{ npc: 'ogre_bellower' }, { npc: 'ogre' }] },
        {
          title: 'The Hilltop',
          entries: [{ npc: 'ogre_champion', name: 'The Hilltop' }],
        },
      ],
    },
    {
      id: 'the_tyrants_turn',
      name: "The Tyrant's Turn",
      blurb: 'The headline card. A crowned name, and everything it brings.',
      level: 40,
      fee: 650,
      rankReq: 10,
      rounds: [
        {
          entries: [{ npc: 'goblin', count: [2, 3] }, { npc: 'goblin_thrower' }],
          props: 3,
        },
        {
          title: "The Champion's Turn",
          entries: [{ npc: 'goblin_champion', crown: true }, { npc: 'goblin', count: [1, 2] }],
        },
        {
          title: 'The Tyrant',
          bark: 'You paid for the name on the board. Here is the name.',
          entries: [{ npc: 'goblin_flame_tyrant' }],
        },
      ],
    },
  ],
  ladder: {
    maxRank: 50,
    xpBase: 100,
    xpGrowth: 1.1,
    titles: [
      { rank: 1, title: 'Sandfoot' },
      { rank: 5, title: 'Roundhand' },
      { rank: 10, title: "Crowd's Nod" },
      { rank: 15, title: 'Ironturn' },
      { rank: 20, title: 'Ring Veteran' },
      { rank: 30, title: 'Master of the Card' },
      { rank: 40, title: 'The Unburied' },
      { rank: 50, title: 'Champion of the Sands' },
    ],
  },
  dials: {
    musterSec: 20,
    countdownSec: 15,
    chestGraceSec: 120,
    cooldownSec: 30,
    matchCapSec: 900,
    deathXpFrac: 0.5,
    aliveCap: 12,
  },
  barks: {
    muster: [
      'The sand is claimed. Stand your ground inside.',
      'A card is bought. Take the sand or lose your place.',
    ],
    gates: [
      'Gates down. The card is live.',
      'Bar the gates. Nobody in, nothing out.',
    ],
    round: [
      'Next round. Ready yourselves.',
      'The far gate stirs.',
      'Catch your breath. It will be short.',
    ],
    final: [
      'Last round. Make the crowd remember it.',
      'The card turns its last face.',
    ],
    victory: [
      'Done and standing. The crowd saw it.',
      'The sand is yours. Take your purse.',
    ],
    wipe: [
      'The sand keeps its due. Card closed.',
      'Carried out. The ring stands ready for braver coin.',
    ],
    chest: ['The purse stands. Claim it before the sand does.'],
  },
};

// ------------------------------------------------------------ copy

function copyEntry(e: ArenaWaveEntry): ArenaWaveEntry {
  return {
    npc: e.npc,
    ...(e.count !== undefined ? { count: [e.count[0], e.count[1]] as [number, number] } : {}),
    ...(e.levelOffset !== undefined ? { levelOffset: e.levelOffset } : {}),
    ...(e.name !== undefined ? { name: e.name } : {}),
    ...(e.crown === true ? { crown: true } : {}),
  };
}

function copyRound(r: ArenaRoundDef): ArenaRoundDef {
  return {
    ...(r.title !== undefined ? { title: r.title } : {}),
    ...(r.bark !== undefined ? { bark: r.bark } : {}),
    ...(r.entries !== undefined ? { entries: r.entries.map(copyEntry) } : {}),
    ...(r.pool !== undefined
      ? { pool: { pick: r.pool.pick, from: r.pool.from.map(copyEntry) } }
      : {}),
    ...(r.props !== undefined ? { props: r.props } : {}),
  };
}

function deepCopyDoc(doc: ArenasDef): ArenasDef {
  return {
    venues: doc.venues.map((v) => ({
      ...v,
      pit: { ...v.pit },
      gates: v.gates.map((g) => ({ ...g })),
      exit: { ...v.exit },
      chest: { ...v.chest },
      levelBand: [v.levelBand[0], v.levelBand[1]] as [number, number],
    })),
    matches: doc.matches.map((m) => ({
      ...m,
      rounds: m.rounds.map(copyRound),
      ...(m.venues !== undefined ? { venues: [...m.venues] } : {}),
    })),
    ladder: {
      ...doc.ladder,
      titles: doc.ladder.titles.map((t) => ({ ...t })),
    },
    dials: { ...doc.dials },
    barks: {
      muster: [...doc.barks.muster],
      gates: [...doc.barks.gates],
      round: [...doc.barks.round],
      final: [...doc.barks.final],
      victory: [...doc.barks.victory],
      wipe: [...doc.barks.wipe],
      chest: [...doc.barks.chest],
    },
  };
}

/** The shipped seed — the DELETE endpoint's revert target. */
export const AUTHORED_ARENAS: Readonly<ArenasDef> = Object.freeze(deepCopyDoc(ARENAS));

// ------------------------------------------------------------ index

let venueById = new Map<string, ArenaVenueDef>();
let matchById = new Map<string, ArenaMatchDef>();

function rebuildIndexes(): void {
  venueById = new Map(ARENAS.venues.map((v) => [v.id, v]));
  matchById = new Map(ARENAS.matches.map((m) => [m.id, m]));
}
rebuildIndexes();

/** Swap the live doc whole (Studio PUT / boot seed) and re-index. */
export function replaceArenas(next: ArenasDef): void {
  const copy = deepCopyDoc(next);
  ARENAS.venues = copy.venues;
  ARENAS.matches = copy.matches;
  ARENAS.ladder = copy.ladder;
  ARENAS.dials = copy.dials;
  ARENAS.barks = copy.barks;
  rebuildIndexes();
}

export function arenaVenue(id: string): ArenaVenueDef | undefined {
  return venueById.get(id);
}

export function arenaMatchDef(id: string): ArenaMatchDef | undefined {
  return matchById.get(id);
}

/** The cards a venue's counter lists, in level order. */
export function matchesForVenue(venueId: string, doc: ArenasDef = ARENAS): ArenaMatchDef[] {
  const venue = doc.venues.find((v) => v.id === venueId);
  if (venue === undefined) return [];
  return doc.matches
    .filter((m) =>
      m.venues !== undefined
        ? m.venues.includes(venueId)
        : m.level >= venue.levelBand[0] && m.level <= venue.levelBand[1],
    )
    .sort((a, b) => a.level - b.level || (a.id < b.id ? -1 : 1));
}

// ------------------------------------------------------------ ladder

/** xp to climb rank r-1 -> r (r in [1, maxRank]). */
export function xpForArenaRank(rank: number, doc: ArenasDef = ARENAS): number {
  return Math.round(doc.ladder.xpBase * Math.pow(doc.ladder.xpGrowth, rank - 1));
}

/** Total xp banked at the moment rank r is reached. */
export function totalXpForArenaRank(rank: number, doc: ArenasDef = ARENAS): number {
  let sum = 0;
  for (let r = 1; r <= rank; r++) sum += xpForArenaRank(r, doc);
  return sum;
}

/** The rank a lifetime xp total has earned (0 = unranked). */
export function arenaRankForXp(xp: number, doc: ArenasDef = ARENAS): number {
  let rank = 0;
  let need = 0;
  while (rank < doc.ladder.maxRank) {
    need += xpForArenaRank(rank + 1, doc);
    if (xp < need) break;
    rank++;
  }
  return rank;
}

/** The highest title band a rank has entered ('' below the first). */
export function arenaTitleFor(rank: number, doc: ArenasDef = ARENAS): string {
  let title = '';
  for (const t of doc.ladder.titles) {
    if (rank >= t.rank) title = t.title;
  }
  return title;
}

/** The house xp formula: a card pays for its level unless it says. */
export function arenaMatchXp(def: ArenaMatchDef): number {
  return def.xp ?? 20 + def.level * 4;
}

/** The banded purse default (cards may override with lootTable). */
export function arenaPurseTableFor(level: number): string {
  if (level <= 10) return 'arena_purse_t1';
  if (level <= 20) return 'arena_purse_t2';
  if (level <= 32) return 'arena_purse_t3';
  return 'arena_purse_t4';
}

// ------------------------------------------------------------ validate

export interface ArenaValidateRefs {
  /** Bestiary def ids (Set membership check). */
  npcIds?: ReadonlySet<string>;
  /** Ids of defs that may wear a crown (kit + pool family or boss). */
  crownable?: ReadonlySet<string>;
  /** Loot table ids. */
  lootTables?: ReadonlySet<string>;
  /** Actor slugs. */
  actorSlugs?: ReadonlySet<string>;
  /** Zone id -> world rect. */
  zoneRects?: ReadonlyMap<string, { x: number; y: number; w: number; h: number }>;
  /** Standing plane ids (a venue may not be sealed onto a typo). */
  planeIds?: ReadonlySet<string>;
}

export type ValidateArenasResult =
  | { ok: true; def: ArenasDef; warnings: string[] }
  | { ok: false; errors: string[] };

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

/**
 * The dash ban, enforced where content enters: em/en dashes, double
 * hyphens, and the ellipsis character are machine-writing tells no
 * throat in the Dawnlands speaks (docs/VOICE.md).
 */
function voiceLawful(s: string): boolean {
  return !/[—–…]|--/.test(s);
}

/**
 * Refuse-don't-repair, the house validator law: unknown keys die
 * loudly, absent dials adopt the shipped default (THE BACKFILL LAW),
 * malformed values are errors, never coercions. Cross-references
 * (bestiary ids, tables, actor slugs, zone rects) check only when
 * refs are handed in — the Studio endpoint passes the full set; the
 * module self-test walks structure alone. Dangling refs are ERRORS
 * here, not warnings: a card that names a foe that does not stand
 * would strand a paying party in a sealed pit.
 */
export function validateArenas(raw: unknown, refs: ArenaValidateRefs = {}): ValidateArenasResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['arena doc must be an object'] };
  }
  const doc = raw as Record<string, unknown>;

  const said = (where: string, s: string): void => {
    if (!voiceLawful(s)) errors.push(`${where} breaks the dash ban (em/en dash, '--', or '…')`);
  };

  // ---------------------------------------------------------- venues
  const venues: ArenaVenueDef[] = [];
  if (doc.venues !== undefined) {
    if (!Array.isArray(doc.venues)) {
      errors.push('venues must be an array');
    } else {
      if (doc.venues.length > 16) errors.push('at most 16 venues');
      const seen = new Set<string>();
      for (const v of doc.venues as unknown[]) {
        if (typeof v !== 'object' || v === null || Array.isArray(v)) {
          errors.push('each venue must be an object');
          continue;
        }
        const vr = v as Record<string, unknown>;
        const id = typeof vr.id === 'string' ? vr.id : '';
        if (!SLUG_RE.test(id) || id.length > 32) {
          errors.push(`venue id '${String(vr.id)}' must be a slug of at most 32 chars`);
        }
        if (seen.has(id)) errors.push(`venue id '${id}' declared twice`);
        seen.add(id);
        if (typeof vr.name !== 'string' || vr.name.length === 0 || vr.name.length > 48) {
          errors.push(`venue '${id}' needs a name of at most 48 chars`);
        } else said(`venue '${id}' name`, vr.name);
        if (typeof vr.zone !== 'string' || vr.zone.length === 0) {
          errors.push(`venue '${id}' needs a zone id`);
        }
        if (vr.plane !== undefined && typeof vr.plane !== 'string') {
          errors.push(`venue '${id}' plane must be a string`);
        } else if (
          typeof vr.plane === 'string' &&
          refs.planeIds !== undefined &&
          !refs.planeIds.has(vr.plane)
        ) {
          errors.push(`venue '${id}' plane '${vr.plane}' names no standing plane`);
        }
        // Resolved ONCE (the audit's find: a second call re-pushed the
        // malformed-shape error and minted a phantom (0,0) containment
        // error on top of it).
        const pt = (key: 'exit' | 'chest'): { x: number; y: number } => {
          const p = vr[key];
          if (
            typeof p !== 'object' || p === null || Array.isArray(p) ||
            typeof (p as Record<string, unknown>).x !== 'number' ||
            typeof (p as Record<string, unknown>).y !== 'number'
          ) {
            errors.push(`venue '${id}' ${key} must be {x, y}`);
            return { x: 0, y: 0 };
          }
          return { x: (p as { x: number }).x, y: (p as { y: number }).y };
        };
        let pit = { x: 0, y: 0, rx: 0, ry: 0 };
        const rawPit = vr.pit;
        if (
          typeof rawPit !== 'object' || rawPit === null || Array.isArray(rawPit) ||
          ['x', 'y', 'rx', 'ry'].some(
            (k) => typeof (rawPit as Record<string, unknown>)[k] !== 'number',
          )
        ) {
          errors.push(`venue '${id}' pit must be {x, y, rx, ry}`);
        } else {
          pit = {
            x: (rawPit as { x: number }).x,
            y: (rawPit as { y: number }).y,
            rx: (rawPit as { rx: number }).rx,
            ry: (rawPit as { ry: number }).ry,
          };
          if (pit.rx < 3 || pit.rx > 16 || pit.ry < 3 || pit.ry > 16) {
            errors.push(`venue '${id}' pit radii must be in [3, 16] tiles`);
          }
        }
        const gates: Array<{ x: number; y: number }> = [];
        if (
          !Array.isArray(vr.gates) || vr.gates.length === 0 || vr.gates.length > 8 ||
          (vr.gates as unknown[]).some(
            (g) =>
              typeof g !== 'object' || g === null ||
              typeof (g as Record<string, unknown>).x !== 'number' ||
              typeof (g as Record<string, unknown>).y !== 'number',
          )
        ) {
          errors.push(`venue '${id}' gates must be 1..8 {x, y} tiles`);
        } else {
          for (const g of vr.gates as Array<{ x: number; y: number }>) {
            gates.push({ x: g.x, y: g.y });
          }
        }
        const master = typeof vr.master === 'string' ? vr.master : '';
        if (!SLUG_RE.test(master)) errors.push(`venue '${id}' needs a master actor slug`);
        else if (refs.actorSlugs !== undefined && !refs.actorSlugs.has(master)) {
          // The lamp, not the law: a ringmaster may be cast after the
          // ground is drawn — a venue with no master has no counter
          // yet, and the warning says so out loud.
          warnings.push(`venue '${id}' master '${master}' names no actor yet — the counter is closed`);
        }
        let levelBand: [number, number] = [1, 60];
        if (
          !Array.isArray(vr.levelBand) || vr.levelBand.length !== 2 ||
          typeof vr.levelBand[0] !== 'number' || typeof vr.levelBand[1] !== 'number' ||
          vr.levelBand[0] < 1 || vr.levelBand[1] > 60 || vr.levelBand[0] > vr.levelBand[1]
        ) {
          errors.push(`venue '${id}' levelBand must be [lo, hi] within [1, 60]`);
        } else {
          levelBand = [vr.levelBand[0], vr.levelBand[1]];
        }
        const zone = typeof vr.zone === 'string' ? vr.zone : '';
        if (refs.zoneRects !== undefined && zone !== '') {
          const rect = refs.zoneRects.get(zone);
          if (rect === undefined) {
            errors.push(`venue '${id}' zone '${zone}' names no zone`);
          } else {
            const inside = (x: number, y: number): boolean =>
              x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
            const exit = pt('exit');
            const chest = pt('chest');
            // The RIM is the claim (the audit's find: a center-only
            // check let the sand overhang the zone).
            for (const [label, x, y] of [
              ['pit', pit.x, pit.y],
              ['pit west rim', pit.x - pit.rx, pit.y],
              ['pit east rim', pit.x + pit.rx, pit.y],
              ['pit north rim', pit.x, pit.y - pit.ry],
              ['pit south rim', pit.x, pit.y + pit.ry],
              ['exit', exit.x, exit.y],
              ['chest', chest.x, chest.y],
              ...gates.map((g, i) => [`gates[${i}]`, g.x, g.y] as [string, number, number]),
            ] as Array<[string, number, number]>) {
              if (!inside(x, y)) {
                errors.push(`venue '${id}' ${label} (${x}, ${y}) lies outside zone '${zone}'`);
              }
            }
          }
        }
        for (const k of Object.keys(vr)) {
          if (
            !['id', 'name', 'zone', 'plane', 'pit', 'gates', 'exit', 'chest', 'master',
              'levelBand'].includes(k)
          ) {
            errors.push(`venue '${id}' has unknown field '${k}'`);
          }
        }
        venues.push({
          id,
          name: typeof vr.name === 'string' ? vr.name : id,
          zone,
          ...(typeof vr.plane === 'string' ? { plane: vr.plane as PlaneId } : {}),
          pit,
          gates,
          exit: pt('exit'),
          chest: pt('chest'),
          master,
          levelBand,
        });
      }
    }
  } else {
    venues.push(...deepCopyDoc(AUTHORED_ARENAS as ArenasDef).venues);
  }

  // ------------------------------------------------------------ dials
  const dials = { ...AUTHORED_ARENAS.dials };
  if (doc.dials !== undefined) {
    if (typeof doc.dials !== 'object' || doc.dials === null || Array.isArray(doc.dials)) {
      errors.push('dials must be an object');
    } else {
      const dr = doc.dials as Record<string, unknown>;
      const bounds: Record<keyof ArenaDialsDef, [number, number]> = {
        musterSec: [5, 120],
        countdownSec: [3, 120],
        chestGraceSec: [30, 900],
        cooldownSec: [0, 600],
        matchCapSec: [120, 3600],
        deathXpFrac: [0, 1],
        aliveCap: [1, 24],
      };
      for (const key of Object.keys(dr)) {
        if (!(key in bounds)) {
          errors.push(`dials has unknown field '${key}'`);
          continue;
        }
        const k = key as keyof ArenaDialsDef;
        const v = dr[k];
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          errors.push(`dials.${k} must be a number`);
        } else if (v < bounds[k][0] || v > bounds[k][1]) {
          errors.push(`dials.${k} must be in [${bounds[k][0]}, ${bounds[k][1]}]`);
        } else {
          dials[k] = v;
        }
      }
    }
  }

  // ---------------------------------------------------------- matches
  const entryCheck = (
    where: string,
    raw: unknown,
    bodiesMax: { n: number },
  ): ArenaWaveEntry | null => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      errors.push(`${where} must be an object`);
      return null;
    }
    const er = raw as Record<string, unknown>;
    const npc = typeof er.npc === 'string' ? er.npc : '';
    if (!SLUG_RE.test(npc)) errors.push(`${where} needs a bestiary npc id`);
    else if (refs.npcIds !== undefined && !refs.npcIds.has(npc)) {
      errors.push(`${where} npc '${npc}' names no bestiary def`);
    }
    let count: [number, number] | undefined;
    if (er.count !== undefined) {
      if (
        !Array.isArray(er.count) || er.count.length !== 2 ||
        typeof er.count[0] !== 'number' || typeof er.count[1] !== 'number' ||
        !Number.isInteger(er.count[0]) || !Number.isInteger(er.count[1]) ||
        er.count[0] < 1 || er.count[1] < er.count[0] || er.count[1] > 12
      ) {
        errors.push(`${where} count must be [min, max] integers in [1, 12]`);
      } else {
        count = [er.count[0], er.count[1]];
      }
    }
    bodiesMax.n += count !== undefined ? count[1] : 1;
    if (er.levelOffset !== undefined) {
      if (
        typeof er.levelOffset !== 'number' || !Number.isInteger(er.levelOffset) ||
        er.levelOffset < -10 || er.levelOffset > 10
      ) {
        errors.push(`${where} levelOffset must be an integer in [-10, 10]`);
      }
    }
    if (er.name !== undefined) {
      if (typeof er.name !== 'string' || er.name.length === 0 || er.name.length > 40) {
        errors.push(`${where} name must be at most 40 chars`);
      } else said(`${where} name`, er.name);
    }
    if (er.crown !== undefined && er.crown !== true) {
      errors.push(`${where} crown may only be true`);
    }
    if (er.crown === true && refs.crownable !== undefined && !refs.crownable.has(npc)) {
      errors.push(
        `${where} crowns '${npc}' but the def has no kit with a crown pool or boss block`,
      );
    }
    for (const k of Object.keys(er)) {
      if (!['npc', 'count', 'levelOffset', 'name', 'crown'].includes(k)) {
        errors.push(`${where} has unknown field '${k}'`);
      }
    }
    return {
      npc,
      ...(count !== undefined ? { count } : {}),
      ...(typeof er.levelOffset === 'number' ? { levelOffset: er.levelOffset } : {}),
      ...(typeof er.name === 'string' ? { name: er.name } : {}),
      ...(er.crown === true ? { crown: true } : {}),
    };
  };

  const matches: ArenaMatchDef[] = [];
  if (doc.matches !== undefined) {
    if (!Array.isArray(doc.matches)) {
      errors.push('matches must be an array');
    } else {
      if (doc.matches.length > 128) errors.push('at most 128 matches');
      const seen = new Set<string>();
      for (const m of doc.matches as unknown[]) {
        if (typeof m !== 'object' || m === null || Array.isArray(m)) {
          errors.push('each match must be an object');
          continue;
        }
        const mr = m as Record<string, unknown>;
        const id = typeof mr.id === 'string' ? mr.id : '';
        if (!SLUG_RE.test(id) || id.length > 40) {
          errors.push(`match id '${String(mr.id)}' must be a slug of at most 40 chars`);
        }
        if (seen.has(id)) errors.push(`match id '${id}' declared twice`);
        seen.add(id);
        if (typeof mr.name !== 'string' || mr.name.length === 0 || mr.name.length > 48) {
          errors.push(`match '${id}' needs a name of at most 48 chars`);
        } else said(`match '${id}' name`, mr.name);
        if (mr.blurb !== undefined) {
          if (typeof mr.blurb !== 'string' || mr.blurb.length > 120) {
            errors.push(`match '${id}' blurb must be at most 120 chars`);
          } else said(`match '${id}' blurb`, mr.blurb);
        }
        const level = typeof mr.level === 'number' ? mr.level : 0;
        if (!Number.isInteger(level) || level < 1 || level > 60) {
          errors.push(`match '${id}' level must be an integer in [1, 60]`);
        }
        const fee = typeof mr.fee === 'number' ? mr.fee : -1;
        if (!Number.isInteger(fee) || fee < 0 || fee > 10000) {
          errors.push(`match '${id}' fee must be an integer in [0, 10000] coins`);
        }
        if (mr.rankReq !== undefined) {
          if (
            typeof mr.rankReq !== 'number' || !Number.isInteger(mr.rankReq) ||
            mr.rankReq < 1 || mr.rankReq > 50
          ) {
            errors.push(`match '${id}' rankReq must be an integer in [1, 50]`);
          }
        }
        const rounds: ArenaRoundDef[] = [];
        if (!Array.isArray(mr.rounds) || mr.rounds.length < 1 || mr.rounds.length > 5) {
          errors.push(`match '${id}' needs 1..5 rounds`);
        } else {
          for (let ri = 0; ri < (mr.rounds as unknown[]).length; ri++) {
            const r = (mr.rounds as unknown[])[ri];
            const where = `match '${id}' round ${ri + 1}`;
            if (typeof r !== 'object' || r === null || Array.isArray(r)) {
              errors.push(`${where} must be an object`);
              continue;
            }
            const rr = r as Record<string, unknown>;
            if (rr.title !== undefined) {
              if (typeof rr.title !== 'string' || rr.title.length > 40) {
                errors.push(`${where} title must be at most 40 chars`);
              } else said(`${where} title`, rr.title);
            }
            if (rr.bark !== undefined) {
              if (typeof rr.bark !== 'string' || rr.bark.length > 140) {
                errors.push(`${where} bark must be at most 140 chars`);
              } else said(`${where} bark`, rr.bark);
            }
            const bodies = { n: 0 };
            const entries: ArenaWaveEntry[] = [];
            if (rr.entries !== undefined) {
              if (!Array.isArray(rr.entries) || rr.entries.length > 8) {
                errors.push(`${where} entries must be an array of at most 8`);
              } else {
                for (const e of rr.entries as unknown[]) {
                  const got = entryCheck(`${where} entry`, e, bodies);
                  if (got !== null) entries.push(got);
                }
              }
            }
            let pool: { pick: number; from: ArenaWaveEntry[] } | undefined;
            if (rr.pool !== undefined) {
              const pr = rr.pool as Record<string, unknown>;
              if (
                typeof rr.pool !== 'object' || rr.pool === null || Array.isArray(rr.pool) ||
                typeof pr.pick !== 'number' || !Number.isInteger(pr.pick) || pr.pick < 1 ||
                !Array.isArray(pr.from) || pr.from.length === 0 || pr.from.length > 8 ||
                pr.pick > pr.from.length
              ) {
                errors.push(`${where} pool must be {pick: 1..from.length, from: [1..8 entries]}`);
              } else {
                // Pool bodies count at the heaviest pick possible.
                const fromEntries: ArenaWaveEntry[] = [];
                const weights: number[] = [];
                for (const e of pr.from as unknown[]) {
                  const b = { n: 0 };
                  const got = entryCheck(`${where} pool entry`, e, b);
                  if (got !== null) {
                    fromEntries.push(got);
                    weights.push(b.n);
                  }
                }
                weights.sort((a, b) => b - a);
                for (let i = 0; i < Math.min(pr.pick, weights.length); i++) {
                  bodies.n += weights[i]!;
                }
                pool = { pick: pr.pick, from: fromEntries };
                for (const k of Object.keys(pr)) {
                  if (k !== 'pick' && k !== 'from') {
                    errors.push(`${where} pool has unknown field '${k}'`);
                  }
                }
              }
            }
            if (rr.entries === undefined && rr.pool === undefined) {
              errors.push(`${where} needs entries, a pool, or both`);
            }
            if (bodies.n > dials.aliveCap) {
              errors.push(
                `${where} can field ${bodies.n} bodies; the aliveCap is ${dials.aliveCap}`,
              );
            }
            if (rr.props !== undefined) {
              if (
                typeof rr.props !== 'number' || !Number.isInteger(rr.props) ||
                rr.props < 0 || rr.props > 8
              ) {
                errors.push(`${where} props must be an integer in [0, 8]`);
              }
            }
            for (const k of Object.keys(rr)) {
              if (!['title', 'bark', 'entries', 'pool', 'props'].includes(k)) {
                errors.push(`${where} has unknown field '${k}'`);
              }
            }
            rounds.push({
              ...(typeof rr.title === 'string' ? { title: rr.title } : {}),
              ...(typeof rr.bark === 'string' ? { bark: rr.bark } : {}),
              ...(entries.length > 0 ? { entries } : {}),
              ...(pool !== undefined ? { pool } : {}),
              ...(typeof rr.props === 'number' ? { props: rr.props } : {}),
            });
          }
        }
        if (mr.chest !== undefined) {
          if (!['wood', 'iron', 'gilded', 'mossy', 'boss'].includes(mr.chest as string)) {
            errors.push(`match '${id}' chest must be a chest kind`);
          }
        }
        if (mr.lootTable !== undefined) {
          if (typeof mr.lootTable !== 'string') {
            errors.push(`match '${id}' lootTable must be a string`);
          } else if (refs.lootTables !== undefined && !refs.lootTables.has(mr.lootTable)) {
            errors.push(`match '${id}' lootTable '${mr.lootTable}' names no table`);
          }
        }
        if (mr.xp !== undefined) {
          if (
            typeof mr.xp !== 'number' || !Number.isInteger(mr.xp) || mr.xp < 1 || mr.xp > 2000
          ) {
            errors.push(`match '${id}' xp must be an integer in [1, 2000]`);
          }
        }
        let venuesList: string[] | undefined;
        if (mr.venues !== undefined) {
          if (
            !Array.isArray(mr.venues) || mr.venues.length === 0 ||
            (mr.venues as unknown[]).some((s) => typeof s !== 'string')
          ) {
            errors.push(`match '${id}' venues must be a non-empty array of venue ids`);
          } else {
            venuesList = [...(mr.venues as string[])];
            for (const vid of venuesList) {
              const v = venues.find((w) => w.id === vid);
              if (v === undefined) {
                // The module's own law: a dangling ref is an ERROR — a
                // pinned card naming no venue is unlistable anywhere,
                // the exact drawer-death the docstring refuses.
                errors.push(`match '${id}' names venue '${vid}' which is not declared`);
              } else if (level < v.levelBand[0] || level > v.levelBand[1]) {
                warnings.push(
                  `match '${id}' (L${level}) is pinned to '${vid}' outside its band ` +
                    `[${v.levelBand[0]}, ${v.levelBand[1]}] — deliberate, or a typo`,
                );
              }
            }
          }
        }
        for (const k of Object.keys(mr)) {
          if (
            !['id', 'name', 'blurb', 'level', 'fee', 'rankReq', 'rounds', 'chest', 'lootTable',
              'xp', 'venues'].includes(k)
          ) {
            errors.push(`match '${id}' has unknown field '${k}'`);
          }
        }
        matches.push({
          id,
          name: typeof mr.name === 'string' ? mr.name : id,
          ...(typeof mr.blurb === 'string' ? { blurb: mr.blurb } : {}),
          level,
          fee,
          ...(typeof mr.rankReq === 'number' ? { rankReq: mr.rankReq } : {}),
          rounds,
          ...(mr.chest !== undefined ? { chest: mr.chest as ChestKind } : {}),
          ...(typeof mr.lootTable === 'string' ? { lootTable: mr.lootTable } : {}),
          ...(typeof mr.xp === 'number' ? { xp: mr.xp } : {}),
          ...(venuesList !== undefined ? { venues: venuesList } : {}),
        });
      }
    }
  } else {
    matches.push(...deepCopyDoc(AUTHORED_ARENAS as ArenasDef).matches);
  }
  // A venue whose counter would list no cards is a dead counter —
  // judged over the RESOLVED lists, so a venues-only doc still gets
  // the lamp (the audit's find).
  for (const v of venues) {
    const listed = matches.some((m) =>
      m.venues !== undefined
        ? m.venues.includes(v.id)
        : m.level >= v.levelBand[0] && m.level <= v.levelBand[1],
    );
    if (!listed) warnings.push(`venue '${v.id}' lists no cards under its band`);
  }

  // ----------------------------------------------------------- ladder
  const ladder: ArenaLadderDef = {
    maxRank: AUTHORED_ARENAS.ladder.maxRank,
    xpBase: AUTHORED_ARENAS.ladder.xpBase,
    xpGrowth: AUTHORED_ARENAS.ladder.xpGrowth,
    titles: deepCopyDoc(AUTHORED_ARENAS as ArenasDef).ladder.titles,
  };
  if (doc.ladder !== undefined) {
    if (typeof doc.ladder !== 'object' || doc.ladder === null || Array.isArray(doc.ladder)) {
      errors.push('ladder must be an object');
    } else {
      const lr = doc.ladder as Record<string, unknown>;
      if (lr.maxRank !== undefined) {
        if (
          typeof lr.maxRank !== 'number' || !Number.isInteger(lr.maxRank) ||
          lr.maxRank < 1 || lr.maxRank > 99
        ) {
          errors.push('ladder.maxRank must be an integer in [1, 99]');
        } else ladder.maxRank = lr.maxRank;
      }
      if (lr.xpBase !== undefined) {
        if (typeof lr.xpBase !== 'number' || lr.xpBase < 1 || lr.xpBase > 100000) {
          errors.push('ladder.xpBase must be in [1, 100000]');
        } else ladder.xpBase = lr.xpBase;
      }
      if (lr.xpGrowth !== undefined) {
        if (typeof lr.xpGrowth !== 'number' || lr.xpGrowth < 1 || lr.xpGrowth > 2) {
          errors.push('ladder.xpGrowth must be in [1, 2]');
        } else ladder.xpGrowth = lr.xpGrowth;
      }
      if (lr.titles !== undefined) {
        if (
          !Array.isArray(lr.titles) || lr.titles.length === 0 || lr.titles.length > 16
        ) {
          errors.push('ladder.titles must be 1..16 bands');
        } else {
          const titles: Array<{ rank: number; title: string }> = [];
          let prev = 0;
          for (const t of lr.titles as unknown[]) {
            const tr = t as Record<string, unknown>;
            if (
              typeof t !== 'object' || t === null ||
              typeof tr.rank !== 'number' || !Number.isInteger(tr.rank) ||
              typeof tr.title !== 'string' || tr.title.length === 0 || tr.title.length > 40
            ) {
              errors.push('each ladder title must be {rank, title}');
              continue;
            }
            if (tr.rank <= prev) errors.push('ladder.titles must ascend by rank');
            if (tr.rank > ladder.maxRank) {
              errors.push(`ladder title rank ${tr.rank} exceeds maxRank ${ladder.maxRank}`);
            }
            said('ladder title', tr.title);
            prev = tr.rank;
            titles.push({ rank: tr.rank, title: tr.title });
            for (const k of Object.keys(tr)) {
              if (k !== 'rank' && k !== 'title') {
                errors.push(`ladder title has unknown field '${k}'`);
              }
            }
          }
          if (titles.length > 0) ladder.titles = titles;
        }
      }
      for (const k of Object.keys(lr)) {
        if (!['maxRank', 'xpBase', 'xpGrowth', 'titles'].includes(k)) {
          errors.push(`ladder has unknown field '${k}'`);
        }
      }
    }
  }

  // ------------------------------------------------------------ barks
  const barks = deepCopyDoc(AUTHORED_ARENAS as ArenasDef).barks;
  if (doc.barks !== undefined) {
    if (typeof doc.barks !== 'object' || doc.barks === null || Array.isArray(doc.barks)) {
      errors.push('barks must be an object');
    } else {
      const br = doc.barks as Record<string, unknown>;
      const keys: Array<keyof ArenaBarksDef> = [
        'muster', 'gates', 'round', 'final', 'victory', 'wipe', 'chest',
      ];
      for (const k of Object.keys(br)) {
        if (!keys.includes(k as keyof ArenaBarksDef)) {
          errors.push(`barks has unknown field '${k}'`);
          continue;
        }
        const key = k as keyof ArenaBarksDef;
        const v = br[key];
        if (
          !Array.isArray(v) || v.length === 0 || v.length > 8 ||
          v.some((s) => typeof s !== 'string' || s.length === 0 || s.length > 140)
        ) {
          errors.push(`barks.${key} must be 1..8 lines of at most 140 chars`);
        } else {
          for (const line of v as string[]) said(`barks.${key}`, line);
          barks[key] = [...(v as string[])];
        }
      }
    }
  }

  for (const k of Object.keys(doc)) {
    if (!['venues', 'matches', 'ladder', 'dials', 'barks'].includes(k)) {
      errors.push(`unknown field '${k}'`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def: { venues, matches, ladder, dials, barks }, warnings };
}

// The shipped seed must pass its own law — a module that ships an
// invalid doc dies at build time, never at a Studio save (the
// stances precedent; cross-refs walk in arena.test.ts with the full
// registries in hand).
{
  const res = validateArenas(JSON.parse(JSON.stringify(AUTHORED_ARENAS)));
  if (!res.ok) {
    throw new Error(`AUTHORED_ARENAS fails its own validator: ${res.errors[0]}`);
  }
}
