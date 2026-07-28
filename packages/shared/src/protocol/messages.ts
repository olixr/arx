import { EQUIP_SLOTS } from '../entities.js';
import type { CarryStyle, EntityId, EntityMeta, EquipSlot, GripHand } from '../entities.js';
import { sanitizeLook, type Look } from '../look.js';
import type { ItemRoll } from '../rarity.js';
import type { InputFrame } from '../sim/input.js';
import type { SkillId, SkillXp } from '../skills.js';

/**
 * One inventory slot on the wire; null = empty. `roll` is the instance
 * identity of rolled gear — stats derive from it, they never travel.
 */
export type InvSlot = { item: string; qty: number; roll?: ItemRoll } | null;

/** A worn item: id + the instance roll its stats derive from. */
export interface EquippedItem {
  id: string;
  roll?: ItemRoll;
}

/**
 * JSON control-plane messages (WebSocket text frames).
 * High-frequency state travels as binary frames — see snapshot.ts.
 *
 * Every message is { t: <type>, ...payload }. The C2S side is validated
 * on the server (never trust the client); S2C is trusted by the client.
 */

// ---------------------------------------------------------------- C2S

export interface C2SHello {
  t: 'hello';
  /** PROTOCOL_VERSION — mismatches are rejected cleanly. */
  v: number;
  /** Guest display name (dev/bot flow; server may disallow). */
  name?: string;
  /** Session token for resume/reconnect. */
  token?: string;
}

export interface C2SLogin {
  t: 'login';
  user: string;
  pass: string;
}

export interface C2SRegister {
  t: 'register';
  user: string;
  pass: string;
  /** Character display name. */
  name: string;
}

export interface C2SInput {
  t: 'input';
  frame: InputFrame;
  /**
   * The client's CURRENT adaptive interpolation delay, ms — how far in
   * the past it is rendering remote entities. Feeds exact melee lag
   * compensation (v8). Optional: absent reads as the server default.
   */
  viewMs?: number;
}

export interface C2SChat {
  t: 'chat';
  text: string;
}

export interface C2SPing {
  t: 'ping';
  /** Client timestamp, echoed back verbatim. */
  ct: number;
}

/** Interact with a world tile (chop/mine/fish/...). */
export interface C2SInteract {
  t: 'interact';
  tx: number;
  ty: number;
}

/** Equip the item in an inventory slot (or eat it, if food). */
export interface C2SUseItem {
  t: 'use';
  slot: number;
}

/** Unequip a worn slot back to the inventory. */
export interface C2SUnequip {
  t: 'unequip';
  slot: EquipSlot;
}

/** Reorder the pack: swap the contents of two inventory slots. */
export interface C2SInvMove {
  t: 'invmove';
  from: number;
  to: number;
}

/**
 * Drop an inventory slot onto the ground where you stand. The item
 * becomes a world drop anyone may take; it decays after a few minutes.
 */
export interface C2SDropItem {
  t: 'dropitem';
  slot: number;
  qty: number;
}

/** Craft a recipe (validated against station adjacency server-side). */
export interface C2SCraft {
  t: 'craft';
  recipe: string;
  qty: number;
}

export interface C2SBank {
  t: 'bank';
  op: 'deposit' | 'withdraw';
  item: string;
  qty: number;
  /**
   * Deposit: exact pack slot — REQUIRED when that slot holds rolled
   * gear, so the right instance leaves the pack (id-addressed removal
   * would grab the first same-id item and lose a roll).
   */
  slot?: number;
  /** Withdraw: bank_gear row id for a stored gear instance. */
  gearId?: number;
}

export interface C2SShop {
  t: 'shop';
  op: 'buy' | 'sell';
  item: string;
  qty: number;
  /** Sell: exact pack slot, for the same instance-addressing reason. */
  slot?: number;
  /**
   * Which shop's shelf (default 'general_store'). Trainer shops hang
   * off actors — the server checks the named trainer is within reach.
   */
  shop?: string;
}

