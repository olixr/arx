import {
  CAST_STILL_FACTOR,
  CHUNK_SIZE,
  CLIENT_REVEAL_MS,
  ChunkStore,
  DRAW_FULL_TICKS,
  DRAW_MIN_TICKS,
  ExploredMask,
  INTERP_DELAY_MS,
  b64ToU8,
  InputButton,
  SWAP_BEAT_MS,
  SWAP_BEAT_TICKS,
  DRAW_LOCK_TICKS,
  hasButton,
  PLAYER_SPEED,
  PROTOCOL_VERSION,
  SHEATHED_BIT,
  DRAW_MOVE_FACTOR,
  groundAimRange,
  groundAimed,
  travelKindOf,
  SNEAK_DETECTED_BIT,
  SNEAK_HIDDEN_BIT,
  TICK_MS,
  chargedShot,
  clockHours,
  drawCharge,
  candleInfo,
  chestInfo,
  doorInfo,
  findPath,
  isSignTile,
  advanceCombo,
  armBuffer,
  freshCombo,
  isOvercharged,
  resetCombo,
  DODGE_CANCEL_FLOOR_TICKS,
  GUARD_SWEEP_RANGE,
  VOLLEY_SPREAD,
  PoseState,
  STRIKE_CLOCKS,
  sanitizeSignText,
  signKey,
  snapShot,
  stationAtTile,
  Tile,
  type ChestKind,
  type ChunkData,
  type EntityId,
  type EntityMeta,
  type EquipSlot,
  type BuffInfo,
  type ChargeInfo,
  type PetInfo,
  type InputFrame,
  type BuildOrient,
  type InvSlot,
  type ItemRoll,
  type KeyLore,
  honedAbility,
  levelForXp,
  masteryXp,
  techniqueRankFor,
  type DiscoveryWire,
  type TrophyWire,
  type S2CPoiCleared,
  type QuestAvailWire,
  type QuestDoneWire,
  type QuestRewardsWire,
  type QuestWire,
  type RepStandingWire,
  type EquippedItem,
  type PartyMemberWire,
  type PartyRunWire,
  type S2CFx,
  type S2CMessage,
  type S2CPartyEvent,
  type SignInfo,
  type SkillXp,
  type Snapshot,
  type StationType,
  type TilePatch,
  type DetailPatch,
  type Vec2,
} from '@arx/shared';
import { CROP_TILES, LIVESTOCK, MATURE_TILES, NODES_BY_TILE, SETTLED_ANCHORS, SOIL_RICH, WORK_STATION_TILES, bandAtLeast, isCropTile, abilityDef, itemDef, movesetFor, npcDef, replaceGeography, strikePose, tameDef, techniquePoolDef, type FactionBand, type GeographyDef, type WorkStation } from '@arx/content';
import { clearFarmMirror, farmApiaries, farmBins, farmJobs, farmKey, farmPlots, farmTroughs, larderFills, noteWellTile, refreshWet, stageOfTile } from './farmCare.js';
import { EntityKind, INTERIOR_BOUNDARY_TILES, chunkKey, pointHitsShot, shutDoorTile, swingCooldown, moveFactorOfBits } from '@arx/shared';
import type { AbilityDef, AbilitySlot, DangerAnchor, Look, PlaneWire } from '@arx/shared';
import type { S2CArenaBoard, S2CArenaState } from '@arx/shared';

/**
 * A zero-latency predicted shot (v8). Spawned the instant the local
 * fire gate passes (the same mirrored gate the server applies), flown
 * client-side, and handed off to the authoritative projectile entity
 * when it enters — matched by (ownerEid, firing seq). An unmatched
 * tracer (misprediction: ammo desync, server-side cancel) fades out in
 * a quarter second instead of lying about a hit.
 */
export interface OwnShot {
  /** Input-frame seq at the predicted fire — the matching key. */
  seq: number;
  /** Same defId the server will broadcast ('archery', 'arx:ember'…). */
  defId: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  dir: number;
  /** Tiles per second. */
  speed: number;
  /** Max flight distance, tiles. */
  range: number;
  /**
   * Flight distance to the first solid along the ray, ≤ range (v9).
   * The tracer's draw holds at this face instead of sailing through
   * the wall while the real shot's death notice is in transit.
   */
  wallAt: number;
  /** performance.now() at spawn. */
  bornAt: number;
}

export type InteractTarget =
  | { kind: 'node'; tx: number; ty: number }
  | { kind: 'station'; tx: number; ty: number; station: StationType }
  | { kind: 'bank'; tx: number; ty: number }
  | { kind: 'stable'; tx: number; ty: number }
  | { kind: 'shop'; tx: number; ty: number }
  | { kind: 'portal'; tx: number; ty: number }
  | { kind: 'plot'; tx: number; ty: number }
  | { kind: 'crop'; tx: number; ty: number; mature: boolean }
  | { kind: 'bin'; tx: number; ty: number }
  | { kind: 'trough'; tx: number; ty: number }
  | { kind: 'work'; tx: number; ty: number; work: WorkStation }
  | { kind: 'apiary'; tx: number; ty: number }
  | { kind: 'npc'; tx: number; ty: number; eid: EntityId; verb: string }
  | { kind: 'loot'; tx: number; ty: number; eid: EntityId }
  | { kind: 'chest'; tx: number; ty: number; chest: ChestKind }
  | { kind: 'door'; tx: number; ty: number; open: boolean; gate: boolean }
  | { kind: 'candle'; tx: number; ty: number; lit: boolean }
  | { kind: 'seat'; tx: number; ty: number }
  | { kind: 'bed'; tx: number; ty: number }
  | { kind: 'sign'; tx: number; ty: number; mine: boolean; blank: boolean };
import { STATUS_INK } from '../render/statusFx.js';
import { Connection } from '../net/connection.js';
import { InterpBuffer, shortestAngle } from '../net/interpolation.js';
import { Predictor, type CastMove } from '../net/prediction.js';
import type { InputManager } from '../input/inputManager.js';

export interface RemoteEntity {
  meta: EntityMeta;
  buffer: InterpBuffer;
  /** Hit-flash timer (performance.now ms). */
  hurtUntil?: number;
  /** The last damaging hit — direction and force launch the death ragdoll. */
  lastKnock?: { kx: number; ky: number; at: number; crit: boolean; dmg: number };
}

export interface Floaty {
  x: number;
  y: number;
  text: string;
  color: string;
  bornAt: number;
  /** Font-size multiplier (crits go big, xp drips go small). */
  sizeMul?: number;
}

/**
 * THE RISEN WORD: an interaction's answer standing in the world —
 * "LOCKED" over the chest, "PACK FULL" over your head — so nobody has
 * to read the corner log to learn why nothing happened. A separate
 * lane from damage floaties: words live longer, rise slower, and obey
 * the dedupe law (mashing the verb re-bumps the standing word instead
 * of stacking copies into mush).
 */
export interface RisenWord {
  x: number;
  y: number;
  word: string;
  tone: 'deny' | 'note' | 'good';
  bornAt: number;
  /** Re-asks while alive; the renderer re-pops instead of stacking. */
  bumpedAt: number;
}

export interface ChatLine {
  channel: 'local' | 'system' | 'xp';
  from?: string;
  /** The speaker's entity, when the line was said aloud IN the world —
   *  what lets THE SPOKEN AIR stand the words over the right head. */
  eid?: EntityId;
  text: string;
}

/** One word-life — shared by the dedupe law and the renderer's prune. */
export const WORD_LIFE_MS = 1400;

/** A combat effect in flight (nova ring, telegraph, blast, reaction). */
export interface ActiveFx {
  kind: S2CFx['kind'];
  x: number;
  y: number;
  radius: number;
  /** telegraph: fuse length in server ticks; field/summon: lifetime. */
  ticks?: number;
  color?: string;
  text?: string;
  /** Ability id — keys the bespoke layered visual identity. */
  id?: string;
  /** arc: aim angle. */
  dir?: number;
  /** dash/bolt/beam: segment endpoint. */
  x2?: number;
  y2?: number;
  bornAt: number;
}

export interface GameEvents {
  onChat(line: ChatLine): void;
  onStatus(
    status: 'connecting' | 'ingame' | 'reconnecting' | 'rejected' | 'authRequired' | 'authErr',
    detail?: string,
  ): void;
  onInventory(slots: InvSlot[]): void;
  onSkills(xp: SkillXp): void;
  onXp(msg: { skill: string; gained: number; level: number; levelledUp: boolean }): void;
  onEquipment(equipment: Partial<Record<string, EquippedItem>>): void;
  onBank(items: Record<string, number>, gear?: Array<{ id: number; item: string; roll: ItemRoll }>): void;
  /** The Riftgate answered an interact — open the key panel (keys come from the ring mirror). */
  onRiftgate?(live?: { seed: number; tier: string; power: number }, partyRuns?: PartyRunWire[]): void;
  /** THE KEY RING's full mirror arrived — repaint whatever shows keys. */
  onKeyRing?(keys: Array<{ id: number; roll: ItemRoll }>): void;
  /** THE KEY LEDGER's mirror arrived — repaint the ledger wing. */
  onKeyLore?(known: KeyLore[]): void;
  /** The Keywright's bench opened — raise the ledger with the forge lit. */
  onKeyForgeOpen?(): void;
  /** A board's words arrived or changed — repaint whatever shows them. */
  onSignChanged?(tx: number, ty: number): void;
  /** Crossed into a dungeon — everything the entry banner tells. */
  onDungeon?(d: {
    name: string;
    sigil: string;
    tier: string;
    theme: string;
    power: number;
    mods?: string[];
  }): void;
  /** THE COURT FALLS: the run's champion is down — the run is cleared. */
  onDungeonClear?(d: { name: string; sigil: string; sec: number }): void;
  /** THE SAND AND THE ROAR: the ringmaster's stakes board opened. */
  onArenaBoard?(b: S2CArenaBoard): void;
  /** The match's state turned a phase (state itself sits on game.arenaMatch). */
  onArenaState?(s: S2CArenaState): void;
  /**
   * THE CROSSING: the body just moved to another plane. ClientGame has
   * already dropped its own world state (chunks, prediction, entities,
   * versions); this event is where the renderer, chart, and audio drop
   * theirs and the veil covers the cut.
   */
  onPlane?(p: PlaneWire): void;
  onHit(hit: {
    x: number;
    y: number;
    dmg: number;
    isOwn: boolean;
    crit: boolean;
    backstab?: boolean;
    /** Set on DoT pulses — the wound that ticked (tints the hurt edge). */
    via?: 'burn' | 'bleed' | 'venom';
  }): void;
  onDeath(death: { x: number; y: number; defId: string }): void;
  /** A damaging blow with a knock direction — directional impact FX. */
  onImpact?(impact: {
    x: number;
    y: number;
    kx: number;
    ky: number;
    crit: boolean;
    isOwnTarget: boolean;
  }): void;
  /** This character has never chosen a look — open the creator. */
  onNeedLook?(): void;
  /** A timed action began — `ticks` server ticks to completion; craft
   *  starts carry the recipe and the batch tally for the work card. */
  onActionStart?(ticks: number, craft?: { recipe: string; made: number; total: number }): void;
  /** The own-built ledger arrived — feed the overlay. */
  onOwnBuilt?(keys: ReadonlySet<string>): void;
  /** The running action ended — `reason` says why ('done', 'blocked', 'occupied',
   *  'materials', 'moved', 'stopped', …); craft ends carry the batch tally. */
  onActionEnd?(reason?: string, made?: number): void;
  /** A conversation began — raise the cinematic frame around `eid`. */
  onDialogueOpen?(o: {
    eid: EntityId;
    name: string;
    title?: string;
    /** Clip URLs to warm before the first voiced beat lands. */
    prefetch?: string[];
    /** The live duck dials riding the frame. */
    voiceDials?: { duckLine: number; duckAmbience: number; duckReleaseMs: number };
  }): void;
  /** One beat of conversation — typewriter it out. */
  onDialogueNode?(n: {
    speaker: 'npc' | 'player';
    text: string;
    choices?: string[];
    last?: boolean;
    gifts?: Array<{ item: string; qty: number }>;
    quest?: { id: string; name: string; rewards?: QuestRewardsWire };
    questChoices?: Array<{ idx: number; kind: 'accept' | 'turnin' }>;
    shopChoices?: number[];
    voice?: { url: string; durMs: number; kind: 'line' | 'quip' };
  }): void;
  /** The conversation is over — tear the frame down. */
  onDialogueClose?(): void;
  /** A spoken breath from a place in the world (a bark's voice). */
  onVoiceQuip?(q: { x: number; y: number; url: string }): void;
  /** A trainer opened their wares — render the named shop's shelf. */
  onShopOpen?(shop: string, priceMult: number): void;
  /** The full social snapshot answered a request. */
  onSocial?(snap: {
    friends: Array<{ name: string; online: boolean; zone?: string }>;
    incoming: string[];
    outgoing: string[];
  }): void;
  /** Name-search results came back. */
  onFriendSearch?(results: Array<{ name: string; online: boolean }>): void;
  /** Something social happened involving `name` — refetch, maybe announce. */
  onFriendEvent?(ev: {
    kind: 'request' | 'accepted' | 'declined' | 'removed' | 'online' | 'offline';
    name: string;
  }): void;
  /** The full party snapshot answered a request (or a login push). */
  onParty?(snap: { members: PartyMemberWire[]; invites: string[]; outgoing: string[] }): void;
  /** Something party-shaped happened involving `name` — refetch, maybe announce. */
  onPartyEvent?(ev: { kind: S2CPartyEvent['kind']; name: string; detail?: string }): void;
  /** A LIVE first-ever discovery — the one trigger for the splash. */
  onDiscovery?(d: DiscoveryWire): void;
  /**
   * THE CHAMPION'S MARK: you stood among a broken camp's champions —
   * the one trigger for the full-screen CLEARED ceremony.
   */
  onPoiCleared?(e: S2CPoiCleared): void;
  /** A fresh victory banner was staked somewhere on the shard. */
  onTrophyStaked?(t: TrophyWire): void;
  /** A LIVE quest ceremony — the ONLY trigger for banners and fanfare. */
  onQuestEvent?(e: { kind: 'accepted' | 'completed'; id: string; name: string; rewards?: QuestRewardsWire }): void;
  /** The quest ledger changed shape (quiet) — repaint journal surfaces. */
  onQuestsChanged?(): void;
  /** A band crossing — the ONLY trigger for standing ceremonies. */
  onRepEvent?(e: { faction: string; name: string; band: string; rose: boolean }): void;
  /** The standing ledger moved (quiet) — repaint the Standing screen. */
  onRepChanged?(): void;
}

export class ClientGame {
  /** World tiles streamed from the server; also the collision source. */
  readonly world = new ChunkStore();
  /** Bumped whenever chunk data changes so the renderer can re-bake. */
  worldVersion = 0;
  /**
   * The interior-region cache's own clock: bumps with worldVersion
   * EXCEPT for door toggles. Open and shut doorways are both interior
   * boundaries (and gates are non-boundaries in both postures), so a
   * posture swap can never reshape a room — but living towns toggle
   * doors constantly, and wiping the region cache for each one forced
   * town-wide re-floods mid-stroll.
   */
  interiorsVersion = 0;
  readonly entities = new Map<EntityId, RemoteEntity>();
  readonly predictor = new Predictor(this.world, PLAYER_SPEED);

  ownEid: EntityId | null = null;
  ownName = '';
  /** World seed from the welcome — the danger field's client-side key. */
  worldSeed: number | null = null;
  /**
   * The live danger anchors: content's settled lights merged with the
   * server's runtime havens (waystations). Rebuilt whenever the haven
   * list arrives — every client danger read (music mood, map tint)
   * uses this array so it stays in lockstep with the server's field.
   */
  dangerAnchors: readonly DangerAnchor[] = SETTLED_ANCHORS;
  /** Chosen base look; null until creation completes. */
  ownLook: Look | null = null;
  aim = 0;
  rttMs = 0;
  serverTick = 0;
  /** Snapshots folded into the clock (young clocks converge faster). */
  private clockSamples = 0;
  /** EWMA of snapshot arrival deviation — what the delay must absorb. */
  private jitterEwma = 0;
  /** Consecutive >300ms clock deviations (sustained ⇒ real step). */
  private bigDevRun = 0;
  /**
   * ADAPTIVE interpolation delay, slewed toward the jitter-derived
   * target (see targetInterpDelay). A fixed 120ms taxed every clean
   * connection ~40ms of unnecessary remote-player lag; a jittery one
   * needs MORE than 120 to stop freeze-jump. Slew ≤15ms/s: the remote
   * timeline may stretch, never snap.
   */
  private interpDelayMs = INTERP_DELAY_MS;
  /** World-clock offset in ticks (dev /time); see sim/daylight. */
  timeOfs = 0;

  inventory: InvSlot[] = [];
  /** THE KEY RING mirror — every dungeon key held, outside the pack. */
  keyRing: Array<{ id: number; roll: ItemRoll }> = [];
  /** THE KEY LEDGER mirror — every door ever held, with margin notes. */
  keyLore: KeyLore[] = [];
  skills: SkillXp = {};
  /** Recipes known beyond the core set (server-owned; see 'recipes'). */
  knownRecipes: ReadonlySet<string> = new Set();
  /**
   * THE WORLDS APART: the law of the plane the body stands on —
   * ambience, cutaway, chart behavior, and fog persistence all read
   * from here instead of any y-line. Set by the welcome and by every
   * S2CPlane crossing.
   */
  plane: PlaneWire = { id: 'surface', name: '', underground: false, persistent: true };
  /**
   * THE CHART: persistent fog-of-war, ONE MASK PER PLANE (coordinates
   * across planes legitimately overlap). Seeded by the login snapshot
   * and cleared locally with the shared deterministic disc — the
   * server marks the identical cells, so no reveal ever travels the
   * wire. Scratch planes chart into dungeonExplored instead.
   */
  private readonly exploredByPlane = new Map<string, ExploredMask>();
  /** The per-run scratch chart (rift planes) — never persisted. */
  readonly dungeonExplored = new ExploredMask();

  /** The named plane's persistent mask, materialized on first touch. */
  exploredFor(planeId: string): ExploredMask {
    let mask = this.exploredByPlane.get(planeId);
    if (!mask) this.exploredByPlane.set(planeId, (mask = new ExploredMask()));
    return mask;
  }

