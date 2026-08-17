/**
 * THE LAWS OF THE HALL (callings-v2-plan.md, THE FILLED HALL) — every
 * rule a ladder must satisfy, written ONCE as pure functions over the
 * defs. Two readers, one truth: the suites (callings.test.ts,
 * callingLedger.test.ts) walk the live roster through `ladderFaults`
 * and assert silence; the authoring CLI (scripts/callingAudit.ts)
 * walks a single ladder while it is being written, so an author sees
 * the same verdict the gate will speak. Never duplicate a rule in a
 * test — add it here and both readers inherit it.
 *
 * The rules, by family:
 *  - THE SIXTEEN RUNGS: a ladder is exactly CALLING_SEATS (5..80 by
 *    fives), one seat each, priced by THE SEAT BANDS.
 *  - THE NO-LOSS LAW: the founding rows keep id + skill + seat.
 *  - IDENTITY: unique ids and names across the whole hall, chip-length
 *    names, one-line descs, hex colors, no item-id shadow, the dash ban.
 *  - RANK IS DEPTH: three authored steps, each a change, ≤2.5× on any
 *    shared dial, notes ≤90.
 *  - ONE GRAMMAR: no strike kinds, trade dials self-keyed, fold laws
 *    declared, when-grants that grant something, arts from the pool.
 *  - THE FELT FLOORS and THE PROC BUDGET (the ledger's arithmetic).
 *  - THE REGISTER: every page touched is licensed by a row, every row
 *    touches a page, every page is written in the book.
 */
import {
  CALLING_SEATS,
  STATUS_BOOK,
  focusCostForSeat,
  type SkillId,
  type StatusId,
} from '@arx/shared';
import { ITEMS } from './items.js';
import { techniquePoolDef } from './secretArts.js';
import { abilityDef } from './abilities.js';
import { procMismatch, type ProcEffect } from './equipment/enchants.js';
import {
  CALLING_MAX_RANK,
  PERK_FOLD,
  honedCalling,
  isAggregateCallingEffect,
  type CallingDef,
  type CallingEffect,
  type CallingLicense,
} from './callings.js';

// ------------------------------------------------------------ constants

/** Minimum magnitude per gear channel for a dial-only package to be FELT. */
export const FELT: Readonly<Record<string, number>> = {
  armor: 4,
  styleDmg: 6, // pct
  elementDmg: 6, // pct
  speed: 5, // pct
  crit: 2, // pct (a whetstone's worth — the shipped floor)
  regen: 1, // per 4s
  cooldown: 5, // pct
  maxHp: 6,
  skill: 3,
  thorns: 3,
  swingSpeed: 5, // pct
  vsState: 6, // pct
  onKillHaste: 10, // ticks
};

/** Kinds that are a VERB in themselves — felt by construction. */
export const VERB_KINDS: ReadonlySet<string> = new Set([
  'proc',
  'when',
  'art',
  'doubleGather',
  'materialSave',
  'craftSpeed',
  'gatherSpeed',
  'perPiece',
  'perk',
]);

export const PROC_DAMAGE_REST_MIN = 160; // 8s
export const CADENCE_MIN = 4;
export const STACKS_MIN = 4;
export const STACKS_MAX = 8;
export const RANK_DEPTH_MAX = 2.5;
export const NAME_MAX = 24;
export const LINE_MAX = 90;
export const OUTNUMBERED_MIN = 2;
export const OUTNUMBERED_MAX = 6;
/**
 * THE SWING BUDGET: the hall-wide assembly (page × shelf × art × gear
 * × when) must land under SWING_MULT_MAX, and the page/shelf/art
 * product already stands near 1.34 — so callings never author the
 * gear swingSpeed channel (it SUMS across the whole hall in the worst
 * case) and a when-grant's attackSpeedMult stays at or under this
 * ceiling (max, not sum). Haste MOMENTS ride surge:swing procs and
 * the quicken boon, both band-clamped at the one pay site.
 */
export const WHEN_SWING_MAX = 1.08;

/**
 * THE NO-LOSS LAW's roll: the founding rows (the fifty-three the
 * platform epic froze) keep id, skill, and seat forever — a character
 * row names them by id and prices them by seat. Their PACKAGES are
 * the content epoch's to deepen.
 */
export const FOUNDING_SEATS: ReadonlyMap<string, readonly [SkillId, number]> = new Map<
  string,
  readonly [SkillId, number]