/** Place a buildable on a world tile. */
export interface C2SBuild {
  t: 'build';
  buildable: string;
  tx: number;
  ty: number;
}

/** Tear down one of your own constructions. */
export interface C2SDemolish {
  t: 'demolish';
  tx: number;
  ty: number;
}

/** Plant a seed into a tilled garden plot. */
export interface C2SPlant {
  t: 'plant';
  tx: number;
  ty: number;
  /** Seed item id from the player's pack. */
  seed: string;
}

/**
 * Turn a dungeon key at a Riftgate: the pack slot names WHICH key
 * (instance-addressing law — the roll in that slot is the dungeon).
 * Only valid while standing at a riftgate portal.
 */
export interface C2SUseKey {
  t: 'usekey';
  slot: number;
}

/** Interact with a living NPC (talk to an actor, milk a cow, ...). */
export interface C2SInteractNpc {
  t: 'interactnpc';
  eid: EntityId;
}

/**
 * Dialogue intents. The server owns the whole walk — the client never
 * sees node ids or conditions, it only answers the beat it was shown:
 * advance a linear line, pick a choice by the index it was sent, or
 * excuse itself early. Anything out of step is silently ignored.
 */
export interface C2SDialogueAdvance {
  t: 'dlgadv';
}

export interface C2SDialogueChoose {
  t: 'dlgchoice';
  /** Index into the choices of the last dlgnode. */
  idx: number;
}

/** Leave the conversation early (Esc / walking off). */
export interface C2SDialogueEnd {
  t: 'dlgend';
}

/**
 * Take a specific ground drop — the chosen-target pickup (click a
 * bag, pick a row in the loot panel), as opposed to the walk-over
 * vacuum which the server runs on its own.
 */
export interface C2SPickup {
  t: 'pickup';
  eid: EntityId;
}

/** Choose the equipped Technique for a combat style (free respec). */
export interface C2STechnique {
  t: 'technique';
  style: string;
  ability: string;
}

/** Choose the character's base look — accepted once, then locked. */
export interface C2SSetLook {
  t: 'setlook';
  look: Look;
}

/** Set the cosmetic weapon-grip style (standard vs rogue), per hand. */
export interface C2SCarryStyle {
  t: 'carrystyle';
  style: CarryStyle;
  /** Which fist to set; absent = main hand. */
  hand?: GripHand;
}

/** Ask for the full social snapshot (friends + pending requests). */
export interface C2SSocial {
  t: 'social';
}

/** Search characters by name prefix. */
export interface C2SFriendSearch {
  t: 'friendsearch';
  query: string;
}

/** Send a friend request (by character name). */
export interface C2SFriendRequest {
  t: 'friendrequest';
  name: string;
}

/** Accept a pending incoming friend request. */
export interface C2SFriendAccept {
  t: 'friendaccept';
  name: string;
}

/**
 * Decline an incoming request — or cancel your own outgoing one.
 * Unambiguous because mutual requests auto-accept, so between two
 * characters at most one direction is ever pending.
 */
export interface C2SFriendDecline {
  t: 'frienddecline';
  name: string;
}

/** Remove an existing friend (severs both sides). */
export interface C2SFriendRemove {
  t: 'friendremove';
  name: string;
}

/**
 * Rewrite the words on a sign you raised. The server is the judge of
 * ownership and of length — it re-sanitizes through the shared law and
 * echoes the stored result back, so the board can never hold anything
 * the client merely claimed.
 */
export interface C2SSignEdit {
  t: 'signedit';
  tx: number;
  ty: number;
  title: string;
  lines: string[];
}

/**
 * Set or clear the character's ONE active waypoint. Both coordinates
 * absent = clear. The server stores it verbatim (integers, clamped by
 * the validator) — it is pure navigation state, never gameplay truth.
 */
export interface C2SWaypoint {
  t: 'waypoint';
  x?: number;
  y?: number;
}

