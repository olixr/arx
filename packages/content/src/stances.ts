import { FACTIONS, factionOfActor, factionOfNpc } from './factions/factions.js';

/**
 * THE WILD TAKES SIDES (docs/npc-hostility-plan.md) — the ecosystem's
 * political map. TRIBE says who a combat body is; STANCE says how one
 * tribe regards another. Both resolve at CALL TIME from this live doc
 * (the FACTIONS precedent: a Studio save re-draws the wild's loyalties
 * on the very next perception scan; nothing tribe-shaped is cached on
 * a component except the per-spawn override, which is PLACEMENT data).
 *
 * The implicit tribes are the coverage law — every combat body reads a
 * tribe with zero enumeration debt:
 *   'menace'   — an unclaimed bestiary body that initiates on people
 *                (def.aggroRange > 0). The watch answers these by
 *                default; a brand-new mob def is covered the day it
 *                ships, no content edit anywhere.
 *   'wildfolk' — an unclaimed passive bestiary body (the hen, the rat
 *                nobody fears). Nobody's enemy by default.
 *   'folk'     — an unaffiliated actor (the grocer). Friendly actors
 *                carry no combat body at all, so this tribe only ever
 *                fights when a neutral-with-combat actor is left out
 *                of every faction and every claim.
 *   a faction id — a faction member's tribe IS its faction ('crown',
 *                'reavers', ...), actors by slug and bestiary by the
 *                roster's npcPrefixes, so the reputation epic's
 *                political map and this one can never disagree about
 *                who a body belongs to.
 */

export type Stance = 'ally' | 'neutral' | 'hostile';

/** One matrix row: how the two tribes of its pair key regard each other. */
export interface StanceEntryDef {
  /**
   * 'hostile' — the pair feuds; 'neutral' — an authored truce that
   * OUTRANKS every default (the way to exempt one tribe from the
   * watch); 'ally' — an authored kinship: neither side may open a
   * fight on the other (the kin-peace law extended across tribes —
   * the worgs that run with the wolfkin, the hounds that serve the
   * watch).
   */
  stance: 'hostile' | 'neutral' | 'ally';
  /**
   * The engage circle for this feud, in tiles — the distance at which
   * a body will OPEN the fight (its own posted aggroRange never
   * shrinks it). Absent = the doc's defaultRange.
   */
  range?: number;
  /**
   * THE ONE-WAY FEUD: the tribe id (one of the pair) that alone may
   * OPEN this fight — the hunt reads predator-side only, the prey
   * answers through forced retaliation like everything else. Absent =
   * both sides initiate. Only meaningful on hostile entries.
   */
  initiator?: string;
}

/** A declared tribe — a named side in the wild's politics. */
export interface TribeDef {
  id: string;
  name: string;
  /** Bestiary def-id prefixes this tribe claims (longest claim wins). */
  npcPrefixes: string[];
  /** Actor slugs claimed by name (outranks the actor's faction read). */
  actors: string[];
  /**
   * A menace tribe is one the watch answers under the watchVsMenace
   * default even though it is claimed — the wolf is still a wolf.
   * Claimed tribes default to false: claiming a body OUT of 'menace'
   * (the grazers) is half the reason to declare a tribe at all.
   */
  menace?: boolean;
}

export interface StancesDef {
  tribes: TribeDef[];
  /**
   * 'a|b' sorted-pair keys → entry, symmetric (both sides may open the
   * fight). Pairs may name declared tribes, faction ids, the implicit
   * tribes, or ids that exist only as per-spawn overrides — a feud may
   * be authored before either camp is placed.
   */
  matrix: Record<string, StanceEntryDef>;
  /**
   * THE WATCH ANSWERS: every faction tribe is hostile to 'menace' (and
   * to declared tribes flying menace: true) at watchRange — ONE-WAY.
   * The watch charges the worg at the gate; the worg does not besiege
   * the town (a landed blow still answers back, forced, as ever).
   */
  watchVsMenace: boolean;
  /**
   * THE POLITICAL MAP MARCHES: two faction tribes whose pair carries a
   * weight in FACTIONS.oppose are hostile at defaultRange, both ways —
   * the crown's watch cuts down brigands because crown|reavers was
   * already law the day the reputation epic shipped.
   */
  opposeHostile: boolean;
  /** The watch's engage circle vs menace tribes (tiles). */
  watchRange: number;
  /** Engage circle for matrix/oppose feuds that state none (tiles). */
  defaultRange: number;
}

