/**
 * THE ANSWERED LIFE — the book of Callings (callings-v2-plan.md).
 *
 * A Calling is the character axis of the build: answered under THE
 * FOCUS LAW's budget (shared/skills.ts), free to toggle any time,
 * unlocked by BASE level up its skill's ladder. What you hold
 * answered under a budget that cannot hold everything IS your class.
 *
 * THE CALLING IS A PACKAGE: `effects` is a list, one to several
 * licensed shapes per Calling. ONE GRAMMAR binds every shape — a
 * Calling speaks the same vocabulary the equipment axis speaks
 * (EnchantEffect aggregates, the proc grammar, the buff forge's
 * folds, the status book's pages) plus the one-site perk dials:
 *  - gear:        an EnchantEffect aggregate folded into GearStats by
 *                 the same foldEffect law enchants use (recomputeGear).
 *  - perPiece:    an aggregate scaled by worn armor-class piece count,
 *                 applied after the gear fold reads classCounts.
 *  - perk:        a named dial read at exactly one server hook site —
 *                 the PERK_DIALS registry below documents each site,
 *                 and PERK_FOLD declares each dial's composition law.
 *  - doubleGather / gatherSpeed / materialSave / craftSpeed: trade
 *                 dials keyed by skill, read at the gather/craft
 *                 sites — self-keyed by law (the trade's own thrift
 *                 points at its own trade).
 *  - proc:        the waking hand — trigger x action x icd through
 *                 the fighter's one meter map (Phase 2 opens the
 *                 door; TYPED-UNREAD until then, test-pinned).
 *  - when:        the when clause — a conditional grant riding the
 *                 buff forge (Phase 3 opens the door; TYPED-UNREAD).
 *  - art:         the master's license — RESERVED for the content
 *                 epoch (the master smith's brief lives here).
 *
 * RANK IS DEPTH; THE APPLIED RANK IS A CHOICE YOU AFFORD: rank
 * entitlement I-IV derives from BASE surplus over the seat by the
 * honed-art clocks (never stored, never bought); the rank a player
 * ANSWERS at is chosen up to that entitlement and priced by the
 * focus law (Phase 4 wires the choice; until then everything answers
 * at rank I). A rank step REPLACES the package whole and speaks its
 * note at the ceremony — the absolute-override law honedAbility
 * taught.
 *
 * THEME IS THE ROOT, NOT THE FENCE: a Calling belongs to its skill
 * by story, seat, and ceremony — its benefits may land anywhere
 * (the smith's calling may sharpen her sword arm). Only the trade
 * dials stay self-keyed.
 *
 * Never fold a strike-kind enchant effect into a Calling's gear
 * entry (the aggregate/strike split is test-locked in
 * callings.test.ts; strike identity belongs to a landed weapon).
 */
import { TECHNIQUE_MAX_RANK, techniqueRank, type SkillId, type StatusId } from '@arx/shared';
import type { ArmorClass } from './equipment/types.js';
import { STRIKE_EFFECT_KINDS, type EnchantEffect, type ProcEffect } from './equipment/enchants.js';

/**
 * One-site dials. Each entry names the single server hook that reads
 * it — keep this comment column true; it is the map future readers use.
 */