export type C2SMessage =
  | C2SHello
  | C2SLogin
  | C2SRegister
  | C2SInput
  | C2SChat
  | C2SPing
  | C2SInteract
  | C2SUseItem
  | C2SUnequip
  | C2SInvMove
  | C2SDropItem
  | C2SCraft
  | C2SBank
  | C2SShop
  | C2SBuild
  | C2SDemolish
  | C2SPlant
  | C2SInteractNpc
  | C2SPickup
  | C2STechnique
  | C2SSetLook
  | C2SCarryStyle
  | C2SUseKey
  | C2SDialogueAdvance
  | C2SDialogueChoose
  | C2SDialogueEnd
  | C2SSocial
  | C2SFriendSearch
  | C2SFriendRequest
  | C2SFriendAccept
  | C2SFriendDecline
  | C2SFriendRemove
  | C2SSignEdit
  | C2SWaypoint;

// ---------------------------------------------------------------- S2C

export interface S2CWelcome {
  t: 'welcome';
  /** The entity id of this client's player. */
  eid: EntityId;
  name: string;
  tick: number;
  /** Session token for graceful reconnect. */
  token: string;
  motd?: string;
  /** The character's chosen look; absent = not chosen yet (show creator). */
  look?: Look;
  /**
   * The world seed. Procgen is shared truth — with it the client can
   * evaluate the same danger field the server spawns by (map tint,
   * music mood) without any extra protocol.
   */
  seed?: number;
  /**
   * Runtime haven anchors as [x, y, safeR] triples — the waystations
   * standing in the world's ledger right now. The client merges them
   * with the settled anchors it already knows from content, so its
   * danger reads stay in lockstep with the server's.
   */
  havens?: number[][];
  /**
   * Settled anchors as [x, y, safeR, haven] quads — the LIVE hearth
   * list. The geography is editable data now, so the client must not
   * trust its bundled copy: absent (old server) it falls back to the
   * content constants, present it replaces them wholesale.
   */
  anchors?: number[][];
  /** The character's stored active waypoint, if one is set. */
  waypoint?: { x: number; y: number };
  /**
   * The live geography plan (a GeographyDef snapshot — typed loosely
   * here because shared cannot import content). The plan is editable
   * data, so the map must not chart the bundled copy: the client feeds
   * this to replaceGeography before its first terrain bake.
   */
  geo?: unknown;
}

/** The haven list changed (a waystation stood up or turned fallow). */
export interface S2CHavens {
  t: 'havens';
  /** [x, y, safeR] triples — replaces the whole list. */
  list: number[][];
  /** Settled-anchor quads [x, y, safeR, haven] — present when the plan itself changed. */
  settled?: number[][];
}

export interface S2CReject {
  t: 'reject';
  reason: string;
}

/** Sent after hello when no valid session token was presented. */
export interface S2CAuthRequired {
  t: 'authRequired';
}

export interface S2CAuthErr {
  t: 'authErr';
  reason: string;
}

/** Entities entered this client's interest set — full metadata. */
export interface S2CEnter {
  t: 'enter';
  entities: EntityMeta[];
}

/** Entities left this client's interest set. */
export interface S2CLeave {
  t: 'leave';
  eids: EntityId[];
}

export interface S2CChat {
  t: 'chat';
  channel: 'local' | 'system';
  from?: string;
  eid?: EntityId;
  text: string;
}

export interface S2CPong {
  t: 'pong';
  ct: number;
  tick: number;
}

/** Full inventory state (small; sent on any change). */
export interface S2CInventory {
  t: 'inv';
  slots: InvSlot[];
}

/** Full skill XP map (on login). */
export interface S2CSkills {
  t: 'skills';
  xp: SkillXp;
}

/**
 * The recipes this character KNOWS beyond the core set (on login and
 * after each learn). Core recipes are never listed — everyone knows
 * them; the client unions this with the core set from content.
 */
export interface S2CRecipes {
  t: 'recipes';
  known: string[];
}

/**
 * A trainer opened their wares (interacting with an actor that
 * carries a shop). The client renders the named shop's shelf from
 * content; purchases echo the shop id back for proximity checks.
 */
export interface S2CShopOpen {
  t: 'shopopen';
  shop: string;
}

