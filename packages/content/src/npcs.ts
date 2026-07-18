import type { StatusApply, StatusId } from '@devcraft/shared';

/** Loot: each entry rolls independently; qty is [min, max]. */
export interface LootEntry {
  item: string;
  qty: [number, number];
  chance: number;
}

/** A telegraphed special attack, run through the ability interpreter. */
export interface NpcSpecial {
  /** AbilityDef id (content/abilities.ts). */
  ability: string;
  /** Minimum ticks between uses (the NPC also needs a target in range). */
  everyTicks: number;
}

/** Thrown/shot basic attack instead of a melee lunge. */
export interface NpcRanged {
  range: number;
  projectileSpeed: number;
}

export interface NpcDef {
  id: string;
  name: string;
  /** Displayed combat level. */
  level: number;
  maxHp: number;
  /** Max hit per attack. */
  damage: number;
  /** Attack reach in tiles. */
  attackRange: number;
  attackCooldownTicks: number;
  /** 0 = passive (never initiates). */
  aggroRange: number;
  /** Gives up beyond this distance from its spawn point. */
  leashRange: number;
  speed: number;
  /** Split across combat skills on kill. */
  xpReward: number;
  loot: LootEntry[];
  respawnSec: number;
  /** Rendering: body color + radius in tiles. */
  color: string;
  radius: number;
  /** Telegraphed special attack for higher-tier threats. */
  special?: NpcSpecial;
  /** Basic attacks are projectiles with this flight profile. */
  ranged?: NpcRanged;
  /** Status carried by this NPC's basic attacks (wolves make you bleed). */
  attackStatus?: StatusApply;
  /** Statuses this NPC shrugs off entirely. */
  resist?: readonly StatusId[];
  /** Statuses that hit this NPC twice as hard. */
  weak?: readonly StatusId[];
}

