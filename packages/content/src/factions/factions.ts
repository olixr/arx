import { NPC_ACTORS } from '../actors/registry.js';
import type { ParsedFactionFlag } from './flags.js';
import type {
  FactionBand,
  FactionBandsDef,
  FactionDef,
  FactionsDef,
  FactionTheftDef,
} from './types.js';

/**
 * THE FACTIONS DOC — content's half of reputation
 * (docs/factions-plan.md; the server's creditStanding owns the one
 * write door). The roster, the bands, the deed values, the opposition
 * matrix, and every enforcement dial live HERE and nowhere else — the
 * dial law. Like FRONTIER, this is a live content doc (kind
 * 'factions', the two-hash law): the DB is the truth, this object is
 * the shipped seed AND the live registry — replaceFactions swaps the
 * fields in place, so every consumer that reads FACTIONS.x at call
 * time sees the Studio's edit on the very next beat. Never destructure
 * a dial into a long-lived variable.
 */
export const FACTIONS: FactionsDef = {
  roster: [
    {
      id: 'fordgate',
      name: 'The Amberford Charter',
      sigil: 'gate',
      blurb: 'The ford town and the vale behind it — the watch, the bank, the market rows.',
      members: [
        // Amberford
        'amberford_watch',
        'captain_aldis',
        'banker_cormund',
        'courier_nib',
        'ferryman_peld',
        'grocer_merra',
        'innkeep_dunna',
        'keeper_ansel',
        'master_tilo',
        'miller_garton',
        'orchardist_perl',
        'outfitter_hask',
        'sage_elowen',
        'smith_bretta',
        'farmer_jorel',
        'farmer_tamsin',
        'round_trader',
        // Pinewatch: the Charter's own factor, eleven years north and
        // counting every stick that leaves.
        'factor_ebba',
        // Hartfell: the buyer in the good room, refused quarterly with
        // tremendous courtesy. The Charter thinks in years.
        'buyer_hallward',
        // Dawnmead — one hearth-country with the ford (no politics of its own)
        'keeper_wren',
        'yardmaster_halla',
        'dawnmead_ward',
        'fletcher_rill',
        'sparkwright_varn',
        'forester_alder',
        'cook_berrit',
        'wright_ottery',
        'innkeep_gilly',
        'angler_weir',
        'farmer_brammel',
        'drover_sorrel',
        'twin_tansy',
        'twin_wick',
        // Kingsdelf — the Charter's far venture: the Returning banked
        // on Charter coin, and the watch wears the Charter's coat.
        'delfmaster_ruen',
        'factor_venn',
        'sealkeeper_annik',
        'innkeep_brekka',
        'stablemaster_orin',
        'smith_ferrun',
        'glasswright_mirena',
        'assayer_lorn',
        'provisioner_etta',
        'outfitter_cass',
        'salvewright_ida',
        'fisher_denna',
        'kingsdelf_watch',
        'kingsdelf_delver',
        'kingsdelf_glasshand',
      ],
      enforcers: ['amberford_watch', 'captain_aldis', 'yardmaster_halla', 'dawnmead_ward', 'kingsdelf_watch'],
      npcPrefixes: [],
      anchors: [
        { x: -64, y: 48 },
        { x: 520, y: -4 },
        { x: -480, y: 328 }, // Kingsdelf — the Charter's far seat
      ],
      refusals: [
        'Walk on. The watch knows your face.',
        'Not a word for you. Not here.',
        "You've taken enough from this town.",
      ],
      fineActor: 'captain_aldis',
    },
    {
      id: 'crown',
      name: 'The Crown of Silverfall',
      sigil: 'crown',
      blurb: 'The Silver Line and its city — castle, guilds, terraces, and the deep market below.',
      members: [
        'king_aeriex',
        'queen_kayri',
        'warden_maren',
        'castle_guard',
        'silverfall_watch',
        'bursar_odele',
        'enchantress_solvei',
        'forgemistress_balla',
        'foreman_grettir',
        'weaver_ottilie',
        'herbalist_wyn',
        'cook_signy',
        'hostler_osa',
        'mason_petra',
        'gardener_ivo',
        'smeltmaster_koll',
        'assayer_runa',
        'carpenter_stig',
        'cooper_dagny',
        'fletcher_haki',
        'silversmith_vigdis',
        'scrivener_tove',
        'surveyor_hedda', // the Crown's quiet eyes in the delf
        'innkeep_ragna',
        'galleria_trader',
        'gate_monger',
        // The Undercroft answers to the reeve, and the reeve to the crown
        'reeve_coppin',
        'veteran_skarn',
        'broker_varga',
        'curio_ninebrass',
        // Pinewatch: a Crown charter town at the far end of the
        // Timber Road. The reeve holds the Wardline, the watch is the
        // whole town by rota, and Ospren buys here for the Timberway.
        // The Hoargate: the Crown's cold post across the north pass.
        'serjeant_ottar',
        'hoargate_watch',
        'reeve_halla',
        'pinewatch_watch',
        'pinewatch_sawyer',
        'buyer_ospren',
        'sawmistress_groa',
        'sparmaster_yannick',
        'smith_vigga',
        'innkeep_sunniva',
        'pitchmaster_rullo',
        'storekeep_nial',
        'tallyman_bram',
        'boomsman_kettil',
        'nurseryman_odd',
        'old_torvi',
        'fisher_ylva',
      ],
      enforcers: ['castle_guard', 'silverfall_watch', 'pinewatch_watch', 'hoargate_watch'],
      npcPrefixes: [],
      anchors: [
        { x: -448, y: -280 },
        { x: 1160, y: -356 },
      ],
      refusals: [
        'The crown remembers. Move along.',
        'No business with you while the guard is watching.',
      ],
      fineActor: 'warden_maren',
    },
    {
      id: 'waykeepers',
      name: 'The Waykeepers',
      sigil: 'lamp',
      blurb: 'The lamp stays lit: wardens of the roads, the waystations, and the shrine flame.',
      members: [
        'marshal_kestrel',
        'waykeeper_hale',
        'waykeeper_liv',
        'lampwright_soren',
        'waykeeper_odessa',
        'waykeeper_brant',
        'wayward_watch',
        'lampkeeper_edda',
        // The Timber Road is theirs too, and Sigrun holds its far end.
        'warden_sigrun',
        'shrinekeeper_sella',
        // The hamlets stand under the wardens' lamps
        'crofter_maida',
        'crofter_beck',
        'crofter_holt',
        'crofter_tam',
        // Saltmere — the Waykeepers' port at the water's end: the
        // Salt Road is their road, so the town at the end of it flies
        // their lamp (no Charter, no Crown; the road's own people).
        'portreeve_brack',
        'factor_neave',
        'innkeep_dorrit',
        'chandler_swale',
        'salter_ondra',
        'smokemistress_alba',
        'angler_voss',
        'boatwright_seff',
        'roper_jessa',
        'lightkeeper_lund',
        'pilot_fane',
        'saltmere_watch',
        'saltmere_fisher',
        // Hartfell — the moot keeps no soldiers; it pays the lamp.
        // The town itself is NOBODY'S (the whole point of the moot),
        // but the road's end post and the Fellwatch fly the lamp, so
        // the peace at the last gate is the Waykeepers' peace.
        'waykeeper_signe',
        'hartfell_watch',
      ],
      enforcers: [
        'marshal_kestrel',
        'waykeeper_hale',
        'waykeeper_liv',
        'lampwright_soren',
        'waykeeper_odessa',
        'waykeeper_brant',
        'wayward_watch',
        'saltmere_watch',
        'hartfell_watch',
      ],
      npcPrefixes: [],
      anchors: [],
      refusals: [
        "The road doesn't serve your kind. Walk wide.",
        'Lamps stay lit against men like you.',
      ],
      fineActor: 'marshal_kestrel',
    },
    {
      id: 'rookery',
      name: 'The Rookery',
      sigil: 'feather',
      blurb: "Quiet hands under the bank's shadow. No blood on the road — Mab's one rule.",
      members: ['magpie_mab', 'fence_calder', 'lookout_pike'],
      enforcers: [],
      npcPrefixes: [],
      anchors: [],
      refusals: ["Wrong door. There's no door.", "Mab says no. That's the whole of it."],
      fineActor: 'magpie_mab',
    },
    {
      id: 'evencourt',
      name: 'The Even Court',
      sigil: 'crescent',
      blurb: 'The old folk of Evenfall — the wood is the wall, and the court keeps the wood.',
      members: [
        'king_aldaren',
        'warden_sylwen',
        'keeper_ilvane',
        'loresinger_maelis',
        'bowyer_aewyn',
        'weaver_myrren',
        'glasswright_selorne',
        'smith_faelar',
        'inscriber_vessa',
        'innkeep_elarin',
        'provisioner_corwen',
        'sentinel_serel',
        'stillkeeper_naia',
        'keeper_othiel',
        'fair_artisan',
        'evenguard_watch',
        'sentinel_veran',
        'sentinel_lisse',
        'sentinel_thal',
      ],
      enforcers: ['evenguard_watch'],
      npcPrefixes: [],
      anchors: [{ x: -1032, y: -358 }],
      refusals: [
        'The wood saw that. So did I.',
        'You were welcomed. Act like it.',
      ],
      fineActor: 'sentinel_serel',
    },
    {
      id: 'reavers',
      name: 'The Red Company',
      sigil: 'mask',
      blurb: 'The Redmask line — camps in the wild, tolls on the road, steel for hire.',
      // The Tollhouse crew (Phase 4) and the Low Hall's household
      // (the Red Company epic): the sanctuary hunts its own outlaws.
      members: [
        'company_broker',
        'company_toll_guard',
        'captain_ravna',
        'tallyman_brusk',
        'quartermaster_yeva',
        'company_blade',
        'company_runner',
      
        'broker_slate', // the sixth counter (fence-by-construction)
      ],
      enforcers: ['company_blade'],
      npcPrefixes: ['brigand'],
      anchors: [],
      refusals: ["You've spilled Company blood. Run.", 'Steel first. Talk never.'],
      // The blood-price: Ferrick will sell an enemy back their name.
      fineActor: 'company_broker',
    },
  ],
  /**
   * The band thresholds. Hunted/outlaw/suspect read value <= t;
   * known/trusted/champion read value >= t; between is neutral.
   */
  bands: { hunted: -60, outlaw: -30, suspect: -10, known: 15, trusted: 40, champion: 75 },
  /**
   * THE DEED VALUES — the whole systemic vocabulary. The LADDER
   * CONTRACT test pins the arithmetic (4 assaults = outlaw; a fine
   * always lands at the suspect floor); move these deliberately.
   */
  deeds: {
    bountyHonored: 5,
    tollBroken: 8,
    assaultEnforcer: -8,
    slayMember: -30,
    theftWitnessed: -6,
    questCap: 25,
    storyCap: 15,
  },
  /**
   * THE TWO POLES — unordered 'a|b' pairs (ids sorted). Absent pair =
   * no opposition. crown|rookery is deliberately absent: the
   * Arrangement holds, on paper.
   */
  oppose: {
    'crown|reavers': 0.5,
    'fordgate|reavers': 0.5,
    'reavers|waykeepers': 0.6,
    'fordgate|rookery': 0.25,
    'reavers|rookery': 0.25,
    // The fellers' camps on the Everwood hem: the Company probes,
    // the wood dismantles, everyone is very polite about it.
    'evencourt|reavers': 0.5,
  },
  /** Band price multipliers (Phase 3); outlaw and below are refused. */
  prices: { champion: 0.88, trusted: 0.94, known: 0.97, neutral: 1, suspect: 1.12 },
  /** Beyond every town's marches, the road's deeds pay its wardens. */
  roadFaction: 'waykeepers',
  /** Enforcer engage circle vs outlaws, tiles (Phase 2). */
  enforcerAggro: 9,
  /** A hostile faction's bodies hold their fire at this band (Phase 2). */
  peaceBand: 'trusted',
  /** Coins per point of deficit below the fine floor (Phase 3). */
  finePerPoint: 6,
  /** A paid fine restores standing to exactly this — inside suspect. */
  fineFloor: -10,
  /** Ships at 0 — time never launders a name. Studio may disagree. */
  driftPerDay: 0,
  /**
   * THE LIGHT FINGERS (Phase 5). The LADDER CONTRACT pins the deed:
   * five witnessed thefts = outlaw. Unseen is unswayed — the roll can
   * fail in an empty lane and cost nothing but the mark's wariness.
   */
  theft: {
    base: 0.35,
    perLevel: 0.012,
    coinCap: 25,
    retrySec: 120,
    witnessRadius: 10,
    lockLevel: 20,
    suspectEye: 1.5,
    stolenSellMult: 1,
    fences: ['rookery', 'reavers'],
  },
};

