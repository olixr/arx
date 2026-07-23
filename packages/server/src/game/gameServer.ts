import { randomBytes } from 'node:crypto';
import {
  CHUNK_SIZE,
  EcsWorld,
  EntityKind,
  INTEREST_CHUNK_RADIUS,
  PLAYER_SPEED,
  PoseState,
  RECONNECT_GRACE_MS,
  TICK_DT,
  TICK_MS,
  TIME_NAMES,
  chunkKey,
  clockHoursAtTick,
  ofsForHours,
  encodeChunk,
  encodeSnapshot,
  encodeTilePatch,
  isSkillId,
  levelForXp,
  stepMovement,
  xpForLevel,
  type EntityId,
  type EntityMeta,
  type InputFrame,
  type CarryStyle,
  type Look,
  type InvSlot,
  MAX_ITEM_POWER,
  type ItemRoll,
  type EquippedItem,
  type SkillId,
  type SkillXp,
  type SnapshotEntity,
  isRarityTier,
  saplingOf,
  Tile,
  chestInfo,
  closedChestTile,
  openChestTile,
  doorInfo,
  openDoorTile,
  shutDoorTile,
  type ChestInfo,
  type ChestKind,
  type DoorInfo,
  destructibleInfo,
  nearestFloorTile,
  TILE_DEFS,
  type DestructibleInfo,
} from '@devcraft/shared';
import {
  BUILDABLES,
  buildableGround,
  CROP_BY_SEED,
  CROPS,
  GENERAL_STORE,
  NODES_BY_TILE,
  NPCS,
  RECIPES,
  STARTER_KIT,
  TOOL_TIER_NAMES,
  TOWN_SPAWNS,
  abilityDef,
  actorAppearance,
  actorCombatDef,
  bandDy,
  growMs,
  isCropTile,
  aggregateGearStats,
  craftRarityWeights,
  effectiveReq,
  instanceName,
  isTwoHanded,
  itemDef,
  makeRoll,
  npcHitHeight,
  GEM_BATTLESTAFFS,
  pickRarity,
  enchantDef,
  rollLoot,
  rolledStats,
  trinketPowerMult,
  weaponStrikeEffects,
  type GearStats,
  stageEndMs,
  stageForElapsed,
  techniqueDef,
  tileForStage,
  type BuildableDef,
  type CropDef,
  type NodeDef,
  type NpcActorDef,
  type NpcDef,
  type ZoneActorSpawn,
  type RecipeDef,
  type WeaponStats,
} from '@devcraft/content';
import {
  COMBO_GRACE_TICKS,
  COMBO_STAGES,
  DODGE_COOLDOWN_SEQ,
  DRAW_FULL_TICKS,
  DRAW_MIN_TICKS,
  DRAW_MOVE_FACTOR,
  FINISHER_DAMAGE_MULT,
  FINISHER_KNOCKBACK_MULT,
  FINISHER_RECOVERY_MULT,
  ABILITY_SLOTS,
  BODY_RADIUS,
  BURN_TICK_EVERY,
  BLEED_TICK_EVERY,
  CHILL_SPEED_FACTOR,
  COMBAT_STYLES,
  HEAVY_BOLT_KNOCKBACK,
  HEAVY_BOLT_MULT,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  HOMING_SEEK_RANGE,
  VENOM_TICK_EVERY,
  InputButton,
  SHOCK_MAX_TICKS,
  SLOT_ART,
  SLOT_RELIC,
  SLOT_SIGIL,
  SLOT_TECHNIQUE,
  SNAP_GRACE_TICKS,
  SNAP_RECOVERY_TICKS,
  SNEAK_HIDDEN_BIT,
  SNEAK_DETECTED_BIT,
  SNEAK_HIDE_LEVEL,
  SNEAK_MOVE_HIDE_LEVEL,
  SNEAK_STILL_TICKS,
  SNEAK_REVEAL_LOCK_TICKS,
  SNEAK_XP_PERIOD_TICKS,
  SNEAK_XP_MIN_MOVE,
  SNEAK_XP_RADIUS,
  BACKSTAB_MULT_DEFAULT,
  BACKSTAB_XP_BASE,
  DUALWIELD_UNLOCK_MELEE,
  HIDDEN_SKILLS,
  OFFHAND_DELAY_TICKS,
  offhandDamageFactor,
  sneakDetectionFactor,
  STATION_TILES,
  STATUS_BIT,
  WALL_RUN_TILES,
  applyDodge,
  diagWallInfo,
  orientDiagWall,
  chargedShot,
  circleHitsSolid,
  pointHitsSolid,
  drawCharge,
  hasButton,
  hasteOnHit,
  isDrawSlowed,
  isBehind,
  nextComboStage,
  nextSnapStage,
  reactionDamage,
  reactionFor,
  snapShot,
  type AbilityDef,
  type AbilitySlot,
  type ActiveStatus,
  type CombatStyleId,
  type EquipSlot,
  type PassiveId,
  type S2CFx,
  type StatusApply,
} from '@devcraft/shared';
import { config } from '../config.js';
import { Session, sanitizeName } from '../net/session.js';
import type { AccountStore, CharacterRow } from '../db/accounts.js';
import type { WorldSource } from '../world/worldSource.js';
import { dungeonOrigin, generateDungeon } from '../dungeon/generate.js';
import {
  DUNGEON_KEY_ITEM,
  RARITY_TIERS,
  dungeonSpecFromRoll,
  mintKeyPower,
  type DungeonSpec,
} from '@devcraft/shared';
import { scaleNpcDef } from '@devcraft/content';
import { addItem, bestTool, countItem, emptyInventory, hasSpaceFor, removeItem, takeSlot } from './inventory.js';
import { DROP_MERGE_RADIUS, canMergeDrop } from './drops.js';

interface PositionComp {
  x: number;
  y: number;
  dir: number;
}

interface HealthComp {
  hp: number;
  maxHp: number;
}

interface GatherAction {
  kind: 'gather';
  tx: number;
  ty: number;
  node: NodeDef;
  ticksLeft: number;
}

interface CraftAction {
  kind: 'craft';
  recipe: RecipeDef;
  remaining: number;
  ticksLeft: number;
}

interface BuildAction {
  kind: 'build';
  buildable: BuildableDef;
  tx: number;
  ty: number;
  ticksLeft: number;
}

interface HarvestAction {
  kind: 'harvest';
  tx: number;
  ty: number;
  ticksLeft: number;
}

type PlayerAction = GatherAction | CraftAction | BuildAction | HarvestAction;

/** A planted crop; stage derives from (now − plantedAt + boostMs). */
interface CropState {
  def: CropDef;
  tx: number;
  ty: number;
  plantedAt: number;
  /** Watering credit in ms, added to elapsed time. */
  boostMs: number;
  /** Bitmask of stages already watered (bit 0 = sprout, bit 1 = mid). */
  watered: number;
  /** Owner character id — only they may harvest. */
  owner: number;
  /** Last stage broadcast, so the grower only patches transitions. */
  lastStage: 0 | 1 | 2;
}

interface NpcComp {
  def: NpcDef;
  originX: number;
  originY: number;
  state: 'idle' | 'chase' | 'return';
  targetEid: EntityId | null;
  /** Wander steering, re-rolled every few seconds. */
  wanderUntilTick: number;
  wanderX: number;
  wanderY: number;
  attackCooldown: number;
  /** Telegraph: ticks until a wound-up attack actually lands. */
  windupTicks: number;
  /** Index into spawnPoints to free on death. */
  spawnIndex: number;
  poseUntilTick: number;
  /** Ticks until the special attack may fire again. */
  specialCooldown: number;
  /** Livestock: earliest wall-clock ms this animal may be milked again. */
  nextProduceAt: number;
  /** Livestock: next wall-clock ms this animal lays (0 = never). */
  nextLayAt: number;
}

/**
 * A placed NPC actor — the IDENTITY riding an entity (content/actors).
 * Fightable actors also carry NpcComp (their combat body, synthesized
 * by actorCombatDef); friendly ones carry only this, which is exactly
 * what makes them unhittable — no NpcComp, no membership in any
 * combat loop, by construction.
 */
interface ActorComp {
  actor: NpcActorDef;
  /** Index into actorSpawnPoints to free on death; -1 = ephemeral. */
  spawnIndex: number;
  /** Resting facing — where the post looks when nobody's around. */
  homeDir: number;
  /** Rotating cursor into actor.lines for interactions. */
  nextLine: number;
}

interface DropComp {
  item: string;
  qty: number;
  /** Only this player may pick it up until ownerUntil. */
  ownerEid: EntityId | null;
  ownerUntil: number;
  despawnAt: number;
  /**
   * No walk-over pickup before this — freshly killed loot gets a beat
   * to land visually, and a player-dropped bag doesn't teleport
   * straight back into the pack it just left.
   */
  pickupAfter: number;
  /** Skill XP granted to whoever picks this up (laid eggs). */
  xpOnPickup?: { skill: SkillId; xp: number };
  /** Instance roll for dropped gear — survives the round trip. */
  roll?: ItemRoll;
}

interface ProjectileComp {
  ownerEid: EntityId;
  style: 'archery' | 'magic';
  maxHit: number;
  dirX: number;
  dirY: number;
  speed: number;
  distLeft: number;
  /** Basic attacks feed on-hit haste; ability projectiles do not. */
  basic?: boolean;
  /** Full-draw arrows haste harder on hit. */
  fullDraw?: boolean;
  /** Input-frame seq that fired this shot — broadcast in meta so the
   *  owner's client can hand its predicted tracer off (v8). */
  spawnSeq?: number;
  /** Status carried onto whatever this hits. */
  status?: StatusApply;
  /** Punches through targets instead of stopping at the first. */
  pierce?: boolean;
  /** Targets already struck (pierce double-hit guard). */
  hitEids?: Set<EntityId>;
  /** NPC-fired: seeks players (and decoys) instead of NPCs. */
  fromNpc?: boolean;
  /** The wand's heavy third bolt — fat visual, shove on impact. */
  heavy?: boolean;
  /** Splash damage radius around the impact point. */
  splashRadius?: number;
  /**
   * Magic school riding the shot — cosmetic. Reaches clients as a
   * `magic:<element>` defId suffix; the renderer tints bolt, flash,
   * and impact from it.
   */
  element?: string;
  /** Homing turn rate, radians/sec — the shot steers toward targetEid. */
  homingTurn?: number;
  /** The foe a homing shot is hunting (re-acquired when it dies). */
  targetEid?: EntityId;
  /** Boomerang: instead of dying at range/walls, fly back to the owner. */
  returns?: boolean;
  /** Boomerang return leg in progress (homes on the owner's live position). */
  returning?: boolean;
  /** Execute: targets below frac of max HP take mult× damage. */
  executeBelow?: { frac: number; mult: number };
  /** Fraction of damage dealt healed back to the owner. */
  drainFrac?: number;
}

/** A status riding an entity, remembering who put it there. */
interface ServerStatus extends ActiveStatus {
  sourceEid: EntityId;
  /** Shock only: remaining hard-stun ticks (shorter than the status). */
  stunLeft?: number;
}

/** A placed totem/trap/decoy. */
interface SummonComp {
  kind: 'heal_totem' | 'snare_trap' | 'decoy';
  ownerEid: EntityId;
  radius: number;
  power: number;
  ticksLeft: number;
}

/** A telegraphed blast waiting on its fuse. */
interface PendingBlast {
  x: number;
  y: number;
  radius: number;
  damage: number;
  knockback: number;
  status?: StatusApply;
  fuseLeft: number;
  ownerEid: EntityId;
  style: SkillId;
  /** NPC blasts hurt players; player blasts hurt NPCs. */
  fromNpc: boolean;
  color: string;
  /** pulse_nova: burst at the caster's LIVE position (spin that moves). */
  followCaster?: boolean;
  /** Ability that scheduled it — rides the fx so clients paint its identity. */
  abilityId?: string;
  /**
   * Flurry strikes: only targets inside this half-angle around arcAim
   * (from the blast center) are hit, and the fx is an 'arc' swing.
   */
  arcAim?: number;
  arcHalf?: number;
  executeBelow?: { frac: number; mult: number };
  drainFrac?: number;
}

/** A lingering hazard zone pulsing damage while it lives. */
interface ActiveField {
  x: number;
  y: number;
  radius: number;
  /** Damage per pulse. */
  damage: number;
  everyTicks: number;
  ticksLeft: number;
  status?: StatusApply;
  ownerEid: EntityId;
  style: SkillId;
  fromNpc: boolean;
  knockback: number;
  drainFrac?: number;
}

interface SpawnState {
  npc: string;
  x: number;
  y: number;
  radius: number;
  eid: EntityId | null;
  respawnAt: number;
  /** Inactive spawn points are skipped (torn-down dungeon instances). */
  active: boolean;
  /** Scale the def to this combat level (dungeon garrisons). */
  level?: number;
  /** Display-name override (named bosses, hidden-room wardens). */
  name?: string;
}

/** One placed actor's post — exact spot, no scatter, no count. */
interface ActorSpawnState {
  actor: string;
  x: number;
  y: number;
  dir?: number;
  eid: EntityId | null;
  respawnAt: number;
}

/**
 * A live dungeon instance — one per character, cut from a key. The
 * key identity (seed/tier/power) is stored so turning the SAME key
 * walks back into the same live run, while a different key tears the
 * old instance down and cuts a new one.
 */
interface DungeonInstance {
  zoneId: string;
  spawnIndexes: number[];
  slot: number;
  entry: { x: number; y: number };
  seed: number;
  tier: string;
  /** Recommended combat level — dungeon chests roll at least this. */
  power: number;
  /** Zone x-extent, for locating which instance owns a tile. */
  x0: number;
  x1: number;
}

interface PlayerComp {
  name: string;
  speed: number;
  /** Chosen base look; null until the player has been through creation. */
  look: Look | null;
  /** Cosmetic idle weapon-carry preference ('rogue' = reverse grip). */
  carryStyle: CarryStyle;
  /** Off-fist grip preference — a dual wielder sets each hand its own. */
  carryOff: CarryStyle;
  /** DB character id; negative for ephemeral guests. */
  characterId: number;
  accountId: number | null;
  /** Session token the client reconnects with. */
  token: string;
  session: Session | null;
  disconnectedAt: number | null;
  inputQueue: InputFrame[];
  lastProcessedSeq: number;
  skills: SkillXp;
  inventory: InvSlot[];
  action: PlayerAction | null;
  /** Bank contents; null for guests (no persistence, no bank). */
  bank: Record<string, number> | null;
  bankDirty: boolean;
  equipment: Partial<Record<EquipSlot, EquippedItem>>;
  /**
   * Everything worn gear does, aggregated ONCE per equipment change —
   * never recomputed per hit or per movement frame. See recomputeGear.
   */
  gear: GearStats;
  attackCooldown: number;
  /** Dual wield: ticks until the offhand echo strike lands (0 = none). */
  offhandEchoTicks: number;
  /** Aim captured at the mainhand swing its echo mirrors. */
  offhandEchoAim: number;
  lastCombatAt: number;
  poseUntilTick: number;
  lastDodgeSeq: number;
  /** Ticks the bow has been drawn; 0 = not drawing. */
  drawTicks: number;
  /** Client-reported adaptive interp delay, ms (v8) — exact lag comp. */
  viewMs?: number;
  /** Stage of the previous melee swing (0/1/2). */
  comboStage: number;
  /** Swinging again before this tick continues the combo string. */
  comboGraceUntilTick: number;
  /** Remaining cooldown ticks: [Art, relic, technique, sigil]. */
  abilityCd: [number, number, number, number];
  /** Buttons of the last processed frame — abilities fire on press edge. */
  prevButtons: number;
  /** Rooted mid-cast until this tick (ability commitment window). */
  castFreezeUntilTick: number;
  /** Active self buffs (ability + passive sources stack). */
  buffs: PlayerBuff[];
  /** Chosen technique ability per combat style. */
  techniques: Record<string, string>;
  /** Snap-shot rhythm: stage of the last snap and its grace window. */
  snapStage: number;
  snapGraceUntilTick: number;
  /** Stage of the previous staff bolt (wand 1-2-HEAVY rhythm). */
  boltStage: number;
  boltGraceUntilTick: number;
  /** Crouch latch from the last processed frame (held bit, survives empty ticks). */
  sneaking: boolean;
  /** Consecutive ticks without movement while sneaking. */
  sneakStillTicks: number;
  /** Fully hidden from other players and NPCs. */
  hidden: boolean;
  /** Re-hiding is locked until this tick (attacked / took damage). */
  revealLockUntilTick: number;
  /** Tiles moved while sneaking since the last XP pulse (anti-AFK gate). */
  sneakMoveAccum: number;
}

/** A timed self-effect; multiple can ride at once (speeds multiply). */
interface PlayerBuff {
  speedMult: number;
  shieldHp: number;
  meleeLifesteal: number;
  /** Gathering speed multiplier (best across buffs wins). */
  gatherSpeed: number;
  /** HP restored every 4 seconds (best across buffs wins). */
  regenPer4s: number;
  /** While active, landed basic attacks apply this status (Envenom). */
  onHitStatus?: StatusApply;
  untilTick: number;
  /**
   * Consumable channel: one 'tonic' + one 'food' buff may be active at
   * a time; a new drink/meal replaces its channel. Combat buffs
   * (abilities, passives) leave this unset and stack freely. Weapon
   * oils are NOT buffs — they live on the weapon instance (roll.coat).
   */
  channel?: 'tonic' | 'food';
  /** Item that granted it + display name — drives the HUD chip. */
  itemId?: string;
  name?: string;
}

/** Buff with the passive-combat defaults filled in. */
function mkBuff(partial: Partial<PlayerBuff> & { untilTick: number }): PlayerBuff {
  return {
    speedMult: 1,
    shieldHp: 0,
    meleeLifesteal: 0,
    gatherSpeed: 1,
    regenPer4s: 0,
    ...partial,
  };
}

const MAX_QUEUED_INPUTS = 8;
/**
 * Input frames simulated per tick. Nominal flow is 1/tick; the surplus
 * is CATCH-UP after a network stall — at 2, a 500ms burst of buffered
 * inputs took another 500ms to drain (sustained input lag); at 4 the
 * same backlog clears in ~150ms. Sustained speed cheating is bounded
 * by the session input token bucket (25/s), not this number.
 */
const MAX_INPUTS_PER_TICK = 4;
const SAVE_INTERVAL_TICKS = 600; // 30s
/** World-y extent of the player's visual body above its ground point
 * (screen height ÷ camera pitch) — NPC shots test the feet→crown band. */
const PLAYER_HIT_HEIGHT = 1.9;

/**
 * Damage roll with a 10% base crit chance (guaranteed heavy hit).
 * `critBonusPct` — extra percentage points from gear effects/enchants.
 */
function rollDamage(maxHit: number, critBonusPct = 0): { dmg: number; crit: boolean } {
  if (Math.random() < 0.1 + critBonusPct / 100) {
    return { dmg: maxHit + Math.ceil(maxHit * 0.5), crit: true };
  }
  return { dmg: Math.floor(Math.random() * (maxHit + 1)), crit: false };
}

/**
 * Basic-attack roll: a landed basic ALWAYS chips at least 1. At
 * hack-and-slash cadence a stream of zero-rolls reads as broken, and
 * reliable chips are what make on-hit haste a rhythm you can trust.
 */
function rollBasic(maxHit: number, critBonusPct = 0): { dmg: number; crit: boolean } {
  const roll = rollDamage(maxHit, critBonusPct);
  return { dmg: Math.max(1, roll.dmg), crit: roll.crit };
}

export class GameServer {
  tickCount = 0;
  /** World-clock offset in ticks; only the dev `/time` command bends it. */
  timeOfsTicks = 0;

  private readonly ecs = new EcsWorld();
  readonly kinds = this.ecs.register<EntityKind>();
  readonly positions = this.ecs.register<PositionComp>();
  readonly poses = this.ecs.register<PoseState>();
  readonly healths = this.ecs.register<HealthComp>();
  readonly players = this.ecs.register<PlayerComp>();
  readonly npcs = this.ecs.register<NpcComp>();
  readonly actors = this.ecs.register<ActorComp>();
  readonly drops = this.ecs.register<DropComp>();
  readonly projectiles = this.ecs.register<ProjectileComp>();
  readonly statuses = this.ecs.register<ServerStatus[]>();
  readonly summons = this.ecs.register<SummonComp>();

  /** Telegraphed blasts (ground AoEs) waiting to detonate. */
  private readonly pendingBlasts: PendingBlast[] = [];

  /** Lingering hazard zones (ground_field) pulsing while they live. */
  private readonly activeFields: ActiveField[] = [];

  private readonly spawnPoints: SpawnState[] = [];
  /** Actor definitions by slug — loaded from the DB at boot (DB-first). */
  private readonly actorDefs = new Map<string, NpcActorDef>();
  private readonly actorSpawnPoints: ActorSpawnState[] = [];

  private readonly sessions = new Set<Session>();
  /** In-world players by character id (blocks duplicate logins). */
  private readonly characterEids = new Map<number, EntityId>();
  /** Ephemeral guest tokens -> eid (guests have no DB session). */
  private readonly guestTokens = new Map<string, EntityId>();
  private nextGuestId = -1;

  /**
   * MELEE LAG COMPENSATION. A swing is aimed at what the attacker SAW —
   * NPC positions ~(half their RTT + interp delay) in the past. Testing
   * the live positions instead made strafing targets feel like they
   * slid out from under landed hits. Each tick every NPC logs
   * [x, y, dir] into an 8-slot ring (400ms of history); meleeSwing
   * rewinds its range/arc/backstab TESTS by the attacker's estimated
   * view delay. Damage still lands on the live entity — only the
   * "did you hit what you saw" question is answered in the past.
   */
  private readonly npcHist = new Map<EntityId, Float32Array>();

  /** History ring slots (× TICK_MS = rewind ceiling, 400ms). */
  private static readonly HIST_TICKS = 8;

  /** Client interp-delay estimate for rewind (the adaptive client
   *  floor sits at 80, worst ~200; 100 + slop covers the spread). */
  private static readonly VIEW_INTERP_MS = 100;

  private recordNpcHistory(): void {
    for (const [eid] of this.npcs) {
      const pos = this.positions.get(eid);
      if (!pos) continue;
      let ring = this.npcHist.get(eid);
      if (!ring) {
        ring = new Float32Array(GameServer.HIST_TICKS * 3);
        // Prefill with the live position so a fresh spawn rewinds to
        // itself instead of to (0,0).
        for (let i = 0; i < GameServer.HIST_TICKS; i++) {
          ring[i * 3] = pos.x;
          ring[i * 3 + 1] = pos.y;
          ring[i * 3 + 2] = pos.dir;
        }
        this.npcHist.set(eid, ring);
      }
      const slot = (this.tickCount % GameServer.HIST_TICKS) * 3;
      ring[slot] = pos.x;
      ring[slot + 1] = pos.y;
      ring[slot + 2] = pos.dir;
    }
    // Dead NPCs' rings retire lazily — a full sweep every 10s.
    if (this.tickCount % 200 === 0) {
      for (const eid of this.npcHist.keys()) {
        if (!this.npcs.has(eid)) this.npcHist.delete(eid);
      }
    }
  }

  /** An NPC's position `ticksAgo` ticks back (clamped to the ring). */
  private npcPosAt(eid: EntityId, ticksAgo: number): { x: number; y: number; dir: number } | null {
    const live = this.positions.get(eid);
    if (!live) return null;
    if (ticksAgo <= 0) return live;
    const ring = this.npcHist.get(eid);
    if (!ring) return live;
    const back = Math.min(ticksAgo, GameServer.HIST_TICKS - 1);
    const slot = (((this.tickCount - back) % GameServer.HIST_TICKS) + GameServer.HIST_TICKS) % GameServer.HIST_TICKS * 3;
    return { x: ring[slot]!, y: ring[slot + 1]!, dir: ring[slot + 2]! };
  }

  /** How many ticks back this player's screen is showing NPCs. */
  private viewRewindTicks(player: PlayerComp): number {
    const rtt = player.session?.viewRttMs ?? 0;
    // v8 clients report their live adaptive interp delay; the constant
    // is only the fallback for a client that hasn't reported yet.
    const viewMs = rtt / 2 + (player.viewMs ?? GameServer.VIEW_INTERP_MS);
    return Math.max(0, Math.min(GameServer.HIST_TICKS - 1, Math.round(viewMs / TICK_MS)));
  }

  /** chunkKey -> entities inside; the interest-management index. */
  private readonly chunks = new Map<string, Set<EntityId>>();
  private readonly entityChunk = new Map<EntityId, string>();

  /** Depleted nodes waiting to come back. */
  private readonly respawnQueue: Array<{
    at: number;
    tx: number;
    ty: number;
    tile: Tile;
    /**
     * Respawn only if the ground still holds this tile — a smashed
     * prop whose floor someone has since built over stays gone rather
     * than stomping the new construction.
     */
    over?: Tile;
  }> = [];

  /**
   * Locked doors, keyed by the door unit's anchor tile (`"tx,ty"` of
   * the west-most / north-most member of a wide run). A locked door
   * refuses to open — the /lock command toggles it for now; keys and
   * ownership arrive with a later epic. In-memory, like every other
   * world mutation.
   */
  private readonly doorLocks = new Set<string>();

  /** Players some NPC is chasing this tick — drives the DETECTED status bit. */
  private readonly chasedPlayers = new Set<EntityId>();

  /** Planted crops by "tx,ty". */
  private readonly crops = new Map<string, CropState>();

  private timer: NodeJS.Timeout | null = null;

  /** Active per-character dungeon instances. */
  private readonly dungeons = new Map<number, DungeonInstance>();
  private nextDungeonSlot = 0;

  constructor(
    private readonly world: WorldSource,
    private readonly accounts: AccountStore,
  ) {
    this.registerSpawns(TOWN_SPAWNS);
  }

  /**
   * Load persisted crops at boot. Stage is computed fresh from the
   * timestamps, so fields kept growing the whole time the server (or
   * the farmer) was away.
   */
  loadCrops(
    rows: Array<{
      tx: number;
      ty: number;
      crop: string;
      plantedAt: number;
      boostMs: number;
      watered: number;
      owner: number;
    }>,
  ): void {
    const now = Date.now();
    for (const row of rows) {
      const def = CROPS.get(row.crop);
      if (!def) continue; // a removed crop id — let the row rot
      const stage = stageForElapsed(def, now - row.plantedAt + row.boostMs);
      this.crops.set(`${row.tx},${row.ty}`, {
        def,
        tx: row.tx,
        ty: row.ty,
        plantedAt: row.plantedAt,
        boostMs: row.boostMs,
        watered: row.watered,
        owner: row.owner,
        lastStage: stage,
      });
      this.world.registerCropTile(row.tx, row.ty, tileForStage(def, stage));
    }
  }

  /** Expand spawn tables into scattered points; returns their indexes. */
  registerSpawns(
    spawns: ReadonlyArray<{
      npc: string;
      x: number;
      y: number;
      radius: number;
      count: number;
      level?: number;
      name?: string;
    }>,
  ): number[] {
    const indexes: number[] = [];
    for (const spawn of spawns) {
      for (let i = 0; i < spawn.count; i++) {
        const angle = (i / spawn.count) * Math.PI * 2;
        const r = spawn.radius * 0.6;
        indexes.push(this.spawnPoints.length);
        this.spawnPoints.push({
          npc: spawn.npc,
          x: spawn.x + Math.cos(angle) * r,
          y: spawn.y + Math.sin(angle) * r,
          radius: spawn.radius,
          eid: null,
          respawnAt: 0,
          active: true,
          level: spawn.level,
          name: spawn.name,
        });
      }
    }
    return indexes;
  }

  /**
   * Install the actor roster (loaded DB-first at boot). Must run
   * before registerActorSpawns — a placement without its identity is
   * a content error worth hearing about.
   */
  registerActors(defs: Iterable<NpcActorDef>): void {
    for (const def of defs) this.actorDefs.set(def.id, def);
  }

  /** Register placed actors — exact posts, one body each. */
  registerActorSpawns(spawns: ReadonlyArray<ZoneActorSpawn>): void {
    for (const spawn of spawns) {
      if (!this.actorDefs.has(spawn.actor)) {
        console.warn(`[npc] placement references unknown actor '${spawn.actor}' — skipped`);
        continue;
      }
      this.actorSpawnPoints.push({
        actor: spawn.actor,
        x: spawn.x,
        y: spawn.y,
        dir: spawn.dir,
        eid: null,
        respawnAt: 0,
      });
    }
  }

