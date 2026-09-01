/**
 * THE REACHING SCHOOL — the polearm twenty and the armory’s weapon-taught secrets.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const POLEARM_DEFS: AbilityDef[] = [
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
