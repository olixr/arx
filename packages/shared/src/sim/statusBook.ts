/**
 * THE BOOK OF STATES (status-book-plan.md, Phase 1) — the composable
 * status core. Every status is a PAGE: a pure data record declaring
 * its lane, its stacking model, its ramp, its decay, its tick, its
 * thresholds, its consume behavior, and its visuals contract. The
 * engine interprets pages — it never special-cases an id outside this
 * book — so authoring a new state is writing a page and its art,
 * never editing the doors.
 *
 * THE FROZEN SIX: the six shipped states are transcribed below
 * exactly as they behave — every clock, cap, and lane references the
 * live constant in abilities.ts, so zero tuning constants move and
 * the pre-book suites pin the transcription. The NEW machinery (the
 * `count` model, ramps, thresholds, consume-at-max, stepDown decay,
 * CC immunity) ships engine-complete and page-parametric, exercised
 * by the laws in statusBook.test.ts until wave-one pages author it.
 *
 * PURITY LAW: everything in this file is pure data and pure
 * functions. The machinery takes the page as a PARAMETER, so every
 * model law is testable with a synthetic page and no server — the
 * stateBucket precedent, extended to the whole grammar.
 */

import {
  AFFLICTION_SOURCE_CAP,
  BLEED_TICK_EVERY,
  BURN_TICK_EVERY,
  CHILL_SPEED_FACTOR,
  SHOCK_MAX_TICKS,
  STATUS_IDS,
  SUNDER_MAX_PCT,
  VENOM_TICK_EVERY,
  type ActiveStatus,
  type StatusId,
} from './abilities.js';

// ------------------------------------------------------------ the page

/**
 * Stat channels a riding page may move. Phase 1 records the truth on
 * the page; the reads stay at their historic single sites (chill's
 * moveSpeedMult is read via CHILL_SPEED_FACTOR at the movement
 * sites — same constant, one truth). The generic per-channel fold
 * arrives with the boon lane (Phase 2) and the attackSpeedMult
 * channel is BORN there — typed now so pages can be authored against
 * the full vocabulary from day one.
 */
export interface StatMods {
  /** Multiplies movement speed while riding (chill: CHILL_SPEED_FACTOR). */
  moveSpeedMult?: number;
  /** Multiplies swing cadence (Phase 2 channel — no reader yet). */
  attackSpeedMult?: number;
  /** Flat armor shift while riding (Phase 2 channel). */
  armorDelta?: number;
  /** Regen lift while riding (Phase 2 channel). */
  regenPer4s?: number;
  /** Outgoing damage percent shift while riding (Phase 3: `weaken`). */
  damageDealtPct?: number;
  /** Ability cooldown multiplier while riding (Phase 2 channel). */
  cooldownMult?: number;
}

/**
 * How entries of this page share one body:
 *
 * - `refresh`   — one entry, both fields refresh by max (the sparks).
 * - `perSource` — one entry per hand per id, capped at `max`, the
 *   new hand folding into the weakest at the cap (the afflictions).
 * - `highest`   — one entry, highest power wins, duration by max
 *   (the sunder mark).
 * - `count`     — ONE entry carrying a stack counter: the composable
 *   workhorse. Each landing adds a stack up to `max`; power refreshes
 *   by max and ramps per stack (see StatusRamp); landing AT the cap
 *   answers by `atMax`.
 */
export type StackingModel = 'refresh' | 'perSource' | 'highest' | 'count';

export interface StatusStacking {
  model: StackingModel;
  /**
   * count: the stack ceiling. perSource: the source cap
   * (AFFLICTION_SOURCE_CAP). refresh/highest: 1 — one entry is the
   * whole story.
   */
  max: number;
  /**
   * What a landing at the ceiling does. `refresh` re-arms duration
   * (the shipped shape everywhere); `consume` SPENDS the state — the
   * whole stack answers per the page's `consume` block and leaves
   * the body. Count model only; the other models ignore it.
   */
  atMax: 'refresh' | 'consume';
}

/** What each stack past the first adds (count model only). */
export interface StatusRamp {
  /** Effective power = entry power + perStack × (stacks − 1). */
  powerPerStack: number;
  /** Stat channels that deepen per stack (Phase 2 reads them). */
  statPerStack?: StatMods;
}

/**
 * How the state leaves the body. `expire` ends whole at zero (the
 * shipped shape). `stepDown` sheds ONE stack when the clock runs out
 * and re-arms it at `stepTicks` — the potion that fades honestly
 * instead of vanishing (count model only; a stepDown page with one
 * stack left expires).
 */