/** One skill gained XP. */
export interface S2CXp {
  t: 'xp';
  skill: SkillId;
  xp: number;
  gained: number;
  level: number;
  levelledUp: boolean;
}

/** A timed action (gathering) started or stopped for this player. */
export interface S2CAction {
  t: 'action';
  state: 'start' | 'stop';
  /** Duration in ticks (start only). */
  ticks?: number;
  /** Why it stopped: done / cancelled / failed reason. */
  reason?: string;
}

/** This player's worn equipment changed. */
export interface S2CEquipment {
  t: 'equip';
  equipment: Partial<Record<EquipSlot, EquippedItem>>;
  /** Cosmetic idle carry preference; absent = standard. */
  carry?: CarryStyle;
  /** Off-hand grip preference; absent = standard. */
  carryOff?: CarryStyle;
}

/** Something took damage (for floaties/flashes). */
export interface S2CHit {
  t: 'hit';
  eid: EntityId;
  dmg: number;
  /** Critical hit — bigger everything client-side. */
  crit?: boolean;
  /** Normalized knock direction — drives directional impact sparks. */
  kx?: number;
  ky?: number;
  /** Backstab — struck from stealth or from behind while sneaking. */
  bs?: boolean;
  /**
   * The blow was warded by an invulnerable actor — dmg is 0 and the
   * client says "Immune" instead of painting a zero.
   */
  im?: boolean;
}

/** An NPC died (killed by someone) — drives the death effect. */
export interface S2CDeath {
  t: 'death';
  eid: EntityId;
  x: number;
  y: number;
  defId: string;
}

/** Metadata changed for entities already in interest (appearance etc). */
export interface S2CUpdate {
  t: 'update';
  entities: EntityMeta[];
}

/** Bank contents (sent on open + every change). */
export interface S2CBank {
  t: 'bank';
  items: Record<string, number>;
  /**
   * Rolled gear instances, stored per-row (they can never stack).
   * Withdraw addresses these by their stable row id.
   */
  gear?: Array<{ id: number; item: string; roll: ItemRoll }>;
}

/**
 * Own-player ability cooldowns, remaining ticks per slot. Sent on every
 * change event (cast, on-hit haste, equip swap); the client counts down
 * between messages so the hotbar radial stays smooth.
 */
export interface S2CCooldowns {
  t: 'cooldowns';
  /** [art, relic, technique, sigil] remaining ticks. */
  cd: [number, number, number, number];
  /** [art, relic, technique, sigil] full durations, for the radials. */
  max: [number, number, number, number];
}

/**
 * A combat effect the client should render — one generic event for
 * ability shapes, ground telegraphs, and status reactions so the wire
 * vocabulary stays small while the VFX vocabulary grows freely.
 */
export interface S2CFx {
  t: 'fx';
  kind:
    | 'nova'
    | 'telegraph'
    | 'blast'
    | 'reaction'
    | 'summon'
    | 'vanish'
    /** A melee crescent swung at `dir`, reaching `radius` tiles. */
    | 'arc'
    /** A dash streak from (x,y) to (x2,y2). */
    | 'dash'
    /** One chain-lightning hop from (x,y) to (x2,y2). */
    | 'bolt'
    /** An instant ray from (x,y) to (x2,y2). */
    | 'beam'
    /** A self-buff flourish rising off the caster. */
    | 'buff'
    /** A lingering hazard zone living `ticks` at (x,y). */
    | 'field'
    /** A locked door refusing at (x,y) — the leaf shudders in its frame. */
    | 'rattle'
    /**
     * A destructible prop taking a hit at (x,y). `dir` is the impact
     * heading (away from the smasher — debris flies WITH the blow),
     * `id` the DestructibleKind so the client picks its break-up kit
     * without waiting on any tile patch. `radius` is the fraction of
     * durability REMAINING after the blow: 0 = the burst (a tile
     * patch to the floor follows), >0 = a crack — the prop shudders
     * and spits chips but stands.
     */
    | 'smash';
  x: number;
  y: number;
  radius: number;
  /** telegraph: ticks until detonation; summon/field: lifetime. */
  ticks?: number;
  color?: string;
  /** reaction: floaty name, e.g. "Thermal Shock". */
  text?: string;
  /**
   * Ability id that fired this — the client keys its bespoke layered
   * visual identity off it (unknown/absent ids get a color fallback).
   */
  id?: string;
  /** arc: aim angle in radians. */
  dir?: number;
  /** dash/bolt/beam: segment endpoint. */
  x2?: number;
  y2?: number;
}

