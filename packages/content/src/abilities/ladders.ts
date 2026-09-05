/**
 * THE TWOHAND SECRET SHELF's arts — the loot-taught greatblade voices
 * (the rung arts of every school live in ./schools/<school>.ts).
 */
import type { AbilityDef } from '@arx/shared';

export const LADDER_DEFS: AbilityDef[] = [
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
