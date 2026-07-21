import {
  CHUNK_SIZE,
  ChunkStore,
  DRAW_FULL_TICKS,
  DRAW_MIN_TICKS,
  INTERP_DELAY_MS,
  InputButton,
  hasButton,
  PLAYER_SPEED,
  PROTOCOL_VERSION,
  SNEAK_DETECTED_BIT,
  SNEAK_HIDDEN_BIT,
  TICK_MS,
  clockHours,
  Tile,
  findPath,
  stationAtTile,
  type ChunkData,
  type EntityId,
  type EntityMeta,
  type EquipSlot,
  type BuffInfo,
  type InputFrame,
  type InvSlot,
  type ItemRoll,
  type EquippedItem,
  type S2CFx,
  type S2CMessage,
  type SkillXp,
  type Snapshot,
  type StationType,
  type TilePatch,
  type Vec2,
} from '@devcraft/shared';
import { MATURE_TILES, NODES_BY_TILE, isCropTile, abilityDef, itemDef, npcDef } from '@devcraft/content';
import { EntityKind } from '@devcraft/shared';
import type { AbilityDef, AbilitySlot, Look } from '@devcraft/shared';

export type InteractTarget =
  | { kind: 'node'; tx: number; ty: number }
  | { kind: 'station'; tx: number; ty: number; station: StationType }
  | { kind: 'bank'; tx: number; ty: number }
  | { kind: 'shop'; tx: number; ty: number }
  | { kind: 'portal'; tx: number; ty: number }
  | { kind: 'plot'; tx: number; ty: number }
  | { kind: 'crop'; tx: number; ty: number; mature: boolean }
  | { kind: 'npc'; tx: number; ty: number; eid: EntityId; verb: string }
  | { kind: 'loot'; tx: number; ty: number; eid: EntityId };
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
}

export class ClientGame {
  /** World tiles streamed from the server; also the collision source. */
  readonly world = new ChunkStore();
  /** Bumped whenever chunk data changes so the renderer can re-bake. */
  worldVersion = 0;
  readonly entities = new Map<EntityId, RemoteEntity>();
  readonly predictor = new Predictor(this.world, PLAYER_SPEED);

  ownEid: EntityId | null = null;
  ownName = '';
  /** Chosen base look; null until creation completes. */
  ownLook: Look | null = null;
  aim = 0;
  rttMs = 0;
  serverTick = 0;
  /** World-clock offset in ticks (dev /time); see sim/daylight. */
  timeOfs = 0;

