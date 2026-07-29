import type { StatusApply, StatusId } from '@arx/shared';


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
  /**
   * Pack tag: bodies sharing a tag hunt together. When one enters
   * combat, idle packmates within PACK_RALLY_RANGE join the same
   * target — wolves are never a duel, and the matriarch's rallying
   * howl re-gathers the pack mid-fight.
   */
  pack?: string;
  /**
   * The craven break: badly hurt, this body SOMETIMES turns and runs
   * for the nearest packmate still at rest, shouting the whole camp
   * onto you when it gets there — and sometimes it steels itself and
   * fights to the end. One decision per life. Bandits and goblins
   * scream for their fellows; the dead and the beasts never do.
   * Meaningless without a pack tag (nobody to run to).
   */
  craven?: boolean;
  /**
   * THE EYE'S ARC (degrees, full angle): how wide this body watches
   * while at rest. aggroRange is the eye's REACH; this is its shape.
   * Beasts read wide (ears and nose count), people read narrower,
   * and 360 is the unsleeping watcher nothing walks behind. Absent =
   * the shared DEFAULT_SIGHT_ARC. Sneaking past the arc's edge is
   * the whole point — approach from behind and the watcher only
   * gets its dim all-round peripheral sense.
   */
  sightArc?: number;
}

/** How far a pack answers a packmate's aggro (tiles). */
export const PACK_RALLY_RANGE = 7;

/** How far a craven body will run looking for a resting packmate (tiles). */
export const HELP_SEEK_RANGE = 12;

/**
 * THE SIZING-UP LAW: aggro range scales by how the beast reads you.
 * A wolf that outclasses a waker marks them far beyond its posted
 * range (nothing to fear, everything to eat); the same wolf gives a
 * seasoned slayer a wide berth and only bristles at close insult.
 * Ratio-based so the law self-normalizes across the ladder — five
 * levels means everything at level 5 and almost nothing at level 80.
 * Floored, never zeroed: no beast is ever perfectly safe to stand on.
 */
