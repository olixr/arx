/**
 * THE WEAPON'S TEMPER — native weapon identity (buildcraft Phase 4).
 *
 * The twenty masterworks and fifteen regalia each carry ONE native
 * temper: a thing the steel DOES, not a bigger number. Tempers ride
 * the same native `effects` channel the Ten Crowns already use, so
 * the strike/aggregate routing laws are already true of them:
 * onHitStatus and strike-triggered procs read from the steel that
 * LANDED (two dual-wielded edges answer separately), body-triggered
 * procs and vsState fold into the worn aggregate.
 *
 * Two loudness tiers:
 * - a MINOR temper is ambient identity — a state applier or a small
 *   rhythm answer on a short rest;
 * - a SIGNATURE temper wakes once or twice a fight on a long rest,
 *   and several read the body through the Phase 2 grammar
 *   (`hitState` tempers pay only against marked foes — the first
 *   authored users of that trigger).
 *
 * Authored here as a registry rather than 34 scattered def literals
 * so the roster reads as one page and the law test can walk it.
 * compile.ts merges each temper into its weapon's native effects.
 * `borrowed_time` and `wakestone` keep their pre-buildcraft natives
 * and are counted as already tempered (tempers.test.ts pins both).
 *
 * The elementDmg decision (plan Phase 4) is recorded here: it stays
 * the CASTER lane's stat. Melee tempers speak through statuses,
 * procs, and vs clauses instead — giving blades an element would
 * need new fold sites for no reading the statuses don't already give.
 */
import type { EnchantEffect } from './enchants.js';

