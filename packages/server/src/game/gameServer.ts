import { randomBytes } from 'node:crypto';
import {
  CHUNK_SIZE,
  EcsWorld,
  EntityKind,
  INTEREST_CHUNK_RADIUS,
  PLAYER_SPEED,
  POS_SCALE,
  PoseState,
  RECONNECT_GRACE_MS,
  TICK_DT,
  TICK_MS,
  TIME_NAMES,
  chunkKey,
  clockHoursAtTick,
  SUNRISE,
  SUNSET,
  ofsForHours,
  encodeChunk,
  encodeSnapshot,
  encodeTilePatch,
  combatLevel,
  focusBudget,
  FOCUS_MILESTONE_LEVEL,
  FOCUS_MASTERY_LEVEL,
  isSkillId,
  resolveSkillId,
  isCombatSchool,
  COMBAT_LESSON_FRAC,
  XP_PER_DMG_SCHOOL,
  XP_PER_DMG_VITALITY,
  XP_KILL_SCHOOL_FRAC,
  xpMarkAllowance,
  levelForXp,
  honedAbility,
  techniqueRank,
  techniqueRankFor,
  artFlag,
  lessonFlag,
  masteryXp,
  RANK_ROMAN,
  rideSpeedMult,
  stepMovement,
  xpForLevel,
  GENTLE_HP_FRAC,
  PET_CAP,
  PET_CALM_SPEED,
  PET_CALM_TICKS,
  PET_CATCHUP_DIST,
  PET_TRAIL_OUT,
  PET_WINDUP_TICKS,
  PET_FIGHT_LEASH,
  PET_HARRY_COOLDOWN_TICKS,
  PET_DOWNED_TICKS,
  PET_TEND_TICKS,
  PET_TEND_HP_FRAC,
  PET_TEND_SALVE_FRAC,
  PET_TEND_XP,
  PET_REST_HOME_MS,
  PET_BOND_COOLDOWN_MS,
  PET_BOND_XP,
  PET_BOND_PET_XP,
  PET_BOND_HEAL_FRAC,
  PET_REGEN_TICKS,
  PET_REGEN_DELAY_TICKS,
  PET_XP_PER_DMG,
  PET_TRICKLE_DIVISOR,
  PET_KILL_XP_FRAC,
  petFollowSpeed,
  petLevelFor,
  sanitizePetName,
  type PetInfo,
  type EntityId,
  type EntityMeta,
  type InputFrame,
  type CarryStyle,
  type Look,
  type InvSlot,
  MAX_ITEM_POWER,
  QUALITY_BASE,
  rarityIndex,
  QUALITY_CEIL,
  QUALITY_FLOOR,
  type ItemRoll,
  type EquippedItem,
  type SkillId,
  type SkillXp,
  type SnapshotEntity,
  isRarityTier,
  saplingOf,
  TREE_TILES,
  Tile,
  tileDef,
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
  groundAimed,
  groundAimRange,
  nearestFloorTile,
  isSignTile,
  sanitizeSignText,
  TILE_DEFS,
  type DestructibleInfo,
  type SignInfo,
  type VoiceWire,
} from '@arx/shared';
import {
  BUILDABLES,
  buildableForTile,
  buildableForDetail,
  buildableGround,
  DYE_PIGMENTS,
  CROP_BY_SEED,
  CROPS,
  SHOPS,
  NODES_BY_TILE,
  NPCS,
  PACK_RALLY_RANGE,
  HELP_SEEK_RANGE,
  levelAggroFactor,
  RECIPES,
  STARTER_KIT,
  TOOL_TIER_NAMES,
  TOWN_SPAWNS,
  abilityDef,
  actorAppearance,
  actorCombatDef,
  bandDy,
  dialogueDoneFlag,
  pickDialogue,
  pickRoutineSlot,
  slotContains,
  growMs,
  isCropTile,
  gradeFor,
  gradedId,
  wateringsOf,
  bedTileFor,
  harvestXp,
  PRUNED_BIT,
  LIVESTOCK,
  LIVESTOCK_BY_CRATE,
  LIVESTOCK_CAP,
  TROUGH_STOCK_CAP,
  TROUGH_FEED_CAP,
  FED_COOLDOWN_MULT,
  BRUSH_COOLDOWN_MS,
  BRUSH_XP,
  BOND_CAP,
  BOND_PRIME,
  feedWorthOf,
  gradeOf,
  livestockGrade,
  npcDef,
  GRADED_PRODUCE,
  WORK_RECIPES,
  WORK_STATION_TILES,
  WORK_BATCH_CAP,
  workDone,
  workOutputId,
  APIARY_MINUTES,
  APIARY_STORE_CAP,
  APIARY_FLOWER_RANGE,
  apiaryGrade,
  larderEpoch,
  larderHost,
  larderOrder,
  compostWorthOf,
  COMPOST_BATCH_WORTH,
  COMPOST_MINUTES,
  COMPOST_PRIME_WORTH,
  COMPOST_COLLECT_XP,
  MULCH_FIBRE_COST,
  WELL_SWEEP_RANGE,
  WELL_SWEEP_RADIUS,
  CHANNEL_FEED_RANGE,
  SOIL_ENRICHED,
  SOIL_RICH,
  aggregateGearStats,
  craftRarityWeights,
  effectiveReq,
  instanceName,
  isTwoHanded,
  ITEMS,
  itemDef,
  makeRoll,
  npcHitHeight,
  npcLivestock,
  GEM_BATTLESTAFFS,
  pickRarity,
  canUnmake,
  ELEMENT_COLORS,
  inscriptionQuality,
  qualityWord,
  resonanceShift,
  seatFor,
  carriesProc,
  TARGETED_ACTIONS,
  DEEPEN_MIN_RARITY,
  enchantDef,
  unmakingOf,
  type ArxElement,
  type EnchantTier,
  type ProcAction,
  type ProcEffect,
  type ProcMoment,
  mkProcRuntime,
  procWakes,
  type ProcRuntime,
  rollLoot,
  rolledStats,
  trinketPowerMult,
  weaponStrikeEffects,
  type GearStats,
  stageEndMs,
  stageForElapsed,
  techniqueDef,
  techniquePoolDef,
  techniquesFor,
  tameDef,
  TAMES,
  isWildBeast,
  isBeastSovereign,
  petStatBlock,
  TECHNIQUES,
  SECRET_ARTS,
  callingDef,
  callingsFor,
  foldEffect,
  isAggregateCallingEffect,
  tileForStage,
  type BuildableDef,
  type CropDef,
  type DialogueChoice,
  type DialogueDef,
  type QuestDef,
  type DialogueHook,
  type DialogueNode,
  type DialogueOffer,
  type NodeDef,
  type NpcActorDef,
  type NpcDef,
  type RoutineDef,
  type RoutineTask,
  type RoutineTaskPath,
  type ZoneActorSpawn,
  type ZoneDef,
  type RecipeDef,
  type WeaponStats,
  type PrefabDef,
  type PoiDef,
  AUTHORED_WILD_SITES,
  BOUNTY_FLAG_PREFIX,
  FRONTIER,
  POI_DEFS,
  POI_PREFABS,
  ROAD_CALM,
  ROAD_SHOULDER,
  SETTLED_ANCHORS,
  bountyFlag,
  creepWaitFor,
  dangerLaw,
  emberLingerFor,
  holdEmberFor,
  fallowRestFor,
  FACTIONS,
  STANDING_CLAMP,
  answerFactionFlag,
  bandAtLeast,
  crossDeltas,
  factionDef,
  factionOfActor,
  factionOfNpc,
  isFactionFlag,
  isFenceFaction,
  theftChance,
  type FactionBand,
  isQuestFlag,
  isWorldFlag,
  parseFactionFlag,
  parseQuestFlag,
  questDoneFlag,
  standingBand,
  standingPriceMult,
  standingSellMult,
  peddlerLingerFor,
  GROWTH,
  GROWTH_BARE,
  GROWTH_DRIFTED,
  GROWTH_SCAR,
  GROWTH_SEEDS,
  GROWTH_STATE_NAMES,
  bareRestFor,
  bushRestFor,
  drawSpecies,
  germEveryFor,
  germSproutFor,
  germinationChance,
  growthDialectOf,
  hostTileFor,
  growthTileForState,
  projectGrowth,
  type GrowthRow,
  composeKnot,
  familiesOf,
  leanWild,
  territoryAt,
  pickWild,
  scatterLingerFor,
  stageWaitFor,
  WILD_KNOT_SPREAD,
  replaceGeography,
  roadDistanceAt,
  wildCandidates,
  type GeographyDef,
  VOICE,
  type VoiceBankDef,
  type VoiceClipDef,
  type VoiceSlot,
  mountDef,
  MOUNTS,
  isDaggerStats,
  movesetFor,
  strikePose,
  STRONGHOLD_DEFS,
  PLANNED_ZONE_RECTS,
} from '@arx/content';
import {
  collectVoicePrefetch,
  matchActorLineClip,
  pickQuipClip,
  quipIsRationed,
  quipSlotForBeat,
  quipWire,
  voiceWireForNode,
} from '../voice/resolve.js';
import {
  POI_CELL,
  ZONE_CLEARANCE,
  composePoi,
  findAuthoredAnchor,
  loadPoiPrefabs,
  poiCellKey,
  poiCellOf,
  poiContext,
  poiForCell,
  poiSiteBlocked,
  type ClaimRing,
  type PoiContext,
  type PoiSite,
} from '../world/pois.js';
import {
  CAPITAL_PAD_TILES,
  capitalKey,
  capitalLatticeRange,
  capitalMasked,
  composeStronghold,
  strongholdSeat,
  type CapitalSeat,
} from '../world/strongholds.js';
import {
  composeFinds,
  findsForCell,
  findsZoneId,
  type MinorFind,
} from '../world/finds.js';
import { DARK_BAND_Y, groundProbeAt } from '@arx/content';
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
  CAST_STILL_FACTOR,
  CHILL_SPEED_FACTOR,
  TECHNIQUE_STYLES,
  HEAVY_BOLT_KNOCKBACK,
  HEAVY_BOLT_MULT,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  HOMING_SEEK_RANGE,
  VENOM_TICK_EVERY,
  NPC_POWER_PER_LEVEL,
  PLAYER_POWER_PER_LEVEL,
  npcMaxHit,
  mitigate,
  SHIELD_ARMOR_PER_LEVEL,
  powerMult as powerMultFn,
  scaledMaxHit,
  InputButton,
  SHOCK_MAX_TICKS,
  SLOT_TECH_Q,
  SLOT_RELIC,
  SLOT_SIGIL,
  SLOT_TECH_E,
  SHEATHED_BIT,
  SNAP_GRACE_TICKS,
  SNAP_RECOVERY_TICKS,
  TWOHAND_ARC_HALF,
  TWOHAND_COMBO_GRACE_TICKS,
  TWOHAND_FINISHER_DAMAGE_MULT,
  TWOHAND_FINISHER_KNOCKBACK_MULT,
  TWOHAND_FINISHER_RECOVERY_MULT,
  TWOHAND_KNOCKBACK_MULT,
  TWOHAND_STAGE2_DAMAGE_MULT,
  SNEAK_HIDDEN_BIT,
  SNEAK_DETECTED_BIT,
  SNEAK_HIDE_LEVEL,
  SNEAK_MOVE_HIDE_LEVEL,
  SNEAK_STILL_TICKS,
  SNEAK_REVEAL_LOCK_TICKS,
  SNEAK_XP_PERIOD_TICKS,
  SNEAK_XP_MIN_MOVE,
  SNEAK_XP_RADIUS,
  SNEAK_CASE_CAP_PER_LEVEL,
  BACKSTAB_MULT_DEFAULT,
  BACKSTAB_XP_BASE,
  DUALWIELD_UNLOCK_ONEHAND,
  HIDDEN_SKILLS,
  OFFHAND_DELAY_TICKS,
  offhandDamageFactor,
  sneakDetectionFactor,
  ALERT_DECAY,
  ALERT_GRACE_TICKS,
  ALERT_ICON_ENGAGED,
  ALERT_ICON_HUNTING,
  ALERT_ICON_NONE,
  ALERT_ICON_WARY,
  ALERT_MAX,
  ALERT_SUS,
  ALERT_WATCH_CAP,
  DEFAULT_SIGHT_ARC,
  LOSE_SIGHT_FACTOR,
  SIGHT_CLOSE_RANGE,
  SIGHT_RANGE_MULT,
  alertRate,
  sightLine,
  sightVisibility,
  sightZone,
  type SightZone,
  STATION_TILES,
  STATUS_BIT,
  WALL_RUN_TILES,
  FENCE_TILES,
  GARRISON_TILES,
  applyDodge,
  diagWallInfo,
  diagWallTile,
  orientDiagWall,
  orientDiagFence,
  encodeDetailPatch,
  HANGABLE_WALL_TILES,
  AWNING_HOST_TILES,
  SIGN_MOTIF_COUNT,
  TRELLIS_SPECIES_COUNT,
  wallHungInfo,
  wallBannerDetail,
  pennantDetail,
  bracketSignDetail,
  trellisDetail,
  awningInfo,
  awningTile,
  bannerPoleTile,
  AWNING_SHAPES,
  DYE_COUNT,
  Detail,
  chargedShot,
  circleHitsSolid,
  findPathNav,
  isSeatTile,
  lineClear,
  newSteerMemory,
  pickSeatDir,
  pointHitsSolid,
  seatAt,
  steerToward,
  drawCharge,
  hasButton,
  hasteOnHit,
  isDrawSlowed,
  isBehind,
  advanceCombo,
  armBuffer,
  freshCombo,
  isOvercharged,
  OVERCHARGE_TICKS,
  resetCombo,
  DODGE_CANCEL_FLOOR_TICKS,
  GUARD_SWEEP_KNOCKBACK,
  GUARD_SWEEP_RANGE,
  GUARD_SWEEP_WINDUP,
  KNIFE_HUNGER_SPEED,
  KNIFE_HUNGER_TICKS,
  STRIKE_CLOCKS,
  SNAP_CHAIN,
  VOLLEY_DMG_FACTOR,
  VOLLEY_SPREAD,
  reactionDamage,
  reactionFor,
  snapShot,
  type AbilityDef,
  type AbilitySlot,
  type ActiveStatus,
  type CollisionSource,
  type ComboTrack,
  type CombatStyleId,
  type TechniqueStyleId,
  type EquipSlot,
  type PassiveId,
  type BuildOrient,
  type ChargeInfo,
  type S2CFx,
  type StatusApply,
  type SteerMemory,
} from '@arx/shared';
import { config } from '../config.js';
import { Session, sanitizeName } from '../net/session.js';
import type { AccountStore, CharacterRow, PetRow } from '../db/accounts.js';
import type { WorldSource } from '../world/worldSource.js';
import { dungeonOrigin, generateDungeon } from '../dungeon/generate.js';
import {
  DUNGEON_KEY_ITEM,
  DUNGEON_MIN_Y,
  UNDERGROUND_Y,
  EXPLORED_PUSH_BATCH,
  ExploredMask,
  RARITY_TIERS,
  SERVER_REVEAL_TICKS,
  dangerAt,
  dungeonSpecFromRoll,
  hashCoords,
  mintKeyPower,
  persistRegion,
  u8ToB64,
  type DangerAnchor,
  type DiscoveryWire,
  type DungeonSpec,
  type QuestAvailWire,
  type QuestDoneWire,
  type QuestRewardsWire,
  type QuestWire,
  type RepStandingWire,
  type Vec2,
} from '@arx/shared';
import { AUTHORED_LOCKS, geographySnapshot, scaleNpcDef } from '@arx/content';
import { addItem, bestTool, countItem, emptyInventory, hasSpaceFor, removeItem, takeSlot } from './inventory.js';
import { DEATH_SPILL_TTL_MS, DROP_MERGE_RADIUS, canMergeDrop, spillInventory } from './drops.js';
import { SocialSystem } from './social.js';
import { PartySystem } from './party.js';
import { dungeonDiscoveryId, findDiscoveries } from './exploration.js';
import {
  acceptQuest,
  advanceStages,
  answerQuestFlag,
  creditQuest,
  questAvailable,
  questDropWanted,
  questReady,
  questWire,
  type QuestCreditKind,
  type QuestHintWire,
  type QuestLocateRefs,
  type QuestNameRefs,
  type QuestPlayerCtx,
  type QuestProgress,
} from './quests.js';

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
  /** Batch size asked for — `total - remaining` is the made count on the wire. */
  total: number;
  ticksLeft: number;
}

interface BuildAction {
  kind: 'build';
  buildable: BuildableDef;
  tx: number;
  ty: number;
  ticksLeft: number;
  /** THE TRUE GHOST's dial: the player's chosen corner mass; absent = auto-orient. */
  orient?: BuildOrient;
  /** THE DYE LAW's dial: chosen dye index for a dyeable piece; absent = linen (0). */
  dye?: number;
}

interface HarvestAction {
  kind: 'harvest';
  tx: number;
  ty: number;
  ticksLeft: number;
}

/** Milking livestock: hands on the flank for a few seconds. */
interface MilkAction {
  kind: 'milk';
  targetEid: EntityId;
  ticksLeft: number;
}

/**
 * The tame channel (THE WILD ANSWERS THE CALL, beastcraft arts): a
 * survival cast replacing the old gentling kneel. THE UNBROKEN
 * ASKING (user mandate 2026-08-13): the working is patience, not
 * luck — the keeper's own blood never breaks it, and neither does
 * any wound the mark takes mid-asking (a stray cleave, a ticking
 * venom, the companion's quarrel with somebody else). Standing in
 * the teeth to the end IS the test. Only the keeper's own step
 * breaks it — that, the mark dying, or the mark truly leaving.
 */
interface TameAction {
  kind: 'tame';
  targetEid: EntityId;
  ticksLeft: number;
}

/**
 * The tend kneel (beastcraft v2 Phase 3): raising a downed companion
 * where it fell. Breaks on distance and on the keeper's own blood —
 * the same discipline as the gentling it rhymes with.
 */
interface TendAction {
  kind: 'tend';
  targetEid: EntityId;
  ticksLeft: number;
}

/**
 * THE SALVAGE LAW (building v2): tearing down is a short swing, not a
 * packet — one quiet beat of "am I sure" built into the time, and a
 * spam-proof cost on pulling floors out from under people.
 */
interface DemolishAction {
  kind: 'demolish';
  tx: number;
  ty: number;
  ticksLeft: number;
  /**
   * THE SECOND LAYER: this teardown takes down the HANGING on the
   * wall, not the wall itself — the top layer always comes down
   * first, so a wall wearing your cloth needs two teardowns.
   */
  hanging?: boolean;
}

/**
 * THE HELD NOTE: a channeled art pouring out on the action rail — the
 * rail's movement-cancel IS the one stand-still law, and its wire is
 * the one progress bar. The def, school, level, and trinket power are
 * the ones resolved at the press (the note sung is the note struck);
 * the AIM stays live — each pulse re-reads the caster's facing, so
 * beams and arcs steer while the feet stay planted. A staked HELD
 * SIGIL point (`targetPos`) holds instead, like the breath's promise.
 * The cooldown was paid at the first note; a break forfeits the rest.
 */
interface ChannelAction {
  kind: 'channel';
  slot: AbilitySlot;
  ab: AbilityDef;
  targetPos?: { x: number; y: number };
  style: TechniqueStyleId;
  level: number;
  powerMult: number;
  every: number;
  ticksLeft: number;
  total: number;
}

type PlayerAction =
  | GatherAction
  | CraftAction
  | BuildAction
  | HarvestAction
  | MilkAction
  | TameAction
  | TendAction
  | DemolishAction
  | ChannelAction;

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
  /** THE LIVING SOIL: soil tier 0 plain / 1 enriched / 2 rich. */
  soil: number;
  /** 1 once mulched (a single blanket per planting). */
  mulched: number;
  /** THE FULL FIELD: 1 when grown under a growing frame. */
  framed: number;
  /** Recurring crops: harvests taken (0 = still on first growth). */
  cycles: number;
}

/**
 * THE LIVING SOIL: one compost bin's ledger. `startedAt` 0 while the
 * bin gathers scraps; nonzero = the batch's working clock (pure wall
 * time — collect reads the clock, no tick owns the heap).
 */
interface FarmBinState {
  tx: number;
  ty: number;
  fill: number;
  graded: number;
  startedAt: number;
}

/**
 * THE ANIMALS OF THE YARD: one kept animal's durable truth —
 * slot-addressed per character, anchored to a trough tile.
 */
interface LivestockRow {
  characterId: number;
  slot: number;
  species: string;
  name: string;
  tx: number;
  ty: number;
  bond: number;
  brushedAt: number;
  nextProduceAt: number;
  bornAt: number;
}

interface LivestockComp {
  row: LivestockRow;
  /**
   * THE FLEECE TELLS THE TIME: the shorn state last spoken on the
   * meta channel — the slow sweep compares it against the produce
   * clock and broadcasts only the flips. Sheep wear it; everyone
   * else leaves it undefined.
   */
  shornShown?: boolean;
}

/** A cached A* lane toward a nav goal — see NavState.nav. */
type NavLane = { pts: Vec2[]; idx: number; goalX: number; goalY: number; complete: boolean };

/**
 * The lane-nav slate every walking body carries — chase pursuit and
 * routine errands share one navigator (navToward), so both comps
 * structurally include this.
 */
interface NavState {
  /**
   * The learned lane: cached A* waypoints toward the nav goal, alive
   * only while the straight walk-line is blocked. null = steering
   * direct (the cheap, common case).
   */
  nav: NavLane | null;
  /** The proven lane the stall ledger is crediting (navProgressDist). */
  progressLane: NavLane | null;
  /** Earliest tick this body may ask the pathfinder again. */
  nextRepathTick: number;
  /** Cached walk-line verdict toward (losGoalX, losGoalY). */
  losClear: boolean;
  losUntilTick: number;
  losGoalX: number;
  losGoalY: number;
  /** Obstacle-avoidance swerve memory between lane waypoints. */
  steer: SteerMemory;
}

interface NpcComp {
  def: NpcDef;
  originX: number;
  originY: number;
  /**
   * THE QUEST PARTICIPATION LEDGER: every player eid whose landed
   * wound touched this body (whiff-0 sacred — a miss writes nothing).
   * Read once at death for kill credit and quest drops, gone with the
   * entity. Optional so neither spawn literal grows a field.
   */
  questWounders?: Set<EntityId>;
  /**
   * THE STATE LADDER (perception rebuild): 'suspicious' = the meter
   * crossed ALERT_SUS — feet planted, eyes on the last-known spot;
   * 'investigate' = the look didn't settle it, walk over and see;
   * 'search' = an ENGAGED quarry slipped the eye — hunt the
   * last-known position and a ring of nearby ground before giving
   * up. 'seekhelp' is the craven break: still in the fight (the eye
   * chip stays lit, the leash still binds), but running for a
   * resting packmate instead of swinging — the shout on arrival
   * re-enters 'chase' through npcAggro like every other path into
   * combat.
   */
  state: 'idle' | 'suspicious' | 'investigate' | 'chase' | 'return' | 'seekhelp' | 'search';
  targetEid: EntityId | null;
  /**
   * THE ONE INTEREST: awareness 0..ALERT_MAX toward alertEid — a
   * body tracks exactly one thing at a time, and the newest
   * strongest stimulus wins the slot (the last thing you notice is
   * probably the most important).
   */
  alert: number;
  alertEid: EntityId | null;
  /** Last-known position of the interest — where every hunt goes. */
  alertX: number;
  alertY: number;
  /**
   * The interest's stride at last sight (tiles/tick) — "he went
   * that way": a broken chase projects its search along this.
   */
  alertVelX: number;
  alertVelY: number;
  /** Last tick the interest actually stood in view. */
  alertSeenTick: number;
  /** investigate/search: the whole hunt's give-up tick. */
  huntUntilTick: number;
  /** Search ring around the LKP, minted on first arrival. */
  huntWps: Array<{ x: number; y: number }> | null;
  huntIdx: number;
  /** Stand-and-look dwell between hunt legs. */
  huntWaitUntilTick: number;
  /** Consecutive ticks spent holding the wary standoff stare. */
  standTicks: number;
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
  /**
   * THE KIT (docs/enemy-arts-plan.md): per-entry cooldown ticks,
   * parallel to def.kit. Lazily seeded on the first combat tick
   * (initialCooldownTicks, default min(cd, 60) — never open with the
   * special). Optional so neither NpcComp literal grows a field.
   */
  kitCds?: number[];
  /**
   * THE FOE'S BREATH: a wound-up kit cast in flight. The body is
   * planted, faces the quarry live, and fires when the breath
   * completes; shock, leash breaks, and a vanished quarry cancel
   * (retry cooldown, never the full price — the full price is paid
   * at fire). Optional-bank idiom, same as kitCds.
   */
  casting?: { idx: number; ticksLeft: number; total: number } | null;
  /**
   * THE KIT's raising lane: adds this body has called and still
   * stand (pruned against the live map at each raise). Optional-bank
   * idiom — the ledger dies with the body, and orphaned adds simply
   * live out their ephemeral lives.
   */
  summonedEids?: EntityId[];
  /** Livestock: earliest wall-clock ms this animal may be milked again. */
  nextProduceAt: number;
  /** Hands on the flank: the idle wander stands still until this tick. */
  holdUntilTick: number;
  /** Livestock: next wall-clock ms this animal lays (0 = never). */
  nextLayAt: number;
  /** Obstacle-avoidance swerve memory for chase/return legs. */
  steer: SteerMemory;
  /** Closest approach yet to the current nav goal (stall watchdog). */
  navBest: number;
  /** Consecutive ticks without closing on the nav goal. */
  navStuck: number;
  /** Where the chase target stood at the last stall re-baseline. */
  navRefX: number;
  navRefY: number;
  /** A failed chase sulks: no aggro scans until this tick. */
  noAggroUntilTick: number;
  /**
   * THE HARRY's per-mob rest (beastcraft v2 Phase 2): no companion
   * blow re-takes this body's eye until the tick passes. Optional on
   * purpose — absent reads as 0, so neither NpcComp literal site
   * carries it and old bodies never need touching.
   */
  harriedUntilTick?: number;
  /**
   * THE MARK'S WORTH: damage points already paid out as school XP,
   * per attacker, this life (allowance law in shared/skills.ts — the
   * player's twin of the pet trickle bank). Optional on purpose —
   * absent reads as empty, so neither NpcComp literal site grows a
   * field and the bank dies with the body.
   */
  xpMarks?: Map<EntityId, number>;
  /**
   * THE CASED CAMP: passive sneak XP already paid per watcher this
   * life (cap law in shared/sim/sneak.ts). Same optional-bank idiom.
   */
  casedMarks?: Map<EntityId, number>;
  /** The packmate a craven runner is fleeing toward (seekhelp). */
  helpEid: EntityId | null;
  /** Give-up tick for the help run — shout where you stand and turn. */
  helpUntilTick: number;
  /** The craven decision is made once per life, whichever way it went. */
  helpCalled: boolean;
  /** Lane-nav slate (NavState) — see navToward. */
  nav: NavLane | null;
  /** The proven lane the stall ledger is crediting (navProgressDist). */
  progressLane: NavLane | null;
  nextRepathTick: number;
  losClear: boolean;
  losUntilTick: number;
  losGoalX: number;
  losGoalY: number;
  /**
   * This body keeps its weapons stowed when at peace (non-hostile
   * actors). The snapshot bit derives from pref + state, so drawing
   * on aggro and re-stowing after a leash need no bookkeeping.
   */
  sheathePref?: boolean;
  /**
   * The sentry's round: a waypoint loop the idle brain paces (walk a
   * leg, linger, move on). Combat/chase own the body as ever; each
   * reached waypoint re-pins origin, so a leash walks the body back
   * to its ROUND, not the morning post (the routine-origin law).
   */
  patrol?: { pts: ReadonlyArray<{ x: number; y: number }>; idx: number; waitUntilTick: number };
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
  /** The authored (or scattered-default) spawn facing. */
  homeDir: number;
  /**
   * The CURRENT rest anchor — where the alone-gaze drifts around.
   * Starts at homeDir; a routine re-pins it to the walk-in facing at
   * every unauthored stop, so a body lingering across town never
   * snaps back to the morning's spawn facing.
   */
  restDir: number;
  /** The live idle gaze: restDir plus the current drift. */
  gazeDir: number;
  /** Tick when the idle gaze next wanders (8–20s apart). */
  nextGazeTick: number;
  /** Rotating cursor into actor.lines for interactions. */
  nextLine: number;
  /**
   * THE SADDLE IN THE SCHEDULE: the beast this body is riding right
   * now (a MOUNTS id), or null afoot. Runtime state owned by the
   * routine ticker — the mount is the ROUTINE TASK's statement, never
   * the actor def's. Stamped onto appearance in buildMeta; changes
   * re-broadcast meta so every watcher sees the swing up.
   */
  mount: string | null;
}

/**
 * One player's live conversation. The server owns the walk: the
 * client only ever holds text and choice labels, so node ids, flag
 * conditions, and hooks can never be probed or forged from outside.
 */
interface ActiveDialogue {
  targetEid: EntityId;
  def: DialogueDef;
  nodeId: string;
  /** The eligible choices exactly as sent — dlgchoice indexes these. */
  choices: DialogueChoice[];
  /**
   * Every tree this conversation has walked (the opener plus each
   * chained offer) — the chain guard: a tree never opens twice in one
   * sitting, so a declined offer can't re-pitch on its own heels.
   */
  seen: Set<string>;
  /**
   * A shop hook armed along the walk: the shelf opens when the
   * conversation ENDS WELL (terminal advance or farewell) — never on
   * Esc, damage, or drifting out of earshot. Armed state survives
   * offer chaining; it fires at the final close.
   */
  shop?: string;
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
  /** The theft facet survives the ground (Phase 5). */
  stolen?: true;
}

/** A spill's gravestone: who fell, and when the ground forgets. */
interface GraveComp {
  name: string;
  despawnAt: number;
}

interface ProjectileComp {
  ownerEid: EntityId;
  style: 'archery' | 'arx';
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
  /** Firing NPC's level — pierces the target's armor class on impact. */
  attackerLevel?: number;
  /** The wand's heavy third bolt — fat visual, shove on impact. */
  heavy?: boolean;
  /** Splash damage radius around the impact point. */
  splashRadius?: number;
  /**
   * Arx school riding the shot — cosmetic. Reaches clients as an
   * `arx:<element>` defId suffix; the renderer tints bolt, flash,
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
  /**
   * The ability that loosed this shot — rides to the impact fx so the
   * client's bespoke signature fires WHERE THE ARROW LANDS, not just
   * where it left the string. Basic attacks carry none.
   */
  abilityId?: string;
  /** The ability's wire color, for the impact fx. */
  abilityColor?: string;
}

/** A status riding an entity, remembering who put it there. */
interface ServerStatus extends ActiveStatus {
  sourceEid: EntityId;
  /** Shock only: remaining hard-stun ticks (shorter than the status). */
  stunLeft?: number;
  /**
   * A companion's tooth put this here (beastcraft v2 Phase 5): the
   * drip still credits the keeper's KILL, but its ticks train no
   * school — a sleeping keeper's venom must never level a blade.
   */
  fromPet?: boolean;
}

/** A placed totem/trap/decoy — or the keeper's strewn table. */
interface SummonComp {
  kind: 'heal_totem' | 'snare_trap' | 'decoy' | 'bait';
  ownerEid: EntityId;
  radius: number;
  power: number;
  ticksLeft: number;
}

/**
 * THE SECOND BODY IS EARNED (beastcraft v2, docs/beastcraft-plan.md):
 * a tamed companion — the game's only player-owned second entity. It
 * wears an ordinary NpcComp body on the shipped snapshot/nav rails,
 * but its whole brain is tickPet: no perception, no aggro, no wander,
 * no lays. Truth lives on the keeper's PlayerComp.pets row; this
 * component only points home. The DB row is the animal; the entity
 * is its visit — it never outlives its keeper's presence.
 */
interface PetComp {
  ownerEid: EntityId;
  /** Which stall row (PlayerComp.pets slot) this body embodies. */
  slot: number;
  /** Ticks of no follow progress while far — the give-up-to-trailing watchdog. */
  stuckTicks: number;
  /**
   * THE FANG BESIDE YOU: the mark the companion is fighting, or null
   * at heel. Set ONLY through petDefend (keeper wounded, keeper
   * wounds, pet wounded) — never by perception, which cannot see it.
   */
  target: EntityId | null;
  /** Last tick a wound landed — gates the licked-wounds regen. */
  lastHurtTick: number;
  /** Beastcraft-trickle ledger for the CURRENT mark (cap = its xpReward). */
  trickleTarget: EntityId | null;
  trickleBank: number;
  /**
   * THE FALL IS NEVER THE END: while > 0 the body lies where it fell,
   * breathing, untargetable, waiting on the tend — past this tick it
   * limps home to rest. 0 = on its feet.
   */
  downedUntil: number;
  /**
   * THE KEEPER'S TONGUE: a surge window — the friend's teeth and
   * fighting stride quicken until the tick passes; `temper` doubles
   * the kit status and lets the blows shove; `artId` names the word
   * that lit it (the quiet fx pulse keeps the working VISIBLE for its
   * whole life, the tame-channel precedent). Optional on purpose:
   * neither PetComp literal site carries it.
   */
  surge?: { dmgMult: number; speedMult: number; untilTick: number; temper?: boolean; artId?: string };
  /** THE KEEPER'S TONGUE: a guard window — flat armor at the mitigate site. */
  guard?: { armor: number; untilTick: number };
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
  /** NPC caster's level — pierces the victims' armor class. */
  attackerLevel?: number;
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
  /** NPC caster's level — pierces the victims' armor class. */
  attackerLevel?: number;
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
  /** Idle waypoint loop (POI sentry rounds) — survives respawns. */
  patrol?: ReadonlyArray<{ x: number; y: number }>;
  /** Activity window (game hours, midnight-wrapping) — see ZoneSpawn.hours. */
  hours?: { from: number; to: number };
  /** THE WAR-GROUND: which wing of a compound hold this body defends. */
  wing?: number;
}

/** One placed actor's post — exact spot, no scatter, no count. */
interface ActorSpawnState {
  actor: string;
  x: number;
  y: number;
  dir?: number;
  /** RoutineDef id — the daily life this post keeps (offsets from here). */
  routine?: string;
  eid: EntityId | null;
  respawnAt: number;
  /** Inactive posts are skipped (zone hot-reload retired them). */
  active: boolean;
}

/**
 * A placed actor's daily life in motion — the runtime walk through a
 * RoutineDef (content/routines). The routine only ever steers an
 * OTHERWISE IDLE body: combat owns a fighting NpcComp outright (the
 * leash/return laws answer every interruption by walking the body
 * back to originX/Y, which this comp keeps pinned to the routine's
 * last spot), and open conversations hold the walker still. Resuming
 * is therefore never a special case — the body simply walks from
 * wherever life left it toward whatever the schedule says now.
 */
interface RoutineComp {
  def: RoutineDef;
  /** The post — every routine coordinate is an offset from here. */
  anchorX: number;
  anchorY: number;
  /** Schedule slot owning the body (-1 = base, -2 = not yet resolved). */
  slot: number;
  wpIndex: number;
  /** Path direction for bounce mode: 1 forward, -1 backward. */
  wpDir: 1 | -1;
  phase: 'travel' | 'linger';
  /** Current travel destination (world coords; wander re-rolls it). */
  targetX: number;
  targetY: number;
  /** Linger deadline; MAX_SAFE_INTEGER = hold until the schedule flips. */
  lingerUntilTick: number;
  /** Barked interactions freeze the walk for a beat. */
  pauseUntilTick: number;
  /** Progress watchdog: ticks spent traveling without getting anywhere. */
  stuckTicks: number;
  /**
   * Closest approach to the target this leg. The watchdog trips on
   * NO PROGRESS, not no movement — a body wedged in a furniture
   * corner slides a full stride every tick while going nowhere, so
   * step distance alone would never see it stuck.
   */
  progressBest: number;
  /** Obstacle-avoidance swerve memory for travel legs. */
  steer: SteerMemory;
  /** Lane-nav slate (NavState) — see navToward. */
  nav: NavLane | null;
  /** The proven lane the stall ledger is crediting (navProgressDist). */
  progressLane: NavLane | null;
  nextRepathTick: number;
  losClear: boolean;
  losUntilTick: number;
  losGoalX: number;
  losGoalY: number;
  /**
   * True while the routine owns the body's facing (mid-stride, working
   * a station, or lingering on an authored dir) — tickActors' greet-
   * the-passerby glance yields to it.
   */
  holdFacing: boolean;
  /**
   * The furniture this body is mounted on (a sit/lie stop whose target
   * landed on a chair, bench, throne, or bed), or null. Mounting moved
   * the body ONTO the seat anchor; every path that hands the legs back
   * (slot flip, linger end, combat) dismounts to (retX, retY) first.
   */
  seat: {
    tiles: Array<{ x: number; y: number }>;
    retX: number;
    retY: number;
    dir: number;
    lie: boolean;
  } | null;
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
  /** The keyholder. The run lives and dies with them. */
  ownerId: number;
  /**
   * Where the owner stood at the gate they turned the key in — the
   * surface point their pack spills to if they fall inside (guests
   * have the same promise via the guests map).
   */
  ownerReturn: { x: number; y: number };
  /** Spec identity the entry banner needs when a party member joins. */
  name: string;
  sigil: string;
  theme: string;
  /**
   * Party members guesting in the run: characterId -> where they stood
   * when they stepped through, so every exit hands them back to their
   * own gate, not the owner's.
   */
  guests: Map<number, { x: number; y: number }>;
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
  /** THE STEADY HAND: consecutive ticks the input queue has held a
   *  standing 2-frame cushion — drives the slow bleed back to 1. */
  inputBleedRun: number;
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
  /**
   * THE WEAVE: the beat multiplier the echo mirrors, normalized by the
   * string's average (soft chips, heavy payoff, exact cycle parity).
   */
  offhandEchoMult: number;
  lastCombatAt: number;
  /** Last tick a block spark flew — the rim speaks at most every few beats. */
  lastBlockFxTick: number;
  poseUntilTick: number;
  lastDodgeSeq: number;
  /** Ticks the bow has been drawn; 0 = not drawing. */
  drawTicks: number;
  /** Client-reported adaptive interp delay, ms (v8) — exact lag comp. */
  viewMs?: number;
  /**
   * THE ONE RHYTHM ENGINE: the one basic-attack chain — sword string,
   * great string, bolt rhythm, snap chain all advance THIS track. The
   * string belongs to the weapon that started it (a swap resets by
   * construction) and drops on sheathe, death, and mounting up.
   */
  combo: ComboTrack;
  /**
   * THE HELD INTENT: a press in the tail of recovery buffers one swing
   * that fires at ready (0 = nothing buffered). Self-expiring —
   * BUFFER_FIRE_SLACK_TICKS past ready it dies unspent, so no break
   * site ever needs to clean it up.
   */
  attackBufferedUntilTick: number;
  /**
   * THE HONEST SWING: the blow in flight — paid and spoken at the
   * press, landing at `at` (the choreography's impact frame). The
   * promise made at press is the promise kept: every number is
   * captured there. Cleared by the honest breaks (sheathe, death,
   * mount); a dodge never recalls a blow already swung.
   */
  pendingStrike: {
    at: number;
    pressTick: number;
    aim: number;
    maxHit: number;
    kbMult: number;
    sweepAll: boolean;
    wasHidden: boolean;
    backstabMult: number;
    xpStyle: SkillId;
    arcHalf: number;
    range: number;
    /** twohand: the whirlwind's deed check rides the resolve. */
    deed: boolean;
  } | null;
  /** Remaining cooldown ticks: [first art (Q), relic, second art (R), sigil]. */
  abilityCd: [number, number, number, number];
  /** Buttons of the last processed frame — abilities fire on press edge. */
  prevButtons: number;
  /** Rooted mid-cast until this tick (ability commitment window). */
  castFreezeUntilTick: number;
  /**
   * THE DRAWN BREATH: the wind-up in progress, if any. The press began
   * a breath; progress accrues per tick (a planted tick breathes
   * CAST_STILL_FACTOR) and the art fires through the one door at
   * `total`. Deliberately NOT the action rail — the rail's law is
   * move-cancels, and a breath is drawn on the move. The def is the
   * one resolved at the press (the promise made is the promise kept).
   */
  casting: {
    slot: AbilitySlot;
    ab: AbilityDef;
    aim: number;
    targetPos?: { x: number; y: number };
    progress: number;
    total: number;
  } | null;
  /** Active self buffs (ability + passive sources stack). */
  buffs: PlayerBuff[];
  /**
   * THE SECOND HAND: the two seated techniques, [Q, R]. THE FREE HAND
   * stands for every learned art; a secret seat may also hold THE
   * LOAN LAW's lent art while a teaching weapon is in hand.
   */
  techniques: [string | null, string | null];
  /**
   * THE LESSON LAW: secret arts whose lesson:<id> meter changed since
   * the last save — flushed on the savePlayer cadence, never per hit.
   */
  lessonDirty: Set<string>;
  /** Answered Callings (row-presence mirror of character_callings). */
  callings: Set<string>;
  /** One-site perk dials derived from answered Callings (recomputeGear). */
  perks: Perks;
  /** Consecutive ticks without movement, sneaking or not (Bulwark). */
  stillTicks: number;
  /** Crouch latch from the last processed frame (held bit, survives empty ticks). */
  sneaking: boolean;
  /**
   * Seated rest (the X toggle). Purely cosmetic and always yielding:
   * moving, dodging, attacking, casting, sneaking, starting an action,
   * or taking a hit stands the body back up.
   */
  sitting: boolean;
  /** Lying in a bed (the Rest interact). Yields exactly like sitting. */
  lying: boolean;
  /**
   * The furniture this body occupies, or null when standing/floor-
   * sitting. Mounting moved the body ONTO the seat's anchor; standUp
   * returns it to (retX, retY) — the spot it walked up from — and
   * releases the occupancy claim. Facing locks to `dir` while mounted.
   */
  seat: { tiles: Array<{ x: number; y: number }>; retX: number; retY: number; dir: number } | null;
  /**
   * THE SADDLE IS A STANCE: the active mount def id, or null afoot.
   * The mount is the player's appearance, never a second entity.
   * Riding yields to every deed — attack, art, dodge, action, sneak,
   * sit, landed damage, dungeon ground — and only movement keeps it.
   */
  mountId: string | null;
  /** Mount def ids this character owns. Persisted in Phase 4. */
  mountsOwned: Set<string>;
  /** The stable's pick — which owned beast the whistle calls. */
  mountChosen: string | null;
  /** Last mirrored ride signature (mount|mult) — resend only on change. */
  rideSigSent: string;
  /**
   * THE OPEN HAND: the household — every kept companion, slots 0..2
   * (THREE STALLS ONE HEEL). Rows are the durable truth; at most one
   * carries state 'heel', and that one may own a live body below.
   */
  pets: PetRow[];
  /** The heel companion's live entity, or null (stabled, or trailing). */
  petEid: EntityId | null;
  /** Consecutive calm ticks — a trailing companion re-emerges on a full second. */
  petCalmTicks: number;
  /** Last mirrored household signature — resend only on change (the ride discipline). */
  petSigSent: string;
  /** Wounds carried across trailing: the hp the body left with (null = whole). */
  petHp: number | null;
  /** Pet ladder trickle awaiting the savePlayer cadence (POSTGRES write law). */
  petXpDirty: boolean;
  /** THE BOND MOMENT's per-stall cooldown (slot → next ms). In-memory
   *  on purpose: a relogin forgiving a snack timer harms nothing. */
  petBondAt: Map<number, number>;
  /**
   * Weapons stowed on the body (the H toggle) — blades at the hip,
   * bow/staff across the back. While stowed, attacks and casts are
   * SUPPRESSED (the roleplay safety): a combat press draws the weapon
   * instead, and the draw-lock below holds the first swing until the
   * pull-out has visibly played.
   */
  sheathed: boolean;
  /** No attacks or casts until this tick — the weapon is mid-draw. */
  drawLockUntilTick: number;
  /** Consecutive ticks without movement while sneaking. */
  sneakStillTicks: number;
  /** Fully hidden from other players and NPCs. */
  hidden: boolean;
  /** Re-hiding is locked until this tick (attacked / took damage). */
  revealLockUntilTick: number;
  /** Tiles moved while sneaking since the last XP pulse (anti-AFK gate). */
  sneakMoveAccum: number;
  /**
   * Recipes learned beyond the core set (scrolls studied). Row-backed
   * (character_recipes) for real characters; guests keep the session's
   * set in memory only. Core recipes are never in here.
   */
  knownRecipes: Set<string>;
  /**
   * Durable story flags: dialogue completions (dlg:<id>), authored
   * choices, and — soon — quest and faction state. Persisted the
   * moment they're set; guests keep them in memory only.
   */
  flags: Map<string, number>;
  /** The conversation this player is inside, if any. */
  dialogue: ActiveDialogue | null;
  /**
   * Claimed home bed TILE (any town bed, or a bed this character
   * built — another settler's built bed refuses). Defeat wakes you
   * beside it and /recall carries you back; null until claimed.
   */
  home: { x: number; y: number } | null;
  /** Last hearth recall (ms since epoch) — the /recall cooldown clock. */
  hearthAt: number;
  /** THE HEARTH WATCH: no raid covets this settler until this passes. */
  raidCalmUntil: number;
  /** The ward-the-hearth dial: true = the covetous dice skip them. */
  hearthWarded: boolean;
  /**
   * THE CHART: this character's fog-of-war mask. The server marks the
   * same deterministic reveal disc the client draws, so the two never
   * argue; only the login snapshot ever travels. Guests chart in
   * memory only.
   */
  explored: ExploredMask;
  /** Region keys touched since the last periodic flush. */
  exploredDirty: Set<string>;
  /** The place ledger: everything this character has ever discovered. */
  discoveries: Map<string, DiscoveryWire>;
  /** The one active waypoint; pure navigation state. */
  waypoint: { x: number; y: number } | null;
  /**
   * THE QUEST LEDGER: every quest this character has touched, by quest
   * id. Persisted whole at every mutation site (accept, credit, stage
   * advance, turn-in, abandon) — a turn-in must survive a crash.
   * Guests keep it in memory only.
   */
  quests: Map<string, QuestProgress>;
  /** Last-sent availability signature — the quiet-wire diff guard. */
  questAvailSig: string;
  /** Last-sent live collect counts (the 500ms ticker's diff guard). */
  questCollectSig: string;
  /**
   * THE LEDGER OF NAMES (docs/factions-plan.md): standing per faction
   * id, written ONLY by creditStanding — the one door. Absent = 0
   * (neutral). Persisted the moment it moves; guests memory-only.
   */
  standing: Map<string, number>;
  /** Last-sent standing signature — the quiet-wire diff guard. */
  repSig: string;
  /**
   * THE LIGHT FINGERS (Phase 5): marks this hand has tried lately,
   * eid -> wall-clock ms until the mark relaxes. In-memory only — a
   * wary mark forgets across a restart, and that's fine.
   */
  markWary: Map<EntityId, number>;
  /**
   * THE DEEPER SIGIL: live state for every working the player carries,
   * keyed by proc id. One entry per id however many pieces carry it —
   * a matched set shares one rest timer and one meter.
   *
   * In-memory only, and deliberately so: a charge half-built and a
   * timer half-spent are facts about THIS fight, not about the
   * character. Logging out puts the workings back at rest.
   */
  procs: Map<string, ProcRuntime>;
}

/** Where a working woke, and what it has to work with. */
interface ProcContext {
  x: number;
  y: number;
  /** The foe in the moment, when there was one. */
  targetEid?: EntityId;
  /** School to credit any damage the working deals. */
  style?: SkillId;
}

/** How far a chaining working looks for its next foe, tiles. */
const CHAIN_PROC_RANGE = 5;
/** Most things one reveal may mark — a rich seam must not flood the wire. */
const REVEAL_PROC_CAP = 24;
/** Hard ceiling on a reveal's tile scan, whatever radius the def asks for. */
const REVEAL_PROC_MAX_TILES = 12;

/**
 * What the gear DOES as a working settles into it. The line climbs with
 * the tier because the light does: THE WORN LIGHT gives tier 1 a single
 * glint and tier 5 a masterwork's whole voice, and the moment of
 * bonding should promise exactly what the player is about to see.
 */
const BONDING_VOICE: Record<EnchantTier, string> = {
  1: 'glints, just once',
  2: 'hums quietly',
  3: 'blazes with power',
  4: 'wakes, and the air around it goes tight',
  5: 'takes the light out of the room and gives back its own',
};

/** Enchanting xp for drawing a working back out of a piece. */
const SUNDER_XP = 45;

/** One sample of every action shape, for the /proc dev lever. */
const DEV_PROC_ACTIONS: Record<string, ProcAction> = {
  status: { do: 'status', status: 'burn', power: 2, ticks: 60 },
  nova: { do: 'nova', damage: 6, radius: 3 },
  bolt: { do: 'bolt', damage: 8 },
  chain: { do: 'chain', damage: 5, jumps: 3 },
  ward: { do: 'ward', absorb: 30, ticks: 100 },
  heal: { do: 'heal', amount: 15 },
  surge: { do: 'surge', stat: 'crit', pct: 25, ticks: 100 },
  cleanse: { do: 'cleanse' },
  yield: { do: 'yield', extra: 2 },
  reveal: { do: 'reveal', radius: 10, of: 'node' },
};

/** Every chest a reveal working counts as a cache, open or shut. */
const CHEST_TILES: ReadonlySet<Tile> = new Set([
  Tile.ChestWood,
  Tile.ChestWoodOpen,
  Tile.ChestIron,
  Tile.ChestIronOpen,
  Tile.ChestGilded,
  Tile.ChestGildedOpen,
  Tile.ChestMossy,
  Tile.ChestMossyOpen,
]);

/** A timed self-effect; multiple can ride at once (speeds multiply). */
interface PlayerBuff {
  speedMult: number;
  shieldHp: number;
  meleeLifesteal: number;
  /** Flat bonus armor — folds into the mitigate site's armor term (tank stances). */
  armor: number;
  /** THE TURNED BLOW: fraction of post-mitigation damage returned to the striker. */
  reflectFrac: number;
  /**
   * THE MIRRORED HAND: the offhand echo lands at this damage fraction
   * while the stance rides, when it beats the trained factor (max
   * across buffs, capped at parity — never past the main hand).
   */
  offhandWeight: number;
  /** Gathering speed multiplier (best across buffs wins). */
  gatherSpeed: number;
  /** HP restored every 4 seconds (best across buffs wins). */
  regenPer4s: number;
  /** While active, landed basic attacks apply this status (Envenom). */
  onHitStatus?: StatusApply;
  /** Extra crit chance in percentage points (a surge working's lift). */
  critPct: number;
  /** Multiplier on this player's outgoing max hits (a surge working's lift). */
  dmgMult: number;
  /** THE QUIET WALK: wild beasts do not mark the wearer while active. */
  beastTruce: boolean;
  /** THE WILD PARTS (rank IV): beasts within this many tiles ease aside. */
  beastPart: number;
  untilTick: number;
  /**
   * Consumable channel: one 'tonic' + one 'food' buff may be active at
   * a time; a new drink/meal replaces its channel. Combat buffs
   * (abilities, passives) leave this unset and stack freely. Weapon
   * oils are NOT buffs — they live on the weapon instance (roll.coat).
   * 'momentum' = THE KNIFE'S HUNGER's refresh-not-stack lane (no HUD
   * chip: sendBuffs shows only named consumables).
   */
  channel?: 'tonic' | 'food' | 'momentum';
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
    armor: 0,
    reflectFrac: 0,
    offhandWeight: 0,
    gatherSpeed: 1,
    regenPer4s: 0,
    critPct: 0,
    dmgMult: 1,
    beastTruce: false,
    beastPart: 0,
    ...partial,
  };
}

/**
 * The two surge dials that had no home in PlayerBuff before the proc
 * grammar. Both fold ADDITIVELY across live buffs rather than taking
 * the best: two workings that each sharpen the edge should both be
 * felt, and neither is a stance the other could be said to replace.
 */
function surgeCritPct(player: PlayerComp): number {
  let pct = 0;
  for (const b of player.buffs) pct += b.critPct;
  return pct;
}

function surgeDmgMult(player: PlayerComp): number {
  let mult = 1;
  for (const b of player.buffs) mult += b.dmgMult - 1;
  return mult;
}

/** THE QUIET WALK: is a beast truce riding this walker right now? */
function beastTruceActive(player: PlayerComp, tick: number): boolean {
  for (const b of player.buffs) {
    if (b.beastTruce && tick < b.untilTick) return true;
  }
  return false;
}

/** THE WILD PARTS: the widest live parting ring, 0 when none rides. */
function beastPartRadius(player: PlayerComp, tick: number): number {
  let r = 0;
  for (const b of player.buffs) {
    if (b.beastTruce && tick < b.untilTick && b.beastPart > r) r = b.beastPart;
  }
  return r;
}

/**
 * THE CALLING LAW's one-site dials, rebuilt by recomputeGear from the
 * answered set. Every field is read at exactly one hook site (the
 * PERK_DIALS registry in content/callings.ts names each); defaults are
 * the no-calling behavior, so hooks never need an answered check.
 */
interface Perks {
  foodHealMult: number;
  foodBuffDurMult: number;
  tonicBuffDurMult: number;
  finisherBonusMult: number;
  stillArmor: number;
  shieldMult: number;
  snapShotMult: number;
  /** Floor on the bow-draw movement factor (0 = keep the base law). */
  drawMoveFactor: number;
  sneakFactorBonus: number;
  backstabBonus: number;
  offhandDelayTicks: number;
  offhandFactorBonus: number;
  /** Extra greatweapon reach, tiles (Farcleaver). */
  greatReach: number;
  /** Bonus damage fraction on greatblows vs the nearly-felled (Executioner). */
  greatExecute: number;
  undergroundGatherMult: number;
  nightGatherMult: number;
  burnChanceMult: number;
  dotResistMult: number;
  seedRefundChance: number;
  doubleHarvestChance: number;
  doubleProduceChance: number;
  produceRestMult: number;
  buildSpeedMult: number;
  shieldArm: number;
  shieldThorns: number;
  /** +armor while on the move (War Footing — Bulwark's mirror). */
  marchArmor: number;
  /** +effective levels to the four weapon schools (Old Campaigner). */
  warSchooling: number;
  doubleGather: Partial<Record<SkillId, number>>;
  gatherSpeed: Partial<Record<SkillId, number>>;
  materialSave: Partial<Record<SkillId, number>>;
  craftSpeed: Partial<Record<SkillId, number>>;
  /** THE ENCHANTER'S HAND: quality points added to every inscription. */
  inscribeQuality: number;
  /** THE GREEN ARTS wave: compost batches close this many worth sooner. */
  compostDiscount: number;
  /** The brush window's cooldown multiplier (Shepherd's Eye). */
  brushRestMult: number;
  /** The larder premium's multiplier (Marketeer). */
  larderSellMult: number;
}

function defaultPerks(): Perks {
  return {
    foodHealMult: 1,
    foodBuffDurMult: 1,
    tonicBuffDurMult: 1,
    finisherBonusMult: 1,
    stillArmor: 0,
    shieldMult: 1,
    snapShotMult: 1,
    drawMoveFactor: 0,
    sneakFactorBonus: 0,
    backstabBonus: 0,
    offhandDelayTicks: OFFHAND_DELAY_TICKS,
    offhandFactorBonus: 0,
    greatReach: 0,
    greatExecute: 0,
    undergroundGatherMult: 1,
    nightGatherMult: 1,
    burnChanceMult: 1,
    dotResistMult: 1,
    seedRefundChance: 0,
    doubleHarvestChance: 0,
    doubleProduceChance: 0,
    produceRestMult: 1,
    buildSpeedMult: 1,
    shieldArm: 0,
    shieldThorns: 0,
    marchArmor: 0,
    warSchooling: 0,
    doubleGather: {},
    gatherSpeed: {},
    materialSave: {},
    craftSpeed: {},
    inscribeQuality: 0,
    compostDiscount: 0,
    brushRestMult: 1,
    larderSellMult: 1,
  };
}

/** Ticks of standing still before Bulwark's armor answers. */
const STILL_ARMOR_TICKS = 12;

/**
 * Input queue depth cap. Nominal flow is 1/tick and THE STEADY HAND
 * drains 1/tick (2 during catch-up), so 8 covers a 250ms client
 * hitch-burst with room; beyond it the oldest frames drop. Sustained
 * speed cheating is bounded by the session input token bucket (25/s)
 * and the paced drain, not this number.
 */
const MAX_QUEUED_INPUTS = 8;
const SAVE_INTERVAL_TICKS = 600; // 30s
/** World-y extent of the player's visual body above its ground point
 * (screen height ÷ camera pitch) — NPC shots test the feet→crown band. */
const PLAYER_HIT_HEIGHT = 1.9;
/**
 * Ticks between a combat press drawing a stowed weapon and the first
 * swing it will honor (~0.5s) — the pull-out visibly plays before any
 * damage can happen, so an accidental click can never be an attack.
 */
const DRAW_LOCK_TICKS = 10;

/**
 * Damage roll with a 10% base crit chance (guaranteed heavy hit).
 * `critBonusPct` — extra percentage points from gear effects/enchants.
 */
/**
 * Eight-way spoken bearing for a world-space offset (map north = -y),
 * the quartermaster's dialect: "north-east", never degrees.
 */
function compass8(dx: number, dy: number): string {
  const names = [
    'east',
    'south-east',
    'south',
    'south-west',
    'west',
    'north-west',
    'north',
    'north-east',
  ];
  const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) & 7;
  return names[oct]!;
}

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
  readonly routines = this.ecs.register<RoutineComp>();
  readonly drops = this.ecs.register<DropComp>();
  readonly projectiles = this.ecs.register<ProjectileComp>();
  readonly statuses = this.ecs.register<ServerStatus[]>();
  readonly summons = this.ecs.register<SummonComp>();
  /** Tamed companions at heel — the pointer home; rows on PlayerComp.pets. */
  readonly pets = this.ecs.register<PetComp>();
  /** Gravestones raised where a pack spilled — world dressing on the
   *  Prop lane, living exactly as long as the spill's quarter hour. */
  readonly graves = this.ecs.register<GraveComp>();

  /**
   * The walk-back beacon: each character's latest spill spot, keyed by
   * characterId so it survives relogin within the server's life (the
   * drops it points at are memory too — consistent by construction).
   * Cleared on arrival, expiry, or the next death overwriting it.
   */
  private readonly deathMarks = new Map<number, { x: number; y: number; until: number }>();

  /**
   * ONE STONE PER SOUL: each character's standing gravestone, so a
   * death loop replaces its marker instead of tiling the ground with
   * ten stones. The spilled piles stack regardless — items are items;
   * the stone is a marker.
   */
  private readonly graveByChar = new Map<number, EntityId>();

  /** Telegraphed blasts (ground AoEs) waiting to detonate. */
  private readonly pendingBlasts: PendingBlast[] = [];

  /** Lingering hazard zones (ground_field) pulsing while they live. */
  private readonly activeFields: ActiveField[] = [];

  private readonly spawnPoints: SpawnState[] = [];
  /** Actor definitions by slug — loaded from the DB at boot (DB-first). */
  private readonly actorDefs = new Map<string, NpcActorDef>();
  private readonly actorSpawnPoints: ActorSpawnState[] = [];
  /** Routine definitions by id — loaded from the DB at boot (DB-first). */
  private readonly routineDefs = new Map<string, RoutineDef>();
  /**
   * Re-reads routines from the DB (wired by index.ts at boot). The
   * tooling edits rows, then /routinereload swaps the live registry —
   * no restart between an edit and watching the new day unfold.
   */
  routineSource: (() => Promise<{ routines: RoutineDef[]; errors: string[] }>) | null = null;
  /**
   * Dialogue offers by bound actor slug — assembled from the BINDINGS
   * of DB-loaded trees. The tree stands alone; only bindings put words
   * in a mouth (props and objects will index here under new kinds).
   */
  private readonly dialoguesByActor = new Map<string, DialogueOffer[]>();
  /** Node lookup per dialogue id, built once at registration. */
  private readonly dialogueNodes = new Map<string, ReadonlyMap<string, DialogueNode>>();
  /** The live voice-clip ledger — the resolver reads it per beat. */
  private readonly voiceClips = new Map<string, VoiceClipDef>();
  /** The live voice banks, keyed 'kind:owner' — the fallback throats. */
  private readonly voiceBanks = new Map<string, VoiceBankDef>();
  /** Per-owner quip bookkeeping: cooldown stamp + last pick per slot. */
  private readonly voiceQuipMemory = new Map<
    string,
    { lastAt: number; lastBySlot: Map<VoiceSlot, string> }
  >();
  /**
   * Re-reads dialogues from the DB (wired by index.ts at boot). The
   * tooling edits rows, then /dlgreload swaps the live registry — no
   * restart between an edit and hearing it spoken.
   */
  dialogueSource: (() => Promise<{ dialogues: DialogueDef[]; errors: string[] }>) | null = null;
  /** Quest defs by id — DB-loaded, already validated. */
  private readonly questDefs = new Map<string, QuestDef>();
  /** Quest ids by giver actor slug (the "!" index). */
  private readonly questsByGiver = new Map<string, string[]>();
  /** Quest ids by turn-in actor slug (the turn-in mark index). */
  private readonly questsByTurnIn = new Map<string, string[]>();
  /** Quest-gated drop entries by bestiary def id (the kill-site channel). */
  private readonly questDropsByNpc = new Map<string, Array<{ quest: string; item: string; chance: number }>>();
  /**
   * Quests some ITEM begins (ItemDef.startsQuest). They never join the
   * availability list — nobody offers them, so no head wears their
   * mark; the found thing itself is the whole invitation.
   */
  private readonly itemStartQuests = new Set<string>();
  /**
   * Re-reads quests from the DB (wired by index.ts at boot) — the
   * /quest reload lever, same law as dialogueSource.
   */
  questSource: (() => Promise<{ quests: QuestDef[]; errors: string[] }>) | null = null;

  private readonly sessions = new Set<Session>();
  /** In-world players by character id (blocks duplicate logins). */
  private readonly characterEids = new Map<number, EntityId>();
  /** Ephemeral guest tokens -> eid (guests have no DB session). */
  private readonly guestTokens = new Map<string, EntityId>();
  private nextGuestId = -1;

  /**
   * Where brand-new characters open their eyes — the awakening zone's
   * spawn (config.startZoneId). Death respawn and rescue keep using
   * world.spawn: only a FIRST arrival ever starts here.
   */
  private get startSpawn(): Vec2 {
    return this.world.spawnOf(config.startZoneId) ?? this.world.spawn;
  }

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

  // ------------------------------------------------- procedural POIs

  /**
   * Ledger cache by cell key: decided cells (site null = decided
   * empty). clearedAt + emberUntil = the broken-camp linger window;
   * fallowUntil on an empty row = the rest a dissolved cell takes
   * before it may host again (the ember law).
   */
  /**
   * THE CAPITAL LAW (strongholds Phase 3): the seat cache — pure per
   * seed, so cached forever until the one live input (claim rings)
   * changes and clears it (the ring-cache discipline).
   */
  private readonly capitalCache = new Map<string, CapitalSeat | null>();
  /** Standing capitals, lattice key → live record. */
  private readonly strongholdLive = new Map<
    string,
    {
      zoneId: string;
      seat: CapitalSeat;
      layoutId: string;
      spawnIdx: number[];
      /** The participation ledger (the poiLive dialect). */
      fighters?: Set<number>;
      /** Chapters already ceremonied this uptime. */
      wardsBroken?: Set<number>;
    }
  >();
  /** spawnIndex → capital lattice key (the poiSpawnCells dialect). */
  private readonly strongholdSpawnCells = new Map<number, string>();
  /** The world_strongholds ledger, loaded at boot (deviations only). */
  private readonly strongholdLedger = new Map<
    string,
    {
      layoutId: string;
      anchorX: number;
      anchorY: number;
      epoch: number;
      wardsCleared: number;
      clearedAt: number | null;
    }
  >();

  private readonly poiLedger = new Map<
    string,
    {
      epoch: number;
      site: PoiSite | null;
      clearedAt: number | null;
      emberUntil: number | null;
      fallowUntil: number | null;
      /** Boldness rung (0 = base camp) + when the current rung began. */
      stage: number;
      stageAt: number | null;
      /** Satellite camps point at their core's cell key (the family law). */
      originCell: string | null;
    }
  >();
  /**
   * Cells any character holds a LIVE poi: discovery for — the boldness
   * clock's gate (an unseen camp costs nothing and threatens nobody;
   * observation itself never escalates, only discovered time does).
   */
  private readonly discoveredPoiCells = new Set<string>();
  /**
   * THE RELAX WINDOWS by cell key: after a garrison wipe, cells within
   * FRONTIER.regionCells of a stamp see no stage-ups, satellites,
   * fallow wakes, or renewal landings until calm_until passes.
   */
  private readonly frontierCalm = new Map<string, number>();
  /**
   * THE CONSERVATION LAW's debt: sites the frontier owes the world
   * after ember dissolves. Spent by tickFrontier standing fresh rolls
   * in the offscreen ring around active players; persisted so a
   * restart never forgives the debt.
   */
  private frontierCredits = 0;
  /**
   * Cells handled this uptime (live zone or decided empty). `fighters`
   * is the participation ledger: every characterId that landed real
   * damage on the garrison — the wipe credit and the bounty pay ALL of
   * them, never just the last blow.
   */
  private readonly poiLive = new Map<
    string,
    {
      zoneId?: string;
      spawnIdx: number[];
      fighters?: Set<number>;
      /** THE WAR-GROUND: wings whose chapter line already fired this uptime. */
      wingsBroken?: Set<number>;
    }
  >();
  /** spawnPoints index → owning POI cell key (cleared-wipe detection). */
  private readonly poiSpawnCells = new Map<number, string>();
  /**
   * THE SMALL FINDS (lived-in-land Phase 2) — the texture layer's
   * whole runtime state, kept beside the site machinery, never inside
   * it. minorLedger mirrors world_minors (deviations only: rows exist
   * once a find has been cleared; bits belong to their epoch and stop
   * matching after a turn). findsLive is per-uptime standing state.
   */
  private readonly minorLedger = new Map<string, { epoch: number; cleared: number }>();
  private readonly findsLive = new Map<
    string,
    { zoneId: string; spawnIdx: number[]; spawnSlots: number[]; finds: MinorFind[] }
  >();
  /** spawnPoints index → owning finds cell + slot (per-slot wipes). */
  private readonly minorSpawnSlots = new Map<number, { key: string; slot: number }>();
  /**
   * THE DEN IS THE SOURCE: standing UNCLEARED habitat finds by
   * `<cellKey>#<slot>` — the wild spawner musters matching knots at
   * these mouths; clearing the find deletes the entry and the pull
   * goes quiet.
   */
  private readonly habitatFinds = new Map<string, { habitat: string; x: number; y: number }>();
  /** POI prefab library; null until initPois — tickPois no-ops before boot wiring. */
  private poiPrefabs: Map<string, PrefabDef> | null = null;
  /**
   * Runtime haven anchors by cell key — every LEDGER site whose def
   * declares a haven, materialized or not (the lamp burns whether or
   * not anyone is looking at it). Rebuilt from the ledger whenever it
   * changes; every danger read in this class goes through
   * dangerAnchors(), so civilization genuinely pushes the field back.
   */
  private readonly poiHavens = new Map<string, DangerAnchor>();
  private anchorCache: DangerAnchor[] | null = null;
  /**
   * THE HEARTH WATCH: every claimed home bed in the world, offline
   * settlers included — a camp must never materialize in an absent
   * player's yard. Loaded at boot (allHomes), maintained by claim /
   * unclaim / bed demolish.
   */
  private readonly homesByCharacter = new Map<number, { x: number; y: number }>();
  /**
   * Derived claim rings (bed + the owner's built flood within reach,
   * padded). A PURE EXCLUSION MASK — rings reject materialization and
   * nothing else; they never join dangerAnchors (THE HAVEN LAW: a bed
   * in tier-4 country must not flatten the frontier around it).
   */
  private ringCache: ClaimRing[] | null = null;
  /**
   * Strongbox overrides by world-tile key "tx,ty": POI chests whose
   * def re-tables the loot (the riftgate key faucet) or wards the lid
   * while the garrison stands (the champion's cache).
   */
  private readonly poiChests = new Map<
    string,
    { cell: string; table?: string; warded?: boolean }
  >();

  /**
   * THE ADOPTED RING (Map Studio v2 Phase 6): the code-side TOWN_SPAWNS
   * registered at boot, keyed so a zone that ADOPTS one (same npc at
   * the same tile, saved into its file) retires the constant's copy —
   * at boot by skipping it, and live in reloadZone by deactivating it.
   * The constant never doubles an adopted camp, and retires entry by
   * entry as the file takes them over.
   */
  private readonly townRing: Array<{ key: string; indexes: number[] }> = [];

  private static townSpawnKey(s: { npc: string; x: number; y: number }): string {
    return `${s.npc}:${s.x}:${s.y}`;
  }

  private zoneOwnsTownSpawn(key: string): boolean {
    for (const z of this.world.zoneDefs) {
      for (const sp of z.spawns ?? []) {
        if (GameServer.townSpawnKey(sp) === key) return true;
      }
    }
    return false;
  }

  constructor(
    // Public: the dev maps API reads the live zone list off it.
    readonly world: WorldSource,
    private readonly accounts: AccountStore,
  ) {
    for (const s of TOWN_SPAWNS) {
      const key = GameServer.townSpawnKey(s);
      if (this.zoneOwnsTownSpawn(key)) continue; // adopted — the file rules
      this.townRing.push({ key, indexes: this.registerSpawns([s]) });
    }
    this.social = new SocialSystem(accounts, {
      isOnline: (characterId) => this.characterEids.has(characterId),
      zoneOfCharacter: (characterId) => {
        const eid = this.characterEids.get(characterId);
        if (eid === undefined) return null;
        const pos = this.positions.get(eid);
        return pos ? this.zoneNameAt(pos.x, pos.y) : null;
      },
      sendToCharacter: (characterId, msg) => {
        const eid = this.characterEids.get(characterId);
        if (eid === undefined) return false;
        const session = this.players.get(eid)?.session;
        if (!session) return false;
        session.sendJson(msg);
        return true;
      },
    });
    this.party = new PartySystem(accounts, {
      isOnline: (characterId) => this.characterEids.has(characterId),
      zoneOfCharacter: (characterId) => {
        const eid = this.characterEids.get(characterId);
        if (eid === undefined) return null;
        const pos = this.positions.get(eid);
        return pos ? this.zoneNameAt(pos.x, pos.y) : null;
      },
      sendToCharacter: (characterId, msg) => {
        const eid = this.characterEids.get(characterId);
        if (eid === undefined) return false;
        const session = this.players.get(eid)?.session;
        if (!session) return false;
        session.sendJson(msg);
        return true;
      },
      positionOfCharacter: (characterId) => {
        const eid = this.characterEids.get(characterId);
        if (eid === undefined) return null;
        const pos = this.positions.get(eid);
        return pos ? { x: pos.x, y: pos.y } : null;
      },
      onMemberSevered: (characterId) => this.evictFromGuestDungeon(characterId),
    });
    // THE AUTHORED LOCKS (factions Phase 5): every listed door boots
    // locked — a restart re-arms every lock. The chunk must exist
    // before the door can be read; guarded by doorInfo after that, so
    // a redrawn map quietly retires a stale entry.
    for (const l of AUTHORED_LOCKS) {
      this.world.ensure(Math.floor(l.x / CHUNK_SIZE), Math.floor(l.y / CHUNK_SIZE));
      const g = this.world.groundAt(l.x, l.y);
      const info = g === undefined ? null : doorInfo(g);
      if (!info) continue;
      const unit = this.doorUnit(l.x, l.y, info);
      this.doorLocks.add(`${unit.ax},${unit.ay}`);
    }
  }

  /** Friends, requests, and presence pushes. */
  private readonly social: SocialSystem;

  /** Fellowships: membership, invites, and the partypos ticker. */
  private readonly party: PartySystem;

  /**
   * Name the ground under (x, y). Every zone — authored or dungeon
   * instance — registers a ZoneDef rectangle, so one containment scan
   * covers town streets and delve halls alike; everywhere else is wilds.
   */
  private zoneNameAt(x: number, y: number): string {
    for (const z of this.world.zoneDefs) {
      if (x >= z.origin.x && x < z.origin.x + z.width && y >= z.origin.y && y < z.origin.y + z.height) {
        return z.name;
      }
    }
    return 'The Wilds';
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
      soil: number;
      mulched: number;
      framed: number;
      cycles: number;
    }>,
  ): void {
    const now = Date.now();
    for (const row of rows) {
      const def = CROPS.get(row.crop);
      if (!def) continue; // a removed crop id — let the row rot
      const state: CropState = {
        def,
        tx: row.tx,
        ty: row.ty,
        plantedAt: row.plantedAt,
        boostMs: row.boostMs,
        watered: row.watered,
        owner: row.owner,
        lastStage: 0,
        soil: row.soil,
        mulched: row.mulched,
        framed: row.framed,
        cycles: row.cycles,
      };
      const stage = stageForElapsed(def, this.cropElapsed(state, now));
      state.lastStage = stage;
      this.crops.set(`${row.tx},${row.ty}`, state);
      this.world.registerCropTile(row.tx, row.ty, tileForStage(def, stage));
    }
  }

  /**
   * THE ONE CLOCK for a crop row: wall time (a framed row's runs 15%
   * fast — the frame's warmth) plus every banked watering credit.
   */
  private cropElapsed(state: CropState, now: number): number {
    const wall = now - state.plantedAt;
    return (state.framed ? Math.round(wall * 1.15) : wall) + state.boostMs;
  }

  /** THE LIVING SOIL: compost bins by "tx,ty". */
  private readonly farmBins = new Map<string, FarmBinState>();

  /** Load persisted compost bins at boot. */
  loadFarmBins(
    rows: Array<{ tx: number; ty: number; fill: number; graded: number; startedAt: number }>,
  ): void {
    for (const row of rows) {
      this.farmBins.set(`${row.tx},${row.ty}`, { ...row });
    }
  }

  // ------------------------------------------------------------ signs

  /**
   * Player-written signs by "tx,ty" — the world's own signage lives in
   * the zone defs (world.signAt) and never enters this map. Held whole
   * in memory like built tiles: a few rows, read on every approach.
   */
  private readonly playerSigns = new Map<
    string,
    { tx: number; ty: number; title: string; lines: string[]; owner: number }
  >();

  /** Load persisted player signs at boot. */
  loadSigns(
    rows: Array<{ tx: number; ty: number; title: string; lines: string[]; owner: number }>,
  ): void {
    for (const row of rows) this.playerSigns.set(`${row.tx},${row.ty}`, row);
  }

  /**
   * What the board at this tile says, for a given reader — the ONE
   * place authored and player signage merge. A player's words win over
   * authored copy on the same tile (they built over it), and `mine` is
   * decided here, never by the client.
   */
  private signInfoAt(tx: number, ty: number, forCharacterId: number): SignInfo | null {
    const own = this.playerSigns.get(`${tx},${ty}`);
    if (own) {
      const info: SignInfo = { tx, ty, title: own.title, lines: own.lines };
      if (own.owner === forCharacterId && forCharacterId > 0) info.mine = true;
      const by = this.accounts.characterName(own.owner);
      if (by) info.by = by;
      return info;
    }
    const authored = this.world.signAt(tx, ty);
    if (!authored) return null;
    return { tx, ty, title: authored.title, lines: authored.lines ?? [] };
  }

  /**
   * Hand a session every sign inside a chunk as that chunk streams in —
   * the words arrive WITH the board, so walking up to a sign never
   * waits on a round-trip. Blank player boards ride along too: their
   * owner needs the record to find the edit affordance.
   */
  private sendChunkSigns(session: Session, cx: number, cy: number): void {
    const charId = this.players.get(session.playerEid!)?.characterId ?? -1;
    const signs: SignInfo[] = [];
    for (const authored of this.world.signsInChunk(cx, cy)) {
      // A player sign on the same tile is emitted by the sweep below.
      if (this.playerSigns.has(`${authored.x},${authored.y}`)) continue;
      signs.push({
        tx: authored.x,
        ty: authored.y,
        title: authored.title,
        lines: authored.lines ?? [],
      });
    }
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (const own of this.playerSigns.values()) {
      if (own.tx < x0 || own.tx >= x0 + CHUNK_SIZE) continue;
      if (own.ty < y0 || own.ty >= y0 + CHUNK_SIZE) continue;
      const info = this.signInfoAt(own.tx, own.ty, charId);
      if (info) signs.push(info);
    }
    if (signs.length > 0) session.sendJson({ t: 'signs', signs });
  }

  /**
   * Tell everyone who can see this tile what it now says. Each watcher
   * gets their OWN record because `mine` differs per reader.
   */
  private broadcastSign(tx: number, ty: number, gone = false): void {
    const key = chunkKey(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    for (const [eid, player] of this.players) {
      const session = player.session;
      if (!session || !session.knownChunks.has(key)) continue;
      if (gone) {
        session.sendJson({ t: 'signs', signs: [{ tx, ty, title: '', lines: [], gone: true }] });
        continue;
      }
      const info = this.signInfoAt(tx, ty, this.players.get(eid)?.characterId ?? -1);
      if (info) session.sendJson({ t: 'signs', signs: [info] });
    }
  }

  /**
   * Rewrite a board. THE HAND THAT RAISED IT HOLDS THE PEN: only the
   * character who built the post may write on it, and the world's own
   * authored signage answers to nobody in play — it is edited in Map
   * Studio, where the words are content.
   */
  signEdit(eid: EntityId, tx: number, ty: number, title: string, lines: string[]): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });

    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 3 * 3) return; // out of arm's reach — silent
    if (player.characterId < 0) {
      sys('Guests cannot write on signs — make an account!');
      return;
    }
    const built = this.world.builtAt(tx, ty);
    if (!built || !isSignTile(built.tile)) {
      sys('There is nothing here to write on.');
      return;
    }
    if (built.owner !== player.characterId) {
      sys("That sign isn't yours to write on.");
      return;
    }
    const text = sanitizeSignText({ title, lines });
    this.playerSigns.set(`${tx},${ty}`, {
      tx,
      ty,
      title: text.title,
      lines: text.lines,
      owner: player.characterId,
    });
    this.accounts.saveSign(tx, ty, text.title, text.lines, player.characterId);
    this.broadcastSign(tx, ty);
  }

  /**
   * Per-zone placement bookkeeping for live map-editor reloads: which
   * spawnPoints/actorSpawnPoints indexes each authored zone owns. The
   * arrays themselves NEVER shrink — spawnIndex fields on live bodies
   * are absolute positions (the dungeon-teardown law) — so a reload
   * deactivates the old records in place and appends the new ones.
   */
  private readonly zonePlacements = new Map<string, { spawns: number[]; actors: number[] }>();

  private zonePlacementIdx(zoneId: string): { spawns: number[]; actors: number[] } {
    let rec = this.zonePlacements.get(zoneId);
    if (!rec) {
      rec = { spawns: [], actors: [] };
      this.zonePlacements.set(zoneId, rec);
    }
    return rec;
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
      patrol?: ReadonlyArray<{ x: number; y: number }>;
      hours?: { from: number; to: number };
      wing?: number;
    }>,
    zoneId?: string,
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
          patrol: spawn.patrol,
          hours: spawn.hours,
          wing: spawn.wing,
        });
      }
    }
    if (zoneId !== undefined) this.zonePlacementIdx(zoneId).spawns.push(...indexes);
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

  /**
   * Install the routine roster (loaded DB-first at boot). Must run
   * before registerActorSpawns — a placement keeping unknown hours is
   * a content error worth hearing about.
   */
  registerRoutines(defs: Iterable<RoutineDef>): void {
    for (const def of defs) this.routineDefs.set(def.id, def);
  }

  /** Register placed actors — exact posts, one body each. */
  registerActorSpawns(spawns: ReadonlyArray<ZoneActorSpawn>, zoneId?: string): void {
    for (const spawn of spawns) {
      if (!this.actorDefs.has(spawn.actor)) {
        console.warn(`[npc] placement references unknown actor '${spawn.actor}' — skipped`);
        continue;
      }
      if (spawn.routine !== undefined && !this.routineDefs.has(spawn.routine)) {
        console.warn(
          `[npc] placement of '${spawn.actor}' references unknown routine '${spawn.routine}' — posted still`,
        );
      }
      if (zoneId !== undefined) {
        this.zonePlacementIdx(zoneId).actors.push(this.actorSpawnPoints.length);
      }
      this.actorSpawnPoints.push({
        actor: spawn.actor,
        x: spawn.x,
        y: spawn.y,
        dir: spawn.dir,
        routine: spawn.routine,
        eid: null,
        respawnAt: 0,
        active: true,
      });
    }
  }

  /**
   * Register dialogue trees (DB-loaded, already validated) and index
   * their bindings. Call after registerActors — a binding without its
   * target is a warning, not a wire.
   */
  /**
   * Swap the live voice-clip ledger (THE SPOKEN LINE, voiceover-plan
   * Phase 3). Boot and the Studio's clip routes both land here; the
   * resolver reads it at every beat door, so a fresh upload speaks on
   * the very next line with no dialogue reload.
   */
  registerVoiceClips(defs: Iterable<VoiceClipDef>): void {
    this.voiceClips.clear();
    for (const def of defs) this.voiceClips.set(def.id, def);
  }

  voiceClipIds(): ReadonlySet<string> {
    return new Set(this.voiceClips.keys());
  }

  /** Swap the live bank set (boot + the Studio's bank routes). */
  registerVoiceBanks(defs: Iterable<VoiceBankDef>): void {
    this.voiceBanks.clear();
    for (const def of defs) this.voiceBanks.set(`${def.owner.kind}:${def.owner.id}`, def);
  }

  /** Live zone ids — the 'zone' bank owner axis validates against these. */
  zoneIds(): ReadonlySet<string> {
    return new Set([...this.world.zoneDefs].map((z) => z.id));
  }

  registerDialogues(defs: Iterable<DialogueDef>): void {
    for (const def of defs) {
      this.dialogueNodes.set(def.id, new Map(def.nodes.map((n) => [n.id, n])));
      for (const b of def.bindings ?? []) {
        if (b.kind !== 'actor') continue; // future kinds index elsewhere
        if (!this.actorDefs.has(b.target)) {
          console.warn(`[npc] dialogue '${def.id}' binds unknown actor '${b.target}' — skipped`);
          continue;
        }
        const list = this.dialoguesByActor.get(b.target) ?? [];
        list.push({ def, priority: b.priority ?? 0 });
        this.dialoguesByActor.set(b.target, list);
      }
    }
  }

  /**
   * Swap the live dialogue registry from dialogueSource (the DB).
   * Open conversations keep their old tree — their walk holds a ref;
   * the next talk speaks the new truth. Shared by /dlgreload and the
   * Content Studio's save wire.
   */
  async reloadDialogues(): Promise<{ count: number; errors: string[] }> {
    if (!this.dialogueSource) return { count: 0, errors: ['no dialogue source wired'] };
    const fresh = await this.dialogueSource();
    this.dialoguesByActor.clear();
    this.dialogueNodes.clear();
    this.registerDialogues(fresh.dialogues);
    return { count: fresh.dialogues.length, errors: fresh.errors };
  }

  /**
   * Register quests (DB-loaded, already validated) and build the
   * runtime indexes. Call after registerActors and registerDialogues —
   * a quest naming an unknown giver is a warning, not a wire.
   */
  registerQuests(defs: Iterable<QuestDef>): void {
    this.itemStartQuests.clear();
    for (const item of ITEMS.values()) {
      if (item.startsQuest) this.itemStartQuests.add(item.startsQuest);
    }
    for (const def of defs) {
      if (!this.actorDefs.has(def.giver)) {
        console.warn(`[npc] quest '${def.id}' names unknown giver '${def.giver}' — skipped`);
        continue;
      }
      this.questDefs.set(def.id, def);
      const giverList = this.questsByGiver.get(def.giver) ?? [];
      giverList.push(def.id);
      this.questsByGiver.set(def.giver, giverList);
      const turnIn = def.turnIn ?? def.giver;
      const turnInList = this.questsByTurnIn.get(turnIn) ?? [];
      turnInList.push(def.id);
      this.questsByTurnIn.set(turnIn, turnInList);
      for (const d of def.questDrops ?? []) {
        const drops = this.questDropsByNpc.get(d.npc) ?? [];
        drops.push({ quest: def.id, item: d.item, chance: d.chance });
        this.questDropsByNpc.set(d.npc, drops);
      }
    }
  }

  /** Swap the live quest registry from questSource (the DB). */
  async reloadQuests(): Promise<{ count: number; errors: string[] }> {
    if (!this.questSource) return { count: 0, errors: ['no quest source wired'] };
    const fresh = await this.questSource();
    this.questDefs.clear();
    this.questsByGiver.clear();
    this.questsByTurnIn.clear();
    this.questDropsByNpc.clear();
    this.registerQuests(fresh.quests);
    return { count: fresh.quests.length, errors: fresh.errors };
  }

  start(): void {
    let next = performance.now();
    const loop = () => {
      next += TICK_MS;
      const gensBefore = this.world.generatedCount;
      const t0 = performance.now();
      this.tick();
      // THE TICK NAMES ITS DEBT: chunk generation runs synchronously
      // inside the tick (interest streaming, movement/AI collision
      // probes into unloaded space). A handful per tick is the normal
      // leading-edge cost; a burst big enough to threaten the budget
      // gets logged with the tick time so a stall is attributable
      // instead of mysterious.
      const gens = this.world.generatedCount - gensBefore;
      if (gens >= 20) {
        const ms = (performance.now() - t0).toFixed(1);
        console.warn(`[world] ${gens} chunks generated in one tick (${ms}ms tick)`);
      }
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

  async hello(session: Session, opts: { name?: string; token?: string }): Promise<void> {
    if (opts.token) {
      // Guest reconnect within grace?
      const guestEid = this.guestTokens.get(opts.token);
      if (guestEid !== undefined && this.players.has(guestEid)) {
        this.bindSession(session, guestEid);
        return;
      }
      const res = await this.accounts.resumeSession(opts.token);
      if (res.ok) {
        await this.enterWorld(session, res.character, res.accountId, opts.token);
        return;
      }
      session.sendJson({ t: 'authErr', reason: res.reason });
      session.sendJson({ t: 'authRequired' });
      return;
    }

    if (opts.name && !config.allowGuest) {
      // Guest play is closed (production always; dev only if switched
      // off): turn them away politely and show the account door.
      session.sendJson({
        t: 'authErr',
        reason: 'Guest play is closed — sign in or create an account with an invite code.',
      });
      session.sendJson({ t: 'authRequired' });
      return;
    }

    if (opts.name && config.allowGuest) {
      const name = sanitizeName(opts.name);
      if (!name) {
        session.sendJson({ t: 'authErr', reason: 'invalid name' });
        return;
      }
      const spawn = this.startSpawn;
      const character: CharacterRow = {
        id: this.nextGuestId--,
        account_id: 0,
        name,
        x: spawn.x,
        y: spawn.y,
        hp: 10,
        home_x: null,
        home_y: null,
        hearth_at: 0,
        waypoint_x: null,
        waypoint_y: null,
        raid_calm_until: 0,
        hearth_warded: 0,
      };
      const token = randomBytes(18).toString('base64url');
      const eid = await this.enterWorld(session, character, null, token);
      if (eid !== null) this.guestTokens.set(token, eid);
      return;
    }

    session.sendJson({ t: 'authRequired' });
  }

  /**
   * THE DOOR SWINGS BOTH WAYS: a deliberate sign-out. The token dies
   * (no resume, on this browser or any other), the body leaves the
   * world at once instead of standing through the reconnect grace,
   * and only then does the socket hang up.
   */
  async logout(session: Session): Promise<void> {
    const eid = session.playerEid;
    if (eid === null) return;
    const player = this.players.get(eid);
    if (!player || player.session !== session) return;
    const token = player.token;
    if (player.accountId !== null) this.accounts.endSession(token);
    else this.guestTokens.delete(token);
    console.log(`[game] ${player.name} signed out`);
    // The ordinary disconnect path first (save, clean break of any
    // cast/channel/seat), then the despawn the grace window would
    // have waited for. A late ws 'close' finds nothing left to do.
    this.onSessionClosed(session);
    this.despawnPlayer(eid);
    session.close();
  }

  async login(session: Session, user: string, pass: string): Promise<void> {
    const res = await this.accounts.login(user, pass);
    if (!res.ok) {
      session.sendJson({ t: 'authErr', reason: res.reason });
      return;
    }
    const token = await this.accounts.createSession(res.accountId);
    await this.enterWorld(session, res.character, res.accountId, token);
  }

  async register(
    session: Session,
    user: string,
    pass: string,
    name: string,
    invite?: string,
  ): Promise<void> {
    const res = await this.accounts.register(user, pass, name, this.startSpawn, {
      required: config.requireInvite,
      code: invite,
    });
    if (!res.ok) {
      session.sendJson({ t: 'authErr', reason: res.reason });
      return;
    }
    const token = await this.accounts.createSession(res.accountId);
    await this.enterWorld(session, res.character, res.accountId, token);
  }

  /** Spawn (or rebind to) the character's entity and send welcome. */
  private async enterWorld(
    session: Session,
    character: CharacterRow,
    accountId: number | null,
    token: string,
  ): Promise<EntityId | null> {
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
      skills = (await this.accounts.loadSkills(character.id)) as SkillXp;
      inventory = await this.accounts.loadInventory(character.id, 28);
      equipment = (await this.accounts.loadEquipment(character.id)) as Partial<
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

    // The loads above awaited — re-check the double-login guard in case
    // the same character finished entering while they were in flight.
    {
      const raced = this.characterEids.get(character.id);
      if (raced !== undefined && this.players.has(raced)) {
        const player = this.players.must(raced);
        player.token = token;
        this.bindSession(session, raced);
        return raced;
      }
    }

    // The chart and the place ledger — loaded whole before the body
    // stands (guests chart in memory only).
    const explored = new ExploredMask();
    const discoveries = new Map<string, DiscoveryWire>();
    if (character.id > 0) {
      for (const row of await this.accounts.loadExplored(character.id)) {
        explored.loadRegion(row.rx, row.ry, row.bits);
      }
      for (const row of await this.accounts.loadDiscoveries(character.id)) {
        const d: DiscoveryWire = {
          id: row.id,
          kind: row.kind as DiscoveryWire['kind'],
          name: row.name,
          x: row.x,
          y: row.y,
          tier: row.tier ?? undefined,
          faded: row.faded ? true : undefined,
        };
        // Belt-and-braces: the frontier may have turned while this
        // character slept through the live fade push. A 'poi:' marker
        // whose cell no longer holds its epoch's site reads as rumor.
        if (!d.faded && row.id.startsWith('poi:')) {
          const cell = this.poiLedger.get(row.id.slice(4));
          const stale =
            cell !== undefined &&
            (cell.site === null || (row.epoch !== null && cell.epoch !== row.epoch));
          if (stale) {
            d.faded = true;
            this.accounts.fadeDiscovery(row.id);
          }
        }
        discoveries.set(row.id, d);
      }
    }

    // The quest ledger — rows for retired defs load anyway and sleep
    // until their quest returns (a tool re-import resumes them).
    const quests = new Map<string, QuestProgress>();
    if (character.id > 0) {
      for (const row of await this.accounts.loadQuestRows(character.id)) {
        let progress: number[] = [];
        try {
          const parsed: unknown = JSON.parse(row.progress);
          if (Array.isArray(parsed)) progress = parsed.filter((n) => typeof n === 'number');
        } catch {
          // A corrupt counter row restarts its stage; the quest survives.
        }
        quests.set(row.questId, {
          status: row.status,
          stage: row.stage,
          progress,
          acceptedAt: row.acceptedAt,
          completions: row.completions,
          cooldownUntil: row.cooldownUntil ?? undefined,
        });
      }
    }

    // The standing ledger — rows for factions retired from the doc
    // load anyway and sleep until the roster brings them back.
    const standing =
      character.id > 0 ? await this.accounts.loadStandings(character.id) : new Map<string, number>();

    const eid = this.ecs.create();
    this.kinds.set(eid, EntityKind.Player);
    this.positions.set(eid, { x: spawnX, y: spawnY, dir: 0 });
    this.poses.set(eid, PoseState.Idle);
    this.healths.set(eid, { hp: Math.min(character.hp, maxHp), maxHp });
    const grips =
      character.id > 0
        ? await this.accounts.loadCarryStyles(character.id)
        : { main: 'normal' as CarryStyle, off: 'normal' as CarryStyle };
    this.players.set(eid, {
      name: character.name,
      speed: PLAYER_SPEED,
      look: character.id > 0 ? await this.accounts.loadLook(character.id) : null,
      carryStyle: grips.main,
      carryOff: grips.off,
      characterId: character.id,
      accountId,
      token,
      session: null,
      disconnectedAt: null,
      inputQueue: [],
      inputBleedRun: 0,
      lastProcessedSeq: 0,
      skills,
      inventory,
      action: null,
      bank: character.id > 0 ? await this.accounts.loadBank(character.id) : null,
      bankDirty: false,
      equipment,
      gear,
      attackCooldown: 0,
      offhandEchoTicks: 0,
      offhandEchoAim: 0,
      offhandEchoMult: 1,
      lastCombatAt: 0,
      lastBlockFxTick: 0,
      poseUntilTick: 0,
      lastDodgeSeq: -999,
      drawTicks: 0,
      combo: freshCombo(),
      attackBufferedUntilTick: 0,
      pendingStrike: null,
      abilityCd: [0, 0, 0, 0],
      prevButtons: 0,
      castFreezeUntilTick: 0,
      casting: null,
      buffs: [],
      techniques: character.id > 0 ? await this.accounts.loadTechniques(character.id) : [null, null],
      lessonDirty: new Set(),
      callings: character.id > 0 ? new Set(await this.accounts.loadCallings(character.id)) : new Set(),
      perks: defaultPerks(),
      stillTicks: 0,
      sneaking: false,
      sitting: false,
      lying: false,
      seat: null,
      mountId: null,
      // THE STABLE DOOR: the owned string returns with the character
      // (row presence = owned, `chosen` answers the whistle).
      mountsOwned: new Set(
        (character.id > 0 ? await this.accounts.loadMounts(character.id) : []).map((m) => m.id),
      ),
      mountChosen:
        character.id > 0
          ? ((await this.accounts.loadMounts(character.id)).find((m) => m.chosen)?.id ?? null)
          : null,
      rideSigSent: '',
      // THE OPEN HAND: the household returns with the character; the
      // heel-state row takes its body once the entity stands (below).
      pets: character.id > 0 ? await this.accounts.loadPets(character.id) : [],
      petEid: null,
      petCalmTicks: 0,
      petSigSent: '',
      petHp: null,
      petXpDirty: false,
      petBondAt: new Map(),
      sheathed: false,
      drawLockUntilTick: 0,
      sneakStillTicks: 0,
      hidden: false,
      flags: character.id > 0 ? await this.accounts.loadFlags(character.id) : new Map(),
      knownRecipes: character.id > 0 ? new Set(await this.accounts.loadRecipes(character.id)) : new Set(),
      dialogue: null,
      revealLockUntilTick: 0,
      sneakMoveAccum: 0,
      home:
        character.home_x !== null && character.home_y !== null
          ? { x: character.home_x, y: character.home_y }
          : null,
      hearthAt: character.hearth_at,
      raidCalmUntil: character.raid_calm_until,
      hearthWarded: character.hearth_warded !== 0,
      explored,
      exploredDirty: new Set(),
      discoveries,
      waypoint:
        character.waypoint_x !== null && character.waypoint_y !== null
          ? { x: character.waypoint_x, y: character.waypoint_y }
          : null,
      quests,
      questAvailSig: '',
      questCollectSig: '',
      standing,
      repSig: '',
      markWary: new Map(),
      procs: new Map(),
    });
    this.characterEids.set(character.id, eid);
    // THE HAND REMEMBERS: on a first arrival under THE SECOND HAND an
    // empty Q seat takes the equipped weapon's art — yesterday's
    // loadout, verbatim, with the choice now underneath. A null seat
    // can only mean never-seated today (no unseat flow exists); the
    // day one ships, this site needs an explicit emptied marker so an
    // emptied Q stays empty.
    {
      const seeded = this.players.get(eid)!;
      if (!seeded.techniques[0]) {
        const art = this.equippedWeapon(seeded)?.weapon.art;
        if (art) {
          seeded.techniques[0] = art;
          if (character.id > 0) this.accounts.saveTechniqueSeat(character.id, 0, art);
        }
      }
    }
    this.updateChunkMembership(eid);
    this.bindSession(session, eid);
    // The heel companion arrives with its keeper — same doorstep.
    this.trySpawnPet(eid, this.players.must(eid));
    this.systemChatAll(`${character.name} has joined the world.`);
    // A true arrival (reconnects within grace rebind without passing
    // here) — tell online friends, and surface any waiting asks.
    if (character.id > 0) {
      void this.social.notifyOnline(character.id, character.name).catch(() => undefined);
      // Loads the durable party into memory as a side effect — the
      // riftgate/ticker hot paths read it synchronously after this.
      void this.party.notifyOnline(character.id, character.name).catch(() => undefined);
      // Push the party unprompted: markers and the panel need it before
      // the player ever opens a screen.
      void this.party.snapshot(character.id, (msg) => session.sendJson(msg)).catch(() => undefined);
      const pending = await this.social.pendingCount(character.id);
      if (pending > 0) {
        session.sendJson({
          t: 'chat',
          channel: 'system',
          text: `You have ${pending} pending friend request${pending === 1 ? '' : 's'} — press U.`,
        });
      }
    }
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
    // THE MIRROR STARTS OVER: the ride signature belongs to the OLD
    // socket — without this reset a reconnecting rider's fresh client
    // never hears its own saddle and predicts at foot speed forever.
    player.rideSigSent = '';
    // Same law for the household mirror.
    player.petSigSent = '';
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
    session.sentSnapSig.clear();
    this.sessions.add(session);
    session.sendJson({
      t: 'welcome',
      eid,
      name: player.name,
      tick: this.tickCount,
      token: player.token,
      motd: config.motd,
      look: player.look ?? undefined,
      seed: config.worldSeed,
      havens: this.havenWire(),
      anchors: this.anchorWire(),
      waypoint: player.waypoint ?? undefined,
      // The plan is editable data — the map must chart the live truth,
      // never the client's bundled copy.
      geo: geographySnapshot(),
    });
    session.sendJson({ t: 'skills', xp: player.skills });
    session.sendJson({ t: 'recipes', known: [...player.knownRecipes] });
    session.sendJson({ t: 'inv', slots: player.inventory });
    session.sendJson({ t: 'equip', equipment: player.equipment, carry: player.carryStyle, carryOff: player.carryOff });
    this.sendTechniques(player);
    // Answered Callings ride in after the skills that budget them; the
    // sanitize is belt-and-braces (skills only rise) plus the guard
    // against defs retired between sessions.
    this.sanitizeCallings(player);
    this.recomputeGear(eid, player);
    // The stacking meters the worn kit carries, at whatever count the
    // last session banked (state is per-fight RAM; a fresh boot reads
    // zeroes, which is the truth).
    this.sendCharges(player);
    session.sendJson({ t: 'callings', answered: [...player.callings] });
    session.sendJson({ t: 'time', ofs: this.timeOfsTicks });
    this.sendCooldowns(player);
    // THE ONE CARE MIRROR: the field's facts, whole, once per session.
    this.sendFarm(session);
    // THE LARDER BOARD's fills (the orders derive client-side).
    this.sendLarder(session);
    // The walk-back beacon survives a relogin while the spill still
    // holds the ground; a stale entry is swept here instead of sent.
    {
      const mark = this.deathMarks.get(player.characterId);
      if (mark) {
        const remainMs = mark.until - Date.now();
        if (remainMs > 0) {
          session.sendJson({ t: 'deathmark', mark: { x: mark.x, y: mark.y, remainMs } });
        } else {
          this.deathMarks.delete(player.characterId);
        }
      }
    }
    // The chart snapshot — after this, fog only ever clears locally on
    // both sides (the deterministic-reveal law).
    {
      let batch: [number, number, string][] = [];
      for (const key of player.explored.regionKeys()) {
        const [rx, ry] = key.split(',').map(Number) as [number, number];
        if (!persistRegion(ry)) continue;
        const bytes = player.explored.regionBytes(rx, ry);
        if (!bytes) continue;
        batch.push([rx, ry, u8ToB64(bytes)]);
        if (batch.length >= EXPLORED_PUSH_BATCH) {
          session.sendJson({ t: 'explored', regions: batch });
          batch = [];
        }
      }
      if (batch.length > 0) session.sendJson({ t: 'explored', regions: batch });
    }
    // The ledger travels with each poi: marker's LIVE stage merged in —
    // stage is world truth, refreshed at bind, never stored per character.
    session.sendJson({
      t: 'discoveries',
      list: [...player.discoveries.values()].map((d) => {
        if (!d.id.startsWith('poi:') || d.faded) return d;
        const stage = this.poiLedger.get(d.id.slice(4))?.stage ?? 0;
        if (stage > 0) d.stage = stage;
        else delete d.stage;
        return d;
      }),
    });
    // The quest ledger, whole — the journal, the tracker, and every
    // overhead mark resolve from this one push.
    this.sendQuestsFull(player);
    // The standing ledger + live membership tables, whole.
    this.sendRepFull(player);
  }

  onSessionClosed(session: Session): void {
    this.sessions.delete(session);
    const eid = session.playerEid;
    if (eid === null) return;
    const player = this.players.get(eid);
    if (!player || player.session !== session) return;
    player.session = null;
    player.disconnectedAt = Date.now();
    // A dropped socket hangs up any conversation (nothing to notify).
    player.dialogue = null;
    // THE DRAWN BREATH breaks clean on disconnect — no unpiloted
    // wind-up fires into the reconnect grace window.
    this.cancelCasting(eid, player);
    // THE HELD NOTE breaks clean too (Phase 5's proving caught this):
    // the grace window freezes all ticking, so a held channel would
    // otherwise RESUME barless into the reconnected client and pulse
    // on with no bar to read. The note forfeits with its singer;
    // workaday actions (gather, craft) keep their place as they
    // always have.
    if (player.action?.kind === 'channel') this.cancelAction(eid, player, 'cancelled');
    // No unpiloted invisible bodies during the reconnect grace window.
    player.sneaking = false;
    if (player.hidden) this.setHidden(eid, player, false);
    // Stand a seated body down at its walk-up spot before the save —
    // a position persisted inside solid furniture would wedge the
    // next login.
    const dropPos = this.positions.get(eid);
    if (dropPos) this.standUp(eid, player, dropPos);
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
    // A guest slot in someone else's run goes with them — and a guest
    // logging out inside it reloads at their own gate, not in the dark.
    for (const inst of this.dungeons.values()) {
      const back = inst.guests.get(player.characterId);
      if (back === undefined) continue;
      inst.guests.delete(player.characterId);
      const pos = this.positions.get(eid);
      if (pos && pos.y >= 8192 && pos.x >= inst.x0 && pos.x < inst.x1) {
        pos.x = back.x;
        pos.y = back.y;
      }
    }
    this.savePlayer(eid);
    this.characterEids.delete(player.characterId);
    // Only now — past the reconnect grace — do friends see "offline".
    if (player.characterId > 0) {
      void this.social.notifyOffline(player.characterId, player.name).catch(() => undefined);
      void this.party.notifyOffline(player.characterId, player.name).catch(() => undefined);
    }
    if (player.accountId === null) {
      for (const [token, guestEid] of this.guestTokens) {
        if (guestEid === eid) this.guestTokens.delete(token);
      }
    }
    // The companion's visit ends with its keeper's — the row
    // remembers. A friend DOWN at the goodbye (or a force-quit on the
    // downed screen) loses nothing: the row lands 'resting', exactly
    // as if the keeper had walked away.
    if (player.petEid !== null && (this.healths.get(player.petEid)?.hp ?? 0) <= 0) {
      this.petLimpsHome(player);
    }
    this.despawnPetEntity(player);
    this.removeFromChunks(eid);
    this.ecs.destroy(eid);
    this.systemChatAll(`${player.name} has left the world.`);
    console.log(`[game] ${player.name} despawned, ${this.players.size} online`);
  }

  // ----------------------------------------------------------- social

  /**
   * Resolve a social sender: a real, persisted character. Guests get a
   * gentle nudge — the friend ledger lives in the database they don't have.
   */
  private socialActor(eid: EntityId, session: Session): { id: number; name: string } | null {
    const player = this.players.get(eid);
    if (!player) return null;
    if (player.characterId <= 0) {
      session.sendJson({ t: 'chat', channel: 'system', text: 'Social features need an account.' });
      return null;
    }
    return { id: player.characterId, name: player.name };
  }

  socialSnapshot(eid: EntityId, session: Session): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.social.snapshot(actor.id, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[social]', err.message));
    }
  }

  friendSearch(eid: EntityId, session: Session, query: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.social.search(actor.id, query, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[social]', err.message));
    }
  }

  friendRequest(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.social.request(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[social]', err.message));
    }
  }

  friendAccept(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.social.accept(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[social]', err.message));
    }
  }

  friendDecline(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.social.decline(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[social]', err.message));
    }
  }

  friendRemove(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.social.remove(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[social]', err.message));
    }
  }

  // ------------------------------------------------------------ party

  partySnapshot(eid: EntityId, session: Session): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.party.snapshot(actor.id, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[party]', err.message));
    }
  }

  partyInvite(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.party.invite(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[party]', err.message));
    }
  }

  partyAccept(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.party.accept(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[party]', err.message));
    }
  }

  partyDecline(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.party.decline(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[party]', err.message));
    }
  }

  partyLeave(eid: EntityId, session: Session): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.party.leave(actor.id, actor.name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[party]', err.message));
    }
  }

  partyKick(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.party.kick(actor.id, actor.name, name, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[party]', err.message));
    }
  }

  partyDisband(eid: EntityId, session: Session): void {
    const actor = this.socialActor(eid, session);
    if (actor) {
      void this.party.disband(actor.id, (msg) => session.sendJson(msg)).catch((err: Error) => console.error('[party]', err.message));
    }
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
    this.flushLessons(player);
    if (player.bank && player.bankDirty) {
      this.accounts.saveBank(player.characterId, player.bank);
      player.bankDirty = false;
    }
    // Dirty-region chart flush (the bankDirty pattern). Instance-band
    // rows never reach the DB — a dungeon is re-charted every run.
    if (player.exploredDirty.size > 0) {
      for (const key of player.exploredDirty) {
        const [rx, ry] = key.split(',').map(Number) as [number, number];
        if (!persistRegion(ry)) continue;
        const bytes = player.explored.regionBytes(rx, ry);
        if (bytes) this.accounts.saveExploredRegion(player.characterId, rx, ry, bytes);
      }
      player.exploredDirty.clear();
    }
    // The pet ladder's trickle rides the same cadence (bankDirty
    // pattern) — tame/name/state writes fire at their own moments.
    if (player.petXpDirty) {
      for (const p of player.pets) this.accounts.savePetXp(player.characterId, p.slot, p.xp);
      player.petXpDirty = false;
    }
  }

  private saveAll(): void {
    for (const eid of this.players.keys()) this.savePlayer(eid);
  }

  /**
   * THE CHART marches with the walker: every SERVER_REVEAL_TICKS each
   * online body clears the shared deterministic disc around itself.
   * Instance space (y >= DUNGEON_MIN_Y) is skipped wholesale — the
   * client keeps its own session-only dungeon chart.
   */
  private tickReveal(): void {
    for (const session of this.sessions) {
      const eid = session.playerEid;
      if (eid === null) continue;
      const player = this.players.get(eid);
      const pos = this.positions.get(eid);
      if (!player || !pos || pos.y >= DUNGEON_MIN_Y) continue;
      for (const key of player.explored.markDisc(pos.x, pos.y)) {
        player.exploredDirty.add(key);
      }
    }
  }

  // ----------------------------------------------------- discoveries

  /**
   * The place-ledger check, run on the center-chunk edge (32-tile
   * cadence). Zones by containment, frontier sites by anchor proximity
   * from the 3×3 ledger cells around the walker.
   */
  private checkDiscoveries(eid: EntityId): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || pos.y >= DUNGEON_MIN_Y) return;
    const cellX = poiCellOf(pos.x);
    const cellY = poiCellOf(pos.y);
    const sites: { site: PoiSite; epoch: number }[] = [];
    for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
      for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
        const row = this.poiLedger.get(poiCellKey(cx, cy));
        if (row?.site) sites.push({ site: row.site, epoch: row.epoch });
      }
    }
    const found = findDiscoveries(
      pos.x,
      pos.y,
      this.world.zoneDefs,
      sites,
      (defId) => {
        const def = POI_DEFS.get(defId);
        return def ? { name: def.name, haven: def.haven !== undefined } : undefined;
      },
      player.discoveries,
    );
    for (const f of found) this.recordDiscovery(player, f.d, f.epoch);
  }

  /**
   * Enter a place into the ledger and fire the one live splash. The
   * DB write lands the moment of the footfall (a first discovery must
   * never be lost to a crash); re-recording an id overwrites a faded
   * marker with the fresh truth.
   */
  private recordDiscovery(player: PlayerComp, d: DiscoveryWire, epoch?: number): void {
    // A poi: footfall arms the boldness clock's gate and stamps the
    // site's LIVE stage onto the wire (stage is world truth merged at
    // send time — never stored per character).
    if (d.id.startsWith('poi:')) {
      const cellKey = d.id.slice(4);
      this.discoveredPoiCells.add(cellKey);
      const stage = this.poiLedger.get(cellKey)?.stage ?? 0;
      if (stage > 0) d.stage = stage;
    }
    player.discoveries.set(d.id, d);
    if (player.characterId > 0) this.accounts.addDiscovery(player.characterId, d, epoch);
    player.session?.sendJson({ t: 'discovery', d });
    // One choke point catches every "chart this place" quest ask.
    this.creditQuestEvent(player, 'discover', d.id);
    // THE WORLD SPEAKS (voiceover Phase 6): a place may greet its
    // discoverer — a zone's voice on the wind at first footfall, a
    // site archetype's spirit at first sighting. Once per character
    // by the ledger's own nature; a re-stood site speaks again.
    let owner: string | null = null;
    if (d.id.startsWith('zone:')) {
      owner = `zone:${d.id.slice(5)}`;
    } else if (d.id.startsWith('poi:')) {
      const defId = this.poiLedger.get(d.id.slice(4))?.site?.defId;
      if (defId) owner = `poi:${defId}`;
    }
    if (owner) {
      const quip = this.drawQuip(owner, 'greet', false);
      if (quip) {
        // The voice reaches the DISCOVERER's ear, not the marker: a
        // zone center or site anchor can sit past the client's quip
        // earshot, and a greeting nobody hears is no greeting.
        const eid = player.session?.playerEid;
        const at = eid !== null && eid !== undefined ? this.positions.get(eid) : undefined;
        player.session?.sendJson({
          t: 'vq',
          x: at?.x ?? d.x,
          y: at?.y ?? d.y,
          url: quip.url,
          durMs: quip.durMs,
        });
      }
    }
  }

  /**
   * The frontier turned over at a cell: every character's marker for
   * it ages to rumor — one cross-character UPDATE for the offline,
   * an in-memory flip plus a thin push for the online.
   */
  private fadePoiDiscoveries(cellKey: string): void {
    const id = `poi:${cellKey}`;
    this.discoveredPoiCells.delete(cellKey); // the boldness gate closes with the site
    this.accounts.fadeDiscovery(id);
    for (const player of this.players.values()) {
      const d = player.discoveries.get(id);
      if (d && !d.faded) {
        d.faded = true;
        player.session?.sendJson({ t: 'discoveryfade', ids: [id] });
      }
    }
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

  /**
   * THE WORK TAKES TIME: no resource node yields faster than 3 seconds
   * (60 ticks), whatever the tool ladder, level surplus, and brews
   * multiply out to. Harvesting is labor, not vacuuming — the floor is
   * what keeps a starsteel axe from mowing a copse flat in a blink.
   */
  private static readonly MIN_GATHER_TICKS = 60;

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
        if (ty >= 8192) {
          // A dungeon's exit. The run is the OWNER's: their step out
          // ends it (teardown evacuates any guests); a guest stepping
          // out simply goes home to their own gate, run untouched.
          const host = this.dungeonAt(tx, ty);
          if (host && host.ownerId !== player.characterId) {
            const back = host.guests.get(player.characterId);
            host.guests.delete(player.characterId);
            this.teleport(eid, back?.x ?? portal.dest.x, back?.y ?? portal.dest.y);
          } else {
            this.teleport(eid, portal.dest.x, portal.dest.y);
            this.teardownDungeon(player.characterId);
          }
        } else {
          this.teleport(eid, portal.dest.x, portal.dest.y);
        }
      }
      return;
    }

    // The bank chest opens the vault (accounts only).
    if (ground === Tile.BankChest) {
      if (player.bank === null) {
        sys('Guests cannot use the bank — make an account!');
        return;
      }
      void this.sendBank(player).catch((err: Error) => console.error('[bank]', err.message));
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
      this.interactDoor(eid, tx, ty, door, sys);
      return;
    }

    // Signs: reading is a CLIENT act (the words already streamed in
    // with the chunk), so the server only answers the case the client
    // cannot decide alone — a board with nothing written on it.
    if (isSignTile(ground)) {
      const info = this.signInfoAt(tx, ty, player.characterId);
      if (!info || (info.title === '' && info.lines.length === 0)) {
        sys(info?.mine ? 'The board is blank — write something on it.' : 'The board is blank.');
      }
      return;
    }

    // Furniture: chairs, benches, and thrones seat the body; beds lay
    // it down — and lying in a fresh bed claims it as HOME (defeat
    // wakes you beside it, /recall carries you back on the hearth
    // cooldown, and touching it again while resting tends the ward).
    if (isSeatTile(ground)) {
      this.interactSeat(eid, player, pos, tx, ty, sys);
      return;
    }

    // THE LIVING SOIL: the compost bin answers the hand directly —
    // turn out a finished batch, or hear how the heap is doing (the
    // deposit panel is the client's; every deposit re-proves here).
    if (ground === Tile.CompostBin) {
      this.interactCompostBin(eid, player, tx, ty, sys);
      return;
    }
    // THE WORKING YARD: a station's interact collects what matured;
    // the hive keeps its own door.
    if (ground !== undefined && WORK_STATION_TILES.has(ground as Tile)) {
      this.interactWorkStation(eid, player, tx, ty, sys);
      return;
    }
    if (ground === Tile.Apiary) {
      this.interactApiary(eid, player, tx, ty, sys);
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

    const ticks = this.gatherTicks(player, node, ty);
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
    // THE WARD: a POI chest whose def wards it stays shut while any
    // garrison body of its site stands — the champion's cache cannot
    // be sneaked out from under him.
    const over = this.poiChests.get(`${tx},${ty}`);
    const wardStands = over?.warded
      ? over.cell.startsWith('sh:')
        ? this.strongholdGarrisonStands(
            over.cell.slice(3),
            this.strongholdBossWard(over.cell.slice(3)),
          )
        : this.poiGarrisonStands(over.cell)
      : false;
    if (wardStands) {
      sys('The lid will not lift — the ward holds while its keeper stands.');
      return;
    }
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
    // In the open world it rides the danger field instead — a chest
    // opened in tier-4 land pays tier-4 wages (level floor + rarity
    // bonus), one field, many readers. The underground keeps its own
    // ladders.
    const tier = ty < DARK_BAND_Y ? this.liveDangerTier(tx, ty) : 0;
    const dlaw = dangerLaw(tier);
    const chestLevel = Math.max(
      law.level,
      this.dungeonPowerAt(tx, ty) ?? 0,
      tier > 0 ? dlaw.npcLevel[1] : 0,
    );
    const table = over?.table ?? law.table;
    for (const drop of rollLoot(table, {
      level: chestLevel,
      rand: Math.random,
      rarityBonus: tier > 0 ? dlaw.rarityBonus : 0,
    })) {
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
    // THE CLEARED HALL STAYS CLEARED: a delve chest never re-arms
    // while the instance lives — the re-cut on the next key turn is
    // the reset. Surface chests keep the reclose clock.
    if (ty < DUNGEON_MIN_Y) {
      this.respawnQueue.push({
        at: now + law.recloseSec * 1000,
        tx,
        ty,
        tile: closedChestTile(chest.kind),
      });
    }
    // THE LIGHT FINGERS (Phase 5): a town's stash is somebody's
    // stash — the lid lifting on town ground, seen by a faction body,
    // is a theft charged to the town's own ledger. Wilds and dungeon
    // chests stay the ordinary loot loop; unseen is unswayed.
    const townFid = this.townFactionAt(cx, cy);
    if (townFid !== null) {
      this.chargeTheft(eid, player, cx, cy, this.theftWitnesses(cx, cy, eid), townFid);
    }
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
  private interactDoor(
    eid: EntityId,
    tx: number,
    ty: number,
    info: DoorInfo,
    sys: (text: string) => void,
  ): void {
    const unit = this.doorUnit(tx, ty, info);
    const lockKey = `${unit.ax},${unit.ay}`;
    const gate =
      info.material === 'fence' || info.material === 'garrison' || info.material === 'palisade';
    if (info.open) {
      for (const t of unit.tiles) {
        if (this.bodyOnTile(t.x, t.y)) {
          sys(gate ? 'Someone is standing in the gateway.' : 'Someone is standing in the doorway.');
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
      // THE PICK (Phase 5): a crouched hand works the latch instead
      // of knocking — deterministic at the doc's sneak gate. On town
      // ground a SEEN pick is a theft like any other; unseen is
      // unswayed. The lock stays open until the next boot re-arms it.
      const player = this.players.get(eid);
      if (player?.sneaking) {
        if (this.effectiveLevel(player, 'sneak') < FACTIONS.theft.lockLevel) {
          sys('The pick wants a defter hand.');
        } else {
          this.doorLocks.delete(lockKey);
          sys('The lock gives with a click.');
          const cx = unit.ax + 0.5;
          const cy = unit.ay + 0.5;
          const townFid = this.townFactionAt(cx, cy);
          if (townFid !== null) {
            this.chargeTheft(eid, player, cx, cy, this.theftWitnesses(cx, cy, eid), townFid);
          }
          // The latch is worked — fall through and swing it open.
        }
      } else {
        sys(gate ? 'Locked — the gate holds fast.' : 'Locked — the door holds fast.');
      }
      if (this.doorLocks.has(lockKey)) {
        this.broadcastFx({
          t: 'fx',
          kind: 'rattle',
          x: unit.ax + 0.5,
          y: unit.ay + 0.5,
          radius: 0.5,
        });
        return;
      }
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

  /**
   * ONE CLOCK FOR EVERY SWING: tool tier, level surplus, brews, and
   * the gathering Callings pace the first swing and every swing after.
   * (The repeat path once rebuilt its ticks from the brew alone — a
   * starsteel axe that only bit once was a bug, not a law.)
   */
  private gatherTicks(player: PlayerComp, node: NodeDef, ty: number): number {
    let tool = node.tool ? bestTool(player.inventory, node.tool) : { item: '', power: 1 };
    if (node.tool && player.equipment.tool) {
      const worn = itemDef(player.equipment.tool.id)?.tool;
      if (worn && worn.type === node.tool && (!tool || worn.power >= tool.power)) {
        tool = { item: player.equipment.tool.id, power: worn.power };
      }
    }
    const power = tool?.power ?? 1;
    const level = this.effectiveLevel(player, node.skill);
    // Faster with better tools, higher levels, and a gatherer's brew.
    let speedup =
      (1 + (power - 1) * 0.25 + (level - node.levelReq) * 0.01) * this.gatherSpeedOf(player);
    // The gathering Callings: a per-trade pace (Heartwood/Verdant Eye),
    // Deep Lungs below the dark band, Night Angler once the sun is down.
    speedup *= player.perks.gatherSpeed[node.skill] ?? 1;
    if (ty >= DARK_BAND_Y) speedup *= player.perks.undergroundGatherMult;
    if (node.skill === 'fishing' && player.perks.nightGatherMult !== 1) {
      const hours = clockHoursAtTick(this.tickCount, this.timeOfsTicks);
      if (hours < SUNRISE || hours > SUNSET) speedup *= player.perks.nightGatherMult;
    }
    return Math.max(GameServer.MIN_GATHER_TICKS, Math.round(node.baseTicks / speedup));
  }

  private cancelAction(eid: EntityId, player: PlayerComp, reason?: string): void {
    if (!player.action) return;
    // A craft batch reports its tally on the way out — the work card's
    // "Made N" face and the interrupt lines both read from this.
    const made =
      player.action.kind === 'craft'
        ? (player.action as CraftAction).total - (player.action as CraftAction).remaining
        : undefined;
    player.action = null;
    player.session?.sendJson({ t: 'action', state: 'stop', reason, made });
  }

  /** The player sets the tools down mid-batch — an honest stop, not a failure. */
  craftStop(eid: EntityId): void {
    const player = this.players.get(eid);
    if (!player || player.action?.kind !== 'craft') return;
    this.cancelAction(eid, player, 'stopped');
  }

  /** Called each tick for players with a running action. */
  private tickAction(eid: EntityId, player: PlayerComp): void {
    const kind = player.action!.kind;
    if (kind === 'gather') this.tickGather(eid, player);
    else if (kind === 'channel') this.tickChannel(eid, player);
    else if (kind === 'craft') this.tickCraft(eid, player);
    else if (kind === 'harvest') this.tickHarvest(eid, player);
    else if (kind === 'milk') this.tickMilk(eid, player);
    else if (kind === 'tame') this.tickTame(eid, player);
    else if (kind === 'tend') this.tickTend(eid, player);
    else if (kind === 'demolish') this.tickDemolish(eid, player);
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
    // Prospector / Timber Sense / Patient Line / Gleaner: the trade's
    // Calling sometimes hands the yield over double.
    const doubleChance = player.perks.doubleGather[node.skill] ?? 0;
    if (doubleChance > 0 && Math.random() < doubleChance) {
      addItem(player.inventory, node.yieldItem, 1);
    }
    this.grantXp(eid, player, node.skill, node.xp);
    // THE DEEPER SIGIL: a finished harvest is a moment, and a yield
    // working puts its extra straight into the basket. Pack overflow is
    // the same law as the base yield above: what will not fit is simply
    // not taken.
    const procExtra = this.bodyMoment(eid, player, 'gather', {
      x: action.tx + 0.5,
      y: action.ty + 0.5,
      style: node.skill,
    });
    if (procExtra > 0) addItem(player.inventory, node.yieldItem, procExtra);
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
    // THE SPILLED SEED (second-growth Phase 4): the swing that fells
    // the node sometimes sheds its seed — rolled BEFORE the pack
    // snapshot goes out, so the seed rides the same message.
    const felled = node.depletedTile !== null && Math.random() < node.depleteChance;
    if (felled && node.seedYield && Math.random() < node.seedYield.chance) {
      addItem(player.inventory, node.seedYield.item, 1);
    }
    player.session?.sendJson({ t: 'inv', slots: player.inventory });

    if (felled) {
      // THE KEPT AND THE WILD (second-growth Phase 1): the domain of
      // the GROUND routes the depletion, never the def. Kept ground
      // (authored zones, live POI zones, the dark band) keeps the old
      // seconds-fast in-place queue; wild ground writes the persistent
      // growth ledger and heals slowly through the ages.
      if (
        this.world.growthDomainAt(action.tx, action.ty) === 'wild' &&
        growthDialectOf(node.tile) !== null
      ) {
        this.fellWild(action.tx, action.ty, node);
      } else {
        // felled ⇒ depletedTile is non-null (the roll requires it).
        this.setWorldTile(action.tx, action.ty, node.depletedTile!);
        // THE CLEARED HALL STAYS CLEARED: a delve vein never regrows
        // while the instance lives — the ore a key holds is finite
        // per run, and the re-cut restocks it. Surface nodes keep
        // their regrowth clocks.
        if (action.ty < DUNGEON_MIN_Y) {
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
        }
      }
      this.cancelAction(eid, player, 'done');
    } else {
      // Keep gathering the same node — same clock as the first swing.
      action.ticksLeft = this.gatherTicks(player, node, action.ty);
      player.session?.sendJson({ t: 'action', state: 'start', ticks: action.ticksLeft });
    }
  }

  // ----------------------------------------------------------- farming

  /**
   * Interacting with a planted crop: harvest if ripe, water if you
   * carry a can and it's thirsty, otherwise report the wait.
   */
  /** How long the hearth rests between recalls. */
  private static readonly HEARTH_CD_MS = 10 * 60 * 1000;

  // ----------------------------------------------------------- seating

  /**
   * Who holds a furniture tile, or null. Occupancy is a claim ledger
   * (mount writes, standUp erases) with LAZY EVICTION: any claim whose
   * holder no longer exists or no longer sits there clears on sight,
   * so death and despawn paths never need to remember the furniture.
   */
  private readonly seatOcc = new Map<string, EntityId>();

  private seatHolder(tx: number, ty: number): EntityId | null {
    const key = `${tx},${ty}`;
    const eid = this.seatOcc.get(key);
    if (eid === undefined) return null;
    const covers = (s: { tiles: Array<{ x: number; y: number }> } | null | undefined): boolean =>
      s != null && s.tiles.some((t) => t.x === tx && t.y === ty);
    if (covers(this.players.get(eid)?.seat)) return eid;
    if (covers(this.routines.get(eid)?.seat)) return eid;
    this.seatOcc.delete(key);
    return null;
  }

  /**
   * Every path out of a rest funnels here: stands the body up, and if
   * it was mounted on furniture, returns it to the walk-up spot and
   * releases the seat. `restore: false` is for teleports and death,
   * where the destination is already someone else's decision.
   */
  private standUp(eid: EntityId, player: PlayerComp, pos: PositionComp, restore = true): void {
    player.sitting = false;
    player.lying = false;
    const seat = player.seat;
    if (!seat) return;
    player.seat = null;
    this.releaseSeat(eid, seat, restore ? pos : null);
  }

  /**
   * The steady foot multiplier: buffs × fleet_footed × gear stride.
   * Frame-local factors (draw slow, chill, cast freeze, wade) stay
   * OUT — the client re-derives those per frame, so only this number
   * needs mirroring for prediction to agree (S2CRide).
   */
  private footSpeedMult(player: PlayerComp): number {
    let mult = 1;
    for (const b of player.buffs) mult *= b.speedMult;
    if (this.hasPassive(player, 'fleet_footed')) mult *= 1.08;
    mult *= player.gear.speedMult; // plate drags, leather springs
    return mult;
  }

  /** The one steady multiplier: THE SADDLE OUTRANKS THE SOLES. */
  private steadySpeedMult(player: PlayerComp): number {
    const mount = player.mountId ? (mountDef(player.mountId)?.speedMult ?? null) : null;
    return rideSpeedMult(mount, this.footSpeedMult(player));
  }

  /**
   * THE PREDICTOR LEARNS ITS LEGS: mirror saddle state + steady mult
   * to the own client whenever either changes. Called every tick from
   * the input pass — the signature check makes the steady state free.
   */
  private sendRide(player: PlayerComp): void {
    const mult = this.steadySpeedMult(player);
    const sig = `${player.mountId ?? ''}|${mult.toFixed(4)}|${player.mountsOwned.size}`;
    if (sig === player.rideSigSent) return;
    player.rideSigSent = sig;
    player.session?.sendJson({
      t: 'ride',
      mount: player.mountId,
      mult,
      owned: [...player.mountsOwned],
    });
  }

  /**
   * The whistle answers once: step down if riding, otherwise call the
   * chosen beast. Mounting is a deed — it stands the body out of any
   * seat or crouch first — and dungeon ground refuses the saddle.
   */
  private mountToggle(eid: EntityId, player: PlayerComp, pos: PositionComp): void {
    if (player.mountId) {
      this.dismount(eid, player);
      return;
    }
    const id = player.mountChosen;
    if (!id || !player.mountsOwned.has(id) || !mountDef(id)) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'You have no mount to call.',
      });
      return;
    }
    // The whole underground refuses the saddle: the dark band (the
    // Undercroft, the delve galleries) as much as the far dungeon
    // slots. Beasts do not go down the stairs. UNDERGROUND_Y covers
    // both bands (512 <= 8192).
    if (pos.y >= UNDERGROUND_Y) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'No room to ride down here.',
      });
      return;
    }
    this.standUp(eid, player, pos);
    player.mountId = id;
    resetCombo(player.combo); // the saddle is a rest note, not a beat
    player.pendingStrike = null;
    this.broadcastMetaUpdate(eid);
    this.sendRide(player);
  }

  /** Boots on the ground. Safe no-op afoot, so every yield site may call it. */
  private dismount(eid: EntityId, player: PlayerComp): void {
    if (!player.mountId) return;
    player.mountId = null;
    this.broadcastMetaUpdate(eid);
    this.sendRide(player);
  }

  /**
   * Erase a seat claim and, when `pos` is given, put the body back on
   * standing ground: the remembered walk-up spot, or (if the world
   * changed under it) the first open neighbor of the furniture.
   */
  private releaseSeat(
    eid: EntityId,
    seat: { tiles: Array<{ x: number; y: number }>; retX: number; retY: number },
    pos: PositionComp | null,
  ): void {
    for (const t of seat.tiles) {
      const key = `${t.x},${t.y}`;
      if (this.seatOcc.get(key) === eid) this.seatOcc.delete(key);
    }
    if (!pos) return;
    if (!circleHitsSolid(this.world, seat.retX, seat.retY, 0.35)) {
      pos.x = seat.retX;
      pos.y = seat.retY;
    } else {
      const cx = Math.floor(pos.x);
      const cy = Math.floor(pos.y);
      const steps = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [-1, 1], [1, -1], [-1, -1],
      ];
      for (const [dx, dy] of steps) {
        if (!this.world.isSolid(cx + dx!, cy + dy!)) {
          pos.x = cx + dx! + 0.5;
          pos.y = cy + dy! + 0.5;
          break;
        }
      }
    }
    this.updateChunkMembership(eid);
  }

  /**
   * Mount the furniture under a routine rest stop, if any stands
   * free. The body remembers its walk-up stand and settles onto the
   * seat anchor; beds impose the lie axis, seats take the authored
   * facing when one was written, else the seat's own.
   */
  private routineMount(
    eid: EntityId,
    rc: RoutineComp,
    pos: PositionComp,
    dir: number | undefined,
  ): void {
    const spec = seatAt(
      (x, y) => this.world.groundAt(x, y),
      Math.floor(rc.targetX),
      Math.floor(rc.targetY),
    );
    if (!spec) return;
    for (const t of spec.tiles) {
      const holder = this.seatHolder(t.x, t.y);
      // Taken (a player on the King's throne!) — rest on foot beside.
      if (holder !== null && holder !== eid) return;
    }
    // The furniture's own geometry outranks the authored facing: a
    // chair's backrest and a bed's axis are painted facts. Only a
    // free-standing bench lets the author (or the walk-up side) pick
    // which long side to face, snapped to the two honest facings.
    const face =
      spec.kind === 'bench' && !spec.fixed
        ? dir !== undefined
          ? Math.sin(dir) < 0
            ? -Math.PI / 2
            : Math.PI / 2
          : pickSeatDir(spec, pos.x, pos.y)
        : spec.dir;
    rc.seat = {
      tiles: spec.tiles,
      retX: pos.x,
      retY: pos.y,
      dir: face,
      lie: spec.pose === 'lie',
    };
    for (const t of spec.tiles) this.seatOcc.set(`${t.x},${t.y}`, eid);
    pos.x = spec.ax;
    pos.y = spec.ay;
    pos.dir = face;
    this.updateChunkMembership(eid);
  }

  /** The routine walker's standUp — seat released, legs get the ground back. */
  private routineDismount(eid: EntityId, rc: RoutineComp, pos: PositionComp): void {
    const seat = rc.seat;
    if (!seat) return;
    rc.seat = null;
    this.releaseSeat(eid, seat, pos);
  }

  /**
   * Furniture answers the interact: chairs, benches, and thrones seat
   * the body; a bed lays it down (and lying in a fresh bed claims it
   * as home). The body moves ONTO the seat's anchor so the paint and
   * the pose agree; any deliberate act afterward stands it back up at
   * the spot it walked in from.
   */
  private interactSeat(
    eid: EntityId,
    player: PlayerComp,
    pos: PositionComp,
    tx: number,
    ty: number,
    sys: (text: string) => void,
  ): void {
    const spec = seatAt((x, y) => this.world.groundAt(x, y), tx, ty);
    if (!spec) return;
    // Interacting with the seat you already occupy: your own home bed
    // tends the hearth (THE HEARTH-SIDE DIAL, Frontier Phase 4.3 —
    // warded hearths are never coveted by the raid dice); any other
    // seat simply stands you up.
    const home = player.home;
    const onIt = player.seat?.tiles.some((t) => spec.tiles.some((o) => o.x === t.x && o.y === t.y));
    if (onIt) {
      if (spec.kind === 'bed' && home && spec.tiles.some((t) => t.x === home.x && t.y === home.y)) {
        player.hearthWarded = !player.hearthWarded;
        if (player.characterId > 0) {
          this.accounts.saveHearthWarded(player.characterId, player.hearthWarded);
        }
        sys(
          player.hearthWarded
            ? 'You bank the fire low and ward the hearth. Raiders will not covet this place.'
            : 'You let the hearth blaze bright again. Let them covet; let them come.',
        );
      } else {
        this.standUp(eid, player, pos);
      }
      return;
    }
    // A bed another settler built answers only to its builder.
    if (spec.kind === 'bed') {
      const built = this.world.builtAt(tx, ty);
      if (built && built.owner !== player.characterId) {
        sys('This bed was built by another settler. Only its builder may rest here.');
        return;
      }
    }
    // One body per seat; a bed sleeps one, whole mattress.
    for (const t of spec.tiles) {
      const holder = this.seatHolder(t.x, t.y);
      if (holder !== null && holder !== eid) {
        sys(spec.kind === 'bed' ? 'Someone is already resting here.' : 'The seat is taken.');
        return;
      }
    }
    // Settle in: a running gather or draw lets go, any old seat clears,
    // and the body eases onto the anchor facing the seat's way. A hop
    // from seat to seat keeps the ORIGINAL walk-up spot — the body
    // must never remember a furniture anchor as standing ground.
    const retX = player.seat ? player.seat.retX : pos.x;
    const retY = player.seat ? player.seat.retY : pos.y;
    this.cancelAction(eid, player);
    this.cancelCasting(eid, player); // rest lets the breath go
    player.drawTicks = 0;
    this.standUp(eid, player, pos, false);
    const dir = pickSeatDir(spec, retX, retY);
    player.seat = { tiles: spec.tiles, retX, retY, dir };
    for (const t of spec.tiles) this.seatOcc.set(`${t.x},${t.y}`, eid);
    pos.x = spec.ax;
    pos.y = spec.ay;
    pos.dir = dir;
    this.updateChunkMembership(eid);
    if (spec.pose === 'lie') {
      player.lying = true;
      // Lying in a claimable bed makes it home (town beds are open to
      // all; the builder gate above already spoke for built ones).
      if (!home || !spec.tiles.some((t) => t.x === home.x && t.y === home.y)) {
        player.home = { x: tx, y: ty };
        if (player.characterId > 0) this.accounts.saveHome(player.characterId, tx, ty);
        this.noteHomeChanged(player.characterId, player.home);
        sys(
          'You claim this bed as your home. Defeat wakes you here, and /recall carries you back (10 minute rest between recalls). Touch it again while resting to ward or unward the hearth.',
        );
      }
    } else {
      player.sitting = true;
    }
  }

  /**
   * The open ground beside the claimed bed, or null. A demolished or
   * replaced bed dissolves the claim on the spot — home is the BED,
   * not the coordinates it used to stand on.
   */
  private homeBedside(player: PlayerComp): { x: number; y: number } | null {
    const home = player.home;
    if (!home) return null;
    this.world.ensure(Math.floor(home.x / CHUNK_SIZE), Math.floor(home.y / CHUNK_SIZE));
    if (this.world.groundAt(home.x, home.y) !== Tile.Bed) {
      player.home = null;
      if (player.characterId > 0) this.accounts.clearHome(player.characterId);
      this.noteHomeChanged(player.characterId, null);
      return null;
    }
    // Cardinals first so you wake square beside the bed, corners as a
    // fallback for tightly furnished rooms.
    const steps = [
      [0, 1], [0, -1], [1, 0], [-1, 0],
      [1, 1], [-1, 1], [1, -1], [-1, -1],
    ];
    for (const [dx, dy] of steps) {
      const bx = home.x + dx!;
      const by = home.y + dy!;
      if (!this.world.isSolid(bx, by)) return { x: bx + 0.5, y: by + 0.5 };
    }
    return null; // walled in on all eight sides — no floor to wake on
  }

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
    const effective = this.cropElapsed(state, now);
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
      // THE WELL'S REACH: a well near the plot turns one hand-watering
      // into a 3x3 bed sweep. Each plot watered pays its own tending
      // XP (THE PLOT PAYS FOR ITS TIME, once per stage behind the
      // watered bit) — the well saves time, never changes the
      // lesson's worth.
      const swept: CropState[] = [];
      if (this.wellNear(tx, ty)) {
        for (let dy = -WELL_SWEEP_RADIUS; dy <= WELL_SWEEP_RADIUS; dy++) {
          for (let dx = -WELL_SWEEP_RADIUS; dx <= WELL_SWEEP_RADIUS; dx++) {
            const near = this.crops.get(`${tx + dx},${ty + dy}`);
            if (near && this.waterCrop(near, now)) swept.push(near);
          }
        }
      } else if (this.waterCrop(state, now)) {
        swept.push(state);
      }
      if (swept.length > 0) {
        for (const c of swept) this.grantXp(eid, player, 'farming', Math.ceil(c.def.xp / 10));
        sys(
          swept.length > 1
            ? `You draw from the well and water ${swept.length} beds.`
            : `You water the ${state.def.name.toLowerCase()}. It perks up.`,
        );
        return;
      }
    }
    const minsLeft = Math.max(1, Math.ceil((growMs(state.def) - effective) / 60_000));
    sys(
      state.watered & bit
        ? `The ${state.def.name.toLowerCase()} is well watered — about ${minsLeft} min to go.`
        : `The ${state.def.name.toLowerCase()} is still growing — about ${minsLeft} min to go.`,
    );
  }

  // ---------------------------------------------- the living soil

  /** Persist one crop row whole (every care fact rides every write). */
  private saveCrop(state: CropState): void {
    this.accounts.upsertCrop(
      state.tx,
      state.ty,
      state.def.id,
      state.plantedAt,
      state.boostMs,
      state.watered,
      state.owner,
      state.soil,
      state.mulched,
      state.framed,
      state.cycles,
    );
  }

  /** THE ONE CARE MIRROR: every session hears a field's facts change. */
  private mirrorPlot(state: CropState): void {
    const info = {
      tx: state.tx,
      ty: state.ty,
      w: state.watered,
      soil: state.soil,
      m: state.mulched,
      f: state.framed,
    };
    for (const s of this.sessions) s.sendJson({ t: 'farm', plots: [info] });
  }

  private mirrorBin(bin: FarmBinState): void {
    const info = {
      tx: bin.tx,
      ty: bin.ty,
      fill: bin.fill,
      graded: bin.graded,
      readyAt: bin.startedAt === 0 ? 0 : bin.startedAt + COMPOST_MINUTES * 60_000,
    };
    for (const s of this.sessions) s.sendJson({ t: 'farm', bins: [info] });
  }

  /** The whole farm's care facts, for a fresh session. */
  private sendFarm(session: Session): void {
    const plots = [...this.crops.values()]
      .filter((c) => c.watered !== 0 || c.soil !== 0 || c.mulched !== 0 || c.framed !== 0)
      .map((c) => ({ tx: c.tx, ty: c.ty, w: c.watered, soil: c.soil, m: c.mulched, f: c.framed }));
    const bins = [...this.farmBins.values()].map((b) => ({
      tx: b.tx,
      ty: b.ty,
      fill: b.fill,
      graded: b.graded,
      readyAt: b.startedAt === 0 ? 0 : b.startedAt + COMPOST_MINUTES * 60_000,
    }));
    const troughs = [...this.farmTroughs.values()].map((t) => ({
      tx: t.tx,
      ty: t.ty,
      feed: t.feed,
    }));
    const jobs = [...this.farmJobs.values()]
      .filter((j) => j.qty > 0)
      .map((j) => ({ tx: j.tx, ty: j.ty, recipe: j.recipe, qty: j.qty, startedAt: j.startedAt, grade: j.grade }));
    const apiaries = [...this.farmApiaries.values()].map((a) => ({ tx: a.tx, ty: a.ty, since: a.since }));
    if (plots.length > 0 || bins.length > 0 || troughs.length > 0 || jobs.length > 0 || apiaries.length > 0) {
      session.sendJson({ t: 'farm', plots, bins, troughs, jobs, apiaries });
    }
  }

  /**
   * Apply one watering to a growing crop's CURRENT stage: sets the
   * stage's watered bit and credits 35% of the stage's remainder.
   * Pays no XP itself — hand-watering pays at its call site, the fed
   * channel deliberately never does (the automation law).
   */
  private waterCrop(state: CropState, now: number): boolean {
    // The dark bed drinks nothing (shade culture keeps its own law).
    if (state.def.bed === 'log') return false;
    const effective = this.cropElapsed(state, now);
    const stage = stageForElapsed(state.def, effective);
    if (stage === 2) return false;
    const bit = 1 << stage;
    if (state.watered & bit) return false;
    const stageEnd = stageEndMs(state.def, stage as 0 | 1);
    state.watered |= bit;
    state.boostMs += Math.max(0, Math.round((stageEnd - effective) * 0.35));
    this.saveCrop(state);
    this.mirrorPlot(state);
    return true;
  }

  /** Is a well standing within range (chebyshev) of this tile? */
  private wellNear(tx: number, ty: number, range: number = WELL_SWEEP_RANGE): boolean {
    // Warm the corner chunks so a well across a seam still answers.
    for (const [cx, cy] of [
      [tx - range, ty - range],
      [tx + range, ty - range],
      [tx - range, ty + range],
      [tx + range, ty + range],
    ]) {
      this.world.ensure(Math.floor(cx! / CHUNK_SIZE), Math.floor(cy! / CHUNK_SIZE));
    }
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (this.world.groundAt(tx + dx, ty + dy) === Tile.Well) return true;
      }
    }
    return false;
  }

  /**
   * THE FED CHANNEL: is this plot beside a live irrigation channel
   * (adjacent channel tile with a well within its feed range)?
   */
  private irrigatedAt(tx: number, ty: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.world.groundAt(tx + dx, ty + dy) !== Tile.IrrigationChannel) continue;
        if (this.wellNear(tx + dx, ty + dy, CHANNEL_FEED_RANGE)) return true;
      }
    }
    return false;
  }

  /**
   * Work compost into a planted crop's soil. One tier per act: plain
   * compost enriches plain ground; prime compost makes any ground
   * rich. Deterministic, once each — never a repeatable faucet.
   */
  fertilize(eid: EntityId, tx: number, ty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (player.characterId < 0) {
      sys('Guests cannot tend crops. Make an account!');
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return;
    const state = this.crops.get(`${tx},${ty}`);
    if (!state) {
      if (this.world.groundAt(tx, ty) === Tile.Tilled) {
        sys('Plant first. The soil takes its meal through roots.');
      }
      return;
    }
    if (state.def.bed === 'log') {
      sys('The log asks for shade, nothing more.');
      return;
    }
    const stage = stageForElapsed(state.def, this.cropElapsed(state, Date.now()));
    if (stage === 2) {
      sys('It has grown all it will. Harvest it.');
      return;
    }
    if (state.soil >= SOIL_RICH) {
      sys('The soil is as rich as it gets.');
      return;
    }
    // Plain compost lifts plain ground; prime compost makes any
    // ground rich outright. The cheaper meal is spent first so a
    // carried prime barrow is never wasted on a half step.
    if (state.soil < SOIL_ENRICHED && removeItem(player.inventory, 'compost', 1) === 1) {
      state.soil = SOIL_ENRICHED;
      sys('You work compost into the soil.');
    } else if (removeItem(player.inventory, 'prime_compost', 1) === 1) {
      state.soil = SOIL_RICH;
      sys('You work prime compost in. The ground turns dark and willing.');
    } else {
      sys(
        state.soil >= SOIL_ENRICHED
          ? 'Only prime compost can better this ground.'
          : 'You need compost in your pack.',
      );
      return;
    }
    // THE PLOT PAYS FOR ITS TIME: tending pays a tenth, same as water.
    this.grantXp(eid, player, 'farming', Math.ceil(state.def.xp / 10));
    this.saveCrop(state);
    this.mirrorPlot(state);
    player.session.sendJson({ t: 'inv', slots: player.inventory });
  }

  /** Lay a fibre blanket around a growing crop. Once per planting. */
  mulch(eid: EntityId, tx: number, ty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (player.characterId < 0) {
      sys('Guests cannot tend crops. Make an account!');
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return;
    const state = this.crops.get(`${tx},${ty}`);
    if (!state) return;
    if (state.def.bed === 'log') {
      sys('The log asks for shade, nothing more.');
      return;
    }
    const stage = stageForElapsed(state.def, this.cropElapsed(state, Date.now()));
    if (stage === 2) {
      sys('It has grown all it will. Harvest it.');
      return;
    }
    if (state.mulched) {
      sys('A mulch blanket already lies here.');
      return;
    }
    // Count BEFORE removing: removeItem takes what it can, and a
    // short pack must not lose its last strand to a refusal.
    if (countItem(player.inventory, 'plant_fibre') < MULCH_FIBRE_COST) {
      sys('Mulch wants plant fibre. Two strands to a blanket.');
      return;
    }
    removeItem(player.inventory, 'plant_fibre', MULCH_FIBRE_COST);
    state.mulched = 1;
    this.grantXp(eid, player, 'farming', Math.ceil(state.def.xp / 10));
    this.saveCrop(state);
    this.mirrorPlot(state);
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    sys('You lay a fibre blanket around the stems.');
  }

  /**
   * THE ORCHARD'S KNIFE: cut a recurring crop's deadwood mid-cycle.
   * Costs nothing, pays tending XP, and banks one care point toward
   * the cycle's grade — once per cycle behind its own mask bit.
   */
  prune(eid: EntityId, tx: number, ty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (player.characterId < 0) {
      sys('Guests cannot tend crops. Make an account!');
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return;
    const state = this.crops.get(`${tx},${ty}`);
    if (!state || !state.def.recurring) return;
    const stage = stageForElapsed(state.def, this.cropElapsed(state, Date.now()));
    if (stage === 2) {
      sys('Pick the fruit first. Then the knife.');
      return;
    }
    if (state.watered & PRUNED_BIT) {
      sys('The wood is already clean this season.');
      return;
    }
    state.watered |= PRUNED_BIT;
    this.grantXp(
      eid,
      player,
      'farming',
      Math.ceil(harvestXp(state.def, state.cycles) / 10),
    );
    this.saveCrop(state);
    this.mirrorPlot(state);
    sys('You cut the deadwood away. The tree breathes.');
  }

  // ------------------------------------------------ the larder board

  /**
   * THE LARDER BOARD: the only premium counter. The order is pure
   * content (larderOrder of shop x epoch); the fill is the one fact
   * the server keeps, mirrored so every open shop screen counts down
   * live and the epoch turn wipes the slate by construction.
   */
  private readonly larderFills = new Map<string, { epoch: number; filled: number }>();

  loadLarderFills(rows: Array<{ shop: string; epoch: number; filled: number }>): void {
    for (const row of rows) {
      const cur = this.larderFills.get(row.shop);
      if (!cur || cur.epoch < row.epoch) {
        this.larderFills.set(row.shop, { epoch: row.epoch, filled: row.filled });
      }
    }
  }

  private sendLarder(session: Session): void {
    const fills = [...this.larderFills.entries()].map(([shop, f]) => ({
      shop,
      epoch: f.epoch,
      filled: f.filled,
    }));
    if (fills.length > 0) session.sendJson({ t: 'larder', fills });
  }

  // ---------------------------------------------- the working yard

  /**
   * THE WORKING YARD (farming v2 Phase 4): one wall-clock batch per
   * station tile. No tick owns a job — matured units are a pure
   * function of the clock (workDone), collected incrementally at the
   * interact door. THE BATCH IS AS GOOD AS ITS WEAKEST MEASURE: the
   * loader consumes the highest grades first and records the minimum.
   */
  private readonly farmJobs = new Map<
    string,
    { tx: number; ty: number; recipe: string; qty: number; startedAt: number; grade: number; owner: number }
  >();

  /** The hives, by "tx,ty" — only a clock; flowers do the grading. */
  private readonly farmApiaries = new Map<string, { tx: number; ty: number; since: number }>();

  loadStationJobs(
    rows: Array<{ tx: number; ty: number; recipe: string; qty: number; startedAt: number; grade: number; owner: number }>,
  ): void {
    for (const row of rows) this.farmJobs.set(`${row.tx},${row.ty}`, { ...row });
  }

  loadFarmApiaries(rows: Array<{ tx: number; ty: number; since: number }>): void {
    for (const row of rows) this.farmApiaries.set(`${row.tx},${row.ty}`, { ...row });
  }

  private mirrorJob(job: { tx: number; ty: number; recipe: string; qty: number; startedAt: number; grade: number }): void {
    for (const s of this.sessions) {
      s.sendJson({
        t: 'farm',
        jobs: [{ tx: job.tx, ty: job.ty, recipe: job.recipe, qty: job.qty, startedAt: job.startedAt, grade: job.grade }],
      });
    }
  }

  private mirrorApiary(tx: number, ty: number, since: number): void {
    for (const s of this.sessions) s.sendJson({ t: 'farm', apiaries: [{ tx, ty, since }] });
  }

  /**
   * Load a batch: prove the tile and recipe, gate the level, consume
   * inputs highest-grade-first, and set the clock. Every refusal is
   * spoken; nothing is consumed before the last gate passes.
   */
  workStart(eid: EntityId, tx: number, ty: number, recipeId: string, qty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (player.characterId < 0) {
      sys('Guests cannot work the yard. Make an account!');
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.6 * 2.6) return;
    const ground = this.world.groundAt(tx, ty);
    const station = ground === undefined ? undefined : WORK_STATION_TILES.get(ground as Tile);
    const recipe = WORK_RECIPES.get(recipeId);
    if (!station || !recipe || recipe.station !== station) return;
    const key = `${tx},${ty}`;
    const existing = this.farmJobs.get(key);
    if (existing && existing.qty > 0) {
      sys('The station is already working. Collect first.');
      return;
    }
    const level = this.effectiveLevel(player, recipe.skill);
    if (level < recipe.levelReq) {
      sys(`You need ${recipe.skill} level ${recipe.levelReq} for ${recipe.name.toLowerCase()}.`);
      return;
    }
    const batch = Math.min(qty, WORK_BATCH_CAP);
    // Count first (nothing spent on a refusal): each input unit may
    // be satisfied by any grade of its family.
    const familyCount = (base: string): number => {
      let n = 0;
      for (const s of player.inventory) {
        if (!s || s.stolen) continue;
        if (gradeOf(s.item).base === base) n += s.qty;
      }
      return n;
    };
    for (const input of recipe.inputs) {
      if (familyCount(input.item) < input.qty * batch) {
        sys(`Short of ${itemDef(input.item)?.name.toLowerCase() ?? input.item} for ${batch}.`);
        return;
      }
    }
    // Consume highest grades first; the batch records its weakest.
    let batchGrade: number | null = null;
    for (const input of recipe.inputs) {
      const gradable = GRADED_PRODUCE.has(input.item);
      for (let u = 0; u < input.qty * batch; u++) {
        let taken = -1;
        for (const g of [2, 1, 0] as const) {
          const id = g === 0 ? input.item : gradedId(input.item, g);
          if (removeItem(player.inventory, id, 1) === 1) {
            taken = g;
            break;
          }
        }
        if (taken === -1) return; // raced; counts said otherwise
        if (gradable) batchGrade = batchGrade === null ? taken : Math.min(batchGrade, taken);
      }
    }
    const job = {
      tx,
      ty,
      recipe: recipeId,
      qty: batch,
      startedAt: Date.now(),
      grade: batchGrade ?? 0,
      owner: player.characterId,
    };
    this.farmJobs.set(key, job);
    this.accounts.upsertStationJob(tx, ty, recipeId, batch, job.startedAt, job.grade, job.owner);
    this.mirrorJob(job);
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    sys(`The ${itemDef(recipe.output.item)?.name.toLowerCase() ?? recipe.output.item} work begins. It runs while you wander.`);
  }

  /**
   * The interact door for a working station: hand over whatever has
   * matured (owner only), and let the rest keep working.
   */
  private interactWorkStation(
    eid: EntityId,
    player: PlayerComp,
    tx: number,
    ty: number,
    sys: (text: string) => void,
  ): void {
    const key = `${tx},${ty}`;
    const job = this.farmJobs.get(key);
    if (!job || job.qty <= 0) {
      sys('The station stands idle. Load it and let it work.');
      return;
    }
    const recipe = WORK_RECIPES.get(job.recipe);
    if (!recipe) return;
    if (job.owner !== player.characterId) {
      sys('This batch is another hand\'s work.');
      return;
    }
    const now = Date.now();
    const done = workDone(recipe, job.startedAt, job.qty, now);
    if (done <= 0) {
      const mins = Math.max(1, Math.ceil((job.startedAt + recipe.minutes * 60_000 - now) / 60_000));
      sys(`The work goes on. About ${mins} min to the next measure.`);
      return;
    }
    const itemId = workOutputId(recipe, job.grade as 0 | 1 | 2);
    for (let i = 0; i < done * recipe.output.qty; i++) {
      if (addItem(player.inventory, itemId, 1) === 0) {
        this.spawnDrop(itemId, 1, tx + 0.5, ty + 0.5, eid);
      }
    }
    this.grantXp(eid, player, recipe.skill, recipe.xp * done);
    job.qty -= done;
    job.startedAt += done * recipe.minutes * 60_000;
    if (job.qty <= 0) {
      this.farmJobs.delete(key);
      this.accounts.deleteStationJob(tx, ty);
      this.mirrorJob({ tx, ty, recipe: job.recipe, qty: 0, startedAt: 0, grade: 0 });
    } else {
      this.accounts.upsertStationJob(tx, ty, job.recipe, job.qty, job.startedAt, job.grade, job.owner);
      this.mirrorJob(job);
    }
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    sys(
      `You collect ${done * recipe.output.qty} ${itemDef(itemId)?.name.toLowerCase() ?? itemId}${job.qty > 0 ? `. ${job.qty} still working.` : '. The station rests.'}`,
    );
  }

  /**
   * THE HIVE: honey and wax on the bees' own clock, graded by the
   * real flowers standing near when you lift the lid.
   */
  private interactApiary(
    eid: EntityId,
    player: PlayerComp,
    tx: number,
    ty: number,
    sys: (text: string) => void,
  ): void {
    if (player.characterId < 0) return;
    const built = this.world.builtAt(tx, ty);
    if (built && built.owner !== player.characterId) {
      sys('These bees answer another keeper.');
      return;
    }
    const key = `${tx},${ty}`;
    const now = Date.now();
    const hive = this.farmApiaries.get(key) ?? { tx, ty, since: now };
    if (!this.farmApiaries.has(key)) {
      // First touch starts the clock (a fresh hive settles in).
      this.farmApiaries.set(key, hive);
      this.accounts.upsertFarmApiary(tx, ty, hive.since);
      this.mirrorApiary(tx, ty, hive.since);
      sys('The bees settle into the new box. Give them time.');
      return;
    }
    const units = Math.min(APIARY_STORE_CAP, Math.floor((now - hive.since) / (APIARY_MINUTES * 60_000)));
    if (units <= 0) {
      const mins = Math.max(1, Math.ceil((hive.since + APIARY_MINUTES * 60_000 - now) / 60_000));
      sys(`The comb is thin yet. About ${mins} min.`);
      return;
    }
    // Count the flowers the bees actually work: flower boxes and the
    // blooming crops (sunflower, moonbell, dawnveil) in the hive's
    // range. World-state only — plant a garden, sweeten the honey.
    let flowers = 0;
    for (let fy = ty - APIARY_FLOWER_RANGE; fy <= ty + APIARY_FLOWER_RANGE; fy++) {
      for (let fx = tx - APIARY_FLOWER_RANGE; fx <= tx + APIARY_FLOWER_RANGE; fx++) {
        const g = this.world.groundAt(fx, fy);
        if (
          g === Tile.FlowerBox ||
          g === Tile.SunflowerMid ||
          g === Tile.SunflowerRipe ||
          g === Tile.MoonbellMid ||
          g === Tile.MoonbellRipe ||
          g === Tile.DawnveilMid ||
          g === Tile.DawnveilRipe
        ) {
          flowers++;
        }
      }
    }
    const grade = apiaryGrade(flowers);
    const honeyId = grade > 0 ? gradedId('honey', grade) : 'honey';
    for (let i = 0; i < units; i++) {
      if (addItem(player.inventory, honeyId, 1) === 0) this.spawnDrop(honeyId, 1, tx + 0.5, ty + 0.5, eid);
      if (addItem(player.inventory, 'beeswax', 1) === 0) this.spawnDrop('beeswax', 1, tx + 0.5, ty + 0.5, eid);
    }
    this.grantXp(eid, player, 'farming', 12 * units);
    hive.since = now;
    this.accounts.upsertFarmApiary(tx, ty, hive.since);
    this.mirrorApiary(tx, ty, hive.since);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    sys(
      grade === 2
        ? 'The comb runs heavy and bright. The garden did this.'
        : grade === 1
          ? 'Good comb, sweetened by the flowers near.'
          : 'You take fair comb. Bees do better beside a garden.',
    );
  }

  // ------------------------------------------ the animals of the yard

  /**
   * THE ANIMALS OF THE YARD (farming v2 Phase 3): kept livestock by
   * entity id. The ROW is the truth (slot-addressed per character,
   * pets' own law); the entity is its standing body, spawned at boot
   * and on release, anchored to a feed trough, alive whether the
   * keeper is or not. Never a pet: no combat, no follow, no heel.
   */
  private readonly livestock = new Map<EntityId, LivestockComp>();

  /** Trough feed by "tx,ty" — the yard's mangers. */
  private readonly farmTroughs = new Map<string, { tx: number; ty: number; feed: number }>();

  loadFarmTroughs(rows: Array<{ tx: number; ty: number; feed: number }>): void {
    for (const row of rows) this.farmTroughs.set(`${row.tx},${row.ty}`, { ...row });
  }

  loadLivestockRows(rows: LivestockRow[]): void {
    for (const row of rows) this.spawnLivestockEntity(row);
  }

  /** Stand a kept animal in the world beside its trough. */
  private spawnLivestockEntity(row: LivestockRow): EntityId | null {
    const def = npcDef(row.species);
    if (!def || !LIVESTOCK.has(row.species)) return null;
    this.world.ensure(Math.floor(row.tx / CHUNK_SIZE), Math.floor(row.ty / CHUNK_SIZE));
    // Scatter the herd on the trough's south apron, dealt by slot so
    // a yard reloads into the same loose arrangement.
    const x = row.tx + 0.5 + ((row.slot % 3) - 1) * 1.2 + ((row.slot * 7) % 5) * 0.1;
    const y = row.ty + 1.6 + Math.floor(row.slot / 3) * 1.1;
    const eid = this.spawnNpc(def, x, y, -1);
    this.livestock.set(eid, {
      row,
      shornShown: row.species === 'sheep' ? row.nextProduceAt > Date.now() : undefined,
    });
    const npc = this.npcs.get(eid);
    if (npc) {
      npc.nextProduceAt = row.nextProduceAt;
      // A kept hen lays for the hand, never the ground: the registry
      // pays at the Gather, so the wild lay clock stays dark.
      npc.nextLayAt = 0;
    }
    return eid;
  }

  /**
   * THE FLEECE TELLS THE TIME — the slow wool clock (~1s beat). A
   * kept sheep's body shows its produce state to every watcher:
   * clipped after the shear, a full cloud once the wool regrows.
   * The shear itself broadcasts at the payout; this sweep carries
   * the regrow (and any dev lever that hurries the clock), speaking
   * on the meta channel only when the state actually flips.
   */
  private tickFleece(now: number): void {
    for (const [stockEid, comp] of this.livestock) {
      if (comp.row.species !== 'sheep') continue;
      const npc = this.npcs.get(stockEid);
      if (!npc) continue;
      const shorn = npc.nextProduceAt > now;
      if (shorn !== (comp.shornShown ?? false)) {
        comp.shornShown = shorn;
        this.broadcastMetaUpdate(stockEid);
      }
    }
  }

  private livestockEidFor(characterId: number, slot: number): EntityId | null {
    for (const [eid, comp] of this.livestock) {
      if (comp.row.characterId === characterId && comp.row.slot === slot) return eid;
    }
    return null;
  }

  /** Rows anchored to one trough (the stock cap's counter). */
  private livestockAtTrough(tx: number, ty: number): number {
    let n = 0;
    for (const comp of this.livestock.values()) {
      if (comp.row.tx === tx && comp.row.ty === ty) n++;
    }
    return n;
  }

  private livestockCountFor(characterId: number): number {
    let n = 0;
    for (const comp of this.livestock.values()) {
      if (comp.row.characterId === characterId) n++;
    }
    return n;
  }

  private mirrorTrough(trough: { tx: number; ty: number; feed: number }): void {
    for (const s of this.sessions) {
      s.sendJson({ t: 'farm', troughs: [{ tx: trough.tx, ty: trough.ty, feed: trough.feed }] });
    }
  }

  /**
   * Release a crated young at the keeper's own trough — the buy's
   * second half (useItem routes crates here, slot-addressed).
   */
  private releaseLivestock(
    eid: EntityId,
    player: PlayerComp,
    slotIndex: number,
    crateId: string,
  ): void {
    const sys = (text: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text });
    const ldef = LIVESTOCK_BY_CRATE.get(crateId)!;
    if (player.characterId < 0) {
      sys('Guests cannot keep animals. Make an account!');
      return;
    }
    const pos = this.positions.get(eid);
    if (!pos) return;
    // The trough within arm's reach that YOU raised is the yard.
    let trough: { tx: number; ty: number } | null = null;
    for (let dy = -2; dy <= 2 && !trough; dy++) {
      for (let dx = -2; dx <= 2 && !trough; dx++) {
        const tx = Math.floor(pos.x) + dx;
        const ty = Math.floor(pos.y) + dy;
        if (this.world.groundAt(tx, ty) !== Tile.FeedTrough) continue;
        const built = this.world.builtAt(tx, ty);
        if (built && built.owner === player.characterId) trough = { tx, ty };
      }
    }
    if (!trough) {
      sys('Release it at your own feed trough. The yard is the animal\'s home.');
      return;
    }
    const level = this.effectiveLevel(player, 'beastcraft');
    if (level < ldef.levelReq) {
      sys(`You need beastcraft level ${ldef.levelReq} to keep a ${ldef.name.toLowerCase()}.`);
      return;
    }
    if (this.livestockCountFor(player.characterId) >= LIVESTOCK_CAP) {
      sys('Your yards are full. Lead one away first.');
      return;
    }
    if (this.livestockAtTrough(trough.tx, trough.ty) >= TROUGH_STOCK_CAP) {
      sys('This trough feeds all it can. Raise another.');
      return;
    }
    // First free slot is the animal's identity forever.
    const used = new Set<number>();
    for (const comp of this.livestock.values()) {
      if (comp.row.characterId === player.characterId) used.add(comp.row.slot);
    }
    let slot = -1;
    for (let i = 0; i < LIVESTOCK_CAP; i++) {
      if (!used.has(i)) {
        slot = i;
        break;
      }
    }
    if (slot === -1) return;
    if (!takeSlot(player.inventory, slotIndex, 1)) return;
    const row: LivestockRow = {
      characterId: player.characterId,
      slot,
      species: ldef.species,
      name: ldef.name,
      tx: trough.tx,
      ty: trough.ty,
      bond: 0,
      brushedAt: 0,
      nextProduceAt: Date.now() + ldef.produce.cooldownSec * 1000,
      bornAt: Date.now(),
    };
    this.accounts.saveLivestock(row);
    this.spawnLivestockEntity(row);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    // The naming card opens on the ceremony — the pet card, reused.
    player.session?.sendJson({ t: 'stockname', slot, species: ldef.species });
    sys(`The ${ldef.name.toLowerCase()} steps into your yard and looks around, deciding things.`);
  }

  /** Name (or re-name) a kept animal — the pet-sanitize law guards it. */
  stockName(eid: EntityId, slot: number, name: string): void {
    const player = this.players.get(eid);
    if (!player || player.characterId < 0) return;
    const clean = sanitizePetName(name);
    if (!clean) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'That name will not stick.' });
      return;
    }
    const stockEid = this.livestockEidFor(player.characterId, slot);
    if (stockEid === null) return;
    const comp = this.livestock.get(stockEid)!;
    comp.row.name = clean;
    this.accounts.saveLivestock(comp.row);
    this.broadcastMetaUpdate(stockEid);
    player.session?.sendJson({ t: 'chat', channel: 'system', text: `${clean} it is.` });
  }

  /**
   * The whole yard conversation, in one cascade: another keeper's
   * animal offers a word of refusal; the lead walks yours away; a
   * ready udder or fleece opens the collect action (the milking
   * rail, reused whole); an open brush window pays the bond; else
   * the animal tells you how it is doing.
   */
  private interactLivestock(
    eid: EntityId,
    player: PlayerComp,
    targetEid: EntityId,
    npc: NpcComp,
    comp: LivestockComp,
    sys: (text: string) => void,
  ): void {
    const row = comp.row;
    const ldef = LIVESTOCK.get(row.species)!;
    if (row.characterId !== player.characterId) {
      sys(`${row.name} belongs to another yard.`);
      return;
    }
    const now = Date.now();
    if (now >= npc.nextProduceAt) {
      if (!hasSpaceFor(player.inventory, ldef.produce.item)) {
        sys('Your pack is full.');
        return;
      }
      const pos = this.positions.get(eid);
      const npos = this.positions.get(targetEid);
      if (!pos || !npos) return;
      if (player.action) this.cancelAction(eid, player);
      const ticks = Math.max(
        GameServer.MIN_GATHER_TICKS,
        Math.round(GameServer.MILK_TICKS / this.gatherSpeedOf(player)),
      );
      player.action = { kind: 'milk', targetEid, ticksLeft: ticks };
      pos.dir = Math.atan2(npos.y - pos.y, npos.x - pos.x);
      npc.holdUntilTick = this.tickCount + ticks + 20;
      this.poses.set(eid, PoseState.Milk);
      player.session?.sendJson({ t: 'action', state: 'start', ticks });
      return;
    }
    if (now - row.brushedAt >= BRUSH_COOLDOWN_MS * player.perks.brushRestMult) {
      row.brushedAt = now;
      if (row.bond < BOND_CAP) row.bond += 1;
      this.accounts.saveLivestock(row);
      this.grantXp(eid, player, 'beastcraft', BRUSH_XP);
      sys(`You brush ${row.name} down. ${row.bond >= BOND_PRIME ? 'It would follow you anywhere it could.' : 'It leans into the strokes.'}`);
      return;
    }
    // THE LEAD WAITS ITS TURN: it fires only when the animal has
    // nothing else to offer — a keeper carrying one can still milk,
    // shear, and brush their own yard (the harness caught the lead
    // eating the first-ever interact; a farewell must never outrank
    // the living work). Half the crate's worth comes back.
    if (countItem(player.inventory, 'drovers_lead') > 0) {
      removeItem(player.inventory, 'drovers_lead', 1);
      const refund = Math.floor((itemDef(ldef.crateItem)?.value ?? 0) / 2);
      if (refund > 0) addItem(player.inventory, 'coins', refund);
      this.accounts.deleteLivestock(row.characterId, row.slot);
      this.livestock.delete(targetEid);
      this.removeFromChunks(targetEid);
      this.ecs.destroy(targetEid);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      sys(`You lead ${row.name} back to the drover trade. The yard is quieter for it.`);
      return;
    }
    const mins = Math.max(1, Math.ceil((npc.nextProduceAt - now) / 60_000));
    sys(`${row.name} is content. Nothing to ${ldef.produce.verb.toLowerCase()} yet (about ${mins} min).`);
  }

  /**
   * Feed one pack slot's item into a compost bin. Slot-addressed; the
   * bin, the worth, and the idle state are all re-proved here.
   */
  compostAdd(eid: EntityId, tx: number, ty: number, slot: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (player.characterId < 0) {
      sys('Guests cannot use the bin. Make an account!');
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return;
    if (this.world.groundAt(tx, ty) !== Tile.CompostBin) return;
    const key = `${tx},${ty}`;
    const bin = this.farmBins.get(key) ?? { tx, ty, fill: 0, graded: 0, startedAt: 0 };
    if (bin.startedAt !== 0) {
      sys(
        Date.now() >= bin.startedAt + COMPOST_MINUTES * 60_000
          ? 'The batch is done. Turn the bin out first.'
          : 'The bin is working. Let it be.',
      );
      return;
    }
    const held = player.inventory[slot];
    if (!held) return;
    if (held.stolen) {
      sys('Not with goods that would burn an honest heap.');
      return;
    }
    const worth = compostWorthOf(held.item, itemDef(held.item));
    if (!worth) {
      sys('That has no place in the bin.');
      return;
    }
    takeSlot(player.inventory, slot, 1);
    bin.fill += worth.worth;
    bin.graded += worth.graded;
    if (bin.fill >= COMPOST_BATCH_WORTH - player.perks.compostDiscount) {
      bin.startedAt = Date.now();
      sys('The lid closes. The heap sets to work.');
    }
    this.farmBins.set(key, bin);
    this.accounts.upsertFarmBin(tx, ty, bin.fill, bin.graded, bin.startedAt);
    this.mirrorBin(bin);
    player.session.sendJson({ t: 'inv', slots: player.inventory });
  }

  /**
   * Load one pack slot's feed into a trough. Anyone may feed a
   * neighbor's manger (the watering law's generosity); the door
   * proves the tile, the worth, and the cap.
   */
  troughAdd(eid: EntityId, tx: number, ty: number, slot: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (player.characterId < 0) {
      sys('Guests cannot tend the yard. Make an account!');
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 2.2 * 2.2) return;
    if (this.world.groundAt(tx, ty) !== Tile.FeedTrough) return;
    const key = `${tx},${ty}`;
    const trough = this.farmTroughs.get(key) ?? { tx, ty, feed: 0 };
    if (trough.feed >= TROUGH_FEED_CAP) {
      sys('The manger is heaped full.');
      return;
    }
    const held = player.inventory[slot];
    if (!held) return;
    if (held.stolen) {
      sys('Not with goods that would sour an honest manger.');
      return;
    }
    const worth = feedWorthOf(held.item, gradeOf, (base) => GRADED_PRODUCE.has(base));
    if (worth === null) {
      sys('The herd has no use for that.');
      return;
    }
    takeSlot(player.inventory, slot, 1);
    trough.feed = Math.min(TROUGH_FEED_CAP, trough.feed + worth);
    this.farmTroughs.set(key, trough);
    this.accounts.upsertFarmTrough(tx, ty, trough.feed);
    this.mirrorTrough(trough);
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    sys('You fill the manger. Somebody noticed immediately.');
  }

  /**
   * Interacting with the bin: turn out a finished batch, or hear how
   * the heap is doing. The batch is a pure wall-clock read — the
   * station worked the whole time you wandered.
   */
  private interactCompostBin(
    eid: EntityId,
    player: PlayerComp,
    tx: number,
    ty: number,
    sys: (text: string) => void,
  ): void {
    const key = `${tx},${ty}`;
    const bin = this.farmBins.get(key);
    if (!bin || (bin.fill === 0 && bin.startedAt === 0)) {
      sys('The bin stands empty. Scraps and spoils feed it.');
      return;
    }
    if (bin.startedAt === 0) {
      sys('The heap wants more before it works.');
      return;
    }
    const readyAt = bin.startedAt + COMPOST_MINUTES * 60_000;
    const now = Date.now();
    if (now < readyAt) {
      const mins = Math.max(1, Math.ceil((readyAt - now) / 60_000));
      sys(`The heap is working. About ${mins} min.`);
      return;
    }
    // Collect: the bin answers its builder (the built tile's owner).
    const built = this.world.builtAt(tx, ty);
    if (built && built.owner !== player.characterId) {
      sys('This bin is not yours to empty.');
      return;
    }
    // GOOD HARVESTS FEED RICHER GROUND: enough graded worth in the
    // batch turns out prime compost — deterministically, never rolled.
    const item = bin.graded >= COMPOST_PRIME_WORTH ? 'prime_compost' : 'compost';
    if (addItem(player.inventory, item, 1) === 0) {
      this.spawnDrop(item, 1, tx + 0.5, ty + 0.5, eid);
    }
    this.grantXp(eid, player, 'farming', COMPOST_COLLECT_XP);
    this.farmBins.delete(key);
    this.accounts.deleteFarmBin(tx, ty);
    const emptied: FarmBinState = { tx, ty, fill: 0, graded: 0, startedAt: 0 };
    this.mirrorBin(emptied);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    sys(
      item === 'prime_compost'
        ? 'You turn out prime compost, black and warm.'
        : 'You turn out a barrow of good compost.',
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
    const ground = this.world.groundAt(tx, ty);
    const key = `${tx},${ty}`;
    if (this.crops.has(key)) return; // someone beat you to the plot
    // THE SOWN LINE (second-growth Phase 4): tree and bush seeds skip
    // the crop rows and join the wild's own growth ledger instead.
    const species = GROWTH_SEEDS.get(seed);
    if (species !== undefined) {
      if (ground !== Tile.Tilled) {
        sys('Wild seeds want open tilled earth.');
        return;
      }
      this.plantWild(eid, player, tx, ty, seed, species, sys);
      return;
    }
    const def = CROP_BY_SEED.get(seed);
    if (!def) return;
    // THE BED LAW (Phase 2): tilled-bed crops take a garden plot or a
    // growing frame; the dark bed's spores take only a laid log.
    if (def.bed === 'log') {
      if (ground !== Tile.MushroomLog) {
        sys('Spores want a laid mushroom log.');
        return;
      }
    } else if (ground !== Tile.Tilled && ground !== Tile.GrowingFrame) {
      sys('Seeds need a tilled garden plot.');
      return;
    }
    if (def.recurring && ground === Tile.GrowingFrame) {
      sys('A tree wants open sky, not a frame.');
      return;
    }
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
      soil: 0,
      mulched: 0,
      framed: ground === Tile.GrowingFrame ? 1 : 0,
      cycles: 0,
    };
    const sproutTile = tileForStage(def, 0);
    this.crops.set(key, state);
    this.world.registerCropTile(tx, ty, sproutTile);
    this.saveCrop(state);
    this.setWorldTile(tx, ty, sproutTile);
    if (state.framed) this.mirrorPlot(state);
    this.grantXp(eid, player, 'farming', Math.max(1, Math.ceil(def.xp / 4)));
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    sys(`You plant ${def.name.toLowerCase()}. Ready in about ${def.growMinutes} min.`);
  }

  /**
   * THE SOWN LINE (second-growth Phase 4): a tree or bush seed goes
   * into WILD tilled earth and becomes an owner-stamped ledger row —
   * pre-germinated (the gardener's hand does the germination's work),
   * riding the exact same ages as any wild regrowth from there on.
   * Anyone may harvest what grows; the owner mark means the sown
   * ground keeps germinating inside its planter's own claim ring
   * (the gardener's yard grows for the gardener).
   */
  private plantWild(
    eid: EntityId,
    player: PlayerComp,
    tx: number,
    ty: number,
    seed: string,
    species: Tile,
    sys: (text: string) => void,
  ): void {
    if (this.world.growthDomainAt(tx, ty) !== 'wild') {
      sys('This ground is tended. Wild seeds want wild earth.');
      return;
    }
    if (this.world.growthAt(tx, ty) !== undefined) {
      sys('Something already grows here. Give it room.');
      return;
    }
    if (removeItem(player.inventory, seed, 1) === 0) return;
    // THE SEED TAKES THE PLOT: a garden plot spent on a tree returns
    // to wild earth — otherwise the growth beat would read the plot's
    // built-tile record as a builder's claim and end the very growth
    // it hosted. The plot is the price of the planting.
    if (this.world.builtAt(tx, ty) !== undefined) {
      this.world.unregisterBuilt(tx, ty);
      this.accounts.deleteBuiltTile(tx, ty);
      this.ringCache = null;
    this.capitalCache?.clear();
    }
    const now = Date.now();
    const row: GrowthRow = {
      tx,
      ty,
      tile: species,
      state: GROWTH_BARE,
      since: now,
      due: now + germSproutFor(config.worldSeed, tx, ty, now),
      owner: player.characterId,
      firstSeenAt: now,
    };
    this.world.registerGrowth(row);
    this.accounts.saveGrowth(row);
    this.setWorldTile(tx, ty, Tile.Grass);
    const node = NODES_BY_TILE.get(species);
    this.grantXp(eid, player, 'farming', Math.max(4, Math.ceil((node?.xp ?? 20) / 5)));
    player.session!.sendJson({ t: 'inv', slots: player.inventory });
    sys('You set the seed in the earth. The wild takes it from here.');
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
    // Bounty doubles the basket some seasons; Green Thumb sometimes
    // hands next season back with it.
    let yieldQty = roll(def.yield.min, def.yield.max);
    if (Math.random() < player.perks.doubleHarvestChance) yieldQty *= 2;
    // THE DEEPER SIGIL: the plot answers a yield working the same way
    // the ore seam does.
    yieldQty += this.bodyMoment(eid, player, 'gather', {
      x: action.tx + 0.5,
      y: action.ty + 0.5,
      style: 'farming',
    });
    // THE CARE FOLD: the grade was earned across the planting's whole
    // life — waterings, soil, mulch, and (orchards) the prune — and
    // is decided here, once, deterministically. A graded harvest is
    // its own item id. The dark bed never grades (no care facts).
    const grade =
      def.bed === 'log'
        ? 0
        : gradeFor(
            wateringsOf(state.watered),
            state.soil,
            state.mulched,
            state.watered & PRUNED_BIT ? 1 : 0,
          );
    giveOrDrop(grade > 0 ? gradedId(def.yield.item, grade) : def.yield.item, yieldQty);
    if (grade > 0) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: grade === 2 ? 'A prime harvest. The care shows.' : 'A fine harvest.',
      });
    }
    // THE ORCHARD SHAPE: a recurring crop stands after the pick. Pay
    // the cycle (first pick pays the whole growth), re-aim the clock
    // into the mid stage, reset the cycle's own care bits (water and
    // prune re-earn; soil and mulch feed the STANDING plant), and let
    // the world see the tree again, fruitless and patient.
    if (def.recurring) {
      // The pruned wood sometimes strikes as a new cutting.
      const cuttings = roll(def.seedReturn.min, def.seedReturn.max);
      if (cuttings > 0) giveOrDrop(def.seedItem, cuttings);
      this.grantXp(eid, player, 'farming', harvestXp(def, state.cycles));
      state.cycles += 1;
      state.plantedAt = Date.now();
      state.boostMs = growMs(def) - def.recurring.cooldownMinutes * 60_000;
      state.watered = 0;
      state.lastStage = 1;
      this.crops.set(key, state);
      this.saveCrop(state);
      this.world.registerCropTile(action.tx, action.ty, def.midTile);
      this.setWorldTile(action.tx, action.ty, def.midTile);
      this.mirrorPlot(state);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      this.cancelAction(eid, player, 'done');
      return;
    }
    let seeds = roll(def.seedReturn.min, def.seedReturn.max);
    if (Math.random() < player.perks.seedRefundChance) seeds += 1;
    if (seeds > 0) giveOrDrop(def.seedItem, seeds);
    this.grantXp(eid, player, 'farming', def.xp);

    this.crops.delete(key);
    this.accounts.deleteCrop(action.tx, action.ty);
    this.world.unregisterCropTile(action.tx, action.ty);
    this.setWorldTile(action.tx, action.ty, bedTileFor(def, state.framed === 1));
    // The care mirror lets go of the harvested row.
    for (const s of this.sessions) {
      s.sendJson({ t: 'farm', remove: [{ tx: action.tx, ty: action.ty }] });
    }
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    this.cancelAction(eid, player, 'done');
  }

  /** Advance planted crops; the slow tick calls this every 2s. */
  private tickCrops(now: number): void {
    for (const state of this.crops.values()) {
      // THE FED CHANNEL: a live irrigation line waters the stage on
      // its own, before the stage math so the credit lands the moment
      // the channel can give it. Pays NO XP — the automation law.
      // The watered-bit gate comes first: a slaked stage never pays
      // for the channel scan again. A framed row is ALWAYS watered
      // (the frame's cloth holds the damp in) — same law, no scan.
      {
        const st = stageForElapsed(state.def, this.cropElapsed(state, now));
        if (
          st < 2 &&
          !(state.watered & (1 << st)) &&
          (state.framed === 1 || this.irrigatedAt(state.tx, state.ty))
        ) {
          this.waterCrop(state, now);
        }
      }
      const stage = stageForElapsed(state.def, this.cropElapsed(state, now));
      if (stage > state.lastStage) {
        state.lastStage = stage;
        const tile = tileForStage(state.def, stage);
        this.world.registerCropTile(state.tx, state.ty, tile);
        this.setWorldTile(state.tx, state.ty, tile);
      }
    }
  }

  /**
   * A WILD resource falls (second-growth Phase 1): the scar tile
   * stands, and the harvest is remembered in the persistent growth
   * ledger instead of the respawn queue — the ground now heals on the
   * slow clock, survives restarts, and (from Phase 2) drifts. The
   * checkpoint's `due` is seeded from the pure projection so the lever
   * and the Studio can read an honest deadline without walking.
   */
  private fellWild(tx: number, ty: number, node: NodeDef): void {
    this.setWorldTile(tx, ty, node.depletedTile!);
    const now = Date.now();
    // THE LAND REMEMBERS ITS NATURE: the regrowth AIMS at worldgen's
    // seed-truth, not at what fell — felling a drifted pine over
    // oak-truth re-aims the ground at oak, so drift decays over
    // harvest cycles instead of compounding. A truth of a different
    // dialect (or none) keeps the felled species as the aim.
    const truth = this.world.naturalGround(tx, ty) as Tile;
    const dialect = growthDialectOf(node.tile);
    const aim = growthDialectOf(truth) === dialect ? truth : node.tile;
    // A felled SOWN stand keeps its planter's mark — the orchard
    // remembers whose hand set it, however many times it falls.
    const prior = this.world.growthAt(tx, ty);
    // A picked bush's ground is grass from the first moment — bush
    // rows start DORMANT (succession, no scar age); everything else
    // wears its scar on the fixed window.
    const row: GrowthRow = {
      tx,
      ty,
      tile: aim,
      state: dialect === 'bush' ? GROWTH_BARE : GROWTH_SCAR,
      since: now,
      due: null,
      owner: prior?.owner ?? null,
      firstSeenAt: now,
    };
    if (dialect !== 'bush') row.due = projectGrowth(config.worldSeed, row, now).due;
    this.world.registerGrowth(row);
    this.accounts.saveGrowth(row);
  }

  /**
   * THE GROWTH BEAT (second-growth Phase 1): walk the wild-harvest
   * ledger, project every row against the clock, and land what came
   * due — an age advancing, or the full heal that dissolves the row
   * and lets worldgen's seed-truth stand back up. The projection is
   * the truth and this beat is only its herald: unloaded chunks get
   * the same answer from the ensure() overlay, so a restart needs no
   * catch-up. Budgeted in WRITES (GROWTH.beatBudget), so a clearcut
   * healing after a long sleep lands as a drizzle, never a burst.
   */
  private tickGrowth(now: number): void {
    let writes = 0;
    const seed = config.worldSeed;
    for (const row of this.world.growthLedger.values()) {
      if (writes >= GROWTH.beatBudget) break;
      // A drifted crown is at rest — only an axe moves it again.
      if (row.state === GROWTH_DRIFTED) continue;
      if (row.deferUntil !== undefined && row.deferUntil > now) continue;
      const proj = projectGrowth(seed, row, now);
      if (!proj.ripe && proj.state === row.state) {
        row.due = proj.due; // dial edits re-aim the checkpoint for free
        continue;
      }
      // Something is due. First, the claim guards: a zone that moved
      // in, a built tile, or a crop ends the regrowth — the land
      // yields to the hand that holds it (THE BUILDER'S CLEARING).
      if (
        this.world.growthDomainAt(row.tx, row.ty) !== 'wild' ||
        this.world.builtAt(row.tx, row.ty) !== undefined ||
        this.world.hasCropTile(row.tx, row.ty)
      ) {
        this.world.unregisterGrowth(row.tx, row.ty);
        this.accounts.deleteGrowth(row.tx, row.ty);
        continue;
      }
      const cx = Math.floor(row.tx / CHUNK_SIZE);
      const cy = Math.floor(row.ty / CHUNK_SIZE);
      const loaded = this.world.hasChunk(cx, cy);
      const target = proj.ripe ? row.tile : proj.tile;
      if (loaded) {
        // The world may have moved on under the checkpoint (a chest
        // staged over the scar, a prop burst) — let the row go rather
        // than stomp what stands (the respawn queue's `over` dialect).
        // The ground is OURS if it matches either self-written state:
        // the stored checkpoint's tile, or the projection's (a chunk
        // that generated after a sleep already wears the projected
        // age — the checkpoint just hasn't caught up yet).
        const cur = this.world.groundAt(row.tx, row.ty);
        if (cur !== growthTileForState(seed, row) && cur !== target) {
          this.world.unregisterGrowth(row.tx, row.ty);
          this.accounts.deleteGrowth(row.tx, row.ty);
          continue;
        }
        // Never stand a solid up through a body — the doors' courtesy.
        const becomingSolid =
          TILE_DEFS[target]?.solid && !(cur !== undefined && TILE_DEFS[cur as Tile]?.solid);
        if (becomingSolid && this.bodyOnTile(row.tx, row.ty)) {
          row.deferUntil = now + 5000;
          continue;
        }
      }
      if (proj.ripe) {
        // THE PATIENT STONE / THE QUICK MEADOW: a ripe vein or meadow
        // patch may surface elsewhere in its formation instead of at
        // the old mouth — mining migrates through the mesa, the herb
        // patch wanders the grass.
        const dialect = growthDialectOf(row.tile);
        if ((dialect === 'ore' || dialect === 'forage') && this.maybeWander(row, now)) {
          writes++;
          continue;
        }
        // The resource stands here. Clean heal when it matches
        // worldgen's seed-truth — the deviation ends and the pure land
        // answers from here. A DIFFERENT stand rests as a drifted row:
        // deleting it would resurrect the truth on the next chunk
        // regen, so the row is the stand's memory (THE LAND REMEMBERS
        // ITS NATURE — the next harvest re-aims at truth).
        if (loaded) this.setWorldTile(row.tx, row.ty, row.tile);
        const truth = this.world.naturalGround(row.tx, row.ty) as Tile;
        if (row.tile === truth) {
          this.world.unregisterGrowth(row.tx, row.ty);
          this.accounts.deleteGrowth(row.tx, row.ty);
        } else {
          row.state = GROWTH_DRIFTED;
          row.since = now;
          row.due = null;
          this.accounts.saveGrowth(row);
        }
      } else {
        // An age advances (possibly several at once after a sleep —
        // the projection already walked them; the checkpoint jumps).
        row.state = proj.state;
        row.since = proj.stateSince;
        row.due = proj.due;
        if (loaded) this.setWorldTile(row.tx, row.ty, proj.tile);
        this.accounts.saveGrowth(row);
      }
      writes++;
    }
    this.tickGermination(now);
  }

  /**
   * THE WANDERING VEIN (second-growth Phase 3): a ripe ore or forage
   * row rolls its drift chance — on success the resource SURFACES
   * ELSEWHERE within its reach and the old mouth seals to host ground
   * (plain rock, plain grass). Conservation by construction: exactly
   * one resource moves. Targets prefer HOMING — a sealed mouth whose
   * seed-truth is this very resource — so exposing there cancels a
   * row and the wander decays back toward worldgen's truth over
   * cycles; fresh host ground stands a drifted presence otherwise.
   * Returns true when it handled the ripe row.
   */
  private maybeWander(row: GrowthRow, now: number): boolean {
    const dialect = growthDialectOf(row.tile);
    const host = dialect === null ? null : hostTileFor(dialect);
    if (host === null) return false;
    const chance = dialect === 'ore' ? GROWTH.oreDriftChance : GROWTH.forageDriftChance;
    if (this.growthRand() >= chance) return false;
    const reach = dialect === 'ore' ? GROWTH.oreDriftReach : GROWTH.forageDriftReach;
    // THE CLIFF-FOOT LAW: a vein never drifts across a level change —
    // an ore surfacing one terrace over renders punched through the
    // rock face between them. Levels read through the pristine oracle
    // (naturalLevel), never live elevAt: unloaded space reads 0 there.
    const srcLevel = this.world.naturalLevel(row.tx, row.ty);
    const homing: Array<{ tx: number; ty: number }> = [];
    const fresh: Array<{ tx: number; ty: number }> = [];
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (dx * dx + dy * dy > reach * reach) continue;
        const tx = row.tx + dx;
        const ty = row.ty + dy;
        if (this.world.growthDomainAt(tx, ty) !== 'wild') continue;
        if (this.world.builtAt(tx, ty) !== undefined) continue;
        if (this.world.hasCropTile(tx, ty)) continue;
        if (this.inClaimRing(tx, ty)) continue;
        if (this.world.naturalLevel(tx, ty) !== srcLevel) continue;
        const other = this.world.growthAt(tx, ty);
        const truth = this.world.naturalGround(tx, ty) as Tile;
        if (other) {
          if (other.state === GROWTH_DRIFTED && other.tile === host && truth === row.tile) {
            homing.push({ tx, ty });
          }
          continue;
        }
        if (truth === host) fresh.push({ tx, ty });
      }
    }
    const pool = homing.length > 0 ? homing : fresh;
    if (pool.length === 0) return false;
    // Never surface a solid under a body — walk the pool from a random
    // start until a free candidate answers.
    const start = Math.floor(this.growthRand() * pool.length);
    let target: { tx: number; ty: number } | null = null;
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[(start + i) % pool.length]!;
      const candLoaded = this.world.hasChunk(
        Math.floor(cand.tx / CHUNK_SIZE),
        Math.floor(cand.ty / CHUNK_SIZE),
      );
      if (candLoaded && this.bodyOnTile(cand.tx, cand.ty)) continue;
      target = cand;
      break;
    }
    if (target === null) return false;
    // Surface the resource at the target.
    const targetLoaded = this.world.hasChunk(
      Math.floor(target.tx / CHUNK_SIZE),
      Math.floor(target.ty / CHUNK_SIZE),
    );
    if (this.world.growthAt(target.tx, target.ty) !== undefined) {
      // Homing: the sealed truth-site heals — its row cancels.
      this.world.unregisterGrowth(target.tx, target.ty);
      this.accounts.deleteGrowth(target.tx, target.ty);
    } else {
      const stand: GrowthRow = {
        tx: target.tx,
        ty: target.ty,
        tile: row.tile,
        state: GROWTH_DRIFTED,
        since: now,
        due: null,
        owner: null,
        firstSeenAt: now,
      };
      this.world.registerGrowth(stand);
      this.accounts.saveGrowth(stand);
    }
    if (targetLoaded) this.setWorldTile(target.tx, target.ty, row.tile);
    // Seal the old mouth to host ground.
    const srcLoaded = this.world.hasChunk(
      Math.floor(row.tx / CHUNK_SIZE),
      Math.floor(row.ty / CHUNK_SIZE),
    );
    const srcTruth = this.world.naturalGround(row.tx, row.ty) as Tile;
    if (srcTruth === host) {
      this.world.unregisterGrowth(row.tx, row.ty);
      this.accounts.deleteGrowth(row.tx, row.ty);
    } else {
      row.state = GROWTH_DRIFTED;
      row.tile = host;
      row.since = now;
      row.due = null;
      this.accounts.saveGrowth(row);
    }
    if (srcLoaded) this.setWorldTile(row.tx, row.ty, host);
    return true;
  }

  /** Germination rolls per beat — capacity, not pacing (the pacing
   *  dial is GROWTH.germEveryMinutes; most visits return on the cheap
   *  cadence check long before any world scan). */
  private static readonly GERM_VISITS_PER_BEAT = 8;
  private germCursor = 0;

  /** The one dice throw of the growth engine — a seam the slate tests
   *  can stub. Everything else about germination is pure or guarded. */
  private growthRand(): number {
    return Math.random();
  }

  /**
   * THE LIVING WOOD (second-growth Phase 2): visit dormant bare ground
   * round-robin and roll germination against the STANDING WORLD — the
   * pioneer whisper plus a boost per crown within dispersal reach, so
   * clearcuts heal edge-inward as an emergent wave. A successful roll
   * draws the species (seed-truth by default, a neighbor's crown on
   * the drift chance) and checkpoints the sprout deadline; the pure
   * walk owns everything after that.
   */
  private tickGermination(now: number): void {
    const seed = config.worldSeed;
    const dormant: GrowthRow[] = [];
    for (const row of this.world.growthLedger.values()) {
      if (row.state === GROWTH_BARE && row.due === null) dormant.push(row);
    }
    if (dormant.length === 0) return;
    const visits = Math.min(GameServer.GERM_VISITS_PER_BEAT, dormant.length);
    for (let i = 0; i < visits; i++) {
      this.visitDormant(seed, dormant[(this.germCursor + i) % dormant.length]!, now);
    }
    this.germCursor = (this.germCursor + visits) % 1_000_000_007;
  }

  private visitDormant(seed: number, row: GrowthRow, now: number): void {
    const dialect = growthDialectOf(row.tile);
    // Succession dialects only — trees and bushes germinate against
    // the standing world; ore and forage ride their fixed windows.
    if (dialect !== 'tree' && dialect !== 'bush') return;
    // THE REST FLOOR: the soil recovers before it can take seed.
    const restMs =
      dialect === 'bush'
        ? bushRestFor(seed, row.tx, row.ty, row.firstSeenAt)
        : bareRestFor(seed, row.tx, row.ty, row.firstSeenAt);
    if (now < row.since + restMs) return;
    // The roll cadence — in-memory bookkeeping; a restart re-checks a
    // little early, which is harmless.
    if (
      row.checkedAt !== undefined &&
      now - row.checkedAt < germEveryFor(seed, row.tx, row.ty, row.firstSeenAt)
    ) {
      return;
    }
    row.checkedAt = now;
    // THE BUILDER'S CLEARING: no germination inside a claimed yard and
    // none against built ground or crops (the courtesy ring). The row
    // is NOT dropped — the forest waits at the fence and grows back
    // the day the claim lapses.
    // THE SOWN EXCEPTION: an owner-stamped row germinates inside a
    // claim ring — the gardener's yard grows for the gardener. The
    // built-ground courtesy below still holds for everyone.
    if (row.owner === null && this.inClaimRing(row.tx, row.ty)) return;
    const ring = GROWTH.courtesyRing;
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (this.world.builtAt(row.tx + dx, row.ty + dy) !== undefined) return;
        if (this.world.hasCropTile(row.tx + dx, row.ty + dy)) return;
      }
    }
    // Count the standing sources in dispersal reach: seed-truth stands
    // no ledger row has removed, plus drifted stands — WILD ground
    // only (zone dressing never seeds the open land). Trees count
    // crowns; bushes count bushes; scars, bare ground, and saplings
    // cast no seed yet.
    const isSource = (t: Tile): boolean =>
      dialect === 'bush' ? t === Tile.BerryBush : TREE_TILES.has(t);
    const reach = dialect === 'bush' ? GROWTH.bushReach : GROWTH.sourceReach;
    const crowns: Tile[] = [];
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (dx * dx + dy * dy > reach * reach) continue;
        const tx = row.tx + dx;
        const ty = row.ty + dy;
        const other = this.world.growthAt(tx, ty);
        if (other) {
          if (other.state === GROWTH_DRIFTED && isSource(other.tile)) crowns.push(other.tile);
          continue;
        }
        if (this.world.growthDomainAt(tx, ty) !== 'wild') continue;
        const truth = this.world.naturalGround(tx, ty) as Tile;
        if (isSource(truth)) crowns.push(truth);
      }
    }
    if (this.growthRand() >= germinationChance(crowns.length, dialect)) return;
    if (dialect === 'tree') {
      // THE DISPERSAL DRAW — trees only; a bush is always a bush.
      const truthHere = this.world.naturalGround(row.tx, row.ty) as Tile;
      row.tile = drawSpecies(
        TREE_TILES.has(truthHere) ? truthHere : null,
        crowns,
        this.growthRand(),
        this.growthRand(),
        row.tile,
      );
    }
    row.due = now + germSproutFor(seed, row.tx, row.ty, row.firstSeenAt);
    this.accounts.saveGrowth(row);
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
      if (!canMergeDrop(drop, item, comp.roll, comp.ownerEid, comp.xpOnPickup, comp.stolen)) {
        continue;
      }
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
    // THE RECIPE IS KNOWLEDGE: core is everyone's; the rest must have
    // been learned (trainer scroll or a chest find) before any craft.
    if (recipe.unlock !== 'core' && !player.knownRecipes.has(recipe.id)) {
      sys("You don't know how to make that yet.");
      return;
    }
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
    const craftTicks = this.craftTicks(player, recipe);
    player.action = { kind: 'craft', recipe, remaining: qty, total: qty, ticksLeft: craftTicks };
    this.poses.set(eid, PoseState.Craft);
    player.session.sendJson({
      t: 'action',
      state: 'start',
      ticks: craftTicks,
      recipe: recipe.id,
      made: 0,
      total: qty,
    });
  }

  /** Master Grain and kin: the trade's Calling quickens the bench. */
  private craftTicks(player: PlayerComp, recipe: { skill: SkillId; ticks: number }): number {
    return Math.max(1, Math.round(recipe.ticks * (player.perks.craftSpeed[recipe.skill] ?? 1)));
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
    // THE CRAFT NEVER EATS ITSELF. The inputs come out of the pack on
    // the next line, and until now nothing checked that the RESULT
    // would fit: a full pack silently destroyed both the materials and
    // the thing they made.
    //
    // It has always been possible (every crafted weapon and every piece
    // of armor is non-stackable) and it became easy the day inscriptions
    // stopped stacking, because a scroll can no longer fold into a
    // stack that is already there. Checked before anything is consumed,
    // and refused out loud.
    if (!hasSpaceFor(player.inventory, recipe.output.item)) {
      this.cancelAction(eid, player, 'full');
      return;
    }
    for (const input of recipe.inputs) removeItem(player.inventory, input.item, input.qty);
    // Sparing Hammer / Clean Grain / Fine Seams / Salvager / Dust
    // Thrift: the trade's Calling sometimes hands one input back.
    const saveChance = player.perks.materialSave[recipe.skill] ?? 0;
    if (saveChance > 0 && recipe.inputs.length > 0 && Math.random() < saveChance) {
      const spared = recipe.inputs[Math.floor(Math.random() * recipe.inputs.length)]!;
      addItem(player.inventory, spared.item, 1);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Your craft spares a ${itemDef(spared.item)?.name ?? spared.item}.`,
      });
    }

    const level = this.effectiveLevel(player, recipe.skill);
    // Seasoned Palate scales what remains after skill has done its part.
    const burnChance = recipe.burnChance
      ? Math.max(0, recipe.burnChance - (level - recipe.levelReq) * 0.015) *
        player.perks.burnChanceMult
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
            text: `Your hands outdo themselves: a ${rar} ${instanceName(recipe.output.item, roll)}!`,
          });
        }
      } else if (itemDef(recipe.output.item)?.enchant) {
        // THE ENCHANTER'S HAND: an inscription carries the mark of the
        // hand that made it. Quality is MASTERY over this particular
        // work, not absolute level, so a master's entry scrolls run
        // perfect and their first masterwork comes out honest.
        const q = inscriptionQuality(level, recipe.levelReq, player.perks.inscribeQuality);
        for (let i = 0; i < recipe.output.qty; i++) {
          addItem(player.inventory, recipe.output.item, 1, { rar: 'common', seed: 0, q });
        }
        if (q >= 105) {
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `The sigils settle true. A ${qualityWord(q)} inscription, ${q} on the mark.`,
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
      const nextTicks = this.craftTicks(player, recipe);
      action.ticksLeft = nextTicks;
      player.session?.sendJson({
        t: 'action',
        state: 'start',
        ticks: nextTicks,
        recipe: recipe.id,
        made: action.total - action.remaining,
        total: action.total,
      });
    } else {
      this.cancelAction(eid, player, 'done');
    }
  }

  // ------------------------------------------------------ construction

  build(eid: EntityId, buildableId: string, tx: number, ty: number, orient?: BuildOrient, dye?: number): void {
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
    // Homesteader: walls rise quickly for the practiced hand.
    const buildTicks = Math.max(1, Math.round(def.ticks * player.perks.buildSpeedMult));
    // The variant dial (dye / trade motif / vine species) rides the
    // one wire field, sanitized to the roster width; families with
    // narrower rosters re-clamp in hangVariant.
    const variant =
      Number.isInteger(dye) && dye! >= 0 && dye! < DYE_COUNT ? dye : undefined;

    // THE WALL TAKES A HANGING: a detail def aims at the WALL itself —
    // no ground lane, no occupancy (nobody stands inside a wall). The
    // face law is the one gate, and re-dressing your own hanging of
    // the same family costs only the new pigment: the cloth is up.
    if (def.detail !== undefined) {
      if (!this.hangFaceOk(tx, ty)) {
        sys('There is no wall face there to carry it.');
        return;
      }
      const current = this.world.detailAt(tx, ty);
      const hung = this.world.builtDetailAt(tx, ty);
      if (current !== 0 && (!hung || hung.owner !== player.characterId)) {
        sys('That wall already bears its cloth.');
        return;
      }
      const kind = wallHungInfo(def.detail)!.kind;
      const redye =
        !!hung &&
        hung.owner === player.characterId &&
        wallHungInfo(hung.detail)?.kind === kind;
      const pigment =
        (kind === 'banner' || kind === 'pennant') && variant !== undefined && variant > 0
          ? DYE_PIGMENTS[variant]
          : null;
      if (!redye && !def.materials.every((m) => countItem(player.inventory, m.item) >= m.qty)) {
        sys("You don't have the materials.");
        return;
      }
      if (pigment && countItem(player.inventory, pigment.item) < pigment.qty) {
        sys(
          `That dye wants ${pigment.qty} ${(itemDef(pigment.item)?.name ?? pigment.item).toLowerCase()}.`,
        );
        return;
      }
      player.action = { kind: 'build', buildable: def, tx, ty, ticksLeft: buildTicks, dye: variant };
      this.poses.set(eid, PoseState.Gather);
      player.session.sendJson({ t: 'action', state: 'start', ticks: buildTicks });
      return;
    }

    const pieceTile = def.tile;
    if (pieceTile === undefined) return;
    const ground = this.world.groundAt(tx, ty);
    if (ground === undefined || !buildableGround(def).includes(ground as Tile)) {
      sys("You can't build there.");
      return;
    }
    // Nobody standing on the target tile.
    if (this.tileHoldsBody(tx, ty)) {
      sys('Someone is in the way.');
      return;
    }
    // THE OUTWARD FACE: an awning bolts to the wall behind it — the
    // footing is the tile NORTH of the canopy, and only a framed
    // south face (full wall, glazing, straight doorway) takes bolts.
    if (awningInfo(pieceTile) !== null) {
      const host = this.world.groundAt(tx, ty - 1);
      if (host === undefined || !AWNING_HOST_TILES.has(host as Tile)) {
        sys('An awning needs a wall behind it.');
        return;
      }
    }
    if (!def.materials.every((m) => countItem(player.inventory, m.item) >= m.qty)) {
      sys("You don't have the materials.");
      return;
    }

    // The orient dial only turns pieces that HAVE a dial — anything
    // else silently drops it (a stale client can't skew a bed).
    const orientable =
      diagWallInfo(pieceTile) !== null || pieceTile === Tile.FenceDiagNE ? orient : undefined;
    // THE DYE LAW's dial: only a dyeable piece keeps it (a stale
    // client can't tint a bed). The banner pole joined the family in
    // Phase 4 — a builder's pole flies the cloth they chose.
    const dyed =
      awningInfo(pieceTile) !== null || pieceTile === Tile.BannerPole ? variant : undefined;
    // The pigment is paid beside the materials (DYE_PIGMENTS): a dye
    // is foraged color, not a free menu. Linen (0/absent) asks nothing.
    const pigment = dyed !== undefined ? DYE_PIGMENTS[dyed] : null;
    if (pigment && countItem(player.inventory, pigment.item) < pigment.qty) {
      sys(
        `That dye wants ${pigment.qty} ${(itemDef(pigment.item)?.name ?? pigment.item).toLowerCase()}.`,
      );
      return;
    }
    player.action = { kind: 'build', buildable: def, tx, ty, ticksLeft: buildTicks, orient: orientable, dye: dyed };
    this.poses.set(eid, PoseState.Gather);
    player.session.sendJson({ t: 'action', state: 'start', ticks: buildTicks });
  }

  /**
   * THE HANGING LAW's face test, shared by the dev lever, the build
   * lane, and completion re-validation: a hangable wall (one whose
   * painter dresses faces) presenting its south face to open ground.
   */
  private hangFaceOk(tx: number, ty: number): boolean {
    const ground = this.world.groundAt(tx, ty);
    const south = this.world.groundAt(tx, ty + 1);
    return (
      ground !== undefined &&
      HANGABLE_WALL_TILES.has(ground as Tile) &&
      (south === undefined ||
        (!WALL_RUN_TILES.includes(south as Tile) && !GARRISON_TILES.has(south as Tile)))
    );
  }

  /**
   * Resolve a hanging def's anchor + the variant dial into the banded
   * detail id. Families with rosters narrower than the dye band
   * (motifs 8, species 3) clamp to their anchor rather than throwing —
   * the dial was sanitized to the WIDEST roster upstream.
   */
  private hangVariant(anchor: Detail, variant: number | undefined): Detail {
    const info = wallHungInfo(anchor);
    if (!info || variant === undefined || variant <= 0) return anchor;
    switch (info.kind) {
      case 'banner':
        return wallBannerDetail(variant);
      case 'pennant':
        return pennantDetail(variant);
      case 'sign':
        return variant < SIGN_MOTIF_COUNT ? bracketSignDetail(variant) : anchor;
      case 'trellis':
        return variant < TRELLIS_SPECIES_COUNT ? trellisDetail(variant) : anchor;
      default:
        return anchor;
    }
  }

  /** Anyone — player or NPC — standing on this tile right now? */
  private tileHoldsBody(tx: number, ty: number): boolean {
    const chunkSet = this.chunks.get(this.chunkKeyOf(tx + 0.5, ty + 0.5));
    if (!chunkSet) return false;
    for (const other of chunkSet) {
      const opos = this.positions.get(other);
      if (opos && Math.floor(opos.x) === tx && Math.floor(opos.y) === ty) return true;
    }
    return false;
  }

  private tickBuild(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as BuildAction;
    if (--action.ticksLeft > 0) return;
    const def = action.buildable;

    // THE WALL TAKES A HANGING — completion, one lane over: the face
    // may have fallen or been dressed mid-swing, so everything
    // re-proves before the detail lands. Re-dyeing your own hanging
    // of the same family pays pigment only and earns NO xp (a
    // pigment-cheap swap must never become an xp faucet).
    if (def.detail !== undefined) {
      if (!this.hangFaceOk(action.tx, action.ty)) {
        this.cancelAction(eid, player, 'blocked');
        return;
      }
      const current = this.world.detailAt(action.tx, action.ty);
      const hung = this.world.builtDetailAt(action.tx, action.ty);
      if (current !== 0 && (!hung || hung.owner !== player.characterId)) {
        this.cancelAction(eid, player, 'blocked');
        return;
      }
      const kind = wallHungInfo(def.detail)!.kind;
      const redye =
        !!hung &&
        hung.owner === player.characterId &&
        wallHungInfo(hung.detail)?.kind === kind;
      const pigment =
        (kind === 'banner' || kind === 'pennant') && action.dye !== undefined && action.dye > 0
          ? DYE_PIGMENTS[action.dye]
          : null;
      if (!redye && !def.materials.every((m) => countItem(player.inventory, m.item) >= m.qty)) {
        this.cancelAction(eid, player, 'materials');
        return;
      }
      if (pigment && countItem(player.inventory, pigment.item) < pigment.qty) {
        this.cancelAction(eid, player, 'materials');
        return;
      }
      if (!redye) for (const m of def.materials) removeItem(player.inventory, m.item, m.qty);
      if (pigment) removeItem(player.inventory, pigment.item, pigment.qty);
      const placedDetail = this.hangVariant(def.detail, action.dye);
      // The layer law, detail lane: the FIRST hang's capture carries.
      const prevDetail = hung ? hung.prevDetail : current;
      this.world.registerBuiltDetail(
        action.tx,
        action.ty,
        placedDetail,
        player.characterId,
        prevDetail,
      );
      this.accounts.saveBuiltDetail(action.tx, action.ty, placedDetail, player.characterId, prevDetail);
      this.setWorldDetail(action.tx, action.ty, placedDetail);
      if (!redye) this.grantXp(eid, player, def.skill ?? 'construction', def.xp);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      this.cancelAction(eid, player, 'done');
      return;
    }

    // Final re-validation before mutating the world.
    const pieceTile = def.tile;
    if (pieceTile === undefined) {
      this.cancelAction(eid, player, 'blocked');
      return;
    }
    const ground = this.world.groundAt(action.tx, action.ty);
    if (ground === undefined || !buildableGround(def).includes(ground as Tile)) {
      this.cancelAction(eid, player, 'blocked');
      return;
    }
    // Someone may have wandered onto the tile during the swing — the
    // start-time check alone would finish the wall on top of them.
    if (this.tileHoldsBody(action.tx, action.ty)) {
      this.cancelAction(eid, player, 'occupied');
      return;
    }
    // The host wall may have fallen mid-swing — a canopy bolted to
    // open air is not a thing this world contains.
    if (awningInfo(pieceTile) !== null) {
      const host = this.world.groundAt(action.tx, action.ty - 1);
      if (host === undefined || !AWNING_HOST_TILES.has(host as Tile)) {
        this.cancelAction(eid, player, 'blocked');
        return;
      }
    }
    const pigment = action.dye !== undefined ? DYE_PIGMENTS[action.dye] : null;
    if (!def.materials.every((m) => countItem(player.inventory, m.item) >= m.qty)) {
      this.cancelAction(eid, player, 'materials');
      return;
    }
    if (pigment && countItem(player.inventory, pigment.item) < pigment.qty) {
      this.cancelAction(eid, player, 'materials');
      return;
    }
    for (const m of def.materials) removeItem(player.inventory, m.item, m.qty);
    // The dye is spent color: consumed with the materials, never
    // salvaged back (demolish refunds ceil-half of the PIECE only).
    if (pigment) removeItem(player.inventory, pigment.item, pigment.qty);
    // Salvager: the builder's Calling sometimes hands one piece back.
    const buildSave = player.perks.materialSave[def.skill ?? 'construction'] ?? 0;
    if (buildSave > 0 && def.materials.length > 0 && Math.random() < buildSave) {
      const spared = def.materials[Math.floor(Math.random() * def.materials.length)]!;
      addItem(player.inventory, spared.item, 1);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Your build spares a ${itemDef(spared.item)?.name ?? spared.item}.`,
      });
    }

    // A diagonal wall corner auto-orients to span the two
    // perpendicular wall neighbours present right now — the builder
    // raises the adjoining runs first, then cuts the corner.
    let placed = pieceTile;
    const dw = diagWallInfo(pieceTile);
    if (dw) {
      if (action.orient) {
        // THE TRUE GHOST's dial: the player chose the mass — the
        // ghost's triangle IS the tile that lands, no guessing.
        placed = diagWallTile(dw.material, action.orient);
      } else {
        // THE SEPARATE-MASONRY LAW: a garrison corner spans garrison
        // neighbours, a building corner spans building-wall neighbours
        // — the two families never orient off each other.
        const isWall = (x: number, y: number): boolean => {
          const t = this.world.groundAt(x, y);
          if (t === undefined) return false;
          return dw.material === 'garrison'
            ? GARRISON_TILES.has(t as Tile)
            : WALL_RUN_TILES.includes(t as Tile);
        };
        placed = orientDiagWall(
          dw.material,
          isWall(action.tx, action.ty - 1),
          isWall(action.tx + 1, action.ty),
          isWall(action.tx, action.ty + 1),
          isWall(action.tx - 1, action.ty),
        );
      }
    }
    // THE DYE LAW: a dyeable piece lands as its shape's anchor plus
    // the chosen dye — the id IS the color, no metadata anywhere.
    const awn = awningInfo(pieceTile);
    if (awn && action.dye !== undefined) {
      placed = awningTile(AWNING_SHAPES[awn.shapeIndex]!, action.dye);
    }
    // A builder's banner pole lands dyed; the authored hash-dealt
    // pole (no dial sent) keeps its old id untouched.
    if (pieceTile === Tile.BannerPole && action.dye !== undefined) {
      placed = bannerPoleTile(action.dye);
    }
    // A 45° fence turn joins whichever diagonal already carries
    // fencing — same build-the-runs-first law as the wall corner.
    // The fence dial has TWO stops (the piece is 180° symmetric):
    // NE/SW mean the NE-SW rail, NW/SE the other.
    if (pieceTile === Tile.FenceDiagNE || pieceTile === Tile.FenceDiagNW) {
      if (action.orient) {
        placed =
          action.orient === 'NE' || action.orient === 'SW'
            ? Tile.FenceDiagNE
            : Tile.FenceDiagNW;
      } else {
        const isFence = (x: number, y: number): boolean => {
          const t = this.world.groundAt(x, y);
          return t !== undefined && FENCE_TILES.has(t as Tile);
        };
        placed = orientDiagFence(
          isFence(action.tx + 1, action.ty - 1),
          isFence(action.tx - 1, action.ty - 1),
          isFence(action.tx + 1, action.ty + 1),
          isFence(action.tx - 1, action.ty + 1),
        );
      }
    }
    // The ground being replaced is what demolish will restore. When
    // building over an earlier construction the register/save layers
    // keep the original capture, so 'ground' here is only the first
    // link in the chain.
    this.world.registerBuilt(action.tx, action.ty, placed, player.characterId, ground);
    this.accounts.saveBuiltTile(action.tx, action.ty, placed, player.characterId, ground);
    this.setWorldTile(action.tx, action.ty, placed);
    // A homestead grew — its claim ring re-derives on the next read.
    if (this.homesByCharacter.has(player.characterId)) this.ringCache = null;
    this.capitalCache?.clear();
    this.grantXp(eid, player, def.skill ?? 'construction', def.xp);
    // A raised board starts BLANK and owned: the row exists from the
    // first moment so the builder sees an edit affordance the instant
    // the post lands, and everyone else sees an empty sign.
    if (isSignTile(placed) && player.characterId > 0) {
      this.playerSigns.set(`${action.tx},${action.ty}`, {
        tx: action.tx,
        ty: action.ty,
        title: '',
        lines: [],
        owner: player.characterId,
      });
      this.accounts.saveSign(action.tx, action.ty, '', [], player.characterId);
      this.broadcastSign(action.tx, action.ty);
    }
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

  /**
   * THE OWN-WORK OVERLAY's answer: every built-tile key this character
   * owns. The client asks on entering build mode and after each
   * completed build/demolish — whole-set each time, always correct.
   */
  sendOwnBuilt(eid: EntityId): void {
    const player = this.players.get(eid);
    if (!player || player.session === null) return;
    if (player.characterId <= 0) {
      player.session.sendJson({ t: 'ownbuilt', keys: [] });
      return;
    }
    // Both layers answer: built tiles AND hung details — the overlay
    // marks every coordinate the armed hand may touch.
    const keys = new Set<string>(this.world.builtKeysOf(player.characterId) ?? []);
    for (const k of this.world.builtDetailKeysOf(player.characterId) ?? []) keys.add(k);
    player.session.sendJson({ t: 'ownbuilt', keys: [...keys] });
  }

  /** How long a teardown swings — the same practiced-hand Calling that
   *  speeds building speeds unbuilding. */
  private static readonly DEMOLISH_TICKS = 12;

  demolish(eid: EntityId, tx: number, ty: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return;
    const built = this.world.builtAt(tx, ty);
    // THE SECOND LAYER: your own hanging is the TOP layer — it comes
    // down before the wall under it ever could, and a hanging on an
    // authored wall (no built record at all) is still yours to take.
    const hung = this.world.builtDetailAt(tx, ty);
    const ownHanging = !!hung && hung.owner === player.characterId;
    const ownTile = !!built && built.owner === player.characterId;
    if (!ownHanging && !ownTile) {
      if (built || hung) {
        player.session.sendJson({ t: 'chat', channel: 'system', text: "That isn't yours to tear down." });
      }
      return;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 3 * 3) return;
    if (!ownHanging && this.crops.has(`${tx},${ty}`)) {
      const crop = this.crops.get(`${tx},${ty}`)!;
      // THE ORCHARD'S END: a standing recurring crop is the one crop
      // its owner may clear by hand — the uproot takes the tree and
      // keeps the plot (a second swing takes the plot as ever).
      // Annuals stay refused: harvest is their only honest exit.
      if (crop.def.recurring && crop.owner === player.characterId) {
        this.crops.delete(`${tx},${ty}`);
        this.accounts.deleteCrop(tx, ty);
        this.world.unregisterCropTile(tx, ty);
        this.setWorldTile(tx, ty, bedTileFor(crop.def, crop.framed === 1));
        for (const s of this.sessions) s.sendJson({ t: 'farm', remove: [{ tx, ty }] });
        player.session.sendJson({ t: 'chat', channel: 'system', text: 'You grub the old wood out. The plot stands ready.' });
        return;
      }
      player.session.sendJson({ t: 'chat', channel: 'system', text: 'Harvest the crop first.' });
      return;
    }
    // THE LIVING SOIL: a bin holding scraps or a working batch will
    // not come down — empty it first (nothing composts into the void).
    {
      const bin = this.farmBins.get(`${tx},${ty}`);
      if (!ownHanging && bin && (bin.fill > 0 || bin.startedAt !== 0)) {
        player.session.sendJson({ t: 'chat', channel: 'system', text: 'Empty the bin first.' });
        return;
      }
    }
    // THE WORKING YARD: a station mid-batch will not come down (the
    // work would fall into the void); an emptied one demolishes fine.
    {
      const job = this.farmJobs.get(`${tx},${ty}`);
      if (!ownHanging && job && job.qty > 0) {
        player.session.sendJson({ t: 'chat', channel: 'system', text: 'The batch still works. Collect it first.' });
        return;
      }
      if (!ownHanging && this.world.groundAt(tx, ty) === Tile.Apiary && this.farmApiaries.has(`${tx},${ty}`)) {
        // The hive leaves with its box — the clock simply ends.
        this.farmApiaries.delete(`${tx},${ty}`);
        this.accounts.deleteFarmApiary(tx, ty);
        this.mirrorApiary(tx, ty, 0);
      }
    }
    // THE ANIMALS OF THE YARD: a trough with a herd anchored (or a
    // heaped manger) will not come down — lead the animals away and
    // let them eat it empty first.
    if (!ownHanging && this.world.groundAt(tx, ty) === Tile.FeedTrough) {
      if (this.livestockAtTrough(tx, ty) > 0) {
        player.session.sendJson({ t: 'chat', channel: 'system', text: 'The herd still answers to this trough.' });
        return;
      }
      if ((this.farmTroughs.get(`${tx},${ty}`)?.feed ?? 0) > 0) {
        player.session.sendJson({ t: 'chat', channel: 'system', text: 'The manger still holds feed.' });
        return;
      }
    }
    // THE SALVAGE LAW: teardown is a short action, not a packet — the
    // swing time is the confirmation dialog, and the wire can't strobe
    // a floor out from under anyone.
    const ticks = Math.max(1, Math.round(GameServer.DEMOLISH_TICKS * player.perks.buildSpeedMult));
    player.action = { kind: 'demolish', tx, ty, ticksLeft: ticks, hanging: ownHanging };
    this.poses.set(eid, PoseState.Gather);
    player.session.sendJson({ t: 'action', state: 'start', ticks });
  }

  private tickDemolish(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as DemolishAction;
    if (--action.ticksLeft > 0) return;
    const { tx, ty } = action;
    // THE SECOND LAYER's teardown: the cloth comes down quietly (no
    // collapse ceremony — a banner is lifted off its rod, not felled),
    // hands back ceil-half of its ledger, and the face's prior detail
    // returns. Re-dye pigment is spent color and never refunds.
    if (action.hanging) {
      const hung = this.world.builtDetailAt(tx, ty);
      if (!hung || hung.owner !== player.characterId) {
        this.cancelAction(eid, player, 'blocked');
        return;
      }
      const hdef = buildableForDetail(hung.detail);
      if (hdef) {
        const salvaged: string[] = [];
        for (const m of hdef.materials) {
          const back = Math.ceil(m.qty / 2);
          const kept = addItem(player.inventory, m.item, back);
          if (kept < back) {
            this.placeDrop(m.item, back - kept, tx + 0.5, ty + 1.5, {
              ownerEid: eid,
              ownerUntil: Date.now() + 30_000,
              despawnAt: Date.now() + 12 * 60_000,
              pickupAfter: Date.now() + 400,
            });
          }
          salvaged.push(`${back} ${(itemDef(m.item)?.name ?? m.item).toLowerCase()}`);
        }
        if (salvaged.length > 0) {
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `Salvaged: ${salvaged.join(', ')}.`,
          });
        }
        player.session?.sendJson({ t: 'inv', slots: player.inventory });
      }
      this.world.unregisterBuiltDetail(tx, ty);
      this.accounts.deleteBuiltDetail(tx, ty);
      this.setWorldDetail(tx, ty, hung.prevDetail);
      this.cancelAction(eid, player, 'done');
      return;
    }
    // Re-validate at the moment of the last swing: the record may have
    // changed hands or vanished while the bar filled.
    const built = this.world.builtAt(tx, ty);
    if (!built || built.owner !== player.characterId || this.crops.has(`${tx},${ty}`)) {
      this.cancelAction(eid, player, 'blocked');
      return;
    }
    // A restored solid layer may never trap a standing body.
    if (tileDef(built.prevTile).solid && this.tileHoldsBody(tx, ty)) {
      this.cancelAction(eid, player, 'occupied');
      return;
    }

    // Ceremony FIRST (the smashProp precedent): the collapse fx must
    // land before the patch that erases what is collapsing.
    this.broadcastFx({
      t: 'fx',
      kind: 'demolish',
      x: tx + 0.5,
      y: ty + 0.5,
      radius: 1,
      id: String(built.tile),
    });

    // Deterministic salvage: half of every material, rounded up — no
    // dice, no dials (the flood law). Overflow lands at the site.
    const def = buildableForTile(built.tile as Tile);
    const salvaged: string[] = [];
    if (def) {
      for (const m of def.materials) {
        const back = Math.ceil(m.qty / 2);
        const kept = addItem(player.inventory, m.item, back);
        if (kept < back) {
          this.placeDrop(m.item, back - kept, tx + 0.5, ty + 0.5, {
            ownerEid: eid,
            ownerUntil: Date.now() + 30_000,
            despawnAt: Date.now() + 12 * 60_000,
            pickupAfter: Date.now() + 400,
          });
        }
        salvaged.push(`${back} ${(itemDef(m.item)?.name ?? m.item).toLowerCase()}`);
      }
      if (salvaged.length > 0) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Salvaged: ${salvaged.join(', ')}.`,
        });
      }
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
    }

    // The words fall with the post: no orphan record may outlive its
    // board, or a rebuild on the same tile would inherit dead copy.
    if (this.playerSigns.delete(`${tx},${ty}`)) {
      this.accounts.deleteSign(tx, ty);
      this.broadcastSign(tx, ty, true);
    }
    // THE SECOND LAYER: a hanging falls with its wall — the cloth has
    // no face left to hold it, and an orphan detail row would re-dress
    // whatever rises here next. Its ceil-half salvage spills at the
    // wall's foot as an UNOWNED pile (the wall's owner may not be the
    // hanging's — the canopy-falls law, one lane over).
    const hungHere = this.world.builtDetailAt(tx, ty);
    if (hungHere) {
      const hdef = buildableForDetail(hungHere.detail);
      if (hdef) {
        for (const m of hdef.materials) {
          this.placeDrop(m.item, Math.ceil(m.qty / 2), tx + 0.5, ty + 1.5, {
            ownerEid: null,
            ownerUntil: 0,
            despawnAt: Date.now() + 12 * 60_000,
            pickupAfter: Date.now() + 400,
          });
        }
      }
      this.world.unregisterBuiltDetail(tx, ty);
      this.accounts.deleteBuiltDetail(tx, ty);
      this.setWorldDetail(tx, ty, hungHere.prevDetail);
    }
    // THE CANOPY FALLS WITH ITS WALL: if the doomed tile hosts an
    // awning on its south side, the brackets have nothing left to
    // bolt to — the awning comes down WITH the wall, its ceil-half
    // salvage spilling at the site for whoever owned it (an unowned
    // ground pile: the wall's owner may not be the awning's).
    const southBuilt = this.world.builtAt(tx, ty + 1);
    if (southBuilt && awningInfo(southBuilt.tile) !== null) {
      const adef = buildableForTile(southBuilt.tile as Tile);
      this.broadcastFx({
        t: 'fx',
        kind: 'demolish',
        x: tx + 0.5,
        y: ty + 1.5,
        radius: 1,
        id: String(southBuilt.tile),
      });
      if (adef) {
        for (const m of adef.materials) {
          this.placeDrop(m.item, Math.ceil(m.qty / 2), tx + 0.5, ty + 1.5, {
            ownerEid: null,
            ownerUntil: 0,
            despawnAt: Date.now() + 12 * 60_000,
            pickupAfter: Date.now() + 400,
          });
        }
      }
      this.world.unregisterBuilt(tx, ty + 1);
      this.accounts.deleteBuiltTile(tx, ty + 1);
      this.setWorldTile(tx, ty + 1, southBuilt.prevTile as Tile);
    }
    this.world.unregisterBuilt(tx, ty);
    this.accounts.deleteBuiltTile(tx, ty);
    // THE LAYER LAW: give back what stood here at build time — a wall
    // cut into your floor tears down to the FLOOR, a rail off the
    // porch tears down to the DECK. A restored player floor
    // re-registers to the same owner over the pristine ground, so it
    // stays owned, demolishable, and salvageable in turn.
    if (
      built.prevTile === Tile.WoodFloor ||
      built.prevTile === Tile.StoneFloor ||
      built.prevTile === Tile.PorchDeck
    ) {
      const natural = this.world.naturalGround(tx, ty);
      this.world.registerBuilt(tx, ty, built.prevTile, built.owner, natural);
      this.accounts.saveBuiltTile(tx, ty, built.prevTile, built.owner, natural);
    }
    this.setWorldTile(tx, ty, built.prevTile);
    if (this.homesByCharacter.has(player.characterId)) this.ringCache = null;
    this.capitalCache?.clear();
    // Tearing down your own claimed bed dissolves the claim NOW —
    // eagerly, not on the next bedside read — so the hearth watch
    // never guards a yard whose hearth is gone.
    if (player.home && player.home.x === tx && player.home.y === ty) {
      player.home = null;
      if (player.characterId > 0) this.accounts.clearHome(player.characterId);
      this.noteHomeChanged(player.characterId, null);
    }
    this.cancelAction(eid, player, 'done');
  }

  // ------------------------------------------------------ bank & shop

  async bankOp(
    eid: EntityId,
    op: 'deposit' | 'withdraw',
    item: string,
    qty: number,
    slot?: number,
    gearId?: number,
  ): Promise<void> {
    const player = this.players.get(eid);
    if (!player || player.session === null || player.bank === null) return;
    if (!this.nearTile(eid, Tile.BankChest)) return;
    if (!itemDef(item)) return;
    // One bank op in flight per player: the awaits below yield, and a
    // second op interleaving could double-count an instance.
    if (this.bankOpBusy.has(eid)) return;
    this.bankOpBusy.add(eid);
    try {

    if (op === 'deposit') {
      const src = slot !== undefined ? player.inventory[slot] : undefined;
      // NO LAUNDERING: the vault keeps no theft facet, so a stolen
      // stack or instance would come back out of it clean. The teller
      // refuses; the fences are the only outlet for hot goods.
      if (src && src.item === item && src.stolen) {
        player.session.sendJson({
          t: 'chat',
          channel: 'system',
          text: 'This is an honest ledger. A fence will take that off your hands.',
        });
        return;
      }
      if (src && src.item === item && src.roll) {
        // Rolled instances live in bank_gear rows (they can never
        // stack); a slot-addressed deposit moves exactly the instance
        // clicked. The row insert is AWAITED: the row committing is
        // what the deposit IS, and a fire-and-forget failure would
        // silently destroy the piece.
        if (player.characterId > 0) {
          const taken = takeSlot(player.inventory, slot!, 1);
          if (taken?.roll) {
            const stored = await this.accounts
              .insertBankGear(player.characterId, taken.item, taken.roll)
              .then(() => true)
              .catch((err: Error) => {
                console.error('[bank]', err.message);
                return false;
              });
            if (stored) {
              // The instance now lives only in its row — flush the
              // pack ahead of the 30s cadence so a crash inside the
              // window can't restore (and so duplicate) the piece.
              this.accounts.saveInventory(player.characterId, player.inventory);
            } else {
              // Refuse cleanly: the piece goes straight back in hand.
              if (addItem(player.inventory, taken.item, 1, taken.roll) === 0) {
                const pos = this.positions.get(eid);
                if (pos) {
                  this.placeDrop(taken.item, 1, pos.x, pos.y, {
                    ownerEid: eid,
                    ownerUntil: Date.now() + 30_000,
                    despawnAt: Date.now() + 12 * 60_000,
                    pickupAfter: Date.now() + 400,
                    roll: taken.roll,
                  });
                }
              }
              player.session.sendJson({
                t: 'chat',
                channel: 'system',
                text: 'The vault will not take that just now.',
              });
            }
          }
        }
      } else if (src && src.item === item) {
        const removed = takeSlot(player.inventory, slot!, qty)?.qty ?? 0;
        if (removed > 0) {
          player.bank[item] = (player.bank[item] ?? 0) + removed;
          player.bankDirty = true;
        }
      } else if (itemDef(item)?.stackable) {
        const removed = removeItem(player.inventory, item, qty);
        if (removed > 0) {
          player.bank[item] = (player.bank[item] ?? 0) + removed;
          player.bankDirty = true;
        }
      }
      // Id-addressed removal is for stackable materials ONLY (the
      // instance-addressing law): aimed at a rolled def it would null
      // the first honest same-id slot and erase its workings. Gear
      // must name its slot; anything else falls through untouched.
    } else if (gearId !== undefined) {
      // Withdraw an exact stored instance by its stable row id.
      if (player.characterId > 0) {
        const stored = (await this.accounts.loadBankGear(player.characterId)).find(
          (g) => g.id === gearId && g.item === item,
        );
        // Space is proved AFTER the await, and the proof and the add
        // run back to back with no await between them: the 20Hz tick
        // (tickCraft, the walk-over vacuum) can fill the pack while
        // the load is in flight, and the old order deleted the row
        // before learning the piece had nowhere to land.
        if (stored) {
          if (addItem(player.inventory, stored.item, 1, stored.roll) === 1) {
            // The piece is in hand; only now may the row die. If the
            // delete then fails the instance exists twice until the
            // row is cleaned up — logged loudly, because a rare dupe
            // on a db error beats a guaranteed loss.
            const deleted = await this.accounts
              .deleteBankGear(gearId, player.characterId)
              .catch((err: Error) => {
                console.error('[bank]', err.message);
                return false;
              });
            if (!deleted) {
              console.error(
                `[bank] gear row ${gearId} survived its own withdraw (character ${player.characterId}): instance duplicated until the row is removed`,
              );
            }
            // The row is gone and only the pack knows the piece now —
            // flush it ahead of the 30s cadence.
            this.accounts.saveInventory(player.characterId, player.inventory);
          } else {
            player.session.sendJson({
              t: 'chat',
              channel: 'system',
              text: 'Your pack has no room for that.',
            });
          }
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
      await this.sendBank(player);
    } finally {
      this.bankOpBusy.delete(eid);
    }
  }

  private readonly bankOpBusy = new Set<EntityId>();

  private async sendBank(player: PlayerComp): Promise<void> {
    if (!player.session || player.bank === null) return;
    const gear =
      player.characterId > 0 ? await this.accounts.loadBankGear(player.characterId) : undefined;
    player.session.sendJson({ t: 'bank', items: player.bank, gear });
  }

  /** Is any placed actor carrying this shop id within reach? */
  /**
   * Whose counter is this? The faction of the actor who keeps the
   * shop (actor.shop is the one tie — the same field the proximity
   * gate reads). Counterless shops (the general store's tile) and
   * unaffiliated keepers (peddlers) trade flat.
   */
  private factionOfShop(shopId: string): string | null {
    for (const [slug, def] of this.actorDefs) {
      if (def.shop === shopId) return factionOfActor(slug);
    }
    return null;
  }

  /** The live buy-price multiplier this player earns at this counter. */
  private shopPriceMultFor(player: PlayerComp, shopId: string): number {
    const fid = this.factionOfShop(shopId);
    return fid === null ? 1 : standingPriceMult(this.playerBandWith(player, fid));
  }

  private nearShopkeeper(eid: EntityId, shop: string): boolean {
    const pos = this.positions.get(eid);
    if (!pos) return false;
    for (const [aeid, comp] of this.actors) {
      if (comp.actor.shop !== shop) continue;
      const apos = this.positions.get(aeid);
      if (!apos) continue;
      const dx = apos.x - pos.x;
      const dy = apos.y - pos.y;
      // Forgiving reach: routines may shuffle the keeper a step or two
      // between opening the shelf and paying.
      if (dx * dx + dy * dy <= 4 * 4) return true;
    }
    return false;
  }

  shopOp(eid: EntityId, op: 'buy' | 'sell', item: string, qty: number, slot?: number, shop?: string): void {
    const player = this.players.get(eid);
    if (!player || player.session === null) return;
    const shopId = shop ?? 'general_store';
    const shopDef = SHOPS.get(shopId);
    if (!shopDef) return;
    // The general store answers to its counter tile; a trainer's shop
    // answers to the trainer standing near.
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    const near =
      (shopId === 'general_store' && this.nearTile(eid, Tile.ShopCounter)) ||
      this.nearShopkeeper(eid, shopId);
    // Say the refusal. A silent door reads as a broken button.
    if (!near) {
      sys('Step up to the counter first.');
      return;
    }
    const def = itemDef(item);
    if (!def) return;

    // THE PRICE OF A NAME (factions Phase 3): the keeper's faction
    // reads your band. Outlaw and below are refused outright (a stale
    // shelf can't outlive the shut door); everyone else trades at the
    // doc's band multiplier — mirrored on the sell side, so warmth
    // cuts both ways. Same pure function the client's price tags use.
    const shopFid = this.factionOfShop(shopId);
    const band = shopFid !== null ? this.playerBandWith(player, shopFid) : 'neutral';
    if (shopFid !== null && !bandAtLeast(band, 'suspect')) {
      sys("Your coin's no good here.");
      return;
    }
    const priceMult = standingPriceMult(band);

    if (op === 'buy') {
      const entry = shopDef.stock.find((e) => e.item === item);
      if (!entry) return;
      const price = Math.max(1, Math.round(entry.price * priceMult));
      const coins = countItem(player.inventory, 'coins');
      const affordable = Math.min(qty, Math.floor(coins / price));
      if (affordable === 0) {
        sys("You can't afford that.");
        return;
      }
      removeItem(player.inventory, 'coins', affordable * price);
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
        addItem(player.inventory, 'coins', (affordable - added) * price);
        sys('Your pack is full.');
      }
    } else {
      if (item === 'coins') return;
      // Quest items are worthless BY LAW (items.ts) — the counter
      // finally honors it instead of paying a floor coin and
      // destroying the thing you were asked to carry.
      if (def.quest) {
        sys("That's somebody's errand, not stock.");
        return;
      }
      // THE MIRROR LAW: the sell side reflects the buy multiplier
      // around parity — a keeper who discounts you also pays better.
      const sellMult = standingSellMult(band);
      const payFor = (each: number): number => Math.max(1, Math.floor((each / 2) * sellMult));
      // THE LARDER BOARD: an open order pays its premium for the
      // item's FAMILY (grades count, and a graded unit's own higher
      // value rides the multiplier). First come, first paid; honest
      // goods only; the half-value law holds for everything else.
      const larderPay = (soldItem: string, soldQty: number, each: number, stolen: boolean): number | null => {
        const host = larderHost(shopId);
        if (!host || stolen) return null;
        const epoch = larderEpoch(Date.now());
        const order = larderOrder(host, epoch);
        if (gradeOf(soldItem).base !== order.item) return null;
        const rec = this.larderFills.get(host.shop);
        const filled = rec && rec.epoch === epoch ? rec.filled : 0;
        const remaining = order.qty - filled;
        if (remaining <= 0) return null;
        const premiumUnits = Math.min(soldQty, remaining);
        const pay =
          premiumUnits * Math.max(1, Math.floor(each * order.mult * player.perks.larderSellMult)) +
          (soldQty - premiumUnits) * payFor(each);
        const nf = filled + premiumUnits;
        this.larderFills.set(host.shop, { epoch, filled: nf });
        this.accounts.upsertLarderFill(host.shop, epoch, nf);
        for (const s of this.sessions) {
          s.sendJson({ t: 'larder', fills: [{ shop: host.shop, epoch, filled: nf }] });
        }
        sys(
          remaining - premiumUnits <= 0
            ? `That fills the ${host.town} order. Good trading.`
            : `The larder takes ${premiumUnits} at a keen price. ${remaining - premiumUnits} still wanted.`,
        );
        return pay;
      };
      // Slot-addressed sale: the exact instance clicked leaves, and a
      // rolled instance is priced by its DERIVED value, not the base.
      const src = slot !== undefined ? player.inventory[slot] : undefined;
      if (src && src.item === item) {
        // THE FENCE LAW (Phase 5): stolen goods burn an honest
        // counter's hands — only the doc's fence factions buy them,
        // at the doc's stolen multiplier over the ordinary mirror.
        // (Id-addressed sales can't reach stolen slots at all —
        // removeItem's no-laundering law.)
        if (src.stolen && !isFenceFaction(shopFid)) {
          sys('Not through this counter. Try a less curious one.');
          return;
        }
        const stolenMult = src.stolen ? FACTIONS.theft.stolenSellMult : 1;
        const taken = takeSlot(player.inventory, slot!, qty);
        if (!taken) return;
        const each = rolledStats(taken.item, taken.roll)?.value ?? def.value;
        const larder = larderPay(taken.item, taken.qty, each, !!taken.stolen);
        addItem(
          player.inventory,
          'coins',
          larder ?? Math.max(1, Math.floor(taken.qty * payFor(each) * stolenMult)),
        );
      } else {
        // Id-addressed sales are for stackable materials ONLY (the
        // instance-addressing law): aimed at a rolled def, removeItem
        // would null the first honest same-id slot and erase its
        // workings for a base-value coin. Gear must name its slot.
        if (!def.stackable) {
          sys("The keeper wants that one in hand. Try it from your pack again.");
          return;
        }
        const sold = removeItem(player.inventory, item, qty);
        if (sold === 0) {
          sys("You've none of that to sell.");
          return;
        }
        const larder = larderPay(item, sold, def.value, false);
        addItem(player.inventory, 'coins', larder ?? sold * payFor(def.value));
      }
    }
    player.session.sendJson({ t: 'inv', slots: player.inventory });
  }

  private grantXp(eid: EntityId, player: PlayerComp, skill: SkillId, amount: number): void {
    // Stored data can still carry a retired id: a Studio-touched quest
    // row keeps the skill it was authored with, and a reseed leaves it
    // alone. Resolve at the one door so no reward pays a dead school.
    const live = resolveSkillId(skill);
    if (!live) {
      console.warn(`[xp] unknown skill '${skill}' — grant of ${amount} dropped`);
      return;
    }
    skill = live;
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
    // THE LESSON LAW mirrors the grant BEFORE the combat echo, so the
    // meter reads the true school only — the echo pays 'combat', a
    // school no secret sits in, and must never double-feed a bank.
    this.creditLessons(player, skill, amount);
    // THE SHARED LESSON: every strike-school lesson echoes a share into
    // combat — the generalist's skill trains whenever any weapon does.
    // 'combat' is never in the school set, so the echo cannot recurse.
    if (isCombatSchool(skill)) {
      const echo = Math.floor(amount * COMBAT_LESSON_FRAC);
      if (echo > 0) this.grantXp(eid, player, 'combat', echo);
    }
    if (levelledUp) {
      this.systemChatAll(`${player.name} reached ${skill} level ${levelAfter}!`);
      if (skill === 'vitality') {
        const health = this.healths.must(eid);
        health.maxHp = levelAfter + player.gear.maxHp;
      }
      this.announceLadderClimbs(player, skill, levelBefore, levelAfter);
      // A crossed skill floor can open a quest gate.
      this.pushQuestAvail(player);
    }
  }

  /**
   * THE HONED-ART LAW's ceremony: crossing a rank threshold or a new
   * rung is told to the climber alone — the world hears the level, the
   * hand hears what it learned. A honed cooldown may have changed, so
   * the radial mirror refreshes with it.
   */
  private announceLadderClimbs(
    player: PlayerComp,
    skill: SkillId,
    levelBefore: number,
    levelAfter: number,
  ): void {
    // Callings and Focus milestones speak for EVERY skill.
    for (const def of callingsFor(skill)) {
      if (levelBefore < def.unlockLevel && levelAfter >= def.unlockLevel) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `A Calling answers to you now: ${def.name}.`,
        });
      }
    }
    for (const milestone of [FOCUS_MILESTONE_LEVEL, FOCUS_MASTERY_LEVEL]) {
      if (levelBefore < milestone && levelAfter >= milestone) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Your Focus deepens — ${focusBudget(player.skills)} to hold Callings with.`,
        });
      }
    }
    // Every school that owns a ladder gets its climbs spoken —
    // beastcraft included (THE FOURTH CITIZENSHIP OF STYLE).
    if (!(TECHNIQUE_STYLES as readonly string[]).includes(skill)) return;
    let ladderMoved = false;
    // Mastered secrets ride the same rank clock as the ladder; their
    // climbs will speak here the day RANKS FOR THE SHELF authors
    // their steps (rankless seats fall through the ranks guard below).
    // Unmastered loans never appear — a lent art holds Rank I.
    const climbable = [
      ...techniquesFor(skill),
      ...SECRET_ARTS.filter(
        (s) => s.style === skill && player.flags.has(artFlag(s.ability)),
      ),
    ];
    for (const tech of climbable) {
      const name = abilityDef(tech.ability)?.name ?? tech.ability;
      if (levelBefore < tech.unlockLevel && levelAfter >= tech.unlockLevel) {
        ladderMoved = true;
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `A new art awaits in your codex: ${name}.`,
        });
        continue;
      }
      if (!tech.ranks) continue;
      // An unearned page has no rank to climb.
      if (tech.hidden && !player.flags.has(artFlag(tech.ability))) continue;
      const before = techniqueRankFor(tech, levelBefore);
      const after = techniqueRankFor(tech, levelAfter);
      if (after > before && after >= 2) {
        ladderMoved = true;
        const step = tech.ranks[Math.min(after - 2, tech.ranks.length - 1)];
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `${name} is honed to Rank ${RANK_ROMAN[after]} — ${step?.note ?? ''}`,
        });
      }
    }
    if (ladderMoved) this.sendCooldowns(player);
  }

  /**
   * THE SECOND LAYER's mirror of setWorldTile: mutate one detail-layer
   * id and stream the DetailPatch to everyone who knows the chunk.
   */
  private setWorldDetail(tx: number, ty: number, detail: number): void {
    this.world.setDetail(tx, ty, detail);
    const key = chunkKey(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    const patch = encodeDetailPatch({ tx, ty, detail });
    for (const s of this.sessions) {
      if (s.knownChunks.has(key)) s.sendBinary(patch);
    }
  }

  /**
   * THE HANGING LAW (exterior decor Phase 0): a wall-hung detail lands
   * on a wall tile that PRESENTS A SOUTH FACE (a wall-run member whose
   * south neighbour is not) — the face the wall painters dress is the
   * only honest place for cloth. The hosting wall may be anyone's
   * (authored town walls welcome a shingle); the DETAIL is owned, and
   * only an empty face or your own earlier hanging accepts one.
   * Returns true when the cloth goes up.
   */
  hangDetail(eid: EntityId, tx: number, ty: number, detail: number): boolean {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return false;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (player.characterId < 0) {
      sys('Guests cannot hang decor. Make an account!');
      return false;
    }
    if (wallHungInfo(detail) === null) return false;
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 3 * 3) return false;
    this.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    if (!this.hangFaceOk(tx, ty)) {
      sys('There is no wall face there to carry it.');
      return false;
    }
    const current = this.world.detailAt(tx, ty);
    const hung = this.world.builtDetailAt(tx, ty);
    if (current !== 0 && (!hung || hung.owner !== player.characterId)) {
      sys('That wall already bears its cloth.');
      return false;
    }
    // Re-hanging your own replaces the row whole; the prev captured at
    // the FIRST hang carries through (depth-1 layer law, detail lane).
    const prevDetail = hung ? hung.prevDetail : current;
    this.world.registerBuiltDetail(tx, ty, detail, player.characterId, prevDetail);
    this.accounts.saveBuiltDetail(tx, ty, detail, player.characterId, prevDetail);
    this.setWorldDetail(tx, ty, detail);
    return true;
  }

  /** Take down your own hanging; the face's prior detail returns. */
  removeHanging(eid: EntityId, tx: number, ty: number): boolean {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos || player.session === null) return false;
    const hung = this.world.builtDetailAt(tx, ty);
    if (!hung || hung.owner !== player.characterId) {
      player.session.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'Nothing of yours hangs there.',
      });
      return false;
    }
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    if (dx * dx + dy * dy > 3 * 3) return false;
    this.world.unregisterBuiltDetail(tx, ty);
    this.accounts.deleteBuiltDetail(tx, ty);
    this.setWorldDetail(tx, ty, hung.prevDetail);
    return true;
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

  /**
   * Live map-editor save: swap the authored zone into the world and
   * make every client that has its chunks fetch them fresh. Dropping
   * the keys from knownChunks is enough — updateInterest runs every
   * tick and restreams anything visible that isn't known, and the
   * client's full-chunk replace re-bakes render + collision for free.
   * Placements reload too: the zone's old spawn points and actor
   * posts retire (bodies removed silently, records deactivated in
   * place — never spliced, spawnIndex is absolute) and the new lists
   * register; tickSpawns stands the new residents up next tick.
   */
  reloadZone(zone: ZoneDef): void {
    const old = this.world.zoneById(zone.id);
    this.world.replaceZone(zone);
    this.dropClientChunks(old);
    this.dropClientChunks(zone);
    this.retireZonePlacements(zone.id);
    if (zone.spawns && zone.spawns.length > 0) this.registerSpawns(zone.spawns, zone.id);
    if (zone.actorSpawns && zone.actorSpawns.length > 0) {
      this.registerActorSpawns(zone.actorSpawns, zone.id);
    }
    // THE ADOPTED RING: a save that took over a code-side town spawn
    // retires the constant's live copy in place (deactivate-never-
    // splice, the dungeon-teardown law) — no doubles until reboot.
    const owned = new Set((zone.spawns ?? []).map((sp) => GameServer.townSpawnKey(sp)));
    for (const ring of this.townRing) {
      if (!owned.has(ring.key)) continue;
      for (const i of ring.indexes) {
        const spawn = this.spawnPoints[i];
        if (!spawn || !spawn.active) continue;
        spawn.active = false;
        if (spawn.eid !== null) {
          this.removeFromChunks(spawn.eid);
          this.ecs.destroy(spawn.eid);
          spawn.eid = null;
        }
      }
    }
  }

  /**
   * Deactivate a zone's placement records and silently remove their
   * live bodies — the dungeon-teardown law (removeFromChunks +
   * ecs.destroy, no loot, no death burst; ecs.destroy clears every
   * component store, dialogue/projectile/aggro guards self-heal).
   */
  private retireZonePlacements(zoneId: string): void {
    const rec = this.zonePlacements.get(zoneId);
    if (!rec) return;
    for (const i of rec.spawns) {
      const spawn = this.spawnPoints[i];
      if (!spawn) continue;
      spawn.active = false;
      if (spawn.eid !== null) {
        this.removeFromChunks(spawn.eid);
        this.ecs.destroy(spawn.eid);
        spawn.eid = null;
      }
    }
    for (const i of rec.actors) {
      const post = this.actorSpawnPoints[i];
      if (!post) continue;
      post.active = false;
      if (post.eid !== null) {
        this.removeFromChunks(post.eid);
        this.ecs.destroy(post.eid);
        post.eid = null;
      }
    }
    this.zonePlacements.delete(zoneId);
  }

  /**
   * Bestiary edit applied live: future spawns and respawns resolve
   * through NPCS at call time, so replacing the registry is enough
   * for them — this retires the STANDING bodies of the edited kind
   * (silent removal, respawn timers zeroed) so their spawn points
   * stand fresh ones up next tick with the new def. Actor bodies are
   * skipped: their combat defs ride actorDefs, not the bestiary.
   */
  reloadNpcDef(id: string): void {
    const doomed: Array<{ eid: EntityId; spawnIndex: number }> = [];
    for (const [eid, npc] of this.npcs) {
      if (npc.def.id !== id || this.actors.has(eid)) continue;
      doomed.push({ eid, spawnIndex: npc.spawnIndex });
    }
    for (const d of doomed) {
      this.removeFromChunks(d.eid);
      this.ecs.destroy(d.eid);
      const spawn = d.spawnIndex >= 0 ? this.spawnPoints[d.spawnIndex] : undefined;
      if (spawn) {
        spawn.eid = null;
        spawn.respawnAt = 0;
      }
    }
  }

  /**
   * Actor-def edit applied live: swap the registry entry and retire
   * the standing body at every post wearing that slug — tickSpawns
   * re-reads actorDefs and stands the new version up next tick. A
   * null def removes the slug (tool-born actor deleted).
   */
  reloadActorDef(slug: string, def: NpcActorDef | null): void {
    if (def) this.actorDefs.set(slug, def);
    else this.actorDefs.delete(slug);
    for (const post of this.actorSpawnPoints) {
      if (post.actor !== slug || post.eid === null) continue;
      this.removeFromChunks(post.eid);
      this.ecs.destroy(post.eid);
      post.eid = null;
      post.respawnAt = 0;
    }
  }

  /**
   * The live pick lists for dev tooling: bestiary archetypes from
   * content, actors and routines from the DB-loaded registries — the
   * same truth the running world spawns from.
   */
  registrySnapshot(): {
    npcs: Array<{ id: string; name: string; level: number }>;
    actors: Array<{ id: string; name: string; title?: string }>;
    routines: string[];
  } {
    return {
      npcs: [...NPCS.values()].map((d) => ({ id: d.id, name: d.name, level: d.level })),
      actors: [...this.actorDefs.values()].map((a) => ({
        id: a.id,
        name: a.name,
        ...(a.title ? { title: a.title } : {}),
      })),
      routines: [...this.routineDefs.keys()],
    };
  }

  /** Every live spawn slot and actor post — the CMS linkage truth. */
  spawnSiteSnapshot(): {
    npcs: Array<{ npc: string; x: number; y: number }>;
    actors: Array<{ actor: string; x: number; y: number }>;
  } {
    return {
      npcs: this.spawnPoints
        .filter((s) => s.active)
        .map((s) => ({ npc: s.npc, x: Math.round(s.x), y: Math.round(s.y) })),
      actors: this.actorSpawnPoints
        .filter((a) => a.active)
        .map((a) => ({ actor: a.actor, x: a.x, y: a.y })),
    };
  }

  /** Remove an authored zone live; its ground reverts to procgen. */
  unloadZone(zoneId: string): void {
    const old = this.world.zoneById(zoneId);
    if (!old) return;
    this.world.removeZone(zoneId);
    this.dropClientChunks(old);
    this.retireZonePlacements(zoneId);
    // Purge pending tile respawns inside the unloaded rect — a chest
    // reclose or smashed-prop regrow firing after the zone is gone
    // would paint zone furniture onto bare procgen meadow (latent for
    // /poi reroll; common once cleared camps dissolve on the ember
    // clock). A reload paints its tiles fresh anyway, so the purge is
    // right for every caller.
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const e = this.respawnQueue[i]!;
      if (
        e.tx >= old.origin.x &&
        e.tx < old.origin.x + old.width &&
        e.ty >= old.origin.y &&
        e.ty < old.origin.y + old.height
      ) {
        this.respawnQueue.splice(i, 1);
      }
    }
  }

  private dropClientChunks(zone: ZoneDef | undefined): void {
    if (!zone) return;
    const c0x = Math.floor(zone.origin.x / CHUNK_SIZE);
    const c0y = Math.floor(zone.origin.y / CHUNK_SIZE);
    const c1x = Math.floor((zone.origin.x + zone.width - 1) / CHUNK_SIZE);
    const c1y = Math.floor((zone.origin.y + zone.height - 1) / CHUNK_SIZE);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const key = chunkKey(cx, cy);
        for (const s of this.sessions) s.knownChunks.delete(key);
      }
    }
  }

  // ------------------------------------------------- procedural POIs

  /**
   * Boot wiring: load the prefab library (seeding data/prefabs with
   * any missing builtins) and warm the ledger cache. Until this runs,
   * tickPois no-ops — unit tests that construct a bare GameServer
   * never touch the filesystem.
   */
  /**
   * The live danger anchors: content's settled lights plus every
   * haven the POI ledger keeps. THE one anchor list — POI decisions,
   * wild spawns, chest laws, and the /danger lever all read the field
   * through here, so a waystation standing up calms all of them at
   * once.
   */
  dangerAnchors(): readonly DangerAnchor[] {
    if (!this.anchorCache) {
      this.anchorCache = [...SETTLED_ANCHORS, ...this.poiHavens.values()];
    }
    return this.anchorCache;
  }

  /** Danger tier at a world tile over the LIVE anchor list. */
  private liveDangerTier(tx: number, ty: number): number {
    return dangerAt(config.worldSeed, tx, ty, this.dangerAnchors());
  }

  // -------------------------------------------------- the hearth watch

  /** Boot wiring: every claimed home bed, offline settlers included. */
  initHomes(homes: ReadonlyArray<{ characterId: number; x: number; y: number }>): void {
    for (const h of homes) this.homesByCharacter.set(h.characterId, { x: h.x, y: h.y });
    this.ringCache = null;
    this.capitalCache?.clear();
  }

  /** A home claimed, moved, or dissolved — rings re-derive lazily. */
  private noteHomeChanged(characterId: number, home: { x: number; y: number } | null): void {
    if (home) this.homesByCharacter.set(characterId, home);
    else this.homesByCharacter.delete(characterId);
    this.ringCache = null;
    this.capitalCache?.clear();
  }

  /**
   * The derived claim rings: one per claimed hearth — base yard
   * (claimR) grown to cover the owner's built flood within claimReach
   * of the bed, plus pad. Rebuilt lazily; builds and claims invalidate.
   */
  private claimRings(): readonly ClaimRing[] {
    if (this.ringCache) return this.ringCache;
    const rings: ClaimRing[] = [];
    for (const [characterId, home] of this.homesByCharacter) {
      let r: number = FRONTIER.claimR;
      const keys = this.world.builtKeysOf(characterId);
      if (keys) {
        for (const key of keys) {
          const comma = key.indexOf(',');
          const dx = Number(key.slice(0, comma)) - home.x;
          const dy = Number(key.slice(comma + 1)) - home.y;
          const d = Math.hypot(dx, dy);
          if (d > FRONTIER.claimReach) continue; // a far fence-post is its own risk
          r = Math.max(r, d + FRONTIER.claimPad);
        }
      }
      rings.push({ x: home.x, y: home.y, r });
    }
    this.ringCache = rings;
    return rings;
  }

  /** Is a point inside any claimed yard? (tickWildSpawns' gate.) */
  private inClaimRing(tx: number, ty: number): boolean {
    for (const ring of this.claimRings()) {
      const dx = ring.x - tx;
      const dy = ring.y - ty;
      if (dx * dx + dy * dy <= ring.r * ring.r) return true;
    }
    return false;
  }

  /**
   * THE ONE CONTEXT BUILDER: every POI decision reads the same context
   * — anchors, zone rects, prefab library, and the claim rings — so
   * the exclusion law cannot be forgotten at any call site.
   */
  private poiCtx(): PoiContext {
    return poiContext(
      this.dangerAnchors(),
      this.world.zoneDefs,
      this.poiPrefabs!,
      this.claimRings(),
      this.capitalRects(),
    );
  }

  // ------------------------------------------- THE CAPITAL LAW

  /** The seat context: STATIC anchors (the seat is geologic), the
   * authored/planned rects, live rings, the live shelves. */
  private seatCtx() {
    return {
      anchors: SETTLED_ANCHORS,
      zoneRects: [
        ...this.world.zoneDefs
          .filter((z) => !z.id.startsWith('poi:') && !z.id.startsWith('stronghold:'))
          .map((z) => ({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height })),
        ...PLANNED_ZONE_RECTS,
      ],
      claimRings: this.claimRings(),
      layouts: [...STRONGHOLD_DEFS.values()],
      prefabs: this.poiPrefabs ?? new Map(),
      families: familiesOf([...POI_DEFS.values()]),
    };
  }

  /** The (cached) capital seat of a territory lattice cell. */
  private cachedSeat(gx: number, gy: number): CapitalSeat | null {
    const key = capitalKey(gx, gy);
    const hit = this.capitalCache.get(key);
    if (hit !== undefined) return hit;
    const seat = strongholdSeat(config.worldSeed, gx, gy, this.seatCtx());
    this.capitalCache.set(key, seat);
    return seat;
  }

  /**
   * Every seated capital rect near an online player — THE MASK's
   * source. Computed lazily inside poiCtx() so a cell can never be
   * decided before its ground's capital is known (no beat ordering
   * to race). Warm-cache cost is map lookups.
   */
  private capitalRects(): Array<{ x: number; y: number; w: number; h: number }> {
    const out: Array<{ x: number; y: number; w: number; h: number }> = [];
    // Hand-built test slates borrow these methods without the capital
    // fields — an absent cache reads as an empty frontier, never a
    // throw (the standDownGarrison slate convention).
    if (!this.capitalCache || !this.sessions) return out;
    const seen = new Set<string>();
    for (const session of this.sessions) {
      if (session.playerEid === null) continue;
      const pos = this.positions.get(session.playerEid);
      if (!pos) continue;
      const py = pos.y;
      if (py >= DARK_BAND_Y) continue;
      const px = pos.x;
      const reach = CAPITAL_PAD_TILES + 168;
      const r = capitalLatticeRange(px - reach, py - reach, reach * 2, reach * 2);
      for (let gy = r.gy0; gy <= r.gy1; gy++) {
        for (let gx = r.gx0; gx <= r.gx1; gx++) {
          const key = capitalKey(gx, gy);
          if (seen.has(key)) continue;
          seen.add(key);
          const seat = this.cachedSeat(gx, gy);
          if (seat) out.push(seat.rect);
        }
      }
    }
    return out;
  }

  /** Compound holds keep out of a capital's whole neighborhood. */
  private capitalNearCell(cellX: number, cellY: number): boolean {
    const pad = FRONTIER.regionCells * POI_CELL;
    const x0 = cellX * POI_CELL - pad;
    const y0 = cellY * POI_CELL - pad;
    return capitalMasked(x0, y0, POI_CELL + pad * 2, POI_CELL + pad * 2, this.capitalRects());
  }

  /**
   * Does any fighting body of this capital still stand? With a ward
   * index, only that chapter's bodies answer — the cache ward reads
   * the LAST STAND alone (Phase 4: the chief's court is the lock;
   * the outlying wards are chapters, not tumblers).
   */
  private strongholdGarrisonStands(key: string, ward?: number): boolean {
    const live = this.strongholdLive.get(key);
    if (!live) return false;
    for (const i of live.spawnIdx) {
      const sp = this.spawnPoints[i];
      if (!sp?.active || sp.eid === null || !this.poiSpawnFights(sp)) continue;
      if (ward !== undefined && sp.wing !== ward) continue;
      return true;
    }
    return false;
  }

  /** The last-stand ward index of a standing capital's layout. */
  private strongholdBossWard(key: string): number | undefined {
    const live = this.strongholdLive.get(key);
    const layout = live ? STRONGHOLD_DEFS.get(live.layoutId) : undefined;
    if (!layout) return undefined;
    const wi = layout.wards.findIndex((w) => w.key === layout.boss.ward);
    return wi >= 0 ? wi : undefined;
  }

  /**
   * THE CHAPTERS (strongholds Phase 4, the noteHoldWing dialect at
   * citadel scale): a ward's last fighter falls while another chapter
   * stands — one line, once, and the ledger bit stamps so the broken
   * ward STAYS broken across restarts. The whole muster falls — the
   * clear ceremony: the named line, the warden's deed, the cleared
   * stamp. The purse stays the bounty pipeline's (a capital pays when
   * MARKED — Phase 5 posts those marks; no unmarked faucet opens).
   */
  private noteStrongholdKill(spawnIndex: number, killerEid?: EntityId): void {
    const key = this.strongholdSpawnCells.get(spawnIndex);
    if (key === undefined) return;
    const live = this.strongholdLive.get(key);
    if (!live) return;
    const layout = STRONGHOLD_DEFS.get(live.layoutId);
    if (!layout) return;
    const dying = this.spawnPoints[spawnIndex];
    const ward = dying?.wing;
    if (ward === undefined) return;
    let wardStands = false;
    let otherStands = false;
    for (const i of live.spawnIdx) {
      const sp = this.spawnPoints[i];
      if (!sp?.active || sp.eid === null || !this.poiSpawnFights(sp)) continue;
      if (sp.wing === ward) wardStands = true;
      else otherStands = true;
    }
    if (wardStands) return;
    const heard = new Set<PlayerComp>();
    const killer = killerEid !== undefined ? this.players.get(killerEid) : undefined;
    if (killer) heard.add(killer);
    for (const characterId of live.fighters ?? []) {
      const feid = this.characterEids.get(characterId);
      const p = feid !== undefined ? this.players.get(feid) : undefined;
      if (p) heard.add(p);
    }
    const row = this.strongholdLedger.get(key);
    if (otherStands) {
      // A chapter closes; the siege goes on.
      const broken = (live.wardsBroken ??= new Set<number>());
      if (broken.has(ward)) return;
      broken.add(ward);
      if (row) {
        row.wardsCleared |= 1 << ward;
        this.accounts.markStrongholdWards(live.seat.gx, live.seat.gy, row.wardsCleared);
      }
      const name = layout.wards[ward]?.name ?? 'the yard';
      for (const p of heard) {
        p.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Quiet falls over ${name}. The hold thins.`,
        });
      }
      return;
    }
    // The last stand falls — the capital is broken.
    if (row) {
      row.wardsCleared |= 1 << ward;
      row.clearedAt = Date.now();
      this.accounts.markStrongholdCleared(
        live.seat.gx,
        live.seat.gy,
        row.wardsCleared,
        row.clearedAt,
      );
    }
    live.fighters = undefined;
    for (const p of heard) {
      p.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `The last of them falls. ${layout.name} is broken — word of it will travel.`,
      });
      this.grantArt(p, 'warden_volley');
    }
  }

  /**
   * THE PRICE OF SCALE, paid before it is seen: capitals decide and
   * stand at interest + 4 chunks (192 tiles) so the addZone chunk
   * halo and the client re-bake land beyond the fog. One capital per
   * pass (the sliced-job law), on its own beat.
   */
  private tickStrongholds(): void {
    if (!this.poiPrefabs) return;
    for (const session of this.sessions) {
      if (session.playerEid === null) continue;
      const pos = this.positions.get(session.playerEid);
      if (!pos) continue;
      const py = pos.y;
      if (py >= DARK_BAND_Y) continue;
      const px = pos.x;
      const r = capitalLatticeRange(
        px - CAPITAL_PAD_TILES,
        py - CAPITAL_PAD_TILES,
        CAPITAL_PAD_TILES * 2,
        CAPITAL_PAD_TILES * 2,
      );
      for (let gy = r.gy0; gy <= r.gy1; gy++) {
        for (let gx = r.gx0; gx <= r.gx1; gx++) {
          const key = capitalKey(gx, gy);
          if (this.strongholdLive.has(key)) continue;
          const seat = this.cachedSeat(gx, gy);
          if (!seat) continue;
          const near =
            px > seat.rect.x - CAPITAL_PAD_TILES &&
            px < seat.rect.x + seat.rect.w + CAPITAL_PAD_TILES &&
            py > seat.rect.y - CAPITAL_PAD_TILES &&
            py < seat.rect.y + seat.rect.h + CAPITAL_PAD_TILES;
          if (!near) continue;
          this.materializeCapital(seat);
          return; // one per pass — the sliced-job law
        }
      }
    }
  }

  private materializeCapital(seat: CapitalSeat): void {
    const key = capitalKey(seat.gx, seat.gy);
    const layout = STRONGHOLD_DEFS.get(seat.layoutId);
    const prefab = layout ? this.poiPrefabs?.get(layout.prefab) : undefined;
    if (!layout || !prefab) {
      console.warn(`[stronghold] ${key}: cannot compose '${seat.layoutId}' — content missing`);
      return;
    }
    // Ground the capital claims answers to it alone: any PRE-LAW poi
    // rows standing inside the walls retire to decided-empty (the
    // mask keeps every future roll out; existing worlds converge).
    const cx0 = Math.floor((seat.rect.x - 24) / POI_CELL);
    const cy0 = Math.floor((seat.rect.y - 24) / POI_CELL);
    const cx1 = Math.floor((seat.rect.x + seat.rect.w + 24) / POI_CELL);
    const cy1 = Math.floor((seat.rect.y + seat.rect.h + 24) / POI_CELL);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const cellKey = poiCellKey(cx, cy);
        const row = this.poiLedger.get(cellKey);
        if (!row?.site) continue;
        this.retirePoiCell(cellKey);
        this.poiLedger.set(cellKey, { ...row, site: null, clearedAt: null, emberUntil: null });
        this.accounts.recordPoiCell(cx, cy, row.epoch, null);
        console.log(`[stronghold] ${key}: cell ${cellKey} yields its ground to the capital`);
      }
    }
    const row = this.strongholdLedger.get(key);
    const zone = composeStronghold(config.worldSeed, seat, layout, prefab, row?.epoch ?? 0);
    this.world.addZone(zone);
    this.dropClientChunks(zone);
    const spawnIdx = this.registerSpawns(zone.spawns ?? [], zone.id);
    for (const i of spawnIdx) this.strongholdSpawnCells.set(i, key);
    // THE CHAPTERS, restart-safe: broken wards re-stand broken; a
    // cleared capital re-stands whole as a carcass (the ember-law
    // dialect — Phase 5's clock owns dissolving it).
    if (row) {
      if (row.clearedAt !== null) {
        this.standDownGarrison(spawnIdx);
      } else if (row.wardsCleared !== 0) {
        const downed = spawnIdx.filter((i) => {
          const sp = this.spawnPoints[i];
          return sp?.wing !== undefined && (row.wardsCleared & (1 << sp.wing)) !== 0;
        });
        if (downed.length > 0) this.standDownGarrison(downed);
      }
    }
    // The cache: warded while any fighter stands (the capital dialect
    // of the chest-ward law — Phase 4 narrows it to the last stand).
    for (let i = 0; i < zone.ground.length; i++) {
      const info = chestInfo(zone.ground[i]!);
      if (!info || info.open) continue;
      const wx = zone.origin.x + (i % zone.width);
      const wy = zone.origin.y + Math.floor(i / zone.width);
      this.poiChests.set(`${wx},${wy}`, { cell: `sh:${key}`, warded: true });
    }
    this.strongholdLive.set(key, { zoneId: zone.id, seat, layoutId: seat.layoutId, spawnIdx });
    if (!this.strongholdLedger.has(key)) {
      this.strongholdLedger.set(key, {
        layoutId: seat.layoutId,
        anchorX: seat.x,
        anchorY: seat.y,
        epoch: 0,
        wardsCleared: 0,
        clearedAt: null,
      });
      this.accounts.recordStronghold(seat.gx, seat.gy, seat.layoutId, seat.x, seat.y, 0);
    }
    console.log(
      `[stronghold] ${key}: '${seat.layoutId}' stands at ${seat.x},${seat.y} tier ${seat.tier} (${zone.spawns?.length ?? 0} musters)`,
    );
  }

  /** Retire a standing capital (content edits; future lifecycle). */
  private retireCapital(key: string): void {
    const live = this.strongholdLive.get(key);
    if (!live) return;
    this.unloadZone(live.zoneId);
    for (const i of live.spawnIdx) this.strongholdSpawnCells.delete(i);
    for (const [tileKey, over] of this.poiChests) {
      if (over.cell === `sh:${key}`) this.poiChests.delete(tileKey);
    }
    this.strongholdLive.delete(key);
  }

  /** A layout edit re-stands its capitals under the new truth. */
  reloadStrongholdLayout(layoutId: string): void {
    this.capitalCache?.clear();
    for (const [key, live] of [...this.strongholdLive]) {
      if (live.layoutId === layoutId) this.retireCapital(key);
    }
  }

  /** The haven list as wire triples for welcome + change broadcasts. */
  private havenWire(): number[][] {
    return [...this.poiHavens.values()].map((a) => [a.x, a.y, a.safeR]);
  }

  /**
   * Re-derive the haven set from the ledger (the ledger IS the truth:
   * a decided waystation lights its lamp whether or not it is
   * materialized right now). Broadcasts the new list when it changed
   * so client danger reads stay in lockstep.
   */
  private rebuildHavens(): void {
    const before = JSON.stringify(this.havenWire());
    this.poiHavens.clear();
    for (const [key, row] of this.poiLedger) {
      if (!row.site) continue;
      const def = POI_DEFS.get(row.site.defId);
      if (!def?.haven) continue;
      this.poiHavens.set(key, {
        x: row.site.anchorX,
        y: row.site.anchorY,
        safeR: def.haven.safeR,
        haven: true,
      });
    }
    this.anchorCache = null;
    const wire = this.havenWire();
    if (JSON.stringify(wire) !== before) {
      for (const s of this.sessions) {
        if (s.playerEid !== null) {
          s.sendJson({ t: 'havens', list: wire, settled: this.anchorWire() });
        }
      }
    }
  }

  initPois(
    rows: Awaited<ReturnType<AccountStore['loadPoiCells']>>,
    frontierCredits = 0,
    extras: {
      discovered?: readonly string[];
      calm?: ReadonlyArray<{ cellX: number; cellY: number; calmUntil: number }>;
      minors?: ReadonlyArray<{ cellX: number; cellY: number; epoch: number; cleared: number }>;
      strongholds?: ReadonlyArray<{
        latticeX: number;
        latticeY: number;
        layoutId: string;
        anchorX: number;
        anchorY: number;
        epoch: number;
        wardsCleared: number;
        clearedAt: number | null;
      }>;
    } = {},
  ): void {
    this.poiPrefabs = loadPoiPrefabs(config.dataDir);
    this.frontierCredits = frontierCredits;
    for (const key of extras.discovered ?? []) this.discoveredPoiCells.add(key);
    for (const c of extras.calm ?? []) {
      this.frontierCalm.set(poiCellKey(c.cellX, c.cellY), c.calmUntil);
    }
    for (const m of extras.minors ?? []) {
      this.minorLedger.set(poiCellKey(m.cellX, m.cellY), { epoch: m.epoch, cleared: m.cleared });
    }
    for (const h of extras.strongholds ?? []) {
      this.strongholdLedger.set(capitalKey(h.latticeX, h.latticeY), {
        layoutId: h.layoutId,
        anchorX: h.anchorX,
        anchorY: h.anchorY,
        epoch: h.epoch,
        wardsCleared: h.wardsCleared,
        clearedAt: h.clearedAt,
      });
    }
    let sites = 0;
    for (const row of rows) {
      const site: PoiSite | null =
        row.poiId !== null && row.prefabId !== null
          ? {
              cellX: row.cellX,
              cellY: row.cellY,
              epoch: row.epoch,
              tier: row.tier ?? 1,
              defId: row.poiId,
              prefabId: row.prefabId,
              anchorX: row.anchorX ?? 0,
              anchorY: row.anchorY ?? 0,
            }
          : null;
      if (site) sites++;
      this.poiLedger.set(poiCellKey(row.cellX, row.cellY), {
        epoch: row.epoch,
        site,
        clearedAt: row.clearedAt,
        emberUntil: row.emberUntil,
        fallowUntil: row.fallowUntil,
        stage: row.stage,
        stageAt: row.stageAt,
        originCell: row.originCell,
      });
    }
    console.log(
      `[poi] ledger: ${rows.length} cells decided (${sites} sites) · ` +
        `${this.poiPrefabs.size} prefabs in the library`,
    );
    // EMBER RECONCILE: rows cleared before the ember law shipped (or
    // cleared while the clock column somehow never landed) get their
    // linger stamped from load time — the broken camp dissolves shortly
    // after boot instead of standing cleared forever.
    const authoredAtBoot = this.authoredCells();
    for (const [key, row] of this.poiLedger) {
      if (row.site === null || row.clearedAt === null || row.emberUntil !== null) continue;
      if (authoredAtBoot.has(key)) continue; // landmarks never ember
      row.emberUntil =
        Date.now() + emberLingerFor(config.worldSeed, row.site.cellX, row.site.cellY, row.epoch);
      this.accounts.setPoiEmber(row.site.cellX, row.site.cellY, row.emberUntil);
    }
    // The lamps light BEFORE the sweep: fallow re-decisions read the
    // field with every standing haven in it.
    this.rebuildHavens();
    // THE PLAN SWEEP: the master plan reserves zone rects (Amberford,
    // Silverfall) before their epics build them, but the site-pick
    // honors zones only at roll time — so any cell decided under an
    // older plan whose footprint now collides re-rolls on a fresh
    // epoch and finds a home clear of tomorrow's streets.
    const evicted = this.zonePlanSweep();
    if (evicted > 0) {
      console.log(`[poi] plan sweep: ${evicted} site(s) re-rolled off planned zone rects`);
    }
    // THE EPOCH TURN: cells cleared and left fallow long enough
    // re-roll on fresh streams — the frontier churns exactly where
    // players stopped caring, and nowhere else.
    const turned = this.fallowSweep(Date.now() - GameServer.POI_FALLOW_DAYS * 86_400_000);
    if (turned.turned > 0) {
      console.log(
        `[poi] fallow turn: ${turned.turned} cleared cells re-rolled ` +
          `(${turned.rerolled} stand anew, ${turned.turned - turned.rerolled} rolled empty)`,
      );
    }
    // THE AUTHORED SITES: the plan's fixed points in the wilds — the
    // High Road mileposts, the Last Lamp, the veil's named dens —
    // seeded (or restored) after every sweep, idempotently.
    this.seedAuthoredSites();
    if (this.poiHavens.size > 0) {
      console.log(`[poi] ${this.poiHavens.size} haven lamp(s) burning on the frontier`);
    }
  }

  /**
   * Macro-cells the authored-sites roster claims. Both sweeps skip
   * them (the plan must never evict its own landmarks), and the
   * seeder below restores them whenever the ledger disagrees.
   * Computed at CALL time — the geography is a live registry now, and
   * a cached projection would go stale the moment the studio moves a
   * milepost (the ROAD_BOUNDS lesson).
   */
  private authoredCells(): Map<string, string> {
    const cells = new Map<string, string>();
    for (const s of AUTHORED_WILD_SITES) {
      const key = s.cell
        ? poiCellKey(s.cell[0], s.cell[1])
        : poiCellKey(poiCellOf(s.x!), poiCellOf(s.y!));
      cells.set(key, s.id);
    }
    return cells;
  }

  /**
   * Stand the master plan's authored wild sites in the ledger — the
   * waystation mileposts pacing the High Road, the Last Lamp before
   * the Silverspine climb, the Thornveil's named dens. Pinned entries
   * nudge to honest ground beside their road (the standable probe
   * already refuses the trodden surface); cell entries run the real
   * site scan with the archetype forced. A ledger row that already
   * holds the wanted archetype is left exactly alone — the seed is
   * idempotent, and boots after the first are no-ops.
   */
  private seedAuthoredSites(): void {
    if (!this.poiPrefabs) return;
    const ctx = this.poiCtx();
    let seeded = 0;
    for (const want of AUTHORED_WILD_SITES) {
      const def = POI_DEFS.get(want.defId);
      if (!def) {
        console.warn(`[poi] authored site '${want.id}': unknown archetype '${want.defId}'`);
        continue;
      }
      const cellX = want.cell ? want.cell[0] : poiCellOf(want.x!);
      const cellY = want.cell ? want.cell[1] : poiCellOf(want.y!);
      const key = poiCellKey(cellX, cellY);
      const row = this.poiLedger.get(key);
      if (row?.site?.defId === want.defId) continue; // already standing

      // A different decision holds the cell — retire it; the epoch
      // bump keeps the re-decision's muster streams fresh.
      const epoch = row ? row.epoch + 1 : 0;
      let site: PoiSite | null = null;
      if (want.cell) {
        site = poiForCell(config.worldSeed, cellX, cellY, epoch, ctx, want.defId);
      } else {
        const prefabId =
          def.prefabs[hashCoords(config.worldSeed ^ 0xa07d, want.x!, want.y!) % def.prefabs.length]!;
        const prefab = this.poiPrefabs.get(prefabId);
        const spot = prefab
          ? findAuthoredAnchor(config.worldSeed, want.x!, want.y!, prefab, ctx)
          : null;
        if (spot) {
          site = {
            cellX,
            cellY,
            epoch,
            tier: this.liveDangerTier(spot.x, spot.y),
            defId: want.defId,
            prefabId,
            anchorX: spot.x,
            anchorY: spot.y,
          };
        }
      }
      if (!site) {
        console.warn(`[poi] authored site '${want.id}': no honest ground — stood nothing`);
        continue;
      }
      if (row?.site) this.fadePoiDiscoveries(key);
      if (row) this.retirePoiCell(key);
      this.accounts.recordPoiCell(cellX, cellY, epoch, {
        poiId: site.defId,
        prefabId: site.prefabId,
        tier: site.tier,
        anchorX: site.anchorX,
        anchorY: site.anchorY,
      });
      this.poiLedger.set(key, { epoch, site, clearedAt: null, emberUntil: null, fallowUntil: null, stage: 0, stageAt: null, originCell: null });
      seeded++;
      console.log(
        `[poi] authored site '${want.id}' (${want.defId}) stands at ` +
          `${site.anchorX},${site.anchorY} — tier ${site.tier}`,
      );
    }
    if (seeded > 0) this.rebuildHavens();
  }

  /**
   * Re-roll every decided site whose footprint collides with a zone
   * rect it predates (fallowSweep's shape, rect-triggered). Runs at
   * boot before anything materializes, so retire is pure bookkeeping.
   */
  private zonePlanSweep(): number {
    if (!this.poiPrefabs) return 0;
    const ctx = this.poiCtx();
    const authored = this.authoredCells();
    let evicted = 0;
    for (const [key, row] of this.poiLedger) {
      // Authored cells are the plan's own landmarks — never evicted
      // (they stand near planned rects deliberately, tight-padded).
      if (authored.has(key)) continue;
      if (row.site === null || !poiSiteBlocked(row.site, ctx)) continue;
      const { cellX, cellY } = row.site;
      this.fadePoiDiscoveries(key);
      this.retirePoiCell(key);
      const epoch = row.epoch + 1;
      const site = poiForCell(config.worldSeed, cellX, cellY, epoch, ctx);
      this.accounts.recordPoiCell(
        cellX,
        cellY,
        epoch,
        site && {
          poiId: site.defId,
          prefabId: site.prefabId,
          tier: site.tier,
          anchorX: site.anchorX,
          anchorY: site.anchorY,
        },
      );
      this.poiLedger.set(key, { epoch, site, clearedAt: null, emberUntil: null, fallowUntil: null, stage: 0, stageAt: null, originCell: null });
      evicted++;
    }
    if (evicted > 0) this.rebuildHavens();
    return evicted;
  }

  /**
   * Real days before the BOOT reconcile turns a cleared cell that
   * somehow slipped the ember clock (legacy rows, downed clocks). The
   * live cadence is tickFrontier's — a cleared site dissolves on its
   * ember linger, minutes not days; this sweep is belt-and-braces and
   * the /poi fallow lever's default.
   */
  private static readonly POI_FALLOW_DAYS = 7;

  /**
   * Floor (seconds) on every POI garrison respawn — and the grace a
   * full wipe grants the whole site. Long enough to finish the clear
   * and loot the warded chest before the camp restaffs.
   */
  private static readonly POI_RESPAWN_MIN_SEC = 180;

  /**
   * THE THINNER PURSE: what fraction of its open-world drop chances a
   * delve's unnamed garrison pays per kill. The halls hold roughly
   * twice the bodies the old tight cuts did and none of them restaff
   * mid-run, so the per-kill purse thins to keep the per-run take
   * where it was. Named keepers and every chest pay in full.
   */
  private static readonly DUNGEON_TRASH_LOOT_MULT = 0.5;

  /**
   * Turn every cell whose last full wipe predates the cutoff: bump
   * its epoch, retire whatever still stands, and decide it AGAIN
   * immediately (fresh streams — new archetype, new anchor, or honest
   * emptiness). The re-decision writes through recordPoiCell, so the
   * ledger keeps exactly one row per cell and cleared_at resets.
   */
  private fallowSweep(cutoffMs: number): { turned: number; rerolled: number } {
    if (!this.poiPrefabs) return { turned: 0, rerolled: 0 };
    const ctx = this.poiCtx();
    const authored = this.authoredCells();
    let turned = 0;
    let rerolled = 0;
    for (const [key, row] of this.poiLedger) {
      // Authored landmarks don't churn: the veil has ALWAYS held its
      // den — clear it and it comes back the same, not different.
      if (authored.has(key)) continue;
      if (row.site === null || row.clearedAt === null || row.clearedAt >= cutoffMs) continue;
      const { cellX, cellY } = row.site;
      this.fadePoiDiscoveries(key);
      this.retirePoiCell(key);
      const epoch = row.epoch + 1;
      const site = poiForCell(config.worldSeed, cellX, cellY, epoch, ctx);
      this.accounts.recordPoiCell(
        cellX,
        cellY,
        epoch,
        site && {
          poiId: site.defId,
          prefabId: site.prefabId,
          tier: site.tier,
          anchorX: site.anchorX,
          anchorY: site.anchorY,
        },
      );
      this.poiLedger.set(key, { epoch, site, clearedAt: null, emberUntil: null, fallowUntil: null, stage: 0, stageAt: null, originCell: null });
      turned++;
      if (site) rerolled++;
    }
    // A turned cell may have raised or dimmed a lamp.
    if (turned > 0) this.rebuildHavens();
    return { turned, rerolled };
  }

  /** Settled anchors as wire quads [x, y, safeR, haven] for the client. */
  private anchorWire(): number[][] {
    return SETTLED_ANCHORS.map((a) => [a.x, a.y, a.safeR, a.haven ? 1 : 0, a.dread ?? 0]);
  }

  /**
   * THE GEOGRAPHY RELOAD — the World Studio's save lands here. Swap
   * the live plan, forget every generated chunk (terrain is a pure
   * function of the plan, so the whole world redraws on demand),
   * restream everything each client can see, push the fresh anchor
   * list, and re-judge the POI ledger under the new plan. Player
   * built/crop tiles reapply on regeneration — an edit never eats a
   * player's fence.
   */
  reloadGeography(def: GeographyDef): { evicted: number; orphaned: number } {
    replaceGeography(def);
    this.world.dropAll();
    for (const s of this.sessions) s.knownChunks.clear();
    this.anchorCache = null;
    // Anchors may have moved even when no haven changed — push both.
    const wire = { t: 'havens' as const, list: this.havenWire(), settled: this.anchorWire() };
    for (const s of this.sessions) {
      if (s.playerEid !== null) s.sendJson(wire);
    }
    const swept = this.geographySweep();
    this.seedAuthoredSites();
    this.rebuildHavens();
    console.log(
      `[geo] plan reloaded — ${def.routes.length} routes, ${def.sites.length} sites, ` +
        `${def.anchors.length} anchors · ${swept.evicted} cell(s) re-rolled, ` +
        `${swept.orphaned} orphaned landmark(s) dissolved`,
    );
    return swept;
  }

  /**
   * Re-judge every decided cell under the CURRENT plan: a site whose
   * footprint a new rect or road now crosses re-rolls (epoch+1), and
   * a cell that used to be an authored landmark but has left the
   * roster dissolves back to the honest roll — an orphaned Last Lamp
   * must not keep burning after the plan strikes it.
   */
  private geographySweep(): { evicted: number; orphaned: number } {
    if (!this.poiPrefabs) return { evicted: 0, orphaned: 0 };
    const ctx = this.poiCtx();
    const authored = this.authoredCells();
    const authoredOnly = new Set(
      [...POI_DEFS.values()].filter((d) => d.weight === 0).map((d) => d.id),
    );
    let evicted = 0;
    let orphaned = 0;
    for (const [key, row] of this.poiLedger) {
      if (authored.has(key)) continue; // the seeder owns these
      if (row.site === null) continue;
      const blocked = poiSiteBlocked(row.site, ctx);
      // A weight-0 archetype only ever places through the authored
      // roster — a row wearing one outside the roster is an orphan.
      const orphan = authoredOnly.has(row.site.defId);
      // A road redrawn through a standing camp: the anchor's distance
      // to the carve says whether the site now blocks the way.
      const paved =
        roadDistanceAt(config.worldSeed, row.site.anchorX, row.site.anchorY) <= ROAD_SHOULDER;
      if (!blocked && !orphan && !paved) continue;
      const { cellX, cellY } = row.site;
      this.fadePoiDiscoveries(key);
      this.retirePoiCell(key);
      const epoch = row.epoch + 1;
      const site = orphan ? null : poiForCell(config.worldSeed, cellX, cellY, epoch, ctx);
      this.accounts.recordPoiCell(
        cellX,
        cellY,
        epoch,
        site && {
          poiId: site.defId,
          prefabId: site.prefabId,
          tier: site.tier,
          anchorX: site.anchorX,
          anchorY: site.anchorY,
        },
      );
      this.poiLedger.set(key, { epoch, site, clearedAt: null, emberUntil: null, fallowUntil: null, stage: 0, stageAt: null, originCell: null });
      if (orphan) orphaned++;
      else evicted++;
    }
    if (evicted + orphaned > 0) this.rebuildHavens();
    return { evicted, orphaned };
  }

  /**
   * THE WORLD SNAPSHOT — everything the studio's World view needs in
   * one read: the seed (so the editor runs the same worldgen), the
   * macro-cell law, and every ledger row with its live/authored state.
   */
  worldSnapshot(): {
    seed: number;
    poiCell: number;
    cells: Array<{
      cellX: number;
      cellY: number;
      epoch: number;
      clearedAt: number | null;
      emberUntil: number | null;
      fallowUntil: number | null;
      stage: number;
      originCell: string | null;
      site: PoiSite | null;
      defName: string | null;
      zoneId: string | null;
      authoredId: string | null;
      /** THE SMALL FINDS standing in the cell this uptime (Phase 6 lens). */
      finds: { count: number; cleared: number } | null;
    }>;
    /** THE LIVING STATE (Phase 6): the whole weather, one read. */
    credits: number;
    calm: Array<{ cellX: number; cellY: number; calmUntil: number }>;
    claimRings: Array<{ x: number; y: number; r: number }>;
    /** THE FORESTER'S GLASS (second-growth Phase 6): every wild
     *  harvest still healing — the regrowth wave, one read. */
    growth: Array<{
      tx: number;
      ty: number;
      state: number;
      dialect: string;
      sown: boolean;
      due: number | null;
    }>;
  } {
    const authored = this.authoredCells();
    const cells = [...this.poiLedger.entries()].map(([key, row]) => ({
      cellX: row.site?.cellX ?? Number(key.split(',')[0]),
      cellY: row.site?.cellY ?? Number(key.split(',')[1]),
      epoch: row.epoch,
      clearedAt: row.clearedAt,
      emberUntil: row.emberUntil,
      fallowUntil: row.fallowUntil,
      stage: row.stage,
      originCell: row.originCell,
      site: row.site ? { ...row.site } : null,
      defName: row.site ? (POI_DEFS.get(row.site.defId)?.name ?? row.site.defId) : null,
      zoneId: this.poiLive.get(key)?.zoneId ?? null,
      authoredId: authored.get(key) ?? null,
      finds: (() => {
        const fl = this.findsLive.get(key);
        if (!fl || fl.finds.length === 0) return null;
        const ml = this.minorLedger.get(key);
        return {
          count: fl.finds.length,
          cleared: ml && ml.epoch === row.epoch ? ml.cleared : 0,
        };
      })(),
    }));
    const now = Date.now();
    const calm = [...this.frontierCalm.entries()]
      .filter(([, until]) => until > now)
      .map(([key, until]) => ({
        cellX: Number(key.split(',')[0]),
        cellY: Number(key.split(',')[1]),
        calmUntil: until,
      }));
    return {
      seed: config.worldSeed,
      poiCell: POI_CELL,
      cells,
      credits: this.frontierCredits,
      calm,
      claimRings: this.claimRings().map((r) => ({ ...r })),
      growth: [...this.world.growthLedger.values()].map((r) => ({
        tx: r.tx,
        ty: r.ty,
        state: r.state,
        dialect: growthDialectOf(r.tile) ?? 'sealed',
        sown: r.owner !== null,
        due: r.due,
      })),
    };
  }

  /**
   * POI cell administration — the studio's levers, the /poi chat
   * commands' exact semantics behind an API surface.
   */
  poiCellAction(
    cellX: number,
    cellY: number,
    action: 'reroll' | 'dissolve' | 'force' | 'stage' | 'ember',
    defId?: string,
    /** For 'stage': the rung to set (absent = climb one). */
    stage?: number,
  ): { ok: true; site: PoiSite | null } | { ok: false; error: string } {
    if (!this.poiPrefabs) return { ok: false, error: 'poi system not initialized' };
    const key = poiCellKey(cellX, cellY);
    if (action === 'force' && defId !== undefined && !POI_DEFS.has(defId)) {
      return { ok: false, error: `unknown archetype '${defId}'` };
    }
    // THE LIFECYCLE VERBS (Phase 6): the bench plays the whole living
    // frontier — force a rung, light the ember — with the exact
    // semantics of the /frontier chat levers.
    if (action === 'stage') {
      const row = this.poiLedger.get(key);
      const def = row?.site ? POI_DEFS.get(row.site.defId) : undefined;
      if (!row?.site || !def) return { ok: false, error: 'this cell holds no site to stage' };
      const max = Math.min(FRONTIER.stageMax, def.boldness?.stages.length ?? 0);
      if (max === 0) return { ok: false, error: `${def.name} carries no boldness ladder` };
      const want = Number.isInteger(stage)
        ? Math.max(0, Math.min(stage!, max))
        : Math.min(row.stage + 1, max);
      row.stage = want;
      row.stageAt = Date.now();
      this.accounts.markPoiStage(cellX, cellY, want, row.stageAt);
      this.retirePoiCell(key);
      if (want > 0) this.pushStageRumor(key, def.name, want);
      return { ok: true, site: row.site };
    }
    if (action === 'ember') {
      const row = this.poiLedger.get(key);
      if (!row?.site) return { ok: false, error: 'this cell holds no site to ember' };
      // A staged wipe without the fight: the garrison stands down, the
      // clear stamps, and the linger runs — the ember turn from here.
      this.standDownGarrison(this.poiLive.get(key)?.spawnIdx ?? []);
      row.clearedAt = Date.now();
      row.emberUntil =
        Date.now() + emberLingerFor(config.worldSeed, cellX, cellY, row.epoch);
      this.accounts.markPoiCleared(cellX, cellY, row.emberUntil);
      return { ok: true, site: row.site };
    }
    const prior = this.poiLedger.get(key);
    const epoch = (prior?.epoch ?? 0) + 1;
    if (prior?.site) this.fadePoiDiscoveries(key);
    this.retirePoiCell(key);
    if (action === 'dissolve') {
      // Decided-empty at a fresh epoch: the cell stays quiet until a
      // sweep or an explicit re-roll turns it again.
      this.accounts.recordPoiCell(cellX, cellY, epoch, null);
      this.poiLedger.set(key, {
        epoch,
        site: null,
        clearedAt: null,
        emberUntil: null,
        fallowUntil: null,
        stage: 0,
        stageAt: null,
        originCell: null,
      });
      this.rebuildHavens();
      return { ok: true, site: null };
    }
    this.poiLedger.delete(key);
    const site = this.materializePoiCell(cellX, cellY, {
      epoch,
      ...(action === 'force' ? { force: defId ?? true } : {}),
    });
    return { ok: true, site };
  }

  /**
   * The composed zone standing in a cell — materializing it first if
   * the ledger has decided a site nobody has walked near yet. The
   * studio reads this to open a POI like any other map, and the adopt
   * flow freezes it into an authored zone.
   */
  poiCellZone(cellX: number, cellY: number): ZoneDef | null {
    const key = poiCellKey(cellX, cellY);
    let live = this.poiLive.get(key);
    if (!live?.zoneId) {
      const row = this.poiLedger.get(key);
      if (!row?.site) return null;
      this.materializePoiCell(cellX, cellY);
      live = this.poiLive.get(key);
    }
    return live?.zoneId ? (this.world.zoneById(live.zoneId) ?? null) : null;
  }

  /**
   * The slow pass (every 20 ticks): find the first undecided cell
   * within any player's padded interest window and materialize it —
   * at most ONE cell per pass (the sliced-job law), so a sprinting
   * scout never stalls the tick.
   */
  private tickPois(): void {
    if (!this.poiPrefabs) return;
    const pad = (INTEREST_CHUNK_RADIUS + 2) * CHUNK_SIZE;
    for (const session of this.sessions) {
      if (session.playerEid === null) continue;
      const pos = this.positions.get(session.playerEid);
      if (!pos || pos.y >= DARK_BAND_Y) continue; // the underworld has its own generator
      const c0x = poiCellOf(pos.x - pad);
      const c1x = poiCellOf(pos.x + pad);
      const c0y = poiCellOf(pos.y - pad);
      const c1y = poiCellOf(pos.y + pad);
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          if (this.poiLive.has(poiCellKey(cx, cy))) continue;
          this.materializePoiCell(cx, cy);
          return;
        }
      }
    }
  }

  /**
   * THE FRONTIER CLOCK (the living frontier, phase 1) — the slow pass
   * the epoch turn was missing: fallowSweep only ever ran at boot, so
   * a long-lived server never churned on its own. Every FRONTIER
   * cadence beat, do at most ONE unit of time-driven frontier work
   * (the sliced-job law): dissolve one burnt-out ember, wake one
   * rested fallow cell, or spend one renewal credit. All pacing reads
   * the FRONTIER dial table — never a literal here.
   */
  private tickFrontier(): void {
    if (!this.poiPrefabs) return;
    const now = Date.now();
    // Expired relax windows lift quietly (map first; one DB sweep).
    let calmExpired = false;
    for (const [key, until] of this.frontierCalm) {
      if (until <= now) {
        this.frontierCalm.delete(key);
        calmExpired = true;
      }
    }
    if (calmExpired) this.accounts.pruneFrontierCalm(now);
    // The covetous camp knocks (theatre only — never a state change).
    this.rattleSquatDoors();
    if (this.tickRaidDice(now)) return;
    if (this.dissolveOneEmber(now)) return;
    if (this.wakeOneFallow(now)) return;
    if (this.stageOnePoi(now)) return;
    if (this.seedOneSatellite(now)) return;
    if (this.forkOneToll(now)) return;
    this.spendRenewalCredit(now);
  }

  /**
   * THE EMBER LAW's second half: a cleared site whose linger has run
   * out dissolves — but only with dignity (never in front of anyone).
   * The dissolve fades every chart marker to rumor (rumor-law call
   * site #8 — keep the fade roster in sync), retires the carcass,
   * bumps the epoch, and leaves the cell resting fallow. Each
   * dissolve banks one renewal credit: the trouble moves on, it does
   * not vanish (the conservation law).
   */
  private dissolveOneEmber(now: number): boolean {
    const authored = this.authoredCells();
    for (const [key, row] of this.poiLedger) {
      // An ember clock alone is enough — a cleared camp AND a scattered
      // satellite (emberUntil without clearedAt) both dissolve here.
      if (row.site === null || row.emberUntil === null || now < row.emberUntil) continue;
      if (authored.has(key)) continue; // landmarks never ember
      if (this.playerWithin(row.site.anchorX, row.site.anchorY, FRONTIER.dignityTiles)) continue;
      const { cellX, cellY, defId } = row.site;
      const cleared = row.clearedAt !== null;
      const hadHaven = POI_DEFS.get(defId)?.haven !== undefined;
      this.fadePoiDiscoveries(key);
      this.retirePoiCell(key);
      const epoch = row.epoch + 1;
      const fallowUntil = now + fallowRestFor(config.worldSeed, cellX, cellY, epoch);
      this.accounts.recordPoiCell(cellX, cellY, epoch, null, fallowUntil);
      this.poiLedger.set(key, {
        epoch,
        site: null,
        clearedAt: null,
        emberUntil: null,
        fallowUntil,
        stage: 0,
        stageAt: null,
        originCell: null,
      });
      // THE CONSERVATION LAW pays on PLAYER victories only: a wiped
      // camp banks a credit; a satellite that merely scattered when
      // its core broke does not — one clear is one victory, never a
      // multiplier of trouble elsewhere. THE ROAD'S FORTUNE (Phase 5)
      // is the one addition: a peddler moving on RE-BANKS the credit
      // her arrival spent — fortune was a reprieve, never a payment,
      // and the world still owes its trouble.
      const movedOn = defId === 'peddler_rest';
      if (cleared || movedOn) {
        this.frontierCredits++;
        this.accounts.saveFrontierCredits(this.frontierCredits);
      }
      if (hadHaven) this.rebuildHavens();
      console.log(
        `[frontier] ${movedOn ? 'moved on' : cleared ? 'ember out' : 'scattered'}: ` +
          `${defId} at cell ${key} dissolves — ` +
          `fallow ${Math.round((fallowUntil - now) / 60000)}m, ` +
          `renewal debt ${this.frontierCredits}`,
      );
      return true;
    }
    return false;
  }

  /**
   * A rested fallow cell decides itself again on its post-dissolve
   * epoch — fresh streams, so whatever stands is a NEW roll (different
   * archetype, different anchor, or honest emptiness), never the old
   * camp reborn. Deferred while anyone stands close enough to watch
   * tents pitch themselves.
   */
  private wakeOneFallow(now: number): boolean {
    if (!this.poiPrefabs) return false;
    const authored = this.authoredCells();
    for (const [key, row] of this.poiLedger) {
      if (row.site !== null || row.fallowUntil === null || now < row.fallowUntil) continue;
      if (authored.has(key)) continue; // the seeder owns these
      const [cx, cy] = key.split(',').map(Number);
      // THE RELAX WINDOW: a calmed valley stays quiet — the wake waits
      // out the window rather than standing a new camp into it.
      if (this.calmNear(cx!, cy!, now)) continue;
      const ctx = this.poiCtx();
      const site = poiForCell(config.worldSeed, cx!, cy!, row.epoch, ctx);
      if (site && this.playerWithin(site.anchorX, site.anchorY, FRONTIER.dignityTiles)) {
        return true; // someone is standing on the meadow — retry next pass
      }
      this.accounts.recordPoiCell(
        cx!,
        cy!,
        row.epoch,
        site && {
          poiId: site.defId,
          prefabId: site.prefabId,
          tier: site.tier,
          anchorX: site.anchorX,
          anchorY: site.anchorY,
        },
      );
      this.poiLedger.set(key, {
        epoch: row.epoch,
        site,
        clearedAt: null,
        emberUntil: null,
        fallowUntil: null,
        stage: 0,
        stageAt: null,
        originCell: null,
      });
      if (site) {
        this.poiLive.delete(key); // tickPois stands it when someone nears
        if (POI_DEFS.get(site.defId)?.haven) this.rebuildHavens();
        console.log(
          `[frontier] fallow wakes: ${site.defId} rises at ` +
            `${site.anchorX},${site.anchorY} (cell ${key})`,
        );
      }
      return true;
    }
    return false;
  }

  /**
   * THE CONSERVATION LAW's spend: a banked credit stands a fresh
   * forced roll in the offscreen ring around a random online player —
   * past dignity and the screen, inside the materialization pad, never
   * on authored cells, standing sites, or resting fallow ground. No
   * lawful candidate this pass = the debt waits; it never rushes a
   * bad site.
   */
  private spendRenewalCredit(now: number): boolean {
    if (this.frontierCredits <= 0 || !this.poiPrefabs) return false;
    const surface: EntityId[] = [];
    for (const [eid, player] of this.players) {
      if (player.session === null && player.disconnectedAt !== null) continue;
      const pos = this.positions.get(eid);
      if (pos && pos.y < DARK_BAND_Y) surface.push(eid);
    }
    if (surface.length === 0) return false;
    const around = this.positions.get(surface[Math.floor(Math.random() * surface.length)]!)!;
    const [rMin, rMax] = FRONTIER.renewalRing;
    const points: Array<{ tx: number; ty: number }> = [];
    for (let t = 0; t < FRONTIER.renewalTries; t++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = rMin + Math.random() * (rMax - rMin);
      points.push({
        tx: Math.round(around.x + Math.cos(ang) * dist),
        ty: Math.round(around.y + Math.sin(ang) * dist),
      });
    }
    // THE ROAD'S FORTUNE (Phase 5): occasionally the spent credit deals
    // fortune instead of trouble — a peddler's rest, road-true, rare,
    // transient. When she refuses every candidate the credit falls back
    // to ordinary trouble; the debt is honored either way, and her
    // eventual dissolve RE-BANKS it (a reprieve, never a payment).
    if (Math.random() < FRONTIER.peddlerChance && this.standOnePeddler(points, now)) {
      this.frontierCredits--;
      this.accounts.saveFrontierCredits(this.frontierCredits);
      return true;
    }
    const authored = this.authoredCells();
    const ctx = this.poiCtx();
    for (const { tx, ty } of points) {
      if (ty >= DARK_BAND_Y - ZONE_CLEARANCE) continue;
      const cx = poiCellOf(tx);
      const cy = poiCellOf(ty);
      const key = poiCellKey(cx, cy);
      if (authored.has(key)) continue;
      const row = this.poiLedger.get(key);
      if (row?.site) continue; // already hosts
      if (row?.fallowUntil !== null && row?.fallowUntil !== undefined && now < row.fallowUntil) {
        continue; // resting — the meadow heals first
      }
      if (this.calmNear(cx, cy, now)) continue; // the relax window holds
      const epoch = (row?.epoch ?? 0) + 1;
      const site = poiForCell(config.worldSeed, cx, cy, epoch, ctx, true);
      if (!site) continue;
      if (this.playerWithin(site.anchorX, site.anchorY, FRONTIER.dignityTiles)) continue;
      this.accounts.recordPoiCell(cx, cy, epoch, {
        poiId: site.defId,
        prefabId: site.prefabId,
        tier: site.tier,
        anchorX: site.anchorX,
        anchorY: site.anchorY,
      });
      this.poiLedger.set(key, {
        epoch,
        site,
        clearedAt: null,
        emberUntil: null,
        fallowUntil: null,
        stage: 0,
        stageAt: null,
        originCell: null,
      });
      this.poiLive.delete(key);
      this.frontierCredits--;
      this.accounts.saveFrontierCredits(this.frontierCredits);
      if (POI_DEFS.get(site.defId)?.haven) this.rebuildHavens();
      console.log(
        `[frontier] the trouble moves on: ${site.defId} rises at ` +
          `${site.anchorX},${site.anchorY} (cell ${key}) — renewal debt ${this.frontierCredits}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Stand ONE peddler's rest at the most road-true lawful candidate —
   * fortune walks the roads. Her laws: never on authored cells,
   * standing sites, resting ground, or inside a relax window (the ctx
   * rings keep her out of every claimed yard); at most one peddler per
   * region; never in a region with an active raid (she reads the
   * weather); dignity like everyone else. The ember clock is stamped
   * ON ARRIVAL — nobody solves a peddler, she just moves on.
   */
  private standOnePeddler(
    points: ReadonlyArray<{ tx: number; ty: number }>,
    now: number,
  ): PoiSite | null {
    if (!this.poiPrefabs || !POI_DEFS.has('peddler_rest')) return null;
    const authored = this.authoredCells();
    const ctx = this.poiCtx();
    const ranked = points
      .map((p) => ({ ...p, road: roadDistanceAt(config.worldSeed, p.tx, p.ty) }))
      .sort((a, b) => a.road - b.road);
    for (const { tx, ty } of ranked) {
      if (ty >= DARK_BAND_Y - ZONE_CLEARANCE) continue;
      const cx = poiCellOf(tx);
      const cy = poiCellOf(ty);
      const key = poiCellKey(cx, cy);
      if (authored.has(key)) continue;
      const row = this.poiLedger.get(key);
      if (row?.site) continue;
      if (row?.fallowUntil !== null && row?.fallowUntil !== undefined && now < row.fallowUntil) {
        continue;
      }
      if (this.calmNear(cx, cy, now)) continue;
      // One cart per region; and she never parks beside an active raid.
      let crowded = false;
      for (const r of this.poiLedger.values()) {
        if (r.site === null) continue;
        const near =
          Math.abs(r.site.cellX - cx) <= FRONTIER.regionCells &&
          Math.abs(r.site.cellY - cy) <= FRONTIER.regionCells;
        if (!near) continue;
        if (r.site.defId === 'peddler_rest') crowded = true;
        if (r.site.defId === 'raider_squat' && r.emberUntil === null) crowded = true;
        if (crowded) break;
      }
      if (crowded) continue;
      const epoch = (row?.epoch ?? 0) + 1;
      const site = poiForCell(config.worldSeed, cx, cy, epoch, ctx, 'peddler_rest');
      if (!site) continue;
      if (this.playerWithin(site.anchorX, site.anchorY, FRONTIER.dignityTiles)) continue;
      const emberUntil = now + peddlerLingerFor(config.worldSeed, cx, cy, epoch);
      this.accounts.recordPoiCell(cx, cy, epoch, {
        poiId: site.defId,
        prefabId: site.prefabId,
        tier: site.tier,
        anchorX: site.anchorX,
        anchorY: site.anchorY,
      });
      this.accounts.setPoiEmber(cx, cy, emberUntil);
      this.poiLedger.set(key, {
        epoch,
        site,
        clearedAt: null,
        emberUntil,
        fallowUntil: null,
        stage: 0,
        stageAt: null,
        originCell: null,
      });
      this.poiLive.delete(key);
      console.log(
        `[frontier] fortune on the road: a peddler's rest stands at ` +
          `${site.anchorX},${site.anchorY} (cell ${key}) for ~${Math.round((emberUntil - now) / 60000)}m`,
      );
      return site;
    }
    return null;
  }

  /** Is a relax window standing within the neighborhood of this cell? */
  private calmNear(cellX: number, cellY: number, now: number): boolean {
    for (const [key, until] of this.frontierCalm) {
      if (until <= now) continue;
      const [kx, ky] = key.split(',').map(Number);
      if (
        Math.abs(kx! - cellX) <= FRONTIER.regionCells &&
        Math.abs(ky! - cellY) <= FRONTIER.regionCells
      ) {
        return true;
      }
    }
    return false;
  }

  /** Stamp a relax window at a cell (every garrison wipe lands here). */
  private stampCalm(cellX: number, cellY: number): void {
    const until = Date.now() + FRONTIER.calmMs;
    const key = poiCellKey(cellX, cellY);
    this.frontierCalm.set(key, Math.max(this.frontierCalm.get(key) ?? 0, until));
    this.accounts.stampFrontierCalm(cellX, cellY, until);
  }

  /** Stage-2+ cores standing within the neighborhood (the regional roof). */
  private boldCoresNear(cellKey: string): number {
    const [cx, cy] = cellKey.split(',').map(Number);
    let cores = 0;
    for (const [key, row] of this.poiLedger) {
      if (key === cellKey) continue;
      if (row.site === null || row.originCell !== null) continue;
      if (row.stage < FRONTIER.satelliteStage) continue;
      const [kx, ky] = key.split(',').map(Number);
      if (
        Math.abs(kx! - cx!) <= FRONTIER.regionCells &&
        Math.abs(ky! - cy!) <= FRONTIER.regionCells
      ) {
        cores++;
      }
    }
    return cores;
  }

  /** The stage-up rumor + pip push to every online holder of the marker. */
  private pushStageRumor(cellKey: string, defName: string, stage: number): void {
    const id = `poi:${cellKey}`;
    const lines = [
      `Word from the road: ${defName} grows bolder — more fires burn there than before.`,
      `${defName} musters in numbers now — its watchers walk a wider round.`,
      `${defName} stands at full strength — the frontier waits for an answer.`,
    ];
    const text = lines[Math.min(stage, lines.length) - 1]!;
    for (const player of this.players.values()) {
      const d = player.discoveries.get(id);
      if (!d || d.faded) continue;
      d.stage = stage;
      player.session?.sendJson({ t: 'discoverystage', id, stage });
      player.session?.sendJson({ t: 'chat', channel: 'system', text });
    }
  }

  /**
   * THE BOLDNESS LADDER's clock: a DISCOVERED, standing, unanswered
   * site climbs one rung after its stage wait — busier muster, wider
   * dressing, never a deadlier band (the frequency law lives in the
   * validator). The clock only starts at first discovery (an unseen
   * camp costs nothing; walking past never escalates), holds through
   * relax windows, respects the regional roof, and recomposes the
   * standing camp only when nobody is close enough to watch tents
   * pitch themselves.
   */
  private stageOnePoi(now: number): boolean {
    const authored = this.authoredCells();
    for (const [key, row] of this.poiLedger) {
      if (row.site === null || row.clearedAt !== null || row.emberUntil !== null) continue;
      if (row.originCell !== null) continue; // satellites never climb — only cores
      if (authored.has(key)) continue;
      const def = POI_DEFS.get(row.site.defId);
      if (!def?.boldness) continue;
      if (row.stage >= Math.min(FRONTIER.stageMax, def.boldness.stages.length)) continue;
      if (!this.discoveredPoiCells.has(key)) continue;
      const { cellX, cellY } = row.site;
      if (row.stageAt === null) {
        // First discovery arms the clock — from here, only time moves it.
        row.stageAt = now;
        this.accounts.markPoiStage(cellX, cellY, row.stage, now);
        return true;
      }
      if (now - row.stageAt < stageWaitFor(config.worldSeed, cellX, cellY, row.stage)) continue;
      if (this.calmNear(cellX, cellY, now)) continue;
      if (
        row.stage + 1 >= FRONTIER.satelliteStage &&
        this.boldCoresNear(key) >= FRONTIER.regionBoldMax
      ) {
        continue; // the regional roof holds
      }
      if (this.playerWithin(row.site.anchorX, row.site.anchorY, FRONTIER.dignityTiles)) continue;
      row.stage += 1;
      row.stageAt = now;
      this.accounts.markPoiStage(cellX, cellY, row.stage, now);
      // Recompose in place: retire the standing carcass-free zone and
      // let tickPois re-stand it from the ledger at the new stage.
      this.retirePoiCell(key);
      this.pushStageRumor(key, def.name, row.stage);
      console.log(`[frontier] ${def.name} at cell ${key} climbs to stage ${row.stage}`);
      return true;
    }
    return false;
  }

  /**
   * THE SPREAD, with a heart: a stage-2+ core may keep up to
   * satelliteMax satellite camps of its own archetype in adjacent
   * cells, biased townward — the pressure visibly creeps. Satellites
   * die with the core (source-and-kill-switch, notePoiKill), never
   * climb rungs, and never sprawl further. Orphans (core evicted by a
   * studio sweep) scatter here. One accepted wart: origin points at a
   * CELL, so a dev-lever reroll that stands a NEW camp in the core's
   * cell quietly adopts the family — the stranger's outposts die with
   * the stranger. Organic dissolves record the cell empty first, so
   * the orphan watch always catches the real lifecycle.
   */
  /**
   * Why the last satellite pass refused each candidate — surfaced by
   * /frontier tick so a designer can read the bounds working ("all
   * three townward cells occupied" is the system honest, not broken).
   */
  private satTrace: string[] = [];
  private seedOneSatellite(now: number): boolean {
    if (!this.poiPrefabs) return false;
    this.satTrace = [];
    const authored = this.authoredCells();
    // Orphan watch first: a satellite whose core no longer stands
    // scatters — the family law holds even when the core died to a
    // sweep instead of a sword.
    for (const [key, row] of this.poiLedger) {
      if (row.originCell === null || row.site === null || row.emberUntil !== null) continue;
      const hearthOwner = GameServer.hearthOwnerOf(row.originCell);
      if (hearthOwner !== null) {
        // A hearth-tied squat is orphaned when the CLAIM dissolves —
        // unclaim (or lose) your bed and the covetous camp loses
        // interest in a yard that no longer exists.
        if (this.homesByCharacter.has(hearthOwner)) continue;
      } else {
        const core = this.poiLedger.get(row.originCell);
        if (core?.site && core.clearedAt === null) continue; // the core stands
      }
      row.emberUntil =
        now + scatterLingerFor(config.worldSeed, row.site.cellX, row.site.cellY);
      this.standDownGarrison(this.poiLive.get(key)?.spawnIdx ?? []);
      this.accounts.setPoiEmber(row.site.cellX, row.site.cellY, row.emberUntil);
      console.log(`[frontier] orphan satellite at cell ${key} scatters`);
      return true;
    }
    for (const [key, row] of this.poiLedger) {
      if (row.site === null || row.clearedAt !== null || row.emberUntil !== null) continue;
      if (row.originCell !== null) continue;
      if (authored.has(key)) continue;
      const def = POI_DEFS.get(row.site.defId);
      if (!def?.boldness?.satellites) continue;
      if (row.stage < FRONTIER.satelliteStage) continue;
      let sats = 0;
      for (const r of this.poiLedger.values()) {
        if (r.originCell === key && r.site !== null && r.emberUntil === null) sats++;
      }
      if (sats >= FRONTIER.satelliteMax) continue;
      const { cellX, cellY } = row.site;
      if (this.calmNear(cellX, cellY, now)) continue;
      // Adjacent cells ranked townward: the camp creeps toward the
      // roads it means to prey on, never away into empty country.
      const anchors = this.dangerAnchors();
      const ranked = [
        [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
      ]
        .map(([dx, dy]) => {
          const ncx = cellX + dx!;
          const ncy = cellY + dy!;
          const wx = ncx * POI_CELL + POI_CELL / 2;
          const wy = ncy * POI_CELL + POI_CELL / 2;
          let best = Infinity;
          for (const a of anchors) best = Math.min(best, Math.hypot(a.x - wx, a.y - wy));
          return { ncx, ncy, d: best };
        })
        .sort((a, b) => a.d - b.d);
      const ctx = this.poiCtx();
      for (const cand of ranked.slice(0, 3)) {
        const nkey = poiCellKey(cand.ncx, cand.ncy);
        if (authored.has(nkey)) { this.satTrace.push(`${nkey}:authored`); continue; }
        const nrow = this.poiLedger.get(nkey);
        if (nrow?.site) { this.satTrace.push(`${nkey}:occupied`); continue; }
        if (nrow?.fallowUntil !== null && nrow?.fallowUntil !== undefined && now < nrow.fallowUntil)
          { this.satTrace.push(`${nkey}:fallow`); continue; }
        if (this.calmNear(cand.ncx, cand.ncy, now)) { this.satTrace.push(`${nkey}:calm`); continue; }
        const epoch = (nrow?.epoch ?? 0) + 1;
        // THE WAR-GROUND's reach (Phase 4): a hold seeds its
        // satelliteDef — ordinary camps townward, never sibling holds
        // (the region law would refuse them anyway).
        const satDefId = def.boldness?.satelliteDef ?? def.id;
        const site = poiForCell(config.worldSeed, cand.ncx, cand.ncy, epoch, ctx, satDefId);
        if (!site) { this.satTrace.push(`${nkey}:noground`); continue; }
        if (this.playerWithin(site.anchorX, site.anchorY, FRONTIER.dignityTiles)) { this.satTrace.push(`${nkey}:dignity`); continue; }
        this.accounts.recordPoiCell(
          cand.ncx,
          cand.ncy,
          epoch,
          {
            poiId: site.defId,
            prefabId: site.prefabId,
            tier: site.tier,
            anchorX: site.anchorX,
            anchorY: site.anchorY,
          },
          null,
          key,
        );
        this.poiLedger.set(nkey, {
          epoch,
          site,
          clearedAt: null,
          emberUntil: null,
          fallowUntil: null,
          stage: 0,
          stageAt: null,
          originCell: key,
        });
        this.poiLive.delete(nkey);
        for (const player of this.players.values()) {
          const d = player.discoveries.get(`poi:${key}`);
          if (!d || d.faded) continue;
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `${def.name}'s fires multiply — a second camp has risen nearby.`,
          });
        }
        console.log(
          `[frontier] satellite of ${def.name} (cell ${key}) rises at ` +
            `${site.anchorX},${site.anchorY} (cell ${nkey})`,
        );
        return true;
      }
    }
    return false;
  }

  /**
   * THE CREEP ANSWERED (Phase 3.3): a FULL-strength family standing
   * unanswered inside a town's marches past its creep wait never sacks
   * the town — tier 0 is law. It forks the road instead: a road_toll
   * micro-site stands in the most road-true townward cell at the
   * family's edge, owned by the core (originCell), so breaking either
   * the toll or the family resolves both (notePoiKill both ways). The
   * failure state is more game on the road, never less town. One toll
   * per family, towns' guards name it through world:toll_near.
   */
  private tollTrace: string[] = [];
  private forkOneToll(now: number): boolean {
    if (!this.poiPrefabs || !POI_DEFS.has('road_toll')) return false;
    this.tollTrace = [];
    const authored = this.authoredCells();
    for (const [key, row] of this.poiLedger) {
      if (row.site === null || row.clearedAt !== null || row.emberUntil !== null) continue;
      if (row.originCell !== null) continue; // cores fork, families don't
      if (authored.has(key)) continue;
      const def = POI_DEFS.get(row.site.defId);
      if (!def?.boldness?.satellites) continue; // only the spreading kinds
      const top = Math.min(FRONTIER.stageMax, def.boldness.stages.length);
      if (row.stage < top) continue; // full strength only
      const { cellX, cellY, anchorX, anchorY } = row.site;
      // Inside a town's marches? The toll answers a TOWN's road.
      let town: { x: number; y: number } | null = null;
      let townD = Infinity;
      for (const a of SETTLED_ANCHORS) {
        const d = Math.hypot(a.x - anchorX, a.y - anchorY);
        if (d <= FRONTIER.marchTiles && d < townD) {
          town = a;
          townD = d;
        }
      }
      if (!town) continue;
      // The creep clock runs from the moment the top rung began.
      if (row.stageAt === null) continue;
      if (now - row.stageAt < creepWaitFor(config.worldSeed, cellX, cellY)) continue;
      // One toll per family.
      let hasToll = false;
      for (const r of this.poiLedger.values()) {
        if (r.originCell === key && r.site?.defId === 'road_toll' && r.emberUntil === null) {
          hasToll = true;
          break;
        }
      }
      if (hasToll) continue;
      if (this.calmNear(cellX, cellY, now)) continue;
      // Candidate cells ranked toward THIS town, road-trueness first:
      // the toll stands on the road it means to choke, at the family's
      // townward edge.
      const anchors = this.dangerAnchors();
      const ranked = [
        [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
      ]
        .map(([dx, dy]) => {
          const ncx = cellX + dx!;
          const ncy = cellY + dy!;
          const wx = ncx * POI_CELL + POI_CELL / 2;
          const wy = ncy * POI_CELL + POI_CELL / 2;
          const dTown = Math.hypot(town!.x - wx, town!.y - wy);
          // Roads pull hard: a cell the road crosses beats a nearer
          // trackless one — the bar goes where the carts go.
          const dRoad = Math.min(roadDistanceAt(config.worldSeed, wx, wy), POI_CELL);
          return { ncx, ncy, score: dTown + dRoad * 3 };
        })
        .sort((a, b) => a.score - b.score);
      const ctx = this.poiCtx();
      for (const cand of ranked.slice(0, 3)) {
        const nkey = poiCellKey(cand.ncx, cand.ncy);
        if (authored.has(nkey)) { this.tollTrace.push(`${nkey}:authored`); continue; }
        const nrow = this.poiLedger.get(nkey);
        if (nrow?.site) { this.tollTrace.push(`${nkey}:occupied`); continue; }
        if (nrow?.fallowUntil !== null && nrow?.fallowUntil !== undefined && now < nrow.fallowUntil)
          { this.tollTrace.push(`${nkey}:fallow`); continue; }
        if (this.calmNear(cand.ncx, cand.ncy, now)) { this.tollTrace.push(`${nkey}:calm`); continue; }
        const epoch = (nrow?.epoch ?? 0) + 1;
        const site = poiForCell(config.worldSeed, cand.ncx, cand.ncy, epoch, ctx, 'road_toll');
        if (!site) { this.tollTrace.push(`${nkey}:noground`); continue; }
        if (this.playerWithin(site.anchorX, site.anchorY, FRONTIER.dignityTiles))
          { this.tollTrace.push(`${nkey}:dignity`); continue; }
        this.accounts.recordPoiCell(
          cand.ncx,
          cand.ncy,
          epoch,
          {
            poiId: site.defId,
            prefabId: site.prefabId,
            tier: site.tier,
            anchorX: site.anchorX,
            anchorY: site.anchorY,
          },
          null,
          key,
        );
        this.poiLedger.set(nkey, {
          epoch,
          site,
          clearedAt: null,
          emberUntil: null,
          fallowUntil: null,
          stage: 0,
          stageAt: null,
          originCell: key,
        });
        this.poiLive.delete(nkey);
        for (const player of this.players.values()) {
          const d = player.discoveries.get(`poi:${key}`);
          if (!d || d.faded) continue;
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `${def.name} grows greedy — a toll bar has gone up on the townward road.`,
          });
        }
        console.log(
          `[frontier] ${def.name} (cell ${key}) forks the road — toll at ` +
            `${site.anchorX},${site.anchorY} (cell ${nkey})`,
        );
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------ the covetous dice

  /** The squat's family tie: originCell = the hearth it covets. */
  private static hearthOrigin(characterId: number): string {
    return `hearth:${characterId}`;
  }

  /** Parse a hearth-tied origin back to its settler, or null. */
  private static hearthOwnerOf(originCell: string | null | undefined): number | null {
    if (!originCell || !originCell.startsWith('hearth:')) return null;
    const id = Number(originCell.slice(7));
    return Number.isFinite(id) ? id : null;
  }

  /** When the global dice next roll (the Valheim law: one clock, one shard). */
  private nextRaidRollAt = Date.now() + FRONTIER.raidRollMs;
  /** Why the last raid pass refused — the /frontier raid lever reads it. */
  private raidTrace: string[] = [];

  /**
   * THE COVETOUS CAMP (Phase 4.2): every raidRollMs, ONE roll per
   * shard at raidChance — most rolls pass in silence. A success picks
   * ONE qualifying settler (attended, near their own claim, ring in
   * wild land, no mercy stamp, not warded, not already coveted) and
   * stands a raider_squat in the nearest lawful cell at the claim's
   * edge: outside the ring + standoff, outside anyone's view, facing
   * the hearth it covets. Merciful by construction: never while the
   * owner is away, never inside the yard, never destroys a tile —
   * and the defender's bounty is stamped the moment the fuse lights.
   */
  private tickRaidDice(now: number, force = false): boolean {
    if (!this.poiPrefabs) return false;
    if (!force) {
      if (now < this.nextRaidRollAt) return false;
      this.nextRaidRollAt = now + FRONTIER.raidRollMs;
      if (Math.random() >= FRONTIER.raidChance) return false; // silence
    }
    this.raidTrace = [];
    const authored = this.authoredCells();
    // The qualifying settlers — every gate is a mercy law.
    const qualified: Array<{ eid: EntityId; player: PlayerComp }> = [];
    for (const [eid, player] of this.players) {
      const who = player.characterId;
      if (player.session === null || who <= 0) continue; // attended only
      const home = player.home;
      if (!home) continue;
      if (player.hearthWarded) {
        this.raidTrace.push(`${who}:warded`);
        continue;
      }
      if (now < player.raidCalmUntil) {
        this.raidTrace.push(`${who}:calm`);
        continue;
      }
      if (this.liveDangerTier(home.x, home.y) < 1) {
        this.raidTrace.push(`${who}:settled`);
        continue; // town claims are the town's problem, never raided
      }
      const pos = this.positions.get(eid);
      if (!pos || Math.hypot(pos.x - home.x, pos.y - home.y) > FRONTIER.watchTiles) {
        this.raidTrace.push(`${who}:away`);
        continue; // the owner must be HOME — an empty house draws nobody
      }
      let coveted = false;
      for (const r of this.poiLedger.values()) {
        if (r.site !== null && r.emberUntil === null &&
            GameServer.hearthOwnerOf(r.originCell) === who) {
          coveted = true;
          break;
        }
      }
      if (coveted) {
        this.raidTrace.push(`${who}:coveted`);
        continue; // one squat at a time — never a siege
      }
      qualified.push({ eid, player });
    }
    if (qualified.length === 0) return false;
    const pick = qualified[Math.floor(Math.random() * qualified.length)]!;
    const home = pick.player.home!;
    const who = pick.player.characterId;
    const ring = this.claimRings().find((r) => r.x === home.x && r.y === home.y);
    const ringR = ring?.r ?? FRONTIER.claimR;
    // Candidate cells: the hearth's own cell and its 8 neighbors,
    // nearest first — the squat stands at the edge, not the horizon.
    const hcx = poiCellOf(home.x);
    const hcy = poiCellOf(home.y);
    const ranked: Array<{ cx: number; cy: number; d: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = hcx + dx;
        const cy = hcy + dy;
        ranked.push({
          cx,
          cy,
          d: Math.hypot(cx * POI_CELL + POI_CELL / 2 - home.x, cy * POI_CELL + POI_CELL / 2 - home.y),
        });
      }
    }
    ranked.sort((a, b) => a.d - b.d);
    const ctx = this.poiCtx();
    for (const cand of ranked) {
      const nkey = poiCellKey(cand.cx, cand.cy);
      if (authored.has(nkey)) { this.raidTrace.push(`${nkey}:authored`); continue; }
      const nrow = this.poiLedger.get(nkey);
      if (nrow?.site) { this.raidTrace.push(`${nkey}:occupied`); continue; }
      if (nrow?.fallowUntil !== null && nrow?.fallowUntil !== undefined && now < nrow.fallowUntil)
        { this.raidTrace.push(`${nkey}:fallow`); continue; }
      const epoch = (nrow?.epoch ?? 0) + 1;
      // The ctx carries the claim rings, so the squat can never stand
      // inside ANY yard — including the one it covets.
      const site = poiForCell(config.worldSeed, cand.cx, cand.cy, epoch, ctx, 'raider_squat');
      if (!site) { this.raidTrace.push(`${nkey}:noground`); continue; }
      // MERCY BY CONSTRUCTION: a forced roll inherits the LAND's tier,
      // but a squat is small and craven by charter — cap it at the
      // def's own ceiling so a settler brave enough to bed down in
      // tier-5 country gets a harassment, never a warcamp (a tier-5
      // squat mustered seven bodies and killed its settler in testing).
      site.tier = Math.min(site.tier, POI_DEFS.get('raider_squat')?.tiers[1] ?? site.tier);
      const dHome = Math.hypot(site.anchorX - home.x, site.anchorY - home.y);
      if (dHome < ringR + FRONTIER.raidStandoffTiles)
        { this.raidTrace.push(`${nkey}:tooclose`); continue; }
      if (this.playerWithin(site.anchorX, site.anchorY, FRONTIER.dignityTiles))
        { this.raidTrace.push(`${nkey}:dignity`); continue; }
      this.accounts.recordPoiCell(
        cand.cx,
        cand.cy,
        epoch,
        {
          poiId: site.defId,
          prefabId: site.prefabId,
          tier: site.tier,
          anchorX: site.anchorX,
          anchorY: site.anchorY,
        },
        null,
        GameServer.hearthOrigin(who),
      );
      this.poiLedger.set(nkey, {
        epoch,
        site,
        clearedAt: null,
        emberUntil: null,
        fallowUntil: null,
        stage: 0,
        stageAt: null,
        originCell: GameServer.hearthOrigin(who),
      });
      this.poiLive.delete(nkey);
      // THE FUSE: the horn carries to everyone near the camp AND to
      // the owner wherever they stand in their yard; the line names
      // the bearing; the defender's bounty is stamped so breaking the
      // squat pays through the one Phase 3 pipeline; and the chart
      // takes the pip through the one discovery ceremony.
      const horn: S2CFx = { t: 'fx', kind: 'horn', x: site.anchorX, y: site.anchorY, radius: 1 };
      this.broadcastFx(horn);
      const opos = this.positions.get(pick.eid);
      if (opos && (Math.abs(opos.x - horn.x) >= 40 || Math.abs(opos.y - horn.y) >= 40)) {
        pick.player.session?.sendJson(horn);
      }
      this.setPlayerFlag(pick.player, bountyFlag(nkey));
      pick.player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text:
          `Torchlight gathers past your fence-line, ${compass8(site.anchorX - home.x, site.anchorY - home.y)} — ` +
          'someone covets what you have built.',
      });
      this.recordDiscovery(
        pick.player,
        {
          id: `poi:${nkey}`,
          kind: 'poi',
          name: POI_DEFS.get('raider_squat')?.name ?? 'Raider squat',
          x: site.anchorX,
          y: site.anchorY,
          tier: site.tier,
        },
        epoch,
      );
      console.log(`[frontier] raid squat covets hearth of character ${who} at cell ${nkey}`);
      return true;
    }
    return false;
  }

  /**
   * THE HARASSMENT BEAT (never a breach): a squat body that has pushed
   * up to the coveted homestead's shut door rattles it — theatre on
   * the one fx wire; hostiles still never LEARN doors. Runs on the
   * frontier cadence, bounded by the handful of standing squats.
   */
  private rattleSquatDoors(): void {
    for (const [key, row] of this.poiLedger) {
      const who = GameServer.hearthOwnerOf(row.originCell);
      if (who === null || row.site === null || row.emberUntil !== null) continue;
      const live = this.poiLive.get(key);
      if (!live) continue;
      for (const i of live.spawnIdx) {
        const s = this.spawnPoints[i];
        if (!s?.active || s.eid === null || !this.poiSpawnFights(s)) continue;
        const bpos = this.positions.get(s.eid);
        if (!bpos) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const tx = Math.floor(bpos.x) + dx;
            const ty = Math.floor(bpos.y) + dy;
            const built = this.world.builtAt(tx, ty);
            if (!built || built.owner !== who) continue;
            const info = doorInfo(built.tile);
            if (!info || info.open) continue;
            if (Math.random() < 0.5) continue; // sometimes they just breathe
            this.broadcastFx({ t: 'fx', kind: 'rattle', x: tx + 0.5, y: ty + 0.5, radius: 0.5 });
            return; // one knock per beat is plenty of dread
          }
        }
      }
    }
  }

  /**
   * Decide (or recall) a cell and stand its POI up as a tiny zone
   * through the SAME machinery authored zones use: addZone + client
   * chunk drop + tagged registerSpawns — retire is free by
   * construction. The ledger records the decision (deviations only:
   * settled tier-0 cells are skipped, they can never host a POI).
   */
  private materializePoiCell(
    cellX: number,
    cellY: number,
    opts: { force?: string | true; epoch?: number } = {},
  ): PoiSite | null {
    if (!this.poiPrefabs) return null;
    const key = poiCellKey(cellX, cellY);
    const ctx = this.poiCtx();
    let row = this.poiLedger.get(key);
    if (!row || opts.epoch !== undefined) {
      const epoch = opts.epoch ?? 0;
      // THE REGION LAW (Phase 4): a fresh organic decision may promote
      // to a war-ground only when the neighborhood holds none. Forced
      // rolls (dev levers, authored seeding) answer for themselves.
      const allowHold =
        opts.force === undefined &&
        !this.holdsNear(cellX, cellY) &&
        // The hold is the country's fist; the capital is its seat —
        // they never share a neighborhood.
        !this.capitalNearCell(cellX, cellY);
      const site = poiForCell(config.worldSeed, cellX, cellY, epoch, ctx, opts.force, allowHold);
      row = { epoch, site, clearedAt: null, emberUntil: null, fallowUntil: null, stage: 0, stageAt: null, originCell: null };
      // Deviations only: a settled cell writes no row (it is 0 by law).
      const centerTier = this.liveDangerTier(
        cellX * POI_CELL + POI_CELL / 2,
        cellY * POI_CELL + POI_CELL / 2,
      );
      if (site !== null || centerTier > 0) {
        this.accounts.recordPoiCell(
          cellX,
          cellY,
          epoch,
          site && {
            poiId: site.defId,
            prefabId: site.prefabId,
            tier: site.tier,
            anchorX: site.anchorX,
            anchorY: site.anchorY,
          },
        );
        this.poiLedger.set(key, row);
        // A fresh decision may have lit (or re-rolled away) a lamp.
        if (POI_DEFS.get(site?.defId ?? '')?.haven || opts.epoch !== undefined) {
          this.rebuildHavens();
        }
      }
    }
    if (!row.site) {
      this.poiLive.set(key, { spawnIdx: [] });
      this.standFinds(cellX, cellY, row.epoch, null);
      return null;
    }
    // A hearth-tied squat faces the claim it covets — the worn track,
    // the scatter, and the watchers all orient on the homestead.
    const squatOwner = GameServer.hearthOwnerOf(row.originCell);
    const face = squatOwner !== null ? this.homesByCharacter.get(squatOwner) : undefined;
    const zone = composePoi(config.worldSeed, row.site, ctx, row.stage, face);
    if (!zone) {
      // A ledger row referencing retired content — stand nothing, keep
      // the row (an edit or revert can bring it back).
      console.warn(`[poi] cell ${key}: cannot compose '${row.site.defId}' — content missing`);
      this.poiLive.set(key, { spawnIdx: [] });
      this.standFinds(cellX, cellY, row.epoch, { x: row.site.anchorX, y: row.site.anchorY });
      return null;
    }
    this.world.addZone(zone);
    this.dropClientChunks(zone);
    const spawnIdx = this.registerSpawns(zone.spawns ?? [], zone.id);
    for (const i of spawnIdx) this.poiSpawnCells.set(i, key);
    // THE EMBER LAW, restart-safe: a cleared cell (or a scattered
    // satellite — ember with no clear) re-materializes as the carcass
    // it is — the zone stands (tents, cold fires, the opened chest),
    // but the fighting garrison stays down. Livestock and staff keep
    // their lives; only the broken muster is denied.
    if (row.clearedAt !== null || row.emberUntil !== null) this.standDownGarrison(spawnIdx);
    // The friendly staff stands up through the actor machinery —
    // identity, disposition, protection, dialogue, and shop all ride
    // the same laws the town's own people keep.
    if (zone.actorSpawns && zone.actorSpawns.length > 0) {
      this.registerActorSpawns(zone.actorSpawns, zone.id);
    }
    // Strongbox overrides: the def's loot table and ward, addressed by
    // the chest's world tile (the tile is the state — the override
    // rides beside it).
    const def = POI_DEFS.get(row.site.defId);
    if (def && (def.chestLoot !== undefined || def.chestWarded)) {
      for (let i = 0; i < zone.ground.length; i++) {
        const info = chestInfo(zone.ground[i]!);
        if (!info || info.open) continue;
        const wx = zone.origin.x + (i % zone.width);
        const wy = zone.origin.y + Math.floor(i / zone.width);
        this.poiChests.set(`${wx},${wy}`, {
          cell: key,
          ...(def.chestLoot !== undefined ? { table: def.chestLoot } : {}),
          ...(def.chestWarded ? { warded: true } : {}),
        });
      }
    }
    this.poiLive.set(key, { zoneId: zone.id, spawnIdx });
    this.standFinds(cellX, cellY, row.epoch, { x: row.site.anchorX, y: row.site.anchorY });
    console.log(
      `[poi] ${row.site.defId} (${row.site.prefabId}) stands at ` +
        `${row.site.anchorX},${row.site.anchorY} — tier ${row.site.tier}`,
    );
    return row.site;
  }

  /**
   * THE SMALL FINDS half of a cell's materialization: decide the
   * lattice (pure), compose the ONE finds zone, stand it through the
   * same addZone/registerSpawns doors, and honor the cleared bits —
   * a wiped find stays a carcass for the cell's whole epoch. Runs
   * with every cell materialization (site, empty, or carcass alike);
   * the epoch turn re-deals it with everything else. Finds mint no
   * chart markers and no ceremonies (THE QUIET CHART LAW) and bank no
   * renewal credits (conservation owes the world its TROUBLE, not its
   * texture).
   */
  private standFinds(
    cellX: number,
    cellY: number,
    epoch: number,
    siteAnchor: { x: number; y: number } | null,
  ): void {
    const key = poiCellKey(cellX, cellY);
    if (this.findsLive.has(key)) return;
    const ctx = this.poiCtx();
    const finds = findsForCell(config.worldSeed, cellX, cellY, epoch, ctx, siteAnchor);
    if (finds.length === 0) return;
    const composed = composeFinds(config.worldSeed, cellX, cellY, epoch, finds, ctx);
    if (!composed) return;
    const { zone, spawnSlots } = composed;
    this.world.addZone(zone);
    this.dropClientChunks(zone);
    const spawnIdx = this.registerSpawns(zone.spawns ?? [], zone.id);
    const ledger = this.minorLedger.get(key);
    const cleared = ledger && ledger.epoch === epoch ? ledger.cleared : 0;
    for (const [j, idx] of spawnIdx.entries()) {
      const slot = spawnSlots[j]!;
      this.minorSpawnSlots.set(idx, { key, slot });
      // A cleared slot's whisper stays down for the whole epoch.
      if ((cleared >>> slot) & 1) {
        const s = this.spawnPoints[idx];
        if (s?.active) s.active = false;
      }
    }
    for (const f of finds) {
      if (f.habitat === undefined) continue;
      if ((cleared >>> f.slot) & 1) continue;
      this.habitatFinds.set(`${key}#${f.slot}`, { habitat: f.habitat, x: f.anchorX, y: f.anchorY });
    }
    this.findsLive.set(key, { zoneId: zone.id, spawnIdx, spawnSlots, finds });
  }

  /**
   * Does this spawn point field a FIGHTING body? Livestock (no damage,
   * no aggro — the stolen cows in a brigand pen) are loot, not keepers:
   * they never hold the ward and never stall the wipe.
   */
  private poiSpawnFights(s: SpawnState): boolean {
    const def = NPCS.get(s.npc);
    return def !== undefined && !npcLivestock(def);
  }

  /**
   * Stand a cell's fighting garrison down for good — the ember law's
   * teeth. Deactivate-in-place (the retireZonePlacements convention):
   * the spawn records stay tagged to the zone so retire stays free,
   * but tickSpawns never re-stands them. Livestock and staff actors
   * keep their lives — a freed cow grazing the wreck IS the story.
   */
  private standDownGarrison(spawnIdx: readonly number[]): void {
    for (const i of spawnIdx) {
      const s = this.spawnPoints[i];
      if (s?.active && this.poiSpawnFights(s)) s.active = false;
    }
  }

  /**
   * Garrison-wipe watch: when the LAST living FIGHTING body of a POI's
   * spawn set falls, stamp cleared_at. THE EMBER LAW (the living
   * frontier): a wiped procedural site never restaffs — its garrison
   * stands down for good and the broken camp lingers until ember_until,
   * when tickFrontier dissolves it and the trouble moves on. Authored
   * landmarks keep the old covenant instead: one grace window
   * (POI_RESPAWN_MIN_SEC from the wipe) to loot, then the veil's den
   * musters anew — the plan's fixed points never churn.
   */
  /**
   * THE REGION LAW (Phase 4): does any ledger cell in the ±regionCells
   * neighborhood already hold a WAR-GROUND? Standing, cleared, or
   * embering alike — the region keeps ONE landmark until the cell
   * itself re-rolls to something else.
   */
  private holdsNear(cellX: number, cellY: number): boolean {
    const r = FRONTIER.regionCells;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const row = this.poiLedger.get(poiCellKey(cellX + dx, cellY + dy));
        if (row?.site && POI_DEFS.get(row.site.defId)?.compound) return true;
      }
    }
    return false;
  }

  /**
   * THE WING CHAPTERS (Phase 4): when the last fighting body of a
   * compound hold's WING falls while the rest of the hold still
   * stands, the participation set hears the chapter close — progress
   * acknowledged mid-clear, the way a five-to-ten-minute site must.
   * When nothing else stands, this stays silent: the full-wipe
   * ceremony in notePoiKill speaks instead. Once per wing per uptime.
   */
  private noteHoldWing(spawnIndex: number, killerEid?: EntityId): void {
    const key = this.poiSpawnCells.get(spawnIndex);
    if (key === undefined) return;
    const dying = this.spawnPoints[spawnIndex];
    if (dying?.wing === undefined) return;
    const live = this.poiLive.get(key);
    if (!live) return;
    const wing = dying.wing;
    let wingStands = false;
    let otherStands = false;
    for (const i of live.spawnIdx) {
      const s = this.spawnPoints[i];
      if (!s?.active || s.eid === null || !this.poiSpawnFights(s)) continue;
      if (s.wing === wing) wingStands = true;
      else otherStands = true;
    }
    if (wingStands || !otherStands) return;
    const broken = (live.wingsBroken ??= new Set<number>());
    if (broken.has(wing)) return;
    broken.add(wing);
    const site = this.poiLedger.get(key)?.site;
    if (!site) return;
    const dir = compass8(dying.x - site.anchorX, dying.y - site.anchorY);
    const heard = new Set<PlayerComp>();
    const killer = killerEid !== undefined ? this.players.get(killerEid) : undefined;
    if (killer) heard.add(killer);
    for (const characterId of live.fighters ?? []) {
      const feid = this.characterEids.get(characterId);
      const p = feid !== undefined ? this.players.get(feid) : undefined;
      if (p) heard.add(p);
    }
    for (const p of heard) {
      p.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `The ${dir} camp goes quiet. The hold thins.`,
      });
    }
  }

  /**
   * Find-wipe watch (THE SMALL FINDS): when the last living fighting
   * body of a SLOT falls, the slot's bit stamps into world_minors for
   * the cell's epoch, the whisper stands down for good, and the
   * habitat pull goes quiet. No ceremony, no flags, no credits, no
   * chart traffic — a cleared find is just a quieter piece of ground
   * until the epoch turns and the land re-deals.
   */
  private noteMinorKill(spawnIndex: number): void {
    const ref = this.minorSpawnSlots.get(spawnIndex);
    if (ref === undefined) return;
    const fl = this.findsLive.get(ref.key);
    if (!fl) return;
    for (const [j, idx] of fl.spawnIdx.entries()) {
      if (fl.spawnSlots[j] !== ref.slot) continue;
      const s = this.spawnPoints[idx];
      if (s?.active && s.eid !== null && this.poiSpawnFights(s)) return;
    }
    const [cx, cy] = ref.key.split(',').map(Number) as [number, number];
    const epoch = this.poiLedger.get(ref.key)?.epoch ?? 0;
    const prior = this.minorLedger.get(ref.key);
    const cleared = (((prior && prior.epoch === epoch ? prior.cleared : 0) | (1 << ref.slot)) >>> 0);
    this.minorLedger.set(ref.key, { epoch, cleared });
    this.accounts.upsertMinorCell(cx, cy, epoch, cleared);
    for (const [j, idx] of fl.spawnIdx.entries()) {
      if (fl.spawnSlots[j] !== ref.slot) continue;
      const s = this.spawnPoints[idx];
      if (s?.active) s.active = false;
    }
    this.habitatFinds.delete(`${ref.key}#${ref.slot}`);
  }

  private notePoiKill(spawnIndex: number, killerEid?: EntityId): void {
    const key = this.poiSpawnCells.get(spawnIndex);
    if (key === undefined) return;
    const live = this.poiLive.get(key);
    if (!live) return;
    for (const i of live.spawnIdx) {
      const s = this.spawnPoints[i];
      if (s?.active && s.eid !== null && this.poiSpawnFights(s)) return;
    }
    const [cx, cy] = key.split(',').map(Number);
    const row = this.poiLedger.get(key);
    if (row) row.clearedAt = Date.now();
    if (this.authoredCells().has(key)) {
      const graceAt = Date.now() + GameServer.POI_RESPAWN_MIN_SEC * 1000;
      for (const i of live.spawnIdx) {
        const s = this.spawnPoints[i];
        if (s?.active && s.eid === null && this.poiSpawnFights(s)) {
          s.respawnAt = Math.max(s.respawnAt, graceAt);
        }
      }
      this.accounts.markPoiCleared(cx!, cy!);
    } else {
      this.standDownGarrison(live.spawnIdx);
      // A felled WAR-GROUND savors longer (Phase 4): the five-minute
      // clear earns the fifteen-minute trophy.
      const isHold = row?.site !== null && POI_DEFS.get(row?.site?.defId ?? '')?.compound;
      const emberUntil =
        Date.now() +
        (isHold
          ? holdEmberFor(config.worldSeed, cx!, cy!, row?.epoch ?? 0)
          : emberLingerFor(config.worldSeed, cx!, cy!, row?.epoch ?? 0));
      if (row) row.emberUntil = emberUntil;
      this.accounts.markPoiCleared(cx!, cy!, emberUntil);
    }
    // THE RELAX WINDOW: every garrison wipe buys the valley real quiet —
    // no stage-ups, satellites, wakes, or renewal landings near here
    // while it holds. The player's victory audibly reads.
    this.stampCalm(cx!, cy!);
    // SOURCE-AND-KILL-SWITCH, both ways: breaking a CORE scatters its
    // family — every standing satellite takes a short ember (no
    // clearedAt, so no renewal credit: one clear is one victory) and
    // stands down. Breaking a family's TOLL (Phase 3.3) breaks the
    // family's nerve the same way: the core and every sibling scatter.
    let scattered = 0;
    const scatterCell = (skey: string, srow: NonNullable<typeof row>): void => {
      if (srow.site === null || srow.emberUntil !== null) return;
      srow.emberUntil =
        Date.now() + scatterLingerFor(config.worldSeed, srow.site.cellX, srow.site.cellY);
      this.standDownGarrison(this.poiLive.get(skey)?.spawnIdx ?? []);
      this.accounts.setPoiEmber(srow.site.cellX, srow.site.cellY, srow.emberUntil);
      scattered++;
    };
    for (const [skey, srow] of this.poiLedger) {
      if (srow.originCell !== key || srow.site === null || srow.emberUntil !== null) continue;
      scatterCell(skey, srow);
    }
    let tollBroke = false;
    if (row?.originCell !== null && row?.originCell !== undefined && row.site?.defId === 'road_toll') {
      tollBroke = true;
      const coreKey = row.originCell;
      const core = this.poiLedger.get(coreKey);
      if (core?.site && core.clearedAt === null) scatterCell(coreKey, core);
      for (const [skey, srow] of this.poiLedger) {
        if (srow.originCell !== coreKey || skey === key) continue;
        scatterCell(skey, srow);
      }
    }
    // THE HEARTH WATCH resolution (Phase 4.3): a broken squat buys its
    // settler the full raid quiet — online or off, participant or not
    // (a friend clearing your fence-line still buys YOUR peace).
    const hearthOwner = GameServer.hearthOwnerOf(row?.originCell);
    if (hearthOwner !== null && row?.site?.defId === 'raider_squat') {
      const until = Date.now() + FRONTIER.raidCooldownMs;
      this.accounts.saveRaidCalm(hearthOwner, until);
      const oeid = this.characterEids.get(hearthOwner);
      const owner = oeid !== undefined ? this.players.get(oeid) : undefined;
      if (owner) {
        owner.raidCalmUntil = Math.max(owner.raidCalmUntil, until);
        owner.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: 'The covetous fires go out. Nobody watches your fence-line now — the quiet is yours a while.',
        });
      }
    }
    // THE STORY HOOK + THE BOUNTY (Phase 3.2): the wipe credit reaches
    // every hand that bled the garrison — the participation ledger,
    // not just the last blow. Flags, the line, the deed-art, and any
    // posted bounty pay per participant. The site STANDING paid
    // nothing, ever — only the breaking pays (the anti-farm law).
    const def = row?.site ? POI_DEFS.get(row.site.defId) : undefined;
    const parts = new Map<PlayerComp, EntityId>();
    const killer = killerEid !== undefined ? this.players.get(killerEid) : undefined;
    if (killer && killerEid !== undefined) parts.set(killer, killerEid);
    for (const characterId of live.fighters ?? []) {
      const feid = this.characterEids.get(characterId);
      const p = feid !== undefined ? this.players.get(feid) : undefined;
      if (p) parts.set(p, feid!);
    }
    live.fighters = undefined;
    if (def) {
      for (const [p, peid] of parts) {
        if (def.clearedFlag !== undefined) this.setPlayerFlag(p, def.clearedFlag);
        p.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The last of them falls. ${def.name} is broken — word of it will travel.`,
        });
        if (scattered > 0) {
          p.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: tollBroke
              ? 'The toll falls — and the family that raised it loses its nerve. The camps scatter.'
              : 'Word spreads — the outlying camps scatter.',
          });
        }
        // THE UNWRITTEN PAGE: breaking a garrison is the warden's deed.
        this.grantArt(p, 'warden_volley');
        this.payBounty(peid, p, key, row);
        // A broken toll un-squeezes somebody's road — the charter
        // remembers every hand (bounty or none; ending pays, standing
        // never did).
        if (tollBroke && row?.site) {
          this.creditDeed(p, this.factionForPlace(row.site.anchorX, row.site.anchorY), 'tollBroken');
        }
      }
    }
  }

  /**
   * Honor a posted bounty on a broken cell: coins by site tier, the
   * rolled purse scaled by the boldness rung the camp died at (a
   * bolder problem was a bigger favor). The mark lifts with the pay;
   * marks whose camp dissolved without the player are pruned lazily by
   * openBounties instead. Overflow coins land at the defender's feet.
   */
  private payBounty(
    eid: EntityId,
    player: PlayerComp,
    cellKey: string,
    row: { site: PoiSite | null; stage: number } | undefined,
  ): void {
    const flag = bountyFlag(cellKey);
    if (!player.flags.has(flag)) return;
    this.clearPlayerFlag(player, flag);
    const site = row?.site;
    if (!site) return;
    const tier = Math.max(1, Math.min(5, site.tier));
    const mult = 1 + (row?.stage ?? 0);
    let paid = 0;
    for (const drop of rollLoot(`bounty_t${tier}`, { level: tier * 10, rand: Math.random })) {
      const qty = drop.qty * mult;
      const added = addItem(player.inventory, drop.item, qty);
      if (added < qty) {
        const pos = this.positions.get(eid);
        if (pos) this.spawnDrop(drop.item, qty - added, pos.x, pos.y, eid);
      }
      paid += qty;
    }
    if (paid > 0) {
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `The bounty is honored: ${paid} coins.`,
      });
      // The town that posted the ask remembers the hand that answered.
      this.creditDeed(player, this.factionForPlace(site.anchorX, site.anchorY), 'bountyHonored');
    }
  }

  /** Retire a cell's standing zone + bodies (the /poi levers ride this). */
  private retirePoiCell(key: string): void {
    const live = this.poiLive.get(key);
    if (live?.zoneId) {
      this.unloadZone(live.zoneId);
      for (const i of live.spawnIdx) this.poiSpawnCells.delete(i);
    }
    for (const [tileKey, over] of this.poiChests) {
      if (over.cell === key) this.poiChests.delete(tileKey);
    }
    this.poiLive.delete(key);
    // The cell's finds retire with it — an epoch turn re-deals the
    // texture along with the trouble.
    const fl = this.findsLive.get(key);
    if (fl) {
      this.unloadZone(fl.zoneId);
      for (const i of fl.spawnIdx) this.minorSpawnSlots.delete(i);
      for (const f of fl.finds) this.habitatFinds.delete(`${key}#${f.slot}`);
      this.findsLive.delete(key);
    }
  }

  /** Does any FIGHTING garrison body of this POI cell still stand? */
  private poiGarrisonStands(cellKey: string): boolean {
    const live = this.poiLive.get(cellKey);
    if (!live) return false;
    for (const i of live.spawnIdx) {
      const s = this.spawnPoints[i];
      if (s?.active && s.eid !== null && this.poiSpawnFights(s)) return true;
    }
    return false;
  }

  /** The live prefab-library ids — the /dev/content validator's refs. */
  poiPrefabIds(): ReadonlySet<string> {
    return new Set(this.poiPrefabs?.keys() ?? []);
  }

  /**
   * One live library prefab — the stronghold validator reads the
   * layout's actual geometry (gates, wards, reachability), not just
   * its id.
   */
  poiPrefab(id: string): PrefabDef | undefined {
    return this.poiPrefabs?.get(id);
  }

  /** In-world player count — the health endpoint's one gauge. */
  playerCount(): number {
    return this.players.size;
  }

  /** The live DB-loaded actor slugs — tool-born actors count too. */
  actorIds(): ReadonlySet<string> {
    return new Set(this.actorDefs.keys());
  }

  /** The live DB-loaded routine ids. */
  routineIds(): ReadonlySet<string> {
    return new Set(this.routineDefs.keys());
  }

  /**
   * Archetype edit applied live (registry already swapped by the
   * caller — the reloadNpcDef pattern): retire every standing cell of
   * the edited kind and forget its live state; tickPois re-stands each
   * from its LEDGER row next pass, so the site keeps its anchor and
   * prefab while garrison/cues/chest recompose under the new def.
   */
  reloadPoiDef(id: string): void {
    for (const [key, row] of this.poiLedger) {
      if (row.site?.defId !== id || !this.poiLive.has(key)) continue;
      this.retirePoiCell(key);
    }
  }

  /**
   * Prefab edit applied live: swap the library entry (null = file
   * deleted — builtin twin stands back in if one exists, else the
   * prefab is gone) and re-stand every cell whose site wears it, so
   * the curated art lands in the world within a tick of the save.
   */
  reloadPoiPrefab(id: string, def: PrefabDef | null): void {
    if (!this.poiPrefabs) return;
    if (def) this.poiPrefabs.set(id, def);
    else {
      const builtin = POI_PREFABS.get(id);
      if (builtin) this.poiPrefabs.set(id, builtin);
      else this.poiPrefabs.delete(id);
    }
    for (const [key, row] of this.poiLedger) {
      if (row.site?.prefabId !== id || !this.poiLive.has(key)) continue;
      this.retirePoiCell(key);
    }
    // Finds wear library prefabs too — re-deal any cell whose texture
    // carries the edited art.
    for (const [key, fl] of this.findsLive) {
      if (!fl.finds.some((f) => f.prefabId === id)) continue;
      this.retirePoiCell(key);
    }
  }

  /**
   * Minor-def edit applied live: every standing cell whose texture
   * carries the archetype retires; tickPois re-stands the whole cell
   * (site included — pure recomposition, bit-identical) on the very
   * next pass with the new truth.
   */
  reloadMinorDef(id: string): void {
    for (const [key, fl] of this.findsLive) {
      if (!fl.finds.some((f) => f.defId === id)) continue;
      this.retirePoiCell(key);
    }
  }

  /**
   * The bench's context: the live world's anchors/zones/prefabs with
   * an optional DRAFT def overlaid — unsaved edits answer honestly.
   */
  poiBenchContext(draft?: PoiDef): PoiContext | null {
    if (!this.poiPrefabs) return null;
    const defs = new Map(POI_DEFS);
    if (draft) defs.set(draft.id, draft);
    const ctx = this.poiCtx();
    return { ...ctx, defs: [...defs.values()] };
  }

  // ------------------------------------------------- portals & dungeons

  private teleport(eid: EntityId, x: number, y: number): void {
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos) return;
    this.cancelAction(eid, player);
    this.cancelCasting(eid, player); // a step through space breaks the breath
    // Any ride out of a seat releases it — the destination is already
    // decided, so no walk-up restore.
    this.standUp(eid, player, pos, false);
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
    // The gates are one network: any fellow's live run stands open here.
    const partyRuns: Array<{ name: string; dungeon: string; tier: string; power: number }> = [];
    for (const fellowId of this.party.fellowsOf(player.characterId)) {
      const inst = this.dungeons.get(fellowId);
      if (!inst) continue;
      const name = this.accounts.characterName(fellowId);
      if (!name) continue;
      partyRuns.push({ name, dungeon: inst.name, tier: inst.tier, power: inst.power });
    }
    player.session?.sendJson({
      t: 'riftgate',
      keySlots,
      partyRuns: partyRuns.length > 0 ? partyRuns : undefined,
    });
    if (keySlots.length === 0 && partyRuns.length === 0) {
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
    const gate = this.riftgateNear(pos);
    if (!gate) {
      sys('You need to stand at a Riftgate to turn a dungeon key.');
      return;
    }
    const held = player.inventory[slot];
    if (!held || held.item !== DUNGEON_KEY_ITEM) {
      sys('That slot holds no dungeon key.');
      return;
    }
    const spec = dungeonSpecFromRoll(held.roll);
    // A gate a key has turned at is a place worth keeping: pin it on
    // the map forever. The threshold banner is the ceremony here — the
    // client shows no discovery splash for the 'dungeon' kind.
    const gateId = dungeonDiscoveryId(gate.x, gate.y);
    if (!player.discoveries.has(gateId)) {
      this.recordDiscovery(player, {
        id: gateId,
        kind: 'dungeon',
        name: 'Riftgate',
        x: gate.x,
        y: gate.y,
      });
    }
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
      ownerId: player.characterId,
      ownerReturn: returnTo,
      name: spec.name,
      sigil: spec.sigil,
      theme: spec.theme,
      guests: new Map(),
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
    // Offer the fellowship the door (any riftgate carries them in).
    if (player.characterId > 0) {
      this.party.notifyDelve(player.characterId, player.name, spec.name);
    }
  }

  private teardownDungeon(characterId: number): void {
    const dungeon = this.dungeons.get(characterId);
    if (!dungeon) return;
    // Anyone still standing in the halls goes home before the rock
    // closes — guests to their own gate, anyone else to the spawn.
    for (const [eid, player] of this.players) {
      if (player.characterId === characterId) continue;
      const pos = this.positions.get(eid);
      if (!pos || pos.y < 8192 || pos.x < dungeon.x0 || pos.x >= dungeon.x1) continue;
      const back = dungeon.guests.get(player.characterId) ?? this.world.spawn;
      this.teleport(eid, back.x, back.y);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'The rift closes behind its keyholder — the world takes you back.',
      });
    }
    dungeon.guests.clear();
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

  /** The live instance whose x-band holds this tile, if any. */
  private dungeonAt(tx: number, ty: number): DungeonInstance | null {
    if (ty < 8192) return null;
    for (const inst of this.dungeons.values()) {
      if (tx >= inst.x0 && tx < inst.x1) return inst;
    }
    return null;
  }

  /** The dungeon instance owning this tile, if any (chests scale by it). */
  private dungeonPowerAt(tx: number, ty: number): number | null {
    return this.dungeonAt(tx, ty)?.power ?? null;
  }

  /**
   * Step into a party member's live run. The riftgates are one network —
   * any gate can carry a fellow into a run the keyholder holds open.
   */
  partyJoinRun(eid: EntityId, session: Session, name: string): void {
    const actor = this.socialActor(eid, session);
    if (!actor) return;
    const player = this.players.get(eid);
    const pos = this.positions.get(eid);
    if (!player || !pos) return;
    const sys = (text: string) => session.sendJson({ t: 'chat', channel: 'system', text });
    if (!this.riftgateNear(pos)) {
      sys('You need to stand at a Riftgate to follow your party.');
      return;
    }
    void (async () => {
      const target = await this.accounts.findCharacterByName(name.trim());
      if (!target) return sys('No one by that name.');
      if (!this.party.fellowsOf(actor.id).includes(target.id)) {
        return sys(`${target.name} is not in your party.`);
      }
      const inst = this.dungeons.get(target.id);
      if (!inst) return sys(`${target.name} holds no rift open.`);
      inst.guests.set(actor.id, { x: pos.x, y: pos.y });
      // The banner + fog-mask reset ride the same message the owner got.
      session.sendJson({
        t: 'dungeon',
        name: inst.name,
        sigil: inst.sigil,
        tier: inst.tier,
        theme: inst.theme,
        power: inst.power,
      });
      this.teleport(eid, inst.entry.x, inst.entry.y);
      const ownerEid = this.characterEids.get(target.id);
      if (ownerEid !== undefined) {
        this.players.get(ownerEid)?.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `${actor.name} steps through the rift to join you.`,
        });
      }
    })().catch((err: Error) => console.error('[party]', err.message));
  }

  /**
   * A character stopped being party to their fellows — if they were
   * guesting in one's dungeon, the rift no longer knows them.
   */
  private evictFromGuestDungeon(characterId: number): void {
    const eid = this.characterEids.get(characterId);
    for (const inst of this.dungeons.values()) {
      const back = inst.guests.get(characterId);
      if (back === undefined) continue;
      inst.guests.delete(characterId);
      if (eid === undefined) continue;
      const pos = this.positions.get(eid);
      if (!pos || pos.y < 8192 || pos.x < inst.x0 || pos.x >= inst.x1) continue;
      this.teleport(eid, back.x, back.y);
      this.players.get(eid)?.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'The rift no longer knows you — it hands you back to your gate.',
      });
    }
  }

  // ------------------------------------------------------- equipment

  /** Equip or eat the item in an inventory slot. */
  /** Reorder the pack: swap two slots (drag-drop / pad carry mode). */
  invMove(eid: EntityId, from: number, to: number, merge = false): void {
    const player = this.players.get(eid);
    if (!player) return;
    const inv = player.inventory;
    if (from < 0 || to < 0 || from >= inv.length || to >= inv.length) return;
    if (from === to) return;
    if (!inv[from] && !inv[to]) return;
    // THE MEASURED STACK: a deliberate drop of a stack onto its own
    // kind (merge=true — mouse drag, pad carry-place) pours it in up
    // to the cap instead of swapping. The tidy sort's swap chains
    // never set the flag: they must stay pure permutations. Facets
    // stay honest: a stolen stack never pours into an honest one.
    // Rolled gear is non-stackable by law, so no roll smears here.
    const src = inv[from];
    const dst = inv[to];
    if (merge && src && dst && src.item === dst.item && !src.stolen === !dst.stolen) {
      const def = itemDef(src.item);
      if (def?.stackable) {
        const cap = def.maxStack ?? Infinity;
        const pour = Math.min(src.qty, Math.max(0, cap - dst.qty));
        if (pour > 0) {
          dst.qty += pour;
          src.qty -= pour;
          if (src.qty === 0) inv[from] = null;
          player.session?.sendJson({ t: 'inv', slots: inv });
          return;
        }
      }
    }
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
      ...(taken.stolen ? { stolen: true as const } : {}),
    });
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
  }

  /**
   * THE UNMAKING: break a worn-out piece down at an enchanting table
   * for the Arx bound into it. See content/equipment/unmaking.ts for
   * why this is the keystone of the trade rather than a convenience.
   *
   * Destructive and irreversible, so every refusal is spoken plainly
   * and nothing is consumed until the payout is certain.
   */
  unmake(eid: EntityId, slotIndex: number): void {
    const player = this.players.get(eid);
    if (!player?.session) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    if (slotIndex < 0 || slotIndex >= player.inventory.length) return;
    const slot = player.inventory[slotIndex];
    if (!slot) return;
    const def = itemDef(slot.item);
    if (!def) return;

    if (!this.nearTile(eid, STATION_TILES.enchanting_table)) {
      sys('You need to stand by an enchanting table to take something apart.');
      return;
    }
    if (!canUnmake(slot.item)) {
      sys(`The ${def.name.toLowerCase()} has no Arx in it to recover.`);
      return;
    }
    // NO LAUNDERING. Stolen goods do not become clean dust at a bench:
    // the fences exist for exactly this and the table must not quietly
    // become a better one.
    if (slot.stolen) {
      sys('That one is hot. No honest bench will take it apart for you.');
      return;
    }
    const result = unmakingOf(slot.item, slot.roll);
    if (!result) return;
    // Prove the pack can hold every yield BEFORE anything is destroyed.
    // Half-paying a player for a thing they no longer have is the one
    // failure this action must never have.
    for (const y of result.yields) {
      if (!hasSpaceFor(player.inventory, y.item)) {
        sys('Your pack is too full to catch what comes out of it.');
        return;
      }
    }

    const taken = takeSlot(player.inventory, slotIndex, 1);
    if (!taken) return;
    const name = instanceName(taken.item, taken.roll);
    for (const y of result.yields) addItem(player.inventory, y.item, y.qty);
    this.grantXp(eid, player, 'enchanting', result.xp);
    player.session.sendJson({ t: 'inv', slots: player.inventory });

    const got = result.yields
      .map((y) => `${y.qty} ${(itemDef(y.item)?.name ?? y.item).toLowerCase()}`)
      .join(' and ');
    sys(`The ${name} comes apart. You recover ${got}.`);

    // The bench answers: an unmaking is a working too, and it should
    // read as one. Tinted by the piece's own school where it had one.
    const pos = this.positions.get(eid);
    if (pos) {
      const ench = enchantDef(taken.roll?.ench);
      this.broadcastFx({
        t: 'fx',
        kind: 'proc',
        x: pos.x,
        y: pos.y,
        radius: 0.8,
        color: ELEMENT_COLORS[ench?.element ?? 'arcane'],
        id: 'yield:unmake',
      });
    }
  }

  /**
   * The one worn piece a deepening sigil may open, or null.
   *
   * The gates are all on the PIECE, never on the player: fine enough
   * steel to be worth it, a working already in it (the ward is what an
   * art answers to), and not already opened. Nothing here asks the
   * player's level, because the sigil is a found thing and the item it
   * lands on is the achievement.
   *
   * Ambiguity is refused rather than guessed: if two worn pieces
   * qualify, the sigil declines to choose for you.
   */
  private deepenTarget(player: PlayerComp): EquippedItem | null {
    let found: EquippedItem | null = null;
    for (const worn of Object.values(player.equipment)) {
      if (!worn?.roll || worn.roll.deep) continue;
      if (!worn.roll.ench) continue;
      if (rarityIndex(worn.roll.rar) < rarityIndex(DEEPEN_MIN_RARITY)) continue;
      if (found) return null; // two candidates: let the player unequip and mean it
      found = worn;
    }
    return found;
  }

  /**
   * SUNDERING: strip the working off a piece and keep the piece.
   *
   * The other half of RESONANCE. Bonding a different school onto worked
   * steel lands weaker; sundering clears the steel so the next working
   * goes in clean. Costs nothing but the working itself, because the
   * point is to give the player a way OUT of a bad pairing, and a
   * sundering that also charged them would just be a worse penalty.
   *
   * Returns no reagents on purpose: the unmaking already pays those
   * back, and paying them here too would make sunder-and-rebond a
   * cheaper source of essence than breaking the item.
   */
  sunder(eid: EntityId, slotIndex: number, wornSlot?: EquipSlot, seat: 'ward' | 'art' = 'ward'): void {
    const player = this.players.get(eid);
    if (!player?.session) return;
    const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
    // A working can be drawn out of a piece on the body or in the pack.
    // Bonding targets WORN gear, so sundering must reach it too, or
    // changing a piece's school would mean unequipping first for no
    // reason the player could name.
    // Worn gear names its item as `id`, a pack slot as `item`; one
    // shape covers both so the rest of the door reads the same.
    const wornRef = wornSlot ? player.equipment[wornSlot] : undefined;
    const packRef =
      !wornSlot && slotIndex >= 0 && slotIndex < player.inventory.length
        ? player.inventory[slotIndex]
        : null;
    const target: { item: string; roll?: ItemRoll } | undefined = wornRef
      ? { item: wornRef.id, roll: wornRef.roll }
      : (packRef ?? undefined);
    if (!target) return;
    if (!this.nearTile(eid, STATION_TILES.enchanting_table)) {
      sys('You need to stand by an enchanting table for that.');
      return;
    }
    // NO LAUNDERING: the unmaking door refuses stolen goods and this
    // one must match — a sundering that paid XP off hot steel would be
    // a quieter fence than the real ones.
    if (packRef?.stolen) {
      sys('That one is hot. No honest bench will work it for you.');
      return;
    }
    const ench = enchantDef(seat === 'art' ? target.roll?.ench2 : target.roll?.ench);
    if (!ench) {
      sys('There is no working on that to strip.');
      return;
    }
    // Mutate the ROLL, which both shapes share by reference. The seat
    // itself stays open: the steel was reworked and stays reworked, so
    // a sundered art can be replaced without spending another sigil.
    if (seat === 'art') {
      delete target.roll!.ench2;
      delete target.roll!.q2;
    } else {
      delete target.roll!.ench;
      delete target.roll!.q;
    }
    // A worn piece's aggregate really does change; a packed one's does
    // not, but recomputing is cheap and idempotent and getting this
    // wrong would leave a stripped working still buffing the body.
    this.onEquipmentChanged(eid, player);
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    // Say what is true of the steel: only a piece with NO working left
    // is bare again — a deepened piece may still carry its other seat.
    const remains = enchantDef(seat === 'art' ? target.roll?.ench : target.roll?.ench2);
    const pieceName = itemDef(target.item)?.name ?? 'piece';
    sys(
      remains
        ? `You draw the ${ench.name} back out. The ${remains.name} still rides the ${pieceName}.`
        : `You draw the ${ench.name} back out. The ${pieceName} is bare steel again.`,
    );
    this.grantXp(eid, player, 'enchanting', SUNDER_XP);

    const pos = this.positions.get(eid);
    if (pos) {
      this.broadcastFx({
        t: 'fx',
        kind: 'proc',
        x: pos.x,
        y: pos.y,
        radius: 0.7,
        color: ELEMENT_COLORS[ench.element],
        id: 'cleanse:sunder',
      });
    }
  }

  useItem(eid: EntityId, slotIndex: number): void {
    const player = this.players.get(eid);
    if (!player || slotIndex >= player.inventory.length) return;
    const slot = player.inventory[slotIndex];
    if (!slot) return;
    const def = itemDef(slot.item);
    if (!def) return;

    // THE ANIMALS OF THE YARD: a crated young releases at your own
    // feed trough — every refusal is spoken and the crate survives.
    if (LIVESTOCK_BY_CRATE.has(slot.item)) {
      this.releaseLivestock(eid, player, slotIndex, slot.item);
      return;
    }

    // Recipe scrolls: studying one teaches the recipe PERMANENTLY
    // (character_recipes, written immediately). Already-known refuses
    // without consuming — the scroll survives to trade on. The skill
    // level is NOT checked here: you may study above your level and
    // grow into the work; the craft itself stays level-gated.
    if (def.teaches) {
      const recipe = RECIPES.get(def.teaches);
      if (!recipe) return;
      if (recipe.unlock === 'core' || player.knownRecipes.has(recipe.id)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `You already know how to make ${recipe.name.toLowerCase()}.`,
        });
        return;
      }
      // Consume the CLICKED slot (the enchant-scroll door's law): an
      // id-addressed removal skips stolen slots by the laundering law,
      // and an unconsumed scroll must never still teach. A stolen
      // scroll studied is destroyed — that is fine and lawful.
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
      player.knownRecipes.add(recipe.id);
      if (player.characterId > 0) this.accounts.learnRecipe(player.characterId, recipe.id);
      player.session?.sendJson({ t: 'recipes', known: [...player.knownRecipes] });
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      const level = this.effectiveLevel(player, recipe.skill);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text:
          level >= recipe.levelReq
            ? `You study the ${def.name.toLowerCase()}. ${recipe.name} joins your repertoire.`
            : `You study the ${def.name.toLowerCase()}. ${recipe.name} joins your repertoire (needs ${recipe.skill} ${recipe.levelReq}).`,
      });
      return;
    }

    // Quest-starting items: a torn note, a sealed writ — the thing
    // found IS the ask, and reading it is the consent. Consumed on
    // accept; refused (and kept) while the quest is underway, done,
    // or its gates don't pass — the teaches-scroll law.
    if (def.startsQuest) {
      const qdef = this.questDefs.get(def.startsQuest);
      const sys = (text: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text });
      if (!qdef) return;
      const entry = player.quests.get(qdef.id);
      if (entry?.status === 'active') {
        sys(`You already carry this errand — it's in your journal.`);
        return;
      }
      if (!questAvailable(qdef, this.questCtx(player))) {
        sys(
          entry?.status === 'done'
            ? `You've already seen "${qdef.name}" through.`
            : `You read it over, but the work is beyond you for now.`,
        );
        return;
      }
      // The clicked writ is the one consumed — slot-addressed, so a
      // stolen note is destroyed on reading rather than starting the
      // errand forever while it never leaves the pack.
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      this.questAccept(eid, player, qdef.id);
      return;
    }

    // Weapon oils: the vial bonds to the EQUIPPED weapon's INSTANCE —
    // swap weapons and each blade keeps its own poison. Edges and
    // arrowheads take oil; a caster's focus never does.
    if (def.coating) {
      const c = def.coating;
      const worn = player.equipment.weapon;
      const style = worn ? itemDef(worn.id)?.weapon?.style : undefined;
      if (!worn || (style !== 'onehand' && style !== 'twohand' && style !== 'archery')) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: 'Poison needs an edge or arrowheads — equip a bladed weapon or a bow first.',
        });
        return;
      }
      // The clicked vial is the one spent — slot-addressed, so the oil
      // is consumed whatever its history (a stolen vial worked into
      // the blade is destroyed, never an everlasting coat).
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
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
    // THE DEEPENING: the sigil opens a worn piece to a second working.
    // Deliberately NOT a bench recipe — it is found, never made, so the
    // ceiling of the trade is a thing the world hands you rather than
    // something you can grind toward on a schedule.
    if (def.id === 'deepening_sigil') {
      const worn = this.deepenTarget(player);
      if (!worn) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The sigil wants a worked ${DEEPEN_MIN_RARITY} piece or better on your body, one that is not already opened.`,
        });
        return;
      }
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
      worn.roll!.deep = true;
      // The worn instance changed shape — recompute and broadcast the
      // full equip change (the bond/sunder door's law), or the tooltip
      // and bench keep showing an un-deepened piece until the next
      // equipment change happens to refresh them.
      this.onEquipmentChanged(eid, player);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `The sigil sinks in and the ${itemDef(worn.id)?.name ?? 'piece'} opens. There is room in it now for a working that DOES something.`,
      });
      const pos = this.positions.get(eid);
      if (pos) {
        this.broadcastFx({
          t: 'fx',
          kind: 'proc',
          x: pos.x,
          y: pos.y,
          radius: 1.1,
          color: ELEMENT_COLORS.astral,
          text: 'Deepened',
          id: 'surge:deepen',
        });
      }
      return;
    }
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
      if (worn.roll?.ench === ench.id || worn.roll?.ench2 === ench.id) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The ${itemDef(worn.id)?.name ?? 'item'} already bears that enchantment.`,
        });
        return;
      }
      // A block-woken working answers only THE RAISED WALL, and only a
      // fist-held armored shield ever raises one (equippedShield's
      // law). Bonded onto a quiver or an off blade it would be silent
      // forever — refuse instead of selling a dead working.
      const listensForBlock = ench.effects.some(
        (fx) =>
          fx.kind === 'proc' &&
          (fx.trigger.on === 'block' ||
            (fx.trigger.on === 'stacks' && fx.trigger.per === 'block')),
      );
      if (listensForBlock && ench.slot === 'offhand' && !this.equippedShield(player)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The ${ench.name} listens for a shield's answer, and that hand holds no shield.`,
        });
        return;
      }
      // THE DEEPENING: a deepened piece holds a ward and an art, and a
      // working that DOES something takes the art seat. See enchants.ts
      // for why the art must carry a proc.
      const seat = seatFor(worn.roll, ench.id);
      const replaced = enchantDef(seat === 'art' ? worn.roll?.ench2 : worn.roll?.ench);
      // RESONANCE: the steel remembers what it already carries. Same
      // school and the sigils agree; a different one has to be argued
      // in, and the working lands weaker for it. Sundering the old
      // working first bonds onto bare steel at no penalty — a choice
      // with a shape, never a dice roll, and nothing is ever destroyed
      // by bad luck.
      //
      // Resonance always reads the WARD, because the ward is what
      // school the piece IS. An art grafted onto a piece answers to
      // that school too, which is what keeps a deepened piece a
      // coherent object instead of two unrelated workings sharing steel.
      const standing = enchantDef(worn.roll?.ench)?.element;
      const shift = resonanceShift(ench.element, seat === 'art' ? standing : replaced?.element);
      const scrollQ = slot.roll?.q ?? QUALITY_BASE;
      const q = Math.max(QUALITY_FLOOR, Math.min(QUALITY_CEIL, scrollQ + shift));
      // INSTANCE-ADDRESSING LAW: the scroll that was CLICKED is the one
      // consumed. An id-addressed removal would grab the first matching
      // scroll in the pack and could spend a masterwork inscription to
      // bond a rough one's quality.
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
      // Legacy-grace materialization: an unrolled instance IS common/0.
      const roll = worn.roll ?? { rar: 'common' as const, seed: 0 };
      if (seat === 'art') {
        roll.ench2 = ench.id;
        roll.q2 = q;
      } else {
        roll.ench = ench.id;
        roll.q = q;
      }
      worn.roll = roll;
      // Enchants move aggregate stats (maxHp, speed, cooldowns...) —
      // recompute exactly like an equip change.
      this.onEquipmentChanged(eid, player);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      const itemName = itemDef(worn.id)?.name ?? 'item';
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: replaced
          ? `The ${replaced.name} fades as the ${ench.name} takes its place on the ${itemName}.`
          : seat === 'art'
            ? `The ${ench.name} settles into the opened seat. The ${itemName} carries two workings now.`
            : `The scroll crumbles as the ${ench.name} sinks into the ${itemName}. It ${BONDING_VOICE[ench.tier]}.`,
      });
      if (shift > 0) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Both workings are ${ench.element}. The sigils agree, and it sits deeper for it.`,
        });
      } else if (shift < 0) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `The old ${replaced!.element} work fights the new. Sunder a piece first and the next one goes in clean.`,
        });
      }
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
      // The clicked stone is the one seated — slot-addressed (the
      // stolen-gem forever-socket had the same shape as the oil's).
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
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
    // THE STABLE DOOR: a saddle paper brings its beast to your string
    // and leaves the pack with the buying — the recipe-scroll pattern.
    if (def.mount) {
      const mdef = mountDef(def.mount);
      if (!mdef) return;
      if (player.mountsOwned.has(def.mount)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: 'Your stable already holds this one.',
        });
        return;
      }
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
      player.mountsOwned.add(def.mount);
      player.mountChosen = def.mount;
      player.rideSigSent = ''; // the mirror carries the new string
      if (player.characterId > 0) {
        this.accounts.saveMountGrant(player.characterId, def.mount, Date.now());
      }
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `The ${def.name.toLowerCase()} is yours. It answers on open ground.`,
      });
      return;
    }

    if (def.buff) {
      const b = def.buff;
      // Eat what was clicked, slot-addressed: nothing swallows twice
      // and a stolen meal is destroyed with the eating.
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
      if (def.heals) {
        const health = this.healths.must(eid);
        health.hp = Math.min(
          health.maxHp,
          // Hearty Meals: the practiced constitution wastes no bite.
          health.hp + Math.round(def.heals * player.perks.foodHealMult),
        );
      }
      player.buffs = player.buffs.filter((x) => x.channel !== b.channel);
      // Field Kitchen / Long Brew stretch their channel; Stonewall
      // thickens any shield the cup or plate raises.
      const durMult =
        b.channel === 'food' ? player.perks.foodBuffDurMult : player.perks.tonicBuffDurMult;
      player.buffs.push(
        mkBuff({
          speedMult: b.speedMult ?? 1,
          shieldHp: Math.round((b.shieldHp ?? 0) * player.perks.shieldMult),
          gatherSpeed: b.gatherSpeed ?? 1,
          regenPer4s: b.regenPer4s ?? 0,
          // THE LADEN TABLE: the feast dials ride the same folds the
          // ability buffs already use — armor sums, dmgMult and
          // critPct fold additively in the surge readers.
          armor: b.armor ?? 0,
          dmgMult: b.dmgMult ?? 1,
          critPct: b.critPct ?? 0,
          untilTick: this.tickCount + Math.round(b.durationSec * 20 * durMult),
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
      // Eat what was clicked, slot-addressed: the effect lands only if
      // the bite was really taken (a stolen loaf eaten is destroyed).
      if (!takeSlot(player.inventory, slotIndex, 1)) return;
      health.hp = Math.min(
          health.maxHp,
          // Hearty Meals: the practiced constitution wastes no bite.
          health.hp + Math.round(def.heals * player.perks.foodHealMult),
        );
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      return;
    }

    if (def.equipSlot) {
      // NO LAUNDERING: EquippedItem carries no theft facet, so a
      // stolen piece worn once would come back off the body honest.
      // The facet has nowhere to live up there — refuse at the door.
      if (slot.stolen) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: 'That one is hot. Keep it in your pack or find a fence.',
        });
        return;
      }
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
      // weapon, equipped over a one-handed mainhand with an empty off
      // hand, goes TO the off hand instead of swapping — if the arm is
      // strong enough (onehand 10+) or the secret is already yours. The
      // first time, the hidden skill reveals itself. No menu, no hint:
      // players find it by trying the obvious rogue thing.
      if (def.equipSlot === 'weapon' && def.weapon?.style === 'onehand') {
        const main = player.equipment.weapon;
        const mainWeapon = main ? itemDef(main.id)?.weapon : undefined;
        const discovered = player.skills.dualwield !== undefined;
        const onehandLvl = levelForXp(player.skills.onehand ?? 0);
        if (
          main &&
          mainWeapon?.style === 'onehand' &&
          !player.equipment.offhand &&
          (discovered || onehandLvl >= DUALWIELD_UNLOCK_ONEHAND)
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

    // Mid-conversation, the world waits — no second talk, no milking.
    if (player.dialogue) return;

    const actorComp = this.actors.get(targetEid);
    if (actorComp) {
      // THE LIGHT FINGERS (docs/factions-plan.md Phase 5): a crouched
      // hand asks a different question — sneak-interact is the
      // pickpocket verb. It runs BEFORE the closed throat: a thief's
      // trade never needed the talk.
      if (player.sneaking) {
        this.pickpocket(eid, player, pos, targetEid, actorComp, npos, sys);
        return;
      }
      // THE CLOSED THROAT (docs/factions-plan.md Phase 2): at outlaw
      // and below with the speaker's faction, the member refuses —
      // no tree, no shop, no bark, no quest talk credit. The ONE
      // exception is the faction's fineActor: the courtroom's door
      // stays open so a name can be bought back (Phase 3's rail).
      const fid = factionOfActor(actorComp.actor.id);
      if (fid !== null && factionDef(fid)?.fineActor !== actorComp.actor.id) {
        if (!bandAtLeast(this.playerBandWith(player, fid), 'suspect')) {
          const refusals = factionDef(fid)?.refusals ?? [];
          if (refusals.length > 0) {
            const line = refusals[(targetEid + this.tickCount) % refusals.length]!;
            npos.dir = Math.atan2(pos.y - npos.y, pos.x - npos.x);
            sys(`${actorComp.actor.name}: "${line}"`);
          }
          return;
        }
      }
      // "Speak with X" credits the moment you address them — tree,
      // shop, or bark alike, so a talk ask never depends on how the
      // conversation happens to end.
      this.creditQuestEvent(player, 'talk', actorComp.actor.id);
      // The dialogue system speaks first: the highest-priority tree
      // this player's flags make eligible opens the cinematic frame.
      const defs = this.dialoguesByActor.get(actorComp.actor.id);
      const def = defs ? pickDialogue(defs, this.dialogueHas(player, targetEid)) : null;
      if (def) {
        // The spoken-to turn to face you — small thing, reads as alive.
        npos.dir = Math.atan2(pos.y - npos.y, pos.x - npos.x);
        player.dialogue = { targetEid, def, nodeId: def.start, choices: [], seen: new Set([def.id]) };
        // THE SPOKEN LINE: the frame carries the warm list (the
        // speaker's bank quips first, then every voiced beat reachable
        // from start) and the live duck dials — a wholly silent
        // conversation sends neither and costs nothing on the wire.
        const prefetch = collectVoicePrefetch(
          def,
          this.voiceClips,
          VOICE.prefetchCap,
          this.voiceBanks.get(`actor:${actorComp.actor.id}`),
        );
        player.session.sendJson({
          t: 'dlgopen',
          eid: targetEid,
          name: actorComp.actor.name,
          title: actorComp.actor.title,
          prefetch,
          voiceDials: prefetch
            ? {
                duckLine: VOICE.duckLine,
                duckAmbience: VOICE.duckAmbience,
                duckReleaseMs: VOICE.duckReleaseMs,
              }
            : undefined,
        });
        this.dialogueEnterNode(eid, player, def.start, true);
        return;
      }
      // A trainer's counter opens next: no story to tell means it's
      // business hours — the client renders the named shop's shelf.
      if (actorComp.actor.shop) {
        npos.dir = Math.atan2(pos.y - npos.y, pos.x - npos.x);
        const rc = this.routines.get(targetEid);
        if (rc) {
          rc.pauseUntilTick = this.tickCount + 200;
          rc.holdFacing = false;
        }
        player.session.sendJson({
          t: 'shopopen',
          shop: actorComp.actor.shop,
          priceMult: this.shopPriceMultFor(player, actorComp.actor.shop),
        });
        return;
      }
      // No eligible tree: fall back to the rotating one-line barks.
      if (actorComp.actor.lines && actorComp.actor.lines.length > 0) {
        const lines = actorComp.actor.lines;
        const line = lines[actorComp.nextLine % lines.length]!;
        actorComp.nextLine++;
        npos.dir = Math.atan2(pos.y - npos.y, pos.x - npos.x);
        // A barked line earns a beat of stillness — nobody talks over
        // their shoulder while marching off on an errand.
        const rc = this.routines.get(targetEid);
        if (rc) {
          rc.pauseUntilTick = this.tickCount + 80;
          rc.holdFacing = false;
        }
        sys(`${actorComp.actor.name}: "${line}"`);
        // THE THROAT CLEARS: a bark may carry its spoken breath — the
        // bark slot through the same rationed quip memory, spatial at
        // the speaker's spot. Cosmetic 'vq'; a deaf client loses air.
        // THE BARK KEEPS ITS WORD: when the ledger holds this very
        // line in the speaker's voice, it speaks verbatim (cooldown
        // still applies, the chance die does not — an exact recording
        // is authored intent); only wordless fillers are diced.
        const matched = matchActorLineClip(actorComp.actor.id, line, this.voiceClips);
        const quip = matched
          ? this.drawMatchedQuip(`actor:${actorComp.actor.id}`, matched)
          : this.drawQuip(`actor:${actorComp.actor.id}`, 'bark', true);
        if (quip) {
          player.session.sendJson({
            t: 'vq',
            x: npos.x,
            y: npos.y,
            url: quip.url,
            durMs: quip.durMs,
          });
        }
        return;
      }
    }

    const npc = this.npcs.get(targetEid);
    if (!npc) return;

    // Your own companion: the tend when it is down, the bond moment
    // when you carry its lure, a hand on its flank otherwise.
    // Someone else's beast keeps its counsel.
    const petComp = this.pets.get(targetEid);
    if (petComp) {
      if (petComp.ownerEid !== eid) return;
      const row = player.pets.find((p) => p.slot === petComp.slot);
      if (!row) return;
      const petHealth = this.healths.get(targetEid);
      if (petHealth && petHealth.hp <= 0) {
        // THE TEND: kneel to the fallen friend where it lies.
        if (player.action) this.cancelAction(eid, player);
        player.action = { kind: 'tend', targetEid, ticksLeft: PET_TEND_TICKS };
        pos.dir = Math.atan2(npos.y - pos.y, npos.x - pos.x);
        this.poses.set(eid, PoseState.Milk);
        player.session.sendJson({ t: 'action', state: 'start', ticks: PET_TEND_TICKS });
        return;
      }
      // THE BOND MOMENT: its own lure, offered by hand, out of a
      // fight, on the produce-style rest. Kindness pays; the plain
      // pat costs nothing and pays nothing.
      const tame = tameDef(row.species);
      const now = Date.now();
      if (
        tame &&
        petComp.target === null &&
        now >= (player.petBondAt.get(row.slot) ?? 0) &&
        countItem(player.inventory, tame.lure) >= 1 &&
        removeItem(player.inventory, tame.lure, 1) >= 1
      ) {
        player.petBondAt.set(row.slot, now + PET_BOND_COOLDOWN_MS);
        player.session.sendJson({ t: 'inv', slots: player.inventory });
        if (petHealth && petHealth.hp < petHealth.maxHp) {
          petHealth.hp = Math.min(
            petHealth.maxHp,
            petHealth.hp + Math.ceil(petHealth.maxHp * PET_BOND_HEAL_FRAC),
          );
        }
        this.grantXp(eid, player, 'beastcraft', PET_BOND_XP);
        const petObj = this.pets.get(targetEid);
        if (petObj) this.grantPetXp(player, petObj, row, PET_BOND_PET_XP);
        const lureName = itemDef(tame.lure)?.name.toLowerCase() ?? tame.lure;
        sys(`${row.name} takes the ${lureName} gently from your hand.`);
        return;
      }
      sys(`${row.name} leans into your hand.`);
      return;
    }

    // THE ANIMALS OF THE YARD: a kept animal answers its keeper's
    // whole cascade — and answers everyone else with a polite no.
    const stockComp = this.livestock.get(targetEid);
    if (stockComp) {
      this.interactLivestock(eid, player, targetEid, npc, stockComp, sys);
      return;
    }

    // A wild beast offers the interact hand nothing since THE WILD
    // ANSWERS THE CALL: taming is Gentle the Wild, cast from a
    // technique seat. (Maren teaches it; the codex names the rung.)
    if (!npc.def.produce) return;

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
    // Milking is handwork with a rhythm, not a vending machine: settle
    // in for a few seconds while the animal stands for it. The yield,
    // xp, and cooldown all land in tickMilk when the pail fills.
    if (player.action) this.cancelAction(eid, player);
    const ticks = Math.max(GameServer.MIN_GATHER_TICKS, Math.round(GameServer.MILK_TICKS / this.gatherSpeedOf(player)));
    player.action = { kind: 'milk', targetEid, ticksLeft: ticks };
    pos.dir = Math.atan2(npos.y - pos.y, npos.x - pos.x);
    npc.holdUntilTick = this.tickCount + ticks + 20;
    this.poses.set(eid, PoseState.Milk);
    player.session.sendJson({ t: 'action', state: 'start', ticks });
  }

  /** One full milking, in ticks (3s), before gather-speed brews. */
  private static readonly MILK_TICKS = 60;

  private tickMilk(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as MilkAction;
    const pos = this.positions.get(eid);
    const npc = this.npcs.get(action.targetEid);
    const npos = this.positions.get(action.targetEid);
    // THE YARD REGISTRY IS THE ONLY PAYER for kept animals; the wild
    // def pays the town pens exactly as it always has.
    const stock = this.livestock.get(action.targetEid);
    const yardDef = stock ? LIVESTOCK.get(stock.row.species) : undefined;
    // The animal died, despawned, or was spooked out of hand reach.
    if (!pos || !npc || !npos || (!npc.def.produce && !yardDef)) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    const dx = npos.x - pos.x;
    const dy = npos.y - pos.y;
    if (dx * dx + dy * dy > 2.6 * 2.6) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    // Hands on the flank keep the animal planted, refreshed each tick
    // so it wanders off shortly after the milking ends either way.
    npc.holdUntilTick = this.tickCount + 10;
    if (--action.ticksLeft > 0) return;

    const produce = yardDef ? yardDef.produce : npc.def.produce!;
    const sys = (text: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text });
    // Raced by another milker mid-squeeze: the udder ran dry first.
    if (Date.now() < npc.nextProduceAt) {
      sys(`The ${npc.def.name.toLowerCase()} has nothing left to give.`);
      this.cancelAction(eid, player, 'gone');
      return;
    }
    if (!hasSpaceFor(player.inventory, produce.item)) {
      this.cancelAction(eid, player, 'full');
      return;
    }
    // THE YARD'S CARE FOLD: a kept animal's yield grades by its care
    // — a fed manger (one measure spent per collect) and the brush
    // bond. Fed also hurries the NEXT wait. Deterministic; the town
    // pen's animals stay plain forever (no care facts, no finery).
    let itemId = produce.item;
    let restMult = player.perks.produceRestMult;
    if (stock && yardDef) {
      const row = stock.row;
      const troughKey = `${row.tx},${row.ty}`;
      const trough = this.farmTroughs.get(troughKey);
      const fed = !!trough && trough.feed > 0;
      if (fed) {
        trough.feed -= 1;
        if (trough.feed <= 0) {
          this.farmTroughs.delete(troughKey);
          this.accounts.deleteFarmTrough(row.tx, row.ty);
          this.mirrorTrough({ tx: row.tx, ty: row.ty, feed: 0 });
        } else {
          this.accounts.upsertFarmTrough(row.tx, row.ty, trough.feed);
          this.mirrorTrough(trough);
        }
        restMult *= FED_COOLDOWN_MULT;
      }
      const grade = livestockGrade(fed, row.bond);
      if (grade > 0) itemId = gradedId(produce.item, grade);
      if (grade > 0) {
        sys(grade === 2 ? `${row.name} gives its very best. The care shows.` : `${row.name} gives well today.`);
      }
    }
    // Drover's Bond shortens the animal's rest; Gentle Hand sometimes
    // coaxes a second measure.
    npc.nextProduceAt = Date.now() + Math.round(produce.cooldownSec * 1000 * restMult);
    if (stock) {
      stock.row.nextProduceAt = npc.nextProduceAt;
      this.accounts.saveLivestock(stock.row);
      // THE FLEECE TELLS THE TIME: the shear is a world moment — the
      // clipped body goes out the instant the wool comes off (the
      // slow sweep only has to carry the regrow).
      if (stock.row.species === 'sheep' && stock.shornShown !== true) {
        stock.shornShown = true;
        this.broadcastMetaUpdate(action.targetEid);
      }
    }
    const produceQty = 1 + (Math.random() < player.perks.doubleProduceChance ? 1 : 0);
    addItem(player.inventory, itemId, produceQty);
    this.grantXp(eid, player, 'beastcraft', produce.xp);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    sys(
      stock
        ? `You ${LIVESTOCK.get(stock.row.species)!.produce.verb.toLowerCase()} ${stock.row.name}: ${itemDef(itemId)?.name.toLowerCase() ?? itemId}${produceQty > 1 ? ' twice over' : ''}.`
        : `You collect ${itemDef(produce.item)?.name.toLowerCase() ?? produce.item} from the ${npc.def.name.toLowerCase()}.`,
    );
    this.cancelAction(eid, player, 'done');
  }

  // ---------------------------------------------------- companions

  /**
   * THE GENTLING IS EARNED, NEVER ROLLED (docs/beastcraft-plan.md):
   * deterministic end to end — the skill rung, a worn-down heart (the
   * craven threshold, shared on purpose), the right lure in the pack,
   * and an unbroken kneel. No dice, no pity, no player-state odds.
   * Every refusal speaks, so the refusal IS the tutorial.
   */
  /**
   * THE WILD ANSWERS THE CALL (docs/beastcraft-arts-plan.md): the tame
   * cast. Resolves the mark from the aim cone, speaks the WHOLE
   * refusal ladder before any cost is paid (the dormant-seat
   * discipline), then provokes the beast onto the caster and opens
   * the survival channel on the action rail. Replaces the kneel.
   */
  private tryTameCast(
    eid: EntityId,
    player: PlayerComp,
    slot: AbilitySlot,
    ab: AbilityDef,
    aim: number,
  ): void {
    const pos = this.positions.get(eid);
    if (!pos) return;
    const sys = (text: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text });

    // The mark: nearest tamable body in the aim cone (the homingMarks
    // discipline — forgiving on purpose, pad parity by construction).
    const range = ab.range ?? 5;
    let best: { eid: EntityId; npc: NpcComp; x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const [npcEid, npc] of this.npcs) {
      if (this.pets.has(npcEid) || this.actors.has(npcEid)) continue;
      if (!tameDef(npc.def.id)) continue;
      const npos = this.positions.get(npcEid);
      if (!npos) continue;
      const dx = npos.x - pos.x;
      const dy = npos.y - pos.y;
      const d = Math.hypot(dx, dy) - npc.def.radius;
      if (d > range) continue;
      let diff = Math.abs(Math.atan2(dy, dx) - aim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > 0.65 && d > 1.5) continue;
      if (d < bestD) {
        bestD = d;
        best = { eid: npcEid, npc, x: npos.x, y: npos.y };
      }
    }
    if (!best) {
      sys('Nothing wild in reach answers the call.');
      return;
    }
    const npc = best.npc;
    const targetEid = best.eid;
    const tame = tameDef(npc.def.id)!;
    if (player.characterId < 0) {
      sys('A companion needs a keeper the world will remember. Guests pass through.');
      return;
    }
    // THE BEAST SETS THE BAR (user mandate 2026-08-13): the gate is
    // the mark's own level against the keeper's skill — never a
    // per-species rung. A weak body of a grand kind answers a young
    // keeper; a hard one makes anybody wait.
    const bc = levelForXp(player.skills.beastcraft ?? 0);
    if (bc < npc.def.level) {
      sys(`It is a level ${npc.def.level} beast, and your beastcraft is ${bc}. It will not answer you yet.`);
      return;
    }
    if (player.pets.length >= PET_CAP) {
      sys('Your stalls are full. Three is a household.');
      return;
    }
    // You may finish a fight it started with you — never steal one it
    // is having with somebody else.
    if (npc.state === 'chase' && npc.targetEid !== null && npc.targetEid !== eid) {
      sys('Its eyes are on someone else.');
      return;
    }
    const lureName = itemDef(tame.lure)?.name.toLowerCase() ?? tame.lure;
    if (countItem(player.inventory, tame.lure) < 1) {
      sys(`It noses your pack for ${lureName} and finds none.`);
      return;
    }
    const health = this.healths.get(targetEid);
    if (!health || health.hp <= 0) return;

    // Every refusal has spoken — NOW the cast is paid for.
    player.abilityCd[slot] = Math.max(1, Math.round(ab.cooldownTicks * player.gear.cooldownMult));
    player.lastCombatAt = Date.now();
    this.revealPlayer(eid, player);
    player.drawTicks = 0;
    if (player.action) this.cancelAction(eid, player, 'cast');
    // Call the current companion off — a dog still worrying the beast
    // you are courting would break its own keeper's asking (and the
    // petDefend door holds it off the mark for the channel's length).
    if (player.petEid !== null) {
      const heelPet = this.pets.get(player.petEid);
      if (heelPet) heelPet.target = null;
    }
    // The wild resists the working: the mark turns on the caster.
    // Standing in its teeth to the end IS the test — a beast already
    // worn into the craven window answers in half the time.
    this.npcAggro(targetEid, npc, eid, { force: true });
    const channel = ab.channelTicks ?? 200;
    const craven = health.hp <= Math.floor(health.maxHp * GENTLE_HP_FRAC);
    const ticks = craven ? Math.floor(channel / 2) : channel;
    player.action = { kind: 'tame', targetEid, ticksLeft: ticks };
    pos.dir = Math.atan2(best.y - pos.y, best.x - pos.x);
    this.setPose(eid, PoseState.Art, ticks + 4);
    player.session?.sendJson({ t: 'action', state: 'start', ticks });
    this.broadcastFx({ t: 'fx', kind: 'tame', x: pos.x, y: pos.y, x2: best.x, y2: best.y, radius: 0, id: ab.id, color: ab.color });
    this.bodyMoment(eid, player, 'cast', { x: pos.x, y: pos.y, style: 'beastcraft' });
    this.sendCooldowns(player);
  }

  private tickTame(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as TameAction;
    const pos = this.positions.get(eid);
    const npc = this.npcs.get(action.targetEid);
    const npos = this.positions.get(action.targetEid);
    const tame = npc ? tameDef(npc.def.id) : undefined;
    if (!pos || !npc || !npos || !tame) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    // THE ASKING HOLDS ITS EYES: the beast stays LIVE through the
    // whole channel (no becalming) — but the working keeps it
    // committed to the hand raised at it. A craven heart would
    // otherwise cry for help and bolt toward its kin mid-asking
    // (live-caught: seekhelp broke every craven tame near a wild
    // knot), and a kited mark could idle out of the test entirely.
    // It fights, or it stands; it never leaves.
    if (npc.state !== 'chase' || npc.targetEid !== eid) {
      this.npcAggro(action.targetEid, npc, eid, { force: true });
    }
    // Break only if it truly leaves the working's reach regardless —
    // dragged off, shoved, despawned.
    const dx = npos.x - pos.x;
    const dy = npos.y - pos.y;
    if (dx * dx + dy * dy > 10 * 10) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    // THE UNBROKEN ASKING: no wound interrupts the working — not the
    // keeper's blood (see damagePlayer's cancel list) and not the
    // mark's (a stray cleave, a ticking venom, reflect off the
    // keeper's shield — none of it re-litigates the asking). Only
    // the keeper's own step cancels; the one wound that still ends
    // it is the mortal one — a dead mark leaves nothing to court.
    const health = this.healths.get(action.targetEid);
    if (!health || health.hp <= 0) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    // THE VISIBLE WORKING: the calm drifts hand-to-beast while the
    // asking runs — watchers see it too, on a quiet pulse.
    if (action.ticksLeft % 20 === 0) {
      this.broadcastFx({ t: 'fx', kind: 'tame', x: pos.x, y: pos.y, x2: npos.x, y2: npos.y, radius: 0, id: 'gentle_the_wild' });
    }
    if (--action.ticksLeft > 0) return;

    const sys = (text: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text });
    // Re-checked at the finish line: the kneel is long enough to race.
    if (player.pets.length >= PET_CAP) {
      sys('Your stalls are full. Three is a household.');
      this.cancelAction(eid, player, 'gone');
      return;
    }
    if (removeItem(player.inventory, tame.lure, 1) < 1) {
      sys('The lure left your pack mid-kneel. The beast wanders off, unimpressed.');
      this.cancelAction(eid, player, 'gone');
      return;
    }
    player.session?.sendJson({ t: 'inv', slots: player.inventory });

    const speciesName = npc.def.name;
    const lureName = itemDef(tame.lure)?.name.toLowerCase() ?? tame.lure;
    const used = new Set(player.pets.map((p) => p.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    // A fresh bond leads; the previous heel companion steps back to
    // the stalls (a tame is a ceremony, not a hotswap — swapping
    // stabled friends stays a stable-door act, Phase 4).
    const prev = player.pets.find((p) => p.state === 'heel');
    if (prev) {
      prev.state = 'stabled';
      if (player.characterId > 0) this.accounts.savePetState(player.characterId, prev.slot, 'stabled');
      this.despawnPetEntity(player);
      sys(`${prev.name} falls back to your stalls.`);
    }
    const row: PetRow = {
      slot,
      species: npc.def.id,
      name: speciesName,
      xp: 0,
      state: 'heel',
      restedAt: null,
    };
    player.pets.push(row);
    if (player.characterId > 0) this.accounts.savePet(player.characterId, row, Date.now());
    // A fresh bond starts whole: no carried wounds, no snack clock.
    player.petHp = null;
    player.petBondAt.delete(slot);
    // The same beast, changed: its wild body leaves the world's books
    // and the companion stands up exactly where the asking held it.
    const at = { x: npos.x, y: npos.y };
    // The bond closing is a moment everyone nearby can read.
    this.broadcastFx({ t: 'fx', kind: 'tame', x: pos.x, y: pos.y, x2: at.x, y2: at.y, radius: 1.4, id: 'gentle_the_wild' });
    this.removeTamedNpc(action.targetEid, eid);
    this.trySpawnPet(eid, player, at);
    this.grantXp(eid, player, 'beastcraft', tame.tameXp);
    sys(`The ${speciesName.toLowerCase()} takes the ${lureName} from your hand. It is yours now.`);
    this.sendPet(player, slot);
    this.cancelAction(eid, player, 'done');
  }

  /**
   * A gentled body leaves the wild the way a felled one does — same
   * spawn clock, same site ledgers (a warren thinned by kindness is
   * still thinned) — but with no death, no loot, and no deed.
   */
  private removeTamedNpc(npcEid: EntityId, tamerEid: EntityId): void {
    const npc = this.npcs.get(npcEid);
    if (!npc) return;
    const spawn = this.spawnPoints[npc.spawnIndex];
    if (spawn) {
      spawn.eid = null;
      const baseSec = NPCS.get(spawn.npc)!.respawnSec;
      const sec =
        this.poiSpawnCells.has(npc.spawnIndex) || this.minorSpawnSlots.has(npc.spawnIndex)
          ? Math.max(baseSec, GameServer.POI_RESPAWN_MIN_SEC)
          : baseSec;
      spawn.respawnAt = Date.now() + sec * 1000;
      this.noteHoldWing(npc.spawnIndex, tamerEid);
      this.noteStrongholdKill(npc.spawnIndex, tamerEid);
      this.notePoiKill(npc.spawnIndex, tamerEid);
      this.noteMinorKill(npc.spawnIndex);
    }
    this.wildBodies.delete(npcEid);
    this.removeFromChunks(npcEid);
    this.ecs.destroy(npcEid);
  }

  /**
   * THE KEEPER'S TONGUE: still one wild heart. The fight leaves it —
   * state, target, meter, all forgotten — and the sulk ledger keeps
   * its eyes down for the hold. The feet plant too, so the calm READS
   * as calm. A direct wound re-arms it regardless (damageNpc's forced
   * aggro outranks every mercy — the becalm is a word, not a cage).
   */
  private becalmNpc(npcEid: EntityId, npc: NpcComp, ticks: number): void {
    npc.state = 'idle';
    npc.targetEid = null;
    npc.windupTicks = 0;
    npc.alert = 0;
    npc.alertEid = null;
    npc.helpEid = null;
    npc.noAggroUntilTick = Math.max(npc.noAggroUntilTick, this.tickCount + ticks);
    // The stilled body stands a breath before it drifts again —
    // capped short of the hold so the calm ends in a wander, not a jolt.
    npc.holdUntilTick = Math.max(npc.holdUntilTick, this.tickCount + Math.min(ticks, 120));
    if (this.tickCount >= npc.poseUntilTick) this.poses.set(npcEid, PoseState.Idle);
  }

  /**
   * The nearest live strewn table this beast may answer: inside the
   * table's draw, and never further from home than the leash allows.
   */
  private baitNear(
    pos: { x: number; y: number },
    npc: NpcComp,
  ): { x: number; y: number; power: number } | null {
    let best: { x: number; y: number; power: number } | null = null;
    let bestD = Infinity;
    for (const [sumEid, sum] of this.summons) {
      if (sum.kind !== 'bait') continue;
      const spos = this.positions.get(sumEid);
      if (!spos) continue;
      const d = Math.hypot(spos.x - pos.x, spos.y - pos.y);
      if (d > sum.radius || d >= bestD) continue;
      if (Math.hypot(spos.x - npc.originX, spos.y - npc.originY) > npc.def.leashRange) continue;
      bestD = d;
      best = { x: spos.x, y: spos.y, power: sum.power };
    }
    return best;
  }

  /**
   * The shared pay block for a keeper word: every refusal has spoken
   * by the time this runs (A WORD COSTS NOTHING UNTIL IT IS HEARD).
   * Mirrors the tame door's cost line for line.
   */
  private payKeeperCast(
    eid: EntityId,
    player: PlayerComp,
    slot: AbilitySlot,
    ab: AbilityDef,
  ): void {
    player.abilityCd[slot] = Math.max(1, Math.round(ab.cooldownTicks * player.gear.cooldownMult));
    player.castFreezeUntilTick = this.tickCount + (ab.castFreezeTicks ?? 0);
    player.lastCombatAt = Date.now();
    this.revealPlayer(eid, player);
    player.drawTicks = 0;
    if (player.action) this.cancelAction(eid, player, 'cast');
    this.setPose(eid, PoseState.Art, Math.max(6, (ab.castFreezeTicks ?? 0) + 4));
    const pos = this.positions.get(eid);
    this.bodyMoment(eid, player, 'cast', { x: pos?.x ?? 0, y: pos?.y ?? 0, style: 'beastcraft' });
    this.sendCooldowns(player);
  }

  /** The nearest wild beast in the aim cone (the tame door's own eye). */
  private wildBeastInCone(
    pos: { x: number; y: number },
    aim: number,
    range: number,
  ): { eid: EntityId; npc: NpcComp; x: number; y: number } | null {
    let best: { eid: EntityId; npc: NpcComp; x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const [npcEid, npc] of this.npcs) {
      if (this.pets.has(npcEid) || this.actors.has(npcEid)) continue;
      if (!isWildBeast(npc.def)) continue;
      if ((this.healths.get(npcEid)?.hp ?? 0) <= 0) continue;
      const npos = this.positions.get(npcEid);
      if (!npos) continue;
      const dx = npos.x - pos.x;
      const dy = npos.y - pos.y;
      const d = Math.hypot(dx, dy) - npc.def.radius;
      if (d > range) continue;
      let diff = Math.abs(Math.atan2(dy, dx) - aim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > 0.65 && d > 1.5) continue;
      if (d < bestD) {
        bestD = d;
        best = { eid: npcEid, npc, x: npos.x, y: npos.y };
      }
    }
    return best;
  }

  /**
   * THE KEEPER'S TONGUE — the nine words' one door. Each word speaks
   * its whole refusal ladder aloud BEFORE the cooldown is paid, then
   * pays once and acts. The becalm words act only on the wild; the
   * companion words need the companion; the capstone needs an ear of
   * either kind in reach.
   */
  private tryKeeperArt(
    eid: EntityId,
    player: PlayerComp,
    slot: AbilitySlot,
    ab: AbilityDef,
    aim: number,
  ): void {
    const pos = this.positions.get(eid);
    if (!pos) return;
    const sys = (text: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text });

    if (ab.shape === 'becalm') {
      const best = this.wildBeastInCone(pos, aim, ab.range ?? 5);
      if (!best) {
        sys('Nothing wild in reach hears you.');
        return;
      }
      if (isBeastSovereign(best.npc.def)) {
        sys('That one is too proud to be stilled.');
        return;
      }
      this.payKeeperCast(eid, player, slot, ab);
      const hold = ab.becalmTicks ?? 200;
      this.becalmNpc(best.eid, best.npc, hold);
      pos.dir = Math.atan2(best.y - pos.y, best.x - pos.x);
      // Rank IV: the calm spreads to beasts standing beside the mark.
      const spread = ab.radius ?? 0;
      if (spread > 0) {
        for (const [oEid, other] of this.npcs) {
          if (oEid === best.eid || this.pets.has(oEid) || this.actors.has(oEid)) continue;
          if (!isWildBeast(other.def) || isBeastSovereign(other.def)) continue;
          const opos = this.positions.get(oEid);
          if (!opos || Math.hypot(opos.x - best.x, opos.y - best.y) > spread) continue;
          this.becalmNpc(oEid, other, hold);
        }
      }
      this.broadcastFx({
        t: 'fx', kind: 'becalm', x: best.x, y: best.y, radius: spread,
        ticks: hold, id: ab.id, color: ab.color,
      });
      return;
    }

    if (ab.shape === 'wild_howl') {
      const radius = ab.radius ?? 7;
      const ears: Array<{ eid: EntityId; npc: NpcComp }> = [];
      for (const [npcEid, npc] of this.npcs) {
        if (this.pets.has(npcEid) || this.actors.has(npcEid)) continue;
        if (!isWildBeast(npc.def) || isBeastSovereign(npc.def)) continue;
        if ((this.healths.get(npcEid)?.hp ?? 0) <= 0) continue;
        const npos = this.positions.get(npcEid);
        if (!npos || Math.hypot(npos.x - pos.x, npos.y - pos.y) - npc.def.radius > radius) continue;
        ears.push({ eid: npcEid, npc });
      }
      const petEid = player.petEid;
      const petUp = petEid !== null && (this.healths.get(petEid)?.hp ?? 0) > 0;
      if (ears.length === 0 && !petUp) {
        sys('Nothing wild is near enough to hear you.');
        return;
      }
      this.payKeeperCast(eid, player, slot, ab);
      const hold = ab.becalmTicks ?? 160;
      for (const ear of ears) this.becalmNpc(ear.eid, ear.npc, hold);
      if (petUp && petEid !== null) {
        const pet = this.pets.get(petEid);
        const health = this.healths.get(petEid);
        if (pet && health) {
          if (ab.petHealFrac) {
            health.hp = Math.min(health.maxHp, health.hp + Math.ceil(health.maxHp * ab.petHealFrac));
          }
          if (ab.petSurge) {
            pet.surge = {
              dmgMult: ab.petSurge.dmgMult,
              speedMult: ab.petSurge.speedMult,
              untilTick: this.tickCount + ab.petSurge.durationTicks,
              temper: ab.petSurge.temper,
              artId: ab.id,
            };
          }
        }
      }
      this.broadcastFx({
        t: 'fx', kind: 'howl', x: pos.x, y: pos.y, radius,
        ticks: hold, id: ab.id, color: ab.color,
      });
      // Every stilled head is its own readable beat (capped — the
      // ring fx already owns the moment in a crowd).
      for (const ear of ears.slice(0, 8)) {
        const epos = this.positions.get(ear.eid);
        if (!epos) continue;
        this.broadcastFx({
          t: 'fx', kind: 'becalm', x: epos.x, y: epos.y, radius: 0,
          ticks: hold, id: ab.id, color: ab.color,
        });
      }
      return;
    }

    // ---- pet_command: the words spoken to the companion.
    const row = player.pets.find((p) => p.state === 'heel');
    if (!row) {
      sys('No friend walks with you.');
      return;
    }
    const petEid = player.petEid;
    const petHealth = petEid !== null ? this.healths.get(petEid) : undefined;
    const petDown = petEid !== null && (petHealth?.hp ?? 0) <= 0;

    switch (ab.command) {
      case 'heel': {
        if (petDown) {
          sys('Your friend is down. Kneel to it instead.');
          return;
        }
        this.payKeeperCast(eid, player, slot, ab);
        // The road folds shut: the body (wherever it is, or isn't)
        // re-forms at the keeper's side, its fight dropped, its
        // wounds walking with it as they always do.
        if (petEid !== null) {
          const pet = this.pets.get(petEid);
          if (pet) pet.target = null;
          this.despawnPetEntity(player);
        }
        this.trySpawnPet(eid, player);
        if (player.petEid !== null) {
          const pet = this.pets.get(player.petEid);
          const health = this.healths.get(player.petEid);
          if (health && ab.petHealFrac) {
            health.hp = Math.min(health.maxHp, health.hp + Math.ceil(health.maxHp * ab.petHealFrac));
          }
          if (pet && ab.petSurge) {
            pet.surge = {
              dmgMult: ab.petSurge.dmgMult,
              speedMult: ab.petSurge.speedMult,
              untilTick: this.tickCount + ab.petSurge.durationTicks,
              temper: ab.petSurge.temper,
              artId: ab.id,
            };
          }
          const ppos = this.positions.get(player.petEid);
          if (ppos) {
            this.broadcastFx({
              t: 'fx', kind: 'command', x: pos.x, y: pos.y, x2: ppos.x, y2: ppos.y,
              radius: 0, id: ab.id, color: ab.color,
            });
          }
          sys(`${row.name} is at your side.`);
        }
        return;
      }
      case 'fang': {
        if (petEid === null) {
          sys('Your friend is not beside you.');
          return;
        }
        if (petDown) {
          sys('Your friend is down. Kneel to it instead.');
          return;
        }
        const range = ab.range ?? 7;
        let mark: { eid: EntityId; npc: NpcComp; x: number; y: number } | null = null;
        let bestD = Infinity;
        for (const [npcEid, npc] of this.npcs) {
          if (this.pets.has(npcEid) || this.actors.has(npcEid)) continue;
          if ((this.healths.get(npcEid)?.hp ?? 0) <= 0) continue;
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          const dx = npos.x - pos.x;
          const dy = npos.y - pos.y;
          const d = Math.hypot(dx, dy) - npc.def.radius;
          if (d > range) continue;
          let diff = Math.abs(Math.atan2(dy, dx) - aim) % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff > 0.65 && d > 1.5) continue;
          if (d < bestD) {
            bestD = d;
            mark = { eid: npcEid, npc, x: npos.x, y: npos.y };
          }
        }
        if (!mark) {
          sys('Nothing in reach to point at.');
          return;
        }
        this.payKeeperCast(eid, player, slot, ab);
        pos.dir = Math.atan2(mark.y - pos.y, mark.x - pos.x);
        const pet = this.pets.get(petEid);
        if (pet) {
          pet.target = mark.eid;
          // Rank III: the first bite after the point lands deep.
          if (ab.petSurge) {
            pet.surge = {
              dmgMult: ab.petSurge.dmgMult,
              speedMult: ab.petSurge.speedMult,
              untilTick: this.tickCount + ab.petSurge.durationTicks,
              temper: ab.petSurge.temper,
              artId: ab.id,
            };
          }
        }
        // The mark forgets you entirely: its eyes are pulled onto the
        // friend through the one aggro door (peace-break aims the pet
        // and charges no assault — the Phase 2 law).
        this.npcAggro(mark.eid, mark.npc, petEid, { force: true });
        // Rank IV: the dare carries to whoever stands beside the mark.
        const dare = ab.radius ?? 0;
        if (dare > 0) {
          for (const [oEid, other] of this.npcs) {
            if (oEid === mark.eid || this.pets.has(oEid) || this.actors.has(oEid)) continue;
            if (other.def.damage <= 0 || (this.healths.get(oEid)?.hp ?? 0) <= 0) continue;
            const opos = this.positions.get(oEid);
            if (!opos || Math.hypot(opos.x - mark.x, opos.y - mark.y) > dare) continue;
            this.npcAggro(oEid, other, petEid, { force: true });
          }
        }
        this.broadcastFx({
          t: 'fx', kind: 'command', x: pos.x, y: pos.y, x2: mark.x, y2: mark.y,
          radius: dare, id: ab.id, color: ab.color,
        });
        return;
      }
      case 'mend': {
        if (petEid === null) {
          sys('Your friend is not beside you.');
          return;
        }
        if (petDown) {
          sys('Your friend is down. Kneel to it instead.');
          return;
        }
        const ppos = this.positions.get(petEid);
        if (!ppos || Math.hypot(ppos.x - pos.x, ppos.y - pos.y) > (ab.range ?? 8)) {
          sys('Your friend is too far for the throw.');
          return;
        }
        this.payKeeperCast(eid, player, slot, ab);
        const pet = this.pets.get(petEid);
        const health = this.healths.get(petEid);
        if (health && ab.petHealFrac) {
          health.hp = Math.min(health.maxHp, health.hp + Math.max(1, Math.ceil(health.maxHp * ab.petHealFrac)));
        }
        // Rank III: the balm sheds whatever rides the friend.
        if (ab.petCleanse) this.statuses.delete(petEid);
        // Rank IV: the hide stays tough a while.
        if (pet && ab.petGuard) {
          pet.guard = { armor: ab.petGuard.armor, untilTick: this.tickCount + ab.petGuard.durationTicks };
        }
        this.broadcastFx({
          t: 'fx', kind: 'command', x: pos.x, y: pos.y, x2: ppos.x, y2: ppos.y,
          radius: 0, id: ab.id, color: ab.color,
        });
        return;
      }
      case 'surge': {
        if (petEid === null) {
          sys('Your friend is not beside you.');
          return;
        }
        if (petDown) {
          sys('Your friend is down. Kneel to it instead.');
          return;
        }
        this.payKeeperCast(eid, player, slot, ab);
        const pet = this.pets.get(petEid);
        if (pet && ab.petSurge) {
          pet.surge = {
            dmgMult: ab.petSurge.dmgMult,
            speedMult: ab.petSurge.speedMult,
            untilTick: this.tickCount + ab.petSurge.durationTicks,
            temper: ab.petSurge.temper,
              artId: ab.id,
          };
        }
        const ppos = this.positions.get(petEid);
        this.broadcastFx({
          t: 'fx', kind: 'command', x: pos.x, y: pos.y,
          x2: ppos?.x ?? pos.x, y2: ppos?.y ?? pos.y,
          radius: 0, ticks: ab.petSurge?.durationTicks ?? 0, id: ab.id, color: ab.color,
        });
        return;
      }
      case 'rise': {
        if (petEid === null || !petDown) {
          sys('No fallen friend hears you.');
          return;
        }
        const ppos = this.positions.get(petEid);
        if (!ppos || Math.hypot(ppos.x - pos.x, ppos.y - pos.y) > (ab.range ?? 10)) {
          sys('No fallen friend hears you.');
          return;
        }
        this.payKeeperCast(eid, player, slot, ab);
        // The rise, by word instead of kneel: the tend's completion
        // body at range — no salve, no kneel XP (the cry is an art,
        // never a new faucet), the same honest stand-where-it-fell.
        const pet = this.pets.get(petEid)!;
        const npc = this.npcs.get(petEid);
        const health = this.healths.get(petEid)!;
        const bc = levelForXp(player.skills.beastcraft ?? 0);
        const base = NPCS.get(row.species);
        const stats = base ? petStatBlock(row.species, petLevelFor(row.xp, base.level, bc), bc) : null;
        health.hp = Math.max(1, Math.ceil((stats?.maxHp ?? health.maxHp) * (ab.petHealFrac ?? 0.35)));
        pet.downedUntil = 0;
        pet.lastHurtTick = this.tickCount;
        this.poses.set(petEid, PoseState.Idle);
        if (npc) npc.poseUntilTick = 0;
        // Rank IV: it rises angry, hide tough and teeth quick.
        if (ab.petSurge) {
          pet.surge = {
            dmgMult: ab.petSurge.dmgMult,
            speedMult: ab.petSurge.speedMult,
            untilTick: this.tickCount + ab.petSurge.durationTicks,
            temper: ab.petSurge.temper,
              artId: ab.id,
          };
        }
        if (ab.petGuard) {
          pet.guard = { armor: ab.petGuard.armor, untilTick: this.tickCount + ab.petGuard.durationTicks };
        }
        this.broadcastFx({
          t: 'fx', kind: 'command', x: pos.x, y: pos.y, x2: ppos.x, y2: ppos.y,
          radius: 1, id: ab.id, color: ab.color,
        });
        sys(`${row.name} hears you and stands.`);
        this.sendPet(player);
        return;
      }
    }
  }

  /**
   * Stand the heel companion beside its keeper (or exactly where it
   * was gentled). Safe no-op when a body already stands or nothing
   * is at heel — every arrival path may call it blind.
   */
  private trySpawnPet(eid: EntityId, player: PlayerComp, at?: { x: number; y: number }): void {
    if (player.petEid !== null) return;
    const row = player.pets.find((p) => p.state === 'heel');
    if (!row) return;
    const def = NPCS.get(row.species);
    if (!def) {
      console.warn(`[pets] '${row.species}' is not in the bestiary — ${player.name}'s slot ${row.slot} stays trailing`);
      return;
    }
    const opos = this.positions.get(eid);
    if (!opos) return;
    let x = at?.x ?? opos.x + 0.9;
    let y = at?.y ?? opos.y + 0.4;
    if (!at) {
      for (let tries = 0; tries < 10; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.0 + Math.random() * 1.4;
        const tx = opos.x + Math.cos(a) * r;
        const ty = opos.y + Math.sin(a) * r;
        if (!this.world.isSolid(Math.floor(tx), Math.floor(ty))) {
          x = tx;
          y = ty;
          break;
        }
      }
    }
    const petEid = this.spawnNpc(def, x, y, -1);
    this.pets.set(petEid, {
      ownerEid: eid,
      slot: row.slot,
      stuckTicks: 0,
      target: null,
      lastHurtTick: 0,
      trickleTarget: null,
      trickleBank: 0,
      downedUntil: 0,
    });
    // THE ONE STAT SITE: health from petStatBlock (species curve under
    // the keeper's hand), wounds carried back in from trailing.
    const bc = levelForXp(player.skills.beastcraft ?? 0);
    const stats = petStatBlock(row.species, petLevelFor(row.xp, def.level, bc), bc);
    if (stats) {
      this.healths.set(petEid, {
        hp: Math.min(player.petHp ?? stats.maxHp, stats.maxHp),
        maxHp: stats.maxHp,
      });
    }
    player.petHp = null;
    player.petEid = petEid;
    player.petCalmTicks = 0;
  }

  /** Take the companion's body out of the world (trailing, stabling, logout). */
  private despawnPetEntity(player: PlayerComp): void {
    if (player.petEid === null) return;
    // Wounds walk with the body — trailing is never a heal.
    const h = this.healths.get(player.petEid);
    if (h && h.hp > 0) player.petHp = h.hp;
    this.removeFromChunks(player.petEid);
    this.ecs.destroy(player.petEid);
    player.petEid = null;
  }

  /**
   * THE HEEL: the companion's whole brain, run INSTEAD of the wild
   * state machine — no perception, no aggro, no wander, no lays — so
   * a pet can never be rallied, spooked, or pulled, and mobs cannot
   * see it (THE QUIET SHADOW). Phase 2 grows the fight onto this.
   */
  private tickPet(eid: EntityId, npc: NpcComp, pos: PositionComp, pet: PetComp): void {
    const owner = this.players.get(pet.ownerEid);
    if (!owner || owner.petEid !== eid) {
      // Orphaned by a despawn race — no unpiloted bodies, ever.
      this.removeFromChunks(eid);
      this.ecs.destroy(eid);
      return;
    }
    const opos = this.positions.get(pet.ownerEid);
    if (!opos) return;
    const dx = opos.x - pos.x;
    const dy = opos.y - pos.y;
    const dist = Math.hypot(dx, dy);

    // ---- THE FALL IS NEVER THE END: a downed body lies where it
    // fell — no follow, no fight, no regen — until the tend, the
    // lapse, or the keeper leaving it behind sends it home.
    const downedHp = this.healths.get(eid);
    if (downedHp && downedHp.hp <= 0) {
      if (dist > PET_TRAIL_OUT || this.tickCount >= pet.downedUntil) {
        this.petLimpsHome(owner);
        return;
      }
      this.poses.set(eid, PoseState.Lie);
      return;
    }

    // THE HEEL FORGIVES THE ROAD: too far behind, slip to trailing —
    // the row remembers, the calm counter brings it back.
    if (dist > PET_TRAIL_OUT) {
      this.despawnPetEntity(owner);
      return;
    }

    // THE VISIBLE WORKING: while a surge rides the friend, the word
    // that lit it pulses quietly at its shoulders (the tame channel's
    // cadence), so the working stays readable for its whole life.
    if (pet.surge && this.tickCount < pet.surge.untilTick && (this.tickCount + eid) % 25 === 0) {
      this.broadcastFx({
        t: 'fx',
        kind: 'command',
        x: pos.x,
        y: pos.y,
        x2: pos.x,
        y2: pos.y,
        radius: 0,
        id: pet.surge.artId ?? 'blood_of_the_pack',
      });
    }

    // ---- THE FANG BESIDE YOU: the fight, when one is on.
    if (pet.target !== null) {
      const tnpc = this.npcs.get(pet.target);
      const thp = this.healths.get(pet.target);
      const tpos = this.positions.get(pet.target);
      if (
        !tnpc ||
        !thp ||
        thp.hp <= 0 ||
        !tpos ||
        // The heel outranks the hunt: a keeper walking away ends the
        // fight — the companion is a defender, never a send-and-forget.
        dist > PET_FIGHT_LEASH ||
        Math.hypot(tpos.x - opos.x, tpos.y - opos.y) > PET_FIGHT_LEASH + 6
      ) {
        pet.target = null;
        npc.windupTicks = 0;
      } else {
        // Mid-windup: planted, committed — the mob telegraph grammar.
        if (npc.windupTicks > 0) {
          if (--npc.windupTicks === 0) {
            // THE SPECIES SPEAK: a pouncer's windup ends in the leap —
            // the boar's gore, the bear's charge, the owl's swoop —
            // exactly the wild body's own opener (mob pounce math).
            let d = Math.hypot(tpos.x - pos.x, tpos.y - pos.y) - tnpc.def.radius;
            if (npc.def.pounce && d > npc.def.attackRange && d < 3.2) {
              const leap = Math.min(1.3, d - 0.4);
              const ldx = (tpos.x - pos.x) / (d + tnpc.def.radius);
              const ldy = (tpos.y - pos.y) / (d + tnpc.def.radius);
              for (let step = 0; step < 4; step++) {
                const next = stepMovement(
                  pos,
                  { mx: ldx, my: ldy },
                  leap,
                  1 / 4,
                  this.world,
                  npc.def.radius,
                );
                pos.x = next.x;
                pos.y = next.y;
              }
              this.updateChunkMembership(eid);
              d = Math.hypot(tpos.x - pos.x, tpos.y - pos.y) - tnpc.def.radius;
            }
            // Stepping out of a windup dodges a pet's bite too
            // (+0.85 = the mobs' own +0.55 land grace over the +0.3
            // open grace, kept in the same proportion).
            if (d <= npc.def.attackRange + 0.85) {
              this.petStrike(eid, npc, pet, owner, pet.target);
            }
            npc.attackCooldown = npc.def.attackCooldownTicks;
          }
          return;
        }
        const d = Math.hypot(tpos.x - pos.x, tpos.y - pos.y) - tnpc.def.radius;
        // THE STAND-GROUND BAND: the pet stops and fights anywhere
        // inside its own LANDING grace (+0.85), not just its opening
        // reach. A tighter stop bred the mutual-dodge orbit (pet
        // micro-chases a target that is itself chasing the pet, both
        // perpetually stepping out of each other's windups — a
        // live-caught stalemate that could stall a fight for a
        // minute). Standing inside the land grace means both sides'
        // blows connect and the fight RESOLVES. Pouncers open from
        // leap distance: the telegraph is the crouch.
        if (d <= npc.def.attackRange + (npc.def.pounce ? 1.6 : 0.85)) {
          pos.dir = Math.atan2(tpos.y - pos.y, tpos.x - pos.x);
          if (npc.attackCooldown === 0) {
            npc.windupTicks = PET_WINDUP_TICKS;
            this.setNpcPose(eid, npc, PoseState.Attack, PET_WINDUP_TICKS + 4);
          } else if (this.tickCount >= npc.poseUntilTick) {
            this.poses.set(eid, PoseState.Idle);
          }
          return;
        }
        // Close the gap at fighting stride. Inside pressing distance
        // the polite step-aside is waived — the closest body must be
        // ALLOWED to close (the packmate-wedge wart's cure, applied
        // to the one body it hurt most).
        let mx = (tpos.x - pos.x) / (d + tnpc.def.radius);
        let my = (tpos.y - pos.y) / (d + tnpc.def.radius);
        let speed = npc.def.speed;
        // The surge quickens the FIGHTING stride only — the heel walk
        // keeps its own unhurried law (and the 12 t/s lane is never
        // in question from a wild body's base).
        if (pet.surge && this.tickCount < pet.surge.untilTick) speed *= pet.surge.speedMult;
        if (this.isChilled(eid)) speed *= CHILL_SPEED_FACTOR;
        if (d > npc.def.attackRange * 1.5 + 0.3) {
          ({ mx, my } = this.separateHeading(eid, pos, npc.def.radius, mx, my));
        }
        const next = stepMovement(pos, { mx, my }, speed, TICK_DT, this.world, npc.def.radius);
        if (next.x !== pos.x || next.y !== pos.y) {
          pos.dir = Math.atan2(my, mx);
          pos.x = next.x;
          pos.y = next.y;
          this.updateChunkMembership(eid);
        }
        if (this.tickCount >= npc.poseUntilTick) this.poses.set(eid, PoseState.Walk);
        return;
      }
    }

    // ---- Licked wounds close out of combat: slow, steady, staggered.
    if (this.tickCount - pet.lastHurtTick > PET_REGEN_DELAY_TICKS) {
      const h = this.healths.get(eid);
      if (h && h.hp < h.maxHp && (this.tickCount + eid) % PET_REGEN_TICKS === 0) h.hp++;
    }

    // ---- THE HEEL.
    const speed = petFollowSpeed(npc.def.speed, dist) * (this.isChilled(eid) ? CHILL_SPEED_FACTOR : 1);
    if (speed > 0) {
      let mx = dx / dist;
      let my = dy / dist;
      ({ mx, my } = this.separateHeading(eid, pos, npc.def.radius, mx, my));
      const next = stepMovement(pos, { mx, my }, speed, TICK_DT, this.world, npc.def.radius);
      const moved = next.x !== pos.x || next.y !== pos.y;
      if (moved) {
        pos.dir = Math.atan2(my, mx);
        pos.x = next.x;
        pos.y = next.y;
        this.updateChunkMembership(eid);
        pet.stuckTicks = 0;
      } else if (dist > PET_CATCHUP_DIST && ++pet.stuckTicks > 60) {
        // Wedged behind a wall while the keeper walks on: slip to
        // trailing and re-emerge — never a body dragged across the map.
        this.despawnPetEntity(owner);
        return;
      }
      if (this.tickCount >= npc.poseUntilTick) {
        this.poses.set(eid, moved ? PoseState.Walk : PoseState.Idle);
      }
    } else {
      pet.stuckTicks = 0;
      // At heel: settle, eyes on the keeper.
      if (dist > 0.01) pos.dir = Math.atan2(dy, dx);
      if (this.tickCount >= npc.poseUntilTick) this.poses.set(eid, PoseState.Idle);
    }
  }

  /**
   * DEFEND THE HAND — the only three doors into a companion's fight:
   * something wounds the keeper (urgent — the new threat takes the
   * teeth), the keeper wounds something, or something wounds the pet.
   * Never perception, never proximity, never another keeper's fight.
   * THE FANG KNOWS ITS FRIENDS: actors are refused outright — a
   * companion joins no crime and fights no townsperson, whatever its
   * keeper is up to.
   */
  private petDefend(ownerEid: EntityId, owner: PlayerComp, mobEid: EntityId, urgent = false): void {
    if (!owner.petEid) return;
    // THE ASKING HOLDS THE FANG: while the keeper channels a tame, the
    // very beast being courted draws keeper blood — the companion must
    // hold back from the channel's own mark, or it would break every
    // full-health asking its keeper ever attempts.
    if (owner.action?.kind === 'tame' && owner.action.targetEid === mobEid) return;
    const pet = this.pets.get(owner.petEid);
    if (!pet) return;
    // A downed friend defends nobody — it is busy breathing.
    if ((this.healths.get(owner.petEid)?.hp ?? 0) <= 0) return;
    if (
      !urgent &&
      pet.target !== null &&
      this.npcs.has(pet.target) &&
      (this.healths.get(pet.target)?.hp ?? 0) > 0
    ) {
      return; // one mark at a time; only the keeper's blood re-aims
    }
    if (!this.npcs.has(mobEid) || this.pets.has(mobEid)) return;
    if (this.actors.has(mobEid)) return;
    const hp = this.healths.get(mobEid);
    if (!hp || hp.hp <= 0) return;
    pet.target = mobEid;
  }

  /**
   * One companion bite: ONE PIPELINE end to end — the species die
   * through npcMaxHit at the pet's own level, the keeper's hand
   * multiplier from the one stat site, a uniform 0..maxHit roll at
   * the strike site (0 = whiff, sacred), then the same damageNpc door
   * every blow in the game walks through, flagged viaPet so credit
   * lands on the keeper and benefit lands nowhere.
   */
  private petStrike(
    petEid: EntityId,
    npc: NpcComp,
    pet: PetComp,
    owner: PlayerComp,
    targetEid: EntityId,
  ): void {
    const row = owner.pets.find((p) => p.slot === pet.slot);
    if (!row) return;
    const bc = levelForXp(owner.skills.beastcraft ?? 0);
    const base = NPCS.get(row.species);
    if (!base) return;
    const level = petLevelFor(row.xp, base.level, bc);
    const stats = petStatBlock(row.species, level, bc);
    if (!stats) return;
    // THE KEEPER'S TONGUE: a live surge window quickens the teeth;
    // THE WHOLE TEMPER doubles the kit's status and lets blows shove.
    const surge = pet.surge && this.tickCount < pet.surge.untilTick ? pet.surge : undefined;
    const maxHit = Math.round(npcMaxHit(stats.die, level) * stats.dmgMult * (surge?.dmgMult ?? 1));
    const dmg = Math.floor(Math.random() * (maxHit + 1));
    // THE SPECIES SPEAK: the bite carries the kit's status (or the
    // wild body's own), and the gore shoves — the same teeth it was
    // born with, re-aimed. Status DoTs are marked fromPet at the
    // application site so their ticks train nobody's school.
    const kit = tameDef(row.species)?.kit;
    const bite = kit?.bite ?? base.attackStatus;
    const temper = surge?.temper === true;
    this.damageNpc(targetEid, dmg, pet.ownerEid, 'beastcraft', {
      viaPet: { petEid },
      status: bite && temper ? { ...bite, power: bite.power * 2 } : bite,
      knockbackMult: temper ? Math.max(kit?.knockback ?? 1, 1.2) : (kit?.knockback ?? 1),
    });
  }

  /**
   * The mob-side rail: every wound a companion takes routes here.
   * Strike sites roll upstream (whiff-0 held there); this door
   * mitigates with the keeper's hand (armor from the one stat site)
   * and applies the species' own resists to whatever rode the blow.
   * Players never reach it — their door, damageNpc, refuses pets.
   */
  private damagePet(
    petEid: EntityId,
    raw: number,
    opts: {
      status?: StatusApply;
      attackerLevel?: number;
      sourceEid?: EntityId;
      pierceArmor?: boolean;
    } = {},
  ): void {
    const pet = this.pets.get(petEid);
    const health = this.healths.get(petEid);
    const npc = this.npcs.get(petEid);
    if (!pet || !health || !npc) return;
    // A fallen body takes no further wounds (the dying-body law).
    if (health.hp <= 0) return;
    const owner = this.players.get(pet.ownerEid);
    const row = owner?.pets.find((p) => p.slot === pet.slot);
    const bc = owner ? levelForXp(owner.skills.beastcraft ?? 0) : 1;
    const base = row ? NPCS.get(row.species) : undefined;
    const stats =
      row && base ? petStatBlock(row.species, petLevelFor(row.xp, base.level, bc), bc) : null;
    // THE KEEPER'S TONGUE: a live guard window thickens the hide.
    const guardArmor = pet.guard && this.tickCount < pet.guard.untilTick ? pet.guard.armor : 0;
    const dmg = opts.pierceArmor
      ? raw
      : mitigate(raw, 0, (stats?.armor ?? 0) + guardArmor, opts.attackerLevel ?? 1);
    this.broadcastHit(petEid, dmg);
    pet.lastHurtTick = this.tickCount;
    if (dmg <= 0) return; // the whiff and the clank both write nothing
    health.hp -= dmg;
    this.setNpcPose(petEid, npc, PoseState.Hurt, 4);
    npc.windupTicks = 0; // a solid hit interrupts the bite
    if (health.hp > 0 && opts.status) {
      // The shell keeps its wild virtues: species resists and
      // weaknesses answer exactly as they did before the collar.
      this.applyStatusToNpc(petEid, opts.status, opts.sourceEid ?? petEid, 'beastcraft');
    }
    if (owner && opts.sourceEid !== undefined) {
      this.petDefend(pet.ownerEid, owner, opts.sourceEid, false);
    }
    if (health.hp <= 0) {
      health.hp = 0;
      if (owner) this.petGoesDown(petEid, pet, npc, owner);
    }
  }

  /**
   * THE FALL IS NEVER THE END — the true ceremony (supersedes Phase
   * 2's interim slip-away). The body STAYS where it fell: breathing,
   * untargetable, done fighting, lying in the ragdoll dialect. The
   * keeper has the downed window to kneel and tend it up where it
   * fell; past the window, past the leash, or past the keeper's own
   * fall/logout, it drags itself home to rest instead. Downtime is
   * the only cost — the friend is never lost, never a corpse.
   */
  private petGoesDown(petEid: EntityId, pet: PetComp, npc: NpcComp, owner: PlayerComp): void {
    const row = owner.pets.find((p) => p.slot === pet.slot);
    pet.downedUntil = this.tickCount + PET_DOWNED_TICKS;
    pet.target = null;
    npc.windupTicks = 0;
    npc.holdUntilTick = 0;
    this.poses.set(petEid, PoseState.Lie);
    npc.poseUntilTick = this.tickCount + PET_DOWNED_TICKS;
    // The fallen body sheds its afflictions — nothing burns a friend
    // who is already down (the dying-body law's gentler sibling).
    this.statuses.delete(petEid);
    owner.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `${row?.name ?? 'Your companion'} goes down, breath ragged. Kneel to it soon or it will drag itself home.`,
    });
  }

  /**
   * The limp home: the row turns 'resting' with a wall-clock stamp
   * (logouts never reset a convalescence), the body leaves the world,
   * and when the rest ends the friend takes an empty heel again on
   * its own. Phase 4's stable door adds the manual collect.
   */
  private petLimpsHome(owner: PlayerComp): void {
    const pet = owner.petEid !== null ? this.pets.get(owner.petEid) : null;
    const row = pet ? owner.pets.find((p) => p.slot === pet.slot) : undefined;
    this.despawnPetEntity(owner);
    owner.petHp = null; // the rest restores the body whole
    if (row) {
      row.state = 'resting';
      row.restedAt = Date.now();
      if (owner.characterId > 0) {
        this.accounts.savePetRest(owner.characterId, row.slot, 'resting', row.restedAt);
      }
    }
    owner.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `${row?.name ?? 'Your companion'} drags itself off toward your stalls. It will find its feet there.`,
    });
  }

  private tickTend(eid: EntityId, player: PlayerComp): void {
    const action = player.action! as TendAction;
    const pos = this.positions.get(eid);
    const pet = this.pets.get(action.targetEid);
    const ppos = this.positions.get(action.targetEid);
    const health = this.healths.get(action.targetEid);
    // The body limped home mid-kneel, or someone drifted.
    if (!pos || !pet || !ppos || !health || pet.ownerEid !== eid || health.hp > 0) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    const dx = ppos.x - pos.x;
    const dy = ppos.y - pos.y;
    if (dx * dx + dy * dy > 2.6 * 2.6) {
      this.cancelAction(eid, player, 'gone');
      return;
    }
    if (--action.ticksLeft > 0) return;

    // The rise: on its feet where it fell, shaky but standing — or
    // near whole when the keeper's pack carries the brewer's salve
    // (THE SALVE: herbalism sells to hunters; the jar is spent).
    const row = player.pets.find((p) => p.slot === pet.slot);
    const bc = levelForXp(player.skills.beastcraft ?? 0);
    const base = row ? NPCS.get(row.species) : undefined;
    const stats =
      row && base ? petStatBlock(row.species, petLevelFor(row.xp, base.level, bc), bc) : null;
    let riseFrac = PET_TEND_HP_FRAC;
    if (removeItem(player.inventory, 'mending_salve', 1) >= 1) {
      riseFrac = PET_TEND_SALVE_FRAC;
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
    }
    health.hp = Math.max(1, Math.ceil((stats?.maxHp ?? health.maxHp) * riseFrac));
    pet.downedUntil = 0;
    pet.lastHurtTick = this.tickCount; // the rise is not yet the mend
    this.poses.set(action.targetEid, PoseState.Idle);
    const npc = this.npcs.get(action.targetEid);
    if (npc) npc.poseUntilTick = 0;
    this.grantXp(eid, player, 'beastcraft', PET_TEND_XP);
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text:
        riseFrac === PET_TEND_SALVE_FRAC
          ? `The salve does its quiet work. ${row?.name ?? 'Your companion'} stands, nearly whole.`
          : `${row?.name ?? 'Your companion'} finds its feet, shaky but standing.`,
    });
    this.sendPet(player);
    this.cancelAction(eid, player, 'done');
  }

  /**
   * The rested rise (called on the input beat, staggered): a resting
   * row whose convalescence has run takes an empty heel again on its
   * own — "it finds you when it is well" — or waits at the stalls,
   * whole, when another friend holds the heel. The wall-clock stamp
   * means a logout never resets a convalescence.
   */
  private tickPetRest(eid: EntityId, player: PlayerComp): void {
    if ((this.tickCount + eid) % 20 !== 0) return;
    const now = Date.now();
    const heelHeld = player.pets.some((p) => p.state === 'heel');
    let taken = heelHeld;
    for (const row of player.pets) {
      if (row.state !== 'resting') continue;
      if (row.restedAt !== null && now < row.restedAt + PET_REST_HOME_MS) continue;
      if (!taken) {
        taken = true;
        row.state = 'heel';
        row.restedAt = null;
        if (player.characterId > 0) {
          this.accounts.savePetRest(player.characterId, row.slot, 'heel', null);
        }
        player.petHp = null;
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `${row.name} returns to your side, rested and whole.`,
        });
      } else {
        row.state = 'stabled';
        row.restedAt = null;
        if (player.characterId > 0) {
          this.accounts.savePetRest(player.characterId, row.slot, 'stabled', null);
        }
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `${row.name} waits at your stalls, rested and whole.`,
        });
      }
    }
  }

  /** The pet's own ladder: xp in, level ceremonies out, cadence-saved. */
  private grantPetXp(owner: PlayerComp, pet: PetComp, row: PetRow, amount: number): void {
    if (amount <= 0) return;
    const bc = levelForXp(owner.skills.beastcraft ?? 0);
    const base = NPCS.get(row.species)?.level ?? 1;
    const before = petLevelFor(row.xp, base, bc);
    row.xp += amount;
    owner.petXpDirty = true;
    const after = petLevelFor(row.xp, base, bc);
    if (after > before) {
      // The body grows where it stands: new ceiling, the growth kept
      // as health, the nameplate retold to every watcher.
      const stats = petStatBlock(row.species, after, bc);
      const h = owner.petEid !== null ? this.healths.get(owner.petEid) : null;
      if (stats && h) {
        const grown = Math.max(0, stats.maxHp - h.maxHp);
        h.maxHp = stats.maxHp;
        h.hp = Math.min(stats.maxHp, h.hp + grown);
      }
      if (owner.petEid !== null) this.broadcastMetaUpdate(owner.petEid);
      owner.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `${row.name} grows stronger. Level ${after}.`,
      });
    }
  }

  /**
   * A COMPANION'S DEED IS ITS KEEPER'S — the teeth train the beast
   * and the bond, never the keeper's weapon schools. The beastcraft
   * trickle is capped per mark by that mark's own xpReward, so a
   * thick-skinned punching bag never becomes a training dummy.
   */
  private grantPetBattleXp(
    ownerEid: EntityId,
    owner: PlayerComp,
    petEid: EntityId,
    targetEid: EntityId,
    targetNpc: NpcComp,
    dmg: number,
  ): void {
    const pet = this.pets.get(petEid);
    if (!pet) return;
    const row = owner.pets.find((p) => p.slot === pet.slot);
    if (!row) return;
    this.grantPetXp(owner, pet, row, dmg * PET_XP_PER_DMG);
    if (pet.trickleTarget !== targetEid) {
      pet.trickleTarget = targetEid;
      pet.trickleBank = 0;
    }
    const room = Math.max(0, targetNpc.def.xpReward - pet.trickleBank);
    const trickle = Math.min(room, Math.floor(dmg / PET_TRICKLE_DIVISOR));
    if (trickle > 0) {
      pet.trickleBank += trickle;
      this.grantXp(ownerEid, owner, 'beastcraft', trickle);
    }
  }

  /**
   * The calm counter (called each tick from the input pass, where the
   * tick's stride is known): a trailing companion re-emerges once its
   * keeper holds under a calm stride for a full second — an arrival
   * you are still enough to watch, never a teleport.
   */
  private tickPetTrailing(eid: EntityId, player: PlayerComp, strideStep: number): void {
    if (player.petEid !== null || !player.pets.some((p) => p.state === 'heel')) {
      player.petCalmTicks = 0;
      return;
    }
    if (strideStep * (1000 / TICK_MS) < PET_CALM_SPEED) {
      if (++player.petCalmTicks >= PET_CALM_TICKS) {
        this.trySpawnPet(eid, player);
        player.petCalmTicks = 0;
      }
    } else {
      player.petCalmTicks = 0;
    }
  }

  /**
   * The household mirror (the S2CRide discipline): signature-gated,
   * resent whole on any change, reset to '' on reconnect rebind.
   * `ceremony` bypasses the gate and names a just-tamed slot so the
   * client raises the naming card exactly once.
   */
  private sendPet(player: PlayerComp, ceremony?: number): void {
    if (!player.session) return;
    const bc = levelForXp(player.skills.beastcraft ?? 0);
    const petHp = player.petEid !== null ? this.healths.get(player.petEid) : null;
    const downed = petHp !== null && petHp !== undefined && petHp.hp <= 0;
    const sig =
      player.pets
        .map(
          (p) =>
            `${p.slot}:${p.species}:${p.name}:${p.xp}:${p.state}:${p.restedAt ?? ''}:` +
            `${p.state === 'heel' ? (player.petEid === null ? 'T' : downed ? 'D' : (petHp?.hp ?? 0)) : ''}`,
        )
        .join('|') + `@${bc}`;
    if (ceremony === undefined && sig === player.petSigSent) return;
    player.petSigSent = sig;
    const now = Date.now();
    const pets: PetInfo[] = player.pets.map((p) => {
      const def = NPCS.get(p.species);
      const base = def?.level ?? 1;
      const level = petLevelFor(p.xp, base, bc);
      // THE ONE STAT SITE feeds the mirror too — the card must show
      // the same ceiling the fight uses.
      const maxHp = petStatBlock(p.species, level, bc)?.maxHp ?? def?.maxHp ?? 1;
      const hp =
        p.state === 'heel'
          ? petHp
            ? petHp.hp
            : Math.min(player.petHp ?? maxHp, maxHp)
          : maxHp;
      const state: PetInfo['state'] =
        p.state === 'heel'
          ? player.petEid === null
            ? 'trailing'
            : downed
              ? 'downed'
              : 'heel'
          : p.state;
      const info: PetInfo = {
        slot: p.slot,
        species: p.species,
        name: p.name,
        level,
        xp: p.xp,
        hp,
        maxHp,
        state,
      };
      if (p.state === 'resting' && p.restedAt !== null) {
        info.restSec = Math.max(0, Math.ceil((p.restedAt + PET_REST_HOME_MS - now) / 1000));
      }
      // THE QUIET HEEL: the walking friend carries its bond clock so
      // the client can surface the Offer prompt only when the moment
      // is real. In-memory like petBondAt itself (relogin forgives).
      if (p.state === 'heel') {
        info.bondSec = Math.max(0, Math.ceil(((player.petBondAt.get(p.slot) ?? 0) - now) / 1000));
      }
      return info;
    });
    player.session.sendJson(
      ceremony === undefined ? { t: 'pet', pets } : { t: 'pet', pets, ceremony },
    );
  }

  /** Name (or rename) a stall's companion — the shared sanitizer judges. */
  petRename(eid: EntityId, slot: number, raw: string): void {
    const player = this.players.get(eid);
    if (!player) return;
    const row = player.pets.find((p) => p.slot === slot);
    if (!row) return;
    const name = sanitizePetName(raw);
    if (!name) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'That name will not stick. Two to sixteen letters.',
      });
      return;
    }
    row.name = name;
    if (player.characterId > 0) this.accounts.savePetName(player.characterId, slot, name);
    // The collar tag is watcher truth — the live body re-announces.
    if (player.petEid !== null && this.pets.get(player.petEid)?.slot === slot) {
      this.broadcastMetaUpdate(player.petEid);
    }
    this.sendPet(player);
    player.session?.sendJson({ t: 'chat', channel: 'system', text: `${name} knows its name.` });
  }

  /**
   * THE THREE STALLS, ONE HEEL (beastcraft v2 Phase 4): the stable
   * door. Rotation is a household decision made AT the stalls — the
   * tile is re-checked here exactly as the vault re-checks its chest,
   * so a walked-away panel's stale click refuses aloud instead of
   * acting at a distance. Every refusal speaks.
   */
  stableOp(eid: EntityId, op: 'heel' | 'stable' | 'release', slot: number): void {
    const player = this.players.get(eid);
    if (!player) return;
    const sys = (text: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text });
    if (!this.nearTile(eid, Tile.BeastPen)) {
      sys('The stalls are elsewhere. Stand at a beast pen.');
      return;
    }
    const row = player.pets.find((p) => p.slot === slot);
    if (!row) return;
    const heel = player.pets.find((p) => p.state === 'heel');
    const heelDowned =
      player.petEid !== null && (this.healths.get(player.petEid)?.hp ?? 1) <= 0;

    if (op === 'heel') {
      if (row.state === 'heel') {
        sys(`${row.name} is already at your side.`);
        return;
      }
      if (row.state === 'resting') {
        sys(`${row.name} is still resting. Its legs come back soon.`);
        return;
      }
      if (heelDowned) {
        sys('Tend your fallen friend before you call another.');
        return;
      }
      if (heel) {
        heel.state = 'stabled';
        if (player.characterId > 0) this.accounts.savePetState(player.characterId, heel.slot, 'stabled');
        this.despawnPetEntity(player);
        player.petHp = null;
      }
      row.state = 'heel';
      if (player.characterId > 0) this.accounts.savePetState(player.characterId, row.slot, 'heel');
      player.petHp = null;
      this.trySpawnPet(eid, player);
      this.sendPet(player);
      sys(`${row.name} comes to your side.`);
      return;
    }

    if (op === 'stable') {
      if (row.state !== 'heel') {
        sys(`${row.name} is already in its stall.`);
        return;
      }
      if (heelDowned) {
        sys('Tend your fallen friend first. A stall is no place to bleed.');
        return;
      }
      this.despawnPetEntity(player);
      player.petHp = null;
      row.state = 'stabled';
      if (player.characterId > 0) this.accounts.savePetState(player.characterId, row.slot, 'stabled');
      this.sendPet(player);
      sys(`${row.name} settles into the stall.`);
      return;
    }

    // The release: a ceremony with a confirm on the client side, and
    // an honest goodbye on this one. The row is gone; nothing else is.
    if (row.state === 'heel') {
      if (heelDowned) {
        sys('Tend your fallen friend first. Nothing leaves like this.');
        return;
      }
      this.despawnPetEntity(player);
      player.petHp = null;
    }
    player.pets = player.pets.filter((p) => p.slot !== slot);
    player.petBondAt.delete(slot);
    if (player.characterId > 0) this.accounts.deletePet(player.characterId, slot);
    this.sendPet(player);
    sys(`You slip the collar. ${row.name} looks back once, and the wild takes it home.`);
  }

  // ------------------------------------------------------- dialogue

  /**
   * THE WORLD ANSWERS (living-frontier Phase 3.1): the flag predicate
   * every dialogue gate consults. Plain flags read the character's
   * durable ledger; flags in the reserved `world:` namespace are
   * answered LIVE from the frontier around the SPEAKER — the guard
   * knows what stands within a watch of her post, never what stands
   * anywhere. Nothing synthetic is ever stored.
   */
  private dialogueHas(player: PlayerComp, targetEid: EntityId): (flag: string) => boolean {
    return (flag) => {
      // The quest ledger answers its namespace live — never stored,
      // so an offer appears the tick it opens and a spent turn-in
      // choice retires itself mid-conversation.
      if (isQuestFlag(flag)) {
        const parsed = parseQuestFlag(flag);
        if (!parsed) return false;
        return answerQuestFlag(
          this.questDefs.get(parsed.quest),
          player.quests.get(parsed.quest),
          parsed.state,
          parsed.stage,
          this.questCtx(player),
        );
      }
      // The standing bands answer their namespace live — speakerless,
      // because the name is the player's, not the speaker's.
      if (isFactionFlag(flag)) return this.answerFactionGate(player, flag);
      if (!isWorldFlag(flag)) return player.flags.has(flag);
      const npos = this.positions.get(targetEid);
      return npos ? this.worldFlagAnswer(flag, player, npos.x, npos.y) : false;
    };
  }

  private worldFlagAnswer(flag: string, player: PlayerComp, sx: number, sy: number): boolean {
    if (flag === 'world:bounty_open') {
      // Reads through openBounties so a mark whose camp dissolved
      // without the player lifts itself the next time anyone asks.
      return this.openBounties(player).length > 0;
    }
    if (flag === 'world:peddler_near') {
      // Fortune within the marches: a parked cart still counts while
      // its ember runs — she is there until she is not.
      const reach = FRONTIER.marchTiles;
      for (const r of this.poiLedger.values()) {
        if (r.site?.defId !== 'peddler_rest') continue;
        const dx = r.site.anchorX - sx;
        const dy = r.site.anchorY - sy;
        if (dx * dx + dy * dy <= reach * reach) return true;
      }
      return false;
    }
    const watch = this.watchSurvey(sx, sy);
    switch (flag) {
      case 'world:threat_near':
        return watch.near;
      case 'world:threat_bold':
        return watch.bold;
      case 'world:toll_near':
        return watch.toll;
      case 'world:calm':
        return !watch.near;
      case 'world:relief':
        // Calm AND a relax window still running within the marches —
        // word of a broken camp travels farther than sight.
        return !watch.near && this.calmWithinTiles(sx, sy, FRONTIER.marchTiles);
      default:
        return false;
    }
  }

  /**
   * Does this archetype MENACE anyone? Friendly sites — waystations,
   * shrines, groves, the peddler's cart — carry no fighting garrison
   * and are never news, never threats, never bounty marks. (Phase 5
   * fix: before the peddler existed this survey called every standing
   * site a threat, which would have read a rolled waystation as
   * trouble at its own keeper's post.)
   */
  private poiThreatens(defId: string): boolean {
    const def = POI_DEFS.get(defId);
    return (def?.garrison?.length ?? 0) > 0;
  }

  /**
   * What stands within the speaker's watch. Only PROCEDURAL sites
   * count — authored landmarks are the land's permanent character, not
   * news, and counting them would leave some posts uneasy forever.
   * Standing = staffed: cleared trophies and scattered embers are over.
   */
  private watchSurvey(sx: number, sy: number): { near: boolean; bold: boolean; toll: boolean } {
    const authored = this.authoredCells();
    const watch = FRONTIER.watchTiles;
    const out = { near: false, bold: false, toll: false };
    for (const [key, row] of this.poiLedger) {
      if (row.site === null || row.clearedAt !== null || row.emberUntil !== null) continue;
      if (authored.has(key)) continue;
      if (!this.poiThreatens(row.site.defId)) continue;
      const dx = row.site.anchorX - sx;
      const dy = row.site.anchorY - sy;
      if (dx * dx + dy * dy > watch * watch) continue;
      out.near = true;
      if (row.stage >= FRONTIER.satelliteStage) out.bold = true;
      if (row.site.defId === 'road_toll') out.toll = true;
    }
    return out;
  }

  /** Any relax window still running within `reach` tiles of a point? */
  private calmWithinTiles(sx: number, sy: number, reach: number): boolean {
    const now = Date.now();
    for (const [key, until] of this.frontierCalm) {
      if (until <= now) continue;
      const comma = key.indexOf(',');
      const cx = (Number(key.slice(0, comma)) + 0.5) * POI_CELL;
      const cy = (Number(key.slice(comma + 1)) + 0.5) * POI_CELL;
      const dx = cx - sx;
      const dy = cy - sy;
      if (dx * dx + dy * dy <= reach * reach) return true;
    }
    return false;
  }

  /**
   * Enter a node: fire its hooks, filter its choices against the
   * player's flags, and send the beat. Reaching an authored ending
   * (no continuation, no offerable choices) records completion —
   * walking away never does.
   */
  private dialogueEnterNode(eid: EntityId, player: PlayerComp, nodeId: string, first = false): void {
    const dlg = player.dialogue;
    if (!dlg || player.session === null) return;
    const node = this.dialogueNodes.get(dlg.def.id)?.get(nodeId);
    if (!node) {
      this.dialogueClose(player);
      return;
    }
    dlg.nodeId = nodeId;
    for (const hook of node.hooks ?? []) this.runDialogueHook(eid, player, hook);
    // Choice gates consult the same predicate as tree selection, so a
    // `world:` answer holds mid-conversation exactly as it did at the door.
    const has = this.dialogueHas(player, dlg.targetEid);
    const eligible = (node.choices ?? []).filter(
      (c) => !c.requires?.some((f) => !has(f)) && !c.forbids?.some((f) => has(f)),
    );
    dlg.choices = eligible;
    const last = node.next === undefined && eligible.length === 0;
    if (last) this.setPlayerFlag(player, dialogueDoneFlag(dlg.def.id));
    // Gifts ride the beat itself so the cinema can stage the moment —
    // the pack update travels separately (runDialogueHook already sent it).
    const gifts = (node.hooks ?? [])
      .filter((h): h is Extract<DialogueHook, { kind: 'give' }> => h.kind === 'give')
      .map((h) => ({ item: h.item, qty: h.qty }));
    // The quest offer rides the beat like a gift: the cinema stages
    // the ask (name, pay) beside the line, before the choice plates.
    const offerHook = (node.hooks ?? []).find(
      (h): h is Extract<DialogueHook, { kind: 'quest_offer' }> => h.kind === 'quest_offer',
    );
    const offerDef = offerHook ? this.questDefs.get(offerHook.quest) : undefined;
    // Quest-weighted plates wear the overhead mark's grammar: a choice
    // whose next beat swears a quest gets the gold !, one that hands a
    // quest in gets the gold ?. Resolved against the live ledger with
    // the same predicate the hooks themselves are guarded by, so a
    // badge is a promise the press will keep — never a costume.
    const questChoices: Array<{ idx: number; kind: 'accept' | 'turnin' }> = [];
    eligible.forEach((c, idx) => {
      if (c.next === undefined) return;
      const dest = this.dialogueNodes.get(dlg.def.id)?.get(c.next);
      for (const h of dest?.hooks ?? []) {
        if (h.kind === 'quest_accept' && has(`quest:${h.quest}:available`)) {
          questChoices.push({ idx, kind: 'accept' });
          return;
        }
        if (h.kind === 'quest_turnin' && has(`quest:${h.quest}:ready`)) {
          questChoices.push({ idx, kind: 'turnin' });
          return;
        }
      }
    });
    // A trade-weighted plate wears the counter's coin: a choice whose
    // press arms the shop hook — directly or through linear beats the
    // player only pages past — gets the coin chip. The walk stops at
    // the next question: another decision in between means the shelf
    // is that press's consequence, not this one's.
    const shopChoices: number[] = [];
    eligible.forEach((c, idx) => {
      const seen = new Set<string>();
      let cur = c.next;
      while (cur !== undefined && !seen.has(cur)) {
        seen.add(cur);
        const dest = this.dialogueNodes.get(dlg.def.id)?.get(cur);
        if (!dest) break;
        if (dest.hooks?.some((h) => h.kind === 'shop')) {
          shopChoices.push(idx);
          break;
        }
        if (dest.choices && dest.choices.length > 0) break;
        cur = dest.next;
      }
    });
    player.session.sendJson({
      t: 'dlgnode',
      speaker: node.speaker ?? 'npc',
      text: node.text,
      choices: eligible.length > 0 ? eligible.map((c) => c.text) : undefined,
      last: last || undefined,
      gifts: gifts.length > 0 ? gifts : undefined,
      quest: offerDef
        ? { id: offerDef.id, name: offerDef.name, rewards: this.questRewardsWire(offerDef) }
        : undefined,
      questChoices: questChoices.length > 0 ? questChoices : undefined,
      shopChoices: shopChoices.length > 0 ? shopChoices : undefined,
      // THE ONE RESOLVER's answer for this beat: the node's full line,
      // else the speaker's bank slot for the moment, else silence.
      voice: this.resolveBeatVoice(dlg.targetEid, node, first, last),
    });
  }

  /**
   * THE THROAT CLEARS (voiceover-plan Phase 4): the fallback chain
   * under the full line. Greet speaks on the first beat and farewell
   * on the terminal one unconditionally (the door and the goodbye ARE
   * the moments); acks between are rationed by the quipChance and
   * quipCooldownMs dials so they punctuate instead of chattering.
   * Player-spoken beats never draw from the NPC's throat.
   */
  private resolveBeatVoice(
    targetEid: EntityId,
    node: DialogueNode,
    first: boolean,
    last: boolean,
  ): VoiceWire | undefined {
    const line = voiceWireForNode(node, this.voiceClips);
    if (line) return line;
    if ((node.speaker ?? 'npc') === 'player') return undefined;
    const actor = this.actors.get(targetEid)?.actor;
    if (!actor) return undefined;
    return this.drawQuip(
      `actor:${actor.id}`,
      quipSlotForBeat(first, last, node.mood),
      quipIsRationed(first, last, node.mood),
    );
  }

  /** A transcript-matched bark clip through the same quip memory:
   * cooldown gates it (no machine-gun barks under spam clicks), the
   * chance die never does — the exact recording always outranks luck. */
  private drawMatchedQuip(ownerKey: string, clipId: string): VoiceWire | undefined {
    const mem = this.voiceQuipMemory.get(ownerKey) ?? { lastAt: 0, lastBySlot: new Map() };
    if (Date.now() - mem.lastAt < VOICE.quipCooldownMs) return undefined;
    const wire = quipWire(clipId, this.voiceClips);
    if (!wire) return undefined;
    mem.lastAt = Date.now();
    mem.lastBySlot.set('bark', clipId);
    this.voiceQuipMemory.set(ownerKey, mem);
    return wire;
  }

  /** Pick from an owner's bank slot through the shared quip memory. */
  private drawQuip(ownerKey: string, slot: VoiceSlot, rationed: boolean): VoiceWire | undefined {
    const bank = this.voiceBanks.get(ownerKey);
    if (!bank) return undefined;
    const mem = this.voiceQuipMemory.get(ownerKey) ?? { lastAt: 0, lastBySlot: new Map() };
    if (rationed) {
      const now = Date.now();
      if (now - mem.lastAt < VOICE.quipCooldownMs) return undefined;
      if (Math.random() >= VOICE.quipChance) return undefined;
    }
    const clipId = pickQuipClip(bank, slot, mem.lastBySlot.get(slot), Math.random());
    if (clipId === undefined) return undefined;
    const wire = quipWire(clipId, this.voiceClips);
    if (!wire) return undefined;
    mem.lastAt = Date.now();
    mem.lastBySlot.set(slot, clipId);
    this.voiceQuipMemory.set(ownerKey, mem);
    return wire;
  }

  /** Advance a linear beat (questions are answered, never skipped). */
  dialogueAdvance(eid: EntityId): void {
    const player = this.players.get(eid);
    const dlg = player?.dialogue;
    if (!player || !dlg || !this.dialogueGuard(eid, player, dlg)) return;
    if (dlg.choices.length > 0) return;
    const node = this.dialogueNodes.get(dlg.def.id)?.get(dlg.nodeId);
    if (node?.next !== undefined) {
      this.dialogueEnterNode(eid, player, node.next);
    } else {
      // A good ending first offers the mark's business (the chain),
      // then completion stands as recorded on entry; an armed shop
      // opens as the frame drops — "have a look, then" becomes the shelf.
      if (this.dialogueChainOffer(eid, player)) return;
      const shop = dlg.shop;
      this.dialogueClose(player);
      if (shop !== undefined) {
        player.session?.sendJson({ t: 'shopopen', shop, priceMult: this.shopPriceMultFor(player, shop) });
      }
    }
  }

  /** Answer the current question by sent-choice index. */
  dialogueChoose(eid: EntityId, idx: number): void {
    const player = this.players.get(eid);
    const dlg = player?.dialogue;
    if (!player || !dlg || !this.dialogueGuard(eid, player, dlg)) return;
    const choice = dlg.choices[idx];
    if (!choice) return;
    for (const f of choice.set ?? []) this.setPlayerFlag(player, f);
    if (choice.next !== undefined) {
      this.dialogueEnterNode(eid, player, choice.next);
    } else {
      // An authored farewell is a real ending, not an interruption —
      // and a real ending keeps the mark's promise before the frame drops.
      this.setPlayerFlag(player, dialogueDoneFlag(dlg.def.id));
      if (this.dialogueChainOffer(eid, player)) return;
      const shop = dlg.shop;
      this.dialogueClose(player);
      if (shop !== undefined) {
        player.session?.sendJson({ t: 'shopopen', shop, priceMult: this.shopPriceMultFor(player, shop) });
      }
    }
  }

  /**
   * THE MARK KEEPS ITS PROMISE: a conversation that ends well on an
   * actor still wearing the "!" chains straight into the offer tree
   * instead of dropping the frame — an intro, a watch report, or a
   * fine can no longer eclipse the work the mark advertised (offer
   * trees ride priority 5 under intros at 10 and watch trees at 6-8,
   * so pickDialogue alone could starve them indefinitely). Only trees
   * that swear a currently-available quest by this actor chain; each
   * tree at most once per sitting (a declined offer never re-pitches
   * on its own heels — dlg.seen); Esc and interruptions never chain
   * (walking away stays a whole verb). Multi-quest givers chain
   * through each offer in priority order, one good ending at a time.
   */
  private dialogueChainOffer(eid: EntityId, player: PlayerComp): boolean {
    const dlg = player.dialogue;
    if (!dlg) return false;
    const actorComp = this.actors.get(dlg.targetEid);
    if (!actorComp) return false;
    const trees = this.dialoguesByActor.get(actorComp.actor.id);
    if (!trees || trees.length === 0) return false;
    const ctx = this.questCtx(player);
    const wanted = new Set<string>();
    for (const qid of this.questsByGiver.get(actorComp.actor.id) ?? []) {
      if (this.itemStartQuests.has(qid)) continue;
      const qdef = this.questDefs.get(qid);
      if (qdef && questAvailable(qdef, ctx)) wanted.add(qid);
    }
    if (wanted.size === 0) return false;
    const candidates = trees.filter(
      (o) =>
        !dlg.seen.has(o.def.id) &&
        o.def.nodes.some((n) => n.hooks?.some((h) => h.kind === 'quest_accept' && wanted.has(h.quest))),
    );
    const def = pickDialogue(candidates, this.dialogueHas(player, dlg.targetEid));
    if (!def) return false;
    dlg.seen.add(def.id);
    dlg.def = def;
    dlg.nodeId = def.start;
    dlg.choices = [];
    this.dialogueEnterNode(eid, player, def.start);
    return true;
  }

  /** The player excuses themselves (Esc) — no completion recorded. */
  dialogueEnd(eid: EntityId): void {
    const player = this.players.get(eid);
    if (player?.dialogue) this.dialogueClose(player);
  }

  /** A conversation needs a living partner within earshot. */
  private dialogueGuard(eid: EntityId, player: PlayerComp, dlg: ActiveDialogue): boolean {
    const pos = this.positions.get(eid);
    const npos = this.positions.get(dlg.targetEid);
    if (!pos || !npos || !this.actors.has(dlg.targetEid)) {
      this.dialogueClose(player);
      return false;
    }
    const dx = npos.x - pos.x;
    const dy = npos.y - pos.y;
    if (dx * dx + dy * dy > 4 * 4) {
      this.dialogueClose(player);
      return false;
    }
    return true;
  }

  private dialogueClose(player: PlayerComp): void {
    if (!player.dialogue) return;
    player.dialogue = null;
    player.session?.sendJson({ t: 'dlgclose' });
  }

  /**
   * Node effects — the open socket future systems plug into (quest
   * grants, faction shifts). Always server-side, always idempotent
   * per node entry.
   */
  private runDialogueHook(eid: EntityId, player: PlayerComp, hook: DialogueHook): void {
    switch (hook.kind) {
      case 'flag':
        this.setPlayerFlag(player, hook.flag);
        break;
      case 'shop':
        // Armed now, fired at a good ending (see dialogueAdvance).
        if (player.dialogue) player.dialogue.shop = hook.shop;
        break;
      case 'bounty':
        this.postBounty(eid, player);
        break;
      case 'standing':
        // Authored story delta — never auto-pays the opposition
        // matrix (an author states both sides explicitly).
        this.creditStanding(player, hook.faction, hook.delta);
        break;
      case 'fine':
        this.runFine(player, hook.faction, hook.quote === true);
        break;
      case 'quest_offer':
        // Pure presentation: dialogueEnterNode stages the chip on the
        // beat itself (the gifts pattern). Nothing happens here.
        break;
      case 'quest_accept':
        this.questAccept(eid, player, hook.quest);
        break;
      case 'quest_turnin':
        this.questTurnIn(eid, player, hook.quest);
        break;
      case 'give': {
        const added = addItem(player.inventory, hook.item, hook.qty);
        if (added > 0) {
          player.session?.sendJson({ t: 'inv', slots: player.inventory });
          const name = itemDef(hook.item)?.name ?? hook.item;
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `You receive ${added > 1 ? `${added} × ` : ''}${name}.`,
          });
        }
        if (added < hook.qty) {
          // A full pack never eats a gift — the rest lands at your feet.
          const pos = this.positions.get(eid);
          if (pos) this.spawnDrop(hook.item, hook.qty - added, pos.x, pos.y, eid);
        }
        break;
      }
    }
  }

  /**
   * THE ASK MADE CONCRETE (Phase 3.2): the speaker points the player
   * at the worst standing trouble within their watch — boldest rung
   * first, then nearest. The waypoint lands on the chart live, the
   * bounty mark stamps, and the quartermaster confirms with a bearing.
   * Nothing pays until the camp breaks.
   */
  private postBounty(eid: EntityId, player: PlayerComp): void {
    const dlg = player.dialogue;
    const pos = this.positions.get(eid);
    if (!dlg || !pos) return;
    const spos = this.positions.get(dlg.targetEid);
    if (!spos) return;
    const authored = this.authoredCells();
    const watch = FRONTIER.watchTiles;
    let best: { key: string; site: PoiSite; stage: number; d2: number } | null = null;
    for (const [key, row] of this.poiLedger) {
      if (row.site === null || row.clearedAt !== null || row.emberUntil !== null) continue;
      if (authored.has(key)) continue;
      if (!this.poiThreatens(row.site.defId)) continue; // never a bounty on a friend
      const dx = row.site.anchorX - spos.x;
      const dy = row.site.anchorY - spos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > watch * watch) continue;
      if (!best || row.stage > best.stage || (row.stage === best.stage && d2 < best.d2)) {
        best = { key, site: row.site, stage: row.stage, d2 };
      }
    }
    const sys = (text: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text });
    if (!best) {
      // The gate said threat, but it broke mid-conversation — honest.
      sys('Nothing stands within the watch now — the word was stale.');
      return;
    }
    const wx = Math.round(best.site.anchorX);
    const wy = Math.round(best.site.anchorY);
    this.setWaypoint(eid, wx, wy);
    player.session?.sendJson({ t: 'waypoint', x: wx, y: wy });
    this.setPlayerFlag(player, bountyFlag(best.key));
    const def = POI_DEFS.get(best.site.defId);
    sys(
      `Your chart takes the mark: ${def?.name ?? 'the camp'}, ` +
        `${compass8(wx - pos.x, wy - pos.y)}, ${Math.round(Math.hypot(wx - pos.x, wy - pos.y))} paces out.`,
    );
  }

  /**
   * The player's live bounty cells — lazily lifting marks whose camp
   * no longer stands (dissolved, scattered, or wiped without them): a
   * dead mark neither gates dialogue nor haunts the ledger.
   */
  private openBounties(player: PlayerComp): string[] {
    const out: string[] = [];
    for (const flag of [...player.flags.keys()]) {
      if (!flag.startsWith(BOUNTY_FLAG_PREFIX)) continue;
      const key = flag.slice(BOUNTY_FLAG_PREFIX.length);
      const row = this.poiLedger.get(key);
      const standing =
        row !== undefined && row.site !== null && row.clearedAt === null && row.emberUntil === null;
      if (standing) out.push(key);
      else this.clearPlayerFlag(player, flag);
    }
    return out;
  }

  // ------------------------------------------------------------ quests

  /** The pure module's window onto one player — built fresh per ask. */
  private questCtx(player: PlayerComp): QuestPlayerCtx {
    return {
      quests: player.quests,
      // faction: band gates are speakerless and legal in quest
      // requires.flags — answered live, exactly like dialogueHas.
      hasFlag: (f) => (isFactionFlag(f) ? this.answerFactionGate(player, f) : player.flags.has(f)),
      skillLevel: (s) => levelForXp(player.skills[s] ?? 0),
      hasDiscovered: (p) => {
        const d = player.discoveries.get(p);
        return d !== undefined && d.faded !== true;
      },
      countItem: (item) => countItem(player.inventory, item),
      now: Date.now(),
    };
  }

  /** Display names for the wire — the DB registries are the truth. */
  private questNames(): QuestNameRefs {
    return {
      itemName: (id) => itemDef(id)?.name ?? id,
      npcName: (id) => NPCS.get(id)?.name ?? id,
      actorName: (id) => this.actorDefs.get(id)?.name ?? id,
      placeName: (id) => {
        if (!id.startsWith('zone:')) return id;
        const zoneId = id.slice(5);
        for (const z of this.world.zoneDefs) if (z.id === zoneId) return z.name;
        return zoneId;
      },
    };
  }

  /**
   * THE WORLD ANSWERS "WHERE" — generalized whereabouts for the
   * journal's chart rings, derived from registries the world already
   * keeps (actor placements, spawn grounds, zone extents). The center
   * rounds to a coarse grid and the radius stays generous: a ring is
   * a neighborhood, never a pin. Kill and drop grounds resolve
   * nearest the GIVER's own door — the trouble a speaker means is the
   * trouble on their watch — so the answer holds still across pushes.
   * Surface band only; the chart's rings cannot reach the dark.
   */
  private questLocateRefs(): QuestLocateRefs {
    const fuzz = (x: number, y: number, r: number): QuestHintWire => ({
      x: Math.round(x / 8) * 8,
      y: Math.round(y / 8) * 8,
      r: Math.round(r),
    });
    const surface = (y: number): boolean => y < DUNGEON_MIN_Y;
    const actorSpot = (id: string): { x: number; y: number } | undefined => {
      const p = this.actorSpawnPoints.find((s) => s.actor === id);
      return p && surface(p.y) ? p : undefined;
    };
    const actorHint = (id: string): QuestHintWire | undefined => {
      const p = actorSpot(id);
      return p ? fuzz(p.x, p.y, 10) : undefined;
    };
    const npcHint = (id: string, near?: { x: number; y: number }): QuestHintWire | undefined => {
      let best: { x: number; y: number; radius: number } | undefined;
      let bestD = Infinity;
      for (const s of this.spawnPoints) {
        if (s.npc !== id || !surface(s.y)) continue;
        const d = near ? (s.x - near.x) ** 2 + (s.y - near.y) ** 2 : 0;
        if (!best || d < bestD) {
          best = s;
          bestD = d;
        }
        if (!near) break;
      }
      return best ? fuzz(best.x, best.y, Math.max(18, best.radius + 10)) : undefined;
    };
    const placeHint = (place: string): QuestHintWire | undefined => {
      if (!place.startsWith('zone:')) return undefined;
      const zid = place.slice(5);
      for (const z of this.world.zoneDefs) {
        if (z.id !== zid) continue;
        const cy = z.origin.y + z.height / 2;
        if (!surface(cy)) return undefined;
        return fuzz(z.origin.x + z.width / 2, cy, Math.max(14, Math.max(z.width, z.height) / 2));
      }
      return undefined;
    };
    return {
      actorHint,
      objectiveHint: (def, obj) => {
        const near = actorSpot(def.giver);
        switch (obj.kind) {
          case 'talk':
            return actorHint(obj.actor);
          case 'kill':
            return npcHint(obj.npc, near);
          case 'collect': {
            const src = def.questDrops?.find((d) => d.item === obj.item);
            return src ? npcHint(src.npc, near) : undefined;
          }
          case 'discover':
            return placeHint(obj.place);
        }
      },
    };
  }

  private questRewardsWire(def: QuestDef): QuestRewardsWire | undefined {
    const r = def.rewards;
    const out: QuestRewardsWire = {};
    if (r.xp?.length) out.xp = r.xp.map((e) => ({ skill: e.skill, amount: e.amount }));
    if (r.items?.length) out.items = r.items.map((e) => ({ item: e.item, qty: e.qty }));
    if (r.coins) out.coins = r.coins;
    return out.xp || out.items || out.coins ? out : undefined;
  }

  private questDoneWire(def: QuestDef, q: QuestProgress): QuestDoneWire {
    return {
      id: def.id,
      name: def.name,
      completions: q.completions,
      repeatable: def.repeat ? true : undefined,
      cooldownUntil: q.cooldownUntil,
    };
  }

  /** Everything offerable to this player right now, id-sorted. */
  private questAvailList(player: PlayerComp): QuestAvailWire[] {
    const ctx = this.questCtx(player);
    const out: QuestAvailWire[] = [];
    for (const def of this.questDefs.values()) {
      if (this.itemStartQuests.has(def.id)) continue;
      if (questAvailable(def, ctx)) out.push({ id: def.id, name: def.name, giver: def.giver });
    }
    out.sort((a, b) => (a.id < b.id ? -1 : 1));
    return out;
  }

  /**
   * Re-answer "what could they take on?" and push ONLY on change —
   * the diff signature keeps flag-heavy play off the wire. Chokes:
   * bind, every quest mutation, every flag write, level-ups, and the
   * slow ticker (cooldown clocks expire without any event).
   */
  private pushQuestAvail(player: PlayerComp): void {
    const list = this.questAvailList(player);
    const sig = list.map((a) => a.id).join(',');
    if (sig === player.questAvailSig) return;
    player.questAvailSig = sig;
    player.session?.sendJson({ t: 'questupd', available: list });
  }

  /** The full ledger, pushed once at bind. */
  private sendQuestsFull(player: PlayerComp): void {
    if (!player.session) return;
    const ctx = this.questCtx(player);
    const names = this.questNames();
    const locate = this.questLocateRefs();
    const active: QuestWire[] = [];
    const done: QuestDoneWire[] = [];
    for (const [id, q] of player.quests) {
      const def = this.questDefs.get(id);
      if (!def) continue; // a retired def's row sleeps until it returns
      if (q.status === 'active')
        active.push(questWire(def, q, ctx, names, locate, this.questRewardsWire(def)));
      else done.push(this.questDoneWire(def, q));
    }
    const available = this.questAvailList(player);
    player.questAvailSig = available.map((a) => a.id).join(',');
    player.questCollectSig = this.questCollectSig(player, ctx);
    player.session.sendJson({ t: 'quests', active, done, available });
  }

  /** Persist one ledger row the moment it changes (guests: memory). */
  private persistQuest(player: PlayerComp, questId: string): void {
    if (player.characterId <= 0) return;
    const q = player.quests.get(questId);
    if (!q) {
      this.accounts.deleteQuestRow(player.characterId, questId);
      return;
    }
    this.accounts.saveQuestRow(player.characterId, {
      questId,
      status: q.status,
      stage: q.stage,
      progress: JSON.stringify(q.progress),
      acceptedAt: q.acceptedAt,
      completions: q.completions,
      cooldownUntil: q.cooldownUntil ?? null,
    });
  }

  /** Quiet wire: one active quest's current shape. */
  private pushQuestWire(player: PlayerComp, def: QuestDef, q: QuestProgress): void {
    player.session?.sendJson({
      t: 'questupd',
      quest: questWire(
        def,
        q,
        this.questCtx(player),
        this.questNames(),
        this.questLocateRefs(),
        this.questRewardsWire(def),
      ),
    });
  }

  /**
   * Accept a quest — the guarded transaction behind the quest_accept
   * hook, item-starts, and the dev lever. A stale plate no-ops.
   */
  private questAccept(eid: EntityId, player: PlayerComp, questId: string): boolean {
    const def = this.questDefs.get(questId);
    if (!def) return false;
    const ctx = this.questCtx(player);
    if (!questAvailable(def, ctx)) return false;
    const q = acceptQuest(def, player.quests.get(questId), ctx);
    player.quests.set(questId, q);
    // A charted place can satisfy stage one on the spot — walk forward.
    advanceStages(def, q, ctx);
    this.persistQuest(player, questId);
    const mark = def.stages[q.stage]?.mark;
    if (mark) {
      this.setWaypoint(eid, mark.x, mark.y);
      player.session?.sendJson({ t: 'waypoint', x: mark.x, y: mark.y });
    }
    this.pushQuestWire(player, def, q);
    this.pushQuestAvail(player);
    player.session?.sendJson({
      t: 'questevent',
      kind: 'accepted',
      id: def.id,
      name: def.name,
      rewards: this.questRewardsWire(def),
    });
    return true;
  }

  /**
   * Close a quest — verify every ask LIVE, take the collected items,
   * pay the rewards (overflow lands at the feet, the give-hook law),
   * and mark the ledger. Repeatables start their cooldown here.
   */
  private questTurnIn(eid: EntityId, player: PlayerComp, questId: string): boolean {
    const def = this.questDefs.get(questId);
    const q = player.quests.get(questId);
    if (!def || !q) return false;
    const ctx = this.questCtx(player);
    if (!questReady(def, q, ctx)) return false;

    // The turn-in consumes: collect asks are taken now, by id — the
    // validator kept rolled gear out, so id-addressing is lawful.
    const finalStage = def.stages[def.stages.length - 1]!;
    for (const obj of finalStage.objectives) {
      if (obj.kind === 'collect') removeItem(player.inventory, obj.item, obj.count);
    }

    const pos = this.positions.get(eid);
    const grant = (item: string, qty: number, rarity?: string): void => {
      const idef = itemDef(item);
      // Gear, relics, and sigils are INSTANCES: each piece mints its
      // own roll at the authored tier (the /give precedent) — a bare
      // addItem would land a roll-less husk. Overflow keeps its roll
      // on the ground via placeDrop, never the roll-blind spawnDrop.
      if (idef && (idef.gear || idef.relic || idef.sigil)) {
        const rar = isRarityTier(rarity ?? '') ? (rarity as ItemRoll['rar']) : 'common';
        for (let i = 0; i < qty; i++) {
          const roll = makeRoll(rar);
          if (addItem(player.inventory, item, 1, roll) < 1 && pos) {
            this.placeDrop(item, 1, pos.x, pos.y, {
              ownerEid: null,
              ownerUntil: 0,
              despawnAt: Date.now() + 12 * 60_000,
              pickupAfter: Date.now() + 400,
              roll,
            });
          }
        }
        return;
      }
      const added = addItem(player.inventory, item, qty);
      if (added < qty && pos) this.spawnDrop(item, qty - added, pos.x, pos.y, eid);
    };
    for (const e of def.rewards.xp ?? []) this.grantXp(eid, player, e.skill, e.amount);
    for (const e of def.rewards.items ?? []) grant(e.item, e.qty, e.rarity);
    if (def.rewards.coins) grant('coins', def.rewards.coins);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });

    q.status = 'done';
    q.completions += 1;
    q.cooldownUntil = def.repeat
      ? Date.now() + def.repeat.cooldownHours * 3_600_000
      : undefined;
    this.persistQuest(player, questId);
    // The durable stamp: deed rails and plain dialogue gates read this.
    this.setPlayerFlag(player, questDoneFlag(def.id), q.completions);
    for (const f of def.rewards.flags ?? []) this.setPlayerFlag(player, f);
    // Standing rides the one door; authored deltas never auto-cross.
    for (const s of def.rewards.standing ?? []) this.creditStanding(player, s.faction, s.delta);

    player.session?.sendJson({
      t: 'questupd',
      remove: def.id,
      done: this.questDoneWire(def, q),
    });
    this.pushQuestAvail(player);
    player.session?.sendJson({
      t: 'questevent',
      kind: 'completed',
      id: def.id,
      name: def.name,
      rewards: this.questRewardsWire(def),
    });
    return true;
  }

  /** Walk away. First-timers erase; repeat veterans fall back to done. */
  abandonQuest(eid: EntityId, questId: string): void {
    const player = this.players.get(eid);
    const q = player?.quests.get(questId);
    if (!player || !q || q.status !== 'active') return;
    const def = this.questDefs.get(questId);
    if (q.completions > 0) {
      q.status = 'done';
      q.progress = [];
      this.persistQuest(player, questId);
      player.session?.sendJson({
        t: 'questupd',
        remove: questId,
        done: def ? this.questDoneWire(def, q) : undefined,
      });
    } else {
      player.quests.delete(questId);
      this.persistQuest(player, questId);
      player.session?.sendJson({ t: 'questupd', remove: questId });
    }
    this.pushQuestAvail(player);
    if (def) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `You set aside "${def.name}".`,
      });
    }
  }

  /**
   * Credit one event (a kill, a talk, a discovery) against every
   * active quest, walking stages forward and telling the journal.
   */
  private creditQuestEvent(player: PlayerComp, kind: QuestCreditKind, key: string): void {
    if (player.quests.size === 0) return;
    const ctx = this.questCtx(player);
    for (const [id, q] of player.quests) {
      if (q.status !== 'active') continue;
      const def = this.questDefs.get(id);
      if (!def) continue;
      const wasReady = questReady(def, q, ctx);
      if (!creditQuest(def, q, kind, key)) continue;
      const crossed = advanceStages(def, q, ctx);
      this.persistQuest(player, id);
      this.pushQuestWire(player, def, q);
      const sys = (text: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text });
      if (crossed > 0) {
        sys(`Your journal turns a page: "${def.name}".`);
        const mark = def.stages[q.stage]?.mark;
        if (mark) {
          const eid = player.session?.playerEid;
          if (eid !== null && eid !== undefined) {
            this.setWaypoint(eid, mark.x, mark.y);
            player.session?.sendJson({ t: 'waypoint', x: mark.x, y: mark.y });
          }
        }
      } else if (!wasReady && questReady(def, q, ctx)) {
        const turnIn = this.actorDefs.get(def.turnIn ?? def.giver)?.name ?? 'the giver';
        sys(`"${def.name}" is ready — return to ${turnIn}.`);
      }
    }
  }

  /**
   * THE FLOOD LAW'S SIDE DOOR: quest-gated drops roll here, at the
   * kill site, per participant, OUTSIDE the loot tables — and stop by
   * construction the moment the pack satisfies the ask. Each drop is
   * owned by its earner; quest items are worthless, so the economy
   * never feels this channel.
   */
  private rollQuestDrops(
    npc: NpcComp,
    x: number,
    y: number,
    participants: Iterable<[EntityId, PlayerComp]>,
  ): void {
    const entries = this.questDropsByNpc.get(npc.def.id);
    if (!entries) return;
    for (const [peid, player] of participants) {
      const ctx = this.questCtx(player);
      for (const entry of entries) {
        const def = this.questDefs.get(entry.quest);
        if (!def) continue;
        if (!questDropWanted(def, player.quests.get(entry.quest), entry.item, ctx)) continue;
        if (Math.random() >= entry.chance) continue;
        const scatter = () => (Math.random() - 0.5) * 0.8;
        this.placeDrop(entry.item, 1, x + scatter(), y + scatter(), {
          ownerEid: peid,
          ownerUntil: Date.now() + 60_000,
          despawnAt: Date.now() + 120_000,
          pickupAfter: Date.now() + 400,
        });
      }
    }
  }

  /**
   * The 500ms collect watcher: live counts changed → resend the
   * affected quest wires; the 5s beat re-diffs availability so
   * cooldown clocks expire without any event. Diff-guarded both ways.
   */
  private tickQuests(): void {
    if (this.tickCount % 10 !== 3) return;
    const slowBeat = this.tickCount % 100 === 3;
    for (const session of this.sessions) {
      const eid = session.playerEid;
      if (eid === null) continue;
      const player = this.players.get(eid);
      if (!player) continue;
      if (slowBeat) this.pushQuestAvail(player);
      if (player.quests.size === 0) continue;
      const ctx = this.questCtx(player);
      const sig = this.questCollectSig(player, ctx);
      if (sig === player.questCollectSig) continue;
      player.questCollectSig = sig;
      for (const [id, q] of player.quests) {
        if (q.status !== 'active') continue;
        const def = this.questDefs.get(id);
        if (!def) continue;
        if (def.stages[q.stage]?.objectives.some((o) => o.kind === 'collect')) {
          this.pushQuestWire(player, def, q);
        }
      }
    }
  }

  /** The live-collect signature: every watched item's current count. */
  private questCollectSig(player: PlayerComp, ctx: QuestPlayerCtx): string {
    let sig = '';
    for (const [id, q] of player.quests) {
      if (q.status !== 'active') continue;
      const stage = this.questDefs.get(id)?.stages[q.stage];
      if (!stage) continue;
      for (const obj of stage.objectives) {
        if (obj.kind === 'collect') sig += `${id}:${obj.item}:${ctx.countItem(obj.item)};`;
      }
    }
    return sig;
  }

  /** Set a durable story flag; persisted immediately (guests: memory). */
  private setPlayerFlag(player: PlayerComp, flag: string, value = 1): void {
    // The world answers; nobody writes it. (The validator already
    // refuses authored writes — this holds the line for every caller.)
    // The quest ledger and the standing bands answer their own
    // namespaces the same way.
    if (isWorldFlag(flag) || isQuestFlag(flag) || isFactionFlag(flag)) return;
    if (player.flags.get(flag) === value) return;
    player.flags.set(flag, value);
    if (player.characterId > 0) this.accounts.setFlag(player.characterId, flag, value);
    // THE UNWRITTEN PAGE: some story flags ARE the deed — completing
    // the king's audience, earning Mab's word. The grant rides the one
    // flag choke point, so any authored path to the flag counts.
    const art = GameServer.DEED_FLAG_ARTS[flag];
    if (art) this.grantArt(player, art);
    // A story beat can open a quest gate — re-answer availability.
    this.pushQuestAvail(player);
  }

  /** Lift a story flag (bounty marks are the one revolving door). */
  private clearPlayerFlag(player: PlayerComp, flag: string): void {
    if (!player.flags.delete(flag)) return;
    if (player.characterId > 0) this.accounts.clearFlag(player.characterId, flag);
  }

  // ----------------------------------------------------- standing

  /** Answer a `faction:` gate from the asking player's ledger. */
  private answerFactionGate(player: PlayerComp, flag: string): boolean {
    const parsed = parseFactionFlag(flag);
    if (!parsed) return false;
    return answerFactionFlag(player.standing.get(parsed.faction) ?? 0, parsed);
  }

  /**
   * THE ONE DOOR (docs/factions-plan.md): every standing move in the
   * game lands here — clamp, persist-on-mutation, the quiet ledger
   * line, and the band-crossing ceremony (the ONLY repevent trigger).
   * `cross: true` pays the opposition matrix under THE BORDER LAW;
   * authored deltas (quest rewards, story hooks) omit it and state
   * both sides themselves. Cross-pay never re-crosses.
   */
  private creditStanding(
    player: PlayerComp,
    factionId: string,
    delta: number,
    opts: { cross?: boolean } = {},
  ): void {
    const def = factionDef(factionId);
    const applied = Math.round(delta);
    if (!def || applied === 0) return;
    const before = player.standing.get(factionId) ?? 0;
    const after = Math.max(-STANDING_CLAMP, Math.min(STANDING_CLAMP, before + applied));
    if (after !== before) {
      player.standing.set(factionId, after);
      if (player.characterId > 0) this.accounts.saveStanding(player.characterId, factionId, after);
      const moved = after - before;
      // THE DEED IS PUBLIC: every delta prints its quiet ledger line.
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `${def.name} ${moved > 0 ? '+' : '−'}${Math.abs(moved)} — ${
          moved > 0 ? 'word of it travels well' : 'the deed is marked'
        }.`,
      });
      const bandAfter = standingBand(after);
      if (bandAfter !== standingBand(before)) {
        player.session?.sendJson({
          t: 'repevent',
          faction: factionId,
          name: def.name,
          band: bandAfter,
          rose: after > before,
        });
        // A band can open (or close) a quest gate or a tree.
        this.pushQuestAvail(player);
      }
      this.pushRep(player);
    }
    if (opts.cross) {
      for (const c of crossDeltas(factionId, applied, before)) {
        this.creditStanding(player, c.faction, c.delta);
      }
    }
  }

  /** A systemic deed by name — value read from the live doc, matrix paid. */
  private creditDeed(
    player: PlayerComp,
    factionId: string | null,
    deed: 'bountyHonored' | 'tollBroken' | 'assaultEnforcer' | 'slayMember' | 'theftWitnessed',
  ): void {
    if (factionId === null) return;
    this.creditStanding(player, factionId, FACTIONS.deeds[deed], { cross: true });
  }

  /**
   * Whose ground is this? The faction holding the nearest town anchor
   * within the marches — beyond every march, the road's wardens (the
   * doc's roadFaction). Read live: a Studio edit re-draws the map.
   */
  private factionForPlace(x: number, y: number): string | null {
    let best: string | null = null;
    let bestD = FRONTIER.marchTiles;
    for (const f of FACTIONS.roster) {
      for (const a of f.anchors) {
        const d = Math.hypot(a.x - x, a.y - y);
        if (d <= bestD) {
          bestD = d;
          best = f.id;
        }
      }
    }
    return best ?? (factionDef(FACTIONS.roadFaction) ? FACTIONS.roadFaction : null);
  }

  /** The owner's standings, every roster row (neutral rows included). */
  private repWire(player: PlayerComp): RepStandingWire[] {
    return FACTIONS.roster.map((f) => {
      const value = player.standing.get(f.id) ?? 0;
      return { faction: f.id, name: f.name, value, band: standingBand(value) };
    });
  }

  private repSigOf(standings: RepStandingWire[]): string {
    return standings.map((s) => `${s.faction}:${s.value}`).join(',');
  }

  /** Quiet standing patch, diff-guarded — the questupd twin. */
  private pushRep(player: PlayerComp): void {
    const standings = this.repWire(player);
    const sig = this.repSigOf(standings);
    if (sig === player.repSig) return;
    player.repSig = sig;
    player.session?.sendJson({ t: 'repupd', standings });
  }

  /**
   * The full reputation push at bind: standings plus the LIVE
   * membership tables, so per-viewer resolution follows Studio edits
   * (the shared-meta law: nothing personal on EntityMeta).
   */
  private sendRepFull(player: PlayerComp): void {
    if (!player.session) return;
    const standings = this.repWire(player);
    player.repSig = this.repSigOf(standings);
    const members: Record<string, string> = {};
    const prefixes: Record<string, string> = {};
    const enforcers: string[] = [];
    for (const f of FACTIONS.roster) {
      for (const m of f.members) members[m] = f.id;
      for (const p of f.npcPrefixes) prefixes[p] = f.id;
      enforcers.push(...f.enforcers);
    }
    player.session.sendJson({
      t: 'rep',
      standings,
      members,
      prefixes,
      enforcers,
      peaceBand: FACTIONS.peaceBand,
      prices: { ...FACTIONS.prices },
    });
  }

  /**
   * THE WATCH HAS EYES (Phase 2): which faction's ledger does this
   * body read? Actors by slug, bestiary by id prefix — resolved at
   * CALL TIME so a Studio edit re-draws loyalties on the next scan
   * (the dial law; nothing faction-shaped lives on NpcComp).
   */
  private npcFactionOf(eid: EntityId, npc: NpcComp): string | null {
    const actor = this.actors.get(eid);
    if (actor) return factionOfActor(actor.actor.id);
    return factionOfNpc(npc.def.id);
  }

  /** The faction this body POLICES (per the live roster), or null. */
  private npcEnforcerFid(eid: EntityId): string | null {
    const actor = this.actors.get(eid);
    if (!actor) return null;
    const fid = factionOfActor(actor.actor.id);
    if (fid === null) return null;
    return (factionDef(fid)?.enforcers.includes(actor.actor.id) ?? false) ? fid : null;
  }

  /** The player's band with a faction, from the live thresholds. */
  private playerBandWith(player: PlayerComp, fid: string): FactionBand {
    return standingBand(player.standing.get(fid) ?? 0);
  }

  /**
   * The faction whose TOWN ground this is (Phase 5) — null anywhere
   * that isn't a settled town's streets. Wilds chests and dungeon
   * doors stay the ordinary loot loop; theft is a town crime.
   */
  private townFactionAt(x: number, y: number): string | null {
    for (const z of this.world.zoneDefs) {
      if (x < z.origin.x || x >= z.origin.x + z.width) continue;
      if (y < z.origin.y || y >= z.origin.y + z.height) continue;
      if (z.id === 'dawnmead' || z.id === 'amberford' || z.id === 'silverfall' || z.id === 'saltmere') {
        return this.factionForPlace(x, y);
      }
      return null;
    }
    return null;
  }

  /**
   * THE ROAD BACK (Phase 3): the fine counter behind the `fine` hook.
   * Quote answers the arithmetic; payment takes the coins and lifts
   * standing to EXACTLY the doc's fineFloor through the one door —
   * you buy back the courtroom, never the hearts. Every dial read
   * live; every no-op answered politely in the clerk's voice.
   */
  private runFine(player: PlayerComp, factionId: string, quote: boolean): void {
    const def = factionDef(factionId);
    const session = player.session;
    if (!def || !session) return;
    const sys = (text: string) => session.sendJson({ t: 'chat', channel: 'system', text });
    const standing = player.standing.get(factionId) ?? 0;
    const deficit = FACTIONS.fineFloor - standing;
    if (deficit <= 0) {
      sys('Your name needs no buying back here.');
      return;
    }
    const owed = deficit * FACTIONS.finePerPoint;
    const coins = countItem(player.inventory, 'coins');
    if (quote) {
      sys(`The fine stands at ${owed} coins${coins < owed ? ` — you carry ${coins}` : ''}.`);
      return;
    }
    if (coins < owed) {
      sys(`The fine stands at ${owed} coins. You carry ${coins}. Come back heavier.`);
      return;
    }
    removeItem(player.inventory, 'coins', owed);
    session.sendJson({ t: 'inv', slots: player.inventory });
    sys(`${owed} coins, counted twice. The book moves your name to the watched column.`);
    // Through the one door: the quiet line, the ceremony, the gates
    // all re-answer — and the deficit lands exactly on the floor.
    this.creditStanding(player, factionId, deficit);
  }

  /**
   * A player broke an enforcer's peace: the assault deed, charged
   * exactly at the rest→war flip (the calling damage sites gate on
   * npcAtPeace), so a whole fight is ONE deed — and cycling the
   * guard's leash to farm outrage only digs the outlaw hole deeper.
   */
  private chargeAssault(attackerEid: EntityId, npcEid: EntityId): void {
    const player = this.players.get(attackerEid);
    if (!player) return;
    this.creditDeed(player, this.npcEnforcerFid(npcEid), 'assaultEnforcer');
  }

  /**
   * THE WITNESS LAW (Phase 5): the faction bodies that actually SAW
   * a spot — inside the doc's radius, with an honest sightline (walls
   * seal, cover counts — the perception epic's own ray). Civilians
   * witness too: a grocer watching you rob the smith is a witness;
   * only bodies with a combat brain can also turn suspicious.
   */
  private theftWitnesses(x: number, y: number, markEid: EntityId): Array<{ eid: EntityId; fid: string }> {
    const out: Array<{ eid: EntityId; fid: string }> = [];
    const r = FACTIONS.theft.witnessRadius;
    const seen = (opos: { x: number; y: number }): boolean => {
      const dx = opos.x - x;
      const dy = opos.y - y;
      if (dx * dx + dy * dy > r * r) return false;
      return sightVisibility(sightLine(this.world, opos.x, opos.y, x, y)) > 0;
    };
    for (const [oEid, actor] of this.actors) {
      if (oEid === markEid) continue;
      const fid = factionOfActor(actor.actor.id);
      if (fid === null) continue;
      const opos = this.positions.get(oEid);
      if (opos && seen(opos)) out.push({ eid: oEid, fid });
    }
    for (const [oEid, npc] of this.npcs) {
      if (oEid === markEid || this.actors.has(oEid)) continue;
      const fid = factionOfNpc(npc.def.id);
      if (fid === null) continue;
      const opos = this.positions.get(oEid);
      if (opos && seen(opos)) out.push({ eid: oEid, fid });
    }
    return out;
  }

  /**
   * A witnessed theft: the deed through the one door, then a bounded
   * alarm — heads turn toward the spot, nobody rallies to a pocket
   * the way they would to a scream over steel. Returns whether any
   * faction body saw it (unseen is unswayed).
   */
  private chargeTheft(
    thiefEid: EntityId,
    player: PlayerComp,
    x: number,
    y: number,
    witnesses: Array<{ eid: EntityId; fid: string }>,
    chargeFid?: string,
  ): boolean {
    if (witnesses.length === 0) return false;
    this.creditDeed(player, chargeFid ?? witnesses[0]!.fid, 'theftWitnessed');
    let turned = 0;
    for (const w of witnesses) {
      if (turned >= 3) break;
      const npc = this.npcs.get(w.eid);
      if (!npc || npc.state !== 'idle') continue;
      npc.state = 'suspicious';
      npc.alert = Math.max(npc.alert, ALERT_SUS);
      npc.alertEid = thiefEid;
      npc.alertX = x;
      npc.alertY = y;
      npc.alertSeenTick = this.tickCount;
      npc.huntUntilTick = this.tickCount + GameServer.SUS_DWELL_TICKS * 2;
      turned++;
    }
    return true;
  }

  /**
   * THE LIGHT FINGERS (Phase 5): the lift itself. The roll is public
   * arithmetic (theftChance — the sneak hand against the mark),
   * success skims one row of the mark's authored pockets (coins by
   * the doc's cap and coin is coin, never stolen; goods carry the
   * facet to the fence), and failure is a spun mark, a cry, and —
   * only if a faction body truly saw it — the theftWitnessed deed.
   * The mark stays wary either way: wariness, not pity, meters the
   * take.
   */
  private pickpocket(
    eid: EntityId,
    player: PlayerComp,
    pos: { x: number; y: number; dir: number },
    targetEid: EntityId,
    actorComp: ActorComp,
    npos: { x: number; y: number; dir: number },
    sys: (text: string) => void,
  ): void {
    const rows = actorComp.actor.inventory ?? [];
    if (rows.length === 0) {
      sys('Nothing worth lifting.');
      return;
    }
    const now = Date.now();
    if (now < (player.markWary.get(targetEid) ?? 0)) {
      sys('Too soon — the mark is wary.');
      return;
    }
    const row = rows[Math.floor(Math.random() * rows.length)]!;
    if (!hasSpaceFor(player.inventory, row.item)) {
      sys('Your pack has no room for other folk’s goods.');
      return;
    }
    const markLevel = this.npcs.get(targetEid)?.def.level ?? 10;
    const chance = theftChance(this.effectiveLevel(player, 'sneak'), markLevel);
    player.markWary.set(targetEid, now + FACTIONS.theft.retrySec * 1000);
    if (Math.random() < chance) {
      const coins = row.item === 'coins';
      const qty = coins ? Math.min(row.qty, FACTIONS.theft.coinCap) : 1;
      const def = itemDef(row.item);
      // Skimmed gear wears the shop-counter baseline — theft never
      // mints rarity (the flood law keeps its border here too).
      const roll = def && !def.stackable ? { rar: 'common' as const, seed: 0 } : undefined;
      const got = addItem(player.inventory, row.item, qty, roll, !coins);
      if (got === 0) return;
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      sys(
        coins
          ? `You slip away with ${got} coins.`
          : `You slip away with: ${def?.name ?? row.item}.`,
      );
      this.grantXp(eid, player, 'sneak', 8 + markLevel);
      return;
    }
    // Caught: the crouch is blown, the mark spins and cries.
    this.revealPlayer(eid, player);
    npos.dir = Math.atan2(pos.y - npos.y, pos.x - npos.x);
    const cries = ['Hey — my pocket!', 'Thief! A thief!', 'Hands! I felt hands!'];
    const text = cries[(targetEid + this.tickCount) % cries.length]!;
    for (const s of this.sessions) {
      if (s.knownEntities.has(targetEid)) {
        s.sendJson({ t: 'chat', channel: 'local', from: actorComp.actor.name, eid: targetEid, text });
      }
    }
    sys('The grab misses.');
    const witnesses = this.theftWitnesses(pos.x, pos.y, targetEid);
    const markFid = factionOfActor(actorComp.actor.id);
    if (markFid !== null) witnesses.unshift({ eid: targetEid, fid: markFid });
    this.chargeTheft(eid, player, pos.x, pos.y, witnesses);
  }

  /**
   * Deeds told through flags → the unwritten page they fill. Kill-shaped
   * deeds (the delve boss, the broken garrison) call grantArt directly.
   */
  private static readonly DEED_FLAG_ARTS: Record<string, string> = {
    // The oath sworn before the twin thrones of Silverfall.
    'dlg:aeriex_court': 'oathbound_edge',
    // Magpie Mab's word — the end of the Rookery whisper-chain.
    mab_word: 'whisper_fang',
  };

  /**
   * Arts this player owns outright, for the codex wire: THE UNWRITTEN
   * PAGE's deed pages and THE SECRET LEDGER's mastered secrets ride
   * the same art:<id> flags, so both walk through here.
   */
  private earnedArts(player: PlayerComp): string[] {
    const out: string[] = [];
    for (const t of TECHNIQUES) {
      if (t.hidden && player.flags.has(artFlag(t.ability))) out.push(t.ability);
    }
    for (const s of SECRET_ARTS) {
      if (player.flags.has(artFlag(s.ability))) out.push(s.ability);
    }
    return out;
  }

  private sendTechniques(player: PlayerComp): void {
    // THE LESSON LAW's meters ride the same message — banked mirrored
    // XP per art still learning; cost derives client-side from the
    // shared masteryXp dial.
    let lessons: Record<string, number> | undefined;
    for (const [flag, v] of player.flags) {
      if (!flag.startsWith('lesson:') || v <= 0) continue;
      (lessons ??= {})[flag.slice('lesson:'.length)] = v;
    }
    player.session?.sendJson({
      t: 'techniques',
      chosen: [player.techniques[0], player.techniques[1]],
      earned: this.earnedArts(player),
      lessons,
    });
  }

  /**
   * An art becomes the player's own, forever (an art:<id> flag —
   * deeds and lessons, never dice). THE UNWRITTEN PAGE fills itself by
   * deed; THE LESSON LAW (phase 3) masters a secret art through here
   * when its meter fills. The ceremony is told to the doer alone; the
   * codex seats the art on arrival.
   */
  private grantArt(player: PlayerComp, artId: string): void {
    const tech = techniquePoolDef(artId);
    if (!tech || (!tech.hidden && !tech.secret)) return;
    const flag = artFlag(artId);
    if (player.flags.has(flag)) return;
    // Direct write — not setPlayerFlag — so a grant can never re-enter
    // the deed watcher above.
    player.flags.set(flag, 1);
    if (player.characterId > 0) this.accounts.setFlag(player.characterId, flag, 1);
    const name = abilityDef(artId)?.name ?? artId;
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: tech.hidden
        ? `An unwritten page fills itself: ${name}. The codex will remember the deed.`
        : `The art is yours now: ${name}. No blade may take it from you.`,
    });
    this.sendTechniques(player);
  }

  /**
   * THE LOAN LAW's teaching hands: every art the weapons currently
   * held will lend — main hand and offhand both, so a dual wielder
   * hears both blades.
   */
  private equippedArtIds(player: PlayerComp): Set<string> {
    const out = new Set<string>();
    const main = this.equippedWeapon(player)?.weapon.art;
    if (main) out.add(main);
    const off = this.offhandWeapon(player)?.weapon.art;
    if (off) out.add(off);
    return out;
  }

  /** A mastered art is owned outright — no blade may take it back. */
  private masteredArt(player: PlayerComp, ability: string): boolean {
    return player.flags.has(artFlag(ability));
  }

  /**
   * THE LESSON LAW: the mastery meter for lent secret arts, credited
   * at the one grantXp door and nowhere else. While an unmastered
   * secret holds a seat AND a weapon that teaches it is in hand, every
   * point of XP its school earns mirrors 1:1 into the art's bank —
   * whiff-0 inherited (no damage, no XP, no lesson), anti-cheese
   * inherited, no pity dials, ONE MIRROR (the art's own casts already
   * pay through their landed damage; there is deliberately no separate
   * cast channel). Utility secrets learn through the weapon's strikes.
   * At the masteryXp cost the bank converts through grantArt — the
   * same ceremony rail the unwritten pages ride — and the lesson flag
   * is deleted: the art:<id> flag is the truth of ownership.
   */
  private creditLessons(player: PlayerComp, skill: SkillId, amount: number): void {
    if (amount <= 0) return;
    let teachers: Set<string> | null = null;
    for (const seat of [0, 1] as const) {
      const art = player.techniques[seat];
      if (!art) continue;
      const tech = techniquePoolDef(art);
      if (!tech?.secret || tech.style !== skill) continue;
      if (this.masteredArt(player, art)) continue;
      teachers ??= this.equippedArtIds(player);
      if (!teachers.has(art)) continue;
      const flag = lessonFlag(art);
      const cost = masteryXp(tech.secret.anchorLevel);
      const before = player.flags.get(flag) ?? 0;
      const after = Math.min(cost, before + amount);
      if (after === before) continue;
      player.lessonDirty.add(art);
      if (after >= cost) {
        player.flags.delete(flag);
        this.grantArt(player, art);
      } else {
        player.flags.set(flag, after);
        // The codex meter breathes at whole-percent steps — the exact
        // grain THE SPOKEN NUMBER shows — and always on the FIRST
        // point, so 'not yet begun' dies with the first landed hit.
        const step = Math.max(1, Math.floor(cost / 100));
        if (before === 0 || Math.floor(after / step) > Math.floor(before / step)) {
          this.sendTechniques(player);
        }
      }
    }
  }

  /**
   * The lesson banks flush on the savePlayer cadence — a meter that
   * moves every hit must never write every hit. A bank that emptied
   * (the meter converted) clears its row.
   */
  private flushLessons(player: PlayerComp): void {
    if (player.characterId < 0 || player.lessonDirty.size === 0) return;
    for (const art of player.lessonDirty) {
      const flag = lessonFlag(art);
      const v = player.flags.get(flag);
      if (v === undefined) this.accounts.clearFlag(player.characterId, flag);
      else this.accounts.setFlag(player.characterId, flag, v);
    }
    player.lessonDirty.clear();
  }

  /**
   * THE LOAN FOLLOWS THE BLADE: when the Q seat holds a lent art
   * whose teacher just left the hands, the new main hand's art takes
   * the seat — today's swap feels exactly like yesterday's weapon
   * art. It only ever replaces an orphaned LOAN: a mastered art, a
   * rung, a page, or an empty seat is the player's arrangement and
   * never touched; the second seat never follows anything, and THE
   * ONE SEAT LAW holds (an art already on the second seat never
   * doubles onto Q).
   */
  private followLoanSeat(player: PlayerComp): void {
    const q = player.techniques[0];
    if (!q) return;
    const tech = techniquePoolDef(q);
    if (!tech?.secret) return;
    if (this.masteredArt(player, q)) return;
    if (this.equippedArtIds(player).has(q)) return;
    const art = this.equippedWeapon(player)?.weapon.art;
    if (!art || art === player.techniques[1]) return;
    player.techniques[0] = art;
    if (player.characterId > 0) this.accounts.saveTechniqueSeat(player.characterId, 0, art);
    this.sendTechniques(player);
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

  /**
   * Re-aggregate worn-gear stats + re-derive max HP (clamped, never 0).
   * THE CALLING LAW folds here too: answered gear-kind Callings join
   * the same aggregate the enchants use, perPiece Callings read the
   * fresh classCounts, and the one-site perk dials rebuild — ONE
   * recompute site serves the wardrobe and the character alike.
   */
  private recomputeGear(eid: EntityId, player: PlayerComp): void {
    player.gear = aggregateGearStats(player.equipment);
    const perks = defaultPerks();
    for (const id of player.callings) {
      const def = callingDef(id);
      if (!def) continue;
      const fx = def.effect;
      switch (fx.kind) {
        case 'gear':
          if (isAggregateCallingEffect(fx)) foldEffect(player.gear, fx.effect);
          break;
        case 'perPiece': {
          const count = player.gear.classCounts[fx.armorClass] ?? 0;
          if (fx.speedPct) player.gear.speedMult *= 1 + (fx.speedPct * count) / 100;
          if (fx.maxHp) player.gear.maxHp += fx.maxHp * count;
          break;
        }
        case 'perk':
          switch (fx.perk) {
            case 'offhandDelayTicks':
              perks.offhandDelayTicks = Math.min(perks.offhandDelayTicks, fx.magnitude);
              break;
            case 'drawMoveFactor':
              perks.drawMoveFactor = Math.max(perks.drawMoveFactor, fx.magnitude);
              break;
            default:
              perks[fx.perk] = fx.magnitude;
          }
          break;
        case 'doubleGather':
          perks.doubleGather[fx.skill] = Math.max(perks.doubleGather[fx.skill] ?? 0, fx.chance);
          break;
        case 'gatherSpeed':
          perks.gatherSpeed[fx.skill] = Math.max(perks.gatherSpeed[fx.skill] ?? 1, fx.mult);
          break;
        case 'materialSave':
          perks.materialSave[fx.skill] = Math.max(perks.materialSave[fx.skill] ?? 0, fx.chance);
          break;
        case 'craftSpeed':
          perks.craftSpeed[fx.skill] = Math.min(perks.craftSpeed[fx.skill] ?? 1, fx.mult);
          break;
      }
    }
    player.perks = perks;
    const health = this.healths.get(eid);
    if (health) {
      health.maxHp = levelForXp(player.skills.vitality ?? 0) + player.gear.maxHp;
      health.hp = Math.max(1, Math.min(health.hp, health.maxHp));
    }
  }

  /** Focus spent by the currently answered set. */
  private focusUsed(player: PlayerComp): number {
    let used = 0;
    for (const id of player.callings) used += callingDef(id)?.focusCost ?? 0;
    return used;
  }

  /**
   * Drop answers that no longer exist or no longer fit the budget —
   * login belt-and-braces only; the toggle path enforces the law live.
   */
  private sanitizeCallings(player: PlayerComp): void {
    const budget = focusBudget(player.skills);
    for (const id of [...player.callings]) {
      const def = callingDef(id);
      const level = def ? levelForXp(player.skills[def.skill] ?? 0) : 0;
      if (!def || level < def.unlockLevel || this.focusUsed(player) > budget) {
        player.callings.delete(id);
        if (player.characterId > 0) this.accounts.deleteCalling(player.characterId, id);
      }
    }
  }

  /**
   * Answer or set down a Calling. Server-validated against the unlock
   * (BASE level, like techniques) and THE FOCUS LAW's budget; toggling
   * is always free — the budget is the only law.
   */
  setCalling(eid: EntityId, calling: string, on: boolean): void {
    const player = this.players.get(eid);
    if (!player) return;
    const def = callingDef(calling);
    if (!def) return;
    if (on && !player.callings.has(calling)) {
      const level = levelForXp(player.skills[def.skill] ?? 0);
      if (level < def.unlockLevel) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `${def.name} answers at ${def.skill} level ${def.unlockLevel}.`,
        });
        return;
      }
      const budget = focusBudget(player.skills);
      if (this.focusUsed(player) + def.focusCost > budget) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Your Focus is spent (${this.focusUsed(player)}/${budget}). Set another Calling down first.`,
        });
        return;
      }
      player.callings.add(calling);
      if (player.characterId > 0) this.accounts.saveCalling(player.characterId, calling);
    } else if (!on && player.callings.has(calling)) {
      player.callings.delete(calling);
      if (player.characterId > 0) this.accounts.deleteCalling(player.characterId, calling);
    } else {
      return;
    }
    this.recomputeGear(eid, player);
    player.session?.sendJson({ t: 'callings', answered: [...player.callings] });
    this.sendCooldowns(player);
  }

  /**
   * Effective skill level: base + worn +skill affixes. Powers combat,
   * gathering, farming, crafting, and building — the RS boosting feel.
   * Equip requirements, technique unlocks, and max HP stay BASE.
   */
  private effectiveLevel(player: PlayerComp, skill: SkillId): number {
    // Old Campaigner: the veteran fights every weapon school a little
    // above their letter — the four schools only, never trades.
    const schooled =
      skill === 'onehand' || skill === 'twohand' || skill === 'archery' || skill === 'arx'
        ? player.perks.warSchooling
        : 0;
    return Math.min(
      120,
      levelForXp(player.skills[skill] ?? 0) + (player.gear.skillBonus[skill] ?? 0) + schooled,
    );
  }

  private onEquipmentChanged(eid: EntityId, player: PlayerComp): void {
    this.recomputeGear(eid, player);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    player.session?.sendJson({ t: 'equip', equipment: player.equipment, carry: player.carryStyle, carryOff: player.carryOff });
    this.followLoanSeat(player);
    // A new weapon or relic means new abilities on the hotbar.
    this.sendCooldowns(player);
    // The roster of stacking meters may have changed with the gear.
    this.sendCharges(player);
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

  /**
   * THE SPOKEN BEAT: tell the swinging session what stage just played
   * and how long its string stays alive. Own-session only, one tiny
   * message per basic — the combo stops being a server secret.
   * Stamped AFTER the lane sets recovery + grace, so `grace` is the
   * honest remaining window from this tick.
   */
  private speakCombo(player: PlayerComp, stage: number, len = COMBO_STAGES): void {
    player.session?.sendJson({
      t: 'combo',
      stage,
      len,
      grace: Math.max(0, player.combo.graceUntilTick - this.tickCount),
      run: player.combo.run,
    });
  }

  private tryPlayerAttack(
    eid: EntityId,
    player: PlayerComp,
    aim: number,
    seq: number,
    tapped = false,
  ): void {
    if (player.attackCooldown > 0) return;
    const equipped = this.equippedWeapon(player);
    if (process.env.COMBAT_DEBUG) {
      console.log(`[combat] attack eid=${eid} weapon=${equipped?.id ?? 'none'} style=${equipped?.weapon.style ?? '-'}`);
    }
    if (!equipped) return;
    const { weapon } = equipped;
    // THE MOVESET BOOK: the weapon's page IS the lane. Archery routes
    // through tickBowDraw before this door ever sees it, and a style
    // with no page pays nothing and fires nothing — checked BEFORE the
    // cooldown/reveal pay.
    const moveset = movesetFor(weapon, equipped.id);
    if (!moveset) {
      if (process.env.COMBAT_DEBUG) {
        console.log(`[combat] no moveset page for style=${weapon.style}`);
      }
      return;
    }

    player.attackCooldown = weapon.cooldownTicks;
    player.lastCombatAt = Date.now();
    // Backstab eligibility is judged at the moment of the swing — capture
    // stealth BEFORE the attack reveals us.
    const wasHidden = player.hidden;
    this.revealPlayer(eid, player);

    const level = this.effectiveLevel(player, weapon.style);
    // School-tuned gear (Blazing Edge etc.) amplifies bolts of its element.
    const elementMult =
      weapon.style === 'arx' && weapon.element
        ? (player.gear.elementDmgMult[weapon.element] ?? 1)
        : 1;
    const maxHit = Math.max(
      1,
      Math.round(
        weapon.damage *
          powerMultFn(level, PLAYER_POWER_PER_LEVEL) *
          player.gear.styleDmgMult[weapon.style] *
          elementMult,
      ),
    );

    // One data-driven door for every page: advance the ONE track, read
    // the beat's strike (a rhythm TAP takes the branch where one is
    // authored), pay its recovery, speak it, pose it, and land it on
    // the choreography's impact frame.
    const len = moveset.string.length;
    const stage = advanceCombo(player.combo, equipped.id, this.tickCount, len);
    const beat = moveset.string[stage]!;
    const strike = tapped && beat.alt ? beat.alt : beat;
    const finisher = stage === len - 1;
    player.attackCooldown = Math.round(weapon.cooldownTicks * strike.recoveryMult);
    player.combo.graceUntilTick = this.tickCount + player.attackCooldown + moveset.graceTicks;
    this.speakCombo(player, stage, len);
    // THE GUARD SWEEP: a foe inside the pole's reach turns a wand beat
    // into a STRIKE — the moulinet the staff choreography always knew,
    // not a bolt spawned inside the enemy's chest. Same beat, same
    // damage, same rhythm stage; the delivery answers the range, and
    // the pose speaks steel so the pole choreography plays.
    const pos = this.positions.must(eid);
    const guard = moveset.style === 'arx' && this.foeWithin(pos, GUARD_SWEEP_RANGE);
    // THE STRIKE CLOCK + THE POSE ALTERNATION LAW: any string length
    // rides the existing pose bytes, adjacent beats never repeating
    // (a guard beat between bolts still flips the byte — steel vs
    // Cast — so the anim clock stays honest).
    const clock = STRIKE_CLOCKS[moveset.style][finisher ? 'finisher' : 'swing'];
    this.setPose(
      eid,
      strikePose(guard ? 'steel' : moveset.poseDialect, stage, len),
      clock.holdTicks,
    );
    // TEMPO: rhythm held past one full string quickens the hand — the
    // windup shaves a tick. Speed, never damage (the cadence contract).
    const windup = guard
      ? GUARD_SWEEP_WINDUP
      : Math.max(0, strike.windupTicks - (player.combo.run > len ? 1 : 0));

    if (moveset.style === 'arx' && !guard) {
      // Wand rhythm: bolt → bolt → orb. The bolt spawns at the press —
      // its flight is already the honest travel (windup 0 by authoring).
      const proj = this.ecs.create();
      this.kinds.set(proj, EntityKind.Projectile);
      this.positions.set(proj, { x: pos.x, y: pos.y, dir: aim });
      this.projectiles.set(proj, {
        ownerEid: eid,
        style: 'arx',
        maxHit: Math.round(maxHit * strike.dmgMult),
        dirX: Math.cos(aim),
        dirY: Math.sin(aim),
        speed: (weapon.projectileSpeed ?? 12) * (strike.speedMult ?? 1),
        distLeft: weapon.range,
        basic: true,
        spawnSeq: seq,
        element: weapon.element,
        heavy: finisher || undefined,
        splashRadius: strike.splash,
        // Ember Bolt passive: the payoff beat sets things burning.
        status:
          finisher && this.hasPassive(player, 'ember_bolt')
            ? { status: 'burn', power: 1, durationTicks: 60 }
            : undefined,
      });
      this.updateChunkMembership(proj);
      return;
    }

    // Steel lanes — THE HONEST SWING: the blow is committed at the
    // press (cooldown, pose, the spoken beat) and LANDS at the impact
    // frame. Every number is captured now: the promise made is the
    // promise kept, a mid-windup swap changes nothing.
    const strikeData = {
      at: this.tickCount + windup,
      pressTick: this.tickCount,
      aim,
      // Follow-Through rides only the finisher — the rhythm's payoff.
      maxHit: finisher
        ? Math.round(maxHit * strike.dmgMult * player.perks.finisherBonusMult)
        : Math.round(maxHit * strike.dmgMult),
      kbMult: guard ? GUARD_SWEEP_KNOCKBACK : strike.kbMult,
      // The pole's turn clears the doorstep; steel beats read the page.
      sweepAll: guard ? true : strike.sweepAll,
      wasHidden,
      backstabMult: weapon.backstabMult ?? BACKSTAB_MULT_DEFAULT,
      xpStyle: moveset.style as SkillId,
      arcHalf: guard
        ? TWOHAND_ARC_HALF
        : (strike.arcHalf ?? (moveset.style === 'twohand' ? TWOHAND_ARC_HALF : Math.PI / 3)),
      // Farcleaver: the edge arrives before the argument.
      range: guard
        ? GUARD_SWEEP_RANGE
        : weapon.range + (moveset.style === 'twohand' ? player.perks.greatReach : 0),
      deed: moveset.style === 'twohand',
    };
    if (windup === 0) this.landStrike(eid, player, strikeData);
    else player.pendingStrike = strikeData;
    // Dual wield: the off blade echoes every mainhand swing a
    // half-beat later. Scheduled from the press, so the echo still
    // trails the main IMPACT by the rig's one-two beat.
    if (moveset.style === 'onehand' && this.offhandWeapon(player)) {
      // Ambidexter tightens the echo's schedule.
      player.offhandEchoTicks = player.perks.offhandDelayTicks;
      player.offhandEchoAim = aim;
      // THE WEAVE: the echo breathes with the string — soft on the
      // chips, heavy on the payoff — normalized by the page's own
      // average, so the echo's cycle output is EXACTLY what the flat
      // echo paid (Σ dmgMult/avg = len, by construction).
      const avg = moveset.string.reduce((a, b) => a + b.dmgMult, 0) / len;
      player.offhandEchoMult = strike.dmgMult / avg;
    }
  }

  /** A living foe (never a companion) inside `range` of this body. */
  private foeWithin(pos: { x: number; y: number }, range: number): boolean {
    for (const [npcEid, npc] of this.npcs) {
      if (this.pets.has(npcEid)) continue;
      const hp = this.healths.get(npcEid);
      if (!hp || hp.hp <= 0) continue;
      const npos = this.positions.get(npcEid);
      if (!npos) continue;
      if (Math.hypot(npos.x - pos.x, npos.y - pos.y) - npc.def.radius <= range) return true;
    }
    return false;
  }

  /** The impact frame arriving: a committed strike lands. */
  private landStrike(
    eid: EntityId,
    player: PlayerComp,
    s: NonNullable<PlayerComp['pendingStrike']>,
  ): void {
    const felled = this.meleeSwing(
      eid,
      player,
      s.aim,
      s.range,
      s.maxHit,
      s.kbMult,
      s.sweepAll,
      s.wasHidden,
      s.backstabMult,
      s.xpStyle,
      s.arcHalf,
      // Lag comp: the world the attacker saw at the PRESS — the base
      // rewind plus however long this blow has been in flight.
      this.tickCount - s.pressTick,
    );
    // THE UNWRITTEN PAGE: three felled by ONE turn of the great
    // steel is the whirlwind's deed — the crowd taught the turning.
    if (s.deed && felled >= 3) this.grantArt(player, 'whirling_ruin');
  }

  /** The per-tick landing door for blows in flight. */
  private resolvePendingStrike(eid: EntityId, player: PlayerComp): void {
    const s = player.pendingStrike;
    if (!s || this.tickCount < s.at) return;
    player.pendingStrike = null;
    this.landStrike(eid, player, s);
  }

  /**
   * The offhand echo: a second, lighter cut from the off blade. Damage
   * scales by offhandDamageFactor(dualwield) — clumsy at discovery,
   * near-mirrored at mastery — and every landed echo trains dualwield
   * (that's the ONLY way it trains). The base scaling still rides
   * onehand: it is a one-handed strike, thrown by the weaker hand.
   */
  private offhandStrike(eid: EntityId, player: PlayerComp, aim: number): void {
    const off = this.offhandWeapon(player);
    if (!off) return;
    const dwLevel = levelForXp(player.skills.dualwield ?? 0);
    const level = this.effectiveLevel(player, 'onehand');
    // Twin Tempo lifts the echo — the never-mirrors cap holds.
    const trained = Math.min(0.85, offhandDamageFactor(dwLevel) + player.perks.offhandFactorBonus);
    // THE MIRRORED HAND: while the stance rides, the echo lands at the
    // buff's weight when that beats the trained factor — parity at the
    // stance's honed peak, never past it (the off hand never OUT-hits
    // the main; the passive curve's law stands untouched).
    let stanceWeight = 0;
    for (const b of player.buffs) {
      if (b.untilTick > this.tickCount) stanceWeight = Math.max(stanceWeight, b.offhandWeight);
    }
    const maxHit = Math.max(
      1,
      Math.round(
        off.weapon.damage *
          powerMultFn(level, PLAYER_POWER_PER_LEVEL) *
          player.gear.styleDmgMult.onehand *
          Math.max(trained, Math.min(1, stanceWeight)) *
          // THE WEAVE: the off blade breathes with the string it
          // mirrors — soft on the chips, heavy on the payoff beat.
          player.offhandEchoMult,
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
    xpStyle: SkillId = 'onehand',
    /** Sweep half-angle — swords cut a ±60° cone, greatweapons wider. */
    arcHalf = Math.PI / 3,
    /** Extra rewind ticks: how long this blow flew after its press. */
    extraRewind = 0,
    /** @returns bodies FELLED by this one swing (the whirlwind's deed). */
  ): number {
    const pos = this.positions.must(eid);
    // Every swing sweeps the scenery too: destructible clutter in the
    // arc bursts regardless of what the blade finds to bleed — through
    // the SAME cone the blade cuts (a greatweapon's wide reap clears
    // wide scenery; this used to hardcode the sword's ±60°).
    this.smashPropsInArc(pos, aim, range, arcHalf);
    // Strike effects live on the blade that lands — the echo cut reads
    // the offhand instance, exactly like coats.
    const struckWeapon =
      xpStyle === 'dualwield' ? player.equipment.offhand : player.equipment.weapon;
    if (struckWeapon) {
      backstabMult += weaponStrikeEffects(struckWeapon.id, struckWeapon.roll).backstabBonus;
    }
    // Opportunist: the turned back pays the practiced hand more.
    backstabMult += player.perks.backstabBonus;
    const critPct = player.gear.critPct + surgeCritPct(player);
    maxHit = Math.max(1, Math.round(maxHit * surgeDmgMult(player)));
    // LAG COMP: test the swing against the world the ATTACKER saw —
    // NPC positions rewound by their view delay (see npcHist), plus
    // the windup this blow spent in flight since its press. Damage
    // and knockback still resolve on the live entity.
    const rewind = this.viewRewindTicks(player) + extraRewind;
    // A strike out of full stealth backstabs from any angle; otherwise a
    // sneaking attacker must be inside the cone behind the target's facing.
    const backstabs = (npos: { x: number; y: number; dir: number }): boolean =>
      wasHidden || (player.sneaking && isBehind(pos.x, pos.y, npos.x, npos.y, npos.dir));
    let bestTarget: EntityId | null = null;
    let bestDist = Infinity;
    const inArc: EntityId[] = [];
    for (const [npcEid, npc] of this.npcs) {
      // A companion is not a target — the blade picks the mob behind it.
      if (this.pets.has(npcEid)) continue;
      const npos = this.npcPosAt(npcEid, rewind);
      if (!npos) continue;
      const dx = npos.x - pos.x;
      const dy = npos.y - pos.y;
      const dist = Math.hypot(dx, dy) - npc.def.radius;
      if (dist > range) continue;
      // Within the weapon's sweep arc of the aim direction; anything
      // practically touching the player is hittable regardless of aim
      // (feel > sim).
      const angleTo = Math.atan2(dy, dx);
      let diff = Math.abs(angleTo - aim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > arcHalf && dist > 0.9) continue;
      inArc.push(npcEid);
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = npcEid;
      }
    }
    if (sweepAll) {
      // The finisher clears the crowd — everyone in the arc eats it.
      let felled = 0;
      for (const npcEid of inArc) {
        const backstab = backstabs(this.npcPosAt(npcEid, rewind) ?? this.positions.must(npcEid));
        let { dmg, crit } = rollBasic(backstab ? Math.round(maxHit * backstabMult) : maxHit, critPct);
        // Executioner: greatblows bite deeper into the nearly-felled.
        if (dmg > 0 && xpStyle === 'twohand' && player.perks.greatExecute > 0) {
          const hp = this.healths.get(npcEid);
          if (hp && hp.hp / hp.maxHp < 0.25) dmg = Math.round(dmg * (1 + player.perks.greatExecute));
        }
        this.damageNpc(npcEid, dmg, eid, xpStyle, {
          crit,
          knockbackMult,
          basic: true,
          backstab,
          offhand: xpStyle === 'dualwield',
        });
        const after = this.healths.get(npcEid);
        if (!after || after.hp <= 0) felled++;
      }
      return felled;
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
      const after = this.healths.get(bestTarget);
      if (!after || after.hp <= 0) return 1;
    }
    return 0;
  }

  // ---------------------------------------------------- smashable props

  /**
   * Sweep the strike arc for destructible clutter — same cone law as
   * the NPC sweep (the caller's arcHalf of aim, touch range always
   * counts) so a swing that would cut a goblin also bursts the barrel
   * beside it. Every prop in the arc goes at once: clearing a room is
   * the fantasy.
   */
  private smashPropsInArc(
    pos: { x: number; y: number },
    aim: number,
    range: number,
    arcHalf = Math.PI / 3,
  ): void {
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
        if (diff > arcHalf && dist > 0.9) continue;
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
    // THE CLEARED HALL STAYS CLEARED: inside a live delve nothing
    // stands back up — a smashed cracked wall stays open (never
    // resealing a hidden room mid-run), a scattered bone pile stays
    // scattered. The re-cut on the next key turn is the reset.
    if (ty < DUNGEON_MIN_Y) {
      this.respawnQueue.push({
        at: Date.now() + info.respawnSec * 1000,
        tx,
        ty,
        tile,
        over: floor,
      });
    }
  }

  // --------------------------------------------------------- abilities

  /** The combat style of the equipped weapon (bare fists count onehand). */
  private currentStyle(player: PlayerComp): CombatStyleId {
    return (this.equippedWeapon(player)?.weapon.style ?? 'onehand') as CombatStyleId;
  }

  /**
   * The seat index (0 = first art, 1 = second) a tray slot maps to,
   * or null for the trinket slots. The ONE place the tray order meets
   * the pair.
   */
  private techSeat(slot: AbilitySlot): 0 | 1 | null {
    return slot === SLOT_TECH_Q ? 0 : slot === SLOT_TECH_E ? 1 : null;
  }

  /**
   * Resolve a technique seat to the ability it casts. THE FREE HAND:
   * any learned art, whatever the hand holds. THE HONED-ART LAW: a
   * learned art casts at the rank the BASE skill level has earned
   * (gear never jumps a rank) — resolving here means casts, cooldown
   * mirrors, and codex previews agree. THE LOAN LAW: an unmastered
   * secret casts at Rank I — the borrowed motion is correct but not
   * yet yours; mastery starts its anchor clock.
   */
  private seatAbility(player: PlayerComp, seat: 0 | 1): AbilityDef | null {
    const chosen = player.techniques[seat];
    if (!chosen) return null;
    const ab = abilityDef(chosen);
    if (!ab) return null;
    const tech = techniquePoolDef(chosen);
    if (!tech?.ranks) return ab;
    if (tech.secret && !this.masteredArt(player, chosen)) return ab;
    const rank = techniqueRankFor(tech, levelForXp(player.skills[tech.style] ?? 0));
    return honedAbility(ab, tech.ranks, rank);
  }

  /**
   * Resolve the ability in a hotbar slot. Four actives, three axes:
   * two technique seats (one earned pool), relic (loot hunt), sigil
   * (boss trophies). No source, no ability — your loadout IS your kit.
   */
  private slotAbility(player: PlayerComp, slot: AbilitySlot): AbilityDef | null {
    switch (slot) {
      case SLOT_TECH_Q:
        return this.seatAbility(player, 0);
      case SLOT_RELIC: {
        const relicItem = itemDef(player.equipment.relic?.id ?? '');
        return relicItem?.relic ? (abilityDef(relicItem.relic) ?? null) : null;
      }
      case SLOT_TECH_E:
        return this.seatAbility(player, 1);
      case SLOT_SIGIL: {
        const sigilItem = itemDef(player.equipment.sigil?.id ?? '');
        return sigilItem?.sigil ? (abilityDef(sigilItem.sigil) ?? null) : null;
      }
    }
  }

  /**
   * THE LOAN LAW's cast gate: a seat holding an unmastered secret art
   * answers only while a teaching weapon is in hand. Sheathe or swap
   * the blade and the seat goes dormant — never emptied; the
   * arrangement is the player's — until the teacher returns or the
   * lessons finish (phase 3).
   */
  private seatDormant(player: PlayerComp, seat: 0 | 1): boolean {
    const chosen = player.techniques[seat];
    if (!chosen) return false;
    const tech = techniquePoolDef(chosen);
    if (!tech?.secret) return false;
    if (this.masteredArt(player, chosen)) return false;
    return !this.equippedArtIds(player).has(chosen);
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
   * THE RAISED WALL: the offhand counts as a shield iff it is held in
   * the fist and armors — quivers ride the back, off-blades are
   * weapons, and neither is a wall.
   */
  private equippedShield(player: PlayerComp): boolean {
    const off = player.equipment.offhand;
    if (!off) return false;
    const def = itemDef(off.id);
    return !!def && !def.backMounted && !def.weapon && (def.armor ?? 0) > 0;
  }

  /**
   * Seat a technique on either art seat — THE SECOND HAND. THE FREE
   * HAND: any
   * learned art fits, whatever the equipped weapon. Server-validated
   * per citizenship: a rung by its school's BASE level, a page by its
   * deed flag, a secret by mastery or THE LOAN LAW's teaching weapon
   * in hand. THE ONE SEAT LAW: two seats must be two arts. Respec is
   * always free.
   */
  setTechnique(eid: EntityId, ability: string, slot: number): void {
    const player = this.players.get(eid);
    if (!player) return;
    const seat = this.techSeat(slot as AbilitySlot);
    if (seat === null) return;
    const tech = techniquePoolDef(ability);
    if (!tech) return;
    const name = abilityDef(ability)?.name ?? ability;
    if (tech.hidden) {
      // An unwritten page opens by deed, never by level.
      if (!player.flags.has(artFlag(ability))) return;
    } else if (tech.secret) {
      // A secret seats while mastered or while a teaching weapon is in
      // hand — the loan is early access, never a gate on the learned.
      if (!this.masteredArt(player, ability) && !this.equippedArtIds(player).has(ability)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `${name} answers only to the weapon that teaches it.`,
        });
        return;
      }
    } else {
      const level = levelForXp(player.skills[tech.style] ?? 0);
      if (level < tech.unlockLevel) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `${name} unlocks at ${tech.style} level ${tech.unlockLevel}.`,
        });
        return;
      }
    }
    if (player.techniques[1 - seat] === ability) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `${name} already holds your other seat.`,
      });
      return;
    }
    player.techniques[seat] = ability;
    if (player.characterId > 0) this.accounts.saveTechniqueSeat(player.characterId, seat, ability);
    this.sendTechniques(player);
    this.sendCooldowns(player);
  }

  /**
   * Pin or clear the one active waypoint. Pure navigation state — the
   * validator already bounded the coordinates, so the server stores
   * what the map asked for and echoes nothing (the client renders its
   * own pin optimistically).
   */
  setWaypoint(eid: EntityId, x?: number, y?: number): void {
    const player = this.players.get(eid);
    if (!player) return;
    if (x === undefined || y === undefined) {
      player.waypoint = null;
      if (player.characterId > 0) this.accounts.clearWaypoint(player.characterId);
      return;
    }
    player.waypoint = { x, y };
    if (player.characterId > 0) this.accounts.saveWaypoint(player.characterId, x, y);
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

  private tryCastAbility(
    eid: EntityId,
    player: PlayerComp,
    slot: AbilitySlot,
    aim: number,
    /** THE HELD SIGIL: the client ring's aimed ground point, if any. */
    aimPt?: { x: number; y: number },
  ): void {
    // THE DRAWN BREATH: while a breath is held, a second press of the
    // winding slot lets it go (a clean cancel — nothing was spent, so
    // nothing refunds); any other slot is refused quietly. One working
    // per pair of hands, and the refusal is predictable, not clever.
    if (player.casting) {
      if (player.casting.slot === slot) this.cancelCasting(eid, player);
      return;
    }
    // THE HELD NOTE: pressing the singing slot again ends the note —
    // the cooldown was paid at the first beat, so the remainder is
    // simply forfeit. (Any OTHER slot's press falls through: its cast
    // will take the hands and cancel the channel with reason 'cast'.)
    if (player.action?.kind === 'channel' && (player.action as ChannelAction).slot === slot) {
      this.cancelAction(eid, player, 'cancelled');
      return;
    }
    const ab = this.slotAbility(player, slot);
    if (!ab) return;
    if (player.abilityCd[slot] > 0) return;
    if (this.tickCount < player.castFreezeUntilTick) return;
    // THE LOAN LAW: a dormant seat (unmastered secret, teacher away)
    // refuses quietly — no cooldown, no freeze, nothing spent.
    {
      const seat = this.techSeat(slot);
      if (seat !== null && this.seatDormant(player, seat)) return;
    }

    // THE WILD ANSWERS THE CALL: the tame is a channel, not a strike —
    // it pre-flights its whole refusal ladder aloud BEFORE any cost,
    // then runs on the action rail (the kneel's grammar at cast range).
    if (ab.shape === 'tame') {
      this.tryTameCast(eid, player, slot, ab, aim);
      return;
    }
    // THE KEEPER'S TONGUE: every keeper word pre-flights its refusals
    // aloud before any cost, exactly as the asking does.
    if (ab.shape === 'becalm' || ab.shape === 'pet_command' || ab.shape === 'wild_howl') {
      this.tryKeeperArt(eid, player, slot, ab, aim);
      return;
    }

    // THE HELD SIGIL: a point-aimed art honors the ring the caster
    // released on — clamped to the art's OWN reach by the same ruler
    // the client ring used, so the promise and the blast agree. The
    // aim angle re-derives from the point (facing, leap direction and
    // cast fx all follow the throw). Frames without a point (touch,
    // hotbar taps, old clients) keep the aim-assisted resolve.
    let targetPos: { x: number; y: number } | undefined;
    if (aimPt && groundAimed(ab)) {
      const cpos = this.positions.must(eid);
      const reach = groundAimRange(ab);
      const dx = aimPt.x - cpos.x;
      const dy = aimPt.y - cpos.y;
      const dist = Math.hypot(dx, dy);
      const k = dist > reach && dist > 0 ? reach / dist : 1;
      targetPos = { x: cpos.x + dx * k, y: cpos.y + dy * k };
      if (dist > 0.05) aim = Math.atan2(dy, dx);
    }

    // THE HELD NOTE: an art with a channel pours out on the action
    // rail — pay at the first note, forfeit what breaks. (The tame,
    // which also carries channelTicks, was intercepted by shape above
    // and never reaches this door.)
    if ((ab.channelTicks ?? 0) > 0) {
      this.beginChannel(eid, player, slot, ab, aim, targetPos);
      return;
    }

    // THE DRAWN BREATH: an art with a wind-up begins its breath here —
    // the whole pay block waits for the fire. The staked point (already
    // clamped by the ruler above) is the promise the release made; it
    // holds through the breath even as the body keeps its stride.
    if ((ab.castTicks ?? 0) > 0) {
      this.beginCasting(eid, player, slot, ab, aim, targetPos);
      return;
    }

    this.fireAbility(eid, player, slot, ab, aim, targetPos);
  }

  /**
   * The pay block + the strike — everything a cast spends and does,
   * shared by the press-edge instants and THE DRAWN BREATH's fire.
   * Nothing before this line has cost the player anything.
   */
  private fireAbility(
    eid: EntityId,
    player: PlayerComp,
    slot: AbilitySlot,
    ab: AbilityDef,
    aim: number,
    targetPos?: { x: number; y: number },
  ): void {
    // Cloth's cooldown discount lands here — where every cooldown is set.
    player.abilityCd[slot] = Math.max(1, Math.round(ab.cooldownTicks * player.gear.cooldownMult));
    player.castFreezeUntilTick = this.tickCount + (ab.castFreezeTicks ?? 0);
    player.lastCombatAt = Date.now();
    this.revealPlayer(eid, player);
    player.drawTicks = 0; // casting lets the bowstring down
    if (player.action) this.cancelAction(eid, player, 'cast');
    this.setPose(eid, PoseState.Art, Math.max(6, (ab.castFreezeTicks ?? 0) + 4));

    // A cast scales by (and trains) the school that owns it: trinkets
    // ride the weapon's stance, but a technique is a learned skill —
    // its own school powers it whatever the hand holds, from either
    // seat (THE FREE HAND, now THE SECOND HAND's pair).
    // TechniqueStyleId, not CombatStyleId: a beastcraft art powers
    // its cast by the beastcraft hand (the fourth citizenship).
    let style: TechniqueStyleId = this.currentStyle(player);
    {
      const seat = this.techSeat(slot);
      if (seat !== null) {
        const tech = techniquePoolDef(player.techniques[seat] ?? '');
        if (tech) style = tech.style;
      }
    }
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
    this.castAbility(eid, ab, aim, style, level, false, targetPos, powerMult);
    // THE DEEPER SIGIL: the art is away, so the cast is a moment. Fired
    // here rather than inside castAbility on purpose — that door also
    // serves NPC casters and every relic and trinket echo, and only a
    // player pressing an ability is what a cast working means.
    const cp = this.positions.get(eid);
    this.bodyMoment(eid, player, 'cast', { x: cp?.x ?? 0, y: cp?.y ?? 0, style });
    this.sendCooldowns(player);
  }

  /**
   * THE DRAWN BREATH: the press begins the wind-up. Nothing is paid —
   * no cooldown, no freeze, no reveal; a broken breath costs only the
   * time spent winding. The working is visible for its whole length
   * (the tame's held-pose law), and the own client hears the start so
   * its locally-predicted bar can never lie for more than a round trip.
   */
  private beginCasting(
    eid: EntityId,
    player: PlayerComp,
    slot: AbilitySlot,
    ab: AbilityDef,
    aim: number,
    targetPos?: { x: number; y: number },
  ): void {
    if (player.action) this.cancelAction(eid, player, 'cast');
    player.drawTicks = 0; // the breath lets the bowstring down
    player.casting = { slot, ab, aim, targetPos, progress: 0, total: ab.castTicks ?? 0 };
    this.setPose(eid, PoseState.Art, (ab.castTicks ?? 0) + 6);
    // THE VISIBLE WORKING: a staked breath telegraphs its landing to
    // every watcher for the wind-up's BEST case (the planted clock —
    // the blast may only ever arrive at or after the mark, never
    // early). A broken breath leaves the mark to gutter out unfired,
    // which reads as the fizzle it is; the fuse telegraph at the fire
    // still speaks with its own exact clock.
    if (targetPos) {
      this.broadcastFx({
        t: 'fx',
        kind: 'telegraph',
        x: targetPos.x,
        y: targetPos.y,
        radius: ab.radius ?? 1.5,
        ticks: Math.ceil((ab.castTicks ?? 0) / CAST_STILL_FACTOR),
        id: ab.id,
        color: ab.color,
      });
    }
    // THE BREATH SPEAKS (FX v5): matter gathers on the caster from
    // the first tick — the charge dialect. Re-emitted on the
    // overlapping window while the breath draws (tickCasting), so a
    // running caster trails the gather and a watcher reads the
    // wind-up on the BODY, not just the bar.
    const cpos = this.positions.get(eid);
    if (cpos) {
      this.broadcastFx({ t: 'fx', kind: 'charge', x: cpos.x, y: cpos.y, radius: 1.5, id: ab.id, color: ab.color });
    }
    player.session?.sendJson({ t: 'cast', state: 'start', slot, ticks: ab.castTicks });
  }

  /** A broken breath: nothing was spent, so nothing refunds. */
  private cancelCasting(eid: EntityId, player: PlayerComp): void {
    if (!player.casting) return;
    const slot = player.casting.slot;
    player.casting = null;
    player.poseUntilTick = this.tickCount; // the stance lets go at once
    player.session?.sendJson({ t: 'cast', state: 'break', slot });
    void eid;
  }

  /**
   * Per-tick accrual, called AFTER the tick's movement resolves. A
   * planted tick breathes CAST_STILL_FACTOR; a moving tick breathes 1.
   * "Planted" is the tick's RESOLVED motion (the stillTicks law):
   * pushing a wall counts as planted, and a 0-frame lag tick counts as
   * planted — a laggy hand is never punished twice. A working that
   * took the hands mid-breath (any action starting) breaks it.
   */
  private tickCasting(eid: EntityId, player: PlayerComp, moved: boolean): void {
    const c = player.casting;
    if (!c) return;
    if (player.action) {
      this.cancelCasting(eid, player);
      return;
    }
    c.progress += moved ? 1 : CAST_STILL_FACTOR;
    if (c.progress >= c.total) {
      this.fireCasting(eid, player);
      return;
    }
    // THE BREATH SPEAKS: the charge re-emits on the overlapping
    // window (the tame re-emit law) at the LIVE position — full
    // stride carries the gather with the body. The contracting reach
    // IS the ramp: matter starts wide and pulls tight as the fire
    // nears, so the read sharpens exactly when the dodge window ends.
    if (this.tickCount % 10 === 0) {
      const pos = this.positions.get(eid);
      if (pos) {
        this.broadcastFx({
          t: 'fx',
          kind: 'charge',
          x: pos.x,
          y: pos.y,
          radius: Math.max(0.5, 1.5 - c.progress / c.total),
          id: c.ab.id,
          color: c.ab.color,
        });
      }
    }
  }

  /** The breath completes: re-verify the hand, then pay and fire. */
  private fireCasting(eid: EntityId, player: PlayerComp): void {
    const c = player.casting;
    if (!c) return;
    player.casting = null;
    // The hand must still hold what it promised: the slot resolves to
    // the same art, awake. A reseat, an unequipped trinket, or a
    // teacher stowed mid-breath breaks the working — the door must
    // never fire a stranger's art.
    const ab = this.slotAbility(player, c.slot);
    const seat = this.techSeat(c.slot);
    if (!ab || ab.id !== c.ab.id || (seat !== null && this.seatDormant(player, seat))) {
      player.poseUntilTick = this.tickCount;
      player.session?.sendJson({ t: 'cast', state: 'break', slot: c.slot });
      return;
    }
    // A staked point holds its promise from the press; the facing
    // re-derives from where the body ended up, so the throw, the leap,
    // and the fx all agree with where the blast will actually land.
    let aim = c.aim;
    if (c.targetPos) {
      const pos = this.positions.must(eid);
      const dx = c.targetPos.x - pos.x;
      const dy = c.targetPos.y - pos.y;
      if (Math.hypot(dx, dy) > 0.05) aim = Math.atan2(dy, dx);
    }
    player.session?.sendJson({ t: 'cast', state: 'fire', slot: c.slot });
    // The def fired is the one resolved at the press — the promise
    // made is the promise kept, even if a rank climbed mid-breath.
    this.fireAbility(eid, player, c.slot, c.ab, aim, c.targetPos);
  }

  /**
   * THE HELD NOTE: the press starts the channel and pays the whole
   * price — cooldown, reveal, the working's moment — then strikes the
   * first note at once. Everything after is the rail's law: movement
   * intent breaks it, damage taken does not, and a break forfeits the
   * remaining pulses (the self-punishing price of the held payload).
   */
  private beginChannel(
    eid: EntityId,
    player: PlayerComp,
    slot: AbilitySlot,
    ab: AbilityDef,
    aim: number,
    targetPos?: { x: number; y: number },
  ): void {
    if (player.action) this.cancelAction(eid, player, 'cast');
    player.abilityCd[slot] = Math.max(1, Math.round(ab.cooldownTicks * player.gear.cooldownMult));
    player.lastCombatAt = Date.now();
    this.revealPlayer(eid, player);
    player.drawTicks = 0; // the note lets the bowstring down
    // School, level, and trinket power resolve exactly as the fire
    // door does — then freeze with the note (the fireAbility twin).
    let style: TechniqueStyleId = this.currentStyle(player);
    {
      const seat = this.techSeat(slot);
      if (seat !== null) {
        const tech = techniquePoolDef(player.techniques[seat] ?? '');
        if (tech) style = tech.style;
      }
    }
    const level = this.effectiveLevel(player, style);
    const trinket =
      slot === SLOT_RELIC
        ? player.equipment.relic
        : slot === SLOT_SIGIL
          ? player.equipment.sigil
          : undefined;
    const powerMult = trinket?.roll ? trinketPowerMult(trinket.roll.rar, trinket.roll.pwr) : 1;
    const total = ab.channelTicks ?? 0;
    const action: ChannelAction = {
      kind: 'channel',
      slot,
      ab,
      targetPos,
      style,
      level,
      powerMult,
      every: ab.pulseEveryTicks ?? 16,
      ticksLeft: total,
      total,
    };
    player.action = action;
    // Visible for the whole note (the tame's held-pose law), and the
    // rail's own wire carries the bar — with the art named, so the
    // client can tint the fill and breathe the singing well.
    this.setPose(eid, PoseState.Art, total + 4);
    player.session?.sendJson({ t: 'action', state: 'start', ticks: total, ability: ab.id, slot });
    this.channelPulse(eid, player, action, aim);
    const cp = this.positions.get(eid);
    this.bodyMoment(eid, player, 'cast', { x: cp?.x ?? 0, y: cp?.y ?? 0, style });
    // THE BREATH SPEAKS (FX v5): the held note hums on the body from
    // the first beat — re-emitted on the tame's overlapping window
    // while the note holds (tickChannel), so the quiet stretches
    // between pulses never read as a finished cast.
    if (cp) {
      this.broadcastFx({ t: 'fx', kind: 'note', x: cp.x, y: cp.y, radius: 0.9, id: ab.id, color: ab.color });
    }
    this.sendCooldowns(player);
  }

  /** One beat of the note: the shape executes through the one door. */
  private channelPulse(eid: EntityId, player: PlayerComp, a: ChannelAction, aim: number): void {
    this.castAbility(eid, a.ab, aim, a.style, a.level, false, a.targetPos, a.powerMult);
    void player;
  }

  /**
   * The note holds its beat. WHIFF-0 rides every pulse through the
   * shape executors untouched — a 0-roll beat writes nothing. The aim
   * is live (pos.dir tracks the last frame's aim), so beams and arcs
   * steer while the feet stay planted; a staked point holds instead.
   */
  private tickChannel(eid: EntityId, player: PlayerComp): void {
    const a = player.action;
    if (!a || a.kind !== 'channel') return;
    a.ticksLeft--;
    if (a.ticksLeft <= 0) {
      player.action = null;
      player.session?.sendJson({ t: 'action', state: 'stop', reason: 'done' });
      return;
    }
    if ((a.total - a.ticksLeft) % a.every === 0) {
      const dir = this.positions.get(eid)?.dir ?? 0;
      this.channelPulse(eid, player, a, dir);
    }
    // THE BREATH SPEAKS: the note re-hums on the tame re-emit law so
    // long notes never gutter between beats.
    if (a.ticksLeft % 20 === 0) {
      const pos = this.positions.get(eid);
      if (pos) {
        this.broadcastFx({ t: 'fx', kind: 'note', x: pos.x, y: pos.y, radius: 0.9, id: a.ab.id, color: a.ab.color });
      }
    }
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
   * THE ASSIST PICKS ITS FIGHTS: aim-assisted resolves and homing
   * volleys only ever choose a body that would trade blows. Companions,
   * kept animals, and the warded watch are refused at the damage doors
   * anyway — steering a cast onto them is a wasted shot at best and an
   * accidental assault deed at worst. Neutral named characters are
   * people you'd sooner talk to, so the assist leaves them be too
   * (deliberate aim still reaches every fightable body). The client's
   * assistMark mirrors this from the wire facts.
   */
  private assistMark(npcEid: EntityId): boolean {
    if (this.pets.has(npcEid) || this.livestock.has(npcEid)) return false;
    const actor = this.actors.get(npcEid)?.actor;
    if (actor && (actor.protection === 'invulnerable' || actor.disposition !== 'hostile')) {
      return false;
    }
    return true;
  }

  /**
   * Targets for a homing volley: every foe in the aim cone, nearest
   * first. The fan hands these out round-robin so three seekers pick
   * three different throats instead of stacking on one.
   */
  private homingMarks(pos: { x: number; y: number }, aim: number, range: number): EntityId[] {
    const found: Array<{ eid: EntityId; d: number }> = [];
    for (const [npcEid, npc] of this.npcs) {
      if (!this.assistMark(npcEid)) continue;
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
      if (!this.assistMark(npcEid)) continue;
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
    // Arx Art projectiles fly in the caster's staff school — the
    // element is a weapon fact, so a Frost Nova from an ember staff
    // still novas blue, but its bolts stay the staff's own fire.
    const casterPlayer = fromNpc ? undefined : this.players.get(casterEid);
    const element = casterPlayer
      ? this.equippedWeapon(casterPlayer)?.weapon.element
      : undefined;
    // Player casters carry their armor-class style multiplier in, plus
    // any school-tuned element amplifier (Blazing Edge etc.). Gear has
    // no sneak, shield, or dualwield damage axis — twin steel is
    // one-hand steel, so all three ride the onehand mult. A COMBAT art
    // rides the hand that holds it: the veteran's school owns no
    // weapon, so its casts resolve to the EQUIPPED weapon's gear axis
    // (sword in hand pays the onehand investment, bow the archery one).
    const gearStyle =
      style === 'sneak' || style === 'shield' || style === 'dualwield'
        ? 'onehand'
        : style === 'combat'
          ? (casterPlayer ? this.currentStyle(casterPlayer) : 'onehand')
          : style;
    const gearMult = casterPlayer
      ? ((casterPlayer.gear.styleDmgMult as Record<string, number>)[gearStyle] ?? 1) *
        (style === 'arx' && element ? (casterPlayer.gear.elementDmgMult[element] ?? 1) : 1) *
        // A damage surge riding when the art fires rides the art too.
        surgeDmgMult(casterPlayer)
      : 1;
    // THE THREAT LAW: NPC casters climb the steeper NPC curve — the
    // level line is all they have; players compound gear on top.
    const maxHit =
      ab.damage > 0
        ? Math.max(
            1,
            Math.round(
              ab.damage *
                powerMultFn(level, fromNpc ? NPC_POWER_PER_LEVEL : PLAYER_POWER_PER_LEVEL) *
                gearMult *
                powerMult,
            ),
          )
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
        // THE KIT: an NPC's sweep cuts the OTHER side of the fight —
        // same crescent, same whiff-0 roll, THREAT LAW mitigation.
        if (fromNpc) {
          this.blastPlayers(pos.x, pos.y, range, maxHit, ab.status, level, {
            sourceEid: casterEid,
            arcAim: aim,
            arcHalf: arc,
          });
          break;
        }
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
          this.blastPlayers(pos.x, pos.y, radius, maxHit, ab.status, level, {
            sourceEid: casterEid,
          });
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
          if (fromNpc) {
            // THE KIT: an NPC's lunge carves through the player's
            // side of the yard — whiff-0 uniform roll, THREAT LAW
            // mitigation, the blow attributed to the lunger.
            for (const [pEid, p] of this.players) {
              if (struck.has(pEid)) continue;
              if (p.session === null && p.disconnectedAt !== null) continue;
              const ppos = this.positions.get(pEid);
              if (!ppos) continue;
              if (Math.hypot(ppos.x - pos.x, ppos.y - pos.y) > 0.8) continue;
              struck.add(pEid);
              this.damagePlayer(pEid, Math.floor(Math.random() * (maxHit + 1)), {
                status: ab.status,
                sourceEid: casterEid,
                attackerLevel: level,
              });
            }
            for (const [petEid] of this.pets) {
              if (struck.has(petEid)) continue;
              const ppos = this.positions.get(petEid);
              if (!ppos) continue;
              if (Math.hypot(ppos.x - pos.x, ppos.y - pos.y) > 0.8) continue;
              struck.add(petEid);
              this.damagePet(petEid, Math.floor(Math.random() * (maxHit + 1)), {
                status: ab.status,
                attackerLevel: level,
              });
            }
            continue;
          }
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
        // Honed arts may loose a small fan — spread across spreadArc
        // exactly like projectile_fan, so the def never overpromises.
        if (ab.projectiles && maxHit > 0) {
          const count = ab.projectiles;
          const spread = ab.spreadArc ?? 0;
          for (let i = 0; i < count; i++) {
            const shotAim =
              count > 1 ? aim - spread / 2 + (spread * i) / (count - 1) : aim;
            const proj = this.ecs.create();
            this.kinds.set(proj, EntityKind.Projectile);
            this.positions.set(proj, { x: pos.x, y: pos.y, dir: shotAim });
            this.projectiles.set(proj, {
              ownerEid: casterEid,
              style: ab.element ? 'arx' : style === 'arx' ? 'arx' : 'archery',
              maxHit,
              dirX: Math.cos(shotAim),
              dirY: Math.sin(shotAim),
              speed: ab.projectileSpeed ?? 14,
              distLeft: ab.range ?? 6,
              status: ab.status,
              fromNpc,
              attackerLevel: fromNpc ? level : undefined,
              element: ab.element ?? (style === 'arx' ? element : undefined),
              homingTurn: ab.homing,
              abilityId: ab.id,
              abilityColor: ab.color,
            });
            this.updateChunkMembership(proj);
          }
        }
        break;
      }

      case 'chain_zap': {
        // Strike the nearest enemy in the aim cone, then arc onward.
        const range = ab.range ?? 6;
        const chainRadius = ab.radius ?? 3;
        const maxTargets = ab.chainTargets ?? 3;
        // THE KIT: an NPC's chain hops the player's side — players
        // and companions, nearest first, same cone-then-radius law.
        if (fromNpc) {
          let zfrom = { x: pos.x, y: pos.y };
          const zdone = new Set<EntityId>();
          for (let hop = 0; hop < maxTargets; hop++) {
            const cands: Array<{ eid: EntityId; x: number; y: number; pet: boolean }> = [];
            for (const [pEid, p] of this.players) {
              if (zdone.has(pEid)) continue;
              if (p.session === null && p.disconnectedAt !== null) continue;
              const ppos = this.positions.get(pEid);
              if (ppos) cands.push({ eid: pEid, x: ppos.x, y: ppos.y, pet: false });
            }
            for (const [petEid] of this.pets) {
              if (zdone.has(petEid)) continue;
              const ppos = this.positions.get(petEid);
              if (ppos) cands.push({ eid: petEid, x: ppos.x, y: ppos.y, pet: true });
            }
            let best: { eid: EntityId; x: number; y: number; pet: boolean } | null = null;
            let bestDist = Infinity;
            for (const c of cands) {
              const dx = c.x - zfrom.x;
              const dy = c.y - zfrom.y;
              const d = Math.hypot(dx, dy);
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
                best = c;
              }
            }
            if (!best) break;
            zdone.add(best.eid);
            this.broadcastFx({
              t: 'fx',
              kind: 'bolt',
              x: zfrom.x,
              y: zfrom.y,
              x2: best.x,
              y2: best.y,
              radius: 0,
              id: ab.id,
              color: ab.color,
            });
            zfrom = { x: best.x, y: best.y };
            const raw = Math.floor(Math.random() * (maxHit + 1));
            if (best.pet) {
              this.damagePet(best.eid, raw, { status: ab.status, attackerLevel: level });
            } else {
              this.damagePlayer(best.eid, raw, {
                status: ab.status,
                sourceEid: casterEid,
                attackerLevel: level,
              });
            }
          }
          break;
        }
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
            attackerLevel: fromNpc ? level : undefined,
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
        // wisps thrown from a sword still fly as Arx, not arrows.
        const projStyle = ab.element ? 'arx' : style === 'arx' ? 'arx' : 'archery';
        const projElement = ab.element ?? (style === 'arx' ? element : undefined);
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
            attackerLevel: fromNpc ? level : undefined,
            element: projElement,
            homingTurn: ab.homing,
            targetEid: marks.length > 0 ? marks[i % marks.length] : undefined,
            returns: ab.returns,
            executeBelow: ab.executeBelow,
            drainFrac: ab.drainFrac,
            abilityId: ab.id,
            abilityColor: ab.color,
          });
          this.updateChunkMembership(proj);
        }
        break;
      }

      case 'ground_aoe': {
        const target = targetPos ?? this.resolveGroundTarget(pos, aim, ab.range ?? 4);
        // THE QUICKENING TOUCH (the green arts' capstone): the one
        // ground art that GROWS instead of bursting — a quarter of
        // the aimed crop's whole season lent at once. Damage 0 by
        // school law; a bare aim refunds the cast (spoken, no cd
        // burn happens upstream of the cooldown stamp? — no: the cd
        // was stamped at fire, so the refusal is honest advice).
        if (ab.id === 'quickening_touch' && !fromNpc) {
          const ctx2 = Math.floor(target.x);
          const cty2 = Math.floor(target.y);
          const crop = this.crops.get(`${ctx2},${cty2}`);
          const caster = this.players.get(casterEid);
          const say2 = (text: string) =>
            caster?.session?.sendJson({ t: 'chat', channel: 'system', text });
          if (!crop) {
            say2('The touch wants a growing crop under it.');
            break;
          }
          const stage = stageForElapsed(crop.def, this.cropElapsed(crop, Date.now()));
          if (stage === 2) {
            say2('It has grown all it will. Harvest it.');
            break;
          }
          crop.boostMs += Math.round(growMs(crop.def) * 0.25);
          this.saveCrop(crop);
          this.tickCrops(Date.now());
          this.broadcastFx({
            t: 'fx',
            kind: 'telegraph',
            x: ctx2 + 0.5,
            y: cty2 + 0.5,
            radius: 0.8,
            ticks: 16,
            id: ab.id,
            color: ab.color,
          });
          say2(`The ${crop.def.name.toLowerCase()} drinks a season in a breath.`);
          break;
        }
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
          attackerLevel: fromNpc ? level : undefined,
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
          attackerLevel: fromNpc ? level : undefined,
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
              attackerLevel: level,
              sourceEid: casterEid,
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
        // An aimed point (THE HELD SIGIL) sets the hop's length too —
        // a ring placed short lands short; the art's reach still caps it.
        const hop = Math.abs(ab.dashTiles ?? 4);
        const dist = targetPos
          ? Math.min(hop, Math.hypot(targetPos.x - pos.x, targetPos.y - pos.y))
          : hop;
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
          this.blastPlayers(cx, cy, radius, maxHit, ab.status, level, { sourceEid: casterEid });
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
            attackerLevel: fromNpc ? level : undefined,
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
        this.applySelf(casterEid, ab, powerMult, pos);
        break;
      }

      case 'summon': {
        // THE KIT's raising lane: an NPC summoner calls real bestiary
        // bodies, capped alive per caster — never a prop.
        if (fromNpc && ab.summonNpc) {
          this.npcSummonAdds(casterEid, ab, level, pos);
          break;
        }
        const spec = ab.summon;
        if (!spec) break;
        // A ranged summon plants at the aimed point (Snare Shot rides
        // the arrow out); rangeless summons keep dropping at the feet.
        const at = ab.range
          ? (targetPos ?? this.resolveGroundTarget(pos, aim, ab.range))
          : { x: pos.x, y: pos.y };
        const eid = this.ecs.create();
        this.kinds.set(eid, EntityKind.Prop);
        this.positions.set(eid, { x: at.x, y: at.y, dir: aim });
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
          x: at.x,
          y: at.y,
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
            if (Math.hypot(npos.x - at.x, npos.y - at.y) > spec.radius) continue;
            if (npc.def.damage <= 0) continue;
            this.npcAggro(npcEid, npc, eid);
          }
        }
        break;
      }
    }

    // THE COMPOUND LAW: `self` rides ANY shape — a leap that lands with
    // a war-shout, a wave that steels the thrower. The self_buff shape
    // handles its own inside the switch; every other shape applies the
    // rider here, at the cast's final position (a leap shouts where it
    // LANDS, not where it left).
    if (ab.shape !== 'self_buff' && ab.self) this.applySelf(casterEid, ab, powerMult, pos);

    // THE CHALLENGE: the cast dares the yard — every hostile-capable
    // body in the ring is forced onto the caster. The decoy
    // force-switch precedent, worn as a knight's shout; player casters
    // only (an NPC cannot dare its own kind), and the town cast is
    // deaf to it — a shout never turns the watch.
    if (ab.tauntRadius && this.players.has(casterEid)) {
      for (const [npcEid, npc] of this.npcs) {
        const npos = this.positions.get(npcEid);
        if (!npos) continue;
        if (Math.hypot(npos.x - pos.x, npos.y - pos.y) > ab.tauntRadius) continue;
        if (npc.def.damage <= 0 || this.actors.has(npcEid)) continue;
        // A challenge is a deliberate dare — it pierces faction peace
        // (taunting a camp that trusts you is asking for the fight).
        this.npcAggro(npcEid, npc, casterEid, { force: true });
      }
    }
  }

  /**
   * The caster's own empowerment: heal, shield, haste, oiled edge.
   * One body serves the self_buff shape and every compound art's
   * `self` rider — the empowerment is VISIBLE either way.
   */
  private applySelf(
    casterEid: EntityId,
    ab: AbilityDef,
    powerMult: number,
    pos: { x: number; y: number },
  ): void {
    const player = this.players.get(casterEid);
    const self = ab.self;
    if (!self) return;
    if (!player) {
      // THE KIT: an NPC's self rider is a curated subset — the mend
      // (healFrac scales with the body, so a level-68 reissue mends a
      // level-68 wound; flat heal stays honest for pinned bodies).
      // Stance rails (shields, lifesteal, oils) stay player rails.
      const health = this.healths.get(casterEid);
      if (!health) return;
      const mend = self.healFrac
        ? Math.round(health.maxHp * self.healFrac)
        : Math.round((self.heal ?? 0) * powerMult);
      if (mend <= 0) return;
      health.hp = Math.min(health.maxHp, health.hp + mend);
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
      return;
    }
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
      self.onHitStatus !== undefined ||
      self.armor !== undefined ||
      self.reflectFrac !== undefined ||
      self.offhandWeight !== undefined ||
      self.beastTruce !== undefined
    ) {
      player.buffs.push(
        mkBuff({
          speedMult: self.speedMult ?? 1,
          // Stonewall thickens every shield the caster raises.
          shieldHp: Math.round((self.shieldHp ?? 0) * powerMult * player.perks.shieldMult),
          meleeLifesteal: self.meleeLifesteal ?? 0,
          // The tank stances: buff armor mitigates, the turned blow repays.
          armor: self.armor ?? 0,
          reflectFrac: self.reflectFrac ?? 0,
          // THE MIRRORED HAND: the twin school's stance rail.
          offhandWeight: self.offhandWeight ?? 0,
          // THE QUIET WALK: the truce (and rank IV's parting) ride the buff.
          beastTruce: self.beastTruce ?? false,
          beastPart: self.beastPart ?? 0,
          onHitStatus: self.onHitStatus,
          untilTick: this.tickCount + self.durationTicks,
        }),
      );
    }
  }

  /**
   * NPC-owned blast: hits players, straw decoys, and companions.
   * `sourceEid` attributes the blow (pet defend, reflect, kill
   * source — AoE deaths finally name their killer); `arcAim`/
   * `arcHalf` cut the blast to a crescent (NPC melee_arc sweeps and
   * flurries keep their authored arc instead of reading as full
   * circles). Point-blank (< 0.9) hits regardless of facing, the
   * melee_arc law.
   */
  private blastPlayers(
    x: number,
    y: number,
    radius: number,
    maxHit: number,
    status?: StatusApply,
    attackerLevel?: number,
    opts?: { sourceEid?: EntityId; arcAim?: number; arcHalf?: number },
  ): void {
    const inArc = (tx: number, ty: number): boolean => {
      if (opts?.arcAim === undefined || opts?.arcHalf === undefined) return true;
      const d = Math.hypot(tx - x, ty - y);
      if (d < 0.9) return true;
      let diff = Math.abs(Math.atan2(ty - y, tx - x) - opts.arcAim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      return diff <= opts.arcHalf;
    };
    for (const [playerEid, player] of this.players) {
      if (player.session === null && player.disconnectedAt !== null) continue;
      const ppos = this.positions.get(playerEid);
      if (!ppos) continue;
      if (Math.hypot(ppos.x - x, ppos.y - y) > radius) continue;
      if (!inArc(ppos.x, ppos.y)) continue;
      this.damagePlayer(playerEid, Math.floor(Math.random() * (maxHit + 1)), {
        status,
        attackerLevel,
        sourceEid: opts?.sourceEid,
      });
    }
    for (const [sumEid, sum] of this.summons) {
      if (sum.kind !== 'decoy') continue;
      const spos = this.positions.get(sumEid);
      if (!spos) continue;
      if (Math.hypot(spos.x - x, spos.y - y) > radius) continue;
      if (!inArc(spos.x, spos.y)) continue;
      this.damageSummon(sumEid, Math.floor(Math.random() * (maxHit + 1)));
    }
    // A companion standing in the blast eats it like anyone standing
    // in a blast — splash is physical, not perceptual.
    for (const [petEid] of this.pets) {
      const ppos = this.positions.get(petEid);
      if (!ppos) continue;
      if (Math.hypot(ppos.x - x, ppos.y - y) > radius) continue;
      if (!inArc(ppos.x, ppos.y)) continue;
      this.damagePet(petEid, Math.floor(Math.random() * (maxHit + 1)), {
        status,
        attackerLevel,
      });
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
    fromPet = false,
  ): void {
    const npc = this.npcs.get(npcEid);
    if (!npc) return;
    // The ward keeps venom off the blade's target entirely — no
    // status decals, no reaction fuel, nothing to detonate later.
    if (this.actors.get(npcEid)?.actor.protection === 'invulnerable') return;
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
        ...(fromPet ? { fromPet: true } : {}),
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
      if (player.sheathed) bits |= SHEATHED_BIT;
    } else {
      // NPC sheathe is a pure function of disposition and combat state:
      // friendly actors (no combat body) always keep arms away; a
      // fightable actor with the preference stows only while idle — the
      // moment a chase begins the bit drops and the client plays the
      // draw. Plain bestiary mobs never stow.
      const npc = this.npcs.get(eid);
      // Wariness is not war: a suspicious or investigating guard
      // keeps the blade on the hip — steel comes out for the chase
      // and stays out through the search.
      const stowed =
        npc?.state === 'idle' || npc?.state === 'suspicious' || npc?.state === 'investigate';
      if (npc ? npc.sheathePref && stowed : this.actors.has(eid)) {
        bits |= SHEATHED_BIT;
      }
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
          if (this.pets.has(eid)) {
            // A companion's DoT walks the pet rail (dotNpc would hit
            // the friendly-fire wall in damageNpc) — the drip pierces
            // armor exactly as it does for players: the wound's
            // already inside.
            this.damagePet(eid, s.power, { pierceArmor: true, sourceEid: s.sourceEid });
          } else if (this.npcs.has(eid)) {
            this.dotNpc(eid, s.power, s.sourceEid, s.id as 'burn' | 'bleed' | 'venom', s.fromPet);
          } else if (this.players.has(eid)) {
            // Bitter Blood: the herbalist's constitution dulls the drip.
            const p = this.players.get(eid)!;
            // The pulse carries its burner: a hurt moment with no
            // source in hand left every targeted hurt working rolling,
            // winning, and no-oping — its rest banked against nothing.
            this.damagePlayer(eid, Math.max(1, Math.round(s.power * p.perks.dotResistMult)), {
              pierceArmor: true,
              sourceEid: s.sourceEid,
            });
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
    fromPet = false,
  ): void {
    const npc = this.npcs.get(npcEid);
    const health = this.healths.get(npcEid);
    if (!npc || !health || dmg <= 0) return;
    // Nothing burns through the ward — a status that somehow landed
    // before protection was set still ticks for zero.
    if (this.actors.get(npcEid)?.actor.protection === 'invulnerable') return;
    this.broadcastHit(npcEid, dmg);
    health.hp -= dmg;
    const source = this.players.get(sourceEid);
    if (source && !fromPet) {
      const style: SkillId = kind === 'burn' ? 'arx' : kind === 'venom' ? 'sneak' : 'onehand';
      // The drip draws the same mark budget as the blow that set it.
      const credited = this.creditMark(npc, sourceEid, dmg);
      if (credited > 0) this.grantXp(sourceEid, source, style, credited * 2);
    }
    // A DoT tail is not a struck blow — no style rides to the deed rail.
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
          if (npcLivestock(npc.def)) continue; // livestock won't spring it
          if (this.pets.has(npcEid)) continue; // a companion won't either
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          if (Math.hypot(npos.x - pos.x, npos.y - pos.y) - npc.def.radius > sum.radius) continue;
          // Sprung: bite, chill, and the trap is spent.
          const owner = this.players.get(sum.ownerEid);
          const level = owner ? this.effectiveLevel(owner, 'onehand') : 1;
          const dmg = scaledMaxHit(3, level, PLAYER_POWER_PER_LEVEL);
          this.damageNpc(npcEid, dmg, sum.ownerEid, 'onehand', {
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
        // NPC flurries keep their authored crescent now that the
        // blast resolver speaks arc — full circles were the old debt.
        this.blastPlayers(blast.x, blast.y, blast.radius, blast.damage, blast.status, blast.attackerLevel, {
          sourceEid: blast.ownerEid,
          arcAim: blast.arcAim,
          arcHalf: blast.arcHalf,
        });
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
        this.blastPlayers(field.x, field.y, field.radius, field.damage, field.status, field.attackerLevel, {
          sourceEid: field.ownerEid,
        });
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
            // A homing shot never hunts a companion.
            if (this.pets.has(npcEid)) continue;
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
              attackerLevel: proj.attackerLevel,
              sourceEid: proj.ownerEid,
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
        if (!dead) {
          // A mob's shaft finds a companion body in its line — the
          // arrow is physical; being unseen never made it a ghost.
          for (const [petEid] of this.pets) {
            const ppos = this.positions.get(petEid);
            const pnpc = this.npcs.get(petEid);
            if (!ppos || !pnpc) continue;
            const dx = ppos.x - pos.x;
            const dy = bandDy(pos.y, ppos.y, npcHitHeight(pnpc.def));
            if (dx * dx + dy * dy < 0.5 ** 2) {
              this.damagePet(petEid, Math.floor(Math.random() * (proj.maxHit + 1)), {
                status: proj.status,
                attackerLevel: proj.attackerLevel,
                sourceEid: proj.ownerEid,
              });
              dead = true;
              break;
            }
          }
        }
      } else if (!dead) {
        for (const [npcEid, npc] of this.npcs) {
          if (proj.hitEids?.has(npcEid)) continue;
          // Arrows fly past a companion — it neither blocks nor bleeds.
          if (this.pets.has(npcEid)) continue;
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          const dx = npos.x - pos.x;
          // The visual body rises north of the ground point — test the
          // feet→crown band so a shot crossing the chest or head lands.
          const dy = bandDy(pos.y, npos.y, npcHitHeight(npc.def));
          if (dx * dx + dy * dy < (npc.def.radius + 0.25) ** 2) {
            // The surge is read where the shaft LANDS, not where it was
            // loosed: a working that woke mid-flight still sharpens the
            // arrow already in the air. Cheaper than stamping every
            // projectile, and it reads the same in the hand. Basic
            // shots fold the damage surge here too (abilities folded
            // it at cast — see castAbility's gearMult — so only the
            // basic shaft would otherwise never feel it), under the
            // melee door's own rounding law.
            const shooter = this.players.get(proj.ownerEid);
            const critPct = shooter ? shooter.gear.critPct + surgeCritPct(shooter) : 0;
            const maxHit =
              proj.basic && shooter
                ? Math.max(1, Math.round(proj.maxHit * surgeDmgMult(shooter)))
                : proj.maxHit;
            const roll = proj.basic ? rollBasic(maxHit, critPct) : rollDamage(maxHit, critPct);
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
            // THE SIGNATURE LAW: an ability's shot announces its
            // impact — the client's bespoke signature fires at the
            // wound, not just where the arrow left the string. Basic
            // attacks stay quiet; heavy wand bolts keep their old
            // anonymous burst.
            if (proj.abilityId && !proj.basic) {
              this.broadcastFx({
                t: 'fx',
                kind: 'blast',
                x: pos.x,
                y: pos.y,
                radius: proj.splashRadius ?? 0.55,
                id: proj.abilityId,
                color: proj.abilityColor,
              });
            } else if (proj.splashRadius) {
              this.broadcastFx({
                t: 'fx',
                kind: 'blast',
                x: pos.x,
                y: pos.y,
                radius: proj.splashRadius,
                color: '#b49af0',
              });
            }
            // Heavy orbs burst on impact, splashing everything close.
            // The splash is part of the same landing, so it reads the
            // same surge-folded maxHit the direct hit rolled from.
            if (proj.splashRadius) {
              const splashHit = Math.max(1, Math.round(maxHit * 0.5));
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

  // ====================================================== THE DEEPER SIGIL

  /**
   * A working's live state, born at rest-zero on first sight. One entry
   * per proc id however many worn pieces carry it: a matched set shares
   * one timer and one meter, which is what stops five copies of the
   * same working from answering the same moment five times.
   */
  /**
   * Players whose stacking meters moved this tick. Flushed once at the
   * end of tick() so a whirlwind that feeds three meters in one blow
   * still costs one message.
   */
  private chargesDirty = new Set<EntityId>();

  private procState(player: PlayerComp, id: string): ProcRuntime {
    let st = player.procs.get(id);
    if (!st) {
      st = mkProcRuntime();
      player.procs.set(id, st);
    }
    return st;
  }

  /**
   * THE METER SHOWS ITS HAND: the own player's stacking-working meters,
   * one row per working id (THE METER BELONGS TO THE FIGHTER — one
   * count however many pieces answer it). Sent when a meter moves, when
   * gear changes the roster of meters, and on join. The wire carries
   * only what the server alone knows; the client resolves name, school,
   * and icon from the roster by id.
   */
  private sendCharges(player: PlayerComp): void {
    const charges: ChargeInfo[] = [];
    for (const p of player.gear.procs) {
      if (p.trigger.on !== 'stacks') continue;
      charges.push({ id: p.id, have: this.procState(player, p.id).stacks, need: p.trigger.count });
    }
    player.session?.sendJson({ t: 'charges', charges });
  }

  /**
   * THE ONE PROC DOOR. Every trigger site funnels through here, so the
   * rest timer, the meter, and the firing all live at one seam. The
   * arbitration itself is pure and lives in content/equipment (see
   * procWakes) so the ordering laws can be pinned without a server.
   *
   * Returns whatever the action hands back (a yield working's extra),
   * 0 for everything else.
   */
  private offerProc(
    eid: EntityId,
    player: PlayerComp,
    p: ProcEffect,
    on: ProcMoment,
    ctx: ProcContext,
  ): number {
    const st = this.procState(player, p.id);
    // A stacking meter that moves — a charge banked, or the spend when
    // the working answers — reaches the wearer's HUD at tick end.
    const banked = st.stacks;
    const woke = procWakes(p, st, on, this.tickCount);
    if (st.stacks !== banked) this.chargesDirty.add(eid);
    if (!woke) return 0;
    return this.runProc(eid, player, p, ctx);
  }

  /**
   * Offer a moment to every working the BODY carries (the aggregate
   * channel) — kill, hurt, block, cast, gather, and every stacking
   * working whatever slot it rides.
   */
  private bodyMoment(
    eid: EntityId,
    player: PlayerComp,
    on: ProcMoment,
    ctx: ProcContext,
  ): number {
    let extra = 0;
    for (const p of player.gear.procs) {
      // A targeted working cannot answer a moment that arrives with no
      // live foe in hand — the door refuses BEFORE arbitration, so no
      // chance is rolled and no rest is stamped on an answer that
      // could only ever no-op. A door-side precondition, not
      // arbitration: procWakes stays pure and untouched.
      if (
        (TARGETED_ACTIONS as readonly string[]).includes(p.action.do) &&
        (ctx.targetEid === undefined || !this.npcs.has(ctx.targetEid))
      ) {
        continue;
      }
      extra += this.offerProc(eid, player, p, on, ctx);
    }
    return extra;
  }

  /**
   * Offer a moment to the workings on the steel that LANDED, then to
   * the body. Two dual-wielded blades carry two different edges and
   * each answers only when its own steel connects, exactly as coats do.
   */
  private steelMoment(
    eid: EntityId,
    player: PlayerComp,
    worn: EquippedItem | undefined,
    on: ProcMoment,
    ctx: ProcContext,
  ): void {
    if (worn) {
      for (const p of weaponStrikeEffects(worn.id, worn.roll).procs) {
        this.offerProc(eid, player, p, on, ctx);
      }
    }
    this.bodyMoment(eid, player, on, ctx);
  }

  /**
   * THE CROSSING: a lowHp working answers the fall past its line and
   * then goes quiet until the wearer climbs back over it. The crossing
   * is read from the health BEFORE the wound against the health after
   * it, so re-arming needs no call from any heal site — food, tonics,
   * drains, totems, lifesteal, and the regen tick all re-arm the
   * working simply by lifting the wearer over the line before the
   * next fall. One dive past the mark is one answer however many
   * small hits carried it down.
   */
  private lowHpMoment(eid: EntityId, player: PlayerComp, prevHp: number): void {
    const health = this.healths.get(eid);
    if (!health || health.maxHp <= 0 || health.hp <= 0) return;
    const frac = health.hp / health.maxHp;
    const prevFrac = prevHp / health.maxHp;
    const pos = this.positions.get(eid);
    for (const p of player.gear.procs) {
      if (p.trigger.on !== 'lowHp') continue;
      if (prevFrac <= p.trigger.pct || frac > p.trigger.pct) continue;
      const st = this.procState(player, p.id);
      if (this.tickCount < st.restUntil) continue;
      st.restUntil = this.tickCount + p.icd;
      this.runProc(eid, player, p, { x: pos?.x ?? 0, y: pos?.y ?? 0 });
    }
  }

  /** Ground covered on foot feeds every stride working. */
  private strideMoment(eid: EntityId, player: PlayerComp, tiles: number): void {
    if (tiles <= 0) return;
    for (const p of player.gear.procs) {
      if (p.trigger.on !== 'stride') continue;
      const st = this.procState(player, p.id);
      st.tiles += tiles;
      if (st.tiles < p.trigger.tiles) continue;
      if (this.tickCount < st.restUntil) continue;
      st.tiles = 0;
      st.restUntil = this.tickCount + p.icd;
      const pos = this.positions.get(eid);
      this.runProc(eid, player, p, { x: pos?.x ?? 0, y: pos?.y ?? 0 });
    }
  }

  /**
   * A woken working does its work and says its name. The name floats
   * once and no number ever does: a proc is an event in the fight, and
   * a second damage number every other second is noise, not feedback.
   */
  private runProc(
    eid: EntityId,
    player: PlayerComp,
    p: ProcEffect,
    ctx: ProcContext,
  ): number {
    const a = p.action;
    const color = ELEMENT_COLORS[p.element ?? 'arcane'];
    const style: SkillId = ctx.style ?? 'arx';
    const at = this.positions.get(eid);
    let radius = 0.6;
    let x2: number | undefined;
    let y2: number | undefined;
    let extra = 0;

    switch (a.do) {
      case 'status': {
        if (ctx.targetEid === undefined || !this.npcs.has(ctx.targetEid)) break;
        this.applyStatusToNpc(
          ctx.targetEid,
          { status: a.status, power: a.power, durationTicks: a.ticks },
          eid,
          style,
        );
        break;
      }
      case 'bolt': {
        if (ctx.targetEid === undefined || !this.npcs.has(ctx.targetEid)) break;
        const tp = this.positions.get(ctx.targetEid);
        if (at && tp) {
          x2 = tp.x;
          y2 = tp.y;
        }
        this.damageNpc(ctx.targetEid, a.damage, eid, style, { fromProc: true });
        break;
      }
      case 'nova': {
        radius = a.radius;
        for (const npcEid of this.npcsWithin(ctx.x, ctx.y, a.radius)) {
          this.damageNpc(npcEid, a.damage, eid, style, {
            knockFrom: { x: ctx.x, y: ctx.y },
            fromProc: true,
          });
        }
        break;
      }
      case 'chain': {
        // The struck foe first, then the nearest others outward — the
        // same walk the reaction table's chain effect takes.
        const hit = ctx.targetEid !== undefined && this.npcs.has(ctx.targetEid) ? [ctx.targetEid] : [];
        for (const npcEid of this.npcsWithin(ctx.x, ctx.y, CHAIN_PROC_RANGE)) {
          if (hit.length > a.jumps) break;
          if (!hit.includes(npcEid)) hit.push(npcEid);
        }
        let from = { x: ctx.x, y: ctx.y };
        for (const npcEid of hit) {
          const tp = this.positions.get(npcEid);
          if (tp) {
            this.broadcastFx({
              t: 'fx',
              kind: 'proc',
              x: from.x,
              y: from.y,
              x2: tp.x,
              y2: tp.y,
              radius: 0.4,
              color,
              // The final broadcast's `<action>:<procId>` convention —
              // a bare proc id fell back to the status shape client-side.
              id: `${a.do}:${p.id}`,
            });
            from = { x: tp.x, y: tp.y };
          }
          this.damageNpc(npcEid, a.damage, eid, style, { fromProc: true });
        }
        break;
      }
      case 'ward': {
        player.buffs.push(mkBuff({ shieldHp: a.absorb, untilTick: this.tickCount + a.ticks }));
        radius = 0.9;
        break;
      }
      case 'heal': {
        // A mend that lifts the wearer over a lowHp line re-arms the
        // workings that watch it by nature now: the crossing is read
        // from prev-vs-new health at the next wound, so no re-arm
        // call is owed here (or at any other heal site).
        const health = this.healths.get(eid);
        if (health) health.hp = Math.min(health.maxHp, health.hp + a.amount);
        break;
      }
      case 'surge': {
        const until = this.tickCount + a.ticks;
        const lift = a.pct / 100;
        player.buffs.push(
          mkBuff(
            a.stat === 'speed'
              ? { speedMult: 1 + lift, untilTick: until }
              : a.stat === 'armor'
                ? { armor: a.pct, untilTick: until }
                : a.stat === 'regen'
                  ? { regenPer4s: a.pct, untilTick: until }
                  : a.stat === 'crit'
                    ? { critPct: a.pct, untilTick: until }
                    : { dmgMult: 1 + lift, untilTick: until },
          ),
        );
        radius = 0.9;
        break;
      }
      case 'cleanse': {
        this.statuses.delete(eid);
        radius = 0.9;
        break;
      }
      case 'yield': {
        extra = a.extra;
        break;
      }
      case 'reveal': {
        radius = a.radius;
        this.revealNearby(eid, ctx, a.radius, a.of, color);
        break;
      }
    }

    this.broadcastFx({
      t: 'fx',
      kind: 'proc',
      x: ctx.x,
      y: ctx.y,
      x2,
      y2,
      radius,
      color,
      text: p.name,
      // `<action>:<procId>` — the projectile defId's `arx:<element>`
      // convention. The client shapes the moment off the ACTION so a
      // working looks right the day it is authored, and still gets to
      // override with a bespoke signature registered under either key.
      id: `${a.do}:${p.id}`,
    });
    return extra;
  }

  /** Living foes inside a circle, nearest first. */
  private npcsWithin(x: number, y: number, radius: number): EntityId[] {
    const found: Array<{ eid: EntityId; d: number }> = [];
    for (const [npcEid, npc] of this.npcs) {
      const np = this.positions.get(npcEid);
      if (!np) continue;
      const d = Math.hypot(np.x - x, np.y - y) - npc.def.radius;
      if (d <= radius) found.push({ eid: npcEid, d });
    }
    found.sort((a, b) => a.d - b.d);
    return found.map((f) => f.eid);
  }

  /**
   * A reveal working marks what is near but unseen, one mote per thing
   * and only to the wearer's own session — a working on your boots is
   * not a flare for the whole field. Capped so a rich seam cannot flood
   * the wire.
   */
  private revealNearby(
    eid: EntityId,
    ctx: ProcContext,
    radius: number,
    of: 'node' | 'chest' | 'foe',
    color: string,
  ): void {
    const session = this.players.get(eid)?.session;
    if (!session) return;
    const mark = (x: number, y: number): void => {
      session.sendJson({ t: 'fx', kind: 'proc', x, y, radius: 0.35, color, id: 'mark:reveal' });
    };
    if (of === 'foe') {
      for (const npcEid of this.npcsWithin(ctx.x, ctx.y, radius).slice(0, REVEAL_PROC_CAP)) {
        const np = this.positions.get(npcEid);
        if (np) mark(np.x, np.y);
      }
      return;
    }
    const r = Math.min(radius, REVEAL_PROC_MAX_TILES);
    const cx = Math.floor(ctx.x);
    const cy = Math.floor(ctx.y);
    let marked = 0;
    for (let ty = cy - r; ty <= cy + r && marked < REVEAL_PROC_CAP; ty++) {
      for (let tx = cx - r; tx <= cx + r && marked < REVEAL_PROC_CAP; tx++) {
        if ((tx - cx) ** 2 + (ty - cy) ** 2 > r * r) continue;
        const ground = this.world.groundAt(tx, ty);
        if (ground === undefined) continue;
        const wanted =
          of === 'node'
            ? NODES_BY_TILE.has(ground as Tile)
            : CHEST_TILES.has(ground as Tile);
        if (!wanted) continue;
        mark(tx + 0.5, ty + 0.5);
        marked++;
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
      /**
       * Damage dealt by a woken working (bolt/nova/chain). The
       * working's damage is the working's: it earns no skill or
       * vitality XP in whatever style rode the door — kill credit and
       * loot attribution still land as the wielder's.
       */
      fromProc?: boolean;
      /**
       * A companion's bite (beastcraft v2 Phase 2): attackerEid is
       * the KEEPER (so quest wounders, participation, faction deeds,
       * kill credit, and loot locks all land on the keeper for free),
       * and this flag re-aims everything that must not follow: no
       * style/vitality XP (the beastcraft trickle pays instead), no
       * assault deed, and the wounded body's eye goes to the PET.
       * Keeper-benefit sites (haste, coats, procs, lifesteal) all sit
       * behind opts.basic, which a pet blow never sets.
       */
      viaPet?: { petEid: EntityId };
    } = {},
  ): void {
    const crit = opts.crit ?? false;
    const knockbackMult = opts.knockbackMult ?? 1;
    const npc = this.npcs.get(npcEid);
    const health = this.healths.get(npcEid);
    if (!npc || !health) return;
    // THE DROVER'S PEACE: no wound ever lands on a kept yard animal.
    // Clients never offer the fight (meta.friendly), so this door is
    // the honesty backstop, quiet by design.
    if (this.livestock.has(npcEid)) return;

    // THE FANG KNOWS ITS FRIENDS, mirrored: this door is the players'
    // (and pets') door, and neither may wound a companion — friendly
    // fire is refused structurally. The mob-side rail is damagePet;
    // DoTs route there through tickStatuses.
    if (this.pets.has(npcEid)) return;

    // THE WARD: an invulnerable actor is a full combat participant
    // that cannot be worn down. The blow connects — and stops there:
    // no damage, no statuses or coats, no knockback, no haste feed,
    // no XP. The one thing that DOES land is the insult — an idle
    // guard you swing at swings back.
    if (this.actors.get(npcEid)?.actor.protection === 'invulnerable') {
      this.broadcastHit(npcEid, 0, false, 0, 0, false, true);
      if (this.npcAtPeace(npc) && npc.def.damage > 0) {
        // THE ASSAULT IS THE PEACE-BREAK: charged at the flip from
        // rest to war, never per swing — one fight, one deed. The
        // whiff-0 law holds upstream: a 0-roll still drew on the law.
        this.chargeAssault(attackerEid, npcEid);
        this.npcAggro(npcEid, npc, attackerEid, { force: true });
      }
      return;
    }

    // The rhythm engine: every landed basic pulls slots 0 and 1
    // forward. Whiffs never count — you have to CONNECT. THE QUICKENED
    // HAND: these indices are the law, not an accident — Q is the
    // quickened seat landed blows accelerate, R keeps its own time;
    // where an art sits is a build choice.
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

    if (opts.status) this.applyStatusToNpc(npcEid, opts.status, attackerEid, style, opts.viaPet !== undefined);
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
          // THE DEEPER SIGIL: the steel that landed offers its moment.
          // A crit is also a hit, so both are offered and each working
          // hears only the one it listens for.
          //
          // WHIFF-0 IS SACRED: a 0-roll drew on the law but landed
          // nothing, so it wakes no working and advances no meter. A
          // cadence that counted whiffs would be counting swings.
          if (dmg > 0) {
            const npos = this.positions.get(npcEid);
            const ctx: ProcContext = {
              x: npos?.x ?? 0,
              y: npos?.y ?? 0,
              targetEid: npcEid,
              style,
            };
            this.steelMoment(attackerEid, attacker, struck, 'hit', ctx);
            if (crit) this.steelMoment(attackerEid, attacker, struck, 'crit', ctx);
          }
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
          // THE KNIFE'S HUNGER: a landed dagger basic quickens the
          // feet — refresh, never stack (the momentum channel), and
          // the steady-speed ride mirror re-arms the predictor by
          // signature, so the burst never rubber-bands. Movement
          // identity only; the cadence contract does not blink.
          const struckStats = itemDef(struck.id)?.weapon;
          if (dmg > 0 && struckStats && isDaggerStats(struckStats)) {
            attacker.buffs = attacker.buffs.filter((b) => b.channel !== 'momentum');
            attacker.buffs.push(
              mkBuff({
                speedMult: KNIFE_HUNGER_SPEED,
                untilTick: this.tickCount + KNIFE_HUNGER_TICKS,
                channel: 'momentum',
              }),
            );
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
    // A DYING BODY TAKES NO FURTHER WOUNDS: while its own killNpc runs
    // the victim still sits in this.npcs with hp <= 0 and the entity
    // still alive, so a kill-woken working that strikes it would
    // recurse a FULL second death — loot, XP, quest credit, splits,
    // all doubled. Structural, so no future proc pairing reopens it.
    if (health.hp <= 0) return;

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

    // THE TRUCE IS HONEST: the walker's OWN landed wound on a wild
    // beast ends The Quiet Walk at once (a companion's bite is the
    // companion's — viaPet never breaks its keeper's quiet).
    if (!opts.viaPet && isWildBeast(npc.def)) {
      const walker = this.players.get(attackerEid);
      if (walker && beastTruceActive(walker, this.tickCount)) {
        for (const b of walker.buffs) {
          if (b.beastTruce) b.untilTick = this.tickCount;
        }
        walker.session?.sendJson({ t: 'chat', channel: 'system', text: 'The quiet is broken.' });
      }
    }

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
      // The quest ledger's twin write: any landed wound marks you a
      // participant in this body's death (guests included — their
      // quests live in memory).
      (npc.questWounders ??= new Set()).add(attackerEid);
      // The participation ledger: a landed wound on a garrison body
      // writes your name into the cell's fight (whiffs never count —
      // dmg <= 0 returned above). The wipe credit reads this.
      if (attacker.characterId > 0) {
        const cellKey = this.poiSpawnCells.get(npc.spawnIndex);
        if (cellKey !== undefined) {
          const live = this.poiLive.get(cellKey);
          if (live) (live.fighters ??= new Set()).add(attacker.characterId);
        }
        const shKey = this.strongholdSpawnCells.get(npc.spawnIndex);
        if (shKey !== undefined) {
          const shLive = this.strongholdLive.get(shKey);
          if (shLive) (shLive.fighters ??= new Set()).add(attacker.characterId);
        }
      }
      let credited = 0;
      if (opts.viaPet) {
        // The teeth train the beast and the bond — never the keeper's
        // schools (beastcraft is not a combat school; no half-echo).
        this.grantPetBattleXp(attackerEid, attacker, opts.viaPet.petEid, npcEid, npc, dmg);
      } else if (!opts.fromProc) {
        // THE MARK'S WORTH: the blow lands in full; only the lesson
        // draws on the mark's budget (shared/skills.ts).
        credited = this.creditMark(npc, attackerEid, dmg);
        if (credited > 0) {
          this.grantXp(attackerEid, attacker, style, credited * XP_PER_DMG_SCHOOL);
          this.grantXp(attackerEid, attacker, 'vitality', credited * XP_PER_DMG_VITALITY);
        }
      }
      // DEFEND THE HAND: the keeper's own landed blow points the
      // companion at the mark (quiet door — never re-aims a fight).
      if (!opts.viaPet) this.petDefend(attackerEid, attacker, npcEid, false);
      if (opts.backstab) {
        // The deed's flat lesson always pays; the dmg-scaled share
        // rides the same budget as the school XP it doubles.
        this.grantXp(attackerEid, attacker, 'sneak', BACKSTAB_XP_BASE + credited * 3);
      }
      // Bloodlust buffs feed one-handed wounds; a leeching weapon
      // enchant feeds every basic ITS steel lands, whatever the style.
      let steal = strikeSteal;
      if (style === 'onehand') {
        for (const b of attacker.buffs) steal = Math.max(steal, b.meleeLifesteal);
      }
      if (steal > 0) {
        const ahealth = this.healths.get(attackerEid);
        if (ahealth && ahealth.hp < ahealth.maxHp) {
          ahealth.hp = Math.min(ahealth.maxHp, ahealth.hp + Math.max(1, Math.round(dmg * steal)));
        }
      }
    }

    // Fight back! A wound interrupts any peacetime state — the
    // suspicious, the investigator, and the searcher all wheel on
    // whoever drew blood (pain outranks every meter). The blow
    // forces the aggro past any faction peace, and breaking an
    // enforcer's peace is the assault deed.
    if (this.npcAtPeace(npc) && npc.def.damage > 0) {
      if (opts.viaPet) {
        // A companion's tooth wakes the body onto the COMPANION, and
        // no assault deed charges — a beast cannot commit a crime.
        this.npcAggro(npcEid, npc, opts.viaPet.petEid, { force: true });
      } else {
        this.chargeAssault(attackerEid, npcEid);
        this.npcAggro(npcEid, npc, attackerEid, { force: true });
      }
    }

    // THE HARRY (beastcraft v2 Phase 2): when a mob has its eye on
    // the keeper, the companion's LANDED blow takes it — the decoy's
    // lesson through the one aggro door, on a flat per-mob cooldown
    // (never a player-state dial). This is the archer's whole rhythm:
    // the beast breaks for the bow, the companion cuts it off.
    if (
      opts.viaPet &&
      npc.state === 'chase' &&
      npc.targetEid === attackerEid &&
      this.tickCount >= (npc.harriedUntilTick ?? 0)
    ) {
      npc.harriedUntilTick = this.tickCount + PET_HARRY_COOLDOWN_TICKS;
      this.npcAggro(npcEid, npc, opts.viaPet.petEid, { force: true });
    }

    // The craven break: a badly hurt pack-fighter decides ONCE, at the
    // wound that drops it low, whether to steel itself or bolt for a
    // packmate still at rest. The flag is set either way — no re-roll
    // per hit, no flip-flopping mid-duel.
    if (
      health.hp > 0 &&
      npc.def.craven &&
      npc.def.pack &&
      npc.state === 'chase' &&
      !npc.helpCalled &&
      health.hp <= npc.def.maxHp * 0.35
    ) {
      npc.helpCalled = true;
      if (Math.random() < 0.5) this.npcSeekHelp(npcEid, npc);
    }

    if (health.hp <= 0) this.killNpc(npcEid, npc, attackerEid, style);
  }

  /**
   * THE MARK'S WORTH: how much of this landed damage still pays XP.
   * Allowance is priced by the mark's own xpReward (shared/skills.ts);
   * each attacker draws their own budget down independently and the
   * bank dies with the body. Returns credited damage points.
   */
  private creditMark(npc: NpcComp, attackerEid: EntityId, dmg: number): number {
    const allowance = xpMarkAllowance(npc.def.xpReward);
    const bank = (npc.xpMarks ??= new Map());
    const spent = bank.get(attackerEid) ?? 0;
    const credited = Math.min(dmg, allowance - spent);
    if (credited <= 0) return 0;
    bank.set(attackerEid, spent + credited);
    return credited;
  }

  private killNpc(npcEid: EntityId, npc: NpcComp, killerEid: EntityId, style?: SkillId): void {
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
      // THE MARK'S WORTH: the felling pays the school its share of the
      // body's price, so finishing a fight always outpays parking on a
      // sponge. Exempt from the mark budget (it IS the threat payout);
      // a DoT tail arrives styleless and pays none (not a struck blow).
      if (style && isCombatSchool(style)) {
        this.grantXp(killerEid, killer, style, Math.round(npc.def.xpReward * XP_KILL_SCHOOL_FRAC));
      }
      // Battle Rush: each kill feeds the next chase.
      if (this.hasPassive(killer, 'battle_rush')) {
        killer.buffs.push(mkBuff({ speedMult: 1.25, untilTick: this.tickCount + 50 }));
      }
      // On-kill haste (Battlecharged etc.): victory shaves the Q/E
      // slots — THE QUICKENED HAND's second engine, same index law as
      // the on-hit site above.
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
      // THE DEEPER SIGIL: the kill is a moment for the body's workings.
      // The corpse is still on the ground here, so a working that
      // bursts does so where the foe fell.
      this.bodyMoment(killerEid, killer, 'kill', {
        x: pos.x,
        y: pos.y,
        style: style ?? 'onehand',
      });
      // The companion that fought this mark shares the fall on its
      // OWN ladder (beastcraft v2) — the keeper's credit above is
      // untouched; the beast's growth is the beast's.
      if (killer.petEid) {
        const kPet = this.pets.get(killer.petEid);
        const kRow = kPet ? killer.pets?.find((p) => p.slot === kPet.slot) : undefined;
        if (kPet && kRow && kPet.target === npcEid) {
          this.grantPetXp(killer, kPet, kRow, Math.round(npc.def.xpReward * PET_KILL_XP_FRAC));
          kPet.target = null;
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
    // THE THINNER PURSE: a delve's rank-and-file pay at a fraction —
    // the halls hold far more bodies than the open field and none of
    // them restaff mid-run, so the per-kill purse thins to keep the
    // per-run take honest. Named keepers (the boss, the wardens) and
    // the chest ladder pay in full; this is a source dial, never a
    // player-state one (the flood law).
    const trashDamp =
      pos.y >= DUNGEON_MIN_Y && this.spawnPoints[npc.spawnIndex]?.name === undefined
        ? GameServer.DUNGEON_TRASH_LOOT_MULT
        : 1;
    for (const tableId of npc.def.loot) {
      for (const drop of rollLoot(tableId, {
        level: npc.def.level,
        rand: Math.random,
        chanceMult: trashDamp,
      })) {
        dropLoot(drop.item, drop.qty, drop.roll);
      }
    }

    // Quest credit pays the whole fight: the killer and everyone whose
    // landed wound touched the body (the participation law). The
    // quest-drop side channel rolls per participant, capped by each
    // pack's live count — the loot tables above never learn any of it.
    const participants = new Map<EntityId, PlayerComp>();
    if (killer) participants.set(killerEid, killer);
    for (const weid of npc.questWounders ?? []) {
      const p = this.players.get(weid);
      if (p) participants.set(weid, p);
    }
    for (const p of participants.values()) this.creditQuestEvent(p, 'kill', npc.def.id);
    this.rollQuestDrops(npc, pos.x, pos.y, participants);
    // THE SLAY DEED: a faction member's death marks every hand in it
    // (the same participation law), through the one door — and the
    // border law pays first blood against an enemy exactly once.
    const slainFid = this.npcFactionOf(npcEid, npc);
    if (slainFid !== null) {
      for (const p of participants.values()) this.creditDeed(p, slainFid, 'slayMember');
    }

    const spawn = this.spawnPoints[npc.spawnIndex];
    if (spawn) {
      spawn.eid = null;
      if (spawn.y >= DUNGEON_MIN_Y) {
        // THE CLEARED HALL STAYS CLEARED: a delve garrison never
        // restaffs while the instance lives. Ground you win stays won —
        // the run is a clear, not a race against the clock. Leaving
        // tears the instance down, and turning the key again cuts it
        // fresh; that re-cut is the one reset.
        spawn.respawnAt = Number.POSITIVE_INFINITY;
      } else {
        // POI garrisons refill on a slow clock: the bestiary's 15–40s
        // beats suit open-field hunting, but a camp that restaffs while
        // you fight it can never be wiped — the floor buys the clear.
        const baseSec = NPCS.get(spawn.npc)!.respawnSec;
        // Find whispers share the floor: a two-body find whose first
        // body restaffs mid-fight could never be wiped either.
        const sec =
          this.poiSpawnCells.has(npc.spawnIndex) || this.minorSpawnSlots.has(npc.spawnIndex)
            ? Math.max(baseSec, GameServer.POI_RESPAWN_MIN_SEC)
            : baseSec;
        spawn.respawnAt = Date.now() + sec * 1000;
      }
      this.noteHoldWing(npc.spawnIndex, killerEid);
      this.noteStrongholdKill(npc.spawnIndex, killerEid);
      this.notePoiKill(npc.spawnIndex, killerEid);
      this.noteMinorKill(npc.spawnIndex);
      // THE UNWRITTEN PAGE: felling a delve's named boss (the only
      // named spawn a dungeon seeds) is the riftwalker's deed.
      if (spawn.name !== undefined && pos.y >= DUNGEON_MIN_Y) {
        const killer = this.players.get(killerEid);
        if (killer) this.grantArt(killer, 'riftwalker_step');
      }
    }
    // THE UNWRITTEN PAGE: felling a champion with the wall still on
    // your arm is the shield-bearer's deed; felling one with great
    // steel in both fists is the colossus's; felling one with a blade
    // in EACH fist is the twin school's (any *_champion, so future
    // champions swear in automatically — one kill never earns two
    // pages, since the hands disagree: a shield offhand, a weapon
    // offhand, and a two-handed main exclude each other).
    if (npc.def.id.endsWith('_champion')) {
      const killer = this.players.get(killerEid);
      if (killer && this.equippedShield(killer)) this.grantArt(killer, 'champions_wall');
      if (killer && this.equippedWeapon(killer)?.weapon.style === 'twohand') {
        this.grantArt(killer, 'giantsfall');
      }
      if (killer && this.offhandWeapon(killer)) this.grantArt(killer, 'two_answers');
      // THE UNWRITTEN PAGE: a champion felled by the arx hand while
      // winter is already on it is the winter-caller's deed — winter
      // takes what winter marked. (The dying body's statuses stand
      // until the death's clean slate, so the chill is still readable.)
      if (killer && style === 'arx' && this.isChilled(npcEid)) {
        this.grantArt(killer, 'winters_fall');
      }
      // THE FOUR ROADS: the veteran's deed — a champion felled by a
      // struck killing blow from each of the four weapon schools.
      // Progress rides road: flags (deeds, never dice) and is keyed by
      // the blow's own school, so it composes freely with the
      // hand-state pages above; the page fills on the fourth road.
      if (
        killer &&
        (style === 'onehand' || style === 'twohand' || style === 'archery' || style === 'arx') &&
        !killer.flags.has(artFlag('four_roads')) &&
        !killer.flags.has(`road:${style}`)
      ) {
        this.setPlayerFlag(killer, `road:${style}`);
        const ROADS: readonly SkillId[] = ['onehand', 'twohand', 'archery', 'arx'];
        const walked = ROADS.filter((r) => killer.flags.has(`road:${r}`)).length;
        if (walked >= ROADS.length) {
          this.grantArt(killer, 'four_roads');
        } else {
          const word =
            style === 'onehand'
              ? 'one blade'
              : style === 'twohand'
                ? 'both hands'
                : style === 'archery'
                  ? 'the string'
                  : 'the staff';
          killer.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `A champion felled by ${word}. ${walked} of four roads walked.`,
          });
        }
      }
    }
    this.wildBodies.delete(npcEid);
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
            // Children are born INTO the fight the parent died in.
            this.npcAggro(childEid, child, killerEid, { force: true });
          }
        }
      }
    }
  }

  private damagePlayer(
    eid: EntityId,
    raw: number,
    opts: {
      status?: StatusApply;
      pierceArmor?: boolean;
      sourceEid?: EntityId;
      /** Attacker's level — feeds armor-class piercing (default 1). */
      attackerLevel?: number;
    } = {},
  ): void {
    const player = this.players.get(eid);
    const health = this.healths.get(eid);
    if (!player || !health) return;

    // Getting hit blows your cover even if armor soaks the damage to 0 —
    // and it must land before NPC retaliation picks a target.
    if (raw > 0) this.revealPlayer(eid, player);
    // A blow breaks any conversation — the cinematic frame drops with it.
    if (raw > 0 && player.dialogue) this.dialogueClose(player);

    const defLevel = this.effectiveLevel(player, 'defence');
    // THE RAISED WALL: only an offhand shield held in the fist counts.
    const shieldUp = this.equippedShield(player);
    // The gear cache already sums rolled armor (rarity-scaled) plus
    // legacy flat armor — the per-hit loop over worn items is gone.
    // Bulwark answers only a planted stance: armor for held ground; the
    // tank stances lend buff armor; the raised wall lends its trained
    // craft (and Shieldarm's answered iron) only while the shield is up.
    let buffArmor = 0;
    let reflectFrac = 0;
    for (const b of player.buffs) {
      buffArmor += b.armor;
      reflectFrac = Math.max(reflectFrac, b.reflectFrac);
    }
    // War Footing is Bulwark's mirror: one boundary, two callings —
    // planted ground answers to Bulwark, everything else is the march.
    const armor =
      player.gear.armor +
      buffArmor +
      (player.stillTicks >= STILL_ARMOR_TICKS
        ? player.perks.stillArmor
        : player.perks.marchArmor) +
      (shieldUp
        ? player.perks.shieldArm +
          this.effectiveLevel(player, 'shield') * SHIELD_ARMOR_PER_LEVEL
        : 0);
    // THE THREAT LAW mitigation: percentage armor class from trained
    // defence + worn armor, pierced by the attacker's level. DoTs skip
    // it entirely — the wound is already inside the armor.
    let dmg = opts.pierceArmor
      ? raw
      : mitigate(raw, defLevel, armor, opts.attackerLevel ?? 1);

    // THE WALL'S LESSON: what gets through trains the flesh (below);
    // what the wall stops trains the wall. DoTs teach nothing here and
    // whiff-0 stays sacred — only a real blow, really turned, counts.
    if (shieldUp && raw > 0 && !opts.pierceArmor) {
      if (player.skills.shield === undefined) {
        // THE DISCOVERED WALL: the first real blow on a raised shield
        // reveals the craft (the dualwield discovery rail).
        player.skills.shield = 0;
        this.grantXp(eid, player, 'shield', 1);
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: HIDDEN_SKILLS.shield!.discovery,
        });
      }
      const blocked = raw - dmg;
      if (blocked > 0) {
        this.grantXp(eid, player, 'shield', blocked * 3);
        // THE DEEPER SIGIL: a real bite turned is a moment. Gated on
        // the same `blocked > 0` the wall's own lesson uses, so a
        // working can never answer a blow the shield never met.
        const bp = this.positions.get(eid);
        this.bodyMoment(eid, player, 'block', {
          x: bp?.x ?? 0,
          y: bp?.y ?? 0,
          targetEid: opts.sourceEid,
          style: 'shield',
        });
        // The rim spark — throttled so a mob's flurry doesn't strobe.
        if (blocked >= 2 && this.tickCount - player.lastBlockFxTick >= 8) {
          player.lastBlockFxTick = this.tickCount;
          const ppos = this.positions.get(eid);
          const spos =
            opts.sourceEid !== undefined ? this.positions.get(opts.sourceEid) : undefined;
          if (ppos) {
            this.broadcastFx({
              t: 'fx',
              kind: 'block',
              x: ppos.x,
              y: ppos.y,
              radius: Math.min(0.85, 0.35 + blocked * 0.03),
              dir: spos ? Math.atan2(ppos.y - spos.y, ppos.x - spos.x) : undefined,
              id: 'shield_block',
            });
          }
        }
      }
    }
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

    // A wound that reached flesh breaks the tend — kneeling hands
    // need an unbloodied keeper. The tame channel deliberately
    // survives keeper blood: standing through the teeth IS the test
    // (THE WILD ANSWERS THE CALL).
    if (player.action?.kind === 'tend') {
      this.cancelAction(eid, player, 'hurt');
    }

    // DEFEND THE HAND, the urgent door: whatever just drew the
    // keeper's blood takes the companion's teeth, current mark or no.
    if (opts.sourceEid !== undefined) this.petDefend(eid, player, opts.sourceEid, true);

    health.hp -= dmg;
    this.grantXp(eid, player, 'defence', dmg * 3);
    // THE DEEPER SIGIL: a wound that reached flesh is a moment (whiff-0
    // and fully-soaked blows are already gone above), and the new
    // health may have carried the wearer past a lowHp line.
    {
      const wp = this.positions.get(eid);
      const ctx: ProcContext = {
        x: wp?.x ?? 0,
        y: wp?.y ?? 0,
        targetEid: opts.sourceEid,
        style: 'defence',
      };
      this.bodyMoment(eid, player, 'hurt', ctx);
      this.lowHpMoment(eid, player, health.hp + dmg);
    }
    // THE TURNED BLOW: the stance sends part of what landed back to
    // whoever sent it, dealt in the shield school (the wall's own
    // damage trains the wall — and credits the kill). Armor-piercing
    // damage (DoT pulses) is never a blow the wall met, so it can
    // never be turned — the wound is already inside the armor.
    if (
      reflectFrac > 0 &&
      !opts.pierceArmor &&
      opts.sourceEid !== undefined &&
      this.npcs.has(opts.sourceEid)
    ) {
      const back = Math.round(dmg * reflectFrac);
      if (back > 0) this.damageNpc(opts.sourceEid, back, eid, 'shield');
    }
    // A landed blow ends the rest — and tips a sleeper out of bed.
    // It unhorses the rider too: getting caught mounted is the cost
    // of riding through danger; speed is the defense, not the saddle.
    const hitPos = this.positions.get(eid);
    if (hitPos) this.standUp(eid, player, hitPos);
    else player.sitting = player.lying = false;
    this.dismount(eid, player);
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
      // THE HEARTH WATCH's mercy: falling to the very camp that covets
      // YOUR claim stamps the shorter quiet — losses earn mercy, never
      // a chain-raid (the RimWorld adaptation, simplified).
      if (player.characterId > 0 && opts.sourceEid !== undefined) {
        const src = this.npcs.get(opts.sourceEid);
        const cellKey = src ? this.poiSpawnCells.get(src.spawnIndex) : undefined;
        const rrow = cellKey !== undefined ? this.poiLedger.get(cellKey) : undefined;
        if (GameServer.hearthOwnerOf(rrow?.originCell) === player.characterId) {
          const until = Date.now() + FRONTIER.raidLossCooldownMs;
          player.raidCalmUntil = Math.max(player.raidCalmUntil, until);
          this.accounts.saveRaidCalm(player.characterId, until);
        }
      }
      const pos = this.positions.must(eid);
      // THE PACK SPILLS: everything carried hits the ground where you
      // fell, unclaimed from the first beat — the fallen can walk back
      // for it, and so can anyone else. Worn gear stays on the body,
      // so the kit survives and the pack is the stake. A rift death
      // spills at the surface gate instead: a pile on the rift floor
      // would be a locked room (the key that opens it is IN the pack,
      // and teardown orphans the band).
      const inst = pos.y >= 8192 ? this.dungeonAt(Math.floor(pos.x), Math.floor(pos.y)) : null;
      const spillAt = inst
        ? inst.ownerId === player.characterId
          ? inst.ownerReturn
          : (inst.guests.get(player.characterId) ?? this.world.spawn)
        : { x: pos.x, y: pos.y };
      const parcels = spillInventory(player.inventory);
      if (parcels.length > 0) {
        const spillNow = Date.now();
        const scatter = () => (Math.random() - 0.5) * 0.8;
        for (const parcel of parcels) {
          this.placeDrop(parcel.item, parcel.qty, spillAt.x + scatter(), spillAt.y + scatter(), {
            ownerEid: null,
            ownerUntil: 0,
            despawnAt: spillNow + DEATH_SPILL_TTL_MS,
            pickupAfter: spillNow + 400,
            roll: parcel.roll,
            ...(parcel.stolen ? { stolen: true as const } : {}),
          });
        }
        player.session?.sendJson({ t: 'inv', slots: player.inventory });
        // THE STONE REMEMBERS: a little gravestone stands over the
        // spill for its quarter hour — world dressing anyone can see
        // (a fresh stone advertises fresh loot; that's the game).
        // One stone per soul: a fresh fall retires the old marker.
        const oldGrave = this.graveByChar.get(player.characterId);
        if (oldGrave !== undefined && this.graves.has(oldGrave)) {
          this.removeFromChunks(oldGrave);
          this.ecs.destroy(oldGrave);
        }
        const graveEid = this.ecs.create();
        this.kinds.set(graveEid, EntityKind.Prop);
        // The stone stands at the HEAD of the spill, north of the
        // pile, so the y-sort keeps the goods at its foot instead of
        // burying the marker under its own loot icons.
        this.positions.set(graveEid, { x: spillAt.x, y: spillAt.y - 0.65, dir: 0 });
        this.graves.set(graveEid, {
          name: player.name,
          despawnAt: spillNow + DEATH_SPILL_TTL_MS,
        });
        this.graveByChar.set(player.characterId, graveEid);
        this.updateChunkMembership(graveEid);
        // The walk-back beacon: a skull on the owner's chart, cleared
        // when they arrive (tickDrops), expire, or fall again.
        this.deathMarks.set(player.characterId, {
          x: spillAt.x,
          y: spillAt.y,
          until: spillNow + DEATH_SPILL_TTL_MS,
        });
        player.session?.sendJson({
          t: 'deathmark',
          mark: { x: spillAt.x, y: spillAt.y, remainMs: DEATH_SPILL_TTL_MS },
        });
      }
      // The claimed home bed answers first; everyone else wakes at the
      // nearest settled spawn — with one hearth in the world that's
      // the Waking Ring; future settlements shorten the walk back.
      const bedside = this.homeBedside(player);
      const spawn = bedside ?? this.world.respawnAt(pos.x, pos.y);
      pos.x = spawn.x;
      pos.y = spawn.y;
      health.hp = health.maxHp;
      this.statuses.delete(eid); // death is at least a clean slate
      player.buffs = [];
      resetCombo(player.combo); // no string survives the fall
      player.pendingStrike = null; // nor does a blow in flight
      this.dismount(eid, player); // nobody wakes up in the saddle
      this.updateChunkMembership(eid);
      // The friend follows home, unharmed: the pack spills, the
      // companion does not (THE FALL IS NEVER THE END — it is part
      // of the kind hands that carried you). A friend DOWN when its
      // keeper falls makes its own slower way: the limp home.
      if (player.petEid !== null) {
        if ((this.healths.get(player.petEid)?.hp ?? 0) <= 0) {
          this.petLimpsHome(player);
        } else {
          const petPos = this.positions.get(player.petEid);
          if (petPos) {
            petPos.x = spawn.x + 0.9;
            petPos.y = spawn.y + 0.4;
            this.updateChunkMembership(player.petEid);
          }
        }
      }
      this.cancelAction(eid, player);
      this.cancelCasting(eid, player); // a dying body draws no breath
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: bedside
          ? 'You went down. Kind hands carried you home to your own bed.'
          : 'You went down. Kind hands carried you back to the nearest hearth.',
      });
      if (parcels.length > 0) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: inst
            ? 'Your pack spilled at the riftgate on the way out. It lies there a quarter hour, for whoever finds it first.'
            : 'Your pack spilled where you fell. It lies there a quarter hour, for whoever finds it first.',
        });
      }
      // The spill is real the moment it happens: write the emptied
      // pack now, so quitting on the death screen keeps nothing.
      this.savePlayer(eid);
    }
  }

  private broadcastHit(
    eid: EntityId,
    dmg: number,
    crit = false,
    kx = 0,
    ky = 0,
    backstab = false,
    immune = false,
  ): void {
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
          im: immune || undefined,
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
    const hours = clockHoursAtTick(this.tickCount, this.timeOfsTicks);
    // Hour-window keeping runs on a slow beat: out-of-window standing
    // bodies slip away only when nothing is watching (idle, no player
    // within earshot) — a nocturnal hunter never blinks out mid-fight
    // or in front of someone.
    if (this.tickCount % 20 === 0) this.keepSpawnHours(hours);
    for (let i = 0; i < this.spawnPoints.length; i++) {
      const spawn = this.spawnPoints[i]!;
      if (!spawn.active || spawn.eid !== null || spawn.respawnAt > now) continue;
      if (spawn.hours && !slotContains(spawn.hours.from, spawn.hours.to, hours)) continue;
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
      spawn.eid = this.spawnNpc(def, x, y, i, spawn.patrol);
    }

    // Placed actors stand back up the same way beasts do.
    for (let i = 0; i < this.actorSpawnPoints.length; i++) {
      const spawn = this.actorSpawnPoints[i]!;
      if (!spawn.active || spawn.eid !== null || spawn.respawnAt > now) continue;
      const def = this.actorDefs.get(spawn.actor);
      if (!def) continue;
      spawn.eid = this.spawnActor(def, spawn.x, spawn.y, i, spawn.dir, spawn.routine);
    }
  }

  /**
   * The clock's half of activity windows: standing bodies whose
   * window has closed leave the world — but only with dignity. A body
   * in combat keeps fighting; a body with a player within earshot
   * waits for the road to clear; everyone else steps off between one
   * glance and the next.
   */
  private keepSpawnHours(hours: number): void {
    for (const spawn of this.spawnPoints) {
      if (!spawn.hours || !spawn.active || spawn.eid === null) continue;
      if (slotContains(spawn.hours.from, spawn.hours.to, hours)) continue;
      const eid = spawn.eid;
      const npc = this.npcs.get(eid);
      if (!npc || npc.state !== 'idle') continue;
      const pos = this.positions.get(eid);
      if (pos && this.playerWithin(pos.x, pos.y, 20)) continue;
      this.removeFromChunks(eid);
      this.ecs.destroy(eid);
      spawn.eid = null;
      spawn.respawnAt = 0;
    }
  }

  /** Any connected player within `r` tiles of a point? */
  private playerWithin(x: number, y: number, r: number): boolean {
    for (const [eid, player] of this.players) {
      if (player.session === null && player.disconnectedAt !== null) continue;
      const pos = this.positions.get(eid);
      if (pos && Math.hypot(pos.x - x, pos.y - y) <= r) return true;
    }
    return false;
  }

  // --------------------------------------------- wilderness ambience

  /** Live ambient bodies (spawnIndex -1) and the roster window each
   * came in on; killNpc and the despawn pass prune it. */
  private readonly wildBodies = new Map<EntityId, { from: number; to: number } | null>();

  /** Ambient spawns keep this far out / this near a player (tiles). */
  private static readonly WILD_MIN_R = 34;
  private static readonly WILD_MAX_R = 56;
  /** Beyond this from every player an ambient body slips away. */
  private static readonly WILD_DESPAWN_R = 100;

  /**
   * The space between POIs breathes: near each player in the open
   * frontier, keep a small budget of ambient wildlife rolled from
   * WILD_ROSTER — biome- and clock-gated, tier-leveled, spawned in
   * the just-offscreen annulus with no respawn record, and gone again
   * once nobody is near. Ambience, not geography: deliberately
   * non-deterministic, never persisted, never a landmark.
   */
  private tickWildSpawns(): void {
    const hours = clockHoursAtTick(this.tickCount, this.timeOfsTicks);
    // Despawn first: a body no one is near stops existing — and a
    // creature whose hours have passed slips away with the same
    // dignity the garrison keeps (idle, nobody within earshot). A
    // stag never grazes at midnight, and it never vanishes in front
    // of anyone either.
    for (const [eid, window] of this.wildBodies) {
      if (!this.ecs.isAlive(eid)) {
        this.wildBodies.delete(eid);
        continue;
      }
      const pos = this.positions.get(eid);
      if (!pos) continue;
      const farGone = !this.playerWithin(pos.x, pos.y, GameServer.WILD_DESPAWN_R);
      const overstayed =
        window !== null &&
        !slotContains(window.from, window.to, hours) &&
        this.npcs.get(eid)?.state === 'idle' &&
        !this.playerWithin(pos.x, pos.y, 20);
      if (!farGone && !overstayed) continue;
      this.removeFromChunks(eid);
      this.ecs.destroy(eid);
      this.wildBodies.delete(eid);
    }
    for (const [peid, player] of this.players) {
      if (player.session === null) continue;
      const ppos = this.positions.get(peid);
      if (!ppos || ppos.y >= DARK_BAND_Y) continue;
      const tier = this.liveDangerTier(Math.floor(ppos.x), Math.floor(ppos.y));
      if (tier === 0) continue; // settled land keeps only authored life
      const law = dangerLaw(tier);
      // THE HERD AND THE PACK (lived-in-land Phase 1): the budget is
      // counted in BODIES and spent in KNOTS — wildBudgetBase is a
      // frontier dial, wildDensity stays the one law's per-tier word.
      const budget = Math.round(FRONTIER.wildBudgetBase * law.wildDensity);
      if (budget <= 0) continue;
      let near = 0;
      for (const eid of this.wildBodies.keys()) {
        const pos = this.positions.get(eid);
        if (pos && Math.hypot(pos.x - ppos.x, pos.y - ppos.y) <= GameServer.WILD_MAX_R + 24) near++;
      }
      if (near >= budget) continue;
      // A few anchor probes per pass; the FIRST lawful one deals one
      // whole knot and the pass ends. The wilds fill in over tens of
      // seconds, never in a visible burst — but a run of unlucky
      // probes no longer starves a whole pass the way the old single
      // attempt did.
      // THE DEN IS THE SOURCE (lived-in-land Phase 2): when an
      // uncleared habitat find stands in the annulus, half the deals
      // muster the MATCHING kind at its mouth — wolves from the den,
      // herds in the glade, the dead around the barrow. The other
      // half (and every miss) still deals anywhere lawful, so habitat
      // reads as a lean, never a cage.
      let dealt = false;
      if (Math.random() < 0.5) {
        dealt = this.spawnHabitatKnot(ppos.x, ppos.y, hours, budget - near);
      }
      if (!dealt) {
        const probes = Math.max(1, FRONTIER.wildKnotProbes);
        for (let probe = 0; probe < probes; probe++) {
          const spot = this.probeWildAnchor(ppos.x, ppos.y);
          if (!spot) continue;
          this.spawnWildKnot(spot.tx, spot.ty, spot.tier, spot.biome, hours, budget - near);
          break;
        }
      }
    }
  }

  /**
   * Muster one knot at a standing habitat find inside the offscreen
   * annulus. The find only steers WHERE and WHICH KIND — every ground
   * guard, the budget cap, and the tier law hold exactly as for any
   * other deal. Returns false when no mouth stands in reach, the
   * ground refuses, or the roster has no matching entry (the caller
   * falls through to the ordinary probes).
   */
  private spawnHabitatKnot(px: number, py: number, hours: number, cap: number): boolean {
    const near: Array<{ habitat: string; x: number; y: number }> = [];
    for (const f of this.habitatFinds.values()) {
      const d = Math.hypot(f.x - px, f.y - py);
      // Offscreen law holds at the mouth too: a den in view never
      // bursts; one just past the screen's edge does the haunting.
      if (d >= GameServer.WILD_MIN_R && d <= GameServer.WILD_MAX_R + 16) near.push(f);
    }
    if (near.length === 0) return false;
    const mouth = near[Math.floor(Math.random() * near.length)]!;
    for (let t = 0; t < 4; t++) {
      const a = Math.random() * Math.PI * 2;
      const d = 2 + Math.random() * 3;
      const tx = Math.floor(mouth.x + Math.cos(a) * d);
      const ty = Math.floor(mouth.y + Math.sin(a) * d);
      const spot = this.vetWildAnchor(tx, ty);
      if (!spot) continue;
      return (
        this.spawnWildKnot(tx, ty, spot.tier, spot.biome, hours, cap, mouth.habitat) > 0
      );
    }
    return false;
  }

  /**
   * One anchor candidate in the just-offscreen annulus, or null when
   * the roll lands somewhere the law refuses. Every guard the old
   * single-attempt spawner enforced, unchanged: open natural grass
   * (keeps ambient life out of camps, ruins, and anything authored),
   * off the traveled roads (ROAD_CALM — a tier-4 road is quiet, never
   * safe), out of claimed yards (THE EXCLUSION LAW), and on a spot the
   * danger field itself reads as wild.
   */
  private probeWildAnchor(
    px: number,
    py: number,
  ): { tx: number; ty: number; tier: number; biome: 'grass' | 'forest' } | null {
    const ang = Math.random() * Math.PI * 2;
    const r =
      GameServer.WILD_MIN_R + Math.random() * (GameServer.WILD_MAX_R - GameServer.WILD_MIN_R);
    const tx = Math.floor(px + Math.cos(ang) * r);
    const ty = Math.floor(py + Math.sin(ang) * r);
    const spot = this.vetWildAnchor(tx, ty);
    return spot ? { tx, ty, ...spot } : null;
  }

  /** The anchor guard ladder on explicit coords (habitat deals share it). */
  private vetWildAnchor(
    tx: number,
    ty: number,
  ): { tier: number; biome: 'grass' | 'forest' } | null {
    if (ty >= DARK_BAND_Y) return null;
    const ground = this.world.groundAt(tx, ty);
    if (ground !== Tile.Grass && ground !== Tile.GrassTall) return null;
    const spotTier = this.liveDangerTier(tx, ty);
    if (spotTier === 0) return null;
    if (roadDistanceAt(config.worldSeed, tx, ty) <= ROAD_CALM) return null;
    // THE CAPITAL LAW: no ambient knot grazes a capital's yard.
    if (capitalMasked(tx, ty, 1, 1, this.capitalRects())) return null;
    if (this.inClaimRing(tx, ty)) return null;
    const biome = groundProbeAt(config.worldSeed, tx, ty);
    if (biome !== 'grass' && biome !== 'forest') return null;
    return { tier: spotTier, biome };
  }

  /**
   * Deal one knot at a lawful anchor: roll the roster, compose the
   * bodies (THE KNOT LAW — the shape is content's, pure and tested),
   * and stand them inside the entry's spread so the far edge of the
   * knot still hears the anchor's cry. `cap` is the remaining body
   * budget; partial knots stand, an empty one never does.
   */
  private spawnWildKnot(
    tx: number,
    ty: number,
    spotTier: number,
    biome: 'grass' | 'forest',
    hours: number,
    cap: number,
    /** Habitat deal: only entries of this habitat may muster here. */
    habitat?: string,
  ): number {
    let candidates = wildCandidates(spotTier, biome, hours);
    if (habitat !== undefined) candidates = candidates.filter((e) => e.habitat === habitat);
    // THE TERRITORY LEAN (Phase 5): wolf knots run thicker in wolfkin
    // country, the dead walk their own barrows — the same one atlas
    // the site and find picks read (the def roster's families).
    candidates = leanWild(
      candidates,
      territoryAt(config.worldSeed, tx, ty, familiesOf([...POI_DEFS.values()])),
      FRONTIER.territoryBias,
    );
    const entry = pickWild(candidates, Math.random());
    if (!entry) return 0;
    const bodies = composeKnot(entry, Math.random(), cap);
    const spread = entry.spread ?? WILD_KNOT_SPREAD;
    const [bandMin, bandMax] = dangerLaw(spotTier).npcLevel;
    let placed = 0;
    for (const body of bodies) {
      const base = NPCS.get(body.npc);
      if (!base) continue;
      // The lead takes the anchor tile; the rest scatter through the
      // spread disc, each probing for open natural ground — a member
      // with no footing simply stays home (partial knots stand).
      let bx = tx;
      let by = ty;
      if (placed > 0) {
        let found = false;
        for (let attempt = 0; attempt < 8; attempt++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random() * spread;
          const cx = Math.floor(tx + Math.cos(a) * d);
          const cy = Math.floor(ty + Math.sin(a) * d);
          const g = this.world.groundAt(cx, cy);
          if (g !== Tile.Grass && g !== Tile.GrassTall) continue;
          // THE CLIFF-FOOT LAW: the pack stands on ONE shelf — a member
          // scattered across a level change spawns on the far side of an
          // unwalkable fence, stranded from its knot.
          if (this.world.naturalLevel(cx, cy) !== this.world.naturalLevel(tx, ty)) continue;
          bx = cx;
          by = cy;
          found = true;
          break;
        }
        if (!found) continue;
      }
      // The band lifts what it must: a tier-4 wolf is a dire threat,
      // but a stag never becomes one — prey keeps its authored level.
      // The SPOT's law, not the player's: a jitter pocket of calmer
      // ground grows calmer beasts, exactly as the field reads there.
      // A lead CLAMPS into the band both ways (busier, never deadlier:
      // a dire wolf heading a calm-pocket pack walks the pocket's law).
      let def = base;
      if (base.aggroRange > 0) {
        if (body.lead) {
          const lvl = Math.min(bandMax, Math.max(bandMin, base.level));
          if (lvl !== base.level) def = scaleNpcDef(base, lvl);
        } else if (base.level < bandMin) {
          def = scaleNpcDef(base, bandMin + (Math.floor(Math.random() * 3) - 1));
        }
      }
      const eid = this.spawnNpc(def, bx + 0.5, by + 0.5, -1);
      this.wildBodies.set(eid, entry.hours ?? null);
      placed++;
    }
    return placed;
  }

  /**
   * Materialize one NPC at a point. spawnIndex -1 = ephemeral (slime
   * halves, dev-spawned): killNpc's spawn-point lookup finds nothing and
   * schedules no respawn.
   */
  private spawnNpc(
    def: NpcDef,
    x: number,
    y: number,
    spawnIndex: number,
    patrol?: ReadonlyArray<{ x: number; y: number }>,
  ): EntityId {
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
      nextProduceAt: 0,
      holdUntilTick: 0,
      nextLayAt: def.lays
        ? Date.now() + (def.lays.minSec + Math.random() * (def.lays.maxSec - def.lays.minSec)) * 1000
        : 0,
      steer: newSteerMemory(),
      navBest: Infinity,
      navStuck: 0,
      navRefX: Infinity,
      navRefY: Infinity,
      noAggroUntilTick: 0,
      helpEid: null,
      helpUntilTick: 0,
      helpCalled: false,
      alert: 0,
      alertEid: null,
      alertX: 0,
      alertY: 0,
      alertVelX: 0,
      alertVelY: 0,
      alertSeenTick: 0,
      huntUntilTick: 0,
      huntWps: null,
      huntIdx: 0,
      huntWaitUntilTick: 0,
      standTicks: 0,
      nav: null,
      progressLane: null,
      nextRepathTick: 0,
      losClear: false,
      losUntilTick: 0,
      losGoalX: Infinity,
      losGoalY: Infinity,
      patrol:
        patrol && patrol.length >= 2
          ? { pts: patrol, idx: 0, waitUntilTick: 0 }
          : undefined,
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
    routine?: string,
  ): EntityId {
    const eid = this.ecs.create();
    // No authored facing: south-ish, but SCATTERED — a seeded ±~50°
    // per placement so a street of townsfolk stands like people, not
    // a rank on parade. Seeded by the spawn slot, so the same body
    // keeps the same habitual stance across respawns and restarts.
    const seed = Math.sin((spawnIndex + 3) * 12.9898) * 43758.5453;
    const homeDir = dir ?? Math.PI / 2 + (seed - Math.floor(seed) - 0.5) * 1.8;
    this.kinds.set(eid, EntityKind.Npc);
    this.positions.set(eid, { x, y, dir: homeDir });
    this.poses.set(eid, PoseState.Idle);
    this.actors.set(eid, {
      actor,
      spawnIndex,
      homeDir,
      restDir: homeDir,
      gazeDir: homeDir,
      nextGazeTick: 0,
      nextLine: 0,
      mount: null,
    });
    // The daily life rides its own comp: slot -2 forces a schedule
    // resolve on the very first tick, so a respawn (or a boot at any
    // hour) walks straight to wherever the day says this body belongs.
    const routineDef = routine !== undefined ? this.routineDefs.get(routine) : undefined;
    if (routineDef) {
      this.routines.set(eid, {
        def: routineDef,
        anchorX: x,
        anchorY: y,
        slot: -2,
        wpIndex: 0,
        wpDir: 1,
        phase: 'travel',
        targetX: x,
        targetY: y,
        lingerUntilTick: 0,
        pauseUntilTick: 0,
        stuckTicks: 0,
        progressBest: Infinity,
        steer: newSteerMemory(),
        nav: null,
        progressLane: null,
        nextRepathTick: 0,
        losClear: false,
        losUntilTick: 0,
        losGoalX: Infinity,
        losGoalY: Infinity,
        holdFacing: false,
        seat: null,
      });
    }
    // The untargetable switch works BY CONSTRUCTION: no combat body,
    // so no damage loop, projectile sweep, or blast radius can even
    // see this entity — attacks pass straight through, exactly the
    // mechanism that already guards friendly actors. The authored
    // combat block stays on the def, dormant, for tooling to re-arm.
    const combatDef = actor.protection === 'untargetable' ? null : actorCombatDef(actor);
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
        nextProduceAt: 0,
        holdUntilTick: 0,
        nextLayAt: 0,
        steer: newSteerMemory(),
        navBest: Infinity,
        navStuck: 0,
        navRefX: Infinity,
        navRefY: Infinity,
        noAggroUntilTick: 0,
        helpEid: null,
        helpUntilTick: 0,
        helpCalled: false,
        alert: 0,
        alertEid: null,
        alertX: 0,
        alertY: 0,
        alertVelX: 0,
        alertVelY: 0,
        alertSeenTick: 0,
        huntUntilTick: 0,
        huntWps: null,
        huntIdx: 0,
        huntWaitUntilTick: 0,
        standTicks: 0,
        nav: null,
        progressLane: null,
        nextRepathTick: 0,
        losClear: false,
        losUntilTick: 0,
        losGoalX: Infinity,
        losGoalY: Infinity,
        // A guard at peace keeps the blade on the hip; hostiles walk
        // with steel out. The bit derives from this + a peacetime state.
        sheathePref: actor.disposition !== 'hostile',
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
    // Conversations stay honest even against a client that keeps
    // walking: drifting out of earshot hangs up server-side.
    for (const [eid, player] of this.players) {
      if (player.dialogue) this.dialogueGuard(eid, player, player.dialogue);
    }
    for (const [eid, comp] of this.actors) {
      const npc = this.npcs.get(eid);
      if (npc && npc.state !== 'idle') continue; // combat owns the body
      // Mid-stride or working a station, the routine owns the eyes —
      // a smith who greets every passerby never finishes a blade.
      if (this.routines.get(eid)?.holdFacing) continue;
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
      if (found) {
        pos.dir = Math.atan2(bestY, bestX);
      } else {
        // THE IDLE GAZE: alone, the look wanders a little around the
        // rest anchor every 8–20s — a held stare reads as a mannequin,
        // a drifting one as a person with a mind somewhere else.
        if (this.tickCount >= comp.nextGazeTick) {
          comp.gazeDir = comp.restDir + (Math.random() - 0.5) * 0.8;
          comp.nextGazeTick = this.tickCount + 160 + Math.floor(Math.random() * 240);
        }
        pos.dir = comp.gazeDir;
      }
    }
  }

  // ------------------------------------------------------- routines

  /** A townsperson's stride — calmer than any combat speed. */
  private static readonly ROUTINE_WALK_SPEED = 1.8;
  /** Close enough to a target counts as standing on it. */
  private static readonly ROUTINE_ARRIVE = 0.3;
  /** Travel ticks without progress before the watchdog intervenes (3s). */
  private static readonly ROUTINE_STUCK_TICKS = 60;
  /** Chase ticks without closing on a STATIONARY target before giving up (4.5s). */
  private static readonly CHASE_STALL_TICKS = 90;
  /** Homeward ticks without progress before the leash snaps the rest (5s). */
  private static readonly RETURN_STALL_TICKS = 100;
  /** How long an abandoned chase sulks before scanning for aggro again (12s). */
  private static readonly NO_AGGRO_TICKS = 240;
  /** Ticks a cached walk-line verdict stays trusted (0.2s). */
  private static readonly LOS_RECHECK_TICKS = 4;
  /** Per-body floor between pathfinder requests (0.5s). */
  private static readonly REPATH_TICKS = 10;
  /** A nav goal drifting this far from its lane forces a repath. */
  private static readonly PATH_GOAL_DRIFT = 1.4;
  /** Bounds-radius widening for an escalated (long-wall) repath. */
  private static readonly PATH_BOOST_R = 14;
  /** Expansion budget for an escalated repath (base is 1500). */
  private static readonly PATH_BOOST_EXPANSIONS = 4500;
  /** Global A* grants per tick — everyone else keeps the steer fan. */
  private static readonly MAX_PATHFINDS_PER_TICK = 4;
  /** Perception cadence: each body looks every 5th tick (4 Hz), staggered. */
  private static readonly PERCEPTION_PERIOD = 5;
  /** Suspicious stand-and-stare before walking over to see (1.2s). */
  private static readonly SUS_DWELL_TICKS = 24;
  /** An investigator that SEES its interest holds off at this range. */
  private static readonly WATCH_STANDOFF = 3.2;
  /**
   * THE NERVE BREAKS: a hostile holds the wary standoff stare only
   * this long (plus a per-body jitter tick spread, so a pack never
   * lunges in unison) before committing anyway. The sizing-up law
   * buys the quarry a telegraphed pause — never a free swing.
   */
  private static readonly STANDOFF_NERVE_TICKS = 40;
  /** An investigation's whole budget: walk, look, shrug (15s). */
  private static readonly INVESTIGATE_TICKS = 300;
  /** The hunt for a slipped quarry runs longer — it KNOWS you exist (20s). */
  private static readonly SEARCH_TICKS = 400;
  /** Sight-loss grace before an engaged chase breaks to 'search' (2.5s). */
  private static readonly LOSE_SIGHT_TICKS = 50;

  /** Pathfinder grants left this tick (reset at the top of tickNpcs). */
  private pathfindsLeft = 0;

  /**
   * The walk learns the map: the heading toward (goalX, goalY) for any
   * walking body carrying a nav slate (chase pursuit and routine
   * errands alike). When the straight walk-line is clear — the common,
   * open-field case — this is exactly the old steer fan at zero extra
   * cost. When it is not, the body keeps a cached A* lane (bounded by
   * the caller's circle, best-effort when the goal is sealed off) and
   * steers waypoint to waypoint, so buildings, rock pockets, and fence
   * lines get ROUNDED instead of ground against. The pathfinder is
   * budgeted per tick and per body; a denied grant degrades to the
   * plain fan for a few ticks, never a freeze — and the caller's stall
   * ladder keeps sole ownership of giving up.
   *
   * `laneWorld` is the map the LANE is planned on; steering and the
   * walk-line always test the REAL world. An errand walker plans
   * through shut-but-unlocked doors (and opens them on approach); a
   * hostile pursuer never does — a shut door still stops a wolf.
   */
  private navToward(
    state: NavState,
    pos: { x: number; y: number },
    goalX: number,
    goalY: number,
    radius: number,
    bounds: { cx: number; cy: number; r: number },
    laneWorld: CollisionSource = this.world,
    escalate = false,
  ): { mx: number; my: number } {
    // Walk-line check, cached a few ticks. A goal that moved (chase
    // target, state flip) invalidates the cache immediately.
    if (
      this.tickCount >= state.losUntilTick ||
      Math.hypot(goalX - state.losGoalX, goalY - state.losGoalY) > 0.6
    ) {
      state.losClear = lineClear(this.world, pos.x, pos.y, goalX, goalY, radius);
      state.losUntilTick = this.tickCount + GameServer.LOS_RECHECK_TICKS;
      state.losGoalX = goalX;
      state.losGoalY = goalY;
    }
    if (state.losClear) {
      state.nav = null;
      return steerToward(pos, goalX, goalY, this.world, radius, state.steer);
    }

    const stale =
      state.nav === null ||
      state.nav.idx >= state.nav.pts.length ||
      Math.hypot(goalX - state.nav.goalX, goalY - state.nav.goalY) > GameServer.PATH_GOAL_DRIFT;
    if (stale && this.tickCount >= state.nextRepathTick && this.pathfindsLeft > 0) {
      this.pathfindsLeft--;
      state.nextRepathTick = this.tickCount + GameServer.REPATH_TICKS;
      // THE LONG WALL: a lane that came back incomplete for this same
      // goal means the cheap bounded search hit its fence, not that
      // the goal is sealed — a wall with equal distance either side
      // needs a detour that leaves the tight circle (or outspends the
      // base budget), and the consolation "closest reachable tile" is
      // exactly the wall-hugging trap beside the goal. Escalating
      // callers (errands walking their OWN static goals — routines,
      // patrol legs, the walk home) re-ask WIDER so the detour can
      // COMPLETE; chase pursuit never escalates, its leash circle is
      // a game law, not a cost guard.
      const boost =
        escalate &&
        state.nav !== null &&
        !state.nav.complete &&
        Math.hypot(goalX - state.nav.goalX, goalY - state.nav.goalY) <= GameServer.PATH_GOAL_DRIFT;
      const found = boost
        ? findPathNav(
            laneWorld,
            pos.x,
            pos.y,
            goalX,
            goalY,
            { cx: bounds.cx, cy: bounds.cy, r: bounds.r + GameServer.PATH_BOOST_R },
            GameServer.PATH_BOOST_EXPANSIONS,
          )
        : findPathNav(laneWorld, pos.x, pos.y, goalX, goalY, bounds);
      // An incomplete lane is kept even when EMPTY — "nowhere better
      // than where we stand" is an answer, and the walk branch below
      // turns it into standing still instead of grinding the fan.
      state.nav = { pts: found.path, idx: 0, goalX, goalY, complete: found.complete };
    }

    const nav = state.nav;
    if (nav) {
      while (nav.idx < nav.pts.length) {
        const wp = nav.pts[nav.idx]!;
        const d = Math.hypot(wp.x - pos.x, wp.y - pos.y);
        if (d < 0.35) {
          nav.idx++;
          continue;
        }
        // Passed-it skip: a pounce leap or wall-slide can leave the
        // body nearer the NEXT waypoint — but only skip when the
        // straight walk there is actually open, or a U-bend around a
        // building would collapse back into wall-grinding.
        const next = nav.pts[nav.idx + 1];
        if (
          next &&
          Math.hypot(next.x - pos.x, next.y - pos.y) < d &&
          lineClear(this.world, pos.x, pos.y, next.x, next.y, radius)
        ) {
          nav.idx++;
          continue;
        }
        return steerToward(pos, wp.x, wp.y, this.world, radius, state.steer);
      }
      // Lane walked to its end. A COMPLETE lane ends on the goal tile
      // — drop it and let the fan close the last sub-tile stretch. An
      // INCOMPLETE lane ends at the nearest reachable tile to a goal
      // that is sealed off (fence line, water, a shut door): STAND
      // THERE. Pushing the fan at the seal is the back-and-forth
      // wall-grind jitter; standing reads as intent, the stale check
      // keeps re-asking the pathfinder on the repath floor (the world
      // may open up), and the caller's stall ladder still owns giving
      // up entirely.
      if (!nav.complete) return { mx: 0, my: 0 };
      state.nav = null;
    }

    // No lane granted (budget) or none cached yet: the fan pushes on
    // and the stall ladder owns what happens next.
    return steerToward(pos, goalX, goalY, this.world, radius, state.steer);
  }

  /** The chase flavor: lane bounded by the pursuer's own leash circle. */
  private npcNavToward(
    npc: NpcComp,
    pos: { x: number; y: number },
    goalX: number,
    goalY: number,
    escalate = false,
  ): { mx: number; my: number } {
    return this.navToward(
      npc,
      pos,
      goalX,
      goalY,
      npc.def.radius,
      {
        cx: npc.originX,
        cy: npc.originY,
        r: npc.def.leashRange + 2,
      },
      this.world,
      escalate,
    );
  }

  /**
   * The stall ledgers' yardstick toward a nav goal. In the open it is
   * plain euclidean distance — but while a PROVEN (complete) lane is
   * being walked, it is the REMAINING LANE LENGTH. A legitimate detour
   * around a long wall spends seconds getting euclidean-FARTHER from
   * the goal, and a euclidean ledger reads that as wedged and aborts
   * the walk mid-detour — the double-back jostle at long walls. Lane
   * length only shrinks as the lane is actually consumed, so a body
   * grinding against something new on a stale lane still runs out the
   * clock. `freshLane` fires once per newly-proven lane; the caller
   * re-arms its ledger on it (a proven route deserves a fresh clock).
   * Incomplete lanes never earn this — standing at a sealed goal
   * keeps the euclidean ledger counting toward giving up.
   */
  private navProgressDist(
    state: NavState,
    pos: { x: number; y: number },
    goalX: number,
    goalY: number,
  ): { dist: number; freshLane: boolean } {
    const nav = state.nav;
    const lane = nav !== null && nav.complete && nav.idx < nav.pts.length ? nav : null;
    const freshLane = lane !== null && lane !== state.progressLane;
    state.progressLane = lane;
    if (!lane) return { dist: Math.hypot(goalX - pos.x, goalY - pos.y), freshLane };
    let d = Math.hypot(lane.pts[lane.idx]!.x - pos.x, lane.pts[lane.idx]!.y - pos.y);
    for (let i = lane.idx; i + 1 < lane.pts.length; i++) {
      d += Math.hypot(lane.pts[i + 1]!.x - lane.pts[i]!.x, lane.pts[i + 1]!.y - lane.pts[i]!.y);
    }
    return { dist: d, freshLane };
  }

  /**
   * The errand's lane map: shut but UNLOCKED doors read as walkable —
   * a townsfolk's lane plans straight through them and the walker
   * works the latch on approach (openDoorsOnLane). Locked doors stay
   * walls. Only lane PLANNING sees this; steering and walk-line checks
   * test the real world, so the body still walks up to the shut leaf
   * instead of through it.
   */
  private readonly errandWorld: CollisionSource = {
    isSolid: (tx, ty) => {
      if (!this.world.isSolid(tx, ty)) return false;
      const g = this.world.groundAt(tx, ty);
      const info = g === undefined ? null : doorInfo(g);
      if (!info || info.open) return true;
      const unit = this.doorUnit(tx, ty, info);
      return this.doorLocks.has(`${unit.ax},${unit.ay}`);
    },
    tileAt: (tx, ty) => this.world.tileAt?.(tx, ty),
  };

  /**
   * An errand walker works latches: when the lane's next step or two
   * sits on a shut, unlocked door within arm's reach, swing it open —
   * the same atomic-unit toggle a player's hand gets, auto-close and
   * all. Deliberately routine-only: hostiles never learn doors, so
   * shutting one on a wolf still works.
   */
  private openDoorsOnLane(rc: RoutineComp, pos: { x: number; y: number }): void {
    const nav = rc.nav;
    if (!nav) return;
    const end = Math.min(nav.idx + 2, nav.pts.length);
    for (let i = nav.idx; i < end; i++) {
      const wp = nav.pts[i]!;
      if (Math.hypot(wp.x - pos.x, wp.y - pos.y) > 1.6) break;
      const tx = Math.floor(wp.x);
      const ty = Math.floor(wp.y);
      const g = this.world.groundAt(tx, ty);
      const info = g === undefined ? null : doorInfo(g);
      if (!info || info.open) continue;
      const unit = this.doorUnit(tx, ty, info);
      if (this.doorLocks.has(`${unit.ax},${unit.ay}`)) continue;
      // Routine hands are nobody's (locked units were skipped above).
      this.interactDoor(-1 as EntityId, tx, ty, info, () => {});
    }
  }

  /**
   * THE POLITE STEP-ASIDE: a walking body drifts off overlapping
   * neighbors (other NPCs, players) instead of merging into them —
   * two walkers meeting in a lane yield sideways and pass, no jostle,
   * no body-block. A nudge blended into the heading, never a hard
   * collision: nothing here can wedge a body or stop a chase, and a
   * standing crowd (pack biting a target) is untouched because only
   * MOVING bodies are steered through this.
   */
  private separateHeading(
    eid: EntityId,
    pos: { x: number; y: number },
    radius: number,
    mx: number,
    my: number,
  ): { mx: number; my: number } {
    const ccx = Math.floor(pos.x / CHUNK_SIZE);
    const ccy = Math.floor(pos.y / CHUNK_SIZE);
    let px = 0;
    let py = 0;
    let crowded = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const set = this.chunks.get(chunkKey(ccx + dx, ccy + dy));
        if (!set) continue;
        for (const other of set) {
          if (other === eid) continue;
          const kind = this.kinds.get(other);
          if (kind !== EntityKind.Npc && kind !== EntityKind.Player) continue;
          const opos = this.positions.get(other);
          if (!opos) continue;
          const ox = pos.x - opos.x;
          const oy = pos.y - opos.y;
          const d = Math.hypot(ox, oy);
          const reach = radius + (this.npcs.get(other)?.def.radius ?? 0.35) + 0.1;
          if (d >= reach || d < 1e-4) continue;
          const w = (reach - d) / reach;
          px += (ox / d) * w;
          py += (oy / d) * w;
          crowded = true;
        }
      }
    }
    if (!crowded) return { mx, my };
    const nx = mx + px * 0.9;
    const ny = my + py * 0.9;
    const n = Math.hypot(nx, ny);
    if (n < 0.2) {
      // Pushed square against the walk: sidestep at half pace — a
      // full-speed perpendicular kick re-aimed every tick is an
      // orbit, not a yield.
      const sx = -my + px * 0.5;
      const sy = mx + py * 0.5;
      const sn = Math.hypot(sx, sy) || 1;
      return { mx: (sx / sn) * 0.5, my: (sy / sn) * 0.5 };
    }
    // Sub-unit blends keep their magnitude: a body easing past a
    // neighbor SLOWS, it doesn't ricochet off at full stride in a
    // freshly rotated direction every tick.
    if (n > 1) return { mx: nx / n, my: ny / n };
    return { mx: nx, my: ny };
  }

  /** The task the schedule assigns this comp right now. */
  private routineTask(rc: RoutineComp): RoutineTask {
    return rc.slot < 0 ? rc.def.base : (rc.def.slots?.[rc.slot]?.task ?? rc.def.base);
  }

  /** Point the comp at its task's current destination (world coords). */
  private routineRetarget(rc: RoutineComp, task: RoutineTask): void {
    if (task.kind === 'path') {
      const wp = task.waypoints[Math.min(rc.wpIndex, task.waypoints.length - 1)]!;
      rc.targetX = rc.anchorX + wp.x;
      rc.targetY = rc.anchorY + wp.y;
    } else if (task.kind === 'wander') {
      this.routineRollWander(rc, task);
    } else {
      rc.targetX = rc.anchorX + (task.x ?? 0);
      rc.targetY = rc.anchorY + (task.y ?? 0);
    }
  }

  /** Roll a fresh walkable drift target inside the wander circle. */
  private routineRollWander(rc: RoutineComp, task: { x?: number; y?: number; radius: number }): void {
    const cx = rc.anchorX + (task.x ?? 0);
    const cy = rc.anchorY + (task.y ?? 0);
    rc.targetX = cx;
    rc.targetY = cy;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * task.radius;
      const tx = cx + Math.cos(a) * r;
      const ty = cy + Math.sin(a) * r;
      // The BODY must fit at the target, not just the tile be open —
      // a point rolled into a fence-corner nook is unreachable by a
      // body radius, and the walker hovers against the wall jittering
      // until the stuck watchdog rerolls. 0.4 covers every townsfolk
      // radius with margin.
      if (!circleHitsSolid(this.world, tx, ty, 0.4)) {
        rc.targetX = tx;
        rc.targetY = ty;
        break;
      }
    }
  }

  /** Step the path cursor per its mode; 'once' holds at the last stop. */
  private routineAdvance(rc: RoutineComp, path: RoutineTaskPath): void {
    const n = path.waypoints.length;
    const mode = path.mode ?? 'loop';
    if (n <= 1 || (mode === 'once' && rc.wpIndex >= n - 1)) {
      rc.phase = 'linger';
      rc.lingerUntilTick = Number.MAX_SAFE_INTEGER;
      return;
    }
    if (mode === 'bounce') {
      let next = rc.wpIndex + rc.wpDir;
      if (next < 0 || next >= n) {
        rc.wpDir = rc.wpDir === 1 ? -1 : 1;
        next = rc.wpIndex + rc.wpDir;
      }
      rc.wpIndex = next;
    } else {
      rc.wpIndex = (rc.wpIndex + 1) % n;
    }
    rc.phase = 'travel';
    rc.stuckTicks = 0;
    rc.progressBest = Infinity;
    this.routineRetarget(rc, path);
  }

  /** Set a routine body's pose without stomping a combat flinch. */
  private routinePose(eid: EntityId, npc: NpcComp | undefined, pose: PoseState): void {
    if (npc && this.tickCount < npc.poseUntilTick) return;
    this.poses.set(eid, pose);
  }

  /**
   * Swing up / step down (THE SADDLE IN THE SCHEDULE): flip the
   * actor's saddle state and tell every watcher. Only a humanoid
   * body takes a saddle — a creature-bodied actor keeps its own legs
   * no matter what a routine claims. No-op when nothing changes, so
   * the meta wire only speaks at the mount and dismount moments.
   */
  private setActorRide(eid: EntityId, mount: string | null): void {
    const ac = this.actors.get(eid);
    if (!ac) return;
    const next = mount && ac.actor.model.kind === 'humanoid' ? mount : null;
    if (ac.mount === next) return;
    ac.mount = next;
    this.broadcastMetaUpdate(eid);
  }

  /**
   * The daily lives, one step per tick. Runs AFTER tickNpcs so the
   * routine's pose wins over the combat ticker's idle reset, and only
   * ever steers bodies whose combat state (if any) is 'idle' — chase
   * and return own the legs outright, and the leash anchor (originX/Y)
   * is pinned to the routine's last spot so a fight always resolves
   * by walking back to the interrupted errand.
   */
  private tickRoutines(): void {
    if (this.routines.size === 0) return;
    // Who is being talked AT: a conversation holds the walker still.
    let talking: Set<EntityId> | null = null;
    for (const [, player] of this.players) {
      if (player.dialogue) (talking ??= new Set()).add(player.dialogue.targetEid);
    }
    const hours = clockHoursAtTick(this.tickCount, this.timeOfsTicks);

    for (const [eid, rc] of this.routines) {
      const pos = this.positions.get(eid);
      if (!pos) continue;
      const npc = this.npcs.get(eid);
      if (npc && npc.state !== 'idle') {
        // Combat owns the body; the errand resumes where life left it.
        // Off the furniture first — legs can't engage from a solid tile.
        // And out of the saddle: the rider's own dismount law (a fight
        // is fought on foot) binds the routine rider identically.
        this.setActorRide(eid, null);
        this.routineDismount(eid, rc, pos);
        rc.holdFacing = false;
        rc.stuckTicks = 0;
        rc.progressBest = Infinity; // the fight moved us — re-baseline
        continue;
      }

      // Schedule resolve — a flip resets progression onto the new task.
      const slot = pickRoutineSlot(rc.def, hours);
      if (slot !== rc.slot) {
        this.routineDismount(eid, rc, pos);
        rc.slot = slot;
        rc.wpIndex = 0;
        rc.wpDir = 1;
        rc.phase = 'travel';
        rc.stuckTicks = 0;
        rc.progressBest = Infinity;
        this.routineRetarget(rc, this.routineTask(rc));
      }
      const task = this.routineTask(rc);
      // THE SADDLE IN THE SCHEDULE: the task names the beast; the
      // ticker owns the swing-up. Every yield the player's saddle law
      // knows steps the routine rider down too (work, rest, combat).
      const saddle = task.mount ?? null;

      // Conversations and barks park the body mid-errand. A mounted
      // body holds its seat through the talk — royalty does not rise
      // for petitioners, a sleeper answers from the pillow, and a
      // rider speaks from the saddle.
      if (talking?.has(eid) || this.tickCount < rc.pauseUntilTick) {
        rc.stuckTicks = 0;
        if (rc.seat) {
          this.routinePose(eid, npc, rc.seat.lie ? PoseState.Lie : PoseState.Sit);
        } else if (this.actors.get(eid)?.mount) {
          this.routinePose(eid, npc, PoseState.Ride);
        } else {
          rc.holdFacing = false;
          this.routinePose(eid, npc, PoseState.Idle);
        }
        continue;
      }

      const wp =
        task.kind === 'path'
          ? task.waypoints[Math.min(rc.wpIndex, task.waypoints.length - 1)]!
          : undefined;

      // THE POST AT THE STATION: an authored target ON a solid tile
      // (counter, loom, carving bench — "stand at the counter" is the
      // natural way to author shopkeeping) can never be stood on: a
      // body's center never gets closer than ~0.8 to a solid tile's
      // center, the 0.3 arrive never fires, and the last-resort snap
      // is (rightly) gated on walkable targets — so the walker paced
      // the counter face forever (Tilo and Elowen, found live).
      // Arrival at a solid target is STANDING BESIDE IT: 1.05 accepts
      // any cardinal-adjacent stand or closer face-press and rejects
      // diagonal corners. The linger hold-radius rides the same law
      // or arrive/re-travel would flap at the counter.
      const arriveR = this.world.isSolid(Math.floor(rc.targetX), Math.floor(rc.targetY))
        ? 1.05
        : GameServer.ROUTINE_ARRIVE;

      if (rc.phase === 'linger') {
        // Knocked (or leashed) off the spot? Walk back — the errand
        // re-establishes itself, never teleports.
        const ddx = rc.targetX - pos.x;
        const ddy = rc.targetY - pos.y;
        const holdR = arriveR + 0.5;
        if (ddx * ddx + ddy * ddy > holdR * holdR) {
          // Knocked clear off a mounted seat: release the claim where
          // the body lies — restoring would teleport it back.
          const seat = rc.seat;
          if (seat) {
            rc.seat = null;
            this.releaseSeat(eid, seat, null);
          }
          rc.phase = 'travel';
          rc.stuckTicks = 0;
          rc.progressBest = Infinity;
        } else if (this.tickCount >= rc.lingerUntilTick) {
          this.routineDismount(eid, rc, pos);
          if (task.kind === 'path') {
            this.routineAdvance(rc, task);
          } else if (task.kind === 'wander') {
            this.routineRollWander(rc, task);
            rc.phase = 'travel';
            rc.stuckTicks = 0;
            rc.progressBest = Infinity;
          }
          // A post lingers forever; only a schedule flip moves it.
        }
        if (rc.phase === 'linger') {
          const working = task.kind === 'post' ? task.work : wp?.work;
          const seated = task.kind === 'post' ? task.sit : wp?.sit;
          const lying = task.kind === 'post' ? task.lie : wp?.lie;
          const dir = task.kind === 'path' ? wp?.dir : task.kind === 'post' ? task.dir : undefined;
          // The stop decides the saddle: work and rest always step
          // down (the saddle law), a plain wait is held mounted — a
          // patrol pauses IN the saddle — and a ride:false stop is an
          // authored on-foot moment.
          const stopRide = saddle !== null && !working && !seated && !lying && wp?.ride !== false;
          this.setActorRide(eid, stopRide ? saddle : null);
          if (working) {
            // The client squares the rig up to the nearest station and
            // plays the full work choreography off this one byte.
            this.routinePose(eid, npc, PoseState.Craft);
            rc.holdFacing = true;
          } else if (seated || lying) {
            // THE SEAT UNDER THE STOP: a rest stop whose target lands
            // on furniture mounts it — the body settles onto the seat
            // anchor and takes the furniture's pose (a bed lays it
            // down). Open-ground stops keep the wayside floor sit, and
            // a taken seat retries each tick so the King reclaims his
            // throne the moment a squatter hops off. Seated bodies are
            // planted either way — no glancing at passersby (the whole
            // figure would swivel on the seat).
            if (!rc.seat) this.routineMount(eid, rc, pos, dir);
            this.routinePose(eid, npc, rc.seat?.lie ? PoseState.Lie : PoseState.Sit);
            rc.holdFacing = true;
            if (rc.seat) pos.dir = rc.seat.dir;
            else if (dir !== undefined) pos.dir = dir;
          } else {
            this.routinePose(eid, npc, stopRide ? PoseState.Ride : PoseState.Idle);
            // An authored facing is held; otherwise tickActors may
            // let the body glance at whoever wanders past. A rider is
            // planted like a seated body — the whole horse would turn.
            rc.holdFacing = dir !== undefined || stopRide;
            if (dir !== undefined) pos.dir = dir;
          }
          continue;
        }
      }

      // Travel. The leg is ridden when the task holds a saddle and
      // the leg's waypoint doesn't call for boots (ride: false) —
      // layered exactly like the stride.
      const legRide = saddle !== null && wp?.ride !== false;
      this.setActorRide(eid, legRide ? saddle : null);
      const riding = this.actors.get(eid)?.mount != null;
      const dx = rc.targetX - pos.x;
      const dy = rc.targetY - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= arriveR) {
        rc.stuckTicks = 0;
        if (task.kind === 'path' && !(wp!.waitSec || (task.mode === 'once' && rc.wpIndex >= task.waypoints.length - 1))) {
          // A pass-through stop: no linger, straight to the next leg.
          this.routineAdvance(rc, task);
          this.routinePose(eid, npc, riding ? PoseState.Ride : PoseState.Walk);
          continue;
        }
        rc.phase = 'linger';
        // THE HUMAN WOBBLE: authored waits stretch a random 0-20% so
        // two bodies sharing one routine drift out of lockstep within
        // a few rounds instead of pacing like clockwork twins.
        rc.lingerUntilTick =
          task.kind === 'path'
            ? task.mode === 'once' && rc.wpIndex >= task.waypoints.length - 1
              ? Number.MAX_SAFE_INTEGER
              : this.tickCount +
                Math.round((wp!.waitSec ?? 0) * (1 + Math.random() * 0.2) * (1000 / TICK_MS))
            : task.kind === 'wander'
              ? this.tickCount + Math.round((2 + Math.random() * 5) * (1000 / TICK_MS))
              : Number.MAX_SAFE_INTEGER;
        this.routinePose(eid, npc, riding ? PoseState.Ride : PoseState.Idle);
        // The walk-in facing becomes the rest anchor at this stop:
        // the alone-gaze drifts around wherever the errand left the
        // body looking, never snapping back to the spawn facing from
        // across town. (An authored task dir still overrides in the
        // linger branch above.)
        const arrived = this.actors.get(eid);
        if (arrived) {
          arrived.restDir = pos.dir;
          arrived.gazeDir = pos.dir;
          arrived.nextGazeTick = this.tickCount + 160 + Math.floor(Math.random() * 240);
        }
        continue;
      }

      // THE PACE IS AUTHORED CHARACTER: the leg's waypoint speed, else
      // the task's, else the default townsfolk stride — a shuffling
      // elder and a jogging courier come from content, not code. A
      // saddle only moves the DEFAULT (the walk stride at the beast's
      // own multiplier); an authored pace outranks the horse.
      const speed =
        wp?.speed ??
        task.speed ??
        (riding
          ? GameServer.ROUTINE_WALK_SPEED * (mountDef(saddle!)?.speedMult ?? 1)
          : GameServer.ROUTINE_WALK_SPEED);
      const radius = npc?.def.radius ?? 0.3;
      // Authored legs are straight and walkable, so the fast path is
      // the plain steer fan — but a fight, a shove, or a player-shut
      // door leaves the body off the rails, and then the same nav
      // lanes that drive pursuit walk the errand around furniture and
      // THROUGH doors (the errand lane plans across shut unlocked
      // doors; openDoorsOnLane works the latch on approach).
      const h = this.navToward(
        rc,
        pos,
        rc.targetX,
        rc.targetY,
        radius,
        {
          cx: (pos.x + rc.targetX) / 2,
          cy: (pos.y + rc.targetY) / 2,
          r: dist / 2 + 8,
        },
        this.errandWorld,
        true,
      );
      this.openDoorsOnLane(rc, pos);
      const sep = this.separateHeading(eid, pos, radius, h.mx, h.my);
      const next = stepMovement(pos, { mx: sep.mx, my: sep.my }, speed, TICK_DT, this.world, radius);
      const stepped = Math.hypot(next.x - pos.x, next.y - pos.y);
      if (stepped > 0.001) {
        // Face the ERRAND's heading, not the sidestep — a body easing
        // around a neighbor keeps looking where it is going.
        pos.dir = Math.atan2(h.my, h.mx);
        pos.x = next.x;
        pos.y = next.y;
        this.updateChunkMembership(eid);
        // The leash anchor rides along: a fight picked mid-errand
        // returns the body HERE, not to the morning's post.
        if (npc) {
          npc.originX = pos.x;
          npc.originY = pos.y;
        }
        rc.holdFacing = true;
        this.routinePose(eid, npc, riding ? PoseState.Ride : PoseState.Walk);
      } else {
        this.routinePose(eid, npc, riding ? PoseState.Ride : PoseState.Idle);
      }
      // Progress watchdog: authored paths are walked segments, not a
      // pathfinder. The trip condition is CLOSEST APPROACH stalling,
      // never step distance — a body wedged in a furniture corner
      // slides a full stride every tick while going nowhere (verified
      // live: the smith oscillating between tool rack and anvil).
      // The yardstick is lane-aware: a proven detour around a long
      // wall counts remaining lane length, not the euclidean distance
      // it is temporarily growing (navProgressDist).
      const prog = this.navProgressDist(rc, pos, rc.targetX, rc.targetY);
      if (prog.freshLane) rc.progressBest = Infinity;
      if (prog.dist < rc.progressBest - 0.15) {
        rc.progressBest = prog.dist;
        rc.stuckTicks = 0;
      } else {
        rc.stuckTicks++;
      }
      if (rc.stuckTicks >= GameServer.ROUTINE_STUCK_TICKS) {
        rc.stuckTicks = 0;
        rc.progressBest = Infinity;
        if (task.kind === 'path') {
          this.routineAdvance(rc, task);
        } else if (task.kind === 'wander') {
          this.routineRollWander(rc, task);
        } else if (!this.world.isSolid(Math.floor(rc.targetX), Math.floor(rc.targetY))) {
          // A post has nowhere else to go — snap the last stretch.
          pos.x = rc.targetX;
          pos.y = rc.targetY;
          this.updateChunkMembership(eid);
          if (npc) {
            npc.originX = pos.x;
            npc.originY = pos.y;
          }
        }
      }
    }
  }

  /**
   * Point a combat body at a target: chase state plus a fresh nav
   * slate — the stall watchdog and swerve memory must never carry
   * over from a previous pursuit. Every path into 'chase' goes
   * through here — which is exactly why the pack law lives here too:
   * bodies sharing a `pack` tag hunt together, so one packmate's
   * aggro pulls every idle packmate in earshot onto the same target.
   * Rallied joins pass `rally: false` — one hop, never a chain that
   * drags a whole forest of dens into the fight.
   */
  private npcAggro(
    eid: EntityId,
    npc: NpcComp,
    targetEid: EntityId,
    opts: { rally?: boolean; force?: boolean } = {},
  ): void {
    // THE QUIET SHADOW (beastcraft v2): a companion is nobody's
    // packmate and nobody's quarry — no rally, no decoy pull, no cry
    // for help, no taunt ever aims a tamed body. This is the ONE door
    // into 'chase', so the law holds everywhere by construction.
    if (this.pets.has(eid)) return;
    // THE DROVER'S PEACE: a kept yard animal opens no fight — ever.
    if (this.livestock.has(eid)) return;
    // THE PEACE HOLDS AT THE DOOR (docs/factions-plan.md Phase 2):
    // a faction body never opens a fight with a player its ledger
    // calls a friend — and an enforcer only ever opens one with an
    // outlaw. Every unforced path (perception, rally, decoy, nerve
    // break) answers to this; a BLOW always forces (`force` rides
    // from the damage chokes — a wound outranks any ledger).
    if (opts.force !== true) {
      const target = this.players.get(targetEid);
      if (target) {
        const fid = this.npcFactionOf(eid, npc);
        if (fid !== null) {
          const band = this.playerBandWith(target, fid);
          const holds =
            this.npcEnforcerFid(eid) !== null
              ? bandAtLeast(band, 'suspect')
              : bandAtLeast(band, FACTIONS.peaceBand);
          if (holds) return;
        }
      }
    }
    npc.state = 'chase';
    // A retarget mid-breath drops the old working (new quarry, new
    // choices — the stale cast would fire at the wrong feet).
    if (npc.targetEid !== targetEid) this.cancelNpcCast(eid, npc);
    npc.targetEid = targetEid;
    npc.navBest = Infinity;
    npc.navStuck = 0;
    npc.navRefX = Infinity;
    npc.navRefY = Infinity;
    npc.steer.side = 0;
    npc.steer.ticks = 0;
    npc.nav = null;
    npc.progressLane = null;
    npc.nextRepathTick = 0;
    npc.losUntilTick = 0;
    // The interest ledger opens with the fight: full awareness, eyes
    // on the quarry, sight-loss clock freshly wound, stride ledger
    // cleared (a stale stride would fling the first search sideways).
    npc.alert = ALERT_MAX;
    npc.alertEid = targetEid;
    npc.alertVelX = 0;
    npc.alertVelY = 0;
    npc.alertSeenTick = this.tickCount;
    const tpos = this.positions.get(targetEid);
    if (tpos) {
      npc.alertX = tpos.x;
      npc.alertY = tpos.y;
    }
    npc.huntWps = null;
    npc.huntIdx = 0;
    npc.huntWaitUntilTick = 0;
    npc.standTicks = 0;
    if (npc.def.pack && (opts.rally ?? true)) {
      this.rallyPack(eid, npc, targetEid, PACK_RALLY_RANGE, 2, opts.force);
    }
  }

  /** States a fresh provocation may interrupt — everything shy of a fight. */
  private npcAtPeace(npc: NpcComp): boolean {
    return (
      npc.state === 'idle' ||
      npc.state === 'suspicious' ||
      npc.state === 'investigate' ||
      npc.state === 'search'
    );
  }

  /**
   * The pack answers — BOUNDED. A cry is not a conscription: the
   * nearest `maxJoin` resting packmates take up the fight, the next
   * couple only LOOK (suspicious, facing the trouble — the second
   * wave that wanders over late if the fight drags on). Everyone
   * further keeps their post, which is what lets a careful player
   * pull one or two bodies off a camp instead of the whole camp.
   * Sulking bodies (noAggroUntilTick) keep their eyes down — the
   * give-up ledger outranks pack loyalty, or the trap-cheese the
   * sulk exists to kill comes straight back through the packmate's
   * aggro.
   */
  private rallyPack(
    eid: EntityId,
    npc: NpcComp,
    targetEid: EntityId,
    range: number,
    maxJoin = 2,
    force = false,
  ): void {
    const pos = this.positions.get(eid);
    if (!pos) return;
    const cands: Array<{ eid: EntityId; npc: NpcComp; d: number }> = [];
    for (const [oEid, other] of this.npcs) {
      if (oEid === eid || other.def.pack !== npc.def.pack) continue;
      if (!this.npcAtPeace(other) || other.def.damage <= 0) continue;
      if (this.tickCount < other.noAggroUntilTick) continue;
      const opos = this.positions.get(oEid);
      if (!opos) continue;
      const d = Math.hypot(opos.x - pos.x, opos.y - pos.y);
      if (d > range) continue;
      cands.push({ eid: oEid, npc: other, d });
    }
    cands.sort((a, b) => a.d - b.d);
    const tpos = this.positions.get(targetEid);
    for (let i = 0; i < cands.length && i < maxJoin + 2; i++) {
      const c = cands[i]!;
      if (i < maxJoin) {
        // A rally born of a BLOW carries the blow's force — the cry
        // names the attacker, and betrayal is answered by the pack.
        this.npcAggro(c.eid, c.npc, targetEid, { rally: false, force });
      } else if (c.npc.state === 'idle' && tpos) {
        // Bystanders: heads turn toward the trouble, feet stay put.
        c.npc.state = 'suspicious';
        c.npc.alert = Math.max(c.npc.alert, ALERT_SUS);
        c.npc.alertEid = targetEid;
        c.npc.alertX = tpos.x;
        c.npc.alertY = tpos.y;
        c.npc.alertSeenTick = this.tickCount;
        c.npc.huntUntilTick = this.tickCount + GameServer.SUS_DWELL_TICKS * 2;
      }
    }
  }

  /**
   * The craven break, decided: find the nearest packmate still at
   * rest and run to it. A companion already at arm's reach needs no
   * journey — the cry goes up on the spot. Nobody within
   * HELP_SEEK_RANGE means nobody to run to: the body stays and
   * fights after all, and the once-per-life flag keeps it honest.
   */
  private npcSeekHelp(eid: EntityId, npc: NpcComp): void {
    const pos = this.positions.get(eid);
    const targetEid = npc.targetEid;
    if (!pos || targetEid === null) return;
    let bestEid: EntityId | null = null;
    let bestDist = HELP_SEEK_RANGE;
    for (const [oEid, other] of this.npcs) {
      if (oEid === eid || other.def.pack !== npc.def.pack) continue;
      if (other.state !== 'idle' || other.def.damage <= 0) continue;
      if (this.tickCount < other.noAggroUntilTick) continue;
      const opos = this.positions.get(oEid);
      if (!opos) continue;
      const d = Math.hypot(opos.x - pos.x, opos.y - pos.y);
      if (d < bestDist) {
        bestDist = d;
        bestEid = oEid;
      }
    }
    if (bestEid === null) return;
    if (bestDist < 2.5) {
      this.npcCryHelp(eid, npc, targetEid);
      return;
    }
    npc.state = 'seekhelp';
    npc.helpEid = bestEid;
    npc.helpUntilTick = this.tickCount + 160; // ~8s of running, then shout anyway
    npc.windupTicks = 0;
    this.cancelNpcCast(eid, npc);
    npc.navBest = Infinity;
    npc.navStuck = 0;
    npc.steer.side = 0;
    npc.steer.ticks = 0;
    npc.nav = null;
    npc.progressLane = null;
    npc.nextRepathTick = 0;
    npc.losUntilTick = 0;
  }

  /**
   * The cry itself: a bark everyone nearby reads in local chat, a
   * rally that carries a bit past the ordinary pack answer (a scream
   * travels), and straight back into the chase through npcAggro.
   */
  private npcCryHelp(eid: EntityId, npc: NpcComp, targetEid: EntityId): void {
    const cries = ['Help! Help!', 'To me! To me!', 'Get them off me!'];
    const text = cries[eid % cries.length]!;
    for (const s of this.sessions) {
      if (s.knownEntities.has(eid)) {
        s.sendJson({ t: 'chat', channel: 'local', from: npc.def.name, eid, text });
      }
    }
    npc.helpEid = null;
    // The crier was already in the fight — a wound put it there, so
    // the re-entry and the scream both carry the blow's force.
    this.npcAggro(eid, npc, targetEid, { rally: false, force: true });
    // A desperate scream buys one more answer than an ordinary rally.
    this.rallyPack(eid, npc, targetEid, PACK_RALLY_RANGE + 2, 3, true);
  }

  /**
   * THE PERCEPTION PASS — the eye replaces the circle. Runs for every
   * body at peace (idle/suspicious/investigate/search) on the
   * staggered 4 Hz cadence. Cheap-to-expensive, the shape every
   * shipped stealth sim converges on: range gate, zone gate (facing
   * cone / peripheral band / point-blank ring), then ONE sight ray
   * for the survivors. What the eye resolves feeds the awareness
   * meter; the meter drives the state ladder. THE SIZING-UP LAW
   * rides the sight range exactly as it rode the old circle, and
   * sneaking thins both the range and the reflex ring — the entire
   * stealth surface lives in this method.
   */
  private npcPerception(eid: EntityId, npc: NpcComp, pos: { x: number; y: number; dir: number }): void {
    const dt = GameServer.PERCEPTION_PERIOD;
    // Only a body truly at rest is limited to its authored arc — a
    // wary one is already turning its head everywhere.
    const arcDeg = npc.state === 'idle' ? (npc.def.sightArc ?? DEFAULT_SIGHT_ARC) : 360;
    // THE WATCH HAS EYES: resolved once per scan, from the live doc.
    const fid = this.npcFactionOf(eid, npc);
    const enforcerFid = fid !== null ? this.npcEnforcerFid(eid) : null;
    let bestEid: EntityId | null = null;
    let bestRate = 0;
    let bestZone: SightZone = 'peripheral';
    let bestInReach = false;
    let bestX = 0;
    let bestY = 0;
    for (const [playerEid, player] of this.players) {
      if (player.session === null && player.disconnectedAt !== null) continue;
      if (player.hidden) continue;
      // THE QUIET WALK: a wild beast simply does not mark a walker
      // under truce — checked here, inside the one perception scan
      // (the factions precedent). People and their posted watch see
      // straight through the working; it is the wild's own word.
      if (
        !this.actors.has(eid) &&
        isWildBeast(npc.def) &&
        beastTruceActive(player, this.tickCount)
      ) {
        continue;
      }
      const ppos = this.positions.get(playerEid);
      if (!ppos) continue;
      const dx = ppos.x - pos.x;
      const dy = ppos.y - pos.y;
      // SEEING IS NOT CHARGING: the eye reaches SIGHT_RANGE_MULT ×
      // the posted range regardless of who is looking back — a
      // stranger up the road gets NOTICED either way. THE SIZING-UP
      // LAW governs the smaller ENGAGE circle instead: the distance
      // at which this body would actually commit to violence. A
      // beast that outclasses the waker commits from far out; one
      // they outgrew watches, follows, sizes up — and holds.
      // The per-player circle (docs/factions-plan.md Phase 2): an
      // enforcer's posted range is 0 — the doc's enforcement circle
      // opens ONLY on a player its faction calls outlaw. A hostile
      // faction body holds its fire entirely for a friend at the
      // peace band (the payoff of the whole dark road) — a blow
      // still answers through damageNpc's forced aggro.
      let baseRange = npc.def.aggroRange;
      const band = fid !== null ? this.playerBandWith(player, fid) : null;
      if (band !== null) {
        if (enforcerFid !== null) {
          if (!bandAtLeast(band, 'suspect')) {
            baseRange = Math.max(baseRange, FACTIONS.enforcerAggro);
          }
        } else if (baseRange > 0 && bandAtLeast(band, FACTIONS.peaceBand)) {
          continue;
        }
      }
      if (baseRange <= 0) continue;
      let sightRange = baseRange * SIGHT_RANGE_MULT;
      let engageRange = baseRange * levelAggroFactor(npc.def.level, combatLevel(player.skills));
      let closeR = SIGHT_CLOSE_RANGE;
      if (player.sneaking) {
        // Soft Step shaves the factor further; the hard floor holds.
        let f = Math.max(
          0.15,
          sneakDetectionFactor(this.effectiveLevel(player, 'sneak')) -
            player.perks.sneakFactorBonus,
        );
        // THE SUSPECT EYE (Phase 5): an enforcer watches the crouch
        // ITSELF on a name below neutral — a known thief sneaking
        // past the gate is exactly what the watch is for.
        if (enforcerFid !== null && band !== null && !bandAtLeast(band, 'neutral')) {
          f = Math.min(1, f * FACTIONS.theft.suspectEye);
        }
        sightRange *= f;
        engageRange *= f;
        // The crouch thins the reflex ring too — floored, so point
        // blank never goes fully blind.
        closeR *= Math.max(f, 0.3);
      }
      const dist = Math.hypot(dx, dy);
      if (dist > Math.max(sightRange, closeR)) continue;
      const zone = sightZone(dx, dy, dist, pos.dir, arcDeg, sightRange, closeR);
      if (!zone) continue;
      // Zone survivor: now — and only now — the ray.
      const vis = sightVisibility(sightLine(this.world, pos.x, pos.y, ppos.x, ppos.y));
      if (vis <= 0) continue;
      if (zone === 'close') {
        // Point blank in the open detects outright — no meter, no
        // warning. The 170°×5ft lesson every stealth sim learned.
        this.npcAggro(eid, npc, playerEid);
        return;
      }
      if (npc.state === 'search' && zone === 'cone') {
        // A hunter needs only one clean glimpse — the quarry is
        // KNOWN, re-acquisition never ramps from zero.
        this.npcAggro(eid, npc, playerEid);
        return;
      }
      const rate = alertRate(dist, sightRange, zone) * vis;
      if (rate > bestRate) {
        bestRate = rate;
        bestEid = playerEid;
        bestZone = zone;
        bestInReach = dist <= engageRange;
        bestX = ppos.x;
        bestY = ppos.y;
      }
    }
    if (bestEid !== null) {
      // The newest strongest stimulus owns the one interest slot.
      npc.alertEid = bestEid;
      npc.alertX = bestX;
      npc.alertY = bestY;
      npc.alertSeenTick = this.tickCount;
      // The peripheral band can make a body LOOK, never lock on —
      // and THE WATCHFUL CAP holds a quarry outside the engage
      // circle one step shy of the lock: the whole curiosity ladder
      // runs (stare, walk over, size up), the killing decision waits
      // until the eye has them genuinely in reach.
      const cap =
        bestZone === 'peripheral' ? ALERT_SUS : bestInReach ? ALERT_MAX : ALERT_WATCH_CAP;
      if (npc.alert < cap) npc.alert = Math.min(cap, npc.alert + bestRate * dt);
      if (npc.alert >= ALERT_MAX && this.players.has(bestEid)) {
        this.npcAggro(eid, npc, bestEid);
        return;
      }
      if (npc.state === 'idle' && npc.alert >= ALERT_SUS) {
        npc.state = 'suspicious';
        npc.huntUntilTick = this.tickCount + GameServer.SUS_DWELL_TICKS;
        npc.navBest = Infinity;
        npc.navStuck = 0;
      }
    } else if (npc.alert > 0 && this.tickCount - npc.alertSeenTick > ALERT_GRACE_TICKS) {
      // Nothing in view past the grace: doubt drains the meter, and
      // the ladder steps DOWN through suspicious before it forgets —
      // never snaps to zero (the capacitor rule).
      npc.alert = Math.max(0, npc.alert - ALERT_DECAY * dt);
    }
  }

  /**
   * The quarry slipped the eye mid-fight: the chase becomes a HUNT.
   * Feet go to the last-known ground, then a ring of nearby second
   * looks, then the body gives it up and walks home. targetEid drops
   * here — the DETECTED chip goes dark, which is exactly the
   * player's signal that the chain is broken and hiding is working.
   */
  private npcStartSearch(eid: EntityId, npc: NpcComp): void {
    npc.state = 'search';
    npc.targetEid = null;
    npc.windupTicks = 0;
    this.cancelNpcCast(eid, npc);
    npc.helpEid = null;
    npc.huntUntilTick = this.tickCount + GameServer.SEARCH_TICKS;
    npc.huntWps = null;
    npc.huntIdx = 0;
    npc.huntWaitUntilTick = 0;
    npc.standTicks = 0;
    // "HE WENT THAT WAY": project the last-seen point along the
    // quarry's last-seen stride (capped ~4 tiles), so the hunt
    // carries past the corner instead of stopping dead at it. A
    // projection that lands inside a solid falls back by halves.
    const stride = Math.hypot(npc.alertVelX, npc.alertVelY);
    if (stride > 0.02) {
      const capK = Math.min(1, 4 / (stride * 30));
      for (const k of [capK, capK / 2]) {
        const px = npc.alertX + npc.alertVelX * 30 * k;
        const py = npc.alertY + npc.alertVelY * 30 * k;
        if (!circleHitsSolid(this.world, px, py, npc.def.radius)) {
          npc.alertX = px;
          npc.alertY = py;
          break;
        }
      }
    }
    // The hunt never outruns the leash: clamp the LKP into the circle.
    const ox = npc.alertX - npc.originX;
    const oy = npc.alertY - npc.originY;
    const od = Math.hypot(ox, oy);
    const maxR = Math.max(0, npc.def.leashRange - 1);
    if (od > maxR && od > 0) {
      npc.alertX = npc.originX + (ox / od) * maxR;
      npc.alertY = npc.originY + (oy / od) * maxR;
    }
    npc.navBest = Infinity;
    npc.navStuck = 0;
    npc.steer.side = 0;
    npc.steer.ticks = 0;
    npc.nav = null;
    npc.progressLane = null;
    npc.nextRepathTick = 0;
    npc.losUntilTick = 0;
  }

  /** The hunt shrugs: walk home with a residue of wariness, not a grudge. */
  private npcEndHunt(npc: NpcComp): void {
    npc.state = 'return';
    npc.windupTicks = 0;
    npc.huntWps = null;
    // Below the suspicious threshold, or arrival would re-trip it.
    npc.alert = Math.min(npc.alert, ALERT_SUS - 5);
    npc.navBest = Infinity;
    npc.navStuck = 0;
  }

  /** Arrived at (or gave up on) a hunt leg: dwell, look, then the next. */
  private npcNextHuntLeg(eid: EntityId, npc: NpcComp): void {
    npc.huntWaitUntilTick = this.tickCount + 30 + ((eid * 7) % 20);
    npc.navBest = Infinity;
    npc.navStuck = 0;
    if (npc.huntWps === null) {
      // First arrival — at the LKP itself — mints the ring of second
      // looks. A search (a KNOWN quarry) checks more ground.
      npc.huntWps = this.mintHuntRing(npc, npc.state === 'search' ? 3 : 2);
      npc.huntIdx = 0;
    } else {
      npc.huntIdx++;
    }
    if (npc.huntWps.length === 0 || npc.huntIdx >= npc.huntWps.length) {
      // Nothing left to check: one last look-around, then the shrug.
      npc.huntUntilTick = Math.min(npc.huntUntilTick, npc.huntWaitUntilTick);
    }
  }

  /**
   * The ring of second looks: a few reachable spots around the LKP,
   * inside the leash circle, none inside a solid. Random by design —
   * a search should read as guessing, not sweeping a grid.
   */
  private mintHuntRing(npc: NpcComp, count: number): Array<{ x: number; y: number }> {
    const wps: Array<{ x: number; y: number }> = [];
    const maxR = Math.max(0, npc.def.leashRange - 1);
    for (let attempt = 0; attempt < count * 5 && wps.length < count; attempt++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * 2;
      let x = npc.alertX + Math.cos(a) * r;
      let y = npc.alertY + Math.sin(a) * r;
      const ox = x - npc.originX;
      const oy = y - npc.originY;
      const od = Math.hypot(ox, oy);
      if (od > maxR && od > 0) {
        x = npc.originX + (ox / od) * maxR;
        y = npc.originY + (oy / od) * maxR;
      }
      if (circleHitsSolid(this.world, x, y, npc.def.radius)) continue;
      wps.push({ x, y });
    }
    return wps;
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
    // THE FANG BESIDE YOU: a companion is a chaseable body. It can
    // only ever BE a target through its own teeth or the harry —
    // perception still cannot see it (THE QUIET SHADOW) — but once it
    // has a mob's eye, the chase runs on the ordinary rails. A DOWNED
    // body is simply gone to them: the chase breaks through the same
    // leash path as a vanished decoy, and nothing worries a fallen
    // friend (THE FALL IS NEVER THE END).
    if (this.pets.has(targetEid)) {
      if ((this.healths.get(targetEid)?.hp ?? 0) <= 0) return null;
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
        attackerLevel: npc.def.level,
      });
      // Thorns: biting the buckler costs a point; bristling enchants
      // stack more points on top of the passive's one — and Ironback
      // answers only while the wall is actually raised.
      const thorns =
        (this.hasPassive(player, 'thorns') ? 1 : 0) +
        player.gear.thorns +
        (this.equippedShield(player) ? player.perks.shieldThorns : 0);
      if (thorns > 0) {
        this.damageNpc(npcEid, thorns, targetEid, 'defence', {});
      }
    } else if (this.pets.has(targetEid)) {
      this.damagePet(targetEid, raw, {
        status: npc.def.attackStatus,
        sourceEid: npcEid,
        attackerLevel: npc.def.level,
      });
    } else {
      this.damageSummon(targetEid, raw);
    }
  }

  /** THE KIT: retry cost when a drawn breath is broken (never the full price). */
  private static readonly NPC_CAST_RETRY_TICKS = 50;
  /** 'lead' aim projects the quarry's last-seen stride this many ticks ahead. */
  private static readonly NPC_LEAD_TICKS = 16;
  /** ...and never further than this (tiles) — a sprint doesn't earn a snipe. */
  private static readonly NPC_LEAD_CAP = 3;

  /**
   * THE KIT (docs/enemy-arts-plan.md): pick an eligible voice for
   * this body at this range — cooldown spent, range band holds, hp
   * gates hold, minLevel awake. Weighted random among the eligible,
   * so a champion with three voices never sings a fixed order.
   * Returns the kit index, or -1 when nothing is ready.
   */
  private pickKitEntry(eid: EntityId, npc: NpcComp, dist: number): number {
    const kit = npc.def.kit;
    const cds = npc.kitCds;
    if (!kit || !cds) return -1;
    const hp = this.healths.get(eid);
    const frac = hp && hp.maxHp > 0 ? hp.hp / hp.maxHp : 1;
    const eligible: number[] = [];
    const weights: number[] = [];
    let total = 0;
    for (let i = 0; i < kit.length; i++) {
      const k = kit[i];
      if (!k) continue;
      if ((cds[i] ?? 1) > 0) continue;
      if (k.minLevel !== undefined && npc.def.level < k.minLevel) continue;
      if (k.minRange !== undefined && dist < k.minRange) continue;
      if (k.maxRange !== undefined && dist > k.maxRange) continue;
      if (k.hpBelow !== undefined && frac > k.hpBelow) continue;
      if (k.hpAbove !== undefined && frac < k.hpAbove) continue;
      if (!abilityDef(k.ability)) continue;
      const w = k.weight ?? 1;
      eligible.push(i);
      weights.push(w);
      total += w;
    }
    if (eligible.length === 0 || total <= 0) return -1;
    let roll = Math.random() * total;
    for (let i = 0; i < eligible.length; i++) {
      roll -= weights[i] ?? 0;
      if (roll <= 0) return eligible[i] ?? -1;
    }
    return eligible[eligible.length - 1] ?? -1;
  }

  /**
   * THE FOE'S BREATH: start a kit cast — or fire it on the spot when
   * the entry winds nothing (the old special behavior, kept for
   * howls and slams whose shape fuse is the whole telegraph). A true
   * wind-up plants the body, holds the Cast stance, and speaks the
   * SAME charge dialect the player engine speaks (ONE VOICE): matter
   * gathers on the caster, re-emitted on the overlapping window with
   * a contracting reach while the breath draws.
   */
  private beginNpcCast(eid: EntityId, npc: NpcComp, idx: number, tpos: { x: number; y: number }): void {
    const entry = npc.def.kit?.[idx];
    if (!entry) return;
    const windup = entry.windupTicks ?? 0;
    if (windup <= 0) {
      npc.casting = { idx, ticksLeft: 0, total: 0 };
      this.fireNpcCast(eid, npc, tpos);
      return;
    }
    const ab = abilityDef(entry.ability);
    if (!ab) return;
    npc.casting = { idx, ticksLeft: windup, total: windup };
    this.setNpcPose(eid, npc, PoseState.Cast, windup + 2);
    const pos = this.positions.get(eid);
    if (pos) {
      // eid + ticks ride the charge: the watcher's overhead pip
      // anchors to the body and counts the wind down (S2CFx.eid).
      this.broadcastFx({
        t: 'fx',
        kind: 'charge',
        x: pos.x,
        y: pos.y,
        radius: 1.5,
        eid,
        ticks: windup,
        id: ab.id,
        color: ab.color,
      });
    }
  }

  /**
   * The breath completes: pay the entry's full cooldown and run the
   * shape through the one interpreter. Ground shapes stake their
   * point NOW — 'target' at the quarry's feet, 'self' under the
   * caster, 'lead' along the quarry's last-seen stride (capped,
   * walkability-checked; a lead that lands in a wall falls back to
   * the feet). The shape's own fuse is the dodge window that
   * follows; the windup was the interrupt window that just closed.
   */
  private fireNpcCast(eid: EntityId, npc: NpcComp, tpos: { x: number; y: number }): void {
    const idx = npc.casting ? npc.casting.idx : -1;
    npc.casting = null;
    const entry = npc.def.kit?.[idx];
    if (!entry || !npc.kitCds) return;
    const ab = abilityDef(entry.ability);
    if (!ab) return;
    npc.kitCds[idx] = entry.cooldownTicks;
    const pos = this.positions.must(eid);
    const aim = Math.atan2(tpos.y - pos.y, tpos.x - pos.x);
    pos.dir = aim;
    let pt = { x: tpos.x, y: tpos.y };
    if (entry.aim === 'self') {
      pt = { x: pos.x, y: pos.y };
    } else if (entry.aim === 'lead') {
      const lx = npc.alertVelX * GameServer.NPC_LEAD_TICKS;
      const ly = npc.alertVelY * GameServer.NPC_LEAD_TICKS;
      const len = Math.hypot(lx, ly);
      const k = len > GameServer.NPC_LEAD_CAP ? GameServer.NPC_LEAD_CAP / len : 1;
      const px = tpos.x + lx * k;
      const py = tpos.y + ly * k;
      if (!circleHitsSolid(this.world, px, py, 0.3)) pt = { x: px, y: py };
    }
    this.setNpcPose(eid, npc, PoseState.Art, 10);
    this.castAbility(eid, ab, aim, 'onehand', npc.def.level, true, pt);
    // The howl carries further than sight: an AUTHORED rally
    // re-gathers a few more mid-fight — bounded like every cry, so
    // the camp never empties at once.
    if (entry.rally && npc.def.pack && npc.targetEid !== null) {
      this.rallyPack(eid, npc, npc.targetEid, PACK_RALLY_RANGE + 4, 3);
    }
  }

  /**
   * THE KIT's raising lane: spawn ephemeral bestiary adds around an
   * NPC summoner (the slime-split recipe — spawnIndex -1, no respawn,
   * born into the caster's fight). Capped ALIVE per caster; the dead
   * are pruned from the ledger before the count, so a slain add
   * frees its seat and the next raising answers.
   */
  private npcSummonAdds(
    casterEid: EntityId,
    ab: AbilityDef,
    level: number,
    pos: { x: number; y: number },
  ): void {
    const spec = ab.summonNpc;
    const caster = this.npcs.get(casterEid);
    if (!spec || !caster) return;
    const base = NPCS.get(spec.npc);
    if (!base) return;
    const alive = (caster.summonedEids ?? []).filter((e) => this.npcs.has(e));
    caster.summonedEids = alive;
    const cap = spec.capAlive ?? spec.count;
    const room = cap - alive.length;
    if (room <= 0) return;
    const lvl = Math.max(1, level + (spec.levelDelta ?? 0));
    const def = lvl === base.level ? base : scaleNpcDef(base, lvl);
    this.broadcastFx({
      t: 'fx',
      kind: 'summon',
      x: pos.x,
      y: pos.y,
      radius: 1.4,
      ticks: 30,
      id: ab.id,
      color: ab.color,
    });
    const n = Math.min(spec.count, room);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      let cx = pos.x;
      let cy = pos.y;
      for (let tries = 0; tries < 6; tries++) {
        const tx = pos.x + Math.cos(a + tries) * (0.8 + Math.random() * 0.6);
        const ty = pos.y + Math.sin(a + tries) * (0.8 + Math.random() * 0.6);
        if (!this.world.isSolid(Math.floor(tx), Math.floor(ty))) {
          cx = tx;
          cy = ty;
          break;
        }
      }
      const childEid = this.spawnNpc(def, cx, cy, -1);
      caster.summonedEids.push(childEid);
      const child = this.npcs.get(childEid)!;
      // Raised INTO the fight the raiser is in.
      if (caster.targetEid !== null) {
        this.npcAggro(childEid, child, caster.targetEid, { force: true });
      }
    }
  }

  /**
   * A broken breath (shock, leash, vanished quarry): the wind-up
   * refunds — only a RETRY cooldown lands, never the full price (a
   * champion whose every cast is broken is punished, not disabled).
   * The stance lets go at once; the charge simply stops re-emitting
   * and gutters on its own clock (the watcher's fizzle read).
   */
  private cancelNpcCast(eid: EntityId, npc: NpcComp): void {
    if (!npc.casting) return;
    const idx = npc.casting.idx;
    npc.casting = null;
    if (npc.kitCds && idx >= 0 && idx < npc.kitCds.length) {
      npc.kitCds[idx] = Math.max(npc.kitCds[idx] ?? 0, GameServer.NPC_CAST_RETRY_TICKS);
    }
    npc.poseUntilTick = this.tickCount;
    // The fizzle signal: charge with ticks 0 — the pip gutters, the
    // gather stops re-emitting and dies on its own clock.
    const entry = npc.def.kit?.[idx];
    const ab = entry ? abilityDef(entry.ability) : undefined;
    const pos = this.positions.get(eid);
    if (ab && pos) {
      this.broadcastFx({
        t: 'fx',
        kind: 'charge',
        x: pos.x,
        y: pos.y,
        radius: 0,
        eid,
        ticks: 0,
        id: ab.id,
        color: ab.color,
      });
    }
  }

  private tickNpcs(now: number): void {
    this.pathfindsLeft = GameServer.MAX_PATHFINDS_PER_TICK;
    for (const [eid, npc] of this.npcs) {
      const pos = this.positions.must(eid);
      if (npc.attackCooldown > 0) npc.attackCooldown--;
      if (npc.def.kit) {
        // Lazy seed (and re-seed after a CMS def swap changes the kit
        // shape) — the optional-bank idiom: no spawn literal grows.
        if (!npc.kitCds || npc.kitCds.length !== npc.def.kit.length) {
          npc.kitCds = npc.def.kit.map((k) => k.initialCooldownTicks ?? Math.min(k.cooldownTicks, 60));
        }
        for (let i = 0; i < npc.kitCds.length; i++) {
          const cd = npc.kitCds[i] ?? 0;
          if (cd > 0) npc.kitCds[i] = cd - 1;
        }
      }

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
      // Companions obey it the same as everyone (their branch sits
      // below on purpose — a shocked pet stands staggered too).
      if (this.isShocked(eid)) {
        npc.windupTicks = 0;
        // Shock is the interrupt school: a drawn breath gutters.
        this.cancelNpcCast(eid, npc);
        continue;
      }

      // THE WILD AT HEEL: a companion answers to its keeper, not to
      // the wild brain below — no perception, no wander, no states.
      // (Lays can't apply: the tame validator refuses livestock.)
      const pet = this.pets.get(eid);
      if (pet) {
        this.tickPet(eid, npc, pos, pet);
        continue;
      }

      // THE PERCEPTION PASS (cheap: peacetime bodies only, every 5
      // ticks, staggered). The eye replaced the circle — see
      // npcPerception. A body still sulking from an abandoned chase
      // keeps its eyes down — a direct hit re-arms it regardless,
      // through damageNpc.
      if (
        this.npcAtPeace(npc) &&
        // THE DROVER'S PEACE: a kept animal has no eyes for anyone —
        // a yard boar grazes where a wild one would charge.
        !this.livestock.has(eid) &&
        (npc.def.aggroRange > 0 || this.npcEnforcerFid(eid) !== null) &&
        this.tickCount >= npc.noAggroUntilTick &&
        (this.tickCount + eid) % GameServer.PERCEPTION_PERIOD === 0
      ) {
        this.npcPerception(eid, npc, pos);
      }

      let moveX = 0;
      let moveY = 0;

      if (npc.state === 'chase' && npc.targetEid !== null) {
        const tpos = this.npcTargetPos(npc.targetEid);
        const fromOrigin = Math.hypot(pos.x - npc.originX, pos.y - npc.originY);
        // THE EYE ON THE QUARRY, sampled at scan cadence: seen — the
        // ledger refreshes and the LKP rides the true position;
        // unseen past the grace — the chase breaks to a HUNT at the
        // last place the eye held it. Doors slammed, corners cut,
        // groves crossed: the environment finally pays out.
        let sightBroke = false;
        if (tpos && (this.tickCount + eid) % GameServer.PERCEPTION_PERIOD === 0) {
          const sdx = tpos.x - pos.x;
          const sdy = tpos.y - pos.y;
          const sdist = Math.hypot(sdx, sdy);
          // An enforcer's eye keeps the doc's enforcement circle in
          // the chase too — the posted 0 must not shrink retention.
          const watchBase = Math.max(
            npc.def.aggroRange,
            this.npcEnforcerFid(eid) !== null ? FACTIONS.enforcerAggro : 0,
          );
          const loseRange = Math.max(
            watchBase * SIGHT_RANGE_MULT * LOSE_SIGHT_FACTOR,
            npc.def.attackRange + 6,
            SIGHT_CLOSE_RANGE,
          );
          const seen =
            sdist <= loseRange &&
            sightVisibility(sightLine(this.world, pos.x, pos.y, tpos.x, tpos.y)) > 0;
          if (seen) {
            // A fresh pair of sightings yields the quarry's stride —
            // the "he went that way" a broken chase projects along.
            const dtT = this.tickCount - npc.alertSeenTick;
            if (dtT > 0 && dtT <= 15) {
              npc.alertVelX = (tpos.x - npc.alertX) / dtT;
              npc.alertVelY = (tpos.y - npc.alertY) / dtT;
            }
            npc.alertSeenTick = this.tickCount;
            npc.alertX = tpos.x;
            npc.alertY = tpos.y;
          } else if (this.tickCount - npc.alertSeenTick >= GameServer.LOSE_SIGHT_TICKS) {
            sightBroke = true;
          }
        }
        if (fromOrigin > npc.def.leashRange) {
          npc.state = 'return';
          npc.targetEid = null;
          npc.windupTicks = 0;
          this.cancelNpcCast(eid, npc);
          npc.navBest = Infinity;
          npc.navStuck = 0;
        } else if (!tpos || sightBroke) {
          // The quarry vanished — melted into stealth, slipped the
          // eye, logged off, or the decoy burst. Nobody shrugs at
          // that: hunt the last-known ground before walking home.
          this.npcStartSearch(eid, npc);
        } else {
          const dx = tpos.x - pos.x;
          const dy = tpos.y - pos.y;
          const dist = Math.hypot(dx, dy);

          // THE KIT: when the hands are free and the quarry stands in
          // view (no casting at ghosts — the basic-swing law), pick an
          // eligible voice. Wind-up entries plant the body below;
          // windup-0 entries fire on the spot (the old special).
          if (
            !npc.casting &&
            npc.windupTicks === 0 &&
            npc.def.kit &&
            this.tickCount - npc.alertSeenTick <= GameServer.PERCEPTION_PERIOD
          ) {
            const pick = this.pickKitEntry(eid, npc, dist);
            if (pick >= 0) this.beginNpcCast(eid, npc, pick, tpos);
          }

          if (npc.casting) {
            // THE FOE'S BREATH: planted, eyes tracking the quarry,
            // counting the wind down. The plant IS the counterplay
            // window — wail on it, shock it, or leave the ring it is
            // about to stake. The charge re-emits on the overlapping
            // window with a contracting reach (ONE VOICE with the
            // player engine): the read sharpens exactly as the dodge
            // window closes.
            pos.dir = Math.atan2(dy, dx);
            npc.casting.ticksLeft--;
            if (npc.casting.ticksLeft <= 0) {
              this.fireNpcCast(eid, npc, tpos);
            } else if (this.tickCount % 10 === 0) {
              const centry = npc.def.kit?.[npc.casting.idx];
              const cab = centry ? abilityDef(centry.ability) : undefined;
              if (cab) {
                this.broadcastFx({
                  t: 'fx',
                  kind: 'charge',
                  x: pos.x,
                  y: pos.y,
                  radius: Math.max(0.5, 1.5 * (npc.casting.ticksLeft / npc.casting.total)),
                  eid,
                  ticks: npc.casting.ticksLeft,
                  id: cab.id,
                  color: cab.color,
                });
              }
            }
          } else if (npc.windupTicks > 0) {
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
                  maxHit: npcMaxHit(npc.def.damage, npc.def.level),
                  attackerLevel: npc.def.level,
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
                  // THE THREAT LAW: the die is carried by the level; the
                  // 0-roll whiff below is deliberate and stays.
                  const hit = npcMaxHit(npc.def.damage, npc.def.level);
                  this.npcStrike(eid, npc, npc.targetEid, Math.floor(Math.random() * (hit + 1)));
                }
              }
            }
          } else if (
            npc.def.standoff !== undefined &&
            dist < npc.def.standoff + 1.2 &&
            this.tickCount - npc.alertSeenTick <= GameServer.PERCEPTION_PERIOD
          ) {
            // THE STANDOFF CASTER: hold the preferred distance — back
            // away inside it, plant at it, and let the ranged basic
            // and the kit speak. The counterplay is the corner: a
            // backpedaling caster runs out of ground.
            pos.dir = Math.atan2(dy, dx);
            if (dist < npc.def.standoff - 0.5) {
              moveX = -dx / dist;
              moveY = -dy / dist;
            }
            if (npc.def.ranged && npc.attackCooldown === 0 && dist <= npc.def.attackRange + 0.3) {
              npc.attackCooldown = npc.def.attackCooldownTicks;
              npc.windupTicks = 8;
              this.setNpcPose(eid, npc, PoseState.Attack, 10);
            }
          } else if (
            npc.def.ranged &&
            dist < 2.2 &&
            this.tickCount - npc.alertSeenTick <= GameServer.PERCEPTION_PERIOD
          ) {
            // Throwers back away from anything closing the gap.
            pos.dir = Math.atan2(dy, dx);
            moveX = -dx / dist;
            moveY = -dy / dist;
            if (npc.attackCooldown === 0 && dist <= npc.def.attackRange + 0.3) {
              npc.attackCooldown = npc.def.attackCooldownTicks;
              npc.windupTicks = 8;
              this.setNpcPose(eid, npc, PoseState.Attack, 10);
            }
          } else if (
            dist <= npc.def.attackRange + 0.3 &&
            this.tickCount - npc.alertSeenTick <= GameServer.PERCEPTION_PERIOD
          ) {
            // NO SWINGING AT GHOSTS: a new windup wants the quarry
            // actually in view — an unseen body a wall away is a
            // spot on a map, not a thing you can hit.
            pos.dir = Math.atan2(dy, dx);
            if (npc.attackCooldown === 0) {
              npc.attackCooldown = npc.def.attackCooldownTicks;
              // Telegraph: wind up before striking (throws wind longer).
              npc.windupTicks = npc.def.ranged ? 8 : 6;
              this.setNpcPose(eid, npc, PoseState.Attack, npc.def.ranged ? 10 : 8);
            }
          } else {
            // Navigate, don't beeline: the steer fan in the open, a
            // budgeted A* lane around anything the fan can't round —
            // buildings, rock pockets, fence lines. THE HONEST
            // PURSUIT: while the quarry stands in view the legs
            // chase the quarry; the moment the eye loses them the
            // legs run to WHERE THEY WERE LAST SEEN — never the
            // true position the server knows and the body doesn't.
            // Reaching that corner with nothing there is exactly
            // how the grace runs out and the hunt begins.
            const blind = this.tickCount - npc.alertSeenTick > GameServer.PERCEPTION_PERIOD;
            const gx = blind ? npc.alertX : tpos.x;
            const gy = blind ? npc.alertY : tpos.y;
            const h = this.npcNavToward(npc, pos, gx, gy);
            moveX = h.mx;
            moveY = h.my;
            // Stall watch, closest-approach law: only a STATIONARY
            // target counts — a fleeing player re-baselines the ledger
            // every stride, so open-field pursuit can never trip it.
            // Lane-aware yardstick: a proven lane rounding a building
            // counts remaining lane length, so the leg of the detour
            // that walks AWAY from the target is not "stalling".
            const prog = this.navProgressDist(npc, pos, gx, gy);
            if (prog.freshLane) npc.navBest = Infinity;
            if (Math.hypot(gx - npc.navRefX, gy - npc.navRefY) > 0.6) {
              npc.navRefX = gx;
              npc.navRefY = gy;
              npc.navBest = prog.dist;
              npc.navStuck = 0;
            } else if (prog.dist < npc.navBest - 0.15) {
              npc.navBest = prog.dist;
              npc.navStuck = 0;
            } else if (++npc.navStuck >= GameServer.CHASE_STALL_TICKS) {
              // The target is unreachable — parked behind a fence or a
              // tree pocket the fan can't round. Give up, leash home
              // (which heals), and sulk: the trap stops paying.
              npc.state = 'return';
              npc.targetEid = null;
              npc.windupTicks = 0;
              npc.navBest = Infinity;
              npc.navStuck = 0;
              npc.noAggroUntilTick = this.tickCount + GameServer.NO_AGGRO_TICKS;
            }
          }
        }
      } else if (npc.state === 'seekhelp') {
        // The craven run: still bound to the quarry and the leash,
        // but the legs belong to the errand — reach the packmate,
        // shout, and wheel back into the fight.
        const tpos = npc.targetEid !== null ? this.npcTargetPos(npc.targetEid) : null;
        const fromOrigin = Math.hypot(pos.x - npc.originX, pos.y - npc.originY);
        if (!tpos || npc.targetEid === null || fromOrigin > npc.def.leashRange) {
          // The quarry vanished (or the run outran the leash): the
          // errand dies with the chase.
          npc.state = 'return';
          npc.targetEid = null;
          npc.helpEid = null;
          npc.navBest = Infinity;
          npc.navStuck = 0;
        } else {
          const helper = npc.helpEid !== null ? this.npcs.get(npc.helpEid) : undefined;
          const hpos = npc.helpEid !== null ? this.positions.get(npc.helpEid) : undefined;
          const hd = hpos ? Math.hypot(hpos.x - pos.x, hpos.y - pos.y) : Infinity;
          if (!helper || !hpos || helper.state !== 'idle' || hd < 2.2 || this.tickCount >= npc.helpUntilTick) {
            // Arrived — or the companion moved, died, or joined on its
            // own, or the run dragged on: the cry goes up right here.
            this.npcCryHelp(eid, npc, npc.targetEid);
          } else {
            const h = this.npcNavToward(npc, pos, hpos.x, hpos.y);
            moveX = h.mx;
            moveY = h.my;
            // Closest-approach watchdog, same law as the homeward walk:
            // a run that stops closing has hit something the fan can't
            // round — shout from here rather than pace a fence forever.
            const prog = this.navProgressDist(npc, pos, hpos.x, hpos.y);
            if (prog.freshLane) npc.navBest = Infinity;
            if (prog.dist < npc.navBest - 0.15) {
              npc.navBest = prog.dist;
              npc.navStuck = 0;
            } else if (++npc.navStuck >= GameServer.RETURN_STALL_TICKS) {
              this.npcCryHelp(eid, npc, npc.targetEid);
            }
          }
        }
      } else if (npc.state === 'suspicious') {
        // Something at the edge of sense: plant the feet, face the
        // last-known spot, and let the meter decide — engage (the
        // perception pass owns that door), go and look, or shrug.
        pos.dir = Math.atan2(npc.alertY - pos.y, npc.alertX - pos.x);
        if (npc.alert < ALERT_SUS * 0.6) {
          npc.state = 'idle';
        } else if (this.tickCount >= npc.huntUntilTick) {
          // The stare didn't settle it. Go and see.
          npc.state = 'investigate';
          npc.huntUntilTick = this.tickCount + GameServer.INVESTIGATE_TICKS;
          npc.huntWps = null;
          npc.huntIdx = 0;
          npc.huntWaitUntilTick = 0;
          npc.standTicks = 0;
          npc.navBest = Infinity;
          npc.navStuck = 0;
          npc.steer.side = 0;
          npc.steer.ticks = 0;
          npc.nav = null;
          npc.progressLane = null;
          npc.nextRepathTick = 0;
          npc.losUntilTick = 0;
        }
      } else if (npc.state === 'investigate' || npc.state === 'search') {
        // THE HUNT: walk to the last-known ground, then a ring of
        // second looks, then give it up. The leash binds hunts like
        // it binds chases; the give-up clock binds them harder.
        const fromOrigin = Math.hypot(pos.x - npc.originX, pos.y - npc.originY);
        if (this.tickCount >= npc.huntUntilTick || fromOrigin > npc.def.leashRange) {
          this.npcEndHunt(npc);
        } else if (this.tickCount < npc.huntWaitUntilTick) {
          // A leg's dwell: stand and sweep the gaze — the slow turn
          // reads as searching AND genuinely swings the cone.
          pos.dir += 0.05;
        } else {
          const goal =
            npc.huntWps === null
              ? { x: npc.alertX, y: npc.alertY }
              : npc.huntWps[npc.huntIdx];
          if (!goal) {
            this.npcEndHunt(npc);
          } else {
            const gd = Math.hypot(goal.x - pos.x, goal.y - pos.y);
            const interestInView =
              this.tickCount - npc.alertSeenTick <= GameServer.PERCEPTION_PERIOD * 2;
            if (
              npc.state === 'investigate' &&
              npc.huntWps === null &&
              interestInView &&
              gd < GameServer.WATCH_STANDOFF
            ) {
              // THE WARY STANDOFF: it walked over, it can SEE the
              // stranger, and the sizing-up law hasn't opened the
              // engage circle — so it plants at a respectful few
              // tiles and stares. But the stare is a fuse, not a
              // post: hold a hostile's gaze long enough and THE
              // NERVE BREAKS — it commits through the one aggro
              // door. Without this, a quarry whose engage circle
              // shrank under the standoff range could stand nose to
              // nose with a "?" forever and charge a free swing.
              pos.dir = Math.atan2(npc.alertY - pos.y, npc.alertX - pos.x);
              if (
                ++npc.standTicks >= GameServer.STANDOFF_NERVE_TICKS + ((eid * 7) % 20) &&
                npc.alertEid !== null &&
                this.players.has(npc.alertEid) &&
                this.tickCount >= npc.noAggroUntilTick
              ) {
                this.npcAggro(eid, npc, npc.alertEid);
              }
            } else if (gd < 0.8) {
              npc.standTicks = 0;
              this.npcNextHuntLeg(eid, npc);
            } else {
              npc.standTicks = 0;
              const h = this.npcNavToward(npc, pos, goal.x, goal.y);
              moveX = h.mx;
              moveY = h.my;
              // Closest-approach watchdog, homeward law: a leg that
              // stops closing is sealed off — skip to the next look.
              const prog = this.navProgressDist(npc, pos, goal.x, goal.y);
              if (prog.freshLane) npc.navBest = Infinity;
              if (prog.dist < npc.navBest - 0.15) {
                npc.navBest = prog.dist;
                npc.navStuck = 0;
              } else if (++npc.navStuck >= GameServer.RETURN_STALL_TICKS) {
                this.npcNextHuntLeg(eid, npc);
              }
            }
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
          // A fresh life makes the craven choice fresh too.
          npc.helpCalled = false;
          npc.helpEid = null;
          // The walk home cools the blood: the meter settles under
          // the suspicious line, so the next sighting climbs the
          // ladder honestly instead of detonating a stale 100.
          npc.alert = Math.min(npc.alert, ALERT_SUS - 5);
          npc.alertEid = null;
        } else {
          // The walk home is the body's own errand: it may search WIDE
          // when the cheap lane can't complete (a long wall between
          // the fight and home), so the leash resolves by walking
          // around instead of the last-resort snap.
          const h = this.npcNavToward(npc, pos, npc.originX, npc.originY, true);
          moveX = h.mx;
          moveY = h.my;
          // A homeward walk that stalls out (closest-approach law) has
          // exhausted the fan — snap the rest, the classic leash reset.
          const prog = this.navProgressDist(npc, pos, npc.originX, npc.originY);
          if (prog.freshLane) npc.navBest = Infinity;
          if (prog.dist < npc.navBest - 0.15) {
            npc.navBest = prog.dist;
            npc.navStuck = 0;
          } else if (++npc.navStuck >= GameServer.RETURN_STALL_TICKS) {
            pos.x = npc.originX;
            pos.y = npc.originY;
            this.updateChunkMembership(eid);
            npc.navBest = Infinity;
            npc.navStuck = 0;
          }
        }
      } else if (this.actors.has(eid)) {
        // Posted actors hold their spot: the wander drift belongs to
        // beasts. A guard leaves the arch only to fight, and 'return'
        // walks it back to the post it was placed on.
      } else if (npc.patrol) {
        // The sentry's round: walk a leg, linger, move on. Idle-body
        // law holds — this branch only runs when combat isn't using
        // the body, and each reached waypoint re-pins origin so a
        // chase leashes back to the round, not the morning post.
        const p = npc.patrol;
        if (this.tickCount >= p.waitUntilTick) {
          const wp = p.pts[p.idx]!;
          const dx = wp.x - pos.x;
          const dy = wp.y - pos.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 0.6) {
            npc.originX = wp.x;
            npc.originY = wp.y;
            p.idx = (p.idx + 1) % p.pts.length;
            p.waitUntilTick = this.tickCount + 40 + Math.floor(Math.random() * 100);
            npc.navBest = Infinity;
            npc.navStuck = 0;
          } else {
            // A patrol leg is the sentry's own errand — escalate the
            // search rather than skip the leg when a long wall stands
            // between rounds.
            const h = this.npcNavToward(npc, pos, wp.x, wp.y, true);
            moveX = h.mx;
            moveY = h.my;
            // A blocked leg skips its waypoint — the closest-approach
            // watchdog is a corner-wedge escape, never a pathfinder.
            const prog = this.navProgressDist(npc, pos, wp.x, wp.y);
            if (prog.freshLane) npc.navBest = Infinity;
            if (prog.dist < npc.navBest - 0.15) {
              npc.navBest = prog.dist;
              npc.navStuck = 0;
            } else if (++npc.navStuck >= GameServer.RETURN_STALL_TICKS) {
              p.idx = (p.idx + 1) % p.pts.length;
              npc.navBest = Infinity;
              npc.navStuck = 0;
            }
          }
        }
      } else if (this.tickCount < npc.holdUntilTick) {
        // Hands on the flank: a milked animal plants its feet — no
        // wander roll, no origin pull, until the milker lets go.
      } else {
        // THE WILD PARTS (THE KEEPER'S TONGUE, rank IV of the truce):
        // a beast at rest eases aside as a walker under the parted
        // quiet passes — never shoved, just yielding the ground.
        let parted = false;
        const wildHere = isWildBeast(npc.def) && !isBeastSovereign(npc.def);
        if (wildHere) {
          for (const [wEid, walker] of this.players) {
            if (walker.session === null && walker.disconnectedAt !== null) continue;
            const pr = beastPartRadius(walker, this.tickCount);
            if (pr <= 0) continue;
            const wpos = this.positions.get(wEid);
            if (!wpos) continue;
            const pd = Math.hypot(pos.x - wpos.x, pos.y - wpos.y);
            if (pd > pr || pd < 0.01) continue;
            moveX = ((pos.x - wpos.x) / pd) * 0.5;
            moveY = ((pos.y - wpos.y) / pd) * 0.5;
            parted = true;
            break;
          }
        }
        // THE STREWN TABLE: a laid bait draws the wild at rest to come
        // and nose it. It pulls, never breaks — only this idle branch
        // answers, a blood-up chase does not care about supper — and
        // the leash stays honest: no table drags a beast off its range.
        const bait = !parted && wildHere ? this.baitNear(pos, npc) : null;
        if (bait) {
          const bd = Math.hypot(bait.x - pos.x, bait.y - pos.y);
          if (bd > 1.1) {
            // The walk to the table navigates like a hunt leg — a
            // straight vector wedged the very first hind against a
            // tree line and left it standing forever (live-caught).
            const h = this.npcNavToward(npc, pos, bait.x, bait.y);
            moveX = h.mx;
            moveY = h.my;
          } else {
            // Nosing the ground: feet planted, head at the supper —
            // and a rank IV table calms its guests while they eat.
            pos.dir = Math.atan2(bait.y - pos.y, bait.x - pos.x);
            if (bait.power > 0) {
              npc.noAggroUntilTick = Math.max(npc.noAggroUntilTick, this.tickCount + 30);
            }
          }
        } else if (!parted) {
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
      }

      if (moveX !== 0 || moveY !== 0) {
        // A craven runner flees at full chase speed — a stroll to
        // fetch friends would read as a bug, not a plan. A hunter
        // moves with purpose; an investigator only walks over to
        // look; everything else ambles.
        let speed = npc.def.speed * 0.6;
        if (npc.state === 'chase' || npc.state === 'seekhelp') speed = npc.def.speed;
        else if (npc.state === 'search') speed = npc.def.speed * 0.85;
        else if (npc.state === 'investigate') speed = npc.def.speed * 0.7;
        if (this.isChilled(eid)) speed *= CHILL_SPEED_FACTOR;
        // The polite step-aside: converging packmates fan out around
        // a target instead of stacking into one sprite; a returning
        // wanderer eases around whoever it meets.
        ({ mx: moveX, my: moveY } = this.separateHeading(eid, pos, npc.def.radius, moveX, moveY));
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
      if (
        (npc.state === 'chase' || npc.state === 'seekhelp') &&
        npc.targetEid !== null &&
        this.players.has(npc.targetEid)
      ) {
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
      let bestNpc: NpcComp | null = null;
      for (const [npcEid, npc] of this.npcs) {
        if (npc.def.aggroRange <= 0 || npc.def.damage <= 0) continue;
        if ((npc.state === 'chase' || npc.state === 'seekhelp') && npc.targetEid === eid) continue;
        const npos = this.positions.get(npcEid);
        if (!npos) continue;
        const dist = Math.hypot(npos.x - pos.x, npos.y - pos.y);
        if (dist > SNEAK_XP_RADIUS) continue;
        // Closer and stronger threats teach more — until this body has
        // taught this watcher all it knows (THE CASED CAMP,
        // shared/sim/sneak.ts): the pulse offers only what remains.
        const xp = Math.min(25, Math.ceil(npc.def.level * (1.25 - dist / SNEAK_XP_RADIUS)));
        const cap = npc.def.level * SNEAK_CASE_CAP_PER_LEVEL;
        const avail = Math.min(xp, cap - (npc.casedMarks?.get(eid) ?? 0));
        if (avail > best) {
          best = avail;
          bestNpc = npc;
        }
      }
      if (best > 0 && bestNpc) {
        (bestNpc.casedMarks ??= new Map()).set(eid, (bestNpc.casedMarks.get(eid) ?? 0) + best);
        this.grantXp(eid, player, 'sneak', best);
      }
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
    if (!hasSpaceFor(player.inventory, drop.item, drop.stolen)) {
      sys('Your pack has no room for that.');
      return;
    }
    // A non-stackable pile can be bigger than the pack's free slots —
    // take what fits and leave the rest lying where it was.
    const got = addItem(player.inventory, drop.item, drop.qty, drop.roll, drop.stolen);
    if (got === 0) {
      sys('Your pack has no room for that.');
      return;
    }
    if (drop.xpOnPickup) {
      this.grantXp(eid, player, drop.xpOnPickup.skill, drop.xpOnPickup.xp);
      drop.xpOnPickup = undefined;
    }
    player.session.sendJson({ t: 'inv', slots: player.inventory });
    if (got < drop.qty) {
      drop.qty -= got;
      sys('Your pack is full — the rest stays where it fell.');
      return;
    }
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
        if (!hasSpaceFor(player.inventory, drop.item, drop.stolen)) continue;
        // Partial fits leave the remainder on the ground — the vacuum
        // must never destroy more than the pack actually held.
        const got = addItem(player.inventory, drop.item, drop.qty, drop.roll, drop.stolen);
        if (got === 0) continue;
        if (drop.xpOnPickup) {
          this.grantXp(playerEid, player, drop.xpOnPickup.skill, drop.xpOnPickup.xp);
          drop.xpOnPickup = undefined;
        }
        player.session.sendJson({ t: 'inv', slots: player.inventory });
        if (got < drop.qty) {
          drop.qty -= got;
          break;
        }
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
        break;
      }
    }
    // Gravestones sink when the spill's quarter hour runs out.
    for (const [eid, grave] of this.graves) {
      if (grave.despawnAt <= now) {
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
      }
    }
    // The walk-back beacon retires itself: arrival within reach of the
    // stone (the skull's promise is kept), or the clock running out.
    for (const [playerEid, player] of this.players) {
      if (player.session === null) continue;
      const mark = this.deathMarks.get(player.characterId);
      if (!mark) continue;
      let clear = mark.until <= now;
      if (!clear) {
        const ppos = this.positions.get(playerEid);
        if (ppos && Math.hypot(ppos.x - mark.x, ppos.y - mark.y) <= 4) clear = true;
      }
      if (clear) {
        this.deathMarks.delete(player.characterId);
        player.session.sendJson({ t: 'deathmark' });
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
        sys(
          best.info.material === 'fence' || best.info.material === 'palisade'
            ? 'Close the gate before locking it.'
            : 'Close the door before locking it.',
        );
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
    // /recall (or /home) — the hearth pull: carry the body back to the
    // claimed home bed. A player feature, not dev-gated. Out of combat
    // only, and the hearth rests ten minutes between recalls.
    if (text.trim() === '/recall' || text.trim() === '/home') {
      const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (!player.home) {
        sys('You have no home yet — walk up to a bed and interact with it to claim one.');
        return;
      }
      const now = Date.now();
      if (now - player.lastCombatAt < 8000) {
        sys('The hearth cannot reach you in the heat of battle — break away from combat first.');
        return;
      }
      const left = player.hearthAt + GameServer.HEARTH_CD_MS - now;
      if (left > 0) {
        const mins = Math.floor(left / 60000);
        const secs = Math.ceil((left % 60000) / 1000);
        sys(
          `The hearth still gathers its strength — ready in ${mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}.`,
        );
        return;
      }
      const bedside = this.homeBedside(player);
      if (!bedside) {
        sys(
          player.home
            ? 'Your bed is walled in — there is no floor beside it to wake on.'
            : 'Your bed is gone — claim another to recall again.',
        );
        return;
      }
      const pos = this.positions.get(eid);
      const fromInstance = pos !== undefined && pos.y >= 8192;
      this.teleport(eid, bedside.x, bedside.y);
      // Recalling out of a personal dungeon ends the run, same as
      // walking its exit portal.
      if (fromInstance) this.teardownDungeon(player.characterId);
      player.hearthAt = now;
      if (player.characterId > 0) this.accounts.saveHearthAt(player.characterId, now);
      sys('The world folds around you — you are home.');
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
    if (config.devCommands && text.startsWith('/settile ')) {
      // Rig fixture brush: /settile <tileId> <w> <h> [gapX gapY] fills
      // a rectangle of tiles south-east of the player through the one
      // setWorldTile door (patches stream like any build). Gaps carve
      // walkable lanes so dense prop fields stay traversable.
      const [, idRaw, wRaw, hRaw, gxRaw, gyRaw] = text.split(/\s+/);
      const tile = Number.parseInt(idRaw ?? '', 10);
      const w = Math.min(64, Number.parseInt(wRaw ?? '1', 10) || 1);
      const h = Math.min(64, Number.parseInt(hRaw ?? '1', 10) || 1);
      const gapX = Number.parseInt(gxRaw ?? '0', 10) || 0;
      const gapY = Number.parseInt(gyRaw ?? '0', 10) || 0;
      const pos = this.positions.get(eid);
      if (pos && Number.isFinite(tile)) {
        const tx0 = Math.floor(pos.x) + 2;
        const ty0 = Math.floor(pos.y) + 2;
        let n = 0;
        for (let dy = 0; dy < h; dy++) {
          if (gapY > 0 && dy % (gapY + 1) === gapY) continue;
          for (let dx = 0; dx < w; dx++) {
            if (gapX > 0 && dx % (gapX + 1) === gapX) continue;
            this.world.ensure(
              Math.floor((tx0 + dx) / CHUNK_SIZE),
              Math.floor((ty0 + dy) / CHUNK_SIZE),
            );
            this.setWorldTile(tx0 + dx, ty0 + dy, tile as Tile);
            n++;
          }
        }
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Set ${n} tiles of ${tile} at ${tx0},${ty0}.`,
        });
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
    if (config.devCommands && (text === '/grow' || text.startsWith('/grow '))) {
      const pos = this.positions.get(eid);
      const now = Date.now();
      let grown = 0;
      for (const state of this.crops.values()) {
        if (pos && Math.hypot(state.tx + 0.5 - pos.x, state.ty + 0.5 - pos.y) > 20) continue;
        const remaining = growMs(state.def) - this.cropElapsed(state, now);
        if (remaining <= 0) continue;
        state.boostMs += remaining;
        this.saveCrop(state);
        grown++;
      }
      // THE LIVING SOIL: the same lever hurries a working compost
      // batch to done (dev worlds cannot wait half an hour on a heap).
      let turned = 0;
      for (const bin of this.farmBins.values()) {
        if (pos && Math.hypot(bin.tx + 0.5 - pos.x, bin.ty + 0.5 - pos.y) > 20) continue;
        if (bin.startedAt === 0 || now >= bin.startedAt + COMPOST_MINUTES * 60_000) continue;
        bin.startedAt = now - COMPOST_MINUTES * 60_000;
        this.accounts.upsertFarmBin(bin.tx, bin.ty, bin.fill, bin.graded, bin.startedAt);
        this.mirrorBin(bin);
        turned++;
      }
      // THE ANIMALS OF THE YARD: and hurries every nearby udder,
      // fleece, and snout to ready (same dev-world mercy).
      for (const [stockEid, comp] of this.livestock) {
        const spos = this.positions.get(stockEid);
        if (!spos || (pos && Math.hypot(spos.x - pos.x, spos.y - pos.y) > 20)) continue;
        const npc2 = this.npcs.get(stockEid);
        if (!npc2 || now >= npc2.nextProduceAt) continue;
        npc2.nextProduceAt = now;
        comp.row.nextProduceAt = now;
        this.accounts.saveLivestock(comp.row);
      }
      // THE WORKING YARD: and matures every nearby batch and hive.
      for (const job of this.farmJobs.values()) {
        if (pos && Math.hypot(job.tx + 0.5 - pos.x, job.ty + 0.5 - pos.y) > 20) continue;
        const recipe = WORK_RECIPES.get(job.recipe);
        if (!recipe || job.qty <= 0) continue;
        job.startedAt = now - recipe.minutes * 60_000 * job.qty;
        this.accounts.upsertStationJob(job.tx, job.ty, job.recipe, job.qty, job.startedAt, job.grade, job.owner);
        this.mirrorJob(job);
      }
      for (const hive of this.farmApiaries.values()) {
        if (pos && Math.hypot(hive.tx + 0.5 - pos.x, hive.ty + 0.5 - pos.y) > 20) continue;
        hive.since = now - APIARY_MINUTES * 60_000 * APIARY_STORE_CAP;
        this.accounts.upsertFarmApiary(hive.tx, hive.ty, hive.since);
        this.mirrorApiary(hive.tx, hive.ty, hive.since);
      }
      this.tickCrops(now);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Ripened ${grown} crops${turned > 0 ? `, hurried ${turned} bins` : ''}.`,
      });
      return;
    }
    if (config.devCommands && (text === '/clearfarm' || text.startsWith('/clearfarm '))) {
      // THE PROVING GROUND: level a radius to bare grass — crops,
      // bins, troughs, and built tiles all cleared. Dev worlds only;
      // the harness stages on virgin ground instead of playing the
      // terrain lottery (10-minute suites died of that lottery).
      const pos = this.positions.get(eid);
      if (!pos) return;
      const r = Math.min(16, Math.max(2, Number(text.split(/\s+/)[1]) || 8));
      const cx = Math.floor(pos.x);
      const cy = Math.floor(pos.y);
      let cleared = 0;
      for (let ty = cy - r; ty <= cy + r; ty++) {
        for (let tx = cx - r; tx <= cx + r; tx++) {
          const key = `${tx},${ty}`;
          if (this.crops.has(key)) {
            this.crops.delete(key);
            this.accounts.deleteCrop(tx, ty);
            this.world.unregisterCropTile(tx, ty);
            for (const s of this.sessions) s.sendJson({ t: 'farm', remove: [{ tx, ty }] });
          }
          if (this.farmBins.has(key)) {
            this.farmBins.delete(key);
            this.accounts.deleteFarmBin(tx, ty);
            this.mirrorBin({ tx, ty, fill: 0, graded: 0, startedAt: 0 });
          }
          if (this.farmTroughs.has(key)) {
            this.farmTroughs.delete(key);
            this.accounts.deleteFarmTrough(tx, ty);
            this.mirrorTrough({ tx, ty, feed: 0 });
          }
          if (this.world.builtAt(tx, ty)) {
            this.world.unregisterBuilt(tx, ty);
            this.accounts.deleteBuiltTile(tx, ty);
            this.ringCache = null;
    this.capitalCache?.clear();
          }
          const g = this.world.groundAt(tx, ty);
          if (g !== undefined && g !== Tile.Grass) {
            this.setWorldTile(tx, ty, Tile.Grass);
            cleared++;
          }
        }
      }
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Cleared ${cleared} tiles to grass (r=${r}).`,
      });
      return;
    }
    if (config.devCommands && text.startsWith('/proc')) {
      // /proc <action> [element] — wake a working on the spot.
      //
      // THE DEEPER SIGIL ships its engine before its roster, so this is
      // how the whole path (action → fx → floaty → sound) is exercised
      // in a real session while enchants.ts still carries no procs. It
      // fires runProc DIRECTLY, so it deliberately proves nothing about
      // triggers, rest timers, or meters — those are pinned by tests.
      const [, actionRaw, elemRaw] = text.split(/\s+/);
      const pos = this.positions.get(eid);
      const action = actionRaw ? DEV_PROC_ACTIONS[actionRaw] : undefined;
      if (!pos || !action) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Workings: ${Object.keys(DEV_PROC_ACTIONS).join(', ')}`,
        });
        return;
      }
      const element = (elemRaw && elemRaw in ELEMENT_COLORS ? elemRaw : 'arcane') as ArxElement;
      const target = this.npcsWithin(pos.x, pos.y, 8)[0];
      const tp = target !== undefined ? this.positions.get(target) : undefined;
      this.runProc(
        eid,
        player,
        {
          kind: 'proc',
          id: `dev_${actionRaw}`,
          name: 'Dev Working',
          trigger: { on: 'crit' },
          action,
          icd: 20,
          element,
        },
        { x: tp?.x ?? pos.x, y: tp?.y ?? pos.y, targetEid: target, style: 'arx' },
      );
      return;
    }
    if (config.devCommands && text.startsWith('/mount')) {
      // /mount            — list mounts and what's owned
      // /mount <id>       — grant + choose + saddle up (the dev whistle)
      // /mount off        — boots on the ground
      const [, arg] = text.split(/\s+/);
      const pos = this.positions.get(eid);
      if (!arg) {
        const rows = MOUNTS.map(
          (m) => `${player.mountsOwned.has(m.id) ? '●' : '○'} ${m.id} (${m.speedMult}×)`,
        );
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Mounts: ${rows.join(', ')}${player.mountId ? ` — riding ${player.mountId}` : ''}`,
        });
        return;
      }
      if (arg === 'off') {
        this.dismount(eid, player);
        return;
      }
      const def = mountDef(arg);
      if (!def || !pos) {
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `No mount '${arg}'.` });
        return;
      }
      player.mountsOwned.add(def.id);
      player.mountChosen = def.id;
      player.rideSigSent = ''; // owned set changed — force the mirror
      this.dismount(eid, player); // switching beasts steps down first
      this.mountToggle(eid, player, pos);
      return;
    }
    if (config.devCommands && text.startsWith('/tame')) {
      // /tame               — list the tame roster and the household
      // /tame <species>     — grant a companion at heel (skips the gentling)
      // /tame drop <slot>   — release a stall (the stable door owns the real ceremony)
      // /tame heel <slot>   — the stable door's swap, penless (staging lever)
      const [, arg, arg2] = text.split(/\s+/);
      const say = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (!arg) {
        const roster = [...TAMES.keys()].join(', ');
        const held = player.pets
          .map((p) => `${p.slot}:${p.name} (${p.species}, ${p.state})`)
          .join(', ');
        say(`Tames: ${roster}. Stalls: ${held || 'empty'}.`);
        return;
      }
      if (arg === 'heel') {
        const slot = Number.parseInt(arg2 ?? '', 10);
        const row2 = player.pets.find((p) => p.slot === slot);
        if (!row2) {
          say(`No companion in stall ${arg2}.`);
          return;
        }
        const prevHeel = player.pets.find((p) => p.state === 'heel');
        if (prevHeel && prevHeel !== row2) {
          prevHeel.state = 'stabled';
          if (player.characterId > 0) this.accounts.savePetState(player.characterId, prevHeel.slot, 'stabled');
          this.despawnPetEntity(player);
        }
        row2.state = 'heel';
        row2.restedAt = null;
        if (player.characterId > 0) this.accounts.savePetRest(player.characterId, row2.slot, 'heel', null);
        player.petHp = null;
        this.trySpawnPet(eid, player);
        this.sendPet(player);
        say(`${row2.name} comes to your side.`);
        return;
      }
      if (arg === 'drop') {
        const slot = Number.parseInt(arg2 ?? '', 10);
        const idx = player.pets.findIndex((p) => p.slot === slot);
        if (idx < 0) {
          say(`No companion in stall ${arg2}.`);
          return;
        }
        const [row] = player.pets.splice(idx, 1);
        if (row!.state === 'heel') this.despawnPetEntity(player);
        if (player.characterId > 0) this.accounts.deletePet(player.characterId, row!.slot);
        say(`${row!.name} returns to the wild.`);
        this.sendPet(player);
        return;
      }
      const tame = tameDef(arg);
      if (!tame) {
        say(`No tame '${arg}'.`);
        return;
      }
      if (player.pets.length >= PET_CAP) {
        say('Your stalls are full. Three is a household.');
        return;
      }
      const used = new Set(player.pets.map((p) => p.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      const prev = player.pets.find((p) => p.state === 'heel');
      if (prev) {
        prev.state = 'stabled';
        if (player.characterId > 0) this.accounts.savePetState(player.characterId, prev.slot, 'stabled');
        this.despawnPetEntity(player);
      }
      const row: PetRow = {
        slot,
        species: tame.species,
        name: NPCS.get(tame.species)?.name ?? tame.species,
        xp: 0,
        state: 'heel',
        restedAt: null,
      };
      player.pets.push(row);
      if (player.characterId > 0) this.accounts.savePet(player.characterId, row, Date.now());
      player.petHp = null;
      player.petBondAt.delete(slot);
      this.trySpawnPet(eid, player);
      // Ceremony on purpose: the dev whistle exercises the naming card.
      this.sendPet(player, slot);
      return;
    }
    if (config.devCommands && text.startsWith('/petstate')) {
      // The companion lens: household rows + the live body's truth.
      const say = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      const pos2 = this.positions.get(eid);
      const rows = player.pets.map((p) => {
        const live = player.petEid !== null && this.pets.get(player.petEid)?.slot === p.slot;
        const ppos = live ? this.positions.get(player.petEid!) : null;
        const hp = live ? this.healths.get(player.petEid!) : null;
        const comp = live ? this.pets.get(player.petEid!) : null;
        const d = ppos && pos2 ? Math.hypot(ppos.x - pos2.x, ppos.y - pos2.y).toFixed(1) : null;
        const downLeft =
          comp && comp.downedUntil > this.tickCount ? ` down=${comp.downedUntil - this.tickCount}t` : '';
        const restLeft =
          p.state === 'resting' && p.restedAt !== null
            ? ` rest=${Math.max(0, Math.ceil((p.restedAt + PET_REST_HOME_MS - Date.now()) / 1000))}s`
            : '';
        // THE KEEPER'S TONGUE: live surge/guard windows, for the bench
        // and the proving harness both.
        const surgeLeft =
          comp?.surge && comp.surge.untilTick > this.tickCount
            ? ` surge=${comp.surge.untilTick - this.tickCount}t x${comp.surge.dmgMult}${comp.surge.temper ? ' temper' : ''}`
            : '';
        const guardLeft =
          comp?.guard && comp.guard.untilTick > this.tickCount
            ? ` guard=${comp.guard.untilTick - this.tickCount}t +${comp.guard.armor}`
            : '';
        return (
          `${p.slot}: ${p.name} (${p.species}) ${p.state}${restLeft}` +
          (live
            ? ` LIVE d=${d} hp=${hp?.hp}/${hp?.maxHp} tgt=${comp?.target ?? '-'}${downLeft}${surgeLeft}${guardLeft}`
            : '') +
          ` xp=${p.xp}`
        );
      });
      say(rows.length > 0 ? rows.join(' | ') + ` calm=${player.petCalmTicks}` : 'No companions.');
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
    if (config.devCommands && text.startsWith('/hang')) {
      // /hang <what> [tx ty] — THE SECOND LAYER's Playwright lever,
      // driving the REAL hang lane (register + persist + patch).
      // <what> = a raw detail id, or kind[:variant]: banner:3,
      // pennant:0, sign:2, trellis:1, basket, tapestry, crown, moon.
      // Default target: the tile one north (stand before the wall).
      const [, whatRaw, txRaw, tyRaw] = text.split(/\s+/);
      const pos = this.positions.get(eid);
      if (!pos) return;
      const tx = Number.isInteger(Number.parseInt(txRaw ?? '', 10))
        ? Number.parseInt(txRaw!, 10)
        : Math.floor(pos.x);
      const ty = Number.isInteger(Number.parseInt(tyRaw ?? '', 10))
        ? Number.parseInt(tyRaw!, 10)
        : Math.floor(pos.y) - 1;
      const [kind, variantRaw] = (whatRaw ?? '').split(':');
      const variant = Number.parseInt(variantRaw ?? '0', 10) || 0;
      let detail = Number.parseInt(kind ?? '', 10);
      if (!Number.isInteger(detail)) {
        try {
          detail =
            kind === 'banner'
              ? wallBannerDetail(variant)
              : kind === 'pennant'
                ? pennantDetail(variant)
                : kind === 'sign'
                  ? bracketSignDetail(variant)
                  : kind === 'trellis'
                    ? trellisDetail(variant)
                    : kind === 'basket'
                      ? Detail.WallBasket
                      : kind === 'tapestry'
                        ? Detail.Tapestry
                        : kind === 'crown'
                          ? Detail.BannerCrown
                          : kind === 'moon'
                            ? Detail.BannerMoon
                            : -1;
        } catch {
          detail = -1;
        }
      }
      if (wallHungInfo(detail) === null) {
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `Can't hang '${whatRaw}'.` });
        return;
      }
      if (this.hangDetail(eid, tx, ty, detail)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Hung detail ${detail} at ${tx},${ty}.`,
        });
      }
      return;
    }
    if (config.devCommands && text.startsWith('/unhang')) {
      // /unhang [tx ty] — take your own hanging down through the real
      // removal lane; the face's prior detail returns.
      const [, txRaw, tyRaw] = text.split(/\s+/);
      const pos = this.positions.get(eid);
      if (!pos) return;
      const tx = Number.isInteger(Number.parseInt(txRaw ?? '', 10))
        ? Number.parseInt(txRaw!, 10)
        : Math.floor(pos.x);
      const ty = Number.isInteger(Number.parseInt(tyRaw ?? '', 10))
        ? Number.parseInt(tyRaw!, 10)
        : Math.floor(pos.y) - 1;
      if (this.removeHanging(eid, tx, ty)) {
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Taken down at ${tx},${ty}.`,
        });
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
    if (config.devCommands && text.startsWith('/npcstate')) {
      // Nearby NPC combat brains, closest first — the aggro-debug lens.
      const pos = this.positions.get(eid);
      if (!pos) return;
      const rows: string[] = [];
      for (const [nEid, npc] of this.npcs) {
        const npos = this.positions.get(nEid);
        if (!npos) continue;
        const d = Math.hypot(npos.x - pos.x, npos.y - pos.y);
        if (d > 20) continue;
        const hp = this.healths.get(nEid);
        rows.push(
          `${npc.def.id}#${nEid} d=${d.toFixed(1)} ${npc.state} tgt=${npc.targetEid ?? '-'} ` +
          `hp=${hp?.hp}/${hp?.maxHp} alert=${Math.round(npc.alert)}@${npc.alertEid ?? '-'} ` +
          `sulk=${Math.max(0, npc.noAggroUntilTick - this.tickCount)} ` +
          `helpEid=${npc.helpEid ?? '-'} called=${npc.helpCalled}`,
        );
      }
      rows.sort();
      const send = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (rows.length === 0) send('No NPCs within 20 tiles.');
      for (const r of rows.slice(0, 12)) send(r);
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
    if (config.devCommands && text.startsWith('/dlgreload')) {
      if (!this.dialogueSource) return;
      void this.reloadDialogues()
        .then((fresh) => {
          const errs = fresh.errors.length > 0 ? `, ${fresh.errors.length} invalid` : '';
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `Dialogues reloaded: ${fresh.count}${errs}.`,
          });
        })
        .catch((err: Error) => console.error('[dlg]', err.message));
      return;
    }
    if (config.devCommands && text.startsWith('/routinereload')) {
      // /routinereload — swap in the DB's current routines, live.
      // Walking bodies re-resolve their schedule on the next tick.
      if (!this.routineSource) return;
      void this.routineSource()
        .then((fresh) => {
          this.routineDefs.clear();
          this.registerRoutines(fresh.routines);
          for (const [, rc] of this.routines) {
            const def = this.routineDefs.get(rc.def.id);
            if (def) {
              rc.def = def;
              rc.slot = -2; // force a fresh schedule resolve
            }
          }
          const errs = fresh.errors.length > 0 ? `, ${fresh.errors.length} invalid` : '';
          player.session?.sendJson({
            t: 'chat',
            channel: 'system',
            text: `Routines reloaded: ${fresh.routines.length}${errs}.`,
          });
        })
        .catch((err: Error) => console.error('[routine]', err.message));
      return;
    }
    if (config.devCommands && text.startsWith('/routines')) {
      // /routines — where is everyone in their day right now?
      const hours = clockHoursAtTick(this.tickCount, this.timeOfsTicks);
      const hh = Math.floor(hours);
      const mm = Math.floor((hours - hh) * 60);
      const lines: string[] = [`Routines at ${hh}:${String(mm).padStart(2, '0')} —`];
      for (const [eid, rc] of this.routines) {
        const actor = this.actors.get(eid)?.actor;
        const pos = this.positions.get(eid);
        const npc = this.npcs.get(eid);
        const task = this.routineTask(rc);
        const state =
          npc && npc.state !== 'idle'
            ? npc.state
            : this.tickCount < rc.pauseUntilTick
              ? 'paused'
              : rc.phase;
        const where = pos ? ` @ ${pos.x.toFixed(1)},${pos.y.toFixed(1)}` : '';
        const leg = task.kind === 'path' ? ` wp${rc.wpIndex}` : '';
        lines.push(
          `${actor?.name ?? '?'}: ${rc.def.id} slot ${rc.slot} ${task.kind}${leg} ${state}${where}`,
        );
      }
      if (this.routines.size === 0) lines.push('nobody keeps hours here');
      player.session?.sendJson({ t: 'chat', channel: 'system', text: lines.join('\n') });
      return;
    }
    if (config.devCommands && text.startsWith('/flagreset')) {
      // /flagreset [prefix] — wipe story flags (optionally by prefix,
      // e.g. `/flagreset dlg:` replays every one-time conversation).
      const prefix = text.slice('/flagreset'.length).trim();
      let n = 0;
      for (const flag of [...player.flags.keys()]) {
        if (prefix && !flag.startsWith(prefix)) continue;
        player.flags.delete(flag);
        if (player.characterId > 0) this.accounts.clearFlag(player.characterId, flag);
        n++;
      }
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Cleared ${n} flag${n === 1 ? '' : 's'}.`,
      });
      return;
    }
    if (config.devCommands && text.startsWith('/flag')) {
      // /flag — list; /flag <name> [value] — set; /flag <name> 0 — clear.
      const [, flag, valueRaw] = text.split(/\s+/);
      if (!flag) {
        const list = [...player.flags.keys()].sort().join(', ');
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: player.flags.size === 0 ? 'No flags set.' : `Flags: ${list}`,
        });
        return;
      }
      if (valueRaw === '0') {
        player.flags.delete(flag);
        if (player.characterId > 0) this.accounts.clearFlag(player.characterId, flag);
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `Flag '${flag}' cleared.` });
      } else {
        this.setPlayerFlag(player, flag, Number.parseInt(valueRaw ?? '1', 10) || 1);
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `Flag '${flag}' set.` });
      }
      return;
    }
    if (config.devCommands && text.startsWith('/standing')) {
      // /standing — list mine; /standing <faction> <value|band> — set;
      // /standing reset — wipe the ledger (memory + rows).
      const [, a, b] = text.split(/\s+/);
      const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (!a) {
        sys(
          this.repWire(player)
            .map((s) => `${s.faction}: ${s.value} (${s.band})`)
            .join(' · '),
        );
        return;
      }
      if (a === 'reset') {
        player.standing.clear();
        if (player.characterId > 0) this.accounts.deleteStandings(player.characterId);
        this.pushRep(player);
        this.pushQuestAvail(player);
        sys('Standing ledger wiped.');
        return;
      }
      const def = factionDef(a);
      if (!def || b === undefined) {
        sys(`Usage: /standing [<faction> <value|band>] [reset] — factions: ${FACTIONS.roster.map((f) => f.id).join(', ')}`);
        return;
      }
      const bandTargets: Record<string, number> = {
        hunted: FACTIONS.bands.hunted,
        outlaw: FACTIONS.bands.outlaw,
        suspect: FACTIONS.bands.suspect,
        neutral: 0,
        known: FACTIONS.bands.known,
        trusted: FACTIONS.bands.trusted,
        champion: FACTIONS.bands.champion,
      };
      const target = b in bandTargets ? bandTargets[b]! : Number(b);
      if (!Number.isFinite(target)) {
        sys(`'${b}' is neither a value nor a band.`);
        return;
      }
      // Route through the one door as a raw delta (no cross) so the
      // ceremony/persist/push rails all fire exactly as in real play.
      this.creditStanding(player, a, target - (player.standing.get(a) ?? 0));
      sys(`${def.name}: ${player.standing.get(a) ?? 0} (${standingBand(player.standing.get(a) ?? 0)})`);
      return;
    }
    if (config.devCommands && text.startsWith('/deed')) {
      // /deed <bountyHonored|tollBroken|assaultEnforcer|slayMember> <faction>
      const [, kind, fac] = text.split(/\s+/);
      const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      const kinds = ['bountyHonored', 'tollBroken', 'assaultEnforcer', 'slayMember'] as const;
      const k = kinds.find((x) => x === kind);
      if (!k || !fac || !factionDef(fac)) {
        sys(`Usage: /deed <${kinds.join('|')}> <faction>`);
        return;
      }
      this.creditDeed(player, fac, k);
      return;
    }
    if (config.devCommands && text.startsWith('/quest')) {
      // /quest — list; /quest accept <id>; /quest complete <id> (fills
      // the current stage's event counters — collects still need the
      // items); /quest reset [id]; /quest reload (swap from the DB).
      const [, sub, arg] = text.split(/\s+/);
      const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (!sub) {
        const ctx = this.questCtx(player);
        const lines: string[] = [];
        for (const def of this.questDefs.values()) {
          const q = player.quests.get(def.id);
          const state = q
            ? q.status === 'active'
              ? questReady(def, q, ctx)
                ? 'READY'
                : `active s${q.stage} [${q.progress.join(',')}]`
              : `done ×${q.completions}`
            : questAvailable(def, ctx)
              ? 'available'
              : 'gated';
          lines.push(`${def.id}: ${state}`);
        }
        sys(lines.length === 0 ? 'No quests registered.' : lines.join(' · '));
        return;
      }
      if (sub === 'accept' && arg) {
        sys(this.questAccept(eid, player, arg) ? `Accepted '${arg}'.` : `'${arg}' is not available.`);
        return;
      }
      if (sub === 'complete' && arg) {
        const def = this.questDefs.get(arg);
        const q = player.quests.get(arg);
        if (!def || !q || q.status !== 'active') {
          sys(`'${arg}' is not active.`);
          return;
        }
        const stage = def.stages[q.stage];
        stage?.objectives.forEach((obj, i) => {
          if (obj.kind !== 'collect') q.progress[i] = obj.kind === 'kill' ? obj.count : 1;
        });
        advanceStages(def, q, this.questCtx(player));
        this.persistQuest(player, arg);
        this.pushQuestWire(player, def, q);
        sys(`Filled '${arg}' to stage ${q.stage}.`);
        return;
      }
      if (sub === 'turnin' && arg) {
        sys(this.questTurnIn(eid, player, arg) ? `Turned in '${arg}'.` : `'${arg}' is not ready.`);
        return;
      }
      if (sub === 'reset') {
        const ids = arg ? [arg] : [...player.quests.keys()];
        for (const id of ids) {
          player.quests.delete(id);
          this.persistQuest(player, id);
          player.session?.sendJson({ t: 'questupd', remove: id });
        }
        this.pushQuestAvail(player);
        this.sendQuestsFull(player);
        sys(`Reset ${ids.length} quest(s).`);
        return;
      }
      if (sub === 'reload') {
        void this.reloadQuests().then((res) => {
          sys(`Quests reloaded: ${res.count}${res.errors.length ? ` (${res.errors.length} invalid)` : ''}.`);
          for (const p of this.players.values()) this.sendQuestsFull(p);
        });
        return;
      }
      sys('/quest — list · accept <id> · complete <id> · turnin <id> · reset [id] · reload');
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
    if (config.devCommands && text.startsWith('/danger')) {
      // /danger — the field readout at your feet: tier, cell, ledger.
      const pos = this.positions.get(eid);
      if (!pos) return;
      const tx = Math.floor(pos.x);
      const ty = Math.floor(pos.y);
      const tier = this.liveDangerTier(tx, ty);
      const cx = poiCellOf(tx);
      const cy = poiCellOf(ty);
      const row = this.poiLedger.get(poiCellKey(cx, cy));
      const state =
        row === undefined ? 'undecided'
        : row.site === null ? `decided empty (epoch ${row.epoch})`
        : `${row.site.defId} at ${row.site.anchorX},${row.site.anchorY} (epoch ${row.epoch})`;
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Danger tier ${tier} · cell ${cx},${cy} · ${state}.`,
      });
      return;
    }
    if (config.devCommands && text.startsWith('/stronghold')) {
      // /stronghold — the nearest seats and their states.
      // /stronghold here <layout> — force-stand a layout at your feet.
      const [, sub, arg] = text.split(/\s+/);
      const pos = this.positions.get(eid);
      if (!pos) return;
      const px = Math.floor(pos.x);
      const py = Math.floor(pos.y);
      const say = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (sub === 'here' && arg) {
        const layout = STRONGHOLD_DEFS.get(arg);
        const prefab = layout ? this.poiPrefabs?.get(layout.prefab) : undefined;
        if (!layout || !prefab) {
          say(`No layout '${arg}' on the shelf.`);
          return;
        }
        const gx = Math.floor(px / 384);
        const gy = Math.floor(py / 384);
        const key = capitalKey(gx, gy);
        if (this.strongholdLive.has(key)) {
          say(`Lattice cell ${key} already hosts a capital.`);
          return;
        }
        const tier = Math.max(3, this.liveDangerTier(px, py));
        const forced: CapitalSeat = {
          gx,
          gy,
          x: px,
          y: py,
          rect: {
            x: px - Math.floor(prefab.width / 2),
            y: py - Math.floor(prefab.height / 2),
            w: prefab.width,
            h: prefab.height,
          },
          family: layout.family,
          tier,
          layoutId: layout.id,
        };
        this.materializeCapital(forced);
        say(`'${layout.id}' stands at ${px},${py} (tier ${tier}) — dev-forced.`);
        return;
      }
      if (sub === 'clear') {
        const gx = Math.floor(px / 384);
        const gy = Math.floor(py / 384);
        this.retireCapital(capitalKey(gx, gy));
        say(`Capital at lattice ${gx},${gy} retired (ledger row kept).`);
        return;
      }
      // Info: this lattice neighborhood's seats.
      const gx = Math.floor(px / 384);
      const gy = Math.floor(py / 384);
      const lines: string[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const seat = this.cachedSeat(gx + dx, gy + dy);
          if (!seat) continue;
          const key = capitalKey(seat.gx, seat.gy);
          const row = this.strongholdLedger.get(key);
          const bits = row?.wardsCleared ?? 0;
          let brokenWards = 0;
          for (let b = bits; b > 0; b >>= 1) brokenWards += b & 1;
          const state = this.strongholdLive.has(key)
            ? this.strongholdGarrisonStands(key)
              ? brokenWards > 0
                ? `standing, ${brokenWards} ward(s) broken`
                : 'standing'
              : 'broken'
            : row
              ? 'known, beyond the fog'
              : 'unfound';
          const d = Math.round(Math.hypot(seat.x - px, seat.y - py));
          lines.push(
            `${key}: ${seat.layoutId} t${seat.tier} at ${seat.x},${seat.y} (${d} tiles) · ${state}`,
          );
        }
      }
      say(
        lines.length > 0
          ? `Capitals in the marches: ${lines.join(' · ')}`
          : 'No country in this neighborhood keeps a capital.',
      );
      return;
    }
    if (config.devCommands && text.startsWith('/poi')) {
      // /poi info — this cell's state.
      // /poi here [archetype] — force-materialize the current cell.
      // /poi reroll — retire the cell and re-roll it at epoch+1.
      const [, sub, arg] = text.split(/\s+/);
      const pos = this.positions.get(eid);
      if (!pos) return;
      const cx = poiCellOf(pos.x);
      const cy = poiCellOf(pos.y);
      const key = poiCellKey(cx, cy);
      const say = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (sub === 'here') {
        const live = this.poiLive.get(key);
        if (live?.zoneId) {
          say(`Cell ${key} already hosts '${live.zoneId}' — /poi reroll to replace it.`);
          return;
        }
        if (this.poiLedger.get(key)?.site) this.fadePoiDiscoveries(key);
        this.poiLive.delete(key);
        this.poiLedger.delete(key);
        const site = this.materializePoiCell(cx, cy, { force: arg ?? true, epoch: 0 });
        say(
          site
            ? `${site.defId} (${site.prefabId}) stands at ${site.anchorX},${site.anchorY}.`
            : arg !== undefined && !POI_DEFS.has(arg)
              ? `Unknown archetype '${arg}' — ${[...POI_DEFS.keys()].join(', ')}.`
              : 'No suitable ground in this cell (settled, water, or broken terrain).',
        );
        return;
      }
      if (sub === 'reroll') {
        const prior = this.poiLedger.get(key);
        const epoch = (prior?.epoch ?? 0) + 1;
        if (prior?.site) this.fadePoiDiscoveries(key);
        this.retirePoiCell(key);
        this.poiLedger.delete(key);
        const site = this.materializePoiCell(cx, cy, { epoch });
        say(
          site
            ? `Epoch ${epoch}: ${site.defId} stands at ${site.anchorX},${site.anchorY}.`
            : `Epoch ${epoch}: the cell rolled empty.`,
        );
        return;
      }
      if (sub === 'fallow') {
        // /poi fallow [days] — run the epoch turn now. 0 = every
        // cleared cell turns immediately (the staging lever).
        const days = Number.parseFloat(arg ?? '');
        const cutoff = Date.now() - (Number.isFinite(days) && days >= 0 ? days : 7) * 86_400_000;
        const res = this.fallowSweep(cutoff);
        say(
          res.turned === 0
            ? 'No cleared cells past the fallow cutoff.'
            : `Fallow turn: ${res.turned} cells re-rolled — ${res.rerolled} stand anew, ` +
              `${res.turned - res.rerolled} rolled empty. Walk near them to see.`,
        );
        return;
      }
      if (sub === 'havens') {
        // /poi havens — every lamp burning on the frontier.
        say(
          this.poiHavens.size === 0
            ? 'No haven lamps burning.'
            : [...this.poiHavens.entries()]
                .map(([k, a]) => `${k}: ${a.x},${a.y} r${a.safeR}`)
                .join(' · '),
        );
        return;
      }
      const row = this.poiLedger.get(key);
      const live = this.poiLive.get(key);
      say(
        `Cell ${key}: ` +
          (row === undefined ? 'undecided' :
            row.site === null ? `decided empty (epoch ${row.epoch})` :
            `${row.site.defId} (${row.site.prefabId}) tier ${row.site.tier} at ` +
            `${row.site.anchorX},${row.site.anchorY}, epoch ${row.epoch}`) +
          (row?.clearedAt ? ` · cleared ${Math.round((Date.now() - row.clearedAt) / 60000)}m ago` : '') +
          (live?.zoneId ? ' · standing' : '') +
          ' — /poi here [archetype] · /poi reroll · /poi fallow [days] · /poi havens · /frontier',
      );
      return;
    }
    if (config.devCommands && text.startsWith('/wilds')) {
      // The ambience lens (lived-in-land Phase 1): what the wild
      // spawner owes and holds at your feet — the tier's body budget,
      // how much of it stands nearby, and the roster the clock and
      // biome would deal here right now.
      const pos = this.positions.get(eid);
      if (!pos) return;
      const say = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      const tier = this.liveDangerTier(Math.floor(pos.x), Math.floor(pos.y));
      const law = dangerLaw(tier);
      const budget = tier > 0 ? Math.round(FRONTIER.wildBudgetBase * law.wildDensity) : 0;
      let near = 0;
      for (const weid of this.wildBodies.keys()) {
        const wpos = this.positions.get(weid);
        if (wpos && Math.hypot(wpos.x - pos.x, wpos.y - pos.y) <= GameServer.WILD_MAX_R + 24) {
          near++;
        }
      }
      const hours = clockHoursAtTick(this.tickCount, this.timeOfsTicks);
      const biome = groundProbeAt(config.worldSeed, Math.floor(pos.x), Math.floor(pos.y));
      const pool =
        biome === 'grass' || biome === 'forest' ? wildCandidates(tier, biome, hours) : [];
      const roster = pool
        .map((e) => {
          const [lo, hi] = e.band ?? [1, 1];
          const lead = e.lead ? `+${e.lead.npc}` : '';
          return `${e.npc}x${lo}${hi > lo ? `-${hi}` : ''}${lead}`;
        })
        .join(', ');
      say(
        `wilds: tier ${tier}, ${near}/${budget} bodies near ` +
          `(${this.wildBodies.size} world-wide), ${biome} underfoot` +
          (pool.length > 0 ? ` | roster: ${roster}` : ' | roster: empty here'),
      );
      return;
    }
    if (config.devCommands && text.startsWith('/territory')) {
      // The country lens (lived-in-land Phase 5): whose land you stand
      // on, the surrounding cells' countries, and the atlas roster.
      const pos = this.positions.get(eid);
      if (!pos) return;
      const say = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      const families = familiesOf([...POI_DEFS.values()]);
      const here = territoryAt(
        config.worldSeed,
        Math.floor(pos.x),
        Math.floor(pos.y),
        families,
      );
      const cx = poiCellOf(pos.x);
      const cy = poiCellOf(pos.y);
      const rows: string[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        const row: string[] = [];
        for (let dx = -1; dx <= 1; dx++) {
          const f = territoryAt(
            config.worldSeed,
            (cx + dx) * POI_CELL + POI_CELL / 2,
            (cy + dy) * POI_CELL + POI_CELL / 2,
            families,
          );
          row.push(f ?? 'none');
        }
        rows.push(row.join(' '));
      }
      say(
        `territory: ${here ?? 'none'} country at your feet (bias x${FRONTIER.territoryBias}) | ` +
          `cells around: [${rows.join(' / ')}] | atlas: ${families.sort().join(', ')}`,
      );
      return;
    }
    if (config.devCommands && text.startsWith('/finds')) {
      // The texture lens (lived-in-land Phase 2): what the lattice
      // dealt in this cell, which slots are cleared, and how many
      // habitat mouths are pulling knots world-wide.
      const pos = this.positions.get(eid);
      if (!pos) return;
      const say = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      const cx = poiCellOf(pos.x);
      const cy = poiCellOf(pos.y);
      const key = poiCellKey(cx, cy);
      const fl = this.findsLive.get(key);
      const ledger = this.minorLedger.get(key);
      const epoch = this.poiLedger.get(key)?.epoch ?? 0;
      const cleared = ledger && ledger.epoch === epoch ? ledger.cleared : 0;
      if (!fl || fl.finds.length === 0) {
        say(
          `finds: cell ${key} holds none — ` +
            `${this.findsLive.size} cells standing, ${this.habitatFinds.size} habitat mouths live`,
        );
        return;
      }
      const list = fl.finds
        .map((f) => {
          const bit = (cleared >>> f.slot) & 1;
          const hab = f.habitat !== undefined ? ` [${f.habitat}]` : '';
          return `${f.defId}@${f.anchorX},${f.anchorY} t${f.tier}${hab}${bit ? ' CLEARED' : ''}`;
        })
        .join(' | ');
      say(
        `finds: cell ${key} (epoch ${epoch}) deals ${fl.finds.length}: ${list} — ` +
          `${this.habitatFinds.size} habitat mouths live`,
      );
      return;
    }
    if (config.devCommands && text.startsWith('/growth')) {
      // The land's-clock lens (second-growth Phase 1): the domain
      // underfoot, the ledger census by dialect and age, and the
      // nearest healing ground with its honest deadline.
      const pos = this.positions.get(eid);
      if (!pos) return;
      const say = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      const domain = this.world.growthDomainAt(Math.floor(pos.x), Math.floor(pos.y));
      const census = new Map<string, number>();
      let nearest: GrowthRow | null = null;
      let nearestD = Infinity;
      const now = Date.now();
      for (const row of this.world.growthLedger.values()) {
        // A sealed mouth (host ground over a wandered-away resource)
        // has no dialect of its own — name it honestly.
        const dialect =
          growthDialectOf(row.tile) ?? (row.state === GROWTH_DRIFTED ? 'sealed' : 'gone');
        const age =
          row.state === GROWTH_BARE
            ? row.due === null
              ? 'bare-dormant'
              : 'bare-seeded'
            : (GROWTH_STATE_NAMES[row.state] ?? `state${row.state}`);
        const k = `${dialect} ${age}`;
        census.set(k, (census.get(k) ?? 0) + 1);
        const d = Math.hypot(row.tx + 0.5 - pos.x, row.ty + 0.5 - pos.y);
        if (d < nearestD) {
          nearestD = d;
          nearest = row;
        }
      }
      const parts = [...census.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, n]) => `${k} x${n}`)
        .join(', ');
      let near = 'none';
      if (nearest) {
        const proj = projectGrowth(config.worldSeed, nearest, now);
        const eta = proj.ripe
          ? 'ripe, awaiting the beat'
          : proj.due === null
            ? proj.state === GROWTH_DRIFTED
              ? 'a drifted crown, at rest'
              : 'dormant, waiting on the world'
            : `${Math.max(0, Math.round((proj.due - now) / 60000))}m to next age`;
        near =
          `${nearest.tx},${nearest.ty} (${Math.round(nearestD)} tiles) ` +
          `${GROWTH_STATE_NAMES[proj.state] ?? proj.state}, ${eta}`;
      }
      const sown = [...this.world.growthLedger.values()].filter((r) => r.owner !== null).length;
      say(
        `growth: ${domain} ground underfoot | ledger ${this.world.growthLedger.size}` +
          (sown > 0 ? ` (${sown} sown)` : '') +
          (parts.length > 0 ? ` (${parts})` : '') +
          ` | nearest: ${near}`,
      );
      return;
    }
    if (config.devCommands && text.startsWith('/frontier')) {
      // The living-frontier lens + staging levers (the /poi family's kin):
      //   /frontier          — credits + this cell's ember/fallow state + world counts
      //   /frontier tick     — force one full frontier pass now
      //   /frontier ember [minutes] — re-stamp the current cleared cell's linger
      //   /frontier credit [n]      — grant renewal credits (staging)
      const [, sub, arg] = text.split(/\s+/);
      const pos = this.positions.get(eid);
      if (!pos) return;
      const cx = poiCellOf(pos.x);
      const cy = poiCellOf(pos.y);
      const key = poiCellKey(cx, cy);
      const say = (t: string) =>
        player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
      if (sub === 'tick') {
        // The full work ladder, one unit — mirrors tickFrontier exactly.
        const now = Date.now();
        const did = this.dissolveOneEmber(now)
          ? 'dissolved an ember'
          : this.wakeOneFallow(now)
            ? 'woke a fallow cell'
            : this.stageOnePoi(now)
              ? 'moved the boldness clock'
              : this.seedOneSatellite(now)
                ? 'seeded (or scattered) a satellite'
                : this.forkOneToll(now)
                  ? 'forked a road toll'
                  : this.spendRenewalCredit(now)
                    ? 'spent a renewal credit'
                    : 'nothing due';
        const traces =
          (this.satTrace.length > 0 ? ` [sat: ${this.satTrace.join(' ')}]` : '') +
          (this.tollTrace.length > 0 ? ` [toll: ${this.tollTrace.join(' ')}]` : '');
        say(`Frontier pass: ${did}.${traces}`);
        return;
      }
      if (sub === 'creep') {
        // /frontier creep — backdate this cell's top-rung clock past
        // its creep wait so the next pass may fork the toll (staging).
        const row = this.poiLedger.get(key);
        if (!row?.site) {
          say('This cell holds no site to creep.');
          return;
        }
        row.stageAt = Date.now() - creepWaitFor(config.worldSeed, cx, cy) - 1;
        this.accounts.markPoiStage(cx, cy, row.stage, row.stageAt);
        say(`Creep clock backdated — /frontier tick may fork the toll now (stage ${row.stage}).`);
        return;
      }
      if (sub === 'raid') {
        // /frontier raid — force the covetous dice NOW (qualification
        // still applies; the trace tells you who refused and why).
        // /frontier raid calm — lift your own mercy stamp (staging).
        if (arg === 'calm') {
          player.raidCalmUntil = 0;
          if (player.characterId > 0) this.accounts.resetRaidCalm(player.characterId);
          say('Your raid mercy stamp is lifted — the dice may pick you again.');
          return;
        }
        const stood = this.tickRaidDice(Date.now(), true);
        say(
          `Raid dice (forced): ${stood ? 'a squat stands' : 'nothing stood'}.` +
            (this.raidTrace.length > 0 ? ` [${this.raidTrace.join(' ')}]` : ''),
        );
        return;
      }
      if (sub === 'peddler') {
        // /frontier peddler — deal fortune NOW at the most road-true
        // lawful spot in the renewal ring around you (staging: same
        // laws as the real fork, no credit spent).
        const pts: Array<{ tx: number; ty: number }> = [];
        const [pMin, pMax] = FRONTIER.renewalRing;
        for (let t = 0; t < FRONTIER.renewalTries * 2; t++) {
          const ang = Math.random() * Math.PI * 2;
          const d = pMin + Math.random() * (pMax - pMin);
          pts.push({
            tx: Math.round(pos.x + Math.cos(ang) * d),
            ty: Math.round(pos.y + Math.sin(ang) * d),
          });
        }
        const parked = this.standOnePeddler(pts, Date.now());
        say(
          parked
            ? `Fortune on the road: a peddler parks her cart at ${parked.anchorX},${parked.anchorY}.`
            : 'No lawful verge for a cart this pass — try again.',
        );
        return;
      }
      if (sub === 'watch') {
        // /frontier watch — the world answers, read from where you stand
        // (what a speaker HERE would know), plus your open bounty marks.
        const s = this.watchSurvey(pos.x, pos.y);
        const relief = !s.near && this.calmWithinTiles(pos.x, pos.y, FRONTIER.marchTiles);
        const peddler = this.worldFlagAnswer('world:peddler_near', player, pos.x, pos.y);
        const bounties = this.openBounties(player);
        say(
          `The world answers here: threat_near=${s.near} threat_bold=${s.bold} ` +
            `toll_near=${s.toll} calm=${!s.near} relief=${relief} peddler_near=${peddler}. ` +
            `Open bounties: ${bounties.length > 0 ? bounties.join(' · ') : 'none'}.`,
        );
        return;
      }
      if (sub === 'ember') {
        // Any standing ember clock may be re-stamped — cleared camps,
        // scattered satellites, and a peddler's departure alike.
        const row = this.poiLedger.get(key);
        if (!row?.site || (row.clearedAt === null && row.emberUntil === null)) {
          say('This cell holds no ember clock to re-stamp.');
          return;
        }
        const mins = Number.parseFloat(arg ?? '0');
        row.emberUntil = Date.now() + (Number.isFinite(mins) && mins >= 0 ? mins : 0) * 60_000;
        this.accounts.setPoiEmber(cx, cy, row.emberUntil);
        say(`Ember re-stamped: dissolves in ${Math.round((row.emberUntil - Date.now()) / 1000)}s (dignity permitting).`);
        return;
      }
      if (sub === 'credit') {
        const n = Number.parseInt(arg ?? '1', 10);
        this.frontierCredits += Number.isFinite(n) ? n : 1;
        this.accounts.saveFrontierCredits(this.frontierCredits);
        say(`Renewal debt now ${this.frontierCredits}.`);
        return;
      }
      if (sub === 'stage') {
        // /frontier stage [n] — force this cell's boldness rung (staging).
        const row = this.poiLedger.get(key);
        const def = row?.site ? POI_DEFS.get(row.site.defId) : undefined;
        if (!row?.site || !def) {
          say('This cell holds no site to stage.');
          return;
        }
        const max = Math.min(FRONTIER.stageMax, def.boldness?.stages.length ?? 0);
        if (max === 0) {
          say(`${def.name} carries no boldness ladder.`);
          return;
        }
        const n = Number.parseInt(arg ?? '', 10);
        const want = Number.isInteger(n)
          ? Math.max(0, Math.min(n, max))
          : Math.min(row.stage + 1, max);
        row.stage = want;
        row.stageAt = Date.now();
        this.accounts.markPoiStage(cx, cy, want, row.stageAt);
        this.retirePoiCell(key);
        if (want > 0) this.pushStageRumor(key, def.name, want);
        say(`${def.name} set to stage ${want}/${max} — it recomposes as the world streams back.`);
        return;
      }
      if (sub === 'calm') {
        // /frontier calm [clear] — inspect or lift the relax windows.
        if (arg === 'clear') {
          this.frontierCalm.clear();
          this.accounts.pruneFrontierCalm(Number.MAX_SAFE_INTEGER);
          say('All relax windows lifted.');
          return;
        }
        say(
          this.frontierCalm.size === 0
            ? 'No relax windows standing.'
            : [...this.frontierCalm.entries()]
                .map(([k, u]) => `${k}: ${Math.max(0, Math.round((u - Date.now()) / 60000))}m`)
                .join(' · '),
        );
        return;
      }
      let embers = 0;
      let fallows = 0;
      for (const r of this.poiLedger.values()) {
        // Cleared embers AND scattered satellites both count — any
        // standing site with a dissolve clock is an ember.
        if (r.site !== null && r.emberUntil !== null) embers++;
        if (r.site === null && r.fallowUntil !== null) fallows++;
      }
      const row = this.poiLedger.get(key);
      const now = Date.now();
      const satTag = (r: NonNullable<ReturnType<typeof this.poiLedger.get>>): string =>
        r.originCell !== null ? ` (satellite of ${r.originCell})` : r.stage > 0 ? ` (stage ${r.stage})` : '';
      const cellState =
        row === undefined
          ? 'undecided'
          : row.site && row.emberUntil !== null
            ? `${row.site.defId}${satTag(row)} EMBER — dissolves in ~${Math.max(0, Math.round((row.emberUntil - now) / 60000))}m`
            : row.site
              ? `${row.site.defId}${satTag(row)} standing`
              : row.fallowUntil !== null
                ? `fallow — may host in ~${Math.max(0, Math.round((row.fallowUntil - now) / 60000))}m`
                : `decided empty (epoch ${row.epoch})`;
      let staged = 0;
      let sats = 0;
      let tolls = 0;
      let squats = 0;
      let peddlers = 0;
      for (const r of this.poiLedger.values()) {
        if (r.site === null) continue;
        if (r.site.defId === 'road_toll') tolls++;
        else if (r.site.defId === 'peddler_rest') peddlers++;
        else if (GameServer.hearthOwnerOf(r.originCell) !== null) squats++;
        else if (r.originCell !== null) sats++;
        else if (r.stage > 0) staged++;
      }
      say(
        `Frontier: ${embers} ember(s), ${fallows} fallow, ${staged} staged core(s), ` +
          `${sats} satellite(s), ${tolls} toll(s), ${squats} squat(s), ${peddlers} peddler(s), ` +
          `${this.frontierCalm.size} calm, debt ${this.frontierCredits}, rings ${this.claimRings().length}. ` +
          `Cell ${key}: ${cellState} — /frontier tick · ember [min] · stage [n] · creep · raid [calm] · peddler · watch · calm [clear] · credit [n]`,
      );
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
    this.tickRoutines();
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
    // THE FLEECE TELLS THE TIME: offset 11 keeps the wool clock off
    // the other slow beats.
    if (this.tickCount % 20 === 11) this.tickFleece(now);
    if (this.tickCount % 20 === 0) this.tickPois();
    // THE CAPITAL LAW's own beat (offset 13): decide + stand capitals
    // beyond the fog, one per pass.
    if (this.tickCount % 20 === 13) this.tickStrongholds();
    // The frontier clock: offset 7 so it never shares a beat with the
    // %20/%40 passes (300 ≡ 0 mod 20 — a zero offset would stack it
    // on tickPois every time).
    if (this.tickCount % FRONTIER.tickTicks === 7) this.tickFrontier();
    if (this.tickCount % 40 === 20) this.tickWildSpawns();
    // The land's clock (second-growth): offset 13 keeps it off every
    // other slow pass's beat; cadence is the Studio's dial.
    if (this.tickCount % GROWTH.beatTicks === 13) this.tickGrowth(now);
    if (this.tickCount % SERVER_REVEAL_TICKS === 0) this.tickReveal();
    // The party wayfinder ticker: ~1.5s, offset 3 so it never shares a
    // beat with the %20/%40 passes.
    if (this.tickCount % 30 === 3) this.party.tickPositions();
    // The quest collect watcher (500ms, diff-guarded) + the 5s
    // availability re-diff; cadence gating lives inside.
    this.tickQuests();

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

    // Stacking meters that moved this tick reach their wearers once,
    // however many moments moved them.
    if (this.chargesDirty.size > 0) {
      for (const eid of this.chargesDirty) {
        const p = this.players.get(eid);
        if (p) this.sendCharges(p);
      }
      this.chargesDirty.clear();
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
    // THE HONEST SWING lands before the echo answers — the mainhand
    // impact and its offhand echo keep their one-two order.
    this.resolvePendingStrike(eid, player);
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
    // Underground refuses the saddle — checked per tick so every way
    // down (delve stair, riftgate, /tp) dismounts honestly at the
    // threshold. UNDERGROUND_Y covers the dark band AND the dungeon
    // slots above DUNGEON_MIN_Y.
    if (player.mountId && pos.y >= UNDERGROUND_Y) this.dismount(eid, player);
    // The steady-mult mirror: a change-signature no-op on quiet ticks.
    this.sendRide(player);
    // A finished convalescence rises on the same beat...
    this.tickPetRest(eid, player);
    // ...and the household mirror carries it out, same discipline.
    this.sendPet(player);
    const equipped = this.equippedWeapon(player);
    const style = equipped?.weapon.style ?? null;
    let moved = false;
    /** Tiles covered across every frame this tick — feeds stride workings. */
    let strideStep = 0;
    // THE STEADY HAND (input dejitter): drain ONE frame per tick.
    // Clients send exactly one frame per tick; transport jitter used
    // to collapse a late pair into a single tick — every watcher saw
    // the body stall 50ms then double-step, and the seq↔tick mapping
    // shifted under the client's cast mirrors. Pacing the drain keeps
    // remote motion even, and after any late burst a standing 1-frame
    // cushion remains in the queue, absorbing the next wobble for
    // free. A real backlog (≥3) catches up at 2/tick — added input
    // latency is bounded at two ticks — and a cushion that stands at
    // 2 for a full second is jitter's leftovers, bled off the same way.
    let budget = 1;
    if (player.inputQueue.length >= 3) {
      budget = 2;
      player.inputBleedRun = 0;
    } else if (player.inputQueue.length === 2) {
      if (++player.inputBleedRun > 20) {
        budget = 2;
        player.inputBleedRun = 0;
      }
    } else {
      player.inputBleedRun = 0;
    }
    let frames = 0;
    while (frames < budget && player.inputQueue.length > 0) {
      const frame = player.inputQueue.shift()!;
      const casting = this.tickCount < player.castFreezeUntilTick;
      // Moving cancels any in-progress gather.
      if (player.action && (Math.abs(frame.mx) > 0.01 || Math.abs(frame.my) > 0.01)) {
        this.cancelAction(eid, player, 'moved');
      }
      // Drawing a bow is a braced stance — same rule the client predicts.
      let speed = isDrawSlowed(frame, style)
        ? // Longstride raises the drawn-bow floor — walk your aim.
          player.speed * Math.max(DRAW_MOVE_FACTOR, player.perks.drawMoveFactor)
        : player.speed;
      // THE SADDLE OUTRANKS THE SOLES: mounted, the beast's stride
      // replaces the foot stack (max, never product). This is the same
      // number sendRide mirrors, so prediction agrees to the digit.
      speed *= this.steadySpeedMult(player);
      if (this.isChilled(eid)) speed *= CHILL_SPEED_FACTOR;
      if (casting) speed = 0; // committed to the cast
      // A step off the furniture dismounts FIRST — the body walks on
      // from the spot it sat down at, never out of the solid seat tile.
      if (player.seat && (Math.abs(frame.mx) > 0.01 || Math.abs(frame.my) > 0.01)) {
        this.standUp(eid, player, pos);
      }
      const next = stepMovement(pos, frame, speed, TICK_DT, this.world);
      if (next.x !== pos.x || next.y !== pos.y) {
        moved = true;
        const step = Math.hypot(next.x - pos.x, next.y - pos.y);
        player.sneakMoveAccum += step;
        // THE DEEPER SIGIL: ground actually covered feeds the stride
        // workings. Measured off the RESOLVED step, so walking a wall
        // covers nothing and no working can be farmed standing still.
        strideStep += step;
      }
      pos.x = next.x;
      pos.y = next.y;
      // A mounted body faces the way the furniture does; aim resumes
      // command of the shoulders the moment it stands.
      pos.dir = player.seat ? player.seat.dir : frame.aim;

      // Abilities fire on the press edge — holding Q is one cast.
      const pressed = frame.buttons & ~player.prevButtons;
      player.prevButtons = frame.buttons;
      // The sit toggle flips on the press edge; every deliberate act
      // below (moving, dodging, swinging, casting) stands the body up.
      // From furniture (or a bed) the same press is simply "stand".
      if (pressed & InputButton.Sit) {
        this.cancelCasting(eid, player); // rest lets the breath go
        if (player.mountId) this.dismount(eid, player);
        else if (player.sitting || player.lying) this.standUp(eid, player, pos);
        else player.sitting = true;
      }
      // The whistle answers once: the same press-edge grammar as the
      // sit — riding steps down, standing calls the chosen beast.
      if (pressed & InputButton.Mount) {
        this.cancelCasting(eid, player); // the saddle takes both hands
        this.mountToggle(eid, player, pos);
      }
      // The sheathe toggle: weapons away, weapons out. Sheathing mid-draw
      // lets the bowstring down; sitting and sheathing compose freely.
      if (pressed & InputButton.Sheathe) {
        player.sheathed = !player.sheathed;
        if (player.sheathed) {
          player.drawTicks = 0;
          resetCombo(player.combo); // the stowed string is a dropped string
          player.pendingStrike = null; // the stowed blow never lands
          this.cancelCasting(eid, player); // stowed steel casts nothing
          // ...and stowed steel sings nothing — the note breaks too.
          if (player.action?.kind === 'channel') this.cancelAction(eid, player, 'cancelled');
        }
      }
      const abilityPressed =
        pressed &
        (InputButton.Ability1 | InputButton.Ability2 | InputButton.Ability3 | InputButton.Ability4);
      if (abilityPressed) {
        this.standUp(eid, player, pos);
        this.dismount(eid, player); // arts are cast from the ground
      }
      // THE SAFETY: while stowed, no press can deal damage. A combat
      // press DRAWS instead — the weapon comes out (the client plays
      // the pull), and the draw-lock holds the first real swing until
      // the hand is back off the hip.
      if (player.sheathed && (abilityPressed || pressed & InputButton.Attack)) {
        player.sheathed = false;
        player.drawLockUntilTick = this.tickCount + DRAW_LOCK_TICKS;
      }
      const weaponsAway = player.sheathed || this.tickCount < player.drawLockUntilTick;
      if (!weaponsAway) {
        // THE HELD SIGIL: a frame may carry the aimed ground point the
        // client's held ring settled on. sanitizeInputFrame already
        // dropped half or hostile points; the cast door range-clamps.
        const aimPt =
          frame.tx !== undefined && frame.ty !== undefined
            ? { x: frame.tx, y: frame.ty }
            : undefined;
        if (pressed & InputButton.Ability1) this.tryCastAbility(eid, player, 0, frame.aim, aimPt);
        if (pressed & InputButton.Ability2) this.tryCastAbility(eid, player, 1, frame.aim, aimPt);
        if (pressed & InputButton.Ability3) this.tryCastAbility(eid, player, 2, frame.aim, aimPt);
        if (pressed & InputButton.Ability4) this.tryCastAbility(eid, player, 3, frame.aim, aimPt);
      }
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
        // THE DODGE-WEAVE (combat v2): the fired dodge cuts the rest
        // of the swing recovery to a floor — the combo track never
        // resets on a dodge, so slide-out, cut back in IS the string.
        // Mirrored client-side off the same seq-gated dodge law.
        if (player.attackCooldown > DODGE_CANCEL_FLOOR_TICKS) {
          player.attackCooldown = DODGE_CANCEL_FLOOR_TICKS;
        }
        // THE DRAWN BREATH's bail-out: the dodge that FIRES breaks the
        // breath (mirrored client-side off the same seq-gated law, so
        // a dodge press on cooldown never lies to the bar).
        this.cancelCasting(eid, player);
        this.dismount(eid, player); // a dodge is the body's own deed
        // Wolf Reflexes: the dodge itself becomes an engage/escape tool.
        if (this.hasPassive(player, 'dodge_haste')) {
          player.buffs.push(mkBuff({ speedMult: 1.35, untilTick: this.tickCount + 30 }));
        }
      }
      player.lastProcessedSeq = frame.seq;

      // A cast this frame (or one still resolving) holds the basic back.
      // Stowed weapons hold it too — the safety again, for the held path.
      // THE DRAWN BREATH holds it likewise: winding hands swing nothing;
      // THE HELD NOTE the same — singing hands swing nothing either.
      const stillCasting =
        this.tickCount < player.castFreezeUntilTick ||
        player.casting !== null ||
        player.action?.kind === 'channel';
      const attackHeld =
        hasButton(frame.buttons, InputButton.Attack) && !stillCasting && !weaponsAway;
      // THE HELD INTENT: a tap landing in the tail of recovery buffers
      // ONE swing that fires at ready — rhythm taps stop being eaten.
      // Self-expiring (armBuffer), so no break site cleans it up; the
      // bow's draw machine keeps its own charge clock instead.
      if (
        pressed & InputButton.Attack &&
        !stillCasting &&
        !weaponsAway &&
        style !== 'archery'
      ) {
        const armed = armBuffer(player.attackCooldown, this.tickCount);
        if (armed) player.attackBufferedUntilTick = armed;
      }
      const attackBuffered =
        this.tickCount <= player.attackBufferedUntilTick && !stillCasting && !weaponsAway;
      if (attackHeld || attackBuffered) {
        this.standUp(eid, player, pos);
        this.dismount(eid, player); // no mounted combat, ever
      }
      if (style === 'archery') {
        this.tickBowDraw(eid, player, equipped!, attackHeld, frame.aim, frame.seq);
      } else if (attackHeld || attackBuffered) {
        // THE BRANCH reads the trigger: a fresh press edge or a spent
        // buffer is a TAP (the rhythm hand); the held bit flowing on
        // is the steady hand. The buffered press spends itself the
        // moment the hand is free (fires with the LATEST aim).
        const tapped =
          (pressed & InputButton.Attack) !== 0 ||
          (player.attackCooldown === 0 && attackBuffered);
        if (player.attackCooldown === 0) player.attackBufferedUntilTick = 0;
        this.tryPlayerAttack(eid, player, frame.aim, frame.seq, tapped);
      }
      frames++;
    }

    // Stealth: the latch is a pure function of the last processed frame's
    // held bit, so it survives empty ticks and packet loss. Hidden is
    // strictly layered on top: hidden ⇒ sneaking.
    player.sneaking = hasButton(player.prevButtons, InputButton.Sneak);
    // Rest yields to everything: a step, a crouch, or a running action
    // (gathering, crafting) ends the sit — no half-seated walkers.
    if (moved || player.sneaking || player.action) this.standUp(eid, player, pos);
    // Riding yields to every deed EXCEPT movement — that is the point
    // of the mount. Crouching low or working with the hands steps down.
    if (player.sneaking || player.action) this.dismount(eid, player);
    // The planted-stance clock (Bulwark) counts sneaking or not.
    player.stillTicks = moved ? 0 : player.stillTicks + 1;
    // THE DRAWN BREATH accrues on the tick's resolved motion — after
    // every frame drained, before the pose ladder reads the outcome.
    this.tickCasting(eid, player, moved);
    if (strideStep > 0) this.strideMoment(eid, player, strideStep);
    // THE HEEL FORGIVES THE ROAD: the trailing companion's calm
    // counter reads this tick's true stride, right where it's known.
    this.tickPetTrailing(eid, player, strideStep);
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
      // Craft reads as station work (hammering, stoking), milking as
      // bare-handed dairy work; everything else keeps the
      // tool-swinging gather pose.
      this.poses.set(
        eid,
        player.action.kind === 'craft'
          ? PoseState.Craft
          : player.action.kind === 'milk'
            ? PoseState.Milk
            : PoseState.Gather,
      );
    } else {
      this.poses.set(
        eid,
        player.mountId
          ? // In the saddle, moving or standing — the client derives
            // gait from motion exactly as it does for beasts.
            PoseState.Ride
          : player.lying
            ? PoseState.Lie
            : player.sitting
              ? PoseState.Sit
              : player.sneaking
                ? PoseState.Sneak
                : moved
                  ? PoseState.Walk
                  : PoseState.Idle,
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
    equipped: { id: string; weapon: WeaponStats },
    attackHeld: boolean,
    aim: number,
    seq: number,
  ): void {
    const { id: weaponId, weapon } = equipped;
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
      // The pull saturates exactly at the overcharge line — holding
      // longer changes nothing more.
      player.drawTicks = Math.min(DRAW_FULL_TICKS + OVERCHARGE_TICKS, player.drawTicks + 1);
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
      Math.round(
        weapon.damage * powerMultFn(level, PLAYER_POWER_PER_LEVEL) * player.gear.styleDmgMult.archery,
      ),
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
      const stage = advanceCombo(player.combo, weaponId, this.tickCount, SNAP_CHAIN);
      player.attackCooldown = SNAP_RECOVERY_TICKS;
      player.combo.graceUntilTick = this.tickCount + SNAP_RECOVERY_TICKS + SNAP_GRACE_TICKS;
      this.speakCombo(player, stage, SNAP_CHAIN);
      player.lastCombatAt = Date.now();
      this.setPose(eid, PoseState.Loose, 4);
      // Fletcher's Eye: the quick arrow stops being an apology.
      const shot = snapShot(
        Math.round(base * player.perks.snapShotMult),
        weapon.projectileSpeed ?? 12,
        weapon.range,
      );
      fire(shot, aim, false);
      if (stage === 2) {
        // The rhythm reward: a second arrow rides the third tap.
        fire(shot, aim + 0.14, false);
      }
      return;
    }

    resetCombo(player.combo); // a drawn shot resets the snap rhythm
    if (weapon.ammo) {
      if (removeItem(player.inventory, weapon.ammo, 1) === 0) return;
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
    }
    player.attackCooldown = weapon.cooldownTicks;
    player.lastCombatAt = Date.now();
    this.setPose(eid, PoseState.Loose, 6);
    const shot = chargedShot(drawCharge(ticks), base, weapon.projectileSpeed ?? 12, weapon.range);
    if (isOvercharged(ticks)) {
      // THE OVERCHARGE VOLLEY: held past the full draw, the release
      // splits into a three-shaft fan — 1.5x payload for the extra
      // half-second of standing brace (~cycle parity; exposure is the
      // price). One nocked arrow: the overcharge splits the release,
      // it doesn't triple the quiver bill. The center shaft keeps the
      // full-draw riders (Biting Draw's chill).
      const v = {
        maxHit: Math.max(1, Math.round(shot.maxHit * VOLLEY_DMG_FACTOR)),
        speed: shot.speed,
        range: shot.range,
      };
      fire(v, aim, true);
      fire(v, aim - VOLLEY_SPREAD, false);
      fire(v, aim + VOLLEY_SPREAD, false);
      return;
    }
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

    // Discovery runs on the center-chunk EDGE — the new-chunk branch
    // below fires for chunks 2 away (64+ tiles out), far too early to
    // shout "discovered" about anything.
    const center = chunkKey(ccx, ccy);
    if (session.lastCenterChunk !== center) {
      session.lastCenterChunk = center;
      this.checkDiscoveries(eid);
    }

    const visible = new Set<EntityId>();
    const windowKeys = new Set<string>();
    for (let cy = ccy - INTEREST_CHUNK_RADIUS; cy <= ccy + INTEREST_CHUNK_RADIUS; cy++) {
      for (let cx = ccx - INTEREST_CHUNK_RADIUS; cx <= ccx + INTEREST_CHUNK_RADIUS; cx++) {
        const key = chunkKey(cx, cy);
        windowKeys.add(key);
        if (!session.knownChunks.has(key)) {
          session.knownChunks.add(key);
          session.sendBinary(encodeChunk(this.world.ensure(cx, cy)));
          // The words ride in with the board they belong to.
          this.sendChunkSigns(session, cx, cy);
        }
        const set = this.chunks.get(key);
        if (set) for (const e of set) visible.add(e);
      }
    }
    // CHUNK HYSTERESIS: forget a streamed chunk only when it falls a
    // full ring beyond the interest window. Evicting at the window's
    // exact edge meant a player pacing across a chunk border
    // re-downloaded the same five chunks (~25KB) on every crossing —
    // the client caches them forever, so the resend was pure waste.
    for (const key of session.knownChunks) {
      if (windowKeys.has(key)) continue;
      const comma = key.indexOf(',');
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));
      if (
        Math.abs(cx - ccx) > INTEREST_CHUNK_RADIUS + 1 ||
        Math.abs(cy - ccy) > INTEREST_CHUNK_RADIUS + 1
      ) {
        session.knownChunks.delete(key);
      }
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
      if (visible.has(e)) continue;
      // ENTITY HYSTERESIS: the mirror of the chunk rule above. Leaving
      // at the window's exact edge meant a player pacing across a chunk
      // border leave/re-entered every outer-ring entity on each crossing
      // — the re-enter wipes sentSnapSig and the client's interp buffer,
      // so the entity visibly pops. Keep a known entity for one extra
      // ring instead: it stays in knownEntities so snapshots keep
      // streaming it, and THE QUIET WIRE makes the ring nearly free (an
      // unchanged row never resends). Hidden players still leave at
      // once (anti-ESP), and a despawned body has no ring to hold.
      const kept = this.positions.get(e);
      if (kept && !this.players.get(e)?.hidden) {
        const ecx = Math.floor(kept.x / CHUNK_SIZE);
        const ecy = Math.floor(kept.y / CHUNK_SIZE);
        if (
          Math.abs(ecx - ccx) <= INTEREST_CHUNK_RADIUS + 1 &&
          Math.abs(ecy - ccy) <= INTEREST_CHUNK_RADIUS + 1
        ) {
          continue;
        }
      }
      session.knownEntities.delete(e);
      session.sentSnapSig.delete(e);
      leaves.push(e);
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
        mount: player.mountId ?? undefined,
      };
    }
    const npc = this.npcs.get(eid);
    if (npc) {
      meta.name = npc.def.name;
      meta.defId = npc.def.id;
      meta.level = npc.def.level;
    }
    // THE COLLAR TELLS THE TALE: ownership is the one companion fact
    // every watcher must know — it changes what the entity IS
    // (somebody's, not the wild's; never a fight offer). Name and
    // level read from the keeper's row; the species body carries the
    // art unchanged (the collar render itself lands Phase 5).
    const petComp = this.pets.get(eid);
    if (petComp && npc) {
      const keeper = this.players.get(petComp.ownerEid);
      const row = keeper?.pets.find((p) => p.slot === petComp.slot);
      if (keeper && row) {
        meta.name = row.name;
        meta.level = petLevelFor(row.xp, npc.def.level, levelForXp(keeper.skills.beastcraft ?? 0));
      }
      meta.ownerEid = petComp.ownerEid;
      meta.friendly = true;
    }
    // THE ANIMALS OF THE YARD: a kept animal wears its given name and
    // the stock marker (never fightable); ownerEid rides only while
    // the keeper is online, aiming the keeper's own prompts.
    const stockComp = this.livestock.get(eid);
    if (stockComp && npc) {
      meta.name = stockComp.row.name;
      meta.stock = true;
      meta.friendly = true;
      const keeperEid = this.characterEids.get(stockComp.row.characterId);
      if (keeperEid !== undefined) meta.ownerEid = keeperEid;
      // THE FLEECE TELLS THE TIME: a sheep wears its produce clock —
      // clipped while the wool regrows, a full cloud when shearable.
      if (stockComp.row.species === 'sheep' && npc.nextProduceAt > Date.now()) {
        meta.shorn = true;
      }
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
        if (appearance) {
          // THE SADDLE IN THE SCHEDULE: a riding body carries its
          // beast on the same appearance channel a player does — one
          // identity fact, every watcher, one render path.
          if (actorComp.mount) appearance.mount = actorComp.mount;
          meta.appearance = appearance;
        }
      }
      // No combat body = never attackable: clients offer Talk, and no
      // combat loop can even see this entity.
      if (!npc) meta.friendly = true;
      // Has a voice — clients offer Talk even on fightable neutrals.
      if (this.dialoguesByActor.has(actor.id) || (actor.lines?.length ?? 0) > 0) {
        meta.talk = true;
      }
      // The slug is static identity (v20): each client resolves its
      // OWN quest marks against it — per-viewer truth off the wire.
      meta.actor = actor.id;
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
      // Ballistic truth (v9): heading + speed let every client fly
      // this shot from its first sample instead of freezing on it
      // until a snapshot pair reveals the velocity.
      meta.dir = Math.atan2(proj.dirY, proj.dirX);
      meta.speed = proj.speed;
      if (proj.returns) meta.returns = true;
    }
    const summon = this.summons.get(eid);
    if (summon) meta.defId = `summon_${summon.kind}`;
    const grave = this.graves.get(eid);
    if (grave) {
      meta.defId = 'gravestone';
      meta.name = grave.name;
    }
    return meta;
  }

  /**
   * The overhead telegraph, a pure read of the state ladder: wary
   * bodies wear the "?", engaged ones the "!", a hunter the pulsing
   * "?" that says the chain is broken but the woods aren't safe yet.
   */
  private npcAlertByte(eid: EntityId): number {
    const npc = this.npcs.get(eid);
    if (!npc) return ALERT_ICON_NONE;
    if (npc.state === 'chase' || npc.state === 'seekhelp') return ALERT_ICON_ENGAGED;
    if (npc.state === 'search') return ALERT_ICON_HUNTING;
    if (npc.state === 'suspicious' || npc.state === 'investigate') return ALERT_ICON_WARY;
    return ALERT_ICON_NONE;
  }

  private sendSnapshot(session: Session): void {
    const player = this.players.get(session.playerEid!);
    if (!player) return;
    // BACKPRESSURE: a congested socket gets no snapshots — they are
    // superseded data, and stacking them onto a stalled receiver only
    // deepens how far behind it wakes. Events and chunks still queue
    // (they are one-shot truths); the first drained snapshot carries
    // the current world.
    if (session.congested) return;
    const TAU = Math.PI * 2;
    const entities: SnapshotEntity[] = [];
    for (const eid of session.knownEntities) {
      const pos = this.positions.get(eid);
      if (!pos) continue;
      const health = this.healths.get(eid);
      // A living body never rounds to the death byte — 1/255 is the
      // honest floor for "bloodied but breathing".
      const hpPct = health
        ? health.hp > 0
          ? Math.max(1, Math.round((health.hp / health.maxHp) * 255))
          : 0
        : 255;
      const pose = this.poses.get(eid) ?? PoseState.Idle;
      const status = this.statusBits(eid);
      const alert = this.npcAlertByte(eid);
      // THE QUIET WIRE: compare in WIRE precision (the encoder's own
      // quantization) so float dust can't force a resend, and skip
      // any entity whose whole row is unchanged. The own body always
      // ships — reconciliation runs on its presence.
      const xq = Math.round(pos.x * POS_SCALE);
      const yq = Math.round(pos.y * POS_SCALE);
      const dirq = Math.round(((((pos.dir % TAU) + TAU) % TAU) / TAU) * 255) & 0xff;
      if (eid !== session.playerEid) {
        const sig = session.sentSnapSig.get(eid);
        if (
          sig &&
          sig[0] === xq &&
          sig[1] === yq &&
          sig[2] === dirq &&
          sig[3] === pose &&
          sig[4] === hpPct &&
          sig[5] === status &&
          sig[6] === alert
        ) {
          continue;
        }
        if (sig) {
          sig[0] = xq; sig[1] = yq; sig[2] = dirq; sig[3] = pose;
          sig[4] = hpPct; sig[5] = status; sig[6] = alert;
        } else {
          session.sentSnapSig.set(eid, Int32Array.of(xq, yq, dirq, pose, hpPct, status, alert));
        }
      }
      entities.push({
        eid,
        x: pos.x,
        y: pos.y,
        dir: pos.dir,
        pose,
        hpPct,
        status,
        alert,
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
