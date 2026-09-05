/**
 * THE DUALWIELD SCHOOL — its twenty rung arts (and its unwritten page) with
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
export const DUALWIELD_LICENSES: Record<string, string[]> = {};

export const DUALWIELD_ARTS: AbilityDef[] = [
  // ----------------- THE SECOND BREATH — the dualwield breath arts
  {
    id: 'two_bells',
    name: 'Two Bells',
    desc: 'Both edges ring at once. The pair of them is the whole carillon.',
    color: '#d9c46a',
    code: '2b',
    cooldownTicks: 160, // 8 s
    castTicks: 18,
    shape: 'melee_arc',
    damage: 10,
    range: 2.2,
    arc: 1.0,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },

  {
    id: 'ribbonwork',
    name: 'Ribbonwork',
    desc: 'The ribbons cross, and cross, and cross. Red suits everyone.',
    color: '#c45a4a',
    code: 'Rb',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 5,
    range: 2.1,
    arc: 1.1,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  {
    id: 'twin_moons',
    name: 'Twin Moons',
    desc: 'Both blades loosed on the same orbit. They always come home.',
    color: '#b8c4d8',
    code: 'Tn',
    cooldownTicks: 200, // 10 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 6,
    range: 9,
    projectiles: 2,
    spreadArc: 0.18,
    projectileSpeed: 16,
    returns: true,
  },

  {
    id: 'silver_reel',
    name: 'Silver Reel',
    desc: 'Spin the pair into one cold circle. The reel winds everything in reach.',
    color: '#a8c0cc',
    code: 'Sr',
    cooldownTicks: 230, // 11.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 5,
    radius: 1.9,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  {
    id: 'matched_flame',
    name: 'Matched Flame',
    desc: 'Two wicks, one held breath. The burst of strikes lands already burning.',
    color: '#e0854a',
    code: 'Mf',
    cooldownTicks: 220, // 11 s
    castTicks: 22,
    shape: 'flurry',
    damage: 6,
    range: 2.1,
    arc: 1.1,
    hits: 3,
    pulseEveryTicks: 6,
    status: { status: 'burn', power: 1, durationTicks: 40 },
  },

  {
    id: 'stormstitch',
    name: 'Stormstitch',
    desc: 'The left hand throws and the right answers. The seam runs foe to foe.',
    color: '#c8c86a',
    code: 'Sh',
    cooldownTicks: 220, // 11 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 5,
    range: 8,
    radius: 3.0,
    chainTargets: 2,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },

  {
    id: 'mirrorfall',
    name: 'Mirrorfall',
    desc: 'You and your reflection land together. Only one of you is survivable.',
    color: '#9ab8c8',
    code: 'Mi',
    cooldownTicks: 220, // 11 s
    castTicks: 20,
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 8,
    radius: 1.9,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  {
    id: 'the_weave',
    name: 'The Weave',
    desc: 'Warp and weft, held to the count. Every thread crosses the loom.',
    color: '#b0a4c0',
    code: 'Wv',
    cooldownTicks: 200, // 10 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 5,
    range: 2.2,
    arc: 1.3,
  },

  {
    id: 'first_and_last',
    name: 'First and Last',
    desc: 'The first cut opens the door. The last one closes it behind them.',
    color: '#e8d8a0',
    code: 'Fx',
    cooldownTicks: 190, // 9.5 s
    castTicks: 24,
    shape: 'melee_arc',
    damage: 12,
    range: 2.3,
    arc: 1.0,
    executeBelow: { frac: 0.3, mult: 2.0 },
  },

  {
    id: 'hummingbird',
    name: 'Hummingbird',
    desc: 'Wings too fast to see, held on one flower. Count the visits if you can.',
    color: '#8ac4a8',
    code: 'Hm',
    cooldownTicks: 240, // 12 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 3,
    range: 9,
    projectiles: 2,
    spreadArc: 0.16,
    projectileSpeed: 17,
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
];

export const DUALWIELD_LADDER: TechniqueDef[] = [
  // --------------------------- THE TWIN SCHOOL — the paired rungs
  {
    ability: 'twin_cut',
    style: 'dualwield',
    unlockLevel: 5,
    ranks: [
      { note: 'Both hands land heavier.', damage: 9 },
      { note: 'The sentence repeats sooner.', cooldownTicks: 140 },
      { note: 'The pair leaves crossed wounds.', status: { status: 'bleed', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'two_bells',
    style: 'dualwield',
    unlockLevel: 10,
    ranks: [
      { note: 'The bells ring harder.', damage: 12 },
      { note: 'The peal carries wider, and holds.', arc: 1.2, status: { status: 'shock', power: 1, durationTicks: 45 } },
      { note: 'The carillon answers at once.', damage: 14, cooldownTicks: 140, castTicks: 16 },
    ],
  },
  {
    ability: 'heron_step',
    style: 'dualwield',
    unlockLevel: 15,
    ranks: [
      { note: 'The pass cuts deeper.', damage: 11 },
      { note: 'A longer stride through them.', dashTiles: 8.4, cooldownTicks: 160 },
      { note: 'Both edges collect on the way past.', damage: 12, status: { status: 'bleed', power: 2, durationTicks: 50 } },
    ],
  },
  {
    ability: 'ribbonwork',
    style: 'dualwield',
    unlockLevel: 20,
    ranks: [
      { note: 'The ribbons cut deeper.', damage: 6 },
      { note: 'The crossing takes a fourth pass.', channelTicks: 64 },
      { note: 'The red runs freely now.', cooldownTicks: 200, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'crossed_throw',
    style: 'dualwield',
    unlockLevel: 25,
    ranks: [
      { note: 'Each knife argues harder.', damage: 7 },
      { note: 'Thrown oftener, bitten deeper.', damage: 8, cooldownTicks: 150 },
      { note: 'They remember your hands, and come home.', returns: true, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'twin_moons',
    style: 'dualwield',
    unlockLevel: 30,
    ranks: [
      { note: 'The moons strike harder.', damage: 7 },
      { note: 'The orbit runs longer and faster.', range: 11, projectileSpeed: 18 },
      { note: 'Both moons come home full.', damage: 9, cooldownTicks: 190 },
    ],
  },
  {
    ability: 'mirrored_hand',
    style: 'dualwield',
    unlockLevel: 35,
    ranks: [
      { note: 'The mirror holds longer.', self: { offhandWeight: 0.75, durationTicks: 200 } },
      { note: 'The reflection sharpens.', self: { offhandWeight: 0.9, durationTicks: 200 } },
      { note: 'For a while, the two hands are one.', self: { offhandWeight: 1.0, durationTicks: 220 } },
    ],
  },
  {
    ability: 'silver_reel',
    style: 'dualwield',
    unlockLevel: 40,
    ranks: [
      { note: 'The reel cuts harder.', damage: 6 },
      { note: 'The reel winds a fourth turn.', channelTicks: 64 },
      { note: 'The circle widens, and the cold keeps.', radius: 2.2, cooldownTicks: 220, status: { status: 'chill', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'turning_reel',
    style: 'dualwield',
    unlockLevel: 45,
    ranks: [
      { note: 'The turn cuts deeper.', damage: 12 },
      { note: 'A wider round, called oftener.', radius: 2.5, cooldownTicks: 150 },
      { note: 'The reel rings them where they stand.', damage: 13, status: { status: 'shock', power: 1, durationTicks: 30 } },
    ],
  },
  {
    ability: 'matched_flame',
    style: 'dualwield',
    unlockLevel: 50,
    ranks: [
      { note: 'The flames strike harder.', damage: 7 },
      { note: 'The burning lingers and the reach grows.', range: 2.3, status: { status: 'burn', power: 1, durationTicks: 50 } },
      { note: 'A fourth strike joins the burst.', hits: 4, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'red_ribbons',
    style: 'dualwield',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The ribbons run redder.',
        self: { speedMult: 1.08, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 },
      },
      {
        note: 'The weave quickens.',
        self: { speedMult: 1.12, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 180 },
      },
      {
        note: 'Dance long enough and they wear the whole spool.',
        self: { speedMult: 1.12, onHitStatus: { status: 'bleed', power: 2, durationTicks: 80 }, durationTicks: 200 },
      },
    ],
  },
  {
    ability: 'stormstitch',
    style: 'dualwield',
    unlockLevel: 58,
    ranks: [
      { note: 'The seam strikes harder.', damage: 6 },
      { note: 'The stitch holds them longer.', status: { status: 'shock', power: 1, durationTicks: 40 } },
      { note: 'The seam takes a third foe.', chainTargets: 3 },
    ],
  },
  {
    ability: 'swallows_dive',
    style: 'dualwield',
    unlockLevel: 62,
    ranks: [
      { note: 'The landing bites deeper.', damage: 14 },
      { note: 'A longer flight, a shorter wait.', dashTiles: 11.0, cooldownTicks: 210 },
      { note: 'The landing scatters the ring they made.', damage: 16, radius: 2.1, knockback: 1.8 },
    ],
  },
  {
    ability: 'mirrorfall',
    style: 'dualwield',
    unlockLevel: 66,
    ranks: [
      { note: 'The landing strikes harder.', damage: 13 },
      { note: 'The mirror spreads wider, colder.', radius: 2.2, status: { status: 'chill', power: 1, durationTicks: 50 } },
      { note: 'Both of you fall again sooner.', damage: 15, cooldownTicks: 210 },
    ],
  },
  {
    ability: 'the_shears',
    style: 'dualwield',
    unlockLevel: 70,
    ranks: [
      { note: 'The blades close harder.', damage: 13 },
      { note: 'They read the thread earlier.', executeBelow: { frac: 0.35, mult: 2.2 }, cooldownTicks: 190 },
      { note: 'Most things were thread all along.', damage: 14, executeBelow: { frac: 0.35, mult: 2.6 } },
    ],
  },
  {
    ability: 'the_weave',
    style: 'dualwield',
    unlockLevel: 74,
    ranks: [
      { note: 'The threads pull tighter.', damage: 6 },
      { note: 'The loom reaches wider.', arc: 1.6, range: 2.4 },
      { note: 'The weft runs red.', cooldownTicks: 190, status: { status: 'bleed', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'storm_of_two',
    style: 'dualwield',
    unlockLevel: 78,
    ranks: [
      { note: 'Each ring lands heavier.', damage: 7 },
      { note: 'A fourth ring joins the round.', pulses: 4, cooldownTicks: 260 },
      { note: 'The storm widens its round.', damage: 8, radius: 2.1 },
    ],
  },
  {
    ability: 'first_and_last',
    style: 'dualwield',
    unlockLevel: 82,
    ranks: [
      { note: 'The first cut opens wider.', damage: 14 },
      { note: 'The door closes harder on the failing.', executeBelow: { frac: 0.35, mult: 2.2 } },
      { note: 'First and last arrive together.', damage: 15, cooldownTicks: 180, castTicks: 22 },
    ],
  },
  {
    ability: 'hummingbird',
    style: 'dualwield',
    unlockLevel: 86,
    ranks: [
      { note: 'The visits land harder.', damage: 4 },
      { note: 'The flower is further than it looks.', range: 10, projectileSpeed: 18 },
      { note: 'A third wing joins the blur.', projectiles: 3 },
    ],
  },
  {
    ability: 'hundred_hands',
    style: 'dualwield',
    unlockLevel: 90,
    ranks: [
      { note: 'Every hand hits harder.', damage: 6 },
      { note: 'The breath shortens.', cooldownTicks: 280, pulseEveryTicks: 4 },
      { note: 'A sixth hand joins the count.', hits: 6 },
    ],
  },
  {
    ability: 'two_answers',
    style: 'dualwield',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Both answers weigh more.', damage: 10 },
      { note: 'Spoken sooner.', damage: 11, cooldownTicks: 200 },
      { note: 'What the second answer takes, you keep.', damage: 12, drainFrac: 0.25 },
    ],
  },
];