export const TEMPERS: Record<string, EnchantEffect[]> = {
  // ------------------------------------------ the ten masterwork swords
  weathervane: [
    { kind: 'proc', id: 'temper_weathervane', name: 'The Vane Swings',
      trigger: { on: 'cadence', every: 6 },
      action: { do: 'surge', stat: 'speed', pct: 8, ticks: 40 }, icd: 120,
      element: 'storm' },
  ],
  chainbreaker: [
    { kind: 'proc', id: 'temper_chainbreaker', name: 'The Joint Gives',
      trigger: { on: 'cadence', every: 5 },
      action: { do: 'status', status: 'sunder', power: 12, ticks: 60 }, icd: 200 },
  ],
  lamplight: [
    { kind: 'onHitStatus', status: 'burn', power: 1, durationTicks: 60, chance: 0.15 },
  ],
  reefwrack: [
    { kind: 'onHitStatus', status: 'chill', power: 0, durationTicks: 50, chance: 0.18 },
  ],
  hollowmoon: [
    { kind: 'proc', id: 'temper_hollowmoon', name: 'The Phase Slips',
      trigger: { on: 'crit' },
      action: { do: 'surge', stat: 'speed', pct: 15, ticks: 30 }, icd: 200,
      element: 'void' },
  ],
  quarryheart: [
    { kind: 'proc', id: 'temper_quarryheart', name: 'The Face Gives Way',
      trigger: { on: 'cadence', every: 7 },
      action: { do: 'nova', damage: 8, radius: 2 }, icd: 160 },
  ],
  silverlace: [
    { kind: 'onHitStatus', status: 'bleed', power: 2, durationTicks: 80, chance: 0.12 },
  ],
  riven: [
    { kind: 'proc', id: 'temper_riven', name: 'What Is Riven Stays Open',
      trigger: { on: 'crit' },
      action: { do: 'status', status: 'sunder', power: 15, ticks: 60 }, icd: 240 },
  ],
  silver_line: [
    { kind: 'proc', id: 'temper_silver_line', name: 'The Line Holds',
      trigger: { on: 'hurt', chance: 0.25 },
      action: { do: 'ward', absorb: 12, ticks: 100 }, icd: 400, element: 'radiant' },
  ],
  northlight: [
    // SIGNATURE: the sky answers the frozen — a hitState temper pays
    // only against chilled bodies, so the build is bring-your-own-cold.
    { kind: 'proc', id: 'temper_northlight', name: 'The Sky Answers',
      trigger: { on: 'hitState', status: 'chill', chance: 0.3 },
      action: { do: 'nova', damage: 12, radius: 2.5 }, icd: 300, element: 'frost' },
  ],
  // ----------------------------------------- the ten masterwork daggers
  cindersnip: [
    { kind: 'onHitStatus', status: 'burn', power: 1, durationTicks: 50, chance: 0.12 },
  ],
  larkspur: [
    { kind: 'onHitStatus', status: 'venom', power: 1, durationTicks: 70, chance: 0.15 },
  ],
  latchkey: [
    { kind: 'proc', id: 'temper_latchkey', name: 'The Lock Turns',
      trigger: { on: 'crit' },
      action: { do: 'surge', stat: 'damage', pct: 8, ticks: 40 }, icd: 240 },
  ],
  mothlight: [
    // The duskruff's knife drinks where the venom already sits.
    { kind: 'proc', id: 'temper_mothlight', name: 'The Moth Drinks',
      trigger: { on: 'hitState', status: 'venom', chance: 0.3 },
      action: { do: 'heal', amount: 4 }, icd: 160, element: 'verdant' },
  ],
  undertow: [
    { kind: 'onHitStatus', status: 'chill', power: 0, durationTicks: 50, chance: 0.15 },
  ],
  vesper: [
    { kind: 'proc', id: 'temper_vesper', name: 'The Eighth Toll',
      trigger: { on: 'cadence', every: 8 },
      action: { do: 'status', status: 'venom', power: 3, ticks: 90 }, icd: 160,
      element: 'verdant' },
  ],
  lodestone: [
    // SIGNATURE: the golem's stone pulls the charge out of the shocked.
    { kind: 'proc', id: 'temper_lodestone', name: 'The Stone Pulls',
      trigger: { on: 'hitState', status: 'shock', chance: 0.35 },
      action: { do: 'bolt', damage: 8 }, icd: 200, element: 'storm' },
  ],
  silverthread: [
    { kind: 'proc', id: 'temper_silverthread', name: 'The Thread Pulls Through',
      trigger: { on: 'crit' },
      action: { do: 'status', status: 'bleed', power: 3, ticks: 120 }, icd: 180 },
  ],
  eclipse: [
    // SIGNATURE: the dark feeds on the bleeding sun.
    { kind: 'vsState', status: 'bleed', pct: 25 },
  ],
  // borrowed_time keeps its pre-buildcraft temper (onKillHaste + crit).
  // -------------------------------------------- the fifteen regalia
  dowser: [
    { kind: 'onHitStatus', status: 'chill', power: 0, durationTicks: 50, chance: 0.15 },
  ],
  swarmsong: [
    { kind: 'proc', id: 'temper_swarmsong', name: 'The Swarm Settles',
      trigger: { on: 'cadence', every: 6 },
      action: { do: 'status', status: 'venom', power: 2, ticks: 80 }, icd: 140,
      element: 'verdant' },
  ],
  merelight: [
    { kind: 'proc', id: 'temper_merelight', name: 'The Mere Gives Back',
      trigger: { on: 'hurt', chance: 0.2 },
      action: { do: 'heal', amount: 4 }, icd: 300, element: 'frost' },
  ],
  knellwood: [
    { kind: 'proc', id: 'temper_knellwood', name: 'The Knell Carries',
      trigger: { on: 'kill' },
      action: { do: 'surge', stat: 'damage', pct: 6, ticks: 50 }, icd: 200,
      element: 'void' },
  ],
  glassgather: [
    { kind: 'onHitStatus', status: 'burn', power: 1, durationTicks: 60, chance: 0.15 },
  ],
  duskcap: [
    { kind: 'proc', id: 'temper_duskcap', name: 'Spores Find the Poisoned',
      trigger: { on: 'hitState', status: 'venom', chance: 0.3 },
      action: { do: 'chain', damage: 6, jumps: 2 }, icd: 200, element: 'verdant' },
  ],
  meridian: [
    { kind: 'proc', id: 'temper_meridian', name: 'The Line Crosses',
      trigger: { on: 'cadence', every: 7 },
      action: { do: 'status', status: 'chill', power: 0, ticks: 60 }, icd: 140,
      element: 'frost' },
  ],
  stormjar: [
    { kind: 'proc', id: 'temper_stormjar', name: 'The Jar Leaks',
      trigger: { on: 'hit', chance: 0.1 },
      action: { do: 'chain', damage: 6, jumps: 3 }, icd: 160, element: 'storm' },
  ],
  escapement: [
    { kind: 'proc', id: 'temper_escapement', name: 'The Sixth Tick',
      trigger: { on: 'stacks', per: 'cast', count: 6 },
      action: { do: 'surge', stat: 'crit', pct: 8, ticks: 60 }, icd: 180,
      element: 'arcane' },
  ],
  lastsheaf: [
    { kind: 'proc', id: 'temper_lastsheaf', name: 'The Kept Grain',
      trigger: { on: 'kill' },
      action: { do: 'heal', amount: 6 }, icd: 180, element: 'verdant' },
  ],
  mirrormere: [
    { kind: 'proc', id: 'temper_mirrormere', name: 'The Mirror Turns the Light',
      trigger: { on: 'hurt', chance: 0.25 },
      action: { do: 'ward', absorb: 10, ticks: 100 }, icd: 400, element: 'radiant' },
  ],
  ashgarden: [
    // SIGNATURE: what burns feeds the garden.
    { kind: 'vsState', status: 'burn', pct: 25 },
  ],
  hollowchoir: [
    { kind: 'proc', id: 'temper_hollowchoir', name: 'The Hollow Opens',
      trigger: { on: 'cadence', every: 9 },
      action: { do: 'nova', damage: 10, radius: 2.2 }, icd: 200, element: 'void' },
  ],
  spindrift: [
    // SIGNATURE: spray rides the frozen wind.
    { kind: 'proc', id: 'temper_spindrift', name: 'Spray Rides the Wind',
      trigger: { on: 'hitState', status: 'chill', chance: 0.3 },
      action: { do: 'chain', damage: 8, jumps: 3 }, icd: 240, element: 'storm' },
  ],
  // wakestone keeps its pre-buildcraft natives (the legendary's own).
  // ------------------------------------------------- the arena's blade
  //
  // THE WORN BOOK wave: the sand's second exclusive, and the whole
  // roster's surge-'swing' debut. A crowd keeps time whether or not
  // you want it to, and the eighth blow of a bout is where the noise
  // gets into the arm.
  //
  // The 3% is PRICED, not chosen: THE SWING ASSEMBLY (statusLedger)
  // folds quicken at five stacks x the quickstep tonic x the worst
  // wearable wardrobe against SWING_MULT_MAX, and the page and the
  // shelf have already spent 1.338 of the 1.5 between them. The plan
  // proposed 8%; at 8% the assembly leans on the band and the clamp
  // would eat the difference in silence, which is a lie told to the
  // player on the item card. The blade's identity is the RHYTHM, and
  // the rhythm survives the honest number.
  laurelbrand: [
    { kind: 'proc', id: 'temper_laurelbrand', name: 'The Crowd Keeps Time',
      trigger: { on: 'cadence', every: 8 },
      action: { do: 'surge', stat: 'swing', pct: 3, ticks: 60 }, icd: 240,
      element: 'radiant' },
  ],
};