export type PerkId =
  | 'foodHealMult' //        useItem: food heal × mult
  | 'foodBuffDurMult' //     useItem: food-channel buff duration × mult
  | 'tonicBuffDurMult' //    useItem: tonic-channel buff duration × mult
  | 'finisherBonusMult' //   meleeSwing: finisher damage × mult
  | 'stillArmor' //          damagePlayer mitigate: +armor when standing still
  | 'shieldMult' //          buff push: shieldHp gained × mult
  | 'snapShotMult' //        bow release: snap-shot damage × mult
  | 'drawMoveFactor' //      bow draw: movement factor floor (higher = faster)
  | 'sneakFactorBonus' //    sneak aggro factor: −bonus (quieter steps)
  | 'backstabBonus' //       meleeSwing: +backstab multiplier bonus
  | 'offhandDelayTicks' //   dual-wield echo: schedule delay override (lower = tighter)
  | 'offhandFactorBonus' //  offhand echo: +damage factor bonus
  | 'undergroundGatherMult' // gather speed: × mult while underground
  | 'nightGatherMult' //     gather speed: × mult after dusk (fishing calling)
  | 'burnChanceMult' //      cooking: burn chance × mult
  | 'dotResistMult' //       player DoT tick: damage × mult
  | 'seedRefundChance' //    harvest: chance the seed is refunded
  | 'doubleHarvestChance' // harvest: chance the yield doubles
  | 'doubleProduceChance' // beastcraft collect: chance the produce doubles
  | 'produceRestMult' //     beastcraft collect: animal readiness cooldown × mult
  | 'buildSpeedMult' //      build(): construction ticks × mult
  | 'shieldArm' //           damagePlayer mitigate: +armor while a shield is raised
  | 'shieldThorns' //        npc strike thorns: +thorns while a shield is raised
  | 'greatReach' //          tryPlayerAttack (twohand): +reach, tiles
  | 'greatExecute' //        meleeSwing (twohand): +damage fraction vs targets under 25% hp
  | 'poleReach' //           tryPlayerAttack (polearm): +reach, tiles
  | 'warGripBonus' //        tryPlayerAttack (polearm): +war-grip damage mult (rides POLEARM_WAR_GRIP_MULT)
  | 'marchArmor' //          damagePlayer mitigate: +armor while moving
  | 'warSchooling' //        effectiveLevel: +levels to the five weapon schools
  | 'inscribeQuality' //    tickCraft: +quality points on every inscription
  // THE GREEN ARTS wave (farming v2 Phase 6): three more one-site dials.
  | 'compostDiscount' //     compostAdd: batch closes this many worth sooner
  | 'brushRestMult' //       interactLivestock: brush window cooldown × mult
  | 'larderSellMult'; //     larderPay: premium price × mult

/**
 * EVERY FOLD IS DECLARED (callings-v2 law 8): how two answered hands
 * on the SAME dial compose. Before this table the perk fold was
 * last-write-wins — survivable at two seats per skill, silent
 * clobber at ten. The law follows the dial's units: multipliers
 * multiply (defaults 1), adders sum (defaults 0), floors take max,
 * tighteners take min. With no two shipped Callings sharing a dial,
 * every fold below reads byte-identical to the old write.
 */
export type PerkFoldLaw = 'sum' | 'mult' | 'max' | 'min';

export const PERK_FOLD: Readonly<Record<PerkId, PerkFoldLaw>> = {
  foodHealMult: 'mult',
  foodBuffDurMult: 'mult',
  tonicBuffDurMult: 'mult',
  finisherBonusMult: 'mult',
  stillArmor: 'sum',
  shieldMult: 'mult',
  snapShotMult: 'mult',
  drawMoveFactor: 'max', //   a floor: the highest floor wins
  sneakFactorBonus: 'sum',
  backstabBonus: 'sum',
  offhandDelayTicks: 'min', // a tightening: the tightest echo wins
  offhandFactorBonus: 'sum',
  undergroundGatherMult: 'mult',
  nightGatherMult: 'mult',
  burnChanceMult: 'mult',
  dotResistMult: 'mult',
  seedRefundChance: 'sum',
  doubleHarvestChance: 'sum',
  doubleProduceChance: 'sum',
  produceRestMult: 'mult',
  buildSpeedMult: 'mult',
  shieldArm: 'sum',
  shieldThorns: 'sum',
  greatReach: 'sum',
  greatExecute: 'sum',
  poleReach: 'sum',
  warGripBonus: 'sum',
  marchArmor: 'sum',
  warSchooling: 'sum',
  inscribeQuality: 'sum',
  compostDiscount: 'sum',
  brushRestMult: 'mult',
  larderSellMult: 'mult',
};

/**
 * THE WHEN CLAUSE's vocabulary — when a conditional grant is live.
 * Evaluated by the engine each tick at ONE site; edges grant/expire
 * an id-keyed calling-channel buff so the numbers ride THE BUFF
 * FORGE's declared folds (Phase 3 opens the door). hpBelow/hpAbove
 * carry the Second Wind hysteresis at the engine — a bouncing bar
 * cannot strobe a grant.
 */
export type CallingCondition =
  | { when: 'hpBelow'; frac: number } //  the desperation lane
  | { when: 'hpAbove'; frac: number } //  the confidence lane
  | { when: 'still' } //                  the planted stance (stillTicks)
  | { when: 'moving' } //                 the march
  | { when: 'shieldRaised' } //           the wall
  | { when: 'underground' } //            the deep
  | { when: 'night' } //                  dusk to sunrise
  | { when: 'stateRiding'; status: StatusId } // a page rides YOUR body
  | { when: 'wellFed' }; //               a food-channel buff is live