export function levelAggroFactor(npcLevel: number, playerLevel: number): number {
  const K = 8; // softening: keeps low-level ratios from exploding
  const f = (npcLevel + K) / (playerLevel + K);
  return Math.min(1.75, Math.max(0.35, f));
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
    leashRange: 8,
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
    leashRange: 10,
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
    leashRange: 14,
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
    sightArc: 240,
    leashRange: 16,
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
    damage: 2,
    attackRange: 1.0,
    attackCooldownTicks: 50,
    aggroRange: 4,
    sightArc: 150,
    leashRange: 24,
    speed: 3.6,
    xpReward: 50,
    loot: ['goblin', 'goblin_wardrobe', 'goblin_arms'],
    respawnSec: 25,
    color: '#5c8a3a',
    radius: 0.3,
    hitHeight: 2.0,
    // Greenskins swarm: poke one camp-squatter and the warband answers.
    pack: 'goblin',
    // And a goblin's courage lives in its numbers — bloodied, it may
    // bolt for a fellow and drag the whole squabble back with it.
    craven: true,
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
    sightArc: 150,
    leashRange: 24,
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
    // Same warband as the choppers — the rocks start flying the
    // moment any greenskin takes a hit.
    pack: 'goblin',
  },
  {
    // The wilds' first HUMAN enemies — deserters and toll-thieves who
    // haunt the roads between the hearths. They ride the player rig
    // with real gear (the loot-story law: every piece they wear
    // drops), and the pack tag makes a camp fight like a crew.
    id: 'brigand',
    name: 'Brigand',
    level: 10,
    maxHp: 26,
    damage: 2,
    attackRange: 1.05,
    attackCooldownTicks: 46,
    aggroRange: 5,
    sightArc: 160,
    leashRange: 26,
    speed: 3.6,
    xpReward: 95,
    loot: ['brigand', 'brigand_wardrobe', 'brigand_arms'],
    respawnSec: 35,
    color: '#6b4f3a',
    radius: 0.3,
    hitHeight: 2.0,
    pack: 'brigand',
    // A deserter deserts: pressed hard, he may break for the camp and
    // come back with friends — or grit his teeth and finish it.
    craven: true,
  },
  {
    id: 'brigand_archer',
    name: 'Brigand archer',
    level: 11,
    maxHp: 20,
    damage: 3,
    attackRange: 6,
    attackCooldownTicks: 54,
    aggroRange: 7,
    sightArc: 160,
    leashRange: 26,
    speed: 3.4,
    xpReward: 110,
    loot: ['brigand', 'brigand_wardrobe', 'brigand_arms'],
    respawnSec: 40,
    color: '#5d5142',
    radius: 0.28,
    hitHeight: 2.0,
    // Holds the treeline and looses — the camp's reach past its fence.
    ranged: { range: 6, projectileSpeed: 11 },
    pack: 'brigand',
  },
  {
    // The camp boss — named from the def's pool, a head taller, and
    // twice the purse. Sword and dagger both (the one-two echo).
    id: 'brigand_reaver',
    name: 'Brigand reaver',
    level: 16,
    maxHp: 48,
    damage: 4,
    attackRange: 1.1,
    attackCooldownTicks: 42,
    aggroRange: 6,
    sightArc: 160,
    leashRange: 28,
    speed: 3.7,
    xpReward: 210,
    loot: ['brigand_reaver', 'brigand_wardrobe', 'brigand_arms'],
    respawnSec: 90,
    color: '#7d3b32',
    radius: 0.32,
    hitHeight: 2.1,
    pack: 'brigand',
  },
  {
    id: 'kobold',
    name: 'Kobold',
    level: 4,
    maxHp: 10,
    damage: 2,
    attackRange: 0.95,
    attackCooldownTicks: 46,
    aggroRange: 4,
    sightArc: 150,
    leashRange: 22,
    speed: 3.5,
    xpReward: 42,
    loot: ['kobold'],
    respawnSec: 20,
    color: '#7a5a3c',
    radius: 0.26,
    hitHeight: 1.7,
    // Cold-blooded tunnel folk: a chill gets into the scales and stays.
    weak: ['chill'],
    // A lone kobold is a coward; a warren is a threat. The pack law
    // makes every quarry scuffle an ambush — yip at one, meet them all.
    pack: 'kobold',
    // Cowardice made literal: a bleeding kobold may scurry off to
    // fetch the warren rather than die alone.
    craven: true,
  },
  {
    id: 'kobold_digmaster',
    name: 'Kobold digmaster',
    level: 12,
    maxHp: 42,
    damage: 3,
    attackRange: 1.1,
    attackCooldownTicks: 52,
    aggroRange: 5,
    sightArc: 150,
    leashRange: 24,
    speed: 3.3,
    xpReward: 150,
    loot: ['kobold_digmaster', 'heirlooms'],
    respawnSec: 100,
    color: '#5c3a30',
    radius: 0.36,
    hitHeight: 2.2,
    // Years in the delve dark: bites and stings stopped mattering,
    // but the cold never did.
    resist: ['venom'],
    weak: ['chill'],
    // Shares the warren's pack tag — pull the boss, raise the dig.
    pack: 'kobold',
    // The iron pick comes down on the quarry floor — the same slam
    // school as the troll, telegraphed and sidesteppable.
    special: { ability: 'ground_slam', everyTicks: 150 },
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
    sightArc: 120,
    leashRange: 30,
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
    id: 'skeleton_guard',
    name: 'Skeleton Guard',
    level: 13,
    maxHp: 46,
    damage: 3,
    attackRange: 1.1,
    // Slow, deliberate blows behind a raised shield — the wall, not
    // the sword, is the threat.
    attackCooldownTicks: 50,
    aggroRange: 5,
    sightArc: 120,
    leashRange: 24,
    speed: 2.9,
    xpReward: 170,
    loot: ['skeleton_guard', 'crypt_wardrobe', 'crypt_arms'],
    respawnSec: 40,
    color: '#c9c2ae',
    radius: 0.32,
    hitHeight: 2.1,
    // Dry bones under old iron: nothing to bleed, nothing to chill.
    resist: ['bleed', 'chill'],
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
    sightArc: 360,
    leashRange: 36,
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
    sightArc: 300,
    leashRange: 8,
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
    damage: 2,
    attackRange: 0.8,
    attackCooldownTicks: 48,
    aggroRange: 0,
    sightArc: 360,
    leashRange: 14,
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
    sightArc: 360,
    leashRange: 20,
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
    leashRange: 14,
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
    leashRange: 12,
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
    sightArc: 240,
    leashRange: 18,
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
    sightArc: 300,
    leashRange: 14,
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
    sightArc: 360,
    leashRange: 22,
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
    sightArc: 200,
    leashRange: 16,
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
    sightArc: 360,
    leashRange: 24,
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
    sightArc: 120,
    leashRange: 30,
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
    sightArc: 100,
    leashRange: 28,
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
    sightArc: 240,
    leashRange: 24,
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
    sightArc: 240,
    leashRange: 28,
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
    pack: 'wolfkin',
  },
  {
    id: 'worg',
    name: 'Worg',
    level: 14,
    maxHp: 46,
    damage: 4,
    attackRange: 1.0,
    attackCooldownTicks: 36,
    // Cunning hunter: it marks you further out than anything its size.
    aggroRange: 7,
    sightArc: 240,
    leashRange: 32,
    // The fastest pursuit in the wilds — you do not outrun a worg.
    speed: 5.0,
    xpReward: 170,
    loot: ['worg', 'wolf_arms', 'heirlooms'],
    respawnSec: 45,
    color: '#6b5f47',
    radius: 0.37,
    hitHeight: 1.1,
    // The hamstring bite: it doesn't want you dead yet, it wants you
    // SLOW — then the bonded mate arrives.
    attackStatus: { status: 'chill', power: 1, durationTicks: 60 },
    pounce: true,
    pack: 'worg',
  },
  {
    id: 'dire_wolf',
    name: 'Dire wolf',
    level: 20,
    maxHp: 95,
    damage: 6,
    attackRange: 1.1,
    // She presses faster than her pack — the matriarch sets the tempo.
    attackCooldownTicks: 34,
    aggroRange: 7,
    sightArc: 240,
    // A roaming matriarch ranges wide of any one den.
    leashRange: 36,
    speed: 4.8,
    xpReward: 340,
    loot: ['dire_wolf', 'wolf_wardrobe', 'wolf_arms', 'heirlooms'],
    respawnSec: 90,
    color: '#4b4854',
    radius: 0.44,
    hitHeight: 1.4,
    // Matriarch jaws tear twice as deep.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 70 },
    pounce: true,
    pack: 'wolfkin',
    // The howl: dread shoves you off her, and every wolf in earshot
    // answers — the champion fight is the PACK, not the duel.
    special: { ability: 'rallying_howl', everyTicks: 150 },
  },
];

