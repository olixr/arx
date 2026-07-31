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
  // ------------------------------------------------------ weapon arts
  {
    id: 'crescent_sweep',
    name: 'Crescent Sweep',
    desc: 'Spin in a full circle, wounding everything around you.',
    color: '#d9a05a',
    code: 'CS',
    cooldownTicks: 130, // 6.5 s
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
    cooldownTicks: 150, // 7.5 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 3.4,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
  },
  {
    id: 'shadowstep',
    name: 'Shadowstep',
    desc: 'Melt forward through the dark — the knife arrives before you do.',
    color: '#7a68a8',
    code: 'Sp',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 3.0,
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
    dashTiles: 2.8,
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
    cooldownTicks: 180, // 9 s
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
    cooldownTicks: 200, // 10 s
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
    cooldownTicks: 180, // 9 s
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
    cooldownTicks: 130, // 6.5 s
    shape: 'dash_strike',
    damage: 6,
    dashTiles: 2.5,
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
    cooldownTicks: 140, // 7 s
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
    cooldownTicks: 100, // 5 s — the wasp does not wait
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 2.0,
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
    dashTiles: 3.6,
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
    cooldownTicks: 170, // 8.5 s
    shape: 'dash_strike',
    damage: 10,
    dashTiles: 3.0,
    executeBelow: { frac: 0.3, mult: 1.5 }, // regicide favors a faltering crown
    status: { status: 'bleed', power: 1, durationTicks: 80 },
  },
  {
    id: 'last_word',
    name: 'Last Word',
    desc: 'Step in, say it once, and the conversation is over. The weary hear it loudest.',
    color: '#f0f0f4',
    code: 'Lw',
    cooldownTicks: 200, // 10 s
    shape: 'dash_strike',
    damage: 14,
    dashTiles: 2.6,
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
    cooldownTicks: 150, // 7.5 s
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
    cooldownTicks: 110, // 5.5 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 2.2,
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

  // -------------------------------------- archmage's-roster weapon arts
  // Every staff school speaks through its Art — same data-driven
  // executor. Elements paint the projectiles; statuses feed reactions.
  {
    id: 'arcane_ring',
    name: 'Arcane Ring',
    desc: 'A ring of raw Arx snaps outward from the staff\'s heel.',
    color: '#b49af0',
    code: 'Ar',
    cooldownTicks: 140, // 7 s
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
    cooldownTicks: 180, // 9 s
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
    fieldTicks: 120, // 6 s of living thicket
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
    cooldownTicks: 140, // 7 s
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
    cooldownTicks: 190, // 9.5 s
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
    cooldownTicks: 190, // 9.5 s
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
    fieldTicks: 110,
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
    cooldownTicks: 180, // 9 s
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
    fieldTicks: 110,
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
    dashTiles: 3.0,
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
    dashTiles: -2.6, // away from the aim — the disengage tool
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
    dashTiles: 3.8,
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
    dashTiles: 4.5,
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
    shape: 'ground_field',
    damage: 4,
    range: 12,
    radius: 2.2,
    fieldTicks: 120,
    pulseEveryTicks: 14,
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
    desc: 'Spin the sea out of dry land — everything caught walks the drain.',
    color: '#6aa0c8',
    code: 'Mm',
    cooldownTicks: 260, // 13 s
    shape: 'ground_aoe',
    damage: 10,
    range: 12,
    radius: 2.6,
    fuseTicks: 16,
    knockback: -2.2, // the drain: a hard drag into the eye
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
    dashTiles: 3.2,
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
    dashTiles: 4.0,
    radius: 2.3,
    knockback: 2.0,
    self: { shieldHp: 5, speedMult: 1.1, durationTicks: 100 },
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
    castFreezeTicks: 4,
    shape: 'ground_aoe',
    damage: 14,
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
    dashTiles: 3.4,
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
    dashTiles: 3.6,
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
    dashTiles: 5.0,
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
    dashTiles: 4.2,
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
    cooldownTicks: 280, // 14 s
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
    dashTiles: 6.0,
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
    cooldownTicks: 280, // 14 s
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
    cooldownTicks: 300, // 15 s
    castFreezeTicks: 4,
    shape: 'pulse_nova',
    damage: 10,
    radius: 2.5,
    pulses: 3,
    pulseEveryTicks: 12,
    knockback: 1.5,
    status: { status: 'shock', power: 1, durationTicks: 45 },
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
    dashTiles: 3.4,
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
    dashTiles: 4.5,
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
    dashTiles: 3,
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
    id: 'riftwalker_step',
    name: 'Riftwalker Step',
    desc: 'Step the way the rift taught you — through, and out the far side of them.',
    color: '#9a86d8',
    code: 'Rw',
    cooldownTicks: 190, // 9.5 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 4.4,
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
 * reached at +15/+30/+45 base levels over its unlock. Rank II sharpens
 * numbers, Rank III adds a beat of utility, Rank IV is the signature —
 * one visible, nameable flourish. Notes are player-facing bench copy.
 * The ladder balance contract in ladder.test.ts keeps every art's
 * mature cycle value inside its style's band — tune there, not by ear.
 */
export const TECHNIQUES: readonly TechniqueDef[] = [
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
    ability: 'bull_rush',
    style: 'onehand',
    unlockLevel: 10,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 10 },
      { note: 'A longer charge, sooner ready.', dashTiles: 4.2, cooldownTicks: 150 },
      { note: 'Nothing stands where you arrive.', damage: 11, knockback: 3.2 },
    ],
  },
  {
    ability: 'whirlwind',
    style: 'onehand',
    unlockLevel: 15,
    ranks: [
      { note: 'Each cut bites deeper.', damage: 5 },
      { note: 'The blade reaches a step farther.', radius: 2.1 },
      { note: 'The storm turns a fourth time.', pulses: 4 },
    ],
  },
  {
    ability: 'warcry',
    style: 'onehand',
    unlockLevel: 20,
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
    ability: 'steel_wave',
    style: 'onehand',
    unlockLevel: 25,
    ranks: [
      { note: 'The edges bite deeper.', damage: 8 },
      { note: 'The wave rolls out oftener.', cooldownTicks: 160 },
      { note: 'A fourth blade joins the wave.', projectiles: 4, spreadArc: 0.6 },
    ],
  },
  {
    ability: 'bloodlust',
    style: 'onehand',
    unlockLevel: 30,
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
    ability: 'stagger_stomp',
    style: 'onehand',
    unlockLevel: 35,
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
    ability: 'headsman_stroke',
    style: 'onehand',
    unlockLevel: 40,
    ranks: [
      { note: 'The arc lands heavier.', damage: 14 },
      { note: 'The stroke returns to the shoulder sooner.', cooldownTicks: 170 },
      { note: 'The verdict widens.', executeBelow: { frac: 0.35, mult: 2.0 } },
    ],
  },
  {
    ability: 'earthbreaker',
    style: 'onehand',
    unlockLevel: 45,
    ranks: [
      { note: 'You land heavier.', damage: 13 },
      { note: 'The leap carries farther; the verdict spreads wider.', dashTiles: 5.5, radius: 2.5 },
      { note: 'The mountain falls oftener, and harder.', cooldownTicks: 190, knockback: 3.0 },
    ],
  },
  {
    ability: 'warlords_descent',
    style: 'onehand',
    unlockLevel: 50,
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
      { note: 'A longer roll, ready again sooner.', cooldownTicks: 140, dashTiles: -3.2 },
      { note: 'Two shafts, loosed mid-tumble.', projectiles: 2, spreadArc: 0.1 },
    ],
  },
  {
    ability: 'longshot',
    style: 'archery',
    unlockLevel: 10,
    ranks: [
      { note: 'The line lands heavier.', damage: 11 },
      { note: 'The draw comes back to you sooner.', cooldownTicks: 150 },
      { note: 'The line it draws does not bend, or end kindly.', damage: 13 },
    ],
  },
  {
    ability: 'rain_of_arrows',
    style: 'archery',
    unlockLevel: 15,
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
    ability: 'snare_shot',
    style: 'archery',
    unlockLevel: 20,
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
    ability: 'ricochet',
    style: 'archery',
    unlockLevel: 25,
    ranks: [
      { note: 'Each carom means it more.', damage: 9 },
      { note: 'A third change of mind.', chainTargets: 3 },
      { note: 'No wall ends the argument.', damage: 10, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'twin_strike',
    style: 'archery',
    unlockLevel: 30,
    ranks: [
      { note: 'Heavier shafts.', damage: 11 },
      { note: 'The pair returns to your hand sooner.', cooldownTicks: 170 },
      { note: 'Two arguments, one conclusion — heavier.', damage: 12 },
    ],
  },
  {
    ability: 'skyfall_shot',
    style: 'archery',
    unlockLevel: 35,
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
    ability: 'phantom_flight',
    style: 'archery',
    unlockLevel: 40,
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
    ability: 'storm_of_shafts',
    style: 'archery',
    unlockLevel: 45,
    ranks: [
      { note: 'Every falling shaft bites harder.', damage: 5 },
      { note: 'The schedule tightens; the patch grows.', pulseEveryTicks: 12, radius: 2.6 },
      {
        note: 'The storm outstays its welcome, and the caught walk slow.',
        fieldTicks: 144,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'arrow_tempest',
    style: 'archery',
    unlockLevel: 50,
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
    ability: 'frost_lance',
    style: 'arx',
    unlockLevel: 10,
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
    ability: 'blink',
    style: 'arx',
    unlockLevel: 15,
    ranks: [
      { note: 'A longer stride between places.', dashTiles: 4.6 },
      { note: 'The door opens oftener.', cooldownTicks: 170 },
      { note: 'Distance stops being an argument.', dashTiles: 5.4, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'ward_shell',
    style: 'arx',
    unlockLevel: 20,
    ranks: [
      { note: 'The shell thickens.', self: { shieldHp: 14, durationTicks: 160 } },
      { note: 'The light gathers again sooner.', cooldownTicks: 280 },
      { note: 'A shell that outlasts the storm.', self: { shieldHp: 18, durationTicks: 200 } },
    ],
  },
  {
    ability: 'ember_fan',
    style: 'arx',
    unlockLevel: 25,
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
    ability: 'meteor_shard',
    style: 'arx',
    unlockLevel: 30,
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
    ability: 'stormcall',
    style: 'arx',
    unlockLevel: 35,
    ranks: [
      { note: 'Each strike asks for more.', damage: 6 },
      { note: 'The appointment runs long, and wide.', radius: 2.6, fieldTicks: 120 },
      { note: 'The sky keeps the appointment.', cooldownTicks: 220 },
    ],
  },
  {
    ability: 'mirror_image',
    style: 'arx',
    unlockLevel: 40,
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
    ability: 'maelstrom',
    style: 'arx',
    unlockLevel: 45,
    ranks: [
      { note: 'The drain pulls a deeper draught.', damage: 12 },
      { note: 'The eye widens.', radius: 3.0 },
      {
        note: 'The sea remembers longer, and nothing swims out.',
        damage: 13,
        cooldownTicks: 230,
        knockback: -2.6,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'daybreak',
    style: 'arx',
    unlockLevel: 50,
    ranks: [
      { note: 'Noon weighs more.', damage: 16 },
      { note: 'A wider noon, delivered oftener.', radius: 2.8, cooldownTicks: 260 },
      {
        note: 'Noon arrives where you point, and stays to burn.',
        damage: 18,
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
    ability: 'ghost_step',
    style: 'sneak',
    unlockLevel: 10,
    ranks: [
      { note: 'The passing cut means it.', damage: 9 },
      { note: 'A longer walk, told oftener.', dashTiles: 4.2, cooldownTicks: 150 },
      {
        note: 'You pass; the wound stays.',
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'smoke_bomb',
    style: 'sneak',
    unlockLevel: 15,
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
    ability: 'caltrops',
    style: 'sneak',
    unlockLevel: 20,
    ranks: [
      { note: 'The teeth bite deeper.', damage: 4 },
      { note: 'More iron, sown wider, waiting longer.', radius: 2.2, fieldTicks: 160 },
      {
        note: 'Rusted barbs — the crossing is never forgotten.',
        status: { status: 'bleed', power: 2, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'fan_of_knives',
    style: 'sneak',
    unlockLevel: 25,
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
    ability: 'envenom',
    style: 'sneak',
    unlockLevel: 30,
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
    ability: 'feint_double',
    style: 'sneak',
    unlockLevel: 35,
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
    ability: 'exposing_strike',
    style: 'sneak',
    unlockLevel: 40,
    ranks: [
      { note: 'The seam opens wider.', damage: 10 },
      { note: 'You find it faster.', cooldownTicks: 150 },
      { note: 'What is open, ends.', executeBelow: { frac: 0.4, mult: 2.2 } },
    ],
  },
  {
    ability: 'night_fangs',
    style: 'sneak',
    unlockLevel: 45,
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
    ability: 'thousand_cuts',
    style: 'sneak',
    unlockLevel: 50,
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
    ability: 'set_the_wall',
    style: 'shield',
    unlockLevel: 10,
    ranks: [
      { note: 'The stance sets deeper.', self: { armor: 11, durationTicks: 160 } },
      { note: 'A skin of iron over the iron.', self: { armor: 11, shieldHp: 6, durationTicks: 160 } },
      { note: 'While the wall stands, so do you.', self: { armor: 14, shieldHp: 8, durationTicks: 180 } },
    ],
  },
  {
    ability: 'shield_rush',
    style: 'shield',
    unlockLevel: 15,
    ranks: [
      { note: 'The drive hits harder.', damage: 10 },
      { note: 'A longer road, sooner open.', dashTiles: 4.4, cooldownTicks: 170 },
      { note: 'They stagger cold from your road.', knockback: 3.4, status: { status: 'chill', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'draw_iron',
    style: 'shield',
    unlockLevel: 20,
    ranks: [
      { note: 'The shout carries farther.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 300 },
      { note: 'Iron answers those who answer.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 300, self: { armor: 6, durationTicks: 80 } },
      { note: 'The whole yard hears its name.', radius: 5.0, tauntRadius: 5.0, cooldownTicks: 300, self: { armor: 8, durationTicks: 100 } },
    ],
  },
  {
    ability: 'shield_roof',
    style: 'shield',
    unlockLevel: 25,
    ranks: [
      { note: 'The roof bears more weather.', self: { shieldHp: 22, speedMult: 0.85, durationTicks: 160 } },
      { note: 'The weight learns your shoulders.', self: { shieldHp: 22, speedMult: 0.95, durationTicks: 160 } },
      { note: 'Let it rain.', self: { shieldHp: 30, speedMult: 0.95, durationTicks: 180 } },
    ],
  },
  {
    ability: 'turned_blow',
    style: 'shield',
    unlockLevel: 30,
    ranks: [
      { note: 'More of the blow goes home.', self: { reflectFrac: 0.45, durationTicks: 120 } },
      { note: 'The angle hardens the arm that holds it.', self: { reflectFrac: 0.45, armor: 4, durationTicks: 120 } },
      { note: 'The wall keeps nothing that was sent to it.', self: { reflectFrac: 0.6, armor: 4, durationTicks: 140 } },
    ],
  },
  {
    ability: 'rampart_break',
    style: 'shield',
    unlockLevel: 35,
    ranks: [
      { note: 'The rim bites deeper ground.', damage: 15 },
      { note: 'The break spreads wider, oftener.', radius: 2.6, cooldownTicks: 200 },
      { note: 'The yard breaks with them.', damage: 16, knockback: 2.4 },
    ],
  },
  {
    ability: 'wheel_of_iron',
    style: 'shield',
    unlockLevel: 40,
    ranks: [
      { note: 'The wheel spins heavier.', damage: 11 },
      { note: 'A longer arc out, a shorter wait after.', range: 11, cooldownTicks: 190 },
      { note: 'The rim rings them senseless.', knockback: 2.2, status: { status: 'shock', power: 1, durationTicks: 30 } },
    ],
  },
  {
    ability: 'hold_the_line',
    style: 'shield',
    unlockLevel: 45,
    ranks: [
      { note: 'The line argues harder.', damage: 6 },
      { note: 'The ground holds it longer.', fieldTicks: 180 },
      { note: 'This far. The ground itself agrees.', damage: 7, radius: 2.8, status: { status: 'chill', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'unbroken',
    style: 'shield',
    unlockLevel: 50,
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
    ability: 'haft_check',
    style: 'twohand',
    unlockLevel: 10,
    ranks: [
      { note: 'The shove learns its manners last.', knockback: 3.0 },
      { note: 'The jolt holds them a beat longer.', status: { status: 'shock', power: 1, durationTicks: 50 } },
      { note: 'Room enough for the whole next swing.', knockback: 3.4, status: { status: 'shock', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'iron_pendulum',
    style: 'twohand',
    unlockLevel: 15,
    ranks: [
      { note: 'The pendulum swings heavier.', damage: 10 },
      { note: 'The second swing comes sooner.', pulseEveryTicks: 6, cooldownTicks: 190 },
      { note: 'Back and forth until the yard is quiet.', damage: 11, knockback: 1.4 },
    ],
  },
  {
    ability: 'fault_line',
    style: 'twohand',
    unlockLevel: 20,
    ranks: [
      { note: 'The ground breaks deeper.', damage: 15 },
      { note: 'The crack runs wider.', radius: 2.4, cooldownTicks: 200 },
      { note: 'Nobody keeps their feet on a fault.', damage: 16, knockback: 1.8 },
    ],
  },
  {
    ability: 'colossus_stance',
    style: 'twohand',
    unlockLevel: 25,
    ranks: [
      { note: 'The wounds you leave open wider.', self: { speedMult: 1.1, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'The stride lengthens with the temper.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'Too big to argue with. Most stop trying.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 80 }, durationTicks: 200 } },
    ],
  },
  {
    ability: 'skysunder',
    style: 'twohand',
    unlockLevel: 30,
    ranks: [
      { note: 'The verdict lands heavier.', damage: 17 },
      { note: 'A longer leap, a shorter wait.', dashTiles: 6.0, cooldownTicks: 240 },
      { note: 'The landing empties its own crater.', damage: 18, radius: 2.6, knockback: 2.2 },
    ],
  },
  {
    ability: 'executioners_arc',
    style: 'twohand',
    unlockLevel: 35,
    ranks: [
      { note: 'The stroke bites deeper.', damage: 14 },
      { note: 'It reads the sentence earlier.', executeBelow: { frac: 0.4, mult: 2.0 } },
      { note: 'Sentences end mid-word.', damage: 15, executeBelow: { frac: 0.4, mult: 2.4 } },
    ],
  },
  {
    ability: 'avalanche',
    style: 'twohand',
    unlockLevel: 40,
    ranks: [
      { note: 'Every blow falls heavier.', damage: 9 },
      { note: 'The slide starts sooner, ends sooner.', pulseEveryTicks: 7, cooldownTicks: 240 },
      { note: 'The mountain finishes what it starts.', damage: 10, knockback: 1.6 },
    ],
  },
  {
    ability: 'breaker_charge',
    style: 'twohand',
    unlockLevel: 45,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 15 },
      { note: 'A longer road, sooner open.', dashTiles: 5.0, cooldownTicks: 200 },
      { note: 'Through is the only direction left.', damage: 16, knockback: 3.2 },
    ],
  },
  {
    ability: 'titans_verdict',
    style: 'twohand',
    unlockLevel: 50,
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
    ability: 'heron_step',
    style: 'dualwield',
    unlockLevel: 10,
    ranks: [
      { note: 'The pass cuts deeper.', damage: 11 },
      { note: 'A longer stride through them.', dashTiles: 4.2, cooldownTicks: 160 },
      { note: 'Both edges collect on the way past.', damage: 12, status: { status: 'bleed', power: 2, durationTicks: 50 } },
    ],
  },
  {
    ability: 'crossed_throw',
    style: 'dualwield',
    unlockLevel: 15,
    ranks: [
      { note: 'Each knife argues harder.', damage: 7 },
      { note: 'Thrown oftener, bitten deeper.', damage: 8, cooldownTicks: 150 },
      { note: 'They remember your hands, and come home.', returns: true, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'mirrored_hand',
    style: 'dualwield',
    unlockLevel: 20,
    ranks: [
      { note: 'The mirror holds longer.', self: { offhandWeight: 0.75, durationTicks: 200 } },
      { note: 'The reflection sharpens.', self: { offhandWeight: 0.9, durationTicks: 200 } },
      { note: 'For a while, the two hands are one.', self: { offhandWeight: 1.0, durationTicks: 220 } },
    ],
  },
  {
    ability: 'turning_reel',
    style: 'dualwield',
    unlockLevel: 25,
    ranks: [
      { note: 'The turn cuts deeper.', damage: 12 },
      { note: 'A wider round, called oftener.', radius: 2.5, cooldownTicks: 150 },
      { note: 'The reel rings them where they stand.', damage: 13, status: { status: 'shock', power: 1, durationTicks: 30 } },
    ],
  },
  {
    ability: 'red_ribbons',
    style: 'dualwield',
    unlockLevel: 30,
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
    ability: 'swallows_dive',
    style: 'dualwield',
    unlockLevel: 35,
    ranks: [
      { note: 'The landing bites deeper.', damage: 14 },
      { note: 'A longer flight, a shorter wait.', dashTiles: 5.5, cooldownTicks: 210 },
      { note: 'The landing scatters the ring they made.', damage: 16, radius: 2.1, knockback: 1.8 },
    ],
  },
  {
    ability: 'the_shears',
    style: 'dualwield',
    unlockLevel: 40,
    ranks: [
      { note: 'The blades close harder.', damage: 13 },
      { note: 'They read the thread earlier.', executeBelow: { frac: 0.35, mult: 2.2 }, cooldownTicks: 190 },
      { note: 'Most things were thread all along.', damage: 14, executeBelow: { frac: 0.35, mult: 2.6 } },
    ],
  },
  {
    ability: 'storm_of_two',
    style: 'dualwield',
    unlockLevel: 45,
    ranks: [
      { note: 'Each ring lands heavier.', damage: 7 },
      { note: 'A fourth ring joins the round.', pulses: 4, cooldownTicks: 260 },
      { note: 'The storm widens its round.', damage: 8, radius: 2.1 },
    ],
  },
  {
    ability: 'hundred_hands',
    style: 'dualwield',
    unlockLevel: 50,
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
    ability: 'shoulder_check',
    style: 'combat',
    unlockLevel: 10,
    ranks: [
      { note: 'More weight behind the shoulder.', damage: 11 },
      { note: 'A longer run at them.', damage: 12, dashTiles: 3.6 },
      {
        note: 'They stop being where they stood.',
        damage: 13,
        dashTiles: 3.6,
        knockback: 2.0,
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'war_shout',
    style: 'combat',
    unlockLevel: 15,
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
    ability: 'second_breath',
    style: 'combat',
    unlockLevel: 20,
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
    ability: 'loose_iron',
    style: 'combat',
    unlockLevel: 25,
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
    ability: 'hold_fast',
    style: 'combat',
    unlockLevel: 30,
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
    ability: 'break_the_line',
    style: 'combat',
    unlockLevel: 35,
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
    ability: 'the_opening',
    style: 'combat',
    unlockLevel: 40,
    ranks: [
      { note: 'The answer arrives heavier.', damage: 15 },
      { note: 'Sharper eyes, sharper price.', damage: 16 },
      { note: 'A failing guard is an open door.', damage: 16, executeBelow: { frac: 0.3, mult: 2.3 } },
    ],
  },
  {
    ability: 'no_quarter',
    style: 'combat',
    unlockLevel: 45,
    ranks: [
      { note: 'You keep more of what you take.', drainFrac: 0.3 },
      { note: 'Each refusal lands harder.', damage: 6, drainFrac: 0.3 },
      { note: 'The fight feeds you as fast as it costs them.', damage: 6, drainFrac: 0.4 },
    ],
  },
  {
    ability: 'the_long_fight',
    style: 'combat',
    unlockLevel: 50,
    ranks: [
      { note: 'Each wave lands heavier.', damage: 8 },
      { note: 'The fight widens around you.', damage: 8, radius: 2.4 },
      { note: 'It ends the way it always ends. You, standing.', damage: 9, radius: 2.4 },
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
      { note: 'The step lengthens; the rift stays open longer for you.', dashTiles: 5.2, cooldownTicks: 170 },
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
      { note: 'The wall holds; they do not.', damage: 8, knockback: 2.0, cooldownTicks: 180 },
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
        damage: 14,
        radius: 2.5,
        self: { speedMult: 1.14, armor: 2, durationTicks: 100 },
      },
    ],
  },
];

export function techniquesFor(style: string): TechniqueDef[] {
  return TECHNIQUES.filter((t) => t.style === style);
}

export function techniqueDef(ability: string): TechniqueDef | undefined {
  return TECHNIQUES.find((t) => t.ability === ability);
}