export interface StatusDecay {
  model: 'expire' | 'stepDown';
  stepTicks?: number;
}

/** The periodic pulse (DoTs today; `heal` is the HoT lane's door). */
export interface StatusTickSpec {
  every: number;
  kind: 'damage' | 'heal';
}

/**
 * FAIR HANDS (plan law 7): hard control declared on the page, never
 * improvised. `maxTicks` bounds the lock (shock: SHOCK_MAX_TICKS —
 * the stagger is brief, the charge rides longer as reaction fodder).
 * `immunityTicks` is the engine-enforced window after expiry during
 * which the same page is refused at the door — CC chains are
 * impossible by construction, not by authoring discipline. The six
 * shipped pages declare 0 (no behavior change).
 */
export interface StatusCc {
  kind: 'stagger' | 'root';
  maxTicks: number;
  immunityTicks: number;
  /** Root only: absorbed damage that snaps the hold early. */
  breakOnDamage?: number;
}

/**
 * A named tier the stack count crosses — the emergent moment, and it
 * SPEAKS (A STACK IS A THING YOU CAN SEE): the door announces the
 * name through the reaction fx channel when the count first reaches
 * `atStacks`. Payload effects (rider pages, granted procs, aura tier
 * jumps) are later-phase authoring; the crossing detection is the
 * Phase 1 machinery.
 */
export interface StatusThreshold {
  atStacks: number;
  name: string;
}

/**
 * What `atMax: 'consume'` releases. `detonate` = damage scaled by
 * the stacks spent (spend, don't mint — the ledger prices
 * multPerStack against the stacks' remaining tick damage).
 * `release` = grant a boon page scaled by stacks spent — RESERVED
 * until the boon lane exists (Phase 2); no live page may author it,
 * pinned in the book's law tests.
 */
export type StatusConsume =
  | { kind: 'detonate'; multPerStack: number; radius: number }
  | { kind: 'release' };

/**
 * The visuals CONTRACT (plan laws 5 & 6) — what the client owes this
 * page. The page is the one truth for the ink (client STATUS_INK
 * derives from here) and names the landing/stack-note deployments
 * and the icon painter; the client owns the art itself. `auraTiers`
 * is how many escalation stages the body ambience wears (Phase 4).
 */
export interface StatusVisuals {
  /** THE ONE COLOR TRUTH — nameplate blocks, floats, wound row, chips. */
  ink: string;
  /** Own-body DoT vignette tint as 'r, g, b' (DoT pages only). */
  vignette?: string;
  /** Matter deployment the rising edge speaks (statusFx LANDINGS). */
  landing: string;
  /** The quieter re-apply note (stacking pages). */
  stackNote?: string;
  /** Ambience escalation stages the body wears (Phase 4 reads it). */
  auraTiers: 1 | 2 | 3;
  /** Icon painter id — THE ICON IS THE PAINTER, FOR STATES TOO (Phase 4). */
  icon: string;
}

/** What a page's `power` number MEANS — tooling and tooltips read this. */
export type StatusPowerMeaning = 'tickDamage' | 'takenPct' | 'none';

export interface StatusPage {
  id: StatusId;
  /** Display name — cards, chips, threshold ceremonies, the codex. */
  name: string;
  /**
   * The lane keeps its shipped meaning: sparks react among
   * themselves, afflictions ride and stack, the mark amplifies.
   * `boon` is the friendly lane (Phase 2) — cleanse touches hostile
   * pages only.
   */
  lane: 'spark' | 'affliction' | 'mark' | 'boon';
  hostile: boolean;
  powerIs: StatusPowerMeaning;
  stacking: StatusStacking;
  ramp?: StatusRamp;
  decay: StatusDecay;
  tick?: StatusTickSpec;
  statMods?: StatMods;
  cc?: StatusCc;
  thresholds?: readonly StatusThreshold[];
  consume?: StatusConsume;
  visuals: StatusVisuals;
}

// -------------------------------------------------------- the six pages

/**
 * THE FROZEN SIX — the shipped states transcribed, not re-tuned.
 * Every number below is the live constant; the pre-book suites
 * (statusLanes, readingEdge, abilities pins) are the byte-identical
 * proof. Inks match statusFx's shipped STATUS_INK, which now derives
 * from these pages (one truth, one home).
 */
