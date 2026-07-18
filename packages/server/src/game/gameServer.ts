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
  levelForXp,
  stepMovement,
  xpForLevel,
  type EntityId,
  type EntityMeta,
  type InputFrame,
  type InvSlot,
  type SkillId,
  type SkillXp,
  type SnapshotEntity,
  Tile,
} from '@devcraft/shared';
import {
  BUILDABLES,
  BUILDABLE_GROUND,
  GENERAL_STORE,
  NODES_BY_TILE,
  NPCS,
  RECIPES,
  STARTER_KIT,
  TOWN_SPAWNS,
  abilityDef,
  itemDef,
  techniqueDef,
  type BuildableDef,
  type NodeDef,
  type NpcDef,
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
  BURN_TICK_EVERY,
  BLEED_TICK_EVERY,
  CHILL_SPEED_FACTOR,
  COMBAT_STYLES,
  HEAVY_BOLT_KNOCKBACK,
  HEAVY_BOLT_MULT,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  InputButton,
  SHOCK_MAX_TICKS,
  SLOT_ART,
  SLOT_RELIC,
  SLOT_SIGIL,
  SLOT_TECHNIQUE,
  SNAP_GRACE_TICKS,
  SNAP_RECOVERY_TICKS,
  STATION_TILES,
  STATUS_BIT,
  applyDodge,
  chargedShot,
  circleHitsSolid,
  drawCharge,
  hasButton,
  hasteOnHit,
  isDrawSlowed,
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
import { delveOrigin, generateDelve } from '../world/dungeonGen.js';
import { addItem, bestTool, countItem, emptyInventory, hasSpaceFor, removeItem } from './inventory.js';

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

type PlayerAction = GatherAction | CraftAction | BuildAction;

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
}

interface DropComp {
  item: string;
  qty: number;
  /** Only this player may pick it up until ownerUntil. */
  ownerEid: EntityId | null;
  ownerUntil: number;
  despawnAt: number;
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
}

interface SpawnState {
  npc: string;
  x: number;
  y: number;
  radius: number;
  eid: EntityId | null;
  respawnAt: number;
  /** Inactive spawn points are skipped (torn-down delve instances). */
  active: boolean;
}

interface DelveInstance {
  zoneId: string;
  spawnIndexes: number[];
  slot: number;
  entry: { x: number; y: number };
}

interface PlayerComp {
  name: string;
  speed: number;
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
  equipment: Partial<Record<EquipSlot, string>>;
  attackCooldown: number;
  lastCombatAt: number;
  poseUntilTick: number;
  lastDodgeSeq: number;
  /** Ticks the bow has been drawn; 0 = not drawing. */
  drawTicks: number;
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
}

/** A timed self-effect; multiple can ride at once (speeds multiply). */
interface PlayerBuff {
  speedMult: number;
  shieldHp: number;
  meleeLifesteal: number;
  untilTick: number;
}

const MAX_QUEUED_INPUTS = 8;
const MAX_INPUTS_PER_TICK = 2;
const SAVE_INTERVAL_TICKS = 600; // 30s

/** Damage roll with a 10% crit chance (guaranteed heavy hit). */
function rollDamage(maxHit: number): { dmg: number; crit: boolean } {
  if (Math.random() < 0.1) {
    return { dmg: maxHit + Math.ceil(maxHit * 0.5), crit: true };
  }
  return { dmg: Math.floor(Math.random() * (maxHit + 1)), crit: false };
}

/**
 * Basic-attack roll: a landed basic ALWAYS chips at least 1. At
 * hack-and-slash cadence a stream of zero-rolls reads as broken, and
 * reliable chips are what make on-hit haste a rhythm you can trust.
 */