/** The one answer shape every combat read consumes. */
export interface StanceAnswer {
  stance: Stance;
  /** Engage circle in tiles (0 unless hostile). */
  range: number;
  /**
   * May the QUERYING side (the first argument) open this fight? The
   * one-way watchVsMenace default answers false to the menace side;
   * everything else hostile answers true to both.
   */
  initiates: boolean;
}

/** The implicit tribe ids — reserved, never declarable. */
export const TRIBE_MENACE = 'menace';
export const TRIBE_WILDFOLK = 'wildfolk';
export const TRIBE_FOLK = 'folk';

const RESERVED_TRIBES = new Set([TRIBE_MENACE, TRIBE_WILDFOLK, TRIBE_FOLK]);
const SLUG_RE = /^[a-z][a-z0-9_]*$/;

/**
 * The live doc — module state the whole game reads, swapped whole by
 * replaceStances. Ships as the authored seed below.
 */
export const STANCES: StancesDef = {
  tribes: [
    {
      id: 'predators',
      name: 'The Hunting Kinds',
      npcPrefixes: ['wolf', 'worg', 'dire_wolf', 'fey_wolf', 'lynx', 'fox', 'bear'],
      actors: [],
      // Still a wolf: the watch cuts a dragged one down at the gate.
      menace: true,
    },
    {
      id: 'grazers',
      name: 'The Grazing Kinds',
      // Deliberately NOT menace even though a boar charges people:
      // gate guards must never farm the starter boar quests empty.
      npcPrefixes: ['stag', 'hind', 'boar', 'dire_boar', 'ram', 'sheep'],
      actors: [],
    },
    // ---- THE CONTESTED LANDS (docs/contested-lands-plan.md §2, §8):
    // the non-speaking peoples of the country around Dawnmead,
    // declared as tribes so camps can feud through the matrix.
    // Reputation is for speaking parties only — none of these is a
    // faction. Every bestiary claim below keeps menace: true so the
    // watch still charges a gnoll at the gate exactly as it did when
    // the body read 'menace' implicitly (behavior-preserving; the
    // only change is that the peoples stop being one another's kin).
    {
      id: 'gnoll',
      name: 'The Husk Warband',
      npcPrefixes: ['gnoll'],
      actors: [],
      menace: true,
    },
    {
      id: 'dead',
      name: 'The Struck Line',
      npcPrefixes: ['skeleton'],
      actors: [],
      menace: true,
    },
    {
      id: 'kobold',
      name: 'The Digmasters',
      npcPrefixes: ['kobold'],
      actors: [],
      menace: true,
    },
    {
      id: 'skral',
      name: 'The Upstream Shoal',
      npcPrefixes: ['skral'],
      actors: [],
      menace: true,
    },
    {
      id: 'legion',
      name: 'The Legion',
      npcPrefixes: ['hobgoblin'],
      actors: [],
      menace: true,
    },
    // The Drum (the goblins of the Felling): no bestiary claim either —
    // the bestiary goblin stays implicit menace everywhere (the Silver
    // Line's gate still charges one), and only the Felling's rows wear
    // this banner per spawn, so 'crown|goblin' below can be a truce
    // for Rurik's walk without touching any other watch. Menace: the
    // First Lamp's ring and Brede's crew still charge the Drum's reach.
    {
      id: 'goblin',
      name: 'The Drum',
      npcPrefixes: [],
      actors: [],
      menace: true,
    },
    // The goblins who left the door: no bestiary claim — the grubfarm
    // variant's rows wear this banner per spawn (the spawn-minted
    // tribe door). Not menace: a farming people the watch does not
    // charge on sight; their pickets shout before they loose.
    {
      id: 'goblin_doorless',
      name: 'The Doorless',
      npcPrefixes: [],
      actors: [],
    },
    // The fourth people (plan §11): declared in band 7, the bodies in
    // band 9 (9a-9c the five looks, 9d THE SETT). THE PREFIX FLIP (9d,
    // E4; 9c handoff 4; rulings R-E): the bestiary's five Dolmen rows
    // (dolmen, dolmen_sinter, dolmen_culm, dolmen_gossan,
    // dolmen_champion) wear the tribe by prefix now that a body stands
    // in the world (Vorl's row on the Sett), so the three neutral rows
    // below are live and the set that never initiates is read as its
    // own people, never as wildfolk. No faction claims the prefix
    // (there is no `dolmen` faction: standing never targets them).
    {
      id: 'dolmen',
      name: 'The Standing Course',
      npcPrefixes: ['dolmen'],
      actors: [],
    },
  ],
  matrix: {
    // The hunt: wolves take the WILD sheep — the yard sheep is
    // livestock and structurally untouchable at both combat doors.
    // ONE-WAY (the proving pass's F1): only the predator OPENS the
    // hunt — a stag never charges a wolf on sight; a struck boar
    // still turns and fights through forced retaliation.
    'grazers|predators': { stance: 'hostile', range: 6, initiator: 'predators' },
    // ---- THE CONTESTED LANDS: the misaligned-but-not-opposed pairs
    // (plan §2, §5 beat 7) — authored truces so two peoples visibly
    // coexist. Neutral rows cannot cascade, so they ship together.
    // Two peoples who came up the same dark and pass each other.
    'goblin_doorless|kobold': { stance: 'neutral' },
    // The Company waves at the shoal at the crossing; the shoal waves back.
    'reavers|skral': { stance: 'neutral' },
    // The pack walks the ward line unbothered; nothing else does.
    'evencourt|predators': { stance: 'neutral' },
    // Rurik walks through the grub farm measuring; the pickets watch.
    // ('goblin' is the Drum's spawn-minted banner, declared above.)
    'crown|goblin': { stance: 'neutral' },
    // The Dolmen's three: two thorough peoples under the meadow's
    // sheet, two tollers (Brede laughs at a toll paid in rocks and
    // honours it), two peoples who moved for water and never meet.
    'dolmen|kobold': { stance: 'neutral' },
    'dolmen|reavers': { stance: 'neutral' },
    'dolmen|skral': { stance: 'neutral' },
    // The standing feuds that are NEVER blade (plan §8): the roster
    // carries oppose weights for these pairs, and without a truce
    // row opposeHostile would draw steel between Eskil's watch and
    // Hale's, or between Halvor's people and Ingram's dike crew.
    'returners|waykeepers': { stance: 'neutral' },
    'fenside|fordgate': { stance: 'neutral' },
    // ---- THE HOSTILE ROWS LAND ONE ZONE AT A TIME, behind the
    // FRONTIER doc (plan §8: watch regionBoldMax and calm before the
    // next). None shipped in Band 0; band 8's three stand below. The
    // ledger still owed:
    //   band 10 (THE SPOIL WOLD, plan §5 beat 4 + the pressed satellite):
    //     'dead|goblin_doorless':  { stance: 'hostile', range: 8, initiator: 'dead' }
    //     'goblin_doorless|legion':{ stance: 'hostile', range: 10, initiator: 'legion' }
    // ---- Band 8, THE HUSK AND THE WARD LINE (plan §5 beats 1-3).
    // The line that died holding the husk charges the squat the tick it
    // stands: the changeover at half past eight is a fight only under
    // a character's eye (keepSpawnHours steps nobody off in front of
    // anyone), and the gnolls answer but never open it.
    'dead|gnoll': { stance: 'hostile', range: 10, initiator: 'dead' },
    // Worg against wolf: the Drum's runners and the pack meet on any
    // ground they share and either side opens it. No authored ground
    // this band (the Ashen Hem crossing is band 10's); the far-camp
    // audit counts the row at a rolled camp beside a den.
    'goblin|predators': { stance: 'hostile', range: 8 },
    // The Drum's pickets hunt the Doorless hands that cut snags at the
    // camp's edge after dark; the Doorless never open it (beat 3).
    'goblin|goblin_doorless': { stance: 'hostile', range: 10, initiator: 'goblin' },
  },
  watchVsMenace: true,
  opposeHostile: true,
  watchRange: 9,
  defaultRange: 8,
};