  inventory: InvSlot[] = [];
  skills: SkillXp = {};
  equipment: Partial<Record<string, EquippedItem>> = {};
  /** Cosmetic idle weapon-carry preference (server-confirmed). */
  carryStyle: 'normal' | 'rogue' = 'normal';
  /** Off-fist grip preference — each hand carries its own way. */
  carryOff: 'normal' | 'rogue' = 'normal';
  /** Running gather action, for the progress bar. */
  action: { startedAt: number; durationMs: number } | null = null;
  /** Damage numbers floating up; pruned by the renderer. */
  readonly floaties: Floaty[] = [];
  /**
   * Projectiles that just ended flight (hit, expired, or left view) —
   * consumed by the renderer for impact bursts and stuck arrows.
   */
  readonly projectileEnds: Array<{ x: number; y: number; dir: number; style: string }> = [];
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
  }> = [];
  /** Combat effects in flight; pruned by the renderer. */
  readonly fx: ActiveFx[] = [];

  /** Hotbar state: performance.now() when each slot comes off cooldown. */
  readonly abilityReadyAt: [number, number, number, number] = [0, 0, 0, 0];
  /** Full cooldowns in ticks (0 = nothing equipped in that slot). */
  abilityMax: [number, number, number, number] = [0, 0, 0, 0];
  /** Chosen technique ability per combat style (server-confirmed). */
  techniques: Record<string, string> = {};
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
        // Daggers reach the sneak ladder via techStyle — mirror the server.
        const w = this.equippedWeaponDef();
        const chosen = this.techniques[w?.techStyle ?? w?.style ?? 'melee'];
        return chosen ? (abilityDef(chosen) ?? null) : null;
      }
      case 3: {
        const sigil = itemDef(this.equipment.sigil?.id ?? '');
        return sigil?.sigil ? (abilityDef(sigil.sigil) ?? null) : null;
      }
    }
  }

  /** Choose a technique for a style (server validates the unlock). */
  sendTechnique(style: string, ability: string): void {
    this.conn?.send({ t: 'technique', style, ability });
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
    if (heldMs >= DRAW_MIN_TICKS * TICK_MS) {
      this.drawReadyAt = now + weapon.cooldownTicks * TICK_MS;
      this.onLoose?.(charge, this.aim);
    } else {
      // Snap shot — instant hip-fire, quick recovery, rapid-tap rhythm.
      this.drawReadyAt = now + 6 * TICK_MS;
      this.onLoose?.(0, this.aim);
    }
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

  sendRegister(user: string, pass: string, name: string): void {
    this.conn?.send({ t: 'register', user, pass, name });
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

  private handleMessage(msg: S2CMessage): void {
    switch (msg.t) {
      case 'welcome': {
        this.ownEid = msg.eid;
        this.ownName = msg.name;
        this.ownLook = msg.look ?? null;
        this.token = msg.token;
        this.serverTick = msg.tick;
        this.entities.clear();
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
      case 'action': {
        if (msg.state === 'start') {
          this.action = { startedAt: performance.now(), durationMs: (msg.ticks ?? 0) * TICK_MS };
        } else {
          this.action = null;
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
            text: String(msg.dmg),
            color: crit
              ? '#ffd24a'
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
        this.techniques = msg.chosen;
        this.onTechniques?.();
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
      case 'fx': {
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

  /** Send an interact intent for a specific world tile. */
  interact(tx: number, ty: number): void {
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
    if (ground === Tile.BankChest) return { kind: 'bank', tx, ty };
    if (ground === Tile.ShopCounter) return { kind: 'shop', tx, ty };
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
    // Livestock: a cow in milking range beats a further-away tile.
    for (const [eid, remote] of this.entities) {
      if (remote.meta.kind !== EntityKind.Npc) continue;
      const def = npcDef(remote.meta.defId ?? '');
      if (!def?.produce) continue;
      const latest = remote.buffer.latest();
      const x = latest?.x ?? remote.meta.x;
      const y = latest?.y ?? remote.meta.y;
      const dx = x - pos.x;
      const dy = y - pos.y;
      const d = dx * dx + dy * dy;
      if (d <= 2.2 * 2.2 && (!best || d < best.d)) {
        best = {
          target: { kind: 'npc', tx: Math.floor(x), ty: Math.floor(y), eid, verb: 'Milk' },
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

  /** Interact with a living NPC (milk a cow). */
  interactNpc(eid: EntityId): void {
    this.conn?.send({ t: 'interactnpc', eid });
  }

  bankSend(op: 'deposit' | 'withdraw', item: string, qty: number, slot?: number, gearId?: number): void {
    this.conn?.send({ t: 'bank', op, item, qty, slot, gearId });
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

  /** Confirm character creation (optimistic — the server locks it). */
  setLookSend(look: Look): void {
    if (this.ownLook) return; // locked — the server would refuse anyway
    this.ownLook = look;
    this.conn?.send({ t: 'setlook', look });
  }

  shopSend(op: 'buy' | 'sell', item: string, qty: number, slot?: number): void {
    this.conn?.send({ t: 'shop', op, item, qty, slot });
  }

  buildSend(buildable: string, tx: number, ty: number): void {
    this.conn?.send({ t: 'build', buildable, tx, ty });
  }

  demolishSend(tx: number, ty: number): void {
    this.conn?.send({ t: 'demolish', tx, ty });
  }

  private handleSnapshot(snap: Snapshot): void {
    this.serverTick = snap.serverTick;
    const snapTime = snap.serverTick * TICK_MS;
    const offset = snapTime - performance.now();
    this.clockOffset =
      this.clockOffset === null ? offset : this.clockOffset + (offset - this.clockOffset) * 0.1;

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

  /** Server-timeline timestamp remote entities should be rendered at. */
  renderTime(): number {
    if (this.clockOffset === null) return 0;
    return performance.now() + this.clockOffset - INTERP_DELAY_MS;
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
      this.conn.send({ t: 'input', frame });
      this.predictor.applyInput(frame);
      this.trackOwnDraw(frame, now);
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
  }
}