  /**
   * The CURRENT plane's chart — the mask every reader (map, reveal)
   * sees. Persistent planes read their own mask; scratch planes read
   * the per-run chart. The getter keeps the one-mask call sites honest
   * across every crossing.
   */
  get explored(): ExploredMask {
    return this.plane.persistent ? this.exploredFor(this.plane.id) : this.dungeonExplored;
  }
  /** The place ledger, keyed by discovery id. */
  readonly discoveries = new Map<string, DiscoveryWire>();
  /**
   * THE CHAMPION'S MARK: every victory banner standing on the shard,
   * by cell key. Whole-list replaced by the wire (the havens dialect);
   * the renderer stakes a living standard at each anchor.
   */
  readonly trophies = new Map<string, TrophyWire>();
  /**
   * Local fly-in clocks: banner id → performance.now() when its
   * `fresh` cue arrived. Banners without an entry stand settled (a
   * welcome-time roster never replays its ceremonies).
   */
  readonly trophyBorn = new Map<string, number>();
  /** The one active waypoint (optimistic; server keeps the durable copy). */
  waypoint: { x: number; y: number; plane?: string } | null = null;
  /** Where the reader last fell — the spilled pack's skull on the
   *  chart. `until` is a local clock stamp built from the wire's
   *  duration; the server clears it on arrival or expiry. */
  deathMark: { x: number; y: number; until: number; plane?: string } | null = null;
  /**
   * THE SAND AND THE ROAR: the live match card, null when no card
   * holds this soul. `deadlineAt` is a LOCAL clock (performance.now
   * base) derived from the wire's remainMs duration — the HUD counts
   * against it without ever trusting a wall clock off the wire.
   */
  arenaMatch: {
    phase: S2CArenaState['phase'];
    venue?: string;
    name?: string;
    round?: number;
    rounds?: number;
    deadlineAt: number | null;
    foes?: number;
    /** Set on a spectator-tagged state; the HUD self-clears when stale. */
    specAt?: number;
    /** Set when the wipe lands; the HUD holds the lost beat 2.6 s. */
    wipeAt?: number;
  } | null = null;
  /** THE QUEST LEDGER: active quests by id (status 'ready' = turn in). */
  readonly quests = new Map<string, QuestWire>();
  /** The done shelf, by id. */
  readonly questsDone = new Map<string, QuestDoneWire>();
  /** Offerable quests — the "!" over each giver resolves from this. */
  questAvailable: QuestAvailWire[] = [];
  /** Bumped on every ledger change — journal surfaces re-read on it. */
  questVersion = 0;
  /**
   * THE LEDGER OF NAMES: own standings by faction id, plus the LIVE
   * membership tables (actor slug / bestiary prefix -> faction) from
   * the bind push — per-viewer resolution (tints, marks) reads these,
   * never the shipped content seed (the questMarkFor law).
   */
  readonly repStandings = new Map<string, RepStandingWire>();
  repMembers: Record<string, string> = {};
  repPrefixes: Record<string, string> = {};
  /** Actor slugs that police their faction (from the bind push). */
  repEnforcers = new Set<string>();
  /** The band at which a hostile faction holds its fire. */
  repPeaceBand = 'trusted';
  /** Live band price multipliers — the Standing screen's legend. */
  repPrices: { champion: number; trusted: number; known: number; neutral: number; suspect: number } | null = null;
  /** The most recent standing move per faction (client-side ledger). */
  readonly repLastDelta = new Map<string, { delta: number; at: number }>();
  /** Bumped on every standing change — the Standing screen re-reads. */
  repVersion = 0;
  /** The party snapshot — empty members = partyless. Refetched on events. */
  party: { members: PartyMemberWire[]; invites: string[]; outgoing: string[] } | null = null;
  /** Fellow positions from the partypos ticker, keyed by name. */
  readonly partyPos = new Map<string, { x: number; y: number; plane: string; at: number }>();
  /** Bumped whenever fog, discoveries, or the waypoint change — map surfaces re-draw on it. */
  chartVersion = 0;
  private lastRevealAt = 0;
  equipment: Partial<Record<string, EquippedItem>> = {};
  /** Cosmetic idle weapon-carry preference (server-confirmed). */
  carryStyle: 'normal' | 'rogue' = 'normal';
  /** Off-fist grip preference — each hand carries its own way. */
  carryOff: 'normal' | 'rogue' = 'normal';
  /** Running timed action, for the progress bar. Craft actions carry
   *  their recipe and batch tally so the HUD can speak for the work. */
  action: {
    startedAt: number;
    durationMs: number;
    recipe?: string;
    made?: number;
    total?: number;
    /** THE HELD NOTE: the channeled art (bar tint + singing well). */
    ability?: string;
    slot?: number;
  } | null = null;
  /** "tx,ty" keys of this character's own built tiles (THE OWN-WORK OVERLAY). */
  ownBuilt: ReadonlySet<string> = new Set();
  /** Damage numbers floating up; pruned by the renderer. */
  readonly floaties: Floaty[] = [];
  /** Overhead interaction words (THE RISEN WORD); pruned by the renderer. */
  readonly words: RisenWord[] = [];
  /**
   * Projectiles that just ended flight (hit, expired, or left view) —
   * consumed by the renderer for impact bursts and stuck arrows.
   */
  readonly projectileEnds: Array<{ x: number; y: number; dir: number; style: string }> = [];
  /** Predicted own shots in flight, awaiting their server entity (v8). */
  readonly ownShots: OwnShot[] = [];
  /**
   * Matched tracer → entity handoffs. The renderer captures the visual
   * gap on the entity's first draw and splits it by axis (v10, THE
   * LEAD IS REPAID IN FLIGHT): the cross-track offset `ox/oy` and the
   * heading delta `od` decay together in ~120ms — the v9 steer, nose
   * leading the turn — while the along-track lead `along` is repaid
   * LINEARLY over `repayMs` (the flight remaining at capture), so the
   * spawn latency never reads as a brake-then-sprint; the shot flies a
   * hair slow the whole way and lands exactly on the server's impact.
   */
  readonly projHandoffs = new Map<
    EntityId,
    {
      shot: OwnShot;
      ox: number;
      oy: number;
      od: number;
      along: number;
      repayMs: number;
      capturedAt: number;
    }
  >();
  /**
   * Local staff-cadence mirror (bolt-bolt-HEAVY, same shared laws).
   * Gated in the SEQ domain, not wall-clock ms: one input frame is one
   * server tick, and the server re-arms in ticks. A ms-based gate can
   * only ever fire a frame LATE (rAF jitter), so its fire-seq drifts
   * monotonically behind the server's until the ±2 handoff window
   * breaks and every bolt draws twice — tracer plus real entity.
   */
  private staffReadySeq = 0;
  /**
   * THE ONE RHYTHM ENGINE's client mirror (seq units, not ticks): the
   * predicted staff string advances through the same ComboTrack law the
   * server swings by — including THE STRING BELONGS TO THE WEAPON (a
   * staff swap resets the mirrored stage exactly as the server resets).
   */
  private readonly comboLocal = freshCombo();
  /**
   * THE SPOKEN BEAT, as last spoken by the server: the stage the last
   * basic played at, the string's length, and when the string dies
   * (local clock, ms). Phase 2's beat UI reads this; until then it is
   * the honest record.
   */
  ownCombo: { stage: number; len: number; run: number; bornMs: number; graceUntilMs: number } | null =
    null;
  /**
   * THE PREDICTED BLOW: the melee swing mirror. On the press edge the
   * mirror advances the SAME ComboTrack the staff mirror rides and
   * feeds the predicted pose value to the renderer early — the anim
   * clock keys on pose CHANGE, and the server's confirming byte
   * carries the same value, so the choreography starts at the press
   * and never double-plays. A mispredicted swing simply expires
   * (cosmetic only — damage was never client-side).
   */
  private ownSwing: { pose: PoseState; startedAt: number; expiresAt: number } | null = null;
  private meleeReadySeq = 0;
  private meleeBufferedUntilSeq = 0;
  private staffBufferedUntilSeq = 0;
  private prevLocalButtons = 0;
  /** Local mirror of the cast commitment window (holds basics back). */
  private castFreezeUntilSeq = 0;
  /** NPC deaths this frame — drives the ragdoll + stuck-arrow scatter. */
  readonly npcDeaths: Array<{
    eid: EntityId;
    x: number;
    y: number;
    defId: string;
    /** Facing at the moment of death — the ragdoll snapshot's pose. */
    dir: number;
    /** Knock direction of the killing blow (0,0 = unknown). */
    kx: number;
    ky: number;
    crit: boolean;
    /** Damage of the killing blow — scales the ragdoll launch. */
    dmg: number;
    /** Humanoid actors: the base look, so the corpse keeps its face. */
    look?: Look;
    /** Worn gear ids by slot — the corpse keeps its armor and steel. */
    equip?: Partial<Record<EquipSlot, string>>;
    /** Enchant ids riding the gear — a flaming blade burns beside the body. */
    ench?: Partial<Record<EquipSlot, string>>;
  }> = [];
  /** Combat effects in flight; pruned by the renderer. */
  readonly fx: ActiveFx[] = [];
  /**
   * THE FOE'S BREATH: live enemy wind-ups by entity id, fed by
   * `charge` fx carrying an eid. The renderer draws the overhead
   * cast pip from this ledger and prunes what has ended; brokeAt
   * marks a fizzled breath (the pip gutters dark instead of filling).
   */
  readonly npcCasts = new Map<
    number,
    { startAt: number; endsAt: number; color?: string; id?: string; brokeAt?: number }
  >();

  /** Hotbar state: performance.now() when each slot comes off cooldown. */
  readonly abilityReadyAt: [number, number, number, number] = [0, 0, 0, 0];
  /** Full cooldowns in ticks (0 = nothing equipped in that slot). */
  abilityMax: [number, number, number, number] = [0, 0, 0, 0];
  /** THE SECOND HAND: the seated techniques, [Q, R] (server-confirmed). */
  techniques: [string | null, string | null] = [null, null];
  /** Earned arts: deed pages and mastered secrets alike (server truth). */
  earnedArts: string[] = [];
  /** THE LESSON LAW's banks: mirrored XP per still-learning secret. */
  lessons: Record<string, number> = {};
  /** Answered Callings (server truth; Focus derives from skills). */
  callings: string[] = [];
  /** APPLIED ranks past I by id (callings-v2 Phase 4; absent = Rank I). */
  callingRanks: Record<string, number> = {};
  /** Active consumable buffs (tonic/food) for the HUD chip row. */
  buffs: BuffInfo[] = [];
  /**
   * THE SWING CHANNEL's live multiplier, mirrored off S2CBuffs so the
   * prediction lanes pay the SAME recovery the server pays (absent on
   * the wire = the trained 1). Never derived locally — the server's
   * fold is the truth and this is its mirror.
   */
  swingMult = 1;
  /** THE STANDING SHELL: the own live ward total (0 = no dome). */
  ownWard = 0;
  /** When the last standing ward crossed to nothing (0 = never). */
  wardShatteredAt = 0;
  /** performance.now() when the buffs snapshot arrived (chips count down). */
  buffsAt = 0;
  /** Fires when the buff list changes (HUD refresh). */
  onBuffs: (() => void) | null = null;
  /** THE LIVING SOIL: fires after any farm-care mirror change. */
  onFarm: (() => void) | null = null;
  /** THE ANIMALS OF THE YARD: a fresh release asks for its name. */
  onStockCeremony: ((slot: number, species: string) => void) | null = null;
  /**
   * THE METER SHOWS ITS HAND: the own body's stacking-working meters
   * (proc id, banked count, count asked). Name, school, and icon are
   * resolved from the roster by id at render time.
   */
  charges: ChargeInfo[] = [];
  /** The saddle: active mount def id (server truth), null afoot. */
  ownMount: string | null = null;
  /** Mount def ids this character owns — the stable row's truth. */
  ownedMounts: string[] = [];
  /** Fires when saddle state changes (HUD / stable row refresh). */
  onRide: (() => void) | null = null;
  /** THE OPEN HAND: the household mirror — every kept companion. */
  ownPets: PetInfo[] = [];
  /** THE QUIET HEEL: slot → local ms when the bond moment reopens. */
  private petBondReadyAt = new Map<number, number>();
  /** Fires when the household changes (HUD refresh). */
  onPet: (() => void) | null = null;
  /** Fires once per fresh tame: raise the naming card for this slot. */
  onPetCeremony: ((slot: number, currentName: string) => void) | null = null;
  /** Fires when the local player commits a cast (FX + audio hooks). */
  onCastFx: ((slot: AbilitySlot, ab: AbilityDef) => void) | null = null;
  /**
   * THE DRAWN BREATH: the local wind-up, for the cast bar and the
   * winding well. Predicted on the press edge from the same content
   * def the server reads; the server's own S2CCast start/fire/break
   * keeps it honest within a round trip. `rate` is the last frame's
   * accrual (1 or CAST_STILL_FACTOR) so the bar renders smooth
   * between 20 Hz ticks.
   */
  ownCast: { slot: AbilitySlot; ab: AbilityDef; progress: number; total: number; rate: number } | null =
    null;
  /** Fires when the local player begins a wind-up (cue hooks). */
  onCastStart: ((slot: AbilitySlot, ab: AbilityDef) => void) | null = null;
  /** Fires when the technique loadout changes (UI refresh). */
  onTechniques: (() => void) | null = null;
  onCallings: (() => void) | null = null;
  /** Fires for every arriving combat effect (audio/shake hooks). */
  onFx: ((fx: ActiveFx) => void) | null = null;
  /** Buttons of the previous outgoing frame — press-edge detection. */
  private prevSentButtons = 0;
  /**
   * THE HELD SIGIL: the hold-to-aim layer (main.ts owns it) rewrites
   * each outgoing frame — withholding a held point-art's bit, then
   * raising it for one frame with the aimed `tx`/`ty` on release. Runs
   * BEFORE the cast mirror so the radial and freeze track the release,
   * exactly like the server will.
   */
  groundAim: { filterFrame(frame: InputFrame): void } | null = null;
  /** Local player's status bits from the latest snapshot. */
  ownStatus = 0;

  /** Crouch latch — mirrors the input toggle for HUD/render. */
  get isSneaking(): boolean {
    return this.input.sneakMode;
  }

  /** Server-confirmed full stealth (own snapshot bit). */
  get isHidden(): boolean {
    return (this.ownStatus & SNEAK_HIDDEN_BIT) !== 0;
  }

  /** A hostile NPC is currently chasing us (own snapshot bit). */
  get isDetected(): boolean {
    return (this.ownStatus & SNEAK_DETECTED_BIT) !== 0;
  }

  /** Weapons stowed on the body (own snapshot bit, server-owned). */
  get isSheathed(): boolean {
    return (this.ownStatus & SHEATHED_BIT) !== 0;
  }

  /**
   * ONE LAW, TWO MIRRORS — the predicted sheathe state. The snapshot
   * bit is a round trip stale; a fire mirror reading it would happily
   * loose a tracer for the press the server spends DRAWING (THE
   * SAFETY converts a sheathed combat press into a draw, no shot).
   * Toggles are deterministic per press, so the mirror leads and the
   * snapshot confirms: null = trust the server bit; a set value wins
   * until the bit agrees (or the claim goes stale — a dropped frame —
   * and the server bit takes back the truth).
   */
  private ownSheathed: boolean | null = null;
  /** performance.now() when ownSheathed was last asserted. */
  private ownSheathedAt = 0;
  /**
   * No local swing/bolt/draw/cast until this input seq — the mirror of
   * the server's drawLockUntilSeq, fed by the same three verbs (the
   * sheathed combat press's auto-draw, and the swap beat). The server
   * gates on this seq AND its own tick twin (ONE LAW, TWO CLOCKS);
   * for a healthy 20Hz stream both expire on the same press. When a
   * jitter catch-up briefly holds the server's tick floor past this
   * mirror, the press rides the held bit / armBuffer a tick or two
   * and the tracer marriage's ±2 window + angle fallback absorb it.
   */
  private drawLockUntilSeq = 0;

  /** The sheathe state the fire mirrors must judge by. */
  private effectiveSheathed(): boolean {
    return this.ownSheathed ?? this.isSheathed;
  }

  /**
   * The server's weaponsAway gate, mirrored: stowed steel or a
   * mid-draw lock refuses every fire mirror — no tracer, no predicted
   * swing, no radial, exactly the presses the server refuses.
   */
  private weaponsAway(seq: number): boolean {
    return this.effectiveSheathed() || seq < this.drawLockUntilSeq;
  }

  /** The predicted sheathe truth, for UI consumers (the aim ring). */
  sheathedNow(): boolean {
    return this.effectiveSheathed();
  }

  /**
   * ONE LAW, TWO MIRRORS for the aim ring: true while the NEXT cast
   * press would be refused (weapons away, cast freeze, a winding
   * breath). The ring must not arm-and-swallow a press the server
   * would refuse anyway — the refusal shape should be the same one
   * every other lane shows.
   */
  castGateClosed(): boolean {
    return (
      this.weaponsAway(this.inputSeq) ||
      this.inputSeq < this.castFreezeUntilSeq ||
      this.ownCast !== null
    );
  }

  /** Tap-to-move autopilot; cancelled by any manual movement input. */
  private autoPath: Vec2[] | null = null;
  /** Drop entity to take the moment the auto-walk brings it in reach. */
  private pendingPickup: EntityId | null = null;
  /**
   * THE CHOSEN HAND (looting v2): whether the walk-over vacuum serves
   * this character. Mirrors the server's persisted truth (welcome
   * carries it; setLootPref writes it optimistically).
   */
  lootAuto = true;
  /** Own hit-flash timer. */
  ownHurtUntil = 0;
  ownHpPct = 255;
  /** Authoritative pose for the local player (from snapshots). */
  ownPose = 0;
  /** Server-confirmed own facing (radians) — the seat-locked dir while
   *  mounted on furniture; the live aim everywhere else. */
  ownDirServer = 0;

  /**
   * THE PREDICTED TRADE: performance.now() when the local swap verb
   * last fired with something waiting at the back; 0 = never. The
   * renderer stows the own body through the beat's first half off this
   * clock, and main.ts hangs the stow/draw voice on its edge. Cosmetic
   * only — the server's exchange and beat lock are the authority.
   */
  ownSwapAt = 0;

  /**
   * True through the first half of the local swap beat — the outgoing
   * weapon riding to its rest. The back half is the standing sheathe
   * ease falling home with the incoming set (the equip echo lands
   * while the hand is at the hip, so the trade reads as one motion).
   */
  swapStowing(now = performance.now()): boolean {
    // Half the beat = the STOW_HANDOFF moment (sheath.ts) on the clock.
    return this.ownSwapAt > 0 && now < this.ownSwapAt + SWAP_BEAT_MS / 2;
  }

  /** Dodge FX hook (the predictor's onDodge is owned internally). */
  onDodgeFx: ((x: number, y: number, mx: number, my: number) => void) | null = null;
  /**
   * THE GUARD SWEEP's client eye: injected by main (which owns the
   * entity scan) — true when a living foe stands within `range` tiles.
   * The staff mirror uses it to hold its bolt tracer when the server
   * will strike with the pole instead.
   */
  foeWithin: ((range: number) => boolean) | null = null;
  /** Fires the instant the local player releases a valid draw. */
  onLoose: ((charge: number, aim: number) => void) | null = null;
  /** performance.now() when the local bow draw began; 0 = not drawing. */
  private drawStartAt = 0;
  /** Local estimate of the attack cooldown, for draw-start gating. */
  private drawReadyAt = 0;

  private conn: Connection | null = null;
  private token: string | null = null;
  private inputSeq = 1;
  private accumulator = 0;
  private lastUpdate = 0;
  private clockOffset: number | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 500;
  private stopped = false;
  /**
   * THE LIVE WIRE: performance.now() of the last byte the server spoke
   * — any message, snapshot, or chunk. In-game a healthy wire is never
   * silent longer than one tick (the own body ships in every snapshot,
   * THE QUIET WIRE notwithstanding), so this clock going stale IS the
   * connection dying — including the death TCP never reports: a route
   * change or dropped Wi-Fi leaves the socket reading "open" for
   * minutes while the world stands frozen at its last sample. The
   * watchdog in update() reads this and forces the reconnect the
   * close event would never have delivered.
   */
  private lastS2CAt = 0;
  /**
   * Arrival stamp of the previous snapshot — the clock discipline's
   * burst detector (see handleSnapshot): back-to-back arrivals are a
   * stalled queue draining, not evidence about the remote clock.
   */
  private lastSnapArrivalAt = 0;

  constructor(
    private readonly input: InputManager,
    private readonly events: GameEvents,
  ) {
    this.predictor.onDodge = (x, y, mx, my) => {
      this.drawStartAt = 0; // dodging lets the string down
      // THE DRAWN BREATH's bail-out, mirrored off the same seq-gated
      // dodge law the server fires with — the bar and the truth agree.
      this.ownCast = null;
      // THE DODGE-WEAVE, mirrored: the fired dodge cuts the rest of
      // every basic recovery to the shared floor (the server clamps
      // attackCooldown, which gates all three lanes).
      const dodgeSeq = this.inputSeq - 1;
      this.meleeReadySeq = Math.min(this.meleeReadySeq, dodgeSeq + DODGE_CANCEL_FLOOR_TICKS);
      this.staffReadySeq = Math.min(this.staffReadySeq, dodgeSeq + DODGE_CANCEL_FLOOR_TICKS);
      this.drawReadyAt = Math.min(
        this.drawReadyAt,
        performance.now() + DODGE_CANCEL_FLOOR_TICKS * TICK_MS,
      );
      this.onDodgeFx?.(x, y, mx, my);
    };
  }

  /**
   * THE OVERCHARGE: true once the held draw has pulled past full into
   * the volley band — the HUD's second click and the release's fan.
   */
  get ownOvercharged(): boolean {
    if (this.drawStartAt === 0) return false;
    const ticks = Math.round((performance.now() - this.drawStartAt) / TICK_MS);
    return isOvercharged(ticks);
  }

