import {
  CHUNK_SIZE,
  CLIENT_REVEAL_MS,
  COMBO_GRACE_TICKS,
  COMBO_STAGES,
  ChunkStore,
  DRAW_FULL_TICKS,
  DRAW_MIN_TICKS,
  DUNGEON_MIN_Y,
  ExploredMask,
  HEAVY_BOLT_RECOVERY_MULT,
  INTERP_DELAY_MS,
  b64ToU8,
  InputButton,
  hasButton,
  PLAYER_SPEED,
  PROTOCOL_VERSION,
  SHEATHED_BIT,
  SNEAK_DETECTED_BIT,
  SNEAK_HIDDEN_BIT,
  TICK_MS,
  chargedShot,
  clockHours,
  drawCharge,
  chestInfo,
  doorInfo,
  findPath,
  isSignTile,
  nextComboStage,
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
  type InputFrame,
  type BuildOrient,
  type InvSlot,
  type ItemRoll,
  honedAbility,
  levelForXp,
  techniqueRankFor,
  type DiscoveryWire,
  type QuestAvailWire,
  type QuestDoneWire,
  type QuestRewardsWire,
  type QuestWire,
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
  type Vec2,
} from '@arx/shared';
import { MATURE_TILES, NODES_BY_TILE, SETTLED_ANCHORS, isCropTile, abilityDef, itemDef, npcDef, replaceGeography, techniqueDef, type GeographyDef } from '@arx/content';
import { EntityKind, shutDoorTile } from '@arx/shared';
import type { AbilityDef, AbilitySlot, DangerAnchor, Look } from '@arx/shared';

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
  /** Same defId the server will broadcast ('archery', 'magic:ember'…). */
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
  /** performance.now() at spawn. */
  bornAt: number;
}

export type InteractTarget =
  | { kind: 'node'; tx: number; ty: number }
  | { kind: 'station'; tx: number; ty: number; station: StationType }
  | { kind: 'bank'; tx: number; ty: number }
  | { kind: 'shop'; tx: number; ty: number }
  | { kind: 'portal'; tx: number; ty: number }
  | { kind: 'plot'; tx: number; ty: number }
  | { kind: 'crop'; tx: number; ty: number; mature: boolean }
  | { kind: 'npc'; tx: number; ty: number; eid: EntityId; verb: string }
  | { kind: 'loot'; tx: number; ty: number; eid: EntityId }
  | { kind: 'chest'; tx: number; ty: number; chest: ChestKind }
  | { kind: 'door'; tx: number; ty: number; open: boolean; gate: boolean }
  | { kind: 'bed'; tx: number; ty: number }
  | { kind: 'sign'; tx: number; ty: number; mine: boolean; blank: boolean };
import { Connection } from '../net/connection.js';
import { InterpBuffer } from '../net/interpolation.js';
import { Predictor } from '../net/prediction.js';
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