export const NPCS: ReadonlyMap<string, NpcDef> = new Map(defs.map((d) => [d.id, d]));

/** The authored bestiary exactly as shipped — the CMS revert target. */
export const AUTHORED_NPCS: ReadonlyMap<string, NpcDef> = new Map(defs.map((d) => [d.id, d]));

/**
 * THE CMS HOOK: repopulate the live bestiary in place. Every runtime
 * consumer resolves through NPCS.get() at call time, so future spawns
 * and respawns read the new truth immediately; bodies already standing
 * keep their captured def until they respawn (the server despawns the
 * edited kind to hurry that along). Content-as-code remains the seed —
 * this only ever runs against validated DB-loaded docs.
 */
export function replaceNpcDefs(next: Iterable<NpcDef>): void {
  const map = NPCS as Map<string, NpcDef>;
  map.clear();
  for (const d of next) map.set(d.id, d);
}

/**
 * JSON-shape validator for a bestiary doc — the DB-first gate. Field
 * errors name the field; reference checks (loot tables, split
 * children) run against the caller-provided id sets so a whole
 * candidate registry can validate as one world.
 */
export function validateNpcDef(
  doc: unknown,
  refs: { lootTables: ReadonlySet<string>; npcIds: ReadonlySet<string> },
): string[] {
  const errors: string[] = [];
  if (typeof doc !== 'object' || doc === null) return ['doc is not an object'];
  const d = doc as Record<string, unknown>;
  const need = (field: string, type: 'string' | 'number'): void => {
    if (typeof d[field] !== type) errors.push(`${field} must be a ${type}`);
  };
  need('id', 'string');
  need('name', 'string');
  need('color', 'string');
  for (const f of [
    'level', 'maxHp', 'damage', 'attackRange', 'attackCooldownTicks', 'aggroRange',
    'leashRange', 'speed', 'xpReward', 'respawnSec', 'radius',
  ]) {
    need(f, 'number');
    if (typeof d[f] === 'number' && (!Number.isFinite(d[f] as number) || (d[f] as number) < 0)) {
      errors.push(`${f} must be a non-negative number`);
    }
  }
  if (typeof d.id === 'string' && !/^[a-z][a-z0-9_]*$/.test(d.id)) {
    errors.push('id must be lowercase [a-z0-9_]');
  }
  if (!Array.isArray(d.loot)) {
    errors.push('loot must be an array of loot-table ids');
  } else {
    for (const t of d.loot) {
      if (typeof t !== 'string' || !refs.lootTables.has(t)) {
        errors.push(`loot table '${String(t)}' does not exist`);
      }
    }
  }
  if (d.hitHeight !== undefined && typeof d.hitHeight !== 'number') {
    errors.push('hitHeight must be a number');
  }
  if (d.special !== undefined) {
    const s = d.special as Record<string, unknown>;
    if (typeof s?.ability !== 'string' || typeof s?.everyTicks !== 'number') {
      errors.push('special needs {ability: string, everyTicks: number}');
    }
  }
  if (d.ranged !== undefined) {
    const r = d.ranged as Record<string, unknown>;
    if (typeof r?.range !== 'number' || typeof r?.projectileSpeed !== 'number') {
      errors.push('ranged needs {range: number, projectileSpeed: number}');
    }
  }
  if (d.splitInto !== undefined) {
    const s = d.splitInto as Record<string, unknown>;
    if (typeof s?.npc !== 'string' || !refs.npcIds.has(s.npc as string)) {
      errors.push(`splitInto.npc '${String((s as { npc?: unknown })?.npc)}' does not exist`);
    }
    if (typeof s?.count !== 'number' || (s.count as number) < 1) {
      errors.push('splitInto.count must be ≥ 1');
    }
  }
  if (d.produce !== undefined) {
    const p = d.produce as Record<string, unknown>;
    if (typeof p?.item !== 'string' || typeof p?.cooldownSec !== 'number' || typeof p?.xp !== 'number') {
      errors.push('produce needs {item, cooldownSec, xp}');
    }
  }
  if (d.lays !== undefined) {
    const p = d.lays as Record<string, unknown>;
    if (typeof p?.item !== 'string' || typeof p?.minSec !== 'number' || typeof p?.maxSec !== 'number') {
      errors.push('lays needs {item, minSec, maxSec, xp}');
    }
  }
  for (const f of ['pounce', 'craven'] as const) {
    if (d[f] !== undefined && typeof d[f] !== 'boolean') errors.push(`${f} must be a boolean`);
  }
  if (d.pack !== undefined && typeof d.pack !== 'string') errors.push('pack must be a string');
  if (
    d.sightArc !== undefined &&
    (typeof d.sightArc !== 'number' || d.sightArc < 30 || d.sightArc > 360)
  ) {
    errors.push('sightArc must be a number in [30, 360] degrees');
  }
  return errors;
}

