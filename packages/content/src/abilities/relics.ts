/**
 * THE RELIC ACTIVES — fight-shaping trinket workings.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const RELIC_DEFS: AbilityDef[] = [
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
];