  /** 0..1 charge of the local player's in-progress bow draw. */
  get ownDrawT(): number {
    if (this.drawStartAt === 0) return 0;
    return Math.min(1, (performance.now() - this.drawStartAt) / (DRAW_FULL_TICKS * TICK_MS));
  }

  private equippedWeaponDef() {
    const worn = this.equipment.weapon;
    return worn ? itemDef(worn.id)?.weapon ?? null : null;
  }

  /** The combat style of the equipped weapon (bare fists = melee). */
  currentStyle(): string {
    return this.equippedWeaponDef()?.style ?? 'onehand';
  }

  /**
   * THE LOAN LAW's teaching hands, mirrored: the arts the held weapons
   * lend — main hand and offhand both (a dual wielder hears both
   * blades).
   */
  equippedArtIds(): Set<string> {
    const out = new Set<string>();
    const main = this.equippedWeaponDef()?.art;
    if (main) out.add(main);
    const off = itemDef(this.equipment.offhand?.id ?? '')?.weapon?.art;
    if (off) out.add(off);
    return out;
  }

  /** A mastered or deed-earned art is owned outright (server truth). */
  ownsArt(ability: string): boolean {
    return this.earnedArts.includes(ability);
  }

  /**
   * THE LESSON LAW's meter, 0..1, for a still-learning secret art —
   * null when nothing is banked or the art is already owned. Cost
   * derives from the shared masteryXp dial; the wire carries the bank.
   */
  lessonProgress(ability: string): number | null {
    if (this.ownsArt(ability)) return null;
    const banked = this.lessons[ability];
    if (!banked) return null;
    const anchor = techniquePoolDef(ability)?.secret?.anchorLevel;
    if (anchor === undefined) return null;
    return Math.min(1, banked / masteryXp(anchor));
  }

  /**
   * Resolve a technique seat (0 = Q, 1 = R), mirroring the server:
   * THE FREE HAND ignores the equipped weapon; THE HONED-ART LAW ranks
   * by the BASE skill level; THE LOAN LAW keeps an unmastered secret
   * at Rank I.
   */
  private seatAbilityDef(seat: 0 | 1): AbilityDef | null {
    const chosen = this.techniques[seat];
    if (!chosen) return null;
    const ab = abilityDef(chosen);
    if (!ab) return null;
    const tech = techniquePoolDef(chosen);
    if (!tech?.ranks) return ab;
    if (tech.secret && !this.ownsArt(chosen)) return ab;
    const rank = techniqueRankFor(tech, levelForXp(this.skills[tech.style] ?? 0));
    return honedAbility(ab, tech.ranks, rank);
  }

  /**
   * THE LOAN LAW's dormancy, mirrored for the tray: an unmastered
   * secret sleeps while no teaching weapon is in hand.
   */
  seatDormant(slot: AbilitySlot): boolean {
    const seat = slot === 0 ? 0 : slot === 2 ? 1 : null;
    if (seat === null) return false;
    const chosen = this.techniques[seat];
    if (!chosen) return false;
    const tech = techniquePoolDef(chosen);
    if (!tech?.secret) return false;
    if (this.ownsArt(chosen)) return false;
    return !this.equippedArtIds().has(chosen);
  }

  /** The ability in a hotbar slot: two technique seats, relic, sigil. */
  slotAbilityDef(slot: AbilitySlot): AbilityDef | null {
    switch (slot) {
      case 0:
        return this.seatAbilityDef(0);
      case 1: {
        const relic = itemDef(this.equipment.relic?.id ?? '');
        return relic?.relic ? (abilityDef(relic.relic) ?? null) : null;
      }
      case 2:
        return this.seatAbilityDef(1);
      case 3: {
        const sigil = itemDef(this.equipment.sigil?.id ?? '');
        return sigil?.sigil ? (abilityDef(sigil.sigil) ?? null) : null;
      }
    }
  }

  /** Seat a technique on Q (slot 0) or R (slot 2); server validates. */
  sendTechnique(ability: string, slot: 0 | 2): void {
    this.conn?.send({ t: 'technique', ability, slot });
  }

  /**
   * Answer, deepen, or set down a Calling (server enforces THE FOCUS
   * LAW and the rank entitlement). `rank` = the applied rank to hold.
   */
  sendCalling(calling: string, on: boolean, rank?: number): void {
    this.conn?.send({ t: 'calling', calling, on, ...(rank !== undefined ? { rank } : {}) });
  }

  /** Remaining cooldown fraction for a hotbar slot, 0 = ready. */
  abilityCdFraction(slot: AbilitySlot, now = performance.now()): number {
    const max = this.abilityMax[slot];
    if (max <= 0) return 0;
    const left = this.abilityReadyAt[slot] - now;
    if (left <= 0) return 0;
    return Math.min(1, left / (max * TICK_MS));
  }

  /**
   * Local press-edge cast mirror: starts the radial instantly, roots the
   * predictor for the commitment window, and applies dash Arts so the
   * server's authoritative version lands where we already are.
   */
  private trackOwnCasts(frame: InputFrame): void {
    const pressed = frame.buttons & ~this.prevSentButtons;
    this.prevSentButtons = frame.buttons;
    const now = performance.now();
    const slots: Array<[number, AbilitySlot]> = [
      [InputButton.Ability1, 0],
      [InputButton.Ability2, 1],
      [InputButton.Ability3, 2],
      [InputButton.Ability4, 3],
    ];
    // THE DRAWN BREATH's press-edge bail-outs, mirrored: sheathe, the
    // saddle, and rest each break the breath on the press the server
    // breaks it on. (The dodge mirrors via predictor.onDodge — the
    // seq-gated law — so a dodge press on cooldown never lies.)
    if (
      this.ownCast &&
      pressed & (InputButton.Sheathe | InputButton.Mount | InputButton.Sit)
    ) {
      this.ownCast = null;
    }
    for (const [bit, slot] of slots) {
      if (!(pressed & bit)) continue;
      // ONE LAW, TWO MIRRORS: while the weapons are away the server
      // spends this press drawing steel (THE SAFETY) — no cast fires,
      // so no radial starts and no cooldown is paid locally either.
      if (this.weaponsAway(frame.seq)) continue;
      // The cast-freeze gate, mirrored — the melee and staff lanes
      // already checked it; the cast lane wrote the clock and then
      // forgot to read it, so a press inside the freeze paid a
      // cooldown the server was refusing.
      if (frame.seq < this.castFreezeUntilSeq) continue;
      // THE DRAWN BREATH, mirrored: a second press of the winding slot
      // is the cancel; any other slot is refused while the breath holds.
      if (this.ownCast) {
        if (this.ownCast.slot === slot) this.ownCast = null;
        continue;
      }
      const ab = this.slotAbilityDef(slot);
      if (!ab || now < this.abilityReadyAt[slot]) continue;
      // THE LOAN LAW, mirrored: a dormant seat refuses locally too —
      // the radial must never start on a cast the server will refuse.
      if (this.seatDormant(slot)) continue;
      if ((ab.castTicks ?? 0) > 0) {
        // The pay waits for the fire: no radial start, no root — the
        // bar begins at once and the server's fire starts the cooldown.
        this.ownCast = { slot, ab, progress: 0, total: ab.castTicks ?? 0, rate: 1 };
        this.drawStartAt = 0;
        this.onCastStart?.(slot, ab);
        continue;
      }
      // Pay with the SERVER'S OWN denominator when it has spoken (the
      // cooldowns push bakes gear.cooldownMult); the raw def value is
      // only the first-ever fallback — and never overwrite the
      // discounted max with the undiscounted one (the radial's
      // denominator used to jump on every cloth-discounted cast).
      const cdTicks = this.abilityMax[slot] > 0 ? this.abilityMax[slot] : ab.cooldownTicks;
      this.abilityReadyAt[slot] = now + cdTicks * TICK_MS;
      if (this.abilityMax[slot] <= 0) this.abilityMax[slot] = ab.cooldownTicks;
      this.drawStartAt = 0; // casting lets the bowstring down
      this.castFreezeUntilSeq = frame.seq + (ab.castFreezeTicks ?? 0);
      this.predictor.registerCast(
        frame.seq,
        ab.castFreezeTicks ?? 0,
        this.castImpulse(ab, frame),
      );
      this.onCastFx?.(slot, ab);
    }
  }

  /**
   * THE CROSSING, mirrored: the movement a cast carries, for the
   * predictor. Every transport art is predicted now — dashes and
   * charges walk the same seq-window road the server's transit
   * walks, blinks leave through the SAME shared teleport resolver,
   * and a road released on an aimed ring travels exactly the
   * clamped distance the server will (one reach ruler, one clamp
   * law). A locked charge's live curve toward a moving mark stays
   * server-side — the straight-line mirror is the recorded bounded
   * drift and folds through the error offset.
   */
  private castImpulse(ab: AbilityDef, frame: InputFrame): CastMove | null {
    const kind = travelKindOf(ab);
    if (!kind) return null;
    const tiles = ab.dashTiles ?? (ab.shape === 'leap_slam' ? 4 : 3);
    const sign = Math.sign(tiles) || 1;
    let dist = Math.abs(tiles);
    let dirX = Math.cos(frame.aim) * sign;
    let dirY = Math.sin(frame.aim) * sign;
    // A ring placed short travels short — the server's own clamp law,
    // from the same predicted body position the release resolved at.
    if (frame.tx !== undefined && frame.ty !== undefined && groundAimed(ab)) {
      const p = this.predictor.pos;
      const dx = frame.tx - p.x;
      const dy = frame.ty - p.y;
      const want = Math.min(Math.hypot(dx, dy), groundAimRange(ab));
      if (want > 0.1) {
        dist = Math.min(dist, want);
        const raw = Math.hypot(dx, dy);
        if (raw > 0.05) {
          dirX = dx / raw;
          dirY = dy / raw;
        }
      }
    }
    if (dist < 0.05) return null;
    return { kind, dirX, dirY, dist };
  }

  /**
   * THE PREDICTED TRADE: the swap's choreography starts on the press
   * edge (the PREDICTED BLOW insight — feed the stow early, let the
   * standing sheathe ease play it), and the mirror clocks clamp
   * FORWARD so the predicted body never swings a blow the server's
   * beat lock will refuse. Fires only when the local pack knows
   * something waits at the back — the empty press stays silent here
   * and the server speaks the refusal. Cosmetic on mispredict: a
   * stale local view plays a beat over nothing and touches no
   * authority. Dodge stays free through the beat, like the server.
   */
  /**
   * THE SAFETY, mirrored — the sheathe toggle and the auto-draw. The
   * server flips `sheathed` on the Sheathe press edge and converts a
   * sheathed combat press into a DRAW behind DRAW_LOCK_TICKS; the
   * mirror plays both on the same edges so no fire mirror ever
   * predicts a shot for a press the server spends pulling steel.
   * Runs FIRST in the frame pipeline (the server reads its buttons in
   * this order too: sheathe → swap → auto-draw → casts → attacks).
   */
  private trackOwnSheathe(frame: InputFrame, now: number): void {
    const pressed = frame.buttons & ~this.prevLocalButtons;
    if (pressed & InputButton.Sheathe) {
      const stowing = !this.effectiveSheathed();
      this.ownSheathed = stowing;
      this.ownSheathedAt = now;
      if (stowing) {
        this.drawStartAt = 0; // the string lets down
        this.ownCast = null; // stowed steel casts nothing
        resetCombo(this.comboLocal); // the stowed string is a dropped string
      }
    }
    const combatPressed =
      pressed &
      (InputButton.Attack |
        InputButton.Ability1 |
        InputButton.Ability2 |
        InputButton.Ability3 |
        InputButton.Ability4);
    if (combatPressed && this.effectiveSheathed()) {
      // The press is spent drawing — the weapon comes out and the
      // lock holds every mirror until the pull-out has played.
      this.ownSheathed = false;
      this.ownSheathedAt = now;
      this.drawLockUntilSeq = Math.max(this.drawLockUntilSeq, frame.seq + DRAW_LOCK_TICKS);
    }
  }

  private trackOwnSwap(frame: InputFrame, now: number): void {
    if (!hasButton(frame.buttons, InputButton.Swap)) return;
    if (!this.equipment.stowWeapon && !this.equipment.stowOffhand) return;
    if (now < this.ownSwapAt + SWAP_BEAT_MS) return; // the beat swallows re-presses
    this.ownSwapAt = now;
    this.drawStartAt = 0; // the string lets down with the trade
    this.ownCast = null; // traded steel casts nothing — the bar agrees
    // A trade is made to fight: the incoming set draws (server law),
    // and the beat rides the same seq-domain lock the server holds.
    this.ownSheathed = false;
    this.ownSheathedAt = now;
    this.drawLockUntilSeq = Math.max(this.drawLockUntilSeq, frame.seq + SWAP_BEAT_TICKS);
    this.meleeReadySeq = Math.max(this.meleeReadySeq, frame.seq + SWAP_BEAT_TICKS);
    this.staffReadySeq = Math.max(this.staffReadySeq, frame.seq + SWAP_BEAT_TICKS);
    this.drawReadyAt = Math.max(this.drawReadyAt, now + SWAP_BEAT_MS);
  }

  /**
   * Local mirror of the server's draw state machine, driven by the same
   * input frames — gives zero-latency draw/release feedback while the
   * server stays authoritative about the arrow itself.
   */
  private trackOwnDraw(frame: InputFrame, now: number): void {
    const weapon = this.equippedWeaponDef();
    if (!weapon || weapon.style !== 'archery') {
      this.drawStartAt = 0;
      return;
    }
    const held = hasButton(frame.buttons, InputButton.Attack);
    const hasAmmo =
      !weapon.ammo ||
      this.inventory.some((s) => s !== null && s.item === weapon.ammo && s.qty > 0);
    if (held) {
      // ONE LAW, TWO MIRRORS: the server's draw machine only runs
      // when the weapons are out and no breath holds the hands
      // (weaponsAway / stillCasting) — the mirror starts no draw the
      // server won't.
      if (
        this.drawStartAt === 0 &&
        now >= this.drawReadyAt &&
        hasAmmo &&
        !this.weaponsAway(frame.seq) &&
        this.ownCast === null &&
        frame.seq >= this.castFreezeUntilSeq &&
        !this.action?.ability
      ) {
        this.drawStartAt = now;
      }
      return;
    }
    if (this.drawStartAt === 0) return;
    const heldMs = now - this.drawStartAt;
    const charge = this.ownDrawT;
    this.drawStartAt = 0;
    // The server re-checks the quiver at release and bails silently —
    // the mirror looses no tracer for an arrow that isn't there.
    if (!hasAmmo) return;
    const speed = weapon.projectileSpeed ?? 12;
    if (heldMs >= DRAW_MIN_TICKS * TICK_MS) {
      this.drawReadyAt = now + weapon.cooldownTicks * TICK_MS;
      this.onLoose?.(charge, this.aim);
      // Predicted arrow (v8): the same chargedShot law the server fires
      // with — the tracer flies the true speed/range for this draw.
      const ticks = Math.round(heldMs / TICK_MS);
      const shot = chargedShot(drawCharge(ticks), 1, speed, weapon.range);
      if (isOvercharged(ticks)) {
        // THE OVERCHARGE VOLLEY, mirrored: three tracers fan out
        // exactly where the server's three shafts will fly.
        this.predictShot(frame.seq, 'archery', this.aim, shot.speed, shot.range);
        this.predictShot(frame.seq, 'archery', this.aim - VOLLEY_SPREAD, shot.speed, shot.range);
        this.predictShot(frame.seq, 'archery', this.aim + VOLLEY_SPREAD, shot.speed, shot.range);
      } else {
        this.predictShot(frame.seq, 'archery', this.aim, shot.speed, shot.range);
      }
    } else {
      // Snap shot — instant hip-fire, quick recovery, rapid-tap rhythm.
      this.drawReadyAt = now + 6 * TICK_MS;
      this.onLoose?.(0, this.aim);
      const shot = snapShot(1, speed, weapon.range);
      this.predictShot(frame.seq, 'archery', this.aim, shot.speed, shot.range);
    }
  }

  /**
   * Staff bolts fire while Attack is HELD, cadence-gated — mirror the
   * server's bolt-bolt-HEAVY rhythm with the same shared functions so
   * the predicted bolt and the real one agree on stage, speed, and
   * recovery. A mispredicted bolt (rare cadence drift) simply never
   * matches an entity and fades.
   */
  private trackOwnStaff(frame: InputFrame): void {
    const worn = this.equipment.weapon;
    const weapon = this.equippedWeaponDef();
    if (!worn || !weapon || weapon.style !== 'arx') return;
    // ONE LAW, TWO MIRRORS: stowed steel, a mid-draw lock, a winding
    // breath, or a held note fires nothing on the server — so nothing
    // arms, advances, or flies here either. (The server checks
    // weaponsAway and stillCasting before both the buffer and the
    // attack door; the mirror gates in the same place.)
    if (this.weaponsAway(frame.seq)) return;
    if (this.ownCast !== null) return;
    if (this.action?.ability) return;
    // THE HELD INTENT, mirrored for the wand lane too.
    if ((frame.buttons & ~this.prevLocalButtons) & InputButton.Attack) {
      const armed = armBuffer(this.staffReadySeq - frame.seq, frame.seq);
      if (armed) this.staffBufferedUntilSeq = armed;
    }
    if (frame.seq < this.staffReadySeq || frame.seq < this.castFreezeUntilSeq) return;
    const buffered = frame.seq <= this.staffBufferedUntilSeq;
    if (!hasButton(frame.buttons, InputButton.Attack) && !buffered) return;
    this.staffBufferedUntilSeq = 0;
    const moveset = movesetFor(weapon, worn.id);
    if (!moveset) return;
    // The worn ITEM id keys the string — the mirror resets on a staff
    // swap exactly when the server's track does; the page carries the
    // rhythm's length, recovery, and grace.
    const len = moveset.string.length;
    const stage = advanceCombo(this.comboLocal, worn.id, frame.seq, len);
    const strike = moveset.string[stage]!;
    const heavy = stage === len - 1;
    // THE SWING CHANNEL, mirrored: the same shared swingCooldown the
    // server pays, under the mult the buffs push carried, with the
    // same choreography floor — the two clocks can never drift.
    const staffHold = heavy ? STRIKE_CLOCKS.arx.finisher.holdTicks : STRIKE_CLOCKS.arx.swing.holdTicks;
    this.staffReadySeq =
      frame.seq +
      swingCooldown(Math.round(weapon.cooldownTicks * strike.recoveryMult), this.swingMult, staffHold);
    this.comboLocal.graceUntilTick = this.staffReadySeq + moveset.graceTicks;
    // THE GUARD SWEEP, mirrored: with a foe at the doorstep the server
    // strikes with the pole — no bolt leaves, so no tracer should.
    // The rhythm stage above still advanced (the beat is the beat).
    if (this.foeWithin?.(GUARD_SWEEP_RANGE)) return;
    const base = heavy ? 'arx_heavy' : 'arx';
    const defId = weapon.element ? `${base}:${weapon.element}` : base;
    this.predictShot(
      frame.seq,
      defId,
      frame.aim,
      (weapon.projectileSpeed ?? 12) * (strike.speedMult ?? 1),
      weapon.range,
    );
  }

