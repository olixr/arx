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

import { TICK_RATE } from '../constants.js';

// ------------------------------------------------------------- status

export type StatusId =
  | 'burn'
  | 'chill'
  | 'shock'
  | 'bleed'
  | 'venom'
  | 'sunder'
  // THE WIDER WOUND (statusBook Phase 3) — the wave-one roster. Every
  // page lives in STATUS_BOOK; none has a shipped applier until the
  // authored tide (Phase 5) prices it.
  | 'root'
  | 'stagger'
  | 'weaken'
  | 'quicken'
  | 'mend'
  | 'stonehide';

export const STATUS_IDS: readonly StatusId[] = [
  'burn',
  'chill',
  'shock',
  'bleed',
  'venom',
  'sunder',
  'root',
  'stagger',
  'weaken',
  'quicken',
  'mend',
  'stonehide',
];

/**
 * THE TWO LANES (buildcraft Phase 1). Statuses split by what they ARE:
 *
 * - SPARKS (burn/chill/shock) are volatile charges. They keep the
 *   reaction grammar AMONG THEMSELVES: a different spark landing on a
 *   charged body detonates (the table below). Two sparks can never
 *   coexist on one body — the invariant the reaction law rests on.
 * - AFFLICTIONS (bleed/venom) are persistent wounds. They ride through
 *   anything, never detonate and are never detonated, and they stack
 *   PER SOURCE so a second hunter is never worthless. These are the
 *   states that gear reads (the vs-state grammar, Phase 2).
 * - `sunder` is the game's ONE amplifier mark: cracked guard, a flat
 *   "takes more" percentage. A single entry per body, highest wins,
 *   never self-stacks, deliberately short. It is engineering, not a
 *   curse: the armor is broken and everything gets in.
 */
export const SPARKS: readonly StatusId[] = ['burn', 'chill', 'shock'];
export const AFFLICTIONS: readonly StatusId[] = ['bleed', 'venom'];

export function isSpark(id: StatusId): boolean {
  return SPARKS.includes(id);
}

export function isAffliction(id: StatusId): boolean {
  return AFFLICTIONS.includes(id);
}

/**
 * Snapshot wire bits (u32 bitfield per entity since the Phase 3
 * widening; u16 v29-v33). THE LOW WORD IS FROZEN: bits 0-15 keep
 * their exact v29 meanings forever — the historic u8 low byte (bits
 * 4-5 sneak, bit 7 sheathe), sunder at 8, the per-source affliction
 * nibble at 9-12 — so every pre-widening reader's mask still means
 * what it always meant. The wave-one roster climbs the high word
 * (bits 16-21), the count-model stack nibble rides bits 22-25, and
 * bits 26-31 stay free for the next decade.
 */
export const STATUS_BIT: Record<StatusId, number> = {
  burn: 1 << 0,
  chill: 1 << 1,
  shock: 1 << 2,
  bleed: 1 << 3,
  venom: 1 << 6,
  sunder: 1 << 8,
  root: 1 << 16,
  stagger: 1 << 17,
  weaken: 1 << 18,
  quicken: 1 << 19,
  mend: 1 << 20,
  stonehide: 1 << 21,
};

/**
 * Mask of the real state bits — ambience and edge detection must not
 * react to the sneak/sheathe bits or the stack nibbles. Low word
 * 0x14f frozen; the wave-one bits join in the high word.
 */
export const STATUS_AMBIENCE_MASK = 0x14f | (0x3f << 16);

/**
 * Bits 9-12: how many affliction entries ride this body (per-source
 * stacks, clamped to 15). Own-target nameplate fuel — the count is on
 * the wire from Phase 1 so the Phase 5 HUD needs no protocol change.
 */
export const AFFLICTION_STACKS_SHIFT = 9;
export const AFFLICTION_STACKS_MASK = 0xf << AFFLICTION_STACKS_SHIFT;

/** Read the per-source affliction stack count out of a status bitfield. */
export function afflictionStacksOf(bits: number): number {
  return (bits & AFFLICTION_STACKS_MASK) >> AFFLICTION_STACKS_SHIFT;
}

/**
 * Bits 22-25: the COUNT-model stack nibble (statusBook Phase 3) — how
 * deep the count-model state on this body runs, clamped 15. Separate
 * from the affliction nibble so each keeps one honest meaning: per-
 * source entries there, one page's own count here.
 */
