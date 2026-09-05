/**
 * THE SHIELD SCHOOL — its twenty rung arts (and its unwritten page) with
 * their honing ladders, one file per school (THE MASTERED HAND,
 * techniques v3). Moved verbatim from techniqueArts/breaths/ladders and
 * techniqueLadder; the school waves rewrite the arts here.
 */
import type { AbilityDef, TechniqueDef } from '@arx/shared';

/**
 * THE REGISTER, per school: player-wielded wave-one pages
 * (root/stagger/weaken/quicken/mend/stonehide) this school's arts lay,
 * by art id → the exact page list (follow statuses, aftermath pages
 * and self pages count). statusWave.test.ts merges every school's
 * licenses; an unlisted page is refused; every hold is priced by the
 * player HOLD BUDGET in masteredHand.test.ts.
 */
export const SHIELD_LICENSES: Record<string, string[]> = {};

export const SHIELD_ARTS: AbilityDef[] = [
  // -------------------- THE SECOND BREATH — the shield breath arts
  {
    id: 'iron_toll',
    name: 'Iron Toll',
    desc: 'Strike the boss and the shield rings like a bell. The toll is paid outward.',
    color: '#8ea4b8',
    code: 'Il',
    cooldownTicks: 190, // 9.5 s
    castTicks: 20,
    shape: 'nova',
    damage: 9,
    radius: 2.2,
    knockback: 1.2,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },

  {
    id: 'grindstone',
    name: 'Grindstone',
    desc: 'Set the rim against them and turn. Armor comes off in curls.',
    color: '#9a9484',
    code: 'Gn',
    cooldownTicks: 200, // 10 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 1.2,
    status: { status: 'sunder', power: 10, durationTicks: 60 },
  },

  {
    id: 'doorfall',
    name: 'Doorfall',
    desc: 'Lift the wall and lay it down on them. Doors open both ways.',
    color: '#7d8a9a',
    code: 'Do',
    cooldownTicks: 210, // 10.5 s
    castTicks: 22,
    shape: 'ground_aoe',
    damage: 12,
    range: 4,
    radius: 2.0,
    fuseTicks: 8,
    knockback: 1.4,
  },

  {
    id: 'held_gate',
    name: 'Held Gate',
    desc: 'Brace, and hold the cold line of the lane. Nothing crosses while you breathe.',
    color: '#7ab0cc',
    code: 'Hg',
    cooldownTicks: 190, // 9.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 6,
    width: 0.7,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  {
    id: 'sunbrass',
    name: 'Sunbrass',
    desc: 'Catch noon on the boss and turn it loose. Brass remembers the sun.',
    color: '#d9b45e',
    code: 'Sb',
    cooldownTicks: 230, // 11.5 s
    castTicks: 24,
    shape: 'nova',
    damage: 10,
    radius: 2.6,
    knockback: 1.0,
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },

  {
    id: 'millwall',
    name: 'Millwall',
    desc: 'The wall turns like a mill wheel. Every turn throws the water back.',
    color: '#8a94a4',
    code: 'Mw',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.1,
    knockback: 0.8,
  },

  {
    id: 'anchorfall',
    name: 'Anchorfall',
    desc: 'Be the anchor. The sea parts where you land and stays parted.',
    color: '#6a94b0',
    code: 'Ac',
    cooldownTicks: 250, // 12.5 s
    castTicks: 22,
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 8,
    radius: 2.2,
    knockback: 1.6,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

  {
    id: 'patient_wall',
    name: 'The Patient Wall',
    desc: 'The wall advances one strike at a time. It has nowhere else to be.',
    color: '#a4988a',
    code: 'Pl',
    cooldownTicks: 230, // 11.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.2,
    arc: 1.4,
    knockback: 0.5,
  },

  {
    id: 'standing_sun',
    name: 'The Standing Sun',
    desc: 'Plant the light like a standard. Where it stands, the day holds.',
    color: '#e8cc84',
    code: 'Su',
    cooldownTicks: 240, // 12 s
    castTicks: 26,
    shape: 'ground_aoe',
    damage: 14,
    range: 5,
    radius: 2.4,
    fuseTicks: 10,
    knockback: 1.2,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'winterhold',
    name: 'Winterhold',
    desc: 'The cold keep, held from behind the boss. The court freezes outward.',
    color: '#a0c8dc',
    code: 'Wt',
    cooldownTicks: 270, // 13.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.3,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  // ----------------------------- THE SHIELD SKILL — the wall's ladder
  // The school of the tank: control, protection, retribution. Damage
  // arts run leaner than melee's — the wall's worth is what it stops.
  {
    id: 'shield_bash',
    name: 'Shield Bash',
    desc: 'Swing the wall itself. Few arguments survive it.',
    color: '#8ea4b8',
    code: 'Ba',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 9,
    range: 1.9,
    arc: 1.0,
    knockback: 1.6,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },

  {
    id: 'set_the_wall',
    name: 'Set the Wall',
    desc: 'Plant your feet and become the thing they break against.',
    color: '#7d8a9a',
    code: 'Se',
    cooldownTicks: 260, // 13 s
    shape: 'self_buff',
    damage: 0,
    self: { armor: 8, durationTicks: 160 },
  },

  {
    id: 'shield_rush',
    name: 'Shield Rush',
    desc: 'Boss first, and drive — the road opens where they were standing.',
    color: '#9aa8b8',
    code: 'Sr',
    cooldownTicks: 180, // 9 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 7.2,
    travel: 'charge',
    knockback: 2.2,
  },

  {
    id: 'draw_iron',
    name: 'Draw Iron',
    desc: 'A shout with iron in it. Every blade in the yard turns to you.',
    color: '#c9a45e',
    code: 'Di',
    cooldownTicks: 320, // 16 s
    castFreezeTicks: 3,
    shape: 'nova',
    damage: 2, // the shout barely bruises — the TURNING is the payload
    radius: 3.2,
    tauntRadius: 3.2,
  },

  {
    id: 'shield_roof',
    name: 'Shield Roof',
    desc: "Pull the sky down to arm's reach and wait out the rain of blows.",
    color: '#8a7a5e',
    code: 'Ro',
    cooldownTicks: 340, // 17 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 16, speedMult: 0.85, durationTicks: 160 },
  },

  {
    id: 'turned_blow',
    name: 'Turned Blow',
    desc: 'Angle the wall so the blow goes home to whoever sent it.',
    color: '#b87a5e',
    code: 'Tb',
    cooldownTicks: 300, // 15 s
    shape: 'self_buff',
    damage: 0,
    self: { reflectFrac: 0.3, durationTicks: 120 },
  },

  {
    id: 'rampart_break',
    name: 'Rampart Break',
    desc: 'Drive the rim into the earth until the ground picks a side.',
    color: '#7a8494',
    code: 'Rb',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'ground_aoe',
    damage: 12,
    range: 4,
    radius: 2.2,
    fuseTicks: 8,
    knockback: 1.5,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  {
    id: 'wheel_of_iron',
    name: 'Wheel of Iron',
    desc: 'Loose the wall spinning. It remembers your arm and comes back.',
    color: '#aab6c4',
    code: 'Wi',
    cooldownTicks: 210, // 10.5 s
    shape: 'projectile_fan',
    damage: 9,
    range: 9,
    projectiles: 1,
    projectileSpeed: 13,
    pierce: true,
    returns: true,
    knockback: 1.4,
  },

  {
    id: 'hold_the_line',
    name: 'Hold the Line',
    desc: 'Mark the ground you keep. Whoever crosses learns why it holds.',
    color: '#8a94a4',
    code: 'Hl',
    cooldownTicks: 300, // 15 s
    shape: 'ground_field',
    damage: 4,
    range: 2,
    radius: 2.4,
    fieldTicks: 140,
    pulseEveryTicks: 20,
    status: { status: 'chill', power: 1, durationTicks: 30 },
  },

  {
    id: 'unbroken',
    name: 'Unbroken',
    desc: 'The great stand: the wall, the arm, and no step backward.',
    color: '#e8d5a0',
    code: 'Un',
    cooldownTicks: 400, // 20 s
    castFreezeTicks: 4,
    shape: 'self_buff',
    damage: 0,
    self: { armor: 12, shieldHp: 20, reflectFrac: 0.35, durationTicks: 160 },
  },

  {
    id: 'champions_wall',
    name: "Champion's Wall",
    desc: 'The wall a champion could not carry past you. It rings, and dares the rest.',
    color: '#d8b76a',
    code: 'Cw',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 4,
    shape: 'pulse_nova',
    damage: 6,
    radius: 2.3,
    pulses: 3,
    pulseEveryTicks: 10,
    knockback: 1.2,
    tauntRadius: 4.0,
  },
];

export const SHIELD_LADDER: TechniqueDef[] = [
  // --------------------------- THE SHIELD SKILL — the wall's rungs
  {
    ability: 'shield_bash',
    style: 'shield',
    unlockLevel: 5,
    ranks: [
      { note: 'The face lands heavier.', damage: 11 },
      { note: 'The jolt of it holds them a beat longer.', status: { status: 'shock', power: 1, durationTicks: 45 } },
      { note: 'The wall swings last — and once.', damage: 12, knockback: 2.6 },
    ],
  },
  {
    ability: 'iron_toll',
    style: 'shield',
    unlockLevel: 10,
    ranks: [
      { note: 'The bell rings harder.', damage: 11 },
      { note: 'The toll carries further, and throws.', radius: 2.6, knockback: 1.4 },
      { note: 'The bell answers sooner, and the ring holds.', damage: 12, cooldownTicks: 170, castTicks: 18, status: { status: 'shock', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'set_the_wall',
    style: 'shield',
    unlockLevel: 15,
    ranks: [
      { note: 'The stance sets deeper.', self: { armor: 11, durationTicks: 160 } },
      { note: 'A skin of iron over the iron.', self: { armor: 11, shieldHp: 6, durationTicks: 160 } },
      { note: 'While the wall stands, so do you.', self: { armor: 14, shieldHp: 8, durationTicks: 180 } },
    ],
  },
  {
    ability: 'grindstone',
    style: 'shield',
    unlockLevel: 20,
    ranks: [
      { note: 'The rim grinds harder.', damage: 5 },
      { note: 'The stone turns a fourth time.', channelTicks: 64 },
      { note: 'The curls come off deeper.', cooldownTicks: 190, status: { status: 'sunder', power: 15, durationTicks: 60 } },
    ],
  },
  {
    ability: 'shield_rush',
    style: 'shield',
    unlockLevel: 25,
    ranks: [
      { note: 'The drive hits harder.', damage: 10 },
      { note: 'A longer road, sooner open.', dashTiles: 8.8, cooldownTicks: 170 },
      { note: 'They stagger cold from your road.', knockback: 3.4, status: { status: 'chill', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'doorfall',
    style: 'shield',
    unlockLevel: 30,
    ranks: [
      { note: 'The door lands heavier.', damage: 14 },
      { note: 'The frame is wider than they thought.', radius: 2.3, knockback: 1.8 },
      { note: 'The hinge learns to swing again sooner.', damage: 15, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'draw_iron',
    style: 'shield',
    unlockLevel: 35,
    ranks: [
      { note: 'The shout carries farther.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 300 },
      { note: 'Iron answers those who answer.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 300, self: { armor: 6, durationTicks: 80 } },
      { note: 'The whole yard hears its name.', radius: 5.0, tauntRadius: 5.0, cooldownTicks: 300, self: { armor: 8, durationTicks: 100 } },
    ],
  },
  {
    ability: 'held_gate',
    style: 'shield',
    unlockLevel: 40,
    ranks: [
      { note: 'The gate bites colder.', damage: 5 },
      { note: 'The cold holds them longer and the line runs wider.', width: 0.9, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The gate holds a fourth breath.', channelTicks: 64, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'shield_roof',
    style: 'shield',
    unlockLevel: 45,
    ranks: [
      { note: 'The roof bears more weather.', self: { shieldHp: 22, speedMult: 0.85, durationTicks: 160 } },
      { note: 'The weight learns your shoulders.', self: { shieldHp: 22, speedMult: 0.95, durationTicks: 160 } },
      { note: 'Let it rain.', self: { shieldHp: 30, speedMult: 0.95, durationTicks: 180 } },
    ],
  },
  {
    ability: 'sunbrass',
    style: 'shield',
    unlockLevel: 50,
    ranks: [
      { note: 'The brass burns brighter.', damage: 11 },
      { note: 'Noon reaches the whole yard.', radius: 2.9, status: { status: 'burn', power: 1, durationTicks: 60 } },
      { note: 'The sun comes back around sooner.', damage: 12, cooldownTicks: 210 },
    ],
  },
  {
    ability: 'turned_blow',
    style: 'shield',
    unlockLevel: 54,
    ranks: [
      { note: 'More of the blow goes home.', self: { reflectFrac: 0.45, durationTicks: 120 } },
      { note: 'The angle hardens the arm that holds it.', self: { reflectFrac: 0.45, armor: 4, durationTicks: 120 } },
      { note: 'The wall keeps nothing that was sent to it.', self: { reflectFrac: 0.6, armor: 4, durationTicks: 140 } },
    ],
  },
  {
    ability: 'millwall',
    style: 'shield',
    unlockLevel: 58,
    ranks: [
      { note: 'The wheel strikes harder.', damage: 5 },
      { note: 'The wall turns wider.', radius: 2.4 },
      { note: 'The water is thrown well back.', knockback: 1.2, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'rampart_break',
    style: 'shield',
    unlockLevel: 62,
    ranks: [
      { note: 'The rim bites deeper ground.', damage: 15 },
      { note: 'The break spreads wider, oftener.', radius: 2.6, cooldownTicks: 200 },
      { note: 'The yard breaks with them.', damage: 16, knockback: 2.4 },
    ],
  },
  {
    ability: 'anchorfall',
    style: 'shield',
    unlockLevel: 66,
    ranks: [
      { note: 'The anchor lands heavier.', damage: 13 },
      { note: 'The parted sea reaches further, colder.', radius: 2.6, status: { status: 'chill', power: 1, durationTicks: 70 } },
      { note: 'The anchor is raised again sooner.', damage: 14, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'wheel_of_iron',
    style: 'shield',
    unlockLevel: 70,
    ranks: [
      { note: 'The wheel spins heavier.', damage: 11 },
      { note: 'A longer arc out, a shorter wait after.', range: 11, cooldownTicks: 190 },
      { note: 'The rim rings them senseless.', knockback: 2.2, status: { status: 'shock', power: 1, durationTicks: 30 } },
    ],
  },
  {
    ability: 'patient_wall',
    style: 'shield',
    unlockLevel: 74,
    ranks: [
      { note: 'The advance lands heavier.', damage: 5 },
      { note: 'The wall reaches wider.', arc: 1.7 },
      { note: 'Patience moves them after all.', knockback: 0.9, cooldownTicks: 210 },
    ],
  },
  {
    ability: 'hold_the_line',
    style: 'shield',
    unlockLevel: 78,
    ranks: [
      { note: 'The line argues harder.', damage: 6 },
      { note: 'The ground holds it longer.', fieldTicks: 180 },
      { note: 'This far. The ground itself agrees.', damage: 7, radius: 2.8, status: { status: 'chill', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'standing_sun',
    style: 'shield',
    unlockLevel: 82,
    ranks: [
      { note: 'The standard burns brighter.', damage: 15 },
      { note: 'The day holds a wider ground.', radius: 2.8 },
      { note: 'The light is planted quicker.', damage: 16, cooldownTicks: 220, castTicks: 24 },
    ],
  },
  {
    ability: 'winterhold',
    style: 'shield',
    unlockLevel: 86,
    ranks: [
      { note: 'The keep bites colder.', damage: 5 },
      { note: 'The court freezes wider.', radius: 2.7 },
      { note: 'Winter keeps them longer.', cooldownTicks: 250, status: { status: 'chill', power: 1, durationTicks: 80 } },
    ],
  },
  {
    ability: 'unbroken',
    style: 'shield',
    unlockLevel: 90,
    ranks: [
      { note: 'The stand holds more.', self: { armor: 14, shieldHp: 26, reflectFrac: 0.45, durationTicks: 160 } },
      { note: 'The stand knits the arm that keeps it.', self: { armor: 14, shieldHp: 26, reflectFrac: 0.45, heal: 6, durationTicks: 160 } },
      { note: 'Unbroken keeps its word.', self: { armor: 16, shieldHp: 32, reflectFrac: 0.5, heal: 10, durationTicks: 180 } },
    ],
  },
  {
    ability: 'champions_wall',
    style: 'shield',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The wall rings louder.', damage: 7 },
      { note: 'A fourth ring answers the third.', pulses: 4 },
      { note: 'The dare carries to the back of the yard.', tauntRadius: 5.0, knockback: 2.0 },
    ],
  },
];