/** Standing is clamped here forever — the meter has ends. */
export const STANDING_CLAMP = 100;

/** Worst to best — the one ordering every comparison reads. */
export const FACTION_BAND_ORDER: readonly FactionBand[] = [
  'hunted',
  'outlaw',
  'suspect',
  'neutral',
  'known',
  'trusted',
  'champion',
];

/** The band a raw standing value wears (the band law's one home). */
export function standingBand(
  value: number,
  bands: FactionBandsDef = FACTIONS.bands,
): FactionBand {
  if (value <= bands.hunted) return 'hunted';
  if (value <= bands.outlaw) return 'outlaw';
  if (value <= bands.suspect) return 'suspect';
  if (value >= bands.champion) return 'champion';
  if (value >= bands.trusted) return 'trusted';
  if (value >= bands.known) return 'known';
  return 'neutral';
}

/** True when band `a` sits at or above band `b` on the ladder. */
export function bandAtLeast(a: FactionBand, b: FactionBand): boolean {
  return FACTION_BAND_ORDER.indexOf(a) >= FACTION_BAND_ORDER.indexOf(b);
}

/**
 * THE PRICE OF A NAME (Phase 3): the buy-price multiplier a band earns
 * at a faction shop. Outlaw and below never reach a counter (the
 * closed throat + the shopOp refusal) — trading bands only. ONE
 * implementation, imported by server AND client, so a price tag can
 * never disagree with the coins actually taken.
 */
