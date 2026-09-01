/**
 * THE WEAPON ARTS — every roster of weapon-taught arts, the crowns, the voices and the flights.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const WEAPON_ART_DEFS: AbilityDef[] = [
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
];
