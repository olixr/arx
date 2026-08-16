import { STATUS_IDS, type StatusApply, type StatusId } from '@arx/shared';
import { DAMAGE_LANES, NPC_LANES, type NpcLanes } from './npcLanes.js';


/**
 * THE KIT (docs/enemy-arts-plan.md) — one authored voice in a foe's
 * repertoire, run through the one ability interpreter with fromNpc.
 * Pacing lives HERE, never on the AbilityDef (standing law: NPC
 * abilities author cooldownTicks 0). A windup makes it a true cast:
 * the body plants, the conjure shows, and the fire waits — the
 * interrupt window and the shape's own fuse are two honest clocks
 * in series. Damage above the def's basic die must buy its premium
 * with warning time (THE TELEGRAPH PREMIUM, contract-tested).
 */
export interface NpcKitEntry {
  /** AbilityDef id (content/abilities.ts); shape must be NPC-safe. */
  ability: string;
  /** Ticks between uses, paid when the cast FIRES. */
  cooldownTicks: number;
  /** The drawn breath: planted wind-up ticks before the fire. 0/absent = instant. */
  windupTicks?: number;
  /** Eligibility band vs target distance (absent = any). */
  minRange?: number;
  maxRange?: number;
  /** HP-fraction gates (0..1): enrages and desperation casts. */
  hpBelow?: number;
  hpAbove?: number;
  /** Selection weight among eligible entries (default 1). */
  weight?: number;
  /** Cooldown seeded at spawn; default min(cooldownTicks, 60) — never open with the special. */
  initialCooldownTicks?: number;
  /**
   * Where a ground shape stakes its point at fire: the quarry's feet
   * ('target', default), the caster itself ('self'), or the quarry's
   * projected stride ('lead') — the orbit-breaker, capped and
   * walkability-checked server-side.
   */
  aim?: 'target' | 'self' | 'lead';
  /** Entry wakes only at def level >= this — scaled reissues learn new voices at depth. */
  minLevel?: number;
  /** Fire also rallies the pack (bounded), the old howl behavior — authored, not implied. */
  rally?: boolean;
  /**
   * THE LOPE (docs/boss-system-plan.md, the wolf crown): this voice is
   * spoken FROM DISTANCE — picked in close, the body breaks away at a
   * sprint and opens the gap to `minRange` before the wind begins
   * (cornered at a wall or timed out, the word is spoken where it
   * stands). minRange is the DESTINATION, not an eligibility gate, so
   * a lope entry stays pickable at any closer range. Requires
   * minRange > 0. The hit-and-run verb: harry, break, call, return.
   */
  lope?: boolean;
  /**
   * THE DREAD CROWN (docs/boss-system-plan.md): entry wakes at this
   * boss phase and after (0-based; absent = 0, the opening stance).
   * Only meaningful on a def that wears a `boss` block.
   */
  phase?: number;
  /** ...and retires after this phase — an early voice the crown outgrows. */
  phaseMax?: number;
  /**
   * THE CHAIN: after this entry fires, the kit entry carrying the
   * named ability is queued next — cooldown waived, its OWN windup
   * still telegraphs (every link in a combo is honest). Chains are
   * acyclic and cap at 3 links, validator-enforced. Boss-only.
   */
  then?: string;
}

/** Thrown/shot basic attack instead of a melee lunge. */
export interface NpcRanged {
  range: number;
  projectileSpeed: number;
}

/**
 * THE DREAD CROWN — one rung of a boss's phase ladder
 * (docs/boss-system-plan.md LAW 3, THE TURNING). The ladder is
 * one-way: healing never demotes, and a full leash reset is the only
 * road back to the opening stance.
 */
export interface BossPhaseDef {
  /**
   * The fight turns when the live HP fraction crosses under this.
   * Absent only on the first rung (the opening stance); later rungs
   * author strictly descending fractions in (0, 1).
   */
  hpBelow?: number;
  /** "The Breaking" — the client's phase reveal line. */
  name?: string;
  /** Said aloud on entry (sayAloud: log + bubble — the public voice). */
  bark?: string;
  /**
   * Ability cast FREE on phase entry (cooldown waived). Must name an
   * ability carried by one of this def's own kit entries — the turn
   * fires through the one cast engine, and the entry's own windup
   * still telegraphs it. The phase turn is loud, never cheap.
   */
  entry?: string;
  /**
   * Kit cooldown scale while this phase holds (0.5..1) — the fight
   * accelerates honestly: same voices, drawn breath, shorter rests.
   */
  cdMult?: number;
  /** Movement scale while this phase holds (0.75..1.5). */
  speedMult?: number;
}

/**
 * THE DREAD CROWN (docs/boss-system-plan.md): the boss block. A LAYER
 * on the kit rail, never a second brain — remove it and the def
 * degrades to a lawful champion. Phases gate kit entries, chains give
 * authored combo beats, the CC dials end stun-locks and knockback
 * juggling without silencing statuses, and the arena law walks a
 * cheesed boss home to a full heal and a reset crown.
 */
export interface NpcBossDef {
  /** "Warden of the Sunken Court" — the nameplate's second line. */
  title?: string;
  /** 1..4 rungs; the first is the opening stance (no hpBelow). */
  phases: BossPhaseDef[];
  /**
   * Scales every knockback landed on this body (0 = immovable,
   * 1 = ordinary flesh). Default 0.25 — a crowned foe is shoved a
   * step, not juggled. Above 1 is an authored WEAKNESS.
   */
  knockbackMult?: number;
  /**
   * Scales shock's hard-stagger ticks (0 = immune, 1 = ordinary).
   * Default 0.5. The status itself still LANDS and still fuels
   * reactions — only the hard control is dialed.
   */
  stunMult?: number;
  /** Leash override in tiles; the break walks home, heals, resets the crown. */
  arenaR?: number;
  /** Said aloud the moment the fight truly opens. */
  engageBark?: string;
  /** Last words, said at the kill. */
  defeatBark?: string;
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
  /** THE KIT: authored abilities on their own cooldowns (docs/enemy-arts-plan.md). */
  kit?: NpcKitEntry[];
  /**
   * THE STANDOFF CASTER: preferred fighting distance in tiles — in a
   * chase the body backs away inside it and plants at it, letting the
   * ranged basic and the kit speak (the thrower's kiting, generalized
   * and authored). Melee-caster hybrids simply omit it. A standoff
   * body should always carry a ranged basic or a short-cooldown kit
   * voice, or its cooldown gaps leave it inert at range.
   */
  standoff?: number;
  /** Basic attacks are projectiles with this flight profile. */
  ranged?: NpcRanged;
  /** Status carried by this NPC's basic attacks (wolves make you bleed). */
  attackStatus?: StatusApply;
  /** Statuses this NPC shrugs off entirely. */
  resist?: readonly StatusId[];
  /** Statuses that hit this NPC twice as hard. */
  weak?: readonly StatusId[];
  /**
   * THE MARKED WORLD: combat-lane temperament (npcLanes.ts registry,
   * merged at the map build). Categorical — a lane is turned or
   * bitten at one game-wide pair of multipliers, folded at the one
   * damage seam and taught in play by the floating word.
   */
  lanes?: NpcLanes;
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
  /**
   * THE DREAD CROWN (docs/boss-system-plan.md): phases, chains, CC
   * dials, arena law, and the spoken fight. Requires a kit — a boss
   * with no voices is a contradiction the validator refuses.
   */
  boss?: NpcBossDef;
}

/** Bosses may carry more voices than trash — phase gates keep each moment's hand small. */
export const BOSS_KIT_MAX = 10;
/** A crowned foe is shoved a step, not juggled (default knockback scale). */
export const BOSS_KNOCKBACK_MULT = 0.25;
/** ...and staggered a beat, not stun-chained (default shock-stagger scale). */
export const BOSS_STUN_MULT = 0.5;

/** How far a pack answers a packmate's aggro (tiles). */
export const PACK_RALLY_RANGE = 7;

/**
 * THE OOZE FAMILY (docs/ooze-family-plan.md): the formless, as one
 * set. One membership answer for every reader — the tame refusal, the
 * client's legless routing, the no-corpse law. Ids, not a prefix: the
 * family outgrew 'slime*' the day the grays and puddings arrived.
 */
export const OOZE_IDS: ReadonlySet<string> = new Set([
  'slime',
  'slime_small',
  'giant_slime',
  'gray_ooze',
  'frost_slime',
  'tar_slime',
  'gelatinous_cube',
]);