/**
 * ONE BESTIARY, EVERY TIER — scale a def to a target combat level.
 * Dungeon garrisons are the authored beasts re-issued at the key's
 * power: hp grows a touch superlinearly (fights lengthen with the
 * ladder), xp tracks level honestly. The damage DIE drifts only
 * gently (^0.5) — under THE THREAT LAW the level itself already
 * multiplies every strike (shared/sim/damage.ts npcMaxHit), so a
 * steeper die here would compound into one-shot territory; a
 * level-68 skeleton bites hard, it doesn't delete. Everything else —
 * speed, reach, specials, resists, art — is the def's own; a scaled
 * troll still fights like a troll. Loot rolls read the SCALED level,
 * so deep dungeon beasts pay out deep-level loot by construction.
 */
export function scaleNpcDef(def: NpcDef, level: number, name?: string): NpcDef {
  if (level === def.level && !name) return def;
  const ratio = level / Math.max(1, def.level);
  return {
    ...def,
    name: name ?? def.name,
    level,
    maxHp: Math.max(1, Math.round(def.maxHp * Math.pow(ratio, 1.12))),
    damage: def.damage > 0 ? Math.max(1, Math.round(def.damage * Math.pow(ratio, 0.5))) : 0,
    xpReward: Math.max(1, Math.round(def.xpReward * Math.pow(ratio, 1.05))),
  };
}

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