>([
  ['hearty_meals', ['vitality', 20]],
  ['ironblood', ['vitality', 60]],
  ['war_footing', ['combat', 20]],
  ['old_campaigner', ['combat', 60]],
  ['follow_through', ['onehand', 20]],
  ['warpath', ['onehand', 60]],
  ['bulwark', ['defence', 20]],
  ['stonewall', ['defence', 60]],
  ['fletchers_eye', ['archery', 20]],
  ['longstride', ['archery', 60]],
  ['kindled_mind', ['arx', 20]],
  ['attuned', ['arx', 60]],
  ['soft_step', ['sneak', 20]],
  ['opportunist', ['sneak', 60]],
  ['farcleaver', ['twohand', 20]],
  ['executioner', ['twohand', 60]],
  ['longarm', ['polearm', 20]],
  ['impaler', ['polearm', 60]],
  ['ambidexter', ['dualwield', 20]],
  ['twin_tempo', ['dualwield', 60]],
  ['shieldarm', ['shield', 20]],
  ['ironback', ['shield', 60]],
  ['prospector', ['mining', 20]],
  ['deep_lungs', ['mining', 60]],
  ['timber_sense', ['woodcutting', 20]],
  ['heartwood_eye', ['woodcutting', 60]],
  ['patient_line', ['fishing', 20]],
  ['night_angler', ['fishing', 60]],
  ['gleaner', ['foraging', 20]],
  ['verdant_eye', ['foraging', 60]],
  ['the_composter', ['farming', 35]],
  ['marketeer', ['farming', 45]],
  ['green_thumb', ['farming', 20]],
  ['bounty', ['farming', 60]],
  ['shepherds_eye', ['beastcraft', 35]],
  ['seasoned_palate', ['cooking', 20]],
  ['field_kitchen', ['cooking', 60]],
  ['sparing_hammer', ['smithing', 20]],
  ['forgeheat', ['smithing', 60]],
  ['clean_grain', ['woodworking', 20]],
  ['master_grain', ['woodworking', 60]],
  ['whetstone_habit', ['leatherworking', 20]],
  ['supple_fit', ['leatherworking', 60]],
  ['fine_seams', ['tailoring', 20]],
  ['quilted_lining', ['tailoring', 60]],
  ['salvager', ['construction', 20]],
  ['homesteader', ['construction', 60]],
  ['bitter_blood', ['herbalism', 20]],
  ['long_brew', ['herbalism', 60]],
  ['dust_thrift', ['enchanting', 20]],
  ['deep_sigils', ['enchanting', 60]],
  ['gentle_hand', ['beastcraft', 20]],
  ['drovers_bond', ['beastcraft', 60]],
]);

// ------------------------------------------------------------ helpers

export function gearMagnitude(fx: Extract<CallingEffect, { kind: 'gear' }>): [string, number] | null {
  const e = fx.effect;
  switch (e.kind) {
    case 'armor':
    case 'regen':
    case 'maxHp':
    case 'skill':
    case 'thorns':
      return [e.kind, e.amount];
    case 'styleDmg':
    case 'elementDmg':
    case 'speed':
    case 'crit':
    case 'cooldown':
    case 'swingSpeed':
    case 'vsState':
      return [e.kind, e.pct];
    case 'onKillHaste':
      return [e.kind, e.ticks];
    default:
      return null;
  }
}

/** The dial a package entry moves and by how much, for the depth law. */
export function dialOf(fx: CallingEffect): [string, number] | null {
  if (fx.kind === 'gear') return gearMagnitude(fx);
  if (fx.kind === 'perk') return [`perk:${fx.perk}`, fx.magnitude];
  if (fx.kind === 'doubleGather' || fx.kind === 'materialSave') return [`${fx.kind}:${fx.skill}`, fx.chance];
  if (fx.kind === 'gatherSpeed' || fx.kind === 'craftSpeed') return [`${fx.kind}:${fx.skill}`, fx.mult];
  return null;
}

/** [rank, package] for I..IV. */
export function everyPackage(def: CallingDef): Array<[number, readonly CallingEffect[]]> {
  const out: Array<[number, readonly CallingEffect[]]> = [];
  for (let r = 1; r <= CALLING_MAX_RANK; r++) out.push([r, honedCalling(def, r)]);
  return out;
}

export function procsOf(pkg: readonly CallingEffect[]): ProcEffect[] {
  return pkg.flatMap((fx) => (fx.kind === 'proc' ? [fx.proc] : []));
}

/**
 * Every (page, verb) a package touches — the register's rows in the
 * making. Lays: proc status / boon. Reads: stateApplied, hitState,
 * a when-clause riding page, and THE READING EDGE's vsState.
 */