export const COUNT_STACKS_SHIFT = 22;
export const COUNT_STACKS_MASK = 0xf << COUNT_STACKS_SHIFT;

/** Read the count-model stack count out of a status bitfield. */
export function countStacksOf(bits: number): number {
  // >>> keeps the read honest at the top of the u32.
  return (bits & COUNT_STACKS_MASK) >>> COUNT_STACKS_SHIFT;
}

/**
 * The most entries ONE affliction id may hold on one body — a
 * per-source cap, never a shared cap (a shared cap makes the second
 * hunter worthless). At the cap a new source folds into the weakest
 * entry by the max rules, so no landed apply is ever eaten.
 */
export const AFFLICTION_SOURCE_CAP = 5;

/**
 * The ceiling on sunder's power (a flat percent of damage taken).
 * The Phase 2 seam clamps here no matter what authored a bigger mark.
 */
export const SUNDER_MAX_PCT = 20;

/** Snapshot bit: this entity is fully hidden (only ever seen on your OWN entity). */
export const SNEAK_HIDDEN_BIT = 1 << 4;

/** Snapshot bit: a hostile NPC is currently chasing this entity. */
export const SNEAK_DETECTED_BIT = 1 << 5;

/**
 * Snapshot bit: this body's weapons ride STOWED on the body — blades
 * at the hip, bow/staff slung across the back. Players flip it by
 * choice (H toggle); NPC actors read it from disposition and combat
 * state, so a provoked guard visibly draws as the chase begins.
 */
export const SHEATHED_BIT = 1 << 7;

