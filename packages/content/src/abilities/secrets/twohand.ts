/**
 * THE TWOHAND SECRET SHELF — the weapon-taught arts of this school and
 * their honed ranks, one file per school (THE MASTERED HAND,
 * techniques v3). Moved verbatim from weaponArts/ladders and
 * secretRanks; the shelf waves rewrite the arts here. Seats and
 * anchors stay in secretArts.ts (THE ANCHOR RULER is not this file's
 * to move).
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/** THE REGISTER, per shelf (see schools/onehand.ts). */
export const TWOHAND_SECRET_LICENSES: Record<string, string[]> = {};

export const TWOHAND_SECRET_ARTS: AbilityDef[] = [
  // The founding pair's Weapon Arts (the Q axis — no rungs, no ranks).
  {
    id: 'colossus_arc',
    name: 'Colossus Arc',
    desc: "The greatblade's own word: one full turn, and the whole yard hears it.",
    color: '#9aa2ac',
    code: 'Ca',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 11,
    range: 2.9,
    arc: 2.6,
    knockback: 1.5,
  },

  {
    id: 'quakefall',
    name: 'Quakefall',
    desc: 'The maul goes up. The county comes down.',
    color: '#7d7468',
    code: 'Qf',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 5,
    shape: 'ground_aoe',
    damage: 14,
    range: 3.5,
    radius: 2.3,
    fuseTicks: 10,
    knockback: 2.0,
  },

  // THE ARMORY's Weapon Arts — one per bespoke greatweapon, plus the
  // greataxe line's shared design art. Same Q-axis law as the founding
  // pair: no rungs, no ranks, the item IS the unlock.
  {
    // The metal greataxe line's design art (bronze → adamant + the
    // goblin scrap piece): the double head goes the whole way around.
    id: 'hewers_wheel',
    name: "Hewer's Wheel",
    desc: 'The axe goes around once. What stood in the round falls in lengths.',
    color: '#9a8a6a',
    code: 'Hw',
    cooldownTicks: 210, // 10.5 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.7,
    arc: 3.1,
    knockback: 1.2,
    status: { status: 'bleed', power: 1, durationTicks: 50 },
  },

  {
    id: 'reavers_due',
    name: "Reaver's Due",
    desc: 'The road has a price. The flat of this collects it.',
    color: '#6e7c92',
    code: 'Rd',
    cooldownTicks: 180, // 9 s
    shape: 'melee_arc',
    damage: 9,
    range: 2.8,
    arc: 2.2,
    knockback: 2.6,
  },

  {
    id: 'mournfield',
    name: 'Mournfield',
    desc: 'Mark out a plot. Everything in it slows to a walk behind the coffin.',
    color: '#8a90a8',
    code: 'Mf',
    cooldownTicks: 190, // 9.5 s
    shape: 'ground_field',
    damage: 3,
    range: 3,
    radius: 2.3,
    fieldTicks: 120,
    pulseEveryTicks: 20,
    status: { status: 'chill', power: 1, durationTicks: 35 },
  },

  {
    id: 'ash_harvest',
    name: 'Ash Harvest',
    desc: 'Reap once. What the wave-edge misses, the embers finish.',
    color: '#c47444',
    code: 'Ah',
    cooldownTicks: 220, // 11 s
    shape: 'melee_arc',
    damage: 11,
    range: 2.8,
    arc: 2.4,
    knockback: 1.3,
    status: { status: 'burn', power: 1, durationTicks: 70 },
  },

  {
    id: 'glacier_sunder',
    name: 'Glacier Sunder',
    desc: 'The cold arrives all at once, from above.',
    color: '#9cc4e0',
    code: 'Gs',
    cooldownTicks: 240, // 12 s
    castFreezeTicks: 4,
    shape: 'ground_aoe',
    damage: 12,
    range: 3.2,
    radius: 2.2,
    fuseTicks: 8,
    knockback: 1.2,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  {
    id: 'crowns_word',
    name: "The Crown's Word",
    desc: 'Spoken twice — once for the court, once for whoever missed it.',
    color: '#e0b054',
    code: 'Cw',
    cooldownTicks: 240, // 12 s
    shape: 'pulse_nova',
    damage: 8,
    radius: 2.4,
    pulses: 2,
    pulseEveryTicks: 10,
    knockback: 1.4,
  },

  {
    id: 'last_argument',
    name: 'Last Argument',
    desc: 'Both hands, one argument. This is the closing line.',
    color: '#efe6cc',
    code: 'La',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 15,
    range: 3.1,
    arc: 2.8,
    knockback: 2.2,
  },

  {
    id: 'barrow_bite',
    name: 'Barrow Bite',
    desc: 'The jaws remember being hungry. Feed them.',
    color: '#a89a84',
    code: 'Bb',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.5,
    arc: 2.0,
    knockback: 1.0,
    status: { status: 'bleed', power: 2, durationTicks: 60 },
  },

  {
    id: 'thunder_fell',
    name: 'Thunderfell',
    desc: 'The stroke and the storm land together. Nobody agrees which hit first.',
    color: '#8ca0d4',
    code: 'Tf',
    cooldownTicks: 230, // 11.5 s
    castFreezeTicks: 3,
    shape: 'ground_aoe',
    damage: 12,
    range: 3.4,
    radius: 2.1,
    fuseTicks: 8,
    knockback: 1.4,
    status: { status: 'shock', power: 1, durationTicks: 50 },
  },

  {
    id: 'white_heat',
    name: 'White Heat',
    desc: "Work while the metal's willing. Everything you touch keeps the temper.",
    color: '#f0a050',
    code: 'Wh',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { speedMult: 1.12, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 150 },
  },

  {
    id: 'pale_crescent',
    name: 'Pale Crescent',
    desc: 'A quiet arc, moon-wide. The yard goes still where it passes.',
    color: '#d8dce8',
    code: 'Pc',
    cooldownTicks: 220, // 11 s
    shape: 'melee_arc',
    damage: 11,
    range: 2.9,
    arc: 2.5,
    knockback: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 70 },
  },

  {
    id: 'horizon_fall',
    name: 'Horizon Fall',
    desc: 'The mountain does not come to you. You bring it.',
    color: '#6a5e7a',
    code: 'Hf',
    cooldownTicks: 320, // 16 s
    castFreezeTicks: 4,
    shape: 'leap_slam',
    damage: 14,
    dashTiles: 12.0,
    radius: 2.4,
    knockback: 2.4,
  },

  // THE VAULT OF NAMES' Weapon Arts — one per chase find, the same
  // Q-axis law as the armory: no rungs, no ranks, the story IS the
  // unlock and the art is the story told at speed.
  {
    id: 'road_opens',
    name: 'The Road Opens',
    desc: 'The bar came down once. Everything in front of the blade learns how that went.',
    color: '#d9a441',
    code: 'R2',
    cooldownTicks: 220, // 11 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.8,
    arc: 2.3,
    knockback: 3.2,
  },

  {
    id: 'marsh_light',
    name: 'Marsh Light',
    desc: 'Set the light down and let it feed. The fen always collects.',
    color: '#b8e068',
    code: 'M2',
    cooldownTicks: 280, // 14 s
    shape: 'ground_field',
    damage: 4,
    range: 3,
    radius: 2.2,
    fieldTicks: 110,
    pulseEveryTicks: 18,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },

  {
    id: 'riftfall',
    name: 'Riftfall',
    desc: 'For one breath the sky behind the sky comes through, edge first.',
    color: '#cabdf2',
    code: 'R3',
    cooldownTicks: 300, // 15 s
    castFreezeTicks: 4,
    shape: 'ground_aoe',
    damage: 15,
    range: 3.4,
    radius: 2.3,
    fuseTicks: 9,
    knockback: 1.6,
  },

  {
    id: 'winters_hunger',
    name: "Winter's Hunger",
    desc: 'The bear walked all winter on empty. Now you do — and everything you touch bleeds for it.',
    color: '#a08a70',
    code: 'W2',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { speedMult: 1.1, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 150 },
  },

  {
    id: 'open_seam',
    name: 'Open Seam',
    desc: 'Crack the floor like a seam and let it keep giving.',
    color: '#e8c04c',
    code: 'O2',
    cooldownTicks: 265, // 13.25 s
    shape: 'ground_field',
    damage: 5,
    range: 3,
    radius: 2.1,
    fieldTicks: 100,
    pulseEveryTicks: 16,
  },

  {
    id: 'last_toll',
    name: 'Last Toll',
    desc: 'The bell rings once more, and the county answers whether it wants to or not.',
    color: '#e2c384',
    code: 'L2',
    cooldownTicks: 335, // 16.75 s
    castFreezeTicks: 4,
    shape: 'pulse_nova',
    damage: 10,
    radius: 2.5,
    pulses: 3,
    pulseEveryTicks: 12,
    knockback: 1.5,
    status: { status: 'shock', power: 1, durationTicks: 45 },
  },

  {
    // THE DRAWN BREATH's stone voice, taught by kerbstone: a casted
    // summon — raise old kerb stone, and let it take the argument.
    id: 'standing_stone',
    name: 'The Standing Stone',
    desc: 'Raise a kerb stone where you point. Everything angry argues with the stone first.',
    color: '#8a8a7a',
    code: 'Ss',
    cooldownTicks: 380, // 19 s
    castTicks: 24, // 1.2 s raised, 0.96 s planted
    shape: 'summon',
    damage: 0,
    range: 4, // point-aimed: the stone stands where the ring promised
    summon: { kind: 'decoy', durationTicks: 180, radius: 6, power: 0 },
  },
];