/**
 * What a live condition grants: the BuffLike face, folded by the
 * forge's table like every other buff in the game. `quiet` grants
 * live chipless (the momentum idiom); everything else shows its
 * chip with THE HONEST RING while the condition holds.
 */
export interface CallingGrant {
  /** The chip's honest name. */
  name: string;
  armor?: number;
  speedMult?: number;
  attackSpeedMult?: number;
  critPct?: number;
  dmgMult?: number;
  regenPer4s?: number;
  reflectFrac?: number;
  meleeLifesteal?: number;
  gatherSpeed?: number;
  quiet?: boolean;
}

export type CallingEffect =
  | { kind: 'gear'; effect: EnchantEffect }
  | { kind: 'perPiece'; armorClass: ArmorClass; speedPct?: number; maxHp?: number }
  | { kind: 'perk'; perk: PerkId; magnitude: number }
  | { kind: 'doubleGather'; skill: SkillId; chance: number }
  | { kind: 'gatherSpeed'; skill: SkillId; mult: number }
  | { kind: 'materialSave'; skill: SkillId; chance: number }
  | { kind: 'craftSpeed'; skill: SkillId; mult: number }
  /**
   * THE WAKING HAND (Phase 2 opens the door): the full proc grammar,
   * body-side. Strike-family triggers (hit/crit/cadence/hitState)
   * are LEGAL here — a Calling's edge is the hand itself, so they
   * resolve at the strike fall-through and THE METER IS THE
   * FIGHTER'S by construction. TYPED-UNREAD until Phase 2,
   * test-pinned.
   */
  | { kind: 'proc'; proc: ProcEffect }
  /** THE WHEN CLAUSE (Phase 3 opens the door). TYPED-UNREAD. */
  | { kind: 'when'; cond: CallingCondition; grant: CallingGrant }
  /**
   * THE MASTER'S LICENSE — while answered, one art is licensed to
   * the codex and the cast door. RESERVED for the content epoch; no
   * core-phase author, test-pinned.
   */
  | { kind: 'art'; ability: string };

/**
 * A rank step REPLACES the package whole (the absolute-override law
 * honedAbility taught — merge semantics on arrays are where bugs
 * live) and speaks its `note` at the ceremony, ≤90 chars.
 */
export interface CallingRankStep {
  note: string;
  effects: readonly CallingEffect[];
}

/** Rank I plus one step each for II, III, IV — the honed-art shape. */
export type CallingRanks = readonly [CallingRankStep, CallingRankStep, CallingRankStep];

export interface CallingDef {
  id: string;
  skill: SkillId;
  /** BASE-level seat on the skill's ladder. */
  unlockLevel: number;
  /**
   * Focus this Calling holds while answered AT RANK I. The applied
   * rank surcharges it (+1 per rank past I — Phase 4 wires the
   * choice and its ledger).
   */
  focusCost: number;
  name: string;
  /** One line for the codex — what answering it means. */
  desc: string;
  color: string;
  /** The rank-I package. */
  effects: readonly CallingEffect[];
  /** The deepened packages (II, III, IV). Absent = the package holds. */
  ranks?: CallingRanks;
}

// ------------------------------------------------ the honed clocks

/** Callings climb the honed-art ladder: I-IV, the same clocks. */
export const CALLING_MAX_RANK = TECHNIQUE_MAX_RANK;

/**
 * RANK IS DEPTH, NEVER A PURCHASE: the rank ENTITLEMENT this base
 * level has earned at this seat — 0 below the seat, I at it, then
 * the honed-art surplus clocks verbatim (RANK_SURPLUS strides, THE
 * SHORTENED CLIMB past 54). What rank a player ANSWERS at is their
 * choice up to this, priced by the focus law (Phase 4).
 */
export function callingRank(def: CallingDef, baseLevel: number): number {
  return techniqueRank(def.unlockLevel, baseLevel);
}

/**
 * The package at an applied rank: rank I (or an unranked def) is the
 * base package; each step past I replaces it whole. Ranks past the
 * authored steps hold the deepest step (the honedAbility clamp).
 */