/** A status being applied by an ability or attack. */
export interface StatusApply {
  status: StatusId;
  /**
   * Magnitude — DoT tick damage for burn/bleed/venom, the flat
   * "takes more" percent for sunder, unused for chill/shock.
   */
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
 * The reaction law, as amended by THE TWO LANES: applying a DIFFERENT
 * SPARK to a body that already carries one DETONATES the riding spark
 * — burst damage plus the pair's combined effect. Order doesn't
 * matter (pairs are symmetric), so the table has one entry per
 * unordered spark pair. Afflictions and sunder ride through a
 * detonation untouched and never fuel one.
 *
 * THE RETIREMENT (recorded 2026-08-14, buildcraft Phase 1): the seven
 * spark-affliction and affliction-affliction pairs — Immolate,
 * Frostbite, Arc Surge, Caustic Blaze, Congeal, Nerve Jolt, Contagion
 * — left the table when afflictions became persistent riders. A wound
 * that detonated on the next spark could never be the state that gear
 * reads ("venomed foes take more from this edge"), and the persistent
 * lane is worth more than seven bursts. The names are parked here on
 * purpose: set words and consume verbs (Phase 2+) may deliberately
 * re-open the best of them as AUTHORED payoffs, never as the ambient
 * law. The `chain` and `spread` effects below survive for exactly
 * that door.
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
  [pairKey('chill', 'shock')]: {
    name: 'Shatter',
    mult: 2.4,
    effect: 'stun',
    radius: 0,
    color: '#a8e4ff',
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

// ---------------------------------------------- THE READING EDGE

/**
 * One attacker-side payoff clause: "bodies carrying `status` take
 * `mult` times damage from me." Gathered from worn gear (vsState
 * effects, highest-wins per state) and from the striking ability or
 * finisher beat (AbilityDef.vs / StrikeDef.consumes).
 */
export interface VsClause {
  status: StatusId;
  /** Damage multiplier while the state rides (1.5 = half again). */
  mult: number;
}

/** The universal amplifier: what a riding sunder mark lets through. */
export function sunderAmp(list: readonly ActiveStatus[] | undefined): number {
  if (!list) return 1;
  for (const s of list) {
    if (s.id === 'sunder') return 1 + Math.min(s.power, SUNDER_MAX_PCT) / 100;
  }
  return 1;
}

/**
 * THE TWO BUCKETS AND NO MORE law, second bucket. Everything additive
 * (styleDmg, elementDmg, crit, affixes) folds upstream into the max
 * hit; this is the ONLY other multiplication in the game, and it is
 * target-conditional by construction:
 *
 * - per distinct state riding the target, the HIGHEST applicable
 *   clause wins — same-state payoffs never stack;
 * - distinct states multiply — assembling an applier and two readers
 *   across the build is the jackpot the player paid slots for;
 * - the sunder mark multiplies in as the one clause-free amplifier
 *   (its own entry is highest-wins at the apply door), clamped to
 *   SUNDER_MAX_PCT no matter what authored the mark.
 *
 * Pure, so the whole constitution is testable without a server.
 */
export function stateBucket(
  list: readonly ActiveStatus[] | undefined,
  clauses: readonly VsClause[],
): number {
  if (!list || list.length === 0) return 1;
  let mult = sunderAmp(list);
  const present = new Set<StatusId>();
  for (const s of list) if (s.id !== 'sunder') present.add(s.id);
  for (const id of present) {
    let best = 1;
    for (const c of clauses) {
      if (c.status === id && c.mult > best) best = c.mult;
    }
    mult *= best;
  }
  return mult;
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
  | 'flurry'
  /**
   * THE WILD ANSWERS THE CALL (beastcraft arts): a survival channel
   * cast at a tamable beast in the aim cone. The working provokes the
   * beast onto the caster; standing in its teeth for `channelTicks`
   * (halved on a craven mark) completes the tame through the one
   * ceremony rail. Moving breaks it; any wound TO the beast breaks
   * it; keeper blood does not.
   */
  | 'tame'
  /**
   * THE KEEPER'S TONGUE: still one wild beast's blood — its fight
   * forgotten, its eyes down for `becalmTicks`. `radius` > 0 lets the
   * calm spread to beasts beside the mark. Champions and the crowned
   * terrors are too proud to be stilled.
   */
  | 'becalm'
  /**
   * A word spoken to the companion (`command` picks which): the
   * whistle home, the pointed fang, the thrown balm, the shared
   * surge, the cry that stands a fallen friend. Refuses aloud, before
   * any cost, when the friend the word needs is not there.
   */
  | 'pet_command'
  /**
   * The capstone ring of awe: every wild beast in `radius` is
   * becalmed, the companion is mended and surged. The wild stills
   * because the keeper finally speaks its whole tongue.
   */
  | 'wild_howl';

/** Which word a pet_command art speaks to the companion. */
export type PetCommandKind = 'heel' | 'fang' | 'mend' | 'surge' | 'rise';

// ---------------------------------------------------- travel (THE CROSSING)

/**
 * THE TRAVELED ROAD (docs/transport-arts-plan.md): how a transport
 * art crosses the ground. The first three TRAVERSE — the body moves
 * over real ticks at the kind's speed, wall-stopped and substepped
 * through the one stepMovement door, watchers seeing the crossing
 * because it truly happens. A `blink` LEAVES instead: discontinuous
 * relocation through resolveTeleport, nothing between the doors
 * touched, damage paid only as the arrival strike.
 */
export type TravelKind = 'charge' | 'dash' | 'leap' | 'blink';

/**
 * Travel speeds, tiles per second. The charge is the heavy build-up
 * run (~2.6x a walking body — long roads read as a RUN); the dash is
 * the blur-step; the leap crosses the air between the jump and the
 * crater. One table, both mirrors: the server's transit and the
 * client predictor derive every duration from these.
 */
export const TRAVEL_SPEEDS: Readonly<Record<Exclude<TravelKind, 'blink'>, number>> = {
  charge: 13,
  dash: 18,
  leap: 14,
};

/**
 * The travel kind an ability crosses with — authored `travel` first,
 * else the shape's native gait. Non-transport shapes return null.
 */
export function travelKindOf(ab: AbilityDef): TravelKind | null {
  if (ab.travel) return ab.travel;
  if (ab.shape === 'dash_strike') return 'dash';
  if (ab.shape === 'leap_slam') return 'leap';
  return null;
}

/**
 * Ticks a traversal of `dist` tiles takes at the kind's speed — the
 * ONE clock both the server transit and the predictor's seq window
 * read, floored at 2 so even the shortest hop is seen crossing.
 * Blinks take 0: a torn veil has no road.
 */
export function transitTicks(dist: number, kind: TravelKind): number {
  if (kind === 'blink') return 0;
  return Math.max(2, Math.ceil((Math.abs(dist) / TRAVEL_SPEEDS[kind]) * TICK_RATE));
}

/**
 * THE CHOSEN GROUND: the striking distance a target-locked charge
 * ends at — contact, not overlap; the impact blast pays the arrival.
 */
export const CHARGE_CONTACT_DIST = 0.85;

/** Arrival-strike radius for a blink's emergence wound, tiles. */
export const BLINK_STRIKE_RADIUS = 1.1;

/**
 * A surge window laid on the companion: its teeth and stride quicken
 * for the duration. A pet fact (PetComp carries the window) — no
 * keeper benefit ever rides a pet blow.
 */
export interface PetSurge {
  /** Multiplier on the companion's max hit. */
  dmgMult: number;
  /** Multiplier on the companion's stride. */
  speedMult: number;
  durationTicks: number;
  /**
   * THE WHOLE TEMPER (a rank IV flourish): while the surge runs, the
   * companion's kit status lands at double power and its blows shove.
   */
  temper?: boolean;
}

/** A guard window laid on the companion: flat armor at the mitigate site. */
export interface PetGuard {
  armor: number;
  durationTicks: number;
}

/**
 * THE KIT (enemy arts, docs/enemy-arts-plan.md): the shapes an NPC
 * caster may author — exactly the set with a true fromNpc lane in
 * the one interpreter. The beast/keeper shapes never (they are
 * player grammar intercepted before the door); anything added here
 * must land its NPC branch in castAbility in the same commit.
 */
export const NPC_SAFE_SHAPES: ReadonlySet<AbilityShape> = new Set<AbilityShape>([
  'melee_arc',
  'dash_strike',
  'projectile_fan',
  'nova',
  'ground_aoe',
  'ground_field',
  'beam',
  'leap_slam',
  'pulse_nova',
  'flurry',
  'chain_zap',
  'self_buff',
  'summon',
]);

export interface AbilitySelf {
  heal?: number;
  /**
   * THE KIT (enemy arts): heal as a FRACTION of max hp — the only
   * honest mend for a def that ships at every tier (a flat number
   * would be a rounding error on a level-68 reissue). Preferred over
   * `heal` when both are authored. NPC self riders are a curated
   * subset: healFrac/heal only; the stance rails stay player rails.
   */
  healFrac?: number;
  /** Movement multiplier while active. */
  speedMult?: number;
  /**
   * THE SWING CHANNEL (buff forge): swing-cadence multiplier while
   * active (1.15 = swings 15% faster). Folded with worn gear's
   * channel and clamped to the SWING band at the one pay site —
   * distinct from ability-cooldown haste. No shipped art authors it
   * yet; the wave-one boons land here.
   */
  attackSpeedMult?: number;
  /**
   * THE AUTHORED TIDE (statusBook Phase 5): a page the caster lays
   * on ITSELF — the boss boon door (a barrow lord knitting under
   * mend, a deepmaw plating in stonehide, a frenzying tyrant under
   * quicken). Walks the caster's own real apply door, so the page's
   * bit rides the wire and the whole visible layer answers: the
   * nameplate block, the aura, the landing. NPC-safe by design;
   * player arts may author it too.
   */
  selfStatus?: StatusApply;
  /** Flat damage soaked before HP. */
  shieldHp?: number;
  /** Fraction of melee damage dealt returned as healing while active. */
  meleeLifesteal?: number;
  /** While active, every landed basic attack applies this status — the oil-on-the-blade stances. */
  onHitStatus?: StatusApply;
  /**
   * Flat bonus armor while active — folds into THE THREAT LAW's armor
   * term at the mitigate site (unlike shieldHp, which soaks AFTER
   * mitigation). The tank-stance rail.
   */
  armor?: number;
  /**
   * THE TURNED BLOW: fraction of post-mitigation damage taken that is
   * returned to the striking NPC, dealt in the shield school.
   */
  reflectFrac?: number;
  /**
   * THE MIRRORED HAND: while active, the offhand echo lands at this
   * damage fraction when it beats the trained factor (max across
   * buffs, capped at parity — the off hand never OUT-hits the main,
   * even honed). The twin school's stance rail.
   */
  offhandWeight?: number;
  /**
   * THE QUIET WALK: while active, wild beasts do not mark the wearer
   * (checked inside the one perception scan). The truce is honest —
   * the wearer's own landed wound on a wild beast ends it early.
   */
  beastTruce?: boolean;
  /**
   * THE WILD PARTS (a rank IV flourish on the truce): wild beasts
   * within this many tiles ease aside as the wearer passes.
   */
  beastPart?: number;
  durationTicks: number;
}

export interface AbilitySummon {
  /**
   * 'bait' (THE KEEPER'S TONGUE): a scattered table on the ground —
   * wild beasts at rest within `radius` drift over to nose it through
   * the investigate grammar. It pulls, never breaks: a blood-up chase
   * does not care about supper.
   */
  kind: 'heal_totem' | 'snare_trap' | 'decoy' | 'bait';
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
  /**
   * THE DRAWN BREATH: a wind-up — the press begins a breath this many
   * ticks long, and the art fires through the one door when it
   * completes. Full stride while it draws; a planted tick breathes
   * CAST_STILL_FACTOR instead of 1. Nothing is paid until the fire.
   * Absent = the press-edge instant every art was born with.
   */
  castTicks?: number;
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
  /**
   * Projectiles burst on impact, splashing everything within this
   * radius (tiles) for half the direct hit — the heavy-orb law made
   * authorable (the wand's heavy bolt pioneered the machinery). An
   * NPC's splash hits players; a player's splash hits NPCs.
   */
  splashRadius?: number;
  /** Projectiles punch through targets instead of stopping. */
  pierce?: boolean;
  /**
   * Homing turn rate, radians/second. Projectiles seek a foe picked in
   * the aim cone at launch (fans distribute across distinct targets),
   * re-acquiring within HOMING_SEEK_RANGE when their mark dies.
   */
  homing?: number;
  /**
   * Projectile school override: shots fly as Arx bolts in this school
   * regardless of the caster's weapon — seeker wisps from a sword hand
   * still look like Arx, not arrows.
   */
  element?: string;
  /** dash_strike distance, tiles. Negative = away from the aim. */
  dashTiles?: number;
  /**
   * THE TRAVELED ROAD: how this art crosses its dashTiles — a ramped
   * `charge`/`dash`/`leap` traversal over real ticks, or a `blink`
   * that leaves through the torn veil. Absent = the shape's native
   * gait (dash_strike → dash, leap_slam → leap).
   */
  travel?: TravelKind;
  /** chain_zap: how many targets the arc can jump to. */
  chainTargets?: number;
  /** pulse_nova: pulse count and spacing. */
  pulses?: number;
  pulseEveryTicks?: number;
  status?: StatusApply;
  /**
   * THE READING EDGE: a target-conditional payoff clause. Bodies
   * carrying `status` take `mult` times this ability's damage; with
   * `consume`, the payoff SPENDS every riding entry of that state
   * for its answer — the consume verb. Resolved at the one seam
   * (stateBucket), highest-wins against the wearer's gear clauses,
   * and always printed as one sentence on the card.
   */
  vs?: { status: StatusId; mult: number; consume?: boolean };
  self?: AbilitySelf;
  /**
   * Shove strength multiplier. NEGATIVE pulls targets toward the
   * effect's center instead — the vortex tools.
   */
  knockback?: number;
  /** ground_aoe: ticks between telegraph and detonation. */
  fuseTicks?: number;
  summon?: AbilitySummon;
  /**
   * THE KIT's raising lane (enemy arts, docs/enemy-arts-plan.md): an
   * NPC caster's `summon` shape calls REAL bestiary bodies instead
   * of a prop — ephemeral (no spawn point, no respawn, the slime
   * split precedent), born into the caster's fight, and capped alive
   * per caster (`capAlive`, default `count`) so a standing summoner
   * never floods the yard. `levelDelta` offsets from the CASTER's
   * live level, so scaled reissues raise scaled dead. Player casts
   * ignore this field entirely.
   */
  summonNpc?: { npc: string; count: number; capAlive?: number; levelDelta?: number };
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
  /**
   * THE CHALLENGE: at the cast's final position, every hostile-capable
   * NPC within this radius is forced onto the caster (the decoy
   * force-switch, worn as a knight's shout). Tiles.
   */
  tauntRadius?: number;
  /**
   * tame: the survival channel's length in ticks. A craven mark
   * (hp <= GENTLE_HP_FRAC) channels in floor(channelTicks / 2) —
   * one factor, derived, never authored twice. Honable by rank.
   */
  channelTicks?: number;
  /** pet_command: which word this art speaks to the companion. */
  command?: PetCommandKind;
  /** becalm / wild_howl: how long the stilled blood stays down, ticks. */
  becalmTicks?: number;
  /**
   * Fraction of the companion's max hp restored (mend, the rise, the
   * howl, a whistle that arrives mended). The rise words read it as
   * the fraction the friend STANDS at.
   */
  petHealFrac?: number;
  /** A surge window laid on the companion by this cast. */
  petSurge?: PetSurge;
  /** A guard window laid on the companion by this cast. */
  petGuard?: PetGuard;
  /** mend: the balm also sheds every status riding the friend. */
  petCleanse?: boolean;
}

/**
 * THE HELD SIGIL: the shapes a caster aims at a POINT on the ground
 * rather than a direction. These arts arm on press and cast on
 * release — the held window steers a ghost ring (right stick or
 * mouse) so a gamepad can place the blast, not just face it. A
 * summon is point-aimed only when it has reach; rangeless summons
 * keep planting at the feet.
 */
export function groundAimed(ab: AbilityDef): boolean {
  switch (ab.shape) {
    case 'ground_aoe':
    case 'ground_field':
    case 'leap_slam':
      return true;
    // THE CHOSEN GROUND: dashes joined the ring — hold to steer the
    // road's end, release to travel that far and no farther; a bare
    // tap keeps the old full-length grammar along the facing. The
    // one disengage hop (negative tiles) stays direction-aimed: its
    // whole point is "away from HERE", not a placed landing.
    case 'dash_strike':
      return (ab.dashTiles ?? 3) > 0;
    case 'summon':
      return (ab.range ?? 0) > 0;
    default:
      return false;
  }
}

/**
 * The one ruler for a point-aimed art's reach, in tiles — the client
 * clamps its ghost ring by this and the server clamps the sent point
 * by the SAME rule, so what the ring promises is what the cast does.
 * Defaults mirror the interpreter's own (`castAbility`) fallbacks.
 */
export function groundAimRange(ab: AbilityDef): number {
  switch (ab.shape) {
    case 'ground_aoe':
      return ab.range ?? 4;
    case 'ground_field':
      return ab.range ?? 6;
    case 'leap_slam':
      return Math.abs(ab.dashTiles ?? 4);
    case 'dash_strike':
      return Math.abs(ab.dashTiles ?? 3);
    case 'summon':
      return ab.range ?? 0;
    default:
      return 0;
  }
}

/**
 * Ability slot indices. Four actives: THE SECOND HAND's two free
 * technique seats (Q and E by default — THE PAIRED HAND keeps them
 * under the same fingers, LB and LT on a pad), the relic (loot hunt),
 * and the sigil (boss trophies). THE QUICKENED HAND: on-hit and
 * on-kill haste feed slots 0 and 1 — Q is the quickened seat that
 * landed blows accelerate, the E seat keeps its own time. Where an
 * art sits is a build choice, not a wiring accident.
 *
 * The INDICES are wire and disk truth and never move: the second
 * seat's slot index stays 2 (db key 'slot', C2STechnique pins 0|2)
 * however the keymap letters it. Only the default key changed
 * (R → E, 2026-08-01); the constant is named for today's key.
 */
export const SLOT_TECH_Q = 0;
export const SLOT_RELIC = 1;
export const SLOT_TECH_E = 2;
export const SLOT_SIGIL = 3;
export const ABILITY_SLOTS = 4;
export type AbilitySlot = 0 | 1 | 2 | 3;
/** The two technique seats, in seat order (first, second). */
export const TECH_SEAT_SLOTS = [SLOT_TECH_Q, SLOT_TECH_E] as const;

// --------------------------------------------------------- techniques

/**
 * A combat school that owns a technique ladder. The school gates the
 * LEARNING (arts unlock by raising its skill) — never the hand: THE
 * FREE HAND slots any learned art whatever weapon is equipped.
 * `sneak` is the rogue's ladder, unlocked by the sneak skill; `shield`
 * is the wall's ladder, unlocked by the hidden shield skill; `twohand`
 * is the colossus's ladder, unlocked by swinging great steel;
 * `dualwield` is the twin school, unlocked by every echo that lands;
 * `polearm` is the reaching school — spear, lance, glaive, halberd,
 * pike — trained by every thrust down the long haft;
 * `combat` is the veteran's ladder, fed a share of every strike school
 * by THE SHARED LESSON — the one school every fighter is always in.
 */
export type CombatStyleId =
  | 'combat'
  | 'onehand'
  | 'archery'
  | 'arx'
  | 'sneak'
  | 'twohand'
  | 'polearm'
  | 'shield'
  | 'dualwield';

export const COMBAT_STYLES: readonly CombatStyleId[] = [
  'combat',
  'onehand',
  'archery',
  'arx',
  'sneak',
  'twohand',
  'polearm',
  'shield',
  'dualwield',
];

/**
 * THE FOURTH CITIZENSHIP OF STYLE (beastcraft arts): a technique's
 * school may also be a non-combat craft that owns a ladder —
 * beastcraft is the first. COMBAT_STYLES and the combat half-echo
 * NEVER gain these (beastcraft is never a combat school); the style
 * only gates learning and powers the cast through its own skill,
 * exactly as THE FREE HAND already allows.
 */
export type TechniqueStyleId = CombatStyleId | 'beastcraft' | 'farming';

/** Every school that owns a technique ladder — codex + climb criers. */
export const TECHNIQUE_STYLES: readonly TechniqueStyleId[] = [...COMBAT_STYLES, 'beastcraft', 'farming'];

/**
 * A learnable active: unlocked by raising the style's skill, then
 * slotted freely — the R slot takes ANY learned art regardless of the
 * equipped weapon (respec is always free — experiment!).
 */
export interface TechniqueDef {
  ability: string;
  style: TechniqueStyleId;
  unlockLevel: number;
  /**
   * THE HONED-ART LAW: the steps this art climbs past Rank I, in
   * order (index 0 = Rank II). Authored in content beside the ability.
   */
  ranks?: readonly RankStep[];
  /**
   * THE UNWRITTEN PAGE: a hidden art sits OUTSIDE the rung ladder —
   * earned by deed (an `art:<ability>` character flag), never by
   * level, and invisible everywhere until the deed is done. The
   * anchorLevel seeds rank derivation in unlockLevel's place, so an
   * earned art still grows with the hand that carries it.
   */
  hidden?: { anchorLevel: number };
  /**
   * THE SECRET LEDGER: a secret art is a weapon's Art holding a seat
   * in the technique pool — the third citizenship beside rungs and
   * unwritten pages. The seat belongs to the ART, not the tool: every
   * weapon whose `WeaponStats.art` names this ability teaches it.
   * THE LOAN LAW lends it while a teaching weapon is in either hand;
   * THE LESSON LAW converts fighting with the teacher into permanent
   * mastery (the same `art:<ability>` flag the unwritten pages earn).
   * The anchorLevel is authored from the teaching line's tier band and
   * seeds rank derivation exactly as a page's anchor does. A def is
   * exactly one of: rung (unlockLevel >= 1), hidden, or secret.
   */
  secret?: { anchorLevel: number };
}

/** The character flag that marks a hidden art as earned. */
export function artFlag(ability: string): string {
  return `art:${ability}`;
}

/**
 * THE LESSON LAW's ledger key: the flag whose INTEGER value banks a
 * secret art's mastery progress (mirrored combat XP). Deleted when the
 * meter converts — the art:<id> flag is the truth of ownership.
 */
export function lessonFlag(ability: string): string {
  return `lesson:${ability}`;
}

/**
 * THE LESSON LAW's cost dial: the mirrored combat XP a secret art
 * takes to master, scaled by its anchor. Intent: a committed session
 * or two at the weapon's own band — a bronze line's art masters in an
 * afternoon of honest fighting; a starsteel signature is a real
 * courtship. Phase 5 (THE PROVING) tunes this against live play.
 */
export function masteryXp(anchorLevel: number): number {
  return Math.round(600 * (1 + anchorLevel / 6));
}

/**
 * The level a technique's rank clock counts from: the rung for ladder
 * arts, the anchor for unwritten pages and secret arts. The ONE place
 * the choice lives — rank math, maturity tests, and bench copy all
 * read the clock through here.
 */
export function techniqueAnchor(tech: TechniqueDef): number {
  return tech.hidden?.anchorLevel ?? tech.secret?.anchorLevel ?? tech.unlockLevel;
}

/**
 * The rank an art stands at for the hand that carries it. The ONE
 * place this choice lives — server casts, codex, and hotbar all rank
 * through it. An earned page or mastered secret never ranks below I:
 * the deed (or the lessons) already opened it, so a hand below the
 * anchor simply holds an unhoned art.
 */
export function techniqueRankFor(tech: TechniqueDef, baseLevel: number): number {
  if (tech.hidden || tech.secret) {
    return Math.max(1, techniqueRank(techniqueAnchor(tech), baseLevel));
  }
  return techniqueRank(tech.unlockLevel, baseLevel);
}

// ----------------------------------------------------------- honed arts

/**
 * One rank's worth of honing: a delta merged over the base AbilityDef.
 * Values are absolute overrides, not additions — a step restates the
 * field it sharpens (and object fields like `status`/`self` are
 * replaced whole, so a step restates the full object it touches).
 *
 * Identity is un-honable by type: id, name, desc, color, code, and
 * shape never fork by rank — the art stays the same art to the eye,
 * the FX ledger, and the executor. Rank IV is where the signature
 * flourish lands; the note is player-facing bench copy.
 */
export type RankStep = Partial<
  Omit<AbilityDef, 'id' | 'name' | 'desc' | 'color' | 'code' | 'shape' | 'command'>
> & {
  /** What this rank honed — one player-facing line. */
  note: string;
};

export const TECHNIQUE_MAX_RANK = 4;

/**
 * Base-level surplus over unlockLevel required for each rank (index =
 * rank - 1) — the STANDARD clock, walked by every art anchored at 54
 * or below. The asymmetry IS the balance: an early art fully matures
 * mid-game while a late art's higher ceiling takes until the 90s —
 * at any level, a mastered old art and a growing new one are both
 * correct choices.
 */
export const RANK_SURPLUS: readonly number[] = [0, 15, 30, 45];

/**
 * THE SHORTENED CLIMB (THE LONG ROAD): the levels between rank steps
 * for a given anchor. The standard stride is 15; past anchor 54 the
 * full climb no longer fits under the 99 cap, so the stride
 * compresses — min(15, floor((99 - anchor) / 3)) — and every art,
 * however late its rung, still masters exactly by 99. The hand that
 * earned a level-90 art is already a master's hand: it hones the new
 * motion in years, not decades. Anchors at 54 and below keep the
 * standard clock unchanged.
 */
export function rankStride(anchorLevel: number): number {
  return Math.max(1, Math.min(15, Math.floor((99 - anchorLevel) / 3)));
}

export const RANK_ROMAN: readonly string[] = ['', 'I', 'II', 'III', 'IV'];

/**
 * The rank an art stands at for a BASE skill level (gear never jumps
 * a rank — mastery belongs to the hand, not the wardrobe). 0 = not
 * yet unlocked. Thresholds walk THE SHORTENED CLIMB's stride.
 */
export function techniqueRank(unlockLevel: number, baseLevel: number): number {
  if (baseLevel < unlockLevel) return 0;
  const surplus = baseLevel - unlockLevel;
  const rank = 1 + Math.floor(surplus / rankStride(unlockLevel));
  return Math.min(rank, TECHNIQUE_MAX_RANK);
}

/** The base level at which an art reaches `rank` (1-based). */
export function rankLevel(unlockLevel: number, rank: number): number {
  return unlockLevel + rankStride(unlockLevel) * (rank - 1);
}

/**
 * Resolve the ability an art actually casts at a rank: rank steps
 * merged in order over the base def. Rank I (or an unranked art)
 * returns the base object untouched — the resolver is the ONE place
 * server casts and codex previews agree, so it must stay pure.
 */
export function honedAbility(
  ab: AbilityDef,
  ranks: readonly RankStep[] | undefined,
  rank: number,
): AbilityDef {
  if (!ranks || ranks.length === 0 || rank <= 1) return ab;
  let out = ab;
  const steps = Math.min(rank - 1, ranks.length);
  for (let i = 0; i < steps; i++) {
    const step = ranks[i];
    if (!step) continue;
    const { note: _note, ...delta } = step;
    out = { ...out, ...delta };
  }
  return out;
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
  /**
   * THE SLIPPED BLOW's worn lane: a flat chance that a blow misses the
   * body entirely (sim/evasion.ts folds it with leather, sneak, buffs).
   */
  | 'wolf_reflexes'
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
  wolf_reflexes: {
    name: 'Wolf Reflexes',
    desc: 'Blows have a 10% chance to slip past you entirely.',
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
