/**
 * THE ONEHAND SECRET SHELF — the weapon-taught arts of this school and
 * their honed ranks, one file per school (THE MASTERED HAND,
 * techniques v3). Moved verbatim from weaponArts/ladders and
 * secretRanks; the shelf waves rewrite the arts here. Seats and
 * anchors stay in secretArts.ts (THE ANCHOR RULER is not this file's
 * to move).
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/** THE REGISTER, per shelf (see schools/onehand.ts). */
export const ONEHAND_SECRET_LICENSES: Record<string, string[]> = {};

export const ONEHAND_SECRET_ARTS: AbilityDef[] = [
  // ------------------------------------------------------ weapon arts
  {
    id: 'crescent_sweep',
    name: 'Crescent Sweep',
    desc: 'Spin in a full circle, wounding everything around you.',
    color: '#d9a05a',
    code: 'CS',
    cooldownTicks: 140, // 7 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 6,
    radius: 1.9,
    knockback: 1.2,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
  },

  {
    id: 'lunge',
    name: 'Lunge',
    desc: 'Dash forward, blade first, cutting through your path.',
    color: '#8d9299',
    code: 'Lu',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 6.8,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
  },

  {
    id: 'shadowstep',
    name: 'Shadowstep',
    desc: 'Melt forward through the dark — the knife arrives before you do.',
    color: '#7a68a8',
    code: 'Sp',
    cooldownTicks: 150, // 7.5 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 6.0,
    travel: 'blink',
  },

  {
    id: 'shockwave',
    name: 'Shockwave',
    desc: 'Slam the ground, hurling nearby enemies away.',
    color: '#b8bec8',
    code: 'Sh',
    cooldownTicks: 180, // 9 s
    castFreezeTicks: 6,
    shape: 'nova',
    damage: 11,
    radius: 2.4,
    knockback: 2.6,
  },

  // ------------------------------------------ blade-roster weapon arts
  // Each signature sword carries its own Art — same data-driven
  // executor, new identities. Statuses keep the reaction economy fed.
  {
    id: 'sundering_chop',
    name: 'Sundering Chop',
    desc: 'One committed overhead cut that staggers whatever survives it.',
    color: '#a4744b',
    code: 'Sd',
    cooldownTicks: 160, // 8 s
    castFreezeTicks: 5,
    shape: 'melee_arc',
    damage: 10,
    range: 2.1,
    arc: 0.8,
    knockback: 1.8,
  },

  {
    id: 'thorn_lash',
    name: 'Thorn Lash',
    desc: 'The briar uncoils — a raking cut that leaves barbs behind.',
    color: '#5a7a42',
    code: 'Tl',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 7,
    range: 2.2,
    arc: 1.2,
    status: { status: 'bleed', power: 1, durationTicks: 90 },
  },

  {
    id: 'quicksilver',
    name: 'Quicksilver',
    desc: 'Three thrusts in the time other blades manage one.',
    color: '#e6ddc8',
    code: 'Qs',
    cooldownTicks: 120, // 6 s — the duelist fights in tempo
    shape: 'flurry', // the drumroll: a burst of arc strikes you can move through
    damage: 4,
    range: 2.0,
    arc: 0.8,
    hits: 3,
    pulseEveryTicks: 5,
  },

  {
    id: 'riptide',
    name: 'Riptide',
    desc: 'Surge forward like the tide going OUT — cold drags at the cut.',
    color: '#3d7a78',
    code: 'Rp',
    cooldownTicks: 150, // 7.5 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 5.6,
    status: { status: 'chill', power: 1, durationTicks: 80 },
  },

  {
    id: 'cinder_arc',
    name: 'Cinder Arc',
    desc: 'The ember seam flares — a burning crescent hangs in the air.',
    color: '#c4623c',
    code: 'Ca',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.2,
    arc: 1.1,
    status: { status: 'burn', power: 1, durationTicks: 70 },
  },

  {
    id: 'winters_edge',
    name: 'Winter\'s Edge',
    desc: 'A slow, glittering cut that leaves the cold in the wound.',
    color: '#a8c8dc',
    code: 'We',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 7,
    range: 2.1,
    arc: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 100 },
  },

  {
    id: 'reapers_arc',
    name: 'Reaper\'s Arc',
    desc: 'A scything harvest-wide sweep. The marsh takes its tithe.',
    color: '#4a5a48',
    code: 'Rc',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 5,
    shape: 'melee_arc',
    damage: 8,
    range: 2.4,
    arc: 1.6,
    status: { status: 'bleed', power: 1, durationTicks: 80 },
  },

  {
    id: 'red_harvest',
    name: 'Red Harvest',
    desc: 'Every edge at once — the tally around you runs red.',
    color: '#8a3040',
    code: 'Rh',
    cooldownTicks: 180, // 9 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 8,
    radius: 2.0,
    status: { status: 'bleed', power: 1, durationTicks: 90 },
  },

  {
    id: 'storm_brand',
    name: 'Storm Brand',
    desc: 'The blade grounds a bolt that leaps down the line of foes.',
    color: '#5a6a9c',
    code: 'Sb',
    cooldownTicks: 160, // 8 s
    shape: 'chain_zap',
    damage: 7,
    range: 6,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },

  {
    id: 'kings_decree',
    name: 'King\'s Decree',
    desc: 'The court is dismissed — everything near you, thrown from it.',
    color: '#e8c04c',
    code: 'Kd',
    cooldownTicks: 190, // 9.5 s
    castFreezeTicks: 6,
    shape: 'nova',
    damage: 9,
    radius: 2.6,
    knockback: 3.2,
  },

  {
    id: 'sunburst',
    name: 'Sunburst',
    desc: 'Dawn happens HERE: a flash of gold that scorches the circle.',
    color: '#e8b64c',
    code: 'Su',
    cooldownTicks: 195, // 9.75 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 9,
    radius: 2.4,
    knockback: 1.4,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'starfall_strike',
    name: 'Starfall',
    desc: 'Point the blade; a piece of the sky keeps the appointment.',
    color: '#4a4066',
    code: 'Sk',
    cooldownTicks: 230, // 11.5 s
    shape: 'ground_aoe',
    damage: 12,
    range: 10,
    radius: 2.0,
    fuseTicks: 18,
    knockback: 1.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'vow_unbroken',
    name: 'Vow Unbroken',
    desc: 'For six seconds the oath holds: every cut you give, gives back.',
    color: '#e8e8f0',
    code: 'Vu',
    cooldownTicks: 260, // 13 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.35, durationTicks: 120 },
  },

  {
    // THE DRAWN BREATH's blade voice, taught by threshold: a channeled
    // nova — the doorwarden's stand, holding one ring of ground.
    id: 'kept_ground',
    name: 'Kept Ground',
    desc: 'Plant your point and hold. Kept ground bites whatever steps in, every held beat.',
    color: '#b8c4cc',
    code: 'Kg',
    cooldownTicks: 200, // 10 s
    shape: 'nova',
    damage: 3,
    radius: 2.6,
    knockback: 0.4, // the line holds; what steps in is put back out
    channelTicks: 48, // 2.4 s held, three beats
    pulseEveryTicks: 16,
  },

  // ------------------------------------- the ten crowns, sword arts
  // Each chase blade names its own Art (the own-art law). Cadence
  // rides the sword-art band; identity rides the crown that taught it.
  {
    id: 'drag_under',
    name: 'Drag Under',
    desc: 'The sweep is a wave. Everything it touches goes down slow and comes up slower.',
    color: '#7fae9e',
    code: 'Du',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 6,
    range: 2.2,
    arc: 1.4,
    status: { status: 'chill', power: 1, durationTicks: 90 },
  },

  {
    id: 'spoken_light',
    name: 'Spoken Light',
    desc: 'The blade reads its word aloud, once, and the circle goes white.',
    color: '#ffd977',
    code: 'So',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 7,
    radius: 2.0,
    knockback: 1.2,
  },

  {
    id: 'slagfall',
    name: 'Slagfall',
    desc: 'Point the maw; it spits a mouthful of forge onto the spot you picked.',
    color: '#ff8a3c',
    code: 'Sq',
    cooldownTicks: 195, // 9.75 s
    shape: 'ground_aoe',
    damage: 9,
    range: 8,
    radius: 1.8,
    fuseTicks: 14,
    status: { status: 'burn', power: 1, durationTicks: 70 },
  },

  {
    id: 'sky_splits',
    name: 'The Sky Splits',
    desc: 'The gap in the blade opens, and the bolt goes visiting down the line.',
    color: '#8fa2c4',
    code: 'Sz',
    cooldownTicks: 160, // 8 s
    shape: 'chain_zap',
    damage: 6,
    range: 6,
    radius: 3.0,
    chainTargets: 4,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },

  {
    id: 'green_verse',
    name: 'Green Verse',
    desc: 'The song closes the distance in one bar. The bite is the rest of the verse.',
    color: '#6faa74',
    code: 'Gv',
    cooldownTicks: 175, // 8.75 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 5.0,
    status: { status: 'venom', power: 1, durationTicks: 100 },
  },

  {
    id: 'sun_court',
    name: 'Sun Court',
    desc: 'Court convenes wherever you are standing. Everyone else is dismissed, burning.',
    color: '#e8c04c',
    code: 'Sc',
    cooldownTicks: 190, // 9.5 s
    castFreezeTicks: 6,
    shape: 'nova',
    damage: 9,
    radius: 2.2,
    knockback: 2.6,
    status: { status: 'burn', power: 1, durationTicks: 40 },
  },

  {
    id: 'still_air',
    name: 'Still Air',
    desc: 'The air stops moving an arm\'s length around. So does everything in it.',
    color: '#a9c8e4',
    code: 'Si',
    cooldownTicks: 180, // 9 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 8,
    radius: 2.2,
    status: { status: 'chill', power: 1, durationTicks: 120 },
  },

  // ----------------------------------------- rogue's-roster weapon arts
  // The dagger identities: short dashes, deep statuses, and one polite
  // execute. Cadence runs faster than the sword arts — a rogue's Art is
  // a beat in the combo, not a setpiece.
  {
    id: 'serpents_kiss',
    name: 'Serpent\'s Kiss',
    desc: 'The wave finds the vein — and leaves something living in it.',
    color: '#8a9a4a',
    code: 'Ss',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 5,
    range: 1.8,
    arc: 0.9,
    status: { status: 'venom', power: 1, durationTicks: 110 },
  },

  {
    id: 'stinger',
    name: 'Stinger',
    desc: 'One wingbeat forward, one perfect puncture.',
    color: '#e8b64c',
    code: 'Sg',
    cooldownTicks: 110, // 5.5 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 4.0,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },

  {
    id: 'cold_snap',
    name: 'Cold Snap',
    desc: 'The first frost happens all at once, an arm\'s length around.',
    color: '#b8d8e8',
    code: 'Cn',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 5,
    radius: 1.8,
    status: { status: 'chill', power: 1, durationTicks: 90 },
  },

  {
    id: 'bone_needle',
    name: 'Bone Needle',
    desc: 'The dead lend a dart. Thrown, it remembers where marrow lives.',
    color: '#e2dcc8',
    code: 'Bn',
    cooldownTicks: 130, // 6.5 s
    shape: 'projectile_fan',
    damage: 7,
    range: 9,
    projectiles: 1,
    projectileSpeed: 18,
    executeBelow: { frac: 0.4, mult: 1.6 }, // it finds the marrow of the failing
  },

  {
    id: 'shadow_fang',
    name: 'Shadow Fang',
    desc: 'The dark takes one long step, bites, and keeps what it draws.',
    color: '#4a4058',
    code: 'Sw',
    cooldownTicks: 150, // 7.5 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 7.2,
    drainFrac: 0.25, // the bite feeds the biter
  },

  {
    id: 'crimson_tithe',
    name: 'Crimson Tithe',
    desc: 'For four seconds, every wound you open pays you back.',
    color: '#6a3a44',
    code: 'Ct',
    cooldownTicks: 240, // 12 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.5, durationTicks: 80 },
  },

  {
    id: 'pale_flame',
    name: 'Pale Flame',
    desc: 'A sweep of fire that never warmed anything in its life.',
    color: '#c8dce8',
    code: 'Pl',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 6,
    range: 1.9,
    arc: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 90 },
  },

  {
    id: 'spark_lash',
    name: 'Spark Lash',
    desc: 'The hook grounds a live wire into whoever is standing closest.',
    color: '#7a88b8',
    code: 'Sl',
    cooldownTicks: 140, // 7 s
    shape: 'chain_zap',
    damage: 6,
    range: 5,
    radius: 2.6,
    chainTargets: 2,
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },

  {
    id: 'kings_bane',
    name: 'King\'s Bane',
    desc: 'Cross the room the way rumor does, and land the way history does.',
    color: '#c9a23c',
    code: 'Kb',
    cooldownTicks: 190, // 9.5 s
    shape: 'dash_strike',
    damage: 9,
    dashTiles: 6.0,
    executeBelow: { frac: 0.3, mult: 1.5 }, // regicide favors a faltering crown
    status: { status: 'bleed', power: 1, durationTicks: 80 },
  },

  {
    id: 'last_word',
    name: 'Last Word',
    desc: 'Step in, say it once, and the conversation is over. The weary hear it loudest.',
    color: '#f0f0f4',
    code: 'Lw',
    cooldownTicks: 210, // 10.5 s
    shape: 'dash_strike',
    damage: 14,
    dashTiles: 5.2,
    executeBelow: { frac: 0.35, mult: 1.8 }, // the finisher: wounded foes take it hard
  },

  // ------------------------------------- the ten crowns, knife arts
  // The rogue's three chase knives name their own Arts — quicker
  // cadence than the sword crowns; a knife's Art is a beat, not a
  // setpiece.
  {
    id: 'garden_close',
    name: 'The Garden Closes',
    desc: 'Petals everywhere at once, and every one of them is an edge.',
    color: '#5f5478',
    code: 'Gc',
    cooldownTicks: 172, // 8.6 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 5,
    radius: 1.8,
    status: { status: 'venom', power: 1, durationTicks: 110 },
  },

  {
    id: 'beak_first',
    name: 'Beak First',
    desc: 'The rook takes the short way to the purse. Through.',
    color: '#3c4048',
    code: 'Bf',
    cooldownTicks: 120, // 6 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 4.4,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
  },

  {
    id: 'pale_lantern',
    name: 'Pale Lantern',
    desc: 'The grave-light comes up for five seconds, and what it shows on, it keeps a little of.',
    color: '#b8e8a8',
    code: 'Pn',
    cooldownTicks: 240, // 12 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.3, durationTicks: 100 },
  },
];

