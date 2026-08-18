/**
 * THE FANG FINDS ITS VOICE (docs/pet-arts-plan.md) — the companion's
 * own repertoire. Every tamable species holds a five-to-six-art shelf:
 * family pool first, exclusives after, EXACTLY one 3-focus signature.
 * Variant pairs share their pool and never their exclusives — the
 * lesser variant keeps exclusivity too (the user's law) — and the
 * validator below makes every clause structural, so a roster row
 * cannot drift past the design without a test going red.
 *
 * THE OLD LAW, AMENDED ALOUD: a companion's SLOTTED arts ride the one
 * cast rail (actives are AbilityDefs fired by the pet's own brain,
 * fromPet polarity, every damage point through damageNpc viaPet); its
 * UNSLOTTED nature stays free on the bite. A wolf that slots nothing
 * is exactly yesterday's wolf.
 *
 * Pacing lives HERE (cooldown, windup, range bands) — the kit law
 * verbatim; the AbilityDefs these actives ride all ship
 * cooldownTicks 0. Passives never tick: stat passives fold at
 * petStatBlock, behavioral passives read at their single server sites.
 */

import type { StatusApply } from '@arx/shared';
import { ABILITIES } from './abilities.js';
import { NPCS } from './npcs.js';
import { TAMES } from './tames.js';

/**
 * A passive's whole vocabulary. Every field is additive and optional;
 * every field has exactly ONE server site that reads it (Phase 2
 * names them). A field nobody reads is a defect, and the pin test
 * counts them.
 */
export interface PetPassive {
  /** Folded at petStatBlock beside the kit's shell. */
  armor?: number;
  maxHpMult?: number;
  dmgMult?: number;
  /** Stride multiplier, follow and fight both (under the sprint cap). */
  strideMult?: number;
  /** Night alone: the stride quickens when the sun is down. */
  nightStrideMult?: number;
  /** The species bite's status power, deepened by this much. */
  biteStatusPower?: number;
  /** Fraction of the pet's own DoT tick damage returned as its hp. */
  statusLeech?: number;
  /** Out-of-combat regen multiplier. */
  regenMult?: number;
  /** The downed clock runs at this fraction of its length. */
  downedTicksMult?: number;
  /** The opening blow against it each fight whiffs, deterministically. */
  firstBlowShrug?: boolean;
  /** The first status laid on it each fight is shrugged. */
  firstStatusShrug?: boolean;
  /** Knockback never moves it. */
  knockbackImmune?: boolean;
  /** Marks it fights never cry for help — the quiet fang. */
  quietFang?: boolean;
  /** Below the fraction, the hide hardens. */
  woundedArmor?: { belowFrac: number; armor: number };
  /** Unstruck this long, the shell burnishes to proof. */
  unhurtArmor?: { afterTicks: number; armor: number };
  /** Statuses laid on it run at this fraction of their length. */
  statusDurMult?: number;
  /** Once a fight, it refuses its downing blow at 1 hp. */
  deathDefy?: boolean;
  /** Bond-moment meals mend this much deeper. */
  bondHealMult?: number;
  /** Its pounce or open reaches this much further. */
  openerRange?: number;
  /** Its first landed blow from an unhurt stand carries this weight. */
  firstStrikeMult?: number;
  /** Its opening blow lays this on the mark. */
  openerStatus?: StatusApply;
  /** Its blows lean on marks wearing this status. */
  vsStatus?: { status: StatusApply['status']; mult: number };
  /** Every third kill it lands shakes loose a forage scrap. */
  killsForage?: boolean;
  /** While the keeper stands close, the vigil holds. */
  nearKeeper?: { within: number; armor: number; regenMult?: number };
}

export interface PetArtDef {
  /** Art id; for actives this IS the AbilityDef id (one name, one face). */
  id: string;
  /** Spoken name — for actives, pinned equal to the AbilityDef's. */
  name: string;
  kind: 'active' | 'passive';
  /** The price at the collar: 1 minor, 2 solid, 3 the signature. */
  focus: 1 | 2 | 3;
  /** Actives: the AbilityDef this art fires (equal to id, pinned). */
  ability?: string;
  /** Actives: pacing lives HERE, never on the ability (the kit law). */
  cooldownTicks?: number;
  /** Actives: the drawn breath; anything above the basic wears >= 10. */
  windupTicks?: number;
  /** Actives: eligibility band vs the pet's current mark. */
  minRange?: number;
  maxRange?: number;
  /** Actives: fires only while the pet is worn below this fraction. */
  hpBelow?: number;
  /** Passives: the whole effect (see PetPassive). */
  passive?: PetPassive;
  /** One concrete sentence in the world's diction (VOICE.md: no dashes). */
  tale: string;
}