export function standingPriceMult(band: FactionBand, doc: FactionsDef = FACTIONS): number {
  switch (band) {
    case 'champion':
      return doc.prices.champion;
    case 'trusted':
      return doc.prices.trusted;
    case 'known':
      return doc.prices.known;
    case 'suspect':
      return doc.prices.suspect;
    default:
      return doc.prices.neutral;
  }
}

/**
 * THE MIRROR LAW: the shop's warmth cuts both ways — a keeper who
 * discounts your purchases also pays better for your goods. The sell
 * multiplier is the buy multiplier reflected around parity.
 */
export function standingSellMult(band: FactionBand, doc: FactionsDef = FACTIONS): number {
  return 2 - standingPriceMult(band, doc);
}

/** Answer a parsed `faction:` flag against a raw standing value. */
export function answerFactionFlag(value: number, parsed: ParsedFactionFlag): boolean {
  const band = standingBand(value);
  if (parsed.cmp === 'exact') return band === parsed.band;
  if (parsed.cmp === 'atleast') return bandAtLeast(band, parsed.band);
  return bandAtLeast(parsed.band, band);
}

/**
 * THE LIGHT FINGERS roll (Phase 5): the chance a lift goes unnoticed,
 * clamped so no hand is ever sure and no mark is ever hopeless. Pure
 * and doc-owned — the player can narrate the arithmetic back.
 */
