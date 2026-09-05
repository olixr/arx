/**
 * THE ARCHERY SECRET SHELF — the weapon-taught arts of this school and
 * their honed ranks, one file per school (THE MASTERED HAND,
 * techniques v3). Moved verbatim from weaponArts/ladders and
 * secretRanks; the shelf waves rewrite the arts here. Seats and
 * anchors stay in secretArts.ts (THE ANCHOR RULER is not this file's
 * to move).
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/** THE REGISTER, per shelf (see schools/onehand.ts). */
export const ARCHERY_SECRET_LICENSES: Record<string, string[]> = {};

export const ARCHERY_SECRET_ARTS: AbilityDef[] = [
  {
    id: 'volley',
    name: 'Volley',
    desc: 'Loose a fan of five arrows in one motion.',
    color: '#8a6a45',
    code: 'Vo',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 6,
    range: 14,
    projectiles: 5,
    spreadArc: 0.55,
    projectileSpeed: 15,
  },

  {
    id: 'piercing_bolt',
    name: 'Piercing Bolt',
    desc: 'A single heavy shaft that punches through every target in line.',
    color: '#6b8a5a',
    code: 'Pb',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 12,
    range: 18,
    projectiles: 1,
    projectileSpeed: 19,
    pierce: true,
  },

  // ---------------------------------------- archer's-roster weapon arts
  // Every signature bow looses its own Art — fans, piercing lines, and
  // sky-fall strikes on the same data-driven executor.
  {
    id: 'broadhead',
    name: 'Broadhead',
    desc: 'One hunting shaft with a head like an axe. It leaves a trail.',
    color: '#7a5a36',
    code: 'Bh',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 10,
    range: 15,
    projectiles: 1,
    projectileSpeed: 18,
    status: { status: 'bleed', power: 1, durationTicks: 80 },
  },

  {
    id: 'wingbeat',
    name: 'Wingbeat',
    desc: 'Three arrows in one flutter — faster than the bird can bank.',
    color: '#4a8ab8',
    code: 'Wt',
    cooldownTicks: 120, // 6 s
    shape: 'projectile_fan',
    damage: 5,
    range: 14,
    projectiles: 3,
    spreadArc: 0.3,
    projectileSpeed: 17,
  },

  {
    id: 'verdant_burst',
    name: 'Verdant Burst',
    desc: 'Plant an arrow like a seed — the ground blooms teeth.',
    color: '#5a9a4a',
    code: 'Vb',
    cooldownTicks: 190, // 9.5 s
    shape: 'ground_aoe',
    damage: 9,
    range: 13,
    radius: 2.0,
    fuseTicks: 14,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },

  {
    id: 'windsong',
    name: 'Windsong',
    desc: 'Draw until the bow sings, then loose the note through everything.',
    color: '#8ab4c8',
    code: 'Wd',
    cooldownTicks: 180, // 9 s
    shape: 'projectile_fan',
    damage: 13,
    range: 19,
    projectiles: 1,
    projectileSpeed: 21,
    pierce: true,
  },

  {
    id: 'thorn_fan',
    name: 'Thorn Fan',
    desc: 'A hedge of briar-shafts, loosed all at once.',
    color: '#6a8a4a',
    code: 'Tv',
    cooldownTicks: 150, // 7.5 s
    shape: 'projectile_fan',
    damage: 5,
    range: 10,
    projectiles: 5,
    spreadArc: 0.6,
    projectileSpeed: 15,
    status: { status: 'bleed', power: 1, durationTicks: 50 },
  },

  {
    id: 'howling_loose',
    name: 'Howling Loose',
    desc: 'The string howls and the pack of arrows runs down the cold.',
    color: '#9ab8d8',
    code: 'Hw',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 6,
    range: 14,
    projectiles: 4,
    spreadArc: 0.7,
    projectileSpeed: 16,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  {
    id: 'hoarfrost',
    name: 'Hoarfrost',
    desc: 'Stamp the frozen limb — winter bursts outward and grips.',
    color: '#b8d8e8',
    code: 'Hr',
    cooldownTicks: 180, // 9 s
    shape: 'nova',
    damage: 5,
    radius: 2.6,
    status: { status: 'chill', power: 1, durationTicks: 90 },
  },

  {
    id: 'ghost_shaft',
    name: 'Ghost Shaft',
    desc: 'An arrow that declines to exist until it arrives.',
    color: '#a8a4c0',
    code: 'Gh',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 12,
    range: 17,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true,
  },

  {
    id: 'cinder_rain',
    name: 'Cinder Rain',
    desc: 'Loose one burning shaft skyward. It comes back plural — and it KEEPS coming.',
    color: '#e8823d',
    code: 'Cd',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 4,
    range: 13,
    radius: 2.1,
    fieldTicks: 110, // a burning downpour, not a single strike
    pulseEveryTicks: 16,
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },

  {
    id: 'kings_arrow',
    name: 'King\'s Arrow',
    desc: 'The royal warshot: one command, gilded, not open to appeal.',
    color: '#c9a23c',
    code: 'Kg',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 14,
    range: 18,
    projectiles: 1,
    projectileSpeed: 20,
    pierce: true,
  },

  {
    id: 'starfall_arrows',
    name: 'Starfall Arrows',
    desc: 'Seven points of light leave the string. None of them miss the night.',
    color: '#8a90d8',
    code: 'Sv',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 6,
    range: 16,
    projectiles: 7,
    spreadArc: 0.9,
    projectileSpeed: 17,
  },

  {
    id: 'skyrend',
    name: 'Skyrend',
    desc: 'Tear the horizon open along a line of your choosing.',
    color: '#d8e4f0',
    code: 'Sy',
    cooldownTicks: 220, // 11 s
    shape: 'beam', // the railshot: the arrow arrives before the sound does
    damage: 14,
    range: 18,
    width: 0.5,
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },

  {
    // THE DRAWN BREATH's bow voice, taught by oxbow: the casted great
    // shot — a wind-up the whole field can read, then one answer.
    id: 'full_draw',
    name: 'The Full Draw',
    desc: 'Draw past the ear and hold it. Planted feet loose sooner. Nothing walks away.',
    color: '#6a4f30',
    code: 'Fd',
    cooldownTicks: 240, // 12 s
    castTicks: 30, // 1.5 s drawn, 1.2 s planted
    shape: 'projectile_fan',
    damage: 16,
    range: 17,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true, // the shot does not stop for the first opinion
  },

  // ------------------------------------- the ten flights, bow arts
  // Each legendary chase bow looses its own word — same data-driven
  // executor, no shape invented twice in a row.
  {
    id: 'wakewood',
    name: 'Wakewood',
    desc: 'The arrow takes root where it lands. What comes up has thorns and opinions.',
    color: '#6a8a4a',
    code: 'Ww',
    cooldownTicks: 200, // 10 s — a zone earns a longer breath
    shape: 'ground_field',
    damage: 4,
    range: 13,
    radius: 2.0,
    // Five pulses, not six — THE PAYOFF BRACKET FOR THE SHELF: a full
    // channel at the anchor band must never exceed the line fighter.
    fieldTicks: 90,
    pulseEveryTicks: 16,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },

  {
    id: 'larkshot',
    name: 'Larkshot',
    desc: 'One arrow up the morning line. Everything on it learns what dawn weighs.',
    color: '#ffd98a',
    code: 'Lk',
    cooldownTicks: 190, // 9.5 s
    shape: 'beam',
    damage: 10,
    range: 14,
    width: 0.55,
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },

  {
    id: 'glasshail',
    name: 'Glasshail',
    desc: 'The bow rings once, and the sky answers in splinters.',
    color: '#bcd8f0',
    code: 'Gm',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 5,
    range: 13,
    projectiles: 6,
    spreadArc: 0.8,
    projectileSpeed: 17,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  {
    id: 'stormskip',
    name: 'Stormskip',
    desc: 'One arrow, skipped head to head like a stone across a pond.',
    color: '#8fa2c4',
    code: 'Sk',
    cooldownTicks: 190, // 9.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.0,
    chainTargets: 4,
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },

  {
    id: 'charfall',
    name: 'Charfall',
    desc: 'It goes up an arrow. It comes down a kiln.',
    color: '#ff8a3c',
    code: 'Cf',
    cooldownTicks: 200, // 10 s
    shape: 'ground_aoe',
    damage: 11,
    range: 13,
    radius: 2.1,
    fuseTicks: 16,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'hushfall',
    name: 'Hushfall',
    desc: 'Five feathers leave without a sound. Every one knows the way in the dark.',
    color: '#8d84a8',
    code: 'Hf',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 5,
    range: 13,
    projectiles: 5,
    spreadArc: 0.9,
    projectileSpeed: 15,
    homing: 3.0,
    element: 'void',
  },

  {
    id: 'quarry_call',
    name: 'Quarry Call',
    desc: 'The called shot. The quarry hears its name, and the woods go quiet.',
    color: '#c84a5a',
    code: 'Qc',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 15,
    range: 17,
    projectiles: 1,
    projectileSpeed: 20,
    pierce: true,
    status: { status: 'bleed', power: 1, durationTicks: 80 },
  },

  {
    id: 'plucked_chord',
    name: 'The Plucked Chord',
    desc: 'Three notes off the silent strings. The room takes the music personally.',
    color: '#c8b8f0',
    code: 'Pd',
    cooldownTicks: 200, // 10 s
    shape: 'pulse_nova',
    damage: 6,
    radius: 2.3,
    pulses: 3,
    pulseEveryTicks: 9,
  },

  {
    id: 'nightweft',
    name: 'Nightweft',
    desc: 'The loom casts its net of night and draws the catch to center.',
    color: '#9aa2c8',
    code: 'Nw',
    cooldownTicks: 190, // 9.5 s
    shape: 'nova',
    damage: 7,
    radius: 2.6,
    knockback: -1.5, // the net does not chase; it GATHERS
  },

  {
    id: 'the_anvil',
    name: 'The Anvil',
    desc: 'Point at the ground where the storm should set its anvil down.',
    color: '#cfe0ff',
    code: 'Aq',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 13,
    range: 13,
    radius: 2.4,
    fuseTicks: 18,
    knockback: 1.6,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },
];

export const ARCHERY_SECRET_RANKS: Record<string, Steps> = {
  // --------------------------------------------- archery, the flights
  volley: [
    { note: 'Every shaft bites deeper.', damage: 7 },
    { note: 'The spread holds tighter.', spreadArc: 0.45 },
    { note: 'A sixth shaft joins the flight.', projectiles: 6 },
  ],
  wakewood: [
    { note: 'The thorns rake deeper.', damage: 5 },
    { note: 'The rooting ground spreads wider.', radius: 2.2 },
    { note: 'The wood wakes one growth longer.', fieldTicks: 106 },
  ],
  broadhead: [
    { note: 'The head cuts a wider channel.', damage: 11 },
    { note: 'The draw settles quicker.', cooldownTicks: 155 },
    { note: 'The wound it leaves stays open.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  glasshail: [
    { note: 'Each shard bites deeper.', damage: 6 },
    { note: 'The hail holds a tighter pattern.', spreadArc: 0.65 },
    { note: 'A seventh shard rides the gust.', projectiles: 7 },
  ],
  larkshot: [
    { note: 'The lark strikes brighter.', damage: 11 },
    { note: 'The song cuts a wider line.', width: 0.7 },
    { note: 'Dawn holds the burn longer.', status: { status: 'burn', power: 1, durationTicks: 70 } },
  ],
  charfall: [
    { note: 'The char falls heavier.', damage: 12 },
    { note: 'The burn ground spreads wider.', radius: 2.4 },
    { note: 'The bough drops without a rustle.', fuseTicks: 11 },
  ],
  piercing_bolt: [
    { note: 'The bolt drives deeper.', damage: 13 },
    { note: 'The shot carries farther.', range: 20 },
    { note: 'It leaves through the third rank.', projectileSpeed: 30, cooldownTicks: 160 },
  ],
  stormskip: [
    { note: 'The skip strikes harder.', damage: 8 },
    { note: 'The storm leaps farther between marks.', radius: 3.4 },
    { note: 'A fifth mark takes the arc.', chainTargets: 5 },
  ],
  thorn_fan: [
    { note: 'Every thorn bites deeper.', damage: 6 },
    { note: 'The fan holds a tighter spread.', spreadArc: 0.5 },
    { note: 'A sixth thorn joins the fan.', projectiles: 6 },
  ],
  wingbeat: [
    { note: 'The beat strikes harder.', damage: 6 },
    { note: 'The wings ready again sooner.', cooldownTicks: 105 },
    { note: 'A fourth feather leaves the string.', projectiles: 4 },
  ],
  ghost_shaft: [
    { note: 'The shaft bites deeper.', damage: 13 },
    { note: 'The ghost flies farther.', range: 19 },
    { note: 'It passes and is nocked again before the fall.', cooldownTicks: 140 },
  ],
  howling_loose: [
    { note: 'The howl bites deeper.', damage: 7 },
    { note: 'The pack runs tighter.', spreadArc: 0.55 },
    { note: 'A fifth voice joins the howl.', projectiles: 5 },
  ],
  hushfall: [
    { note: 'The hush lands heavier.', damage: 6 },
    { note: 'The silence seeks more surely.', projectileSpeed: 26 },
    { note: 'A sixth quiet joins the falling.', projectiles: 6 },
  ],
  plucked_chord: [
    { note: 'The chord strikes deeper.', damage: 7 },
    { note: 'The resonance rings wider.', radius: 2.5 },
    { note: 'The string sounds a fourth measure.', pulses: 4 },
  ],
  verdant_burst: [
    { note: 'The burst cuts deeper.', damage: 10 },
    { note: 'The greening spreads wider.', radius: 2.2 },
    { note: 'The heartwood bursts almost at once.', fuseTicks: 10 },
  ],
  hoarfrost: [
    { note: 'The frost bites deeper.', damage: 7 },
    { note: 'The rime rings wider.', radius: 2.8 },
    { note: 'The cold does not consider letting go, and gathers again quickly.', status: { status: 'chill', power: 1, durationTicks: 120 }, cooldownTicks: 160 },
  ],
  nightweft: [
    { note: 'The weft cuts deeper.', damage: 9 },
    { note: 'The loom gathers from wider.', radius: 2.8 },
    { note: 'The threads pull harder, and the loom never rests.', knockback: -2.1, cooldownTicks: 170 },
  ],
  quarry_call: [
    { note: 'The call strikes deeper.', damage: 16 },
    { note: 'The quarry is named from farther.', range: 19 },
    { note: 'What is called bleeds until it answers.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  cinder_rain: [
    { note: 'The rain burns hotter.', damage: 5 },
    { note: 'The cinder fall spreads wider.', radius: 2.4 },
    { note: 'The rain lingers past its welcome.', fieldTicks: 126 },
  ],
  kings_arrow: [
    { note: 'The arrow strikes with more of the crown behind it.', damage: 15 },
    { note: 'The royal flight goes farther.', range: 20 },
    { note: 'The king does not wait on ceremony.', cooldownTicks: 170 },
  ],
  starfall_arrows: [
    { note: 'Each star burns deeper.', damage: 7 },
    { note: 'The constellation holds its shape.', spreadArc: 0.75 },
    { note: 'An eighth star falls with the rest.', projectiles: 8 },
  ],
  the_anvil: [
    { note: 'The anvil falls heavier.', damage: 14 },
    { note: 'The strike plate spreads wider.', radius: 2.7 },
    { note: 'The hammer needs no backswing.', fuseTicks: 12 },
  ],
  full_draw: [
    { note: 'The shaft arrives heavier.', damage: 18 },
    { note: 'The next shaft is nocked before the dust settles.', cooldownTicks: 210 },
    { note: 'The full draw comes to the ear like a habit.', castTicks: 22 },
  ],
  skyrend: [
    { note: 'The rend cuts deeper.', damage: 15 },
    { note: 'The tear opens wider.', width: 0.65 },
    { note: 'The sky closes slowly, and hurts the whole while.', status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],
  windsong: [
    { note: 'The song strikes deeper.', damage: 14 },
    { note: 'The verse carries farther.', range: 21 },
    { note: 'The refrain returns sooner.', cooldownTicks: 160 },
  ],
};