const defs: NpcDef[] = [
  {
    id: 'chicken',
    name: 'Chicken',
    level: 1,
    maxHp: 3,
    damage: 0,
    attackRange: 0.8,
    attackCooldownTicks: 40,
    aggroRange: 0,
    leashRange: 6,
    speed: 2,
    xpReward: 12,
    loot: [
      { item: 'raw_chicken', qty: [1, 1], chance: 1 },
      { item: 'feather', qty: [3, 8], chance: 1 },
      { item: 'bones', qty: [1, 1], chance: 1 },
    ],
    respawnSec: 15,
    color: '#f4efe4',
    radius: 0.22,
  },
  {
    id: 'cow',
    name: 'Cow',
    level: 3,
    maxHp: 8,
    damage: 1,
    attackRange: 0.9,
    attackCooldownTicks: 50,
    aggroRange: 0,
    leashRange: 8,
    speed: 1.8,
    xpReward: 30,
    loot: [
      { item: 'raw_beef', qty: [1, 1], chance: 1 },
      { item: 'cowhide', qty: [1, 1], chance: 1 },
      { item: 'bones', qty: [1, 1], chance: 1 },
    ],
    respawnSec: 20,
    color: '#c9b8a8',
    radius: 0.34,
  },
  {
    id: 'rat',
    name: 'Giant rat',
    level: 2,
    maxHp: 5,
    damage: 1,
    attackRange: 0.8,
    attackCooldownTicks: 40,
    aggroRange: 3,
    leashRange: 8,
    speed: 3.2,
    xpReward: 20,
    loot: [{ item: 'bones', qty: [1, 1], chance: 1 }],
    respawnSec: 15,
    color: '#8a7a6a',
    radius: 0.26,
  },
  {
    id: 'goblin',
    name: 'Goblin',
    level: 5,
    maxHp: 8,
    damage: 1,
    attackRange: 1.0,
    attackCooldownTicks: 50,
    aggroRange: 4,
    leashRange: 12,
    speed: 3.6,
    xpReward: 50,
    loot: [
      { item: 'bones', qty: [1, 1], chance: 1 },
      { item: 'coins', qty: [3, 18], chance: 0.8 },
      { item: 'bronze_sword', qty: [1, 1], chance: 0.08 },
      { item: 'arrow', qty: [4, 12], chance: 0.25 },
      { item: 'snare_kit', qty: [1, 1], chance: 0.04 },
    ],
    respawnSec: 25,
    color: '#5c8a3a',
    radius: 0.3,
  },
  {
    id: 'goblin_thrower',
    name: 'Goblin thrower',
    level: 6,
    maxHp: 7,
    damage: 2,
    attackRange: 5.5,
    attackCooldownTicks: 56,
    aggroRange: 6,
    leashRange: 12,
    speed: 3.2,
    xpReward: 60,
    loot: [
      { item: 'bones', qty: [1, 1], chance: 1 },
      { item: 'coins', qty: [4, 20], chance: 0.8 },
      { item: 'arrow', qty: [6, 14], chance: 0.5 },
      { item: 'straw_decoy', qty: [1, 1], chance: 0.05 },
    ],
    respawnSec: 30,
    color: '#6a9a3a',
    radius: 0.28,
    // Keeps its distance and lobs rocks — punishes standing still,
    // rewards closing the gap or trading at range.
    ranged: { range: 5.5, projectileSpeed: 9 },
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    level: 8,
    maxHp: 14,
    damage: 2,
    attackRange: 1.0,
    attackCooldownTicks: 42,
    aggroRange: 5,
    leashRange: 16,
    speed: 3.4,
    xpReward: 80,
    loot: [
      { item: 'bones', qty: [1, 2], chance: 1 },
      { item: 'coins', qty: [5, 25], chance: 0.7 },
      { item: 'iron_ore', qty: [1, 1], chance: 0.15 },
      { item: 'ember_charm', qty: [1, 1], chance: 0.03 },
    ],
    respawnSec: 30,
    color: '#d8d4c8',
    radius: 0.3,
    // Dry bones: nothing to bleed, everything to burn.
    resist: ['bleed'],
    weak: ['burn'],
  },
  {
    id: 'skeleton_champion',
    name: 'Skeleton Champion',
    level: 20,
    maxHp: 45,
    damage: 5,
    attackRange: 1.2,
    attackCooldownTicks: 40,
    aggroRange: 6,
    leashRange: 20,
    speed: 3.8,
    xpReward: 400,
    loot: [
      { item: 'bones', qty: [2, 4], chance: 1 },
      { item: 'coins', qty: [40, 120], chance: 1 },
      { item: 'iron_sword', qty: [1, 1], chance: 0.4 },
      { item: 'iron_bar', qty: [1, 2], chance: 0.5 },
      { item: 'storm_bell', qty: [1, 1], chance: 0.12 },
      { item: 'ember_staff', qty: [1, 1], chance: 0.1 },
      { item: 'willow_longbow', qty: [1, 1], chance: 0.1 },
      { item: 'sigil_fallen_champion', qty: [1, 1], chance: 0.25 },
      { item: 'tome_of_embers', qty: [1, 1], chance: 0.15 },
    ],
    respawnSec: 90,
    color: '#e8e2d0',
    radius: 0.42,
    resist: ['bleed'],
    weak: ['burn'],
    // The boss move: a telegraphed floor slam you dodge on reaction.
    special: { ability: 'ground_slam', everyTicks: 160 },
  },
  {
    id: 'wolf',
    name: 'Wolf',
    level: 12,
    maxHp: 22,
    damage: 4,
    attackRange: 1.0,
    attackCooldownTicks: 38,
    aggroRange: 6,
    leashRange: 14,
    speed: 4.6,
    xpReward: 110,
    loot: [
      { item: 'bones', qty: [1, 1], chance: 1 },
      { item: 'wolf_fur', qty: [1, 1], chance: 0.9 },
      { item: 'verdant_totem', qty: [1, 1], chance: 0.05 },
    ],
    respawnSec: 35,
    color: '#6a6f7d',
    radius: 0.34,
    // Wolf bites tear — running from a wolf keeps costing you.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 60 },
  },
];

export const NPCS: ReadonlyMap<string, NpcDef> = new Map(defs.map((d) => [d.id, d]));

export function npcDef(id: string): NpcDef | undefined {
  return NPCS.get(id);
}

/** Fixed spawn points around the starter town. */
export interface SpawnPoint {
  npc: string;
  x: number;
  y: number;
  /** Wander/respawn scatter radius. */
  radius: number;
  count: number;
}

export const TOWN_SPAWNS: readonly SpawnPoint[] = [
  // The farm pen holds livestock.
  { npc: 'chicken', x: 20, y: 28, radius: 4, count: 3 },
  { npc: 'cow', x: 20, y: 30, radius: 4, count: 2 },
  // Rats skulk near the pond.
  { npc: 'rat', x: 86, y: 66, radius: 5, count: 3 },
  // Goblins camp south of town.
  { npc: 'goblin', x: 44, y: 110, radius: 8, count: 4 },
  { npc: 'goblin', x: 60, y: 116, radius: 8, count: 3 },
  { npc: 'goblin_thrower', x: 52, y: 113, radius: 8, count: 2 },
  // Wolves in the western woods.
  { npc: 'wolf', x: -18, y: 40, radius: 8, count: 2 },
  { npc: 'wolf', x: -24, y: 60, radius: 8, count: 2 },
];