/**
 * World-clock offset in ticks (see sim/daylight). Sent on join and
 * whenever a dev `/time` command bends the clock; the client derives
 * the whole sky from (interpolated tick + ofs).
 */
export interface S2CTime {
  t: 'time';
  ofs: number;
}

/** The player's chosen techniques per style (sent on join + change). */
export interface S2CTechniques {
  t: 'techniques';
  chosen: Record<string, string>;
}

/** One active consumable buff, for the HUD chip row. */
export interface BuffInfo {
  /** Item id that granted it (drives the chip icon). */
  id: string;
  /** Display name, e.g. "Sugar Rush". */
  name: string;
  /** 'tonic' | 'food' — one active buff per channel. */
  channel: string;
  secsLeft: number;
}

/** The player's active consumable buffs (sent on gain + expiry). */
export interface S2CBuffs {
  t: 'buffs';
  buffs: BuffInfo[];
}

/**
 * The Riftgate answered an interact: show the key panel. The client
 * reads key details from its own inventory (slots carry rolls); this
 * message just opens the gate's side of the conversation.
 */
export interface S2CRiftgate {
  t: 'riftgate';
  /** Pack slot indexes currently holding dungeon keys. */
  keySlots: number[];
}

/**
 * A conversation began: raise the cinematic frame around this entity.
 * Node beats follow as dlgnode messages; dlgclose tears it down.
 */
export interface S2CDialogueOpen {
  t: 'dlgopen';
  /** The conversation partner — the camera frames you both. */
  eid: EntityId;
  name: string;
  title?: string;
}

/** One beat of conversation — everything the client may know. */
export interface S2CDialogueNode {
  t: 'dlgnode';
  speaker: 'npc' | 'player';
  text: string;
  /** Present = the beat is a question; answer with dlgchoice. */
  choices?: string[];
  /** Terminal beat — the next advance closes instead of continuing. */
  last?: boolean;
  /**
   * Items granted as this beat lands — the cinema stages the moment
   * (icon chip, chime). Ids + counts only; the pack update travels on
   * its own inv message as always.
   */
  gifts?: Array<{ item: string; qty: number }>;
}

/** The conversation is over (finished, excused, or interrupted). */
export interface S2CDialogueClose {
  t: 'dlgclose';
}

/** Crossed into a dungeon: everything the entry banner needs. */
export interface S2CDungeonEnter {
  t: 'dungeon';
  name: string;
  sigil: string;
  tier: string;
  theme: string;
  power: number;
}

/** One friend on the social snapshot. */
export interface SocialFriend {
  name: string;
  online: boolean;
  /** Where they stand right now — only present while online. */
  zone?: string;
}

/** The full social snapshot, sent on request. */
export interface S2CSocial {
  t: 'social';
  friends: SocialFriend[];
  /** Names with a pending request TO you. */
  incoming: string[];
  /** Names you have asked and who haven't answered. */
  outgoing: string[];
}

export interface S2CFriendSearch {
  t: 'friendsearch';
  results: Array<{ name: string; online: boolean }>;
}

/** A thin push: something social happened involving `name`. */
export interface S2CFriendEvent {
  t: 'friendevent';
  kind: 'request' | 'accepted' | 'declined' | 'removed' | 'online' | 'offline';
  name: string;
}

/**
 * What a sign says. Pushed as chunks stream in (the words arrive with
 * the board, so the approach plaque never waits on a round-trip) and
 * again whenever one is written, raised, or torn down. `gone` marks a
 * board that no longer exists; `mine` is the edit right, decided by
 * the server and never inferred client-side.
 */