export function pageTouches(pkg: readonly CallingEffect[]): Array<[StatusId, CallingLicense['via']]> {
  const rows: Array<[StatusId, CallingLicense['via']]> = [];
  for (const fx of pkg) {
    if (fx.kind === 'proc') {
      const t = fx.proc.trigger;
      const a = fx.proc.action;
      if (t.on === 'stateApplied') rows.push([t.status, 'read:stateApplied']);
      if (t.on === 'hitState') rows.push([t.status, 'read:hitState']);
      if (a.do === 'status') rows.push([a.status, 'lay:status']);
      if (a.do === 'boon') rows.push([a.status, 'lay:boon']);
    }
    if (fx.kind === 'when' && fx.cond.when === 'stateRiding') rows.push([fx.cond.status, 'read:stateRiding']);
    if (fx.kind === 'gear' && fx.effect.kind === 'vsState') rows.push([fx.effect.status, 'read:vsState']);
  }
  return rows;
}

const DASH = /[—–−]|--/;
const HEX = /^#[0-9a-f]{6}$/i;

// ------------------------------------------------------------- the laws

/** Faults in ONE calling, at every rank. Empty = lawful. */
export function callingFaults(def: CallingDef): string[] {
  const f: string[] = [];
  const id = def.id;
  // Identity.
  if (!/^[a-z][a-z0-9_]*$/.test(id)) f.push(`${id}: id must be snake_case`);
  if (def.name.length === 0 || def.name.length > NAME_MAX) f.push(`${id}: name must fit a chip (1..${NAME_MAX})`);
  if (def.desc.length === 0 || def.desc.length > LINE_MAX) f.push(`${id}: desc must be one honest line (1..${LINE_MAX})`);
  if (!HEX.test(def.color)) f.push(`${id}: color must be #rrggbb`);
  if (ITEMS.has(id)) f.push(`${id}: shadows an item id`);
  for (const [what, text] of [
    ['name', def.name],
    ['desc', def.desc],
  ] as const) {
    if (DASH.test(text)) f.push(`${id}: ${what} carries a banned dash`);
  }
  // Seat + price.
  if (!CALLING_SEATS.includes(def.unlockLevel)) f.push(`${id}: seat ${def.unlockLevel} is off THE SIXTEEN RUNGS`);
  if (def.focusCost !== focusCostForSeat(def.unlockLevel)) {
    f.push(`${id}: focusCost ${def.focusCost} disagrees with its seat band (${focusCostForSeat(def.unlockLevel)})`);
  }
  // The founding roll.
  const founding = FOUNDING_SEATS.get(id);
  if (founding && (founding[0] !== def.skill || founding[1] !== def.unlockLevel)) {
    f.push(`${id}: a founding row moved (was ${founding[0]} ${founding[1]}) — THE NO-LOSS LAW`);
  }
  // Ranks.
  if (!def.ranks) f.push(`${id}: no rank steps — every calling in the hall is honed I..IV`);
  else if (def.ranks.length !== 3) f.push(`${id}: ranks must be exactly three steps (II, III, IV)`);
  else {
    let prev = JSON.stringify(def.effects);
    def.ranks.forEach((step, i) => {
      const cur = JSON.stringify(step.effects);
      if (cur === prev) f.push(`${id}: rank ${i + 2} step changes nothing`);
      if (step.note.length === 0 || step.note.length > LINE_MAX) f.push(`${id}: rank ${i + 2} note must be 1..${LINE_MAX}`);
      if (DASH.test(step.note)) f.push(`${id}: rank ${i + 2} note carries a banned dash`);
      prev = cur;
    });
    const base = new Map<string, number>();
    for (const fx of def.effects) {
      const d = dialOf(fx);
      if (d) base.set(d[0], d[1]);
    }
    for (const fx of honedCalling(def, CALLING_MAX_RANK)) {
      const d = dialOf(fx);
      if (!d || !base.has(d[0])) continue;
      const b = base.get(d[0])!;
      const ratio = b < 1 && d[1] < 1 ? (1 - d[1]) / Math.max(1e-6, 1 - b) : d[1] / Math.max(1e-6, b);
      if (ratio > RANK_DEPTH_MAX) {
        f.push(`${id}: dial ${d[0]} climbs ${ratio.toFixed(2)}× I→IV (max ${RANK_DEPTH_MAX}) — a different calling`);
      }
    }
  }
  // Every package.
  for (const [rank, pkg] of everyPackage(def)) {
    const at = `${id} rank ${rank}`;
    if (pkg.length === 0) f.push(`${at}: an empty package`);
    let arts = 0;
    for (const fx of pkg) {
      if (!isAggregateCallingEffect(fx)) f.push(`${at}: folds a strike kind, forbidden`);
      if (fx.kind === 'gear' && fx.effect.kind === 'swingSpeed') f.push(`${at}: gear swingSpeed is closed to callings (THE SWING BUDGET) — use a surge:swing proc or the quicken boon`);
      if (
        (fx.kind === 'doubleGather' || fx.kind === 'gatherSpeed' || fx.kind === 'materialSave' || fx.kind === 'craftSpeed') &&
        fx.skill !== def.skill
      ) {
        f.push(`${at}: trade dial ${fx.kind} keyed to ${fx.skill}, not its own trade`);
      }
      if (fx.kind === 'perk' && !(fx.perk in PERK_FOLD)) f.push(`${at}: dial ${fx.perk} declares no fold law`);
      if (fx.kind === 'perPiece' && !fx.speedPct && !fx.maxHp && !fx.armor) f.push(`${at}: perPiece grants nothing`);
      if (fx.kind === 'when') {
        const g = fx.grant;
        const grants =
          (g.armor ?? 0) !== 0 ||
          (g.speedMult ?? 1) !== 1 ||
          (g.attackSpeedMult ?? 1) !== 1 ||
          (g.critPct ?? 0) !== 0 ||
          (g.dmgMult ?? 1) !== 1 ||
          (g.regenPer4s ?? 0) !== 0 ||
          (g.reflectFrac ?? 0) !== 0 ||
          (g.meleeLifesteal ?? 0) !== 0 ||
          (g.gatherSpeed ?? 1) !== 1;
        if (!grants) f.push(`${at}: when clause grants nothing`);
        if ((g.attackSpeedMult ?? 1) > WHEN_SWING_MAX) f.push(`${at}: when-grant swing ${g.attackSpeedMult} over THE SWING BUDGET (${WHEN_SWING_MAX})`);
        if (!g.name || g.name.length > NAME_MAX) f.push(`${at}: when grant needs a chip name (1..${NAME_MAX})`);
        if (DASH.test(g.name ?? '')) f.push(`${at}: when grant name carries a banned dash`);
        const c = fx.cond;
        if ((c.when === 'hpBelow' || c.when === 'hpAbove') && !(c.frac > 0 && c.frac < 1)) {
          f.push(`${at}: hp fraction must sit inside (0, 1)`);
        }
        if (c.when === 'outnumbered' && (c.count < OUTNUMBERED_MIN || c.count > OUTNUMBERED_MAX)) {
          f.push(`${at}: outnumbered count outside ${OUTNUMBERED_MIN}..${OUTNUMBERED_MAX}`);
        }
      }
      if (fx.kind === 'art') {
        arts++;
        if (!abilityDef(fx.ability)) f.push(`${at}: licenses an unwritten art '${fx.ability}'`);
        else if (!techniquePoolDef(fx.ability)) {
          f.push(`${at}: '${fx.ability}' is not in the technique pool — only rungs, pages, and secrets seat`);
        }
      }
    }
    if (arts > 1) f.push(`${at}: licenses ${arts} arts — one license per package`);
    // THE FELT FLOORS.
    const hasVerb = pkg.some((fx) => VERB_KINDS.has(fx.kind));
    const felt = pkg.some((fx) => {
      if (fx.kind !== 'gear') return false;
      const m = gearMagnitude(fx);
      return m !== null && m[1] >= (FELT[m[0]] ?? Infinity);
    });
    if (!hasVerb && !felt) f.push(`${at}: moves nothing a player can feel and carries no verb`);
    // THE PROC BUDGET.
    const procs = procsOf(pkg);
    if (procs.length > 1) f.push(`${at}: carries ${procs.length} procs — the moment stays a moment`);
    for (const p of procs) {
      const mm = procMismatch(p);
      if (mm) f.push(`${at}: proc mismatch — ${mm}`);
      const dealsDamage = p.action.do === 'bolt' || p.action.do === 'nova' || p.action.do === 'chain';
      if (dealsDamage && p.icd < PROC_DAMAGE_REST_MIN) f.push(`${at}: damage moment rests ${p.icd}t (< ${PROC_DAMAGE_REST_MIN})`);
      if (!(p.icd > 0)) f.push(`${at}: proc has no rest — a texture, not a moment`);
      if (p.trigger.on === 'cadence' && p.trigger.every < CADENCE_MIN) f.push(`${at}: cadence every ${p.trigger.every} is a texture`);
      if (p.trigger.on === 'stacks' && (p.trigger.count < STACKS_MIN || p.trigger.count > STACKS_MAX)) {
        f.push(`${at}: meter of ${p.trigger.count} is outside ${STACKS_MIN}..${STACKS_MAX}`);
      }
      if (!p.name || p.name.length > NAME_MAX) f.push(`${at}: proc needs a floating name (1..${NAME_MAX})`);
      if (DASH.test(p.name ?? '')) f.push(`${at}: proc name carries a banned dash`);
      // ONE METER PER CALLING: the working's id is the calling's own —
      // never a gear id it would silently share a meter with, never
      // another calling's.
      if (p.id !== `calling:${id}`) f.push(`${at}: proc id must be 'calling:${id}' (one meter per calling), got '${p.id}'`);
    }
    // The book.
    for (const [status] of pageTouches(pkg)) {
      if (!(status in STATUS_BOOK)) f.push(`${at}: names an unwritten page '${status}'`);
    }
  }
  return f;
}