export function theftChance(
  sneakLevel: number,
  markLevel: number,
  doc: FactionsDef = FACTIONS,
): number {
  const raw = doc.theft.base + (sneakLevel - markLevel) * doc.theft.perLevel;
  return Math.min(0.95, Math.max(0.05, raw));
}

/** Whether a faction's counters take stolen goods (Phase 5). */
export function isFenceFaction(factionId: string | null, doc: FactionsDef = FACTIONS): boolean {
  return factionId !== null && doc.theft.fences.includes(factionId);
}

/**
 * THE BORDER LAW cross-deltas: a systemic deed's delta with `factionId`
 * pays every opposed faction -delta*w — but only while the player still
 * stood ABOVE the outlaw line with the primary at deed time. Grinding
 * an enemy you already made can never farm a friend. Authored deltas
 * (quests, story hooks) never call this — authors state both sides.
 */
export function crossDeltas(
  factionId: string,
  delta: number,
  primaryValueBefore: number,
  doc: FactionsDef = FACTIONS,
): { faction: string; delta: number }[] {
  if (delta === 0) return [];
  if (primaryValueBefore <= doc.bands.outlaw) return [];
  const out: { faction: string; delta: number }[] = [];
  for (const other of doc.roster) {
    if (other.id === factionId) continue;
    const key = [factionId, other.id].sort().join('|');
    const w = doc.oppose[key];
    if (!w) continue;
    const cross = Math.round(-delta * w);
    if (cross !== 0) out.push({ faction: other.id, delta: cross });
  }
  return out;
}

