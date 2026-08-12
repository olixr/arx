/**
 * THE CALLING LAW — chosen, toggleable skill passives.
 *
 * Every skill carries two Callings: one at level 20 (the skill stops
 * being a dabble) and one at 60 (the skill becomes a calling). They
 * unlock by BASE level, and answering one is a free toggle any time —
 * the constraint is never friction, it is THE FOCUS LAW's budget
 * (shared/skills.ts): answered focusCost must fit the milestone-grown
 * Focus. Worn-gear passives remain the gear axis; Callings are the
 * character axis. Both feed the same server hook sites.
 *
 * Effects come in six shapes, each with ONE resolution law:
 *  - gear:        an EnchantEffect aggregate folded into GearStats by
 *                 the same foldEffect law enchants use (recomputeGear).
 *  - perPiece:    an aggregate scaled by worn armor-class piece count,
 *                 applied after the gear fold reads classCounts.
 *  - perk:        a named dial read at exactly one server hook site —
 *                 the PERK_DIALS registry below documents each site.
 *  - doubleGather / materialSave / craftSpeed: trade dials keyed by
 *                 skill, read at the gather/craft sites.
 *
 * Never fold a strike-kind enchant effect into a Calling (the
 * aggregate/strike split is test-locked in equipment.test.ts).
 */
import type { SkillId } from '@arx/shared';
import type { ArmorClass } from './equipment/types.js';
import { STRIKE_EFFECT_KINDS, type EnchantEffect } from './equipment/enchants.js';

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
  | 'marchArmor' //          damagePlayer mitigate: +armor while moving
  | 'warSchooling' //        effectiveLevel: +levels to the four weapon schools
  | 'inscribeQuality' //    tickCraft: +quality points on every inscription
  // THE GREEN ARTS wave (farming v2 Phase 6): three more one-site dials.
  | 'compostDiscount' //     compostAdd: batch closes this many worth sooner
  | 'brushRestMult' //       interactLivestock: brush window cooldown × mult
  | 'larderSellMult'; //     larderPay: premium price × mult

export type CallingEffect =
  | { kind: 'gear'; effect: EnchantEffect }
  | { kind: 'perPiece'; armorClass: ArmorClass; speedPct?: number; maxHp?: number }
  | { kind: 'perk'; perk: PerkId; magnitude: number }
  | { kind: 'doubleGather'; skill: SkillId; chance: number }
  | { kind: 'gatherSpeed'; skill: SkillId; mult: number }
  | { kind: 'materialSave'; skill: SkillId; chance: number }
  | { kind: 'craftSpeed'; skill: SkillId; mult: number };