export function isOozeId(id: string): boolean {
  return OOZE_IDS.has(id);
}

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
    loot: ['bull'],
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
    // THE FIRST TRUE CASTER (enemy arts): the first wound-up spell a
    // new waker ever eats — deliberately near the roads, deliberately
    // small. Teaches all three reads at once: the pip, the gather,
    // and the staked ring under your running feet.
    id: 'goblin_firecaller',
    name: 'Goblin firecaller',
    level: 7,
    maxHp: 18,
    damage: 2,
    attackRange: 7,
    attackCooldownTicks: 54,
    aggroRange: 6,
    sightArc: 150,
    leashRange: 24,
    speed: 3.2,
    xpReward: 70,
    loot: ['goblin', 'heirlooms', 'firecaller_word'],
    respawnSec: 40,
    color: '#c96a2e',
    radius: 0.28,
    hitHeight: 2.0,
    // Ember spit: the weak ranged basic that fills the cooldown gaps.
    ranged: { range: 7, projectileSpeed: 10 },
    // Camp-fire in its hands, camp loyalty in its legs.
    pack: 'goblin',
    // THE STANDOFF CASTER: holds its distance and lets the kit speak.
    standoff: 5.5,
    kit: [
      { ability: 'goblin_firebolt', cooldownTicks: 110, windupTicks: 14, minRange: 1.5, maxRange: 8 },
      // 'lead': the ring lands where you are GOING — the orbit-breaker.
      { ability: 'cinder_ring', cooldownTicks: 200, windupTicks: 12, maxRange: 7, aim: 'lead' },
    ],
  },
  {
    // The firecaller's uglier cousin, in the warcamp bands: green
    // bile in ropes and a haze you learn not to stand in.
    id: 'goblin_gloomcaller',
    name: 'Goblin gloomcaller',
    level: 14,
    maxHp: 40,
    damage: 3,
    attackRange: 7,
    attackCooldownTicks: 52,
    aggroRange: 6,
    sightArc: 150,
    leashRange: 26,
    speed: 3.2,
    xpReward: 160,
    loot: ['goblin', 'heirlooms', 'gloom_regalia'],
    respawnSec: 60,
    color: '#5f7d3a',
    radius: 0.3,
    hitHeight: 2.0,
    ranged: { range: 7, projectileSpeed: 10 },
    // Its own bile never troubles it; fire finds the oils fast.
    resist: ['venom'],
    weak: ['burn'],
    pack: 'goblin',
    standoff: 5.5,
    kit: [
      { ability: 'gloom_spittle', cooldownTicks: 120, windupTicks: 12, minRange: 1.5, maxRange: 8 },
      { ability: 'miasma_ring', cooldownTicks: 260, windupTicks: 16, maxRange: 7, aim: 'lead' },
    ],
  },
  {
    // THE WARBOSS: the one goblin the others stand behind — the
    // war-hold's named heart and the stronghold court's crown.
    // Tusked, scarred, and better armored than any greenskin has a
    // right to be. The fight is the CAMP: the pack tag brings the
    // whole warband, and the slam clears the room it rallies into.
    id: 'goblin_champion',
    name: 'Goblin warboss',
    level: 15,
    maxHp: 70,
    damage: 4,
    attackRange: 1.15,
    attackCooldownTicks: 42,
    aggroRange: 7,
    sightArc: 240,
    leashRange: 30,
    speed: 3.9,
    xpReward: 250,
    loot: ['goblin_champion', 'goblin_arms', 'heirlooms'],
    respawnSec: 90,
    color: '#4e7a38',
    radius: 0.4,
    hitHeight: 2.2,
    // Tusk gore: the wound keeps arguing after the hit lands.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 60 },
    pack: 'goblin',
    kit: [{ ability: 'ground_slam', cooldownTicks: 170, maxRange: 4.5, weight: 2 }],
  },
  {
    // THE ASHEN TYRANT (docs/boss-system-plan.md, the second crown):
    // the stronghold court's caster-king. A standoff summoner whose
    // adds are the CAMP ITSELF — the cinder ring carries the rally,
    // so every staked burn calls another bounded wave of the warband.
    // Authored WEAKNESS: ordinary flesh to the stun (stunMult 1) —
    // the interrupt school's payday; the arc-line breaks this fight
    // open where it merely dents the king's. goblin_ prefix = the
    // greenskin painter dispatch; fire and gloom are goblin words
    // (the firecaller and gloomcaller taught both).
    id: 'goblin_flame_tyrant',
    name: 'Goblin flame-tyrant',
    level: 24,
    maxHp: 150,
    damage: 4,
    attackRange: 7,
    attackCooldownTicks: 48,
    aggroRange: 7,
    sightArc: 240,
    leashRange: 30,
    speed: 3.4,
    xpReward: 620,
    loot: ['goblin_champion', 'goblin_arms', 'champion_armory', 'heirlooms'],
    respawnSec: 90,
    color: '#d1541f',
    radius: 0.38,
    hitHeight: 2.2,
    ranged: { range: 7, projectileSpeed: 10 },
    resist: ['burn'],
    weak: ['chill'],
    pack: 'goblin',
    standoff: 5.5,
    kit: [
      // The chase beat: the ring stakes where you are GOING, and the
      // bolt follows you out of it — leaving is right, and it costs.
      { ability: 'goblin_firebolt', cooldownTicks: 100, windupTicks: 14, minRange: 1.5, maxRange: 8, weight: 2 },
      { ability: 'cinder_ring', cooldownTicks: 190, windupTicks: 12, maxRange: 7, aim: 'lead', rally: true, then: 'goblin_firebolt' },
      { ability: 'miasma_ring', cooldownTicks: 260, windupTicks: 16, maxRange: 7, aim: 'lead', phase: 1 },
    ],
    boss: {
      title: 'Tyrant of the Burning Court',
      phases: [
        { name: 'The Holding Word' },
        {
          hpBelow: 0.6,
          name: 'The Camp Answers',
          bark: 'Burn them! The camp is MINE!',
          entry: 'cinder_ring',
          cdMult: 0.85,
        },
        {
          hpBelow: 0.25,
          name: 'The Burning Word',
          bark: 'I am the fire this camp fears!',
          entry: 'miasma_ring',
          cdMult: 0.7,
          speedMult: 1.1,
        },
      ],
      knockbackMult: 0.4,
      stunMult: 1,
      arenaR: 18,
      engageBark: 'You walk into MY court?',
      defeatBark: 'The fire... goes out...',
    },
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
    // The set feet are the warning: a wound-up crescent that punishes
    // standing in front of the reaver when the pip fills.
    kit: [{ ability: 'reaping_sweep', cooldownTicks: 160, windupTicks: 12, maxRange: 2.2 }],
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
    // school as the troll, now with the pick raised visibly first.
    kit: [{ ability: 'ground_slam', cooldownTicks: 150, windupTicks: 8, maxRange: 4.5 }],
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
    // THE FIRST TRUE CHAMPION KIT (enemy arts): the slam you dodge,
    // the cold you walk out of, and the volley that punishes walking
    // away — three voices, weighted, never a fixed order. Soloing the
    // champion is a dance now, not a jog.
    kit: [
      { ability: 'ground_slam', cooldownTicks: 160, maxRange: 4.5, weight: 2 },
      { ability: 'marrow_chill', cooldownTicks: 220, windupTicks: 10, maxRange: 2.8 },
      { ability: 'bone_volley', cooldownTicks: 240, windupTicks: 14, minRange: 2.5, maxRange: 9 },
    ],
  },
  {
    // THE FALLEN KING (docs/boss-system-plan.md, the first crown):
    // the crypt's deepest seat, no longer a scaled champion. A
    // melee-leaning hybrid whose fight TURNS: the sweep chains into
    // the slam (the two-beat you learn to bank a dodge for), the
    // court rises at the first deep wound, and the last vigil is
    // faster than the sitting king ever was. Every voice is a
    // shipped, fully-faced bone word — the crown composes, it does
    // not invent. skeleton_ prefix = the bone painter dispatch.
    id: 'skeleton_fallen_king',
    name: 'The Fallen King',
    level: 30,
    maxHp: 220,
    damage: 6,
    attackRange: 1.25,
    attackCooldownTicks: 42,
    aggroRange: 7,
    sightArc: 360,
    leashRange: 30,
    speed: 3.8,
    xpReward: 900,
    loot: ['skeleton_champion', 'champion_capes', 'champion_wardrobe', 'barrow_regalia', 'champion_armory', 'heirlooms'],
    respawnSec: 120,
    color: '#e8e2d0',
    radius: 0.44,
    hitHeight: 2.7,
    resist: ['bleed', 'chill'],
    weak: ['burn'],
    kit: [
      // The two-beat: the sweep commits, and the slam lands where you
      // fled to — bank the dodge for the SECOND ring, not the first.
      { ability: 'reaping_sweep', cooldownTicks: 150, windupTicks: 10, maxRange: 2.2, weight: 2, then: 'ground_slam' },
      { ability: 'ground_slam', cooldownTicks: 170, maxRange: 4.5, weight: 2 },
      { ability: 'bone_volley', cooldownTicks: 220, windupTicks: 14, minRange: 2.5, maxRange: 9 },
      { ability: 'marrow_chill', cooldownTicks: 230, windupTicks: 10, maxRange: 2.8, phase: 1 },
      { ability: 'raise_the_fallen', cooldownTicks: 450, windupTicks: 24, aim: 'self', phase: 1 },
    ],
    boss: {
      title: 'The Crown Below',
      phases: [
        { name: 'The Long Sitting' },
        {
          hpBelow: 0.65,
          name: 'The Court Rises',
          bark: 'Rise. Your king commands it.',
          entry: 'raise_the_fallen',
          cdMult: 0.9,
        },
        {
          hpBelow: 0.3,
          name: 'The Last Vigil',
          bark: 'This crown was earned in the dark.',
          entry: 'ground_slam',
          cdMult: 0.75,
          speedMult: 1.15,
        },
      ],
      knockbackMult: 0.15,
      stunMult: 0.5,
      arenaR: 16,
      engageBark: 'Who wakes the king?',
      defeatBark: 'At last... the long watch ends.',
    },
  },
  {
    // THE BARROW LORD (docs/boss-system-plan.md, the gravecourt's
    // crown): the ANTI-KING. Where the Fallen King meets you blade
    // to blade, the keeper of the dead courts holds his distance and
    // makes the GROUND the argument — the mist stakes the footing
    // you hold, the volley meets you on the way out of it, and the
    // court rises when he is truly wounded. Authored WEAKNESS: dry
    // bone is LIGHT — every landed shove moves him whole
    // (knockbackMult 1.2, the most movable crown), so the push
    // schools own this fight; the dead do not stagger (stunMult
    // 0.4). skeleton_ prefix = the bone painter dispatch.
    id: 'skeleton_barrow_lord',
    name: 'The Barrow Lord',
    level: 28,
    maxHp: 200,
    damage: 6,
    attackRange: 1.2,
    attackCooldownTicks: 44,
    aggroRange: 7,
    sightArc: 360,
    leashRange: 30,
    speed: 3.4,
    xpReward: 820,
    loot: ['skeleton_champion', 'chanter_vestry', 'barrow_regalia', 'champion_armory', 'heirlooms'],
    respawnSec: 120,
    color: '#b8aed6',
    radius: 0.4,
    hitHeight: 2.6,
    ranged: { range: 8, projectileSpeed: 10 },
    resist: ['bleed', 'venom'],
    weak: ['burn'],
    standoff: 5.5,
    kit: [
      // The stake-and-punish two-beat: the mist takes the ground you
      // hold, and the volley punishes the leaving of it.
      { ability: 'grave_mist', cooldownTicks: 230, windupTicks: 16, maxRange: 7, aim: 'lead', weight: 2, then: 'bone_volley' },
      { ability: 'bone_volley', cooldownTicks: 170, windupTicks: 14, minRange: 2, maxRange: 8, weight: 2 },
      // The "off my court" word for anyone who closes the gap.
      { ability: 'marrow_chill', cooldownTicks: 230, windupTicks: 10, maxRange: 2.8 },
      { ability: 'raise_the_fallen', cooldownTicks: 420, windupTicks: 24, aim: 'self', phase: 1 },
      { ability: 'ground_slam', cooldownTicks: 180, maxRange: 4.5, phase: 2 },
    ],
    boss: {
      title: 'Keeper of the Quiet Court',
      phases: [
        { name: 'The Quiet Court' },
        {
          hpBelow: 0.6,
          name: 'The Court Wakes',
          bark: 'You stand on my dead. Rise and be counted.',
          entry: 'raise_the_fallen',
          cdMult: 0.85,
        },
        {
          hpBelow: 0.25,
          name: 'The Long Toll',
          bark: 'The barrow keeps what it takes.',
          entry: 'grave_mist',
          cdMult: 0.7,
          speedMult: 1.1,
        },
      ],
      knockbackMult: 1.2,
      stunMult: 0.4,
      arenaR: 18,
      engageBark: 'Another for the quiet earth.',
      defeatBark: 'Back... to the long... quiet...',
    },
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

  // ------------------------------------ THE SKRAL (docs/skral-plan.md):
  // the brine-folk — fish-headed waders who net the banks by day and
  // march as a shoal by night. The watersides' first PEOPLE: where the
  // crabs are the shore's armor, the skral are its society. Cold-water
  // natives to the last scale: the chill slides off them, the storm
  // finds the wet. Their courage lives in the shoal — pack + craven is
  // the whole race written in two fields: poke one and it bolts
  // croaking for its fellows, and the bank comes down on you.
  {
    id: 'skral',
    name: 'Skral',
    level: 8,
    maxHp: 24,
    damage: 3,
    attackRange: 1.0,
    attackCooldownTicks: 50,
    aggroRange: 5,
    // Wall-eyed: the lantern eyes sit on the SIDES of the skull —
    // a skral sees most of the bank without turning its head.
    sightArc: 260,
    leashRange: 24,
    speed: 3.4,
    xpReward: 90,
    loot: ['skral'],
    respawnSec: 30,
    color: '#4f8a6a',
    radius: 0.3,
    hitHeight: 2.0,
    resist: ['chill'],
    weak: ['shock'],
    // The shoal answers as one throat.
    pack: 'skral',
    // And a skral alone is a skral already leaving — bloodied, it
    // bolts croaking for the shoal and drags the whole bank back.
    craven: true,
  },
  {
    id: 'skral_harpooner',
    name: 'Skral harpooner',
    level: 10,
    maxHp: 22,
    damage: 3,
    attackRange: 6,
    attackCooldownTicks: 56,
    aggroRange: 6,
    sightArc: 260,
    leashRange: 24,
    speed: 3.2,
    xpReward: 85,
    loot: ['skral'],
    respawnSec: 35,
    color: '#4a7d9c',
    radius: 0.28,
    hitHeight: 2.0,
    // The fish-spear thrown flat off the bank: a fisher's arm turned
    // on whatever walks the waterline.
    ranged: { range: 6, projectileSpeed: 10 },
    resist: ['chill'],
    weak: ['shock'],
    pack: 'skral',
    craven: true,
  },
  {
    id: 'skral_tidecaller',
    name: 'Skral tidecaller',
    level: 12,
    maxHp: 30,
    damage: 3,
    attackRange: 7,
    attackCooldownTicks: 54,
    aggroRange: 6,
    sightArc: 260,
    leashRange: 26,
    speed: 3.1,
    xpReward: 115,
    loot: ['skral', 'heirlooms'],
    respawnSec: 50,
    color: '#5a5474',
    radius: 0.3,
    hitHeight: 2.0,
    // Brine spit: the weak ranged basic between the kit's words.
    ranged: { range: 7, projectileSpeed: 10 },
    resist: ['chill'],
    weak: ['shock'],
    pack: 'skral',
    // THE STANDOFF CASTER, bank verse: holds the waterline and lets
    // the tide speak.
    standoff: 5.5,
    kit: [
      { ability: 'tide_lash', cooldownTicks: 120, windupTicks: 12, minRange: 1.5, maxRange: 8 },
      // 'lead': the undertow is staked where you are GOING.
      { ability: 'riptide_ring', cooldownTicks: 240, windupTicks: 14, maxRange: 7, aim: 'lead' },
    ],
  },
  {
    // THE DEEPKING: the shoal's named heart — the one skral the bank
    // stands behind, crowned in coral and carrying a barbed trident
    // no smith forged. The fight is the CAMP: the pack tag brings the
    // whole shoal, and the croak calls it twice.
    id: 'skral_champion',
    name: 'Skral deepking',
    level: 17,
    maxHp: 88,
    damage: 5,
    attackRange: 1.2,
    attackCooldownTicks: 44,
    aggroRange: 7,
    sightArc: 300,
    leashRange: 30,
    speed: 3.7,
    xpReward: 310,
    loot: ['skral_champion', 'heirlooms'],
    respawnSec: 90,
    color: '#3d5c6e',
    radius: 0.42,
    hitHeight: 2.3,
    // The cold grip: a trident that spent its life in the water
    // leaves the water's argument in the wound.
    attackStatus: { status: 'chill', power: 1, durationTicks: 50 },
    resist: ['chill'],
    weak: ['shock'],
    pack: 'skral',
    // The croak is WOUND: the throat visibly fills before the word —
    // the breath voice's charge law, and the fight's one clean read.
    kit: [{ ability: 'shoal_call', cooldownTicks: 200, windupTicks: 12, maxRange: 4.5, rally: true }],
  },
  {
    // THE BRINE CROWNS (docs/boss-system-plan.md): THE TIDELORD — the
    // elder deepking on the oldest pool, the Drowned Court's seat
    // (skral stronghold charter). The fight's grammar: HE DOES NOT
    // COME TO YOU. He floods the lane you wanted, stakes the undertow
    // on your stride, calls a court that THROWS instead of bites, and
    // if you stand on the throne anyway, the pool itself objects.
    // Authored weakness: THE STORM FINDS THE WET — near-immovable
    // (planted in his own water, knockback 0.15) but shock staggers
    // him WHOLE and then some (stunMult 1.25): the race's storm-fear
    // written into the crown as the fight's earned answer.
    id: 'skral_tidelord',
    name: 'Skral tidelord',
    level: 30,
    maxHp: 200,
    damage: 7,
    attackRange: 1.2,
    attackCooldownTicks: 42,
    aggroRange: 8,
    // The unsleeping pool: wall-eyes plus a court of watchers.
    sightArc: 300,
    leashRange: 34,
    speed: 3.6,
    xpReward: 820,
    loot: ['skral_champion', 'champion_armory', 'heirlooms'],
    respawnSec: 150,
    color: '#3a4666',
    radius: 0.46,
    hitHeight: 2.5,
    // The old trident's cold grip, same as the shoal's king.
    attackStatus: { status: 'chill', power: 1, durationTicks: 50 },
    resist: ['chill'],
    weak: ['shock'],
    pack: 'skral',
    // The standoff king: holds the pool rim and lets the water argue.
    standoff: 4,
    ranged: { range: 7, projectileSpeed: 10 },
    kit: [
      // The family word first: the undertow staked on your stride —
      // a tidelord still speaks tidecaller.
      { ability: 'riptide_ring', cooldownTicks: 260, windupTicks: 14, maxRange: 7, aim: 'lead' },
      // THE SIGNATURE SENTENCE: the flood lays the bank low, and the
      // jet takes the swimmer — dodging the sheet is only half the
      // answer, because the chain is already winding.
      { ability: 'drowning_surge', cooldownTicks: 300, windupTicks: 16, maxRange: 7, aim: 'lead', weight: 2, then: 'abyssal_jet' },
      { ability: 'abyssal_jet', cooldownTicks: 240, windupTicks: 14, minRange: 2, maxRange: 9 },
      // The court rises once the fight is real (rung 1) — harpooners
      // stand out of empty water and the croak re-gathers the camp.
      { ability: 'court_of_spears', cooldownTicks: 420, windupTicks: 18, aim: 'self', rally: true, phase: 1 },
      // The pool's objection: only ever spoken at his own feet, only
      // once the deep is up (rung 2) — the anti-face-tank verse.
      { ability: 'kingspool_geyser', cooldownTicks: 280, windupTicks: 12, maxRange: 2.5, aim: 'self', phase: 2 },
    ],
    boss: {
      title: 'The Drowned Court',
      phases: [
        { name: 'The Oldest Pool' },
        {
          hpBelow: 0.65,
          name: 'The Court Rises',
          bark: 'The bank STANDS for its king.',
          entry: 'court_of_spears',
          cdMult: 0.85,
        },
        {
          hpBelow: 0.3,
          name: 'The Deep Comes Up',
          bark: 'You are in MY water now.',
          entry: 'abyssal_jet',
          cdMult: 0.7,
          speedMult: 1.1,
        },
      ],
      knockbackMult: 0.15,
      stunMult: 1.25,
      arenaR: 16,
      engageBark: 'The pool is older than your name. It will outlast it.',
      defeatBark: 'The tide... always... comes back...',
    },
  },
  {
    // THE BRINE CROWNS: THE DEEPMAW — the skral that ate past its
    // rank, the tidehold's crowned gullet ("King Gullet" and kin).
    // A leviathan bruiser against the tidelord's court: read the
    // breach (the longest wind any skral draws), break the bite
    // before the jaw ruins your guard, and never stand in the spray.
    // Authored weakness: ALL THAT BULK RIDES ON FROG LEGS — a good
    // shove sits him down (knockback 0.85, the movable brine crown),
    // while the gullet barely notices a stagger (stunMult 0.45).
    id: 'skral_deepmaw',
    name: 'Skral deepmaw',
    level: 21,
    maxHp: 130,
    damage: 6,
    attackRange: 1.3,
    attackCooldownTicks: 40,
    aggroRange: 7,
    sightArc: 260,
    leashRange: 30,
    speed: 3.5,
    xpReward: 520,
    loot: ['skral_champion', 'champion_armory', 'heirlooms'],
    respawnSec: 120,
    color: '#7e8f78',
    radius: 0.5,
    hitHeight: 2.6,
    resist: ['chill'],
    weak: ['shock'],
    pack: 'skral',
    kit: [
      // The eel rush: flat, low, and through you — the closer.
      { ability: 'shallows_rush', cooldownTicks: 190, windupTicks: 12, minRange: 2, maxRange: 6 },
      // The rot the tide won't claim — spoken from the first breath.
      { ability: 'gorge_spray', cooldownTicks: 240, windupTicks: 12, minRange: 1.5, maxRange: 6 },
      // The jaw: mid-fight word (rung 1), and the breach's follower —
      // the crash lands, and the gate closes on whatever it caught.
      { ability: 'gullet_snap', cooldownTicks: 200, windupTicks: 14, maxRange: 1.8, phase: 1 },
      // THE BREACH: he goes under on a 24-tick wake the whole bank
      // can read, and the bank where you stood becomes a crater.
      { ability: 'breaching_crash', cooldownTicks: 320, windupTicks: 24, minRange: 2, maxRange: 4.5, weight: 2, phase: 1, then: 'gullet_snap' },
    ],
    boss: {
      title: 'The Crowned Gullet',
      phases: [
        { name: 'Shallow Water' },
        {
          hpBelow: 0.6,
          name: 'The Gullet Opens',
          bark: 'All of you... fits.',
          entry: 'gullet_snap',
          cdMult: 0.85,
          speedMult: 1.1,
        },
        {
          hpBelow: 0.28,
          name: 'The Hunger',
          bark: 'The pool eats WITH me tonight!',
          entry: 'breaching_crash',
          cdMult: 0.7,
          speedMult: 1.2,
        },
      ],
      knockbackMult: 0.85,
      stunMult: 0.45,
      arenaR: 14,
      engageBark: 'Everything on this bank goes in the same door.',
      defeatBark: 'Still... hungry...',
    },
  },
  // ------------------------- THE LEGION (docs/hobgoblin-plan.md): the
  // hobgoblins — the goblins' master race, and nothing like them.
  // Conquerors nurtured in iron and flame: they hold formation, wear
  // issued armor, wield real steel, and NEVER rout (pack without
  // craven — the deliberate inversion of the goblin's whole heart).
  // The expedition line's drilled answer to the greenskin rabble.
  {
    id: 'hobgoblin',
    name: 'Hobgoblin legionary',
    level: 16,
    maxHp: 72,
    damage: 5,
    attackRange: 1.1,
    attackCooldownTicks: 46,
    aggroRange: 6,
    // The drilled watch: a soldier checks its flanks on a count.
    sightArc: 220,
    leashRange: 26,
    speed: 3.6,
    xpReward: 200,
    loot: ['hobgoblin', 'hobgoblin_arms', 'heirlooms'],
    respawnSec: 45,
    color: '#b0523a',
    radius: 0.32,
    hitHeight: 2.3,
    // The line holds together — strike one and the column answers.
    // NO craven flag, ever: a goblin bolts for help, a legionary
    // stands where it was posted. The discipline IS the species.
    pack: 'hobgoblin',
  },
  {
    id: 'hobgoblin_archer',
    name: 'Hobgoblin longbowman',
    level: 17,
    maxHp: 58,
    damage: 5,
    attackRange: 6.5,
    attackCooldownTicks: 50,
    aggroRange: 7,
    sightArc: 220,
    leashRange: 26,
    speed: 3.5,
    xpReward: 200,
    loot: ['hobgoblin', 'hobgoblin_arms', 'heirlooms'],
    respawnSec: 50,
    color: '#c07038',
    radius: 0.3,
    hitHeight: 2.3,
    // Volley discipline: loosed flat and fast, on the count.
    ranged: { range: 6.5, projectileSpeed: 12 },
    pack: 'hobgoblin',
  },
  {
    // The legion's flame-speaker: iron and fire as ARTILLERY — the
    // brand chases you out of cover, the forge-ring is staked where
    // you are going (the firecaller's lesson, graduated).
    id: 'hobgoblin_warcaster',
    name: 'Hobgoblin warcaster',
    level: 19,
    maxHp: 84,
    damage: 3,
    attackRange: 7,
    attackCooldownTicks: 52,
    aggroRange: 7,
    sightArc: 220,
    leashRange: 28,
    speed: 3.4,
    xpReward: 270,
    loot: ['hobgoblin', 'heirlooms'],
    respawnSec: 60,
    color: '#8d6a58',
    radius: 0.3,
    hitHeight: 2.3,
    ranged: { range: 7, projectileSpeed: 10 },
    // Forge-raised: the fire is an old friend; deep cold cracks it.
    resist: ['burn'],
    weak: ['chill'],
    pack: 'hobgoblin',
    standoff: 5.5,
    kit: [
      { ability: 'iron_brand', cooldownTicks: 110, windupTicks: 12, minRange: 1.5, maxRange: 8 },
      { ability: 'forge_ring', cooldownTicks: 220, windupTicks: 14, maxRange: 7, aim: 'lead' },
    ],
  },
  {
    // THE WARLORD: the one hobgoblin the legion wheels around — the
    // war-camp's named heart. The fight is the FORMATION: the pack
    // tag brings the column, and the horn is an order the drilled
    // ranks obey at a run.
    id: 'hobgoblin_champion',
    name: 'Hobgoblin warlord',
    level: 22,
    maxHp: 165,
    damage: 6,
    attackRange: 1.2,
    attackCooldownTicks: 44,
    aggroRange: 7,
    sightArc: 260,
    leashRange: 30,
    speed: 3.8,
    xpReward: 450,
    loot: ['hobgoblin_champion', 'hobgoblin_arms', 'heirlooms'],
    respawnSec: 90,
    color: '#9e3f30',
    radius: 0.4,
    hitHeight: 2.4,
    // Officer's steel: the cut is placed, and it keeps arguing.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 60 },
    pack: 'hobgoblin',
    // The horn is WOUND: the warlord plants, draws breath, and
    // sounds it — the breath voice's charge law, and the fight's
    // one clean read before the whole camp arrives.
    kit: [{ ability: 'warlord_horn', cooldownTicks: 210, windupTicks: 14, maxRange: 4.5, rally: true }],
  },
  {
    // THE JUGGERNAUT: the giant of the breed — bred for the breach,
    // walked on the giant gait, and armored past argument. The helm
    // slit is the sneak window a walking wall owes you.
    id: 'hobgoblin_juggernaut',
    name: 'Hobgoblin juggernaut',
    level: 24,
    maxHp: 205,
    damage: 7,
    attackRange: 1.6,
    attackCooldownTicks: 54,
    aggroRange: 6,
    sightArc: 160,
    leashRange: 28,
    speed: 3.1,
    xpReward: 550,
    loot: ['hobgoblin', 'hobgoblin_arms', 'heirlooms'],
    respawnSec: 80,
    color: '#84462c',
    radius: 0.45,
    hitHeight: 2.8,
    pack: 'hobgoblin',
    kit: [{ ability: 'ground_slam', cooldownTicks: 180, maxRange: 4.5, weight: 2 }],
  },
  // ------------------------------------------------- THE OOZE FAMILY
  // docs/ooze-family-plan.md: five body plans, never a reskin. The
  // split chain is data (giant → slime → small, ochre and pudding
  // halve once) and every chain terminates. Hoppers POUNCE — the
  // gather-and-spring the painter always animated now truly leaps.
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
    pounce: true,
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
    pounce: true,
  },
  {
    // The mother of the marsh knot: a hopper at landmark scale. Its
    // landing is weather — ground_slam is the crashing-mass splash,
    // telegraphed and dodgeable — and its death is an ARITHMETIC
    // PROBLEM: two slimes, then four smalls, each wave born hunting.
    id: 'giant_slime',
    name: 'Giant slime',
    level: 9,
    maxHp: 60,
    damage: 4,
    attackRange: 1.1,
    attackCooldownTicks: 56,
    aggroRange: 0,
    sightArc: 360,
    leashRange: 16,
    speed: 2.2,
    xpReward: 130,
    loot: ['giant_slime'],
    respawnSec: 45,
    color: '#5cae44',
    radius: 0.55,
    hitHeight: 1.1,
    resist: ['bleed', 'venom'],
    weak: ['chill'],
    splitInto: { npc: 'slime', count: 2 },
    pounce: true,
    kit: [{ ability: 'ground_slam', cooldownTicks: 200, maxRange: 4, weight: 2 }],
  },
  {
    // THE STONE DRESS: the base slime's body wearing wet slate — a
    // gray hopper full of swallowed grit the gel never digested. The
    // acid keeps the argument with your armor (sunder), and the cold
    // means nothing to a body already the temperature of the floor.
    id: 'gray_ooze',
    name: 'Gray slime',
    level: 13,
    maxHp: 55,
    damage: 5,
    attackRange: 1.0,
    attackCooldownTicks: 52,
    // The ambusher's bargain: it sees all around but only an arm's
    // reach out — walking wide of it is the whole lesson.
    aggroRange: 3,
    sightArc: 360,
    leashRange: 12,
    speed: 2.2,
    xpReward: 200,
    loot: ['gray_ooze'],
    respawnSec: 40,
    color: '#8b8d90',
    radius: 0.4,
    hitHeight: 0.75,
    attackStatus: { status: 'sunder', power: 1, durationTicks: 60 },
    resist: ['bleed', 'venom', 'chill'],
    weak: ['burn'],
    pounce: true,
  },
  {
    // THE FROST DRESS: winter kept in a jar — an icy-blue hopper with
    // pale shards adrift in the chill and rime crusting the crown.
    // The tackle numbs (chill), the cold is home, and the fire is
    // the argument it cannot win.
    id: 'frost_slime',
    name: 'Frost slime',
    level: 16,
    maxHp: 85,
    damage: 5,
    attackRange: 1.0,
    attackCooldownTicks: 50,
    aggroRange: 4,
    sightArc: 360,
    leashRange: 16,
    speed: 2.4,
    xpReward: 260,
    loot: ['frost_slime'],
    respawnSec: 50,
    color: '#7fc8de',
    radius: 0.42,
    hitHeight: 0.8,
    attackStatus: { status: 'chill', power: 2, durationTicks: 50 },
    resist: ['bleed', 'venom', 'chill'],
    weak: ['burn'],
    pounce: true,
  },
  {
    // THE CORRIDOR MADE FLESH: a tomb-sized prism of gel sweeping the
    // hall it fits exactly, carrying everything it ever engulfed —
    // the bones and the sword you can SEE suspended inside are the
    // loot table, told honestly. The engulf numbs (chill); slow
    // enough to walk away from, patient enough that you won't.
    id: 'gelatinous_cube',
    name: 'Gelatinous cube',
    level: 19,
    maxHp: 160,
    damage: 6,
    attackRange: 1.2,
    attackCooldownTicks: 60,
    aggroRange: 2.5,
    sightArc: 360,
    leashRange: 10,
    speed: 1.6,
    xpReward: 420,
    loot: ['gelatinous_cube', 'heirlooms'],
    respawnSec: 70,
    color: '#9fd8c8',
    radius: 0.6,
    hitHeight: 1.6,
    attackStatus: { status: 'chill', power: 2, durationTicks: 50 },
    resist: ['bleed', 'venom'],
    weak: ['burn'],
  },
  {
    // THE TAR DRESS: the deep's last word wearing the family body —
    // a near-black hopper that keeps falling off itself (beads run
    // the face, the ground drinks them), eats steel (sunder 2), and
    // shrugs everything but fire. Pale eyes: ink would drown here.
    id: 'tar_slime',
    name: 'Tar slime',
    level: 24,
    maxHp: 150,
    damage: 8,
    attackRange: 1.1,
    attackCooldownTicks: 54,
    aggroRange: 5,
    sightArc: 360,
    leashRange: 16,
    speed: 2.3,
    xpReward: 560,
    loot: ['tar_slime', 'heirlooms'],
    respawnSec: 70,
    color: '#2e2a33',
    radius: 0.45,
    hitHeight: 0.85,
    attackStatus: { status: 'sunder', power: 2, durationTicks: 70 },
    resist: ['bleed', 'venom', 'shock', 'chill'],
    weak: ['burn'],
    pounce: true,
  },
  {
    // THE FLEECE FINDS ITS BODY: the yard's wool-bearer, a placid
    // dark-faced ewe under a cloud of cream fleece. No produce here
    // on purpose — THE YARD REGISTRY IS THE ONLY PAYER, so wool
    // comes off a KEPT sheep's shears and nowhere else (the farm's
    // own fabric source, never a hunting drop).
    id: 'sheep',
    name: 'Sheep',
    level: 2,
    maxHp: 8,
    damage: 0,
    attackRange: 0.8,
    attackCooldownTicks: 50,
    aggroRange: 0,
    leashRange: 8,
    speed: 2.4,
    xpReward: 16,
    loot: ['sheep'],
    respawnSec: 20,
    color: '#e6dfcd',
    radius: 0.26,
    hitHeight: 1.0,
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
    // The herd behind the stag (wilds knot law): antlerless, lighter,
    // and it keeps the stag's flight speed — a startled herd stays a
    // herd instead of stringing out by the slowest body.
    id: 'hind',
    name: 'Hind',
    level: 4,
    maxHp: 14,
    damage: 1,
    attackRange: 1.0,
    attackCooldownTicks: 44,
    aggroRange: 0,
    leashRange: 12,
    speed: 4.4,
    xpReward: 35,
    loot: ['stag'],
    respawnSec: 30,
    color: '#b28a5f',
    radius: 0.28,
    hitHeight: 1.4,
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
    color: '#5e4736',
    radius: 0.3,
    hitHeight: 0.9,
    pounce: true,
  },
  {
    // THE OLD RAZORBACK: the deep wood's battering terror — a
    // mountain at the shoulder under a frost-tipped quill hedge, four
    // aged tusks, and a hide written over with old arguments. It
    // charges first and reconsiders never; the sounder runs behind it
    // after dark.
    id: 'dire_boar',
    name: 'Dire boar',
    level: 17,
    maxHp: 85,
    damage: 5,
    attackRange: 1.0,
    attackCooldownTicks: 38,
    aggroRange: 5,
    sightArc: 240,
    leashRange: 26,
    speed: 4.2,
    xpReward: 300,
    loot: ['dire_boar', 'heirlooms'],
    respawnSec: 80,
    color: '#423c3e',
    radius: 0.45,
    hitHeight: 1.15,
    // The tusks open what the charge knocks down.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 60 },
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
    // THE FIRST LESSON (enemy arts): the bite that bleeds — a new
    // waker's introduction to the wound that keeps paying.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 40 },
    // The dart: it folds, screams, and comes THROUGH you — the first
    // wound-up enemy cast on the road, small enough to learn from.
    kit: [{ ability: 'shrilling_dart', cooldownTicks: 180, windupTicks: 8, maxRange: 4 }],
  },
  {
    // THE ORCHARD SHADOW: a flying fox grown to the frontier's scale
    // — a fox-muzzled soarer on one broad slow sail. It reads gentle
    // until it does not; the wingspan is the warning.
    id: 'giant_bat',
    name: 'Giant bat',
    level: 12,
    maxHp: 58,
    damage: 5,
    attackRange: 0.9,
    attackCooldownTicks: 42,
    aggroRange: 5,
    sightArc: 360,
    leashRange: 24,
    speed: 4.2,
    xpReward: 130,
    loot: ['giant_bat'],
    respawnSec: 40,
    color: '#7a5638',
    radius: 0.4,
    // Sails high on the broad wing: chest-height shots find it.
    hitHeight: 1.4,
    attackStatus: { status: 'bleed', power: 1, durationTicks: 50 },
  },
  {
    // THE RAGGED HUNTER: gaunt, hunched, fangs bared at rest, a torn
    // sail that has been through other creatures. The expedition
    // line's night terror — it screams before it comes through you.
    id: 'dire_bat',
    name: 'Dire bat',
    level: 19,
    maxHp: 130,
    damage: 9,
    attackRange: 1.0,
    attackCooldownTicks: 38,
    aggroRange: 6,
    sightArc: 360,
    leashRange: 26,
    speed: 4.6,
    xpReward: 260,
    loot: ['dire_bat'],
    respawnSec: 50,
    color: '#3c3742',
    radius: 0.42,
    hitHeight: 1.4,
    attackStatus: { status: 'bleed', power: 2, durationTicks: 60 },
    kit: [{ ability: 'shrilling_dart', cooldownTicks: 140, windupTicks: 10, maxRange: 5 }],
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
    // THE ORBIT-BREAKER: silk staked along your stride ('lead') — the
    // circling runner finds the web already across the line.
    kit: [
      { ability: 'web_snare', cooldownTicks: 240, windupTicks: 10, maxRange: 6, aim: 'lead' },
    ],
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
    // The fistful: five loosed at once across a spread — walking a
    // straight line INTO the archer threads it; standing still eats it.
    kit: [
      { ability: 'rattling_volley', cooldownTicks: 200, windupTicks: 14, minRange: 2, maxRange: 8 },
    ],
  },
  {
    // THE CRYPT'S VOICE (enemy arts): the robed dead. Volley, mist,
    // and — at depth, minLevel 30 — the raising: dungeon reissues of
    // this body call real skeletons up out of the floor. The base
    // barrow chanter hasn't the strength for it yet; the deep one
    // has. Packless like all the mindless dead: nobody answers a
    // chanter's fall, only its call.
    id: 'skeleton_chanter',
    name: 'Bone chanter',
    level: 22,
    maxHp: 70,
    damage: 3,
    attackRange: 7.5,
    attackCooldownTicks: 50,
    aggroRange: 6,
    sightArc: 120,
    leashRange: 28,
    speed: 3.0,
    xpReward: 320,
    loot: ['skeleton', 'crypt_wardrobe', 'chanter_vestry'],
    respawnSec: 90,
    color: '#9a94b8',
    radius: 0.32,
    hitHeight: 2.1,
    ranged: { range: 7.5, projectileSpeed: 10 },
    resist: ['bleed'],
    weak: ['burn'],
    standoff: 6,
    kit: [
      { ability: 'bone_volley', cooldownTicks: 160, windupTicks: 14, minRange: 2, maxRange: 8 },
      { ability: 'grave_mist', cooldownTicks: 260, windupTicks: 16, maxRange: 7, aim: 'lead' },
      { ability: 'raise_the_fallen', cooldownTicks: 500, windupTicks: 24, aim: 'self', minLevel: 30 },
    ],
  },
  // ------------------------------------------------------------------
  // THE ASHEN COURT (the Kingsdelf epic) — the Old Crown's dead. They
  // were not buried in barrows: the old realm laid its honored dead in
  // the capital's processional vaults, and the Brand's long burn has
  // been waking them for a century. By night they walk the Processional
  // toward a capital that is not there anymore. The kingsman carries a
  // MITHRIL blade because Kingsdelf mined the mithril — the look is the
  // loot story, and the loot story is the town's history walking.
  // ------------------------------------------------------------------
  {
    id: 'skeleton_kingsman',
    name: 'Old Crown kingsman',
    level: 48,
    maxHp: 210,
    damage: 13,
    attackRange: 1.1,
    attackCooldownTicks: 36,
    aggroRange: 7,
    sightArc: 140,
    leashRange: 32,
    speed: 3.7,
    xpReward: 950,
    loot: ['skeleton', 'crypt_wardrobe', 'crypt_arms'],
    respawnSec: 90,
    // Ash-stained bone: a century and a half under the burn's wind.
    color: '#cfc6b4',
    radius: 0.34,
    hitHeight: 2.3,
    resist: ['bleed'],
    weak: ['burn'],
    // One art, kept from life: the cold of the vaults, laid on close.
    kit: [{ ability: 'marrow_chill', cooldownTicks: 260, windupTicks: 12, maxRange: 2.6 }],
  },
  {
    id: 'skeleton_crownsguard',
    name: 'Old Crown crownsguard',
    level: 55,
    maxHp: 330,
    damage: 17,
    attackRange: 1.2,
    attackCooldownTicks: 40,
    aggroRange: 7,
    sightArc: 150,
    leashRange: 34,
    speed: 3.6,
    xpReward: 1550,
    loot: ['skeleton_champion', 'champion_capes', 'champion_wardrobe', 'champion_armory', 'heirlooms'],
    respawnSec: 150,
    color: '#b8ac96',
    radius: 0.42,
    hitHeight: 2.7,
    resist: ['bleed'],
    weak: ['burn'],
    // The champion's dance at the crown's own tempo: the slam you
    // dodge, the vault-cold you walk out of, the volley that punishes
    // walking away.
    kit: [
      { ability: 'ground_slam', cooldownTicks: 170, maxRange: 4.5, weight: 2 },
      { ability: 'marrow_chill', cooldownTicks: 230, windupTicks: 10, maxRange: 2.8 },
      { ability: 'bone_volley', cooldownTicks: 250, windupTicks: 14, minRange: 2.5, maxRange: 9 },
    ],
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
    // The boss habit writ small: a slam you sidestep on reaction —
    // and below the half, the mend: twenty ticks of knitting flesh
    // that an interrupt (or a shock) buys back whole.
    kit: [
      { ability: 'ground_slam', cooldownTicks: 140, maxRange: 4.5 },
      { ability: 'gnawed_mending', cooldownTicks: 600, windupTicks: 20, hpBelow: 0.4, aim: 'self' },
    ],
  },
  {
    id: 'gnoll',
    name: 'Gnoll',
    level: 13,
    maxHp: 44,
    damage: 4,
    // Long arms and a longer reach: seven feet of scavenger swings
    // wide even carried low in the shoulders.
    attackRange: 1.1,
    attackCooldownTicks: 40,
    aggroRange: 6,
    // A hyena's head: the muzzle points one way, the ears hear most ways.
    sightArc: 210,
    leashRange: 30,
    // The lope: quicker than a goblin, never as quick as the wolves
    // it steals kills from.
    speed: 4.2,
    xpReward: 150,
    loot: ['gnoll', 'goblin_arms', 'heirlooms'],
    respawnSec: 40,
    color: '#7f6d4c',
    radius: 0.36,
    hitHeight: 2.3,
    // Scavenged edges are jagged edges: the wound keeps paying.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 50 },
    pack: 'gnoll',
    // A gnoll's nerve is a pack ration: bloodied and alone, it bolts
    // for a packmate and drags the whole cackle back with it.
    craven: true,
  },
  {
    id: 'gnoll_champion',
    name: 'Gnoll packlord',
    level: 20,
    maxHp: 100,
    damage: 6,
    attackRange: 1.2,
    // The packlord sets the warband's tempo, same as the matriarch
    // sets the pack's.
    attackCooldownTicks: 38,
    aggroRange: 7,
    sightArc: 240,
    leashRange: 34,
    speed: 4.4,
    xpReward: 370,
    loot: ['gnoll_champion', 'goblin_arms', 'heirlooms'],
    respawnSec: 90,
    color: '#4e463c',
    radius: 0.44,
    hitHeight: 2.6,
    // Packlord jaws finish what the warband starts.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 60 },
    pack: 'gnoll',
    // The laugh that runs the warband: dread in your legs, and every
    // gnoll in earshot answering it. The champion fight is the PACK.
    kit: [
      { ability: 'ravening_cackle', cooldownTicks: 150, maxRange: 4.5, rally: true },
      // The lunge: jaws-first THROUGH you when you try to open the gap.
      { ability: 'rending_lunge', cooldownTicks: 180, windupTicks: 10, minRange: 1.5, maxRange: 4 },
    ],
  },
  {
    // THE MATRIARCH (docs/boss-system-plan.md, the cacklefort's
    // crown): gnoll war-camps run on the mother's law, and the
    // matriarch IS the law. A skirmisher crown — the lunge goes
    // THROUGH you and the laugh that follows raises the warband;
    // that chain is her signature sentence. Wounded deep, she gnaws
    // the old bone and MENDS: the heal is honest (long wind, loud
    // telegraph) and breaking the breath is the fight's test.
    // Authored WEAKNESS: light on her feet — every landed shove
    // moves her whole (knockbackMult 1.1); the frenzy barely
    // staggers (stunMult 0.75). gnoll_ prefix = the hyena painter.
    id: 'gnoll_matriarch',
    name: 'Gnoll matriarch',
    level: 28,
    maxHp: 190,
    damage: 7,
    attackRange: 1.2,
    attackCooldownTicks: 36,
    aggroRange: 7,
    sightArc: 240,
    leashRange: 34,
    speed: 4.6,
    xpReward: 780,
    loot: ['gnoll_champion', 'champion_armory', 'heirlooms'],
    respawnSec: 120,
    color: '#3a342e',
    radius: 0.46,
    hitHeight: 2.7,
    // The mother's jaws set the warband's whole appetite.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 70 },
    pack: 'gnoll',
    resist: ['venom'], // a carrion eater fears no spoiled meat
    weak: ['burn'],
    kit: [
      // The signature sentence: jaws through you, then the laugh —
      // and the laugh is a rally, so dodging the lunge is only half
      // the answer.
      { ability: 'rending_lunge', cooldownTicks: 170, windupTicks: 10, minRange: 1.5, maxRange: 4.5, weight: 2, then: 'ravening_cackle' },
      { ability: 'ravening_cackle', cooldownTicks: 210, maxRange: 4.5, rally: true },
      // The gnawed bone: a quarter of her back unless the breath is
      // broken — shove her, shock her, or fight her twice.
      { ability: 'gnawed_mending', cooldownTicks: 550, windupTicks: 20, hpBelow: 0.45, aim: 'self' },
    ],
    boss: {
      title: 'Mother of the Warband',
      phases: [
        { name: 'The Low Laugh' },
        {
          hpBelow: 0.55,
          name: 'The Warband Answers',
          bark: 'Hear them laughing? They laugh for ME.',
          entry: 'ravening_cackle',
          cdMult: 0.85,
          speedMult: 1.1,
        },
        {
          hpBelow: 0.25,
          name: 'Red Teeth',
          bark: 'Now the mother eats FIRST.',
          entry: 'rending_lunge',
          cdMult: 0.7,
          speedMult: 1.25,
        },
      ],
      knockbackMult: 1.1,
      stunMult: 0.75,
      arenaR: 18,
      engageBark: 'Fresh meat walks INTO the den?',
      defeatBark: 'The pack... will not stop... laughing...',
    },
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
  // THE SHELL WALKS (giant turtles): the pond bank's fortress. A
  // giant turtle hunts nothing — it outlasts everything. Provoke it
  // and the neck fires like a sprung trap; walk on and it watches
  // you go. The tank of the tame ladder: more hull than anything
  // near its rung, on the slowest feet in the wood.
  {
    id: 'giant_turtle',
    name: 'Giant turtle',
    level: 14,
    // The keep: out-hulls the black bear two rungs above it — the
    // shell IS the stat.
    maxHp: 72,
    damage: 4,
    // The neck's reach: the strike arrives from further than the
    // shuffle ever will.
    attackRange: 1.2,
    // A siege pace between snaps: the slowest basic under the ogre.
    attackCooldownTicks: 55,
    aggroRange: 0,
    // A basking eye and a shell at its back: it minds its front and
    // trusts the keep with the rest.
    sightArc: 200,
    leashRange: 14,
    // Nothing this side of a golem walks slower — and nothing needs
    // to walk less.
    speed: 2.2,
    xpReward: 175,
    loot: ['giant_turtle', 'heirlooms'],
    respawnSec: 55,
    color: '#5d6b46',
    radius: 0.46,
    hitHeight: 1.2,
    // The hooked shear: a beak that takes its bite with it.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 50 },
    // Nothing bleeds a shell.
    resist: ['bleed'],
    // Cold blood: the chill finds the one gap the armor cannot close.
    weak: ['chill'],
  },
  // THE HILL THAT WATCHES: the colossus is not a bigger turtle — it
  // is a landmark that decided to move. Moss on the crown plates,
  // scars older than the towns, and a patience that has never once
  // been rewarded for hurrying. It asks nothing of anybody; the
  // mistake has always been asking something of it.
  {
    id: 'colossus_turtle',
    name: 'Colossus turtle',
    level: 26,
    maxHp: 210,
    damage: 9,
    attackRange: 1.5,
    attackCooldownTicks: 60,
    aggroRange: 0,
    // Old eyes under a stone brow: it sees what stands before it and
    // outlives the rest.
    sightArc: 160,
    leashRange: 12,
    // The slowest walking thing in the game, and the least worried.
    speed: 1.7,
    xpReward: 540,
    loot: ['colossus_turtle', 'heirlooms'],
    respawnSec: 160,
    color: '#59604f',
    radius: 0.62,
    hitHeight: 1.9,
    // A shear that takes a hand's width at a pass.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 60 },
    // Ancient plate: neither edge nor fang finds purchase.
    resist: ['bleed', 'venom'],
    weak: ['chill'],
  },
  // THE TIDE'S RAMPART (the giant crab): the shore's standing bastion.
  // Where the turtle outlasts and the mudcrab skitters, the giant
  // crab HOLDS — a walking harbor wall on six stilts that claims its
  // stretch of bank and closes the great claw on whatever contests
  // it. Fierce where the turtles are patient: it comes to you, at a
  // pace that promises the argument will be finished properly.
  {
    id: 'giant_crab',
    name: 'Giant crab',
    level: 18,
    // The bulwark: more hull than anything between the keeps — the
    // tank identity IS the stat line.
    maxHp: 130,
    damage: 6,
    // The crusher's reach: the claw arrives before the body does.
    attackRange: 1.1,
    // Heavy machinery: every pinch is a dock crane closing.
    attackCooldownTicks: 58,
    // Territorial, not patient: the bank is claimed, and the claim
    // is enforced.
    aggroRange: 6,
    // Stalked eyes see almost the whole tide line at once.
    sightArc: 300,
    leashRange: 16,
    // A scuttle that never hurries and never stops coming.
    speed: 1.9,
    xpReward: 300,
    loot: ['giant_crab', 'heirlooms'],
    respawnSec: 90,
    color: '#46655c',
    radius: 0.5,
    hitHeight: 1.1,
    // THE GRIP: even the basic pinch holds cold — what the claw
    // takes, it keeps a moment longer than you'd like.
    attackStatus: { status: 'chill', power: 1, durationTicks: 40 },
    // Storm-forged plate turns the edge; a thing of cold water does
    // not mind more cold.
    resist: ['bleed', 'chill'],
    // Wet armor on a wet shore: the storm's own argument wins.
    weak: ['shock'],
    kit: [
      // The clamp: announced long (the open claw IS the warning),
      // paid at the full telegraph premium, and the hold is the point.
      { ability: 'breakwater_grip', cooldownTicks: 180, windupTicks: 24, maxRange: 1.6, weight: 2 },
      // The reach it should not have: cold brine at pressure, thrown
      // at where you are going. Closes the gap the stilts cannot.
      {
        ability: 'brine_jet',
        cooldownTicks: 150,
        windupTicks: 14,
        minRange: 2.5,
        maxRange: 8,
        aim: 'lead',
      },
    ],
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
    kit: [{ ability: 'rallying_howl', cooldownTicks: 150, maxRange: 4.5, rally: true }],
  },
  {
    // OLD FANG (docs/boss-system-plan.md, the wolf crown): the
    // entry-level crown — the first boss most hunters meet, and the
    // one that TEACHES what a crown is. His whole fight is one lived
    // sentence: the hamstring slows you, the basics tear you, then
    // THE LOPE — he breaks away at a dead sprint, calls the
    // brotherhood from ground he trusts, and comes back through you
    // flat and silent. Nothing about him needs a mastered school:
    // knockback and stun both land near-whole (the lesson boss), the
    // call is loud and interruptible if you can run him down, and
    // every summoned brother scales with the court that holds him —
    // the same crown grows harder up the stronghold tiers.
    id: 'wolf_oldfang',
    name: 'Old Fang',
    level: 16,
    maxHp: 110,
    damage: 4,
    attackRange: 1.1,
    attackCooldownTicks: 36,
    aggroRange: 7,
    sightArc: 240,
    leashRange: 32,
    speed: 4.8,
    xpReward: 460,
    loot: ['dire_wolf', 'wolf_wardrobe', 'wolf_arms', 'champion_armory', 'heirlooms'],
    respawnSec: 120,
    color: '#7a7468',
    radius: 0.44,
    hitHeight: 1.5,
    // Old jaws still tear — running from him keeps costing you.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 60 },
    pounce: true,
    pack: 'wolfkin',
    resist: ['chill'], // winter-born: the cold is his country
    weak: ['burn'],
    kit: [
      // The opener: low, under everything, for the tendon — the slow
      // that makes the whole sentence land.
      { ability: 'hamstring_bite', cooldownTicks: 160, windupTicks: 10, maxRange: 1.8, weight: 2 },
      // THE LOPE: picked in close, he breaks AWAY first — the call is
      // spoken at five tiles, loud and honest, and the brotherhood
      // answers. The chain is the return: flat, silent, through you.
      { ability: 'call_the_brotherhood', cooldownTicks: 380, windupTicks: 18, minRange: 5, maxRange: 30, lope: true, rally: true, then: 'throat_lunge' },
      // The return lunge also stands alone once a gap opens — kiting
      // him is never free ground.
      { ability: 'throat_lunge', cooldownTicks: 200, windupTicks: 12, minRange: 2, maxRange: 6 },
    ],
    boss: {
      title: 'First of the Brotherhood',
      phases: [
        { name: 'The Circling' },
        {
          hpBelow: 0.65,
          name: 'The Call',
          bark: 'Brothers! To me!',
          entry: 'call_the_brotherhood',
          cdMult: 0.9,
        },
        {
          hpBelow: 0.3,
          name: 'Red Snow',
          bark: 'The wood buries what it starves.',
          entry: 'throat_lunge',
          cdMult: 0.75,
          speedMult: 1.2,
        },
      ],
      // The lesson boss: hard control lands near-whole on purpose —
      // this crown teaches the loop, it does not demand a school.
      knockbackMult: 0.8,
      stunMult: 1,
      arenaR: 18, // room enough for the lope to breathe
      engageBark: 'This wood is ours, little hunter.',
      defeatBark: 'The brotherhood... runs on without me...',
    },
  },
  {
    // THE COURT'S HOUND: the fey wolf — the highest rung of the
    // wolfkin ladder (wolf, worg, dire, fey), and the one the winter
    // court kept. The loot ledger has whispered it for a while now:
    // "the cold kept a court once, and the packs inherited the
    // estate" — this is what walked out of that estate still wearing
    // the silver. Never a scaled-up dire: where the matriarch is a
    // wall, the hound is a TOWER ON STILTS — the tallest, longest-
    // legged canid in the wood, moon-lavender under a dusk mantle,
    // twin banner brushes streaming behind, the court's chamfron
    // still buckled to its skull. It is the most cunning thing on
    // four legs: it seeds the ring, veils when crowded, and steps
    // THROUGH you when you run.
    id: 'fey_wolf',
    name: 'Fey wolf',
    level: 26,
    maxHp: 175,
    damage: 7,
    attackRange: 1.15,
    // The quickest press in the wolfkin line — cunning never waits.
    attackCooldownTicks: 32,
    // The smartest hunter marks you furthest out, and from angles
    // the dumb packs never watch.
    aggroRange: 8,
    sightArc: 270,
    // A court hound ranges its whole estate.
    leashRange: 40,
    // Only the court's hound outpaces a worg — and the worg knows it.
    speed: 5.2,
    xpReward: 660,
    loot: ['fey_wolf', 'wolf_wardrobe', 'wolf_arms', 'heirlooms'],
    respawnSec: 150,
    color: '#9a94b4',
    radius: 0.47,
    hitHeight: 1.6,
    // The bite runs court-cold: the chill of the estate that never
    // thawed, laid two deep.
    attackStatus: { status: 'chill', power: 2, durationTicks: 70 },
    pounce: true,
    pack: 'wolfkin',
    resist: ['chill'], // the court's own cold cannot bite the court's hound
    weak: ['burn'], // the gloaming has never liked an honest fire
    kit: [
      // The opener, spoken at range: a ring of pale toadstool-light
      // staked under your feet. Standing in the court's ring is the
      // mistake — the old stories were instructions.
      { ability: 'faerie_ring', cooldownTicks: 220, windupTicks: 14, minRange: 2, maxRange: 7, aim: 'lead' },
      // Crowded, it does not back away — the gloaming bursts OFF it,
      // cold shoving through everyone in reach, and the ground it
      // makes is the ground it uses.
      { ability: 'gloaming_veil', cooldownTicks: 260, windupTicks: 10, maxRange: 2.2 },
      // The word that made the legends: the hound comes apart into
      // glimmer and arrives already past you, jaws first. Kiting the
      // court's hound is never free ground.
      { ability: 'glimmer_step', cooldownTicks: 200, windupTicks: 12, minRange: 2.5, maxRange: 7, weight: 2 },
    ],
  },
  {
    id: 'lynx_young',
    name: 'Young lynx',
    level: 8,
    maxHp: 26,
    damage: 3,
    attackRange: 1.0,
    attackCooldownTicks: 36,
    // Bold enough to stalk, young enough to misjudge what it stalks.
    aggroRange: 5,
    sightArc: 240,
    leashRange: 26,
    speed: 4.6,
    xpReward: 85,
    loot: ['lynx', 'heirlooms'],
    respawnSec: 40,
    color: '#9c7f55',
    radius: 0.3,
    hitHeight: 0.95,
    // The rake is real; the arm behind it is still growing.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 40 },
    pounce: true,
    pack: 'lynxkin',
  },
  {
    id: 'lynx',
    name: 'Lynx',
    level: 15,
    maxHp: 50,
    damage: 5,
    attackRange: 1.0,
    // The cat strikes on a shorter breath than the wolf — rake, reset,
    // rake. The ambusher's rhythm.
    attackCooldownTicks: 36,
    aggroRange: 6,
    sightArc: 240,
    leashRange: 30,
    speed: 4.7,
    xpReward: 170,
    loot: ['lynx', 'heirlooms'],
    respawnSec: 45,
    color: '#9c7f55',
    radius: 0.36,
    hitHeight: 1.1,
    // The rake: four claws deep and fast — it bleeds harder than a
    // wolf bite but the wound closes sooner. Ambush arithmetic.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 40 },
    pounce: true,
    pack: 'lynxkin',
  },
  {
    id: 'lynx_champion',
    name: 'Duskruff lynx',
    level: 21,
    maxHp: 100,
    damage: 6,
    attackRange: 1.1,
    // The duskruff presses the kill faster than her shadows.
    attackCooldownTicks: 34,
    aggroRange: 7,
    sightArc: 240,
    // The old cat ranges wide of any one lair.
    leashRange: 36,
    speed: 4.9,
    xpReward: 360,
    loot: ['lynx_champion', 'heirlooms'],
    respawnSec: 90,
    color: '#565064',
    radius: 0.44,
    hitHeight: 1.5,
    // Duskruff claws open you to the bone.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 70 },
    pounce: true,
    pack: 'lynxkin',
    kit: [
      // The scream: every tufted shadow in the wood answers her —
      // the champion fight is the AMBUSH, not the duel.
      { ability: 'rallying_howl', cooldownTicks: 150, maxRange: 4.5, rally: true },
      // The lunge: claws-first THROUGH you when you try to open the gap.
      { ability: 'rending_lunge', cooldownTicks: 180, windupTicks: 10, minRange: 1.5, maxRange: 4 },
    ],
  },
  // ------------------------------------------------------- the red skulk
  {
    id: 'fox',
    name: 'Fox',
    level: 10,
    maxHp: 30,
    damage: 3,
    attackRange: 1.0,
    // The quickest snap in the wood: dart in, nip, gone — nothing
    // hits softer or oftener.
    attackCooldownTicks: 32,
    aggroRange: 5,
    // The wary one: near-round awareness — you do not walk up behind
    // a fox. Cunning as a sight arc.
    sightArc: 300,
    leashRange: 26,
    // The fastest ground in the low wood — you do not run a fox down.
    speed: 5.0,
    xpReward: 100,
    loot: ['fox', 'heirlooms'],
    respawnSec: 40,
    color: '#b4622a',
    radius: 0.28,
    hitHeight: 0.85,
    // The nip: needle teeth, quick and shallow — it costs you to be
    // touched, never to stand there.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 40 },
    pounce: true,
    pack: 'foxkin',
  },
  // THE DIRE FOX — the smokebrush vixen, the matriarch of the skulk.
  // Never the dire wolf's wall: she is RANGY and faster than anything
  // her size, and the champion fight is the HEDGE closing around you
  // — her scream brings the skulk in silent.
  {
    id: 'fox_champion',
    name: 'Smokebrush vixen',
    level: 18,
    maxHp: 78,
    damage: 5,
    attackRange: 1.0,
    // The matriarch presses the fastest tempo of any champion.
    attackCooldownTicks: 30,
    aggroRange: 7,
    sightArc: 320,
    // A roaming matriarch ranges wide of any one earth.
    leashRange: 36,
    speed: 5.2,
    xpReward: 275,
    loot: ['fox_champion', 'heirlooms'],
    respawnSec: 90,
    color: '#6b3226',
    radius: 0.4,
    hitHeight: 1.25,
    // The matriarch's teeth go deeper and stay open longer.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 60 },
    pounce: true,
    pack: 'foxkin',
    kit: [
      // The scream: the night opens, blood runs cold, and the skulk
      // comes silent through the hedges — never the duskruff's kit,
      // and never a duel.
      { ability: 'vixens_scream', cooldownTicks: 150, maxRange: 4.5, rally: true },
      // The dart: through you and past — the feint that bleeds. She
      // spends it to break the kiting orbit, not to commit.
      { ability: 'shrilling_dart', cooldownTicks: 110, minRange: 1.3, maxRange: 3.2 },
    ],
  },
  {
    id: 'great_owl',
    name: 'Great owl',
    level: 16,
    maxHp: 52,
    damage: 5,
    attackRange: 1.1,
    attackCooldownTicks: 40,
    // Night eyes: it marks you across a moonlit glade.
    aggroRange: 7,
    // The turning head — nothing walks up behind an owl. Sneaking one
    // is a game of distance, not angle (near-360 leaves no blind cone).
    sightArc: 330,
    leashRange: 30,
    speed: 4.4,
    xpReward: 190,
    loot: ['great_owl', 'heirlooms'],
    respawnSec: 45,
    color: '#8a7458',
    radius: 0.36,
    hitHeight: 1.35,
    // Talons hook and tear on the way out.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 60 },
    // The swoop: the windup ends in a silent closing rush.
    pounce: true,
    // A wing of great owls hunts one glade — the parliament.
    pack: 'parliament',
  },
  {
    id: 'elder_great_owl',
    name: 'Elder great owl',
    level: 24,
    maxHp: 130,
    damage: 7,
    attackRange: 1.2,
    // The elder strikes on a shorter breath than its wing.
    attackCooldownTicks: 36,
    aggroRange: 8,
    // The oldest head turns the furthest.
    sightArc: 350,
    // An elder ranges wide of any one roost.
    leashRange: 36,
    speed: 4.6,
    xpReward: 430,
    loot: ['elder_great_owl', 'heirlooms'],
    respawnSec: 100,
    color: '#4e5262',
    radius: 0.46,
    hitHeight: 1.7,
    // Elder talons open you to the bone.
    attackStatus: { status: 'bleed', power: 2, durationTicks: 70 },
    pounce: true,
    pack: 'parliament',
    // The screech: the wood goes quiet, your legs go cold, and every
    // owl in earshot drops off its bough — the champion fight is the
    // PARLIAMENT, not the duel.
    kit: [{ ability: 'hushing_screech', cooldownTicks: 150, maxRange: 4.5, rally: true }],
  },

  // ------------------------------------------------------------------
  // THE EARTH STANDS UP (docs/golems-plan.md): the golem bestiary.
  // Four constructs, each a CHARACTER — the biggest walking bodies in
  // the game, the slowest, and the most honest. No pack, no rally: a
  // golem stands alone, and the fight it teaches is spacing. Narrow
  // sightArcs on purpose — a construct watches its front, and the slow
  // turn is the sneak window.
  {
    // The hill that walks: a dry-stacked cairn come to life. It tears
    // stones from its own shoulder and throws them, and its slam
    // stands the ground up in a ring around your feet.
    id: 'rock_golem',
    name: 'Rock golem',
    level: 18,
    maxHp: 120,
    damage: 5,
    attackRange: 1.4,
    attackCooldownTicks: 54, // the slow heavy basic every premium prices off
    aggroRange: 5,
    sightArc: 150,
    leashRange: 30,
    speed: 2.6, // no golem hurries — pressure is reach, not chase
    xpReward: 320,
    loot: ['rock_golem', 'heirlooms'],
    respawnSec: 120,
    color: '#8a8164',
    radius: 0.46,
    hitHeight: 3.0,
    resist: ['bleed', 'venom'], // stone has no blood to spill or spoil
    kit: [
      { ability: 'hillstone_throw', cooldownTicks: 170, windupTicks: 24, minRange: 2.5, maxRange: 8 },
      { ability: 'quarry_ring', cooldownTicks: 210, windupTicks: 12, maxRange: 4.5 },
    ],
  },
  {
    // THE LODESTONE: a magnetic heart that gathered a body — raw ore
    // in humming suspension, wearing the iron the land lost. The one
    // golem with no ranged art — the walker. Its menace is that it
    // keeps coming.
    id: 'iron_golem',
    name: 'Iron golem',
    level: 26,
    maxHp: 190,
    damage: 7,
    attackRange: 1.4,
    attackCooldownTicks: 58, // the slowest basic in the bestiary
    aggroRange: 5.5,
    sightArc: 130, // the visor slit sees least — and hits hardest
    leashRange: 30,
    speed: 2.3,
    xpReward: 520,
    loot: ['iron_golem', 'heirlooms'],
    respawnSec: 140,
    color: '#6f665e',
    radius: 0.48,
    hitHeight: 3.1,
    resist: ['bleed', 'venom'],
    weak: ['shock'], // forged iron carries the storm to its joints
    kit: [
      { ability: 'anvil_fall', cooldownTicks: 220, windupTicks: 22, maxRange: 3.5 },
      { ability: 'drawn_bolt', cooldownTicks: 180, windupTicks: 14, minRange: 2.5, maxRange: 6 },
    ],
  },
  {
    // The banked furnace: black basalt crust over a molten core, and
    // the light comes from inside. At night the glow owns the dark.
    id: 'fire_golem',
    name: 'Fire golem',
    level: 31,
    maxHp: 220,
    damage: 8,
    attackRange: 1.4,
    attackCooldownTicks: 52,
    aggroRange: 6,
    sightArc: 170,
    leashRange: 30,
    speed: 2.6,
    xpReward: 600,
    loot: ['fire_golem', 'heirlooms'],
    respawnSec: 150,
    color: '#3a2c26',
    radius: 0.48,
    hitHeight: 3.1,
    resist: ['burn', 'bleed'],
    weak: ['chill'], // winter is the one argument the furnace loses
    kit: [
      { ability: 'slag_gobbet', cooldownTicks: 150, windupTicks: 16, minRange: 2, maxRange: 8 },
      { ability: 'vent_ring', cooldownTicks: 240, windupTicks: 14, maxRange: 7, aim: 'lead' },
      // Below the half the shell stops holding: once a fight, priced
      // on the longest wind it owns.
      { ability: 'crust_burst', cooldownTicks: 500, windupTicks: 26, hpBelow: 0.5, aim: 'self' },
    ],
  },
  {
    // The winter that remembers: faceted glacial slabs with a dark old
    // heart frozen visible in the chest. It creaks when it leans, and
    // the ground stays rimed where it walked.
    id: 'ice_golem',
    name: 'Ice golem',
    level: 36,
    maxHp: 260,
    damage: 8,
    attackRange: 1.5, // the longest golem reach — the slab arms are long
    attackCooldownTicks: 56,
    aggroRange: 5.5,
    sightArc: 140,
    leashRange: 30,
    speed: 2.4,
    xpReward: 700,
    loot: ['ice_golem', 'heirlooms'],
    respawnSec: 160,
    color: '#9ec8dc',
    radius: 0.5,
    hitHeight: 3.3,
    resist: ['chill', 'bleed'],
    weak: ['burn'],
    kit: [
      { ability: 'calving_volley', cooldownTicks: 170, windupTicks: 16, minRange: 2, maxRange: 8 },
      { ability: 'winters_floor', cooldownTicks: 260, windupTicks: 14, maxRange: 7, aim: 'lead' },
    ],
  },
  {
    // THE ANVILHEART (docs/boss-system-plan.md, the mine's crown):
    // the deep seat held a renamed troll — now the mine's own keeper
    // stands it. An iron-build golem grown around a struck-anvil
    // heart: the slowest crown and the only IMMOVABLE one
    // (knockbackMult 0 — a mountain is not argued with), and in
    // trade the most interruptible (stunMult 1.5 — iron carries the
    // storm to its joints; the shock school breaks this fight open).
    // The two-beat: the anvil falls where you stand, and the drawn
    // bolt meets you leaving the ring. _golem suffix = the construct
    // painter dispatch (iron build, deep-mine colorway).
    id: 'anvil_golem',
    name: 'Anvil golem',
    level: 27,
    maxHp: 230,
    damage: 8,
    attackRange: 1.4,
    attackCooldownTicks: 54,
    aggroRange: 6,
    sightArc: 150,
    leashRange: 30,
    speed: 2.5, // no golem hurries — the crown least of all
    xpReward: 950,
    loot: ['iron_golem', 'champion_armory', 'heirlooms'],
    respawnSec: 150,
    color: '#7d7468',
    radius: 0.5,
    hitHeight: 3.2,
    resist: ['bleed', 'venom'],
    weak: ['shock'],
    kit: [
      // The signature two-beat: the anvil takes the ground, the bolt
      // takes the leaving — bank the dodge for the SECOND word.
      { ability: 'anvil_fall', cooldownTicks: 210, windupTicks: 22, maxRange: 3.5, weight: 2, then: 'drawn_bolt' },
      { ability: 'drawn_bolt', cooldownTicks: 180, windupTicks: 14, minRange: 2.5, maxRange: 6 },
      { ability: 'quarry_ring', cooldownTicks: 220, windupTicks: 12, maxRange: 4.5 },
      { ability: 'hillstone_throw', cooldownTicks: 190, windupTicks: 20, minRange: 2.5, maxRange: 8, phase: 1 },
    ],
    boss: {
      title: 'What the Mine Woke',
      phases: [
        { name: 'The Banked Heart' },
        {
          hpBelow: 0.6,
          name: 'The Seam Wakes',
          bark: 'The mine answers.',
          entry: 'hillstone_throw',
          cdMult: 0.85,
        },
        {
          hpBelow: 0.3,
          name: 'Struck Iron',
          bark: 'Iron remembers the hammer.',
          entry: 'anvil_fall',
          cdMult: 0.7,
          speedMult: 1.2,
        },
      ],
      knockbackMult: 0,
      stunMult: 1.5,
      arenaR: 14,
      engageBark: 'The seam is closed.',
      defeatBark: 'The hum... runs out.',
    },
  },

  // ------------------------------------------------------------------
  // THE HILL COMES DOWN (docs/ogres-plan.md): the giant-kin. The first
  // TRUE giants — twice a waker's height and more, the biggest walking
  // silhouettes in the game. Slow, dim, monstrous, and honest about
  // all three: narrow sight (the sneak window a giant owes), heavy
  // telegraphed dies, and a temper straight out of the old stories —
  // wound one deep and it stops fighting to THROW A TANTRUM.
  {
    // The hill bully: a gut that leads the body, a club that was
    // lately a tree, and a sack of dented junk it calls treasure.
    // Ogres walk in ones and twos and hit like falling timber.
    id: 'ogre',
    name: 'Ogre',
    level: 22,
    maxHp: 170,
    damage: 7,
    // A greatclub's reach: long arms swing a long tree.
    attackRange: 1.6,
    attackCooldownTicks: 58, // the slow heavy basic every premium prices off
    aggroRange: 6,
    // Small eyes under a heavy brow: an ogre sees its supper and
    // little else. The wide flank is the whole approach plan.
    sightArc: 140,
    leashRange: 28,
    // Quicker than a golem — a giant's stride covers ground even
    // strolling — and still the slowest thing that will ever chase you.
    speed: 2.9,
    xpReward: 460,
    loot: ['ogre', 'ogre_arms', 'heirlooms'],
    respawnSec: 90,
    color: '#b3985e',
    radius: 0.5,
    hitHeight: 3.6,
    pack: 'ogre',
    kit: [
      // The overhead drop: both hands, full stretch, the ground rings
      // like a struck bell. Everything about it says LEAVE.
      { ability: 'skull_toll', cooldownTicks: 190, windupTicks: 16, maxRange: 4 },
      // The old stories are true: bloody an ogre past its patience
      // and it stops aiming — it just SMASHES until nothing's left.
      { ability: 'ogre_tantrum', cooldownTicks: 240, windupTicks: 12, maxRange: 2.5, hpBelow: 0.35 },
    ],
  },
  {
    // The javelin arm: an ogre that learned the one clever thing an
    // ogre ever learns — that everything is a throwing stone if you
    // are strong enough. Holds its ground and empties the cart.
    id: 'ogre_hurler',
    name: 'Ogre hurler',
    level: 24,
    maxHp: 160,
    damage: 6,
    attackRange: 1.5,
    attackCooldownTicks: 56,
    aggroRange: 7,
    sightArc: 140,
    leashRange: 28,
    speed: 2.9,
    xpReward: 440,
    loot: ['ogre_hurler', 'ogre_arms', 'heirlooms'],
    respawnSec: 90,
    color: '#8f6f4e',
    radius: 0.5,
    hitHeight: 3.5,
    // Sharpened fence posts, thrown flat and hard.
    ranged: { range: 9, projectileSpeed: 8 },
    pack: 'ogre',
    // THE STANDOFF GIANT: it plants its feet and lets the arm speak.
    standoff: 6,
    kit: [
      // The millstone: two hands, three staggering steps, and a
      // hundredweight of quarried wheel in the air. It keeps rolling.
      { ability: 'millstone_toss', cooldownTicks: 200, windupTicks: 24, minRange: 3, maxRange: 9 },
      // A fistful of the road itself — the scatter that punishes the
      // sideways answer the millstone taught you.
      { ability: 'gravel_rake', cooldownTicks: 130, windupTicks: 12, minRange: 2, maxRange: 7 },
    ],
  },
  {
    // The bellower: the closest thing ogre-kind has to a caster — a
    // voice. It fills the great gut like a bellows and what comes out
    // moves the ground, lays the grass flat, and shakes the stones
    // loose over your head. Between verses it EATS.
    id: 'ogre_bellower',
    name: 'Ogre bellower',
    level: 26,
    maxHp: 150,
    damage: 5,
    attackRange: 1.5,
    attackCooldownTicks: 56,
    aggroRange: 7,
    sightArc: 140,
    leashRange: 28,
    speed: 3.0,
    xpReward: 420,
    loot: ['ogre_bellower', 'ogre_arms', 'heirlooms'],
    respawnSec: 100,
    color: '#7e7f74',
    radius: 0.52,
    hitHeight: 3.7,
    pack: 'ogre',
    standoff: 5.5,
    kit: [
      // The bellow: a wall of voice and spittle that knocks a waker
      // clean off their feet. The long fill is the whole warning.
      { ability: 'hill_bellow', cooldownTicks: 210, windupTicks: 28, maxRange: 3 },
      // The verse lands where you are GOING — the orbit-breaker.
      { ability: 'shaken_stones', cooldownTicks: 170, windupTicks: 8, maxRange: 7, aim: 'lead' },
      // Wounded deep, it remembers supper: a mutton haunch off the
      // belt, gnawed to the bone mid-fight. Break the meal or fight
      // a third of it twice.
      { ability: 'haunch_gnaw', cooldownTicks: 600, windupTicks: 22, hpBelow: 0.5, aim: 'self' },
    ],
  },
  {
    // BONEGRINDER: the camp's master, named the way ogres name
    // everything — for what it does. Half again the bulk of the
    // rank-and-file, a double trophy belt, and the family temper
    // grown into a doctrine: the toll, the tantrum, and the bellow
    // that brings the whole camp's clubs up.
    id: 'ogre_champion',
    name: 'Bonegrinder ogre',
    level: 28,
    maxHp: 260,
    damage: 8,
    attackRange: 1.7,
    attackCooldownTicks: 56,
    aggroRange: 7,
    sightArc: 160,
    leashRange: 32,
    speed: 3.1,
    xpReward: 700,
    loot: ['ogre_champion', 'heirlooms'],
    respawnSec: 130,
    color: '#96685a',
    radius: 0.56,
    hitHeight: 4.2,
    pack: 'ogre',
    kit: [
      { ability: 'skull_toll', cooldownTicks: 180, windupTicks: 16, maxRange: 4, weight: 2 },
      // The master's bellow is a muster: every ogre in earshot
      // answers it. The champion fight is the CAMP.
      { ability: 'hill_bellow', cooldownTicks: 220, windupTicks: 28, maxRange: 3, rally: true },
      { ability: 'ogre_tantrum', cooldownTicks: 220, windupTicks: 12, maxRange: 2.5, hpBelow: 0.35 },
      { ability: 'haunch_gnaw', cooldownTicks: 650, windupTicks: 22, hpBelow: 0.4, aim: 'self' },
    ],
  },
];