export const PET_ART_DEFS: readonly PetArtDef[] = [
  // ------------------------------------------------ THE SKITTERKIN
  {
    id: 'nip_and_dart',
    name: 'Nip and Dart',
    kind: 'active',
    focus: 1,
    ability: 'nip_and_dart',
    cooldownTicks: 160,
    maxRange: 4,
    tale: 'In, one quick bite, and out before the answer comes.',
  },
  {
    id: 'gutter_quick',
    name: 'Gutter Quick',
    kind: 'passive',
    focus: 1,
    passive: { strideMult: 1.08 },
    tale: 'Small things live by arriving first and leaving early.',
  },
  {
    id: 'twitching_ear',
    name: 'Twitching Ear',
    kind: 'passive',
    focus: 1,
    passive: { firstStatusShrug: true },
    tale: 'The first trick played on it each fight simply does not take.',
  },
  {
    id: 'plague_gnaw',
    name: 'Plague Gnaw',
    kind: 'active',
    focus: 2,
    ability: 'plague_gnaw',
    cooldownTicks: 200,
    windupTicks: 10,
    maxRange: 2.5,
    tale: 'The rat sets its teeth and worries the wound until it goes green.',
  },
  {
    id: 'small_shadow',
    name: 'Small Shadow',
    kind: 'passive',
    focus: 2,
    passive: { firstBlowShrug: true },
    tale: 'The first swing at a rat is always at where the rat was.',
  },
  {
    id: 'the_rats_hour',
    name: "The Rat's Hour",
    kind: 'active',
    focus: 3,
    ability: 'the_rats_hour',
    cooldownTicks: 500,
    windupTicks: 12,
    maxRange: 2.5,
    tale: 'Every gutter has one hour when the rat is king. This is it.',
  },
  {
    id: 'blood_drink',
    name: 'Blood Drink',
    kind: 'passive',
    focus: 2,
    passive: { statusLeech: 0.75 },
    tale: 'What its bite opens, its supper closes.',
  },
  {
    id: 'echo_shriek',
    name: 'Echo Shriek',
    kind: 'active',
    focus: 2,
    ability: 'echo_shriek',
    cooldownTicks: 200,
    windupTicks: 12,
    maxRange: 3,
    tale: 'A cry pitched where ears give up. The air itself flinches twice.',
  },
  {
    id: 'the_dark_descent',
    name: 'The Dark Descent',
    kind: 'active',
    focus: 3,
    ability: 'the_dark_descent',
    cooldownTicks: 400,
    windupTicks: 12,
    maxRange: 4.5,
    tale: 'The bat folds its wings and becomes a falling knife.',
  },

  // ------------------------------------------------ THE SHELLBACKS
  {
    id: 'set_the_shell',
    name: 'Set the Shell',
    kind: 'active',
    focus: 2,
    ability: 'set_the_shell',
    cooldownTicks: 500,
    windupTicks: 8,
    tale: 'It plants, tucks, and becomes ground. Ground does not bleed.',
  },
  {
    id: 'chitin_plate',
    name: 'Chitin Plate',
    kind: 'passive',
    focus: 1,
    passive: { armor: 2 },
    tale: 'Two more layers than the world expected. It grew them anyway.',
  },
  {
    id: 'clatter_challenge',
    name: 'Clatter Challenge',
    kind: 'active',
    focus: 2,
    ability: 'clatter_challenge',
    cooldownTicks: 400,
    windupTicks: 8,
    maxRange: 3.5,
    tale: 'Shell on shell, loud as a dropped kettle. Everything looks.',
  },
  {
    id: 'slow_and_certain',
    name: 'Slow and Certain',
    kind: 'passive',
    focus: 1,
    passive: { knockbackImmune: true },
    tale: 'You may as well shove the shore.',
  },
  {
    id: 'horn_toss',
    name: 'Horn Toss',
    kind: 'active',
    focus: 2,
    ability: 'horn_toss',
    cooldownTicks: 200,
    windupTicks: 10,
    maxRange: 2.5,
    tale: 'The beetle gets its horn under the problem and files it skyward.',
  },
  {
    id: 'the_burnished_wall',
    name: 'The Burnished Wall',
    kind: 'passive',
    focus: 3,
    passive: { unhurtArmor: { afterTicks: 100, armor: 6 } },
    tale: 'Left unstruck a few breaths, the shell burnishes to proof.',
  },
  {
    id: 'tide_grip',
    name: 'Tide Grip',
    kind: 'active',
    focus: 2,
    ability: 'tide_grip',
    cooldownTicks: 200,
    windupTicks: 10,
    maxRange: 2.5,
    tale: 'The claw closes like low tide: slow, cold, and certain.',
  },
  {
    id: 'the_undertow',
    name: 'The Undertow',
    kind: 'active',
    focus: 3,
    ability: 'the_undertow',
    cooldownTicks: 500,
    windupTicks: 14,
    maxRange: 3,
    tale: 'Three cold pulls in a row. Legs remember the sea and obey it.',
  },
  {
    id: 'patience_of_stone',
    name: 'Patience of Stone',
    kind: 'passive',
    focus: 2,
    passive: { regenMult: 2 },
    tale: 'It heals the way hills heal: entirely, and on its own schedule.',
  },
  {
    id: 'the_standing_stone',
    name: 'The Standing Stone',
    kind: 'active',
    focus: 3,
    ability: 'the_standing_stone',
    cooldownTicks: 600,
    windupTicks: 12,
    maxRange: 4,
    tale: 'The turtle stops being an animal and starts being geography.',
  },
  {
    id: 'riptide_claw',
    name: 'Riptide Claw',
    kind: 'active',
    focus: 2,
    ability: 'riptide_claw',
    cooldownTicks: 260,
    windupTicks: 12,
    maxRange: 2.5,
    tale: 'The great claw falls like a harbor gate. What it hits stays hit.',
  },
  {
    id: 'the_kings_pincer',
    name: "The King's Pincer",
    kind: 'active',
    focus: 3,
    ability: 'the_kings_pincer',
    cooldownTicks: 550,
    windupTicks: 14,
    maxRange: 2.5,
    tale: 'On a mark already cold, the claw closes the argument entirely.',
  },

  // -------------------------------------------------- THE TUSKERS
  {
    id: 'gore_charge',
    name: 'Gore Charge',
    kind: 'active',
    focus: 2,
    ability: 'gore_charge',
    cooldownTicks: 240,
    windupTicks: 10,
    minRange: 1.2,
    maxRange: 4.5,
    tale: 'Head down, tusks first, apologies never.',
  },
  {
    id: 'bristleback',
    name: 'Bristleback',
    kind: 'passive',
    focus: 1,
    passive: { woundedArmor: { belowFrac: 0.5, armor: 3 } },
    tale: 'Hurt it and the bristles come up. They do not come up for show.',
  },
  {
    id: 'tusk_sweep',
    name: 'Tusk Sweep',
    kind: 'active',
    focus: 1,
    ability: 'tusk_sweep',
    cooldownTicks: 140,
    windupTicks: 6,
    maxRange: 2.5,
    tale: 'A short, mean crescent at shin height.',
  },
  {
    id: 'rooting_snout',
    name: 'Rooting Snout',
    kind: 'passive',
    focus: 2,
    passive: { killsForage: true },
    tale: 'It noses every fallen thing, and every third one owes it supper.',
  },
  {
    id: 'mud_wallow',
    name: 'Mud Wallow',
    kind: 'active',
    focus: 2,
    ability: 'mud_wallow',
    cooldownTicks: 500,
    windupTicks: 10,
    hpBelow: 0.6,
    tale: 'It drops, rolls, and stands up newer. Mud fixes what mud knows.',
  },
  {
    id: 'the_stubborn_heart',
    name: 'The Stubborn Heart',
    kind: 'passive',
    focus: 3,
    passive: { deathDefy: true },
    tale: 'Once a fight, the boar simply declines to fall. Ask it later.',
  },
  {
    id: 'iron_hide',
    name: 'Iron Hide',
    kind: 'passive',
    focus: 2,
    passive: { armor: 3 },
    tale: 'Spears have opinions about the old razorback. The hide keeps none.',
  },
  {
    id: 'old_scars',
    name: 'Old Scars',
    kind: 'passive',
    focus: 2,
    passive: { statusDurMult: 0.5 },
    tale: 'Poison, cold, fire. It has met them all before, and briefly.',
  },
  {
    id: 'the_long_furrow',
    name: 'The Long Furrow',
    kind: 'active',
    focus: 3,
    ability: 'the_long_furrow',
    cooldownTicks: 550,
    windupTicks: 14,
    minRange: 1.5,
    maxRange: 5,
    tale: 'The old razorback leaps, lands, and plows the field with everyone in it.',
  },

  // --------------------------------------------------- THE CANIDS
  {
    id: 'worry_the_wound',
    name: 'Worry the Wound',
    kind: 'active',
    focus: 2,
    ability: 'worry_the_wound',
    cooldownTicks: 200,
    windupTicks: 8,
    maxRange: 2.5,
    tale: 'The pack rule: never open a second door while the first still bleeds.',
  },
  {
    id: 'pack_step',
    name: 'Pack Step',
    kind: 'passive',
    focus: 1,
    passive: { strideMult: 1.08 },
    tale: 'It holds your pace the way the pack held its. You are the pack now.',
  },
  {
    id: 'blooded_run',
    name: 'Blooded Run',
    kind: 'passive',
    focus: 1,
    passive: { vsStatus: { status: 'bleed', mult: 1.25 } },
    tale: 'A bleeding mark makes the whole wolf faster in the ways that count.',
  },
  {
    id: 'hamstring',
    name: 'Hamstring',
    kind: 'active',
    focus: 2,
    ability: 'hamstring',
    cooldownTicks: 220,
    windupTicks: 8,
    maxRange: 2.5,
    tale: 'One bite, placed where running lives.',
  },
  {
    id: 'lone_vigil',
    name: 'Lone Vigil',
    kind: 'passive',
    focus: 2,
    passive: { nearKeeper: { within: 3, armor: 2, regenMult: 2 } },
    tale: 'Close to your side it fights like a door that will not open.',
  },
  {
    id: 'the_first_howl',
    name: 'The First Howl',
    kind: 'active',
    focus: 3,
    ability: 'the_first_howl',
    cooldownTicks: 600,
    windupTicks: 10,
    tale: 'The young howl the dire wolves taught. Its own blood answers.',
  },
  {
    id: 'winters_jaw',
    name: "Winter's Jaw",
    kind: 'active',
    focus: 2,
    ability: 'winters_jaw',
    cooldownTicks: 240,
    windupTicks: 10,
    maxRange: 2.5,
    tale: 'The worg bites the way the north bites: wide, and it keeps.',
  },
  {
    id: 'war_pelt',
    name: 'War Pelt',
    kind: 'passive',
    focus: 2,
    passive: { armor: 2 },
    tale: 'Bred for spear weather. The pelt remembers the trade.',
  },
  {
    id: 'the_cowing_snarl',
    name: 'The Cowing Snarl',
    kind: 'active',
    focus: 3,
    ability: 'the_cowing_snarl',
    cooldownTicks: 600,
    windupTicks: 12,
    maxRange: 3.5,
    tale: 'The war-hound remembers giving orders. Lesser wild hearts remember taking them.',
  },

  // ------------------------------------------------- THE RED SKULK
  // The fox is a WATCHER first: it sees everything, commits late, and
  // abandons early. Its shelf pays for exactly that body — two canid
  // family words for the pace and the bleed, then the skulk's own
  // three: the buried larder, the coat nothing holds, and the dive.
  {
    id: 'hedge_larder',
    name: 'Hedge Larder',
    kind: 'passive',
    focus: 2,
    passive: { killsForage: true },
    tale: 'It buries the third kill under the hedge root and remembers every one of them.',
  },
  {
    id: 'the_wary_one',
    name: 'The Wary One',
    kind: 'passive',
    focus: 2,
    passive: { statusDurMult: 0.6, downedTicksMult: 0.6 },
    tale: 'Nothing keeps its hold on a fox for long, and nothing keeps it down for long either.',
  },
  {
    id: 'the_hundred_nips',
    name: 'The Hundred Nips',
    kind: 'passive',
    focus: 2,
    passive: { biteStatusPower: 1, statusLeech: 0.35 },
    tale: 'Not one of its bites is worth the telling. The tally is what does the killing.',
  },
  {
    id: 'the_mousing_dive',
    name: 'The Mousing Dive',
    kind: 'active',
    focus: 3,
    ability: 'the_mousing_dive',
    cooldownTicks: 420,
    windupTicks: 12,
    minRange: 1.2,
    maxRange: 5,
    tale: 'It rises on its hind legs, folds, and comes down nose first.',
  },

  // ----------------------------------------------------- THE CATS
  {
    id: 'soft_paw',
    name: 'Soft Paw',
    kind: 'passive',
    focus: 1,
    passive: { quietFang: true },
    tale: 'What it fights never gets the breath to cry for its kin.',
  },
  {
    id: 'raking_flurry',
    name: 'Raking Flurry',
    kind: 'active',
    focus: 2,
    ability: 'raking_flurry',
    cooldownTicks: 200,
    windupTicks: 8,
    maxRange: 2.5,
    tale: 'Four paws, all of them opinions, all of them sharp.',
  },
  {
    id: 'sharpened_claws',
    name: 'Sharpened Claws',
    kind: 'passive',
    focus: 1,
    passive: { dmgMult: 1.06 },
    tale: 'It keeps them on the strop of every tree it passes.',
  },
  {
    id: 'playful_feint',
    name: 'Playful Feint',
    kind: 'passive',
    focus: 2,
    passive: { firstBlowShrug: true },
    tale: 'It thinks the fight is a game. The first swing agrees to miss.',
  },
  {
    id: 'the_pounce_perfected',
    name: 'The Pounce Perfected',
    kind: 'passive',
    focus: 3,
    passive: {
      openerRange: 1.2,
      openerStatus: { status: 'bleed', power: 2, durationTicks: 80 },
    },
    tale: 'Still growing into its paws, and the leap already outgrew the ledger.',
  },
  {
    id: 'tufted_patience',
    name: 'Tufted Patience',
    kind: 'passive',
    focus: 2,
    passive: { firstStrikeMult: 1.75 },
    tale: 'It waits the way snow waits. The first strike is the whole winter.',
  },
  {
    id: 'keen_tufts',
    name: 'Keen Tufts',
    kind: 'passive',
    focus: 1,
    passive: { openerRange: 0.6 },
    tale: 'The ears hear the mouse under the snow. The paws do the arithmetic.',
  },
  {
    id: 'the_winter_stalk',
    name: 'The Winter Stalk',
    kind: 'active',
    focus: 3,
    ability: 'the_winter_stalk',
    cooldownTicks: 500,
    windupTicks: 12,
    minRange: 1.2,
    maxRange: 4.5,
    tale: 'Three bounds, each landing colder than the last.',
  },

  // ----------------------------------------------------- THE BEAR
  {
    id: 'maul',
    name: 'Maul',
    kind: 'active',
    focus: 2,
    ability: 'maul',
    cooldownTicks: 260,
    windupTicks: 12,
    maxRange: 2.5,
    tale: 'The whole arm, the whole argument.',
  },
  {
    id: 'the_charge',
    name: 'The Charge',
    kind: 'active',
    focus: 2,
    ability: 'the_charge',
    cooldownTicks: 240,
    windupTicks: 10,
    minRange: 1.2,
    maxRange: 4.5,
    tale: 'A wall, arriving.',
  },
  {
    id: 'thick_fat',
    name: 'Thick Fat',
    kind: 'passive',
    focus: 1,
    passive: { maxHpMult: 1.12 },
    tale: 'Winter planned for. Spears filed under winter.',
  },
  {
    id: 'honeyed_temper',
    name: 'Honeyed Temper',
    kind: 'passive',
    focus: 1,
    passive: { bondHealMult: 2 },
    tale: 'Feed it and watch the hurt leave twice as fast. It keeps accounts.',
  },
  {
    id: 'winter_sleep',
    name: 'Winter Sleep',
    kind: 'passive',
    focus: 2,
    passive: { downedTicksMult: 0.5 },
    tale: 'Even felled, it is only wintering. Spring comes early to this one.',
  },
  {
    id: 'stand_tall',
    name: 'Stand Tall',
    kind: 'active',
    focus: 3,
    ability: 'stand_tall',
    cooldownTicks: 600,
    windupTicks: 14,
    maxRange: 4,
    tale: 'The bear stands to its whole height and the fight reconsiders its plans.',
  },

  // ------------------------------------------------ THE GREAT OWL
  {
    id: 'talon_stoop',
    name: 'Talon Stoop',
    kind: 'active',
    focus: 2,
    ability: 'talon_stoop',
    cooldownTicks: 220,
    windupTicks: 10,
    minRange: 1.2,
    maxRange: 5,
    tale: 'From the high line, silence with claws on the end of it.',
  },
  {
    id: 'hushing_wing',
    name: 'Hushing Wing',
    kind: 'active',
    focus: 2,
    ability: 'hushing_wing',
    cooldownTicks: 260,
    windupTicks: 10,
    maxRange: 3,
    tale: 'Two slow beats, and the air forgets how to be warm.',
  },
  {
    id: 'silent_feather',
    name: 'Silent Feather',
    kind: 'passive',
    focus: 1,
    passive: { quietFang: true },
    tale: 'The fringed wing spends no sound. Its quarrels stay private.',
  },
  {
    id: 'night_eyes',
    name: 'Night Eyes',
    kind: 'passive',
    focus: 1,
    passive: { nightStrideMult: 1.15, openerRange: 0.5 },
    tale: 'The dark is not dark to it. The dark is a well-lit larder.',
  },
  {
    id: 'preen',
    name: 'Preen',
    kind: 'active',
    focus: 2,
    ability: 'preen',
    cooldownTicks: 500,
    windupTicks: 12,
    hpBelow: 0.6,
    tale: 'Feather by feather, the owl puts itself back in order.',
  },
  {
    id: 'the_white_hush',
    name: 'The White Hush',
    kind: 'active',
    focus: 3,
    ability: 'the_white_hush',
    cooldownTicks: 600,
    windupTicks: 14,
    maxRange: 3.5,
    tale: 'The owl spreads both wings once, and winter files in under them.',
  },

  // ---------------------------------------------------- THE ADDER
  {
    id: 'venom_spit',
    name: 'Venom Spit',
    kind: 'active',
    focus: 2,
    ability: 'venom_spit',
    cooldownTicks: 200,
    windupTicks: 8,
    // THE PROVING'S DIAL (Phase 5, second cut): any minRange starves
    // this word — a melee-brained body hugs its mark, so edge distance
    // lives under every floor. The spit speaks point-blank (the bolt
    // still flies); maxRange 7 is its REACH, not its floor. A standoff
    // pet brain is the deferred road if the flavor ever wants more.
    maxRange: 7,
    tale: 'The adder spends its bite at a distance and lets the venom walk the rest.',
  },
  {
    id: 'coiled_strike',
    name: 'Coiled Strike',
    kind: 'active',
    focus: 2,
    ability: 'coiled_strike',
    cooldownTicks: 220,
    windupTicks: 10,
    minRange: 1.2,
    maxRange: 3.5,
    tale: 'The whole spring, spent in one straight line.',
  },
  {
    id: 'cold_blood',
    name: 'Cold Blood',
    kind: 'passive',
    focus: 1,
    passive: { statusDurMult: 0.5 },
    tale: 'A body already cold keeps no room for another argument.',
  },
  {
    id: 'shed_skin',
    name: 'Shed Skin',
    kind: 'active',
    focus: 2,
    ability: 'shed_skin',
    cooldownTicks: 500,
    windupTicks: 10,
    hpBelow: 0.6,
    tale: 'It leaves the hurt behind with the old skin and comes out patient.',
  },
  {
    id: 'deepening_dose',
    name: 'Deepening Dose',
    kind: 'passive',
    focus: 2,
    passive: { biteStatusPower: 1 },
    tale: 'The same fangs, a longer conversation.',
  },
  {
    id: 'the_long_fang',
    name: 'The Long Fang',
    kind: 'active',
    focus: 3,
    ability: 'the_long_fang',
    cooldownTicks: 500,
    windupTicks: 12,
    maxRange: 2.5,
    tale: 'On a mark already green, the second dose is the deep one.',
  },

  // --------------------------------------------------- THE WEAVER
  {
    id: 'web_snare',
    name: 'Web Snare',
    kind: 'active',
    focus: 2,
    ability: 'web_snare',
    cooldownTicks: 240,
    windupTicks: 10,
    maxRange: 6,
    tale: 'The wild art, at heel at last. Silk across the line of retreat.',
  },
  {
    id: 'skitter_high',
    name: 'Skitter High',
    kind: 'passive',
    focus: 1,
    passive: { strideMult: 1.1 },
    tale: 'Eight legs, and not one of them ever waits for another.',
  },
  {
    id: 'spinner_patience',
    name: 'Spinner Patience',
    kind: 'passive',
    focus: 2,
    passive: { vsStatus: { status: 'chill', mult: 1.4 } },
    tale: 'A held thing is a solved thing. The weaver finishes solved things.',
  },
  {
    id: 'pale_silk',
    name: 'Pale Silk',
    kind: 'active',
    focus: 2,
    ability: 'pale_silk',
    cooldownTicks: 500,
    windupTicks: 8,
    tale: 'The weaver wraps itself in its own work. Blades ask the silk first.',
  },
  {
    id: 'venom_sup',
    name: 'Venom Sup',
    kind: 'passive',
    focus: 1,
    passive: { statusLeech: 0.5 },
    tale: 'The green work returns to it, sip by patient sip.',
  },
  {
    id: 'the_venom_lattice',
    name: 'The Venom Lattice',
    kind: 'active',
    focus: 3,
    ability: 'the_venom_lattice',
    cooldownTicks: 500,
    windupTicks: 14,
    maxRange: 4,
    tale: 'A woven floor of green threads. Every strand knows where you are.',
  },

  // ------------------------------------------- THE STONE COURT
  // (THE GAZE TAKES THE LEASH, user mandate 2026-08-17): the family
  // shelf the fen deserved from the start — no borrowed words. The
  // playstyle is THE HOLD AND THE HAMMER: the mark stands still, and
  // then the slow jaws arrive. The cons are the pros' own shadow:
  // the slowest stride on the roster, the longest rests, and a lure
  // you must hunt the stone court itself to hold.
  {
    id: 'graven_scale',
    name: 'Graven Scale',
    kind: 'passive',
    focus: 1,
    passive: { armor: 2 },
    tale: 'The hide keeps a little of the stone it makes. Blades ask twice.',
  },
  {
    id: 'the_low_fire',
    name: 'The Low Fire',
    kind: 'passive',
    focus: 1,
    passive: { regenMult: 1.5, statusDurMult: 0.75 },
    tale: 'A heart that slow is a poor host. Poisons leave early, and the flesh knits while it naps.',
  },
  {
    id: 'tail_sweep',
    name: 'Tail Sweep',
    kind: 'active',
    focus: 2,
    ability: 'tail_sweep',
    cooldownTicks: 260,
    windupTicks: 12,
    maxRange: 2.5,
    tale: 'Half the animal is tail. This is the half that speaks to crowds.',
  },
  {
    id: 'mire_spit',
    name: 'Mire Spit',
    kind: 'active',
    focus: 2,
    ability: 'mire_spit',
    cooldownTicks: 220,
    // The venom_spit dial holds here too: no minRange ever — a
    // melee-brained body hugs its mark, so edge distance lives under
    // every floor. maxRange 7 is the REACH, not the floor.
    windupTicks: 10,
    maxRange: 7,
    tale: 'The wild word at heel: a rope of green rot, spent at a distance.',
  },
  {
    id: 'swamp_blood',
    name: 'Swamp Blood',
    kind: 'passive',
    focus: 2,
    passive: { biteStatusPower: 1, statusLeech: 0.4 },
    tale: 'The rot it lays runs deeper, and a little of it always finds its way home.',
  },
  {
    id: 'the_drowning_mire',
    name: 'The Drowning Mire',
    kind: 'active',
    focus: 3,
    ability: 'the_drowning_mire',
    cooldownTicks: 520,
    windupTicks: 14,
    maxRange: 3,
    tale: 'The fen does not visit. It moves in, and it keeps every ankle it meets.',
  },
  {
    id: 'the_lidless_watch',
    name: 'The Lidless Watch',
    kind: 'passive',
    focus: 2,
    passive: { vsStatus: { status: 'root', mult: 1.5 } },
    tale: 'What stands still is already solved. The jaws arrive to close the argument.',
  },
  {
    id: 'graven_mantle',
    name: 'Graven Mantle',
    kind: 'active',
    focus: 2,
    ability: 'graven_mantle',
    cooldownTicks: 520,
    windupTicks: 10,
    tale: 'It wears its own petrification a while, the way its elders taught.',
  },
  {
    id: 'the_graven_gaze',
    name: 'The Graven Gaze',
    kind: 'active',
    focus: 3,
    ability: 'the_graven_gaze',
    cooldownTicks: 600,
    windupTicks: 18,
    maxRange: 3.5,
    tale: 'The pale eyes stop blinking. Whatever they rest on stays for the rest.',
  },
];

