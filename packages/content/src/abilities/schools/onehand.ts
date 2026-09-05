/**
 * THE ONEHAND SCHOOL — its twenty rung arts (and its unwritten page) with
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
export const ONEHAND_LICENSES: Record<string, string[]> = {};

export const ONEHAND_ARTS: AbilityDef[] = [
  // ------------------------------------------------------- techniques
  // Learned actives (R): unlocked by combat skill levels, freely
  // swappable — the visible payoff of the skill grind.
  {
    id: 'heavy_slam',
    name: 'Heavy Slam',
    desc: 'An overhead blow that cracks the ground and hurls enemies back.',
    color: '#b8865a',
    code: 'Hs',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 6,
    shape: 'melee_arc',
    damage: 10,
    range: 2.2,
    arc: 1.1,
    knockback: 2.8,
  },

  {
    id: 'whirlwind',
    name: 'Whirlwind',
    desc: 'Become the blade — three spinning cuts while you keep moving.',
    color: '#d9a05a',
    code: 'Ww',
    cooldownTicks: 240, // 12 s
    shape: 'pulse_nova',
    damage: 4,
    radius: 1.8,
    pulses: 3,
    pulseEveryTicks: 8,
    knockback: 0.8,
  },

  {
    id: 'bloodlust',
    name: 'Bloodlust',
    desc: 'For six seconds, every wound your blade deals feeds you.',
    color: '#c4372a',
    code: 'Bl',
    cooldownTicks: 280, // 14 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.4, durationTicks: 120 },
  },

  {
    id: 'earthbreaker',
    name: 'Earthbreaker',
    desc: 'Leap to your mark and land like a verdict — the ground concedes.',
    color: '#a4744b',
    code: 'Ek',
    cooldownTicks: 220, // 11 s
    shape: 'leap_slam',
    damage: 11,
    dashTiles: 9.0,
    radius: 2.2,
    knockback: 2.4,
  },

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
];

export const ONEHAND_LADDER: TechniqueDef[] = [
  {
    ability: 'heavy_slam',
    style: 'onehand',
    unlockLevel: 5,
    ranks: [
      { note: 'The blow lands heavier, and sooner.', damage: 12, cooldownTicks: 160 },
      {
        note: 'The swing opens wider; the follow-through frees your feet.',
        arc: 1.35,
        knockback: 3.4,
        castFreezeTicks: 4,
      },
      {
        note: 'The earth rings — struck foes reel.',
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'ember_edge',
    style: 'onehand',
    unlockLevel: 10,
    ranks: [
      { note: 'The edge bites deeper.', damage: 10 },
      {
        note: 'The fire keeps its grip longer.',
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
      { note: 'The kindling catches quicker, and oftener.', cooldownTicks: 160, castTicks: 16 },
    ],
  },
  {
    ability: 'bull_rush',
    style: 'onehand',
    unlockLevel: 15,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 10 },
      { note: 'A longer charge, sooner ready.', dashTiles: 8.4, cooldownTicks: 150 },
      { note: 'Nothing stands where you arrive.', damage: 11, knockback: 3.2 },
    ],
  },
  {
    ability: 'millwork',
    style: 'onehand',
    unlockLevel: 20,
    ranks: [
      { note: 'Every pass grinds harder.', damage: 5 },
      { note: 'The wheel turns a fourth time.', channelTicks: 64 },
      { note: 'The stone is ready again sooner.', cooldownTicks: 180 },
    ],
  },
  {
    ability: 'whirlwind',
    style: 'onehand',
    unlockLevel: 25,
    ranks: [
      { note: 'Each cut bites deeper.', damage: 5 },
      { note: 'The blade reaches a step farther.', radius: 2.1 },
      { note: 'The storm turns a fourth time.', pulses: 4 },
    ],
  },
  {
    ability: 'levinstroke',
    style: 'onehand',
    unlockLevel: 30,
    ranks: [
      { note: 'The stroke lands heavier.', damage: 13 },
      {
        note: 'The charge clings longer to what it strikes.',
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
      { note: 'The levin leaps from a shorter wind.', castTicks: 14, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'warcry',
    style: 'onehand',
    unlockLevel: 35,
    ranks: [
      {
        note: 'The shout holds more of the blow.',
        self: { shieldHp: 8, speedMult: 1.1, durationTicks: 120 },
      },
      { note: 'Your voice recovers faster.', cooldownTicks: 240 },
      {
        note: 'The war hears you, and hurries.',
        self: { shieldHp: 8, speedMult: 1.15, durationTicks: 140 },
      },
    ],
  },
  {
    ability: 'red_ledger',
    style: 'onehand',
    unlockLevel: 40,
    ranks: [
      { note: 'The toll rises.', damage: 5 },
      { note: 'More of the red comes home to you.', drainFrac: 0.5, cooldownTicks: 200 },
      { note: 'The account stays open a fourth beat.', channelTicks: 64 },
    ],
  },
  {
    ability: 'steel_wave',
    style: 'onehand',
    unlockLevel: 45,
    ranks: [
      { note: 'The edges bite deeper.', damage: 8 },
      { note: 'The wave rolls out oftener.', cooldownTicks: 160 },
      { note: 'A fourth blade joins the wave.', projectiles: 4, spreadArc: 0.6 },
    ],
  },
  {
    ability: 'cold_iron',
    style: 'onehand',
    unlockLevel: 50,
    ranks: [
      { note: 'The frost bites deeper.', damage: 12 },
      {
        note: 'Winter spreads wider and holds longer.',
        radius: 2.3,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
      { note: 'The iron goes in quicker, and colder.', damage: 13, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'bloodlust',
    style: 'onehand',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The red joy holds for eight seconds.',
        self: { meleeLifesteal: 0.4, durationTicks: 160 },
      },
      {
        note: 'Every wound feeds you more.',
        self: { meleeLifesteal: 0.55, durationTicks: 160 },
      },
      {
        note: 'The hunger quickens your stride.',
        self: { meleeLifesteal: 0.55, speedMult: 1.12, durationTicks: 160 },
      },
    ],
  },
  {
    ability: 'frostwork',
    style: 'onehand',
    unlockLevel: 58,
    ranks: [
      { note: 'Each beat etches deeper.', damage: 4 },
      {
        note: 'The pattern reaches farther and grips longer.',
        radius: 2.5,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'The work is ready again sooner.', cooldownTicks: 220 },
    ],
  },
  {
    ability: 'stagger_stomp',
    style: 'onehand',
    unlockLevel: 62,
    ranks: [
      { note: 'The heel falls heavier.', damage: 9 },
      { note: 'The floor passes it farther.', radius: 2.4, cooldownTicks: 180 },
      {
        note: 'The ring of it holds them reeling.',
        damage: 10,
        knockback: 2.2,
        status: { status: 'shock', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'first_light',
    style: 'onehand',
    unlockLevel: 66,
    ranks: [
      { note: 'You arrive harder.', damage: 14 },
      { note: 'The doorway opens farther off.', dashTiles: 9.0, cooldownTicks: 190 },
      { note: 'First light breaks from a shorter gather.', damage: 16, castTicks: 16 },
    ],
  },
  {
    ability: 'headsman_stroke',
    style: 'onehand',
    unlockLevel: 70,
    ranks: [
      { note: 'The arc lands heavier.', damage: 14 },
      { note: 'The stroke returns to the shoulder sooner.', cooldownTicks: 170 },
      { note: 'The verdict widens.', executeBelow: { frac: 0.35, mult: 2.0 } },
    ],
  },
  {
    ability: 'live_iron',
    style: 'onehand',
    unlockLevel: 74,
    ranks: [
      { note: 'The current bites deeper.', damage: 4 },
      { note: 'A fourth throat joins the circuit.', chainTargets: 4 },
      {
        note: 'The charge clings longer, and the iron rests less.',
        cooldownTicks: 230,
        status: { status: 'shock', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'earthbreaker',
    style: 'onehand',
    unlockLevel: 78,
    ranks: [
      { note: 'You land heavier.', damage: 13 },
      { note: 'The leap carries farther; the verdict spreads wider.', dashTiles: 11.0, radius: 2.5 },
      { note: 'The mountain falls oftener, and harder.', cooldownTicks: 190, knockback: 3.0 },
    ],
  },
  {
    ability: 'gloomfall',
    style: 'onehand',
    unlockLevel: 82,
    ranks: [
      { note: 'The dark falls heavier.', damage: 15 },
      {
        note: 'Night spreads wider and drags at more heels.',
        radius: 2.7,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'The gloom gathers quicker, and deeper.', damage: 16, castTicks: 22, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'noonfall',
    style: 'onehand',
    unlockLevel: 86,
    ranks: [
      { note: 'The light hammers harder.', damage: 5 },
      { note: 'Noon is sooner recalled.', cooldownTicks: 250 },
      { note: 'The ring widens, and the sun asks less.', radius: 2.5, cooldownTicks: 240 },
    ],
  },
  {
    ability: 'warlords_descent',
    style: 'onehand',
    unlockLevel: 90,
    ranks: [
      { note: 'You land heavier still.', damage: 14 },
      { note: 'The banner spreads wider, oftener.', radius: 2.6, cooldownTicks: 220 },
      {
        note: 'The war answers its lord — shield and stride.',
        knockback: 2.6,
        self: { shieldHp: 8, speedMult: 1.18, durationTicks: 120 },
      },
    ],
  },
  {
    ability: 'oathbound_edge',
    style: 'onehand',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The oath weighs more.', damage: 13 },
      { note: 'The vow opens wider, oftener.', arc: 1.4, cooldownTicks: 180 },
      { note: 'The oath repays in full.', drainFrac: 0.3 },
    ],
  },
];