  start(): void {
    let next = performance.now();
    const loop = () => {
      next += TICK_MS;
      this.tick();
      this.timer = setTimeout(loop, Math.max(0, next - performance.now()));
    };
    this.timer = setTimeout(loop, TICK_MS);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.saveAll();
    for (const s of this.sessions) s.close();
  }

  // ------------------------------------------------------------- auth

  hello(session: Session, opts: { name?: string; token?: string }): void {
    if (opts.token) {
      // Guest reconnect within grace?
      const guestEid = this.guestTokens.get(opts.token);
      if (guestEid !== undefined && this.players.has(guestEid)) {
        this.bindSession(session, guestEid);
        return;
      }
      const res = this.accounts.resumeSession(opts.token);
      if (res.ok) {
        this.enterWorld(session, res.character, res.accountId, opts.token);
        return;
      }
      session.sendJson({ t: 'authErr', reason: res.reason });
      session.sendJson({ t: 'authRequired' });
      return;
    }

    if (opts.name && config.allowGuest) {
      const name = sanitizeName(opts.name);
      if (!name) {
        session.sendJson({ t: 'authErr', reason: 'invalid name' });
        return;
      }
      const spawn = this.world.spawn;
      const character: CharacterRow = {
        id: this.nextGuestId--,
        account_id: 0,
        name,
        x: spawn.x,
        y: spawn.y,
        hp: 10,
      };
      const token = randomBytes(18).toString('base64url');
      const eid = this.enterWorld(session, character, null, token);
      if (eid !== null) this.guestTokens.set(token, eid);
      return;
    }

    session.sendJson({ t: 'authRequired' });
  }

  login(session: Session, user: string, pass: string): void {
    const res = this.accounts.login(user, pass);
    if (!res.ok) {
      session.sendJson({ t: 'authErr', reason: res.reason });
      return;
    }
    const token = this.accounts.createSession(res.accountId);
    this.enterWorld(session, res.character, res.accountId, token);
  }

  register(session: Session, user: string, pass: string, name: string): void {
    const res = this.accounts.register(user, pass, name, this.world.spawn);
    if (!res.ok) {
      session.sendJson({ t: 'authErr', reason: res.reason });
      return;
    }
    const token = this.accounts.createSession(res.accountId);
    this.enterWorld(session, res.character, res.accountId, token);
  }

  /** Spawn (or rebind to) the character's entity and send welcome. */
  private enterWorld(
    session: Session,
    character: CharacterRow,
    accountId: number | null,
    token: string,
  ): EntityId | null {
    const existing = this.characterEids.get(character.id);
    if (existing !== undefined && this.players.has(existing)) {
      const player = this.players.must(existing);
      player.token = token;
      this.bindSession(session, existing);
      return existing;
    }

    // Load progression; brand-new characters get the starter kit and
    // RS-style vitality 10.
    let skills: SkillXp;
    let inventory: InvSlot[];
    let equipment: Partial<Record<EquipSlot, EquippedItem>> = {};
    if (character.id > 0) {
      skills = this.accounts.loadSkills(character.id) as SkillXp;
      inventory = this.accounts.loadInventory(character.id, 28);
      equipment = this.accounts.loadEquipment(character.id) as Partial<
        Record<EquipSlot, EquippedItem>
      >;
      if (Object.keys(skills).length === 0) {
        skills = { vitality: xpForLevel(10) };
        inventory = emptyInventory();
        for (const grant of STARTER_KIT) addItem(inventory, grant.item, grant.qty);
        this.accounts.saveSkills(character.id, skills as Record<string, number>);
        this.accounts.saveInventory(character.id, inventory);
      }
    } else {
      skills = { vitality: xpForLevel(10) };
      inventory = emptyInventory();
      for (const grant of STARTER_KIT) addItem(inventory, grant.item, grant.qty);
    }
    // Two-hands sanitize: saves from before the law (or edited rows) may
    // pair a bow/staff with a held offhand — stow the offhand at login.
    // If the pack can't take it, it stays worn as legacy grace; the
    // equip path keeps the state from ever being built again.
    {
      const main = equipment.weapon ? itemDef(equipment.weapon.id) : undefined;
      const off = equipment.offhand;
      if (main && isTwoHanded(main) && off && !itemDef(off.id)?.backMounted) {
        if (addItem(inventory, off.id, 1, off.roll) === 1) delete equipment.offhand;
      }
    }
    const gear = aggregateGearStats(equipment);
    // Max HP = BASE vitality level + worn maxHp affixes (gear bonuses to
    // the vitality SKILL power actions, never HP — no double-dipping).
    const maxHp = levelForXp(skills.vitality ?? 0) + gear.maxHp;

    // Rescue characters saved somewhere that no longer exists — a delve
    // instance that died with the server, or any solid tile.
    let spawnX = character.x;
    let spawnY = character.y;
    if (
      spawnY >= 8192 ||
      this.world.isSolid(Math.floor(spawnX), Math.floor(spawnY))
    ) {
      const safe = this.world.spawn;
      spawnX = safe.x;
      spawnY = safe.y;
    }

    const eid = this.ecs.create();
    this.kinds.set(eid, EntityKind.Player);
    this.positions.set(eid, { x: spawnX, y: spawnY, dir: 0 });
    this.poses.set(eid, PoseState.Idle);
    this.healths.set(eid, { hp: Math.min(character.hp, maxHp), maxHp });
    const grips =
      character.id > 0
        ? this.accounts.loadCarryStyles(character.id)
        : { main: 'normal' as CarryStyle, off: 'normal' as CarryStyle };
    this.players.set(eid, {
      name: character.name,
      speed: PLAYER_SPEED,
      look: character.id > 0 ? this.accounts.loadLook(character.id) : null,
      carryStyle: grips.main,
      carryOff: grips.off,
      characterId: character.id,
      accountId,
      token,
      session: null,
      disconnectedAt: null,
      inputQueue: [],
      lastProcessedSeq: 0,
      skills,
      inventory,
      action: null,
      bank: character.id > 0 ? this.accounts.loadBank(character.id) : null,
      bankDirty: false,
      equipment,
      gear,
      attackCooldown: 0,
      offhandEchoTicks: 0,
      offhandEchoAim: 0,
      lastCombatAt: 0,
      poseUntilTick: 0,
      lastDodgeSeq: -999,
      drawTicks: 0,
      comboStage: 0,
      comboGraceUntilTick: 0,
      abilityCd: [0, 0, 0, 0],
      prevButtons: 0,
      castFreezeUntilTick: 0,
      buffs: [],
      techniques: character.id > 0 ? this.accounts.loadTechniques(character.id) : {},
      snapStage: 0,
      snapGraceUntilTick: 0,
      boltStage: 0,
      boltGraceUntilTick: 0,
      sneaking: false,
      sneakStillTicks: 0,
      hidden: false,
      revealLockUntilTick: 0,
      sneakMoveAccum: 0,
    });
    this.characterEids.set(character.id, eid);
    this.updateChunkMembership(eid);
    this.bindSession(session, eid);
    this.systemChatAll(`${character.name} has joined the world.`);
    console.log(`[game] ${character.name} joined (eid ${eid}), ${this.players.size} online`);
    return eid;
  }

  /** Attach a socket to a player entity (fresh join or reconnect). */
  private bindSession(session: Session, eid: EntityId): void {
    const player = this.players.must(eid);
    if (player.session) {
      player.session.sendJson({ t: 'reject', reason: 'logged in from another window' });
      player.session.playerEid = null;
      player.session.close();
      this.sessions.delete(player.session);
    }
    player.session = session;
    player.disconnectedAt = null;
    player.inputQueue.length = 0;
    // A fresh client restarts its input numbering from 1 — accepting the
    // old high-water mark would silently drop all of its movement.
    player.lastProcessedSeq = 0;
    player.lastDodgeSeq = -999;
    player.drawTicks = 0;
    // The rejoining client's toggles start fresh — stale prevButtons would
    // phantom-latch the held sneak bit (and eat the first ability edge).
    player.prevButtons = 0;
    player.sneaking = false;
    player.sneakStillTicks = 0;
    player.sneakMoveAccum = 0;
    if (player.hidden) this.setHidden(eid, player, false);
    session.playerEid = eid;
    session.knownEntities.clear();
    session.knownChunks.clear();
    this.sessions.add(session);
    session.sendJson({
      t: 'welcome',
      eid,
      name: player.name,
      tick: this.tickCount,
      token: player.token,
      motd: config.motd,
      look: player.look ?? undefined,
    });
    session.sendJson({ t: 'skills', xp: player.skills });
    session.sendJson({ t: 'inv', slots: player.inventory });
    session.sendJson({ t: 'equip', equipment: player.equipment, carry: player.carryStyle, carryOff: player.carryOff });
    session.sendJson({ t: 'techniques', chosen: player.techniques });
    session.sendJson({ t: 'time', ofs: this.timeOfsTicks });
    this.sendCooldowns(player);
  }

  onSessionClosed(session: Session): void {
    this.sessions.delete(session);
    const eid = session.playerEid;
    if (eid === null) return;
    const player = this.players.get(eid);
    if (!player || player.session !== session) return;
    player.session = null;
    player.disconnectedAt = Date.now();
    // No unpiloted invisible bodies during the reconnect grace window.
    player.sneaking = false;
    if (player.hidden) this.setHidden(eid, player, false);
    this.savePlayer(eid);
    console.log(`[game] ${player.name} disconnected, grace ${RECONNECT_GRACE_MS}ms`);
  }

  private despawnPlayer(eid: EntityId): void {
    const player = this.players.get(eid);
    if (!player) return;
    // A logged-out delver's instance dies with them; pull them out first
    // so they don't reload inside sealed rock. The key in their pack
    // remembers the dungeon — the run resets, the place doesn't.
    const dungeon = this.dungeons.get(player.characterId);
    if (dungeon) {
      const pos = this.positions.must(eid);
      if (pos.y >= 8192) {
        const spawn = this.world.spawn;
        pos.x = spawn.x;
        pos.y = spawn.y;
      }
      this.teardownDungeon(player.characterId);
    }
    this.savePlayer(eid);
    this.characterEids.delete(player.characterId);
    if (player.accountId === null) {
      for (const [token, guestEid] of this.guestTokens) {
        if (guestEid === eid) this.guestTokens.delete(token);
      }
    }
    this.removeFromChunks(eid);
    this.ecs.destroy(eid);
    this.systemChatAll(`${player.name} has left the world.`);
    console.log(`[game] ${player.name} despawned, ${this.players.size} online`);
  }

  // ------------------------------------------------------ persistence

  private savePlayer(eid: EntityId): void {
    const player = this.players.get(eid);
    if (!player || player.characterId < 0) return; // guests aren't saved
    const pos = this.positions.must(eid);
    const health = this.healths.must(eid);
    this.accounts.saveCharacter(player.characterId, pos.x, pos.y, health.hp);
    this.accounts.saveSkills(player.characterId, player.skills as Record<string, number>);
    this.accounts.saveInventory(player.characterId, player.inventory);
    this.accounts.saveEquipment(player.characterId, player.equipment);
    if (player.bank && player.bankDirty) {
      this.accounts.saveBank(player.characterId, player.bank);
      player.bankDirty = false;
    }
  }

  private saveAll(): void {
    for (const eid of this.players.keys()) this.savePlayer(eid);
  }

  // ------------------------------------------------------------ intents

  queueInput(eid: EntityId, frame: InputFrame, viewMs?: number): void {
    const player = this.players.get(eid);
    if (!player) return;
    // The client's self-reported interp delay (already clamped by the
    // protocol parser) — makes melee rewind exact instead of assumed.
    if (viewMs !== undefined) player.viewMs = viewMs;
    if (frame.seq <= player.lastProcessedSeq) return;
    const q = player.inputQueue;
    if (q.length > 0 && frame.seq <= q[q.length - 1]!.seq) return;
    if (q.length >= MAX_QUEUED_INPUTS) q.shift();
    q.push(frame);
  }

  /** Attempt to start gathering at a tile. */
  interact(eid: EntityId, tx: number, ty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;

    const sys = (text: string) =>
      player.session!.sendJson({ t: 'chat', channel: 'system', text });

    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return; // out of reach — silent

    this.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    const ground = this.world.groundAt(tx, ty);

    // Portals teleport; Riftgates open the key panel instead.
    if (ground === Tile.PortalDown || ground === Tile.PortalUp) {
      const portal = this.world.portalAt(tx, ty);
      if (!portal) return;
      if (portal.delve) {
        this.openRiftgate(eid, player);
      } else if (portal.dest) {
        this.teleport(eid, portal.dest.x, portal.dest.y);
        // Using a dungeon's exit (the portal lives at y>=8192) ends the run.
        if (ty >= 8192) this.teardownDungeon(player.characterId);
      }
      return;
    }

    // The bank chest opens the vault (accounts only).
    if (ground === Tile.BankChest) {
      if (player.bank === null) {
        sys('Guests cannot use the bank — make an account!');
        return;
      }
      this.sendBank(player);
      return;
    }

    // Loot chests: a closed chest rolls its table and spills the take
    // at the opener's feet, then stands open until the respawn queue
    // quietly shuts it again. The tile IS the state — closed and open
    // are different tiles, so posture syncs like any other patch.
    const chest = ground === undefined ? null : chestInfo(ground);
    if (chest) {
      this.interactChest(eid, player, tx, ty, chest, sys);
      return;
    }

    // Doors: toggle the whole unit — open swings shut (unless a body
    // stands in the way), shut swings open (unless the lock holds).
    const door = ground === undefined ? null : doorInfo(ground);
    if (door) {
      this.interactDoor(tx, ty, door, sys);
      return;
    }

    // Garden plots: planting runs through the seed-picker → C2SPlant.
    if (ground === Tile.Tilled) return;
    // A planted crop: water it, harvest it, or hear how it's doing.
    if (ground !== undefined && isCropTile(ground as Tile)) {
      this.interactCrop(eid, player, tx, ty, sys);
      return;
    }

    const node = ground === undefined ? undefined : NODES_BY_TILE.get(ground as Tile);
    if (!node) return;

    const level = this.effectiveLevel(player, node.skill);
    if (level < node.levelReq) {
      sys(`You need ${node.skill} level ${node.levelReq} for this ${node.name.toLowerCase()}.`);
      return;
    }
    // The tool belt counts: an equipped tool works alongside anything
    // still carried in the pack (best of the two wins).
    let tool = node.tool ? bestTool(player.inventory, node.tool) : { item: '', power: 1 };
    if (node.tool && player.equipment.tool) {
      const worn = itemDef(player.equipment.tool.id)?.tool;
      if (worn && worn.type === node.tool && (!tool || worn.power >= tool.power)) {
        tool = { item: player.equipment.tool.id, power: worn.power };
      }
    }
    if (!tool) {
      sys(`You need a ${node.tool} to work this ${node.name.toLowerCase()}.`);
      return;
    }
    // Metal-tier gate: a cheap tool can't bite hard material, whatever
    // your skill says. The forge is the only way up.
    const minPower = node.minPower ?? 1;
    if (node.tool && tool.power < minPower) {
      const tier = (TOOL_TIER_NAMES[minPower] ?? `power-${minPower}`).toLowerCase();
      const article = /^[aeiou]/.test(tier) ? 'an' : 'a';
      sys(
        `Your ${itemDef(tool.item)?.name.toLowerCase() ?? node.tool} can't bite this ` +
          `${node.name.toLowerCase()} — you need ${article} ${tier} ${node.tool} or better.`,
      );
      return;
    }
    if (!hasSpaceFor(player.inventory, node.yieldItem)) {
      sys('Your pack is full.');
      return;
    }

    // Faster with better tools, higher levels, and a gatherer's brew.
    const speedup =
      (1 + (tool.power - 1) * 0.25 + (level - node.levelReq) * 0.01) * this.gatherSpeedOf(player);
    const ticks = Math.max(20, Math.round(node.baseTicks / speedup));
    player.action = { kind: 'gather', tx, ty, node, ticksLeft: ticks };
    this.poses.set(eid, PoseState.Gather);
    player.session.sendJson({ t: 'action', state: 'start', ticks });
  }

  /**
   * The chest ladder: what each kind pays, at what level, and how long
   * it stands open before the respawn queue shuts it for the next
   * finder. Only the ironbound strongchest is locked — the key is
   * spent in the turning.
   */
  private static readonly CHEST_LAWS: Record<
    ChestKind,
    { level: number; table: string; recloseSec: number; key?: string }
  > = {
    wood: { level: 4, table: 'chest_wood', recloseSec: 240 },
    mossy: { level: 8, table: 'chest_mossy', recloseSec: 300 },
    iron: { level: 12, table: 'chest_iron', recloseSec: 420, key: 'brass_key' },
    gilded: { level: 16, table: 'chest_gilded', recloseSec: 600 },
    boss: { level: 20, table: 'chest_boss', recloseSec: 900 },
  };

  private interactChest(
    eid: EntityId,
    player: PlayerComp,
    tx: number,
    ty: number,
    chest: ChestInfo,
    sys: (text: string) => void,
  ): void {
    if (chest.open) {
      sys('Empty — nothing left but the smell of old air.');
      return;
    }
    const law = GameServer.CHEST_LAWS[chest.kind];
    if (law.key) {
      if (countItem(player.inventory, law.key) < 1) {
        sys('Locked fast. The hasp wants a brass key.');
        return;
      }
      removeItem(player.inventory, law.key, 1);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      sys('The key turns once, and stays turned.');
    }
    const pos = this.positions.get(eid);
    if (!pos) return;
    // The take lands between chest and opener — always reachable, and
    // the merge/label pipeline handles the pile from there.
    const cx = tx + 0.5;
    const cy = ty + 0.5;
    let dx = pos.x - cx;
    let dy = pos.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const now = Date.now();
    // Inside a dungeon the chest ladder rides the key: loot rolls at
    // the instance's power when it out-levels the chest's own law.
    const chestLevel = Math.max(law.level, this.dungeonPowerAt(tx, ty) ?? 0);
    for (const drop of rollLoot(law.table, { level: chestLevel, rand: Math.random })) {
      this.placeDrop(
        drop.item,
        drop.qty,
        cx + dx * 0.95 + (Math.random() - 0.5) * 0.7,
        cy + dy * 0.95 + (Math.random() - 0.5) * 0.7,
        {
          ownerEid: eid,
          ownerUntil: now + 30_000,
          despawnAt: now + 300_000,
          pickupAfter: now + 400,
          roll: drop.roll,
        },
      );
    }
    this.setWorldTile(tx, ty, openChestTile(chest.kind));
    this.respawnQueue.push({
      at: now + law.recloseSec * 1000,
      tx,
      ty,
      tile: closedChestTile(chest.kind),
    });
  }

  /** How long a hand-opened door stands before pulling itself to. */
  private static readonly DOOR_AUTOCLOSE_MS = 120_000;

  /**
   * The full merged unit a doorway tile belongs to. Wide runs flip as
   * ONE door — every member tile toggles atomically, matching the
   * renderer's merged-opening law — and the anchor (west-most or
   * north-most member) keys locks, auto-close entries, and rattles.
   * Plain doorways never merge: each is its own unit.
   */
  private doorUnit(
    tx: number,
    ty: number,
    info: DoorInfo,
  ): { ax: number; ay: number; tiles: Array<{ x: number; y: number }> } {
    const t = this.world.groundAt(tx, ty);
    if (!info.wide || t === undefined) return { ax: tx, ay: ty, tiles: [{ x: tx, y: ty }] };
    const same = (x: number, y: number) => this.world.groundAt(x, y) === t;
    const tiles: Array<{ x: number; y: number }> = [];
    if (same(tx, ty - 1) || same(tx, ty + 1)) {
      // A N-S run: the wide side doorway, merged along the wall.
      let ay = ty;
      while (same(tx, ay - 1)) ay--;
      for (let y = ay; same(tx, y); y++) tiles.push({ x: tx, y });
      return { ax: tx, ay, tiles };
    }
    let ax = tx;
    while (same(ax - 1, ty)) ax--;
    for (let x = ax; same(x, ty); x++) tiles.push({ x, y: ty });
    return { ax, ay: ty, tiles };
  }

  /**
   * Any body whose center could overlap this tile (padded by a body
   * radius) — the build system's occupancy check, widened so a door
   * never closes INTO someone half-across the threshold and leaves
   * them embedded in a solid tile.
   */
  private bodyOnTile(tx: number, ty: number, pad = 0.4): boolean {
    const cx = Math.floor((tx + 0.5) / CHUNK_SIZE);
    const cy = Math.floor((ty + 0.5) / CHUNK_SIZE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const set = this.chunks.get(chunkKey(cx + dx, cy + dy));
        if (!set) continue;
        for (const other of set) {
          const opos = this.positions.get(other);
          if (!opos) continue;
          if (
            opos.x > tx - pad &&
            opos.x < tx + 1 + pad &&
            opos.y > ty - pad &&
            opos.y < ty + 1 + pad
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Toggle a door unit. Open doors pull shut (never onto a body);
   * shut doors swing open unless locked — a locked door answers with
   * a rattle fx and a system line. Opened doors queue an auto-close
   * on the respawn ladder (one entry at the unit anchor).
   */
  private interactDoor(tx: number, ty: number, info: DoorInfo, sys: (text: string) => void): void {
    const unit = this.doorUnit(tx, ty, info);
    const lockKey = `${unit.ax},${unit.ay}`;
    if (info.open) {
      for (const t of unit.tiles) {
        if (this.bodyOnTile(t.x, t.y)) {
          sys('Someone is standing in the doorway.');
          return;
        }
      }
      for (const t of unit.tiles) {
        const g = this.world.groundAt(t.x, t.y);
        const shut = g === undefined ? null : shutDoorTile(g);
        if (shut !== null && shut !== g) this.setWorldTile(t.x, t.y, shut);
        // A hand on the door outranks the auto-close timer.
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
          const e = this.respawnQueue[i]!;
          if (e.tx === t.x && e.ty === t.y) this.respawnQueue.splice(i, 1);
        }
      }
      return;
    }
    if (this.doorLocks.has(lockKey)) {
      sys('Locked — the door holds fast.');
      this.broadcastFx({
        t: 'fx',
        kind: 'rattle',
        x: unit.ax + 0.5,
        y: unit.ay + 0.5,
        radius: 0.5,
      });
      return;
    }
    for (const t of unit.tiles) {
      const g = this.world.groundAt(t.x, t.y);
      const open = g === undefined ? null : openDoorTile(g);
      if (open !== null && open !== g) this.setWorldTile(t.x, t.y, open);
    }
    const anchorTile = this.world.groundAt(unit.ax, unit.ay);
    const shutAnchor = anchorTile === undefined ? null : shutDoorTile(anchorTile);
    if (shutAnchor !== null) {
      this.respawnQueue.push({
        at: Date.now() + GameServer.DOOR_AUTOCLOSE_MS,
        tx: unit.ax,
        ty: unit.ay,
        tile: shutAnchor,
      });
    }
  }

  /** Best gathering-speed multiplier across active buffs. */
  private gatherSpeedOf(player: PlayerComp): number {
    let mult = 1;
    for (const b of player.buffs) mult = Math.max(mult, b.gatherSpeed);
    return mult;
  }

  private cancelAction(eid: EntityId, player: PlayerComp, reason?: string): void {
    if (!player.action) return;
    player.action = null;
    player.session?.sendJson({ t: 'action', state: 'stop', reason });
  }

  /** Called each tick for players with a running action. */
  private tickAction(eid: EntityId, player: PlayerComp): void {
    const kind = player.action!.kind;
    if (kind === 'gather') this.tickGather(eid, player);
    else if (kind === 'craft') this.tickCraft(eid, player);
    else if (kind === 'harvest') this.tickHarvest(eid, player);
    else this.tickBuild(eid, player);
  }

  private tickGather(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as GatherAction;
    // Node vanished (someone else got it) or player drifted away?
    if (this.world.groundAt(action.tx, action.ty) !== action.node.tile) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    if (--action.ticksLeft > 0) return;

    const node = action.node;
    const got = addItem(player.inventory, node.yieldItem, 1);
    if (got === 0) {
      this.cancelAction(eid, player, 'full');
      return;
    }
    this.grantXp(eid, player, node.skill, node.xp);
    // Occasional extra find (wild herbs shed seeds) — a single item or
    // a loot table rolled at the node's level (interaction loot).
    if (node.bonusYield && Math.random() < node.bonusYield.chance) {
      if (node.bonusYield.item) addItem(player.inventory, node.bonusYield.item, 1);
      if (node.bonusYield.table) {
        for (const drop of rollLoot(node.bonusYield.table, {
          level: node.levelReq,
          rand: Math.random,
        })) {
          addItem(player.inventory, drop.item, drop.qty, drop.roll);
        }
      }
    }
    player.session?.sendJson({ t: 'inv', slots: player.inventory });

    if (node.depletedTile !== null && Math.random() < node.depleteChance) {
      this.setWorldTile(action.tx, action.ty, node.depletedTile);
      // Trees regrow in stages: the stump sprouts a sapling partway
      // through the wait, then the sapling stands up into the tree.
      // Both entries share the tile, so a build/demolish cancel that
      // sweeps the queue clears the whole staging.
      const sapling = saplingOf(node.tile);
      if (sapling !== null) {
        this.respawnQueue.push({
          at: Date.now() + node.respawnSec * 1000 * 0.45,
          tx: action.tx,
          ty: action.ty,
          tile: sapling,
        });
      }
      this.respawnQueue.push({
        at: Date.now() + node.respawnSec * 1000,
        tx: action.tx,
        ty: action.ty,
        tile: node.tile,
      });
      this.cancelAction(eid, player, 'done');
    } else {
      // Keep gathering the same node.
      action.ticksLeft = Math.max(20, Math.round(node.baseTicks / this.gatherSpeedOf(player)));
      player.session?.sendJson({ t: 'action', state: 'start', ticks: action.ticksLeft });
    }
  }

  // ----------------------------------------------------------- farming

  /**
   * Interacting with a planted crop: harvest if ripe, water if you
   * carry a can and it's thirsty, otherwise report the wait.
   */
  private interactCrop(
    eid: EntityId,
    player: PlayerComp,
    tx: number,
    ty: number,
    sys: (text: string) => void,
  ): void {
    const key = `${tx},${ty}`;
    const state = this.crops.get(key);
    if (!state) {
      // A crop tile with no record (stale data) — repair back to soil.
      this.world.unregisterCropTile(tx, ty);
      this.setWorldTile(tx, ty, Tile.Tilled);
      return;
    }
    const now = Date.now();
    const effective = now - state.plantedAt + state.boostMs;
    const stage = stageForElapsed(state.def, effective);

    if (stage === 2) {
      if (state.owner !== player.characterId) {
        sys(`This ${state.def.name.toLowerCase()} patch isn't yours to harvest.`);
        return;
      }
      if (!hasSpaceFor(player.inventory, state.def.yield.item)) {
        sys('Your pack is full.');
        return;
      }
      const ticks = Math.max(10, Math.round(15 / this.gatherSpeedOf(player)));
      player.action = { kind: 'harvest', tx, ty, ticksLeft: ticks };
      this.poses.set(eid, PoseState.Gather);
      player.session!.sendJson({ t: 'action', state: 'start', ticks });
      return;
    }

    // Growing. Watering credits 35% of the current stage's remainder.
    const hasCan = countItem(player.inventory, 'watering_can') > 0;
    const bit = 1 << stage;
    if (hasCan && !(state.watered & bit)) {
      const stageEnd = stageEndMs(state.def, stage as 0 | 1);
      const credit = Math.max(0, Math.round((stageEnd - effective) * 0.35));
      state.watered |= bit;
      state.boostMs += credit;
      this.accounts.upsertCrop(
        tx, ty, state.def.id, state.plantedAt, state.boostMs, state.watered, state.owner,
      );
      sys(`You water the ${state.def.name.toLowerCase()}. It perks up.`);
      return;
    }
    const minsLeft = Math.max(1, Math.ceil((growMs(state.def) - effective) / 60_000));
    sys(
      state.watered & bit
        ? `The ${state.def.name.toLowerCase()} is well watered — about ${minsLeft} min to go.`
        : `The ${state.def.name.toLowerCase()} is still growing — about ${minsLeft} min to go.`,
    );
  }

  /** Plant a seed into a tilled plot (instant; the growing takes time). */
  plant(eid: EntityId, tx: number, ty: number, seed: string): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });

    if (player.characterId < 0) {
      sys('Guests cannot plant crops — make an account!');
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return;

    this.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    if (this.world.groundAt(tx, ty) !== Tile.Tilled) {
      sys('Seeds need a tilled garden plot.');
      return;
    }
    const key = `${tx},${ty}`;
    if (this.crops.has(key)) return; // someone beat you to the plot
    const def = CROP_BY_SEED.get(seed);
    if (!def) return;
    const level = this.effectiveLevel(player, 'farming');
    if (level < def.levelReq) {
      sys(`You need farming level ${def.levelReq} to plant ${def.name.toLowerCase()}.`);
      return;
    }
    if (removeItem(player.inventory, seed, 1) === 0) return;

    const state: CropState = {
      def,
      tx,
      ty,
      plantedAt: Date.now(),
      boostMs: 0,
      watered: 0,
      owner: player.characterId,
      lastStage: 0,
    };
    this.crops.set(key, state);
    this.world.registerCropTile(tx, ty, Tile.CropSprout);
    this.accounts.upsertCrop(tx, ty, def.id, state.plantedAt, 0, 0, state.owner);
    this.setWorldTile(tx, ty, Tile.CropSprout);
    this.grantXp(eid, player, 'farming', Math.max(1, Math.ceil(def.xp / 4)));
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    sys(`You plant ${def.name.toLowerCase()}. Ready in about ${def.growMinutes} min.`);
  }

  private tickHarvest(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as HarvestAction;
    const key = `${action.tx},${action.ty}`;
    const state = this.crops.get(key);
    // Demolished, /grow-raced, or otherwise gone from under us.
    if (!state || this.world.groundAt(action.tx, action.ty) !== state.def.matureTile) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    if (--action.ticksLeft > 0) return;

    const def = state.def;
    const roll = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
    // Pack overflow spills onto the plot rather than vanishing.
    const giveOrDrop = (item: string, qty: number) => {
      const added = addItem(player.inventory, item, qty);
      if (added < qty) {
        this.spawnDrop(item, qty - added, action.tx + 0.5, action.ty + 0.5, eid);
      }
    };
    giveOrDrop(def.yield.item, roll(def.yield.min, def.yield.max));
    const seeds = roll(def.seedReturn.min, def.seedReturn.max);
    if (seeds > 0) giveOrDrop(def.seedItem, seeds);
    this.grantXp(eid, player, 'farming', def.xp);

    this.crops.delete(key);
    this.accounts.deleteCrop(action.tx, action.ty);
    this.world.unregisterCropTile(action.tx, action.ty);
    this.setWorldTile(action.tx, action.ty, Tile.Tilled);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    this.cancelAction(eid, player, 'done');
  }

  /** Advance planted crops; the slow tick calls this every 2s. */
  private tickCrops(now: number): void {
    for (const state of this.crops.values()) {
      const stage = stageForElapsed(state.def, now - state.plantedAt + state.boostMs);
      if (stage > state.lastStage) {
        state.lastStage = stage;
        const tile = tileForStage(state.def, stage);
        this.world.registerCropTile(state.tx, state.ty, tile);
        this.setWorldTile(state.tx, state.ty, tile);
      }
    }
  }

  /** Spawn a free-for-all ground drop (harvest overflow, laid eggs). */
  private spawnDrop(
    item: string,
    qty: number,
    x: number,
    y: number,
    _byEid: EntityId | null,
    xpOnPickup?: { skill: SkillId; xp: number },
  ): EntityId {
    return this.placeDrop(item, qty, x, y, {
      ownerEid: null,
      ownerUntil: 0,
      despawnAt: Date.now() + 12 * 60_000,
      pickupAfter: Date.now() + 400,
      xpOnPickup,
    });
  }

  /**
   * The one door every ground drop enters through. A landing stack
   * folds into a matching pile within DROP_MERGE_RADIUS instead of
   * spawning its own bag — ten kills' bones read "Bones × 10": one
   * label, one pickup target, one pile to manage. Only true twins
   * merge (canMergeDrop), so two rolled swords never collapse into
   * one. A merged contribution keeps the pile alive (timers take the
   * later of the two) — a pile lives as long as its newest addition.
   */
  private placeDrop(
    item: string,
    qty: number,
    x: number,
    y: number,
    comp: Omit<DropComp, 'item' | 'qty'>,
  ): EntityId {
    for (const [eid, drop] of this.drops) {
      if (!canMergeDrop(drop, item, comp.roll, comp.ownerEid, comp.xpOnPickup)) continue;
      const pos = this.positions.get(eid);
      if (!pos) continue;
      const dx = pos.x - x;
      const dy = pos.y - y;
      if (dx * dx + dy * dy > DROP_MERGE_RADIUS * DROP_MERGE_RADIUS) continue;
      drop.qty += qty;
      drop.despawnAt = Math.max(drop.despawnAt, comp.despawnAt);
      drop.ownerUntil = Math.max(drop.ownerUntil, comp.ownerUntil);
      drop.pickupAfter = Math.max(drop.pickupAfter, comp.pickupAfter);
      return eid;
    }
    const dropEid = this.ecs.create();
    this.kinds.set(dropEid, EntityKind.ItemDrop);
    this.positions.set(dropEid, { x, y, dir: 0 });
    this.drops.set(dropEid, { ...comp, item, qty });
    this.updateChunkMembership(dropEid);
    return dropEid;
  }

  // ---------------------------------------------------------- crafting

  /** Is a tile of this type within reach of the player? */
  private nearTile(eid: EntityId, tile: Tile): boolean {
    const pos = this.positions.get(eid);
    if (!pos) return false;
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    for (let ty = cy - 2; ty <= cy + 2; ty++) {
      for (let tx = cx - 2; tx <= cx + 2; tx++) {
        if (this.world.groundAt(tx, ty) !== tile) continue;
        const dx = tx + 0.5 - pos.x;
        const dy = ty + 0.5 - pos.y;
        if (dx * dx + dy * dy <= 2.2 * 2.2) return true;
      }
    }
    return false;
  }

  private hasInputs(player: PlayerComp, recipe: RecipeDef): boolean {
    return recipe.inputs.every((input) => countItem(player.inventory, input.item) >= input.qty);
  }

  craft(eid: EntityId, recipeId: string, qty: number): void {
    const player = this.players.get(eid);
    if (!player || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });

    const recipe = RECIPES.get(recipeId);
    if (!recipe) return;
    const level = this.effectiveLevel(player, recipe.skill);
    if (level < recipe.levelReq) {
      sys(`You need ${recipe.skill} level ${recipe.levelReq} to make that.`);
      return;
    }
    if (recipe.station && !this.nearTile(eid, STATION_TILES[recipe.station])) {
      // 'tanning_rack' → "tanning rack": speak the station's name, not its key.
      sys(`You need to stand by a ${recipe.station.replace(/_/g, ' ')} for that.`);
      return;
    }
    if (!this.hasInputs(player, recipe)) {
      sys("You don't have the materials.");
      return;
    }
    player.action = { kind: 'craft', recipe, remaining: qty, ticksLeft: recipe.ticks };
    this.poses.set(eid, PoseState.Craft);
    player.session.sendJson({ t: 'action', state: 'start', ticks: recipe.ticks });
  }

