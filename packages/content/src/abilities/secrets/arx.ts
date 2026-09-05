/**
 * THE ARX SECRET SHELF — the weapon-taught arts of this school and
 * their honed ranks, one file per school (THE MASTERED HAND,
 * techniques v3). Moved verbatim from weaponArts/ladders and
 * secretRanks; the shelf waves rewrite the arts here. Seats and
 * anchors stay in secretArts.ts (THE ANCHOR RULER is not this file's
 * to move).
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/** THE REGISTER, per shelf (see schools/onehand.ts). */
export const ARX_SECRET_LICENSES: Record<string, string[]> = {};

export const ARX_SECRET_ARTS: AbilityDef[] = [
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
];

export const ARX_SECRET_RANKS: Record<string, Steps> = {
  // ------------------------------------------------- arx, the voices
  arcane_ring: [
    { note: 'The ring strikes harder.', damage: 7 },
    { note: 'The circle draws wider.', radius: 2.4 },
    { note: 'The ring casts its answer sooner.', cooldownTicks: 108 },
  ],
  frost_nova: [
    { note: 'The frost bites deeper.', damage: 6 },
    { note: 'The freeze rings wider.', radius: 2.9 },
    { note: 'The cold holds longer, and returns before the thaw.', status: { status: 'chill', power: 1, durationTicks: 110 }, cooldownTicks: 132 },
  ],
  day_breaks: [
    { note: 'The dawn cuts brighter.', damage: 11 },
    { note: 'The first light falls wider.', width: 0.72 },
    { note: 'Morning holds the burn longer.', status: { status: 'burn', power: 1, durationTicks: 70 } },
  ],
  fireburst: [
    { note: 'The burst burns hotter.', damage: 11 },
    { note: 'The blossom of fire opens wider.', radius: 2.0 },
    { note: 'The burst gives almost no breath of warning.', fuseTicks: 10 },
  ],
  overgrowth: [
    { note: 'The briars rake deeper.', damage: 5 },
    { note: 'The growth claims more ground.', radius: 2.5 },
    { note: 'The thicket lives one season longer.', fieldTicks: 126 },
  ],
  wild_root: [
    { note: 'The roots strike deeper.', damage: 5 },
    { note: 'The wild ground spreads wider.', radius: 2.3 },
    { note: 'The roots hold one heartbeat longer.', fieldTicks: 105 },
  ],
  wisp_flare: [
    { note: 'Each wisp burns brighter.', damage: 5 },
    { note: 'The dance holds a tighter ring.', spreadArc: 0.4 },
    { note: 'A fourth wisp joins the returning dance.', projectiles: 4 },
  ],
  grave_chill: [
    { note: 'The chill bites deeper.', damage: 7 },
    { note: 'The grave cold reaches wider.', radius: 2.6 },
    { note: 'What the grave touches, it keeps still.', status: { status: 'chill', power: 1, durationTicks: 110 } },
  ],
  moonfall: [
    { note: 'The moon falls heavier.', damage: 10 },
    { note: 'The silver ground spreads wider.', radius: 2.4 },
    { note: 'Moonlight arrives without asking.', fuseTicks: 11 },
  ],
  gloom_burst: [
    { note: 'The gloom cuts deeper.', damage: 5 },
    { note: 'The dark pools wider.', radius: 2.2 },
    { note: 'The gloom outstays the light.', fieldTicks: 128 },
  ],
  hearth_flare: [
    { note: 'The hearth roars hotter.', damage: 7 },
    { note: 'The warmth is felt wider.', radius: 2.3 },
    { note: 'The sparks land where they are least wanted.', status: { status: 'burn', power: 2, durationTicks: 60 } },
  ],
  shearwind: [
    { note: 'The wind cuts deeper.', damage: 8 },
    { note: 'The gale blows a ring wider.', radius: 2.9 },
    { note: 'What the wind takes, it throws.', knockback: 3.8 },
  ],
  the_molt: [
    { note: 'Each feather burns deeper.', damage: 5 },
    { note: 'The molt seeks its marks more surely.', projectileSpeed: 24 },
    { note: 'A sixth feather leaves the quill.', projectiles: 6 },
  ],
  venom_lash: [
    { note: 'The lash bites deeper.', damage: 7 },
    { note: 'The twin fangs strike as one.', spreadArc: 0.18 },
    { note: 'The venom settles in for the night.', status: { status: 'venom', power: 1, durationTicks: 120 } },
  ],
  vigil: [
    { note: 'The flame closes more with every beat.', self: { heal: 4, durationTicks: 20 } },
    { note: 'The candle is relit sooner.', cooldownTicks: 340 },
    { note: 'The watch holds a fifth beat.', channelTicks: 80 },
  ],
  axiom: [
    { note: 'The proof lands heavier.', damage: 7 },
    { note: 'The theorem holds wider.', radius: 2.4 },
    { note: 'The conclusion states itself a fourth time.', pulses: 4 },
  ],
  cinderstorm: [
    { note: 'The storm burns hotter.', damage: 9 },
    { note: 'The cinders ride a wider wind.', radius: 2.6 },
    { note: 'The storm leaves its fire behind.', status: { status: 'burn', power: 1, durationTicks: 110 } },
  ],
  galvanic_arc: [
    { note: 'The arc strikes harder.', damage: 8 },
    { note: 'The current leaps farther.', radius: 3.4 },
    { note: 'A fourth body closes the circuit.', chainTargets: 4 },
  ],
  glaciate: [
    { note: 'The ice bites deeper.', damage: 8 },
    { note: 'The glacier front spreads wider.', radius: 3.0 },
    { note: 'The freeze holds until spring.', status: { status: 'chill', power: 2, durationTicks: 110 } },
  ],
  hollowing: [
    { note: 'The hollow bites deeper.', damage: 6 },
    { note: 'The emptiness spreads wider.', radius: 2.6 },
    { note: 'The hollow pulls harder, and opens again sooner.', knockback: -1.8, cooldownTicks: 205 },
  ],
  red_toll: [
    { note: 'The toll collects heavier.', damage: 8 },
    { note: 'The collection reaches farther.', radius: 3.4 },
    { note: 'It drinks deeper from every debtor.', drainFrac: 0.5 },
  ],
  rune_echo: [
    { note: 'The echo lands heavier.', damage: 6 },
    { note: 'The rune sounds wider.', radius: 2.4 },
    { note: 'The echo answers a fourth time.', pulses: 4 },
  ],
  shatterfrost: [
    { note: 'The shatter cuts deeper.', damage: 11 },
    { note: 'The shards fly wider.', radius: 2.8 },
    { note: 'The frost bites through to the marrow.', status: { status: 'chill', power: 2, durationTicks: 80 } },
  ],
  undertow: [
    { note: 'The tow drags heavier.', damage: 10 },
    { note: 'The current claims more water.', radius: 2.4 },
    { note: 'The deep pulls with both hands.', knockback: -2.2 },
  ],
  crownstorm: [
    { note: 'The storm strikes harder.', damage: 9 },
    { note: 'The court of lightning widens.', radius: 3.5 },
    { note: 'A sixth subject kneels to the crown.', chainTargets: 6 },
  ],
  eye_of_the_storm: [
    { note: 'The eye watches heavier weather.', damage: 6 },
    { note: 'The stormwall stands wider.', radius: 2.7 },
    { note: 'The wall widens further, and the lightning stays in the skin.', radius: 2.9, status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],
  magma_orb: [
    { note: 'The orb burns hotter.', damage: 14 },
    { note: 'The melt flies farther.', range: 14 },
    { note: 'What it passes through, it sets alight.', status: { status: 'burn', power: 2, durationTicks: 80 } },
  ],
  marrow_pulse: [
    { note: 'The pulse strikes deeper.', damage: 6 },
    { note: 'The bone song carries wider.', radius: 2.5 },
    { note: 'The marrow answers a fourth beat.', pulses: 4 },
  ],
  perihelion: [
    { note: 'The near sun burns hotter.', damage: 13 },
    { note: 'The corona spreads wider.', radius: 2.5 },
    { note: 'The orbit closes faster than the eye, and comes round again.', fuseTicks: 12, cooldownTicks: 200 },
  ],
  solar_lance: [
    { note: 'The lance burns brighter.', damage: 13 },
    { note: 'The beam cuts a wider line.', width: 0.72 },
    { note: 'The sunlight does not stop burning.', status: { status: 'burn', power: 2, durationTicks: 60 } },
  ],
  red_thread: [
    { note: 'The thread winds thicker.', damage: 5 },
    { note: 'More of what leaves them arrives with you.', drainFrac: 0.65 },
    { note: 'The spool takes a fourth turn.', channelTicks: 64 },
  ],
  red_eclipse: [
    { note: 'The eclipse cuts deeper.', damage: 13 },
    { note: 'The red shadow falls wider.', radius: 2.6 },
    { note: 'The moon drinks deeper of what it wounds.', drainFrac: 0.45 },
  ],
  stormlash: [
    { note: 'The lash strikes harder.', damage: 10 },
    { note: 'The storm reaches farther between throats.', radius: 3.6 },
    { note: 'A fifth throat takes the lash.', chainTargets: 5 },
  ],
  void_rift: [
    { note: 'The rift bites deeper.', damage: 6 },
    { note: 'The tear in things opens wider.', radius: 2.9 },
    { note: 'The far dark pulls with real intent, and seldom closes.', knockback: -2.0, cooldownTicks: 215 },
  ],
  realm_rend: [
    { note: 'The rend cuts deeper.', damage: 16 },
    { note: 'The wound in the world opens wider.', width: 0.78 },
    { note: 'The realm remembers being torn.', status: { status: 'shock', power: 2, durationTicks: 70 } },
  ],
};
