/**
 * Ability & status laws — the shared heart of hybrid combat.
 *
 * The model: every weapon carries a signature Art (Q), a worn relic
 * grants a second active (E). Both run on cooldowns, and every basic
 * attack you LAND shaves ticks off both — autos are the engine that
 * fuels abilities, so aggression is always rewarded and the rhythm
 * weaves basics and abilities together.
 *
 * Abilities are pure data (AbilityDef) interpreted by one executor on
 * the server; NPCs' special attacks run through the same interpreter.
 * The client uses the same types for hotbar icons and cooldown mirrors.
 */

// ------------------------------------------------------------- status

export type StatusId = 'burn' | 'chill' | 'shock' | 'bleed' | 'venom';

export const STATUS_IDS: readonly StatusId[] = ['burn', 'chill', 'shock', 'bleed', 'venom'];

/** Snapshot wire bits (u8 bitfield per entity). Bits 4-5 belong to sneak. */
export const STATUS_BIT: Record<StatusId, number> = {
  burn: 1 << 0,
  chill: 1 << 1,
  shock: 1 << 2,
  bleed: 1 << 3,
  venom: 1 << 6,
};

/** Mask of the DoT/CC bits above — ambience particles must not react to the sneak bits. */
export const STATUS_AMBIENCE_MASK = 0x4f;

/** Snapshot bit: this entity is fully hidden (only ever seen on your OWN entity). */
export const SNEAK_HIDDEN_BIT = 1 << 4;

/** Snapshot bit: a hostile NPC is currently chasing this entity. */
export const SNEAK_DETECTED_BIT = 1 << 5;

/** A status being applied by an ability or attack. */
export interface StatusApply {
  status: StatusId;
  /** Magnitude — DoT tick damage for burn/bleed/venom, unused for chill/shock. */
  power: number;
  durationTicks: number;
}

/** A status currently riding on an entity. */
export interface ActiveStatus {
  id: StatusId;
  power: number;
  ticksLeft: number;
}

/** Burn deals its power every this many ticks (0.5 s at 20 Hz). */
export const BURN_TICK_EVERY = 10;
/** Bleed bleeds slower but is refreshed easily by melee. */
export const BLEED_TICK_EVERY = 14;
/** Venom drips fastest of the three DoTs — the rogue's pressure clock. */
export const VENOM_TICK_EVERY = 8;
/** Movement/attack speed factor while chilled. */
export const CHILL_SPEED_FACTOR = 0.55;
/**
 * Shock stuns hard but briefly (a stagger, not a lockdown). The status
 * itself may ride LONGER than the stun — static charge lingering as
 * reaction fodder, so shock combos are playable at human speed.
 */
export const SHOCK_MAX_TICKS = 14;

// ---------------------------------------------------------- reactions

/**
 * The one reaction law: applying a DIFFERENT status to a target that
 * already carries one DETONATES the old status — burst damage plus a
 * combined effect. Order doesn't matter (pairs are symmetric), so the
 * table has one entry per unordered pair.
 */
export type ReactionEffect =
  /** Extra burst on the target only. */
  | 'burst'
  /** Blast damage to everything near the target. */
  | 'aoe'
  /** Damage arcs to the nearest other enemies. */
  | 'chain'
  /** The detonation re-applies a hard stun. */
  | 'stun'
  /** The burn spreads to nearby enemies. */
  | 'spread';

export interface ReactionDef {
  name: string;
  /** Burst damage = round((oldPower + newPower) * mult). */
  mult: number;
  effect: ReactionEffect;
  /** Radius for aoe/chain/spread effects, tiles. */
  radius: number;
  /** Floaty color. */
  color: string;
  /** spread only: which DoT jumps to the neighbors (default burn). */
  spreadStatus?: StatusId;
}

