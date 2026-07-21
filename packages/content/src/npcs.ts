import type { StatusApply, StatusId } from '@devcraft/shared';


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
  /** Loot-table ids (loot/tables.ts), each rolled at this foe's level. */
  loot: string[];
  respawnSec: number;
  /** Rendering: body color + radius in tiles. */
  color: string;
  radius: number;
  /**
   * How far the visual body extends NORTH of the ground point in
   * world-y tiles (screen height ÷ camera pitch). Projectiles test a
   * feet→crown band, not a circle at the feet — a shot that visually
   * crosses the chest or head must connect. See npcHitHeight().
   */
  hitHeight?: number;
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
  /** Livestock: what interacting yields (milking), on a per-animal cooldown. */
  produce?: { item: string; cooldownSec: number; xp: number };
  /** Livestock: lays this item on the ground every minSec–maxSec while players are near. */
  lays?: { item: string; minSec: number; maxSec: number; xp: number };
  /**
   * Death spawns these in place of a corpse (slimes divide). Children are
   * ephemeral — no spawn point, no respawn — and must not split themselves.
   */
  splitInto?: { npc: string; count: number };
  /** Melee windup ends in a leap that closes the gap (wolves, boars). */
  pounce?: boolean;
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
    loot: ['chicken'],
    respawnSec: 15,
    color: '#f4efe4',
    radius: 0.22,
    hitHeight: 0.7,
    lays: { item: 'egg', minSec: 180, maxSec: 300, xp: 4 },
  },
  {
    id: 'cow',
    name: 'Cow',
    level: 3,
    maxHp: 12,
    damage: 1,
    attackRange: 0.9,
    attackCooldownTicks: 50,
    aggroRange: 0,
    leashRange: 8,
    speed: 1.8,
    xpReward: 30,
    loot: ['cow'],
    respawnSec: 20,
    color: '#e7ddca',
    radius: 0.34,
    hitHeight: 1.4,
    produce: { item: 'milk', cooldownSec: 180, xp: 8 },
  },
  {
    id: 'bull',
    name: 'Bull',
    level: 8,
    maxHp: 26,
    damage: 2,
    attackRange: 1.0,
    attackCooldownTicks: 45,
    aggroRange: 0,
    leashRange: 8,
    speed: 2.4,
    xpReward: 55,
    loot: ['cow'],
    respawnSec: 30,
    color: '#63503f',
    radius: 0.38,
    hitHeight: 1.5,
  },
  {
    id: 'rat',
    name: 'Giant rat',
    level: 2,
    maxHp: 8,
    damage: 1,
    attackRange: 0.8,
    attackCooldownTicks: 40,
    aggroRange: 3,
    leashRange: 8,
    speed: 3.2,
    xpReward: 20,
    loot: ['rat', 'rat_wardrobe', 'rat_arms'],
    respawnSec: 15,
    color: '#8a7a6a',
    radius: 0.26,
    hitHeight: 0.6,
  },
  {
    id: 'goblin',
    name: 'Goblin',
    level: 5,
    maxHp: 14,
    damage: 1,
    attackRange: 1.0,
    attackCooldownTicks: 50,
    aggroRange: 4,
    leashRange: 12,
    speed: 3.6,
    xpReward: 50,
    loot: ['goblin', 'goblin_wardrobe', 'goblin_arms'],
    respawnSec: 25,
    color: '#5c8a3a',
    radius: 0.3,
    hitHeight: 2.0,
  },
  {
    id: 'goblin_thrower',
    name: 'Goblin thrower',
    level: 6,
    maxHp: 12,
    damage: 2,
    attackRange: 5.5,
    attackCooldownTicks: 56,
    aggroRange: 6,
    leashRange: 12,
    speed: 3.2,
    xpReward: 60,
    loot: ['goblin_thrower', 'thrower_wardrobe', 'thrower_arms'],
    respawnSec: 30,
    color: '#6a9a3a',
    radius: 0.28,
    hitHeight: 2.0,
    // Keeps its distance and lobs rocks — punishes standing still,
    // rewards closing the gap or trading at range.
    ranged: { range: 5.5, projectileSpeed: 9 },
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    level: 8,
    maxHp: 24,
    damage: 2,
    attackRange: 1.0,
    attackCooldownTicks: 42,
    aggroRange: 5,
    leashRange: 16,
    speed: 3.4,
    xpReward: 80,
    loot: ['skeleton', 'crypt_wardrobe', 'crypt_arms'],
    respawnSec: 30,
    color: '#d8d4c8',
    radius: 0.3,
    hitHeight: 2.0,
    // Dry bones: nothing to bleed, everything to burn.
    resist: ['bleed'],
    weak: ['burn'],
  },
  {
    id: 'skeleton_champion',
    name: 'Skeleton Champion',
    level: 20,
    maxHp: 80,
    damage: 5,
    attackRange: 1.2,
    attackCooldownTicks: 40,
    aggroRange: 6,
    leashRange: 20,
    speed: 3.8,
    xpReward: 400,
    loot: ['skeleton_champion', 'champion_capes', 'champion_wardrobe', 'champion_armory', 'heirlooms'],
    respawnSec: 90,
    color: '#e8e2d0',
    radius: 0.42,
    hitHeight: 2.6,
    resist: ['bleed'],
    weak: ['burn'],
    // The boss move: a telegraphed floor slam you dodge on reaction.
    special: { ability: 'ground_slam', everyTicks: 160 },
  },
  {
    id: 'mudcrab',
    name: 'Mudcrab',
    level: 2,
    maxHp: 10,
    damage: 1,
    attackRange: 0.7,
    attackCooldownTicks: 46,
    aggroRange: 0,
    leashRange: 5,
    speed: 2.2,
    xpReward: 18,
    loot: ['mudcrab'],
    respawnSec: 18,
    color: '#b06a4a',
    radius: 0.24,
    hitHeight: 0.45,
    // A shell doesn't bleed.
    resist: ['bleed'],
  },
  {
    id: 'slime',
    name: 'Slime',
    level: 4,
    maxHp: 14,
    damage: 1,
    attackRange: 0.8,
    attackCooldownTicks: 48,
    aggroRange: 0,
    leashRange: 8,
    speed: 2.6,
    xpReward: 40,
    loot: ['slime'],
    respawnSec: 25,
    color: '#6fbf4e',
    radius: 0.32,
    hitHeight: 0.6,
    // A body of ooze: nothing to cut or envenom, everything to freeze.
    resist: ['bleed', 'venom'],
    weak: ['chill'],
    splitInto: { npc: 'slime_small', count: 2 },
  },
  {
    id: 'slime_small',
    name: 'Small slime',
    level: 1,
    maxHp: 4,
    damage: 1,
    attackRange: 0.7,
    attackCooldownTicks: 44,
    // The halves come out angry — they hunt whoever broke the whole.
    aggroRange: 4,
    leashRange: 10,
    speed: 3.0,
    xpReward: 10,
    loot: ['slime_small'],
    respawnSec: 25,
    color: '#8fd46a',
    radius: 0.18,
    hitHeight: 0.35,
    resist: ['bleed', 'venom'],
    weak: ['chill'],
  },
  {
    id: 'ram',
    name: 'Wild ram',
    level: 5,
    maxHp: 16,
    damage: 2,
    attackRange: 0.9,
    attackCooldownTicks: 46,
    aggroRange: 0,
    leashRange: 8,
    speed: 3.4,
    xpReward: 45,
    loot: ['ram'],
    respawnSec: 25,
    color: '#cfc6b4',
    radius: 0.28,
    hitHeight: 1.0,
    pounce: true,
  },
  {
    id: 'stag',
    name: 'Stag',
    level: 6,
    maxHp: 18,
    damage: 2,
    attackRange: 1.0,
    attackCooldownTicks: 44,
    aggroRange: 0,
    leashRange: 10,
    speed: 4.4,
    xpReward: 50,
    loot: ['stag'],
    respawnSec: 30,
    color: '#a67c52',
    radius: 0.3,
    hitHeight: 1.5,
  },
  {
    id: 'boar',
    name: 'Boar',
    level: 7,
    maxHp: 22,
    damage: 2,
    attackRange: 0.9,
    attackCooldownTicks: 42,
    aggroRange: 0,
    leashRange: 10,
    speed: 3.8,
    xpReward: 60,
    loot: ['boar'],
    respawnSec: 28,
    color: '#5c4a3a',
    radius: 0.3,
    hitHeight: 0.9,
    pounce: true,
  },
  {
    id: 'giant_beetle',
    name: 'Giant beetle',
    level: 6,
    maxHp: 20,
    damage: 2,
    attackRange: 0.8,
    attackCooldownTicks: 50,
    aggroRange: 0,
    leashRange: 8,
    speed: 2.8,
    xpReward: 55,
    loot: ['giant_beetle'],
    respawnSec: 30,
    color: '#3d4a63',
    radius: 0.28,
    hitHeight: 0.6,
    // Chitin turns blades and stingers alike.
    resist: ['bleed', 'venom'],
  },
  {
    id: 'cave_bat',
    name: 'Cave bat',
    level: 3,
    maxHp: 8,
    damage: 1,
    attackRange: 0.8,
    attackCooldownTicks: 36,
    aggroRange: 4,
    leashRange: 12,
    speed: 4.8,
    xpReward: 25,
    loot: ['cave_bat'],
    respawnSec: 20,
    color: '#4a3d55',
    radius: 0.2,
    // Flies chest-high: shots that cross the air where it hangs connect.
    hitHeight: 1.2,
  },
  {
    id: 'adder',
    name: 'Giant adder',
    level: 9,
    maxHp: 26,
    damage: 3,
    attackRange: 1.0,
    attackCooldownTicks: 40,
    aggroRange: 3,
    leashRange: 8,
    speed: 3.6,
    xpReward: 85,
    loot: ['adder'],
    respawnSec: 32,
    color: '#7a8a4a',
    radius: 0.26,
    hitHeight: 0.5,
    attackStatus: { status: 'venom', power: 1, durationTicks: 100 },
    resist: ['venom'],
  },
  {
    id: 'giant_spider',
    name: 'Giant spider',
    level: 10,
    maxHp: 30,
    damage: 3,
    attackRange: 1.0,
    attackCooldownTicks: 38,
    aggroRange: 5,
    leashRange: 12,
    speed: 4.2,
    xpReward: 95,
    loot: ['giant_spider'],
    respawnSec: 35,
    color: '#3a3244',
    radius: 0.34,
    hitHeight: 0.7,
    attackStatus: { status: 'venom', power: 1, durationTicks: 80 },
    resist: ['venom'],
    weak: ['burn'],
    pounce: true,
  },
  {
    id: 'skeleton_archer',
    name: 'Skeleton archer',
    level: 10,
    maxHp: 22,
    damage: 3,
    attackRange: 6.5,
    attackCooldownTicks: 52,
    aggroRange: 7,
    leashRange: 16,
    speed: 3.4,
    xpReward: 100,
    loot: ['skeleton_archer', 'crypt_wardrobe', 'crypt_arms', 'heirlooms'],
    respawnSec: 32,
    color: '#cfcaba',
    radius: 0.3,
    hitHeight: 2.0,
    ranged: { range: 6.5, projectileSpeed: 11 },
    resist: ['bleed'],
    weak: ['burn'],
  },
  {
    id: 'troll',
    name: 'Hill troll',
    level: 14,
    maxHp: 55,
    damage: 4,
    attackRange: 1.2,
    attackCooldownTicks: 46,
    aggroRange: 5,
    leashRange: 14,
    speed: 3.2,
    xpReward: 180,
    loot: ['troll', 'heirlooms'],
    respawnSec: 60,
    color: '#6a7d5c',
    radius: 0.4,
    hitHeight: 2.4,
    weak: ['burn'],
    // The boss habit writ small: a slam you sidestep on reaction.
    special: { ability: 'ground_slam', everyTicks: 140 },
  },
  {
    id: 'bear',
    name: 'Black bear',
    level: 16,
    maxHp: 60,
    damage: 5,
    attackRange: 1.1,
    attackCooldownTicks: 42,
    aggroRange: 0,
    leashRange: 12,
    speed: 4.0,
    xpReward: 220,
    loot: ['bear', 'heirlooms'],
    respawnSec: 60,
    color: '#3d332a',
    radius: 0.42,
    hitHeight: 1.6,
    // Claws rake deep — provoke it and keep paying.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 50 },
    pounce: true,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    level: 12,
    maxHp: 36,
    damage: 4,
    attackRange: 1.0,
    attackCooldownTicks: 38,
    aggroRange: 6,
    leashRange: 14,
    speed: 4.6,
    xpReward: 110,
    loot: ['wolf', 'wolf_wardrobe', 'wolf_arms', 'heirlooms'],
    respawnSec: 35,
    color: '#6a6f7d',
    radius: 0.34,
    hitHeight: 1.0,
    // Wolf bites tear — running from a wolf keeps costing you.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 60 },
    pounce: true,
  },
];

