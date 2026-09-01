/**
 * THE OPEN LADDERS — new-school arts and the first breath rows: melee, archery, arx, sneak, the wall, the colossus, the pair, the veteran, and the unwritten page.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const LADDER_DEFS: AbilityDef[] = [
  // ------------------------------------ THE OPEN LADDER — new melee arts
  {
    id: 'bull_rush',
    name: 'Bull Rush',
    desc: 'Lower the shoulder and become the argument.',
    color: '#c48a5a',
    code: 'Br',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 6.4,
    travel: 'charge',
    knockback: 2.0,
  },
  {
    id: 'warcry',
    name: 'Warcry',
    desc: 'A shout that hardens into armor around you.',
    color: '#d9b05a',
    code: 'Wc',
    cooldownTicks: 280, // 14 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 6, speedMult: 1.1, durationTicks: 120 },
  },
  {
    id: 'steel_wave',
    name: 'Steel Wave',
    desc: 'Hurl the swing itself — an arc of edges that keeps going.',
    color: '#b8bec8',
    code: 'Sw',
    cooldownTicks: 180, // 9 s
    shape: 'projectile_fan',
    damage: 6,
    range: 4.5,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 14,
    pierce: true,
  },
  {
    id: 'stagger_stomp',
    name: 'Stagger Stomp',
    desc: 'Bring your heel down; the floor passes it on.',
    color: '#a4886a',
    code: 'Sp',
    cooldownTicks: 200, // 10 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 7,
    radius: 2.0,
    knockback: 1.6,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },
  {
    id: 'headsman_stroke',
    name: "Headsman's Stroke",
    desc: 'One clean arc for those already kneeling.',
    color: '#8a4a3a',
    code: 'Hk',
    cooldownTicks: 190, // 9.5 s
    castFreezeTicks: 5,
    shape: 'melee_arc',
    damage: 12,
    range: 2.2,
    arc: 0.9,
    executeBelow: { frac: 0.3, mult: 1.8 },
  },
  {
    id: 'warlords_descent',
    name: "Warlord's Descent",
    desc: 'Arrive like a banner planted — the shout follows you down.',
    color: '#d9a05a',
    code: 'Wd',
    cooldownTicks: 240, // 12 s
    castFreezeTicks: 4,
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 8.0,
    radius: 2.3,
    knockback: 2.0,
    self: { shieldHp: 5, speedMult: 1.1, durationTicks: 100 },
  },

  // ------------------- THE BREATH BETWEEN RUNGS — onehand breath arts
  // THE DRAWN BREATH's content wave: ten new blade voices (originally
  // seated between the founding rungs; THE LONG ROAD now interleaves
  // the whole school across 5..90), five casted and five channeled, each
  // carrying one element so gear may someday favor it. Casted arts
  // carry no castFreezeTicks (the wind-up IS the commit); channels
  // never ride a ground_field.
  {
    id: 'ember_edge',
    name: 'Ember Edge',
    desc: 'Draw the cut through a held breath of fire. What it touches keeps burning.',
    color: '#e8763c',
    code: 'Ee',
    cooldownTicks: 170, // 8.5 s
    castTicks: 18, // 0.9 s wound, 0.72 s planted
    shape: 'melee_arc',
    damage: 8,
    range: 2.2,
    arc: 1.2,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'millwork',
    name: 'Millwork',
    desc: 'Set your feet and turn the blade like the wheel. Every beat grinds.',
    color: '#c8b088',
    code: 'Mk',
    cooldownTicks: 200, // 10 s
    channelTicks: 48, // 2.4 s held, three turns of the wheel
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 2.4,
  },
  {
    id: 'levinstroke',
    name: 'Levinstroke',
    desc: 'Hold the blade high until it crackles, then loose the levin in a line.',
    color: '#8ab8f0',
    code: 'Lv',
    cooldownTicks: 190, // 9.5 s
    castTicks: 20, // 1 s drawn, 0.8 s planted
    shape: 'projectile_fan',
    damage: 11,
    range: 14,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true, // the storm does not stop for the first opinion
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },
  {
    id: 'red_ledger',
    name: 'Red Ledger',
    desc: 'Hold the point out and open the account. Every beat takes its due in red.',
    color: '#c03848',
    code: 'Rl',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48, // 2.4 s held, three entries in the book
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 6,
    width: 0.5, // the tether's corridor, red_thread's proven slimness
    drainFrac: 0.35, // what the ledger takes, it pays you
  },
  {
    id: 'cold_iron',
    name: 'Cold Iron',
    desc: 'Plant cold iron at your mark. Winter takes it from there.',
    color: '#9cc8dc',
    code: 'Ci',
    cooldownTicks: 220, // 11 s
    castTicks: 24, // 1.2 s wound, 0.96 s planted
    shape: 'ground_aoe',
    damage: 10,
    range: 8,
    radius: 2.0,
    fuseTicks: 14,
    status: { status: 'chill', power: 1, durationTicks: 80 },
  },
  {
    id: 'frostwork',
    name: 'Frostwork',
    desc: 'Stand fast and let the cold work outward. The ground itself takes the pattern.',
    color: '#bce4f0',
    code: 'Fw',
    cooldownTicks: 240, // 12 s
    channelTicks: 64, // 3.2 s held, four rings of the pattern
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 3,
    radius: 2.2,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'first_light',
    name: 'First Light',
    desc: 'Plant your feet and gather the dawn, then arrive like light through a doorway.',
    color: '#f0dca0',
    code: 'Fl',
    cooldownTicks: 200, // 10 s
    castTicks: 20, // 1 s gathered, 0.8 s planted
    shape: 'dash_strike',
    damage: 12,
    dashTiles: 7.0,
    travel: 'charge',
  },
  {
    id: 'live_iron',
    name: 'Live Iron',
    desc: 'Hold the blade up and let the storm take it. Every beat leaps for the next throat.',
    color: '#e8d84a',
    code: 'Li',
    cooldownTicks: 240, // 12 s
    channelTicks: 48, // 2.4 s held, three peals of the circuit
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 3,
    range: 8,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },
  {
    id: 'gloomfall',
    name: 'Gloomfall',
    desc: 'Gather the dark along the edge, then pour out night in a ring.',
    color: '#6a5a88',
    code: 'Gf',
    cooldownTicks: 240, // 12 s
    castTicks: 26, // 1.3 s gathered, 1.04 s planted
    shape: 'nova',
    damage: 13,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 60 }, // the gloom drags at the heels
  },
  {
    id: 'noonfall',
    name: 'Noonfall',
    desc: 'Stake a ring and hold noon over it. Shafts of light hammer every beat.',
    color: '#f8e8b0',
    code: 'Nn',
    cooldownTicks: 260, // 13 s
    channelTicks: 64, // 3.2 s held, four falls of the light
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 10,
    radius: 2.2,
    fuseTicks: 12,
  },

  // ---------------------- THE BREATH BETWEEN RUNGS — arx breath arts
  // The mage school's breath wave: ten new askings of the world
  // (originally seated between the founding rungs; THE LONG ROAD now
  // interleaves the whole school across 5..90), five casted and five channeled,
  // each speaking for ONE element the founding roster never claimed
  // whole (wick fire, the rime road, the gale, the quarry, the deep
  // well, the anvil cloud, the hollow, the lens, the early moon, the
  // far sky). Casted arts carry no castFreezeTicks; channels never
  // ride a ground_field.
  {
    id: 'wickfire',
    name: 'Wickfire',
    desc: 'Light the wick and let it fly. The flame arrives still hungry.',
    color: '#ff9a4a',
    code: 'Wk',
    cooldownTicks: 180, // 9 s
    castTicks: 18, // 0.9 s lit, 0.72 s planted
    shape: 'projectile_fan',
    damage: 10,
    range: 10,
    projectiles: 1,
    spreadArc: 0,
    projectileSpeed: 13,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'rime_river',
    name: 'Rime River',
    desc: 'Pour winter from your hand and hold the pour. The cold leaves a road.',
    color: '#9ad4ec',
    code: 'Rv',
    cooldownTicks: 200, // 10 s
    channelTicks: 48, // 2.4 s held, three reaches of the river
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 11,
    width: 0.5,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 70 },
  },
  {
    id: 'windshear',
    name: 'Windshear',
    desc: 'Draw the whole sky in, then hand it back all at once.',
    color: '#c2e8c8',
    code: 'Wn',
    cooldownTicks: 200, // 10 s
    castTicks: 20, // 1 s indrawn, 0.8 s planted
    shape: 'nova',
    damage: 11,
    radius: 2.6,
    knockback: 2.2,
    element: 'gale',
  },
  {
    id: 'stonerise',
    name: 'Stonerise',
    desc: 'Ask the ground to stand up. Every beat, another row answers.',
    color: '#c8a25f',
    code: 'Se',
    cooldownTicks: 220, // 11 s
    channelTicks: 48, // 2.4 s held, three rows of the quarry
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 9,
    radius: 2.0,
    fuseTicks: 12,
    knockback: 1.2,
    element: 'stone',
  },
  {
    id: 'geyser',
    name: 'Geyser',
    desc: 'Wake the deep water under their feet. It rises without asking twice.',
    color: '#8ec8dc',
    code: 'Gy',
    cooldownTicks: 220, // 11 s
    castTicks: 22, // 1.1 s drawn up, 0.88 s planted
    shape: 'ground_aoe',
    damage: 12,
    range: 10,
    radius: 2.0,
    fuseTicks: 14,
    knockback: 1.8,
    element: 'tide',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'anvil_sky',
    name: 'Anvil Sky',
    desc: 'Call the cloud down to forge height and hold it. Every beat, the hammer.',
    color: '#efe27a',
    code: 'Av',
    cooldownTicks: 240, // 12 s
    channelTicks: 64, // 3.2 s held, four falls of the hammer
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 3,
    radius: 2.4,
    element: 'storm',
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },
  {
    id: 'hollowcall',
    name: 'Hollowcall',
    desc: 'Open a small nothing where you point. Everything nearby is invited.',
    color: '#8a6ad0',
    code: 'Ho',
    cooldownTicks: 240, // 12 s
    castTicks: 24, // 1.2 s opened, 0.96 s planted
    shape: 'ground_aoe',
    damage: 12,
    range: 11,
    radius: 2.2,
    fuseTicks: 16,
    knockback: -2.0, // the invitation: a pull to the hollow's mouth
    element: 'void',
  },
  {
    id: 'burning_glass',
    name: 'Burning Glass',
    desc: 'Narrow the noon through a held lens. What the line crosses smolders.',
    color: '#ffd98a',
    code: 'Bg',
    cooldownTicks: 220, // 11 s
    channelTicks: 48, // 2.4 s held, three focusings of the lens
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 10,
    width: 0.5,
    element: 'radiant',
    status: { status: 'burn', power: 1, durationTicks: 40 },
  },
  {
    id: 'moonrise',
    name: 'Moonrise',
    desc: 'Bring the moon up early. Everything under it slows in the silver.',
    color: '#d8e2f8',
    code: 'Mo',
    cooldownTicks: 240, // 12 s
    castTicks: 26, // 1.3 s raised, 1.04 s planted
    shape: 'nova',
    damage: 13,
    radius: 2.4,
    element: 'lunar',
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'cometfall',
    name: 'Cometfall',
    desc: 'Ask the far sky for stones. Hold the asking, and they keep coming.',
    color: '#b8ecff',
    code: 'Cf',
    cooldownTicks: 260, // 13 s
    channelTicks: 64, // 3.2 s held, four visitors from far away
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 11,
    radius: 2.2,
    fuseTicks: 12,
    element: 'astral',
    status: { status: 'shock', power: 1, durationTicks: 50 },
  },

  // ---------------------------------- THE OPEN LADDER — new archery arts
  {
    id: 'longshot',
    name: 'Longshot',
    desc: 'One arrow, one line, everything on it.',
    color: '#7a9a5a',
    code: 'Lo',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 9,
    range: 18,
    projectiles: 1,
    projectileSpeed: 20,
    pierce: true,
  },
  {
    id: 'snare_shot',
    name: 'Snare Shot',
    desc: 'Loose a trap instead of an arrow — the ground keeps it.',
    color: '#a08a4a',
    code: 'Ss',
    cooldownTicks: 260, // 13 s
    shape: 'summon',
    damage: 4,
    range: 8, // rides the arrow: the trap plants at the aimed point
    summon: { kind: 'snare_trap', durationTicks: 500, radius: 1.2, power: 1 },
  },
  {
    id: 'ricochet',
    name: 'Ricochet',
    desc: 'An arrow that changes its mind mid-air — twice.',
    color: '#8a7a4a',
    code: 'Rc',
    cooldownTicks: 170, // 8.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.5,
    chainTargets: 2,
  },
  {
    id: 'skyfall_shot',
    name: 'Skyfall Shot',
    desc: 'Loose it at the clouds and count to two.',
    color: '#6b8a6a',
    code: 'Sk',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 12,
    range: 13,
    radius: 1.8,
    fuseTicks: 16,
    knockback: 1.2,
  },
  {
    id: 'phantom_flight',
    name: 'Phantom Flight',
    desc: 'An arrow that flies out pale and comes home red.',
    color: '#9aa8b8',
    code: 'Pf',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 8,
    range: 11,
    projectiles: 1,
    projectileSpeed: 15,
    pierce: true,
    returns: true,
  },
  {
    id: 'arrow_tempest',
    name: 'Arrow Tempest',
    desc: 'Five shafts loosed as one storm, each picking its own throat.',
    color: '#5a7a8a',
    code: 'At',
    cooldownTicks: 240, // 12 s
    shape: 'projectile_fan',
    damage: 5,
    range: 10,
    projectiles: 5,
    spreadArc: 1.2,
    projectileSpeed: 15,
    homing: 5.0,
    element: 'storm', // storm-wreathed seekers — the school the eye reads
  },

  // -------------------------------------- THE OPEN LADDER — new Arx arts
  {
    id: 'frost_lance',
    name: 'Frost Lance',
    desc: 'One cold line from your hand to the horizon — it holds.',
    color: '#8ac4e8',
    code: 'Fl',
    cooldownTicks: 180, // 9 s
    castFreezeTicks: 4,
    shape: 'beam',
    damage: 8,
    range: 12,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'ward_shell',
    name: 'Ward Shell',
    desc: 'A shell of quiet light that takes the blows meant for you.',
    color: '#b49af0',
    code: 'Ws',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 10, durationTicks: 160 },
  },
  {
    id: 'ember_fan',
    name: 'Ember Fan',
    desc: 'Spread a hand of fire — every finger burns.',
    color: '#ff9a44',
    code: 'Ef',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 6,
    range: 9,
    projectiles: 3,
    spreadArc: 0.7,
    projectileSpeed: 14,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },
  {
    id: 'stormcall',
    name: 'Stormcall',
    desc: 'Ask the sky to strike here, and keep striking.',
    color: '#e8e06a',
    code: 'Sc',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 5,
    range: 11,
    radius: 2.2,
    fieldTicks: 100,
    pulseEveryTicks: 12,
    status: { status: 'shock', power: 1, durationTicks: 40 },
  },
  {
    id: 'mirror_image',
    name: 'Mirror Image',
    desc: 'Step aside and leave yourself standing there.',
    color: '#b8a8e8',
    code: 'Mi',
    cooldownTicks: 320, // 16 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'decoy', durationTicks: 160, radius: 5, power: 0 },
  },
  {
    id: 'daybreak',
    name: 'Daybreak',
    desc: 'Noon, delivered early, to an address of your choosing.',
    color: '#ffd98a',
    code: 'Db',
    cooldownTicks: 280, // 14 s
    // THE DRAWN BREATH's pilot: 1.2 s wound on the move, ~0.96 s
    // planted. The post-fire root retires — the wind-up IS the commit,
    // and THE PRICED BREATH pays it back in payload (14 → 15).
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 15,
    range: 12,
    radius: 2.4,
    fuseTicks: 22,
    element: 'radiant',
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  // ------------------------------------ THE OPEN LADDER — new sneak arts
  {
    id: 'ghost_step',
    name: 'Ghost Step',
    desc: 'Walk through them like a rumor — the cut arrives before you do.',
    color: '#8a7fae',
    code: 'Gt',
    cooldownTicks: 170, // 8.5 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 6.8,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },
  {
    id: 'caltrops',
    name: 'Caltrops',
    desc: 'Sow the floor with iron teeth; whoever crosses, pays.',
    color: '#7a7468',
    code: 'Ca',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 3,
    range: 7,
    radius: 1.8,
    fieldTicks: 140,
    pulseEveryTicks: 16,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },
  {
    id: 'fan_of_knives',
    name: 'Fan of Knives',
    desc: 'Every direction at once, every edge yours.',
    color: '#a8a4b8',
    code: 'Fk',
    cooldownTicks: 200, // 10 s
    shape: 'nova',
    damage: 6,
    radius: 2.2,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'feint_double',
    name: 'Feint Double',
    desc: 'Leave a lie standing where you were.',
    color: '#8a8494',
    code: 'Fd',
    cooldownTicks: 300, // 15 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'decoy', durationTicks: 140, radius: 5, power: 0 },
  },
  {
    id: 'exposing_strike',
    name: 'Exposing Strike',
    desc: 'Find the seam in them and make it official.',
    color: '#9a6a8a',
    code: 'Ex',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.0,
    arc: 0.9,
    executeBelow: { frac: 0.35, mult: 1.8 },
  },
  {
    id: 'thousand_cuts',
    name: 'Thousand Cuts',
    desc: 'Stop counting. Start cutting.',
    color: '#c4b8d8',
    code: 'Tc',
    cooldownTicks: 220, // 11 s
    shape: 'flurry',
    damage: 3,
    range: 2.0,
    arc: 0.9,
    hits: 5,
    pulseEveryTicks: 4,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
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

  // --------------------------- THE GREAT SCHOOL — the colossus's arts
  // The school of weight: huge dies on slow beats, arcs that treat the
  // crowd as one target, and momentum spent like coin. Damage runs
  // hot and wide — a greatweapon's worth is what it ends.
  {
    id: 'wide_swath',
    name: 'Wide Swath',
    desc: 'One level stroke at hip height. The front rank stops being a rank.',
    color: '#c47a3d',
    code: 'Ws',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.8,
    arc: 2.4,
    knockback: 1.2,
  },
  {
    id: 'haft_check',
    name: 'Haft Check',
    desc: 'The butt end, driven short and rude. It buys the next swing its room.',
    color: '#8a7a68',
    code: 'Hc',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 2, // the shove barely bruises — the STAGGER is the payload
    range: 1.7,
    arc: 1.1,
    knockback: 2.4,
    status: { status: 'shock', power: 1, durationTicks: 35 },
  },
  {
    id: 'iron_pendulum',
    name: 'Iron Pendulum',
    desc: 'Two full swings, no apology between them.',
    color: '#9a8a78',
    code: 'Ip',
    cooldownTicks: 210, // 10.5 s
    shape: 'flurry',
    damage: 8,
    range: 2.5,
    arc: 1.6,
    hits: 2,
    pulseEveryTicks: 8,
    knockback: 1.1,
  },
  {
    id: 'fault_line',
    name: 'Fault Line',
    desc: 'Bring the edge down until the ground takes a side.',
    color: '#a06a48',
    code: 'Fl',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'ground_aoe',
    damage: 13,
    range: 4,
    radius: 2.0,
    fuseTicks: 8,
    knockback: 1.3,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'colossus_stance',
    name: 'Colossus Stance',
    desc: 'Walk like something too big to argue with. What you touch stays hurt.',
    color: '#b85e3a',
    code: 'Cs',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { speedMult: 1.1, onHitStatus: { status: 'bleed', power: 1, durationTicks: 60 }, durationTicks: 160 },
  },
  {
    id: 'skysunder',
    name: 'Skysunder',
    desc: 'Leave the ground. Come back down with a verdict.',
    color: '#c9924a',
    code: 'Sk',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 4,
    shape: 'leap_slam',
    damage: 14,
    dashTiles: 10.0,
    radius: 2.2,
    knockback: 1.8,
  },
  {
    id: 'executioners_arc',
    name: "Executioner's Arc",
    desc: 'The stroke kept for the nearly-done. It finishes sentences.',
    color: '#8a5a4a',
    code: 'Ea',
    cooldownTicks: 240, // 12 s
    shape: 'melee_arc',
    damage: 12,
    range: 2.6,
    arc: 1.5,
    executeBelow: { frac: 0.35, mult: 2.0 },
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    desc: 'Three blows downhill. Nothing shovels itself out.',
    color: '#b0a494',
    code: 'Av',
    cooldownTicks: 260, // 13 s
    shape: 'flurry',
    damage: 7,
    range: 2.5,
    arc: 1.4,
    hits: 3,
    pulseEveryTicks: 9,
    knockback: 1.2,
  },
  {
    id: 'breaker_charge',
    name: 'Breaker Charge',
    desc: 'Shoulder the steel and go through, not around.',
    color: '#c47a3d',
    code: 'Bc',
    cooldownTicks: 220, // 11 s
    shape: 'dash_strike',
    damage: 13,
    dashTiles: 8.4,
    travel: 'charge',
    knockback: 2.6,
  },
  {
    id: 'titans_verdict',
    name: "Titan's Verdict",
    desc: 'Ring the earth three times. Let the rings do the talking.',
    color: '#e0a04c',
    code: 'Tv',
    cooldownTicks: 340, // 17 s
    castFreezeTicks: 5,
    shape: 'pulse_nova',
    damage: 9,
    radius: 2.6,
    pulses: 3,
    pulseEveryTicks: 11,
    knockback: 1.6,
  },

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

  // --------------------------- THE TWIN SCHOOL — the paired ladder
  // The school of tempo: everything arrives in pairs and the second
  // beat is the identity. Blows run lighter than melee's and land
  // oftener — two knives spend rhythm the way a greatblade spends
  // weight. Twin steel is melee steel; the school's own axis is time.
  {
    id: 'twin_cut',
    name: 'Twin Cut',
    desc: 'The one-two. The oldest thing two knives know how to say.',
    color: '#d9a441',
    code: 'Tc',
    cooldownTicks: 150, // 7.5 s
    shape: 'flurry',
    damage: 7,
    range: 2.0,
    arc: 1.2,
    hits: 2,
    pulseEveryTicks: 5,
  },
  {
    id: 'heron_step',
    name: 'Heron Step',
    desc: 'Step through, not around — one edge going in, one coming out.',
    color: '#9ab4c4',
    code: 'He',
    cooldownTicks: 170, // 8.5 s
    shape: 'dash_strike',
    damage: 9,
    dashTiles: 6.8,
    status: { status: 'bleed', power: 1, durationTicks: 50 },
  },
  {
    id: 'crossed_throw',
    name: 'Crossed Throw',
    desc: 'Loose both at once; they cross halfway there.',
    color: '#c4b48a',
    code: 'Cx',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 6,
    range: 8,
    projectiles: 2,
    spreadArc: 0.15,
    projectileSpeed: 14,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },
  {
    id: 'mirrored_hand',
    name: 'Mirrored Hand',
    desc: 'For eight breaths, there is no off hand.',
    color: '#e8d8a8',
    code: 'Mh',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { offhandWeight: 0.75, durationTicks: 160 },
  },
  {
    id: 'turning_reel',
    name: 'Turning Reel',
    desc: 'One full turn, both edges out. The ring around you empties.',
    color: '#b8a88a',
    code: 'Tr',
    cooldownTicks: 160, // 8 s
    shape: 'nova',
    damage: 10,
    radius: 2.1,
    knockback: 1.1,
  },
  {
    id: 'red_ribbons',
    name: 'Red Ribbons',
    desc: 'A weaving stance. Every pass, either hand, leaves a ribbon.',
    color: '#c44a3a',
    code: 'Rr',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: {
      speedMult: 1.08,
      onHitStatus: { status: 'bleed', power: 1, durationTicks: 60 },
      durationTicks: 160,
    },
  },
  {
    id: 'swallows_dive',
    name: "Swallow's Dive",
    desc: 'Up like a swallow. Down like two knives.',
    color: '#8ab4d8',
    code: 'Sd',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 3,
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 9.0,
    radius: 1.8,
    knockback: 1.2,
  },
  {
    id: 'the_shears',
    name: 'The Shears',
    desc: 'Two edges, closing. Most things are thread.',
    color: '#b0a4b8',
    code: 'Ts',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 11,
    range: 2.2,
    arc: 0.9,
    executeBelow: { frac: 0.3, mult: 2.2 },
  },
  {
    id: 'storm_of_two',
    name: 'Storm of Two',
    desc: 'Carry the storm with you — it rings once for each hand.',
    color: '#a8b0c0',
    code: 'S2',
    cooldownTicks: 240, // 12 s
    shape: 'pulse_nova',
    damage: 6,
    radius: 1.9,
    pulses: 3,
    pulseEveryTicks: 9,
    knockback: 0.8,
  },
  {
    id: 'hundred_hands',
    name: 'Hundred Hands',
    desc: 'Five cuts in a breath. Count the hands later.',
    color: '#e0c060',
    code: 'Hh',
    cooldownTicks: 300, // 15 s
    shape: 'flurry',
    damage: 5,
    range: 2.2,
    arc: 1.4,
    hits: 5,
    pulseEveryTicks: 5,
  },

  // ------------------------ THE VETERAN'S SCHOOL — the combat ladder
  // The school every fighter is already in. No weapon owns it: these
  // are the lessons the fight itself teaches — footing, breath, the
  // shout, the read of a guard — cast the same whatever the hand
  // holds. THE SHARED LESSON feeds the skill; this ladder spends it.
  // Grammar: dust and brass. Kicked grit, drill-yard iron, one horn
  // note — never an element, never a single school's steel.
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'The fight starts when you say it does.',
    color: '#c4553d',
    code: 'Fb',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.2,
    arc: 1.1,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'shoulder_check',
    name: 'Shoulder Check',
    desc: 'No blade needed. The whole body says move.',
    color: '#b09a7a',
    code: 'Sk',
    cooldownTicks: 170, // 8.5 s
    shape: 'dash_strike',
    damage: 9,
    dashTiles: 6,
    travel: 'charge',
    knockback: 1.5,
  },
  {
    id: 'war_shout',
    name: 'War Shout',
    desc: 'The oldest weapon is the voice.',
    color: '#d9b04a',
    code: 'Wh',
    cooldownTicks: 170, // 8.5 s
    shape: 'nova',
    damage: 9,
    radius: 2.4,
    knockback: 1.0,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },
  {
    id: 'second_breath',
    name: 'Second Breath',
    desc: 'The fight is long. Breathe like it.',
    color: '#a8c4b0',
    code: 'Sb',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    self: { heal: 10, speedMult: 1.1, durationTicks: 100 },
  },
  {
    id: 'loose_iron',
    name: 'Loose Iron',
    desc: 'A buckle, a camp nail, the pommel stone. It all flies.',
    color: '#8a8f98',
    code: 'Li',
    cooldownTicks: 180, // 9 s
    shape: 'projectile_fan',
    damage: 5,
    range: 7,
    projectiles: 3,
    spreadArc: 0.18,
    projectileSpeed: 13,
  },
  {
    id: 'hold_fast',
    name: 'Hold Fast',
    desc: 'Feet planted. The word given. Held.',
    color: '#7a8494',
    code: 'Hf',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    self: { armor: 4, shieldHp: 8, durationTicks: 140 },
  },
  {
    id: 'break_the_line',
    name: 'Break the Line',
    desc: 'A wall is only a wall until somebody walks through.',
    color: '#b0623c',
    code: 'Bl',
    cooldownTicks: 200, // 10 s
    castFreezeTicks: 3,
    shape: 'melee_arc',
    damage: 13,
    range: 2.4,
    arc: 1.5,
    knockback: 1.8,
  },
  {
    id: 'the_opening',
    name: 'The Opening',
    desc: 'Every guard opens once. Be already moving.',
    color: '#e0d0a0',
    code: 'Op',
    cooldownTicks: 190, // 9.5 s
    shape: 'melee_arc',
    damage: 13,
    range: 2.3,
    arc: 0.8,
    executeBelow: { frac: 0.3, mult: 2.0 },
  },
  {
    id: 'no_quarter',
    name: 'No Quarter',
    desc: 'None asked. None given.',
    color: '#a83c32',
    code: 'Nq',
    cooldownTicks: 210, // 10.5 s
    shape: 'flurry',
    damage: 5,
    range: 2.1,
    arc: 1.0,
    hits: 4,
    pulseEveryTicks: 5,
    drainFrac: 0.2,
  },
  {
    id: 'the_long_fight',
    name: 'The Long Fight',
    desc: 'You have been here before. You will be here after.',
    color: '#c9a44a',
    code: 'Lf',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 4,
    shape: 'pulse_nova',
    damage: 7,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 10,
    knockback: 0.8,
  },

  // ------------------------- THE UNWRITTEN PAGE — deed-earned arts
  // These never sit on a rung: an `art:<id>` flag opens each, set by
  // a deed (never drop-luck). Invisible everywhere until earned.
  {
    id: 'whirling_ruin',
    name: 'Whirling Ruin',
    desc: 'Plant your feet, set the great steel turning, and be the calm at the middle of it.',
    color: '#c8b494',
    code: 'Wu',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE: the whirlwind is HELD — six turns of the wheel,
    // the whole circle each beat, for as long as the feet stay planted.
    channelTicks: 60,
    pulseEveryTicks: 10,
    shape: 'melee_arc',
    damage: 3, // six quick cuts, each light — the payoff bracket holds at every level
    range: 2.2,
    arc: 3.15, // the full turn: everything around the hub is in the cone
    knockback: 0.5,
  },
  {
    id: 'winters_fall',
    name: "Winter's Fall",
    desc: 'Choose a patch of sky and ask it for winter, then hold it to the bargain.',
    color: '#a8d8e8',
    code: 'Wf',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE: the icicle fall is HELD over its staked patch —
    // one volley of ice per beat while the caller stands the note.
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 11,
    radius: 2.2,
    fuseTicks: 12,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'riftwalker_step',
    name: 'Riftwalker Step',
    desc: 'Step the way the rift taught you — through, and out the far side of them.',
    color: '#9a86d8',
    code: 'Rw',
    cooldownTicks: 190, // 9.5 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 8.8,
    travel: 'blink',
    element: 'void',
    status: { status: 'shock', power: 1, durationTicks: 50 },
  },
  {
    id: 'oathbound_edge',
    name: 'Oathbound Edge',
    desc: 'A sworn stroke — the crown remembers, and the oath repays the arm.',
    color: '#e8c04c',
    code: 'Oe',
    cooldownTicks: 200, // 10 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 11,
    range: 2.3,
    arc: 1.2,
    drainFrac: 0.2,
  },
  {
    id: 'warden_volley',
    name: "Warden's Volley",
    desc: 'The wall-top answer: a spread of shafts that says NO further.',
    color: '#8a9a78',
    code: 'Wv',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 6,
    range: 11,
    projectiles: 4,
    spreadArc: 0.9,
    projectileSpeed: 15,
    knockback: 1.2,
  },
  {
    id: 'whisper_fang',
    name: 'Whisper Fang',
    desc: 'One fang, spoken softly. It finds the throat that was named.',
    color: '#6a5a88',
    code: 'Wf',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 9,
    range: 12,
    projectiles: 1,
    projectileSpeed: 16,
    homing: 7.0,
    element: 'void',
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'giantsfall',
    name: 'Giantsfall',
    desc: 'The stroke that felled the biggest thing you ever swung at. It remembers how.',
    color: '#d88a4a',
    code: 'Gf',
    cooldownTicks: 240, // 12 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 15,
    range: 2.8,
    arc: 0.7, // one mark, the whole weight
    knockback: 2.0,
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
  {
    id: 'two_answers',
    name: 'Two Answers',
    desc: 'The champion asked once. You had two.',
    color: '#e8c878',
    code: 'Tw',
    cooldownTicks: 220, // 11 s
    shape: 'flurry',
    damage: 9,
    range: 2.1,
    arc: 1.0,
    hits: 2,
    pulseEveryTicks: 3,
    drainFrac: 0.15,
  },
  {
    id: 'four_roads',
    name: 'Four Roads',
    desc: 'Blade, both hands, string, staff. Every road taught the same hand.',
    color: '#d8c080',
    code: 'Fr',
    cooldownTicks: 210, // 10.5 s
    castFreezeTicks: 3,
    shape: 'nova',
    damage: 10,
    radius: 2.2,
    knockback: 1.0,
    self: { speedMult: 1.1, durationTicks: 80 },
  },
];
