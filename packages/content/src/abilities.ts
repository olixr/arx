import type { AbilityDef, TechniqueDef } from '@devcraft/shared';

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
];

export const ABILITIES: ReadonlyMap<string, AbilityDef> = new Map(defs.map((d) => [d.id, d]));

export function abilityDef(id: string): AbilityDef | undefined {
  return ABILITIES.get(id);
}

/**
 * The technique ladder: which abilities each combat style unlocks and
 * when. Swapping among unlocked techniques is always free.
 */
export const TECHNIQUES: readonly TechniqueDef[] = [
  { ability: 'heavy_slam', style: 'melee', unlockLevel: 5 },
  { ability: 'whirlwind', style: 'melee', unlockLevel: 15 },
  { ability: 'bloodlust', style: 'melee', unlockLevel: 30 },
  { ability: 'tumble_shot', style: 'archery', unlockLevel: 5 },
  { ability: 'rain_of_arrows', style: 'archery', unlockLevel: 15 },
  { ability: 'twin_strike', style: 'archery', unlockLevel: 30 },
  { ability: 'arc_bolt', style: 'magic', unlockLevel: 5 },
  { ability: 'blink', style: 'magic', unlockLevel: 15 },
  { ability: 'meteor_shard', style: 'magic', unlockLevel: 30 },
];

export function techniquesFor(style: string): TechniqueDef[] {
  return TECHNIQUES.filter((t) => t.style === style);
}

export function techniqueDef(ability: string): TechniqueDef | undefined {
  return TECHNIQUES.find((t) => t.ability === ability);
}