export const NPCS: ReadonlyMap<string, NpcDef> = new Map(defs.map((d) => [d.id, d]));

/**
 * World-y extent of the visual body above the ground point. Projectile
 * hit tests (and the client's stuck-arrow attach) measure against the
 * feet→crown band [y − hitHeight, y], never a bare circle at the feet —
 * otherwise shots that visually cross the chest or head sail through.
 */
export function npcHitHeight(def: NpcDef): number {
  return def.hitHeight ?? Math.max(0.6, def.radius * 3);
}

/**
 * Y-distance from `y` to the nearest lip of an NPC's feet→crown band.
 * Zero while inside the band; pairs with the x-gap for the hit test.
 */
export function bandDy(y: number, npcY: number, hitHeight: number): number {
  const dyRaw = npcY - y;
  return dyRaw < 0 ? -dyRaw : Math.max(0, dyRaw - hitHeight);
}

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
  { npc: 'bull', x: 23, y: 32, radius: 3, count: 1 },
  // Rats skulk near the pond.
  { npc: 'rat', x: 86, y: 66, radius: 5, count: 3 },
  // Goblins camp south of town.
  { npc: 'goblin', x: 44, y: 110, radius: 8, count: 4 },
  { npc: 'goblin', x: 60, y: 116, radius: 8, count: 3 },
  { npc: 'goblin_thrower', x: 52, y: 113, radius: 8, count: 2 },
  // Wolves in the western woods.
  { npc: 'wolf', x: -18, y: 40, radius: 8, count: 2 },
  { npc: 'wolf', x: -24, y: 60, radius: 8, count: 2 },
  // The pond ecosystem, tiered: crabs on the bank, slimes in the
  // marsh south of it, one old adder in the reeds.
  { npc: 'mudcrab', x: 82, y: 70, radius: 5, count: 3 },
  { npc: 'slime', x: 90, y: 78, radius: 6, count: 3 },
  { npc: 'adder', x: 96, y: 64, radius: 5, count: 1 },
  // Rams graze the rocky rise north of the farms.
  { npc: 'ram', x: 11, y: 9, radius: 8, count: 2 },
  // Stags browse the wood's edge where the wolves hunt.
  { npc: 'stag', x: 0, y: 32, radius: 8, count: 2 },
  // Boars root the south woods between town and the goblin camp.
  { npc: 'boar', x: 32, y: 90, radius: 8, count: 3 },
  // Beetles trundle the dry scrub east of the goblin camp.
  { npc: 'giant_beetle', x: 76, y: 108, radius: 7, count: 2 },
  // The dark forest southwest: webs above, wings at dusk.
  { npc: 'giant_spider', x: -30, y: 82, radius: 7, count: 2 },
  { npc: 'cave_bat', x: -36, y: 68, radius: 6, count: 2 },
  // Past the wolf packs, the deep-wood threats.
  { npc: 'bear', x: -43, y: 47, radius: 6, count: 1 },
  { npc: 'troll', x: -55, y: 88, radius: 6, count: 1 },
];