export const PET_ARTS: ReadonlyMap<string, PetArtDef> = new Map(
  PET_ART_DEFS.map((a) => [a.id, a]),
);

export function petArtDef(id: string): PetArtDef | undefined {
  return PET_ARTS.get(id);
}

/**
 * THE SHELVES: each species' five-to-six words, family pool first,
 * exclusives after, the signature last. Order is the menu's order.
 */
export const PET_REPERTOIRE: Readonly<Record<string, readonly string[]>> = {
  giant_beetle: [
    'chitin_plate',
    'slow_and_certain',
    'set_the_shell',
    'clatter_challenge',
    'horn_toss',
    'the_burnished_wall',
  ],
  rat: [
    'nip_and_dart',
    'gutter_quick',
    'twitching_ear',
    'plague_gnaw',
    'small_shadow',
    'the_rats_hour',
  ],
  cave_bat: [
    'nip_and_dart',
    'gutter_quick',
    'twitching_ear',
    'blood_drink',
    'echo_shriek',
    'the_dark_descent',
  ],
  mudcrab: [
    'chitin_plate',
    'slow_and_certain',
    'set_the_shell',
    'clatter_challenge',
    'tide_grip',
    'the_undertow',
  ],
  boar: [
    'gore_charge',
    'bristleback',
    'tusk_sweep',
    'rooting_snout',
    'mud_wallow',
    'the_stubborn_heart',
  ],
  dire_boar: [
    'gore_charge',
    'bristleback',
    'tusk_sweep',
    'iron_hide',
    'old_scars',
    'the_long_furrow',
  ],
  giant_spider: [
    'web_snare',
    'skitter_high',
    'spinner_patience',
    'pale_silk',
    'venom_sup',
    'the_venom_lattice',
  ],
  wolf: [
    'worry_the_wound',
    'pack_step',
    'blooded_run',
    'hamstring',
    'lone_vigil',
    'the_first_howl',
  ],
  fox: [
    'pack_step',
    'blooded_run',
    'hedge_larder',
    'the_wary_one',
    'the_hundred_nips',
    'the_mousing_dive',
  ],
  giant_turtle: [
    'chitin_plate',
    'slow_and_certain',
    'set_the_shell',
    'clatter_challenge',
    'patience_of_stone',
    'the_standing_stone',
  ],
  giant_crab: [
    'chitin_plate',
    'slow_and_certain',
    'set_the_shell',
    'clatter_challenge',
    'riptide_claw',
    'the_kings_pincer',
  ],
  lynx_young: [
    'soft_paw',
    'raking_flurry',
    'sharpened_claws',
    'playful_feint',
    'the_pounce_perfected',
  ],
  lynx: [
    'soft_paw',
    'raking_flurry',
    'sharpened_claws',
    'tufted_patience',
    'keen_tufts',
    'the_winter_stalk',
  ],
  bear: ['maul', 'the_charge', 'thick_fat', 'honeyed_temper', 'winter_sleep', 'stand_tall'],
  great_owl: [
    'talon_stoop',
    'hushing_wing',
    'silent_feather',
    'night_eyes',
    'preen',
    'the_white_hush',
  ],
  adder: [
    'venom_spit',
    'coiled_strike',
    'cold_blood',
    'shed_skin',
    'deepening_dose',
    'the_long_fang',
  ],
  // THE STONE COURT (THE GAZE TAKES THE LEASH, 2026-08-17): the
  // family speaks its OWN words now — the borrowed reptile shelf and
  // the turtle's monolith are returned. The fen is the marsh half
  // (rot, the mire, the spit); the basilisk is the stone half (the
  // gaze, the mantle, the payoff on what stands still). Both swing
  // the family's great tail.
  fen_basilisk: [
    'graven_scale',
    'the_low_fire',
    'tail_sweep',
    'mire_spit',
    'swamp_blood',
    'the_drowning_mire',
  ],
  basilisk: [
    'graven_scale',
    'the_low_fire',
    'tail_sweep',
    'the_lidless_watch',
    'graven_mantle',
    'the_graven_gaze',
  ],
  worg: [
    'worry_the_wound',
    'pack_step',
    'blooded_run',
    'winters_jaw',
    'war_pelt',
    'the_cowing_snarl',
  ],
};