function deepCopyDoc(doc: StancesDef): StancesDef {
  return {
    tribes: doc.tribes.map((t) => ({
      ...t,
      npcPrefixes: [...t.npcPrefixes],
      actors: [...t.actors],
    })),
    matrix: Object.fromEntries(Object.entries(doc.matrix).map(([k, e]) => [k, { ...e }])),
    watchVsMenace: doc.watchVsMenace,
    opposeHostile: doc.opposeHostile,
    watchRange: doc.watchRange,
    defaultRange: doc.defaultRange,
  };
}

/** The shipped seed — the DELETE endpoint's revert target. */
export const AUTHORED_STANCES: Readonly<StancesDef> = Object.freeze(deepCopyDoc(STANCES));

// --------------------------------------------------- claim indexes

let tribeActorIndex = new Map<string, string>();
let tribePrefixIndex: { prefix: string; tribe: string }[] = [];
let menaceTribes = new Set<string>();

function rebuildIndexes(): void {
  tribeActorIndex = new Map();
  tribePrefixIndex = [];
  menaceTribes = new Set();
  for (const t of STANCES.tribes) {
    for (const slug of t.actors) tribeActorIndex.set(slug, t.id);
    for (const prefix of t.npcPrefixes) tribePrefixIndex.push({ prefix, tribe: t.id });
    if (t.menace) menaceTribes.add(t.id);
  }
  // Longest claim wins: 'dire_wolf' must beat a tribe claiming 'dire'.
  tribePrefixIndex.sort((a, b) => b.prefix.length - a.prefix.length);
}
rebuildIndexes();