export interface ChatLine {
  channel: 'local' | 'system';
  from?: string;
  text: string;
}

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
  /** The Riftgate answered an interact — open the key panel over these pack slots. */
  onRiftgate?(keySlots: number[], partyRuns?: PartyRunWire[]): void;
  /** A board's words arrived or changed — repaint whatever shows them. */
  onSignChanged?(tx: number, ty: number): void;
  /** Crossed into a dungeon — everything the entry banner tells. */
  onDungeon?(d: { name: string; sigil: string; tier: string; theme: string; power: number }): void;
  onHit(hit: { x: number; y: number; dmg: number; isOwn: boolean; crit: boolean; backstab?: boolean }): void;
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
  /** A timed action began — `ticks` server ticks to completion. */
  onActionStart?(ticks: number): void;
  /** The own-built ledger arrived — feed the overlay. */
  onOwnBuilt?(keys: ReadonlySet<string>): void;
  /** The running action ended — `reason` says why ('done', 'blocked', 'occupied', 'materials', 'moved', …). */
  onActionEnd?(reason?: string): void;
  /** A conversation began — raise the cinematic frame around `eid`. */
  onDialogueOpen?(o: { eid: EntityId; name: string; title?: string }): void;
  /** One beat of conversation — typewriter it out. */
  onDialogueNode?(n: {
    speaker: 'npc' | 'player';
    text: string;
    choices?: string[];
    last?: boolean;
    gifts?: Array<{ item: string; qty: number }>;
    quest?: { id: string; name: string; rewards?: QuestRewardsWire };
  }): void;
  /** The conversation is over — tear the frame down. */
  onDialogueClose?(): void;
  /** A trainer opened their wares — render the named shop's shelf. */
  onShopOpen?(shop: string): void;
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
  /** A LIVE quest ceremony — the ONLY trigger for banners and fanfare. */
  onQuestEvent?(e: { kind: 'accepted' | 'completed'; id: string; name: string; rewards?: QuestRewardsWire }): void;
  /** The quest ledger changed shape (quiet) — repaint journal surfaces. */
  onQuestsChanged?(): void;
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
  skills: SkillXp = {};
  /** Recipes known beyond the core set (server-owned; see 'recipes'). */
  knownRecipes: ReadonlySet<string> = new Set();
  /**
   * THE CHART: persistent fog-of-war, seeded by the login snapshot and
   * cleared locally with the shared deterministic disc — the server
   * marks the identical cells, so no reveal ever travels the wire.
   */
  readonly explored = new ExploredMask();
  /** The per-run dungeon chart (y >= DUNGEON_MIN_Y) — never persisted. */
  readonly dungeonExplored = new ExploredMask();
  /** The place ledger, keyed by discovery id. */
  readonly discoveries = new Map<string, DiscoveryWire>();
  /** The one active waypoint (optimistic; server keeps the durable copy). */
  waypoint: Vec2 | null = null;
  /** THE QUEST LEDGER: active quests by id (status 'ready' = turn in). */
  readonly quests = new Map<string, QuestWire>();
  /** The done shelf, by id. */
  readonly questsDone = new Map<string, QuestDoneWire>();
  /** Offerable quests — the "!" over each giver resolves from this. */
  questAvailable: QuestAvailWire[] = [];
  /** Bumped on every ledger change — journal surfaces re-read on it. */
  questVersion = 0;
  /** The party snapshot — empty members = partyless. Refetched on events. */
  party: { members: PartyMemberWire[]; invites: string[]; outgoing: string[] } | null = null;
  /** Fellow positions from the partypos ticker, keyed by name. */
  readonly partyPos = new Map<string, { x: number; y: number; at: number }>();
  /** Bumped whenever fog, discoveries, or the waypoint change — map surfaces re-draw on it. */
  chartVersion = 0;
  private lastRevealAt = 0;
  equipment: Partial<Record<string, EquippedItem>> = {};
  /** Cosmetic idle weapon-carry preference (server-confirmed). */
  carryStyle: 'normal' | 'rogue' = 'normal';
  /** Off-fist grip preference — each hand carries its own way. */
  carryOff: 'normal' | 'rogue' = 'normal';
  /** Running gather action, for the progress bar. */
  action: { startedAt: number; durationMs: number } | null = null;
  /** "tx,ty" keys of this character's own built tiles (THE OWN-WORK OVERLAY). */
  ownBuilt: ReadonlySet<string> = new Set();
  /** Damage numbers floating up; pruned by the renderer. */
  readonly floaties: Floaty[] = [];
  /**
   * Projectiles that just ended flight (hit, expired, or left view) —
   * consumed by the renderer for impact bursts and stuck arrows.
   */
  readonly projectileEnds: Array<{ x: number; y: number; dir: number; style: string }> = [];
  /** Predicted own shots in flight, awaiting their server entity (v8). */
  readonly ownShots: OwnShot[] = [];
  /**
   * Matched tracer → entity handoffs. The renderer captures the visual
   * offset on the entity's first draw and decays it (~90ms), so the
   * predicted flight blends into the authoritative one seamlessly.
   */
  readonly projHandoffs = new Map<EntityId, { shot: OwnShot; ox: number; oy: number; capturedAt: number }>();
  /**
   * Local staff-cadence mirror (bolt-bolt-HEAVY, same shared laws).
   * Gated in the SEQ domain, not wall-clock ms: one input frame is one
   * server tick, and the server re-arms in ticks. A ms-based gate can
   * only ever fire a frame LATE (rAF jitter), so its fire-seq drifts
   * monotonically behind the server's until the ±2 handoff window
   * breaks and every bolt draws twice — tracer plus real entity.
   */
  private staffReadySeq = 0;
  private boltStageLocal = 0;
  private boltGraceUntilSeq = 0;
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

  /** Hotbar state: performance.now() when each slot comes off cooldown. */
  readonly abilityReadyAt: [number, number, number, number] = [0, 0, 0, 0];
  /** Full cooldowns in ticks (0 = nothing equipped in that slot). */
  abilityMax: [number, number, number, number] = [0, 0, 0, 0];
  /** THE FREE HAND: the one slotted technique (server-confirmed). */
  technique: string | null = null;
  /** THE UNWRITTEN PAGE: hidden arts earned by deed (server truth). */
  earnedArts: string[] = [];
  /** Answered Callings (server truth; Focus derives from skills). */
  callings: string[] = [];
  /** Active consumable buffs (tonic/food) for the HUD chip row. */
  buffs: BuffInfo[] = [];
  /** performance.now() when the buffs snapshot arrived (chips count down). */
  buffsAt = 0;
  /** Fires when the buff list changes (HUD refresh). */
  onBuffs: (() => void) | null = null;
  /** Fires when the local player commits a cast (FX + audio hooks). */
  onCastFx: ((slot: AbilitySlot, ab: AbilityDef) => void) | null = null;
  /** Fires when the technique loadout changes (UI refresh). */
  onTechniques: (() => void) | null = null;
  onCallings: (() => void) | null = null;
  /** Fires for every arriving combat effect (audio/shake hooks). */
  onFx: ((fx: ActiveFx) => void) | null = null;
  /** Buttons of the previous outgoing frame — press-edge detection. */
  private prevSentButtons = 0;
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

  /** Tap-to-move autopilot; cancelled by any manual movement input. */
  private autoPath: Vec2[] | null = null;
  /** Drop entity to take the moment the auto-walk brings it in reach. */
  private pendingPickup: EntityId | null = null;
  /** Own hit-flash timer. */
  ownHurtUntil = 0;
  ownHpPct = 255;
  /** Authoritative pose for the local player (from snapshots). */
  ownPose = 0;

  /** Dodge FX hook (the predictor's onDodge is owned internally). */
  onDodgeFx: ((x: number, y: number, mx: number, my: number) => void) | null = null;
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

  constructor(
    private readonly input: InputManager,
    private readonly events: GameEvents,
  ) {
    this.predictor.onDodge = (x, y, mx, my) => {
      this.drawStartAt = 0; // dodging lets the string down
      this.onDodgeFx?.(x, y, mx, my);
    };
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
    return this.equippedWeaponDef()?.style ?? 'melee';
  }

  /** The ability granted by a hotbar slot: Art, relic, technique, sigil. */
  slotAbilityDef(slot: AbilitySlot): AbilityDef | null {
    switch (slot) {
      case 0: {
        const artId = this.equippedWeaponDef()?.art;
        return artId ? (abilityDef(artId) ?? null) : null;
      }
      case 1: {
        const relic = itemDef(this.equipment.relic?.id ?? '');
        return relic?.relic ? (abilityDef(relic.relic) ?? null) : null;
      }
      case 2: {
        // THE FREE HAND, mirrored: the slot ignores the equipped weapon.
        const chosen = this.technique;
        if (!chosen) return null;
        const ab = abilityDef(chosen);
        if (!ab) return null;
        // THE HONED-ART LAW, mirrored: rank rides the BASE skill level.
        const tech = techniqueDef(chosen);
        if (!tech?.ranks) return ab;
        const rank = techniqueRankFor(tech, levelForXp(this.skills[tech.style] ?? 0));
        return honedAbility(ab, tech.ranks, rank);
      }
      case 3: {
        const sigil = itemDef(this.equipment.sigil?.id ?? '');
        return sigil?.sigil ? (abilityDef(sigil.sigil) ?? null) : null;
      }
    }
  }

  /** Slot a technique on R (server validates the unlock). */
  sendTechnique(ability: string): void {
    this.conn?.send({ t: 'technique', ability });
  }

  /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
  sendCalling(calling: string, on: boolean): void {
    this.conn?.send({ t: 'calling', calling, on });
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
    for (const [bit, slot] of slots) {
      if (!(pressed & bit)) continue;
      const ab = this.slotAbilityDef(slot);
      if (!ab || now < this.abilityReadyAt[slot]) continue;
      this.abilityReadyAt[slot] = now + ab.cooldownTicks * TICK_MS;
      this.abilityMax[slot] = ab.cooldownTicks;
      this.drawStartAt = 0; // casting lets the bowstring down
      this.castFreezeUntilSeq = frame.seq + (ab.castFreezeTicks ?? 0);
      this.predictor.registerCast(
        frame.seq,
        ab.castFreezeTicks ?? 0,
        ab.shape === 'dash_strike' ? { tiles: ab.dashTiles ?? 3, aim: frame.aim } : null,
      );
      this.onCastFx?.(slot, ab);
    }
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
    if (held) {
      const hasAmmo =
        !weapon.ammo ||
        this.inventory.some((s) => s !== null && s.item === weapon.ammo && s.qty > 0);
      if (this.drawStartAt === 0 && now >= this.drawReadyAt && hasAmmo) {
        this.drawStartAt = now;
      }
      return;
    }
    if (this.drawStartAt === 0) return;
    const heldMs = now - this.drawStartAt;
    const charge = this.ownDrawT;
    this.drawStartAt = 0;
    const speed = weapon.projectileSpeed ?? 12;
    if (heldMs >= DRAW_MIN_TICKS * TICK_MS) {
      this.drawReadyAt = now + weapon.cooldownTicks * TICK_MS;
      this.onLoose?.(charge, this.aim);
      // Predicted arrow (v8): the same chargedShot law the server fires
      // with — the tracer flies the true speed/range for this draw.
      const ticks = Math.round(heldMs / TICK_MS);
      const shot = chargedShot(drawCharge(ticks), 1, speed, weapon.range);
      this.predictShot(frame.seq, 'archery', this.aim, shot.speed, shot.range);
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
    const weapon = this.equippedWeaponDef();
    if (!weapon || weapon.style !== 'magic') return;
    if (!hasButton(frame.buttons, InputButton.Attack)) return;
    if (frame.seq < this.staffReadySeq || frame.seq < this.castFreezeUntilSeq) return;
    const stage = nextComboStage(this.boltStageLocal, frame.seq <= this.boltGraceUntilSeq);
    this.boltStageLocal = stage;
    const heavy = stage === COMBO_STAGES - 1;
    const cdTicks = heavy
      ? Math.round(weapon.cooldownTicks * HEAVY_BOLT_RECOVERY_MULT)
      : weapon.cooldownTicks;
    this.staffReadySeq = frame.seq + cdTicks;
    this.boltGraceUntilSeq = this.staffReadySeq + COMBO_GRACE_TICKS;
    const base = heavy ? 'magic_heavy' : 'magic';
    const defId = weapon.element ? `${base}:${weapon.element}` : base;
    this.predictShot(
      frame.seq,
      defId,
      frame.aim,
      (weapon.projectileSpeed ?? 12) * (heavy ? 0.8 : 1),
      weapon.range,
    );
  }

  /** Spawn a predicted tracer at the body, capped to a small roster. */
  private predictShot(seq: number, defId: string, aim: number, speed: number, range: number): void {
    const p = this.predictor.renderPos();
    this.ownShots.push({
      seq,
      defId,
      x: p.x,
      y: p.y,
      dirX: Math.cos(aim),
      dirY: Math.sin(aim),
      dir: aim,
      speed,
      range,
      bornAt: performance.now(),
    });
    if (this.ownShots.length > 8) this.ownShots.shift();
  }

  /** Connect; the server answers welcome (valid token) or authRequired. */
  connect(token: string | null): void {
    this.token = token;
    this.stopped = false;
    this.events.onStatus('connecting');
    this.openConnection();
  }

  sendLogin(user: string, pass: string): void {
    this.conn?.send({ t: 'login', user, pass });
  }

  sendRegister(user: string, pass: string, name: string, invite?: string): void {
    this.conn?.send({ t: 'register', user, pass, name, invite: invite || undefined });
  }

  private openConnection(): void {
    this.conn = new Connection({
      onOpen: () => {
        this.conn!.send({
          t: 'hello',
          v: PROTOCOL_VERSION,
          token: this.token ?? undefined,
        });
      },
      onClose: () => {
        if (this.stopped) return;
        this.events.onStatus('reconnecting');
        this.ownEid = null;
        if (this.pingTimer) clearInterval(this.pingTimer);
        setTimeout(() => this.openConnection(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 5000);
      },
      onMessage: (msg) => this.handleMessage(msg),
      onSnapshot: (snap) => this.handleSnapshot(snap),
      onChunk: (chunk) => this.handleChunk(chunk),
      onTilePatch: (patch) => this.handleTilePatch(patch),
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
        .map(([x, y, safeR, haven]) => ({
          x: x!,
          y: y!,
          safeR: safeR!,
          ...(haven ? { haven: true } : {}),
        }));
    }
    this.dangerAnchors = [
      ...this.settledAnchors,
      ...list
        .filter((h) => h.length >= 3)
        .map(([x, y, safeR]) => ({ x: x!, y: y!, safeR: safeR!, haven: true })),
    ];
  }

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
        this.party = null;
        this.partyPos.clear();
        this.explored.clear();
        this.dungeonExplored.clear();
        this.discoveries.clear();
        this.chartVersion++;
        this.quests.clear();
        this.questsDone.clear();
        this.questAvailable = [];
        this.questVersion++;
        this.ownLook = msg.look ?? null;
        this.token = msg.token;
        this.serverTick = msg.tick;
        this.entities.clear();
        this.ownShots.length = 0;
        this.projHandoffs.clear();
        this.staffReadySeq = 0;
        this.boltStageLocal = 0;
        this.boltGraceUntilSeq = 0;
        this.castFreezeUntilSeq = 0;
        this.clockOffset = null;
        this.reconnectDelay = 500;
        this.events.onStatus('ingame');
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
        this.events.onStatus('rejected', msg.reason);
        break;
      }
      case 'authRequired': {
        this.events.onStatus('authRequired');
        break;
      }
      case 'authErr': {
        this.events.onStatus('authErr', msg.reason);
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
            this.entities.set(meta.eid, { meta, buffer: new InterpBuffer() });
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
            let best: OwnShot | null = null;
            let bestIdx = -1;
            for (let i = 0; i < this.ownShots.length; i++) {
              const shot = this.ownShots[i]!;
              const d = Math.abs(shot.seq - meta.seq);
              if (d > 2) continue;
              if (!best || d < Math.abs(best.seq - meta.seq)) {
                best = shot;
                bestIdx = i;
              }
            }
            // Staff fallback: a server input-queue stall drops frames and
            // permanently shifts the seq↔tick mapping, pushing every later
            // bolt outside the ±2 window. Both streams are ordered, so
            // marry the oldest unclaimed tracer of the same bolt kind
            // rather than draw the shot twice. Magic only — the archery
            // snap-fan's second arrow shares a seq and must stay
            // unpredicted.
            if (!best && meta.defId?.startsWith('magic')) {
              for (let i = 0; i < this.ownShots.length; i++) {
                if (this.ownShots[i]!.defId === meta.defId) {
                  best = this.ownShots[i]!;
                  bestIdx = i;
                  break;
                }
              }
            }
            if (best) {
              this.ownShots.splice(bestIdx, 1);
              this.projHandoffs.set(meta.eid, { shot: best, ox: 0, oy: 0, capturedAt: 0 });
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
            this.projectileEnds.push({
              x: last?.x ?? e.meta.x,
              y: last?.y ?? e.meta.y,
              dir: last?.dir ?? 0,
              style: e.meta.defId ?? '',
            });
          }
          this.entities.delete(eid);
        }
        break;
      }
      case 'chat': {
        this.events.onChat({ channel: msg.channel, from: msg.from, text: msg.text });
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
        this.events.onShopOpen?.(msg.shop);
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
          this.action = { startedAt: performance.now(), durationMs: (msg.ticks ?? 0) * TICK_MS };
          this.events.onActionStart?.(msg.ticks ?? 0);
        } else {
          this.action = null;
          this.events.onActionEnd?.(msg.reason);
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
            color: crit
              ? '#ffd24a'
              : msg.im
                ? '#9db7d6'
                : msg.dmg === 0
                  ? '#7fb2d9'
                  : msg.eid === this.ownEid
                    ? '#ff7b6b'
                    : '#f4efe4',
            bornAt: performance.now(),
            sizeMul: crit ? 1.6 : 1,
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
          this.events.onHit({ x, y, dmg: msg.dmg, isOwn: msg.eid === this.ownEid, crit, backstab: msg.bs === true });
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
        // The gate names the slots; the panel reads the keys' rolls
        // from our own pack (instance-addressing law).
        this.events.onRiftgate?.(msg.keySlots, msg.partyRuns);
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
        });
        break;
      }
      case 'dlgopen': {
        this.events.onDialogueOpen?.({ eid: msg.eid, name: msg.name, title: msg.title });
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
        });
        break;
      }
      case 'dlgclose': {
        this.events.onDialogueClose?.();
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
      case 'cooldowns': {
        const now = performance.now();
        this.abilityMax = [msg.max[0], msg.max[1], msg.max[2], msg.max[3]];
        for (let i = 0; i < 4; i++) this.abilityReadyAt[i] = now + msg.cd[i]! * TICK_MS;
        break;
      }
      case 'techniques': {
        this.technique = msg.chosen;
        this.earnedArts = msg.earned ?? [];
        this.onTechniques?.();
        break;
      }
      case 'callings': {
        this.callings = msg.answered;
        this.onCallings?.();
        break;
      }
      case 'buffs': {
        this.buffs = msg.buffs;
        this.buffsAt = performance.now();
        this.onBuffs?.();
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
        for (const [rx, ry, b64] of msg.regions) {
          this.explored.loadRegion(rx, ry, b64ToU8(b64));
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
        this.waypoint = msg.x !== undefined && msg.y !== undefined ? { x: msg.x, y: msg.y } : null;
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
        for (const m of msg.members) this.partyPos.set(m.name, { x: m.x, y: m.y, at });
        break;
      }
      case 'fx': {
        // Door rattles and prop smashes are scenery feedback, not
        // combat VFX — hand them straight to the fx hook without
        // joining the ability list.
        if (msg.kind === 'rattle' || msg.kind === 'smash') {
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
    this.world.set(chunk);
    this.touchNeighbors(chunk.cx, chunk.cy);
    this.worldVersion++;
    this.interiorsVersion++;
  }

  /** Fires with (tx, ty, previous, next) whenever a tile mutates. */
  onTileChange: ((tx: number, ty: number, prev: number | undefined, next: number) => void) | null =
    null;

  private handleTilePatch(patch: TilePatch): void {
    const prev = this.world.groundAt(patch.tx, patch.ty);
    this.world.setGround(patch.tx, patch.ty, patch.ground);
    // Blob rendering blends across tiles — rebake the neighborhood.
    this.touchNeighbors(Math.floor(patch.tx / CHUNK_SIZE), Math.floor(patch.ty / CHUNK_SIZE));
    this.worldVersion++;
    // A posture swap of the SAME door leaves every room's shape alone.
    const doorSwap =
      prev !== undefined &&
      shutDoorTile(prev) !== null &&
      shutDoorTile(prev) === shutDoorTile(patch.ground);
    if (!doorSwap) this.interiorsVersion++;
    this.onTileChange?.(patch.tx, patch.ty, prev, patch.ground);
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
    const wx = Math.round(x);
    const wy = Math.round(y);
    this.waypoint = { x: wx, y: wy };
    this.chartVersion++;
    this.conn?.send({ t: 'waypoint', x: wx, y: wy });
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
  useSlot(slot: number): void {
    this.conn?.send({ t: 'use', slot });
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
    if (ground === Tile.Tilled) return { kind: 'plot', tx, ty };
    if (isCropTile(ground)) {
      return { kind: 'crop', tx, ty, mature: MATURE_TILES.has(ground) };
    }
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
    if (ground === Tile.BankChest) return { kind: 'bank', tx, ty };
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
    // Beds offer the home claim — the server arbitrates ownership.
    if (ground === Tile.Bed) return { kind: 'bed', tx, ty };
    if (ground === Tile.PortalDown || ground === Tile.PortalUp) return { kind: 'portal', tx, ty };
    return null;
  }

  /** The nearest interactable tile (or gatherable animal) in reach. */
  findNearbyTarget(): InteractTarget | null {
    if (this.ownEid === null) return null;
    const pos = this.predictor.pos;
    let best: { target: InteractTarget; d: number } | null = null;
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
      // A voice (dialogue tree or barks) offers Talk even on fightable
      // neutrals — the guard you COULD strike would rather chat.
      const verb = def?.produce
        ? 'Milk'
        : remote.meta.talk || remote.meta.friendly
          ? 'Talk'
          : null;
      if (!verb) continue;
      const latest = remote.buffer.latest();
      const x = latest?.x ?? remote.meta.x;
      const y = latest?.y ?? remote.meta.y;
      const dx = x - pos.x;
      const dy = y - pos.y;
      const d = dx * dx + dy * dy;
      if (d <= 2.2 * 2.2 && (!best || d < best.d)) {
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
    return best?.target ?? null;
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

  /** Plant a seed into a tilled plot. */
  plantSend(tx: number, ty: number, seed: string): void {
    this.conn?.send({ t: 'plant', tx, ty, seed });
  }

  /** Interact with a living NPC (talk to an actor, milk a cow). */
  interactNpc(eid: EntityId): void {
    this.conn?.send({ t: 'interactnpc', eid });
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

  /**
   * Fellows the wayfinder may point at: party members with a fresh
   * ticker position, self excluded. Entries older than two beats are
   * dropped — a stopped ticker must never leave ghosts on the chart.
   */
  partyFellowsPlaced(now = performance.now()): Array<{ name: string; x: number; y: number }> {
    if (this.partyPos.size === 0) return [];
    const out: Array<{ name: string; x: number; y: number }> = [];
    for (const [name, p] of this.partyPos) {
      if (name === this.ownName) continue;
      if (now - p.at > 5000) continue;
      out.push({ name, x: p.x, y: p.y });
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

  invMove(from: number, to: number): void {
    if (from === to) return;
    // Optimistic swap — the server echoes the authoritative pack.
    const inv = this.inventory;
    const tmp = inv[from] ?? null;
    inv[from] = inv[to] ?? null;
    inv[to] = tmp;
    this.conn?.send({ t: 'invmove', from, to });
  }

  /** Drop a pack slot onto the ground where you stand. */
  dropSend(slot: number, qty: number): void {
    this.conn?.send({ t: 'dropitem', slot, qty });
  }

  /** Turn the dungeon key in this pack slot — only heard at a riftgate. */
  useKeySend(slot: number): void {
    this.conn?.send({ t: 'usekey', slot });
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

  buildSend(buildable: string, tx: number, ty: number, orient?: BuildOrient): void {
    this.conn?.send({ t: 'build', buildable, tx, ty, orient });
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
    const offset = snapTime - performance.now();
    // CLOCK DISCIPLINE. The offset estimate IS the remote timeline —
    // any wobble here is rubber-banding for every entity at once. Three
    // regimes: fast convergence while young; slew-limited micro-steps
    // (≤1ms per snapshot ≈ 20ms/s) in steady state so one delayed
    // burst can never warp time; and a sustained-jump snap (tab sleep,
    // route change) once the deviation holds for a full second.
    if (this.clockOffset === null) {
      this.clockOffset = offset;
      this.clockSamples = 1;
      this.jitterEwma = 0;
      this.bigDevRun = 0;
    } else {
      const dev = offset - this.clockOffset;
      // Arrival jitter feeds the adaptive interp delay.
      this.jitterEwma += (Math.abs(dev) - this.jitterEwma) * 0.05;
      if (Math.abs(dev) > 300) {
        if (++this.bigDevRun >= 20) {
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
        this.ownPose = e.pose;
        this.ownStatus = e.status;
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
    const frameDt = Math.min(250, now - this.lastUpdate);
    this.lastUpdate = now;

    if (this.ownEid === null || !this.conn?.isOpen) return;

    // Self-reveal: the same disc the server marks, cleared here with
    // zero latency (the deterministic-reveal law).
    if (now - this.lastRevealAt >= CLIENT_REVEAL_MS) {
      this.lastRevealAt = now;
      const pos = this.predictor.pos;
      const mask = pos.y >= DUNGEON_MIN_Y ? this.dungeonExplored : this.explored;
      if (mask.markDisc(pos.x, pos.y).length > 0) this.chartVersion++;
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
      this.trackOwnCasts(frame);
      // viewMs (v8): report the live interp delay so melee lag comp
      // rewinds by what this screen is ACTUALLY showing.
      this.conn.send({ t: 'input', frame, viewMs: Math.round(this.interpDelayMs) });
      this.predictor.applyInput(frame);
      this.trackOwnDraw(frame, now);
      this.trackOwnStaff(frame);
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
    // Handoffs whose entity left before the blend finished.
    if (this.projHandoffs.size > 0) {
      for (const [eid, h] of this.projHandoffs) {
        if (!this.entities.has(eid) || (h.capturedAt > 0 && nowMs - h.capturedAt > 500)) {
          this.projHandoffs.delete(eid);
        }
      }
    }
  }
}