export function repertoireFor(species: string): readonly string[] {
  return PET_REPERTOIRE[species] ?? [];
}

/**
 * Fold a loadout's passives into ONE bundle for the stat site and the
 * behavioral read points: armor sums, multipliers multiply, booleans
 * OR, and the structured effects keep the strongest hand. Unknown ids
 * (a retuned roster's ghosts) fold to nothing — never a crash.
 */
export function petPassiveBundle(arts: readonly string[]): PetPassive {
  const out: PetPassive = {};
  for (const id of arts) {
    const p = PET_ARTS.get(id)?.passive;
    if (!p) continue;
    if (p.armor) out.armor = (out.armor ?? 0) + p.armor;
    if (p.maxHpMult) out.maxHpMult = (out.maxHpMult ?? 1) * p.maxHpMult;
    if (p.dmgMult) out.dmgMult = (out.dmgMult ?? 1) * p.dmgMult;
    if (p.strideMult) out.strideMult = (out.strideMult ?? 1) * p.strideMult;
    if (p.nightStrideMult) {
      out.nightStrideMult = (out.nightStrideMult ?? 1) * p.nightStrideMult;
    }
    if (p.biteStatusPower) {
      out.biteStatusPower = (out.biteStatusPower ?? 0) + p.biteStatusPower;
    }
    if (p.statusLeech) out.statusLeech = Math.max(out.statusLeech ?? 0, p.statusLeech);
    if (p.regenMult) out.regenMult = Math.max(out.regenMult ?? 1, p.regenMult);
    if (p.downedTicksMult) {
      out.downedTicksMult = Math.min(out.downedTicksMult ?? 1, p.downedTicksMult);
    }
    if (p.firstBlowShrug) out.firstBlowShrug = true;
    if (p.firstStatusShrug) out.firstStatusShrug = true;
    if (p.knockbackImmune) out.knockbackImmune = true;
    if (p.quietFang) out.quietFang = true;
    if (p.deathDefy) out.deathDefy = true;
    if (p.killsForage) out.killsForage = true;
    if (p.statusDurMult) {
      out.statusDurMult = Math.min(out.statusDurMult ?? 1, p.statusDurMult);
    }
    if (p.bondHealMult) out.bondHealMult = Math.max(out.bondHealMult ?? 1, p.bondHealMult);
    if (p.openerRange) out.openerRange = Math.max(out.openerRange ?? 0, p.openerRange);
    if (p.firstStrikeMult) {
      out.firstStrikeMult = Math.max(out.firstStrikeMult ?? 1, p.firstStrikeMult);
    }
    if (p.openerStatus && !out.openerStatus) out.openerStatus = p.openerStatus;
    if (p.vsStatus && !out.vsStatus) out.vsStatus = p.vsStatus;
    if (p.woundedArmor && !out.woundedArmor) out.woundedArmor = p.woundedArmor;
    if (p.unhurtArmor && !out.unhurtArmor) out.unhurtArmor = p.unhurtArmor;
    if (p.nearKeeper && !out.nearKeeper) out.nearKeeper = p.nearKeeper;
  }
  return out;
}