/** Swap the live doc whole (Studio PUT / boot seed) and re-index. */
export function replaceStances(next: StancesDef): void {
  const copy = deepCopyDoc(next);
  STANCES.tribes = copy.tribes;
  STANCES.matrix = copy.matrix;
  STANCES.watchVsMenace = copy.watchVsMenace;
  STANCES.opposeHostile = copy.opposeHostile;
  STANCES.watchRange = copy.watchRange;
  STANCES.defaultRange = copy.defaultRange;
  rebuildIndexes();
}

// --------------------------------------------------- tribe resolution

/** Is this tribe id a faction tribe under the LIVE roster? */
export function isFactionTribe(tribe: string): boolean {
  return FACTIONS.roster.some((f) => f.id === tribe);
}

/** Does the watch read this tribe as a menace? */
export function isMenaceTribe(tribe: string): boolean {
  return tribe === TRIBE_MENACE || menaceTribes.has(tribe);
}

/**
 * A bestiary body's tribe: declared claim → faction prefix → implicit.
 * `initiates` is the def's own aggroRange > 0 read — passed in so this
 * module never needs the bestiary (no import cycle, and synthesized
 * actor defs resolve through tribeOfActorId instead).
 */
export function tribeOfNpcId(defId: string, initiates: boolean): string {
  for (const e of tribePrefixIndex) {
    if (defId.startsWith(e.prefix)) return e.tribe;
  }
  const fid = factionOfNpc(defId);
  if (fid !== null) return fid;
  return initiates ? TRIBE_MENACE : TRIBE_WILDFOLK;
}

/** An actor's tribe: declared slug claim → its faction → 'folk'. */
export function tribeOfActorId(slug: string): string {
  const claimed = tribeActorIndex.get(slug);
  if (claimed !== undefined) return claimed;
  return factionOfActor(slug) ?? TRIBE_FOLK;
}

// --------------------------------------------------- the stance read

const NEUTRAL: StanceAnswer = { stance: 'neutral', range: 0, initiates: false };

/** The sorted pair key both the doc and FACTIONS.oppose speak. */
export function stancePairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/**
 * How tribe `a` regards tribe `b` — the one pure read every combat
 * seam consumes. Kin → ally; the matrix speaks next; then the two
 * defaults (the political map, the watch); then neutral.
 */