export interface SignInfo {
  tx: number;
  ty: number;
  title: string;
  lines: string[];
  /** True when this client's character may rewrite it. */
  mine?: boolean;
  /** Who raised it — absent on authored (world) signage. */
  by?: string;
  /** The board is gone: drop any record held for this tile. */
  gone?: boolean;
}

export interface S2CSigns {
  t: 'signs';
  signs: SignInfo[];
}

/**
 * Fog-of-war snapshot regions as [rx, ry, base64-bits] rows. Pushed in
 * batches at bind time; after that the chart never travels — client and
 * server both run the shared deterministic reveal (world/explored.ts).
 */
export interface S2CExplored {
  t: 'explored';
  regions: [number, number, string][];
}

/**
 * One entry in a character's place ledger. `id` is the permanent key:
 * 'zone:<zoneId>' for authored places, 'poi:<cx>,<cy>' for frontier
 * sites, 'dungeon:<x>,<y>' for riftgates the character has delved.
 * name/x/y are denormalized on purpose — when the frontier turns over,
 * the ledger row keeps the place's name even after the world forgets.
 */
export interface DiscoveryWire {
  id: string;
  kind: 'town' | 'poi' | 'dungeon' | 'landmark';
  name: string;
  x: number;
  y: number;
  tier?: number;
  /** The world rerolled this site — the marker reads as rumor now. */
  faded?: boolean;
}

/** The full ledger, pushed once at bind. */
export interface S2CDiscoveries {
  t: 'discoveries';
  list: DiscoveryWire[];
}

/** A LIVE first-ever discovery — the only trigger for the splash. */
export interface S2CDiscovery {
  t: 'discovery';
  d: DiscoveryWire;
}

/** The frontier turned over: these ledger ids age to rumor. */
export interface S2CDiscoveryFade {
  t: 'discoveryfade';
  ids: string[];
}

export type S2CMessage =
  | S2CWelcome
  | S2CReject
  | S2CAuthRequired
  | S2CAuthErr
  | S2CEnter
  | S2CLeave
  | S2CChat
  | S2CPong
  | S2CInventory
  | S2CSkills
  | S2CRecipes
  | S2CShopOpen
  | S2CXp
  | S2CAction
  | S2CEquipment
  | S2CHit
  | S2CDeath
  | S2CUpdate
  | S2CBank
  | S2CCooldowns
  | S2CFx
  | S2CTime
  | S2CTechniques
  | S2CBuffs
  | S2CRiftgate
  | S2CDungeonEnter
  | S2CSigns
  | S2CDialogueOpen
  | S2CDialogueNode
  | S2CDialogueClose
  | S2CHavens
  | S2CSocial
  | S2CFriendSearch
  | S2CFriendEvent
  | S2CExplored
  | S2CDiscoveries
  | S2CDiscovery
  | S2CDiscoveryFade;

// ------------------------------------------------------- validation

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Parse + structurally validate a client message. Returns null for
 * anything malformed — the caller decides whether to drop or disconnect.
 */
