/**
 * THE TECHNIQUE LADDERS — every rung of every school, as pure data
 * (foundations F6.2; moved verbatim from abilities.ts).
 */
import type { TechniqueDef } from '@arx/shared';
import { ONEHAND_LADDER } from './schools/onehand.js';
import { ARCHERY_LADDER } from './schools/archery.js';
import { ARX_LADDER } from './schools/arx.js';
import { SNEAK_LADDER } from './schools/sneak.js';
import { SHIELD_LADDER } from './schools/shield.js';
import { TWOHAND_LADDER } from './schools/twohand.js';
import { DUALWIELD_LADDER } from './schools/dualwield.js';
import { COMBAT_LADDER } from './schools/combat.js';

export const TECHNIQUE_LADDER_DEFS: TechniqueDef[] = [
  // THE GREEN ARTS ladder — rungs 5..75 on the farming skill.
  {
    ability: 'sowers_step',
    style: 'farming',
    unlockLevel: 5,
    ranks: [
      { note: 'The stride holds longer.', self: { speedMult: 1.12, durationTicks: 320 } },
      { note: 'The furrows carry you quicker.', self: { speedMult: 1.16, durationTicks: 320 } },
      { note: 'The path barely feels your weight.', cooldownTicks: 480 },
    ],
  },
  {
    ability: 'gardeners_mend',
    style: 'farming',
    unlockLevel: 15,
    ranks: [
      { note: 'The green gives more of itself.', self: { heal: 16, durationTicks: 20 } },
      { note: 'The kneel comes easier.', cooldownTicks: 640 },
      { note: 'The mend runs deep.', self: { heal: 22, durationTicks: 20 } },
    ],
  },
  {
    ability: 'earthen_brace',
    style: 'farming',
    unlockLevel: 30,
    ranks: [
      { note: 'The ground holds harder.', self: { shieldHp: 18, durationTicks: 240 } },
      { note: 'The stance sets quicker.', cooldownTicks: 560 },
      { note: 'Fencepost, then foundation.', self: { shieldHp: 24, durationTicks: 300 } },
    ],
  },
  {
    ability: 'hearthkeepers_calm',
    style: 'farming',
    unlockLevel: 50,
    ranks: [
      { note: 'The quiet settles deeper.', self: { armor: 5, durationTicks: 300 } },
      { note: 'The calm keeps longer.', self: { armor: 5, durationTicks: 400 } },
      { note: 'The yard walks with you whole.', self: { armor: 6, durationTicks: 400 } },
    ],
  },
  {
    ability: 'quickening_touch',
    style: 'farming',
    unlockLevel: 75,
    ranks: [
      { note: 'The touch reaches further.', range: 5.5 },
      { note: 'The hand asks less often.', cooldownTicks: 900 },
      { note: 'A master gardener\'s season in a breath.', cooldownTicks: 700 },
    ],
  },
  // -------------------- THE REACHING SCHOOL — the polearm rungs
  {
    ability: 'lunging_skewer',
    style: 'polearm',
    unlockLevel: 5,
    ranks: [
      { note: 'The point lands heavier.', damage: 10 },
      { note: 'The reach lengthens; the lunge asks less.', range: 3.7, cooldownTicks: 120 },
      { note: 'The argument ends sooner every time.', damage: 11, cooldownTicks: 115 },
    ],
  },
  {
    ability: 'haft_strike',
    style: 'polearm',
    unlockLevel: 10,
    ranks: [
      { note: 'The shove carries them farther.', knockback: 3.0, cooldownTicks: 110 },
      { note: 'The jolt hangs in their knees.', damage: 5, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'Room made, and made quickly.', knockback: 3.4, cooldownTicks: 100 },
    ],
  },
  {
    ability: 'hooking_reap',
    style: 'polearm',
    unlockLevel: 15,
    ranks: [
      { note: 'The bite behind the hook deepens.', damage: 8 },
      { note: 'The drag is longer and colder.', knockback: -2.5, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'Whatever the hook finds, it keeps.', damage: 9, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'vaulting_step',
    style: 'polearm',
    unlockLevel: 20,
    ranks: [
      { note: 'The vault carries farther, sooner.', dashTiles: 8.0, cooldownTicks: 150 },
      { note: 'You land meaning it.', damage: 8 },
      { note: 'The haft barely touches the ground.', damage: 10, dashTiles: 9.0, cooldownTicks: 130 },
    ],
  },
  {
    ability: 'perfect_thrust',
    style: 'polearm',
    unlockLevel: 25,
    ranks: [
      { note: 'The line lands heavier.', damage: 16 },
      { note: 'The breath draws shorter.', castTicks: 16, cooldownTicks: 160 },
      { note: 'One line, and the world agrees with it.', damage: 18 },
    ],
  },
  {
    ability: 'flurry_of_points',
    style: 'polearm',
    unlockLevel: 30,
    ranks: [
      { note: 'Every point bites deeper.', damage: 5 },
      { note: 'The rain holds a fourth beat.', channelTicks: 64 },
      { note: 'The lane clears sooner for the next storm.', cooldownTicks: 170 },
    ],
  },
  {
    ability: 'crescent_reap',
    style: 'polearm',
    unlockLevel: 35,
    ranks: [
      { note: 'The crescent lands heavier.', damage: 11 },
      { note: 'The moon opens wider, oftener.', arc: 2.5, cooldownTicks: 160 },
      { note: 'The stroke clears the whole field row.', damage: 13, knockback: 1.8, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'impaling_drive',
    style: 'polearm',
    unlockLevel: 40,
    ranks: [
      { note: 'The drive lands heavier.', damage: 15 },
      { note: 'The line is drawn quicker.', castTicks: 20, cooldownTicks: 160 },
      { note: 'The corridor widens; the lesson is general.', damage: 17, width: 0.7 },
    ],
  },
  {
    ability: 'wall_of_points',
    style: 'polearm',
    unlockLevel: 45,
    ranks: [
      { note: 'Every picket bites deeper.', damage: 5 },
      { note: 'The cold of the wall settles in.', status: { status: 'chill', power: 1, durationTicks: 50 }, cooldownTicks: 190 },
      { note: 'Nothing crosses. Nothing ever did.', damage: 6 },
    ],
  },
  {
    ability: 'knights_charge',
    style: 'polearm',
    unlockLevel: 50,
    ranks: [
      { note: 'The arrival lands heavier.', damage: 15 },
      { note: 'The road runs longer, and opens sooner.', dashTiles: 11.0, cooldownTicks: 180 },
      { note: 'The charge answers only to the horizon.', damage: 16, knockback: 3.0 },
    ],
  },
  {
    ability: 'rampart_breaker',
    style: 'polearm',
    unlockLevel: 54,
    ranks: [
      { note: 'The breach opens wider.', damage: 16 },
      { note: 'The crack runs deeper and holds longer.', status: { status: 'sunder', power: 15, durationTicks: 80 } },
      { note: 'Ramparts learn their place.', damage: 17, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'serpents_tongue',
    style: 'polearm',
    unlockLevel: 58,
    ranks: [
      { note: 'The tongue takes more each taste.', damage: 7 },
      { note: 'The serpent rests less.', cooldownTicks: 180 },
      { note: 'It flickers faster than the eye votes.', damage: 8 },
    ],
  },
  {
    ability: 'skydriver_fall',
    style: 'polearm',
    unlockLevel: 62,
    ranks: [
      { note: 'The fall lands heavier.', damage: 14 },
      { note: 'The crater spreads wider, sooner.', radius: 1.8, cooldownTicks: 190 },
      { note: 'The landing scatters whatever survives it.', damage: 15, knockback: 1.5 },
    ],
  },
  {
    ability: 'banner_advance',
    style: 'polearm',
    unlockLevel: 66,
    ranks: [
      { note: 'The banner holds the line longer.', self: { speedMult: 1.15, armor: 5, durationTicks: 140 } },
      { note: 'The call comes sooner.', cooldownTicks: 280 },
      { note: 'The whole line moves as one body.', self: { speedMult: 1.2, armor: 6, shieldHp: 10, durationTicks: 160 } },
    ],
  },
  {
    ability: 'moulinet_guard',
    style: 'polearm',
    unlockLevel: 70,
    ranks: [
      { note: 'Every turn of the wheel bites deeper.', damage: 5 },
      { note: 'The wheel spins wider and shoves.', radius: 2.0, knockback: 0.6 },
      { note: 'The guard is ready again sooner.', cooldownTicks: 170 },
    ],
  },
  {
    ability: 'stormpoint',
    style: 'polearm',
    unlockLevel: 74,
    ranks: [
      { note: 'The called strike lands heavier.', damage: 20 },
      { note: 'The charge clings longer; the sky asks less.', status: { status: 'shock', power: 1, durationTicks: 60 }, cooldownTicks: 200 },
      { note: 'The storm knows the point by name.', damage: 22 },
    ],
  },
  {
    ability: 'gatebreaker',
    style: 'polearm',
    unlockLevel: 78,
    ranks: [
      { note: 'The blow lands heavier.', damage: 14 },
      { note: 'It reads the lean earlier.', executeBelow: { frac: 0.35, mult: 2.0 } },
      { note: 'Gates fall on the first knock.', damage: 15, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'sweeping_gyre',
    style: 'polearm',
    unlockLevel: 82,
    ranks: [
      { note: 'The circle lands heavier.', damage: 11 },
      { note: 'The gyre reaches wider, oftener.', radius: 2.5, cooldownTicks: 180 },
      { note: 'One turn, and the yard is yours.', damage: 12, knockback: 2.0 },
    ],
  },
  {
    ability: 'hold_the_line_polearm',
    style: 'polearm',
    unlockLevel: 86,
    ranks: [
      { note: 'Every beat of the stand bites deeper.', damage: 5 },
      { note: 'The cold at the line holds them longer.', status: { status: 'chill', power: 1, durationTicks: 80 }, cooldownTicks: 200 },
      { note: 'The line was never really in question.', damage: 6 },
    ],
  },
  {
    ability: 'sundering_lance',
    style: 'polearm',
    unlockLevel: 90,
    ranks: [
      { note: 'The run lands heavier.', damage: 17 },
      { note: 'The road runs longer and opens sooner.', dashTiles: 14.0, cooldownTicks: 200 },
      { note: 'The crown of the school, at full gallop.', damage: 19, knockback: 3.2 },
    ],
  },
  // ------------------------- beastcraft, the keeper's ladder (THE
  // KEEPER'S TONGUE): the fourth citizenship of style at the full
  // ten-rung standard. Four words spoken to the wild itself, five
  // through the companion, and the asking at its shipped seat.
  {
    ability: 'soothe_the_wild',
    style: 'beastcraft',
    unlockLevel: 5,
    ranks: [
      { note: 'The calm holds longer, and the word returns sooner.', becalmTicks: 300, cooldownTicks: 240 },
      { note: 'The word carries further.', range: 6.5 },
      { note: 'The calm spreads to beasts standing beside the mark.', radius: 2 },
    ],
  },
  {
    ability: 'gentle_the_wild',
    style: 'beastcraft',
    unlockLevel: 10,
    ranks: [
      { note: 'The call carries further, and the hand recovers sooner.', range: 6.5, cooldownTicks: 160 },
      { note: 'The asking grows shorter.', channelTicks: 170 },
      { note: 'The wild answers a familiar hand almost at once.', channelTicks: 140 },
    ],
  },
  {
    ability: 'come_to_heel',
    style: 'beastcraft',
    unlockLevel: 15,
    ranks: [
      { note: 'The whistle is always on your lips.', cooldownTicks: 120 },
      { note: 'The friend arrives a little mended.', petHealFrac: 0.1 },
      {
        note: 'It arrives with its blood up, ready for whatever called it.',
        petSurge: { dmgMult: 1.15, speedMult: 1.1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'point_the_fang',
    style: 'beastcraft',
    unlockLevel: 20,
    ranks: [
      { note: 'The point reaches further, and comes back sooner.', range: 9, cooldownTicks: 160 },
      {
        note: 'The first bite after the point lands deep.',
        petSurge: { dmgMult: 1.5, speedMult: 1, durationTicks: 60 },
      },
      { note: 'The dare carries: foes beside the mark turn on the friend too.', radius: 2 },
    ],
  },
  {
    ability: 'keepers_balm',
    style: 'beastcraft',
    unlockLevel: 30,
    ranks: [
      { note: 'The poultice is packed thicker.', petHealFrac: 0.45, cooldownTicks: 320 },
      { note: 'The balm sheds whatever rides the friend.', petCleanse: true },
      {
        note: 'It mends near whole, and the hide stays tough a while.',
        petHealFrac: 0.6,
        petGuard: { armor: 6, durationTicks: 200 },
      },
    ],
  },
  {
    ability: 'strewn_bait',
    style: 'beastcraft',
    unlockLevel: 40,
    ranks: [
      { note: 'A wider table, laid longer.', summon: { kind: 'bait', durationTicks: 400, radius: 8, power: 0 } },
      { note: 'The hand scatters it sooner.', cooldownTicks: 380 },
      {
        note: 'The table calms its guests while they eat.',
        summon: { kind: 'bait', durationTicks: 400, radius: 8, power: 1 },
      },
    ],
  },
  {
    ability: 'the_quiet_walk',
    style: 'beastcraft',
    unlockLevel: 50,
    ranks: [
      { note: 'The quiet holds longer.', self: { beastTruce: true, durationTicks: 600 } },
      { note: 'The walk begins again sooner.', cooldownTicks: 460 },
      {
        note: 'The wild parts: beasts ease aside as you pass.',
        self: { beastTruce: true, beastPart: 1.5, durationTicks: 600 },
      },
    ],
  },
  {
    ability: 'blood_of_the_pack',
    style: 'beastcraft',
    unlockLevel: 60,
    ranks: [
      { note: 'The howl runs hotter.', petSurge: { dmgMult: 1.4, speedMult: 1.15, durationTicks: 240 } },
      { note: 'The blood stays up longer.', petSurge: { dmgMult: 1.4, speedMult: 1.15, durationTicks: 300 } },
      {
        note: 'The whole temper: its teeth carry their full wild weight, and its blows shove.',
        petSurge: { dmgMult: 1.4, speedMult: 1.15, durationTicks: 300, temper: true },
      },
    ],
  },
  {
    ability: 'the_keepers_cry',
    style: 'beastcraft',
    unlockLevel: 75,
    ranks: [
      { note: 'The friend stands with more of itself.', petHealFrac: 0.5 },
      { note: 'The cry returns to you sooner.', cooldownTicks: 900 },
      {
        note: 'It rises angry, hide tough and teeth quick.',
        petSurge: { dmgMult: 1.3, speedMult: 1.15, durationTicks: 160 },
        petGuard: { armor: 6, durationTicks: 160 },
      },
    ],
  },
  {
    ability: 'voice_of_the_wild',
    style: 'beastcraft',
    unlockLevel: 90,
    ranks: [
      { note: 'The voice carries further.', radius: 9 },
      { note: 'The awe holds longer, and the friend is mended deeper.', becalmTicks: 240, petHealFrac: 0.35 },
      { note: 'The wild answers: the ghost pack runs the rim of the ring.', becalmTicks: 320 },
    ],
  },
  // THE MASTERED HAND: each combat school keeps its own ladder beside its arts.
  ...ONEHAND_LADDER,
  ...ARCHERY_LADDER,
  ...ARX_LADDER,
  ...SNEAK_LADDER,
  ...SHIELD_LADDER,
  ...TWOHAND_LADDER,
  ...DUALWIELD_LADDER,
  ...COMBAT_LADDER,
];