/**
 * Faults in ONE ladder: the seat frame, the register column, and the
 * per-calling laws. `hall` (every def in the whole roster) lets the
 * ladder check its names and ids against the other twenty-four.
 */
export function ladderFaults(
  skill: SkillId,
  defs: readonly CallingDef[],
  licenses: readonly CallingLicense[],
  hall?: readonly CallingDef[],
): string[] {
  const f: string[] = [];
  const seats = defs.map((d) => d.unlockLevel).sort((a, b) => a - b);
  if (seats.length !== CALLING_SEATS.length || seats.some((s, i) => s !== CALLING_SEATS[i])) {
    const missing = CALLING_SEATS.filter((s) => !seats.includes(s));
    const extra = seats.filter((s) => !CALLING_SEATS.includes(s));
    const dup = seats.filter((s, i) => seats.indexOf(s) !== i);
    f.push(
      `${skill}: THE SIXTEEN RUNGS not met (${defs.length} seats` +
        (missing.length ? `; missing ${missing.join(',')}` : '') +
        (extra.length ? `; off-ladder ${extra.join(',')}` : '') +
        (dup.length ? `; doubled ${dup.join(',')}` : '') +
        ')',
    );
  }
  for (const d of defs) {
    if (d.skill !== skill) f.push(`${d.id}: sits in ${skill}'s ladder file but claims ${d.skill}`);
    f.push(...callingFaults(d));
  }
  // The founding rows this ladder owes.
  for (const [id, [s, seat]] of FOUNDING_SEATS) {
    if (s === skill && !defs.some((d) => d.id === id)) f.push(`${skill}: founding row ${id} (seat ${seat}) is missing — THE NO-LOSS LAW`);
  }
  // Names and ids unique across the hall.
  const others = (hall ?? []).filter((d) => d.skill !== skill);
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const d of others) {
    ids.add(d.id);
    names.add(d.name.toLowerCase());
  }
  const mine = new Set<string>();
  const myNames = new Set<string>();
  for (const d of defs) {
    if (mine.has(d.id)) f.push(`${d.id}: duplicate id in ${skill}`);
    mine.add(d.id);
    if (ids.has(d.id)) f.push(`${d.id}: id already used by another ladder`);
    const n = d.name.toLowerCase();
    if (myNames.has(n)) f.push(`${d.id}: name '${d.name}' used twice in ${skill}`);
    myNames.add(n);
    if (names.has(n)) f.push(`${d.id}: name '${d.name}' already used by another ladder`);
  }
  // THE REGISTER: every touch licensed, every row touching, every page written.
  const key = (c: string, s: string, v: string): string => `${c}|${s}|${v}`;
  const rows = new Set(licenses.map((r) => key(r.calling, r.status, r.via)));
  const touched = new Set<string>();
  for (const d of defs) {
    for (const [, pkg] of everyPackage(d)) {
      for (const [status, via] of pageTouches(pkg)) {
        const k = key(d.id, status, via);
        touched.add(k);
        if (!rows.has(k)) f.push(`${d.id}: touches ${status} (${via}) without a license row`);
      }
    }
  }
  for (const r of licenses) {
    if (!defs.some((d) => d.id === r.calling)) f.push(`register: row for unknown calling ${r.calling}`);
    else if (!touched.has(key(r.calling, r.status, r.via))) f.push(`register: ${r.calling} licensed for ${r.status} (${r.via}) but never touches it`);
    if (!(r.status in STATUS_BOOK)) f.push(`register: ${r.calling} licenses an unwritten page '${r.status}'`);
  }
  return f;
}
