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
  stance: 'hostile' | 'neutral';
  /**
   * The engage circle for this feud, in tiles — the distance at which
   * a body will OPEN the fight (its own posted aggroRange never
   * shrinks it). Absent = the doc's defaultRange.
   */
  range?: number;
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
  ],
  matrix: {
    // The hunt: wolves take the WILD sheep — the yard sheep is
    // livestock and structurally untouchable at both combat doors.
    'grazers|predators': { stance: 'hostile', range: 6 },
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
    return { stance: 'hostile', range: entry.range ?? doc.defaultRange, initiates: true };
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
  for (const [key, entry] of Object.entries(doc.matrix)) {
    if (entry.stance !== 'hostile') continue;
    const bar = key.indexOf('|');
    if (key.slice(0, bar) !== tribe && key.slice(bar + 1) !== tribe) continue;
    r = Math.max(r, entry.range ?? doc.defaultRange);
  }
  if (isFactionTribe(tribe)) {
    if (doc.watchVsMenace) r = Math.max(r, doc.watchRange);
    if (doc.opposeHostile) {
      for (const [key, w] of Object.entries(FACTIONS.oppose)) {
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
  | { ok: true; def: StancesDef }
  | { ok: false; errors: string[] };

/**
 * Refuse-don't-repair, the house validator law: unknown keys die
 * loudly, absent dials adopt the shipped default (THE BACKFILL LAW —
 * a doc saved before a dial existed keeps its edits when the table
 * grows), malformed values are errors, never coercions.
 */
export function validateStances(raw: unknown): ValidateStancesResult {
  const errors: string[] = [];
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
      const seen = new Set<string>();
      for (const t of doc.tribes as unknown[]) {
        if (typeof t !== 'object' || t === null || Array.isArray(t)) {
          errors.push('each tribe must be an object');
          continue;
        }
        const tr = t as Record<string, unknown>;
        const id = typeof tr.id === 'string' ? tr.id : '';
        if (!SLUG_RE.test(id)) errors.push(`tribe id '${String(tr.id)}' must be a slug`);
        if (RESERVED_TRIBES.has(id)) errors.push(`tribe id '${id}' is reserved (implicit tribe)`);
        if (FACTIONS.roster.some((f) => f.id === id)) {
          errors.push(`tribe id '${id}' collides with a faction — faction tribes are implicit`);
        }
        if (seen.has(id)) errors.push(`tribe id '${id}' declared twice`);
        seen.add(id);
        if (typeof tr.name !== 'string' || tr.name.length === 0) {
          errors.push(`tribe '${id}' needs a name`);
        }
        const strs = (key: 'npcPrefixes' | 'actors'): string[] => {
          const v = tr[key];
          if (v === undefined) return [];
          if (!Array.isArray(v) || v.some((s) => typeof s !== 'string' || s.length === 0)) {
            errors.push(`tribe '${id}' ${key} must be an array of non-empty strings`);
            return [];
          }
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
        tribes.push({
          id,
          name: typeof tr.name === 'string' ? tr.name : id,
          npcPrefixes: strs('npcPrefixes'),
          actors: strs('actors'),
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
      for (const [key, e] of Object.entries(doc.matrix as Record<string, unknown>)) {
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
        if (typeof e !== 'object' || e === null || Array.isArray(e)) {
          errors.push(`matrix['${key}'] must be an object`);
          continue;
        }
        const entry = e as Record<string, unknown>;
        if (entry.stance !== 'hostile' && entry.stance !== 'neutral') {
          errors.push(`matrix['${key}'].stance must be 'hostile' or 'neutral'`);
          continue;
        }
        if (
          entry.range !== undefined &&
          (typeof entry.range !== 'number' || !Number.isFinite(entry.range) ||
            entry.range < 1 || entry.range > 24)
        ) {
          errors.push(`matrix['${key}'].range must be in [1, 24]`);
        }
        for (const k of Object.keys(entry)) {
          if (k !== 'stance' && k !== 'range') {
            errors.push(`matrix['${key}'] has unknown field '${k}'`);
          }
        }
        matrix[key] = {
          stance: entry.stance,
          ...(typeof entry.range === 'number' ? { range: entry.range } : {}),
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
  return { ok: true, def };
}