  private tickCraft(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as CraftAction;
    const recipe = action.recipe;
    if (--action.ticksLeft > 0) return;

    // Re-validate everything at completion — the world may have moved on.
    if (recipe.station && !this.nearTile(eid, STATION_TILES[recipe.station])) {
      this.cancelAction(eid, player, 'station');
      return;
    }
    if (!this.hasInputs(player, recipe)) {
      this.cancelAction(eid, player, 'materials');
      return;
    }
    for (const input of recipe.inputs) removeItem(player.inventory, input.item, input.qty);

    const level = this.effectiveLevel(player, recipe.skill);
    const burnChance = recipe.burnChance
      ? Math.max(0, recipe.burnChance - (level - recipe.levelReq) * 0.015)
      : 0;
    if (burnChance > 0 && Math.random() < burnChance) {
      addItem(player.inventory, recipe.burnResult ?? 'burnt_food', 1);
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'You burn it. Ah well.' });
    } else {
      // Crafted gear rolls its rarity, biased by skill SURPLUS over the
      // recipe's requirement — mastery is the loot chase you train for.
      const gear = itemDef(recipe.output.item)?.gear;
      if (gear) {
        const rar = pickRarity(
          craftRarityWeights(level, recipe.levelReq),
          gear.rarities,
          Math.random,
        );
        const roll = makeRoll(rar);
        addItem(player.inventory, recipe.output.item, recipe.output.qty, roll);
        if (rar !== 'common') {
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `Your hands outdo themselves — a ${rar} ${instanceName(recipe.output.item, roll)}!`,
          });
        }
      } else {
        addItem(player.inventory, recipe.output.item, recipe.output.qty);
      }
      this.grantXp(eid, player, recipe.skill, recipe.xp);
    }
    player.session?.sendJson({ t: 'inv', slots: player.inventory });

    action.remaining--;
    if (action.remaining > 0 && this.hasInputs(player, recipe)) {
      action.ticksLeft = recipe.ticks;
      player.session?.sendJson({ t: 'action', state: 'start', ticks: recipe.ticks });
    } else {
      this.cancelAction(eid, player, 'done');
    }
  }

  // ------------------------------------------------------ construction

  build(eid: EntityId, buildableId: string, tx: number, ty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });

    if (player.characterId < 0) {
      sys('Guests cannot build — make an account!');
      return;
    }
    const def = BUILDABLES.get(buildableId);
    if (!def) return;

    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 3 * 3) return;
    // Can't build under your own feet or anyone else's.
    if (dx * dx + dy * dy < 0.8 * 0.8) {
      sys('Step back a little first.');
      return;
    }

    const skill = def.skill ?? 'construction';
    const level = this.effectiveLevel(player, skill);
    if (level < def.levelReq) {
      sys(`You need ${skill} level ${def.levelReq} for a ${def.name.toLowerCase()}.`);
      return;
    }
    this.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    const ground = this.world.groundAt(tx, ty);
    if (ground === undefined || !buildableGround(def).includes(ground as Tile)) {
      sys("You can't build there.");
      return;
    }
    // Nobody standing on the target tile.
    const chunkSet = this.chunks.get(this.chunkKeyOf(tx + 0.5, ty + 0.5));
    if (chunkSet) {
      for (const other of chunkSet) {
        const opos = this.positions.get(other);
        if (opos && Math.floor(opos.x) === tx && Math.floor(opos.y) === ty) {
          sys('Someone is in the way.');
          return;
        }
      }
    }
    if (!def.materials.every((m) => countItem(player.inventory, m.item) >= m.qty)) {
      sys("You don't have the materials.");
      return;
    }

    player.action = { kind: 'build', buildable: def, tx, ty, ticksLeft: def.ticks };
    this.poses.set(eid, PoseState.Gather);
    player.session.sendJson({ t: 'action', state: 'start', ticks: def.ticks });
  }

  private tickBuild(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as BuildAction;
    if (--action.ticksLeft > 0) return;
    const def = action.buildable;

    // Final re-validation before mutating the world.
    const ground = this.world.groundAt(action.tx, action.ty);
    if (ground === undefined || !buildableGround(def).includes(ground as Tile)) {
      this.cancelAction(eid, player, 'blocked');
      return;
    }
    if (!def.materials.every((m) => countItem(player.inventory, m.item) >= m.qty)) {
      this.cancelAction(eid, player, 'materials');
      return;
    }
    for (const m of def.materials) removeItem(player.inventory, m.item, m.qty);

    // A diagonal wall corner auto-orients to span the two
    // perpendicular wall neighbours present right now — the builder
    // raises the adjoining runs first, then cuts the corner.
    let placed = def.tile;
    const dw = diagWallInfo(def.tile);
    if (dw) {
      const isWall = (x: number, y: number): boolean => {
        const t = this.world.groundAt(x, y);
        return t !== undefined && WALL_RUN_TILES.includes(t as Tile);
      };
      placed = orientDiagWall(
        dw.material,
        isWall(action.tx, action.ty - 1),
        isWall(action.tx + 1, action.ty),
        isWall(action.tx, action.ty + 1),
        isWall(action.tx - 1, action.ty),
      );
    }
    // The ground being replaced is what demolish will restore. When
    // building over an earlier construction the register/save layers
    // keep the original capture, so 'ground' here is only the first
    // link in the chain.
    this.world.registerBuilt(action.tx, action.ty, placed, player.characterId, ground);
    this.accounts.saveBuiltTile(action.tx, action.ty, placed, player.characterId, ground);
    this.setWorldTile(action.tx, action.ty, placed);
    this.grantXp(eid, player, def.skill ?? 'construction', def.xp);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    this.cancelAction(eid, player, 'done');
    // A depleted forage node may have queued a respawn for this very
    // tile (they deplete to buildable Grass) — a late respawn would
    // stomp the new construction and desync it from built_tiles.
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const entry = this.respawnQueue[i]!;
      if (entry.tx === action.tx && entry.ty === action.ty) this.respawnQueue.splice(i, 1);
    }
  }

  demolish(eid: EntityId, tx: number, ty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const built = this.world.builtAt(tx, ty);
    if (!built) return;
    if (built.owner !== player.characterId) {
      player.session.sendJson({ t: 'chat', channel: 'system', text: "That isn't yours to tear down." });
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 3 * 3) return;
    if (this.crops.has(`${tx},${ty}`)) {
      player.session.sendJson({ t: 'chat', channel: 'system', text: 'Harvest the crop first.' });
      return;
    }

    this.world.unregisterBuilt(tx, ty);
    this.accounts.deleteBuiltTile(tx, ty);
    // Give back the ground the construction was built on — a wall cut
    // into a stone floor tears down to stone floor, not to grass.
    this.setWorldTile(tx, ty, built.prevTile);
  }

  // ------------------------------------------------------ bank & shop

  bankOp(
    eid: EntityId,
    op: 'deposit' | 'withdraw',
    item: string,
    qty: number,
    slot?: number,
    gearId?: number,
  ): void {
    const player = this.players.get(eid);
    if (!player || player.session === null || player.bank === null) return;
    if (!this.nearTile(eid, Tile.BankChest)) return;
    if (!itemDef(item)) return;

    if (op === 'deposit') {
      // Rolled instances live in bank_gear rows (they can never stack);
      // a slot-addressed deposit moves exactly the instance clicked.
      const src = slot !== undefined ? player.inventory[slot] : undefined;
      if (src && src.item === item && src.roll) {
        const taken = takeSlot(player.inventory, slot!, 1);
        if (taken?.roll && player.characterId > 0) {
          this.accounts.insertBankGear(player.characterId, taken.item, taken.roll);
        }
      } else {
        const removed =
          src && src.item === item
            ? (takeSlot(player.inventory, slot!, qty)?.qty ?? 0)
            : removeItem(player.inventory, item, qty);
        if (removed > 0) {
          player.bank[item] = (player.bank[item] ?? 0) + removed;
          player.bankDirty = true;
        }
      }
    } else if (gearId !== undefined) {
      // Withdraw an exact stored instance by its stable row id.
      if (player.characterId > 0 && hasSpaceFor(player.inventory, item)) {
        const stored = this.accounts
          .loadBankGear(player.characterId)
          .find((g) => g.id === gearId && g.item === item);
        if (stored && this.accounts.deleteBankGear(gearId, player.characterId)) {
          addItem(player.inventory, stored.item, 1, stored.roll);
        }
      }
    } else {
      const available = player.bank[item] ?? 0;
      let want = Math.min(qty, available);
      let taken = 0;
      while (want > 0) {
        // Add one at a time so non-stackables stop cleanly at a full pack.
        const def = itemDef(item)!;
        const chunk = def.stackable ? want : 1;
        const added = addItem(player.inventory, item, chunk);
        if (added === 0) break;
        taken += added;
        want -= added;
      }
      if (taken > 0) {
        player.bank[item] = available - taken;
        if (player.bank[item] === 0) delete player.bank[item];
        player.bankDirty = true;
      }
    }
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    this.sendBank(player);
  }

  private sendBank(player: PlayerComp): void {
    if (!player.session || player.bank === null) return;
    const gear =
      player.characterId > 0 ? this.accounts.loadBankGear(player.characterId) : undefined;
    player.session.sendJson({ t: 'bank', items: player.bank, gear });
  }

  shopOp(eid: EntityId, op: 'buy' | 'sell', item: string, qty: number, slot?: number): void {
    const player = this.players.get(eid);
    if (!player || player.session === null) return;
    if (!this.nearTile(eid, Tile.ShopCounter)) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    const def = itemDef(item);
    if (!def) return;

    if (op === 'buy') {
      const entry = GENERAL_STORE.find((e) => e.item === item);
      if (!entry) return;
      const coins = countItem(player.inventory, 'coins');
      const affordable = Math.min(qty, Math.floor(coins / entry.price));
      if (affordable === 0) {
        sys("You can't afford that.");
        return;
      }
      removeItem(player.inventory, 'coins', affordable * entry.price);
      // The shop is never a slot machine: bought gear is always the
      // fixed common baseline instance.
      const added = addItem(
        player.inventory,
        item,
        affordable,
        def.gear ? { rar: 'common', seed: 0 } : undefined,
      );
      if (added < affordable) {
        // Pack filled up — refund what didn't fit.
        addItem(player.inventory, 'coins', (affordable - added) * entry.price);
        sys('Your pack is full.');
      }
    } else {
      if (item === 'coins') return;
      // Slot-addressed sale: the exact instance clicked leaves, and a
      // rolled instance is priced by its DERIVED value, not the base.
      const src = slot !== undefined ? player.inventory[slot] : undefined;
      if (src && src.item === item) {
        const taken = takeSlot(player.inventory, slot!, qty);
        if (!taken) return;
        const each = rolledStats(taken.item, taken.roll)?.value ?? def.value;
        addItem(player.inventory, 'coins', taken.qty * Math.max(1, Math.floor(each / 2)));
      } else {
        const sold = removeItem(player.inventory, item, qty);
        if (sold === 0) return;
        addItem(player.inventory, 'coins', sold * Math.max(1, Math.floor(def.value / 2)));
      }
    }
    player.session.sendJson({ t: 'inv', slots: player.inventory });
  }

  private grantXp(eid: EntityId, player: PlayerComp, skill: SkillId, amount: number): void {
    const before = player.skills[skill] ?? 0;
    const after = before + amount;
    player.skills[skill] = after;
    const levelBefore = levelForXp(before);
    const levelAfter = levelForXp(after);
    const levelledUp = levelAfter > levelBefore;
    player.session?.sendJson({
      t: 'xp',
      skill,
      xp: after,
      gained: amount,
      level: levelAfter,
      levelledUp,
    });
    if (levelledUp) {
      this.systemChatAll(`${player.name} reached ${skill} level ${levelAfter}!`);
      if (skill === 'vitality') {
        const health = this.healths.must(eid);
        health.maxHp = levelAfter + player.gear.maxHp;
      }
    }
  }

  /** Mutate the world and stream the patch to everyone nearby. */
  private setWorldTile(tx: number, ty: number, tile: Tile): void {
    // Fresh tile, fresh wood: any change at this coord resets prop
    // durability (respawn, build, demolish, the burst itself).
    this.propDamage.delete(`${tx},${ty}`);
    this.world.setGround(tx, ty, tile);
    const key = chunkKey(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    const patch = encodeTilePatch({ tx, ty, ground: tile });
    for (const s of this.sessions) {
      if (s.knownChunks.has(key)) s.sendBinary(patch);
    }
  }

  // ------------------------------------------------- portals & dungeons

  private teleport(eid: EntityId, x: number, y: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos) return;
    this.cancelAction(eid, player);
    player.inputQueue.length = 0;
    pos.x = x;
    pos.y = y;
    this.updateChunkMembership(eid);
  }

  /**
   * The Riftgate answers an interact by opening the key panel — the
   * client lists the keys from its own pack; `usekey` names one.
   */
  private openRiftgate(eid: EntityId, player: PlayerComp): void {
    const keySlots: number[] = [];
    for (let i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i]?.item === DUNGEON_KEY_ITEM) keySlots.push(i);
    }
    player.session?.sendJson({ t: 'riftgate', keySlots });
    if (keySlots.length === 0) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'The Riftgate stands dark. It wants a dungeon key — the deep places and their keepers drop them.',
      });
    }
  }

  /** A riftgate portal tile within reach of this position, or null. */
  private riftgateNear(pos: { x: number; y: number }): { x: number; y: number } | null {
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const t = this.world.groundAt(cx + dx, cy + dy);
        if (t !== Tile.PortalDown && t !== Tile.PortalUp) continue;
        const portal = this.world.portalAt(cx + dx, cy + dy);
        if (portal?.delve) return { x: cx + dx, y: cy + dy };
      }
    }
    return null;
  }

  /**
   * Turn the key in the named pack slot. The key is never consumed —
   * a key IS a place, and places keep. Same live key: walk back into
   * the run. A different key: the old instance dies, the new one is
   * cut fresh from the seed.
   */
  useKey(eid: EntityId, slot: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) =>
      player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (!this.riftgateNear(pos)) {
      sys('You need to stand at a Riftgate to turn a dungeon key.');
      return;
    }
    const held = player.inventory[slot];
    if (!held || held.item !== DUNGEON_KEY_ITEM) {
      sys('That slot holds no dungeon key.');
      return;
    }
    const spec = dungeonSpecFromRoll(held.roll);
    this.enterDungeon(eid, player, spec, { x: pos.x, y: pos.y });
  }

  private enterDungeon(
    eid: EntityId,
    player: PlayerComp,
    spec: DungeonSpec,
    returnTo: { x: number; y: number },
  ): void {
    let inst = this.dungeons.get(player.characterId);
    if (inst && inst.seed === spec.seed && inst.tier === spec.tier && inst.power === spec.power) {
      this.teleport(eid, inst.entry.x, inst.entry.y);
      return;
    }
    if (inst) this.teardownDungeon(player.characterId);
    const slot = this.nextDungeonSlot++;
    const origin = dungeonOrigin(slot);
    const result = generateDungeon(spec, origin, returnTo, slot);
    this.world.addZone(result.zone);
    const spawnIndexes = this.registerSpawns(result.zone.spawns ?? []);
    inst = {
      zoneId: result.zone.id,
      spawnIndexes,
      slot,
      entry: result.entry,
      seed: spec.seed,
      tier: spec.tier,
      power: spec.power,
      x0: origin.x,
      x1: origin.x + spec.size,
    };
    this.dungeons.set(player.characterId, inst);
    player.session?.sendJson({
      t: 'dungeon',
      name: spec.name,
      sigil: spec.sigil,
      tier: spec.tier,
      theme: spec.theme,
      power: spec.power,
    });
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `${spec.name} — sigil ${spec.sigil}, power ${spec.power}. The way out is where you land; the boss is where you'd least like him.`,
    });
    this.teleport(eid, result.entry.x, result.entry.y);
  }

  private teardownDungeon(characterId: number): void {
    const dungeon = this.dungeons.get(characterId);
    if (!dungeon) return;
    for (const idx of dungeon.spawnIndexes) {
      const spawn = this.spawnPoints[idx];
      if (!spawn) continue;
      spawn.active = false;
      if (spawn.eid !== null && this.npcs.has(spawn.eid)) {
        this.removeFromChunks(spawn.eid);
        this.ecs.destroy(spawn.eid);
        spawn.eid = null;
      }
    }
    this.world.removeZone(dungeon.zoneId);
    this.dungeons.delete(characterId);
  }

  /** The dungeon instance owning this tile, if any (chests scale by it). */
  private dungeonPowerAt(tx: number, ty: number): number | null {
    if (ty < 8192) return null;
    for (const inst of this.dungeons.values()) {
      if (tx >= inst.x0 && tx < inst.x1) return inst.power;
    }
    return null;
  }

  // ------------------------------------------------------- equipment

  /** Equip or eat the item in an inventory slot. */
  /** Reorder the pack: swap two slots (drag-drop / pad carry mode). */
  invMove(eid: EntityId, from: number, to: number): void {
    const player = this.players.get(eid);
    if (!player) return;
    const inv = player.inventory;
    if (from < 0 || to < 0 || from >= inv.length || to >= inv.length) return;
    if (!inv[from] && !inv[to]) return;
    const tmp = inv[from] ?? null;
    inv[from] = inv[to] ?? null;
    inv[to] = tmp;
    player.session?.sendJson({ t: 'inv', slots: inv });
  }

  /**
   * Toss an inventory slot onto the ground in front of the player.
   * The bag belongs to nobody — any player may take it — and it decays
   * after 12 minutes. A short pickup delay stops the dropper's own
   * walk-over pickup from vacuuming it straight back up.
   */
  dropItem(eid: EntityId, slotIndex: number, qty: number): void {
    const player = this.players.get(eid);
    if (!player || slotIndex < 0 || slotIndex >= player.inventory.length) return;
    const slot = player.inventory[slotIndex];
    if (!slot || !itemDef(slot.item)) return;
    const taken = takeSlot(player.inventory, slotIndex, Math.max(1, qty));
    if (!taken) return;
    const n = taken.qty;
    const item = taken.item;

    // Land the bag a step ahead of the player; a wall in the way puts
    // it at their feet instead of inside the masonry.
    const pos = this.positions.must(eid);
    let dx = pos.x + Math.cos(pos.dir) * 0.9;
    let dy = pos.y + Math.sin(pos.dir) * 0.9;
    if (this.world.isSolid(Math.floor(dx), Math.floor(dy))) {
      dx = pos.x;
      dy = pos.y;
    }
    this.placeDrop(item, n, dx, dy, {
      ownerEid: null,
      ownerUntil: 0,
      despawnAt: Date.now() + 12 * 60_000,
      pickupAfter: Date.now() + 2000,
      roll: taken.roll,
    });
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
  }

  useItem(eid: EntityId, slotIndex: number): void {
    const player = this.players.get(eid);
    if (!player || slotIndex >= player.inventory.length) return;
    const slot = player.inventory[slotIndex];
    if (!slot) return;
    const def = itemDef(slot.item);
    if (!def) return;

    // Weapon oils: the vial bonds to the EQUIPPED weapon's INSTANCE —
    // swap weapons and each blade keeps its own poison. Edges and
    // arrowheads take oil; a caster's focus never does.
    if (def.coating) {
      const c = def.coating;
      const worn = player.equipment.weapon;
      const style = worn ? itemDef(worn.id)?.weapon?.style : undefined;
      if (!worn || (style !== 'melee' && style !== 'archery')) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: 'Poison needs an edge or arrowheads — equip a melee weapon or a bow first.',
        });
        return;
      }
      removeItem(player.inventory, slot.item, 1);
      // Legacy-grace materialization: an unrolled instance IS common/0.
      const roll = worn.roll ?? { rar: 'common' as const, seed: 0 };
      roll.coat = { id: def.id, until: Date.now() + c.durationSec * 1000 };
      worn.roll = roll;
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      player.session?.sendJson({ t: 'equip', equipment: player.equipment, carry: player.carryStyle, carryOff: player.carryOff });
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `You work the ${c.name} into the ${itemDef(worn.id)?.name ?? 'weapon'}.`,
      });
      return;
    }

    // Enchant scrolls: bond the enchant onto whatever is worn in the
    // enchant's target slot. No skill gate on APPLYING — the enchanter's
    // craft went into inscribing the scroll, so scrolls are how a
    // specialist enchants the whole town's gear. Re-enchanting replaces
    // the old work outright.
    if (def.enchant) {
      const ench = enchantDef(def.enchant);
      if (!ench) return;
      const worn = player.equipment[ench.slot];
      if (!worn) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The ${ench.name} wants a ${ench.slot === 'weapon' ? 'weapon' : `${ench.slot} piece`} on your body — equip one first.`,
        });
        return;
      }
      if (worn.roll?.ench === ench.id) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The ${itemDef(worn.id)?.name ?? 'item'} already bears that enchantment.`,
        });
        return;
      }
      const replaced = enchantDef(worn.roll?.ench);
      removeItem(player.inventory, slot.item, 1);
      // Legacy-grace materialization: an unrolled instance IS common/0.
      const roll = worn.roll ?? { rar: 'common' as const, seed: 0 };
      roll.ench = ench.id;
      worn.roll = roll;
      // Enchants move aggregate stats (maxHp, speed, cooldowns...) —
      // recompute exactly like an equip change.
      this.onEquipmentChanged(eid, player);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: replaced
          ? `The ${replaced.name} fades as the ${ench.name} takes its place on the ${itemDef(worn.id)?.name ?? 'item'}.`
          : `The scroll crumbles as the ${ench.name} sinks into the ${itemDef(worn.id)?.name ?? 'item'}. It ${ench.tier >= 3 ? 'blazes with power' : ench.tier === 2 ? 'hums quietly' : 'glints, just once'}.`,
      });
      return;
    }

    // Gem re-socketing: an element gem used on an EQUIPPED battlestaff
    // pries out the old stone and seats the new one — the item id
    // transmutes in place, the ROLL (rarity/seed/power) rides through
    // untouched, and the whole school follows the gem. Any other target
    // refuses and keeps the gem.
    const socketStaff = GEM_BATTLESTAFFS[def.id];
    if (socketStaff) {
      const worn = player.equipment.weapon;
      const isBattlestaff = worn && Object.values(GEM_BATTLESTAFFS).includes(worn.id);
      if (!worn || !isBattlestaff) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: 'That stone wants a battlestaff socket — equip one first.',
        });
        return;
      }
      if (worn.id === socketStaff) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The ${itemDef(worn.id)?.name ?? 'staff'} already holds that stone.`,
        });
        return;
      }
      removeItem(player.inventory, slot.item, 1);
      worn.id = socketStaff;
      this.onEquipmentChanged(eid, player);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `You pry the old stone loose and seat the ${def.name}. The ${itemDef(socketStaff)?.name ?? 'staff'} hums anew.`,
      });
      return;
    }

    // Buff consumables (tonics, buff food) — one active per channel; a
    // new drink replaces your drink, a new meal replaces your meal.
    if (def.buff) {
      const b = def.buff;
      removeItem(player.inventory, slot.item, 1);
      if (def.heals) {
        const health = this.healths.must(eid);
        health.hp = Math.min(health.maxHp, health.hp + def.heals);
      }
      player.buffs = player.buffs.filter((x) => x.channel !== b.channel);
      player.buffs.push(
        mkBuff({
          speedMult: b.speedMult ?? 1,
          shieldHp: b.shieldHp ?? 0,
          gatherSpeed: b.gatherSpeed ?? 1,
          regenPer4s: b.regenPer4s ?? 0,
          untilTick: this.tickCount + b.durationSec * 20,
          channel: b.channel,
          itemId: def.id,
          name: b.name,
        }),
      );
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      this.sendBuffs(player);
      return;
    }

    if (def.heals) {
      const health = this.healths.must(eid);
      if (health.hp >= health.maxHp) {
        player.session?.sendJson({ t: 'chat', channel: 'system', text: 'You are at full health.' });
        return;
      }
      removeItem(player.inventory, slot.item, 1);
      health.hp = Math.min(health.maxHp, health.hp + def.heals);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      return;
    }

    if (def.equipSlot) {
      // Equip gate: BASE level only — worn +skill bonuses never
      // bootstrap their way into more gear. A re-issued instance gates
      // at its POWER, not its native floor: a power-45 heirloom robe is
      // endgame loot and demands endgame skill.
      const req = effectiveReq(slot.item, slot.roll);
      if (req && levelForXp(player.skills[req.skill] ?? 0) < req.level) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `You need ${req.skill} level ${req.level} to equip that.`,
        });
        return;
      }
      // DUAL WIELD — the secret is the act itself. A second one-handed
      // melee weapon, equipped over a melee mainhand with an empty off
      // hand, goes TO the off hand instead of swapping — if the arm is
      // strong enough (melee 10+) or the secret is already yours. The
      // first time, the hidden skill reveals itself. No menu, no hint:
      // players find it by trying the obvious rogue thing.
      if (def.equipSlot === 'weapon' && def.weapon?.style === 'melee') {
        const main = player.equipment.weapon;
        const mainWeapon = main ? itemDef(main.id)?.weapon : undefined;
        const discovered = player.skills.dualwield !== undefined;
        const meleeLvl = levelForXp(player.skills.melee ?? 0);
        if (
          main &&
          mainWeapon?.style === 'melee' &&
          !player.equipment.offhand &&
          (discovered || meleeLvl >= DUALWIELD_UNLOCK_MELEE)
        ) {
          const taken = takeSlot(player.inventory, slotIndex, 1);
          if (!taken) return;
          player.equipment.offhand = { id: taken.item, roll: taken.roll };
          if (!discovered) {
            player.skills.dualwield = 0;
            this.grantXp(eid, player, 'dualwield', 1);
            player.session?.sendJson({
              t: 'chat',
              channel: 'system',
              text: HIDDEN_SKILLS.dualwield!.discovery,
            });
          }
          this.onEquipmentChanged(eid, player);
          return;
        }
      }
      // THE TWO-HANDS LAW: bows and staves fill both fists, so a held
      // offhand (an off blade, shield, tome, orb) can never share them —
      // only a back-mounted quiver rides along. Equipping either side of
      // a conflict STOWS the other side in the pack, never a silent
      // refusal and never a vanished instance; it only refuses when the
      // pack can't take what must come off.
      let shedSlot: EquipSlot | null = null;
      if (def.equipSlot === 'weapon' && isTwoHanded(def)) {
        const off = player.equipment.offhand;
        if (off && !itemDef(off.id)?.backMounted) shedSlot = 'offhand';
      } else if (def.equipSlot === 'offhand' && !def.backMounted) {
        const main = player.equipment.weapon;
        const mainDef = main ? itemDef(main.id) : undefined;
        if (mainDef && isTwoHanded(mainDef)) shedSlot = 'weapon';
      }
      const worn = player.equipment[def.equipSlot];
      if (shedSlot) {
        // The clicked slot frees as the item equips; the swapped-out worn
        // piece refills it. The shed hand needs its own empty slot.
        const empties =
          player.inventory.filter((s) => s === null).length + 1 - (worn ? 1 : 0);
        if (empties < 1) {
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `You need a free pack slot to stow your ${
              itemDef(player.equipment[shedSlot]!.id)?.name.toLowerCase() ?? 'other hand'
            } first.`,
          });
          return;
        }
      }
      // Take THIS slot's instance out first so a swap can't overflow
      // the pack — and so the roll that leaves is the roll clicked.
      const taken = takeSlot(player.inventory, slotIndex, 1);
      if (!taken) return;
      if (worn) addItem(player.inventory, worn.id, 1, worn.roll);
      player.equipment[def.equipSlot] = { id: taken.item, roll: taken.roll };
      if (shedSlot) {
        const shed = player.equipment[shedSlot];
        if (shed) {
          delete player.equipment[shedSlot];
          addItem(player.inventory, shed.id, 1, shed.roll);
          const shedName = itemDef(shed.id)?.name.toLowerCase() ?? 'other hand';
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text:
              shedSlot === 'offhand'
                ? `The ${def.name.toLowerCase()} needs both hands — your ${shedName} goes back in your pack.`
                : `Your ${shedName} needs both hands — it goes back in your pack.`,
          });
        }
      }
      this.onEquipmentChanged(eid, player);
    }
  }

  /** The HUD chip row: named consumable buffs only. */
  private sendBuffs(player: PlayerComp): void {
    const buffs = player.buffs
      .filter((b) => b.channel && b.itemId && b.name)
      .map((b) => ({
        id: b.itemId!,
        name: b.name!,
        channel: b.channel!,
        secsLeft: Math.max(0, Math.ceil((b.untilTick - this.tickCount) / 20)),
      }));
    player.session?.sendJson({ t: 'buffs', buffs });
  }

  /** Non-combat NPC interaction: milk the cow, one day pet the wolf. */
  interactNpc(eid: EntityId, targetEid: EntityId): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });

    const npos = this.positions.get(targetEid);
    if (!npos) return;
    const dx = npos.x - pos.x;
    const dy = npos.y - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return;

    // Actors speak: rotate through their authored lines. A stopgap
    // voice until the dialogue system claims the `dialogue` hook.
    const actorComp = this.actors.get(targetEid);
    if (actorComp && actorComp.actor.lines && actorComp.actor.lines.length > 0) {
      const lines = actorComp.actor.lines;
      const line = lines[actorComp.nextLine % lines.length]!;
      actorComp.nextLine++;
      // The spoken-to turn to face you — small thing, reads as alive.
      npos.dir = Math.atan2(pos.y - npos.y, pos.x - npos.x);
      sys(`${actorComp.actor.name}: "${line}"`);
      return;
    }

    const npc = this.npcs.get(targetEid);
    if (!npc || !npc.def.produce) return;

    const produce = npc.def.produce;
    const now = Date.now();
    if (now < npc.nextProduceAt) {
      const secs = Math.ceil((npc.nextProduceAt - now) / 1000);
      sys(`The ${npc.def.name.toLowerCase()} has nothing to give yet (${secs}s).`);
      return;
    }
    if (!hasSpaceFor(player.inventory, produce.item)) {
      sys('Your pack is full.');
      return;
    }
    npc.nextProduceAt = now + produce.cooldownSec * 1000;
    addItem(player.inventory, produce.item, 1);
    this.grantXp(eid, player, 'beastcraft', produce.xp);
    this.setPose(eid, PoseState.Gather, 8);
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    sys(`You collect ${itemDef(produce.item)?.name.toLowerCase() ?? produce.item} from the ${npc.def.name.toLowerCase()}.`);
  }

  unequip(eid: EntityId, slot: EquipSlot): void {
    const player = this.players.get(eid);
    if (!player) return;
    const worn = player.equipment[slot];
    if (!worn) return;
    if (!hasSpaceFor(player.inventory, worn.id)) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'Your pack is full.' });
      return;
    }
    addItem(player.inventory, worn.id, 1, worn.roll);
    delete player.equipment[slot];
    this.onEquipmentChanged(eid, player);
  }

  /**
   * Character creation: accept the look ONCE, then lock. The lock is
   * server law — a future makeover NPC selectively lifts it here, not
   * in any client.
   */
  setLook(eid: EntityId, look: Look): void {
    const player = this.players.get(eid);
    if (!player) return;
    if (player.look) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'Your look is already set.' });
      return;
    }
    player.look = look;
    if (player.characterId > 0) this.accounts.saveLook(player.characterId, look);
    // Everyone who can see this player learns the new face.
    this.broadcastMetaUpdate(eid);
  }

  /** Cosmetic grip preference for one fist — persisted, visible to everyone. */
  setCarryStyle(eid: EntityId, style: CarryStyle, hand: 'main' | 'off' = 'main'): void {
    const player = this.players.get(eid);
    if (!player) return;
    if (hand === 'off' ? player.carryOff === style : player.carryStyle === style) return;
    if (hand === 'off') player.carryOff = style;
    else player.carryStyle = style;
    if (player.characterId > 0) this.accounts.saveCarryStyle(player.characterId, hand, style);
    player.session?.sendJson({
      t: 'equip',
      equipment: player.equipment,
      carry: player.carryStyle,
      carryOff: player.carryOff,
    });
    this.broadcastMetaUpdate(eid);
  }

  /** Re-send an entity's meta to every session that can see it. */
  private broadcastMetaUpdate(eid: EntityId): void {
    const meta = this.buildMeta(eid);
    for (const s of this.sessions) {
      if (s.playerEid === eid || s.knownEntities.has(eid)) {
        s.sendJson({ t: 'update', entities: [meta] });
      }
    }
  }

  /** Re-aggregate worn-gear stats + re-derive max HP (clamped, never 0). */
  private recomputeGear(eid: EntityId, player: PlayerComp): void {
    player.gear = aggregateGearStats(player.equipment);
    const health = this.healths.get(eid);
    if (health) {
      health.maxHp = levelForXp(player.skills.vitality ?? 0) + player.gear.maxHp;
      health.hp = Math.max(1, Math.min(health.hp, health.maxHp));
    }
  }

  /**
   * Effective skill level: base + worn +skill affixes. Powers combat,
   * gathering, farming, crafting, and building — the RS boosting feel.
   * Equip requirements, technique unlocks, and max HP stay BASE.
   */
  private effectiveLevel(player: PlayerComp, skill: SkillId): number {
    return Math.min(
      120,
      levelForXp(player.skills[skill] ?? 0) + (player.gear.skillBonus[skill] ?? 0),
    );
  }

  private onEquipmentChanged(eid: EntityId, player: PlayerComp): void {
    this.recomputeGear(eid, player);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    player.session?.sendJson({ t: 'equip', equipment: player.equipment, carry: player.carryStyle, carryOff: player.carryOff });
    // A new weapon or relic means new abilities on the hotbar.
    this.sendCooldowns(player);
    // Appearance changed — update everyone who can see this player.
    this.broadcastMetaUpdate(eid);
  }

  // ----------------------------------------------------------- combat

  private equippedWeapon(player: PlayerComp) {
    const worn = player.equipment.weapon;
    if (!worn) return null;
    const def = itemDef(worn.id);
    if (!def?.weapon) return null;
    // Rolled weapons carry rarity in the edge: derive the instance's
    // damage (fractional — every maxHit site rounds downstream). Weapons
    // not yet migrated into the gear schema pass through untouched.
    const rolled = rolledStats(worn.id, worn.roll);
    const weapon =
      rolled?.damage !== undefined ? { ...def.weapon, damage: rolled.damage } : def.weapon;
    return { id: worn.id, weapon };
  }

  /** The offhand WEAPON, when dual wielding — null for shields/tomes/empty. */
  private offhandWeapon(player: PlayerComp) {
    const worn = player.equipment.offhand;
    if (!worn) return null;
    const def = itemDef(worn.id);
    if (!def?.weapon) return null;
    const rolled = rolledStats(worn.id, worn.roll);
    const weapon =
      rolled?.damage !== undefined ? { ...def.weapon, damage: rolled.damage } : def.weapon;
    return { id: worn.id, weapon };
  }

  private tryPlayerAttack(eid: EntityId, player: PlayerComp, aim: number, seq: number): void {
    if (player.attackCooldown > 0) return;
    const equipped = this.equippedWeapon(player);
    if (process.env.COMBAT_DEBUG) {
      console.log(`[combat] attack eid=${eid} weapon=${equipped?.id ?? 'none'} style=${equipped?.weapon.style ?? '-'}`);
    }
    if (!equipped) return;
    const { weapon } = equipped;

    player.attackCooldown = weapon.cooldownTicks;
    player.lastCombatAt = Date.now();
    // Backstab eligibility is judged at the moment of the swing — capture
    // stealth BEFORE the attack reveals us.
    const wasHidden = player.hidden;
    this.revealPlayer(eid, player);

    const level = this.effectiveLevel(player, weapon.style);
    // School-tuned gear (Blazing Edge etc.) amplifies bolts of its element.
    const elementMult =
      weapon.style === 'magic' && weapon.element
        ? (player.gear.elementDmgMult[weapon.element] ?? 1)
        : 1;
    const maxHit = Math.max(
      1,
      Math.round(
        weapon.damage * (1 + level * 0.05) * player.gear.styleDmgMult[weapon.style] * elementMult,
      ),
    );

    if (weapon.style === 'melee') {
      // Combo string: forehand → backhand → heavy finisher. Swinging
      // again inside the grace window continues the chain; the finisher
      // hits harder, shoves harder, CLEARS THE WHOLE ARC, and demands a
      // longer recovery — the crowd-control payoff beat.
      const stage = nextComboStage(
        player.comboStage,
        this.tickCount <= player.comboGraceUntilTick,
      );
      player.comboStage = stage;
      const finisher = stage === COMBO_STAGES - 1;
      if (finisher) {
        player.attackCooldown = Math.round(weapon.cooldownTicks * FINISHER_RECOVERY_MULT);
      }
      player.comboGraceUntilTick = this.tickCount + player.attackCooldown + COMBO_GRACE_TICKS;
      this.setPose(
        eid,
        stage === 0 ? PoseState.Attack : stage === 1 ? PoseState.Attack2 : PoseState.Attack3,
        finisher ? 8 : 6,
      );
      this.meleeSwing(
        eid,
        player,
        aim,
        weapon.range,
        finisher ? Math.round(maxHit * FINISHER_DAMAGE_MULT) : maxHit,
        finisher ? FINISHER_KNOCKBACK_MULT : stage === 1 ? 1.1 : 1,
        finisher, // the finisher sweeps everyone, not just the best target
        wasHidden,
        weapon.backstabMult ?? BACKSTAB_MULT_DEFAULT,
      );
      // Dual wield: the off blade echoes every mainhand swing a
      // half-beat later. Scheduled, not immediate — the one-two rhythm
      // IS the fantasy.
      if (this.offhandWeapon(player)) {
        player.offhandEchoTicks = OFFHAND_DELAY_TICKS;
        player.offhandEchoAim = aim;
      }
    } else {
      // Wand rhythm: bolt → bolt → HEAVY. The third cast is a fat slow
      // orb that splashes and shoves — the punch beat wands were missing.
      const stage = nextComboStage(player.boltStage, this.tickCount <= player.boltGraceUntilTick);
      player.boltStage = stage;
      const heavy = stage === COMBO_STAGES - 1;
      if (heavy) {
        player.attackCooldown = Math.round(weapon.cooldownTicks * HEAVY_BOLT_RECOVERY_MULT);
      }
      player.boltGraceUntilTick = this.tickCount + player.attackCooldown + COMBO_GRACE_TICKS;
      this.setPose(eid, heavy ? PoseState.Attack3 : PoseState.Cast, heavy ? 8 : 6);
      const pos = this.positions.must(eid);
      const proj = this.ecs.create();
      this.kinds.set(proj, EntityKind.Projectile);
      this.positions.set(proj, { x: pos.x, y: pos.y, dir: aim });
      this.projectiles.set(proj, {
        ownerEid: eid,
        style: weapon.style,
        maxHit: heavy ? Math.round(maxHit * HEAVY_BOLT_MULT) : maxHit,
        dirX: Math.cos(aim),
        dirY: Math.sin(aim),
        speed: (weapon.projectileSpeed ?? 12) * (heavy ? 0.8 : 1),
        distLeft: weapon.range,
        basic: true,
        spawnSeq: seq,
        element: weapon.element,
        heavy: heavy || undefined,
        splashRadius: heavy ? HEAVY_BOLT_SPLASH : undefined,
        // Ember Bolt passive: the payoff beat sets things burning.
        status:
          heavy && this.hasPassive(player, 'ember_bolt')
            ? { status: 'burn', power: 1, durationTicks: 60 }
            : undefined,
      });
      this.updateChunkMembership(proj);
    }
  }

  /**
   * The offhand echo: a second, lighter cut from the off blade. Damage
   * scales by offhandDamageFactor(dualwield) — clumsy at discovery,
   * near-mirrored at mastery — and every landed echo trains dualwield
   * (that's the ONLY way it trains). The base scaling still rides
   * melee: it is a melee strike, thrown by the weaker hand.
   */
  private offhandStrike(eid: EntityId, player: PlayerComp, aim: number): void {
    const off = this.offhandWeapon(player);
    if (!off) return;
    const dwLevel = levelForXp(player.skills.dualwield ?? 0);
    const level = this.effectiveLevel(player, 'melee');
    const maxHit = Math.max(
      1,
      Math.round(
        off.weapon.damage *
          (1 + level * 0.05) *
          player.gear.styleDmgMult.melee *
          offhandDamageFactor(dwLevel),
      ),
    );
    // NO pose here: the echo is pure client choreography (the rig's
    // one-two law animates the off blade inside the MAIN swing's
    // pose beat). Re-posing mid-swing restarted the main hand's
    // animation clock — the client played a second mainhand cut over
    // the first, and the off blade never moved: the "flailing" bug.
    this.meleeSwing(
      eid,
      player,
      aim,
      off.weapon.range,
      maxHit,
      0.6,
      false,
      false,
      off.weapon.backstabMult ?? BACKSTAB_MULT_DEFAULT,
      'dualwield',
    );
  }

  private meleeSwing(
    eid: EntityId,
    player: PlayerComp,
    aim: number,
    range: number,
    maxHit: number,
    knockbackMult = 1,
    sweepAll = false,
    wasHidden = false,
    backstabMult = BACKSTAB_MULT_DEFAULT,
    xpStyle: SkillId = 'melee',
  ): void {
    const pos = this.positions.must(eid);
    // Every swing sweeps the scenery too: destructible clutter in the
    // arc bursts regardless of what the blade finds to bleed.
    this.smashPropsInArc(pos, aim, range);
    // Strike effects live on the blade that lands — the echo cut reads
    // the offhand instance, exactly like coats.
    const struckWeapon =
      xpStyle === 'dualwield' ? player.equipment.offhand : player.equipment.weapon;
    if (struckWeapon) {
      backstabMult += weaponStrikeEffects(struckWeapon.id, struckWeapon.roll).backstabBonus;
    }
    const critPct = player.gear.critPct;
    // LAG COMP: test the swing against the world the ATTACKER saw —
    // NPC positions rewound by their view delay (see npcHist). Damage
    // and knockback still resolve on the live entity.
    const rewind = this.viewRewindTicks(player);
    // A strike out of full stealth backstabs from any angle; otherwise a
    // sneaking attacker must be inside the cone behind the target's facing.
    const backstabs = (npos: { x: number; y: number; dir: number }): boolean =>
      wasHidden || (player.sneaking && isBehind(pos.x, pos.y, npos.x, npos.y, npos.dir));
    let bestTarget: EntityId | null = null;
    let bestDist = Infinity;
    const inArc: EntityId[] = [];
    for (const [npcEid, npc] of this.npcs) {
      const npos = this.npcPosAt(npcEid, rewind);
      if (!npos) continue;
      const dx = npos.x - pos.x;
      const dy = npos.y - pos.y;
      const dist = Math.hypot(dx, dy) - npc.def.radius;
      if (dist > range) continue;
      // Within a ~120° arc of the aim direction; anything practically
      // touching the player is hittable regardless of aim (feel > sim).
      const angleTo = Math.atan2(dy, dx);
      let diff = Math.abs(angleTo - aim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > Math.PI / 3 && dist > 0.9) continue;
      inArc.push(npcEid);
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = npcEid;
      }
    }
    if (sweepAll) {
      // The finisher clears the crowd — everyone in the arc eats it.
      for (const npcEid of inArc) {
        const backstab = backstabs(this.npcPosAt(npcEid, rewind) ?? this.positions.must(npcEid));
        const { dmg, crit } = rollBasic(backstab ? Math.round(maxHit * backstabMult) : maxHit, critPct);
        this.damageNpc(npcEid, dmg, eid, xpStyle, {
          crit,
          knockbackMult,
          basic: true,
          backstab,
          offhand: xpStyle === 'dualwield',
        });
      }
      return;
    }
    if (process.env.COMBAT_DEBUG) {
      let nearest = Infinity;
      for (const [npcEid] of this.npcs) {
        const npos = this.positions.get(npcEid);
        if (npos) nearest = Math.min(nearest, Math.hypot(npos.x - pos.x, npos.y - pos.y));
      }
      console.log(
        `[combat] swing eid=${eid} at(${pos.x.toFixed(1)},${pos.y.toFixed(1)}) aim=${aim.toFixed(2)} ` +
          `target=${bestTarget} nearestNpc=${nearest.toFixed(2)}`,
      );
    }
    if (bestTarget !== null) {
      const backstab = backstabs(this.npcPosAt(bestTarget, rewind) ?? this.positions.must(bestTarget));
      const { dmg, crit } = rollBasic(backstab ? Math.round(maxHit * backstabMult) : maxHit, critPct);
      this.damageNpc(bestTarget, dmg, eid, xpStyle, {
        crit,
        knockbackMult,
        basic: true,
        backstab,
        offhand: xpStyle === 'dualwield',
      });
    }
  }

  // ---------------------------------------------------- smashable props

  /**
   * Sweep the strike arc for destructible clutter — same cone law as
   * the NPC sweep (±60° of aim, touch range always counts) so a swing
   * that would cut a goblin also bursts the barrel beside it. Every
   * prop in the arc goes at once: clearing a room is the fantasy.
   */
  private smashPropsInArc(pos: { x: number; y: number }, aim: number, range: number): void {
    const r = Math.ceil(range + 1);
    const ptx = Math.floor(pos.x);
    const pty = Math.floor(pos.y);
    for (let ty = pty - r; ty <= pty + r; ty++) {
      for (let tx = ptx - r; tx <= ptx + r; tx++) {
        const g = this.world.groundAt(tx, ty);
        if (g === undefined) continue;
        const info = destructibleInfo(g);
        if (!info) continue;
        const dx = tx + 0.5 - pos.x;
        const dy = ty + 0.5 - pos.y;
        const dist = Math.hypot(dx, dy) - 0.35;
        if (dist > range) continue;
        const angleTo = Math.atan2(dy, dx);
        let diff = Math.abs(angleTo - aim) % (Math.PI * 2);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff > Math.PI / 3 && dist > 0.9) continue;
        this.hitProp(tx, ty, g as Tile, info, angleTo);
      }
    }
  }

  /**
   * Hits-left per damaged prop tile, keyed 'tx,ty'. In-memory like
   * door locks; any tile change at the coord wipes the entry (see
   * setWorldTile) — a respawned or freshly built prop is fresh wood.
   */
  private readonly propDamage = new Map<string, number>();

  /**
   * Land one blow on a destructible prop. Durability is counted in
   * HITS, not damage — bulk reads as bulk at every level. A blow that
   * leaves wood standing broadcasts the same 'smash' fx with the
   * remaining fraction in `radius` (the client shudders the prop and
   * spits chips); the last blow runs the full burst.
   */
  private hitProp(
    tx: number,
    ty: number,
    tile: Tile,
    info: DestructibleInfo,
    dir: number,
  ): void {
    const key = `${tx},${ty}`;
    const left = (this.propDamage.get(key) ?? info.hits) - 1;
    if (left > 0) {
      this.propDamage.set(key, left);
      this.broadcastFx({
        t: 'fx',
        kind: 'smash',
        x: tx + 0.5,
        y: ty + 0.5,
        radius: left / info.hits,
        dir,
        id: info.kind,
      });
      return;
    }
    this.propDamage.delete(key);
    this.smashProp(tx, ty, tile, info, dir);
  }

  /**
   * Burst a destructible prop. The tile becomes the floor beneath it
   * (the shared nearestFloorTile law — exactly the underlay the client
   * already painted, so nothing pops), collision and pathing follow
   * the ordinary patch, and the respawn queue stands the prop back up
   * after its absence has been enjoyed. The debris itself is pure
   * client-side theatre keyed off ONE broadcast fx — the server never
   * simulates a splinter.
   */
  private smashProp(
    tx: number,
    ty: number,
    tile: Tile,
    info: DestructibleInfo,
    dir: number,
  ): void {
    // Fx FIRST: it carries the impact heading + kind, and must land
    // before the tile patch that erases the prop.
    this.broadcastFx({
      t: 'fx',
      kind: 'smash',
      x: tx + 0.5,
      y: ty + 0.5,
      radius: 0, // nothing left standing — the burst
      dir,
      id: info.kind,
    });
    // A player-built prop remembers its true ground; authored clutter
    // reveals the same floor the client bakes beneath it.
    const built = this.world.builtAt(tx, ty);
    const floor =
      built && !TILE_DEFS[built.prevTile as Tile]?.solid
        ? (built.prevTile as Tile)
        : nearestFloorTile((x, y) => this.world.groundAt(x, y), tx, ty);
    this.setWorldTile(tx, ty, floor);
    this.respawnQueue.push({
      at: Date.now() + info.respawnSec * 1000,
      tx,
      ty,
      tile,
      over: floor,
    });
  }

  // --------------------------------------------------------- abilities

  /** The combat style of the equipped weapon (bare fists count melee). */
  private currentStyle(player: PlayerComp): CombatStyleId {
    return (this.equippedWeapon(player)?.weapon.style ?? 'melee') as CombatStyleId;
  }

  /**
   * Which technique ladder the R slot reads. Damage/XP style stays the
   * weapon's attack style — a dagger still cuts as melee — but knives
   * declare techStyle 'sneak' and reach the rogue's ladder instead.
   */
  private techniqueStyle(player: PlayerComp): CombatStyleId {
    const w = this.equippedWeapon(player)?.weapon;
    return (w?.techStyle ?? w?.style ?? 'melee') as CombatStyleId;
  }

  /**
   * Resolve the ability in a hotbar slot. Each slot is a different
   * progression axis: Art = weapon (gear chase), relic (loot hunt),
   * technique (skill grind), sigil (boss trophies). No source, no
   * ability — your loadout IS your kit.
   */
  private slotAbility(player: PlayerComp, slot: AbilitySlot): AbilityDef | null {
    switch (slot) {
      case SLOT_ART: {
        const artId = this.equippedWeapon(player)?.weapon.art;
        return artId ? (abilityDef(artId) ?? null) : null;
      }
      case SLOT_RELIC: {
        const relicItem = itemDef(player.equipment.relic?.id ?? '');
        return relicItem?.relic ? (abilityDef(relicItem.relic) ?? null) : null;
      }
      case SLOT_TECHNIQUE: {
        const chosen = player.techniques[this.techniqueStyle(player)];
        return chosen ? (abilityDef(chosen) ?? null) : null;
      }
      case SLOT_SIGIL: {
        const sigilItem = itemDef(player.equipment.sigil?.id ?? '');
        return sigilItem?.sigil ? (abilityDef(sigilItem.sigil) ?? null) : null;
      }
    }
  }

  private sendCooldowns(player: PlayerComp): void {
    if (!player.session) return;
    const max = [0, 0, 0, 0] as [number, number, number, number];
    for (let slot = 0; slot < ABILITY_SLOTS; slot++) {
      const base = this.slotAbility(player, slot as AbilitySlot)?.cooldownTicks ?? 0;
      // Radials show the same cooldown the cast will actually set.
      max[slot] = base > 0 ? Math.max(1, Math.round(base * player.gear.cooldownMult)) : 0;
    }
    player.session.sendJson({
      t: 'cooldowns',
      cd: [player.abilityCd[0], player.abilityCd[1], player.abilityCd[2], player.abilityCd[3]],
      max,
    });
  }

  /** Passives contributed by worn gear. */
  private passiveIds(player: PlayerComp): PassiveId[] {
    const out: PassiveId[] = [];
    for (const worn of Object.values(player.equipment)) {
      const p = itemDef(worn?.id ?? '')?.passive;
      if (p) out.push(p);
    }
    return out;
  }

  private hasPassive(player: PlayerComp, id: PassiveId): boolean {
    for (const worn of Object.values(player.equipment)) {
      if (itemDef(worn?.id ?? '')?.passive === id) return true;
    }
    return false;
  }

  /**
   * Choose the equipped Technique for a style. Server-validated against
   * the unlock ladder; respec is always free.
   */
  setTechnique(eid: EntityId, style: string, ability: string): void {
    const player = this.players.get(eid);
    if (!player) return;
    if (!(COMBAT_STYLES as readonly string[]).includes(style)) return;
    const tech = techniqueDef(ability);
    if (!tech || tech.style !== style) return;
    const level = levelForXp(player.skills[tech.style] ?? 0);
    if (level < tech.unlockLevel) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `${abilityDef(ability)?.name ?? ability} unlocks at ${tech.style} level ${tech.unlockLevel}.`,
      });
      return;
    }
    player.techniques[style] = ability;
    if (player.characterId > 0) this.accounts.saveTechnique(player.characterId, style, ability);
    player.session?.sendJson({ t: 'techniques', chosen: player.techniques });
    this.sendCooldowns(player);
  }

  /**
   * Flip full-stealth on or off. The vanish puff fires at the last visible
   * position BEFORE interest drops the entity, so viewers read an
   * intentional disappearance instead of a netcode pop.
   */
  private setHidden(eid: EntityId, player: PlayerComp, hidden: boolean): void {
    player.hidden = hidden;
    const pos = this.positions.get(eid);
    if (pos) {
      this.broadcastFx({ t: 'fx', kind: 'vanish', x: pos.x, y: pos.y, radius: 0.6, color: '#8a7fae' });
    }
  }

  /** Attacking or taking damage drops stealth and locks re-hiding briefly. */
  private revealPlayer(eid: EntityId, player: PlayerComp): void {
    player.revealLockUntilTick = this.tickCount + SNEAK_REVEAL_LOCK_TICKS;
    player.sneakStillTicks = 0;
    if (player.hidden) this.setHidden(eid, player, false);
  }

  /** Combat FX go to every session close enough to possibly see them. */
  private broadcastFx(fx: S2CFx): void {
    for (const s of this.sessions) {
      if (s.playerEid === null) continue;
      const pos = this.positions.get(s.playerEid);
      if (!pos) continue;
      if (Math.abs(pos.x - fx.x) < 40 && Math.abs(pos.y - fx.y) < 40) s.sendJson(fx);
    }
  }

  private tryCastAbility(eid: EntityId, player: PlayerComp, slot: AbilitySlot, aim: number): void {
    const ab = this.slotAbility(player, slot);
    if (!ab) return;
    if (player.abilityCd[slot] > 0) return;
    if (this.tickCount < player.castFreezeUntilTick) return;

    // Cloth's cooldown discount lands here — where every cooldown is set.
    player.abilityCd[slot] = Math.max(1, Math.round(ab.cooldownTicks * player.gear.cooldownMult));
    player.castFreezeUntilTick = this.tickCount + (ab.castFreezeTicks ?? 0);
    player.lastCombatAt = Date.now();
    this.revealPlayer(eid, player);
    player.drawTicks = 0; // casting lets the bowstring down
    if (player.action) this.cancelAction(eid, player, 'cast');
    this.setPose(eid, PoseState.Art, Math.max(6, (ab.castFreezeTicks ?? 0) + 4));

    const style = this.currentStyle(player);
    const level = this.effectiveLevel(player, style);
    // Trinket actives grow with the INSTANCE that grants them: the
    // relic's rolled rarity and drop power scale its ability — chasing
    // a stronger Aegis Stone is chasing a stronger Aegis.
    const trinket =
      slot === SLOT_RELIC
        ? player.equipment.relic
        : slot === SLOT_SIGIL
          ? player.equipment.sigil
          : undefined;
    const powerMult = trinket?.roll ? trinketPowerMult(trinket.roll.rar, trinket.roll.pwr) : 1;
    this.castAbility(eid, ab, aim, style, level, false, undefined, powerMult);
    this.sendCooldowns(player);
  }

  /** Execute law: a target low enough on HP eats the bonus multiplier. */
  private executeAdjust(
    npcEid: EntityId,
    dmg: number,
    ex?: { frac: number; mult: number },
  ): number {
    if (!ex || dmg <= 0) return dmg;
    const h = this.healths.get(npcEid);
    if (!h || h.hp > h.maxHp * ex.frac) return dmg;
    return Math.round(dmg * ex.mult);
  }

  /** Drain law: a fraction of ability damage flows back as healing. */
  private drainHeal(casterEid: EntityId, dmg: number, frac?: number): void {
    if (!frac || dmg <= 0) return;
    const health = this.healths.get(casterEid);
    if (!health || health.hp >= health.maxHp) return;
    health.hp = Math.min(health.maxHp, health.hp + Math.max(1, Math.round(dmg * frac)));
  }

  /**
   * Targets for a homing volley: every foe in the aim cone, nearest
   * first. The fan hands these out round-robin so three seekers pick
   * three different throats instead of stacking on one.
   */
  private homingMarks(pos: { x: number; y: number }, aim: number, range: number): EntityId[] {
    const found: Array<{ eid: EntityId; d: number }> = [];
    for (const [npcEid, npc] of this.npcs) {
      const npos = this.positions.get(npcEid);
      if (!npos) continue;
      const dx = npos.x - pos.x;
      const dy = npos.y - pos.y;
      const d = Math.hypot(dx, dy) - npc.def.radius;
      if (d > range) continue;
      let diff = Math.abs(Math.atan2(dy, dx) - aim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      // A generous cone — the point of a seeker is forgiving aim.
      if (diff > 1.2 && d > 1.5) continue;
      found.push({ eid: npcEid, d });
    }
    found.sort((a, b) => a.d - b.d);
    return found.map((f) => f.eid);
  }

  /**
   * Aim-assisted ground targeting: snap to the nearest enemy in the aim
   * cone so gamepad and touch don't need pixel-perfect targeting.
   */
  private resolveGroundTarget(
    pos: { x: number; y: number },
    aim: number,
    range: number,
  ): { x: number; y: number } {
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const [npcEid] of this.npcs) {
      const npos = this.positions.get(npcEid);
      if (!npos) continue;
      const dx = npos.x - pos.x;
      const dy = npos.y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;
      let diff = Math.abs(Math.atan2(dy, dx) - aim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > 0.65) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: npos.x, y: npos.y };
      }
    }
    return best ?? { x: pos.x + Math.cos(aim) * range * 0.6, y: pos.y + Math.sin(aim) * range * 0.6 };
  }

  /**
   * The one ability interpreter: player Arts, relic actives, and NPC
   * specials all execute through here, so a new ability is pure data.
   */
  private castAbility(
    casterEid: EntityId,
    ab: AbilityDef,
    aim: number,
    style: SkillId,
    level: number,
    fromNpc: boolean,
    /** ground_aoe with range 0 detonates on this point (NPC slams). */
    targetPos?: { x: number; y: number },
    /** Trinket-instance scaling (relic/sigil rarity + power). */
    powerMult = 1,
  ): void {
    const pos = this.positions.must(casterEid);
    // Magic Art projectiles fly in the caster's staff school — the
    // element is a weapon fact, so a Frost Nova from an ember staff
    // still novas blue, but its bolts stay the staff's own fire.
    const casterPlayer = fromNpc ? undefined : this.players.get(casterEid);
    const element = casterPlayer
      ? this.equippedWeapon(casterPlayer)?.weapon.element
      : undefined;
    // Player casters carry their armor-class style multiplier in, plus
    // any school-tuned element amplifier (Blazing Edge etc.).
    const gearMult = casterPlayer
      ? ((casterPlayer.gear.styleDmgMult as Record<string, number>)[style] ?? 1) *
        (style === 'magic' && element ? (casterPlayer.gear.elementDmgMult[element] ?? 1) : 1)
      : 1;
    const maxHit =
      ab.damage > 0
        ? Math.max(1, Math.round(ab.damage * (1 + level * 0.05) * gearMult * powerMult))
        : 0;
    const knockbackMult = ab.knockback ?? 1;

    switch (ab.shape) {
      case 'melee_arc': {
        const arc = ab.arc ?? Math.PI / 3;
        const range = ab.range ?? 2;
        this.broadcastFx({
          t: 'fx',
          kind: 'arc',
          x: pos.x,
          y: pos.y,
          radius: range,
          dir: aim,
          id: ab.id,
          color: ab.color,
        });
        for (const [npcEid, npc] of this.npcs) {
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          const dx = npos.x - pos.x;
          const dy = npos.y - pos.y;
          const dist = Math.hypot(dx, dy) - npc.def.radius;
          if (dist > range) continue;
          let diff = Math.abs(Math.atan2(dy, dx) - aim) % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff > arc && dist > 0.9) continue;
          const roll = rollDamage(maxHit);
          const dmg = this.executeAdjust(npcEid, roll.dmg, ab.executeBelow);
          this.damageNpc(npcEid, dmg, casterEid, style, {
            crit: roll.crit,
            knockbackMult,
            status: ab.status,
          });
          this.drainHeal(casterEid, dmg, ab.drainFrac);
        }
        break;
      }

      case 'nova': {
        const radius = ab.radius ?? 2;
        this.broadcastFx({
          t: 'fx',
          kind: 'nova',
          x: pos.x,
          y: pos.y,
          radius,
          id: ab.id,
          color: ab.color,
        });
        if (fromNpc) {
          this.blastPlayers(pos.x, pos.y, radius, maxHit, ab.status);
        } else {
          for (const [npcEid, npc] of this.npcs) {
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            const dx = npos.x - pos.x;
            const dy = npos.y - pos.y;
            if (Math.hypot(dx, dy) - npc.def.radius > radius) continue;
            const roll = rollDamage(maxHit);
            const dmg = this.executeAdjust(npcEid, roll.dmg, ab.executeBelow);
            this.damageNpc(npcEid, dmg, casterEid, style, {
              crit: roll.crit,
              knockbackMult,
              status: ab.status,
            });
            this.drainHeal(casterEid, dmg, ab.drainFrac);
          }
        }
        break;
      }

      case 'dash_strike': {
        // Carve through the world, wounding everything passed. Negative
        // dash tiles roll AWAY from the aim (the disengage tools).
        const dashTiles = ab.dashTiles ?? 3;
        const sign = Math.sign(dashTiles) || 1;
        const dist = Math.abs(dashTiles);
        const dirX = Math.cos(aim) * sign;
        const dirY = Math.sin(aim) * sign;
        const startX = pos.x;
        const startY = pos.y;
        const struck = new Set<EntityId>();
        const steps = Math.ceil(dist / 0.4);
        for (let i = 0; i < steps; i++) {
          const next = stepMovement(pos, { mx: dirX, my: dirY }, dist / steps, 1, this.world);
          pos.x = next.x;
          pos.y = next.y;
          if (maxHit <= 0) continue;
          for (const [npcEid, npc] of this.npcs) {
            if (struck.has(npcEid)) continue;
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            if (Math.hypot(npos.x - pos.x, npos.y - pos.y) - npc.def.radius > 0.8) continue;
            struck.add(npcEid);
            const roll = rollDamage(maxHit);
            const dmg = this.executeAdjust(npcEid, roll.dmg, ab.executeBelow);
            this.damageNpc(npcEid, dmg, casterEid, style, {
              crit: roll.crit,
              knockbackMult,
              status: ab.status,
            });
            this.drainHeal(casterEid, dmg, ab.drainFrac);
          }
        }
        this.updateChunkMembership(casterEid);
        this.broadcastFx({
          t: 'fx',
          kind: 'dash',
          x: startX,
          y: startY,
          x2: pos.x,
          y2: pos.y,
          radius: 0,
          id: ab.id,
          color: ab.color,
        });
        // Tumble Shot: the arrow flies at what you rolled away from.
        if (ab.projectiles && maxHit > 0) {
          const proj = this.ecs.create();
          this.kinds.set(proj, EntityKind.Projectile);
          this.positions.set(proj, { x: pos.x, y: pos.y, dir: aim });
          this.projectiles.set(proj, {
            ownerEid: casterEid,
            style: ab.element ? 'magic' : style === 'magic' ? 'magic' : 'archery',
            maxHit,
            dirX: Math.cos(aim),
            dirY: Math.sin(aim),
            speed: ab.projectileSpeed ?? 14,
            distLeft: ab.range ?? 6,
            status: ab.status,
            fromNpc,
            element: ab.element ?? (style === 'magic' ? element : undefined),
            homingTurn: ab.homing,
          });
          this.updateChunkMembership(proj);
        }
        break;
      }

      case 'chain_zap': {
        // Strike the nearest enemy in the aim cone, then arc onward.
        const range = ab.range ?? 6;
        const chainRadius = ab.radius ?? 3;
        const maxTargets = ab.chainTargets ?? 3;
        let from = { x: pos.x, y: pos.y };
        const zapped = new Set<EntityId>();
        for (let hop = 0; hop < maxTargets; hop++) {
          let best: EntityId | null = null;
          let bestDist = Infinity;
          for (const [npcEid, npc] of this.npcs) {
            if (zapped.has(npcEid)) continue;
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            const dx = npos.x - from.x;
            const dy = npos.y - from.y;
            const d = Math.hypot(dx, dy) - npc.def.radius;
            if (hop === 0) {
              if (d > range) continue;
              let diff = Math.abs(Math.atan2(dy, dx) - aim) % (Math.PI * 2);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;
              if (diff > 0.8 && d > 1) continue;
            } else if (d > chainRadius) {
              continue;
            }
            if (d < bestDist) {
              bestDist = d;
              best = npcEid;
            }
          }
          if (best === null) break;
          zapped.add(best);
          const tpos = this.positions.must(best);
          // Each hop is a real bolt segment — the client draws jagged
          // lightning from strike point to strike point.
          this.broadcastFx({
            t: 'fx',
            kind: 'bolt',
            x: from.x,
            y: from.y,
            x2: tpos.x,
            y2: tpos.y,
            radius: 0,
            id: ab.id,
            color: ab.color,
          });
          from = { x: tpos.x, y: tpos.y };
          const roll = rollDamage(maxHit);
          const dmg = this.executeAdjust(best, roll.dmg, ab.executeBelow);
          this.damageNpc(best, dmg, casterEid, style, { crit: roll.crit, status: ab.status });
          this.drainHeal(casterEid, dmg, ab.drainFrac);
        }
        break;
      }

      case 'pulse_nova': {
        // Repeated rings centered on the caster; you keep moving —
        // Whirlwind, Bone Tempest, and every future storm.
        const pulses = ab.pulses ?? 3;
        const every = ab.pulseEveryTicks ?? 8;
        const radius = ab.radius ?? 2;
        for (let i = 0; i < pulses; i++) {
          this.pendingBlasts.push({
            x: pos.x, // updated to the caster's live position at burst
            y: pos.y,
            radius,
            damage: maxHit,
            knockback: knockbackMult,
            status: ab.status,
            fuseLeft: 1 + i * every,
            ownerEid: casterEid,
            style,
            fromNpc,
            color: ab.color,
            followCaster: true,
            abilityId: ab.id,
            executeBelow: ab.executeBelow,
            drainFrac: ab.drainFrac,
          });
        }
        break;
      }

      case 'projectile_fan': {
        const count = ab.projectiles ?? 1;
        const spread = ab.spreadArc ?? 0;
        // An ability's own school outranks the caster's hand: seeker
        // wisps thrown from a sword still fly as magic, not arrows.
        const projStyle = ab.element ? 'magic' : style === 'magic' ? 'magic' : 'archery';
        const projElement = ab.element ?? (style === 'magic' ? element : undefined);
        // Homing fans spread their marks: each missile takes a DIFFERENT
        // foe from the aim cone (round-robin when foes are scarce).
        const marks =
          ab.homing && !fromNpc ? this.homingMarks(pos, aim, ab.range ?? 7) : [];
        for (let i = 0; i < count; i++) {
          const angle = count === 1 ? aim : aim - spread / 2 + (spread * i) / (count - 1);
          const proj = this.ecs.create();
          this.kinds.set(proj, EntityKind.Projectile);
          this.positions.set(proj, { x: pos.x, y: pos.y, dir: angle });
          this.projectiles.set(proj, {
            ownerEid: casterEid,
            style: projStyle,
            maxHit,
            dirX: Math.cos(angle),
            dirY: Math.sin(angle),
            speed: ab.projectileSpeed ?? 14,
            distLeft: ab.range ?? 7,
            status: ab.status,
            pierce: ab.pierce,
            fromNpc,
            element: projElement,
            homingTurn: ab.homing,
            targetEid: marks.length > 0 ? marks[i % marks.length] : undefined,
            returns: ab.returns,
            executeBelow: ab.executeBelow,
            drainFrac: ab.drainFrac,
          });
          this.updateChunkMembership(proj);
        }
        break;
      }

      case 'ground_aoe': {
        const target = targetPos ?? this.resolveGroundTarget(pos, aim, ab.range ?? 4);
        const fuse = ab.fuseTicks ?? 12;
        const radius = ab.radius ?? 1.5;
        this.pendingBlasts.push({
          x: target.x,
          y: target.y,
          radius,
          damage: maxHit,
          knockback: knockbackMult,
          status: ab.status,
          fuseLeft: fuse,
          ownerEid: casterEid,
          style,
          fromNpc,
          color: ab.color,
          abilityId: ab.id,
          executeBelow: ab.executeBelow,
          drainFrac: ab.drainFrac,
        });
        this.broadcastFx({
          t: 'fx',
          kind: 'telegraph',
          x: target.x,
          y: target.y,
          radius,
          ticks: fuse,
          id: ab.id,
          color: ab.color,
        });
        break;
      }

      case 'ground_field': {
        // A hazard that LIVES: pulses damage on everything inside for
        // its whole duration. The client owns the zone's visual life.
        const target = targetPos ?? this.resolveGroundTarget(pos, aim, ab.range ?? 6);
        const radius = ab.radius ?? 2;
        const life = ab.fieldTicks ?? 100;
        this.activeFields.push({
          x: target.x,
          y: target.y,
          radius,
          damage: maxHit,
          everyTicks: ab.pulseEveryTicks ?? 16,
          ticksLeft: life,
          status: ab.status,
          ownerEid: casterEid,
          style,
          fromNpc,
          knockback: ab.knockback ?? 0,
          drainFrac: ab.drainFrac,
        });
        this.broadcastFx({
          t: 'fx',
          kind: 'field',
          x: target.x,
          y: target.y,
          radius,
          ticks: life,
          id: ab.id,
          color: ab.color,
        });
        break;
      }

      case 'beam': {
        // An instant ray: everything in the corridor is struck in the
        // same frame. The ray stops at the first solid wall face.
        const range = ab.range ?? 10;
        const halfW = ab.width ?? 0.55;
        const dirX = Math.cos(aim);
        const dirY = Math.sin(aim);
        let len = range;
        // March to find the wall the ray dies on.
        for (let d = 0.4; d <= range; d += 0.25) {
          if (pointHitsSolid(this.world, pos.x + dirX * d, pos.y + dirY * d)) {
            len = d;
            break;
          }
        }
        const ex = pos.x + dirX * len;
        const ey = pos.y + dirY * len;
        this.broadcastFx({
          t: 'fx',
          kind: 'beam',
          x: pos.x,
          y: pos.y,
          x2: ex,
          y2: ey,
          radius: halfW,
          id: ab.id,
          color: ab.color,
        });
        const strike = (targetEid: EntityId, bodyR: number, tx: number, ty: number): boolean => {
          const px = tx - pos.x;
          const py = ty - pos.y;
          const along = px * dirX + py * dirY;
          if (along < 0 || along > len + bodyR) return false;
          const perp = Math.abs(px * -dirY + py * dirX);
          return perp <= halfW + bodyR;
        };
        if (fromNpc) {
          for (const [playerEid, player] of this.players) {
            if (player.session === null && player.disconnectedAt !== null) continue;
            const ppos = this.positions.get(playerEid);
            if (!ppos) continue;
            if (!strike(playerEid, BODY_RADIUS, ppos.x, ppos.y)) continue;
            this.damagePlayer(playerEid, Math.floor(Math.random() * (maxHit + 1)), {
              status: ab.status,
            });
          }
        } else {
          for (const [npcEid, npc] of this.npcs) {
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            if (!strike(npcEid, npc.def.radius, npos.x, npos.y)) continue;
            const roll = rollDamage(maxHit);
            const dmg = this.executeAdjust(npcEid, roll.dmg, ab.executeBelow);
            this.damageNpc(npcEid, dmg, casterEid, style, {
              crit: roll.crit,
              knockbackMult,
              status: ab.status,
            });
            this.drainHeal(casterEid, dmg, ab.drainFrac);
          }
        }
        break;
      }

      case 'leap_slam': {
        // Cross the gap the loud way: the landing is a real blast that
        // shoves (or with negative knockback, DRAGS) from the crater.
        const dist = Math.abs(ab.dashTiles ?? 4);
        const dirX = Math.cos(aim);
        const dirY = Math.sin(aim);
        const startX = pos.x;
        const startY = pos.y;
        const steps = Math.ceil(dist / 0.4);
        for (let i = 0; i < steps; i++) {
          const next = stepMovement(pos, { mx: dirX, my: dirY }, dist / steps, 1, this.world);
          pos.x = next.x;
          pos.y = next.y;
        }
        this.updateChunkMembership(casterEid);
        this.broadcastFx({
          t: 'fx',
          kind: 'dash',
          x: startX,
          y: startY,
          x2: pos.x,
          y2: pos.y,
          radius: 0,
          id: ab.id,
          color: ab.color,
        });
        const radius = ab.radius ?? 2;
        this.broadcastFx({
          t: 'fx',
          kind: 'blast',
          x: pos.x,
          y: pos.y,
          radius,
          id: ab.id,
          color: ab.color,
        });
        const cx = pos.x;
        const cy = pos.y;
        if (fromNpc) {
          this.blastPlayers(cx, cy, radius, maxHit, ab.status);
        } else {
          for (const [npcEid, npc] of this.npcs) {
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            if (Math.hypot(npos.x - cx, npos.y - cy) - npc.def.radius > radius) continue;
            const roll = rollDamage(maxHit);
            const dmg = this.executeAdjust(npcEid, roll.dmg, ab.executeBelow);
            this.damageNpc(npcEid, dmg, casterEid, style, {
              crit: roll.crit,
              knockbackMult,
              status: ab.status,
              knockFrom: { x: cx, y: cy },
            });
            this.drainHeal(casterEid, dmg, ab.drainFrac);
          }
        }
        break;
      }

      case 'flurry': {
        // A drumroll of arc strikes: each beat re-reads the caster's
        // live position, so the flurry travels with the fight.
        const hits = ab.hits ?? 3;
        const every = ab.pulseEveryTicks ?? 5;
        for (let i = 0; i < hits; i++) {
          this.pendingBlasts.push({
            x: pos.x,
            y: pos.y,
            radius: ab.range ?? 2,
            damage: maxHit,
            knockback: knockbackMult,
            status: ab.status,
            fuseLeft: 1 + i * every,
            ownerEid: casterEid,
            style,
            fromNpc,
            color: ab.color,
            followCaster: true,
            abilityId: ab.id,
            arcAim: aim,
            arcHalf: ab.arc ?? Math.PI / 3,
            executeBelow: ab.executeBelow,
            drainFrac: ab.drainFrac,
          });
        }
        break;
      }

      case 'self_buff': {
        const player = this.players.get(casterEid);
        const self = ab.self;
        if (!player || !self) break;
        // The empowerment is VISIBLE: everyone nearby sees the flourish.
        this.broadcastFx({
          t: 'fx',
          kind: 'buff',
          x: pos.x,
          y: pos.y,
          radius: 0.9,
          ticks: self.durationTicks,
          id: ab.id,
          color: ab.color,
        });
        // A trinket's shield and heal grow with the instance too.
        if (self.heal) {
          const health = this.healths.must(casterEid);
          health.hp = Math.min(health.maxHp, health.hp + Math.round(self.heal * powerMult));
        }
        if (
          self.speedMult !== undefined ||
          self.shieldHp !== undefined ||
          self.meleeLifesteal !== undefined ||
          self.onHitStatus !== undefined
        ) {
          player.buffs.push(
            mkBuff({
              speedMult: self.speedMult ?? 1,
              shieldHp: Math.round((self.shieldHp ?? 0) * powerMult),
              meleeLifesteal: self.meleeLifesteal ?? 0,
              onHitStatus: self.onHitStatus,
              untilTick: this.tickCount + self.durationTicks,
            }),
          );
        }
        break;
      }

      case 'summon': {
        const spec = ab.summon;
        if (!spec) break;
        const eid = this.ecs.create();
        this.kinds.set(eid, EntityKind.Prop);
        this.positions.set(eid, { x: pos.x, y: pos.y, dir: aim });
        this.summons.set(eid, {
          kind: spec.kind,
          ownerEid: casterEid,
          radius: spec.radius,
          power: spec.power > 0 ? spec.power : maxHit,
          ticksLeft: spec.durationTicks,
        });
        if (spec.kind === 'decoy') this.healths.set(eid, { hp: 12, maxHp: 12 });
        this.updateChunkMembership(eid);
        this.broadcastFx({
          t: 'fx',
          kind: 'summon',
          x: pos.x,
          y: pos.y,
          radius: spec.radius,
          ticks: spec.durationTicks,
          id: ab.id,
          color: ab.color,
        });
        // A decoy is only useful if it takes the heat NOW.
        if (spec.kind === 'decoy') {
          for (const [npcEid, npc] of this.npcs) {
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            if (Math.hypot(npos.x - pos.x, npos.y - pos.y) > spec.radius) continue;
            if (npc.def.damage <= 0) continue;
            npc.state = 'chase';
            npc.targetEid = eid;
          }
        }
        break;
      }
    }
  }

  /** NPC-owned blast: hits players and straw decoys. */
  private blastPlayers(x: number, y: number, radius: number, maxHit: number, status?: StatusApply): void {
    for (const [playerEid, player] of this.players) {
      if (player.session === null && player.disconnectedAt !== null) continue;
      const ppos = this.positions.get(playerEid);
      if (!ppos) continue;
      if (Math.hypot(ppos.x - x, ppos.y - y) > radius) continue;
      this.damagePlayer(playerEid, Math.floor(Math.random() * (maxHit + 1)), { status });
    }
    for (const [sumEid, sum] of this.summons) {
      if (sum.kind !== 'decoy') continue;
      const spos = this.positions.get(sumEid);
      if (!spos) continue;
      if (Math.hypot(spos.x - x, spos.y - y) > radius) continue;
      this.damageSummon(sumEid, Math.floor(Math.random() * (maxHit + 1)));
    }
  }

  // ----------------------------------------------------------- statuses

  /**
   * Apply a status to an NPC — the reaction law lives here. A different
   * status already riding the target DETONATES: burst damage plus the
   * pair's combined effect, and both statuses are consumed. Same status
   * refreshes. Resists shrug it off; weaknesses double it.
   */
  private applyStatusToNpc(
    npcEid: EntityId,
    apply: StatusApply,
    sourceEid: EntityId,
    style: SkillId,
  ): void {
    const npc = this.npcs.get(npcEid);
    if (!npc) return;
    if (npc.def.resist?.includes(apply.status)) {
      const pos = this.positions.get(npcEid);
      if (pos) {
        this.broadcastFx({
          t: 'fx',
          kind: 'reaction',
          x: pos.x,
          y: pos.y,
          radius: 0,
          color: '#9a94a8',
          text: 'Resist',
        });
      }
      return;
    }
    let power = apply.power;
    let duration = apply.durationTicks;
    if (npc.def.weak?.includes(apply.status)) {
      power *= 2;
      duration = Math.round(duration * 1.5);
    }

    const list = this.statuses.get(npcEid) ?? [];
    const other = list.find((s) => s.id !== apply.status);
    const reaction = other ? reactionFor(other.id, apply.status) : null;

    if (other && reaction) {
      // Detonate: both statuses consumed in the flash.
      list.splice(list.indexOf(other), 1);
      const pos = this.positions.get(npcEid);
      if (pos) {
        this.broadcastFx({
          t: 'fx',
          kind: 'reaction',
          x: pos.x,
          y: pos.y,
          radius: reaction.radius,
          color: reaction.color,
          text: reaction.name,
        });
      }
      const dmg = reactionDamage(other.power, power, reaction);
      this.damageNpc(npcEid, dmg, sourceEid, style, {});
      if (pos) {
        switch (reaction.effect) {
          case 'aoe':
          case 'chain': {
            // Arc/blast into everything else nearby.
            for (const [otherEid, otherNpc] of this.npcs) {
              if (otherEid === npcEid) continue;
              const opos = this.positions.get(otherEid);
              if (!opos) continue;
              if (Math.hypot(opos.x - pos.x, opos.y - pos.y) - otherNpc.def.radius > reaction.radius) {
                continue;
              }
              this.damageNpc(otherEid, dmg, sourceEid, style, {});
            }
            break;
          }
          case 'spread': {
            // The affliction finds new hosts — burn for Immolate,
            // venom for Contagion (the reaction names its own plague).
            const carried = reaction.spreadStatus ?? 'burn';
            const plague: StatusApply =
              apply.status === carried
                ? { status: carried, power: apply.power, durationTicks: apply.durationTicks }
                : { status: carried, power: other.power, durationTicks: 60 };
            for (const [otherEid, otherNpc] of this.npcs) {
              if (otherEid === npcEid) continue;
              const opos = this.positions.get(otherEid);
              if (!opos) continue;
              if (Math.hypot(opos.x - pos.x, opos.y - pos.y) - otherNpc.def.radius > reaction.radius) {
                continue;
              }
              this.applyStatusToNpc(otherEid, plague, sourceEid, style);
            }
            break;
          }
          case 'stun': {
            list.push({
              id: 'shock',
              power: 0,
              ticksLeft: SHOCK_MAX_TICKS,
              sourceEid,
              stunLeft: SHOCK_MAX_TICKS,
            });
            break;
          }
          case 'burst':
            break;
        }
      }
      this.statuses.set(npcEid, list);
      return;
    }

    const same = list.find((s) => s.id === apply.status);
    if (same) {
      same.ticksLeft = Math.max(same.ticksLeft, duration);
      same.power = Math.max(same.power, power);
      if (apply.status === 'shock') {
        same.stunLeft = Math.max(same.stunLeft ?? 0, Math.min(duration, SHOCK_MAX_TICKS));
      }
    } else {
      list.push({
        id: apply.status,
        power,
        ticksLeft: duration,
        sourceEid,
        // The stagger is brief; the charge rides on as reaction fodder.
        stunLeft: apply.status === 'shock' ? Math.min(duration, SHOCK_MAX_TICKS) : undefined,
      });
    }
    this.statuses.set(npcEid, list);
  }

  /** Players only receive simple statuses (wolf bleed) — no reactions. */
  private applyStatusToPlayer(eid: EntityId, apply: StatusApply, sourceEid: EntityId): void {
    const list = this.statuses.get(eid) ?? [];
    const same = list.find((s) => s.id === apply.status);
    if (same) {
      same.ticksLeft = Math.max(same.ticksLeft, apply.durationTicks);
      same.power = Math.max(same.power, apply.power);
    } else {
      list.push({ id: apply.status, power: apply.power, ticksLeft: apply.durationTicks, sourceEid });
    }
    this.statuses.set(eid, list);
  }

  private statusBits(eid: EntityId): number {
    let bits = 0;
    const list = this.statuses.get(eid);
    if (list) for (const s of list) bits |= STATUS_BIT[s.id];
    // Stealth bits ride the same byte. Snapshots for a hidden player only
    // ever reach their own session (interest suppression), so HIDDEN is
    // effectively owner-only; DETECTED drives the own eye chip.
    const player = this.players.get(eid);
    if (player) {
      if (player.hidden) bits |= SNEAK_HIDDEN_BIT;
      if (this.chasedPlayers.has(eid)) bits |= SNEAK_DETECTED_BIT;
    }
    return bits;
  }

  private isShocked(eid: EntityId): boolean {
    return this.statuses.get(eid)?.some((s) => s.id === 'shock' && (s.stunLeft ?? 0) > 0) ?? false;
  }

  private isChilled(eid: EntityId): boolean {
    return this.statuses.get(eid)?.some((s) => s.id === 'chill') ?? false;
  }

  private tickStatuses(): void {
    for (const [eid, list] of this.statuses) {
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i]!;
        s.ticksLeft--;
        if (s.stunLeft !== undefined && s.stunLeft > 0) s.stunLeft--;
        const dot = s.id === 'burn' || s.id === 'bleed' || s.id === 'venom';
        const every =
          s.id === 'burn' ? BURN_TICK_EVERY : s.id === 'venom' ? VENOM_TICK_EVERY : BLEED_TICK_EVERY;
        if (dot && s.ticksLeft > 0 && s.ticksLeft % every === 0) {
          if (this.npcs.has(eid)) {
            this.dotNpc(eid, s.power, s.sourceEid, s.id as 'burn' | 'bleed' | 'venom');
          } else if (this.players.has(eid)) {
            this.damagePlayer(eid, s.power, { pierceArmor: true });
          }
        }
        if (s.ticksLeft <= 0) list.splice(i, 1);
      }
      if (list.length === 0) this.statuses.delete(eid);
    }
  }

  /**
   * DoT damage: hurts without flinching the target — a burning goblin
   * still fights; only direct hits interrupt windups.
   */
  private dotNpc(
    npcEid: EntityId,
    dmg: number,
    sourceEid: EntityId,
    kind: 'burn' | 'bleed' | 'venom',
  ): void {
    const npc = this.npcs.get(npcEid);
    const health = this.healths.get(npcEid);
    if (!npc || !health || dmg <= 0) return;
    this.broadcastHit(npcEid, dmg);
    health.hp -= dmg;
    const source = this.players.get(sourceEid);
    if (source) {
      const style: SkillId = kind === 'burn' ? 'magic' : kind === 'venom' ? 'sneak' : 'melee';
      this.grantXp(sourceEid, source, style, dmg * 2);
    }
    if (health.hp <= 0) this.killNpc(npcEid, npc, sourceEid);
  }

  // ------------------------------------------------------------ summons

  private damageSummon(eid: EntityId, dmg: number): void {
    const health = this.healths.get(eid);
    if (!health || dmg <= 0) return;
    this.broadcastHit(eid, dmg);
    health.hp -= dmg;
    if (health.hp <= 0) {
      this.removeFromChunks(eid);
      this.ecs.destroy(eid);
    }
  }

  private tickSummons(): void {
    for (const [eid, sum] of this.summons) {
      sum.ticksLeft--;
      if (sum.ticksLeft <= 0) {
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
        continue;
      }
      const pos = this.positions.must(eid);

      if (sum.kind === 'heal_totem') {
        // A steady pulse of mending for everyone standing close.
        if (sum.ticksLeft % 40 === 0) {
          for (const [playerEid, player] of this.players) {
            if (player.session === null && player.disconnectedAt !== null) continue;
            const ppos = this.positions.get(playerEid);
            if (!ppos) continue;
            if (Math.hypot(ppos.x - pos.x, ppos.y - pos.y) > sum.radius) continue;
            const health = this.healths.must(playerEid);
            if (health.hp < health.maxHp) {
              health.hp = Math.min(health.maxHp, health.hp + sum.power);
              this.broadcastFx({
                t: 'fx',
                kind: 'reaction',
                x: ppos.x,
                y: ppos.y,
                radius: 0,
                color: '#7ac47a',
                // A bare number reads as damage — every gain floaty
                // says WHAT went up.
                text: `+${sum.power} health`,
              });
            }
          }
        }
      } else if (sum.kind === 'snare_trap') {
        for (const [npcEid, npc] of this.npcs) {
          if (npc.def.damage <= 0 && npc.def.aggroRange === 0) continue; // livestock won't spring it
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          if (Math.hypot(npos.x - pos.x, npos.y - pos.y) - npc.def.radius > sum.radius) continue;
          // Sprung: bite, chill, and the trap is spent.
          const owner = this.players.get(sum.ownerEid);
          const level = owner ? this.effectiveLevel(owner, 'melee') : 1;
          const dmg = Math.max(1, Math.round(3 * (1 + level * 0.05)));
          this.damageNpc(npcEid, dmg, sum.ownerEid, 'melee', {
            status: { status: 'chill', power: sum.power, durationTicks: 80 },
          });
          this.removeFromChunks(eid);
          this.ecs.destroy(eid);
          break;
        }
      }
      // Decoys just stand there being extremely punchable.
    }
  }

  private tickBlasts(): void {
    for (let i = this.pendingBlasts.length - 1; i >= 0; i--) {
      const blast = this.pendingBlasts[i]!;
      blast.fuseLeft--;
      if (blast.fuseLeft > 0) continue;
      this.pendingBlasts.splice(i, 1);
      if (blast.followCaster) {
        const cpos = this.positions.get(blast.ownerEid);
        if (!cpos) continue; // the storm dies with its caster
        blast.x = cpos.x;
        blast.y = cpos.y;
      }
      // Flurry strikes face where the caster aimed and paint as swings.
      const isArc = blast.arcAim !== undefined;
      this.broadcastFx({
        t: 'fx',
        kind: isArc ? 'arc' : 'blast',
        x: blast.x,
        y: blast.y,
        radius: blast.radius,
        dir: blast.arcAim,
        id: blast.abilityId,
        color: blast.color,
      });
      if (blast.fromNpc) {
        // NPC flurries read as full circles — a fair trade for one code path.
        this.blastPlayers(blast.x, blast.y, blast.radius, blast.damage, blast.status);
      } else {
        for (const [npcEid, npc] of this.npcs) {
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          const dx = npos.x - blast.x;
          const dy = npos.y - blast.y;
          const dist = Math.hypot(dx, dy) - npc.def.radius;
          if (dist > blast.radius) continue;
          if (isArc) {
            let diff = Math.abs(Math.atan2(dy, dx) - blast.arcAim!) % (Math.PI * 2);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff > (blast.arcHalf ?? Math.PI / 3) && dist > 0.9) continue;
          }
          const roll = rollDamage(blast.damage);
          const dmg = this.executeAdjust(npcEid, roll.dmg, blast.executeBelow);
          this.damageNpc(npcEid, dmg, blast.ownerEid, blast.style, {
            crit: roll.crit,
            knockbackMult: blast.knockback,
            status: blast.status,
            // Ground blasts shove from the CRATER, not from the caster —
            // and vortex blasts (negative knockback) drag INTO it.
            knockFrom: isArc ? undefined : { x: blast.x, y: blast.y },
          });
          this.drainHeal(blast.ownerEid, dmg, blast.drainFrac);
        }
      }
    }
  }

  /** Lingering hazard zones: pulse damage on everything inside. */
  private tickFields(): void {
    for (let i = this.activeFields.length - 1; i >= 0; i--) {
      const field = this.activeFields[i]!;
      field.ticksLeft--;
      if (field.ticksLeft <= 0) {
        this.activeFields.splice(i, 1);
        continue;
      }
      if (field.ticksLeft % field.everyTicks !== 0) continue;
      if (field.fromNpc) {
        this.blastPlayers(field.x, field.y, field.radius, field.damage, field.status);
        continue;
      }
      for (const [npcEid, npc] of this.npcs) {
        const npos = this.positions.get(npcEid);
        if (!npos) continue;
        if (Math.hypot(npos.x - field.x, npos.y - field.y) - npc.def.radius > field.radius) {
          continue;
        }
        const { dmg, crit } = rollDamage(field.damage);
        this.damageNpc(npcEid, dmg, field.ownerEid, field.style, {
          crit,
          knockbackMult: field.knockback,
          status: field.status,
          knockFrom: { x: field.x, y: field.y },
        });
        this.drainHeal(field.ownerEid, dmg, field.drainFrac);
      }
    }
  }

  private tickProjectiles(): void {
    for (const [eid, proj] of this.projectiles) {
      const pos = this.positions.must(eid);
      const step = proj.speed * TICK_DT;
      // Sub-step the advance so the shot dies AT the wall face, not up
      // to a full step past it (fast arrows cover >1 tile per tick and
      // could tunnel straight through a thin wall). pointHitsSolid is
      // shape-aware: a shot crossing a tree's tile only dies on the
      // TRUNK — grazes slip past the canopy corners.
      // Boomerangs home on the owner's LIVE position on the way back.
      if (proj.returning) {
        const opos = this.positions.get(proj.ownerEid);
        if (opos) {
          const hx = opos.x - pos.x;
          const hy = opos.y - pos.y;
          const hd = Math.hypot(hx, hy);
          if (hd < 0.6) {
            // Caught: the shot's journey ends in the caster's hand.
            this.removeFromChunks(eid);
            this.ecs.destroy(eid);
            continue;
          }
          proj.dirX = hx / hd;
          proj.dirY = hy / hd;
          pos.dir = Math.atan2(proj.dirY, proj.dirX);
        }
      }
      // Homing law: steer toward the mark with a capped turn rate — a
      // curve you can read, not a teleport. A dead mark hands the shot
      // to the nearest living foe within seek range; with nobody to
      // hunt it flies straight and dies at range like any other shot.
      if (proj.homingTurn && !proj.returning && !proj.fromNpc) {
        let tpos =
          proj.targetEid !== undefined && this.npcs.has(proj.targetEid)
            ? this.positions.get(proj.targetEid)
            : undefined;
        if (!tpos) {
          proj.targetEid = undefined;
          let bestD = HOMING_SEEK_RANGE;
          for (const [npcEid, npc] of this.npcs) {
            if (proj.hitEids?.has(npcEid)) continue;
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            const d = Math.hypot(npos.x - pos.x, npos.y - pos.y) - npc.def.radius;
            if (d < bestD) {
              bestD = d;
              proj.targetEid = npcEid;
              tpos = npos;
            }
          }
        }
        if (tpos) {
          const want = Math.atan2(tpos.y - pos.y, tpos.x - pos.x);
          const cur = Math.atan2(proj.dirY, proj.dirX);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const maxTurn = proj.homingTurn * TICK_DT;
          const turned = cur + Math.max(-maxTurn, Math.min(maxTurn, diff));
          proj.dirX = Math.cos(turned);
          proj.dirY = Math.sin(turned);
          pos.dir = turned;
        }
      }
      const subs = Math.max(1, Math.ceil(step / 0.25));
      let dead = false;
      for (let i = 0; i < subs && !dead; i++) {
        pos.x += proj.dirX * (step / subs);
        pos.y += proj.dirY * (step / subs);
        // Return legs ghost through walls — a boomerang that dies on the
        // doorframe it left through reads as a bug, not a mechanic.
        if (!proj.returning && pointHitsSolid(this.world, pos.x, pos.y)) {
          dead = true;
          // A player's shot spends itself bursting the crate it
          // struck — the arrow's last act is the smash.
          if (!proj.fromNpc) {
            const stx = Math.floor(pos.x);
            const sty = Math.floor(pos.y);
            const g = this.world.groundAt(stx, sty);
            const dinfo = g === undefined ? null : destructibleInfo(g);
            if (dinfo) {
              this.hitProp(stx, sty, g as Tile, dinfo, Math.atan2(proj.dirY, proj.dirX));
            }
          }
        }
      }
      proj.distLeft -= step;
      dead = dead || proj.distLeft <= 0;

      // The turn: instead of dying at range or a wall, come back armed.
      if (dead && proj.returns && !proj.returning) {
        dead = false;
        proj.returning = true;
        proj.distLeft = 40; // generous — the catch check is what ends it
        proj.hitEids?.clear();
        proj.pierce = true; // the return leg cuts through the whole line
      }

      if (!dead && proj.fromNpc) {
        // NPC shots seek players (and straw decoys, which exist to eat them).
        for (const [playerEid, player] of this.players) {
          if (player.session === null && player.disconnectedAt !== null) continue;
          const ppos = this.positions.get(playerEid);
          if (!ppos) continue;
          const dx = ppos.x - pos.x;
          const dy = bandDy(pos.y, ppos.y, PLAYER_HIT_HEIGHT);
          if (dx * dx + dy * dy < 0.45 ** 2) {
            this.damagePlayer(playerEid, Math.floor(Math.random() * (proj.maxHit + 1)), {
              status: proj.status,
            });
            dead = true;
            break;
          }
        }
        if (!dead) {
          for (const [sumEid, sum] of this.summons) {
            if (sum.kind !== 'decoy') continue;
            const spos = this.positions.get(sumEid);
            if (!spos) continue;
            const dx = spos.x - pos.x;
            const dy = spos.y - pos.y;
            if (dx * dx + dy * dy < 0.5 ** 2) {
              this.damageSummon(sumEid, Math.floor(Math.random() * (proj.maxHit + 1)));
              dead = true;
              break;
            }
          }
        }
      } else if (!dead) {
        for (const [npcEid, npc] of this.npcs) {
          if (proj.hitEids?.has(npcEid)) continue;
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          const dx = npos.x - pos.x;
          // The visual body rises north of the ground point — test the
          // feet→crown band so a shot crossing the chest or head lands.
          const dy = bandDy(pos.y, npos.y, npcHitHeight(npc.def));
          if (dx * dx + dy * dy < (npc.def.radius + 0.25) ** 2) {
            const critPct = this.players.get(proj.ownerEid)?.gear.critPct ?? 0;
            const roll = proj.basic ? rollBasic(proj.maxHit, critPct) : rollDamage(proj.maxHit, critPct);
            const dmg = this.executeAdjust(npcEid, roll.dmg, proj.executeBelow);
            const crit = roll.crit;
            this.damageNpc(npcEid, dmg, proj.ownerEid, proj.style, {
              crit,
              basic: proj.basic,
              fullDraw: proj.fullDraw,
              status: proj.status,
              knockbackMult: proj.heavy ? HEAVY_BOLT_KNOCKBACK : proj.fullDraw ? 1.4 : 1,
            });
            this.drainHeal(proj.ownerEid, dmg, proj.drainFrac);
            // Heavy orbs burst on impact, splashing everything close.
            if (proj.splashRadius) {
              this.broadcastFx({
                t: 'fx',
                kind: 'blast',
                x: pos.x,
                y: pos.y,
                radius: proj.splashRadius,
                color: '#b49af0',
              });
              const splashHit = Math.max(1, Math.round(proj.maxHit * 0.5));
              for (const [otherEid, other] of this.npcs) {
                if (otherEid === npcEid) continue;
                const opos = this.positions.get(otherEid);
                if (!opos) continue;
                if (Math.hypot(opos.x - pos.x, opos.y - pos.y) - other.def.radius > proj.splashRadius) {
                  continue;
                }
                const roll = rollDamage(splashHit);
                this.damageNpc(otherEid, roll.dmg, proj.ownerEid, proj.style, {
                  crit: roll.crit,
                  status: proj.status,
                });
              }
            }
            if (proj.pierce) {
              (proj.hitEids ??= new Set()).add(npcEid);
            } else {
              dead = true;
              break;
            }
          }
        }
      }

      if (dead) {
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
      } else {
        this.updateChunkMembership(eid);
      }
    }
  }

  private damageNpc(
    npcEid: EntityId,
    dmg: number,
    attackerEid: EntityId,
    style: SkillId,
    opts: {
      crit?: boolean;
      knockbackMult?: number;
      /** Landed basic attacks feed on-hit haste. */
      basic?: boolean;
      fullDraw?: boolean;
      /** Status carried by the hit (weapon arts, relics, projectiles). */
      status?: StatusApply;
      /** Struck from stealth or from behind while sneaking (damage already multiplied). */
      backstab?: boolean;
      /** Dual-wield echo strike — the OFFHAND blade landed this basic. */
      offhand?: boolean;
      /**
       * Knock direction origin override — blasts shove from their OWN
       * center, not the caster's position. With a negative knockback
       * mult the same vector becomes a vortex pull into this point.
       */
      knockFrom?: { x: number; y: number };
    } = {},
  ): void {
    const crit = opts.crit ?? false;
    const knockbackMult = opts.knockbackMult ?? 1;
    const npc = this.npcs.get(npcEid);
    const health = this.healths.get(npcEid);
    if (!npc || !health) return;

    // The rhythm engine: every landed basic pulls both ability
    // cooldowns forward. Whiffs never count — you have to CONNECT.
    if (opts.basic) {
      const attacker = this.players.get(attackerEid);
      if (attacker) {
        const before0 = attacker.abilityCd[0];
        const before1 = attacker.abilityCd[1];
        attacker.abilityCd[0] = hasteOnHit(attacker.abilityCd[0], opts.fullDraw);
        attacker.abilityCd[1] = hasteOnHit(attacker.abilityCd[1], opts.fullDraw);
        if (attacker.abilityCd[0] !== before0 || attacker.abilityCd[1] !== before1) {
          this.sendCooldowns(attacker);
        }
      }
    }

    if (opts.status) this.applyStatusToNpc(npcEid, opts.status, attackerEid, style);
    // Poisoned-edge + Envenom law: every landed BASIC carries what
    // rides the blade and the stance — never the ability rotation.
    // The oil lives ON the weapon instance, so style gating is
    // structural: a coated dagger poisons, the staff you swap to
    // doesn't. Stacking a chill oil under an envenomed blade detonates
    // a reaction per hit — deliberate reaction-economy fuel.
    let strikeSteal = 0;
    if (opts.basic) {
      const attacker = this.players.get(attackerEid);
      if (attacker) {
        // The coat rides the blade that LANDED: an offhand echo carries
        // the offhand instance's oil — two blades, two poisons.
        const struck = opts.offhand ? attacker.equipment.offhand : attacker.equipment.weapon;
        const coat = struck?.roll?.coat;
        if (coat && coat.until > Date.now()) {
          const status = itemDef(coat.id)?.coating?.status;
          if (status) this.applyStatusToNpc(npcEid, status, attackerEid, style);
        }
        // Strike effects (native + enchant) obey the same law as coats:
        // they live on the instance that landed the blow.
        if (struck) {
          const strike = weaponStrikeEffects(struck.id, struck.roll);
          strikeSteal = strike.lifestealFrac;
          for (const oh of strike.onHit) {
            if (Math.random() < oh.chance) {
              this.applyStatusToNpc(
                npcEid,
                { status: oh.status, power: oh.power, durationTicks: oh.durationTicks },
                attackerEid,
                style,
              );
            }
          }
        }
        for (const b of attacker.buffs) {
          if (b.onHitStatus) this.applyStatusToNpc(npcEid, b.onHitStatus, attackerEid, style);
        }
      }
    }
    // The status may have detonated a reaction that already killed the
    // target (and cascaded further) — never strike a corpse.
    if (!this.ecs.isAlive(npcEid) || !this.npcs.has(npcEid)) return;

    // Knockback: shove the target away from the attacker (crits shove
    // harder), respecting collision. The direction also travels to
    // clients so impact sparks fly the way the blow landed.
    let kx = 0;
    let ky = 0;
    const apos = opts.knockFrom ?? this.positions.get(attackerEid);
    const nposPre = this.positions.get(npcEid);
    if (apos && nposPre) {
      const kdx = nposPre.x - apos.x;
      const kdy = nposPre.y - apos.y;
      const kd = Math.hypot(kdx, kdy) || 1;
      kx = kdx / kd;
      ky = kdy / kd;
    }
    this.broadcastHit(npcEid, dmg, crit, kx, ky, opts.backstab);
    if (dmg <= 0) return;
    health.hp -= dmg;
    this.setNpcPose(npcEid, npc, PoseState.Hurt, 4);
    npc.windupTicks = 0; // a solid hit interrupts a wound-up attack

    const npos = this.positions.get(npcEid);
    if (npos && (kx !== 0 || ky !== 0)) {
      const push = (crit ? 0.55 : 0.35) * knockbackMult;
      const nx = npos.x + kx * push;
      const ny = npos.y + ky * push;
      if (!circleHitsSolid(this.world, nx, ny, npc.def.radius)) {
        npos.x = nx;
        npos.y = ny;
        this.updateChunkMembership(npcEid);
      }
    }

    const attacker = this.players.get(attackerEid);
    if (attacker) {
      attacker.lastCombatAt = Date.now();
      this.grantXp(attackerEid, attacker, style, dmg * 4);
      this.grantXp(attackerEid, attacker, 'vitality', dmg * 2);
      if (opts.backstab) {
        this.grantXp(attackerEid, attacker, 'sneak', BACKSTAB_XP_BASE + dmg * 3);
      }
      // Bloodlust buffs feed melee wounds; a leeching weapon enchant
      // feeds every basic ITS steel lands, whatever the style.
      let steal = strikeSteal;
      if (style === 'melee') {
        for (const b of attacker.buffs) steal = Math.max(steal, b.meleeLifesteal);
      }
      if (steal > 0) {
        const ahealth = this.healths.get(attackerEid);
        if (ahealth && ahealth.hp < ahealth.maxHp) {
          ahealth.hp = Math.min(ahealth.maxHp, ahealth.hp + Math.max(1, Math.round(dmg * steal)));
        }
      }
    }

    // Fight back!
    if (npc.state === 'idle' && npc.def.damage > 0) {
      npc.state = 'chase';
      npc.targetEid = attackerEid;
    }

    if (health.hp <= 0) this.killNpc(npcEid, npc, attackerEid);
  }

  private killNpc(npcEid: EntityId, npc: NpcComp, killerEid: EntityId): void {
    // Idempotent: reaction cascades can route two lethal blows into the
    // same tick — the second finds the entity already gone.
    if (!this.ecs.isAlive(npcEid)) return;
    const pos = this.positions.get(npcEid);
    if (!pos) return;
    // Everyone watching sees the death burst.
    for (const s of this.sessions) {
      if (s.playerEid === npcEid || s.knownEntities.has(npcEid)) {
        s.sendJson({ t: 'death', eid: npcEid, x: pos.x, y: pos.y, defId: npc.def.id });
      }
    }
    const killer = this.players.get(killerEid);
    if (killer) {
      // Kill bonus xp on top of damage xp.
      this.grantXp(killerEid, killer, 'vitality', Math.round(npc.def.xpReward * 0.5));
      // Battle Rush: each kill feeds the next chase.
      if (this.hasPassive(killer, 'battle_rush')) {
        killer.buffs.push(mkBuff({ speedMult: 1.25, untilTick: this.tickCount + 50 }));
      }
      // On-kill haste (Battlecharged etc.): victory shaves the Q/E slots.
      const haste = killer.gear.onKillHasteTicks;
      if (haste > 0) {
        const before0 = killer.abilityCd[0];
        const before1 = killer.abilityCd[1];
        killer.abilityCd[0] = Math.max(0, killer.abilityCd[0] - haste);
        killer.abilityCd[1] = Math.max(0, killer.abilityCd[1] - haste);
        if (killer.abilityCd[0] !== before0 || killer.abilityCd[1] !== before1) {
          this.sendCooldowns(killer);
        }
      }
    }

    // Roll the loot table onto the ground.
    const dropLoot = (item: string, qty: number, roll?: ItemRoll) => {
      const scatter = () => (Math.random() - 0.5) * 0.8;
      this.placeDrop(item, qty, pos.x + scatter(), pos.y + scatter(), {
        ownerEid: killerEid,
        ownerUntil: Date.now() + 30_000,
        despawnAt: Date.now() + 90_000,
        pickupAfter: Date.now() + 400,
        roll,
      });
    };
    // The foe's assigned tables pay out through the one resolver, which
    // owns the rarity and item-power laws (heirlooms included — they're
    // a table entry now, assigned like any other).
    for (const tableId of npc.def.loot) {
      for (const drop of rollLoot(tableId, { level: npc.def.level, rand: Math.random })) {
        dropLoot(drop.item, drop.qty, drop.roll);
      }
    }

    const spawn = this.spawnPoints[npc.spawnIndex];
    if (spawn) {
      spawn.eid = null;
      spawn.respawnAt = Date.now() + NPCS.get(spawn.npc)!.respawnSec * 1000;
    }
    // A slain actor's post refills on the synthesized def's clock.
    const actorComp = this.actors.get(npcEid);
    if (actorComp && actorComp.spawnIndex >= 0) {
      const post = this.actorSpawnPoints[actorComp.spawnIndex];
      if (post) {
        post.eid = null;
        post.respawnAt = Date.now() + npc.def.respawnSec * 1000;
      }
    }
    this.removeFromChunks(npcEid);
    this.ecs.destroy(npcEid);

    // The ooze divides: death spawns ephemeral halves (spawnIndex -1 —
    // no spawn point, no respawn) that come out hunting the killer.
    // Recursion is capped by data: the child def carries no splitInto.
    if (npc.def.splitInto) {
      const childDef = NPCS.get(npc.def.splitInto.npc);
      if (childDef) {
        for (let i = 0; i < npc.def.splitInto.count; i++) {
          const a = Math.random() * Math.PI * 2;
          let cx = pos.x;
          let cy = pos.y;
          for (let tries = 0; tries < 6; tries++) {
            const tx = pos.x + Math.cos(a + tries) * (0.6 + Math.random() * 0.5);
            const ty = pos.y + Math.sin(a + tries) * (0.6 + Math.random() * 0.5);
            if (!this.world.isSolid(Math.floor(tx), Math.floor(ty))) {
              cx = tx;
              cy = ty;
              break;
            }
          }
          const childEid = this.spawnNpc(childDef, cx, cy, -1);
          const child = this.npcs.get(childEid)!;
          if (this.players.has(killerEid)) {
            child.state = 'chase';
            child.targetEid = killerEid;
          }
        }
      }
    }
  }

  private damagePlayer(
    eid: EntityId,
    raw: number,
    opts: { status?: StatusApply; pierceArmor?: boolean; sourceEid?: EntityId } = {},
  ): void {
    const player = this.players.get(eid);
    const health = this.healths.get(eid);
    if (!player || !health) return;

    // Getting hit blows your cover even if armor soaks the damage to 0 —
    // and it must land before NPC retaliation picks a target.
    if (raw > 0) this.revealPlayer(eid, player);

    const defLevel = this.effectiveLevel(player, 'defence');
    // The gear cache already sums rolled armor (rarity-scaled) plus
    // legacy flat armor — the per-hit loop over worn items is gone.
    const armor = player.gear.armor;
    // Defence + armor shave hits down, never below 0. DoTs pierce —
    // the wound is already inside the armor.
    let dmg = opts.pierceArmor
      ? raw
      : Math.max(0, raw - Math.floor(defLevel / 10) - Math.floor(armor / 2));
    if (opts.status) this.applyStatusToPlayer(eid, opts.status, opts.sourceEid ?? 0);
    // Ability shields soak damage before flesh does.
    for (const b of player.buffs) {
      if (b.shieldHp <= 0 || dmg <= 0) continue;
      const soaked = Math.min(b.shieldHp, dmg);
      b.shieldHp -= soaked;
      dmg -= soaked;
    }
    this.broadcastHit(eid, dmg);
    player.lastCombatAt = Date.now();
    if (dmg <= 0) return;

    health.hp -= dmg;
    this.grantXp(eid, player, 'defence', dmg * 3);
    this.setPose(eid, PoseState.Hurt, 4);
    // Second Wind: fires only on the CROSSING into danger, so a string
    // of low hits can't re-trigger it every tick.
    const swLine = health.maxHp * 0.3;
    if (
      health.hp > 0 &&
      health.hp < swLine &&
      health.hp + dmg >= swLine &&
      this.hasPassive(player, 'second_wind')
    ) {
      player.buffs.push(mkBuff({ speedMult: 1.35, untilTick: this.tickCount + 60 }));
    }

    if (health.hp <= 0) {
      const spawn = this.world.spawn;
      const pos = this.positions.must(eid);
      pos.x = spawn.x;
      pos.y = spawn.y;
      health.hp = health.maxHp;
      this.statuses.delete(eid); // death is at least a clean slate
      player.buffs = [];
      this.updateChunkMembership(eid);
      this.cancelAction(eid, player);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'You were defeated! You wake up back in Bramblewick.',
      });
    }
  }

  private broadcastHit(eid: EntityId, dmg: number, crit = false, kx = 0, ky = 0, backstab = false): void {
    const hasDir = kx !== 0 || ky !== 0;
    for (const s of this.sessions) {
      if (s.playerEid === eid || s.knownEntities.has(eid)) {
        s.sendJson({
          t: 'hit',
          eid,
          dmg,
          crit: crit || undefined,
          kx: hasDir ? Math.round(kx * 100) / 100 : undefined,
          ky: hasDir ? Math.round(ky * 100) / 100 : undefined,
          bs: backstab || undefined,
        });
      }
    }
  }

  private setPose(eid: EntityId, pose: PoseState, ticks: number): void {
    this.poses.set(eid, pose);
    const player = this.players.get(eid);
    if (player) player.poseUntilTick = this.tickCount + ticks;
  }

  private setNpcPose(eid: EntityId, npc: NpcComp, pose: PoseState, ticks: number): void {
    this.poses.set(eid, pose);
    npc.poseUntilTick = this.tickCount + ticks;
  }

  // -------------------------------------------------------------- npcs

  private tickSpawns(now: number): void {
    for (let i = 0; i < this.spawnPoints.length; i++) {
      const spawn = this.spawnPoints[i]!;
      if (!spawn.active || spawn.eid !== null || spawn.respawnAt > now) continue;
      const base = NPCS.get(spawn.npc);
      if (!base) continue;
      // Dungeon garrisons: the authored def re-issued at the key's power.
      const def = spawn.level !== undefined ? scaleNpcDef(base, spawn.level, spawn.name) : base;
      // Find a walkable scatter position.
      let x = spawn.x;
      let y = spawn.y;
      for (let tries = 0; tries < 8; tries++) {
        const tryX = spawn.x + (Math.random() - 0.5) * spawn.radius;
        const tryY = spawn.y + (Math.random() - 0.5) * spawn.radius;
        if (!this.world.isSolid(Math.floor(tryX), Math.floor(tryY))) {
          x = tryX;
          y = tryY;
          break;
        }
      }
      spawn.eid = this.spawnNpc(def, x, y, i);
    }

    // Placed actors stand back up the same way beasts do.
    for (let i = 0; i < this.actorSpawnPoints.length; i++) {
      const spawn = this.actorSpawnPoints[i]!;
      if (spawn.eid !== null || spawn.respawnAt > now) continue;
      const def = this.actorDefs.get(spawn.actor);
      if (!def) continue;
      spawn.eid = this.spawnActor(def, spawn.x, spawn.y, i, spawn.dir);
    }
  }

  /**
   * Materialize one NPC at a point. spawnIndex -1 = ephemeral (slime
   * halves, dev-spawned): killNpc's spawn-point lookup finds nothing and
   * schedules no respawn.
   */
  private spawnNpc(def: NpcDef, x: number, y: number, spawnIndex: number): EntityId {
    const eid = this.ecs.create();
    this.kinds.set(eid, EntityKind.Npc);
    this.positions.set(eid, { x, y, dir: Math.random() * Math.PI * 2 });
    this.poses.set(eid, PoseState.Idle);
    this.healths.set(eid, { hp: def.maxHp, maxHp: def.maxHp });
    this.npcs.set(eid, {
      def,
      originX: x,
      originY: y,
      state: 'idle',
      targetEid: null,
      wanderUntilTick: 0,
      wanderX: 0,
      wanderY: 0,
      attackCooldown: 0,
      windupTicks: 0,
      spawnIndex,
      poseUntilTick: 0,
      specialCooldown: 60, // never open with the special
      nextProduceAt: 0,
      nextLayAt: def.lays
        ? Date.now() + (def.lays.minSec + Math.random() * (def.lays.maxSec - def.lays.minSec)) * 1000
        : 0,
    });
    this.updateChunkMembership(eid);
    return eid;
  }

  /**
   * Materialize one NPC actor at its post. Fightable actors (a combat
   * block on the def) also get the full NpcComp body — every existing
   * combat, damage, loot, and lag-comp path works on them unchanged.
   * Their NpcComp.spawnIndex stays -1; respawn belongs to the ACTOR
   * spawn table, which killNpc services through the ActorComp.
   */
  private spawnActor(
    actor: NpcActorDef,
    x: number,
    y: number,
    spawnIndex: number,
    dir?: number,
  ): EntityId {
    const eid = this.ecs.create();
    const homeDir = dir ?? Math.PI / 2; // face south — toward the camera
    this.kinds.set(eid, EntityKind.Npc);
    this.positions.set(eid, { x, y, dir: homeDir });
    this.poses.set(eid, PoseState.Idle);
    this.actors.set(eid, { actor, spawnIndex, homeDir, nextLine: 0 });
    const combatDef = actorCombatDef(actor);
    if (combatDef) {
      this.healths.set(eid, { hp: combatDef.maxHp, maxHp: combatDef.maxHp });
      this.npcs.set(eid, {
        def: combatDef,
        originX: x,
        originY: y,
        state: 'idle',
        targetEid: null,
        wanderUntilTick: 0,
        wanderX: 0,
        wanderY: 0,
        attackCooldown: 0,
        windupTicks: 0,
        spawnIndex: -1,
        poseUntilTick: 0,
        specialCooldown: 60,
        nextProduceAt: 0,
        nextLayAt: 0,
      });
    }
    this.updateChunkMembership(eid);
    return eid;
  }

  /**
   * Posted actors stay put but stay alive: face the nearest player in
   * a short radius, drift back to the home facing when alone. Cheap —
   * a handful of actors, every 10th tick, no movement or pathing.
   */
  private tickActors(): void {
    if (this.tickCount % 10 !== 0) return;
    for (const [eid, comp] of this.actors) {
      const npc = this.npcs.get(eid);
      if (npc && npc.state !== 'idle') continue; // combat owns the body
      const pos = this.positions.get(eid);
      if (!pos) continue;
      let bestD = 3 * 3;
      let bestX = 0;
      let bestY = 0;
      let found = false;
      for (const [playerEid, player] of this.players) {
        if (player.session === null && player.disconnectedAt !== null) continue;
        const ppos = this.positions.get(playerEid);
        if (!ppos) continue;
        const dx = ppos.x - pos.x;
        const dy = ppos.y - pos.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          bestX = dx;
          bestY = dy;
          found = true;
        }
      }
      pos.dir = found ? Math.atan2(bestY, bestX) : comp.homeDir;
    }
  }

  /** Resolve an NPC's chase target: a live player or a straw decoy. */
  private npcTargetPos(targetEid: EntityId): { x: number; y: number } | null {
    const player = this.players.get(targetEid);
    if (player) {
      if (player.session === null && player.disconnectedAt !== null) return null;
      // A target that melts into full stealth is simply gone — the chase
      // breaks through the same leash path as a vanished decoy.
      if (player.hidden) return null;
      return this.positions.get(targetEid) ?? null;
    }
    if (this.summons.get(targetEid)?.kind === 'decoy') {
      return this.positions.get(targetEid) ?? null;
    }
    return null;
  }

  /** Land an NPC's basic on whatever it is chasing. */
  private npcStrike(npcEid: EntityId, npc: NpcComp, targetEid: EntityId, raw: number): void {
    const player = this.players.get(targetEid);
    if (player) {
      this.damagePlayer(targetEid, raw, {
        status: npc.def.attackStatus,
        sourceEid: npcEid,
      });
      // Thorns: biting the buckler costs a point; bristling enchants
      // stack more points on top of the passive's one.
      const thorns = (this.hasPassive(player, 'thorns') ? 1 : 0) + player.gear.thorns;
      if (thorns > 0) {
        this.damageNpc(npcEid, thorns, targetEid, 'defence', {});
      }
    } else {
      this.damageSummon(targetEid, raw);
    }
  }

  private tickNpcs(now: number): void {
    for (const [eid, npc] of this.npcs) {
      const pos = this.positions.must(eid);
      if (npc.attackCooldown > 0) npc.attackCooldown--;
      if (npc.specialCooldown > 0) npc.specialCooldown--;

      // Hens lay while someone is around to hear the cluck. A skipped
      // lay (nobody near / egg pile) just re-rolls — no backlog.
      if (npc.def.lays && npc.nextLayAt > 0 && now >= npc.nextLayAt) {
        const lays = npc.def.lays;
        npc.nextLayAt = now + (lays.minSec + Math.random() * (lays.maxSec - lays.minSec)) * 1000;
        const key = this.entityChunk.get(eid);
        let watched = false;
        if (key) {
          for (const s of this.sessions) {
            if (s.knownChunks.has(key)) {
              watched = true;
              break;
            }
          }
        }
        if (watched && this.nearbyDropCount(lays.item, pos.x, pos.y, 6) < 4) {
          const scatter = () => (Math.random() - 0.5) * 0.7;
          this.spawnDrop(lays.item, 1, pos.x + scatter(), pos.y + scatter(), null, {
            skill: 'beastcraft',
            xp: lays.xp,
          });
        }
      }

      // Shock is a hard stagger: no thinking, no moving, no swinging.
      if (this.isShocked(eid)) {
        npc.windupTicks = 0;
        continue;
      }

      // Aggro scan (cheap: only when idle, every 5 ticks).
      if (npc.state === 'idle' && npc.def.aggroRange > 0 && (this.tickCount + eid) % 5 === 0) {
        for (const [playerEid, player] of this.players) {
          if (player.session === null && player.disconnectedAt !== null) continue;
          if (player.hidden) continue;
          const ppos = this.positions.get(playerEid);
          if (!ppos) continue;
          const dx = ppos.x - pos.x;
          const dy = ppos.y - pos.y;
          // Sneaking shrinks how close this NPC lets you get — the whole
          // point of the skill below the invisibility tiers.
          let aggro = npc.def.aggroRange;
          if (player.sneaking) {
            aggro *= sneakDetectionFactor(this.effectiveLevel(player, 'sneak'));
          }
          if (dx * dx + dy * dy < aggro * aggro) {
            npc.state = 'chase';
            npc.targetEid = playerEid;
            break;
          }
        }
      }

      let moveX = 0;
      let moveY = 0;

      if (npc.state === 'chase' && npc.targetEid !== null) {
        const tpos = this.npcTargetPos(npc.targetEid);
        const fromOrigin = Math.hypot(pos.x - npc.originX, pos.y - npc.originY);
        if (!tpos || fromOrigin > npc.def.leashRange) {
          npc.state = 'return';
          npc.targetEid = null;
          npc.windupTicks = 0;
        } else {
          const dx = tpos.x - pos.x;
          const dy = tpos.y - pos.y;
          const dist = Math.hypot(dx, dy);

          // Boss move: a telegraphed special the moment it is in reach.
          if (
            npc.def.special &&
            npc.specialCooldown === 0 &&
            npc.windupTicks === 0 &&
            dist < 4.5
          ) {
            const ab = abilityDef(npc.def.special.ability);
            if (ab) {
              npc.specialCooldown = npc.def.special.everyTicks;
              this.setNpcPose(eid, npc, PoseState.Art, 10);
              this.castAbility(eid, ab, Math.atan2(dy, dx), 'melee', npc.def.level, true, {
                x: tpos.x,
                y: tpos.y,
              });
            }
          }

          if (npc.windupTicks > 0) {
            // Mid-telegraph: planted, tracking the target with its eyes.
            pos.dir = Math.atan2(dy, dx);
            npc.windupTicks--;
            if (npc.windupTicks === 0) {
              if (npc.def.ranged) {
                // Loose the throw at where the target stands NOW.
                const proj = this.ecs.create();
                const angle = Math.atan2(dy, dx);
                this.kinds.set(proj, EntityKind.Projectile);
                this.positions.set(proj, { x: pos.x, y: pos.y, dir: angle });
                this.projectiles.set(proj, {
                  ownerEid: eid,
                  style: 'archery',
                  maxHit: npc.def.damage,
                  dirX: Math.cos(angle),
                  dirY: Math.sin(angle),
                  speed: npc.def.ranged.projectileSpeed,
                  distLeft: npc.def.ranged.range + 1,
                  status: npc.def.attackStatus,
                  fromNpc: true,
                });
                this.updateChunkMembership(proj);
              } else {
                // Pouncers LEAP out of the crouch — a real gap-closer
                // (wolves, boars, rams, spiders, the bear).
                if (npc.def.pounce && dist > 0.6) {
                  const leap = Math.min(1.3, dist - 0.4);
                  for (let step = 0; step < 4; step++) {
                    const next = stepMovement(
                      pos,
                      { mx: dx / dist, my: dy / dist },
                      leap,
                      1 / 4,
                      this.world,
                      npc.def.radius,
                    );
                    pos.x = next.x;
                    pos.y = next.y;
                  }
                  this.updateChunkMembership(eid);
                }
                // The blow lands only if the target is still in reach —
                // stepping (or dodge-dashing) out of a windup is a dodge.
                const ndx = tpos.x - pos.x;
                const ndy = tpos.y - pos.y;
                if (Math.hypot(ndx, ndy) <= npc.def.attackRange + 0.55) {
                  this.npcStrike(eid, npc, npc.targetEid, Math.floor(Math.random() * (npc.def.damage + 1)));
                }
              }
            }
          } else if (npc.def.ranged && dist < 2.2) {
            // Throwers back away from anything closing the gap.
            pos.dir = Math.atan2(dy, dx);
            moveX = -dx / dist;
            moveY = -dy / dist;
            if (npc.attackCooldown === 0 && dist <= npc.def.attackRange + 0.3) {
              npc.attackCooldown = npc.def.attackCooldownTicks;
              npc.windupTicks = 8;
              this.setNpcPose(eid, npc, PoseState.Attack, 10);
            }
          } else if (dist <= npc.def.attackRange + 0.3) {
            pos.dir = Math.atan2(dy, dx);
            if (npc.attackCooldown === 0) {
              npc.attackCooldown = npc.def.attackCooldownTicks;
              // Telegraph: wind up before striking (throws wind longer).
              npc.windupTicks = npc.def.ranged ? 8 : 6;
              this.setNpcPose(eid, npc, PoseState.Attack, npc.def.ranged ? 10 : 8);
            }
          } else {
            moveX = dx / dist;
            moveY = dy / dist;
          }
        }
      } else if (npc.state === 'return') {
        const dx = npc.originX - pos.x;
        const dy = npc.originY - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.5) {
          npc.state = 'idle';
          const health = this.healths.must(eid);
          health.hp = health.maxHp; // reset like classic MMO leashing
        } else {
          moveX = dx / dist;
          moveY = dy / dist;
        }
      } else if (this.actors.has(eid)) {
        // Posted actors hold their spot: the wander drift belongs to
        // beasts. A guard leaves the arch only to fight, and 'return'
        // walks it back to the post it was placed on.
      } else {
        // Idle wander: drift somewhere near the origin now and then.
        if (this.tickCount >= npc.wanderUntilTick) {
          if (Math.random() < 0.4) {
            const angle = Math.random() * Math.PI * 2;
            npc.wanderX = Math.cos(angle);
            npc.wanderY = Math.sin(angle);
          } else {
            npc.wanderX = 0;
            npc.wanderY = 0;
          }
          npc.wanderUntilTick = this.tickCount + 20 + Math.floor(Math.random() * 60);
        }
        // Pull back toward origin when drifting too far.
        const fromOrigin = Math.hypot(pos.x - npc.originX, pos.y - npc.originY);
        if (fromOrigin > 3) {
          npc.wanderX = (npc.originX - pos.x) / fromOrigin;
          npc.wanderY = (npc.originY - pos.y) / fromOrigin;
        }
        moveX = npc.wanderX * 0.5;
        moveY = npc.wanderY * 0.5;
      }

      if (moveX !== 0 || moveY !== 0) {
        let speed = npc.state === 'chase' ? npc.def.speed : npc.def.speed * 0.6;
        if (this.isChilled(eid)) speed *= CHILL_SPEED_FACTOR;
        const next = stepMovement(pos, { mx: moveX, my: moveY }, speed, TICK_DT, this.world, npc.def.radius);
        const moved = next.x !== pos.x || next.y !== pos.y;
        if (moved) {
          pos.dir = Math.atan2(moveY, moveX);
          pos.x = next.x;
          pos.y = next.y;
          this.updateChunkMembership(eid);
        }
        if (this.tickCount >= npc.poseUntilTick) {
          this.poses.set(eid, moved ? PoseState.Walk : PoseState.Idle);
        }
      } else if (this.tickCount >= npc.poseUntilTick) {
        this.poses.set(eid, PoseState.Idle);
      }
    }

    // Fresh detection state for this tick's snapshots (the eye chip).
    this.chasedPlayers.clear();
    for (const [, npc] of this.npcs) {
      if (npc.state === 'chase' && npc.targetEid !== null && this.players.has(npc.targetEid)) {
        this.chasedPlayers.add(npc.targetEid);
      }
    }
  }

  /**
   * Passive sneak XP: a pulse per second while crouched close to hostile
   * NPCs that have NOT noticed you. Gated on distance actually sneaked
   * since the last pulse — standing still earns safety, not XP.
   */
  private tickSneakXp(): void {
    for (const [eid, player] of this.players) {
      if ((this.tickCount + eid) % SNEAK_XP_PERIOD_TICKS !== 0) continue;
      if (!player.sneaking || player.session === null) continue;
      const movedEnough = player.sneakMoveAccum >= SNEAK_XP_MIN_MOVE;
      player.sneakMoveAccum = 0;
      if (!movedEnough) continue;
      const pos = this.positions.get(eid);
      if (!pos) continue;
      let best = 0;
      for (const [npcEid, npc] of this.npcs) {
        if (npc.def.aggroRange <= 0 || npc.def.damage <= 0) continue;
        if (npc.state === 'chase' && npc.targetEid === eid) continue;
        const npos = this.positions.get(npcEid);
        if (!npos) continue;
        const dist = Math.hypot(npos.x - pos.x, npos.y - pos.y);
        if (dist > SNEAK_XP_RADIUS) continue;
        // Closer and stronger threats teach more.
        const xp = Math.ceil(npc.def.level * (1.25 - dist / SNEAK_XP_RADIUS));
        best = Math.max(best, Math.min(25, xp));
      }
      if (best > 0) this.grantXp(eid, player, 'sneak', best);
    }
  }

  // ------------------------------------------------------------- drops

  /** How many drops of an item lie within `radius` tiles (egg-pile cap). */
  private nearbyDropCount(item: string, x: number, y: number, radius: number): number {
    let count = 0;
    for (const [eid, drop] of this.drops) {
      if (drop.item !== item) continue;
      const pos = this.positions.get(eid);
      if (!pos) continue;
      const dx = pos.x - x;
      const dy = pos.y - y;
      if (dx * dx + dy * dy <= radius * radius) count++;
    }
    return count;
  }

  /**
   * Explicit pickup — the player clicked a bag or chose it from the
   * loot panel. Range-checked like any interact, but deliberately
   * ignores the walk-over delay: intent beats the anti-vacuum beat
   * (a misdropped bag can be clicked straight back into the pack).
   */
  pickupDrop(eid: EntityId, dropEid: EntityId): void {
    const player = this.players.get(eid);
    if (!player || player.session === null) return;
    const drop = this.drops.get(dropEid);
    if (!drop) return;
    const pos = this.positions.get(dropEid);
    const ppos = this.positions.get(eid);
    if (!pos || !ppos) return;
    const dx = ppos.x - pos.x;
    const dy = ppos.y - pos.y;
    // Interact radius plus a little slack for a moving reacher.
    if (dx * dx + dy * dy > 2.6 * 2.6) return;
    const now = Date.now();
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (drop.ownerEid !== null && drop.ownerEid !== eid && drop.ownerUntil > now) {
      sys('That spoil belongs to another for a moment yet.');
      return;
    }
    if (!hasSpaceFor(player.inventory, drop.item)) {
      sys('Your pack has no room for that.');
      return;
    }
    addItem(player.inventory, drop.item, drop.qty, drop.roll);
    if (drop.xpOnPickup) {
      this.grantXp(eid, player, drop.xpOnPickup.skill, drop.xpOnPickup.xp);
    }
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    this.removeFromChunks(dropEid);
    this.ecs.destroy(dropEid);
  }

  private tickDrops(now: number): void {
    for (const [eid, drop] of this.drops) {
      if (drop.despawnAt <= now) {
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
        continue;
      }
      if (drop.pickupAfter > now) continue;
      const pos = this.positions.must(eid);
      for (const [playerEid, player] of this.players) {
        if (player.session === null) continue;
        // Sneaking steps lightly — nothing sticks to careful feet. This
        // is also the deliberate way to stand IN a pile and pick from
        // it without the walk-over vacuum grabbing the lot.
        if (player.sneaking) continue;
        if (drop.ownerEid !== null && drop.ownerEid !== playerEid && drop.ownerUntil > now) {
          continue;
        }
        const ppos = this.positions.get(playerEid);
        if (!ppos) continue;
        const dx = ppos.x - pos.x;
        const dy = ppos.y - pos.y;
        if (dx * dx + dy * dy > 0.55 * 0.55) continue;
        if (!hasSpaceFor(player.inventory, drop.item)) continue;
        addItem(player.inventory, drop.item, drop.qty, drop.roll);
        if (drop.xpOnPickup) {
          this.grantXp(playerEid, player, drop.xpOnPickup.skill, drop.xpOnPickup.xp);
        }
        player.session.sendJson({ t: 'inv', slots: player.inventory });
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
        break;
      }
    }
  }

  /** Slow out-of-combat regen: 1 hp / 5s. Buff regen works in combat. */
  private tickRegen(now: number): void {
    // Hearty food / mending salve: every 4s, best regen buff wins.
    if (this.tickCount % 80 === 0) {
      for (const [eid, player] of this.players) {
        if (player.session === null) continue;
        // Gear regen affixes join the best-of scan alongside consumables.
        let regen = player.gear.regenPer4s;
        for (const b of player.buffs) regen = Math.max(regen, b.regenPer4s);
        if (regen > 0) {
          const health = this.healths.must(eid);
          if (health.hp < health.maxHp) health.hp = Math.min(health.maxHp, health.hp + regen);
        }
      }
    }
    if (this.tickCount % 100 !== 0) return;
    for (const [eid, player] of this.players) {
      if (player.session === null) continue;
      if (now - player.lastCombatAt < 8000) continue;
      const health = this.healths.must(eid);
      if (health.hp < health.maxHp) health.hp++;
    }
  }

  chat(eid: EntityId, text: string): void {
    const player = this.players.get(eid);
    if (!player) return;
    // /lock — toggle the lock on the nearest shut door in reach. A
    // player feature, not dev-gated: the first rung of the locking
    // ladder (keys and ownership arrive with a later epic).
    if (text.trim() === '/lock') {
      const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      const pos = this.positions.get(eid);
      if (!pos) return;
      const cx = Math.floor(pos.x);
      const cy = Math.floor(pos.y);
      let best: { tx: number; ty: number; info: DoorInfo; d: number } | null = null;
      for (let ty = cy - 2; ty <= cy + 2; ty++) {
        for (let tx = cx - 2; tx <= cx + 2; tx++) {
          const g = this.world.groundAt(tx, ty);
          const info = g === undefined ? null : doorInfo(g);
          if (!info) continue;
          const dx = tx + 0.5 - pos.x;
          const dy = ty + 0.5 - pos.y;
          const d = dx * dx + dy * dy;
          if (d <= 2.2 * 2.2 && (!best || d < best.d)) best = { tx, ty, info, d };
        }
      }
      if (!best) {
        sys('No door within reach.');
        return;
      }
      if (best.info.open) {
        sys('Close the door before locking it.');
        return;
      }
      const unit = this.doorUnit(best.tx, best.ty, best.info);
      const key = `${unit.ax},${unit.ay}`;
      if (this.doorLocks.delete(key)) sys('The lock clicks open.');
      else {
        this.doorLocks.add(key);
        sys('The lock snaps shut.');
      }
      return;
    }
    // Dev-only utility commands, never broadcast.
    if (config.devCommands && text.startsWith('/tp ')) {
      const [, xRaw, yRaw] = text.split(/\s+/);
      const x = Number.parseFloat(xRaw ?? '');
      const y = Number.parseFloat(yRaw ?? '');
      if (Number.isFinite(x) && Number.isFinite(y)) {
        // Land on the CENTER of the nearest walkable tile. A raw corner
        // teleport can overlap the player's radius into a solid
        // neighbor — an embedded body fails every movement candidate
        // and freezes in place with zero feedback.
        const tx0 = Math.floor(x);
        const ty0 = Math.floor(y);
        outer: for (let r = 0; r <= 4; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              const tx = tx0 + dx;
              const ty = ty0 + dy;
              this.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
              if (!this.world.isSolid(tx, ty)) {
                this.teleport(eid, tx + 0.5, ty + 0.5);
                break outer;
              }
            }
          }
        }
      }
      return;
    }
    if (config.devCommands && text.startsWith('/time')) {
      const arg = text.split(/\s+/)[1] ?? '';
      const target = TIME_NAMES[arg] ?? Number.parseFloat(arg);
      if (Number.isFinite(target) && target >= 0 && target < 24) {
        this.timeOfsTicks += ofsForHours(this.tickCount + this.timeOfsTicks, target);
        for (const s of this.sessions) s.sendJson({ t: 'time', ofs: this.timeOfsTicks });
        const now = clockHoursAtTick(this.tickCount, this.timeOfsTicks);
        const hh = Math.floor(now);
        const mm = Math.floor((now - hh) * 60);
        this.systemChatAll(`Time set: ${hh}:${String(mm).padStart(2, '0')}`);
      } else {
        const names = Object.keys(TIME_NAMES).join(', ');
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `/time <0-24 | ${names}>` });
      }
      return;
    }
    if (config.devCommands && text.startsWith('/xp ')) {
      const [, skillRaw, amountRaw] = text.split(/\s+/);
      const amount = Math.max(1, Math.min(10_000_000, Number.parseInt(amountRaw ?? '0', 10) || 0));
      if (skillRaw && isSkillId(skillRaw) && amount > 0) {
        this.grantXp(eid, player, skillRaw, amount);
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `+${amount} ${skillRaw} xp` });
      } else {
        player.session?.sendJson({ t: 'chat', channel: 'system', text: '/xp <skill> <amount>' });
      }
      return;
    }
    if (config.devCommands && text.startsWith('/grow')) {
      const pos = this.positions.get(eid);
      const now = Date.now();
      let grown = 0;
      for (const state of this.crops.values()) {
        if (pos && Math.hypot(state.tx + 0.5 - pos.x, state.ty + 0.5 - pos.y) > 20) continue;
        const remaining = growMs(state.def) - (now - state.plantedAt + state.boostMs);
        if (remaining <= 0) continue;
        state.boostMs += remaining;
        this.accounts.upsertCrop(
          state.tx, state.ty, state.def.id, state.plantedAt, state.boostMs, state.watered, state.owner,
        );
        grown++;
      }
      this.tickCrops(now);
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `Ripened ${grown} crops.` });
      return;
    }
    if (config.devCommands && text.startsWith('/give ')) {
      // /give <item> [qty] [rarity] [power] [enchant] — gear/trinkets
      // mint a fresh roll at the requested tier, item power, and
      // enchant. The Playwright lever.
      const [, item, qtyRaw, rarRaw, pwrRaw, enchRaw] = text.split(/\s+/);
      const def = itemDef(item ?? '');
      const qty = Math.max(1, Math.min(1000, Number.parseInt(qtyRaw ?? '1', 10) || 1));
      const rar = isRarityTier(rarRaw ?? '') ? (rarRaw as ItemRoll['rar']) : undefined;
      const pwrParsed = Number.parseInt(pwrRaw ?? '', 10);
      const pwr =
        Number.isInteger(pwrParsed) && pwrParsed >= 1 && pwrParsed <= MAX_ITEM_POWER
          ? pwrParsed
          : undefined;
      const ench = enchantDef(enchRaw)?.id;
      if (def && hasSpaceFor(player.inventory, def.id)) {
        if (def.gear || def.relic || def.sigil) {
          for (let i = 0; i < qty; i++) {
            const roll = makeRoll(rar ?? 'common');
            roll.pwr = pwr;
            roll.ench = ench;
            addItem(player.inventory, def.id, 1, roll);
          }
        } else {
          addItem(player.inventory, def.id, qty);
        }
        player.session?.sendJson({ t: 'inv', slots: player.inventory });
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Given: ${def.name} ×${qty}${rar ? ` (${rar})` : ''}${pwr ? ` [power ${pwr}]` : ''}`,
        });
      } else {
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `Can't give '${item}'.` });
      }
      return;
    }
    if (config.devCommands && text.startsWith('/spawnmob')) {
      // /spawnmob <npcId> [count] — ephemeral mobs (no respawn) beside
      // the caller. The staging lever: line up the whole bestiary.
      const [, id, countRaw] = text.split(/\s+/);
      const def = id ? NPCS.get(id) : undefined;
      if (!def) {
        const ids = [...NPCS.keys()].join(', ');
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `/spawnmob <id> [count] — ${ids}` });
        return;
      }
      const count = Math.max(1, Math.min(8, Number.parseInt(countRaw ?? '1', 10) || 1));
      const pos = this.positions.get(eid);
      if (!pos) return;
      let placed = 0;
      for (let i = 0; i < count; i++) {
        let x = pos.x + 1.5;
        let y = pos.y;
        for (let tries = 0; tries < 10; tries++) {
          const a = Math.random() * Math.PI * 2;
          const r = 1.2 + Math.random() * 2.2;
          const tx = pos.x + Math.cos(a) * r;
          const ty = pos.y + Math.sin(a) * r;
          if (!this.world.isSolid(Math.floor(tx), Math.floor(ty))) {
            x = tx;
            y = ty;
            break;
          }
        }
        this.spawnNpc(def, x, y, -1);
        placed++;
      }
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `Spawned ${def.name} ×${placed}.` });
      return;
    }
    if (config.devCommands && text.startsWith('/spawnnpc')) {
      // /spawnnpc <slug> — ephemeral copy of a defined actor beside
      // the caller (no post, no respawn). The staging lever: audit any
      // actor's face, gear, and voice without walking to their post.
      const [, slug] = text.split(/\s+/);
      const actor = slug ? this.actorDefs.get(slug) : undefined;
      if (!actor) {
        const ids = [...this.actorDefs.keys()].join(', ');
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `/spawnnpc <slug> — ${ids}` });
        return;
      }
      const pos = this.positions.get(eid);
      if (!pos) return;
      let x = pos.x + 1.5;
      let y = pos.y;
      for (let tries = 0; tries < 10; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.2 + Math.random() * 1.6;
        const tx = pos.x + Math.cos(a) * r;
        const ty = pos.y + Math.sin(a) * r;
        if (!this.world.isSolid(Math.floor(tx), Math.floor(ty))) {
          x = tx;
          y = ty;
          break;
        }
      }
      this.spawnActor(actor, x, y, -1);
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `Spawned ${actor.name}.` });
      return;
    }
    if (config.devCommands && text.startsWith('/givekey')) {
      // /givekey [tier] [power] [seed] — mint a dungeon key. The
      // staging lever for the whole dungeon system: any tier, any
      // power, or an exact seed to revisit a known layout.
      const [, tierRaw, powerRaw, seedRaw] = text.split(/\s+/);
      const tier = tierRaw ?? 'common';
      if (!isRarityTier(tier)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `/givekey [${RARITY_TIERS.join('|')}] [power] [seed]`,
        });
        return;
      }
      const seed = seedRaw !== undefined
        ? (Number.parseInt(seedRaw, 10) >>> 0)
        : (Math.floor(Math.random() * 0x100000000) >>> 0);
      const powerNum = Number.parseInt(powerRaw ?? '', 10);
      const pwr = Number.isFinite(powerNum) && powerNum >= 1
        ? Math.min(99, powerNum)
        : mintKeyPower(tier, seed);
      const got = addItem(player.inventory, DUNGEON_KEY_ITEM, 1, { rar: tier, seed, pwr });
      if (got === 0) {
        player.session?.sendJson({ t: 'chat', channel: 'system', text: 'Pack is full.' });
        return;
      }
      const spec = dungeonSpecFromRoll({ rar: tier, seed, pwr });
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Key minted: ${spec.name} (${spec.sigil}) — ${tier}, power ${spec.power}.`,
      });
      return;
    }
    if (config.devCommands && text.startsWith('/spawnchest')) {
      // /spawnchest [wood|iron|gilded|mossy] — a closed chest on the
      // nearest open tile beside the caller. Transient (not a built
      // tile): chunk regen sweeps it, which is what staging wants.
      const [, kindRaw] = text.split(/\s+/);
      const kind = (kindRaw ?? 'wood') as ChestKind;
      if (!['wood', 'mossy', 'iron', 'gilded', 'boss'].includes(kind)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: '/spawnchest [wood|mossy|iron|gilded|boss]',
        });
        return;
      }
      const pos = this.positions.get(eid);
      if (!pos) return;
      for (let tries = 0; tries < 14; tries++) {
        const a = (tries / 14) * Math.PI * 2;
        const r = 1.4 + Math.floor(tries / 7) * 0.9;
        const tx = Math.floor(pos.x + Math.cos(a) * r);
        const ty = Math.floor(pos.y + Math.sin(a) * r);
        if (this.world.isSolid(tx, ty)) continue;
        if (Math.floor(pos.x) === tx && Math.floor(pos.y) === ty) continue;
        this.setWorldTile(tx, ty, closedChestTile(kind));
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `A ${kind} chest lands at ${tx}, ${ty}.`,
        });
        return;
      }
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'No open ground nearby.' });
      return;
    }
    for (const s of this.sessions) {
      if (s.playerEid === eid || s.knownEntities.has(eid)) {
        s.sendJson({ t: 'chat', channel: 'local', from: player.name, eid, text });
      }
    }
  }

  private systemChatAll(text: string): void {
    for (const s of this.sessions) s.sendJson({ t: 'chat', channel: 'system', text });
  }

  // ------------------------------------------------------------ tick

  private tick(): void {
    this.tickCount++;
    const now = Date.now();

    // Projectiles move FIRST, before this tick's inputs can spawn new
    // ones — a shot always survives to the interest update at the end
    // of its birth tick, so clients see even point-blank arrows (and
    // can render their impacts) instead of them dying unseen.
    this.tickProjectiles();

    for (const [eid, player] of this.players) {
      if (player.session === null && player.disconnectedAt !== null) {
        if (now - player.disconnectedAt > RECONNECT_GRACE_MS) this.despawnPlayer(eid);
        continue;
      }
      this.processPlayerInputs(eid, player);
      if (player.action) this.tickAction(eid, player);
    }

    this.tickSpawns(now);
    this.tickNpcs(now);
    this.tickActors();
    // NPC positions are final for this tick — log the lag-comp ring.
    this.recordNpcHistory();
    this.tickSneakXp();
    this.tickStatuses();
    this.tickSummons();
    this.tickBlasts();
    this.tickFields();
    this.tickDrops(now);
    this.tickRegen(now);
    if (this.tickCount % 40 === 0) this.tickCrops(now);

    // Respawn depleted nodes (and pull forgotten doors to).
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const entry = this.respawnQueue[i]!;
      if (entry.at > now) continue;
      const d = doorInfo(entry.tile);
      if (d && !d.open) {
        // Door auto-close: the unit shuts as ONE (matching the merged
        // opening) and never onto a body — an occupied doorway defers
        // the timer instead of embedding whoever stands in it.
        const g = this.world.groundAt(entry.tx, entry.ty);
        const gi = g === undefined ? null : doorInfo(g);
        if (gi === null || !gi.open) {
          // Already shut by hand, or the doorway is gone — drop it.
          this.respawnQueue.splice(i, 1);
          continue;
        }
        const unit = this.doorUnit(entry.tx, entry.ty, gi);
        if (unit.tiles.some((t) => this.bodyOnTile(t.x, t.y))) {
          entry.at = now + 5000;
          continue;
        }
        for (const t of unit.tiles) {
          const gg = this.world.groundAt(t.x, t.y)!;
          this.setWorldTile(t.x, t.y, shutDoorTile(gg)!);
        }
        this.respawnQueue.splice(i, 1);
        continue;
      }
      const cur = this.world.groundAt(entry.tx, entry.ty);
      if (entry.over !== undefined && cur !== entry.over) {
        // The world moved on under this entry — let it go.
        this.respawnQueue.splice(i, 1);
        continue;
      }
      // Never stand a solid back up THROUGH a body: if the tile is
      // currently walkable and about to turn solid, an occupant defers
      // the timer (same courtesy the doors extend).
      const becomingSolid =
        TILE_DEFS[entry.tile]?.solid && !(cur !== undefined && TILE_DEFS[cur as Tile]?.solid);
      if (becomingSolid && this.bodyOnTile(entry.tx, entry.ty)) {
        entry.at = now + 5000;
        continue;
      }
      this.setWorldTile(entry.tx, entry.ty, entry.tile);
      this.respawnQueue.splice(i, 1);
    }

    for (const session of this.sessions) {
      if (session.playerEid === null) continue;
      this.updateInterest(session);
      this.sendSnapshot(session);
    }

    if (this.tickCount % SAVE_INTERVAL_TICKS === 0) this.saveAll();
  }

  private processPlayerInputs(eid: EntityId, player: PlayerComp): void {
    const pos = this.positions.must(eid);
    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.offhandEchoTicks > 0 && --player.offhandEchoTicks === 0) {
      this.offhandStrike(eid, player, player.offhandEchoAim);
    }
    for (let i = 0; i < ABILITY_SLOTS; i++) {
      if (player.abilityCd[i]! > 0) player.abilityCd[i]!--;
    }
    if (player.buffs.length > 0) {
      const expired = player.buffs.some((b) => this.tickCount >= b.untilTick && b.channel);
      player.buffs = player.buffs.filter((b) => this.tickCount < b.untilTick);
      // A tonic or meal ran out — clear its HUD chip.
      if (expired) this.sendBuffs(player);
    }
    const equipped = this.equippedWeapon(player);
    const style = equipped?.weapon.style ?? null;
    let moved = false;
    let frames = 0;
    while (frames < MAX_INPUTS_PER_TICK && player.inputQueue.length > 0) {
      const frame = player.inputQueue.shift()!;
      const casting = this.tickCount < player.castFreezeUntilTick;
      // Moving cancels any in-progress gather.
      if (player.action && (Math.abs(frame.mx) > 0.01 || Math.abs(frame.my) > 0.01)) {
        this.cancelAction(eid, player, 'moved');
      }
      // Drawing a bow is a braced stance — same rule the client predicts.
      let speed = isDrawSlowed(frame, style)
        ? player.speed * DRAW_MOVE_FACTOR
        : player.speed;
      for (const b of player.buffs) speed *= b.speedMult;
      if (this.hasPassive(player, 'fleet_footed')) speed *= 1.08;
      speed *= player.gear.speedMult; // plate drags, leather springs
      if (this.isChilled(eid)) speed *= CHILL_SPEED_FACTOR;
      if (casting) speed = 0; // committed to the cast
      const next = stepMovement(pos, frame, speed, TICK_DT, this.world);
      if (next.x !== pos.x || next.y !== pos.y) {
        moved = true;
        player.sneakMoveAccum += Math.hypot(next.x - pos.x, next.y - pos.y);
      }
      pos.x = next.x;
      pos.y = next.y;
      pos.dir = frame.aim;

      // Abilities fire on the press edge — holding Q is one cast.
      const pressed = frame.buttons & ~player.prevButtons;
      player.prevButtons = frame.buttons;
      if (pressed & InputButton.Ability1) this.tryCastAbility(eid, player, 0, frame.aim);
      if (pressed & InputButton.Ability2) this.tryCastAbility(eid, player, 1, frame.aim);
      if (pressed & InputButton.Ability3) this.tryCastAbility(eid, player, 2, frame.aim);
      if (pressed & InputButton.Ability4) this.tryCastAbility(eid, player, 3, frame.aim);
      // Dodge dash: same seq-cooldown rule the client predicts with.
      if (
        hasButton(frame.buttons, InputButton.Dodge) &&
        frame.seq >= player.lastDodgeSeq + DODGE_COOLDOWN_SEQ &&
        Math.hypot(frame.mx, frame.my) > 0.01
      ) {
        player.lastDodgeSeq = frame.seq;
        const dashed = applyDodge(pos, frame.mx, frame.my, this.world);
        pos.x = dashed.x;
        pos.y = dashed.y;
        moved = true;
        player.drawTicks = 0; // dodging lets the string down
        // Wolf Reflexes: the dodge itself becomes an engage/escape tool.
        if (this.hasPassive(player, 'dodge_haste')) {
          player.buffs.push(mkBuff({ speedMult: 1.35, untilTick: this.tickCount + 30 }));
        }
      }
      player.lastProcessedSeq = frame.seq;

      // A cast this frame (or one still resolving) holds the basic back.
      const stillCasting = this.tickCount < player.castFreezeUntilTick;
      const attackHeld = hasButton(frame.buttons, InputButton.Attack) && !stillCasting;
      if (style === 'archery') {
        this.tickBowDraw(eid, player, equipped!.weapon, attackHeld, frame.aim, frame.seq);
      } else if (attackHeld) {
        this.tryPlayerAttack(eid, player, frame.aim, frame.seq);
      }
      frames++;
    }

    // Stealth: the latch is a pure function of the last processed frame's
    // held bit, so it survives empty ticks and packet loss. Hidden is
    // strictly layered on top: hidden ⇒ sneaking.
    player.sneaking = hasButton(player.prevButtons, InputButton.Sneak);
    if (player.sneaking) {
      player.sneakStillTicks = moved ? 0 : player.sneakStillTicks + 1;
    } else {
      player.sneakStillTicks = 0;
      player.sneakMoveAccum = 0;
    }
    const sneakLevel = this.effectiveLevel(player, 'sneak');
    const wantHidden =
      player.sneaking &&
      this.tickCount >= player.revealLockUntilTick &&
      (sneakLevel >= SNEAK_MOVE_HIDE_LEVEL ||
        (sneakLevel >= SNEAK_HIDE_LEVEL && player.sneakStillTicks >= SNEAK_STILL_TICKS));
    if (wantHidden !== player.hidden) this.setHidden(eid, player, wantHidden);

    if (player.drawTicks > 0) {
      // Drawing overrides everything else visually until release.
      this.setPose(eid, PoseState.Draw, 2);
    } else if (this.tickCount < player.poseUntilTick) {
      // Hold a transient combat pose (attack/hurt) briefly.
    } else if (player.action) {
      // Craft reads as station work (hammering, stoking); everything
      // else keeps the tool-swinging gather pose.
      this.poses.set(
        eid,
        player.action.kind === 'craft' ? PoseState.Craft : PoseState.Gather,
      );
    } else {
      this.poses.set(
        eid,
        player.sneaking ? PoseState.Sneak : moved ? PoseState.Walk : PoseState.Idle,
      );
    }
    if (moved) this.updateChunkMembership(eid);
  }

  /**
   * Charged archery: holding Attack draws the string (slowed, telegraphed
   * to everyone via the Draw pose); releasing looses an arrow whose
   * damage, speed, and range scale with the draw. A tiny draw fumbles.
   */
  private tickBowDraw(
    eid: EntityId,
    player: PlayerComp,
    weapon: WeaponStats,
    attackHeld: boolean,
    aim: number,
    seq: number,
  ): void {
    if (attackHeld) {
      if (player.drawTicks === 0) {
        // Starting a draw needs a ready bow and an arrow to nock.
        if (player.attackCooldown > 0) return;
        if (weapon.ammo && countItem(player.inventory, weapon.ammo) === 0) {
          player.session?.sendJson({ t: 'chat', channel: 'system', text: 'Out of arrows!' });
          player.attackCooldown = 20;
          return;
        }
      }
      player.drawTicks = Math.min(DRAW_FULL_TICKS + 10, player.drawTicks + 1);
      return;
    }
    if (player.drawTicks === 0) return;
    const ticks = player.drawTicks;
    player.drawTicks = 0;
    // Loosing the arrow is the giveaway, not drawing the string.
    this.revealPlayer(eid, player);

    const level = this.effectiveLevel(player, 'archery');
    const base = Math.max(
      1,
      Math.round(weapon.damage * (1 + level * 0.05) * player.gear.styleDmgMult.archery),
    );
    const pos = this.positions.must(eid);
    const fire = (shot: { maxHit: number; speed: number; range: number }, angle: number, fullDraw: boolean) => {
      const proj = this.ecs.create();
      this.kinds.set(proj, EntityKind.Projectile);
      this.positions.set(proj, { x: pos.x, y: pos.y, dir: angle });
      this.projectiles.set(proj, {
        ownerEid: eid,
        style: 'archery',
        maxHit: shot.maxHit,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle),
        speed: shot.speed,
        distLeft: shot.range,
        basic: true,
        fullDraw,
        spawnSeq: seq,
        // Biting Draw passive: a full draw carries the cold with it.
        status:
          fullDraw && this.hasPassive(player, 'chill_charged')
            ? { status: 'chill', power: 1, durationTicks: 80 }
            : undefined,
      });
      this.updateChunkMembership(proj);
    };

    if (ticks < DRAW_MIN_TICKS) {
      // SNAP SHOT — tap-fire from the hip. Weak, short, instant, and
      // chainable: tap-tap-tap is rapid fire, and the third tap in
      // rhythm looses a two-arrow fan.
      if (weapon.ammo) {
        if (removeItem(player.inventory, weapon.ammo, 1) === 0) return;
        player.session?.sendJson({ t: 'inv', slots: player.inventory });
      }
      const stage = nextSnapStage(player.snapStage, this.tickCount <= player.snapGraceUntilTick);
      player.snapStage = stage;
      player.attackCooldown = SNAP_RECOVERY_TICKS;
      player.snapGraceUntilTick = this.tickCount + SNAP_RECOVERY_TICKS + SNAP_GRACE_TICKS;
      player.lastCombatAt = Date.now();
      this.setPose(eid, PoseState.Loose, 4);
      const shot = snapShot(base, weapon.projectileSpeed ?? 12, weapon.range);
      fire(shot, aim, false);
      if (stage === 2) {
        // The rhythm reward: a second arrow rides the third tap.
        fire(shot, aim + 0.14, false);
      }
      return;
    }

    player.snapStage = 0; // a drawn shot resets the snap rhythm
    if (weapon.ammo) {
      if (removeItem(player.inventory, weapon.ammo, 1) === 0) return;
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
    }
    player.attackCooldown = weapon.cooldownTicks;
    player.lastCombatAt = Date.now();
    this.setPose(eid, PoseState.Loose, 6);
    const shot = chargedShot(drawCharge(ticks), base, weapon.projectileSpeed ?? 12, weapon.range);
    fire(shot, aim, ticks >= DRAW_FULL_TICKS);
  }

  // ------------------------------------------------- interest management

  private chunkKeyOf(x: number, y: number): string {
    return chunkKey(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
  }

  private updateChunkMembership(eid: EntityId): void {
    const pos = this.positions.must(eid);
    const key = this.chunkKeyOf(pos.x, pos.y);
    const prev = this.entityChunk.get(eid);
    if (prev === key) return;
    if (prev !== undefined) this.chunks.get(prev)?.delete(eid);
    let set = this.chunks.get(key);
    if (!set) {
      set = new Set();
      this.chunks.set(key, set);
    }
    set.add(eid);
    this.entityChunk.set(eid, key);
  }

  private removeFromChunks(eid: EntityId): void {
    const prev = this.entityChunk.get(eid);
    if (prev !== undefined) {
      this.chunks.get(prev)?.delete(eid);
      this.entityChunk.delete(eid);
    }
  }

  /** Diff the session's known set against what's visible; send enter/leave. */
  private updateInterest(session: Session): void {
    const eid = session.playerEid!;
    const pos = this.positions.get(eid);
    if (!pos) return;

    const ccx = Math.floor(pos.x / CHUNK_SIZE);
    const ccy = Math.floor(pos.y / CHUNK_SIZE);
    const visible = new Set<EntityId>();
    const windowKeys = new Set<string>();
    for (let cy = ccy - INTEREST_CHUNK_RADIUS; cy <= ccy + INTEREST_CHUNK_RADIUS; cy++) {
      for (let cx = ccx - INTEREST_CHUNK_RADIUS; cx <= ccx + INTEREST_CHUNK_RADIUS; cx++) {
        const key = chunkKey(cx, cy);
        windowKeys.add(key);
        if (!session.knownChunks.has(key)) {
          session.knownChunks.add(key);
          session.sendBinary(encodeChunk(this.world.ensure(cx, cy)));
        }
        const set = this.chunks.get(key);
        if (set) for (const e of set) visible.add(e);
      }
    }
    for (const key of session.knownChunks) {
      if (!windowKeys.has(key)) session.knownChunks.delete(key);
    }

    // Fully-hidden players simply aren't there to anyone else: the diff
    // below issues the leave (and later the fresh re-enter) for free, and
    // snapshots only iterate knownEntities so nothing leaks meanwhile.
    for (const e of visible) {
      if (e !== eid && this.players.get(e)?.hidden) visible.delete(e);
    }

    const enters: EntityMeta[] = [];
    for (const e of visible) {
      if (!session.knownEntities.has(e)) {
        session.knownEntities.add(e);
        enters.push(this.buildMeta(e));
      }
    }
    const leaves: EntityId[] = [];
    for (const e of session.knownEntities) {
      if (!visible.has(e)) {
        session.knownEntities.delete(e);
        leaves.push(e);
      }
    }

    if (enters.length > 0) session.sendJson({ t: 'enter', entities: enters });
    if (leaves.length > 0) session.sendJson({ t: 'leave', eids: leaves });
  }

  private buildMeta(eid: EntityId): EntityMeta {
    const kind = this.kinds.must(eid);
    const pos = this.positions.must(eid);
    const meta: EntityMeta = { eid, kind, x: pos.x, y: pos.y };
    const player = this.players.get(eid);
    if (player) {
      meta.name = player.name;
      // Appearance carries item IDS only — rendering never needs rolls.
      // Enchants are the exception: they change how gear LOOKS, so the
      // enchanted slots ride along (ids only, still no rolls).
      const equip: Partial<Record<EquipSlot, string>> = {};
      let ench: Partial<Record<EquipSlot, string>> | undefined;
      for (const [slot, worn] of Object.entries(player.equipment)) {
        if (!worn) continue;
        equip[slot as EquipSlot] = worn.id;
        if (worn.roll?.ench) {
          ench ??= {};
          ench[slot as EquipSlot] = worn.roll.ench;
        }
      }
      meta.appearance = {
        bodyColor: '',
        equip,
        ench,
        look: player.look ?? undefined,
        carry: player.carryStyle === 'rogue' ? 'rogue' : undefined,
        carryOff: player.carryOff === 'rogue' ? 'rogue' : undefined,
      };
    }
    const npc = this.npcs.get(eid);
    if (npc) {
      meta.name = npc.def.name;
      meta.defId = npc.def.id;
      meta.level = npc.def.level;
    }
    const actorComp = this.actors.get(eid);
    if (actorComp) {
      const actor = actorComp.actor;
      meta.name = actor.name;
      if (actor.title) meta.title = actor.title;
      if (actor.model.kind === 'creature') {
        // The bestiary body carries the art; the actor carries the name.
        meta.defId = actor.model.creature;
      } else {
        // Humanoids ride the wire exactly like players: a Look plus
        // worn item ids, rendered by the one humanoid rig.
        const appearance = actorAppearance(actor);
        if (appearance) meta.appearance = appearance;
      }
      // No combat body = never attackable: clients offer Talk, and no
      // combat loop can even see this entity.
      if (!npc) meta.friendly = true;
    }
    const drop = this.drops.get(eid);
    if (drop) {
      meta.defId = drop.item;
      meta.qty = drop.qty;
      meta.roll = drop.roll;
    }
    const proj = this.projectiles.get(eid);
    if (proj) {
      const base = proj.heavy ? `${proj.style}_heavy` : proj.style;
      meta.defId = proj.element ? `${base}:${proj.element}` : base;
      // Tracer handoff identity (v8): the owner's client matches its
      // predicted shot to this entity by (ownerEid, seq).
      meta.ownerEid = proj.ownerEid;
      if (proj.spawnSeq !== undefined) meta.seq = proj.spawnSeq;
    }
    const summon = this.summons.get(eid);
    if (summon) meta.defId = `summon_${summon.kind}`;
    return meta;
  }

  private sendSnapshot(session: Session): void {
    const player = this.players.get(session.playerEid!);
    if (!player) return;
    const entities: SnapshotEntity[] = [];
    for (const eid of session.knownEntities) {
      const pos = this.positions.get(eid);
      if (!pos) continue;
      const health = this.healths.get(eid);
      entities.push({
        eid,
        x: pos.x,
        y: pos.y,
        dir: pos.dir,
        pose: this.poses.get(eid) ?? PoseState.Idle,
        hpPct: health ? Math.round((health.hp / health.maxHp) * 255) : 255,
        status: this.statusBits(eid),
      });
    }
    session.sendBinary(
      encodeSnapshot({
        serverTick: this.tickCount,
        lastInputSeq: player.lastProcessedSeq,
        entities,
      }),
    );
  }
}