function rollBasic(maxHit: number): { dmg: number; crit: boolean } {
  const roll = rollDamage(maxHit);
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
  readonly drops = this.ecs.register<DropComp>();
  readonly projectiles = this.ecs.register<ProjectileComp>();
  readonly statuses = this.ecs.register<ServerStatus[]>();
  readonly summons = this.ecs.register<SummonComp>();

  /** Telegraphed blasts (ground AoEs) waiting to detonate. */
  private readonly pendingBlasts: PendingBlast[] = [];

  private readonly spawnPoints: SpawnState[] = [];

  private readonly sessions = new Set<Session>();
  /** In-world players by character id (blocks duplicate logins). */
  private readonly characterEids = new Map<number, EntityId>();
  /** Ephemeral guest tokens -> eid (guests have no DB session). */
  private readonly guestTokens = new Map<string, EntityId>();
  private nextGuestId = -1;

  /** chunkKey -> entities inside; the interest-management index. */
  private readonly chunks = new Map<string, Set<EntityId>>();
  private readonly entityChunk = new Map<EntityId, string>();

  /** Depleted nodes waiting to come back. */
  private readonly respawnQueue: Array<{ at: number; tx: number; ty: number; tile: Tile }> = [];

  private timer: NodeJS.Timeout | null = null;

  /** Active per-character delve instances. */
  private readonly delves = new Map<number, DelveInstance>();
  private nextDelveSlot = 0;

  constructor(
    private readonly world: WorldSource,
    private readonly accounts: AccountStore,
  ) {
    this.registerSpawns(TOWN_SPAWNS);
  }

  /** Expand spawn tables into scattered points; returns their indexes. */
  registerSpawns(
    spawns: ReadonlyArray<{ npc: string; x: number; y: number; radius: number; count: number }>,
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
        });
      }
    }
    return indexes;
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
    let equipment: Partial<Record<EquipSlot, string>> = {};
    if (character.id > 0) {
      skills = this.accounts.loadSkills(character.id) as SkillXp;
      inventory = this.accounts.loadInventory(character.id, 28);
      equipment = this.accounts.loadEquipment(character.id) as Partial<Record<EquipSlot, string>>;
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
    const maxHp = levelForXp(skills.vitality ?? 0);

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
    this.players.set(eid, {
      name: character.name,
      speed: PLAYER_SPEED,
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
      attackCooldown: 0,
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
    });
    session.sendJson({ t: 'skills', xp: player.skills });
    session.sendJson({ t: 'inv', slots: player.inventory });
    session.sendJson({ t: 'equip', equipment: player.equipment });
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
    this.savePlayer(eid);
    console.log(`[game] ${player.name} disconnected, grace ${RECONNECT_GRACE_MS}ms`);
  }

  private despawnPlayer(eid: EntityId): void {
    const player = this.players.get(eid);
    if (!player) return;
    // A logged-out delver's instance dies with them; pull them out first
    // so they don't reload inside sealed rock.
    const delve = this.delves.get(player.characterId);
    if (delve) {
      const pos = this.positions.must(eid);
      if (pos.y >= 8192) {
        const spawn = this.world.spawn;
        pos.x = spawn.x;
        pos.y = spawn.y;
      }
      this.teardownDelve(player.characterId);
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

  queueInput(eid: EntityId, frame: InputFrame): void {
    const player = this.players.get(eid);
    if (!player) return;
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

    // Portals teleport (and may spin up a personal delve).
    if (ground === Tile.PortalDown || ground === Tile.PortalUp) {
      const portal = this.world.portalAt(tx, ty);
      if (!portal) return;
      if (portal.delve) {
        this.enterDelve(eid, player, { x: pos.x, y: pos.y });
      } else if (portal.dest) {
        this.teleport(eid, portal.dest.x, portal.dest.y);
        // Using a delve's exit (the portal lives at y>=8192) tears it down.
        if (ty >= 8192) this.teardownDelve(player.characterId);
      }
      return;
    }

    // The bank chest opens the vault (accounts only).
    if (ground === Tile.BankChest) {
      if (player.bank === null) {
        sys('Guests cannot use the bank — make an account!');
        return;
      }
      player.session.sendJson({ t: 'bank', items: player.bank });
      return;
    }

    const node = ground === undefined ? undefined : NODES_BY_TILE.get(ground as Tile);
    if (!node) return;

    const level = levelForXp(player.skills[node.skill] ?? 0);
    if (level < node.levelReq) {
      sys(`You need ${node.skill} level ${node.levelReq} for this ${node.name.toLowerCase()}.`);
      return;
    }
    // The tool belt counts: an equipped tool works alongside anything
    // still carried in the pack (best of the two wins).
    let tool = node.tool ? bestTool(player.inventory, node.tool) : { item: '', power: 1 };
    if (node.tool && player.equipment.tool) {
      const worn = itemDef(player.equipment.tool)?.tool;
      if (worn && worn.type === node.tool && (!tool || worn.power >= tool.power)) {
        tool = { item: player.equipment.tool, power: worn.power };
      }
    }
    if (!tool) {
      sys(`You need a ${node.tool} to work this ${node.name.toLowerCase()}.`);
      return;
    }
    if (!hasSpaceFor(player.inventory, node.yieldItem)) {
      sys('Your pack is full.');
      return;
    }

    // Faster with better tools and higher levels.
    const speedup = 1 + (tool.power - 1) * 0.25 + (level - node.levelReq) * 0.01;
    const ticks = Math.max(20, Math.round(node.baseTicks / speedup));
    player.action = { kind: 'gather', tx, ty, node, ticksLeft: ticks };
    this.poses.set(eid, PoseState.Gather);
    player.session.sendJson({ t: 'action', state: 'start', ticks });
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
    player.session?.sendJson({ t: 'inv', slots: player.inventory });

    if (node.depletedTile !== null && Math.random() < node.depleteChance) {
      this.setWorldTile(action.tx, action.ty, node.depletedTile);
      this.respawnQueue.push({
        at: Date.now() + node.respawnSec * 1000,
        tx: action.tx,
        ty: action.ty,
        tile: node.tile,
      });
      this.cancelAction(eid, player, 'done');
    } else {
      // Keep gathering the same node.
      action.ticksLeft = Math.max(20, node.baseTicks);
      player.session?.sendJson({ t: 'action', state: 'start', ticks: action.ticksLeft });
    }
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
    const level = levelForXp(player.skills[recipe.skill] ?? 0);
    if (level < recipe.levelReq) {
      sys(`You need ${recipe.skill} level ${recipe.levelReq} to make that.`);
      return;
    }
    if (recipe.station && !this.nearTile(eid, STATION_TILES[recipe.station])) {
      sys(`You need to stand by a ${recipe.station} for that.`);
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

    const level = levelForXp(player.skills[recipe.skill] ?? 0);
    const burnChance = recipe.burnChance
      ? Math.max(0, recipe.burnChance - (level - recipe.levelReq) * 0.015)
      : 0;
    if (burnChance > 0 && Math.random() < burnChance) {
      addItem(player.inventory, recipe.burnResult ?? 'burnt_food', 1);
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'You burn it. Ah well.' });
    } else {
      addItem(player.inventory, recipe.output.item, recipe.output.qty);
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

    const level = levelForXp(player.skills.construction ?? 0);
    if (level < def.levelReq) {
      sys(`You need construction level ${def.levelReq} for a ${def.name.toLowerCase()}.`);
      return;
    }
    this.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    const ground = this.world.groundAt(tx, ty);
    if (ground === undefined || !BUILDABLE_GROUND.includes(ground as Tile)) {
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
    if (ground === undefined || !BUILDABLE_GROUND.includes(ground as Tile)) {
      this.cancelAction(eid, player, 'blocked');
      return;
    }
    if (!def.materials.every((m) => countItem(player.inventory, m.item) >= m.qty)) {
      this.cancelAction(eid, player, 'materials');
      return;
    }
    for (const m of def.materials) removeItem(player.inventory, m.item, m.qty);

    this.world.registerBuilt(action.tx, action.ty, def.tile, player.characterId);
    this.accounts.saveBuiltTile(action.tx, action.ty, def.tile, player.characterId);
    this.setWorldTile(action.tx, action.ty, def.tile);
    this.grantXp(eid, player, 'construction', def.xp);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    this.cancelAction(eid, player, 'done');
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

    this.world.unregisterBuilt(tx, ty);
    this.accounts.deleteBuiltTile(tx, ty);
    this.setWorldTile(tx, ty, Tile.Grass);
  }

  // ------------------------------------------------------ bank & shop

  bankOp(eid: EntityId, op: 'deposit' | 'withdraw', item: string, qty: number): void {
    const player = this.players.get(eid);
    if (!player || player.session === null || player.bank === null) return;
    if (!this.nearTile(eid, Tile.BankChest)) return;
    if (!itemDef(item)) return;

    if (op === 'deposit') {
      const removed = removeItem(player.inventory, item, qty);
      if (removed > 0) {
        player.bank[item] = (player.bank[item] ?? 0) + removed;
        player.bankDirty = true;
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
    player.session.sendJson({ t: 'bank', items: player.bank });
  }

  shopOp(eid: EntityId, op: 'buy' | 'sell', item: string, qty: number): void {
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
      const added = addItem(player.inventory, item, affordable);
      if (added < affordable) {
        // Pack filled up — refund what didn't fit.
        addItem(player.inventory, 'coins', (affordable - added) * entry.price);
        sys('Your pack is full.');
      }
    } else {
      if (item === 'coins') return;
      const sold = removeItem(player.inventory, item, qty);
      if (sold === 0) return;
      addItem(player.inventory, 'coins', sold * Math.max(1, Math.floor(def.value / 2)));
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
        health.maxHp = levelAfter;
      }
    }
  }

  /** Mutate the world and stream the patch to everyone nearby. */
  private setWorldTile(tx: number, ty: number, tile: Tile): void {
    this.world.setGround(tx, ty, tile);
    const key = chunkKey(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    const patch = encodeTilePatch({ tx, ty, ground: tile });
    for (const s of this.sessions) {
      if (s.knownChunks.has(key)) s.sendBinary(patch);
    }
  }

  // --------------------------------------------------- portals & delves

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

  private enterDelve(eid: EntityId, player: PlayerComp, returnTo: { x: number; y: number }): void {
    let delve = this.delves.get(player.characterId);
    if (!delve) {
      const slot = this.nextDelveSlot++;
      const origin = delveOrigin(slot);
      const seed = (Date.now() ^ (player.characterId * 7919) ^ slot) >>> 0;
      const result = generateDelve(seed, origin, returnTo);
      this.world.addZone(result.zone);
      const spawnIndexes = this.registerSpawns(result.zone.spawns ?? []);
      delve = { zoneId: result.zone.id, spawnIndexes, slot, entry: result.entry };
      this.delves.set(player.characterId, delve);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'You descend into your own delve. Slay the champion — or flee through the portal.',
      });
    }
    this.teleport(eid, delve.entry.x, delve.entry.y);
  }

  private teardownDelve(characterId: number): void {
    const delve = this.delves.get(characterId);
    if (!delve) return;
    for (const idx of delve.spawnIndexes) {
      const spawn = this.spawnPoints[idx];
      if (!spawn) continue;
      spawn.active = false;
      if (spawn.eid !== null && this.npcs.has(spawn.eid)) {
        this.removeFromChunks(spawn.eid);
        this.ecs.destroy(spawn.eid);
        spawn.eid = null;
      }
    }
    this.world.removeZone(delve.zoneId);
    this.delves.delete(characterId);
  }

  // ------------------------------------------------------- equipment

  /** Equip or eat the item in an inventory slot. */
  useItem(eid: EntityId, slotIndex: number): void {
    const player = this.players.get(eid);
    if (!player || slotIndex >= player.inventory.length) return;
    const slot = player.inventory[slotIndex];
    if (!slot) return;
    const def = itemDef(slot.item);
    if (!def) return;

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
      const worn = player.equipment[def.equipSlot];
      // Take the item out first so a swap can't overflow the pack.
      removeItem(player.inventory, slot.item, 1);
      if (worn) addItem(player.inventory, worn, 1);
      player.equipment[def.equipSlot] = slot.item;
      this.onEquipmentChanged(eid, player);
    }
  }

  unequip(eid: EntityId, slot: EquipSlot): void {
    const player = this.players.get(eid);
    if (!player) return;
    const worn = player.equipment[slot];
    if (!worn) return;
    if (!hasSpaceFor(player.inventory, worn)) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'Your pack is full.' });
      return;
    }
    addItem(player.inventory, worn, 1);
    delete player.equipment[slot];
    this.onEquipmentChanged(eid, player);
  }

  private onEquipmentChanged(eid: EntityId, player: PlayerComp): void {
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    player.session?.sendJson({ t: 'equip', equipment: player.equipment });
    // A new weapon or relic means new abilities on the hotbar.
    this.sendCooldowns(player);
    // Appearance changed — update everyone who can see this player.
    const meta = this.buildMeta(eid);
    for (const s of this.sessions) {
      if (s.playerEid === eid || s.knownEntities.has(eid)) {
        s.sendJson({ t: 'update', entities: [meta] });
      }
    }
  }

  // ----------------------------------------------------------- combat

  private equippedWeapon(player: PlayerComp) {
    const id = player.equipment.weapon;
    if (!id) return null;
    const def = itemDef(id);
    return def?.weapon ? { id, weapon: def.weapon } : null;
  }

  private tryPlayerAttack(eid: EntityId, player: PlayerComp, aim: number): void {
    if (player.attackCooldown > 0) return;
    const equipped = this.equippedWeapon(player);
    if (process.env.COMBAT_DEBUG) {
      console.log(`[combat] attack eid=${eid} weapon=${equipped?.id ?? 'none'} style=${equipped?.weapon.style ?? '-'}`);
    }
    if (!equipped) return;
    const { weapon } = equipped;

    player.attackCooldown = weapon.cooldownTicks;
    player.lastCombatAt = Date.now();

    const level = levelForXp(player.skills[weapon.style] ?? 0);
    const maxHit = Math.max(1, Math.round(weapon.damage * (1 + level * 0.05)));

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
      );
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

  private meleeSwing(
    eid: EntityId,
    player: PlayerComp,
    aim: number,
    range: number,
    maxHit: number,
    knockbackMult = 1,
    sweepAll = false,
  ): void {
    const pos = this.positions.must(eid);
    let bestTarget: EntityId | null = null;
    let bestDist = Infinity;
    const inArc: EntityId[] = [];
    for (const [npcEid, npc] of this.npcs) {
      const npos = this.positions.get(npcEid);
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
        const { dmg, crit } = rollBasic(maxHit);
        this.damageNpc(npcEid, dmg, eid, 'melee', { crit, knockbackMult, basic: true });
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
      const { dmg, crit } = rollBasic(maxHit);
      this.damageNpc(bestTarget, dmg, eid, 'melee', { crit, knockbackMult, basic: true });
    }
  }

  // --------------------------------------------------------- abilities

  /** The combat style of the equipped weapon (bare fists count melee). */
  private currentStyle(player: PlayerComp): CombatStyleId {
    return (this.equippedWeapon(player)?.weapon.style ?? 'melee') as CombatStyleId;
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
        const relicItem = itemDef(player.equipment.relic ?? '');
        return relicItem?.relic ? (abilityDef(relicItem.relic) ?? null) : null;
      }
      case SLOT_TECHNIQUE: {
        const chosen = player.techniques[this.currentStyle(player)];
        return chosen ? (abilityDef(chosen) ?? null) : null;
      }
      case SLOT_SIGIL: {
        const sigilItem = itemDef(player.equipment.sigil ?? '');
        return sigilItem?.sigil ? (abilityDef(sigilItem.sigil) ?? null) : null;
      }
    }
  }

  private sendCooldowns(player: PlayerComp): void {
    if (!player.session) return;
    const max = [0, 0, 0, 0] as [number, number, number, number];
    for (let slot = 0; slot < ABILITY_SLOTS; slot++) {
      max[slot] = this.slotAbility(player, slot as AbilitySlot)?.cooldownTicks ?? 0;
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
      const p = itemDef(worn ?? '')?.passive;
      if (p) out.push(p);
    }
    return out;
  }

  private hasPassive(player: PlayerComp, id: PassiveId): boolean {
    for (const worn of Object.values(player.equipment)) {
      if (itemDef(worn ?? '')?.passive === id) return true;
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

    player.abilityCd[slot] = ab.cooldownTicks;
    player.castFreezeUntilTick = this.tickCount + (ab.castFreezeTicks ?? 0);
    player.lastCombatAt = Date.now();
    player.drawTicks = 0; // casting lets the bowstring down
    if (player.action) this.cancelAction(eid, player, 'cast');
    this.setPose(eid, PoseState.Art, Math.max(6, (ab.castFreezeTicks ?? 0) + 4));

    const style = this.currentStyle(player);
    const level = levelForXp(player.skills[style] ?? 0);
    this.castAbility(eid, ab, aim, style, level, false);
    this.sendCooldowns(player);
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
  ): void {
    const pos = this.positions.must(casterEid);
    const maxHit = ab.damage > 0 ? Math.max(1, Math.round(ab.damage * (1 + level * 0.05))) : 0;
    const knockbackMult = ab.knockback ?? 1;

    switch (ab.shape) {
      case 'melee_arc': {
        const arc = ab.arc ?? Math.PI / 3;
        const range = ab.range ?? 2;
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
          const { dmg, crit } = rollDamage(maxHit);
          this.damageNpc(npcEid, dmg, casterEid, style, {
            crit,
            knockbackMult,
            status: ab.status,
          });
        }
        break;
      }

      case 'nova': {
        const radius = ab.radius ?? 2;
        this.broadcastFx({ t: 'fx', kind: 'nova', x: pos.x, y: pos.y, radius, color: ab.color });
        if (fromNpc) {
          this.blastPlayers(pos.x, pos.y, radius, maxHit, ab.status);
        } else {
          for (const [npcEid, npc] of this.npcs) {
            const npos = this.positions.get(npcEid);
            if (!npos) continue;
            const dx = npos.x - pos.x;
            const dy = npos.y - pos.y;
            if (Math.hypot(dx, dy) - npc.def.radius > radius) continue;
            const { dmg, crit } = rollDamage(maxHit);
            this.damageNpc(npcEid, dmg, casterEid, style, {
              crit,
              knockbackMult,
              status: ab.status,
            });
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
            const { dmg, crit } = rollDamage(maxHit);
            this.damageNpc(npcEid, dmg, casterEid, style, {
              crit,
              knockbackMult,
              status: ab.status,
            });
          }
        }
        this.updateChunkMembership(casterEid);
        // Tumble Shot: the arrow flies at what you rolled away from.
        if (ab.projectiles && maxHit > 0) {
          const proj = this.ecs.create();
          this.kinds.set(proj, EntityKind.Projectile);
          this.positions.set(proj, { x: pos.x, y: pos.y, dir: aim });
          this.projectiles.set(proj, {
            ownerEid: casterEid,
            style: style === 'magic' ? 'magic' : 'archery',
            maxHit,
            dirX: Math.cos(aim),
            dirY: Math.sin(aim),
            speed: ab.projectileSpeed ?? 14,
            distLeft: ab.range ?? 6,
            status: ab.status,
            fromNpc,
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
          this.broadcastFx({
            t: 'fx',
            kind: 'reaction',
            x: (from.x + tpos.x) / 2,
            y: (from.y + tpos.y) / 2,
            radius: Math.hypot(tpos.x - from.x, tpos.y - from.y),
            color: ab.color,
          });
          from = { x: tpos.x, y: tpos.y };
          const { dmg, crit } = rollDamage(maxHit);
          this.damageNpc(best, dmg, casterEid, style, { crit, status: ab.status });
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
          });
        }
        break;
      }

      case 'projectile_fan': {
        const count = ab.projectiles ?? 1;
        const spread = ab.spreadArc ?? 0;
        for (let i = 0; i < count; i++) {
          const angle = count === 1 ? aim : aim - spread / 2 + (spread * i) / (count - 1);
          const proj = this.ecs.create();
          this.kinds.set(proj, EntityKind.Projectile);
          this.positions.set(proj, { x: pos.x, y: pos.y, dir: angle });
          this.projectiles.set(proj, {
            ownerEid: casterEid,
            style: style === 'magic' ? 'magic' : 'archery',
            maxHit,
            dirX: Math.cos(angle),
            dirY: Math.sin(angle),
            speed: ab.projectileSpeed ?? 14,
            distLeft: ab.range ?? 7,
            status: ab.status,
            pierce: ab.pierce,
            fromNpc,
          });
          this.updateChunkMembership(proj);
        }
        break;
      }

      case 'ground_aoe': {
        // Aim-assisted placement: snap to the nearest enemy in the aim
        // cone so gamepad and touch don't need pixel-perfect targeting.
        let bx: number;
        let by: number;
        if (targetPos) {
          bx = targetPos.x;
          by = targetPos.y;
        } else {
          const range = ab.range ?? 4;
          let best: { x: number; y: number } | null = null;
          let bestDist = Infinity;
          for (const [npcEid, npc] of this.npcs) {
            void npc;
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
          bx = best ? best.x : pos.x + Math.cos(aim) * range * 0.6;
          by = best ? best.y : pos.y + Math.sin(aim) * range * 0.6;
        }
        const fuse = ab.fuseTicks ?? 12;
        const radius = ab.radius ?? 1.5;
        this.pendingBlasts.push({
          x: bx,
          y: by,
          radius,
          damage: maxHit,
          knockback: knockbackMult,
          status: ab.status,
          fuseLeft: fuse,
          ownerEid: casterEid,
          style,
          fromNpc,
          color: ab.color,
        });
        this.broadcastFx({
          t: 'fx',
          kind: 'telegraph',
          x: bx,
          y: by,
          radius,
          ticks: fuse,
          color: ab.color,
        });
        break;
      }

      case 'self_buff': {
        const player = this.players.get(casterEid);
        const self = ab.self;
        if (!player || !self) break;
        if (self.heal) {
          const health = this.healths.must(casterEid);
          health.hp = Math.min(health.maxHp, health.hp + self.heal);
        }
        if (
          self.speedMult !== undefined ||
          self.shieldHp !== undefined ||
          self.meleeLifesteal !== undefined
        ) {
          player.buffs.push({
            speedMult: self.speedMult ?? 1,
            shieldHp: self.shieldHp ?? 0,
            meleeLifesteal: self.meleeLifesteal ?? 0,
            untilTick: this.tickCount + self.durationTicks,
          });
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
            // The fire finds new fuel.
            const burn: StatusApply =
              apply.status === 'burn'
                ? { status: 'burn', power: apply.power, durationTicks: apply.durationTicks }
                : { status: 'burn', power: other.power, durationTicks: 60 };
            for (const [otherEid, otherNpc] of this.npcs) {
              if (otherEid === npcEid) continue;
              const opos = this.positions.get(otherEid);
              if (!opos) continue;
              if (Math.hypot(opos.x - pos.x, opos.y - pos.y) - otherNpc.def.radius > reaction.radius) {
                continue;
              }
              this.applyStatusToNpc(otherEid, burn, sourceEid, style);
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
    const list = this.statuses.get(eid);
    if (!list || list.length === 0) return 0;
    let bits = 0;
    for (const s of list) bits |= STATUS_BIT[s.id];
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
        const dot = s.id === 'burn' || s.id === 'bleed';
        const every = s.id === 'burn' ? BURN_TICK_EVERY : BLEED_TICK_EVERY;
        if (dot && s.ticksLeft > 0 && s.ticksLeft % every === 0) {
          if (this.npcs.has(eid)) {
            this.dotNpc(eid, s.power, s.sourceEid, s.id as 'burn' | 'bleed');
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
  private dotNpc(npcEid: EntityId, dmg: number, sourceEid: EntityId, kind: 'burn' | 'bleed'): void {
    const npc = this.npcs.get(npcEid);
    const health = this.healths.get(npcEid);
    if (!npc || !health || dmg <= 0) return;
    this.broadcastHit(npcEid, dmg);
    health.hp -= dmg;
    const source = this.players.get(sourceEid);
    if (source) {
      const style: SkillId = kind === 'burn' ? 'magic' : 'melee';
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
                text: `+${sum.power}`,
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
          const level = owner ? levelForXp(owner.skills.melee ?? 0) : 1;
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
      this.broadcastFx({
        t: 'fx',
        kind: 'blast',
        x: blast.x,
        y: blast.y,
        radius: blast.radius,
        color: blast.color,
      });
      if (blast.fromNpc) {
        this.blastPlayers(blast.x, blast.y, blast.radius, blast.damage, blast.status);
      } else {
        for (const [npcEid, npc] of this.npcs) {
          const npos = this.positions.get(npcEid);
          if (!npos) continue;
          if (Math.hypot(npos.x - blast.x, npos.y - blast.y) - npc.def.radius > blast.radius) {
            continue;
          }
          const { dmg, crit } = rollDamage(blast.damage);
          this.damageNpc(npcEid, dmg, blast.ownerEid, blast.style, {
            crit,
            knockbackMult: blast.knockback,
            status: blast.status,
          });
        }
      }
    }
  }

  private tickProjectiles(): void {
    for (const [eid, proj] of this.projectiles) {
      const pos = this.positions.must(eid);
      const step = proj.speed * TICK_DT;
      pos.x += proj.dirX * step;
      pos.y += proj.dirY * step;
      proj.distLeft -= step;

      let dead = proj.distLeft <= 0 || this.world.isSolid(Math.floor(pos.x), Math.floor(pos.y));

      if (!dead && proj.fromNpc) {
        // NPC shots seek players (and straw decoys, which exist to eat them).
        for (const [playerEid, player] of this.players) {
          if (player.session === null && player.disconnectedAt !== null) continue;
          const ppos = this.positions.get(playerEid);
          if (!ppos) continue;
          const dx = ppos.x - pos.x;
          const dy = ppos.y - pos.y;
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
          const dy = npos.y - pos.y;
          if (dx * dx + dy * dy < (npc.def.radius + 0.25) ** 2) {
            const { dmg, crit } = proj.basic ? rollBasic(proj.maxHit) : rollDamage(proj.maxHit);
            this.damageNpc(npcEid, dmg, proj.ownerEid, proj.style, {
              crit,
              basic: proj.basic,
              fullDraw: proj.fullDraw,
              status: proj.status,
              knockbackMult: proj.heavy ? HEAVY_BOLT_KNOCKBACK : proj.fullDraw ? 1.4 : 1,
            });
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
    // The status may have detonated a reaction that already killed the
    // target (and cascaded further) — never strike a corpse.
    if (!this.ecs.isAlive(npcEid) || !this.npcs.has(npcEid)) return;

    // Knockback: shove the target away from the attacker (crits shove
    // harder), respecting collision. The direction also travels to
    // clients so impact sparks fly the way the blow landed.
    let kx = 0;
    let ky = 0;
    const apos = this.positions.get(attackerEid);
    const nposPre = this.positions.get(npcEid);
    if (apos && nposPre) {
      const kdx = nposPre.x - apos.x;
      const kdy = nposPre.y - apos.y;
      const kd = Math.hypot(kdx, kdy) || 1;
      kx = kdx / kd;
      ky = kdy / kd;
    }
    this.broadcastHit(npcEid, dmg, crit, kx, ky);
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
      // Bloodlust: melee wounds feed the wounder.
      if (style === 'melee') {
        let steal = 0;
        for (const b of attacker.buffs) steal = Math.max(steal, b.meleeLifesteal);
        if (steal > 0) {
          const ahealth = this.healths.get(attackerEid);
          if (ahealth && ahealth.hp < ahealth.maxHp) {
            ahealth.hp = Math.min(ahealth.maxHp, ahealth.hp + Math.max(1, Math.round(dmg * steal)));
          }
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
    }

    // Roll the loot table onto the ground.
    for (const entry of npc.def.loot) {
      if (Math.random() > entry.chance) continue;
      const qty = entry.qty[0] + Math.floor(Math.random() * (entry.qty[1] - entry.qty[0] + 1));
      const dropEid = this.ecs.create();
      const scatter = () => (Math.random() - 0.5) * 0.8;
      this.kinds.set(dropEid, EntityKind.ItemDrop);
      this.positions.set(dropEid, { x: pos.x + scatter(), y: pos.y + scatter(), dir: 0 });
      this.drops.set(dropEid, {
        item: entry.item,
        qty,
        ownerEid: killerEid,
        ownerUntil: Date.now() + 30_000,
        despawnAt: Date.now() + 90_000,
      });
      this.updateChunkMembership(dropEid);
    }

    const spawn = this.spawnPoints[npc.spawnIndex];
    if (spawn) {
      spawn.eid = null;
      spawn.respawnAt = Date.now() + NPCS.get(spawn.npc)!.respawnSec * 1000;
    }
    this.removeFromChunks(npcEid);
    this.ecs.destroy(npcEid);
  }

  private damagePlayer(
    eid: EntityId,
    raw: number,
    opts: { status?: StatusApply; pierceArmor?: boolean; sourceEid?: EntityId } = {},
  ): void {
    const player = this.players.get(eid);
    const health = this.healths.get(eid);
    if (!player || !health) return;

    const defLevel = levelForXp(player.skills.defence ?? 0);
    let armor = 0;
    for (const worn of Object.values(player.equipment)) {
      armor += itemDef(worn ?? '')?.armor ?? 0;
    }
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

  private broadcastHit(eid: EntityId, dmg: number, crit = false, kx = 0, ky = 0): void {
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
      const def = NPCS.get(spawn.npc);
      if (!def) continue;
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
        spawnIndex: i,
        poseUntilTick: 0,
        specialCooldown: 60, // never open with the special
      });
      spawn.eid = eid;
      this.updateChunkMembership(eid);
    }
  }

  /** Resolve an NPC's chase target: a live player or a straw decoy. */
  private npcTargetPos(targetEid: EntityId): { x: number; y: number } | null {
    const player = this.players.get(targetEid);
    if (player) {
      if (player.session === null && player.disconnectedAt !== null) return null;
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
      // Thorns: biting the buckler costs a point.
      if (this.hasPassive(player, 'thorns')) {
        this.damageNpc(npcEid, 1, targetEid, 'defence', {});
      }
    } else {
      this.damageSummon(targetEid, raw);
    }
  }

  private tickNpcs(): void {
    for (const [eid, npc] of this.npcs) {
      const pos = this.positions.must(eid);
      if (npc.attackCooldown > 0) npc.attackCooldown--;
      if (npc.specialCooldown > 0) npc.specialCooldown--;

      // Shock is a hard stagger: no thinking, no moving, no swinging.
      if (this.isShocked(eid)) {
        npc.windupTicks = 0;
        continue;
      }

      // Aggro scan (cheap: only when idle, every 5 ticks).
      if (npc.state === 'idle' && npc.def.aggroRange > 0 && (this.tickCount + eid) % 5 === 0) {
        for (const [playerEid, player] of this.players) {
          if (player.session === null && player.disconnectedAt !== null) continue;
          const ppos = this.positions.get(playerEid);
          if (!ppos) continue;
          const dx = ppos.x - pos.x;
          const dy = ppos.y - pos.y;
          if (dx * dx + dy * dy < npc.def.aggroRange ** 2) {
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
                // Wolves LEAP out of the crouch — a real gap-closer.
                if (npc.def.id === 'wolf' && dist > 0.6) {
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
  }

  // ------------------------------------------------------------- drops

  private tickDrops(now: number): void {
    for (const [eid, drop] of this.drops) {
      if (drop.despawnAt <= now) {
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
        continue;
      }
      const pos = this.positions.must(eid);
      for (const [playerEid, player] of this.players) {
        if (player.session === null) continue;
        if (drop.ownerEid !== null && drop.ownerEid !== playerEid && drop.ownerUntil > now) {
          continue;
        }
        const ppos = this.positions.get(playerEid);
        if (!ppos) continue;
        const dx = ppos.x - pos.x;
        const dy = ppos.y - pos.y;
        if (dx * dx + dy * dy > 0.55 * 0.55) continue;
        if (!hasSpaceFor(player.inventory, drop.item)) continue;
        addItem(player.inventory, drop.item, drop.qty);
        player.session.sendJson({ t: 'inv', slots: player.inventory });
        this.removeFromChunks(eid);
        this.ecs.destroy(eid);
        break;
      }
    }
  }

  /** Slow out-of-combat regen: 1 hp / 5s. */
  private tickRegen(now: number): void {
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
    // Dev-only utility commands, never broadcast.
    if (config.devCommands && text.startsWith('/tp ')) {
      const [, xRaw, yRaw] = text.split(/\s+/);
      const x = Number.parseFloat(xRaw ?? '');
      const y = Number.parseFloat(yRaw ?? '');
      if (Number.isFinite(x) && Number.isFinite(y)) this.teleport(eid, x, y);
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
    if (config.devCommands && text.startsWith('/give ')) {
      const [, item, qtyRaw] = text.split(/\s+/);
      const def = itemDef(item ?? '');
      const qty = Math.max(1, Math.min(1000, Number.parseInt(qtyRaw ?? '1', 10) || 1));
      if (def && hasSpaceFor(player.inventory, def.id)) {
        addItem(player.inventory, def.id, qty);
        player.session?.sendJson({ t: 'inv', slots: player.inventory });
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `Given: ${def.name} ×${qty}` });
      } else {
        player.session?.sendJson({ t: 'chat', channel: 'system', text: `Can't give '${item}'.` });
      }
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

    for (const [eid, player] of this.players) {
      if (player.session === null && player.disconnectedAt !== null) {
        if (now - player.disconnectedAt > RECONNECT_GRACE_MS) this.despawnPlayer(eid);
        continue;
      }
      this.processPlayerInputs(eid, player);
      if (player.action) this.tickAction(eid, player);
    }

    this.tickSpawns(now);
    this.tickNpcs();
    this.tickProjectiles();
    this.tickStatuses();
    this.tickSummons();
    this.tickBlasts();
    this.tickDrops(now);
    this.tickRegen(now);

    // Respawn depleted nodes.
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const entry = this.respawnQueue[i]!;
      if (entry.at <= now) {
        this.setWorldTile(entry.tx, entry.ty, entry.tile);
        this.respawnQueue.splice(i, 1);
      }
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
    for (let i = 0; i < ABILITY_SLOTS; i++) {
      if (player.abilityCd[i]! > 0) player.abilityCd[i]!--;
    }
    if (player.buffs.length > 0) {
      player.buffs = player.buffs.filter((b) => this.tickCount < b.untilTick);
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
      if (this.isChilled(eid)) speed *= CHILL_SPEED_FACTOR;
      if (casting) speed = 0; // committed to the cast
      const next = stepMovement(pos, frame, speed, TICK_DT, this.world);
      if (next.x !== pos.x || next.y !== pos.y) moved = true;
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
          player.buffs.push({
            speedMult: 1.35,
            shieldHp: 0,
            meleeLifesteal: 0,
            untilTick: this.tickCount + 30,
          });
        }
      }
      player.lastProcessedSeq = frame.seq;

      // A cast this frame (or one still resolving) holds the basic back.
      const stillCasting = this.tickCount < player.castFreezeUntilTick;
      const attackHeld = hasButton(frame.buttons, InputButton.Attack) && !stillCasting;
      if (style === 'archery') {
        this.tickBowDraw(eid, player, equipped!.weapon, attackHeld, frame.aim);
      } else if (attackHeld) {
        this.tryPlayerAttack(eid, player, frame.aim);
      }
      frames++;
    }
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
      this.poses.set(eid, moved ? PoseState.Walk : PoseState.Idle);
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

    const level = levelForXp(player.skills.archery ?? 0);
    const base = Math.max(1, Math.round(weapon.damage * (1 + level * 0.05)));
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
      meta.appearance = { bodyColor: '', equip: { ...player.equipment } };
    }
    const npc = this.npcs.get(eid);
    if (npc) {
      meta.name = npc.def.name;
      meta.defId = npc.def.id;
      meta.level = npc.def.level;
    }
    const drop = this.drops.get(eid);
    if (drop) meta.defId = drop.item;
    const proj = this.projectiles.get(eid);
    if (proj) meta.defId = proj.heavy ? `${proj.style}_heavy` : proj.style;
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