/**
 * THE VARIANT PAIRS, pinned by name: each pair shares its family pool
 * and NEVER an exclusive — the lesser variant keeps exclusivity too.
 */
export const PET_VARIANT_PAIRS: readonly [string, string][] = [
  ['boar', 'dire_boar'],
  ['lynx_young', 'lynx'],
  ['wolf', 'worg'],
  ['fen_basilisk', 'basilisk'],
];

/**
 * Shapes a companion's active may ride — the NPC-safe set minus the
 * lanes the refusals close (no summon: no pet armies ever; no beam or
 * chain: no shipped body speaks them; no ground_aoe: the field is the
 * pet's area voice).
 */
export const PET_SAFE_SHAPES: ReadonlySet<string> = new Set([
  'melee_arc',
  'dash_strike',
  'projectile_fan',
  'nova',
  'pulse_nova',
  'ground_field',
  'leap_slam',
  'flurry',
  'self_buff',
]);

/** Every law one art must clear. Empty array = clean. */
export function petArtErrors(def: PetArtDef): string[] {
  const errs: string[] = [];
  if (!/^[a-z][a-z0-9_]*$/.test(def.id)) errs.push(`${def.id}: id must be lowercase words`);
  if (def.name.length < 2 || def.name.length > 40) errs.push(`${def.id}: name out of measure`);
  if (def.tale.length < 10 || def.tale.length > 160) {
    errs.push(`${def.id}: tale must be one honest sentence`);
  }
  if (def.tale.includes(' - ') || def.tale.includes('—') || def.tale.includes('–')) {
    errs.push(`${def.id}: no dashes in player-facing copy (VOICE.md)`);
  }
  if (![1, 2, 3].includes(def.focus)) errs.push(`${def.id}: focus outside 1..3`);
  if (def.kind === 'active') {
    if (!def.ability) {
      errs.push(`${def.id}: an active names its ability`);
      return errs;
    }
    if (def.ability !== def.id) {
      errs.push(`${def.id}: an active's id IS its ability id (one name, one face)`);
    }
    const ab = ABILITIES.get(def.ability);
    if (!ab) {
      errs.push(`${def.id}: ability '${def.ability}' does not exist`);
      return errs;
    }
    if (ab.name !== def.name) errs.push(`${def.id}: art and ability disagree on the name`);
    if (!PET_SAFE_SHAPES.has(ab.shape)) {
      errs.push(`${def.id}: shape '${ab.shape}' is not a companion's to speak`);
    }
    if (ab.cooldownTicks !== 0) {
      errs.push(`${def.id}: pet pacing lives on the PetArtDef, ability must ship cd 0`);
    }
    if (ab.summon || ab.summonNpc) errs.push(`${def.id}: no pet armies, ever`);
    if (ab.self?.beastTruce || ab.self?.beastPart) {
      errs.push(`${def.id}: the keeper's words stay the keeper's`);
    }
    if (!def.cooldownTicks || def.cooldownTicks < 100) {
      errs.push(`${def.id}: an active rests at least 100 ticks`);
    }
    if (def.passive) errs.push(`${def.id}: an active carries no passive rider`);
  } else {
    if (def.ability || def.cooldownTicks || def.windupTicks) {
      errs.push(`${def.id}: a passive neither fires nor rests`);
    }
    if (!def.passive || Object.keys(def.passive).length === 0) {
      errs.push(`${def.id}: a passive must do something`);
    }
    const p = def.passive;
    if (p) {
      if (p.armor !== undefined && (!Number.isInteger(p.armor) || p.armor <= 0 || p.armor > 6)) {
        errs.push(`${def.id}: passive armor outside (0, 6]`);
      }
      if (p.dmgMult !== undefined && (p.dmgMult <= 1 || p.dmgMult > 1.25)) {
        errs.push(`${def.id}: passive dmgMult outside (1, 1.25]`);
      }
      if (p.maxHpMult !== undefined && (p.maxHpMult <= 1 || p.maxHpMult > 1.3)) {
        errs.push(`${def.id}: passive maxHpMult outside (1, 1.3]`);
      }
      if (
        (p.strideMult !== undefined && (p.strideMult <= 1 || p.strideMult > 1.2)) ||
        (p.nightStrideMult !== undefined && (p.nightStrideMult <= 1 || p.nightStrideMult > 1.25))
      ) {
        errs.push(`${def.id}: passive stride outside honest measure`);
      }
      if (p.statusLeech !== undefined && (p.statusLeech <= 0 || p.statusLeech > 1)) {
        errs.push(`${def.id}: statusLeech outside (0, 1]`);
      }
      if (p.statusDurMult !== undefined && (p.statusDurMult < 0.25 || p.statusDurMult >= 1)) {
        errs.push(`${def.id}: statusDurMult outside [0.25, 1)`);
      }
    }
  }
  return errs;
}