export function stanceBetween(a: string, b: string, doc: StancesDef = STANCES): StanceAnswer {
  if (a === b) return { stance: 'ally', range: 0, initiates: false };
  const entry = doc.matrix[stancePairKey(a, b)];
  if (entry !== undefined) {
    if (entry.stance === 'neutral') return NEUTRAL;
    if (entry.stance === 'ally') return { stance: 'ally', range: 0, initiates: false };
    return {
      stance: 'hostile',
      range: entry.range ?? doc.defaultRange,
      // THE ONE-WAY FEUD: an authored initiator holds the other side's
      // hand — the prey answers only through forced retaliation.
      initiates: entry.initiator === undefined || entry.initiator === a,
    };
  }
  const aFaction = isFactionTribe(a);
  const bFaction = isFactionTribe(b);
  if (doc.opposeHostile && aFaction && bFaction) {
    const w = FACTIONS.oppose[stancePairKey(a, b)];
    if (w !== undefined && w > 0) {
      return { stance: 'hostile', range: doc.defaultRange, initiates: true };
    }
  }
  if (doc.watchVsMenace) {
    if (aFaction && isMenaceTribe(b)) {
      return { stance: 'hostile', range: doc.watchRange, initiates: true };
    }
    if (bFaction && isMenaceTribe(a)) {
      // The worg does not besiege the gate — but it knows an enemy.
      return { stance: 'hostile', range: doc.watchRange, initiates: false };
    }
  }
  return NEUTRAL;
}

/**
 * The widest circle this tribe would OPEN a fight at — 0 means the
 * body never scans other bodies at all, which is the cheap gate the
 * perception dispatch reads (a grocer, a hen, and a lone goblin all
 * pay nothing for this system existing).
 */
export function stanceScanRange(tribe: string, doc: StancesDef = STANCES): number {
  let r = 0;
  // for-in, no entry-array allocations: this runs in the perception
  // dispatch gate at 4 Hz per eligible body.
  for (const key in doc.matrix) {
    const entry = doc.matrix[key]!;
    if (entry.stance !== 'hostile') continue;
    // THE ONE-WAY FEUD holds here too: a side the entry's initiator
    // excludes never scans for this feud at all.
    if (entry.initiator !== undefined && entry.initiator !== tribe) continue;
    const bar = key.indexOf('|');
    if (key.slice(0, bar) !== tribe && key.slice(bar + 1) !== tribe) continue;
    r = Math.max(r, entry.range ?? doc.defaultRange);
  }
  if (isFactionTribe(tribe)) {
    if (doc.watchVsMenace) r = Math.max(r, doc.watchRange);
    if (doc.opposeHostile) {
      for (const key in FACTIONS.oppose) {
        const w = FACTIONS.oppose[key];
        if (w === undefined || w <= 0) continue;
        const bar = key.indexOf('|');
        if (key.slice(0, bar) === tribe || key.slice(bar + 1) === tribe) {
          r = Math.max(r, doc.defaultRange);
          break;
        }
      }
    }
  }
  return r;
}

// --------------------------------------------------- the Studio's half

export type ValidateStancesResult =
  | { ok: true; def: StancesDef; warnings: string[] }
  | { ok: false; errors: string[] };

/**
 * Refuse-don't-repair, the house validator law: unknown keys die
 * loudly, absent dials adopt the shipped default (THE BACKFILL LAW —
 * a doc saved before a dial existed keeps its edits when the table
 * grows), malformed values are errors, never coercions. Matrix pair
 * sides may name ids the doc has never heard of — that is the
 * spawn-minted-tribe door, deliberately open — so those come back as
 * WARNINGS, never errors: the typo'd feud that silently never fires
 * is this system's worst curation trap, and the warning is its lamp.
 */