  /**
   * THE PREDICTED BLOW: mirror the server's melee door on the press
   * edge — same ComboTrack, same buffer law, same recovery clocks, in
   * seq units. The mirror only gates on what it can see (sheathed
   * status, own cast, the channel rail); a rare misprediction plays a
   * cosmetic swing that expires, exactly the staff-tracer philosophy.
   */
  private trackOwnMelee(frame: InputFrame, now: number): void {
    const worn = this.equipment.weapon;
    const weapon = this.equippedWeaponDef();
    // The melee schools the mirror predicts — THE REACHING SCHOOL
    // joins the two it was born beside (the server's own swing gate
    // already counts polearm a melee style).
    if (
      !worn ||
      !weapon ||
      (weapon.style !== 'onehand' && weapon.style !== 'twohand' && weapon.style !== 'polearm')
    )
      return;
    // ONE LAW, TWO MIRRORS: the predicted sheathe + the seq-domain
    // draw lock — never the snapshot bit alone (a round trip stale;
    // it predicted swings the server's SAFETY was busy refusing).
    if (this.weaponsAway(frame.seq)) return;
    if (this.ownCast !== null || frame.seq < this.castFreezeUntilSeq) return;
    // An action carrying an ability is THE HELD NOTE — singing hands
    // swing nothing (crafting/gathering actions carry a recipe instead
    // and the server lets the swing cancel them, so they don't gate).
    if (this.action?.ability) return;
    const moveset = movesetFor(weapon, worn.id);
    if (!moveset) return;
    const pressed = frame.buttons & ~this.prevLocalButtons;
    // THE HELD INTENT, mirrored: a tap in the tail of recovery buffers.
    if (pressed & InputButton.Attack) {
      const armed = armBuffer(this.meleeReadySeq - frame.seq, frame.seq);
      if (armed) this.meleeBufferedUntilSeq = armed;
    }
    if (frame.seq < this.meleeReadySeq) return;
    const held = hasButton(frame.buttons, InputButton.Attack);
    const buffered = frame.seq <= this.meleeBufferedUntilSeq;
    if (!held && !buffered) return;
    this.meleeBufferedUntilSeq = 0;
    // THE MOVESET BOOK, mirrored: the page's own length, recovery, and
    // grace. Branch alts share their beat's recovery (content-pinned),
    // so the mirror never needs to know which branch the server took.
    const len = moveset.string.length;
    const stage = advanceCombo(this.comboLocal, worn.id, frame.seq, len);
    const strike = moveset.string[stage]!;
    const finisher = stage === len - 1;
    // THE REACHING SCHOOL owns its own clock — between the sword's
    // time and the mountain's — so the mirror's beat matches the
    // server's hold exactly, as it does for the other two.
    const clocks =
      weapon.style === 'twohand'
        ? STRIKE_CLOCKS.twohand
        : weapon.style === 'polearm'
          ? STRIKE_CLOCKS.polearm
          : STRIKE_CLOCKS.onehand;
    // THE SWING CHANNEL, mirrored: the same shared swingCooldown the
    // server pays, under the mult the buffs push carried, with the
    // same choreography floor — the two clocks can never drift.
    this.meleeReadySeq =
      frame.seq +
      swingCooldown(
        Math.round(weapon.cooldownTicks * strike.recoveryMult),
        this.swingMult,
        finisher ? clocks.finisher.holdTicks : clocks.swing.holdTicks,
      );
    this.comboLocal.graceUntilTick = this.meleeReadySeq + moveset.graceTicks;
    const ms = finisher ? clocks.finisher.ms : clocks.swing.ms;
    this.ownSwing = {
      pose: strikePose(moveset.poseDialect, stage, len),
      startedAt: now,
      // The server's confirming byte normally lands well inside the
      // choreography and adopts the swing (same pose value = no clock
      // restart). Past this, it was a misprediction — let it go.
      expiresAt: now + ms + 200,
    };
  }

  /**
   * The own body's pose as the renderer and the sound chain should see
   * it: the predicted swing wins while it lives, the server's byte
   * otherwise. Pose-change clocks downstream never double-fire because
   * the confirmed value equals the predicted one.
   */
  effectiveOwnPose(now: number): number {
    if (this.ownSwing) {
      if (now < this.ownSwing.expiresAt) return this.ownSwing.pose;
      this.ownSwing = null;
    }
    return this.ownPose;
  }

  /** Spawn a predicted tracer at the body, capped to a small roster. */
  private predictShot(seq: number, defId: string, aim: number, speed: number, range: number): void {
    const p = this.predictor.renderPos();
    const dirX = Math.cos(aim);
    const dirY = Math.sin(aim);
    // Walk the ray once in the server's sub-steps (v9): the tracer
    // dies where the world says — same shape-aware pointHitsShot the
    // server kills with, so a point-blank shot never pierces the wall.
    let wallAt = range;
    for (let d = 0.25; d <= range; d += 0.25) {
      if (pointHitsShot(this.world, p.x + dirX * d, p.y + dirY * d)) {
        wallAt = Math.max(0, d - 0.25);
        break;
      }
    }
    this.ownShots.push({
      seq,
      defId,
      x: p.x,
      y: p.y,
      dirX,
      dirY,
      dir: aim,
      speed,
      range,
      wallAt,
      bornAt: performance.now(),
    });
    if (this.ownShots.length > 8) this.ownShots.shift();
  }

  /**
   * The live connection status, mirrored from every onStatus emit —
   * the renderer reads it so a reconnect blip can keep visual state
   * (occluder fades) armed instead of snapping the world for a beat.
   */
  connStatus: 'connecting' | 'ingame' | 'reconnecting' | 'rejected' | 'authRequired' | 'authErr' =
    'connecting';

  private emitStatus(
    status: 'connecting' | 'ingame' | 'reconnecting' | 'rejected' | 'authRequired' | 'authErr',
    reason?: string,
  ): void {
    this.connStatus = status;
    this.events.onStatus(status, reason);
  }

  /** Connect; the server answers welcome (valid token) or authRequired. */
  connect(token: string | null): void {
    this.token = token;
    this.stopped = false;
    this.emitStatus('connecting');
    this.openConnection();
  }

  sendLogin(user: string, pass: string): void {
    this.conn?.send({ t: 'login', user, pass });
  }

  sendRegister(user: string, pass: string, name: string, invite?: string): void {
    this.conn?.send({ t: 'register', user, pass, name, invite: invite || undefined });
  }

  /**
   * Sign out: tell the server to burn the session, then hang up for
   * good. `stopped` first, so the socket's close does NOT wake the
   * reconnect backoff and walk straight back into the world.
   */
  logout(): void {
    this.conn?.send({ t: 'logout' });
    this.stopped = true;
    this.token = null;
    this.conn?.close();
  }

