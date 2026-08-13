import { EQUIP_SLOTS } from '../entities.js';
import { DYE_COUNT } from '../world/tiles.js';
import type { CarryStyle, EntityId, EntityMeta, EquipSlot, GripHand } from '../entities.js';
import { sanitizeLook, type Look } from '../look.js';
import type { ItemRoll } from '../rarity.js';
import type { InputFrame } from '../sim/input.js';
import type { SkillId, SkillXp } from '../skills.js';

/**
 * One inventory slot on the wire; null = empty. `roll` is the instance
 * identity of rolled gear — stats derive from it, they never travel.
 */
/**
 * One pack slot. `stolen` is the Phase-5 theft facet — per UNIT, so it
 * lives here beside the roll, never on ItemDef: a stolen loaf and an
 * honest loaf are different stacks. Coins never carry it (coin is coin).
 */
export type InvSlot = { item: string; qty: number; roll?: ItemRoll; stolen?: true } | null;

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
  /** Invite code — required by the server when registration is gated. */
  invite?: string;
}

/**
 * THE DOOR SWINGS BOTH WAYS: a deliberate sign-out. The server burns
 * the session row so the token can never resume, then hangs up.
 */
export interface C2SLogout {
  t: 'logout';
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
  /**
   * THE MEASURED STACK's hand-merge: true only on a deliberate drop of
   * one stack onto its own kind (mouse drag, pad carry-place) — the
   * server pours up to the cap instead of swapping. Absent on the tidy
   * sort's swap chains, which must stay pure permutations. Additive.
   */
  merge?: boolean;
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

/**
 * THE UNMAKING: take an inventory slot apart at an enchanting table for
 * its dust. Destructive and irreversible, so the server re-validates
 * everything the bench claimed and the client is expected to have
 * confirmed with the player first.
 */
export interface C2SUnmake {
  t: 'unmake';
  slot: number;
}

/**
 * SUNDERING: draw the working back out of a piece and keep the piece.
 * The way out of a bad RESONANCE pairing (see enchants.ts).
 */
export interface C2SSunder {
  t: 'sunder';
  /** Pack slot index. Ignored when `worn` is given. */
  slot: number;
  /**
   * Sunder the piece WORN in this slot instead. Bonding targets worn
   * gear, so sundering has to reach it too, or every school change
   * would mean unequipping first for no reason a player could name.
   */
  worn?: EquipSlot;
  /**
   * Which working to draw out of a DEEPENED piece. Absent reads as the
   * ward, which is what every undeepened piece has.
   */
  seat?: 'ward' | 'art';
}

/** Craft a recipe (validated against station adjacency server-side). */
export interface C2SCraft {
  t: 'craft';
  recipe: string;
  qty: number;
}

/** Set the tools down: stop the running craft batch, keeping what's made. */
export interface C2SCraftStop {
  t: 'craftstop';
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

/** The four masses a corner piece can hold — THE TRUE GHOST's dial. */
export type BuildOrient = 'NE' | 'NW' | 'SE' | 'SW';

/**
 * Place a buildable on a world tile. `orient` is the player's chosen
 * mass for an orientable corner piece; absent = the classic
 * neighbour-reading auto-orient. The server validates it against the
 * piece's own family and never lets one def place another's tile.
 */
export interface C2SBuild {
  t: 'build';
  buildable: string;
  tx: number;
  ty: number;
  orient?: BuildOrient;
  /**
   * THE DYE LAW's dial: the chosen dye index (0..DYE_COUNT-1) for a
   * dyeable piece. Absent = dye 0 (linen). The server enum-validates
   * and silently drops it on pieces that take no dye — a stale client
   * can't tint a bed.
   */
  dye?: number;
}

/** Tear down one of your own constructions. */
export interface C2SDemolish {
  t: 'demolish';
  tx: number;
  ty: number;
}

/**
 * Ask for the ledger of your own built tiles — THE OWN-WORK OVERLAY's
 * source. The client requests it entering build mode and after each
 * completed build/demolish; the answer is the whole set (small in
 * practice, and always correct beats always clever).
 */
export interface C2SOwnBuilt {
  t: 'ownbuilt';
}

/** Every "tx,ty" key the asking character owns a built tile at. */
export interface S2COwnBuilt {
  t: 'ownbuilt';
  keys: string[];
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
 * THE LIVING SOIL (farming v2 Phase 1) — the tending verbs. Each acts
 * on a PLANTED crop row (the one-ledger law: care facts live on the
 * crop, never on bare ground) and consumes its material from the pack.
 */
export interface C2SFertilize {
  t: 'fertilize';
  tx: number;
  ty: number;
}

/** Lay plant fibre around a growing crop's base. */
export interface C2SMulch {
  t: 'mulch';
  tx: number;
  ty: number;
}

/**
 * THE FULL FIELD: cut a recurring crop's deadwood mid-cycle. Costs
 * nothing, pays tending XP, and counts one care point toward the
 * cycle's grade — once per cycle behind its own bit.
 */
export interface C2SPrune {
  t: 'prune';
  tx: number;
  ty: number;
}

/**
 * Feed one pack slot's item into a compost bin. Slot-addressed (the
 * instance-addressing law); the server re-proves the bin tile, the
 * item's compostable worth, and the bin's idle state at the door.
 */
export interface C2SCompostAdd {
  t: 'compostadd';
  tx: number;
  ty: number;
  slot: number;
}

/**
 * THE ONE CARE MIRROR: every fact a field shows lives here. Sent whole
 * at login and as deltas on change; `remove` clears rows the world no
 * longer holds (harvest, demolish, collect). Additive message — the
 * protocol version does not move (the C2SStable judgment).
 */
export interface FarmPlotInfo {
  tx: number;
  ty: number;
  /** Watered bitmask, bit per stage (1<<stage) — the crop row's own. */
  w: number;
  /** Soil tier 0 plain / 1 enriched / 2 rich. */
  soil: number;
  /** 1 when mulched. */
  m: number;
  /** 1 when the row grows under a growing frame (Phase 2, additive). */
  f?: number;
}

export interface FarmBinInfo {
  tx: number;
  ty: number;
  /** Compostable worth accumulated toward the batch. */
  fill: number;
  /** Worth that arrived as graded goods (decides prime output). */
  graded: number;
  /** Epoch ms the working batch completes; 0 = not working. */
  readyAt: number;
}

export interface FarmTroughInfo {
  tx: number;
  ty: number;
  /** Feed measures in the manger. */
  feed: number;
}

/** THE WORKING YARD (Phase 4): one station's running batch. */
export interface FarmJobInfo {
  tx: number;
  ty: number;
  recipe: string;
  /** Units still queued (0 clears the mirror row). */
  qty: number;
  startedAt: number;
  /** The batch's minimum consumed grade, decided at load. */
  grade: number;
}

export interface FarmApiaryInfo {
  tx: number;
  ty: number;
  /** Epoch ms the hive last emptied (0 clears the row). */
  since: number;
}

export interface S2CFarm {
  t: 'farm';
  plots?: FarmPlotInfo[];
  bins?: FarmBinInfo[];
  /** THE ANIMALS OF THE YARD (Phase 3, additive): trough feed. */
  troughs?: FarmTroughInfo[];
  /** THE WORKING YARD (Phase 4, additive): jobs and hives. */
  jobs?: FarmJobInfo[];
  apiaries?: FarmApiaryInfo[];
  remove?: Array<{ tx: number; ty: number }>;
}

/**
 * THE LARDER BOARD (Phase 5): filled counts per hosting counter.
 * The ORDER itself derives client-side from (shop, world epoch) —
 * only the fill travels. Whole at login, deltas on every sale.
 */
export interface S2CLarder {
  t: 'larder';
  fills: Array<{ shop: string; epoch: number; filled: number }>;
}

/**
 * Load a work batch into a yard station. Inputs leave the pack at
 * this door (highest grades first); the server re-proves the tile,
 * the recipe, the level, and the cap.
 */
export interface C2SWorkStart {
  t: 'workstart';
  tx: number;
  ty: number;
  recipe: string;
  qty: number;
}

/**
 * THE ANIMALS OF THE YARD: load one pack slot's feed into a trough.
 * Slot-addressed; the trough tile, the feed worth, and the cap are
 * re-proved at the door.
 */
export interface C2STroughAdd {
  t: 'troughadd';
  tx: number;
  ty: number;
  slot: number;
}

/**
 * Name a just-released yard animal (the pet naming card, reused —
 * the same sanitize law guards the wire). Slot is the livestock
 * slot the release ceremony announced.
 */
export interface C2SStockName {
  t: 'stockname';
  slot: number;
  name: string;
}

/** The release ceremony: the client opens the naming card for it. */
export interface S2CStockCeremony {
  t: 'stockname';
  slot: number;
  species: string;
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
 * Name (or rename) a companion by stall slot. The server re-runs the
 * shared sanitizer whatever the client showed — the wire carries the
 * raw ask, the collar tag is always the server's judgment.
 */
export interface C2SPetName {
  t: 'petname';
  slot: number;
  name: string;
}

/**
 * A stable-door act (beastcraft v2 Phase 4, THE THREE STALLS): take a
 * stall's companion to heel, settle the heel companion into its
 * stall, or release one back to the wild. Only ever honored beside a
 * beast pen — the server re-checks the tile exactly as the vault
 * re-checks its chest, and rotation stays a household decision made
 * at the stalls, never a mid-field hotswap.
 */
export interface C2SStable {
  t: 'stable';
  op: 'heel' | 'stable' | 'release';
  slot: number;
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

/**
 * Seat a technique — THE SECOND HAND: Q (slot 0) and R (slot 2) are
 * both free technique seats. THE FREE HAND stands: any learned art,
 * whatever the equipped weapon (free respec, server validates the
 * unlock — rung by level, page by deed flag, secret art by mastery
 * or THE LOAN LAW's teaching weapon in hand). `slot` is the tray
 * index of the seat.
 */
export interface C2STechnique {
  t: 'technique';
  ability: string;
  slot: 0 | 2;
}

/** Answer or set down a Calling (toggleable skill passive). */
export interface C2SCalling {
  t: 'calling';
  calling: string;
  on: boolean;
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

/** Ask for the full party snapshot (members + pending invites). */
export interface C2SParty {
  t: 'party';
}

/**
 * Invite a character (by name) into your party. Partyless inviters
 * found a new party the moment their first invite is accepted.
 */
export interface C2SPartyInvite {
  t: 'partyinvite';
  name: string;
}

/** Accept a pending party invite from `name`. */
export interface C2SPartyAccept {
  t: 'partyaccept';
  name: string;
}

/** Decline a pending party invite from `name`. */
export interface C2SPartyDecline {
  t: 'partydecline';
  name: string;
}

/** Leave your current party. */
export interface C2SPartyLeave {
  t: 'partyleave';
}

/** Remove a member from the party (leader only). */
export interface C2SPartyKick {
  t: 'partykick';
  name: string;
}

/** Dissolve the whole party (leader only). */
export interface C2SPartyDisband {
  t: 'partydisband';
}

/**
 * Step into a party member's live dungeon run. Only valid while
 * standing at a riftgate portal — the gates are one network.
 */
export interface C2SPartyJoinRun {
  t: 'partyjoinrun';
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

/**
 * Walk away from an active quest. A first-timer's ledger entry is
 * erased outright; a repeatable that was completed before falls back
 * to its done state (any cooldown it carried stands).
 */
export interface C2SQuestAbandon {
  t: 'questabandon';
  quest: string;
}

export type C2SMessage =
  | C2SHello
  | C2SLogin
  | C2SRegister
  | C2SLogout
  | C2SInput
  | C2SChat
  | C2SPing
  | C2SInteract
  | C2SUseItem
  | C2SUnequip
  | C2SInvMove
  | C2SDropItem
  | C2SCraft
  | C2SCraftStop
  | C2SUnmake
  | C2SSunder
  | C2SBank
  | C2SShop
  | C2SBuild
  | C2SDemolish
  | C2SOwnBuilt
  | C2SPlant
  | C2SFertilize
  | C2SMulch
  | C2SPrune
  | C2SCompostAdd
  | C2STroughAdd
  | C2SStockName
  | C2SWorkStart
  | C2SInteractNpc
  | C2SPetName
  | C2SStable
  | C2SPickup
  | C2STechnique
  | C2SCalling
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
  | C2SParty
  | C2SPartyInvite
  | C2SPartyAccept
  | C2SPartyDecline
  | C2SPartyLeave
  | C2SPartyKick
  | C2SPartyDisband
  | C2SPartyJoinRun
  | C2SSignEdit
  | C2SWaypoint
  | C2SQuestAbandon;

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
   * Settled anchors as [x, y, safeR, haven, dread] tuples — the LIVE
   * hearth list (a trailing 0 dread is the ordinary case; an older
   * server sends quads and the client simply reads no dread). The geography is editable data now, so the client must not
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
  /** Settled-anchor tuples [x, y, safeR, haven, dread] — present when the plan itself changed. */
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
  /**
   * The viewer's live buy-price multiplier at this counter (factions
   * Phase 3) — the same pure function the server charges with, pushed
   * so the shelf's tags can never disagree with the coins taken.
   * Absent = 1 (unaffiliated keeper).
   */
  priceMult?: number;
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

/** A timed action (gathering / crafting) started or stopped for this player. */
export interface S2CAction {
  t: 'action';
  state: 'start' | 'stop';
  /** Duration in ticks (start only). */
  ticks?: number;
  /** Why it stopped: done / cancelled / failed reason. */
  reason?: string;
  /** Craft only: the recipe being worked (start only). */
  recipe?: string;
  /** Craft only: items finished so far in this batch. */
  made?: number;
  /** Craft only: batch size asked for (start only). */
  total?: number;
  /**
   * THE HELD NOTE only (start): the channeled art's id + slot, so the
   * client tints the bar and breathes the singing well. Additive.
   */
  ability?: string;
  slot?: number;
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
 * THE DRAWN BREATH: the own player's wind-up lifecycle. `start`
 * confirms the breath began (`ticks` = the authored length; the client
 * quickens its own bar by the same planted law), `fire` completes it,
 * `break` ends it early — cancelled, invalidated mid-breath, or a
 * working took the hands. Own-player only; watchers read the held
 * pose (and, from Phase 4, the charge dialect). Additive, no bump.
 */
export interface S2CCast {
  t: 'cast';
  state: 'start' | 'fire' | 'break';
  slot: number;
  ticks?: number;
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
    /**
     * THE KEEPER'S TONGUE (additive, protocol unchanged): a becalm
     * landing at (x,y) — `radius` > 0 is the spread, `ticks` the hold.
     */
    | 'becalm'
    /**
     * A keeper's word traveling (x,y)→(x2,y2): the whistle's arrival
     * line, the pointed fang, the thrown balm, the shared howl, the
     * cry to a fallen friend. `id` picks the painter's dialect.
     */
    | 'command'
    /**
     * The capstone ring of awe rolling out from (x,y) to `radius`;
     * `ticks` carries the awe's hold (the ghost pack runs at >= 300).
     */
    | 'howl'
    /** A lingering hazard zone living `ticks` at (x,y). */
    | 'field'
    /**
     * THE BREATH SPEAKS (THE DRAWN BREATH x FX v5): matter gathering
     * on a WINDING caster at (x,y) — re-emitted on an overlapping
     * window at the live position while the breath draws, so the
     * gather follows a running body. `radius` is the gather reach and
     * contracts as the breath completes (the contracting reach is the
     * ramp); `id` keys the art's matter dialect.
     */
    | 'charge'
    /**
     * THE BREATH SPEAKS: a held channel's sustained voice at (x,y),
     * re-emitted between pulse beats (the tame re-emit law) so long
     * notes never gutter. `id` keys the art's matter dialect.
     */
    | 'note'
    /** A locked door refusing at (x,y) — the leaf shudders in its frame. */
    | 'rattle'
    /**
     * A raid horn at (x,y) — THE HEARTH WATCH's fuse (Phase 4): the
     * covetous camp announces itself once, far-carrying, spatial.
     */
    | 'horn'
    /**
     * A destructible prop taking a hit at (x,y). `dir` is the impact
     * heading (away from the smasher — debris flies WITH the blow),
     * `id` the DestructibleKind so the client picks its break-up kit
     * without waiting on any tile patch. `radius` is the fraction of
     * durability REMAINING after the blow: 0 = the burst (a tile
     * patch to the floor follows), >0 = a crack — the prop shudders
     * and spits chips but stands.
     */
    | 'smash'
    /**
     * A player construction coming down at (x,y) — THE SALVAGE LAW's
     * ceremony. `id` is the demolished tile's numeric id as a string
     * (the client looks up its tones and mass for the shard burst);
     * broadcast BEFORE the tile patch, the smashProp precedent, so
     * the collapse reads over the piece that is about to vanish.
     */
    | 'demolish'
    /**
     * A raised shield eating a real bite of a blow at (x,y) — the rim
     * spark. `dir` is the heading the blow came FROM (sparks shear off
     * the face), `radius` scales with the bite. Throttled server-side.
     */
    | 'block'
    /**
     * THE DEEPER SIGIL: an enchanted working waking at (x,y). `id` is
     * the proc id, which the client keys its bespoke visual off exactly
     * as it does for ability ids (unknown ids fall back to the element
     * color). `text` is the working's NAME and floats once — a proc
     * announces itself by name and never by number, so it reads as an
     * event instead of adding noise to the damage stream. `x2/y2` carry
     * the segment for the workings that travel.
     */
    | 'proc'
    /**
     * THE VISIBLE WORKING (beastcraft arts): a tame channel's calm
     * drifting from the caster's hand at (x,y) to the beast at
     * (x2,y2) — pulsed along the channel so watchers see the asking;
     * `radius` 0 while it runs, >0 exactly once at the completion
     * burst (the bond closing).
     */
    | 'tame';
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
  /**
   * THE FOE'S BREATH (enemy arts, additive): the casting body's
   * entity id on a `charge` — the client anchors the overhead cast
   * pip to the interpolated body and reads `ticks` as the wind
   * remaining (re-emits refresh it; ticks 0 = the breath BROKE, the
   * pip gutters). Absent on player charges — their read is the
   * gather and their own bar.
   */
  eid?: number;
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

/**
 * The player's seated techniques (sent on join + change) — THE SECOND
 * HAND's pair, [Q seat, R seat], both free, any school — plus the
 * earned arts: THE UNWRITTEN PAGE's deed pages and THE SECRET
 * LEDGER's mastered secrets ride the same `art:<id>` flags, so
 * `earned` carries both. The codex shows a page or a secret's mastery
 * only once it is truly owned.
 */
export interface S2CTechniques {
  t: 'techniques';
  chosen: [string | null, string | null];
  earned?: string[];
  /**
   * THE LESSON LAW's meters: banked mirrored XP per unmastered secret
   * art (absent key = nothing banked). Cost derives client-side from
   * the shared masteryXp dial — the wire carries only the bank.
   * Additive on v24 (the field is optional and every peer is v24+).
   */
  lessons?: Record<string, number>;
}

/**
 * The player's answered Callings (sent on join + change). Focus budget
 * and costs are derived client-side from the shared law + content —
 * the wire carries only the choices.
 */
export interface S2CCallings {
  t: 'callings';
  answered: string[];
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
 * One stacking working's live meter. THE METER BELONGS TO THE FIGHTER:
 * a stacking working keeps ONE count however many pieces answer it, so
 * one row per proc id is the whole truth. The client resolves name,
 * school, and icon from the roster by id; the wire carries only what
 * the server alone knows.
 */
export interface ChargeInfo {
  /** Proc id (the working's own id, not the enchant's). */
  id: string;
  /** Moments banked toward the answer. */
  have: number;
  /** Moments the working asks for. */
  need: number;
}

/**
 * The own player's stacking-working meters (sent when a meter moves,
 * on gear change, and on join). A build-and-spend mechanic the wearer
 * cannot see is a spreadsheet entry; this is the read the worn light
 * deliberately does not carry (a proc lives in the event layer, so its
 * progress lives on the HUD, not the body).
 */
export interface S2CCharges {
  t: 'charges';
  charges: ChargeInfo[];
}

/**
 * THE PREDICTOR LEARNS ITS LEGS: the own player's saddle state and
 * steady speed multiplier, sent on join and whenever either changes
 * (mount, dismount, a buff or gear stride shifting the stack). The
 * client mirrors `mult` into its predictor so mounted prediction stops
 * drifting; frame-local factors (draw slow, cast freeze, chill, wade)
 * stay out of it — each side already derives those per frame.
 */
export interface S2CRide {
  t: 'ride';
  /** Active mount def id, or null afoot. */
  mount: string | null;
  /** Steady speed multiplier over PLAYER_SPEED (rideSpeedMult output). */
  mult: number;
  /** Mount def ids this character owns (the stable row's truth). */
  owned: string[];
}

/**
 * THE WIRE STAYS LEAN (beastcraft v2 Phase 1): the keeper's own
 * household, sent on join and whenever any pet fact changes (the
 * S2CRide signature-gate discipline). Watchers need none of this —
 * the companion entity itself rides the ordinary snapshot and meta
 * lanes. `state: 'trailing'` is the wire-only derivation of a heel
 * pet whose body slipped behind and waits to re-emerge.
 */
export interface PetInfo {
  slot: number;
  /** NpcDef id — the species body every watcher already knows. */
  species: string;
  name: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  /**
   * 'downed' (Phase 3): the body lies where it fell, breathing,
   * waiting on the tend or the limp home. Additive to v27 — a client
   * that never reads it merely shows nothing (recorded on purpose).
   */
  state: 'heel' | 'trailing' | 'stabled' | 'resting' | 'downed';
  /** Seconds of rest left on a 'resting' friend (additive, v27). */
  restSec?: number;
  /**
   * THE QUIET HEEL: seconds until the bond moment reopens for the
   * walking slot (0 = open now). The client counts down locally so
   * the prompt and chip glint surface exactly when kindness would
   * pay — the plain pat never owns the interact prompt. Additive to
   * v27 like restSec; sent for heel rows only.
   */
  bondSec?: number;
}

export interface S2CPet {
  t: 'pet';
  pets: PetInfo[];
  /** Slot just tamed — the client raises the naming card exactly once. */
  ceremony?: number;
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
  /** Party members' live runs this gate can carry you into. */
  partyRuns?: PartyRunWire[];
}

/** One live run a party member holds open. */
export interface PartyRunWire {
  /** The party member whose run stands open. */
  name: string;
  dungeon: string;
  tier: string;
  power: number;
}

/**
 * A voice clip riding a dialogue beat (THE SPOKEN LINE, voiceover-plan
 * Phase 3). THE WIRE STAYS BLIND: a URL and a play length, never a
 * clip id or node id — the server's resolver chose it, the client
 * just plays it. durMs paces the typewriter to land with the audio.
 */
export interface VoiceWire {
  url: string;
  durMs: number;
  /** A full spoken line ducks the music; a quip ducks nothing. */
  kind: 'line' | 'quip';
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
  /**
   * Clip URLs reachable from this tree's start — the client warms its
   * buffer cache the moment the frame opens, so no line waits on a
   * fetch. Server-walked and capped by the prefetchCap dial.
   */
  prefetch?: string[];
  /** The live duck dials — content-tuned, delivered with the frame. */
  voiceDials?: { duckLine: number; duckAmbience: number; duckReleaseMs: number };
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
  /**
   * A quest offered on this beat (the quest_offer hook) — the cinema
   * stages the ask beside the line, gifts-style, so the player reads
   * what they'd be agreeing to before the choice plates appear.
   */
  quest?: QuestOfferWire;
  /**
   * Choices with quest weight, by index into `choices`: 'accept'
   * swears a quest the moment it's picked, 'turnin' hands one in.
   * Server-resolved against the live ledger (a plate never wears a
   * badge it can't honor), so the cinema can dress consequence apart
   * from small talk. Additive + cosmetic — a client that drops it
   * reads the same plates unbadged.
   */
  questChoices?: Array<{ idx: number; kind: 'accept' | 'turnin' }>;
  /**
   * Choices that open a shop, by index into `choices`: the press arms
   * the trader's shelf (directly or through beats the player only
   * pages past), so the plate wears the coin chip. Same contract as
   * questChoices — additive + cosmetic, unbadged plates read the same.
   */
  shopChoices?: number[];
  /** The beat's spoken audio, when the node has a voiced line. */
  voice?: VoiceWire;
}

/** The conversation is over (finished, excused, or interrupted). */
export interface S2CDialogueClose {
  t: 'dlgclose';
}

/**
 * A small utterance from a place in the world — a bark's spoken
 * accompaniment (voiceover-plan Phase 4). Purely cosmetic: a client
 * that drops it reads the same bark in silence, which is why this
 * family rides v21 without a bump (the party/quest bumps guarded
 * MATERIAL state a deaf client would corrupt; a lost grunt is lost
 * air). Spatial: the client pans/rolls off from (x, y).
 */
export interface S2CVoiceQuip {
  t: 'vq';
  x: number;
  y: number;
  url: string;
  durMs: number;
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

/** One member on the party snapshot (the receiver is included). */
export interface PartyMemberWire {
  name: string;
  online: boolean;
  /** True on the party leader's row. */
  leader?: boolean;
  /** Where they stand right now — only present while online. */
  zone?: string;
}

/**
 * The full party snapshot, sent on request. An empty members list =
 * not in a party. The same refetch law as social: clients never patch
 * membership from events, they ask again.
 */
export interface S2CParty {
  t: 'party';
  members: PartyMemberWire[];
  /** Names whose parties have invited you. */
  invites: string[];
  /** Names you have invited who haven't answered. */
  outgoing: string[];
}

/** A thin push: something party-shaped happened involving `name`. */
export interface S2CPartyEvent {
  t: 'partyevent';
  kind:
    | 'invite'
    | 'declined'
    | 'joined'
    | 'left'
    | 'kicked'
    | 'disbanded'
    | 'online'
    | 'offline'
    | 'delve';
  name: string;
  /** For 'delve': the dungeon's name. */
  detail?: string;
}

/**
 * Live positions of your online party members — a slow ticker so the
 * chart, the glass, and the wayfinder can point at kin beyond the
 * interest window. Never gameplay truth, purely navigation.
 */
export interface S2CPartyPos {
  t: 'partypos';
  members: Array<{ name: string; x: number; y: number }>;
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
  /**
   * The site's live boldness rung (0 or absent = base camp). Merged
   * from the frontier ledger at send time — never stored per
   * character; the chart draws stage pips from it.
   */
  stage?: number;
  /**
   * The site's archetype id ('poi:' discoveries only) — the herald
   * looks the def up in content for its story line. Zone discoveries
   * carry none: their ledger id IS the zone key.
   */
  defId?: string;
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

/**
 * A discovered site climbed a boldness rung — holders of the marker
 * repaint its stage pips. No ceremony rides this (the rumor line
 * travels as ordinary system chat); the DISCOVERED splash stays
 * reserved for S2CDiscovery.
 */
export interface S2CDiscoveryStage {
  t: 'discoverystage';
  id: string;
  stage: number;
}

/**
 * The server plants (or lifts) the character's ONE waypoint — a
 * guard's bounty mark landing on the chart (living-frontier Phase 3).
 * Same shape as C2SWaypoint; both coordinates absent = clear. The
 * client adopts it exactly as if the player had planted it: pin, pill,
 * and persistence all follow the one waypoint slot.
 */
export interface S2CWaypoint {
  t: 'waypoint';
  x?: number;
  y?: number;
}

/**
 * A generalized whereabouts for the chart: a soft circle, never a pin.
 * The server derives it from its spatial registries (actor placements,
 * spawn grounds, zone extents), rounds the center to a coarse grid,
 * and keeps the radius generous — the ring promises a neighborhood,
 * not a spot. Surface band only; absent when the world can't say.
 */
export interface QuestHintWire {
  x: number;
  y: number;
  /** Radius in tiles. */
  r: number;
}

/** One objective row: the id (in its namespace) keys the client icon. */
export interface QuestObjectiveWire {
  kind: 'kill' | 'collect' | 'discover' | 'talk';
  item?: string;
  npc?: string;
  actor?: string;
  place?: string;
  label: string;
  have: number;
  need: number;
  /** Where this ask can be answered, when the world knows. Additive. */
  hint?: QuestHintWire;
}

/**
 * One ACTIVE quest, shaped for the journal screen and the tracker.
 * `status: 'ready'` = every ask answered, turn in to `turnIn` — the
 * client flips that actor's overhead mark on it. Names ride the wire
 * (the DB is the truth; the bundle may lag a tool edit), ids ride for
 * icons.
 */
export interface QuestWire {
  id: string;
  name: string;
  status: 'active' | 'ready';
  giver: string;
  giverName: string;
  turnIn: string;
  turnInName: string;
  /** 0-based stage index and the total, for "Part n of m". */
  stage: number;
  stages: number;
  /** The current stage's journal entry — the world's written voice. */
  journal: string;
  objectives: QuestObjectiveWire[];
  repeatable?: boolean;
  /** Where the finished work is handed in. Additive + cosmetic. */
  turnInHint?: QuestHintWire;
  /** What the work pays — the journal shows the terms. Additive. */
  rewards?: QuestRewardsWire;
}

/** One completed quest on the ledger's done shelf. */
export interface QuestDoneWire {
  id: string;
  name: string;
  completions: number;
  repeatable?: boolean;
  /** Repeatables: re-offerable once this passes (ms epoch). */
  cooldownUntil?: number;
}

/** An offerable quest — the "!" over its giver's head. */
export interface QuestAvailWire {
  id: string;
  name: string;
  giver: string;
}

/** The quest chip staged on a dialogue beat (the quest_offer hook). */
export interface QuestOfferWire {
  id: string;
  name: string;
  rewards?: QuestRewardsWire;
}

/** Reward summary for ceremonies and offer chips — ids + counts only. */
export interface QuestRewardsWire {
  xp?: Array<{ skill: string; amount: number }>;
  items?: Array<{ item: string; qty: number }>;
  coins?: number;
}

/** The full quest ledger, pushed once at bind. */
export interface S2CQuests {
  t: 'quests';
  active: QuestWire[];
  done: QuestDoneWire[];
  available: QuestAvailWire[];
}

/**
 * A quiet ledger patch — counters tick, stages turn, availability
 * shifts. NO ceremony rides this; the accepted/completed splash stays
 * reserved for S2CQuestEvent. Present fields apply: `quest` upserts an
 * active entry, `remove` drops one, `done` upserts the done shelf,
 * `available` replaces the offerable list whole.
 */
export interface S2CQuestUpd {
  t: 'questupd';
  quest?: QuestWire;
  remove?: string;
  done?: QuestDoneWire;
  available?: QuestAvailWire[];
}

/** A LIVE quest ceremony — the ONLY trigger for banners and fanfare. */
export interface S2CQuestEvent {
  t: 'questevent';
  kind: 'accepted' | 'completed';
  id: string;
  name: string;
  rewards?: QuestRewardsWire;
}

/**
 * Where the reader last fell — the walk-back beacon for the spilled
 * pack. Sent at the death moment and again at login while the spill
 * still holds the ground; `remainMs` is a duration, never a wall
 * clock (client clocks drift). An absent `mark` clears the skull:
 * the reader arrived, or the ground let the spill go.
 */
export interface S2CDeathMark {
  t: 'deathmark';
  mark?: { x: number; y: number; remainMs: number };
}

/** One faction's standing as the owner reads it (bands server-derived). */
export interface RepStandingWire {
  faction: string;
  name: string;
  value: number;
  band: string;
}

/**
 * The full reputation ledger, pushed once at bind (docs/factions-plan.md).
 * `members`/`prefixes` carry the LIVE membership tables so per-viewer
 * resolution (nameplate tints, Phase 2 marks) follows Studio edits,
 * never the client's shipped seed — the questMarkFor precedent: nothing
 * personal ever rides the shared EntityMeta.
 */
export interface S2CRep {
  t: 'rep';
  standings: RepStandingWire[];
  /** actor slug -> faction id. */
  members: Record<string, string>;
  /** bestiary id prefix -> faction id. */
  prefixes: Record<string, string>;
  /** Actor slugs that police their faction (nameplate warnings). */
  enforcers: string[];
  /** The band at which a hostile faction holds its fire. */
  peaceBand: string;
  /** Live band price multipliers — the Standing screen's legend. */
  prices: { champion: number; trusted: number; known: number; neutral: number; suspect: number };
}

/** A quiet standing patch — deltas tick. NO ceremony rides this. */
export interface S2CRepUpd {
  t: 'repupd';
  standings: RepStandingWire[];
}

/** A band crossing — the ONLY trigger for standing ceremonies. */
export interface S2CRepEvent {
  t: 'repevent';
  faction: string;
  name: string;
  band: string;
  rose: boolean;
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
  | S2CCast
  | S2CFx
  | S2COwnBuilt
  | S2CTime
  | S2CTechniques
  | S2CCallings
  | S2CBuffs
  | S2CFarm
  | S2CStockCeremony
  | S2CLarder
  | S2CCharges
  | S2CRide
  | S2CPet
  | S2CRiftgate
  | S2CDungeonEnter
  | S2CSigns
  | S2CDialogueOpen
  | S2CDialogueNode
  | S2CDialogueClose
  | S2CVoiceQuip
  | S2CHavens
  | S2CSocial
  | S2CFriendSearch
  | S2CFriendEvent
  | S2CParty
  | S2CPartyEvent
  | S2CPartyPos
  | S2CExplored
  | S2CDiscoveries
  | S2CDiscovery
  | S2CDiscoveryFade
  | S2CDiscoveryStage
  | S2CWaypoint
  | S2CQuests
  | S2CQuestUpd
  | S2CQuestEvent
  | S2CRep
  | S2CRepUpd
  | S2CRepEvent
  | S2CDeathMark;

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
      if (msg.invite !== undefined && (typeof msg.invite !== 'string' || msg.invite.length > 64)) {
        return null;
      }
      return { t: 'register', user: msg.user, pass: msg.pass, name: msg.name, invite: msg.invite };
    }
    case 'logout':
      return { t: 'logout' };
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
      // Optional aimed ground point (THE HELD SIGIL) — carried only
      // whole; sanitizeInputFrame and the cast door re-clamp it.
      if (isFiniteNum(f.tx) && isFiniteNum(f.ty)) {
        out.frame.tx = f.tx;
        out.frame.ty = f.ty;
      }
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
    case 'questabandon': {
      if (typeof msg.quest !== 'string' || msg.quest.length === 0 || msg.quest.length > 64) {
        return null;
      }
      return { t: 'questabandon', quest: msg.quest };
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
      return { t: 'invmove', from: msg.from, to: msg.to, ...(msg.merge === true ? { merge: true } : {}) };
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
    case 'craftstop': {
      return { t: 'craftstop' };
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
      const orient =
        msg.orient === 'NE' || msg.orient === 'NW' || msg.orient === 'SE' || msg.orient === 'SW'
          ? msg.orient
          : undefined;
      // THE DYE LAW's dial rides the same whitelist: only a real
      // roster index passes the door (the game server re-checks the
      // piece is dyeable — this gate only vouches for the shape).
      const dye =
        typeof msg.dye === 'number' &&
        Number.isInteger(msg.dye) &&
        msg.dye >= 0 &&
        msg.dye < DYE_COUNT
          ? msg.dye
          : undefined;
      return { t: 'build', buildable: msg.buildable, tx: msg.tx, ty: msg.ty, orient, dye };
    }
    case 'demolish': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      return { t: 'demolish', tx: msg.tx, ty: msg.ty };
    }
    case 'ownbuilt':
      return { t: 'ownbuilt' };
    case 'plant': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      if (typeof msg.seed !== 'string' || msg.seed.length > 64) return null;
      return { t: 'plant', tx: msg.tx, ty: msg.ty, seed: msg.seed };
    }
    case 'fertilize': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      return { t: 'fertilize', tx: msg.tx, ty: msg.ty };
    }
    case 'mulch': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      return { t: 'mulch', tx: msg.tx, ty: msg.ty };
    }
    case 'prune': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      return { t: 'prune', tx: msg.tx, ty: msg.ty };
    }
    case 'compostadd': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot) || msg.slot < 0 || msg.slot > 63) {
        return null;
      }
      return { t: 'compostadd', tx: msg.tx, ty: msg.ty, slot: msg.slot };
    }
    case 'troughadd': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot) || msg.slot < 0 || msg.slot > 63) {
        return null;
      }
      return { t: 'troughadd', tx: msg.tx, ty: msg.ty, slot: msg.slot };
    }
    case 'stockname': {
      if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot) || msg.slot < 0 || msg.slot > 15) {
        return null;
      }
      if (typeof msg.name !== 'string' || msg.name.length > 24) return null;
      return { t: 'stockname', slot: msg.slot, name: msg.name };
    }
    case 'workstart': {
      if (!isFiniteNum(msg.tx) || !isFiniteNum(msg.ty)) return null;
      if (!Number.isInteger(msg.tx) || !Number.isInteger(msg.ty)) return null;
      if (typeof msg.recipe !== 'string' || msg.recipe.length > 64) return null;
      if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty) || msg.qty < 1 || msg.qty > 50) {
        return null;
      }
      return { t: 'workstart', tx: msg.tx, ty: msg.ty, recipe: msg.recipe, qty: msg.qty };
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
      if (typeof msg.ability !== 'string' || msg.ability.length > 64) return null;
      if (msg.slot !== 0 && msg.slot !== 2) return null;
      return { t: 'technique', ability: msg.ability, slot: msg.slot };
    }
    case 'calling': {
      if (typeof msg.calling !== 'string' || msg.calling.length > 64) return null;
      if (typeof msg.on !== 'boolean') return null;
      return { t: 'calling', calling: msg.calling, on: msg.on };
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
    case 'petname': {
      // Slot bounds are THREE STALLS; the name is only length-gated
      // here — the shared sanitizer renders the real verdict server-
      // side, so a junk ask costs a refusal line, never a strike.
      if (msg.slot !== 0 && msg.slot !== 1 && msg.slot !== 2) return null;
      if (typeof msg.name !== 'string' || msg.name.length > 40) return null;
      return { t: 'petname', slot: msg.slot, name: msg.name };
    }
    case 'stable': {
      if (msg.op !== 'heel' && msg.op !== 'stable' && msg.op !== 'release') return null;
      if (msg.slot !== 0 && msg.slot !== 1 && msg.slot !== 2) return null;
      return { t: 'stable', op: msg.op, slot: msg.slot };
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
    case 'party':
      return { t: 'party' };
    case 'partyinvite': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'partyinvite', name: msg.name };
    }
    case 'partyaccept': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'partyaccept', name: msg.name };
    }
    case 'partydecline': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'partydecline', name: msg.name };
    }
    case 'partyleave':
      return { t: 'partyleave' };
    case 'partykick': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'partykick', name: msg.name };
    }
    case 'partydisband':
      return { t: 'partydisband' };
    case 'partyjoinrun': {
      if (typeof msg.name !== 'string' || msg.name.length > 32) return null;
      return { t: 'partyjoinrun', name: msg.name };
    }
    default:
      return null;
  }
}