export const STATUS_BOOK: Readonly<Record<StatusId, StatusPage>> = {
  burn: {
    id: 'burn',
    name: 'Burn',
    lane: 'spark',
    hostile: true,
    powerIs: 'tickDamage',
    stacking: { model: 'refresh', max: 1, atMax: 'refresh' },
    decay: { model: 'expire' },
    tick: { every: BURN_TICK_EVERY, kind: 'damage' },
    visuals: {
      ink: '#ff8a3c',
      vignette: '224, 118, 44',
      landing: 'fire.burst',
      auraTiers: 1,
      icon: 'status_burn',
    },
  },
  chill: {
    id: 'chill',
    name: 'Chill',
    lane: 'spark',
    hostile: true,
    powerIs: 'none',
    stacking: { model: 'refresh', max: 1, atMax: 'refresh' },
    decay: { model: 'expire' },
    statMods: { moveSpeedMult: CHILL_SPEED_FACTOR },
    visuals: { ink: '#8ac4e8', landing: 'frost.bloom', auraTiers: 1, icon: 'status_chill' },
  },
  shock: {
    id: 'shock',
    name: 'Shock',
    lane: 'spark',
    hostile: true,
    powerIs: 'none',
    stacking: { model: 'refresh', max: 1, atMax: 'refresh' },
    decay: { model: 'expire' },
    cc: { kind: 'stagger', maxTicks: SHOCK_MAX_TICKS, immunityTicks: 0 },
    visuals: { ink: '#e8e06a', landing: 'storm.crackle', auraTiers: 1, icon: 'status_shock' },
  },
  bleed: {
    id: 'bleed',
    name: 'Bleed',
    lane: 'affliction',
    hostile: true,
    powerIs: 'tickDamage',
    stacking: { model: 'perSource', max: AFFLICTION_SOURCE_CAP, atMax: 'refresh' },
    decay: { model: 'expire' },
    tick: { every: BLEED_TICK_EVERY, kind: 'damage' },
    visuals: {
      ink: '#c4372a',
      vignette: '196, 60, 40',
      landing: 'blood.spatter',
      stackNote: 'blood.drip',
      auraTiers: 1,
      icon: 'status_bleed',
    },
  },
  venom: {
    id: 'venom',
    name: 'Venom',
    lane: 'affliction',
    hostile: true,
    powerIs: 'tickDamage',
    stacking: { model: 'perSource', max: AFFLICTION_SOURCE_CAP, atMax: 'refresh' },
    decay: { model: 'expire' },
    tick: { every: VENOM_TICK_EVERY, kind: 'damage' },
    visuals: {
      ink: '#a0c050',
      vignette: '124, 158, 48',
      landing: 'venom.burst',
      stackNote: 'venom.bead',
      auraTiers: 1,
      icon: 'status_venom',
    },
  },
  sunder: {
    id: 'sunder',
    name: 'Sunder',
    lane: 'mark',
    hostile: true,
    // Power is the flat "takes more" percent, clamped SUNDER_MAX_PCT
    // at the seam's read (sunderAmp) — the page records the meaning,
    // the seam keeps the clamp.
    powerIs: 'takenPct',
    stacking: { model: 'highest', max: 1, atMax: 'refresh' },
    decay: { model: 'expire' },
    visuals: { ink: '#b8b2a6', landing: 'dust.slam', auraTiers: 1, icon: 'status_sunder' },
  },
};

/** The page for an id — the engine's one lookup. */
export function pageOf(id: StatusId): StatusPage {
  return STATUS_BOOK[id];
}

/** The sunder clamp, recorded beside the page that means it. */
export const SUNDER_POWER_CAP = SUNDER_MAX_PCT;

// ---------------------------------------------------- the pure machinery

/**
 * A riding entry as the book sees it. `stacks` exists only on count
 * pages (the legacy models carry meaning in list length and power);
 * absent means 1.
 */
export interface StackEntry extends ActiveStatus {
  stacks?: number;
}

/** The stack count a book reader should show for one entry. */
export function stacksOf(entry: StackEntry): number {
  return entry.stacks ?? 1;
}

/**
 * The max-rule refresh — the one way any entry deepens: duration and
 * power both refresh upward, never down (a weaker late blow never
 * shortens or dulls a riding wound).
 */
export function refreshMax(entry: StackEntry, power: number, durationTicks: number): void {
  entry.ticksLeft = Math.max(entry.ticksLeft, durationTicks);
  entry.power = Math.max(entry.power, power);
}

/** The fold target at a perSource cap: the weakest wound deepens. */
export function weakestOf<T extends StackEntry>(entries: readonly T[]): T {
  return entries.reduce((a, b) => (a.power <= b.power ? a : b));
}