function pairKey(a: StatusId, b: StatusId): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`;
}

const REACTION_TABLE: Record<string, ReactionDef> = {
  [pairKey('burn', 'chill')]: {
    name: 'Thermal Shock',
    mult: 2.2,
    effect: 'aoe',
    radius: 2.2,
    color: '#ffb35c',
  },
  [pairKey('burn', 'shock')]: {
    name: 'Combust',
    mult: 3.0,
    effect: 'burst',
    radius: 0,
    color: '#ff8a3c',
  },
  [pairKey('burn', 'bleed')]: {
    name: 'Immolate',
    mult: 1.8,
    effect: 'spread',
    radius: 2.6,
    color: '#ff6a4a',
  },
  [pairKey('chill', 'shock')]: {
    name: 'Shatter',
    mult: 2.4,
    effect: 'stun',
    radius: 0,
    color: '#a8e4ff',
  },
  [pairKey('chill', 'bleed')]: {
    name: 'Frostbite',
    mult: 2.0,
    effect: 'burst',
    radius: 0,
    color: '#c8ecff',
  },
  [pairKey('shock', 'bleed')]: {
    name: 'Arc Surge',
    mult: 1.6,
    effect: 'chain',
    radius: 3.2,
    color: '#e8e06a',
  },
  [pairKey('venom', 'burn')]: {
    name: 'Caustic Blaze',
    mult: 2.0,
    effect: 'aoe',
    radius: 2.0,
    color: '#c8e04a',
  },
  [pairKey('venom', 'chill')]: {
    name: 'Congeal',
    mult: 2.6,
    effect: 'burst',
    radius: 0,
    color: '#9adcc8',
  },
  [pairKey('venom', 'shock')]: {
    name: 'Nerve Jolt',
    mult: 2.2,
    effect: 'stun',
    radius: 0,
    color: '#d8e86a',
  },
  [pairKey('venom', 'bleed')]: {
    name: 'Contagion',
    mult: 1.8,
    effect: 'spread',
    radius: 2.4,
    color: '#a0c050',
    spreadStatus: 'venom',
  },
};

/** The reaction for detonating `oldStatus` with `incoming`, if any. */
export function reactionFor(oldStatus: StatusId, incoming: StatusId): ReactionDef | null {
  if (oldStatus === incoming) return null;
  return REACTION_TABLE[pairKey(oldStatus, incoming)] ?? null;
}

/** Burst damage a detonation deals before effect-specific behavior. */
export function reactionDamage(oldPower: number, newPower: number, r: ReactionDef): number {
  return Math.max(1, Math.round((oldPower + newPower) * r.mult));
}

// -------------------------------------------------------------- haste

/**
 * On-hit haste: every basic attack that LANDS pulls both ability
 * cooldowns forward. Charged shots at full draw pull harder — the
 * patient archer gets her volley back in two arrows.
 */
// Retuned for hack-and-slash cadence: basics land ~3× as often now, so
// each landed hit pulls less — total haste per second stays similar.
export const HASTE_ON_HIT_TICKS = 4; // 0.2 s per landed basic
export const HASTE_FULL_DRAW_TICKS = 12;

export function hasteOnHit(cooldownLeft: number, fullDraw = false): number {
  const chunk = fullDraw ? HASTE_FULL_DRAW_TICKS : HASTE_ON_HIT_TICKS;
  return Math.max(0, cooldownLeft - chunk);
}

/** Tiles a homing projectile scans when re-acquiring a target mid-flight. */
export const HOMING_SEEK_RANGE = 6;

// ---------------------------------------------------------- abilities

export type AbilityShape =
  /** Swing in an arc around the caster's aim. */
  | 'melee_arc'
  /** Dash forward, damaging everything passed through. */
  | 'dash_strike'
  /** Loose a fan of projectiles. */
  | 'projectile_fan'
  /** Damage ring expanding from the caster. */
  | 'nova'
  /** Telegraphed blast at an aimed ground point. */
  | 'ground_aoe'
  /** Buff/heal the caster only. */
  | 'self_buff'
  /** Place a stationary helper: totem, trap, or decoy. */
  | 'summon'
  /** Zap the nearest target in aim, arcing on to nearby enemies. */
  | 'chain_zap'
  /** Repeated novas from the caster over time (you can keep moving). */
  | 'pulse_nova'
  /** Instant ray along the aim — everything in the corridor is struck at once. */
  | 'beam'
  /** A lingering hazard zone at an aimed point that pulses damage while it lives. */
  | 'ground_field'
  /** Leap to an aimed point and detonate a blast on landing. */
  | 'leap_slam'
  /** A rapid burst of melee-arc strikes over a few beats (you keep moving). */
  | 'flurry';

export interface AbilitySelf {
  heal?: number;
  /** Movement multiplier while active. */
  speedMult?: number;
  /** Flat damage soaked before HP. */
  shieldHp?: number;
  /** Fraction of melee damage dealt returned as healing while active. */
  meleeLifesteal?: number;
  /** While active, every landed basic attack applies this status — the oil-on-the-blade stances. */
  onHitStatus?: StatusApply;
  durationTicks: number;
}

export interface AbilitySummon {
  kind: 'heal_totem' | 'snare_trap' | 'decoy';
  durationTicks: number;
  /** Effect radius around the summon. */
  radius: number;
  /** Heal per pulse / snare chill power / decoy taunt radius weight. */
  power: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  /** One line for the hotbar tooltip. */
  desc: string;
  /** Icon language matches items: a color chip + two-letter code. */
  color: string;
  code: string;
  cooldownTicks: number;
  /** Ticks the caster is rooted in the cast (commitment window). */
  castFreezeTicks?: number;
  shape: AbilityShape;
  /** Max hit before style-level scaling. 0 for pure utility. */
  damage: number;
  /** Reach / flight range / max ground-target distance, tiles. */
  range?: number;
  /** melee_arc half-angle in radians (default ~60°). */
  arc?: number;
  /** Blast radius for nova / ground_aoe, tiles. */
  radius?: number;
  /** projectile_fan count. */
  projectiles?: number;
  /** Total fan spread in radians. */
  spreadArc?: number;
  projectileSpeed?: number;
  /** Projectiles punch through targets instead of stopping. */
  pierce?: boolean;
  /**
   * Homing turn rate, radians/second. Projectiles seek a foe picked in
   * the aim cone at launch (fans distribute across distinct targets),
   * re-acquiring within HOMING_SEEK_RANGE when their mark dies.
   */
  homing?: number;
  /**
   * Projectile school override: shots fly as magic bolts in this school
   * regardless of the caster's weapon — seeker wisps from a sword hand
   * still look like magic, not arrows.
   */
  element?: string;
  /** dash_strike distance, tiles. Negative = away from the aim. */
  dashTiles?: number;
  /** chain_zap: how many targets the arc can jump to. */
  chainTargets?: number;
  /** pulse_nova: pulse count and spacing. */
  pulses?: number;
  pulseEveryTicks?: number;
  status?: StatusApply;
  self?: AbilitySelf;
  /**
   * Shove strength multiplier. NEGATIVE pulls targets toward the
   * effect's center instead — the vortex tools.
   */
  knockback?: number;
  /** ground_aoe: ticks between telegraph and detonation. */
  fuseTicks?: number;
  summon?: AbilitySummon;
  /** beam: corridor half-width in tiles (default 0.55). */
  width?: number;
  /** ground_field: how long the hazard lives (pulses every pulseEveryTicks). */
  fieldTicks?: number;
  /** flurry: number of strikes (spaced pulseEveryTicks apart). */
  hits?: number;
  /** projectile_fan: shots boomerang back to the caster, striking again. */
  returns?: boolean;
  /** Execute: targets below `frac` of max HP take `mult`× damage. */
  executeBelow?: { frac: number; mult: number };
  /** Fraction of damage dealt returned to the caster as healing. */
  drainFrac?: number;
}

/**
 * Ability slot indices. Four actives, each fed by a different
 * progression axis: Art (gear chase), relic (loot hunt), technique
 * (skill grind), sigil (boss trophies).
 */
export const SLOT_ART = 0;
export const SLOT_RELIC = 1;
export const SLOT_TECHNIQUE = 2;
export const SLOT_SIGIL = 3;
export const ABILITY_SLOTS = 4;
export type AbilitySlot = 0 | 1 | 2 | 3;

// --------------------------------------------------------- techniques

/**
 * A combat style that carries a technique loadout. `sneak` is the
 * rogue's ladder: unlocked by the sneak skill, reached through weapons
 * that declare `techStyle: 'sneak'` (the daggers) — loadout-is-class.
 */
export type CombatStyleId = 'melee' | 'archery' | 'magic' | 'sneak';

export const COMBAT_STYLES: readonly CombatStyleId[] = ['melee', 'archery', 'magic', 'sneak'];

/**
 * A learnable active: unlocked by raising the style's skill, chosen
 * freely among unlocked options (respec is always free — experiment!).
 */
export interface TechniqueDef {
  ability: string;
  style: CombatStyleId;
  unlockLevel: number;
}

// ----------------------------------------------------------- passives

/**
 * Gear-carried passives (Minecraft-Dungeons-enchant energy): worn
 * items may each contribute one, hooked at named combat moments.
 */
export type PassiveId =
  /** Melee attackers take a point of damage back. */
  | 'thorns'
  /** Full-draw arrows also chill. */
  | 'chill_charged'
  /** Your heavy (third) bolt also burns. */
  | 'ember_bolt'
  /** Dodging grants a burst of speed. */
  | 'dodge_haste'
  /** Constant stride bonus while worn. */
  | 'fleet_footed'
  /** Dropping below 30% health triggers a burst of speed. */
  | 'second_wind'
  /** Kills grant a short surge of speed. */
  | 'battle_rush';

export interface PassiveMeta {
  name: string;
  desc: string;
  color: string;
  code: string;
}

export const PASSIVES: Record<PassiveId, PassiveMeta> = {
  thorns: {
    name: 'Thorns',
    desc: 'Melee attackers take 1 damage back.',
    color: '#8a744a',
    code: 'Th',
  },
  chill_charged: {
    name: 'Biting Draw',
    desc: 'Fully-drawn arrows also chill their target.',
    color: '#8ac4e8',
    code: 'Bd',
  },
  ember_bolt: {
    name: 'Ember Bolt',
    desc: 'Your heavy third bolt sets targets burning.',
    color: '#e8763c',
    code: 'Eb',
  },
  dodge_haste: {
    name: 'Wolf Reflexes',
    desc: 'Dodging grants +35% speed for 1.5 s.',
    color: '#6a6f7d',
    code: 'Wr',
  },
  fleet_footed: {
    name: 'Fleet Footed',
    desc: '+8% movement speed while worn.',
    color: '#7da35a',
    code: 'Ff',
  },
  second_wind: {
    name: 'Second Wind',
    desc: 'Dropping below 30% health grants +35% speed for 3 s.',
    color: '#e8763c',
    code: 'Sw',
  },
  battle_rush: {
    name: 'Battle Rush',
    desc: 'Kills grant +25% speed for 2.5 s.',
    color: '#c43d55',
    code: 'Br',
  },
};
