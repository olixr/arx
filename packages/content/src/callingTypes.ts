/**
 * THE ANSWERED LIFE's vocabulary — the types every ladder file in
 * ./callings/ authors against. Split from the book (callings.ts) for
 * THE FILLED HALL so twenty-five ladders can be written side by side
 * without a shared file between them; the book re-exports everything
 * here, so `import from './callings.js'` keeps working everywhere.
 */
import type { SkillId, StatusId } from '@arx/shared';
import type { ArmorClass } from './equipment/types.js';
import type { CombatStyle } from './items.js';
import type { EnchantEffect, ProcEffect } from './equipment/enchants.js';

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
  | { when: 'wellFed' } //                a food-channel buff is live
  // THE FILLED HALL widened the clause (content epoch, platform prep):
  | { when: 'day' } //                    sunrise to dusk (night's mirror)
  | { when: 'sneaking' } //               the wearer is hidden (sneak)
  | { when: 'mounted' } //                in the saddle
  | { when: 'wielding'; style: CombatStyle } // a weapon of this style is in hand
  | { when: 'dualWielding' } //           a weapon in each hand
  | { when: 'petOut' } //                 a companion walks beside you
  | { when: 'inCombat' } //               struck or striking within 8s
  | { when: 'outOfCombat' } //            8s past the last blow
  | { when: 'outnumbered'; count: number }; // this many hostiles within 4 tiles

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
  /** THE SLIPPED BLOW: percentage points of chance a blow misses (additive, capped at the roll). */
  evadePct?: number;
  quiet?: boolean;
}

export type CallingEffect =
  | { kind: 'gear'; effect: EnchantEffect }
  | { kind: 'perPiece'; armorClass: ArmorClass; speedPct?: number; maxHp?: number; armor?: number }
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

/**
 * THE REGISTER's calling column, one row per (calling, page, verb):
 * a package that LAYS a page (`lay:status`, `lay:boon`) or READS one
 * (`read:stateApplied`, `read:hitState`, `read:stateRiding`,
 * `read:vsState`) declares the pairing in its
 * ladder file's LICENSES list. The register test refuses any touch
 * without its row — the status book's law extended to the character
 * axis.
 */
export interface CallingLicense {
  calling: string;
  status: StatusId;
  via: 'lay:status' | 'lay:boon' | 'read:stateApplied' | 'read:hitState' | 'read:stateRiding' | 'read:vsState';
}