export interface CallingDef {
  id: string;
  skill: SkillId;
  /** BASE-level unlock — 20 (journeyman) or 60 (the calling proper). */
  unlockLevel: number;
  /** Focus this Calling holds while answered (1 minor, 2 major). */
  focusCost: number;
  name: string;
  /** One line for the codex — what answering it means. */
  desc: string;
  color: string;
  effect: CallingEffect;
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
    effect: { kind: 'perk', perk: 'foodHealMult', magnitude: 1.25 },
  },
  {
    id: 'ironblood',
    skill: 'vitality',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironblood',
    desc: 'Your wounds close on their own schedule. Steady regeneration.',
    color: '#c4372a',
    effect: { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
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
    effect: { kind: 'perk', perk: 'marchArmor', magnitude: 4 },
  },
  {
    id: 'old_campaigner',
    skill: 'combat',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Old Campaigner',
    desc: 'Every road taught you something. All four weapon schools fight two levels higher.',
    color: '#8f7a4a',
    effect: { kind: 'perk', perk: 'warSchooling', magnitude: 2 },
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
    effect: { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.1 },
  },
  {
    id: 'warpath',
    skill: 'onehand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Warpath',
    desc: 'Every kill feeds the next. Abilities recover on each fallen foe.',
    color: '#b8433a',
    effect: { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 10 } },
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
    effect: { kind: 'perk', perk: 'stillArmor', magnitude: 6 },
  },
  {
    id: 'stonewall',
    skill: 'defence',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Stonewall',
    desc: 'Every shield you raise is a quarter thicker.',
    color: '#6a7484',
    effect: { kind: 'perk', perk: 'shieldMult', magnitude: 1.25 },
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
    effect: { kind: 'perk', perk: 'snapShotMult', magnitude: 1.15 },
  },
  {
    id: 'longstride',
    skill: 'archery',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Longstride',
    desc: 'The full draw no longer roots you. Walk your aim.',
    color: '#6b8a5a',
    effect: { kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.7 },
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
    effect: { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
  },
  {
    id: 'attuned',
    skill: 'arx',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Attuned',
    desc: 'The current runs closer to the skin. Arx strikes harder.',
    color: '#8a6ac8',
    effect: { kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 6 } },
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
    effect: { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.05 },
  },
  {
    id: 'opportunist',
    skill: 'sneak',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Opportunist',
    desc: 'A turned back is a signed invitation. Backstabs cut deeper.',
    color: '#5a4a6a',
    effect: { kind: 'perk', perk: 'backstabBonus', magnitude: 0.25 },
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
    effect: { kind: 'perk', perk: 'greatReach', magnitude: 0.35 },
  },
  {
    id: 'executioner',
    skill: 'twohand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Executioner',
    desc: 'The nearly-felled are already spoken for. Greatblows bite deeper into them.',
    color: '#8a5a4a',
    effect: { kind: 'perk', perk: 'greatExecute', magnitude: 0.3 },
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
    effect: { kind: 'perk', perk: 'offhandDelayTicks', magnitude: 3 },
  },
  {
    id: 'twin_tempo',
    skill: 'dualwield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Twin Tempo',
    desc: 'Two hands, one intention. The echo strikes harder.',
    color: '#a8927a',
    effect: { kind: 'perk', perk: 'offhandFactorBonus', magnitude: 0.05 },
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
    effect: { kind: 'perk', perk: 'shieldArm', magnitude: 3 },
  },
  {
    id: 'ironback',
    skill: 'shield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironback',
    desc: 'The wall bites back. Blows that land on the boss cost the striker.',
    color: '#6a7484',
    effect: { kind: 'perk', perk: 'shieldThorns', magnitude: 4 },
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
    effect: { kind: 'doubleGather', skill: 'mining', chance: 0.1 },
  },
  {
    id: 'deep_lungs',
    skill: 'mining',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Deep Lungs',
    desc: 'The dark is your workshop. You mine faster underground.',
    color: '#5a5464',
    effect: { kind: 'perk', perk: 'undergroundGatherMult', magnitude: 1.15 },
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
    effect: { kind: 'doubleGather', skill: 'woodcutting', chance: 0.1 },
  },
  {
    id: 'heartwood_eye',
    skill: 'woodcutting',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Heartwood Eye',
    desc: 'Every tree tells you where to stand. You fell them faster.',
    color: '#7d5a36',
    effect: { kind: 'gatherSpeed', skill: 'woodcutting', mult: 1.12 },
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
    effect: { kind: 'doubleGather', skill: 'fishing', chance: 0.12 },
  },
  {
    id: 'night_angler',
    skill: 'fishing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Night Angler',
    desc: 'The best water is the dark water. You fish faster after dusk.',
    color: '#3a5a78',
    effect: { kind: 'perk', perk: 'nightGatherMult', magnitude: 1.2 },
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
    effect: { kind: 'doubleGather', skill: 'foraging', chance: 0.1 },
  },
  {
    id: 'verdant_eye',
    skill: 'foraging',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Verdant Eye',
    desc: 'The green sorts itself for you. You gather faster.',
    color: '#4a8a3a',
    effect: { kind: 'gatherSpeed', skill: 'foraging', mult: 1.12 },
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
    effect: { kind: 'perk', perk: 'compostDiscount', magnitude: 2 },
  },
  {
    id: 'marketeer',
    skill: 'farming',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Marketeer',
    desc: 'The larder boards know your name. Orders pay a tenth more to you.',
    color: '#e8c04c',
    effect: { kind: 'perk', perk: 'larderSellMult', magnitude: 1.1 },
  },
  {
    id: 'shepherds_eye',
    skill: 'beastcraft',
    unlockLevel: 35,
    focusCost: 1,
    name: "Shepherd's Eye",
    desc: 'You see what each animal needs sooner. The brush window opens faster.',
    color: '#96703f',
    effect: { kind: 'perk', perk: 'brushRestMult', magnitude: 0.75 },
  },
  {
    id: 'green_thumb',
    skill: 'farming',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Green Thumb',
    desc: 'Some harvests hand you next season for free. Seeds sometimes return.',
    color: '#8ac46a',
    effect: { kind: 'perk', perk: 'seedRefundChance', magnitude: 0.1 },
  },
  {
    id: 'bounty',
    skill: 'farming',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Bounty',
    desc: 'The field answers the practiced hand. Harvests sometimes come double.',
    color: '#a8b84a',
    effect: { kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.1 },
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
    effect: { kind: 'perk', perk: 'burnChanceMult', magnitude: 0.7 },
  },
  {
    id: 'field_kitchen',
    skill: 'cooking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Field Kitchen',
    desc: 'Your cooking keeps working after the plate is clean. Food buffs last longer.',
    color: '#b86a3a',
    effect: { kind: 'perk', perk: 'foodBuffDurMult', magnitude: 1.25 },
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
    effect: { kind: 'materialSave', skill: 'smithing', chance: 0.08 },
  },
  {
    id: 'forgeheat',
    skill: 'smithing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Forgeheat',
    desc: 'The metal answers you like an old friend. Smith as three levels wiser.',
    color: '#c46a3a',
    effect: { kind: 'gear', effect: { kind: 'skill', skill: 'smithing', amount: 3 } },
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
    effect: { kind: 'materialSave', skill: 'woodworking', chance: 0.08 },
  },
  {
    id: 'master_grain',
    skill: 'woodworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Master Grain',
    desc: 'Your hands know the next cut before you do. You work wood faster.',
    color: '#7d5a36',
    effect: { kind: 'craftSpeed', skill: 'woodworking', mult: 0.85 },
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
    effect: { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
  },
  {
    id: 'supple_fit',
    skill: 'leatherworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Supple Fit',
    desc: 'Leather you understand never binds. Each worn piece quickens you.',
    color: '#b8865a',
    effect: { kind: 'perPiece', armorClass: 'leather', speedPct: 0.5 },
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
    effect: { kind: 'materialSave', skill: 'tailoring', chance: 0.08 },
  },
  {
    id: 'quilted_lining',
    skill: 'tailoring',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Quilted Lining',
    desc: 'Your cloth carries hidden padding. Each worn piece toughens you.',
    color: '#a888c8',
    effect: { kind: 'perPiece', armorClass: 'cloth', maxHp: 2 },
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
    effect: { kind: 'materialSave', skill: 'construction', chance: 0.1 },
  },
  {
    id: 'homesteader',
    skill: 'construction',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Homesteader',
    desc: 'Walls rise quickly for the hand that has raised a hundred. You build faster.',
    color: '#8a7a64',
    effect: { kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.85 },
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
    effect: { kind: 'perk', perk: 'dotResistMult', magnitude: 0.7 },
  },
  {
    id: 'long_brew',
    skill: 'herbalism',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Long Brew',
    desc: 'Your tonics are steeped, not stirred. They last longer in the blood.',
    color: '#6a9a4a',
    effect: { kind: 'perk', perk: 'tonicBuffDurMult', magnitude: 1.25 },
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
    effect: { kind: 'materialSave', skill: 'enchanting', chance: 0.15 },
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
    effect: { kind: 'perk', perk: 'inscribeQuality', magnitude: 5 },
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
    effect: { kind: 'perk', perk: 'doubleProduceChance', magnitude: 0.1 },
  },
  {
    id: 'drovers_bond',
    skill: 'beastcraft',
    unlockLevel: 60,
    focusCost: 2,
    name: "Drover's Bond",
    desc: 'Beasts kept by a true drover recover their gifts sooner.',
    color: '#a48a4a',
    effect: { kind: 'perk', perk: 'produceRestMult', magnitude: 0.85 },
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