/** The temper merged into a weapon's natives at compile, or []. */
export function temperFor(weaponId: string): EnchantEffect[] {
  return TEMPERS[weaponId] ?? [];
}

/** Rosters the temper law test walks (the epic's own receipts). */
export const MASTERWORK_SWORDS = ['weathervane', 'chainbreaker', 'lamplight', 'reefwrack',
  'hollowmoon', 'quarryheart', 'silverlace', 'riven', 'silver_line', 'northlight'] as const;
export const MASTERWORK_DAGGERS = ['cindersnip', 'larkspur', 'latchkey', 'mothlight',
  'undertow', 'vesper', 'lodestone', 'silverthread', 'eclipse', 'borrowed_time'] as const;
export const STAFF_REGALIA = ['dowser', 'swarmsong', 'merelight', 'knellwood', 'glassgather',
  'duskcap', 'meridian', 'stormjar', 'escapement', 'lastsheaf', 'mirrormere', 'ashgarden',
  'hollowchoir', 'spindrift', 'wakestone'] as const;
/**
 * THE WORN BOOK wave: the registry's fourth roster. The honor roll was
 * the masterworks and the regalia and nothing else, and the arena's own
 * exclusive is neither — it is won in the sand, not smithed. It answers
 * every temper law the other thirty three do, so it is a roster entry
 * rather than an exception carved into the pin.
 */
export const ARENA_STEEL = ['laurelbrand'] as const;