// --------------------------------------------- membership indexes

let actorIndex = new Map<string, string>();
let prefixIndex: { prefix: string; faction: string }[] = [];

function rebuildIndexes(): void {
  actorIndex = new Map();
  prefixIndex = [];
  for (const f of FACTIONS.roster) {
    for (const slug of f.members) actorIndex.set(slug, f.id);
    for (const prefix of f.npcPrefixes) prefixIndex.push({ prefix, faction: f.id });
  }
}
rebuildIndexes();

/** The faction an actor slug reads, or null for the unaffiliated. */
export function factionOfActor(slug: string): string | null {
  return actorIndex.get(slug) ?? null;
}

/** The faction a bestiary def id reads (prefix match), or null. */
export function factionOfNpc(defId: string): string | null {
  for (const e of prefixIndex) {
    if (defId.startsWith(e.prefix)) return e.faction;
  }
  return null;
}

/** Faction ids in roster order — the closed roster's one listing. */
export function factionIds(): string[] {
  return FACTIONS.roster.map((f) => f.id);
}

/** Look up a roster entry by id (live — reads the current doc). */
export function factionDef(id: string): FactionDef | undefined {
  return FACTIONS.roster.find((f) => f.id === id);
}

// ------------------------------------------------- the Studio's half

function deepCopyDoc(doc: FactionsDef): FactionsDef {
  return {
    roster: doc.roster.map((f) => ({
      ...f,
      members: [...f.members],
      enforcers: [...f.enforcers],
      npcPrefixes: [...f.npcPrefixes],
      anchors: f.anchors.map((a) => ({ ...a })),
      refusals: [...f.refusals],
    })),
    bands: { ...doc.bands },
    deeds: { ...doc.deeds },
    oppose: { ...doc.oppose },
    prices: { ...doc.prices },
    roadFaction: doc.roadFaction,
    enforcerAggro: doc.enforcerAggro,
    peaceBand: doc.peaceBand,
    finePerPoint: doc.finePerPoint,
    fineFloor: doc.fineFloor,
    driftPerDay: doc.driftPerDay,
    theft: { ...doc.theft, fences: [...doc.theft.fences] },
  };
}

/** The authored doc exactly as shipped — the CMS revert target. */
export const AUTHORED_FACTIONS: Readonly<FactionsDef> = Object.freeze(deepCopyDoc(FACTIONS));

export type ValidateFactionsResult =
  | { ok: true; def: FactionsDef }
  | { ok: false; errors: string[] };

/** Cross-ref surface, tooling-injectable like ValidateQuestRefs. */
export interface ValidateFactionsRefs {
  actorIds?: ReadonlySet<string>;
}

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
const BAND_SET = new Set<string>(FACTION_BAND_ORDER);

/**
 * THE ONE VALIDATOR for the roster and its dials: runs on the authored
 * seed at module load, on DB rows at boot, and on every Studio save.
 * A doc that could orphan a member, invert the band ladder, or spell
 * an unknown dial never reaches the live registry.
 */
