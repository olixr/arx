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
    desc: 'A ring of raw magic snaps outward from the staff\'s heel.',
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
    desc: 'For six seconds, every melee wound you deal feeds you.',
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
  // The rogue's ladder: unlocked by the sneak skill, reached through any
  // dagger (WeaponStats.techStyle) — the payoff of the shadow grind.
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
    style: 'melee',
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
    ability: 'whirlwind',
    style: 'melee',
    unlockLevel: 15,
    ranks: [
      { note: 'Each cut bites deeper.', damage: 5 },
      { note: 'The blade reaches a step farther.', radius: 2.1 },
      { note: 'The storm turns a fourth time.', pulses: 4 },
    ],
  },
  {
    ability: 'bloodlust',
    style: 'melee',
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
    ability: 'earthbreaker',
    style: 'melee',
    unlockLevel: 45,
    ranks: [
      { note: 'You land heavier.', damage: 13 },
      { note: 'The leap carries farther; the verdict spreads wider.', dashTiles: 5.5, radius: 2.5 },
      { note: 'The mountain falls oftener, and harder.', cooldownTicks: 190, knockback: 3.0 },
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
    ability: 'rain_of_arrows',
    style: 'archery',
    unlockLevel: 15,
    ranks: [
      { note: 'The sky falls harder.', damage: 11 },
      { note: 'A wider patch of ruin, called sooner.', cooldownTicks: 200, radius: 2.4 },
      {
        note: 'Barbed heads — the wounds keep raining.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'twin_strike',
    style: 'archery',
    unlockLevel: 30,
    ranks: [
      { note: 'Heavier shafts.', damage: 11 },
      { note: 'The pair returns to your hand sooner.', cooldownTicks: 170 },
      { note: 'The shafts learn to seek their marks.', homing: 4.0 },
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
    ability: 'arc_bolt',
    style: 'magic',
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
    ability: 'blink',
    style: 'magic',
    unlockLevel: 15,
    ranks: [
      { note: 'A longer stride between places.', dashTiles: 4.6 },
      { note: 'The door opens oftener.', cooldownTicks: 170 },
      { note: 'Distance stops being an argument.', dashTiles: 5.4, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'meteor_shard',
    style: 'magic',
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
    ability: 'maelstrom',
    style: 'magic',
    unlockLevel: 45,
    ranks: [
      { note: 'The drain pulls a deeper draught.', damage: 12 },
      { note: 'The eye widens.', radius: 3.0 },
      {
        note: 'The sea remembers longer, and nothing swims out.',
        damage: 13,
        cooldownTicks: 240,
        knockback: -2.6,
        status: { status: 'chill', power: 1, durationTicks: 100 },
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
];

export function techniquesFor(style: string): TechniqueDef[] {
  return TECHNIQUES.filter((t) => t.style === style);
}

export function techniqueDef(ability: string): TechniqueDef | undefined {
  return TECHNIQUES.find((t) => t.ability === ability);
}