export const TWOHAND_SECRET_RANKS: Record<string, Steps> = {
  // ------------------------------------------- twohand, the great steel
  colossus_arc: [
    { note: 'The arc falls heavier.', damage: 13 },
    { note: 'The swing owns a wider circle.', arc: 2.9 },
    { note: 'What the colossus strikes, it removes, and the arm is ready again.', knockback: 2.2, cooldownTicks: 175 },
  ],
  hewers_wheel: [
    { note: 'The wheel bites deeper.', damage: 11 },
    { note: 'The turn sweeps fully round.', arc: 3.4 },
    { note: 'The hewing leaves the timber weeping.', status: { status: 'bleed', power: 2, durationTicks: 50 } },
  ],
  reavers_due: [
    { note: 'The due is collected heavier.', damage: 11 },
    { note: 'The reach of the reaving grows.', range: 3.0 },
    { note: 'What is owed is thrown from the hall, and collected again soon.', knockback: 3.2, cooldownTicks: 154 },
  ],
  mournfield: [
    { note: 'The mourning bites deeper.', damage: 4 },
    { note: 'The field of grief spreads wider.', radius: 2.6 },
    { note: 'The grieving runs longer, and cuts deeper.', fieldTicks: 140, damage: 5 },
  ],
  ash_harvest: [
    { note: 'The harvest cuts deeper.', damage: 12 },
    { note: 'The burning row grows wider.', arc: 2.7 },
    { note: 'The ash keeps its heat.', status: { status: 'burn', power: 2, durationTicks: 70 } },
  ],
  barrow_bite: [
    { note: 'The bite closes harder.', damage: 11 },
    { note: 'The maw opens wider.', arc: 2.3 },
    { note: 'The barrow does not let go.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  quakefall: [
    { note: 'The fall lands heavier.', damage: 15 },
    { note: 'The fracture spreads wider.', radius: 2.6 },
    { note: 'The earth gives no notice at all.', fuseTicks: 6 },
  ],
  road_opens: [
    { note: 'The toll is taken heavier.', damage: 12 },
    { note: 'The road claims a wider verge.', arc: 2.6 },
    { note: 'Whatever stood in the way is a milestone now.', knockback: 3.8, cooldownTicks: 168 },
  ],
  standing_stone: [
    { note: 'The stone stands longer.', summon: { kind: 'decoy', durationTicks: 220, radius: 6, power: 0 } },
    { note: 'The stone speaks over a wider field.', summon: { kind: 'decoy', durationTicks: 220, radius: 7, power: 0 } },
    { note: 'The ground knows the stone now, and raises it sooner.', cooldownTicks: 320 },
  ],
  crowns_word: [
    { note: 'Each word lands heavier.', damage: 9 },
    { note: 'The argument carries wider.', radius: 2.7 },
    { note: 'The crown speaks a third time.', pulses: 3 },
  ],
  glacier_sunder: [
    { note: 'The sunder drives deeper.', damage: 13 },
    { note: 'The crevasse opens wider.', radius: 2.5 },
    { note: 'The glacier calves without warning.', fuseTicks: 5 },
  ],
  marsh_light: [
    { note: 'The light draws blood now.', damage: 5 },
    { note: 'The fen glow spreads wider.', radius: 2.5 },
    { note: 'The marsh keeps its guests a breath longer.', fieldTicks: 128 },
  ],
  thunder_fell: [
    { note: 'The fell strikes heavier.', damage: 13 },
    { note: 'The thunderhead spreads wider.', radius: 2.4 },
    { note: 'The bolt outruns its own warning.', fuseTicks: 5 },
  ],
  white_heat: [
    { note: 'The heat works faster through the arms.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 150 } },
    { note: 'The forge holds its temper longer.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 180 } },
    { note: 'Every blow off the anvil brands deeper.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 2, durationTicks: 60 }, durationTicks: 180 } },
  ],
  winters_hunger: [
    { note: 'The hunger drives the arms faster.', self: { speedMult: 1.14, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 150 } },
    { note: 'The appetite lasts longer.', self: { speedMult: 1.14, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 180 } },
    { note: 'Every bite tears wider.', self: { speedMult: 1.14, onHitStatus: { status: 'bleed', power: 2, durationTicks: 70 }, durationTicks: 180 } },
  ],
  open_seam: [
    { note: 'The seam splits deeper.', damage: 6 },
    { note: 'The tear runs wider.', radius: 2.4 },
    { note: 'The seam stays open longer, and cuts to the quick.', fieldTicks: 112, damage: 7 },
  ],
  pale_crescent: [
    { note: 'The crescent falls heavier.', damage: 12 },
    { note: 'The moon path sweeps wider.', arc: 2.8 },
    { note: 'Moonlight lies cold on the wound, and the moon rises sooner.', status: { status: 'chill', power: 2, durationTicks: 70 }, cooldownTicks: 192 },
  ],
  last_argument: [
    { note: 'The argument lands heavier.', damage: 17 },
    { note: 'It admits no one outside its reach.', range: 3.3, arc: 3.0 },
    { note: 'The conclusion clears the room, and brooks little rebuttal.', knockback: 3.0, cooldownTicks: 230 },
  ],
  horizon_fall: [
    { note: 'The fall lands heavier.', damage: 15 },
    { note: 'The horizon breaks wider.', radius: 2.7 },
    { note: 'Where it lands, the world makes room, and the sky reloads.', knockback: 3.2, cooldownTicks: 300 },
  ],
  riftfall: [
    { note: 'The rift bites deeper.', damage: 16 },
    { note: 'The tear opens wider.', radius: 2.6 },
    { note: 'The far side arrives early, and often.', fuseTicks: 5, cooldownTicks: 270 },
  ],
  last_toll: [
    { note: 'Each toll rings heavier.', damage: 11 },
    { note: 'The bell is heard wider.', radius: 2.8 },
    { note: 'The final toll throws the room, and rings in the bones.', knockback: 2.5, status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],
};