/** Roster-wide gate — content tests refuse against THIS, never a copy. */
export function petRepertoireErrors(): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const def of PET_ART_DEFS) {
    if (seen.has(def.id)) errs.push(`${def.id}: duplicate art row`);
    seen.add(def.id);
    errs.push(...petArtErrors(def));
  }
  // Every tamable species holds a shelf, and only tamable species do
  // — except the docile company (the house cat), which by law fights
  // nothing and therefore holds nothing: a shelf FOR a docile species
  // is as much a defect as a missing one.
  for (const [species, tame] of TAMES) {
    if (tame.docile) {
      if (PET_REPERTOIRE[species]) errs.push(`${species}: a docile friend holds no repertoire`);
      continue;
    }
    if (!PET_REPERTOIRE[species]) errs.push(`${species}: tamable but holds no repertoire`);
  }
  for (const species of Object.keys(PET_REPERTOIRE)) {
    if (!TAMES.has(species)) errs.push(`${species}: repertoire for a species nobody tames`);
    const shelf = PET_REPERTOIRE[species]!;
    if (shelf.length < 5 || shelf.length > 6) {
      errs.push(`${species}: a shelf holds five or six words, not ${shelf.length}`);
    }
    const shelfSeen = new Set<string>();
    let actives = 0;
    let passives = 0;
    let signatures = 0;
    for (const id of shelf) {
      if (shelfSeen.has(id)) errs.push(`${species}: '${id}' shelved twice`);
      shelfSeen.add(id);
      const art = PET_ARTS.get(id);
      if (!art) {
        errs.push(`${species}: '${id}' is not an art`);
        continue;
      }
      if (art.kind === 'active') actives++;
      else passives++;
      if (art.focus === 3) signatures++;
      // THE TELEGRAPH PREMIUM, pet edition: an active that out-hits
      // this species' basic wears a windup the field can read.
      if (art.kind === 'active' && art.ability) {
        const ab = ABILITIES.get(art.ability);
        const npc = NPCS.get(species);
        if (ab && npc && ab.damage > npc.damage && (art.windupTicks ?? 0) < 10) {
          errs.push(`${species}: '${id}' out-hits the basic without a windup >= 10`);
        }
      }
    }
    if (actives < 1) errs.push(`${species}: a shelf holds at least one active`);
    if (passives < 1) errs.push(`${species}: a shelf holds at least one passive`);
    if (signatures !== 1) {
      errs.push(`${species}: exactly one signature per species, found ${signatures}`);
    }
  }
  // THE VARIANT LAW: pairs share the pool, never an exclusive.
  for (const [lesser, greater] of PET_VARIANT_PAIRS) {
    const a = new Set(PET_REPERTOIRE[lesser] ?? []);
    const b = new Set(PET_REPERTOIRE[greater] ?? []);
    const shared = [...a].filter((id) => b.has(id));
    const aOnly = [...a].filter((id) => !b.has(id));
    const bOnly = [...b].filter((id) => !a.has(id));
    if (shared.length < 2) errs.push(`${lesser}/${greater}: variant pair shares no family pool`);
    if (aOnly.length < 2) errs.push(`${lesser}: the lesser variant keeps exclusivity too`);
    if (bOnly.length < 2) errs.push(`${greater}: the greater variant keeps exclusivity too`);
  }
  return errs;
}