/**
 * Effective magnitude of one entry under its page's ramp: base power
 * plus perStack for every stack past the first. Identity for the
 * legacy models (no ramp, stacks absent) — the six shipped pages
 * tick exactly what they always ticked.
 */
export function effectivePower(page: StatusPage, entry: StackEntry): number {
  const per = page.ramp?.powerPerStack ?? 0;
  if (per === 0) return entry.power;
  return entry.power + per * (stacksOf(entry) - 1);
}

/** Thresholds first reached moving from `before` to `after` stacks, in order. */
export function thresholdsCrossed(
  page: StatusPage,
  before: number,
  after: number,
): readonly StatusThreshold[] {
  if (!page.thresholds || after <= before) return [];
  return page.thresholds.filter((t) => before < t.atStacks && t.atStacks <= after);
}

/** What a consume-at-max detonation deals for the stacks it spends. */
export function consumeDetonation(
  page: StatusPage,
  entry: StackEntry,
): { damage: number; radius: number } | null {
  if (page.consume?.kind !== 'detonate') return null;
  const spent = stacksOf(entry);
  return {
    damage: Math.max(1, Math.round(effectivePower(page, entry) * spent * page.consume.multPerStack)),
    radius: page.consume.radius,
  };
}

/** The verdict one count-model landing produces. */
export interface CountApplyResult {
  outcome: 'new' | 'stacked' | 'refreshed' | 'consumed';
  /** The riding entry after the landing ('consumed' leaves none). */
  entry?: StackEntry;
  /** consumed: stacks spent; detonation per the page's consume block. */
  spent?: number;
  detonation?: { damage: number; radius: number };
  /** Tiers first reached by this landing, in order — the door announces them. */
  crossed: readonly StatusThreshold[];
}

/**
 * THE COUNT DOOR (pure): apply one landing of a count-model page to
 * a body's list. One entry per id carries the whole count; each
 * landing adds a stack to the page's max and refreshes by the max
 * rules; landing AT the max either re-arms (`atMax: 'refresh'`) or
 * SPENDS the state (`atMax: 'consume'`) — the entry leaves the list
 * and the verdict carries the detonation for the caller to deal.
 * Mutates `list` (the door's own idiom); returns the verdict.
 */
export function applyCount<T extends StackEntry>(
  list: T[],
  page: StatusPage,
  power: number,
  durationTicks: number,
  make: (stacks: number) => T,
): CountApplyResult {
  const idx = list.findIndex((s) => s.id === page.id);
  const max = Math.max(1, page.stacking.max);
  if (idx < 0) {
    const entry = make(1);
    entry.stacks = 1;
    list.push(entry);
    return { outcome: 'new', entry, crossed: thresholdsCrossed(page, 0, 1) };
  }
  const entry = list[idx]!;
  const before = stacksOf(entry);
  if (before >= max) {
    if (page.stacking.atMax === 'consume') {
      const detonation = consumeDetonation(page, entry);
      list.splice(idx, 1);
      return {
        outcome: 'consumed',
        spent: before,
        ...(detonation ? { detonation } : {}),
        crossed: [],
      };
    }
    refreshMax(entry, power, durationTicks);
    return { outcome: 'refreshed', entry, crossed: [] };
  }
  entry.stacks = before + 1;
  refreshMax(entry, power, durationTicks);
  return { outcome: 'stacked', entry, crossed: thresholdsCrossed(page, before, before + 1) };
}

/** The verdict one decay tick produces (after the caller decrements). */
export type DecayVerdict = 'live' | 'stepped' | 'expired';

/**
 * THE DECAY DOOR (pure): answer for an entry whose clock reached
 * zero. `expire` ends the state whole (the shipped shape).
 * `stepDown` sheds one stack and re-arms the clock at stepTicks —
 * until the last stack, which expires. Callers splice on 'expired'.
 */
export function decayAtZero(page: StatusPage, entry: StackEntry): DecayVerdict {
  if (page.decay.model === 'stepDown' && stacksOf(entry) > 1) {
    entry.stacks = stacksOf(entry) - 1;
    entry.ticksLeft = Math.max(1, page.decay.stepTicks ?? 1);
    return 'stepped';
  }
  return 'expired';
}

/**
 * The hard-lock ticks one application of a CC page may impose,
 * before body-specific dials (THE STUBBORN CROWN's bossStunTicks
 * stays the server's — it reads the body, not the page).
 */
export function ccTicksFor(page: StatusPage, durationTicks: number): number {
  if (!page.cc) return 0;
  return Math.min(durationTicks, page.cc.maxTicks);
}