export function parseC2S(raw: string): C2SMessage | null {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(msg) || typeof msg.t !== 'string') return null;

  switch (msg.t) {
    case 'hello': {
      if (!isFiniteNum(msg.v)) return null;
      if (msg.name !== undefined && typeof msg.name !== 'string') return null;
      if (msg.token !== undefined && typeof msg.token !== 'string') return null;
      return { t: 'hello', v: msg.v, name: msg.name, token: msg.token };
    }
    case 'login': {
      if (typeof msg.user !== 'string' || typeof msg.pass !== 'string') return null;
      if (msg.user.length > 64 || msg.pass.length > 128) return null;
      return { t: 'login', user: msg.user, pass: msg.pass };
    }
    case 'register': {
      if (
        typeof msg.user !== 'string' ||
        typeof msg.pass !== 'string' ||
        typeof msg.name !== 'string'
      ) {
        return null;
      }
      if (msg.user.length > 64 || msg.pass.length > 128 || msg.name.length > 32) return null;
      return { t: 'register', user: msg.user, pass: msg.pass, name: msg.name };
    }
    case 'input': {
      const f = msg.frame;
      if (
        !isObj(f) ||
        !isFiniteNum(f.seq) ||
        !isFiniteNum(f.mx) ||
        !isFiniteNum(f.my) ||
        !isFiniteNum(f.aim) ||
        !isFiniteNum(f.buttons)
      ) {
        return null;
      }
      const out: C2SInput = {
        t: 'input',
        frame: { seq: f.seq, mx: f.mx, my: f.my, aim: f.aim, buttons: f.buttons },
      };
      // Optional view-delay report; clamped here so the game code
      // never sees a hostile value.
      if (isFiniteNum(msg.viewMs)) out.viewMs = Math.max(0, Math.min(400, msg.viewMs));
      return out;
    }
    case 'chat': {
      if (typeof msg.text !== 'string') return null;
      return { t: 'chat', text: msg.text };
    }
    case 'ping': {
      if (!isFiniteNum(msg.ct)) return null;
      return { t: 'ping', ct: msg.ct };
    }
    case 'interact': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      return { t: 'interact', tx: msg.tx, ty: msg.ty };
    }
    case 'signedit': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      if (typeof msg.title !== 'string' || !Array.isArray(msg.lines)) return null;
      // Bound the payload here; the shared sanitizer trims the content
      // itself once the handler has an owner to trust.
      if (msg.title.length > 200 || msg.lines.length > 16) return null;
      const lines: string[] = [];
      for (const line of msg.lines) {
        if (typeof line !== 'string' || line.length > 200) return null;
        lines.push(line);
      }
      return { t: 'signedit', tx: msg.tx, ty: msg.ty, title: msg.title, lines };
    }
    case 'waypoint': {
      const hasX = msg.x !== undefined;
      const hasY = msg.y !== undefined;
      if (hasX !== hasY) return null; // set needs both, clear needs neither
      if (!hasX) return { t: 'waypoint' };
      if (!isFiniteNum(msg.x) || !isFiniteNum(msg.y)) return null;
      if (!Number.isInteger(msg.x) || !Number.isInteger(msg.y)) return null;
      if (Math.abs(msg.x) > 1_000_000 || Math.abs(msg.y) > 1_000_000) return null;
      return { t: 'waypoint', x: msg.x, y: msg.y };
    }
    case 'use': {
      if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
      if (msg.slot < 0 || msg.slot >= 64) return null;
      return { t: 'use', slot: msg.slot };
    }
    case 'unequip': {
      if (typeof msg.slot !== 'string') return null;
      const slot = msg.slot as EquipSlot;
      if (!EQUIP_SLOTS.includes(slot)) return null;
      return { t: 'unequip', slot };
    }
    case 'invmove': {
      if (!isFiniteNum(msg.from) || !Number.isInteger(msg.from)) return null;
      if (!isFiniteNum(msg.to) || !Number.isInteger(msg.to)) return null;
      if (msg.from < 0 || msg.from >= 64 || msg.to < 0 || msg.to >= 64) return null;
      if (msg.from === msg.to) return null;
      return { t: 'invmove', from: msg.from, to: msg.to };
    }
    case 'dropitem': {
      if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
      if (msg.slot < 0 || msg.slot >= 64) return null;
      if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty)) return null;
      if (msg.qty < 1 || msg.qty > 100000) return null;
      return { t: 'dropitem', slot: msg.slot, qty: msg.qty };
    }
    case 'craft': {
      if (typeof msg.recipe !== 'string' || msg.recipe.length > 64) return null;
      if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty)) return null;
      if (msg.qty < 1 || msg.qty > 1000) return null;
      return { t: 'craft', recipe: msg.recipe, qty: msg.qty };
    }
    case 'bank': {
      if (msg.op !== 'deposit' && msg.op !== 'withdraw') return null;
      if (typeof msg.item !== 'string' || msg.item.length > 64) return null;
      if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty) || msg.qty < 1 || msg.qty > 100000) {
        return null;
      }
      if (msg.slot !== undefined) {
        if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
        if (msg.slot < 0 || msg.slot >= 64) return null;
      }
      if (msg.gearId !== undefined) {
        if (!isFiniteNum(msg.gearId) || !Number.isInteger(msg.gearId) || msg.gearId < 0) return null;
      }
      return { t: 'bank', op: msg.op, item: msg.item, qty: msg.qty, slot: msg.slot, gearId: msg.gearId };
    }
    case 'shop': {
      if (msg.op !== 'buy' && msg.op !== 'sell') return null;
      if (typeof msg.item !== 'string' || msg.item.length > 64) return null;
      if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty) || msg.qty < 1 || msg.qty > 1000) {
        return null;
      }
      if (msg.slot !== undefined) {
        if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
        if (msg.slot < 0 || msg.slot >= 64) return null;
      }
      if (msg.shop !== undefined && (typeof msg.shop !== 'string' || msg.shop.length > 48)) {
        return null;
      }
      return { t: 'shop', op: msg.op, item: msg.item, qty: msg.qty, slot: msg.slot, shop: msg.shop };
    }
    case 'build': {
      if (typeof msg.buildable !== 'string' || msg.buildable.length > 64) return null;
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      return { t: 'build', buildable: msg.buildable, tx: msg.tx, ty: msg.ty };
    }
    case 'demolish': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      return { t: 'demolish', tx: msg.tx, ty: msg.ty };
    }
    case 'plant': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      if (typeof msg.seed !== 'string' || msg.seed.length > 64) return null;
      return { t: 'plant', tx: msg.tx, ty: msg.ty, seed: msg.seed };
    }
    case 'interactnpc': {
      if (!isFiniteNum(msg.eid) || !Number.isInteger(msg.eid) || msg.eid < 0) return null;
      return { t: 'interactnpc', eid: msg.eid };
    }
    case 'dlgadv':
      return { t: 'dlgadv' };
    case 'dlgchoice': {
      if (!isFiniteNum(msg.idx) || !Number.isInteger(msg.idx) || msg.idx < 0 || msg.idx > 3) {
        return null;
      }
      return { t: 'dlgchoice', idx: msg.idx };
    }
    case 'dlgend':
      return { t: 'dlgend' };
    case 'usekey': {
      if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot) || msg.slot < 0 || msg.slot > 63) {
        return null;
      }
      return { t: 'usekey', slot: msg.slot };
    }
    case 'pickup': {
      if (!isFiniteNum(msg.eid) || !Number.isInteger(msg.eid) || msg.eid < 0) return null;
      return { t: 'pickup', eid: msg.eid };
    }
    case 'technique': {
      if (typeof msg.style !== 'string' || msg.style.length > 16) return null;
      if (typeof msg.ability !== 'string' || msg.ability.length > 64) return null;
      return { t: 'technique', style: msg.style, ability: msg.ability };
    }
    case 'setlook': {
      const look = sanitizeLook(msg.look);
      if (!look) return null;
      return { t: 'setlook', look };
    }
    case 'carrystyle': {
      if (msg.style !== 'normal' && msg.style !== 'rogue') return null;
      if (msg.hand !== undefined && msg.hand !== 'main' && msg.hand !== 'off') return null;
      return { t: 'carrystyle', style: msg.style, hand: msg.hand };
    }
    case 'social':
      return { t: 'social' };
    case 'friendsearch': {
      if (typeof msg.query !== 'string' || msg.query.length > 24) return null;
      return { t: 'friendsearch', query: msg.query };
    }
    case 'friendrequest': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'friendrequest', name: msg.name };
    }
    case 'friendaccept': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'friendaccept', name: msg.name };
    }
    case 'frienddecline': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'frienddecline', name: msg.name };
    }
    case 'friendremove': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'friendremove', name: msg.name };
    }
    default:
      return null;
  }
}