// THE MARKED WORLD: combat-lane temperaments join their bodies here —
// one registry page (npcLanes.ts), merged at the map build so the
// def literals stay about the body and the lanes read as one roster.
const laned = (d: NpcDef): NpcDef => (NPC_LANES[d.id] ? { ...d, lanes: NPC_LANES[d.id] } : d);

export const NPCS: ReadonlyMap<string, NpcDef> = new Map(defs.map((d) => [d.id, laned(d)]));

/** The authored bestiary exactly as shipped — the CMS revert target. */
export const AUTHORED_NPCS: ReadonlyMap<string, NpcDef> = new Map(
  defs.map((d) => [d.id, laned(d)]),
);

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
  if (
    d.hitHeight !== undefined &&
    (typeof d.hitHeight !== 'number' || !Number.isFinite(d.hitHeight) || d.hitHeight < 0)
  ) {
    // A negative height inverts the feet→crown hit band.
    errors.push('hitHeight must be a non-negative number');
  }
  // THE COMBAT FIELDS ARE COMBAT LAW (audit 2026-08-15): attackStatus,
  // resist/weak, and lanes are typed, shipped on dozens of defs, and
  // applied to players on every landed blow — yet the CMS door never
  // vetted them, so a live edit could ride any shape (a NaN power, an
  // unknown status) straight into damage math. Checked whole now.
  if (d.attackStatus !== undefined) {
    const a = d.attackStatus as Record<string, unknown>;
    if (
      typeof a !== 'object' ||
      a === null ||
      !STATUS_IDS.includes(a.status as StatusId) ||
      typeof a.power !== 'number' ||
      !Number.isFinite(a.power) ||
      (a.power as number) < 0 ||
      typeof a.durationTicks !== 'number' ||
      !Number.isInteger(a.durationTicks) ||
      (a.durationTicks as number) < 1
    ) {
      errors.push(
        `attackStatus must be {status: ${STATUS_IDS.join('|')}, power >= 0, durationTicks >= 1}`,
      );
    }
  }
  for (const f of ['resist', 'weak'] as const) {
    if (d[f] !== undefined) {
      if (
        !Array.isArray(d[f]) ||
        (d[f] as unknown[]).some((s) => !STATUS_IDS.includes(s as StatusId))
      ) {
        errors.push(`${f} must be an array of status ids (${STATUS_IDS.join('|')})`);
      }
    }
  }
  if (d.lanes !== undefined) {
    const l = d.lanes as Record<string, unknown>;
    if (typeof l !== 'object' || l === null) {
      errors.push('lanes must be an object');
    } else {
      for (const f of ['weak', 'resist'] as const) {
        if (
          l[f] !== undefined &&
          (!Array.isArray(l[f]) ||
            (l[f] as unknown[]).some((s) => !DAMAGE_LANES.includes(s as (typeof DAMAGE_LANES)[number])))
        ) {
          errors.push(`lanes.${f} must be an array of lanes (${DAMAGE_LANES.join('|')})`);
        }
      }
      for (const key of Object.keys(l)) {
        if (key !== 'weak' && key !== 'resist') errors.push(`lanes has unknown field '${key}'`);
      }
    }
  }
  if (d.special !== undefined) {
    errors.push("special is retired — author kit: [{ability, cooldownTicks, ...}] (docs/enemy-arts-plan.md)");
  }
  if (d.kit !== undefined) {
    const kitMax = d.boss !== undefined ? BOSS_KIT_MAX : 6;
    if (!Array.isArray(d.kit) || d.kit.length === 0 || d.kit.length > kitMax) {
      errors.push(`kit must be an array of 1..${kitMax} entries`);
    } else {
      d.kit.forEach((raw, i) => {
        const k = raw as Record<string, unknown>;
        const at = `kit[${i}]`;
        if (typeof k?.ability !== 'string') errors.push(`${at}.ability must be a string`);
        if (typeof k?.cooldownTicks !== 'number' || (k.cooldownTicks as number) < 50) {
          errors.push(`${at}.cooldownTicks must be a number >= 50 (no spam voices)`);
        }
        for (const f of ['windupTicks', 'minRange', 'maxRange', 'weight', 'initialCooldownTicks', 'minLevel'] as const) {
          if (k?.[f] !== undefined && (typeof k[f] !== 'number' || !Number.isFinite(k[f] as number) || (k[f] as number) < 0)) {
            errors.push(`${at}.${f} must be a non-negative number`);
          }
        }
        for (const f of ['hpBelow', 'hpAbove'] as const) {
          if (k?.[f] !== undefined && (typeof k[f] !== 'number' || (k[f] as number) <= 0 || (k[f] as number) > 1)) {
            errors.push(`${at}.${f} must be a fraction in (0, 1]`);
          }
        }
        if (k?.windupTicks !== undefined && (k.windupTicks as number) > 100) {
          errors.push(`${at}.windupTicks must be <= 100 (a breath, not a siege)`);
        }
        if (k?.aim !== undefined && k.aim !== 'target' && k.aim !== 'self' && k.aim !== 'lead') {
          errors.push(`${at}.aim must be 'target' | 'self' | 'lead'`);
        }
        if (k?.rally !== undefined && typeof k.rally !== 'boolean') {
          errors.push(`${at}.rally must be a boolean`);
        }
        if (k?.lope !== undefined) {
          if (typeof k.lope !== 'boolean') {
            errors.push(`${at}.lope must be a boolean`);
          } else if (k.lope && (typeof k.minRange !== 'number' || (k.minRange as number) <= 0)) {
            errors.push(`${at}.lope requires minRange > 0 (the gap the body opens before it speaks)`);
          }
        }
        if (
          typeof k?.minRange === 'number' && typeof k?.maxRange === 'number' &&
          (k.minRange as number) > (k.maxRange as number)
        ) {
          errors.push(`${at}: minRange must not exceed maxRange`);
        }
        for (const f of ['phase', 'phaseMax'] as const) {
          if (
            k?.[f] !== undefined &&
            (typeof k[f] !== 'number' || !Number.isInteger(k[f] as number) ||
              (k[f] as number) < 0 || (k[f] as number) > 3)
          ) {
            errors.push(`${at}.${f} must be an integer phase index in [0, 3]`);
          }
        }
        if ((k?.phase !== undefined || k?.phaseMax !== undefined || k?.then !== undefined) && d.boss === undefined) {
          errors.push(`${at}: phase/phaseMax/then are boss laws — the def wears no boss block`);
        }
        if (
          typeof k?.phase === 'number' && typeof k?.phaseMax === 'number' &&
          (k.phase as number) > (k.phaseMax as number)
        ) {
          errors.push(`${at}: phase must not exceed phaseMax`);
        }
        if (k?.then !== undefined && typeof k.then !== 'string') {
          errors.push(`${at}.then must be an ability id string`);
        }
      });
      // THE CHAIN's shape laws: every link lands on a kit-mate, no
      // entry chains to itself, no cycle, no combo past 3 links.
      if (d.boss !== undefined) {
        const kit = d.kit as Array<Record<string, unknown>>;
        const idxOf = new Map<string, number>();
        kit.forEach((k, i) => {
          if (typeof k?.ability === 'string') idxOf.set(k.ability as string, i);
        });
        kit.forEach((k, i) => {
          if (typeof k?.then !== 'string') return;
          const at = `kit[${i}]`;
          if (!idxOf.has(k.then as string)) {
            errors.push(`${at}.then '${String(k.then)}' names no kit-mate of this def`);
            return;
          }
          let hops = 0;
          let cur: number | undefined = i;
          const seen = new Set<number>();
          while (cur !== undefined && typeof kit[cur]?.then === 'string') {
            if (seen.has(cur)) {
              errors.push(`${at}: chain loops — combos must end`);
              return;
            }
            seen.add(cur);
            cur = idxOf.get(kit[cur]!.then as string);
            if (++hops > 3) {
              errors.push(`${at}: chain runs past 3 links — a combo, not a script`);
              return;
            }
          }
        });
      }
    }
  }
  if (d.boss !== undefined) {
    const b = d.boss as Record<string, unknown>;
    if (typeof b !== 'object' || b === null) {
      errors.push('boss must be an object');
    } else {
      if (d.kit === undefined) {
        errors.push('boss requires a kit — a crowned foe with no voices is a contradiction');
      }
      if (!Array.isArray(b.phases) || b.phases.length === 0 || b.phases.length > 4) {
        errors.push('boss.phases must be an array of 1..4 rungs');
      } else {
        const kitAbilities = new Set(
          Array.isArray(d.kit)
            ? (d.kit as Array<Record<string, unknown>>)
                .map((k) => k?.ability)
                .filter((a): a is string => typeof a === 'string')
            : [],
        );
        let prev = 1;
        (b.phases as unknown[]).forEach((raw, i) => {
          const p = raw as Record<string, unknown>;
          const at = `boss.phases[${i}]`;
          if (i === 0) {
            if (p?.hpBelow !== undefined) {
              errors.push(`${at}.hpBelow must be absent — the first rung is the opening stance`);
            }
          } else if (
            typeof p?.hpBelow !== 'number' || (p.hpBelow as number) <= 0 || (p.hpBelow as number) >= prev
          ) {
            errors.push(`${at}.hpBelow must be a fraction in (0, 1), strictly descending the ladder`);
          } else {
            prev = p.hpBelow as number;
          }
          for (const f of ['name', 'bark', 'entry'] as const) {
            if (p?.[f] !== undefined && typeof p[f] !== 'string') {
              errors.push(`${at}.${f} must be a string`);
            }
          }
          for (const f of ['name', 'bark'] as const) {
            if (typeof p?.[f] === 'string' && (p[f] as string).length > 200) {
              errors.push(`${at}.${f} must be 200 chars or fewer`);
            }
          }
          if (typeof p?.entry === 'string' && !kitAbilities.has(p.entry as string)) {
            errors.push(`${at}.entry '${String(p.entry)}' names no kit-mate — the turn fires through the kit`);
          }
          if (
            p?.cdMult !== undefined &&
            (typeof p.cdMult !== 'number' || (p.cdMult as number) < 0.5 || (p.cdMult as number) > 1)
          ) {
            errors.push(`${at}.cdMult must be a number in [0.5, 1]`);
          }
          if (
            p?.speedMult !== undefined &&
            (typeof p.speedMult !== 'number' || (p.speedMult as number) < 0.75 || (p.speedMult as number) > 1.5)
          ) {
            errors.push(`${at}.speedMult must be a number in [0.75, 1.5]`);
          }
        });
      }
      if (b.title !== undefined && typeof b.title !== 'string') errors.push('boss.title must be a string');
      for (const f of ['engageBark', 'defeatBark'] as const) {
        if (b[f] !== undefined && (typeof b[f] !== 'string' || (b[f] as string).length > 200)) {
          errors.push(`boss.${f} must be a string of 200 chars or fewer`);
        }
      }
      if (
        b.knockbackMult !== undefined &&
        (typeof b.knockbackMult !== 'number' || (b.knockbackMult as number) < 0 || (b.knockbackMult as number) > 1.5)
      ) {
        errors.push('boss.knockbackMult must be a number in [0, 1.5]');
      }
      if (
        b.stunMult !== undefined &&
        (typeof b.stunMult !== 'number' || (b.stunMult as number) < 0 || (b.stunMult as number) > 2)
      ) {
        errors.push('boss.stunMult must be a number in [0, 2]');
      }
      if (
        b.arenaR !== undefined &&
        (typeof b.arenaR !== 'number' || (b.arenaR as number) < 4 || (b.arenaR as number) > 40)
      ) {
        errors.push('boss.arenaR must be a number in [4, 40] tiles');
      }
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
    // The engine caps split recursion "by data" — this is where that
    // data is capped: a def splitting into itself (or any cycle the
    // CMS lets through) makes death spawn exponentially.
    if (typeof d.id === 'string' && s?.npc === d.id) {
      errors.push('splitInto.npc may not be the def itself (death would spawn exponentially)');
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
    if (
      typeof p?.item !== 'string' ||
      typeof p?.minSec !== 'number' ||
      typeof p?.maxSec !== 'number' ||
      typeof p?.xp !== 'number'
    ) {
      // The error message always claimed xp; the check now agrees
      // (an unchecked xp paid undefined beastcraft XP at pickup).
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
  if (
    d.standoff !== undefined &&
    (typeof d.standoff !== 'number' || d.standoff < 1 || d.standoff > 12)
  ) {
    errors.push('standoff must be a number in [1, 12] tiles');
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
  // (Pushed outward for THE DAWN REMADE: the rect grew to
  // (-128,0)-(0,96), so every den keeps ≥8 tiles off the hems and the
  // hunters' trail threads them without touching the village.)
  { npc: 'wolf', x: -24, y: -12, radius: 6, count: 2 },
  { npc: 'wolf', x: -52, y: -14, radius: 6, count: 2 },
  { npc: 'dire_wolf', x: -38, y: -14, radius: 8, count: 1 },
  // The Gloamwood — the dark forest south of the brook meadow: webs
  // above, wings at dusk, and the old threats deeper in. Clear of the
  // old-road gate at (-30,96).
  { npc: 'giant_spider', x: -22, y: 108, radius: 7, count: 2 },
  { npc: 'cave_bat', x: -40, y: 106, radius: 6, count: 2 },
  { npc: 'bear', x: -54, y: 112, radius: 6, count: 1 },
  { npc: 'troll', x: -64, y: 120, radius: 6, count: 1 },
  // Gentle life on the village's shoulders: stags browse the east
  // meadow along the lane, rams keep the rocky rise out west.
  { npc: 'stag', x: 12, y: 40, radius: 7, count: 2 },
  { npc: 'ram', x: -142, y: 24, radius: 7, count: 2 },
];