  private openConnection(): void {
    // THE LIVE WIRE: every S2C handler stamps the clock before it
    // works — one wrapper here, so no future message type can forget.
    const touch = <T>(handler: (arg: T) => void) => (arg: T): void => {
      this.lastS2CAt = performance.now();
      handler(arg);
    };
    this.conn = new Connection({
      onOpen: () => {
        // A fresh socket earns a fresh silence budget — the hello/
        // welcome round must not inherit the stall that killed the
        // last socket.
        this.lastS2CAt = performance.now();
        this.conn!.send({
          t: 'hello',
          v: PROTOCOL_VERSION,
          token: this.token ?? undefined,
        });
      },
      onClose: () => {
        if (this.stopped) return;
        this.emitStatus('reconnecting');
        this.ownEid = null;
        if (this.pingTimer) clearInterval(this.pingTimer);
        setTimeout(() => this.openConnection(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 5000);
      },
      onMessage: touch((msg) => this.handleMessage(msg)),
      onSnapshot: touch((snap) => this.handleSnapshot(snap)),
      onChunk: touch((chunk) => this.handleChunk(chunk)),
      onTilePatch: touch((patch) => this.handleTilePatch(patch)),
      onDetailPatch: touch((patch) => this.handleDetailPatch(patch)),
    });
    this.conn.connect();
  }

  get sessionToken(): string | null {
    return this.token;
  }

  /**
   * The settled anchors as last pushed by the server — the geography
   * is live data there, so the wire wins over the bundled constants.
   */
  private settledAnchors: readonly DangerAnchor[] = SETTLED_ANCHORS;

  /** Merge the server's haven triples with the settled anchors. */
  private setHavens(list: number[][], settled?: number[][]): void {
    if (settled) {
      this.settledAnchors = settled
        .filter((a) => a.length >= 3)
        .map(([x, y, safeR, haven, dread]) => ({
          x: x!,
          y: y!,
          safeR: safeR!,
          ...(haven ? { haven: true } : {}),
          ...(dread ? { dread } : {}),
        }));
    }
    this.dangerAnchors = [
      ...this.settledAnchors,
      ...list
        .filter((h) => h.length >= 3)
        .map(([x, y, safeR]) => ({ x: x!, y: y!, safeR: safeR!, haven: true })),
    ];
  }

  /**
   * THE CROSSING's reset work (docs/planes-plan.md §2.4), shared by
   * BOTH doors — the 'plane' message and a reconnect welcome that
   * wakes on a different plane than the one on screen. Everything
   * streamed before this moment belongs to a space that no longer
   * surrounds the player: drop it all and let the fresh plane stream
   * in behind the veil. POST-SHIP AUDIT: ephemeral matter is world
   * matter too — a queued death, a floating word, a spent shaft all
   * carry old-plane coordinates.
   *
   * `at` is the carried standing point; the welcome door passes none
   * (welcome carries no coordinates — the own body's 'enter' seats
   * the predictor, exactly as every welcome always has).
   */
  private crossPlane(plane: PlaneWire, at?: Vec2): void {
    this.plane = plane;
    this.world.dropAll();
    this.chunkWallFlags.clear();
    this.entities.clear();
    this.projHandoffs.clear();
    this.ownShots.length = 0;
    if (at) this.predictor.reset({ x: at.x, y: at.y });
    this.autoPath = null;
    this.pendingPickup = null;
    clearFarmMirror();
    this.signs.clear();
    this.fx.length = 0;
    // A same-tick kill drains AFTER the switch — an unswept queue
    // would ragdoll the victim onto the new plane.
    this.npcDeaths.length = 0;
    this.floaties.length = 0;
    this.words.length = 0;
    this.projectileEnds.length = 0;
    // Keyed "x,y" with no plane; the client re-requests the ledger on
    // entering build mode, so clearing is correct.
    this.ownBuilt = new Set();
    // Defense-in-depth: entering a scratch plane must never inherit a
    // previous run's fog (a harmless double-clear when the 'dungeon'
    // message also arrives).
    if (!plane.persistent) this.dungeonExplored.clear();
    this.worldVersion++;
    this.interiorsVersion++;
    this.chartVersion++;
    this.events.onPlane?.(plane);
  }

  /**
   * True once a welcome has seated this client in a world — the gate
   * that keeps THE SECOND DOOR shut over the login screen (a first
   * welcome's caches are empty; no veil is wanted there).
   */
  private stoodInWorld = false;

  private handleMessage(msg: S2CMessage): void {
    switch (msg.t) {
      case 'welcome': {
        this.ownEid = msg.eid;
        this.ownName = msg.name;
        this.worldSeed = msg.seed ?? null;
        this.setHavens(msg.havens ?? [], msg.anchors);
        // The plan is editable data server-side — the map must chart
        // the live truth, never the bundled copy.
        if (msg.geo) {
          try {
            replaceGeography(msg.geo as GeographyDef);
          } catch (err) {
            console.warn('[map] welcome geo rejected:', err);
          }
        }
        this.waypoint = msg.waypoint ?? null;
        // THE CHOSEN HAND: the persisted walk-over preference (an
        // older server sends nothing — the founding behavior).
        this.lootAuto = msg.lootAuto ?? true;
        // THE CHAMPION'S MARK: the standing banners ride the welcome —
        // they arrive settled (no fly-in replays a stranger's victory).
        this.trophies.clear();
        this.trophyBorn.clear();
        for (const t of msg.trophies ?? []) this.trophies.set(t.id, t);
        this.party = null;
        // THE SAND AND THE ROAR: a reconnect stands a fresh soul — a
        // severed member gets no 'off' (their socket was gone), so the
        // welcome lowers the card itself (the audit's find).
        this.arenaMatch = null;
        this.partyPos.clear();
        // THE WORLDS APART: the welcome names the waking plane; every
        // chart starts over (the login push refills the persistent
        // masks plane by plane).
        const wake: PlaneWire = msg.plane ?? {
          id: 'surface',
          name: '',
          underground: false,
          persistent: true,
        };
        // THE SECOND DOOR (post-ship audit): a reconnect can wake on a
        // DIFFERENT plane than the one on screen — the wire died during
        // a server-side transfer, and the 'plane' message it carried
        // died with it. Without the crossing reset every old-plane
        // cache survives and the client renders a mixed world. The
        // first welcome of a session never fires it.
        if (this.stoodInWorld && wake.id !== this.plane.id) {
          this.crossPlane(wake);
        } else {
          this.plane = wake;
        }
        this.stoodInWorld = true;
        this.exploredByPlane.clear();
        this.dungeonExplored.clear();
        this.discoveries.clear();
        this.chartVersion++;
        this.quests.clear();
        this.questsDone.clear();
        this.questAvailable = [];
        this.questVersion++;
        this.repStandings.clear();
        this.repMembers = {};
        this.repPrefixes = {};
        this.repVersion++;
        this.ownLook = msg.look ?? null;
        this.token = msg.token;
        this.serverTick = msg.tick;
        this.entities.clear();
        this.ownShots.length = 0;
        this.projHandoffs.clear();
        this.staffReadySeq = 0;
        resetCombo(this.comboLocal);
        this.ownCombo = null;
        this.ownSwing = null;
        this.meleeReadySeq = 0;
        this.meleeBufferedUntilSeq = 0;
        this.staffBufferedUntilSeq = 0;
        this.prevLocalButtons = 0;
        this.castFreezeUntilSeq = 0;
        this.ownCast = null;
        // The seq-domain lock and the sheathe claim belong to the OLD
        // input numbering — the server reset its twins the same way.
        this.drawLockUntilSeq = 0;
        this.ownSheathed = null;
        this.ownSheathedAt = 0;
        this.clockOffset = null;
        this.reconnectDelay = 500;
        this.emitStatus('ingame');
        if (msg.motd) this.events.onChat({ channel: 'system', text: msg.motd });
        if (!this.ownLook) this.events.onNeedLook?.();
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          this.conn?.send({ t: 'ping', ct: performance.now() });
        }, 2000);
        break;
      }
      case 'reject': {
        this.stopped = true;
        this.emitStatus('rejected', msg.reason);
        break;
      }
      case 'authRequired': {
        this.emitStatus('authRequired');
        break;
      }
      case 'authErr': {
        this.emitStatus('authErr', msg.reason);
        break;
      }
      case 'enter': {
        for (const meta of msg.entities) {
          if (meta.eid === this.ownEid) {
            this.predictor.reset({ x: meta.x, y: meta.y });
            continue;
          }
          const existing = this.entities.get(meta.eid);
          if (existing) {
            existing.meta = meta;
          } else {
            const buffer = new InterpBuffer();
            // THE ENTER GLIDE: seed the buffer at the enter position
            // on the render timeline, so a fresh body renders at once
            // and its first real samples INTERPOLATE from here — the
            // old empty buffer froze the body at meta.x/y for the
            // interp delay, then hopped onto the snapshot path (every
            // border re-enter and reappear paid it). Projectiles are
            // exempt: their v9 ballistic enter path projects on the
            // server-NOW timeline and a delayed seed would misplace
            // the first-in-flight frames.
            if (meta.kind !== EntityKind.Projectile) {
              const t0 = this.renderTime();
              if (t0 > 0) {
                buffer.push({
                  t: t0,
                  x: meta.x,
                  y: meta.y,
                  dir: meta.dir ?? 0,
                  pose: 0,
                  // Wire scale: 255 = full (u8), NOT a percent. Seeding
                  // 100 painted every freshly entered body at ~39% until
                  // its first real snapshot row landed — which the zone
                  // -entry chunk flood (snapshot backpressure) can hold
                  // off for seconds.
                  hpPct: 255,
                  status: 0,
                  alert: 0,
                });
              }
            }
            this.entities.set(meta.eid, { meta, buffer });
          }
          // Ballistic truth (v9): a projectile's known flight speed
          // lets the buffer project from its very first sample.
          if (meta.kind === EntityKind.Projectile && meta.speed !== undefined) {
            this.entities.get(meta.eid)!.buffer.ballisticSpeed = meta.speed;
          }
          // Tracer handoff (v8): our own projectile arrived — marry it
          // to the predicted shot that fired on (nearly) that seq. ±2
          // absorbs the case where cooldown expiry lands a frame later
          // server-side than the local mirror guessed; rapid-fire
          // shots are ≥6 seqs apart, so the window can't cross-match.
          if (
            meta.kind === EntityKind.Projectile &&
            meta.ownerEid === this.ownEid &&
            meta.seq !== undefined
          ) {
            // THE VOLLEY MARRIES BY ANGLE: seq distance ranks first,
            // heading closeness breaks the tie — the overcharge fan's
            // three shafts share one seq, and each entity now finds
            // the tracer that flew ITS ray instead of all three
            // fighting over the first. (The snap-fan's second arrow
            // stays honestly unpredicted: its tracer was already
            // claimed by the first marriage, and an unclaimed candidate
            // 0.14 rad off still beats no candidate at all.)
            let best: OwnShot | null = null;
            let bestIdx = -1;
            let bestScore = Infinity;
            for (let i = 0; i < this.ownShots.length; i++) {
              const shot = this.ownShots[i]!;
              const d = Math.abs(shot.seq - meta.seq);
              if (d > 2) continue;
              const a = meta.dir !== undefined ? Math.abs(shortestAngle(shot.dir, meta.dir)) : 0;
              const score = d * 10 + a;
              if (score < bestScore) {
                best = shot;
                bestIdx = i;
                bestScore = score;
              }
            }
            // Ordered-stream fallback: a server input-queue stall drops
            // frames and permanently shifts the seq↔tick mapping,
            // pushing every later shot outside the ±2 window. Both
            // streams are ordered, so marry the oldest unclaimed tracer
            // of the same kind whose heading agrees rather than draw
            // the shot twice — arrows included now (the heading gate is
            // what the old arx-only rule was missing: it keeps a
            // cross-seq marriage from pairing shots aimed apart).
            if (!best && meta.defId) {
              for (let i = 0; i < this.ownShots.length; i++) {
                const shot = this.ownShots[i]!;
                if (shot.defId !== meta.defId) continue;
                if (meta.dir !== undefined && Math.abs(shortestAngle(shot.dir, meta.dir)) > 0.6) {
                  continue;
                }
                best = shot;
                bestIdx = i;
                break;
              }
            }
            if (best) {
              this.ownShots.splice(bestIdx, 1);
              this.projHandoffs.set(meta.eid, {
                shot: best,
                ox: 0,
                oy: 0,
                od: 0,
                along: 0,
                repayMs: 0,
                capturedAt: 0,
              });
            }
          }
        }
        break;
      }
      case 'leave': {
        for (const eid of msg.eids) {
          const e = this.entities.get(eid);
          // A projectile leaving the world is an impact (or a spent
          // shaft) — hand its last known flight state to the renderer.
          if (e?.meta.kind === EntityKind.Projectile && this.projectileEnds.length < 64) {
            const last = e.buffer.latest();
            let ex = last?.x ?? e.meta.x;
            let ey = last?.y ?? e.meta.y;
            const edir = last?.dir ?? e.meta.dir ?? 0;
            // The shot died server-side within one tick of its last
            // sample (v9): advance that final step in the server's own
            // sub-steps, holding before the first solid — the shaft
            // sticks AT the wall face instead of a stride short of it.
            // Boomerangs end in the caster's hand; no advance.
            if (e.meta.speed !== undefined && !e.meta.returns) {
              const step = (e.meta.speed * TICK_MS) / 1000;
              const subs = Math.max(1, Math.ceil(step / 0.25));
              for (let i = 0; i < subs; i++) {
                const nx = ex + Math.cos(edir) * (step / subs);
                const ny = ey + Math.sin(edir) * (step / subs);
                if (pointHitsShot(this.world, nx, ny)) break;
                ex = nx;
                ey = ny;
              }
            }
            this.projectileEnds.push({ x: ex, y: ey, dir: edir, style: e.meta.defId ?? '' });
          }
          this.entities.delete(eid);
        }
        break;
      }
      case 'chat': {
        this.events.onChat({ channel: msg.channel, from: msg.from, eid: msg.eid, text: msg.text });
        break;
      }
      case 'notice': {
        // ONE MESSAGE, TWO VOICES: the sentence keeps the log honest,
        // the word stands up where the refusal happened.
        this.events.onChat({ channel: 'system', text: msg.text });
        const own = this.predictor.renderPos();
        const x = msg.x ?? own.x;
        const y = msg.y ?? own.y;
        const now = performance.now();
        // THE DEDUPE LAW: mashing the verb re-bumps the standing word
        // (the renderer re-pops it) — never a stack of copies.
        const standing = this.words.find(
          (w) => w.word === msg.word && Math.hypot(w.x - x, w.y - y) < 0.75 && now - w.bornAt < WORD_LIFE_MS,
        );
        if (standing) {
          standing.bornAt = now;
          standing.bumpedAt = now;
          standing.x = x;
          standing.y = y;
        } else {
          this.words.push({ x, y, word: msg.word, tone: msg.tone ?? 'deny', bornAt: now, bumpedAt: now });
        }
        break;
      }
      case 'pong': {
        this.rttMs = performance.now() - msg.ct;
        break;
      }
      case 'inv': {
        this.inventory = msg.slots;
        this.events.onInventory(msg.slots);
        break;
      }
      case 'keyring': {
        this.keyRing = msg.keys;
        this.events.onKeyRing?.(msg.keys);
        break;
      }
      case 'keylore': {
        this.keyLore = msg.known;
        this.events.onKeyLore?.(msg.known);
        break;
      }
      case 'keyforgeopen': {
        this.events.onKeyForgeOpen?.();
        break;
      }
      case 'skills': {
        this.skills = msg.xp;
        this.events.onSkills(msg.xp);
        break;
      }
      case 'recipes': {
        this.knownRecipes = new Set(msg.known);
        break;
      }
      case 'shopopen': {
        this.events.onShopOpen?.(msg.shop, msg.priceMult ?? 1);
        break;
      }
      case 'xp': {
        this.skills[msg.skill] = msg.xp;
        this.events.onSkills(this.skills);
        this.events.onXp({
          skill: msg.skill,
          gained: msg.gained,
          level: msg.level,
          levelledUp: msg.levelledUp,
        });
        break;
      }
      case 'ownbuilt': {
        this.ownBuilt = new Set(msg.keys);
        this.events.onOwnBuilt?.(this.ownBuilt);
        break;
      }
      case 'action': {
        if (msg.state === 'start') {
          this.action = {
            startedAt: performance.now(),
            durationMs: (msg.ticks ?? 0) * TICK_MS,
            recipe: msg.recipe,
            made: msg.made,
            total: msg.total,
            ability: msg.ability,
            slot: msg.slot,
          };
          this.events.onActionStart?.(
            msg.ticks ?? 0,
            msg.recipe !== undefined
              ? { recipe: msg.recipe, made: msg.made ?? 0, total: msg.total ?? 1 }
              : undefined,
          );
        } else {
          this.action = null;
          this.events.onActionEnd?.(msg.reason, msg.made);
        }
        break;
      }
      case 'equip': {
        this.equipment = msg.equipment;
        if (msg.carry) this.carryStyle = msg.carry;
        if (msg.carryOff) this.carryOff = msg.carryOff;
        // Prediction must brake during a draw exactly like the server.
        this.predictor.weaponStyle = this.equippedWeaponDef()?.style ?? null;
        this.events.onEquipment(msg.equipment);
        break;
      }
      case 'hit': {
        let x: number | undefined;
        let y: number | undefined;
        if (msg.eid === this.ownEid) {
          const p = this.predictor.renderPos();
          x = p.x;
          y = p.y;
          if (msg.dmg > 0) this.ownHurtUntil = performance.now() + 180;
        } else {
          const remote = this.entities.get(msg.eid);
          if (remote) {
            const latest = remote.buffer.latest();
            x = latest?.x ?? remote.meta.x;
            y = latest?.y ?? remote.meta.y;
            if (msg.dmg > 0) {
              remote.hurtUntil = performance.now() + 180;
              // Remember the blow's direction: if this hit kills, the
              // ragdoll flies the way the weapon sent it.
              if (msg.kx !== undefined || msg.ky !== undefined) {
                remote.lastKnock = {
                  kx: msg.kx ?? 0,
                  ky: msg.ky ?? 0,
                  at: performance.now(),
                  crit: msg.crit === true,
                  dmg: msg.dmg,
                };
              }
            }
          }
        }
        if (x !== undefined && y !== undefined) {
          const crit = msg.crit === true;
          if (msg.dmg > 0 && (msg.kx !== undefined || msg.ky !== undefined)) {
            this.events.onImpact?.({
              x,
              y,
              kx: msg.kx ?? 0,
              ky: msg.ky ?? 0,
              crit,
              isOwnTarget: msg.eid !== this.ownEid,
            });
          }
          this.floaties.push({
            x: x + (Math.random() - 0.5) * 0.3,
            y: y - 0.4,
            // A warded blow says so in words — a bare "0" reads as a
            // bad roll, not an unbreakable guard.
            text: msg.im ? 'Immune' : String(msg.dmg),
            // A signed DoT pulse prints in its wound's ink (ONE
            // GRAMMAR: the same hex as the ambience and the state
            // blocks), quieter than a struck blow — and the ink wins
            // over the own-body red: WHAT is eating you outranks THAT
            // something is (the vignette tint carries the "you").
            color: crit
              ? '#ffd24a'
              : msg.im
                ? '#9db7d6'
                : msg.dmg === 0
                  ? '#7fb2d9'
                  : msg.via
                    ? STATUS_INK[msg.via]!
                    : msg.eid === this.ownEid
                      ? '#ff7b6b'
                      : '#f4efe4',
            bornAt: performance.now(),
            sizeMul: crit ? 1.6 : msg.via ? 0.85 : 1,
          });
          if (msg.bs) {
            this.floaties.push({
              x,
              y: y - 0.9,
              text: 'Backstab!',
              color: '#b49af0',
              bornAt: performance.now(),
              sizeMul: 1.3,
            });
          }
          this.events.onHit({
            x,
            y,
            dmg: msg.dmg,
            isOwn: msg.eid === this.ownEid,
            crit,
            backstab: msg.bs === true,
            via: msg.via,
          });
        }
        break;
      }
      case 'update': {
        for (const meta of msg.entities) {
          if (meta.eid === this.ownEid) continue;
          const remote = this.entities.get(meta.eid);
          if (remote) remote.meta = meta;
        }
        break;
      }
      case 'bank': {
        this.events.onBank(msg.items, msg.gear);
        break;
      }
      case 'signs': {
        for (const sign of msg.signs) {
          const key = signKey(sign.tx, sign.ty);
          if (sign.gone) this.signs.delete(key);
          else this.signs.set(key, sign);
          this.events.onSignChanged?.(sign.tx, sign.ty);
        }
        break;
      }
      case 'riftgate': {
        // The gate opens the panel; the keys themselves come from our
        // ring mirror (instance-addressing law). `live` marks the run
        // still standing so a spent key can re-enter its open door.
        this.events.onRiftgate?.(msg.live, msg.partyRuns);
        break;
      }
      case 'dungeon': {
        // A fresh instance was cut — the old run's chart is gone with it.
        this.dungeonExplored.clear();
        this.chartVersion++;
        this.events.onDungeon?.({
          name: msg.name,
          sigil: msg.sigil,
          tier: msg.tier,
          theme: msg.theme,
          power: msg.power,
          mods: msg.mods,
        });
        break;
      }
      case 'dgclear': {
        this.events.onDungeonClear?.({ name: msg.name, sigil: msg.sigil, sec: msg.sec });
        break;
      }
      case 'arenaboard': {
        this.events.onArenaBoard?.(msg);
        break;
      }
      case 'arena': {
        // Phase 'off' lowers everything; anything else replaces the
        // card whole (the ticker is authoritative, the partypos law).
        this.arenaMatch =
          msg.phase === 'off'
            ? null
            : {
                phase: msg.phase,
                venue: msg.venue,
                name: msg.name,
                round: msg.round,
                rounds: msg.rounds,
                deadlineAt:
                  msg.remainMs !== undefined ? performance.now() + msg.remainMs : null,
                foes: msg.foes,
                ...(msg.spec === true ? { specAt: performance.now() } : {}),
                ...(msg.phase === 'wipe' ? { wipeAt: performance.now() } : {}),
              };
        this.events.onArenaState?.(msg);
        break;
      }
      case 'plane': {
        // THE CROSSING (docs/planes-plan.md §2.4) — the ONE reset
        // door (the reconnect welcome above is its twin). Drop it
        // all, stand the body at the carried point, and let the
        // fresh plane stream in behind the veil.
        this.crossPlane(msg.plane, { x: msg.x, y: msg.y });
        break;
      }
      case 'dlgopen': {
        this.events.onDialogueOpen?.({
          eid: msg.eid,
          name: msg.name,
          title: msg.title,
          prefetch: msg.prefetch,
          voiceDials: msg.voiceDials,
        });
        break;
      }
      case 'dlgnode': {
        this.events.onDialogueNode?.({
          speaker: msg.speaker,
          text: msg.text,
          choices: msg.choices,
          last: msg.last,
          gifts: msg.gifts,
          quest: msg.quest,
          questChoices: msg.questChoices,
          shopChoices: msg.shopChoices,
          voice: msg.voice,
        });
        break;
      }
      case 'dlgclose': {
        this.events.onDialogueClose?.();
        break;
      }
      case 'vq': {
        this.events.onVoiceQuip?.({ x: msg.x, y: msg.y, url: msg.url });
        break;
      }
      case 'death': {
        if (this.npcDeaths.length < 32) {
          const remote = this.entities.get(msg.eid);
          const k = remote?.lastKnock;
          const fresh = k && performance.now() - k.at < 700 ? k : null;
          this.npcDeaths.push({
            eid: msg.eid,
            x: msg.x,
            y: msg.y,
            defId: msg.defId,
            dir: remote?.buffer.latest()?.dir ?? 0,
            kx: fresh?.kx ?? 0,
            ky: fresh?.ky ?? 0,
            crit: fresh?.crit ?? false,
            dmg: fresh?.dmg ?? 2,
            look: remote?.meta.appearance?.look,
            equip: remote?.meta.appearance?.equip,
            ench: remote?.meta.appearance?.ench,
          });
        }
        this.events.onDeath({ x: msg.x, y: msg.y, defId: msg.defId });
        break;
      }
      case 'cast': {
        // THE DRAWN BREATH's truth channel. `start` backfills a breath
        // the local mirror missed (it should never happen; belt and
        // braces); `fire` pays off with the committed cue the instants
        // play at their press; `break` ends the bar without ceremony.
        if (msg.state === 'start') {
          if (!this.ownCast) {
            const ab = this.slotAbilityDef(msg.slot as AbilitySlot);
            if (ab) {
              this.ownCast = {
                slot: msg.slot as AbilitySlot,
                ab,
                progress: 0,
                total: msg.ticks ?? ab.castTicks ?? 0,
                rate: 1,
              };
            }
          }
        } else {
          const cast = this.ownCast;
          this.ownCast = null;
          if (msg.state === 'fire') {
            const ab = cast?.ab ?? this.slotAbilityDef(msg.slot as AbilitySlot);
            if (ab) {
              this.onCastFx?.(msg.slot as AbilitySlot, ab);
              // THE CHARGED ROOT: a cast-time art roots the server
              // body for castFreezeTicks at its FIRE — the client used
              // to keep walking at full speed through the whole
              // commitment (and a charged dash-strike moved the server
              // body with zero prediction). Anchor on the last applied
              // frame: the root starts one wire-trip late and ends
              // equally late, a bounded skew instead of a total miss.
              const freeze = ab.castFreezeTicks ?? 0;
              // THE CROSSING: a charged transport art re-registers its
              // whole road (or its blink door) on the last applied
              // frame — the same one-wire-trip skew the root carries.
              const kind = travelKindOf(ab);
              const tiles = Math.abs(ab.dashTiles ?? (ab.shape === 'leap_slam' ? 4 : 3));
              const sign = Math.sign(ab.dashTiles ?? 1) || 1;
              const move: CastMove | null =
                kind && tiles > 0.05
                  ? {
                      kind,
                      dirX: Math.cos(this.aim) * sign,
                      dirY: Math.sin(this.aim) * sign,
                      dist: tiles,
                    }
                  : null;
              if (freeze > 0 || move) {
                const anchor = this.inputSeq - 1;
                this.castFreezeUntilSeq = Math.max(this.castFreezeUntilSeq, anchor + freeze);
                this.predictor.registerCast(anchor, freeze, move);
              }
            }
          }
        }
        break;
      }
      case 'cooldowns': {
        const now = performance.now();
        this.abilityMax = [msg.max[0], msg.max[1], msg.max[2], msg.max[3]];
        for (let i = 0; i < 4; i++) this.abilityReadyAt[i] = now + msg.cd[i]! * TICK_MS;
        break;
      }
      case 'combo': {
        // THE SPOKEN BEAT: the stage the server just swung, the run,
        // and how long the string stays alive, on the local clock.
        const bornMs = performance.now();
        this.ownCombo = {
          stage: msg.stage,
          len: msg.len,
          run: msg.run,
          bornMs,
          graceUntilMs: bornMs + msg.grace * TICK_MS,
        };
        break;
      }
      case 'techniques': {
        this.techniques = [msg.chosen[0], msg.chosen[1]];
        this.earnedArts = msg.earned ?? [];
        this.lessons = msg.lessons ?? {};
        this.onTechniques?.();
        break;
      }
      case 'callings': {
        this.callings = msg.answered;
        this.callingRanks = msg.ranks ?? {};
        this.onCallings?.();
        break;
      }
      case 'buffs': {
        this.buffs = msg.buffs;
        this.buffsAt = performance.now();
        // THE SWING CHANNEL rides the buff push; absent = trained pace.
        this.swingMult = msg.swing ?? 1;
        // THE STANDING SHELL: dome presence, and the break moment —
        // a ward that stood and now reads 0 shatters ONCE.
        const ward = msg.ward ?? 0;
        if (this.ownWard > 0 && ward === 0) this.wardShatteredAt = performance.now();
        this.ownWard = ward;
        this.onBuffs?.();
        break;
      }
      case 'farm': {
        // THE ONE CARE MIRROR: plots re-bake their chunk (the soil
        // shows its state); bins live-paint and need no bake.
        for (const p of msg.plots ?? []) {
          farmPlots.set(farmKey(p.tx, p.ty), { w: p.w, soil: p.soil, m: p.m, f: p.f ?? 0, wet: false });
          refreshWet(p.tx, p.ty, this.world.groundAt(p.tx, p.ty));
          // THE REGISTER IS THE SCAN, COMPILED: the plot's OWN chunk
          // rev must bump too — care state is a side table, so no
          // setGround covers the center, and the soil paint lives in
          // that chunk's bake.
          this.touchChunk(Math.floor(p.tx / CHUNK_SIZE), Math.floor(p.ty / CHUNK_SIZE));
          this.touchNeighbors(Math.floor(p.tx / CHUNK_SIZE), Math.floor(p.ty / CHUNK_SIZE));
        }
        for (const b of msg.bins ?? []) {
          if (b.fill === 0 && b.readyAt === 0) farmBins.delete(farmKey(b.tx, b.ty));
          else farmBins.set(farmKey(b.tx, b.ty), { fill: b.fill, graded: b.graded, readyAt: b.readyAt });
        }
        for (const tr of msg.troughs ?? []) {
          if (tr.feed <= 0) farmTroughs.delete(farmKey(tr.tx, tr.ty));
          else farmTroughs.set(farmKey(tr.tx, tr.ty), { feed: tr.feed });
        }
        for (const j of msg.jobs ?? []) {
          if (j.qty <= 0) farmJobs.delete(farmKey(j.tx, j.ty));
          else farmJobs.set(farmKey(j.tx, j.ty), { recipe: j.recipe, qty: j.qty, startedAt: j.startedAt, grade: j.grade });
        }
        for (const a of msg.apiaries ?? []) {
          if (a.since <= 0) farmApiaries.delete(farmKey(a.tx, a.ty));
          else farmApiaries.set(farmKey(a.tx, a.ty), { since: a.since });
        }
        for (const r of msg.remove ?? []) {
          farmPlots.delete(farmKey(r.tx, r.ty));
          this.touchChunk(Math.floor(r.tx / CHUNK_SIZE), Math.floor(r.ty / CHUNK_SIZE));
          this.touchNeighbors(Math.floor(r.tx / CHUNK_SIZE), Math.floor(r.ty / CHUNK_SIZE));
        }
        if ((msg.plots?.length ?? 0) > 0 || (msg.remove?.length ?? 0) > 0) this.worldVersion++;
        this.onFarm?.();
        break;
      }
      case 'stockname': {
        // THE ANIMALS OF THE YARD: the release ceremony — the naming
        // card opens for the newest animal in the yard.
        this.onStockCeremony?.(msg.slot, msg.species);
        break;
      }
      case 'larder': {
        for (const f of msg.fills) larderFills.set(f.shop, { epoch: f.epoch, filled: f.filled });
        break;
      }
      case 'charges': {
        this.charges = msg.charges;
        break;
      }
      case 'ride': {
        // THE PREDICTOR LEARNS ITS LEGS: the steady multiplier lands
        // in the predictor the same message that changes the truth,
        // so mounted prediction agrees with the server to the digit.
        this.ownMount = msg.mount;
        this.ownedMounts = msg.owned;
        this.predictor.speedMult = msg.mult;
        // ...and its drawn-bow walk: the perk-folded factor (Longstride)
        // rides the same mirror; the bare constant is only the fallback.
        this.predictor.drawFactor = msg.draw ?? DRAW_MOVE_FACTOR;
        this.onRide?.();
        break;
      }
      case 'pet': {
        this.ownPets = msg.pets;
        // THE QUIET HEEL: the wire says how long until kindness pays
        // again; we pin it to a local clock and count down between
        // sends (the mirror only resends when a pet fact changes).
        for (const p of msg.pets) {
          if (p.bondSec !== undefined) {
            this.petBondReadyAt.set(p.slot, Date.now() + p.bondSec * 1000);
          }
        }
        if (msg.ceremony !== undefined) {
          const fresh = msg.pets.find((p) => p.slot === msg.ceremony);
          this.onPetCeremony?.(msg.ceremony, fresh?.name ?? '');
        }
        this.onPet?.();
        break;
      }
      case 'time': {
        this.timeOfs = msg.ofs;
        break;
      }
      case 'havens': {
        // A waystation stood up (or turned fallow) — or the plan
        // itself changed. The danger field shifts under our feet,
        // and the music with it.
        this.setHavens(msg.list, msg.settled);
        break;
      }
      case 'explored': {
        const mask = this.exploredFor(msg.plane ?? 'surface');
        for (const [rx, ry, b64] of msg.regions) {
          mask.loadRegion(rx, ry, b64ToU8(b64));
        }
        this.chartVersion++;
        break;
      }
      case 'discoveries': {
        this.discoveries.clear();
        for (const d of msg.list) this.discoveries.set(d.id, d);
        this.chartVersion++;
        break;
      }
      case 'trophies': {
        // THE CHAMPION'S MARK roster turned: whole-list replace, and
        // the fresh id starts its local fly-in clock (only the fresh
        // one — a roster refresh never re-stakes standing banners).
        this.trophies.clear();
        for (const t of msg.list) this.trophies.set(t.id, t);
        for (const id of [...this.trophyBorn.keys()]) {
          if (!this.trophies.has(id)) this.trophyBorn.delete(id);
        }
        if (msg.fresh !== undefined) {
          const fresh = this.trophies.get(msg.fresh);
          if (fresh) {
            this.trophyBorn.set(msg.fresh, performance.now());
            this.events.onTrophyStaked?.(fresh);
          }
        }
        break;
      }
      case 'poicleared': {
        this.events.onPoiCleared?.(msg);
        break;
      }
      case 'discovery': {
        this.discoveries.set(msg.d.id, msg.d);
        this.chartVersion++;
        this.events.onDiscovery?.(msg.d);
        break;
      }
      case 'discoveryfade': {
        for (const id of msg.ids) {
          const d = this.discoveries.get(id);
          if (d) d.faded = true;
        }
        this.chartVersion++;
        break;
      }
      case 'discoverystage': {
        // The site climbed a boldness rung — repaint its stage pips.
        // The rumor line arrives as ordinary system chat; no ceremony.
        const d = this.discoveries.get(msg.id);
        if (d) {
          d.stage = msg.stage;
          this.chartVersion++;
        }
        break;
      }
      case 'waypoint': {
        // The server plants the mark (a guard's bounty) — adopted
        // exactly as if the player pinned it: pin, pill, chart redraw.
        // The plane rides along so a tagged mark files onto its own
        // chart (server pushes today are surface; absent = surface).
        this.waypoint =
          msg.x !== undefined && msg.y !== undefined ? { x: msg.x, y: msg.y, plane: msg.plane } : null;
        this.chartVersion++;
        break;
      }
      case 'deathmark': {
        // The walk-back beacon: duration on the wire, stamped against
        // the local clock here (clocks drift; durations don't). The
        // plane rides along so the skull files onto the RIGHT chart —
        // a death in the underworld must not mark the surface.
        this.deathMark = msg.mark
          ? {
              x: msg.mark.x,
              y: msg.mark.y,
              until: Date.now() + msg.mark.remainMs,
              plane: msg.mark.plane,
            }
          : null;
        this.chartVersion++;
        break;
      }
      case 'quests': {
        // The full ledger, once at bind.
        this.quests.clear();
        this.questsDone.clear();
        for (const q of msg.active) this.quests.set(q.id, q);
        for (const d of msg.done) this.questsDone.set(d.id, d);
        this.questAvailable = msg.available;
        this.questVersion++;
        this.events.onQuestsChanged?.();
        break;
      }
      case 'questupd': {
        // A quiet patch — present fields apply, nothing celebrates.
        if (msg.remove !== undefined) this.quests.delete(msg.remove);
        if (msg.quest) this.quests.set(msg.quest.id, msg.quest);
        if (msg.done) this.questsDone.set(msg.done.id, msg.done);
        if (msg.available) this.questAvailable = msg.available;
        this.questVersion++;
        this.events.onQuestsChanged?.();
        break;
      }
      case 'questevent': {
        this.events.onQuestEvent?.({
          kind: msg.kind,
          id: msg.id,
          name: msg.name,
          rewards: msg.rewards,
        });
        break;
      }
      case 'rep': {
        // The full standing ledger + live membership tables, at bind.
        this.repStandings.clear();
        for (const s of msg.standings) this.repStandings.set(s.faction, s);
        this.repMembers = msg.members;
        this.repPrefixes = msg.prefixes;
        this.repEnforcers = new Set(msg.enforcers);
        this.repPeaceBand = msg.peaceBand;
        this.repPrices = msg.prices;
        this.repVersion++;
        this.events.onRepChanged?.();
        break;
      }
      case 'repupd': {
        // A quiet patch — nothing celebrates. The delta ledger is
        // pure presentation: the Standing screen's "lately" line.
        for (const s of msg.standings) {
          const prev = this.repStandings.get(s.faction);
          if (prev !== undefined && prev.value !== s.value) {
            this.repLastDelta.set(s.faction, { delta: s.value - prev.value, at: Date.now() });
          }
          this.repStandings.set(s.faction, s);
        }
        this.repVersion++;
        this.events.onRepChanged?.();
        break;
      }
      case 'repevent': {
        this.events.onRepEvent?.({
          faction: msg.faction,
          name: msg.name,
          band: msg.band,
          rose: msg.rose,
        });
        break;
      }
      case 'social': {
        this.events.onSocial?.({ friends: msg.friends, incoming: msg.incoming, outgoing: msg.outgoing });
        break;
      }
      case 'friendsearch': {
        this.events.onFriendSearch?.(msg.results);
        break;
      }
      case 'friendevent': {
        this.events.onFriendEvent?.({ kind: msg.kind, name: msg.name });
        break;
      }
      case 'party': {
        this.party = { members: msg.members, invites: msg.invites, outgoing: msg.outgoing };
        // Names no longer of the party stop haunting the wayfinder.
        for (const name of [...this.partyPos.keys()]) {
          if (!msg.members.some((m) => m.name === name)) this.partyPos.delete(name);
        }
        this.events.onParty?.(this.party);
        break;
      }
      case 'partyevent': {
        this.events.onPartyEvent?.({ kind: msg.kind, name: msg.name, detail: msg.detail });
        break;
      }
      case 'partypos': {
        // The ticker is authoritative for who is placed right now.
        this.partyPos.clear();
        const at = performance.now();
        for (const m of msg.members) {
          this.partyPos.set(m.name, { x: m.x, y: m.y, plane: m.plane ?? 'surface', at });
        }
        break;
      }
      case 'fx': {
        // Door rattles, prop smashes, and candle flips are scenery
        // feedback, not combat VFX — hand them straight to the fx
        // hook without joining the ability list.
        if (msg.kind === 'rattle' || msg.kind === 'smash' || msg.kind === 'candle') {
          this.onFx?.({
            kind: msg.kind,
            x: msg.x,
            y: msg.y,
            radius: msg.radius,
            dir: msg.dir,
            id: msg.id,
            bornAt: performance.now(),
          });
          break;
        }
        // THE FOE'S BREATH: a charge carrying an eid is an enemy
        // wind-up — the overhead pip ledger anchors to the body.
        // ticks > 0 opens/refreshes the read; ticks 0 is the fizzle
        // (brokeAt lets the pip gutter instead of vanishing).
        if (msg.kind === 'charge' && msg.eid !== undefined) {
          const now = performance.now();
          if ((msg.ticks ?? 0) > 0) {
            const endsAt = now + (msg.ticks ?? 0) * TICK_MS;
            const prev = this.npcCasts.get(msg.eid);
            if (prev && !prev.brokeAt && prev.id === msg.id) {
              prev.endsAt = endsAt; // re-emit: trust the newest clock
            } else {
              // A fresh breath (or a different voice over a lingering
              // entry) opens its own read.
              this.npcCasts.set(msg.eid, { startAt: now, endsAt, color: msg.color, id: msg.id });
            }
          } else {
            const cast = this.npcCasts.get(msg.eid);
            if (cast) cast.brokeAt = now;
          }
        }
        const fx: ActiveFx = {
          kind: msg.kind,
          x: msg.x,
          y: msg.y,
          radius: msg.radius,
          ticks: msg.ticks,
          color: msg.color,
          text: msg.text,
          id: msg.id,
          dir: msg.dir,
          x2: msg.x2,
          y2: msg.y2,
          bornAt: performance.now(),
        };
        this.fx.push(fx);
        if (this.fx.length > 48) this.fx.shift();
        this.onFx?.(fx);
        // THE DEEPER SIGIL: a working says its name once and never a
        // number. The damage it deals already floats through the normal
        // hit stream, so printing a figure here would double-count the
        // same blow and turn feedback into noise. Sized under a
        // reaction's shout: a proc punctuates, a reaction interrupts.
        if (msg.kind === 'proc' && msg.text) {
          this.floaties.push({
            x: msg.x,
            y: msg.y - 0.95,
            text: msg.text,
            color: msg.color ?? '#f4efe4',
            bornAt: performance.now(),
            sizeMul: 1.05,
          });
        }
        // Reactions announce themselves — the name IS the reward.
        if (msg.kind === 'reaction' && msg.text) {
          this.floaties.push({
            x: msg.x,
            y: msg.y - 0.8,
            text: msg.text,
            color: msg.color ?? '#f4efe4',
            bornAt: performance.now(),
            sizeMul: msg.text.startsWith('+') || msg.text === 'Resist' ? 0.9 : 1.45,
          });
        }
        break;
      }
    }
  }

  private handleChunk(chunk: ChunkData): void {
    // THE SAME CHUNK IS NO NEWS: the server re-streams chunks it can't
    // know we hold (reconnect grace, interest-window wobble). A payload
    // identical to the stored chunk keeps the stored OBJECT — same
    // identity, same rev — so no bake, memo, or interior cache moves.
    // Without this, a one-blip reconnect re-sent all 25 chunks and the
    // whole screen re-baked for nothing.
    const prev = this.world.get(chunk.cx, chunk.cy);
    if (prev && sameChunkPayload(prev, chunk)) return;
    this.world.set(chunk);
    this.chunkWallFlags.set(chunkKey(chunk.cx, chunk.cy), chunkHasBoundary(chunk));
    // THE LIVING SOIL: wells register as they stream so the terrain
    // bake (which sees only effective ground) can answer "fed or dry".
    for (let i = 0; i < chunk.ground.length; i++) {
      if (chunk.ground[i] === Tile.Well) {
        noteWellTile(
          chunk.cx * CHUNK_SIZE + (i % CHUNK_SIZE),
          chunk.cy * CHUNK_SIZE + Math.floor(i / CHUNK_SIZE),
          undefined,
          Tile.Well,
        );
      }
    }
    this.touchNeighbors(chunk.cx, chunk.cy);
    this.worldVersion++;
    // Interiors re-derive only when this arrival can actually touch a
    // room: rooms are bounded by wall/door tiles, and a region reaches
    // at most one chunk past its walls (MAX_REGION). A wall-less chunk
    // in a wall-less neighborhood — the whole frontier — changes no
    // room, and skipping the bump keeps the veil and the union-find
    // steady while streaming (the wipe reset every region id and
    // slammed open buildings shut for a re-ease).
    if (this.neighborhoodHasWalls(chunk, prev)) this.interiorsVersion++;
  }

  /** Wall/door flags per streamed chunk key — the interiors gate. */
  private readonly chunkWallFlags = new Map<string, boolean>();

  private neighborhoodHasWalls(chunk: ChunkData, prev: ChunkData | undefined): boolean {
    if (prev && chunkHasBoundary(prev)) return true;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = chunk.cx + dx;
        const cy = chunk.cy + dy;
        const key = chunkKey(cx, cy);
        let flag = this.chunkWallFlags.get(key);
        if (flag === undefined) {
          const data = dx === 0 && dy === 0 ? chunk : this.world.get(cx, cy);
          if (!data) continue;
          flag = chunkHasBoundary(data);
          this.chunkWallFlags.set(key, flag);
        }
        if (flag) return true;
      }
    }
    return false;
  }

  /** Fires with (tx, ty, previous, next) whenever a tile mutates. */
  onTileChange: ((tx: number, ty: number, prev: number | undefined, next: number) => void) | null =
    null;

  private handleTilePatch(patch: TilePatch): void {
    const prev = this.world.groundAt(patch.tx, patch.ty);
    this.world.setGround(patch.tx, patch.ty, patch.ground);
    // A built wall must flip its chunk's interiors gate (see
    // handleChunk); removal leaves the flag standing — a safe
    // over-approximation, refreshed on the next re-stream.
    if (BOUNDARY_TILE_SET.has(patch.ground)) {
      this.chunkWallFlags.set(
        chunkKey(Math.floor(patch.tx / CHUNK_SIZE), Math.floor(patch.ty / CHUNK_SIZE)),
        true,
      );
    }
    // Blob rendering blends across tiles — rebake the neighborhood.
    this.touchNeighbors(Math.floor(patch.tx / CHUNK_SIZE), Math.floor(patch.ty / CHUNK_SIZE));
    this.worldVersion++;
    // A posture swap of the SAME door leaves every room's shape alone.
    const doorSwap =
      prev !== undefined &&
      shutDoorTile(prev) !== null &&
      shutDoorTile(prev) === shutDoorTile(patch.ground);
    if (!doorSwap) this.interiorsVersion++;
    // A crop stage transition changes which watered bit is current —
    // the wet look must follow the tile, not the last delta.
    refreshWet(patch.tx, patch.ty, patch.ground as Tile);
    noteWellTile(patch.tx, patch.ty, prev, patch.ground);
    this.onTileChange?.(patch.tx, patch.ty, prev, patch.ground);
  }

  /**
   * THE TENDING HAND: what one press on a growing crop will do, in
   * priority order — water if the stage is thirsty and a can is
   * carried, feed the soil if compost is carried and the ground can
   * take it, mulch if fibre is carried and no blanket lies — else the
   * plain status touch. The prompt shows this same word, so the hand
   * always knows what it is about to do.
   */
  cropVerb(tx: number, ty: number): 'Harvest' | 'Water' | 'Prune' | 'Fertilize' | 'Mulch' | 'Tend' {
    const ground = this.world.groundAt(tx, ty) as Tile | undefined;
    if (ground !== undefined && MATURE_TILES.has(ground)) return 'Harvest';
    const stage = stageOfTile(ground);
    if (stage === null) return 'Tend';
    // The dark bed takes no care — the hand can only wait on it.
    const info = ground !== undefined ? CROP_TILES.get(ground) : undefined;
    if (info?.crop.bed === 'log' || ground === Tile.MushroomLogSeeded) return 'Tend';
    const care = farmPlots.get(farmKey(tx, ty)) ?? { w: 0, soil: 0, m: 0, f: 0, wet: false };
    const count = (id: string): number => {
      let n = 0;
      for (const s of this.inventory) if (s && s.item === id && !s.stolen) n += s.qty;
      return n;
    };
    if (count('watering_can') > 0 && (care.w & (1 << stage)) === 0 && !care.f) return 'Water';
    if (info?.crop.recurring && (care.w & 4) === 0) return 'Prune';
    if (
      care.soil < SOIL_RICH &&
      ((care.soil === 0 && count('compost') > 0) || count('prime_compost') > 0)
    ) {
      return 'Fertilize';
    }
    if (!care.m && count('plant_fibre') >= 2) return 'Mulch';
    return 'Tend';
  }

  prune(tx: number, ty: number): void {
    this.conn?.send({ t: 'prune', tx, ty });
  }

  fertilize(tx: number, ty: number): void {
    this.conn?.send({ t: 'fertilize', tx, ty });
  }

  mulch(tx: number, ty: number): void {
    this.conn?.send({ t: 'mulch', tx, ty });
  }

  compostAdd(tx: number, ty: number, slot: number): void {
    this.conn?.send({ t: 'compostadd', tx, ty, slot });
  }

  troughAdd(tx: number, ty: number, slot: number): void {
    this.conn?.send({ t: 'troughadd', tx, ty, slot });
  }

  stockRename(slot: number, name: string): void {
    this.conn?.send({ t: 'stockname', slot, name });
  }

  workStart(tx: number, ty: number, recipe: string, qty: number): void {
    this.conn?.send({ t: 'workstart', tx, ty, recipe, qty });
  }

  /** Fires with (tx, ty, previous, next) whenever a detail mutates. */
  onDetailChange: ((tx: number, ty: number, prev: number, next: number) => void) | null = null;

  /**
   * THE SECOND LAYER: a detail-layer mutation (a hanging goes up or
   * comes down). Rooms are ground geography, so interiors never
   * re-derive — but the bake neighborhood refreshes like any patch
   * (wall painters read the detail live; ground details are baked).
   */
  private handleDetailPatch(patch: DetailPatch): void {
    const prev = this.world.detailAt(patch.tx, patch.ty);
    this.world.setDetail(patch.tx, patch.ty, patch.detail);
    this.touchNeighbors(Math.floor(patch.tx / CHUNK_SIZE), Math.floor(patch.ty / CHUNK_SIZE));
    this.worldVersion++;
    this.onDetailChange?.(patch.tx, patch.ty, prev, patch.detail);
  }

  /** Bump ONE chunk's rev — for mutations that never route through
   *  setGround/setDetail (farm care state lives in a side table) but
   *  still change that chunk's own paint. */
  private touchChunk(cx: number, cy: number): void {
    const chunk = this.world.get(cx, cy);
    if (chunk) chunk.rev = (chunk.rev ?? 0) + 1;
  }

  /** Bump neighboring chunks' revs so organic borders re-bake. */
  private touchNeighbors(cx: number, cy: number): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const chunk = this.world.get(cx + dx, cy + dy);
        if (chunk) chunk.rev = (chunk.rev ?? 0) + 1;
      }
    }
  }

  /**
   * The tile of the last interact we sent. The server never names the
   * tile a gather action works, so the renderer squares the OWN rig up
   * to this one — standing between two nodes must never swing the tool
   * at the wrong neighbor.
   */
  lastInteract: { tx: number; ty: number } | null = null;

  /**
   * What every board in the streamed world says, by "tx,ty". Filled by
   * the S2CSigns push that rides in with each chunk, so the words are
   * already here when the player walks up — the approach plaque never
   * waits on a round-trip.
   */
  readonly signs = new Map<string, SignInfo>();

  /** The words on the board at this tile, if any have arrived. */
  signAt(tx: number, ty: number): SignInfo | undefined {
    return this.signs.get(signKey(tx, ty));
  }

  /**
   * The nearest readable board within approach range, for the plaque.
   *
   * Deliberately NOT findNearbyTarget: reading is passive and must not
   * compete for the interact slot. A shingle nailed beside a door
   * still reads itself while the door owns the F key, and a blank
   * board answers nobody but the hand that raised it.
   *
   * The range is wider than arm's reach (2.2) so the words arrive as
   * you walk up rather than when you bump the post.
   */
  /**
   * The nearest standing victory banner within approach range, for
   * the champions plaque — the nearestSign law applied to trophies
   * (reading is passive, never competes for the interact slot; the
   * range is generous because the mark is meant to be read from the
   * road). Surface-plane only: the banners stand on the overworld.
   */
  nearestTrophy(radius = 3.4): TrophyWire | null {
    if (this.ownEid === null || this.plane.id !== 'surface') return null;
    if (this.trophies.size === 0) return null;
    const pos = this.predictor.pos;
    let best: TrophyWire | null = null;
    let bestD = radius * radius;
    for (const t of this.trophies.values()) {
      const dx = t.x - pos.x;
      const dy = t.y - pos.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  nearestSign(radius = 2.9): SignInfo | null {
    if (this.ownEid === null) return null;
    const pos = this.predictor.pos;
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    const r = Math.ceil(radius);
    let best: SignInfo | null = null;
    let bestD = radius * radius;
    for (let ty = cy - r; ty <= cy + r; ty++) {
      for (let tx = cx - r; tx <= cx + r; tx++) {
        if (!isSignTile(this.world.groundAt(tx, ty))) continue;
        const sign = this.signs.get(signKey(tx, ty));
        if (!sign) continue;
        const blank = sign.title === '' && sign.lines.every((l) => l === '');
        if (blank && !sign.mine) continue;
        const dx = tx + 0.5 - pos.x;
        const dy = ty + 0.5 - pos.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = sign;
        }
      }
    }
    return best;
  }

  /** Rewrite one of your own boards (the server judges ownership). */
  editSign(tx: number, ty: number, title: string, lines: string[]): void {
    const text = sanitizeSignText({ title, lines });
    this.conn?.send({ t: 'signedit', tx, ty, title: text.title, lines: text.lines });
  }

  /** Pin the one active waypoint (optimistic; the server keeps the durable copy). */
  setWaypoint(x: number, y: number): void {
    // The pin lands on the plane whose chart you are reading — only
    // persistent planes take one (the server enforces the same law).
    if (!this.plane.persistent) return;
    const wx = Math.round(x);
    const wy = Math.round(y);
    this.waypoint = { x: wx, y: wy, plane: this.plane.id };
    this.chartVersion++;
    this.conn?.send({ t: 'waypoint', x: wx, y: wy, plane: this.plane.id });
  }

  /** Walk away from an active quest (the journal's Abandon button). */
  abandonQuest(id: string): void {
    this.conn?.send({ t: 'questabandon', quest: id });
  }

  /**
   * The overhead mark an actor wears FOR THIS PLAYER: 'ready' (a
   * finished quest hands in here — the strongest pull) beats 'offer'
   * (an offerable quest starts here). Resolved wholly client-side
   * from the pushed ledger against EntityMeta.actor.
   */
  questMarkFor(actor: string | undefined): 'offer' | 'ready' | null {
    if (!actor) return null;
    for (const q of this.quests.values()) {
      if (q.status === 'ready' && q.turnIn === actor) return 'ready';
    }
    for (const a of this.questAvailable) {
      if (a.giver === actor) return 'offer';
    }
    return null;
  }

  /**
   * How would this body receive ME? Resolved per-viewer from the
   * pushed ledger + live membership tables against the static actor
   * slug / bestiary id — the questMarkFor law: nothing personal ever
   * rides the shared EntityMeta. 'hostile' = an enforcer who will
   * attack on sight (outlaw and below); 'peace' = a hostile faction
   * body holding its fire for a friend at the peace band.
   */
  repTintFor(actor: string | undefined, defId: string | undefined): 'hostile' | 'peace' | null {
    if (actor !== undefined) {
      if (!this.repEnforcers.has(actor)) return null;
      const fid = this.repMembers[actor];
      if (fid === undefined) return null;
      const band = this.repStandings.get(fid)?.band ?? 'neutral';
      return band === 'outlaw' || band === 'hunted' ? 'hostile' : null;
    }
    if (defId !== undefined) {
      for (const [prefix, fid] of Object.entries(this.repPrefixes)) {
        if (!defId.startsWith(prefix)) continue;
        const band = (this.repStandings.get(fid)?.band ?? 'neutral') as FactionBand;
        return bandAtLeast(band, this.repPeaceBand as FactionBand) ? 'peace' : null;
      }
    }
    return null;
  }

  clearWaypoint(): void {
    this.waypoint = null;
    this.chartVersion++;
    this.conn?.send({ t: 'waypoint' });
  }

  /** Send an interact intent for a specific world tile. */
  interact(tx: number, ty: number): void {
    this.lastInteract = { tx, ty };
    this.conn?.send({ t: 'interact', tx, ty });
  }

  /** Use (equip/eat) the item in an inventory slot. */
  useSlot(slot: number, stow = false, off = false): void {
    // THE SECOND GRIP's stow destination and THE DELIBERATE PAIR's
    // off-hand aim ride the standing use verb — literal true only,
    // mirroring the parse gate.
    this.conn?.send({
      t: 'use',
      slot,
      ...(stow ? { stow: true as const } : {}),
      ...(off ? { off: true as const } : {}),
    });
  }

  /** Set one fist's grip style (optimistic; server confirms). */
  setCarryStyle(style: 'normal' | 'rogue', hand: 'main' | 'off' = 'main'): void {
    if (hand === 'off') this.carryOff = style;
    else this.carryStyle = style;
    this.conn?.send({ t: 'carrystyle', style, hand });
  }

  unequip(slot: EquipSlot): void {
    this.conn?.send({ t: 'unequip', slot });
  }

  /** Classify what an interact on this tile would do, if anything. */
  targetAt(tx: number, ty: number): InteractTarget | null {
    const ground = this.world.groundAt(tx, ty);
    if (ground === undefined) return null;
    if (NODES_BY_TILE.has(ground)) return { kind: 'node', tx, ty };
    // THE BED LAW: a garden plot, a growing frame, or a laid log all
    // open the seed picker — the picker filters to the bed's own kind.
    if (ground === Tile.Tilled || ground === Tile.GrowingFrame || ground === Tile.MushroomLog) {
      return { kind: 'plot', tx, ty };
    }
    if (isCropTile(ground)) {
      return { kind: 'crop', tx, ty, mature: MATURE_TILES.has(ground) };
    }
    // THE LIVING SOIL: the bin offers its lid. The mirror already
    // lives client-side (S2CFarm), so the deposit panel opens with no
    // server reply — every deposit re-proves the tile on the way in.
    if (ground === Tile.CompostBin) return { kind: 'bin', tx, ty };
    // THE ANIMALS OF THE YARD: the manger opens the feed panel.
    if (ground === Tile.FeedTrough) return { kind: 'trough', tx, ty };
    // THE WORKING YARD: a job station opens its work screen (or
    // collects, when measures wait); the hive collects directly.
    {
      const work = WORK_STATION_TILES.get(ground);
      if (work) return { kind: 'work', tx, ty, work };
    }
    if (ground === Tile.Apiary) return { kind: 'apiary', tx, ty };
    const station = stationAtTile(ground);
    if (station) return { kind: 'station', tx, ty, station };
    // Loot chests: a closed chest offers itself; an open one has
    // already told its story and stays quiet.
    const chest = chestInfo(ground);
    if (chest && !chest.open) return { kind: 'chest', tx, ty, chest: chest.kind };
    // Doors: open ones offer a close, shut ones offer an open — the
    // server arbitrates locks and doorway occupancy.
    const door = doorInfo(ground);
    if (door) {
      // Fence and garrison doors both answer to "gate" in the prompt
      // — one pens the herd, the other bars the town.
      const gate = door.material === 'fence' || door.material === 'garrison';
      return { kind: 'door', tx, ty, open: door.open, gate };
    }
    // THE KEPT FLAME: a candle offers its wick — lit offers the
    // snuff, snuffed offers the light. The server owns the flip.
    const candle = candleInfo(ground);
    if (candle) return { kind: 'candle', tx, ty, lit: candle.lit };
    if (ground === Tile.BankChest) return { kind: 'bank', tx, ty };
    // THE THREE STALLS: the pen opens the stable door. The household
    // already lives client-side (S2CPet), so the panel needs no
    // server reply — the acts themselves re-check this tile.
    if (ground === Tile.BeastPen) return { kind: 'stable', tx, ty };
    if (ground === Tile.ShopCounter) return { kind: 'shop', tx, ty };
    // Boards offer a read. A blank one is only a target for the hand
    // that raised it (there is nothing there for anyone else to do),
    // which is why the blankness rides on the target itself.
    if (isSignTile(ground)) {
      const sign = this.signs.get(signKey(tx, ty));
      const blank = !sign || (sign.title === '' && sign.lines.length === 0);
      if (blank && !sign?.mine) return null;
      return { kind: 'sign', tx, ty, mine: sign?.mine === true, blank };
    }
    // Furniture offers a rest: chairs, benches, and the throne seat a
    // body; a bed lays one down (and the home claim rides the lying).
    // The server arbitrates occupancy and ownership.
    if (ground === Tile.Chair || ground === Tile.Bench || ground === Tile.Throne) {
      return { kind: 'seat', tx, ty };
    }
    if (ground === Tile.Bed) return { kind: 'bed', tx, ty };
    if (ground === Tile.PortalDown || ground === Tile.PortalUp) return { kind: 'portal', tx, ty };
    return null;
  }

  /** The nearest interactable tile (or gatherable animal) in reach. */
  findNearbyTarget(): InteractTarget | null {
    if (this.ownEid === null) return null;
    const pos = this.predictor.pos;
    let best: { target: InteractTarget; d: number } | null = null;
    // THE QUIET HEEL: the bond-moment Offer waits at the back of the
    // line — held here and returned only if nothing else is in reach.
    let offer: InteractTarget | null = null;
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    for (let ty = cy - 2; ty <= cy + 2; ty++) {
      for (let tx = cx - 2; tx <= cx + 2; tx++) {
        const target = this.targetAt(tx, ty);
        if (!target) continue;
        const dx = tx + 0.5 - pos.x;
        const dy = ty + 0.5 - pos.y;
        const d = dx * dx + dy * dy;
        if (d <= 2.2 * 2.2 && (!best || d < best.d)) best = { target, d };
      }
    }
    // NPCs in reach: livestock offer their produce, friendly actors
    // offer a word — either beats a further-away tile.
    for (const [eid, remote] of this.entities) {
      if (remote.meta.kind !== EntityKind.Npc) continue;
      const def = npcDef(remote.meta.defId ?? '');
      const latest = remote.buffer.latest();
      // THE QUIET HEEL: your companion walks in arm's reach all day,
      // so the plain pat never owns this prompt (it would eclipse
      // every door, station, and bag you pass). The heel surfaces
      // here only when the press MEANS something: the kneel to a
      // fallen friend, or the bond moment with its lure in the pack.
      // The everyday pat moved to a deliberate click on the body and
      // the companion chip. Another keeper's beast offers nothing.
      // THE ANIMALS OF THE YARD: another keeper's animal (or one
      // whose keeper is offline — no ownerEid rides then) offers
      // nothing; your own offers its species' working verb.
      if (remote.meta.stock && remote.meta.ownerEid !== this.ownEid) continue;
      const owned = remote.meta.ownerEid !== undefined;
      if (owned && remote.meta.ownerEid !== this.ownEid) continue;
      // Taming left this prompt with THE WILD ANSWERS THE CALL: the
      // tame is Gentle the Wild, a technique cast from a seat — a
      // wild beast offers the interact hand nothing anymore.
      // A voice (dialogue tree or barks) offers Talk even on fightable
      // neutrals — the guard you COULD strike would rather chat. A
      // crouched hand asks a different question (factions Phase 5):
      // the same press is the pickpocket verb, and the prompt says so.
      const verb = remote.meta.stock
        ? (LIVESTOCK.get(def?.id ?? '')?.produce.verb ?? 'Tend')
        : owned
        ? latest != null && latest.hpPct === 0
          ? 'Tend'
          : this.petOfferReady()
            ? 'Offer'
            : null
        : def?.produce
          ? 'Milk'
          : remote.meta.talk || remote.meta.friendly
            ? this.isSneaking
              ? 'Pickpocket'
              : 'Talk'
            : null;
      if (!verb) continue;
      const x = latest?.x ?? remote.meta.x;
      const y = latest?.y ?? remote.meta.y;
      const dx = x - pos.x;
      const dy = y - pos.y;
      const d = dx * dx + dy * dy;
      if (d > 2.2 * 2.2) continue;
      // The Offer stands aside for everything: the moment keeps until
      // claimed, so the heel must never eclipse a door or a bag while
      // the window is open. It surfaces only when nothing else does.
      if (verb === 'Offer') {
        offer ??= { kind: 'npc', tx: Math.floor(x), ty: Math.floor(y), eid, verb };
        continue;
      }
      if (!best || d < best.d) {
        best = {
          target: { kind: 'npc', tx: Math.floor(x), ty: Math.floor(y), eid, verb },
          d,
        };
      }
    }
    // Ground loot joins the interact vocabulary: the nearest bag in
    // reach is a first-class target (F / pad-Ⓧ), same as any station.
    for (const [eid, remote] of this.entities) {
      if (remote.meta.kind !== EntityKind.ItemDrop) continue;
      const latest = remote.buffer.latest();
      const x = latest?.x ?? remote.meta.x;
      const y = latest?.y ?? remote.meta.y;
      const dx = x - pos.x;
      const dy = y - pos.y;
      const d = dx * dx + dy * dy;
      if (d <= 2.2 * 2.2 && (!best || d < best.d)) {
        best = { target: { kind: 'loot', tx: Math.floor(x), ty: Math.floor(y), eid }, d };
      }
    }
    return best?.target ?? offer ?? null;
  }

  /**
   * THE QUIET HEEL: the bond moment is worth a prompt only when the
   * press would land it — clock open AND the species' own lure in
   * the pack. (The server also wants the pet out of a fight; we
   * cannot see its target, but a mid-fight press just lands a plain
   * pat without spending the lure or the clock, so the prompt is
   * never a lie — it simply keeps offering until the offer takes.)
   */
  private petOfferReady(): boolean {
    const active = this.ownPets.find((p) => p.state === 'heel');
    if (!active || !this.petBondReady(active.slot)) return false;
    const lure = tameDef(active.species)?.lure;
    return lure !== undefined && this.inventory.some((s) => s !== null && s.item === lure && s.qty > 0);
  }

  /**
   * THE ASKING SHOWN — the overhead lure badge's one truth source.
   * While Gentle the Wild is seated, a wild living tamable wears the
   * very treat it wants above its head, marked with what the words in
   * the chat could only spell out: an amber bang when its wild level
   * still outreaches the keeper's beastcraft (fetching the treat
   * would not help yet), a red cross when the treat is missing from
   * the pack, a green check when the asking would land. Little
   * keepers read the picture, never the refusal line.
   */
  tameBadge(
    defId: string,
    level: number | undefined,
    ownerEid: number | undefined,
  ): { lure: string; state: 'ready' | 'lure' | 'level' } | null {
    if (ownerEid !== undefined) return null; // already somebody's friend
    if (!this.techniques.includes('gentle_the_wild')) return null;
    const td = tameDef(defId);
    if (!td) return null;
    if ((level ?? 1) > levelForXp(this.skills['beastcraft'] ?? 0)) {
      return { lure: td.lure, state: 'level' };
    }
    const packed = this.inventory.some((sl) => sl !== null && sl.item === td.lure && sl.qty > 0);
    return { lure: td.lure, state: packed ? 'ready' : 'lure' };
  }

  /** Is the bond moment open for this stall? (Counts down locally.) */
  petBondReady(slot: number): boolean {
    return Date.now() >= (this.petBondReadyAt.get(slot) ?? 0);
  }

  /** The walking companion's live body, if it is spawned right now. */
  ownPetEid(): EntityId | null {
    for (const [eid, remote] of this.entities) {
      if (remote.meta.kind === EntityKind.Npc && remote.meta.ownerEid === this.ownEid) return eid;
    }
    return null;
  }

  /**
   * Your own companion near this tile's center — the deliberate pat
   * channel (THE QUIET HEEL: the body is the button, not the prompt).
   */
  petAtTile(tx: number, ty: number): EntityId | null {
    const eid = this.ownPetEid();
    if (eid === null) return null;
    const remote = this.entities.get(eid);
    if (!remote) return null;
    const latest = remote.buffer.latest();
    const x = latest?.x ?? remote.meta.x;
    const y = latest?.y ?? remote.meta.y;
    const dx = x - (tx + 0.5);
    const dy = y - (ty + 0.5);
    if (dx * dx + dy * dy > 0.9 * 0.9) return null;
    // A scrum is not a petting zoo: mouse-down is ALSO the swing, and
    // the companion fights pressed against its mark. With a fightable
    // body near the same spot the click stays combat — spam-clicking
    // through a melee never lands an accidental pat (the chip still
    // pats any time).
    for (const other of this.entities.values()) {
      if (other.meta.kind !== EntityKind.Npc || other.meta.ownerEid !== undefined) continue;
      if (other.meta.friendly || other.meta.talk) continue;
      const ol = other.buffer.latest();
      if (ol != null && ol.hpPct === 0) continue;
      const ox = (ol?.x ?? other.meta.x) - (tx + 0.5);
      const oy = (ol?.y ?? other.meta.y) - (ty + 0.5);
      if (ox * ox + oy * oy <= 1.75 * 1.75) return null;
    }
    return eid;
  }

  /** The drop nearest this tile's center (touch taps land on tiles). */
  lootAtTile(tx: number, ty: number): EntityId | null {
    let best: EntityId | null = null;
    let bestD = 0.75;
    for (const [eid, remote] of this.entities) {
      if (remote.meta.kind !== EntityKind.ItemDrop) continue;
      const latest = remote.buffer.latest();
      const x = latest?.x ?? remote.meta.x;
      const y = latest?.y ?? remote.meta.y;
      const d = Math.hypot(x - (tx + 0.5), y - (ty + 0.5));
      if (d < bestD) {
        bestD = d;
        best = eid;
      }
    }
    return best;
  }

  /** Where a ground drop lies, if it is still in view. */
  dropPos(eid: EntityId): Vec2 | null {
    const remote = this.entities.get(eid);
    if (!remote || remote.meta.kind !== EntityKind.ItemDrop) return null;
    const latest = remote.buffer.latest();
    return { x: latest?.x ?? remote.meta.x, y: latest?.y ?? remote.meta.y };
  }

  /** All ground drops within `radius` tiles of the player, nearest first. */
  nearbyLoot(radius: number): Array<{
    eid: EntityId;
    x: number;
    y: number;
    d: number;
    itemId: string;
    qty: number;
    roll?: ItemRoll;
  }> {
    const out: ReturnType<ClientGame['nearbyLoot']> = [];
    const pos = this.predictor.pos;
    for (const [eid, remote] of this.entities) {
      if (remote.meta.kind !== EntityKind.ItemDrop) continue;
      const latest = remote.buffer.latest();
      const x = latest?.x ?? remote.meta.x;
      const y = latest?.y ?? remote.meta.y;
      const d = Math.hypot(x - pos.x, y - pos.y);
      if (d <= radius) {
        out.push({
          eid,
          x,
          y,
          d,
          itemId: remote.meta.defId ?? '',
          qty: remote.meta.qty ?? 1,
          roll: remote.meta.roll,
        });
      }
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  }

  /** Take a specific ground drop (server validates reach and claim). */
  pickup(eid: EntityId): void {
    this.conn?.send({ t: 'pickup', eid });
  }

  /**
   * ONE SWEEP, ONE ANSWER: take everything within reach on one
   * message — the server runs the sweep and coalesces the refusals.
   */
  takeAll(): void {
    this.conn?.send({ t: 'takeall' });
  }

  /** THE CHOSEN HAND: set the walk-over preference (persisted). */
  setLootPref(auto: boolean): void {
    if (this.lootAuto === auto) return;
    this.lootAuto = auto;
    this.conn?.send({ t: 'lootpref', auto });
  }

  /** Whether a walk-and-take errand (ONWARD, far click) is in flight. */
  get hasPickupErrand(): boolean {
    return this.pendingPickup !== null;
  }

  /**
   * Click a distant bag: auto-walk toward it and take exactly that
   * bag on arrival — not whatever the walk-over vacuum happens to
   * cross first. Manual movement input cancels the errand.
   */
  pickupWalk(eid: EntityId): boolean {
    const p = this.dropPos(eid);
    if (!p) return false;
    const pos = this.predictor.pos;
    if (Math.hypot(p.x - pos.x, p.y - pos.y) <= 2.2) {
      this.pickup(eid);
      return true;
    }
    if (!this.walkTo(Math.floor(p.x), Math.floor(p.y))) return false;
    this.pendingPickup = eid;
    return true;
  }

  /** Pathfind and auto-walk to a tile. Returns false if unreachable. */
  walkTo(tx: number, ty: number): boolean {
    const pos = this.predictor.pos;
    const path = findPath(this.world, pos.x, pos.y, tx, ty);
    if (path === null) return false;
    this.autoPath = path.length > 0 ? path : null;
    return true;
  }

  get isAutoWalking(): boolean {
    return this.autoPath !== null;
  }

  craft(recipe: string, qty: number): void {
    this.conn?.send({ t: 'craft', recipe, qty });
  }

  /** THE UNMAKING: break the gear in a pack slot down for its dust. */
  unmakeSend(slot: number): void {
    this.conn?.send({ t: 'unmake', slot });
  }

  /** SUNDERING: draw the working back out of a pack slot's gear. */
  sunderSend(slot: number, worn?: EquipSlot, seat?: 'ward' | 'art'): void {
    this.conn?.send({ t: 'sunder', slot, worn, seat });
  }

  /** Set the tools down: stop the running craft batch, keeping what's made. */
  craftStop(): void {
    this.conn?.send({ t: 'craftstop' });
  }

  /** Plant a seed into a tilled plot. */
  plantSend(tx: number, ty: number, seed: string): void {
    this.conn?.send({ t: 'plant', tx, ty, seed });
  }

  /** Interact with a living NPC (talk to an actor, milk a cow). */
  interactNpc(eid: EntityId): void {
    this.conn?.send({ t: 'interactnpc', eid });
  }

  /** Name (or rename) a companion by stall slot — the server judges. */
  petRename(slot: number, name: string): void {
    this.conn?.send({ t: 'petname', slot, name });
  }

  /** A stable-door act — the server re-proves the pen tile. */
  stableOp(op: 'heel' | 'stable' | 'release', slot: number): void {
    this.conn?.send({ t: 'stable', op, slot });
  }

  /** THE THREE COLLARS: set a stall's slotted arts whole — the
   *  server re-proves repertoire, budget, and the fight gate aloud. */
  petArts(slot: number, arts: string[]): void {
    this.conn?.send({ t: 'petarts', slot, arts });
  }

  /** Advance the current dialogue beat (the server owns the walk). */
  dialogueAdvance(): void {
    this.conn?.send({ t: 'dlgadv' });
  }

  /** Answer the current dialogue question by choice index. */
  dialogueChoose(idx: number): void {
    this.conn?.send({ t: 'dlgchoice', idx });
  }

  /** Excuse yourself from the conversation early. */
  dialogueEnd(): void {
    this.conn?.send({ t: 'dlgend' });
  }

  bankSend(op: 'deposit' | 'withdraw', item: string, qty: number, slot?: number, gearId?: number): void {
    this.conn?.send({ t: 'bank', op, item, qty, slot, gearId });
  }

  // ----------------------------------------------------------- social

  requestSocial(): void {
    this.conn?.send({ t: 'social' });
  }

  friendSearch(query: string): void {
    this.conn?.send({ t: 'friendsearch', query });
  }

  friendRequest(name: string): void {
    this.conn?.send({ t: 'friendrequest', name });
  }

  friendAccept(name: string): void {
    this.conn?.send({ t: 'friendaccept', name });
  }

  friendDecline(name: string): void {
    this.conn?.send({ t: 'frienddecline', name });
  }

  friendRemove(name: string): void {
    this.conn?.send({ t: 'friendremove', name });
  }

  // ------------------------------------------------------------ party

  requestParty(): void {
    this.conn?.send({ t: 'party' });
  }

  partyInvite(name: string): void {
    this.conn?.send({ t: 'partyinvite', name });
  }

  partyAccept(name: string): void {
    this.conn?.send({ t: 'partyaccept', name });
  }

  partyDecline(name: string): void {
    this.conn?.send({ t: 'partydecline', name });
  }

  partyLeave(): void {
    this.conn?.send({ t: 'partyleave' });
  }

  partyKick(name: string): void {
    this.conn?.send({ t: 'partykick', name });
  }

  partyDisband(): void {
    this.conn?.send({ t: 'partydisband' });
  }

  partyJoinRun(name: string): void {
    this.conn?.send({ t: 'partyjoinrun', name });
  }

  /** THE SAND AND THE ROAR: buy a card off the open stakes board. */
  arenaQueue(match: string): void {
    this.conn?.send({ t: 'arenaqueue', match });
  }

  /** Walk away from the claim (muster cancel or mid-card forfeit). */
  arenaLeave(): void {
    this.conn?.send({ t: 'arenaleave' });
  }

  /**
   * Fellows the wayfinder may point at: party members with a fresh
   * ticker position, self excluded. Entries older than two beats are
   * dropped — a stopped ticker must never leave ghosts on the chart.
   */
  partyFellowsPlaced(
    now = performance.now(),
  ): Array<{ name: string; x: number; y: number; plane: string }> {
    if (this.partyPos.size === 0) return [];
    const out: Array<{ name: string; x: number; y: number; plane: string }> = [];
    for (const [name, p] of this.partyPos) {
      if (name === this.ownName) continue;
      if (now - p.at > 5000) continue;
      out.push({ name, x: p.x, y: p.y, plane: p.plane });
    }
    return out;
  }

  /**
   * The players standing inside our interest window right now, nearest
   * first. Pure client knowledge — the entities map only ever holds
   * remotes, so our own rig never appears.
   */
  nearbyPlayers(): Array<{ eid: EntityId; name: string; dist: number; meta: EntityMeta }> {
    if (this.ownEid === null) return [];
    const pos = this.predictor.pos;
    const out: Array<{ eid: EntityId; name: string; dist: number; meta: EntityMeta }> = [];
    for (const [eid, remote] of this.entities) {
      if (remote.meta.kind !== EntityKind.Player) continue;
      const latest = remote.buffer.latest();
      const x = latest?.x ?? remote.meta.x;
      const y = latest?.y ?? remote.meta.y;
      out.push({
        eid,
        name: remote.meta.name ?? 'Wanderer',
        dist: Math.hypot(x - pos.x, y - pos.y),
        meta: remote.meta,
      });
    }
    out.sort((a, b) => a.dist - b.dist);
    return out;
  }

  invMove(from: number, to: number, merge = false): void {
    if (from === to) return;
    // Optimistic move — the server echoes the authoritative pack. A
    // deliberate drop onto the same kind (merge) pours up to THE
    // MEASURED STACK's cap, mirroring the server's rule; anything
    // else swaps. The echo corrects any stale-state divergence.
    const inv = this.inventory;
    const src = inv[from];
    const dst = inv[to];
    const def = src ? itemDef(src.item) : undefined;
    if (
      merge && src && dst && src.item === dst.item &&
      !src.stolen === !dst.stolen && def?.stackable
    ) {
      const cap = def.maxStack ?? Infinity;
      const pour = Math.min(src.qty, Math.max(0, cap - dst.qty));
      if (pour > 0) {
        dst.qty += pour;
        src.qty -= pour;
        if (src.qty === 0) inv[from] = null;
        this.conn?.send({ t: 'invmove', from, to, merge: true });
        return;
      }
    }
    const tmp = inv[from] ?? null;
    inv[from] = inv[to] ?? null;
    inv[to] = tmp;
    this.conn?.send({ t: 'invmove', from, to, ...(merge ? { merge: true } : {}) });
  }

  /** Drop a pack slot onto the ground where you stand. */
  dropSend(slot: number, qty: number): void {
    this.conn?.send({ t: 'dropitem', slot, qty });
  }

  /** Turn a key by ring id — only heard at a riftgate. */
  useKeySend(key: number): void {
    this.conn?.send({ t: 'usekey', key });
  }

  /** Set a key from the ring down at your feet (the trade verb). */
  keyDropSend(key: number): void {
    this.conn?.send({ t: 'keydrop', key });
  }

  /** Write (or clear) the margin note on a ledgered door. */
  keyLabelSend(seed: number, label: string | undefined): void {
    this.conn?.send({ t: 'keylabel', seed, label });
  }

  /** Pay the Keywright to cut a remembered door again. */
  keyForgeSend(seed: number): void {
    this.conn?.send({ t: 'keyforge', seed });
  }

  /** Confirm character creation (optimistic — the server locks it). */
  setLookSend(look: Look): void {
    if (this.ownLook) return; // locked — the server would refuse anyway
    this.ownLook = look;
    this.conn?.send({ t: 'setlook', look });
  }

  shopSend(op: 'buy' | 'sell', item: string, qty: number, slot?: number, shop?: string): void {
    this.conn?.send({ t: 'shop', op, item, qty, slot, shop });
  }

  buildSend(buildable: string, tx: number, ty: number, orient?: BuildOrient, dye?: number): void {
    this.conn?.send({ t: 'build', buildable, tx, ty, orient, dye });
  }

  demolishSend(tx: number, ty: number): void {
    this.conn?.send({ t: 'demolish', tx, ty });
  }

  /** Ask for the own-built ledger (THE OWN-WORK OVERLAY refresh). */
  ownBuiltRequest(): void {
    this.conn?.send({ t: 'ownbuilt' });
  }

  private handleSnapshot(snap: Snapshot): void {
    this.serverTick = snap.serverTick;
    const snapTime = snap.serverTick * TICK_MS;
    const arrivedAt = performance.now();
    const offset = snapTime - arrivedAt;
    // THE DRAIN IS NOT THE CLOCK: snapshots landing back-to-back are a
    // stalled queue emptying, not twenty independent reads of the
    // remote timeline. A live 20Hz cadence spaces arrivals ~50ms; a
    // drain delivers them within a millisecond of each other. Burst
    // arrivals get their samples applied but carry no vote below —
    // without this gate, a >1.3s stall's backlog walked bigDevRun to
    // 20 MID-drain and snapped the clock onto a still-stale offset
    // (one whole-world warp into the past), which then needed a second
    // 20-sample run to snap back out (a second warp) — both at the
    // exact moment the connection was recovering.
    const spaced = arrivedAt - this.lastSnapArrivalAt > 5;
    this.lastSnapArrivalAt = arrivedAt;
    // CLOCK DISCIPLINE. The offset estimate IS the remote timeline —
    // any wobble here is rubber-banding for every entity at once. Three
    // regimes: fast convergence while young; slew-limited micro-steps
    // (≤1ms per snapshot ≈ 20ms/s) in steady state so one delayed
    // burst can never warp time; and a sustained-jump snap (tab sleep,
    // route change) once the deviation holds for a full second of
    // honestly-spaced arrivals.
    if (this.clockOffset === null) {
      this.clockOffset = offset;
      this.clockSamples = 1;
      this.jitterEwma = 0;
      this.bigDevRun = 0;
    } else {
      const dev = offset - this.clockOffset;
      // Arrival jitter feeds the adaptive interp delay — spaced
      // arrivals only, or one drain burst would spike the EWMA to the
      // 220ms delay cap and tax every remote body ~9 seconds of extra
      // lag while it slewed back down.
      if (spaced) this.jitterEwma += (Math.abs(dev) - this.jitterEwma) * 0.05;
      if (Math.abs(dev) > 300) {
        if (spaced && ++this.bigDevRun >= 20) {
          this.clockOffset = offset; // sustained for ~1s: a real clock step
          this.clockSamples = 1;
          this.jitterEwma = 0;
          this.bigDevRun = 0;
        }
      } else {
        this.bigDevRun = 0;
        if (this.clockSamples < 20) {
          this.clockOffset += dev * 0.1;
          this.clockSamples++;
        } else {
          this.clockOffset += Math.max(-1, Math.min(1, dev * 0.1));
        }
      }
    }

    for (const e of snap.entities) {
      if (e.eid === this.ownEid) {
        this.ownHpPct = e.hpPct;
        // THE PREDICTED BLOW's handover: the moment the server's byte
        // matches the predicted pose, the prediction retires — same
        // value, so no downstream pose-change clock restarts.
        if (this.ownSwing && e.pose === this.ownSwing.pose) this.ownSwing = null;
        this.ownPose = e.pose;
        this.ownStatus = e.status;
        // THE PREDICTOR FEELS THE COLD: the chill bit drives the same
        // speed factor the server walks by (CHILL_SPEED_FACTOR).
        this.predictor.statusMoveFactor = moveFactorOfBits(e.status);
        // The sheathe mirror retires the moment the server bit agrees
        // (same-value handover, the PREDICTED BLOW pattern); a claim
        // the server never confirms — a dropped frame — goes stale
        // after 1.5s and the bit takes back the truth.
        if (this.ownSheathed !== null) {
          const serverBit = (e.status & SHEATHED_BIT) !== 0;
          if (serverBit === this.ownSheathed) this.ownSheathed = null;
          else if (performance.now() - this.ownSheathedAt > 1500) this.ownSheathed = null;
        }
        // The server-confirmed facing: normally the aim echoes back,
        // but a body mounted on furniture is dir-locked to the seat —
        // the renderer reads this instead of the live aim while
        // seated, so the sitter can't swivel on the chair.
        this.ownDirServer = e.dir;
        this.predictor.reconcile({ x: e.x, y: e.y }, snap.lastInputSeq);
        continue;
      }
      const remote = this.entities.get(e.eid);
      if (!remote) continue; // meta hasn't arrived yet; next snapshot will land
      remote.buffer.push({
        t: snapTime,
        x: e.x,
        y: e.y,
        dir: e.dir,
        pose: e.pose,
        hpPct: e.hpPct,
        status: e.status,
        alert: e.alert,
      });
    }
  }

  /**
   * Smooth game-clock hours for the sky. Rides the same slewed
   * clockOffset as entity interpolation, so the sun never stutters
   * on snapshot arrival.
   */
  clockHoursNow(): number {
    const serverMs =
      this.clockOffset === null ? this.serverTick * TICK_MS : performance.now() + this.clockOffset;
    return clockHours(serverMs + this.timeOfs * TICK_MS);
  }

  /**
   * The delay target: one snapshot interval of bracketing room plus
   * headroom scaled by measured arrival jitter. Clean local play sits
   * at the 80ms floor; a 30ms-jitter connection rides ~200.
   */
  private targetInterpDelay(): number {
    return Math.min(220, Math.max(80, TICK_MS + 30 + this.jitterEwma * 4));
  }

  /** Server-timeline timestamp remote entities should be rendered at. */
  renderTime(): number {
    if (this.clockOffset === null) return 0;
    return performance.now() + this.clockOffset - this.interpDelayMs;
  }

  /**
   * THE LIVE WIRE, read aloud: milliseconds since the server last
   * spoke, while we believe ourselves in-game on an open socket — 0
   * whenever that belief doesn't hold (login, reconnect, shutdown).
   * The HUD reads this to name a stall the moment it starts
   * (~1.5s), well before the 5s watchdog rules the wire dead: the
   * frozen world should never be anonymous.
   */
  wireSilenceMs(now = performance.now()): number {
    if (this.connStatus !== 'ingame' || !this.conn?.isOpen || this.lastS2CAt === 0) return 0;
    return now - this.lastS2CAt;
  }

  /**
   * Server-NOW estimate — the projectile timeline. Arrows and bolts
   * render extrapolated to where the server actually HAS them, not
   * 100+ms in the past: your shot leaves the bow tracking its true
   * flight, and an incoming shot is exactly as far along as it really
   * is. Straight-line flight is what makes this safe (the interp
   * buffer's bounded extrapolation does the projection).
   */
  projectileTime(): number {
    if (this.clockOffset === null) return 0;
    return performance.now() + this.clockOffset;
  }

  sendChat(text: string): void {
    this.conn?.send({ t: 'chat', text });
  }

  /** Fixed-timestep input sampling + prediction; called every frame. */
  update(now: number): void {
    if (this.lastUpdate === 0) this.lastUpdate = now;
    const rawDt = now - this.lastUpdate;
    const frameDt = Math.min(250, rawDt);
    this.lastUpdate = now;

    if (this.ownEid === null || !this.conn?.isOpen) return;

    // THE LIVE WIRE watchdog. In-game the server speaks every tick
    // (the own body always ships), so five silent seconds on an
    // "open" socket is a wire that died without a goodbye — Wi-Fi
    // drop, route change, a mid-deploy box: TCP can sit on all of
    // them for minutes while the world stands frozen at its last
    // sample and prediction happily walks the own body through a
    // fiction. Abort tears the socket down and reports it closed,
    // which drops us into the ordinary reconnect path — backoff,
    // THE THIN THREAD pill, and a server-side bindSession takeover
    // that kicks the half-dead twin. A tab waking from sleep gets a
    // one-second grace to hear the wire before the verdict counts:
    // the frozen page never watched the silence it's blamed for.
    if (rawDt > 1000) this.lastS2CAt = Math.max(this.lastS2CAt, now - 1000);
    if (this.connStatus === 'ingame' && this.lastS2CAt > 0 && now - this.lastS2CAt > 5000) {
      this.conn.abort();
      return;
    }

    // Self-reveal: the same disc the server marks, cleared here with
    // zero latency (the deterministic-reveal law).
    if (now - this.lastRevealAt >= CLIENT_REVEAL_MS) {
      this.lastRevealAt = now;
      const pos = this.predictor.pos;
      // The current plane's own chart — the explored getter resolves
      // persistent vs scratch by the plane's law.
      if (this.explored.markDisc(pos.x, pos.y).length > 0) this.chartVersion++;
    }

    this.accumulator += frameDt;
    while (this.accumulator >= TICK_MS) {
      this.accumulator -= TICK_MS;
      let { mx, my } = this.input.moveAxes();
      if (mx !== 0 || my !== 0) {
        this.autoPath = null; // manual input takes over
        this.pendingPickup = null;
      } else if (this.autoPath) {
        const pos = this.predictor.pos;
        let waypoint = this.autoPath[0];
        while (waypoint && Math.hypot(waypoint.x - pos.x, waypoint.y - pos.y) < 0.3) {
          this.autoPath.shift();
          waypoint = this.autoPath[0];
        }
        if (!waypoint) {
          this.autoPath = null;
        } else {
          const d = Math.hypot(waypoint.x - pos.x, waypoint.y - pos.y);
          mx = (waypoint.x - pos.x) / d;
          my = (waypoint.y - pos.y) / d;
        }
      }
      const frame: InputFrame = {
        seq: this.inputSeq++,
        mx,
        my,
        aim: this.aim,
        buttons: this.input.buttons(),
      };
      this.groundAim?.filterFrame(frame);
      // The mirrors read the frame in the SERVER'S button order:
      // sheathe/auto-draw and the swap set the weapons-away law first,
      // then casts, then the fire lanes — so the very press that draws
      // steel is refused by every mirror downstream of it, exactly as
      // the server will refuse it.
      this.trackOwnSheathe(frame, now);
      this.trackOwnSwap(frame, now);
      this.trackOwnCasts(frame);
      // viewMs (v8): report the live interp delay so melee lag comp
      // rewinds by what this screen is ACTUALLY showing.
      this.conn.send({ t: 'input', frame, viewMs: Math.round(this.interpDelayMs) });
      this.predictor.applyInput(frame);
      this.trackOwnDraw(frame, now);
      this.trackOwnStaff(frame);
      this.trackOwnMelee(frame, now);
      this.prevLocalButtons = frame.buttons;
      // THE DRAWN BREATH accrues per sent frame: a planted frame
      // breathes CAST_STILL_FACTOR. (The server judges by RESOLVED
      // motion; intent is the closest the bar can know — a wall-push
      // drifts it by a tick at most, and the fire message is truth.)
      if (this.ownCast) {
        const still = Math.abs(frame.mx) < 0.01 && Math.abs(frame.my) < 0.01;
        this.ownCast.rate = still ? CAST_STILL_FACTOR : 1;
        this.ownCast.progress = Math.min(
          this.ownCast.total,
          this.ownCast.progress + this.ownCast.rate,
        );
      }
    }
    // A walk-to-loot errand completes the moment the bag is in reach
    // (or dissolves if someone else took it first).
    if (this.pendingPickup !== null) {
      const p = this.dropPos(this.pendingPickup);
      if (!p) {
        this.pendingPickup = null;
      } else {
        const pos = this.predictor.pos;
        if (Math.hypot(p.x - pos.x, p.y - pos.y) <= 1.9) {
          this.pickup(this.pendingPickup);
          this.pendingPickup = null;
        }
      }
    }
    // Fraction through the current tick — drives smooth interpolation of
    // the fixed-step prediction at full display refresh.
    this.predictor.renderAlpha = this.accumulator / TICK_MS;
    this.predictor.decayError(frameDt / 1000);
    // Interp delay slews toward its jitter-derived target (≤15ms/s —
    // a 1.5% time dilation, invisible; a step would be a visible warp).
    const dTarget = this.targetInterpDelay();
    const maxStep = 15 * (frameDt / 1000);
    this.interpDelayMs += Math.max(-maxStep, Math.min(maxStep, dTarget - this.interpDelayMs));
    // Tracer expiry: an unmatched shot past its plausible arrival
    // window (or flight range) was a misprediction — the renderer
    // fades it over its last 150ms; drop it after.
    const nowMs = performance.now();
    for (let i = this.ownShots.length - 1; i >= 0; i--) {
      const shot = this.ownShots[i]!;
      const age = nowMs - shot.bornAt;
      if (age > 550 || (age / 1000) * shot.speed > shot.range + 1) this.ownShots.splice(i, 1);
    }
    // Handoffs whose entity left before the blend finished. The age
    // cap covers the longest along-track repay (1200ms) plus slack —
    // culling a live repay early would snap the remaining lead back.
    if (this.projHandoffs.size > 0) {
      for (const [eid, h] of this.projHandoffs) {
        if (!this.entities.has(eid) || (h.capturedAt > 0 && nowMs - h.capturedAt > 1500)) {
          this.projHandoffs.delete(eid);
        }
      }
    }
  }
}

/** The interiors boundary set, as a Set for the per-chunk scans. */
const BOUNDARY_TILE_SET = new Set<number>(INTERIOR_BOUNDARY_TILES);

/** Any wall/door tile in the chunk — the interiors-version gate. */
function chunkHasBoundary(chunk: ChunkData): boolean {
  const g = chunk.ground;
  for (let i = 0; i < g.length; i++) {
    if (BOUNDARY_TILE_SET.has(g[i]!)) return true;
  }
  return false;
}

/** Byte-for-byte identical streamed payload (rev is local-only). */
function sameChunkPayload(a: ChunkData, b: ChunkData): boolean {
  for (let i = 0; i < a.ground.length; i++) {
    if (a.ground[i] !== b.ground[i]) return false;
  }
  for (let i = 0; i < a.detail.length; i++) {
    if (a.detail[i] !== b.detail[i]) return false;
  }
  for (let i = 0; i < a.elev.length; i++) {
    if (a.elev[i] !== b.elev[i]) return false;
  }
  return true;
}