export function validateFactions(
  raw: unknown,
  refs?: ValidateFactionsRefs,
): ValidateFactionsResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['factions doc must be an object'] };
  }
  const doc = raw as Record<string, unknown>;
  const knownActor = (id: string): boolean =>
    refs?.actorIds ? refs.actorIds.has(id) : NPC_ACTORS.has(id);

  // --- roster
  const roster: FactionDef[] = [];
  const ids = new Set<string>();
  const claimed = new Map<string, string>();
  if (!Array.isArray(doc.roster) || doc.roster.length < 1 || doc.roster.length > 12) {
    errors.push('roster must be an array of 1..12 factions');
  } else {
    for (const [i, rawF] of doc.roster.entries()) {
      const where = `roster[${i}]`;
      if (typeof rawF !== 'object' || rawF === null || Array.isArray(rawF)) {
        errors.push(`${where} must be an object`);
        continue;
      }
      const f = rawF as Record<string, unknown>;
      const strList = (key: string, max: number, check?: (s: string) => string | null): string[] => {
        const v = f[key];
        if (v === undefined) return [];
        if (!Array.isArray(v) || v.length > max) {
          errors.push(`${where}.${key} must be an array of at most ${max} entries`);
          return [];
        }
        const out: string[] = [];
        for (const s of v) {
          if (typeof s !== 'string' || s.length === 0 || s.length > 120) {
            errors.push(`${where}.${key} entry must be a non-empty string`);
            continue;
          }
          const err = check?.(s) ?? null;
          if (err !== null) {
            errors.push(`${where}.${key} '${s}' ${err}`);
            continue;
          }
          out.push(s);
        }
        return out;
      };
      const id = typeof f.id === 'string' && SLUG_RE.test(f.id) && f.id.length <= 32 ? f.id : null;
      if (id === null) {
        errors.push(`${where}.id must match ^[a-z][a-z0-9_]*$`);
        continue;
      }
      if (ids.has(id)) {
        errors.push(`${where}.id '${id}' is not unique`);
        continue;
      }
      ids.add(id);
      if (typeof f.name !== 'string' || f.name.length === 0 || f.name.length > 48) {
        errors.push(`${where}.name must be a string of 1..48 chars`);
      }
      if (typeof f.sigil !== 'string' || !SLUG_RE.test(f.sigil)) {
        errors.push(`${where}.sigil must be a slug`);
      }
      if (typeof f.blurb !== 'string' || f.blurb.length === 0 || f.blurb.length > 160) {
        errors.push(`${where}.blurb must be a string of 1..160 chars`);
      }
      const members = strList('members', 64, (s) =>
        !SLUG_RE.test(s) ? 'must be a slug' : !knownActor(s) ? 'is not a known actor' : null,
      );
      for (const m of members) {
        const prev = claimed.get(m);
        // ONE NAME, ONE LEDGER: an actor reads a single faction.
        if (prev !== undefined) errors.push(`actor '${m}' belongs to both '${prev}' and '${id}'`);
        else claimed.set(m, id);
      }
      const enforcers = strList('enforcers', 32, (s) => (!SLUG_RE.test(s) ? 'must be a slug' : null));
      for (const e of enforcers) {
        if (!members.includes(e)) errors.push(`${where}.enforcers '${e}' is not a member`);
      }
      const npcPrefixes = strList('npcPrefixes', 8, (s) => (!SLUG_RE.test(s) ? 'must be a slug' : null));
      const refusals = strList('refusals', 6);
      const anchors: { x: number; y: number }[] = [];
      if (f.anchors !== undefined) {
        if (!Array.isArray(f.anchors) || f.anchors.length > 8) {
          errors.push(`${where}.anchors must be an array of at most 8 points`);
        } else {
          for (const a of f.anchors) {
            const p = a as Record<string, unknown>;
            if (
              typeof p !== 'object' ||
              p === null ||
              typeof p.x !== 'number' ||
              typeof p.y !== 'number' ||
              !Number.isFinite(p.x) ||
              !Number.isFinite(p.y)
            ) {
              errors.push(`${where}.anchors entries must be {x, y} numbers`);
              continue;
            }
            anchors.push({ x: p.x, y: p.y });
          }
        }
      }
      let fineActor: string | undefined;
      if (f.fineActor !== undefined) {
        if (typeof f.fineActor !== 'string' || !members.includes(f.fineActor)) {
          errors.push(`${where}.fineActor must be one of the faction's members`);
        } else fineActor = f.fineActor;
      }
      if (members.length === 0 && npcPrefixes.length === 0) {
        errors.push(`${where} has neither members nor npcPrefixes — a faction needs bodies`);
      }
      const knownKeys = new Set([
        'id',
        'name',
        'sigil',
        'blurb',
        'members',
        'enforcers',
        'npcPrefixes',
        'anchors',
        'refusals',
        'fineActor',
      ]);
      for (const key of Object.keys(f)) {
        if (!knownKeys.has(key)) errors.push(`${where} unknown field '${key}'`);
      }
      roster.push({
        id,
        name: String(f.name ?? ''),
        sigil: String(f.sigil ?? ''),
        blurb: String(f.blurb ?? ''),
        members,
        enforcers,
        npcPrefixes,
        anchors,
        refusals,
        ...(fineActor !== undefined ? { fineActor } : {}),
      });
    }
  }

  // --- dials
  const num = (obj: Record<string, unknown>, key: string, lo: number, hi: number): number => {
    const v = obj[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`${key} must be a number`);
      return lo;
    }
    if (v < lo || v > hi) errors.push(`${key} must be in [${lo}, ${hi}]`);
    return v;
  };
  const bandsRaw =
    typeof doc.bands === 'object' && doc.bands !== null ? (doc.bands as Record<string, unknown>) : {};
  if (typeof doc.bands !== 'object' || doc.bands === null) errors.push('bands must be an object');
  const bands: FactionBandsDef = {
    hunted: num(bandsRaw, 'hunted', -STANDING_CLAMP, -1),
    outlaw: num(bandsRaw, 'outlaw', -STANDING_CLAMP, -1),
    suspect: num(bandsRaw, 'suspect', -STANDING_CLAMP, -1),
    known: num(bandsRaw, 'known', 1, STANDING_CLAMP),
    trusted: num(bandsRaw, 'trusted', 1, STANDING_CLAMP),
    champion: num(bandsRaw, 'champion', 1, STANDING_CLAMP),
  };
  if (!(bands.hunted < bands.outlaw && bands.outlaw < bands.suspect)) {
    errors.push('bands must order hunted < outlaw < suspect');
  }
  if (!(bands.known < bands.trusted && bands.trusted < bands.champion)) {
    errors.push('bands must order known < trusted < champion');
  }
  const deedsRaw =
    typeof doc.deeds === 'object' && doc.deeds !== null ? (doc.deeds as Record<string, unknown>) : {};
  if (typeof doc.deeds !== 'object' || doc.deeds === null) errors.push('deeds must be an object');
  const deeds = {
    bountyHonored: num(deedsRaw, 'bountyHonored', 1, 50),
    tollBroken: num(deedsRaw, 'tollBroken', 1, 50),
    assaultEnforcer: num(deedsRaw, 'assaultEnforcer', -50, -1),
    slayMember: num(deedsRaw, 'slayMember', -100, -1),
    theftWitnessed: num(deedsRaw, 'theftWitnessed', -50, -1),
    questCap: num(deedsRaw, 'questCap', 1, 50),
    storyCap: num(deedsRaw, 'storyCap', 1, 50),
  };
  for (const extra of Object.keys(bandsRaw).filter((k) => !(k in bands))) {
    errors.push(`bands unknown field '${extra}'`);
  }
  for (const extra of Object.keys(deedsRaw).filter((k) => !(k in deeds))) {
    errors.push(`deeds unknown field '${extra}'`);
  }
  const oppose: Record<string, number> = {};
  if (doc.oppose !== undefined) {
    if (typeof doc.oppose !== 'object' || doc.oppose === null || Array.isArray(doc.oppose)) {
      errors.push('oppose must be an object of pair keys');
    } else {
      for (const [key, w] of Object.entries(doc.oppose as Record<string, unknown>)) {
        const parts = key.split('|');
        if (parts.length !== 2 || parts[0] === parts[1] || [...parts].sort().join('|') !== key) {
          errors.push(`oppose key '${key}' must be 'a|b' with distinct sorted ids`);
          continue;
        }
        if (!ids.has(parts[0]!) || !ids.has(parts[1]!)) {
          errors.push(`oppose key '${key}' names a faction not in the roster`);
          continue;
        }
        if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0 || w > 1) {
          errors.push(`oppose['${key}'] must be a weight in (0, 1]`);
          continue;
        }
        oppose[key] = w;
      }
    }
  }
  const pricesRaw =
    typeof doc.prices === 'object' && doc.prices !== null
      ? (doc.prices as Record<string, unknown>)
      : {};
  if (typeof doc.prices !== 'object' || doc.prices === null) errors.push('prices must be an object');
  const prices = {
    champion: num(pricesRaw, 'champion', 0.5, 2),
    trusted: num(pricesRaw, 'trusted', 0.5, 2),
    known: num(pricesRaw, 'known', 0.5, 2),
    neutral: num(pricesRaw, 'neutral', 0.5, 2),
    suspect: num(pricesRaw, 'suspect', 0.5, 2),
  };
  for (const extra of Object.keys(pricesRaw).filter((k) => !(k in prices))) {
    errors.push(`prices unknown field '${extra}'`);
  }
  const theftRaw =
    typeof doc.theft === 'object' && doc.theft !== null ? (doc.theft as Record<string, unknown>) : {};
  if (typeof doc.theft !== 'object' || doc.theft === null) errors.push('theft must be an object');
  const fences: string[] = [];
  if (theftRaw.fences !== undefined) {
    if (!Array.isArray(theftRaw.fences)) {
      errors.push('theft.fences must be an array of roster ids');
    } else {
      for (const s of theftRaw.fences) {
        if (typeof s !== 'string' || !ids.has(s)) {
          errors.push(`theft.fences names '${String(s)}' which is not in the roster`);
          continue;
        }
        fences.push(s);
      }
    }
  }
  const theft: FactionTheftDef = {
    base: num(theftRaw, 'base', 0.01, 0.95),
    perLevel: num(theftRaw, 'perLevel', 0, 0.05),
    coinCap: num(theftRaw, 'coinCap', 1, 500),
    retrySec: num(theftRaw, 'retrySec', 5, 3600),
    witnessRadius: num(theftRaw, 'witnessRadius', 2, 32),
    lockLevel: num(theftRaw, 'lockLevel', 1, 99),
    suspectEye: num(theftRaw, 'suspectEye', 1, 4),
    stolenSellMult: num(theftRaw, 'stolenSellMult', 0.1, 2),
    fences,
  };
  for (const extra of Object.keys(theftRaw).filter((k) => !(k in theft))) {
    errors.push(`theft unknown field '${extra}'`);
  }
  const peaceBand = doc.peaceBand;
  if (typeof peaceBand !== 'string' || !BAND_SET.has(peaceBand)) {
    errors.push('peaceBand must be a band name');
  } else if (!bandAtLeast(peaceBand as FactionBand, 'known')) {
    errors.push('peaceBand must sit at known or above (peace is earned, never default)');
  }
  if (typeof doc.roadFaction !== 'string' || !ids.has(doc.roadFaction)) {
    errors.push('roadFaction must name a roster faction (the road belongs to somebody)');
  }
  const def: FactionsDef = {
    roster,
    bands,
    deeds,
    oppose,
    prices,
    roadFaction: String(doc.roadFaction ?? ''),
    enforcerAggro: num(doc, 'enforcerAggro', 2, 32),
    peaceBand: (typeof peaceBand === 'string' && BAND_SET.has(peaceBand)
      ? peaceBand
      : 'trusted') as FactionBand,
    finePerPoint: num(doc, 'finePerPoint', 1, 100),
    fineFloor: num(doc, 'fineFloor', -STANDING_CLAMP, 0),
    driftPerDay: num(doc, 'driftPerDay', 0, 10),
    theft,
  };
  // Unknown top-level keys are refused loudly.
  const known = new Set([
    'roster',
    'bands',
    'deeds',
    'oppose',
    'prices',
    'roadFaction',
    'enforcerAggro',
    'peaceBand',
    'finePerPoint',
    'fineFloor',
    'driftPerDay',
    'theft',
  ]);
  for (const key of Object.keys(doc)) {
    if (!known.has(key)) errors.push(`unknown dial '${key}'`);
  }
  // The cross-laws, named:
  if (!(def.fineFloor > bands.outlaw && def.fineFloor <= bands.suspect)) {
    errors.push(
      'fineFloor must land inside the suspect band (a fine buys back the courtroom, not the hearts)',
    );
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def };
}

/**
 * THE CMS HOOK: swap the live doc in place — object identity stable,
 * membership indexes rebuilt, so every consumer that reads FACTIONS.x
 * or factionOfActor() at call time sees the edit on the next beat.
 * Only ever runs against a validated doc.
 */
export function replaceFactions(next: FactionsDef): void {
  Object.assign(FACTIONS, deepCopyDoc(next));
  rebuildIndexes();
}

// The shipped seed must satisfy its own law — loudly, at build time.
{
  const res = validateFactions(AUTHORED_FACTIONS);
  if (!res.ok) throw new Error(`shipped FACTIONS doc invalid:\n  ${res.errors.join('\n  ')}`);
}