export function honedCalling(def: CallingDef, rank: number): readonly CallingEffect[] {
  if (!def.ranks || rank <= 1) return def.effects;
  const step = Math.min(rank - 1, def.ranks.length);
  return def.ranks[step - 1]!.effects;
}

const defs: CallingDef[] = [
  // ------------------------------------------------------------ vitality
  {
    id: 'hearty_meals',
    skill: 'vitality',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Hearty Meals',
    desc: 'Every meal goes further. Food heals a quarter more.',
    color: '#d98a5a',
    effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.25 }],
  },
  {
    id: 'ironblood',
    skill: 'vitality',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironblood',
    desc: 'Your wounds close on their own schedule. Steady regeneration.',
    color: '#c4372a',
    effects: [{ kind: 'gear', effect: { kind: 'regen', amount: 1 } }],
  },
  // -------------------------------------------------------------- combat
  {
    id: 'war_footing',
    skill: 'combat',
    unlockLevel: 20,
    focusCost: 1,
    name: 'War Footing',
    desc: 'A soldier is hardest to hurt mid stride. Armor while you move.',
    color: '#b0623c',
    effects: [{ kind: 'perk', perk: 'marchArmor', magnitude: 4 }],
  },
  {
    id: 'old_campaigner',
    skill: 'combat',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Old Campaigner',
    desc: 'Every road taught you something. All five weapon schools fight two levels higher.',
    color: '#8f7a4a',
    effects: [{ kind: 'perk', perk: 'warSchooling', magnitude: 2 }],
  },
  // ------------------------------------------------------------- onehand
  {
    id: 'follow_through',
    skill: 'onehand',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Follow-Through',
    desc: 'The third blow carries the first two. Finishers hit a tenth harder.',
    color: '#d9a05a',
    effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.1 }],
  },
  {
    id: 'warpath',
    skill: 'onehand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Warpath',
    desc: 'Every kill feeds the next. Abilities recover on each fallen foe.',
    color: '#b8433a',
    effects: [{ kind: 'gear', effect: { kind: 'onKillHaste', ticks: 10 } }],
  },
  // ------------------------------------------------------------- defence
  {
    id: 'bulwark',
    skill: 'defence',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Bulwark',
    desc: 'Hold your ground and the ground holds you. Armor while standing firm.',
    color: '#8a94a4',
    effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 6 }],
  },
  {
    id: 'stonewall',
    skill: 'defence',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Stonewall',
    desc: 'Every shield you raise is a quarter thicker.',
    color: '#6a7484',
    effects: [{ kind: 'perk', perk: 'shieldMult', magnitude: 1.25 }],
  },
  // ------------------------------------------------------------- archery
  {
    id: 'fletchers_eye',
    skill: 'archery',
    unlockLevel: 20,
    focusCost: 1,
    name: "Fletcher's Eye",
    desc: 'Snap shots stop being apologies. Quick arrows bite harder.',
    color: '#8a9a5a',
    effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.15 }],
  },
  {
    id: 'longstride',
    skill: 'archery',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Longstride',
    desc: 'The full draw no longer roots you. Walk your aim.',
    color: '#6b8a5a',
    effects: [{ kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.7 }],
  },
  // ----------------------------------------------------------------- arx
  {
    id: 'kindled_mind',
    skill: 'arx',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Kindled Mind',
    desc: 'The words come back to you sooner. Ability cooldowns shorten.',
    color: '#b49af0',
    effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 5 } }],
  },
  {
    id: 'attuned',
    skill: 'arx',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Attuned',
    desc: 'The current runs closer to the skin. Arx strikes harder.',
    color: '#8a6ac8',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 6 } }],
  },
  // --------------------------------------------------------------- sneak
  {
    id: 'soft_step',
    skill: 'sneak',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Soft Step',
    desc: 'The floor forgets you faster. Harder to notice, sooner unseen.',
    color: '#8a7fae',
    effects: [{ kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.05 }],
  },
  {
    id: 'opportunist',
    skill: 'sneak',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Opportunist',
    desc: 'A turned back is a signed invitation. Backstabs cut deeper.',
    color: '#5a4a6a',
    effects: [{ kind: 'perk', perk: 'backstabBonus', magnitude: 0.25 }],
  },
  // -------------------------------------------------------------- twohand
  {
    id: 'farcleaver',
    skill: 'twohand',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Farcleaver',
    desc: 'The edge arrives before the argument. Greatweapon reach grows.',
    color: '#c47a3d',
    effects: [{ kind: 'perk', perk: 'greatReach', magnitude: 0.35 }],
  },
  {
    id: 'executioner',
    skill: 'twohand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Executioner',
    desc: 'The nearly-felled are already spoken for. Greatblows bite deeper into them.',
    color: '#8a5a4a',
    effects: [{ kind: 'perk', perk: 'greatExecute', magnitude: 0.3 }],
  },
  // -------------------------------------------------------------- polearm
  {
    id: 'longarm',
    skill: 'polearm',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Longarm',
    desc: 'The point ends the argument a pace sooner. Polearm reach grows.',
    color: '#9a8560',
    effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.35 }],
  },
  {
    id: 'impaler',
    skill: 'polearm',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Impaler',
    desc: 'Both hands answer as one. The war grip drives the point deeper.',
    color: '#7a5a48',
    effects: [{ kind: 'perk', perk: 'warGripBonus', magnitude: 0.1 }],
  },
  // ----------------------------------------------------------- dualwield
  {
    id: 'ambidexter',
    skill: 'dualwield',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Ambidexter',
    desc: 'The off hand stops waiting its turn. The echo lands tighter.',
    color: '#b8a88a',
    effects: [{ kind: 'perk', perk: 'offhandDelayTicks', magnitude: 3 }],
  },
  {
    id: 'twin_tempo',
    skill: 'dualwield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Twin Tempo',
    desc: 'Two hands, one intention. The echo strikes harder.',
    color: '#a8927a',
    effects: [{ kind: 'perk', perk: 'offhandFactorBonus', magnitude: 0.05 }],
  },
  // -------------------------------------------------------------- shield
  {
    id: 'shieldarm',
    skill: 'shield',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Shieldarm',
    desc: 'The arm and the wall stop being two things. Armor while a shield is raised.',
    color: '#8ea4b8',
    effects: [{ kind: 'perk', perk: 'shieldArm', magnitude: 3 }],
  },
  {
    id: 'ironback',
    skill: 'shield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironback',
    desc: 'The wall bites back. Blows that land on the boss cost the striker.',
    color: '#6a7484',
    effects: [{ kind: 'perk', perk: 'shieldThorns', magnitude: 4 }],
  },
  // -------------------------------------------------------------- mining
  {
    id: 'prospector',
    skill: 'mining',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Prospector',
    desc: 'You read the seam before you swing. Ore sometimes comes double.',
    color: '#8a8474',
    effects: [{ kind: 'doubleGather', skill: 'mining', chance: 0.1 }],
  },
  {
    id: 'deep_lungs',
    skill: 'mining',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Deep Lungs',
    desc: 'The dark is your workshop. You mine faster underground.',
    color: '#5a5464',
    effects: [{ kind: 'perk', perk: 'undergroundGatherMult', magnitude: 1.15 }],
  },
  // --------------------------------------------------------- woodcutting
  {
    id: 'timber_sense',
    skill: 'woodcutting',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Timber Sense',
    desc: 'You know where the grain wants to split. Logs sometimes come double.',
    color: '#6b4a26',
    effects: [{ kind: 'doubleGather', skill: 'woodcutting', chance: 0.1 }],
  },
  {
    id: 'heartwood_eye',
    skill: 'woodcutting',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Heartwood Eye',
    desc: 'Every tree tells you where to stand. You fell them faster.',
    color: '#7d5a36',
    effects: [{ kind: 'gatherSpeed', skill: 'woodcutting', mult: 1.12 }],
  },
  // ------------------------------------------------------------- fishing
  {
    id: 'patient_line',
    skill: 'fishing',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Patient Line',
    desc: 'The water rewards the unhurried. Catches sometimes come double.',
    color: '#6aa0c8',
    effects: [{ kind: 'doubleGather', skill: 'fishing', chance: 0.12 }],
  },
  {
    id: 'night_angler',
    skill: 'fishing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Night Angler',
    desc: 'The best water is the dark water. You fish faster after dusk.',
    color: '#3a5a78',
    effects: [{ kind: 'perk', perk: 'nightGatherMult', magnitude: 1.2 }],
  },
  // ------------------------------------------------------------ foraging
  {
    id: 'gleaner',
    skill: 'foraging',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Gleaner',
    desc: 'Nothing worth taking escapes you. Pickings sometimes come double.',
    color: '#7ac46a',
    effects: [{ kind: 'doubleGather', skill: 'foraging', chance: 0.1 }],
  },
  {
    id: 'verdant_eye',
    skill: 'foraging',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Verdant Eye',
    desc: 'The green sorts itself for you. You gather faster.',
    color: '#4a8a3a',
    effects: [{ kind: 'gatherSpeed', skill: 'foraging', mult: 1.12 }],
  },
  // ------------------------------------------------------------- farming
  {
    id: 'the_composter',
    skill: 'farming',
    unlockLevel: 35,
    focusCost: 1,
    name: 'The Composter',
    desc: 'Your heaps close early. Rot respects experience.',
    color: '#6e5433',
    effects: [{ kind: 'perk', perk: 'compostDiscount', magnitude: 2 }],
  },
  {
    id: 'marketeer',
    skill: 'farming',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Marketeer',
    desc: 'The larder boards know your name. Orders pay a tenth more to you.',
    color: '#e8c04c',
    effects: [{ kind: 'perk', perk: 'larderSellMult', magnitude: 1.1 }],
  },
  {
    id: 'shepherds_eye',
    skill: 'beastcraft',
    unlockLevel: 35,
    focusCost: 1,
    name: "Shepherd's Eye",
    desc: 'You see what each animal needs sooner. The brush window opens faster.',
    color: '#96703f',
    effects: [{ kind: 'perk', perk: 'brushRestMult', magnitude: 0.75 }],
  },
  {
    id: 'green_thumb',
    skill: 'farming',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Green Thumb',
    desc: 'Some harvests hand you next season for free. Seeds sometimes return.',
    color: '#8ac46a',
    effects: [{ kind: 'perk', perk: 'seedRefundChance', magnitude: 0.1 }],
  },
  {
    id: 'bounty',
    skill: 'farming',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Bounty',
    desc: 'The field answers the practiced hand. Harvests sometimes come double.',
    color: '#a8b84a',
    effects: [{ kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.1 }],
  },
  // ------------------------------------------------------------- cooking
  {
    id: 'seasoned_palate',
    skill: 'cooking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Seasoned Palate',
    desc: 'You smell the turn before it comes. Far fewer meals burn.',
    color: '#d9825a',
    effects: [{ kind: 'perk', perk: 'burnChanceMult', magnitude: 0.7 }],
  },
  {
    id: 'field_kitchen',
    skill: 'cooking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Field Kitchen',
    desc: 'Your cooking keeps working after the plate is clean. Food buffs last longer.',
    color: '#b86a3a',
    effects: [{ kind: 'perk', perk: 'foodBuffDurMult', magnitude: 1.25 }],
  },
  // ------------------------------------------------------------ smithing
  {
    id: 'sparing_hammer',
    skill: 'smithing',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Sparing Hammer',
    desc: 'No blow wasted, no bar spent twice. Materials are sometimes saved.',
    color: '#8a94a4',
    effects: [{ kind: 'materialSave', skill: 'smithing', chance: 0.08 }],
  },
  {
    id: 'forgeheat',
    skill: 'smithing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Forgeheat',
    desc: 'The metal answers you like an old friend. Smith as three levels wiser.',
    color: '#c46a3a',
    effects: [{ kind: 'gear', effect: { kind: 'skill', skill: 'smithing', amount: 3 } }],
  },
  // --------------------------------------------------------- woodworking
  {
    id: 'clean_grain',
    skill: 'woodworking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Clean Grain',
    desc: 'The wood offers its spare. Materials are sometimes saved.',
    color: '#a4744b',
    effects: [{ kind: 'materialSave', skill: 'woodworking', chance: 0.08 }],
  },
  {
    id: 'master_grain',
    skill: 'woodworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Master Grain',
    desc: 'Your hands know the next cut before you do. You work wood faster.',
    color: '#7d5a36',
    effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.85 }],
  },
  // ------------------------------------------------------ leatherworking
  {
    id: 'whetstone_habit',
    skill: 'leatherworking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Whetstone Habit',
    desc: 'A worker of edges keeps their own keen. Strikes crit more often.',
    color: '#9a6a45',
    effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 2 } }],
  },
  {
    id: 'supple_fit',
    skill: 'leatherworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Supple Fit',
    desc: 'Leather you understand never binds. Each worn piece quickens you.',
    color: '#b8865a',
    effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.5 }],
  },
  // ----------------------------------------------------------- tailoring
  {
    id: 'fine_seams',
    skill: 'tailoring',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Fine Seams',
    desc: 'Nothing frays under your needle. Materials are sometimes saved.',
    color: '#c8a8d8',
    effects: [{ kind: 'materialSave', skill: 'tailoring', chance: 0.08 }],
  },
  {
    id: 'quilted_lining',
    skill: 'tailoring',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Quilted Lining',
    desc: 'Your cloth carries hidden padding. Each worn piece toughens you.',
    color: '#a888c8',
    effects: [{ kind: 'perPiece', armorClass: 'cloth', maxHp: 2 }],
  },
  // -------------------------------------------------------- construction
  {
    id: 'salvager',
    skill: 'construction',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Salvager',
    desc: 'You build with the offcuts too. Materials are sometimes saved.',
    color: '#a49484',
    effects: [{ kind: 'materialSave', skill: 'construction', chance: 0.1 }],
  },
  {
    id: 'homesteader',
    skill: 'construction',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Homesteader',
    desc: 'Walls rise quickly for the hand that has raised a hundred. You build faster.',
    color: '#8a7a64',
    effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.85 }],
  },
  // ----------------------------------------------------------- herbalism
  {
    id: 'bitter_blood',
    skill: 'herbalism',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Bitter Blood',
    desc: 'Years of tasting your own brews. Poison and burning grip you weakly.',
    color: '#a0c050',
    effects: [{ kind: 'perk', perk: 'dotResistMult', magnitude: 0.7 }],
  },
  {
    id: 'long_brew',
    skill: 'herbalism',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Long Brew',
    desc: 'Your tonics are steeped, not stirred. They last longer in the blood.',
    color: '#6a9a4a',
    effects: [{ kind: 'perk', perk: 'tonicBuffDurMult', magnitude: 1.25 }],
  },
  // ---------------------------------------------------------- enchanting
  {
    id: 'dust_thrift',
    skill: 'enchanting',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Dust Thrift',
    desc: 'Not a mote wasted. Reagents are sometimes saved.',
    color: '#b49af0',
    effects: [{ kind: 'materialSave', skill: 'enchanting', chance: 0.15 }],
  },
  {
    id: 'deep_sigils',
    skill: 'enchanting',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Deep Sigils',
    // THE ENCHANTER'S HAND: this Calling always SAID its workings sat
    // deeper in the steel and then quietly handed out a cooldown, which
    // is a personal buff and not a fact about the craft at all. Quality
    // is what "deeper" actually means now, so the text is finally true
    // and the trade's own Calling is about the trade.
    desc: 'Your workings settle deeper into the steel. Every inscription you make runs truer.',
    color: '#8a6ac8',
    effects: [{ kind: 'perk', perk: 'inscribeQuality', magnitude: 5 }],
  },
  // ---------------------------------------------------------- beastcraft
  {
    id: 'gentle_hand',
    skill: 'beastcraft',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Gentle Hand',
    desc: 'The animals give more to the hand they trust. Produce sometimes doubles.',
    color: '#c4a35a',
    effects: [{ kind: 'perk', perk: 'doubleProduceChance', magnitude: 0.1 }],
  },
  {
    id: 'drovers_bond',
    skill: 'beastcraft',
    unlockLevel: 60,
    focusCost: 2,
    name: "Drover's Bond",
    desc: 'Beasts kept by a true drover recover their gifts sooner.',
    color: '#a48a4a',
    effects: [{ kind: 'perk', perk: 'produceRestMult', magnitude: 0.85 }],
  },
];

export const CALLINGS: ReadonlyMap<string, CallingDef> = new Map(defs.map((d) => [d.id, d]));

export function callingDef(id: string): CallingDef | undefined {
  return CALLINGS.get(id);
}

export function callingsFor(skill: string): CallingDef[] {
  return defs.filter((d) => d.skill === skill);
}

/** Guard used by tests and the server fold: no strike kinds in gear effects. */
export function isAggregateCallingEffect(fx: CallingEffect): boolean {
  return fx.kind !== 'gear' || !STRIKE_EFFECT_KINDS.includes(fx.effect.kind);
}
