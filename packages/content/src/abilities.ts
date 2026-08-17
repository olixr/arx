import type { AbilityDef, TechniqueDef } from '@arx/shared';

/**
 * Every active ability in the game, as pure data. Weapon Arts are
 * referenced from a weapon's `art`, relic actives from a relic item's
 * `relic`, and NPC specials from an NpcDef's `special.ability` — all
 * three run through the same server-side interpreter.
 *
 * Cooldown feel targets (before on-hit haste): weapon arts ~6–10 s so
 * every skirmish has one or two Art moments; relics ~12–20 s so the
 * relic is a fight-shaping decision, not a rotation filler.
 */
const defs: AbilityDef[] = [
  // ------------------------------------------- the green arts
  // THE GREEN ARTS (farming v2 Phase 6): the second non-combat
  // technique school. All damage 0 forever — farming never joins
  // COMBAT_STYLES or the half-echo; the land mends, wards, and
  // hurries, and that is the whole of its argument.
  {
    id: 'sowers_step',
    name: "Sower's Step",
    desc: 'The field-path stride. For a dozen breaths the furrows carry you.',
    color: '#79a355',
    code: 'Ss',
    cooldownTicks: 600, // 30 s
    shape: 'self_buff',
    damage: 0,
    self: { speedMult: 1.12, durationTicks: 240 },
  },
  {
    id: 'gardeners_mend',
    name: "Gardener's Mend",
    desc: 'Kneel a moment among growing things. The green gives some of itself back.',
    color: '#7ac46a',
    code: 'Gm',
    cooldownTicks: 800, // 40 s
    castFreezeTicks: 20,
    shape: 'self_buff',
    damage: 0,
    self: { heal: 12, durationTicks: 20 },
  },
  {
    id: 'earthen_brace',
    name: 'Earthen Brace',
    desc: 'Set your feet like a fencepost. The ground holds you up a while.',
    color: '#8a6a45',
    code: 'Eb',
    cooldownTicks: 700, // 35 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 14, durationTicks: 240 },
  },
  {
    id: 'hearthkeepers_calm',
    name: "Hearthkeeper's Calm",
    desc: 'Carry the yard\'s quiet with you. Blows land softer on a settled heart.',
    color: '#c9a86a',
    code: 'Hk',
    cooldownTicks: 900, // 45 s
    shape: 'self_buff',
    damage: 0,
    self: { armor: 4, durationTicks: 300 },
  },
  {
    id: 'quickening_touch',
    name: 'Quickening Touch',
    desc: 'Lay a hand over a growing crop and lend it a season\'s patience at once.',
    color: '#e8c04c',
    code: 'Qt',
    cooldownTicks: 1200, // 60 s
    shape: 'ground_aoe',
    damage: 0,
    radius: 0.8,
    range: 4,
  },
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
  {
    id: 'frost_nova',
    name: 'Frost Nova',
    desc: 'A ring of biting cold that slows everything it touches.',
    color: '#8ac4e8',
    code: 'Fn',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 4,
    radius: 2.6,
    status: { status: 'chill', power: 1, durationTicks: 80 },
  },
  {
    id: 'fireburst',
    name: 'Fireburst',
    desc: 'Call down a delayed blast of flame where you aim.',
    color: '#e8763c',
    code: 'Fb',
    cooldownTicks: 170, // 8.5 s
    shape: 'ground_aoe',
    damage: 10,
    range: 12,
    radius: 1.8,
    fuseTicks: 16, // 0.8 s telegraph
    status: { status: 'burn', power: 1, durationTicks: 60 },
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

  // -------------------------------------- archmage's-roster weapon arts
  // Every staff school speaks through its Art — same data-driven
  // executor. Elements paint the projectiles; statuses feed reactions.
  {
    id: 'arcane_ring',
    name: 'Arcane Ring',
    desc: 'A ring of raw Arx snaps outward from the staff\'s heel.',
    color: '#b49af0',
    code: 'Ar',
    cooldownTicks: 132, // 6.6 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 5,
    radius: 2.2,
    knockback: 0.8,
  },
  {
    id: 'wisp_flare',
    name: 'Wisp Flare',
    desc: 'Release the wisp in three — and everything they pass, they pass TWICE.',
    color: '#efe8c0',
    code: 'Wf',
    cooldownTicks: 140, // 7 s
    shape: 'projectile_fan',
    damage: 4,
    range: 9,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 13,
    returns: true, // the wisps boomerang home, striking again on the way back
  },
  {
    id: 'hearth_flare',
    name: 'Hearth Flare',
    desc: 'The hearth roars up — warmth for you, rather less for them.',
    color: '#e8944a',
    code: 'Hf',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 6,
    radius: 2.0,
    knockback: 1.4,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'undertow',
    name: 'Undertow',
    desc: 'The ground remembers being seabed — and everything near gets dragged under.',
    color: '#6aa0c8',
    code: 'Ut',
    cooldownTicks: 160, // 8 s
    shape: 'ground_aoe',
    damage: 9,
    range: 12,
    radius: 2.2,
    fuseTicks: 14,
    knockback: -1.6, // the vortex: the blast pulls INTO its own center
    status: { status: 'chill', power: 1, durationTicks: 90 },
  },
  {
    id: 'stormlash',
    name: 'Stormlash',
    desc: 'Call the bolt you were promised. It brings friends.',
    color: '#e8e06a',
    code: 'Sm',
    cooldownTicks: 185, // 9.25 s
    shape: 'chain_zap',
    damage: 9,
    range: 12,
    radius: 3.2,
    chainTargets: 4,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },
  {
    id: 'cinderstorm',
    name: 'Cinderstorm',
    desc: 'The emberstone exhales — a whirl of burning cinders around you.',
    color: '#e8683c',
    code: 'Ci',
    cooldownTicks: 160, // 8 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 8,
    radius: 2.4,
    status: { status: 'burn', power: 1, durationTicks: 70 },
  },
  {
    id: 'glaciate',
    name: 'Glaciate',
    desc: 'One breath of the deep cold. Everything nearby slows to glacier speed.',
    color: '#9ad0ec',
    code: 'Gl',
    cooldownTicks: 160, // 8 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 7,
    radius: 2.8,
    status: { status: 'chill', power: 2, durationTicks: 90 },
  },
  {
    id: 'galvanic_arc',
    name: 'Galvanic Arc',
    desc: 'The stormpearl discharges — a live arc that leaps down the line.',
    color: '#e8e29a',
    code: 'Ga',
    cooldownTicks: 150, // 7.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 11,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },
  {
    id: 'overgrowth',
    name: 'Overgrowth',
    desc: 'Briars erupt where you point and KEEP growing, raking what they hold.',
    color: '#7ac46a',
    code: 'Og',
    cooldownTicks: 200, // 10 s — a zone earns a longer breath
    shape: 'ground_field',
    damage: 4,
    range: 12,
    radius: 2.2,
    // Five rakes of the briar — THE PAYOFF BRACKET FOR THE SHELF caps
    // the full channel under the at-anchor line fighter.
    fieldTicks: 100, // 5 s of living thicket
    pulseEveryTicks: 18,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'grave_chill',
    name: 'Grave Chill',
    desc: 'The cold of the deep earth rises through the living.',
    color: '#8a9484',
    code: 'Gv',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 6,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 80 },
  },
  {
    id: 'gloom_burst',
    name: 'Gloom Burst',
    desc: 'Plant the blight where they stand and let it bloom, season after season.',
    color: '#9a6ab8',
    code: 'Hb',
    cooldownTicks: 220, // 11 s
    shape: 'ground_field',
    damage: 4,
    range: 12,
    radius: 1.9,
    fieldTicks: 110, // the blight blooms in waves
    pulseEveryTicks: 18,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'venom_lash',
    name: 'Venom Lash',
    desc: 'Both serpents spit at once. Professional courtesy.',
    color: '#a0c050',
    code: 'Vl',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 6,
    range: 13,
    projectiles: 2,
    spreadArc: 0.24,
    projectileSpeed: 15,
    status: { status: 'venom', power: 1, durationTicks: 90 },
  },
  {
    id: 'magma_orb',
    name: 'Magma Orb',
    desc: 'A slow globe of liquid rock that does not stop for anyone.',
    color: '#e85a2c',
    code: 'Mg',
    cooldownTicks: 210, // 10.5 s
    shape: 'projectile_fan',
    damage: 13,
    range: 12,
    projectiles: 1,
    projectileSpeed: 9,
    pierce: true,
    status: { status: 'burn', power: 1, durationTicks: 80 },
  },
  {
    id: 'shatterfrost',
    name: 'Shatterfrost',
    desc: 'The glacier bites down. What it grips, it grinds.',
    color: '#b0d8e8',
    code: 'Sf',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 10,
    radius: 2.6,
    status: { status: 'chill', power: 1, durationTicks: 80 },
  },
  {
    id: 'solar_lance',
    name: 'Solar Lance',
    desc: 'A spear of noon, thrown through everything at once.',
    color: '#ffd98a',
    code: 'So',
    cooldownTicks: 180, // 9 s
    castFreezeTicks: 4,
    shape: 'beam', // noon does not travel — it simply IS, all along the line
    damage: 12,
    range: 14,
    width: 0.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'rune_echo',
    name: 'Rune Echo',
    desc: 'The runes light in order. Then again, louder.',
    color: '#b0a0d8',
    code: 'Re',
    cooldownTicks: 200, // 10 s
    shape: 'pulse_nova',
    damage: 5,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 10,
  },
  {
    id: 'marrow_pulse',
    name: 'Marrow Pulse',
    desc: 'The ribcage lantern tolls — waves of grave-light roll outward.',
    color: '#d8d2be',
    code: 'Mp',
    cooldownTicks: 210, // 10.5 s
    shape: 'pulse_nova',
    damage: 5,
    radius: 2.3,
    pulses: 3,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'void_rift',
    name: 'Void Rift',
    desc: 'Open a window to the place with no windows. It INHALES.',
    color: '#5a4a8a',
    code: 'Vr',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 5,
    range: 13,
    radius: 2.6,
    fieldTicks: 100, // 5 s of open rift
    pulseEveryTicks: 16,
    knockback: -1.4, // every pulse drags the caught TOWARD the rift's mouth
  },
  {
    id: 'eye_of_the_storm',
    name: 'Eye of the Storm',
    desc: 'Stand still at the center. The weather does the walking.',
    color: '#c8d0e8',
    code: 'Ey',
    cooldownTicks: 220, // 11 s
    shape: 'pulse_nova',
    damage: 5,
    radius: 2.5,
    pulses: 4,
    pulseEveryTicks: 9,
    status: { status: 'shock', power: 1, durationTicks: 50 },
  },
  {
    id: 'red_eclipse',
    name: 'Red Eclipse',
    desc: 'For one heartbeat the moon is close, and it drinks what it wounds.',
    color: '#c84a5a',
    code: 'Rd',
    cooldownTicks: 215, // 10.75 s
    castFreezeTicks: 6,
    shape: 'nova',
    damage: 12,
    radius: 2.4,
    drainFrac: 0.35, // the blood school's law: every wound feeds the caster
    status: { status: 'bleed', power: 1, durationTicks: 90 },
  },
  {
    id: 'realm_rend',
    name: 'Realm Rend',
    desc: 'Put the splinter back where it came from — through everything in between.',
    color: '#9ae8de',
    code: 'Rr',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'beam', // the legendary tears a seam clean across the world
    damage: 15,
    range: 16,
    width: 0.65,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },

  // ------------------------------------- the ten voices, staff arts
  // Each chase staff names its own Art (the own-art law). Cadence
  // rides the staff-art band; identity rides the crown that speaks it.
  {
    id: 'wild_root',
    name: 'Wildroot',
    desc: 'The ground remembers being forest. For a while, it insists.',
    color: '#7a9a4a',
    code: 'Wl',
    cooldownTicks: 200, // 10 s — a zone earns a longer breath
    shape: 'ground_field',
    damage: 4,
    range: 11,
    radius: 2.0,
    // Five beats of root and briar — THE PAYOFF BRACKET FOR THE SHELF
    // caps the full channel under the at-anchor line fighter.
    fieldTicks: 90,
    pulseEveryTicks: 16,
    status: { status: 'chill', power: 1, durationTicks: 70 },
  },
  {
    id: 'day_breaks',
    name: 'The Day Breaks',
    desc: 'Dawn, delivered early, in a straight line, to everyone at once.',
    color: '#ffd98a',
    code: 'Db',
    cooldownTicks: 180, // 9 s
    castFreezeTicks: 4,
    shape: 'beam',
    damage: 10,
    range: 13,
    width: 0.6,
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },
  {
    id: 'moonfall',
    name: 'Moonfall',
    desc: 'Borrow the moon. Return it to the spot you were pointing at.',
    color: '#bcd8f0',
    code: 'Mf',
    cooldownTicks: 190, // 9.5 s
    shape: 'ground_aoe',
    damage: 9,
    range: 11,
    radius: 2.1,
    fuseTicks: 16,
    status: { status: 'chill', power: 1, durationTicks: 90 },
  },
  {
    id: 'shearwind',
    name: 'Shearwind',
    desc: 'The spindle lets one coil loose. The crowd rearranges itself.',
    color: '#d8e8f0',
    code: 'Sw',
    cooldownTicks: 160, // 8 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 7,
    radius: 2.6,
    knockback: 3.2,
    status: { status: 'shock', power: 1, durationTicks: 40 },
  },
  {
    id: 'the_molt',
    name: 'The Molt',
    desc: 'The fan sheds five feathers. Every one of them knows an address.',
    color: '#ff9a5a',
    code: 'Tm',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 4,
    range: 12,
    projectiles: 5,
    spreadArc: 0.9,
    projectileSpeed: 14,
    homing: 3.0,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'hollowing',
    name: 'Hollowing',
    desc: 'Open the hungry dark at their feet and let it do the inviting.',
    color: '#9a8ad8',
    code: 'Hl',
    cooldownTicks: 230, // 11.5 s
    shape: 'ground_field',
    damage: 5,
    range: 12,
    radius: 2.3,
    fieldTicks: 100,
    pulseEveryTicks: 16,
    knockback: -1.2, // the hollow does not chase; it PERSUADES
  },
  {
    id: 'red_toll',
    name: 'Red Toll',
    desc: 'The cup goes down the line and everyone pays into it.',
    color: '#e84a5a',
    code: 'Rt',
    cooldownTicks: 190, // 9.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 10,
    radius: 3.0,
    chainTargets: 3,
    drainFrac: 0.4, // the blood school's law: the toll feeds the taker
    status: { status: 'bleed', power: 1, durationTicks: 70 },
  },
  {
    id: 'axiom',
    name: 'Axiom',
    desc: 'State the obvious, three times, until the room accepts it.',
    color: '#c8b8f0',
    code: 'Ax',
    cooldownTicks: 200, // 10 s
    shape: 'pulse_nova',
    damage: 6,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 9,
  },
  {
    id: 'perihelion',
    name: 'Perihelion',
    desc: 'The comet takes its closest pass. Closest, this once, means here.',
    color: '#9ae8de',
    code: 'Ph',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 4,
    shape: 'ground_aoe',
    damage: 12,
    range: 12,
    radius: 2.3,
    fuseTicks: 18,
    knockback: 1.6,
  },
  {
    id: 'crownstorm',
    name: 'Crownstorm',
    desc: 'The crown holds court. Every head in the line is presented.',
    color: '#fff0a0',
    code: 'Cw',
    cooldownTicks: 210, // 10.5 s
    shape: 'chain_zap',
    damage: 8,
    range: 11,
    radius: 3.2,
    chainTargets: 5,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },
  {
    // THE DRAWN BREATH's blood voice, taught by heartspindle: a
    // channeled beam — the leech link, wound one beat at a time.
    id: 'red_thread',
    name: 'Red Thread',
    desc: 'Spool their blood onto the spindle. The thread only winds while you hold still.',
    color: '#c4372a',
    code: 'Rd',
    cooldownTicks: 220, // 11 s
    shape: 'beam',
    damage: 4,
    range: 9,
    width: 0.5,
    element: 'blood',
    channelTicks: 48, // 2.4 s held, three beats
    pulseEveryTicks: 16,
    drainFrac: 0.5, // the blood school's law: the thread feeds the spinner
  },
  {
    // THE DRAWN BREATH's mending voice, taught by candlewake: the held
    // mend — a vigil kept still, wounds closing beat by beat.
    id: 'vigil',
    name: 'Vigil',
    desc: 'Keep the candle. Each held beat the flame closes a wound on your watch.',
    color: '#e8d8a0',
    code: 'Vi',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    channelTicks: 64, // 3.2 s held, four beats
    pulseEveryTicks: 16,
    self: { heal: 3, durationTicks: 20 },
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

  // ---------------------------------------------------- relic actives
  {
    id: 'ember_dash',
    name: 'Ember Dash',
    desc: 'Blink forward in a streak of fire, igniting whatever you pass.',
    color: '#ff8a3c',
    code: 'Ed',
    cooldownTicks: 240, // 12 s
    shape: 'dash_strike',
    damage: 4,
    dashTiles: 6.0,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'healing_totem',
    name: 'Healing Totem',
    desc: 'Plant a totem that mends nearby allies while it stands.',
    color: '#7ac47a',
    code: 'Ht',
    cooldownTicks: 400, // 20 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'heal_totem', durationTicks: 200, radius: 2.6, power: 2 },
  },
  {
    id: 'snare_trap',
    name: 'Snare Trap',
    desc: 'Set a hidden snare that bites and chills the first thing to step in.',
    color: '#a08a4a',
    code: 'Sn',
    cooldownTicks: 300, // 15 s
    shape: 'summon',
    damage: 4,
    summon: { kind: 'snare_trap', durationTicks: 600, radius: 1.1, power: 1 },
  },
  {
    id: 'storm_bell',
    name: 'Storm Bell',
    desc: 'Ring out a crack of lightning that staggers everything close.',
    color: '#e8e06a',
    code: 'Sb',
    cooldownTicks: 320, // 16 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 4,
    radius: 2.4,
    // Stun caps at SHOCK_MAX_TICKS; the rest is lingering static charge
    // that reaction follow-ups can detonate at human speed.
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },
  {
    id: 'hunters_decoy',
    name: "Hunter's Decoy",
    desc: 'Drop a straw double that draws enemies away from you.',
    color: '#c4a35a',
    code: 'Hd',
    cooldownTicks: 360, // 18 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'decoy', durationTicks: 140, radius: 5, power: 0 },
  },
  {
    id: 'stone_aegis',
    name: 'Stone Aegis',
    desc: 'For eight seconds, the river stone takes the blows meant for you.',
    color: '#8a9484',
    code: 'Ag',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 12, durationTicks: 160 },
  },
  {
    id: 'coil_lance',
    name: 'Coil Lance',
    desc: 'Uncork the thunderclap — one straight line of finished storm.',
    color: '#e8e06a',
    code: 'Cl',
    cooldownTicks: 320, // 16 s
    shape: 'beam',
    damage: 9,
    range: 11,
    width: 0.55,
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },
  {
    id: 'bramble_burst',
    name: 'Bramble Burst',
    desc: 'Point the ring at ground it likes. The briar does the rest.',
    color: '#5a7a42',
    code: 'Bb',
    cooldownTicks: 340, // 17 s
    shape: 'ground_field',
    damage: 3,
    range: 10,
    radius: 2.0,
    fieldTicks: 100,
    pulseEveryTicks: 16,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'arcane_seekers',
    name: 'Arcane Seekers',
    desc: 'Loose three motes of asking-light. Each picks a foe and does not lose it.',
    color: '#b49af0',
    code: 'Ak',
    cooldownTicks: 280, // 14 s
    shape: 'projectile_fan',
    damage: 4,
    range: 12,
    projectiles: 3,
    spreadArc: 0.9,
    projectileSpeed: 11,
    homing: 5.5, // lazy, deliberate curves — you can watch them choose
    element: 'arcane',
  },
  {
    id: 'venom_dart',
    name: 'Venom Dart',
    desc: 'One green needle with a name on it. Walls are somebody else\'s problem.',
    color: '#a0c050',
    code: 'Vd',
    cooldownTicks: 260, // 13 s
    shape: 'projectile_fan',
    damage: 6,
    range: 11,
    projectiles: 1,
    projectileSpeed: 13,
    homing: 6.5, // the snap-turn hunter
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 100 },
  },

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
    id: 'tumble_shot',
    name: 'Tumble Shot',
    desc: 'Roll away from your aim and loose an arrow mid-tumble.',
    color: '#8a9a5a',
    code: 'Ts',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: -5.2, // away from the aim — the disengage tool
    projectiles: 1, // ...and the arrow flies at whatever you fled
    projectileSpeed: 16,
    range: 12,
  },
  {
    id: 'rain_of_arrows',
    name: 'Rain of Arrows',
    desc: 'Darken the sky over a patch of ground — then it lands.',
    color: '#6b8a5a',
    code: 'Ra',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 9,
    range: 12,
    radius: 2.0,
    fuseTicks: 18,
  },
  {
    id: 'twin_strike',
    name: 'Twin Strike',
    desc: 'Two heavy shafts, loosed as one, punching through the line.',
    color: '#5a7a4a',
    code: 'Tw',
    cooldownTicks: 180, // 9 s
    shape: 'projectile_fan',
    damage: 10,
    range: 16,
    projectiles: 2,
    spreadArc: 0.12,
    projectileSpeed: 18,
    pierce: true,
  },
  {
    id: 'arc_bolt',
    name: 'Arc Bolt',
    desc: 'A crack of lightning that leaps from foe to foe.',
    color: '#e8e06a',
    code: 'Ab',
    cooldownTicks: 160, // 8 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },
  {
    id: 'blink',
    name: 'Blink',
    desc: 'Step between places — arrive before your enemies notice.',
    color: '#b49af0',
    code: 'Bk',
    cooldownTicks: 200, // 10 s
    shape: 'dash_strike',
    damage: 0,
    dashTiles: 7.6,
    travel: 'blink',
  },
  {
    id: 'meteor_shard',
    name: 'Meteor Shard',
    desc: 'Call a burning shard down on your mark.',
    color: '#e85a3c',
    code: 'Ms',
    cooldownTicks: 260, // 13 s
    shape: 'ground_aoe',
    damage: 13,
    range: 12,
    radius: 2.2,
    fuseTicks: 20,
    knockback: 1.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
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
  {
    id: 'storm_of_shafts',
    name: 'Storm of Shafts',
    desc: 'Blacken a patch of sky and keep it black — arrows on a schedule.',
    color: '#8ab4c8',
    code: 'Zh',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE (Phase 4b): the stand-in barrage finally STANDS —
    // the sky stays black only while the archer holds the note. The
    // fire-and-forget field retires; the volley is a staked channel.
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.2,
    fuseTicks: 12,
  },
  // The rogue's ladder: unlocked by the sneak skill — the payoff of
  // the shadow grind, slottable from any hand (THE FREE HAND).
  {
    id: 'rend',
    name: 'Rend',
    desc: 'Tear the wound wide — a shallow cut that bleeds like a deep one.',
    color: '#8a3040',
    code: 'Rz',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 4,
    range: 1.9,
    arc: 0.9,
    status: { status: 'bleed', power: 2, durationTicks: 120 },
  },
  {
    id: 'smoke_bomb',
    name: 'Smoke Bomb',
    desc: 'Drop the room into choking gray. Everything caught gropes at half speed.',
    color: '#8a8794',
    code: 'Sz',
    cooldownTicks: 240, // 12 s
    shape: 'nova',
    damage: 2,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 100 },
  },
  {
    id: 'envenom',
    name: 'Envenom',
    desc: 'Oil the edge. For eight seconds, every cut you land carries venom.',
    color: '#a0c050',
    code: 'Ev',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { onHitStatus: { status: 'venom', power: 1, durationTicks: 80 }, durationTicks: 160 },
  },
  {
    id: 'night_fangs',
    name: 'Night Fangs',
    desc: 'Three thrown fangs of dark that pick their own throats to find.',
    color: '#4a4058',
    code: 'Nf',
    cooldownTicks: 220, // 11 s
    shape: 'projectile_fan',
    damage: 5,
    range: 10,
    projectiles: 3,
    spreadArc: 0.7,
    projectileSpeed: 15,
    homing: 6.0,
    element: 'void',
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'maelstrom',
    name: 'Maelstrom',
    desc: 'Hold the sea open on dry land — everything caught walks the drain.',
    color: '#6aa0c8',
    code: 'Mm',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE's pilot: the vortex is HELD open — 2.4s planted,
    // one drag of the drain per beat, staked where the ring released.
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.6,
    fuseTicks: 16,
    knockback: -2.2, // the drain: a hard drag into the eye, every beat
    status: { status: 'chill', power: 1, durationTicks: 80 },
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

  // ----------------------------------------------------------- sigils
  {
    id: 'bone_tempest',
    name: 'Bone Tempest',
    desc: 'The fallen champion answers: three waves of grinding bone.',
    color: '#e8e2d0',
    code: 'Bt',
    cooldownTicks: 900, // 45 s — an ultimate earns its moment
    castFreezeTicks: 6,
    shape: 'pulse_nova',
    damage: 9,
    radius: 2.8,
    pulses: 3,
    pulseEveryTicks: 12,
    knockback: 1.8,
    status: { status: 'bleed', power: 1, durationTicks: 80 },
  },

  // ----------------------------------------------------- npc specials
  {
    id: 'ground_slam',
    name: 'Ground Slam',
    desc: 'The champion raises its blade and brings the floor up with it.',
    color: '#e8e2d0',
    code: 'Gs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 6,
    range: 0, // centered on the target's position when cast
    radius: 2.2,
    fuseTicks: 24, // generous 1.2 s telegraph — dodgeable on reaction
    knockback: 2.0,
  },
  {
    id: 'rallying_howl',
    name: 'Rallying Howl',
    desc: 'The matriarch throws her head back — dread roots your legs, and the pack answers.',
    color: '#9aa2b8',
    code: 'Rh',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the howl itself barely bruises — the PACK is the payload
    radius: 2.6,
    // Dread runs cold: slowed legs while every wolf in earshot closes.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'ravening_cackle',
    name: 'Ravening Cackle',
    desc: 'The packlord throws back its head and laughs the blood cold. Legs slow. The warband answers.',
    color: '#c9a44a',
    code: 'Rc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the laugh barely bruises — the WARBAND is the payload
    radius: 2.6,
    // The same cold dread as the howl, in an uglier register.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'hushing_screech',
    name: 'Hushing Screech',
    desc: 'The elder owl spreads its wings and screams the wood silent. Cold roots your legs, and the parliament drops off its boughs.',
    color: '#b8c4d8',
    code: 'Hs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the scream barely bruises — the PARLIAMENT is the payload
    radius: 2.6,
    // The hush runs cold: rooted legs while every owl in earshot stoops.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'vixens_scream',
    name: "Vixen's Scream",
    desc: 'The matriarch screams the night open. Blood runs cold, and the skulk comes silent through the hedges.',
    color: '#d97a35',
    code: 'Vs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the scream barely bruises — the SKULK is the payload
    radius: 2.6,
    // The same cold dread as the howl, keener and thinner.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

  // -------------------- THE VOICES (enemy arts, docs/enemy-arts-plan.md
  // Phase 3): the bestiary's kit abilities. Every entry keeps
  // cooldownTicks 0 (pacing lives on the NpcDef) and buys any die
  // above its wielder's basic with warning time — THE TELEGRAPH
  // PREMIUM is contract-tested in content.test.ts.
  {
    id: 'goblin_firebolt',
    name: 'Firebolt',
    desc: 'The firecaller draws breath and spits a gobbet of camp-fire that clings where it lands.',
    color: '#ff9a44',
    code: 'Fb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 3,
    projectiles: 1,
    projectileSpeed: 10,
    range: 9,
    // THE FLIGHT VOICE: the gobbet flies as the mastered ember brand
    // (arx elemental flight — fire tongues, wake, honest fizzle on
    // impact), never a wooden shaft.
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'cinder_ring',
    name: 'Cinder Ring',
    desc: 'The firecaller marks the ground under your running feet, and the mark catches.',
    color: '#c43a18',
    code: 'Cr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 4,
    range: 0, // staked where the caster's aim law puts it
    radius: 1.8,
    fuseTicks: 20, // a full second to leave the mark
    status: { status: 'burn', power: 1, durationTicks: 80 },
  },
  {
    id: 'gloom_spittle',
    name: 'Gloom Spittle',
    desc: 'Three ropes of green bile, spat wide — the spread is the point.',
    color: '#a0c050',
    code: 'Gt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 2,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 9,
    range: 8,
    // THE FLIGHT VOICE: bile ropes fly verdant-green (arx elemental
    // flight), never as arrows.
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 80 },
  },
  {
    id: 'miasma_ring',
    name: 'Miasma Ring',
    desc: 'The gloomcaller seeds the ground and a green haze stands up out of it. Standing in it is the mistake.',
    color: '#7ac46a',
    code: 'Mr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 2,
    range: 0,
    radius: 2.0,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'bone_volley',
    name: 'Bone Volley',
    desc: 'A fan of sharpened splinters, rattled loose and loosed.',
    color: '#d8d4c8',
    code: 'Bv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 3,
    projectiles: 4,
    spreadArc: 0.7,
    projectileSpeed: 10,
    range: 9,
  },
  {
    id: 'grave_mist',
    name: 'Grave Mist',
    desc: 'Cold rises off the ground like the door of a tomb swinging open. Legs slow in it.',
    color: '#8ac4e8',
    code: 'Gm',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 2,
    range: 0,
    radius: 2.2,
    fieldTicks: 80,
    pulseEveryTicks: 20,
    status: { status: 'chill', power: 2, durationTicks: 40 },
  },
  {
    id: 'raise_the_fallen',
    name: 'Raise the Fallen',
    desc: 'The chanter speaks a name the ground remembers, and the ground answers.',
    color: '#b8c4d8',
    code: 'Rf',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'summon',
    damage: 0,
    // THE RAISING LANE: real bestiary bodies, capped alive, born into
    // the chanter's fight (docs/enemy-arts-plan.md LAW 1).
    summonNpc: { npc: 'skeleton', count: 2, capAlive: 2, levelDelta: -6 },
  },
  {
    id: 'web_snare',
    name: 'Web Snare',
    desc: 'Silk across your line of retreat. It costs nothing but your speed — which is everything.',
    color: '#e8e8e0',
    code: 'Ws',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 0, // the snare never bites — the SLOW is the payload
    range: 0,
    radius: 1.6,
    fieldTicks: 70,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 2, durationTicks: 45 },
  },
  {
    id: 'reaping_sweep',
    name: 'Reaping Sweep',
    desc: 'The reaver sets its feet and swings through everything in front of it. The set feet are your warning.',
    color: '#c9a44a',
    code: 'Rs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    damage: 5,
    range: 2.3,
    arc: 1.3, // a wide crescent — behind the reaver is the safe ground
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'rattling_volley',
    name: 'Rattling Volley',
    desc: 'The archer nocks a fistful at once. None fly true. All fly.',
    color: '#d8d4c8',
    code: 'Rv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 2,
    projectiles: 5,
    spreadArc: 0.9,
    projectileSpeed: 10,
    range: 8,
  },
  {
    id: 'gnawed_mending',
    name: 'Gnawed Mending',
    desc: 'The troll stops fighting and starts knitting. Every heartbeat you allow it undoes one of yours.',
    color: '#7ac46a',
    code: 'Gn',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'self_buff',
    damage: 0,
    // A quarter of the body back — interrupt the breath or fight it twice.
    self: { healFrac: 0.28, durationTicks: 1 },
  },
  // ------------------------------------------------ THE AUTHORED TIDE
  // (statusBook Phase 5): eight crowns, eight pages — every boss owns
  // ONE wave-one state as identity. Self boons walk the caster's own
  // apply door (selfStatus), so the bit rides the wire and the whole
  // visible layer answers; player-facing holds obey FAIR HANDS at the
  // page (root clamps at the door, stagger is the ONE player-stagger
  // signature in the game, per the green-light).
  {
    id: 'tyrants_frenzy',
    name: 'Burning Frenzy',
    desc: 'The tyrant drinks its own fire. Each bellow quickens the next blow.',
    color: '#ffd76a',
    code: 'Bf',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'quicken', power: 0, durationTicks: 240 }, durationTicks: 1 },
  },
  {
    id: 'gravecold_pall',
    name: 'Gravecold Pall',
    desc: 'The crypt air settles on your arms. Every blow you land is heavier to lift and lighter to feel.',
    color: '#8a6a9a',
    code: 'Gp',
    cooldownTicks: 0,
    shape: 'nova',
    damage: 2,
    radius: 3.2,
    status: { status: 'weaken', power: 12, durationTicks: 120 },
  },
  {
    id: 'barrow_knit',
    name: 'Barrow Knit',
    desc: 'The mound takes its lord back and gives him out again, whole. Break the knitting or fight him twice.',
    color: '#7ad0a0',
    code: 'Bk',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'mend', power: 6, durationTicks: 160 }, durationTicks: 1 },
  },
  {
    id: 'tide_grasp',
    name: 'Tide Grasp',
    desc: 'The water closes over your boots and hardens. Cut your way loose or wait for the tide to change its mind.',
    color: '#a8814f',
    code: 'Tg',
    cooldownTicks: 0,
    shape: 'ground_aoe',
    damage: 3,
    radius: 2.2,
    range: 6,
    // The telegraph law: the tide gathers where it will close — FAIR
    // HANDS starts before the root even lands.
    fuseTicks: 18,
    status: { status: 'root', power: 0, durationTicks: 40 },
  },
  {
    id: 'barnacle_plate',
    name: 'Barnacle Plate',
    desc: 'The deep maw armors itself in its own reef, coat over coat.',
    color: '#98a4b0',
    code: 'Bp',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'stonehide', power: 0, durationTicks: 400 }, durationTicks: 1 },
  },
  {
    id: 'matriarchs_howl',
    name: 'Unmanning Howl',
    desc: 'The matriarch names you prey, and your arms believe her.',
    color: '#8a6a9a',
    code: 'Uh',
    cooldownTicks: 0,
    shape: 'nova',
    damage: 2,
    radius: 3.5,
    status: { status: 'weaken', power: 10, durationTicks: 100 },
  },
  {
    id: 'oldfangs_blood',
    name: 'Old Blood Rising',
    desc: 'The oldfang remembers being young. Its jaws start arriving earlier than they should.',
    color: '#ffd76a',
    code: 'Ob',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'quicken', power: 0, durationTicks: 240 }, durationTicks: 1 },
  },
  {
    id: 'anvil_toll',
    name: 'The Anvil Tolls',
    desc: 'The golem strikes the ground like a struck bell, and for one ringing breath your body forgets its orders.',
    color: '#dcd8f0',
    code: 'At',
    cooldownTicks: 0,
    shape: 'nova',
    damage: 6,
    radius: 2.6,
    knockback: 1.2,
    status: { status: 'stagger', power: 0, durationTicks: 14 },
  },
  {
    id: 'marrow_chill',
    name: 'Marrow Chill',
    desc: 'The champion plants its blade and the cold of the crypt walks out of it in a ring.',
    color: '#b8c4d8',
    code: 'Mc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 4,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'rending_lunge',
    name: 'Rending Lunge',
    desc: 'The packlord drops low and comes through you, jaws first.',
    color: '#c9a44a',
    code: 'Rl',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 5,
    status: { status: 'bleed', power: 2, durationTicks: 70 },
  },
  // ------------------------------------------------------------------
  // THE BROTHERHOOD (docs/boss-system-plan.md, the wolf crown): the
  // old wolf's three words — the hamstring that slows you, the call
  // that is spoken FROM DISTANCE (the lope carries him away first),
  // and the flat silent return. Together they are one sentence:
  // harry, break, call, come back through you.
  // ------------------------------------------------------------------
  {
    id: 'hamstring_bite',
    name: 'Hamstring Bite',
    desc: 'He goes low, under everything, for the tendon above the heel. You will keep standing — just not quickly.',
    color: '#8f96a8',
    code: 'Hb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    damage: 3,
    range: 1.6,
    arc: 0.9,
    // THE SLOW: heavier cold than any howl — the whole point of the bite.
    status: { status: 'chill', power: 2, durationTicks: 80 },
  },
  {
    id: 'call_the_brotherhood',
    name: 'Call the Brotherhood',
    desc: 'He breaks away, sets his feet on ground he trusts, and calls. The answer comes on four legs, from every shadow at once.',
    color: '#8a94b8',
    code: 'Cb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'summon',
    damage: 0,
    // THE BROTHERHOOD LANE: real wolves, capped alive, born into his
    // fight — and scaled to HIS spawned level, so the pack grows with
    // the court that holds him.
    summonNpc: { npc: 'wolf', count: 2, capAlive: 3, levelDelta: -4 },
  },
  {
    id: 'throat_lunge',
    name: 'Throat Lunge',
    desc: 'The return of the wolf that ran: flat, silent, and straight through where you stand.',
    color: '#b8bfd4',
    code: 'Tl',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 7,
    travel: 'charge',
    status: { status: 'bleed', power: 2, durationTicks: 80 },
  },
  // ------------------------------------------------------------------
  // THE COURT'S HOUND (the fey wolf): three words from the estate
  // that never thawed. The ring is seeded where you are GOING, the
  // veil is the cold bursting off a crowded hound, and the step is
  // the legend itself — the hound comes apart into glimmer and
  // arrives already through you. One sentence: fence, shove, close.
  // ------------------------------------------------------------------
  {
    id: 'faerie_ring',
    name: 'Faerie Ring',
    desc: 'Pale toadstool-light stakes a circle under your running feet. Every old story agrees on what happens to those who stand in one.',
    color: '#9ff0d8',
    code: 'Fr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 2, // the ring barely bites — the CAUGHT are the payload
    range: 0,
    radius: 2.0,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    // The court's cold climbs from the circle floor — legs go slow
    // and the hound's next word finds you standing still.
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'gloaming_veil',
    name: 'Gloaming Veil',
    desc: 'The hound stands still and the dusk arrives early, all at once, shoving cold through everyone who crowded it.',
    color: '#8a7fb0',
    code: 'Gv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 3,
    radius: 2.2,
    knockback: 1.2, // the veil MAKES the space the step will use
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'glimmer_step',
    name: 'Glimmer Step',
    desc: 'The hound comes apart into cold light and arrives already past you, jaws first. The bite is real. The wolf, briefly, was not.',
    color: '#b8ecdc',
    code: 'Gs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 8,
    // The court's jaws tear AND chill — the wound that keeps you
    // slow enough to be wounded again.
    status: { status: 'bleed', power: 2, durationTicks: 80 },
  },
  {
    id: 'shrilling_dart',
    name: 'Shrilling Dart',
    desc: 'The bat folds and comes through you on a scream.',
    color: '#8a7458',
    code: 'Sd',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 1, // the wound is small — the WOUND KEEPS PAYING
    dashTiles: 3.6,
    status: { status: 'bleed', power: 1, durationTicks: 50 },
  },

  // ------------------------------ THE TIDE'S RAMPART (the giant crab):
  // the shore bastion's two words. The grip is the whole animal spoken
  // once — announced long, paid at the telegraph premium, and what it
  // closes on is held cold. The jet is the reach it should not have:
  // the sea thrown flat, a lance of cold brine that flies on the frost
  // brand and finds where you were going, not where you are.
  {
    id: 'breakwater_grip',
    name: 'Breakwater Grip',
    desc: 'The great claw swings wide open and hangs there, a long bad promise. Then the harbor closes.',
    color: '#6d8577',
    code: 'Bg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    damage: 9,
    range: 1.7,
    // A narrow crescent dead ahead of the crusher — flank it or wear it.
    arc: 0.9,
    // THE HOLD: no shove, no throw. The grip's whole argument is that
    // you stop leaving.
    status: { status: 'chill', power: 2, durationTicks: 90 },
  },
  {
    id: 'brine_jet',
    name: 'Brine Jet',
    desc: 'The mouthparts fold back and the sea comes out of it, flat and hard and colder than the sea has any right to be.',
    color: '#7ab0b8',
    code: 'Bj',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 5,
    projectiles: 1,
    projectileSpeed: 11,
    range: 8,
    // THE FLIGHT VOICE: the jet flies as the frost brand — cold water
    // at pressure IS winter with intent, never a wooden shaft.
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  // ---- THE STONE COURT (the basilisks): six-legged dracolisk kin.
  // The gaze is the species — everything else is teeth.
  {
    id: 'stone_gaze',
    name: 'Stone Gaze',
    desc: 'The pale-green eyes stop blinking, and the ground under you remembers being rock. Move, or be part of the landscape.',
    color: '#b9d18c',
    code: 'Sg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    // The petrification GRAZES — the hold is the argument, the bite
    // that follows is the sentence.
    damage: 4,
    radius: 1.4,
    range: 6,
    // FAIR HANDS: the gaze gathers where it will fall — the licensed
    // hold warns longer than half its lock before it lands (ledger law).
    fuseTicks: 16,
    // THE STONE TAKES HOLD: a licensed root applier (statusWave
    // register) — stone in the boots, snapped by honest damage.
    status: { status: 'root', power: 0, durationTicks: 36 },
  },
  {
    id: 'mire_spit',
    name: 'Mire Spit',
    desc: 'The fen basilisk coughs up the swamp itself — a rope of green rot that clings where it lands.',
    color: '#7a8b4f',
    code: 'Mi',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 6,
    projectiles: 1,
    projectileSpeed: 10,
    range: 7,
    // THE FLIGHT VOICE: fen rot flies as the verdant brand — living
    // corruption with intent, never a wooden shaft.
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 90 },
  },
  {
    id: 'stone_mantle',
    name: 'Stone Mantle',
    desc: 'The elder turns its own gaze inward. The hide answers the way hides answer that look — by becoming a wall.',
    color: '#8f8a76',
    code: 'Sm',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'self_buff',
    damage: 0,
    // THE SELF-PAGE DOOR: a licensed stonehide applier (statusWave
    // register) — the elder armors in its own petrification.
    self: { selfStatus: { status: 'stonehide', power: 0, durationTicks: 360 }, durationTicks: 1 },
  },

  // ------------------------------------ THE SKRAL (docs/skral-plan.md):
  // the brine-folk's three words. The tidecaller speaks two — the lash
  // thrown flat off the wrist and the undertow staked where your feet
  // are headed — and the deepking speaks the third: the croak that is
  // not a spell at all, just the whole shoal's name said once, loudly.
  {
    id: 'tide_lash',
    name: 'Tide Lash',
    desc: 'The tidecaller snaps its wrist and a rope of brine cracks across the bank, cold as the deep it came from.',
    color: '#6fa8a0',
    code: 'Tl',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 4,
    projectiles: 1,
    projectileSpeed: 11,
    range: 8,
    // Cold water at pressure IS winter with intent (the crab's law).
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'riptide_ring',
    name: 'Riptide Ring',
    desc: 'The tidecaller marks a ring of ground, and the ground remembers it used to be riverbed. Do not be standing in the memory.',
    color: '#54889c',
    code: 'Rr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 5,
    range: 0, // staked where the caster's aim law puts it
    radius: 2.2,
    fuseTicks: 22,
    // THE UNDERTOW: no shove — the water's argument is that you slow.
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'shoal_call',
    name: 'Shoal-Call',
    desc: "The deepking fills its throat and croaks the shoal's one word. The bank answers.",
    color: '#7c9c8a',
    code: 'Sc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 4,
    range: 0,
    radius: 3.2,
    fuseTicks: 18,
    // The croak grips like cold water down the spine.
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  // --------------------- THE BRINE CROWNS (docs/boss-system-plan.md):
  // the skral bosses' eight words — the tidelord's four spoken FROM
  // the oldest pool (the tide fights for the king), and the deepmaw's
  // four spoken by appetite alone. Every word is water remembering
  // something: the flood it owes, the pressure it keeps, the spears
  // it feeds, and what the gullet never gave back.
  {
    id: 'drowning_surge',
    name: 'Drowning Surge',
    desc: 'The tidelord lifts a palm and the ground ahead of your next step remembers the flood. The water stands, and stays, and argues.',
    color: '#4a7ea0',
    code: 'Ds',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    // The flood is an ARGUMENT, not a blow: low tick, long stay —
    // the field's job is to own the lane the fight wanted.
    damage: 2,
    range: 0,
    radius: 2.6,
    fieldTicks: 90,
    pulseEveryTicks: 20,
    // Deep water holds ankles: the heaviest chill in the dialect.
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'abyssal_jet',
    name: 'Abyssal Jet',
    desc: 'The tidelord plants the trident and the deep comes up THROUGH it — a bar of black water at pressure, straight and flat and cold as the trench it left.',
    color: '#3a6a8c',
    code: 'Aj',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'beam',
    // Die 10 on the basic 7 rides the 1.5x telegraph lane (14t wind).
    damage: 10,
    range: 9,
    width: 0.6,
    // Trench water IS winter with intent (the family's flight law).
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'court_of_spears',
    name: 'Court of Spears',
    desc: 'The tidelord croaks a name older than the weir, and harpooners stand up out of water that held no one. The court was always here. It was waiting to be needed.',
    color: '#6a8ea8',
    code: 'Cq',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'summon',
    damage: 0,
    // THE RANGED COURT: every other crown's adds come for your throat;
    // the tidelord's court STANDS OFF and throws — the fight problem
    // is the ring of spears, not the pile of teeth. Scaled to the
    // caster's spawned level (the brotherhood lane), capped alive.
    summonNpc: { npc: 'skral_harpooner', count: 2, capAlive: 4, levelDelta: -5 },
  },
  {
    id: 'kingspool_geyser',
    name: 'Kingspool Geyser',
    desc: 'Stand too near the king and the pool itself objects — the water under your feet goes UP, and again, and again.',
    color: '#7ab8c4',
    code: 'Kg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'pulse_nova',
    // Three honest waves off the king's own feet: the anti-crowd
    // answer that punishes standing IN the throne.
    damage: 6,
    radius: 2.4,
    pulses: 3,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'shallows_rush',
    name: 'Shallows Rush',
    desc: 'The deepmaw drops flat as an eel and comes THROUGH you on a sheet of its own bow-wave. The water arrives a heartbeat before the meat does.',
    color: '#7e9a8c',
    code: 'Sw',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 6.5,
    travel: 'charge',
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'gullet_snap',
    name: 'Gullet Snap',
    desc: 'The jaw unhinges past what a skull should allow and closes like a weir gate. Whatever armor was in the way is in the way no longer.',
    color: '#9ab0a0',
    code: 'Gs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    // Die 9 on the basic 6: the 1.5x lane, bought with a 14t wind.
    damage: 9,
    // THE CRACKED SHELL: the game's one amplifier mark — the bite
    // ruins your guard and everything after hits a tenth harder.
    status: { status: 'sunder', power: 10, durationTicks: 80 },
  },
  {
    id: 'gorge_spray',
    name: 'Gorge Spray',
    desc: 'It heaves, and the fan of half-kept brine that follows is nothing the tide will take credit for. What the gullet keeps, rots.',
    color: '#8a9a5c',
    code: 'Gy',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 5,
    projectiles: 5,
    spreadArc: 1.0,
    projectileSpeed: 9,
    range: 6,
    // The one venom in the dialect — swallowed water goes bad.
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'breaching_crash',
    name: 'Breaching Crash',
    desc: 'The deepmaw goes UNDER — a long beat of standing water and a wake you can read — and then the bank where you stood is a crater wearing spray.',
    color: '#647e6e',
    code: 'Bc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'leap_slam',
    // Die 12 on the basic 6: the full 2.5x premium, bought with the
    // longest wind any skral draws (24t — the whole bank reads it).
    damage: 12,
    dashTiles: 7,
    radius: 2.3,
    knockback: 1.8,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  // ------------------------- THE LEGION (docs/hobgoblin-plan.md): the
  // hobgoblins' three words, all spoken in iron and flame. The
  // warcaster speaks two — the brand thrown flat and hard, and the
  // forge-ring staked where your feet are headed — and the warlord
  // speaks the third: the horn, which is not a spell at all, just an
  // ORDER, and the legion is drilled to obey it.
  {
    id: 'iron_brand',
    name: 'Iron Brand',
    desc: 'The warcaster draws a bar of white-hot iron out of the empty air and hurls it flat. What it touches, it marks.',
    color: '#e08a3c',
    code: 'Ib',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    // Die 4 at a 12-tick wind: the telegraph premium's 1.5x lane over
    // the warcaster's basic 3 — the burn is the real bill.
    damage: 4,
    projectiles: 1,
    projectileSpeed: 12,
    range: 8,
    // Forge-iron flies as the ember brand — heat with a shape to it.
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 40 },
  },
  {
    id: 'forge_ring',
    name: 'Forge-Ring',
    desc: 'The warcaster stakes a smith\'s circle on the ground and the earth inside it remembers the furnace.',
    color: '#c25c2e',
    code: 'Fr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 5,
    range: 0,
    radius: 2.2,
    fuseTicks: 22,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },
  {
    id: 'warlord_horn',
    name: 'Warlord\'s Horn',
    desc: 'The warlord sounds the horn once. It is not a request, and the legion does not treat it as one.',
    color: '#b08a3e',
    code: 'Wh',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 4,
    range: 0,
    radius: 3.2,
    fuseTicks: 16,
  },

  // -------------------------------- THE EARTH STANDS UP (golem arts,
  // docs/golems-plan.md): four constructs, and every big die bought at
  // the telegraph premium off a slow heavy basic. A golem's art is
  // always announced; the fight it teaches is spacing.
  {
    id: 'hillstone_throw',
    name: 'Hillstone Throw',
    desc: 'The golem tears a stone from its own shoulder and puts it through the air. Watch it come.',
    color: '#8a8164',
    code: 'Hw',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 10,
    projectiles: 1,
    // The slowest flight in the game. The dodge IS the read: you can
    // watch the whole arc and simply not be under it.
    projectileSpeed: 6,
    range: 9,
    element: 'stone',
    splashRadius: 1.2,
  },
  {
    id: 'quarry_ring',
    name: 'Quarry Ring',
    desc: 'The golem strikes the ground, and the ground stands up around you.',
    color: '#9a8f72',
    code: 'Qr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 9,
    range: 0, // staked where the caster's aim law puts it
    radius: 2.4,
    fuseTicks: 20,
    knockback: 1.5,
  },
  {
    id: 'anvil_fall',
    name: 'Anvil Fall',
    desc: 'Both fists over its head, held a long breath. Where they land, the floor rings like a struck anvil.',
    color: '#aab2c0',
    code: 'Av',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    // The biggest telegraphed die below the boss tier, and the most
    // warning: 22t of raised fists plus the fuse.
    damage: 16,
    range: 0,
    radius: 2.0,
    fuseTicks: 18,
    knockback: 2.5,
  },
  {
    id: 'drawn_bolt',
    name: 'Drawn Bolt',
    desc: 'The golem leans, the joints hiss, and it comes through you shoulder first.',
    color: '#c8b06a',
    code: 'Dw',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 10,
    dashTiles: 8, // the orbit-breaker — circling feet meet the shoulder
    travel: 'charge',
  },
  {
    id: 'slag_gobbet',
    name: 'Slag Gobbet',
    desc: 'A fistful of its own melt, lobbed burning. It clings where it lands.',
    color: '#ff7a2e',
    code: 'Sb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 11,
    projectiles: 1,
    projectileSpeed: 7,
    range: 9,
    element: 'ember',
    splashRadius: 1.0,
    status: { status: 'burn', power: 1, durationTicks: 70 },
  },
  {
    id: 'vent_ring',
    name: 'Vent Ring',
    desc: 'The golem stakes the ground under your running feet, and the ground learns to breathe fire.',
    color: '#d84c1e',
    code: 'Vt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 12,
    range: 0,
    radius: 2.0,
    fuseTicks: 22, // a long fuse — the vents hiss before they speak
    status: { status: 'burn', power: 1, durationTicks: 80 },
  },
  {
    id: 'crust_burst',
    name: 'Crust Burst',
    desc: 'The shell cannot hold the furnace forever. Once a fight, it stops trying.',
    color: '#ffb03a',
    code: 'Cu',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 15,
    radius: 2.6,
    knockback: 1.5,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'calving_volley',
    name: 'Calving Volley',
    desc: 'Three shards shear off the golem and fly. Winter travels in straight lines.',
    color: '#9ad4e8',
    code: 'Cy',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 9,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 8,
    range: 9,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'winters_floor',
    name: "Winter's Floor",
    desc: 'The golem breathes out and marks the ground ahead of you. The mark freezes over.',
    color: '#7ab8d8',
    code: 'Wt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 14,
    range: 0,
    radius: 2.2,
    fuseTicks: 24, // the longest golem fuse — the pane grows slowly shut
    status: { status: 'chill', power: 2, durationTicks: 80 },
  },

  // -------------------------------- THE HILL COMES DOWN (ogre arts,
  // docs/ogres-plan.md): the giant-kin's whole vocabulary is WEIGHT.
  // Every big die announced long and loud off the slow heavy basic —
  // an ogre never surprises you; it simply keeps being an ogre at you.
  {
    id: 'skull_toll',
    name: 'Skull Toll',
    desc: 'The club goes up in both hands and stays up a long, bad moment. Where it lands, the ground rings.',
    color: '#b3985e',
    code: 'Sk',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    // The family's biggest word, priced at the full premium: sixteen
    // ticks of raised club plus the fuse. You were told.
    damage: 17,
    range: 0,
    radius: 1.7,
    fuseTicks: 16,
    knockback: 2,
  },
  {
    id: 'ogre_tantrum',
    name: 'Tantrum',
    desc: 'Past its patience, an ogre stops aiming. Fists, club, elbows — everything, everywhere, until nothing near it stands.',
    color: '#a4552e',
    code: 'Tt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'flurry',
    // Each blow is only the basic — the tantrum's threat is that
    // there are THREE of them and no thought behind any of it.
    damage: 7,
    hits: 3,
    pulseEveryTicks: 6, // heavy blows land on a giant's clock, not a duelist's
    range: 2.5,
    arc: 1.1,
    knockback: 1,
  },
  {
    id: 'millstone_toss',
    name: 'Millstone Toss',
    desc: 'Two hands, three staggering steps, and a hundredweight of quarried wheel in the air. It keeps rolling.',
    color: '#8f8672',
    code: 'Mt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 14,
    projectiles: 1,
    // Slow, flat, and enormous — the whole arc is legible; the splash
    // is the lesson about ALMOST dodging.
    projectileSpeed: 7,
    range: 10,
    element: 'stone',
    splashRadius: 1.4,
  },
  {
    id: 'gravel_rake',
    name: 'Gravel Rake',
    desc: 'A fistful of the road itself, thrown flat. The scatter punishes the sideways answer.',
    color: '#9a8a68',
    code: 'Gv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 6,
    projectiles: 3,
    spreadArc: 0.55,
    projectileSpeed: 9,
    range: 8,
    element: 'stone',
  },
  {
    id: 'hill_bellow',
    name: 'Hill Bellow',
    desc: 'The great gut fills like a bellows, and what comes out lays the grass down flat — and you with it.',
    color: '#7e7f74',
    code: 'Hb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 12,
    radius: 3.2,
    // The knockback IS the art: the bellow is a spacing argument, and
    // an ogre wins every spacing argument it is allowed to finish.
    knockback: 2,
  },
  {
    id: 'shaken_stones',
    name: 'Shaken Stones',
    desc: 'The bellow does not stop at the grass. Overhead, the hillside lets go — where you are going to be.',
    color: '#8a8164',
    code: 'Sn',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 10,
    range: 0, // staked where the caster's aim law puts it
    radius: 2.2,
    fuseTicks: 18,
  },
  {
    id: 'haunch_gnaw',
    name: 'Haunch Gnaw',
    desc: 'Wounded deep, an ogre remembers supper: a mutton haunch off the belt, gnawed to the bone mid-fight.',
    color: '#a4763e',
    code: 'Hg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'self_buff',
    damage: 0,
    // A third of the great body back, unless the meal is broken —
    // the long loud chew is the interrupt lesson, giant-sized.
    self: { healFrac: 0.3, durationTicks: 1 },
  },

  // -------------------------------- beastcraft arts (THE WILD ANSWERS
  // THE CALL, docs/beastcraft-arts-plan.md): the keeper's school joins
  // the technique pool. The tame is a survival channel, not a strike —
  // damage 0, whiff-0 untouched, the ceremony rail does the rest.
  {
    id: 'gentle_the_wild',
    name: 'Gentle the Wild',
    desc: 'Call a wild beast and stand your ground. Survive its answer, and it walks home at your heel.',
    color: '#9fd39a', // the collar's bond-green ink
    code: 'Gw',
    cooldownTicks: 200, // 10 s — a broken asking is not spammed away
    shape: 'tame',
    damage: 0, // pure working: the beast is won, never worn
    range: 5,
    channelTicks: 200, // 10 s whole; a craven mark answers in half
  },

  // THE KEEPER'S TONGUE — the nine words beside the asking. Every one
  // is a working, never a strike (damage 0 forever, the school trains
  // through tames and care alone); the wild-facing words act only on
  // wild beasts, the companion words need the companion, and every
  // refusal speaks before a cooldown is paid.
  {
    id: 'soothe_the_wild',
    name: 'Soothe the Wild',
    desc: 'Still one wild heart. The fight leaves it, and its eyes stay down a while.',
    color: '#b8dcc0', // pale sage, the breath let out
    code: 'So',
    cooldownTicks: 300,
    shape: 'becalm',
    damage: 0,
    range: 5,
    becalmTicks: 200, // 10 s of lowered eyes
  },
  {
    id: 'come_to_heel',
    name: 'Come to Heel',
    desc: 'A whistle the friend always hears. However far the road, it arrives at your side.',
    color: '#8fc7a4', // heel-green, the road folded shut
    code: 'Ch',
    cooldownTicks: 200,
    shape: 'pet_command',
    command: 'heel',
    damage: 0,
  },
  {
    id: 'point_the_fang',
    name: 'Point the Fang',
    desc: 'Point once. Your companion breaks for the mark, and the mark forgets you entirely.',
    color: '#d98a5a', // fang amber, blood warmed not spilled
    code: 'Pf',
    cooldownTicks: 200,
    shape: 'pet_command',
    command: 'fang',
    damage: 0,
    range: 7,
  },
  {
    id: 'keepers_balm',
    name: "Keeper's Balm",
    desc: 'A poultice thrown true. The friend is mended without breaking stride.',
    color: '#a8d978', // crushed-herb green
    code: 'Kb',
    cooldownTicks: 400,
    shape: 'pet_command',
    command: 'mend',
    damage: 0,
    range: 8,
    petHealFrac: 0.3,
  },
  {
    id: 'strewn_bait',
    name: 'Strewn Bait',
    desc: 'Scatter a table on the ground. The wild at rest comes to nose it.',
    color: '#c4a35a', // grain and drippings
    code: 'Sb',
    cooldownTicks: 500,
    shape: 'summon',
    damage: 0,
    range: 6,
    summon: { kind: 'bait', durationTicks: 300, radius: 6, power: 0 },
  },
  {
    id: 'the_quiet_walk',
    name: 'The Quiet Walk',
    desc: 'Walk as the wild walks. No beast marks you until the quiet ends, or you break it.',
    color: '#9ab8a0', // dawn mist through pines
    code: 'Qw',
    cooldownTicks: 600,
    shape: 'self_buff',
    damage: 0,
    self: { beastTruce: true, durationTicks: 400 },
  },
  {
    id: 'blood_of_the_pack',
    name: 'Blood of the Pack',
    desc: 'One howl, shared. The friend fights quicker and harder while the blood is up.',
    color: '#c46a4a', // pack russet
    code: 'Bp',
    cooldownTicks: 600,
    shape: 'pet_command',
    command: 'surge',
    damage: 0,
    petSurge: { dmgMult: 1.3, speedMult: 1.15, durationTicks: 240 },
  },
  {
    id: 'the_keepers_cry',
    name: "The Keeper's Cry",
    desc: 'The cry a fallen friend hears anywhere near. It stands where it lies, shaky but yours.',
    color: '#e8d8a0', // pale horn gold
    code: 'Kc',
    cooldownTicks: 1200, // a minute — the clutch word is not a habit
    shape: 'pet_command',
    command: 'rise',
    damage: 0,
    range: 10,
    petHealFrac: 0.35, // the fraction the friend STANDS at
  },
  {
    id: 'voice_of_the_wild',
    name: 'Voice of the Wild',
    desc: 'Speak the whole tongue at once. The wild stills, and your friend answers first.',
    color: '#7ac4a0', // deep wildsong green
    code: 'Vw',
    cooldownTicks: 1200,
    castFreezeTicks: 8, // the head goes back; the world waits a beat
    shape: 'wild_howl',
    damage: 0,
    radius: 7,
    becalmTicks: 160,
    petHealFrac: 0.25,
    petSurge: { dmgMult: 1.3, speedMult: 1.15, durationTicks: 200 },
  },

  // ---------------------------- THE FANG FINDS ITS VOICE (docs/
  // pet-arts-plan.md): the companion's own actives. These are the
  // PET'S words, never the keeper's — no TECHNIQUES rung ever seats
  // one. Pacing (cooldown, windup, range bands) lives on the
  // PetArtDef in petArts.ts, the kit law verbatim; every def here
  // ships cooldownTicks 0. Self-shaped arts speak the pet fields the
  // keeper's balm minted (petGuard/petHealFrac/petCleanse/petSurge),
  // aimed at the caster itself. Damage dies price against the
  // species' own basic; anything above it wears a windup >= 10 on
  // its PetArtDef — the telegraph premium, pet edition.

  // THE SKITTERKIN's words.
  {
    id: 'nip_and_dart',
    name: 'Nip and Dart',
    desc: 'In, one quick bite, and out before the answer comes.',
    color: '#b8a888',
    code: 'Nd',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 1,
    dashTiles: 4.4,
  },
  {
    id: 'plague_gnaw',
    name: 'Plague Gnaw',
    desc: 'The rat sets its teeth and worries the wound until it goes green.',
    color: '#a0c050',
    code: 'Pg',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 2,
    range: 1.6,
    arc: 0.7,
    status: { status: 'venom', power: 2, durationTicks: 80 },
  },
  {
    id: 'the_rats_hour',
    name: "The Rat's Hour",
    desc: 'Every gutter has one hour when the rat is king. This is it.',
    color: '#8fa050',
    code: 'Rh',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'flurry',
    damage: 2,
    range: 1.7,
    arc: 0.8,
    hits: 4,
    pulseEveryTicks: 5,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'echo_shriek',
    name: 'Echo Shriek',
    desc: 'A cry pitched where ears give up. The air itself flinches twice.',
    color: '#9a8ec4',
    code: 'Es',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'pulse_nova',
    damage: 2,
    radius: 1.8,
    pulses: 2,
    pulseEveryTicks: 12,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'the_dark_descent',
    name: 'The Dark Descent',
    desc: 'The bat folds its wings and becomes a falling knife.',
    color: '#6a5a8c',
    code: 'Dd',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 4,
    dashTiles: 6.4,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
  },

  // THE SHELLBACKS' words.
  {
    id: 'set_the_shell',
    name: 'Set the Shell',
    desc: 'It plants, tucks, and becomes ground. Ground does not bleed.',
    color: '#8a92a0',
    code: 'Ss',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petGuard: { armor: 8, durationTicks: 300 },
  },
  {
    id: 'clatter_challenge',
    name: 'Clatter Challenge',
    desc: 'Shell on shell, loud as a dropped kettle. Everything looks.',
    color: '#c9b45e',
    code: 'Cc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the noise barely lands — the TURNING is the payload
    radius: 3.0,
    tauntRadius: 3.0,
  },
  {
    id: 'horn_toss',
    name: 'Horn Toss',
    desc: 'The beetle gets its horn under the problem and files it skyward.',
    color: '#7a8a6a',
    code: 'Ht',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 0.9,
    knockback: 2.0,
  },
  {
    id: 'tide_grip',
    name: 'Tide Grip',
    desc: 'The claw closes like low tide: slow, cold, and certain.',
    color: '#5a9aa8',
    code: 'Tg',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 2,
    range: 1.7,
    arc: 0.7,
    status: { status: 'chill', power: 2, durationTicks: 60 },
  },
  {
    id: 'the_undertow',
    name: 'The Undertow',
    desc: 'Three cold pulls in a row. Legs remember the sea and obey it.',
    color: '#3d7a8c',
    code: 'Ut',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'pulse_nova',
    damage: 2,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'the_standing_stone',
    name: 'The Standing Stone',
    desc: 'The turtle stops being an animal and starts being geography.',
    color: '#8a9282',
    code: 'St',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the stillness is the payload: eyes turn, shell holds
    radius: 3.6,
    tauntRadius: 3.6,
    petGuard: { armor: 12, durationTicks: 200 },
  },
  {
    id: 'riptide_claw',
    name: 'Riptide Claw',
    desc: 'The great claw falls like a harbor gate. What it hits stays hit.',
    color: '#4a8a9c',
    code: 'Rc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 8,
    range: 2.0,
    arc: 0.8,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'the_kings_pincer',
    name: "The King's Pincer",
    desc: 'On a mark already cold, the claw closes the argument entirely.',
    color: '#c46a52',
    code: 'Kp',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 7,
    range: 2.0,
    arc: 0.7,
    vs: { status: 'chill', mult: 1.6 },
  },

  // THE TUSKERS' words.
  {
    id: 'gore_charge',
    name: 'Gore Charge',
    desc: 'Head down, tusks first, apologies never.',
    color: '#a4744b',
    code: 'Gc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 4,
    dashTiles: 7.2,
    travel: 'charge',
    knockback: 2.0,
  },
  {
    id: 'tusk_sweep',
    name: 'Tusk Sweep',
    desc: 'A short, mean crescent at shin height.',
    color: '#b08a5e',
    code: 'Tw',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 2,
    range: 1.9,
    arc: 1.1,
  },
  {
    id: 'mud_wallow',
    name: 'Mud Wallow',
    desc: 'It drops, rolls, and stands up newer. Mud fixes what mud knows.',
    color: '#8a6f4a',
    code: 'Mw',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petCleanse: true,
    petHealFrac: 0.2,
  },
  {
    id: 'the_long_furrow',
    name: 'The Long Furrow',
    desc: 'The old razorback leaps, lands, and plows the field with everyone in it.',
    color: '#8c5a3a',
    code: 'Lf',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'leap_slam',
    damage: 7,
    dashTiles: 8.0,
    radius: 2.2,
    knockback: 2.2,
  },

  // THE CANIDS' words.
  {
    id: 'worry_the_wound',
    name: 'Worry the Wound',
    desc: 'The pack rule: never open a second door while the first still bleeds.',
    color: '#c46a4a',
    code: 'Ww',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 4,
    range: 1.8,
    arc: 0.7,
    vs: { status: 'bleed', mult: 1.6 },
  },
  {
    id: 'hamstring',
    name: 'Hamstring',
    desc: 'One bite, placed where running lives.',
    color: '#7a9ab8',
    code: 'Hs',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 4,
    range: 1.8,
    arc: 0.7,
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'the_first_howl',
    name: 'The First Howl',
    desc: 'The young howl the dire wolves taught. Its own blood answers.',
    color: '#d98a5a',
    code: 'Fh',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petSurge: { dmgMult: 1.35, speedMult: 1.2, durationTicks: 200 },
  },
  {
    id: 'winters_jaw',
    name: "Winter's Jaw",
    desc: 'The worg bites the way the north bites: wide, and it keeps.',
    color: '#8ac4e8',
    code: 'Wj',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 5,
    range: 1.9,
    arc: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 70 },
  },
  {
    id: 'the_cowing_snarl',
    name: 'The Cowing Snarl',
    desc: 'The war-hound remembers giving orders. Lesser wild hearts remember taking them.',
    color: '#9ab0c4',
    code: 'Cs',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the order is the payload — wild hearts nearby go still
    radius: 3.2,
    becalmTicks: 120,
  },

  // THE CATS' words.
  {
    id: 'raking_flurry',
    name: 'Raking Flurry',
    desc: 'Four paws, all of them opinions, all of them sharp.',
    color: '#c9a45e',
    code: 'Rk',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'flurry',
    damage: 3,
    range: 1.7,
    arc: 0.8,
    hits: 3,
    pulseEveryTicks: 5,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'the_winter_stalk',
    name: 'The Winter Stalk',
    desc: 'Three bounds, each landing colder than the last.',
    color: '#a8c8d8',
    code: 'Wk',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 6,
    dashTiles: 6.8,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  // THE BEAR's words.
  {
    id: 'maul',
    name: 'Maul',
    desc: 'The whole arm, the whole argument.',
    color: '#8c6a4a',
    code: 'Ml',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 8,
    range: 2.1,
    arc: 1.0,
    status: { status: 'bleed', power: 2, durationTicks: 80 },
  },
  {
    id: 'the_charge',
    name: 'The Charge',
    desc: 'A wall, arriving.',
    color: '#a4845e',
    code: 'Tc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 7.2,
    travel: 'charge',
    knockback: 2.2,
  },
  {
    id: 'stand_tall',
    name: 'Stand Tall',
    desc: 'The bear stands to its whole height and the fight reconsiders its plans.',
    color: '#c9a45e',
    code: 'Sl',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the standing is the payload: every eye comes up
    radius: 3.4,
    tauntRadius: 3.4,
    petGuard: { armor: 8, durationTicks: 240 },
  },

  // THE GREAT OWL's words.
  {
    id: 'talon_stoop',
    name: 'Talon Stoop',
    desc: 'From the high line, silence with claws on the end of it.',
    color: '#d8d4c8',
    code: 'To',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 6,
    dashTiles: 8.0,
  },
  {
    id: 'hushing_wing',
    name: 'Hushing Wing',
    desc: 'Two slow beats, and the air forgets how to be warm.',
    color: '#8ac4e8',
    code: 'Hw',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'pulse_nova',
    damage: 3,
    radius: 2.2,
    pulses: 2,
    pulseEveryTicks: 12,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'preen',
    name: 'Preen',
    desc: 'Feather by feather, the owl puts itself back in order.',
    color: '#e8e0d0',
    code: 'Pr',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petCleanse: true,
    petHealFrac: 0.12,
  },
  {
    id: 'the_white_hush',
    name: 'The White Hush',
    desc: 'The owl spreads both wings once, and winter files in under them.',
    color: '#c8dce8',
    code: 'Wh',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'ground_field',
    damage: 0, // the cold is the payload — the field slows all it holds
    range: 0,
    radius: 2.6,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },

  // THE ADDER's words.
  {
    id: 'venom_spit',
    name: 'Venom Spit',
    desc: 'The adder spends its bite at a distance and lets the venom walk the rest.',
    color: '#a0c050',
    code: 'Vs',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'projectile_fan',
    damage: 2,
    projectiles: 1,
    spreadArc: 0,
    projectileSpeed: 9,
    range: 7,
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 80 },
  },
  {
    id: 'coiled_strike',
    name: 'Coiled Strike',
    desc: 'The whole spring, spent in one straight line.',
    color: '#8fa050',
    code: 'Ck',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 4,
    dashTiles: 5.2,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'shed_skin',
    name: 'Shed Skin',
    desc: 'It leaves the hurt behind with the old skin and comes out patient.',
    color: '#c8c8a0',
    code: 'Sk',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petCleanse: true,
    petHealFrac: 0.1,
  },
  {
    id: 'the_long_fang',
    name: 'The Long Fang',
    desc: 'On a mark already green, the second dose is the deep one.',
    color: '#6a9a42',
    code: 'Lg',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 5,
    range: 1.7,
    arc: 0.6,
    vs: { status: 'venom', mult: 2.0 },
  },

  // THE WEAVER's words (web_snare is the wild art itself, reused whole).
  {
    id: 'pale_silk',
    name: 'Pale Silk',
    desc: 'The weaver wraps itself in its own work. Blades ask the silk first.',
    color: '#e8e8e0',
    code: 'Ps',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petGuard: { armor: 6, durationTicks: 240 },
  },
  {
    id: 'the_venom_lattice',
    name: 'The Venom Lattice',
    desc: 'A woven floor of green threads. Every strand knows where you are.',
    color: '#7ac46a',
    code: 'Vl',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'ground_field',
    damage: 2,
    range: 0,
    radius: 2.4,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },

  // ------------------- THE SECOND BREATH — the archery breath arts
  // THE LONG ROAD's content wave: every ten-art school grows the same
  // ten breath voices onehand and arx already carry, five casted and
  // five channeled, interleaved up the stretched ladder. The wave laws
  // hold: casted arts carry no castFreezeTicks (the wind-up IS the
  // commit); channels never ride a ground_field.
  {
    id: 'kingshot',
    name: 'Kingshot',
    desc: 'Draw until the bow remembers the forest. One shaft, and the whole lane kneels.',
    color: '#7a9a4a',
    code: 'Kg',
    cooldownTicks: 200, // 10 s
    castTicks: 22, // 1.1 s wound, 0.88 s planted
    shape: 'projectile_fan',
    damage: 16,
    range: 18,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true,
  },
  {
    id: 'stringsong',
    name: 'Stringsong',
    desc: 'Hold the note and the bow sings it. Arrows leave on every beat.',
    color: '#9ab86a',
    code: 'Sn',
    cooldownTicks: 160, // 8 s
    channelTicks: 48, // three beats of the string
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 4,
    range: 14,
    projectiles: 1,
    projectileSpeed: 18,
    element: 'storm',
  },
  {
    id: 'hawks_hour',
    name: "Hawk's Hour",
    desc: 'Mark the field the way the hawk does. What stands in it has already lost.',
    color: '#c8a44a',
    code: 'Hh',
    cooldownTicks: 190, // 9.5 s
    castTicks: 22,
    shape: 'ground_aoe',
    damage: 15,
    range: 13,
    radius: 2.0,
    fuseTicks: 14,
  },
  {
    id: 'winterflight',
    name: 'Winterflight',
    desc: 'Loose down one cold line and keep loosing. The wind does the rest.',
    color: '#8ac4e0',
    code: 'Wf',
    cooldownTicks: 170, // 8.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 9,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'emberhead',
    name: 'Emberhead',
    desc: 'Two shafts tipped at the campfire. They finish burning where they land.',
    color: '#e08a4a',
    code: 'Ed',
    cooldownTicks: 210, // 10.5 s
    castTicks: 22,
    shape: 'projectile_fan',
    damage: 9,
    range: 15,
    projectiles: 2,
    spreadArc: 0.14,
    projectileSpeed: 17,
    splashRadius: 1.4,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'skyloom',
    name: 'Skyloom',
    desc: 'Set the shuttle flying and hold it. The thread stitches foe to foe.',
    color: '#6b9a7a',
    code: 'Sy',
    cooldownTicks: 200, // 10 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 12,
    radius: 3.5,
    chainTargets: 2,
  },
  {
    id: 'gloamshaft',
    name: 'Gloamshaft',
    desc: 'Draw in the last light and loose after it. The dark travels in a straight line.',
    color: '#5a5a78',
    code: 'Gf',
    cooldownTicks: 210, // 10.5 s
    castTicks: 24,
    shape: 'beam',
    damage: 19,
    range: 12,
    width: 0.55,
  },
  {
    id: 'harrier',
    name: 'Harrier',
    desc: 'The wing that circles back. Every pass takes its due twice.',
    color: '#a8946a',
    code: 'Hr',
    cooldownTicks: 220, // 11 s
    channelTicks: 64, // four passes of the wing
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 3,
    range: 10,
    projectiles: 1,
    projectileSpeed: 15,
    returns: true,
  },
  {
    id: 'zenith',
    name: 'Zenith',
    desc: 'Loose at the highest point of the sky. It comes down as noon.',
    color: '#e8c874',
    code: 'Zn',
    cooldownTicks: 230, // 11.5 s
    castTicks: 26,
    shape: 'ground_aoe',
    damage: 16,
    range: 15,
    radius: 2.2,
    fuseTicks: 12,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'crowsong',
    name: 'Crowsong',
    desc: 'Call the dark flock down on a field and keep calling. They are never full.',
    color: '#4a4458',
    code: 'Cw',
    cooldownTicks: 240, // 12 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 13,
    radius: 2.2,
    fuseTicks: 10,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  // --------------------- THE SECOND BREATH — the sneak breath arts
  {
    id: 'opened_vein',
    name: 'Opened Vein',
    desc: 'The breath before the artery. Let it out slow and it never stops.',
    color: '#9a3040',
    code: 'Vn',
    cooldownTicks: 220, // 11 s
    castTicks: 18,
    shape: 'melee_arc',
    damage: 9,
    range: 2.0,
    arc: 0.9,
    status: { status: 'bleed', power: 2, durationTicks: 100 },
  },
  {
    id: 'threadwork',
    name: 'Threadwork',
    desc: 'Hold still and sew. The needle passes through the same place three times.',
    color: '#7a6a8a',
    code: 'Tk',
    cooldownTicks: 190, // 9.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 0.8,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },
  {
    id: 'nightshade_kiss',
    name: 'Nightshade Kiss',
    desc: 'A dart steeped a week in the garden nobody plants twice. One kiss is plenty.',
    color: '#8aa050',
    code: 'Nk',
    cooldownTicks: 230, // 11.5 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 8,
    range: 9,
    projectiles: 1,
    projectileSpeed: 16,
    status: { status: 'venom', power: 1, durationTicks: 80 },
  },
  {
    id: 'quiet_knife',
    name: 'The Quiet Knife',
    desc: 'A line of hush laid down the corridor. Everything on it opens.',
    color: '#6a6480',
    code: 'Qk',
    cooldownTicks: 180, // 9 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 7,
    width: 0.5,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },
  {
    id: 'redwork',
    name: 'Redwork',
    desc: 'The slow inhale, then the room blooms red around you. Craftwork, of a kind.',
    color: '#a84048',
    code: 'Rd',
    cooldownTicks: 220, // 11 s
    castTicks: 22,
    shape: 'nova',
    damage: 10,
    radius: 2.3,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'gallows_thread',
    name: 'Gallows Thread',
    desc: 'The noose passes down the line, one neck at a time. Hold the knot.',
    color: '#5a5468',
    code: 'Gh',
    cooldownTicks: 220, // 11 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 9,
    radius: 3.0,
    chainTargets: 2,
    status: { status: 'venom', power: 1, durationTicks: 40 },
  },
  {
    id: 'widows_draw',
    name: "Widow's Draw",
    desc: 'A fan of steeped needles, dealt like cards. Everyone at the table loses.',
    color: '#b0b47a',
    code: 'Wd',
    cooldownTicks: 230, // 11.5 s
    castTicks: 22,
    shape: 'projectile_fan',
    damage: 7,
    range: 10,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 15,
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'bloodletting',
    name: 'Bloodletting',
    desc: 'The old surgery, held to its rhythm. What they lose is yours to keep.',
    color: '#8a2a34',
    code: 'Bt',
    cooldownTicks: 220, // 11 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.1,
    arc: 1.0,
    drainFrac: 0.15,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },
  {
    id: 'lights_out',
    name: 'Lights Out',
    desc: 'Pinch the wick of a whole room. The dark arrives before the knife does.',
    color: '#3a3450',
    code: 'Lx',
    cooldownTicks: 220, // 11 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 14,
    range: 10,
    radius: 2.0,
    fuseTicks: 10,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'red_hour',
    name: 'The Red Hour',
    desc: 'The hour where every second cuts. Stand in the middle of it and count.',
    color: '#c4384a',
    code: 'Rh',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.0,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

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

  // ------------------- THE SECOND BREATH — the twohand breath arts
  {
    id: 'fell_timber',
    name: 'Fell Timber',
    desc: 'The tree comes down where you say it does. Stand clear or be counted.',
    color: '#8a7a4e',
    code: 'Fe',
    cooldownTicks: 190, // 9.5 s
    castTicks: 20,
    shape: 'melee_arc',
    damage: 12,
    range: 2.7,
    arc: 1.3,
    knockback: 1.5,
  },
  {
    id: 'quarry_work',
    name: 'Quarry Work',
    desc: 'Swing after swing into the same seam. Every stone splits eventually.',
    color: '#9a8a78',
    code: 'Qy',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 5,
    range: 2.5,
    arc: 1.7,
    status: { status: 'sunder', power: 10, durationTicks: 60 },
  },
  {
    id: 'forgefall',
    name: 'Forgefall',
    desc: 'The hammer leaves the forge still glowing. It lands like a verdict.',
    color: '#d97a3d',
    code: 'Fo',
    cooldownTicks: 250, // 12.5 s
    castTicks: 22,
    shape: 'leap_slam',
    damage: 13,
    dashTiles: 9.0,
    radius: 2.2,
    knockback: 1.5,
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },
  {
    id: 'wheelbreaker',
    name: 'The Wheelbreaker',
    desc: 'Drive the haft down the lane like a ram. Wheels were a mistake.',
    color: '#b09a6a',
    code: 'Wk',
    cooldownTicks: 200, // 10 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 5,
    range: 7,
    width: 0.8,
    knockback: 0.6,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },
  {
    id: 'gravedigger',
    name: 'Gravedigger',
    desc: 'Open the ground and it wants filling. Everything nearby obliges.',
    color: '#6a5e6e',
    code: 'Gv',
    cooldownTicks: 240, // 12 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 15,
    range: 4.5,
    radius: 2.1,
    fuseTicks: 10,
    knockback: -1.0, // the grave PULLS
  },
  {
    id: 'ore_song',
    name: 'Ore Song',
    desc: 'The maul sings against the seam and the seam sings back. Keep time.',
    color: '#b8a488',
    code: 'Oe',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 5,
    radius: 2.4,
    knockback: 0.7,
  },
  {
    id: 'skyweight',
    name: 'Skyweight',
    desc: 'Lift the whole sky as high as it goes. Then let it remember the ground.',
    color: '#c9a24a',
    code: 'Sw',
    cooldownTicks: 250, // 12.5 s
    castTicks: 24,
    shape: 'pulse_nova',
    damage: 9,
    radius: 2.4,
    pulses: 2,
    pulseEveryTicks: 11,
    knockback: 1.4,
  },
  {
    id: 'long_lever',
    name: 'The Long Lever',
    desc: 'Given a place to stand, you move them. The lever is the whole lane.',
    color: '#a08a68',
    code: 'Lv',
    cooldownTicks: 230, // 11.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 8,
    width: 0.7,
    knockback: 0.5,
  },
  {
    id: 'sunhammer',
    name: 'Sunhammer',
    desc: 'Swing the noon itself. Everything it touches keeps a little of the heat.',
    color: '#e0a04c',
    code: 'Sm',
    cooldownTicks: 240, // 12 s
    castTicks: 26,
    shape: 'melee_arc',
    damage: 15,
    range: 2.8,
    arc: 1.6,
    knockback: 1.3,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'worlds_rim',
    name: "World's Rim",
    desc: 'Grind the far edge of the world against a chosen field. It turns slowly.',
    color: '#8a9aa8',
    code: 'Wm',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 5,
    radius: 2.3,
    fuseTicks: 8,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

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

  // ------------------- THE SECOND BREATH — the combat breath arts
  {
    id: 'measured_blow',
    name: 'Measured Blow',
    desc: 'The breath before the fist. Measured twice, landed once.',
    color: '#b09a7a',
    code: 'Me',
    cooldownTicks: 170, // 8.5 s
    castTicks: 18,
    shape: 'melee_arc',
    damage: 11,
    range: 2.3,
    arc: 1.0,
  },
  {
    id: 'drumbeat',
    name: 'Drumbeat',
    desc: 'The old cadence, kept with your heels. The whole line moves to it.',
    color: '#c4885a',
    code: 'Dm',
    cooldownTicks: 240, // 12 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 5,
    radius: 2.0,
    knockback: 0.6,
  },
  {
    id: 'thrown_iron',
    name: 'Thrown Iron',
    desc: 'Whatever iron is near, thrown hard enough to matter. Everything is a weapon.',
    color: '#8a8f98',
    code: 'Th',
    cooldownTicks: 180, // 9 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 12,
    range: 9,
    projectiles: 1,
    projectileSpeed: 14,
    splashRadius: 1.3,
  },
  {
    id: 'ironbreath',
    name: 'Ironbreath',
    desc: 'The veteran exhales winter down the lane. Cold as pay day, twice as slow.',
    color: '#9ab4bc',
    code: 'Ih',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 5,
    range: 6,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'fifth_road',
    name: 'The Fifth Road',
    desc: 'Four roads are taught. The fifth goes through whoever is standing on it.',
    color: '#7a6a80',
    code: '5r',
    cooldownTicks: 220, // 11 s
    castTicks: 22,
    shape: 'dash_strike',
    damage: 12,
    dashTiles: 9.0,
    travel: 'charge',
    status: { status: 'bleed', power: 1, durationTicks: 50 },
  },
  {
    id: 'old_thunder',
    name: 'Old Thunder',
    desc: 'The joints remember every storm they marched through. Let them speak.',
    color: '#b8a45a',
    code: 'Od',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.3,
    arc: 1.2,
    status: { status: 'shock', power: 1, durationTicks: 25 },
  },
  {
    id: 'gathered_breath',
    name: 'The Gathered Breath',
    desc: 'All of it, held as long as it keeps. Then all of it, at once.',
    color: '#d9c084',
    code: 'Gg',
    cooldownTicks: 210, // 10.5 s
    castTicks: 24,
    shape: 'nova',
    damage: 12,
    radius: 2.5,
    knockback: 1.0,
  },
  {
    id: 'long_watch',
    name: 'The Long Watch',
    desc: 'You know where they will stand before they do. The watch never lifted.',
    color: '#7a8a94',
    code: 'Lh',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 6,
    radius: 2.1,
    fuseTicks: 8,
  },
  {
    id: 'scarworn',
    name: 'Scarworn',
    desc: 'Every scar is a paid receipt. This is where you collect.',
    color: '#a05a48',
    code: 'Sx',
    cooldownTicks: 200, // 10 s
    castTicks: 24,
    shape: 'melee_arc',
    damage: 13,
    range: 2.4,
    arc: 1.2,
    drainFrac: 0.2,
  },
  {
    id: 'last_lesson',
    name: 'Last Lesson',
    desc: 'The lesson passes from one student to the next. Nobody graduates.',
    color: '#c9b46a',
    code: 'Ln',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 7,
    radius: 3.0,
    chainTargets: 2,
  },

  // ----------------- THE REACHING SCHOOL — the polearm arts (THE TWENTY)
  // The school of REACH and the THRUST: the point ends arguments from
  // outside the answer. Depth over breadth — corridors, pierces, and
  // lines; sweeps exist only as the hafted blade's answers. The charge
  // and the braced wall of points are the two poles: momentum and
  // station. Five casted (the drawn line) and five channeled (the
  // station held), per THE DRAWN BREATH's law.
  {
    id: 'lunging_skewer',
    name: 'Lunging Skewer',
    desc: 'The point arrives from a county away. The argument ends where it lands.',
    color: '#c4d2e2',
    code: 'Ls',
    cooldownTicks: 130, // 6.5 s
    shape: 'melee_arc',
    damage: 8,
    range: 3.4,
    arc: 0.5,
  },
  {
    id: 'haft_strike',
    name: 'Haft Strike',
    desc: 'The butt end of the haft, short and rude. Room is a weapon too.',
    color: '#a08a68',
    code: 'Hs',
    cooldownTicks: 120, // 6 s
    shape: 'melee_arc',
    damage: 4,
    range: 1.6,
    arc: 1.0,
    knockback: 2.5,
    status: { status: 'chill', power: 1, durationTicks: 35 },
  },
  {
    id: 'hooking_reap',
    name: 'Hooking Reap',
    desc: 'The hook goes behind the knee and the ground changes its mind. Come here.',
    color: '#7d8696',
    code: 'Hr',
    cooldownTicks: 170, // 8.5 s
    shape: 'ground_aoe',
    damage: 6,
    range: 3.4,
    radius: 1.1,
    fuseTicks: 6,
    knockback: -2.0, // the hook PULLS
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'vaulting_step',
    name: 'Vaulting Step',
    desc: 'Plant the haft and let it throw you. Arrive point first.',
    color: '#b09a6a',
    code: 'Vs',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 7.0,
  },
  {
    id: 'perfect_thrust',
    name: 'Perfect Thrust',
    desc: 'One drawn breath, one straight line. There is nothing else in the world.',
    color: '#dce6f0',
    code: 'Pt',
    cooldownTicks: 170, // 8.5 s
    castTicks: 20, // 1 s drawn, 0.8 s planted
    shape: 'melee_arc',
    damage: 14,
    range: 3.6,
    arc: 0.35,
  },
  {
    id: 'flurry_of_points',
    name: 'Flurry of Points',
    desc: 'The point multiplies. Down one narrow lane it is raining steel.',
    color: '#c6d0dc',
    code: 'Fp',
    cooldownTicks: 180, // 9 s
    channelTicks: 48, // 2.4 s held, three beats of rain
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 3.4,
    arc: 0.35,
  },
  {
    id: 'crescent_reap',
    name: 'Crescent Reap',
    desc: 'The hafted blade remembers it is a blade. One moonwide stroke says so.',
    color: '#8a94a4',
    code: 'Cr',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 9,
    range: 2.6,
    arc: 2.2,
    knockback: 1.4,
  },
  {
    id: 'impaling_drive',
    name: 'Impaling Drive',
    desc: 'Drive the line through the crowd. Everybody on it learns the same lesson.',
    color: '#b8c4d4',
    code: 'Id',
    cooldownTicks: 180, // 9 s
    castTicks: 22, // 1.1 s drawn, 0.88 s planted
    shape: 'beam',
    damage: 13,
    range: 5,
    width: 0.6,
  },
  {
    id: 'wall_of_points',
    name: 'Wall of Points',
    desc: 'Set the pike and be a wall. Walls do not apologize.',
    color: '#ccd6e2',
    code: 'Wp',
    cooldownTicks: 200, // 10 s
    channelTicks: 64, // 3.2 s braced, four beats of the station
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 3.0,
    arc: 0.9,
    status: { status: 'chill', power: 1, durationTicks: 30 },
  },
  {
    id: 'knights_charge',
    name: "Knight's Charge",
    desc: 'Lower the point and spend the whole road at once. Knights are a weather.',
    color: '#e0b054',
    code: 'Kc',
    cooldownTicks: 190, // 9.5 s
    shape: 'dash_strike',
    damage: 13,
    dashTiles: 10.0,
    travel: 'charge',
    knockback: 2.6,
  },
  {
    id: 'rampart_breaker',
    name: 'Rampart Breaker',
    desc: 'A drawn breath aimed at the seam in the armor. Walls open like doors.',
    color: '#a89a88',
    code: 'Rb',
    cooldownTicks: 190, // 9.5 s
    castTicks: 20, // 1 s drawn, 0.8 s planted
    shape: 'melee_arc',
    damage: 14,
    range: 3.2,
    arc: 0.6,
    status: { status: 'sunder', power: 12, durationTicks: 60 },
  },
  {
    id: 'serpents_tongue',
    name: "Serpent's Tongue",
    desc: 'The tongue flickers at full reach. It tastes before it takes.',
    color: '#d4e0ec',
    code: 'St',
    cooldownTicks: 200, // 10 s
    channelTicks: 48, // 2.4 s held, three flickers
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 6,
    range: 3.6,
    arc: 0.3,
  },
  {
    id: 'skydriver_fall',
    name: 'Skydriver Fall',
    desc: 'Up on the haft, then down point first. The sky signs the work.',
    color: '#9a9484',
    code: 'Sf',
    cooldownTicks: 200, // 10 s
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 8.0,
    radius: 1.6,
  },
  {
    id: 'banner_advance',
    name: 'Banner Advance',
    desc: 'Raise the point like a banner and the line moves forward with you.',
    color: '#e8c468',
    code: 'Ba',
    cooldownTicks: 320, // 16 s
    castTicks: 18, // 0.9 s raised, 0.72 s planted
    shape: 'self_buff',
    damage: 0,
    self: { speedMult: 1.15, armor: 4, durationTicks: 120 },
  },
  {
    id: 'moulinet_guard',
    name: 'Moulinet Guard',
    desc: 'Spin the haft in a wheel around you. Close is the one place they cannot stand.',
    color: '#b8a070',
    code: 'Mg',
    cooldownTicks: 190, // 9.5 s
    channelTicks: 48, // 2.4 s turned, three turns of the wheel
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 1.8,
  },
  {
    id: 'stormpoint',
    name: 'Stormpoint',
    desc: 'Hold the point to the sky until the storm takes an interest. Then point.',
    color: '#8cb4e8',
    code: 'Sp',
    cooldownTicks: 220, // 11 s
    castTicks: 24, // 1.2 s called, 0.96 s planted
    shape: 'melee_arc',
    damage: 18,
    range: 3.6,
    arc: 0.4,
    status: { status: 'shock', power: 1, durationTicks: 40 },
  },
  {
    id: 'gatebreaker',
    name: 'Gatebreaker',
    desc: 'The heavy thrust kept for whatever is already leaning. Gates fall inward.',
    color: '#6e7a8c',
    code: 'Gb',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 12,
    range: 2.8,
    arc: 0.5,
    executeBelow: { frac: 0.3, mult: 1.8 },
  },
  {
    id: 'sweeping_gyre',
    name: 'Sweeping Gyre',
    desc: 'The halberd turns the full circle once. The yard is measured and cleared.',
    color: '#a89468',
    code: 'Sg',
    cooldownTicks: 190, // 9.5 s
    shape: 'nova',
    damage: 9,
    radius: 2.2,
    knockback: 1.6,
  },
  {
    // The shield school holds the 'hold_the_line' id — the polearm
    // stance carries the school suffix (recorded in THE TWENTY spec).
    id: 'hold_the_line_polearm',
    name: 'Hold the Line',
    desc: 'Root, brace, and hold. The line is exactly where you say it is.',
    color: '#c2ccda',
    code: 'Ht',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 64, // 3.2 s anchored, four beats of the stand
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 3.0,
    arc: 0.8,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'sundering_lance',
    name: 'The Sundering Lance',
    desc: "The whole road at full gallop, every body on it pierced. The school's crown.",
    color: '#e8b84c',
    code: 'Sl',
    cooldownTicks: 220, // 11 s
    shape: 'dash_strike',
    damage: 15,
    dashTiles: 12.0,
    travel: 'charge',
    knockback: 2.8,
  },

  // -------------- THE ARMORY: the polearm secret arts (weapon-taught).
  // Four instant seats for the knight's roster, one per weapon family:
  // the spear line's founding thrust, the glaive's wheel, the halberd's
  // hook (a PULL — ground_aoe negative knockback per the vortex law,
  // hooking_reap's grammar), and the lance's charge, priced honestly
  // under knights_charge (the L50 rung is the school's; the weapon's
  // cousin is smaller by design).
  {
    id: 'reaching_thrust',
    name: 'Reaching Thrust',
    desc: 'The school\'s first lesson at its full length. Everything begins out of reach.',
    color: '#c8d4e0',
    code: 'Rr',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 8,
    range: 3.6,
    arc: 0.4,
  },
  {
    id: 'reapers_turn',
    name: "Reaper's Turn",
    desc: 'The glaive remembers the harvest. One wide turn, and the row lies down.',
    color: '#aab6a0',
    code: 'Rn',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 9,
    range: 2.7,
    arc: 2.4,
    knockback: 1.5,
  },
  {
    id: 'skullhook',
    name: 'Skullhook',
    desc: 'The hook goes over the collar and the line runs backward. Yours now.',
    color: '#8a94a6',
    code: 'Sk',
    cooldownTicks: 180, // 9 s
    shape: 'ground_aoe',
    damage: 8,
    range: 3.4,
    radius: 1.0,
    fuseTicks: 6,
    knockback: -2.2, // the hook PULLS (the vortex law)
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'couched_charge',
    name: 'Couched Charge',
    desc: 'Set the lance in the crook and spend the road. The arrival signs for you.',
    color: '#d8c48a',
    code: 'Cq',
    cooldownTicks: 180, // 9 s
    shape: 'dash_strike',
    damage: 10,
    dashTiles: 7.0,
    travel: 'charge',
    knockback: 2.0,
  },
];

export const ABILITIES: ReadonlyMap<string, AbilityDef> = new Map(defs.map((d) => [d.id, d]));

export function abilityDef(id: string): AbilityDef | undefined {
  return ABILITIES.get(id);
}

/**
 * The technique ladder: which abilities each combat style unlocks and
 * when. Swapping among unlocked techniques is always free.
 *
 * THE HONED-ART LAW: each art carries three rank steps past Rank I,
 * reached at +15/+30/+45 base levels over its unlock — compressed for
 * rungs past 54 by THE SHORTENED CLIMB (shared rankStride), so every
 * art masters exactly by 99. Rank II sharpens numbers, Rank III adds
 * a beat of utility, Rank IV is the signature — one visible, nameable
 * flourish. Notes are player-facing bench copy. The ladder balance
 * contract in ladder.test.ts keeps every art's mature cycle value
 * inside its style's band — tune there, not by ear.
 *
 * THE LONG ROAD: rungs span 5..90, striding wider as the XP curve
 * steepens — ten-art schools climb [5,10,15,20,30,40,50,60,75,90],
 * the two twenty-art schools (onehand, arx) walk every 5 to 50 then
 * every 4 to 90, farming tends [5,15,30,50,75]. The road's whole
 * length holds an unlock to walk toward; the capstone crowns at 90.
 */
export const TECHNIQUES: readonly TechniqueDef[] = [
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
    ability: 'tumble_shot',
    style: 'archery',
    unlockLevel: 5,
    ranks: [
      { note: 'The parting arrow means it.', damage: 9 },
      { note: 'A longer roll, ready again sooner.', cooldownTicks: 140, dashTiles: -6.4 },
      { note: 'Two shafts, loosed mid-tumble.', projectiles: 2, spreadArc: 0.1 },
    ],
  },
  {
    ability: 'kingshot',
    style: 'archery',
    unlockLevel: 10,
    ranks: [
      { note: 'The draw grows heavier still.', damage: 18 },
      { note: 'The shaft carries further and faster.', range: 21, projectileSpeed: 24 },
      { note: 'The king takes the whole lane sooner.', damage: 20, cooldownTicks: 180, castTicks: 18 },
    ],
  },
  {
    ability: 'longshot',
    style: 'archery',
    unlockLevel: 15,
    ranks: [
      { note: 'The line lands heavier.', damage: 11 },
      { note: 'The draw comes back to you sooner.', cooldownTicks: 150 },
      { note: 'The line it draws does not bend, or end kindly.', damage: 13 },
    ],
  },
  {
    ability: 'stringsong',
    style: 'archery',
    unlockLevel: 20,
    ranks: [
      { note: 'The note lands harder.', damage: 5 },
      { note: 'The song holds a fourth beat.', channelTicks: 64 },
      { note: 'The arrows learn the tune and follow it home.', cooldownTicks: 150, homing: 5 },
    ],
  },
  {
    ability: 'rain_of_arrows',
    style: 'archery',
    unlockLevel: 25,
    ranks: [
      { note: 'The sky falls harder.', damage: 11 },
      { note: 'A wider patch of ruin, called sooner.', cooldownTicks: 190, radius: 2.4 },
      {
        note: 'Barbed heads — the wounds keep raining.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'hawks_hour',
    style: 'archery',
    unlockLevel: 30,
    ranks: [
      { note: 'The stoop strikes deeper.', damage: 17 },
      { note: 'The hour claims a wider field.', radius: 2.6, range: 15 },
      { note: 'What the hawk marks is opened to everyone.', cooldownTicks: 180, status: { status: 'sunder', power: 12, durationTicks: 60 } },
    ],
  },
  {
    ability: 'snare_shot',
    style: 'archery',
    unlockLevel: 35,
    ranks: [
      {
        note: 'The snare waits longer.',
        summon: { kind: 'snare_trap', durationTicks: 700, radius: 1.2, power: 1 },
      },
      { note: 'Another trap rides in the quiver sooner.', cooldownTicks: 220 },
      {
        note: 'It bites colder and reaches wider.',
        summon: { kind: 'snare_trap', durationTicks: 700, radius: 1.6, power: 2 },
      },
    ],
  },
  {
    ability: 'winterflight',
    style: 'archery',
    unlockLevel: 40,
    ranks: [
      { note: 'The wind cuts keener.', damage: 5 },
      { note: 'The cold clings longer and the line runs wider.', width: 0.8, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The flight holds a fourth breath.', channelTicks: 64, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'ricochet',
    style: 'archery',
    unlockLevel: 45,
    ranks: [
      { note: 'Each carom means it more.', damage: 9 },
      { note: 'A third change of mind.', chainTargets: 3 },
      { note: 'No wall ends the argument.', damage: 10, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'emberhead',
    style: 'archery',
    unlockLevel: 50,
    ranks: [
      { note: 'The heads burn hotter.', damage: 10 },
      { note: 'The fire keeps its grip longer.', range: 16, status: { status: 'burn', power: 1, durationTicks: 80 } },
      { note: 'The pair loose quicker and land harder.', damage: 11, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'twin_strike',
    style: 'archery',
    unlockLevel: 54,
    ranks: [
      { note: 'Heavier shafts.', damage: 11 },
      { note: 'The pair returns to your hand sooner.', cooldownTicks: 170 },
      { note: 'Two arguments, one conclusion — heavier.', damage: 12 },
    ],
  },
  {
    ability: 'skyloom',
    style: 'archery',
    unlockLevel: 58,
    ranks: [
      { note: 'The shuttle strikes harder.', damage: 5 },
      { note: 'The thread reaches further.', range: 14, cooldownTicks: 190 },
      { note: 'The loom takes a third thread.', chainTargets: 3 },
    ],
  },
  {
    ability: 'skyfall_shot',
    style: 'archery',
    unlockLevel: 62,
    ranks: [
      { note: 'It falls heavier.', damage: 14 },
      { note: 'A wider shadow, called sooner.', radius: 2.2, cooldownTicks: 200 },
      {
        note: 'It lands barbed.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'gloamshaft',
    style: 'archery',
    unlockLevel: 66,
    ranks: [
      { note: 'The dark line bites deeper.', damage: 21 },
      { note: 'The gloam runs longer and wider.', range: 15, width: 0.75 },
      { note: 'The last light leaves quicker, and harder.', damage: 24, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'phantom_flight',
    style: 'archery',
    unlockLevel: 70,
    ranks: [
      { note: 'The ghost cuts deeper.', damage: 10 },
      { note: 'It haunts you oftener.', cooldownTicks: 180 },
      {
        note: 'It comes home red, and leaves red behind.',
        damage: 11,
        status: { status: 'bleed', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'harrier',
    style: 'archery',
    unlockLevel: 74,
    ranks: [
      { note: 'The wing strikes harder.', damage: 4 },
      { note: 'The circuit runs longer and faster.', range: 12, projectileSpeed: 17 },
      { note: 'The wing opens what it passes.', cooldownTicks: 210, status: { status: 'bleed', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'storm_of_shafts',
    style: 'archery',
    unlockLevel: 78,
    ranks: [
      { note: 'Every falling shaft bites harder.', damage: 4 },
      { note: 'The patch grows.', radius: 2.6 },
      {
        note: 'The schedule tightens, and the caught walk slow.',
        pulseEveryTicks: 13,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'zenith',
    style: 'archery',
    unlockLevel: 82,
    ranks: [
      { note: 'Noon lands heavier.', damage: 17 },
      { note: 'The light claims a wider court.', radius: 2.6 },
      { note: 'The sun stays to see it finished.', damage: 18, cooldownTicks: 210, status: { status: 'burn', power: 1, durationTicks: 80 } },
    ],
  },
  {
    ability: 'crowsong',
    style: 'archery',
    unlockLevel: 86,
    ranks: [
      { note: 'The flock feeds harder.', damage: 4 },
      { note: 'The song calls a wider field.', radius: 2.6 },
      { note: 'The crows remember, and come back hungrier.', cooldownTicks: 220, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'arrow_tempest',
    style: 'archery',
    unlockLevel: 90,
    ranks: [
      { note: 'Each shaft asks for more.', damage: 6 },
      { note: 'The storm gathers again sooner.', cooldownTicks: 220 },
      { note: 'A sixth shaft joins the storm.', projectiles: 6 },
    ],
  },
  {
    ability: 'arc_bolt',
    style: 'arx',
    unlockLevel: 5,
    ranks: [
      { note: 'A hotter crack.', damage: 8 },
      { note: 'The sky reloads faster.', cooldownTicks: 140 },
      {
        note: 'One more throat to leap to, and the charge lingers.',
        chainTargets: 4,
        status: { status: 'shock', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'wickfire',
    style: 'arx',
    unlockLevel: 10,
    ranks: [
      { note: 'The flame flies heavier.', damage: 12 },
      {
        note: 'What it lights stays lit longer.',
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
      { note: 'The wick takes faster, and the hand learns the toss.', cooldownTicks: 170, castTicks: 16 },
    ],
  },
  {
    ability: 'frost_lance',
    style: 'arx',
    unlockLevel: 15,
    ranks: [
      { note: 'The cold line lands harder.', damage: 10 },
      { note: 'Winter answers sooner.', cooldownTicks: 160 },
      {
        note: 'Winter holds the line.',
        damage: 13,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'rime_river',
    style: 'arx',
    unlockLevel: 20,
    ranks: [
      { note: 'The river runs deeper.', damage: 5 },
      { note: 'The river reaches farther downhill.', range: 12.5 },
      {
        note: 'The cold outstays the pour.',
        cooldownTicks: 180,
        status: { status: 'chill', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'blink',
    style: 'arx',
    unlockLevel: 25,
    ranks: [
      { note: 'A longer stride between places.', dashTiles: 9.2 },
      { note: 'The door opens oftener.', cooldownTicks: 170 },
      { note: 'Distance stops being an argument.', dashTiles: 10.8, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'windshear',
    style: 'arx',
    unlockLevel: 30,
    ranks: [
      { note: 'The gale leans harder.', damage: 13 },
      { note: 'The whole field bows away from you.', radius: 3.0, knockback: 2.6 },
      { note: 'The sky refills sooner.', cooldownTicks: 180, castTicks: 18 },
    ],
  },
  {
    ability: 'ward_shell',
    style: 'arx',
    unlockLevel: 35,
    ranks: [
      { note: 'The shell thickens.', self: { shieldHp: 14, durationTicks: 160 } },
      { note: 'The light gathers again sooner.', cooldownTicks: 280 },
      { note: 'A shell that outlasts the storm.', self: { shieldHp: 18, durationTicks: 200 } },
    ],
  },
  {
    ability: 'stonerise',
    style: 'arx',
    unlockLevel: 40,
    ranks: [
      { note: 'The rows rise sharper.', damage: 5 },
      { note: 'A wider quarry answers.', radius: 2.4 },
      { note: 'The ground stands up angrier, oftener.', cooldownTicks: 200, knockback: 1.6 },
    ],
  },
  {
    ability: 'ember_fan',
    style: 'arx',
    unlockLevel: 45,
    ranks: [
      { note: 'Each finger burns hotter.', damage: 7 },
      { note: 'A fourth finger opens.', projectiles: 4 },
      {
        note: 'Every tongue leaves a lasting hunger.',
        status: { status: 'burn', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'geyser',
    style: 'arx',
    unlockLevel: 50,
    ranks: [
      { note: 'The deep water rises harder.', damage: 14 },
      { note: 'The well mouth widens.', radius: 2.4, knockback: 2.2 },
      { note: 'The deep answers the first knock.', cooldownTicks: 200, castTicks: 20 },
    ],
  },
  {
    ability: 'meteor_shard',
    style: 'arx',
    unlockLevel: 54,
    ranks: [
      { note: 'A heavier shard.', damage: 15 },
      { note: 'The burn spreads wider.', radius: 2.6 },
      {
        note: 'It keeps burning after it lands.',
        status: { status: 'burn', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'anvil_sky',
    style: 'arx',
    unlockLevel: 58,
    ranks: [
      { note: 'The hammer falls heavier.', damage: 4 },
      { note: 'The anvil widens.', radius: 2.8 },
      {
        note: 'The forge keeps longer hours, and the charge clings.',
        cooldownTicks: 220,
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'stormcall',
    style: 'arx',
    unlockLevel: 62,
    ranks: [
      { note: 'Each strike asks for more.', damage: 6 },
      { note: 'The appointment runs long, and wide.', radius: 2.6, fieldTicks: 120 },
      { note: 'The sky keeps the appointment.', cooldownTicks: 220 },
    ],
  },
  {
    ability: 'hollowcall',
    style: 'arx',
    unlockLevel: 66,
    ranks: [
      { note: 'The nothing bites deeper.', damage: 14 },
      { note: 'The invitation reaches farther.', radius: 2.6, knockback: -2.4 },
      { note: 'The hollow opens quicker, and closes on more.', cooldownTicks: 210, castTicks: 22, damage: 15 },
    ],
  },
  {
    ability: 'mirror_image',
    style: 'arx',
    unlockLevel: 70,
    ranks: [
      {
        note: 'The lie stands longer.',
        summon: { kind: 'decoy', durationTicks: 220, radius: 5, power: 0 },
      },
      { note: 'You can step aside oftener.', cooldownTicks: 280 },
      {
        note: 'The double walks farther from the truth.',
        summon: { kind: 'decoy', durationTicks: 260, radius: 7, power: 0 },
      },
    ],
  },
  {
    ability: 'burning_glass',
    style: 'arx',
    unlockLevel: 74,
    ranks: [
      { note: 'The line burns finer and hotter.', damage: 5 },
      {
        note: 'What it crosses keeps smoldering.',
        status: { status: 'burn', power: 1, durationTicks: 60 },
      },
      { note: 'The lens steadies sooner.', cooldownTicks: 200 },
    ],
  },
  {
    ability: 'maelstrom',
    style: 'arx',
    unlockLevel: 78,
    ranks: [
      { note: 'The drain pulls a deeper draught.', damage: 4 },
      { note: 'The eye widens.', radius: 3.0 },
      {
        note: 'The drain pulls the whole sea, and nothing swims out.',
        damage: 5,
        knockback: -2.6,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'moonrise',
    style: 'arx',
    unlockLevel: 82,
    ranks: [
      { note: 'A heavier moon.', damage: 15 },
      {
        note: 'The silver reaches farther, and the slow runs longer.',
        radius: 2.8,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'The moon answers the first call.', cooldownTicks: 220, castTicks: 24 },
    ],
  },
  {
    ability: 'cometfall',
    style: 'arx',
    unlockLevel: 86,
    ranks: [
      { note: 'Heavier stones from farther away.', damage: 5 },
      { note: 'The sky opens wider.', radius: 2.6 },
      { note: 'The visitors arrive closer together.', cooldownTicks: 240, pulseEveryTicks: 14 },
    ],
  },
  {
    ability: 'daybreak',
    style: 'arx',
    unlockLevel: 90,
    ranks: [
      { note: 'Noon weighs more.', damage: 17 },
      { note: 'A wider noon, delivered oftener.', radius: 2.8, cooldownTicks: 260 },
      {
        note: 'Noon arrives where you point, and stays to burn.',
        damage: 20,
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'rend',
    style: 'sneak',
    unlockLevel: 5,
    ranks: [
      { note: 'The first cut earns its keep.', damage: 5 },
      { note: 'A wider tear, oftener.', cooldownTicks: 140, arc: 1.05 },
      { note: 'The faltering are finished.', executeBelow: { frac: 0.25, mult: 1.6 } },
    ],
  },
  {
    ability: 'opened_vein',
    style: 'sneak',
    unlockLevel: 10,
    ranks: [
      { note: 'The cut sits deeper.', damage: 11 },
      { note: 'The vein gives more freely.', status: { status: 'bleed', power: 3, durationTicks: 100 } },
      { note: 'What they lose finds its way to you.', cooldownTicks: 200, drainFrac: 0.15 },
    ],
  },
  {
    ability: 'ghost_step',
    style: 'sneak',
    unlockLevel: 15,
    ranks: [
      { note: 'The passing cut means it.', damage: 9 },
      { note: 'A longer walk, told oftener.', dashTiles: 8.4, cooldownTicks: 150 },
      {
        note: 'You pass; the wound stays.',
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'threadwork',
    style: 'sneak',
    unlockLevel: 20,
    ranks: [
      { note: 'The needle bites harder.', damage: 5 },
      { note: 'The seam takes a fourth pass.', channelTicks: 64 },
      { note: 'The thread pulls red behind it.', cooldownTicks: 180, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'smoke_bomb',
    style: 'sneak',
    unlockLevel: 25,
    ranks: [
      { note: 'The gray reaches farther.', radius: 2.8 },
      {
        note: 'The choke lingers.',
        status: { status: 'chill', power: 1, durationTicks: 130 },
      },
      { note: 'A whole room, lost in gray.', radius: 3.2, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'nightshade_kiss',
    style: 'sneak',
    unlockLevel: 30,
    ranks: [
      { note: 'The dart strikes truer.', damage: 10 },
      { note: 'The garden steeps stronger.', status: { status: 'venom', power: 2, durationTicks: 80 } },
      { note: 'The kiss asks again sooner.', cooldownTicks: 210 },
    ],
  },
  {
    ability: 'caltrops',
    style: 'sneak',
    unlockLevel: 35,
    ranks: [
      { note: 'The teeth bite deeper.', damage: 4 },
      { note: 'More iron, sown wider, waiting longer.', radius: 2.2, fieldTicks: 160 },
      {
        note: 'Rusted barbs — the crossing is never forgotten.',
        damage: 5,
        status: { status: 'bleed', power: 2, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'quiet_knife',
    style: 'sneak',
    unlockLevel: 40,
    ranks: [
      { note: 'The hush cuts deeper.', damage: 5 },
      { note: 'The line holds a fourth breath.', channelTicks: 64 },
      { note: 'The quiet arrives sooner each time.', cooldownTicks: 170 },
    ],
  },
  {
    ability: 'fan_of_knives',
    style: 'sneak',
    unlockLevel: 45,
    ranks: [
      { note: 'Every edge asks for more.', damage: 8 },
      { note: 'The fan opens wider, oftener.', radius: 2.6, cooldownTicks: 180 },
      {
        note: 'Every edge leaves its signature.',
        damage: 9,
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'redwork',
    style: 'sneak',
    unlockLevel: 50,
    ranks: [
      { note: 'The bloom cuts deeper.', damage: 12 },
      { note: 'The red reaches the far walls.', radius: 2.6, cooldownTicks: 200 },
      { note: 'The craft pays its maker.', damage: 13, cooldownTicks: 190, drainFrac: 0.12 },
    ],
  },
  {
    ability: 'envenom',
    style: 'sneak',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The oil holds for ten seconds.',
        self: {
          onHitStatus: { status: 'venom', power: 1, durationTicks: 80 },
          durationTicks: 200,
        },
      },
      { note: 'The vial refills sooner.', cooldownTicks: 280 },
      {
        note: 'A crueler brew.',
        self: {
          onHitStatus: { status: 'venom', power: 2, durationTicks: 80 },
          durationTicks: 200,
        },
      },
    ],
  },
  {
    ability: 'gallows_thread',
    style: 'sneak',
    unlockLevel: 58,
    ranks: [
      { note: 'The knot draws venom deeper.', status: { status: 'venom', power: 1, durationTicks: 56 } },
      { note: 'The rope asks again sooner.', cooldownTicks: 200 },
      { note: 'The noose takes a third neck.', chainTargets: 3 },
    ],
  },
  {
    ability: 'feint_double',
    style: 'sneak',
    unlockLevel: 62,
    ranks: [
      {
        note: 'The lie stands longer.',
        summon: { kind: 'decoy', durationTicks: 200, radius: 5, power: 0 },
      },
      { note: 'You can afford to lie oftener.', cooldownTicks: 260 },
      {
        note: 'A lie good enough to gather a crowd.',
        summon: { kind: 'decoy', durationTicks: 240, radius: 7, power: 0 },
      },
    ],
  },
  {
    ability: 'widows_draw',
    style: 'sneak',
    unlockLevel: 66,
    ranks: [
      { note: 'The needles bite harder.', damage: 8 },
      { note: 'The steeping runs deeper.', status: { status: 'venom', power: 1, durationTicks: 80 } },
      { note: 'The needles learn her patience, and seek.', cooldownTicks: 210, homing: 4 },
    ],
  },
  {
    ability: 'exposing_strike',
    style: 'sneak',
    unlockLevel: 70,
    ranks: [
      { note: 'The seam opens wider.', damage: 10 },
      { note: 'You find it faster.', cooldownTicks: 150 },
      { note: 'What is open, ends.', damage: 11, executeBelow: { frac: 0.4, mult: 2.2 } },
    ],
  },
  {
    ability: 'bloodletting',
    style: 'sneak',
    unlockLevel: 74,
    ranks: [
      { note: 'The surgery cuts deeper.', damage: 5 },
      { note: 'The rhythm quickens.', cooldownTicks: 200 },
      { note: 'The taking is thorough now.', drainFrac: 0.25 },
    ],
  },
  {
    ability: 'night_fangs',
    style: 'sneak',
    unlockLevel: 78,
    ranks: [
      { note: 'Sharper fangs.', damage: 6 },
      { note: 'A fourth fang joins the hunt.', projectiles: 4 },
      {
        note: 'The bites stay open.',
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'lights_out',
    style: 'sneak',
    unlockLevel: 82,
    ranks: [
      { note: 'The dark lands heavier.', damage: 16 },
      { note: 'The room grows, and the cold stays longer.', radius: 2.4, status: { status: 'chill', power: 1, durationTicks: 70 } },
      { note: 'The wick pinches quicker.', damage: 17, cooldownTicks: 200, castTicks: 22 },
    ],
  },
  {
    ability: 'red_hour',
    style: 'sneak',
    unlockLevel: 86,
    ranks: [
      { note: 'Every second cuts deeper.', damage: 5 },
      { note: 'The hour fills a wider room.', radius: 2.3 },
      { note: 'The clock runs hungrier.', cooldownTicks: 240, status: { status: 'bleed', power: 1, durationTicks: 50 } },
    ],
  },
  {
    ability: 'thousand_cuts',
    style: 'sneak',
    unlockLevel: 90,
    ranks: [
      { note: 'Each cut counts double.', damage: 4 },
      { note: 'A sixth beat in the drumroll.', hits: 6, cooldownTicks: 200 },
      {
        note: 'Count them later.',
        status: { status: 'bleed', power: 2, durationTicks: 40 },
      },
    ],
  },

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

  // -------------------------- THE GREAT SCHOOL — the colossus's rungs
  {
    ability: 'wide_swath',
    style: 'twohand',
    unlockLevel: 5,
    ranks: [
      { note: 'The stroke lands heavier.', damage: 12 },
      { note: 'A wider horizon, a shorter wait.', arc: 2.8, cooldownTicks: 160 },
      { note: 'The front rank leaves the field.', damage: 14, cooldownTicks: 155, knockback: 1.8 },
    ],
  },
  {
    ability: 'fell_timber',
    style: 'twohand',
    unlockLevel: 10,
    ranks: [
      { note: 'The timber lands heavier.', damage: 14 },
      { note: 'The splinters draw blood.', status: { status: 'bleed', power: 1, durationTicks: 60 } },
      { note: 'The axe is loose again sooner, and throws.', damage: 15, knockback: 1.8, cooldownTicks: 170, castTicks: 18 },
    ],
  },
  {
    ability: 'haft_check',
    style: 'twohand',
    unlockLevel: 15,
    ranks: [
      { note: 'The shove learns its manners last.', knockback: 3.0 },
      { note: 'The jolt holds them a beat longer.', status: { status: 'shock', power: 1, durationTicks: 50 } },
      { note: 'Room enough for the whole next swing.', knockback: 3.4, status: { status: 'shock', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'quarry_work',
    style: 'twohand',
    unlockLevel: 20,
    ranks: [
      { note: 'The seam splits deeper.', damage: 6 },
      { note: 'The quarry takes a fourth swing.', channelTicks: 64 },
      { note: 'The stone comes apart at the grain.', status: { status: 'sunder', power: 14, durationTicks: 60 } },
    ],
  },
  {
    ability: 'iron_pendulum',
    style: 'twohand',
    unlockLevel: 25,
    ranks: [
      { note: 'The pendulum swings heavier.', damage: 10 },
      { note: 'The second swing comes sooner.', pulseEveryTicks: 6, cooldownTicks: 190 },
      { note: 'Back and forth until the yard is quiet.', damage: 11, knockback: 1.4 },
    ],
  },
  {
    ability: 'forgefall',
    style: 'twohand',
    unlockLevel: 30,
    ranks: [
      { note: 'The hammer lands heavier.', damage: 14 },
      { note: 'The glow spreads further, and lingers.', radius: 2.6, status: { status: 'burn', power: 1, durationTicks: 60 } },
      { note: 'The forge fires again sooner.', damage: 15, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'fault_line',
    style: 'twohand',
    unlockLevel: 35,
    ranks: [
      { note: 'The ground breaks deeper.', damage: 15 },
      { note: 'The crack runs wider.', radius: 2.4, cooldownTicks: 200 },
      { note: 'Nobody keeps their feet on a fault.', damage: 16, knockback: 1.8 },
    ],
  },
  {
    ability: 'wheelbreaker',
    style: 'twohand',
    unlockLevel: 40,
    ranks: [
      { note: 'The ram drives harder.', damage: 6 },
      { note: 'The lane holds a fourth breath.', channelTicks: 64 },
      { note: 'The wheels break the further way back.', knockback: 0.9, status: { status: 'shock', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'colossus_stance',
    style: 'twohand',
    unlockLevel: 45,
    ranks: [
      { note: 'The wounds you leave open wider.', self: { speedMult: 1.1, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'The stride lengthens with the temper.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'Too big to argue with. Most stop trying.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 80 }, durationTicks: 200 } },
    ],
  },
  {
    ability: 'gravedigger',
    style: 'twohand',
    unlockLevel: 50,
    ranks: [
      { note: 'The grave takes more.', damage: 16 },
      { note: 'The pull deepens and the pit widens.', radius: 2.4, knockback: -1.4 },
      { note: 'The digging is quicker now.', damage: 18, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'skysunder',
    style: 'twohand',
    unlockLevel: 54,
    ranks: [
      { note: 'The verdict lands heavier.', damage: 17 },
      { note: 'A longer leap, a shorter wait.', dashTiles: 12.0, cooldownTicks: 240 },
      { note: 'The landing empties its own crater.', damage: 18, radius: 2.6, knockback: 2.2 },
    ],
  },
  {
    ability: 'ore_song',
    style: 'twohand',
    unlockLevel: 58,
    ranks: [
      { note: 'The song strikes harder.', damage: 6 },
      { note: 'The ring carries wider.', radius: 2.7 },
      { note: 'The seam sings back sooner.', cooldownTicks: 250 },
    ],
  },
  {
    ability: 'executioners_arc',
    style: 'twohand',
    unlockLevel: 62,
    ranks: [
      { note: 'The stroke bites deeper.', damage: 14 },
      { note: 'It reads the sentence earlier.', executeBelow: { frac: 0.4, mult: 2.0 } },
      { note: 'Sentences end mid-word.', damage: 15, executeBelow: { frac: 0.4, mult: 2.4 } },
    ],
  },
  {
    ability: 'skyweight',
    style: 'twohand',
    unlockLevel: 66,
    ranks: [
      { note: 'The sky lands heavier.', damage: 10 },
      { note: 'The weight falls a third time.', pulses: 3 },
      { note: 'The whole horizon comes down.', radius: 2.6, cooldownTicks: 245 },
    ],
  },
  {
    ability: 'avalanche',
    style: 'twohand',
    unlockLevel: 70,
    ranks: [
      { note: 'Every blow falls heavier.', damage: 9 },
      { note: 'The slide starts sooner, ends sooner.', pulseEveryTicks: 7, cooldownTicks: 240 },
      { note: 'The mountain finishes what it starts.', damage: 10, knockback: 1.6 },
    ],
  },
  {
    ability: 'long_lever',
    style: 'twohand',
    unlockLevel: 74,
    ranks: [
      { note: 'The lever bears harder.', damage: 5 },
      { note: 'The reach runs longer and wider.', range: 10, width: 0.9 },
      { note: 'The world moves after all.', knockback: 0.9, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'breaker_charge',
    style: 'twohand',
    unlockLevel: 78,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 15 },
      { note: 'A longer road, sooner open.', dashTiles: 10.0, cooldownTicks: 200 },
      { note: 'Through is the only direction left.', damage: 16, knockback: 3.2 },
    ],
  },
  {
    ability: 'sunhammer',
    style: 'twohand',
    unlockLevel: 82,
    ranks: [
      { note: 'The noon swings heavier.', damage: 16 },
      { note: 'The arc takes the whole sky.', arc: 2, knockback: 1.5 },
      { note: 'The heat stays in the iron.', damage: 17, cooldownTicks: 220, status: { status: 'burn', power: 2, durationTicks: 60 } },
    ],
  },
  {
    ability: 'worlds_rim',
    style: 'twohand',
    unlockLevel: 86,
    ranks: [
      { note: 'The rim grinds deeper.', damage: 5 },
      { note: 'The far edge reaches wider.', radius: 2.7 },
      { note: 'The cold of the rim settles in.', cooldownTicks: 240, status: { status: 'chill', power: 1, durationTicks: 70 } },
    ],
  },
  {
    ability: 'titans_verdict',
    style: 'twohand',
    unlockLevel: 90,
    ranks: [
      { note: 'The rings strike heavier.', damage: 11 },
      { note: 'The rings come quicker, and shove.', damage: 11, radius: 2.7, pulseEveryTicks: 9, knockback: 2.0 },
      { note: 'The verdict stands. The earth signs it.', damage: 12, radius: 3.0, pulseEveryTicks: 9, knockback: 2.4 },
    ],
  },

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

  // --------------------- THE VETERAN'S SCHOOL — the combat ladder
  {
    ability: 'first_blood',
    style: 'combat',
    unlockLevel: 5,
    ranks: [
      { note: 'The first one lands harder.', damage: 10 },
      {
        note: 'The wound stays open longer.',
        damage: 11,
        status: { status: 'bleed', power: 1, durationTicks: 70 },
      },
      {
        note: 'First blood wakes your feet.',
        damage: 12,
        status: { status: 'bleed', power: 1, durationTicks: 70 },
        self: { speedMult: 1.06, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'measured_blow',
    style: 'combat',
    unlockLevel: 10,
    ranks: [
      { note: 'The measure lands heavier.', damage: 13 },
      { note: 'The seam is read before the strike.', status: { status: 'sunder', power: 12, durationTicks: 60 } },
      { note: 'Measured once now. Landed just the same.', damage: 14, cooldownTicks: 150, castTicks: 16 },
    ],
  },
  {
    ability: 'shoulder_check',
    style: 'combat',
    unlockLevel: 15,
    ranks: [
      { note: 'More weight behind the shoulder.', damage: 11 },
      { note: 'A longer run at them.', damage: 12, dashTiles: 7.2 },
      {
        note: 'They stop being where they stood.',
        damage: 13,
        dashTiles: 7.2,
        knockback: 2.0,
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'drumbeat',
    style: 'combat',
    unlockLevel: 20,
    ranks: [
      { note: 'The drum strikes harder.', damage: 6 },
      { note: 'The cadence holds a fourth bar.', channelTicks: 64 },
      { note: 'The line is driven back to the beat.', radius: 2.3, knockback: 0.9 },
    ],
  },
  {
    ability: 'war_shout',
    style: 'combat',
    unlockLevel: 25,
    ranks: [
      { note: 'Louder, and it hurts more.', damage: 11 },
      { note: 'The yard hears it further out.', damage: 11, radius: 2.7 },
      {
        note: 'The shout holds them a beat longer.',
        damage: 12,
        radius: 2.7,
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'thrown_iron',
    style: 'combat',
    unlockLevel: 30,
    ranks: [
      { note: 'The iron lands harder.', damage: 13 },
      { note: 'The throw carries further.', range: 11, projectileSpeed: 16 },
      { note: 'Both hands throw now.', projectiles: 2, spreadArc: 0.15, cooldownTicks: 160, castTicks: 18 },
    ],
  },
  {
    ability: 'second_breath',
    style: 'combat',
    unlockLevel: 35,
    ranks: [
      { note: 'A deeper pull of air.', self: { heal: 14, speedMult: 1.1, durationTicks: 100 } },
      { note: 'The legs get their share.', self: { heal: 16, speedMult: 1.12, durationTicks: 100 } },
      {
        note: 'The breath steadies the arm too.',
        self: { heal: 18, speedMult: 1.12, armor: 2, durationTicks: 120 },
      },
    ],
  },
  {
    ability: 'ironbreath',
    style: 'combat',
    unlockLevel: 40,
    ranks: [
      { note: 'The breath bites colder.', damage: 6 },
      { note: 'The cold keeps them longer and the lane runs wider.', width: 0.8, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The exhale holds a fourth count.', channelTicks: 64, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'loose_iron',
    style: 'combat',
    unlockLevel: 45,
    ranks: [
      { note: 'Heavier iron in the hand.', damage: 6 },
      { note: 'A fourth thing finds your fingers.', projectiles: 4 },
      {
        note: 'Rough edges. Everything you throw bites.',
        status: { status: 'bleed', power: 1, durationTicks: 42 },
      },
    ],
  },
  {
    ability: 'fifth_road',
    style: 'combat',
    unlockLevel: 50,
    ranks: [
      { note: 'The road hits harder.', damage: 14 },
      { note: 'The fifth road runs further.', dashTiles: 11.0 },
      { note: 'The toll is taken quicker.', damage: 15, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'hold_fast',
    style: 'combat',
    unlockLevel: 54,
    ranks: [
      { note: 'The stance sets deeper.', self: { armor: 5, shieldHp: 10, durationTicks: 140 } },
      { note: 'Held longer.', self: { armor: 5, shieldHp: 12, durationTicks: 160 } },
      {
        note: 'What breaks on you, breaks back.',
        self: { armor: 6, shieldHp: 14, reflectFrac: 0.1, durationTicks: 160 },
      },
    ],
  },
  {
    ability: 'old_thunder',
    style: 'combat',
    unlockLevel: 58,
    ranks: [
      { note: 'The thunder lands harder.', damage: 5 },
      { note: 'The storm reaches wider, and holds.', arc: 1.5, status: { status: 'shock', power: 1, durationTicks: 40 } },
      { note: 'The old storm comes back sooner.', cooldownTicks: 190 },
    ],
  },
  {
    ability: 'break_the_line',
    style: 'combat',
    unlockLevel: 62,
    ranks: [
      { note: 'More of you arrives at once.', damage: 15 },
      { note: 'The line bends further back.', damage: 16, knockback: 2.2 },
      {
        note: 'Broken lines stay broken a while.',
        damage: 18,
        knockback: 2.2,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'gathered_breath',
    style: 'combat',
    unlockLevel: 66,
    ranks: [
      { note: 'The breath lands heavier.', damage: 14 },
      { note: 'The burst takes the whole square.', radius: 2.9, knockback: 1.3 },
      { note: 'Gathered quicker. Loosed just as whole.', damage: 15, cooldownTicks: 190, castTicks: 22 },
    ],
  },
  {
    ability: 'the_opening',
    style: 'combat',
    unlockLevel: 70,
    ranks: [
      { note: 'The answer arrives heavier.', damage: 15 },
      { note: 'Sharper eyes, sharper price.', damage: 16 },
      { note: 'A failing guard is an open door.', damage: 16, executeBelow: { frac: 0.3, mult: 2.3 } },
    ],
  },
  {
    ability: 'long_watch',
    style: 'combat',
    unlockLevel: 74,
    ranks: [
      { note: 'The watch strikes harder.', damage: 5 },
      { note: 'The ground covered grows.', radius: 2.5 },
      { note: 'The cold certainty settles on them.', cooldownTicks: 230, status: { status: 'chill', power: 1, durationTicks: 50 } },
    ],
  },
  {
    ability: 'no_quarter',
    style: 'combat',
    unlockLevel: 78,
    ranks: [
      { note: 'You keep more of what you take.', drainFrac: 0.3 },
      { note: 'Each refusal lands harder.', damage: 6, drainFrac: 0.3 },
      { note: 'The fight feeds you as fast as it costs them.', damage: 6, drainFrac: 0.4 },
    ],
  },
  {
    ability: 'scarworn',
    style: 'combat',
    unlockLevel: 82,
    ranks: [
      { note: 'The receipts collect deeper.', damage: 15 },
      { note: 'The taking is thorough.', drainFrac: 0.3 },
      { note: 'The scars answer at once.', damage: 16, cooldownTicks: 180, castTicks: 22 },
    ],
  },
  {
    ability: 'last_lesson',
    style: 'combat',
    unlockLevel: 86,
    ranks: [
      { note: 'The lesson lands harder.', damage: 5 },
      { note: 'The stunned silence holds the room.', status: { status: 'shock', power: 1, durationTicks: 30 } },
      { note: 'A third student is called on.', chainTargets: 3 },
    ],
  },
  {
    ability: 'the_long_fight',
    style: 'combat',
    unlockLevel: 90,
    ranks: [
      { note: 'Each wave lands heavier.', damage: 8 },
      { note: 'The fight widens around you.', damage: 8, radius: 2.4 },
      { note: 'It ends the way it always ends. You, standing.', damage: 9, radius: 2.4 },
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

  // ------------------------- THE UNWRITTEN PAGE — deed-earned seats
  {
    ability: 'riftwalker_step',
    style: 'arx',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'You carry more of the far side back.', damage: 10 },
      { note: 'The step lengthens; the rift stays open longer for you.', dashTiles: 10.4, cooldownTicks: 170 },
      {
        note: 'The static of the crossing clings to everything you pass.',
        damage: 11,
        status: { status: 'shock', power: 1, durationTicks: 80 },
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
  {
    ability: 'warden_volley',
    style: 'archery',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Each shaft means the NO harder.', damage: 7 },
      { note: 'A fifth shaft joins the answer.', projectiles: 5 },
      { note: 'The wall holds; they do not.', damage: 9, knockback: 2.0, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'whisper_fang',
    style: 'sneak',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The whisper cuts deeper.', damage: 11 },
      { note: 'The name is spoken sooner.', cooldownTicks: 170 },
      {
        note: 'The whisper keeps talking after it lands.',
        status: { status: 'bleed', power: 2, durationTicks: 80 },
      },
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
  {
    ability: 'giantsfall',
    style: 'twohand',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The memory swings heavier.', damage: 19 },
      { note: 'It reaches the tall ones sooner.', range: 3.1, cooldownTicks: 220 },
      { note: 'Everything falls the same height in the end.', damage: 21, knockback: 2.6 },
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
  {
    ability: 'four_roads',
    style: 'combat',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Each road adds its weight.', damage: 12 },
      { note: 'The circle widens to fit four schools.', damage: 13, radius: 2.5 },
      {
        note: 'All four roads, walked at once.',
        damage: 15,
        radius: 2.5,
        self: { speedMult: 1.14, armor: 2, durationTicks: 100 },
      },
    ],
  },
  // THE NEW VOICES (THE DRAWN BREATH Phase 4): the first channeled
  // pages — deed-earned, like every page before them.
  {
    ability: 'whirling_ruin',
    style: 'twohand',
    unlockLevel: 0,
    hidden: { anchorLevel: 38 },
    ranks: [
      { note: 'Each turn of the steel asks for more.', damage: 4 },
      { note: 'The wheel spins up sooner between rests.', cooldownTicks: 240 },
      { note: 'The storm refuses to sit down.', channelTicks: 70 },
    ],
  },
  {
    ability: 'winters_fall',
    style: 'arx',
    unlockLevel: 0,
    hidden: { anchorLevel: 38 },
    ranks: [
      { note: 'Heavier ice, asked for by name.', damage: 5 },
      { note: 'A wider patch of sky agrees.', radius: 2.6 },
      {
        note: 'The fall quickens, and the cold outstays it.',
        pulseEveryTicks: 13,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
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
];

export function techniquesFor(style: string): TechniqueDef[] {
  return TECHNIQUES.filter((t) => t.style === style);
}

export function techniqueDef(ability: string): TechniqueDef | undefined {
  return TECHNIQUES.find((t) => t.ability === ability);
}
