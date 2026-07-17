import type { EntityId, EntityMeta, EquipSlot } from '../entities.js';
import type { InputFrame } from '../sim/input.js';
import type { SkillId, SkillXp } from '../skills.js';

/** One inventory slot on the wire; null = empty. */
export type InvSlot = { item: string; qty: number } | null;

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
}

export interface C2SShop {
  t: 'shop';
  op: 'buy' | 'sell';
  item: string;
  qty: number;
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
  | C2SCraft
  | C2SBank
  | C2SShop
  | C2SBuild
  | C2SDemolish;

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
  equipment: Partial<Record<EquipSlot, string>>;
}

/** Something took damage (for floaties/flashes). */
export interface S2CHit {
  t: 'hit';
  eid: EntityId;
  dmg: number;
  /** Critical hit — bigger everything client-side. */
  crit?: boolean;
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
  | S2CXp
  | S2CAction
  | S2CEquipment
  | S2CHit
  | S2CDeath
  | S2CUpdate
  | S2CBank;

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
      return {
        t: 'input',
        frame: { seq: f.seq, mx: f.mx, my: f.my, aim: f.aim, buttons: f.buttons },
      };
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
    case 'use': {
      if (!isFiniteNum(msg.slot) || !Number.isInteger(msg.slot)) return null;
      if (msg.slot < 0 || msg.slot >= 64) return null;
      return { t: 'use', slot: msg.slot };
    }
    case 'unequip': {
      if (typeof msg.slot !== 'string') return null;
      const slot = msg.slot as EquipSlot;
      if (!['head', 'body', 'legs', 'weapon', 'offhand', 'tool'].includes(slot)) return null;
      return { t: 'unequip', slot };
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
      return { t: 'bank', op: msg.op, item: msg.item, qty: msg.qty };
    }
    case 'shop': {
      if (msg.op !== 'buy' && msg.op !== 'sell') return null;
      if (typeof msg.item !== 'string' || msg.item.length > 64) return null;
      if (!isFiniteNum(msg.qty) || !Number.isInteger(msg.qty) || msg.qty < 1 || msg.qty > 1000) {
        return null;
      }
      return { t: 'shop', op: msg.op, item: msg.item, qty: msg.qty };
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
    default:
      return null;
  }
}