export function validateStances(raw: unknown): ValidateStancesResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['stances doc must be an object'] };
  }
  const doc = raw as Record<string, unknown>;

  const bool = (key: 'watchVsMenace' | 'opposeHostile'): boolean => {
    const v = doc[key];
    if (v === undefined) return AUTHORED_STANCES[key];
    if (typeof v !== 'boolean') {
      errors.push(`${key} must be a boolean`);
      return AUTHORED_STANCES[key];
    }
    return v;
  };
  const num = (key: 'watchRange' | 'defaultRange', lo: number, hi: number): number => {
    const v = doc[key];
    if (v === undefined) return AUTHORED_STANCES[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`${key} must be a number`);
      return lo;
    }
    if (v < lo || v > hi) errors.push(`${key} must be in [${lo}, ${hi}]`);
    return v;
  };

  const tribes: TribeDef[] = [];
  if (doc.tribes !== undefined) {
    if (!Array.isArray(doc.tribes)) {
      errors.push('tribes must be an array');
    } else {
      if ((doc.tribes as unknown[]).length > 32) errors.push('at most 32 tribes');
      const seen = new Set<string>();
      const seenActors = new Map<string, string>();
      const seenPrefixes = new Map<string, string>();
      for (const t of doc.tribes as unknown[]) {
        if (typeof t !== 'object' || t === null || Array.isArray(t)) {
          errors.push('each tribe must be an object');
          continue;
        }
        const tr = t as Record<string, unknown>;
        const id = typeof tr.id === 'string' ? tr.id : '';
        if (!SLUG_RE.test(id) || id.length > 32) {
          errors.push(`tribe id '${String(tr.id)}' must be a slug of at most 32 chars`);
        }
        if (RESERVED_TRIBES.has(id)) errors.push(`tribe id '${id}' is reserved (implicit tribe)`);
        if (FACTIONS.roster.some((f) => f.id === id)) {
          errors.push(`tribe id '${id}' collides with a faction — faction tribes are implicit`);
        }
        if (seen.has(id)) errors.push(`tribe id '${id}' declared twice`);
        seen.add(id);
        if (typeof tr.name !== 'string' || tr.name.length === 0 || tr.name.length > 48) {
          errors.push(`tribe '${id}' needs a name of at most 48 chars`);
        }
        const strs = (key: 'npcPrefixes' | 'actors', cap: number): string[] => {
          const v = tr[key];
          if (v === undefined) return [];
          if (!Array.isArray(v) || v.some((s) => typeof s !== 'string' || s.length === 0)) {
            errors.push(`tribe '${id}' ${key} must be an array of non-empty strings`);
            return [];
          }
          if (v.length > cap) errors.push(`tribe '${id}' ${key} holds at most ${cap}`);
          return v as string[];
        };
        if (tr.menace !== undefined && typeof tr.menace !== 'boolean') {
          errors.push(`tribe '${id}' menace must be a boolean`);
        }
        for (const k of Object.keys(tr)) {
          if (!['id', 'name', 'npcPrefixes', 'actors', 'menace'].includes(k)) {
            errors.push(`tribe '${id}' has unknown field '${k}'`);
          }
        }
        const npcPrefixes = strs('npcPrefixes', 16);
        const actors = strs('actors', 64);
        // ONE NAME, ONE BANNER (the factions membership law's mirror):
        // a body claimed by two tribes would resolve by Map order —
        // silent politics. Refused instead.
        for (const slug of actors) {
          const prior = seenActors.get(slug);
          if (prior !== undefined) {
            errors.push(`actor '${slug}' claimed by both '${prior}' and '${id}'`);
          }
          seenActors.set(slug, id);
        }
        for (const p of npcPrefixes) {
          const prior = seenPrefixes.get(p);
          if (prior !== undefined) {
            errors.push(`prefix '${p}' claimed by both '${prior}' and '${id}'`);
          }
          seenPrefixes.set(p, id);
          // A tribe prefix shadowing a faction's npcPrefixes claim
          // quietly pulls those bodies out of the political map —
          // legal (claims outrank), but never silent.
          for (const f of FACTIONS.roster) {
            for (const fp of f.npcPrefixes) {
              if (p.startsWith(fp) || fp.startsWith(p)) {
                warnings.push(
                  `tribe '${id}' prefix '${p}' overlaps faction '${f.id}' claim '${fp}' — ` +
                    `the tribe claim wins those bodies`,
                );
              }
            }
          }
        }
        tribes.push({
          id,
          name: typeof tr.name === 'string' ? tr.name : id,
          npcPrefixes,
          actors,
          ...(tr.menace === true ? { menace: true } : {}),
        });
      }
    }
  } else {
    tribes.push(...deepCopyDoc(AUTHORED_STANCES as StancesDef).tribes);
  }

  const matrix: Record<string, StanceEntryDef> = {};
  if (doc.matrix !== undefined) {
    if (typeof doc.matrix !== 'object' || doc.matrix === null || Array.isArray(doc.matrix)) {
      errors.push('matrix must be an object of pair keys');
    } else {
      const entries = Object.entries(doc.matrix as Record<string, unknown>);
      if (entries.length > 256) errors.push('at most 256 matrix entries');
      const knownSide = (p: string): boolean =>
        RESERVED_TRIBES.has(p) ||
        tribes.some((t) => t.id === p) ||
        FACTIONS.roster.some((f) => f.id === p);
      for (const [key, e] of entries) {
        const parts = key.split('|');
        if (
          parts.length !== 2 ||
          parts[0] === parts[1] ||
          [...parts].sort().join('|') !== key ||
          !parts.every((p) => SLUG_RE.test(p))
        ) {
          errors.push(`matrix key '${key}' must be 'a|b' with distinct sorted slugs`);
          continue;
        }
        // THE LAMP ON THE TYPO: an unknown side is legal (spawn-minted
        // tribes are authored before their camps stand) but named, so
        // 'predetors|grazers' never dies silently in a drawer.
        for (const p of parts) {
          if (!knownSide(p)) {
            warnings.push(
              `matrix key '${key}' side '${p}' names no declared tribe, faction, or implicit ` +
                `tribe — spawn-minted banner, or a typo that will never fire`,
            );
          }
        }
        if (typeof e !== 'object' || e === null || Array.isArray(e)) {
          errors.push(`matrix['${key}'] must be an object`);
          continue;
        }
        const entry = e as Record<string, unknown>;
        if (entry.stance !== 'hostile' && entry.stance !== 'neutral' && entry.stance !== 'ally') {
          errors.push(`matrix['${key}'].stance must be 'hostile', 'neutral', or 'ally'`);
          continue;
        }
        if (
          entry.range !== undefined &&
          (typeof entry.range !== 'number' || !Number.isFinite(entry.range) ||
            entry.range < 1 || entry.range > 24)
        ) {
          errors.push(`matrix['${key}'].range must be in [1, 24]`);
        }
        if (entry.initiator !== undefined) {
          if (entry.stance !== 'hostile') {
            errors.push(`matrix['${key}'].initiator is only meaningful on a hostile entry`);
          } else if (entry.initiator !== parts[0] && entry.initiator !== parts[1]) {
            errors.push(`matrix['${key}'].initiator must be one of the pair`);
          }
        }
        for (const k of Object.keys(entry)) {
          if (k !== 'stance' && k !== 'range' && k !== 'initiator') {
            errors.push(`matrix['${key}'] has unknown field '${k}'`);
          }
        }
        matrix[key] = {
          stance: entry.stance,
          ...(typeof entry.range === 'number' ? { range: entry.range } : {}),
          ...(typeof entry.initiator === 'string' ? { initiator: entry.initiator } : {}),
        };
      }
    }
  } else {
    Object.assign(matrix, deepCopyDoc(AUTHORED_STANCES as StancesDef).matrix);
  }

  const def: StancesDef = {
    tribes,
    matrix,
    watchVsMenace: bool('watchVsMenace'),
    opposeHostile: bool('opposeHostile'),
    watchRange: num('watchRange', 1, 24),
    defaultRange: num('defaultRange', 1, 24),
  };
  for (const k of Object.keys(doc)) {
    if (
      !['tribes', 'matrix', 'watchVsMenace', 'opposeHostile', 'watchRange', 'defaultRange'].includes(
        k,
      )
    ) {
      errors.push(`unknown field '${k}'`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def, warnings };
}

// The shipped seed must pass its own law — a module that ships an
// invalid doc dies at build time, never at a Studio save (the
// factions precedent).
{
  const res = validateStances(JSON.parse(JSON.stringify(AUTHORED_STANCES)));
  if (!res.ok) {
    throw new Error(`AUTHORED_STANCES fails its own validator: ${res.errors[0]}`);
  }
}