/**
 * Livestock and critters: kept animals (they produce or lay — the
 * stolen cows in a brigand pen) and creatures that can neither hurt
 * nor aggro. They never spring traps and never count as a POI
 * garrison keeper — a warded chest opens over a cow's objection. A
 * bear (real damage, provoked-only) is NOT livestock: it fights.
 */
export function npcLivestock(
  def: Pick<NpcDef, 'damage' | 'aggroRange' | 'produce' | 'lays'>,
): boolean {
  if (def.produce !== undefined || def.lays !== undefined) return true;
  return def.damage <= 0 && def.aggroRange === 0;
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

/**
 * Fixed spawn points ringing Dawnmead, the starter village — the ONLY
 * authored wilderness left. Everything farther out belongs to the
 * procedural frontier (the danger field, POIs, and the wild roster).
 * THE CORRIDOR LAW: the village core and the east lane (y ~40-60 out
 * to the hedgerows) stay predator-free — new spawns keep clear.
 */
export const TOWN_SPAWNS: readonly SpawnPoint[] = [
  // The wolfkin dens in the north-western woods, past the orchard rim
  // — far enough that only a waker who goes LOOKING for trouble finds
  // the matriarch roaming between her packs.
  { npc: 'wolf', x: -24, y: -4, radius: 6, count: 2 },
  { npc: 'wolf', x: -40, y: 2, radius: 6, count: 2 },
  { npc: 'dire_wolf', x: -32, y: -1, radius: 8, count: 1 },
  // The Gloamwood — the dark forest south of the brook meadow: webs
  // above, wings at dusk, and the old threats deeper in.
  { npc: 'giant_spider', x: -30, y: 96, radius: 7, count: 2 },
  { npc: 'cave_bat', x: -36, y: 88, radius: 6, count: 2 },
  { npc: 'bear', x: -48, y: 100, radius: 6, count: 1 },
  { npc: 'troll', x: -55, y: 108, radius: 6, count: 1 },
  // Gentle life on the village's shoulders: stags browse the east
  // meadow along the lane, rams keep the rocky rise out west.
  { npc: 'stag', x: 12, y: 40, radius: 7, count: 2 },
  { npc: 'ram', x: -112, y: 28, radius: 7, count: 2 },
];