export const ONEHAND_SECRET_RANKS: Record<string, Steps> = {
  // ------------------------------------------------ onehand, the blades
  crescent_sweep: [
    { note: 'The crescent cuts deeper.', damage: 7 },
    { note: 'The sweep reaches a step wider.', radius: 2.1 },
    { note: 'The wound it opens refuses to close.', status: { status: 'bleed', power: 1, durationTicks: 110 } },
  ],
  lunge: [
    { note: 'The point arrives harder.', damage: 9 },
    { note: 'The step carries you farther.', dashTiles: 7.6 },
    { note: 'What the point opens, the road finishes.', status: { status: 'bleed', power: 2, durationTicks: 70 } },
  ],
  serpents_kiss: [
    { note: 'The fang bites deeper.', damage: 6 },
    { note: 'The coil strikes a hand wider.', arc: 1.1, range: 2.0 },
    { note: 'The venom learns patience.', status: { status: 'venom', power: 1, durationTicks: 130 } },
  ],
  shadowstep: [
    { note: 'The dark hits harder on arrival.', damage: 7 },
    { note: 'The step through shadow lengthens.', dashTiles: 6.8 },
    { note: 'The knife is ready again before the light returns.', cooldownTicks: 120 },
  ],
  beak_first: [
    { note: 'The beak drives deeper.', damage: 6 },
    { note: 'The dive comes from farther out.', dashTiles: 5.2 },
    { note: 'What the rook opens keeps bleeding.', status: { status: 'bleed', power: 1, durationTicks: 110 } },
  ],
  bone_needle: [
    { note: 'The needle bites harder.', damage: 8 },
    { note: 'The throw carries farther.', range: 11 },
    { note: 'Marrow remembers where it was promised.', executeBelow: { frac: 0.4, mult: 1.8 } },
  ],
  drag_under: [
    { note: 'The pull lands heavier.', damage: 7 },
    { note: 'The undertow reaches wider.', arc: 1.6 },
    { note: 'The cold takes a deeper hold of what it caught.', damage: 8, status: { status: 'chill', power: 1, durationTicks: 110 } },
  ],
  garden_close: [
    { note: 'Every petal cuts deeper.', damage: 6 },
    { note: 'The garden closes a step wider.', radius: 2.0 },
    { note: 'The bloom seeds a slower dying.', status: { status: 'venom', power: 1, durationTicks: 130 } },
  ],
  quicksilver: [
    { note: 'The hand needs less asking.', cooldownTicks: 112 },
    { note: 'The hand blurs a reach farther.', range: 2.2 },
    { note: 'A fourth cut hides inside the third.', hits: 4 },
  ],
  riptide: [
    { note: 'The tide hits heavier.', damage: 8 },
    { note: 'The rush carries you farther.', dashTiles: 6.4 },
    { note: 'What the tide takes, it keeps cold.', status: { status: 'chill', power: 1, durationTicks: 100 } },
  ],
  shockwave: [
    { note: 'The slam lands heavier.', damage: 12 },
    { note: 'The wave breaks a step wider.', radius: 2.6 },
    { note: 'The ground answers with a longer throw.', knockback: 3.2 },
  ],
  spoken_light: [
    { note: 'The word lands brighter.', damage: 9 },
    { note: 'The light carries a step farther.', radius: 2.2 },
    { note: 'What it names, it moves.', knockback: 2.6 },
  ],
  stinger: [
    { note: 'The sting drives deeper.', damage: 6 },
    { note: 'The dart of a step grows quicker.', cooldownTicks: 100 },
    { note: 'The barb stays in the wound.', status: { status: 'bleed', power: 1, durationTicks: 100 } },
  ],
  sundering_chop: [
    { note: 'The chop falls heavier.', damage: 11 },
    { note: 'The swing opens wider.', arc: 1.0 },
    { note: 'What it sunders, it scatters.', knockback: 2.4 },
  ],
  thorn_lash: [
    { note: 'The thorns bite deeper.', damage: 8 },
    { note: 'The lash cracks a hand longer.', range: 2.4 },
    { note: 'The briar leaves more of itself behind.', status: { status: 'bleed', power: 2, durationTicks: 90 } },
  ],
  cold_snap: [
    { note: 'The snap bites harder.', damage: 6 },
    { note: 'The frost rings wider.', radius: 2.0 },
    { note: 'The cold holds until it is done with you.', status: { status: 'chill', power: 1, durationTicks: 120 } },
  ],
  crimson_tithe: [
    { note: 'The tithe collects a richer share.', self: { meleeLifesteal: 0.6, durationTicks: 80 } },
    { note: 'The collection runs longer.', self: { meleeLifesteal: 0.6, durationTicks: 100 } },
    { note: 'The debt is called sooner.', cooldownTicks: 210 },
  ],
  green_verse: [
    { note: 'The verse strikes truer.', damage: 6 },
    { note: 'The serpent line runs farther.', dashTiles: 5.8 },
    { note: 'The last stanza is the slowest poison.', status: { status: 'venom', power: 1, durationTicks: 130 } },
  ],
  pale_flame: [
    { note: 'The pale fire cuts deeper.', damage: 7 },
    { note: 'The flame licks a hand wider.', arc: 1.2 },
    { note: 'It burns cold, and it burns to the bone.', damage: 8, status: { status: 'chill', power: 1, durationTicks: 120 } },
  ],
  pale_lantern: [
    { note: 'The lantern gathers more of what falls.', self: { meleeLifesteal: 0.4, durationTicks: 100 } },
    { note: 'The light holds longer.', self: { meleeLifesteal: 0.4, durationTicks: 125 } },
    { note: 'The lantern relights sooner.', cooldownTicks: 210 },
  ],
  reapers_arc: [
    { note: 'The scythe falls heavier.', damage: 9 },
    { note: 'The harvest row grows wider.', arc: 1.8 },
    { note: 'The reaping leaves nothing to seed.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  shadow_fang: [
    { note: 'The fang strikes deeper.', damage: 8 },
    { note: 'The pounce covers more dark.', dashTiles: 8.0 },
    { note: 'It drinks deeper from the wound.', drainFrac: 0.35 },
  ],
  sky_splits: [
    { note: 'The bolt lands harder.', damage: 7 },
    { note: 'The split leaps a body farther.', radius: 3.4 },
    { note: 'A fifth throat hears the thunder.', chainTargets: 5 },
  ],
  slagfall: [
    { note: 'The slag falls heavier.', damage: 10 },
    { note: 'The melt spreads wider.', radius: 2.0 },
    { note: 'The fall comes with barely a warning.', fuseTicks: 10 },
  ],
  spark_lash: [
    { note: 'The spark bites harder.', damage: 7 },
    { note: 'The lash arcs a reach farther.', radius: 3.0 },
    { note: 'A third throat takes the current.', chainTargets: 3 },
  ],
  storm_brand: [
    { note: 'The brand strikes deeper.', damage: 8 },
    { note: 'The storm reaches farther between throats.', radius: 3.4 },
    { note: 'A fourth body joins the circuit.', chainTargets: 4 },
  ],
  winters_edge: [
    { note: 'The edge bites colder and deeper.', damage: 8 },
    { note: 'The cut sweeps a hand wider.', arc: 1.2 },
    { note: 'Winter keeps whatever the edge touches.', status: { status: 'chill', power: 1, durationTicks: 130 } },
  ],
  kept_ground: [
    { note: 'The kept ring bites deeper.', damage: 4 },
    { note: 'The ground you keep grows a stride wider.', radius: 3.0 },
    { note: 'The watch strikes on a faster bell.', pulseEveryTicks: 12 },
  ],
  cinder_arc: [
    { note: 'The cinders cut deeper.', damage: 9 },
    { note: 'The arc sweeps wider.', arc: 1.3 },
    { note: 'The embers refuse to gutter.', status: { status: 'burn', power: 1, durationTicks: 100 } },
  ],
  kings_bane: [
    { note: 'The bane strikes deeper.', damage: 10 },
    { note: 'The charge runs a stride farther.', dashTiles: 6.8 },
    { note: 'Crowned or common, the low are finished alike.', executeBelow: { frac: 0.35, mult: 1.7 } },
  ],
  kings_decree: [
    { note: 'The decree lands heavier.', damage: 10 },
    { note: 'The proclamation carries wider.', radius: 2.8 },
    { note: 'None may stand where the word falls.', knockback: 3.8 },
  ],
  last_word: [
    { note: 'The word cuts deeper.', damage: 15 },
    { note: 'It crosses the room to be heard.', dashTiles: 6.0 },
    { note: 'Against the failing, it is final.', executeBelow: { frac: 0.4, mult: 2.0 } },
  ],
  red_harvest: [
    { note: 'The harvest cuts deeper.', damage: 9 },
    { note: 'The field of the reaping widens.', radius: 2.2 },
    { note: 'Every row bleeds together.', status: { status: 'bleed', power: 2, durationTicks: 90 } },
  ],
  still_air: [
    { note: 'The stillness lands heavier.', damage: 9 },
    { note: 'The hush spreads wider.', radius: 2.4 },
    { note: 'Nothing moves until the air allows it.', status: { status: 'chill', power: 2, durationTicks: 120 } },
  ],
  sun_court: [
    { note: 'The court burns brighter.', damage: 10 },
    { note: 'The audience chamber widens.', radius: 2.4 },
    { note: 'The sentence of the sun is exile.', knockback: 3.2 },
  ],
  starfall_strike: [
    { note: 'The star falls heavier.', damage: 13 },
    { note: 'The crater opens wider.', radius: 2.3 },
    { note: 'The sky gives less warning.', fuseTicks: 12 },
  ],
  sunburst: [
    { note: 'The burst sears deeper.', damage: 10 },
    { note: 'The dawn breaks wider.', radius: 2.6 },
    { note: 'What the light finds, it keeps burning.', status: { status: 'burn', power: 2, durationTicks: 60 } },
  ],
  vow_unbroken: [
    { note: 'The vow returns a greater share.', self: { meleeLifesteal: 0.45, durationTicks: 120 } },
    { note: 'The oath holds longer.', self: { meleeLifesteal: 0.45, durationTicks: 145 } },
    { note: 'The keeper is never long without it.', cooldownTicks: 230 },
  ],
};
